import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAsyncValidationOptions {
  /** Ritardo in ms prima di eseguire la validazione (default: 500) */
  debounceMs?: number;
  /** Funzione di validazione async che ritorna true se valido, false altrimenti */
  validator: (value: string) => Promise<boolean>;
  /** Messaggio di errore da mostrare quando la validazione fallisce */
  errorMessage: string;
  /** Valore corrente del campo */
  value: string;
  /** Se true, salta la validazione (es: in edit mode) */
  skip?: boolean;
}

interface UseAsyncValidationResult {
  /** Messaggio di errore da mostrare, o stringa vuota se valido */
  error: string;
  /** True se la validazione è in corso */
  isValidating: boolean;
  /** True se il valore è valido (o non ancora validato) */
  isValid: boolean;
}

/**
 * Hook per validazione asincrona con debounce.
 * Utile per controllare disponibilità email, codice fiscale, username, etc.
 */
export function useAsyncValidation({
  debounceMs = 500,
  validator,
  errorMessage,
  value,
  skip = false
}: UseAsyncValidationOptions): UseAsyncValidationResult {
  const [error, setError] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean>(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validate = useCallback(async (currentValue: string) => {
    // Skip se vuoto o se skip=true
    if (!currentValue || !currentValue.trim() || skip) {
      setError('');
      setIsValid(true);
      setIsValidating(false);
      return;
    }

    // Cancella validazione precedente se in corso
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsValidating(true);

    try {
      const valid = await validator(currentValue);
      
      // Controlla se la validazione è stata abortita
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      if (valid) {
        setError('');
        setIsValid(true);
      } else {
        setError(errorMessage);
        setIsValid(false);
      }
    } catch (err) {
      // Ignora errori di abort
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      // In caso di errore di rete, considera valido per non bloccare l'utente
      console.error('Async validation error:', err);
      setError('');
      setIsValid(true);
    } finally {
      setIsValidating(false);
      abortControllerRef.current = null;
    }
  }, [validator, errorMessage, skip]);

  useEffect(() => {
    // Clear timeout precedente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Skip validazione se campo vuoto o skip=true
    if (!value || !value.trim() || skip) {
      setError('');
      setIsValid(true);
      setIsValidating(false);
      return;
    }

    // Imposta nuovo timeout per debounce
    timeoutRef.current = setTimeout(() => {
      validate(value);
    }, debounceMs);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [value, validate, debounceMs, skip]);

  return { error, isValidating, isValid };
}
