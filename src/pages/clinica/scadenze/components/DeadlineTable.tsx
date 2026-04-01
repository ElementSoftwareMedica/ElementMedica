/**
 * Deadline Table Component
 * 
 * Tabella per visualizzare le scadenze con azioni inline
 * 
 * @module components/DeadlineTable
 * @project P66 - Sistema Scadenze Centralizzato
 */

import React from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Edit2, CheckCircle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type {
    DeadlineItem,
    DeadlineCategory,
    DeadlinePriority,
    DeadlineStatus
} from '../../../../services/clinicaApi';

interface DeadlineTableProps {
    data: DeadlineItem[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    isLoading: boolean;
    onEdit: (deadline: DeadlineItem) => void;
    onComplete: (id: string) => void;
    onDelete: (id: string) => void;
    onPageChange: (page: number) => void;
    categoryConfig: Record<DeadlineCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }>;
    priorityConfig: Record<DeadlinePriority, { label: string; color: string; bgColor: string }>;
    statusConfig: Record<DeadlineStatus, { label: string; color: string; bgColor: string }>;
    canPerformCRUD: boolean;
}

const DeadlineTable: React.FC<DeadlineTableProps> = ({
    data,
    pagination,
    isLoading,
    onEdit,
    onComplete,
    onDelete,
    onPageChange,
    categoryConfig,
    priorityConfig,
    statusConfig,
    canPerformCRUD
}) => {
    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-8 w-8 bg-gray-200 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <p className="text-gray-500">Nessuna scadenza trovata</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Titolo
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Categoria
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Scadenza
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Priorità
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Stato
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Responsabile
                            </th>
                            {canPerformCRUD && (
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Azioni
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((deadline) => {
                            const catConfig = categoryConfig[deadline.categoria];
                            const prioConfig = priorityConfig[deadline.priorita];
                            const statConfig = statusConfig[deadline.status];
                            const Icon = catConfig?.icon;

                            return (
                                <tr key={deadline.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-medium text-gray-900">{deadline.titolo}</p>
                                            {deadline.descrizione && (
                                                <p className="text-sm text-gray-500 truncate max-w-xs">
                                                    {deadline.descrizione}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {Icon && (
                                                <div className={`p-1.5 rounded ${catConfig?.color || 'text-gray-600 bg-gray-100'}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                            )}
                                            <span className="text-sm text-gray-700">
                                                {catConfig?.label || deadline.categoria}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-gray-700">
                                            {format(new Date(deadline.dataScadenza), 'dd MMM yyyy', { locale: it })}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${prioConfig?.bgColor} ${prioConfig?.color}`}>
                                            {prioConfig?.label || deadline.priorita}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statConfig?.bgColor} ${statConfig?.color}`}>
                                            {statConfig?.label || deadline.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-gray-700">
                                            {deadline.responsabile?.nome || '-'}
                                        </span>
                                    </td>
                                    {canPerformCRUD && (
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => onEdit(deadline)}
                                                    className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                                    title="Modifica"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {deadline.status !== 'COMPLETATA' && deadline.status !== 'ANNULLATA' && (
                                                    <button
                                                        onClick={() => onComplete(deadline.id)}
                                                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Completa"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onDelete(deadline.id)}
                                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Elimina"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Pagina {pagination.page} di {pagination.totalPages} ({pagination.total} risultati)
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onPageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeadlineTable;
