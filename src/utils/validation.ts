/**
 * Utility per validazioni comuni
 */

/**
 * Valida se una stringa è un UUID valido (v4)
 * @param uuid - La stringa da validare
 * @returns true se è un UUID valido, false altrimenti
 */
export const isValidUUID = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Valida se una stringa è un ID valido (UUID o numero)
 * @param id - L'ID da validare
 * @returns true se è un ID valido, false altrimenti
 */
export const isValidId = (id: string): boolean => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  // Controlla se è un UUID valido
  if (isValidUUID(id)) {
    return true;
  }
  
  // Controlla se è un numero valido
  const numericId = parseInt(id, 10);
  return !isNaN(numericId) && numericId > 0;
};

/**
 * Sanitizza un ID rimuovendo caratteri non validi
 * @param id - L'ID da sanitizzare
 * @returns L'ID sanitizzato o null se non valido
 */
export const sanitizeId = (id: string): string | null => {
  if (!id || typeof id !== 'string') {
    return null;
  }
  
  const trimmedId = id.trim();
  
  if (isValidId(trimmedId)) {
    return trimmedId;
  }
  
  return null;
};