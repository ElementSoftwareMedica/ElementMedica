/** Struttura risultati import come restituita dal backend */
export interface ImportResults {
  success: boolean;
  /** true se ci sono aziende con conflitti stesso-tenant non risolti */
  hasConflicts?: boolean;
  results: {
    created?: ImportResultItem[];
    updated?: ImportResultItem[];
    errors?: ImportErrorItem[];
    sitesCreated?: { profileId: string; siteId: string }[];
  };
  summary?: {
    total: number;
    created: number;
    updated: number;
    sitesCreated: number;
    errors: number;
    conflicts?: number;
  };
}

export interface ImportResultItem {
  id: string;
  companyId?: string;
  ragioneSociale?: string;
}

/** Un errore riportato dal backend durante l'import. Se ha `existingCompany` è un conflitto. */
export interface ImportErrorItem {
  index: number;
  error: string;
  data: CompanyData;
  existingCompany?: ExistingCompanyInfo;
}

/** Dati dell'azienda già presente nel database (stesso tenant) in caso di conflitto */
export interface ExistingCompanyInfo {
  /** CompanyTenantProfile.id - usato come overwriteId */
  id: string;
  /** Company.id */
  companyId?: string;
  ragioneSociale: string;
  piva?: string;
  codiceFiscale?: string;
  sites?: ExistingSiteInfo[];
}

export interface ExistingSiteInfo {
  id: string;
  siteName: string;
  indirizzo?: string;
  citta?: string;
  provincia?: string;
  cap?: string;
}

export interface CompanyImportProps {
  onImport: (companies: CompanyData[], overwriteIds?: string[]) => Promise<ImportResults>;
  onClose: () => void;
  existingCompanies?: CompanyData[];
}

export interface CompanyPreviewTableProps {
  processedData: CompanyData[];
}

export interface CompanyData {
  // Company (dati anagrafici globali)
  ragioneSociale?: string;
  piva?: string;
  codiceFiscale?: string;
  formaGiuridica?: string;
  codiceAteco?: string;
  settore?: string;
  dimensione?: 'MICRO' | 'PICCOLA' | 'MEDIA' | 'GRANDE';
  sdi?: string;
  pecFatturazione?: string;
  sedeLegaleIndirizzo?: string;
  sedeLegaleCitta?: string;
  sedeLegaleCap?: string;
  sedeLegaleProvincia?: string;
  sedeLegaleNazione?: string;

  // CompanyTenantProfile (dati commerciali per-tenant)
  pec?: string;
  iban?: string;
  mail?: string;
  telefono?: string;
  personaRiferimento?: string;
  referenteRuolo?: string;
  note?: string;
  noteCommerciali?: string;
  noteOperative?: string;
  isActive?: boolean | string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PROSPECT' | 'CHURNED';
  dataInizioRapporto?: string;
  dataFineRapporto?: string;

  // CompanySite (sede operativa)
  siteName?: string;
  nomeSede?: string;
  indirizzo?: string;
  sedeAzienda?: string;
  citta?: string;
  provincia?: string;
  cap?: string;
  reparti?: string;
  siteIndirizzo?: string;
  siteCitta?: string;
  siteProvincia?: string;
  siteCap?: string;
  sitePersonaRiferimento?: string;
  siteTelefono?: string;
  siteMail?: string;
  dvr?: string;
  rsppId?: string;
  medicoCompetenteId?: string;
  ultimoSopralluogo?: string;
  prossimoSopralluogo?: string;
  valutazioneSopralluogo?: string;
  sopralluogoEseguitoDa?: string;
  ultimoSopralluogoRSPP?: string;
  prossimoSopralluogoRSPP?: string;
  noteSopralluogoRSPP?: string;
  ultimoSopralluogoMedico?: string;
  prossimoSopralluogoMedico?: string;
  noteSopralluogoMedico?: string;

  // Flag interni per anteprima
  _isExisting?: boolean;
  _isNewSite?: boolean;
  _isDuplicateSite?: boolean;
  _isNewCompanyWithSite?: boolean;
  _hasSiteData?: boolean;

  [key: string]: unknown;
}

/** Risoluzione per un singolo conflitto scelto dall'utente */
export interface ConflictResolution {
  /** Index della riga CSV (da ImportErrorItem.index) */
  index: number;
  action: 'skip' | 'overwrite' | 'addAsSite';
  /** CompanyTenantProfile.id dell'azienda esistente */
  profileId?: string;
  /** Dati originali dell'azienda dal CSV (per addAsSite) */
  originalData?: CompanyData;
  /** Nome sede personalizzato (per addAsSite) */
  siteName?: string;
}

/** @deprecated Usare ConflictResolution */
export interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: CompanyData[];
  onResolve: (resolutions: CompanyData[]) => void;
}