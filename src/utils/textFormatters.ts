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
 * Restituisce il titolo onorifico italiano per un medico (Dott./Dott.ssa)
 * @param gender - Il genere del medico ('MALE', 'FEMALE', 'OTHER', 'NOT_SPECIFIED')
 * @returns 'Dott.' per maschile, 'Dott.ssa' per femminile, 'Dott.' per altri casi
 */
export const getMedicoTitle = (gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null): string => {
  if (gender === 'FEMALE') return 'Dott.ssa';
  return 'Dott.';
};

/**
 * Formatta il nome completo del medico con titolo appropriato
 * @param medico - Oggetto medico con firstName, lastName e opzionalmente gender
 * @returns Nome formattato es. "Dott.ssa Rossi Maria"
 */
export const formatMedicoName = (medico: {
  firstName?: string | null;
  lastName?: string | null;
  nome?: string | null;
  cognome?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null
}): string => {
  const title = getMedicoTitle(medico.gender);
  const lastName = medico.lastName || medico.cognome || '';
  const firstName = medico.firstName || medico.nome || '';
  return `${title} ${lastName} ${firstName}`.trim();
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
export const applyTitleCaseToFields = (obj: Record<string, unknown>, fields: string[]): Record<string, unknown> => {
  const result = { ...obj };

  fields.forEach(field => {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = toTitleCase(result[field] as string);
    }
  });

  return result;
};