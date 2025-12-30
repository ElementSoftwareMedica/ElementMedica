/**
 * useSlideEditorEvents - Custom hook for SlideEditor event handlers
 */

import { useEffect, useCallback } from 'react';
import type { SlideElement } from './types';

interface UseSlideEditorEventsProps {
    canvasRef: React.RefObject<HTMLDivElement>;
    elements: SlideElement[];
    selectedId: string | null;
    editingTextId: string | null;
    isDragging: boolean;
    isResizing: boolean;
    isRotating: boolean;
    resizeHandle: string | null;
    dragOffset: { x: number; y: number };
    rotationStart: { angle: number; elementRotation: number };
    zoom: number;
    snapToGridValue: (value: number) => number;
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
    deleteElement: () => void;
    duplicateElement: () => void;
    setSelectedId: (id: string | null) => void;
    setEditingTextId: (id: string | null) => void;
    setIsDragging: (value: boolean) => void;
    setIsResizing: (value: boolean) => void;
    setIsRotating: (value: boolean) => void;
    setResizeHandle: (value: string | null) => void;
    setDragOffset: (value: { x: number; y: number }) => void;
    setRotationStart: (value: { angle: number; elementRotation: number }) => void;
}

export const useSlideEditorEvents = ({
    canvasRef,
    elements,
    selectedId,
    editingTextId,
    isDragging,
    isResizing,
    isRotating,
    resizeHandle,
    dragOffset,
    rotationStart,
    zoom,
    snapToGridValue,
    updateElement,
    deleteElement,
    duplicateElement,
    setSelectedId,
    setEditingTextId,
    setIsDragging,
    setIsResizing,
    setIsRotating,
    setResizeHandle,
    setDragOffset,
    setRotationStart,
}: UseSlideEditorEventsProps) => {

    // Handle element mouse down (start drag)
    const handleElementMouseDown = useCallback((e: React.MouseEvent, element: SlideElement) => {
        if (element.locked) return;
        e.stopPropagation();
        e.preventDefault();

        if (!canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const scale = zoom / 100;

        // Mouse position in canvas coordinates
        const mouseCanvasX = (e.clientX - canvasRect.left) / scale;
        const mouseCanvasY = (e.clientY - canvasRect.top) / scale;

        // Offset from top-left of element
        setDragOffset({
            x: mouseCanvasX - element.x,
            y: mouseCanvasY - element.y,
        });
        setSelectedId(element.id);
        setIsDragging(true);
    }, [zoom, canvasRef, setDragOffset, setSelectedId, setIsDragging]);

    // Handle rotation mouse down
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
    }, [zoom, canvasRef, setRotationStart, setIsRotating]);

    // Handle resize mouse down
    const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeHandle(handle);
    }, [setIsResizing, setResizeHandle]);

    // Mouse move and up handlers
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!canvasRef.current) return;
            const canvasRect = canvasRef.current.getBoundingClientRect();
            const scale = zoom / 100;

            // Handle dragging
            if (isDragging && selectedId) {
                const element = elements.find(el => el.id === selectedId);
                if (!element || element.locked) return;

                const newX = snapToGridValue((e.clientX - canvasRect.left) / scale - dragOffset.x);
                const newY = snapToGridValue((e.clientY - canvasRect.top) / scale - dragOffset.y);

                updateElement(selectedId, { x: newX, y: newY });
            }

            // Handle resizing
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

                // Snap to 15 degree increments if shift is held
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
    }, [
        isDragging, isResizing, isRotating, selectedId, resizeHandle,
        elements, dragOffset, rotationStart, zoom, snapToGridValue,
        updateElement, canvasRef, setIsDragging, setIsResizing, setIsRotating, setResizeHandle
    ]);

    // Keyboard shortcuts
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
    }, [selectedId, deleteElement, duplicateElement, editingTextId, elements, updateElement, setSelectedId, setEditingTextId]);

    return {
        handleElementMouseDown,
        handleRotationMouseDown,
        handleResizeMouseDown,
    };
};

export default useSlideEditorEvents;
