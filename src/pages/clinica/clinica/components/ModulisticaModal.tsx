/**
 * Modulistica Modal
 * 
 * Modal per visualizzare e compilare documenti modulistica durante una visita.
 * Mostra i documenti applicabili per la prestazione/medico corrente.
 * Supporta compilazione inline con form dinamico dai campi del template.
 * 
 * @module pages/clinica/clinica/components
 * @project P53 - Modulistica System (Session #13, Session #53 - inline compilation)
 */

import React, { useState, useCallback, useMemo } from 'react';
import { getOptionLabel, getOptionValue } from '@/utils/optionHelpers';
import { DatePickerElegante } from '@/components/ui/DatePickerElegante';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    X,
    FileText,
    Check,
    Clock,
    AlertTriangle,
    FileSignature,
    Stethoscope,
    ChevronRight,
    ChevronLeft,
    Plus,
    Eye,
    Loader2,
    Send,
    Save,
    Trash2,
    FileCheck
} from 'lucide-react';
import {
    modulisticaDocumentiApi,
    modulisticaTemplatesApi,
    type DocumentoDaCompilare,
    type DocumentoCompilato,
    type DocumentoTemplate,
    type CampoTemplate,
    type FaseDocumento,
    type StatoDocumentoCompilato
} from '../../../../services/clinicaApi';
import { formatMedicoName } from '../../../../utils/textFormatters';
import { isFieldVisible } from '../../../../utils/conditionalFieldVisibility';
import { useToast } from '../../../../hooks/useToast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { generateCompilatoPdf } from '@/services/questionariService';

// ============================================
// TYPES
// ============================================

interface ModulisticaModalProps {
    isOpen: boolean;
    onClose: () => void;
    pazienteId: string;
    visitaId?: string;
    prestazioneId?: string;
    medicoId?: string;
    fase?: FaseDocumento;
    pazienteNome?: string;
    readOnly?: boolean;
    onDocumentoCompletato?: (documentoId: string) => void;
}

type ViewMode = 'list' | 'fill' | 'view';

interface SelectedDocumento {
    documentoId: string | null;
    templateId: string;
    template: DocumentoTemplate;
}

// ============================================
// CONSTANTS
// ============================================

const FASI: { value: FaseDocumento; label: string }[] = [
    { value: 'PRE_VISITA', label: 'Pre-visita' },
    { value: 'DURANTE_VISITA', label: 'Durante visita' },
    { value: 'POST_VISITA', label: 'Post-visita' }
];

