import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ListPaginationFooterProps {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: number[];
    itemLabel?: string;
}

export const ListPaginationFooter: React.FC<ListPaginationFooterProps> = ({
    page,
    pageSize,
    total,
    totalPages,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [20, 50, 100, 200],
    itemLabel = 'risultati'
}) => {
    const safeTotalPages = Math.max(totalPages || 1, 1);
    const safePage = Math.min(Math.max(page || 1, 1), safeTotalPages);
    const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const end = Math.min(safePage * pageSize, total);

    return (
        <div className="px-6 py-4 border-t border-slate-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-slate-50/70">
            <div className="text-sm text-slate-600">
                Mostrando <span className="font-medium text-slate-900">{start}</span>
                {' - '}
                <span className="font-medium text-slate-900">{end}</span>
                {' '}di <span className="font-medium text-slate-900">{total}</span> {itemLabel}
            </div>
            <div className="flex flex-wrap items-center gap-3">
                {onPageSizeChange && (
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        Righe
                        <select
                            value={pageSize}
                            onChange={(event) => onPageSizeChange(Number(event.target.value))}
                            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                        >
                            {pageSizeOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </label>
                )}
                <button
                    type="button"
                    onClick={() => onPageChange(safePage - 1)}
                    disabled={safePage <= 1}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Precedente
                </button>
                <span className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                    {safePage} / {safeTotalPages}
                </span>
                <button
                    type="button"
                    onClick={() => onPageChange(safePage + 1)}
                    disabled={safePage >= safeTotalPages}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Successivo
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

export default ListPaginationFooter;
