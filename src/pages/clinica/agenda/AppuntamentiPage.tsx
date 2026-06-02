/**
 * AppuntamentiPage — Lista e gestione appuntamenti
 *
 * Ristrutturata secondo il pattern VisiteListPage:
 * - Colonne opzionali con persistenza (note, note interne, coda, ambulatorio, medico, prestazione)
 * - Toggle lista/kanban persistente (accanto a "Nuovo Appuntamento")
 * - Filtri con reset a mezzanotte, preferenze (colonne, sort, view) permanenti
 * - Stato con modifica rapida (dropdown next-states)
 * - Stato chips con conteggi come nella pagina visite
 *
 * @module pages/poliambulatorio/agenda/AppuntamentiPage
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calendar, Clock, Plus, Search, Eye, Edit, Trash2,
    CheckCircle, XCircle, AlertCircle, User, Stethoscope, Building2,
    ChevronDown, RefreshCw, LayoutList, LayoutGrid,
    Receipt, RotateCcw, UserCheck, PhoneCall,
    ExternalLink, FilePlus, BookOpen, Loader2, Play,
    SlidersHorizontal, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight, X,
    FileText, Lock, Hash, ClipboardList, ListFilter, MapPin, Users
} from 'lucide-react';
import { ActionButton } from '../../../components/ui';
import { CRUDPrimaryButton } from '../../../components/shared/CRUDButton';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { TimePickerElegante } from '../../../components/ui/TimePickerElegante';
import { DateRangeCalendar, DateRange } from '../../../components/ui/DateRangeCalendar';
import { TimeRangePicker, TimeRange } from '../../../components/ui/TimeRangePicker';
import ElegantSelect from '../../../components/ui/ElegantSelect';
import {
    appuntamentiApi,
    appuntamentoPrestazioniApi,
    ambulatoriApi,
    prestazioniApi,
    mediciApi,
    convenzioniApi,
    poliambulatoriApi,
    sediApi,
    slotsApi,
    StatoAppuntamento,
    Appuntamento,
    SlotDisponibilita
} from '../../../services/clinicaApi';
import { formatDate, formatTime, toISODateString } from '../../../utils/dateUtils';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { getDoctorTitle } from '../../../utils/codiceFiscale';
import { getPersonDisplayName } from '../../../utils/personDisplayUtils';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { useToast } from '../../../hooks/useToast';
import { AccettazionePazienteModal, type PatientFormData } from './components/AccettazionePazienteModal';
import AvailabilitySlotTimeline from './components/AvailabilitySlotTimeline';

// ============================================
// PERSISTENCE (VisiteListPage pattern)
// ============================================

const LS_KEY = 'appuntamenti-prefs';

/** Formatta Date come YYYY-MM-DD locale (no timezone shift) */
function toLocalDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Crea Date da YYYY-MM-DD come data locale */
function fromLocalDateStr(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function startOfWeek(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d;
}

function getTimeFromDateTime(value?: string | Date | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function timeToMinutes(time?: string | null): number {
    if (!time) return 0;
    const [hours = 0, minutes = 0] = time.split(':').map(Number);
    return (hours * 60) + minutes;
}

const activeAppointmentStates = 'PRENOTATO,CONFERMATO,IN_ATTESA,IN_CORSO';
const elegantInputClass = 'mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 shadow-sm outline-none transition-all hover:border-teal-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-teal-900/30';

function readPrefs(): Record<string, unknown> {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}'); }
    catch { return {}; }
}
function savePrefs(update: Record<string, unknown>) {
    const todayStr = toLocalDateStr(new Date());
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ...readPrefs(), ...update, savedDate: todayStr })); }
    catch { /* storage unavailable */ }
}

/** Filtri resettano a mezzanotte; preferenze permanenti (view, colonne, sort) persistono sempre. */
function readFilterPref<T>(key: string, defaultVal: T): T {
    const prefs = readPrefs();
    const todayStr = toLocalDateStr(new Date());
    if (prefs.savedDate && prefs.savedDate !== todayStr) return defaultVal;
    return (prefs[key] as T) ?? defaultVal;
}

function getInitialDateRange(): DateRange {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = toLocalDateStr(today);
    const prefs = readPrefs();
    if (!prefs.dateRangeStart) return { start: today, end: today };
    try {
        if (prefs.savedDate && prefs.savedDate !== todayStr) return { start: today, end: today };
        const storedStart = fromLocalDateStr(prefs.dateRangeStart as string);
        const storedEnd = prefs.dateRangeEnd ? fromLocalDateStr(prefs.dateRangeEnd as string) : today;
        return { start: storedStart, end: storedEnd };
    } catch { return { start: today, end: today }; }
}

// ============================================
// TYPES
// ============================================

type ViewMode = 'list' | 'kanban';
type SortField = 'dataOra' | 'paziente' | 'prestazione' | 'ambulatorio' | 'stato' | 'durata' | 'costo' | 'coda' | 'note' | 'noteInterne';
type SortOrder = 'asc' | 'desc';

type OptionalCol = 'prestazione' | 'medico' | 'ambulatorio' | 'durata' | 'costo' | 'coda' | 'note' | 'noteInterne' | 'numero' | 'convenzione' | 'tipoVisitaMDL' | 'pagamentoAnticipato' | 'aziendaMdl' | 'protocolloMansione' | 'rischiMdl' | 'accertamentiMdl' | 'ultimaVisitaMdl';
const ALL_OPTIONAL_COLS: { key: OptionalCol; label: string }[] = [
    { key: 'numero', label: 'Numero' },
    { key: 'prestazione', label: 'Prestazione' },
    { key: 'medico', label: 'Medico' },
    { key: 'ambulatorio', label: 'Ambulatorio' },
    { key: 'durata', label: 'Durata' },
    { key: 'costo', label: 'Costo' },
    { key: 'coda', label: 'Coda' },
    { key: 'convenzione', label: 'Convenzione' },
    { key: 'tipoVisitaMDL', label: 'Tipo Visita MDL' },
    { key: 'aziendaMdl', label: 'Azienda' },
    { key: 'protocolloMansione', label: 'Protocollo / Mansione' },
    { key: 'rischiMdl', label: 'Rischi' },
    { key: 'accertamentiMdl', label: 'Accertamenti' },
    { key: 'ultimaVisitaMdl', label: 'Ultima visita MdL' },
    { key: 'pagamentoAnticipato', label: 'Pagamento' },
    { key: 'note', label: 'Note' },
    { key: 'noteInterne', label: 'Note Interne' },
];

const formatShortDateTime = (value?: string | Date | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return `${formatDate(date, 'short')} ${formatTime(date)}`;
};

const getMdlMansioni = (app: Appuntamento) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (((app as any)._workerMansioni || []) as any[])
        .map(wm => wm?.mansione?.denominazione || wm?.mansione?.codice)
        .filter(Boolean);

const getMdlRischi = (app: Appuntamento) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (((app as any)._rischiLavorativi || []) as any[])
        .map(r => r?.label || r?.descrizioneEsposizione || r?.codiceRischio)
        .filter(Boolean);

const getAppointmentLogRows = (app: Appuntamento) => [
    { label: 'Prenotato', value: formatShortDateTime(app.createdAt) },
    { label: 'Arrivato/accettato', value: formatShortDateTime((app as any).oraArrivo) },
    { label: 'Chiamato dal medico', value: formatShortDateTime((app as any).oraChiamata) },
    { label: 'Inizio visita', value: formatShortDateTime((app as any).oraInizio) },
    { label: 'Fine/refertazione', value: formatShortDateTime((app as any).oraFine || (app as any).visita?.updatedAt) },
    { label: 'Fatturato/pagato', value: formatShortDateTime((app as any).pagamentoDataOra) },
    { label: 'Ultima modifica', value: formatShortDateTime(app.updatedAt) },
].filter(row => row.value !== '—');

const canOpenVisitAction = (app: Appuntamento) =>
    app.stato === 'IN_ATTESA' || !!(app.tipoVisitaMDL && (app as any)._consensiMdlValidi);

const getAppointmentPriceInfo = (app: Appuntamento) => {
    const raw = app as any;
    const base = Number(
        raw._prezzoPrestazioniBase
        ?? raw._prezzoTariffarioPrestazione
        ?? raw._prezzoTotaleMovimenti
        ?? raw.prezzoBase
        ?? app.prestazione?.prezzoBase
        ?? raw.prezzo
        ?? 0
    );
    const condizioni = app.convenzione?.condizioni as any;
    let discounted = Number(raw.prezzoScontato ?? raw.prezzoFinale ?? raw.prezzoConvenzionato ?? 0) || 0;
    if (!discounted && condizioni && base > 0) {
        const scontoInfo = condizioni.scontoInfo;
        const tipoSconto = String(scontoInfo?.tipo || '').toUpperCase();
        if (tipoSconto.includes('PERCENT')) discounted = base * (1 - Number(scontoInfo.valore || 0) / 100);
        else if (tipoSconto.includes('VALORE') || tipoSconto.includes('FISSO')) discounted = Math.max(0, base - Number(scontoInfo.valore || 0));
        else if (condizioni.percentualeSconto || condizioni.scontoPercentuale) discounted = base * (1 - Number(condizioni.percentualeSconto ?? condizioni.scontoPercentuale) / 100);
        else if (condizioni.scontoFisso) discounted = Math.max(0, base - Number(condizioni.scontoFisso));
    }
    const finalPrice = discounted > 0 ? Math.round(discounted * 100) / 100 : base;
    return { base, finalPrice, hasDiscount: discounted > 0 && base > 0 && Math.abs(discounted - base) >= 0.01 };
};

// ============================================
// STATO CONFIG
// ============================================

const STATO_CONFIG: Record<StatoAppuntamento, {
    label: string;
    color: string;
    bgColor: string;
    textColor: string;
    icon: React.ElementType;
    nextStates: StatoAppuntamento[];
}> = {
    PRENOTATO: {
        label: 'Prenotato',
        color: 'blue',
        bgColor: 'bg-blue-100 dark:bg-blue-900/40',
        textColor: 'text-blue-700 dark:text-blue-300',
        icon: Calendar,
        nextStates: ['CONFERMATO']
    },
    CONFERMATO: {
        label: 'Confermato',
        color: 'green',
        bgColor: 'bg-green-100 dark:bg-green-900/40',
        textColor: 'text-green-700 dark:text-green-300',
        icon: CheckCircle,
        nextStates: ['IN_ATTESA', 'NO_SHOW']
    },
    IN_ATTESA: {
        label: 'In Attesa',
        color: 'amber',
        bgColor: 'bg-amber-100 dark:bg-amber-900/40',
        textColor: 'text-amber-700 dark:text-amber-300',
        icon: Clock,
        nextStates: ['IN_CORSO', 'NO_SHOW']
    },
    IN_CORSO: {
        label: 'In Corso',
        color: 'purple',
        bgColor: 'bg-purple-100 dark:bg-purple-900/40',
        textColor: 'text-purple-700 dark:text-purple-300',
        icon: Stethoscope,
        nextStates: ['COMPLETATO']
    },
    COMPLETATO: {
        label: 'Completato',
        color: 'gray',
        bgColor: 'bg-gray-100 dark:bg-gray-700',
        textColor: 'text-gray-700 dark:text-gray-300',
        icon: CheckCircle,
        nextStates: []
    },
    ANNULLATO: {
        label: 'Eliminato',
        color: 'red',
        bgColor: 'bg-red-100 dark:bg-red-900/40',
        textColor: 'text-red-700 dark:text-red-300',
        icon: XCircle,
        nextStates: []
    },
    NO_SHOW: {
        label: 'No Show',
        color: 'orange',
        bgColor: 'bg-orange-100 dark:bg-orange-900/40',
        textColor: 'text-orange-700 dark:text-orange-300',
        icon: AlertCircle,
        nextStates: ['PRENOTATO']
    },
    FATTURATO: {
        label: 'Fatturato',
        color: 'purple',
        bgColor: 'bg-purple-100 dark:bg-purple-900/40',
        textColor: 'text-purple-700 dark:text-purple-300',
        icon: Receipt,
        nextStates: []
    },
    RINVIATO: {
        label: 'Rinviato',
        color: 'amber',
        bgColor: 'bg-amber-100 dark:bg-amber-900/40',
        textColor: 'text-amber-700 dark:text-amber-300',
        icon: RotateCcw,
        nextStates: ['PRENOTATO', 'CONFERMATO']
    }
};

