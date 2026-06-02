/**
 * VisitaScadenzaCard — Prossimo Controllo / Piano di Sorveglianza Sanitaria
 *
 * Per visite non-MDL: mostra un date-picker per il prossimo controllo.
 * Per visite MDL: mostra il piano di sorveglianza sanitaria completo con:
 *   - date calcolate automaticamente (visita corrente + periodicità | ultima esecuzione + periodicità)
 *   - editing per-riga elegante con preset calendario
 *   - pulsante "Riconcilia date" quando le prestazioni cadono entro ±60 giorni
 *
 * @module pages/clinica/clinica/components/VisitaScadenzaCard
 * @project P65.7 / P70
 */

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calendar, Clock, Info, RotateCcw, AlertTriangle, CheckCircle2,
    Briefcase, ChevronDown, ChevronUp, Edit3, X, GitMerge, Loader2, Ban
} from 'lucide-react';
import { DatePickerElegante } from '../../../../components/ui/DatePickerElegante';
import type { Visita, VisitTemplate, Prestazione, ScadenzaProtocolloGruppo } from '../../../../services/clinicaApi';
import { scadenzeMDLApi } from '../../../../services/clinicaApi';
import { useToast } from '../../../../hooks/useToast';
import type { PrestazioneItem } from './PrestazioniCard';

// ─── helpers ────────────────────────────────────────────────────────────────

function addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

function toInputDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

/** Normalizza una data ISO (con o senza componente orario) a mezzanotte locale */
function toLocalMidnight(isoDate: string): Date {
    // Se la stringa contiene già il separatore T (es. 2025-01-01T00:00:00.000Z),
    // prendi solo la parte data per evitare che l'aggiunta di T00:00:00 la corrompas.
    const dateOnly = isoDate.includes('T') ? isoDate.split('T')[0] : isoDate;
    return new Date(dateOnly + 'T00:00:00');
}

