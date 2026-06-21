/**
 * GiudizioFirmaModal — Raccolta firma del lavoratore e posizionamento sul PDF
 *
 * Step 1 "draw":  il lavoratore disegna la firma.
 * Step 2 "place": anteprima del PDF del giudizio con la firma trascinabile;
 *                 l'utente la posiziona dove vuole e salva. La posizione (pagina + coordinate
 *                 normalizzate) viene applicata al PDF lato backend tramite pdf-lib.
 *
 * Art. 41 c.7 D.Lgs 81/08 — GDPR Art. 9.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type * as PdfjsLib from 'pdfjs-dist';
import { X, PenTool, CheckCircle2, Loader2, RotateCcw, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Pen, Upload } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SignaturePad, SignaturePadRef } from '../../../../components/signature/SignaturePad';
import { clinicaApi, type GiudizioIdoneita } from '../../../../services/clinicaApi';
import { useToast } from '../../../../hooks/useToast';
import { CRUDPrimaryButton } from '../../../../components/shared/CRUDButton';

interface GiudizioFirmaModalProps {
    isOpen: boolean;
    giudizio: GiudizioIdoneita;
    onClose: () => void;
    onSuccess: () => void;
    /** Chi firma: 'lavoratore' (default) o 'medico' */
    firmatario?: 'lavoratore' | 'medico';
}

