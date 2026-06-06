/**
 * PoliambulatoriPage
 * 
 * Pagina di gestione poliambulatori con GDPR template.
 * Supporta CRUD completo, filtri, export e audit trail.
 * 
 * @module pages/poliambulatorio/struttura/PoliambulatoriPage
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    Plus,
    Edit,
    Trash2,
    Eye,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import { poliambulatoriApi } from '../../../services/clinicaApi';
import type { Poliambulatorio } from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { CRUDButton } from '../../../components/shared/CRUDButton';
import { ActionButton } from '../../../components/ui';
import ElegantSelect from '../../../components/ui/ElegantSelect';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// Types
interface Column {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (value: unknown, item: Poliambulatorio) => React.ReactNode;
}

const PoliambulatoriPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { confirmDelete } = useConfirmDialog();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [sortBy, setSortBy] = useState<string>('nome');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

    // TenantFilter per refresh automatico quando cambiano i tenant selezionati
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    // Query - include tenantFilterKey per refresh automatico quando cambiano i tenant
    const { data, isLoading, error } = useQuery({
        queryKey: ['poliambulatori', tenantFilterKey, { page: currentPage, limit: pageSize, search: searchTerm, sortBy, sortOrder, stato: filterActive }],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            return poliambulatoriApi.getAll({
                page: currentPage,
                limit: pageSize,
                search: searchTerm,
                sortBy,
                sortOrder,
                ...(filterActive !== 'all' && { stato: filterActive === 'active' ? 'ATTIVO' : 'INATTIVO' }),
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isReady, // Aspetta che TenantFilter sia pronto
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: (id: string) => poliambulatoriApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['poliambulatori'] });
            showToast({ type: 'success', message: 'Poliambulatorio eliminato con successo' });
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione' });
        }
    });

    // Handlers
    const handleCreate = useCallback(() => {
        navigate('/poliambulatorio/poliambulatori/nuovo');
    }, [navigate]);

    const handleEdit = useCallback((id: string) => {
        navigate(`/poliambulatorio/poliambulatori/${id}/modifica`);
    }, [navigate]);

    const handleView = useCallback((id: string) => {
        navigate(`/poliambulatorio/poliambulatori/${id}`);
    }, [navigate]);

    const handleDelete = useCallback(async (id: string) => {
        if (await confirmDelete('questo poliambulatorio')) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation, confirmDelete]);

    const handleSort = useCallback((key: string) => {
        if (sortBy === key) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder('asc');
        }
    }, [sortBy]);

    const toggleSelectAll = useCallback(() => {
        const items = data?.data || [];
        if (selectedItems.size === items.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(items.map((item: Poliambulatorio) => item.id)));
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

    // Columns configuration
    const columns: Column[] = [
        {
            key: 'nome',
            label: 'Nome',
            sortable: true,
            render: (_, item) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-50">
                        <Building2 className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">{item.nome}</p>
                        <p className="text-sm text-gray-500">{item.codice}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'indirizzo',
            label: 'Indirizzo',
            render: (_, item) => item.indirizzo ? (
                <div className="flex items-center gap-1.5 text-gray-600">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                        {item.indirizzo}{item.citta && `, ${item.citta}`}{item.provincia && ` (${item.provincia})`}
                    </span>
                </div>
            ) : (
                <span className="text-gray-400 text-sm">-</span>
            )
        },
        {
            key: 'telefono',
            label: 'Contatti',
            render: (_, item) => (
                <div className="space-y-1">
                    {item.telefono && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm">{item.telefono}</span>
                        </div>
                    )}
                    {item.email && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm">{item.email}</span>
                        </div>
                    )}
                    {!item.telefono && !item.email && (
                        <span className="text-gray-400 text-sm">-</span>
                    )}
                </div>
            )
        },
        {
            key: 'stato',
            label: 'Stato',
            sortable: true,
            render: (value) => {
                const isActive = value === 'ATTIVO';
                const isSuspended = value === 'SOSPESO';
                return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' :
                        isSuspended ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                        {isActive ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {isActive ? 'Attivo' : isSuspended ? 'Sospeso' : 'Inattivo'}
                    </span>
                );
            }
        }
    ];

    const poliambulatori = data?.data || [];
    const totalItems = data?.pagination?.total || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    if (error) {
        return (
            <div className="p-6 clinica-theme">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-700">Errore nel caricamento dei poliambulatori</p>
                    <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['poliambulatori'] })}
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
                    <h1 className="text-2xl font-bold text-gray-900">Poliambulatori</h1>
                    <p className="text-gray-500 mt-1">Gestione delle strutture sanitarie</p>
                </div>
                <CRUDButton
                    operation="create"
                    onClick={handleCreate}
                    className="btn-clinica-primary inline-flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Nuovo Poliambulatorio
                </CRUDButton>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Cerca per nome, codice, città..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-clinica w-full"
                        />
                    </div>
                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <ElegantSelect
                            value={filterActive}
                            onChange={(value) => setFilterActive(value as 'all' | 'active' | 'inactive')}
                            className="min-w-[180px]"
                            options={[
                                { value: 'all', label: 'Tutti gli stati' },
                                { value: 'active', label: 'Solo attivi' },
                                { value: 'inactive', label: 'Solo inattivi' },
                            ]}
                        />
                    </div>
                    {/* Nota: Il filtro tenant è ora gestito dal TenantModeSelector nel header */}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent mx-auto"></div>
                        <p className="text-gray-500 mt-2">Caricamento...</p>
                    </div>
                ) : poliambulatori.length === 0 ? (
                    <div className="p-8 text-center">
                        <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">Nessun poliambulatorio trovato</p>
                        <CRUDButton operation="create" onClick={handleCreate} className="btn-clinica-primary mt-4">
                            Crea il primo poliambulatorio
                        </CRUDButton>
                    </div>
                ) : (
                    <table className="table-clinica">
                        <thead>
                            <tr>
                                <th className="w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.size === poliambulatori.length && poliambulatori.length > 0}
                                        onChange={toggleSelectAll}
                                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    />
                                </th>
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        onClick={() => col.sortable && handleSort(col.key)}
                                        className={col.sortable ? 'cursor-pointer hover:bg-teal-100' : ''}
                                    >
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            {col.sortable && sortBy === col.key && (
                                                <span className="text-teal-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                                <th className="w-24">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {poliambulatori.map((item: Poliambulatorio) => (
                                <tr
                                    key={item.id}
                                    onClick={() => handleView(item.id)}
                                    className={`cursor-pointer transition-colors hover:bg-teal-50/60 ${selectedItems.has(item.id) ? 'bg-teal-50' : ''}`}
                                >
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.has(item.id)}
                                            onChange={() => toggleSelectItem(item.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        />
                                    </td>
                                    {columns.map((col) => (
                                        <td key={col.key}>
                                            {col.render
                                                ? col.render(item[col.key as keyof Poliambulatorio], item)
                                                : String(item[col.key as keyof Poliambulatorio] || '-')
                                            }
                                        </td>
                                    ))}
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <ActionButton
                                            theme="teal"
                                            actions={[
                                                {
                                                    label: 'Visualizza',
                                                    icon: <Eye className="h-4 w-4" />,
                                                    onClick: () => handleView(item.id)
                                                },
                                                {
                                                    label: 'Modifica',
                                                    icon: <Edit className="h-4 w-4" />,
                                                    onClick: () => handleEdit(item.id)
                                                },
                                                {
                                                    label: 'Elimina',
                                                    icon: <Trash2 className="h-4 w-4" />,
                                                    variant: 'danger',
                                                    onClick: () => handleDelete(item.id)
                                                }
                                            ]}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
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
                )}
            </div>
        </div>
    );
};

export default PoliambulatoriPage;
