/**
 * AllegatoQuickLookModal
 * Anteprima rapida di allegati clinici (immagini, PDF, documenti)
 *
 * Features:
 * - Immagini: visualizzazione fullscreen con zoom
 * - PDF: iframe embedded viewer
 * - Altri file: info e pulsante download
 * - Toolbar: download, apertura in nuova tab, chiusura
 *
 * @module components/clinica/AllegatoQuickLookModal
 * @version 1.0.0 - R20
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    X,
    Download,
    ExternalLink,
    FileText,
    Image as ImageIcon,
    File,
    ZoomIn,
    ZoomOut,
    RotateCw,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { TIPOLOGIE_CLINICHE_LABELS, type TipologiaClinicaAllegato, documentiCliniciApi } from '@/services/clinicaApi';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface AllegatoQuickLookItem {
    id: string;
    nome: string;
    tipo: 'immagine' | 'documento' | string;
    url?: string;
    dataCaricamento?: string;
    dataEsecuzione?: string;
    tipologiaClinica?: string;
    dimensione?: string;
    // Navigator items (prev/next)
    _allItems?: AllegatoQuickLookItem[];
    _currentIndex?: number;
}

interface AllegatoQuickLookModalProps {
    isOpen: boolean;
    onClose: () => void;
    allegato: AllegatoQuickLookItem | null;
    /** Callback when "Edit" is requested (optional - opens AllegatoEditorModal) */
    onEdit?: (allegato: AllegatoQuickLookItem) => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isPdf(nome: string, url?: string): boolean {
    return (
        (nome?.toLowerCase().endsWith('.pdf')) ||
        (url?.toLowerCase().includes('.pdf') ?? false)
    );
}

function isImage(tipo: string, nome: string): boolean {
    if (tipo === 'immagine') return true;
    return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(nome ?? '');
}

