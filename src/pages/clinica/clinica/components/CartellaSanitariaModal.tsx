/**
 * CartellaSanitariaModal
 * Cartella sanitaria completa del paziente con quicklook delle visite
 *
 * Features:
 * - Timeline visite per anno
 * - Expand/collapse dettagli singola visita
 * - Visualizza diagnosi, note, allegati, questionari per visita
 * - Quick look integrato (apre VisitaViewModal)
 * - ProfiloDiSalute riepilogo nella sidebar
 *
 * @module pages/clinica/clinica/components/CartellaSanitariaModal
 * @version 1.0.0 - R19
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    X,
    ChevronDown,
    Calendar,
    User,
    FileText,
    Paperclip,
    ExternalLink,
    Clock,
    Stethoscope,
    AlertTriangle,
    CheckCircle,
    Activity,
    Heart,
    Loader2,
    ClipboardList,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { pazientiApi, type Visita } from '../../../../services/clinicaApi';
import { CATEGORIA_VISITA_LABELS } from '../../../../services/tariffarioAziendaleApi';
import { formatMedicoName } from '../../../../utils/textFormatters';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface CartellaSanitariaModalProps {
    isOpen: boolean;
    onClose: () => void;
    personId: string;
    patientName?: string;
    onOpenVisita?: (visitaId: string) => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    } catch {
        return '—';
    }
}

function getStatoColor(stato: string): string {
    switch (stato) {
        case 'COMPLETATA': return 'bg-green-100 text-green-700 border-green-200';
        case 'IN_CORSO': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'ANNULLATA': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
}

function getStatoLabel(stato: string): string {
    const labels: Record<string, string> = {
        COMPLETATA: 'Completata',
        IN_CORSO: 'In Corso',
        ANNULLATA: 'Annullata',
        ATTESA: 'In Attesa',
    };
    return labels[stato] ?? stato;
}

function groupByYear(visite: Visita[]): Record<string, Visita[]> {
    const grouped: Record<string, Visita[]> = {};
    visite.forEach(v => {
        const raw = v.dataOra ?? v.dataInizio;
        let year = 'N/D';
        if (raw) {
            const d = new Date(raw);
            if (!isNaN(d.getTime())) year = d.getFullYear().toString();
        }
        if (!grouped[year]) grouped[year] = [];
        grouped[year].push(v);
    });
    return grouped;
}

// ─────────────────────────────────────────────
// Sub-component: Single VisitaRow
// ─────────────────────────────────────────────

const VisitaRow: React.FC<{
    visita: Visita;
    onOpen?: (id: string) => void;
}> = ({ visita, onOpen }) => {
    const [expanded, setExpanded] = useState(false);

    const ds = (visita.datiStrutturati ?? {}) as Record<string, string | undefined>;
    const diagnosi = ds.diagnosiPrincipale ?? ds.diagnosi;
    const anamnesi = ds.anamnesi;
    const terapia = ds.terapia;
    const noteClinico = visita.note ?? ds.noteClinico ?? ds.note;

    const doctorName = visita.medico
        ? formatMedicoName(visita.medico as { lastName?: string; firstName?: string; gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null })
        : null;

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-teal-200 transition-colors">
            {/* Header row — use div to avoid nested <button> warning */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => setExpanded(e => !e)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(x => !x); } }}
                className="w-full flex items-start gap-3 p-3.5 text-left cursor-pointer"
            >
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">
                            {(visita.prestazione as { nome?: string })?.nome ?? 'Visita'}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${getStatoColor(visita.stato)}`}>
                            {getStatoLabel(visita.stato)}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(visita.dataOra ?? visita.dataInizio)}
                        </span>
                        {doctorName && (
                            <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {doctorName}
                            </span>
                        )}
                        {visita.tipoVisitaMDL && (
                            <span className="text-purple-600 font-medium">
                                {CATEGORIA_VISITA_LABELS[visita.tipoVisitaMDL as keyof typeof CATEGORIA_VISITA_LABELS] ?? visita.tipoVisitaMDL}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {onOpen && (
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); onOpen(visita.id); }}
                            title="Apri visita completa"
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-teal-600 transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <span className={`p-1 rounded-lg transition-transform duration-200 text-gray-400 ${expanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-4 h-4" />
                    </span>
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 space-y-2.5">
                    {diagnosi && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Diagnosi</p>
                            <p className="text-sm text-gray-700">{diagnosi}</p>
                        </div>
                    )}
                    {anamnesi && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Anamnesi</p>
                            <p className="text-sm text-gray-700 line-clamp-3">{anamnesi}</p>
                        </div>
                    )}
                    {terapia && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Terapia</p>
                            <p className="text-sm text-gray-700 line-clamp-2">{terapia}</p>
                        </div>
                    )}
                    {noteClinico && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Note cliniche</p>
                            <p className="text-sm text-gray-600 italic line-clamp-2">{noteClinico}</p>
                        </div>
                    )}
                    {!diagnosi && !anamnesi && !terapia && !noteClinico && (
                        <p className="text-xs text-gray-400 italic">Nessun dettaglio disponibile</p>
                    )}
                    {onOpen && (
                        <button
                            type="button"
                            onClick={() => onOpen(visita.id)}
                            className="mt-1 flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Apri visita completa
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export const CartellaSanitariaModal: React.FC<CartellaSanitariaModalProps> = ({
    isOpen,
    onClose,
    personId,
    patientName,
    onOpenVisita,
}) => {
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const { data: storico, isLoading } = useQuery({
        queryKey: ['cartella-sanitaria', personId],
        queryFn: () => pazientiApi.getStorico(personId),
        enabled: isOpen && !!personId,
        staleTime: 60_000,
    });

    // getStorico uses extractData → storico is already { visite, referti, appuntamenti } (no .data wrapper)
    const visite: Visita[] = (storico as { visite?: Visita[] } | undefined)?.visite ?? [];

    const filteredVisite = visite.filter(v => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const ds = (v.datiStrutturati ?? {}) as Record<string, string | undefined>;
        return (
            (v.prestazione as { nome?: string })?.nome?.toLowerCase().includes(q) ||
            (ds.diagnosiPrincipale ?? ds.diagnosi ?? '').toLowerCase().includes(q) ||
            v.stato.toLowerCase().includes(q)
        );
    });

    const byYear = groupByYear(filteredVisite);
    const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

    useEffect(() => {
        if (years.length > 0 && !selectedYear) {
            setSelectedYear(years[0]);
        }
    }, [years, selectedYear]);

    const visiteForYear = selectedYear ? (byYear[selectedYear] ?? []) : filteredVisite;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
                            <Heart className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Cartella Sanitaria</h2>
                            {patientName && (
                                <p className="text-xs text-gray-500">{patientName}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Stats bar ── */}
                <div className="flex items-center gap-4 px-6 py-2 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Activity className="w-3.5 h-3.5 text-teal-500" />
                        <span className="font-semibold">{visite.length}</span> visite totali
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        <span className="font-semibold">{visite.filter(v => v.stato === 'COMPLETATA').length}</span> completate
                    </div>
                    {((storico as any)?.data?.referti?.length ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            <span className="font-semibold">{(storico as any)?.data?.referti?.length ?? 0}</span> referti
                        </div>
                    )}
                </div>

                {/* ── Filter bar ── */}
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100">
                    <input
                        type="text"
                        placeholder="Cerca per prestazione, diagnosi, stato..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setSelectedYear(null); }}
                        className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400 bg-white"
                    />
                    {/* Year tabs */}
                    {!search && years.length > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setSelectedYear(null)}
                                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${!selectedYear ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                Tutti
                            </button>
                            {years.map(y => (
                                <button
                                    key={y}
                                    type="button"
                                    onClick={() => setSelectedYear(y)}
                                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${selectedYear === y ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    {y}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                        </div>
                    ) : visiteForYear.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <ClipboardList className="w-10 h-10 mb-3 opacity-30" />
                            <p className="text-sm">{search ? 'Nessun risultato per la ricerca' : 'Nessuna visita registrata'}</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {/* Year section header */}
                            {!selectedYear && !search && years.map(year => (
                                <div key={year}>
                                    <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                                        <div className="w-6 h-0.5 bg-gray-200" />
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{year}</span>
                                        <div className="flex-1 h-0.5 bg-gray-200" />
                                        <span className="text-[10px] text-gray-400">{byYear[year].length} visite</span>
                                    </div>
                                    <div className="space-y-2">
                                        {byYear[year].map(v => (
                                            <VisitaRow key={v.id} visita={v} onOpen={onOpenVisita} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {(selectedYear || search) && visiteForYear.map(v => (
                                <VisitaRow key={v.id} visita={v} onOpen={onOpenVisita} />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-end px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CartellaSanitariaModal;
