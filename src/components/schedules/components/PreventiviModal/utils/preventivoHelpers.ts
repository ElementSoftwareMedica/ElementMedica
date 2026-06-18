import type { SpesaAccessoria, ScontoApplicato, CompanyTotals, Training, CompanyConfig } from '../types';

/**
 * Builds formatted note with price breakdown for preventivo
 * 
 * @param selectedCourse - Training course
 * @param config - Company configuration
 * @param prezzoUnitario - Unit price
 * @param totals - Calculated totals
 * @param speseAccessorie - Accessory expenses
 * @param scontoApplicato - Applied discount
 * @param note - Additional notes
 * @returns Formatted note string
 */
export function buildPreventivoNote(
  selectedCourse: Training,
  config: CompanyConfig,
  prezzoUnitario: number,
  totals: CompanyTotals,
  speseAccessorie: SpesaAccessoria[],
  scontoApplicato: ScontoApplicato | null,
  note: string
): string {
  const parts: string[] = [];

  if (speseAccessorie.length > 0) {
    parts.push('Spese accessorie:');
    speseAccessorie.forEach((spesa) => {
      parts.push(`- ${spesa.descrizione}: €${spesa.importo.toFixed(2)}`);
    });
  }

  if (scontoApplicato) {
    parts.push(`Sconto applicato: ${scontoApplicato.codice} (-${scontoApplicato.percentuale}%)`);
  }

  if (note) {
    parts.push(note);
  }

  return parts.join('\n');
}

/**
 * Gets display name for company
 * 
 * @param company - Company object
 * @returns Display name string
 */
export function getCompanyName(company: { ragioneSociale?: string; businessName?: string; id: string | number }): string {
  return company.ragioneSociale || company.businessName || `Azienda ${company.id}`;
}