const getStatoBadge = (stato: StatoDocumentoCompilato | undefined) => {
    if (!stato) return null;

    const badges: Record<StatoDocumentoCompilato, { bg: string; text: string; label: string }> = {
        'BOZZA': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Bozza' },
        'DA_FIRMARE': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Da firmare' },
        'FIRMATO_PAZIENTE': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Firmato Pz' },
        'FIRMATO_MEDICO': { bg: 'bg-green-100', text: 'text-green-800', label: 'Firmato Med' },
        'COMPLETATO': { bg: 'bg-green-100', text: 'text-green-800', label: 'Completato' },
        'SCADUTO': { bg: 'bg-red-100', text: 'text-red-800', label: 'Scaduto' },
        'ANNULLATO': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Annullato' }
    };

    const badge = badges[stato];
    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${badge.bg} ${badge.text}`}>
            {badge.label}
        </span>
    );
};

// ============================================
// FORM HELPERS
// ============================================

function getDefaultFormValues(campi: CampoTemplate[], existingData?: Record<string, unknown>): Record<string, string | string[]> {
    const values: Record<string, string | string[]> = {};
    for (const campo of campi) {
        if (existingData?.[campo.name] !== undefined) {
            const val = existingData[campo.name];
            if (Array.isArray(val)) {
                values[campo.name] = val.map(String);
            } else {
                values[campo.name] = String(val ?? '');
            }
        } else if (campo.defaultValue) {
            values[campo.name] = campo.defaultValue;
        } else if (campo.type === 'multiselect') {
            values[campo.name] = [];
        } else if (campo.type === 'boolean') {
            values[campo.name] = '';
        } else {
            values[campo.name] = '';
        }
    }
    return values;
}

// ============================================
// MAIN COMPONENT
// ============================================

const ModulisticaModal: React.FC<ModulisticaModalProps> = ({
    isOpen,
    onClose,
    pazienteId,
    visitaId,
    prestazioneId,
    medicoId,
    fase = 'DURANTE_VISITA',
    pazienteNome,
    readOnly = false,
    onDocumentoCompletato
}) => {
    const { showToast } = useToast();
    const { confirmDelete } = useConfirmDialog();
    const queryClient = useQueryClient();
    const [selectedFase, setSelectedFase] = useState<FaseDocumento>(fase);
    const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [selectedDoc, setSelectedDoc] = useState<SelectedDocumento | null>(null);
    const [formValues, setFormValues] = useState<Record<string, string | string[]>>({});
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Fetch documenti da compilare (list view)
    const { data: documenti, isLoading, error, refetch } = useQuery({
        queryKey: ['documenti-da-compilare', pazienteId, prestazioneId, medicoId, selectedFase],
        queryFn: () => modulisticaDocumentiApi.getDaCompilare({
            pazienteId,
            prestazioneId,
            medicoId,
            fase: selectedFase
        }),
        enabled: isOpen && !!pazienteId
    });

    // Fetch existing documento data when editing/viewing
    const { data: documentoData, isLoading: isLoadingDocumento } = useQuery({
        queryKey: ['documento-compilato', selectedDoc?.documentoId],
        queryFn: () => modulisticaDocumentiApi.getById(selectedDoc!.documentoId!),
        enabled: !!selectedDoc?.documentoId && viewMode !== 'list'
    });

    // Save/update mutation
    const saveMutation = useMutation({
        mutationFn: async (data: { documentoId: string; datiCompilati: Record<string, unknown> }) => {
            return modulisticaDocumentiApi.update(data.documentoId, data.datiCompilati);
        },
        onSuccess: () => {
            showToast({ message: 'Documento salvato', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['documenti-da-compilare'] });
            refetch();
            if (selectedDoc?.documentoId && onDocumentoCompletato) {
                onDocumentoCompletato(selectedDoc.documentoId);
            }
            handleBackToList();
        },
        onError: () => {
            showToast({ message: 'Errore nel salvataggio', type: 'error' });
        }
    });

    // S67: Delete compilato mutation (only BOZZA/DA_FIRMARE)
    const deleteMutation = useMutation({
        mutationFn: (data: { documentoId: string; deletionReason: string }) =>
            modulisticaDocumentiApi.delete(data.documentoId, data.deletionReason),
        onSuccess: () => {
            showToast({ message: 'Documento eliminato', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['documenti-da-compilare'] });
            refetch();
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore eliminazione', type: 'error' });
        }
    });

    // S71: Generate PDF mutation
    const generatePdfMutation = useMutation({
        mutationFn: (compilatoId: string) => generateCompilatoPdf(compilatoId),
        onSuccess: () => {
            showToast({ message: 'PDF generato con successo', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['documenti-da-compilare'] });
            queryClient.invalidateQueries({ queryKey: ['documento-compilato'] });
            refetch();
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore generazione PDF', type: 'error' });
        }
    });

    // Categorize documenti
    const { obbligatori, opzionali, compilati, dafirmare } = useMemo(() => {
        if (!documenti) return { obbligatori: [], opzionali: [], compilati: [], dafirmare: [] };

        const obbligatori: DocumentoDaCompilare[] = [];
        const opzionali: DocumentoDaCompilare[] = [];
        const compilati: DocumentoDaCompilare[] = [];
        const dafirmare: DocumentoDaCompilare[] = [];

        documenti.forEach(doc => {
            if (doc.compilato?.stato === 'COMPLETATO' || doc.compilato?.stato === 'FIRMATO_PAZIENTE' || doc.compilato?.stato === 'FIRMATO_MEDICO') {
                compilati.push(doc);
            } else if (doc.compilato?.stato === 'DA_FIRMARE' || doc.compilato?.stato === 'BOZZA') {
                dafirmare.push(doc);
            } else if (doc.obbligatorio) {
                obbligatori.push(doc);
            } else {
                opzionali.push(doc);
            }
        });

        return { obbligatori, opzionali, compilati, dafirmare };
    }, [documenti]);

    // Navigate to fill mode — create doc if needed, then open form
    const handleCompila = useCallback(async (doc: DocumentoDaCompilare) => {
        const template = doc.template;
        if (doc.compilato) {
            // Already has a compiled record → go to fill mode
            setSelectedDoc({ documentoId: doc.compilato.id, templateId: template.id, template });
            setFormValues(getDefaultFormValues(template.campi || [], undefined));
            setViewMode('fill');
        } else {
            // Create new documento
            setCreatingTemplate(template.id);
            try {
                const documento = await modulisticaDocumentiApi.create({
                    documentoTemplateId: template.id,
                    pazienteId,
                    visitaId
                });
                setSelectedDoc({ documentoId: documento.id, templateId: template.id, template });
                setFormValues(getDefaultFormValues(template.campi || [], undefined));
                setViewMode('fill');
                refetch();
            } catch {
                showToast({ message: 'Errore nella creazione del documento', type: 'error' });
            } finally {
                setCreatingTemplate(null);
            }
        }
    }, [pazienteId, visitaId, showToast, refetch]);

    // Navigate to view mode
    const handleView = useCallback((doc: DocumentoDaCompilare) => {
        setSelectedDoc({ documentoId: doc.compilato!.id, templateId: doc.template.id, template: doc.template });
        setViewMode('view');
    }, []);

    // S67/S71: Handle delete compilato — allowed for all states (GDPR soft-delete)
    const handleDeleteCompilato = useCallback(async (doc: DocumentoDaCompilare) => {
        if (!doc.compilato) return;
        const nome = doc.template.nome || 'Documento';
        const stato = doc.compilato.stato;
        const isSigned = stato === 'FIRMATO_PAZIENTE' || stato === 'FIRMATO_MEDICO' || stato === 'COMPLETATO';
        const confirmMsg = isSigned
            ? `${nome} (già firmato)`
            : nome;
        if (!await confirmDelete(confirmMsg)) return;
        deleteMutation.mutate({
            documentoId: doc.compilato.id,
            deletionReason: isSigned
                ? `Eliminazione manuale documento firmato "${nome}" (stato: ${stato})`
                : `Eliminazione manuale documento compilato "${nome}" prima della firma`
        });
    }, [deleteMutation, confirmDelete]);

    // Back to list
    const handleBackToList = useCallback(() => {
        setViewMode('list');
        setSelectedDoc(null);
        setFormValues({});
        setFormErrors({});
    }, []);

    // Initialize form values when documento data loads
    React.useEffect(() => {
        if (documentoData && selectedDoc && viewMode !== 'list') {
            const campi = selectedDoc.template.campi || [];
            const existingData = documentoData.datiCompilati || {};
            setFormValues(getDefaultFormValues(campi, existingData));
        }
    }, [documentoData, selectedDoc, viewMode]);

    // Form field change
    const handleFieldChange = useCallback((fieldName: string, value: string | string[]) => {
        setFormValues(prev => ({ ...prev, [fieldName]: value }));
        // Clear error on change
        setFormErrors(prev => {
            const next = { ...prev };
            delete next[fieldName];
            return next;
        });
    }, []);

    // Validate form
    const validateForm = useCallback((): boolean => {
        const campi = selectedDoc?.template.campi || [];
        const errors: Record<string, string> = {};

        for (const campo of campi) {
            const value = formValues[campo.name];
            if (campo.required) {
                if (Array.isArray(value) ? value.length === 0 : !value) {
                    errors[campo.name] = 'Campo obbligatorio';
                }
            }
            if (campo.validation?.min !== undefined && typeof value === 'string') {
                const num = Number(value);
                if (!isNaN(num) && num < campo.validation.min) {
                    errors[campo.name] = campo.validation.message || `Valore minimo: ${campo.validation.min}`;
                }
            }
            if (campo.validation?.max !== undefined && typeof value === 'string') {
                const num = Number(value);
                if (!isNaN(num) && num > campo.validation.max) {
                    errors[campo.name] = campo.validation.message || `Valore massimo: ${campo.validation.max}`;
                }
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [selectedDoc, formValues]);

    // Submit form
    const handleSubmit = useCallback(() => {
        if (!validateForm() || !selectedDoc?.documentoId) return;

        const datiCompilati: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(formValues)) {
            datiCompilati[key] = value;
        }

        saveMutation.mutate({ documentoId: selectedDoc.documentoId, datiCompilati });
    }, [validateForm, selectedDoc, formValues, saveMutation]);

    if (!isOpen) return null;

    const content = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={viewMode === 'list' ? onClose : undefined}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        {viewMode !== 'list' && (
                            <button
                                onClick={handleBackToList}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div className="p-2 bg-teal-50 rounded-lg">
                            <FileText className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                {viewMode === 'list' ? 'Modulistica' :
                                    viewMode === 'fill' ? selectedDoc?.template.nome || 'Compilazione' :
                                        selectedDoc?.template.nome || 'Visualizzazione'}
                            </h2>
                            {pazienteNome && viewMode === 'list' && (
                                <p className="text-sm text-gray-500">{pazienteNome}</p>
                            )}
                            {viewMode !== 'list' && (
                                <p className="text-sm text-gray-500">
                                    {viewMode === 'fill' ? 'Compilazione documento' : 'Documento compilato'}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={viewMode === 'list' ? onClose : handleBackToList}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Fase Tabs (only in list mode) */}
                {viewMode === 'list' && (
                    <div className="flex border-b border-gray-200 px-6">
                        {FASI.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setSelectedFase(f.value)}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${selectedFase === f.value
                                    ? 'border-teal-500 text-teal-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {viewMode === 'list' && (
                        <ListContent
                            isLoading={isLoading}
                            error={error}
                            documenti={documenti}
                            obbligatori={obbligatori}
                            opzionali={opzionali}
                            compilati={compilati}
                            dafirmare={dafirmare}
                            creatingTemplate={creatingTemplate}
                            onCompila={handleCompila}
                            onView={handleView}
                            onDelete={handleDeleteCompilato}
                            isDeleting={deleteMutation.isPending}
                            readOnly={readOnly}
                            onRefetch={refetch}
                            onGeneratePdf={(id) => generatePdfMutation.mutate(id)}
                            isGeneratingPdf={generatePdfMutation.isPending}
                        />
                    )}

                    {viewMode === 'fill' && selectedDoc && (
                        <FillContent
                            template={selectedDoc.template}
                            formValues={formValues}
                            formErrors={formErrors}
                            isLoadingDocumento={isLoadingDocumento}
                            readOnly={readOnly}
                            onFieldChange={handleFieldChange}
                        />
                    )}

                    {viewMode === 'view' && selectedDoc && (
                        <ViewContent
                            template={selectedDoc.template}
                            documentoData={documentoData}
                            isLoadingDocumento={isLoadingDocumento}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    {viewMode === 'list' && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Chiudi
                        </button>
                    )}

                    {viewMode === 'fill' && (
                        <>
                            <button
                                onClick={handleBackToList}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                {readOnly ? 'Chiudi' : 'Annulla'}
                            </button>
                            {!readOnly && (
                                <button
                                    onClick={handleSubmit}
                                    disabled={saveMutation.isPending}
                                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                                >
                                    {saveMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Salva e Completa
                                </button>
                            )}
                        </>
                    )}

                    {viewMode === 'view' && (
                        <button
                            onClick={handleBackToList}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Torna alla lista
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

// ============================================
// LIST CONTENT
// ============================================

interface ListContentProps {
    isLoading: boolean;
    error: unknown;
    documenti: DocumentoDaCompilare[] | undefined;
    obbligatori: DocumentoDaCompilare[];
    opzionali: DocumentoDaCompilare[];
    compilati: DocumentoDaCompilare[];
    dafirmare: DocumentoDaCompilare[];
    creatingTemplate: string | null;
    onCompila: (doc: DocumentoDaCompilare) => void;
    onView: (doc: DocumentoDaCompilare) => void;
    onDelete: (doc: DocumentoDaCompilare) => void;
    isDeleting?: boolean;
    readOnly?: boolean;
    onRefetch: () => void;
    onGeneratePdf?: (id: string) => void;
    isGeneratingPdf?: boolean;
}

const ListContent: React.FC<ListContentProps> = ({
    isLoading,
    error,
    documenti,
    obbligatori,
    opzionali,
    compilati,
    dafirmare,
    creatingTemplate,
    onCompila,
    onView,
    onDelete,
    isDeleting,
    readOnly,
    onRefetch,
    onGeneratePdf,
    isGeneratingPdf
}) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-600">Errore nel caricamento</p>
                <button
                    onClick={onRefetch}
                    className="mt-3 text-sm text-teal-600 hover:text-teal-800 underline"
                >
                    Riprova
                </button>
            </div>
        );
    }

    if (!documenti || documenti.length === 0) {
        return (
            <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nessun documento disponibile per questa fase</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Da completare / firmare */}
            {dafirmare.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-orange-700 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Da completare ({dafirmare.length})
                    </h3>
                    <div className="space-y-2">
                        {dafirmare.map(doc => {
                            // S71: Block editing after paziente has signed — only view mode
                            const pazienteSigned = !!doc.compilato?.firmaPaziente;
                            return (
                                <DocumentoRow
                                    key={doc.template.id}
                                    documento={doc}
                                    onAction={() => pazienteSigned ? onView(doc) : onCompila(doc)}
                                    onDelete={!readOnly ? () => onDelete(doc) : undefined}
                                    onGeneratePdf={doc.compilato?.id ? () => onGeneratePdf?.(doc.compilato!.id) : undefined}
                                    isGeneratingPdf={isGeneratingPdf ?? false}
                                    isCreating={false}
                                    isDeleting={isDeleting}
                                    mode={pazienteSigned ? 'view' : 'open'}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Obbligatori */}
            {obbligatori.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Obbligatori ({obbligatori.length})
                    </h3>
                    <div className="space-y-2">
                        {obbligatori.map(doc => (
                            <DocumentoRow
                                key={doc.template.id}
                                documento={doc}
                                onAction={() => onCompila(doc)}
                                isCreating={creatingTemplate === doc.template.id}
                                mode="create"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Opzionali */}
            {opzionali.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                        Opzionali ({opzionali.length})
                    </h3>
                    <div className="space-y-2">
                        {opzionali.map(doc => (
                            <DocumentoRow
                                key={doc.template.id}
                                documento={doc}
                                onAction={() => onCompila(doc)}
                                isCreating={creatingTemplate === doc.template.id}
                                mode="create"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Compilati */}
            {compilati.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-green-700 mb-3 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Completati ({compilati.length})
                    </h3>
                    <div className="space-y-2">
                        {compilati.map(doc => (
                            <DocumentoRow
                                key={doc.template.id}
                                documento={doc}
                                onAction={() => onView(doc)}
                                onDelete={!readOnly ? () => onDelete(doc) : undefined}
                                onGeneratePdf={doc.compilato?.id ? () => onGeneratePdf?.(doc.compilato!.id) : undefined}
                                isGeneratingPdf={isGeneratingPdf ?? false}
                                isCreating={false}
                                isDeleting={isDeleting}
                                mode="view"
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// FILL CONTENT - Form compilation
// ============================================

interface FillContentProps {
    template: DocumentoTemplate;
    formValues: Record<string, string | string[]>;
    formErrors: Record<string, string>;
    isLoadingDocumento: boolean;
    readOnly?: boolean;
    onFieldChange: (fieldName: string, value: string | string[]) => void;
}

const FillContent: React.FC<FillContentProps> = ({
    template,
    formValues,
    formErrors,
    isLoadingDocumento,
    readOnly = false,
    onFieldChange
}) => {
    const campi = template.campi || [];
    const [showPresets, setShowPresets] = useState(false);

    if (isLoadingDocumento) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    if (campi.length === 0) {
        return (
            <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Questo documento non ha campi da compilare.</p>
                <p className="text-xs text-gray-400 mt-1">Il documento è stato creato ed è pronto per la firma.</p>
            </div>
        );
    }

    const applyPreset = (presetId: string) => {
        for (const campo of campi) {
            switch (presetId) {
                case 'da-template':
                    if (campo.defaultValue !== undefined && campo.defaultValue !== null && campo.defaultValue !== '') {
                        if (campo.type === 'multiselect') {
                            try {
                                const parsed = JSON.parse(campo.defaultValue);
                                onFieldChange(campo.name, Array.isArray(parsed) ? parsed : [campo.defaultValue]);
                            } catch {
                                onFieldChange(campo.name, [campo.defaultValue]);
                            }
                        } else {
                            onFieldChange(campo.name, campo.defaultValue);
                        }
                    } else if (campo.type === 'boolean') {
                        onFieldChange(campo.name, '');
                    } else if (campo.type === 'multiselect') {
                        onFieldChange(campo.name, []);
                    } else {
                        onFieldChange(campo.name, '');
                    }
                    break;
                case 'nella-norma':
                    if (campo.type === 'boolean') onFieldChange(campo.name, 'false');
                    else if (campo.type === 'select' && campo.options?.length) onFieldChange(campo.name, getOptionValue(campo.options[0]));
                    else if (campo.type === 'multiselect') onFieldChange(campo.name, []);
                    else if (campo.type === 'number') onFieldChange(campo.name, String(campo.validation?.min ?? '0'));
                    else if (campo.type === 'text' || campo.type === 'textarea') onFieldChange(campo.name, 'Nella norma');
                    else if (campo.type === 'date') onFieldChange(campo.name, new Date().toISOString().split('T')[0]);
                    else onFieldChange(campo.name, '');
                    break;
                case 'tutto-si':
                    if (campo.type === 'boolean') onFieldChange(campo.name, 'true');
                    else if (campo.type === 'select' && campo.options?.length) onFieldChange(campo.name, getOptionValue(campo.options[0]));
                    else if (campo.type === 'multiselect') onFieldChange(campo.name, (campo.options || []).map((o: string | { value: string; label: string }) => getOptionValue(o)));
                    else if (campo.type === 'number') onFieldChange(campo.name, String(campo.validation?.max ?? '10'));
                    else if (campo.type === 'text' || campo.type === 'textarea') onFieldChange(campo.name, 'Sì');
                    else onFieldChange(campo.name, '');
                    break;
                case 'tutto-no':
                    if (campo.type === 'boolean') onFieldChange(campo.name, 'false');
                    else if (campo.type === 'multiselect') onFieldChange(campo.name, []);
                    else if (campo.type === 'number') onFieldChange(campo.name, String(campo.validation?.min ?? '0'));
                    else if (campo.type === 'text' || campo.type === 'textarea') onFieldChange(campo.name, 'No');
                    else onFieldChange(campo.name, '');
                    break;
                case 'reset':
                    if (campo.type === 'multiselect') onFieldChange(campo.name, []);
                    else if (campo.type === 'boolean') onFieldChange(campo.name, '');
                    else onFieldChange(campo.name, campo.defaultValue || '');
                    break;
            }
        }
        setShowPresets(false);
    };

    const PRESETS = [
        { id: 'da-template', label: 'Da template', icon: '📋', desc: 'Usa i valori predefiniti del template' },
        { id: 'nella-norma', label: 'Nella norma', icon: '✅', desc: 'Valori normali/negativi' },
        { id: 'tutto-si', label: 'Tutto Sì', icon: '👍', desc: 'Checkbox attivate, prime opzioni' },
        { id: 'tutto-no', label: 'Tutto No', icon: '👎', desc: 'Campi azzerati' },
        { id: 'reset', label: 'Reset', icon: '🔄', desc: 'Valori predefiniti' }
    ];

    return (
        <div className="space-y-5">
            {template.descrizione && (
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {template.descrizione}
                </p>
            )}

            {readOnly && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Visita completata — documento in sola lettura</span>
                </div>
            )}

            {!readOnly && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowPresets(!showPresets)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:text-teal-700 hover:border-teal-300 transition-colors"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" />
                        </svg>
                        Pre-compila risposte
                    </button>

                    {showPresets && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowPresets(false)} />
                            <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[240px]">
                                {PRESETS.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => applyPreset(p.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        <span className="text-base">{p.icon}</span>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{p.label}</p>
                                            <p className="text-xs text-gray-500">{p.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {campi.map(campo => {
                // Evaluate conditional visibility
                if (!isFieldVisible(campo as any, formValues as Record<string, unknown>, campi as any[])) {
                    return null;
                }
                return (
                    <FieldRenderer
                        key={campo.name}
                        campo={campo}
                        value={formValues[campo.name] ?? ''}
                        error={formErrors[campo.name]}
                        onChange={(val) => onFieldChange(campo.name, val)}
                        readOnly={readOnly}
                    />
                );
            })}
        </div>
    );
};

// ============================================
// VIEW CONTENT - Read-only view
// ============================================

interface ViewContentProps {
    template: DocumentoTemplate;
    documentoData: DocumentoCompilato | undefined;
    isLoadingDocumento: boolean;
}

const ViewContent: React.FC<ViewContentProps> = ({
    template,
    documentoData,
    isLoadingDocumento
}) => {
    const campi = template.campi || [];
    const dati = documentoData?.datiCompilati || {};

    if (isLoadingDocumento) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    if (campi.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">Documento compilato</span>
                    {documentoData && getStatoBadge(documentoData.stato)}
                </div>
                {documentoData?.note && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs font-medium text-gray-500 mb-1">Note</p>
                        <p className="text-sm text-gray-700">{documentoData.note}</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {documentoData && (
                <div className="flex items-center gap-2 mb-2">
                    {getStatoBadge(documentoData.stato)}
                    {documentoData.updatedAt && (
                        <span className="text-xs text-gray-400">
                            Ultimo aggiornamento: {new Date(documentoData.updatedAt).toLocaleDateString('it-IT')}
                        </span>
                    )}
                </div>
            )}

            {campi.map(campo => {
                const value = dati[campo.name];
                return (
                    <div key={campo.name} className="border-b border-gray-100 pb-3 last:border-0">
                        <p className="text-xs font-medium text-gray-500 mb-1">
                            {campo.label}
                        </p>
                        <p className="text-sm text-gray-900">
                            {formatDisplayValue(campo, value)}
                        </p>
                    </div>
                );
            })}
        </div>
    );
};

function formatDisplayValue(campo: CampoTemplate, value: unknown): string {
    if (value === undefined || value === null || value === '') return '—';

    switch (campo.type) {
        case 'boolean':
            return value === true || value === 'true' ? 'Sì' : 'No';
        case 'date':
            try {
                return new Date(String(value)).toLocaleDateString('it-IT');
            } catch {
                return String(value);
            }
        case 'multiselect':
            return Array.isArray(value) ? value.join(', ') : String(value);
        default:
            return String(value);
    }
}

// ============================================
// FIELD RENDERER
// ============================================

interface FieldRendererProps {
    campo: CampoTemplate;
    value: string | string[];
    error?: string;
    onChange: (value: string | string[]) => void;
    readOnly: boolean;
}

const FieldRenderer: React.FC<FieldRendererProps> = ({
    campo,
    value,
    error,
    onChange,
    readOnly
}) => {
    const stringValue = Array.isArray(value) ? '' : value;
    const arrayValue = Array.isArray(value) ? value : [];

    const baseInputClass = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 text-sm ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        } ${readOnly ? 'bg-gray-50 text-gray-600' : ''}`;

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {campo.label}
                {campo.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>

            {campo.helpText && (
                <p className="text-xs text-gray-400 mb-1.5">{campo.helpText}</p>
            )}

            {/* TEXT */}
            {campo.type === 'text' && (
                <input
                    type="text"
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={campo.placeholder}
                    readOnly={readOnly}
                    className={baseInputClass}
                />
            )}

            {/* EMAIL */}
            {campo.type === 'email' && (
                <input
                    type="email"
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={campo.placeholder}
                    readOnly={readOnly}
                    className={baseInputClass}
                />
            )}

            {/* PHONE */}
            {campo.type === 'phone' && (
                <input
                    type="tel"
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={campo.placeholder}
                    readOnly={readOnly}
                    className={baseInputClass}
                />
            )}

            {/* NUMBER */}
            {campo.type === 'number' && (
                <input
                    type="number"
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={campo.placeholder}
                    readOnly={readOnly}
                    min={campo.validation?.min}
                    max={campo.validation?.max}
                    className={baseInputClass}
                />
            )}

            {/* TEXTAREA */}
            {campo.type === 'textarea' && (
                <textarea
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={campo.placeholder}
                    readOnly={readOnly}
                    rows={3}
                    className={baseInputClass}
                />
            )}

            {/* DATE */}
            {campo.type === 'date' && (
                <DatePickerElegante
                    value={stringValue}
                    onChange={(date) => onChange(date ? date.toISOString().split('T')[0] : '')}
                    label=""
                    disabled={readOnly}
                />
            )}

            {/* BOOLEAN */}
            {campo.type === 'boolean' && (
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name={campo.name}
                            checked={stringValue === 'true'}
                            onChange={() => onChange('true')}
                            disabled={readOnly}
                            className="text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Sì</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name={campo.name}
                            checked={stringValue === 'false'}
                            onChange={() => onChange('false')}
                            disabled={readOnly}
                            className="text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">No</span>
                    </label>
                </div>
            )}

            {/* SELECT */}
            {campo.type === 'select' && (
                <select
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={readOnly}
                    className={baseInputClass}
                >
                    <option value="">— Seleziona —</option>
                    {(campo.options || []).map((opt, idx) => (
                        <option key={idx} value={getOptionValue(opt)}>{getOptionLabel(opt)}</option>
                    ))}
                </select>
            )}

            {/* RADIO */}
            {campo.type === 'radio' && (
                <div className="space-y-2">
                    {(campo.options || []).map((opt, idx) => (
                        <label key={idx} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name={campo.name}
                                checked={stringValue === getOptionValue(opt)}
                                onChange={() => onChange(getOptionValue(opt))}
                                disabled={readOnly}
                                className="text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">{getOptionLabel(opt)}</span>
                        </label>
                    ))}
                </div>
            )}

            {/* MULTISELECT */}
            {campo.type === 'multiselect' && (
                <div className="space-y-2 border border-gray-200 rounded-lg p-3">
                    {(campo.options || []).map((opt, idx) => {
                        const optVal = getOptionValue(opt);
                        return (
                            <label key={idx} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={arrayValue.includes(optVal)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            onChange([...arrayValue, optVal]);
                                        } else {
                                            onChange(arrayValue.filter(v => v !== optVal));
                                        }
                                    }}
                                    disabled={readOnly}
                                    className="rounded text-teal-600 focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-700">{getOptionLabel(opt)}</span>
                            </label>
                        );
                    })}
                </div>
            )}

            {/* SIGNATURE */}
            {campo.type === 'signature' && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <p className="text-xs text-gray-400">Campo firma — disponibile su tablet/touch</p>
                </div>
            )}

            {/* Error */}
            {error && (
                <p className="mt-1 text-xs text-red-600">{error}</p>
            )}
        </div>
    );
};

