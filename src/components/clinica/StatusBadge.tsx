/**
 * StatusBadge Component
 * Displays status indicators with appropriate styling
 * 
 * Features:
 * - Multiple status types (appointment, visit, report)
 * - Size variants
 * - Icon support
 * - Pulsing animation for active states
 * 
 * @module components/clinica/StatusBadge
 */

import React from 'react';
import {
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    PlayCircle,
    Calendar,
    FileText,
    Edit,
    Send,
    Archive,
    Receipt,
    RotateCcw
} from 'lucide-react';

// =====================================================
// TYPES
// =====================================================

// Appointment statuses (matches StatoAppuntamento enum from backend)
type AppointmentStatus =
    | 'PRENOTATO'
    | 'CONFERMATO'
    | 'IN_ATTESA'
    | 'IN_CORSO'
    | 'COMPLETATO'
    | 'FATTURATO'
    | 'ANNULLATO'
    | 'NO_SHOW'
    | 'RINVIATO';

// Visit statuses
type VisitStatus =
    | 'PROGRAMMATA'
    | 'IN_CORSO'
    | 'COMPLETATA'
    | 'ANNULLATA';

// Report statuses
type ReportStatus =
    | 'BOZZA'
    | 'IN_REVISIONE'
    | 'DA_FIRMARE'
    | 'FIRMATO'
    | 'CONSEGNATO'
    | 'ARCHIVIATO';

type StatusType = AppointmentStatus | VisitStatus | ReportStatus;

interface StatusBadgeProps {
    status: StatusType;
    type?: 'appointment' | 'visit' | 'report';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    pulse?: boolean;
    className?: string;
}

// =====================================================
// STATUS CONFIGS
// =====================================================

interface StatusConfig {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
}

const appointmentStatusConfig: Record<AppointmentStatus, StatusConfig> = {
    PRENOTATO: {
        label: 'Prenotato',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: <Calendar className="w-full h-full" />
    },
    CONFERMATO: {
        label: 'Confermato',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: <CheckCircle className="w-full h-full" />
    },
    IN_ATTESA: {
        label: 'In Attesa',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: <Clock className="w-full h-full" />
    },
    IN_CORSO: {
        label: 'In Corso',
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        icon: <PlayCircle className="w-full h-full" />
    },
    COMPLETATO: {
        label: 'Completato',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: <CheckCircle className="w-full h-full" />
    },
    ANNULLATO: {
        label: 'Annullato',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: <XCircle className="w-full h-full" />
    },
    NO_SHOW: {
        label: 'Non Presentato',
        color: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: <AlertCircle className="w-full h-full" />
    },
    FATTURATO: {
        label: 'Fatturato',
        color: 'text-purple-700',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        icon: <Receipt className="w-full h-full" />
    },
    RINVIATO: {
        label: 'Rinviato',
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: <RotateCcw className="w-full h-full" />
    }
};

const visitStatusConfig: Record<VisitStatus, StatusConfig> = {
    PROGRAMMATA: {
        label: 'Programmata',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: <Calendar className="w-full h-full" />
    },
    IN_CORSO: {
        label: 'In Corso',
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        icon: <PlayCircle className="w-full h-full" />
    },
    COMPLETATA: {
        label: 'Completata',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: <CheckCircle className="w-full h-full" />
    },
    ANNULLATA: {
        label: 'Annullata',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: <XCircle className="w-full h-full" />
    }
};

const reportStatusConfig: Record<ReportStatus, StatusConfig> = {
    BOZZA: {
        label: 'Bozza',
        color: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: <Edit className="w-full h-full" />
    },
    IN_REVISIONE: {
        label: 'In Revisione',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: <Clock className="w-full h-full" />
    },
    DA_FIRMARE: {
        label: 'Da Firmare',
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: <FileText className="w-full h-full" />
    },
    FIRMATO: {
        label: 'Firmato',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: <CheckCircle className="w-full h-full" />
    },
    CONSEGNATO: {
        label: 'Consegnato',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: <Send className="w-full h-full" />
    },
    ARCHIVIATO: {
        label: 'Archiviato',
        color: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: <Archive className="w-full h-full" />
    }
};

