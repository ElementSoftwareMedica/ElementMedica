/**
 * MedicoCard - Card per visualizzazione medico con preview disponibilità
 * @module pages/clinica/agenda/disponibilita/components/MedicoCard
 */

import React from 'react';
import { User, Clock, Calendar, AlertTriangle, ChevronRight } from 'lucide-react';
import { getDoctorTitle } from '../../../../../utils/codiceFiscale';
import type { MedicoWithStats } from '../types';
import { GIORNI_SETTIMANA } from '../types';

interface MedicoCardProps {
    medico: MedicoWithStats;
    onClick: () => void;
    isSelected?: boolean;
}

export const MedicoCard: React.FC<MedicoCardProps> = ({ medico, onClick, isSelected }) => {
    const firstName = medico.firstName || medico.nome || '';
    const lastName = medico.lastName || medico.cognome || '';
    const title = getDoctorTitle(medico.taxCode, medico.gender);

    return (
        <div
            onClick={onClick}
            className={`
                relative p-4 bg-white rounded-xl border-2 cursor-pointer
                transition-all hover:shadow-lg hover:-translate-y-0.5
                ${isSelected
                    ? 'border-teal-500 ring-2 ring-teal-100'
                    : 'border-gray-200 hover:border-teal-300'
                }
                ${medico.hasActiveVacation ? 'opacity-75' : ''}
            `}
        >
            {/* Vacation Badge */}
            {medico.hasActiveVacation && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    In ferie
                </div>
            )}

            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
                {/* Avatar */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-sm">
                    <User className="h-6 w-6 text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                        {title} {lastName} {firstName}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                        {medico.specialties?.join(', ') || medico.specializzazione || 'Medico generico'}
                    </p>
                </div>

                {/* Arrow */}
                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                {/* Weekly Hours */}
                <div className="px-3 py-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Ore/settimana</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                        {medico.weeklyHours}h
                    </p>
                </div>

                {/* Slots Count */}
                <div className="px-3 py-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Fasce orarie</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                        {medico.slotsCount}
                    </p>
                </div>
            </div>

            {/* Next Slot Preview */}
            {medico.nextSlot && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Prossima disponibilità</p>
                    <p className="text-sm font-medium text-teal-600">
                        {new Date(medico.nextSlot.data).toLocaleDateString('it-IT', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                        })} • {medico.nextSlot.oraInizio} - {medico.nextSlot.oraFine}
                    </p>
                </div>
            )}

            {/* No Slots Warning */}
            {medico.slotsCount === 0 && !medico.nextSlot && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Nessun orario configurato
                    </p>
                </div>
            )}
        </div>
    );
};