function formatFileSize(size?: string): string {
    if (!size) return '';
    const bytes = parseInt(size, 10);
    if (isNaN(bytes)) return size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export const AllegatoQuickLookModal: React.FC<AllegatoQuickLookModalProps> = ({
    isOpen,
    onClose,
    allegato,
    onEdit,
}) => {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [isLoadingBlob, setIsLoadingBlob] = useState(false);
    const [blobError, setBlobError] = useState(false);

    // Scarica il file con autenticazione Bearer e crea un blob URL locale.
    // I GET diretti verso /api/v1/clinica/documenti/visita/download/:id richiedono
    // il token che il browser non trasmette con <img src> o <a href>.
    const fetchBlob = useCallback(async (allegatoId: string) => {
        setIsLoadingBlob(true);
        setBlobError(false);
        setBlobUrl(null);
        try {
            const blob = await documentiCliniciApi.downloadAllegato(allegatoId);
            const objectUrl = URL.createObjectURL(blob);
            setBlobUrl(objectUrl);
        } catch {
            setBlobError(true);
        } finally {
            setIsLoadingBlob(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen || !allegato?.id) {
            setBlobUrl(null);
            setBlobError(false);
            return;
        }
        fetchBlob(allegato.id);
        return () => {
            // Revoca il blob URL per liberare memoria quando il modal si chiude
            // o quando l'allegato cambia.
            setBlobUrl(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
        };
    }, [isOpen, allegato?.id, fetchBlob]);

    if (!isOpen || !allegato) return null;

    const { nome, tipo, url, dataCaricamento, dataEsecuzione, tipologiaClinica, dimensione } = allegato;

    const showImage = isImage(tipo, nome);
    const showPdf = !showImage && isPdf(nome, url);
    // Usa il blob URL per la preview; il campo url originale serve solo per determinare
    // il tipo di file e come fallback informativo.
    const previewSrc = blobUrl;

    const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 4));
    const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
    const handleRotate = () => setRotation(r => (r + 90) % 360);
    const resetTransform = () => { setZoom(1); setRotation(0); };

    const handleDownload = () => {
        if (!blobUrl) return;
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = nome;
        a.click();
    };

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[92vh] flex flex-col overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50/80 flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            {showImage ? (
                                <ImageIcon className="w-4 h-4 text-blue-600" />
                            ) : showPdf ? (
                                <FileText className="w-4 h-4 text-red-500" />
                            ) : (
                                <File className="w-4 h-4 text-gray-500" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{nome}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                                {tipologiaClinica && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded-full border border-teal-200">
                                        {TIPOLOGIE_CLINICHE_LABELS[tipologiaClinica as TipologiaClinicaAllegato] ?? tipologiaClinica}
                                    </span>
                                )}
                                {dataEsecuzione && (
                                    <span className="text-[10px] text-gray-500">Eseguito: {formatDate(dataEsecuzione)}</span>
                                )}
                                {dimensione && (
                                    <span className="text-[10px] text-gray-400">{formatFileSize(dimensione)}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Image controls */}
                        {showImage && (
                            <>
                                <button onClick={handleZoomOut} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-800" title="Zoom out">
                                    <ZoomOut className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-gray-500 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
                                <button onClick={handleZoomIn} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-800" title="Zoom in">
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                                <button onClick={handleRotate} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-800" title="Ruota">
                                    <RotateCw className="w-4 h-4" />
                                </button>
                                <div className="w-px h-5 bg-gray-300 mx-1" />
                            </>
                        )}
                        {onEdit && (
                            <button
                                onClick={() => onEdit(allegato)}
                                className="px-3 py-1.5 text-xs font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors"
                            >
                                Modifica
                            </button>
                        )}
                        {blobUrl && (
                            <button
                                onClick={handleDownload}
                                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-800 transition-colors"
                                title="Scarica"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        )}
                        {blobUrl && showPdf && (
                            <a
                                href={blobUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-800 transition-colors"
                                title="Apri in nuova tab"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        )}
                        <div className="w-px h-5 bg-gray-300 mx-1" />
                        <button
                            onClick={() => { resetTransform(); onClose(); }}
                            className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-800 transition-colors"
                            title="Chiudi"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-hidden bg-gray-100 relative min-h-[400px]">
                    {isLoadingBlob ? (
                        /* Loading: scaricamento blob autenticato in corso */
                        <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                            <p className="text-sm text-gray-500">Caricamento allegato...</p>
                        </div>
                    ) : blobError ? (
                        /* Error state */
                        <div className="flex flex-col items-center justify-center h-full gap-4 py-12 px-6">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-red-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-base font-semibold text-gray-700">Impossibile caricare il file</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Si è verificato un errore durante il download dell&apos;allegato.
                                </p>
                            </div>
                            <button
                                onClick={() => allegato.id && fetchBlob(allegato.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                            >
                                Riprova
                            </button>
                        </div>
                    ) : !previewSrc ? (
                        /* No URL/ID - info-only panel */
                        <div className="flex flex-col items-center justify-center h-full gap-4 py-12 px-6">
                            <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center">
                                <File className="w-8 h-8 text-gray-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-base font-semibold text-gray-700">{nome}</p>
                                <p className="text-sm text-gray-500 mt-1">Anteprima non disponibile</p>
                                {dataCaricamento && (
                                    <p className="text-xs text-gray-400 mt-1">Caricato il {formatDate(dataCaricamento)}</p>
                                )}
                            </div>
                        </div>
                    ) : showImage ? (
                        /* Image viewer */
                        <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                            <img
                                src={previewSrc}
                                alt={nome}
                                style={{
                                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                    transformOrigin: 'center center',
                                    transition: 'transform 0.2s ease',
                                    maxWidth: zoom === 1 ? '100%' : 'none',
                                    maxHeight: zoom === 1 ? '100%' : 'none',
                                    objectFit: 'contain',
                                }}
                                draggable={false}
                            />
                        </div>
                    ) : showPdf ? (
                        /* PDF viewer */
                        <iframe
                            src={`${previewSrc}#toolbar=1&navpanes=0`}
                            className="w-full h-full min-h-[500px]"
                            title={nome}
                            style={{ border: 'none' }}
                        />
                    ) : (
                        /* Generic file - show info + download */
                        <div className="flex flex-col items-center justify-center h-full gap-4 py-12 px-6">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                                <FileText className="w-8 h-8 text-blue-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-base font-semibold text-gray-700">{nome}</p>
                                <p className="text-sm text-gray-500 mt-1">Apri per visualizzare il contenuto</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Scarica
                                </button>
                                <a
                                    href={previewSrc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Apri
                                </a>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AllegatoQuickLookModal;
