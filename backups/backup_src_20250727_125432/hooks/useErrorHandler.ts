/**
 * Hook personalizzato per la gestione centralizzata degli errori nell'applicazione.
 * 
 * Fornisce funzioni per:
 * - Gestire errori API in modo consistente
 * - Mostrare errori all'utente in modo appropriato
 * - Tracciare errori per scopi di logging
 * 
 * @module hooks/useErrorHandler
 */

import React, { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { sanitizeErrorMessage } from '../utils/errorUtils';

/**
 * Interfaccia per gli errori API
 */
export interface ApiError extends Error {
  statusCode?: number;
  details?: any;
  code?: string;
}

/**
 * Opzioni per la gestione degli errori
 */
interface ErrorHandlerOptions {
  /** Se mostrare automaticamente l'errore all'utente */
  showToast?: boolean;
  /** Se registrare l'errore nella console */
  logToConsole?: boolean;
  /** Callback personalizzato per errori specifici */
  onError?: (error: ApiError) => void;
}

/**
 * Risultato del hook useErrorHandler
 */
interface ErrorHandlerResult {
  /** Errore corrente */
  error: ApiError | null;
  /** Se è in corso la gestione di un errore */
  isError: boolean;
  /** Funzione per gestire un errore */
  handleError: (error: unknown, customMessage?: string) => void;
  /** Funzione per resettare lo stato dell'errore */
  clearError: () => void;
  /** Funzione per gestire errori in chiamate API */
  wrapAsync: <T>(promise: Promise<T>, options?: ErrorHandlerOptions) => Promise<T | null>;
}

/**
 * Hook per la gestione centralizzata degli errori nell'applicazione
 * 
 * @example
 * ```tsx
 * const { handleError, wrapAsync } = useErrorHandler();
 * 
 * // Uso con una funzione asincrona
 * const handleSubmit = async () => {
 *   try {
 *     await saveData();
 *   } catch (error) {
 *     handleError(error, "Impossibile salvare i dati");
 *   }
 * };
 * 
 * // Uso con wrapAsync
 * const fetchData = async () => {
 *   const data = await wrapAsync(api.fetchData(), {
 *     showToast: true,
 *     onError: (error) => {
 *       // Logica personalizzata per errori specifici
 *       if (error.statusCode === 404) {
 *         navigate('/not-found');
 *       }
 *     }
 *   });
 *   
 *   if (data) {
 *     // Procedi con i dati
 *   }
 * };
 * ```
 */
export function useErrorHandler(): ErrorHandlerResult {
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Gestisce un errore, normalizzandolo e eseguendo le azioni appropriate
   * 
   * @param error - Errore da gestire (può essere qualsiasi tipo)
   * @param customMessage - Messaggio personalizzato da mostrare all'utente
   */
  const handleError = useCallback((error: unknown, customMessage?: string) => {
    // Normalizza l'errore
    const normalizedError: ApiError = error instanceof Error 
      ? error as ApiError
      : new Error(typeof error === 'string' ? error : 'Si è verificato un errore sconosciuto');
    
    // Imposta lo stato dell'errore
    setError(normalizedError);
    
    // Logga l'errore nella console
    console.error('Error handled:', normalizedError);
    
    // Mostra il toast con l'errore sanitizzato
    const message = customMessage || sanitizeErrorMessage(normalizedError, 'Si è verificato un errore');
    toast.error(message);
  }, []);

  /**
   * Resetta lo stato dell'errore
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Avvolge una Promise per gestire automaticamente gli errori
   * 
   * @param promise - Promise da avvolgere
   * @param options - Opzioni per la gestione degli errori
   * @returns Promise che restituisce il risultato o null in caso di errore
   */
  const wrapAsync = useCallback(async <T>(
    promise: Promise<T>, 
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    const { 
      showToast = true, 
      logToConsole = true,
      onError 
    } = options;

    try {
      return await promise;
    } catch (error) {
      // Normalizza l'errore
      const normalizedError: ApiError = error instanceof Error 
        ? error as ApiError 
        : new Error(typeof error === 'string' ? error : 'Si è verificato un errore sconosciuto');
      
      // Imposta lo stato dell'errore
      setError(normalizedError);
      
      // Logga l'errore se richiesto
      if (logToConsole) {
        console.error('API Error:', normalizedError);
        
        if (normalizedError.details) {
          console.error('Error details:', normalizedError.details);
        }
      }
      
      // Mostra il toast se richiesto
      if (showToast) {
        toast.error(sanitizeErrorMessage(normalizedError, 'Si è verificato un errore durante l\'operazione'));
      }
      
      // Chiama il callback personalizzato se fornito
      if (onError) {
        onError(normalizedError);
      }
      
      return null;
    }
  }, []);

  return {
    error,
    isError: error !== null,
    handleError,
    clearError,
    wrapAsync,
  };
}

export default useErrorHandler;