// Mappatura degli header CSV ai campi del database - COMPATTA (rimosse colonne legacy sedi)
export const csvHeaderMap: Record<string, string> = {
  // === CAMPI COMPANY (schema Prisma) ===
  'Ragione Sociale': 'ragioneSociale',
  'Codice ATECO': 'codiceAteco',
  'P.IVA': 'piva',
  'Codice Fiscale': 'codiceFiscale',
  'SDI': 'sdi',
  'PEC': 'pec',
  'IBAN': 'iban',
  'Note': 'note',
  'Slug': 'slug',
  'Domain': 'domain',
  'Settings': 'settings',
  'Subscription Plan': 'subscriptionPlan',
  'Is Active': 'isActive',
  
  // === CAMPI COMPANY SITE (tutti i campi dello schema Prisma) ===
  'Nome Sede': 'siteName',
  'Indirizzo Sede': 'siteIndirizzo',
  'Città Sede': 'siteCitta',
  'Provincia Sede': 'siteProvincia',
  'CAP Sede': 'siteCap',
  'Persona Riferimento Sede': 'sitePersonaRiferimento',
  'Telefono Sede': 'siteTelefono',
  'Mail Sede': 'siteMail',
  'DVR': 'dvr',
  'RSPP ID': 'rsppId',
  'Medico Competente ID': 'medicoCompetenteId',
  'Ultimo Sopralluogo': 'ultimoSopralluogo',
  'Prossimo Sopralluogo': 'prossimoSopralluogo',
  'Valutazione Sopralluogo': 'valutazioneSopralluogo',
  'Sopralluogo Eseguito Da': 'sopralluogoEseguitoDa',
  'Ultimo Sopralluogo RSPP': 'ultimoSopralluogoRSPP',
  'Prossimo Sopralluogo RSPP': 'prossimoSopralluogoRSPP',
  'Note Sopralluogo RSPP': 'noteSopralluogoRSPP',
  'Ultimo Sopralluogo Medico': 'ultimoSopralluogoMedico',
  'Prossimo Sopralluogo Medico': 'prossimoSopralluogoMedico',
  'Note Sopralluogo Medico': 'noteSopralluogoMedico',
  
  // === ALIAS INGLESI (mappati ai campi canonici) ===
  'Company Name': 'ragioneSociale',
  'ATECO Code': 'codiceAteco',
  'VAT Number': 'piva',
  'Tax Code': 'codiceFiscale',


  'Notes': 'note'
};

// Ordine delle colonne per il modal di importazione (senza campi site legacy)
export const columnOrder = [
  'ragioneSociale',
  'piva',
  'codiceFiscale',
  'codiceAteco',

  
  'siteName',
  'siteIndirizzo',
  'siteCitta',
  'siteProvincia',
  'siteCap',
  'sitePersonaRiferimento',
  'siteTelefono',
  'siteMail',
  'dvr',
  'reparti',
  'note'
];

// Campi da formattare in title case
export const titleCaseFields = [
  'ragioneSociale',
  'sedeAzienda',

  

  
  'siteName',
  'siteCitta',
  'siteProvincia',
  'sitePersonaRiferimento'
];

// Mappatura dei campi per l'invio all'API
export const apiFieldMap: Record<string, string> = {
  'ragioneSociale': 'name',
  'codiceAteco': 'atecoCode',
  'piva': 'vatNumber',
  'codiceFiscale': 'taxCode',
  'sdi': 'sdi',
  'pec': 'pec',
  'iban': 'iban',


  'note': 'notes',
  'slug': 'slug',
  'domain': 'domain',
  'settings': 'settings',
  'subscriptionPlan': 'subscriptionPlan',
  'isActive': 'isActive'
};