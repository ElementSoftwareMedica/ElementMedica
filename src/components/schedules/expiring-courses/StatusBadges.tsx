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

/** Status badge colors and icons for enrollment status (with dark mode) */
const statusStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    'PREVENTIVO': {
        bg: 'bg-amber-100 dark:bg-amber-900/40',
        text: 'text-amber-700 dark:text-amber-200',
        icon: <Clock className="h-3 w-3" />
    },
    'ACCETTATO': {
        bg: 'bg-blue-100 dark:bg-blue-900/40',
        text: 'text-blue-700 dark:text-blue-200',
        icon: <CheckCircle2 className="h-3 w-3" />
    },
    'COMPLETATO': {
        bg: 'bg-emerald-100 dark:bg-emerald-900/40',
        text: 'text-emerald-700 dark:text-emerald-200',
        icon: <CheckCircle2 className="h-3 w-3" />
    },
    'FATTURATO': {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-700 dark:text-gray-200',
        icon: <CheckCircle2 className="h-3 w-3" />
    }
};

/** Status labels in Italian */
const statusLabels: Record<string, string> = {
    'PREVENTIVO': 'Preventivo',
    'ACCETTATO': 'Accettato',
    'COMPLETATO': 'Completato',
    'FATTURATO': 'Fatturato'
};

/**
 * Get source badge for course origin (with dark mode)
 */
export const getSourceBadge = (source: string): JSX.Element | null => {
    switch (source) {
        case 'EXTERNAL':
            return (
                <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200">
                    Esterno
                </span>
            );
        case 'IMPORT':
            return (
                <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200">
                    Importato
                </span>
            );
        default:
            return null; // Internal non mostra badge
    }
};

/**
 * Get status badge based on expiration status (with dark mode)
 */
export const getStatusBadge = (course: ExpiringCourse): JSX.Element => {
    // Se il corso è stato riprogrammato con status attivo, mostra "Rinnovo in corso"
    const activeStatuses = ['PREVENTIVO', 'ACCETTATO'];
    if (course.alreadyScheduled && course.futureSchedule &&
        activeStatuses.includes(course.futureSchedule.status)) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200">
                <RefreshCw className="h-3 w-3" />
                Rinnovo in corso
            </span>
        );
    }

    if (course.status === 'EXPIRED') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200">
                <XCircle className="h-3 w-3" />
                Scaduto da {Math.abs(course.daysUntilExpiration)}gg
            </span>
        );
    }

    if (course.daysUntilExpiration <= 30) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-200">
                <AlertTriangle className="h-3 w-3" />
                Scade tra {course.daysUntilExpiration}gg
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-200">
            <Clock className="h-3 w-3" />
            Scade tra {course.daysUntilExpiration}gg
        </span>
    );
};

/**
 * Get scheduled badge showing future schedule status (with dark mode)
 */
export const getScheduledBadge = (course: ExpiringCourse): JSX.Element => {
    if (course.futureSchedule) {
        const statusLabel = statusLabels[course.futureSchedule.status] || course.futureSchedule.status;
        const style = statusStyles[course.futureSchedule.status] || {
            bg: 'bg-gray-100 dark:bg-gray-800',
            text: 'text-gray-600 dark:text-gray-300',
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
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            <CalendarClock className="h-3 w-3" />
            Da programmare
        </span>
    );
};
