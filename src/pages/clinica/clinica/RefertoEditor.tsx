/**
 * RefertoEditor - Editor WYSIWYG per referti medici
 * 
 * Supporta template con merge fields, anteprima PDF,
 * salvataggio automatico bozze e firma digitale.
 * 
 * @module pages/poliambulatorio/clinica/RefertoEditor
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Save,
    Eye,
    FileText,
    Send,
    PenTool,
    History,
    Copy,
    RefreshCw,
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Heading1,
    Heading2,
    Heading3,
    Quote,
    Code,
    Image,
    Link as LinkIcon,
    Table,
    Undo,
    Redo,
    Maximize2,
    Download,
    Printer,
    Clock,
    AlertCircle,
    CheckCircle2,
    X
} from 'lucide-react';
import {
    refertiApi,
    visiteApi,
    pazientiApi,
    prestazioniApi,
    Referto,
    Visita,
    Paziente,
    Prestazione
} from '../../../services/clinicaApi';
import { formatDate, formatTime } from '../../../utils/dateUtils';

// ============================================
// TYPES
// ============================================

type StatoReferto = 'BOZZA' | 'COMPLETATO' | 'FIRMATO';

interface MergeField {
    key: string;
    label: string;
    value: string;
}

interface ToolbarButton {
    icon: React.ReactNode;
    label: string;
    command: string;
    value?: string;
}

// ============================================
// CONSTANTS
// ============================================

const STATO_COLORS: Record<StatoReferto, { bg: string; text: string }> = {
    'BOZZA': { bg: 'bg-amber-100', text: 'text-amber-700' },
    'COMPLETATO': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'FIRMATO': { bg: 'bg-green-100', text: 'text-green-700' }
};

const TOOLBAR_GROUPS: ToolbarButton[][] = [
    [
        { icon: <Bold className="h-4 w-4" />, label: 'Grassetto', command: 'bold' },
        { icon: <Italic className="h-4 w-4" />, label: 'Corsivo', command: 'italic' },
        { icon: <Underline className="h-4 w-4" />, label: 'Sottolineato', command: 'underline' },
    ],
    [
        { icon: <Heading1 className="h-4 w-4" />, label: 'Titolo 1', command: 'formatBlock', value: 'h1' },
        { icon: <Heading2 className="h-4 w-4" />, label: 'Titolo 2', command: 'formatBlock', value: 'h2' },
        { icon: <Heading3 className="h-4 w-4" />, label: 'Titolo 3', command: 'formatBlock', value: 'h3' },
    ],
    [
        { icon: <List className="h-4 w-4" />, label: 'Lista puntata', command: 'insertUnorderedList' },
        { icon: <ListOrdered className="h-4 w-4" />, label: 'Lista numerata', command: 'insertOrderedList' },
        { icon: <Quote className="h-4 w-4" />, label: 'Citazione', command: 'formatBlock', value: 'blockquote' },
    ],
    [
        { icon: <AlignLeft className="h-4 w-4" />, label: 'Allinea sinistra', command: 'justifyLeft' },
        { icon: <AlignCenter className="h-4 w-4" />, label: 'Centra', command: 'justifyCenter' },
        { icon: <AlignRight className="h-4 w-4" />, label: 'Allinea destra', command: 'justifyRight' },
    ]
];

const REFERTO_TEMPLATES = [
    { id: 'visita_generica', nome: 'Visita Generica' },
    { id: 'ecografia', nome: 'Ecografia' },
    { id: 'emocromo', nome: 'Emocromo' },
    { id: 'visita_cardiologica', nome: 'Visita Cardiologica' },
    { id: 'dermatologia', nome: 'Dermatologia' }
];

// ============================================
// COMPONENTS
// ============================================

/**
 * Editor Toolbar
 */
