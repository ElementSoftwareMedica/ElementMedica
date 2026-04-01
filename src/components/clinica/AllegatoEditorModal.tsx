/**
 * AllegatoEditorModal
 * Editor canvas per annotare immagini di allegati clinici
 *
 * Features:
 * - Carica immagine da URL
 * - Strumento penna (freehand)
 * - Strumento testo (click per inserire)
 * - Timbro medico — template precompilato
 * - Undo (Ctrl+Z / pulsante)
 * - Esporta canvas modificato come blob → callback onSave
 *
 * Note: Solo per immagini (JPEG/PNG). I PDF devono essere prima convertiti.
 *
 * @module components/clinica/AllegatoEditorModal
 * @version 1.0.0 - R20
 */

import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
} from 'react';
import {
    X,
    Pen,
    Type,
    Stamp,
    Undo2,
    Trash2,
    Download,
    Save,
    Loader2,
    Minus,
    Plus,
} from 'lucide-react';
import type { AllegatoQuickLookItem } from './AllegatoQuickLookModal';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface AllegatoEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    allegato: AllegatoQuickLookItem | null;
    /** Nome medico per il timbro automatico */
    medicoNome?: string;
    /** Specialità medico per il timbro */
    medicoSpecialita?: string;
    /** Callback invocata con il blob dell'immagine modificata */
    onSave?: (blob: Blob, fileName: string) => Promise<void>;
}

type Tool = 'pen' | 'text' | 'stamp';

interface TextAnnotation {
    x: number;
    y: number;
    text: string;
    color: string;
    fontSize: number;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const COLORS = ['#000000', '#1d4ed8', '#dc2626', '#16a34a', '#7c3aed', '#d97706'];
const FONT_SIZES = [12, 14, 16, 20, 24, 32];

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export const AllegatoEditorModal: React.FC<AllegatoEditorModalProps> = ({
    isOpen,
    onClose,
    allegato,
    medicoNome = '',
    medicoSpecialita = '',
    onSave,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [tool, setTool] = useState<Tool>('pen');
    const [penColor, setPenColor] = useState('#000000');
    const [penSize, setPenSize] = useState(3);
    const [textColor, setTextColor] = useState('#000000');
    const [fontSize, setFontSize] = useState(16);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [textMode, setTextMode] = useState<{ x: number; y: number } | null>(null);
    const [textInput, setTextInput] = useState('');
    const [pendingTextAnnotation, setPendingTextAnnotation] = useState<TextAnnotation | null>(null);

    // History for undo
    const historyRef = useRef<ImageData[]>([]);
    const baseImageRef = useRef<HTMLImageElement | null>(null);

    const saveHistory = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Keep last 20 states
        if (historyRef.current.length >= 20) historyRef.current.shift();
        historyRef.current.push(snapshot);
    }, []);

