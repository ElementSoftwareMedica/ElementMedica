/**
 * P65 - SignaturePad Component
 * 
 * Componente React per firma grafometrica su canvas.
 * Supporta mouse, touch e stylus con cattura dati biometrici opzionali.
 * 
 * Features:
 * - Canvas responsivo
 * - Touch/stylus support
 * - Dati biometrici (pressione, velocità, timing)
 * - Export PNG/SVG
 * - Riutilizzo firma salvata
 * - Undo/Clear
 * 
 * @module components/signature/SignaturePad
 */

import React, {
    useRef,
    useState,
    useEffect,
    useCallback,
    forwardRef,
    useImperativeHandle
} from 'react';
import {
    Trash2,
    Undo,
    Download,
    RefreshCw,
    Check,
    X,
    History,
    PenTool
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface SignaturePoint {
    x: number;
    y: number;
    pressure: number;  // 0-1 (stylus pressure)
    timestamp: number; // ms
}

export interface BiometricData {
    points: SignaturePoint[];
    totalTime: number;      // ms
    averagePressure: number;
    velocityProfile: number[];  // Velocità tra punti consecutivi
    strokeCount: number;
}

export interface SignatureData {
    imageBase64: string;
    imageFormat: 'png' | 'svg';
    width: number;
    height: number;
    biometricData?: BiometricData;
    timestamp: Date;
    isEmpty: boolean;
}

export interface SignaturePadProps {
    /** Larghezza canvas (default: 100%) */
    width?: number | string;
    /** Altezza canvas (default: 200px) */
    height?: number;
    /** Colore tratto (default: #000) */
    penColor?: string;
    /** Spessore tratto (default: 2) */
    penWidth?: number;
    /** Colore sfondo (default: #fff) */
    backgroundColor?: string;
    /** Abilita cattura dati biometrici */
    enableBiometric?: boolean;
    /** URL firma salvata da riutilizzare */
    savedSignatureUrl?: string;
    /** Mostra controlli (default: true) */
    showControls?: boolean;
    /** Placeholder text quando vuoto */
    placeholder?: string;
    /** Disabilitato */
    disabled?: boolean;
    /** Callback quando firma cambia */
    onChange?: (isEmpty: boolean) => void;
    /** Callback per errori */
    onError?: (error: Error) => void;
    /** Classe CSS aggiuntiva */
    className?: string;
}

export interface SignaturePadRef {
    /** Ottieni dati firma */
    getSignatureData: (format?: 'png' | 'svg') => SignatureData;
    /** Pulisci canvas */
    clear: () => void;
    /** Verifica se vuoto */
    isEmpty: () => boolean;
    /** Carica immagine firma */
    loadImage: (imageUrl: string) => void;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_CONFIG = {
    width: '100%',
    height: 200,
    penColor: '#1a1a2e',
    penWidth: 2.5,
    backgroundColor: 'transparent',
    placeholder: 'Firma qui'
};

// ============================================
// UTILITIES
// ============================================

/**
 * Calcola distanza tra due punti
 */
function distance(p1: SignaturePoint, p2: SignaturePoint): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calcola velocità tra due punti (px/ms)
 */
function velocity(p1: SignaturePoint, p2: SignaturePoint): number {
    const dt = p2.timestamp - p1.timestamp;
    if (dt === 0) return 0;
    return distance(p1, p2) / dt;
}

// ============================================
// MAIN COMPONENT
// ============================================

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>((props, ref) => {
    const {
        width = DEFAULT_CONFIG.width,
        height = DEFAULT_CONFIG.height,
        penColor = DEFAULT_CONFIG.penColor,
        penWidth = DEFAULT_CONFIG.penWidth,
        backgroundColor = DEFAULT_CONFIG.backgroundColor,
        enableBiometric = false,
        savedSignatureUrl,
        showControls = true,
        placeholder = DEFAULT_CONFIG.placeholder,
        disabled = false,
        onChange,
        onError,
        className = ''
    } = props;

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    /** Avoids stale-closure over isDrawing state in pointer move handler */
    const drawingActive = useRef(false);

    // State
    const [isDrawing, setIsDrawing] = useState(false);
    const [strokes, setStrokes] = useState<SignaturePoint[][]>([]);
    const [currentStroke, setCurrentStroke] = useState<SignaturePoint[]>([]);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [showSavedSignature, setShowSavedSignature] = useState(false);

    // P65-fix: Track empty state to notify parent WITHOUT calling onChange inside a setState callback
    // (calling a parent setState setter inside a child setState setter triggers React warning)
    const isEmptyState = strokes.length === 0 && !showSavedSignature;
    const prevIsEmptyRef = useRef(isEmptyState);
    useEffect(() => {
        if (isEmptyState !== prevIsEmptyRef.current) {
            prevIsEmptyRef.current = isEmptyState;
            onChange?.(isEmptyState);
        }
    }, [isEmptyState, onChange]);

    // ============================================
    // CANVAS SETUP
    // ============================================

    /**
     * Inizializza canvas e dimensioni
     */
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width: w } = entry.contentRect;
                const h = typeof height === 'number' ? height : parseInt(height);

                // Set canvas size (accounting for device pixel ratio)
                const dpr = window.devicePixelRatio || 1;
                canvas.width = w * dpr;
                canvas.height = h * dpr;
                canvas.style.width = `${w}px`;
                canvas.style.height = `${h}px`;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.scale(dpr, dpr);
                    // Restore strokes after resize
                    redrawCanvas();
                }

                setCanvasSize({ width: w, height: h });
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [height]);

    /**
     * Ridisegna tutti gli stroke sul canvas
     */
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas (transparent background for PNG export)
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

        // Configure pen
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw all strokes
        strokes.forEach(stroke => {
            if (stroke.length < 2) return;

            ctx.beginPath();
            ctx.moveTo(stroke[0].x, stroke[0].y);

            for (let i = 1; i < stroke.length; i++) {
                // Use quadratic curves for smooth lines
                const prevPoint = stroke[i - 1];
                const currentPoint = stroke[i];
                const midX = (prevPoint.x + currentPoint.x) / 2;
                const midY = (prevPoint.y + currentPoint.y) / 2;

                ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, midX, midY);
            }

            ctx.stroke();
        });
    }, [strokes, penColor, penWidth, canvasSize]);

    useEffect(() => {
        redrawCanvas();
    }, [redrawCanvas]);

    // ============================================
    // DRAWING HANDLERS
    // ============================================

    /**
     * Ottieni coordinate relative al canvas da un PointerEvent
     * Pointer Events supportano pressure nativa (stylus), migliore di Touch.
     */
    const getPointerCoordinates = useCallback((e: React.PointerEvent<HTMLCanvasElement>): SignaturePoint | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            // e.pressure is available natively for stylus; mouse returns 0.5 when button down
            pressure: e.pressure > 0 ? e.pressure : 0.5,
            timestamp: Date.now()
        };
    }, []);

    /**
     * Inizia disegno
     */
    const startDrawing = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (disabled) return;
        e.preventDefault();
        // Capture pointer: move events keep firing even when cursor leaves canvas
        (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
        const point = getPointerCoordinates(e);
        if (!point) return;
        drawingActive.current = true;
        setIsDrawing(true);
        setCurrentStroke([point]);
    }, [disabled, getPointerCoordinates]);

    /**
     * Continua disegno
     */
    const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        // Use ref instead of isDrawing state to avoid stale closures
        if (!drawingActive.current || disabled) return;
        e.preventDefault();
        const point = getPointerCoordinates(e);
        if (!point) return;
        setCurrentStroke(prev => {
            // Draw immediately to canvas for responsive feel
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx && prev.length > 0) {
                ctx.strokeStyle = penColor;
                ctx.lineWidth = penWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                const lastPt = prev[prev.length - 1];
                ctx.beginPath();
                ctx.moveTo(lastPt.x, lastPt.y);
                ctx.lineTo(point.x, point.y);
                ctx.stroke();
            }
            return [...prev, point];
        });
    }, [disabled, getPointerCoordinates, penColor, penWidth]);

    /**
     * Termina disegno
     */
    const endDrawing = useCallback(() => {
        if (!drawingActive.current) return;
        drawingActive.current = false;
        setIsDrawing(false);
        setCurrentStroke(prev => {
            if (prev.length > 1) {
                setStrokes(s => [...s, prev]);
                // onChange is handled via useEffect watching isEmptyState (avoids calling parent setState inside setState)
            }
            return [];
        });
    }, []);

    // ============================================
    // CONTROLS
    // ============================================

    /**
     * Pulisci canvas
     */
    const clear = useCallback(() => {
        setStrokes([]);
        setCurrentStroke([]);
        setShowSavedSignature(false);
        // onChange is handled via useEffect watching isEmptyState

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        }
    }, [canvasSize]);

    /**
     * Undo ultimo stroke
     */
    const undo = useCallback(() => {
        if (strokes.length === 0) return;

        setStrokes(prev => prev.slice(0, -1));
        // onChange is handled via useEffect watching isEmptyState
    }, [strokes.length]);

    /**
     * Verifica se canvas è vuoto
     */
    const isEmpty = useCallback(() => {
        return strokes.length === 0 && !showSavedSignature;
    }, [strokes.length, showSavedSignature]);

    /**
     * Carica immagine firma
     */
    const loadImage = useCallback((imageUrl: string) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            // Clear and draw image centered
            ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

            // Scale to fit
            const scale = Math.min(
                canvasSize.width / img.width,
                canvasSize.height / img.height
            ) * 0.9;

            const x = (canvasSize.width - img.width * scale) / 2;
            const y = (canvasSize.height - img.height * scale) / 2;

            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            setShowSavedSignature(true);
            // onChange is handled via useEffect watching isEmptyState
        };

        img.onerror = () => {
            onError?.(new Error('Errore nel caricamento dell\'immagine della firma'));
        };

        img.src = imageUrl;
    }, [canvasSize, onError]);

    /**
     * Ottieni dati firma
     */
    const getSignatureData = useCallback((format: 'png' | 'svg' = 'png'): SignatureData => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return {
                imageBase64: '',
                imageFormat: format,
                width: 0,
                height: 0,
                isEmpty: true,
                timestamp: new Date()
            };
        }

        // Get base64 image
        const imageBase64 = canvas.toDataURL(
            format === 'png' ? 'image/png' : 'image/svg+xml'
        ).replace(/^data:image\/(png|svg\+xml);base64,/, '');

        // Calculate biometric data if enabled
        let biometricData: BiometricData | undefined;

        if (enableBiometric && strokes.length > 0) {
            const allPoints = strokes.flat();
            const velocities: number[] = [];
            let totalPressure = 0;

            for (let i = 1; i < allPoints.length; i++) {
                velocities.push(velocity(allPoints[i - 1], allPoints[i]));
                totalPressure += allPoints[i].pressure;
            }

            biometricData = {
                points: allPoints,
                totalTime: allPoints.length > 0
                    ? allPoints[allPoints.length - 1].timestamp - allPoints[0].timestamp
                    : 0,
                averagePressure: totalPressure / Math.max(allPoints.length - 1, 1),
                velocityProfile: velocities,
                strokeCount: strokes.length
            };
        }

        return {
            imageBase64,
            imageFormat: format,
            width: canvasSize.width,
            height: canvasSize.height,
            biometricData,
            isEmpty: isEmpty(),
            timestamp: new Date()
        };
    }, [canvasSize, strokes, enableBiometric, isEmpty]);

    // ============================================
    // EXPOSE REF METHODS
    // ============================================

    useImperativeHandle(ref, () => ({
        getSignatureData,
        clear,
        isEmpty,
        loadImage
    }), [getSignatureData, clear, isEmpty, loadImage]);

    // ============================================
    // RENDER
    // ============================================

    return (
        <div
            ref={containerRef}
            className={`relative ${className}`}
            style={{ width }}
        >
            {/* Canvas */}
            <canvas
                ref={canvasRef}
                className={`
                    border-2 border-dashed border-gray-300 rounded-lg
                    ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair'}
                    ${isDrawing ? 'border-teal-500' : 'hover:border-gray-400'}
                    transition-colors touch-none
                `}
                style={{
                    backgroundColor: '#ffffff',
                    display: 'block',
                    touchAction: 'none'
                }}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={endDrawing}
                onPointerCancel={endDrawing}
            />

            {/* Placeholder */}
            {isEmpty() && !disabled && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-gray-400 flex flex-col items-center gap-2">
                        <PenTool className="h-8 w-8" />
                        <span className="text-sm">{placeholder}</span>
                    </div>
                </div>
            )}

            {/* Controls */}
            {showControls && !disabled && (
                <div className="absolute bottom-2 right-2 flex gap-1">
                    {savedSignatureUrl && !showSavedSignature && (
                        <button
                            type="button"
                            onClick={() => loadImage(savedSignatureUrl)}
                            className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-teal-600 transition-colors"
                            title="Usa firma salvata"
                        >
                            <History className="h-4 w-4" />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={undo}
                        disabled={strokes.length === 0}
                        className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Annulla ultimo tratto"
                    >
                        <Undo className="h-4 w-4" />
                    </button>

                    <button
                        type="button"
                        onClick={clear}
                        disabled={isEmpty()}
                        className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Cancella tutto"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
});

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
