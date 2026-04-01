/**
 * Fatturazione Elettronica Routes
 *
 * CRUD completo per fatture elettroniche + invio SDI via AcubeAPI.
 * Gestisce fatture private (visite), aziende (MDL/DVR/RSPP/corsi),
 * acconti, note credito, fatture a terzo (genitore per minore).
 *
 * P97 - Fatturazione Elettronica & SistemaTS Integration
 *
 * Base path: /api/v1/billing/fatture
 */

import express from 'express';
import logger from '../utils/logger.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import prisma from '../config/prisma-optimization.js';
import {
  creaFatturaBozza,
  emettiFattura,
  aggiornaStatoFatturaSDI,
  creaNataCredito
} from '../services/billing/FatturazioneService.js';
import { generateFatturaPdf } from '../services/billing/FatturaElettronicaPdfService.js';
import EmailService from '../services/emailService.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { validateParamId } from '../middleware/validateUUID.js';

import { FEATURE_KEYS, requireAnyFeature } from '../middleware/featureFlags.js';
const router = express.Router();
router.param('id', validateParamId);

const requireBillingFeatureAccess = requireAnyFeature([
  FEATURE_KEYS.FATTURAZIONE_ELETTRONICA,
  FEATURE_KEYS.FATTURAZIONE_PA,
  FEATURE_KEYS.FATTURAZIONE_SPLIT_PAYMENT
]);

