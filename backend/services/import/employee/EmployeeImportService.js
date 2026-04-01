/**
 * @file EmployeeImportService.js
 * @description Service layer per import dipendenti da CSV
 * Gestisce validazione CF, bulk company assignment, conflict resolution
 */

import prisma from '../../../config/prisma-optimization.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import logger from '../../../utils/logger.js';
import MansioneService from '../../clinical/MansioneService.js';
import { extractBirthPlaceFromTaxCode, extractGenderFromTaxCode } from '../../../utils/codiceFiscale.js';
import {
  validateTaxCode,
  validateEmail,
  normalizeEmail,
  detectDuplicates,
  findConflicts,
  formatValidationErrors,
  validateRequiredFields
} from '../../../utils/import/importValidation.js';


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
 * P48: Ottiene il siteId principale per un CompanyTenantProfile
 * Se l'azienda ha una sola sede, la ritorna automaticamente
 * @param {string} companyTenantProfileId - ID CompanyTenantProfile
 * @returns {Promise<string|null>} - ID sede principale o null
 */
async function getDefaultSiteIdByProfile(companyTenantProfileId) {
  if (!companyTenantProfileId) return null;

  try {
    const sites = await prisma.companySite.findMany({
      where: {
        companyTenantProfileId,
        deletedAt: null
      },
      orderBy: { createdAt: 'asc' }
    });

    // Se una sola sede, assegnala automaticamente
    if (sites.length === 1) {
      logger.info(`[EMPLOYEE_IMPORT] Auto-assigning site ${sites[0].id} (only one available for companyTenantProfile ${companyTenantProfileId})`);
      return sites[0].id;
    }

    // Se più sedi, non assegnare automaticamente (richiede selezione manuale)
    if (sites.length > 1) {
      logger.warn(`[EMPLOYEE_IMPORT] CompanyTenantProfile ${companyTenantProfileId} has ${sites.length} sites - manual assignment required`);
    }

    return null;
  } catch (error) {
    logger.error(`[EMPLOYEE_IMPORT] Error fetching sites for companyTenantProfile ${companyTenantProfileId}:`, error);
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
 * Risolve birthPlace e birthProvince da dati CSV o, in fallback, dal codice fiscale
 * @param {object} employee - Dati employee
 * @returns {{ birthPlace: string|null, birthProvince: string|null }}
 */
function resolveBirthPlaceFields(employee) {
  const birthPlace = normalizeStringOrNull(employee.birthPlace);
  const birthProvince = normalizeStringOrNull(employee.birthProvince);
  if (birthPlace && birthProvince) return { birthPlace, birthProvince };
  if (employee.taxCode) {
    const info = extractBirthPlaceFromTaxCode(employee.taxCode);
    if (info) {
      return {
        birthPlace: birthPlace || info.comune,
        birthProvince: birthProvince || info.provincia
      };
    }
  }
  return { birthPlace, birthProvince };
}

/**
 * Risolve il sesso da dati CSV o, in fallback, dal codice fiscale
 * @param {object} employee - Dati employee
 * @returns {string|null}
 */
function resolveGenderField(employee) {
  const gender = normalizeStringOrNull(employee.gender);
  if (gender) return gender;
  if (employee.taxCode) {
    return extractGenderFromTaxCode(employee.taxCode) || null;
  }
  return null;
}

/**
 * Risolve repartoId da nome reparto + siteId + tenantId (uso interno import)
 * @param {string|undefined} repartoNome - Nome del reparto
 * @param {string|null} siteId - ID sede operativa
 * @param {string} tenantId
 * @returns {Promise<string|null>} - ID reparto o null
 */
async function resolveRepartoId(repartoNome, siteId, tenantId) {
  if (!repartoNome || !siteId) return null;
  try {
    const reparto = await prisma.reparto.findFirst({
      where: { nome: { equals: repartoNome.trim(), mode: 'insensitive' }, siteId, tenantId, deletedAt: null }
    });
    if (!reparto) {
      logger.warn(`[EMPLOYEE_IMPORT] Reparto '${repartoNome}' non trovato per site ${siteId} nel tenant ${tenantId} - skipped`);
      return null;
    }
    return reparto.id;
  } catch (error) {
    logger.error(`[EMPLOYEE_IMPORT] Error resolving reparto '${repartoNome}':`, error);
    return null;
  }
}

/**
 * Assegna mansione a un lavoratore tramite codice mansione (uso interno import)
 * @param {string} personId
 * @param {string} mansioneCodice
 * @param {string} tenantId
 */
async function assignMansioneByCode(personId, mansioneCodice, tenantId) {
  if (!mansioneCodice) return;
  try {
    const mansione = await prisma.mansione.findFirst({
      where: { codice: mansioneCodice.trim(), tenantId, deletedAt: null }
    });
    if (!mansione) {
      logger.warn(`[EMPLOYEE_IMPORT] Mansione codice '${mansioneCodice}' non trovata nel tenant ${tenantId} - skipped`);
      return;
    }
    // Verifica assegnazione esistente
    const existing = await prisma.lavoratoreMansione.findFirst({
      where: { personId, mansioneId: mansione.id, tenantId, isAttiva: true, deletedAt: null }
    });
    if (existing) {
      logger.info(`[EMPLOYEE_IMPORT] Mansione '${mansioneCodice}' già assegnata a ${personId} - skipped`);
      return;
    }
    await MansioneService.assignToWorker(personId, mansione.id, { isPrimaria: true, dataInizio: new Date() }, tenantId);
    logger.info(`[EMPLOYEE_IMPORT] Mansione '${mansioneCodice}' assegnata a ${personId}`);
  } catch (err) {
    logger.warn(`[EMPLOYEE_IMPORT] Errore assegnazione mansione '${mansioneCodice}' a ${personId}: ${err.message}`);
  }
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

  // Base username: nome.cognome — max 47 chars to leave room for numeric suffix (VarChar(50))
  const MAX_BASE = 47;
  const rawBase = `${normalizedFirstName}.${normalizedLastName}`;
  let baseUsername = rawBase.length > MAX_BASE ? rawBase.substring(0, MAX_BASE) : rawBase;
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

    const suffix = `${counter}`;
    username = `${baseUsername.substring(0, 50 - suffix.length)}${suffix}`;
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
   * P48: Cerca Person globalmente e verifica esistenza PersonTenantProfile per questo tenant
   * @param {Array} employees - Dipendenti da controllare
   * @param {string} tenantId - ID tenant
   * @returns {Promise<{duplicates: Array, conflicts: Map}>}
   */
  async detectDuplicatesAndConflicts(employees, tenantId) {
    // Rileva duplicati interni al CSV
    const duplicates = detectDuplicates(employees, 'taxCode');

    // P48: Person è globale - cerca per taxCode senza tenantId
    // Poi verifica se ha un profilo attivo in questo tenant
    const taxCodes = employees.map(e => e.taxCode).filter(Boolean);

    const existingPersons = await prisma.person.findMany({
      where: {
        deletedAt: null,
        taxCode: { in: taxCodes }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        taxCode: true,
        birthDate: true,
        deletedAt: true,
        // P48: Include tenant profiles per verificare esistenza nel tenant
        tenantProfiles: {
          where: { tenantId, deletedAt: null },
          select: {
            id: true,
            email: true,
            phone: true,
            title: true,
            hiredDate: true,
            residenceAddress: true,
            residenceCity: true,
            province: true,
            postalCode: true,
            companyTenantProfileId: true,
            siteId: true,
            status: true
          }
        },
        personRoles: {
          where: { tenantId },
          select: {
            roleType: true,
            companyTenantProfileId: true
          }
        }
      }
    });

    // Filtra solo persone che hanno un profilo in questo tenant (conflitti reali)
    const existingEmployees = existingPersons
      .filter(p => p.tenantProfiles.length > 0)
      .map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        taxCode: p.taxCode,
        birthDate: p.birthDate,
        deletedAt: p.deletedAt,
        // Flatten tenant profile data for backward compat
        email: p.tenantProfiles[0]?.email,
        phone: p.tenantProfiles[0]?.phone,
        title: p.tenantProfiles[0]?.title,
        hiredDate: p.tenantProfiles[0]?.hiredDate,
        residenceAddress: p.tenantProfiles[0]?.residenceAddress,
        residenceCity: p.tenantProfiles[0]?.residenceCity,
        province: p.tenantProfiles[0]?.province,
        postalCode: p.tenantProfiles[0]?.postalCode,
        companyTenantProfileId: p.tenantProfiles[0]?.companyTenantProfileId,
        siteId: p.tenantProfiles[0]?.siteId,
        personRoles: p.personRoles
      }));

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
   * P48: Person è globale, dati tenant-specifici in PersonTenantProfile
   * @param {Array} employees - Dipendenti da importare
   * @param {string} tenantId - ID tenant
   * @param {string} defaultCompanyTenantProfileId - ID CompanyTenantProfile da assegnare in bulk (opzionale)
   * @param {Array<string>} overwriteIds - IDs da sovrascrivere
   * @returns {Promise<{success: boolean, created: number, updated: number, skipped: number}}
   */
  async importEmployees(employees, tenantId, defaultCompanyTenantProfileId = null, overwriteIds = []) {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];
    const warnings = [];

    try {
      logger.info('[EMPLOYEE_IMPORT] Starting import:', {
        totalEmployees: employees.length,
        defaultCompanyTenantProfileId,
        overwriteIdsCount: overwriteIds.length,
        overwriteIds,
        sampleEmployees: employees.slice(0, 2).map(e => ({ taxCode: e.taxCode, name: `${e.firstName} ${e.lastName}`, companyTenantProfileId: e.companyTenantProfileId }))
      });

      for (const employee of employees) {
        try {
          // P48: Determina companyTenantProfileId — risolvi employee.companyId (global Company.id) se necessario
          let finalCompanyTenantProfileId = defaultCompanyTenantProfileId || employee.companyTenantProfileId || null;
          if (!finalCompanyTenantProfileId && employee.companyId) {
            // employee.companyId potrebbe essere un Company.id globale o un CompanyTenantProfile.id
            // Prova prima come CompanyTenantProfile.id
            const profileById = await prisma.companyTenantProfile.findFirst({
              where: { id: employee.companyId, tenantId, deletedAt: null }
            });
            if (profileById) {
              finalCompanyTenantProfileId = profileById.id;
            } else {
              // Risolvi Company.id → CompanyTenantProfile.id per questo tenant
              const profileByCompany = await prisma.companyTenantProfile.findFirst({
                where: { companyId: employee.companyId, tenantId, deletedAt: null }
              });
              if (profileByCompany) {
                finalCompanyTenantProfileId = profileByCompany.id;
              } else {
                logger.warn(`[EMPLOYEE_IMPORT] CompanyTenantProfile non trovato per companyId ${employee.companyId} nel tenant ${tenantId} — campo ignorato`, {
                  taxCode: employee.taxCode
                });
              }
            }
          }
          // Valida che finalCompanyTenantProfileId esista effettivamente
          if (finalCompanyTenantProfileId) {
            const profileExists = await prisma.companyTenantProfile.findFirst({
              where: { id: finalCompanyTenantProfileId, tenantId, deletedAt: null }
            });
            if (!profileExists) {
              logger.warn(`[EMPLOYEE_IMPORT] CompanyTenantProfile ${finalCompanyTenantProfileId} non trovato nel tenant ${tenantId} — campo ignorato`, {
                taxCode: employee.taxCode
              });
              finalCompanyTenantProfileId = null;
            }
          }
          const finalSiteId = employee.companySiteId || (finalCompanyTenantProfileId ? await getDefaultSiteIdByProfile(finalCompanyTenantProfileId) : null);
          const finalRepartoId = await resolveRepartoId(employee.repartoNome, finalSiteId, tenantId);

          // P48: Cerca persona esistente per CF - Person è GLOBALE, senza tenantId
          const existing = await prisma.person.findFirst({
            where: {
              taxCode: employee.taxCode
              // NON filtrare deletedAt - vogliamo trovare anche soft-deleted
            },
            include: {
              tenantProfiles: {
                where: { tenantId },
                take: 1
              }
            }
          });

          if (existing) {
            const wasSoftDeleted = existing.deletedAt !== null;
            const hasProfileInTenant = existing.tenantProfiles.length > 0;
            const existingProfile = existing.tenantProfiles[0];

            const isCrossTenantEmployee = !wasSoftDeleted && !hasProfileInTenant;
            logger.info(`[EMPLOYEE_IMPORT] Found existing person ${existing.id} (${employee.taxCode}), softDeleted: ${wasSoftDeleted}, hasProfileInTenant: ${hasProfileInTenant}, isCrossTenant: ${isCrossTenantEmployee}, in overwriteIds: ${overwriteIds.includes(existing.id)}`);

            // Se soft-deleted, SEMPRE riattiva (non serve essere in overwriteIds)
            // Se NON soft-deleted e ha profilo nel tenant, update solo se in overwriteIds
            // Se cross-tenant (esiste in altro tenant ma non nel corrente), importa automaticamente
            if (wasSoftDeleted || !hasProfileInTenant || overwriteIds.includes(existing.id)) {
              // Genera username se non esiste
              let username = existing.username;
              let password = existing.password;

              if (!username) {
                username = await generateUniqueUsername(employee.firstName, employee.lastName);
              }

              // Genera password solo se non esiste (riattivazione o primo import)
              if (!password) {
                // DEFAULT_TEMP_PASSWORD obbligatorio — nessun fallback hardcoded
                const plainPassword = process.env.DEFAULT_TEMP_PASSWORD;
                if (!plainPassword) throw new Error('[CONFIG] DEFAULT_TEMP_PASSWORD env var is required');
                password = await hashPassword(plainPassword);
                logger.info(`[EMPLOYEE_IMPORT] Generated credentials for ${existing.id} - username: ${username}`);
              }

              // P48: Separa dati globali (Person) da dati tenant-specifici (PersonTenantProfile)
              await prisma.person.update({
                where: { id: existing.id },
                data: {
                  firstName: employee.firstName,
                  lastName: employee.lastName,
                  birthDate: getValidBirthDate(employee),
                  ...resolveBirthPlaceFields(employee),
                  gender: resolveGenderField(employee),
                  vatNumber: normalizeStringOrNull(employee.vatNumber),
                  username,
                  password,
                  mustChangePassword: true,
                  deletedAt: null // Riattiva se era soft-deleted
                }
              });

              // P48: Aggiorna o crea PersonTenantProfile per dati tenant-specifici
              // existingProfile già caricato sopra tramite include

              const profileData = {
                email: normalizeStringOrNull(employee.email),
                phone: normalizeStringOrNull(employee.phone),
                title: normalizeStringOrNull(employee.professionalProfile),
                hiredDate: getValidBirthDate({ birthDate: employee.hiringDate }),
                residenceAddress: normalizeStringOrNull(employee.address),
                residenceCity: normalizeStringOrNull(employee.city),
                province: normalizeStringOrNull(employee.province),
                postalCode: normalizeStringOrNull(employee.postalCode),
                companyTenantProfileId: finalCompanyTenantProfileId || existingProfile?.companyTenantProfileId || null,
                siteId: finalSiteId || existingProfile?.siteId || null,
                repartoId: finalRepartoId || existingProfile?.repartoId || null,
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
                  data: {
                    personId: existing.id,
                    tenantId,
                    ...profileData,
                    isPrimary: true
                  }
                });
              }

              // Aggiorna o crea il personRole EMPLOYEE
              let employeeRole = await prisma.personRole.findFirst({
                where: {
                  personId: existing.id,
                  roleType: 'EMPLOYEE',
                  tenantId,
                  isActive: true,
                  deletedAt: null
                }
              });

              if (!employeeRole) {
                // Crea il personRole se non esiste (caso di persona esistente senza ruolo employee)
                employeeRole = await prisma.personRole.create({
                  data: {
                    personId: existing.id,
                    roleType: 'EMPLOYEE',
                    tenantId,
                    companyTenantProfileId: finalCompanyTenantProfileId
                  }
                });
                logger.info(`[EMPLOYEE_IMPORT] Created new personRole for existing person ${existing.id}`);
              } else {
                // Aggiorna personRole esistente con la nuova company
                if (finalCompanyTenantProfileId) {
                  await prisma.personRole.update({
                    where: { id: employeeRole.id },
                    data: { companyTenantProfileId: finalCompanyTenantProfileId }
                  });
                  logger.info(`[EMPLOYEE_IMPORT] Updated personRole for ${existing.id}`);
                }
              }

              updated++;
              const action = wasSoftDeleted ? 'Reactivated' : (isCrossTenantEmployee ? 'CrossTenant' : 'Updated');
              logger.info(`[EMPLOYEE_IMPORT] ${action} employee ${existing.id} (${employee.taxCode})`);

              if (isCrossTenantEmployee) {
                warnings.push({
                  taxCode: employee.taxCode,
                  name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
                  warning: `Dipendente "${employee.firstName} ${employee.lastName}" (CF ${employee.taxCode}) esistente in altro tenant — importato nel tenant corrente`
                });
              }
              // Assegna mansione se specificata nel CSV
              await assignMansioneByCode(existing.id, employee.mansioneCodice, tenantId);
            } else {
              skipped++;
              logger.info(`[EMPLOYEE_IMPORT] Skipped employee ${employee.taxCode} (conflict)`);
            }
          } else {
            // Nuova persona: create con ruolo EMPLOYEE
            // Genera username e password
            const username = await generateUniqueUsername(employee.firstName, employee.lastName);
            // DEFAULT_TEMP_PASSWORD obbligatorio — nessun fallback hardcoded
            const plainPassword = process.env.DEFAULT_TEMP_PASSWORD;
            if (!plainPassword) throw new Error('[CONFIG] DEFAULT_TEMP_PASSWORD env var is required');
            const password = await hashPassword(plainPassword);

            logger.info(`[EMPLOYEE_IMPORT] Creating new employee ${employee.taxCode}`, {
              taxCode: employee.taxCode,
              name: `${employee.firstName} ${employee.lastName}`,
              username,
              finalCompanyTenantProfileId,
              finalSiteId,
              siteAutoAssigned: !!finalSiteId && !employee.companySiteId
            });

            // P48: Crea Person con dati globali e PersonTenantProfile per dati tenant-specifici
            const newPerson = await prisma.person.create({
              data: {
                firstName: employee.firstName,
                lastName: employee.lastName,
                taxCode: employee.taxCode,
                birthDate: getValidBirthDate(employee),
                ...resolveBirthPlaceFields(employee),
                gender: resolveGenderField(employee),
                vatNumber: normalizeStringOrNull(employee.vatNumber),
                username,
                password,
                mustChangePassword: true,
                // P48: Crea PersonTenantProfile per dati tenant-specifici
                tenantProfiles: {
                  create: {
                    tenantId,
                    email: normalizeStringOrNull(employee.email),
                    phone: normalizeStringOrNull(employee.phone),
                    title: normalizeStringOrNull(employee.professionalProfile),
                    hiredDate: getValidBirthDate({ birthDate: employee.hiringDate }),
                    residenceAddress: normalizeStringOrNull(employee.address),
                    residenceCity: normalizeStringOrNull(employee.city),
                    province: normalizeStringOrNull(employee.province),
                    postalCode: normalizeStringOrNull(employee.postalCode),
                    companyTenantProfileId: finalCompanyTenantProfileId || null,
                    siteId: finalSiteId || null,
                    repartoId: finalRepartoId || null,
                    status: 'ACTIVE',
                    isPrimary: true,
                    isActive: true
                  }
                },
                personRoles: {
                  create: {
                    roleType: 'EMPLOYEE',
                    tenantId,
                    companyTenantProfileId: finalCompanyTenantProfileId || null
                  }
                }
              }
            });

            created++;
            logger.info(`[EMPLOYEE_IMPORT] Created employee ${newPerson.id} (${employee.taxCode})`);

            // Assegna mansione se specificata nel CSV
            await assignMansioneByCode(newPerson.id, employee.mansioneCodice, tenantId);
          }
        } catch (employeeError) {
          // Log errore specifico per questo employee ma continua con gli altri
          logger.error(`[EMPLOYEE_IMPORT] Failed to import employee ${employee.taxCode}:`, {
            error: employeeError.message,
            employee: { taxCode: employee.taxCode, firstName: employee.firstName, lastName: employee.lastName }
          });
          // Genera messaggio user-friendly per errori FK
          let userMessage = 'Errore durante l\'importazione';
          if (employeeError.message?.includes('Foreign key constraint violated')) {
            if (employeeError.message.includes('companyTenantProfileId')) {
              userMessage = 'Azienda assegnata non trovata nel tenant corrente';
            } else if (employeeError.message.includes('siteId')) {
              userMessage = 'Sede assegnata non trovata nel tenant corrente';
            } else if (employeeError.message.includes('repartoId')) {
              userMessage = 'Reparto assegnato non trovato nel tenant corrente';
            } else {
              userMessage = 'Riferimento ad un\'entità non trovata nel sistema';
            }
          }
          errors.push({
            taxCode: employee.taxCode,
            name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
            error: userMessage
          });
          skipped++;
        }
      }

      return {
        success: created > 0 || updated > 0,
        created,
        updated,
        skipped,
        errors,
        warnings,
        message: `Import completato: ${created} creati, ${updated} aggiornati, ${skipped} saltati${errors.length > 0 ? `, ${errors.length} errori` : ''}`
      };
    } catch (error) {
      logger.error('[EMPLOYEE_IMPORT] Import failed:', error);
      throw new Error(`Errore durante import: ${error.message}`);
    }
  }

  /**
   * Assegna dipendente ad azienda (P48: aggiorna PersonTenantProfile.companyTenantProfileId)
   * @param {string} personId - ID persona
   * @param {string} companyTenantProfileId - ID profilo azienda nel tenant
   * @param {string} tenantId - ID tenant
   * @returns {Promise<void>}
   */
  async assignEmployeeToCompany(personId, companyTenantProfileId, tenantId) {
    try {
      // P48: Person è globale, aggiorniamo PersonTenantProfile
      await prisma.personTenantProfile.updateMany({
        where: {
          personId,
          tenantId,
          deletedAt: null
        },
        data: { companyTenantProfileId }
      });

      logger.info(`[EMPLOYEE_IMPORT] Assigned person ${personId} to companyTenantProfile ${companyTenantProfileId} in tenant ${tenantId}`);
    } catch (error) {
      logger.error('[EMPLOYEE_IMPORT] Company assignment failed:', error);
      throw error;
    }
  }

  /**
   * Bulk assign: assegna multiple persone ad una company (P48 pattern)
   * @param {Array<string>} personIds - IDs persone
   * @param {string} companyTenantProfileId - ID profilo azienda nel tenant
   * @param {string} tenantId - ID tenant
   * @returns {Promise<{assigned: number}>}
   */
  async bulkAssignToCompany(personIds, companyTenantProfileId, tenantId) {
    try {
      // P48: Person è globale, aggiorniamo PersonTenantProfile per ogni persona
      const result = await prisma.personTenantProfile.updateMany({
        where: {
          personId: { in: personIds },
          tenantId,
          deletedAt: null
        },
        data: { companyTenantProfileId }
      });

      const assigned = result.count;
      logger.info(`[EMPLOYEE_IMPORT] Bulk assigned ${assigned} employees to companyTenantProfile ${companyTenantProfileId} in tenant ${tenantId}`);
      return { success: true, assigned };
    } catch (error) {
      logger.error('[EMPLOYEE_IMPORT] Bulk assignment failed:', error);
      throw new Error(`Errore bulk assignment: ${error.message}`);
    }
  }
}

export default new EmployeeImportService();
