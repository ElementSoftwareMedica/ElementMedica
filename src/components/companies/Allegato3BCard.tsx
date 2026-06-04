/**
 * Allegato3BCard - Card dedicata per visualizzazione e gestione Allegato 3B
 * 
 * Visualizza lo storico degli Allegati 3B (Relazione Annuale INAIL Art. 40 D.Lgs 81/08)
 * per un'azienda specifica con possibilità di:
 * - Visualizzare lo storico annuale
 * - Creare nuova relazione per l'anno corrente
 * - Compilare automaticamente le statistiche
 * - Generare XML per invio INAIL
 * 
 * @module components/companies/Allegato3BCard
 * @project P60 - MDL Allegato 3B Integration
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    FileText,
    Plus,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Send,
    Calendar,
    Users,
    Activity,
    FileCode,
    Eye,
    Loader2,
    ExternalLink,
    Play,
    RefreshCw,
    Trash2,
    X
} from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';
import { Badge } from '../../design-system/atoms/Badge';
import { useToast } from '../../hooks/useToast';
import { allegato3BApi, clinicaApi, type Allegato3B, type NominaRuolo } from '../../services/clinicaApi';
import { formatDate } from '../../utils/dateUtils';
import { cn } from '../../design-system/utils';

// Tipi di stato invio
type StatoInvio = 'DA_COMPILARE' | 'BOZZA' | 'COMPILATO' | 'PRONTO' | 'INVIATO' | 'CONFERMATO' | 'ERRORE';

interface Allegato3BCardProps {
    companyTenantProfileId: string;
    companyName: string;
    onActionComplete?: () => void;
}

// Mapping colori/icone per stato
const STATO_CONFIG: Record<StatoInvio, { icon: React.ReactNode; color: string; label: string; bgColor: string }> = {
    DA_COMPILARE: {
        icon: <Clock className="h-4 w-4" />,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        label: 'Da compilare'
    },
    BOZZA: {
        icon: <FileText className="h-4 w-4" />,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        label: 'Bozza'
    },
    COMPILATO: {
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        label: 'Compilato'
    },
    PRONTO: {
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: 'Pronto per invio'
    },
    INVIATO: {
        icon: <Send className="h-4 w-4" />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        label: 'Inviato'
    },
    CONFERMATO: {
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: 'Confermato'
    },
    ERRORE: {
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        label: 'Errore'
    }
};

const Allegato3BCard: React.FC<Allegato3BCardProps> = ({
    companyTenantProfileId,
    companyName,
    onActionComplete
}) => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [allegati, setAllegati] = useState<Allegato3B[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [compilingId, setCompilingId] = useState<string | null>(null);
    const [creatingNew, setCreatingNew] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const currentYear = new Date().getFullYear();

    // P44: Calcolo scadenza annuale (31 marzo)
    const getScadenzaInfo = () => {
        const oggi = new Date();
        const annoScadenza = oggi.getMonth() < 2 ? currentYear : currentYear + 1; // Gennaio-Marzo → scadenza quest'anno
        const scadenza = new Date(annoScadenza, 2, 31); // 31 marzo
        const giorniMancanti = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));

        return {
            data: scadenza,
            giorniMancanti,
            annoRiferimento: annoScadenza - 1, // L'allegato è per l'anno precedente alla scadenza
            isUrgente: giorniMancanti <= 30 && giorniMancanti > 0,
            isImminente: giorniMancanti <= 7 && giorniMancanti > 0,
            isScaduto: giorniMancanti < 0
        };
    };

    const scadenzaInfo = getScadenzaInfo();

    // Fetch allegati
    useEffect(() => {
        const fetchAllegati = async () => {
            try {
                setLoading(true);
                const data = await allegato3BApi.getAll({ companyTenantProfileId });
                // Ordina per anno decrescente
                const sorted = (data || []).sort((a, b) => b.anno - a.anno);
                setAllegati(sorted);
            } catch (error) {
                setAllegati([]);
            } finally {
                setLoading(false);
            }
        };

        if (companyTenantProfileId) {
            fetchAllegati();
        }
    }, [companyTenantProfileId]);

    // Controlla se esiste allegato per anno corrente
    const allegatoAnnoCorrente = allegati.find(a => a.anno === currentYear);
    const hasAllegatoAnnoCorrente = !!allegatoAnnoCorrente;

    // Download XML
    const handleDownloadXml = async (allegatoId: string, anno: number) => {
        try {
            setDownloadingId(allegatoId);
            const result = await allegato3BApi.getXml(allegatoId);
            if (result?.blob) {
                // Crea blob e scarica
                const url = window.URL.createObjectURL(result.blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = result.filename || `allegato3b_${anno}.xml`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showToast({ message: 'XML scaricato con successo', type: 'success' });
            }
        } catch (error) {
            showToast({ message: 'Errore nel download dell\'XML', type: 'error' });
        } finally {
            setDownloadingId(null);
        }
    };

    // Navigazione a pagina dettaglio allegato 3B
    const handleViewDetails = (allegatoId: string) => {
        navigate(`/poliambulatorio/mdl/allegato-3b?id=${allegatoId}`);
    };

    // Crea nuovo allegato per anno corrente — inline, senza navigazione
    const handleCreateNew = async () => {
        try {
            setCreatingNew(true);
            // Fetch MC nomination per questa azienda
            const nomine = await clinicaApi.nomineRuolo.getByCompany(companyTenantProfileId);
            const list = Array.isArray(nomine) ? nomine : (nomine as any)?.data ?? [];
            const mcNomina: NominaRuolo | undefined = list.find((n: NominaRuolo) =>
                (n.tipoRuolo as string) === 'MEDICO_COMPETENTE' && n.stato === 'ATTIVA' && !n.deletedAt
            ) ?? list.find((n: NominaRuolo) =>
                (n.tipoRuolo as string) === 'MEDICO_COMPETENTE' && n.stato === 'SOSPESA' && !n.deletedAt
            );
            if (!mcNomina?.personId) {
                showToast({ message: 'Nessun Medico Competente nominato per questa azienda. Nominare prima un MC.', type: 'error' });
                return;
            }
            const annoRiferimento = scadenzaInfo.annoRiferimento;
            const result = await clinicaApi.allegato3B.create({
                anno: annoRiferimento,
                companyTenantProfileId,
                medicoCompetenteId: mcNomina.personId
            });
            showToast({ message: `Allegato 3B ${annoRiferimento} creato e compilato con successo`, type: 'success' });
            // Aggiorna lista allegati inline
            if (result) {
                setAllegati(prev => {
                    const updated = [result, ...prev.filter(a => a.id !== result.id)];
                    return updated.sort((a, b) => b.anno - a.anno);
                });
            }
            setExpanded(true);
            onActionComplete?.();
        } catch (error) {
            showToast({ message: 'Errore nella creazione dell\'Allegato 3B', type: 'error' });
        } finally {
            setCreatingNew(false);
        }
    };

    // Compila allegato direttamente dalla card
    const handleCompile = async (allegatoId: string) => {
        try {
            setCompilingId(allegatoId);
            const result = await clinicaApi.allegato3B.compile(allegatoId);
            showToast({ message: 'Allegato 3B compilato con successo', type: 'success' });
            // Aggiorna lista allegati
            setAllegati(prev => prev.map(a => a.id === allegatoId ? { ...a, ...result } : a));
            onActionComplete?.();
        } catch (error) {
            showToast({ message: 'Errore nella compilazione', type: 'error' });
        } finally {
            setCompilingId(null);
        }
    };

    const handleDelete = async (allegatoId: string) => {
        try {
            setDeletingId(allegatoId);
            await clinicaApi.allegato3B.delete(allegatoId);
            setAllegati(prev => prev.filter(a => a.id !== allegatoId));
            setConfirmDeleteId(null);
            onActionComplete?.();
            showToast({ message: 'Allegato 3B eliminato. Ora può essere rigenerato.', type: 'success' });
        } catch {
            showToast({ message: 'Errore durante l\'eliminazione dell\'Allegato 3B', type: 'error' });
        } finally {
            setDeletingId(null);
        }
    };

    // Rendering stato badge
    const renderStatoBadge = (stato: StatoInvio) => {
        const config = STATO_CONFIG[stato] || STATO_CONFIG.DA_COMPILARE;
        return (
            <span className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                config.bgColor,
                config.color
            )}>
                {config.icon}
                {config.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-600 dark:text-teal-400" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
            {/* Header */}
            <div
                className="px-6 py-4 bg-gradient-to-r from-teal-50 to-white dark:from-teal-900/30 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-teal-50/80 dark:hover:bg-teal-900/40 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                            <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                                Allegato 3B - Relazione Annuale INAIL
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Art. 40 D.Lgs 81/08 - Comunicazione dati sorveglianza sanitaria
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Badge anno corrente */}
                        {hasAllegatoAnnoCorrente ? (
                            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                                {currentYear}: {STATO_CONFIG[allegatoAnnoCorrente.stato as StatoInvio]?.label || 'In corso'}
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                                {currentYear}: Da creare
                            </Badge>
                        )}
                        <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {allegati.length} {allegati.length === 1 ? 'documento' : 'documenti'}
                        </Badge>
                        {expanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        )}
                    </div>
                </div>
            </div>

            {/* Content - Expanded */}
            {expanded && (
                <div className="p-6 space-y-4">
                    {/* P44: Warning Scadenza - 31 marzo */}
                    {(scadenzaInfo.isUrgente || scadenzaInfo.isImminente) && !hasAllegatoAnnoCorrente && (
                        <div className={cn(
                            'flex items-center gap-3 p-4 rounded-lg border',
                            scadenzaInfo.isImminente
                                ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                                : 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800'
                        )}>
                            <AlertTriangle className={cn(
                                'h-5 w-5 flex-shrink-0',
                                scadenzaInfo.isImminente ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                            )} />
                            <div className="flex-1">
                                <p className={cn(
                                    'font-medium',
                                    scadenzaInfo.isImminente ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'
                                )}>
                                    {scadenzaInfo.isImminente
                                        ? `⚠️ Scadenza imminente: ${scadenzaInfo.giorniMancanti} giorni!`
                                        : `Scadenza tra ${scadenzaInfo.giorniMancanti} giorni`
                                    }
                                </p>
                                <p className={cn(
                                    'text-sm',
                                    scadenzaInfo.isImminente ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                                )}>
                                    L'Allegato 3B per l'anno {scadenzaInfo.annoRiferimento} deve essere inviato entro il 31 marzo {scadenzaInfo.data.getFullYear()}.
                                    {!hasAllegatoAnnoCorrente && ' Crea la relazione per non perdere la scadenza.'}
                                </p>
                            </div>
                            {!hasAllegatoAnnoCorrente && (
                                <Button
                                    size="sm"
                                    onClick={handleCreateNew}
                                    disabled={creatingNew}
                                    className={cn(
                                        'text-white',
                                        scadenzaInfo.isImminente
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-amber-600 hover:bg-amber-700'
                                    )}
                                >
                                    {creatingNew ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                                    Crea ora
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Scadenza passata senza allegato inviato */}
                    {scadenzaInfo.isScaduto && !hasAllegatoAnnoCorrente && (
                        <div className="flex items-center gap-3 p-4 rounded-lg border bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-700 dark:text-red-400" />
                            <div className="flex-1">
                                <p className="font-medium text-red-900 dark:text-red-300">
                                    ⛔ Scadenza superata
                                </p>
                                <p className="text-sm text-red-800 dark:text-red-400">
                                    La scadenza del 31 marzo {currentYear} per l'Allegato 3B anno {currentYear - 1} è stata superata.
                                    Contatta INAIL per eventuali sanzioni e regolarizzazione.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Quick Stats */}
                    {allegatoAnnoCorrente && (
                        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
                                    <Users className="h-4 w-4" />
                                    <span className="text-xs">Lavoratori</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-gray-50">
                                    {allegatoAnnoCorrente.totLavoratoriSorvegliati || 0}
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
                                    <Activity className="h-4 w-4" />
                                    <span className="text-xs">Visite</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-gray-50">
                                    {allegatoAnnoCorrente.totVisiteEffettuate || 0}
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="text-xs">Idonei</span>
                                </div>
                                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                    {allegatoAnnoCorrente.totGiudiziIdoneita || 0}
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-xs">Con limitazioni</span>
                                </div>
                                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                    {allegatoAnnoCorrente.totGiudiziConLimitazioni || 0}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Lista allegati storici */}
                    {allegati.length > 0 ? (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Storico Relazioni Annuali</h4>
                            {allegati.slice(0, 5).map((allegato) => (
                                <div
                                    key={allegato.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                                            <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-50">
                                                Allegato 3B - Anno {allegato.anno}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {allegato.dataCompilazione
                                                    ? `Compilato: ${formatDate(allegato.dataCompilazione)}`
                                                    : 'Non ancora compilato'}
                                                {allegato.dataInvio && ` • Inviato: ${formatDate(allegato.dataInvio)}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {renderStatoBadge(allegato.stato as StatoInvio)}
                                        {(allegato.stato === 'DA_COMPILARE' || allegato.stato === 'BOZZA') && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCompile(allegato.id);
                                                }}
                                                disabled={compilingId === allegato.id}
                                                title="Compila dati automaticamente"
                                                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                            >
                                                {compilingId === allegato.id ? (
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Play className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewDetails(allegato.id);
                                            }}
                                            title="Visualizza dettagli"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        {(allegato.stato === 'COMPILATO' || allegato.stato === 'PRONTO' || allegato.stato === 'INVIATO' || allegato.stato === 'CONFERMATO') && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadXml(allegato.id, allegato.anno);
                                                }}
                                                disabled={downloadingId === allegato.id}
                                                title="Scarica XML INAIL"
                                            >
                                                {downloadingId === allegato.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <FileCode className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                        {confirmDeleteId === allegato.id ? (
                                            <div className="flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-1.5 py-1 dark:border-red-900/50 dark:bg-red-950/30">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void handleDelete(allegato.id);
                                                    }}
                                                    disabled={deletingId === allegato.id}
                                                    className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-900/40"
                                                >
                                                    {deletingId === allegato.id ? 'Elimino...' : 'Conferma'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmDeleteId(null);
                                                    }}
                                                    className="rounded-md p-1 text-gray-500 hover:bg-white dark:hover:bg-gray-800"
                                                    title="Annulla eliminazione"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            (allegato.stato !== 'INVIATO' && allegato.stato !== 'CONFERMATO') && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmDeleteId(allegato.id);
                                                    }}
                                                    title="Elimina Allegato 3B"
                                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )
                                        )}
                                    </div>
                                </div>
                            ))}

                            {allegati.length > 5 && (
                                <Link
                                    to={`/poliambulatorio/mdl/allegato-3b?companyId=${companyTenantProfileId}`}
                                    className="flex items-center justify-center gap-1 p-2 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-colors"
                                >
                                    Visualizza tutti ({allegati.length})
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>Nessun Allegato 3B presente per questa azienda</p>
                            <p className="text-sm mt-1">Crea la prima relazione annuale per iniziare</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Link
                            to={`/poliambulatorio/mdl/allegato-3b?companyId=${companyTenantProfileId}`}
                            className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1"
                        >
                            Gestisci tutti gli allegati
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Link>

                        {!hasAllegatoAnnoCorrente && (
                            <Button
                                onClick={handleCreateNew}
                                disabled={creatingNew}
                                className="bg-teal-600 hover:bg-teal-700 text-white"
                            >
                                {creatingNew ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                                Crea Allegato {scadenzaInfo.annoRiferimento}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Allegato3BCard;
