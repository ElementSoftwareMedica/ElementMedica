/**
 * TenantUsersPage Component
 * 
 * Pagina wrapper che permette di selezionare un tenant
 * e poi mostra gli utenti con accesso a quel tenant
 * 
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect } from 'react';
import { Building2, Users, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import UsersWithTenantAccess from './UsersWithTenantAccess';
import { managementApi } from '../api';
import type { Tenant } from '../types';

const TenantUsersPage: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadTenants();
    }, []);

    const loadTenants = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await managementApi.getMyTenants();
            setTenants(response.data || []);
            
            // Se c'è un solo tenant, selezionalo automaticamente
            if (response.data?.length === 1) {
                setSelectedTenant(response.data[0]);
            }
        } catch (err: any) {
            console.error('Error loading tenants:', err);
            // Gestione errori più robusta
            let errorMessage = 'Errore nel caricamento dei tenant';
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                // Gestisce errori come "Cannot read properties of undefined (reading 'toUpperCase')"
                if (err.message.includes('toUpperCase') || err.message.includes('undefined')) {
                    errorMessage = 'Errore di configurazione API. Assicurati di essere autenticato.';
                } else {
                    errorMessage = err.message;
                }
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-50 rounded-xl border border-red-200 p-6">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-700 mb-2">Errore</h3>
                <p className="text-red-600 text-center">{error}</p>
                <button 
                    onClick={loadTenants}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    Riprova
                </button>
            </div>
        );
    }

    if (tenants.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 rounded-xl border border-gray-200 p-6">
                <Building2 className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Nessun Tenant Disponibile</h3>
                <p className="text-gray-500 text-center">Non hai accesso a nessun tenant.</p>
            </div>
        );
    }

    // Se un tenant è selezionato, mostra gli utenti
    if (selectedTenant) {
        return (
            <div className="space-y-4">
                {/* Breadcrumb / Navigation */}
                <div className="flex items-center gap-2 text-sm">
                    <button
                        onClick={() => setSelectedTenant(null)}
                        className="text-purple-600 hover:text-purple-700 hover:underline"
                    >
                        Seleziona Tenant
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 font-medium">{selectedTenant.name}</span>
                </div>

                {/* Users Component */}
                <UsersWithTenantAccess 
                    tenantId={selectedTenant.id} 
                    tenantName={selectedTenant.name} 
                />
            </div>
        );
    }

    // Mostra la lista dei tenant per la selezione
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Users className="w-7 h-7 text-purple-600" />
                    Utenti per Tenant
                </h1>
                <p className="text-gray-500 mt-1">
                    Seleziona un tenant per visualizzare e gestire gli utenti con accesso
                </p>
            </div>

            {/* Tenant Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tenants.map((tenant) => (
                    <button
                        key={tenant.id}
                        onClick={() => setSelectedTenant(tenant)}
                        className="group bg-white rounded-xl border border-gray-200 p-6 text-left hover:border-purple-300 hover:shadow-lg transition-all duration-200"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                    <Building2 className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 group-hover:text-purple-700">
                                        {tenant.name}
                                    </h3>
                                    <p className="text-sm text-gray-500">{tenant.slug}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition-colors" />
                        </div>
                        
                        {tenant.domain && (
                            <p className="mt-3 text-sm text-gray-600">
                                Dominio: {tenant.domain}
                            </p>
                        )}
                        
                        <div className="mt-4 flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                tenant.isActive !== false
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600'
                            }`}>
                                {tenant.isActive !== false ? 'Attivo' : 'Inattivo'}
                            </span>
                            {tenant.billingPlan && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {tenant.billingPlan}
                                </span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TenantUsersPage;
