/**
 * ScadenzeMDLPage - Dashboard Scadenze Medicina del Lavoro
 * 
 * Dashboard per visualizzare e gestire tutte le scadenze MDL:
 * - Nomine MC/RSPP in scadenza
 * - Giudizi idoneità in scadenza
 * - Visite periodiche da programmare
 * - Sopralluoghi in scadenza
 * - DVR da aggiornare
 * 
 * @module pages/clinica/mdl/ScadenzeMDLPage
 * @project P56 - Medicina del Lavoro Sistema Completo - FASE 7
 * @compliance D.Lgs 81/08
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertTriangle,
    Clock,
    Calendar,
    Building2,
    UserCheck,
    Stethoscope,
    FileText,
    ShieldCheck,
    Filter,
    Download,
    RefreshCw,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    Search,
    Eye,
    CalendarDays,
    BarChart3,
    Bell,
    X,
    ClipboardList,
    Pencil,
    Check
} from 'lucide-react';
import {
    clinicaApi,
    type ScadenzaMDL,
    type ScadenzeMDLStatistiche,
    type CategoriaScadenzaMDL,
    type LivelloUrgenzaScadenza
} from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useViewMode } from '../../../hooks/useViewMode';
import { ViewModeToggle } from '../../../components/clinica/ViewModeToggle';
import { ActionButton } from '../../../components/ui';
import ScheduleWeekModal, { type PersoneItem } from '../../../components/companies/ScheduleWeekModal';
import { DateRangeCalendar, type DateRange } from '../../../components/ui/DateRangeCalendar';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { getCompanies } from '../../../services/companies';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// =====================================================
// CONFIGURAZIONE
// =====================================================

const SCADENZE_MDL_COUNTER_RANGE_KEY = 'scadenze-mdl-counter-range';

const CATEGORIA_CONFIG: Record<CategoriaScadenzaMDL, {
    label: string;
    icon: React.ReactNode;
    color: string;
    route: string;
}> = {
    nomina_mc: {
        label: 'Nomine MC',
        icon: <UserCheck className="h-4 w-4" />,
        color: 'teal',
        route: '/poliambulatorio/mdl/nomine-ruolo'
    },
    nomina_rspp: {
        label: 'Nomine RSPP',
        icon: <ShieldCheck className="h-4 w-4" />,
        color: 'blue',
        route: '/poliambulatorio/mdl/nomine-ruolo'
    },
    giudizio_idoneita: {
        label: 'Giudizi Idoneità',
        icon: <FileText className="h-4 w-4" />,
        color: 'purple',
        route: '/poliambulatorio/mdl/giudizi-idoneita'
    },
    visita_periodica: {
        label: 'Visite Periodiche',
        icon: <Stethoscope className="h-4 w-4" />,
        color: 'green',
        route: '/poliambulatorio/visite'
    },
    sopralluogo: {
        label: 'Sopralluoghi',
        icon: <Building2 className="h-4 w-4" />,
        color: 'amber',
        route: '/poliambulatorio/sedi'
    },
    dvr: {
        label: 'DVR',
        icon: <ShieldCheck className="h-4 w-4" />,
        color: 'red',
        route: '/poliambulatorio/sedi'
    }
};

const URGENZA_CONFIG: Record<LivelloUrgenzaScadenza, {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon: React.ReactNode;
}> = {
    scaduto: {
        label: 'Scaduto',
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-300',
        icon: <AlertCircle className="h-4 w-4 text-red-500" />
    },
    critico: {
        label: 'Critico (<7gg)',
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        border: 'border-orange-300',
        icon: <AlertTriangle className="h-4 w-4 text-orange-500" />
    },
    urgente: {
        label: 'Urgente (7-30gg)',
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        icon: <Clock className="h-4 w-4 text-yellow-500" />
    },
    attenzione: {
        label: 'Attenzione (30-60gg)',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-300',
        icon: <Bell className="h-4 w-4 text-blue-500" />
    },
    programmato: {
        label: 'Programmato (>60gg)',
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-300',
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
};

// =====================================================
// MODAL AGGIORNAMENTO DATA SCADENZA
// =====================================================

interface EditScadenzaDateModalProps {
    scadenza: ScadenzaMDL;
    onClose: () => void;
    onSaved: () => void;
}

const EditScadenzaDateModal: React.FC<EditScadenzaDateModalProps> = ({ scadenza, onClose, onSaved }) => {
    const { showToast } = useToast();
    const prestazioni = scadenza.entita?.prestazioni ?? [];
    const isGroup = scadenza.entita?.isRaggruppata === true && prestazioni.length > 1;

    const [bulkDate, setBulkDate] = useState('');
    const [isSavingBulk, setIsSavingBulk] = useState(false);

    const [rowDates, setRowDates] = useState<Record<string, string>>(() => {
        if (isGroup) {
            return Object.fromEntries(
                prestazioni.map(p => [
                    p.scadenzaPrestazioneId,
                    p.dataScadenza ? new Date(p.dataScadenza).toISOString().split('T')[0] : ''
                ])
            );
        }
        const singleId = scadenza.entita?.scadenzaPrestazioneId ?? '';
        const singleDate = scadenza.dataScadenza ? new Date(scadenza.dataScadenza).toISOString().split('T')[0] : '';
        return singleId ? { [singleId]: singleDate } : {};
    });
    const [savingRowId, setSavingRowId] = useState<string | null>(null);

    const handleSaveRow = async (scadenzaPrestazioneId: string) => {
        const date = rowDates[scadenzaPrestazioneId];
        if (!date) return;
        setSavingRowId(scadenzaPrestazioneId);
        try {
            await clinicaApi.scadenzeMDL.patchDataScadenza(scadenzaPrestazioneId, date);
            showToast({ type: 'success', message: 'Data aggiornata' });
            onSaved();
            if (!isGroup) onClose();
        } catch {
            showToast({ type: 'error', message: 'Errore durante l\'aggiornamento della data' });
        } finally {
            setSavingRowId(null);
        }
    };

    const handleSaveBulk = async () => {
        if (!bulkDate) return;
        setIsSavingBulk(true);
        try {
            if (isGroup) {
                const ids = prestazioni.map(p => p.scadenzaPrestazioneId).filter(Boolean);
                await clinicaApi.scadenzeMDL.reconciliaDate(ids, bulkDate);
            } else {
                const singleId = scadenza.entita?.scadenzaPrestazioneId;
                if (singleId) await clinicaApi.scadenzeMDL.patchDataScadenza(singleId, bulkDate);
            }
            showToast({ type: 'success', message: isGroup ? 'Tutte le date aggiornate' : 'Data aggiornata' });
            onSaved();
            onClose();
        } catch {
            showToast({ type: 'error', message: 'Errore durante l\'aggiornamento delle date' });
        } finally {
            setIsSavingBulk(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            Aggiorna data scadenza
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {scadenza.entita?.persona ?? ''}
                            {scadenza.entita?.mansione ? ` · ${scadenza.entita.mansione}` : ''}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-6 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
                    {/* Bulk update section */}
                    <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-medium text-teal-800 dark:text-teal-200">
                            {isGroup ? 'Aggiorna tutte le prestazioni alla stessa data' : 'Nuova data scadenza'}
                        </p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <DatePickerElegante
                                    value={bulkDate || null}
                                    onChange={(d) => setBulkDate(d ? d.toISOString().split('T')[0] : '')}
                                    theme="teal"
                                    size="sm"
                                    compact
                                    placeholder="Seleziona data"
                                />
                            </div>
                            <button
                                onClick={() => void handleSaveBulk()}
                                disabled={!bulkDate || isSavingBulk}
                                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                            >
                                {isSavingBulk
                                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    : <Check className="h-3.5 w-3.5" />}
                                {isGroup ? 'Aggiorna tutte' : 'Salva'}
                            </button>
                        </div>
                    </div>

                    {/* Per-prestazione rows — solo per gruppi */}
                    {isGroup && prestazioni.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Oppure aggiorna singolarmente
                            </p>
                            {prestazioni.map((p) => (
                                <div
                                    key={p.scadenzaPrestazioneId}
                                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                            {p.prestazione ?? p.prestazioneId}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            ogni {p.periodicitaMesi} {p.periodicitaMesi === 1 ? 'mese' : 'mesi'}
                                        </p>
                                    </div>
                                    <div className="w-36">
                                        <DatePickerElegante
                                            value={rowDates[p.scadenzaPrestazioneId] || null}
                                            onChange={(d) => setRowDates(prev => ({
                                                ...prev,
                                                [p.scadenzaPrestazioneId]: d ? d.toISOString().split('T')[0] : ''
                                            }))}
                                            theme="teal"
                                            size="sm"
                                            compact
                                            placeholder="Data"
                                        />
                                    </div>
                                    <button
                                        onClick={() => void handleSaveRow(p.scadenzaPrestazioneId)}
                                        disabled={savingRowId === p.scadenzaPrestazioneId || !rowDates[p.scadenzaPrestazioneId]}
                                        className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 disabled:opacity-40 transition-colors"
                                        title="Salva questa prestazione"
                                    >
                                        {savingRowId === p.scadenzaPrestazioneId
                                            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                            : <Check className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};

// =====================================================
// COMPONENTE PRINCIPALE
// =====================================================

const ScadenzeMDLPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchParams] = useSearchParams();

    // Read filters from URL params
    const companyIdFromUrl = searchParams.get('companyId');
    const tabFromUrl = searchParams.get('tab');

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State - initialize from URL params
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategoria, setFilterCategoria] = useState<CategoriaScadenzaMDL | ''>(
        tabFromUrl === 'sopralluoghi' ? 'sopralluogo' : ''
    );
    const [filterUrgenza, setFilterUrgenza] = useState<LivelloUrgenzaScadenza | ''>('');
    const [filterCompanyId, setFilterCompanyId] = useState<string>(companyIdFromUrl || '');
    const [giorniVisualizzazione, setGiorniVisualizzazione] = useState<number>(90);
    // P72_23: date range calendar (sostituisce il select giorni)
    const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
    const [mostraPrenotate, setMostraPrenotate] = useState<boolean>(false);

    useEffect(() => {
        if (dateRange.start && dateRange.end) {
            localStorage.setItem(SCADENZE_MDL_COUNTER_RANGE_KEY, JSON.stringify({
                start: dateRange.start.toISOString().split('T')[0],
                end: dateRange.end.toISOString().split('T')[0],
            }));
        } else {
            localStorage.removeItem(SCADENZE_MDL_COUNTER_RANGE_KEY);
        }
        window.dispatchEvent(new Event('elementmedica:scadenze-mdl-counter-range'));
    }, [dateRange.end, dateRange.start]);
    // P72_23: quicklook modal
    const [quicklookScadenza, setQuicklookScadenza] = useState<ScadenzaMDL | null>(null);

    // Modifica data scadenza — modal (sostituisce la vecchia edit inline)
    const [editDateModalScadenza, setEditDateModalScadenza] = useState<ScadenzaMDL | null>(null);

    // View mode with localStorage persistence
    const { viewMode, setViewMode } = useViewMode({ storageKey: 'scadenze-mdl-view' });

    // Selezione lavoratori per programmazione visita
    const [selectedScadenzeIds, setSelectedScadenzeIds] = useState<Set<string>>(new Set());
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

    // Workaround: deseleziona scadenze che non sono più nel filtro corrente
    useEffect(() => {
        setSelectedScadenzeIds(new Set());
    }, [filterCompanyId, filterCategoria, filterUrgenza, searchTerm]);

    // Query params
    const queryParams = useMemo(() => {
        const tenantParams = getTenantFilterParams();
        // P72_23: se è selezionato un date range, usa giorni calcolato dalla data fine
        let giorni = giorniVisualizzazione;
        if (dateRange.end) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffMs = dateRange.end.getTime() - today.getTime();
            const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            giorni = diffDays;
        }
        return {
            categoria: filterCategoria || undefined,
            livelloUrgenza: filterUrgenza || undefined,
            companyTenantProfileId: filterCompanyId || undefined,
            giorni,
            limit: 200,
            includePrenotate: mostraPrenotate || undefined,
            ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
            ...(tenantParams.allTenants && { allTenants: 'true' })
        };
    }, [filterCategoria, filterUrgenza, filterCompanyId, giorniVisualizzazione, dateRange, mostraPrenotate, getTenantFilterParams, tenantFilterKey]);

    // Fetch scadenze
    const { data: scadenzeResponse, isLoading, error, refetch } = useQuery({
        queryKey: ['scadenze-mdl', queryParams, tenantFilterKey, mostraPrenotate],
        queryFn: () => clinicaApi.scadenzeMDL.getAll(queryParams),
        enabled: isReady,
        refetchInterval: 60000 // Refresh ogni minuto
    });

    // Fetch notifiche urgenti (per badge)
    const { data: notificheResponse } = useQuery({
        queryKey: ['scadenze-mdl-notifiche', tenantFilterKey],
        queryFn: () => clinicaApi.scadenzeMDL.getNotifiche(30),
        enabled: isReady,
        refetchInterval: 60000
    });

    // Extract data
    const scadenze = scadenzeResponse?.scadenze || [];
    const statistiche = scadenzeResponse?.statistiche;
    const notifiche = notificheResponse?.conteggio;

    // P72_23: Fetch companies for filter dropdown
    const { data: companiesList } = useQuery({
        queryKey: ['companies-list', tenantFilterKey],
        queryFn: () => getCompanies(),
        enabled: isReady,
        staleTime: 5 * 60 * 1000,
        select: (data: any) => (Array.isArray(data) ? data : data?.data ?? []) as Array<{ id: string; ragioneSociale: string }>
    });

    // Filter by search + date range
    const filteredScadenze = useMemo(() => {
        let result = scadenze;
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            result = result.filter(s =>
                s.descrizione.toLowerCase().includes(search) ||
                s.tipo.toLowerCase().includes(search) ||
                s.entita?.azienda?.toLowerCase().includes(search) ||
                s.entita?.persona?.toLowerCase().includes(search)
            );
        }
        // P72_23: se c'è una data inizio nel range, filtra lato client
        if (dateRange.start) {
            const startTs = dateRange.start.getTime();
            result = result.filter(s => s.dataScadenza && new Date(s.dataScadenza).getTime() >= startTs);
        }
        return result;
    }, [scadenze, searchTerm, dateRange.start]);

    // Group by urgenza for summary
    const scadenzePerUrgenza = useMemo(() => {
        const grouped: Record<LivelloUrgenzaScadenza, ScadenzaMDL[]> = {
            scaduto: [],
            critico: [],
            urgente: [],
            attenzione: [],
            programmato: []
        };
        filteredScadenze.forEach(s => {
            if (grouped[s.livelloUrgenza]) {
                grouped[s.livelloUrgenza].push(s);
            }
        });
        return grouped;
    }, [filteredScadenze]);

    // Handle export
    const handleExport = useCallback(async (formato: 'csv' | 'json') => {
        try {
            const data = await clinicaApi.scadenzeMDL.exportData({
                formato,
                giorni: giorniVisualizzazione,
                companyTenantProfileId: filterCompanyId || undefined
            });

            if (formato === 'csv') {
                // Download as CSV - data should be the CSV string in this case
                const blob = new Blob([data as unknown as string], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `scadenze-mdl-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
            } else {
                // Download as JSON
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `scadenze-mdl-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
            }

            showToast({ type: 'success', message: `Export ${formato.toUpperCase()} completato` });
        } catch (error) {
            showToast({ type: 'error', message: 'Errore durante l\'export' });
        }
    }, [giorniVisualizzazione, filterCompanyId, showToast]);

    // Navigate to entity detail
    const handleNavigate = useCallback((scadenza: ScadenzaMDL) => {
        const config = CATEGORIA_CONFIG[scadenza.categoria];
        if (config?.route) {
            navigate(config.route);
        }
    }, [navigate]);

    // Apre il modal aggiornamento data scadenza
    const openEditDateModal = useCallback((scadenza: ScadenzaMDL, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditDateModalScadenza(scadenza);
    }, []);

    // Selezione checkbox scadenza (solo visita_periodica con company)
    const handleToggleSelect = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedScadenzeIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    // Seleziona/deseleziona tutti i visita_periodica visibili
    const handleToggleAll = useCallback(() => {
        const periodicaIds = filteredScadenze
            .filter(s => s.categoria === 'visita_periodica' && s.entita?.personaId)
            .map(s => s.id);
        if (periodicaIds.every(id => selectedScadenzeIds.has(id))) {
            setSelectedScadenzeIds(new Set());
        } else {
            setSelectedScadenzeIds(new Set(periodicaIds));
        }
    }, [filteredScadenze, selectedScadenzeIds]);

    // Deriva persone per ScheduleWeekModal dalle scadenze selezionate
    const selectedPersone = useMemo((): PersoneItem[] => {
        if (selectedScadenzeIds.size === 0) return [];
        const selected = filteredScadenze.filter(s => selectedScadenzeIds.has(s.id));
        const byPerson = new Map<string, ScadenzaMDL[]>();
        for (const s of selected) {
            if (!s.entita?.personaId) continue;
            if (!byPerson.has(s.entita.personaId)) byPerson.set(s.entita.personaId, []);
            byPerson.get(s.entita.personaId)!.push(s);
        }
        return Array.from(byPerson.entries()).map(([personId, scadenze]) => {
            const first = scadenze[0];
            const parts = (first.entita.persona || '').trim().split(' ');
            const lastName = parts[0] || '';
            const firstName = parts.slice(1).join(' ') || '';
            const accertamenti: PersoneItem['accertamenti'] = [];
            for (const s of scadenze) {
                if (s.entita.isRaggruppata && s.entita.prestazioni) {
                    for (const p of s.entita.prestazioni) {
                        if (!accertamenti.find(a => a.id === p.prestazioneId)) {
                            accertamenti.push({
                                id: p.prestazioneId,
                                nome: p.prestazione || 'Prestazione',
                                isObbligatoria: p.isObbligatoria !== false,
                                // MDL scadenze provide only numeric months, no periodicita enum string.
                                // periodicitaCustomMesi is used by periodicitaToMesi as fallback when
                                // periodicita is null/undefined, so accertamenti are correctly included.
                                periodicitaCustomMesi: p.periodicitaMesi ?? null,
                                // Confermate come dovute dal backend — garantisce passaggio del filtro
                                ultimaEsecuzione: null,
                            });
                        }
                    }
                } else if (s.entita.prestazioneId) {
                    if (!accertamenti.find(a => a.id === s.entita.prestazioneId)) {
                        accertamenti.push({
                            id: s.entita.prestazioneId!,
                            nome: s.entita.prestazione || 'Prestazione',
                            isObbligatoria: s.entita.isObbligatoria !== false,
                            periodicitaCustomMesi: s.entita.periodicitaMesi ?? null,
                            // Confermate come dovute dal backend — garantisce passaggio del filtro
                            ultimaEsecuzione: null,
                        });
                    }
                }
            }
            return {
                personId,
                firstName,
                lastName,
                mansione: (first.entita.mansioneIds?.[0] || first.entita.mansioneId)
                    ? { id: (first.entita.mansioneIds?.[0] || first.entita.mansioneId)!, nome: first.entita.mansione || '' }
                    : undefined,
                accertamenti: accertamenti.length > 0 ? accertamenti : undefined,
                prossimaVisita: first.dataScadenza,
                isPrimaVisita: scadenze.every(s => s.entita.isPrimaVisita === true),
                protocollo: first.entita.periodicitaMesi
                    ? { periodicitaMesi: first.entita.periodicitaMesi }
                    : null,
            };
        });
    }, [selectedScadenzeIds, filteredScadenze]);

    // CompanyId per ScheduleWeekModal (priorità: filtro attivo > primo selezionato)
    const scheduleCompanyId = useMemo(() => {
        if (filterCompanyId) return filterCompanyId;
        const first = filteredScadenze.find(s => selectedScadenzeIds.has(s.id));
        return first?.entita?.companyTenantProfileId || '';
    }, [filterCompanyId, filteredScadenze, selectedScadenzeIds]);

    // Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // =====================================================
    // RENDER COMPONENTS
    // =====================================================

    // Stats Cards
    const renderStatsCards = () => (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {/* Scaduti */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium text-red-700">Scaduti</span>
                </div>
                <p className="text-2xl font-bold text-red-700">
                    {statistiche?.perUrgenza?.critico || 0}
                </p>
            </div>

            {/* Critici */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <span className="text-sm font-medium text-orange-700">&lt;7 giorni</span>
                </div>
                <p className="text-2xl font-bold text-orange-700">
                    {statistiche?.perUrgenza?.urgente || 0}
                </p>
            </div>

            {/* Urgenti */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700">7-30 giorni</span>
                </div>
                <p className="text-2xl font-bold text-yellow-700">
                    {statistiche?.perUrgenza?.attenzione || 0}
                </p>
            </div>

            {/* Attenzione */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Bell className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">30-60 giorni</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                    {statistiche?.perUrgenza?.programmato || 0}
                </p>
            </div>

            {/* Programmati */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-green-700">&gt;60 giorni</span>
                </div>
                <p className="text-2xl font-bold text-green-700">
                    {(statistiche?.perUrgenza?.critico || 0) +
                        (statistiche?.perUrgenza?.urgente || 0) +
                        (statistiche?.perUrgenza?.attenzione || 0) +
                        (statistiche?.perUrgenza?.programmato || 0)}
                </p>
            </div>

            {/* Totale */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Totale</span>
                </div>
                <p className="text-2xl font-bold text-gray-700">
                    {scadenzeResponse?.filtri?.totale || scadenze.length || 0}
                </p>
            </div>
        </div>
    );

    // Category breakdown
    const renderCategoryBreakdown = () => (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {(Object.keys(CATEGORIA_CONFIG) as CategoriaScadenzaMDL[]).map(cat => {
                const config = CATEGORIA_CONFIG[cat];
                const count = statistiche?.perCategoria?.[cat] || 0;
                return (
                    <button
                        key={cat}
                        onClick={() => setFilterCategoria(filterCategoria === cat ? '' : cat)}
                        className={`
                            p-3 rounded-lg border transition-all text-left
                            ${filterCategoria === cat
                                ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200'
                                : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                            }
                        `}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-${config.color}-600`}>{config.icon}</span>
                            <span className="text-xs font-medium text-gray-700 truncate">
                                {config.label}
                            </span>
                        </div>
                        <p className="text-xl font-bold text-gray-900">{count}</p>
                    </button>
                );
            })}
        </div>
    );

    // Filters bar
    const renderFilters = () => {
        const periodicaVisibles = filteredScadenze.filter(
            s => s.categoria === 'visita_periodica' && !!s.entita?.personaId
        );
        const allSelected = periodicaVisibles.length > 0 &&
            periodicaVisibles.every(s => selectedScadenzeIds.has(s.id));

        const activeFiltersCount = [filterCategoria, filterUrgenza, filterCompanyId, dateRange.start, mostraPrenotate || undefined]
            .filter(Boolean).length;

        return (
            <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Top row: search + actions */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-teal-50/60 to-white">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cerca per descrizione, azienda, persona…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white
                                       focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-colors"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Active filter badge */}
                    {activeFiltersCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-600 text-white text-xs rounded-full font-medium">
                            <Filter className="h-3 w-3" />
                            {activeFiltersCount} attivi
                        </span>
                    )}

                    {/* Seleziona tutti (visita_periodica) */}
                    {periodicaVisibles.length > 0 && (
                        <button
                            onClick={handleToggleAll}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap ${allSelected
                                ? 'bg-teal-100 text-teal-700 border-teal-400'
                                : 'border-gray-200 text-gray-600 hover:bg-teal-50 hover:border-teal-300'
                                }`}
                            title={allSelected ? 'Deseleziona tutti' : `Seleziona tutti ${periodicaVisibles.length} lavoratori`}
                        >
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => { }}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600 pointer-events-none"
                            />
                            <span>Seleziona tutti ({periodicaVisibles.length})</span>
                        </button>
                    )}

                    <div className="flex items-center gap-1.5 ml-auto">
                        {/* Export */}
                        <button
                            onClick={() => handleExport('csv')}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 
                                       rounded-lg hover:bg-gray-50 hover:border-gray-300 text-gray-600 transition-colors"
                            title="Esporta in CSV"
                        >
                            <Download className="h-3.5 w-3.5" />
                            CSV
                        </button>
                        <button
                            onClick={() => handleExport('json')}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 
                                       rounded-lg hover:bg-gray-50 hover:border-gray-300 text-gray-600 transition-colors"
                            title="Esporta in JSON"
                        >
                            <Download className="h-3.5 w-3.5" />
                            JSON
                        </button>
                        <button
                            onClick={() => refetch()}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 text-gray-500 transition-colors"
                            title="Aggiorna dati"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Bottom row: filter controls */}
                <div className="flex flex-wrap items-end gap-3 px-4 py-3">
                    {/* Urgenza filter */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <Bell className="h-3 w-3" />
                            Urgenza
                        </label>
                        <select
                            value={filterUrgenza}
                            onChange={(e) => setFilterUrgenza(e.target.value as LivelloUrgenzaScadenza | '')}
                            className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white
                                       focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-colors
                                       hover:border-gray-300 min-w-[140px]"
                        >
                            <option value="">Tutte le urgenze</option>
                            {(Object.keys(URGENZA_CONFIG) as LivelloUrgenzaScadenza[]).map(u => (
                                <option key={u} value={u}>{URGENZA_CONFIG[u].label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Company filter */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Azienda
                        </label>
                        <select
                            value={filterCompanyId}
                            onChange={(e) => setFilterCompanyId(e.target.value)}
                            className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white
                                       focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-colors
                                       hover:border-gray-300 max-w-[220px] min-w-[160px]"
                        >
                            <option value="">Tutte le aziende</option>
                            {(companiesList ?? []).map((c: { id: string; ragioneSociale: string }) => (
                                <option key={c.id} value={c.id}>{c.ragioneSociale}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date range */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            Periodo scadenze
                        </label>
                        <div className="min-w-[260px]">
                            <DateRangeCalendar
                                value={dateRange}
                                onChange={(range) => {
                                    setDateRange(range);
                                    if (!range.start && !range.end) setGiorniVisualizzazione(90);
                                }}
                                placeholder="Seleziona periodo…"
                                theme="teal"
                                size="md"
                                showPresets
                                clearable
                            />
                        </div>
                    </div>

                    {/* Mostra prenotate toggle */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide invisible select-none">
                            &nbsp;
                        </label>
                        <button
                            onClick={() => setMostraPrenotate(prev => !prev)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-all font-medium ${mostraPrenotate
                                ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                : 'border-gray-200 text-gray-500 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700'
                                }`}
                            title="Visualizza anche le scadenze per cui è già stata prenotata una visita ma non ancora effettuata"
                        >
                            <CalendarDays className="h-4 w-4" />
                            Già prenotate
                        </button>
                    </div>

                    {/* Reset filters (se ci sono filtri attivi) */}
                    {activeFiltersCount > 0 && (
                        <div className="flex flex-col gap-1 ml-auto">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide invisible select-none">
                                &nbsp;
                            </label>
                            <button
                                onClick={() => {
                                    setFilterCategoria('');
                                    setFilterUrgenza('');
                                    setFilterCompanyId('');
                                    setDateRange({ start: null, end: null });
                                    setGiorniVisualizzazione(90);
                                    setMostraPrenotate(false);
                                    setSearchTerm('');
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-red-200
                                           text-red-500 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                                Reset filtri
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Scadenza row
    const renderScadenzaRow = (scadenza: ScadenzaMDL) => {
        const catConfig = CATEGORIA_CONFIG[scadenza.categoria];
        const urgConfig = URGENZA_CONFIG[scadenza.livelloUrgenza];
        const isSelectable = scadenza.categoria === 'visita_periodica' && !!scadenza.entita?.personaId;
        const isSelected = selectedScadenzeIds.has(scadenza.id);

        return (
            <div
                key={scadenza.id}
                className={`
                    p-4 rounded-lg border cursor-pointer transition-all
                    hover:shadow-md overflow-hidden
                    ${isSelected ? 'ring-2 ring-teal-500 ring-offset-1' : ''}
                    ${urgConfig.bg} ${urgConfig.border}
                `}
                onClick={() => isSelectable ? handleToggleSelect(scadenza.id, { stopPropagation: () => { } } as React.MouseEvent) : handleNavigate(scadenza)}
            >
                <div className="flex items-start gap-3">
                    {/* Checkbox (solo per visita_periodica) */}
                    {isSelectable && (
                        <div
                            className="flex-shrink-0 mt-1"
                            onClick={(e) => handleToggleSelect(scadenza.id, e)}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => { }}
                                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                        </div>
                    )}

                    <div className="flex-1 flex items-stretch justify-between gap-3 min-w-0 overflow-hidden">
                        {/* Left: Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-${catConfig.color}-600`}>{catConfig.icon}</span>
                                <span className="text-xs font-medium text-gray-500 uppercase">
                                    {catConfig.label}
                                </span>
                                {urgConfig.icon}
                                {scadenza.isPrenotata && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 border border-teal-300">
                                        <CalendarDays className="h-3 w-3" />
                                        Visita prenotata
                                    </span>
                                )}
                            </div>
                            <h4 className="font-medium text-gray-900 truncate">{scadenza.tipo}</h4>
                            <p className="text-sm text-gray-600 truncate">{scadenza.descrizione}</p>
                            {/* Ricongiunzione: elenco accertamenti raggruppati */}
                            {scadenza.entita?.isRaggruppata && scadenza.entita.prestazioni && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {scadenza.entita.prestazioni.map((p, i) => (
                                        <span
                                            key={p.scadenzaPrestazioneId || i}
                                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${p.isObbligatoria !== false
                                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                                : 'bg-gray-50 text-gray-500 border-gray-200'
                                                }`}
                                            title={p.isObbligatoria !== false ? 'Obbligatoria' : 'Facoltativa'}
                                        >
                                            {p.prestazione || 'N/A'}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {scadenza.entita?.azienda && (
                                <p className="text-xs text-gray-500 mt-1">
                                    <Building2 className="h-3 w-3 inline mr-1" />
                                    {scadenza.entita.azienda}
                                    {scadenza.entita.sede && ` - ${scadenza.entita.sede}`}
                                </p>
                            )}
                        </div>

                        {/* Right: Date info at top, ActionButton at bottom */}
                        <div className="flex flex-col items-end justify-between gap-2 flex-shrink-0">
                            {/* Top: countdown + date */}
                            <div className="flex flex-col items-end gap-1">
                                <div className={`text-sm font-bold ${urgConfig.text} text-right whitespace-nowrap`}>
                                    {scadenza.giorniAllaScadenza !== null && scadenza.giorniAllaScadenza < 0
                                        ? `Scaduto da ${Math.abs(scadenza.giorniAllaScadenza)} gg`
                                        : scadenza.giorniAllaScadenza === 0
                                            ? 'Scade oggi'
                                            : `Tra ${scadenza.giorniAllaScadenza} gg`
                                    }
                                </div>
                                <span className="text-xs text-gray-500 text-right whitespace-nowrap">
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    {formatDate(scadenza.dataScadenza)}
                                </span>
                            </div>

                            {/* Bottom: ActionButton con azioni */}
                            <ActionButton
                                theme="teal"
                                actions={[
                                    {
                                        label: 'Dettagli accertamenti',
                                        icon: <Eye className="h-4 w-4" />,
                                        onClick: () => setQuicklookScadenza(scadenza),
                                    },
                                    ...(scadenza.categoria === 'visita_periodica' && scadenza.entita?.scadenzaPrestazioneId ? [{
                                        label: 'Modifica data scadenza',
                                        icon: <Pencil className="h-4 w-4" />,
                                        onClick: (e?: React.MouseEvent) => openEditDateModal(scadenza, (e ?? new MouseEvent('click')) as unknown as React.MouseEvent<HTMLElement>),
                                    }] : []),
                                    ...(!isSelectable ? [{
                                        label: 'Vai al dettaglio',
                                        icon: <ChevronRight className="h-4 w-4" />,
                                        onClick: () => handleNavigate(scadenza),
                                    }] : []),
                                ]}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Scadenze list
    const renderScadenzeList = () => {
        if (filteredScadenze.length === 0) {
            return (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nessuna scadenza trovata
                    </h3>
                    <p className="text-gray-500">
                        {searchTerm || filterCategoria || filterUrgenza || filterCompanyId
                            ? 'Prova a modificare i filtri di ricerca'
                            : dateRange.start || dateRange.end
                                ? 'Non ci sono scadenze nel periodo selezionato'
                                : 'Non ci sono scadenze nei prossimi ' + giorniVisualizzazione + ' giorni'
                        }
                    </p>
                </div>
            );
        }

        // Grid view
        if (viewMode === 'grid') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredScadenze.map(renderScadenzaRow)}
                </div>
            );
        }

        // List view (grouped by urgenza)
        return (
            <div className="space-y-6">
                {(Object.keys(URGENZA_CONFIG) as LivelloUrgenzaScadenza[]).map(urgenza => {
                    const items = scadenzePerUrgenza[urgenza];
                    if (items.length === 0) return null;

                    const config = URGENZA_CONFIG[urgenza];
                    return (
                        <div key={urgenza}>
                            <h3 className={`text-sm font-semibold ${config.text} mb-3 flex items-center gap-2`}>
                                {config.icon}
                                {config.label} ({items.length})
                            </h3>
                            <div className="space-y-2">
                                {items.map(renderScadenzaRow)}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // =====================================================
    // MAIN RENDER
    // =====================================================

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-red-800 mb-2">Errore</h3>
                    <p className="text-red-600">Si è verificato un errore nel caricamento delle scadenze. Riprova in seguito.</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                        Riprova
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-lg">
                            <CalendarDays className="h-6 w-6 text-teal-600" />
                        </div>
                        Dashboard Scadenze MDL
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Gestione scadenze Medicina del Lavoro - D.Lgs 81/08
                    </p>
                </div>

                {/* View toggle */}
                <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>

            {/* Barra selezione + Programma visite (appare quando ci sono visite periodiche da programmare) */}
            {selectedScadenzeIds.size > 0 && (
                <div className="sticky bottom-4 z-20 mb-4 p-3 bg-teal-50 border border-teal-300 rounded-xl flex items-center justify-between gap-4 shadow-lg">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={filteredScadenze
                                .filter(s => s.categoria === 'visita_periodica' && s.entita?.personaId)
                                .every(s => selectedScadenzeIds.has(s.id))}
                            onChange={handleToggleAll}
                            className="h-4 w-4 rounded border-teal-400 text-teal-600"
                        />
                        <span className="text-sm font-medium text-teal-800">
                            {selectedScadenzeIds.size} scadenz{selectedScadenzeIds.size === 1 ? 'a' : 'e'} selezionat{selectedScadenzeIds.size === 1 ? 'a' : 'e'}
                        </span>
                        <span className="text-xs text-teal-600">
                            ({selectedPersone.length} lavorator{selectedPersone.length === 1 ? 'e' : 'i'})
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSelectedScadenzeIds(new Set())}
                            className="px-3 py-1.5 text-sm text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-100"
                        >
                            Annulla selezione
                        </button>
                        <button
                            onClick={() => {
                                if (!scheduleCompanyId) {
                                    showToast({ type: 'warning', message: 'Filtra per azienda prima di programmare' });
                                    return;
                                }
                                setScheduleModalOpen(true);
                            }}
                            className="px-4 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 font-medium"
                        >
                            <CalendarDays className="h-4 w-4" />
                            Programma visite mediche ({selectedPersone.length})
                        </button>
                    </div>
                </div>
            )}

            {/* Alert banner for critical */}
            {notifiche && (notifiche.scadute > 0 || notifiche.critiche > 0) && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-4">
                    <AlertTriangle className="h-8 w-8 text-red-500 flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-red-800">Attenzione: scadenze urgenti!</h3>
                        <p className="text-red-600 text-sm">
                            {notifiche.scadute > 0 && `${notifiche.scadute} scadenze superate`}
                            {notifiche.scadute > 0 && notifiche.critiche > 0 && ' e '}
                            {notifiche.critiche > 0 && `${notifiche.critiche} scadenze critiche entro 7 giorni`}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setFilterUrgenza('');
                            setGiorniVisualizzazione(30);
                            setFilterCategoria('');
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                        <Eye className="h-4 w-4" />
                        Visualizza urgenti
                    </button>
                </div>
            )}

            {/* Stats cards */}
            {renderStatsCards()}

            {/* Category breakdown */}
            {renderCategoryBreakdown()}

            {/* Filters */}
            {renderFilters()}

            {/* Loading */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    <span className="ml-3 text-gray-500">Caricamento scadenze...</span>
                </div>
            ) : (
                /* Scadenze list */
                renderScadenzeList()
            )}

            {/* ScheduleWeekModal per lo scheduling visite MDL da scadenze */}
            {scheduleModalOpen && scheduleCompanyId && selectedPersone.length > 0 && (
                <ScheduleWeekModal
                    companyId={scheduleCompanyId}
                    persone={selectedPersone}
                    onClose={() => setScheduleModalOpen(false)}
                    onSuccess={() => {
                        setScheduleModalOpen(false);
                        setSelectedScadenzeIds(new Set());
                        refetch();
                        showToast({ type: 'success', message: 'Visite mediche programmate con successo' });
                    }}
                />
            )}

            {/* P72_23: Quicklook modal */}
            {quicklookScadenza && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => setQuicklookScadenza(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className={`flex items-start justify-between p-5 border-b ${URGENZA_CONFIG[quicklookScadenza.livelloUrgenza].bg} rounded-t-2xl`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-${CATEGORIA_CONFIG[quicklookScadenza.categoria]?.color || 'gray'}-600`}>
                                        {CATEGORIA_CONFIG[quicklookScadenza.categoria]?.icon}
                                    </span>
                                    <span className="text-xs font-medium text-gray-500 uppercase">
                                        {CATEGORIA_CONFIG[quicklookScadenza.categoria]?.label}
                                    </span>
                                    {URGENZA_CONFIG[quicklookScadenza.livelloUrgenza].icon}
                                </div>
                                <h3 className="font-semibold text-gray-900 text-base leading-tight">{quicklookScadenza.tipo}</h3>
                                {quicklookScadenza.descrizione && (
                                    <p className="text-sm text-gray-600 mt-0.5 truncate">{quicklookScadenza.descrizione}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setQuicklookScadenza(null)}
                                className="ml-3 p-1.5 rounded-full hover:bg-black/10 text-gray-500 transition-colors flex-shrink-0"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            {/* Date & urgenza */}
                            <div className="flex items-center gap-4">
                                <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Scadenza</p>
                                    <p className={`text-sm font-semibold ${URGENZA_CONFIG[quicklookScadenza.livelloUrgenza].text}`}>
                                        {formatDate(quicklookScadenza.dataScadenza)}
                                    </p>
                                </div>
                                <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Giorni rimanenti</p>
                                    <p className={`text-sm font-semibold ${URGENZA_CONFIG[quicklookScadenza.livelloUrgenza].text}`}>
                                        {quicklookScadenza.giorniAllaScadenza !== null && quicklookScadenza.giorniAllaScadenza < 0
                                            ? `Scaduto da ${Math.abs(quicklookScadenza.giorniAllaScadenza)} gg`
                                            : quicklookScadenza.giorniAllaScadenza === 0
                                                ? 'Scade oggi'
                                                : `${quicklookScadenza.giorniAllaScadenza} gg`
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Azienda / persona */}
                            {(quicklookScadenza.entita?.azienda || quicklookScadenza.entita?.persona) && (
                                <div className="space-y-1">
                                    {quicklookScadenza.entita?.azienda && (
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                            <span className="font-medium">{quicklookScadenza.entita.azienda}</span>
                                            {quicklookScadenza.entita.sede && (
                                                <span className="text-gray-400 text-xs">— {quicklookScadenza.entita.sede}</span>
                                            )}
                                        </div>
                                    )}
                                    {quicklookScadenza.entita?.persona && (
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <UserCheck className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                            <span>{quicklookScadenza.entita.persona}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Accertamenti previsti */}
                            {quicklookScadenza.entita?.prestazioni && quicklookScadenza.entita.prestazioni.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <ClipboardList className="h-4 w-4 text-teal-600" />
                                        <h4 className="text-sm font-semibold text-gray-800">
                                            Accertamenti previsti ({quicklookScadenza.entita.prestazioni.length})
                                        </h4>
                                    </div>
                                    <div className="space-y-1.5">
                                        {quicklookScadenza.entita.prestazioni.map((p, i) => (
                                            <div
                                                key={p.scadenzaPrestazioneId || i}
                                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm ${p.isObbligatoria !== false
                                                    ? 'bg-teal-50 border-teal-200 text-teal-800'
                                                    : 'bg-gray-50 border-gray-200 text-gray-600'
                                                    }`}
                                            >
                                                <Stethoscope className={`h-3.5 w-3.5 flex-shrink-0 ${p.isObbligatoria !== false ? 'text-teal-500' : 'text-gray-400'}`} />
                                                <span className="flex-1">{p.prestazione || 'N/A'}</span>
                                                {p.isObbligatoria !== false && (
                                                    <span className="text-[9px] font-semibold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded-full">OBBLIG.</span>
                                                )}
                                                {p.periodicitaMesi && (
                                                    <span className="text-[9px] text-gray-400">{p.periodicitaMesi}m</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pulsante naviga */}
                            <div className="pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => { handleNavigate(quicklookScadenza); setQuicklookScadenza(null); }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-colors"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                    Vai ai dettagli
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal aggiornamento data scadenza */}
            {editDateModalScadenza && (
                <EditScadenzaDateModal
                    scadenza={editDateModalScadenza}
                    onClose={() => setEditDateModalScadenza(null)}
                    onSaved={() => { void refetch(); }}
                />
            )}
        </div>
    );
};

export default ScadenzeMDLPage;
