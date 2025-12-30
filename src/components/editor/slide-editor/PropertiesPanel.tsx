/**
 * PropertiesPanel - Properties panel for selected element
 * Includes position, size, rotation, style properties
 */

import React from 'react';
import { Layers, Bold, Italic } from 'lucide-react';
import HexColorInput from '../HexColorInput';
import type { SlideElement } from './types';
import { FONT_OPTIONS } from './types';

interface PropertiesPanelProps {
    selectedElement: SlideElement;
    onUpdateElement: (id: string, updates: Partial<SlideElement>) => void;
    onApplyColorToSelection: (color: string, elementId: string) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    selectedElement,
    onUpdateElement,
    onApplyColorToSelection,
}) => {
    return (
        <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Proprietà
                <span className="text-xs text-slate-500 ml-auto">Z: {selectedElement.zIndex}</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {/* Position & Size */}
                <div>
                    <label className="block text-slate-500 mb-1">X</label>
                    <input
                        type="number"
                        value={Math.round(selectedElement.x)}
                        onChange={(e) => onUpdateElement(selectedElement.id, { x: Number(e.target.value) })}
                        className="w-full px-2 py-1 border rounded"
                    />
                </div>
                <div>
                    <label className="block text-slate-500 mb-1">Y</label>
                    <input
                        type="number"
                        value={Math.round(selectedElement.y)}
                        onChange={(e) => onUpdateElement(selectedElement.id, { y: Number(e.target.value) })}
                        className="w-full px-2 py-1 border rounded"
                    />
                </div>
                <div>
                    <label className="block text-slate-500 mb-1">Larghezza</label>
                    <input
                        type="number"
                        value={Math.round(selectedElement.width)}
                        onChange={(e) => onUpdateElement(selectedElement.id, { width: Number(e.target.value) })}
                        className="w-full px-2 py-1 border rounded"
                    />
                </div>
                <div>
                    <label className="block text-slate-500 mb-1">Altezza</label>
                    <input
                        type="number"
                        value={Math.round(selectedElement.height)}
                        onChange={(e) => onUpdateElement(selectedElement.id, { height: Number(e.target.value) })}
                        className="w-full px-2 py-1 border rounded"
                    />
                </div>

                {/* Rotation */}
                <div>
                    <label className="block text-slate-500 mb-1">Rotazione</label>
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            min={0}
                            max={359}
                            value={Math.round(selectedElement.rotation || 0)}
                            onChange={(e) => onUpdateElement(selectedElement.id, { rotation: Number(e.target.value) % 360 })}
                            className="w-full px-2 py-1 border rounded"
                        />
                        <span className="text-xs text-slate-400">°</span>
                    </div>
                </div>

                {/* Rectangle & Ellipse Properties */}
                {(selectedElement.type === 'rectangle' || selectedElement.type === 'ellipse') && (
                    <>
                        <div className="col-span-2">
                            <HexColorInput
                                label="Sfondo"
                                value={selectedElement.style?.backgroundColor === 'transparent' ? '#ffffff' : (selectedElement.style?.backgroundColor || '#3b82f6')}
                                onChange={(hex) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, backgroundColor: hex } })}
                                showTransparent
                                isTransparent={selectedElement.style?.backgroundColor === 'transparent'}
                                onTransparentChange={(isTransparent) => onUpdateElement(selectedElement.id, {
                                    style: { ...selectedElement.style, backgroundColor: isTransparent ? 'transparent' : '#3b82f6' }
                                })}
                            />
                        </div>
                        <div className="col-span-2">
                            <HexColorInput
                                label="Bordo"
                                value={selectedElement.style?.borderColor || '#1d4ed8'}
                                onChange={(hex) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, borderColor: hex } })}
                            />
                        </div>
                        <div>
                            <label className="block text-slate-500 mb-1">Spess. bordo</label>
                            <input
                                type="number"
                                min={0}
                                max={20}
                                value={selectedElement.style?.borderWidth || 2}
                                onChange={(e) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, borderWidth: Number(e.target.value) } })}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        {selectedElement.type === 'rectangle' && (
                            <div>
                                <label className="block text-slate-500 mb-1">Raggio</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={50}
                                    value={selectedElement.style?.borderRadius || 0}
                                    onChange={(e) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, borderRadius: Number(e.target.value) } })}
                                    className="w-full px-2 py-1 border rounded"
                                />
                            </div>
                        )}
                    </>
                )}

                {/* Line & Arrow Properties */}
                {(selectedElement.type === 'line' || selectedElement.type === 'arrow') && (
                    <>
                        <div className="col-span-2">
                            <HexColorInput
                                label="Colore"
                                value={selectedElement.style?.borderColor || '#1e293b'}
                                onChange={(hex) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, borderColor: hex } })}
                            />
                        </div>
                        <div>
                            <label className="block text-slate-500 mb-1">Spessore</label>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={selectedElement.style?.lineWidth || 2}
                                onChange={(e) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, lineWidth: Number(e.target.value) } })}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-500 mb-1">Stile</label>
                            <select
                                value={selectedElement.style?.lineStyle || 'solid'}
                                onChange={(e) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, lineStyle: e.target.value as 'solid' | 'dashed' | 'dotted' } })}
                                className="w-full px-2 py-1 border rounded"
                            >
                                <option value="solid">Continua</option>
                                <option value="dashed">Tratteggiata</option>
                                <option value="dotted">Punteggiata</option>
                            </select>
                        </div>
                        {selectedElement.type === 'arrow' && (
                            <div>
                                <label className="block text-slate-500 mb-1">Punta</label>
                                <input
                                    type="number"
                                    min={5}
                                    max={30}
                                    value={selectedElement.style?.arrowSize || 10}
                                    onChange={(e) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, arrowSize: Number(e.target.value) } })}
                                    className="w-full px-2 py-1 border rounded"
                                />
                            </div>
                        )}
                    </>
                )}

                {/* Text Properties */}
                {selectedElement.type === 'text' && (
                    <>
                        <div>
                            <label className="block text-slate-500 mb-1">Font size</label>
                            <input
                                type="number"
                                value={selectedElement.style?.fontSize || 16}
                                onChange={(e) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, fontSize: Number(e.target.value) } })}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div className="col-span-2">
                            <HexColorInput
                                label="Colore testo (selezione o intero)"
                                value={selectedElement.style?.color || '#1e293b'}
                                onChange={(hex) => onApplyColorToSelection(hex, selectedElement.id)}
                            />
                        </div>
                        <div className="col-span-2">
                            <HexColorInput
                                label="Sfondo"
                                value={selectedElement.style?.backgroundColor === 'transparent' ? '#ffffff' : (selectedElement.style?.backgroundColor || '#ffffff')}
                                onChange={(hex) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, backgroundColor: hex } })}
                                showTransparent
                                isTransparent={selectedElement.style?.backgroundColor === 'transparent' || !selectedElement.style?.backgroundColor}
                                onTransparentChange={(isTransparent) => onUpdateElement(selectedElement.id, {
                                    style: { ...selectedElement.style, backgroundColor: isTransparent ? 'transparent' : '#ffffff' }
                                })}
                            />
                        </div>
                        <div>
                            <label className="block text-slate-500 mb-1">Font</label>
                            <select
                                value={selectedElement.style?.fontFamily || 'Arial'}
                                onChange={(e) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, fontFamily: e.target.value } })}
                                className="w-full px-2 py-1 border rounded"
                            >
                                <optgroup label="Sans-serif">
                                    {FONT_OPTIONS.sansSerif.map(f => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Serif">
                                    {FONT_OPTIONS.serif.map(f => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Monospace">
                                    {FONT_OPTIONS.monospace.map(f => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Decorativi">
                                    {FONT_OPTIONS.decorative.map(f => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                        {/* Text formatting buttons */}
                        <div className="col-span-2">
                            <label className="block text-slate-500 mb-1">Stile testo</label>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => onUpdateElement(selectedElement.id, {
                                        style: { ...selectedElement.style, fontWeight: selectedElement.style?.fontWeight === 'bold' ? 'normal' : 'bold' }
                                    })}
                                    className={`p-2 rounded border ${selectedElement.style?.fontWeight === 'bold' ? 'bg-blue-100 border-blue-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                    title="Grassetto"
                                >
                                    <Bold className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onUpdateElement(selectedElement.id, {
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
    );
};

export default PropertiesPanel;
