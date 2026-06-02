/**
 * API Routes - Codici Sconto
 * 
 * Gestione completa codici sconto con:
 * - CRUD operations
 * - Validazione applicabilità
 * - Gestione relazioni (aziende, persone, corsi)
 * - Verifica utilizzo e limiti
 * 
 * @module routes/codici-sconto-routes
 */

import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import prisma from '../config/prisma-optimization.js';
import authMiddleware from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const { authenticate } = authMiddleware;
const router = express.Router();

/**
 * Middleware per validare gli errori di express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * GET /api/codici-sconto
 * Lista codici sconto con filtri e paginazione
 * 
 * Query params:
 * - page: numero pagina (default 1)
 * - limit: risultati per pagina (default 20, max 100)
 * - stato: filtro stato (attivi|scaduti|esauriti|disabilitati|tutti)
 * - tipo: filtro tipo sconto (PERCENTUALE|VALORE_ASSOLUTO)
 * - search: ricerca per codice o nome
 * - applicabileA: filtro applicabilità
 */
router.get('/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('stato').optional().isIn(['attivi', 'scaduti', 'esauriti', 'disabilitati', 'tutti']),
    query('tipo').optional().isIn(['PERCENTUALE', 'VALORE_ASSOLUTO']),
    query('applicabileA').optional().isIn(['TUTTI', 'AZIENDE', 'PERSONE', 'SPECIFICI']),
    query('search').optional().isString().trim()
  ],
  validate,
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {
        tenantId,
        deletedAt: null
      };

      // Filtro stato
      const now = new Date();
      switch (req.query.stato) {
        case 'attivi':
          where.attivo = true;
          where.dataInizio = { lte: now };
          where.dataFine = { gte: now };
          where.OR = [
            { utilizzoMassimo: null },
            {
              AND: [
                { utilizzoMassimo: { not: null } },
                { utilizzoCorrente: { lt: prisma.raw('utilizzoMassimo') } }
              ]
            }
          ];
          break;
        case 'scaduti':
          where.dataFine = { lt: now };
          break;
        case 'esauriti':
          where.utilizzoMassimo = { not: null };
          where.utilizzoCorrente = { gte: prisma.raw('utilizzoMassimo') };
          break;
        case 'disabilitati':
          where.attivo = false;
          break;
        // 'tutti' non aggiunge filtri
      }

      // Filtro tipo (supporta sia 'tipo' che 'tipoSconto')
      if (req.query.tipo || req.query.tipoSconto) {
        where.tipoSconto = req.query.tipo || req.query.tipoSconto;
      }

      // Filtro attivo (diretto)
      if (req.query.attivo !== undefined) {
        where.attivo = req.query.attivo === 'true';
      }

      // Filtro applicabilità
      if (req.query.applicabileA) {
        where.applicabileA = req.query.applicabileA;
      }

      // Ricerca testuale
      if (req.query.search) {
        where.OR = [
          { codice: { contains: req.query.search, mode: 'insensitive' } },
          { nome: { contains: req.query.search, mode: 'insensitive' } }
        ];
      }

      // Execute query with pagination
      const [codici, total] = await Promise.all([
        prisma.codiceSconto.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            aziende: {
              include: {
                companyTenantProfile: {
                  select: {
                    id: true,
                    company: {
                      select: {
                        id: true,
                        ragioneSociale: true
                      }
                    }
                  }
                }
              }
            },
            persone: {
              include: {
                persona: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            corsi: {
              include: {
                corso: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            },
            preventivi: {
              select: {
                id: true,
                preventivo: {
                  select: {
                    id: true,
                    numero: true
                  }
                },
                importoScontato: true,
                applicatoIl: true
              },
              take: 5,
              orderBy: { applicatoIl: 'desc' }
            }
          }
        }),
        prisma.codiceSconto.count({ where })
      ]);

      res.json({
        success: true,
        data: codici,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      });

      logger.info('Codici sconto listed', {
        component: 'codici-sconto-routes',
        action: 'list',
        userId: req.person.id,
        tenantId,
        count: codici.length,
        filters: { stato: req.query.stato, tipo: req.query.tipo }
      });

    } catch (error) {
      logger.error('Failed to list codici sconto', {
        component: 'codici-sconto-routes',
        action: 'list',
        error: 'Operazione non riuscita',
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
 * GET /api/codici-sconto/:id
 * Ottieni dettagli codice sconto specifico
 */
router.get('/:id',
  authenticate,
  [
    param('id').isUUID(),
  ],
  validate,
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const { id } = req.params;

      const codice = await prisma.codiceSconto.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null
        },
        include: {
          aziende: {
            include: { companyTenantProfile: { include: { company: true } } }
          },
          persone: {
            include: { persona: true }
          },
          corsi: {
            include: { corso: true }
          },
          preventivi: {
            include: {
              preventivo: {
                select: {
                  id: true,
                  numero: true,
                  stato: true,
                  titoloServizio: true,
                  dataEmissione: true,
                  importoFinale: true
                }
              }
            },
            orderBy: { applicatoIl: 'desc' },
            take: 20
          }
        }
      });

      if (!codice) {
        return res.status(404).json({
          success: false,
          error: 'Codice sconto non trovato'
        });
      }

      // Calcola statistiche utilizzo
      const stats = {
        utilizzoPercentuale: codice.utilizzoMassimo
          ? Math.round((codice.utilizzoCorrente / codice.utilizzoMassimo) * 100)
          : null,
        utilizziRimasti: codice.utilizzoMassimo
          ? Math.max(0, codice.utilizzoMassimo - codice.utilizzoCorrente)
          : null,
        totaleImportoScontato: codice.preventivi.reduce(
          (sum, p) => sum + Number(p.importoScontato),
          0
        )
      };

      res.json({
        success: true,
        data: { ...codice, stats }
      });

    } catch (error) {
      logger.error('Failed to get codice sconto', {
        component: 'codici-sconto-routes',
        action: 'get',
        codiceId: req.params.id,
        error: 'Operazione non riuscita'
      });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

/**
 * POST /api/codici-sconto
 * Crea nuovo codice sconto
 */
router.post('/',
  authenticate,
  auditLog('codici_sconto', 'CREATE'),
  [
    body('codice')
      .isString().trim().notEmpty()
      .isLength({ max: 50 })
      .matches(/^[A-Z0-9_-]+$/i)
      .withMessage('Codice deve contenere solo lettere, numeri, underscore e trattini'),
    body('nome').isString().trim().notEmpty().isLength({ max: 200 }),
    body('descrizione').optional({ nullable: true }).isString().isLength({ max: 1000 }),
    body('tipoSconto').isIn(['PERCENTUALE', 'VALORE_ASSOLUTO']),
    body('valore').isFloat({ min: 0 }),
    body('dataInizio').isISO8601().toDate(),
    body('dataFine').optional({ nullable: true }).isISO8601().toDate(),
    body('attivo').isBoolean(),
    body('utilizzoMassimo').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
    body('utilizzoPerUtente').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
    body('cumulabile').isBoolean(),
    body('minImporto').optional({ nullable: true }).isFloat({ min: 0 }),
    body('maxImporto').optional({ nullable: true }).isFloat({ min: 0 }),
    body('applicabileA').isIn(['TUTTI', 'AZIENDE', 'PERSONE', 'SPECIFICI']),
    body('applicabileServizi').optional({ nullable: true }).isArray(),
    body('tipoCorso').optional({ nullable: true }).isIn(['TUTTI', 'SPECIFICI']),
    body('categorieCorso').optional({ nullable: true }).isArray(),
    body('aziende').optional({ nullable: true }).isArray(),
    body('aziende.*').optional().isUUID(),
    body('persone').optional({ nullable: true }).isArray(),
    body('persone.*').optional().isUUID(),
    body('corsi').optional({ nullable: true }).isArray(),
    body('corsi.*').optional().isUUID(),
    // Campi aggiuntivi per applicabilità clinica
    body('etaMinima').optional({ nullable: true }).isInt({ min: 0, max: 120 }),
    body('etaMassima').optional({ nullable: true }).isInt({ min: 0, max: 120 }),
    body('genereApplicabile').optional({ nullable: true }).isIn(['MALE', 'FEMALE', null]),
    body('soloNuoviPazienti').optional().isBoolean(),
    body('convenzioniIds').optional().isArray(),
    body('convenzioniIds.*').optional().isUUID(),
    body('bundleIds').optional().isArray(),
    body('bundleIds.*').optional().isUUID(),
    body('prestazioniIds').optional().isArray(),
    body('prestazioniIds.*').optional().isUUID()
  ],
  validate,
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const userId = req.person.id;

      // Validazioni custom
      if (req.body.tipoSconto === 'PERCENTUALE' && req.body.valore > 100) {
        return res.status(400).json({
          success: false,
          error: 'La percentuale non può superare 100%'
        });
      }

      if (req.body.dataFine && req.body.dataFine < req.body.dataInizio) {
        return res.status(400).json({
          success: false,
          error: 'La data fine deve essere successiva alla data inizio'
        });
      }

      if (req.body.maxImporto && req.body.minImporto && req.body.maxImporto < req.body.minImporto) {
        return res.status(400).json({
          success: false,
          error: 'Importo massimo deve essere >= importo minimo'
        });
      }

      // Check univocità codice nel tenant
      const existing = await prisma.codiceSconto.findFirst({
        where: {
          codice: req.body.codice.toUpperCase(),
          tenantId,
          deletedAt: null
        }
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Codice sconto già esistente per questo tenant'
        });
      }

      // Prepara dati per la creazione
      const data = {
        codice: req.body.codice.toUpperCase(),
        nome: req.body.nome,
        descrizione: req.body.descrizione,
        tipoSconto: req.body.tipoSconto,
        valore: req.body.valore,
        dataInizio: req.body.dataInizio,
        dataFine: req.body.dataFine,
        attivo: req.body.attivo,
        utilizzoMassimo: req.body.utilizzoMassimo || null,
        utilizzoCorrente: 0,
        utilizzoPerUtente: req.body.utilizzoPerUtente || null,
        cumulabile: req.body.cumulabile,
        minImporto: req.body.minImporto || null,
        maxImporto: req.body.maxImporto || null,
        applicabileA: req.body.applicabileA,
        applicabileServizi: req.body.applicabileServizi || [],
        tipoCorso: req.body.tipoCorso || 'TUTTI',
        categorieCorso: req.body.categorieCorso || [],
        // Campi aggiuntivi per applicabilità clinica
        etaMinima: req.body.etaMinima || null,
        etaMassima: req.body.etaMassima || null,
        genereApplicabile: req.body.genereApplicabile || null,
        soloNuoviPazienti: req.body.soloNuoviPazienti || false,
        convenzioniIds: req.body.convenzioniIds || [],
        bundleIds: req.body.bundleIds || [],
        prestazioniIds: req.body.prestazioniIds || [],
        tenantId,
        createdBy: userId
      };

      // Crea codice con relazioni
      const codice = await prisma.codiceSconto.create({
        data: {
          ...data,
          // Relazioni many-to-many
          ...(req.body.aziende?.length > 0 && {
            aziende: {
              create: req.body.aziende.map(aziendaId => ({
                companyTenantProfileId: aziendaId,
                tenantId
              }))
            }
          }),
          ...(req.body.persone?.length > 0 && {
            persone: {
              create: req.body.persone.map(personaId => ({
                personaId,
                tenantId
              }))
            }
          }),
          ...(req.body.corsi?.length > 0 && {
            corsi: {
              create: req.body.corsi.map(corsoId => ({
                corsoId,
                tenantId
              }))
            }
          })
        },
        include: {
          aziende: { include: { companyTenantProfile: { include: { company: true } } } },
          persone: { include: { persona: true } },
          corsi: { include: { corso: true } }
        }
      });

      res.status(201).json({
        success: true,
        data: codice,
        message: 'Codice sconto creato con successo'
      });

      logger.info('Codice sconto created', {
        component: 'codici-sconto-routes',
        action: 'create',
        codiceId: codice.id,
        codice: codice.codice,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to create codice sconto', {
        component: 'codici-sconto-routes',
        action: 'create',
        error: 'Operazione non riuscita',
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
 * PUT /api/codici-sconto/:id
 * Aggiorna codice sconto esistente
 */
router.put('/:id',
  authenticate,
  auditLog('codici_sconto', 'UPDATE'),
  [
    param('id').isUUID(),
    body('codice').optional().isString().trim().notEmpty().isLength({ max: 50 }),
    body('nome').optional().isString().trim().notEmpty().isLength({ max: 200 }),
    body('descrizione').optional({ nullable: true }).isString().isLength({ max: 1000 }),
    body('tipoSconto').optional().isIn(['PERCENTUALE', 'VALORE_ASSOLUTO']),
    body('valore').optional().isFloat({ min: 0 }),
    body('dataInizio').optional().isISO8601().toDate(),
    body('dataFine').optional({ nullable: true }).custom((value) => {
      if (value === null || value === undefined) return true;
      if (typeof value === 'string' && !isNaN(Date.parse(value))) return true;
      throw new Error('Data fine non valida');
    }),
    body('attivo').optional().isBoolean(),
    body('utilizzoMassimo').optional({ nullable: true }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      const num = parseInt(value);
      if (isNaN(num) || num < 1) throw new Error('Deve essere un numero >= 1');
      return true;
    }),
    body('utilizzoPerUtente').optional({ nullable: true }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      const num = parseInt(value);
      if (isNaN(num) || num < 1) throw new Error('Deve essere un numero >= 1');
      return true;
    }),
    body('cumulabile').optional().isBoolean(),
    body('minImporto').optional({ nullable: true }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) throw new Error('Deve essere un numero >= 0');
      return true;
    }),
    body('maxImporto').optional({ nullable: true }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) throw new Error('Deve essere un numero >= 0');
      return true;
    }),
    body('applicabileA').optional().isIn(['TUTTI', 'AZIENDE', 'PERSONE', 'SPECIFICI']),
    body('applicabileServizi').optional().isArray(),
    body('tipoCorso').optional().isIn(['TUTTI', 'SPECIFICI']),
    body('categorieCorso').optional().isArray(),
    body('aziende').optional().isArray(),
    body('aziende.*').optional().isUUID(),
    body('persone').optional().isArray(),
    body('persone.*').optional().isUUID(),
    body('corsi').optional().isArray(),
    body('corsi.*').optional().isUUID(),
    // Campi aggiuntivi per applicabilità clinica
    body('etaMinima').optional({ nullable: true }).isInt({ min: 0, max: 120 }),
    body('etaMassima').optional({ nullable: true }).isInt({ min: 0, max: 120 }),
    body('genereApplicabile').optional({ nullable: true }).isIn(['MALE', 'FEMALE', null]),
    body('soloNuoviPazienti').optional().isBoolean(),
    body('convenzioniIds').optional().isArray(),
    body('convenzioniIds.*').optional().isUUID(),
    body('bundleIds').optional().isArray(),
    body('bundleIds.*').optional().isUUID(),
    body('prestazioniIds').optional().isArray(),
    body('prestazioniIds.*').optional().isUUID()
  ],
  validate,
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const userId = req.person.id;
      const { id } = req.params;

      // Verifica esistenza
      const existing = await prisma.codiceSconto.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: { preventivi: { where: { deletedAt: null } } }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Codice sconto non trovato'
        });
      }

      // Validazioni custom
      if (req.body.tipoSconto === 'PERCENTUALE' && req.body.valore > 100) {
        return res.status(400).json({
          success: false,
          error: 'La percentuale non può superare 100%'
        });
      }

      const dataInizio = req.body.dataInizio || existing.dataInizio;
      const dataFine = req.body.dataFine || existing.dataFine;
      if (dataFine < dataInizio) {
        return res.status(400).json({
          success: false,
          error: 'La data fine deve essere successiva alla data inizio'
        });
      }

      // Check codice univoco se modificato
      if (req.body.codice && req.body.codice.toUpperCase() !== existing.codice) {
        const duplicate = await prisma.codiceSconto.findFirst({
          where: {
            codice: req.body.codice.toUpperCase(),
            tenantId,
            deletedAt: null,
            NOT: { id }
          }
        });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            error: 'Codice sconto già esistente'
          });
        }
      }

      // Impedisci riduzione utilizzoMassimo se già superato utilizzoCorrente
      if (req.body.utilizzoMassimo && req.body.utilizzoMassimo < existing.utilizzoCorrente) {
        return res.status(400).json({
          success: false,
          error: `Impossibile ridurre utilizzoMassimo a ${req.body.utilizzoMassimo}: codice già utilizzato ${existing.utilizzoCorrente} volte`
        });
      }

      // Prepara dati update
      const updateData = {
        ...(req.body.codice && { codice: req.body.codice.toUpperCase() }),
        ...(req.body.nome && { nome: req.body.nome }),
        ...(req.body.descrizione !== undefined && { descrizione: req.body.descrizione }),
        ...(req.body.tipoSconto && { tipoSconto: req.body.tipoSconto }),
        ...(req.body.valore !== undefined && { valore: req.body.valore }),
        ...(req.body.dataInizio && { dataInizio: req.body.dataInizio }),
        ...(req.body.dataFine !== undefined && { dataFine: req.body.dataFine ? new Date(req.body.dataFine) : null }),
        ...(req.body.attivo !== undefined && { attivo: req.body.attivo }),
        ...(req.body.utilizzoMassimo !== undefined && { utilizzoMassimo: req.body.utilizzoMassimo }),
        ...(req.body.utilizzoPerUtente !== undefined && { utilizzoPerUtente: req.body.utilizzoPerUtente }),
        ...(req.body.cumulabile !== undefined && { cumulabile: req.body.cumulabile }),
        ...(req.body.minImporto !== undefined && { minImporto: req.body.minImporto }),
        ...(req.body.maxImporto !== undefined && { maxImporto: req.body.maxImporto }),
        ...(req.body.applicabileA && { applicabileA: req.body.applicabileA }),
        ...(req.body.applicabileServizi && { applicabileServizi: req.body.applicabileServizi }),
        ...(req.body.tipoCorso && { tipoCorso: req.body.tipoCorso }),
        ...(req.body.categorieCorso && { categorieCorso: req.body.categorieCorso }),
        // Campi aggiuntivi per applicabilità clinica
        ...(req.body.etaMinima !== undefined && { etaMinima: req.body.etaMinima }),
        ...(req.body.etaMassima !== undefined && { etaMassima: req.body.etaMassima }),
        ...(req.body.genereApplicabile !== undefined && { genereApplicabile: req.body.genereApplicabile }),
        ...(req.body.soloNuoviPazienti !== undefined && { soloNuoviPazienti: req.body.soloNuoviPazienti }),
        ...(req.body.convenzioniIds !== undefined && { convenzioniIds: req.body.convenzioniIds }),
        ...(req.body.bundleIds !== undefined && { bundleIds: req.body.bundleIds }),
        ...(req.body.prestazioniIds !== undefined && { prestazioniIds: req.body.prestazioniIds }),
        updatedAt: new Date()
      };

      // Update con relazioni
      const codice = await prisma.$transaction(async (tx) => {
        // Update base data
        const updated = await tx.codiceSconto.update({
          where: { id },
          data: updateData
        });

        // Update relazioni se specificate
        if (req.body.aziende !== undefined) {
          await tx.codiceAzienda.deleteMany({ where: { codiceId: id } });
          if (req.body.aziende.length > 0) {
            await tx.codiceAzienda.createMany({
              data: req.body.aziende.map(aziendaId => ({
                codiceId: id,
                companyTenantProfileId: aziendaId,
                tenantId
              }))
            });
          }
        }

        if (req.body.persone !== undefined) {
          await tx.codicePersona.deleteMany({ where: { codiceId: id } });
          if (req.body.persone.length > 0) {
            await tx.codicePersona.createMany({
              data: req.body.persone.map(personaId => ({
                codiceId: id,
                personaId,
                tenantId
              }))
            });
          }
        }

        if (req.body.corsi !== undefined) {
          await tx.codiceCorso.deleteMany({ where: { codiceId: id } });
          if (req.body.corsi.length > 0) {
            await tx.codiceCorso.createMany({
              data: req.body.corsi.map(corsoId => ({
                codiceId: id,
                corsoId,
                tenantId
              }))
            });
          }
        }

        // Fetch complete updated record
        return tx.codiceSconto.findUnique({
          where: { id },
          include: {
            aziende: { include: { companyTenantProfile: { include: { company: true } } } },
            persone: { include: { persona: true } },
            corsi: { include: { corso: true } }
          }
        });
      });

      res.json({
        success: true,
        data: codice,
        message: 'Codice sconto aggiornato con successo'
      });

      logger.info('Codice sconto updated', {
        component: 'codici-sconto-routes',
        action: 'update',
        codiceId: id,
        userId,
        tenantId,
        changes: Object.keys(updateData)
      });

    } catch (error) {
      logger.error('Failed to update codice sconto', {
        component: 'codici-sconto-routes',
        action: 'update',
        codiceId: req.params.id,
        error: 'Operazione non riuscita',
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
 * DELETE /api/codici-sconto/:id
 * Soft delete codice sconto
 */
router.delete('/:id',
  authenticate,
  auditLog('codici_sconto', 'DELETE'),
  [
    param('id').isUUID()
  ],
  validate,
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const userId = req.person.id;
      const { id } = req.params;

      // Verifica esistenza
      const existing = await prisma.codiceSconto.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: {
          preventivi: {
            where: {
              deletedAt: null,
              preventivo: {
                stato: { in: ['BOZZA', 'INVIATO', 'VISUALIZZATO'] }
              }
            }
          }
        }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Codice sconto non trovato'
        });
      }

      // Warning se codice applicato a preventivi attivi
      if (existing.preventivi.length > 0) {
        logger.warn('Deleting codice sconto with active preventivi', {
          component: 'codici-sconto-routes',
          codiceId: id,
          activePreventiviCount: existing.preventivi.length
        });
      }

      // Soft delete
      await prisma.codiceSconto.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          attivo: false // Disattiva anche il codice
        }
      });

      res.json({
        success: true,
        message: 'Codice sconto eliminato con successo',
        warning: existing.preventivi.length > 0
          ? `Codice applicato a ${existing.preventivi.length} preventivi attivi. Gli sconti già applicati rimangono validi.`
          : null
      });

      logger.info('Codice sconto deleted', {
        component: 'codici-sconto-routes',
        action: 'delete',
        codiceId: id,
        codice: existing.codice,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to delete codice sconto', {
        component: 'codici-sconto-routes',
        action: 'delete',
        codiceId: req.params.id,
        error: 'Operazione non riuscita',
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
 * POST /api/codici-sconto/valida-preview
 * Validazione semplificata per preview sconto (solo codice + importo)
 * Usato nel modal EditPreventivo per calcolo in tempo reale
 * 
 * Body:
 * - codice: string (codice da validare)
 * - importo: float (importo su cui calcolare lo sconto)
 * - tipoServizio: enum (opzionale, default ALTRO)
 */
router.post('/valida-preview',
  authenticate,
  [
    body('codice').isString().trim().notEmpty(),
    body('importo').isFloat({ min: 0 }),
    body('tipoServizio').optional().isIn(['CORSO', 'DVR', 'RSPP', 'MEDICO_COMPETENTE', 'CONSULENZA', 'COMPENSO_FORMATORE', 'PRIVACY', 'ALTRO'])
  ],
  validate,
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const { codice: codiceTesto, importo, tipoServizio = 'ALTRO' } = req.body;

      // Trova codice
      const codice = await prisma.codiceSconto.findFirst({
        where: {
          codice: codiceTesto.toUpperCase(),
          tenantId,
          deletedAt: null
        }
      });

      if (!codice) {
        return res.status(200).json({
          valido: false,
          motivo: 'Codice sconto non trovato'
        });
      }

      // Verifica attivo
      if (!codice.attivo) {
        return res.status(200).json({
          valido: false,
          motivo: 'Codice sconto non attivo'
        });
      }

      // Verifica periodo validità
      const now = new Date();
      if (now < codice.dataInizio) {
        return res.status(200).json({
          valido: false,
          motivo: `Codice valido dal ${codice.dataInizio.toLocaleDateString('it-IT')}`
        });
      }
      if (now > codice.dataFine) {
        return res.status(200).json({
          valido: false,
          motivo: 'Codice scaduto'
        });
      }

      // Verifica utilizzo massimo
      if (codice.utilizzoMassimo && codice.utilizzoCorrente >= codice.utilizzoMassimo) {
        return res.status(200).json({
          valido: false,
          motivo: 'Codice esaurito (raggiunto limite utilizzi)'
        });
      }

      // Verifica importo minimo
      if (codice.minImporto && importo < codice.minImporto) {
        return res.status(200).json({
          valido: false,
          motivo: `Importo minimo richiesto: €${codice.minImporto.toFixed(2)}`
        });
      }

      // Verifica servizi applicabili
      if (codice.serviziApplicabili && codice.serviziApplicabili.length > 0) {
        if (!codice.serviziApplicabili.includes(tipoServizio)) {
          return res.status(200).json({
            valido: false,
            motivo: `Codice non applicabile a servizi di tipo ${tipoServizio}`
          });
        }
      }

      // Calcola sconto
      let importoSconto;
      if (codice.tipoSconto === 'PERCENTUALE') {
        importoSconto = (importo * codice.valore) / 100;
        // Applica cap se presente
        if (codice.maxImporto && importoSconto > codice.maxImporto) {
          importoSconto = codice.maxImporto;
        }
      } else {
        importoSconto = Math.min(codice.valore, importo);
      }

      return res.json({
        valido: true,
        codice: {
          id: codice.id,
          codice: codice.codice,
          nome: codice.nome,
          tipoSconto: codice.tipoSconto,
          valore: codice.valore,
          cumulabile: codice.cumulabile,
          maxImporto: codice.maxImporto
        },
        importoSconto: Math.round(importoSconto * 100) / 100,
        importoFinale: Math.round((importo - importoSconto) * 100) / 100
      });

    } catch (error) {
      logger.error('Failed to validate codice sconto preview', {
        component: 'codici-sconto-routes',
        action: 'valida-preview',
        error: 'Operazione non riuscita'
      });
      return res.status(500).json({
        valido: false,
        motivo: 'Errore interno del server'
      });
    }
  }
);

