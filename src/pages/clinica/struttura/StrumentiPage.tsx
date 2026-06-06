/**
 * StrumentiPage
 * 
 * Pagina di gestione strumentario medico.
 * Include manutenzioni, scadenze e assegnazioni ambulatori.
 * 
 * @module pages/poliambulatorio/struttura/StrumentiPage
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Wrench,
    Plus,
    Edit,
    Trash2,
    Eye,
    AlertTriangle,
    CheckCircle,
    Clock,
    Settings,
    Calendar,
    MapPin,
    Filter
} from 'lucide-react';
import { strumentiApi, ambulatoriApi } from '../../../services/clinicaApi';
import type { Strumento, Ambulatorio } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { ActionMenu, createCrudActions } from '@/components/ui/ActionMenu';
import { CRUDButton } from '../../../components/shared/CRUDButton';
import ElegantSelect from '../../../components/ui/ElegantSelect';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

type StatoStrumento = 'DISPONIBILE' | 'IN_MANUTENZIONE' | 'IN_RIPARAZIONE' | 'DISMESSO';
type ViewMode = 'grid' | 'list' | 'scadenze';

const StrumentiPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { confirmDelete } = useConfirmDialog();

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [filterStato, setFilterStato] = useState<StatoStrumento | 'all'>('all');
    const [filterAmbulatorio, setFilterAmbulatorio] = useState<string>('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    // Load ambulatori for filter
    const { data: ambulatoriData } = useQuery({
        queryKey: ['ambulatori-list', tenantFilterKey],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            return ambulatoriApi.getAll({
                limit: 100,
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isReady
    });

    // Query strumenti
    const { data, isLoading, error } = useQuery({
        queryKey: ['strumenti', {
            page: currentPage,
            limit: pageSize,
            search: searchTerm,
            stato: filterStato,
            ambulatorioId: filterAmbulatorio,
            tenantFilter: tenantFilterKey
        }],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            return strumentiApi.getAll({
                page: currentPage,
                limit: pageSize,
                search: searchTerm,
                ...(filterStato !== 'all' && { stato: filterStato }),
                ...(filterAmbulatorio && { ambulatorioId: filterAmbulatorio }),
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isReady
    });

    // Query scadenze (for scadenze view)
    const { data: scadenzeData } = useQuery({
        queryKey: ['strumenti-scadenze', { giorni: 30, tenantFilter: tenantFilterKey }],
        queryFn: () => strumentiApi.getScadenzeManutenzioni(30),
        enabled: viewMode === 'scadenze' && isReady
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: (id: string) => strumentiApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strumenti'] });
            showToast({ type: 'success', message: 'Strumento eliminato con successo' });
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione' });
        }
    });

    // Handlers
    const handleCreate = useCallback(() => {
        navigate('/poliambulatorio/strumenti/nuovo');
    }, [navigate]);

    const handleEdit = useCallback((id: string) => {
        navigate(`/poliambulatorio/strumenti/${id}/modifica`);
    }, [navigate]);

    const handleView = useCallback((id: string) => {
        navigate(`/poliambulatorio/strumenti/${id}`);
    }, [navigate]);

    const handleDelete = useCallback(async (id: string) => {
        if (await confirmDelete('questo strumento')) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation, confirmDelete]);

    const handleManutenzione = useCallback((id: string) => {
        navigate(`/poliambulatorio/strumenti/${id}/manutenzione`);
    }, [navigate]);

    const toggleSelectItem = useCallback((id: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const ambulatori = ambulatoriData?.data || [];
    const strumenti = data?.data || [];
    const scadenze = scadenzeData || [];
    const totalItems = data?.pagination?.total || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Get stato badge styling
    const getStatoBadge = (stato: StatoStrumento) => {
        const statoMap = {
            'DISPONIBILE': { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle, label: 'Disponibile' },
            'IN_MANUTENZIONE': { bg: 'bg-amber-100', text: 'text-amber-700', icon: Settings, label: 'In Manutenzione' },
            'IN_RIPARAZIONE': { bg: 'bg-red-100', text: 'text-red-700', icon: Wrench, label: 'In Riparazione' },
            'DISMESSO': { bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock, label: 'Dismesso' }
        };
        return statoMap[stato] || statoMap['DISPONIBILE'];
    };

    // Check if maintenance is due soon
    const isMaintenanceDueSoon = (dateStr?: string): boolean => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const today = new Date();
        const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 30 && diffDays > 0;
    };

    const isMaintenanceOverdue = (dateStr?: string): boolean => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const today = new Date();
        return date < today;
    };

    if (error) {
        return (
            <div className="p-6 clinica-theme">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-700">Errore nel caricamento degli strumenti</p>
                    <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['strumenti'] })}
                        className="btn-clinica-secondary mt-4"
                    >
                        Riprova
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Strumentario</h1>
                    <p className="text-gray-500 mt-1">Gestione attrezzature e manutenzioni</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-teal-600' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Griglia
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white shadow text-teal-600' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Lista
                        </button>
                        <button
                            onClick={() => setViewMode('scadenze')}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'scadenze' ? 'bg-white shadow text-teal-600' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Scadenze
                        </button>
                    </div>
                    <CRUDButton operation="create" onClick={handleCreate} className="btn-clinica-primary inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nuovo Strumento
                    </CRUDButton>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-0">
                        <input
                            type="text"
                            placeholder="Cerca per nome, codice, modello..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-clinica w-full"
                        />
                    </div>

                    {/* Stato Filter */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <ElegantSelect
                            value={filterStato}
                            onChange={(value) => setFilterStato(value as StatoStrumento | 'all')}
                            className="min-w-[190px]"
                            options={[
                                { value: 'all', label: 'Tutti gli stati' },
                                { value: 'DISPONIBILE', label: 'Disponibile' },
                                { value: 'IN_MANUTENZIONE', label: 'In manutenzione' },
                                { value: 'IN_RIPARAZIONE', label: 'In riparazione' },
                                { value: 'DISMESSO', label: 'Dismesso' },
                            ]}
                        />
                    </div>

                    {/* Ambulatorio Filter */}
                    <div className="shrink-0">
                        <ElegantSelect
                            value={filterAmbulatorio}
                            onChange={setFilterAmbulatorio}
                            className="min-w-[220px]"
                            placeholder="Tutti gli ambulatori"
                            options={[
                                { value: '', label: 'Tutti gli ambulatori' },
                                ...ambulatori.map((amb: Ambulatorio) => ({ value: amb.id, label: amb.nome }))
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Content based on view mode */}
            {viewMode === 'scadenze' ? (
                // Scadenze View
                <div className="space-y-4">
                    {/* Overdue */}
                    {scadenze.filter((s: Strumento) => isMaintenanceOverdue(s.prossimaManutenzione)).length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-3">
                                <AlertTriangle className="h-5 w-5" />
                                Manutenzioni Scadute
                            </h3>
                            <div className="space-y-2">
                                {scadenze
                                    .filter((s: Strumento) => isMaintenanceOverdue(s.prossimaManutenzione))
                                    .map((s: Strumento) => (
                                        <div key={s.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{s.nome}</p>
                                                <p className="text-sm text-gray-500">{s.codice}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-red-600 font-medium">
                                                    Scaduta il {new Date(s.prossimaManutenzione!).toLocaleDateString('it-IT')}
                                                </span>
                                                <button
                                                    onClick={() => handleManutenzione(s.id)}
                                                    className="btn-clinica-primary btn-sm"
                                                >
                                                    Schedula
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Due Soon */}
                    {scadenze.filter((s: Strumento) => isMaintenanceDueSoon(s.prossimaManutenzione)).length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <h3 className="font-semibold text-amber-700 flex items-center gap-2 mb-3">
                                <Clock className="h-5 w-5" />
                                In Scadenza (prossimi 30 giorni)
                            </h3>
                            <div className="space-y-2">
                                {scadenze
                                    .filter((s: Strumento) => isMaintenanceDueSoon(s.prossimaManutenzione))
                                    .map((s: Strumento) => (
                                        <div key={s.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{s.nome}</p>
                                                <p className="text-sm text-gray-500">{s.codice}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-amber-600 font-medium">
                                                    Scade il {new Date(s.prossimaManutenzione!).toLocaleDateString('it-IT')}
                                                </span>
                                                <button
                                                    onClick={() => handleManutenzione(s.id)}
                                                    className="btn-clinica-secondary btn-sm"
                                                >
                                                    Schedula
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {scadenze.length === 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                            <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
                            <p className="text-emerald-700 font-medium">Nessuna manutenzione in scadenza!</p>
                            <p className="text-emerald-600 text-sm mt-1">Tutti gli strumenti sono in regola</p>
                        </div>
                    )}
                </div>
            ) : (
                // Grid/List View
                <>
                    {isLoading ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent mx-auto"></div>
                            <p className="text-gray-500 mt-2">Caricamento...</p>
                        </div>
                    ) : strumenti.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                            <Wrench className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">Nessuno strumento trovato</p>
                            <CRUDButton operation="create" onClick={handleCreate} className="btn-clinica-primary mt-4">
                                Aggiungi il primo strumento
                            </CRUDButton>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {strumenti.map((strumento: Strumento) => {
                                const statoBadge = getStatoBadge(strumento.stato as StatoStrumento);
                                const StatoIcon = statoBadge.icon;
                                const isDueSoon = isMaintenanceDueSoon(strumento.prossimaManutenzione);
                                const isOverdue = isMaintenanceOverdue(strumento.prossimaManutenzione);

                                return (
                                    <div
                                        key={strumento.id}
                                        className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer ${selectedItems.has(strumento.id) ? 'ring-2 ring-teal-500' : ''
                                            } ${isOverdue ? 'border-red-300' : isDueSoon ? 'border-amber-300' : ''}`}
                                        onClick={() => handleView(strumento.id)}
                                    >
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.has(strumento.id)}
                                                    onChange={() => toggleSelectItem(strumento.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                />
                                                <div className="p-2 rounded-lg bg-teal-50">
                                                    <Wrench className="h-5 w-5 text-teal-600" />
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statoBadge.bg} ${statoBadge.text}`}>
                                                <StatoIcon className="h-3 w-3" />
                                                {statoBadge.label}
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div className="space-y-3">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{strumento.nome}</h3>
                                                <p className="text-sm text-gray-500">{strumento.codice}</p>
                                            </div>

                                            {strumento.modello && (
                                                <p className="text-sm text-gray-600">Modello: {strumento.modello}</p>
                                            )}

                                            {strumento.prossimaManutenzione && (
                                                <div className={`flex items-center gap-1.5 text-sm ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-gray-600'
                                                    }`}>
                                                    <Calendar className="h-4 w-4" />
                                                    <span>
                                                        Manutenzione: {new Date(strumento.prossimaManutenzione).toLocaleDateString('it-IT')}
                                                    </span>
                                                    {(isOverdue || isDueSoon) && (
                                                        <AlertTriangle className="h-4 w-4 ml-1" />
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleManutenzione(strumento.id)}
                                                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                                            >
                                                + Manutenzione
                                            </button>
                                            <ActionMenu
                                                actions={createCrudActions(
                                                    () => handleView(strumento.id),
                                                    () => handleEdit(strumento.id),
                                                    () => handleDelete(strumento.id)
                                                )}
                                                size="sm"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // List View
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <table className="table-clinica">
                                <thead>
                                    <tr>
                                        <th className="w-12"></th>
                                        <th>Nome</th>
                                        <th>Codice</th>
                                        <th>Modello</th>
                                        <th>Stato</th>
                                        <th>Prossima Manutenzione</th>
                                        <th className="w-24">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {strumenti.map((strumento: Strumento) => {
                                        const statoBadge = getStatoBadge(strumento.stato as StatoStrumento);
                                        const StatoIcon = statoBadge.icon;
                                        const isDueSoon = isMaintenanceDueSoon(strumento.prossimaManutenzione);
                                        const isOverdue = isMaintenanceOverdue(strumento.prossimaManutenzione);

                                        return (
                                            <tr
                                                key={strumento.id}
                                                className={`${selectedItems.has(strumento.id) ? 'bg-teal-50' : ''} hover:bg-gray-50 cursor-pointer transition-colors`}
                                                onClick={() => handleView(strumento.id)}
                                            >
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems.has(strumento.id)}
                                                        onChange={() => toggleSelectItem(strumento.id)}
                                                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                    />
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <Wrench className="h-4 w-4 text-gray-400" />
                                                        <span className="font-medium">{strumento.nome}</span>
                                                    </div>
                                                </td>
                                                <td className="text-gray-500">{strumento.codice}</td>
                                                <td className="text-gray-500">{strumento.modello || '-'}</td>
                                                <td>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statoBadge.bg} ${statoBadge.text}`}>
                                                        <StatoIcon className="h-3 w-3" />
                                                        {statoBadge.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    {strumento.prossimaManutenzione ? (
                                                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-gray-600'
                                                            }`}>
                                                            {new Date(strumento.prossimaManutenzione).toLocaleDateString('it-IT')}
                                                            {(isOverdue || isDueSoon) && <AlertTriangle className="h-4 w-4" />}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    <ActionMenu
                                                        actions={createCrudActions(
                                                            () => handleView(strumento.id),
                                                            () => handleEdit(strumento.id),
                                                            () => handleDelete(strumento.id)
                                                        )}
                                                        size="sm"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-500">
                                    Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalItems)} di {totalItems}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-50"
                                    >
                                        Precedente
                                    </button>
                                    <span className="text-sm text-gray-600">
                                        Pagina {currentPage} di {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-50"
                                    >
                                        Successiva
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Bulk Actions */}
            {selectedItems.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white rounded-xl px-6 py-3 shadow-xl flex items-center gap-4">
                    <span className="text-sm">{selectedItems.size} selezionati</span>
                    <button
                        onClick={() => setSelectedItems(new Set())}
                        className="text-sm text-gray-300 hover:text-white"
                    >
                        Deseleziona
                    </button>
                    <button className="text-sm text-amber-400 hover:text-amber-300">
                        Schedula manutenzione
                    </button>
                    <button className="text-sm text-red-400 hover:text-red-300">
                        Elimina selezionati
                    </button>
                </div>
            )}
        </div>
    );
};

export default StrumentiPage;
