import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Award,
    Banknote,
    BookOpen,
    Building2,
    Calendar,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Clock,
    CreditCard,
    Edit,
    Euro,
    FileCheck,
    FileText,
    GraduationCap,
    Mail,
    MapPin,
    Phone,
    RefreshCw,
    TrendingDown,
    User,
    UserCheck,
    Download,
    Eye,
    AlertCircle,
    ArrowDownLeft,
    ArrowUpRight,
    KeyRound
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import lettereIncaricoService from '../../services/lettereIncaricoService';
import registriPresenzeService from '../../services/registriPresenzeService';
import { useToast } from '../../hooks/useToast';
import { PersonData, Company } from '../../types';
import { getRiskLevelLabel, getCourseTypeLabel } from '../../utils/courseLabels';
import { PersonTenantProfilesWidget } from '../../components/person/PersonTenantProfilesWidget';
import { PersonCredentialsModal } from '../../components/persons/PersonCredentialsModal';
import { DateRangeCalendar, DateRange } from '../../components/ui/DateRangeCalendar';

// ============================================
// TAB CONFIGURATION
// ============================================

type TrainerTab = 'profilo' | 'compensi';

const TRAINER_TABS: { id: TrainerTab; label: string; icon: React.ElementType }[] = [
    { id: 'profilo', label: 'Profilo', icon: User },
    { id: 'compensi', label: 'Compensi', icon: Banknote },
];

// ============================================
// COMPENSI CONFIG
// ============================================

const TIPO_COMPENSO_FORMATORE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    COMPENSO_FORMATORE: { label: 'Compenso Corso', icon: GraduationCap, color: 'text-blue-600' },
    CONSULENZA: { label: 'Consulenza', icon: FileText, color: 'text-indigo-600' },
    NOMINA_RSPP: { label: 'Nomina RSPP', icon: UserCheck, color: 'text-violet-600' },
    NOMINA_MC: { label: 'Nomina MC', icon: UserCheck, color: 'text-purple-600' },
    DVR_NUOVO: { label: 'Nuovo DVR', icon: FileText, color: 'text-orange-600' },
    DVR_AGGIORNAMENTO_CON_MODIFICHE: { label: 'Agg. DVR (con mod.)', icon: RefreshCw, color: 'text-amber-600' },
    DVR_AGGIORNAMENTO_SENZA_MODIFICHE: { label: 'Agg. DVR (senza mod.)', icon: RefreshCw, color: 'text-amber-500' },
    SOPRALLUOGO_MC: { label: 'Sopralluogo MC', icon: Building2, color: 'text-teal-600' },
    SOPRALLUOGO_RSPP: { label: 'Sopralluogo RSPP', icon: Building2, color: 'text-indigo-600' },
};

