import { useState } from 'react';
import { useCodiciSconto } from '../../../../../hooks/finance/useCodiciSconto';
import type { ScontoApplicato, TipoServizio, Training, CompanyTotals } from '../types';

interface UseScontoValidationReturn {
  validateAndApplySconto: (
    codiceSconto: string,
    selectedCompanyId: string | number | null,
    companyTotals: Map<string | number, CompanyTotals>,
    tipoServizio: TipoServizio,
    selectedCourse: Training
  ) => Promise<ScontoApplicato | null>;
  loadingSconto: boolean;
}

/**
 * Hook for validating and applying discount codes
 * 
 * Integrates with backend validation API and converts discount to percentage
 * 
 * @returns Validation function and loading state
 */
export function useScontoValidation(): UseScontoValidationReturn {
  const { validateCodice, loading: loadingSconto } = useCodiciSconto();
  const [isValidating, setIsValidating] = useState(false);

  const validateAndApplySconto = async (
    codiceSconto: string,
    selectedCompanyId: string | number | null,
    companyTotals: Map<string | number, CompanyTotals>,
    tipoServizio: TipoServizio,
    selectedCourse: Training
  ): Promise<ScontoApplicato | null> => {
    if (!codiceSconto.trim()) {
      return null;
    }

    if (!selectedCompanyId) {
      alert('⚠️ Seleziona prima un\'azienda');
      return null;
    }

    const totals = companyTotals.get(selectedCompanyId);
    if (!totals) {
      return null;
    }

    setIsValidating(true);
    try {
      const result = await validateCodice({
        codice: codiceSconto.trim(),
        importo: totals.subtotale,
        tipoServizio,
        corsoId: String(selectedCourse.id),
      });

      if (result.valido && result.codice) {
        const percentuale =
          result.codice.tipo === 'PERCENTUALE'
            ? result.codice.valore
            : (result.codice.valore / totals.subtotale) * 100;

        const scontoApplicato: ScontoApplicato = {
          id: result.codice.id,
          codice: result.codice.codice,
          percentuale: Math.round(percentuale * 100) / 100,
        };

        alert(
          `✅ Codice sconto "${result.codice.codice}" applicato: ${
            result.codice.tipo === 'PERCENTUALE' 
              ? `-${result.codice.valore}%` 
              : `-€${result.codice.valore}`
          }`
        );

        return scontoApplicato;
      } else {
        alert(result.messaggio || '❌ Codice sconto non valido o scaduto');
        return null;
      }
    } catch (error: any) {
      console.error('Errore validazione codice:', error);
      alert(error.response?.data?.message || 'Errore durante la validazione');
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  return {
    validateAndApplySconto,
    loadingSconto: loadingSconto || isValidating
  };
}
