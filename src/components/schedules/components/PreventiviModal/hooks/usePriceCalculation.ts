import { useMemo } from 'react';
import type { CompanyConfig, SpesaAccessoria, ScontoApplicato, TipoServizio, CompanyTotals } from '../types';

/**
 * Hook for calculating price totals per company
 * 
 * Computes: prezzo base, spese, subtotale, sconto, imponibile, IVA, totale finale
 * 
 * @param companiesConfig - Map of company configurations
 * @param prezzoUnitario - Unit price per participant
 * @param speseAccessorie - Shared accessory expenses
 * @param scontoApplicato - Applied discount
 * @param tipoServizio - Service type (affects IVA percentage)
 * @returns Map of company IDs to calculated totals
 */
export function usePriceCalculation(
  companiesConfig: Map<string | number, CompanyConfig>,
  prezzoUnitario: number,
  speseAccessorie: SpesaAccessoria[],
  scontoApplicato: ScontoApplicato | null,
  tipoServizio: TipoServizio
): Map<string | number, CompanyTotals> {
  return useMemo(() => {
    const totalsMap = new Map<string | number, CompanyTotals>();

    companiesConfig.forEach((config, companyId) => {
      if (!config.enabled) return;

      // 1. Prezzo base (unitario × partecipanti)
      const prezzoBase = prezzoUnitario * config.numPartecipanti;

      // 2. Spese accessorie
      const totaleSpese = speseAccessorie.reduce((sum, spesa) => sum + spesa.importo, 0);

      // 3. Subtotale
      const subtotale = prezzoBase + totaleSpese;

      // 4. Sconto
      const importoSconto = scontoApplicato 
        ? (subtotale * scontoApplicato.percentuale) / 100 
        : 0;

      // 5. Imponibile (dopo sconto)
      const imponibile = subtotale - importoSconto;

      // 6. IVA (10% medico, 22% altri)
      const percentualeIva = tipoServizio === 'MEDICO_COMPETENTE' ? 10 : 22;
      const importoIva = (imponibile * percentualeIva) / 100;

      // 7. Importo finale
      const importoFinale = imponibile + importoIva;

      totalsMap.set(companyId, {
        prezzoBase,
        totaleSpese,
        subtotale,
        importoSconto,
        imponibile,
        percentualeIva,
        importoIva,
        importoFinale,
      });
    });

    return totalsMap;
  }, [companiesConfig, prezzoUnitario, speseAccessorie, scontoApplicato, tipoServizio]);
}
