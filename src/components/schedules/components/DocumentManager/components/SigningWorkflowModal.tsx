/**
 * SigningWorkflowModal
 *
 * Modal a due step per la firma dei documenti PDF:
 *   Step 1 – Disegna o carica la firma
 *   Step 2 – Preview del PDF con posizionamento drag&drop della firma
 *
 * Per la firma in batch (attestati):
 *   - Il modal si apre sul PRIMO documento non firmato
 *   - Alla conferma appare il checkbox "Applica stessa posizione a tutti"
 *   - onConfirm viene chiamata con { signatureDataUrl, placement, applyToAll }
 */

import React, {
    useRef,
    useState,
    useEffect,
    useCallback,
    type PointerEvent as ReactPointerEvent
} from 'react';
import type * as PdfjsLib from 'pdfjs-dist';
import { X, Trash2, Upload, Pen, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { getToken } from '../../../../../services/auth';

// pdfjs-dist is loaded LAZILY via dynamic import only when step 2 is activated.
// This prevents Vite from trying to pre-bundle the 3MB library at startup.
// Worker is loaded from CDN to avoid bundling it.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SignaturePlacement {
    /** 1-based page number (default: last page) */
    page: number;
    /** 0-1 fraction from left edge */
    xRatio: number;
    /** 0-1 fraction from top edge */
    yRatio: number;
    /** 0-1 fraction of page width */
    widthRatio: number;
    /** 0-1 fraction of page height */
    heightRatio: number;
}

export interface SigningWorkflowModalProps {
    isOpen: boolean;
    documentId: string;
    documentLabel?: string;
    /** For batch mode: IDs of additional documents to optionally sign with same placement */
    batchDocIds?: string[];
    batchLabel?: string;
    /** If the trainer has already signed a previous document, pass that signature here to pre-populate */
    savedSignatureUrl?: string | null;
    /** Additional HTTP headers for the PDF preview request (e.g. X-Operate-Tenant-Id for cross-tenant access) */
    previewHttpHeaders?: Record<string, string>;
    /** Override the default PDF preview URL. When set, uses this instead of /api/v1/documents/:id/preview */
    previewUrl?: string;
    onClose: () => void;
    /** Called when the user confirms. applyToAll=true only possible when batchDocIds is provided */
    onConfirm: (params: {
        signatureDataUrl: string;
        placement: SignaturePlacement;
        applyToAll: boolean;
    }) => void;
}

type Step = 1 | 2;
type SignMode = 'draw' | 'upload';

const DEFAULT_PLACEMENT: SignaturePlacement = {
    page: 1,
    xRatio: 0.62,
    yRatio: 0.86,
    widthRatio: 0.28,
    heightRatio: 0.08
};
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;

// ─── Component ────────────────────────────────────────────────────────────────

