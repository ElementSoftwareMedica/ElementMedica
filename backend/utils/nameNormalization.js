/**
 * Name Normalization Utility
 * 
 * Normalizza nomi per matching fuzzy, gestendo:
 * - Accenti e diacritici (è → e, ü → u)
 * - Apostrofi (D'Amico → damico, sia curvi che dritti)
 * - Trattini (Anna-Maria → annamaria)
 * - Spaziature (Anna Maria → annamaria)
 * - Case-insensitive
 * 
 * Usato per rilevamento duplicati in:
 * - Queue check-in (QueueCheckInService)
 * - Accettazione modal
 * - Prenotazione modal
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
 *  - "François"    → "francois"
 *  - "  De Luca "  → "deluca"
 *  - "D'Ambrosio" → "dambrosio"  (curly apostrophe)
 * 
 * @param {string} name - Il nome da normalizzare
 * @returns {string} Nome normalizzato per confronto
 */
export function normalizeName(name) {
    if (!name || typeof name !== 'string') return '';

    return name
        // 1. Unicode NFD: separa i diacritici dai caratteri base
        .normalize('NFD')
        // 2. Rimuovi tutti i combining marks (accenti, dieresi, etc.)
        .replace(/[\u0300-\u036f]/g, '')
        // 3. Rimuovi apostrofi (dritti e curvi: ', ', `, ʼ)
        .replace(/['\u2018\u2019\u0060\u02BC]/g, '')
        // 4. Rimuovi trattini (-, –, —)
        .replace(/[-\u2013\u2014]/g, '')
        // 5. Rimuovi tutti gli spazi
        .replace(/\s+/g, '')
        // 6. Lowercase
        .toLowerCase()
        // 7. Rimuovi caratteri non-alfanumerici residui
        .replace(/[^a-z0-9]/g, '');
}

/**
 * Confronta due nomi per somiglianza fuzzy.
 * 
 * @param {string} name1 - Primo nome
 * @param {string} name2 - Secondo nome
 * @returns {boolean} true se i nomi normalizzati corrispondono
 */
export function namesMatch(name1, name2) {
    return normalizeName(name1) === normalizeName(name2);
}

/**
 * Confronta cognome+nome completi per rilevamento duplicati.
 * Controlla entrambe le direzioni (nome/cognome possono essere invertiti).
 * 
 * @param {{ firstName: string; lastName: string }} person1
 * @param {{ firstName: string; lastName: string }} person2
 * @returns {boolean} true se la coppia cognome+nome corrisponde
 */
export function isNameDuplicate(person1, person2) {
    const fn1 = normalizeName(person1.firstName);
    const ln1 = normalizeName(person1.lastName);
    const fn2 = normalizeName(person2.firstName);
    const ln2 = normalizeName(person2.lastName);

    // Match diretto
    if (fn1 === fn2 && ln1 === ln2) return true;

    // Match invertito (nome↔cognome scambiati)
    if (fn1 === ln2 && ln1 === fn2) return true;

    return false;
}

/**
 * Verifica se un nome contiene una query di ricerca (fuzzy).
 * Utile per le ricerche: "ann mar" troverà "Anna Maria".
 * 
 * @param {string} fullName - Il nome completo (es. "Anna Maria De Luca")
 * @param {string} query - La query di ricerca
 * @returns {boolean} true se la query normalizzata è contenuta nel nome normalizzato
 */
export function nameContains(fullName, query) {
    const normalizedFull = normalizeName(fullName);
    const normalizedQuery = normalizeName(query);

    if (!normalizedQuery) return true;
    return normalizedFull.includes(normalizedQuery);
}

/**
 * Genera varianti di un nome per query SQL OR.
 * Usato per estendere le WHERE clause Prisma con varianti del nome.
 * 
 * Es: "D'Amico" → ["D'Amico", "D Amico", "DAmico", "Damico"]
 * 
 * @param {string} name - Il nome originale
 * @returns {string[]} Array di varianti per SQL matching
 */
export function generateNameVariants(name) {
    if (!name || typeof name !== 'string') return [];

    const trimmed = name.trim();
    if (!trimmed) return [];

    const variants = new Set();
    variants.add(trimmed);

    // Variante senza apostrofi
    const noApostrophe = trimmed.replace(/['\u2018\u2019\u0060\u02BC]/g, '');
    if (noApostrophe !== trimmed) {
        variants.add(noApostrophe);
        // Con spazio al posto dell'apostrofo
        variants.add(trimmed.replace(/['\u2018\u2019\u0060\u02BC]/g, ' '));
    }

    // Variante senza trattini
    const noHyphen = trimmed.replace(/[-\u2013\u2014]/g, '');
    if (noHyphen !== trimmed) {
        variants.add(noHyphen);
        // Con spazio al posto del trattino
        variants.add(trimmed.replace(/[-\u2013\u2014]/g, ' '));
    }

    // Variante senza spazi interni (per nomi composti)
    const noSpaces = trimmed.replace(/\s+/g, '');
    if (noSpaces !== trimmed) {
        variants.add(noSpaces);
    }

    // Variante senza accenti
    const noAccents = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (noAccents !== trimmed) {
        variants.add(noAccents);
    }

    // Cross-product: combine transforms for names like "D'Àmico" → "DAmico", "D Amico" (no accent + no apostrophe)
    const noAccentsNoApostrophe = noAccents.replace(/['\u2018\u2019\u0060\u02BC]/g, '');
    if (noAccentsNoApostrophe !== noAccents && noAccentsNoApostrophe !== trimmed) {
        variants.add(noAccentsNoApostrophe);
        variants.add(noAccents.replace(/['\u2018\u2019\u0060\u02BC]/g, ' '));
    }
    const noAccentsNoHyphen = noAccents.replace(/[-\u2013\u2014]/g, '');
    if (noAccentsNoHyphen !== noAccents && noAccentsNoHyphen !== trimmed) {
        variants.add(noAccentsNoHyphen);
        variants.add(noAccents.replace(/[-\u2013\u2014]/g, ' '));
    }

    // Fully normalized variant (catch-all: no accents + no apostrophes + no hyphens)
    const fullyNormalized = normalizeName(trimmed);
    if (fullyNormalized && fullyNormalized !== trimmed.toLowerCase()) {
        variants.add(fullyNormalized);
    }

    return [...variants];
}

export default {
    normalizeName,
    namesMatch,
    isNameDuplicate,
    nameContains,
    generateNameVariants
};