const STATO_COMPENSO_FORMATORE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    BOZZA: { label: 'Bozza', bg: 'bg-gray-100', text: 'text-gray-600' },
    DA_FATTURARE: { label: 'Da Fatturare', bg: 'bg-amber-50 border border-amber-200', text: 'text-amber-700' },
    CONFERMATO: { label: 'Confermato', bg: 'bg-amber-50 border border-amber-200', text: 'text-amber-700' },
    FATTURATO: { label: 'Fatturato', bg: 'bg-blue-50 border border-blue-200', text: 'text-blue-700' },
    PAGATO: { label: 'Pagato', bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-700' },
    ANNULLATO: { label: 'Annullato', bg: 'bg-red-50 border border-red-200', text: 'text-red-600' },
    STORNATO: { label: 'Stornato', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const formatEuroFormatore = (n: number) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

const formatDateFormatore = (s: string | null | undefined) => {
    if (!s) return '-';
    return new Date(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Filtro tipo per Compensi tab
const FILTER_TIPO_OPTIONS = [
    { value: 'all', label: 'Tutti i tipi' },
    { value: 'COMPENSO_FORMATORE', label: 'Compensi Corsi' },
    { value: 'CONSULENZA', label: 'Consulenze' },
    { value: 'NOMINA_RSPP', label: 'Nomine RSPP' },
    { value: 'NOMINA_MC', label: 'Nomine MC' },
    { value: 'DVR_NUOVO', label: 'DVR Nuovo' },
    { value: 'DVR_AGGIORNAMENTO_CON_MODIFICHE', label: 'DVR Agg. con mod.' },
    { value: 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE', label: 'DVR Agg. senza mod.' },
    { value: 'SOPRALLUOGO_MC', label: 'Sopralluoghi MC' },
    { value: 'SOPRALLUOGO_RSPP', label: 'Sopralluoghi RSPP' },
];

// ============================================
// TAB COMPENSI FORMATORE
// ============================================

const TabCompensiFormatore: React.FC<{ trainerId: string }> = ({ trainerId }) => {
    const [expandedId, setExpandedId] = React.useState<string | null>(null);
    const [dateRange, setDateRange] = React.useState<DateRange>({ start: null, end: null });
    const [filterTipo, setFilterTipo] = React.useState<string>('all');

    const { data, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['compensi-formatore', trainerId, dateRange.start?.toISOString(), dateRange.end?.toISOString()],
        queryFn: async () => {
            const params: Record<string, string> = {
                direzione: 'USCITA',
                personId: trainerId,
                pageSize: '200',
                sortBy: 'dataEsecuzione',
                sortOrder: 'desc',
            };
            if (dateRange.start) params['dataEsecuzioneDa'] = dateRange.start.toISOString().slice(0, 10);
            if (dateRange.end) params['dataEsecuzioneA'] = dateRange.end.toISOString().slice(0, 10);
            const resp = await apiGet<{ success: boolean; data: any[]; total: number }>(
                '/api/v1/movimenti-contabili', params
            );
            return resp;
        },
        enabled: !!trainerId,
        staleTime: 60_000,
    });

    const allCompensi = data?.data ?? [];

    // Filtro per tipo
    const compensi = filterTipo === 'all'
        ? allCompensi
        : allCompensi.filter(c => c.tipo === filterTipo);

    const totale = compensi.reduce((s, c) => s + (Number(c.importoNetto) || 0), 0);
    const totalePagato = compensi
        .filter(c => c.stato === 'PAGATO')
        .reduce((s, c) => s + (Number(c.importoNetto) || 0), 0);
    const totaleDaFatturare = compensi
        .filter(c => c.stato === 'DA_FATTURARE' || c.stato === 'CONFERMATO')
        .reduce((s, c) => s + (Number(c.importoNetto) || 0), 0);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                <span className="ml-2 text-gray-500 text-sm">Caricamento compensi...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200 text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">Errore nel caricamento dei compensi.</span>
                <button
                    onClick={() => refetch()}
                    className="ml-auto text-sm text-red-600 hover:text-red-800 underline"
                >
                    Riprova
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Filtri */}
            <div className="flex flex-col sm:flex-row gap-3">
                <DateRangeCalendar
                    value={dateRange}
                    onChange={setDateRange}
                    placeholder="Filtra per periodo..."
                    clearable
                    theme="teal"
                    className="w-full sm:max-w-xs"
                />
                <select
                    value={filterTipo}
                    onChange={e => setFilterTipo(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    {FILTER_TIPO_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Header con totali */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Compensi e Pagamenti</h3>
                    <span className="text-xs text-gray-500">
                        ({compensi.length} movimenti{dateRange.start || dateRange.end || filterTipo !== 'all' ? ' filtrati' : ''})
                    </span>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Aggiorna"
                >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-medium text-blue-600 uppercase mb-1">Totale Maturato</p>
                    <p className="text-xl font-bold text-blue-800">{formatEuroFormatore(totale)}</p>
                    <p className="text-xs text-blue-500 mt-0.5">{compensi.length} voci</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-xs font-medium text-emerald-600 uppercase mb-1">Pagato</p>
                    <p className="text-xl font-bold text-emerald-800">{formatEuroFormatore(totalePagato)}</p>
                    <p className="text-xs text-emerald-500 mt-0.5">{compensi.filter(c => c.stato === 'PAGATO').length} pagamenti</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-medium text-amber-600 uppercase mb-1">Da Fatturare</p>
                    <p className="text-xl font-bold text-amber-800">{formatEuroFormatore(totaleDaFatturare)}</p>
                    <p className="text-xs text-amber-500 mt-0.5">
                        {compensi.filter(c => c.stato === 'DA_FATTURARE' || c.stato === 'CONFERMATO').length} in attesa
                    </p>
                </div>
            </div>

            {/* Lista compensi */}
            {compensi.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                    <Banknote className="h-8 w-8 text-gray-300" />
                    <p className="text-sm font-medium text-gray-400">Nessun compenso registrato</p>
                    <p className="text-xs text-gray-400 text-center max-w-xs">
                        I compensi vengono generati automaticamente quando viene creata una lettera di incarico o registrata un'attività.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {compensi.map(c => {
                        const cfg = TIPO_COMPENSO_FORMATORE_CONFIG[c.tipo] || { label: c.tipo, icon: FileText, color: 'text-gray-600' };
                        const statoCfg = STATO_COMPENSO_FORMATORE_CONFIG[c.stato] || STATO_COMPENSO_FORMATORE_CONFIG['BOZZA'];
                        const Icon = cfg.icon;
                        const isExpanded = expandedId === c.id;
                        return (
                            <div
                                key={c.id}
                                className="rounded-lg border border-gray-100 bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden shadow-sm"
                            >
                                <button
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                                >
                                    <Icon className={`h-4 w-4 flex-shrink-0 ${cfg.color}`} />
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {c.companyTenantProfile?.company?.ragioneSociale
                                                || (c as any).controparteCollegata?.companyTenantProfile?.company?.ragioneSociale
                                                || c.descrizione || cfg.label}
                                        </span>
                                        {(c.companyTenantProfile?.company?.ragioneSociale || (c as any).controparteCollegata?.companyTenantProfile?.company?.ragioneSociale) && c.descrizione && (
                                            <span className="block text-xs text-gray-400 truncate">{c.descrizione}</span>
                                        )}
                                        <span className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                                            <Calendar className="h-3 w-3" />
                                            {formatDateFormatore(c.dataEsecuzione)}
                                            {c.courseScheduleId && (
                                                <>
                                                    <span>·</span>
                                                    <GraduationCap className="h-3 w-3 text-blue-400" />
                                                    <Link
                                                        to={`/schedules/${c.courseScheduleId}`}
                                                        onClick={e => e.stopPropagation()}
                                                        className="text-blue-600 hover:underline truncate max-w-[140px]"
                                                    >
                                                        Vai al corso
                                                    </Link>
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statoCfg.bg} ${statoCfg.text}`}>
                                        {statoCfg.label}
                                    </span>
                                    <span className="flex-shrink-0 text-sm font-bold text-gray-900 dark:text-gray-100 ml-2">
                                        {formatEuroFormatore(Number(c.importoNetto))}
                                    </span>
                                    {isExpanded
                                        ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                        : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    }
                                </button>
                                {isExpanded && (
                                    <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 bg-gray-50/60 dark:bg-gray-700/40 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase font-medium">Tipo</span>
                                            <p className="text-gray-800 dark:text-gray-200 font-medium">{cfg.label}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase font-medium">Importo Netto</span>
                                            <p className="text-gray-800 dark:text-gray-200 font-medium">{formatEuroFormatore(Number(c.importoNetto))}</p>
                                        </div>
                                        {c.importoLordo && Number(c.importoLordo) !== Number(c.importoNetto) && (
                                            <div>
                                                <span className="text-xs text-gray-500 uppercase font-medium">Importo Lordo</span>
                                                <p className="text-gray-800 dark:text-gray-200">{formatEuroFormatore(Number(c.importoLordo))}</p>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase font-medium">Stato</span>
                                            <p className={`font-medium ${statoCfg.text}`}>{statoCfg.label}</p>
                                        </div>
                                        {c.note && (
                                            <div className="col-span-2">
                                                <span className="text-xs text-gray-500 uppercase font-medium">Note</span>
                                                <p className="text-gray-700 dark:text-gray-300">{c.note}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/**
 * Pagina di dettaglio formatore elegante - stile EmployeeDetails
 */
export default function TrainerDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [trainer, setTrainer] = useState<PersonData | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);

    const activeTab = (searchParams.get('tab') as TrainerTab) || 'profilo';
    const setActiveTab = (tab: TrainerTab) => {
        setSearchParams(prev => { prev.set('tab', tab); return prev; });
    };

    // Stati per dati reali
    const [completedCourses, setCompletedCourses] = useState<any[]>([]);
    const [upcomingCourses, setUpcomingCourses] = useState<any[]>([]);
    const [compensiCorsi, setCompensiCorsi] = useState<any[]>([]);
    const [movimentiPassivi, setMovimentiPassivi] = useState<any[]>([]);
    const [documenti, setDocumenti] = useState<{ lettereIncarico: any[], registriPresenze: any[] }>({
        lettereIncarico: [],
        registriPresenze: []
    });

    useEffect(() => {
        if (!id || id === 'new') {
            setLoading(false);
            return;
        }

        async function fetchData() {
            setLoading(true);
            try {
                const data = await apiGet(`/api/v1/persons/${id}`) as PersonData;
                setTrainer(data);

                if (data.companyId) {
                    const comp = await apiGet(`/api/v1/companies/${data.companyId}`) as Company;
                    setCompany(comp);
                }

                // Fetch corsi programmati per questo trainer
                try {
                    const schedulesResponse = await apiGet(`/api/v1/schedules?trainerId=${id}`) as any;
                    const schedules = Array.isArray(schedulesResponse)
                        ? schedulesResponse
                        : schedulesResponse?.data || schedulesResponse?.schedules || [];

                    // Corsi completati: status = COMPLETATO
                    const completed = schedules.filter((s: any) => s.status === 'COMPLETATO');
                    // Corsi programmati: status = PREVENTIVO, ACCETTATO
                    const upcoming = schedules.filter((s: any) =>
                        ['PREVENTIVO', 'ACCETTATO'].includes(s.status)
                    );

                    setCompletedCourses(completed);
                    setUpcomingCourses(upcoming);
                } catch (err) {
                }

                // Fetch documenti (lettere incarico e registri presenze) per questo trainer
                try {
                    const [lettereResponse, registriResponse] = await Promise.all([
                        apiGet(`/api/v1/lettere-incarico?trainerId=${id}`) as Promise<any>,
                        apiGet(`/api/v1/registri-presenze?formatoreId=${id}`) as Promise<any>
                    ]);

                    const lettere = Array.isArray(lettereResponse) ? lettereResponse : [];
                    const registri = Array.isArray(registriResponse) ? registriResponse : [];

                    setDocumenti({
                        lettereIncarico: lettere.map((l: any) => ({
                            ...l,
                            schedule: l.scheduledCourse
                        })),
                        registriPresenze: registri.map((r: any) => ({
                            ...r,
                            schedule: r.scheduledCourse
                        }))
                    });
                } catch (err) {
                }

                // Fetch movimenti contabili USCITA — split into compensi corsi vs spettanze servizi
                try {
                    const movResponse = await apiGet(`/api/v1/movimenti-contabili`, {
                        personId: id,
                        direzione: 'USCITA',
                        pageSize: '50'
                    }).catch(() => null) as any;

                    // Parse movimenti
                    const allItems = movResponse?.data || movResponse?.movimenti || [];
                    const items = Array.isArray(allItems) ? allItems : [];

                    // COMPENSO_FORMATORE movimenti → show as "Compensi Corsi"
                    const compensoFormatoreMovimenti = items.filter(
                        (m: any) => m.tipo === 'COMPENSO_FORMATORE'
                    );

                    setCompensiCorsi(compensoFormatoreMovimenti.map((m: any) => ({
                        id: m.id,
                        numero: null,
                        descrizione: m.descrizione || 'Compenso formatore',
                        stato: m.stato,
                        importoFinale: m.importoNetto,
                        prezzoTotale: m.importoNetto,
                        dataEsecuzione: m.dataEsecuzione,
                        courseScheduleId: m.courseScheduleId,
                        _isMovimento: true
                    })));

                    // Non-COMPENSO_FORMATORE → show as "Spettanze Servizi"
                    setMovimentiPassivi(items.filter(
                        (m: any) => m.tipo !== 'COMPENSO_FORMATORE'
                    ));
                } catch (err) {
                }
            } catch (err) {
                setTrainer(null);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-80">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Caricamento...</p>
                </div>
            </div>
        );
    }

    if (!trainer) {
        return (
            <div className="flex items-center justify-center h-80">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-800">Formatore non trovato</h2>
                    <p className="text-gray-600 mt-2">Il formatore che stai cercando non esiste o è stato rimosso.</p>
                    <Link to="/trainers" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
                        Torna ai Formatori
                    </Link>
                </div>
            </div>
        );
    }

    // Combine documents for display
    const allDocuments = [
        ...documenti.lettereIncarico.map(l => ({ ...l, type: 'lettera' })),
        ...documenti.registriPresenze.map(r => ({ ...r, type: 'registro' }))
    ];

    return (
        <div className="space-y-6">
            {/* Back link */}
            <div>
                <Link
                    to="/trainers"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                    <ChevronRight className="h-4 w-4 mr-1 transform rotate-180" />
                    Torna ai Formatori
                </Link>
            </div>

            {/* Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center">
                        {/* Avatar */}
                        <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-xl font-bold text-white">
                                {trainer.firstName?.charAt(0)}{trainer.lastName?.charAt(0)}
                            </span>
                        </div>

                        {/* Name & Info */}
                        <div className="ml-4">
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                {trainer.lastName} {trainer.firstName}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                {trainer.title || 'Formatore'}
                                {company && (
                                    <>
                                        <span className="mx-2 text-gray-400">•</span>
                                        <span>{company.ragioneSociale}</span>
                                    </>
                                )}
                            </p>
                            <p className="text-sm text-gray-500">
                                Codice Fiscale: {trainer.taxCode || 'Non disponibile'}
                            </p>
                        </div>
                    </div>

                    {/* Edit Button - Pillola */}
                    <div className="mt-4 md:mt-0 flex items-center gap-2">
                        <button
                            onClick={() => setShowCredentialsModal(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                            <KeyRound className="h-4 w-4" />
                            Credenziali
                        </button>
                        <Link
                            to={`/trainers/${trainer.id}/edit`}
                            className="btn-primary flex items-center rounded-full"
                        >
                            <Edit className="h-4 w-4 mr-1" />
                            Modifica Formatore
                        </Link>
                    </div>
                </div>

                {/* Info Grid 3 Colonne */}
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Colonna 1: Informazioni Personali */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Informazioni Personali</h2>
                        <ul className="space-y-2">
                            <li className="flex items-start">
                                <User className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Nome Completo</span>
                                    <span className="block text-sm text-gray-600">
                                        {trainer.lastName}, {trainer.firstName}
                                    </span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Data di Nascita</span>
                                    <span className="block text-sm text-gray-600">
                                        {trainer.birthDate
                                            ? new Date(trainer.birthDate).toLocaleDateString('it-IT')
                                            : 'Non disponibile'}
                                    </span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Telefono</span>
                                    <span className="block text-sm text-gray-600">{trainer.phone || 'Non disponibile'}</span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Email</span>
                                    <span className="block text-sm text-gray-600">{trainer.email || 'Non disponibile'}</span>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Colonna 2: Informazioni Professionali */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Informazioni Professionali</h2>
                        <ul className="space-y-2">
                            <li className="flex items-start">
                                <GraduationCap className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Specializzazione</span>
                                    <span className="block text-sm text-gray-600">{trainer.specialties?.join(', ') || 'Non specificata'}</span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <Award className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Prezzo/ora</span>
                                    <span className="block text-sm font-semibold text-gray-900">
                                        {trainer.hourlyRate ? `€${Number(trainer.hourlyRate).toFixed(2)}` : 'Non specificato'}
                                    </span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <Award className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Certificazioni</span>
                                    <span className="block text-sm text-gray-600">
                                        {trainer.certifications && trainer.certifications.length > 0
                                            ? trainer.certifications.join(', ')
                                            : 'Nessuna certificazione registrata'}
                                    </span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Registro Formatori</span>
                                    <span className="block text-sm text-gray-600">
                                        {/* TODO: aggiungere campo registro */}
                                        Non disponibile
                                    </span>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Colonna 3: Residenza */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Residenza</h2>
                        <ul className="space-y-2">
                            <li className="flex items-start">
                                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="ml-2">
                                    <span className="block text-xs font-medium text-gray-800">Indirizzo</span>
                                    <span className="block text-sm text-gray-600">
                                        {trainer.residenceAddress || 'Non disponibile'}
                                    </span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <div className="ml-0">
                                    <span className="block text-xs font-medium text-gray-800">Città</span>
                                    <span className="block text-sm text-gray-600">
                                        {trainer.residenceCity || 'Non disponibile'}
                                    </span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <div className="ml-0">
                                    <span className="block text-xs font-medium text-gray-800">Provincia</span>
                                    <span className="block text-sm text-gray-600">{trainer.province || 'Non disponibile'}</span>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <div className="ml-0">
                                    <span className="block text-xs font-medium text-gray-800">CAP</span>
                                    <span className="block text-sm text-gray-600">{trainer.postalCode || 'Non disponibile'}</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <nav className="flex overflow-x-auto -mb-px px-4 pt-2" aria-label="Tabs">
                    {TRAINER_TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap mr-1 ${isActive
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab: Profilo */}
            {activeTab === 'profilo' && (<>

                {/* Sezioni Corsi - Layout affiancato come EmployeeDetails */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Corsi Svolti */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30 p-6 h-96">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                                Corsi Svolti
                            </h2>
                            <Link
                                to={`/schedules?trainerId=${id}&status=COMPLETED`}
                                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 flex items-center rounded-full px-3 py-1 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                            >
                                Vedi Tutti
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                        </div>

                        <div className="space-y-3 overflow-y-auto h-80">
                            {completedCourses.length > 0 ? (
                                completedCourses.slice(0, 5).map((schedule: any) => (
                                    <Link
                                        key={schedule.id}
                                        to={`/schedules/${schedule.id}`}
                                        className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-l-4 border-green-400 hover:bg-green-100 transition-colors"
                                    >
                                        <div className="flex items-center">
                                            <GraduationCap className="h-5 w-5 text-green-600 mr-3" />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-gray-100">{schedule.course?.title || 'Corso'}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {schedule.course?.duration || '-'}h
                                                    {schedule.course?.riskLevel && (
                                                        <span className="ml-2">• {getRiskLevelLabel(schedule.course.riskLevel, schedule.course.title)}</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-green-600">Completato</p>
                                            <p className="text-xs text-gray-500">
                                                {schedule.endDate ? new Date(schedule.endDate).toLocaleDateString('it-IT') : '-'}
                                            </p>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <GraduationCap className="h-16 w-16 mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium">Nessun corso svolto</p>
                                    <p className="text-sm mt-1">
                                        I corsi completati da questo formatore appariranno qui
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Corsi Programmati */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30 p-6 h-96">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                                <Clock className="h-5 w-5 mr-2 text-orange-600" />
                                Corsi Programmati
                            </h2>
                            <Link
                                to={`/schedules?trainerId=${id}&status=PENDING,CONFIRMED,ACTIVE`}
                                className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 flex items-center rounded-full px-3 py-1 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors"
                            >
                                Vedi Tutti
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                        </div>

                        <div className="space-y-3 overflow-y-auto h-80">
                            {upcomingCourses.length > 0 ? (
                                upcomingCourses.slice(0, 5).map((schedule: any) => {
                                    const statusColor = schedule.status === 'ACCETTATO' ? 'blue' : 'orange';
                                    const statusLabel = schedule.status === 'PREVENTIVO' ? 'Preventivo' : 'Accettato';
                                    return (
                                        <Link
                                            key={schedule.id}
                                            to={`/schedules/${schedule.id}`}
                                            className={`flex items-center justify-between p-3 bg-${statusColor}-50 rounded-lg border-l-4 border-${statusColor}-400 hover:bg-${statusColor}-100 transition-colors`}
                                        >
                                            <div className="flex items-center">
                                                <BookOpen className={`h-5 w-5 text-${statusColor}-600 mr-3`} />
                                                <div>
                                                    <p className="font-medium text-gray-900">{schedule.course?.title || 'Corso'}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {schedule.course?.duration || '-'}h
                                                        {schedule.course?.riskLevel && (
                                                            <span className="ml-2">• {getRiskLevelLabel(schedule.course.riskLevel, schedule.course.title)}</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-medium text-${statusColor}-600`}>{statusLabel}</p>
                                                <p className="text-xs text-gray-500">
                                                    {schedule.startDate ? new Date(schedule.startDate).toLocaleDateString('it-IT') : '-'}
                                                </p>
                                            </div>
                                        </Link>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <BookOpen className="h-16 w-16 mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium">Nessun corso programmato</p>
                                    <p className="text-sm mt-1">
                                        I corsi futuri assegnati a questo formatore appariranno qui
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sezioni Aggiuntive - Grid 2 colonne */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Spettanze */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                                <Euro className="h-5 w-5 mr-2 text-purple-600" />
                                Spettanze e Compensi
                            </h2>
                        </div>

                        {/* Compensi per Corsi */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                                    <ArrowUpRight className="h-4 w-4 mr-1.5 text-green-500" />
                                    Compensi Corsi
                                </h3>
                                <Link
                                    to={`/management/movimenti-contabili?personId=${id}&direzione=USCITA&tipo=COMPENSO_FORMATORE`}
                                    className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 flex items-center"
                                >
                                    Vedi Tutti
                                    <ChevronRight className="h-3 w-3 ml-0.5" />
                                </Link>
                            </div>
                            <div className="space-y-2">
                                {compensiCorsi.length > 0 ? (
                                    compensiCorsi.slice(0, 5).map((preventivo: any) => {
                                        const statusColor = preventivo.stato === 'ACCETTATO' ? 'green' :
                                            preventivo.stato === 'ARCHIVIATO' ? 'blue' :
                                                preventivo.stato === 'FATTURATO' || preventivo.stato === 'PAGATO' ? 'purple' :
                                                    preventivo.stato === 'INVIATO' || preventivo.stato === 'CONFERMATO' ? 'yellow' :
                                                        preventivo.stato === 'DA_FATTURARE' ? 'yellow' : 'gray';
                                        const statusLabel = preventivo.stato === 'ACCETTATO' ? 'Accettato' :
                                            preventivo.stato === 'ARCHIVIATO' ? 'Archiviato' :
                                                preventivo.stato === 'FATTURATO' ? 'Fatturato' :
                                                    preventivo.stato === 'PAGATO' ? 'Pagato' :
                                                        preventivo.stato === 'INVIATO' ? 'Inviato' :
                                                            preventivo.stato === 'DA_FATTURARE' ? 'Da fatturare' :
                                                                preventivo.stato === 'CONFERMATO' ? 'Confermato' :
                                                                    preventivo.stato === 'BOZZA' ? 'Bozza' : preventivo.stato;

                                        // Compensi corsi are always movimenti (not linkable to preventivi)
                                        return (
                                            <div
                                                key={preventivo.id}
                                                className={`flex items-center justify-between p-3 bg-${statusColor}-50 dark:bg-${statusColor}-900/20 rounded-lg border-l-4 border-${statusColor}-400 hover:bg-${statusColor}-100 dark:hover:bg-${statusColor}-900/30 transition-colors`}
                                            >
                                                <div className="flex items-center">
                                                    <CreditCard className={`h-4 w-4 text-${statusColor}-600 mr-2`} />
                                                    <div>
                                                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                                            {preventivo.numero || `Preventivo #${preventivo.id?.substring(0, 8)}`}
                                                        </p>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                                            {preventivo.schedule?.course?.title || preventivo.descrizione || 'Compenso formatore'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-xs font-medium text-${statusColor}-600`}>{statusLabel}</p>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        €{Number(preventivo.importoFinale || preventivo.prezzoTotale || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-3">Nessun compenso corso registrato</p>
                                )}
                            </div>
                        </div>

                        {/* Movimenti Passivi (Nomine, DVR, Sopralluoghi) */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center mb-2">
                                <ArrowDownLeft className="h-4 w-4 mr-1.5 text-orange-500" />
                                Spettanze Servizi (Nomine, DVR, Sopralluoghi)
                            </h3>
                            <div className="space-y-2">
                                {movimentiPassivi.length > 0 ? (
                                    movimentiPassivi.slice(0, 5).map((mov: any) => {
                                        const tipoLabels: Record<string, string> = {
                                            NOMINA_RSPP: 'Nomina RSPP',
                                            NOMINA_MC: 'Nomina MC',
                                            DVR: 'DVR',
                                            DVR_NUOVO: 'DVR Nuovo',
                                            DVR_AGGIORNAMENTO_CON_MODIFICHE: 'DVR Aggiornamento (con modifiche)',
                                            DVR_AGGIORNAMENTO_SENZA_MODIFICHE: 'DVR Aggiornamento (senza modifiche)',
                                            SOPRALLUOGO: 'Sopralluogo',
                                            CONSULENZA: 'Consulenza',
                                        };
                                        const statoColors: Record<string, string> = {
                                            BOZZA: 'gray',
                                            DA_FATTURARE: 'yellow',
                                            CONFERMATO: 'blue',
                                            FATTURATO: 'purple',
                                            PAGATO: 'green',
                                        };
                                        const color = statoColors[mov.stato] || 'gray';
                                        return (
                                            <div
                                                key={mov.id}
                                                className={`flex items-center justify-between p-3 bg-${color}-50 dark:bg-${color}-900/20 rounded-lg border-l-4 border-${color}-400`}
                                            >
                                                <div>
                                                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                                        {tipoLabels[mov.tipo] || mov.tipo}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {mov.descrizione || ''}
                                                        {mov.dataEsecuzione && ` · ${new Date(mov.dataEsecuzione).toLocaleDateString('it-IT')}`}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        €{Number(mov.importoNetto || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-3">Nessuna spettanza servizi registrata</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Documenti */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30 p-6 h-96">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                                <FileCheck className="h-5 w-5 mr-2 text-blue-600" />
                                Documenti
                            </h2>
                            <Link
                                to={`/documents-corsi?trainerId=${id}`}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center rounded-full px-3 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            >
                                Vedi Tutti
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                        </div>

                        <div className="space-y-3 overflow-y-auto h-80">
                            {allDocuments.length > 0 ? (
                                allDocuments.slice(0, 6).map((doc: any) => {
                                    const isLettera = doc.type === 'lettera';
                                    const docColor = isLettera ? 'indigo' : 'teal';
                                    const docIcon = isLettera ? FileText : FileCheck;
                                    const DocIcon = docIcon;
                                    const handleDownload = async (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        try {
                                            if (isLettera) {
                                                await lettereIncaricoService.download(doc.id);
                                            } else {
                                                await registriPresenzeService.download(doc.id);
                                            }
                                        } catch {
                                            showToast({ message: 'Errore durante il download del documento', type: 'error' });
                                        }
                                    };
                                    const handleView = async (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        try {
                                            if (isLettera) {
                                                const lettera = await lettereIncaricoService.get(doc.id);
                                                if (lettera?.url) window.open(lettera.url, '_blank');
                                            } else {
                                                const registro = await registriPresenzeService.get(doc.id);
                                                if (registro?.url) window.open(registro.url, '_blank');
                                            }
                                        } catch {
                                            showToast({ message: 'Errore durante la visualizzazione', type: 'error' });
                                        }
                                    };
                                    return (
                                        <div
                                            key={doc.id}
                                            className={`flex items-center justify-between p-3 bg-${docColor}-50 rounded-lg border-l-4 border-${docColor}-400 hover:bg-${docColor}-100 transition-colors`}
                                        >
                                            <div className="flex items-center flex-1 min-w-0">
                                                <DocIcon className={`h-5 w-5 text-${docColor}-600 mr-3 flex-shrink-0`} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-gray-900 truncate">
                                                        {isLettera ? 'Lettera di Incarico' : 'Registro Presenze'}
                                                    </p>
                                                    <p className="text-sm text-gray-600 truncate">
                                                        {doc.schedule?.course?.title || 'Corso'}
                                                        {doc.schedule?.company?.ragioneSociale && (
                                                            <span> - {doc.schedule.company.ragioneSociale}</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-2">
                                                <span className="text-xs text-gray-500">
                                                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('it-IT') : '-'}
                                                </span>
                                                <button
                                                    onClick={handleView}
                                                    className={`p-1 rounded hover:bg-${docColor}-100 text-${docColor}-600`}
                                                    title="Visualizza PDF"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={handleDownload}
                                                    className={`p-1 rounded hover:bg-${docColor}-100 text-${docColor}-600`}
                                                    title="Scarica documento"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                {(doc.scheduledCourseId || doc.scheduleId) && (
                                                    <Link
                                                        to={`/schedules/${doc.scheduledCourseId || doc.scheduleId}`}
                                                        className={`p-1 rounded hover:bg-${docColor}-100 text-${docColor}-600`}
                                                        title="Vai al corso"
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <FileCheck className="h-16 w-16 mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium">Nessun documento disponibile</p>
                                    <p className="text-sm mt-1">
                                        Lettere di incarico e registri presenze appariranno qui
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progetto 48: Profili Multi-Tenant */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30 p-6">
                    <PersonTenantProfilesWidget
                        personId={id!}
                        compactMode={false}
                        editable={false}
                        theme="blue"
                    />
                </div>

                {/* Note Aggiuntive */}
                {trainer.notes && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-black/30 p-6">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Note Aggiuntive</h2>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">{trainer.notes}</p>
                        </div>
                    </div>
                )}

            </>)} {/* end tab profilo */}

            {/* Tab: Compensi */}
            {activeTab === 'compensi' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <TabCompensiFormatore trainerId={id!} />
                </div>
            )}

            {/* Modal gestione credenziali */}
            {trainer && (
                <PersonCredentialsModal
                    open={showCredentialsModal}
                    onOpenChange={setShowCredentialsModal}
                    persons={[{
                        id: trainer.id,
                        firstName: trainer.firstName || '',
                        lastName: trainer.lastName || '',
                        email: trainer.email ?? undefined,
                    }]}
                />
            )}
        </div>
    );
}
