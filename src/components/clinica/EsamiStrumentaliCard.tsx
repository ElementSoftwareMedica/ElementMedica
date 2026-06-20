/**
 * EsamiStrumentaliCard
 * 
 * Panel showing medical device exams for a visit.
 * Allows starting new exams via the local Bridge and viewing results.
 * 
 * @module components/clinica/EsamiStrumentaliCard
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
    Activity,
    Heart,
    Wind,
    Ear,
    FlaskConical,
    Loader2,
    FileText,
    Trash2,
    RefreshCw,
    Wifi,
    WifiOff,
    Play,
    AlertCircle,
    CheckCircle,
    Clock,
    ChevronDown,
    ChevronUp,
    Download,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import {
    strumentiBridgeApi,
    bridgeDirectApi,
    TIPO_ESAME_LABELS,
    STATO_ESAME_CONFIG,
    type EsameStrumentale,
    type TipoEsame,
    type StartExamBridgeRequest,
} from '@/services/bridgeApi';
import { formatMedicoName } from '@/utils/textFormatters';
import { CRUDButton } from '@/components/ui';
import { PDFPreviewDialog } from '@/components/ui/PDFPreviewDialog';

// ============================================
// ICONS PER TIPO ESAME
// ============================================

const EXAM_ICONS: Record<string, typeof Heart> = {
    'ecg': Heart,
    'spirometria': Wind,
    'spirometry': Wind,
    'audiometria': Ear,
    'audiometry': Ear,
    'drugtest': FlaskConical,
};

// ============================================
// PROPS
// ============================================

interface EsamiStrumentaliCardProps {
    visitaId: string;
    pazienteId: string;
    pazienteNome: string;
    pazienteCognome: string;
    pazienteDataNascita?: string;
    pazienteGenere?: string;
    pazienteCodiceFiscale?: string;
    pazienteAltezza?: number | null;
    pazientePeso?: number | null;
    pazienteEtnia?: string | null;
    medicoId: string;
    tenantId: string;
    isReadOnly?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export default function EsamiStrumentaliCard({
    visitaId,
    pazienteId,
    pazienteNome,
    pazienteCognome,
    pazienteDataNascita,
    pazienteGenere,
    pazienteCodiceFiscale,
    pazienteAltezza,
    pazientePeso,
    pazienteEtnia,
    medicoId,
    tenantId,
    isReadOnly = false,
}: EsamiStrumentaliCardProps) {
    const { showToast } = useToast();
    const { confirmDelete } = useConfirmDialog();
    const queryClient = useQueryClient();

    const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');
    const [showBridgeInfo, setShowBridgeInfo] = useState(false);
    const [isCardOpen, setIsCardOpen] = useState(false);

    // Track which completed exams we've already notified about
    const notifiedExamIds = useRef<Set<string>>(new Set());

    // ============================================
    // QUERIES
    // ============================================

    // Fetch exams for this visit
    const { data: esami = [], isLoading, refetch } = useQuery({
        queryKey: ['esami-strumentali', visitaId],
        queryFn: () => strumentiBridgeApi.getEsamiVisita(visitaId),
        enabled: !!visitaId,
        refetchInterval: isCardOpen ? 10000 : false, // Poll only when card is open
    });

    // Check Bridge connectivity
    const { data: bridgeConnected = false, isLoading: isBridgeChecking } = useQuery({
        queryKey: ['bridge-status'],
        queryFn: () => bridgeDirectApi.isConnected(),
        refetchInterval: isCardOpen ? 30000 : false, // Poll only when card is open
        staleTime: 15000,
    });

    // ============================================
    // AUTO-DETECT COMPLETED EXAMS WITH PDF
    // When polling detects a newly completed exam with auto-linked document,
    // notify the user and refresh the visit documents list
    // ============================================
    useEffect(() => {
        for (const esame of esami) {
            if (
                esame.stato === 'COMPLETATO' &&
                esame.pdfPath &&
                !notifiedExamIds.current.has(esame.id)
            ) {
                notifiedExamIds.current.add(esame.id);

                const hasLinkedDocument = (esame.metadata as Record<string, unknown>)?.allegatoVisitaId;
                const label = TIPO_ESAME_LABELS[esame.tipoEsame] || esame.tipoEsame;

                if (hasLinkedDocument) {
                    showToast({
                        title: 'Esame completato',
                        message: `${label} completato con successo. Il referto PDF è stato salvato automaticamente nei documenti della visita.`,
                        type: 'success',
                    });
                    // Refresh visit documents list so the new PDF appears
                    queryClient.invalidateQueries({ queryKey: ['allegati-visita', visitaId] });
                }
            }
        }
    }, [esami, showToast, queryClient, visitaId]);

    // ============================================
    // MUTATIONS
    // ============================================

    const startExamMutation = useMutation({
        mutationFn: async (tipoEsame: TipoEsame) => {
            // Guard: patient identity fields required by the bridge
            if (!pazienteId || !pazienteNome || !pazienteCognome) {
                throw new Error("Anagrafica paziente incompleta: nome, cognome e ID sono obbligatori per avviare l'esame.");
            }

            // 1. Create pending record in backend
            const esame = await strumentiBridgeApi.avviaEsame({
                visitaId,
                pazienteId,
                tipoEsame,
            });

            // 2. Send start-exam to local Bridge
            const genderMap: Record<string, 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED'> = {
                'MALE': 'MALE',
                'FEMALE': 'FEMALE',
                'M': 'MALE',
                'F': 'FEMALE',
            };

            // Strip ISO time component: "1990-05-15T00:00:00.000Z" → "1990-05-15"
            const birthDateForBridge = (pazienteDataNascita || '').split('T')[0];
            if (!birthDateForBridge) {
                throw new Error("Data di nascita del paziente mancante: è obbligatoria per avviare l'esame strumentale.");
            }

            const bridgeRequest: StartExamBridgeRequest = {
                examType: tipoEsame,
                patient: {
                    patientId: pazienteId,
                    lastName: pazienteCognome,
                    firstName: pazienteNome,
                    dateOfBirth: birthDateForBridge,
                    gender: genderMap[pazienteGenere || ''] || 'NOT_SPECIFIED',
                    taxCode: pazienteCodiceFiscale,
                    heightCm: pazienteAltezza ?? undefined,
                    weightKg: pazientePeso ?? undefined,
                    ethnicity: pazienteEtnia ?? undefined,
                },
                visitaId,
                tenantId,
            };

            const bridgeResult = await bridgeDirectApi.startExam(bridgeRequest);
            return { esame, bridgeResult };
        },
        onSuccess: ({ bridgeResult }) => {
            const launchConfirmed = typeof bridgeResult.device === 'object'
                ? bridgeResult.device.launched !== false
                : true;
            showToast({
                title: launchConfirmed ? 'Esame avviato' : 'File GDT creato',
                message: bridgeResult.message || 'Il dispositivo medico è stato avviato. Attendere il completamento dell\'esame.',
                type: launchConfirmed ? 'success' : 'warning',
            });
            queryClient.invalidateQueries({ queryKey: ['esami-strumentali', visitaId] });
        },
        onError: (error) => {
            const msg = error instanceof Error && error.message
                ? error.message
                : "Impossibile avviare l'esame. Verificare che il Bridge sia in esecuzione.";
            showToast({
                title: 'Errore avvio esame',
                message: msg,
                type: 'error',
            });
        },
    });

    const deleteExamMutation = useMutation({
        mutationFn: (id: string) => strumentiBridgeApi.deleteEsame(id, 'Eliminazione esame strumentale richiesta dall\'utente'),
        onSuccess: () => {
            showToast({ message: 'Risultato rimosso dalla visita', title: 'Esame eliminato', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['esami-strumentali', visitaId] });
        },
        onError: () => {
            showToast({ message: 'Impossibile eliminare l\'esame', title: 'Errore', type: 'error' });
            // Refresh to clear any stale records from cache
            queryClient.invalidateQueries({ queryKey: ['esami-strumentali', visitaId] });
        },
    });

    // ============================================
    // HANDLERS
    // ============================================

    const handleStartExam = useCallback((tipo: TipoEsame) => {
        if (!bridgeConnected) {
            showToast({
                title: 'Bridge non connesso',
                message: 'Il Medical Device Bridge non è raggiungibile. Verificare che sia in esecuzione su questa postazione.',
                type: 'warning',
            });
            return;
        }
        const birthDateStripped = (pazienteDataNascita || '').split('T')[0];
        if (!birthDateStripped) {
            showToast({
                title: 'Dati paziente incompleti',
                message: "La data di nascita del paziente è necessaria per avviare l'esame strumentale.",
                type: 'warning',
            });
            return;
        }
        if (!tenantId) {
            showToast({
                title: 'Configurazione mancante',
                message: 'Tenant ID non disponibile. Ricaricare la pagina.',
                type: 'error',
            });
            return;
        }
        startExamMutation.mutate(tipo);
    }, [bridgeConnected, pazienteDataNascita, tenantId, startExamMutation, showToast]);

    const handleViewPdf = useCallback((esame: EsameStrumentale) => {
        if (esame.pdfPath) {
            const label = TIPO_ESAME_LABELS[esame.tipoEsame] || esame.tipoEsame;
            setPdfPreviewTitle(`${label} — ${esame.paziente?.lastName || ''} ${esame.paziente?.firstName || ''}`);
            setPdfPreviewUrl(esame.pdfPath);
        }
    }, []);

    const handleToggleExpand = useCallback((id: string) => {
        setExpandedExamId(prev => prev === id ? null : id);
    }, []);

    // ============================================
    // RENDER HELPERS
    // ============================================

    const renderExamStatus = (stato: string) => {
        const config = STATO_ESAME_CONFIG[stato as keyof typeof STATO_ESAME_CONFIG];
        if (!config) return null;

        const StatusIcon = stato === 'COMPLETATO' ? CheckCircle
            : stato === 'IN_ATTESA' ? Clock
                : stato === 'ERRORE' || stato === 'TIMEOUT' ? AlertCircle
                    : Clock;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                <StatusIcon className="w-3 h-3" />
                {config.label}
            </span>
        );
    };

    const renderTestResults = (esame: EsameStrumentale) => {
        const results = esame.risultati || [];
        if (results.length === 0 && (!esame.findings || esame.findings.length === 0)) {
            return <p className="text-sm text-gray-500 italic">Nessun risultato disponibile</p>;
        }

        return (
            <div className="space-y-3">
                {results.length > 0 && (
                    <div>
                        <h5 className="text-xs font-semibold text-gray-600 uppercase mb-2">Risultati</h5>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-1 px-2 font-medium text-gray-600">Parametro</th>
                                        <th className="text-right py-1 px-2 font-medium text-gray-600">Valore</th>
                                        <th className="text-left py-1 px-2 font-medium text-gray-600">Unità</th>
                                        <th className="text-left py-1 px-2 font-medium text-gray-600">Note</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((result, idx) => (
                                        <tr key={idx} className="border-b border-gray-100">
                                            <td className="py-1 px-2 text-gray-800">{result.testName || result.testId}</td>
                                            <td className="py-1 px-2 text-right font-mono font-medium">{result.value}</td>
                                            <td className="py-1 px-2 text-gray-500">{result.unit || '-'}</td>
                                            <td className="py-1 px-2 text-gray-500 text-xs">{result.note || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {esame.findings && esame.findings.length > 0 && (
                    <div>
                        <h5 className="text-xs font-semibold text-gray-600 uppercase mb-1">Conclusioni</h5>
                        <div className="bg-gray-50 rounded p-2 text-sm text-gray-700">
                            {esame.findings.map((f, idx) => (
                                <p key={idx}>{f}</p>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ============================================
    // RENDER
    // ============================================

    const hasExams = esami.length > 0;
    const pendingExams = esami.filter(e => e.stato === 'IN_ATTESA');

    return (
        <>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Header — clickable to expand/collapse */}
                <div
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => setIsCardOpen(prev => !prev)}
                >
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-teal-600" />
                        <h3 className="font-semibold text-gray-800">Esami Strumentali</h3>
                        {hasExams && (
                            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                                {esami.length}
                            </span>
                        )}
                        {pendingExams.length > 0 && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full animate-pulse">
                                {pendingExams.length} in corso
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Bridge Status Indicator */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowBridgeInfo(!showBridgeInfo); }}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                            title={bridgeConnected ? 'Bridge connesso' : 'Bridge non connesso'}
                        >
                            {isBridgeChecking ? (
                                <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                            ) : bridgeConnected ? (
                                <Wifi className="w-3 h-3 text-green-500" />
                            ) : (
                                <WifiOff className="w-3 h-3 text-red-400" />
                            )}
                            <span className={bridgeConnected ? 'text-green-600' : 'text-red-500'}>
                                {bridgeConnected ? 'Bridge' : 'Offline'}
                            </span>
                        </button>

                        {/* Refresh */}
                        <button
                            onClick={(e) => { e.stopPropagation(); refetch(); }}
                            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                            title="Aggiorna"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>

                        {/* Collapse/Expand chevron */}
                        {isCardOpen ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                    </div>
                </div>

                {/* Collapsible body */}
                {isCardOpen && (
                    <>

                        {/* Bridge Info Banner */}
                        {showBridgeInfo && !bridgeConnected && (
                            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 text-sm">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-amber-800 font-medium">Medical Device Bridge non raggiungibile</p>
                                        <p className="text-amber-700 mt-1">
                                            Per eseguire esami strumentali, assicurarsi che il <strong>Medical Device Bridge</strong> sia
                                            installato e in esecuzione su questa postazione.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Start Exam Buttons */}
                        {!isReadOnly && (
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-xs text-gray-500 mb-2">Avvia un esame strumentale:</p>
                                <div className="flex flex-wrap gap-2">
                                    {(['ecg', 'spirometria', 'audiometria', 'drugtest'] as TipoEsame[]).map(tipo => {
                                        const Icon = EXAM_ICONS[tipo] || Activity;
                                        const label = TIPO_ESAME_LABELS[tipo] || tipo;
                                        const isStarting = startExamMutation.isPending;

                                        return (
                                            <CRUDButton
                                                key={tipo}
                                                onClick={() => handleStartExam(tipo)}
                                                disabled={isStarting || !bridgeConnected}
                                                className="!py-1.5 !px-3 text-sm"
                                            >
                                                {isStarting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Icon className="w-4 h-4" />
                                                )}
                                                <span>{label}</span>
                                                <Play className="w-3 h-3" />
                                            </CRUDButton>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Exams List */}
                        <div className="divide-y divide-gray-100">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                    <span className="ml-2 text-sm text-gray-500">Caricamento esami...</span>
                                </div>
                            ) : !hasExams ? (
                                <div className="py-8 text-center text-sm text-gray-500">
                                    <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                    <p>Nessun esame strumentale registrato</p>
                                    {bridgeConnected && !isReadOnly && (
                                        <p className="mt-1 text-xs text-gray-400">
                                            Usa i pulsanti sopra per avviare un esame
                                        </p>
                                    )}
                                </div>
                            ) : (
                                esami.map(esame => {
                                    const Icon = EXAM_ICONS[esame.tipoEsame] || Activity;
                                    const isExpanded = expandedExamId === esame.id;
                                    const label = TIPO_ESAME_LABELS[esame.tipoEsame] || esame.tipoEsame;

                                    return (
                                        <div key={esame.id} className="group">
                                            {/* Exam Row */}
                                            <div
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                                                onClick={() => handleToggleExpand(esame.id)}
                                            >
                                                <div className="flex-shrink-0">
                                                    <Icon className="w-5 h-5 text-teal-600" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-800 text-sm">{label}</span>
                                                        {renderExamStatus(esame.stato)}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                                        {esame.dataEsame && (
                                                            <span>
                                                                {new Date(esame.dataEsame).toLocaleDateString('it-IT', {
                                                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                                                    hour: '2-digit', minute: '2-digit',
                                                                })}
                                                            </span>
                                                        )}
                                                        {esame.medico && (
                                                            <span>
                                                                {formatMedicoName(esame.medico as Parameters<typeof formatMedicoName>[0])}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    {esame.pdfPath && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleViewPdf(esame); }}
                                                            className="p-1.5 rounded hover:bg-teal-50 text-teal-600 hover:text-teal-700 transition-colors"
                                                            title="Visualizza PDF"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {esame.pdfPath && (
                                                        <a
                                                            href={esame.pdfPath}
                                                            download={esame.pdfFilename}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                                            title="Scarica PDF"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    {!isReadOnly && (
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (await confirmDelete('esame strumentale')) {
                                                                    deleteExamMutation.mutate(esame.id);
                                                                }
                                                            }}
                                                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Elimina"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100">
                                                    {esame.errorMessage && (
                                                        <div className="mb-3 p-2 bg-red-50 rounded border border-red-200 text-sm text-red-700">
                                                            <span className="font-medium">Errore:</span> {esame.errorMessage}
                                                        </div>
                                                    )}
                                                    {renderTestResults(esame)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* PDF Preview Dialog */}
            {pdfPreviewUrl && (
                <PDFPreviewDialog
                    isOpen={!!pdfPreviewUrl}
                    onClose={() => { setPdfPreviewUrl(null); setPdfPreviewTitle(''); }}
                    url={pdfPreviewUrl}
                    title={pdfPreviewTitle}
                />
            )}
        </>
    );
}
