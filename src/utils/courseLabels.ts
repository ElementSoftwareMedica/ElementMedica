/**
 * Utility per gestire le etichette dei corsi
 * Supporta etichette speciali per corsi specifici come RLS
 */

/**
 * Verifica se un corso è di tipo RLS (Rappresentante Lavoratori Sicurezza)
 */
export function isRLSCourse(courseTitle?: string): boolean {
    if (!courseTitle) return false;
    const normalizedTitle = courseTitle.toLowerCase();
    return (
        normalizedTitle.includes('rls') ||
        normalizedTitle.includes('rappresentante dei lavoratori') ||
        normalizedTitle.includes('rappresentante lavoratori sicurezza')
    );
}

/**
 * Ottiene l'etichetta del livello di rischio
 * Per i corsi RLS, usa ">50 Dipendenti" / "<50 Dipendenti"
 * Per altri corsi, usa "Rischio Alto/Medio/Basso"
 */
export function getRiskLevelLabel(riskLevel: string, courseTitle?: string): string {
    const isRLS = isRLSCourse(courseTitle);

    if (isRLS) {
        const rlsLabels: Record<string, string> = {
            'ALTO': '>50 Dipendenti',
            'MEDIO': '15-50 Dipendenti',
            'BASSO': '<50 Dipendenti',
            // Mappatura alternativa per i valori A/B/C
            'A': '>50 Dipendenti',
            'B': '15-50 Dipendenti',
            'C': '<50 Dipendenti'
        };
        return rlsLabels[riskLevel] || riskLevel;
    }

    // Etichette standard per altri corsi
    const standardLabels: Record<string, string> = {
        'ALTO': 'Rischio Alto',
        'MEDIO': 'Rischio Medio',
        'BASSO': 'Rischio Basso',
        'A': 'Categoria A',
        'B': 'Categoria B',
        'C': 'Categoria C'
    };
    return standardLabels[riskLevel] || riskLevel;
}

/**
 * Ottiene il colore per il livello di rischio (Tailwind classes)
 */
export function getRiskLevelColor(riskLevel: string, isSelected?: boolean): string {
    const baseClasses = isSelected ? '' : 'opacity-60 hover:opacity-100';
    switch (riskLevel) {
        case 'ALTO':
        case 'A':
            return `bg-red-600 text-white ${baseClasses}`;
        case 'MEDIO':
        case 'B':
            return `bg-yellow-600 text-white ${baseClasses}`;
        case 'BASSO':
        case 'C':
            return `bg-green-600 text-white ${baseClasses}`;
        default:
            return `bg-gray-600 text-white ${baseClasses}`;
    }
}

/**
 * Ottiene l'etichetta del tipo di corso
 */
export function getCourseTypeLabel(courseType: string): string {
    const labels: Record<string, string> = {
        'PRIMO_CORSO': 'Primo Corso',
        'AGGIORNAMENTO': 'Aggiornamento'
    };
    return labels[courseType] || courseType;
}

/**
 * Ottiene il colore per il tipo di corso (Tailwind classes)
 */
export function getCourseTypeColor(courseType: string, isSelected?: boolean): string {
    const baseClasses = isSelected ? '' : 'opacity-60 hover:opacity-100';
    switch (courseType) {
        case 'PRIMO_CORSO':
            return `bg-blue-600 text-white ${baseClasses}`;
        case 'AGGIORNAMENTO':
            return `bg-purple-600 text-white ${baseClasses}`;
        default:
            return `bg-gray-600 text-white ${baseClasses}`;
    }
}

/**
 * Array di opzioni per i livelli di rischio (per dropdown/select)
 */
export function getRiskLevelOptions(courseTitle?: string): Array<{ value: string; label: string }> {
    const isRLS = isRLSCourse(courseTitle);

    if (isRLS) {
        // Per corsi RLS, mostra le opzioni basate sul numero di dipendenti
        return [
            { value: 'ALTO', label: '>50 Dipendenti' },
            { value: 'MEDIO', label: '15-50 Dipendenti' },
            { value: 'BASSO', label: '<50 Dipendenti' }
        ];
    }

    return [
        { value: 'ALTO', label: 'Rischio Alto' },
        { value: 'MEDIO', label: 'Rischio Medio' },
        { value: 'BASSO', label: 'Rischio Basso' },
        { value: 'A', label: 'Categoria A' },
        { value: 'B', label: 'Categoria B' },
        { value: 'C', label: 'Categoria C' }
    ];
}

export default {
    isRLSCourse,
    getRiskLevelLabel,
    getRiskLevelColor,
    getCourseTypeLabel,
    getCourseTypeColor,
    getRiskLevelOptions
};
