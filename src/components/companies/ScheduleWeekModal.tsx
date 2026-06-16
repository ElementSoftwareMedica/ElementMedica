/**
 * ScheduleWeekModal — Modale per programmazione visite mediche MDL
 * con vista settimanale degli slot disponibilità del medico.
 *
 * Features:
 * - Navigazione settimanale Lun-Sab con frecce veloce
 * - DateRangeCalendar inline per selezione intervallo custom
 * - Griglia oraria con slot disponibili dal medico scelto
 * - Click su slot libero → assegna alla prossima persona non assegnata
 * - Click su cella vuota → form per aggiungere disponibilità + selezione ambulatorio
 * - Submit invia programmazione al backend
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import {
    ChevronLeft, ChevronRight, CalendarDays, Loader2, CalendarPlus,
    X, CheckCircle2, Plus, AlertTriangle, Clock, ChevronDown, ChevronUp, CalendarCheck
} from 'lucide-react';
import { apiGet, apiPost } from '@/api/api';
import { slotsApi, ambulatoriApi } from '@/services/clinicaApi';
import { DateRangeCalendar } from '@/components/ui/DateRangeCalendar';
import type { DateRange } from '@/components/ui/DateRangeCalendar';
import { ElegantSelect } from '@/components/ui/ElegantSelect';
import { useToast } from '@/hooks/useToast';
import { useTenantMode } from '@/contexts/TenantModeContext';
import { cn } from '@/design-system/utils';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Lunedì della settimana corrente (o della settimana contenente la data fornita) */
function getMonday(d: Date): Date {
    const c = new Date(d);
    const day = c.getDay(); // 0=Dom
    const diff = (day === 0 ? -6 : 1 - day);
    c.setDate(c.getDate() + diff);
    c.setHours(0, 0, 0, 0);
    return c;
}

/** Usa data LOCALE — evita UTC shift: per utenti Italy UTC+1, .toISOString() darebbe il giorno precedente */
function toISO(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
    const c = new Date(d);
    c.setDate(c.getDate() + n);
    return c;
}

const GIORNI_BREVI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MESI_BREVI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const DEFAULT_DURATA = 10;
/** Altezza fissa in pixel per ogni riga oraria: garantisce che i chip si espandano proporzionalmente alla durata */
const ROW_H_PX = 32;

/** Tronca nome se non ci sta nello slot: "Cognome Nome" o "Cognome N." */
function formatSlotName(lastName: string, firstName: string, maxChars = 20): string {
    const full = `${lastName} ${firstName}`;
    return full.length <= maxChars ? full : `${lastName} ${(firstName || '').charAt(0)}.`;
}

