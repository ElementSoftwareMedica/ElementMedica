/**
 * SignaturePad — Componente hover per la firma digitale su canvas.
 *
 * Supporta mouse e touch (tablet). Espone il metodo `toDataURL()` per
 * estrarre la firma come base64 PNG tramite una ref sul canvas.
 *
 * @example
 * const padRef = useRef<SignaturePadHandle>(null);
 * const signature = padRef.current?.toDataURL();
 * const isEmpty = padRef.current?.isEmpty();
 *
 * @module components/ui/SignaturePad
 */

import React, {
    useRef,
    useEffect,
    useCallback,
    useState,
    forwardRef,
    useImperativeHandle,
} from 'react';
import { RotateCcw } from 'lucide-react';

export interface SignaturePadHandle {
    /** Restituisce la firma come data URL (base64 PNG) */
    toDataURL: () => string | null;
    /** True se il canvas è vuoto */
    isEmpty: () => boolean;
    /** Pulisce il canvas */
    clear: () => void;
}

interface SignaturePadProps {
    /** Classe CSS aggiuntiva per il contenitore */
    className?: string;
    /** Larghezza canvas (default: 100% del contenitore) */
    width?: number;
    /** Altezza canvas in px (default: 180) */
    height?: number;
    /** Colore del tratto (default: '#1e293b') */
    penColor?: string;
    /** Spessore linea in px (default: 2.5) */
    lineWidth?: number;
    /** Callback invocata ogni volta che viene tracciato un segno */
    onChange?: () => void;
    /** Placeholder testuale visibile quando il canvas è vuoto */
    placeholder?: string;
}

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
    (
        {
            className = '',
            height = 180,
            penColor = '#1e293b',
            lineWidth = 2.5,
            onChange,
            placeholder = 'Firma qui',
        },
        ref
    ) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const isDrawing = useRef(false);
        const [empty, setEmpty] = useState(true);

        const getCtx = useCallback(() => canvasRef.current?.getContext('2d') ?? null, []);

        const getPos = useCallback(
            (e: { clientX: number; clientY: number }): { x: number; y: number } => {
                const canvas = canvasRef.current!;
                const rect = canvas.getBoundingClientRect();
                // ctx.scale(dpr, dpr) already maps CSS pixels → physical pixels.
                // Return raw CSS coordinates — do NOT multiply by canvas.width/rect.width.
                return {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                };
            },
            []
        );

        const clear = useCallback(() => {
            const canvas = canvasRef.current;
            const ctx = getCtx();
            if (!canvas || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setEmpty(true);
        }, [getCtx]);

        const toDataURL = useCallback((): string | null => {
            if (!canvasRef.current || empty) return null;
            return canvasRef.current.toDataURL('image/png');
        }, [empty]);

        const isEmpty = useCallback(() => empty, [empty]);

        useImperativeHandle(ref, () => ({ toDataURL, isEmpty, clear }), [
            toDataURL,
            isEmpty,
            clear,
        ]);

        // Inizializzazione canvas responsivo
        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const parent = canvas.parentElement;
            if (!parent) return;

            const resizeObserver = new ResizeObserver(() => {
                const dpr = window.devicePixelRatio || 1;
                const w = parent.clientWidth;
                canvas.width = w * dpr;
                canvas.height = height * dpr;
                canvas.style.width = `${w}px`;
                canvas.style.height = `${height}px`;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Reset transform first to prevent scale accumulation on repeated resizes
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.scale(dpr, dpr);
                    ctx.strokeStyle = penColor;
                    ctx.lineWidth = lineWidth;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                }
                setEmpty(true);
            });

            resizeObserver.observe(parent);
            return () => resizeObserver.disconnect();
        }, [height, penColor, lineWidth]);
        const onMouseDown = useCallback(
            (e: React.MouseEvent<HTMLCanvasElement>) => {
                const ctx = getCtx();
                if (!ctx) return;
                isDrawing.current = true;
                const pos = getPos(e.nativeEvent);
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.strokeStyle = penColor;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            },
            [getCtx, getPos, penColor, lineWidth]
        );

        const onMouseMove = useCallback(
            (e: React.MouseEvent<HTMLCanvasElement>) => {
                if (!isDrawing.current) return;
                const ctx = getCtx();
                if (!ctx) return;
                const pos = getPos(e.nativeEvent);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            },
            [getCtx, getPos]
        );

        const onMouseUp = useCallback(() => {
            if (!isDrawing.current) return;
            isDrawing.current = false;
            setEmpty(false);
            onChange?.();
        }, [onChange]);

        // Event handlers (touch)
        const onTouchStart = useCallback(
            (e: React.TouchEvent<HTMLCanvasElement>) => {
                e.preventDefault();
                const ctx = getCtx();
                if (!ctx) return;
                isDrawing.current = true;
                const touch = e.touches[0];
                const pos = getPos(touch);
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.strokeStyle = penColor;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            },
            [getCtx, getPos, penColor, lineWidth]
        );

        const onTouchMove = useCallback(
            (e: React.TouchEvent<HTMLCanvasElement>) => {
                e.preventDefault();
                if (!isDrawing.current) return;
                const ctx = getCtx();
                if (!ctx) return;
                const touch = e.touches[0];
                const pos = getPos(touch);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            },
            [getCtx, getPos]
        );

        const onTouchEnd = useCallback(
            (e: React.TouchEvent<HTMLCanvasElement>) => {
                e.preventDefault();
                if (!isDrawing.current) return;
                isDrawing.current = false;
                setEmpty(false);
                onChange?.();
            },
            [onChange]
        );

        return (
            <div className={`relative select-none ${className}`}>
                {/* Canvas area */}
                <div
                    className="relative rounded-xl border-2 border-dashed overflow-hidden transition-colors"
                    style={{
                        borderColor: empty ? '#cbd5e1' : '#0d9488',
                        background: '#fafafa',
                    }}
                >
                    {/* Placeholder */}
                    {empty && (
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <svg
                                className="h-8 w-8 text-gray-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <p className="text-sm text-gray-400 font-medium">{placeholder}</p>
                        </div>
                    )}

                    <canvas
                        ref={canvasRef}
                        className="block touch-none cursor-crosshair"
                        style={{ height: `${height}px` }}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    />
                </div>

                {/* Clear button */}
                {!empty && (
                    <button
                        type="button"
                        onClick={clear}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-red-50 hover:border-red-300 text-gray-400 hover:text-red-500 transition-colors"
                        title="Cancella firma"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        );
    }
);

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
