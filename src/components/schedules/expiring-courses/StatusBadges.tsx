/**
 * StatusBadges - Utility functions for rendering status badges
 */

import React from 'react';
import {
    Clock,
    XCircle,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    AlertCircle,
    CalendarClock
} from 'lucide-react';
import type { ExpiringCourse } from './types';

/** Status badge colors and icons for enrollment status */
const statusStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    'PENDING': {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        icon: <Clock className="h-3 w-3" />
    },
    'CONFIRMED': {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        icon: <CheckCircle2 className="h-3 w-3" />
    },
    'ACTIVE': {
        bg: 'bg-green-100',
        text: 'text-green-700',
        icon: <CheckCircle2 className="h-3 w-3" />
    },
    'COMPLETED': {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        icon: <CheckCircle2 className="h-3 w-3" />
    },
    'CANCELLED': {
        bg: 'bg-red-100',
        text: 'text-red-700',
        icon: <XCircle className="h-3 w-3" />
    },
    'SUSPENDED': {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        icon: <AlertCircle className="h-3 w-3" />
    }
};

/** Status labels in Italian */
const statusLabels: Record<string, string> = {
    'PENDING': 'In attesa',
    'CONFIRMED': 'Confermato',
    'ACTIVE': 'In corso',
    'COMPLETED': 'Completato',
    'CANCELLED': 'Cancellato',
    'SUSPENDED': 'Sospeso'
};

/**
 * Get source badge for course origin
 */
export const getSourceBadge = (source: string): JSX.Element | null => {
    switch (source) {
        case 'EXTERNAL':
            return (
                <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">
                    Esterno
                </span>
            );
        case 'IMPORT':
            return (
                <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                    Importato
                </span>
            );
        default:
            return null; // Internal non mostra badge
    }
};

/**
 * Get status badge based on expiration status
 */
export const getStatusBadge = (course: ExpiringCourse): JSX.Element => {
    // Se il corso è stato riprogrammato con status attivo, mostra "Rinnovo in corso"
    const activeStatuses = ['PENDING', 'CONFIRMED', 'ACTIVE'];
    if (course.alreadyScheduled && course.futureSchedule &&
        activeStatuses.includes(course.futureSchedule.status)) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                <RefreshCw className="h-3 w-3" />
                Rinnovo in corso
            </span>
        );
    }

    if (course.status === 'EXPIRED') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                <XCircle className="h-3 w-3" />
                Scaduto da {Math.abs(course.daysUntilExpiration)}gg
            </span>
        );
    }

    if (course.daysUntilExpiration <= 30) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                <AlertTriangle className="h-3 w-3" />
                Scade tra {course.daysUntilExpiration}gg
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
            <Clock className="h-3 w-3" />
            Scade tra {course.daysUntilExpiration}gg
        </span>
    );
};

/**
 * Get scheduled badge showing future schedule status
 */
export const getScheduledBadge = (course: ExpiringCourse): JSX.Element => {
    if (course.futureSchedule) {
        const statusLabel = statusLabels[course.futureSchedule.status] || course.futureSchedule.status;
        const style = statusStyles[course.futureSchedule.status] || {
            bg: 'bg-gray-100',
            text: 'text-gray-600',
            icon: <CalendarClock className="h-3 w-3" />
        };

        const formattedDate = new Date(course.futureSchedule.startDate).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
                {style.icon}
                {statusLabel} {formattedDate}
            </span>
        );
    }
    
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
            <CalendarClock className="h-3 w-3" />
            Da programmare
        </span>
    );
};
