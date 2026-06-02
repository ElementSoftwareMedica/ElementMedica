/**
 * MovimentoContabileDetails
 * 
 * P59 - Pagina dettaglio singolo movimento contabile
 * 
 * Features:
 * - Visualizzazione completa dati movimento
 * - Timeline stato
 * - Link a entità correlate
 * - Azioni rapide (modifica, elimina, registra pagamento)
 */

import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Edit,
    Trash2,
    CreditCard,
    FileText,
    Euro,
    Calendar,
    Building2,
    User,
    AlertTriangle,
    CheckCircle,
    Clock,
    XCircle,
    Receipt,
    Loader2,
    ExternalLink,
    TrendingUp,
    TrendingDown,
    Tag,
    Hash,
    Info,
    Banknote,
} from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { CRUDPrimaryButton } from '../../../components/shared/CRUDButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../design-system/molecules/Card';
import { Badge } from '../../../design-system/atoms/Badge';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import {
    useMovimentoContabile,
    useDeleteMovimento,
    useMarkAsPaid,
} from '../../../hooks/management/useMovimentiContabili';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { StatoMovimento, DirezioneMovimento } from '../../../services/movimentiContabiliService';

// ============================================
// HELPERS
// ============================================

const STATO_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; badgeClass: string }> = {
    BOZZA: { label: 'Bozza', color: 'gray', icon: <Clock className="w-4 h-4" />, badgeClass: 'bg-gray-100 text-gray-700 border border-gray-200' },
    DA_FATTURARE: { label: 'Da Fatturare', color: 'blue', icon: <FileText className="w-4 h-4" />, badgeClass: 'bg-blue-100 text-blue-700 border border-blue-200' },
    CONFERMATO: { label: 'Confermato', color: 'indigo', icon: <CheckCircle className="w-4 h-4" />, badgeClass: 'bg-indigo-100 text-indigo-700 border border-indigo-200' },
    FATTURATO: { label: 'Fatturato', color: 'purple', icon: <Receipt className="w-4 h-4" />, badgeClass: 'bg-purple-100 text-purple-700 border border-purple-200' },
    PAGATO: { label: 'Pagato', color: 'green', icon: <CheckCircle className="w-4 h-4" />, badgeClass: 'bg-green-100 text-green-700 border border-green-200' },
    SCADUTO: { label: 'Scaduto', color: 'red', icon: <AlertTriangle className="w-4 h-4" />, badgeClass: 'bg-red-100 text-red-700 border border-red-200' },
    ANNULLATO: { label: 'Annullato', color: 'gray', icon: <XCircle className="w-4 h-4" />, badgeClass: 'bg-gray-200 text-gray-600 border border-gray-300' },
    STORNATO: { label: 'Stornato', color: 'orange', icon: <XCircle className="w-4 h-4" />, badgeClass: 'bg-orange-100 text-orange-700 border border-orange-200' },
};

const getStatoBadgeColor = (stato: StatoMovimento): 'default' | 'success' | 'warning' | 'destructive' | 'secondary' => {
    const map: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
        BOZZA: 'secondary', DA_FATTURARE: 'default', CONFERMATO: 'default',
        FATTURATO: 'warning', PAGATO: 'success', SCADUTO: 'destructive',
        ANNULLATO: 'destructive', STORNATO: 'destructive',
    };
    return map[stato] || 'default';
};

const getStatoIcon = (stato: StatoMovimento) => STATO_CONFIG[stato]?.icon ?? <Info className="w-4 h-4" />;

const getDirezioneLabel = (direzione: DirezioneMovimento) => {
    return direzione === 'ENTRATA' ? 'Ricavo' : 'Costo';
};

const getDirezioneBadgeColor = (direzione: DirezioneMovimento): 'success' | 'destructive' => {
    return direzione === 'ENTRATA' ? 'success' : 'destructive';
};

