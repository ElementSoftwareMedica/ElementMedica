/**
 * ReschedulePanel - Panel for rescheduling appointment date/time/medico
 * @module pages/clinica/agenda/components/modals/AppointmentBookingModal/ReschedulePanel
 */

import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

import { getDoctorTitle } from '../../../../../../utils/codiceFiscale';
import type { Medico } from '../../../../../../services/clinicaApi';
import type { ReschedulePanelProps } from './types';
import { DatePickerElegante } from '../../../../../../components/ui/DatePickerElegante';

export const ReschedulePanel: React.FC<ReschedulePanelProps> = ({
    showReschedulePanel,
    setShowReschedulePanel,
    rescheduleData,
    setRescheduleData,
    filteredMediciForReschedule,
    selectedPrestazione
}) => {
    if (!showReschedulePanel) return null;

    return (
        <div className="mx-4 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Modifica Data, Ora e Medico
            </h4>
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                    <DatePickerElegante
                        value={rescheduleData.date}
                        onChange={(date) => setRescheduleData({ ...rescheduleData, date: date ? date.toISOString().split('T')[0] : '' })}
                        theme="teal"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ora</label>
                    <input
                        type="time"
                        value={rescheduleData.time}
                        onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Medico {selectedPrestazione && <span className="text-gray-400">({filteredMediciForReschedule.length} abilitati)</span>}
                    </label>
                    <select
                        value={rescheduleData.medicoId}
                        onChange={(e) => setRescheduleData({ ...rescheduleData, medicoId: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        {filteredMediciForReschedule.map((m: Medico) => (
                            <option key={m.id} value={m.id}>
                                {getDoctorTitle(m.taxCode || null, m.gender || null)} {m.lastName || m.cognome} {m.firstName || m.nome}
                            </option>
                        ))}
                    </select>
                    {selectedPrestazione && filteredMediciForReschedule.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                            Nessun medico abilitato per questa prestazione
                        </p>
                    )}
                </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
                Le modifiche saranno applicate al salvataggio dell'appuntamento
            </p>
        </div>
    );
};

export default ReschedulePanel;
