/**
 * Malattie Professionali Routes
 * 
 * CRUD per gestione malattie professionali dei lavoratori
 * secondo D.Lgs 81/08 Art. 40 e normativa INAIL
 * 
 * @module routes/clinica/malattie-professionali.routes
 */

import express from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import logger from '../../utils/logger.js';
import { validateParamId, validateParam } from '../../middleware/validateUUID.js';
import prisma from '../../config/prisma-optimization.js';

const router = express.Router();
router.param('id', validateParamId);
router.param('personId', validateParam('personId'));

/**
 * @route GET /api/v1/clinica/malattie-professionali
 * @desc Lista malattie professionali con filtri
 * @access Private - VIEW_VISITA
 */
router.get('/', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { personId, companyTenantProfileId, anno, tipologia, esito, page = 1, limit = 50 } = req.query;

    const where = {
      tenantId,
      deletedAt: null,
    };

    if (personId) where.personId = personId;
    if (companyTenantProfileId) where.companyTenantProfileId = companyTenantProfileId;
    if (tipologia) where.tipologia = tipologia;
    if (esito) where.esito = esito;

    if (anno) {
      const annoInt = parseInt(anno);
      where.dataDiagnosi = {
        gte: new Date(`${annoInt}-01-01`),
        lte: new Date(`${annoInt}-12-31`),
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      prisma.malattiaProfessionale.findMany({
        where,
        include: {
          person: {
            select: { id: true, firstName: true, lastName: true, taxCode: true, gender: true },
          },
          companyTenantProfile: {
            select: {
              id: true,
              company: { select: { id: true, ragioneSociale: true } },
            },
          },
        },
        orderBy: { dataDiagnosi: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.malattiaProfessionale.count({ where }),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Errore lista malattie professionali');
    res.status(500).json({ error: 'Errore nel recupero delle malattie professionali' });
  }
});

/**
 * @route GET /api/v1/clinica/malattie-professionali/by-person/:personId
 * @desc Malattie professionali di una persona specifica
 * @access Private - VIEW_VISITA
 */
router.get('/by-person/:personId', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { personId } = req.params;

    const data = await prisma.malattiaProfessionale.findMany({
      where: {
        tenantId,
        personId,
        deletedAt: null,
      },
      include: {
        companyTenantProfile: {
          select: {
            id: true,
            company: { select: { id: true, ragioneSociale: true } },
          },
        },
      },
      orderBy: { dataDiagnosi: 'desc' },
    });

    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error: error.message }, 'Errore malattie professionali persona');
    res.status(500).json({ error: 'Errore nel recupero delle malattie professionali' });
  }
});

/**
 * @route GET /api/v1/clinica/malattie-professionali/by-company/:companyTenantProfileId
 * @desc Malattie professionali per azienda (usato da Allegato 3B)
 * @access Private - VIEW_VISITA
 */
router.get('/by-company/:companyTenantProfileId', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { companyTenantProfileId } = req.params;
    const { anno } = req.query;

    const where = {
      tenantId,
      companyTenantProfileId,
      deletedAt: null,
    };

    if (anno) {
      const annoInt = parseInt(anno);
      where.dataDiagnosi = {
        gte: new Date(`${annoInt}-01-01`),
        lte: new Date(`${annoInt}-12-31`),
      };
    }

    const data = await prisma.malattiaProfessionale.findMany({
      where,
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true, taxCode: true },
        },
      },
      orderBy: { dataDiagnosi: 'desc' },
    });

    // Aggregazione per patologia (per Allegato 3B)
    const perPatologia = {};
    data.forEach(mp => {
      const key = mp.codiceNosologico || mp.denominazione;
      if (!perPatologia[key]) {
        perPatologia[key] = {
          codice: mp.codiceNosologico,
          denominazione: mp.denominazione,
          totale: 0,
          sospette: 0,
          accertate: 0,
        };
      }
      perPatologia[key].totale++;
      if (mp.tipologia === 'SOSPETTA') perPatologia[key].sospette++;
      if (mp.tipologia === 'ACCERTATA') perPatologia[key].accertate++;
    });

    res.json({
      success: true,
      data,
      aggregazione: {
        totale: data.length,
        perPatologia: Object.values(perPatologia),
      },
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Errore malattie professionali azienda');
    res.status(500).json({ error: 'Errore nel recupero delle malattie professionali' });
  }
});

/**
 * @route GET /api/v1/clinica/malattie-professionali/:id
 * @desc Dettaglio singola malattia professionale
 * @access Private - VIEW_VISITA
 */
router.get('/:id', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    const malattia = await prisma.malattiaProfessionale.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true, taxCode: true, gender: true, birthDate: true },
        },
        companyTenantProfile: {
          select: {
            id: true,
            company: { select: { id: true, ragioneSociale: true } },
          },
        },
      },
    });

    if (!malattia) {
      return res.status(404).json({ error: 'Malattia professionale non trovata' });
    }

    res.json({ success: true, data: malattia });
  } catch (error) {
    logger.error({ error: error.message }, 'Errore dettaglio malattia professionale');
    res.status(500).json({ error: 'Errore nel recupero della malattia professionale' });
  }
});

/**
 * @route POST /api/v1/clinica/malattie-professionali
 * @desc Registra nuova malattia professionale
 * @access Private - CREATE_VISITA
 */
