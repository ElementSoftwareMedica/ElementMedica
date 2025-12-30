/**
 * ListiniPage Component
 * Main page for managing price lists (listini)
 * 
 * Features:
 * - List with filtering
 * - Default listino indicator
 * - Validity dates display
 * - Quick actions
 * 
 * @module pages/poliambulatorio/catalogo/ListiniPage
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Search,
    Euro,
    Edit,
    Trash2,
    ChevronRight,
    AlertCircle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Download,
    Upload,
    Calendar,
    Star,
    FileText,
    Settings
} from 'lucide-react';
import {
    listiniApi,
    Listino,
    PaginatedResponse
} from '../../../services/clinicaApi';
import { formatDate } from '../../../utils/dateUtils';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useToast } from '../../../hooks/useToast';
import '../../../styles/clinica-theme.css';

// =====================================================
// TYPES
// =====================================================

interface FilterState {
    search: string;
    status: 'all' | 'active' | 'inactive';
}

// =====================================================
// HELPER COMPONENTS
// =====================================================

const StatusIndicator: React.FC<{ isActive: boolean }> = ({ isActive }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isActive
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
        }`}>
        {isActive ? (
            <>
                <CheckCircle className="w-3 h-3" />
                Attivo
            </>
        ) : (
            <>
                <XCircle className="w-3 h-3" />
                Disattivo
            </>
        )}
    </span>
);

const DefaultBadge: React.FC = () => (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
        <Star className="w-3 h-3" />
        Default
    </span>
);

// =====================================================
// MAIN COMPONENT
// =====================================================

export const ListiniPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        status: 'all',
    });
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Query params
    const queryParams = useMemo(() => {
        const tenantParams = getTenantFilterParams();
        return {
            page,
            limit: 12,
            search: filters.search || undefined,
            isActive: filters.status === 'all' ? undefined : filters.status === 'active',
            ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
            ...(tenantParams.allTenants && { allTenants: 'true' })
        };
    }, [page, filters, getTenantFilterParams]);

    // Queries
    const {
        data: response,
        isLoading,
        isError,
        refetch
    } = useQuery({
        queryKey: ['listini', queryParams, tenantFilterKey],
        queryFn: () => listiniApi.getAll(queryParams),
        enabled: isReady
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: (id: string) => listiniApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listini'] });
        },
    });

    // Extract data
    const listini = response?.data || [];
    const pagination = response?.pagination;

    // Handlers
    const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, search: e.target.value }));
        setPage(1);
    }, []);

    const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    }, []);

    const handleDelete = useCallback((id: string) => {
        if (window.confirm('Sei sicuro di voler eliminare questo listino?')) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation]);

    // Export listini to CSV
    const handleExport = useCallback(async () => {
        try {
            setIsExporting(true);
            const response = await listiniApi.getAll({ limit: 1000 }); // Get all
            const allListini = response?.data || [];

            if (allListini.length === 0) {
                showToast({ type: 'warning', message: 'Nessun listino da esportare' });
                return;
            }

            // Create CSV content
            const headers = ['ID', 'Nome', 'Codice', 'Prezzo', 'Attivo', 'Valido Da', 'Valido A', 'Note'];
            const csvContent = [
                headers.join(';'),
                ...allListini.map(l => [
                    l.id,
                    `"${(l.nome || '').replace(/"/g, '""')}"`,
                    l.codice || '',
                    l.prezzo?.toString() || '0',
                    l.attivo ? 'SI' : 'NO',
                    l.validoDa || '',
                    l.validoA || '',
                    `"${(l.descrizione || '').replace(/"/g, '""')}"`
                ].join(';'))
            ].join('\n');

            // Download
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `listini_export_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Export error:', error);
            showToast({ type: 'error', message: 'Errore durante l\'esportazione' });
        } finally {
            setIsExporting(false);
        }
    }, []);

    // Import listini from CSV
    const handleImport = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.xlsx,.xls';
        input.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            setIsImporting(true);
            try {
                const text = await file.text();
                const lines = text.split('\n').filter(l => l.trim());

                if (lines.length < 2) {
                    showToast({ type: 'warning', message: 'File vuoto o formato non valido' });
                    return;
                }

                // Parse CSV (skip header)
                const imported: number[] = [];
                const errors: string[] = [];

                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(';').map(c => c.replace(/^"|"$/g, '').trim());
                    if (cols.length < 4) continue;

                    const [, nome, codice, prezzo, attivo, validoDa, validoA, note] = cols;

                    try {
                        await listiniApi.create({
                            nome: nome || `Listino Importato ${i}`,
                            codice: codice || undefined,
                            prezzo: parseFloat(prezzo) || 0,
                            attivo: attivo?.toUpperCase() === 'SI',
                            validoDa: validoDa || undefined,
                            validoA: validoA || undefined,
                            descrizione: note || undefined
                        } as any);
                        imported.push(i);
                    } catch (err) {
                        errors.push(`Riga ${i + 1}: ${err instanceof Error ? err.message : 'Errore'}`);
                    }
                }

                queryClient.invalidateQueries({ queryKey: ['listini'] });

                let message = `Importati ${imported.length} listini.`;
                if (errors.length > 0) {
                    message += `\n\nErrori (${errors.length}):\n${errors.slice(0, 5).join('\n')}`;
                    if (errors.length > 5) message += `\n...e altri ${errors.length - 5}`;
                }
                showToast({ type: errors.length > 0 ? 'warning' : 'success', message });
            } catch (error) {
                console.error('Import error:', error);
                showToast({ type: 'error', message: 'Errore durante l\'importazione del file' });
            } finally {
                setIsImporting(false);
            }
        };
        input.click();
    }, [queryClient]);

    // Render
    return (
        <div className="p-6 space-y-6" data-brand="element-medica">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Listini Prezzi
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Gestione listini e tariffe per le prestazioni
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        disabled={isExporting || listini.length === 0}
                        className="p-2 text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                        title="Esporta CSV"
                    >
                        {isExporting ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Download className="w-5 h-5" />
                        )}
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={isImporting}
                        className="p-2 text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                        title="Importa CSV"
                    >
                        {isImporting ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Upload className="w-5 h-5" />
                        )}
                    </button>
                    <button
                        onClick={() => refetch()}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Aggiorna"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <Link
                        to="/poliambulatorio/catalogo/listini/nuovo"
                        className="clinica-button-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nuovo Listino
                    </Link>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={handleSearch}
                            placeholder="Cerca per nome o codice..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                    >
                        <option value="all">Tutti gli stati</option>
                        <option value="active">Solo attivi</option>
                        <option value="inactive">Solo disattivi</option>
                    </select>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-teal-500" />
                </div>
            ) : isError ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Errore nel caricamento</h3>
                    <p className="text-red-600 dark:text-red-300 mt-1">Non è stato possibile caricare i listini</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
                    >
                        Riprova
                    </button>
                </div>
            ) : listini.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Euro className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nessun listino</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {filters.search || filters.status !== 'all'
                            ? 'Nessun listino corrisponde ai filtri selezionati'
                            : 'Inizia creando il tuo primo listino prezzi'}
                    </p>
                    {!filters.search && filters.status === 'all' && (
                        <Link
                            to="/poliambulatorio/catalogo/listini/nuovo"
                            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
                        >
                            <Plus className="w-4 h-4" />
                            Nuovo Listino
                        </Link>
                    )}
                </div>
            ) : (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listini.map((listino) => (
                        <div
                            key={listino.id}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                        <Euro className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            {listino.nome || `Listino #${listino.id.slice(-4)}`}
                                        </h3>
                                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                                            €{Number(listino.prezzo || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                {listino.attivo && <DefaultBadge />}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {formatDate(listino.validoDa, 'short')}
                                    {listino.validoA && ` - ${formatDate(listino.validoA, 'short')}`}
                                </span>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                                <StatusIndicator isActive={listino.attivo} />
                                <div className="flex items-center gap-2">
                                    <Link
                                        to={`/poliambulatorio/catalogo/listini/${listino.id}/prezzi`}
                                        className="p-2 text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                        title="Gestisci prezzi"
                                    >
                                        <FileText className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        to={`/poliambulatorio/catalogo/listini/${listino.id}/modifica`}
                                        className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                        title="Modifica"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(listino.id)}
                                        disabled={(listino as any).isDefault}
                                        className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={(listino as any).isDefault ? 'Non puoi eliminare il listino default' : 'Elimina'}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Mostrando {((page - 1) * 12) + 1}-{Math.min(page * 12, pagination.total)} di {pagination.total}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Precedente
                        </button>
                        <span className="px-3 py-1 text-gray-600 dark:text-gray-400">
                            Pagina {page} di {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                            disabled={page === pagination.totalPages}
                            className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Successiva
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListiniPage;
