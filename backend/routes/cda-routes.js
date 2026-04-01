/**
 * P65 Fase 4 - CDA Routes
 * 
 * API endpoints per gestione documenti CDA HL7
 * @module routes/cda-routes
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import HL7CDAService from '../services/cda/HL7CDAService.js';
import { logger } from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { validateParam } from '../middleware/validateUUID.js';

const router = Router();

router.param('refertoId', validateParam('refertoId'));
router.param('giudizioId', validateParam('giudizioId'));
router.param('cdaDocumentId', validateParam('cdaDocumentId'));
router.param('pazienteId', validateParam('pazienteId'));

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * GET /config
 * Ottiene configurazione CDA (OID Registry, LOINC Sections)
 */
router.get('/config', authenticate, async (req, res) => {
  try {
    const config = {
      oidRegistry: HL7CDAService.OID_REGISTRY,
      loincSections: HL7CDAService.LOINC_SECTIONS
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Errore recupero config CDA:', error);
    res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
});

// ============================================
// GENERATION ROUTES
// ============================================

/**
 * POST /referto/:refertoId
 * Genera documento CDA da un referto
 */
router.post('/referto/:refertoId',
  authenticate,
  requirePermission('referti:read'),
  async (req, res) => {
    try {
      const { refertoId } = req.params;
      const tenantId = getEffectiveTenantId(req);

      logger.info('Generazione CDA da referto', { refertoId, tenantId });

      const result = await HL7CDAService.generateFromReferto(refertoId, tenantId);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Errore generazione CDA da referto:', error);
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * POST /giudizio/:giudizioId
 * Genera documento CDA da giudizio idoneità
 */
router.post('/giudizio/:giudizioId',
  authenticate,
  requirePermission('giudizi:read'),
  async (req, res) => {
    try {
      const { giudizioId } = req.params;
      const tenantId = getEffectiveTenantId(req);

      logger.info('Generazione CDA da giudizio', { giudizioId, tenantId });

      const result = await HL7CDAService.generateFromGiudizio(giudizioId, tenantId);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Errore generazione CDA da giudizio:', error);
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

// ============================================
// RETRIEVAL ROUTES
// ============================================

/**
 * GET /:sourceType/:sourceId
 * Ottiene documento CDA esistente
 */
router.get('/:sourceType/:sourceId',
  authenticate,
  async (req, res) => {
    try {
      const { sourceType, sourceId } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const document = await HL7CDAService.getCDADocument(sourceType, sourceId, tenantId);

      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Documento CDA non trovato'
        });
      }

      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      logger.error('Errore recupero CDA:', error);
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * GET /:sourceType/:sourceId/xml
 * Download XML raw del documento CDA
 */
router.get('/:sourceType/:sourceId/xml',
  authenticate,
  async (req, res) => {
    try {
      const { sourceType, sourceId } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const document = await HL7CDAService.getCDADocument(sourceType, sourceId, tenantId);

      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Documento CDA non trovato'
        });
      }

      // Set headers per download XML
      res.set({
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="CDA_${sourceType}_${sourceId}.xml"`
      });

      res.send(document.cdaXml);
    } catch (error) {
      logger.error('Errore download CDA XML:', error);
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

// ============================================
// VALIDATION ROUTES
// ============================================

/**
 * POST /:cdaDocumentId/validate
 * Valida documento CDA
 */
router.post('/:cdaDocumentId/validate',
  authenticate,
  async (req, res) => {
    try {
      const { cdaDocumentId } = req.params;
      const tenantId = getEffectiveTenantId(req);

      logger.info('Validazione CDA', { cdaDocumentId, tenantId });

      const result = await HL7CDAService.validateCDA(cdaDocumentId, tenantId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Errore validazione CDA:', error);
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

// ============================================
// PATIENT ROUTES
// ============================================

/**
 * GET /patient/:pazienteId
 * Ottiene tutti i documenti CDA di un paziente
 */
router.get('/patient/:pazienteId',
  authenticate,
  async (req, res) => {
    try {
      const { pazienteId } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const documents = await HL7CDAService.getPatientCDADocuments(pazienteId, tenantId);

      res.json({
        success: true,
        data: documents
      });
    } catch (error) {
      logger.error('Errore recupero CDA paziente:', error);
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

// ============================================
// MAPPING ROUTES
// ============================================

/**
 * GET /mapping/:entityType/:fieldPath
 * Ottiene mapping HL7 per un campo specifico
 */
router.get('/mapping/:entityType/:fieldPath',
  authenticate,
  async (req, res) => {
    try {
      const { entityType, fieldPath } = req.params;

      const mapping = await HL7CDAService.getHL7Mapping(entityType, fieldPath);

      if (!mapping) {
        return res.status(404).json({
          success: false,
          error: 'Mapping HL7 non trovato'
        });
      }

      res.json({
        success: true,
        data: mapping
      });
    } catch (error) {
      logger.error('Errore recupero mapping HL7:', error);
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

export default router;
