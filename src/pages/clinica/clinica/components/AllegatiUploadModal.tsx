/**
 * AllegatiUploadModal
 * Modal for uploading attachments to a visit
 *
 * Features:
 * - Drag & drop file upload
 * - Auto-detect image vs document from MIME type
 * - Per-file metadata: tipologiaClinica, dataEsecuzione, descrizione
 * - Image preview
 * - Progress indicator
 *
 * @module pages/clinica/clinica/components/AllegatiUploadModal
 */

import React, { useState, useCallback, useRef } from 'react';
import {
    X,
    Upload,
    Image,
    FileText,
    Trash2,
    Loader2,
    AlertCircle,
    CheckCircle,
    ChevronDown,
    Calendar,
} from 'lucide-react';
import {
    documentiCliniciApi,
    type TipoAllegatoClinico,
    type TipologiaClinicaAllegato,
    TIPOLOGIE_CLINICHE_LABELS,
} from '../../../../services/clinicaApi';
import { useToast } from '../../../../hooks/useToast';
import DatePickerElegante from '../../../../components/ui/DatePickerElegante';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface FileMetadata {
    tipologiaClinica: TipologiaClinicaAllegato | '';
    dataEsecuzione: string;       // ISO date string or ''
    descrizione: string;
}

interface FileItem {
    file: File;
    /** Nome visualizzato / rinominato dall'utente */
    customName: string;
    preview?: string;             // object-url for images
    tipo: TipoAllegatoClinico;    // auto-detected
    metadata: FileMetadata;
    metaOpen: boolean;            // aperto di default
    uploading: boolean;
    error?: string;
    success?: boolean;
}

interface AllegatiUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    visitaId: string;
    /** Pre-fill tipologiaClinica for all added files */
    defaultTipologiaClinica?: TipologiaClinicaAllegato;
    /** Pre-load files (e.g. from drag & drop outside the modal) */
    initialFiles?: File[];
    onUploadComplete?: () => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const ACCEPTED_MIME = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/dicom',
];
const ACCEPT_ATTR = ACCEPTED_MIME.join(',');

