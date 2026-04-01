/**
 * Utility per normalizzare e visualizzare nomi di Person/Paziente/Medico
 * 
 * Il sistema usa il modello Person che ha firstName/lastName.
 * Supporta anche nome/cognome per backward compatibility.
 * 
 * @module utils/personDisplayUtils
 */

/** 
 * Interface per dati persona generici
 */
export interface PersonLike {
    // Standard format (Person model)
    firstName?: string | null;
    lastName?: string | null;
    // Legacy format (backward compat)
    nome?: string | null;
    cognome?: string | null;
}

/**
 * Ottiene il nome di visualizzazione di una persona (cognome nome)
 * Priorità: lastName/firstName, fallback cognome/nome
 * 
 * @param person - Oggetto persona con firstName/lastName o nome/cognome
 * @param fallback - Testo di fallback se nessun nome disponibile
 * @returns "Cognome Nome" o fallback
 */
export function getPersonDisplayName(
    person: PersonLike | null | undefined,
    fallback: string = 'N/D'
): string {
    if (!person) return fallback;

    // Priorità: lastName/firstName (standard), fallback cognome/nome (legacy)
    const cognome = person.lastName ?? person.cognome ?? '';
    const nome = person.firstName ?? person.nome ?? '';

    if (cognome || nome) {
        return `${cognome} ${nome}`.trim();
    }

    return fallback;
}

/**
 * Ottiene il nome completo in formato "Nome Cognome"
 * 
 * @param person - Oggetto persona
 * @param fallback - Testo di fallback
 * @returns "Nome Cognome" o fallback
 */
export function getPersonFullName(
    person: PersonLike | null | undefined,
    fallback: string = 'N/D'
): string {
    if (!person) return fallback;

    const nome = person.firstName ?? person.nome ?? '';
    const cognome = person.lastName ?? person.cognome ?? '';

    if (nome || cognome) {
        return `${nome} ${cognome}`.trim();
    }

    return fallback;
}

/**
 * Ottiene solo il cognome
 */
export function getPersonLastName(
    person: PersonLike | null | undefined,
    fallback: string = ''
): string {
    if (!person) return fallback;
    return (person.cognome ?? person.lastName ?? fallback);
}

/**
 * Ottiene solo il nome
 */
export function getPersonFirstName(
    person: PersonLike | null | undefined,
    fallback: string = ''
): string {
    if (!person) return fallback;
    return (person.nome ?? person.firstName ?? fallback);
}

/**
 * Normalizza un oggetto persona aggiungendo i campi italiani
 * Utile per compatibilità con componenti legacy
 * 
 * @param person - Oggetto persona con firstName/lastName
 * @returns Oggetto con nome/cognome aggiunti
 */
export function normalizePersonNames<T extends PersonLike>(
    person: T | null | undefined
): T & { nome: string; cognome: string } | null {
    if (!person) return null;

    return {
        ...person,
        nome: person.nome ?? person.firstName ?? '',
        cognome: person.cognome ?? person.lastName ?? ''
    };
}