/**
 * POST /api/codici-sconto/valida
 * Valida applicabilità codice sconto (completo con cliente)
 * 
 * Body:
 * - codice: string (codice da validare)
 * - prezzoBase: float (prezzo preventivo)
 * - tipoServizio: enum (tipo servizio preventivo)
 * - clienteId: UUID (azienda o persona)
 * - clienteType: 'azienda'|'persona'
 * - corsoId: UUID (opzionale, se preventivo per corso)
 */
router.post('/valida',
  authenticate,
  [
    body('codice').isString().trim().notEmpty(),
    body('prezzoBase').isFloat({ min: 0 }),
    body('tipoServizio').isIn(['CORSO', 'DVR', 'RSPP', 'MEDICO_COMPETENTE', 'CONSULENZA', 'COMPENSO_FORMATORE', 'PRIVACY', 'ALTRO']),
    body('clienteId').isUUID(),
    body('clienteType').isIn(['azienda', 'persona']),
    body('corsoId').optional().isUUID()
  ],
  validate,
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const userId = req.person.id;
      const { codice: codiceTesto, prezzoBase, tipoServizio, clienteId, clienteType, corsoId } = req.body;

      // Trova codice
      const codice = await prisma.codiceSconto.findFirst({
        where: {
          codice: codiceTesto.toUpperCase(),
          tenantId,
          deletedAt: null
        },
        include: {
          aziende: true,
          persone: true,
          corsi: true
        }
      });

      if (!codice) {
        return res.status(404).json({
          success: false,
          valid: false,
          error: 'Codice sconto non trovato'
        });
      }

      // Array per raccogliere errori di validazione
      const validationErrors = [];

      // 1. Verifica attivo
      if (!codice.attivo) {
        validationErrors.push('Codice sconto non attivo');
      }

      // 2. Verifica periodo validità
      const now = new Date();
      if (now < codice.dataInizio) {
        validationErrors.push(`Codice valido dal ${codice.dataInizio.toLocaleDateString('it-IT')}`);
      }
      if (now > codice.dataFine) {
        validationErrors.push('Codice scaduto');
      }

      // 3. Verifica utilizzo massimo
      if (codice.utilizzoMassimo && codice.utilizzoCorrente >= codice.utilizzoMassimo) {
        validationErrors.push('Codice esaurito (raggiunto limite utilizzi)');
      }

      // 4. Verifica utilizzo per utente
      if (codice.utilizzoPerUtente) {
        const utilizziUtente = await prisma.preventivoSconto.count({
          where: {
            codiceId: codice.id,
            preventivo: {
              OR: [
                { companyTenantProfileId: clienteType === 'azienda' ? clienteId : undefined },
                { personaId: clienteType === 'persona' ? clienteId : undefined }
              ],
              deletedAt: null
            },
            deletedAt: null
          }
        });

        if (utilizziUtente >= codice.utilizzoPerUtente) {
          validationErrors.push(`Cliente ha già utilizzato questo codice ${utilizziUtente} volte (limite: ${codice.utilizzoPerUtente})`);
        }
      }

      // 5. Verifica importo minimo
      if (codice.minImporto && prezzoBase < codice.minImporto) {
        validationErrors.push(`Importo minimo richiesto: €${codice.minImporto}`);
      }

      // 6. Verifica importo massimo
      if (codice.maxImporto && prezzoBase > codice.maxImporto) {
        validationErrors.push(`Importo massimo consentito: €${codice.maxImporto}`);
      }

      // 7. Verifica applicabilità servizio
      if (codice.applicabileServizi.length > 0 && !codice.applicabileServizi.includes(tipoServizio)) {
        validationErrors.push(`Codice non applicabile al servizio ${tipoServizio}`);
      }

      // 8. Verifica applicabilità cliente
      switch (codice.applicabileA) {
        case 'AZIENDE':
          if (clienteType !== 'azienda') {
            validationErrors.push('Codice valido solo per aziende');
          }
          break;
        case 'PERSONE':
          if (clienteType !== 'persona') {
            validationErrors.push('Codice valido solo per persone fisiche');
          }
          break;
        case 'SPECIFICI':
          const isClienteSpecifico = clienteType === 'azienda'
            ? codice.aziende.some(a => a.companyTenantProfileId === clienteId)
            : codice.persone.some(p => p.personaId === clienteId);

          if (!isClienteSpecifico) {
            validationErrors.push('Codice non valido per questo cliente');
          }
          break;
      }

      // 9. Verifica corso specifico
      if (corsoId && codice.tipoCorso === 'SPECIFICI') {
        const isCorsoSpecifico = codice.corsi.some(c => c.corsoId === corsoId);
        if (!isCorsoSpecifico) {
          validationErrors.push('Codice non valido per questo corso');
        }
      }

      // Calcola sconto se valido
      let importoSconto = 0;
      let prezzoFinale = prezzoBase;

      if (validationErrors.length === 0) {
        if (codice.tipoSconto === 'PERCENTUALE') {
          importoSconto = (prezzoBase * codice.valore) / 100;
        } else {
          importoSconto = codice.valore;
        }
        prezzoFinale = Math.max(0, prezzoBase - importoSconto);
      }

      // Risposta
      const isValid = validationErrors.length === 0;

      res.json({
        success: true,
        valid: isValid,
        codice: {
          id: codice.id,
          codice: codice.codice,
          nome: codice.nome,
          descrizione: codice.descrizione,
          tipoSconto: codice.tipoSconto,
          valore: codice.valore,
          cumulabile: codice.cumulabile
        },
        calcolo: isValid ? {
          prezzoBase,
          importoSconto,
          prezzoFinale,
          risparmioPercentuale: ((importoSconto / prezzoBase) * 100).toFixed(2)
        } : null,
        errors: validationErrors.length > 0 ? validationErrors : null
      });

      logger.info('Codice sconto validated', {
        component: 'codici-sconto-routes',
        action: 'valida',
        codiceId: codice.id,
        codice: codice.codice,
        valid: isValid,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to validate codice sconto', {
        component: 'codici-sconto-routes',
        action: 'valida',
        error: 'Operazione non riuscita',
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

export default router;
