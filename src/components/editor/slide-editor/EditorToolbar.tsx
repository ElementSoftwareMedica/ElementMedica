/**
 * EditorToolbar - Toolbar component for SlideEditor
 * Includes add elements, z-order, actions, alignment, line thickness, view controls, zoom
 */

import React from 'react';
import {
    Type, Image, Square, Circle, Trash2, Copy,
    AlignLeft, AlignCenter, AlignRight,
    ChevronUp, ChevronDown, Lock, Unlock, Grid,
    Plus, Minus,
    ArrowRight, MoveHorizontal,
    Maximize2, ChevronsUp, ChevronsDown,
    QrCode, Building2, ImageIcon
} from 'lucide-react';
import type { SlideElement } from './types';
import { LINE_THICKNESS_OPTIONS } from './types';

interface EditorToolbarProps {
    selectedElement: SlideElement | undefined;
    zoom: number;
    showGrid: boolean;
    snapToGrid: boolean;
    showPrintMargins: boolean;
    onAddElement: (type: SlideElement['type'], options?: { logoType?: 'tenant' | 'branch' }) => void;
    onMoveInZOrder: (direction: 'up' | 'down' | 'top' | 'bottom') => void;
    onToggleLock: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onUpdateElement: (id: string, updates: Partial<SlideElement>) => void;
    onSetZoom: (zoom: number) => void;
    onToggleGrid: () => void;
    onToggleSnapToGrid: () => void;
    onTogglePrintMargins: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
    selectedElement,
    zoom,
    showGrid,
    snapToGrid,
    showPrintMargins,
    onAddElement,
    onMoveInZOrder,
    onToggleLock,
    onDuplicate,
    onDelete,
    onUpdateElement,
    onSetZoom,
    onToggleGrid,
    onToggleSnapToGrid,
    onTogglePrintMargins,
}) => {
    return (
        <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-t-lg flex-wrap">
            {/* Add Elements */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                <span className="text-xs text-slate-500 mr-1">Aggiungi:</span>
                <button onClick={() => onAddElement('text')} className="p-2 hover:bg-slate-100 rounded" title="Testo">
                    <Type className="w-4 h-4" />
                </button>
                <button onClick={() => onAddElement('image')} className="p-2 hover:bg-slate-100 rounded" title="Immagine">
                    <Image className="w-4 h-4" />
                </button>
                <button onClick={() => onAddElement('qrcode')} className="p-2 hover:bg-slate-100 rounded" title="QR Code">
                    <QrCode className="w-4 h-4" />
                </button>
                <button onClick={() => onAddElement('rectangle')} className="p-2 hover:bg-slate-100 rounded" title="Rettangolo">
                    <Square className="w-4 h-4" />
                </button>
                <button onClick={() => onAddElement('ellipse')} className="p-2 hover:bg-slate-100 rounded" title="Ellisse">
                    <Circle className="w-4 h-4" />
                </button>
                <button onClick={() => onAddElement('line')} className="p-2 hover:bg-slate-100 rounded" title="Linea">
                    <MoveHorizontal className="w-4 h-4" />
                </button>
                <button onClick={() => onAddElement('arrow')} className="p-2 hover:bg-slate-100 rounded" title="Freccia">
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            {/* Logo Elements */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                <span className="text-xs text-slate-500 mr-1">Logo:</span>
                <button onClick={() => onAddElement('logo', { logoType: 'tenant' })} className="p-2 hover:bg-indigo-50 rounded group" title="Logo Ente (tenant)">
                    <ImageIcon className="w-4 h-4 group-hover:text-indigo-600" />
                </button>
                <button onClick={() => onAddElement('logo', { logoType: 'branch' })} className="p-2 hover:bg-teal-50 rounded group" title="Logo Sede (branch)">
                    <Building2 className="w-4 h-4 group-hover:text-teal-600" />
                </button>
            </div>

            {/* Z-Order Controls */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                <span className="text-xs text-slate-500 mr-1">Livello:</span>
                <button
                    onClick={() => selectedElement && onMoveInZOrder('top')}
                    className={`p-2 rounded ${selectedElement ? 'hover:bg-slate-100' : 'opacity-40 cursor-not-allowed'}`}
                    title="Primo piano"
                    disabled={!selectedElement}
                >
                    <ChevronsUp className="w-4 h-4" />
                </button>
                <button
                    onClick={() => selectedElement && onMoveInZOrder('up')}
                    className={`p-2 rounded ${selectedElement ? 'hover:bg-slate-100' : 'opacity-40 cursor-not-allowed'}`}
                    title="Avanti"
                    disabled={!selectedElement}
                >
                    <ChevronUp className="w-4 h-4" />
                </button>
                <button
                    onClick={() => selectedElement && onMoveInZOrder('down')}
                    className={`p-2 rounded ${selectedElement ? 'hover:bg-slate-100' : 'opacity-40 cursor-not-allowed'}`}
                    title="Indietro"
                    disabled={!selectedElement}
                >
                    <ChevronDown className="w-4 h-4" />
                </button>
                <button
                    onClick={() => selectedElement && onMoveInZOrder('bottom')}
                    className={`p-2 rounded ${selectedElement ? 'hover:bg-slate-100' : 'opacity-40 cursor-not-allowed'}`}
                    title="Sfondo"
                    disabled={!selectedElement}
                >
                    <ChevronsDown className="w-4 h-4" />
                </button>
                <button
                    onClick={() => selectedElement && onToggleLock()}
                    className={`p-2 rounded ${selectedElement ? 'hover:bg-slate-100' : 'opacity-40 cursor-not-allowed'}`}
                    title={selectedElement?.locked ? 'Sblocca' : 'Blocca'}
                    disabled={!selectedElement}
                >
                    {selectedElement?.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                <button
                    onClick={selectedElement ? onDuplicate : undefined}
                    className={`p-2 rounded ${selectedElement ? 'hover:bg-slate-100' : 'opacity-40 cursor-not-allowed'}`}
                    title="Duplica"
                    disabled={!selectedElement}
                >
                    <Copy className="w-4 h-4" />
                </button>
                <button
                    onClick={selectedElement ? onDelete : undefined}
                    className={`p-2 rounded ${selectedElement ? 'hover:bg-slate-100 text-red-500' : 'opacity-40 cursor-not-allowed'}`}
                    title="Elimina"
                    disabled={!selectedElement}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Text alignment */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                <span className="text-xs text-slate-500 mr-1">Allinea:</span>
                <button
                    onClick={() => selectedElement?.type === 'text' && onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, textAlign: 'left' } })}
                    className={`p-2 rounded ${selectedElement?.type === 'text' ? `hover:bg-slate-100 ${selectedElement?.style?.textAlign === 'left' ? 'bg-slate-200' : ''}` : 'opacity-40 cursor-not-allowed'}`}
                    disabled={selectedElement?.type !== 'text'}
                    title="Allinea a sinistra"
                >
                    <AlignLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={() => selectedElement?.type === 'text' && onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, textAlign: 'center' } })}
                    className={`p-2 rounded ${selectedElement?.type === 'text' ? `hover:bg-slate-100 ${selectedElement?.style?.textAlign === 'center' ? 'bg-slate-200' : ''}` : 'opacity-40 cursor-not-allowed'}`}
                    disabled={selectedElement?.type !== 'text'}
                    title="Centra"
                >
                    <AlignCenter className="w-4 h-4" />
                </button>
                <button
                    onClick={() => selectedElement?.type === 'text' && onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, textAlign: 'right' } })}
                    className={`p-2 rounded ${selectedElement?.type === 'text' ? `hover:bg-slate-100 ${selectedElement?.style?.textAlign === 'right' ? 'bg-slate-200' : ''}` : 'opacity-40 cursor-not-allowed'}`}
                    disabled={selectedElement?.type !== 'text'}
                    title="Allinea a destra"
                >
                    <AlignRight className="w-4 h-4" />
                </button>
            </div>

            {/* Line thickness */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                <span className="text-xs text-slate-500 mr-1">Spessore:</span>
                {LINE_THICKNESS_OPTIONS.map((w) => (
                    <button
                        key={w}
                        onClick={() => (selectedElement?.type === 'line' || selectedElement?.type === 'arrow') && onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, lineWidth: w } })}
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
                    onClick={onTogglePrintMargins}
                    className={`p-2 hover:bg-slate-100 rounded ${showPrintMargins ? 'bg-blue-100 text-blue-600' : ''}`}
                    title="Area di stampa"
                >
                    <Maximize2 className="w-4 h-4" />
                </button>
                <button
                    onClick={onToggleGrid}
                    className={`p-2 hover:bg-slate-100 rounded ${showGrid ? 'bg-slate-200' : ''}`}
                    title="Griglia"
                >
                    <Grid className="w-4 h-4" />
                </button>
                <button
                    onClick={onToggleSnapToGrid}
                    className={`p-2 hover:bg-slate-100 rounded text-xs ${snapToGrid ? 'bg-blue-100 text-blue-600' : ''}`}
                    title="Snap"
                >
                    Snap
                </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                <button onClick={() => onSetZoom(Math.max(25, zoom - 25))} className="p-2 hover:bg-slate-100 rounded">
                    <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm w-12 text-center">{zoom}%</span>
                <button onClick={() => onSetZoom(Math.min(200, zoom + 25))} className="p-2 hover:bg-slate-100 rounded">
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default EditorToolbar;
