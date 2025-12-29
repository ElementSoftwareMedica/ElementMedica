export interface ImportResults {
  results: {
    created?: any[];
    updated?: any[];
    errors?: any[];
    sitesCreated?: any[];
  };
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
  ragioneSociale?: string;
  piva?: string;
  codiceFiscale?: string;
  nomeSede?: string;
  citta?: string;
  provincia?: string;
  cap?: string;
  indirizzo?: string;
  sedeAzienda?: string;
  personaRiferimento?: string;
  telefono?: string;
  mail?: string;
  dvr?: string;
  reparti?: string;
  _isExisting?: boolean;
  _isNewSite?: boolean;
  _isDuplicateSite?: boolean;
  _isNewCompanyWithSite?: boolean;
  [key: string]: unknown; // Index signature per compatibilità con GenericImport
}

export interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: CompanyData[];
  onResolve: (resolutions: CompanyData[]) => void;
}