const EditorToolbar: React.FC<{
    onCommand: (command: string, value?: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    onFullscreen: () => void;
    isFullscreen: boolean;
}> = ({ onCommand, onUndo, onRedo, onFullscreen, isFullscreen }) => (
    <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 flex-wrap">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
            <button
                onClick={onUndo}
                className="p-2 hover:bg-gray-200 rounded"
                title="Annulla"
            >
                <Undo className="h-4 w-4 text-gray-600" />
            </button>
            <button
                onClick={onRedo}
                className="p-2 hover:bg-gray-200 rounded"
                title="Ripeti"
            >
                <Redo className="h-4 w-4 text-gray-600" />
            </button>
        </div>

        {/* Format buttons */}
        {TOOLBAR_GROUPS.map((group, groupIndex) => (
            <div key={groupIndex} className="flex items-center gap-1 px-2 border-r border-gray-300">
                {group.map((button, buttonIndex) => (
                    <button
                        key={buttonIndex}
                        onClick={() => onCommand(button.command, button.value)}
                        className="p-2 hover:bg-gray-200 rounded"
                        title={button.label}
                    >
                        {button.icon}
                    </button>
                ))}
            </div>
        ))}

        {/* Fullscreen */}
        <button
            onClick={onFullscreen}
            className="ml-auto p-2 hover:bg-gray-200 rounded"
            title={isFullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
        >
            <Maximize2 className="h-4 w-4 text-gray-600" />
        </button>
    </div>
);

/**
 * Merge Fields Panel
 */
const MergeFieldsPanel: React.FC<{
    fields: MergeField[];
    onInsert: (field: MergeField) => void;
}> = ({ fields, onInsert }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Campi Automatici</h3>
        <div className="space-y-2">
            {fields.map(field => (
                <button
                    key={field.key}
                    onClick={() => onInsert(field)}
                    className="w-full text-left p-2 hover:bg-teal-50 rounded-lg group"
                >
                    <p className="text-sm font-medium text-gray-700 group-hover:text-teal-700">
                        {field.label}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                        {field.value || '(vuoto)'}
                    </p>
                </button>
            ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">
            Clicca per inserire il campo nel referto
        </p>
    </div>
);

/**
 * Version History Panel
 */
const VersionHistoryPanel: React.FC<{
    refertoId: string;
    onClose: () => void;
}> = ({ refertoId, onClose }) => {
    const { data: versioni, isLoading } = useQuery({
        queryKey: ['referto-versioni', refertoId],
        queryFn: () => refertiApi.getVersioni(refertoId)
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Storico Versioni</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <RefreshCw className="h-6 w-6 text-teal-600 animate-spin" />
                        </div>
                    ) : (versioni as unknown[])?.length ? (
                        <div className="space-y-3">
                            {(versioni as unknown[]).map((v: unknown, index: number) => (
                                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900">
                                            Versione {(versioni as unknown[]).length - index}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {formatDate(new Date(), 'short')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Modificato da: Utente
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">
                            Nessuna versione precedente
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Sign Confirmation Modal
 */
const SignConfirmModal: React.FC<{
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}> = ({ onConfirm, onCancel, isLoading }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-teal-100 rounded-full flex items-center justify-center mb-4">
                    <PenTool className="h-8 w-8 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Conferma Firma Digitale
                </h3>
                <p className="text-gray-600 mb-6">
                    Stai per firmare digitalmente questo referto.
                    Una volta firmato, il documento non potrà più essere modificato.
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-700">
                            <p className="font-medium">Attenzione</p>
                            <p>Assicurati che tutti i dati inseriti siano corretti prima di procedere.</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                            <PenTool className="h-5 w-5" />
                        )}
                        Firma
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const RefertoEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // URL params
    const visitaId = searchParams.get('visita');
    const isNew = !id || id === 'nuovo';

    // State
    const [contenuto, setContenuto] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showSignModal, setShowSignModal] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // Queries
    const { data: referto, isLoading: loadingReferto } = useQuery({
        queryKey: ['referto', id],
        queryFn: () => refertiApi.getById(id!),
        enabled: !isNew && !!id
    });

    const { data: visita } = useQuery({
        queryKey: ['visita', visitaId || referto?.visitaId],
        queryFn: () => visiteApi.getById(visitaId || referto?.visitaId || ''),
        enabled: !!(visitaId || referto?.visitaId)
    });

    const { data: paziente } = useQuery({
        queryKey: ['paziente', visita?.pazienteId || referto?.pazienteId],
        queryFn: () => pazientiApi.getById(visita?.pazienteId || referto?.pazienteId || ''),
        enabled: !!(visita?.pazienteId || referto?.pazienteId)
    });

    const { data: prestazione } = useQuery({
        queryKey: ['prestazione', visita?.prestazioneId],
        queryFn: () => prestazioniApi.getById(visita!.prestazioneId),
        enabled: !!visita?.prestazioneId
    });

    // Mutations
    const createRefertoMutation = useMutation({
        mutationFn: (data: Partial<Referto>) => refertiApi.create(data),
        onSuccess: (newReferto) => {
            queryClient.invalidateQueries({ queryKey: ['referti'] });
            navigate(`/poliambulatorio/referti/${newReferto.id}`, { replace: true });
            setLastSaved(new Date());
            setIsDirty(false);
        }
    });

    const updateRefertoMutation = useMutation({
        mutationFn: (data: Partial<Referto>) => refertiApi.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['referto', id] });
            setLastSaved(new Date());
            setIsDirty(false);
        }
    });

    const firmaRefertoMutation = useMutation({
        mutationFn: () => refertiApi.firma(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['referto', id] });
            queryClient.invalidateQueries({ queryKey: ['referti'] });
            setShowSignModal(false);
        }
    });

    // Initialize content from referto
    useEffect(() => {
        if (referto?.contenuto) {
            setContenuto(referto.contenuto);
        }
    }, [referto]);

    // Merge fields
    const mergeFields = useMemo<MergeField[]>(() => [
        { key: '{{paziente.nome}}', label: 'Nome Paziente', value: paziente?.nome || '' },
        { key: '{{paziente.cognome}}', label: 'Cognome Paziente', value: paziente?.cognome || '' },
        { key: '{{paziente.cf}}', label: 'Codice Fiscale', value: paziente?.codiceFiscale || '' },
        { key: '{{paziente.data_nascita}}', label: 'Data Nascita', value: paziente?.dataNascita ? formatDate(new Date(paziente.dataNascita), 'short') : '' },
        { key: '{{prestazione.nome}}', label: 'Prestazione', value: prestazione?.nome || '' },
        { key: '{{data_visita}}', label: 'Data Visita', value: visita?.dataInizio ? formatDate(new Date(visita.dataInizio), 'short') : formatDate(new Date(), 'short') },
        { key: '{{data_oggi}}', label: 'Data Odierna', value: formatDate(new Date(), 'full') },
    ], [paziente, prestazione, visita]);

    // Auto-save effect
    useEffect(() => {
        if (!isDirty || !id || isNew) return;

        const timeout = setTimeout(() => {
            updateRefertoMutation.mutate({ contenuto });
        }, 2000);

        return () => clearTimeout(timeout);
    }, [contenuto, isDirty, id, isNew]);

    // Handlers
    const handleCommand = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value);
    }, []);

    const handleInsertMergeField = useCallback((field: MergeField) => {
        // Insert at cursor position
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const textNode = document.createTextNode(field.value || field.key);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }, []);

    const handleSave = async () => {
        if (isNew) {
            await createRefertoMutation.mutateAsync({
                visitaId: visitaId || undefined,
                pazienteId: visita?.pazienteId || paziente?.id,
                medicoId: visita?.medicoId,
                contenuto,
                stato: 'BOZZA'
            });
        } else {
            await updateRefertoMutation.mutateAsync({ contenuto });
        }
    };

    const handleComplete = async () => {
        await updateRefertoMutation.mutateAsync({
            contenuto,
            stato: 'COMPLETATO'
        });
    };

    const handleSign = async () => {
        await firmaRefertoMutation.mutateAsync();
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        if (!id) return;
        const pdfUrl = await refertiApi.getPdf(id);
        window.open(pdfUrl, '_blank');
    };

    // Estado
    const stato = (referto?.stato || 'BOZZA') as StatoReferto;
    const isEditable = stato !== 'FIRMATO';

    // Loading
    if (loadingReferto) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-gray-50 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-bold text-gray-900">
                                        {isNew ? 'Nuovo Referto' : 'Modifica Referto'}
                                    </h1>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATO_COLORS[stato].bg} ${STATO_COLORS[stato].text}`}>
                                        {stato}
                                    </span>
                                </div>
                                {paziente && (
                                    <p className="text-sm text-gray-500">
                                        {paziente.cognome} {paziente.nome} - {prestazione?.nome || 'Referto'}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {lastSaved && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Salvato alle {formatTime(lastSaved)}
                                </span>
                            )}

                            {!isNew && (
                                <button
                                    onClick={() => setShowHistory(true)}
                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                                    title="Storico versioni"
                                >
                                    <History className="h-5 w-5" />
                                </button>
                            )}

                            {isEditable && (
                                <>
                                    <button
                                        onClick={handleSave}
                                        disabled={updateRefertoMutation.isPending || createRefertoMutation.isPending}
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <Save className="h-5 w-5" />
                                        Salva Bozza
                                    </button>

                                    {stato === 'BOZZA' && (
                                        <button
                                            onClick={handleComplete}
                                            disabled={updateRefertoMutation.isPending}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            <CheckCircle2 className="h-5 w-5" />
                                            Completa
                                        </button>
                                    )}

                                    {stato === 'COMPLETATO' && (
                                        <button
                                            onClick={() => setShowSignModal(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                                        >
                                            <PenTool className="h-5 w-5" />
                                            Firma
                                        </button>
                                    )}
                                </>
                            )}

                            {stato === 'FIRMATO' && (
                                <>
                                    <button
                                        onClick={handlePrint}
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                    >
                                        <Printer className="h-5 w-5" />
                                        Stampa
                                    </button>
                                    <button
                                        onClick={handleDownloadPdf}
                                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                                    >
                                        <Download className="h-5 w-5" />
                                        Scarica PDF
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Template selector */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h3 className="font-semibold text-gray-900 mb-3">Template</h3>
                            <select
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                disabled={!isEditable}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                            >
                                <option value="">Seleziona template...</option>
                                {REFERTO_TEMPLATES.map(t => (
                                    <option key={t.id} value={t.id}>{t.nome}</option>
                                ))}
                            </select>
                        </div>

                        {/* Merge fields */}
                        {isEditable && (
                            <MergeFieldsPanel
                                fields={mergeFields}
                                onInsert={handleInsertMergeField}
                            />
                        )}

                        {/* Patient summary */}
                        {paziente && (
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                <h3 className="font-semibold text-gray-900 mb-3">Paziente</h3>
                                <div className="space-y-2 text-sm">
                                    <p><strong>Nome:</strong> {paziente.cognome} {paziente.nome}</p>
                                    <p><strong>CF:</strong> {paziente.codiceFiscale || '-'}</p>
                                    {paziente.dataNascita && (
                                        <p><strong>Nato/a:</strong> {formatDate(new Date(paziente.dataNascita), 'short')}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Editor */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            {isEditable && (
                                <EditorToolbar
                                    onCommand={handleCommand}
                                    onUndo={() => document.execCommand('undo')}
                                    onRedo={() => document.execCommand('redo')}
                                    onFullscreen={() => setIsFullscreen(!isFullscreen)}
                                    isFullscreen={isFullscreen}
                                />
                            )}

                            <div
                                className={`p-6 ${isFullscreen ? 'h-[calc(100vh-200px)]' : 'min-h-[500px]'} overflow-y-auto`}
                            >
                                {isEditable ? (
                                    <div
                                        contentEditable
                                        suppressContentEditableWarning
                                        onInput={(e) => {
                                            setContenuto((e.target as HTMLDivElement).innerHTML);
                                            setIsDirty(true);
                                        }}
                                        dangerouslySetInnerHTML={{ __html: contenuto }}
                                        className="prose prose-sm max-w-none min-h-full focus:outline-none"
                                        style={{
                                            fontFamily: 'Georgia, serif',
                                            lineHeight: '1.8'
                                        }}
                                    />
                                ) : (
                                    <div
                                        className="prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: contenuto }}
                                        style={{
                                            fontFamily: 'Georgia, serif',
                                            lineHeight: '1.8'
                                        }}
                                    />
                                )}
                            </div>

                            {/* Firma info */}
                            {stato === 'FIRMATO' && referto?.dataFirma && (
                                <div className="border-t border-gray-200 p-4 bg-green-50">
                                    <div className="flex items-center gap-2 text-green-700">
                                        <CheckCircle2 className="h-5 w-5" />
                                        <span className="font-medium">
                                            Documento firmato digitalmente il {formatDate(new Date(referto.dataFirma), 'full')}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showHistory && id && (
                <VersionHistoryPanel
                    refertoId={id}
                    onClose={() => setShowHistory(false)}
                />
            )}

            {showSignModal && (
                <SignConfirmModal
                    onConfirm={handleSign}
                    onCancel={() => setShowSignModal(false)}
                    isLoading={firmaRefertoMutation.isPending}
                />
            )}
        </div>
    );
};

export default RefertoEditor;
