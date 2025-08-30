import { CSV_HEADER_MAPPINGS, TITLE_CASE_FIELDS } from '../../types/import/personImportTypes';
import { applyTitleCaseToFields } from '../../utils/textFormatters';

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
  static applyTitleCaseFormatting(person: any): any {
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
  static findMatchingCompany(companyName: string, existingCompanies: any[]): any | null {
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
  static findSimilarCompanies(companyName: string, existingCompanies: any[]): any[] {
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
  static resolveCompanyId(person: any, existingCompanies: any[]): any {
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
  static cleanPersonData(person: any): any {
    const cleaned = { ...person };

    // Normalizza il codice fiscale
    if (cleaned.taxCode) {
      cleaned.taxCode = this.normalizeTaxCode(cleaned.taxCode);
    }

    // Rimuove spazi extra da tutti i campi stringa
    Object.keys(cleaned).forEach(key => {
      if (typeof cleaned[key] === 'string') {
        cleaned[key] = cleaned[key].trim();
        // Rimuove campi vuoti
        if (cleaned[key] === '') {
          cleaned[key] = undefined;
        }
      }
    });

    return cleaned;
  }

  /**
   * Valida se una riga è un template vuoto
   */
  static isEmptyTemplate(person: any): boolean {
    return !person.firstName?.trim() && 
           !person.lastName?.trim() && 
           !person.taxCode?.trim();
  }

  /**
   * Prepara i dati per l'API rimuovendo campi non necessari
   */
  static prepareForAPI(person: any): any {
    const apiData: any = {};
    
    // Campi da includere nell'API
    const apiFields = [
      'firstName', 'lastName', 'email', 'phone', 'taxCode', 'birthDate',
      'residenceAddress', 'city', 'province', 'postalCode', 'title', 'companyId', 
      'username', 'notes', 'roleType'
    ];

    apiFields.forEach(field => {
      if (person[field] !== undefined && person[field] !== null && person[field] !== '') {
        apiData[field] = person[field];
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
  static convertCompaniesToOptions(companies: any[]): Array<{ value: string; label: string }> {
    return companies.map(company => ({
      value: company.id,
      label: company.ragioneSociale || company.name || 'Azienda senza nome'
    }));
  }

  /**
   * Estrae i nomi delle aziende uniche dai dati importati
   */
  static extractUniqueCompanyNames(persons: any[]): string[] {
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
  static validateImportStructure(data: any[]): { isValid: boolean; errors: string[] } {
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
    const hasValidData = data.some(person => !this.isEmptyTemplate(person));
    
    if (!hasValidData) {
      errors.push('Il file non contiene righe con dati validi');
      return { isValid: false, errors };
    }

    return { isValid: true, errors };
  }
}