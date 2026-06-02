/**
 * VisiteListPage — Lista e gestione visite mediche
 *
 * Features:
 * - Filtro per periodo (dataInizio / dataFine)
 * - Colonne selezionabili: Prestazione, Durata, Costo, Medico
 * - Delete con dialogo P58-compliant (deletionReason)
 * - Navigazione corretta: /visite/:id
 *
 * @module pages/clinica/clinica/VisiteListPage
 */

import React, { useState, useCallback, useMemo, useRef, useEffect, Suspense } from 'react';
import { useNavigate, useSearchParams, Outlet, useMatch } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Stethoscope, Search, Plus, Eye, Calendar,
    User, Clock, CheckCircle, AlertCircle, XCircle,
    RefreshCw, Timer, Trash2,
    SlidersHorizontal, X, ChevronLeft, ChevronRight,
    ChevronUp, ChevronDown, ChevronsUpDown, Send, Pencil, Hourglass,
    Building2, ClipboardList, Receipt, MapPin, ListFilter
} from 'lucide-react';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useAuth } from '../../../hooks/auth/useAuth';
import { useSidebar } from '../../../contexts/SidebarContext';
import { visiteApi, appuntamentoPrestazioniApi, poliambulatoriApi, sediApi, ambulatoriApi } from '../../../services/clinicaApi';
import { getDoctorTitle } from '../../../utils/codiceFiscale';
import { CRUDPrimaryButton } from '../../../components/shared/CRUDButton';
import { ActionButton } from '../../../components/ui';
import { DateRangeCalendar, DateRange } from '../../../components/ui/DateRangeCalendar';
import { TimeRangePicker, TimeRange } from '../../../components/ui/TimeRangePicker';
import { useToast } from '../../../hooks/useToast';

interface VisitaListItem {
    id: string;
    dataOra: string;
    stato: string;
    note: string | null;
    /** Durata effettiva in minuti (campo durataEffettiva sul modello Visita) */
    durataEffettiva?: number | null;
    appuntamentoId?: string | null;
    /** P73: true se visita secondaria assegnata a specialista */
    isVisitaSecundaria?: boolean;
    paziente: {
        id: string;
        firstName: string;
        lastName: string;
        taxCode: string | null;
    } | null;
    medico: {
        id: string;
        firstName: string;
        lastName: string;
        taxCode?: string | null;
        gender?: string | null;
    } | null;
    /** Prestazione collegata direttamente alla visita (NON via appuntamento) */
    prestazione: {
        id: string;
        codice: string;
        nome: string;
        tipo: string;
        prezzoBase?: number | string | null;
        durataPrevista?: number | null;
    } | null;
    /** Totale movimenti contabili ENTRATA (importoLordo sum). Null se nessun movimento. */
    totaleCosto?: number | null;
    /** ID fattura elettronica associata alla visita */
    fatturaId?: string | null;
    /** true se tipoVisitaMDL è valorizzato */
    isMDL?: boolean;
    /** companyTenantProfileId del paziente (primo profilo attivo) */
    companyTenantProfileId?: string | null;
    visiteSecondarieCount?: number;
    visiteSecondarieSummary?: Array<{
        id: string;
        stato: string;
        medicoId?: string | null;
        prestazioneNome?: string | null;
    }>;
}

interface MedicoItem {
    id: string;
    firstName: string;
    lastName: string;
    taxCode?: string | null;
    gender?: string | null;
}

// Optional columns the user can toggle
type OptionalCol = 'prestazione' | 'durata' | 'costo' | 'medico' | 'note';
const ALL_OPTIONAL_COLS: { key: OptionalCol; label: string }[] = [
    { key: 'prestazione', label: 'Prestazione' },
    { key: 'medico', label: 'Medico' },
    { key: 'durata', label: 'Durata' },
    { key: 'costo', label: 'Costo' },
    { key: 'note', label: 'Note' },
];

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

// Helper per formattazione: la conversione date è gestita inline o da DateRangeCalendar

