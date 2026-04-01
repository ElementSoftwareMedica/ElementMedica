/**
 * AppuntamentoDetailPage - Pagina dettaglio singolo appuntamento
 *
 * Layout elegante con azioni contestuali per stato, dettagli completi,
 * e navigazione rapida verso visita/fattura/referto.
 *
 * @module pages/clinica/agenda/AppuntamentoDetailPage
 */

import React, { useCallback, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Calendar,
    Clock,
    User,
    Stethoscope,
    Building2,
    Phone,
    Mail,
    CreditCard,
    FileText,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    AlertCircle,
    Timer,
    Play,
    RefreshCw,
    Receipt,
    RotateCcw,
    UserCheck,
    PhoneCall,
    ExternalLink,
    FilePlus,
    BookOpen,
    Loader2,
    ChevronRight,
    FileCheck,
    Briefcase,
    ShieldAlert,
    HardHat
} from 'lucide-react';
import { appuntamentiApi, StatoAppuntamento, Appuntamento } from '../../../services/clinicaApi';
import { CATEGORIA_VISITA_LABELS } from '../../../services/tariffarioAziendaleApi';
import { formatDate, formatTime } from '../../../utils/dateUtils';
import { getPersonDisplayName } from '../../../utils/personDisplayUtils';
import { getDoctorTitle } from '../../../utils/codiceFiscale';
import { Button } from '../../../components/ui/button';
import { CRUDButton } from '../../../components/shared/CRUDButton';
import { useToast } from '../../../hooks/useToast';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { AccettazionePazienteModal, type PatientFormData } from './components/AccettazionePazienteModal';

// ============================================
// CONSTANTS
// ============================================

const STATO_FLOW: StatoAppuntamento[] = [
    'PRENOTATO', 'CONFERMATO', 'IN_ATTESA', 'IN_CORSO', 'COMPLETATO', 'FATTURATO'
];

const STATO_CONFIG: Record<StatoAppuntamento, {
    label: string;
    shortLabel: string;
    gradient: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    icon: React.ElementType;
}> = {
    PRENOTATO: {
        label: 'Prenotato',
        shortLabel: 'Prenotato',
        gradient: 'from-blue-400 to-sky-500',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        textColor: 'text-blue-600 dark:text-blue-300',
        borderColor: 'border-blue-200 dark:border-blue-800',
        icon: Calendar
    },
    CONFERMATO: {
        label: 'Confermato',
        shortLabel: 'Confermato',
        gradient: 'from-emerald-400 to-teal-500',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        textColor: 'text-emerald-600 dark:text-emerald-300',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        icon: CheckCircle
    },
    IN_ATTESA: {
        label: 'In Sala d\'Attesa',
        shortLabel: 'In Attesa',
        gradient: 'from-amber-400 to-orange-400',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        textColor: 'text-amber-600 dark:text-amber-300',
        borderColor: 'border-amber-200 dark:border-amber-800',
        icon: Timer
    },
    IN_CORSO: {
        label: 'Visita in Corso',
        shortLabel: 'In Corso',
        gradient: 'from-violet-400 to-purple-500',
        bgColor: 'bg-violet-50 dark:bg-violet-900/20',
        textColor: 'text-violet-600 dark:text-violet-300',
        borderColor: 'border-violet-200 dark:border-violet-800',
        icon: Play
    },
    COMPLETATO: {
        label: 'Completato',
        shortLabel: 'Completato',
        gradient: 'from-teal-400 to-cyan-500',
        bgColor: 'bg-teal-50 dark:bg-teal-900/20',
        textColor: 'text-teal-600 dark:text-teal-300',
        borderColor: 'border-teal-200 dark:border-teal-800',
        icon: CheckCircle
    },
    FATTURATO: {
        label: 'Fatturato',
        shortLabel: 'Fatturato',
        gradient: 'from-indigo-400 to-blue-500',
        bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
        textColor: 'text-indigo-600 dark:text-indigo-300',
        borderColor: 'border-indigo-200 dark:border-indigo-800',
        icon: FileCheck
    },
    ANNULLATO: {
        label: 'Annullato',
        shortLabel: 'Annullato',
        gradient: 'from-rose-400 to-red-500',
        bgColor: 'bg-rose-50 dark:bg-rose-900/20',
        textColor: 'text-rose-600 dark:text-rose-300',
        borderColor: 'border-rose-200 dark:border-rose-800',
        icon: XCircle
    },
    NO_SHOW: {
        label: 'Non Presentato',
        shortLabel: 'No Show',
        gradient: 'from-slate-400 to-gray-500',
        bgColor: 'bg-gray-50 dark:bg-gray-800',
        textColor: 'text-gray-600 dark:text-gray-300',
        borderColor: 'border-gray-200 dark:border-gray-700',
        icon: AlertCircle
    },
    RINVIATO: {
        label: 'Rinviato',
        shortLabel: 'Rinviato',
        gradient: 'from-orange-400 to-amber-500',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        textColor: 'text-orange-600 dark:text-orange-300',
        borderColor: 'border-orange-200 dark:border-orange-800',
        icon: RotateCcw
    }
};

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * StatusFlow — horizontal stepper showing appointment progress
 */
