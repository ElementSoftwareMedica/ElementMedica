import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { isValidUUID, sanitizeId } from '../../utils/validation';

interface UseValidatedParamsOptions {
  /** Se true, reindirizza automaticamente alla lista se l'ID non è valido */
  redirectOnInvalid?: boolean;
  /** URL di fallback per il redirect (default: '/courses') */
  fallbackUrl?: string;
  /** Se true, mostra un toast di errore quando l'ID non è valido */
  showErrorToast?: boolean;
}

interface UseValidatedParamsResult {
  /** L'ID validato o null se non valido */
  id: string | null;
  /** True se l'ID è valido */
  isValid: boolean;
  /** True se l'ID non è valido */
  isInvalid: boolean;
  /** True se sta ancora validando */
  isValidating: boolean;
  /** Messaggio di errore se l'ID non è valido */
  errorMessage: string | null;
}

/**
 * Hook per validare automaticamente gli ID nei parametri delle route
 * Gestisce la validazione UUID e fornisce stati per la UI
 */
export const useValidatedParams = (
  options: UseValidatedParamsOptions = {}
): UseValidatedParamsResult => {
  const { id: rawId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const {
    redirectOnInvalid = false,
    fallbackUrl = '/courses',
    showErrorToast = false
  } = options;
  
  const [isValidating, setIsValidating] = useState(true);
  const [validationResult, setValidationResult] = useState<{
    id: string | null;
    isValid: boolean;
    errorMessage: string | null;
  }>({
    id: null,
    isValid: false,
    errorMessage: null
  });
  
  useEffect(() => {
    const validateId = () => {
      setIsValidating(true);
      
      if (!rawId) {
        setValidationResult({
          id: null,
          isValid: false,
          errorMessage: 'ID mancante nell\'URL'
        });
        
        if (redirectOnInvalid) {
          navigate(fallbackUrl, { replace: true });
        }
        
        setIsValidating(false);
        return;
      }
      
      const sanitizedId = sanitizeId(rawId);
      
      if (!sanitizedId || !isValidUUID(sanitizedId)) {
        setValidationResult({
          id: null,
          isValid: false,
          errorMessage: 'ID non valido. L\'ID deve essere un UUID valido.'
        });
        
        if (redirectOnInvalid) {
          navigate(fallbackUrl, { replace: true });
        }
        
        setIsValidating(false);
        return;
      }
      
      setValidationResult({
        id: sanitizedId,
        isValid: true,
        errorMessage: null
      });
      
      setIsValidating(false);
    };
    
    validateId();
  }, [rawId, redirectOnInvalid, fallbackUrl, navigate]);
  
  return {
    id: validationResult.id,
    isValid: validationResult.isValid,
    isInvalid: !validationResult.isValid,
    isValidating,
    errorMessage: validationResult.errorMessage
  };
};