router.post('/', requireAuth, requirePermission('clinica.visite:create'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const {
      personId,
      companyTenantProfileId,
      codiceNosologico,
      denominazione,
      dataDiagnosi,
      dataNotificaINAIL,
      agenteCausale,
      tipologia,
      esito,
      note,
    } = req.body;

    if (!personId || !companyTenantProfileId || !denominazione || !dataDiagnosi) {
      return res.status(400).json({
        error: 'Dati obbligatori mancanti: personId, companyTenantProfileId, denominazione, dataDiagnosi',
      });
    }

    // Verifica che la persona esista e appartenga al tenant
    const person = await prisma.person.findFirst({
      where: { id: personId, deletedAt: null },
    });
    if (!person) {
      return res.status(404).json({ error: 'Persona non trovata' });
    }

    // Verifica che il profilo aziendale appartenga al tenant
    const profile = await prisma.companyTenantProfile.findFirst({
      where: { id: companyTenantProfileId, tenantId, deletedAt: null },
    });
    if (!profile) {
      return res.status(404).json({ error: 'Profilo aziendale non trovato' });
    }

    const malattia = await prisma.malattiaProfessionale.create({
      data: {
        personId,
        tenantId,
        companyTenantProfileId,
        codiceNosologico: codiceNosologico || null,
        denominazione,
        dataDiagnosi: new Date(dataDiagnosi),
        dataNotificaINAIL: dataNotificaINAIL ? new Date(dataNotificaINAIL) : null,
        agenteCausale: agenteCausale || null,
        tipologia: tipologia || 'SOSPETTA',
        esito: esito || 'IN_ACCERTAMENTO',
        note: note || null,
      },
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true, taxCode: true },
        },
        companyTenantProfile: {
          select: {
            id: true,
            company: { select: { id: true, ragioneSociale: true } },
          },
        },
      },
    });

    logger.info({ malattiaId: malattia.id, personId, tenantId }, 'Malattia professionale registrata');
    res.status(201).json({ success: true, data: malattia });
  } catch (error) {
    logger.error({ error: error.message }, 'Errore creazione malattia professionale');
    res.status(500).json({ error: 'Errore nella registrazione della malattia professionale' });
  }
});

/**
 * @route PUT /api/v1/clinica/malattie-professionali/:id
 * @desc Aggiorna malattia professionale
 * @access Private - EDIT_VISITA
 */
router.put('/:id', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const {
      codiceNosologico,
      denominazione,
      dataDiagnosi,
      dataNotificaINAIL,
      agenteCausale,
      tipologia,
      esito,
      note,
    } = req.body;

    const existing = await prisma.malattiaProfessionale.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Malattia professionale non trovata' });
    }

    const updateData = {};
    if (codiceNosologico !== undefined) updateData.codiceNosologico = codiceNosologico || null;
    if (denominazione !== undefined) updateData.denominazione = denominazione;
    if (dataDiagnosi !== undefined) updateData.dataDiagnosi = new Date(dataDiagnosi);
    if (dataNotificaINAIL !== undefined) updateData.dataNotificaINAIL = dataNotificaINAIL ? new Date(dataNotificaINAIL) : null;
    if (agenteCausale !== undefined) updateData.agenteCausale = agenteCausale || null;
    if (tipologia !== undefined) updateData.tipologia = tipologia;
    if (esito !== undefined) updateData.esito = esito;
    if (note !== undefined) updateData.note = note || null;

    const malattia = await prisma.malattiaProfessionale.update({
      where: { id },
      data: updateData,
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true, taxCode: true },
        },
        companyTenantProfile: {
          select: {
            id: true,
            company: { select: { id: true, ragioneSociale: true } },
          },
        },
      },
    });

    logger.info({ malattiaId: id, tenantId }, 'Malattia professionale aggiornata');
    res.json({ success: true, data: malattia });
  } catch (error) {
    logger.error({ error: error.message }, 'Errore aggiornamento malattia professionale');
    res.status(500).json({ error: 'Errore nell\'aggiornamento della malattia professionale' });
  }
});

/**
 * @route DELETE /api/v1/clinica/malattie-professionali/:id
 * @desc Soft delete malattia professionale
 * @access Private - DELETE_VISITA
 */
router.delete('/:id', requireAuth, requirePermission('clinica.visite:delete'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    const existing = await prisma.malattiaProfessionale.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Malattia professionale non trovata' });
    }

    await prisma.malattiaProfessionale.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // GdprAuditLog per soft delete
    await prisma.gdprAuditLog.create({
      data: {
        tenantId,
        personId: req.person.id,
        action: 'DELETE',
        resourceType: 'MalattiaProfessionale',
        resourceId: id,
        dataAccessed: ['malattia_professionale', 'dati_sanitari'],
        deletionReason: req.body?.deletionReason || 'Eliminazione malattia professionale',
      },
    });

    logger.info({ malattiaId: id, tenantId }, 'Malattia professionale eliminata (soft)');
    res.json({ success: true, message: 'Malattia professionale eliminata' });
  } catch (error) {
    logger.error({ error: error.message }, 'Errore eliminazione malattia professionale');
    res.status(500).json({ error: 'Errore nell\'eliminazione della malattia professionale' });
  }
});

export default router;
