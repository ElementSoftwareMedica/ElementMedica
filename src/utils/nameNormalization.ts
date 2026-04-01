/**
 * Name Normalization Utility (Frontend)
 * 
 * Normalizza nomi per matching fuzzy lato client.
 * Gestisce accenti, apostrofi, trattini, spaziature.
 * 
 * Usato per rilevamento duplicati nei risultati di ricerca
 * in queue, accettazione e prenotazione.
 * 
 * @module utils/nameNormalization
 * @project P53 - Session #23
 */

/**
 * Normalizza un nome per confronto fuzzy.
 * Rimuove accenti, apostrofi, trattini, spazi, poi lowercase.
 * 
 * Esempi:
 *  - "D'Amico"    → "damico"
 *  - "Anna Maria"  → "annamaria"
 *  - "Anna-Maria"  → "annamaria"
 *  - "Müller"      → "muller"
 */
export function normalizeName(name: string): string {
    if (!name) return '';

    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['\u2018\u2019\u0060\u02BC]/g, '')
        .replace(/[-\u2013\u2014]/g, '')
        .replace(/\s+/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

/**
 * Confronta due nomi per somiglianza fuzzy.
 */
export function namesMatch(name1: string, name2: string): boolean {
    return normalizeName(name1) === normalizeName(name2);
}

/**
 * Confronta cognome+nome completi per rilevamento duplicati.
 * Controlla entrambe le direzioni (nome/cognome possono essere invertiti).
 */
export function isNameDuplicate(
    person1: { firstName: string; lastName: string },
    person2: { firstName: string; lastName: string }
): boolean {
    const fn1 = normalizeName(person1.firstName);
    const ln1 = normalizeName(person1.lastName);
    const fn2 = normalizeName(person2.firstName);
    const ln2 = normalizeName(person2.lastName);

    if (fn1 === fn2 && ln1 === ln2) return true;
    if (fn1 === ln2 && ln1 === fn2) return true;

    return false;
}

/**
 * Verifica se un nome contiene una query di ricerca (fuzzy).
 */
export function nameContains(fullName: string, query: string): boolean {
    const normalizedFull = normalizeName(fullName);
    const normalizedQuery = normalizeName(query);

    if (!normalizedQuery) return true;
    return normalizedFull.includes(normalizedQuery);
}
