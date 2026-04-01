/**
 * CompanySorveglianzaSection — Sorveglianza Sanitaria (Art. 41 D.Lgs 81/08)
 *
 * Tabella compatta con checkbox per selezione multipla, scheduling singolo e massivo.
 *
 * @module components/companies/CompanySorveglianzaSection
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    HeartPulse,
    AlertTriangle,
    CheckCircle2,
    Clock,
    XCircle,
    Users,
    Loader2,
    Search,
    ExternalLink,
    CalendarClock,
    FileSearch,
    RefreshCw,
    Calendar,
    CheckSquare,
    Square,
    FileText,
    Plus,
    Pencil,
    X,
    Check,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { apiGet } from '../../services/api';
import { protocolliSanitariApi } from '../../services/clinicaApi';
import { cn } from '../../design-system/utils';
import { useToast } from '../../hooks/useToast';
import ScheduleWeekModal from './ScheduleWeekModal';

// ─── Tipi ────────────────────────────────────────────────────

interface CompanySorveglianzaSectionProps {
    companyId: string;
    isCrossTenant?: boolean;
}

interface Accertamento {
    id: string;
    nome: string;
    codice: string;
    isObbligatoria: boolean;
    periodicita?: string | null;
    periodicitaCustomMesi?: number | null;
    note?: string | null;
    ultimaEsecuzione?: string | null;
}

interface Questionario {
    id: string;
    nome: string;
    codice?: string | null;
    periodicitaMesi?: number | null;
    tipo: 'questionario';
}

interface MansioneRecord {
    id: string;
    nome: string;
    descrizione?: string;
    assignmentId: string;
    protocollo: {
        id: string;
        codice: string;
        denominazione: string;
        periodicitaMesi: number;
    } | null;
}

interface SorveglianzaRecord {
    personId: string;
    firstName: string;
    lastName: string;
    mansioni: MansioneRecord[];
    accertamenti: Accertamento[];
    questionari?: Questionario[];
    ultimaVisita: string | null;
    prossimaVisita: string | null;
    appuntamentoProgrammato?: string | null;
    statoGiudizio: 'IDONEO' | 'IDONEO_CON_PRESCRIZIONI' | 'IDONEO_CON_LIMITAZIONI' | 'NON_IDONEO_TEMPORANEO' | 'NON_IDONEO_PERMANENTE' | null;
    statoGiudizioRecord: 'VALIDO' | 'SCADUTO' | 'SOSTITUITO' | 'RICORRIBILE' | 'RICORSO_IN_CORSO' | null;
    isPrimaVisita?: boolean;
}

type ScadenzaStatus = 'scaduta' | 'urgente' | 'presto' | 'ok' | 'non_programmata';

// ─── Costanti ────────────────────────────────────────────

const GIUDIZIO_LABELS: Record<NonNullable<SorveglianzaRecord['statoGiudizio']>, { label: string; cls: string }> = {
    IDONEO: { label: 'Idoneo', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    IDONEO_CON_PRESCRIZIONI: { label: 'Idoneo c/ prescr.', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    IDONEO_CON_LIMITAZIONI: { label: 'Idoneo c/ limit.', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    NON_IDONEO_TEMPORANEO: { label: 'Non idoneo (temp.)', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    NON_IDONEO_PERMANENTE: { label: 'Non idoneo', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
};

const STATUS_CONFIG: Record<ScadenzaStatus, {
    icon: React.FC<{ className?: string }>;
    label: string;
    rowCls: string;
    textCls: string;
    statCls: string;
}> = {
    scaduta: { icon: XCircle, label: 'Scaduta', rowCls: 'bg-red-50/60 dark:bg-red-900/10', textCls: 'text-red-600 dark:text-red-400', statCls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    urgente: { icon: AlertTriangle, label: 'Urgente', rowCls: 'bg-orange-50/60 dark:bg-orange-900/10', textCls: 'text-orange-600 dark:text-orange-400', statCls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    presto: { icon: Clock, label: 'In scadenza', rowCls: 'bg-amber-50/50 dark:bg-amber-900/10', textCls: 'text-amber-600 dark:text-amber-400', statCls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    ok: { icon: CheckCircle2, label: 'Regolare', rowCls: '', textCls: 'text-emerald-600 dark:text-emerald-400', statCls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    non_programmata: { icon: CalendarClock, label: 'Da programmare', rowCls: 'bg-gray-50/60 dark:bg-gray-700/20', textCls: 'text-gray-400 dark:text-gray-500', statCls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' }
};

// ─── Utility ────────────────────────────────────────────────────

function getScadenzaStatus(r: SorveglianzaRecord): ScadenzaStatus {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let d: Date | null = null;
    if (r.prossimaVisita) d = new Date(r.prossimaVisita);
    else if (r.ultimaVisita) {
        const periodi = r.mansioni
            .filter(m => m.protocollo?.periodicitaMesi)
            .map(m => m.protocollo!.periodicitaMesi);
        if (periodi.length > 0) {
            d = new Date(r.ultimaVisita);
            d.setMonth(d.getMonth() + Math.min(...periodi));
        }
    }
    if (!d) return 'non_programmata';
    const diff = Math.floor((d.getTime() - today.getTime()) / 86_400_000);
    if (diff < 0) return 'scaduta';
    if (diff <= 14) return 'urgente';
    if (diff <= 60) return 'presto';
    return 'ok';
}

function getEffectiveScadenza(r: SorveglianzaRecord): Date | null {
    if (r.prossimaVisita) return new Date(r.prossimaVisita);
    if (r.ultimaVisita) {
        const periodi = r.mansioni
            .filter(m => m.protocollo?.periodicitaMesi)
            .map(m => m.protocollo!.periodicitaMesi);
        if (periodi.length > 0) {
            const d = new Date(r.ultimaVisita);
            d.setMonth(d.getMonth() + Math.min(...periodi));
            return d;
        }
    }
    return null;
}

function fmtDate(s: string | null | undefined): string {
    if (!s) return '—';
    return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtScadenza(r: SorveglianzaRecord): string {
    const d = getEffectiveScadenza(r);
    return d ? d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
}


const CompanySorveglianzaSection: React.FC<CompanySorveglianzaSectionProps> = ({
    companyId,
    isCrossTenant = false,
}) => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [scheduleTarget, setScheduleTarget] = useState<SorveglianzaRecord[] | null>(null);
    const [assignProtTarget, setAssignProtTarget] = useState<{ mansioneId: string; mansioneName: string; currentProtocolloId?: string } | null>(null);
    const [protSearch, setProtSearch] = useState('');
    const [expandedAccertamenti, setExpandedAccertamenti] = useState<Set<string>>(new Set());
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: [`company-sorveglianza-${companyId}`],
        queryFn: async () => {
            const resp = await apiGet<{ data: SorveglianzaRecord[] }>(
                `/api/v1/companies/${companyId}/sorveglianza-sanitaria`
            );
            return resp.data || [];
        },
        staleTime: 2 * 60 * 1000,
        enabled: !isCrossTenant,
        retry: false
    });

    const records = data || [];

    // Fetch protocolli disponibili per il modal assegnazione
    const { data: protocolliList, isLoading: isLoadingProtocolli } = useQuery({
        queryKey: ['protocolli-sanitari-for-assign'],
        queryFn: () => protocolliSanitariApi.getAll({ isAttivo: true, limit: 100 }),
        enabled: !!assignProtTarget,
        staleTime: 30 * 1000
    });

    // Mutation per assegnare protocollo a mansione
    const assignProtMutation = useMutation({
        mutationFn: ({ protocolloId, mansioneId }: { protocolloId: string; mansioneId: string }) =>
            protocolliSanitariApi.update(protocolloId, { mansioniIds: [mansioneId] }),
        onSuccess: () => {
            showToast({ message: 'Protocollo sanitario assegnato', type: 'success' });
            setAssignProtTarget(null);
            setProtSearch('');
            refetch();
            queryClient.invalidateQueries({ queryKey: ['protocolli-sanitari-for-assign'] });
        },
        onError: () => {
            showToast({ message: 'Errore nell\'assegnazione del protocollo', type: 'error' });
        }
    });

    const filteredProtocolli = useMemo(() => {
        const items = protocolliList?.data || [];
        const q = protSearch.toLowerCase().trim();
        if (!q) return items;
        return items.filter((p: { codice?: string; denominazione?: string }) =>
            p.codice?.toLowerCase().includes(q) || p.denominazione?.toLowerCase().includes(q)
        );
    }, [protocolliList, protSearch]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return records;
        return records.filter(r =>
            r.lastName?.toLowerCase().includes(q) ||
            r.firstName?.toLowerCase().includes(q) ||
            r.mansioni?.some(m => m.nome?.toLowerCase().includes(q))
        );
    }, [records, search]);

    const stats = useMemo(() => {
        const c = { totale: records.length, scaduta: 0, urgente: 0, presto: 0, ok: 0, non_programmata: 0 };
        for (const r of records) {
            const s = getScadenzaStatus(r);
            c[s]++;
        }
        return c;
    }, [records]);

    const rowKey = (r: SorveglianzaRecord) => r.personId;

    const handleToggle = useCallback((r: SorveglianzaRecord) => {
        const k = rowKey(r);
        setSelected(prev => {
            const next = new Set(prev);
            next.has(k) ? next.delete(k) : next.add(k);
            return next;
        });
    }, []);

    const allFilteredSelected = filtered.length > 0 && filtered.every(r => selected.has(rowKey(r)));
    const someSelected = selected.size > 0;

    const handleToggleAll = useCallback(() => {
        if (allFilteredSelected) {
            setSelected(prev => { const next = new Set(prev); filtered.forEach(r => next.delete(rowKey(r))); return next; });
        } else {
            setSelected(prev => { const next = new Set(prev); filtered.forEach(r => next.add(rowKey(r))); return next; });
        }
    }, [allFilteredSelected, filtered]);

    const openSchedule = useCallback((targets: SorveglianzaRecord[]) => setScheduleTarget(targets), []);

    const openBulkSchedule = useCallback(() => {
        const targets = filtered.filter(r => selected.has(rowKey(r)));
        if (targets.length === 0) { showToast({ message: 'Seleziona almeno un dipendente', type: 'error' }); return; }
        setScheduleTarget(targets);
    }, [filtered, selected, showToast]);

    const handleModalClose = useCallback(() => setScheduleTarget(null), []);
    const handleModalSuccess = useCallback(() => { setScheduleTarget(null); setSelected(new Set()); }, []);

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-black/30 border border-gray-100 dark:border-gray-700 overflow-hidden">

                {/* Header */}
                <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <HeartPulse className="h-4 w-4 text-teal-600" />
                            <h2 className="text-sm font-semibold text-teal-800 dark:text-teal-400">Sorveglianza Sanitaria</h2>
                            {!isCrossTenant && records.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 text-xs font-medium">
                                    {records.length}
                                </span>
                            )}
                            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">Art. 41 D.Lgs 81/08</span>
                        </div>
                        {!isCrossTenant && (
                            <button onClick={() => refetch()} disabled={isFetching} title="Aggiorna"
                                className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
                                <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
                            </button>
                        )}
                    </div>
                </div>

                {isCrossTenant ? (
                    <div className="flex flex-col items-center py-8 text-center">
                        <HeartPulse className="h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Azienda importata — sorveglianza gestita dal tenant proprietario</p>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                ) : records.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center px-6">
                        <FileSearch className="h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Nessun dato di sorveglianza</p>
                        <p className="text-xs text-gray-400 mt-0.5">Assegna mansioni ai dipendenti per monitorare le visite</p>
                    </div>
                ) : (
                    <div>
                        {/* Barra stat + ricerca */}
                        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                                    <Users className="h-3 w-3" />{stats.totale}
                                </div>
                                {stats.scaduta > 0 && (
                                    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', STATUS_CONFIG.scaduta.statCls)}>
                                        <XCircle className="h-3 w-3" />{stats.scaduta} scadute
                                    </div>
                                )}
                                {stats.urgente > 0 && (
                                    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', STATUS_CONFIG.urgente.statCls)}>
                                        <AlertTriangle className="h-3 w-3" />{stats.urgente} urgenti
                                    </div>
                                )}
                                {stats.presto > 0 && (
                                    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', STATUS_CONFIG.presto.statCls)}>
                                        <Clock className="h-3 w-3" />{stats.presto} in scadenza
                                    </div>
                                )}
                                {stats.ok > 0 && (
                                    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', STATUS_CONFIG.ok.statCls)}>
                                        <CheckCircle2 className="h-3 w-3" />{stats.ok} regolari
                                    </div>
                                )}
                                {stats.non_programmata > 0 && (
                                    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', STATUS_CONFIG.non_programmata.statCls)}>
                                        <CalendarClock className="h-3 w-3" />{stats.non_programmata} da programmare
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Cerca dipendente o mansione…"
                                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                            </div>
                        </div>

                        {/* Bulk action bar */}
                        {someSelected && (
                            <div className="px-4 py-2 bg-teal-50 dark:bg-teal-900/20 border-b border-teal-100 dark:border-teal-800 flex items-center justify-between">
                                <span className="text-sm font-medium text-teal-700 dark:text-teal-300">
                                    {selected.size} selezionat{selected.size === 1 ? 'o' : 'i'}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setSelected(new Set())}
                                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded transition-colors">
                                        Deseleziona tutto
                                    </button>
                                    <button onClick={openBulkSchedule}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Programma selezionati ({selected.size})
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Tabella compatta */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/30">
                                        <th className="w-8 px-3 py-2">
                                            <button onClick={handleToggleAll} title={allFilteredSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
                                                className="text-gray-400 hover:text-teal-600 transition-colors">
                                                {allFilteredSelected
                                                    ? <CheckSquare className="h-4 w-4 text-teal-600" />
                                                    : <Square className="h-4 w-4" />
                                                }
                                            </button>
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Dipendente</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Mansione</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Protocollo</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 hidden xl:table-cell">Accertamenti</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Giudizio</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Ultima</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Prossima</th>
                                        <th className="w-10 px-2 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-6 text-center text-sm text-gray-400">
                                                Nessun risultato
                                            </td>
                                        </tr>
                                    ) : filtered.map(record => {
                                        const status = getScadenzaStatus(record);
                                        const cfg = STATUS_CONFIG[status];
                                        const StatusIcon = cfg.icon;
                                        const giudizio = record.statoGiudizio ? GIUDIZIO_LABELS[record.statoGiudizio] : null;
                                        const k = rowKey(record);
                                        const isChecked = selected.has(k);
                                        return (
                                            <tr key={k} className={cn('group transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30', cfg.rowCls, isChecked && 'bg-teal-50/40 dark:bg-teal-900/10')}>
                                                <td className="px-3 py-2">
                                                    <button onClick={() => handleToggle(record)} className="text-gray-400 hover:text-teal-600 transition-colors">
                                                        {isChecked ? <CheckSquare className="h-4 w-4 text-teal-600" /> : <Square className="h-4 w-4" />}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Link to={`/employees/${record.personId}`}
                                                        className="font-medium text-gray-900 dark:text-gray-100 hover:text-teal-700 dark:hover:text-teal-400 transition-colors inline-flex items-center gap-1 whitespace-nowrap">
                                                        {record.lastName} {record.firstName}
                                                        <ExternalLink className="h-3 w-3 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                                                    <div className="space-y-0.5" title={record.mansioni.map(m => m.nome).join(', ')}>
                                                        {record.mansioni.slice(0, 3).map(m => (
                                                            <p key={m.id} className="text-sm truncate max-w-[160px]">
                                                                {m.nome}
                                                                {!m.protocollo && <span className="ml-1 text-[10px] text-amber-500" title="Nessun protocollo sanitario">⚠</span>}
                                                            </p>
                                                        ))}
                                                        {record.mansioni.length > 3 && (
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500">+{record.mansioni.length - 3} altre</p>
                                                        )}
                                                    </div>
                                                </td>
                                                {/* Protocollo Sanitario — deduplica per protocollo ID */}
                                                <td className="px-3 py-2 hidden lg:table-cell">
                                                    <div className="space-y-0.5">
                                                        {(() => {
                                                            // Dedup: raggruppa per protocollo, mostra ogni protocollo una sola volta
                                                            const seen = new Map<string, typeof record.mansioni[0]>();
                                                            const noProtocol: typeof record.mansioni = [];
                                                            for (const m of record.mansioni) {
                                                                if (m.protocollo) {
                                                                    if (!seen.has(m.protocollo.id)) {
                                                                        seen.set(m.protocollo.id, m);
                                                                    }
                                                                } else {
                                                                    noProtocol.push(m);
                                                                }
                                                            }
                                                            const uniqueWithProt = Array.from(seen.values());
                                                            const items = [...uniqueWithProt, ...noProtocol].slice(0, 3);
                                                            const totalUnique = uniqueWithProt.length + noProtocol.length;
                                                            return (
                                                                <>
                                                                    {items.map(m => (
                                                                        <div key={m.protocollo?.id || m.id} className="flex items-center gap-1 group/prot">
                                                                            {m.protocollo ? (
                                                                                <>
                                                                                    <FileText className="h-3 w-3 text-teal-500 flex-shrink-0" />
                                                                                    <span className="text-[11px] text-gray-600 dark:text-gray-400 truncate max-w-[140px]" title={`${m.protocollo.codice} — ${m.protocollo.denominazione}`}>
                                                                                        {m.protocollo.denominazione}
                                                                                    </span>
                                                                                    <button
                                                                                        onClick={() => setAssignProtTarget({ mansioneId: m.id, mansioneName: m.nome, currentProtocolloId: m.protocollo!.id })}
                                                                                        className="opacity-0 group-hover/prot:opacity-100 p-0.5 rounded text-gray-400 hover:text-teal-600 transition-all"
                                                                                        title="Cambia protocollo"
                                                                                    >
                                                                                        <Pencil className="h-2.5 w-2.5" />
                                                                                    </button>
                                                                                </>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => setAssignProtTarget({ mansioneId: m.id, mansioneName: m.nome })}
                                                                                    className="flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                                                                                    title={`Assegna protocollo a ${m.nome}`}
                                                                                >
                                                                                    <Plus className="h-3 w-3" />
                                                                                    Assegna
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                    {totalUnique > 3 && (
                                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500">+{totalUnique - 3}</p>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 hidden xl:table-cell align-top">
                                                    {(() => {
                                                        const allItems = [
                                                            ...record.accertamenti.map(a => ({ ...a, tipo: 'prestazione' as const })),
                                                            ...(record.questionari ?? []).map(q => ({ ...q, isObbligatoria: false, tipo: 'questionario' as const })),
                                                        ];
                                                        if (allItems.length === 0) {
                                                            return record.mansioni.some(m => !m.protocollo)
                                                                ? <span className="text-[11px] text-amber-500">Assegna protocollo</span>
                                                                : <span className="text-gray-300 text-xs">—</span>;
                                                        }
                                                        const isExpanded = expandedAccertamenti.has(record.personId);
                                                        const COLLAPSED_COUNT = 3;
                                                        const visible = isExpanded ? allItems : allItems.slice(0, COLLAPSED_COUNT);
                                                        const extra = allItems.length - COLLAPSED_COUNT;
                                                        return (
                                                            <div className="space-y-0.5" title={allItems.map(a => a.nome).join('\n')}>
                                                                {visible.map(a => (
                                                                    <p key={a.id} className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
                                                                        {a.tipo === 'questionario'
                                                                            ? <span className="text-purple-500 mr-0.5">Q</span>
                                                                            : a.isObbligatoria && <span className="text-teal-500 mr-0.5">•</span>
                                                                        }
                                                                        {a.nome}
                                                                        {a.tipo === 'questionario' && 'periodicitaMesi' in a && a.periodicitaMesi && (
                                                                            <span className="text-purple-400 ml-1">({a.periodicitaMesi}m)</span>
                                                                        )}
                                                                    </p>
                                                                ))}
                                                                {extra > 0 && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setExpandedAccertamenti(prev => {
                                                                                const next = new Set(prev);
                                                                                if (next.has(record.personId)) next.delete(record.personId);
                                                                                else next.add(record.personId);
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        className="flex items-center gap-0.5 text-[10px] text-teal-500 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
                                                                    >
                                                                        {isExpanded ? (
                                                                            <><ChevronUp className="h-3 w-3" />Mostra meno</>
                                                                        ) : (
                                                                            <><ChevronDown className="h-3 w-3" />+{extra} altri</>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-3 py-2 hidden lg:table-cell">
                                                    {giudizio
                                                        ? <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', giudizio.cls)}>{giudizio.label}</span>
                                                        : <span className="text-gray-300 text-xs">—</span>
                                                    }
                                                </td>
                                                <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap hidden sm:table-cell">
                                                    {fmtDate(record.ultimaVisita)}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1">
                                                            <StatusIcon className={cn('h-3.5 w-3.5 flex-shrink-0', cfg.textCls)} />
                                                            <span className={cn('text-xs font-medium', cfg.textCls)}>{fmtScadenza(record)}</span>
                                                        </div>
                                                        {record.appuntamentoProgrammato && (
                                                            <div className="flex items-center gap-1 ml-[18px]">
                                                                <Calendar className="h-3 w-3 text-teal-500 flex-shrink-0" />
                                                                <span className="text-[11px] text-teal-600 dark:text-teal-400">
                                                                    {new Date(record.appuntamentoProgrammato).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2">
                                                    <button onClick={() => openSchedule([record])} title="Programma visita medica"
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {scheduleTarget && (
                <ScheduleWeekModal
                    companyId={companyId}
                    persone={scheduleTarget.map(r => {
                        const primaryMansione = r.mansioni[0];
                        const minPeriodicita = r.mansioni
                            .filter(m => m.protocollo?.periodicitaMesi)
                            .map(m => m.protocollo!.periodicitaMesi)
                            .sort((a, b) => a - b)[0];
                        return {
                            personId: r.personId,
                            firstName: r.firstName,
                            lastName: r.lastName,
                            mansione: primaryMansione ? { id: primaryMansione.id, nome: primaryMansione.nome } : undefined,
                            ultimaVisita: r.ultimaVisita,
                            prossimaVisita: r.prossimaVisita,
                            isPrimaVisita: r.isPrimaVisita,
                            protocollo: minPeriodicita ? { periodicitaMesi: minPeriodicita } : null,
                            accertamenti: r.accertamenti.map(a => ({
                                id: a.id,
                                nome: a.nome,
                                isObbligatoria: a.isObbligatoria,
                                periodicita: a.periodicita,
                                periodicitaCustomMesi: a.periodicitaCustomMesi,
                                ultimaEsecuzione: a.ultimaEsecuzione,
                            })),
                        };
                    })}
                    onClose={handleModalClose}
                    onSuccess={handleModalSuccess}
                />
            )}

            {/* Modal Assegnazione Protocollo Sanitario */}
            {assignProtTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => { setAssignProtTarget(null); setProtSearch(''); }} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 max-h-[70vh] flex flex-col">
                        {/* Header */}
                        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {assignProtTarget.currentProtocolloId ? 'Cambia' : 'Assegna'} Protocollo Sanitario
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Mansione: <span className="font-medium">{assignProtTarget.mansioneName}</span>
                                </p>
                            </div>
                            <button onClick={() => { setAssignProtTarget(null); setProtSearch(''); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Ricerca */}
                        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input type="text" value={protSearch} onChange={e => setProtSearch(e.target.value)}
                                    placeholder="Cerca protocollo…"
                                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    autoFocus />
                            </div>
                        </div>

                        {/* Lista protocolli */}
                        <div className="overflow-y-auto flex-1 px-2 py-2">
                            {isLoadingProtocolli ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                </div>
                            ) : filteredProtocolli.length === 0 ? (
                                <div className="text-center py-8 text-sm text-gray-400">
                                    Nessun protocollo disponibile
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredProtocolli.map((p: { id: string; codice: string; denominazione: string; periodicitaVisiteMesi?: number; mansione?: { denominazione: string } | null }) => {
                                        const isCurrent = p.id === assignProtTarget.currentProtocolloId;
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => assignProtMutation.mutate({ protocolloId: p.id, mansioneId: assignProtTarget.mansioneId })}
                                                disabled={assignProtMutation.isPending}
                                                className={cn(
                                                    'w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3',
                                                    isCurrent
                                                        ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/40 border border-transparent'
                                                )}
                                            >
                                                <FileText className={cn('h-4 w-4 flex-shrink-0', isCurrent ? 'text-teal-600' : 'text-gray-400')} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{p.codice}</span>
                                                        {isCurrent && (
                                                            <span className="flex items-center gap-0.5 text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                                                                <Check className="h-2.5 w-2.5" /> Attuale
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.denominazione}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {p.periodicitaVisiteMesi && (
                                                            <span className="text-[10px] text-gray-400">ogni {p.periodicitaVisiteMesi} mesi</span>
                                                        )}
                                                        {p.mansione && !isCurrent && (
                                                            <span className="text-[10px] text-amber-500">Assegnato a: {p.mansione.denominazione}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CompanySorveglianzaSection;