function formatDateIT(isoDate: string): string {
    const d = toLocalMidnight(isoDate);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateShort(isoDate: string): string {
    const d = toLocalMidnight(isoDate);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function diffDays(a: string, b: string): number {
    return Math.abs(Math.round(
        (toLocalMidnight(a).getTime() - toLocalMidnight(b).getTime()) / (1000 * 60 * 60 * 24)
    ));
}

function daysFromNow(isoDate: string): number {
    const d = toLocalMidnight(isoDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const CANCELLED_STATI = ['ANNULLATO', 'NO_SHOW'];

// ─────────────────────────────────────────────────────────────────────────────
// Piano row computation
// ─────────────────────────────────────────────────────────────────────────────

interface PianoRowData {
    /** Unique identifier: prestazioneId for prestazioni, documentoTemplateId for questionari */
    itemId: string;
    prestazioneId: string | null;
    /** P72_21: presente per questionari periodici */
    documentoTemplateId: string | null;
    prestazioneName: string;
    /** P72_14: tipo dalla prestazione (VISITA_MEDICINA_LAVORO, ESAME_STRUMENTALE, etc.) */
    prestazioneTipo: string | null;
    /** P72_14: true = prestazione obbligatoria nel protocollo sanitario */
    isObbligatoria: boolean;
    periodicitaMesi: number;
    openScadenzaId: string | null;
    currentDate: string | null;
    lastExecutedDate: string | null;
    /**
     * Date calcolata:  se la scadenza è legata all'appuntamento corrente → visitaDate + periodicità
     *                  altrimenti → ultima esecuzione + periodicità
     */
    suggestedDate: string | null;
    statusKind: 'prenotata' | 'in_regola' | 'urgente' | 'scaduta' | 'eseguita' | 'nessuna';
    statusDays: number | null;
}

function computePianoRows(
    gruppi: ScadenzaProtocolloGruppo[],
    visitDate: Date,
    appuntamentoId: string | null,
    scheduleFromCurrentVisit: boolean,
): PianoRowData[] {
    return gruppi.map(gruppo => {
        const aperte = gruppo.scadenze.filter(s => !s.eseguita);
        const eseguite = gruppo.scadenze.filter(s => s.eseguita);
        aperte.sort((a, b) =>
            (a.dataScadenza ? new Date(a.dataScadenza).getTime() : Infinity) -
            (b.dataScadenza ? new Date(b.dataScadenza).getTime() : Infinity)
        );
        const firstOpen = aperte[0] ?? null;

        const lastExecuted = [...eseguite]
            .filter(s => !!(s.dataEsecuzione || (s as any).visita?.dataOra))
            .sort((a, b) => {
                const da = a.dataEsecuzione ?? (a as any).visita?.dataOra ?? '';
                const db = b.dataEsecuzione ?? (b as any).visita?.dataOra ?? '';
                return new Date(db).getTime() - new Date(da).getTime();
            })[0] ?? null;

        let suggestedDate: string | null = null;
        if (firstOpen) {
            if (appuntamentoId && (firstOpen as any).appuntamento?.id === appuntamentoId) {
                suggestedDate = scheduleFromCurrentVisit ? toInputDate(addMonths(visitDate, gruppo.periodicitaMesi)) : firstOpen.dataScadenza ?? null;
            } else if (lastExecuted) {
                const baseDate = lastExecuted.dataEsecuzione ?? (lastExecuted as any).visita?.dataOra ?? null;
                if (baseDate) {
                    suggestedDate = toInputDate(addMonths(toLocalMidnight(baseDate), gruppo.periodicitaMesi));
                }
            }
        }
        // P72_10: Calcola suggestedDate anche quando tutte le scadenze risultano eseguite (no firstOpen).
        // Senza questo fix, dopo diversi anni di visite completate la data futura scompariva dalla UI.
        if (!suggestedDate && lastExecuted && gruppo.periodicitaMesi > 0) {
            const baseDate = lastExecuted.dataEsecuzione ?? (lastExecuted as any).visita?.dataOra ?? null;
            if (baseDate) {
                suggestedDate = toInputDate(addMonths(toLocalMidnight(baseDate), gruppo.periodicitaMesi));
            }
        }

        // P73: Fallback finale — se esiste una scadenza aperta ma non abbiamo né link all'appuntamento
        // corrente né storico esecuzioni (es. scadenze generate da generaIniziali per prima visita),
        // calcola la data suggerita dalla data della visita corrente + periodicità.
        if (scheduleFromCurrentVisit && !suggestedDate && firstOpen && gruppo.periodicitaMesi > 0) {
            suggestedDate = toInputDate(addMonths(visitDate, gruppo.periodicitaMesi));
        }

        let statusKind: PianoRowData['statusKind'] = 'nessuna';
        let statusDays: number | null = null;
        if (firstOpen) {
            const app = (firstOpen as any).appuntamento;
            if (app && !CANCELLED_STATI.includes(app.stato) && app.dataOra) {
                statusKind = 'prenotata';
            } else if (firstOpen.dataScadenza) {
                const days = daysFromNow(firstOpen.dataScadenza);
                statusDays = days;
                if (days < 0) statusKind = 'scaduta';
                else if (days <= 30) statusKind = 'urgente';
                else statusKind = 'in_regola';
            }
        } else if (lastExecuted) {
            statusKind = 'eseguita';
        }

        // P72_21: questionari have prestazioneId = null, use documentoTemplateId as key
        const docTemplId = (gruppo as any).documentoTemplateId ?? null;
        const itemId = gruppo.prestazioneId ?? docTemplId ?? '';

        return {
            itemId,
            prestazioneId: gruppo.prestazioneId ?? null,
            documentoTemplateId: docTemplId,
            prestazioneName: gruppo.prestazioneName,
            prestazioneTipo: (gruppo as any).prestazioneTipo ?? null,
            isObbligatoria: (gruppo as any).isObbligatoria ?? true,
            periodicitaMesi: gruppo.periodicitaMesi,
            openScadenzaId: firstOpen?.id ?? null,
            currentDate: firstOpen?.dataScadenza ?? null,
            lastExecutedDate: lastExecuted?.dataEsecuzione ?? (lastExecuted as any)?.visita?.dataOra ?? null,
            suggestedDate,
            statusKind,
            statusDays,
        };
    });
}

// ─── MDL tipo visita helpers ─────────────────────────────────────────────────

/** Mesi di follow-up di default per tipo visita MDL (D.Lgs 81/08 art. 41).
 *  Il MC può sempre sovrascrivere la data.
 *  null = nessun follow-up standard (visita una-tantum o a discrezione MC). */
const MDL_DEFAULT_FOLLOWUP_MESI: Record<string, number | null> = {
    PREVENTIVA: 12,         // prima dell'assunzione / prima visita nuovo lavoratore → avvia ciclo annuale
    CAMBIO_MANSIONE: null,
    RIENTRO_MATERNITA: null,
    PRECEDENTE_ASSENZA: null,
    VERIFICA_IDONEITA: null,
    STRAORDINARIA: null,
    SU_RICHIESTA_LAVORATORE: null,
    PREVENTIVA_PREASSUNTIVA: 12,
    CESSAZIONE_RAPPORTO: null,   // fine rapporto: nessun follow-up
    PERIODICA: 12,      // periodicità standard; il MC può ridurla/aumentarla per rischio
};

const MDL_VISIT_TYPES_THAT_ADVANCE_PLAN = new Set(['PERIODICA', 'PREVENTIVA', 'PREVENTIVA_PREASSUNTIVA']);

/** Etichette contestuali per il tipo visita MDL nel riquadro di contesto */
const MDL_FOLLOWUP_NOTE: Record<string, string> = {
    PREVENTIVA: 'Visita preventiva (Art. 41 c.2a) – include prima visita per nuovo lavoratore. Avvia il ciclo di sorveglianza sanitaria periodica. Follow-up suggerito: 12 mesi.',
    CAMBIO_MANSIONE: 'Visita per cambio mansione. Si consiglia un follow-up entro 12 mesi per valutare l\'adattamento alla nuova mansione.',
    RIENTRO_MATERNITA: 'Visita di rientro da maternità/paternità. Follow-up consigliato entro 12 mesi.',
    PRECEDENTE_ASSENZA: 'Visita post-assenza prolungata. Follow-up consigliato entro 12 mesi.',
    VERIFICA_IDONEITA: 'Verifica dell\'idoneità specifica. Follow-up entro 12 mesi o a discrezione del MC.',
    STRAORDINARIA: 'Visita straordinaria. Follow-up a discrezione del Medico Competente.',
    SU_RICHIESTA_LAVORATORE: 'Visita su richiesta del lavoratore (Art. 41 c.2 lett. h D.Lgs 81/08). Follow-up a discrezione del MC.',
    PREVENTIVA_PREASSUNTIVA: 'Visita preventiva preassuntiva (Art. 41 c.2a-bis, D.Lgs 19/2022) — in fase preassuntiva su scelta del datore. Visita una-tantum.',
    CESSAZIONE_RAPPORTO: 'Visita di cessazione rapporto. Fine del ciclo di sorveglianza sanitaria: nessun follow-up necessario.',
    PERIODICA: 'Visita periodica (Art. 41 D.Lgs 81/08). Data suggerita in base a periodicità standard (12 mesi). Il MC può adattarla al protocollo di rischio.',
};

// ─── types ───────────────────────────────────────────────────────────────────

export interface SorveglianzaStats {
    /** Periodicità visita MDL in mesi (da ProtocolloSanitario.periodicitaVisiteMesi) */
    periodicitaMesi: number;
    /** Lista degli accertamenti previsti (obbligatori e non) */
    accertamenti: { nome: string; isObbligatoria: boolean }[];
    /** Nome del protocollo sanitario */
    denominazione?: string;
}

interface SuggestedDate {
    date: Date;
    mesi: number;
    source: 'template' | 'prestazione' | 'sorveglianza' | 'mdl_tipo';
    label: string;
}

interface Props {
    visita: Visita | null;
    template: VisitTemplate | null;
    prestazione: Prestazione | null;
    prossimoControllo: string | null;      // ISO date string YYYY-MM-DD (from form state)
    noteFollowup: string | null;
    onChange: (date: string | null) => void;
    onNoteChange: (note: string | null) => void;
    isReadonly?: boolean;
    className?: string;
    /** Se true, la visita è una Visita Medica del Lavoro (sorveglianza sanitaria) */
    isMDL?: boolean;
    /** Tipo visita MDL corrente (TipoVisitaMDL enum) — determina il follow-up standard */
    tipoVisitaMDL?: string;
    /** Dati sorveglianza sanitaria — quando disponibili, overridano il default MDL */
    sorveglianzaStats?: SorveglianzaStats | null;
    /** Piano di sorveglianza completo — tutte le ScadenzaPrestazioneProtocollo del lavoratore raggruppate per prestazione */
    personaScadenze?: ScadenzaProtocolloGruppo[] | null;
    /** ID del lavoratore — serve per invalidare la query scadenze dopo aggiornamenti */
    pazienteId?: string | null;
    /**
     * P72_15 Task 6: Prestazioni aggiuntive aggiunte durante la visita (non ancora in protocollo).
     * Vengono mostrate nel piano come righe «da programmare» con spunta «Non programmare».
     */
    prestazioniAggiuntive?: PrestazioneItem[];
    /**
     * P72_15 Task 7: IDs delle prestazioni (aggiunte + facoltative) marcate «Non programmare».
     * Default: tutte NON marcate → verranno schedulate alla chiusura visita.
     */
    nonProgrammareIds?: string[];
    /** Callback invocato quando l'utente spunta/deseleziona «Non programmare» su una riga */
    onNonProgrammareChange?: (ids: string[]) => void;
    /**
     * P72_18: Callback invocato quando l'utente cambia manualmente una data del piano.
     * Riceve un record {prestazioneId: isoDate} con tutti gli override attivi.
     * VisitaPage usa questo per passare le date manuali a programmaPrestazioni.
     */
    onEditDatesChange?: (dates: Record<string, string>) => void;
    /**
     * P72_20: Date override già salvate (da datiStrutturati._pianoDateOverrides).
     * Usato per inizializzare editDates e prevenire la sovrascrittura al primo mount.
     */
    initialEditDates?: Record<string, string>;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function VisitaScadenzaCard({
    visita,
    template,
    prestazione,
    prossimoControllo,
    noteFollowup,
    onChange,
    onNoteChange,
    isReadonly = false,
    className = '',
    isMDL = false,
    tipoVisitaMDL,
    sorveglianzaStats,
    personaScadenze,
    pazienteId,
    prestazioniAggiuntive = [],
    nonProgrammareIds = [],
    onNonProgrammareChange,
    onEditDatesChange,
    initialEditDates,
}: Props) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [pianoExpanded, setPianoExpanded] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    // P72_20: inizializza dagli override già salvati per evitare sovrascrittura al mount
    const [editDates, setEditDates] = useState<Record<string, string>>(initialEditDates ?? {});
    const [reconcileMode, setReconcileMode] = useState(false);

    // P72_20: aggiorna editDates se initialEditDates cambia (es. dopo restore da DB)
    const prevInitialEditDatesRef = useRef<Record<string, string> | undefined>(undefined);
    useEffect(() => {
        if (initialEditDates && initialEditDates !== prevInitialEditDatesRef.current) {
            prevInitialEditDatesRef.current = initialEditDates;
            setEditDates(prev => {
                // Applica solo se l'utente non ha già modificato (prev è vuoto o uguale al precedente)
                if (Object.keys(prev).length === 0) {
                    return initialEditDates;
                }
                return prev;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialEditDates]);

    // P72_18: notifica il parent quando le date cambiano — P72_20: skip il primo render
    const isMountedEditDates = useRef(false);
    useEffect(() => {
        if (!isMountedEditDates.current) {
            isMountedEditDates.current = true;
            return;
        }
        onEditDatesChange?.(editDates);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editDates]);
    const [reconcileTarget, setReconcileTarget] = useState<string | null>(null);

    const visitDate = useMemo(() => {
        const raw = (visita as any)?.dataOra || (visita as any)?.dataInizio;
        return raw ? new Date(raw) : new Date();
    }, [visita]);

    const appuntamentoId = (visita as any)?.appuntamentoId ?? null;
    const scheduleFromCurrentVisit = isMDL && !!tipoVisitaMDL && MDL_VISIT_TYPES_THAT_ADVANCE_PLAN.has(tipoVisitaMDL);

    // ── Piano rows ────────────────────────────────────────────────────────────
    const pianoRows = useMemo(
        () => (personaScadenze && personaScadenze.length > 0
            ? computePianoRows(personaScadenze, visitDate, appuntamentoId, scheduleFromCurrentVisit)
            : []),
        [personaScadenze, visitDate, appuntamentoId, scheduleFromCurrentVisit],
    );

    // P73: Auto-apply suggestedDate a editDates per tutte le righe con scadenze aperte.
    // Lo fa solo al primo caricamento (quando editDates è vuoto e non ci sono initialEditDates)
    // per evitare di sovrascrivere le scelte manuali dell'utente.
    const didAutoApplyPiano = useRef(false);
    useEffect(() => {
        if (didAutoApplyPiano.current || isReadonly || pianoRows.length === 0 || !scheduleFromCurrentVisit) return;
        // Se ci sono già editDates (da initialEditDates o da precedente sessione), non sovrascrivere
        if (Object.keys(editDates).length > 0) {
            didAutoApplyPiano.current = true;
            return;
        }
        const autoApplied: Record<string, string> = {};
        for (const row of pianoRows) {
            if (row.suggestedDate && row.openScadenzaId && !nonProgrammareIds.includes(row.itemId)) {
                autoApplied[row.itemId] = row.suggestedDate;
            }
        }
        if (Object.keys(autoApplied).length > 0) {
            didAutoApplyPiano.current = true;
            setEditDates(autoApplied);
        }
    }, [pianoRows, isReadonly, editDates, nonProgrammareIds, scheduleFromCurrentVisit]);

    // ── Reconcile detection ───────────────────────────────────────────────────
    // P72_19+: mostra il pulsante se esiste un CLUSTER di date consecutive entro ±60 giorni.
    // La riconciliazione si applica al cluster più grande trovato (non necessariamente tutte le date).
    const reconcilableGroups = useMemo(() => {
        // P72_20: escludi le prestazioni marcate "Non programmare"
        const withDates = pianoRows.filter(r => r.suggestedDate && r.openScadenzaId && !nonProgrammareIds.includes(r.itemId));
        if (withDates.length < 2) return [];
        const sorted = [...withDates].sort(
            (a, b) => toLocalMidnight(a.suggestedDate!).getTime() - toLocalMidnight(b.suggestedDate!).getTime()
        );
        // Trova il cluster più grande di date consecutive entro 60 giorni
        let maxCluster: PianoRowData[] = [];
        let currentCluster: PianoRowData[] = [sorted[0]];
        for (let i = 1; i < sorted.length; i++) {
            if (diffDays(sorted[i - 1].suggestedDate!, sorted[i].suggestedDate!) <= 60) {
                currentCluster.push(sorted[i]);
            } else {
                if (currentCluster.length > maxCluster.length) maxCluster = currentCluster;
                currentCluster = [sorted[i]];
            }
        }
        if (currentCluster.length > maxCluster.length) maxCluster = currentCluster;
        // P72_23: mostra pulsante solo se le date nel cluster sono DIVERSE tra loro (non tutte identiche)
        const hasVariation = maxCluster.length >= 2 &&
            diffDays(maxCluster[0].suggestedDate!, maxCluster[maxCluster.length - 1].suggestedDate!) > 0;
        return hasVariation ? maxCluster : [];
    }, [pianoRows]);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const patchMutation = useMutation({
        mutationFn: ({ id, date }: { id: string; date: string }) =>
            scadenzeMDLApi.patchDataScadenza(id, date),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scadenze-persona', pazienteId] });
            setEditingId(null);
            showToast({ type: 'success', message: 'Data aggiornata' });
        },
        onError: () => showToast({ type: 'error', message: 'Errore aggiornamento data' }),
    });

    const reconciliaMutation = useMutation({
        mutationFn: ({ ids, targetDate }: { ids: string[]; targetDate: string }) =>
            scadenzeMDLApi.reconciliaDate(ids, targetDate),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['scadenze-persona', pazienteId] });
            setReconcileMode(false);
            showToast({ type: 'success', message: `${(data as any)?.aggiornate ?? 0} date riconciliate` });
        },
        onError: () => showToast({ type: 'error', message: 'Errore riconciliazione date' }),
    });

    // ── Compute suggested date from fallback chain ────────────────────────────
    const suggested: SuggestedDate | null = useMemo(() => {
        if ((template as any)?.defaultScadenzaMesi) {
            const mesi = (template as any).defaultScadenzaMesi as number;
            return { date: addMonths(visitDate, mesi), mesi, source: 'template', label: (template as any)?.name || 'Template' };
        }
        if ((prestazione as any)?.scadenzaDefaultMesi) {
            const mesi = (prestazione as any).scadenzaDefaultMesi as number;
            return { date: addMonths(visitDate, mesi), mesi, source: 'prestazione', label: (prestazione as any)?.nome || 'Prestazione' };
        }
        if (isMDL && scheduleFromCurrentVisit && sorveglianzaStats?.periodicitaMesi) {
            return { date: addMonths(visitDate, sorveglianzaStats.periodicitaMesi), mesi: sorveglianzaStats.periodicitaMesi, source: 'sorveglianza' as const, label: sorveglianzaStats.denominazione || 'Protocollo sanitario' };
        }
        if (isMDL && tipoVisitaMDL) {
            const mdlMesi = MDL_DEFAULT_FOLLOWUP_MESI[tipoVisitaMDL] ?? null;
            if (mdlMesi !== null) return { date: addMonths(visitDate, mdlMesi), mesi: mdlMesi, source: 'mdl_tipo' as const, label: tipoVisitaMDL };
        }
        return null;
    }, [visitDate, template, prestazione, isMDL, tipoVisitaMDL, sorveglianzaStats, scheduleFromCurrentVisit]);

    // Auto-apply suggestion when no value is set yet (on first load only)
    const didAutoApply = useRef(false);
    useEffect(() => {
        if (!didAutoApply.current && !prossimoControllo && suggested && !isReadonly) {
            didAutoApply.current = true;
            onChange(toInputDate(suggested.date));
        }
    }, [suggested, prossimoControllo, isReadonly, onChange]);

    // Auto-fill noteFollowup from sorveglianza accertamenti (on first load when note is empty)
    const didAutoApplyNote = useRef(false);
    useEffect(() => {
        if (didAutoApplyNote.current || isReadonly || noteFollowup) return;
        if (!sorveglianzaStats?.accertamenti?.length) return;
        didAutoApplyNote.current = true;
        const lines = sorveglianzaStats.accertamenti.map(
            a => `${a.isObbligatoria ? '✓' : '○'} ${a.nome}`
        );
        onNoteChange(`Accertamenti previsti dal protocollo sanitario:\n${lines.join('\n')}`);
    }, [sorveglianzaStats, noteFollowup, isReadonly, onNoteChange]);

    // ── Status chip ──────────────────────────────────────────────────────────
    const status = useMemo(() => {
        if (!prossimoControllo) return null;
        const days = daysFromNow(prossimoControllo);
        if (days < 0) return { color: 'red', label: 'Scaduta', icon: AlertTriangle };
        if (days <= 30) return { color: 'amber', label: `Fra ${days} gg`, icon: AlertTriangle };
        if (days <= 90) return { color: 'yellow', label: `Fra ${days} gg`, icon: Clock };
        return { color: 'teal', label: `Fra ${days} gg`, icon: CheckCircle2 };
    }, [prossimoControllo]);

    const statusColors: Record<string, string> = {
        red: 'bg-red-100 text-red-700 border-red-200',
        amber: 'bg-amber-100 text-amber-700 border-amber-200',
        yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        teal: 'bg-teal-100 text-teal-700 border-teal-200'
    };

    const handleSaveDate = (row: PianoRowData) => {
        const newDate = editDates[row.itemId];
        if (!newDate || !row.openScadenzaId) return;
        patchMutation.mutate({ id: row.openScadenzaId, date: newDate });
    };

    const handleReconcile = () => {
        if (!reconcileTarget || reconcilableGroups.length === 0) return;
        const ids = reconcilableGroups.map(r => r.openScadenzaId).filter((id): id is string => !!id);
        reconciliaMutation.mutate({ ids, targetDate: reconcileTarget });
    };

    /** P72_15 Task 7: toggle "Non programmare" per una prestazione (aggiunta o facoltativa) */
    const toggleNonProgrammare = (prestazioneId: string) => {
        if (!onNonProgrammareChange) return;
        const curr = nonProgrammareIds ?? [];
        const updated = curr.includes(prestazioneId)
            ? curr.filter(id => id !== prestazioneId)
            : [...curr, prestazioneId];
        onNonProgrammareChange(updated);
    };

    /** Prestazioni aggiuntive NON già presenti nel piano (filtro per evitare duplicati) */
    const pianoPrestazioneIds = new Set(pianoRows.map(r => r.prestazioneId).filter(Boolean) as string[]);
    const prestazioniAggiuntiveExtra = (prestazioniAggiuntive ?? []).filter(
        p => p.id && !pianoPrestazioneIds.has(p.id) && /^[0-9a-f]{8}-/i.test(p.id)
    );

    // ── MDL-specific context ─────────────────────────────────────────────────
    const mdlNote = isMDL && tipoVisitaMDL ? (MDL_FOLLOWUP_NOTE[tipoVisitaMDL] ?? null) : null;
    const isOneTimeMDL = isMDL && tipoVisitaMDL
        ? (MDL_DEFAULT_FOLLOWUP_MESI[tipoVisitaMDL] === null)
        : false;

    // P72_20: titolo unificato "Sorveglianza Sanitaria" per MDL (consolidato con piano)
    const headerTitle = isMDL ? 'Sorveglianza Sanitaria' : 'Prossimo Controllo';

    return (
        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                {/* Title row — always full width */}
                <div className="flex items-center gap-2">
                    {isMDL
                        ? <Briefcase className="h-4 w-4 text-teal-600 flex-shrink-0" />
                        : <Calendar className="h-4 w-4 text-teal-600 flex-shrink-0" />
                    }
                    <span className="text-sm font-semibold text-gray-800 flex-1">{headerTitle}</span>
                    {/* P72_23: count badge + expand/collapse moved from inner piano header */}
                    {isMDL && (pianoRows.length + prestazioniAggiuntiveExtra.length) > 0 && (
                        <button
                            type="button"
                            onClick={() => setPianoExpanded(v => !v)}
                            className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-800"
                        >
                            <span className="text-[10px] bg-teal-100 text-teal-700 font-semibold px-1.5 py-0.5 rounded-full">
                                {pianoRows.length + prestazioniAggiuntiveExtra.length} prestaz.
                            </span>
                            {pianoExpanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
                        </button>
                    )}
                    {/* P72_23: reconcile trigger moved from inner piano header */}
                    {reconcilableGroups.length >= 2 && !isReadonly && !reconcileMode && (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={reconciliaMutation.isPending}
                                onClick={() => {
                                    const nearestDate = reconcilableGroups[0].suggestedDate ?? null;
                                    if (!nearestDate) return;
                                    const ids = reconcilableGroups.map(r => r.openScadenzaId).filter((id): id is string => !!id);
                                    setReconcileTarget(nearestDate);
                                    reconciliaMutation.mutate({ ids, targetDate: nearestDate });
                                }}
                                className="flex items-center gap-1 text-[11px] font-medium text-violet-600 bg-violet-50 border border-violet-200 hover:bg-violet-100 disabled:opacity-50 px-2 py-0.5 rounded-full transition-colors"
                            >
                                {reconciliaMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitMerge className="h-3 w-3" />}
                                Riconcilia al {reconcilableGroups[0].suggestedDate ? formatDateShort(reconcilableGroups[0].suggestedDate) : '—'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setReconcileMode(true);
                                    setReconcileTarget(reconcilableGroups[0].suggestedDate ?? null);
                                }}
                                className="text-[10px] text-violet-500 hover:text-violet-700 underline underline-offset-2"
                                title="Personalizza data"
                            >
                                personalizza
                            </button>
                        </div>
                    )}
                </div>
                {/* Badges row — separate line so they never squeeze the title */}
                {((isMDL && tipoVisitaMDL) || (prossimoControllo && status)) && (
                    <div className="flex items-center gap-1.5 mt-1.5 ml-6">
                        {isMDL && tipoVisitaMDL && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-100 text-teal-700 text-[10px] font-medium rounded-full border border-teal-200">
                                <Briefcase className="h-2.5 w-2.5" />
                                MDL
                            </span>
                        )}
                        {prossimoControllo && status && !pianoRows.length && (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${statusColors[status.color]}`}>
                                <status.icon className="h-3 w-3" />
                                {status.label}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* MDL context note — mostrata prima della data per guidare il MC */}
                {mdlNote && !isReadonly && (
                    <div className={`flex items-start gap-2 text-xs rounded-lg p-2.5 ${isOneTimeMDL
                        ? 'bg-amber-50 border border-amber-100 text-amber-700'
                        : 'bg-teal-50 border border-teal-100 text-teal-700'
                        }`}>
                        <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 opacity-70" />
                        <span>{mdlNote}</span>
                    </div>
                )}

                {/* Sorveglianza sanitaria: accertamenti dal protocollo MDL */}
                {sorveglianzaStats && sorveglianzaStats.accertamenti.length > 0 && !isReadonly && (
                    <div className="bg-teal-50 border border-teal-100 rounded-lg p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                <Briefcase className="h-3.5 w-3.5 text-teal-600 flex-shrink-0" />
                                <span className="text-xs font-semibold text-teal-800">
                                    {sorveglianzaStats.denominazione || 'Protocollo sanitario'}
                                    {' — '}{sorveglianzaStats.periodicitaMesi} mesi
                                </span>
                            </div>
                            {!noteFollowup && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const lines = sorveglianzaStats.accertamenti.map(
                                            a => `${a.isObbligatoria ? '✓' : '○'} ${a.nome}`
                                        );
                                        onNoteChange(`Accertamenti previsti dal protocollo sanitario:\n${lines.join('\n')}`);
                                    }}
                                    className="flex-shrink-0 text-[10px] font-medium text-teal-700 bg-white border border-teal-200 hover:bg-teal-600 hover:text-white hover:border-teal-600 px-2 py-0.5 rounded-full transition-colors"
                                >
                                    Usa nelle note
                                </button>
                            )}
                        </div>
                        <ul className="space-y-0.5">
                            {sorveglianzaStats.accertamenti.slice(0, 6).map((a, i) => (
                                <li key={i} className="flex items-center gap-1.5 text-xs text-teal-700">
                                    <span className={`font-bold ${a.isObbligatoria ? 'text-teal-600' : 'text-teal-400'}`}>
                                        {a.isObbligatoria ? '✓' : '○'}
                                    </span>
                                    {a.nome}
                                    {a.isObbligatoria && <span className="text-[9px] text-teal-500 font-medium ml-auto">obbl.</span>}
                                </li>
                            ))}
                            {sorveglianzaStats.accertamenti.length > 6 && (
                                <li className="text-[10px] text-teal-500 italic pl-4">
                                    +{sorveglianzaStats.accertamenti.length - 6} altri accertamenti
                                </li>
                            )}
                        </ul>
                    </div>
                )}

                {/* ── Piano di sorveglianza sanitaria ──────────────────────────────────── */}
                {/* P72_23: header interno rimosso — count/expand/reconcile spostati nel header esterno */}
                {isMDL && (pianoRows.length + prestazioniAggiuntiveExtra.length) > 0 && (
                    <div className="-mx-4 border-t border-b border-gray-100 mb-4">
                        {/* Reconcile panel */}
                        {reconcileMode && !isReadonly && (
                            <div className="bg-violet-50 border-y border-violet-100 px-4 py-2.5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-violet-700 flex items-center gap-1">
                                        <GitMerge className="h-3 w-3" />
                                        Riconcilia {reconcilableGroups.length} prestazioni alla stessa data
                                    </p>
                                    <button type="button" onClick={() => setReconcileMode(false)} className="text-violet-400 hover:text-violet-600">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <div className="text-[10px] text-violet-600 space-y-0.5">
                                    {reconcilableGroups.map(r => (
                                        <div key={r.itemId} className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
                                            <span>{r.prestazioneName}</span>
                                            {r.suggestedDate && (
                                                <span className="text-violet-400">— calcolata: {formatDateShort(r.suggestedDate)}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    {[{ label: '3 mesi', mesi: 3 }, { label: '6 mesi', mesi: 6 }, { label: '1 anno', mesi: 12 }, { label: '2 anni', mesi: 24 }].map(({ label, mesi }) => {
                                        const preset = toInputDate(addMonths(visitDate, mesi));
                                        return (
                                            <button key={mesi} type="button" onClick={() => setReconcileTarget(preset)}
                                                className={`flex-shrink-0 text-[10px] font-medium rounded-lg border py-1 px-2 transition-colors ${reconcileTarget === preset ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-violet-600 border-violet-200 hover:bg-violet-50'}`}>
                                                {label}
                                            </button>
                                        );
                                    })}
                                    <div className="flex-1">
                                        <DatePickerElegante
                                            value={reconcileTarget}
                                            onChange={date => setReconcileTarget(date ? toInputDate(date) : null)}
                                            minDate={new Date()}
                                            theme="violet"
                                            size="sm"
                                            placeholder="Scegli data…"
                                            clearable={false}
                                            quickPresets={
                                                reconcilableGroups
                                                    .filter(r => !!r.suggestedDate)
                                                    .map(r => ({ label: r.prestazioneName.substring(0, 12), date: toLocalMidnight(r.suggestedDate!) }))
                                                    .slice(0, 4)
                                            }
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        disabled={!reconcileTarget || reconciliaMutation.isPending}
                                        onClick={handleReconcile}
                                        className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold px-3 py-1 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                                    >
                                        {reconciliaMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitMerge className="h-3 w-3" />}
                                        Applica
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Piano rows */}
                        {pianoExpanded && (
                            <ul className="divide-y divide-gray-100 border-t border-gray-100">
                                {pianoRows.map(row => {
                                    const isEditing = editingId === row.itemId;
                                    const hasSuggestionDiff = row.suggestedDate && row.currentDate && diffDays(row.suggestedDate, row.currentDate) > 3;
                                    const hasHistoryDate = !!row.lastExecutedDate;

                                    const badge = (() => {
                                        switch (row.statusKind) {
                                            case 'scaduta': return { bg: 'bg-red-100 text-red-700 border-red-200', label: 'Scaduta', Icon: AlertTriangle };
                                            case 'urgente': return { bg: 'bg-amber-100 text-amber-700 border-amber-200', label: `${row.statusDays}gg`, Icon: AlertTriangle };
                                            case 'prenotata': return { bg: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Prenotata', Icon: Calendar };
                                            case 'in_regola': return { bg: 'bg-teal-100 text-teal-700 border-teal-200', label: `${row.statusDays}gg`, Icon: CheckCircle2 };
                                            case 'eseguita': return { bg: 'bg-gray-100 text-gray-500 border-gray-200', label: 'Eseguita', Icon: CheckCircle2 };
                                            default: return null;
                                        }
                                    })();

                                    return (
                                        <li key={row.itemId} className="px-4 py-2.5 space-y-1.5">
                                            {/* Header: name + periodicità + badge */}
                                            <div className="flex items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-xs font-semibold text-gray-800 leading-tight">{row.prestazioneName}</span>
                                                        {/* P72_14: badge tipo/obbligatoria */}
                                                        {row.prestazioneTipo === 'VISITA_MEDICINA_LAVORO' && (
                                                            <span className="inline-flex items-center px-1 py-0 rounded border text-[9px] font-semibold bg-teal-50 text-teal-600 border-teal-200 whitespace-nowrap">V.M.L.</span>
                                                        )}
                                                        {row.prestazioneTipo !== 'VISITA_MEDICINA_LAVORO' && !row.isObbligatoria && (
                                                            <span className="inline-flex items-center px-1 py-0 rounded border text-[9px] font-medium bg-gray-50 text-gray-400 border-gray-200 whitespace-nowrap">facolt.</span>
                                                        )}
                                                    </div>
                                                    {row.periodicitaMesi > 0 && (
                                                        <span className="text-[10px] text-gray-400">ogni {row.periodicitaMesi} mesi</span>
                                                    )}
                                                    {hasHistoryDate && (
                                                        <span className="ml-2 text-[10px] text-slate-500">
                                                            ultima esecuzione {formatDateShort(row.lastExecutedDate!)}
                                                        </span>
                                                    )}
                                                </div>
                                                {badge && (
                                                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap flex-shrink-0 ${badge.bg}`}>
                                                        <badge.Icon className="h-2.5 w-2.5" />{badge.label}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Date row — P72_20: hidden if Non Programmare */}
                                            {nonProgrammareIds.includes(row.itemId) ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                                        <Ban className="h-2.5 w-2.5" />
                                                        Non programmata
                                                    </span>
                                                </div>
                                            ) : !isEditing ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                                                        {editDates[row.itemId] ? (
                                                            // P73: se la data auto-applicata coincide con suggestedDate, mostra con stile "calcolata"
                                                            editDates[row.itemId] === row.suggestedDate ? (
                                                                <span className="text-xs text-teal-600 font-medium" title={`Calcolata: data visita + ${row.periodicitaMesi} mesi`}>
                                                                    {formatDateShort(editDates[row.itemId])}
                                                                    <span className="ml-1 text-[9px] text-teal-400">calcolata</span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-gray-700 font-medium">{formatDateShort(editDates[row.itemId])}</span>
                                                            )
                                                        ) : row.currentDate ? (
                                                            <span className="text-xs text-gray-700 font-medium">{formatDateShort(row.currentDate)}</span>
                                                        ) : row.suggestedDate ? (
                                                            // P72_10: mostra la data prevista dal ciclo anche quando non c'è scadenza aperta (statusKind='eseguita')
                                                            <span className="text-xs text-teal-600 font-medium" title="Data prossima prevista (calcolata da ultima esecuzione + periodicità)">
                                                                {formatDateShort(row.suggestedDate)}
                                                                <span className="ml-1 text-[9px] text-teal-400">prevista</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">Data non pianificata</span>
                                                        )}
                                                        {hasSuggestionDiff && row.suggestedDate && (
                                                            <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                                → {scheduleFromCurrentVisit ? 'calcolata' : 'da storico'}: {formatDateShort(row.suggestedDate)}
                                                            </span>
                                                        )}
                                                        {!scheduleFromCurrentVisit && row.suggestedDate && !row.currentDate && (
                                                            <span className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                                prossima da storico: {formatDateShort(row.suggestedDate)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {row.openScadenzaId && !isReadonly && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingId(row.itemId);
                                                                // P72_22: NON sovrascrivere l'override già impostato dall'utente con la data calcolata.
                                                                // Se editDates[row.itemId] è già presente, mantienilo invariato.
                                                                setEditDates(prev => {
                                                                    if (prev[row.itemId]) return prev; // mantieni override esistente
                                                                    return {
                                                                        ...prev,
                                                                        [row.itemId]: row.suggestedDate
                                                                            ?? (row.currentDate ? toInputDate(toLocalMidnight(row.currentDate)) : null)
                                                                            ?? (scheduleFromCurrentVisit ? toInputDate(addMonths(visitDate, row.periodicitaMesi)) : toInputDate(new Date())),
                                                                    };
                                                                });
                                                            }}
                                                            className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                                                            title="Modifica data"
                                                        >
                                                            <Edit3 className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                /* P72_13: inline date editor, wrapper rimosso per compattezza */
                                                <div className="flex items-center gap-1.5">
                                                    <DatePickerElegante
                                                        value={editDates[row.itemId] ? toLocalMidnight(editDates[row.itemId]) : null}
                                                        onChange={date => date && setEditDates(prev => ({ ...prev, [row.itemId]: toInputDate(date) }))}
                                                        minDate={new Date()}
                                                        theme="teal"
                                                        size="sm"
                                                        compact={true}
                                                        clearable={false}
                                                        placeholder="Seleziona data…"
                                                        className="flex-1"
                                                        quickPresets={[
                                                            { label: '3 mesi', date: addMonths(visitDate, 3) },
                                                            { label: '6 mesi', date: addMonths(visitDate, 6) },
                                                            { label: '1 anno', date: addMonths(visitDate, 12) },
                                                            { label: '2 anni', date: addMonths(visitDate, 24) },
                                                            { label: '3 anni', date: addMonths(visitDate, 36) },
                                                            ...(row.suggestedDate ? [{ label: '✓ Calcolata', date: toLocalMidnight(row.suggestedDate) }] : []),
                                                        ]}
                                                    />
                                                    <button type="button"
                                                        disabled={!editDates[row.itemId] || patchMutation.isPending}
                                                        onClick={() => handleSaveDate(row)}
                                                        className="flex-shrink-0 h-7 px-2.5 flex items-center gap-1 text-[10px] font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                                                    >
                                                        {patchMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salva'}
                                                    </button>
                                                    <button type="button" onClick={() => setEditingId(null)}
                                                        className="flex-shrink-0 h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* P72_19+: "Non programmare" per TUTTE le prestazioni (obbligatorie e facoltative) */}
                                            {!isReadonly && onNonProgrammareChange && (
                                                <label className="flex items-center gap-1.5 cursor-pointer mt-0.5 select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={nonProgrammareIds.includes(row.itemId)}
                                                        onChange={() => toggleNonProgrammare(row.itemId)}
                                                        className="w-3 h-3 rounded border-gray-300 accent-red-500 cursor-pointer"
                                                    />
                                                    <span className={`text-[10px] flex items-center gap-1 ${nonProgrammareIds.includes(row.itemId) ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                                        <Ban className="h-2.5 w-2.5" />
                                                        Non programmare{!row.isObbligatoria ? '' : ' (obbligatoria)'}
                                                    </span>
                                                </label>
                                            )}
                                        </li>
                                    );
                                })}

                                {/* P72_15 Task 6: Prestazioni aggiunte durante la visita (non nel protocollo) */}
                                {prestazioniAggiuntiveExtra.map(p => {
                                    const isNonProgrammare = nonProgrammareIds.includes(p.id);
                                    const isQ = (p as any).isQuestionario === true;
                                    const aggiuntiveDate = editDates[p.id] || null;
                                    return (
                                        <li key={`aggiunta-${p.id}`} className={`px-4 py-2.5 space-y-1.5 ${isQ ? 'bg-violet-50/40' : 'bg-blue-50/40'}`}>
                                            <div className="flex items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-xs font-semibold text-gray-800 leading-tight">{p.nome}</span>
                                                        {isQ ? (
                                                            <span className="inline-flex items-center px-1 py-0 rounded border text-[9px] font-medium bg-violet-50 text-violet-600 border-violet-200 whitespace-nowrap">questionario</span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-1 py-0 rounded border text-[9px] font-medium bg-blue-50 text-blue-600 border-blue-200 whitespace-nowrap">aggiunta</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-gray-400">
                                                        {isQ ? 'questionario compilato in questa visita' : 'da programmare alla chiusura visita'}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* P72_19+: Date picker per programmare la scadenza dell'aggiunta/questionario */}
                                            {!isReadonly && !isNonProgrammare && (
                                                <div className="pt-0.5">
                                                    <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                                        {isQ ? 'Prossima verifica' : 'Data scadenza'}
                                                    </label>
                                                    <DatePickerElegante
                                                        value={aggiuntiveDate}
                                                        onChange={(date) =>
                                                            setEditDates(prev => ({
                                                                ...prev,
                                                                [p.id]: date ? toInputDate(date) : ''
                                                            }))
                                                        }
                                                        minDate={visitDate}
                                                        theme={isQ ? 'violet' : 'blue'}
                                                        size="sm"
                                                        quickPresets={[
                                                            { label: '6 mesi', date: addMonths(visitDate, 6) },
                                                            { label: '1 anno', date: addMonths(visitDate, 12) },
                                                            { label: '2 anni', date: addMonths(visitDate, 24) },
                                                        ]}
                                                    />
                                                </div>
                                            )}
                                            {isReadonly && aggiuntiveDate && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                                    <Calendar className="h-3 w-3 text-gray-400" />
                                                    <span>{formatDateShort(aggiuntiveDate)}</span>
                                                </div>
                                            )}
                                            {/* Non programmare checkbox — sempre visibile per le prestazioni aggiunte */}
                                            {!isReadonly && onNonProgrammareChange && (
                                                <label className="flex items-center gap-1.5 cursor-pointer mt-0.5 select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={isNonProgrammare}
                                                        onChange={() => {
                                                            if (!isNonProgrammare) {
                                                                // Quando si marca NP, rimuove la data già impostata
                                                                setEditDates(prev => {
                                                                    const next = { ...prev };
                                                                    delete next[p.id];
                                                                    return next;
                                                                });
                                                            }
                                                            toggleNonProgrammare(p.id);
                                                        }}
                                                        className="w-3 h-3 rounded border-gray-300 accent-red-500 cursor-pointer"
                                                    />
                                                    <span className={`text-[10px] flex items-center gap-1 ${isNonProgrammare ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                                        <Ban className="h-2.5 w-2.5" />
                                                        Non programmare
                                                    </span>
                                                </label>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}

                {/* Suggested source info (non-MDL or if MDL overrides via template/prestazione) */}
                {suggested && !isReadonly && suggested.source !== 'mdl_tipo' && suggested.source !== 'sorveglianza' && !pianoRows.length && (
                    <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                        <Info className="h-3.5 w-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                        <span>
                            Data suggerita automaticamente da{' '}
                            <span className="font-medium text-blue-700">
                                {suggested.source === 'template' ? 'template visita' : 'configurazione prestazione'}
                            </span>
                            {' '}({suggested.mesi} {suggested.mesi === 1 ? 'mese' : 'mesi'}).
                            Puoi modificarla se necessario.
                        </span>
                    </div>
                )}

                {/* Date picker — nascosto per MDL quando il piano di sorveglianza è disponibile */}
                {!(isMDL && (pianoRows.length + prestazioniAggiuntiveExtra.length) > 0) && (
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                            Data prossima visita
                            {isOneTimeMDL && !isReadonly && (
                                <span className="ml-1 text-amber-600 font-normal">(opzionale per questo tipo)</span>
                            )}
                        </label>
                        {isReadonly ? (
                            <div className="flex items-center gap-2 h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {prossimoControllo
                                    ? formatDateIT(prossimoControllo)
                                    : <span className="text-gray-400 italic">Non impostata</span>
                                }
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex gap-2 items-center">
                                    <DatePickerElegante
                                        value={prossimoControllo}
                                        onChange={date => onChange(date ? toInputDate(date) : null)}
                                        minDate={new Date()}
                                        theme="teal"
                                        size="md"
                                        className="flex-1"
                                        quickPresets={[
                                            { label: '3 mesi', date: addMonths(visitDate, 3) },
                                            { label: '6 mesi', date: addMonths(visitDate, 6) },
                                            { label: '1 anno', date: addMonths(visitDate, 12) },
                                            { label: '2 anni', date: addMonths(visitDate, 24) },
                                        ]}
                                    />
                                    {(prossimoControllo || suggested) && (
                                        <button
                                            type="button"
                                            onClick={() => suggested ? onChange(toInputDate(suggested.date)) : onChange(null)}
                                            title={suggested ? `Ripristina a ${toInputDate(suggested.date)}` : 'Cancella data'}
                                            className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* Human-readable date */}
                        {prossimoControllo && (
                            <p className="mt-1 text-xs text-gray-400">
                                {formatDateIT(prossimoControllo)}
                            </p>
                        )}
                    </div>
                )}

                {/* Source badge when suggested matches current value */}
                {suggested && prossimoControllo && toInputDate(suggested.date) === prossimoControllo && !pianoRows.length && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full border border-gray-200 text-gray-600 font-medium">
                            {suggested.source === 'template' ? '📋 Da template' :
                                suggested.source === 'sorveglianza' ? '🩺 Da protocollo sanitario' :
                                    suggested.source === 'mdl_tipo' ? '⚕️ Da tipo visita MDL' :
                                        '⚕️ Da prestazione'}
                        </span>
                        <span className="text-gray-400">— {suggested.mesi} {suggested.mesi === 1 ? 'mese' : 'mesi'} dalla visita</span>
                    </div>
                )}

                {/* Note follow-up */}
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        {isMDL ? 'Note per il prossimo accertamento' : 'Indicazioni per il prossimo controllo'}{' '}
                        <span className="font-normal text-gray-400">(opzionale)</span>
                    </label>
                    {isReadonly ? (
                        noteFollowup ? (
                            <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                {noteFollowup}
                            </p>
                        ) : (
                            <p className="text-xs text-gray-400 italic">Nessuna indicazione</p>
                        )
                    ) : (
                        <textarea
                            value={noteFollowup || ''}
                            onChange={e => onNoteChange(e.target.value || null)}
                            placeholder={isMDL
                                ? 'Es. Risultati esami ematochimici da verificare, spirometria da ripetere, cambio mansione in corso…'
                                : 'Es. Portare risultati esami del sangue, ripetere spirometria…'}
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none placeholder:text-gray-400"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
