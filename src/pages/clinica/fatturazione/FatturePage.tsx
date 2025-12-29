/**
 * FatturePage - Lista e gestione fatture sanitarie
 * 
 * Tabella fatture con filtri, azioni rapide, pagamenti.
 * 
 * @module pages/poliambulatorio/fatturazione/FatturePage
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
    Receipt,
    Search,
    Filter,
    Plus,
    Eye,
    CreditCard,
    XCircle,
    Download,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    Calendar,
    User,
    Euro,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import {
    fattureApi,
    FatturaSanitaria,
    StatoFattura,
    MetodoPagamento
} from '../../../services/clinicaApi';
import { formatDate } from '../../../utils/dateUtils';
import { useTenantFilter } from '../../../context/TenantFilterContext';

// ============================================
// TYPES
// ============================================

interface PaymentModalProps {
    fattura: FatturaSanitaria;
    onClose: () => void;
    onConfirm: (metodoPagamento: MetodoPagamento) => void;
    isLoading: boolean;
}

// ============================================
// COMPONENTS
// ============================================

/**
 * Status Badge
 */
const StatusBadge: React.FC<{ stato: StatoFattura }> = ({ stato }) => {
    const config: Record<StatoFattura, { bg: string; text: string; label: string }> = {
        emessa: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Emessa' },
        pagata: { bg: 'bg-green-100', text: 'text-green-700', label: 'Pagata' },
        annullata: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annullata' },
        parzialmente_pagata: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Parziale' }
    };

    const cfg = config[stato];

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
        </span>
    );
};

/**
 * Payment Method Badge
 */
const PaymentMethodBadge: React.FC<{ metodo?: MetodoPagamento }> = ({ metodo }) => {
    if (!metodo) return <span className="text-gray-400">-</span>;

    const labels: Record<MetodoPagamento, string> = {
        cash: 'Contanti',
        card: 'Carta',
        transfer: 'Bonifico',
        pos: 'POS',
        check: 'Assegno'
    };

    return (
        <span className="text-sm text-gray-600">
            {labels[metodo]}
        </span>
    );
};

/**
 * Payment Modal
 */
