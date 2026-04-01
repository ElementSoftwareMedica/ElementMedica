/**
 * AccettazionePatientCard - Card paziente per accettazione
 * 
 * Card con informazioni paziente, stato workflow, tempo attesa.
 * Integra numero coda e azioni rapide.
 * 
 * @module pages/clinica/agenda/components/accettazione
 */

import React from 'react';
import {
    User,
    Clock,
    Stethoscope,
    Building2,
    Calendar,
    Timer,
    CheckCircle,
    XCircle,
    LogIn,
    Bell,
    RefreshCw,
    Phone,
    Hash
} from 'lucide-react';
import { Appuntamento, StatoAppuntamento } from '../../../../../services/clinicaApi';
import { formatTime } from '@/utils/dateUtils';
import { getDoctorTitle } from '../../../../../utils/codiceFiscale';
import { getPersonDisplayName } from '../../../../../utils/personDisplayUtils';

// ============================================
// TYPES
// ============================================

export interface AccettazionePatientCardProps {
    appuntamento: Appuntamento;
    onCheckIn?: () => void;
    onChiama?: () => void;
    onCompleta?: () => void;
    onNoShow?: () => void;
    isLoading?: boolean;
    showDetails?: boolean;
    compact?: boolean;
}

interface StatoConfig {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ElementType;
    actionLabel?: string;
    actionIcon?: React.ElementType;
    actionColor?: string;
}

// ============================================
// CONSTANTS
// ============================================