export const SigningWorkflowModal: React.FC<SigningWorkflowModalProps> = ({
    isOpen,
    documentId,
    documentLabel,
    batchDocIds = [],
    batchLabel,
    savedSignatureUrl = null,
    previewHttpHeaders,
    previewUrl,
    onClose,
    onConfirm
}) => {
    // ── Step & signature state ──────────────────────────────────────────────────
    const [step, setStep] = useState<Step>(1);
    const [signMode, setSignMode] = useState<SignMode>('draw');
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [hasStroke, setHasStroke] = useState(false);
    const padRef = useRef<HTMLCanvasElement>(null);
    /** Avoids stale-closure issues with drawing state – updated synchronously */
    const drawingRef = useRef({ active: false, lastX: 0, lastY: 0 });

    // ── PDF state ───────────────────────────────────────────────────────────────
    const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pdfjsRef = useRef<typeof PdfjsLib | null>(null);
    const [pdfDoc, setPdfDoc] = useState<PdfjsLib.PDFDocumentProxy | null>(null);
    const [pdfTotalPages, setPdfTotalPages] = useState(0);
    const [pdfPage, setPdfPage] = useState(1);
    const [pdfScale, setPdfScale] = useState(1.0);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
    const renderTaskRef = useRef<PdfjsLib.RenderTask | null>(null);

    // ── Placement state ─────────────────────────────────────────────────────────
    const [placement, setPlacement] = useState<SignaturePlacement>({ ...DEFAULT_PLACEMENT });

    // ── Drag state ──────────────────────────────────────────────────────────────
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef({ dx: 0, dy: 0 });

    // ── Batch option ────────────────────────────────────────────────────────────
    const [applyToAll, setApplyToAll] = useState(false);

    /** Remove white/near-white background from an image data URL, returning transparent PNG */
    const removeWhiteBackground = useCallback((dataUrl: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const threshold = 240; // pixels with R,G,B all above this become transparent
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i] > threshold && data[i + 1] > threshold && data[i + 2] > threshold) {
                        data[i + 3] = 0;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        });
    }, []);

    // ── Reset on open ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setSignatureDataUrl(null);
        setPdfDoc(null);
        setPdfPage(1);
        setPdfScale(1.0);
        setPdfError(null);
        setPlacement({ ...DEFAULT_PLACEMENT });
        setApplyToAll(false);
        drawingRef.current = { active: false, lastX: 0, lastY: 0 };
        // Auto-populate saved signature if available
        if (savedSignatureUrl) {
            setSignMode('upload');
            // Process saved signature to remove any white background from old signatures
            removeWhiteBackground(savedSignatureUrl).then(url => {
                setUploadedUrl(url);
            });
            setHasStroke(true);
        } else {
            setSignMode('draw');
            setUploadedUrl(null);
            setHasStroke(false);
        }
    }, [isOpen, savedSignatureUrl, removeWhiteBackground]);

    // ── Signature Pad ───────────────────────────────────────────────────────────

    const initPad = useCallback(() => {
        const canvas = padRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        // Transparent background - only clear, don't fill with white
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    useEffect(() => {
        if (isOpen && step === 1 && signMode === 'draw') {
            setTimeout(initPad, 30);
        }
    }, [isOpen, step, signMode, initPad]);

    /** Get DPI-corrected canvas coordinates from a pointer event, clamped to canvas bounds */
    const getPadPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const c = padRef.current!;
        const r = c.getBoundingClientRect();
        const sx = c.width / r.width;
        const sy = c.height / r.height;
        return {
            x: Math.max(0, Math.min(c.width, (e.clientX - r.left) * sx)),
            y: Math.max(0, Math.min(c.height, (e.clientY - r.top) * sy))
        };
    };

    const onPadPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = padRef.current;
        if (!canvas) return;
        // Capture pointer so move events keep firing even outside the canvas
        canvas.setPointerCapture(e.pointerId);
        const { x, y } = getPadPointerPos(e);
        const ctx = canvas.getContext('2d')!;
        ctx.beginPath();
        ctx.moveTo(x, y);
        drawingRef.current = { active: true, lastX: x, lastY: y };
    };

    const onPadPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current.active) return;
        e.preventDefault();
        const ctx = padRef.current?.getContext('2d');
        if (!ctx) return;
        const { x, y } = getPadPointerPos(e);
        ctx.beginPath();
        ctx.moveTo(drawingRef.current.lastX, drawingRef.current.lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        drawingRef.current.lastX = x;
        drawingRef.current.lastY = y;
        setHasStroke(true);
    };

    const onPadPointerUp = () => {
        drawingRef.current.active = false;
    };

    const clearPad = () => {
        initPad();
        setHasStroke(false);
        drawingRef.current = { active: false, lastX: 0, lastY: 0 };
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async ev => {
            const url = ev.target?.result as string;
            const transparentUrl = await removeWhiteBackground(url);
            setUploadedUrl(transparentUrl);
            setHasStroke(true);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // ── Proceed to step 2 ───────────────────────────────────────────────────────

    const goToStep2 = async () => {
        let dataUrl: string | null = null;
        if (signMode === 'draw') {
            dataUrl = padRef.current?.toDataURL('image/png') ?? null;
        } else {
            dataUrl = uploadedUrl;
        }
        if (!dataUrl) return;
        // Rimuovi sempre lo sfondo bianco prima di applicare la firma al PDF
        const transparentUrl = await removeWhiteBackground(dataUrl);
        setSignatureDataUrl(transparentUrl);
        setStep(2);
    };

    // ── PDF loading ─────────────────────────────────────────────────────────────

    useEffect(() => {
        if (step !== 2 || !documentId) return;

        let cancelled = false;
        let loadingTask: PdfjsLib.PDFDocumentLoadingTask | null = null;

        const token = getToken();
        setPdfLoading(true);
        setPdfError(null);

        const load = async () => {
            try {
                // Lazy-load pdfjs-dist only when actually needed (avoids Vite 504 on startup)
                if (!pdfjsRef.current) {
                    const pdfjs = await import('pdfjs-dist');
                    pdfjs.GlobalWorkerOptions.workerSrc =
                        `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
                    pdfjsRef.current = pdfjs as unknown as typeof PdfjsLib;
                }
                if (cancelled) return;

                loadingTask = pdfjsRef.current.getDocument({
                    url: previewUrl || `/api/v1/documents/${documentId}/preview`,
                    httpHeaders: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        ...(previewHttpHeaders ?? {})
                    }
                });

                const doc = await loadingTask.promise;
                if (cancelled) return;

                setPdfDoc(doc);
                setPdfTotalPages(doc.numPages);
                const lastPage = doc.numPages;
                setPdfPage(lastPage);
                setPlacement(prev => ({ ...prev, page: lastPage }));
                setPdfLoading(false);
            } catch (err) {
                if (!cancelled) {
                    setPdfError('Impossibile caricare il documento PDF.');
                    setPdfLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
            loadingTask?.destroy();
        };
    }, [step, documentId, previewUrl]);

    // ── PDF rendering ───────────────────────────────────────────────────────────

    useEffect(() => {
        if (!pdfDoc || step !== 2) return;

        const render = async () => {
            try {
                if (renderTaskRef.current) {
                    renderTaskRef.current.cancel();
                    renderTaskRef.current = null;
                }

                const page = await pdfDoc.getPage(pdfPage);
                const viewport = page.getViewport({ scale: pdfScale });
                const canvas = pdfCanvasRef.current;
                if (!canvas) return;
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                setCanvasSize({ w: viewport.width, h: viewport.height });

                const ctx = canvas.getContext('2d')!;
                const task = page.render({ canvas, canvasContext: ctx, viewport });
                renderTaskRef.current = task;
                await task.promise;
            } catch (err: unknown) {
                if ((err as { name?: string })?.name !== 'RenderingCancelledException') {
                }
            }
        };

        render();
    }, [pdfDoc, pdfPage, pdfScale, step]);

    // ── Placement changes when pdfPage changes ───────────────────────────────────
    useEffect(() => {
        setPlacement(prev => ({ ...prev, page: pdfPage }));
    }, [pdfPage]);

    // ── Signature overlay position (px from top-left of canvas, clamped) ────────

    const sigPxPos = {
        x: placement.xRatio * canvasSize.w,
        y: placement.yRatio * canvasSize.h,
        w: placement.widthRatio * canvasSize.w,
        h: placement.heightRatio * canvasSize.h
    };

    // ── Drag handling ───────────────────────────────────────────────────────────

    const onSigPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        setIsDragging(true);
        // Compute offset from sig-box top-left to the grabbed point, in container-relative coords.
        // getBoundingClientRect() gives the container's screen position so we can convert
        // from absolute screen coords to canvas-relative coords correctly.
        const rect = containerRef.current!.getBoundingClientRect();
        const scrollLeft = containerRef.current!.scrollLeft ?? 0;
        const scrollTop = containerRef.current!.scrollTop ?? 0;
        dragOffsetRef.current = {
            dx: (e.clientX - rect.left + scrollLeft) - sigPxPos.x,
            dy: (e.clientY - rect.top + scrollTop) - sigPxPos.y
        };
    };

    const onContainerPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (!isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const rawX = e.clientX - rect.left - dragOffsetRef.current.dx;
        const rawY = e.clientY - rect.top - dragOffsetRef.current.dy;

        // Apply scroll offset if container is scrollable
        const scrollLeft = (containerRef.current as HTMLDivElement).scrollLeft ?? 0;
        const scrollTop = (containerRef.current as HTMLDivElement).scrollTop ?? 0;

        const x = Math.max(0, Math.min(rawX + scrollLeft, canvasSize.w - sigPxPos.w));
        const y = Math.max(0, Math.min(rawY + scrollTop, canvasSize.h - sigPxPos.h));

        setPlacement(prev => ({
            ...prev,
            xRatio: x / canvasSize.w,
            yRatio: y / canvasSize.h
        }));
    };

    const onContainerPointerUp = () => setIsDragging(false);

    // Click on overlay (not on signature) moves signature to cursor
    const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDragging || !containerRef.current) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const x = e.clientX - rect.left - sigPxPos.w / 2;
        const y = e.clientY - rect.top - sigPxPos.h / 2;
        setPlacement(prev => ({
            ...prev,
            xRatio: Math.max(0, Math.min(x, canvasSize.w - sigPxPos.w)) / canvasSize.w,
            yRatio: Math.max(0, Math.min(y, canvasSize.h - sigPxPos.h)) / canvasSize.h
        }));
    };

    // ── Resize sig via handles ───────────────────────────────────────────────────
    const adjustSigSize = (deltaW: number, deltaH: number) => {
        setPlacement(prev => ({
            ...prev,
            widthRatio: Math.max(0.05, Math.min(0.6, prev.widthRatio + deltaW / canvasSize.w)),
            heightRatio: Math.max(0.03, Math.min(0.3, prev.heightRatio + deltaH / canvasSize.h))
        }));
    };

    // ── Confirm ─────────────────────────────────────────────────────────────────

    const handleConfirm = () => {
        if (!signatureDataUrl) return;
        onConfirm({ signatureDataUrl, placement, applyToAll });
    };

    if (!isOpen) return null;

    const canProceed = signMode === 'draw' ? hasStroke : Boolean(uploadedUrl);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" style={{ touchAction: 'none' }}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col"
                style={{ width: step === 1 ? 480 : 'min(860px, 96vw)', maxHeight: '92vh', overflow: 'hidden' }}>

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700 flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-3">
                            {/* Step indicators */}
                            {[1, 2].map(s => (
                                <div key={s} className={`flex items-center gap-1.5 text-sm font-medium ${step === s ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-teal-600 text-white' : step > s ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                        {step > s ? '✓' : s}
                                    </div>
                                    {s === 1 ? 'Firma' : 'Posiziona'}
                                </div>
                            ))}
                        </div>
                        {documentLabel && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs">{documentLabel}</p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Body ───────────────────────────────────────────── */}
                <div className="flex-1 overflow-auto">

                    {/* ──────────────── STEP 1: Signature pad ────────────── */}
                    {step === 1 && (
                        <div className="p-6">
                            {/* Saved signature info banner (auto-populated on open) */}
                            {savedSignatureUrl && signMode === 'upload' && uploadedUrl === savedSignatureUrl && (
                                <div className="mb-5 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-xl flex items-center gap-3">
                                    <img
                                        src={savedSignatureUrl}
                                        alt="Firma salvata"
                                        className="h-10 w-24 object-contain bg-white rounded border border-gray-200 flex-shrink-0"
                                    />
                                    <span className="text-sm text-teal-700 dark:text-teal-300 font-medium">
                                        Firma salvata caricata automaticamente
                                    </span>
                                </div>
                            )}

                            {/* Mode tabs */}
                            <div className="flex rounded-lg border dark:border-gray-700 overflow-hidden mb-5">
                                {(['draw', 'upload'] as SignMode[]).map(m => (
                                    <button key={m} onClick={() => {
                                        setSignMode(m);
                                        if (m === 'upload' && savedSignatureUrl) {
                                            // Re-populate saved signature when switching back to upload
                                            setUploadedUrl(savedSignatureUrl);
                                            setHasStroke(true);
                                        } else {
                                            setUploadedUrl(null);
                                            setHasStroke(false);
                                        }
                                    }}
                                        className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${signMode === m ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-b-2 border-teal-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                        {m === 'draw' ? <><Pen className="w-4 h-4" />Disegna</> : <><Upload className="w-4 h-4" />Carica immagine</>}
                                    </button>
                                ))}
                            </div>

                            {signMode === 'draw' ? (
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Disegna la tua firma nello spazio sottostante.</p>
                                    <div className="relative rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden" style={{ touchAction: 'none' }}>
                                        <canvas
                                            ref={padRef}
                                            width={440}
                                            height={160}
                                            className="w-full cursor-crosshair touch-none"
                                            onPointerDown={onPadPointerDown}
                                            onPointerMove={onPadPointerMove}
                                            onPointerUp={onPadPointerUp}
                                            onPointerCancel={onPadPointerUp}
                                            style={{ touchAction: 'none' }}
                                        />
                                        {!hasStroke && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <span className="text-gray-300 dark:text-gray-600 text-sm italic">Firma qui...</span>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={clearPad} className="mt-2 text-xs text-red-500 hover:text-red-700 dark:text-red-400 flex items-center gap-1">
                                        <Trash2 className="w-3 h-3" />Cancella
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Carica un'immagine PNG o JPG della tua firma su sfondo bianco.</p>
                                    <label className="flex items-center gap-3 cursor-pointer px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-teal-400 dark:hover:border-teal-500 transition-colors">
                                        <Upload className="w-5 h-5 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Scegli file PNG o JPG...</span>
                                        <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                    {uploadedUrl && (
                                        <div className="mt-3 relative">
                                            <div className="border rounded-xl overflow-hidden bg-white dark:bg-gray-800 p-3">
                                                <img src={uploadedUrl} alt="Anteprima firma" className="max-h-28 max-w-full object-contain mx-auto" />
                                            </div>
                                            <button onClick={() => { setUploadedUrl(null); setHasStroke(false); }}
                                                className="absolute top-1 right-1 p-1 rounded-full bg-red-100 dark:bg-red-900/50 text-red-500 hover:bg-red-200 dark:hover:bg-red-900">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ──────────────── STEP 2: PDF placement ────────────── */}
                    {step === 2 && (
                        <div className="flex flex-col h-full">
                            {/* Toolbar */}
                            <div className="flex items-center gap-3 px-4 py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0 flex-wrap">
                                <span className="text-xs text-gray-500 dark:text-gray-400 mr-auto">
                                    🖱️ <strong>Clicca</strong> per posizionare • <strong>Trascina</strong> per spostare la firma
                                </span>
                                {/* Page nav */}
                                {pdfTotalPages > 1 && (
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={() => setPdfPage(p => Math.max(1, p - 1))} disabled={pdfPage <= 1}
                                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                                        <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[60px] text-center">Pag. {pdfPage}/{pdfTotalPages}</span>
                                        <button onClick={() => setPdfPage(p => Math.min(pdfTotalPages, p + 1))} disabled={pdfPage >= pdfTotalPages}
                                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                )}
                                {/* Zoom */}
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setPdfScale(s => Math.max(MIN_SCALE, +(s - 0.1).toFixed(1)))}
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"><ZoomOut className="w-4 h-4" /></button>
                                    <span className="text-xs text-gray-600 dark:text-gray-400 w-12 text-center">{Math.round(pdfScale * 100)}%</span>
                                    <button onClick={() => setPdfScale(s => Math.min(MAX_SCALE, +(s + 0.1).toFixed(1)))}
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"><ZoomIn className="w-4 h-4" /></button>
                                </div>
                                {/* Sig size */}
                                <div className="flex items-center gap-1.5 border-l dark:border-gray-600 pl-3">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Dimensione:</span>
                                    <button onClick={() => adjustSigSize(-20, -7)} className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">−</button>
                                    <button onClick={() => adjustSigSize(20, 7)} className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">+</button>
                                </div>
                            </div>

                            {/* PDF viewer */}
                            <div className="flex-1 overflow-auto bg-gray-200 dark:bg-gray-950 p-4 flex items-start justify-center">
                                {pdfLoading && (
                                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-500 dark:text-gray-400">
                                        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm">Caricamento PDF...</span>
                                    </div>
                                )}
                                {pdfError && (
                                    <div className="flex items-center justify-center h-48 text-red-500 dark:text-red-400 text-sm">{pdfError}</div>
                                )}
                                {!pdfLoading && !pdfError && (
                                    /* Container for canvas + overlay — must be position:relative */
                                    <div
                                        ref={containerRef}
                                        className="relative shadow-2xl select-none"
                                        style={{ width: canvasSize.w, height: canvasSize.h, flexShrink: 0 }}
                                        onPointerMove={onContainerPointerMove}
                                        onPointerUp={onContainerPointerUp}
                                        onPointerLeave={onContainerPointerUp}
                                    >
                                        {/* PDF canvas */}
                                        <canvas ref={pdfCanvasRef} className="block" />

                                        {/* Transparent overlay – clicking anywhere moves the signature */}
                                        <div
                                            className="absolute inset-0"
                                            onClick={onOverlayClick}
                                            style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
                                        />

                                        {/* Draggable signature preview */}
                                        {signatureDataUrl && canvasSize.w > 0 && (
                                            <div
                                                className={`absolute border-2 rounded ${isDragging ? 'border-teal-500 shadow-lg' : 'border-teal-400 border-dashed'} cursor-grab active:cursor-grabbing`}
                                                style={{
                                                    left: sigPxPos.x,
                                                    top: sigPxPos.y,
                                                    width: sigPxPos.w,
                                                    height: sigPxPos.h,
                                                    touchAction: 'none',
                                                    zIndex: 10
                                                }}
                                                onPointerDown={onSigPointerDown}
                                                title="Trascina per spostare"
                                            >
                                                <img
                                                    src={signatureDataUrl}
                                                    alt="Firma"
                                                    className="w-full h-full object-contain"
                                                    draggable={false}
                                                    style={{ pointerEvents: 'none' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Batch option */}
                            {batchDocIds.length > 0 && (
                                <div className="px-4 py-3 bg-teal-50 dark:bg-teal-900/20 border-t dark:border-gray-700 flex-shrink-0">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={applyToAll}
                                            onChange={e => setApplyToAll(e.target.checked)}
                                            className="mt-0.5 w-4 h-4 rounded accent-teal-600"
                                        />
                                        <div>
                                            <div className="text-sm font-medium text-teal-800 dark:text-teal-200">
                                                Applica stessa posizione a tutti
                                            </div>
                                            <div className="text-xs text-teal-700 dark:text-teal-400">
                                                Verranno firmati anche gli altri {batchDocIds.length} {batchLabel ?? 'documenti'} non firmati con questa posizione.
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-t dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-800/40">
                    {step === 2 ? (
                        <button onClick={() => setStep(1)}
                            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <ChevronLeft className="w-4 h-4" />Modifica firma
                        </button>
                    ) : (
                        <button onClick={onClose}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            Annulla
                        </button>
                    )}

                    {step === 1 ? (
                        <button onClick={goToStep2} disabled={!canProceed}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors">
                            Posiziona sul PDF <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button onClick={handleConfirm} disabled={pdfLoading || Boolean(pdfError) || !signatureDataUrl}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors">
                            <Pen className="w-4 h-4" />
                            {applyToAll && batchDocIds.length > 0
                                ? `Firma tutti (${batchDocIds.length + 1})`
                                : 'Applica Firma'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SigningWorkflowModal;
