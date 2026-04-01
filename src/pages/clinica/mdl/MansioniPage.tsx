/**
 * MansioniPage - Gestione Mansioni Medicina del Lavoro
 * 
 * Pagina per la gestione delle mansioni lavorative con rischi associati
 * secondo D.Lgs 81/08.
 * 
 * @module pages/clinica/mdl/MansioniPage
 * @project P56 - Medicina del Lavoro Sistema Completo
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase,
    Plus,
    Search,
    AlertTriangle,
    Users,
    Building2,
    Filter,
    Edit2,
    Trash2,
    Copy,
    ChevronRight,
    Loader2,
    AlertCircle,
    ShieldAlert,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { clinicaApi, type Mansione, type CodiceRischio, type LivelloRischio } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../design-system/molecules/Modal/Modal';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useViewMode } from '../../../hooks/useViewMode';
import { ViewModeToggle } from '../../../components/clinica/ViewModeToggle';
import { ActionMenu, createCrudActions } from '@/components/ui/ActionMenu';
import { CRUDButton, CRUDPrimaryButton } from '../../../components/shared/CRUDButton';
import MansioneFormModal from './components/MansioneFormModal';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// Risk level colors
const RISK_LEVEL_COLORS: Record<LivelloRischio, { bg: string; text: string; label: string }> = {
    BASSO: { bg: 'bg-green-100', text: 'text-green-700', label: 'Basso' },
    MEDIO: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medio' },
    ALTO: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Alto' },
    MOLTO_ALTO: { bg: 'bg-red-100', text: 'text-red-700', label: 'Molto Alto' }
};

// Risk category labels
const RISK_CATEGORY_LABELS: Record<string, string> = {
    FISICI: 'Fisici',
    CHIMICI: 'Chimici',
    BIOLOGICI: 'Biologici',
    ERGONOMICI: 'Ergonomici',
    PSICOSOCIALI: 'Psicosociali',
    ORGANIZZATIVI: 'Organizzativi',
    TRASVERSALI: 'Trasversali'
};

const MansioniPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSiteId, setFilterSiteId] = useState<string>('');
    const [filterActive, setFilterActive] = useState<boolean | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [mansioneToDelete, setMansioneToDelete] = useState<Mansione | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingMansione, setEditingMansione] = useState<Mansione | null>(null);

    // View mode with localStorage persistence
    const { viewMode, setViewMode } = useViewMode({ storageKey: 'mansioni-mdl' });

    // Query params with tenant filter
    const queryParams = useMemo(() => {
        const tenantParams = getTenantFilterParams();
        return {
            search: searchTerm || undefined,
            siteId: filterSiteId || undefined,
            isActive: filterActive !== null ? filterActive : undefined,
            ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
            ...(tenantParams.allTenants && { allTenants: 'true' })
        };
    }, [searchTerm, filterSiteId, filterActive, getTenantFilterParams, tenantFilterKey]);

    // Fetch mansioni
    const { data: mansioniResponse, isLoading, error } = useQuery({
        queryKey: ['mansioni', queryParams, tenantFilterKey],
        queryFn: () => clinicaApi.mansioni.getAll(queryParams),
        enabled: isReady
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => clinicaApi.mansioni.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mansioni'] });
            showToast({ type: 'success', message: 'Mansione eliminata con successo' });
            setDeleteModalOpen(false);
            setMansioneToDelete(null);
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione' });
        }
    });

    // Duplicate mutation
    const duplicateMutation = useMutation({
        mutationFn: (id: string) => clinicaApi.mansioni.duplicate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mansioni'] });
            showToast({ type: 'success', message: 'Mansione duplicata con successo' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante la duplicazione' });
        }
    });

    // Extract data
    const mansioni = mansioniResponse?.data || [];
    const pagination = mansioniResponse?.pagination;

    // Handlers
    const handleDelete = useCallback(() => {
        if (mansioneToDelete) {
            deleteMutation.mutate(mansioneToDelete.id);
        }
    }, [mansioneToDelete, deleteMutation]);

    const handleEdit = useCallback((mansione: Mansione) => {
        setEditingMansione(mansione);
        setFormModalOpen(true);
    }, []);

    const handleCreate = useCallback(() => {
        setEditingMansione(null);
        setFormModalOpen(true);
    }, []);

    const handleDuplicate = useCallback((mansione: Mansione) => {
        duplicateMutation.mutate(mansione.id);
    }, [duplicateMutation]);

    const handleFormClose = useCallback(() => {
        setFormModalOpen(false);
        setEditingMansione(null);
    }, []);

    const handleFormSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['mansioni'] });
        handleFormClose();
    }, [queryClient, handleFormClose]);

    // Calculate max risk level for a mansione
    const getMaxRiskLevel = useCallback((mansione: Mansione): LivelloRischio | null => {
        const rischi = mansione.rischiAssociati || mansione.rischi || [];
        if (rischi.length === 0) return null;
        const levels: LivelloRischio[] = ['BASSO', 'MEDIO', 'ALTO', 'MOLTO_ALTO'];
        let maxIndex = 0;
        rischi.forEach(r => {
            const level = r.livello || r.livelloRischio;
            if (level) {
                const idx = levels.indexOf(level);
                if (idx > maxIndex) maxIndex = idx;
            }
        });
        return levels[maxIndex];
    }, []);

    // Loading state
    if (isLoading) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Caricamento mansioni...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex flex-col items-center justify-center py-12 text-red-500">
                    <AlertCircle className="h-12 w-12 mb-4" />
                    <h3 className="text-lg font-medium">Errore nel caricamento</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {'Errore sconosciuto'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Briefcase className="h-7 w-7 text-teal-600" />
                        Mansioni Lavorative
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Gestione mansioni con rischi associati - D.Lgs 81/08
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                    <CRUDPrimaryButton
                        onClick={handleCreate}
                        className="btn-clinica-primary inline-flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Nuova Mansione
                    </CRUDPrimaryButton>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Cerca per nome, codice, settore..."
                            className="input-clinica pl-10 w-full"
                        />
                    </div>

                    {/* Active filter */}
                    <select
                        value={filterActive === null ? '' : filterActive.toString()}
                        onChange={(e) => setFilterActive(e.target.value === '' ? null : e.target.value === 'true')}
                        className="input-clinica w-40"
                    >
                        <option value="">Tutti gli stati</option>
                        <option value="true">Solo attive</option>
                        <option value="false">Solo inattive</option>
                    </select>
                </div>
            </div>

            {/* Stats Summary */}
            {pagination && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-teal-100 rounded-lg">
                                <Briefcase className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
                                <p className="text-sm text-gray-500">Mansioni totali</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {mansioni.filter(m => !m.deletedAt).length}
                                </p>
                                <p className="text-sm text-gray-500">Attive</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <ShieldAlert className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {mansioni.reduce((acc, m) => acc + (m.rischiAssociati?.length || 0), 0)}
                                </p>
                                <p className="text-sm text-gray-500">Rischi mappati</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {mansioni.reduce((acc, m) => acc + (m._count?.lavoratori || 0), 0)}
                                </p>
                                <p className="text-sm text-gray-500">Lavoratori assegnati</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mansioni List */}
            {mansioni.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm ? 'Nessuna mansione trovata' : 'Nessuna mansione registrata'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {searchTerm
                            ? 'Prova a modificare i criteri di ricerca'
                            : 'Inizia aggiungendo la prima mansione lavorativa'
                        }
                    </p>
                    {!searchTerm && (
                        <CRUDButton
                            operation="create"
                            onClick={handleCreate}
                            className="btn-clinica-primary inline-flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Aggiungi Mansione
                        </CRUDButton>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mansioni.map((mansione) => {
                        const maxRisk = getMaxRiskLevel(mansione);
                        return (
                            <div
                                key={mansione.id}
                                className="bg-white rounded-xl border border-gray-200 hover:border-teal-300 
                                           hover:shadow-md transition-all cursor-pointer"
                                onClick={() => navigate(`/poliambulatorio/mdl/mansioni/${mansione.id}`)}
                            >
                                {/* Card Header */}
                                <div className="p-4 border-b border-gray-100">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${!mansione.deletedAt ? 'bg-teal-100' : 'bg-gray-100'}`}>
                                                <Briefcase className={`h-5 w-5 ${!mansione.deletedAt ? 'text-teal-600' : 'text-gray-400'}`} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">
                                                    {mansione.denominazione}
                                                </h3>
                                                {mansione.codice && (
                                                    <p className="text-sm text-gray-500">
                                                        {mansione.codice}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${!mansione.deletedAt
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {!mansione.deletedAt ? 'Attiva' : 'Inattiva'}
                                        </span>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 space-y-3">
                                    {/* Settore/Area Lavoro */}
                                    {(mansione.settore || mansione.areaLavoro) && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Building2 className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-700">
                                                {mansione.settore}{mansione.areaLavoro ? ` - ${mansione.areaLavoro}` : ''}
                                            </span>
                                        </div>
                                    )}

                                    {/* Risk summary */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <AlertTriangle className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-700">
                                            {mansione.rischiAssociati?.length || 0} rischi associati
                                        </span>
                                        {maxRisk && (
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${RISK_LEVEL_COLORS[maxRisk].bg} ${RISK_LEVEL_COLORS[maxRisk].text}`}>
                                                Max: {RISK_LEVEL_COLORS[maxRisk].label}
                                            </span>
                                        )}
                                    </div>

                                    {/* Workers count */}
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Users className="h-4 w-4" />
                                        <span>{mansione._count?.lavoratori || 0} lavoratori</span>
                                    </div>

                                    {/* Site name */}
                                    {mansione.site && (
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Building2 className="h-4 w-4" />
                                            <span>{mansione.site.siteName}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Card Actions */}
                                <div className="p-4 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                                    <ActionMenu
                                        actions={[
                                            ...createCrudActions(
                                                () => navigate(`/poliambulatorio/mdl/mansioni/${mansione.id}`),
                                                () => handleEdit(mansione),
                                                () => {
                                                    setMansioneToDelete(mansione);
                                                    setDeleteModalOpen(true);
                                                }
                                            ),
                                            {
                                                label: 'Duplica',
                                                icon: Copy,
                                                onClick: () => handleDuplicate(mansione)
                                            }
                                        ]}
                                        theme="teal"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Table View */
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Mansione
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sede
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rischi
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Lavoratori
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
                            {mansioni.map((mansione) => {
                                const maxRisk = getMaxRiskLevel(mansione);
                                return (
                                    <tr
                                        key={mansione.id}
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => navigate(`/poliambulatorio/mdl/mansioni/${mansione.id}`)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className={`p-2 rounded-lg mr-3 ${!mansione.deletedAt ? 'bg-teal-100' : 'bg-gray-100'}`}>
                                                    <Briefcase className={`h-4 w-4 ${!mansione.deletedAt ? 'text-teal-600' : 'text-gray-400'}`} />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {mansione.denominazione}
                                                    </div>
                                                    {mansione.codice && (
                                                        <div className="text-sm text-gray-500">
                                                            {mansione.codice}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {mansione.site?.siteName || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-900">
                                                    {mansione.rischiAssociati?.length || 0}
                                                </span>
                                                {maxRisk && (
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${RISK_LEVEL_COLORS[maxRisk].bg} ${RISK_LEVEL_COLORS[maxRisk].text}`}>
                                                        {RISK_LEVEL_COLORS[maxRisk].label}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {mansione._count?.lavoratori || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${!mansione.deletedAt
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {!mansione.deletedAt ? 'Attiva' : 'Inattiva'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                            <ActionMenu
                                                actions={[
                                                    ...createCrudActions(
                                                        () => navigate(`/poliambulatorio/mdl/mansioni/${mansione.id}`),
                                                        () => handleEdit(mansione),
                                                        () => {
                                                            setMansioneToDelete(mansione);
                                                            setDeleteModalOpen(true);
                                                        }
                                                    ),
                                                    {
                                                        label: 'Duplica',
                                                        icon: Copy,
                                                        onClick: () => handleDuplicate(mansione)
                                                    }
                                                ]}
                                                theme="teal"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setMansioneToDelete(null);
                }}
                title="Conferma eliminazione"
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
                                Stai per eliminare <strong>{mansioneToDelete?.denominazione}</strong>.
                                Questa azione non può essere annullata.
                            </p>
                        </div>
                    </div>
                    {mansioneToDelete?._count?.lavoratori && mansioneToDelete._count.lavoratori > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-yellow-800">
                                <strong>Attenzione:</strong> Questa mansione ha {mansioneToDelete._count.lavoratori} lavoratori assegnati.
                                L'eliminazione rimuoverà anche tutte le assegnazioni.
                            </p>
                        </div>
                    )}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setDeleteModalOpen(false);
                                setMansioneToDelete(null);
                            }}
                            className="btn-clinica-secondary"
                        >
                            Annulla
                        </button>
                        <CRUDButton
                            operation="delete"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg font-medium"
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

            {/* Create/Edit Form Modal */}
            {formModalOpen && (
                <MansioneFormModal
                    isOpen={formModalOpen}
                    onClose={handleFormClose}
                    onSuccess={handleFormSuccess}
                    mansione={editingMansione}
                />
            )}
        </div>
    );
};

export default MansioniPage;
