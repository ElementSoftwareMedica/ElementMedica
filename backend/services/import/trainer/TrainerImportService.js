/**
 * @file TrainerImportService.js
 * @description Service layer per import formatori da CSV
 * Gestisce validazione, conflict resolution, e creazione automatica account
 */

import { PrismaClient } from '@prisma/client';
import logger from '../../../utils/logger.js';
import {
  validateTaxCode,
  validateEmail,
  normalizeEmail,
  detectDuplicates,
  findConflicts,
  formatValidationErrors,
  validateRequiredFields
} from '../../../utils/import/importValidation.js';
import TrainerAccountService from './TrainerAccountService.js';

const prisma = new PrismaClient();

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

      // Campi required
      const requiredErrors = validateRequiredFields(
        trainer,
        ['firstName', 'lastName', 'taxCode', 'email'],
        i
      );
      rowErrors.push(...requiredErrors);

      // Valida Codice Fiscale
      if (trainer.taxCode) {
        const cfValidation = validateTaxCode(trainer.taxCode);
        if (!cfValidation.valid) {
          rowErrors.push({
            row: i,
            field: 'taxCode',
            error: cfValidation.error
          });
        } else {
          trainer.taxCode = cfValidation.normalized;
        }
      }

      // Valida Email (required per trainers - serve per account)
      if (trainer.email) {
        const emailValidation = validateEmail(trainer.email);
        if (!emailValidation.valid) {
          rowErrors.push({
            row: i,
            field: 'email',
            error: emailValidation.error
          });
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

    return {
      valid: errors.length === 0,
      errors,
      validatedTrainers
    };
  }

  /**
   * Rileva duplicati e conflitti
   * @param {Array} trainers - Formatori da controllare
   * @param {string} tenantId - ID tenant
   * @returns {Promise<{duplicates: Array, conflicts: Map}>}
   */
  async detectDuplicatesAndConflicts(trainers, tenantId) {
    // Rileva duplicati interni al CSV (sia per CF che email)
    const duplicatesCF = detectDuplicates(trainers, 'taxCode');
    const duplicatesEmail = detectDuplicates(trainers, 'email');

    // Carica formatori esistenti per il tenant
    const existingTrainers = await prisma.person.findMany({
      where: {
        tenantId,
        personRoles: {
          some: {
            roleType: 'TRAINER'
          }
        }
      },
      select: {
        id: true,
        taxCode: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true
      }
    });

    // Trova conflitti con DB (basato su taxCode)
    const conflicts = findConflicts(trainers, existingTrainers, 'taxCode');

    return {
      duplicates: [...duplicatesCF, ...duplicatesEmail],
      conflicts
    };
  }

  /**
   * Import formatori con creazione automatica account
   * @param {Array} trainers - Formatori da importare
   * @param {string} tenantId - ID tenant
   * @param {Array<string>} overwriteIds - IDs da sovrascrivere
   * @param {boolean} createAccounts - Se true, crea account User automaticamente
   * @returns {Promise<{success: boolean, created: number, updated: number, skipped: number, credentials: Array}>}
   */
  async importTrainers(trainers, tenantId, overwriteIds = [], createAccounts = true) {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const credentials = [];

    try {
      for (const trainer of trainers) {
        // Cerca persona esistente per CF
        const existing = await prisma.person.findFirst({
          where: {
            taxCode: trainer.taxCode,
            tenantId
          }
        });

        if (existing) {
          // Conflitto: update solo se in overwriteIds
          if (overwriteIds.includes(existing.id)) {
            await prisma.person.update({
              where: { id: existing.id },
              data: {
                firstName: trainer.firstName,
                lastName: trainer.lastName,
                email: trainer.email || existing.email,
                phone: trainer.phone || existing.phone,
                birthDate: trainer.birthDate ? new Date(trainer.birthDate) : existing.birthDate,
                birthPlace: trainer.birthPlace || existing.birthPlace
              }
            });

            // Crea account se non esiste e createAccounts=true
            if (createAccounts && !existing.username) {
              const account = await TrainerAccountService.createTrainerAccount(
                existing.id,
                trainer.email,
                trainer.firstName,
                trainer.lastName,
                tenantId
              );

              credentials.push({
                personId: existing.id,
                firstName: trainer.firstName,
                lastName: trainer.lastName,
                email: trainer.email,
                username: account.username,
                password: account.password
              });
            }

            updated++;
            logger.info(`[TRAINER_IMPORT] Updated trainer ${existing.id} (${trainer.taxCode})`);
          } else {
            skipped++;
            logger.info(`[TRAINER_IMPORT] Skipped trainer ${trainer.taxCode} (conflict)`);
          }
        } else {
          // Nuova persona: create con ruolo TRAINER
          const newPerson = await prisma.person.create({
            data: {
              firstName: trainer.firstName,
              lastName: trainer.lastName,
              taxCode: trainer.taxCode,
              email: trainer.email,
              phone: trainer.phone,
              birthDate: trainer.birthDate ? new Date(trainer.birthDate) : null,
              birthPlace: trainer.birthPlace,
              tenantId,
              personRoles: {
                create: {
                  roleType: 'TRAINER',
                  tenantId
                }
              }
            }
          });

          // Crea account User se richiesto
          if (createAccounts) {
            const account = await TrainerAccountService.createTrainerAccount(
              newPerson.id,
              trainer.email,
              trainer.firstName,
              trainer.lastName,
              tenantId
            );

            credentials.push({
              personId: newPerson.id,
              firstName: trainer.firstName,
              lastName: trainer.lastName,
              email: trainer.email,
              username: account.username,
              password: account.password
            });
          }

          created++;
          logger.info(`[TRAINER_IMPORT] Created trainer ${newPerson.id} (${trainer.taxCode})`);
        }
      }

      return {
        success: true,
        created,
        updated,
        skipped,
        credentials, // Array con username/password per ogni nuovo trainer
        message: `Import completato: ${created} creati, ${updated} aggiornati, ${skipped} saltati. ${credentials.length} account creati.`
      };
    } catch (error) {
      logger.error('[TRAINER_IMPORT] Import failed:', error);
      throw new Error(`Errore durante import: ${error.message}`);
    }
  }

  /**
   * Genera CSV con credenziali per download
   * @param {Array} credentials - Array di credenziali
   * @returns {string}
   */
  generateCredentialsCSV(credentials) {
    return TrainerAccountService.generateCredentialsCSV(credentials);
  }
}

export default new TrainerImportService();
