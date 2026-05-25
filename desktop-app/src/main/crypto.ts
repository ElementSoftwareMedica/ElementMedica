import { safeStorage } from 'electron'

/**
 * GDPR Field-Level Encryption using Electron's safeStorage API.
 * Uses OS-level keychain/credential store (Keychain on macOS, DPAPI on Windows).
 *
 * Only PII fields are encrypted — structural/ID fields remain in plaintext for queries.
 */

// PII columns that MUST be encrypted at-rest per GDPR
const PII_FIELDS: Record<string, Set<string>> = {
  patients: new Set(['firstName', 'lastName', 'taxCode', 'email', 'phone', 'birthDate', 'birthPlace', 'residenceAddress', 'residenceCity', 'postalCode', 'province']),
  companies: new Set(['pec', 'emailGenerale', 'telefonoGenerale', 'noteCommerciali', 'noteOperative', 'noteInterne']),
  visits: new Set(['anamnesi', 'esameObiettivo', 'diagnosi', 'terapia', 'noteInterne', 'notePazienti', 'firmaMedico', 'firmaPaziente']),
  giudizi_idoneita: new Set(['limitazioni', 'prescrizioni', 'note', 'firmaMedico']),
  esami_strumentali: new Set(['risultato', 'valori', 'note']),
  questionari_compilati: new Set(['risposte'])
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
