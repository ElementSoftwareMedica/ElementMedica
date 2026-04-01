import { apiGet } from './api';

export interface EmailCheckResult {
  available: boolean;
  existsInCurrentTenant?: boolean;
  existingPerson?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };
}

export interface TaxCodeCheckResult {
  available: boolean;
  existsInCurrentTenant?: boolean;
  existingPerson?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };
}

/**
 * Verifica se un'email è disponibile (non già in uso)
 */
export async function checkEmailAvailability(email: string): Promise<boolean> {
  if (!email || !email.trim()) {
    return true; // Email vuota è considerata "disponibile" (sarà validata altrove)
  }

  try {
    const response = await apiGet<EmailCheckResult>('/api/v1/persons/check-email', {
      email: email.toLowerCase().trim()
    });
    return response.available;
  } catch (error) {
    return true; // In caso di errore, non bloccare l'utente
  }
}

/**
 * Verifica dettagliata disponibilità email con info sulla persona esistente
 * P59: Usato per warning (non bloccante) in TrainerForm
 */
export async function checkEmailAvailabilityDetails(email: string): Promise<EmailCheckResult> {
  if (!email || !email.trim()) {
    return { available: true };
  }

  try {
    const response = await apiGet<EmailCheckResult>('/api/v1/persons/check-email', {
      email: email.toLowerCase().trim()
    });
    return response;
  } catch (error) {
    return { available: true }; // In caso di errore, non bloccare l'utente
  }
}

/**
 * Verifica se un codice fiscale è disponibile (non già in uso)
 */
export async function checkTaxCodeAvailability(taxCode: string): Promise<boolean> {
  if (!taxCode || !taxCode.trim()) {
    return true; // Codice fiscale vuoto è considerato "disponibile"
  }

  try {
    const response = await apiGet<TaxCodeCheckResult>('/api/v1/persons/check-taxcode', {
      taxCode: taxCode.toUpperCase().trim()
    });
    return response.available;
  } catch (error) {
    return true; // In caso di errore, non bloccare l'utente
  }
}

/**
 * P59: Verifica dettagliata disponibilità CF con supporto cross-tenant import
 */
export async function checkTaxCodeAvailabilityDetails(taxCode: string): Promise<TaxCodeCheckResult & {
  existsInOtherTenant?: boolean;
  canImport?: boolean;
  message?: string;
}> {
  if (!taxCode || !taxCode.trim()) {
    return { available: true };
  }

  try {
    const response = await apiGet<TaxCodeCheckResult & {
      existsInOtherTenant?: boolean;
      canImport?: boolean;
      message?: string;
    }>('/api/v1/persons/check-taxcode', {
      taxCode: taxCode.toUpperCase().trim()
    });
    return response;
  } catch (error) {
    return { available: true };
  }
}

/**
 * Verifica se un username è disponibile (non già in uso)
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  if (!username || !username.trim()) {
    return true;
  }

  try {
    const response = await apiGet<{ available: boolean }>('/api/v1/persons/check-username', {
      username: username.trim()
    });
    return response.available;
  } catch (error) {
    return true;
  }
}
