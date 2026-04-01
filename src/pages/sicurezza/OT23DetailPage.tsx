/**
 * OT23 Detail Page
 * Dettaglio e gestione interventi domanda OT23
 * 
 * @page OT23DetailPage
 * @project P44 - ElementSicurezza
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Building2,
    Calendar,
    Check,
    ChevronDown,
    ChevronRight,
    Download,
    Edit,
    Euro,
    FileText,
    Hash,
    Info,
    Loader2,
    Plus,
    Send,
    Target,
    Trash2,
    TrendingUp,
    X
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/useToast';
import { useTenantMode } from '@/contexts/TenantModeContext';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

import {
    ot23Api,
    type OT23,
    type OT23Catalogo,
    type OT23CatalogoIntervento,
    type StatoOT23,
    getOT23StatoColor,
    getOT23StatoLabel,
    canEditOT23
} from '@/services/sicurezzaApi';

// =====================================================
// STATO BADGE
// =====================================================

function StatoBadge({ stato }: { stato: StatoOT23 }) {
    const color = getOT23StatoColor(stato);
    const label = getOT23StatoLabel(stato);

    const colorClasses: Record<string, string> = {
        gray: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600',
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700',
        indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700',
        yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
        green: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
        red: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700',
        orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-700'
    };

    return (
        <Badge className={`${colorClasses[color] || colorClasses.gray} text-sm px-3 py-1`}>
            {label}
        </Badge>
    );
}

// =====================================================
// PUNTEGGIO CARD
// =====================================================

interface PunteggioCardProps {
    ot23: OT23;
}

function PunteggioCard({ ot23 }: PunteggioCardProps) {
    const percentuale = Math.min((ot23.punteggioTotale / 100) * 100, 100);
    const raggiuntoTarget = ot23.haRequisitiBeneficio;

    return (
        <Card className={`${raggiuntoTarget ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' : 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'}`}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Target className={`w-5 h-5 ${raggiuntoTarget ? 'text-green-600' : 'text-amber-600'}`} />
                        <span className="font-semibold">Punteggio Totale</span>
                    </div>
                    <span className={`text-3xl font-bold ${raggiuntoTarget ? 'text-green-600' : 'text-amber-600'}`}>
                        {ot23.punteggioTotale}
                        <span className="text-lg text-gray-400">/100</span>
                    </span>
                </div>

                <Progress
                    value={percentuale}
                    className={`h-3 ${raggiuntoTarget ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}
                />

                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                        <span className="text-gray-500">Sezione A:</span>
                        <span className="ml-2 font-medium">{ot23.punteggioSezioneA} punti</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Sezione B:</span>
                        <span className="ml-2 font-medium">{ot23.punteggioSezioneB} punti</span>
                    </div>
                </div>

                {raggiuntoTarget ? (
                    <div className="mt-4 flex items-center gap-2 text-green-700">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">Requisiti per il beneficio raggiunti!</span>
                    </div>
                ) : (
                    <div className="mt-4 text-amber-700 text-sm">
                        <span>Mancano <strong>{100 - ot23.punteggioTotale}</strong> punti per raggiungere il minimo</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// =====================================================
// INTERVENTO ITEM
// =====================================================

interface InterventoItemProps {
    intervento: OT23CatalogoIntervento & { dataAggiunta?: string };
    sezione: 'A' | 'B';
    canEdit: boolean;
    onRemove: () => void;
    isRemoving?: boolean;
}

function InterventoItem({ intervento, sezione, canEdit, onRemove, isRemoving }: InterventoItemProps) {
    return (
        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        {intervento.codice}
                    </Badge>
                    <span className="font-medium">{intervento.descrizione}</span>
                </div>
                {intervento.dataAggiunta && (
                    <p className="text-xs text-gray-400 mt-1">
                        Aggiunto: {formatDate(intervento.dataAggiunta)}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-3">
                <span className="font-bold text-green-600 text-lg">
                    +{intervento.punteggio}
                </span>
                {canEdit && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                        disabled={isRemoving}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        {isRemoving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}

// =====================================================
// INTERVENTI SELECTOR
// =====================================================

interface InterventiSelectorProps {
    sezione: 'A' | 'B';
    catalogo: OT23Catalogo;
    interventiSelezionati: string[];
    onAdd: (intervento: OT23CatalogoIntervento) => void;
    isAdding: boolean;
}

function InterventiSelector({ sezione, catalogo, interventiSelezionati, onAdd, isAdding }: InterventiSelectorProps) {
    const [expanded, setExpanded] = useState<string | null>(null);

    const interventiDisponibili = useMemo(() => {
        if (sezione === 'A') {
            return [{ categoria: 'Partecipazione INAIL', interventi: catalogo.sezioneA }];
        }
        return [
            { categoria: 'Misure Organizzative', interventi: catalogo.sezioneB.organizzative },
            { categoria: 'Misure Tecniche', interventi: catalogo.sezioneB.tecniche },
            { categoria: 'Formazione e Informazione', interventi: catalogo.sezioneB.formazione },
            { categoria: 'Sorveglianza Sanitaria', interventi: catalogo.sezioneB.sorveglianza },
            { categoria: 'Gestione Emergenze', interventi: catalogo.sezioneB.emergenze },
            { categoria: 'Altro', interventi: catalogo.sezioneB.altro }
        ];
    }, [sezione, catalogo]);

    return (
        <div className="space-y-2">
            {interventiDisponibili.map((gruppo) => (
                <div key={gruppo.categoria} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setExpanded(expanded === gruppo.categoria ? null : gruppo.categoria)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <span className="font-medium">{gruppo.categoria}</span>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                                {gruppo.interventi.length} interventi
                            </Badge>
                            {expanded === gruppo.categoria ? (
                                <ChevronDown className="w-4 h-4" />
                            ) : (
                                <ChevronRight className="w-4 h-4" />
                            )}
                        </div>
                    </button>

                    {expanded === gruppo.categoria && (
                        <div className="p-3 space-y-2 bg-white dark:bg-gray-800">
                            {gruppo.interventi.map((intervento) => {
                                const isSelezionato = interventiSelezionati.includes(intervento.codice);

                                return (
                                    <div
                                        key={intervento.codice}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${isSelezionato
                                            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {intervento.codice}
                                                </Badge>
                                                <span className={isSelezionato ? 'text-green-700' : ''}>
                                                    {intervento.descrizione}
                                                </span>
                                            </div>
                                            {intervento.note && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-14">
                                                    {intervento.note}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-blue-600">
                                                +{intervento.punteggio}
                                            </span>
                                            {isSelezionato ? (
                                                <Check className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => onAdd(intervento)}
                                                    disabled={isAdding}
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function OT23DetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { getOperateHeaders } = useTenantMode();
    const { confirm: confirmDialog } = useConfirmDialog();
    const operateHeaders = getOperateHeaders();
    const queryClient = useQueryClient();

    const [activeSection, setActiveSection] = useState<'A' | 'B'>('B');
    const [removingCodice, setRemovingCodice] = useState<string | null>(null);

    // Query - Dettaglio OT23
    const { data: ot23, isLoading, error } = useQuery({
        queryKey: ['ot23', id],
        queryFn: () => ot23Api.getById(id!, { headers: operateHeaders }),
        enabled: !!id
    });

    // Query - Catalogo interventi
    const { data: catalogo } = useQuery({
        queryKey: ['ot23-catalogo'],
        queryFn: () => ot23Api.getCatalogo()
    });

    // Mutation - Aggiungi intervento
    const addMutation = useMutation({
        mutationFn: ({ sezione, intervento }: { sezione: 'A' | 'B'; intervento: OT23CatalogoIntervento }) =>
            ot23Api.addIntervento(id!, sezione, intervento, { headers: operateHeaders }),
        onSuccess: () => {
            showToast({ type: 'success', message: 'Intervento aggiunto' });
            queryClient.invalidateQueries({ queryKey: ['ot23', id] });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore del server' });
        }
    });

    // Mutation - Rimuovi intervento
    const removeMutation = useMutation({
        mutationFn: ({ sezione, codice }: { sezione: 'A' | 'B'; codice: string }) =>
            ot23Api.removeIntervento(id!, sezione, codice, { headers: operateHeaders }),
        onMutate: ({ codice }) => {
            setRemovingCodice(codice);
        },
        onSuccess: () => {
            showToast({ type: 'success', message: 'Intervento rimosso' });
            queryClient.invalidateQueries({ queryKey: ['ot23', id] });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore del server' });
        },
        onSettled: () => {
            setRemovingCodice(null);
        }
    });

    // Mutation - Update stato
    const updateStatoMutation = useMutation({
        mutationFn: (stato: StatoOT23) => ot23Api.updateStato(id!, stato, undefined, { headers: operateHeaders }),
        onSuccess: () => {
            showToast({ type: 'success', message: 'Stato aggiornato' });
            queryClient.invalidateQueries({ queryKey: ['ot23', id] });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore del server' });
        }
    });

    // Derived values
    const canEdit = ot23 ? canEditOT23(ot23.stato) : false;
    const interventiSelezionati = useMemo(() => {
        if (!ot23) return [];
        const a = (ot23.interventiA || []).map(i => i.codice);
        const b = (ot23.interventiB || []).map(i => i.codice);
        return [...a, ...b];
    }, [ot23]);

    // Handlers
    const handleAddIntervento = (intervento: OT23CatalogoIntervento) => {
        addMutation.mutate({ sezione: activeSection, intervento });
    };

    const handleRemoveIntervento = (sezione: 'A' | 'B', codice: string) => {
        removeMutation.mutate({ sezione, codice });
    };

    const handleDownloadXml = async () => {
        if (!ot23) return;
        try {
            await ot23Api.downloadXml(
                ot23.id,
                `OT23_${ot23.anno}_${ot23.companyTenantProfile?.company?.ragioneSociale || 'export'}.xml`
            );
            showToast({ type: 'success', message: 'XML scaricato' });
        } catch {
            showToast({ type: 'error', message: 'Errore download' });
        }
    };

    const handleSetPronto = async () => {
        if (await confirmDialog({ title: 'Invia domanda', message: 'Confermi che la domanda è pronta per l\'invio?', variant: 'info', confirmLabel: 'Conferma invio' })) {
            updateStatoMutation.mutate('PRONTO');
        }
    };

    // Loading/Error states
    if (isLoading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            </div>
        );
    }

    if (error || !ot23) {
        return (
            <div className="container mx-auto p-6">
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-6 text-center">
                        <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-700">Domanda non trovata</p>
                        <Button className="mt-4" onClick={() => navigate('/sicurezza/ot23')}>
                            Torna alla lista
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">OT23 {ot23.anno}</h1>
                        <p className="text-gray-500 dark:text-gray-400">{ot23.companyTenantProfile?.company?.ragioneSociale}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/sicurezza/ot23')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Indietro
                    </Button>
                    <Button variant="outline" onClick={handleDownloadXml}>
                        <Download className="w-4 h-4 mr-2" />
                        XML
                    </Button>
                    {canEdit && ot23.haRequisitiBeneficio && ot23.stato === 'BOZZA' && (
                        <Button
                            onClick={handleSetPronto}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            Segna come Pronto
                        </Button>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Info & Punteggio */}
                <div className="space-y-6">
                    {/* Info Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Informazioni</CardTitle>
                                <StatoBadge stato={ot23.stato} />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Building2 className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="font-medium">{ot23.companyTenantProfile?.company?.ragioneSociale}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">P.IVA: {ot23.companyTenantProfile?.company?.piva}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="font-medium">Anno {ot23.anno}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Riduzione per {ot23.anno + 1}</p>
                                </div>
                            </div>

                            {ot23.pat && (
                                <div className="flex items-center gap-3">
                                    <Hash className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">PAT</p>
                                        <p className="font-mono">{ot23.pat}</p>
                                    </div>
                                </div>
                            )}

                            {ot23.risparmioStimato && (
                                <div className="flex items-center gap-3">
                                    <Euro className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Risparmio stimato</p>
                                        <p className="font-bold text-green-600 text-lg">
                                            {formatCurrency(Number(ot23.risparmioStimato))}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            (-{ot23.percentualeRiduzione}%)
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Punteggio Card */}
                    <PunteggioCard ot23={ot23} />

                    {/* Interventi Selezionati */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Interventi Selezionati</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Sezione A */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Sezione A</h4>
                                {(ot23.interventiA || []).length > 0 ? (
                                    <div className="space-y-2">
                                        {(ot23.interventiA || []).map((int) => (
                                            <InterventoItem
                                                key={int.codice}
                                                intervento={int}
                                                sezione="A"
                                                canEdit={canEdit}
                                                onRemove={() => handleRemoveIntervento('A', int.codice)}
                                                isRemoving={removingCodice === int.codice}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-sm">Nessun intervento</p>
                                )}
                            </div>

                            {/* Sezione B */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Sezione B</h4>
                                {(ot23.interventiB || []).length > 0 ? (
                                    <div className="space-y-2">
                                        {(ot23.interventiB || []).map((int) => (
                                            <InterventoItem
                                                key={int.codice}
                                                intervento={int}
                                                sezione="B"
                                                canEdit={canEdit}
                                                onRemove={() => handleRemoveIntervento('B', int.codice)}
                                                isRemoving={removingCodice === int.codice}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-sm">Nessun intervento</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Catalogo Interventi */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Catalogo Interventi
                                </CardTitle>
                                {!canEdit && (
                                    <Badge variant="secondary">Sola lettura</Badge>
                                )}
                            </div>

                            {/* Section tabs */}
                            <div className="flex gap-2 mt-4">
                                <Button
                                    variant={activeSection === 'A' ? 'primary' : 'outline'}
                                    onClick={() => setActiveSection('A')}
                                    className={activeSection === 'A' ? 'bg-blue-600' : ''}
                                >
                                    Sezione A
                                </Button>
                                <Button
                                    variant={activeSection === 'B' ? 'primary' : 'outline'}
                                    onClick={() => setActiveSection('B')}
                                    className={activeSection === 'B' ? 'bg-blue-600' : ''}
                                >
                                    Sezione B
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Section description */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 flex items-start gap-2">
                                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-700 dark:text-blue-300">
                                    {activeSection === 'A' ? (
                                        <p>
                                            <strong>Sezione A:</strong> Interventi legati alla partecipazione
                                            a iniziative INAIL (bandi ISI, progetti prevenzionali, formazione SAFE WORK).
                                        </p>
                                    ) : (
                                        <p>
                                            <strong>Sezione B:</strong> Interventi di prevenzione attuati
                                            dall'azienda in varie aree (organizzative, tecniche, formazione, etc.).
                                        </p>
                                    )}
                                </div>
                            </div>

                            {catalogo && canEdit ? (
                                <InterventiSelector
                                    sezione={activeSection}
                                    catalogo={catalogo}
                                    interventiSelezionati={interventiSelezionati}
                                    onAdd={handleAddIntervento}
                                    isAdding={addMutation.isPending}
                                />
                            ) : catalogo ? (
                                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                                    <p>La domanda non è modificabile in questo stato.</p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
