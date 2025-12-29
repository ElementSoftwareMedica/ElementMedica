/**
 * PatientCard Component
 * Displays patient information in a card format
 * 
 * Features:
 * - Patient basic info (name, age, cf)
 * - Contact information
 * - Last visit date
 * - Quick actions (view, edit, history)
 * 
 * @module components/clinica/PatientCard
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
    User,
    Phone,
    Mail,
    Calendar,
    FileText,
    ChevronRight,
    MapPin,
    Clock
} from 'lucide-react';
import { Paziente } from '../../services/clinicaApi';
import { formatDate } from '@/utils/dateUtils';

// =====================================================
// TYPES
// =====================================================

interface PatientCardProps {
    patient: Paziente;
    variant?: 'default' | 'compact' | 'detailed';
    showActions?: boolean;
    onSelect?: (patient: Paziente) => void;
    className?: string;
}

// =====================================================
// HELPERS
// =====================================================

function calculateAge(birthDate: string | Date | null | undefined): number | null {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

function formatCodiceFiscale(cf: string | null | undefined): string {
    if (!cf) return '---';
    return cf.toUpperCase();
}

// =====================================================
// COMPONENT
// =====================================================

export const PatientCard: React.FC<PatientCardProps> = ({
    patient,
    variant = 'default',
    showActions = true,
    onSelect,
    className = ''
}) => {
    const age = calculateAge(patient.dataNascita);
    const fullName = `${patient.cognome} ${patient.nome}`;

    // Compact variant
    if (variant === 'compact') {
        return (
            <div
                className={`
          flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200
          hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer
          ${className}
        `}
                onClick={() => onSelect?.(patient)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">{fullName}</p>
                        <p className="text-sm text-gray-500">
                            {formatCodiceFiscale(patient.codiceFiscale)}
                            {age !== null && ` • ${age} anni`}
                        </p>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
        );
    }

    // Detailed variant
    if (variant === 'detailed') {
        return (
            <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                            <User className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-white">
                            <h3 className="text-xl font-semibold">{fullName}</h3>
                            <p className="text-blue-100">
                                {formatCodiceFiscale(patient.codiceFiscale)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Age */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Età</p>
                                <p className="font-medium text-gray-900">
                                    {age !== null ? `${age} anni` : 'N/D'}
                                </p>
                            </div>
                        </div>

                        {/* Birth Date */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Data Nascita</p>
                                <p className="font-medium text-gray-900">
                                    {patient.dataNascita ? formatDate(patient.dataNascita) : 'N/D'}
                                </p>
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Phone className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Telefono</p>
                                <p className="font-medium text-gray-900">
                                    {patient.telefono || 'N/D'}
                                </p>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium text-gray-900 truncate max-w-[150px]">
                                    {patient.email || 'N/D'}
                                </p>
                            </div>
                        </div>

                        {/* Address */}
                        {patient.indirizzo && (
                            <div className="col-span-2 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <MapPin className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Indirizzo</p>
                                    <p className="font-medium text-gray-900">
                                        {patient.indirizzo}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    {showActions && (
                        <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                            <Link
                                to={`/clinica/pazienti/${patient.id}`}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center text-sm font-medium"
                            >
                                Visualizza Scheda
                            </Link>
                            <Link
                                to={`/clinica/pazienti/${patient.id}/storico`}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-center text-sm font-medium"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Storico
                                </span>
                            </Link>
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
        bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow
        ${onSelect ? 'cursor-pointer' : ''}
        ${className}
      `}
            onClick={() => onSelect?.(patient)}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900">{fullName}</h4>
                        <p className="text-sm text-gray-500">
                            {formatCodiceFiscale(patient.codiceFiscale)}
                        </p>
                    </div>
                </div>
                {age !== null && (
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                        {age} anni
                    </span>
                )}
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-4">
                {patient.telefono && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{patient.telefono}</span>
                    </div>
                )}
                {patient.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{patient.email}</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            {showActions && (
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <Link
                        to={`/clinica/pazienti/${patient.id}`}
                        className="flex-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md text-center transition-colors"
                    >
                        Dettagli
                    </Link>
                    <Link
                        to={`/clinica/appuntamenti/nuovo?pazienteId=${patient.id}`}
                        className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md text-center hover:bg-blue-700 transition-colors"
                    >
                        Prenota
                    </Link>
                </div>
            )}
        </div>
    );
};

export default PatientCard;
