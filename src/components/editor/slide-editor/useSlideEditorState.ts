/**
 * useSlideEditorState - Custom hook for SlideEditor state management
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { SlideElement, MarginsConfig, SlideEditorProps } from './types';
import { DEFAULT_STYLES, DEFAULT_MARGINS, generateId } from './types';

interface TextSelectionRef {
    range: Range | null;
    elementId: string | null;
}

export const useSlideEditorState = (
    elements: SlideElement[],
    onChange: (elements: SlideElement[]) => void,
    propMargins?: MarginsConfig,
    onMarginsChange?: (margins: MarginsConfig) => void,
    showPrintArea: boolean = true
) => {
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
    const textSelectionRef = useRef<TextSelectionRef>({ range: null, elementId: null });

    // Selection and editing state
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);

    // Interaction state
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [rotationStart, setRotationStart] = useState({ angle: 0, elementRotation: 0 });

    // View state
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [gridSize] = useState(10);
    const [zoom, setZoom] = useState(100);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [showPrintMargins, setShowPrintMargins] = useState(showPrintArea);

    const selectedElement = elements.find(el => el.id === selectedId);

    // Snap value to grid
    const snapToGridValue = useCallback((value: number) => {
        if (!snapToGrid) return value;
        return Math.round(value / gridSize) * gridSize;
    }, [snapToGrid, gridSize]);

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

    // Update single element
    const updateElement = useCallback((id: string, updates: Partial<SlideElement>) => {
        onChange(elements.map(el => el.id === id ? { ...el, ...updates } : el));
    }, [elements, onChange]);

    // Add new element
    const addElement = useCallback((type: SlideElement['type'], options?: { logoType?: 'tenant' | 'branch' }) => {
        const newElement: SlideElement = {
            id: generateId(),
            type,
            x: 50,
            y: 50,
            width: type === 'text' ? 200 : type === 'line' || type === 'arrow' ? 150 : type === 'qrcode' ? 100 : type === 'logo' ? 120 : 150,
            height: type === 'text' ? 50 : type === 'line' || type === 'arrow' ? 4 : type === 'qrcode' ? 100 : type === 'logo' ? 60 : 100,
            rotation: 0,
            content: type === 'text' ? 'Nuovo testo' : type === 'qrcode' ? '{{document.qrCode}}' : undefined,
            ...(type === 'logo' && options?.logoType ? { logoType: options.logoType } : {}),
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

    // Handle image selection from media picker
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

    // Delete selected element
    const deleteElement = useCallback(() => {
        if (!selectedId) return;
        onChange(elements.filter(el => el.id !== selectedId));
        setSelectedId(null);
    }, [selectedId, elements, onChange]);

    // Duplicate selected element
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

    // Move element in z-order
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

    // Apply color to selected text
    const applyColorToSelection = useCallback((color: string, elementId: string) => {
        const savedSelection = textSelectionRef.current;

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

    // Toggle lock on selected element
    const toggleLock = useCallback(() => {
        if (selectedElement) {
            updateElement(selectedElement.id, { locked: !selectedElement.locked });
        }
    }, [selectedElement, updateElement]);

    return {
        // Refs
        canvasRef,
        textSelectionRef,

        // State
        margins,
        selectedId,
        editingTextId,
        isDragging,
        isResizing,
        isRotating,
        resizeHandle,
        dragOffset,
        rotationStart,
        showGrid,
        snapToGrid,
        gridSize,
        zoom,
        showMediaPicker,
        showPrintMargins,
        selectedElement,

        // Setters
        setSelectedId,
        setEditingTextId,
        setIsDragging,
        setIsResizing,
        setIsRotating,
        setResizeHandle,
        setDragOffset,
        setRotationStart,
        setShowGrid,
        setSnapToGrid,
        setZoom,
        setShowMediaPicker,
        setShowPrintMargins,
        updateMargins,

        // Actions
        snapToGridValue,
        saveTextSelection,
        updateElement,
        addElement,
        handleImageSelect,
        deleteElement,
        duplicateElement,
        moveInZOrder,
        applyColorToSelection,
        toggleLock,
    };
};

export default useSlideEditorState;
