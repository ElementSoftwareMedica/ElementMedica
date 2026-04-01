/**
 * PublicBrandSettingsPage
 *
 * Pagina di configurazione del tenant per i widget del frontend pubblico.
 * Permette agli amministratori di configurare quale tenant fornisce i dati
 * per i widget pubblici (medici, disponibilità, corsi) di ciascun brand.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, Link2, Save, RefreshCw, Info, Building2 } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { CRUDPrimaryButton } from '@/components/ui';

interface Tenant {
    id: string;
    name: string;
    slug: string;
}

interface BrandSettingsData {
    mapping: Record<string, string>;
    availableBrands: string[];
    availableTenants: Tenant[];
}

const BRAND_LABELS: Record<string, { label: string; description: string; color: string }> = {
    'element-medica': {
        label: 'Element Medica',
        description: 'Medici, disponibilità, prenotazioni online, form pubblici (clinica medica)',
        color: 'teal',
    },
    'element-sicurezza': {
        label: 'Element Sicurezza',
        description: 'Corsi di formazione, calendari, iscrizioni, form pubblici',
        color: 'blue',
    },
};

const PublicBrandSettingsPage: React.FC = () => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [mapping, setMapping] = useState<Record<string, string>>({});

    const { data, isLoading, error } = useQuery<{ success: boolean; data: BrandSettingsData }>({
        queryKey: ['management-public-brand-settings'],
        queryFn: async () => {
            const response = await api.get('/api/v1/management/public-brand-settings');
            return response.data;
        },
        retry: false,
    });

    // Inizializza il form quando i dati arrivano
    useEffect(() => {
        if (data?.data?.mapping) {
            setMapping(data.data.mapping);
        }
    }, [data?.data?.mapping]);

    const saveMutation = useMutation({
        mutationFn: async (newMapping: Record<string, string>) => {
            const response = await api.put('/api/v1/management/public-brand-settings', {
                mapping: newMapping,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['management-public-brand-settings'] });
            showToast({
                message: 'Configurazione salvata. Widget, form pubblici e analytics ora usano il tenant selezionato.',
                type: 'success',
            });
        },
        onError: () => {
            showToast({
                message: 'Errore nel salvataggio della configurazione.',
                type: 'error',
            });
        },
    });

    const handleTenantChange = (brand: string, tenantId: string) => {
        setMapping(prev => ({
            ...prev,
            [brand]: tenantId,
        }));
    };

    const handleSave = () => {
        // Rimuovi i valori vuoti prima di salvare
        const cleanMapping = Object.fromEntries(
            Object.entries(mapping).filter(([, v]) => v !== '')
        );
        saveMutation.mutate(cleanMapping);
    };

    const availableTenants = data?.data?.availableTenants || [];
    const availableBrands = data?.data?.availableBrands || Object.keys(BRAND_LABELS);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-violet-600 mr-2" />
                <span className="text-gray-500">Caricamento configurazione...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
                <p className="font-medium">Errore nel caricamento delle impostazioni.</p>
                <p className="text-sm mt-1">
                    Assicurati di avere i permessi <code>settings:read</code>.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Globe className="h-5 w-5 text-violet-600" />
                        Configurazione Widget Pubblici
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Associa ogni brand del frontend pubblico al tenant che fornisce i dati
                        (medici, corsi, form pubblici, analytics, disponibilità).
                    </p>
                </div>
                <CRUDPrimaryButton
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="flex items-center gap-2"
                >
                    {saveMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    Salva configurazione
                </CRUDPrimaryButton>
            </div>

            {/* Info banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                    <p className="font-medium">Come funziona</p>
                    <p className="mt-1">
                        Il frontend pubblico usa il brand (es. <code className="bg-blue-100 px-1 rounded">element-medica</code>)
                        per determinare quale tenant fornisce i dati dei widget, dei <strong>form pubblici</strong>
                        e dell'analytics. Se non è configurato,
                        il sistema cerca un tenant con lo stesso slug del brand.
                    </p>
                </div>
            </div>

            {/* Brand cards */}
            <div className="grid gap-4">
                {availableBrands.map(brand => {
                    const brandInfo = BRAND_LABELS[brand];
                    const selectedTenantId = mapping[brand] || '';
                    const selectedTenant = availableTenants.find(t => t.id === selectedTenantId);

                    return (
                        <div
                            key={brand}
                            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
                        >
                            <div className="flex items-start gap-4">
                                {/* Brand icon */}
                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${brandInfo?.color === 'teal'
                                    ? 'bg-teal-100'
                                    : 'bg-blue-100'
                                    }`}>
                                    <Link2 className={`h-5 w-5 ${brandInfo?.color === 'teal' ? 'text-teal-600' : 'text-blue-600'
                                        }`} />
                                </div>

                                {/* Brand info + selector */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div>
                                            <h3 className="font-medium text-gray-900">
                                                {brandInfo?.label || brand}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {brandInfo?.description || 'Widget pubblici per questo brand'}
                                            </p>
                                            <code className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                                                X-Frontend-Id: {brand}
                                            </code>
                                        </div>
                                    </div>

                                    {/* Tenant selector */}
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <Building2 className="h-3.5 w-3.5 inline mr-1 text-gray-500" />
                                            Tenant per widget, form pubblici e analytics
                                        </label>
                                        <select
                                            value={selectedTenantId}
                                            onChange={e => handleTenantChange(brand, e.target.value)}
                                            className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
                                 bg-white"
                                        >
                                            <option value="">
                                                — Usa fallback (tenant con slug = brand) —
                                            </option>
                                            {availableTenants.map(tenant => (
                                                <option key={tenant.id} value={tenant.id}>
                                                    {tenant.name} ({tenant.slug})
                                                </option>
                                            ))}
                                        </select>

                                        {/* Current selection info */}
                                        {selectedTenant && (
                                            <p className="mt-1.5 text-xs text-gray-500">
                                                <span className="font-medium text-green-600">Configurato:</span>{' '}
                                                {selectedTenant.name}
                                                <span className="text-gray-400"> · slug: {selectedTenant.slug}</span>
                                            </p>
                                        )}
                                        {!selectedTenantId && (
                                            <p className="mt-1.5 text-xs text-amber-600">
                                                Usando fallback: cerca tenant con slug <code>{brand}</code>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* No tenants warning */}
            {availableTenants.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm">
                    Nessun tenant disponibile trovato. Contatta l'amministratore.
                </div>
            )}
        </div>
    );
};

export default PublicBrandSettingsPage;
