/**
 * Sistema TS Routes
 *
 * Sincronizzazione spese sanitarie con il Sistema Tessera Sanitaria (MEF).
 * Gestisce invio, verifica stato e dashboard di salute integrazione.
 *
 * P97 - Fatturazione Elettronica & SistemaTS Integration
 *
 * Base path: /api/v1/billing/sistema-ts
 */

import express from 'express';
import logger from '../utils/logger.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import prisma from '../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import {
  sincronizzaSistemaTS,
  testConnessioneSistemaTS,
  elencaSpese
} from '../services/billing/SistemaTSService.js';

import { FEATURE_KEYS, requireAnyFeature } from '../middleware/featureFlags.js';
const router = express.Router();

const requireBillingFeatureAccess = requireAnyFeature([
  FEATURE_KEYS.FATTURAZIONE_ELETTRONICA,
  FEATURE_KEYS.FATTURAZIONE_PA,
  FEATURE_KEYS.FATTURAZIONE_SPLIT_PAYMENT
]);

// ---------------------------------------------------------------------------
// GET /api/v1/billing/sistema-ts/dashboard
// Dashboard di salute integrazione SistemaTS per tutti gli enti del tenant
// ---------------------------------------------------------------------------
router.get('/dashboard',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);

      // Enti con SistemaTS abilitato
      const enti = await prisma.enteEmittente.findMany({
        where: { tenantId, deletedAt: null, sistemaTsAbilitato: true, isActive: true },
        select: {
          id: true,
          denominazione: true,
          tipo: true,
          codiceFiscale: true,
          sistemaTsPinCode: true,
          sistemaTsUsername: true
        }
      });

      // Statistiche sincronizzazione per ente
      const now = new Date();
      const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const statsPerEnte = await Promise.all(
        enti.map(async (ente) => {
          const [totale, successi, errori, ultimoLog] = await Promise.all([
            prisma.sistemaTSSyncLog.count({
              where: {
                tenantId,
                createdAt: { gte: last30days },
                fattura: { enteEmittenteId: ente.id }
              }
            }),
            prisma.sistemaTSSyncLog.count({
              where: {
                tenantId,
                createdAt: { gte: last30days },
                outcome: 0,
                fattura: { enteEmittenteId: ente.id }
              }
            }),
            prisma.sistemaTSSyncLog.count({
              where: {
                tenantId,
                createdAt: { gte: last30days },
                outcome: 1,
                fattura: { enteEmittenteId: ente.id }
              }
            }),
            prisma.sistemaTSSyncLog.findFirst({
              where: { tenantId, fattura: { enteEmittenteId: ente.id } },
              orderBy: { createdAt: 'desc' },
              select: { createdAt: true, outcome: true, protocol: true }
            })
          ]);

          return {
            enteId: ente.id,
            denominazione: ente.denominazione,
            tipo: ente.tipo,
            codiceFiscale: ente.codiceFiscale,
            // SaaS: ACube usa master token ElementMedica, configurazione = credenziali SistemaTS
            configurato: !!(ente.sistemaTsPinCode && ente.sistemaTsUsername),
            stats30giorni: { totale, successi, errori, warnings: totale - successi - errori },
            ultimaSync: ultimoLog
          };
        })
      );

      // Fatture pending (cliniche, senza sistemaTsProtocol)
      const fatturePending = await prisma.fatturaElettronica.count({
        where: {
          tenantId,
          deletedAt: null,
          stato: { in: ['EMESSA', 'PAGATA'] },
          tipoServizio: { in: ['VISITA', 'PRESTAZIONE_CLINICA'] },
          sistemaTsProtocol: null,
          enteEmittente: { sistemaTsAbilitato: true }
        }
      });

      return res.json({
        data: {
          enti: statsPerEnte,
          fatturePendingSistemaTs: fatturePending
        }
      });
    } catch (error) {
      logger.error('Errore GET sistema-ts/dashboard', { error: error.message });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/billing/sistema-ts/sincronizza
// Invia spesa sanitaria al SistemaTS per una fattura specifica
// ---------------------------------------------------------------------------
router.post('/sincronizza',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:write'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const { fatturaId, cfPaziente } = req.body;

      if (!fatturaId) {
        return res.status(400).json({ error: 'fatturaId obbligatorio' });
      }

      // Verifica che la fattura appartenga al tenant
      const fattura = await prisma.fatturaElettronica.findFirst({
        where: { id: fatturaId, tenantId, deletedAt: null }
      });

      if (!fattura) {
        return res.status(404).json({ error: 'Fattura non trovata' });
      }

      if (fattura.stato === 'BOZZA') {
        return res.status(409).json({
          error: 'Impossibile sincronizzare una fattura in stato BOZZA. Emettila prima.'
        });
      }

      const result = await sincronizzaSistemaTS(fatturaId, cfPaziente, tenantId);

      if (!result.success) {
        return res.status(422).json({
          ok: false,
          error: result.error,
          outcome: result.outcome,
          messages: result.messages
        });
      }

      logger.info('Spesa sanitaria inviata a SistemaTS', {
        fatturaId,
        protocol: result.protocol,
        tenantId
      });

      return res.json({
        ok: true,
        protocol: result.protocol,
        outcome: result.outcome,
        messages: result.messages,
        message: `Spesa inviata al Sistema TS. Protocollo: ${result.protocol}`
      });
    } catch (error) {
      logger.error('Errore POST sistema-ts/sincronizza', { error: error.message });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/billing/sistema-ts/sincronizza-batch
// Invia in batch tutte le fatture cliniche pending per il tenant
// ---------------------------------------------------------------------------
router.post('/sincronizza-batch',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:write'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);

      const fatturePending = await prisma.fatturaElettronica.findMany({
        where: {
          tenantId,
          deletedAt: null,
          stato: { in: ['EMESSA', 'PAGATA'] },
          tipoServizio: { in: ['VISITA', 'PRESTAZIONE_CLINICA'] },
          sistemaTsProtocol: null,
          enteEmittente: { sistemaTsAbilitato: true, deletedAt: null }
        },
        select: {
          id: true,
          numero: true,
          cessionarioCF: true,
          cessionarioDenominazione: true
        },
        take: 50 // Limite sicurezza
      });

      if (fatturePending.length === 0) {
        return res.json({ message: 'Nessuna fattura pending da sincronizzare', results: [] });
      }

      const results = [];
      for (const fattura of fatturePending) {
        try {
          const result = await sincronizzaSistemaTS(fattura.id, null, tenantId);
          results.push({
            fatturaId: fattura.id,
            numero: fattura.numero,
            ok: result.success,
            protocol: result.protocol,
            error: result.error
          });
        } catch (err) {
          logger.warn('Errore sincronizzazione singola fattura SistemaTS', { fatturaId: fattura.id, error: 'Operazione non riuscita', tenantId });
          results.push({
            fatturaId: fattura.id,
            numero: fattura.numero,
            ok: false,
            error: 'Errore sincronizzazione fattura' // F330: no raw error.message in HTTP response
          });
        }
      }

      const successi = results.filter(r => r.ok).length;
      logger.info('Batch SistemaTS completato', { tenantId, totale: results.length, successi });

      return res.json({
        message: `Batch completato: ${successi}/${results.length} fatture sincronizzate`,
        results
      });
    } catch (error) {
      logger.error('Errore POST sistema-ts/sincronizza-batch', { error: error.message });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/billing/sistema-ts/logs/:fatturaId
// Log di sincronizzazione SistemaTS per una fattura
// ---------------------------------------------------------------------------
router.get('/logs/:fatturaId',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const { fatturaId } = req.params;
      const tenantId = getEffectiveTenantId(req);

      // Verifica che la fattura appartenga al tenant
      const fattura = await prisma.fatturaElettronica.findFirst({
        where: { id: fatturaId, tenantId, deletedAt: null },
        select: { id: true, numero: true }
      });

      if (!fattura) {
        return res.status(404).json({ error: 'Fattura non trovata' });
      }

      const logs = await prisma.sistemaTSSyncLog.findMany({
        where: { fatturaId, tenantId },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({ data: logs, fattura });
    } catch (error) {
      logger.error('Errore GET sistema-ts/logs/:fatturaId', { error: error.message });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/billing/sistema-ts/spese
// Lista spese inviate da AcubeAPI (fonte SistemaTS remota)
// ---------------------------------------------------------------------------
router.get('/spese',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const { enteEmittenteId, from, to } = req.query;

      // Recupera credenziali ente
      const whereEnte = {
        tenantId,
        deletedAt: null,
        sistemaTsAbilitato: true,
        ...(enteEmittenteId && { id: enteEmittenteId })
      };

      const ente = await prisma.enteEmittente.findFirst({
        where: whereEnte,
        select: {
          id: true,
          denominazione: true,
          sistemaTsPinCode: true,
          sistemaTsUsername: true,
          sistemaTsPassword: true
        }
      });

      if (!ente) {
        return res.status(400).json({
          error: 'Nessun ente emittente configurato con SistemaTS abilitato'
        });
      }

      const credentials = {
        pinCode: ente.sistemaTsPinCode,
        username: ente.sistemaTsUsername,
        password: ente.sistemaTsPassword
      };

      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;

      // SaaS: master token usato internamente da elencaSpese
      const spese = await elencaSpese(null, credentials, params);

      return res.json({ data: spese, enteId: ente.id, denominazione: ente.denominazione });
    } catch (error) {
      logger.error('Errore GET sistema-ts/spese', { error: error.message });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/billing/sistema-ts/test
// Verifica connessione SistemaTS (per un ente specifico)
// ---------------------------------------------------------------------------
router.post('/test',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const { enteEmittenteId } = req.body;

      const whereEnte = {
        tenantId,
        deletedAt: null,
        sistemaTsAbilitato: true,
        ...(enteEmittenteId ? { id: enteEmittenteId } : { isDefault: true })
      };

      const ente = await prisma.enteEmittente.findFirst({
        where: whereEnte,
        select: {
          id: true,
          denominazione: true,
          sistemaTsPinCode: true,
          sistemaTsUsername: true,
          sistemaTsPassword: true
        }
      });

      if (!ente) {
        return res.status(404).json({
          ok: false,
          error: 'Nessun ente emittente trovato con SistemaTS abilitato'
        });
      }

      if (!ente.sistemaTsPinCode) {
        return res.status(400).json({
          ok: false,
          error: 'Credenziali SistemaTS incomplete per questo ente (pinCode mancante)'
        });
      }

      const credentials = {
        pinCode: ente.sistemaTsPinCode,
        username: ente.sistemaTsUsername,
        password: ente.sistemaTsPassword
      };

      // SaaS: master token usato internamente da testConnessioneSistemaTS
      const result = await testConnessioneSistemaTS(null, credentials);

      return res.json({
        ok: result.ok,
        enteId: ente.id,
        denominazione: ente.denominazione,
        message: result.ok ? 'Connessione SistemaTS OK' : result.error,
        statusCode: result.statusCode
      });
    } catch (error) {
      logger.error('Errore POST sistema-ts/test', { error: error.message });
      return res.status(500).json({ ok: false, error: 'Errore interno del server' });
    }
  }
);

export default router;
