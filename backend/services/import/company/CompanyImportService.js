/**
 * @file CompanyImportService.js
 * @description Service layer per import aziende da CSV
 * Gestisce validazione, duplicate detection, conflict resolution
 */

import { PrismaClient } from '@prisma/client';
import logger from '../../../utils/logger.js';
import { 
  validateVATNumber,
  detectDuplicates,
  findConflicts,
  formatValidationErrors,
  validateRequiredFields
} from '../../../utils/import/importValidation.js';

const prisma = new PrismaClient();

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

    // Carica aziende esistenti per il tenant
    const existingCompanies = await prisma.company.findMany({
      where: { tenantId },
      select: {
        id: true,
        ragioneSociale: true,
        piva: true,
        mail: true,
        telefono: true,
        sedeAzienda: true,
        citta: true,
        provincia: true,
        cap: true,
        sites: {
          select: {
            id: true,
            siteName: true,
            indirizzo: true,
            citta: true
          }
        }
      }
    });

    // Trova conflitti con DB (vatNumber nei CSV, piva nel DB)
    const conflicts = findConflicts(companies, existingCompanies, 'vatNumber', 'piva');

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
        // Cerca azienda esistente per P.IVA
        const existing = await prisma.company.findFirst({
          where: {
            piva: company.vatNumber,
            tenantId
          }
        });

        if (existing) {
          // Conflitto: update solo se in overwriteIds
          if (overwriteIds.includes(existing.id)) {
            await prisma.company.update({
              where: { id: existing.id },
              data: {
                ragioneSociale: company.ragioneSociale || company.businessName,
                mail: company.email || existing.mail,
                telefono: company.phone || existing.telefono,
                sedeAzienda: company.address || existing.sedeAzienda,
                citta: company.city || existing.citta,
                provincia: company.province || existing.provincia,
                cap: company.postalCode || existing.cap
              }
            });
            updated++;
            logger.info(`[COMPANY_IMPORT] Updated company ${existing.id} (${company.vatNumber})`);
          } else {
            skipped++;
            logger.info(`[COMPANY_IMPORT] Skipped company ${company.vatNumber} (conflict)`);
          }
        } else {
          // Nuova azienda: create
          const data = {
            ragioneSociale: company.ragioneSociale || company.businessName,
            piva: company.vatNumber,
            tenantId
          };
          
          // Aggiungi campi opzionali solo se definiti
          if (company.email) data.mail = company.email;
          if (company.phone) data.telefono = company.phone;
          if (company.address) data.sedeAzienda = company.address;
          if (company.city) data.citta = company.city;
          if (company.province) data.provincia = company.province;
          if (company.postalCode) data.cap = company.postalCode;
          
          const newCompany = await prisma.company.create({ data });
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
   * @param {string} companyId - ID azienda
   * @param {Object} siteData - Dati sede
   * @returns {Promise<Object>}
   */
  async createCompanySite(companyId, siteData, tenantId) {
    try {
      const site = await prisma.companySite.create({
        data: {
          siteName: siteData.name,
          indirizzo: siteData.address,
          citta: siteData.city,
          provincia: siteData.province,
          cap: siteData.postalCode,
          companyId,
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
