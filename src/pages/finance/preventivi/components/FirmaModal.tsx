/**
 * FirmaModal - Upload e storico PDF firmati per un preventivo
 *
 * Permette di:
 * - Caricare un PDF/immagine firmata (cartacea o digitale)
 * - Visualizzare lo storico di tutti i documenti firmati caricati
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, Download, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { apiGet, apiUpload } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface PdfFirmato {
  filename: string;
  originalName: string;
  note: string | null;
  sha256: string | null;
  scanStatus: string | null;
  createdAt: string;
  uploadedBy: string | null;
  size: number;
}

interface FirmaModalProps {
  preventivoId: string;
  preventivoNumero: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FirmaModal({ preventivoId, preventivoNumero, isOpen, onClose }: FirmaModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pdfFirmati, setPdfFirmati] = useState<PdfFirmato[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen && preventivoId) {
      fetchPdfFirmati();
    }
  }, [isOpen, preventivoId]);

  const fetchPdfFirmati = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: PdfFirmato[] }>(
        `/api/v1/preventivi/${preventivoId}/pdf-firmati`
      );
      setPdfFirmati(res.data || []);
    } catch {
      setPdfFirmati([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('documento', selectedFile);
      if (note.trim()) formData.append('note', note.trim());

      await apiUpload(`/api/v1/preventivi/${preventivoId}/pdf-firmati/upload`, formData);
      showToast({ message: 'PDF firmato caricato con successo', type: 'success' });
      setSelectedFile(null);
      setNote('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchPdfFirmati();
    } catch {
      showToast({ message: 'Errore nel caricamento del documento', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (pdf: PdfFirmato) => {
    const url = `/api/v1/preventivi/${preventivoId}/pdf-firmati/${encodeURIComponent(pdf.filename)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = pdf.originalName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">Firma / Upload firmato</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{preventivoNumero}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Info */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            Carica il PDF del preventivo firmato dal cliente (scansione o copia digitale). Lo storico è conservato per tracciabilità.
          </div>

          {/* Upload section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Carica documento firmato
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-200 dark:text-gray-300 dark:file:bg-gray-700 dark:file:text-gray-200 dark:hover:file:bg-gray-600"
            />
            {selectedFile && (
              <input
                type="text"
                placeholder="Note (opzionale)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
            )}
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? 'Caricamento…' : 'Carica firmato'}
            </button>
          </div>

          {/* Storico */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Storico documenti firmati ({pdfFirmati.length})
              </span>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Caricamento...
              </div>
            ) : pdfFirmati.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic py-2">
                Nessun documento firmato caricato
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {pdfFirmati.map((pdf) => (
                  <div
                    key={pdf.filename}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {pdf.originalName}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-5">
                        {format(new Date(pdf.createdAt), 'dd MMM yyyy · HH:mm', { locale: it })}
                        {' · '}{formatFileSize(pdf.size)}
                        {pdf.note && <span className="ml-1">· {pdf.note}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(pdf)}
                      className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
                      title="Scarica"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
