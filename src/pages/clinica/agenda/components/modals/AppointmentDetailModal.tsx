/**
 * AppointmentDetailModal - Modal con dettagli appuntamento
 * @module pages/clinica/agenda/components/modals/AppointmentDetailModal
 */

import React from 'react';
import {
    CalendarIcon,
    Clock,
    Stethoscope,
    User,
    X,
    Check,
    Eye,
    Trash2,
    FileText,
    MapPin
} from 'lucide-react';

import type { Appuntamento, StatoAppuntamento } from '../../../../../services/clinicaApi';
import { formatTime } from '../../../../../utils/dateUtils';
import { getDoctorTitle } from '../../../../../utils/codiceFiscale';
import { STATO_COLORS, DAYS_FULL, MONTHS_IT } from '../../constants';
import type { AppointmentDetailModalProps } from './types';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
    isOpen,
    onClose,
    event,
    medici,
    ambulatori,
    onNavigateToEdit,
    onStatusChange,
    onDelete
}) => {
    const { confirm: confirmDialog } = useConfirmDialog();

    if (!isOpen || !event) return null;

    const appointment = event.raw as Appuntamento;
    const medico = medici.find(m => m.id === event.medicoId);
    const ambulatorio = ambulatori.find(a => a.id === event.ambulatorioId);
    const stateColors = STATO_COLORS[event.stato || 'PRENOTATO'];

    const formatDataOra = (date: Date) => {
        const giornoSettimana = DAYS_FULL[date.getDay()];
        const giorno = date.getDate();
        const mese = MONTHS_IT[date.getMonth()];
        const anno = date.getFullYear();
        const ora = formatTime(date);
        return `${giornoSettimana} ${giorno} ${mese} ${anno} alle ${ora}`;
    };

    const handleStatusChange = (newStatus: StatoAppuntamento) => {
        onStatusChange(event.id, newStatus);
        onClose();
    };

    const handleDelete = async () => {
        if (await confirmDialog({ title: 'Annulla appuntamento', message: 'Sei sicuro di voler annullare questo appuntamento?', variant: 'warning', confirmLabel: 'Annulla appuntamento' })) {
            onDelete(event.id);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={`p-4 border-b ${stateColors} rounded-t-xl`}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Dettagli Appuntamento</h3>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm text-white/90 capitalize">
                            {event.stato?.toLowerCase().replace('_', ' ') || 'Prenotato'}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Paziente */}
                    <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                            <p className="font-medium text-gray-900">{event.paziente || 'Paziente'}</p>
                            {event.pazienteTelefono && (
                                <a
                                    href={`tel:${event.pazienteTelefono}`}
                                    className="text-sm text-teal-600 hover:text-teal-700"
                                >
                                    {event.pazienteTelefono}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Data e Ora */}
                    <div className="flex items-start gap-3">
                        <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                            <p className="font-medium text-gray-900">{formatDataOra(event.start)}</p>
                            <p className="text-sm text-gray-500">
                                Durata: {Math.round((event.end.getTime() - event.start.getTime()) / 60000)} minuti
                            </p>
                        </div>
                    </div>

                    {/* Prestazione */}
                    {event.prestazione && (
                        <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="font-medium text-gray-900">{event.prestazione}</p>
                                {appointment?.prestazione?.codice && (
                                    <p className="text-sm text-gray-500">Cod. {appointment.prestazione.codice}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Medico */}
                    {medico && (
                        <div className="flex items-start gap-3">
                            <Stethoscope className="h-5 w-5 text-gray-400 mt-0.5" />
                            <p className="font-medium text-gray-900">
                                {getDoctorTitle(medico.taxCode || null, medico.gender || null)} {medico.lastName || medico.cognome} {medico.firstName || medico.nome}
                            </p>
                        </div>
                    )}

                    {/* Ambulatorio */}
                    {ambulatorio && (
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                            <p className="font-medium text-gray-900">{ambulatorio.nome}</p>
                        </div>
                    )}

                    {/* Note */}
                    {appointment?.note && (
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm text-gray-600">{appointment.note}</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {!['COMPLETATO', 'ANNULLATO', 'NO_SHOW'].includes(event.stato || '') && (
                    <div className="p-4 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <button
                                onClick={() => handleStatusChange('CONFERMATO')}
                                className="px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm font-medium flex items-center justify-center gap-1"
                            >
                                <Check className="h-4 w-4" />
                                Conferma
                            </button>
                            <button
                                onClick={() => handleStatusChange('IN_ATTESA')}
                                className="px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 text-sm font-medium flex items-center justify-center gap-1"
                            >
                                <Clock className="h-4 w-4" />
                                In Attesa
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 flex gap-3 justify-between">
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center gap-1"
                    >
                        <Trash2 className="h-4 w-4" />
                        Annulla
                    </button>
                    <button
                        onClick={() => {
                            onNavigateToEdit(event.id);
                            onClose();
                        }}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium flex items-center gap-1"
                    >
                        <Eye className="h-4 w-4" />
                        Dettagli Completi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppointmentDetailModal;