function detectTipo(file: File): TipoAllegatoClinico {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/dicom') return 'dicom';
    return 'document';
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export const AllegatiUploadModal: React.FC<AllegatiUploadModalProps> = ({
    isOpen,
    onClose,
    visitaId,
    defaultTipologiaClinica,
    initialFiles,
    onUploadComplete,
}) => {
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [files, setFiles] = useState<FileItem[]>(() => {
        if (initialFiles?.length) {
            return initialFiles.map(file => {
                const tipo = detectTipo(file);
                const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
                return {
                    file,
                    customName: nameWithoutExt,
                    preview: tipo === 'image' ? URL.createObjectURL(file) : undefined,
                    tipo,
                    metadata: { tipologiaClinica: defaultTipologiaClinica ?? '', dataEsecuzione: '', descrizione: '' },
                    metaOpen: true,
                    uploading: false,
                };
            });
        }
        return [];
    });
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // ── cleanup ──────────────────────────────
    const cleanupPreviews = useCallback((items: FileItem[]) => {
        items.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    }, []);

    const handleClose = useCallback(() => {
        if (isUploading) return;
        cleanupPreviews(files);
        setFiles([]);
        onClose();
    }, [isUploading, cleanupPreviews, files, onClose]);

    // ── add files ────────────────────────────
    const addFiles = useCallback((fileList: FileList | null) => {
        if (!fileList) return;
        const items: FileItem[] = [];
        Array.from(fileList).forEach(file => {
            let error: string | undefined;
            if (file.size > MAX_FILE_SIZE) error = `Max ${MAX_FILE_SIZE / 1024 / 1024} MB`;
            const tipo = detectTipo(file);
            // Strip extension from name to get a clean display name
            const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
            items.push({
                file,
                customName: nameWithoutExt,
                preview: tipo === 'image' ? URL.createObjectURL(file) : undefined,
                tipo,
                metadata: { tipologiaClinica: defaultTipologiaClinica ?? '', dataEsecuzione: '', descrizione: '' },
                metaOpen: true, // open by default so user sees metadata immediately
                uploading: false,
                error,
            });
        });
        setFiles(prev => [...prev, ...items]);
    }, []);

    const removeFile = useCallback((idx: number) => {
        setFiles(prev => {
            if (prev[idx]?.preview) URL.revokeObjectURL(prev[idx].preview!);
            return prev.filter((_, i) => i !== idx);
        });
    }, []);

    // ── metadata ─────────────────────────────
    const updateMeta = useCallback((idx: number, partial: Partial<FileMetadata>) => {
        setFiles(prev => prev.map((f, i) =>
            i === idx ? { ...f, metadata: { ...f.metadata, ...partial } } : f
        ));
    }, []);

    const toggleMeta = useCallback((idx: number) => {
        setFiles(prev => prev.map((f, i) =>
            i === idx ? { ...f, metaOpen: !f.metaOpen } : f
        ));
    }, []);

    const updateCustomName = useCallback((idx: number, name: string) => {
        setFiles(prev => prev.map((f, i) => i === idx ? { ...f, customName: name } : f));
    }, []);

    // ── drag ─────────────────────────────────
    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        addFiles(e.dataTransfer.files);
    }, [addFiles]);

    // ── upload ───────────────────────────────
    const handleUploadAll = useCallback(async () => {
        const pending = files.filter(f => !f.error && !f.success);
        if (pending.length === 0) {
            showToast({ message: 'Nessun file valido da caricare', type: 'warning' });
            return;
        }
        setIsUploading(true);
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < files.length; i++) {
            const item = files[i];
            if (item.error || item.success) continue;
            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, uploading: true } : f));
            try {
                // Rebuild file with custom name (preserve original extension)
                const ext = item.file.name.match(/\.[^.]+$/)?.[0] ?? '';
                const finalName = (item.customName.trim() || item.file.name.replace(/\.[^.]+$/, '')) + ext;
                const renamedFile = new File([item.file], finalName, { type: item.file.type });
                await documentiCliniciApi.uploadAllegatoVisita(
                    renamedFile,
                    visitaId,
                    item.tipo,
                    item.metadata.descrizione || undefined,
                    item.metadata.tipologiaClinica || undefined,
                    item.metadata.dataEsecuzione || undefined,
                );
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, uploading: false, success: true } : f));
                successCount++;
            } catch (err) {
                setFiles(prev => prev.map((f, idx) =>
                    idx === i ? { ...f, uploading: false, error: 'Upload fallito' } : f
                ));
                errorCount++;
            }
        }

        setIsUploading(false);
        if (successCount > 0) {
            showToast({
                message: `${successCount} allegat${successCount === 1 ? 'o caricato' : 'i caricati'}${errorCount > 0 ? `, ${errorCount} falliti` : ''}`,
                type: errorCount > 0 ? 'warning' : 'success',
            });
            onUploadComplete?.();
            if (errorCount === 0) setTimeout(() => handleClose(), 1400);
        } else {
            showToast({ message: 'Tutti gli upload sono falliti', type: 'error' });
        }
    }, [files, visitaId, showToast, onUploadComplete, handleClose]);

    if (!isOpen) return null;

    const validCount = files.filter(f => !f.error && !f.success).length;
    const tipologieOptions = Object.entries(TIPOLOGIE_CLINICHE_LABELS) as [TipologiaClinicaAllegato, string][];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 max-h-[92vh] flex flex-col">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2.5">
                        <Upload className="w-5 h-5 text-teal-600" />
                        <h2 className="text-base font-semibold text-gray-900">Carica allegati</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isUploading}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                    {/* Drop zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging
                            ? 'border-teal-400 bg-teal-50'
                            : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
                            } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept={ACCEPT_ATTR}
                            onChange={e => addFiles(e.target.files)}
                            className="hidden"
                        />
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">
                            Trascina i file o{' '}
                            <span className="text-teal-600 font-medium">sfoglia</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Immagini, PDF, DOC &mdash; max 15 MB &mdash; tipo rilevato automaticamente
                        </p>
                    </div>

                    {/* File list */}
                    {files.length > 0 && (
                        <div className="space-y-2">
                            {files.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`rounded-lg border overflow-hidden ${item.error
                                        ? 'border-red-200 bg-red-50'
                                        : item.success
                                            ? 'border-green-200 bg-green-50'
                                            : 'border-gray-200 bg-white'
                                        }`}
                                >
                                    {/* File row */}
                                    <div className="flex items-center gap-3 p-3">
                                        {/* Thumbnail or icon */}
                                        <div className="w-9 h-9 flex-shrink-0 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                                            {item.preview ? (
                                                <img src={item.preview} alt="" className="w-full h-full object-cover" />
                                            ) : item.tipo === 'document' ? (
                                                <FileText className="w-4 h-4 text-blue-500" />
                                            ) : (
                                                <FileText className="w-4 h-4 text-gray-500" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            {/* Editable file name */}
                                            {!item.success && !item.uploading ? (
                                                <input
                                                    type="text"
                                                    value={item.customName}
                                                    onChange={e => updateCustomName(idx, e.target.value)}
                                                    placeholder={item.file.name.replace(/\.[^.]+$/, '')}
                                                    disabled={isUploading}
                                                    className="w-full text-sm font-medium text-gray-800 border-b border-dashed border-gray-300 focus:border-teal-400 focus:outline-none bg-transparent truncate pb-0.5 mb-0.5"
                                                    title="Modifica nome file"
                                                />
                                            ) : (
                                                <p className="text-sm font-medium text-gray-800 truncate">
                                                    {item.customName || item.file.name.replace(/\.[^.]+$/, '')}
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                                                <span>{formatSize(item.file.size)}</span>
                                                <span>·</span>
                                                <span className={`flex items-center gap-0.5 ${item.tipo === 'image' ? 'text-pink-500' : 'text-blue-500'}`}>
                                                    {item.tipo === 'image'
                                                        ? <Image className="w-3 h-3" />
                                                        : <FileText className="w-3 h-3" />
                                                    }
                                                    {item.tipo === 'image' ? 'Immagine' : 'Documento'}
                                                </span>
                                                {item.metadata.tipologiaClinica && (
                                                    <>
                                                        <span>·</span>
                                                        <span className="text-teal-600 font-medium">
                                                            {TIPOLOGIE_CLINICHE_LABELS[item.metadata.tipologiaClinica as TipologiaClinicaAllegato] ?? item.metadata.tipologiaClinica}
                                                        </span>
                                                    </>
                                                )}
                                            </p>
                                            {item.error && <p className="text-xs text-red-600 mt-0.5">{item.error}</p>}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {item.uploading ? (
                                                <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
                                            ) : item.success ? (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                            ) : item.error ? (
                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleMeta(idx)}
                                                        title="Informazioni allegato"
                                                        disabled={isUploading}
                                                        className={`p-1.5 rounded-lg transition-colors ${item.metaOpen
                                                            ? 'bg-teal-100 text-teal-700'
                                                            : 'hover:bg-gray-100 text-gray-400'
                                                            }`}
                                                    >
                                                        <Calendar className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFile(idx)}
                                                        disabled={isUploading}
                                                        className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Metadata panel — open by default */}
                                    {item.metaOpen && !item.success && (
                                        <div className="px-3 pb-3 pt-2 border-t border-gray-100 grid grid-cols-1 gap-2.5 bg-gray-50/60">
                                            {/* Tipologia */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Tipologia clinica
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={item.metadata.tipologiaClinica}
                                                        onChange={e => updateMeta(idx, { tipologiaClinica: e.target.value as TipologiaClinicaAllegato | '' })}
                                                        className="w-full appearance-none text-sm px-3 py-1.5 pr-8 border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-teal-500 focus:border-teal-400 outline-none"
                                                        disabled={isUploading}
                                                    >
                                                        <option value="">— Nessuna —</option>
                                                        {tipologieOptions.map(([value, label]) => (
                                                            <option key={value} value={value}>{label}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                                </div>
                                            </div>

                                            {/* Data esecuzione */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Data esecuzione
                                                </label>
                                                <DatePickerElegante
                                                    value={item.metadata.dataEsecuzione || null}
                                                    onChange={date => updateMeta(idx, { dataEsecuzione: date ? date.toISOString() : '' })}
                                                    placeholder="Seleziona data"
                                                    size="sm"
                                                    clearable
                                                    disabled={isUploading}
                                                />
                                            </div>

                                            {/* Descrizione */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Descrizione
                                                </label>
                                                <input
                                                    type="text"
                                                    value={item.metadata.descrizione}
                                                    onChange={e => updateMeta(idx, { descrizione: e.target.value })}
                                                    placeholder="Note opzionali..."
                                                    className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-teal-500 focus:border-teal-400 outline-none"
                                                    disabled={isUploading}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <button
                        onClick={handleClose}
                        disabled={isUploading}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleUploadAll}
                        disabled={validCount === 0 || isUploading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />Caricamento...</>
                        ) : (
                            <><Upload className="w-4 h-4" />Carica {validCount > 1 ? `${validCount} file` : validCount === 1 ? '1 file' : 'file'}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AllegatiUploadModal;
