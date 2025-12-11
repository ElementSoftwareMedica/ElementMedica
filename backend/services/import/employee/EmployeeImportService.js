/**
 * @file EmployeeImportService.js
 * @description Service layer per import dipendenti da CSV
 * Gestisce validazione CF, bulk company assignment, conflict resolution
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
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

const prisma = new PrismaClient();

/**
 * Converte data italiana dd/mm/yyyy in oggetto Date
 * @param {string} dateStr - Data in formato dd/mm/yyyy o yyyy-mm-dd
 * @returns {Date|null} - Oggetto Date o null se invalida
 */
function parseItalianDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  
  // Formato italiano: dd/mm/yyyy
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31 || month < 0 || month > 11) return null;
    
    const date = new Date(year, month, day);
    
    // Verifica che la data sia valida (es. 31/02 non esiste)
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
      return null;
    }
    
    return date;
  }
  
  // Formato ISO: yyyy-mm-dd
  if (trimmed.includes('-')) {
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Tentativo generico
  const date = new Date(trimmed);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Ottiene birthDate valida da employee data
 * @param {object} employee - Dati employee
 * @returns {Date|null} - Data valida o null
 */
function getValidBirthDate(employee) {
  if (!employee.birthDate) return null;
  const parsed = parseItalianDate(employee.birthDate);
  if (!parsed) {
    logger.warn(`[EMPLOYEE_IMPORT] Invalid birthDate for ${employee.taxCode}: ${employee.birthDate}`);
    return null;
  }
  return parsed;
}

/**
 * Ottiene il siteId principale per un'azienda
 * Se l'azienda ha una sola sede, la ritorna automaticamente
 * @param {string} companyId - ID azienda
 * @returns {Promise<string|null>} - ID sede principale o null
 */
async function getDefaultSiteId(companyId) {
  if (!companyId) return null;
  
  try {
    const sites = await prisma.companySite.findMany({
      where: { 
        companyId,
        deletedAt: null 
      },
      orderBy: { createdAt: 'asc' }
    });
    
    // Se una sola sede, assegnala automaticamente
    if (sites.length === 1) {
      logger.info(`[EMPLOYEE_IMPORT] Auto-assigning site ${sites[0].id} (only one available for company ${companyId})`);
      return sites[0].id;
    }
    
    // Se più sedi, non assegnare automaticamente (richiede selezione manuale)
    if (sites.length > 1) {
      logger.warn(`[EMPLOYEE_IMPORT] Company ${companyId} has ${sites.length} sites - manual assignment required`);
    }
    
    return null;
  } catch (error) {
    logger.error(`[EMPLOYEE_IMPORT] Error fetching sites for company ${companyId}:`, error);
    return null;
  }
}

/**
 * Normalizza stringa in null se vuota (per campi UNIQUE nel DB)
 * @param {string} value - Valore da normalizzare
 * @returns {string|null} - Stringa o null
 */
function normalizeStringOrNull(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Genera username univoco da nome e cognome
 * @param {string} firstName - Nome
 * @param {string} lastName - Cognome
 * @returns {Promise<string>} - Username univoco
 */
async function generateUniqueUsername(firstName, lastName) {
  if (!firstName || !lastName) {
    throw new Error('Nome e cognome richiesti per generare username');
  }

  // Normalizza nome e cognome (rimuovi accenti, caratteri speciali)
  const normalizedFirstName = firstName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuovi accenti
    .replace(/[^a-z]/g, '');
  
  const normalizedLastName = lastName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
  
  // Base username: nome.cognome
  let baseUsername = `${normalizedFirstName}.${normalizedLastName}`;
  let username = baseUsername;
  let counter = 1;

  // Verifica unicità e aggiungi numero se necessario
  while (true) {
    const existingPerson = await prisma.person.findFirst({
      where: { username }
    });

    if (!existingPerson) {
      break;
    }

    username = `${baseUsername}${counter}`;
    counter++;
  }

  logger.info(`[EMPLOYEE_IMPORT] Generated unique username: ${username}`);
  return username;
}

/**
 * Hash password con bcrypt
 * @param {string} password - Password in chiaro
 * @returns {Promise<string>} - Password hashata
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

/**
 * Converte stringa in PascalCase (prima lettera maiuscola, resto minuscolo)
 * @param {string} value - Stringa da convertire
 * @returns {string} - Stringa in PascalCase
 */
function toPascalCase(value) {
  if (!value || typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed.length === 0) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

class EmployeeImportService {
  /**
   * Valida array di dipendenti da CSV
   * @param {Array} employees - Dipendenti da validare
   * @param {string} tenantId - ID tenant
   * @returns {Promise<{valid: boolean, errors: Array, validatedEmployees: Array}>}
   */
  async validateEmployees(employees, tenantId) {
    const errors = [];
    const validatedEmployees = [];

    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      const rowErrors = [];

      // Campi required
      const requiredErrors = validateRequiredFields(
        employee,
        ['firstName', 'lastName', 'taxCode'],
        i
      );
      rowErrors.push(...requiredErrors);

      // Normalizza firstName e lastName in PascalCase
      if (employee.firstName) {
        employee.firstName = toPascalCase(employee.firstName);
      }
      if (employee.lastName) {
        employee.lastName = toPascalCase(employee.lastName);
      }

      // Valida Codice Fiscale
      if (employee.taxCode) {
        const cfValidation = validateTaxCode(employee.taxCode);
        if (!cfValidation.valid) {
          rowErrors.push({
            row: i,
            field: 'taxCode',
            error: cfValidation.error
          });
        } else {
          // Normalizza CF
          employee.taxCode = cfValidation.normalized;
        }
      }

      // Valida Email (se presente)
      if (employee.email) {
        const emailValidation = validateEmail(employee.email);
        if (!emailValidation.valid) {
          rowErrors.push({
            row: i,
            field: 'email',
            error: emailValidation.error
          });
        } else {
          employee.email = normalizeEmail(employee.email);
        }
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validatedEmployees.push(employee);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      validatedEmployees
    };
  }

  /**
   * Rileva duplicati e conflitti
   * @param {Array} employees - Dipendenti da controllare
   * @param {string} tenantId - ID tenant
   * @returns {Promise<{duplicates: Array, conflicts: Map}>}
   */
  async detectDuplicatesAndConflicts(employees, tenantId) {
    // Rileva duplicati interni al CSV
    const duplicates = detectDuplicates(employees, 'taxCode');

    // Carica persone esistenti NON ELIMINATE per il tenant con taxCode
    // Escludi soft-deleted: non devono essere considerati conflitti
    const existingEmployees = await prisma.person.findMany({
      where: {
        tenantId,
        deletedAt: null, // ESCLUDI eliminati - non sono conflitti
        taxCode: {
          in: employees.map(e => e.taxCode).filter(Boolean)
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        taxCode: true,
        email: true,
        phone: true,
        birthDate: true,
        title: true, // Profilo professionale
        hiredDate: true, // Data assunzione
        residenceAddress: true, // Indirizzo
        residenceCity: true, // Città
        province: true, // Provincia
        postalCode: true, // CAP
        companyId: true,
        siteId: true,
        deletedAt: true,
        personRoles: {
          select: {
            roleType: true,
            companyId: true
          }
        }
      }
    });

    // Trova conflitti con DB (basato su taxCode)
    const conflicts = findConflicts(employees, existingEmployees, 'taxCode');

    logger.info('[EMPLOYEE_IMPORT] Conflict detection:', {
      totalEmployees: employees.length,
      existingInDB: existingEmployees.length,
      conflictsFound: conflicts.size,
      sampleExisting: existingEmployees.slice(0, 2).map(e => ({ id: e.id, taxCode: e.taxCode, name: `${e.firstName} ${e.lastName}`, hasEmployeeRole: e.personRoles?.some(r => r.roleType === 'EMPLOYEE') })),
      sampleImporting: employees.slice(0, 2).map(e => ({ taxCode: e.taxCode, name: `${e.firstName} ${e.lastName}` })),
      conflictDetails: Array.from(conflicts.entries()).slice(0, 3).map(([idx, c]) => ({
        index: idx,
        taxCode: c.newItem.taxCode,
        existingId: c.existingItem.id,
        existingHasEmployeeRole: c.existingItem.personRoles?.some(r => r.roleType === 'EMPLOYEE')
      }))
    });

    return { duplicates, conflicts };
  }

  /**
   * Import dipendenti con gestione conflitti e bulk company assignment
   * @param {Array} employees - Dipendenti da importare
   * @param {string} tenantId - ID tenant
   * @param {string} defaultCompanyId - ID azienda da assegnare in bulk (opzionale)
   * @param {Array<string>} overwriteIds - IDs da sovrascrivere
   * @returns {Promise<{success: boolean, created: number, updated: number, skipped: number}>}
   */
  async importEmployees(employees, tenantId, defaultCompanyId = null, overwriteIds = []) {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    try {
      logger.info('[EMPLOYEE_IMPORT] Starting import:', {
        totalEmployees: employees.length,
        defaultCompanyId,
        overwriteIdsCount: overwriteIds.length,
        overwriteIds,
        sampleEmployees: employees.slice(0, 2).map(e => ({ taxCode: e.taxCode, name: `${e.firstName} ${e.lastName}`, companyId: e.companyId }))
      });

      for (const employee of employees) {
        try {
          // Determina companyId e siteId
          const finalCompanyId = defaultCompanyId || employee.companyId;
          const finalSiteId = employee.companySiteId || (finalCompanyId ? await getDefaultSiteId(finalCompanyId) : null);
          
          // Cerca persona esistente per CF (INCLUSI soft-deleted per poterli riattivare)
          const existing = await prisma.person.findFirst({
          where: {
            taxCode: employee.taxCode,
            tenantId
            // NON filtrare deletedAt - vogliamo trovare anche soft-deleted
          }
        });

        if (existing) {
          const wasSoftDeleted = existing.deletedAt !== null;
          logger.info(`[EMPLOYEE_IMPORT] Found existing employee ${existing.id} (${employee.taxCode}), softDeleted: ${wasSoftDeleted}, in overwriteIds: ${overwriteIds.includes(existing.id)}`);
          
          // Se soft-deleted, SEMPRE riattiva (non serve essere in overwriteIds)
          // Se NON soft-deleted, update solo se in overwriteIds
          if (wasSoftDeleted || overwriteIds.includes(existing.id)) {
            // Genera username se non esiste
            let username = existing.username;
            let password = existing.password;
            
            if (!username) {
              username = await generateUniqueUsername(employee.firstName, employee.lastName);
            }
            
            // Genera password solo se non esiste (riattivazione o primo import)
            if (!password) {
              const plainPassword = 'Password123!';
              password = await hashPassword(plainPassword);
              logger.info(`[EMPLOYEE_IMPORT] Generated credentials for ${existing.id} - username: ${username}`);
            }
            
            await prisma.person.update({
              where: { id: existing.id },
              data: {
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: normalizeStringOrNull(employee.email),
                phone: normalizeStringOrNull(employee.phone),
                birthDate: getValidBirthDate(employee),
                title: normalizeStringOrNull(employee.professionalProfile),
                hiredDate: getValidBirthDate({ birthDate: employee.hiringDate }),
                residenceAddress: normalizeStringOrNull(employee.address),
                residenceCity: normalizeStringOrNull(employee.city),
                province: normalizeStringOrNull(employee.province),
                postalCode: normalizeStringOrNull(employee.postalCode),
                companyId: finalCompanyId || existing.companyId,
                siteId: finalSiteId || existing.siteId,
                username,
                password,
                globalRole: 'EMPLOYEE_USER', // Permette accesso limitato per vedere corsi/attestati
                status: 'ACTIVE', // Riattiva se era inactive
                deletedAt: null // Riattiva se era soft-deleted
              }
            });

            // Aggiorna o crea il personRole EMPLOYEE
            let employeeRole = await prisma.personRole.findFirst({
              where: {
                personId: existing.id,
                roleType: 'EMPLOYEE'
              }
            });

            if (!employeeRole) {
              // Crea il personRole se non esiste (caso di persona esistente senza ruolo employee)
              employeeRole = await prisma.personRole.create({
                data: {
                  personId: existing.id,
                  roleType: 'EMPLOYEE',
                  tenantId,
                  companyId: finalCompanyId
                }
              });
              logger.info(`[EMPLOYEE_IMPORT] Created new personRole for existing person ${existing.id}`);
            } else {
              // Aggiorna personRole esistente con la nuova company
              if (finalCompanyId) {
                await prisma.personRole.update({
                  where: { id: employeeRole.id },
                  data: { companyId: finalCompanyId }
                });
                logger.info(`[EMPLOYEE_IMPORT] Updated personRole for ${existing.id}`);
              }
            }

            updated++;
            const action = wasSoftDeleted ? 'Reactivated' : 'Updated';
            logger.info(`[EMPLOYEE_IMPORT] ${action} employee ${existing.id} (${employee.taxCode})`);
          } else {
            skipped++;
            logger.info(`[EMPLOYEE_IMPORT] Skipped employee ${employee.taxCode} (conflict)`);
          }
        } else {
          // Nuova persona: create con ruolo EMPLOYEE
          // Genera username e password
          const username = await generateUniqueUsername(employee.firstName, employee.lastName);
          const plainPassword = 'Password123!';
          const password = await hashPassword(plainPassword);
          
          logger.info(`[EMPLOYEE_IMPORT] Creating new employee ${employee.taxCode}`, {
            taxCode: employee.taxCode,
            name: `${employee.firstName} ${employee.lastName}`,
            username,
            finalCompanyId,
            finalSiteId,
            siteAutoAssigned: !!finalSiteId && !employee.companySiteId
          });
          
          const newPerson = await prisma.person.create({
            data: {
              firstName: employee.firstName,
              lastName: employee.lastName,
              taxCode: employee.taxCode,
              email: normalizeStringOrNull(employee.email),
              phone: normalizeStringOrNull(employee.phone),
              birthDate: getValidBirthDate(employee),
              title: normalizeStringOrNull(employee.professionalProfile),
              hiredDate: getValidBirthDate({ birthDate: employee.hiringDate }),
              residenceAddress: normalizeStringOrNull(employee.address),
              residenceCity: normalizeStringOrNull(employee.city),
              province: normalizeStringOrNull(employee.province),
              postalCode: normalizeStringOrNull(employee.postalCode),
              tenantId,
              companyId: finalCompanyId || null,
              siteId: finalSiteId || null,
              username,
              password,
              globalRole: 'EMPLOYEE_USER', // Permette accesso limitato per vedere corsi/attestati
              status: 'ACTIVE', // Status attivo per nuovi dipendenti
              personRoles: {
                create: {
                  roleType: 'EMPLOYEE',
                  tenantId,
                  companyId: finalCompanyId || null
                }
              }
            }
          });

          created++;
          logger.info(`[EMPLOYEE_IMPORT] Created employee ${newPerson.id} (${employee.taxCode})`);
        }
        } catch (employeeError) {
          // Log errore specifico per questo employee ma continua con gli altri
          logger.error(`[EMPLOYEE_IMPORT] Failed to import employee ${employee.taxCode}:`, {
            error: employeeError.message,
            employee: { taxCode: employee.taxCode, firstName: employee.firstName, lastName: employee.lastName }
          });
          skipped++;
        }
      }

      return {
        success: true,
        created,
        updated,
        skipped,
        message: `Import completato: ${created} creati, ${updated} aggiornati, ${skipped} saltati`
      };
    } catch (error) {
      logger.error('[EMPLOYEE_IMPORT] Import failed:', error);
      throw new Error(`Errore durante import: ${error.message}`);
    }
  }

  /**
   * Assegna dipendente ad azienda (aggiorna Person.companyId)
   * @param {string} personId - ID persona
   * @param {string} companyId - ID azienda
   * @returns {Promise<void>}
   */
  async assignEmployeeToCompany(personId, companyId) {
    try {
      await prisma.person.update({
        where: { id: personId },
        data: { companyId }
      });
      
      logger.info(`[EMPLOYEE_IMPORT] Assigned person ${personId} to company ${companyId}`);
    } catch (error) {
      logger.error('[EMPLOYEE_IMPORT] Company assignment failed:', error);
      throw error;
    }
  }

  /**
   * Bulk assign: assegna multiple persone ad una company
   * @param {Array<string>} personIds - IDs persone
   * @param {string} companyId - ID azienda
   * @returns {Promise<{assigned: number}>}
   */
  async bulkAssignToCompany(personIds, companyId) {
    try {
      const result = await prisma.person.updateMany({
        where: { id: { in: personIds } },
        data: { companyId }
      });

      const assigned = result.count;
      logger.info(`[EMPLOYEE_IMPORT] Bulk assigned ${assigned} employees to company ${companyId}`);
      return { success: true, assigned };
    } catch (error) {
      logger.error('[EMPLOYEE_IMPORT] Bulk assignment failed:', error);
      throw new Error(`Errore bulk assignment: ${error.message}`);
    }
  }
}

export default new EmployeeImportService();
