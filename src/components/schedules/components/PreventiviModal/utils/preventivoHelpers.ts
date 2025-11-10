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
  const courseTitle = selectedCourse.title || selectedCourse.name || 'Corso';
  const noteBreakdown = [
    `Corso: ${courseTitle}`,
    `Partecipanti: ${config.numPartecipanti}`,
    `Prezzo unitario: €${prezzoUnitario.toFixed(2)}`,
    `Prezzo base: €${totals.prezzoBase.toFixed(2)}`,
  ];

  if (speseAccessorie.length > 0) {
    noteBreakdown.push('\nSpese accessorie:');
    speseAccessorie.forEach((spesa) => {
      noteBreakdown.push(`- ${spesa.descrizione}: €${spesa.importo.toFixed(2)}`);
    });
  }

  if (scontoApplicato) {
    noteBreakdown.push(`\nSconto applicato: ${scontoApplicato.codice} (-${scontoApplicato.percentuale}%)`);
  }

  noteBreakdown.push(`\nTotale imponibile: €${totals.imponibile.toFixed(2)}`);
  noteBreakdown.push(`IVA (${totals.percentualeIva}%): €${totals.importoIva.toFixed(2)}`);
  noteBreakdown.push(`Totale finale: €${totals.importoFinale.toFixed(2)}`);

  if (note) {
    noteBreakdown.push(`\nNote aggiuntive:\n${note}`);
  }

  return noteBreakdown.join('\n');
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
