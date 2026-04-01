/**
 * Farmaco Table Component
 * 
 * Tabella per visualizzare i farmaci con ubicazione e quantità
 * 
 * @module components/FarmacoTable
 * @project P66 - Sistema Scadenze Centralizzato
 */

import React from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Edit2, Trash2, ChevronLeft, ChevronRight, MapPin, AlertTriangle, Package } from 'lucide-react';
import type { Farmaco } from '../../../../services/clinicaApi';

interface FarmacoTableProps {
    data: Farmaco[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    isLoading: boolean;
    onEdit: (farmaco: Farmaco) => void;
    onDelete: (id: string) => void;
    onPageChange: (page: number) => void;
    canPerformCRUD: boolean;
}

const FarmacoTable: React.FC<FarmacoTableProps> = ({
    data,
    pagination,
    isLoading,
    onEdit,
    onDelete,
    onPageChange,
    canPerformCRUD
}) => {
    // Helper per determinare se un farmaco è in stato critico
    const isCritical = (farmaco: Farmaco): { expired: boolean; expiring: boolean; lowStock: boolean } => {
        const today = new Date();
        const scadenza = new Date(farmaco.dataScadenza);
        const diffDays = Math.ceil((scadenza.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return {
            expired: diffDays < 0,
            expiring: diffDays >= 0 && diffDays <= 30,
            lowStock: farmaco.quantitaDisponibile <= (farmaco.quantitaMinima || 0)
        };
    };

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
                <p className="text-gray-500">Nessun farmaco trovato</p>
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
                                Farmaco
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Lotto
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Scadenza
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Quantità
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Ubicazione
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Stato
                            </th>
                            {canPerformCRUD && (
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Azioni
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((farmaco) => {
                            const status = isCritical(farmaco);

                            return (
                                <tr key={farmaco.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-medium text-gray-900">{farmaco.nome}</p>
                                            {farmaco.principioAttivo && (
                                                <p className="text-sm text-gray-500">{farmaco.principioAttivo}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-gray-700 font-mono">
                                            {farmaco.lottoNumero || '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-sm ${status.expired ? 'text-red-600 font-semibold' : status.expiring ? 'text-orange-600' : 'text-gray-700'}`}>
                                            {format(new Date(farmaco.dataScadenza), 'dd MMM yyyy', { locale: it })}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm ${status.lowStock ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                                                {farmaco.quantitaDisponibile} {farmaco.unitaMisura || 'pz'}
                                            </span>
                                            {farmaco.quantitaMinima && (
                                                <span className="text-xs text-gray-400">
                                                    (min: {farmaco.quantitaMinima})
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-700">
                                                {farmaco.ubicazione || '-'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {status.expired && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Scaduto
                                                </span>
                                            )}
                                            {!status.expired && status.expiring && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    In scadenza
                                                </span>
                                            )}
                                            {status.lowStock && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                                                    <Package className="w-3 h-3" />
                                                    Sotto scorta
                                                </span>
                                            )}
                                            {!status.expired && !status.expiring && !status.lowStock && (
                                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                                    OK
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    {canPerformCRUD && (
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => onEdit(farmaco)}
                                                    className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                                    title="Modifica"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(farmaco.id)}
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

export default FarmacoTable;
