/**
 * MarginsPanel - Print margins configuration panel
 */

import React from 'react';
import { Maximize2 } from 'lucide-react';
import type { MarginsConfig } from './types';

interface MarginsPanelProps {
    margins: MarginsConfig;
    onMarginsChange: (margins: MarginsConfig) => void;
}

const MarginsPanel: React.FC<MarginsPanelProps> = ({
    margins,
    onMarginsChange,
}) => {
    // Convert pixels to mm (96dpi)
    const pxToMm = (px: number) => Math.round(px * 25.4 / 96);
    // Convert mm to pixels (96dpi)
    const mmToPx = (mm: number) => Math.round(mm * 96 / 25.4);

    return (
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
                        value={pxToMm(margins.top)}
                        onChange={(e) => onMarginsChange({ ...margins, top: mmToPx(Number(e.target.value)) })}
                        className="w-full px-2 py-1 border rounded"
                    />
                </div>
                <div>
                    <label className="block text-slate-500 mb-1">Destra</label>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={pxToMm(margins.right)}
                        onChange={(e) => onMarginsChange({ ...margins, right: mmToPx(Number(e.target.value)) })}
                        className="w-full px-2 py-1 border rounded"
                    />
                </div>
                <div>
                    <label className="block text-slate-500 mb-1">Sotto</label>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={pxToMm(margins.bottom)}
                        onChange={(e) => onMarginsChange({ ...margins, bottom: mmToPx(Number(e.target.value)) })}
                        className="w-full px-2 py-1 border rounded"
                    />
                </div>
                <div>
                    <label className="block text-slate-500 mb-1">Sinistra</label>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={pxToMm(margins.left)}
                        onChange={(e) => onMarginsChange({ ...margins, left: mmToPx(Number(e.target.value)) })}
                        className="w-full px-2 py-1 border rounded"
                    />
                </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
                L'area di stampa sicura è indicata dal rettangolo blu tratteggiato nel canvas
            </p>
        </div>
    );
};

export default MarginsPanel;
