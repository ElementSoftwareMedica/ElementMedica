import { safeStorage } from 'electron'

/**
 * GDPR Field-Level Encryption using Electron's safeStorage API.
 * Uses OS-level keychain/credential store (Keychain on macOS, DPAPI on Windows).
 *
 * Only PII fields are encrypted — structural/ID fields remain in plaintext for queries.
 */

// PII columns that MUST be encrypted at-rest per GDPR
export const PII_FIELDS: Record<string, Set<string>> = {
  patients: new Set(['firstName', 'lastName', 'taxCode', 'email', 'phone', 'birthDate', 'birthPlace', 'birthProvince', 'residenceAddress', 'residenceCity', 'postalCode', 'province', 'title', 'profileImage', 'gdprConsentDate', 'companyName']),
  companies: new Set(['ragioneSociale', 'piva', 'codiceFiscale', 'sedeLegaleIndirizzo', 'sedeLegaleCitta', 'sedeLegaleCap', 'sedeLegaleProvincia', 'pec', 'emailGenerale', 'telefonoGenerale', 'noteCommerciali', 'noteOperative', 'noteInterne', 'medicoCompetenteNome', 'rsppNome', 'medicoSuccessoreNome']),
  company_sites: new Set(['siteName', 'indirizzo', 'citta', 'cap', 'provincia', 'dvr']),
  nomine_ruolo: new Set(['firstName', 'lastName', 'nome', 'taxCode', 'note']),
  appointments: new Set(['note', 'noteInterne', 'personFirstName', 'personLastName', 'personTaxCode', 'medicoFirstName', 'medicoLastName', 'companyName']),
  appointment_prestazioni: new Set(['note']),
  visits: new Set(['motivoVisita', 'anamnesi', 'esameObiettivo', 'diagnosi', 'terapia', 'noteInterne', 'notePazienti', 'datiStrutturati', 'spiReadings', 'firmaMedico', 'firmaPaziente', 'firmaTimestamp', 'personFirstName', 'personLastName', 'personTaxCode', 'medicoFirstName', 'medicoLastName', 'medicoRefertanteFirstName', 'medicoRefertanteLastName', 'companyName']),
  giudizi_idoneita: new Set(['limitazioni', 'prescrizioni', 'note', 'firmaMedico']),
  scadenze: new Set(['personFirstName', 'personLastName', 'prestazioneNome', 'mansione', 'companyName']),
  esami_strumentali: new Set(['risultato', 'valori', 'note']),
  allegati: new Set(['nome', 'localPath', 'serverUrl']),
  documenti_compilati: new Set(['datiCompilati', 'firmaPaziente', 'firmaMedico', 'firmaDipendente', 'firmaFormatore', 'firmaDatore', 'note']),
  questionari_risposte: new Set(['valoreTesto', 'valoreJson', 'noteValidazione']),
  mansione_rischi: new Set(['descrizioneEsposizione', 'misurePrevenzioneDPI', 'fonteRischio']),
  lavoratore_rischi_aggiuntivi: new Set(['descrizioneEsposizione', 'fonteRischio', 'note']),
  profili_salute: new Set(['fumatore', 'alcol', 'attivitaFisica', 'allergieFarmaci', 'farmaci', 'altrePatologie', 'noteSalute', 'dpiPersonali', 'dpiAzienda', 'mezziAziendali', 'patenteCategorie', 'tipoInvalidita', 'alimentazione', 'statoCivile', 'professione', 'qualitaSonno', 'tipoDiabete', 'sorveglianzaSanitaria', 'storicoOccupazionale', 'corsiFormazioneDpi', 'esposizioniLavorative', 'vaccinazioni', 'abilitazioniMezzi', 'dpiConsegne']),
  documenti_clinici: new Set(['titolo', 'descrizione', 'fileName', 'fileUrl']),
  person_documents: new Set(['titolo', 'descrizione', 'fileName', 'fileUrl', 'hashFile']),
  referti: new Set(['contenuto', 'conclusioni', 'allegati', 'hashFirma']),
  firme_digitali: new Set(['hashDocumento', 'hashFirma', 'firmaImageUrl', 'note']),
  medici: new Set(['firstName', 'lastName', 'taxCode', 'email', 'phone']),
  slot_disponibilita: new Set(['motivoBlocco', 'note']),
  document_templates: new Set(['contenutoHtml', 'contenutoPdf', 'campi']),
  questionari_medici_config: new Set(['istruzioniPaziente', 'istruzioniMedico', 'scoringConfig', 'validazioniCustom']),
  sopralluoghi: new Set(['valutazione', 'esito', 'note', 'documentoUrl', 'documentoNome']),
  dvr: new Set(['rischiRilevati', 'note', 'documentoUrl', 'documentoNome']),
  consulenze_mdl: new Set(['oggetto', 'note'])
}

const ENCRYPTION_PREFIX = 'enc::' // Prefix to identify encrypted values

export function isPiiField(table: string, column: string): boolean {
  return PII_FIELDS[table]?.has(column) ?? false
}

export function encryptValue(value: string): string {
  if (!value || typeof value !== 'string' || value.startsWith(ENCRYPTION_PREFIX)) {
    return value
  }

  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[GDPR] safeStorage non disponibile — campo PII salvato in chiaro')
    return value
  }

  const encrypted = safeStorage.encryptString(value)
  return ENCRYPTION_PREFIX + encrypted.toString('base64')
}

export function decryptValue(value: string): string {
  if (!value || typeof value !== 'string' || !value.startsWith(ENCRYPTION_PREFIX)) {
    return value
  }

  if (!safeStorage.isEncryptionAvailable()) {
    return value // Impossibile decifrare senza OS keychain — restituisce il blob crittografato
  }

  try {
    const buffer = Buffer.from(value.slice(ENCRYPTION_PREFIX.length), 'base64')
    return safeStorage.decryptString(buffer)
  } catch (e) {
    console.error('[crypto] Decifratura fallita:', e)
    return value // Restituisce il blob crittografato in caso di errore
  }
}

/**
 * Encrypt PII fields in a record before writing to SQLite.
 */
export function encryptRecord(table: string, record: Record<string, unknown>): Record<string, unknown> {
  const piiFields = PII_FIELDS[table]
  if (!piiFields) return record

  const encrypted = { ...record }
  for (const field of piiFields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encryptValue(encrypted[field] as string)
    }
  }
  return encrypted
}

/**
 * Decrypt PII fields in a record after reading from SQLite.
 */
export function decryptRecord(table: string, record: Record<string, unknown>): Record<string, unknown> {
  const piiFields = PII_FIELDS[table]
  if (!piiFields) return record

  const decrypted = { ...record }
  for (const field of piiFields) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      decrypted[field] = decryptValue(decrypted[field] as string)
    }
  }
  return decrypted
}