// ============================================
// DOCUMENTO ROW COMPONENT
// ============================================

interface DocumentoRowProps {
    documento: DocumentoDaCompilare;
    onAction: () => void;
    onDelete?: () => void;
    onGeneratePdf?: () => void;
    isGeneratingPdf?: boolean;
    isCreating: boolean;
    isDeleting?: boolean;
    mode: 'create' | 'open' | 'view';
}

const DocumentoRow: React.FC<DocumentoRowProps> = ({
    documento,
    onAction,
    onDelete,
    onGeneratePdf,
    isGeneratingPdf,
    isCreating,
    isDeleting,
    mode
}) => {
    const { template, compilato, obbligatorio } = documento;

    return (
        <div className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors ${obbligatorio && !compilato ? 'border-red-200 bg-red-50/50' : 'border-gray-200'
            }`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">
                        {template.nome}
                    </p>
                    {compilato && getStatoBadge(compilato.stato)}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {/* S68: Improved firma status — show signed/missing state */}
                    {template.richiedeFirma && (
                        <span className={`flex items-center gap-1 ${compilato?.firmaPaziente ? 'text-green-600' : compilato ? 'text-orange-500' : 'text-gray-500'}`}
                            title={compilato?.firmaPaziente ? 'Firma paziente acquisita' : compilato ? 'Firma paziente mancante' : 'Richiede firma paziente'}>
                            <FileSignature className="w-3 h-3" />
                            Firma Pz {compilato?.firmaPaziente ? '✓' : compilato ? '!' : ''}
                        </span>
                    )}
                    {template.richiedeFirmaMedico && (
                        <span className={`flex items-center gap-1 ${compilato?.firmaMedico ? 'text-green-600' : compilato ? 'text-orange-500' : 'text-gray-500'}`}
                            title={compilato?.firmaMedico ? 'Firma medico acquisita' : compilato ? 'Firma medico mancante' : 'Richiede firma medico'}>
                            <Stethoscope className="w-3 h-3" />
                            Firma Med {compilato?.firmaMedico ? '✓' : compilato ? '!' : ''}
                        </span>
                    )}
                    {template.validitaGiorni && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {template.validitaGiorni}gg
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* S68/S71: PDF quicklook button + on-demand generation */}
                {compilato?.pdfUrl ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); window.open(compilato.pdfUrl, '_blank'); }}
                        className="p-1.5 text-teal-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                        title="Anteprima PDF"
                    >
                        <FileCheck className="w-4 h-4" />
                    </button>
                ) : compilato && (compilato.stato === 'COMPLETATO' || compilato.firmaPaziente || compilato.firmaMedico) && onGeneratePdf ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onGeneratePdf(); }}
                        disabled={isGeneratingPdf}
                        className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                        title="Genera PDF"
                    >
                        {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                    </button>
                ) : null}

                {/* S67: Delete button for BOZZA/DA_FIRMARE */}
                {onDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        disabled={isDeleting}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Elimina documento"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}

                {mode === 'create' && (
                    <button
                        onClick={onAction}
                        disabled={isCreating}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 disabled:opacity-50"
                    >
                        {isCreating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Plus className="w-4 h-4" />
                                Compila
                            </>
                        )}
                    </button>
                )}

                {mode === 'open' && (
                    <button
                        onClick={onAction}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100"
                    >
                        <ChevronRight className="w-4 h-4" />
                        Continua
                    </button>
                )}

                {mode === 'view' && (
                    <button
                        onClick={onAction}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        <Eye className="w-4 h-4" />
                        Visualizza
                    </button>
                )}
            </div>
        </div>
    );
};

export default ModulisticaModal;
