// Mappatura degli header CSV ai campi del database - COMPLETA E SENZA DUPLICATI
export const csvHeaderMap: Record<string, string> = {
  // === CAMPI COMPANY (tutti i campi dello schema Prisma) ===
  'Ragione Sociale': 'ragioneSociale',
  'Codice ATECO': 'codiceAteco',
  'P.IVA': 'piva',
  'Codice Fiscale': 'codiceFiscale',
  'SDI': 'sdi',
  'PEC': 'pec',
  'IBAN': 'iban',
  'Sede Azienda': 'sedeAzienda',
  'Città': 'citta',
  'Provincia': 'provincia',
  'CAP': 'cap',
  'Mail': 'mail',
  'Telefono': 'telefono',
  'Persona Riferimento': 'personaRiferimento',
  'Persona di Riferimento': 'personaRiferimento', // Alias per compatibilità
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
  
  // === ALIAS ALTERNATIVI INGLESI (senza duplicati) ===
  'Company Name': 'companyName',
  'ATECO Code': 'atecoCode',
  'VAT Number': 'vatNumber',
  'Tax Code': 'taxCode',
  'Email': 'email',
  'Phone': 'phone',
  'City': 'city',
  'Province': 'province',
  'ZIP': 'zip',
  'Address': 'address',
  'Contact Person': 'contactPerson',
  'Notes': 'notes',
  'Active': 'active',
  
  // === CAMPI SITE SPECIFICI ===
  'Site Name': 'siteName',
  'Site Address': 'siteAddress',
  'Site City': 'siteCity',
  'Site Province': 'siteProvince',
  'Site ZIP': 'siteZip',
  'Site Contact': 'siteContact',
  'Site Phone': 'sitePhone',
  'Site Email': 'siteEmail',
  'DVR Document': 'dvrDocument',
  'Departments': 'departments',
  'Reparti': 'reparti'
};

// Ordine delle colonne per il modal di importazione
export const columnOrder = [
  'ragioneSociale',
  'piva',
  'codiceFiscale',
  'codiceAteco',
  'sedeAzienda',
  'citta',
  'provincia',
  'cap',
  'mail',
  'telefono',
  'personaRiferimento',
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
  'citta',
  'provincia',
  'personaRiferimento',
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
  'sedeAzienda': 'address',
  'citta': 'city',
  'provincia': 'province',
  'cap': 'postalCode',
  'mail': 'email',
  'telefono': 'phone',
  'personaRiferimento': 'contactPerson',
  'note': 'notes',
  'slug': 'slug',
  'domain': 'domain',
  'settings': 'settings',
  'subscriptionPlan': 'subscriptionPlan',
  'isActive': 'isActive'
};