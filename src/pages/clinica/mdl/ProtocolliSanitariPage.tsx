/**
 * ProtocolliSanitariPage - Gestione Protocolli Sanitari MDL
 * 
 * Pagina per la gestione dei protocolli sanitari associati a mansioni/sedi
 * secondo D.Lgs 81/08 Art. 25.
 * 
 * @module pages/clinica/mdl/ProtocolliSanitariPage
 * @project P56 - Medicina del Lavoro Sistema Completo - FASE 2
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    Plus,
    Search,
    Building2,
    Briefcase,
    Filter,
    Edit2,
    Trash2,
    Copy,
    Loader2,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Euro,
    Calendar,
    Sparkles,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import { clinicaApi, type ProtocolloSanitario, type TipoPeriodicita } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../design-system/molecules/Modal/Modal';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useViewMode } from '../../../hooks/useViewMode';
import { ViewModeToggle } from '../../../components/clinica/ViewModeToggle';
import { ActionMenu, createCrudActions } from '@/components/ui/ActionMenu';
import { CRUDButton, CRUDPrimaryButton } from '../../../components/shared/CRUDButton';
import ProtocolloFormModal from './components/ProtocolloFormModal';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// Periodicity labels - Aligned with Prisma TipoPeriodicita enum
const PERIODICITA_LABELS: Record<TipoPeriodicita, string> = {
    MESI_6: '6 mesi',
    MESI_12: '12 mesi',
    MESI_24: '24 mesi',
    MESI_36: '36 mesi',
    MESI_60: '60 mesi',
    SU_INDICAZIONE: 'Su indicazione',
    UNA_TANTUM: 'Una tantum'
};

const ProtocolliSanitariPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSiteId, setFilterSiteId] = useState<string>('');
    const [filterMansioneId, setFilterMansioneId] = useState<string>('');
    const [filterActive, setFilterActive] = useState<boolean | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [protocolloToDelete, setProtocolloToDelete] = useState<ProtocolloSanitario | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingProtocollo, setEditingProtocollo] = useState<ProtocolloSanitario | null>(null);
    const [costModalOpen, setCostModalOpen] = useState(false);
    const [selectedProtocolloForCost, setSelectedProtocolloForCost] = useState<string | null>(null);

    // View mode with localStorage persistence
    const { viewMode, setViewMode } = useViewMode({ storageKey: 'protocolli-sanitari-mdl' });

    // Query params with tenant filter
    const queryParams = useMemo(() => {
        const tenantParams = getTenantFilterParams();
        return {
            search: searchTerm || undefined,
            siteId: filterSiteId || undefined,
            mansioneId: filterMansioneId || undefined,
            isAttivo: filterActive !== null ? filterActive : undefined,
            ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
            ...(tenantParams.allTenants && { allTenants: 'true' })
        };
    }, [searchTerm, filterSiteId, filterMansioneId, filterActive, getTenantFilterParams, tenantFilterKey]);

    // Fetch protocolli
    const { data: protocolliResponse, isLoading, error } = useQuery({
        queryKey: ['protocolli-sanitari', queryParams, tenantFilterKey],
        queryFn: () => clinicaApi.protocolliSanitari.getAll(queryParams),
        enabled: isReady
    });

    // Fetch cost for selected protocol
    const { data: protocolCost, isLoading: isCostLoading } = useQuery({
        queryKey: ['protocollo-cost', selectedProtocolloForCost],
        queryFn: () => clinicaApi.protocolliSanitari.getCost(selectedProtocolloForCost!),
        enabled: !!selectedProtocolloForCost && costModalOpen
    });

    // Fetch sedi for filter dropdown
    const { data: sediData } = useQuery({
        queryKey: ['sedi-filter'],
        queryFn: () => clinicaApi.sedi.getAll({ limit: 100 }),
        enabled: isReady
    });

    // Fetch mansioni for filter dropdown
    const { data: mansioniData } = useQuery({
        queryKey: ['mansioni-filter'],
        queryFn: () => clinicaApi.mansioni.getAll({ limit: 100 }),
        enabled: isReady
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => clinicaApi.protocolliSanitari.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['protocolli-sanitari'] });
            showToast({ type: 'success', message: 'Protocollo eliminato con successo' });
            setDeleteModalOpen(false);
            setProtocolloToDelete(null);
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione' });
        }
    });

    // Duplicate mutation
    const duplicateMutation = useMutation({
        mutationFn: (id: string) => clinicaApi.protocolliSanitari.duplicate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['protocolli-sanitari'] });
            showToast({ type: 'success', message: 'Protocollo duplicato con successo' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante la duplicazione' });
        }
    });

    // Toggle active mutation
    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, isAttivo }: { id: string; isAttivo: boolean }) =>
            clinicaApi.protocolliSanitari.setActive(id, isAttivo),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['protocolli-sanitari'] });
            showToast({ type: 'success', message: 'Stato protocollo aggiornato' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'aggiornamento' });
        }
    });

    // Extract data
    const protocolli = protocolliResponse?.data || [];
    const pagination = protocolliResponse?.pagination;
    const sedi = sediData?.data || [];
    const mansioni = mansioniData?.data || [];

    // Handlers
    const handleDelete = useCallback(() => {
        if (protocolloToDelete) {
            deleteMutation.mutate(protocolloToDelete.id);
        }
    }, [protocolloToDelete, deleteMutation]);

    const handleEdit = useCallback((protocollo: ProtocolloSanitario) => {
        setEditingProtocollo(protocollo);
        setFormModalOpen(true);
    }, []);

    const handleCreate = useCallback(() => {
        setEditingProtocollo(null);
        setFormModalOpen(true);
    }, []);

    const handleDuplicate = useCallback((protocollo: ProtocolloSanitario) => {
        duplicateMutation.mutate(protocollo.id);
    }, [duplicateMutation]);

    const handleToggleActive = useCallback((protocollo: ProtocolloSanitario) => {
        toggleActiveMutation.mutate({ id: protocollo.id, isAttivo: !protocollo.isAttivo });
    }, [toggleActiveMutation]);

    const handleViewCost = useCallback((protocolloId: string) => {
        setSelectedProtocolloForCost(protocolloId);
        setCostModalOpen(true);
    }, []);

    const handleFormSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['protocolli-sanitari'] });
        setFormModalOpen(false);
        setEditingProtocollo(null);
    }, [queryClient]);

    // Loading state
    if (isLoading && !protocolliResponse) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-gray-600">Caricamento protocolli sanitari...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-800 font-medium">Errore nel caricamento</p>
                    <p className="text-gray-600 text-sm mt-2">Si è verificato un errore nel caricamento dei protocolli sanitari. Riprova in seguito.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-lg">
                            <FileText className="h-6 w-6 text-teal-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">Protocolli Sanitari</h1>
                            <p className="text-sm text-gray-500">
                                Gestione protocolli sanitari per mansione/sede (Art. 25 D.Lgs 81/08)
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                        <CRUDPrimaryButton onClick={handleCreate} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Nuovo Protocollo
                        </CRUDPrimaryButton>
                    </div>
                </div>

                {/* Filters */}
                <div className="mt-4 flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cerca per codice o denominazione..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>

                    {/* Mansione filter */}
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        <select
                            value={filterMansioneId}
                            onChange={(e) => setFilterMansioneId(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value="">Tutte le mansioni</option>
                            {mansioni.map((mansione) => (
                                <option key={mansione.id} value={mansione.id}>{mansione.denominazione}</option>
                            ))}
                        </select>
                    </div>

                    {/* Active filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <select
                            value={filterActive === null ? '' : filterActive.toString()}
                            onChange={(e) => setFilterActive(e.target.value === '' ? null : e.target.value === 'true')}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value="">Tutti gli stati</option>
                            <option value="true">Solo attivi</option>
                            <option value="false">Solo inattivi</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {protocolli.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Nessun protocollo trovato
                        </h3>
                        <p className="text-gray-500 mb-6">
                            Non ci sono protocolli sanitari che corrispondono ai criteri di ricerca.
                        </p>
                        <CRUDPrimaryButton onClick={handleCreate} className="inline-flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Crea il primo protocollo
                        </CRUDPrimaryButton>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Card View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {protocolli.map((protocollo) => (
                            <div
                                key={protocollo.id}
                                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => navigate(`/poliambulatorio/mdl/protocolli-sanitari/${protocollo.id}`)}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${protocollo.isAttivo ? 'bg-teal-100' : 'bg-gray-100'}`}>
                                            <FileText className={`h-5 w-5 ${protocollo.isAttivo ? 'text-teal-600' : 'text-gray-400'}`} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{protocollo.codice}</h3>
                                            <p className="text-sm text-gray-500">{protocollo.denominazione}</p>
                                        </div>
                                    </div>
                                    <ActionMenu
                                        actions={[
                                            ...createCrudActions({
                                                onEdit: () => handleEdit(protocollo),
                                                onDelete: () => {
                                                    setProtocolloToDelete(protocollo);
                                                    setDeleteModalOpen(true);
                                                }
                                            }),
                                            {
                                                label: 'Duplica',
                                                icon: Copy,
                                                onClick: () => handleDuplicate(protocollo)
                                            },
                                            {
                                                label: protocollo.isAttivo ? 'Disattiva' : 'Attiva',
                                                icon: protocollo.isAttivo ? ToggleLeft : ToggleRight,
                                                onClick: () => handleToggleActive(protocollo)
                                            },
                                            {
                                                label: 'Calcola Costo',
                                                icon: Euro,
                                                onClick: () => handleViewCost(protocollo.id)
                                            }
                                        ]}
                                    />
                                </div>

                                {/* Info */}
                                <div className="space-y-2 text-sm">
                                    {((protocollo.mansioniAssociate?.length ?? 0) > 0 || protocollo.mansione) && (
                                        <div className="flex items-start gap-2 text-gray-600">
                                            <Briefcase className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                            <div className="flex flex-wrap gap-1">
                                                {(protocollo.mansioniAssociate?.length ?? 0) > 0
                                                    ? protocollo.mansioniAssociate?.map((ma) => (
                                                        <span key={ma.id} className="inline-flex items-center text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                                                            {ma.mansione?.denominazione}
                                                        </span>
                                                    ))
                                                    : protocollo.mansione && (
                                                        <span className="inline-flex items-center text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                                                            {protocollo.mansione.denominazione}
                                                        </span>
                                                    )
                                                }
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {protocollo.isAttivo ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                                <CheckCircle2 className="h-3 w-3" /> Attivo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                <XCircle className="h-3 w-3" /> Inattivo
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {protocollo._count?.prestazioni || 0} prestazioni
                                        {(protocollo._count?.questionari ?? 0) > 0 && (
                                            <> · {protocollo._count?.questionari} questionari</>
                                        )}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Table View */
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Codice
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Denominazione
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Mansioni
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Prestazioni
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Questionari
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Stato
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Azioni
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {protocolli.map((protocollo) => (
                                    <tr
                                        key={protocollo.id}
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => navigate(`/poliambulatorio/mdl/protocolli-sanitari/${protocollo.id}`)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-medium text-gray-900">
                                                {protocollo.codice}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-700">
                                                {protocollo.denominazione}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {(protocollo.mansioniAssociate?.length ?? 0) > 0
                                                    ? protocollo.mansioniAssociate?.map((ma) => (
                                                        <span key={ma.id} className="inline-flex items-center text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                                                            {ma.mansione?.denominazione}
                                                        </span>
                                                    ))
                                                    : protocollo.mansione && (
                                                        <span className="inline-flex items-center text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                                                            {protocollo.mansione.denominazione}
                                                        </span>
                                                    )
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-600">
                                                {protocollo._count?.prestazioni || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-600">
                                                {protocollo._count?.questionari || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {protocollo.isAttivo ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                                    <CheckCircle2 className="h-3 w-3" /> Attivo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                    <XCircle className="h-3 w-3" /> Inattivo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                            <ActionMenu
                                                actions={[
                                                    ...createCrudActions({
                                                        onEdit: () => handleEdit(protocollo),
                                                        onDelete: () => {
                                                            setProtocolloToDelete(protocollo);
                                                            setDeleteModalOpen(true);
                                                        }
                                                    }),
                                                    {
                                                        label: 'Duplica',
                                                        icon: Copy,
                                                        onClick: () => handleDuplicate(protocollo)
                                                    },
                                                    {
                                                        label: protocollo.isAttivo ? 'Disattiva' : 'Attiva',
                                                        icon: protocollo.isAttivo ? ToggleLeft : ToggleRight,
                                                        onClick: () => handleToggleActive(protocollo)
                                                    },
                                                    {
                                                        label: 'Calcola Costo',
                                                        icon: Euro,
                                                        onClick: () => handleViewCost(protocollo.id)
                                                    }
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between bg-white rounded-xl border border-gray-200 px-6 py-4">
                        <span className="text-sm text-gray-600">
                            {pagination.total} protocolli totali
                        </span>
                        <span className="text-sm text-gray-600">
                            Pagina {pagination.page} di {pagination.totalPages}
                        </span>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setProtocolloToDelete(null);
                }}
                title="Conferma eliminazione"
            >
                <div className="p-6">
                    <p className="text-gray-600 mb-6">
                        Sei sicuro di voler eliminare il protocollo <strong>{protocolloToDelete?.codice}</strong>?
                        Questa azione non può essere annullata.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => {
                                setDeleteModalOpen(false);
                                setProtocolloToDelete(null);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Annulla
                        </button>
                        <CRUDButton
                            onClick={handleDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Eliminazione...
                                </>
                            ) : (
                                'Elimina'
                            )}
                        </CRUDButton>
                    </div>
                </div>
            </Modal>

            {/* Cost Modal */}
            <Modal
                isOpen={costModalOpen}
                onClose={() => {
                    setCostModalOpen(false);
                    setSelectedProtocolloForCost(null);
                }}
                title="Costo Protocollo"
            >
                <div className="p-6">
                    {isCostLoading ? (
                        <div className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
                            <p className="text-gray-600">Calcolo costo in corso...</p>
                        </div>
                    ) : protocolCost ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                                <span className="text-lg font-medium text-gray-900">Costo Totale</span>
                                <span className="text-2xl font-bold text-teal-600">
                                    € {protocolCost.totale?.toFixed(2) || '0.00'}
                                </span>
                            </div>
                            <div className="text-sm text-gray-600">
                                <p>Di cui obbligatorie: € {protocolCost.totaleObbligatorie?.toFixed(2) || '0.00'}</p>
                            </div>
                            {protocolCost.dettaglio && protocolCost.dettaglio.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-medium text-gray-800 mb-2">Dettaglio Prestazioni</h4>
                                    <div className="space-y-2">
                                        {protocolCost.dettaglio.map((item, index) => (
                                            <div key={index} className="flex justify-between text-sm">
                                                <span className="text-gray-600">
                                                    {item.prestazioneNome}
                                                    {item.isObbligatoria && (
                                                        <span className="ml-2 text-xs text-teal-600">(obbl.)</span>
                                                    )}
                                                </span>
                                                <span className="font-medium">€ {item.costo?.toFixed(2) || '0.00'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">Nessun dato disponibile</p>
                    )}
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => {
                                setCostModalOpen(false);
                                setSelectedProtocolloForCost(null);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Form Modal */}
            <ProtocolloFormModal
                isOpen={formModalOpen}
                onClose={() => {
                    setFormModalOpen(false);
                    setEditingProtocollo(null);
                }}
                protocollo={editingProtocollo}
                onSuccess={handleFormSuccess}
            />
        </div>
    );
};

export default ProtocolliSanitariPage;