const StatusFlow: React.FC<{ stato: StatoAppuntamento }> = ({ stato }) => {
    const currentIndex = STATO_FLOW.indexOf(stato);
    const isTerminal = stato === 'ANNULLATO' || stato === 'NO_SHOW' || stato === 'RINVIATO';

    if (isTerminal) return null;

    return (
        <div className="flex items-center gap-1 overflow-x-auto py-1">
            {STATO_FLOW.map((s, i) => {
                const cfg = STATO_CONFIG[s];
                const Icon = cfg.icon;
                const isDone = i < currentIndex;
                const isCurrent = i === currentIndex;

                return (
                    <React.Fragment key={s}>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${isCurrent
                                ? `bg-gradient-to-r ${cfg.gradient} text-white shadow-sm`
                                : isDone
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600'
                            }`}>
                            <Icon className="h-3 w-3" />
                            <span className="hidden sm:inline">{cfg.shortLabel}</span>
                        </div>
                        {i < STATO_FLOW.length - 1 && (
                            <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 ${i < currentIndex ? 'text-gray-400 dark:text-gray-500' : 'text-gray-200 dark:text-gray-700'
                                }`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

/**
 * InfoRow — compact label + value row
 */
const InfoRow: React.FC<{
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    accent?: boolean;
}> = ({ icon: Icon, label, value, accent }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
        <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${accent ? 'bg-teal-50 dark:bg-teal-900/30' : 'bg-gray-50 dark:bg-gray-800'
            }`}>
            <Icon className={`h-4 w-4 ${accent ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400'}`} />
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</div>
        </div>
    </div>
);

// ============================================
// COMPONENT
// ============================================

const AppuntamentoDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { tenantFilterKey } = useTenantFilter();
    const { confirmDelete } = useConfirmDialog();

    // Fetch appointment
    const { data: appuntamento, isLoading, error, refetch } = useQuery({
        queryKey: ['appuntamento', id, tenantFilterKey],
        queryFn: () => appuntamentiApi.getById(id!),
        enabled: !!id
    });

    // Change stato mutation
    const changeStatoMutation = useMutation({
        mutationFn: async (stato: StatoAppuntamento) => {
            if (stato === 'IN_ATTESA') return appuntamentiApi.accetta(id!);
            if (stato === 'IN_CORSO') return appuntamentiApi.chiama(id!);
            return appuntamentiApi.changeStato(id!, stato);
        },
        onSuccess: (result, stato) => {
            queryClient.invalidateQueries({ queryKey: ['appuntamento', id] });
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
            if (
                stato === 'IN_ATTESA' &&
                result && typeof result === 'object' &&
                'noActiveQueueSession' in result &&
                result.noActiveQueueSession
            ) {
                showToast({
                    message: 'Paziente in attesa. Nessuna sessione coda attiva: numero non assegnato.',
                    type: 'warning',
                    duration: 5000
                });
            } else {
                showToast({ message: `Stato aggiornato: ${STATO_CONFIG[stato]?.label || stato}`, type: 'success' });
            }
        },
        onError: () => showToast({ message: 'Errore durante il cambio stato', type: 'error' })
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: () => appuntamentiApi.delete(id!),
        onSuccess: () => {
            showToast({ message: 'Appuntamento eliminato', type: 'success' });
            navigate('/poliambulatorio/agenda/appuntamenti');
        },
        onError: () => showToast({ message: 'Errore durante l\'eliminazione', type: 'error' })
    });

    // Accettazione Modal state
    const [isAccettazioneOpen, setIsAccettazioneOpen] = useState(false);
    const [isAccettazioneLoading, setIsAccettazioneLoading] = useState(false);

    const handleChangeStato = useCallback((stato: StatoAppuntamento) => {
        changeStatoMutation.mutate(stato);
    }, [changeStatoMutation]);

    const handleDelete = useCallback(async () => {
        if (await confirmDelete('questo appuntamento')) {
            deleteMutation.mutate();
        }
    }, [deleteMutation, confirmDelete]);

    const handleAccettazioneConfirm = useCallback(async (patientData: PatientFormData) => {
        if (!appuntamento) return;
        setIsAccettazioneLoading(true);
        try {
            const result = await appuntamentiApi.accetta(
                appuntamento.id,
                {
                    convenzioneId: patientData.convenzioneId || undefined,
                    pazienteId: patientData.pazienteId || undefined,
                    note: patientData.note || undefined,
                    noteInterne: patientData.noteInterne || undefined,
                    stato: patientData.stato || undefined,
                }
            );
            if (result && typeof result === 'object' && 'noActiveQueueSession' in result && result.noActiveQueueSession) {
                showToast({ message: 'Paziente accettato. Nessuna sessione coda attiva: numero non assegnato.', type: 'warning', duration: 5000 });
            } else {
                showToast({ message: 'Paziente accettato con successo', type: 'success' });
            }
            queryClient.invalidateQueries({ queryKey: ['appuntamento', id] });
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
            setIsAccettazioneOpen(false);
        } catch {
            showToast({ message: 'Errore durante l\'accettazione', type: 'error' });
        } finally {
            setIsAccettazioneLoading(false);
        }
    }, [appuntamento, id, queryClient, showToast]);

    // ——— Loading ———
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                    <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mx-auto" />
                    <p className="text-sm text-gray-500">Caricamento appuntamento...</p>
                </div>
            </div>
        );
    }

    // ——— Error ———
    if (error || !appuntamento) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
                    <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-2">Appuntamento non trovato</h2>
                    <p className="text-red-600 dark:text-red-400 mb-6 text-sm">
                        L'appuntamento richiesto non esiste o non hai i permessi per visualizzarlo.
                    </p>
                    <Button onClick={() => navigate('/poliambulatorio/agenda/appuntamenti')} variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Torna alla lista
                    </Button>
                </div>
            </div>
        );
    }

    const cfg = STATO_CONFIG[appuntamento.stato] || STATO_CONFIG.PRENOTATO;
    const StatusIcon = cfg.icon;
    const dataOra = new Date(appuntamento.dataOra);
    const oraFine = new Date(dataOra.getTime() + (appuntamento.durataMinuti || 30) * 60000);
    const isBusy = changeStatoMutation.isPending;
    const isTerminal = ['ANNULLATO', 'NO_SHOW', 'RINVIATO'].includes(appuntamento.stato);

    const patientName = getPersonDisplayName(appuntamento.paziente, '');
    const initials = patientName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'P';
    const doctorName = appuntamento.medico
        ? `${getDoctorTitle((appuntamento.medico as any).taxCode, (appuntamento.medico as any).gender)} ${getPersonDisplayName(appuntamento.medico)}`
        : null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* ——— Elegant Header ——— */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    {/* Back + Edit nav */}
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors text-sm font-medium"
                        >
                            <ArrowLeft className="h-4 w-4" /> Appuntamenti
                        </button>
                        <Link
                            to={`/poliambulatorio/appuntamenti/${id}/modifica`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Edit className="h-3.5 w-3.5" /> Modifica
                        </Link>
                    </div>
                    {/* Status pill + title */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r ${cfg.gradient} text-white shadow-sm`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {cfg.label}
                        </div>
                        <span className="text-gray-400 dark:text-gray-500 text-sm font-mono">#{appuntamento.numero || appuntamento.id.slice(0, 8)}</span>
                        {appuntamento.numeroCoda != null && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${cfg.gradient} text-white`}>
                                Coda {appuntamento.displayNumberCoda || appuntamento.numeroCoda}
                            </span>
                        )}
                        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(dataOra, 'full')} • {formatTime(dataOra)} – {formatTime(oraFine)}
                            {appuntamento.durataMinuti && <span className="text-gray-400"> ({appuntamento.durataMinuti} min)</span>}
                        </span>
                    </div>
                    {/* Status flow */}
                    <div className="mt-3">
                        <StatusFlow stato={appuntamento.stato} />
                    </div>
                </div>
            </div>

            {/* ——— Content ——— */}
            <div className="max-w-5xl mx-auto px-6 pt-5 pb-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* ——— LEFT (2/3) ——— */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* Contextual Actions Banner */}
                        {!isTerminal && (
                            <div className={`rounded-2xl border ${cfg.borderColor} bg-white dark:bg-gray-800 shadow-sm overflow-hidden`}>
                                <div className="p-4">
                                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${cfg.textColor}`}>Azioni disponibili</p>
                                    <div className="flex flex-wrap gap-2">
                                        {/* PRENOTATO / CONFERMATO */}
                                        {(appuntamento.stato === 'PRENOTATO' || appuntamento.stato === 'CONFERMATO') && (
                                            <>
                                                <button disabled={isBusy} onClick={() => setIsAccettazioneOpen(true)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm">
                                                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                                                    Accetta Paziente
                                                </button>
                                                <button disabled={isBusy} onClick={() => handleChangeStato('NO_SHOW')}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors">
                                                    <XCircle className="h-4 w-4" /> No Show
                                                </button>
                                                {appuntamento.stato === 'PRENOTATO' && (
                                                    <button disabled={isBusy} onClick={() => handleChangeStato('CONFERMATO')}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 disabled:opacity-50 transition-colors">
                                                        <CheckCircle className="h-4 w-4" /> Conferma
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {/* IN_ATTESA */}
                                        {appuntamento.stato === 'IN_ATTESA' && (
                                            <>
                                                <button disabled={isBusy}
                                                    onClick={() => {
                                                        handleChangeStato('IN_CORSO');
                                                        if (appuntamento.visita?.id) {
                                                            setTimeout(() => navigate(`/poliambulatorio/visite/${appuntamento.visita!.id}`), 300);
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm">
                                                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> :
                                                        appuntamento.numeroCoda != null ? <PhoneCall className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                                    {appuntamento.numeroCoda != null
                                                        ? `Chiama e Visita (#${appuntamento.displayNumberCoda ?? appuntamento.numeroCoda})`
                                                        : 'Inizia Visita'}
                                                </button>
                                                <button disabled={isBusy} onClick={() => handleChangeStato('NO_SHOW')}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors">
                                                    <XCircle className="h-4 w-4" /> No Show
                                                </button>
                                            </>
                                        )}
                                        {/* IN_CORSO */}
                                        {appuntamento.stato === 'IN_CORSO' && (
                                            <button onClick={() => {
                                                if (appuntamento.visita?.id) navigate(`/poliambulatorio/visite/${appuntamento.visita.id}`);
                                            }} disabled={!appuntamento.visita?.id}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm">
                                                <ExternalLink className="h-4 w-4" /> Vai alla Visita
                                            </button>
                                        )}
                                        {/* COMPLETATO */}
                                        {appuntamento.stato === 'COMPLETATO' && (
                                            <button onClick={() => {
                                                if (appuntamento.visita?.id) navigate(`/poliambulatorio/fatture/nuova?visitaId=${appuntamento.visita.id}`);
                                                else navigate(`/poliambulatorio/fatture/nuova?appuntamentoId=${id}`);
                                            }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm">
                                                <FilePlus className="h-4 w-4" /> Crea Fattura
                                            </button>
                                        )}
                                        {/* FATTURATO */}
                                        {appuntamento.stato === 'FATTURATO' && appuntamento.visita?.id && (
                                            <button onClick={() => navigate(`/poliambulatorio/visite/${appuntamento.visita!.id}`)}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm">
                                                <BookOpen className="h-4 w-4" /> Vedi Referto
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Appointment Details */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                                    <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                </div>
                                Dettagli Appuntamento
                            </h2>
                            <InfoRow icon={Calendar} label="Data" value={formatDate(dataOra, 'full')} accent />
                            <InfoRow icon={Clock} label="Orario" accent
                                value={<span>{formatTime(dataOra)} – {formatTime(oraFine)} <span className="text-xs text-gray-400 font-normal">({appuntamento.durataMinuti || 30} min)</span></span>} />
                            {appuntamento.prestazione && (
                                <InfoRow icon={Stethoscope} label="Prestazione principale" accent
                                    value={
                                        <span className="flex items-center gap-2">
                                            {appuntamento.prestazione.nome}
                                            {appuntamento.prestazione.codice && <span className="text-xs text-gray-400 font-mono">{appuntamento.prestazione.codice}</span>}
                                            {((appuntamento.prestazione as any)._prezzoTariffario ?? appuntamento.prestazione.prezzoBase) && (
                                                <span className="ml-1 text-xs font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-1.5 py-0.5 rounded">
                                                    € {Number((appuntamento.prestazione as any)._prezzoTariffario ?? appuntamento.prestazione.prezzoBase).toFixed(2)}
                                                </span>
                                            )}
                                        </span>
                                    } />
                            )}
                            {/* Prestazioni aggiuntive */}
                            {(appuntamento as any).prestazioni?.map((ap: any, idx: number) => ap.prestazione ? (
                                <InfoRow key={ap.id ?? idx} icon={Stethoscope} label={`Prestazione aggiuntiva ${idx + 1}`}
                                    value={
                                        <span className="flex items-center gap-2">
                                            {ap.prestazione.nome}
                                            {ap.prestazione.codice && <span className="text-xs text-gray-400 font-mono">{ap.prestazione.codice}</span>}
                                            {ap.prezzo != null && (
                                                <span className="ml-1 text-xs font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-1.5 py-0.5 rounded">
                                                    € {Number(ap.prezzo).toFixed(2)}
                                                </span>
                                            )}
                                        </span>
                                    } />
                            ) : null)}
                            {appuntamento.ambulatorio && (
                                <InfoRow icon={Building2} label="Ambulatorio" value={appuntamento.ambulatorio.nome} />
                            )}
                            {appuntamento.convenzioneId && (
                                <InfoRow icon={CreditCard} label="Convenzione" value={appuntamento.convenzione?.nome || 'Applicata'} />
                            )}
                            {appuntamento.tipoVisitaMDL && (
                                <InfoRow icon={FileCheck} label="Tipo Visita MDL" value={CATEGORIA_VISITA_LABELS[appuntamento.tipoVisitaMDL as keyof typeof CATEGORIA_VISITA_LABELS] ?? appuntamento.tipoVisitaMDL} />
                            )}
                            {appuntamento.oraArrivo && (
                                <InfoRow icon={Clock} label="Ora Arrivo" value={formatTime(new Date(appuntamento.oraArrivo))} />
                            )}
                            {appuntamento.oraInizio && (
                                <InfoRow icon={Play} label="Ora Inizio Visita" value={formatTime(new Date(appuntamento.oraInizio))} />
                            )}
                            {appuntamento.oraFine && (
                                <InfoRow icon={CheckCircle} label="Ora Fine Visita" value={formatTime(new Date(appuntamento.oraFine))} />
                            )}
                        </div>

                        {/* Visita link */}
                        {appuntamento.visita && (
                            <button onClick={() => navigate(`/poliambulatorio/visite/${appuntamento.visita!.id}`)}
                                className="w-full bg-white dark:bg-gray-800 rounded-2xl border border-purple-200 dark:border-purple-800 p-4 shadow-sm flex items-center gap-4 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors text-left group">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                    <Stethoscope className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Visita Collegata</p>
                                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm capitalize">
                                        {appuntamento.visita.stato?.toLowerCase().replace('_', ' ') ?? 'Visita'}
                                    </p>
                                </div>
                                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                            </button>
                        )}

                        {/* Fatture collegate */}
                        {appuntamento.visita?.fatture && appuntamento.visita.fatture.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-5 shadow-sm">
                                <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                        <Receipt className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    Fatture
                                </h2>
                                {appuntamento.visita.fatture.map(f => (
                                    <div key={f.id} className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{f.numeroFattura || `Fattura ${f.id.slice(0, 8)}`}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(new Date(f.dataEmissione), 'short')} • {f.stato}</p>
                                        </div>
                                        <span className="font-semibold text-indigo-700 dark:text-indigo-300">€ {f.totale?.toFixed(2) ?? '—'}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Notes — always visible */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                                    <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                </div>
                                Note
                            </h2>
                            {appuntamento.motivoAnnullamento && (
                                <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                                    <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Motivo Annullamento</p>
                                    <p className="text-sm text-red-700 dark:text-red-300">{appuntamento.motivoAnnullamento}</p>
                                </div>
                            )}
                            <div className="mb-3">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Note appuntamento</p>
                                {appuntamento.note
                                    ? <p className="text-sm text-gray-700 dark:text-gray-300 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">{appuntamento.note}</p>
                                    : <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nessuna nota</p>
                                }
                            </div>
                            <div>
                                <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">⚠ Note interne</p>
                                {appuntamento.noteInterne
                                    ? <p className="text-sm text-amber-800 dark:text-amber-200 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">{appuntamento.noteInterne}</p>
                                    : <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nessuna nota interna</p>
                                }
                            </div>
                        </div>
                    </div>

                    {/* ——— RIGHT (1/3) ——— */}
                    <div className="space-y-4">
                        {/* Patient Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-4 flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500 dark:text-gray-400" /> Paziente
                            </h2>
                            <div className="flex flex-col items-center text-center mb-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-lg font-bold mb-2 shadow-sm">
                                    {initials}
                                </div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{patientName || 'Paziente non assegnato'}</p>
                                {(appuntamento.paziente?.codiceFiscale || (appuntamento.paziente as any)?.taxCode) && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                                        {appuntamento.paziente?.codiceFiscale || (appuntamento.paziente as any)?.taxCode}
                                    </p>
                                )}
                                {((appuntamento.paziente as any)?.birthDate || (appuntamento.paziente as any)?.dataNascita) && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                        {formatDate(new Date((appuntamento.paziente as any).birthDate || (appuntamento.paziente as any).dataNascita), 'short')}
                                    </p>
                                )}
                                {((appuntamento.paziente as any)?.residenceCity || (appuntamento.paziente as any)?.comune) && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                        {(appuntamento.paziente as any).residenceCity || (appuntamento.paziente as any).comune}
                                        {((appuntamento.paziente as any)?.province || (appuntamento.paziente as any)?.provincia) &&
                                            ` (${(appuntamento.paziente as any).province || (appuntamento.paziente as any).provincia})`}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                {(appuntamento.paziente?.telefono || (appuntamento.paziente as any)?.phone) && (
                                    <a href={`tel:${appuntamento.paziente?.telefono || (appuntamento.paziente as any)?.phone}`}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-teal-50 dark:hover:bg-teal-900/20 group transition-colors">
                                        <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-teal-600" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-teal-700 dark:group-hover:text-teal-300">
                                            {appuntamento.paziente?.telefono || (appuntamento.paziente as any)?.phone}
                                        </span>
                                    </a>
                                )}
                                {appuntamento.paziente?.email && (
                                    <a href={`mailto:${appuntamento.paziente.email}`}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-teal-50 dark:hover:bg-teal-900/20 group transition-colors">
                                        <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-teal-600" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-teal-700 dark:group-hover:text-teal-300 truncate">{appuntamento.paziente.email}</span>
                                    </a>
                                )}
                                {appuntamento.paziente?.id && (
                                    <Link to={`/poliambulatorio/pazienti/${appuntamento.paziente.id}`}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors">
                                        <User className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                        <span className="text-sm text-teal-700 dark:text-teal-300 font-medium">Apri Cartella</span>
                                        <ExternalLink className="h-3.5 w-3.5 text-teal-500 ml-auto" />
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Company & Mansione Card — MDL only */}
                        {(appuntamento as any)._companyProfile && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-4 flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-gray-500 dark:text-gray-400" /> Azienda
                                </h2>
                                <div className="space-y-1 mb-3">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                        {(appuntamento as any)._companyProfile.ragioneSociale}
                                    </p>
                                    {(appuntamento as any)._companyProfile.piva && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                            P.IVA {(appuntamento as any)._companyProfile.piva}
                                        </p>
                                    )}
                                    {((appuntamento as any)._companyProfile.citta || (appuntamento as any)._companyProfile.indirizzo) && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {[(appuntamento as any)._companyProfile.indirizzo, (appuntamento as any)._companyProfile.citta, (appuntamento as any)._companyProfile.provincia].filter(Boolean).join(', ')}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    {(appuntamento as any)._companyProfile.telefono && (
                                        <a href={`tel:${(appuntamento as any)._companyProfile.telefono}`}
                                            className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-teal-50 dark:hover:bg-teal-900/20 group transition-colors">
                                            <Phone className="h-3.5 w-3.5 text-gray-400 group-hover:text-teal-600" />
                                            <span className="text-xs text-gray-700 dark:text-gray-300">{(appuntamento as any)._companyProfile.telefono}</span>
                                        </a>
                                    )}
                                    {(appuntamento as any)._companyProfile.email && (
                                        <a href={`mailto:${(appuntamento as any)._companyProfile.email}`}
                                            className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-teal-50 dark:hover:bg-teal-900/20 group transition-colors">
                                            <Mail className="h-3.5 w-3.5 text-gray-400 group-hover:text-teal-600" />
                                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{(appuntamento as any)._companyProfile.email}</span>
                                        </a>
                                    )}
                                    {(appuntamento as any)._companyProfile.companyId && (
                                        <Link to={`/poliambulatorio/aziende/${(appuntamento as any)._companyProfile.companyId}`}
                                            className="flex items-center gap-2.5 p-2 rounded-xl bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors">
                                            <Building2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                                            <span className="text-xs text-teal-700 dark:text-teal-300 font-medium">Apri Scheda Azienda</span>
                                            <ExternalLink className="h-3 w-3 text-teal-500 ml-auto" />
                                        </Link>
                                    )}
                                </div>

                                {/* Worker Mansioni */}
                                {(appuntamento as any)._workerMansioni?.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                            <Briefcase className="h-3.5 w-3.5" /> Mansioni
                                        </p>
                                        <div className="space-y-3">
                                            {(appuntamento as any)._workerMansioni.map((wm: any) => (
                                                <div key={wm.id} className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <HardHat className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {wm.mansione.denominazione}
                                                        </span>
                                                        {wm.isPrimaria && (
                                                            <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">Principale</span>
                                                        )}
                                                    </div>
                                                    {wm.mansione.areaLavoro && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 ml-5">{wm.mansione.areaLavoro}</p>
                                                    )}
                                                    {wm.mansione.rischi?.length > 0 && (
                                                        <div className="ml-5 flex flex-wrap gap-1">
                                                            {wm.mansione.rischi.map((r: any) => {
                                                                const lvlColor = r.livello === 'ALTO' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                                                    : r.livello === 'MEDIO' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                                                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
                                                                return (
                                                                    <span key={r.id} className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${lvlColor}`}>
                                                                        <ShieldAlert className="h-2.5 w-2.5" />
                                                                        {r.codiceRischio}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Doctor Card */}
                        {appuntamento.medico && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-3 flex items-center gap-2">
                                    <Stethoscope className="h-4 w-4 text-gray-500 dark:text-gray-400" /> Medico
                                </h2>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-sm flex-shrink-0">
                                        {getPersonDisplayName(appuntamento.medico).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'M'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{doctorName}</p>
                                        {(appuntamento.medico as any).specialties && (
                                            <p className="text-xs text-gray-400 dark:text-gray-500">{(appuntamento.medico as any).specialties}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Management */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-3">Gestione</h2>
                            <div className="space-y-2">
                                <button onClick={() => refetch()}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <RefreshCw className="h-4 w-4 text-gray-400" /> Aggiorna
                                </button>
                                <CRUDButton
                                    operation="delete"
                                    variant="ghost"
                                    className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm px-3 py-2 rounded-xl"
                                    onClick={handleDelete}
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    Elimina Appuntamento
                                </CRUDButton>
                            </div>
                        </div>

                        {/* Timestamps */}
                        <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1 px-1">
                            <p>Creato: {formatDate(new Date(appuntamento.createdAt), 'short')} {formatTime(new Date(appuntamento.createdAt))}</p>
                            <p>Aggiornato: {formatDate(new Date(appuntamento.updatedAt), 'short')} {formatTime(new Date(appuntamento.updatedAt))}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ——— AccettazionePazienteModal ——— */}
            {appuntamento && (
                <AccettazionePazienteModal
                    appuntamento={appuntamento}
                    isOpen={isAccettazioneOpen}
                    onClose={() => setIsAccettazioneOpen(false)}
                    onConfirm={handleAccettazioneConfirm}
                    isLoading={isAccettazioneLoading}
                />
            )}
        </div>
    );
};

export default AppuntamentoDetailPage;
