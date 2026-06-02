/**
 * TenantAccessManager Component
 * 
 * Gestisce l'accesso multi-tenant per gli utenti
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Shield, Check, X, Star, Plus, Trash2, Edit2, Search, Filter } from 'lucide-react';
import { managementApi } from '../api';
import type { Tenant, Feature, TenantAccessLevel, TenantSettings } from '../types';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import useTenantAccess from '../../../hooks/useTenantAccess';
import TenantEditModal from './TenantEditModal';

interface TenantAccessManagerProps {
    personId?: string; // Se null, mostra i tenant dell'utente corrente
    onTenantSelect?: (tenant: Tenant) => void;
}

const ACCESS_LEVELS: { value: TenantAccessLevel; label: string; description: string; color: string }[] = [
    { value: 'READ', label: 'Lettura', description: 'Può solo visualizzare i dati', color: 'bg-gray-100 text-gray-800' },
    { value: 'WRITE', label: 'Scrittura', description: 'Può visualizzare e modificare i dati', color: 'bg-blue-100 text-blue-800' },
    { value: 'ADMIN', label: 'Amministratore', description: 'Può gestire il tenant', color: 'bg-purple-100 text-purple-800' },
    { value: 'FULL', label: 'Completo', description: 'Accesso totale come proprietario', color: 'bg-green-100 text-green-800' },
];

const TenantAccessManager: React.FC<TenantAccessManagerProps> = ({ personId, onTenantSelect }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { confirm: confirmDialog } = useConfirmDialog();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFeature, setFilterFeature] = useState<string>('');

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);
    const [isSavingTenant, setIsSavingTenant] = useState(false);
    const { showToast } = useToast();
    const { refresh: refreshTenantAccess } = useTenantAccess();

    const isViewingOwnTenants = !personId || personId === user?.id;

    useEffect(() => {
        loadData();
    }, [personId]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Carica tenant e features in parallelo
            // Gestisce errori separatamente per debugging
            let tenantsData: Tenant[] = [];
            let featuresData: Feature[] = [];

            try {
                const tenantsRes = personId
                    ? await managementApi.getPersonTenants(personId)
                    : await managementApi.getMyTenants();
                tenantsData = tenantsRes.data || [];
            } catch (tenantErr: unknown) {
                // Se non autenticato, non mostrare errore ma lista vuota
                if ((tenantErr as { response?: { status?: number } }).response?.status === 401) {
                    setError('Sessione scaduta. Effettua nuovamente il login.');
                    return;
                }
            }

            try {
                const featuresRes = await managementApi.getFeatures();
                featuresData = featuresRes.data || [];
            } catch (featErr: unknown) {
                // Features sono opzionali, ignora errore
            }

            setTenants(tenantsData);
            setFeatures(featuresData);
        } catch (err: unknown) {
            const message = 'Errore nel caricamento dei dati';
            // Evita errori criptici
            if (message.includes('toUpperCase')) {
                setError('Errore di comunicazione con il server. Ricarica la pagina.');
            } else {
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSetPrimary = async (tenantId: string) => {
        if (!personId) return;

        try {
            await managementApi.setPrimaryTenant(personId, tenantId);
            await loadData();
        } catch (err: unknown) {
            setError('Errore nell\'impostare il tenant primario');
        }
    };

    const handleRevoke = async (tenantId: string) => {
        if (!personId) return;

        if (!(await confirmDialog({ title: 'Revoca accesso', message: 'Sei sicuro di voler revocare l\'accesso a questo tenant?', variant: 'danger', confirmLabel: 'Revoca' }))) return;

        try {
            await managementApi.revokeTenantAccess(personId, tenantId);
            await loadData();
        } catch (err: unknown) {
            setError('Errore nella revoca dell\'accesso');
        }
    };

    // Handler per salvare modifiche tenant
    const handleSaveTenant = async (tenantId: string, data: { name: string; settings: TenantSettings }) => {
        setIsSavingTenant(true);
        try {
            await managementApi.updateTenant(tenantId, data);
            await refreshTenantAccess();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('tenant-access:changed'));
            }
            showToast({ message: 'Tenant aggiornato con successo', type: 'success' });
            setTenantToEdit(null);
            await loadData(); // Ricarica dati per vedere le modifiche
        } catch (err: unknown) {
            showToast({ message: 'Errore nell\'aggiornamento del tenant', type: 'error' });
            throw err; // Rethrow so the modal knows the save failed
        } finally {
            setIsSavingTenant(false);
        }
    };

    // Filtra tenant
    const filteredTenants = tenants.filter(tenant => {
        const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFeature = !filterFeature || tenant.enabledFeatures?.includes(filterFeature);
        return matchesSearch && matchesFeature;
    });

    // Get access level info
    const getAccessLevelInfo = (level?: TenantAccessLevel) => {
        return ACCESS_LEVELS.find(l => l.value === level) || ACCESS_LEVELS[0];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Caricamento tenant...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 flex items-center">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mr-3">
                            <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        {isViewingOwnTenants ? 'I Miei Tenant' : 'Tenant Accessibili'}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-13">
                        {tenants.length} tenant{tenants.length !== 1 ? '' : ''} disponibil{tenants.length !== 1 ? 'i' : 'e'}
                        {tenants.filter(t => t.isActive).length !== tenants.length && (
                            <span className="ml-2 text-amber-600">
                                ({tenants.filter(t => t.isActive).length} attivi)
                            </span>
                        )}
                    </p>
                </div>

                {/* Actions */}
                {!isViewingOwnTenants && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi Tenant
                    </button>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cerca tenant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                    />
                </div>

                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                        value={filterFeature}
                        onChange={(e) => setFilterFeature(e.target.value)}
                        className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                    >
                        <option value="">Tutte le features</option>
                        {features.map(feature => (
                            <option key={feature.id} value={feature.id}>{feature.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tenant Grid */}
            {filteredTenants.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-50">Nessun tenant trovato</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {searchTerm || filterFeature
                            ? 'Prova a modificare i filtri di ricerca'
                            : 'Non hai accesso a nessun tenant'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredTenants.map(tenant => {
                        const accessInfo = getAccessLevelInfo(tenant.accessLevel);

                        // Handler per click: usa onTenantSelect se passato, altrimenti naviga alla pagina dettaglio
                        const handleTenantClick = () => {
                            if (onTenantSelect) {
                                onTenantSelect(tenant);
                            } else {
                                navigate(`/management/my-tenants/${tenant.id}`);
                            }
                        };

                        return (
                            <div
                                key={tenant.id}
                                className={`relative bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-200 hover:shadow-lg cursor-pointer group overflow-hidden ${tenant.isPrimary
                                    ? 'border-yellow-400 ring-2 ring-yellow-100 dark:ring-yellow-900/30 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                                    }`}
                                onClick={handleTenantClick}
                            >
                                {/* Primary Badge */}
                                {tenant.isPrimary && (
                                    <div className="absolute -top-0.5 -right-0.5 z-10">
                                        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-3 py-1 rounded-bl-xl rounded-tr-xl text-xs font-semibold flex items-center shadow-sm">
                                            <Star className="h-3 w-3 mr-1 fill-current" />
                                            Primario
                                        </div>
                                    </div>
                                )}

                                {/* Admin Badge */}
                                {tenant.isAdminAccess && (
                                    <div className="absolute top-3 left-3 z-10">
                                        <div className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-xs font-medium flex items-center">
                                            <Shield className="h-3 w-3 mr-1" />
                                            Admin
                                        </div>
                                    </div>
                                )}

                                <div className="p-5">
                                    {/* Tenant Info */}
                                    <div className="flex items-start justify-between mb-4 mt-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-50 truncate text-base">{tenant.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{tenant.slug}</p>
                                        </div>
                                        <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${accessInfo.color}`}>
                                            {accessInfo.label}
                                        </span>
                                    </div>

                                    {/* Features */}
                                    {tenant.enabledFeatures && tenant.enabledFeatures.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium uppercase tracking-wide">Features</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {tenant.enabledFeatures.slice(0, 4).map(feature => (
                                                    <span key={feature} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md text-xs font-medium capitalize">
                                                        {feature}
                                                    </span>
                                                ))}
                                                {tenant.enabledFeatures.length > 4 && (
                                                    <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-xs font-medium">
                                                        +{tenant.enabledFeatures.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Status Row */}
                                    <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-100 dark:border-gray-700">
                                        <span className={`flex items-center font-medium ${tenant.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {tenant.isActive ? <Check className="h-3.5 w-3.5 mr-1" /> : <X className="h-3.5 w-3.5 mr-1" />}
                                            {tenant.isActive ? 'Attivo' : 'Inattivo'}
                                        </span>
                                        <span className="text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded capitalize">{tenant.billingPlan}</span>
                                    </div>

                                    {/* Actions - edit shown for own tenants too; revoke/primary only for admin managing other users */}
                                    {(isViewingOwnTenants || !tenant.isAdminAccess) && (
                                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setTenantToEdit(tenant); }}
                                                className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                                            >
                                                <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                                                Modifica
                                            </button>
                                            {!isViewingOwnTenants && !tenant.isPrimary && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleSetPrimary(tenant.id); }}
                                                    className="flex items-center justify-center px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Imposta come primario"
                                                >
                                                    <Star className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            {!isViewingOwnTenants && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRevoke(tenant.id); }}
                                                    className="flex items-center justify-center px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Revoca accesso"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tenant Edit Modal - Per modificare configurazione tenant (solo admin) */}
            {tenantToEdit && (
                <TenantEditModal
                    tenant={tenantToEdit}
                    isOpen={!!tenantToEdit}
                    onClose={() => setTenantToEdit(null)}
                    onSave={handleSaveTenant}
                    isSaving={isSavingTenant}
                    canEditFeatures={user?.roleType === 'SUPER_ADMIN' || user?.roleType === 'ADMIN'}
                />
            )}

            {/* Add/Edit Modal would go here */}
            {/* TODO: Implement TenantAccessModal component */}
        </div>
    );
};

export default TenantAccessManager;