const PaymentModal: React.FC<PaymentModalProps> = ({
    fattura,
    onClose,
    onConfirm,
    isLoading
}) => {
    const [selectedMethod, setSelectedMethod] = useState<MetodoPagamento>('cash');

    const methods: { value: MetodoPagamento; label: string; icon: React.ReactNode }[] = [
        { value: 'cash', label: 'Contanti', icon: <Euro className="h-5 w-5" /> },
        { value: 'card', label: 'Carta', icon: <CreditCard className="h-5 w-5" /> },
        { value: 'pos', label: 'POS', icon: <CreditCard className="h-5 w-5" /> },
        { value: 'transfer', label: 'Bonifico', icon: <Receipt className="h-5 w-5" /> },
        { value: 'check', label: 'Assegno', icon: <Receipt className="h-5 w-5" /> }
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Registra Pagamento</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Fattura {fattura.numero} - €{Number(fattura.totale).toFixed(2)}
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Metodo di Pagamento
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {methods.map((method) => (
                                <button
                                    key={method.value}
                                    onClick={() => setSelectedMethod(method.value)}
                                    className={`
                    flex items-center gap-2 p-3 rounded-lg border transition-all
                    ${selectedMethod === method.value
                                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                        }
                  `}
                                >
                                    {method.icon}
                                    <span className="font-medium">{method.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Paziente:</span>
                            <span className="font-medium">
                                {fattura.paziente?.cognome} {fattura.paziente?.nome}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                            <span className="text-gray-600">Importo:</span>
                            <span className="font-bold text-lg text-teal-600">
                                €{Number(fattura.totale).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={() => onConfirm(selectedMethod)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                Elaborazione...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                Conferma Pagamento
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Action Dropdown
 */
const ActionDropdown: React.FC<{
    fattura: FatturaSanitaria;
    onPayment: () => void;
    onCancel: () => void;
}> = ({ fattura, onPayment, onCancel }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <MoreVertical className="h-4 w-4 text-gray-500" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        <Link
                            to={`/poliambulatorio/fatturazione/${fattura.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            <Eye className="h-4 w-4" />
                            Visualizza
                        </Link>

                        {fattura.stato === 'emessa' && (
                            <>
                                <button
                                    onClick={() => { setIsOpen(false); onPayment(); }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                                >
                                    <CreditCard className="h-4 w-4" />
                                    Registra Pagamento
                                </button>
                                <button
                                    onClick={() => { setIsOpen(false); onCancel(); }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                                >
                                    <XCircle className="h-4 w-4" />
                                    Annulla Fattura
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                        >
                            <Download className="h-4 w-4" />
                            Scarica PDF
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const FatturePage: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [search, setSearch] = useState('');
    const [selectedFattura, setSelectedFattura] = useState<FatturaSanitaria | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Filters from URL
    const filters = useMemo(() => ({
        page: parseInt(searchParams.get('page') || '1'),
        stato: searchParams.get('stato') as StatoFattura | undefined,
        dataInizio: searchParams.get('dataInizio') || undefined,
        dataFine: searchParams.get('dataFine') || undefined
    }), [searchParams]);

    // Build query params with tenant filter
    const queryParams = useMemo(() => {
        const tenantParams = getTenantFilterParams();
        return {
            ...filters,
            search: search || undefined,
            limit: 20,
            ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
            ...(tenantParams.allTenants && { allTenants: 'true' })
        };
    }, [filters, search, getTenantFilterParams]);

    // Fetch fatture
    const { data, isLoading, error } = useQuery({
        queryKey: ['fatture', queryParams, tenantFilterKey],
        queryFn: () => fattureApi.getAll(queryParams),
        enabled: isReady
    });

    // Payment mutation
    const paymentMutation = useMutation({
        mutationFn: ({ id, metodoPagamento }: { id: string; metodoPagamento: MetodoPagamento }) =>
            fattureApi.registerPayment(id, { metodoPagamento }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fatture'] });
            setShowPaymentModal(false);
            setSelectedFattura(null);
        }
    });

    // Cancel mutation
    const cancelMutation = useMutation({
        mutationFn: (id: string) => fattureApi.cancel(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fatture'] });
        }
    });

    const fatture = data?.data || [];
    const pagination = data?.pagination;

    const handleFilterChange = (key: string, value: string | null) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        newParams.set('page', '1');
        setSearchParams(newParams);
    };

    const handlePageChange = (newPage: number) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page', String(newPage));
        setSearchParams(newParams);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Fatture Sanitarie</h1>
                    <p className="text-gray-600">Gestione e ricerca fatture</p>
                </div>
                <Link
                    to="/poliambulatorio/fatturazione/nuova"
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nuova Fattura
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cerca per numero, paziente..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                    </div>

                    {/* Status filter */}
                    <select
                        value={filters.stato || ''}
                        onChange={(e) => handleFilterChange('stato', e.target.value || null)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                        <option value="">Tutti gli stati</option>
                        <option value="emessa">Emesse</option>
                        <option value="pagata">Pagate</option>
                        <option value="annullata">Annullate</option>
                    </select>

                    {/* Date filters */}
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <input
                            type="date"
                            value={filters.dataInizio || ''}
                            onChange={(e) => handleFilterChange('dataInizio', e.target.value || null)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={filters.dataFine || ''}
                            onChange={(e) => handleFilterChange('dataFine', e.target.value || null)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">
                        <div className="animate-spin h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-3" />
                        Caricamento fatture...
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-red-500">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        Errore nel caricamento delle fatture
                    </div>
                ) : fatture.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Nessuna fattura trovata</p>
                        <Link
                            to="/poliambulatorio/fatturazione/nuova"
                            className="mt-3 inline-flex items-center gap-2 text-teal-600 hover:text-teal-700"
                        >
                            <Plus className="h-4 w-4" />
                            Crea la prima fattura
                        </Link>
                    </div>
                ) : (
                    <>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Numero</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Paziente</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Data</th>
                                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Importo</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Stato</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Pagamento</th>
                                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {fatture.map((fattura) => (
                                    <tr key={fattura.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <Link
                                                to={`/poliambulatorio/fatturazione/${fattura.id}`}
                                                className="font-medium text-teal-600 hover:text-teal-700"
                                            >
                                                {fattura.numero}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-gray-100 rounded-full">
                                                    <User className="h-4 w-4 text-gray-500" />
                                                </div>
                                                <span className="text-gray-900">
                                                    {fattura.paziente?.cognome} {fattura.paziente?.nome}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {formatDate(fattura.dataEmissione)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            €{Number(fattura.totale).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <StatusBadge stato={fattura.stato} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <PaymentMethodBadge metodo={fattura.metodoPagamento as MetodoPagamento} />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <ActionDropdown
                                                fattura={fattura}
                                                onPayment={() => {
                                                    setSelectedFattura(fattura);
                                                    setShowPaymentModal(true);
                                                }}
                                                onCancel={() => {
                                                    if (confirm('Sei sicuro di voler annullare questa fattura?')) {
                                                        cancelMutation.mutate(fattura.id);
                                                    }
                                                }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    Pagina {pagination.page} di {pagination.totalPages} • {pagination.total} fatture totali
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page <= 1}
                                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page >= pagination.totalPages}
                                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedFattura && (
                <PaymentModal
                    fattura={selectedFattura}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setSelectedFattura(null);
                    }}
                    onConfirm={(metodoPagamento) => {
                        paymentMutation.mutate({
                            id: selectedFattura.id,
                            metodoPagamento
                        });
                    }}
                    isLoading={paymentMutation.isPending}
                />
            )}
        </div>
    );
};

export default FatturePage;
