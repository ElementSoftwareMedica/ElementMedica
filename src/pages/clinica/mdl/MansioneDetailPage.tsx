/**
 * MansioneDetailPage - Dettaglio mansione con rischi associati
 * 
 * Mostra il dettaglio completo di una mansione lavorativa:
 * - Informazioni base (codice, denominazione, settore, area lavoro)
 * - Lista rischi associati con livello e categoria
 * - Lavoratori assegnati
 * - Protocolli sanitari collegati
 * 
 * @module pages/clinica/mdl/MansioneDetailPage
 * @project P56 - Medicina del Lavoro Sistema Completo
 */

import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Briefcase,
    Edit2,
    Trash2,
    Loader2,
    AlertCircle,
    Building2,
    ShieldAlert,
    Users,
    FileText,
    CheckCircle2,
    AlertTriangle,
    User
} from 'lucide-react';
import { clinicaApi, type Mansione, type LivelloRischio } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import Modal from '../../../design-system/molecules/Modal/Modal';
import MansioneFormModal from './components/MansioneFormModal';

// Risk level styles
const RISK_LEVEL_STYLES: Record<LivelloRischio, { bg: string; text: string; label: string }> = {
    BASSO: { bg: 'bg-green-100', text: 'text-green-700', label: 'Basso' },
    MEDIO: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medio' },
    ALTO: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Alto' },
    MOLTO_ALTO: { bg: 'bg-red-100', text: 'text-red-700', label: 'Molto Alto' }
};

// Risk category labels - aligned with Prisma enum CategoriaRischio
const RISK_CATEGORY_LABELS: Record<string, string> = {
    FISICI: 'Fisici',
    CHIMICI: 'Chimici',
    BIOLOGICI: 'Biologici',
    ERGONOMICI: 'Ergonomici',
    ORGANIZZATIVI: 'Organizzativi',
    SPECIFICI: 'Specifici',
    SETTORIALI: 'Settoriali'
};

const MansioneDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { tenantFilterKey } = useTenantFilter();

    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

    // Fetch mansione detail - include tenantFilterKey for cache invalidation on tenant change
    const { data: mansione, isLoading, error } = useQuery({
        queryKey: ['mansione', id, tenantFilterKey],
        queryFn: () => clinicaApi.mansioni.getById(id!),
        enabled: !!id
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: () => clinicaApi.mansioni.delete(id!),
        onSuccess: () => {
            showToast({ type: 'success', message: 'Mansione eliminata con successo' });
            queryClient.invalidateQueries({ queryKey: ['mansioni'] });
            navigate('/poliambulatorio/mdl/mansioni');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione' });
        }
    });

    const handleEditSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['mansione', id] });
        queryClient.invalidateQueries({ queryKey: ['mansioni'] });
        setIsEditModalOpen(false);
    }, [queryClient, id]);

    const handleDelete = useCallback(() => {
        deleteMutation.mutate();
        setIsDeleteModalOpen(false);
    }, [deleteMutation]);

    // Extract data (safe for hooks - always executed)
    const rischi = mansione?.rischiAssociati || mansione?.rischi || [];
    const lavoratori = mansione?.lavoratori || [];

    // Extract unique companies from workers - MUST be before any conditional returns
    const aziende = React.useMemo(() => {
        if (!lavoratori.length) return [];

        const aziendeMap = new Map<string, { id: string; ragioneSociale: string; piva: string; lavoratoriCount: number }>();

        lavoratori.forEach((lav) => {
            const person = lav.person as {
                tenantProfiles?: Array<{
                    companyTenantProfile?: {
                        id: string;
                        company?: {
                            id: string;
                            ragioneSociale: string;
                            piva: string;
                        };
                    };
                }>;
            };

            const companyProfile = person?.tenantProfiles?.[0]?.companyTenantProfile;
            const company = companyProfile?.company;

            if (company?.id) {
                const existing = aziendeMap.get(company.id);
                if (existing) {
                    existing.lavoratoriCount++;
                } else {
                    aziendeMap.set(company.id, {
                        id: company.id,
                        ragioneSociale: company.ragioneSociale || 'Azienda non specificata',
                        piva: company.piva || '-',
                        lavoratoriCount: 1
                    });
                }
            }
        });

        return Array.from(aziendeMap.values()).sort((a, b) => b.lavoratoriCount - a.lavoratoriCount);
    }, [lavoratori]);

    // Loading state
    if (isLoading) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Caricamento dettaglio mansione...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !mansione) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex flex-col items-center justify-center py-12 text-red-500">
                    <AlertCircle className="h-12 w-12 mb-4" />
                    <h3 className="text-lg font-medium">Errore nel caricamento</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {'Mansione non trovata'}
                    </p>
                    <button
                        onClick={() => navigate('/poliambulatorio/mdl/mansioni')}
                        className="mt-4 px-4 py-2 text-sm font-medium text-teal-600 hover:text-teal-700"
                    >
                        ← Torna alla lista
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 clinica-theme">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/poliambulatorio/mdl/mansioni')}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-teal-100 rounded-xl">
                            <Briefcase className="h-6 w-6 text-teal-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {mansione.denominazione}
                            </h1>
                            <p className="text-sm text-gray-500">
                                Codice: {mansione.codice}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="btn-clinica-secondary flex items-center gap-2"
                    >
                        <Edit2 className="h-4 w-4" />
                        Modifica
                    </button>
                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="btn-clinica-danger flex items-center gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        Elimina
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-teal-600" />
                            Informazioni Base
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Codice
                                </label>
                                <p className="text-sm text-gray-900 mt-1">{mansione.codice}</p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Denominazione
                                </label>
                                <p className="text-sm text-gray-900 mt-1">{mansione.denominazione}</p>
                            </div>
                            {mansione.settore && (
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Settore
                                    </label>
                                    <p className="text-sm text-gray-900 mt-1">{mansione.settore}</p>
                                </div>
                            )}
                            {mansione.areaLavoro && (
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Area Lavoro
                                    </label>
                                    <p className="text-sm text-gray-900 mt-1">{mansione.areaLavoro}</p>
                                </div>
                            )}
                            {mansione.site && (
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Sede
                                    </label>
                                    <p className="text-sm text-gray-900 mt-1 flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-gray-400" />
                                        {mansione.site.siteName}
                                    </p>
                                </div>
                            )}
                            {mansione.descrizione && (
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Descrizione
                                    </label>
                                    <p className="text-sm text-gray-900 mt-1">{mansione.descrizione}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Risks Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-orange-600" />
                            Rischi Associati ({rischi.length})
                        </h2>
                        {rischi.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                <p>Nessun rischio associato</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rischi.map((rischio, index) => {
                                    const livello = rischio.livello || rischio.livelloRischio || 'MEDIO';
                                    const categoria = rischio.categoria || rischio.categoriaRischio || 'FISICI';
                                    const style = RISK_LEVEL_STYLES[livello as LivelloRischio] || RISK_LEVEL_STYLES.MEDIO;
                                    return (
                                        <div
                                            key={rischio.id || index}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {rischio.codiceRischio}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {RISK_CATEGORY_LABELS[categoria] || categoria}
                                                </span>
                                            </div>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
                                                {style.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Status Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Stato</h3>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                                Attiva
                            </span>
                        </div>
                    </div>

                    {/* Workers Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            Lavoratori Assegnati ({lavoratori.length})
                        </h3>
                        {lavoratori.length === 0 ? (
                            <p className="text-sm text-gray-500">Nessun lavoratore assegnato</p>
                        ) : (
                            <div className="space-y-2">
                                {lavoratori.slice(0, 5).map((lav) => {
                                    const person = lav.person as { firstName?: string; lastName?: string } | undefined;
                                    return (
                                        <div key={lav.id} className="flex items-center gap-2 text-sm">
                                            <User className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-700">
                                                {person?.firstName} {person?.lastName}
                                            </span>
                                        </div>
                                    );
                                })}
                                {lavoratori.length > 5 && (
                                    <p className="text-xs text-gray-500">
                                        + altri {lavoratori.length - 5} lavoratori
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Companies Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-teal-600" />
                            Aziende ({aziende.length})
                        </h3>
                        {aziende.length === 0 ? (
                            <p className="text-sm text-gray-500">Nessuna azienda collegata</p>
                        ) : (
                            <div className="space-y-3">
                                {aziende.slice(0, 5).map((azienda) => (
                                    <div key={azienda.id} className="p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {azienda.ragioneSociale}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    P.IVA: {azienda.piva}
                                                </p>
                                            </div>
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                {azienda.lavoratoriCount} lav.
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {aziende.length > 5 && (
                                    <p className="text-xs text-gray-500 text-center">
                                        + altre {aziende.length - 5} aziende
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-teal-600" />
                            Azioni Rapide
                        </h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                Modifica mansione
                            </button>
                            <button
                                onClick={() => navigate('/poliambulatorio/mdl/protocolli-sanitari')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                Crea protocollo sanitario
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <MansioneFormModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={handleEditSuccess}
                mansione={mansione}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Conferma Eliminazione"
                size="sm"
            >
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-red-100 rounded-full">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">
                                Eliminare la mansione?
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Stai per eliminare <strong>{mansione.denominazione}</strong>.
                                Questa azione non può essere annullata.
                            </p>
                        </div>
                    </div>
                    {lavoratori.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-yellow-800">
                                <strong>Attenzione:</strong> Questa mansione ha {lavoratori.length} lavoratori assegnati.
                            </p>
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={() => setIsDeleteModalOpen(false)}
                        className="btn-clinica-secondary"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="btn-clinica-danger"
                    >
                        {deleteMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Eliminazione...
                            </>
                        ) : (
                            'Elimina'
                        )}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default MansioneDetailPage;
