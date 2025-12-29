/**
 * Preventivi CRUD Routes
 * 
 * Gestione CRUD preventivi:
 * - GET / - Lista con paginazione e filtri
 * - POST / - Crea nuovo preventivo
 * - GET /:id - Ottieni dettagli
 * - PUT /:id - Aggiorna preventivo
 * - DELETE /:id - Soft delete
 * 
 * @module routes/preventivi/crud.routes
 */

import {
  express,
  body,
  query,
  param,
  prisma,
  authenticate,
  requirePermissions,
  auditLog,
  logger,
  preventiviService,
  validate
} from './common.js';

const router = express.Router();

/**
 * GET /api/preventivi
 * Lista preventivi con filtri e paginazione
 */
router.get('/',
  authenticate,
  requirePermissions(['preventivi:read']),
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
      const { tenantId } = req.person;
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
              select: { id: true, ragioneSociale: true }
            },
            persona: {
              select: { id: true, firstName: true, lastName: true }
            },
            schedule: {
              select: {
                id: true,
                startDate: true,
                endDate: true,
                course: {
                  select: { id: true, title: true, code: true }
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
        userId: req.person.id,
        tenantId,
        count: preventivi.length,
        filters: { stato: req.query.stato, tipoServizio: req.query.tipoServizio }
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
  requirePermissions(['preventivi:create']),
  auditLog('preventivi', 'CREATE'),
  (req, res, next) => {
    logger.info({
      component: 'preventivi',
      body: req.body,
      contentType: req.headers['content-type']
    }, 'POST /api/preventivi - Before validation');
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
      const { tenantId, id: userId } = req.person;

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
          select: { course: { select: { title: true } } }
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
      const dataScadenza = req.body.dataValidita || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      if (dataScadenza <= dataEmissione) {
        return res.status(400).json({
          success: false,
          error: 'dataScadenza deve essere successiva a dataEmissione'
        });
      }

      // Determina clienteType
      const clienteType = req.body.aziendaId ? 'AZIENDA' : 'PERSONA';

      // Determina aliquota IVA
      const aliquotaIva = req.body.aliquotaIva ||
        req.body.percentualeIva ||
        preventiviService.determineIvaRate(req.body.tipoServizio);

      // Calcola totali
      const totali = preventiviService.calculatePreventivoTotals({
        prezzoTotale: req.body.prezzoTotale,
        scontoTotale: 0,
        aliquotaIva
      });

      // Genera numero preventivo
      const anno = new Date().getFullYear();
      const lastPreventivo = await prisma.preventivo.findFirst({
        where: { tenantId, annoProgressivo: anno },
        orderBy: { numeroProgressivo: 'desc' },
        select: { numeroProgressivo: true }
      });
      const numeroProgressivo = (lastPreventivo?.numeroProgressivo || 0) + 1;
      const numero = `PREV-${anno}-${String(numeroProgressivo).padStart(4, '0')}`;

      // Calcola prezzoUnitario
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
          azienda: { select: { id: true, ragioneSociale: true } },
          persona: { select: { id: true, firstName: true, lastName: true } }
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

/**
 * GET /api/preventivi/:id
 * Ottieni dettagli preventivo specifico
 */
router.get('/:id',
  authenticate,
  requirePermissions(['preventivi:read']),
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const { tenantId } = req.person;
      const { id } = req.params;

      const preventivo = await prisma.preventivo.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: {
          azienda: { select: { id: true, ragioneSociale: true } },
          persona: { select: { id: true, firstName: true, lastName: true } },
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
  requirePermissions(['preventivi:update']),
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
      const { tenantId, id: userId } = req.person;
      const { id } = req.params;

      // Verifica esistenza
      const existing = await prisma.preventivo.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: { sconti: { where: { deletedAt: null } } }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Preventivo non trovato'
        });
      }

      // Non permettere modifiche se stato finale
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
          azienda: { select: { id: true, ragioneSociale: true } },
          persona: { select: { id: true, firstName: true, lastName: true } },
          sconti: { where: { deletedAt: null } }
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
  requirePermissions(['preventivi:delete']),
  auditLog('preventivi', 'DELETE'),
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.person;
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
        data: { deletedAt: new Date() }
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

export default router;
