/**
 * TenantAccessManager Component
 * 
 * Gestisce l'accesso multi-tenant per gli utenti
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Shield, Check, X, Star, StarOff, Plus, Trash2, Edit2, Search, Filter, Eye, ExternalLink } from 'lucide-react';
import { managementApi } from '../api';
import type { Tenant, Feature, TenantAccessLevel } from '../types';
import { useAuth } from '../../../context/AuthContext';

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
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);
    // Modal state for tenant details
    const [selectedTenantDetails, setSelectedTenantDetails] = useState<Tenant | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFeature, setFilterFeature] = useState<string>('');

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

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
            } catch (tenantErr: any) {
                console.error('Error loading tenants:', tenantErr);
                // Se non autenticato, non mostrare errore ma lista vuota
                if (tenantErr.response?.status === 401) {
                    setError('Sessione scaduta. Effettua nuovamente il login.');
                    return;
                }
            }

            try {
                const featuresRes = await managementApi.getFeatures();
                featuresData = featuresRes.data || [];
            } catch (featErr: any) {
                console.error('Error loading features:', featErr);
                // Features sono opzionali, ignora errore
            }

            setTenants(tenantsData);
            setFeatures(featuresData);
        } catch (err: any) {
            const message = err.message || 'Errore nel caricamento dei dati';
            // Evita errori criptici
            if (message.includes('toUpperCase')) {
                setError('Errore di comunicazione con il server. Ricarica la pagina.');
            } else {
                setError(message);
            }
            console.error('Error loading tenant access data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSetPrimary = async (tenantId: string) => {
        if (!personId) return;

        try {
            await managementApi.setPrimaryTenant(personId, tenantId);
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Errore nell\'impostare il tenant primario');
        }
    };

    const handleRevoke = async (tenantId: string) => {
        if (!personId) return;

        if (!confirm('Sei sicuro di voler revocare l\'accesso a questo tenant?')) return;

        try {
            await managementApi.revokeTenantAccess(personId, tenantId);
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Errore nella revoca dell\'accesso');
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
                <span className="ml-3 text-gray-600">Caricamento tenant...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                            <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        {isViewingOwnTenants ? 'I Miei Tenant' : 'Tenant Accessibili'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 ml-13">
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
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                        value={filterFeature}
                        onChange={(e) => setFilterFeature(e.target.value)}
                        className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
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
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-3 text-sm font-semibold text-gray-900">Nessun tenant trovato</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {searchTerm || filterFeature
                            ? 'Prova a modificare i filtri di ricerca'
                            : 'Non hai accesso a nessun tenant'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredTenants.map(tenant => {
                        const accessInfo = getAccessLevelInfo(tenant.accessLevel);

                        // Handler per click: usa onTenantSelect se passato, altrimenti mostra modal dettagli
                        const handleTenantClick = () => {
                            if (onTenantSelect) {
                                onTenantSelect(tenant);
                            } else {
                                // Mostra modal con dettagli tenant
                                setSelectedTenantDetails(tenant);
                            }
                        };

                        return (
                            <div
                                key={tenant.id}
                                className={`relative bg-white rounded-xl border-2 transition-all duration-200 hover:shadow-lg cursor-pointer group overflow-hidden ${tenant.isPrimary
                                        ? 'border-yellow-400 ring-2 ring-yellow-100 shadow-md'
                                        : 'border-gray-200 hover:border-blue-300'
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
                                            <h3 className="font-semibold text-gray-900 truncate text-base">{tenant.name}</h3>
                                            <p className="text-sm text-gray-500 truncate mt-0.5">{tenant.slug}</p>
                                        </div>
                                        <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${accessInfo.color}`}>
                                            {accessInfo.label}
                                        </span>
                                    </div>

                                    {/* Features */}
                                    {tenant.enabledFeatures && tenant.enabledFeatures.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Features</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {tenant.enabledFeatures.slice(0, 4).map(feature => (
                                                    <span key={feature} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-medium capitalize">
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
                                    <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-100">
                                        <span className={`flex items-center font-medium ${tenant.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {tenant.isActive ? <Check className="h-3.5 w-3.5 mr-1" /> : <X className="h-3.5 w-3.5 mr-1" />}
                                            {tenant.isActive ? 'Attivo' : 'Inattivo'}
                                        </span>
                                        <span className="text-gray-400 bg-gray-50 px-2 py-0.5 rounded capitalize">{tenant.billingPlan}</span>
                                    </div>

                                    {/* Actions (only for admin managing other users) */}
                                    {!isViewingOwnTenants && !tenant.isAdminAccess && (
                                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingTenant(tenant); }}
                                                className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                                            >
                                                <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                                                Modifica
                                            </button>
                                            {!tenant.isPrimary && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleSetPrimary(tenant.id); }}
                                                    className="flex items-center justify-center px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Imposta come primario"
                                                >
                                                    <Star className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRevoke(tenant.id); }}
                                                className="flex items-center justify-center px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Revoca accesso"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tenant Details Modal */}
            {selectedTenantDetails && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTenantDetails(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{selectedTenantDetails.name}</h3>
                                    <p className="text-sm text-gray-500">{selectedTenantDetails.slug}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTenantDetails(null)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 py-4 space-y-6">
                            {/* Access Level */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Livello di Accesso</h4>
                                <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getAccessLevelInfo(selectedTenantDetails.accessLevel).color}`}>
                                    <Shield className="h-4 w-4 mr-1.5" />
                                    {getAccessLevelInfo(selectedTenantDetails.accessLevel).label}
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{getAccessLevelInfo(selectedTenantDetails.accessLevel).description}</p>
                            </div>

                            {/* Status */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Stato</h4>
                                <div className="flex items-center gap-4">
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${selectedTenantDetails.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {selectedTenantDetails.isActive ? <Check className="h-4 w-4 mr-1.5" /> : <X className="h-4 w-4 mr-1.5" />}
                                        {selectedTenantDetails.isActive ? 'Attivo' : 'Inattivo'}
                                    </span>
                                    {selectedTenantDetails.isPrimary && (
                                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                            <Star className="h-4 w-4 mr-1.5 fill-current" />
                                            Primario
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Billing Plan */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Piano</h4>
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800 capitalize">
                                    {selectedTenantDetails.billingPlan || 'Standard'}
                                </span>
                            </div>

                            {/* Features */}
                            {selectedTenantDetails.enabledFeatures && selectedTenantDetails.enabledFeatures.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Funzionalità Abilitate</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedTenantDetails.enabledFeatures.map(feature => (
                                            <span key={feature} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium capitalize">
                                                {feature}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tenant ID */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">ID Tenant</h4>
                                <code className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg font-mono text-gray-600 block overflow-x-auto">
                                    {selectedTenantDetails.id}
                                </code>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between rounded-b-2xl">
                            <button
                                onClick={() => setSelectedTenantDetails(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Chiudi
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        navigate(`/management/tenant-access?tenantId=${selectedTenantDetails.id}`);
                                        setSelectedTenantDetails(null);
                                    }}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                >
                                    <Eye className="h-4 w-4 mr-1.5" />
                                    Gestisci Accessi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal would go here */}
            {/* TODO: Implement TenantAccessModal component */}
        </div>
    );
};

export default TenantAccessManager;