    const undo = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        if (historyRef.current.length > 1) {
            historyRef.current.pop(); // Remove current
            const prev = historyRef.current[historyRef.current.length - 1];
            ctx.putImageData(prev, 0, 0);
        }
    }, []);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        if (baseImageRef.current) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(baseImageRef.current, 0, 0, canvas.width, canvas.height);
            historyRef.current = [];
            saveHistory();
        }
    }, [saveHistory]);

    // Load image onto canvas
    useEffect(() => {
        if (!isOpen || !allegato?.url) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setImageLoaded(false);
        historyRef.current = [];

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Scale image to max 900x700
            const maxW = 900;
            const maxH = 700;
            let { width, height } = img;
            if (width > maxW) { height = (height * maxW) / width; width = maxW; }
            if (height > maxH) { width = (width * maxH) / height; height = maxH; }
            canvas.width = Math.round(width);
            canvas.height = Math.round(height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            baseImageRef.current = img;
            saveHistory();
            setImageLoaded(true);
        };
        img.onerror = () => setImageLoaded(false);
        img.src = allegato.url;
    }, [isOpen, allegato?.url, saveHistory]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                undo();
            }
        };
        if (isOpen) window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, undo]);

    // ── Drawing helpers ──
    const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!imageLoaded) return;
        const { x, y } = getPos(e);

        if (tool === 'text') {
            // Enter text placement mode
            setTextMode({ x, y });
            setTextInput('');
            return;
        }

        setIsDrawing(true);
        saveHistory();
        const ctx = canvasRef.current!.getContext('2d')!;
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || tool !== 'pen') return;
        const { x, y } = getPos(e);
        const ctx = canvasRef.current!.getContext('2d')!;
        ctx.lineTo(x, y);
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    };

    const handleMouseUp = () => {
        if (isDrawing) setIsDrawing(false);
    };

    const applyTextAnnotation = () => {
        if (!textMode || !textInput.trim()) {
            setTextMode(null);
            return;
        }
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        saveHistory();
        ctx.font = `${fontSize}px 'Arial', sans-serif`;
        ctx.fillStyle = textColor;
        ctx.fillText(textInput, textMode.x, textMode.y);
        setTextMode(null);
        setTextInput('');
    };

    const applyStamp = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const x = 20;
        const y = canvas.height - 80;
        const lines = [
            medicoNome ? `Dott. ${medicoNome}` : 'Dott. _______________',
            'Medico Chirurgo',
            medicoSpecialita ? `Specialista in ${medicoSpecialita}` : '',
            `Data: ${new Date().toLocaleDateString('it-IT')}`,
        ].filter(Boolean);

        saveHistory();
        ctx.save();
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 5, y - 20, 220, lines.length * 20 + 10);
        ctx.font = '12px Arial';
        ctx.fillStyle = '#1d4ed8';
        lines.forEach((line, i) => {
            ctx.fillText(line, x, y + i * 20);
        });
        ctx.restore();
    };

    const handleSave = async () => {
        const canvas = canvasRef.current;
        if (!canvas || !onSave) return;
        setIsSaving(true);
        try {
            canvas.toBlob(async (blob) => {
                if (blob) {
                    await onSave(blob, `${allegato?.nome ?? 'annotato'}.png`);
                }
                setIsSaving(false);
            }, 'image/png');
        } catch {
            setIsSaving(false);
        }
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${allegato?.nome ?? 'annotato'}.png`;
        link.click();
    };

    if (!isOpen || !allegato) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[970px] mx-4 max-h-[95vh] flex flex-col overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center">
                            <Pen className="w-4 h-4 text-teal-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">Editor Allegato</p>
                            <p className="text-xs text-gray-500">{allegato.nome}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onSave && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !imageLoaded}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                            >
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Salva
                            </button>
                        )}
                        <button
                            onClick={handleDownload}
                            disabled={!imageLoaded}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Scarica
                        </button>
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Toolbar */}
                    <div className="w-52 border-r border-gray-200 flex-shrink-0 bg-gray-50 p-3 space-y-4 overflow-y-auto">

                        {/* Tools */}
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Strumento</p>
                            <div className="space-y-1">
                                {([
                                    { id: 'pen' as Tool, icon: Pen, label: 'Penna' },
                                    { id: 'text' as Tool, icon: Type, label: 'Testo' },
                                    { id: 'stamp' as Tool, icon: Stamp, label: 'Timbro' },
                                ] as const).map(({ id, icon: Icon, label }) => (
                                    <button
                                        key={id}
                                        onClick={() => id === 'stamp' ? applyStamp() : setTool(id)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${tool === id && id !== 'stamp'
                                                ? 'bg-teal-100 text-teal-700 border border-teal-200'
                                                : 'text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {label}
                                        {id === 'stamp' && <span className="ml-auto text-[10px] text-gray-400">click</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pen settings */}
                        {tool === 'pen' && (
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Penna</p>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {COLORS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setPenColor(c)}
                                            style={{ background: c }}
                                            className={`w-6 h-6 rounded-full border-2 transition-transform ${penColor === c ? 'border-gray-700 scale-110' : 'border-white'}`}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setPenSize(s => Math.max(1, s - 1))} className="p-1 hover:bg-gray-200 rounded">
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs text-gray-600 flex-1 text-center">{penSize}px</span>
                                    <button onClick={() => setPenSize(s => Math.min(20, s + 1))} className="p-1 hover:bg-gray-200 rounded">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Text settings */}
                        {tool === 'text' && (
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Testo</p>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {COLORS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setTextColor(c)}
                                            style={{ background: c }}
                                            className={`w-6 h-6 rounded-full border-2 transition-transform ${textColor === c ? 'border-gray-700 scale-110' : 'border-white'}`}
                                        />
                                    ))}
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 mb-1">Dimensione</p>
                                    <div className="flex flex-wrap gap-1">
                                        {FONT_SIZES.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setFontSize(s)}
                                                className={`px-2 py-0.5 text-xs rounded border transition-colors ${fontSize === s ? 'bg-teal-100 border-teal-300 text-teal-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Undo / Clear */}
                        <div className="space-y-1">
                            <button onClick={undo} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                                <Undo2 className="w-4 h-4" />
                                Annulla (Ctrl+Z)
                            </button>
                            <button onClick={clearCanvas} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                                Ripristina originale
                            </button>
                        </div>
                    </div>

                    {/* Canvas area */}
                    <div
                        ref={containerRef}
                        className="flex-1 overflow-auto bg-gray-200/60 flex items-start justify-center p-4 relative"
                    >
                        {!imageLoaded && allegato.url && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        )}
                        {!allegato.url && (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                Nessuna immagine da modificare
                            </div>
                        )}
                        {/* Text input overlay when placing text */}
                        {textMode && (
                            <div className="absolute left-0 top-0 w-full h-full" style={{ zIndex: 10 }}>
                                <div
                                    className="absolute bg-white border border-teal-400 rounded-lg shadow-lg p-2 min-w-[200px]"
                                    style={{ left: `${textMode.x / 4}px`, top: `${textMode.y / 4}px` }}
                                >
                                    <input
                                        type="text"
                                        autoFocus
                                        value={textInput}
                                        onChange={e => setTextInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') applyTextAnnotation();
                                            if (e.key === 'Escape') setTextMode(null);
                                        }}
                                        className="text-sm outline-none border-none w-full"
                                        style={{ color: textColor, fontSize: `${Math.max(12, fontSize * 0.6)}px` }}
                                        placeholder="Scrivi testo → Invio per confermare"
                                    />
                                    <div className="flex gap-2 mt-1.5 justify-end">
                                        <button onClick={() => setTextMode(null)} className="text-xs text-gray-500 hover:text-gray-700">Annulla</button>
                                        <button onClick={applyTextAnnotation} className="text-xs text-teal-600 hover:text-teal-700 font-medium">OK</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <canvas
                            ref={canvasRef}
                            className={`shadow-lg max-w-full ${tool === 'pen' ? 'cursor-crosshair' : tool === 'text' ? 'cursor-text' : 'cursor-default'}`}
                            style={{ display: imageLoaded ? 'block' : 'none', maxHeight: '70vh' }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AllegatoEditorModal;
