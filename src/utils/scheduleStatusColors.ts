/**
 * Utility per gestire colori e mappature degli stati dei corsi
 * Questo file centralizza tutte le configurazioni di colore per garantire coerenza
 */

export type ScheduleStatus = 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'SUSPENDED';

/**
 * Mappa gli stati dal database all'italiano
 */
export const statusToItalian: Record<ScheduleStatus, string> = {
    'PENDING': 'Preventivo',
    'CONFIRMED': 'Confermato',
    'ACTIVE': 'Attivo',
    'COMPLETED': 'Completato',
    'CANCELLED': 'Cancellato',
    'SUSPENDED': 'Sospeso'
};

/**
 * Mappa inversa dall'italiano al database
 */
export const italianToStatus: Record<string, ScheduleStatus> = {
    'Preventivo': 'PENDING',
    'Confermato': 'CONFIRMED',
    'Attivo': 'ACTIVE',
    'Completato': 'COMPLETED',
    'Cancellato': 'CANCELLED',
    'Sospeso': 'SUSPENDED'
};

/**
 * Colori Tailwind per i badge (usati in tabelle e dropdown)
 */
export const statusBadgeColors: Record<string, string> = {
    'Preventivo': 'bg-yellow-100 text-yellow-800',
    'Confermato': 'bg-green-100 text-green-800',
    'Attivo': 'bg-blue-100 text-blue-800',
    'Completato': 'bg-gray-100 text-gray-800',
    'Cancellato': 'bg-red-100 text-red-800',
    'Sospeso': 'bg-orange-100 text-orange-800'
};

/**
 * Colori hover per i badge
 */
export const statusBadgeHoverColors: Record<string, string> = {
    'Preventivo': 'hover:bg-yellow-200',
    'Confermato': 'hover:bg-green-200',
    'Attivo': 'hover:bg-blue-200',
    'Completato': 'hover:bg-gray-200',
    'Cancellato': 'hover:bg-red-200',
    'Sospeso': 'hover:bg-orange-200'
};

/**
 * Colori per dropdown menu items (pallini indicatori)
 */
export const statusDotColors: Record<string, string> = {
    'Preventivo': 'bg-yellow-500',
    'Confermato': 'bg-green-500',
    'Attivo': 'bg-blue-500',
    'Completato': 'bg-gray-500',
    'Cancellato': 'bg-red-500',
    'Sospeso': 'bg-orange-500'
};

/**
 * Colori hex per il calendario (eventi e tooltip)
 */
export const statusCalendarColors = {
    'Preventivo': {
        bg: '#fef9c3',        // yellow-100
        hover: '#fde047',     // yellow-300
        text: '#b45309',      // yellow-700
        border: '#eab308'     // yellow-500
    },
    'Confermato': {
        bg: '#d1fae5',        // green-100
        hover: '#6ee7b7',     // green-300
        text: '#047857',      // green-700
        border: '#10b981'     // green-500
    },
    'Attivo': {
        bg: '#dbeafe',        // blue-100
        hover: '#93c5fd',     // blue-300
        text: '#1d4ed8',      // blue-700
        border: '#3b82f6'     // blue-500
    },
    'Completato': {
        bg: '#f3f4f6',        // gray-100
        hover: '#d1d5db',     // gray-300
        text: '#374151',      // gray-700
        border: '#6b7280'     // gray-500
    },
    'Cancellato': {
        bg: '#fee2e2',        // red-100
        hover: '#fca5a5',     // red-300
        text: '#b91c1c',      // red-700
        border: '#ef4444'     // red-500
    },
    'Sospeso': {
        bg: '#fed7aa',        // orange-200
        hover: '#fb923c',     // orange-400
        text: '#c2410c',      // orange-700
        border: '#f97316'     // orange-500
    }
};

/**
 * Helper per ottenere il colore del badge dato uno stato in italiano
 */
export const getStatusBadgeColor = (statusItalian: string): string => {
    return statusBadgeColors[statusItalian] || 'bg-gray-100 text-gray-800';
};

/**
 * Helper per ottenere i colori del calendario dato uno stato in italiano
 */
export const getStatusCalendarColor = (statusItalian: string) => {
    return statusCalendarColors[statusItalian as keyof typeof statusCalendarColors] || statusCalendarColors['Preventivo'];
};

/**
 * Helper per convertire stato DB → Italiano
 */
export const dbStatusToItalian = (status: string): string => {
    return statusToItalian[status as ScheduleStatus] || 'Preventivo';
};

/**
 * Helper per convertire stato Italiano → DB
 */
export const italianStatusToDb = (status: string): ScheduleStatus => {
    return italianToStatus[status] || 'PENDING';
};
