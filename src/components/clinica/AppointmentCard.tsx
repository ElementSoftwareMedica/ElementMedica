/**
 * AppointmentCard Component
 * Displays appointment information in a card format
 * 
 * Features:
 * - Appointment details (date, time, type)
 * - Patient info
 * - Status indicator
 * - Quick actions (view, edit, change status)
 * 
 * @module components/clinica/AppointmentCard
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
    Clock,
    User,
    MapPin,
    Calendar,
    Phone,
    CheckCircle,
    XCircle,
    AlertCircle,
    PlayCircle,
    MoreVertical
} from 'lucide-react';
import { Appuntamento, Paziente, Prestazione, Ambulatorio } from '../../services/clinicaApi';
import { formatDate } from '@/utils/dateUtils';
import { StatusBadge } from './StatusBadge';

// =====================================================
// TYPES
// =====================================================

// Extended appointment type with related data (for display purposes)
interface AppointmentWithRelations extends Appuntamento {
    paziente?: Paziente;
    prestazione?: Prestazione;
    ambulatorio?: Ambulatorio;
}

interface AppointmentCardProps {
    appointment: AppointmentWithRelations;
    variant?: 'default' | 'compact' | 'timeline';
    showPatient?: boolean;
    showActions?: boolean;
    onChangeStatus?: (id: string, status: Appuntamento['stato']) => void;
    onSelect?: (appointment: AppointmentWithRelations) => void;
    className?: string;
}

// =====================================================
// HELPERS
// =====================================================

const statusConfig: Record<Appuntamento['stato'], {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
}> = {
    PRENOTATO: {
        label: 'Prenotato',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        icon: <Calendar className="w-4 h-4" />
    },
    CONFERMATO: {
        label: 'Confermato',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        icon: <CheckCircle className="w-4 h-4" />
    },
    IN_ATTESA: {
        label: 'In Attesa',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        icon: <Clock className="w-4 h-4" />
    },
    IN_CORSO: {
        label: 'In Corso',
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-100',
        icon: <PlayCircle className="w-4 h-4" />
    },
    COMPLETATO: {
        label: 'Completato',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        icon: <CheckCircle className="w-4 h-4" />
    },
    ANNULLATO: {
        label: 'Annullato',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        icon: <XCircle className="w-4 h-4" />
    },
    NO_SHOW: {
        label: 'Non Presentato',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        icon: <AlertCircle className="w-4 h-4" />
    }
};

/**
 * Get date from dataOra field
 */
function getDateFromDataOra(dataOra: string): string {
    return dataOra.split('T')[0];
}

/**
 * Combine date and time strings into a Date object
 */
function getDateTime(dataOra: string, time?: string): Date {
    if (time) {
        const date = dataOra.split('T')[0];
        return new Date(`${date}T${time}`);
    }
    return new Date(dataOra);
}

/**
 * Calculate duration in minutes from start and end time
 */
function calculateDuration(oraInizio?: string, oraFine?: string): number {
    if (!oraInizio || !oraFine) return 0;
    const [hStart, mStart] = oraInizio.split(':').map(Number);
    const [hEnd, mEnd] = oraFine.split(':').map(Number);
    return ((hEnd * 60 + mEnd) - (hStart * 60 + mStart));
}

