/**
 * Specialità Mediche Centralizzate
 * 
 * Lista unificata di specialità mediche usata per:
 * - Branche Specialistiche delle Prestazioni
 * - Specializzazioni dei Medici
 * 
 * Le liste sono sincronizzate e nuove specialità aggiunte dall'utente
 * vengono salvate localmente.
 * 
 * @module constants/specialties
 */

// Lista base di specialità mediche
export const BASE_SPECIALTIES = [
    'Allergologia',
    'Anestesiologia',
    'Angiologia',
    'Cardiologia',
    'Chirurgia Generale',
    'Chirurgia Plastica',
    'Dermatologia',
    'Diabetologia',
    'Dietologia',
    'Endocrinologia',
    'Fisiatria',
    'Fisioterapia',
    'Gastroenterologia',
    'Geriatria',
    'Ginecologia',
    'Medicina del Lavoro',
    'Medicina dello Sport',
    'Medicina Generale',
    'Nefrologia',
    'Neurologia',
    'Oculistica',
    'Odontoiatria',
    'Oncologia',
    'Ortopedia',
    'Otorinolaringoiatria',
    'Pediatria',
    'Pneumologia',
    'Psichiatria',
    'Psicologia',
    'Radiologia',
    'Reumatologia',
    'Urologia',
    'Altro'
];

// Storage key per specialità custom
const CUSTOM_SPECIALTIES_KEY = 'element_medica_custom_specialties';

/**
 * Recupera le specialità custom salvate in localStorage
 */
export function getCustomSpecialties(): string[] {
    try {
        const stored = localStorage.getItem(CUSTOM_SPECIALTIES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Salva una nuova specialità custom
 */
export function addCustomSpecialty(specialty: string): void {
    const custom = getCustomSpecialties();
    const normalized = specialty.trim();
    if (normalized && !custom.includes(normalized) && !BASE_SPECIALTIES.includes(normalized)) {
        custom.push(normalized);
        localStorage.setItem(CUSTOM_SPECIALTIES_KEY, JSON.stringify(custom));
    }
}

/**
 * Ottiene la lista completa di tutte le specialità (base + custom)
 * ordinate alfabeticamente con "Altro" sempre alla fine
 */
export function getAllSpecialties(): string[] {
    const custom = getCustomSpecialties();
    const all = [...BASE_SPECIALTIES, ...custom];

    // Rimuovi duplicati e ordina
    const unique = [...new Set(all)];

    // Ordina alfabeticamente ma "Altro" sempre alla fine
    return unique.sort((a, b) => {
        if (a === 'Altro') return 1;
        if (b === 'Altro') return -1;
        return a.localeCompare(b, 'it');
    });
}

/**
 * Verifica se una stringa è una specialità valida (esistente o creabile)
 */
export function isValidSpecialty(specialty: string): boolean {
    const normalized = specialty.trim();
    return normalized.length >= 2 && normalized.length <= 100;
}
