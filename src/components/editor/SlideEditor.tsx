/**
 * SlideEditor - Editor per creare slide/presentazioni con elementi posizionabili
 * 
 * Permette di creare slide con:
 * - Caselle di testo posizionabili e ridimensionabili con rich text editing
 * - Immagini posizionabili e ridimensionabili
 * - Forme base (rettangoli, cerchi, linee, frecce)
 * - Drag & Drop per tutti gli elementi
 * - Grid snap opzionale
 * - Area di stampa visibile
 * - Controllo z-order (primo piano/sfondo)
 * - Rotazione elementi con gestione corretta del drag
 */

import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
    Type, Image, Square, Circle, Trash2, Copy,
    AlignLeft, AlignCenter, AlignRight,
    ChevronUp, ChevronDown, Lock, Unlock, Grid,
    Plus, Minus, Layers,
    ArrowRight, MoveHorizontal,
    Maximize2, ChevronsUp, ChevronsDown,
    RotateCw, Bold, Italic, Underline,
    QrCode
} from 'lucide-react';
import MediaPickerModal from '../../pages/settings/templates/components/editor/MediaPickerModal';
import HexColorInput from './HexColorInput';

// ContentEditableText - Controlled component that doesn't re-render on input
// This prevents cursor jumping by not using dangerouslySetInnerHTML during editing
interface ContentEditableTextProps {
    elementId: string;
    initialContent: string;
    style?: {
        textAlign?: 'left' | 'center' | 'right';
    };
    onSave: (html: string) => void;
    onBlur: () => void;
    onMouseUp: () => void;
    onEscape: () => void;
}

const ContentEditableText = memo(({
    elementId,
    initialContent,
    style,
    onSave,
    onBlur,
    onMouseUp,
    onEscape
}: ContentEditableTextProps) => {
    const divRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<string>(initialContent);

    // Initialize content only once when component mounts
    useEffect(() => {
        if (divRef.current && divRef.current.innerHTML !== initialContent) {
            divRef.current.innerHTML = initialContent;
        }
        // Focus after mount
        divRef.current?.focus();
    }, []); // Empty deps - run only on mount

    const handleInput = useCallback(() => {
        if (divRef.current) {
            contentRef.current = divRef.current.innerHTML;
        }
    }, []);

    const handleBlur = useCallback(() => {
        // Save content to parent state only on blur
        onSave(contentRef.current);
        onBlur();
    }, [onSave, onBlur]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Escape to exit editing
        if (e.key === 'Escape') {
            onSave(contentRef.current);
            onEscape();
            e.preventDefault();
            return;
        }
        // Handle Enter key to insert line break
        if (e.key === 'Enter') {
            e.preventDefault();
            // Use insertHTML with <br> tags for reliable line breaks
            // Double br creates a visible paragraph break
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();

                // Insert br element
                const br = document.createElement('br');
                range.insertNode(br);

                // If shift is pressed, add double br for paragraph break
                if (e.shiftKey) {
                    const br2 = document.createElement('br');
                    range.insertNode(br2);
                }

                // Move cursor after the br
                range.setStartAfter(br);
                range.setEndAfter(br);
                selection.removeAllRanges();
                selection.addRange(range);

                // Update content ref
                if (divRef.current) {
                    contentRef.current = divRef.current.innerHTML;
                }
            }
            return;
        }
        // Handle Ctrl+B/I/U for formatting
        if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
            e.stopPropagation();
            document.execCommand(
                e.key.toLowerCase() === 'b' ? 'bold' :
                    e.key.toLowerCase() === 'i' ? 'italic' : 'underline'
            );
            e.preventDefault();
        }
    }, [onSave, onEscape]);

    return (
        <div
            ref={divRef}
            contentEditable
            suppressContentEditableWarning
            data-element-id={elementId}
            onInput={handleInput}
            onBlur={handleBlur}
            onMouseUp={onMouseUp}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                font: 'inherit',
                color: 'inherit',
                textAlign: style?.textAlign || 'left',
                cursor: 'text',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}
        />
    );
});

ContentEditableText.displayName = 'ContentEditableText';

// Types
interface SlideElement {
    id: string;
    type: 'text' | 'image' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'qrcode';
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    content?: string;
    src?: string;
    style?: {
        backgroundColor?: string;
        borderColor?: string;
        borderWidth?: number;
        borderRadius?: number;
        fontSize?: number;
        fontFamily?: string;
        color?: string;
        textAlign?: 'left' | 'center' | 'right';
        fontWeight?: 'normal' | 'bold';
        fontStyle?: 'normal' | 'italic';
        lineWidth?: number;
        lineStyle?: 'solid' | 'dashed' | 'dotted';
        arrowSize?: number;
    };
    locked?: boolean;
    zIndex: number;
}