// =====================================================
// COMPONENT
// =====================================================

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
    appointment,
    variant = 'default',
    showPatient = true,
    showActions = true,
    onChangeStatus,
    onSelect,
    className = ''
}) => {
    const status = statusConfig[appointment.stato];
    const isClickable = Boolean(onSelect);
    const dateTime = getDateTime(appointment.dataOra, appointment.oraInizio);
    const duration = calculateDuration(appointment.oraInizio, appointment.oraFine);

    // Compact variant (for lists)
    if (variant === 'compact') {
        return (
            <div
                className={`
          flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200
          hover:border-blue-300 hover:shadow-sm transition-all
          ${isClickable ? 'cursor-pointer' : ''}
          ${className}
        `}
                onClick={() => onSelect?.(appointment)}
            >
                <div className="flex items-center gap-4">
                    {/* Time */}
                    <div className="text-center min-w-[60px]">
                        <p className="text-lg font-semibold text-gray-900">
                            {appointment.oraInizio || new Date(appointment.dataOra).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-gray-500">
                            {formatDate(appointment.dataOra, 'short')}
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-10 bg-gray-200" />

                    {/* Info */}
                    <div>
                        {showPatient && appointment.paziente && (
                            <p className="font-medium text-gray-900">
                                {appointment.paziente.cognome} {appointment.paziente.nome}
                            </p>
                        )}
                        <p className="text-sm text-gray-500">
                            {appointment.prestazione?.nome || 'Visita'}
                        </p>
                    </div>
                </div>

                <StatusBadge status={appointment.stato} size="sm" />
            </div>
        );
    }

    // Timeline variant (for agenda view)
    if (variant === 'timeline') {
        return (
            <div className={`relative pl-6 pb-6 ${className}`}>
                {/* Timeline dot */}
                <div className={`absolute left-0 top-0 w-3 h-3 rounded-full ${status.bgColor} border-2 border-white shadow`} />

                {/* Timeline line */}
                <div className="absolute left-1.5 top-3 bottom-0 w-px bg-gray-200" />

                {/* Content */}
                <div
                    className={`
            bg-white rounded-lg border border-gray-200 p-4 ml-4
            hover:shadow-md transition-shadow
            ${isClickable ? 'cursor-pointer' : ''}
          `}
                    onClick={() => onSelect?.(appointment)}
                >
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                                {appointment.oraInizio}
                            </span>
                            {duration > 0 && (
                                <span className="text-sm text-gray-500">
                                    ({duration} min)
                                </span>
                            )}
                        </div>
                        <StatusBadge status={appointment.stato} size="sm" />
                    </div>

                    {showPatient && appointment.paziente && (
                        <p className="font-medium text-gray-900 mb-1">
                            {appointment.paziente.cognome} {appointment.paziente.nome}
                        </p>
                    )}

                    <p className="text-sm text-gray-600">
                        {appointment.prestazione?.nome || 'Visita generica'}
                    </p>

                    {appointment.ambulatorio && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span>{appointment.ambulatorio.nome}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Default variant
    return (
        <div
            className={`
        bg-white rounded-xl border border-gray-200 overflow-hidden
        hover:shadow-lg transition-shadow
        ${isClickable ? 'cursor-pointer' : ''}
        ${className}
      `}
            onClick={() => onSelect?.(appointment)}
        >
            {/* Header */}
            <div className={`px-4 py-3 ${status.bgColor} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    {status.icon}
                    <span className={`font-medium ${status.color}`}>{status.label}</span>
                </div>
                {showActions && (
                    <button
                        className="p-1 hover:bg-black/10 rounded-full transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Show actions menu
                        }}
                    >
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Date & Time */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-lg bg-blue-100 flex flex-col items-center justify-center">
                        <span className="text-xs text-blue-600 font-medium">
                            {dateTime.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase()}
                        </span>
                        <span className="text-lg font-bold text-blue-700">
                            {dateTime.getDate()}
                        </span>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">
                            {appointment.oraInizio}
                        </p>
                        <p className="text-sm text-gray-500">
                            {duration > 0 ? `${duration} minuti` : 'Durata standard'}
                        </p>
                    </div>
                </div>

                {/* Patient */}
                {showPatient && appointment.paziente && (
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">
                                {appointment.paziente.cognome} {appointment.paziente.nome}
                            </p>
                            {appointment.paziente.telefono && (
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {appointment.paziente.telefono}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Procedure */}
                <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">Prestazione</p>
                    <p className="font-medium text-gray-900">
                        {appointment.prestazione?.nome || 'Visita generica'}
                    </p>
                </div>

                {/* Location */}
                {appointment.ambulatorio && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{appointment.ambulatorio.nome}</span>
                        {appointment.ambulatorio.piano && (
                            <span className="text-gray-400">• Piano {appointment.ambulatorio.piano}</span>
                        )}
                    </div>
                )}

                {/* Notes */}
                {appointment.note && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">{appointment.note}</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            {showActions && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
                    <Link
                        to={`/clinica/appuntamenti/${appointment.id}`}
                        className="flex-1 px-3 py-2 text-sm text-center text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Dettagli
                    </Link>
                    {appointment.stato === 'PRENOTATO' && (
                        <button
                            className="flex-1 px-3 py-2 text-sm text-center text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChangeStatus?.(appointment.id, 'CONFERMATO');
                            }}
                        >
                            Conferma
                        </button>
                    )}
                    {appointment.stato === 'CONFERMATO' && (
                        <button
                            className="flex-1 px-3 py-2 text-sm text-center bg-green-600 text-white hover:bg-green-700 rounded-md transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChangeStatus?.(appointment.id, 'IN_ATTESA');
                            }}
                        >
                            Check-in
                        </button>
                    )}
                    {appointment.stato === 'IN_ATTESA' && (
                        <button
                            className="flex-1 px-3 py-2 text-sm text-center bg-indigo-600 text-white hover:bg-indigo-700 rounded-md transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChangeStatus?.(appointment.id, 'IN_CORSO');
                            }}
                        >
                            Inizia Visita
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default AppointmentCard;
