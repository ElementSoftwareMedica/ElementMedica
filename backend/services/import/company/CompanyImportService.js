/**
 * @file CompanyImportService.js
 * @description Service layer per import aziende da CSV
 * Gestisce validazione, duplicate detection, conflict resolution
 */

import prisma from '../../../config/prisma-optimization.js';
import logger from '../../../utils/logger.js';
import {
  validateVATNumber,
  detectDuplicates,
  findConflicts,
  formatValidationErrors,
  validateRequiredFields
} from '../../../utils/import/importValidation.js';


class CompanyImportService {
  /**
   * Valida array di aziende da CSV
   * @param {Array} companies - Aziende da validare
   * @param {string} tenantId - ID tenant
   * @returns {Promise<{valid: boolean, errors: Array, validatedCompanies: Array}>}
   */
  async validateCompanies(companies, tenantId) {
    const errors = [];
    const validatedCompanies = [];

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const rowErrors = [];

      // Normalizza businessName -> ragioneSociale
      if (company.businessName && !company.ragioneSociale) {
        company.ragioneSociale = company.businessName;
      }

      // Campi required
      const requiredErrors = validateRequiredFields(
        company,
        ['ragioneSociale', 'vatNumber'],
        i
      );
      rowErrors.push(...requiredErrors);

      // Valida Partita IVA
      if (company.vatNumber) {
        const pivaValidation = validateVATNumber(company.vatNumber);
        if (!pivaValidation.valid) {
          rowErrors.push({
            row: i,
            field: 'vatNumber',
            error: pivaValidation.error
          });
        } else {
          // Normalizza P.IVA
          company.vatNumber = pivaValidation.normalized;
        }
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validatedCompanies.push(company);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      validatedCompanies
    };
  }

  /**
   * Rileva duplicati e conflitti
   * @param {Array} companies - Aziende da controllare
   * @param {string} tenantId - ID tenant
   * @returns {Promise<{duplicates: Array, conflicts: Map}>}
   */
  async detectDuplicatesAndConflicts(companies, tenantId) {
    // Rileva duplicati interni al CSV
    const duplicates = detectDuplicates(companies, 'vatNumber');

    // P48: Company è globale, filtra via tenantProfiles
    const existingCompanies = await prisma.company.findMany({
      where: {
        deletedAt: null,
        tenantProfiles: {
          some: { tenantId, deletedAt: null }
        }
      },
      select: {
        id: true,
        ragioneSociale: true,
        piva: true,
        tenantProfiles: {
          where: { tenantId, deletedAt: null },
          select: {
            id: true,
            emailGenerale: true,
            telefonoGenerale: true,
            sites: {
              where: { deletedAt: null },
              select: {
                id: true,
                siteName: true,
                indirizzo: true,
                citta: true
              }
            }
          }
        }
      }
    });

    // Flatten per compatibilità con findConflicts
    const flattenedCompanies = existingCompanies.map(c => {
      const profile = c.tenantProfiles[0];
      return {
        id: c.id,
        ragioneSociale: c.ragioneSociale,
        piva: c.piva,
        mail: profile?.emailGenerale || null,
        telefono: profile?.telefonoGenerale || null,
        sites: profile?.sites || []
      };
    });

    // Trova conflitti con DB (vatNumber nei CSV, piva nel DB)
    const conflicts = findConflicts(companies, flattenedCompanies, 'vatNumber', 'piva');

    return { duplicates, conflicts };
  }

  /**
   * Import aziende con gestione conflitti
   * @param {Array} companies - Aziende da importare
   * @param {string} tenantId - ID tenant
   * @param {Array<string>} overwriteIds - IDs da sovrascrivere
   * @returns {Promise<{success: boolean, created: number, updated: number, skipped: number}>}
   */
  async importCompanies(companies, tenantId, overwriteIds = []) {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    try {
      for (const company of companies) {
        // P48: Cerca azienda esistente per P.IVA (Company è globale, filtra via tenantProfiles)
        const existing = await prisma.company.findFirst({
          where: {
            piva: company.vatNumber,
            deletedAt: null,
            tenantProfiles: {
              some: { tenantId, deletedAt: null }
            }
          },
          include: {
            tenantProfiles: {
              where: { tenantId, deletedAt: null },
              take: 1
            }
          }
        });

        if (existing) {
          // Conflitto: update solo se in overwriteIds
          if (overwriteIds.includes(existing.id)) {
            // Aggiorna Company globale (solo campi globali)
            await prisma.company.update({
              where: { id: existing.id },
              data: {
                ragioneSociale: company.ragioneSociale || company.businessName
              }
            });
            // Aggiorna CompanyTenantProfile (campi per-tenant)
            const profile = existing.tenantProfiles[0];
            if (profile) {
              await prisma.companyTenantProfile.update({
                where: { id: profile.id },
                data: {
                  ...(company.email && { emailGenerale: company.email }),
                  ...(company.phone && { telefonoGenerale: company.phone })
                }
              });
            }
            updated++;
            logger.info(`[COMPANY_IMPORT] Updated company ${existing.id} (${company.vatNumber})`);
          } else {
            skipped++;
            logger.info(`[COMPANY_IMPORT] Skipped company ${company.vatNumber} (conflict)`);
          }
        } else {
          // P48: Crea Company globale + CompanyTenantProfile
          const newCompany = await prisma.company.create({
            data: {
              ragioneSociale: company.ragioneSociale || company.businessName,
              piva: company.vatNumber
            }
          });

          await prisma.companyTenantProfile.create({
            data: {
              companyId: newCompany.id,
              tenantId,
              emailGenerale: company.email || null,
              telefonoGenerale: company.phone || null,
              status: 'ACTIVE'
            }
          });

          created++;
          logger.info(`[COMPANY_IMPORT] Created company ${newCompany.id} (${company.vatNumber})`);
        }
      }

      return {
        success: true,
        created,
        updated,
        skipped,
        message: `Import completato: ${created} create, ${updated} aggiornate, ${skipped} saltate`
      };
    } catch (error) {
      logger.error('[COMPANY_IMPORT] Import failed:', error);
      throw new Error(`Errore durante import: ${error.message}`);
    }
  }

  /**
   * Crea nuova sede per un'azienda
   * @param {string} companyId - ID azienda globale
   * @param {Object} siteData - Dati sede
   * @param {string} tenantId - ID tenant
   * @returns {Promise<Object>}
   */
  async createCompanySite(companyId, siteData, tenantId) {
    try {
      // P48: Trova o crea CompanyTenantProfile, poi crea CompanySite con companyTenantProfileId
      let profile = await prisma.companyTenantProfile.findFirst({
        where: { companyId, tenantId, deletedAt: null }
      });

      if (!profile) {
        profile = await prisma.companyTenantProfile.create({
          data: { companyId, tenantId, status: 'ACTIVE' }
        });
      }

      const site = await prisma.companySite.create({
        data: {
          siteName: siteData.name || siteData.siteName,
          indirizzo: siteData.address || siteData.indirizzo || null,
          citta: siteData.city || siteData.citta || null,
          provincia: siteData.province || siteData.provincia || null,
          cap: siteData.postalCode || siteData.cap || null,
          companyTenantProfileId: profile.id,
          tenantId
        }
      });

      logger.info(`[COMPANY_IMPORT] Created site ${site.id} for company ${companyId}`);
      return site;
    } catch (error) {
      logger.error('[COMPANY_IMPORT] Site creation failed:', error);
      throw new Error(`Errore creazione sede: ${error.message}`);
    }
  }
}

export default new CompanyImportService();
