/**
 * @file TrainerImportService.js
 * @description Service layer per import formatori da CSV
 * Gestisce validazione, conflict resolution, e creazione automatica account
 * P48/P63: Person è globale (NO tenantId/email/phone su Person),
 * dati tenant-specifici in PersonTenantProfile.
 */

import prisma from '../../../config/prisma-optimization.js';
import bcrypt from 'bcrypt';
import logger from '../../../utils/logger.js';
import { extractBirthPlaceFromTaxCode, extractGenderFromTaxCode } from '../../../utils/codiceFiscale.js';
import {
  validateTaxCode,
  validateEmail,
  normalizeEmail,
  detectDuplicates,
  findConflicts,
  validateRequiredFields
} from '../../../utils/import/importValidation.js';


/**
 * Normalizza stringa in null se vuota (per campi UNIQUE nel DB)
 */
function normalizeStringOrNull(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Risolve birthPlace e birthProvince da dati CSV o, in fallback, dal codice fiscale
 */
function resolveBirthPlaceFields(trainer, existing = null) {
  const birthPlace = normalizeStringOrNull(trainer.birthPlace);
  const birthProvince = normalizeStringOrNull(trainer.birthProvince);
  if (birthPlace && birthProvince) return { birthPlace, birthProvince };
  if (trainer.taxCode) {
    const info = extractBirthPlaceFromTaxCode(trainer.taxCode);
    if (info) {
      return {
        birthPlace: birthPlace || info.comune || existing?.birthPlace || null,
        birthProvince: birthProvince || info.provincia || existing?.birthProvince || null
      };
    }
  }
  return {
    birthPlace: birthPlace || existing?.birthPlace || null,
    birthProvince: birthProvince || existing?.birthProvince || null
  };
}

/**
 * Risolve il sesso da dati CSV o, in fallback, dal codice fiscale
 */
function resolveGenderField(trainer, existing = null) {
  const gender = normalizeStringOrNull(trainer.gender);
  if (gender) return gender;
  if (trainer.taxCode) {
    const extracted = extractGenderFromTaxCode(trainer.taxCode);
    if (extracted) return extracted;
  }
  return existing?.gender || null;
}

/**
 * Genera username univoco da nome e cognome
 * P63: Person.username è globale, cerca senza tenantId
 */
async function generateUniqueUsername(firstName, lastName) {
  if (!firstName || !lastName) {
    throw new Error('Nome e cognome richiesti per generare username');
  }
  const normalizedFirst = firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  const normalizedLast = lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  // Max 47 chars base to leave room for numeric suffix (VarChar(50))
  const MAX_BASE = 47;
  const rawBase = `${normalizedFirst}.${normalizedLast}`;
  const base = rawBase.length > MAX_BASE ? rawBase.substring(0, MAX_BASE) : rawBase;
  let username = base;
  let counter = 1;
  while (true) {
    const exists = await prisma.person.findFirst({ where: { username } });
    if (!exists) break;
    const suffix = `${counter}`;
    username = `${base.substring(0, 50 - suffix.length)}${suffix}`;
    counter++;
  }
  return username;
}

/**
 * Converte data italiana dd/mm/yyyy o ISO in Date o null
 */
function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    const d = new Date(year, month, day);
    if (d.getDate() !== day || d.getMonth() !== month || d.getFullYear() !== year) return null;
    return d;
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

class TrainerImportService {
  /**
   * Valida array di formatori da CSV
   * @param {Array} trainers - Formatori da validare
   * @param {string} tenantId - ID tenant
   * @returns {Promise<{valid: boolean, errors: Array, validatedTrainers: Array}>}
   */
  async validateTrainers(trainers, tenantId) {
    const errors = [];
    const validatedTrainers = [];

    for (let i = 0; i < trainers.length; i++) {
      const trainer = trainers[i];
      const rowErrors = [];

      const requiredErrors = validateRequiredFields(trainer, ['firstName', 'lastName', 'taxCode', 'email'], i);
      rowErrors.push(...requiredErrors);

      if (trainer.taxCode) {
        const cfValidation = validateTaxCode(trainer.taxCode);
        if (!cfValidation.valid) {
          rowErrors.push({ row: i, field: 'taxCode', error: cfValidation.error });
        } else {
          trainer.taxCode = cfValidation.normalized;
        }
      }

      if (trainer.email) {
        const emailValidation = validateEmail(trainer.email);
        if (!emailValidation.valid) {
          rowErrors.push({ row: i, field: 'email', error: emailValidation.error });
        } else {
          trainer.email = normalizeEmail(trainer.email);
        }
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validatedTrainers.push(trainer);
      }
    }

    return { valid: errors.length === 0, errors, validatedTrainers };
  }

  /**
   * Rileva duplicati e conflitti
   * P48/P63: Person è globale - cerca per taxCode SENZA tenantId su Person.
   * Verifica esistenza nel tenant tramite PersonTenantProfile.
   */
  async detectDuplicatesAndConflicts(trainers, tenantId) {
    const duplicatesCF = detectDuplicates(trainers, 'taxCode');
    const duplicatesEmail = detectDuplicates(trainers, 'email');

    const taxCodes = trainers.map(t => t.taxCode).filter(Boolean);

    // P63: Person è globale — NO tenantId su Person
    const existingPersons = await prisma.person.findMany({
      where: { deletedAt: null, taxCode: { in: taxCodes } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        taxCode: true,
        username: true,
        tenantProfiles: {
          where: { tenantId, deletedAt: null },
          select: { id: true, email: true, phone: true }
        },
        personRoles: {
          where: { tenantId },
          select: { roleType: true }
        }
      }
    });

    // Solo persone con profilo attivo in questo tenant sono conflitti reali
    const existingTrainers = existingPersons
      .filter(p => p.tenantProfiles.length > 0)
      .map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        taxCode: p.taxCode,
        email: p.tenantProfiles[0]?.email,
        phone: p.tenantProfiles[0]?.phone,
        username: p.username
      }));

    const conflicts = findConflicts(trainers, existingTrainers, 'taxCode');

    return { duplicates: [...duplicatesCF, ...duplicatesEmail], conflicts };
  }

  /**
   * Import formatori con creazione automatica account
   * P48/P63: Crea/aggiorna Person (globale) + PersonTenantProfile (tenant-specifico)
   * @param {Array} trainers - Formatori da importare
   * @param {string} tenantId - ID tenant
   * @param {Array<string>} overwriteIds - IDs da sovrascrivere
   * @param {boolean} createAccounts - Se true, crea credenziali automaticamente
   */
  async importTrainers(trainers, tenantId, overwriteIds = [], createAccounts = true) {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const credentials = [];

    try {
      for (const trainer of trainers) {
        try {
          // P63: Cerca Person per taxCode globalmente - NON per tenantId
          const existing = await prisma.person.findFirst({
            where: { taxCode: trainer.taxCode },
            include: {
              tenantProfiles: { where: { tenantId }, take: 1 }
            }
          });

          if (existing) {
            const hasProfileInTenant = existing.tenantProfiles.length > 0;
            const existingProfile = existing.tenantProfiles[0];
            const wasSoftDeleted = existing.deletedAt !== null;

            if (wasSoftDeleted || !hasProfileInTenant || overwriteIds.includes(existing.id)) {
              let username = existing.username;
              let password = existing.password;

              if (!username) {
                username = await generateUniqueUsername(trainer.firstName, trainer.lastName);
              }
              if (!password) {
                const plainPassword = process.env.DEFAULT_TEMP_PASSWORD;
                if (!plainPassword) throw new Error('[CONFIG] DEFAULT_TEMP_PASSWORD env var is required');
                password = await bcrypt.hash(plainPassword, 10);
                if (createAccounts) {
                  credentials.push({
                    personId: existing.id,
                    firstName: trainer.firstName,
                    lastName: trainer.lastName,
                    email: trainer.email,
                    username,
                    password: plainPassword
                  });
                }
              }

              // P63: Aggiorna solo campi globali su Person
              await prisma.person.update({
                where: { id: existing.id },
                data: {
                  firstName: trainer.firstName,
                  lastName: trainer.lastName,
                  birthDate: parseDate(trainer.birthDate) || existing.birthDate,
                  ...resolveBirthPlaceFields(trainer, existing),
                  gender: resolveGenderField(trainer, existing),
                  vatNumber: normalizeStringOrNull(trainer.vatNumber) || existing.vatNumber,
                  username,
                  password,
                  mustChangePassword: true,
                  deletedAt: null
                }
              });

              // P48: Aggiorna o crea PersonTenantProfile per dati tenant-specifici
              const profileData = {
                email: normalizeStringOrNull(trainer.email),
                phone: normalizeStringOrNull(trainer.phone),
                hourlyRate: trainer.hourlyRate ? parseFloat(trainer.hourlyRate) : null,
                iban: normalizeStringOrNull(trainer.iban),
                registerCode: normalizeStringOrNull(trainer.registerCode),
                residenceAddress: normalizeStringOrNull(trainer.residenceAddress),
                residenceCity: normalizeStringOrNull(trainer.city),
                province: normalizeStringOrNull(trainer.province),
                postalCode: normalizeStringOrNull(trainer.postalCode),
                notes: normalizeStringOrNull(trainer.notes),
                status: 'ACTIVE',
                isActive: true,
                deletedAt: null
              };

              if (existingProfile) {
                await prisma.personTenantProfile.update({
                  where: { id: existingProfile.id },
                  data: profileData
                });
              } else {
                await prisma.personTenantProfile.create({
                  data: { personId: existing.id, tenantId, ...profileData, isPrimary: true }
                });
              }

              // Assicura ruolo TRAINER in questo tenant (solo se attivo e non cancellato)
              const trainerRole = await prisma.personRole.findFirst({
                where: { personId: existing.id, roleType: 'TRAINER', tenantId, isActive: true, deletedAt: null }
              });
              if (!trainerRole) {
                await prisma.personRole.create({
                  data: { personId: existing.id, roleType: 'TRAINER', tenantId }
                });
              }

              updated++;
              logger.info(`[TRAINER_IMPORT] Updated trainer ${existing.id} (${trainer.taxCode})`);
            } else {
              skipped++;
              logger.info(`[TRAINER_IMPORT] Skipped trainer ${trainer.taxCode} (conflict, not in overwriteIds)`);
            }
          } else {
            // Nuova persona
            let username, password, plainPassword;
            if (createAccounts) {
              username = await generateUniqueUsername(trainer.firstName, trainer.lastName);
              plainPassword = process.env.DEFAULT_TEMP_PASSWORD;
              if (!plainPassword) throw new Error('[CONFIG] DEFAULT_TEMP_PASSWORD env var is required');
              password = await bcrypt.hash(plainPassword, 10);
            }

            // P48: Crea Person (globale) con PersonTenantProfile + PersonRole nested
            const newPerson = await prisma.person.create({
              data: {
                firstName: trainer.firstName,
                lastName: trainer.lastName,
                taxCode: trainer.taxCode,
                birthDate: parseDate(trainer.birthDate),
                ...resolveBirthPlaceFields(trainer),
                gender: resolveGenderField(trainer),
                vatNumber: normalizeStringOrNull(trainer.vatNumber),
                username: username || null,
                password: password || null,
                mustChangePassword: !!createAccounts,
                // P48: dati tenant-specifici in PersonTenantProfile
                tenantProfiles: {
                  create: {
                    tenantId,
                    email: normalizeStringOrNull(trainer.email),
                    phone: normalizeStringOrNull(trainer.phone),
                    hourlyRate: trainer.hourlyRate ? parseFloat(trainer.hourlyRate) : null,
                    iban: normalizeStringOrNull(trainer.iban),
                    registerCode: normalizeStringOrNull(trainer.registerCode),
                    residenceAddress: normalizeStringOrNull(trainer.residenceAddress),
                    residenceCity: normalizeStringOrNull(trainer.city),
                    province: normalizeStringOrNull(trainer.province),
                    postalCode: normalizeStringOrNull(trainer.postalCode),
                    notes: normalizeStringOrNull(trainer.notes),
                    status: 'ACTIVE',
                    isPrimary: true,
                    isActive: true
                  }
                },
                personRoles: {
                  create: { roleType: 'TRAINER', tenantId }
                }
              }
            });

            if (createAccounts && username) {
              credentials.push({
                personId: newPerson.id,
                firstName: trainer.firstName,
                lastName: trainer.lastName,
                email: trainer.email,
                username,
                password: plainPassword
              });
            }

            created++;
            logger.info(`[TRAINER_IMPORT] Created trainer ${newPerson.id} (${trainer.taxCode})`);
          }
        } catch (trainerError) {
          logger.error(`[TRAINER_IMPORT] Failed to import trainer ${trainer.taxCode}:`, {
            error: trainerError.message,
            trainer: { taxCode: trainer.taxCode, firstName: trainer.firstName, lastName: trainer.lastName }
          });
          skipped++;
        }
      }

      return {
        success: true,
        created,
        updated,
        skipped,
        credentials,
        message: `Import completato: ${created} creati, ${updated} aggiornati, ${skipped} saltati. ${credentials.length} account creati.`
      };
    } catch (error) {
      logger.error('[TRAINER_IMPORT] Import failed:', error);
      throw new Error(`Errore durante import: ${error.message}`);
    }
  }

  /**
   * Genera CSV con credenziali per download
   */
  generateCredentialsCSV(credentials) {
    const header = 'Nome,Cognome,Email,Username,Password';
    const rows = credentials.map(c =>
      `${c.firstName},${c.lastName},${c.email || ''},${c.username},${c.password}`
    );
    return [header, ...rows].join('\n');
  }
}

export default new TrainerImportService();