// Stati delle visite con colori (allineati con enum StatoVisita Prisma)
const statoConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    'PROGRAMMATA': { label: 'Programmata', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    'IN_CORSO': { label: 'In Corso', color: 'bg-blue-100 text-blue-800', icon: Stethoscope },
    'SOSPESA': { label: 'In Attesa', color: 'bg-orange-100 text-orange-800', icon: Hourglass },
    'COMPLETATA': { label: 'Completata', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    'ANNULLATA': { label: 'Annullata', color: 'bg-red-100 text-red-800', icon: XCircle },
};

// ============================================================
// PERSISTENZA PREFERENZE  (localStorage + midnight-reset)
// ============================================================
const LS_KEY = 'visite-prefs';

/** Formatta Date come stringa YYYY-MM-DD locale (no timezone shift) */
function toLocalDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Crea Date da stringa YYYY-MM-DD come data locale (no timezone shift) */
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

/** Filtri resettano a mezzanotte; preferenze di vista (colonne, sort) persistono sempre. */
function readFilterPref<T>(key: string, defaultVal: T): T {
    const prefs = readPrefs();
    const todayStr = toLocalDateStr(new Date());
    if (prefs.savedDate) {
        // Se savedDate non è oggi, i filtri tornano ai default
        if (prefs.savedDate !== todayStr) return defaultVal;
    }
    return (prefs[key] as T) ?? defaultVal;
}

function getInitialDateRange(): DateRange {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = toLocalDateStr(today);
    const prefs = readPrefs();
    if (!prefs.dateRangeStart) return { start: today, end: today };
    try {
        // savedDate diverso da oggi → reset al giorno corrente
        if (prefs.savedDate && prefs.savedDate !== todayStr) return { start: today, end: today };
        const storedStart = fromLocalDateStr(prefs.dateRangeStart as string);
        const storedEnd = prefs.dateRangeEnd ? fromLocalDateStr(prefs.dateRangeEnd as string) : today;
        return { start: storedStart, end: storedEnd };
    } catch { return { start: today, end: today }; }
}

const VisiteListPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchParams] = useSearchParams();
    // Sidebar collapse state — overlay must start AFTER the sidebar to keep it visible
    const { isCollapsed: isSidebarCollapsed } = useSidebar();

    // Detect nested route — /visite/:id rendered inside this page as a full-screen overlay
    const visitaChildMatch = useMatch('/poliambulatorio/visite/:id');

    // Read companyId from URL params (for filtering visite by company)
    const companyIdFromUrl = searchParams.get('companyId');

    // Auth context — needed for medicoId filter on secondary visits badge
    const { user } = useAuth();

    // Tenant filter from global context
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    // Filters — persisted to localStorage; ALL filters reset at midnight
    const [searchTerm, setSearchTerm] = useState('');
    const [statoFilter, setStatoFilter] = useState<string>(() => readFilterPref('statoFilter', ''));
    const [medicoFilter, setMedicoFilter] = useState<string>(() => readFilterPref('medicoFilter', ''));
    const [companyFilter] = useState<string>(companyIdFromUrl || '');
    const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange);
    const [soloSecundarieDaRefertare, setSoloSecundarieDaRefertare] = useState<boolean>(
        () => readFilterPref('soloSecundarieDaRefertare', false)
    );
    const [soloVisiteSecondarie, setSoloVisiteSecondarie] = useState<boolean>(
        () => readFilterPref('soloVisiteSecondarie', false)
    );
    // Filtro fascia oraria — gestito da TimeRangePicker
    const [timeRange, setTimeRange] = useState<TimeRange>(() => ({
        start: readFilterPref<string | null>('oraInizio', null),
        end: readFilterPref<string | null>('oraFine', null),
    }));
    // Filtro fatturazione
    const [fatturazioneFilter, setFatturazioneFilter] = useState<string>(() => readFilterPref('fatturazioneFilter', ''));
    // Filtro "Da fatturare" — quickfilter che mostra visite non fatturate (tutti gli stati precedenti)
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
    const [ambulatorioFilter, setAmbulatorioFilter] = useState<string>(
        () => readFilterPref('ambulatorioFilter', '')
    );
    const [page, setPage] = useState(1);

    // Sort — persisted
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>(
        () => ((readPrefs().sortDir as 'asc' | 'desc') || 'desc')
    );
    const [sortField, setSortField] = useState<'data' | 'paziente' | 'prestazione' | 'medico' | 'durata' | 'costo' | 'stato' | 'note'>(
        () => ((readPrefs().sortField as 'data' | 'paziente' | 'prestazione' | 'medico' | 'durata' | 'costo' | 'stato' | 'note') || 'data')
    );
    const handleSort = (field: typeof sortField) => {
        if (field === sortField) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };
    const PAGE_SIZE = 20;

    // Column visibility & order — persisted
    const [visibleCols, setVisibleCols] = useState<Set<OptionalCol>>(() => {
        const stored = readPrefs().visibleCols;
        if (Array.isArray(stored) && stored.length > 0) return new Set(stored as OptionalCol[]);
        return new Set(['prestazione', 'medico', 'durata', 'costo'] as OptionalCol[]);
    });
    const [columnOrder, setColumnOrder] = useState<OptionalCol[]>(() => {
        const stored = readPrefs().columnOrder;
        if (Array.isArray(stored) && stored.length > 0) return stored as OptionalCol[];
        return ['prestazione', 'medico', 'durata', 'costo'];
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

    // Persist preferences to localStorage
    useEffect(() => {
        savePrefs({
            statoFilter,
            medicoFilter,
            soloSecundarieDaRefertare,
            soloVisiteSecondarie,
            oraInizio: timeRange.start || null,
            oraFine: timeRange.end || null,
            fatturazioneFilter,
            soloNonFatturate,
            showAdvancedFilters,
            poliambulatorioFilter,
            sedeFilter,
            ambulatorioFilter,
            visibleCols: Array.from(visibleCols),
            columnOrder,
            sortDir,
            sortField,
            dateRangeStart: dateRange.start ? toLocalDateStr(dateRange.start) : null,
            dateRangeEnd: dateRange.end ? toLocalDateStr(dateRange.end) : null,
        });
    }, [statoFilter, medicoFilter, soloSecundarieDaRefertare, soloVisiteSecondarie, timeRange, fatturazioneFilter, soloNonFatturate, showAdvancedFilters, poliambulatorioFilter, sedeFilter, ambulatorioFilter, visibleCols, columnOrder, sortDir, sortField, dateRange]);

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

    // Delete dialog
    const queryClient = useQueryClient();
    const [deleteTarget, setDeleteTarget] = useState<VisitaListItem | null>(null);
    const [deletionReason, setDeletionReason] = useState('');
    const deleteMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            visiteApi.delete(id, reason),
        onSuccess: () => {
            showToast({ message: 'Visita eliminata correttamente', type: 'success' });
            setDeleteTarget(null);
            setDeletionReason('');
            queryClient.invalidateQueries({ queryKey: ['visite'] });
        },
        onError: () => showToast({ message: 'Errore durante l\'eliminazione della visita', type: 'error' })
    });
    const openDelete = (v: VisitaListItem) => { setDeleteTarget(v); setDeletionReason(''); };
    const closeDelete = () => { setDeleteTarget(null); setDeletionReason(''); };
    const confirmDelete = () => {
        if (!deleteTarget || deletionReason.trim().length < 10) return;
        deleteMutation.mutate({ id: deleteTarget.id, reason: deletionReason.trim() });
    };

    // Medici filter: derived from loaded visite (already period-filtered)

    // Build query params for visite fetch — backend reads flat dataInizio/dataFine (NOT nested filters)
    const queryParams = useMemo(() => {
        const tp = getTenantFilterParams();
        const dataInizio = dateRange.start ? (() => { const d = dateRange.start!; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : '';
        const dataFine = dateRange.end ? (() => { const d = dateRange.end!; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : '';
        // "Da fatturare" quickfilter imposta fatturazione=non_fatturate
        const effectiveFatturazioneFilter = soloNonFatturate ? 'non_fatturate' : fatturazioneFilter;
        return {
            page,
            limit: PAGE_SIZE,
            ...(searchTerm && { search: searchTerm }),
            ...(statoFilter && { stato: statoFilter }),
            ...(dataInizio && { dataInizio }),
            ...(dataFine && { dataFine }),
            ...(medicoFilter && { medicoId: medicoFilter }),
            ...(companyFilter && { companyTenantProfileId: companyFilter }),
            ...(soloSecundarieDaRefertare && { soloSecundarieDaRefertare: 'true' }),
            ...(soloVisiteSecondarie && { isVisitaSecundaria: 'true' }),
            ...(timeRange.start && { oraInizio: timeRange.start }),
            ...(timeRange.end && { oraFine: timeRange.end }),
            ...(effectiveFatturazioneFilter && { fatturazione: effectiveFatturazioneFilter }),
            ...(ambulatorioFilter && { ambulatorioId: ambulatorioFilter }),
            ...(sedeFilter && { sedeId: sedeFilter }),
            ...(poliambulatorioFilter && { poliambulatorioId: poliambulatorioFilter }),
            ...(tp.tenantIds && { tenantIds: tp.tenantIds.join(',') }),
            ...(tp.allTenants && { allTenants: 'true' })
        };
    }, [page, PAGE_SIZE, searchTerm, statoFilter, dateRange, medicoFilter, companyFilter, soloSecundarieDaRefertare, soloVisiteSecondarie, timeRange, fatturazioneFilter, soloNonFatturate, ambulatorioFilter, sedeFilter, poliambulatorioFilter, getTenantFilterParams, tenantFilterKey]);

    // Fetch visite with React Query
    const { data: visiteData, isLoading: loading, error, refetch } = useQuery({
        queryKey: ['visite', queryParams],
        queryFn: async () => {
            const response = await visiteApi.getAll(queryParams);
            return response;
        },
        enabled: isReady
    });

    // Conteggio prestazioni da refertare (badge navigazione a PrestazioniDaRefertarePage)
    // Usa listDaRefertare per garantire coerenza tra badge e lista inline
    const { data: prestazioniDaRefertareCountData } = useQuery({
        queryKey: ['prestazioni-da-refertare-count', tenantFilterKey],
        queryFn: () => appuntamentoPrestazioniApi.listDaRefertare({ limit: 1 }),
        staleTime: 30_000,
        refetchInterval: 60_000,
        enabled: isReady,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prestazioniDaRefertareCountRaw = (prestazioniDaRefertareCountData as any)?.total ?? 0;

    // Conteggio visite filtrate per fascia oraria (client-side, dopo fetch)
    // usato per mostrare nei filtri quante visite rientrano nella fascia

    // Elenco prestazioni da refertare — caricato sempre quando ci sono prestazioni da refertare
    const { data: prestazioniListData, isLoading: isLoadingPrestazioniList } = useQuery({
        queryKey: ['prestazioni-da-refertare-list', tenantFilterKey],
        queryFn: () => appuntamentoPrestazioniApi.listDaRefertare({ limit: 50 }),
        staleTime: 30_000,
        enabled: isReady,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prestazioniDaRefertareList = (prestazioniListData as any)?.data ?? [];
    // Usa il totale dalla lista se disponibile (più recente), altrimenti dalla query count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prestazioniDaRefertareCount = (prestazioniListData as any)?.total ?? prestazioniDaRefertareCountRaw;
    // Badge "Da refertare" usa il conteggio prestazioni (AppuntamentoPrestazione con stato IN_ATTESA_REFERTO/ESEGUITA, refertoId=null)
    const daRefertareBadgeCount = prestazioniDaRefertareCount;

    // Conteggio per-stato — query leggere (limit=1) per ottenere pagination.total per ciascun stato
    // Usa stessi filtri della lista principale ma senza stato e paginazione
    const countBaseParams = useMemo(() => {
        const tp = getTenantFilterParams();
        const dataInizio = dateRange.start ? (() => { const d = dateRange.start!; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : '';
        const dataFine = dateRange.end ? (() => { const d = dateRange.end!; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : '';
        return {
            limit: 1,
            ...(searchTerm && { search: searchTerm }),
            ...(dataInizio && { dataInizio }),
            ...(dataFine && { dataFine }),
            ...(medicoFilter && { medicoId: medicoFilter }),
            ...(companyFilter && { companyTenantProfileId: companyFilter }),
            ...(timeRange.start && { oraInizio: timeRange.start }),
            ...(timeRange.end && { oraFine: timeRange.end }),
            ...(ambulatorioFilter && { ambulatorioId: ambulatorioFilter }),
            ...(sedeFilter && { sedeId: sedeFilter }),
            ...(poliambulatorioFilter && { poliambulatorioId: poliambulatorioFilter }),
            ...(tp.tenantIds && { tenantIds: tp.tenantIds.join(',') }),
            ...(tp.allTenants && { allTenants: 'true' })
        };
    }, [searchTerm, dateRange, medicoFilter, companyFilter, timeRange, ambulatorioFilter, sedeFilter, poliambulatorioFilter, getTenantFilterParams, tenantFilterKey]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statoCounts: Record<string, number> = {};

    const { data: countProgrammata } = useQuery({
        queryKey: ['visite-count', 'PROGRAMMATA', countBaseParams],
        queryFn: () => visiteApi.getAll({ ...countBaseParams, stato: 'PROGRAMMATA' }),
        enabled: isReady, staleTime: 15_000,
    });
    statoCounts['PROGRAMMATA'] = (countProgrammata as { pagination?: { total: number } })?.pagination?.total ?? 0;

    const { data: countInCorso } = useQuery({
        queryKey: ['visite-count', 'IN_CORSO', countBaseParams],
        queryFn: () => visiteApi.getAll({ ...countBaseParams, stato: 'IN_CORSO' }),
        enabled: isReady, staleTime: 15_000,
    });
    statoCounts['IN_CORSO'] = (countInCorso as { pagination?: { total: number } })?.pagination?.total ?? 0;

    const { data: countSospesa } = useQuery({
        queryKey: ['visite-count', 'SOSPESA', countBaseParams],
        queryFn: () => visiteApi.getAll({ ...countBaseParams, stato: 'SOSPESA' }),
        enabled: isReady, staleTime: 15_000,
    });
    statoCounts['SOSPESA'] = (countSospesa as { pagination?: { total: number } })?.pagination?.total ?? 0;

    const { data: countCompletata } = useQuery({
        queryKey: ['visite-count', 'COMPLETATA', countBaseParams],
        queryFn: () => visiteApi.getAll({ ...countBaseParams, stato: 'COMPLETATA' }),
        enabled: isReady, staleTime: 15_000,
    });
    statoCounts['COMPLETATA'] = (countCompletata as { pagination?: { total: number } })?.pagination?.total ?? 0;

    const { data: countAnnullata } = useQuery({
        queryKey: ['visite-count', 'ANNULLATA', countBaseParams],
        queryFn: () => visiteApi.getAll({ ...countBaseParams, stato: 'ANNULLATA' }),
        enabled: isReady, staleTime: 15_000,
    });
    statoCounts['ANNULLATA'] = (countAnnullata as { pagination?: { total: number } })?.pagination?.total ?? 0;

    // Conteggio "Da fatturare" — visite non fatturate indipendenti dallo stato
    const { data: countNonFatturate } = useQuery({
        queryKey: ['visite-count', 'non_fatturate', countBaseParams],
        queryFn: () => visiteApi.getAll({ ...countBaseParams, fatturazione: 'non_fatturate' }),
        enabled: isReady, staleTime: 15_000,
    });
    const nonFatturateCount = (countNonFatturate as { pagination?: { total: number } })?.pagination?.total ?? 0;

    // Dati per filtri avanzati — Poliambulatori, Sedi, Ambulatori
    const { data: poliambulatoriData } = useQuery({
        queryKey: ['poliambulatori-filter', tenantFilterKey],
        queryFn: () => poliambulatoriApi.getAll({ limit: 100 }),
        enabled: isReady,
        staleTime: 5 * 60_000,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const poliambulatori = (poliambulatoriData?.data ?? []) as { id: string; nome: string }[];

    const { data: sediData } = useQuery({
        queryKey: ['sedi-filter', tenantFilterKey, poliambulatorioFilter],
        queryFn: () => sediApi.getAll({
            limit: 100,
            ...(poliambulatorioFilter && { poliambulatorioId: poliambulatorioFilter })
        }),
        enabled: isReady,
        staleTime: 5 * 60_000,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sedi = (sediData?.data ?? []) as { id: string; nome: string; poliambulatorioId: string }[];

    const { data: ambulatoriData } = useQuery({
        queryKey: ['ambulatori-filter', tenantFilterKey, poliambulatorioFilter, sedeFilter],
        queryFn: () => ambulatoriApi.getAll({
            limit: 200,
            stato: 'ATTIVO',
            ...(poliambulatorioFilter && { poliambulatorioId: poliambulatorioFilter }),
            ...(sedeFilter && { sedeId: sedeFilter })
        }),
        enabled: isReady,
        staleTime: 5 * 60_000,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ambulatoriList = (ambulatoriData?.data ?? []) as { id: string; nome: string; codice: string; poliambulatorioId: string; sedeId?: string | null }[];

    // Conteggio filtri avanzati attivi (per badge sul pulsante toggle)
    const advancedFilterCount = [poliambulatorioFilter, sedeFilter, ambulatorioFilter].filter(Boolean).length;

    const visite = useMemo((): VisitaListItem[] => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (visiteData?.data || []).map((v: any) => ({
            id: v.id,
            dataOra: v.dataOra || v.createdAt || '',
            stato: v.stato || 'IN_CORSO',
            note: v.note ?? null,
            durataEffettiva: v.durataEffettiva ?? null,
            appuntamentoId: v.appuntamentoId ?? null,
            isVisitaSecundaria: v.isVisitaSecundaria ?? false,
            paziente: v.paziente ? {
                id: v.paziente.id,
                firstName: v.paziente.firstName || '',
                lastName: v.paziente.lastName || '',
                taxCode: v.paziente.taxCode || null
            } : null,
            medico: v.medico ? {
                id: v.medico.id,
                firstName: v.medico.firstName || '',
                lastName: v.medico.lastName || '',
                taxCode: v.medico.taxCode || null,
                gender: v.medico.gender || null
            } : null,
            prestazione: v.prestazione ? {
                id: v.prestazione.id,
                codice: v.prestazione.codice || '',
                nome: v.prestazione.nome || '',
                tipo: v.prestazione.tipo || '',
                prezzoBase: v.prestazione.prezzoBase ?? null,
                durataPrevista: v.prestazione.durataPrevista ?? null
            } : null,
            totaleCosto: v.totaleCosto ?? null,
            fatturaId: v.fatturaId ?? null,
            isMDL: v.isMDL ?? false,
            companyTenantProfileId: v.companyTenantProfileId ?? null,
            visiteSecondarieCount: v.visiteSecondarieCount ?? 0,
            visiteSecondarieSummary: v.visiteSecondarieSummary ?? []
        }));
        // Client-side sort by selected field
        return [...raw].sort((a, b) => {
            let cmp = 0;
            if (sortField === 'data') {
                cmp = new Date(a.dataOra).getTime() - new Date(b.dataOra).getTime();
            } else if (sortField === 'paziente') {
                const pa = `${a.paziente?.lastName ?? ''} ${a.paziente?.firstName ?? ''}`.toLowerCase();
                const pb = `${b.paziente?.lastName ?? ''} ${b.paziente?.firstName ?? ''}`.toLowerCase();
                cmp = pa.localeCompare(pb, 'it');
            } else if (sortField === 'prestazione') {
                cmp = (a.prestazione?.nome ?? '').localeCompare(b.prestazione?.nome ?? '', 'it');
            } else if (sortField === 'medico') {
                const ma = `${a.medico?.lastName ?? ''} ${a.medico?.firstName ?? ''}`.toLowerCase();
                const mb = `${b.medico?.lastName ?? ''} ${b.medico?.firstName ?? ''}`.toLowerCase();
                cmp = ma.localeCompare(mb, 'it');
            } else if (sortField === 'durata') {
                cmp = (a.durataEffettiva ?? 0) - (b.durataEffettiva ?? 0);
            } else if (sortField === 'costo') {
                cmp = (Number(a.totaleCosto) || 0) - (Number(b.totaleCosto) || 0);
            } else if (sortField === 'stato') {
                cmp = a.stato.localeCompare(b.stato, 'it');
            } else if (sortField === 'note') {
                cmp = (a.note ?? '').localeCompare(b.note ?? '', 'it');
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [visiteData, sortDir, sortField]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pagination = useMemo(() => (visiteData as any)?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 }, [visiteData]);

    // Medici list derived from loaded visite (period-aware)
    const medici = useMemo<MedicoItem[]>(() => {
        const map = new Map<string, MedicoItem>();
        visite.forEach(v => { if (v.medico) map.set(v.medico.id, v.medico); });
        return Array.from(map.values()).sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [visite]);

    const resetFilters = () => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        setSearchTerm('');
        setStatoFilter('');
        setMedicoFilter('');
        setDateRange({ start: today, end: today });
        setSoloSecundarieDaRefertare(false);
        setSoloVisiteSecondarie(false);
        setTimeRange({ start: null, end: null });
        setFatturazioneFilter('');
        setSoloNonFatturate(false);
        setPoliambulatorioFilter('');
        setSedeFilter('');
        setAmbulatorioFilter('');
        setSortDir('desc');
        setSortField('data');
        setPage(1);
    };

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    /** durataEffettiva è memorizzata in SECONDI (dal timer) — converti per la visualizzazione */
    const formatDurata = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m} min`;
    };

    // Stato badge component
    const StatoBadge: React.FC<{ stato: string }> = ({ stato }) => {
        const config = statoConfig[stato] || { label: stato, color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
        const IconComponent = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                <IconComponent className="w-3 h-3" />
                {config.label}
            </span>
        );
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Stethoscope className="w-7 h-7 text-teal-600" />
                        Visite Specialistiche
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Gestione delle visite mediche e stato referti
                    </p>
                </div>
                <CRUDPrimaryButton
                    onClick={() => navigate('/poliambulatorio/appuntamenti/nuovo')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nuova Visita
                </CRUDPrimaryButton>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
                {/* Row 1: Search | Periodo | Fascia oraria | Medici | Colonne & Filtri */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1fr_auto_auto_1fr_auto] gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cerca paziente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gradient-to-r from-white to-gray-50 shadow-sm hover:border-teal-400 hover:shadow-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:ring-offset-1 text-sm h-10 transition-all duration-300"
                        />
                    </div>
                    <DateRangeCalendar
                        value={dateRange}
                        onChange={(range) => { setDateRange(range); setPage(1); }}
                        placeholder="Periodo"
                        theme="teal"
                        size="md"
                        clearable
                        showPresets
                    />
                    <TimeRangePicker
                        value={timeRange}
                        onChange={(r) => { setTimeRange(r); setPage(1); }}
                        theme="teal"
                        size="md"
                        clearable
                    />
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <select
                            value={medicoFilter}
                            onChange={(e) => { setMedicoFilter(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gradient-to-r from-white to-gray-50 shadow-sm hover:border-teal-400 hover:shadow-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:ring-offset-1 appearance-none text-sm h-10 transition-all duration-300"
                        >
                            <option value="">Tutti i medici</option>
                            {medici.map((medico) => (
                                <option key={medico.id} value={medico.id}>
                                    {medico.firstName} {medico.lastName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Column selector */}
                        <div className="relative" ref={colMenuRef}>
                            <button
                                onClick={() => setShowColMenu(v => !v)}
                                className={`
                                    flex items-center gap-3 group
                                    h-10 text-sm px-3
                                    bg-gradient-to-r from-white to-gray-50
                                    border rounded-xl shadow-sm
                                    border-gray-200 hover:border-teal-400 hover:shadow-md
                                    focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1
                                    transition-all duration-300 ease-out
                                    ${showColMenu ? 'border-teal-300 shadow-md ring-2 ring-teal-100' : ''}
                                `}
                            >
                                <div className={`
                                    p-1.5 rounded-lg transition-colors duration-200
                                    ${showColMenu ? 'bg-teal-100' : 'bg-teal-50 group-hover:bg-teal-100'}
                                `}>
                                    <SlidersHorizontal className={`h-4 w-4 ${showColMenu ? 'text-teal-600' : 'text-teal-500'}`} />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Colonne</span>
                                    <span className="font-medium text-gray-900 text-xs">{visibleCols.size} attive</span>
                                </div>
                            </button>
                            {showColMenu && (
                                <div className="absolute top-full right-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[220px]">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">Colonne visibili & ordine</p>
                                    {columnOrder.map((key, idx) => {
                                        const def = ALL_OPTIONAL_COLS.find(c => c.key === key);
                                        if (!def) return null;
                                        return (
                                            <div key={key} className="flex items-center gap-1 px-1 py-1 rounded-lg hover:bg-gray-50">
                                                <input type="checkbox" checked={visibleCols.has(key)} onChange={() => toggleCol(key)} className="rounded accent-teal-600 flex-shrink-0" />
                                                <span className="text-sm text-gray-700 flex-1">{def.label}</span>
                                                <button
                                                    onClick={() => moveCol(key, 'up')}
                                                    disabled={idx === 0}
                                                    className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                                                >
                                                    <ChevronUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => moveCol(key, 'down')}
                                                    disabled={idx === columnOrder.length - 1}
                                                    className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                                                >
                                                    <ChevronDown className="w-3 h-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        {/* Filtri avanzati toggle */}
                        <button
                            onClick={() => setShowAdvancedFilters(v => !v)}
                            className={`
                                flex items-center gap-3 group
                                h-10 text-sm px-3
                                bg-gradient-to-r from-white to-gray-50
                                border rounded-xl shadow-sm
                                focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1
                                transition-all duration-300 ease-out
                                ${showAdvancedFilters
                                    ? 'border-teal-300 shadow-md ring-2 ring-teal-100'
                                    : 'border-gray-200 hover:border-teal-400 hover:shadow-md'
                                }
                            `}
                        >
                            <div className={`
                                p-1.5 rounded-lg transition-colors duration-200
                                ${showAdvancedFilters ? 'bg-teal-100' : 'bg-teal-50 group-hover:bg-teal-100'}
                            `}>
                                <ListFilter className={`h-4 w-4 ${showAdvancedFilters ? 'text-teal-600' : 'text-teal-500'}`} />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Filtri</span>
                                <span className="font-medium text-gray-900 text-xs">
                                    {advancedFilterCount > 0 ? `${advancedFilterCount} attiv${advancedFilterCount === 1 ? 'o' : 'i'}` : 'Avanzati'}
                                </span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Row 2: Quick action chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
                    {/* Da refertare quickfilter */}
                    <button
                        onClick={() => { setSoloSecundarieDaRefertare(v => !v); setPage(1); }}
                        title={daRefertareBadgeCount > 0
                            ? `${daRefertareBadgeCount} prestazion${daRefertareBadgeCount === 1 ? 'e' : 'i'} da refertare`
                            : 'Nessuna prestazione da refertare'
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${soloSecundarieDaRefertare
                            ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                            : 'bg-white text-violet-600 border-violet-300 hover:bg-violet-50'
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

                    <button
                        onClick={() => { setSoloVisiteSecondarie(v => !v); setPage(1); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${soloVisiteSecondarie
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                            : 'bg-white text-sky-700 border-sky-300 hover:bg-sky-50'
                            }`}
                    >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Visite Secondarie
                    </button>

                    {/* Quick stato filter chips with counters */}
                    {Object.entries(statoConfig).map(([key, config]) => {
                        const isActive = statoFilter === key;
                        const IconComp = config.icon;
                        const count = statoCounts[key] ?? 0;
                        return (
                            <button
                                key={key}
                                onClick={() => { setStatoFilter(isActive ? '' : key); setPage(1); }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${isActive
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <IconComp className="w-3 h-3" />
                                {config.label}
                                {count > 0 && (
                                    <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    {/* Da fatturare quickfilter */}
                    <button
                        onClick={() => { setSoloNonFatturate(v => !v); setPage(1); }}
                        title={nonFatturateCount > 0
                            ? `${nonFatturateCount} visit${nonFatturateCount === 1 ? 'a' : 'e'} da fatturare`
                            : 'Nessuna visita da fatturare'
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${soloNonFatturate
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                            }`}
                    >
                        <Receipt className="w-3 h-3" />
                        Da fatturare
                        {nonFatturateCount > 0 && (
                            <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${soloNonFatturate
                                ? 'bg-white text-amber-700'
                                : 'bg-amber-600 text-white'
                                }`}>
                                {nonFatturateCount}
                            </span>
                        )}
                    </button>

                    <div className="flex-1" />

                    {/* Reset */}
                    <button
                        onClick={resetFilters}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                        Azzera
                    </button>

                    {/* Refresh */}
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Aggiorna
                    </button>
                </div>
            </div>

            {/* Advanced Filters Card */}
            {showAdvancedFilters && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
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
                                className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none"
                            >
                                <option value="">Tutti i poliambulatori</option>
                                {(poliambulatoriData as any)?.data?.map((p: any) => (
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
                                className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none"
                            >
                                <option value="">Tutte le sedi</option>
                                {(sediData as any)?.data?.map((s: any) => (
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
                                className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none"
                            >
                                <option value="">Tutti gli ambulatori</option>
                                {(ambulatoriData as any)?.data?.map((a: any) => (
                                    <option key={a.id} value={a.id}>{a.nome}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-700">{'Errore nel caricamento delle visite'}</span>
                </div>
            )}

            {/* Card: Prestazioni da refertare — visibile solo con quickfilter "Da refertare" attivo */}
            {soloSecundarieDaRefertare && (prestazioniDaRefertareCount > 0 || isLoadingPrestazioniList) && (
                <div className="bg-white rounded-xl shadow-sm border border-violet-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-violet-900 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-violet-600" />
                            Prestazioni da refertare
                            {prestazioniDaRefertareCount > 0 && (
                                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700">
                                    {prestazioniDaRefertareCount}
                                </span>
                            )}
                        </h3>
                    </div>
                    {isLoadingPrestazioniList ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Caricamento...
                        </div>
                    ) : prestazioniDaRefertareList.length === 0 ? (
                        <p className="text-sm text-gray-500 py-3">Nessuna prestazione da refertare.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b border-violet-100">
                                        <th className="pb-2 pr-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Paziente</th>
                                        <th className="pb-2 pr-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Prestazione</th>
                                        <th className="pb-2 pr-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Data</th>
                                        <th className="pb-2 pr-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Stato</th>
                                        <th className="pb-2 font-medium text-gray-500 text-xs uppercase tracking-wide">Azione</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {prestazioniDaRefertareList.map((p: any) => {
                                        const visitaTargetId = p.visitaSecundaria?.id || p.appuntamento?.visita?.id;
                                        const hasVisita = Boolean(visitaTargetId);
                                        return (
                                            <tr
                                                key={p.id}
                                                className={`border-b border-gray-50 transition-colors ${hasVisita ? 'hover:bg-violet-50 cursor-pointer' : 'opacity-60 bg-gray-50'}`}
                                                onClick={() => hasVisita && navigate(`/poliambulatorio/visite/${visitaTargetId}`)}
                                                title={!hasVisita ? 'Visita non trovata — record orfano' : undefined}
                                            >
                                                <td className="py-2.5 pr-4">
                                                    {p.appuntamento?.paziente
                                                        ? `${p.appuntamento.paziente.lastName} ${p.appuntamento.paziente.firstName}`
                                                        : '—'}
                                                </td>
                                                <td className="py-2.5 pr-4 font-medium">{p.prestazione?.nome ?? '—'}</td>
                                                <td className="py-2.5 pr-4 text-gray-500">
                                                    {p.appuntamento?.dataOra
                                                        ? new Date(p.appuntamento.dataOra).toLocaleDateString('it-IT')
                                                        : '—'}
                                                </td>
                                                <td className="py-2.5 pr-4">
                                                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                                                        {p.stato?.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-2.5">
                                                    {hasVisita ? (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/poliambulatorio/visite/${visitaTargetId}`); }}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
                                                        >
                                                            <Pencil className="w-3 h-3" />
                                                            Referta
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Visita non trovata</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {([
                                    { field: 'data' as const, label: 'Data / Ora' },
                                    { field: 'paziente' as const, label: 'Paziente' },
                                ] as const).map(({ field, label }) => (
                                    <th
                                        key={field}
                                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort(field)}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            {label}
                                            {sortField === field
                                                ? (sortDir === 'asc'
                                                    ? <ChevronUp className="w-3.5 h-3.5 text-teal-600" />
                                                    : <ChevronDown className="w-3.5 h-3.5 text-teal-600" />)
                                                : <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />}
                                        </span>
                                    </th>
                                ))}
                                {columnOrder.filter(c => visibleCols.has(c)).map(col => {
                                    const field = col as typeof sortField;
                                    const colDef = ALL_OPTIONAL_COLS.find(c2 => c2.key === col);
                                    return (
                                        <th
                                            key={col}
                                            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 transition-colors"
                                            onClick={() => handleSort(field)}
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                {colDef?.label ?? col}
                                                {sortField === field
                                                    ? (sortDir === 'asc'
                                                        ? <ChevronUp className="w-3.5 h-3.5 text-teal-600" />
                                                        : <ChevronDown className="w-3.5 h-3.5 text-teal-600" />)
                                                    : <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />}
                                            </span>
                                        </th>
                                    );
                                })}
                                <th
                                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('stato')}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        Stato
                                        {sortField === 'stato'
                                            ? (sortDir === 'asc'
                                                ? <ChevronUp className="w-3.5 h-3.5 text-teal-600" />
                                                : <ChevronDown className="w-3.5 h-3.5 text-teal-600" />)
                                            : <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />}
                                    </span>
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                // Loading skeleton
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: 4 + visibleCols.size }).map((__, j) => (
                                            <td key={j} className="px-4 py-4">
                                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : visite.length === 0 ? (
                                <tr>
                                    <td colSpan={4 + visibleCols.size} className="px-4 py-12 text-center">
                                        <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-medium">Nessuna visita trovata</p>
                                        <p className="text-gray-400 text-sm mt-1">
                                            Le visite appariranno qui quando saranno create
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                visite.map((visita) => (
                                    <tr
                                        key={visita.id}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/poliambulatorio/visite/${visita.id}`)}
                                    >
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-900">
                                                    {formatDate(visita.dataOra)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {visita.paziente ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                                                        <User className="w-4 h-4 text-teal-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                                                            <span>{visita.paziente.firstName} {visita.paziente.lastName}</span>
                                                            {/* P73: badge per visite secondarie */}
                                                            {visita.isVisitaSecundaria && (
                                                                <span className="text-[10px] font-semibold bg-violet-100 text-violet-700 rounded px-1.5 py-0.5 leading-none">
                                                                    Specialista
                                                                </span>
                                                            )}
                                                            {!visita.isVisitaSecundaria && (visita.visiteSecondarieCount ?? 0) > 0 && (
                                                                <span
                                                                    className="inline-flex items-center gap-1 text-[10px] font-semibold bg-sky-100 text-sky-700 rounded px-1.5 py-0.5 leading-none"
                                                                    title={`${visita.visiteSecondarieCount} prestazion${visita.visiteSecondarieCount === 1 ? 'e' : 'i'} secondari${visita.visiteSecondarieCount === 1 ? 'a' : 'e'} collegate`}
                                                                >
                                                                    <ClipboardList className="w-3 h-3" />
                                                                    +{visita.visiteSecondarieCount}
                                                                </span>
                                                            )}
                                                        </p>
                                                        {visita.paziente.taxCode && (
                                                            <p className="text-xs text-gray-500">
                                                                CF: {visita.paziente.taxCode}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic">N/D</span>
                                            )}
                                        </td>
                                        {columnOrder.filter(c => visibleCols.has(c)).map(col => (
                                            <td key={col} className="px-4 py-4">
                                                {col === 'prestazione' && (
                                                    visita.prestazione ? (
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{visita.prestazione.nome}</p>
                                                            <p className="text-xs text-gray-400">{visita.prestazione.codice}</p>
                                                        </div>
                                                    ) : <span className="text-gray-400 italic text-sm">N/D</span>
                                                )}
                                                {col === 'medico' && (
                                                    visita.medico ? (
                                                        <div className="flex items-center gap-2">
                                                            <Stethoscope className="w-4 h-4 text-gray-400" />
                                                            <span className="text-sm text-gray-700">
                                                                {getDoctorTitle(visita.medico.taxCode ?? null, (visita.medico.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null) ?? null)} {visita.medico.lastName}
                                                            </span>
                                                        </div>
                                                    ) : <span className="text-gray-400 italic text-sm">N/D</span>
                                                )}
                                                {col === 'durata' && (
                                                    visita.durataEffettiva ? (
                                                        <div className="flex items-center gap-1 text-sm text-gray-600">
                                                            <Timer className="w-4 h-4 text-gray-400" />
                                                            <span>{formatDurata(visita.durataEffettiva)}</span>
                                                        </div>
                                                    ) : <span className="text-gray-400 text-sm">—</span>
                                                )}
                                                {col === 'costo' && (
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {visita.totaleCosto != null
                                                            ? `€ ${Number(visita.totaleCosto).toFixed(2)}`
                                                            : <span className="text-gray-400 text-sm">—</span>}
                                                    </span>
                                                )}
                                                {col === 'note' && (
                                                    visita.note ? (
                                                        <span className="text-sm text-gray-600 truncate max-w-[180px] block" title={visita.note}>
                                                            {visita.note}
                                                        </span>
                                                    ) : <span className="text-gray-400 text-sm">—</span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="px-4 py-4">
                                            <StatoBadge stato={visita.stato} />
                                        </td>
                                        <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <ActionButton
                                                theme="teal"
                                                actions={[
                                                    {
                                                        label: 'Visualizza',
                                                        icon: <Eye className="w-4 h-4" />,
                                                        onClick: () => navigate(`/poliambulatorio/visite/${visita.id}`)
                                                    },
                                                    {
                                                        label: 'Modifica',
                                                        icon: <Pencil className="w-4 h-4" />,
                                                        onClick: () => navigate(`/poliambulatorio/visite/${visita.id}`)
                                                    },
                                                    ...(visita.appuntamentoId ? [{
                                                        label: 'Referta prestazione aggiuntiva',
                                                        icon: <ClipboardList className="w-4 h-4" />,
                                                        onClick: () => navigate(`/poliambulatorio/appuntamenti/${visita.appuntamentoId}`)
                                                    }] : []),
                                                    ...(visita.appuntamentoId ? [{
                                                        label: 'Vai all\'appuntamento',
                                                        icon: <Calendar className="w-4 h-4" />,
                                                        onClick: () => navigate(`/poliambulatorio/appuntamenti/${visita.appuntamentoId}`)
                                                    }] : []),
                                                    ...(visita.stato === 'COMPLETATA' ? [{
                                                        label: 'Invia referto via email',
                                                        icon: <Send className="w-4 h-4" />,
                                                        onClick: () => navigate(`/poliambulatorio/visite/${visita.id}`)
                                                    }] : []),
                                                    // Anagrafica paziente
                                                    ...(visita.paziente ? [{
                                                        label: 'Anagrafica paziente',
                                                        icon: <User className="w-4 h-4" />,
                                                        onClick: () => navigate(`/poliambulatorio/pazienti/${visita.paziente!.id}`)
                                                    }] : []),
                                                    // Anagrafica medico
                                                    ...(visita.medico ? [{
                                                        label: 'Anagrafica medico',
                                                        icon: <Stethoscope className="w-4 h-4" />,
                                                        onClick: () => navigate(`/poliambulatorio/personale/medici/${visita.medico!.id}`)
                                                    }] : []),
                                                    // Anagrafica azienda (se dipendente)
                                                    ...(visita.companyTenantProfileId ? [{
                                                        label: 'Anagrafica azienda',
                                                        icon: <Building2 className="w-4 h-4" />,
                                                        onClick: () => navigate(`/companies/${visita.companyTenantProfileId}`)
                                                    }] : []),
                                                    {
                                                        label: 'Elimina',
                                                        icon: <Trash2 className="w-4 h-4" />,
                                                        onClick: () => openDelete(visita),
                                                        variant: 'danger' as const
                                                    }
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Pagina {pagination.page} di {pagination.totalPages} • {pagination.total} visite
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => p - 1)}
                                disabled={page <= 1}
                                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= pagination.totalPages}
                                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={closeDelete}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-red-100 rounded-xl flex-shrink-0">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Elimina visita</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {deleteTarget.paziente
                                        ? `${deleteTarget.paziente.lastName} ${deleteTarget.paziente.firstName}`
                                        : 'Visita'}
                                </p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Motivo dell&apos;eliminazione <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={deletionReason}
                                onChange={(e) => setDeletionReason(e.target.value)}
                                rows={3}
                                placeholder="Indica il motivo dell'eliminazione (minimo 10 caratteri)..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none resize-none"
                            />
                            <p className={`text-xs mt-1 ${deletionReason.trim().length < 10 ? 'text-red-500' : 'text-green-600'}`}>
                                {deletionReason.trim().length < 10
                                    ? `Ancora ${10 - deletionReason.trim().length} caratteri richiesti`
                                    : '\u2713 Motivo valido'}
                            </p>
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700">
                                Attenzione: verranno eliminati a cascata anche i referti, i movimenti contabili e le scadenze del piano di sorveglianza sanitaria collegate a questa visita. L&apos;operazione è irreversibile ed è registrata nel log GDPR.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={closeDelete}
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deletionReason.trim().length < 10 || deleteMutation.isPending}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                {deleteMutation.isPending
                                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                                    : <Trash2 className="w-4 h-4" />}
                                Elimina definitivamente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlay full-screen — consolida /visite/:id direttamente in /visite */}
            {visitaChildMatch && (
                <div className={`fixed inset-y-0 right-0 z-50 bg-white dark:bg-gray-950 overflow-auto transition-all duration-300 ${isSidebarCollapsed ? 'left-20' : 'left-64'}`}>
                    <Suspense fallback={
                        <div className="flex items-center justify-center h-full min-h-screen">
                            <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
                        </div>
                    }>
                        <Outlet />
                    </Suspense>
                </div>
            )}

        </div>
    );
};

export default VisiteListPage;
