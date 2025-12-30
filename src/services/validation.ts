import { apiGet } from './api';

/**
 * Verifica se un'email è disponibile (non già in uso)
 */
export async function checkEmailAvailability(email: string): Promise<boolean> {
  if (!email || !email.trim()) {
    return true; // Email vuota è considerata "disponibile" (sarà validata altrove)
  }

  try {
    const response = await apiGet<{ available: boolean }>('/api/v1/persons/check-email', { 
      email: email.toLowerCase().trim() 
    });
    return response.available;
  } catch (error) {
    console.error('Error checking email availability:', error);
    return true; // In caso di errore, non bloccare l'utente
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
    const response = await apiGet<{ available: boolean }>('/api/v1/persons/check-taxcode', { 
      taxCode: taxCode.toUpperCase().trim() 
    });
    return response.available;
  } catch (error) {
    console.error('Error checking tax code availability:', error);
    return true; // In caso di errore, non bloccare l'utente
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
    console.error('Error checking username availability:', error);
    return true;
  }
}
