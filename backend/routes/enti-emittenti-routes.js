/**
 * Enti Emittenti Routes
 *
 * Gestione degli enti emittenti per la fatturazione elettronica.
 * Ogni tenant può avere più enti: persone fisiche (medici) e società.
 *
 * P97 - Fatturazione Elettronica & SistemaTS Integration
 *
 * Base path: /api/v1/billing/enti-emittenti
 */

import express from 'express';
import logger from '../utils/logger.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import prisma from '../config/prisma-optimization.js';
import {
  testConnessioneAcube,
  elencaSpeseRicevute,
  elencaFatture,
  getDettaglioSpesa,
  getStatoFattura,
} from '../services/billing/AcubeApiService.js';
import {
  testConnessioneSistemaTS
} from '../services/billing/SistemaTSService.js';
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
// GET /api/v1/billing/enti-emittenti
// Lista enti emittenti del tenant
// ---------------------------------------------------------------------------
router.get('/',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);

      const enti = await prisma.enteEmittente.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: [{ isDefault: 'desc' }, { denominazione: 'asc' }],
        select: {
          id: true,
          denominazione: true,
          label: true,
          ruoloFatturazione: true,
          tipo: true,
          codiceFiscale: true,
          piva: true,
          regimeFiscale: true,
          codiceAteco: true,
          indirizzo: true,
          citta: true,
          cap: true,
          provincia: true,
          email: true,
          pec: true,
          iban: true,
          sistemaTsAbilitato: true,
          annoNumFattura: true,
          progressivoFatt: true,
          isDefault: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // Non esporre mai le credenziali
          acubeApiKey: false,
          acubeUsername: false,
          acubePassword: false,
          sistemaTsPinCode: false,
          sistemaTsUsername: false,
          sistemaTsPassword: false,
          _count: {
            select: { fatture: true }
          }
        }
      });

      // Maschera parzialmente l'API key per mostrare se configurata
      const entiSafe = await prisma.enteEmittente.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: [{ isDefault: 'desc' }, { denominazione: 'asc' }]
      });

      const result = entiSafe.map(e => ({
        id: e.id,
        denominazione: e.denominazione,
        label: e.label,
        ruoloFatturazione: e.ruoloFatturazione,
        tipo: e.tipo,
        codiceFiscale: e.codiceFiscale,
        piva: e.piva,
        regimeFiscale: e.regimeFiscale,
        codiceAteco: e.codiceAteco,
        indirizzo: e.indirizzo,
        citta: e.citta,
        cap: e.cap,
        provincia: e.provincia,
        email: e.email,
        pec: e.pec,
        iban: e.iban,
        sistemaTsAbilitato: e.sistemaTsAbilitato,
        annoNumFattura: e.annoNumFattura,
        progressivoFatt: e.progressivoFatt,
        isDefault: e.isDefault,
        isActive: e.isActive,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        // AcubeAPI è gestita centralmente da ElementMedica (SaaS) → sempre true
        acubeConfigurato: true,
        sistemaTsConfigurato: !!(e.sistemaTsPinCode && e.sistemaTsUsername),
      }));

      return res.json({ data: result });
    } catch (error) {
      logger.error('Errore GET enti-emittenti', { error: 'Operazione non riuscita', tenantId: req.person?.tenantId });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/billing/enti-emittenti/:id
// Dettaglio singolo ente (senza credenziali)
// ---------------------------------------------------------------------------
router.get('/:id',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const ente = await prisma.enteEmittente.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!ente) {
        return res.status(404).json({ error: 'Ente emittente non trovato' });
      }

      return res.json({
        data: {
          ...ente,
          acubeApiKey: undefined,
          acubePassword: undefined,
          sistemaTsPassword: undefined,
          // SaaS model: AcubeAPI è sempre gestita da ElementMedica
          acubeConfigurato: true,
          sistemaTsConfigurato: !!(ente.sistemaTsPinCode && ente.sistemaTsUsername),
        }
      });
    } catch (error) {
      logger.error('Errore GET ente-emittente/:id', { error: error.message });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/billing/enti-emittenti
// Crea nuovo ente emittente
// ---------------------------------------------------------------------------
router.post('/',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:write'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const {
        denominazione, label, ruoloFatturazione, tipo, codiceFiscale, piva, regimeFiscale, codiceAteco,
        indirizzo, citta, cap, provincia, email, pec, iban,
        sistemaTsPinCode, sistemaTsUsername, sistemaTsPassword,
        sistemaTsAbilitato, isDefault, isActive
      } = req.body;

      if (!denominazione || !tipo || !codiceFiscale) {
        return res.status(400).json({ error: 'denominazione, tipo e codiceFiscale sono obbligatori' });
      }

      // Se questo è il nuovo default, rimuovi default dagli altri
      if (isDefault) {
        await prisma.enteEmittente.updateMany({
          where: { tenantId, isDefault: true, deletedAt: null },
          data: { isDefault: false }
        });
      }

      const ente = await prisma.enteEmittente.create({
        data: {
          tenantId,
          denominazione,
          label: label || null,
          ruoloFatturazione: ruoloFatturazione || null,
          tipo,
          codiceFiscale,
          piva,
          regimeFiscale: regimeFiscale || 'RF01',
          codiceAteco,
          indirizzo,
          citta,
          cap,
          provincia,
          email,
          pec,
          iban,
          // Non accettiamo credenziali AcubeAPI dai tenant (SaaS model)
          sistemaTsPinCode,
          sistemaTsUsername,
          sistemaTsPassword,
          sistemaTsAbilitato: sistemaTsAbilitato ?? false,
          annoNumFattura: new Date().getFullYear(),
          progressivoFatt: 0,
          isDefault: isDefault ?? false,
          isActive: isActive ?? true,
        }
      });

      logger.info('Ente emittente creato', { id: ente.id, tenantId, denominazione });

      return res.status(201).json({
        data: {
          ...ente,
          acubeApiKey: undefined,
          acubePassword: undefined,
          sistemaTsPassword: undefined,
          // SaaS model: sempre true
          acubeConfigurato: true,
          sistemaTsConfigurato: !!(ente.sistemaTsPinCode && ente.sistemaTsUsername),
        }
      });
    } catch (error) {
      logger.error('Errore POST enti-emittenti', { error: error.message });
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ente emittente con questo codice fiscale già esistente' });
      }
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/v1/billing/enti-emittenti/:id
// Aggiorna ente emittente
// ---------------------------------------------------------------------------
router.put('/:id',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const existing = await prisma.enteEmittente.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Ente emittente non trovato' });
      }

      const {
        denominazione, label, ruoloFatturazione, tipo, codiceFiscale, piva, regimeFiscale, codiceAteco,
        indirizzo, citta, cap, provincia, email, pec, iban,
        sistemaTsPinCode, sistemaTsUsername, sistemaTsPassword,
        sistemaTsAbilitato, isDefault, isActive
      } = req.body;

      // Se questo diventa default, rimuovi dagli altri
      if (isDefault && !existing.isDefault) {
        await prisma.enteEmittente.updateMany({
          where: { tenantId, isDefault: true, deletedAt: null, id: { not: id } },
          data: { isDefault: false }
        });
      }

      // Build update data — non sovrascrivere le credenziali con undefined
      const updateData = {};
      if (denominazione !== undefined) updateData.denominazione = denominazione;
      if (label !== undefined) updateData.label = label || null;
      if (ruoloFatturazione !== undefined) updateData.ruoloFatturazione = ruoloFatturazione || null;
      if (tipo !== undefined) updateData.tipo = tipo;
      if (codiceFiscale !== undefined) updateData.codiceFiscale = codiceFiscale;
      if (piva !== undefined) updateData.piva = piva;
      if (regimeFiscale !== undefined) updateData.regimeFiscale = regimeFiscale;
      if (codiceAteco !== undefined) updateData.codiceAteco = codiceAteco;
      if (indirizzo !== undefined) updateData.indirizzo = indirizzo;
      if (citta !== undefined) updateData.citta = citta;
      if (cap !== undefined) updateData.cap = cap;
      if (provincia !== undefined) updateData.provincia = provincia;
      if (email !== undefined) updateData.email = email;
      if (pec !== undefined) updateData.pec = pec;
      if (iban !== undefined) updateData.iban = iban;
      // Non aggiornare credenziali AcubeAPI (SaaS model: gestite da ElementMedica)
      // Stringa vuota = "non toccare il valore esistente"
      if (sistemaTsPinCode !== undefined && sistemaTsPinCode !== '') updateData.sistemaTsPinCode = sistemaTsPinCode;
      if (sistemaTsUsername !== undefined && sistemaTsUsername !== '') updateData.sistemaTsUsername = sistemaTsUsername;
      if (sistemaTsPassword !== undefined && sistemaTsPassword !== '') updateData.sistemaTsPassword = sistemaTsPassword;
      if (sistemaTsAbilitato !== undefined) updateData.sistemaTsAbilitato = sistemaTsAbilitato;
      if (isDefault !== undefined) updateData.isDefault = isDefault;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updated = await prisma.enteEmittente.update({
        where: { id },
        data: updateData
      });

      logger.info('Ente emittente aggiornato', { id, tenantId });

      return res.json({
        data: {
          ...updated,
          acubeApiKey: undefined,
          acubePassword: undefined,
          sistemaTsPassword: undefined,
          // SaaS model: sempre true
          acubeConfigurato: true,
          sistemaTsConfigurato: !!(updated.sistemaTsPinCode && updated.sistemaTsUsername),
        }
      });
    } catch (error) {
      logger.error('Errore PUT ente-emittente/:id', { error: error.message });
      if (error.code === 'P2000' || error.message?.includes('too long for the column')) {
        return res.status(400).json({ error: 'Un campo supera la lunghezza massima consentita' });
      }
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/v1/billing/enti-emittenti/:id
// Soft-delete ente emittente (GDPR: non elimina dati delle fatture emesse)
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

      const existing = await prisma.enteEmittente.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Ente emittente non trovato' });
      }

      // Verifica che non ci siano fatture in stato EMESSA/PAGATA associate
      const fattureAttive = await prisma.fatturaElettronica.count({
        where: {
          enteEmittenteId: id,
          tenantId,
          deletedAt: null,
          stato: { in: ['EMESSA', 'PAGATA'] }
        }
      });

      if (fattureAttive > 0) {
        return res.status(409).json({
          error: `Impossibile eliminare: ${fattureAttive} fattura/e attive associate a questo ente`
        });
      }

      // Se era il default, imposta come default il primo disponibile
      if (existing.isDefault) {
        const altro = await prisma.enteEmittente.findFirst({
          where: { tenantId, deletedAt: null, id: { not: id }, isActive: true }
        });
        if (altro) {
          await prisma.enteEmittente.update({ where: { id: altro.id }, data: { isDefault: true } });
        }
      }

      await prisma.enteEmittente.update({
        where: { id },
        data: { deletedAt: new Date(), deletionReason }
      });

      // GdprAuditLog
      await prisma.gdprAuditLog.create({
        data: {
          tenantId,
          performedById: req.person.id,
          resourceType: 'EnteEmittente',
          resourceId: id,
          action: 'DELETE',
          dataAccessed: ['denominazione', 'codiceFiscale', 'piva'],
          reason: deletionReason
        }
      }).catch(err => logger.warn('GdprAuditLog failed', { err: err.message }));

      logger.info('Ente emittente eliminato (soft)', { id, tenantId });

      return res.json({ message: 'Ente emittente eliminato correttamente' });
    } catch (error) {
      logger.error('Errore DELETE ente-emittente/:id', { error: error.message });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/billing/enti-emittenti/test-acube-master
// Verifica connessione AcubeAPI master (ElementMedica → tutti i tenant)
// Solo admin può chiamare questo endpoint
// ---------------------------------------------------------------------------
router.post('/test-acube-master',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const result = await testConnessioneAcube(null, null);
      return res.json({
        ok: result.ok,
        env: result.env,
        message: result.ok
          ? `Connessione AcubeAPI OK (ambiente: ${result.env})`
          : result.error
      });
    } catch (error) {
      logger.error('Errore test-acube-master', { error: error.message });
      return res.status(500).json({ ok: false, error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/billing/enti-emittenti/:id/test-acube
// Verifica connessione AcubeAPI per l'ente.
// SaaS model: AcubeAPI è gestita centralmente da ElementMedica → SEMPRE master.
// Le credenziali NON sono accettate dal body (evita oracolo di credential-testing).
// ---------------------------------------------------------------------------
router.post('/:id/test-acube',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const ente = await prisma.enteEmittente.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: { denominazione: true }
      });

      if (!ente) {
        return res.status(404).json({ error: 'Ente emittente non trovato' });
      }

      // SaaS model: usa SEMPRE le credenziali master (mai dal body)
      const result = await testConnessioneAcube(null, null);

      return res.json({
        ok: result.ok,
        env: result.env,
        message: result.ok
          ? `AcubeAPI OK per ${ente.denominazione} (ambiente: ${result.env})`
          : result.error
      });
    } catch (error) {
      logger.error('Errore test-acube', { error: error.message });
      return res.status(500).json({ ok: false, error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/billing/enti-emittenti/:id/test-sistema-ts
// Verifica connessione SistemaTS per questo ente
// ---------------------------------------------------------------------------
router.post('/:id/test-sistema-ts',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const ente = await prisma.enteEmittente.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: {
          sistemaTsPinCode: true,
          sistemaTsUsername: true,
          sistemaTsPassword: true,
          sistemaTsAbilitato: true,
          denominazione: true
        }
      });

      if (!ente) {
        return res.status(404).json({ error: 'Ente emittente non trovato' });
      }

      if (!ente.sistemaTsAbilitato) {
        return res.status(400).json({ ok: false, error: 'SistemaTS non abilitato per questo ente' });
      }

      if (!ente.sistemaTsPinCode || !ente.sistemaTsUsername) {
        return res.status(400).json({
          ok: false,
          error: 'Credenziali SistemaTS incomplete (PinCode e Username obbligatori)'
        });
      }

      const credentials = {
        pinCode: ente.sistemaTsPinCode,
        username: ente.sistemaTsUsername,
        password: ente.sistemaTsPassword
      };

      // testConnessioneSistemaTS gestisce internamente il master token e i suoi errori
      const result = await testConnessioneSistemaTS(null, credentials);

      return res.json({
        ok: result.ok,
        message: result.ok ? 'Connessione SistemaTS riuscita' : result.error,
        statusCode: result.statusCode
      });
    } catch (error) {
      logger.error('Errore test-sistema-ts', { error: error.message });
      return res.status(500).json({ ok: false, error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/billing/enti-emittenti/:id/spese-ricevute
// Fatture passive (spese aziendali) via AcubeAPI
// ---------------------------------------------------------------------------
router.get('/:id/spese-ricevute',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const { page, from, to, sender, document_type } = req.query;

      const ente = await prisma.enteEmittente.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: { denominazione: true }
      });

      if (!ente) return res.status(404).json({ error: 'Ente emittente non trovato' });

      // Usa master token AcubeAPI (SaaS model — credenziali gestite da ElementMedica)
      const params = {};
      if (page) params.page = parseInt(page);
      if (from) params['invoice_date[after]'] = from;
      if (to) params['invoice_date[before]'] = to;
      if (sender) params.sender = sender;
      if (document_type) params.document_type = document_type;

      const data = await elencaSpeseRicevute(null, params);

      return res.json({
        data: data?.['hydra:member'] || data || [],
        total: data?.['hydra:totalItems'] || 0,
        enteId: id,
        ente: ente.denominazione,
      });
    } catch (error) {
      const msg = error?.message || '';
      // Errori di autenticazione ACube → 503 con messaggio chiaro
      if (msg.includes('auth error') || msg.includes('401') || msg.includes('nessun token')) {
        logger.warn('AcubeAPI non raggiungibile o credenziali errate', { enteId: req.params.id });
        return res.status(503).json({ error: 'Integrazione AcubeAPI non disponibile. Verificare le credenziali master.' });
      }
      logger.error('Errore GET spese-ricevute', { error: error.message });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/billing/enti-emittenti/:id/fatture-emesse
// Fatture attive (emesse) via AcubeAPI
// ---------------------------------------------------------------------------
router.get('/:id/fatture-emesse',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const { page, from, to, recipient, document_type } = req.query;

      const ente = await prisma.enteEmittente.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: { denominazione: true }
      });

      if (!ente) return res.status(404).json({ error: 'Ente emittente non trovato' });

      // Usa master token AcubeAPI (SaaS model)
      const params = {};
      if (page) params.page = parseInt(page);
      if (from) params['invoice_date[after]'] = from;
      if (to) params['invoice_date[before]'] = to;
      if (recipient) params.recipient = recipient;
      if (document_type) params.document_type = document_type;

      const data = await elencaFatture(null, params);

      return res.json({
        data: data?.['hydra:member'] || data || [],
        total: data?.['hydra:totalItems'] || 0,
        enteId: id,
        ente: ente.denominazione,
      });
    } catch (error) {
      logger.error('Errore GET fatture-emesse', { error: error.message });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/billing/enti-emittenti/:id/spese-ricevute/:uuid
// Dettaglio singola spesa ricevuta
// ---------------------------------------------------------------------------
router.get('/:id/spese-ricevute/:uuid',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:read'),
  async (req, res) => {
    try {
      const { id, uuid } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const ente = await prisma.enteEmittente.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: { id: true }
      });

      if (!ente) return res.status(404).json({ error: 'Ente emittente non trovato' });

      // Usa master token AcubeAPI (SaaS model)
      const data = await getDettaglioSpesa(null, uuid);
      return res.json(data);
    } catch (error) {
      logger.error('Errore GET spesa dettaglio', { error: error.message });
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

export default router;
