/**
 * Converte una stringa in Title Case (prima lettera di ogni parola maiuscola)
 * @param str - La stringa da convertire
 * @returns La stringa convertita in Title Case
 */
export const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Normalizza una stringa per confronti (rimuove spazi, rende tutto lowercase)
 * @param str - La stringa da normalizzare
 * @returns La stringa normalizzata
 */
export const normalizeString = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.toLowerCase().trim();
};

/**
 * Applica il Title Case a campi specifici di un oggetto
 * @param obj - Oggetto da modificare
 * @param fields - Array di campi da formattare in Title Case
 * @returns Nuovo oggetto con i campi formattati
 */
export const applyTitleCaseToFields = (obj: Record<string, any>, fields: string[]): Record<string, any> => {
  const result = { ...obj };
  
  fields.forEach(field => {
    if (result[field]) {
      result[field] = toTitleCase(result[field]);
    }
  });
  
  return result;
};