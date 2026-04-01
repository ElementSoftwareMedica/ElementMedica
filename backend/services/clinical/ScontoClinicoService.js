/**
 * Sconto Clinico Service
 * 
 * Business logic for clinical discount codes management using the UNIFIED CodiceSconto model.
 * All clinical discounts use CodiceSconto with applicabileServizi: ['PRESTAZIONE_CLINICA']
 * 
 * Features:
 * - CRUD operations for clinical discount codes
 * - Discount validation and application
 * - Usage tracking and limits
 * 
 * @module services/clinical/ScontoClinicoService
 * @version 2.0.0
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

// TipoServizio enum value for clinical services
const TIPO_SERVIZIO_CLINICO = 'PRESTAZIONE_CLINICA';

// TipoSconto enum values
const TIPO_SCONTO = {
  PERCENTUALE: 'PERCENTUALE',
  VALORE_ASSOLUTO: 'VALORE_ASSOLUTO'
};

/**
 * Convert legacy tipo to TipoSconto enum
 */
const mapTipoToEnum = (tipo) => {
  if (tipo === 'percentuale' || tipo === 'PERCENTUALE') return TIPO_SCONTO.PERCENTUALE;
  if (tipo === 'fisso' || tipo === 'VALORE_ASSOLUTO') return TIPO_SCONTO.VALORE_ASSOLUTO;
  return TIPO_SCONTO.PERCENTUALE;
};

/**
 * Convert TipoSconto enum to legacy tipo for backward compatibility
 */
const mapEnumToTipo = (tipoSconto) => {
  if (tipoSconto === TIPO_SCONTO.PERCENTUALE) return 'percentuale';
  if (tipoSconto === TIPO_SCONTO.VALORE_ASSOLUTO) return 'fisso';
  return 'percentuale';
};

