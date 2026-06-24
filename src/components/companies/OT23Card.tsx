/**
 * OT23Card - Card dedicata per gestione OT23 (Modello riduzione tasso INAIL)
 * 
 * Visualizza lo storico delle domande OT23 per un'azienda specifica con:
 * - Storico annuale domande
 * - Calcolo risparmio stimato INAIL
 * - Quick actions per generazione costi
 * - Download XML per invio INAIL
 * 
 * @module components/companies/OT23Card
 * @project P44 Enhancement - OT23 Integration in CompanyDetails
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    Shield,
    Download,
    Plus,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Send,
    Calendar,
    Euro,
    FileCode,
    Eye,
    Loader2,
    ExternalLink,
    Calculator,
    TrendingDown,
    Building2
} from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';
import { Badge } from '../../design-system/atoms/Badge';
import { useToast } from '../../hooks/useToast';
import {
    ot23Api,
    type OT23,
    type StatoOT23,
    getOT23StatoColor,
    getOT23StatoLabel
} from '../../services/sicurezzaApi';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../design-system/utils';
import { useBranchContextOptional } from '../../contexts/BranchContext';
import OT23CreateModal from '../../pages/sicurezza/components/OT23CreateModal';

interface OT23CardProps {
    companyTenantProfileId: string;
    companyName: string;
    employeeCount?: number;
    onActionComplete?: () => void;
}

// Mapping colori/icone per stato
const STATO_CONFIG: Record<StatoOT23, { icon: React.ReactNode; color: string; bgColor: string }> = {
    BOZZA: {
        icon: <Clock className="h-4 w-4" />,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100'
    },
    PRONTO: {
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
    },
    INVIATO: {
        icon: <Send className="h-4 w-4" />,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100'
    },
    IN_VALUTAZIONE: {
        icon: <Clock className="h-4 w-4" />,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100'
    },
    APPROVATO: {
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
    },
    RESPINTO: {
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-red-600',
        bgColor: 'bg-red-100'
    },
    INTEGRAZIONI_RICHIESTE: {
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
    },
    SCADUTO: {
        icon: <Clock className="h-4 w-4" />,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100'
    }
};

const OT23Card: React.FC<OT23CardProps> = ({
    companyTenantProfileId,
    companyName,
    employeeCount = 0,
    onActionComplete
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const branchContext = useBranchContextOptional();
    // La pagina OT23 deve restare nel branch da cui è aperta (rispetto provenienza, regola #36):
    // - branch MEDICA (dominio elementmedica) → route OT23 sotto /poliambulatorio (layout teal)
    // - branch FORMAZIONE/sicurezza → route OT23 standalone (layout sicurezza)
    // Si usa il branch corrente come segnale primario, con fallback sul path per sicurezza.
    const isMedicaContext = branchContext
        ? branchContext.currentBranch === 'MEDICA'
        : location.pathname.startsWith('/poliambulatorio');
    const ot23BasePath = isMedicaContext
        ? '/poliambulatorio/sicurezza/ot23'
        : '/sicurezza/ot23';

    const [domande, setDomande] = useState<OT23[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [calculatingRisparmio, setCalculatingRisparmio] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [risparmioStimato, setRisparmioStimato] = useState<{
        percentualeRiduzione: number;
        risparmioAnnuale: number;
        fasciaAzienda: string;
    } | null>(null);

    const currentYear = new Date().getFullYear();

    // Fetch domande OT23
    useEffect(() => {
        const fetchDomande = async () => {
            try {
                setLoading(true);
                const response = await ot23Api.getAll({ companyTenantProfileId });
                // Ordina per anno decrescente
                const sorted = (response.data || []).sort((a, b) => b.anno - a.anno);
                setDomande(sorted);
            } catch (error) {
                setDomande([]);
            } finally {
                setLoading(false);
            }
        };

        if (companyTenantProfileId) {
            fetchDomande();
        }
    }, [companyTenantProfileId]);

    // Controlla se esiste domanda per anno corrente
    const domandaAnnoCorrente = domande.find(d => d.anno === currentYear);
    const hasDomandaAnnoCorrente = !!domandaAnnoCorrente;

    // Calcola risparmio totale approvato
    const totaleRisparmioApprovato = domande
        .filter(d => d.stato === 'APPROVATO')
        .reduce((acc, d) => acc + (d.risparmioStimato || 0), 0);

    // Download XML
    const handleDownloadXml = async (id: string, anno: number) => {
        try {
            setDownloadingId(id);
            await ot23Api.downloadXml(id, `OT23_${companyName.replace(/\s+/g, '_')}_${anno}.xml`);
            showToast({ message: 'XML scaricato con successo', type: 'success' });
        } catch (error) {
            showToast({ message: 'Errore nel download dell\'XML', type: 'error' });
        } finally {
            setDownloadingId(null);
        }
    };

    // Calcola risparmio stimato (quick action)
    const handleCalcolaRisparmio = async () => {
        if (!domandaAnnoCorrente?.premioAnnuale) {
            showToast({
                message: 'Inserisci il premio annuale INAIL nella domanda per calcolare il risparmio',
                type: 'warning'
            });
            return;
        }

        try {
            setCalculatingRisparmio(true);
            const result = await ot23Api.calcolaRisparmio(
                domandaAnnoCorrente.premioAnnuale,
                employeeCount
            );
            setRisparmioStimato(result);
            showToast({ message: 'Calcolo risparmio completato', type: 'success' });
        } catch (error) {
            showToast({ message: 'Errore nel calcolo del risparmio', type: 'error' });
        } finally {
            setCalculatingRisparmio(false);
        }
    };

    // Navigazione a pagina dettaglio OT23 (context-aware: medica vs sicurezza layout)
    const handleViewDetails = (id: string) => {
        navigate(`${ot23BasePath}/${id}`);
    };

    // Crea nuova domanda per anno corrente
    const handleCreateNew = () => {
        setCreateModalOpen(true);
    };

    // Rendering stato badge
    const renderStatoBadge = (stato: StatoOT23) => {
        const config = STATO_CONFIG[stato];
        return (
            <span className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                config.bgColor,
                config.color
            )}>
                {config.icon}
                {getOT23StatoLabel(stato)}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm dark:shadow-black/30 p-6">
                <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
            </div>
        );
    }

    return (
        <>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm dark:shadow-black/30 overflow-hidden">
            {/* Header */}
            <div
                className="px-6 py-4 bg-gradient-to-r from-blue-50 dark:from-blue-900/30 to-white dark:to-gray-800 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-blue-50/80 dark:hover:bg-blue-900/40 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                                OT23 - Riduzione Tasso INAIL
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Modello riduzione tasso medio per prevenzione
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Badge anno corrente */}
                        {hasDomandaAnnoCorrente ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                                {currentYear}: {getOT23StatoLabel(domandaAnnoCorrente.stato)}
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                                {currentYear}: Non presentata
                            </Badge>
                        )}
                        {totaleRisparmioApprovato > 0 && (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                {formatCurrency(totaleRisparmioApprovato)} risparmiati
                            </Badge>
                        )}
                        <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {domande.length} {domande.length === 1 ? 'domanda' : 'domande'}
                        </Badge>
                        {expanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                    </div>
                </div>
            </div>

            {/* Content - Expanded */}
            {expanded && (
                <div className="p-6 space-y-4">
                    {/* Quick Stats - Domanda anno corrente */}
                    {domandaAnnoCorrente && (
                        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
                                    <Calendar className="h-4 w-4" />
                                    <span className="text-xs">Anno</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-gray-50">
                                    {domandaAnnoCorrente.anno}
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
                                    <Shield className="h-4 w-4" />
                                    <span className="text-xs">Punti Totali</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-gray-50">
                                    {domandaAnnoCorrente.punteggioTotale || 0}
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
                                    <TrendingDown className="h-4 w-4" />
                                    <span className="text-xs">Riduzione</span>
                                </div>
                                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                    {domandaAnnoCorrente.percentualeRiduzione || 0}%
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
                                    <Euro className="h-4 w-4" />
                                    <span className="text-xs">Risparmio</span>
                                </div>
                                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                    {formatCurrency(domandaAnnoCorrente.risparmioStimato || 0)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Quick Action - Calcola Risparmio */}
                    {hasDomandaAnnoCorrente && domandaAnnoCorrente.premioAnnuale && (
                        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-3">
                                <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <div>
                                    <p className="font-medium text-blue-900 dark:text-blue-100">Calcola Risparmio INAIL</p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        Premio annuale: {formatCurrency(domandaAnnoCorrente.premioAnnuale)} • {employeeCount} dipendenti
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCalcolaRisparmio();
                                }}
                                disabled={calculatingRisparmio}
                            >
                                {calculatingRisparmio ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Calculator className="h-4 w-4 mr-2" />
                                )}
                                Calcola
                            </Button>
                        </div>
                    )}

                    {/* Risultato calcolo risparmio */}
                    {risparmioStimato && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-green-900 dark:text-green-100">Risparmio Stimato</p>
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        Fascia: {risparmioStimato.fasciaAzienda} •
                                        Riduzione: {risparmioStimato.percentualeRiduzione}%
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                                        {formatCurrency(risparmioStimato.risparmioAnnuale)}
                                    </p>
                                    <p className="text-xs text-green-600 dark:text-green-400">all'anno</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Lista domande storiche */}
                    {domande.length > 0 ? (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Storico Domande OT23</h4>
                            {domande.slice(0, 5).map((domanda) => (
                                <div
                                    key={domanda.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                            <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-50">
                                                OT23 - Anno {domanda.anno}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {domanda.haRequisitiBeneficio
                                                    ? `${domanda.punteggioTotale} punti • ${domanda.percentualeRiduzione}% riduzione`
                                                    : 'Requisiti non raggiunti'
                                                }
                                                {domanda.dataInvio && ` • Inviato: ${formatDate(domanda.dataInvio)}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {renderStatoBadge(domanda.stato)}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewDetails(domanda.id);
                                            }}
                                            title="Visualizza dettagli"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        {(domanda.stato === 'PRONTO' || domanda.stato === 'INVIATO' || domanda.stato === 'APPROVATO') && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadXml(domanda.id, domanda.anno);
                                                }}
                                                disabled={downloadingId === domanda.id}
                                                title="Scarica XML INAIL"
                                            >
                                                {downloadingId === domanda.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <FileCode className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {domande.length > 5 && (
                                <Link
                                    to={`${ot23BasePath}?companyId=${companyTenantProfileId}`}
                                    className="flex items-center justify-center gap-1 p-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                >
                                    Visualizza tutte ({domande.length})
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>Nessuna domanda OT23 presente per questa azienda</p>
                            <p className="text-sm mt-1">Crea la prima domanda per richiedere la riduzione del tasso INAIL</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Link
                            to={`${ot23BasePath}?companyId=${companyTenantProfileId}`}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                        >
                            Gestisci tutte le domande
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Link>

                        {!hasDomandaAnnoCorrente && (
                            <Button
                                onClick={handleCreateNew}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Crea OT23 {currentYear}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
        {createModalOpen && (
            <OT23CreateModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSuccess={() => {
                    setCreateModalOpen(false);
                    onActionComplete?.();
                }}
                defaultAnno={currentYear}
                preselectedCompanyProfileId={companyTenantProfileId}
            />
        )}
        </>
    );
};

export default OT23Card;
