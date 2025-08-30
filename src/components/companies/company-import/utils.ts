import { titleCaseFields } from './constants';
import { applyTitleCaseToFields } from '../../../utils/textFormatters';
import { Company } from '../../../types';

// Tipo esteso per l'importazione che include campi aggiuntivi
type CompanyImportData = Partial<Company> & Record<string, unknown>;

// Validazione personalizzata per le aziende
export const validateCompany = (company: CompanyImportData): string[] => {
  const errors: string[] = [];
  
  if (!company.ragioneSociale) {
    errors.push('Ragione Sociale obbligatoria');
  } else if (company.ragioneSociale.length > 250) {
    errors.push('Ragione Sociale troppo lunga (max 250 caratteri)');
  }
  
  // Verifica che ci sia almeno uno tra P.IVA e Codice Fiscale
  if (!company.piva && !company.codiceFiscale) {
    errors.push('P.IVA o Codice Fiscale obbligatori');
  }
  
  // Verifica della P.IVA (se presente)
  if (company.piva) {
    if (company.piva.length < 8 || company.piva.length > 13) {
      errors.push('P.IVA non valida (deve essere tra 8 e 13 caratteri)');
    }
    
    // Verifica che contenga solo numeri
    if (!/^\d+$/.test(company.piva)) {
      errors.push('P.IVA deve contenere solo numeri');
    }
  }
  
  // Verifica del Codice Fiscale SOLO se non c'è una P.IVA valida
  if (!company.piva && company.codiceFiscale) {
    // Se il codice fiscale è per un'azienda (11 caratteri) o una persona (16 caratteri)
    if (company.codiceFiscale.length !== 16 && company.codiceFiscale.length !== 11) {
      errors.push('Codice Fiscale non valido (deve essere 16 caratteri per persone fisiche o 11 per aziende)');
    }
  }
  
  // Verifica campi che potrebbero causare errori 500
  if (company.sdi && company.sdi.length > 7) {
    errors.push('Codice SDI troppo lungo (max 7 caratteri)');
  }
  
  if (company.pec && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.pec)) {
    errors.push('Formato PEC non valido');
  }
  
  if (company.mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.mail)) {
    errors.push('Formato Mail non valido');
  }
  
  if (company.telefono && !/^[\d\s+\-().]+$/.test(company.telefono)) {
    errors.push('Formato Telefono non valido (sono consentiti solo numeri, spazi e caratteri +-(). )');
  }
  
  // Validazione domini
  if (company.domain && !/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(company.domain)) {
    errors.push('Formato Dominio non valido');
  }
  
  // Validazione slug
  if (company.slug && !/^[a-z0-9-]+$/.test(company.slug)) {
    errors.push('Slug deve contenere solo lettere minuscole, numeri e trattini');
  }
  
  // Validazione date
  const dateFields = ['ultimoSopralluogo', 'prossimoSopralluogo', 'ultimoSopralluogoRSPP', 'prossimoSopralluogoRSPP', 'ultimoSopralluogoMedico', 'prossimoSopralluogoMedico'];
  dateFields.forEach(field => {
    const fieldValue = company[field];
    if (fieldValue && typeof fieldValue === 'string' && isNaN(Date.parse(fieldValue))) {
      errors.push(`Formato data non valido per ${field}`);
    }
  });
  
  // Validazione boolean
  if (company.isActive && !['true', 'false', '1', '0', 'sì', 'no', 'si', 'yes', 'no'].includes(String(company.isActive).toLowerCase())) {
    errors.push('Campo Attivo deve essere true/false, 1/0, sì/no, yes/no');
  }
  
  // Verifica lunghezza eccessiva per campi comuni - ALLINEATI AL TEMPLATE
  const maxLengthFields: [string, number][] = [
    ['sedeAzienda', 250],
    ['citta', 100],
    ['provincia', 50],
    ['cap', 10],
    ['personaRiferimento', 100],
    ['note', 1000],
    ['siteName', 100],
    ['indirizzo', 250],
    ['dvr', 100],
    ['valutazioneSopralluogo', 500],
    ['sopralluogoEseguitoDa', 100],
    ['noteSopralluogoRSPP', 500],
    ['noteSopralluogoMedico', 500],
    ['slug', 100],
    ['domain', 100],
    ['subscriptionPlan', 50],
    ['codiceAteco', 20],
    ['iban', 34],
    ['pec', 100],
    ['sdi', 7]
  ];
  
  maxLengthFields.forEach(([field, maxLength]) => {
    const value = company[field as keyof CompanyImportData];
    if (value && typeof value === 'string' && value.length > maxLength) {
      errors.push(`Il campo ${field} è troppo lungo (max ${maxLength} caratteri)`);
    }
  });
  
  return errors;
};

