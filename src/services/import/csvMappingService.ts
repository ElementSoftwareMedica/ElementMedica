import { CSV_HEADER_MAPPINGS, TITLE_CASE_FIELDS, PersonData } from '../../types/import/personImportTypes';
import { applyTitleCaseToFields } from '../../utils/textFormatters';

interface CompanyLite {
  id: string;
  ragioneSociale?: string;
  name?: string;
}

/**
 * Servizio per la mappatura e normalizzazione dei dati CSV
 */
export class CsvMappingService {
  
  /**
   * Ottiene la mappatura degli header CSV
   */
  static getHeaderMappings(): Record<string, string> {
    return CSV_HEADER_MAPPINGS;
  }

  /**
   * Ottiene i campi da formattare in Title Case
   */
  static getTitleCaseFields(): readonly string[] {
    return TITLE_CASE_FIELDS;
  }

  /**
   * Applica la formattazione Title Case ai campi specificati
   */
  static applyTitleCaseFormatting(person: Record<string, unknown>): Record<string, unknown> {
    return applyTitleCaseToFields(person, [...TITLE_CASE_FIELDS]);
  }

  /**
   * Normalizza il codice fiscale
   */
  static normalizeTaxCode(taxCode: string): string {
    if (!taxCode) return '';
    return taxCode.toUpperCase().trim();
  }

  /**
   * Normalizza il nome di un'azienda per il confronto
   */
  static normalizeCompanyName(companyName: string): string {
    if (!companyName) return '';
    return companyName.toLowerCase().trim();
  }

  /**
   * Trova un'azienda corrispondente nella lista esistente
   */
  static findMatchingCompany(companyName: string, existingCompanies: CompanyLite[]): CompanyLite | null {
    if (!companyName || !existingCompanies.length) return null;

    const normalizedName = this.normalizeCompanyName(companyName);
    
    return existingCompanies.find(company => {
      const ragioneSociale = company.ragioneSociale ? this.normalizeCompanyName(company.ragioneSociale) : '';
      const name = company.name ? this.normalizeCompanyName(company.name) : '';
      
      return ragioneSociale === normalizedName || name === normalizedName;
    }) || null;
  }

  /**
   * Trova aziende simili per suggerimenti
   */
  static findSimilarCompanies(companyName: string, existingCompanies: CompanyLite[]): CompanyLite[] {
    if (!companyName || !existingCompanies.length) return [];

    const normalizedName = this.normalizeCompanyName(companyName);
    
    return existingCompanies.filter(company => {
      const ragioneSociale = company.ragioneSociale ? this.normalizeCompanyName(company.ragioneSociale) : '';
      const name = company.name ? this.normalizeCompanyName(company.name) : '';
      
      return ragioneSociale.includes(normalizedName) || 
             normalizedName.includes(ragioneSociale) ||
             name.includes(normalizedName) || 
             normalizedName.includes(name);
    });
  }

  /**
   * Risolve l'ID dell'azienda basandosi sul nome
   */
  static resolveCompanyId(person: PersonData, existingCompanies: CompanyLite[]): PersonData {
    if (!person.companyName || typeof person.companyName !== 'string') {
      return person;
    }

    const matchingCompany = this.findMatchingCompany(person.companyName, existingCompanies);
    
    if (matchingCompany) {
      return {
        ...person,
        companyId: matchingCompany.id,
        companyName: matchingCompany.ragioneSociale || matchingCompany.name
      };
    }

    // Se non trova corrispondenza, rimuove companyId per attivare il conflict detection
    return {
      ...person,
      companyId: undefined
    };
  }

  /**
   * Pulisce e normalizza i dati di una persona
   */
  static cleanPersonData(person: PersonData): PersonData {
    const cleaned: Record<string, unknown> = { ...person };

    // Normalizza il codice fiscale
    if (cleaned.taxCode) {
      cleaned.taxCode = this.normalizeTaxCode(String(cleaned.taxCode));
    }

    // Rimuove spazi extra da tutti i campi stringa
    Object.keys(cleaned).forEach(key => {
      const value = cleaned[key];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        // Rimuove campi vuoti
        cleaned[key] = trimmed === '' ? undefined : trimmed;
      }
    });

    return cleaned as PersonData;
  }

  /**
   * Valida se una riga è un template vuoto
   */
  static isEmptyTemplate(person: Partial<PersonData>): boolean {
    return !person.firstName?.trim() && 
           !person.lastName?.trim() && 
           !person.taxCode?.trim();
  }

  /**
   * Prepara i dati per l'API rimuovendo campi non necessari
   */
  static prepareForAPI(person: PersonData): Record<string, unknown> {
    const apiData: Record<string, unknown> = {};
    const source: Record<string, unknown> = person as Record<string, unknown>;
    
    // Campi da includere nell'API
    const apiFields = [
      'firstName', 'lastName', 'email', 'phone', 'taxCode', 'birthDate',
      'residenceAddress', 'city', 'province', 'postalCode', 'title', 'companyId', 
      'username', 'notes', 'roleType'
    ] as const;

    apiFields.forEach(field => {
      const v = source[field as string];
      if (v !== undefined && v !== null && v !== '') {
        apiData[field as string] = v;
      }
    });

    // Assicura che il roleType sia valido
    if (!apiData.roleType) {
      apiData.roleType = 'EMPLOYEE'; // Default
    }

    return apiData;
  }

  /**
   * Converte le opzioni azienda per il componente SearchableSelect
   */
  static convertCompaniesToOptions(companies: CompanyLite[]): Array<{ value: string; label: string }> {
    return companies.map(company => ({
      value: company.id,
      label: company.ragioneSociale || company.name || 'Azienda senza nome'
    }));
  }

  /**
   * Estrae i nomi delle aziende uniche dai dati importati
   */
  static extractUniqueCompanyNames(persons: PersonData[]): string[] {
    const companyNames = new Set<string>();
    
    persons.forEach(person => {
      if (person.companyName && typeof person.companyName === 'string') {
        companyNames.add(person.companyName.trim());
      }
    });

    return Array.from(companyNames).filter(name => name.length > 0);
  }

  /**
   * Valida la struttura dei dati importati
   */
  static validateImportStructure(data: unknown[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('I dati importati devono essere un array');
      return { isValid: false, errors };
    }

    if (data.length === 0) {
      errors.push('Il file non contiene dati da importare');
      return { isValid: false, errors };
    }

    // Verifica che almeno una riga abbia dati validi
    const hasValidData = data.some(person => !this.isEmptyTemplate(person as Partial<PersonData>));
    
    if (!hasValidData) {
      errors.push('Il file non contiene righe con dati validi');
      return { isValid: false, errors };
    }

    return { isValid: true, errors };
  }
}