const STATO_CONFIG: Record<string, StatoConfig> = {
    PRENOTATO: {
        label: 'Prenotato',
        color: 'text-slate-700 dark:text-slate-300',
        bgColor: 'bg-slate-100 dark:bg-slate-900/40',
        icon: Calendar,
        actionLabel: 'Check-in',
        actionIcon: LogIn,
        actionColor: 'bg-teal-600 hover:bg-teal-700'
    },
    CONFERMATO: {
        label: 'Confermato',
        color: 'text-blue-700 dark:text-blue-300',
        bgColor: 'bg-blue-100 dark:bg-blue-900/40',
        icon: Clock,
        actionLabel: 'Check-in',
        actionIcon: LogIn,
        actionColor: 'bg-teal-600 hover:bg-teal-700'
    },
    IN_ATTESA: {
        label: 'In Sala Attesa',
        color: 'text-amber-700 dark:text-amber-300',
        bgColor: 'bg-amber-100 dark:bg-amber-900/40',
        icon: Timer,
        actionLabel: 'Chiama',
        actionIcon: Bell,
        actionColor: 'bg-amber-600 hover:bg-amber-700'
    },
    IN_CORSO: {
        label: 'In Visita',
        color: 'text-purple-700 dark:text-purple-300',
        bgColor: 'bg-purple-100 dark:bg-purple-900/40',
        icon: Stethoscope,
        actionLabel: 'Completa',
        actionIcon: CheckCircle,
        actionColor: 'bg-purple-600 hover:bg-purple-700'
    },
    COMPLETATO: {
        label: 'Completato',
        color: 'text-green-700 dark:text-green-300',
        bgColor: 'bg-green-100 dark:bg-green-900/40',
        icon: CheckCircle
    },
    NO_SHOW: {
        label: 'Non Presentato',
        color: 'text-red-700 dark:text-red-300',
        bgColor: 'bg-red-100 dark:bg-red-900/40',
        icon: XCircle
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const calculateWaitTime = (appuntamento: Appuntamento): number => {
    if (appuntamento.stato !== 'IN_ATTESA' || !appuntamento.oraArrivo) {
        return 0;
    }
    const now = new Date();
    const arrivo = new Date(appuntamento.oraArrivo);
    return Math.floor((now.getTime() - arrivo.getTime()) / 60000);
};

const isLate = (appuntamento: Appuntamento): boolean => {
    const dataOra = new Date(appuntamento.dataOra);
    const now = new Date();
    return dataOra < now && (appuntamento.stato === 'PRENOTATO' || appuntamento.stato === 'CONFERMATO');
};

// ============================================
// COMPONENT
// ============================================

export const AccettazionePatientCard: React.FC<AccettazionePatientCardProps> = ({
    appuntamento,
    onCheckIn,
    onChiama,
    onCompleta,
    onNoShow,
    isLoading = false,
    showDetails = true,
    compact = false
}) => {
    const config = STATO_CONFIG[appuntamento.stato] || STATO_CONFIG.PRENOTATO;
    const Icon = config.icon;
    const waitTime = calculateWaitTime(appuntamento);
    const isAppointmentLate = isLate(appuntamento);
    const dataOra = new Date(appuntamento.dataOra);

    // Determine primary action
    const getPrimaryAction = () => {
        switch (appuntamento.stato) {
            case 'PRENOTATO':
            case 'CONFERMATO':
                return onCheckIn ? { handler: onCheckIn, label: 'Check-in', icon: LogIn, color: 'bg-teal-600 hover:bg-teal-700' } : null;
            case 'IN_ATTESA':
                return onChiama ? { handler: onChiama, label: 'Chiama', icon: Bell, color: 'bg-amber-600 hover:bg-amber-700' } : null;
            case 'IN_CORSO':
                return onCompleta ? { handler: onCompleta, label: 'Completa', icon: CheckCircle, color: 'bg-purple-600 hover:bg-purple-700' } : null;
            default:
                return null;
        }
    };

    const primaryAction = getPrimaryAction();

    if (compact) {
        return (
            <div className={`
                flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border-2 transition-all
                ${isAppointmentLate ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-600'}
            `}>
                <div className="flex items-center gap-3 min-w-0">
                    {/* Queue Number */}
                    {appuntamento.numeroCoda && (
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                            <span className="text-lg font-bold text-teal-700 dark:text-teal-300">{appuntamento.numeroCoda}</span>
                        </div>
                    )}

                    {/* Patient Info */}
                    <div className="min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {getPersonDisplayName(appuntamento.paziente, 'Paziente')}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className={isAppointmentLate ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                                {formatTime(dataOra)}
                            </span>
                            {appuntamento.prestazione && (
                                <>
                                    <span>•</span>
                                    <span className="truncate">{appuntamento.prestazione.nome}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Status & Action */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.bgColor} ${config.color}`}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                    </span>

                    {primaryAction && (
                        <button
                            onClick={primaryAction.handler}
                            disabled={isLoading}
                            className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium ${primaryAction.color} disabled:opacity-50`}
                        >
                            {isLoading ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                primaryAction.label
                            )}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`
            bg-white dark:bg-gray-800 rounded-lg border-2 p-4 transition-all
            ${isAppointmentLate ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-600'}
        `}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    {/* Avatar or Queue Number */}
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                        {appuntamento.numeroCoda ? (
                            <div className="w-full h-full bg-teal-100 dark:bg-teal-900/40 flex flex-col items-center justify-center">
                                <Hash className="h-3 w-3 text-teal-500 dark:text-teal-400" />
                                <span className="text-lg font-bold text-teal-700 dark:text-teal-300 -mt-1">{appuntamento.numeroCoda}</span>
                            </div>
                        ) : (
                            <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                        )}
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {getPersonDisplayName(appuntamento.paziente, 'Paziente')}
                        </h3>
                        <div className="flex items-center gap-2 text-sm">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                                <Icon className="h-3 w-3" />
                                {config.label}
                            </span>
                            {waitTime > 0 && (
                                <span className="text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1">
                                    <Timer className="h-3 w-3" />
                                    {waitTime} min
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Large Queue Number Display (if no avatar queue) */}
                {appuntamento.numeroCoda && (
                    <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">N°</p>
                        <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{appuntamento.numeroCoda}</p>
                    </div>
                )}
            </div>

            {/* Details */}
            {showDetails && (
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span className={isAppointmentLate ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                            {formatTime(dataOra)}
                            {isAppointmentLate && ' (ritardo)'}
                        </span>
                    </div>

                    {appuntamento.prestazione && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Stethoscope className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{appuntamento.prestazione.nome}</span>
                        </div>
                    )}

                    {appuntamento.medico && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                                {getDoctorTitle(appuntamento.medico.taxCode, appuntamento.medico.gender)} {getPersonDisplayName(appuntamento.medico)}
                            </span>
                        </div>
                    )}

                    {appuntamento.ambulatorio && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Building2 className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{appuntamento.ambulatorio.nome}</span>
                        </div>
                    )}

                    {appuntamento.paziente?.phone && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Phone className="h-4 w-4 flex-shrink-0" />
                            <span>{appuntamento.paziente.phone}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
                {primaryAction && (
                    <button
                        onClick={primaryAction.handler}
                        disabled={isLoading}
                        className={`
                            flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium text-white
                            ${primaryAction.color}
                            disabled:opacity-50
                        `}
                    >
                        {isLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <primaryAction.icon className="h-4 w-4" />
                                {primaryAction.label}
                            </>
                        )}
                    </button>
                )}

                {(appuntamento.stato === 'PRENOTATO' || appuntamento.stato === 'CONFERMATO') && onNoShow && (
                    <button
                        onClick={onNoShow}
                        disabled={isLoading}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Segna come Non Presentato"
                    >
                        <XCircle className="h-5 w-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default AccettazionePatientCard;
