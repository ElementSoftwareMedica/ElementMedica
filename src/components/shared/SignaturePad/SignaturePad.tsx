import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Eraser, Pen, RotateCcw } from 'lucide-react';
import { cn } from '@/design-system/utils';
import { Button } from '@/components/ui/button';

export interface SignaturePadRef {
    clear: () => void;
    toDataURL: () => string | null;
    isEmpty: () => boolean;
}

export interface SignaturePadProps {
    /** Callback when signature changes */
    onChange?: (signatureBase64: string | null) => void;
    /** Initial signature value (base64) */
    value?: string | null;
    /** Whether the pad is disabled */
    disabled?: boolean;
    /** Canvas width in pixels */
    width?: number;
    /** Canvas height in pixels */
    height?: number;
    /** Pen color (CSS color) */
    penColor?: string;
    /** Background color (CSS color) */
    backgroundColor?: string;
    /** Label shown above the pad */
    label?: string;
    /** Whether signature is required */
    required?: boolean;
    /** Pen stroke width */
    penWidth?: number;
    /** Show clear button */
    showClearButton?: boolean;
    /** Placeholder text when empty */
    placeholder?: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * SignaturePad - Componente per firma digitale su canvas
 * 
 * Supporta:
 * - Touch e mouse input
 * - Salvataggio/caricamento firma in base64
 * - Responsivo con resize
 * - Accessibilità
 * 
 * @example
 * ```tsx
 * const [signature, setSignature] = useState<string | null>(null);
 * 
 * <SignaturePad
 *   label="Firma Paziente"
 *   required
 *   onChange={setSignature}
 *   value={signature}
 * />
 * ```
 */
export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
    (
        {
            onChange,
            value,
            disabled = false,
            width = 400,
            height = 200,
            penColor = '#000000',
            backgroundColor = '#ffffff',
            label,
            required = false,
            penWidth = 2,
            showClearButton = true,
            placeholder = 'Firma qui...',
            className,
        },
        ref
    ) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const contextRef = useRef<CanvasRenderingContext2D | null>(null);
        const [isDrawing, setIsDrawing] = useState(false);
        const [isEmpty, setIsEmpty] = useState(true);
        const lastPoint = useRef<{ x: number; y: number } | null>(null);

        // Initialize canvas
        const initCanvas = useCallback(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Setup canvas for high DPI displays
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = penColor;
            ctx.lineWidth = penWidth;

            // Fill background
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);

            contextRef.current = ctx;
        }, [width, height, penColor, penWidth, backgroundColor]);

        // Load initial value
        const loadValue = useCallback(() => {
            if (!value || !canvasRef.current || !contextRef.current) return;

            const img = new Image();
            img.onload = () => {
                const ctx = contextRef.current;
                if (!ctx) return;

                // Clear and draw image
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                setIsEmpty(false);
            };
            img.src = value;
        }, [value, width, height, backgroundColor]);

        // Initialize on mount
        useEffect(() => {
            initCanvas();
        }, [initCanvas]);

        // Load value when it changes
        useEffect(() => {
            if (value) {
                loadValue();
            } else {
                clear();
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [value]);

        // Get point from pointer event
        const getPointerPoint = useCallback(
            (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
                const canvas = canvasRef.current;
                if (!canvas) return { x: 0, y: 0 };
                const rect = canvas.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                return {
                    x: Math.max(0, Math.min(canvas.width / dpr, e.clientX - rect.left)),
                    y: Math.max(0, Math.min(canvas.height / dpr, e.clientY - rect.top)),
                };
            },
            []
        );

        // Start drawing
        const startDrawing = useCallback(
            (e: React.PointerEvent<HTMLCanvasElement>) => {
                if (disabled) return;
                e.preventDefault();
                // Capture pointer: move events keep firing even when cursor leaves canvas
                (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
                const point = getPointerPoint(e);
                lastPoint.current = point;
                setIsDrawing(true);
            },
            [disabled, getPointerPoint]
        );

        // Draw
        const draw = useCallback(
            (e: React.PointerEvent<HTMLCanvasElement>) => {
                // Use lastPoint ref as guard (avoids stale-closure over isDrawing state)
                if (!lastPoint.current || disabled || !contextRef.current) return;
                e.preventDefault();
                const ctx = contextRef.current;
                const point = getPointerPoint(e);
                ctx.beginPath();
                ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
                ctx.lineTo(point.x, point.y);
                ctx.stroke();
                lastPoint.current = point;
                setIsEmpty(false);
            },
            [disabled, getPointerPoint]
        );

        // Stop drawing
        const stopDrawing = useCallback(() => {
            if (!lastPoint.current) return;
            lastPoint.current = null;
            setIsDrawing(false);
            // Notify parent of change
            if (onChange && canvasRef.current) {
                const dataUrl = canvasRef.current.toDataURL('image/png');
                onChange(dataUrl);
            }
        }, [onChange]);

        // Clear canvas
        const clear = useCallback(() => {
            const ctx = contextRef.current;
            if (!ctx) return;

            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);
            setIsEmpty(true);

            if (onChange) {
                onChange(null);
            }
        }, [width, height, backgroundColor, onChange]);

        // Get data URL
        const toDataURL = useCallback((): string | null => {
            if (isEmpty || !canvasRef.current) return null;
            return canvasRef.current.toDataURL('image/png');
        }, [isEmpty]);

        // Check if empty
        const checkIsEmpty = useCallback((): boolean => {
            return isEmpty;
        }, [isEmpty]);

        // Expose methods via ref
        useImperativeHandle(
            ref,
            () => ({
                clear,
                toDataURL,
                isEmpty: checkIsEmpty,
            }),
            [clear, toDataURL, checkIsEmpty]
        );

        return (
            <div className={cn('flex flex-col gap-2', className)}>
                {/* Label */}
                {label && (
                    <label className="text-sm font-medium text-gray-700">
                        {label}
                        {required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}

                {/* Canvas Container */}
                <div
                    className={cn(
                        'relative rounded-lg border-2 border-dashed transition-colors',
                        disabled ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-gray-400',
                        !disabled && isDrawing && 'border-teal-500'
                    )}
                >
                    {/* Canvas */}
                    <canvas
                        ref={canvasRef}
                        className={cn(
                            'touch-none rounded-lg',
                            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair'
                        )}
                        style={{ touchAction: 'none' }}
                        onPointerDown={startDrawing}
                        onPointerMove={draw}
                        onPointerUp={stopDrawing}
                        onPointerCancel={stopDrawing}
                    />

                    {/* Placeholder */}
                    {isEmpty && !disabled && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="flex items-center gap-2 text-gray-400">
                                <Pen className="h-5 w-5" />
                                <span>{placeholder}</span>
                            </div>
                        </div>
                    )}

                    {/* Drawing Indicator */}
                    {isDrawing && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-teal-500 text-white text-xs px-2 py-1 rounded-full">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <span>Disegno...</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {showClearButton && !disabled && (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clear}
                            disabled={isEmpty}
                            className="gap-2"
                        >
                            <Eraser className="h-4 w-4" />
                            Cancella
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                initCanvas();
                                loadValue();
                            }}
                            disabled={!value}
                            className="gap-2"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Ripristina
                        </Button>
                        {!isEmpty && (
                            <span className="text-xs text-green-600 ml-auto flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                Firma presente
                            </span>
                        )}
                    </div>
                )}

                {/* Validation message */}
                {required && isEmpty && (
                    <p className="text-xs text-red-500">Firma obbligatoria</p>
                )}
            </div>
        );
    }
);

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
