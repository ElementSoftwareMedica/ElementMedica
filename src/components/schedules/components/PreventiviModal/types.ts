/**
 * Shared types for PreventiviModal
 */

export interface Company {
  id: string | number;
  ragioneSociale?: string;
  businessName?: string;
}

export interface Training {
  id: string | number;
  title?: string;
  name?: string;
  serviceType?: string;
  price?: number;
}

export interface CompanyConfig {
  numPartecipanti: number;
  enabled: boolean;
}

export interface DateEntry {
  date: string;
  startTime?: string;
  endTime?: string;
}

export interface SpesaAccessoria {
  descrizione: string;
  importo: number;
}

export interface ScontoApplicato {
  id: string;
  codice: string;
  percentuale: number;
}

export interface CompanyTotals {
  prezzoBase: number;
  totaleSpese: number;
  subtotale: number;
  importoSconto: number;
  imponibile: number;
  percentualeIva: number;
  importoIva: number;
  importoFinale: number;
}

export type TipoServizio = 
  | 'MEDICO_COMPETENTE' 
  | 'CORSO' 
  | 'RSPP' 
  | 'DVR' 
  | 'PRIVACY' 
  | 'ALTRO';