interface MarginsConfig {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

interface SlideEditorProps {
    width: string;
    height: string;
    elements: SlideElement[];
    onChange: (elements: SlideElement[]) => void;
    className?: string;
    orientation?: 'portrait' | 'landscape';
    showPrintArea?: boolean;
    margins?: MarginsConfig;
    onMarginsChange?: (margins: MarginsConfig) => void;
}

// Helper to generate unique IDs
const generateId = () => `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Print area margins (in pixels, for A4 at 96dpi)
const PRINT_MARGINS = {
    portrait: { top: 38, right: 38, bottom: 38, left: 38 },
    landscape: { top: 38, right: 38, bottom: 38, left: 38 }
};

// Default styles for new elements
const DEFAULT_STYLES = {
    text: {
        backgroundColor: 'transparent',
        borderColor: '#e2e8f0',
        borderWidth: 0,
        fontSize: 16,
        fontFamily: 'Arial',
        color: '#1e293b',
        textAlign: 'left' as const,
    },
    image: {
        borderColor: '#e2e8f0',
        borderWidth: 0,
        borderRadius: 0,
    },
    rectangle: {
        backgroundColor: '#3b82f6',
        borderColor: '#1d4ed8',
        borderWidth: 2,
        borderRadius: 4,
    },
    ellipse: {
        backgroundColor: '#10b981',
        borderColor: '#059669',
        borderWidth: 2,
    },
    line: {
        borderColor: '#1e293b',
        lineWidth: 2,
        lineStyle: 'solid' as const,
    },
    arrow: {
        borderColor: '#1e293b',
        lineWidth: 2,
        lineStyle: 'solid' as const,
        arrowSize: 10,
    },
    qrcode: {
        backgroundColor: 'transparent',
        borderColor: '#e2e8f0',
        borderWidth: 1,
    },
};

// Default margins in pixels (10mm at 96dpi = ~38px)
const DEFAULT_MARGINS: MarginsConfig = { top: 38, right: 38, bottom: 38, left: 38 };

const SlideEditor: React.FC<SlideEditorProps> = ({
    width,
    height,
    elements,
    onChange,
    className = '',
    orientation = 'portrait',
    showPrintArea = true,
    margins: propMargins,
    onMarginsChange,
}) => {
    // Use controlled margins if provided, otherwise use local state
    const [localMargins, setLocalMargins] = useState<MarginsConfig>(DEFAULT_MARGINS);
    const margins = propMargins ?? localMargins;
    const updateMargins = useCallback((newMargins: MarginsConfig) => {
        if (onMarginsChange) {
            onMarginsChange(newMargins);
        } else {
            setLocalMargins(newMargins);
        }
    }, [onMarginsChange]);
    const canvasRef = useRef<HTMLDivElement>(null);
    const textSelectionRef = useRef<{ range: Range | null; elementId: string | null }>({ range: null, elementId: null });
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [rotationStart, setRotationStart] = useState({ angle: 0, elementRotation: 0 });
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [gridSize] = useState(10);
    const [zoom, setZoom] = useState(100);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [showPrintMargins, setShowPrintMargins] = useState(showPrintArea);

    const selectedElement = elements.find(el => el.id === selectedId);
    const printMargins = margins; // Use dynamic margins from props or local state

    // Save current text selection before color change
    const saveTextSelection = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            textSelectionRef.current = {
                range: selection.getRangeAt(0).cloneRange(),
                elementId: editingTextId
            };
        }
    }, [editingTextId]);

    const snapToGridValue = useCallback((value: number) => {
        if (!snapToGrid) return value;
        return Math.round(value / gridSize) * gridSize;
    }, [snapToGrid, gridSize]);

    const addElement = useCallback((type: SlideElement['type']) => {
        const newElement: SlideElement = {
            id: generateId(),
            type,
            x: 50,
            y: 50,
            width: type === 'text' ? 200 : type === 'line' || type === 'arrow' ? 150 : type === 'qrcode' ? 100 : 150,
            height: type === 'text' ? 50 : type === 'line' || type === 'arrow' ? 4 : type === 'qrcode' ? 100 : 100,
            rotation: 0,
            content: type === 'text' ? 'Nuovo testo' : type === 'qrcode' ? '{{document.qrCode}}' : undefined,
            style: DEFAULT_STYLES[type],
            locked: false,
            zIndex: elements.length,
        };

        if (type === 'image') {
            setShowMediaPicker(true);
            (window as any).__pendingImageElement = newElement;
            return;
        }

        onChange([...elements, newElement]);
        setSelectedId(newElement.id);
    }, [elements, onChange]);

    const handleImageSelect = useCallback((url: string) => {
        const pendingElement = (window as any).__pendingImageElement;
        if (pendingElement) {
            const newElement: SlideElement = {
                ...pendingElement,
                src: url,
            };
            onChange([...elements, newElement]);
            setSelectedId(newElement.id);
            delete (window as any).__pendingImageElement;
        }
        setShowMediaPicker(false);
    }, [elements, onChange]);

    const deleteElement = useCallback(() => {
        if (!selectedId) return;
        onChange(elements.filter(el => el.id !== selectedId));
        setSelectedId(null);
    }, [selectedId, elements, onChange]);

    const duplicateElement = useCallback(() => {
        if (!selectedElement) return;
        const newElement: SlideElement = {
            ...selectedElement,
            id: generateId(),
            x: selectedElement.x + 20,
            y: selectedElement.y + 20,
            zIndex: elements.length,
        };
        onChange([...elements, newElement]);
        setSelectedId(newElement.id);
    }, [selectedElement, elements, onChange]);

    const updateElement = useCallback((id: string, updates: Partial<SlideElement>) => {
        onChange(elements.map(el => el.id === id ? { ...el, ...updates } : el));
    }, [elements, onChange]);

    // Apply color to selected text only using execCommand
    const applyColorToSelection = useCallback((color: string, elementId: string) => {
        const savedSelection = textSelectionRef.current;

        // If we have a saved selection for this element, restore and apply color
        if (savedSelection?.range && savedSelection?.elementId === elementId) {
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(savedSelection.range);
                document.execCommand('foreColor', false, color);
                // Update element content with the new HTML
                const contentDiv = canvasRef.current?.querySelector(`[data-element-id="${elementId}"] [contenteditable]`) as HTMLDivElement;
                if (contentDiv) {
                    onChange(elements.map(el => el.id === elementId ? { ...el, content: contentDiv.innerHTML } : el));
                }
            }
        } else {
            // No selection, apply to entire element style
            const element = elements.find(el => el.id === elementId);
            if (element) {
                onChange(elements.map(el => el.id === elementId ? { ...el, style: { ...el.style, color } } : el));
            }
        }
    }, [elements, onChange]);

    const moveInZOrder = useCallback((direction: 'up' | 'down' | 'top' | 'bottom') => {
        if (!selectedId) return;
        const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
        const index = sorted.findIndex(el => el.id === selectedId);

        if (direction === 'top') {
            sorted[index].zIndex = Math.max(...sorted.map(e => e.zIndex)) + 1;
        } else if (direction === 'bottom') {
            sorted[index].zIndex = Math.min(...sorted.map(e => e.zIndex)) - 1;
        } else if (direction === 'up' && index < sorted.length - 1) {
            const currentZ = sorted[index].zIndex;
            sorted[index].zIndex = sorted[index + 1].zIndex;
            sorted[index + 1].zIndex = currentZ;
        } else if (direction === 'down' && index > 0) {
            const currentZ = sorted[index].zIndex;
            sorted[index].zIndex = sorted[index - 1].zIndex;
            sorted[index - 1].zIndex = currentZ;
        }

        onChange(sorted);
    }, [selectedId, elements, onChange]);

    const handleElementMouseDown = useCallback((e: React.MouseEvent, element: SlideElement) => {
        if (element.locked) return;
        e.stopPropagation();
        e.preventDefault();

        if (!canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const scale = zoom / 100;

        // Per elementi ruotati, calcola offset dal centro dell'elemento
        // invece che dal bounding rect che è distorto dalla rotazione
        const elementCenterX = element.x + element.width / 2;
        const elementCenterY = element.y + element.height / 2;

        // Posizione mouse in coordinate canvas
        const mouseCanvasX = (e.clientX - canvasRect.left) / scale;
        const mouseCanvasY = (e.clientY - canvasRect.top) / scale;

        // Offset dal top-left dell'elemento (più intuitivo per il drag)
        setDragOffset({
            x: mouseCanvasX - element.x,
            y: mouseCanvasY - element.y,
        });
        setSelectedId(element.id);
        setIsDragging(true);
    }, [zoom]);

    const handleRotationMouseDown = useCallback((e: React.MouseEvent, element: SlideElement) => {
        if (element.locked) return;
        e.stopPropagation();
        e.preventDefault();

        if (!canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const scale = zoom / 100;

        // Calculate center of element
        const centerX = canvasRect.left + (element.x + element.width / 2) * scale;
        const centerY = canvasRect.top + (element.y + element.height / 2) * scale;

        // Calculate angle from center to mouse position
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

        setRotationStart({
            angle,
            elementRotation: element.rotation || 0,
        });
        setIsRotating(true);
    }, [zoom]);

    const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeHandle(handle);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!canvasRef.current) return;
            const canvasRect = canvasRef.current.getBoundingClientRect();
            const scale = zoom / 100;

            if (isDragging && selectedId) {
                const element = elements.find(el => el.id === selectedId);
                if (!element || element.locked) return;

                const newX = snapToGridValue((e.clientX - canvasRect.left) / scale - dragOffset.x);
                const newY = snapToGridValue((e.clientY - canvasRect.top) / scale - dragOffset.y);

                // Allow negative X and Y for elements positioned outside visible area
                // This is useful for landscape mode and rotated elements
                updateElement(selectedId, {
                    x: newX,
                    y: newY,
                });
            }

            if (isResizing && selectedId && resizeHandle) {
                const element = elements.find(el => el.id === selectedId);
                if (!element || element.locked) return;

                const mouseX = (e.clientX - canvasRect.left) / scale;
                const mouseY = (e.clientY - canvasRect.top) / scale;

                let newX = element.x;
                let newY = element.y;
                let newWidth = element.width;
                let newHeight = element.height;

                if (resizeHandle.includes('e')) {
                    newWidth = snapToGridValue(Math.max(20, mouseX - element.x));
                }
                if (resizeHandle.includes('w')) {
                    const delta = element.x - snapToGridValue(mouseX);
                    newX = snapToGridValue(mouseX);
                    newWidth = Math.max(20, element.width + delta);
                }
                if (resizeHandle.includes('s')) {
                    newHeight = snapToGridValue(Math.max(4, mouseY - element.y));
                }
                if (resizeHandle.includes('n')) {
                    const delta = element.y - snapToGridValue(mouseY);
                    newY = snapToGridValue(mouseY);
                    newHeight = Math.max(4, element.height + delta);
                }

                updateElement(selectedId, { x: newX, y: newY, width: newWidth, height: newHeight });
            }

            // Handle rotation
            if (isRotating && selectedId) {
                const element = elements.find(el => el.id === selectedId);
                if (!element || element.locked) return;

                // Calculate center of element
                const centerX = canvasRect.left + (element.x + element.width / 2) * scale;
                const centerY = canvasRect.top + (element.y + element.height / 2) * scale;

                // Calculate current angle from center to mouse position
                const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

                // Calculate rotation delta
                const deltaAngle = currentAngle - rotationStart.angle;
                let newRotation = rotationStart.elementRotation + deltaAngle;

                // Snap to 15 degree increments if shift is held, or 45 degrees by default
                if (e.shiftKey) {
                    newRotation = Math.round(newRotation / 15) * 15;
                }

                // Normalize to 0-360
                newRotation = ((newRotation % 360) + 360) % 360;

                updateElement(selectedId, { rotation: newRotation });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
            setIsRotating(false);
            setResizeHandle(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, isRotating, selectedId, resizeHandle, elements, dragOffset, rotationStart, zoom, snapToGridValue, updateElement]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (editingTextId) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedId) {
                    e.preventDefault();
                    deleteElement();
                }
            }
            if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
                if (selectedId) {
                    e.preventDefault();
                    duplicateElement();
                }
            }
            if (e.key === 'Escape') {
                setSelectedId(null);
                setEditingTextId(null);
            }
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedId) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                const element = elements.find(el => el.id === selectedId);
                if (!element || element.locked) return;

                const updates: Partial<SlideElement> = {};
                if (e.key === 'ArrowUp') updates.y = element.y - step;
                if (e.key === 'ArrowDown') updates.y = element.y + step;
                if (e.key === 'ArrowLeft') updates.x = element.x - step;
                if (e.key === 'ArrowRight') updates.x = element.x + step;
                updateElement(selectedId, updates);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, deleteElement, duplicateElement, editingTextId, elements, updateElement]);

    const renderLineElement = (element: SlideElement, isSelected: boolean) => {
        const lineWidth = element.style?.lineWidth || 2;
        const lineColor = element.style?.borderColor || '#1e293b';
        const lineStyle = element.style?.lineStyle || 'solid';
        const isArrow = element.type === 'arrow';
        const arrowSize = element.style?.arrowSize || 10;

        const dashArray = lineStyle === 'dashed' ? '8,4' : lineStyle === 'dotted' ? '2,4' : undefined;

        return (
            <div
                key={element.id}
                style={{
                    position: 'absolute',
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: Math.max(element.height, 20),
                    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                    transformOrigin: 'center center',
                    cursor: element.locked ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab'),
                    zIndex: element.zIndex,
                }}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleElementMouseDown(e, element);
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(element.id);
                }}
            >
                <svg
                    width={element.width}
                    height={Math.max(element.height, 20)}
                    style={{
                        overflow: 'visible',
                        outline: isSelected ? '2px solid #3b82f6' : undefined,
                        outlineOffset: '2px',
                        pointerEvents: 'none',
                    }}
                >
                    {isArrow && (
                        <defs>
                            <marker
                                id={`arrowhead-${element.id}`}
                                markerWidth={arrowSize}
                                markerHeight={arrowSize}
                                refX={arrowSize - 1}
                                refY={arrowSize / 2}
                                orient="auto"
                            >
                                <polygon
                                    points={`0 0, ${arrowSize} ${arrowSize / 2}, 0 ${arrowSize}`}
                                    fill={lineColor}
                                />
                            </marker>
                        </defs>
                    )}
                    <line
                        x1={0}
                        y1={Math.max(element.height, 20) / 2}
                        x2={element.width}
                        y2={Math.max(element.height, 20) / 2}
                        stroke={lineColor}
                        strokeWidth={lineWidth}
                        strokeDasharray={dashArray}
                        markerEnd={isArrow ? `url(#arrowhead-${element.id})` : undefined}
                    />
                </svg>

                {isSelected && !element.locked && (
                    <>
                        {/* Resize handles */}
                        <div
                            onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
                            style={{
                                position: 'absolute',
                                left: -5,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 10,
                                height: 10,
                                backgroundColor: '#3b82f6',
                                border: '2px solid white',
                                borderRadius: '50%',
                                cursor: 'ew-resize',
                                zIndex: 10,
                            }}
                        />
                        <div
                            onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
                            style={{
                                position: 'absolute',
                                right: -5,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 10,
                                height: 10,
                                backgroundColor: '#3b82f6',
                                border: '2px solid white',
                                borderRadius: '50%',
                                cursor: 'ew-resize',
                                zIndex: 10,
                            }}
                        />
                        {/* Rotation handle */}
                        <div
                            onMouseDown={(e) => handleRotationMouseDown(e, element)}
                            style={{
                                position: 'absolute',
                                top: -35,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: 20,
                                height: 20,
                                backgroundColor: '#10b981',
                                border: '2px solid white',
                                borderRadius: '50%',
                                cursor: 'grab',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            }}
                            title={`Rotazione: ${Math.round(element.rotation || 0)}°`}
                        >
                            <RotateCw className="w-3 h-3 text-white" />
                        </div>
                        {/* Rotation line */}
                        <div
                            style={{
                                position: 'absolute',
                                top: -25,
                                left: '50%',
                                width: 2,
                                height: 20,
                                backgroundColor: '#10b981',
                                transform: 'translateX(-50%)',
                                zIndex: 9,
                            }}
                        />
                    </>
                )}

                {element.locked && (
                    <div style={{
                        position: 'absolute',
                        top: -20,
                        right: 0,
                        background: '#f1f5f9',
                        borderRadius: 4,
                        padding: '2px 4px',
                    }}>
                        <Lock className="w-3 h-3 text-slate-500" />
                    </div>
                )}
            </div>
        );
    };

    const renderElement = (element: SlideElement) => {
        const isSelected = selectedId === element.id;
        const isEditing = editingTextId === element.id;

        if (element.type === 'line' || element.type === 'arrow') {
            return renderLineElement(element, isSelected);
        }

        const baseStyle: React.CSSProperties = {
            position: 'absolute',
            left: element.x,
            top: element.y,
            width: element.width,
            height: element.height,
            transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
            cursor: element.locked ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab'),
            zIndex: element.zIndex,
            outline: isSelected ? '2px solid #3b82f6' : undefined,
            outlineOffset: '2px',
        };

        const contentStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            backgroundColor: element.style?.backgroundColor,
            border: element.style?.borderWidth
                ? `${element.style.borderWidth}px solid ${element.style.borderColor}`
                : undefined,
            borderRadius: element.type === 'ellipse' ? '50%' : element.style?.borderRadius,
            fontSize: element.style?.fontSize,
            fontFamily: element.style?.fontFamily,
            color: element.style?.color,
            textAlign: element.style?.textAlign,
            fontWeight: element.style?.fontWeight,
            fontStyle: element.style?.fontStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: element.style?.textAlign === 'center' ? 'center'
                : element.style?.textAlign === 'right' ? 'flex-end' : 'flex-start',
            padding: element.type === 'text' ? '8px' : undefined,
            overflow: 'hidden',
        };

        return (
            <div
                key={element.id}
                data-element-id={element.id}
                style={baseStyle}
                onMouseDown={(e) => {
                    // Non bloccare drag se si sta editando
                    if (isEditing) return;
                    e.stopPropagation();
                    e.preventDefault();
                    handleElementMouseDown(e, element);
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isDragging && !isResizing && !isRotating) {
                        setSelectedId(element.id);
                    }
                }}
                onDoubleClick={(e) => {
                    if (element.type === 'text') {
                        e.stopPropagation();
                        setEditingTextId(element.id);
                    }
                }}
            >
                <div style={contentStyle}>
                    {element.type === 'text' && (
                        isEditing ? (
                            <ContentEditableText
                                elementId={element.id}
                                initialContent={element.content || ''}
                                style={element.style}
                                onSave={(html) => updateElement(element.id, { content: html })}
                                onBlur={() => {
                                    // Save selection before losing focus (for color picker)
                                    saveTextSelection();
                                    // Delay the state change to allow color picker to work
                                    setTimeout(() => {
                                        if (textSelectionRef.current.elementId !== element.id) {
                                            setEditingTextId(null);
                                        }
                                    }, 200);
                                }}
                                onMouseUp={saveTextSelection}
                                onEscape={() => {
                                    setEditingTextId(null);
                                    textSelectionRef.current = { range: null, elementId: null };
                                }}
                            />
                        ) : (
                            <div
                                dangerouslySetInnerHTML={{ __html: element.content || '' }}
                                style={{
                                    pointerEvents: 'none',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}
                            />
                        )
                    )}
                    {element.type === 'image' && element.src && (
                        <img
                            src={element.src}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            draggable={false}
                        />
                    )}
                    {element.type === 'qrcode' && (
                        <div
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px dashed #94a3b8',
                                borderRadius: 4,
                                backgroundColor: '#f8fafc',
                                position: 'relative',
                            }}
                        >
                            <QrCode className="w-8 h-8 text-slate-400" />
                            <div style={{
                                position: 'absolute',
                                bottom: 4,
                                left: 0,
                                right: 0,
                                textAlign: 'center',
                                fontSize: 10,
                                color: '#64748b',
                            }}>
                                QR Code Verifica
                            </div>
                        </div>
                    )}
                </div>

                {isSelected && !element.locked && !isEditing && (
                    <>
                        {/* Resize handles */}
                        {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map((handle) => (
                            <div
                                key={handle}
                                onMouseDown={(e) => handleResizeMouseDown(e, handle)}
                                style={{
                                    position: 'absolute',
                                    width: handle.length === 1 ? 8 : 10,
                                    height: handle.length === 1 ? 8 : 10,
                                    backgroundColor: '#3b82f6',
                                    border: '2px solid white',
                                    borderRadius: '50%',
                                    cursor: `${handle}-resize`,
                                    zIndex: 10,
                                    ...(handle.includes('n') ? { top: -5 } : {}),
                                    ...(handle.includes('s') ? { bottom: -5 } : {}),
                                    ...(handle.includes('w') ? { left: -5 } : {}),
                                    ...(handle.includes('e') ? { right: -5 } : {}),
                                    ...(handle === 'n' || handle === 's' ? { left: '50%', transform: 'translateX(-50%)' } : {}),
                                    ...(handle === 'e' || handle === 'w' ? { top: '50%', transform: 'translateY(-50%)' } : {}),
                                }}
                            />
                        ))}
                        {/* Rotation handle */}
                        <div
                            onMouseDown={(e) => handleRotationMouseDown(e, element)}
                            style={{
                                position: 'absolute',
                                top: -35,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: 20,
                                height: 20,
                                backgroundColor: '#10b981',
                                border: '2px solid white',
                                borderRadius: '50%',
                                cursor: 'grab',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            }}
                            title={`Rotazione: ${Math.round(element.rotation || 0)}°`}
                        >
                            <RotateCw className="w-3 h-3 text-white" />
                        </div>
                        {/* Rotation line */}
                        <div
                            style={{
                                position: 'absolute',
                                top: -25,
                                left: '50%',
                                width: 2,
                                height: 20,
                                backgroundColor: '#10b981',
                                transform: 'translateX(-50%)',
                                zIndex: 9,
                            }}
                        />
                    </>
                )}

                {element.locked && (
                    <div style={{
                        position: 'absolute',
                        top: -20,
                        right: 0,
                        background: '#f1f5f9',
                        borderRadius: 4,
                        padding: '2px 4px',
                    }}>
                        <Lock className="w-3 h-3 text-slate-500" />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`slide-editor ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-t-lg flex-wrap">
                {/* Add Elements */}
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                    <span className="text-xs text-slate-500 mr-1">Aggiungi:</span>
                    <button onClick={() => addElement('text')} className="p-2 hover:bg-slate-100 rounded" title="Testo">
                        <Type className="w-4 h-4" />
                    </button>
                    <button onClick={() => addElement('image')} className="p-2 hover:bg-slate-100 rounded" title="Immagine">
                        <Image className="w-4 h-4" />
                    </button>
                    <button onClick={() => addElement('qrcode')} className="p-2 hover:bg-slate-100 rounded" title="QR Code">
                        <QrCode className="w-4 h-4" />
                    </button>
                    <button onClick={() => addElement('rectangle')} className="p-2 hover:bg-slate-100 rounded" title="Rettangolo">
                        <Square className="w-4 h-4" />
                    </button>
                    <button onClick={() => addElement('ellipse')} className="p-2 hover:bg-slate-100 rounded" title="Ellisse">
                        <Circle className="w-4 h-4" />
                    </button>
                    <button onClick={() => addElement('line')} className="p-2 hover:bg-slate-100 rounded" title="Linea">
                        <MoveHorizontal className="w-4 h-4" />
                    </button>
                    <button onClick={() => addElement('arrow')} className="p-2 hover:bg-slate-100 rounded" title="Freccia">
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Z-Order Controls - Always visible, disabled when no selection */}
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                    <span className="text-xs text-slate-500 mr-1">Livello:</span>
                    <button
                        onClick={() => selectedElement && moveInZOrder('top')}
                        className={`p-2 rounded ${selectedElement ? 'hover:bg-slate-100' : 'opacity-40 cursor-not-allowed'}`}
                        title="Primo piano"
                        disabled={!selectedElement}
                    >
                        <ChevronsUp className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => selectedElement && moveInZOrder('up')}
                        className={`p-2 rounded ${selectedElement ? 'hover:bg-slate-100' : 'opacity-40 cursor-not-allowed'}`}
                        title="Avanti"
                        disabled={!selectedElement}
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => selectedElement && moveInZOrder('down')}
                        className={`p-2 rounded ${selectedElement ? 'hover:bg-slate-100' : 'opacity-40 cursor-not-allowed'}`}
                        title="Indietro"
                        disabled={!selectedElement}
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => selectedElement && moveInZOrder('bottom')}
                        className={`p-2 rounded ${selectedElement ? 'hover:bg-slate-100' : 'opacity-40 cursor-not-allowed'}`}
                        title="Sfondo"
                        disabled={!selectedElement}
                    >
                        <ChevronsDown className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => selectedElement && updateElement(selectedElement.id, { locked: !selectedElement.locked })}
                        className={`p-2 rounded ${selectedElement ? 'hover:bg-slate-100' : 'opacity-40 cursor-not-allowed'}`}
                        title={selectedElement?.locked ? 'Sblocca' : 'Blocca'}
                        disabled={!selectedElement}
                    >
                        {selectedElement?.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                </div>

                {/* Actions - Always visible, disabled when no selection */}
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                    <button
                        onClick={selectedElement ? duplicateElement : undefined}
                        className={`p-2 rounded ${selectedElement ? 'hover:bg-slate-100' : 'opacity-40 cursor-not-allowed'}`}
                        title="Duplica"
                        disabled={!selectedElement}
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                    <button
                        onClick={selectedElement ? deleteElement : undefined}
                        className={`p-2 rounded ${selectedElement ? 'hover:bg-slate-100 text-red-500' : 'opacity-40 cursor-not-allowed'}`}
                        title="Elimina"
                        disabled={!selectedElement}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Text alignment - Always visible, disabled when not text element */}
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                    <span className="text-xs text-slate-500 mr-1">Allinea:</span>
                    <button
                        onClick={() => selectedElement?.type === 'text' && updateElement(selectedElement.id, { style: { ...selectedElement.style, textAlign: 'left' } })}
                        className={`p-2 rounded ${selectedElement?.type === 'text' ? `hover:bg-slate-100 ${selectedElement?.style?.textAlign === 'left' ? 'bg-slate-200' : ''}` : 'opacity-40 cursor-not-allowed'}`}
                        disabled={selectedElement?.type !== 'text'}
                        title="Allinea a sinistra"
                    >
                        <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => selectedElement?.type === 'text' && updateElement(selectedElement.id, { style: { ...selectedElement.style, textAlign: 'center' } })}
                        className={`p-2 rounded ${selectedElement?.type === 'text' ? `hover:bg-slate-100 ${selectedElement?.style?.textAlign === 'center' ? 'bg-slate-200' : ''}` : 'opacity-40 cursor-not-allowed'}`}
                        disabled={selectedElement?.type !== 'text'}
                        title="Centra"
                    >
                        <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => selectedElement?.type === 'text' && updateElement(selectedElement.id, { style: { ...selectedElement.style, textAlign: 'right' } })}
                        className={`p-2 rounded ${selectedElement?.type === 'text' ? `hover:bg-slate-100 ${selectedElement?.style?.textAlign === 'right' ? 'bg-slate-200' : ''}` : 'opacity-40 cursor-not-allowed'}`}
                        disabled={selectedElement?.type !== 'text'}
                        title="Allinea a destra"
                    >
                        <AlignRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Line thickness - Always visible, disabled when not line/arrow */}
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                    <span className="text-xs text-slate-500 mr-1">Spessore:</span>
                    {[1, 2, 4, 6, 8].map((w) => (
                        <button
                            key={w}
                            onClick={() => (selectedElement?.type === 'line' || selectedElement?.type === 'arrow') && updateElement(selectedElement.id, { style: { ...selectedElement.style, lineWidth: w } })}
                            className={`p-1 rounded ${(selectedElement?.type === 'line' || selectedElement?.type === 'arrow') ? `hover:bg-slate-100 ${selectedElement?.style?.lineWidth === w ? 'bg-slate-200' : ''}` : 'opacity-40 cursor-not-allowed'}`}
                            title={`${w}px`}
                            disabled={!(selectedElement?.type === 'line' || selectedElement?.type === 'arrow')}
                        >
                            <div style={{ width: 20, height: w, backgroundColor: '#1e293b', borderRadius: 1 }} />
                        </button>
                    ))}
                </div>

                <div className="flex-1" />

                {/* View Controls */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowPrintMargins(!showPrintMargins)}
                        className={`p-2 hover:bg-slate-100 rounded ${showPrintMargins ? 'bg-blue-100 text-blue-600' : ''}`}
                        title="Area di stampa"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowGrid(!showGrid)}
                        className={`p-2 hover:bg-slate-100 rounded ${showGrid ? 'bg-slate-200' : ''}`}
                        title="Griglia"
                    >
                        <Grid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setSnapToGrid(!snapToGrid)}
                        className={`p-2 hover:bg-slate-100 rounded text-xs ${snapToGrid ? 'bg-blue-100 text-blue-600' : ''}`}
                        title="Snap"
                    >
                        Snap
                    </button>
                </div>

                {/* Zoom */}
                <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                    <button onClick={() => setZoom(Math.max(25, zoom - 25))} className="p-2 hover:bg-slate-100 rounded">
                        <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-sm w-12 text-center">{zoom}%</span>
                    <button onClick={() => setZoom(Math.min(200, zoom + 25))} className="p-2 hover:bg-slate-100 rounded">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="bg-slate-100 p-4 border border-t-0 border-slate-200 rounded-b-lg overflow-auto" style={{ maxHeight: '70vh' }}>
                {/* Wrapper per gestire lo scaling - dimensioni fisse basate sul canvas scalato */}
                <div
                    style={{
                        width: `calc(${width} * ${zoom / 100})`,
                        height: `calc(${height} * ${zoom / 100})`,
                        margin: '0 auto',
                    }}
                >
                    <div
                        ref={canvasRef}
                        className="relative bg-white shadow-lg"
                        style={{
                            width,
                            height,
                            transform: `scale(${zoom / 100})`,
                            transformOrigin: 'top left',
                            backgroundImage: showGrid
                                ? `linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)`
                                : undefined,
                            backgroundSize: showGrid ? `${gridSize}px ${gridSize}px` : undefined,
                        }}
                        onClick={(e) => {
                            // Solo deseleziona se clicco direttamente sul canvas, non sugli elementi
                            if (e.target === e.currentTarget) {
                                setSelectedId(null);
                                setEditingTextId(null);
                            }
                        }}
                    >
                        {/* Print area overlay */}
                        {showPrintMargins && (
                            <>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: printMargins.top, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px dashed #ef4444', pointerEvents: 'none', zIndex: 1000 }} />
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: printMargins.bottom, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderTop: '1px dashed #ef4444', pointerEvents: 'none', zIndex: 1000 }} />
                                <div style={{ position: 'absolute', top: printMargins.top, left: 0, bottom: printMargins.bottom, width: printMargins.left, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRight: '1px dashed #ef4444', pointerEvents: 'none', zIndex: 1000 }} />
                                <div style={{ position: 'absolute', top: printMargins.top, right: 0, bottom: printMargins.bottom, width: printMargins.right, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '1px dashed #ef4444', pointerEvents: 'none', zIndex: 1000 }} />
                                <div style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(239, 68, 68, 0.9)', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 4, pointerEvents: 'none', zIndex: 1001 }}>
                                    Area di stampa (margini 10mm)
                                </div>
                            </>
                        )}

                        {elements.sort((a, b) => a.zIndex - b.zIndex).map(renderElement)}
                    </div>
                </div>
            </div>

            {/* Properties Panel */}
            {selectedElement && (
                <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Proprietà
                        <span className="text-xs text-slate-500 ml-auto">Z: {selectedElement.zIndex}</span>
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                            <label className="block text-slate-500 mb-1">X</label>
                            <input type="number" value={Math.round(selectedElement.x)} onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })} className="w-full px-2 py-1 border rounded" />
                        </div>
                        <div>
                            <label className="block text-slate-500 mb-1">Y</label>
                            <input type="number" value={Math.round(selectedElement.y)} onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })} className="w-full px-2 py-1 border rounded" />
                        </div>
                        <div>
                            <label className="block text-slate-500 mb-1">Larghezza</label>
                            <input type="number" value={Math.round(selectedElement.width)} onChange={(e) => updateElement(selectedElement.id, { width: Number(e.target.value) })} className="w-full px-2 py-1 border rounded" />
                        </div>
                        <div>
                            <label className="block text-slate-500 mb-1">Altezza</label>
                            <input type="number" value={Math.round(selectedElement.height)} onChange={(e) => updateElement(selectedElement.id, { height: Number(e.target.value) })} className="w-full px-2 py-1 border rounded" />
                        </div>

                        {/* Rotation input for all elements */}
                        <div>
                            <label className="block text-slate-500 mb-1">Rotazione</label>
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    min={0}
                                    max={359}
                                    value={Math.round(selectedElement.rotation || 0)}
                                    onChange={(e) => updateElement(selectedElement.id, { rotation: Number(e.target.value) % 360 })}
                                    className="w-full px-2 py-1 border rounded"
                                />
                                <span className="text-xs text-slate-400">°</span>
                            </div>
                        </div>

                        {(selectedElement.type === 'rectangle' || selectedElement.type === 'ellipse') && (
                            <>
                                <div className="col-span-2">
                                    <HexColorInput
                                        label="Sfondo"
                                        value={selectedElement.style?.backgroundColor === 'transparent' ? '#ffffff' : (selectedElement.style?.backgroundColor || '#3b82f6')}
                                        onChange={(hex) => updateElement(selectedElement.id, { style: { ...selectedElement.style, backgroundColor: hex } })}
                                        showTransparent
                                        isTransparent={selectedElement.style?.backgroundColor === 'transparent'}
                                        onTransparentChange={(isTransparent) => updateElement(selectedElement.id, {
                                            style: { ...selectedElement.style, backgroundColor: isTransparent ? 'transparent' : '#3b82f6' }
                                        })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <HexColorInput
                                        label="Bordo"
                                        value={selectedElement.style?.borderColor || '#1d4ed8'}
                                        onChange={(hex) => updateElement(selectedElement.id, { style: { ...selectedElement.style, borderColor: hex } })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-500 mb-1">Spess. bordo</label>
                                    <input type="number" min={0} max={20} value={selectedElement.style?.borderWidth || 2} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, borderWidth: Number(e.target.value) } })} className="w-full px-2 py-1 border rounded" />
                                </div>
                                {selectedElement.type === 'rectangle' && (
                                    <div>
                                        <label className="block text-slate-500 mb-1">Raggio</label>
                                        <input type="number" min={0} max={50} value={selectedElement.style?.borderRadius || 0} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, borderRadius: Number(e.target.value) } })} className="w-full px-2 py-1 border rounded" />
                                    </div>
                                )}
                            </>
                        )}

                        {(selectedElement.type === 'line' || selectedElement.type === 'arrow') && (
                            <>
                                <div className="col-span-2">
                                    <HexColorInput
                                        label="Colore"
                                        value={selectedElement.style?.borderColor || '#1e293b'}
                                        onChange={(hex) => updateElement(selectedElement.id, { style: { ...selectedElement.style, borderColor: hex } })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-500 mb-1">Spessore</label>
                                    <input type="number" min={1} max={20} value={selectedElement.style?.lineWidth || 2} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, lineWidth: Number(e.target.value) } })} className="w-full px-2 py-1 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-slate-500 mb-1">Stile</label>
                                    <select value={selectedElement.style?.lineStyle || 'solid'} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, lineStyle: e.target.value as 'solid' | 'dashed' | 'dotted' } })} className="w-full px-2 py-1 border rounded">
                                        <option value="solid">Continua</option>
                                        <option value="dashed">Tratteggiata</option>
                                        <option value="dotted">Punteggiata</option>
                                    </select>
                                </div>
                                {selectedElement.type === 'arrow' && (
                                    <div>
                                        <label className="block text-slate-500 mb-1">Punta</label>
                                        <input type="number" min={5} max={30} value={selectedElement.style?.arrowSize || 10} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, arrowSize: Number(e.target.value) } })} className="w-full px-2 py-1 border rounded" />
                                    </div>
                                )}
                            </>
                        )}

                        {selectedElement.type === 'text' && (
                            <>
                                <div>
                                    <label className="block text-slate-500 mb-1">Font size</label>
                                    <input type="number" value={selectedElement.style?.fontSize || 16} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, fontSize: Number(e.target.value) } })} className="w-full px-2 py-1 border rounded" />
                                </div>
                                <div className="col-span-2">
                                    <HexColorInput
                                        label="Colore testo (selezione o intero)"
                                        value={selectedElement.style?.color || '#1e293b'}
                                        onChange={(hex) => applyColorToSelection(hex, selectedElement.id)}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <HexColorInput
                                        label="Sfondo"
                                        value={selectedElement.style?.backgroundColor === 'transparent' ? '#ffffff' : (selectedElement.style?.backgroundColor || '#ffffff')}
                                        onChange={(hex) => updateElement(selectedElement.id, { style: { ...selectedElement.style, backgroundColor: hex } })}
                                        showTransparent
                                        isTransparent={selectedElement.style?.backgroundColor === 'transparent' || !selectedElement.style?.backgroundColor}
                                        onTransparentChange={(isTransparent) => updateElement(selectedElement.id, {
                                            style: { ...selectedElement.style, backgroundColor: isTransparent ? 'transparent' : '#ffffff' }
                                        })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-500 mb-1">Font</label>
                                    <select value={selectedElement.style?.fontFamily || 'Arial'} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, fontFamily: e.target.value } })} className="w-full px-2 py-1 border rounded">
                                        <optgroup label="Sans-serif">
                                            <option value="Arial">Arial</option>
                                            <option value="Helvetica">Helvetica</option>
                                            <option value="Verdana">Verdana</option>
                                            <option value="Tahoma">Tahoma</option>
                                            <option value="Trebuchet MS">Trebuchet MS</option>
                                            <option value="Open Sans">Open Sans</option>
                                            <option value="Roboto">Roboto</option>
                                            <option value="Lato">Lato</option>
                                            <option value="Montserrat">Montserrat</option>
                                            <option value="Poppins">Poppins</option>
                                            <option value="Inter">Inter</option>
                                        </optgroup>
                                        <optgroup label="Serif">
                                            <option value="Times New Roman">Times New Roman</option>
                                            <option value="Georgia">Georgia</option>
                                            <option value="Palatino">Palatino</option>
                                            <option value="Book Antiqua">Book Antiqua</option>
                                            <option value="Garamond">Garamond</option>
                                            <option value="Playfair Display">Playfair Display</option>
                                            <option value="Merriweather">Merriweather</option>
                                        </optgroup>
                                        <optgroup label="Monospace">
                                            <option value="Courier New">Courier New</option>
                                            <option value="Consolas">Consolas</option>
                                            <option value="Monaco">Monaco</option>
                                            <option value="Fira Code">Fira Code</option>
                                        </optgroup>
                                        <optgroup label="Decorativi">
                                            <option value="Comfortaa, cursive">Comfortaa</option>
                                            <option value="Pacifico, cursive">Pacifico</option>
                                            <option value="Dancing Script, cursive">Dancing Script</option>
                                            <option value="Lobster, cursive">Lobster</option>
                                            <option value="Satisfy, cursive">Satisfy</option>
                                        </optgroup>
                                    </select>
                                </div>
                                {/* Text formatting buttons */}
                                <div className="col-span-2">
                                    <label className="block text-slate-500 mb-1">Stile testo</label>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => updateElement(selectedElement.id, {
                                                style: { ...selectedElement.style, fontWeight: selectedElement.style?.fontWeight === 'bold' ? 'normal' : 'bold' }
                                            })}
                                            className={`p-2 rounded border ${selectedElement.style?.fontWeight === 'bold' ? 'bg-blue-100 border-blue-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                            title="Grassetto"
                                        >
                                            <Bold className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => updateElement(selectedElement.id, {
                                                style: { ...selectedElement.style, fontStyle: selectedElement.style?.fontStyle === 'italic' ? 'normal' : 'italic' }
                                            })}
                                            className={`p-2 rounded border ${selectedElement.style?.fontStyle === 'italic' ? 'bg-blue-100 border-blue-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                            title="Corsivo"
                                        >
                                            <Italic className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Margins Panel */}
            {showPrintMargins && (
                <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Maximize2 className="w-4 h-4" />
                        Margini di stampa (mm)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                            <label className="block text-slate-500 mb-1">Sopra</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={Math.round(margins.top * 25.4 / 96)}
                                onChange={(e) => updateMargins({ ...margins, top: Math.round(Number(e.target.value) * 96 / 25.4) })}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-500 mb-1">Destra</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={Math.round(margins.right * 25.4 / 96)}
                                onChange={(e) => updateMargins({ ...margins, right: Math.round(Number(e.target.value) * 96 / 25.4) })}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-500 mb-1">Sotto</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={Math.round(margins.bottom * 25.4 / 96)}
                                onChange={(e) => updateMargins({ ...margins, bottom: Math.round(Number(e.target.value) * 96 / 25.4) })}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-500 mb-1">Sinistra</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={Math.round(margins.left * 25.4 / 96)}
                                onChange={(e) => updateMargins({ ...margins, left: Math.round(Number(e.target.value) * 96 / 25.4) })}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        L'area di stampa sicura è indicata dal rettangolo blu tratteggiato nel canvas
                    </p>
                </div>
            )}

            <MediaPickerModal
                isOpen={showMediaPicker}
                onClose={() => { setShowMediaPicker(false); delete (window as any).__pendingImageElement; }}
                onSelect={handleImageSelect}
                title="Seleziona immagine"
            />
        </div>
    );
};

export type { SlideElement, SlideEditorProps };
export default SlideEditor;
