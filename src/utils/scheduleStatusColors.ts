/**
 * Utility per gestire colori e mappature degli stati dei corsi
 * Questo file centralizza tutte le configurazioni di colore per garantire coerenza
 */

export type ScheduleStatus = 'PREVENTIVO' | 'ACCETTATO' | 'COMPLETATO' | 'FATTURATO';

/**
 * Mappa gli stati dal database all'italiano
 */
export const statusToItalian: Record<ScheduleStatus, string> = {
    'PREVENTIVO': 'Preventivo',
    'ACCETTATO': 'Accettato',
    'COMPLETATO': 'Completato',
    'FATTURATO': 'Fatturato'
};

/**
 * Mappa inversa dall'italiano al database
 */
export const italianToStatus: Record<string, ScheduleStatus> = {
    'Preventivo': 'PREVENTIVO',
    'Accettato': 'ACCETTATO',
    'Completato': 'COMPLETATO',
    'Fatturato': 'FATTURATO'
};

/**
 * Colori Tailwind per i badge (usati in tabelle e dropdown)
 * Supporto dark mode completo
 */
export const statusBadgeColors: Record<string, string> = {
    'Preventivo': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    'Accettato': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    'Completato': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    'Fatturato': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
};

/**
 * Colori hover per i badge
 * Supporto dark mode completo
 */
export const statusBadgeHoverColors: Record<string, string> = {
    'Preventivo': 'hover:bg-yellow-200 dark:hover:bg-yellow-800/50',
    'Accettato': 'hover:bg-blue-200 dark:hover:bg-blue-800/50',
    'Completato': 'hover:bg-green-200 dark:hover:bg-green-800/50',
    'Fatturato': 'hover:bg-gray-200 dark:hover:bg-gray-600'
};

/**
 * Colori per righe tabella (usati in ResizableTable rowClassName)
 * Supporto dark mode completo
 */
export const statusRowColors: Record<string, string> = {
    'Preventivo': 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30',
    'Accettato': 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30',
    'Completato': 'bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30',
    'Fatturato': 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
};

/**
 * Helper per ottenere il colore della riga dato uno stato in italiano
 */
export const getStatusRowColor = (statusItalian: string): string => {
    return statusRowColors[statusItalian] || '';
};

/**
 * Colori per dropdown menu items (pallini indicatori)
 */
export const statusDotColors: Record<string, string> = {
    'Preventivo': 'bg-yellow-500',
    'Accettato': 'bg-blue-500',
    'Completato': 'bg-green-500',
    'Fatturato': 'bg-gray-500'
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
    'Accettato': {
        bg: '#dbeafe',        // blue-100
        hover: '#93c5fd',     // blue-300
        text: '#1d4ed8',      // blue-700
        border: '#3b82f6'     // blue-500
    },
    'Completato': {
        bg: '#d1fae5',        // green-100
        hover: '#6ee7b7',     // green-300
        text: '#047857',      // green-700
        border: '#10b981'     // green-500
    },
    'Fatturato': {
        bg: '#f3f4f6',        // gray-100
        hover: '#d1d5db',     // gray-300
        text: '#374151',      // gray-700
        border: '#6b7280'     // gray-500
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
    return italianToStatus[status] || 'PREVENTIVO';
};