const ALL_STATES = Object.keys(STATO_CONFIG) as StatoAppuntamento[];

// ============================================
// SUB-COMPONENTS
// ============================================

/** Status Badge */
const StatusBadge: React.FC<{
    stato: StatoAppuntamento;
    size?: 'sm' | 'md';
}> = ({ stato, size = 'md' }) => {
    const config = STATO_CONFIG[stato];
    const Icon = config.icon;
    return (
        <span className={`
            inline-flex items-center gap-1 rounded-full font-medium
            ${config.bgColor} ${config.textColor}
            ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
        `}>
            <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
            {config.label}
        </span>
    );
};

/** Stato quick-edit cell with portal dropdown */
const StatoCell: React.FC<{
    appuntamento: Appuntamento;
    onChangeStato: (stato: StatoAppuntamento) => void;
}> = ({ appuntamento, onChangeStato }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [showLogTooltip, setShowLogTooltip] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const tooltipTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!showMenu) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node))
                setShowMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showMenu]);

    const states = ALL_STATES.filter(stato => stato !== appuntamento.stato);

    const getFloatingPosition = (rect: DOMRect, width: number, height: number, gap = 8) => {
        const margin = 12;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const left = Math.min(Math.max(rect.left, margin), Math.max(margin, viewportWidth - width - margin));
        const below = rect.bottom + gap;
        const above = rect.top - height - gap;
        const top = below + height <= viewportHeight - margin
            ? below
            : Math.max(margin, above);
        return { top, left };
    };

    const scheduleTooltip = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setTooltipPosition(getFloatingPosition(rect, 320, 360, 8));
        }
        if (tooltipTimerRef.current) window.clearTimeout(tooltipTimerRef.current);
        tooltipTimerRef.current = window.setTimeout(() => setShowLogTooltip(true), 2000);
    };

    const cancelTooltip = () => {
        if (tooltipTimerRef.current) window.clearTimeout(tooltipTimerRef.current);
        tooltipTimerRef.current = null;
        setShowLogTooltip(false);
    };

    useEffect(() => () => {
        if (tooltipTimerRef.current) window.clearTimeout(tooltipTimerRef.current);
    }, []);

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onMouseEnter={scheduleTooltip}
                onMouseLeave={cancelTooltip}
                onClick={(e) => {
                    e.stopPropagation();
                    cancelTooltip();
                    if (buttonRef.current) {
                        const rect = buttonRef.current.getBoundingClientRect();
                        setMenuPosition(getFloatingPosition(rect, 180, 320, 4));
                    }
                    setShowMenu(!showMenu);
                }}
                className="flex items-center gap-1"
            >
                <StatusBadge stato={appuntamento.stato} />
                <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            {showMenu && createPortal(
                <div
                    ref={menuRef}
                    className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]"
                    style={{ top: menuPosition.top, left: menuPosition.left, zIndex: 9999 }}
                >
                    {states.map(nextStato => {
                        const nextConfig = STATO_CONFIG[nextStato];
                        const NextIcon = nextConfig.icon;
                        return (
                            <button
                                key={nextStato}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChangeStato(nextStato);
                                    setShowMenu(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
                            >
                                <NextIcon className={`h-4 w-4 ${nextConfig.textColor}`} />
                                <span>{nextConfig.label}</span>
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
            {showLogTooltip && createPortal(
                <div
                    className="fixed w-80 rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-2xl dark:border-gray-700 dark:bg-gray-800"
                    style={{ top: tooltipPosition.top, left: tooltipPosition.left, zIndex: 9998 }}
                    onMouseEnter={() => setShowLogTooltip(true)}
                    onMouseLeave={cancelTooltip}
                >
                    <div className="mb-2 flex items-center gap-2 border-b border-gray-100 pb-2 dark:border-gray-700">
                        <Clock className="h-4 w-4 text-teal-600" />
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">Log appuntamento</p>
                            <p className="text-gray-500">{getPersonDisplayName(appuntamento.paziente, 'Paziente')}</p>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        {getAppointmentLogRows(appuntamento).map(row => (
                            <div key={row.label} className="flex items-center justify-between gap-3">
                                <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                                <span className="font-medium text-gray-800 dark:text-gray-200">{row.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 border-t border-gray-100 pt-2 text-gray-500 dark:border-gray-700">
                        <p>Prestazione: {appuntamento.prestazione?.nome || '—'}</p>
                        <p>Medico: {getPersonDisplayName(appuntamento.medico, '—')}</p>
                        <p>Note: {[appuntamento.note, appuntamento.noteInterne].filter(Boolean).join(' / ') || '—'}</p>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

/** KanbanCard — card singola con azioni contestuali per stato */
const KanbanCard: React.FC<{
    app: Appuntamento;
    onClick: () => void;
    onAction: (action: string, app: Appuntamento) => void;
    isBusy: boolean;
}> = ({ app, onClick, onAction, isBusy }) => {
    const dataOra = new Date(app.dataOra);
    const config = STATO_CONFIG[app.stato];
    const isFatturato = app.stato === 'FATTURATO';

    return (
        <div
            onClick={onClick}
            className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 cursor-pointer hover:border-teal-300 dark:hover:border-teal-500 hover:shadow-md transition-all duration-150 overflow-hidden"
        >
            <div className={`h-1 w-full ${app.stato === 'PRENOTATO' ? 'bg-blue-400' :
                app.stato === 'CONFERMATO' ? 'bg-green-400' :
                    app.stato === 'IN_ATTESA' ? 'bg-amber-400' :
                        app.stato === 'IN_CORSO' ? 'bg-purple-400' :
                            app.stato === 'COMPLETATO' ? 'bg-teal-400' :
                                app.stato === 'FATTURATO' ? 'bg-indigo-400' : 'bg-gray-300'
                }`} />

            <div className="p-3">
                <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                            {getPersonDisplayName(app.paziente, 'Paziente')}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">#{app.numero}</p>
                    </div>
                    <span className={`ml-2 flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${config.bgColor} ${config.textColor}`}>
                        {config.label}
                    </span>
                </div>

                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <p className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span>{formatTime(dataOra)}</span>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span>{app.durataMinuti || 30}min</span>
                    </p>
                    {app.prestazione && (
                        <p className="flex items-center gap-1.5">
                            <Stethoscope className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{app.prestazione.nome}</span>
                        </p>
                    )}
                    {app.ambulatorio && (
                        <p className="flex items-center gap-1.5">
                            <Building2 className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{app.ambulatorio.nome}</span>
                        </p>
                    )}
                    {app.numeroCoda != null && (
                        <p className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/40 text-[9px] font-bold">#</span>
                            Coda {app.displayNumberCoda || app.numeroCoda}
                        </p>
                    )}
                    {app.note && (
                        <p className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{app.note}</span>
                        </p>
                    )}
                    {app.noteInterne && (
                        <p className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
                            <Lock className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{app.noteInterne}</span>
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                    {(app.stato === 'PRENOTATO' || app.stato === 'CONFERMATO') && (
                        <>
                            <button
                                disabled={isBusy}
                                onClick={() => onAction('accetta', app)}
                                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
                            >
                                {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
                                Accetta Paziente
                            </button>
                            <button
                                disabled={isBusy}
                                onClick={() => onAction('noshow', app)}
                                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 disabled:opacity-50 transition-colors"
                            >
                                <XCircle className="h-3 w-3" /> No Show
                            </button>
                        </>
                    )}
                    {canOpenVisitAction(app) && (
                        app.numeroCoda != null ? (
                            <button
                                disabled={isBusy}
                                onClick={() => onAction('chiama-visita', app)}
                                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                            >
                                {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <PhoneCall className="h-3 w-3" />}
                                Chiama e Visita
                            </button>
                        ) : (
                            <button
                                disabled={isBusy}
                                onClick={() => onAction('visita', app)}
                                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                            >
                                {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                                Visita Paziente
                            </button>
                        )
                    )}
                    {app.stato === 'IN_CORSO' && (
                        <button
                            onClick={() => onAction('vai-visita', app)}
                            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                        >
                            <ExternalLink className="h-3 w-3" /> Vai alla Visita
                        </button>
                    )}
                    {app.stato === 'COMPLETATO' && (
                        <button
                            onClick={() => onAction('fattura', app)}
                            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors"
                        >
                            <FilePlus className="h-3 w-3" /> Fattura
                        </button>
                    )}
                    {isFatturato && (
                        <button
                            onClick={() => onAction('vedi-referto', app)}
                            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                        >
                            <BookOpen className="h-3 w-3" /> Vedi Referto
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/** KanbanColumn — colonna kanban, supporta più statuses */
const KanbanColumn: React.FC<{
    label: string;
    statuses: StatoAppuntamento[];
    headerBg: string;
    headerText: string;
    appuntamenti: Appuntamento[];
    onCardClick: (id: string) => void;
    onAction: (action: string, app: Appuntamento) => void;
    busyIds: Set<string>;
}> = ({ label, statuses, headerBg, headerText, appuntamenti, onCardClick, onAction, busyIds }) => {
    return (
        <div className="flex-shrink-0 w-72 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className={`${headerBg} px-3 py-2.5`}>
                <div className="flex items-center justify-between">
                    <span className={`font-semibold text-sm ${headerText}`}>{label}</span>
                    <span className={`text-sm font-bold ${headerText} bg-white/30 px-2 py-0.5 rounded-full`}>
                        {appuntamenti.length}
                    </span>
                </div>
            </div>
            <div className="p-2 space-y-2 min-h-[120px] flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                {appuntamenti.map(app => (
                    <KanbanCard
                        key={app.id}
                        app={app}
                        onClick={() => onCardClick(app.id)}
                        onAction={onAction}
                        isBusy={busyIds.has(app.id)}
                    />
                ))}
                {appuntamenti.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
                        <Calendar className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-xs">Nessun appuntamento</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const AppuntamentiPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();
    const { confirmDelete: confirmDeleteDialog } = useConfirmDialog();
    const { showToast } = useToast();

    // View mode — persisted permanently (never resets at midnight)
    const [view, setView] = useState<ViewMode>(() => (readPrefs().view as ViewMode) || 'list');
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
    const [accettazioneAppuntamento, setAccettazioneAppuntamento] = useState<Appuntamento | null>(null);
    const [accettazioneInitialTab, setAccettazioneInitialTab] = useState<'anagrafica' | 'residenza' | 'appuntamento' | 'fatturazione'>('anagrafica');
    const [editingAppuntamento, setEditingAppuntamento] = useState<Appuntamento | null>(null);
    const [editForm, setEditForm] = useState({
        data: '',
        ora: '',
        durataMinuti: 30,
        medicoId: '',
        prestazioneId: '',
        ambulatorioId: '',
        stato: 'PRENOTATO' as StatoAppuntamento,
        convenzioneId: '',
        note: '',
        noteInterne: '',
    });
    const [editWeekStart, setEditWeekStart] = useState(() => startOfWeek(new Date()));
    const [showSameBranchDoctors, setShowSameBranchDoctors] = useState(false);

    // Filters — reset at midnight via readFilterPref
    const [searchTerm, setSearchTerm] = useState('');
    const [statoFilter, setStatoFilter] = useState<string>(() => readFilterPref('statoFilter', ''));
    const [ambulatorioFilter, setAmbulatorioFilter] = useState<string>(() => readFilterPref('ambulatorioFilter', ''));
    const [medicoFilter, setMedicoFilter] = useState<string>(() => readFilterPref('medicoFilter', ''));
    const [timeRange, setTimeRange] = useState<TimeRange>(() => ({
        start: readFilterPref<string | null>('oraInizio', null),
        end: readFilterPref<string | null>('oraFine', null),
    }));
    const [soloSecundarieDaRefertare, setSoloSecundarieDaRefertare] = useState<boolean>(
        () => readFilterPref('soloSecundarieDaRefertare', false)
    );
    // Filtro "Da fatturare" — appuntamenti completati non ancora fatturati
    const [soloNonFatturate, setSoloNonFatturate] = useState<boolean>(
        () => readFilterPref('soloNonFatturate', false)
    );
    // Filtri avanzati — Poliambulatorio / Sede / Ambulatorio
    const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(
        () => readFilterPref('showAdvancedFilters', false)
    );
    const [poliambulatorioFilter, setPoliambulatorioFilter] = useState<string>(
        () => readFilterPref('poliambulatorioFilter', '')
    );
    const [sedeFilter, setSedeFilter] = useState<string>(
        () => readFilterPref('sedeFilter', '')
    );
    // Queue modal
    const [showQueueModal, setShowQueueModal] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange>(() => {
        // URL params override persisted
        if (searchParams.get('dataInizio') || searchParams.get('dataFine')) {
            return {
                start: searchParams.get('dataInizio') ? new Date(searchParams.get('dataInizio')!) : new Date(),
                end: searchParams.get('dataFine') ? new Date(searchParams.get('dataFine')!) : new Date()
            };
        }
        return getInitialDateRange();
    });
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    // Sort — persisted permanently
    const [sortField, setSortField] = useState<SortField>(() => (readPrefs().sortField as SortField) || 'dataOra');
    const [sortDir, setSortDir] = useState<SortOrder>(() => (readPrefs().sortDir as SortOrder) || 'asc');

    const handleSort = (field: SortField) => {
        if (field === sortField) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    // Column visibility & order — persisted permanently
    const [visibleCols, setVisibleCols] = useState<Set<OptionalCol>>(() => {
        const stored = readPrefs().visibleCols;
        if (Array.isArray(stored) && stored.length > 0) return new Set(stored as OptionalCol[]);
        return new Set(['prestazione', 'medico', 'ambulatorio', 'durata', 'coda', 'note'] as OptionalCol[]);
    });
    const [columnOrder, setColumnOrder] = useState<OptionalCol[]>(() => {
        const stored = readPrefs().columnOrder;
        const allKeys = ALL_OPTIONAL_COLS.map(c => c.key);
        if (Array.isArray(stored) && stored.length > 0) {
            // Reconcile: aggiunge nuove colonne non presenti nello stored
            const storedSet = new Set(stored as OptionalCol[]);
            const missing = allKeys.filter(k => !storedSet.has(k));
            return [...(stored as OptionalCol[]), ...missing];
        }
        return allKeys;
    });
    const [showColMenu, setShowColMenu] = useState(false);
    const colMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showColMenu) return;
        const handler = (e: MouseEvent) => {
            if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node))
                setShowColMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showColMenu]);

    const toggleCol = (col: OptionalCol) =>
        setVisibleCols(prev => {
            const next = new Set(prev);
            next.has(col) ? next.delete(col) : next.add(col);
            return next;
        });

    const moveCol = (col: OptionalCol, dir: 'up' | 'down') => {
        setColumnOrder(prev => {
            const idx = prev.indexOf(col);
            if (idx === -1) return prev;
            const next = [...prev];
            const swap = dir === 'up' ? idx - 1 : idx + 1;
            if (swap < 0 || swap >= next.length) return prev;
            [next[idx], next[swap]] = [next[swap], next[idx]];
            return next;
        });
    };

    // Persist all preferences to localStorage
    useEffect(() => {
        savePrefs({
            view,
            statoFilter,
            ambulatorioFilter,
            medicoFilter,
            oraInizio: timeRange.start || null,
            oraFine: timeRange.end || null,
            soloSecundarieDaRefertare,
            soloNonFatturate,
            showAdvancedFilters,
            poliambulatorioFilter,
            sedeFilter,
            visibleCols: Array.from(visibleCols),
            columnOrder,
            sortDir,
            sortField,
            dateRangeStart: dateRange.start ? toLocalDateStr(dateRange.start) : null,
            dateRangeEnd: dateRange.end ? toLocalDateStr(dateRange.end) : null,
        });
    }, [view, statoFilter, ambulatorioFilter, medicoFilter, timeRange, soloSecundarieDaRefertare, soloNonFatturate, showAdvancedFilters, poliambulatorioFilter, sedeFilter, visibleCols, columnOrder, sortDir, sortField, dateRange]);

    // Build query params
    const queryFiltersWithTenant = useMemo(() => {
        const tp = getTenantFilterParams();
        const dataInizio = dateRange.start ? toISODateString(dateRange.start) : null;
        const dataFine = dateRange.end ? toISODateString(dateRange.end) : null;

        // Handle merged stato filters
        let effectiveStato = statoFilter;
        if (statoFilter === 'PRENOTATO_CONFERMATO') effectiveStato = 'PRENOTATO,CONFERMATO';

        // "Da fatturare" quickfilter → forza stato=COMPLETATO (completato ma non fatturato)
        if (soloNonFatturate) effectiveStato = 'COMPLETATO';

        return {
            ...(searchTerm && { search: searchTerm }),
            ...(effectiveStato && { stato: effectiveStato }),
            ...(ambulatorioFilter && { ambulatorioId: ambulatorioFilter }),
            ...(medicoFilter && { medicoId: medicoFilter }),
            ...(dataInizio && { dataInizio }),
            ...(dataFine && { dataFine }),
            ...(timeRange.start && { oraInizio: timeRange.start }),
            ...(timeRange.end && { oraFine: timeRange.end }),
            ...(soloSecundarieDaRefertare && { soloSecundarieDaRefertare: 'true' }),
            ...(sedeFilter && { sedeId: sedeFilter }),
            ...(poliambulatorioFilter && { poliambulatorioId: poliambulatorioFilter }),
            ...(tp.tenantIds && { tenantIds: tp.tenantIds.join(',') }),
            ...(tp.allTenants && { allTenants: 'true' })
        };
    }, [searchTerm, statoFilter, ambulatorioFilter, medicoFilter, dateRange, timeRange, soloSecundarieDaRefertare, soloNonFatturate, sedeFilter, poliambulatorioFilter, getTenantFilterParams, tenantFilterKey]);

    // === QUERIES ===

    const { data: appuntamentiData, isLoading, error, refetch } = useQuery({
        queryKey: ['appuntamenti', queryFiltersWithTenant, page, PAGE_SIZE, tenantFilterKey],
        queryFn: () => appuntamentiApi.getAll({
            page,
            limit: PAGE_SIZE,
            filters: queryFiltersWithTenant
        }),
        enabled: isReady
    });

    // Ambulatori for filter dropdown (cascading)
    const { data: ambulatoriData } = useQuery({
        queryKey: ['ambulatori-filter', tenantFilterKey, poliambulatorioFilter, sedeFilter],
        queryFn: () => {
            const tp = getTenantFilterParams();
            return ambulatoriApi.getAll({
                limit: 200,
                stato: 'ATTIVO',
                ...(poliambulatorioFilter && { poliambulatorioId: poliambulatorioFilter }),
                ...(sedeFilter && { sedeId: sedeFilter }),
                ...(tp.tenantIds && { tenantIds: tp.tenantIds.join(',') }),
                ...(tp.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isReady,
        staleTime: 5 * 60_000,
    });

    const { data: prestazioniData } = useQuery({
        queryKey: ['prestazioni-appuntamenti-edit', tenantFilterKey],
        queryFn: () => prestazioniApi.getAll({ limit: 300, filters: { isActive: true } }),
        enabled: isReady,
        staleTime: 5 * 60_000,
    });

    const { data: mediciData } = useQuery({
        queryKey: ['medici-appuntamenti-edit', tenantFilterKey],
        queryFn: () => mediciApi.getAll({ limit: 300 }),
        enabled: isReady,
        staleTime: 5 * 60_000,
    });

    const { data: convenzioniData } = useQuery({
        queryKey: ['convenzioni-appuntamenti-edit', tenantFilterKey],
        queryFn: () => convenzioniApi.getAll({ limit: 200 }),
        enabled: isReady,
        staleTime: 5 * 60_000,
    });

    const allMedici = useMemo(() => ((mediciData?.data || []) as any[]), [mediciData?.data]);
    const selectedEditMedico = useMemo(
        () => allMedici.find(m => m.id === editForm.medicoId),
        [allMedici, editForm.medicoId]
    );
    const selectedEditSpecialties = useMemo(() => {
        const raw = [
            selectedEditMedico?.specialty,
            selectedEditMedico?.specialita,
            selectedEditMedico?.specializzazione,
            ...(Array.isArray(selectedEditMedico?.specialties) ? selectedEditMedico.specialties : []),
            ...(Array.isArray(selectedEditMedico?.specializzazioni) ? selectedEditMedico.specializzazioni : []),
        ].filter(Boolean);
        return new Set(raw.map((value: unknown) => String(value).trim().toLowerCase()).filter(Boolean));
    }, [selectedEditMedico]);
    const editCandidateMedici = useMemo(() => {
        if (!showSameBranchDoctors || selectedEditSpecialties.size === 0) {
            return selectedEditMedico ? [selectedEditMedico] : [];
        }
        return allMedici.filter(m => {
            const values = [
                m.specialty,
                m.specialita,
                m.specializzazione,
                ...(Array.isArray(m.specialties) ? m.specialties : []),
                ...(Array.isArray(m.specializzazioni) ? m.specializzazioni : []),
            ].filter(Boolean).map((value: unknown) => String(value).trim().toLowerCase());
            return values.some(value => selectedEditSpecialties.has(value));
        });
    }, [allMedici, selectedEditMedico, selectedEditSpecialties, showSameBranchDoctors]);
    const editCandidateMedicoIds = useMemo(
        () => new Set(editCandidateMedici.map(m => m.id).filter(Boolean)),
        [editCandidateMedici]
    );
    const editSlotRange = useMemo(() => {
        const start = new Date(editWeekStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { start, end };
    }, [editWeekStart]);
    const { data: editSlotsResponse, isFetching: loadingEditSlots } = useQuery({
        queryKey: ['appuntamenti-edit-slots', editForm.medicoId, editForm.prestazioneId, showSameBranchDoctors, editSlotRange.start.toISOString()],
        queryFn: () => slotsApi.getAll({
            filters: {
                dataInizio: toLocalDateStr(editSlotRange.start),
                dataFine: toLocalDateStr(editSlotRange.end),
                disponibile: true,
                ...(editForm.prestazioneId && { prestazioneId: editForm.prestazioneId }),
                ...(!showSameBranchDoctors && editForm.medicoId && { medicoId: editForm.medicoId }),
            },
            limit: 500,
        }),
        enabled: !!editingAppuntamento && !!editForm.medicoId,
        staleTime: 15_000,
    });
    const { data: editOccupiedResponse, isFetching: loadingEditOccupied } = useQuery({
        queryKey: ['appuntamenti-edit-occupied', editForm.medicoId, showSameBranchDoctors, editSlotRange.start.toISOString()],
        queryFn: () => appuntamentiApi.getAll({
            page: 1,
            limit: 500,
            filters: {
                dataInizio: toLocalDateStr(editSlotRange.start),
                dataFine: toLocalDateStr(editSlotRange.end),
                stato: activeAppointmentStates,
                ...(!showSameBranchDoctors && editForm.medicoId && { medicoId: editForm.medicoId }),
            },
        }),
        enabled: !!editingAppuntamento && !!editForm.medicoId,
        staleTime: 15_000,
    });
    const editDays = useMemo(() => {
        const rawSlots = ((editSlotsResponse?.data || []) as SlotDisponibilita[])
            .filter(slot => !editCandidateMedicoIds.size || (slot.medicoId && editCandidateMedicoIds.has(slot.medicoId)));
        const occupied = ((editOccupiedResponse?.data || []) as Appuntamento[])
            .filter(app => app.id !== editingAppuntamento?.id)
            .filter(app => !editCandidateMedicoIds.size || (app.medicoId && editCandidateMedicoIds.has(app.medicoId)));
        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(editSlotRange.start);
            date.setDate(editSlotRange.start.getDate() + index);
            return { key: toLocalDateStr(date), date, slots: [] as SlotDisponibilita[], occupied: [] as Appuntamento[] };
        });
        rawSlots.forEach(slot => {
            const day = days.find(item => item.key === String(slot.data).split('T')[0]);
            if (day) day.slots.push(slot);
        });
        occupied.forEach(app => {
            const day = days.find(item => item.key === String(app.dataOra).split('T')[0]);
            if (day) day.occupied.push(app);
        });
        return days;
    }, [editCandidateMedicoIds, editOccupiedResponse?.data, editSlotRange.start, editSlotsResponse?.data, editingAppuntamento?.id]);
    const editSelectedSlotWindow = useMemo(() => {
        if (!editForm.data) return null;
        const day = editDays.find(item => item.key === editForm.data);
        if (!day) return null;
        const selectedTime = timeToMinutes(editForm.ora);
        return day.slots.find(slot => {
            if (editForm.medicoId && slot.medicoId !== editForm.medicoId) return false;
            if (editForm.ambulatorioId && slot.ambulatorioId !== editForm.ambulatorioId) return false;
            const start = timeToMinutes(slot.oraInizio);
            const end = timeToMinutes(slot.oraFine);
            return selectedTime >= start && selectedTime <= end;
        }) || day.slots.find(slot => !editForm.medicoId || slot.medicoId === editForm.medicoId) || null;
    }, [editDays, editForm.ambulatorioId, editForm.data, editForm.medicoId, editForm.ora]);

    // Poliambulatori for advanced filters
    const { data: poliambulatoriData } = useQuery({
        queryKey: ['poliambulatori-filter', tenantFilterKey],
        queryFn: () => poliambulatoriApi.getAll({ limit: 100 }),
        enabled: isReady,
        staleTime: 5 * 60_000,
    });

    // Sedi for advanced filters (cascading from poliambulatorio)
    const { data: sediData } = useQuery({
        queryKey: ['sedi-filter', tenantFilterKey, poliambulatorioFilter],
        queryFn: () => sediApi.getAll({
            limit: 100,
            ...(poliambulatorioFilter && { poliambulatorioId: poliambulatorioFilter })
        }),
        enabled: isReady,
        staleTime: 5 * 60_000,
    });

    // Prestazioni da refertare count
    const { data: prestazioniListData } = useQuery({
        queryKey: ['prestazioni-da-refertare-list', tenantFilterKey],
        queryFn: () => appuntamentoPrestazioniApi.listDaRefertare({ limit: 50 }),
        staleTime: 30_000,
        enabled: isReady,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const daRefertareBadgeCount = (prestazioniListData as any)?.total ?? 0;

    // Conteggio filtri avanzati attivi
    const advancedFilterCount = [poliambulatorioFilter, sedeFilter, ambulatorioFilter].filter(Boolean).length;

    // Status count queries (like VisiteListPage)
    const countBaseParams = useMemo(() => {
        const tp = getTenantFilterParams();
        const dataInizio = dateRange.start ? toISODateString(dateRange.start) : null;
        const dataFine = dateRange.end ? toISODateString(dateRange.end) : null;
        return {
            limit: 1,
            ...(searchTerm && { search: searchTerm }),
            ...(dataInizio && { dataInizio }),
            ...(dataFine && { dataFine }),
            ...(ambulatorioFilter && { ambulatorioId: ambulatorioFilter }),
            ...(medicoFilter && { medicoId: medicoFilter }),
            ...(timeRange.start && { oraInizio: timeRange.start }),
            ...(timeRange.end && { oraFine: timeRange.end }),
            ...(sedeFilter && { sedeId: sedeFilter }),
            ...(poliambulatorioFilter && { poliambulatorioId: poliambulatorioFilter }),
            ...(tp.tenantIds && { tenantIds: tp.tenantIds.join(',') }),
            ...(tp.allTenants && { allTenants: 'true' })
        };
    }, [searchTerm, dateRange, ambulatorioFilter, medicoFilter, timeRange, sedeFilter, poliambulatorioFilter, getTenantFilterParams, tenantFilterKey]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statoCounts: Record<string, number> = {};

    const { data: countPrenotato } = useQuery({
        queryKey: ['appuntamenti-count', 'PRENOTATO', countBaseParams],
        queryFn: () => appuntamentiApi.getAll({ ...countBaseParams, filters: { ...countBaseParams, stato: 'PRENOTATO' } }),
        enabled: isReady, staleTime: 15_000,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statoCounts['PRENOTATO'] = (countPrenotato as any)?.pagination?.total ?? 0;

    const { data: countConfermato } = useQuery({
        queryKey: ['appuntamenti-count', 'CONFERMATO', countBaseParams],
        queryFn: () => appuntamentiApi.getAll({ ...countBaseParams, filters: { ...countBaseParams, stato: 'CONFERMATO' } }),
        enabled: isReady, staleTime: 15_000,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statoCounts['CONFERMATO'] = (countConfermato as any)?.pagination?.total ?? 0;

    const { data: countInAttesa } = useQuery({
        queryKey: ['appuntamenti-count', 'IN_ATTESA', countBaseParams],
        queryFn: () => appuntamentiApi.getAll({ ...countBaseParams, filters: { ...countBaseParams, stato: 'IN_ATTESA' } }),
        enabled: isReady, staleTime: 15_000,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statoCounts['IN_ATTESA'] = (countInAttesa as any)?.pagination?.total ?? 0;

    const { data: countInCorso } = useQuery({
        queryKey: ['appuntamenti-count', 'IN_CORSO', countBaseParams],
        queryFn: () => appuntamentiApi.getAll({ ...countBaseParams, filters: { ...countBaseParams, stato: 'IN_CORSO' } }),
        enabled: isReady, staleTime: 15_000,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statoCounts['IN_CORSO'] = (countInCorso as any)?.pagination?.total ?? 0;

    const { data: countCompletato } = useQuery({
        queryKey: ['appuntamenti-count', 'COMPLETATO', countBaseParams],
        queryFn: () => appuntamentiApi.getAll({ ...countBaseParams, filters: { ...countBaseParams, stato: 'COMPLETATO' } }),
        enabled: isReady, staleTime: 15_000,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statoCounts['COMPLETATO'] = (countCompletato as any)?.pagination?.total ?? 0;

    const { data: countAnnullato } = useQuery({
        queryKey: ['appuntamenti-count', 'ANNULLATO', countBaseParams],
        queryFn: () => appuntamentiApi.getAll({ ...countBaseParams, filters: { ...countBaseParams, stato: 'ANNULLATO' } }),
        enabled: isReady, staleTime: 15_000,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statoCounts['ANNULLATO'] = (countAnnullato as any)?.pagination?.total ?? 0;

    const { data: countNoShow } = useQuery({
        queryKey: ['appuntamenti-count', 'NO_SHOW', countBaseParams],
        queryFn: () => appuntamentiApi.getAll({ ...countBaseParams, filters: { ...countBaseParams, stato: 'NO_SHOW' } }),
        enabled: isReady, staleTime: 15_000,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statoCounts['NO_SHOW'] = (countNoShow as any)?.pagination?.total ?? 0;

    const { data: countFatturato } = useQuery({
        queryKey: ['appuntamenti-count', 'FATTURATO', countBaseParams],
        queryFn: () => appuntamentiApi.getAll({ ...countBaseParams, filters: { ...countBaseParams, stato: 'FATTURATO' } }),
        enabled: isReady, staleTime: 15_000,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statoCounts['FATTURATO'] = (countFatturato as any)?.pagination?.total ?? 0;

    // === MUTATIONS ===

    const changeStatoMutation = useMutation({
        mutationFn: ({ id, stato }: { id: string; stato: StatoAppuntamento }) =>
            appuntamentiApi.changeStato(id, stato),
        onSuccess: (_, { id }) => {
            setBusyIds(prev => { const s = new Set(prev); s.delete(id); return s; });
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
        },
        onError: (_, { id }) => {
            setBusyIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        }
    });

    const updateAppointmentMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Appuntamento> }) =>
            appuntamentiApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
            setEditingAppuntamento(null);
        }
    });

    const accettaMutation = useMutation({
        mutationFn: (id: string) => appuntamentiApi.accetta(id),
        onSuccess: (_, id) => {
            setBusyIds(prev => { const s = new Set(prev); s.delete(id); return s; });
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
        },
        onError: (_, id) => {
            setBusyIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        }
    });

    const chiamaMutation = useMutation({
        mutationFn: (id: string) => appuntamentiApi.chiama(id),
        onSuccess: (_, id) => {
            setBusyIds(prev => { const s = new Set(prev); s.delete(id); return s; });
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
        },
        onError: (_, id) => {
            setBusyIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => appuntamentiApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
        }
    });

    // === KANBAN HANDLER ===

    const handleKanbanAction = useCallback((action: string, app: Appuntamento) => {
        setBusyIds(prev => new Set(prev).add(app.id));
        switch (action) {
            case 'accetta':
                setBusyIds(prev => { const s = new Set(prev); s.delete(app.id); return s; });
                setAccettazioneInitialTab('anagrafica');
                setAccettazioneAppuntamento(app);
                break;
            case 'noshow':
                changeStatoMutation.mutate({ id: app.id, stato: 'NO_SHOW' });
                break;
            case 'visita':
                changeStatoMutation.mutate({ id: app.id, stato: 'IN_CORSO' });
                if (app.visita?.id) {
                    setTimeout(() => navigate(`/poliambulatorio/visite/${app.visita!.id}`), 300);
                } else {
                    setTimeout(() => navigate(`/poliambulatorio/appuntamenti/${app.id}`), 300);
                }
                break;
            case 'chiama-visita':
                chiamaMutation.mutate(app.id);
                if (app.visita?.id) {
                    setTimeout(() => navigate(`/poliambulatorio/visite/${app.visita!.id}`), 300);
                } else {
                    setTimeout(() => navigate(`/poliambulatorio/appuntamenti/${app.id}`), 300);
                }
                break;
            case 'vai-visita':
                setBusyIds(prev => { const s = new Set(prev); s.delete(app.id); return s; });
                if (app.visita?.id) navigate(`/poliambulatorio/visite/${app.visita.id}`);
                break;
            case 'fattura':
                setBusyIds(prev => { const s = new Set(prev); s.delete(app.id); return s; });
                setAccettazioneInitialTab('fatturazione');
                setAccettazioneAppuntamento(app);
                break;
            case 'vedi-referto':
                setBusyIds(prev => { const s = new Set(prev); s.delete(app.id); return s; });
                if (app.visita?.id) {
                    navigate(`/poliambulatorio/visite/${app.visita.id}`);
                } else {
                    navigate(`/poliambulatorio/agenda/appuntamenti/${app.id}`);
                }
                break;
            default:
                setBusyIds(prev => { const s = new Set(prev); s.delete(app.id); return s; });
        }
    }, [accettaMutation, changeStatoMutation, chiamaMutation, navigate]);

    const handleDelete = async (id: string) => {
        if (await confirmDeleteDialog('questo appuntamento')) {
            await deleteMutation.mutateAsync(id);
        }
    };

    const openEditModal = (app: Appuntamento) => {
        const date = new Date(app.dataOra);
        setEditForm({
            data: toLocalDateStr(date),
            ora: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
            durataMinuti: app.durataMinuti || 30,
            medicoId: app.medicoId || '',
            prestazioneId: app.prestazioneId || '',
            ambulatorioId: app.ambulatorioId || '',
            stato: app.stato,
            convenzioneId: app.convenzioneId || '',
            note: app.note || '',
            noteInterne: app.noteInterne || '',
        });
        setEditWeekStart(startOfWeek(date));
        setShowSameBranchDoctors(false);
        setEditingAppuntamento(app);
    };

    const shiftEditWeek = (days: number) => {
        setEditWeekStart(prev => {
            const next = new Date(prev);
            next.setDate(prev.getDate() + days);
            return startOfWeek(next);
        });
    };

    const selectEditSlot = (slot: SlotDisponibilita, time = slot.oraInizio) => {
        setEditForm(f => ({
            ...f,
            data: String(slot.data).split('T')[0],
            ora: time,
            medicoId: slot.medicoId || f.medicoId,
            ambulatorioId: slot.ambulatorioId || f.ambulatorioId,
            prestazioneId: slot.prestazioneId || f.prestazioneId,
        }));
    };

    const saveEditModal = () => {
        if (!editingAppuntamento || !editForm.data || !editForm.ora) return;
        updateAppointmentMutation.mutate({
            id: editingAppuntamento.id,
            data: {
                dataOra: `${editForm.data}T${editForm.ora}:00`,
                durataMinuti: editForm.durataMinuti,
                medicoId: editForm.medicoId,
                prestazioneId: editForm.prestazioneId || null,
                ambulatorioId: editForm.ambulatorioId,
                convenzioneId: editForm.convenzioneId || null,
                stato: editForm.stato,
                note: editForm.note,
                noteInterne: editForm.noteInterne,
            } as Partial<Appuntamento>,
        });
    };

    const handleAccettazioneConfirm = async (patientData: PatientFormData) => {
        if (!accettazioneAppuntamento) return;
        const app = accettazioneAppuntamento;
        await appuntamentiApi.accetta(app.id, {
            convenzioneId: patientData.convenzioneId || undefined,
            pazienteId: patientData.pazienteId || undefined,
            note: patientData.note || undefined,
            noteInterne: patientData.noteInterne || undefined,
            stato: patientData.stato || undefined,
        }, app.tenantId);
        setAccettazioneAppuntamento(null);
        queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
    };

    const openVisitForAppointment = (app: Appuntamento) => {
        if (app.visita?.id) {
            navigate(`/poliambulatorio/visite/${app.visita.id}`);
        } else {
            navigate(`/poliambulatorio/agenda/appuntamenti/${app.id}`);
        }
    };

    const canVisitDirectly = canOpenVisitAction;

    // === SORTED DATA ===

    // Medici list derived from loaded appuntamenti (period-aware)
    const medici = useMemo(() => {
        const map = new Map<string, { id: string; firstName: string; lastName: string; gender?: string | null; taxCode?: string | null }>();
        (appuntamentiData?.data || []).forEach((app: Appuntamento) => {
            if (app.medico) map.set(app.medico.id, app.medico as { id: string; firstName: string; lastName: string; gender?: string | null; taxCode?: string | null });
        });
        return Array.from(map.values()).sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [appuntamentiData]);

    const sortedAppuntamenti = useMemo(() => {
        const data = appuntamentiData?.data || [];
        return [...data].sort((a, b) => {
            let cmp = 0;
            if (sortField === 'dataOra') {
                cmp = new Date(a.dataOra).getTime() - new Date(b.dataOra).getTime();
            } else if (sortField === 'paziente') {
                cmp = getPersonDisplayName(a.paziente, '').localeCompare(getPersonDisplayName(b.paziente, ''), 'it');
            } else if (sortField === 'prestazione') {
                cmp = (a.prestazione?.nome ?? '').localeCompare(b.prestazione?.nome ?? '', 'it');
            } else if (sortField === 'ambulatorio') {
                cmp = (a.ambulatorio?.nome ?? '').localeCompare(b.ambulatorio?.nome ?? '', 'it');
            } else if (sortField === 'stato') {
                cmp = a.stato.localeCompare(b.stato, 'it');
            } else if (sortField === 'durata') {
                cmp = (a.durataMinuti ?? 0) - (b.durataMinuti ?? 0);
            } else if (sortField === 'costo') {
                cmp = getAppointmentPriceInfo(a).finalPrice - getAppointmentPriceInfo(b).finalPrice;
            } else if (sortField === 'coda') {
                cmp = (a.numeroCoda ?? 9999) - (b.numeroCoda ?? 9999);
            } else if (sortField === 'note') {
                cmp = (a.note ?? '').localeCompare(b.note ?? '', 'it');
            } else if (sortField === 'noteInterne') {
                cmp = (a.noteInterne ?? '').localeCompare(b.noteInterne ?? '', 'it');
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [appuntamentiData, sortField, sortDir]);

    // Kanban groups
    const kanbanGroups = useMemo(() => {
        const prenotatiConfermati: Appuntamento[] = [];
        const inAttesa: Appuntamento[] = [];
        const inCorso: Appuntamento[] = [];
        const completatiFatturati: Appuntamento[] = [];

        sortedAppuntamenti.forEach(app => {
            if (app.stato === 'PRENOTATO' || app.stato === 'CONFERMATO') prenotatiConfermati.push(app);
            else if (app.stato === 'IN_ATTESA') inAttesa.push(app);
            else if (app.stato === 'IN_CORSO') inCorso.push(app);
            else if (app.stato === 'COMPLETATO' || app.stato === 'FATTURATO') completatiFatturati.push(app);
        });

        return { prenotatiConfermati, inAttesa, inCorso, completatiFatturati };
    }, [sortedAppuntamenti]);

    const resetFilters = () => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        setSearchTerm('');
        setStatoFilter('');
        setAmbulatorioFilter('');
        setMedicoFilter('');
        setTimeRange({ start: null, end: null });
        setSoloSecundarieDaRefertare(false);
        setSoloNonFatturate(false);
        setPoliambulatorioFilter('');
        setSedeFilter('');
        setDateRange({ start: today, end: today });
        setSortDir('asc');
        setSortField('dataOra');
        setPage(1);
    };

    const pagination = appuntamentiData?.pagination;
    const totalPages = pagination?.totalPages || 1;

    // Sort icon helper
    const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
        if (sortField === field) {
            return sortDir === 'asc'
                ? <ChevronUp className="w-3.5 h-3.5 text-teal-600" />
                : <ChevronDown className="w-3.5 h-3.5 text-teal-600" />;
        }
        return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />;
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="p-6 space-y-6">
            {/* Header — toggle switch accanto al pulsante */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Calendar className="w-7 h-7 text-teal-600" />
                        Appuntamenti
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        {pagination?.total || 0} appuntamenti totali
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View toggle — accanto al pulsante come richiesto */}
                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg p-1 bg-white dark:bg-gray-800">
                        <button
                            onClick={() => setView('list')}
                            className={`p-1.5 rounded transition-colors ${view === 'list'
                                ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            title="Vista lista"
                        >
                            <LayoutList className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setView('kanban')}
                            className={`p-1.5 rounded transition-colors ${view === 'kanban'
                                ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            title="Vista kanban"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                    </div>
                    {/* Queue modal button — accanto al toggle */}
                    <button
                        onClick={() => setShowQueueModal(true)}
                        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-amber-300 dark:border-amber-600 bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors text-sm font-medium shadow-sm"
                        title="Gestione coda pazienti"
                    >
                        <Users className="h-4 w-4" />
                        Coda
                    </button>
                    <CRUDPrimaryButton
                        onClick={() => navigate('/poliambulatorio/agenda/nuovo')}
                        operation="create"
                    >
                        <Plus className="h-5 w-5" />
                        Nuovo Appuntamento
                    </CRUDPrimaryButton>
                </div>
            </div>

            {/* Filters Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                {/* Row 1: Search | Periodo | Fascia oraria | Medici | Colonne & Filtri */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1fr_auto_auto_1fr_auto] gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            placeholder="Cerca paziente, numero..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 shadow-sm hover:border-teal-400 hover:shadow-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:ring-offset-1 text-sm h-10 transition-all duration-300 dark:text-gray-100 dark:placeholder-gray-400"
                        />
                    </div>
                    {/* DateRange */}
                    <DateRangeCalendar
                        value={dateRange}
                        onChange={(range) => { setDateRange(range); setPage(1); }}
                        placeholder="Periodo"
                        theme="teal"
                        size="md"
                        clearable
                        showPresets
                    />
                    {/* TimeRangePicker — fascia oraria */}
                    <TimeRangePicker
                        value={timeRange}
                        onChange={(r) => { setTimeRange(r); setPage(1); }}
                        theme="teal"
                        size="md"
                        clearable
                    />
                    {/* Medici filter */}
                    <div className="relative min-w-[220px]">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <ElegantSelect
                            value={medicoFilter}
                            onChange={(value) => { setMedicoFilter(value); setPage(1); }}
                            placeholder="Tutti i medici"
                            triggerClassName="pl-10"
                            options={[
                                { value: '', label: 'Tutti i medici' },
                                ...medici.map((medico) => ({ value: medico.id, label: `${medico.firstName} ${medico.lastName}` }))
                            ]}
                        />
                    </div>
                    {/* Column selector + Advanced filters */}
                    <div className="flex items-center gap-2">
                        {/* Column selector */}
                        <div className="relative" ref={colMenuRef}>
                            <button
                                onClick={() => setShowColMenu(v => !v)}
                                className={`
                                    flex items-center gap-3 group
                                    h-10 text-sm px-3
                                    bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700
                                    border rounded-xl shadow-sm
                                    border-gray-200 dark:border-gray-600 hover:border-teal-400 hover:shadow-md
                                    focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1
                                    transition-all duration-300 ease-out
                                    ${showColMenu ? 'border-teal-300 shadow-md ring-2 ring-teal-100' : ''}
                                `}
                            >
                                <div className={`
                                    p-1.5 rounded-lg transition-colors duration-200
                                    ${showColMenu ? 'bg-teal-100 dark:bg-teal-900/40' : 'bg-teal-50 dark:bg-teal-900/20 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/40'}
                                `}>
                                    <SlidersHorizontal className={`h-4 w-4 ${showColMenu ? 'text-teal-600' : 'text-teal-500'}`} />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Colonne</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100 text-xs">{visibleCols.size} attive</span>
                                </div>
                            </button>
                            {showColMenu && (
                                <div className="absolute top-full right-0 mt-1 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 min-w-[220px]">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-1">Colonne visibili & ordine</p>
                                    {columnOrder.map((key, idx) => {
                                        const def = ALL_OPTIONAL_COLS.find(c => c.key === key);
                                        if (!def) return null;
                                        return (
                                            <div key={key} className="flex items-center gap-1 px-1 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <input type="checkbox" checked={visibleCols.has(key)} onChange={() => toggleCol(key)} className="rounded accent-teal-600 flex-shrink-0" />
                                                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{def.label}</span>
                                                <button
                                                    onClick={() => moveCol(key, 'up')}
                                                    disabled={idx === 0}
                                                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30"
                                                >
                                                    <ChevronUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => moveCol(key, 'down')}
                                                    disabled={idx === columnOrder.length - 1}
                                                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30"
                                                >
                                                    <ChevronDown className="w-3 h-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        {/* Advanced filters toggle */}
                        <button
                            onClick={() => setShowAdvancedFilters(v => !v)}
                            className={`
                                flex items-center gap-3 group
                                h-10 text-sm px-3
                                bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700
                                border rounded-xl shadow-sm
                                focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1
                                transition-all duration-300 ease-out
                                ${showAdvancedFilters
                                    ? 'border-teal-300 shadow-md ring-2 ring-teal-100'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-teal-400 hover:shadow-md'
                                }
                            `}
                        >
                            <div className={`
                                p-1.5 rounded-lg transition-colors duration-200
                                ${showAdvancedFilters ? 'bg-teal-100 dark:bg-teal-900/40' : 'bg-teal-50 dark:bg-teal-900/20 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/40'}
                            `}>
                                <ListFilter className={`h-4 w-4 ${showAdvancedFilters ? 'text-teal-600' : 'text-teal-500'}`} />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Filtri</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100 text-xs">
                                    {advancedFilterCount > 0 ? `${advancedFilterCount} attiv${advancedFilterCount === 1 ? 'o' : 'i'}` : 'Avanzati'}
                                </span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Row 2: Da refertare | merged stato chips | spacer | Azzera | Aggiorna */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                    {/* Da refertare quickfilter */}
                    <button
                        onClick={() => { setSoloSecundarieDaRefertare(v => !v); setPage(1); }}
                        title={daRefertareBadgeCount > 0
                            ? `${daRefertareBadgeCount} prestazion${daRefertareBadgeCount === 1 ? 'e' : 'i'} da refertare`
                            : 'Nessuna prestazione da refertare'
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${soloSecundarieDaRefertare
                            ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                            : 'bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 border-violet-300 dark:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20'
                            }`}
                    >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Da refertare
                        {daRefertareBadgeCount > 0 && (
                            <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${soloSecundarieDaRefertare
                                ? 'bg-white text-violet-700'
                                : 'bg-violet-600 text-white'
                                }`}>
                                {daRefertareBadgeCount}
                            </span>
                        )}
                    </button>

                    {/* Da fatturare quickfilter */}
                    <button
                        onClick={() => { setSoloNonFatturate(v => !v); setPage(1); }}
                        title={(statoCounts['COMPLETATO'] ?? 0) > 0
                            ? `${statoCounts['COMPLETATO']} appuntament${statoCounts['COMPLETATO'] === 1 ? 'o' : 'i'} da fatturare`
                            : 'Nessun appuntamento da fatturare'
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${soloNonFatturate
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                            }`}
                    >
                        <Receipt className="w-3 h-3" />
                        Da fatturare
                        {(statoCounts['COMPLETATO'] ?? 0) > 0 && (
                            <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${soloNonFatturate
                                ? 'bg-white text-amber-700'
                                : 'bg-amber-600 text-white'
                                }`}>
                                {statoCounts['COMPLETATO']}
                            </span>
                        )}
                    </button>

                    {/* Merged: Prenotato + Confermato */}
                    {(() => {
                        const isActive = statoFilter === 'PRENOTATO_CONFERMATO';
                        const countMerged = (statoCounts['PRENOTATO'] ?? 0) + (statoCounts['CONFERMATO'] ?? 0);
                        return (
                            <button
                                onClick={() => { setStatoFilter(isActive ? '' : 'PRENOTATO_CONFERMATO'); setPage(1); }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${isActive
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <Calendar className="w-3 h-3" />
                                Prenotato / Confermato
                                {countMerged > 0 && (
                                    <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}>
                                        {countMerged}
                                    </span>
                                )}
                            </button>
                        );
                    })()}

                    {/* Individual chips for remaining statuses */}
                    {(['IN_ATTESA', 'IN_CORSO', 'COMPLETATO', 'FATTURATO'] as StatoAppuntamento[]).map(statoKey => {
                        const config = STATO_CONFIG[statoKey];
                        const isActive = statoFilter === statoKey;
                        const IconComp = config.icon;
                        const count = statoCounts[statoKey] ?? 0;
                        return (
                            <button
                                key={statoKey}
                                onClick={() => { setStatoFilter(isActive ? '' : statoKey); setPage(1); }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${isActive
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <IconComp className="w-3 h-3" />
                                {config.label}
                                {count > 0 && (
                                    <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    {/* No Show resta uno stato visibile; annullato passa da eliminazione soft-delete */}
                    {(() => {
                        const statoKey: StatoAppuntamento = 'NO_SHOW';
                        const config = STATO_CONFIG[statoKey];
                        const isActive = statoFilter === statoKey;
                        const count = statoCounts[statoKey] ?? 0;
                        return (
                            <button
                                onClick={() => { setStatoFilter(isActive ? '' : statoKey); setPage(1); }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${isActive
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <AlertCircle className="w-3 h-3" />
                                {config.label}
                                {count > 0 && (
                                    <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })()}

                    <div className="flex-1" />

                    {/* Reset */}
                    <button
                        onClick={resetFilters}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                        Azzera
                    </button>

                    {/* Refresh */}
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Aggiorna
                    </button>
                </div>
            </div>

            {/* Advanced Filters Card (Poliambulatorio → Sede → Ambulatorio) */}
            {showAdvancedFilters && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Poliambulatorio */}
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <ElegantSelect
                                value={poliambulatorioFilter}
                                onChange={(value) => {
                                    setPoliambulatorioFilter(value);
                                    setSedeFilter('');
                                    setAmbulatorioFilter('');
                                    setPage(1);
                                }}
                                triggerClassName="pl-9"
                                placeholder="Tutti i poliambulatori"
                                options={[
                                    { value: '', label: 'Tutti i poliambulatori' },
                                    ...(((poliambulatoriData as any)?.data || []).map((p: { id: string; nome: string }) => ({ value: p.id, label: p.nome })))
                                ]}
                            />
                        </div>

                        {/* Sede */}
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <ElegantSelect
                                value={sedeFilter}
                                onChange={(value) => {
                                    setSedeFilter(value);
                                    setAmbulatorioFilter('');
                                    setPage(1);
                                }}
                                triggerClassName="pl-9"
                                placeholder="Tutte le sedi"
                                options={[
                                    { value: '', label: 'Tutte le sedi' },
                                    ...(((sediData as any)?.data || []).map((s: { id: string; nome: string }) => ({ value: s.id, label: s.nome })))
                                ]}
                            />
                        </div>

                        {/* Ambulatorio */}
                        <div className="relative">
                            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <ElegantSelect
                                value={ambulatorioFilter}
                                onChange={(value) => {
                                    setAmbulatorioFilter(value);
                                    setPage(1);
                                }}
                                triggerClassName="pl-9"
                                placeholder="Tutti gli ambulatori"
                                options={[
                                    { value: '', label: 'Tutti gli ambulatori' },
                                    ...((ambulatoriData?.data || []).map((a: { id: string; nome: string }) => ({ value: a.id, label: a.nome })))
                                ]}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Queue Management Modal */}
            {showQueueModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowQueueModal(false)} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <Users className="w-5 h-5 text-amber-600" />
                                Gestione Coda Pazienti
                            </h2>
                            <button onClick={() => setShowQueueModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        {/* Patients currently waiting (IN_ATTESA) */}
                        <div className="space-y-3">
                            {sortedAppuntamenti.filter(a => a.stato === 'IN_ATTESA').length > 0 ? (
                                sortedAppuntamenti
                                    .filter(a => a.stato === 'IN_ATTESA')
                                    .sort((a, b) => (a.numeroCoda ?? 9999) - (b.numeroCoda ?? 9999))
                                    .map(app => (
                                        <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                            <div className="flex items-center gap-3">
                                                {app.numeroCoda != null && (
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-sm font-bold">
                                                        {app.displayNumberCoda || app.numeroCoda}
                                                    </span>
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {getPersonDisplayName(app.paziente, 'N/D')}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {app.prestazione?.nome || 'Nessuna prestazione'} • {formatTime(new Date(app.dataOra))}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {app.numeroCoda != null ? (
                                                    <button
                                                        onClick={() => {
                                                            chiamaMutation.mutate(app.id);
                                                            if (app.visita?.id) setTimeout(() => navigate(`/poliambulatorio/visite/${app.visita!.id}`), 300);
                                                        }}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                                                    >
                                                        <PhoneCall className="h-3 w-3" />
                                                        Chiama
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            changeStatoMutation.mutate({ id: app.id, stato: 'IN_CORSO' });
                                                            if (app.visita?.id) setTimeout(() => navigate(`/poliambulatorio/visite/${app.visita!.id}`), 300);
                                                        }}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                                                    >
                                                        <Play className="h-3 w-3" />
                                                        Visita
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                            ) : (
                                <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Nessun paziente in coda</p>
                                    <p className="text-xs mt-1">I pazienti con stato "In Attesa" appariranno qui</p>
                                </div>
                            )}
                        </div>
                        {/* In Corso section */}
                        {sortedAppuntamenti.filter(a => a.stato === 'IN_CORSO').length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase mb-2">In visita ora</p>
                                {sortedAppuntamenti.filter(a => a.stato === 'IN_CORSO').map(app => (
                                    <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
                                        <div className="flex items-center gap-3">
                                            <Stethoscope className="w-5 h-5 text-purple-500" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {getPersonDisplayName(app.paziente, 'N/D')}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {app.prestazione?.nome || 'N/D'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowQueueModal(false);
                                                if (app.visita?.id) navigate(`/poliambulatorio/visite/${app.visita.id}`);
                                            }}
                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            Vai
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="text-red-700 dark:text-red-300">Errore nel caricamento degli appuntamenti</span>
                </div>
            )}

            {/* ==================== LIST VIEW ==================== */}
            {view === 'list' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    {/* Fixed: Azioni */}
                                    <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700/50 px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Azioni
                                    </th>
                                    {/* Fixed: Data/Ora */}
                                    <th
                                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        onClick={() => handleSort('dataOra')}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            Data / Ora
                                            <SortIcon field="dataOra" />
                                        </span>
                                    </th>
                                    {/* Fixed: Paziente */}
                                    <th
                                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        onClick={() => handleSort('paziente')}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            Paziente
                                            <SortIcon field="paziente" />
                                        </span>
                                    </th>
                                    {/* Dynamic optional columns */}
                                    {columnOrder.filter(c => visibleCols.has(c)).map(col => {
                                        const colDef = ALL_OPTIONAL_COLS.find(c2 => c2.key === col);
                                        const isSortable = ['prestazione', 'ambulatorio', 'durata', 'costo', 'coda', 'note', 'noteInterne'].includes(col);
                                        return (
                                            <th
                                                key={col}
                                                className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ${isSortable ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700' : ''} transition-colors`}
                                                onClick={isSortable ? () => handleSort(col as SortField) : undefined}
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    {colDef?.label ?? col}
                                                    {isSortable && <SortIcon field={col as SortField} />}
                                                </span>
                                            </th>
                                        );
                                    })}
                                    {/* Fixed: Stato */}
                                    <th
                                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        onClick={() => handleSort('stato')}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            Stato
                                            <SortIcon field="stato" />
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            {Array.from({ length: 4 + visibleCols.size }).map((__, j) => (
                                                <td key={j} className="px-4 py-4">
                                                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : sortedAppuntamenti.length === 0 ? (
                                    <tr>
                                        <td colSpan={4 + visibleCols.size} className="px-4 py-12 text-center">
                                            <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                            <p className="text-gray-500 dark:text-gray-400 font-medium">Nessun appuntamento trovato</p>
                                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                                                Gli appuntamenti appariranno qui quando saranno creati
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    sortedAppuntamenti.map(app => {
                                        const dataOra = new Date(app.dataOra);
                                        const oraFine = new Date(dataOra.getTime() + (app.durataMinuti || 30) * 60000);

                                        return (
                                            <tr
                                                key={app.id}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                                onClick={() => navigate(`/poliambulatorio/agenda/appuntamenti/${app.id}`)}
                                            >
                                                {/* Actions */}
                                                <td className="sticky left-0 z-10 bg-white px-4 py-3 text-left dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
                                                    <ActionButton
                                                        theme="teal"
                                                        actions={[
                                                            ...((app.stato === 'PRENOTATO' || app.stato === 'CONFERMATO') ? [{
                                                                label: 'Accetta Paziente',
                                                                icon: <UserCheck className="h-4 w-4" />,
                                                                onClick: () => { setAccettazioneInitialTab('anagrafica'); setAccettazioneAppuntamento(app); }
                                                            }] : []),
                                                            ...(app.stato === 'COMPLETATO' ? [{
                                                                label: 'Fattura',
                                                                icon: <FilePlus className="h-4 w-4" />,
                                                                onClick: () => { setAccettazioneInitialTab('fatturazione'); setAccettazioneAppuntamento(app); }
                                                            }] : []),
                                                            ...(canVisitDirectly(app) ? [{
                                                                label: 'Visita Paziente',
                                                                icon: <Play className="h-4 w-4" />,
                                                                onClick: () => openVisitForAppointment(app)
                                                            }] : []),
                                                            ...(canVisitDirectly(app) ? [{
                                                                label: 'Chiama e Visita Paziente',
                                                                icon: <PhoneCall className="h-4 w-4" />,
                                                                onClick: () => {
                                                                    chiamaMutation.mutate(app.id);
                                                                    setTimeout(() => openVisitForAppointment(app), 300);
                                                                }
                                                            }] : []),
                                                            { label: 'Visualizza', icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/poliambulatorio/agenda/appuntamenti/${app.id}`) },
                                                            { label: 'Modifica', icon: <Edit className="h-4 w-4" />, onClick: () => openEditModal(app) },
                                                            ...(app.paziente ? [{
                                                                label: 'Anagrafica paziente',
                                                                icon: <User className="h-4 w-4" />,
                                                                onClick: () => navigate(`/poliambulatorio/pazienti/${app.pazienteId}`)
                                                            }] : []),
                                                            ...(app.medico ? [{
                                                                label: 'Anagrafica medico',
                                                                icon: <Stethoscope className="h-4 w-4" />,
                                                                onClick: () => navigate(`/poliambulatorio/personale/medici/${app.medicoId}`)
                                                            }] : []),
                                                            ...(app.visita?.id ? [{
                                                                label: 'Vai alla visita',
                                                                icon: <ExternalLink className="h-4 w-4" />,
                                                                onClick: () => navigate(`/poliambulatorio/visite/${app.visita!.id}`)
                                                            }] : []),
                                                            { label: 'Elimina', icon: <Trash2 className="h-4 w-4" />, onClick: () => handleDelete(app.id), variant: 'danger' as const }
                                                        ]}
                                                    />
                                                </td>
                                                {/* Data/Ora */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-gray-400" />
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{formatDate(dataOra, 'short')}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {formatTime(dataOra)} - {formatTime(oraFine)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Paziente */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/40 rounded-full flex items-center justify-center">
                                                            <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                                                {getPersonDisplayName(app.paziente, 'N/D')}
                                                            </p>
                                                            {(app.paziente?.birthDate || app.paziente?.dataNascita) && (
                                                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                                                    {formatDate(new Date(app.paziente.birthDate || app.paziente.dataNascita!), 'medium')}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Dynamic optional columns */}
                                                {columnOrder.filter(c => visibleCols.has(c)).map(col => (
                                                    <td key={col} className="px-4 py-3">
                                                        {col === 'prestazione' && (
                                                            app.prestazione ? (
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{app.prestazione.nome}</p>
                                                                    {app.medico && (
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                            {getDoctorTitle(app.medico.taxCode || null, app.medico.gender || null)} {getPersonDisplayName(app.medico)}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ) : <span className="text-gray-400 dark:text-gray-500 text-sm italic">Non specificata</span>
                                                        )}
                                                        {col === 'medico' && (
                                                            app.medico ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Stethoscope className="w-4 h-4 text-gray-400" />
                                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                                        {getDoctorTitle(app.medico.taxCode || null, (app.medico.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null) ?? null)} {getPersonDisplayName(app.medico)}
                                                                    </span>
                                                                </div>
                                                            ) : <span className="text-gray-400 dark:text-gray-500 text-sm italic">N/D</span>
                                                        )}
                                                        {col === 'ambulatorio' && (
                                                            app.ambulatorio ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{app.ambulatorio.nome}</span>
                                                                </div>
                                                            ) : <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                                                        )}
                                                        {col === 'durata' && (
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                                {app.durataMinuti ? `${app.durataMinuti} min` : '—'}
                                                            </span>
                                                        )}
                                                        {col === 'costo' && (
                                                            (() => {
                                                                const price = getAppointmentPriceInfo(app);
                                                                return price.finalPrice > 0 ? (
                                                                    <span className="inline-flex flex-col text-sm text-gray-700 dark:text-gray-300">
                                                                        {price.hasDiscount && (
                                                                            <span className="text-[11px] text-gray-400 line-through">€ {price.base.toFixed(2)}</span>
                                                                        )}
                                                                        <span className="font-semibold">€ {price.finalPrice.toFixed(2)}</span>
                                                                    </span>
                                                                ) : <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>;
                                                            })()
                                                        )}
                                                        {col === 'coda' && (
                                                            app.numeroCoda != null ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <Hash className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                                                                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                                                        {app.displayNumberCoda || app.numeroCoda}
                                                                    </span>
                                                                </div>
                                                            ) : <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                                                        )}
                                                        {col === 'numero' && (
                                                            <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                                                                #{app.numero}
                                                            </span>
                                                        )}
                                                        {col === 'convenzione' && (
                                                            app.convenzione ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <BookOpen className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                                                                    <span className="text-sm text-indigo-700 dark:text-indigo-300 truncate max-w-[150px]">{app.convenzione.nome}</span>
                                                                </div>
                                                            ) : <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                                                        )}
                                                        {col === 'tipoVisitaMDL' && (
                                                            app.tipoVisitaMDL ? (
                                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">
                                                                    {app.tipoVisitaMDL.replace(/_/g, ' ')}
                                                                </span>
                                                            ) : <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                                                        )}
                                                        {col === 'aziendaMdl' && (
                                                            (app as any)._companyProfile?.ragioneSociale ? (
                                                                <div className="flex items-center gap-1.5 max-w-[180px]">
                                                                    <Building2 className="w-4 h-4 text-sky-500 flex-shrink-0" />
                                                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{(app as any)._companyProfile.ragioneSociale}</span>
                                                                </div>
                                                            ) : <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                                                        )}
                                                        {col === 'protocolloMansione' && (
                                                            <div className="max-w-[220px] text-sm">
                                                                <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                                                    {(app.paziente as any)?._mdlProfile?.protocolloSanitario?.nome || (app.paziente as any)?._mdlProfile?.protocolloSanitario?.denominazione || '—'}
                                                                </p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                    {getMdlMansioni(app).join(', ') || (app.paziente as any)?._mdlProfile?.title || 'Nessuna mansione'}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {col === 'rischiMdl' && (
                                                            getMdlRischi(app).length ? (
                                                                <div className="flex max-w-[240px] flex-wrap gap-1">
                                                                    {getMdlRischi(app).slice(0, 3).map(rischio => (
                                                                        <span key={rischio} className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                                                                            {rischio}
                                                                        </span>
                                                                    ))}
                                                                    {getMdlRischi(app).length > 3 && (
                                                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">+{getMdlRischi(app).length - 3}</span>
                                                                    )}
                                                                </div>
                                                            ) : <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                                                        )}
                                                        {col === 'accertamentiMdl' && (
                                                            ((app as any)._accertamentiMdl || []).length ? (
                                                                <div className="max-w-[240px] text-xs text-gray-600 dark:text-gray-300">
                                                                    {((app as any)._accertamentiMdl || []).slice(0, 2).map((acc: any) => (
                                                                        <p key={acc.id} className="truncate">
                                                                            {acc.prestazione?.nome || 'Accertamento'} · {acc.dataScadenza ? formatDate(new Date(acc.dataScadenza), 'short') : '—'}
                                                                        </p>
                                                                    ))}
                                                                </div>
                                                            ) : <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                                                        )}
                                                        {col === 'ultimaVisitaMdl' && (
                                                            (app as any)._ultimaVisitaMdl?.dataOra ? (
                                                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                                                    <p>{formatDate(new Date((app as any)._ultimaVisitaMdl.dataOra), 'short')}</p>
                                                                    <p className="text-xs text-gray-500">{(app as any)._ultimaVisitaMdl.tipoVisitaMDL?.replace(/_/g, ' ')}</p>
                                                                </div>
                                                            ) : <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                                                        )}
                                                        {col === 'pagamentoAnticipato' && (
                                                            app.pagamentoAnticipato ? (
                                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                                                                    Pagato
                                                                </span>
                                                            ) : <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                                                        )}
                                                        {col === 'note' && (
                                                            (app.note || app.noteInterne) ? (
                                                                <div className="group/note relative flex items-start gap-1.5 max-w-[200px]">
                                                                    <FileText className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                                                    <span className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{[app.note, app.noteInterne].filter(Boolean).join(' / ')}</span>
                                                                    {[app.note, app.noteInterne].filter(Boolean).join(' / ').length > 50 && (
                                                                        <div className="hidden group-hover/note:block absolute z-50 bottom-full left-0 mb-1 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg max-w-xs whitespace-pre-wrap pointer-events-none">
                                                                            {[app.note, app.noteInterne].filter(Boolean).join('\n\n')}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                                                        )}
                                                        {col === 'noteInterne' && (
                                                            app.noteInterne ? (
                                                                <div className="group/noteInt relative flex items-start gap-1.5 max-w-[200px]">
                                                                    <Lock className="h-4 w-4 text-violet-500 dark:text-violet-400 flex-shrink-0 mt-0.5" />
                                                                    <span className="text-sm text-violet-600 dark:text-violet-300 line-clamp-2">{app.noteInterne}</span>
                                                                    {app.noteInterne.length > 50 && (
                                                                        <div className="hidden group-hover/noteInt:block absolute z-50 bottom-full left-0 mb-1 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg max-w-xs whitespace-pre-wrap pointer-events-none">
                                                                            {app.noteInterne}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                                                        )}
                                                    </td>
                                                ))}

                                                {/* Stato — with quick edit */}
                                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                    <StatoCell
                                                        appuntamento={app}
                                                        onChangeStato={(stato) => changeStatoMutation.mutate({ id: app.id, stato })}
                                                    />
                                                </td>

                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Pagina {page} di {totalPages} • {pagination?.total ?? 0} appuntamenti
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page <= 1}
                                    className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= totalPages}
                                    className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ==================== KANBAN VIEW ==================== */}
            {view === 'kanban' && !isLoading && (
                <div className="flex gap-3 overflow-x-auto pb-4">
                    <KanbanColumn
                        label="Prenotati / Confermati"
                        statuses={['PRENOTATO', 'CONFERMATO']}
                        headerBg="bg-gradient-to-r from-blue-100 to-green-100 dark:from-blue-900/40 dark:to-green-900/40"
                        headerText="text-blue-800 dark:text-blue-200"
                        appuntamenti={kanbanGroups.prenotatiConfermati}
                        onCardClick={(id) => navigate(`/poliambulatorio/agenda/appuntamenti/${id}`)}
                        onAction={handleKanbanAction}
                        busyIds={busyIds}
                    />
                    <KanbanColumn
                        label="In Sala d'Attesa"
                        statuses={['IN_ATTESA']}
                        headerBg="bg-amber-100 dark:bg-amber-900/40"
                        headerText="text-amber-800 dark:text-amber-200"
                        appuntamenti={kanbanGroups.inAttesa}
                        onCardClick={(id) => navigate(`/poliambulatorio/agenda/appuntamenti/${id}`)}
                        onAction={handleKanbanAction}
                        busyIds={busyIds}
                    />
                    <KanbanColumn
                        label="In Corso"
                        statuses={['IN_CORSO']}
                        headerBg="bg-purple-100 dark:bg-purple-900/40"
                        headerText="text-purple-800 dark:text-purple-200"
                        appuntamenti={kanbanGroups.inCorso}
                        onCardClick={(id) => navigate(`/poliambulatorio/agenda/appuntamenti/${id}`)}
                        onAction={handleKanbanAction}
                        busyIds={busyIds}
                    />
                    <KanbanColumn
                        label="Completati / Fatturati"
                        statuses={['COMPLETATO', 'FATTURATO']}
                        headerBg="bg-gradient-to-r from-teal-100 to-indigo-100 dark:from-teal-900/40 dark:to-indigo-900/40"
                        headerText="text-teal-800 dark:text-teal-200"
                        appuntamenti={kanbanGroups.completatiFatturati}
                        onCardClick={(id) => navigate(`/poliambulatorio/agenda/appuntamenti/${id}`)}
                        onAction={handleKanbanAction}
                        busyIds={busyIds}
                    />
                </div>
            )}

            {/* Loading for kanban */}
            {view === 'kanban' && isLoading && (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 text-teal-600 dark:text-teal-400 animate-spin" />
                </div>
            )}

            {accettazioneAppuntamento && (
                <AccettazionePazienteModal
                    appuntamento={accettazioneAppuntamento}
                    isOpen={!!accettazioneAppuntamento}
                    initialTab={accettazioneInitialTab}
                    onClose={() => {
                        setAccettazioneAppuntamento(null);
                        setAccettazioneInitialTab('anagrafica');
                    }}
                    onConfirm={handleAccettazioneConfirm}
                    onSaveAppointmentOnly={async (appointmentData) => {
                        if (!accettazioneAppuntamento) return;
                        const updatePayload: Record<string, unknown> = {};
                        if (appointmentData.dataOra) updatePayload.dataOra = appointmentData.dataOra;
                        if (appointmentData.prestazioneId) updatePayload.prestazioneId = appointmentData.prestazioneId;
                        if (appointmentData.pazienteId) updatePayload.pazienteId = appointmentData.pazienteId;
                        if ('convenzioneId' in appointmentData) updatePayload.convenzioneId = appointmentData.convenzioneId || null;
                        if (appointmentData.note !== undefined) updatePayload.note = appointmentData.note;
                        if (appointmentData.noteInterne !== undefined) updatePayload.noteInterne = appointmentData.noteInterne;
                        if (appointmentData.stato) updatePayload.stato = appointmentData.stato;
                        if (Object.keys(updatePayload).length > 0) {
                            await appuntamentiApi.update(accettazioneAppuntamento.id, updatePayload as Partial<Appuntamento>);
                        }
                        showToast({ message: 'Appuntamento aggiornato con successo', type: 'success' });
                        setAccettazioneAppuntamento(null);
                        queryClient.invalidateQueries({ queryKey: ['appuntamenti'], refetchType: 'all' });
                    }}
                    isLoading={accettaMutation.isPending}
                />
            )}

            {editingAppuntamento && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setEditingAppuntamento(null)} />
                    <div className="relative w-full max-w-[98vw] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
                        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Modifica appuntamento</h2>
                                <p className="text-sm text-gray-500">{getPersonDisplayName(editingAppuntamento.paziente, 'Paziente')}</p>
                            </div>
                            <button onClick={() => setEditingAppuntamento(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="grid max-h-[72vh] grid-cols-1 gap-4 overflow-y-auto bg-gray-50/70 p-4 dark:bg-gray-900/40 xl:grid-cols-[18rem_minmax(0,1fr)]">
                            <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Data
                                <DatePickerElegante
                                    value={editForm.data}
                                    onChange={date => {
                                        const nextDate = date ? toLocalDateStr(date) : '';
                                        setEditForm(f => ({ ...f, data: nextDate }));
                                        if (date) setEditWeekStart(startOfWeek(date));
                                    }}
                                    placeholder="Seleziona data"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Ora
                                <TimePickerElegante
                                    value={editForm.ora}
                                    onChange={value => setEditForm(f => ({ ...f, ora: value }))}
                                    minuteStep={5}
                                    minTime={editSelectedSlotWindow?.oraInizio}
                                    maxTime={editSelectedSlotWindow?.oraFine}
                                    placeholder="Seleziona ora"
                                    className="mt-1"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Medico
                                <ElegantSelect
                                    className="mt-1"
                                    value={editForm.medicoId}
                                    onChange={value => setEditForm(f => ({ ...f, medicoId: value }))}
                                    placeholder="Seleziona medico"
                                    options={[
                                        { value: '', label: 'Seleziona medico' },
                                        ...(mediciData?.data || medici).map((m: any) => ({ value: m.id, label: getPersonDisplayName(m) }))
                                    ]}
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Prestazione
                                <ElegantSelect
                                    className="mt-1"
                                    value={editForm.prestazioneId}
                                    onChange={value => setEditForm(f => ({ ...f, prestazioneId: value }))}
                                    placeholder="Seleziona prestazione"
                                    options={[
                                        { value: '', label: 'Seleziona prestazione' },
                                        ...(prestazioniData?.data || []).map((p: any) => ({ value: p.id, label: p.nome }))
                                    ]}
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Ambulatorio
                                <ElegantSelect
                                    className="mt-1"
                                    value={editForm.ambulatorioId}
                                    onChange={value => setEditForm(f => ({ ...f, ambulatorioId: value }))}
                                    placeholder="Seleziona ambulatorio"
                                    options={[
                                        { value: '', label: 'Seleziona ambulatorio' },
                                        ...(ambulatoriData?.data || []).map((a: any) => ({ value: a.id, label: a.nome }))
                                    ]}
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Stato
                                <ElegantSelect
                                    className="mt-1"
                                    value={editForm.stato}
                                    onChange={value => setEditForm(f => ({ ...f, stato: value as StatoAppuntamento }))}
                                    options={ALL_STATES.map(stato => ({ value: stato, label: STATO_CONFIG[stato].label }))}
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Durata minuti
                                <input type="number" min={5} value={editForm.durataMinuti} onChange={e => setEditForm(f => ({ ...f, durataMinuti: Number(e.target.value) || 30 }))} className={elegantInputClass} />
                            </label>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Convenzione
                                <ElegantSelect
                                    className="mt-1"
                                    value={editForm.convenzioneId}
                                    onChange={value => setEditForm(f => ({ ...f, convenzioneId: value }))}
                                    placeholder="Nessuna convenzione"
                                    options={[
                                        { value: '', label: 'Nessuna convenzione' },
                                        ...(convenzioniData?.data || []).map((c: any) => ({ value: c.id, label: c.nome }))
                                    ]}
                                />
                            </label>
                            </div>
                            <div className="min-w-0 space-y-4">
                                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sposta appuntamento</p>
                                            <p className="text-xs text-gray-500">Slot del medico selezionato, con occupati e colleghi della stessa branca.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => shiftEditWeek(-7)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-teal-300 hover:text-teal-700 dark:border-gray-700 dark:bg-gray-800" title="Settimana precedente">
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>
                                            <span className="text-xs font-semibold text-gray-500">
                                                {editSlotRange.start.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                                {' - '}
                                                {editSlotRange.end.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                            <button type="button" onClick={() => shiftEditWeek(7)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-teal-300 hover:text-teal-700 dark:border-gray-700 dark:bg-gray-800" title="Settimana successiva">
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                            {(loadingEditSlots || loadingEditOccupied) && <Loader2 className="h-4 w-4 animate-spin text-teal-600" />}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowSameBranchDoctors(value => !value)}
                                        className={`mb-4 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${showSameBranchDoctors ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-teal-200 hover:text-teal-700'}`}
                                    >
                                        <Users className="h-3.5 w-3.5" />
                                        {showSameBranchDoctors ? 'Mostra solo medico selezionato' : 'Mostra medici stessa branca'}
                                    </button>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                                        {editDays.map(day => (
                                            <div key={day.key} className="min-h-[150px] min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/30">
                                                <div className="mb-2">
                                                    <p className="text-[11px] font-semibold uppercase text-gray-400">{day.date.toLocaleDateString('it-IT', { weekday: 'short' })}</p>
                                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{day.date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</p>
                                                </div>
                                                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                                                    {day.slots.length === 0 ? (
                                                        <p className="rounded-lg bg-white px-2 py-2 text-center text-[11px] text-gray-400 dark:bg-gray-800">Nessuno slot</p>
                                                    ) : (
                                                        <>
                                                            {day.slots.map(slot => {
                                                                const doctorName = getPersonDisplayName(allMedici.find(m => m.id === slot.medicoId), 'Medico');
                                                                const ambulatorio = ambulatoriData?.data?.find((a: any) => a.id === slot.ambulatorioId)?.nome;
                                                                return (
                                                                    <AvailabilitySlotTimeline
                                                                        key={slot.id}
                                                                        slot={slot}
                                                                        appointments={day.occupied}
                                                                        durationMinutes={editForm.durataMinuti || 30}
                                                                        selectedDate={editForm.data}
                                                                        selectedTime={editForm.ora}
                                                                        selectedMedicoId={editForm.medicoId}
                                                                        selectedAmbulatorioId={editForm.ambulatorioId}
                                                                        dayKey={day.key}
                                                                        label={showSameBranchDoctors ? doctorName : ambulatorio}
                                                                        meta={showSameBranchDoctors ? ambulatorio : undefined}
                                                                        doctorLabel={doctorName}
                                                                        onSelect={selectEditSlot}
                                                                    />
                                                                );
                                                            })}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Note
                                <textarea value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} rows={3} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                            </label>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Note interne
                                <textarea value={editForm.noteInterne} onChange={e => setEditForm(f => ({ ...f, noteInterne: e.target.value }))} rows={3} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
                            </label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
                            <button onClick={() => setEditingAppuntamento(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Annulla</button>
                            <button onClick={saveEditModal} disabled={updateAppointmentMutation.isPending} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                                {updateAppointmentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                Salva modifiche
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppuntamentiPage;
