/**
 * PatientCard - Patient information display
 * 
 * Displays patient information with avatar, contact details,
 * and current appointment info
 * 
 * @module pages/clinica/clinica/components/PatientCard
 * @project P52 - Clinical Visit Template System
 */

import React from 'react';
import { User, Phone, Mail, Calendar, MapPin } from 'lucide-react';
import type { PatientCardProps } from '../types';
import { formatDate, formatTime } from '../../../../utils/dateUtils';

export const PatientCard: React.FC<PatientCardProps> = ({
    paziente,
    appuntamento
}) => {
    // Get display name (support both Italian and English fields)
    const displayName = `${paziente.cognome || paziente.lastName || ''} ${paziente.nome || paziente.firstName || ''}`.trim();
    const displayPhone = paziente.telefono || paziente.phone;
    const displayEmail = paziente.email;
    const displayTaxCode = paziente.codiceFiscale || paziente.taxCode;
    const displayBirthDate = paziente.dataNascita || paziente.birthDate;

    // Calculate age
    const calculateAge = (birthDateStr: string): number => {
        const birthDate = new Date(birthDateStr);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40">
                        <User className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1 text-white">
                        <h2 className="text-xl font-bold">
                            {displayName || 'Paziente'}
                        </h2>
                        {displayTaxCode && (
                            <p className="text-teal-100 text-sm">
                                CF: {displayTaxCode}
                            </p>
                        )}
                        {displayBirthDate && (
                            <p className="text-teal-100 text-sm">
                                {calculateAge(displayBirthDate)} anni • {formatDate(new Date(displayBirthDate), 'short')}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Contact Info */}
            <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex flex-wrap gap-4 text-sm">
                    {displayPhone && (
                        <a
                            href={`tel:${displayPhone}`}
                            className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors"
                        >
                            <Phone className="h-4 w-4" />
                            {displayPhone}
                        </a>
                    )}
                    {displayEmail && (
                        <a
                            href={`mailto:${displayEmail}`}
                            className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors"
                        >
                            <Mail className="h-4 w-4" />
                            {displayEmail}
                        </a>
                    )}
                </div>
            </div>

            {/* Appointment Info */}
            {appuntamento && (
                <div className="px-6 py-4 bg-gray-50">
                    <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-teal-500 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium text-gray-900">
                                {appuntamento.prestazione?.nome || 'Visita'}
                            </p>
                            <p className="text-sm text-gray-500">
                                {formatDate(new Date(appuntamento.dataOra), 'short')}
                                {' alle '}
                                {formatTime(new Date(appuntamento.dataOra))}
                            </p>
                            {appuntamento.ambulatorio && (
                                <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {appuntamento.ambulatorio.nome}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientCard;