export class ScontoClinicoService {

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  /**
   * Create a new clinical discount code
   * @param {Object} data - Discount code data
   * @param {string} data.codice - Unique code
   * @param {string} data.nome - Display name
   * @param {string} data.descrizione - Description
   * @param {string} data.tipo - Type: 'percentuale' or 'fisso'
   * @param {number} data.valore - Discount value
   * @param {Date} data.dataInizio - Valid from date
   * @param {Date} data.dataFine - Valid to date
   * @param {number} data.utilizzoMassimo - Max usage limit (optional)
   * @param {string[]} data.prestazioniIds - Limited to specific prestazioni (optional)
   * @param {boolean} data.attivo - Is active
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User creating the code
   * @returns {Promise<Object>} Created discount code
   */
  static async create(data, tenantId, userId) {
    try {
      // Check for duplicate code
      const existing = await prisma.codiceSconto.findFirst({
        where: {
          tenantId,
          codice: data.codice.toUpperCase(),
          deletedAt: null,
          applicabileServizi: { has: TIPO_SERVIZIO_CLINICO }
        }
      });

      if (existing) {
        throw new Error('Clinical discount code already exists for this tenant');
      }

      // Validate prestazioni if provided
      if (data.prestazioniIds && data.prestazioniIds.length > 0) {
        const validPrestazioni = await prisma.prestazione.count({
          where: {
            id: { in: data.prestazioniIds },
            tenantId,
            deletedAt: null
          }
        });

        if (validPrestazioni !== data.prestazioniIds.length) {
          throw new Error('One or more prestazioni not found or not accessible');
        }
      }

      // Map tipo to enum
      const tipoSconto = mapTipoToEnum(data.tipo);

      // Validate valore
      if (tipoSconto === TIPO_SCONTO.PERCENTUALE && (data.valore < 0 || data.valore > 100)) {
        throw new Error('Percentage discount must be between 0 and 100');
      }

      if (tipoSconto === TIPO_SCONTO.VALORE_ASSOLUTO && data.valore < 0) {
        throw new Error('Fixed discount cannot be negative');
      }

      const sconto = await prisma.codiceSconto.create({
        data: {
          tenantId,
          codice: data.codice.toUpperCase(),
          nome: data.nome || data.codice.toUpperCase(),
          descrizione: data.descrizione || null,
          tipoSconto,
          valore: data.valore,
          dataInizio: data.dataInizio ? new Date(data.dataInizio) : new Date(),
          dataFine: data.dataFine ? new Date(data.dataFine) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year
          attivo: data.attivo !== undefined ? data.attivo : true,
          utilizzoMassimo: data.utilizzoMassimo || null,
          utilizzoCorrente: 0,
          applicabileServizi: [TIPO_SERVIZIO_CLINICO],
          prestazioniIds: data.prestazioniIds || [],
          createdBy: userId
        }
      });

      logger.info('Clinical discount code created (unified model)', {
        component: 'ScontoClinicoService',
        action: 'create',
        scontoId: sconto.id,
        codice: sconto.codice,
        tipoSconto: sconto.tipoSconto,
        tenantId
      });

      return this._formatResponse(sconto);
    } catch (error) {
      logger.error('Failed to create clinical discount code', {
        component: 'ScontoClinicoService',
        action: 'create',
        error: error.message,
        codice: data.codice,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Get discount code by ID
   */
  static async getById(id, tenantId) {
    try {
      const sconto = await prisma.codiceSconto.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null,
          applicabileServizi: { has: TIPO_SERVIZIO_CLINICO }
        }
      });

      return sconto ? this._formatResponse(sconto) : null;
    } catch (error) {
      logger.error('Failed to get discount code by ID', {
        component: 'ScontoClinicoService',
        action: 'getById',
        error: error.message,
        id,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Get discount code by code string
   */
  static async getByCode(codice, tenantId) {
    try {
      const sconto = await prisma.codiceSconto.findFirst({
        where: {
          codice: codice.toUpperCase(),
          tenantId,
          deletedAt: null,
          applicabileServizi: { has: TIPO_SERVIZIO_CLINICO }
        }
      });

      return sconto ? this._formatResponse(sconto) : null;
    } catch (error) {
      logger.error('Failed to get discount code by code', {
        component: 'ScontoClinicoService',
        action: 'getByCode',
        error: error.message,
        codice,
        tenantId
      });
      throw error;
    }
  }

  /**
   * List all clinical discount codes with pagination
   */
  static async list(tenantId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        attivo,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const where = {
        tenantId,
        deletedAt: null,
        applicabileServizi: { has: TIPO_SERVIZIO_CLINICO }
      };

      if (search) {
        where.OR = [
          { codice: { contains: search, mode: 'insensitive' } },
          { nome: { contains: search, mode: 'insensitive' } },
          { descrizione: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (attivo !== undefined) {
        where.attivo = attivo;
      }

      const [sconti, total] = await Promise.all([
        prisma.codiceSconto.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.codiceSconto.count({ where })
      ]);

      return {
        data: sconti.map(s => this._formatResponse(s)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to list clinical discount codes', {
        component: 'ScontoClinicoService',
        action: 'list',
        error: error.message,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Update discount code
   */
  static async update(id, data, tenantId, userId) {
    try {
      const existing = await prisma.codiceSconto.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null,
          applicabileServizi: { has: TIPO_SERVIZIO_CLINICO }
        }
      });

      if (!existing) {
        throw new Error('Clinical discount code not found');
      }

      // Check for duplicate code if changing
      if (data.codice && data.codice.toUpperCase() !== existing.codice) {
        const duplicate = await prisma.codiceSconto.findFirst({
          where: {
            tenantId,
            codice: data.codice.toUpperCase(),
            deletedAt: null,
            applicabileServizi: { has: TIPO_SERVIZIO_CLINICO },
            id: { not: id }
          }
        });

        if (duplicate) {
          throw new Error('Another clinical discount code with this code already exists');
        }
      }

      // Validate prestazioni if provided
      if (data.prestazioniIds && data.prestazioniIds.length > 0) {
        const validPrestazioni = await prisma.prestazione.count({
          where: {
            id: { in: data.prestazioniIds },
            tenantId,
            deletedAt: null
          }
        });

        if (validPrestazioni !== data.prestazioniIds.length) {
          throw new Error('One or more prestazioni not found');
        }
      }

      const updateData = {};

      if (data.codice) updateData.codice = data.codice.toUpperCase();
      if (data.nome) updateData.nome = data.nome;
      if (data.descrizione !== undefined) updateData.descrizione = data.descrizione;
      if (data.tipo) updateData.tipoSconto = mapTipoToEnum(data.tipo);
      if (data.valore !== undefined) updateData.valore = data.valore;
      if (data.dataInizio) updateData.dataInizio = new Date(data.dataInizio);
      if (data.dataFine) updateData.dataFine = new Date(data.dataFine);
      if (data.attivo !== undefined) updateData.attivo = data.attivo;
      if (data.utilizzoMassimo !== undefined) updateData.utilizzoMassimo = data.utilizzoMassimo;
      if (data.prestazioniIds) updateData.prestazioniIds = data.prestazioniIds;

      const updated = await prisma.codiceSconto.update({
        where: { id },
        data: updateData
      });

      logger.info('Clinical discount code updated', {
        component: 'ScontoClinicoService',
        action: 'update',
        scontoId: id,
        tenantId,
        userId
      });

      return this._formatResponse(updated);
    } catch (error) {
      logger.error('Failed to update clinical discount code', {
        component: 'ScontoClinicoService',
        action: 'update',
        error: error.message,
        id,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Soft delete discount code
   */
  static async delete(id, tenantId, userId) {
    try {
      const existing = await prisma.codiceSconto.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null,
          applicabileServizi: { has: TIPO_SERVIZIO_CLINICO }
        }
      });

      if (!existing) {
        throw new Error('Clinical discount code not found');
      }

      await prisma.codiceSconto.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      logger.info('Clinical discount code deleted', {
        component: 'ScontoClinicoService',
        action: 'delete',
        scontoId: id,
        tenantId,
        userId
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete clinical discount code', {
        component: 'ScontoClinicoService',
        action: 'delete',
        error: error.message,
        id,
        tenantId
      });
      throw error;
    }
  }

  // ============================================
  // VALIDATION & APPLICATION
  // ============================================

  /**
   * Validate a discount code for clinical use
   * @param {string} codice - Discount code
   * @param {string} prestazioneId - Prestazione ID (optional)
   * @param {number} importo - Amount to apply discount to
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Validation result
   */
  static async validateCode(codice, prestazioneId, importo, tenantId) {
    try {
      const now = new Date();

      const sconto = await prisma.codiceSconto.findFirst({
        where: {
          codice: codice.toUpperCase(),
          tenantId,
          deletedAt: null,
          attivo: true,
          applicabileServizi: { has: TIPO_SERVIZIO_CLINICO },
          dataInizio: { lte: now },
          dataFine: { gte: now }
        }
      });

      if (!sconto) {
        return {
          valid: false,
          error: 'Codice sconto non valido o scaduto',
          code: 'INVALID_CODE'
        };
      }

      // Check usage limit
      if (sconto.utilizzoMassimo && sconto.utilizzoCorrente >= sconto.utilizzoMassimo) {
        return {
          valid: false,
          error: 'Codice sconto esaurito',
          code: 'LIMIT_REACHED'
        };
      }

      // Check minimum amount
      if (sconto.minImporto && importo < Number(sconto.minImporto)) {
        return {
          valid: false,
          error: `Importo minimo richiesto: €${sconto.minImporto}`,
          code: 'MIN_AMOUNT'
        };
      }

      // Check prestazione applicability
      if (prestazioneId && sconto.prestazioniIds.length > 0) {
        if (!sconto.prestazioniIds.includes(prestazioneId)) {
          return {
            valid: false,
            error: 'Codice non applicabile a questa prestazione',
            code: 'NOT_APPLICABLE'
          };
        }
      }

      // Calculate discount
      const discount = this._calculateDiscount(sconto, importo);

      return {
        valid: true,
        sconto: this._formatResponse(sconto),
        discount
      };
    } catch (error) {
      logger.error('Failed to validate clinical discount code', {
        component: 'ScontoClinicoService',
        action: 'validateCode',
        error: error.message,
        codice,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Apply discount code and increment usage
   * @param {string} codice - Discount code
   * @param {string} prestazioneId - Prestazione ID
   * @param {number} importo - Amount to apply discount to
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Application result with discount details
   */
  static async applyCode(codice, prestazioneId, importo, tenantId) {
    try {
      // First validate
      const validation = await this.validateCode(codice, prestazioneId, importo, tenantId);

      if (!validation.valid) {
        return validation;
      }

      // Increment usage
      await prisma.codiceSconto.update({
        where: { id: validation.sconto.id },
        data: { utilizzoCorrente: { increment: 1 } }
      });

      logger.info('Clinical discount code applied', {
        component: 'ScontoClinicoService',
        action: 'applyCode',
        scontoId: validation.sconto.id,
        codice,
        importoOriginale: importo,
        importoScontato: validation.discount.importoScontato,
        tenantId
      });

      return {
        success: true,
        sconto: validation.sconto,
        discount: validation.discount
      };
    } catch (error) {
      logger.error('Failed to apply clinical discount code', {
        component: 'ScontoClinicoService',
        action: 'applyCode',
        error: error.message,
        codice,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Get applicable discount codes for a prestazione
   */
  static async getApplicableCodes(prestazioneId, tenantId) {
    try {
      const now = new Date();

      const sconti = await prisma.codiceSconto.findMany({
        where: {
          tenantId,
          deletedAt: null,
          attivo: true,
          applicabileServizi: { has: TIPO_SERVIZIO_CLINICO },
          dataInizio: { lte: now },
          dataFine: { gte: now },
          OR: [
            { prestazioniIds: { isEmpty: true } }, // Applies to all
            { prestazioniIds: { has: prestazioneId } } // Specifically includes this prestazione
          ]
        }
      });

      // Filter out exhausted codes
      const available = sconti.filter(s =>
        !s.utilizzoMassimo || s.utilizzoCorrente < s.utilizzoMassimo
      );

      return available.map(s => this._formatResponse(s));
    } catch (error) {
      logger.error('Failed to get applicable discount codes', {
        component: 'ScontoClinicoService',
        action: 'getApplicableCodes',
        error: error.message,
        prestazioneId,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Get statistics for clinical discount codes
   */
  static async getStatistics(tenantId, options = {}) {
    try {
      const { dataInizio, dataFine } = options;
      const now = new Date();

      const where = {
        tenantId,
        deletedAt: null,
        applicabileServizi: { has: TIPO_SERVIZIO_CLINICO }
      };

      const [totali, attivi, scaduti, perTipo] = await Promise.all([
        prisma.codiceSconto.count({ where }),
        prisma.codiceSconto.count({
          where: {
            ...where,
            attivo: true,
            dataInizio: { lte: now },
            dataFine: { gte: now }
          }
        }),
        prisma.codiceSconto.count({
          where: {
            ...where,
            dataFine: { lt: now }
          }
        }),
        prisma.codiceSconto.groupBy({
          by: ['tipoSconto'],
          where,
          _count: { id: true },
          _sum: { utilizzoCorrente: true }
        })
      ]);

      // Total usage
      const totalUsage = await prisma.codiceSconto.aggregate({
        where,
        _sum: { utilizzoCorrente: true }
      });

      return {
        totali,
        attivi,
        scaduti,
        utilizziTotali: totalUsage._sum.utilizzoCorrente || 0,
        perTipo: perTipo.map(t => ({
          tipo: t.tipoSconto,
          count: t._count.id,
          utilizzi: t._sum.utilizzoCorrente || 0
        }))
      };
    } catch (error) {
      logger.error('Failed to get discount statistics', {
        component: 'ScontoClinicoService',
        action: 'getStatistics',
        error: error.message,
        tenantId
      });
      throw error;
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Calculate discount amount
   */
  static _calculateDiscount(sconto, importo) {
    let importoSconto = 0;

    if (sconto.tipoSconto === TIPO_SCONTO.PERCENTUALE) {
      importoSconto = importo * (Number(sconto.valore) / 100);
    } else {
      importoSconto = Math.min(Number(sconto.valore), importo);
    }

    // Apply max cap if set
    if (sconto.maxImporto && importoSconto > Number(sconto.maxImporto)) {
      importoSconto = Number(sconto.maxImporto);
    }

    const importoScontato = importo - importoSconto;

    return {
      importoOriginale: Number(importo.toFixed(2)),
      importoSconto: Number(importoSconto.toFixed(2)),
      importoScontato: Number(Math.max(0, importoScontato).toFixed(2)),
      percentualeEffettiva: Number(((importoSconto / importo) * 100).toFixed(2))
    };
  }

  /**
   * Format response (standardized fields, no backward compat aliases)
   */
  static _formatResponse(sconto) {
    return {
      id: sconto.id,
      codice: sconto.codice,
      nome: sconto.nome,
      descrizione: sconto.descrizione,
      tipo: mapEnumToTipo(sconto.tipoSconto),
      tipoSconto: sconto.tipoSconto,
      valore: Number(sconto.valore),
      dataInizio: sconto.dataInizio,
      dataFine: sconto.dataFine,
      attivo: sconto.attivo,
      utilizzoMassimo: sconto.utilizzoMassimo,
      utilizzoCorrente: sconto.utilizzoCorrente,
      prestazioniIds: sconto.prestazioniIds || [],
      cumulabile: sconto.cumulabile,
      minImporto: sconto.minImporto ? Number(sconto.minImporto) : null,
      maxImporto: sconto.maxImporto ? Number(sconto.maxImporto) : null,
      tenantId: sconto.tenantId,
      createdAt: sconto.createdAt,
      updatedAt: sconto.updatedAt
    };
  }

  /**
   * Increment usage counter for a discount code
   * @param {string} codice - Discount code
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated sconto
   */
  static async incrementUsage(codice, tenantId) {
    try {
      const sconto = await prisma.codiceSconto.findFirst({
        where: {
          codice: codice.toUpperCase(),
          tenantId,
          deletedAt: null,
          applicabileServizi: { has: TIPO_SERVIZIO_CLINICO }
        }
      });

      if (!sconto) {
        throw new Error('Codice sconto non trovato');
      }

      const updated = await prisma.codiceSconto.update({
        where: { id: sconto.id },
        data: { utilizzoCorrente: { increment: 1 } }
      });

      logger.info('Discount code usage incremented', {
        component: 'ScontoClinicoService',
        action: 'incrementUsage',
        scontoId: sconto.id,
        codice,
        newCount: updated.utilizzoCorrente,
        tenantId
      });

      return this._formatResponse(updated);
    } catch (error) {
      logger.error('Failed to increment discount code usage', {
        component: 'ScontoClinicoService',
        action: 'incrementUsage',
        error: error.message,
        codice,
        tenantId
      });
      throw error;
    }
  }
}

export default ScontoClinicoService;