/** Genera time labels 07:00 → 20:00 ogni 10m (divisioni fisse 10 min per visibilità sub-slot) */
const TIME_ROWS: string[] = [];
for (let h = 7; h <= 20; h++) {
    for (let m = 0; m < 60; m += 10) {
        if (h === 20 && m > 0) break;
        TIME_ROWS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface MedicoOption {
    id: string;
    fullName: string;
    isNominatoPerAzienda: boolean;
    isMedicoCompetentePrincipale?: boolean;
    isCoordinato?: boolean;
}

export interface PersoneItem {
    personId: string;
    firstName: string;
    lastName: string;
    mansione?: { id: string; nome: string };
    accertamenti?: { id: string; nome: string; isObbligatoria: boolean; periodicita?: string | null; periodicitaCustomMesi?: number | null; ultimaEsecuzione?: string | null; dataScadenza?: string | null }[];
    ultimaVisita?: string | null;
    prossimaVisita?: string | null;
    protocollo?: { periodicitaMesi?: number } | null;
    isPrimaVisita?: boolean; // Se true → tipoVisitaMDL = PREVENTIVA (prima visita), altrimenti PERIODICA
}
type PersoneAccertamento = NonNullable<PersoneItem['accertamenti']>[number];

interface SlotItem {
    id: string | null;
    oraInizio: string;
    oraFine: string;
    durataEffettiva: number;
    disponibile: boolean;
    fonte?: string;
    ambulatorioId?: string;
}

/** Appuntamento già prenotato in questo slot (per visualizzazione occupato in grigio) */
interface AppuntamentoSlot {
    id: string;
    oraInizio: string;
    oraFine: string;
    durataMinuti: number;
    ambulatorioId?: string;
    pazienteNome: string;
    aziendaNome?: string | null;
}

interface Assignment {
    personIdx: number;
    date: string;
    oraInizio: string;
    dataOra: string;
    ambulatorioId?: string;
}

interface AddSlotCell {
    date: string;
    oraInizio: string;
    oraFine?: string;  // optional override (drag creates custom range)
}

interface DragState {
    date: string;
    startIdx: number;
    endIdx: number;
}

export interface ScheduleWeekModalProps {
    companyId: string;
    persone: PersoneItem[];
    defaultMedicoId?: string;
    onClose: () => void;
    onSuccess: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ScheduleWeekModal: React.FC<ScheduleWeekModalProps> = ({
    companyId, persone, defaultMedicoId, onClose, onSuccess
}) => {
    const { showToast } = useToast();
    const { getOperateHeaders } = useTenantMode();
    const operateHeaders = getOperateHeaders();
    const queryClient = useQueryClient();

    // ── Settimana corrente ──────────────────────────────────────────
    const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
    const [showCalendar, setShowCalendar] = useState(false);
    const [calRange, setCalRange] = useState<DateRange>({ start: null, end: null });

    // ── Medico ─────────────────────────────────────────────────────
    const [medicoId, setMedicoId] = useState(defaultMedicoId ?? '');
    // Forza la visualizzazione di tutti i Medici del Lavoro del tenant (non solo MC/coordinati azienda)
    const [includeAllMdl, setIncludeAllMdl] = useState(false);

    // ── Fascia oraria (filtro visualizzazione griglia) ─────────────
    const [timeRange, setTimeRange] = useState<'all' | 'morning' | 'afternoon'>('all');

    const { data: mediciData, isLoading: mediciLoading } = useQuery({
        queryKey: [`schedule-medici-${companyId}`, includeAllMdl],
        queryFn: async () => {
            const r = await apiGet<{ medici: MedicoOption[] }>(
                `/api/v1/companies/${companyId}/sorveglianza-sanitaria/medici-disponibili${includeAllMdl ? '?includeAllMdl=true' : ''}`
            );
            return r.medici ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const medici = mediciData ?? [];
    React.useEffect(() => {
        if (medici.length > 0 && !medicoId) {
            // Pre-seleziona il medico competente principale dell'azienda; poi un nominato; poi il primo.
            const principale = medici.find(m => m.isMedicoCompetentePrincipale);
            const nom = medici.find(m => m.isNominatoPerAzienda);
            setMedicoId(principale?.id ?? nom?.id ?? medici[0].id);
        }
    }, [medici, medicoId]);

    // ── Giorni della settimana selezionata ──────────────────────────
    const weekDays: Date[] = useMemo(() => {
        return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
    }, [weekStart]);

    const prevWeek = () => setWeekStart(d => addDays(d, -7));
    const nextWeek = () => setWeekStart(d => addDays(d, 7));

    const handleCalRange = (range: DateRange) => {
        setCalRange(range);
        if (range.start) {
            setWeekStart(getMonday(range.start));
        }
        if (range.start && range.end) setShowCalendar(false);
    };

    // ── Fetch slot per tutti i giorni della settimana ───────────────
    const { data: allSlots, isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
        queryKey: ['schedule-week-slots', companyId, medicoId, toISO(weekStart)],
        queryFn: async () => {
            if (!medicoId) return { slots: {}, appuntamenti: {} };
            const slotsResult: Record<string, SlotItem[]> = {};
            const apptstResult: Record<string, AppuntamentoSlot[]> = {};
            await Promise.all(
                weekDays.map(async (d) => {
                    const iso = toISO(d);
                    try {
                        const r = await apiGet<{ slots: SlotItem[]; appuntamenti: AppuntamentoSlot[] }>(
                            `/api/v1/companies/${companyId}/sorveglianza-sanitaria/slot-disponibili` +
                            `?medicoId=${medicoId}&data=${iso}&durataMins=${DEFAULT_DURATA}&personeCount=1`
                        );
                        slotsResult[iso] = r.slots ?? [];
                        apptstResult[iso] = r.appuntamenti ?? [];
                    } catch {
                        slotsResult[iso] = [];
                        apptstResult[iso] = [];
                    }
                })
            );
            return { slots: slotsResult, appuntamenti: apptstResult };
        },
        enabled: !!medicoId,
        staleTime: 30 * 1000,
    });

    const slotsPerDay: Record<string, SlotItem[]> = allSlots?.slots ?? {};
    const appuntamentiPerDay: Record<string, AppuntamentoSlot[]> = allSlots?.appuntamenti ?? {};

    // ── Assegnazioni persona → slot (declared before timeRows so it can be used in the memo) ────
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [duratePersone, setDuratePersone] = useState<number[]>(() => persone.map(() => DEFAULT_DURATA));

    // ── Righe orarie: time slots unici da tutti i giorni ─────────────
    const timeRows: string[] = useMemo(() => {
        const fromSlots = new Set<string>();
        Object.values(slotsPerDay).forEach(slots =>
            slots.forEach(s => fromSlots.add(s.oraInizio))
        );
        // Include anche le righe di start degli appuntamenti esistenti
        Object.values(appuntamentiPerDay).forEach(apts =>
            apts.forEach(a => fromSlots.add(a.oraInizio))
        );
        // Include assignment times so non-standard times (e.g. 09:25 from 15-min durations)
        // always have a visible row in the calendar grid
        assignments.forEach(a => fromSlots.add(a.oraInizio));
        // Default grid range base (08:00-19:50 in 10-min grid)
        const defaultSlice = TIME_ROWS.filter(t => t >= '08:00' && t <= '18:00');
        if (fromSlots.size === 0) {
            return defaultSlice.filter(applyTimeRange);
        }
        // Merge with base grid so empty-cell clicks work on all 10-min intervals
        const merged = new Set([...Array.from(fromSlots), ...defaultSlice]);
        // Apply time range filter
        return Array.from(merged).sort().filter(applyTimeRange);

        function applyTimeRange(t: string): boolean {
            if (timeRange === 'all') return true;
            const [h, m] = t.split(':').map(Number);
            const mins = h * 60 + m;
            if (timeRange === 'morning') return mins >= 7 * 60 && mins < 13 * 60;
            if (timeRange === 'afternoon') return mins >= 13 * 60 && mins < 20 * 60;
            return true;
        }
    }, [slotsPerDay, appuntamentiPerDay, assignments, timeRange]);

    const [expandedIdx, setExpandedIdx] = useState<Set<number>>(new Set());
    // P72_13: tipo visita MDL per-persona — override selezionabile dall'utente
    const isDateInMdlWindow = useCallback((value: string | null | undefined, reference = new Date()): boolean => {
        if (!value) return false;
        const due = new Date(value);
        if (Number.isNaN(due.getTime())) return false;
        due.setHours(0, 0, 0, 0);
        const start = new Date(reference);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 60);
        const end = new Date(reference);
        end.setHours(23, 59, 59, 999);
        end.setDate(end.getDate() + 30);
        return due >= start && due <= end;
    }, []);
    const getAccertamentoScadenza = useCallback((acc: PersoneAccertamento): Date | null => {
        if (acc.dataScadenza) {
            const explicit = new Date(acc.dataScadenza);
            return Number.isNaN(explicit.getTime()) ? null : explicit;
        }
        const mesi = periodicitaToMesi(acc.periodicita, acc.periodicitaCustomMesi);
        if (!mesi || !acc.ultimaEsecuzione) return null;
        const scadenza = new Date(acc.ultimaEsecuzione);
        scadenza.setMonth(scadenza.getMonth() + mesi);
        return scadenza;
    }, []);
    const hasDueAccertamenti = useCallback((p: PersoneItem): boolean =>
        (p.accertamenti ?? []).some(acc => acc.isObbligatoria && isDateInMdlWindow(getAccertamentoScadenza(acc)?.toISOString())),
        [getAccertamentoScadenza, isDateInMdlWindow]
    );
    const getDefaultTipoVisitaMDL = useCallback((p: PersoneItem): string => {
        if (p.isPrimaVisita || !p.ultimaVisita) return 'PREVENTIVA';
        return hasDueAccertamenti(p) ? 'PERIODICA' : 'STRAORDINARIA';
    }, [hasDueAccertamenti]);
    const isMainMdlPrestazione = useCallback((name?: string | null): boolean =>
        /visita\s+medica.*lavoro|medicina\s+del\s+lavoro|visita.*lavoro/i.test(name || ''),
        []
    );
    const getSortedAccertamenti = useCallback((p: PersoneItem): PersoneAccertamento[] =>
        [...(p.accertamenti ?? [])].sort((a, b) => {
            const mainDiff = Number(isMainMdlPrestazione(b.nome)) - Number(isMainMdlPrestazione(a.nome));
            if (mainDiff !== 0) return mainDiff;
            const requiredDiff = Number(b.isObbligatoria) - Number(a.isObbligatoria);
            if (requiredDiff !== 0) return requiredDiff;
            return a.nome.localeCompare(b.nome, 'it');
        }),
        [isMainMdlPrestazione]
    );
    const [tipoVisitaMDLOverrides, setTipoVisitaMDLOverrides] = useState<Record<number, string>>(
        () => Object.fromEntries(persone.map((p, i) => [i, getDefaultTipoVisitaMDL(p)]))
    );
    const toggleExpanded = (idx: number) => setExpandedIdx(prev => {
        const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n;
    });

    const nextUnassignedIdx = useMemo(() => {
        const assignedIdxs = new Set(assignments.map(a => a.personIdx));
        const idx = persone.findIndex((_, i) => !assignedIdxs.has(i));
        return idx >= 0 ? idx : null;
    }, [assignments, persone]);

    // activePersonIdx: persona selezionata manualmente per la prossima assegnazione
    // null = auto (usa nextUnassignedIdx), numero = persona specifica
    const [activePersonIdx, setActivePersonIdx] = useState<number | null>(null);

    // Effettivo target per la prossima assegnazione click
    const targetPersonIdx = activePersonIdx ?? nextUnassignedIdx;

    const handleClickSlot = useCallback((date: string, slot: SlotItem, rowTime?: string) => {
        if (targetPersonIdx === null) return;
        const actualTime = rowTime ?? slot.oraInizio;
        // Use local datetime → correct UTC via browser timezone
        const dataOra = new Date(`${date}T${actualTime}:00`).toISOString();
        setAssignments(prev => {
            const filtered = prev.filter(a => !(a.date === date && a.oraInizio === actualTime));
            return [
                ...filtered,
                {
                    personIdx: targetPersonIdx,
                    date,
                    oraInizio: actualTime,
                    dataOra,
                    ambulatorioId: slot.ambulatorioId,
                }
            ].sort((a, b) => a.personIdx - b.personIdx);
        });
        // After manual assignment, reset manual selection (auto-advance)
        setActivePersonIdx(null);
    }, [targetPersonIdx]);

    const removeAssignment = (personIdx: number) => {
        setAssignments(prev => prev.filter(a => a.personIdx !== personIdx));
    };

    /**
     * Assegna tutte le persone non assegnate al giorno iso in modo intelligente.
     * Usa scheduling consecutivo con la durata effettiva di ciascuna persona:
     * persona 1 → 09:00 (15 min), persona 2 → 09:15, persona 3 → 09:30, …
     * Permette sub-slot: se persona 1 ha 15 min, la successiva parte da 09:15
     * anche se lo slot DB inizia alle 09:00. Controlla che il tempo calcolato
     * ricada all'interno di una finestra slot disponibile.
     */
    const bookAllForDay = useCallback((iso: string) => {
        // Slot del giorno ordinati per oraInizio (supporta finestre ampie e sub-slot)
        const daySlots = (slotsPerDay[iso] ?? []).filter(s => s.disponibile)
            .sort((a, b) => a.oraInizio.localeCompare(b.oraInizio));
        if (daySlots.length === 0) {
            showToast({ message: 'Nessuno slot disponibile in questo giorno', type: 'error' }); return;
        }

        const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const toTimeStr = (mins: number) =>
            `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

        /**
         * Merge consecutive/overlapping slots into contiguous availability windows.
         * This ensures that a 15-min appointment fits even if the grid is sliced into 10-min buckets.
         */
        interface Window { start: number; end: number; ambulatorioId?: string }
        const mergedWindows: Window[] = [];
        for (const slot of daySlots) {
            const s = toMins(slot.oraInizio);
            const e = toMins(slot.oraFine);
            const last = mergedWindows[mergedWindows.length - 1];
            if (!last || last.end < s) {
                mergedWindows.push({ start: s, end: e, ambulatorioId: slot.ambulatorioId ?? undefined });
            } else {
                // Extend current window; prefer first ambulatorioId
                last.end = Math.max(last.end, e);
            }
        }

        const unassigned = persone.map((_, i) => i).filter(i => !assignments.find(a => a.personIdx === i));
        if (unassigned.length === 0) {
            showToast({ message: 'Tutte le persone sono già assegnate', type: 'info' }); return;
        }

        // Calcola fine degli slot già assegnati nel giorno, per trovare il punto di partenza
        const existingEnds = assignments.filter(a => a.date === iso).map(a => {
            const dur = duratePersone[a.personIdx] || DEFAULT_DURATA;
            return toMins(a.oraInizio) + dur;
        });
        let cursor = existingEnds.length > 0 ? Math.max(...existingEnds) : mergedWindows[0].start;

        const newAssignments = [...assignments];
        let booked = 0;

        for (const personIdx of unassigned) {
            const dur = duratePersone[personIdx] || DEFAULT_DURATA;

            // Trova la finestra che copre cursor (o la prossima disponibile) e ci fa entrare la durata.
            // Il cursore è sempre allineato alle righe della griglia (multiplo di DEFAULT_DURATA)
            // per garantire che ogni chip sia visibile nel calendario.
            let placed = false;
            for (const win of mergedWindows) {
                const actualStart = Math.max(cursor, win.start);
                if (actualStart + dur <= win.end) {
                    const newOraInizio = toTimeStr(actualStart);
                    newAssignments.push({
                        personIdx, date: iso,
                        oraInizio: newOraInizio,
                        dataOra: new Date(`${iso}T${newOraInizio}:00`).toISOString(),
                        ambulatorioId: win.ambulatorioId,
                    });
                    // Use exact end time as cursor: preserves real scheduling density
                    // (assignment rows are dynamically injected into timeRows below)
                    cursor = actualStart + dur;
                    booked++;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                // Nessuna finestra libera per questa persona; avanza il cursore alla prossima finestra
                const nextWin = mergedWindows.find(w => w.start > cursor);
                if (nextWin) cursor = nextWin.start;
            }
        }

        setAssignments(newAssignments.sort((a, b) => a.personIdx - b.personIdx));
        const remaining = unassigned.length - booked;
        if (remaining > 0)
            showToast({ message: `${booked} assegnati, ${remaining} senza spazio nel giorno`, type: 'info' });
    }, [slotsPerDay, persone, assignments, duratePersone, showToast]);

    // ── Aggiungi slot (cella vuota / drag) ────────────────────────────
    const [addSlotCell, setAddSlotCell] = useState<AddSlotCell | null>(null);
    const [newSlotAmbId, setNewSlotAmbId] = useState('');
    const [dragState, setDragState] = useState<DragState | null>(null);
    // Stato per overbooking su slot occupato: conferma inline
    const [overbookingTarget, setOverbookingTarget] = useState<{
        date: string; time: string; slot: SlotItem | undefined; pazienteNome: string;
    } | null>(null);

    const { data: ambulatoriData } = useQuery({
        queryKey: ['ambulatori-list'],
        queryFn: () => ambulatoriApi.getAll({ limit: 100 }),
        staleTime: 5 * 60 * 1000,
    });
    const ambulatori = ambulatoriData?.data ?? [];

    const addSlotMutation = useMutation({
        mutationFn: async ({ date, oraInizio, ambulatorioId, oraFine: customFine }: { date: string; oraInizio: string; ambulatorioId: string; oraFine?: string }) => {
            let oraFine = customFine;
            if (!oraFine) {
                const [h, m] = oraInizio.split(':').map(Number);
                const endMin = h * 60 + m + DEFAULT_DURATA;
                oraFine = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
            }
            return slotsApi.create({
                medicoId,
                ambulatorioId,
                data: date,
                oraInizio,
                oraFine,
                disponibile: true,
            });
        },
        onSuccess: () => {
            showToast({ message: 'Slot aggiunto', type: 'success' });
            setAddSlotCell(null);
            setNewSlotAmbId('');
            refetchSlots();
            // Sincronizza cache con /calendario e /disponibilita
            queryClient.invalidateQueries({ queryKey: ['slots-calendario'] });
            queryClient.invalidateQueries({ queryKey: ['slots-all'] });
            queryClient.invalidateQueries({ queryKey: ['slots-singoli'] });
        },
        onError: (e: any) => {
            const msg: string = e?.message ?? 'Errore aggiunta slot';
            // Scenario 1 (stesso ambulatorio): blocca con messaggio chiaro
            if (msg.toLowerCase().includes('stesso ambulatorio') || msg.toLowerCase().includes('sovrapposto')) {
                showToast({
                    message: msg.includes('ha già una disponibilità')
                        ? msg  // messaggio dettagliato dal backend
                        : 'Il medico ha già una disponibilità in questo orario e ambulatorio. Scegli un orario diverso o un altro ambulatorio.',
                    type: 'error'
                });
            } else {
                showToast({ message: msg, type: 'error' });
            }
            // Refetch slots to update coverage visualization after any conflict
            refetchSlots();
        },
    });

    const handleAddSlot = () => {
        if (!addSlotCell || !newSlotAmbId) return;
        addSlotMutation.mutate({ ...addSlotCell, ambulatorioId: newSlotAmbId });
    };

    // ── Submit ───────────────────────────────────────────────────────
    const [note, setNote] = useState('');
    const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

    /** Converte TipoPeriodicita enum → mesi (null = no periodicity / on-demand) */
    function periodicitaToMesi(p: string | null | undefined, customMesi?: number | null): number | null {
        if (p === 'SU_INDICAZIONE' || p === 'UNA_TANTUM') return null;
        if (p === 'MESI_6') return 6;
        if (p === 'MESI_12') return 12;
        if (p === 'MESI_24') return 24;
        if (p === 'MESI_36') return 36;
        if (p === 'MESI_60') return 60;
        // periodicita assente o custom: usa periodicitaCustomMesi (ad es. da scadenze MDL che
        // forniscono solo i mesi numerici senza l'enum stringa)
        return customMesi ?? null;
    }

    /**
     * Restituisce gli accertamenti dovuti per una singola persona (isObbligatoria + scaduti/mai eseguiti).
     * Usato sia per la UI che per la generazione delle note per persona.
     */
    const getAccertamentiDovuti = useCallback((p: PersoneItem) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return getSortedAccertamenti(p).filter(acc => {
            if (!acc.isObbligatoria) return false;
            if (acc.periodicita === 'UNA_TANTUM') return !acc.ultimaEsecuzione;
            const scadenza = getAccertamentoScadenza(acc);
            if (!scadenza) return false;
            return isDateInMdlWindow(scadenza.toISOString(), today);
        });
    }, [getAccertamentoScadenza, getSortedAccertamenti, isDateInMdlWindow]);

    /**
     * Genera la nota per una singola persona con i suoi accertamenti dovuti.
     * Viene usata sia nell'anteprima UI che nel payload di ogni appuntamento.
     */
    const computePersonNote = useCallback((p: PersoneItem): string => {
        const dovuti = getAccertamentiDovuti(p);
        if (dovuti.length === 0) return '';
        return `Accertamenti: ${dovuti.map(a => a.nome).join(', ')}`;
    }, [getAccertamentiDovuti]);

    /**
     * Anteprima aggregata per il box note (mostra tutti i pazienti → scopo informativo per il medico).
     * Ogni riga: "Cognome Nome: Acc1, Acc2"
     */
    const autoNote = useMemo(() => {
        if (persone.length === 0) return '';
        const lines = persone
            .map(p => {
                const pNote = computePersonNote(p);
                return pNote ? `${p.lastName} ${p.firstName}: ${pNote.replace('Accertamenti: ', '')}` : '';
            })
            .filter(Boolean);
        return lines.join('\n');
    }, [persone, computePersonNote]);

    const submitMutation = useMutation({
        mutationFn: async (opts: { isOverbooking?: boolean } = {}) => {
            const personeIds = persone.map(p => p.personId);
            // Spazia le persone non assegnate consecutivamente (non tutte a 09:00)
            let fallbackMinutes = 9 * 60; // 09:00
            const fallbackDate = toISO(weekDays[0]);
            const dataOraPerPersona = persone.map((_, idx) => {
                const a = assignments.find(as => as.personIdx === idx);
                if (a) return a.dataOra.endsWith('Z') || a.dataOra.includes('+') ? a.dataOra : a.dataOra + '.000Z';
                // Auto-space: incrementa per ogni persona non assegnata
                const h = Math.floor(fallbackMinutes / 60);
                const m = fallbackMinutes % 60;
                const localStr = `${fallbackDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
                const iso = new Date(localStr).toISOString();
                fallbackMinutes += duratePersone[idx] || DEFAULT_DURATA;
                return iso;
            });
            // Ambulatorio per ogni persona: da slot selezionato, null usa default del tenant
            const ambulatorioIdsPerPersona = persone.map((_, idx) => {
                const a = assignments.find(as => as.personIdx === idx);
                return a?.ambulatorioId ?? null;
            });
            // Note per persona: ogni paziente riceve SOLO i propri accertamenti dovuti
            // La nota globale (se presente) viene anteposta come contesto aggiuntivo
            const notePerPersona = persone.map(p => {
                const personNote = computePersonNote(p);
                const globalNote = note.trim();
                if (personNote && globalNote) return `${globalNote} | ${personNote}`;
                return personNote || globalNote || '';
            });
            // IDs delle prestazioni (accertamenti dovuti) per persona → create come AppuntamentoPrestazione
            const accertamentiPerPersona = persone.map(p =>
                getAccertamentiDovuti(p).map(a => a.id)
            );
            // P72_13: tipo visita MDL per persona — usa override scelto dall'utente nel pannello,
            // con fallback a PREVENTIVA (prima visita) o PERIODICA
            const tipoVisitaMDLPerPersona = persone.map((p, idx) =>
                tipoVisitaMDLOverrides[idx] ?? getDefaultTipoVisitaMDL(p)
            );
            return apiPost(`/api/v1/companies/${companyId}/sorveglianza-sanitaria/programma`, {
                personeIds,
                medicoId,
                dataOra: dataOraPerPersona[0],
                dataOraPerPersona,
                duratePersone,
                ambulatorioIdsPerPersona,
                isOverbooking: opts.isOverbooking ?? false,
                note: note.trim() || undefined,
                notePerPersona,
                accertamentiPerPersona,
                tipoVisitaMDLPerPersona,
            }, { headers: operateHeaders });
        },
        onSuccess: (r: any) => {
            setOverlapWarning(null);
            const d = r.data ?? r;
            const errori = d?.errori ?? 0;
            const programmati = d?.programmati ?? persone.length;
            let msg = `${programmati} visit${programmati === 1 ? 'a programmata' : 'e programmate'}`;
            if (errori > 0) msg += ` (${errori} error${errori === 1 ? 'e' : 'i'})`;
            showToast({ message: d?.message ?? msg, type: errori > 0 ? 'warning' : 'success' });
            queryClient.invalidateQueries({ queryKey: [`company-sorveglianza-${companyId}`] });
            queryClient.invalidateQueries({ queryKey: ['appuntamenti-calendario'] });
            queryClient.invalidateQueries({ queryKey: ['schedule-week-slots'] });
            onSuccess();
        },
        onError: (e: any) => {
            const msg: string = e?.message ?? e?.error ?? 'Errore programmazione';
            if (msg.toLowerCase().includes('conflict') || msg.toLowerCase().includes('sovrapposizione') || msg.toLowerCase().includes('existing appointment')) {
                // Conflitto rilevato → proponi overbooking
                setOverlapWarning(msg);
            } else {
                showToast({ message: msg, type: 'error' });
            }
        },
    });

    // ── UI Helpers ──────────────────────────────────────────────────
    /** Ritorna lo slot il cui oraInizio corrisponde ESATTAMENTE alla riga (chip di inizio slot). */
    const getSlotForCell = (date: string, time: string): SlotItem | undefined => {
        return (slotsPerDay[date] ?? []).find(s => s.oraInizio === time);
    };

    /**
     * Ritorna lo slot che COPRE il time (oraInizio <= time < oraFine) ma non inizia esattamente qui.
     * Usato per mostrare le righe "contenute" nel range di uno slot ampio (es. 09:00-17:00).
     */
    const getSlotCoveringCell = (date: string, time: string): SlotItem | undefined => {
        const toMinsLocal = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const timeMins = toMinsLocal(time);
        return (slotsPerDay[date] ?? []).find(s => {
            const start = toMinsLocal(s.oraInizio);
            const end = toMinsLocal(s.oraFine);
            return timeMins > start && timeMins < end; // strictly inside (not the start row)
        });
    };

    /** Ritorna l'appuntamento già prenotato che inizia ESATTAMENTE a questa riga. */
    const getOccupatoForCell = (date: string, time: string): AppuntamentoSlot | undefined => {
        return (appuntamentiPerDay[date] ?? []).find(a => a.oraInizio === time);
    };

    /** Ritorna l'appuntamento già prenotato che COPRE questa riga (richiesto > start && < end). */
    const getOccupatoCoveringCell = (date: string, time: string): AppuntamentoSlot | undefined => {
        const toMinsLocal = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const timeMins = toMinsLocal(time);
        return (appuntamentiPerDay[date] ?? []).find(a => {
            const start = toMinsLocal(a.oraInizio);
            const end = toMinsLocal(a.oraFine);
            return timeMins > start && timeMins < end;
        });
    };

    const getAssignment = (date: string, time: string) =>
        assignments.find(a => a.date === date && a.oraInizio === time);

    /** Restituisce un assignment che COPRE (ma non inizia in) questa riga oraria */
    const getAssignmentCovering = (date: string, time: string) => {
        const toM = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const timeMins = toM(time);
        return assignments.find(a => {
            if (a.date !== date) return false;
            const startMins = toM(a.oraInizio);
            const dur = duratePersone[a.personIdx] || DEFAULT_DURATA;
            return timeMins > startMins && timeMins < startMins + dur;
        }) ?? null;
    };

    /** Calcola il rowspan della td per un assignment che inizia a `time` */
    const getAssignmentRowSpan = (date: string, time: string): number => {
        const a = assignments.find(x => x.date === date && x.oraInizio === time);
        if (!a) return 1;
        const toM = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const endMins = toM(time) + (duratePersone[a.personIdx] || DEFAULT_DURATA);
        const startRowIdx = timeRows.indexOf(time);
        let span = 1;
        for (let i = startRowIdx + 1; i < timeRows.length; i++) {
            if (toM(timeRows[i]) < endMins) span++;
            else break;
        }
        return span;
    };

    const assignedByPerson = useMemo(() => {
        const map: Record<number, Assignment> = {};
        assignments.forEach(a => { map[a.personIdx] = a; });
        return map;
    }, [assignments]);

    const allAssigned = assignments.length >= persone.length;
    const weekLabel = useMemo(() => {
        const s = weekDays[0];
        const e = weekDays[5];
        if (s.getMonth() === e.getMonth()) {
            return `${s.getDate()} – ${e.getDate()} ${MESI_BREVI[s.getMonth()]} ${s.getFullYear()}`;
        }
        return `${s.getDate()} ${MESI_BREVI[s.getMonth()]} – ${e.getDate()} ${MESI_BREVI[e.getMonth()]} ${s.getFullYear()}`;
    }, [weekDays]);

    // ── Render ───────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col h-[88vh] max-h-[calc(100vh-2rem)]">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/30">
                            <CalendarPlus className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Programma visite mediche</h2>
                            <p className="text-xs text-gray-400">{persone.length} person{persone.length === 1 ? 'a' : 'e'} selezionat{persone.length === 1 ? 'a' : 'e'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-0 flex-1 overflow-hidden">
                    {/* ── Left sidebar ──────────────────────────────────────── */}
                    <div className="md:w-56 flex-shrink-0 p-4 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700 flex flex-col gap-4 overflow-y-auto">

                        {/* Medico selector */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Medico competente</label>
                            {mediciLoading ? (
                                <div className="flex items-center gap-1 text-xs text-gray-400 py-1"><Loader2 className="h-3 w-3 animate-spin" />Caricamento…</div>
                            ) : (
                                <ElegantSelect
                                    value={medicoId}
                                    onChange={setMedicoId}
                                    placeholder="Seleziona medico"
                                    options={medici.map(m => ({
                                        value: m.id,
                                        label: `${m.fullName}${m.isMedicoCompetentePrincipale ? ' — MC' : m.isCoordinato ? ' — coordinato' : ''}`
                                    }))}
                                />
                            )}
                            <label className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500 dark:text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={includeAllMdl}
                                    onChange={e => setIncludeAllMdl(e.target.checked)}
                                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 h-3.5 w-3.5"
                                />
                                Mostra tutti i Medici del Lavoro del tenant
                            </label>
                        </div>

                        {/* Persone + durata + accertamenti */}
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Persone ({assignments.length}/{persone.length})
                            </label>
                            <div className="space-y-1">
                                {persone.map((p, idx) => {
                                    const a = assignedByPerson[idx];
                                    const isNext = nextUnassignedIdx === idx;
                                    const isExpanded = expandedIdx.has(idx);
                                    const hasDetail = !!(p.mansione || (p.accertamenti?.length ?? 0) > 0 || p.ultimaVisita || p.prossimaVisita);
                                    return (
                                        <div key={p.personId} className={cn(
                                            'rounded-lg border text-xs transition-colors cursor-pointer',
                                            a ? 'border-teal-200 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-700'
                                                : activePersonIdx === idx ? 'border-blue-400 bg-blue-100 dark:bg-blue-900/30 dark:border-blue-500 ring-1 ring-blue-400'
                                                    : isNext ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700'
                                                        : 'border-gray-100 bg-gray-50 dark:bg-gray-700/30 dark:border-gray-700'
                                        )}
                                            onClick={() => {
                                                if (!a) setActivePersonIdx(prev => prev === idx ? null : idx);
                                            }}
                                            title={!a ? 'Clicca per selezionare questa persona per la prossima assegnazione' : undefined}>
                                            <div className="flex items-center gap-1 px-2 py-1.5">
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn('font-medium truncate', a ? 'text-teal-700 dark:text-teal-400' : isNext ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500')}>
                                                        {p.lastName} {p.firstName}
                                                    </p>
                                                    {a ? (
                                                        <p className="text-[10px] text-teal-500 font-mono">{a.date.split('-').slice(1).reverse().join('/')} {a.oraInizio}</p>
                                                    ) : (
                                                        <p className="text-[10px] text-gray-400">{isNext ? '← prossimo' : activePersonIdx === idx ? '← selezionato' : '—'}</p>
                                                    )}
                                                </div>
                                                {/* Durata per persona */}
                                                <select value={duratePersone[idx]}
                                                    onChange={e => setDuratePersone(prev => { const n = [...prev]; n[idx] = Number(e.target.value); return n; })}
                                                    title="Durata visita (min)"
                                                    className="w-[50px] text-[10px] border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex-shrink-0">
                                                    {[5, 10, 15, 20, 30, 45, 60].map(v => <option key={v} value={v}>{v}′</option>)}
                                                </select>
                                                {a && (
                                                    <button onClick={() => removeAssignment(idx)} title="Rimuovi assegnazione"
                                                        className="text-gray-300 hover:text-red-400 flex-shrink-0">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                )}
                                                {hasDetail && (
                                                    <button onClick={() => toggleExpanded(idx)} title="Accertamenti"
                                                        className="text-gray-300 hover:text-teal-500 flex-shrink-0">
                                                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                    </button>
                                                )}
                                            </div>
                                            {isExpanded && (
                                                <div className="px-2 pb-1.5 border-t border-gray-100 dark:border-gray-700 pt-1 space-y-0.5">
                                                    {/* P72_13: Tipo visita MDL — selezionabile per ogni persona */}
                                                    <div className="flex items-center gap-1.5 mb-0.5" onClick={e => e.stopPropagation()}>
                                                        <span className="text-[10px] text-gray-400 flex-shrink-0">Tipo visita:</span>
                                                        <div className="flex-1">
                                                            <ElegantSelect
                                                                value={tipoVisitaMDLOverrides[idx] ?? getDefaultTipoVisitaMDL(p)}
                                                                onChange={v => setTipoVisitaMDLOverrides(prev => ({ ...prev, [idx]: v }))}
                                                                options={[
                                                                    { value: 'PREVENTIVA', label: 'Preventiva (prima visita)' },
                                                                    { value: 'PERIODICA', label: 'Periodica' },
                                                                    { value: 'CAMBIO_MANSIONE', label: 'Cambio mansione' },
                                                                    { value: 'RIENTRO_MATERNITA', label: 'Rientro maternità' },
                                                                    { value: 'RIENTRO_ASSENZA_PER_MOTIVI_DI_SALUTE', label: 'Rientro da assenza' },
                                                                    { value: 'RICHIESTA_LAVORATORE', label: 'Su richiesta lavoratore' },
                                                                ]}
                                                            />
                                                        </div>
                                                    </div>
                                                    {p.mansione && <p className="text-[10px] font-medium text-gray-500">📋 {p.mansione.nome}</p>}
                                                    {(p.ultimaVisita || p.prossimaVisita) && (
                                                        <div className="flex gap-2 text-[10px] text-gray-400">
                                                            {p.ultimaVisita && (
                                                                <span>⏮ {new Date(p.ultimaVisita).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                                            )}
                                                            {p.prossimaVisita && (
                                                                <span className="text-teal-600 font-medium">⏭ {new Date(p.prossimaVisita).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {getSortedAccertamenti(p).map(acc => {
                                                        const today = new Date(); today.setHours(0, 0, 0, 0);
                                                        const scadenza = getAccertamentoScadenza(acc);
                                                        const isDue = acc.isObbligatoria && (acc.periodicita === 'UNA_TANTUM' ? !acc.ultimaEsecuzione : isDateInMdlWindow(scadenza?.toISOString(), today));
                                                        return (
                                                            <p key={acc.id} className={cn('text-[10px] flex items-start gap-1', isDue ? 'text-orange-500 dark:text-orange-400' : 'text-gray-400')}>
                                                                <span className={cn('flex-shrink-0 mt-px', acc.isObbligatoria ? isDue ? 'text-orange-500' : 'text-teal-500' : 'text-gray-300')}>•</span>
                                                                <span>
                                                                    {acc.nome}
                                                                    {!acc.isObbligatoria && <span className="opacity-70 ml-1">facoltativo</span>}
                                                                    {scadenza && (
                                                                        <span className="opacity-60 ml-1">scade {scadenza.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                                                    )}
                                                                </span>
                                                            </p>
                                                        );
                                                    })}
                                                    {!(p.accertamenti?.length) && !p.mansione && !p.ultimaVisita && !p.prossimaVisita && (
                                                        <p className="text-[10px] text-gray-400 italic">Nessun dettaglio</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Note */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Note (opz.)</label>
                                {autoNote && (
                                    <button onClick={() => setNote(autoNote)} title="Rigenera note automatiche dagli accertamenti dovuti"
                                        className="text-[10px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium">
                                        ↺ Auto
                                    </button>
                                )}
                            </div>
                            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                                placeholder="Es. visita periodica annuale"
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500" />
                        </div>

                        {/* submit moved to footer below */}
                    </div>
                    <div className="flex-1 overflow-hidden flex flex-col min-h-0">

                        {/* Time range toggle + Week navigator */}
                        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex-shrink-0 flex-wrap">
                            {/* Fascia oraria */}
                            <div className="flex items-center gap-1 text-xs">
                                {([
                                    { key: 'all', label: 'Tutto il giorno' },
                                    { key: 'morning', label: 'Mattino (7–13)' },
                                    { key: 'afternoon', label: 'Pomeriggio (13–20)' },
                                ] as const).map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setTimeRange(key)}
                                        className={cn(
                                            'px-2 py-1 rounded-md border transition-colors',
                                            timeRange === key
                                                ? 'bg-teal-600 text-white border-teal-600'
                                                : 'text-gray-500 border-gray-200 hover:border-teal-400 hover:text-teal-600 dark:text-gray-400 dark:border-gray-600'
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Week navigator */}
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                            <button onClick={prevWeek} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="flex-1 text-center text-sm font-medium text-gray-700 dark:text-gray-300">{weekLabel}</span>
                            <button onClick={nextWeek} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button onClick={() => setShowCalendar(v => !v)}
                                className={cn('p-1.5 rounded-lg transition-colors', showCalendar ? 'text-teal-600 bg-teal-50 dark:bg-teal-900/30' : 'text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20')}>
                                <CalendarDays className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Calendar picker (collassabile) */}
                        {showCalendar && (
                            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex justify-center">
                                <DateRangeCalendar
                                    value={calRange}
                                    onChange={handleCalRange}
                                    theme="teal"
                                    size="sm"
                                    showPresets={false}
                                    autoConfirm={true}
                                />
                            </div>
                        )}

                        {/* Slot grid */}
                        <div className="flex-1 overflow-auto">
                            {slotsLoading && (
                                <div className="flex items-center justify-center h-32 text-sm text-gray-400">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />Caricamento slot…
                                </div>
                            )}
                            {!slotsLoading && (
                                <table className="w-full text-xs border-collapse">
                                    <thead className="sticky top-0 z-10 bg-white dark:bg-gray-800">
                                        <tr>
                                            <th className="w-14 px-2 py-2 text-left text-gray-400 font-normal border-b border-r border-gray-100 dark:border-gray-700">
                                                <Clock className="h-3 w-3" />
                                            </th>
                                            {weekDays.map((d, i) => {
                                                const iso = toISO(d);
                                                const hasSlots = (slotsPerDay[iso] ?? []).length > 0;
                                                const isToday = iso === toISO(new Date());
                                                return (
                                                    <th key={iso} className={cn(
                                                        'px-2 py-1.5 text-center font-medium border-b border-r border-gray-100 dark:border-gray-700 min-w-[90px]',
                                                        isToday ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' : 'text-gray-600 dark:text-gray-300'
                                                    )}>
                                                        <div className="text-xs">{GIORNI_BREVI[i]}</div>
                                                        <div className="font-mono text-[10px] opacity-70">{d.getDate()}/{MESI_BREVI[d.getMonth()]}</div>
                                                        {hasSlots && <div className="mt-0.5 h-1 w-1 rounded-full bg-teal-500 mx-auto" />}
                                                        {/* Prenota tutti in questo giorno */}
                                                        <button onClick={() => bookAllForDay(iso)} title="Prenota tutti i dipendenti in questo giorno"
                                                            className={cn(
                                                                'mt-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors',
                                                                hasSlots
                                                                    ? 'bg-teal-100 text-teal-600 hover:bg-teal-600 hover:text-white dark:bg-teal-900/30 dark:text-teal-400'
                                                                    : 'bg-gray-100 text-gray-400 dark:bg-gray-700/50 cursor-not-allowed'
                                                            )} disabled={!hasSlots}>
                                                            <CalendarCheck className="h-2.5 w-2.5" />tutti
                                                        </button>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody
                                        onMouseUp={() => {
                                            if (!dragState) return;
                                            const { date, startIdx, endIdx } = dragState;
                                            const lo = Math.min(startIdx, endIdx);
                                            const hi = Math.max(startIdx, endIdx);
                                            const oraInizio = timeRows[lo];
                                            // oraFine = last row start + 30 min step
                                            const [hh, mm] = (timeRows[hi] ?? oraInizio).split(':').map(Number);
                                            const endMinDrag = hh * 60 + mm + 30;
                                            const oraFine = `${String(Math.floor(endMinDrag / 60)).padStart(2, '0')}:${String(endMinDrag % 60).padStart(2, '0')}`;
                                            setAddSlotCell({ date, oraInizio, oraFine });
                                            setNewSlotAmbId('');
                                            setDragState(null);
                                        }}
                                        onMouseLeave={() => setDragState(null)}
                                    >
                                        {timeRows.map((time, rowIdx) => (
                                            <tr key={time} style={{ height: ROW_H_PX + 'px' }} className="hover:bg-gray-50/40 dark:hover:bg-gray-700/10">
                                                <td className="px-2 py-1 text-gray-400 font-mono border-b border-r border-gray-100 dark:border-gray-700 text-right whitespace-nowrap">
                                                    {time}
                                                </td>
                                                {weekDays.map((d) => {
                                                    const iso = toISO(d);
                                                    const slot = getSlotForCell(iso, time);
                                                    const coveredSlot = !slot ? getSlotCoveringCell(iso, time) : undefined;
                                                    const occupato = getOccupatoForCell(iso, time);
                                                    const occupatoCovering = (!slot && !coveredSlot && !occupato) ? getOccupatoCoveringCell(iso, time) : undefined;
                                                    const asgn = getAssignment(iso, time);
                                                    // Se questo time slot è coperto da un assignment iniziato in una riga
                                                    // precedente, salta la td (il rowspan la copre già)
                                                    const asgnCovering = getAssignmentCovering(iso, time);
                                                    if (asgnCovering) return null;
                                                    // Rowspan proporzionale alla durata dell'assignment
                                                    const rowSpan = asgn ? getAssignmentRowSpan(iso, time) : 1;
                                                    const isAddingHere = addSlotCell?.date === iso && addSlotCell?.oraInizio === time;
                                                    const isOverbookingHere = overbookingTarget?.date === iso && overbookingTarget?.time === time;
                                                    const lo = dragState ? Math.min(dragState.startIdx, dragState.endIdx) : -1;
                                                    const hi = dragState ? Math.max(dragState.startIdx, dragState.endIdx) : -1;
                                                    const isInDrag = dragState?.date === iso && rowIdx >= lo && rowIdx <= hi;

                                                    return (
                                                        <td key={iso} rowSpan={rowSpan} className={cn(
                                                            'px-1 border-b border-r border-gray-100 dark:border-gray-700 select-none',
                                                            rowSpan > 1 ? 'py-0 align-top' : 'py-0.5',
                                                            isInDrag && 'bg-blue-50 dark:bg-blue-900/20',
                                                            !isInDrag && (coveredSlot || occupatoCovering) && 'bg-teal-50/20 dark:bg-teal-900/10',
                                                            !isInDrag && (occupato || isOverbookingHere) && 'bg-gray-50/60 dark:bg-gray-700/20'
                                                        )}>
                                                            {isOverbookingHere ? (
                                                                /* Conferma overbooking inline */
                                                                <div className="p-1 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-700">
                                                                    <p className="text-[9px] font-semibold text-amber-700 dark:text-amber-400 truncate mb-0.5">
                                                                        {overbookingTarget.pazienteNome}
                                                                    </p>
                                                                    <p className="text-[9px] text-amber-600 dark:text-amber-500 mb-1">Overbooking?</p>
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                const s = overbookingTarget.slot ?? coveredSlot;
                                                                                if (s) handleClickSlot(iso, s, time);
                                                                                setOverbookingTarget(null);
                                                                            }}
                                                                            disabled={targetPersonIdx === null}
                                                                            className="flex-1 text-[9px] py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded disabled:opacity-50">
                                                                            Sì
                                                                        </button>
                                                                        <button onClick={() => setOverbookingTarget(null)}
                                                                            className="px-1 text-[9px] text-gray-400 hover:text-gray-600">✕</button>
                                                                    </div>
                                                                </div>
                                                            ) : slot ? (
                                                                /* Slot chip standard — inizio disponibilità */
                                                                <button
                                                                    onClick={() => handleClickSlot(iso, slot)}
                                                                    disabled={targetPersonIdx === null && !asgn}
                                                                    title={asgn ? `Assegnato a ${persone[asgn.personIdx]?.lastName} ${persone[asgn.personIdx]?.firstName}` : 'Clicca per assegnare'}
                                                                    style={asgn ? { height: (rowSpan * ROW_H_PX - 1) + 'px' } : undefined}
                                                                    className={cn(
                                                                        'w-full text-left py-0.5 px-1 rounded text-[10px] font-medium transition-all',
                                                                        asgn ? '' : 'min-h-[30px]',
                                                                        asgn
                                                                            ? 'bg-teal-600 text-white ring-2 ring-teal-300'
                                                                            : targetPersonIdx !== null
                                                                                ? 'bg-teal-100 text-teal-700 hover:bg-teal-600 hover:text-white dark:bg-teal-900/30 dark:text-teal-400'
                                                                                : 'bg-teal-100 text-teal-500 dark:bg-teal-900/20 cursor-default'
                                                                    )}>
                                                                    {asgn ? (
                                                                        <span className="relative block w-full leading-tight pr-5">
                                                                            <span className="absolute top-0 right-0 text-[8px] opacity-70 font-mono tabular-nums">{duratePersone[asgn.personIdx] || DEFAULT_DURATA}′</span>
                                                                            {formatSlotName(
                                                                                persone[asgn.personIdx]?.lastName ?? '',
                                                                                persone[asgn.personIdx]?.firstName ?? ''
                                                                            )}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] opacity-60">{time}</span>
                                                                    )}
                                                                </button>
                                                            ) : occupato && !asgn ? (
                                                                /* Slot occupato da un appuntamento esistente — grigio con nome paziente */
                                                                <button
                                                                    onClick={() => setOverbookingTarget({ date: iso, time, slot: undefined, pazienteNome: occupato.pazienteNome })}
                                                                    title={`Occupato: ${occupato.pazienteNome}${occupato.aziendaNome ? ` (${occupato.aziendaNome})` : ''} (${occupato.durataMinuti}′) — clicca per overbooking`}
                                                                    className="w-full text-left py-0.5 px-1 rounded text-[10px] min-h-[30px] bg-gray-200/70 hover:bg-gray-300/70 dark:bg-gray-600/30 dark:hover:bg-gray-500/40 text-gray-600 dark:text-gray-400 transition-colors">
                                                                    <span className="relative block w-full leading-tight pr-5">
                                                                        <span className="absolute top-0 right-0 text-[8px] opacity-60 font-mono tabular-nums">{occupato.durataMinuti}′</span>
                                                                        <span className="font-medium truncate block">{occupato.pazienteNome}</span>
                                                                        {occupato.aziendaNome && (
                                                                            <span className="block text-[8px] opacity-60 truncate">{occupato.aziendaNome}</span>
                                                                        )}
                                                                    </span>
                                                                </button>
                                                            ) : isAddingHere ? (
                                                                /* Inline add-slot form — priority over coveredSlot */
                                                                <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                                                                    <div className="text-[9px] text-gray-500 mb-0.5 font-medium">
                                                                        {addSlotCell?.oraInizio}
                                                                        {addSlotCell?.oraFine ? `–${addSlotCell.oraFine}` : ''}
                                                                    </div>
                                                                    <div className="mb-1" onClick={e => e.stopPropagation()}>
                                                                        <ElegantSelect
                                                                            value={newSlotAmbId}
                                                                            onChange={setNewSlotAmbId}
                                                                            placeholder="Ambulatorio…"
                                                                            options={ambulatori.map((a: any) => ({ value: a.id, label: a.nome }))}
                                                                        />
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <button onClick={handleAddSlot}
                                                                            disabled={!newSlotAmbId || addSlotMutation.isPending}
                                                                            className="flex-1 text-[10px] py-0.5 bg-blue-600 text-white rounded disabled:opacity-50">
                                                                            {addSlotMutation.isPending ? '…' : 'OK'}
                                                                        </button>
                                                                        <button onClick={() => { setAddSlotCell(null); setNewSlotAmbId(''); }}
                                                                            className="px-1 text-[10px] text-gray-400 hover:text-gray-600">
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : occupatoCovering ? (
                                                                /* Riga interna a un appuntamento esistente — grigio non cliccabile */
                                                                <div
                                                                    className="w-full h-6 rounded border-l-2 border-gray-300 dark:border-gray-500 flex items-center px-1 bg-gray-100/40"
                                                                    title={`Occupato: ${occupatoCovering.pazienteNome}`}
                                                                >
                                                                    <span className="text-[9px] text-gray-400 dark:text-gray-500">│</span>
                                                                </div>
                                                            ) : coveredSlot ? (
                                                                /* Riga interna a uno slot LIBERO — prenotabile al questo orario */
                                                                <button
                                                                    onClick={() => handleClickSlot(iso, coveredSlot, time)}
                                                                    disabled={targetPersonIdx === null && !asgn}
                                                                    title={asgn
                                                                        ? `Assegnato a ${persone[asgn.personIdx]?.lastName} ${persone[asgn.personIdx]?.firstName}`
                                                                        : targetPersonIdx !== null
                                                                            ? `Clicca per assegnare alle ${time}`
                                                                            : 'Disponibilità medico'}
                                                                    style={asgn ? { height: (rowSpan * ROW_H_PX - 1) + 'px' } : undefined}
                                                                    className={cn(
                                                                        'w-full text-left py-0.5 px-1 rounded text-[10px] font-medium transition-all border-l-2',
                                                                        asgn ? '' : 'min-h-[28px]',
                                                                        asgn
                                                                            ? 'border-teal-600 bg-teal-600 text-white ring-1 ring-teal-300'
                                                                            : targetPersonIdx !== null
                                                                                ? 'border-teal-200 bg-teal-100 hover:bg-teal-600 hover:border-teal-600 hover:text-white text-teal-700 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-400'
                                                                                : 'border-teal-200 bg-teal-100/50 text-teal-400 cursor-default'
                                                                    )}>
                                                                    {asgn ? (
                                                                        <span className="relative block w-full leading-tight pr-5">
                                                                            <span className="absolute top-0 right-0 text-[8px] opacity-70 font-mono tabular-nums">{duratePersone[asgn.personIdx] || DEFAULT_DURATA}′</span>
                                                                            {formatSlotName(
                                                                                persone[asgn.personIdx]?.lastName ?? '',
                                                                                persone[asgn.personIdx]?.firstName ?? ''
                                                                            )}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[9px] opacity-40">{time}</span>
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <div
                                                                    className={cn(
                                                                        'w-full h-6 rounded transition-colors cursor-crosshair flex items-center justify-center',
                                                                        isInDrag
                                                                            ? 'bg-blue-200 dark:bg-blue-700/40'
                                                                            : 'opacity-0 hover:opacity-100 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 group-hover:opacity-30'
                                                                    )}
                                                                    title="Trascina per creare uno slot di disponibilità"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setDragState({ date: iso, startIdx: rowIdx, endIdx: rowIdx });
                                                                    }}
                                                                    onMouseEnter={() => {
                                                                        if (dragState?.date === iso) {
                                                                            setDragState(s => s ? { ...s, endIdx: rowIdx } : null);
                                                                        }
                                                                    }}
                                                                    onClick={() => {
                                                                        if (!dragState) {
                                                                            setAddSlotCell({ date: iso, oraInizio: time });
                                                                            setNewSlotAmbId('');
                                                                        }
                                                                    }}
                                                                >
                                                                    {!isInDrag && <Plus className="h-3 w-3 text-gray-300 hover:text-teal-500" />}
                                                                    {isInDrag && dragState?.startIdx === rowIdx && (
                                                                        <span className="text-[9px] text-blue-600 font-medium">{time}</span>
                                                                    )}
                                                                    {isInDrag && dragState && dragState.startIdx !== rowIdx && Math.max(dragState.startIdx, dragState.endIdx) === rowIdx && (
                                                                        <span className="text-[9px] text-blue-600 font-medium">{time}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {!slotsLoading && timeRows.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-32 text-sm text-gray-400 gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    <span>Nessuna disponibilità configurata per questo medico</span>
                                    <span className="text-xs">Clicca sulle celle vuote o trascina per aggiungere disponibilità per giorni senza slot</span>
                                </div>
                            )}
                        </div>

                        {/* Add-slot info banner */}
                        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 text-[10px] text-gray-400">
                            <Plus className="h-3 w-3" />
                            <span>Clicca sulle celle vuote per aggiungere uno slot di disponibilità per il medico</span>
                        </div>
                    </div>
                </div>

                {/* ── Footer: Programma Visite button (always visible, doesn't scroll) ── */}
                <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl">
                    {overlapWarning ? (
                        <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 dark:text-amber-300 leading-snug">
                                    <strong>Conflitto rilevato:</strong> esiste già un appuntamento in questi orari. Vuoi procedere con overbooking o annullare?
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => submitMutation.mutate({ isOverbooking: true })}
                                    disabled={submitMutation.isPending}
                                    className="flex-1 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 transition-colors">
                                    {submitMutation.isPending ? 'Attendere…' : 'Conferma comunque'}
                                </button>
                                <button onClick={() => setOverlapWarning(null)}
                                    className="flex-1 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    Annulla
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => submitMutation.mutate({})}
                            disabled={!medicoId || submitMutation.isPending}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors">
                            {submitMutation.isPending
                                ? <><Loader2 className="h-4 w-4 animate-spin" />Programmazione…</>
                                : <><CheckCircle2 className="h-4 w-4" />{allAssigned ? 'Conferma visite' : `Programma (${persone.length} visite)`}</>
                            }
                        </button>
                    )}
                    {!allAssigned && !overlapWarning && (
                        <p className="text-[10px] text-amber-500 text-center mt-1">
                            {assignments.length === 0 ? 'Seleziona gli slot dalla griglia →' : `${persone.length - assignments.length} person${persone.length - assignments.length > 1 ? 'e' : 'a'} senza slot (schedulazione automatica consecutiva)`}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScheduleWeekModal;
