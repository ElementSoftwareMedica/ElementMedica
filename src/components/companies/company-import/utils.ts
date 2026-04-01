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
  // Gestisce anche stringa vuota '' → rimossa dal payload (evita errori Prisma BooleanField)
  if (formattedCompany.isActive !== undefined) {
    if (formattedCompany.isActive === '' || formattedCompany.isActive === null) {
      delete formattedCompany.isActive;
    } else {
      const activeValue = String(formattedCompany.isActive).toLowerCase();
      formattedCompany.isActive = ['true', '1', 'sì', 'si', 'yes'].includes(activeValue);
    }
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
    const conflictInfo = { ...company } as CompanyImportData & { _isExisting?: boolean; _existingId?: string; _isDuplicateSite?: boolean; _isNewSite?: boolean; _isNewCompanyWithSite?: boolean };

    // Cerca aziende esistenti con stessa P.IVA o Codice Fiscale (supporta sia chiavi italiane che alias inglesi)
    const existingCompany = existingCompanies.find((existing: any) =>
      (company.piva && (existing.piva === company.piva || existing.vatNumber === company.piva)) ||
      (company.codiceFiscale && (existing.codiceFiscale === company.codiceFiscale || existing.taxCode === company.codiceFiscale))
    ) as any;

    if (existingCompany) {
      conflictInfo._isExisting = true;
      conflictInfo._existingId = existingCompany.id as string;

      // Verifica se è una nuova sede per un'azienda esistente (solo match su siteName)
      if ((company.siteName || company.siteIndirizzo)) {
        if (Array.isArray((existingCompany as any).sites)) {
          const sites = (existingCompany as any).sites as Array<{ name?: string; address?: string; siteName?: string; siteIndirizzo?: string; indirizzo?: string }>
          const normalize = (v: unknown): string | undefined => (typeof v === 'string' ? v.trim().toLowerCase() : undefined)
          const companySiteName = normalize(company.siteName)
          const existingSite = sites?.find((site) =>
            normalize(site.name) === companySiteName ||
            normalize(site.siteName) === companySiteName
          )

          if (companySiteName && existingSite) {
            conflictInfo._isDuplicateSite = true
          } else {
            // Se non c'è match sul nome sede, trattiamo come nuova sede
            conflictInfo._isNewSite = true
          }
        } else {
          // Nessuna lista siti disponibile: se arrivano dati sede, trattala come nuova sede
          conflictInfo._isNewSite = true
        }
      }
    } else if (company.siteName || company.siteIndirizzo) {
      conflictInfo._isNewCompanyWithSite = true;
    }

    return conflictInfo;
  });
};

// Funzione per convertire i dati per l'API (allineata ai campi attesi dal backend)
export const convertToApiFormat = (company: CompanyImportData): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    // Campi Company (globali)
    ragioneSociale: company.ragioneSociale,
    codiceAteco: company.codiceAteco,
    piva: company.piva,
    codiceFiscale: company.codiceFiscale,
    sdi: company.sdi,
    formaGiuridica: company.formaGiuridica,
    sedeLegaleIndirizzo: company.sedeLegaleIndirizzo,
    sedeLegaleCitta: company.sedeLegaleCitta,
    sedeLegaleCap: company.sedeLegaleCap,
    sedeLegaleProvincia: company.sedeLegaleProvincia,
    sedeLegaleNazione: company.sedeLegaleNazione,
    settore: company.settore,
    dimensione: company.dimensione,
    pecFatturazione: company.pecFatturazione,

    // Campi CompanyTenantProfile (per-tenant)
    pec: company.pec,
    iban: company.iban,
    isActive: company.isActive,
    note: company.note,
    referenteRuolo: company.referenteRuolo,
    dataInizioRapporto: company.dataInizioRapporto,
    dataFineRapporto: company.dataFineRapporto,
    tipoContratto: company.tipoContratto,
    numeroContratto: company.numeroContratto,
    scontoPercentuale: company.scontoPercentuale,
    terminiPagamento: company.terminiPagamento,
    modalitaPagamento: company.modalitaPagamento,
    noteCommerciali: company.noteCommerciali,
    noteOperative: company.noteOperative,
  };

  // Campi CompanySite se presenti
  const hasSite = !!(
    company.siteName || company.siteIndirizzo || company.siteCitta || company.siteProvincia || company.siteCap ||
    company.sitePersonaRiferimento || company.siteTelefono || company.siteMail
  );

  if (hasSite) {
    payload.siteName = company.siteName || company.siteCitta; // fallback: usa città come nome sede
    payload.siteIndirizzo = company.siteIndirizzo as string | undefined;
    payload.siteCitta = company.siteCitta as string | undefined;
    payload.siteProvincia = company.siteProvincia as string | undefined;
    payload.siteCap = company.siteCap as string | undefined;
    payload.sitePersonaRiferimento = (company.sitePersonaRiferimento || company.personaRiferimento) as string | undefined;
    payload.siteTelefono = (company.siteTelefono || company.telefono) as string | undefined;
    payload.siteMail = (company.siteMail || company.mail) as string | undefined;

    // Campi extra sede (safety: pass-through)
    payload.dvr = company.dvr;
    payload.rsppId = company.rsppId;
    payload.medicoCompetenteId = company.medicoCompetenteId;
    payload.ultimoSopralluogo = company.ultimoSopralluogo;
    payload.prossimoSopralluogo = company.prossimoSopralluogo;
    payload.valutazioneSopralluogo = company.valutazioneSopralluogo;
    payload.sopralluogoEseguitoDa = company.sopralluogoEseguitoDa;
    payload.ultimoSopralluogoRSPP = company.ultimoSopralluogoRSPP;
    payload.prossimoSopralluogoRSPP = company.prossimoSopralluogoRSPP;
    payload.noteSopralluogoRSPP = company.noteSopralluogoRSPP;
    payload.ultimoSopralluogoMedico = company.ultimoSopralluogoMedico;
    payload.prossimoSopralluogoMedico = company.prossimoSopralluogoMedico;
    payload.noteSopralluogoMedico = company.noteSopralluogoMedico;
  }

  return payload;
};