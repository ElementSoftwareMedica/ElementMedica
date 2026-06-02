import React, { useMemo, useState } from 'react';
import { Briefcase, Building2, CalendarDays, ChevronDown, ChevronUp, FileText, MapPin } from 'lucide-react';
import type { StatoOccupazionaleStorico } from '../../../../services/clinicaApi';

interface Props {
    statoOccupazionale?: {
        current?: StatoOccupazionaleStorico | null;
        history?: StatoOccupazionaleStorico[];
    } | null;
    compact?: boolean;
    className?: string;
}

function formatDate(value?: string | null) {
    if (!value) return 'In corso';
    return new Date(value).toLocaleDateString('it-IT');
}

function labelFor(record?: StatoOccupazionaleStorico | null) {
    if (!record) return 'Nessuno stato occupazionale';
    return record.mansione?.denominazione
        || record.snapshot?.mansioni?.find(m => m.isPrimaria)?.denominazione
        || record.snapshot?.mansioni?.[0]?.denominazione
        || record.titolo
        || 'Mansione non specificata';
}

function protocolloLabel(record?: StatoOccupazionaleStorico | null) {
    const r = record as any;
    return r?.protocolloSanitario?.denominazione
        || r?.protocollo?.denominazione
        || r?.snapshot?.protocolloSanitario?.denominazione
        || r?.snapshot?.protocollo?.denominazione
        || r?.personTenantProfile?.protocolloSanitario?.denominazione
        || r?.profile?.protocolloSanitario?.denominazione
        || 'Non assegnato';
}

export default function OccupationalHistoryCard({ statoOccupazionale, compact = false, className = '' }: Props) {
    const [expanded, setExpanded] = useState(!compact);
    const current = statoOccupazionale?.current ?? null;
    const history = useMemo(() => statoOccupazionale?.history ?? [], [statoOccupazionale?.history]);

    if (!current && history.length === 0) {
        return (
            <div className={`rounded-xl border border-gray-200 bg-white p-4 ${className}`}>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <Briefcase className="h-4 w-4 text-teal-600" />
                    Stato occupazionale
                </div>
                <p className="mt-2 text-xs text-gray-500">Nessuno storico occupazionale ancora registrato.</p>
            </div>
        );
    }

    return (
        <div className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-teal-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">Stato occupazionale</p>
                        <p className="text-xs text-slate-500 truncate">{labelFor(current)}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setExpanded(v => !v)}
                        className="p-1 rounded-lg text-slate-500 hover:bg-white hover:text-slate-700"
                        title={expanded ? 'Riduci' : 'Espandi'}
                    >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="p-4 space-y-4">
                    {current && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-start gap-2">
                                <Building2 className="h-4 w-4 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-[11px] font-semibold uppercase text-slate-400">Azienda</p>
                                    <p className="text-sm text-slate-700">{current.companyTenantProfile?.company?.ragioneSociale || current.snapshot?.company?.ragioneSociale || 'Non specificata'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-[11px] font-semibold uppercase text-slate-400">Sede / reparto</p>
                                    <p className="text-sm text-slate-700">
                                        {[current.site?.siteName || current.snapshot?.site?.siteName, current.reparto?.nome || current.snapshot?.reparto?.nome].filter(Boolean).join(' - ') || 'Non specificati'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-[11px] font-semibold uppercase text-slate-400">Protocollo</p>
                                    <p className="text-sm text-slate-700">{protocolloLabel(current)}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <CalendarDays className="h-4 w-4 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-[11px] font-semibold uppercase text-slate-400">Periodo</p>
                                    <p className="text-sm text-slate-700">{formatDate(current.dataInizio)} - {formatDate(current.dataFine)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {history.length > 0 && (
                        <div>
                            <p className="text-[11px] font-semibold uppercase text-slate-400 mb-2">Cronologia</p>
                            <div className="space-y-2">
                                {history.slice(0, compact ? 4 : 8).map(record => (
                                    <div key={record.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-700 truncate">{labelFor(record)}</p>
                                            <p className="text-[11px] text-slate-500 truncate">
                                                {(record.companyTenantProfile?.company?.ragioneSociale || record.snapshot?.company?.ragioneSociale || 'Azienda non specificata')}
                                            </p>
                                        </div>
                                        <span className="text-[11px] text-slate-500 flex-shrink-0">
                                            {formatDate(record.dataInizio)} - {formatDate(record.dataFine)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
