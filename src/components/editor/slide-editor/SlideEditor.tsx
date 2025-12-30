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

import React from 'react';
import MediaPickerModal from '../../../pages/settings/templates/components/editor/MediaPickerModal';
import EditorToolbar from './EditorToolbar';
import PropertiesPanel from './PropertiesPanel';
import MarginsPanel from './MarginsPanel';
import SlideElementRenderer from './SlideElementRenderer';
import { useSlideEditorState } from './useSlideEditorState';
import { useSlideEditorEvents } from './useSlideEditorEvents';
import type { SlideEditorProps } from './types';

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
    // State management
    const state = useSlideEditorState(
        elements,
        onChange,
        propMargins,
        onMarginsChange,
        showPrintArea
    );

    // Event handlers
    const events = useSlideEditorEvents({
        canvasRef: state.canvasRef,
        elements,
        selectedId: state.selectedId,
        editingTextId: state.editingTextId,
        isDragging: state.isDragging,
        isResizing: state.isResizing,
        isRotating: state.isRotating,
        resizeHandle: state.resizeHandle,
        dragOffset: state.dragOffset,
        rotationStart: state.rotationStart,
        zoom: state.zoom,
        snapToGridValue: state.snapToGridValue,
        updateElement: state.updateElement,
        deleteElement: state.deleteElement,
        duplicateElement: state.duplicateElement,
        setSelectedId: state.setSelectedId,
        setEditingTextId: state.setEditingTextId,
        setIsDragging: state.setIsDragging,
        setIsResizing: state.setIsResizing,
        setIsRotating: state.setIsRotating,
        setResizeHandle: state.setResizeHandle,
        setDragOffset: state.setDragOffset,
        setRotationStart: state.setRotationStart,
    });

    const printMargins = state.margins;

    return (
        <div className={`slide-editor ${className}`}>
            {/* Toolbar */}
            <EditorToolbar
                selectedElement={state.selectedElement}
                zoom={state.zoom}
                showGrid={state.showGrid}
                snapToGrid={state.snapToGrid}
                showPrintMargins={state.showPrintMargins}
                onAddElement={state.addElement}
                onMoveInZOrder={state.moveInZOrder}
                onToggleLock={state.toggleLock}
                onDuplicate={state.duplicateElement}
                onDelete={state.deleteElement}
                onUpdateElement={state.updateElement}
                onSetZoom={state.setZoom}
                onToggleGrid={() => state.setShowGrid(!state.showGrid)}
                onToggleSnapToGrid={() => state.setSnapToGrid(!state.snapToGrid)}
                onTogglePrintMargins={() => state.setShowPrintMargins(!state.showPrintMargins)}
            />

            {/* Canvas */}
            <div className="bg-slate-100 p-4 border border-t-0 border-slate-200 rounded-b-lg overflow-auto" style={{ maxHeight: '70vh' }}>
                {/* Wrapper for scaling */}
                <div
                    style={{
                        width: `calc(${width} * ${state.zoom / 100})`,
                        height: `calc(${height} * ${state.zoom / 100})`,
                        margin: '0 auto',
                    }}
                >
                    <div
                        ref={state.canvasRef}
                        className="relative bg-white shadow-lg"
                        style={{
                            width,
                            height,
                            transform: `scale(${state.zoom / 100})`,
                            transformOrigin: 'top left',
                            backgroundImage: state.showGrid
                                ? `linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)`
                                : undefined,
                            backgroundSize: state.showGrid ? `${state.gridSize}px ${state.gridSize}px` : undefined,
                        }}
                        onClick={(e) => {
                            // Only deselect if clicking directly on canvas
                            if (e.target === e.currentTarget) {
                                state.setSelectedId(null);
                                state.setEditingTextId(null);
                            }
                        }}
                    >
                        {/* Print area overlay */}
                        {state.showPrintMargins && (
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

                        {/* Render elements */}
                        {elements.sort((a, b) => a.zIndex - b.zIndex).map(element => (
                            <SlideElementRenderer
                                key={element.id}
                                element={element}
                                isSelected={state.selectedId === element.id}
                                isEditing={state.editingTextId === element.id}
                                isDragging={state.isDragging}
                                isResizing={state.isResizing}
                                isRotating={state.isRotating}
                                onElementMouseDown={events.handleElementMouseDown}
                                onResizeMouseDown={events.handleResizeMouseDown}
                                onRotationMouseDown={events.handleRotationMouseDown}
                                onSelect={state.setSelectedId}
                                onStartEditing={state.setEditingTextId}
                                onUpdateElement={state.updateElement}
                                onSaveTextSelection={state.saveTextSelection}
                                onStopEditing={() => state.setEditingTextId(null)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Properties Panel */}
            {state.selectedElement && (
                <PropertiesPanel
                    selectedElement={state.selectedElement}
                    onUpdateElement={state.updateElement}
                    onApplyColorToSelection={state.applyColorToSelection}
                />
            )}

            {/* Margins Panel */}
            {state.showPrintMargins && (
                <MarginsPanel
                    margins={state.margins}
                    onMarginsChange={state.updateMargins}
                />
            )}

            {/* Media Picker Modal */}
            <MediaPickerModal
                isOpen={state.showMediaPicker}
                onClose={() => { 
                    state.setShowMediaPicker(false); 
                    delete (window as any).__pendingImageElement; 
                }}
                onSelect={state.handleImageSelect}
                title="Seleziona immagine"
            />
        </div>
    );
};

export default SlideEditor;
