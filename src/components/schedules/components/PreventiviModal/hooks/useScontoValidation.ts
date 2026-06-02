import { useState } from 'react';
import { useCodiciSconto } from '../../../../../hooks/finance/useCodiciSconto';
import type { ScontoApplicato, TipoServizio, Training, CompanyTotals } from '../types';

/**
 * Result type for sconto validation
 */
export interface ScontoValidationResult {
  success: boolean;
  sconto: ScontoApplicato | null;
  message: string;
  type: 'success' | 'error' | 'warning';
}

interface UseScontoValidationReturn {
  validateAndApplySconto: (
    codiceSconto: string,
    selectedCompanyId: string | number | null,
    companyTotals: Map<string | number, CompanyTotals>,
    tipoServizio: TipoServizio,
    selectedCourse: Training,
    clienteType?: 'azienda' | 'persona'  // Optional, defaults to 'azienda'
  ) => Promise<ScontoValidationResult>;
  loadingSconto: boolean;
}

/**
 * Hook for validating and applying discount codes
 * 
 * Integrates with backend validation API and converts discount to percentage
 * Returns a result object instead of showing alerts, so the caller can handle the UI
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
    selectedCourse: Training,
    clienteType: 'azienda' | 'persona' = 'azienda'
  ): Promise<ScontoValidationResult> => {
    if (!codiceSconto.trim()) {
      return {
        success: false,
        sconto: null,
        message: 'Inserisci un codice sconto',
        type: 'warning'
      };
    }

    if (!selectedCompanyId) {
      return {
        success: false,
        sconto: null,
        message: 'Seleziona prima un\'azienda',
        type: 'warning'
      };
    }

    const totals = companyTotals.get(selectedCompanyId);
    if (!totals) {
      return {
        success: false,
        sconto: null,
        message: 'Configurazione non valida',
        type: 'error'
      };
    }

    setIsValidating(true);
    try {
      const result = await validateCodice({
        codice: codiceSconto.trim(),
        prezzoBase: totals.subtotale,  // Fixed: 'prezzoBase' instead of 'importo'
        tipoServizio,
        clienteId: String(selectedCompanyId),  // Fixed: required field
        clienteType,  // Fixed: required field
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

        const discountDisplay = result.codice.tipo === 'PERCENTUALE'
          ? `-${result.codice.valore}%`
          : `-€${result.codice.valore}`;

        return {
          success: true,
          sconto: scontoApplicato,
          message: `Codice sconto "${result.codice.codice}" applicato: ${discountDisplay}`,
          type: 'success'
        };
      } else {
        return {
          success: false,
          sconto: null,
          message: result.messaggio || 'Codice sconto non valido o scaduto',
          type: 'error'
        };
      }
    } catch (error: unknown) {
      return {
        success: false,
        sconto: null,
        message: (error as any).response?.data?.message || 'Errore durante la validazione',
        type: 'error'
      };
    } finally {
      setIsValidating(false);
    }
  };

  return {
    validateAndApplySconto,
    loadingSconto: loadingSconto || isValidating
  };
}
