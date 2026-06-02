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
import { Edit2, CheckCircle, Trash2, Sparkles, RefreshCcw, CalendarPlus, Phone, Mail } from 'lucide-react';
import type {
    DeadlineItem,
    DeadlineCategory,
    DeadlinePriority,
    DeadlineStatus
} from '../../../../services/clinicaApi';
import ListPaginationFooter from '../../../../components/ui/ListPaginationFooter';

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
    onRenewFarmaco?: (deadline: DeadlineItem) => void;
    onResolveVisit?: (deadline: DeadlineItem) => void;
    onScheduleVisit?: (deadline: DeadlineItem) => void;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
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
    onRenewFarmaco,
    onResolveVisit,
    onScheduleVisit,
    onPageChange,
    onPageSizeChange,
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
                            const isDerived = deadline.id.startsWith('derived:') || [
                                'STRUMENTO_MANUTENZIONE',
                                'FARMACO',
                                'VISITA_FOLLOWUP'
                            ].includes(deadline.entityType || '');
                            const patientPhone = deadline.person?.phone || deadline.person?.telefono;
                            const patientEmail = deadline.person?.email;

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
                                            {deadline.entityType === 'VISITA_FOLLOWUP' && (patientPhone || patientEmail) && (
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                    {patientPhone && (
                                                        <a href={`tel:${patientPhone}`} className="inline-flex items-center gap-1 hover:text-teal-700">
                                                            <Phone className="h-3 w-3" />
                                                            {patientPhone}
                                                        </a>
                                                    )}
                                                    {patientEmail && (
                                                        <a href={`mailto:${patientEmail}`} className="inline-flex items-center gap-1 hover:text-teal-700">
                                                            <Mail className="h-3 w-3" />
                                                            {patientEmail}
                                                        </a>
                                                    )}
                                                </div>
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
                                            {isDerived ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="mr-1 hidden items-center gap-1 text-xs font-medium text-slate-500 sm:inline-flex">
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        Automatica
                                                    </span>
                                                    {deadline.entityType === 'FARMACO' && (
                                                        <button
                                                            onClick={() => onRenewFarmaco?.(deadline)}
                                                            className="p-2 text-gray-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                                                            title="Rinnova farmaco"
                                                        >
                                                            <RefreshCcw className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {deadline.entityType === 'VISITA_FOLLOWUP' && (
                                                        <>
                                                            <button
                                                                onClick={() => onScheduleVisit?.(deadline)}
                                                                className="p-2 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Prenota appuntamento"
                                                            >
                                                                <CalendarPlus className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => onResolveVisit?.(deadline)}
                                                                className="p-2 text-gray-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="Segna come risolta"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
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
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {pagination && (
                <ListPaginationFooter
                    page={pagination.page}
                    pageSize={pagination.limit}
                    total={pagination.total}
                    totalPages={pagination.totalPages}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                />
            )}
        </div>
    );
};

export default DeadlineTable;
