/**
 * Utility per la gestione e il filtraggio dei messaggi di errore
 * Rimuove riferimenti tecnici come "TanStack" per mostrare messaggi user-friendly
 */

/**
 * Filtra i messaggi di errore per rimuovere riferimenti tecnici
 * e restituire messaggi user-friendly
 */
export function sanitizeErrorMessage(error: unknown, fallbackMessage: string = 'Si è verificato un errore'): string {
  let message: string;
  
  // Estrai il messaggio dall'errore
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    return fallbackMessage;
  }
  
  // Lista di termini tecnici da filtrare
  const technicalTerms = [
    'tanstack',
    'react-query',
    'query client',
    'mutation',
    'axios',
    'fetch failed',
    'network error',
    'cors',
    'preflight'
  ];
  
  // Controlla se il messaggio contiene termini tecnici
  const containsTechnicalTerms = technicalTerms.some(term => 
    message.toLowerCase().includes(term.toLowerCase())
  );
  
  // Se contiene termini tecnici, restituisci il messaggio fallback
  if (containsTechnicalTerms) {
    return fallbackMessage;
  }
  
  // Altrimenti restituisci il messaggio originale
  return message;
}

/**
 * Varianti specifiche per diversi contesti
 */
export const errorMessages = {
  loading: {
    companies: 'Errore nel caricamento delle aziende',
    employees: 'Errore nel caricamento dei dipendenti',
    courses: 'Errore nel caricamento dei corsi',
    trainers: 'Errore nel caricamento dei formatori',
    generic: 'Errore nel caricamento dei dati'
  },
  saving: {
    companies: 'Errore nel salvataggio dell\'azienda',
    employees: 'Errore nel salvataggio del dipendente',
    courses: 'Errore nel salvataggio del corso',
    trainers: 'Errore nel salvataggio del formatore',
    generic: 'Errore nel salvataggio'
  },
  deleting: {
    companies: 'Errore nell\'eliminazione dell\'azienda',
    employees: 'Errore nell\'eliminazione del dipendente',
    courses: 'Errore nell\'eliminazione del corso',
    trainers: 'Errore nell\'eliminazione del formatore',
    generic: 'Errore nell\'eliminazione'
  },
  network: 'Errore di connessione al server',
  permission: 'Non hai i permessi necessari per questa operazione',
  notFound: 'Risorsa non trovata',
  validation: 'Dati non validi',
  generic: 'Si è verificato un errore inaspettato'
};

/**
 * Funzione helper per errori di caricamento
 */
export function getLoadingErrorMessage(entity: keyof typeof errorMessages.loading, error: unknown): string {
  return sanitizeErrorMessage(error, errorMessages.loading[entity]);
}

/**
 * Funzione helper per errori di salvataggio
 */
export function getSavingErrorMessage(entity: keyof typeof errorMessages.saving, error: unknown): string {
  return sanitizeErrorMessage(error, errorMessages.saving[entity]);
}

/**
 * Funzione helper per errori di eliminazione
 */
export function getDeletingErrorMessage(entity: keyof typeof errorMessages.deleting, error: unknown): string {
  return sanitizeErrorMessage(error, errorMessages.deleting[entity]);
}