// =====================================================
// SIZE CONFIGS
// =====================================================

const sizeConfig = {
    xs: {
        container: 'px-1.5 py-0.5 text-xs',
        icon: 'w-3 h-3',
        gap: 'gap-1'
    },
    sm: {
        container: 'px-2 py-1 text-xs',
        icon: 'w-3.5 h-3.5',
        gap: 'gap-1'
    },
    md: {
        container: 'px-2.5 py-1 text-sm',
        icon: 'w-4 h-4',
        gap: 'gap-1.5'
    },
    lg: {
        container: 'px-3 py-1.5 text-sm',
        icon: 'w-5 h-5',
        gap: 'gap-2'
    }
};

// =====================================================
// COMPONENT
// =====================================================

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    type = 'appointment',
    size = 'md',
    showIcon = true,
    pulse = false,
    className = ''
}) => {
    // Get config based on type
    let config: StatusConfig;

    if (type === 'visit' && status in visitStatusConfig) {
        config = visitStatusConfig[status as VisitStatus];
    } else if (type === 'report' && status in reportStatusConfig) {
        config = reportStatusConfig[status as ReportStatus];
    } else {
        config = appointmentStatusConfig[status as AppointmentStatus] || {
            label: status,
            color: 'text-gray-700',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            icon: <AlertCircle className="w-full h-full" />
        };
    }

    const sizeStyles = sizeConfig[size];

    // Check if status should pulse (active states)
    const shouldPulse = pulse || ['IN_CORSO', 'IN_REVISIONE'].includes(status);

    return (
        <span
            className={`
        inline-flex items-center font-medium rounded-full border
        ${config.bgColor} ${config.color} ${config.borderColor}
        ${sizeStyles.container} ${sizeStyles.gap}
        ${className}
      `}
        >
            {showIcon && (
                <span className={`${sizeStyles.icon} flex-shrink-0 ${shouldPulse ? 'animate-pulse' : ''}`}>
                    {config.icon}
                </span>
            )}
            <span>{config.label}</span>
        </span>
    );
};

// =====================================================
// ADDITIONAL BADGE VARIANTS
// =====================================================

interface GenericBadgeProps {
    label: string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    className?: string;
}

const variantConfig = {
    default: {
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-200'
    },
    success: {
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200'
    },
    warning: {
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-200'
    },
    error: {
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200'
    },
    info: {
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-200'
    }
};

export const Badge: React.FC<GenericBadgeProps> = ({
    label,
    variant = 'default',
    size = 'md',
    className = ''
}) => {
    const variantStyles = variantConfig[variant];
    const sizeStyles = sizeConfig[size];

    return (
        <span
            className={`
        inline-flex items-center font-medium rounded-full border
        ${variantStyles.bgColor} ${variantStyles.color} ${variantStyles.borderColor}
        ${sizeStyles.container}
        ${className}
      `}
        >
            {label}
        </span>
    );
};

// =====================================================
// URGENCY BADGE
// =====================================================

interface UrgencyBadgeProps {
    level: 'BASSA' | 'NORMALE' | 'ALTA' | 'URGENTE';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    className?: string;
}

const urgencyConfig = {
    BASSA: {
        label: 'Bassa',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200'
    },
    NORMALE: {
        label: 'Normale',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-200'
    },
    ALTA: {
        label: 'Alta',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-200'
    },
    URGENTE: {
        label: 'Urgente',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200'
    }
};

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({
    level,
    size = 'md',
    className = ''
}) => {
    const config = urgencyConfig[level];
    const sizeStyles = sizeConfig[size];

    return (
        <span
            className={`
        inline-flex items-center font-medium rounded-full border
        ${config.bgColor} ${config.color} ${config.borderColor}
        ${sizeStyles.container}
        ${level === 'URGENTE' ? 'animate-pulse' : ''}
        ${className}
      `}
        >
            {level === 'URGENTE' && (
                <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5 animate-ping" />
            )}
            {config.label}
        </span>
    );
};

export default StatusBadge;
