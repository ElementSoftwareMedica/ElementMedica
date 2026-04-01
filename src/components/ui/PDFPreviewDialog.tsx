/**
 * PDFPreviewDialog - Reusable PDF preview modal component
 * 
 * P59: Quick look for PDF documents across the application.
 * Provides preview, open in new tab, and download functionality.
 * 
 * IMPORTANT: This component fetches PDFs with authentication headers
 * since iframes cannot send Authorization headers directly.
 */

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Download, FileText, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { getToken } from '@/services/auth';
import axios from 'axios';

interface PDFPreviewDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Callback when the dialog is closed */
    onClose: () => void;
    /** URL of the PDF to preview (API endpoint requiring auth) */
    url: string | null;
    /** Display name for the document */
    title?: string;
    /** Filename for download (defaults to title) */
    downloadName?: string;
}

export function PDFPreviewDialog({
    isOpen,
    onClose,
    url,
    title = 'Documento',
    downloadName
}: PDFPreviewDialogProps) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const finalDownloadName = downloadName || `${title}.pdf`;

    // Helper to fetch PDF blob — handles both /uploads/ (static) and /api/ (auth-intercepted) paths.
    // Must be declared before fetchPdf and before any conditional return (Rules of Hooks).
    const fetchPdfBlob = useCallback(async (): Promise<Blob> => {
        if (!url) throw new Error('No URL provided');
        let response;
        if (url.startsWith('/uploads/')) {
            // Static files served at /uploads/ root — use plain axios to avoid /api prefix
            const token = getToken();
            response = await axios.get(url, {
                responseType: 'blob',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
        } else {
            // API endpoints — use the api instance with auth interceptors
            response = await api.get(url, { responseType: 'blob' });
        }
        return response.data instanceof Blob
            ? response.data
            : new Blob([response.data as ArrayBuffer], { type: 'application/pdf' });
    }, [url]);

    // Fetch PDF and create a blob URL for the iframe
    const fetchPdf = useCallback(async () => {
        if (!url) return;
        setLoading(true);
        setError(null);
        try {
            const blob = await fetchPdfBlob();
            const objectUrl = URL.createObjectURL(blob);
            setBlobUrl(objectUrl);
        } catch (err: unknown) {
            if (import.meta.env.DEV) console.error('[PDFPreviewDialog] Error fetching PDF:', err);
            const axiosErr = err as { response?: { status?: number } };
            const errorMessage = axiosErr.response?.status === 401
                ? 'Sessione scaduta. Effettua nuovamente il login.'
                : axiosErr.response?.status === 404
                    ? 'Documento non trovato.'
                    : 'Errore nel caricamento del documento.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [url, fetchPdfBlob]);

    // Fetch PDF when dialog opens
    useEffect(() => {
        if (isOpen && url) {
            fetchPdf();
        }
    }, [isOpen, url, fetchPdf]);

    // Cleanup blob URL when dialog closes
    useEffect(() => {
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [blobUrl]);

    // Reset state when dialog closes
    useEffect(() => {
        if (!isOpen) {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
            setBlobUrl(null);
            setError(null);
        }
    }, [isOpen]);

    if (!url) return null;

    // Handle download with authentication
    const handleDownload = async () => {
        try {
            const blob = await fetchPdfBlob();
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = finalDownloadName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            if (import.meta.env.DEV) console.error('[PDFPreviewDialog] Error downloading PDF:', err);
        }
    };

    // Handle open in new tab with authentication
    const handleOpenInNewTab = async () => {
        try {
            const blob = await fetchPdfBlob();
            const newTabUrl = URL.createObjectURL(blob);
            window.open(newTabUrl, '_blank');
        } catch (err) {
            if (import.meta.env.DEV) console.error('[PDFPreviewDialog] Error opening PDF in new tab:', err);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl w-full max-h-[85vh] flex flex-col p-0">
                {/* Header with improved button spacing */}
                <DialogHeader className="p-4 border-b dark:border-gray-700 flex flex-row items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <DialogTitle className="font-medium text-gray-900 dark:text-gray-50 pr-4">
                            {title}
                        </DialogTitle>
                    </div>
                    {/* Action buttons with more spacing from the close X button */}
                    <div className="flex items-center gap-3 mr-8">
                        <button
                            onClick={handleOpenInNewTab}
                            disabled={loading || !!error}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium border border-gray-200 dark:border-gray-600"
                            title="Apri in nuova scheda"
                        >
                            <ExternalLink className="h-4 w-4" />
                            <span className="hidden sm:inline">Apri</span>
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={loading || !!error}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                            title="Scarica"
                        >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Scarica</span>
                        </button>
                    </div>
                </DialogHeader>
                {/* PDF Preview - reduced height */}
                <div className="flex-1 overflow-hidden relative bg-gray-100 dark:bg-gray-800">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">Caricamento documento...</span>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                            <div className="flex flex-col items-center gap-3 text-center px-6">
                                <AlertCircle className="h-10 w-10 text-red-500" />
                                <span className="text-gray-700 dark:text-gray-300">{error}</span>
                                <button
                                    onClick={fetchPdf}
                                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Riprova
                                </button>
                            </div>
                        </div>
                    )}
                    {blobUrl && !loading && !error && (
                        <iframe
                            src={blobUrl}
                            className="w-full h-full min-h-[55vh]"
                            title={title}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default PDFPreviewDialog;