const GiudizioFirmaModal: React.FC<GiudizioFirmaModalProps> = ({ isOpen, giudizio, onClose, onSuccess, firmatario = 'lavoratore' }) => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const padRef = useRef<SignaturePadRef>(null);
    const [isEmpty, setIsEmpty] = useState(true);
    const [step, setStep] = useState<'draw' | 'place'>('draw');
    const [inputMode, setInputMode] = useState<'draw' | 'upload'>('draw');
    const [uploadedDataUrl, setUploadedDataUrl] = useState<string>('');
    const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');

    // PDF preview / posizionamento
    const pdfjsRef = useRef<typeof PdfjsLib | null>(null);
    const [pdfDoc, setPdfDoc] = useState<PdfjsLib.PDFDocumentProxy | null>(null);
    const [pdfPage, setPdfPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<PdfjsLib.RenderTask | null>(null);
    const dragOffset = useRef({ dx: 0, dy: 0 });
    const [isDragging, setIsDragging] = useState(false);
    // placement: ratio rispetto alla pagina renderizzata
    const [placement, setPlacement] = useState({ xRatio: 0.55, yRatio: 0.8, widthRatio: 0.28 });

    const personName = `${giudizio.person?.firstName ?? ''} ${giudizio.person?.lastName ?? ''}`.trim();

    // Reset quando si apre/chiude
    useEffect(() => {
        if (isOpen) {
            setStep('draw');
            setInputMode('draw');
            setUploadedDataUrl('');
            setSignatureDataUrl('');
            setIsEmpty(true);
            setPdfDoc(null);
            setPlacement({ xRatio: 0.55, yRatio: 0.8, widthRatio: 0.28 });
        }
    }, [isOpen]);

    // Carica il PDF quando si entra nello step "place"
    useEffect(() => {
        if (step !== 'place' || !isOpen) return;
        let cancelled = false;
        let task: PdfjsLib.PDFDocumentLoadingTask | null = null;
        setPdfLoading(true);
        setPdfError(null);
        (async () => {
            try {
                if (!pdfjsRef.current) {
                    const pdfjs = await import('pdfjs-dist');
                    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
                    pdfjsRef.current = pdfjs as unknown as typeof PdfjsLib;
                }
                if (cancelled) return;
                // Scarica il PDF via client autenticato (header tenant corretti) e passa i byte a pdfjs
                const blob = await clinicaApi.giudiziIdoneita.fetchPdfBlob(giudizio.id, 'lavoratore');
                const data = await blob.arrayBuffer();
                if (cancelled) return;
                task = pdfjsRef.current.getDocument({ data });
                const doc = await task.promise;
                if (cancelled) return;
                setPdfDoc(doc);
                setTotalPages(doc.numPages);
                setPdfPage(doc.numPages); // default: ultima pagina (dove c'è il box firma)
                setPdfLoading(false);
            } catch {
                if (!cancelled) { setPdfError('Impossibile caricare l\'anteprima del PDF.'); setPdfLoading(false); }
            }
        })();
        return () => { cancelled = true; task?.destroy(); };
    }, [step, isOpen, giudizio.id]);

    // Render della pagina corrente
    useEffect(() => {
        if (!pdfDoc || step !== 'place') return;
        (async () => {
            try {
                renderTaskRef.current?.cancel();
                const page = await pdfDoc.getPage(pdfPage);
                // scala per stare nel container (~520px larghezza)
                const base = page.getViewport({ scale: 1 });
                const scale = Math.min(1.4, 520 / base.width);
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                if (!canvas) return;
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                setCanvasSize({ w: viewport.width, h: viewport.height });
                const ctx = canvas.getContext('2d')!;
                const t = page.render({ canvas, canvasContext: ctx, viewport });
                renderTaskRef.current = t;
                await t.promise;
            } catch (err) {
                if ((err as { name?: string })?.name !== 'RenderingCancelledException') { /* noop */ }
            }
        })();
    }, [pdfDoc, pdfPage, step]);

    const sigPx = {
        x: placement.xRatio * canvasSize.w,
        y: placement.yRatio * canvasSize.h,
        w: placement.widthRatio * canvasSize.w,
        h: placement.widthRatio * canvasSize.w * 0.4 // ratio firma ~2.5:1
    };

    const onSigPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        setIsDragging(true);
        const rect = containerRef.current!.getBoundingClientRect();
        dragOffset.current = { dx: (e.clientX - rect.left) - sigPx.x, dy: (e.clientY - rect.top) - sigPx.y };
    };
    const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min((e.clientX - rect.left) - dragOffset.current.dx, canvasSize.w - sigPx.w));
        const y = Math.max(0, Math.min((e.clientY - rect.top) - dragOffset.current.dy, canvasSize.h - sigPx.h));
        setPlacement(prev => ({ ...prev, xRatio: x / canvasSize.w, yRatio: y / canvasSize.h }));
    };
    const onUp = () => setIsDragging(false);

    const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
            showToast({ type: 'error', message: 'Carica un file PNG o JPG' });
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setUploadedDataUrl(typeof reader.result === 'string' ? reader.result : '');
        reader.readAsDataURL(file);
    };

    const goToPlace = useCallback(() => {
        let b64 = '';
        if (inputMode === 'upload') {
            if (!uploadedDataUrl) {
                showToast({ type: 'error', message: 'Carica un\'immagine della firma prima di continuare' });
                return;
            }
            b64 = uploadedDataUrl;
        } else {
            if (!padRef.current || padRef.current.isEmpty()) {
                showToast({ type: 'error', message: 'Disegna la firma prima di continuare' });
                return;
            }
            const data = padRef.current.getSignatureData('png');
            b64 = data.imageBase64.startsWith('data:') ? data.imageBase64 : `data:image/png;base64,${data.imageBase64}`;
        }
        setSignatureDataUrl(b64);
        setStep('place');
    }, [inputMode, uploadedDataUrl, showToast]);

    const saveMutation = useMutation({
        mutationFn: (withPosition: boolean) => {
            const position = withPosition
                ? { page: pdfPage - 1, x: placement.xRatio, y: placement.yRatio, w: placement.widthRatio }
                : undefined;
            return firmatario === 'medico'
                ? clinicaApi.giudiziIdoneita.saveFirmaMedico(giudizio.id, signatureDataUrl, position)
                : clinicaApi.giudiziIdoneita.saveFirmaLavoratore(giudizio.id, signatureDataUrl, position);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['giudizi-idoneita'] });
            showToast({ type: 'success', message: firmatario === 'medico' ? 'Firma del medico salvata' : 'Firma del lavoratore salvata' });
            onSuccess();
            onClose();
        },
        onError: () => showToast({ type: 'error', message: 'Errore nel salvataggio della firma' })
    });

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <PenTool className="h-5 w-5 text-teal-600" />
                            {firmatario === 'medico' ? 'Firma Medico Competente' : 'Firma Lavoratore'} — {step === 'draw' ? 'disegna' : 'posiziona sul PDF'}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {personName} · Art. 41 c.7 D.Lgs 81/08
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {step === 'draw' ? (
                        <div className="space-y-4">
                            {/* Tabs Disegna / Carica immagine */}
                            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setInputMode('draw')}
                                    className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${inputMode === 'draw' ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-b-2 border-teal-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                >
                                    <Pen className="w-4 h-4" /> Disegna
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInputMode('upload')}
                                    className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${inputMode === 'upload' ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-b-2 border-teal-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                >
                                    <Upload className="w-4 h-4" /> Carica immagine
                                </button>
                            </div>

                            {inputMode === 'draw' ? (
                                <>
                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden bg-white">
                                        <SignaturePad
                                            ref={padRef}
                                            height={180}
                                            penColor="#1e293b"
                                            penWidth={2}
                                            backgroundColor="#ffffff"
                                            placeholder={firmatario === 'medico' ? 'Il medico competente firma qui...' : 'Il lavoratore firma qui...'}
                                            onChange={(empty) => setIsEmpty(empty)}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { padRef.current?.clear(); setIsEmpty(true); }}
                                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <RotateCcw className="h-3 w-3" /> Cancella e rifai
                                    </button>
                                </>
                            ) : (
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Carica un'immagine PNG o JPG della firma su sfondo bianco.</p>
                                    <label className="flex items-center gap-3 cursor-pointer px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-teal-400 dark:hover:border-teal-500 transition-colors">
                                        <Upload className="w-5 h-5 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Scegli file PNG o JPG...</span>
                                        <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleUploadFile} />
                                    </label>
                                    {uploadedDataUrl && (
                                        <div className="mt-3 relative">
                                            <div className="border rounded-xl overflow-hidden bg-white p-3">
                                                <img src={uploadedDataUrl} alt="Anteprima firma" className="max-h-28 max-w-full object-contain mx-auto" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setUploadedDataUrl('')}
                                                className="absolute top-1 right-1 p-1 rounded-full bg-red-100 dark:bg-red-900/50 text-red-500 hover:bg-red-200 dark:hover:bg-red-900"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                {firmatario === 'medico'
                                    ? 'La firma del medico competente viene apposta sul giudizio di idoneità (Art. 41 D.Lgs 81/08). Al passo successivo potrai posizionarla nel punto esatto del documento.'
                                    : 'La firma attesta che il lavoratore ha ricevuto copia del presente giudizio di idoneità. Al passo successivo potrai trascinarla nel punto esatto del documento.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Page nav */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Trascina la firma nella posizione desiderata</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setPdfPage(p => Math.max(1, p - 1))} disabled={pdfPage <= 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                                    <span className="text-xs text-gray-600">Pag. {pdfPage}/{totalPages}</span>
                                    <button onClick={() => setPdfPage(p => Math.min(totalPages, p + 1))} disabled={pdfPage >= totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                                </div>
                            </div>

                            {/* Width slider */}
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-gray-500">Dimensione</span>
                                <input
                                    type="range" min={0.12} max={0.5} step={0.01}
                                    value={placement.widthRatio}
                                    onChange={(e) => setPlacement(prev => ({ ...prev, widthRatio: parseFloat(e.target.value) }))}
                                    className="flex-1 accent-teal-600"
                                />
                            </div>

                            {/* PDF + overlay */}
                            <div className="flex justify-center bg-gray-100 rounded-xl p-3 min-h-[300px]">
                                {pdfLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-500 self-center"><Loader2 className="h-5 w-5 animate-spin text-teal-600" /> Caricamento PDF…</div>
                                ) : pdfError ? (
                                    <div className="text-sm text-red-600 self-center">{pdfError}</div>
                                ) : (
                                    <div
                                        ref={containerRef}
                                        className="relative shadow-md touch-none"
                                        style={{ width: canvasSize.w, height: canvasSize.h }}
                                        onPointerMove={onMove}
                                        onPointerUp={onUp}
                                    >
                                        <canvas ref={canvasRef} className="block" />
                                        {signatureDataUrl && canvasSize.w > 0 && (
                                            <div
                                                onPointerDown={onSigPointerDown}
                                                className={`absolute border-2 border-dashed ${isDragging ? 'border-teal-500' : 'border-teal-400/60'} bg-white/40 cursor-move`}
                                                style={{ left: sigPx.x, top: sigPx.y, width: sigPx.w, height: sigPx.h }}
                                            >
                                                <img src={signatureDataUrl} alt="firma" className="w-full h-full object-contain pointer-events-none" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                    {step === 'place' ? (
                        <button onClick={() => setStep('draw')} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <ArrowLeft className="h-4 w-4" /> Indietro
                        </button>
                    ) : <span />}
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            Annulla
                        </button>
                        {step === 'draw' ? (
                            <CRUDPrimaryButton onClick={goToPlace} disabled={inputMode === 'draw' ? isEmpty : !uploadedDataUrl}>
                                <ArrowRight className="h-4 w-4" /> Avanti: posiziona
                            </CRUDPrimaryButton>
                        ) : (
                            <>
                                <button
                                    onClick={() => saveMutation.mutate(false)}
                                    disabled={saveMutation.isPending}
                                    className="px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors disabled:opacity-50"
                                    title="Salva senza posizionare (firma nel riquadro standard)"
                                >
                                    Salva standard
                                </button>
                                <CRUDPrimaryButton onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending || pdfLoading || !!pdfError}>
                                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                    {saveMutation.isPending ? 'Salvataggio…' : 'Salva firma posizionata'}
                                </CRUDPrimaryButton>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default GiudizioFirmaModal;
