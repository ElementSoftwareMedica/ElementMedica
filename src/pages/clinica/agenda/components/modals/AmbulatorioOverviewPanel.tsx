/**
 * AmbulatorioOverviewPanel - Shows ambulatori availability summary for each day
 * @module pages/clinica/agenda/components/modals/AmbulatorioOverviewPanel
 */

import React, { useMemo } from 'react';
import { Building2, X } from 'lucide-react';

import { formatTime } from '../../../../../utils/dateUtils';
import { isSameDay, DAYS_OF_WEEK } from '../../utils';
import type { AmbulatorioOverviewPanelProps } from './types';

export const AmbulatorioOverviewPanel: React.FC<AmbulatorioOverviewPanelProps> = ({
    isOpen,
    onClose,
    ambulatori,
    disponibilita,
    displayDays,
    medicoColors
}) => {
    if (!isOpen) return null;

    // Group disponibilita by day and ambulatorio
    const disponibilitaByDayAndAmb = useMemo(() => {
        const result: Record<string, Record<string, typeof disponibilita>> = {};

        displayDays.forEach(day => {
            const dayKey = day.toISOString().split('T')[0];
            result[dayKey] = {};
            ambulatori.forEach(amb => {
                result[dayKey][amb.id] = disponibilita.filter(d =>
                    d.ambulatorioId === amb.id && isSameDay(d.start, day)
                ).sort((a, b) => a.start.getTime() - b.start.getTime());
            });
        });

        return result;
    }, [displayDays, ambulatori, disponibilita]);

    return (
        <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="px-4 py-2 flex items-center justify-between bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-semibold text-gray-700">Riepilogo Disponibilità Ambulatori</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-3 py-2 text-left text-gray-600 font-medium sticky left-0 bg-gray-50 z-10 min-w-[120px]">
                                Ambulatorio
                            </th>
                            {displayDays.map((day, idx) => (
                                <th key={idx} className={`px-3 py-2 text-center font-medium min-w-[100px] ${isSameDay(day, new Date()) ? 'bg-teal-50 text-teal-700' : 'text-gray-600'}`}>
                                    {DAYS_OF_WEEK[(day.getDay() + 6) % 7]} {day.getDate()}/{day.getMonth() + 1}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ambulatori.map((amb, ambIdx) => {
                            const borderColors = ['border-l-teal-400', 'border-l-blue-400', 'border-l-purple-400', 'border-l-amber-400', 'border-l-rose-400'];
                            return (
                                <tr key={amb.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className={`px-3 py-2 text-gray-900 font-medium sticky left-0 bg-white z-10 border-l-4 ${borderColors[ambIdx % borderColors.length]}`}>
                                        {amb.nome}
                                    </td>
                                    {displayDays.map((day, dayIdx) => {
                                        const dayKey = day.toISOString().split('T')[0];
                                        const slots = disponibilitaByDayAndAmb[dayKey]?.[amb.id] || [];

                                        if (slots.length === 0) {
                                            return (
                                                <td key={dayIdx} className={`px-2 py-2 text-center ${isSameDay(day, new Date()) ? 'bg-teal-50/50' : ''}`}>
                                                    <span className="text-gray-300">—</span>
                                                </td>
                                            );
                                        }

                                        // Group by medico
                                        const byMedico: Record<string, typeof slots> = {};
                                        slots.forEach(s => {
                                            const mId = s.medicoId || 'unknown';
                                            if (!byMedico[mId]) byMedico[mId] = [];
                                            byMedico[mId].push(s);
                                        });

                                        return (
                                            <td key={dayIdx} className={`px-2 py-1 ${isSameDay(day, new Date()) ? 'bg-teal-50/50' : ''}`}>
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {Object.entries(byMedico).map(([medicoId, medicoSlots]) => {
                                                        const color = medicoColors.get(medicoId);
                                                        const firstSlot = medicoSlots[0];
                                                        const lastSlot = medicoSlots[medicoSlots.length - 1];
                                                        return (
                                                            <div
                                                                key={medicoId}
                                                                className={`px-1.5 py-0.5 rounded ${color?.bg || 'bg-gray-100'} ${color?.text || 'text-gray-700'}`}
                                                                title={`${firstSlot.medicoNome}: ${formatTime(firstSlot.start)} - ${formatTime(lastSlot.end)}`}
                                                            >
                                                                {formatTime(firstSlot.start).slice(0, 5)}-{formatTime(lastSlot.end).slice(0, 5)}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AmbulatorioOverviewPanel;
