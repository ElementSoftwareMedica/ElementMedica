/**
 * API Routes - Preventivi
 * 
 * Gestione completa preventivi con:
 * - CRUD operations
 * - Calcolo automatico IVA e totali
 * - Gestione sconti (applicazione/rimozione)
 * - Workflow stati
 * - Generazione PDF
 * 
 * @module routes/preventivi-routes
 */

import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import prisma from '../config/prisma-optimization.js';
import authMiddleware from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../utils/logger.js';
import preventiviService from '../services/preventivi-service.js';
import codiciScontoService from '../services/codici-sconto-service.js';

const { authenticate } = authMiddleware;
const router = express.Router();

/**
 * Middleware validazione errori
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('=== VALIDATION ERRORS ===');
    console.error('Path:', req.path);
    console.error('Method:', req.method);
    console.error('Body:', JSON.stringify(req.body, null, 2));
    console.error('Errors:', JSON.stringify(errors.array(), null, 2));
    console.error('=========================');

    logger.error('Validation errors in preventivi route', {
      component: 'preventivi-routes',
      method: req.method,
      path: req.path,
      errors: errors.array(),
      body: req.body
    });
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * GET /api/preventivi
 * Lista preventivi con filtri e paginazione
 * 
 * Query params:
 * - page, limit: paginazione
 * - stato: filtro stato
 * - tipoServizio: filtro tipo servizio
 * - clienteId: filtro cliente
 * - clienteType: azienda|persona
 * - dataInizio, dataFine: range date emissione
 * - search: ricerca per numero/titolo
 */
router.get('/',
  authenticate,
  requirePermissions(['read:preventivi']),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('stato').optional().isIn(['BOZZA', 'INVIATO', 'VISUALIZZATO', 'ACCETTATO', 'RIFIUTATO', 'FATTURATO', 'ANNULLATO', 'ARCHIVIATO']),
    query('tipoServizio').optional().isIn(['CORSO', 'DVR', 'RSPP', 'MEDICO_COMPETENTE', 'CONSULENZA', 'COMPENSO_FORMATORE', 'ALTRO']),
    query('clienteId').optional().isUUID(),
    query('clienteType').optional().isIn(['azienda', 'persona']),
    query('scheduleId').optional().isUUID(),
    query('dataInizio').optional().isISO8601().toDate(),
    query('dataFine').optional().isISO8601().toDate(),
    query('search').optional().isString().trim()
  ],
  validate,
  async (req, res) => {
    try {
      const { tenantId } = req.user;
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {
        tenantId,
        deletedAt: null
      };

      if (req.query.stato) {
        where.stato = req.query.stato;
      }

      if (req.query.tipoServizio) {
        where.tipoServizio = req.query.tipoServizio;
      }

      if (req.query.scheduleId) {
        where.scheduledCourseId = req.query.scheduleId;
      }

      if (req.query.clienteId) {
        if (req.query.clienteType === 'azienda') {
          where.aziendaId = req.query.clienteId;
        } else {
          where.personaId = req.query.clienteId;
        }
      }

      if (req.query.dataInizio || req.query.dataFine) {
        where.dataEmissione = {};
        if (req.query.dataInizio) {
          where.dataEmissione.gte = req.query.dataInizio;
        }
        if (req.query.dataFine) {
          where.dataEmissione.lte = req.query.dataFine;
        }
      }

      if (req.query.search) {
        where.OR = [
          { numero: { contains: req.query.search, mode: 'insensitive' } },
          { titoloServizio: { contains: req.query.search, mode: 'insensitive' } }
        ];
      }

      // Execute query
      const [preventivi, total] = await Promise.all([
        prisma.preventivo.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            azienda: {
              select: {
                id: true,
                ragioneSociale: true
              }
            },
            persona: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            schedule: {
              select: {
                id: true,
                startDate: true,
                endDate: true,
                course: {
                  select: {
                    id: true,
                    title: true,
                    code: true
                  }
                }
              }
            },
            sconti: {
              where: { deletedAt: null },
              select: {
                id: true,
                codiceTesto: true,
                nomeCodice: true,
                tipoSconto: true,
                valoreSconto: true,
                importoScontato: true
              }
            }
          }
        }),
        prisma.preventivo.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          preventivi,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total,
          limit,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      });

      logger.info('Preventivi listed', {
        component: 'preventivi-routes',
        action: 'list',
        userId: req.user.id,
        tenantId,
        count: preventivi.length,
        filters: {
          stato: req.query.stato,
          tipoServizio: req.query.tipoServizio
        }
      });

    } catch (error) {
      logger.error('Failed to list preventivi', {
        component: 'preventivi-routes',
        action: 'list',
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * POST /api/preventivi
 * Crea nuovo preventivo con calcolo automatico IVA
 */
router.post('/',
  authenticate,
  requirePermissions(['create:preventivi']),
  auditLog('preventivi', 'CREATE'),
  (req, res, next) => {
    console.log('=== POST /api/preventivi - BEFORE VALIDATION ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Content-Type:', req.headers['content-type']);
    console.log('===============================================');

    logger.info('POST /api/preventivi - Before validation', {
      component: 'preventivi-routes',
      body: req.body,
      headers: { 'content-type': req.headers['content-type'] }
    });
    next();
  },
  [
    body('tipoServizio').isIn(['CORSO', 'DVR', 'RSPP', 'MEDICO_COMPETENTE', 'CONSULENZA', 'COMPENSO_FORMATORE', 'ALTRO']),
    body('titoloServizio').optional().isString().trim().isLength({ max: 500 }),
    body('descrizioneServizio').optional().isString().isLength({ max: 5000 }),
    body('quantita').optional().isInt({ min: 1 }),
    body('prezzoTotale').isFloat({ min: 0 }),
    body('aliquotaIva').optional().isFloat({ min: 0, max: 100 }),
    body('percentualeIva').optional().isFloat({ min: 0, max: 100 }),
    body('dataEmissione').optional().isISO8601().toDate(),
    body('dataValidita').optional().isISO8601().toDate(),
    body('stato').optional().isIn(['BOZZA', 'INVIATO']),
    body('aziendaId').optional().isUUID(),
    body('personaId').optional().isUUID(),
    body('corsoId').optional().isUUID(),
    body('metaPreventivo').optional().isObject(),
    body('note').optional().isString().isLength({ max: 5000 })
  ],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.user;

      // Log dei dati ricevuti per debugging
      logger.info('POST /api/preventivi - Request received', {
        component: 'preventivi-routes',
        action: 'create-start',
        body: req.body,
        quantita: req.body.quantita,
        quantitaType: typeof req.body.quantita,
        userId,
        tenantId
      });

      // Validazioni custom
      if (!req.body.aziendaId && !req.body.personaId) {
        logger.warn('Missing client ID', { body: req.body });
        return res.status(400).json({
          success: false,
          error: 'Specificare aziendaId o personaId'
        });
      }

      if (req.body.aziendaId && req.body.personaId) {
        logger.warn('Both client IDs provided', { body: req.body });
        return res.status(400).json({
          success: false,
          error: 'Specificare solo aziendaId o personaId, non entrambi'
        });
      }

      // Get corso info if corsoId is provided
      let corsoInfo = null;
      if (req.body.corsoId) {
        logger.info('Fetching course info', { corsoId: req.body.corsoId });
        corsoInfo = await prisma.courseSchedule.findUnique({
          where: { id: req.body.corsoId },
          select: {
            course: {
              select: {
                title: true
              }
            }
          }
        });
        logger.info('Course info fetched', { corsoInfo });
      }

      // Auto-generate titoloServizio and descrizioneServizio if missing
      const titoloServizio = req.body.titoloServizio ||
        (corsoInfo?.course ? `Preventivo - ${corsoInfo.course.title || 'Corso'}` : 'Preventivo');

      const descrizioneServizio = req.body.descrizioneServizio ||
        (corsoInfo?.course ? `Servizio di formazione: ${corsoInfo.course.title || 'Corso'}` : 'Servizio');

      // Default dates
      const dataEmissione = req.body.dataEmissione || new Date();
      const dataScadenza = req.body.dataValidita || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      if (dataScadenza <= dataEmissione) {
        return res.status(400).json({
          success: false,
          error: 'dataScadenza deve essere successiva a dataEmissione'
        });
      }

      // Determina clienteType
      const clienteType = req.body.aziendaId ? 'AZIENDA' : 'PERSONA';

      // Determina aliquota IVA (accetta sia aliquotaIva che percentualeIva)
      const aliquotaIva = req.body.aliquotaIva ||
        req.body.percentualeIva ||
        preventiviService.determineIvaRate(req.body.tipoServizio);

      // Calcola totali (ignora i campi calcolati inviati dal frontend)
      const totali = preventiviService.calculatePreventivoTotals({
        prezzoTotale: req.body.prezzoTotale,
        scontoTotale: 0,
        aliquotaIva
      });

      // Genera numero preventivo con anno e progressivo
      const anno = new Date().getFullYear();
      const lastPreventivo = await prisma.preventivo.findFirst({
        where: {
          tenantId,
          annoProgressivo: anno
        },
        orderBy: { numeroProgressivo: 'desc' },
        select: { numeroProgressivo: true }
      });
      const numeroProgressivo = (lastPreventivo?.numeroProgressivo || 0) + 1;
      const numero = `PREV-${anno}-${String(numeroProgressivo).padStart(4, '0')}`;

      // Calcola prezzoUnitario (per ora uguale a prezzoTotale, sarà gestito dal frontend)
      const prezzoUnitario = totali.prezzoTotale;

      // Validate scheduledCourseId if provided
      let validatedScheduleId = null;
      if (req.body.corsoId) {
        const scheduleExists = await prisma.courseSchedule.findUnique({
          where: { id: req.body.corsoId },
          select: { id: true }
        });

        if (scheduleExists) {
          validatedScheduleId = req.body.corsoId;
          logger.info('CourseSchedule validated', { scheduleId: validatedScheduleId });
        } else {
          logger.warn('CourseSchedule not found, creating preventivo without schedule', {
            attemptedScheduleId: req.body.corsoId
          });
        }
      }

      // Log quantita before create
      const quantitaValue = req.body.quantita || 1;
      logger.info('POST /api/preventivi - Quantita value', {
        rawQuantita: req.body.quantita,
        finalQuantita: quantitaValue,
        willUseDefault: !req.body.quantita
      });

      // Crea preventivo
      const preventivo = await prisma.preventivo.create({
        data: {
          numero,
          annoProgressivo: anno,
          numeroProgressivo,
          tipoServizio: req.body.tipoServizio,
          titoloServizio,
          descrizioneServizio,
          clienteType,
          quantita: quantitaValue,
          prezzoUnitario,
          prezzoTotale: totali.prezzoTotale,
          scontoTotale: 0,
          imponibile: totali.imponibile,
          aliquotaIva: totali.aliquotaIva,
          importoIva: totali.importoIva,
          importoFinale: totali.importoFinale,
          dataEmissione,
          dataScadenza,
          stato: req.body.stato || 'BOZZA',
          aziendaId: req.body.aziendaId || null,
          personaId: req.body.personaId || null,
          scheduledCourseId: validatedScheduleId,
          note: req.body.note || null,
          tenantId,
          generatedBy: userId
        },
        include: {
          azienda: {
            select: {
              id: true,
              ragioneSociale: true
            }
          },
          persona: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        data: preventivo,
        message: 'Preventivo creato con successo'
      });

      logger.info('Preventivo created', {
        component: 'preventivi-routes',
        action: 'create',
        preventivoId: preventivo.id,
        numero: preventivo.numero,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to create preventivo', {
        component: 'preventivi-routes',
        action: 'create',
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

// ============================================================================
// SPECIFIC ROUTES - Must be defined BEFORE generic /:id routes
// Express matches routes in order, so /stato must come before /:id
// ============================================================================

/**
 * PUT /api/preventivi/:id/stato
 * Cambia stato preventivo (workflow)
 */
router.put('/:id/stato',
  authenticate,
  requirePermissions(['edit:preventivi']),
  auditLog('preventivi', 'UPDATE_STATO'),
  [
    param('id').isUUID(),
    body('nuovoStato').isIn(['BOZZA', 'INVIATO', 'VISUALIZZATO', 'ACCETTATO', 'RIFIUTATO', 'SCADUTO', 'CONVERTITO', 'FATTURATO', 'ANNULLATO', 'ARCHIVIATO']),
    body('note').optional().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.user;
      const { id } = req.params;
      const { nuovoStato, note } = req.body;

      const preventivo = await prisma.preventivo.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!preventivo) {
        return res.status(404).json({
          success: false,
          error: 'Preventivo non trovato'
        });
      }

      // Valida transizione
      const transition = preventiviService.validateStateTransition(preventivo.stato, nuovoStato);
      if (!transition.valid) {
        return res.status(400).json({
          success: false,
          error: transition.error,
          allowedTransitions: transition.allowedTransitions
        });
      }

      // Update stato
      const now = new Date();
      const updateData = {
        stato: nuovoStato,
        updatedAt: now
      };

      // Traccia data invio
      if (nuovoStato === 'INVIATO' && !preventivo.dataInvio) {
        updateData.dataInvio = now;
      }

      // Traccia data accettazione/rifiuto
      if (nuovoStato === 'ACCETTATO') {
        updateData.dataAccettazione = now;
      } else if (nuovoStato === 'RIFIUTATO') {
        updateData.dataRifiuto = now;
      }

      // Aggiungi note se fornite
      if (note) {
        const noteAttuali = preventivo.note || '';
        updateData.note = `${noteAttuali}\n\n[${now.toISOString()}] Cambio stato → ${nuovoStato}: ${note}`.trim();
      }

      const preventivoAggiornato = await prisma.preventivo.update({
        where: { id },
        data: updateData,
        include: {
          azienda: true,
          persona: true
        }
      });

      res.json({
        success: true,
        data: preventivoAggiornato,
        message: `Stato aggiornato: ${preventivo.stato} → ${nuovoStato}`
      });

      logger.info('Preventivo stato changed', {
        component: 'preventivi-routes',
        action: 'update_stato',
        preventivoId: id,
        numero: preventivo.numero,
        statoVecchio: preventivo.stato,
        statoNuovo: nuovoStato,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to change preventivo stato', {
        component: 'preventivi-routes',
        action: 'update_stato',
        preventivoId: req.params.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * POST /api/preventivi/:id/applica-sconto
 * Applica codice sconto a preventivo
 */
router.post('/:id/applica-sconto',
  authenticate,
  requirePermissions(['update:preventivi']),
  auditLog('preventivi', 'APPLY_DISCOUNT'),
  [
    param('id').isUUID(),
    body('codice').isString().trim().notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.user;
      const { id: preventivoId } = req.params;
      const { codice: codiceTesto } = req.body;

      // Recupera preventivo
      const preventivo = await prisma.preventivo.findFirst({
        where: { id: preventivoId, tenantId, deletedAt: null }
      });

      if (!preventivo) {
        return res.status(404).json({
          success: false,
          error: 'Preventivo non trovato'
        });
      }

      // Non permettere modifica sconti se stato finale
      if (['FATTURATO', 'ANNULLATO', 'ARCHIVIATO'].includes(preventivo.stato)) {
        return res.status(400).json({
          success: false,
          error: `Impossibile modificare sconti in stato ${preventivo.stato}`
        });
      }

      // Trova codice
      const codice = await prisma.codiceSconto.findFirst({
        where: {
          codice: codiceTesto.toUpperCase(),
          tenantId,
          deletedAt: null
        }
      });

      if (!codice) {
        return res.status(404).json({
          success: false,
          error: 'Codice sconto non trovato'
        });
      }

      // Valida applicabilità
      const clienteType = preventivo.aziendaId ? 'azienda' : 'persona';
      const clienteId = preventivo.aziendaId || preventivo.personaId;

      const validation = await codiciScontoService.validateCodeApplicability(
        codiceTesto,
        tenantId,
        {
          prezzoBase: Number(preventivo.prezzoTotale) - Number(preventivo.scontoTotale),
          tipoServizio: preventivo.tipoServizio,
          clienteId,
          clienteType,
          corsoId: preventivo.corsoId
        }
      );

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Codice non applicabile',
          details: validation.errors
        });
      }

      // Applica sconto in transazione
      const result = await prisma.$transaction(async (tx) => {
        return await preventiviService.applyDiscount(preventivoId, codice.id, {
          transaction: tx,
          userId
        });
      });

      res.json({
        success: true,
        data: result.preventivo,
        sconto: result.sconto,
        totali: result.totali,
        message: `Sconto ${codice.codice} applicato con successo`
      });

      logger.info('Discount applied to preventivo', {
        component: 'preventivi-routes',
        action: 'apply_discount',
        preventivoId,
        codiceId: codice.id,
        codice: codice.codice,
        importoSconto: result.sconto.importoScontato,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to apply discount', {
        component: 'preventivi-routes',
        action: 'apply_discount',
        preventivoId: req.params.id,
        error: error.message,
        stack: error.stack
      });

      // Gestisci errori specifici
      if (error.message.includes('già applicato')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * DELETE /api/preventivi/:id/sconti/:scontoId
 * Rimuove sconto da preventivo
 */
router.delete('/:id/sconti/:scontoId',
  authenticate,
  requirePermissions(['update:preventivi']),
  auditLog('preventivi', 'REMOVE_DISCOUNT'),
  [
    param('id').isUUID(),
    param('scontoId').isUUID()
  ],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.user;
      const { id: preventivoId, scontoId } = req.params;

      // Verifica preventivo
      const preventivo = await prisma.preventivo.findFirst({
        where: { id: preventivoId, tenantId, deletedAt: null }
      });

      if (!preventivo) {
        return res.status(404).json({
          success: false,
          error: 'Preventivo non trovato'
        });
      }

      // Non permettere modifica sconti se stato finale
      if (['FATTURATO', 'ANNULLATO', 'ARCHIVIATO'].includes(preventivo.stato)) {
        return res.status(400).json({
          success: false,
          error: `Impossibile modificare sconti in stato ${preventivo.stato}`
        });
      }

      // Rimuovi sconto in transazione
      const result = await prisma.$transaction(async (tx) => {
        return await preventiviService.removeDiscount(preventivoId, scontoId, {
          transaction: tx,
          userId
        });
      });

      res.json({
        success: true,
        data: result.preventivo,
        totali: result.totali,
        message: 'Sconto rimosso con successo'
      });

      logger.info('Discount removed from preventivo', {
        component: 'preventivi-routes',
        action: 'remove_discount',
        preventivoId,
        scontoId,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to remove discount', {
        component: 'preventivi-routes',
        action: 'remove_discount',
        preventivoId: req.params.id,
        scontoId: req.params.scontoId,
        error: error.message
      });

      if (error.message.includes('non trovato')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * GET /api/preventivi/:id/pdf
 * Genera e scarica PDF preventivo
 */
router.get('/:id/pdf',
  authenticate,
  requirePermissions(['read:preventivi']),
  [
    param('id').isUUID()
  ],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.user;
      const { id } = req.params;

      // Verifica esistenza preventivo (Nota: Prisma client usa nome singolare Preventivo)
      const preventivo = await prisma.preventivo.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!preventivo) {
        return res.status(404).json({
          success: false,
          error: 'Preventivo non trovato'
        });
      }

      // Genera PDF
      const { buffer, filename, fileUrl, documentId } = await preventiviService.generatePDF({
        preventivoId: id,
        userId,
        tenantId
      });

      // Salva dataGenerazione e fileUrl nel preventivo (per invalidare cache)
      await prisma.preventivo.update({
        where: { id },
        data: {
          dataGenerazione: new Date(),
          fileUrl: fileUrl || filename,
          fileName: filename,
          fileSize: buffer.length
        }
      });

      // Imposta headers per download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      // Invia buffer
      res.send(buffer);

      logger.info('PDF generated and sent', {
        component: 'preventivi-routes',
        action: 'pdf',
        preventivoId: id,
        numero: preventivo.numeroProgressivo,
        filename,
        fileSize: buffer.length,
        fileUrl,
        documentId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to generate PDF', {
        component: 'preventivi-routes',
        action: 'pdf',
        preventivoId: req.params.id,
        error: error.message,
        stack: error.stack
      });

      // Errore specifico per template mancante
      if (error.message.includes('Template "Preventivo" non trovato')) {
        return res.status(404).json({
          success: false,
          error: 'Template "Preventivo" non configurato',
          message: 'Creare template di tipo PREVENTIVO prima di generare PDF'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Errore generazione PDF',
        message: error.message
      });
    }
  }
);

// ============================================================================
// GENERIC ROUTES - Must be defined AFTER specific routes
// ============================================================================

/**
 * GET /api/preventivi/:id
 * Ottieni dettagli preventivo specifico
 */
router.get('/:id',
  authenticate,
  requirePermissions(['read:preventivi']),
  [
    param('id').isUUID()
  ],
  validate,
  async (req, res) => {
    try {
      const { tenantId } = req.user;
      const { id } = req.params;

      const preventivo = await prisma.preventivo.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null
        },
        include: {
          azienda: {
            select: {
              id: true,
              ragioneSociale: true
            }
          },
          persona: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          sconti: {
            where: { deletedAt: null },
            orderBy: { applicatoIl: 'asc' }
          }
        }
      });

      if (!preventivo) {
        return res.status(404).json({
          success: false,
          error: 'Preventivo non trovato'
        });
      }

      // Calcola statistiche
      const stats = await preventiviService.getPreventivoStats(id);

      res.json({
        success: true,
        data: { ...preventivo, stats }
      });

    } catch (error) {
      logger.error('Failed to get preventivo', {
        component: 'preventivi-routes',
        action: 'get',
        preventivoId: req.params.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * PUT /api/preventivi/:id
 * Aggiorna preventivo con ricalcolo automatico
 */
router.put('/:id',
  authenticate,
  requirePermissions(['update:preventivi']),
  auditLog('preventivi', 'UPDATE'),
  [
    param('id').isUUID(),
    body('titoloServizio').optional().isString().trim().notEmpty(),
    body('descrizioneServizio').optional().isString(),
    body('tipoServizio').optional().isIn(['CORSO', 'CONSULENZA', 'DVR', 'CERTIFICAZIONE', 'VISITA_MEDICA', 'ALTRO']),
    body('prezzoTotale').optional().isFloat({ min: 0 }),
    body('aliquotaIva').optional().isFloat({ min: 0, max: 100 }),
    body('dataValidita').optional().isISO8601().toDate(),
    body('metaPreventivo').optional().isObject(),
    body('note').optional().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.user;
      const { id } = req.params;

      // Verifica esistenza
      const existing = await prisma.preventivo.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: {
          sconti: { where: { deletedAt: null } }
        }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Preventivo non trovato'
        });
      }

      // Non permettere modifiche se stato è finale
      if (['FATTURATO', 'ANNULLATO', 'ARCHIVIATO'].includes(existing.stato)) {
        return res.status(400).json({
          success: false,
          error: `Impossibile modificare preventivo in stato ${existing.stato}`
        });
      }

      // Se modifica prezzoTotale o aliquotaIva, ricalcola totali
      let updateData = {
        ...(req.body.titoloServizio && { titoloServizio: req.body.titoloServizio }),
        ...(req.body.descrizioneServizio !== undefined && { descrizioneServizio: req.body.descrizioneServizio }),
        ...(req.body.tipoServizio && { tipoServizio: req.body.tipoServizio }),
        ...(req.body.dataValidita && { dataValidita: req.body.dataValidita }),
        ...(req.body.metaPreventivo !== undefined && { metaPreventivo: req.body.metaPreventivo }),
        ...(req.body.note !== undefined && { note: req.body.note }),
        // Note: updatedAt is automatically managed by Prisma @updatedAt
      };

      if (req.body.prezzoTotale !== undefined || req.body.aliquotaIva !== undefined) {
        const nuovoPrezzoTotale = req.body.prezzoTotale !== undefined
          ? req.body.prezzoTotale
          : Number(existing.prezzoTotale);

        const nuovaAliquota = req.body.aliquotaIva !== undefined
          ? req.body.aliquotaIva
          : Number(existing.aliquotaIva);

        const totali = preventiviService.calculatePreventivoTotals({
          prezzoTotale: nuovoPrezzoTotale,
          scontoTotale: Number(existing.scontoTotale),
          aliquotaIva: nuovaAliquota
        });

        updateData = {
          ...updateData,
          prezzoTotale: totali.prezzoTotale,
          imponibile: totali.imponibile,
          aliquotaIva: totali.aliquotaIva,
          importoIva: totali.importoIva,
          importoFinale: totali.importoFinale
        };
      }

      // Update preventivo
      const preventivo = await prisma.preventivo.update({
        where: { id },
        data: updateData,
        include: {
          azienda: {
            select: {
              id: true,
              ragioneSociale: true
            }
          },
          persona: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          sconti: {
            where: { deletedAt: null }
          }
        }
      });

      res.json({
        success: true,
        data: preventivo,
        message: 'Preventivo aggiornato con successo'
      });

      logger.info('Preventivo updated', {
        component: 'preventivi-routes',
        action: 'update',
        preventivoId: id,
        userId,
        tenantId,
        changes: Object.keys(updateData)
      });

    } catch (error) {
      logger.error('Failed to update preventivo', {
        component: 'preventivi-routes',
        action: 'update',
        preventivoId: req.params.id,
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * DELETE /api/preventivi/:id
 * Soft delete preventivo
 */
router.delete('/:id',
  authenticate,
  requirePermissions(['delete:preventivi']),
  auditLog('preventivi', 'DELETE'),
  [
    param('id').isUUID()
  ],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.user;
      const { id } = req.params;

      const existing = await prisma.preventivo.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Preventivo non trovato'
        });
      }

      // Non permettere eliminazione se fatturato
      if (existing.stato === 'FATTURATO') {
        return res.status(400).json({
          success: false,
          error: 'Impossibile eliminare preventivo fatturato'
        });
      }

      await prisma.preventivo.update({
        where: { id },
        data: {
          deletedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Preventivo eliminato con successo'
      });

      logger.info('Preventivo deleted', {
        component: 'preventivi-routes',
        action: 'delete',
        preventivoId: id,
        numero: existing.numero,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to delete preventivo', {
        component: 'preventivi-routes',
        action: 'delete',
        preventivoId: req.params.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

// ============================================================================
// MERGE PREVENTIVI
// ============================================================================

/**
 * POST /api/v1/preventivi/merge
 * Unisce più preventivi della stessa azienda in uno nuovo
 * 
 * I preventivi originali vengono marcati come ARCHIVIATO e mantengono
 * il riferimento al preventivo unificato nel campo dettagliServizio.mergedIntoId
 * 
 * Il nuovo preventivo unificato contiene:
 * - Tutte le voci dei preventivi originali
 * - Riferimenti ai preventivi originali in dettagliServizio.mergedFromIds
 * - Totali ricalcolati
 */
router.post('/merge',
  authenticate,
  requirePermissions(['create:preventivi', 'edit:preventivi']),
  auditLog('preventivi', 'MERGE'),
  [
    body('preventiviIds').isArray({ min: 2 }).withMessage('Seleziona almeno 2 preventivi da unire'),
    body('preventiviIds.*').isUUID().withMessage('ID preventivo non valido')
  ],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.user;
      const { preventiviIds } = req.body;

      // Recupera tutti i preventivi da unire
      const preventivi = await prisma.preventivo.findMany({
        where: {
          id: { in: preventiviIds },
          tenantId,
          deletedAt: null
        },
        include: {
          azienda: true,
          persona: true,
          sconti: true
        }
      });

      // Verifica che tutti i preventivi esistano
      if (preventivi.length !== preventiviIds.length) {
        return res.status(404).json({
          success: false,
          error: 'Uno o più preventivi non trovati o già eliminati'
        });
      }

      // Verifica che appartengano tutti alla stessa azienda
      const aziendaIds = [...new Set(preventivi.map(p => p.aziendaId))];
      if (aziendaIds.length > 1 || !aziendaIds[0]) {
        return res.status(400).json({
          success: false,
          error: 'I preventivi devono appartenere tutti alla stessa azienda'
        });
      }

      // Verifica che nessuno sia già fatturato
      const fatturati = preventivi.filter(p => p.stato === 'FATTURATO');
      if (fatturati.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Impossibile unire preventivi già fatturati'
        });
      }

      // Verifica che nessuno sia già risultato di un merge
      const alreadyMerged = preventivi.filter(p =>
        p.dettagliServizio?.mergedFromIds?.length > 0
      );
      if (alreadyMerged.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Impossibile unire preventivi già unificati. Seleziona i preventivi originali.'
        });
      }

      const aziendaId = aziendaIds[0];
      const azienda = preventivi[0].azienda;

      // Combina tutte le voci
      const vociFuse = [];
      let prezzoTotaleUnificato = 0;
      let scontoTotaleUnificato = 0;

      for (const p of preventivi) {
        // Aggiungi voce dal preventivo originale
        vociFuse.push({
          originalPreventivoId: p.id,
          originalNumero: p.numero,
          titoloServizio: p.titoloServizio,
          descrizioneServizio: p.descrizioneServizio,
          tipoServizio: p.tipoServizio,
          prezzoUnitario: parseFloat(p.prezzoUnitario),
          quantita: p.quantita,
          prezzoTotale: parseFloat(p.prezzoTotale),
          scontoTotale: parseFloat(p.scontoTotale || 0)
        });

        prezzoTotaleUnificato += parseFloat(p.prezzoTotale);
        scontoTotaleUnificato += parseFloat(p.scontoTotale || 0);
      }

      // Calcola totali
      const imponibile = prezzoTotaleUnificato - scontoTotaleUnificato;
      const aliquotaIva = parseFloat(preventivi[0].aliquotaIva) || 22;
      const importoIva = imponibile * (aliquotaIva / 100);
      const importoFinale = imponibile + importoIva;

      // Genera numero progressivo
      const numeroUnificato = await preventiviService.generateNumeroPreventivo(tenantId);

      // Crea descrizione unificata
      const descrizioneUnificata = vociFuse.map((v, i) =>
        `${i + 1}. ${v.titoloServizio} (da ${v.originalNumero}): €${v.prezzoTotale.toFixed(2)}`
      ).join('\n');

      // Crea il nuovo preventivo unificato
      const preventivoUnificato = await prisma.preventivo.create({
        data: {
          tenantId,
          aziendaId,
          clienteType: 'AZIENDA',
          numero: numeroUnificato,
          numeroProgressivo: parseInt(numeroUnificato.split('-')[2]),
          annoProgressivo: new Date().getFullYear(),
          titoloServizio: `Preventivo Unificato - ${azienda?.ragioneSociale || 'Azienda'}`,
          descrizioneServizio: descrizioneUnificata,
          tipoServizio: 'ALTRO',
          prezzoUnitario: prezzoTotaleUnificato,
          quantita: 1,
          prezzoTotale: prezzoTotaleUnificato,
          scontoTotale: scontoTotaleUnificato,
          aliquotaIva,
          imponibile,
          importoIva,
          importoFinale,
          stato: 'BOZZA',
          dataEmissione: new Date(),
          dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 giorni
          generatedBy: userId,
          dettagliServizio: {
            mergedFromIds: preventiviIds,
            mergedFromNumeri: preventivi.map(p => p.numero),
            voci: vociFuse,
            mergedAt: new Date().toISOString(),
            mergedBy: userId
          }
        },
        include: {
          azienda: true,
          persona: true
        }
      });

      // Archivia i preventivi originali e collega al nuovo
      await Promise.all(preventivi.map(p =>
        prisma.preventivo.update({
          where: { id: p.id },
          data: {
            stato: 'ARCHIVIATO',
            dettagliServizio: {
              ...p.dettagliServizio,
              mergedIntoId: preventivoUnificato.id,
              mergedIntoNumero: preventivoUnificato.numero,
              mergedAt: new Date().toISOString()
            }
          }
        })
      ));

      res.json({
        success: true,
        data: preventivoUnificato,
        message: `${preventivi.length} preventivi uniti in ${preventivoUnificato.numero}`,
        mergedPreventivi: preventivi.map(p => ({
          id: p.id,
          numero: p.numero,
          stato: 'ARCHIVIATO'
        }))
      });

      logger.info('Preventivi merged', {
        component: 'preventivi-routes',
        action: 'merge',
        mergedCount: preventivi.length,
        newPreventivoId: preventivoUnificato.id,
        newNumero: preventivoUnificato.numero,
        originalIds: preventiviIds,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to merge preventivi', {
        component: 'preventivi-routes',
        action: 'merge',
        preventiviIds: req.body.preventiviIds,
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server durante l\'unione dei preventivi'
      });
    }
  }
);

/**
 * POST /api/preventivi/:id/unmerge
 * Separa un preventivo unito ripristinando gli originali
 */
router.post('/:id/unmerge',
  authenticate,
  requirePermissions(['edit:preventivi']),
  auditLog('preventivi', 'UNMERGE'),
  [
    param('id').isUUID()
  ],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.user;
      const { id } = req.params;

      // Trova il preventivo unito
      const preventivoUnito = await prisma.preventivo.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!preventivoUnito) {
        return res.status(404).json({
          success: false,
          error: 'Preventivo non trovato'
        });
      }

      // Verifica che sia un preventivo unito
      const mergedFromIds = preventivoUnito.dettagliServizio?.mergedFromIds || [];
      if (mergedFromIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Questo preventivo non è un preventivo unito'
        });
      }

      // Ripristina i preventivi originali
      const preventiviOriginali = await prisma.preventivo.findMany({
        where: {
          id: { in: mergedFromIds },
          tenantId,
          deletedAt: null
        }
      });

      // Rimuovi il riferimento mergedInto dai preventivi originali e usa lo stesso stato del preventivo unito
      const statoPreventivo = preventivoUnito.stato;
      await Promise.all(preventiviOriginali.map(p =>
        prisma.preventivo.update({
          where: { id: p.id },
          data: {
            stato: statoPreventivo, // Mantiene lo stato del preventivo unito
            dettagliServizio: {
              ...p.dettagliServizio,
              mergedIntoId: null,
              mergedIntoNumero: null,
              mergedAt: null,
              restoredAt: new Date().toISOString(),
              restoredBy: userId,
              restoredWithStato: statoPreventivo
            }
          }
        })
      ));

      // Elimina (soft delete) il preventivo unito
      await prisma.preventivo.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          dettagliServizio: {
            ...preventivoUnito.dettagliServizio,
            unmergedAt: new Date().toISOString(),
            unmergedBy: userId
          }
        }
      });

      res.json({
        success: true,
        message: `Preventivo ${preventivoUnito.numero} separato. ${preventiviOriginali.length} preventivi originali ripristinati.`,
        restoredPreventivi: preventiviOriginali.map(p => ({
          id: p.id,
          numero: p.numero
        }))
      });

      logger.info('Preventivo unmerged', {
        component: 'preventivi-routes',
        action: 'unmerge',
        unmergedPreventivoId: id,
        unmergedNumero: preventivoUnito.numero,
        restoredCount: preventiviOriginali.length,
        restoredIds: mergedFromIds,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to unmerge preventivo', {
        component: 'preventivi-routes',
        action: 'unmerge',
        preventivoId: req.params.id,
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server durante la separazione del preventivo'
      });
    }
  }
);

export default router;
