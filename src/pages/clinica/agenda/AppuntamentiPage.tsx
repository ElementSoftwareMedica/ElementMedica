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
import { DateRangeCalendar, DateRange } from '../../../components/ui/DateRangeCalendar';
import { TimeRangePicker, TimeRange } from '../../../components/ui/TimeRangePicker';
import {
    appuntamentiApi,
    appuntamentoPrestazioniApi,
    ambulatoriApi,
    poliambulatoriApi,
    sediApi,
    StatoAppuntamento,
    Appuntamento
} from '../../../services/clinicaApi';
import { formatDate, formatTime, toISODateString } from '../../../utils/dateUtils';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { getDoctorTitle } from '../../../utils/codiceFiscale';
import { getPersonDisplayName } from '../../../utils/personDisplayUtils';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';

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

type OptionalCol = 'prestazione' | 'medico' | 'ambulatorio' | 'durata' | 'costo' | 'coda' | 'note' | 'noteInterne' | 'numero' | 'convenzione' | 'tipoVisitaMDL' | 'pagamentoAnticipato';
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
    { key: 'pagamentoAnticipato', label: 'Pagamento' },
    { key: 'note', label: 'Note' },
    { key: 'noteInterne', label: 'Note Interne' },
];

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
        nextStates: ['CONFERMATO', 'ANNULLATO']
    },
    CONFERMATO: {
        label: 'Confermato',
        color: 'green',
        bgColor: 'bg-green-100 dark:bg-green-900/40',
        textColor: 'text-green-700 dark:text-green-300',
        icon: CheckCircle,
        nextStates: ['IN_ATTESA', 'ANNULLATO', 'NO_SHOW']
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
        label: 'Annullato',
        color: 'red',
        bgColor: 'bg-red-100 dark:bg-red-900/40',
        textColor: 'text-red-700 dark:text-red-300',
        icon: XCircle,
        nextStates: ['PRENOTATO']
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
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!showMenu) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node))
                setShowMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showMenu]);

    const config = STATO_CONFIG[appuntamento.stato];

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    if (buttonRef.current) {
                        const rect = buttonRef.current.getBoundingClientRect();
                        setMenuPosition({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
                    }
                    setShowMenu(!showMenu);
                }}
                className="flex items-center gap-1"
            >
                <StatusBadge stato={appuntamento.stato} />
                {config.nextStates.length > 0 && (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
            </button>
            {showMenu && config.nextStates.length > 0 && createPortal(
                <div
                    ref={menuRef}
                    className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]"
                    style={{ top: menuPosition.top, left: menuPosition.left, zIndex: 9999 }}
                >
                    {config.nextStates.map(nextStato => {
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
                    {app.stato === 'IN_ATTESA' && (
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
                                Visita
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

    // View mode — persisted permanently (never resets at midnight)
    const [view, setView] = useState<ViewMode>(() => (readPrefs().view as ViewMode) || 'list');
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

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
        else if (statoFilter === 'NO_SHOW_ANNULLATO') effectiveStato = 'NO_SHOW,ANNULLATO';

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
                accettaMutation.mutate(app.id);
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
                if (app.visita?.id) {
                    navigate(`/poliambulatorio/fatture/nuova?visitaId=${app.visita.id}`);
                } else {
                    navigate(`/poliambulatorio/fatture/nuova?appuntamentoId=${app.id}`);
                }
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
                cmp = (a.prestazione?.prezzoBase ?? 0) - (b.prestazione?.prezzoBase ?? 0);
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
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <select
                            value={medicoFilter}
                            onChange={(e) => { setMedicoFilter(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 shadow-sm hover:border-teal-400 hover:shadow-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:ring-offset-1 appearance-none text-sm h-10 transition-all duration-300 dark:text-gray-100"
                        >
                            <option value="">Tutti i medici</option>
                            {medici.map((medico) => (
                                <option key={medico.id} value={medico.id}>
                                    {medico.firstName} {medico.lastName}
                                </option>
                            ))}
                        </select>
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

                    {/* Merged: No Show + Annullato */}
                    {(() => {
                        const isActive = statoFilter === 'NO_SHOW_ANNULLATO';
                        const countMerged = (statoCounts['NO_SHOW'] ?? 0) + (statoCounts['ANNULLATO'] ?? 0);
                        return (
                            <button
                                onClick={() => { setStatoFilter(isActive ? '' : 'NO_SHOW_ANNULLATO'); setPage(1); }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${isActive
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <XCircle className="w-3 h-3" />
                                No Show / Annullato
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
                            <select
                                value={poliambulatorioFilter}
                                onChange={(e) => {
                                    setPoliambulatorioFilter(e.target.value);
                                    setSedeFilter('');
                                    setAmbulatorioFilter('');
                                    setPage(1);
                                }}
                                className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none"
                            >
                                <option value="">Tutti i poliambulatori</option>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {(poliambulatoriData as any)?.data?.map((p: { id: string; nome: string }) => (
                                    <option key={p.id} value={p.id}>{p.nome}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sede */}
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <select
                                value={sedeFilter}
                                onChange={(e) => {
                                    setSedeFilter(e.target.value);
                                    setAmbulatorioFilter('');
                                    setPage(1);
                                }}
                                className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none"
                            >
                                <option value="">Tutte le sedi</option>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {(sediData as any)?.data?.map((s: { id: string; nome: string }) => (
                                    <option key={s.id} value={s.id}>{s.nome}</option>
                                ))}
                            </select>
                        </div>

                        {/* Ambulatorio */}
                        <div className="relative">
                            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <select
                                value={ambulatorioFilter}
                                onChange={(e) => {
                                    setAmbulatorioFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none"
                            >
                                <option value="">Tutti gli ambulatori</option>
                                {ambulatoriData?.data?.map((a: { id: string; nome: string }) => (
                                    <option key={a.id} value={a.id}>{a.nome}</option>
                                ))}
                            </select>
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
                                    {/* Fixed: Azioni */}
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Azioni
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
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                                {app.prestazione?.prezzoBase != null ? `€ ${Number(app.prestazione.prezzoBase).toFixed(2)}` : '—'}
                                                            </span>
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
                                                        {col === 'pagamentoAnticipato' && (
                                                            app.pagamentoAnticipato ? (
                                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                                                                    Pagato
                                                                </span>
                                                            ) : <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                                                        )}
                                                        {col === 'note' && (
                                                            app.note ? (
                                                                <div className="group/note relative flex items-start gap-1.5 max-w-[200px]">
                                                                    <FileText className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                                                    <span className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{app.note}</span>
                                                                    {app.note.length > 50 && (
                                                                        <div className="hidden group-hover/note:block absolute z-50 bottom-full left-0 mb-1 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg max-w-xs whitespace-pre-wrap pointer-events-none">
                                                                            {app.note}
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

                                                {/* Actions */}
                                                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <ActionButton
                                                        theme="teal"
                                                        actions={[
                                                            { label: 'Visualizza', icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/poliambulatorio/agenda/appuntamenti/${app.id}`) },
                                                            { label: 'Modifica', icon: <Edit className="h-4 w-4" />, onClick: () => navigate(`/poliambulatorio/agenda/appuntamenti/${app.id}/modifica`) },
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
        </div>
    );
};

export default AppuntamentiPage;