const TIPO_LABELS: Record<string, string> = {
    VISITA_MEDICA: 'Visita Medica',
    PRESTAZIONE_CLINICA: 'Prestazione Clinica',
    REFERTO: 'Referto',
    VISITA_MDL: 'Visita Medicina del Lavoro',
    SOPRALLUOGO_MC: 'Sopralluogo (MC)',
    SOPRALLUOGO_RSPP: 'Sopralluogo (RSPP)',
    DVR_STESURA: 'DVR - Stesura',
    DVR_AGGIORNAMENTO: 'DVR - Aggiornamento',
    DVR_NUOVO: 'DVR - Nuovo',
    DVR_AGGIORNAMENTO_CON_MODIFICHE: 'DVR Aggiornamento (con modifiche)',
    DVR_AGGIORNAMENTO_SENZA_MODIFICHE: 'DVR Aggiornamento (senza modifiche)',
    NOMINA_MC: 'Nomina Medico Competente',
    NOMINA_RSPP: 'Nomina RSPP',
    GIUDIZIO_IDONEITA: 'Giudizio Idoneità',
    ALLEGATO_3B: 'Allegato 3B',
    CORSO_FORMAZIONE: 'Corso di Formazione',
    DOCENZA: 'Docenza',
    ATTESTATO: 'Attestato',
    BUNDLE: 'Bundle/Pacchetto',
    CONVENZIONE: 'Convenzione',
    CONSULENZA: 'Consulenza',
    SPESA_FISSA: 'Spesa Fissa',
    SPESA_RICORRENTE: 'Spesa Ricorrente',
    RIMBORSO: 'Rimborso',
    COMPENSO_FORMATORE: 'Compenso Formatore',
};

const TIPO_SOGGETTO_LABELS: Record<string, string> = {
    PAZIENTE: 'Paziente',
    AZIENDA: 'Azienda',
    MEDICO_COLLABORATORE: 'Medico Collaboratore',
    FORNITORE: 'Fornitore',
    SEDE: 'Sede',
};

const STATO_LABELS: Record<string, string> = {
    BOZZA: 'Bozza',
    DA_FATTURARE: 'Da Fatturare',
    CONFERMATO: 'Confermato',
    FATTURATO: 'Fatturato',
    PAGATO: 'Pagato',
    SCADUTO: 'Scaduto',
    ANNULLATO: 'Annullato',
    STORNATO: 'Stornato',
};

// ============================================
// MAIN COMPONENT
// ============================================

const MovimentoContabileDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const { confirm } = useConfirmDialog();

    // Queries and Mutations
    const { data: movimento, isLoading, error } = useMovimentoContabile(id);
    const deleteMutation = useDeleteMovimento();
    const paymentMutation = useMarkAsPaid();

    // Handlers
    const handleEdit = () => {
        navigate(`/management/movimenti-contabili/${id}/modifica`);
    };

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: 'Elimina Movimento',
            message: 'Sei sicuro di voler eliminare questo movimento? L\'operazione non può essere annullata.',
            confirmLabel: 'Elimina',
            cancelLabel: 'Annulla',
            variant: 'danger',
        });

        if (confirmed && id) {
            try {
                await deleteMutation.mutateAsync({
                    id,
                    deletionReason: 'Eliminazione manuale dall\'interfaccia dettaglio',
                });
                showToast({ message: 'Movimento eliminato con successo', type: 'success' });
                navigate('/management/movimenti-contabili');
            } catch (error) {
                showToast({ message: 'Errore durante l\'eliminazione', type: 'error' });
            }
        }
    };

    const handleRecordPayment = async () => {
        if (!movimento || !id) return;

        const confirmed = await confirm({
            title: 'Registra Pagamento',
            message: `Vuoi registrare il pagamento di ${formatCurrency(movimento.importoLordo)} per questo movimento?`,
            confirmLabel: 'Registra Pagamento',
            cancelLabel: 'Annulla',
        });

        if (confirmed) {
            try {
                await paymentMutation.mutateAsync({
                    id,
                    dataPagamento: new Date().toISOString().split('T')[0],
                    metodoPagamento: 'BONIFICO',
                });
                showToast({ message: 'Pagamento registrato con successo', type: 'success' });
            } catch (error) {
                showToast({ message: 'Errore nella registrazione del pagamento', type: 'error' });
            }
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    // Error state
    if (error || !movimento) {
        return (
            <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Movimento non trovato</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Il movimento richiesto non esiste o è stato eliminato.
                </p>
                <Button onClick={() => navigate('/management/movimenti-contabili')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Torna alla lista
                </Button>
            </div>
        );
    }

    // Check if payment can be recorded
    const canRecordPayment = movimento.stato !== 'PAGATO' &&
        movimento.stato !== 'ANNULLATO' &&
        movimento.stato !== 'SCADUTO';

    const isEntrata = movimento.direzione === 'ENTRATA';
    const statoConf = STATO_CONFIG[movimento.stato];

    return (
        <div className="space-y-6">
            {/* Breadcrumb + back */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/management/movimenti-contabili')}>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Movimenti Contabili
                </Button>
                <span className="text-gray-400">/</span>
                <span className="text-sm text-gray-500 font-mono">{movimento.id.substring(0, 8).toUpperCase()}</span>
            </div>

            {/* Hero Header Card */}
            <div className={`rounded-2xl p-6 text-white shadow-lg ${isEntrata
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                : 'bg-gradient-to-br from-rose-500 to-pink-600'
                }`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                            {isEntrata
                                ? <TrendingUp className="w-7 h-7" />
                                : <TrendingDown className="w-7 h-7" />
                            }
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statoConf?.badgeClass ?? 'bg-white/20 text-white'}`}>
                                    {getStatoIcon(movimento.stato)}
                                    {STATO_LABELS[movimento.stato] || movimento.stato}
                                </span>
                                <span className="text-white/70 text-xs">
                                    {movimento.branch_type === 'MEDICA' ? '🏥 Clinica' : '📚 Formazione'}
                                </span>
                            </div>
                            <h1 className="text-2xl font-bold">
                                {TIPO_LABELS[movimento.tipo] || movimento.tipo}
                            </h1>
                            {movimento.descrizione && (
                                <p className="text-white/80 text-sm mt-1">{movimento.descrizione}</p>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-white/70 text-sm">{isEntrata ? 'Ricavo' : 'Costo'}</p>
                        <p className="text-4xl font-black">
                            {isEntrata ? '+' : '-'}{formatCurrency(movimento.importoLordo)}
                        </p>
                        <p className="text-white/70 text-sm mt-1">
                            Imponibile {formatCurrency(movimento.importoNetto)} · IVA {movimento.aliquotaIva}%
                        </p>
                    </div>
                </div>

                {/* Action bar */}
                <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-white/20">
                    {canRecordPayment && (
                        <button
                            onClick={handleRecordPayment}
                            disabled={paymentMutation.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-gray-800 text-sm font-medium hover:bg-white/90 disabled:opacity-60 transition"
                        >
                            <CreditCard className="w-4 h-4" />
                            Registra Pagamento
                        </button>
                    )}
                    <button
                        onClick={handleEdit}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/20 text-white text-sm font-medium hover:bg-white/30 transition"
                    >
                        <Edit className="w-4 h-4" />
                        Modifica
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 disabled:opacity-60 transition"
                    >
                        <Trash2 className="w-4 h-4" />
                        Elimina
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Importi */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Euro className="w-5 h-5 mr-2 text-green-600" />
                            Dettaglio Importi
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Direzione */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Direzione</p>
                                <Badge variant={getDirezioneBadgeColor(movimento.direzione)} className="mt-1">
                                    {getDirezioneLabel(movimento.direzione)}
                                </Badge>
                            </div>

                            {/* Importo Lordo */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Importo Lordo</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    {formatCurrency(movimento.importoLordo)}
                                </p>
                            </div>

                            {/* IVA */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    IVA ({movimento.aliquotaIva}%)
                                </p>
                                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                    {formatCurrency(movimento.importoIva)}
                                </p>
                            </div>

                            {/* Importo Netto */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Imponibile</p>
                                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                    {formatCurrency(movimento.importoNetto)}
                                </p>
                            </div>
                        </div>

                        {/* Pagamento info */}
                        {movimento.stato === 'PAGATO' && movimento.dataPagamento && (
                            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center text-green-700">
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    <span className="font-medium">
                                        Pagato il {formatDate(movimento.dataPagamento)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right Column - Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                            Date
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Data Esecuzione</p>
                            <p className="font-medium">
                                {formatDate(movimento.dataEsecuzione)}
                            </p>
                        </div>

                        {movimento.dataScadenza && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Data Scadenza</p>
                                <p className="font-medium">
                                    {formatDate(movimento.dataScadenza)}
                                </p>
                            </div>
                        )}

                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Creato il</p>
                            <p className="font-medium">
                                {formatDate(movimento.createdAt)}
                            </p>
                        </div>

                        {movimento.updatedAt !== movimento.createdAt && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Ultimo aggiornamento</p>
                                <p className="font-medium">
                                    {formatDate(movimento.updatedAt)}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Classificazione */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-teal-600" />
                        Classificazione
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Tipo Attività</p>
                            <p className="font-medium">{TIPO_LABELS[movimento.tipo] || movimento.tipo}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Tipo Soggetto</p>
                            <p className="font-medium">
                                {TIPO_SOGGETTO_LABELS[movimento.tipoSoggetto] || movimento.tipoSoggetto}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Branch</p>
                            <p className="font-medium">
                                {movimento.branch_type === 'MEDICA' ? 'Clinica' : 'Formazione'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Stato</p>
                            <Badge variant={getStatoBadgeColor(movimento.stato)}>
                                {STATO_LABELS[movimento.stato]}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Soggetto Collegato */}
            {(movimento.personId || movimento.companyTenantProfileId) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            {movimento.companyTenantProfileId ? (
                                <Building2 className="w-5 h-5 mr-2 text-violet-600" />
                            ) : (
                                <User className="w-5 h-5 mr-2 text-violet-600" />
                            )}
                            Soggetto Collegato
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {movimento.personId && (
                            <Link
                                to={`/poliambulatorio/pazienti/${movimento.personId}`}
                                className="flex items-center gap-3 p-3 rounded-xl border border-violet-100 bg-violet-50 hover:bg-violet-100 transition"
                            >
                                <div className="w-9 h-9 rounded-full bg-violet-200 flex items-center justify-center">
                                    <User className="w-4 h-4 text-violet-700" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-violet-800 text-sm">
                                        {movimento.person
                                            ? `${movimento.person.firstName} ${movimento.person.lastName}`
                                            : 'Visualizza Paziente'
                                        }
                                    </p>
                                    <p className="text-xs text-violet-600">{TIPO_SOGGETTO_LABELS[movimento.tipoSoggetto]}</p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-violet-500 flex-shrink-0" />
                            </Link>
                        )}
                        {movimento.companyTenantProfileId && (
                            <Link
                                to={`/aziende/${movimento.companyTenantProfileId}`}
                                className="flex items-center gap-3 p-3 rounded-xl border border-violet-100 bg-violet-50 hover:bg-violet-100 transition"
                            >
                                <div className="w-9 h-9 rounded-full bg-violet-200 flex items-center justify-center">
                                    <Building2 className="w-4 h-4 text-violet-700" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-violet-800 text-sm">
                                        {(movimento as any).companyTenantProfile?.company?.ragioneSociale
                                            || (movimento as any).controparteCollegata?.companyTenantProfile?.company?.ragioneSociale
                                            || 'Visualizza Azienda'
                                        }
                                    </p>
                                    <p className="text-xs text-violet-600">{TIPO_SOGGETTO_LABELS[movimento.tipoSoggetto]}</p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-violet-500 flex-shrink-0" />
                            </Link>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Compenso (se presente) */}
            {movimento.compensoTipo && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Euro className="w-5 h-5 mr-2 text-purple-600" />
                            Compenso Professionista
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tipo Compenso</p>
                                <p className="font-medium">{({ 'PERCENTUALE_VISITA': 'Percentuale per Visita', 'FISSO_VISITA': 'Fisso per Visita', 'FISSO_MENSILE': 'Fisso Mensile', 'PERCENTUALE_FATTURATO': 'Percentuale Fatturato' } as Record<string, string>)[movimento.compensoTipo!] || movimento.compensoTipo!.replace(/_/g, ' ')}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Valore</p>
                                <p className="font-medium">
                                    {movimento.compensoTipo?.includes('PERCENTUALE')
                                        ? `${movimento.compensoValore}%`
                                        : formatCurrency(movimento.compensoValore || 0)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Descrizione e Note */}
            {(movimento.descrizione || movimento.note) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Descrizione e Note</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {movimento.descrizione && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Descrizione</p>
                                <p className="text-gray-900 dark:text-gray-100">{movimento.descrizione}</p>
                            </div>
                        )}
                        {movimento.note && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Note Interne</p>
                                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{movimento.note}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default MovimentoContabileDetails;
