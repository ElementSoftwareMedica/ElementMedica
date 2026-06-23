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
          sistemaTsUsername: true,
          sistemaTsPassword: true
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
            // SaaS: ACube usa master token ElementMedica, configurazione = credenziali SistemaTS complete
            configurato: !!(ente.sistemaTsPinCode && ente.sistemaTsUsername && ente.sistemaTsPassword),
            stats30giorni: { totale, successi, errori, warnings: totale - successi - errori },
            ultimaSync: ultimoLog
          };
        })
      );

      // Fatture pending (cliniche, senza sistemaTsProtocol, escluse le opposizioni)
      const fatturePending = await prisma.fatturaElettronica.count({
        where: {
          tenantId,
          deletedAt: null,
          stato: { in: ['EMESSA', 'PAGATA'] },
          tipoServizio: { in: ['VISITA', 'PRESTAZIONE_CLINICA'] },
          sistemaTsProtocol: null,
          sistemaTsFlagOpp: 0,
          enteEmittente: { sistemaTsAbilitato: true, deletedAt: null }
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
      logger.error('Errore POST sistema-ts/sincronizza', { error: error.message, code: error.code });
      // Errori di pre-condizione/business → 422 con messaggio chiaro (no dettagli interni)
      if (error.code === 'SISTEMA_TS_CREDENZIALI_MANCANTI') {
        return res.status(422).json({ ok: false, error: 'Credenziali SistemaTS mancanti per l\'ente emittente di questa fattura', code: error.code });
      }
      if (error.code === 'SISTEMA_TS_CF_NON_VALIDO') {
        return res.status(422).json({ ok: false, error: 'Codice fiscale del paziente mancante o non valido sulla fattura', code: error.code });
      }
      if (error.code === 'SISTEMA_TS_RIFIUTATA') {
        return res.status(422).json({ ok: false, error: 'Spesa rifiutata dal Sistema TS', code: error.code });
      }
      if (error.message?.includes('non abilitato')) {
        return res.status(422).json({ ok: false, error: 'SistemaTS non abilitato per l\'ente emittente' });
      }
      if (error.message?.includes('non trovata')) {
        return res.status(404).json({ error: 'Fattura non trovata' });
      }
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
      // Opzionale: limita il batch a un singolo ente emittente
      const { enteEmittenteId } = req.body || {};

      const BATCH_LIMIT = 200; // limite di sicurezza per richiesta on-demand
      const fatturePending = await prisma.fatturaElettronica.findMany({
        where: {
          tenantId,
          deletedAt: null,
          stato: { in: ['EMESSA', 'PAGATA'] },
          tipoServizio: { in: ['VISITA', 'PRESTAZIONE_CLINICA'] },
          sistemaTsProtocol: null,
          sistemaTsFlagOpp: 0, // i pazienti che si oppongono NON vengono trasmessi
          ...(enteEmittenteId ? { enteEmittenteId } : {}),
          enteEmittente: { sistemaTsAbilitato: true, deletedAt: null }
        },
        select: {
          id: true,
          numero: true
        },
        orderBy: { dataEmissione: 'asc' },
        take: BATCH_LIMIT
      });

      if (fatturePending.length === 0) {
        return res.json({ message: 'Nessuna fattura pending da sincronizzare', results: [], successi: 0, falliti: 0 });
      }

      const results = [];
      for (const fattura of fatturePending) {
        try {
          // cfPaziente = null → derivato internamente da resolveCfCittadino
          const result = await sincronizzaSistemaTS(fattura.id, null, tenantId);
          results.push({
            fatturaId: fattura.id,
            numero: fattura.numero,
            ok: true,
            protocol: result.protocol
          });
        } catch (err) {
          // Messaggi utente categorizzati (no raw error.message in HTTP response — F330)
          let errMsg = 'Errore sincronizzazione fattura';
          if (err.code === 'SISTEMA_TS_CREDENZIALI_MANCANTI') errMsg = 'Credenziali SistemaTS mancanti per l\'ente emittente';
          else if (err.code === 'SISTEMA_TS_CF_NON_VALIDO') errMsg = 'Codice fiscale paziente mancante o non valido';
          else if (err.code === 'SISTEMA_TS_RIFIUTATA') errMsg = 'Spesa rifiutata dal Sistema TS';
          logger.warn('Errore sincronizzazione singola fattura SistemaTS', { fatturaId: fattura.id, code: err.code, tenantId });
          results.push({
            fatturaId: fattura.id,
            numero: fattura.numero,
            ok: false,
            error: errMsg,
            code: err.code || null
          });
        }
      }

      const successi = results.filter(r => r.ok).length;
      const falliti = results.length - successi;
      const troncato = fatturePending.length === BATCH_LIMIT;
      logger.info('Batch SistemaTS completato', { tenantId, totale: results.length, successi, falliti, troncato });

      return res.json({
        message: `Sincronizzazione completata: ${successi}/${results.length} trasmesse${falliti > 0 ? `, ${falliti} con errori` : ''}${troncato ? ` (limite ${BATCH_LIMIT} per richiesta — riesegui per le restanti)` : ''}`,
        successi,
        falliti,
        troncato,
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
