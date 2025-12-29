/**
 * Referti List Page
 * Lista e gestione referti medici
 * 
 * @module pages/poliambulatorio/clinica/RefertiListPage
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Search, Eye, Calendar,
    User, CheckCircle, AlertCircle, Clock,
    Filter, RefreshCw, Download, Printer
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { apiGet } from '../../../services/api';
import { getDoctorTitle } from '../../../utils/codiceFiscale';

interface Referto {
    id: string;
    dataReferto: string;
    stato: string;
    tipoReferto: string | null;
    diagnosi: string | null;
    visita: {
        id: string;
        dataOra: string;
        paziente: {
            id: string;
            firstName: string;
            lastName: string;
            taxCode: string | null;
        } | null;
        medico: {
            id: string;
            firstName: string;
            lastName: string;
            taxCode?: string | null;
            gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null;
        } | null;
        appuntamento: {
            prestazione: {
                nome: string;
            } | null;
        } | null;
    } | null;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

// Stati referti con colori
const statoConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    'BOZZA': { label: 'Bozza', color: 'bg-gray-100 text-gray-800', icon: Clock },
    'IN_REVISIONE': { label: 'In Revisione', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    'FIRMATO': { label: 'Firmato', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    'CONSEGNATO': { label: 'Consegnato', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    'ANNULLATO': { label: 'Annullato', color: 'bg-red-100 text-red-800', icon: AlertCircle }
};

const RefertiListPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Tenant filter from global context
    const { getTenantFilterParams } = useTenantFilter();

    const [referti, setReferti] = useState<Referto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statoFilter, setStatoFilter] = useState<string>('');
    const [dateFilter, setDateFilter] = useState<string>('');
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0
    });

    // Fetch referti
    const fetchReferti = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const currentPage = pagination?.page ?? 1;
            const currentPageSize = pagination?.pageSize ?? 20;

            const params = new URLSearchParams({
                page: currentPage.toString(),
                pageSize: currentPageSize.toString()
            });

            if (searchTerm) params.append('search', searchTerm);
            if (statoFilter) params.append('stato', statoFilter);
            if (dateFilter) params.append('data', dateFilter);

            // Add tenant filter params
            const tenantParams = getTenantFilterParams();
            if (tenantParams.tenantIds) {
                params.append('tenantIds', tenantParams.tenantIds.join(','));
            }
            if (tenantParams.allTenants) {
                params.append('allTenants', 'true');
            }

            const response = await apiGet<{
                success: boolean;
                data: Referto[];
                pagination: Pagination;
            }>(`/api/v1/poliambulatorio/referti?${params.toString()}`);

            if (response.success) {
                setReferti(response.data || []);
                if (response.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        ...response.pagination
                    }));
                }
            }
        } catch (err) {
            setError('Errore nel caricamento dei referti');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [pagination?.page, pagination?.pageSize, searchTerm, statoFilter, dateFilter, getTenantFilterParams]);

    useEffect(() => {
        fetchReferti();
    }, [fetchReferti]);

    // Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Stato badge component
    const StatoBadge: React.FC<{ stato: string }> = ({ stato }) => {
        const config = statoConfig[stato] || { label: stato, color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
        const IconComponent = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                <IconComponent className="w-3 h-3" />
                {config.label}
            </span>
        );
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-7 h-7 text-teal-600" />
                        Referti Medici
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Gestione referti e documentazione clinica
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {/* Export functionality */ }}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Esporta
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cerca paziente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>

                    {/* Stato Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={statoFilter}
                            onChange={(e) => setStatoFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none"
                        >
                            <option value="">Tutti gli stati</option>
                            {Object.entries(statoConfig).map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Filter */}
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={fetchReferti}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Aggiorna
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-700">{error}</span>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Data Referto
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Paziente
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Prestazione
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Medico
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Stato
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Azioni
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                // Loading skeleton
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 py-4">
                                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="h-4 bg-gray-200 rounded w-40"></div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="h-4 bg-gray-200 rounded w-28"></div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="h-8 bg-gray-200 rounded w-24 ml-auto"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : referti.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center">
                                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-medium">Nessun referto trovato</p>
                                        <p className="text-gray-400 text-sm mt-1">
                                            I referti appariranno qui dopo la redazione
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                referti.map((referto) => (
                                    <tr
                                        key={referto.id}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/poliambulatorio/referti/${referto.id}`)}
                                    >
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-900">
                                                    {formatDate(referto.dataReferto)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {referto.visita?.paziente ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                                                        <User className="w-4 h-4 text-teal-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {referto.visita.paziente.firstName} {referto.visita.paziente.lastName}
                                                        </p>
                                                        {referto.visita.paziente.taxCode && (
                                                            <p className="text-xs text-gray-500">
                                                                CF: {referto.visita.paziente.taxCode}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic">N/D</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-gray-900">
                                                {referto.visita?.appuntamento?.prestazione?.nome || referto.tipoReferto || 'N/D'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            {referto.visita?.medico ? (
                                                <span className="text-sm text-gray-900">
                                                    {getDoctorTitle(referto.visita.medico.taxCode || null, referto.visita.medico.gender || null)} {referto.visita.medico.lastName}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 italic">N/D</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <StatoBadge stato={referto.stato} />
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/poliambulatorio/referti/${referto.id}`);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                                    title="Visualizza"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {referto.stato === 'FIRMATO' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Print functionality
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                                        title="Stampa"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Pagina {pagination.page} di {pagination.totalPages} • {pagination.total} referti totali
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                disabled={pagination.page === 1}
                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Precedente
                            </button>
                            <button
                                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                disabled={pagination.page >= pagination.totalPages}
                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Successiva
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(statoConfig).map(([key, config]) => {
                    const count = referti.filter(r => r.stato === key).length;
                    const IconComponent = config.icon;
                    return (
                        <div
                            key={key}
                            className="bg-white rounded-xl p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setStatoFilter(statoFilter === key ? '' : key)}
                        >
                            <div className="flex items-center justify-between">
                                <span className={`p-2 rounded-lg ${config.color}`}>
                                    <IconComponent className="w-5 h-5" />
                                </span>
                                <span className="text-2xl font-bold text-gray-900">{count}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">{config.label}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RefertiListPage;