// Funzione per formattare i dati dell'azienda
export const formatCompanyData = (company: CompanyImportData): CompanyImportData => {
  // Applica il Title Case ai campi specificati
  const formattedCompany = applyTitleCaseToFields(company, titleCaseFields);
  
  // Conversioni specifiche per i campi booleani
  if (formattedCompany.isActive) {
    const activeValue = String(formattedCompany.isActive).toLowerCase();
    formattedCompany.isActive = ['true', '1', 'sì', 'si', 'yes'].includes(activeValue);
  }
  
  // Normalizza i campi numerici
  if (formattedCompany.piva && typeof formattedCompany.piva === 'string') {
    formattedCompany.piva = formattedCompany.piva.replace(/\D/g, ''); // Rimuovi caratteri non numerici
  }
  
  if (formattedCompany.codiceFiscale && typeof formattedCompany.codiceFiscale === 'string') {
    formattedCompany.codiceFiscale = formattedCompany.codiceFiscale.toUpperCase().replace(/\s/g, '');
  }
  
  // Normalizza le email
  if (formattedCompany.mail && typeof formattedCompany.mail === 'string') {
    formattedCompany.mail = formattedCompany.mail.toLowerCase().trim();
  }
  
  if (formattedCompany.pec && typeof formattedCompany.pec === 'string') {
    formattedCompany.pec = formattedCompany.pec.toLowerCase().trim();
  }
  
  return formattedCompany;
};

// Funzione per rilevare conflitti e duplicati
export const detectConflicts = (companies: CompanyImportData[], existingCompanies: CompanyImportData[] = []): CompanyImportData[] => {
  return companies.map((company) => {
    const conflictInfo = { ...company };
    
    // Cerca aziende esistenti con stesso P.IVA o Codice Fiscale
    const existingCompany = existingCompanies.find(existing => 
      (company.piva && existing.vatNumber === company.piva) ||
      (company.codiceFiscale && existing.taxCode === company.codiceFiscale)
    );
    
    if (existingCompany) {
      conflictInfo._isExisting = true;
      conflictInfo._existingId = existingCompany.id;
      
      // Verifica se è una nuova sede per un'azienda esistente
      if (company.siteName || company.siteIndirizzo) {
        // Assumiamo che existingCompany possa avere sites come array di oggetti
        const sites = (existingCompany as unknown as { sites?: Array<{ name?: string; address?: string }> }).sites;
        const existingSite = sites?.find((site) => 
          site.name === company.siteName || 
          site.address === company.siteIndirizzo
        );
        
        if (existingSite) {
          conflictInfo._isDuplicateSite = true;
        } else {
          conflictInfo._isNewSite = true;
        }
      }
    } else if (company.siteName || company.siteIndirizzo) {
      conflictInfo._isNewCompanyWithSite = true;
    }
    
    return conflictInfo;
  });
};

// Funzione per convertire i dati per l'API
export const convertToApiFormat = (company: CompanyImportData): Record<string, unknown> => {
  return {
    name: company.ragioneSociale,
    atecoCode: company.codiceAteco,
    vatNumber: company.piva,
    taxCode: company.codiceFiscale,
    sdi: company.sdi,
    pec: company.pec,
    iban: company.iban,
    address: company.sedeAzienda,
    city: company.citta,
    province: company.provincia,
    postalCode: company.cap,
    email: company.mail,
    phone: company.telefono,
    contactPerson: company.personaRiferimento,
    notes: company.note,
    slug: company.slug,
    domain: company.domain,
    settings: company.settings,
    subscriptionPlan: company.subscriptionPlan,
    isActive: company.isActive,
    // Dati della sede se presenti
    ...(company.siteName ? {
      sites: [{
        name: company.siteName,
        address: company.siteIndirizzo,
        city: company.siteCitta,
        province: company.siteProvincia,
        postalCode: company.siteCap,
        contactPerson: company.sitePersonaRiferimento,
        phone: company.siteTelefono,
        email: company.siteMail,
        dvr: company.dvr,
        rsppId: company.rsppId,
        medicoCompetenteId: company.medicoCompetenteId,
        ultimoSopralluogo: company.ultimoSopralluogo,
        prossimoSopralluogo: company.prossimoSopralluogo,
        valutazioneSopralluogo: company.valutazioneSopralluogo,
        sopralluogoEseguitoDa: company.sopralluogoEseguitoDa,
        ultimoSopralluogoRSPP: company.ultimoSopralluogoRSPP,
        prossimoSopralluogoRSPP: company.prossimoSopralluogoRSPP,
        noteSopralluogoRSPP: company.noteSopralluogoRSPP,
        ultimoSopralluogoMedico: company.ultimoSopralluogoMedico,
        prossimoSopralluogoMedico: company.prossimoSopralluogoMedico,
        noteSopralluogoMedico: company.noteSopralluogoMedico
      }]
    } : {})
  };
};