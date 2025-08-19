/**
 * Slug Generator Utilities - Week 12 Multi-Tenant Implementation
 * Utility per la generazione di slug unici per i tenant
 */

/**
 * Genera uno slug da una stringa
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Rimuovi caratteri speciali e sostituisci con trattini
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[ß]/g, 'ss')
    // Rimuovi caratteri non alfanumerici eccetto trattini
    .replace(/[^a-z0-9-]/g, '-')
    // Rimuovi trattini multipli
    .replace(/-+/g, '-')
    // Rimuovi trattini all'inizio e alla fine
    .replace(/^-|-$/g, '')
    // Limita lunghezza
    .substring(0, 50);
}

/**
 * Valida uno slug
 */
export function validateSlug(slug: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!slug) {
    errors.push('Slug è richiesto');
    return { isValid: false, errors };
  }
  
  if (slug.length < 2) {
    errors.push('Slug deve essere di almeno 2 caratteri');
  }
  
  if (slug.length > 50) {
    errors.push('Slug non può superare i 50 caratteri');
  }
  
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length > 1) {
    errors.push('Slug può contenere solo lettere minuscole, numeri e trattini, e deve iniziare e finire con un carattere alfanumerico');
  }
  
  if (slug.length === 1 && !/^[a-z0-9]$/.test(slug)) {
    errors.push('Slug di un carattere deve essere alfanumerico');
  }
  
  // Lista di slug riservati
  const reservedSlugs = [
    'api', 'www', 'admin', 'app', 'dashboard', 'mail', 'ftp', 'blog',
    'help', 'support', 'docs', 'status', 'test', 'dev', 'staging',
    'prod', 'production', 'demo', 'sandbox', 'cdn', 'assets', 'static',
    'public', 'private', 'secure', 'auth', 'login', 'logout', 'register',
    'signup', 'signin', 'account', 'profile', 'settings', 'config',
    'system', 'root', 'administrator', 'moderator', 'user', 'users',
    'tenant', 'tenants', 'client', 'clients', 'customer', 'customers',
    'company', 'companies', 'organization', 'organizations', 'team', 'teams',
    'default', 'null', 'undefined', 'true', 'false', 'yes', 'no',
    'on', 'off', 'enable', 'disable', 'active', 'inactive'
  ];
  
  if (reservedSlugs.includes(slug.toLowerCase())) {
    errors.push('Questo slug è riservato e non può essere utilizzato');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Genera uno slug unico aggiungendo un suffisso numerico se necessario
 */
export function generateUniqueSlug(
  baseText: string,
  existingSlugs: string[]
): string {
  const baseSlug = generateSlug(baseText);
  
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }
  
  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;
  
  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  return uniqueSlug;
}

/**
 * Suggerisce slug alternativi
 */
export function suggestAlternativeSlug(
  originalText: string,
  existingSlugs: string[],
  count = 5
): string[] {
  const baseSlug = generateSlug(originalText);
  const suggestions: string[] = [];
  
  // Aggiungi variazioni con suffissi
  const suffixes = ['inc', 'ltd', 'corp', 'co', 'group', 'team', 'org'];
  
  for (const suffix of suffixes) {
    const suggestion = `${baseSlug}-${suffix}`;
    if (!existingSlugs.includes(suggestion) && suggestions.length < count) {
      suggestions.push(suggestion);
    }
  }
  
  // Aggiungi variazioni numeriche
  let counter = 1;
  while (suggestions.length < count) {
    const suggestion = `${baseSlug}-${counter}`;
    if (!existingSlugs.includes(suggestion)) {
      suggestions.push(suggestion);
    }
    counter++;
    
    // Evita loop infinito
    if (counter > 100) break;
  }
  
  return suggestions;
}

/**
 * Normalizza un nome azienda per la generazione dello slug
 */
export function normalizeCompanyName(companyName: string): string {
  return companyName
    // Rimuovi forme giuridiche comuni
    .replace(/\b(s\.r\.l\.|srl|s\.p\.a\.|spa|s\.a\.s\.|sas|s\.n\.c\.|snc|ltd|inc|corp|llc|gmbh|ag)\b/gi, '')
    // Rimuovi parole comuni
    .replace(/\b(company|azienda|impresa|società|ditta|studio|gruppo|group|team|consulting|services|solutions)\b/gi, '')
    // Pulisci spazi multipli
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Genera slug da ragione sociale
 */
export function generateSlugFromCompanyName(ragioneSociale: string): string {
  const normalized = normalizeCompanyName(ragioneSociale);
  return generateSlug(normalized);
}