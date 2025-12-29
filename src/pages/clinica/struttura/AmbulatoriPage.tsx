/**
 * AmbulatoriPage
 * 
 * Pagina di gestione ambulatori con filtro per poliambulatorio.
 * Supporta CRUD completo e visualizzazione orari.
 * 
 * @module pages/poliambulatorio/struttura/AmbulatoriPage
 */

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Stethoscope,
    Building2,
    DoorOpen,
    Users,
    Plus,
    Edit,
    Trash2,
    Eye,
    CheckCircle,
    XCircle,
    Filter
} from 'lucide-react';
import { ambulatoriApi, poliambulatoriApi } from '../../../services/clinicaApi';
import type { Ambulatorio, Poliambulatorio } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useViewMode } from '../../../hooks/useViewMode';
import { ViewModeToggle } from '../../../components/clinica/ViewModeToggle';
import { ActionMenu, createCrudActions } from '../../../components/clinica/ActionMenu';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

const AmbulatoriPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

    // View mode with localStorage persistence
    const { viewMode, setViewMode } = useViewMode({ storageKey: 'ambulatori' });

    const selectedPoliambulatorioId = searchParams.get('poliambulatorio') || '';

    // Load poliambulatori for filter
    const { data: poliambulatoriData } = useQuery({
        queryKey: ['poliambulatori-list', tenantFilterKey],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            return poliambulatoriApi.getAll({
                limit: 100,
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isReady
    });

    // Query ambulatori
    const { data, isLoading, error } = useQuery({
        queryKey: ['ambulatori', {
            page: currentPage,
            limit: pageSize,
            search: searchTerm,
            poliambulatorioId: selectedPoliambulatorioId,
            stato: filterActive,
            tenantFilter: tenantFilterKey
        }],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            const params: Record<string, unknown> = {
                page: currentPage,
                limit: pageSize,
                search: searchTerm,
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            };
            if (filterActive !== 'all') {
                params.stato = filterActive === 'active' ? 'ATTIVO' : 'INATTIVO';
            }

            // Se c'è un filtro per poliambulatorio, usa l'endpoint dedicato
            // che ritorna un array, poi wrappalo in formato paginato
            if (selectedPoliambulatorioId) {
                const ambulatoriArray = await ambulatoriApi.getByPoliambulatorio(selectedPoliambulatorioId);
                // Filter client-side for search and active status
                let filtered = ambulatoriArray;
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    filtered = filtered.filter(amb =>
                        amb.nome.toLowerCase().includes(searchLower) ||
                        amb.codice.toLowerCase().includes(searchLower) ||
                        (amb.specializzazione?.toLowerCase().includes(searchLower))
                    );
                }
                if (filterActive !== 'all') {
                    filtered = filtered.filter(amb => amb.stato === (filterActive === 'active' ? 'ATTIVO' : 'INATTIVO'));
                }
                // Paginate client-side
                const startIndex = (currentPage - 1) * pageSize;
                const paginatedData = filtered.slice(startIndex, startIndex + pageSize);
                return {
                    data: paginatedData,
                    pagination: {
                        page: currentPage,
                        limit: pageSize,
                        total: filtered.length,
                        totalPages: Math.ceil(filtered.length / pageSize)
                    }
                };
            }

            return ambulatoriApi.getAll(params);
        },
        enabled: isReady
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: (id: string) => ambulatoriApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ambulatori'] });
            showToast({ type: 'success', message: 'Ambulatorio eliminato con successo' });
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione' });
        }
    });

    // Handlers
    const handleCreate = useCallback(() => {
        const url = selectedPoliambulatorioId
            ? `/poliambulatorio/ambulatori/nuovo?poliambulatorio=${selectedPoliambulatorioId}`
            : '/poliambulatorio/ambulatori/nuovo';
        navigate(url);
    }, [navigate, selectedPoliambulatorioId]);

    const handleEdit = useCallback((id: string) => {
        navigate(`/poliambulatorio/ambulatori/${id}/modifica`);
    }, [navigate]);

    const handleView = useCallback((id: string) => {
        navigate(`/poliambulatorio/ambulatori/${id}`);
    }, [navigate]);

    const handleDelete = useCallback((id: string) => {
        if (confirm('Sei sicuro di voler eliminare questo ambulatorio?')) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation]);

    const handlePoliambulatorioFilter = (value: string) => {
        if (value) {
            setSearchParams({ poliambulatorio: value });
        } else {
            setSearchParams({});
        }
        setCurrentPage(1);
    };

    const toggleSelectAll = useCallback(() => {
        const items = data?.data || [];
        if (selectedItems.size === items.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(items.map((item: Ambulatorio) => item.id)));
        }
    }, [data?.data, selectedItems.size]);

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

    const poliambulatori = poliambulatoriData?.data || [];
    const ambulatori = data?.data || [];
    const totalItems = data?.pagination?.total || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Get specializzazione badge color
    const getSpecBadgeClass = (spec?: string): string => {
        const specMap: Record<string, string> = {
            'CARDIOLOGIA': 'bg-red-100 text-red-700',
            'ORTOPEDIA': 'bg-blue-100 text-blue-700',
            'DERMATOLOGIA': 'bg-yellow-100 text-yellow-700',
            'PEDIATRIA': 'bg-pink-100 text-pink-700',
            'GINECOLOGIA': 'bg-purple-100 text-purple-700',
            'OCULISTICA': 'bg-emerald-100 text-emerald-700',
            'NEUROLOGIA': 'bg-indigo-100 text-indigo-700'
        };
        return specMap[spec || ''] || 'bg-gray-100 text-gray-700';
    };

    if (error) {
        return (
            <div className="p-6 clinica-theme">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-700">Errore nel caricamento degli ambulatori</p>
                    <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['ambulatori'] })}
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
                    <h1 className="text-2xl font-bold text-gray-900">Ambulatori</h1>
                    <p className="text-gray-500 mt-1">Gestione degli ambulatori e delle sale visite</p>
                </div>
                <div className="flex items-center gap-3">
                    <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                    <button onClick={handleCreate} className="btn-clinica-primary inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nuovo Ambulatorio
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Cerca per nome, codice, specializzazione..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-clinica w-full"
                        />
                    </div>

                    {/* Poliambulatorio Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <select
                            value={selectedPoliambulatorioId}
                            onChange={(e) => handlePoliambulatorioFilter(e.target.value)}
                            className="select-clinica"
                        >
                            <option value="">Tutti i poliambulatori</option>
                            {poliambulatori.map((p: Poliambulatorio) => (
                                <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <select
                            value={filterActive}
                            onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
                            className="select-clinica"
                        >
                            <option value="all">Tutti gli stati</option>
                            <option value="active">Solo attivi</option>
                            <option value="inactive">Solo inattivi</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent mx-auto"></div>
                    <p className="text-gray-500 mt-2">Caricamento...</p>
                </div>
            ) : ambulatori.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <DoorOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">Nessun ambulatorio trovato</p>
                    <button onClick={handleCreate} className="btn-clinica-primary mt-4">
                        Crea il primo ambulatorio
                    </button>
                </div>
            ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ambulatori.map((amb: Ambulatorio) => (
                        <div
                            key={amb.id}
                            className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer ${selectedItems.has(amb.id) ? 'ring-2 ring-teal-500' : ''
                                }`}
                            onClick={() => handleView(amb.id)}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.has(amb.id)}
                                        onChange={() => toggleSelectItem(amb.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <div className="p-2 rounded-lg bg-teal-50">
                                        <Stethoscope className="h-5 w-5 text-teal-600" />
                                    </div>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${amb.stato === 'ATTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {amb.stato === 'ATTIVO' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                    {amb.stato === 'ATTIVO' ? 'Attivo' : 'Inattivo'}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="space-y-3">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{amb.nome}</h3>
                                    <p className="text-sm text-gray-500">{amb.codice}</p>
                                </div>

                                {amb.specializzazione && (
                                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getSpecBadgeClass(amb.specializzazione)}`}>
                                        {amb.specializzazione}
                                    </span>
                                )}

                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                    {amb.stanza && (
                                        <div className="flex items-center gap-1.5">
                                            <DoorOpen className="h-4 w-4 text-gray-400" />
                                            <span>Stanza {amb.stanza}</span>
                                        </div>
                                    )}
                                    {amb.capienzaMax && (
                                        <div className="flex items-center gap-1.5">
                                            <Users className="h-4 w-4 text-gray-400" />
                                            <span>Max {amb.capienzaMax}</span>
                                        </div>
                                    )}
                                </div>

                                {amb.poliambulatorio && (
                                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                        <Building2 className="h-4 w-4 text-gray-400" />
                                        <span>{amb.poliambulatorio.nome}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="mt-4 pt-4 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                                <ActionMenu
                                    actions={createCrudActions(
                                        () => handleView(amb.id),
                                        () => handleEdit(amb.id),
                                        () => handleDelete(amb.id)
                                    )}
                                    size="sm"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List View */
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="table-clinica">
                        <thead>
                            <tr>
                                <th className="w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.size === ambulatori.length && ambulatori.length > 0}
                                        onChange={toggleSelectAll}
                                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    />
                                </th>
                                <th>Nome</th>
                                <th>Specializzazione</th>
                                <th>Poliambulatorio</th>
                                <th>Stato</th>
                                <th className="w-24">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ambulatori.map((amb: Ambulatorio) => (
                                <tr
                                    key={amb.id}
                                    className={`${selectedItems.has(amb.id) ? 'bg-teal-50' : ''} hover:bg-gray-50 cursor-pointer transition-colors`}
                                    onClick={() => handleView(amb.id)}
                                >
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.has(amb.id)}
                                            onChange={() => toggleSelectItem(amb.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        />
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-teal-50">
                                                <Stethoscope className="h-5 w-5 text-teal-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{amb.nome}</p>
                                                <p className="text-sm text-gray-500">{amb.codice}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {amb.specializzazione ? (
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getSpecBadgeClass(amb.specializzazione)}`}>
                                                {amb.specializzazione}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-sm">-</span>
                                        )}
                                    </td>
                                    <td>
                                        {amb.poliambulatorio ? (
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <Building2 className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm">{amb.poliambulatorio.nome}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm">-</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${amb.stato === 'ATTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {amb.stato === 'ATTIVO' ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                            {amb.stato === 'ATTIVO' ? 'Attivo' : 'Inattivo'}
                                        </span>
                                    </td>
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <ActionMenu
                                            actions={createCrudActions(
                                                () => handleView(amb.id),
                                                () => handleEdit(amb.id),
                                                () => handleDelete(amb.id)
                                            )}
                                            size="sm"
                                        />
                                    </td>
                                </tr>
                            ))}
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
                    <button className="text-sm text-red-400 hover:text-red-300">
                        Elimina selezionati
                    </button>
                </div>
            )}
        </div>
    );
};

export default AmbulatoriPage;
