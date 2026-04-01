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

const getStatoBadgeColor = (stato: StatoMovimento): 'default' | 'success' | 'warning' | 'destructive' | 'secondary' => {
    const colors: Record<StatoMovimento, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
        BOZZA: 'secondary',
        CONFERMATO: 'default',
        FATTURATO: 'warning',
        PAGATO: 'success',
        SCADUTO: 'destructive',
        ANNULLATO: 'destructive',
    };
    return colors[stato] || 'default';
};

const getStatoIcon = (stato: StatoMovimento) => {
    const icons: Record<StatoMovimento, React.ReactNode> = {
        BOZZA: <Clock className="w-4 h-4" />,
        CONFERMATO: <CheckCircle className="w-4 h-4" />,
        FATTURATO: <Receipt className="w-4 h-4" />,
        PAGATO: <CheckCircle className="w-4 h-4 text-green-500" />,
        SCADUTO: <AlertTriangle className="w-4 h-4 text-red-500" />,
        ANNULLATO: <XCircle className="w-4 h-4" />,
    };
    return icons[stato];
};

const getDirezioneLabel = (direzione: DirezioneMovimento) => {
    return direzione === 'ENTRATA' ? 'Ricavo' : 'Costo';
};

const getDirezioneBadgeColor = (direzione: DirezioneMovimento): 'success' | 'destructive' => {
    return direzione === 'ENTRATA' ? 'success' : 'destructive';
};

const TIPO_LABELS: Record<string, string> = {
    VISITA_MEDICA: 'Visita Medica',
    VISITA_SPECIALISTICA: 'Visita Specialistica',
    ESAME_DIAGNOSTICO: 'Esame Diagnostico',
    GIUDIZIO_IDONEITA: 'Giudizio Idoneità',
    ALLEGATO_3B: 'Allegato 3B',
    DVR: 'DVR',
    SOPRALLUOGO: 'Sopralluogo',
    NOMINA_RUOLO: 'Nomina Ruolo',
    CORSO_FORMAZIONE: 'Corso Formazione',
    CORSO_AGGIORNAMENTO: 'Corso Aggiornamento',
    BUNDLE_PACCHETTO: 'Bundle/Pacchetto',
    PREVENTIVO: 'Preventivo',
    CONSULENZA: 'Consulenza',
    ALTRO: 'Altro',
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
    CONFERMATO: 'Confermato',
    FATTURATO: 'Fatturato',
    PAGATO: 'Pagato',
    SCADUTO: 'Scaduto',
    ANNULLATO: 'Annullato',
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" onClick={() => navigate('/management/movimenti-contabili')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Indietro
                    </Button>
                    <div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                Movimento #{movimento.id.substring(0, 8)}
                            </h1>
                            <Badge variant={getStatoBadgeColor(movimento.stato)}>
                                {getStatoIcon(movimento.stato)}
                                <span className="ml-1">{STATO_LABELS[movimento.stato]}</span>
                            </Badge>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            {TIPO_LABELS[movimento.tipo] || movimento.tipo} •
                            {movimento.branch_type === 'MEDICA' ? ' Clinica' : ' Formazione'}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                    {canRecordPayment && (
                        <Button
                            variant="outline"
                            onClick={handleRecordPayment}
                            disabled={paymentMutation.isPending}
                        >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Registra Pagamento
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleEdit}>
                        <Edit className="w-4 h-4 mr-2" />
                        Modifica
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Elimina
                    </Button>
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
                    <CardContent>
                        {movimento.personId && (
                            <Link
                                to={`/pazienti/${movimento.personId}`}
                                className="flex items-center text-teal-600 hover:text-teal-700"
                            >
                                <User className="w-4 h-4 mr-2" />
                                Visualizza Paziente
                                <ExternalLink className="w-3 h-3 ml-1" />
                            </Link>
                        )}
                        {movimento.companyTenantProfileId && (
                            <Link
                                to={`/aziende/${movimento.companyTenantProfileId}`}
                                className="flex items-center text-teal-600 hover:text-teal-700"
                            >
                                <Building2 className="w-4 h-4 mr-2" />
                                Visualizza Azienda
                                <ExternalLink className="w-3 h-3 ml-1" />
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
                                <p className="font-medium">{movimento.compensoTipo.replace(/_/g, ' ')}</p>
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