// ---------------------------------------------------------------------------
// GET /api/v1/billing/fatture
// Lista fatture con filtri
// ---------------------------------------------------------------------------
router.get('/',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const {
        stato, tipoDocumento, enteEmittenteId, clienteType,
        from, to, search, page = 1, limit = 50,
        clientePersonaId, clienteAziendaId, visitaId, courseScheduleId, nominaId, sopralluogoId, dvrId
      } = req.query;

      const where = {
        tenantId,
        deletedAt: null,
        ...(stato && { stato }),
        ...(tipoDocumento && { tipoDocumento }),
        ...(enteEmittenteId && { enteEmittenteId }),
        ...(clienteType && { clienteType }),
        ...(clientePersonaId && { clientePersonaId }),
        ...(clienteAziendaId && { clienteAziendaId }),
        ...(visitaId && { visitaId }),
        ...(courseScheduleId && { courseScheduleId }),
        ...(nominaId && { nominaId }),
        ...(sopralluogoId && { sopralluogoId }),
        ...(dvrId && { dvrId }),
        ...(from || to ? {
          dataEmissione: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) })
          }
        } : {}),
        ...(search ? {
          OR: [
            { numero: { contains: search, mode: 'insensitive' } },
            { cessionarioDenominazione: { contains: search, mode: 'insensitive' } },
            { cessionarioCF: { contains: search, mode: 'insensitive' } },
          ]
        } : {})
      };

      const [total, fatture] = await Promise.all([
        prisma.fatturaElettronica.count({ where }),
        prisma.fatturaElettronica.findMany({
          where,
          orderBy: { dataEmissione: 'desc' },
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
          include: {
            enteEmittente: { select: { id: true, denominazione: true, tipo: true } },
            linee: { orderBy: { numeroLinea: 'asc' } },
          }
        })
      ]);

      return res.json({
        data: fatture,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      logger.error('Errore GET fatture', { error: 'Operazione non riuscita', tenantId: req.person?.tenantId });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/billing/fatture/stats
// Statistiche aggregated per dashboard
// ---------------------------------------------------------------------------
router.get('/stats',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const { from, to } = req.query;

      const dateFilter = (from || to) ? {
        dataEmissione: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) })
        }
      } : {};

      const baseWhere = { tenantId, deletedAt: null, ...dateFilter };

      const [
        bozze, emesse, pagate, annullate, stornate,
        totaleEmesso, totaleIncassato
      ] = await Promise.all([
        prisma.fatturaElettronica.count({ where: { ...baseWhere, stato: 'BOZZA' } }),
        prisma.fatturaElettronica.count({ where: { ...baseWhere, stato: 'EMESSA' } }),
        prisma.fatturaElettronica.count({ where: { ...baseWhere, stato: 'PAGATA' } }),
        prisma.fatturaElettronica.count({ where: { ...baseWhere, stato: 'ANNULLATA' } }),
        prisma.fatturaElettronica.count({ where: { ...baseWhere, stato: 'STORNATA' } }),
        prisma.fatturaElettronica.aggregate({
          where: { ...baseWhere, stato: { in: ['EMESSA', 'PAGATA'] } },
          _sum: { totale: true }
        }),
        prisma.fatturaElettronica.aggregate({
          where: { ...baseWhere, stato: 'PAGATA' },
          _sum: { totale: true }
        }),
      ]);

      // SDI status breakdown
      const sdiStats = await prisma.fatturaElettronica.groupBy({
        by: ['acubeStatus'],
        where: { ...baseWhere, stato: { not: 'BOZZA' } },
        _count: true
      });

      return res.json({
        data: {
          contatori: { bozze, emesse, pagate, annullate, stornate },
          totali: {
            emesso: totaleEmesso._sum.totale || 0,
            incassato: totaleIncassato._sum.totale || 0,
          },
          sdi: Object.fromEntries(sdiStats.map(s => [s.acubeStatus, s._count]))
        }
      });
    } catch (error) {
      logger.error('Errore GET fatture/stats', { error: error.message });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/billing/fatture/:id
// Dettaglio singola fattura con linee e log SistemaTS
// ---------------------------------------------------------------------------
router.get('/:id',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const fattura = await prisma.fatturaElettronica.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: {
          enteEmittente: {
            select: { id: true, denominazione: true, tipo: true, pec: true }
          },
          linee: { orderBy: { numeroLinea: 'asc' } },
          sistemaTsSyncLogs: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          fatturaOrigine: {
            select: { id: true, numero: true, dataEmissione: true }
          },
          noteCreditoEmesse: {
            where: { deletedAt: null },
            select: { id: true, numero: true, dataEmissione: true, totale: true, stato: true }
          }
        }
      });

      if (!fattura) {
        return res.status(404).json({ error: 'Fattura non trovata' });
      }

      return res.json({ data: fattura });
    } catch (error) {
      logger.error('Errore GET fattura/:id', { error: error.message });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/billing/fatture
// Crea nuova fattura in stato BOZZA
// ---------------------------------------------------------------------------
router.post('/',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:write'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const input = req.body;

      const fattura = await creaFatturaBozza(input, tenantId, req.person.id);

      logger.info('Fattura bozza creata', {
        id: fattura.id,
        numero: fattura.numero,
        tenantId
      });

      return res.status(201).json({ data: fattura });
    } catch (error) {
      logger.error('Errore POST fatture', { error: 'Operazione non riuscita', tenantId: req.person?.tenantId });

      if (error.message.includes('obbligatori') || error.message.includes('non trovato')) {
        return res.status(400).json({ error: 'Errore interno del server' });
      }
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/v1/billing/fatture/:id
// Aggiorna fattura (solo stato BOZZA)
// ---------------------------------------------------------------------------
router.put('/:id',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const existing = await prisma.fatturaElettronica.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Fattura non trovata' });
      }

      if (existing.stato !== 'BOZZA') {
        return res.status(409).json({
          error: `Impossibile modificare una fattura in stato ${existing.stato}. Solo le bozze possono essere modificate.`
        });
      }

      const {
        enteEmittenteId, tipoDocumento, tipoServizio, dataEmissione, dataScadenza,
        clienteType, clientePersonaId, clienteAziendaId,
        terzoPaganteTipo, terzoPersonaId, terzoAziendaId,
        condizioniPagamento, modalitaPagamento, iban,
        preventivoId, visitaId, courseScheduleId, nominaId, sopralluogoId, dvrId,
        linee, sistemaTsFlagOpp
      } = req.body;

      // Aggiorna campi della fattura
      const updateData = {};
      // Se cambia ente emittente, aggiorna anche snapshot cedente
      if (enteEmittenteId !== undefined && enteEmittenteId !== existing.enteEmittenteId) {
        const nuovoEnte = await prisma.enteEmittente.findFirst({
          where: { id: enteEmittenteId, tenantId, deletedAt: null, isActive: true }
        });
        if (!nuovoEnte) {
          return res.status(400).json({ error: 'Ente emittente non trovato o non attivo' });
        }
        updateData.enteEmittenteId = enteEmittenteId;
        updateData.cedenteDenominazione = nuovoEnte.denominazione;
        updateData.cedenteCF = nuovoEnte.codiceFiscale;
        updateData.cedentePIVA = nuovoEnte.piva;
        updateData.cedenteIndirizzo = nuovoEnte.indirizzo;
        updateData.cedenteCitta = nuovoEnte.citta;
        updateData.cedenteCAP = nuovoEnte.cap;
        updateData.cedenteProvincia = nuovoEnte.provincia;
        updateData.cedenteRegimeFiscale = nuovoEnte.regimeFiscale;
      }
      if (tipoDocumento !== undefined) updateData.tipoDocumento = tipoDocumento;
      if (tipoServizio !== undefined) updateData.tipoServizio = tipoServizio;
      if (dataEmissione !== undefined) updateData.dataEmissione = new Date(dataEmissione);
      if (dataScadenza !== undefined) updateData.dataScadenza = new Date(dataScadenza);
      if (clienteType !== undefined) updateData.clienteType = clienteType;
      if (clientePersonaId !== undefined) updateData.clientePersonaId = clientePersonaId;
      if (clienteAziendaId !== undefined) updateData.clienteAziendaId = clienteAziendaId;
      if (terzoPaganteTipo !== undefined) updateData.terzoPaganteTipo = terzoPaganteTipo;
      if (terzoPersonaId !== undefined) updateData.terzoPersonaId = terzoPersonaId;
      if (terzoAziendaId !== undefined) updateData.terzoAziendaId = terzoAziendaId;
      if (condizioniPagamento !== undefined) updateData.condizioniPagamento = condizioniPagamento;
      if (modalitaPagamento !== undefined) updateData.modalitaPagamento = modalitaPagamento;
      if (iban !== undefined) updateData.iban = iban;
      if (preventivoId !== undefined) updateData.preventivoId = preventivoId;
      if (visitaId !== undefined) updateData.visitaId = visitaId;
      if (courseScheduleId !== undefined) updateData.courseScheduleId = courseScheduleId;
      if (nominaId !== undefined) updateData.nominaId = nominaId;
      if (sopralluogoId !== undefined) updateData.sopralluogoId = sopralluogoId;
      if (dvrId !== undefined) updateData.dvrId = dvrId;
      if (sistemaTsFlagOpp !== undefined) updateData.sistemaTsFlagOpp = sistemaTsFlagOpp;

      // Se ci sono linee, sostituiscile completamente
      const updatedFattura = await prisma.$transaction(async (tx) => {
        if (linee !== undefined) {
          await tx.fatturaElettronicaLinea.deleteMany({ where: { fatturaId: id } });
          if (linee.length > 0) {
            await tx.fatturaElettronicaLinea.createMany({
              data: linee.map((l, idx) => ({
                fatturaId: id,
                tenantId,
                numeroLinea: l.numeroLinea ?? idx + 1,
                descrizione: l.descrizione,
                quantita: l.quantita ?? 1,
                unitaMisura: l.unitaMisura,
                prezzoUnitario: l.prezzoUnitario,
                prezzoTotale: parseFloat(l.prezzoUnitario) * parseFloat(l.quantita ?? 1),
                aliquotaIva: l.aliquotaIva ?? 22,
                natura: l.natura
              }))
            });

            // Ricalcola totali
            const totLinee = linee.reduce((acc, l) => {
              const imponibile = parseFloat(l.prezzoUnitario) * parseFloat(l.quantita ?? 1);
              const iva = imponibile * (parseFloat(l.aliquotaIva ?? 22) / 100);
              return { imponibile: acc.imponibile + imponibile, iva: acc.iva + iva };
            }, { imponibile: 0, iva: 0 });

            updateData.imponibile = totLinee.imponibile;
            updateData.importoIva = totLinee.iva;
            updateData.totale = totLinee.imponibile + totLinee.iva;
          }
        }

        return tx.fatturaElettronica.update({
          where: { id },
          data: updateData,
          include: { linee: { orderBy: { numeroLinea: 'asc' } } }
        });
      });

      return res.json({ data: updatedFattura });
    } catch (error) {
      logger.error('Errore PUT fattura/:id', { error: error.message });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/v1/billing/fatture/:id
// Soft-delete (solo stato BOZZA)
// ---------------------------------------------------------------------------
router.delete('/:id',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const { deletionReason } = req.body;

      if (!deletionReason || deletionReason.trim().length < 10) {
        return res.status(400).json({ error: 'deletionReason obbligatorio (minimo 10 caratteri)' });
      }

      const fattura = await prisma.fatturaElettronica.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!fattura) {
        return res.status(404).json({ error: 'Fattura non trovata' });
      }

      if (fattura.stato !== 'BOZZA') {
        return res.status(409).json({
          error: `Impossibile eliminare una fattura in stato ${fattura.stato}. Solo le bozze possono essere eliminate.`
        });
      }

      await prisma.fatturaElettronica.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      // GdprAuditLog
      await prisma.gdprAuditLog.create({
        data: {
          tenantId,
          performedById: req.person.id,
          resourceType: 'FatturaElettronica',
          resourceId: id,
          action: 'DELETE',
          dataAccessed: ['numero', 'cessionarioCF', 'totale'],
          reason: deletionReason
        }
      }).catch(err => logger.warn('GdprAuditLog failed', { err: err.message }));

      return res.json({ message: 'Fattura eliminata correttamente' });
    } catch (error) {
      logger.error('Errore DELETE fattura/:id', { error: error.message });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/billing/fatture/:id/emetti
// Invia fattura allo SDI tramite AcubeAPI
// ---------------------------------------------------------------------------
router.post('/:id/emetti',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const fattura = await emettiFattura(id, tenantId);

      logger.info('Fattura emessa', {
        id,
        numero: fattura.numero,
        acubeUuid: fattura.acubeUuid,
        tenantId
      });

      return res.json({
        data: fattura,
        message: `Fattura ${fattura.numero} inviata allo SDI`
      });
    } catch (error) {
      logger.error('Errore POST fattura/:id/emetti', {
        fatturaId: req.params.id,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 4).join(' | ')
      });

      if (error.message.includes('non trovata')) {
        return res.status(404).json({ error: 'Fattura non trovata' });
      }
      if (error.message.includes('non può essere emessa') || error.message.includes('non emettibile')) {
        return res.status(409).json({ error: 'La fattura non può essere emessa nello stato corrente' });
      }
      if (error.code === 'VALIDATION_PRE_EMISSIONE') {
        return res.status(422).json({
          error: 'Dati incompleti per l\'emissione. Completare i campi obbligatori.',
          campiMancanti: error.campiMancanti || [],
        });
      }
      if (error.message.includes('AcubeAPI validazione')) {
        // Log dettagli interni per debug server-side, NON esporre al client
        logger.warn('AcubeAPI validation details', { rawError: error.message });
        return res.status(422).json({
          error: 'Dati fattura non validi per lo SDI. Controllare i campi obbligatori.',
        });
      }
      if (error.message.includes('AcubeAPI')) {
        return res.status(502).json({ error: 'Errore comunicazione SDI. Riprovare più tardi.' });
      }
      return res.status(500).json({ error: 'Errore interno durante l\'emissione della fattura' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/billing/fatture/:id/nota-credito
// Crea nota di credito (TD04) per stornare una fattura emessa
// ---------------------------------------------------------------------------
router.post('/:id/nota-credito',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const { note } = req.body;

      const notaCredito = await creaNataCredito(id, tenantId, req.person.id, note);

      logger.info('Nota di credito creata', {
        notaCreditoId: notaCredito.id,
        fatturaOrigineId: id,
        tenantId
      });

      return res.status(201).json({
        data: notaCredito,
        message: `Nota di credito ${notaCredito.numero} creata come bozza`
      });
    } catch (error) {
      logger.error('Errore POST fattura/:id/nota-credito', { error: error.message });

      if (error.message.includes('non trovata') || error.message.includes('non può')) {
        return res.status(400).json({ error: 'Errore interno del server' });
      }
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/billing/fatture/:id/segna-pagata
// Segna fattura come pagata (riconciliazione manuale)
// ---------------------------------------------------------------------------
router.post('/:id/segna-pagata',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const { dataPagamento, note } = req.body;

      const fattura = await prisma.fatturaElettronica.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!fattura) {
        return res.status(404).json({ error: 'Fattura non trovata' });
      }

      if (fattura.stato !== 'EMESSA') {
        return res.status(409).json({
          error: `Solo le fatture EMESSA possono essere segnate come pagate. Stato attuale: ${fattura.stato}`
        });
      }

      const updated = await prisma.fatturaElettronica.update({
        where: { id },
        data: { stato: 'PAGATA' }
      });

      logger.info('Fattura segnata come pagata', { id, tenantId });

      return res.json({ data: updated, message: 'Fattura segnata come pagata' });
    } catch (error) {
      logger.error('Errore POST fattura/:id/segna-pagata', { error: error.message });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/billing/webhook/acube
// Webhook ricevuto da AcubeAPI per aggiornare lo stato SDI
// Nota: questa route NON richiede autenticazione JWT (chiamata da AcubeAPI),
//       ma è protetta con un shared secret configurato via ACUBE_WEBHOOK_SECRET.
//       Il chiamante deve inviare: Authorization: Bearer <ACUBE_WEBHOOK_SECRET>
// ---------------------------------------------------------------------------

/**
 * Verifica il shared secret del webhook AcubeAPI.
 * Se ACUBE_WEBHOOK_SECRET è configurato, richiede il header corrispondente.
 * Se non configurato, logga un avviso di sicurezza e prosegue (backward compat).
 */
const verifyAcubeWebhookSecret = (req, res, next) => {
  const webhookSecret = process.env.ACUBE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    // Missing secret is always a misconfiguration — block the request regardless of environment
    logger.error('[Security] ACUBE_WEBHOOK_SECRET non configurato — webhook bloccato', {
      ip: req.ip,
      path: req.path
    });
    return res.status(503).json({ error: 'Webhook non disponibile: configurazione mancante' });
  }

  // Accetta sia Authorization: Bearer <secret> sia x-webhook-secret: <secret>
  const authHeader = req.headers['authorization'];
  const secretHeader = req.headers['x-webhook-secret'];
  const providedSecret = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : secretHeader;

  if (!providedSecret || providedSecret !== webhookSecret) {
    logger.warn('[Security] Webhook AcubeAPI: secret non valido o assente', {
      ip: req.ip,
      hasAuth: !!authHeader,
      hasSecretHeader: !!secretHeader
    });
    return res.status(401).json({ error: 'Webhook non autorizzato' });
  }

  return next();
};

router.post('/webhook/acube',
  verifyAcubeWebhookSecret,
  async (req, res) => {
    try {
      const { uuid, status, xml_esito } = req.body;

      if (!uuid || !status) {
        return res.status(400).json({ error: 'uuid e status obbligatori' });
      }

      // Valida formato UUID per prevenire injection
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_REGEX.test(uuid)) {
        return res.status(400).json({ error: 'uuid non valido' });
      }

      await aggiornaStatoFatturaSDI(uuid, status.toUpperCase(), xml_esito);

      logger.info('Webhook AcubeAPI processato', { uuid, status });

      return res.json({ received: true });
    } catch (error) {
      logger.error('Errore webhook AcubeAPI', { error: error.message });
      // Risponde sempre 200 per evitare retry infiniti da AcubeAPI
      return res.json({ received: true, warning: 'Processing warning' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/billing/fatture/:id/pdf
// Genera e scarica il PDF della fattura
// ---------------------------------------------------------------------------
router.get('/:id/pdf',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const { buffer, filename } = await generateFatturaPdf(id, tenantId);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
        'Cache-Control': 'no-cache',
      });

      return res.send(buffer);
    } catch (error) {
      logger.error('Errore GET fattura/:id/pdf', { error: error.message });
      if (error.message.includes('non trovata')) {
        return res.status(404).json({ error: 'Errore interno del server' });
      }
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/billing/fatture/:id/invia-email
// Invia il PDF della fattura via email al cessionario
// Body: { email?: string, messaggio?: string }
//   - email: override destinatario (se non passato, usa email/pec del cessionario)
//   - messaggio: testo aggiuntivo nel corpo email
// ---------------------------------------------------------------------------
router.post('/:id/invia-email',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const { email: emailOverride, messaggio } = req.body;

      // 1. Genera il PDF
      const { buffer, filename, fattura } = await generateFatturaPdf(id, tenantId);

      // 2. Determina destinatario
      const destinatario = emailOverride
        || fattura.cessionarioPEC
        || (() => {
          // Fallback: cerca email del cliente nelle relazioni
          return null;
        })();

      if (!destinatario) {
        return res.status(400).json({
          error: 'Indirizzo email destinatario non disponibile. Passare il campo "email" nel body o configurare la PEC/email del cessionario.'
        });
      }

      // Validazione base email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(destinatario)) {
        return res.status(400).json({ error: 'Indirizzo email non valido' });
      }

      // 3. Prepara corpo email
      const tipoLabel = fattura.tipoDocumento === 'NOTA_CREDITO' ? 'Nota di credito' : 'Fattura';
      const subjectLine = `${tipoLabel} n. ${fattura.numero} del ${new Date(fattura.dataEmissione).toLocaleDateString('it-IT')}`;
      const bodyText = messaggio
        || `Gentile ${fattura.cessionarioDenominazione},\n\nin allegato ${tipoLabel.toLowerCase()} n. ${fattura.numero} del ${new Date(fattura.dataEmissione).toLocaleDateString('it-IT')} per un importo di ${Number(fattura.totale).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}.\n\nDistinti saluti,\n${fattura.cedenteDenominazione}`;

      // 4. Invia email con allegato
      await EmailService.send({
        to: destinatario,
        tenantId,
        template: 'fattura_elettronica',
        data: {
          subject: subjectLine,
          bodyHtml: `<p>${bodyText.replace(/\n/g, '<br>')}</p>`,
          bodyText,
          tipoLabel,
          numero: fattura.numero,
          dataEmissione: new Date(fattura.dataEmissione).toLocaleDateString('it-IT'),
          totale: Number(fattura.totale).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }),
          cedenteDenominazione: fattura.cedenteDenominazione,
          cessionarioDenominazione: fattura.cessionarioDenominazione,
        },
        attachments: [{
          filename,
          content: buffer,
          contentType: 'application/pdf',
        }],
      });

      logger.info('[fatture-routes] PDF fattura inviato via email', {
        fatturaId: id,
        numero: fattura.numero,
        destinatario,
        tenantId,
      });

      return res.json({
        message: `${tipoLabel} ${fattura.numero} inviata correttamente a ${destinatario}`,
        destinatario,
        filename,
      });
    } catch (error) {
      logger.error('Errore POST fattura/:id/invia-email', { error: error.message });
      if (error.message.includes('non trovata')) {
        return res.status(404).json({ error: 'Errore interno del server' });
      }
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

export default router;
