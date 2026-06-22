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
import { sincronizzaSistemaTS } from '../services/billing/SistemaTSService.js';
import { generateFatturaPdf } from '../services/billing/FatturaElettronicaPdfService.js';
import EmailService from '../services/emailService.js';
import MovimentoContabileGenerator from '../services/management/MovimentoContabileGenerator.js';
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

const isPatientMedicalDocument = (fattura) => (
  fattura?.clienteType === 'PERSONA' &&
  !fattura?.clienteAziendaId &&
  ['VISITA', 'PRESTAZIONE_CLINICA'].includes(fattura?.tipoServizio) &&
  (fattura?.linee || []).every(linea => Number(linea.aliquotaIva || 0) === 0)
);

const emitDocumentRespectingHealthRules = async (fatturaId, tenantId) => {
  const existing = await prisma.fatturaElettronica.findFirst({
    where: { id: fatturaId, tenantId, deletedAt: null },
    include: { enteEmittente: true, linee: true }
  });
  if (!existing) throw new Error('Fattura non trovata');
  if (existing.stato !== 'BOZZA') return existing;

  if (isPatientMedicalDocument(existing)) {
    const fattura = await prisma.fatturaElettronica.update({
      where: { id: fatturaId },
      data: {
        stato: 'EMESSA',
        acubeStatus: 'BOZZA',
        acubeUuid: null,
        acubeLastSync: null,
      },
      include: { linee: { orderBy: { numeroLinea: 'asc' } } }
    });

    if (existing.tipoDocumento !== 'NOTA_CREDITO' && existing.enteEmittente?.sistemaTsAbilitato && Number(existing.sistemaTsFlagOpp ?? 0) === 0) {
      await sincronizzaSistemaTS(fatturaId, existing.cessionarioCF, tenantId).catch(tsError => {
        logger.warn('Documento sanitario emesso ma SistemaTS non sincronizzato', {
          fatturaId,
          error: tsError.message,
          tenantId
        });
      });
    }
    return fattura;
  }

  return emettiFattura(fatturaId, tenantId);
};

const selectBillableMovementIds = (movimenti = []) => {
  const bySource = new Map();
  for (const movimento of movimenti) {
    const key = movimento.appPrestazioneId || (movimento.appuntamentoId ? `main:${movimento.appuntamentoId}` : movimento.visitaId) || movimento.id;
    const existing = bySource.get(key);
    if (!existing) {
      bySource.set(key, movimento);
      continue;
    }
    const existingRank = existing.stato === 'BOZZA' ? 0 : 1;
    const currentRank = movimento.stato === 'BOZZA' ? 0 : 1;
    const currentIsBetter = currentRank > existingRank
      || (currentRank === existingRank && new Date(movimento.updatedAt || movimento.createdAt || 0) > new Date(existing.updatedAt || existing.createdAt || 0));
    if (currentIsBetter) bySource.set(key, movimento);
  }
  return Array.from(bySource.values()).map(m => m.id);
};

const getAppuntamentoIdFromBillingContext = (fattura) => {
  const fromNote = String(fattura?.note || '').match(/AUTO_ACCETTAZIONE:([0-9a-f-]{36})/i)?.[1] || null;
  if (fromNote) return fromNote;
  return fattura?.movimentiContabili?.find(m => m.appuntamentoId)?.appuntamentoId || null;
};

const syncAppuntamentoAfterBilling = async (fatturaInput, tenantId, personId, mode = 'paid') => {
  const fattura = fatturaInput?.movimentiContabili
    ? fatturaInput
    : await prisma.fatturaElettronica.findFirst({
      where: { id: fatturaInput?.id, tenantId },
      include: { movimentiContabili: true }
    });
  const appuntamentoId = getAppuntamentoIdFromBillingContext(fattura);
  if (!appuntamentoId) return;

  const appuntamento = await prisma.appuntamento.findFirst({
    where: { id: appuntamentoId, tenantId, deletedAt: null },
    select: { id: true, stato: true }
  });
  if (!appuntamento) return;

  if (mode === 'paid') {
    await prisma.appuntamento.update({
      where: { id: appuntamentoId },
      data: {
        pagamentoAnticipato: true,
        pagamentoDataOra: new Date(),
        ...(['COMPLETATO', 'FATTURATO'].includes(appuntamento.stato) ? { stato: 'FATTURATO' } : {}),
      }
    });
    await prisma.movimentoContabile.updateMany({
      where: { tenantId, deletedAt: null, fatturaElettronicaId: fattura.id },
      data: { stato: 'PAGATO', dataPagamento: new Date(), updatedBy: personId || null }
    });
    return;
  }

  const remainingPaidContext = await prisma.movimentoContabile.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      appuntamentoId,
      direzione: 'ENTRATA',
      stato: { in: ['PAGATO', 'FATTURATO'] },
      OR: [
        { fatturaElettronicaId: { not: null } },
        { note: { contains: 'SENZA_FATTURA' } },
      ],
    },
    select: { id: true },
  });
  if (!remainingPaidContext && appuntamento.stato === 'FATTURATO') {
    await prisma.appuntamento.update({
      where: { id: appuntamentoId },
      data: {
        stato: 'COMPLETATO',
        pagamentoAnticipato: false,
        pagamentoDataOra: null,
      }
    });
  }
};

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
// POST /api/v1/billing/fatture/pagata-senza-fattura
// Registra incasso senza emissione fattura e genera il compenso medico passivo.
// ---------------------------------------------------------------------------
router.post('/pagata-senza-fattura',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:write'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const {
        visitaId,
        appPrestazioneId,
        appuntamentoId,
        importoRiferimento,
        descrizione,
        metodoPagamento,
        bozzaFatturaId,
        modalitaQuota = 'STANDARD',
      } = req.body || {};

      if (!visitaId && !appPrestazioneId && !appuntamentoId) {
        return res.status(400).json({ error: 'visitaId, appuntamentoId o appPrestazioneId obbligatorio' });
      }
      if (!['STANDARD', 'SOLO_POLIAMBULATORIO', 'SOLO_MEDICO'].includes(modalitaQuota)) {
        return res.status(400).json({ error: 'modalitaQuota non valida' });
      }

      const result = await MovimentoContabileGenerator.generaPagamentoSenzaFattura({
        visitaId: visitaId || null,
        appPrestazioneId: appPrestazioneId || null,
        appuntamentoId: appuntamentoId || null,
        importoRiferimento,
        descrizione,
        bozzaFatturaId: bozzaFatturaId || null,
        metodoPagamento: metodoPagamento || null,
        modalitaQuota,
      }, tenantId, req.person?.id);

      if (modalitaQuota !== 'STANDARD' && !result?.movimenti?.some(m => m.direzione === 'ENTRATA')) {
        return res.status(422).json({
          error: 'Quota non calcolabile con i dati tariffari disponibili',
          warnings: result?.warnings || [],
        });
      }

      return res.json({
        success: true,
        data: result,
        message: 'Pagamento registrato senza emissione fattura'
      });
    } catch (error) {
      logger.error('Errore pagamento senza fattura', {
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 6).join(' | '),
        bodyKeys: Object.keys(req.body || {}),
        tenantId: req.person?.tenantId,
        personId: req.person?.id
      });
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

      const contextKey = typeof input.note === 'string' && input.note.startsWith('AUTO_ACCETTAZIONE:')
        ? input.note
        : null;
      const contextAppuntamentoId = input.appuntamentoId
        || (contextKey ? contextKey.replace('AUTO_ACCETTAZIONE:', '') : null);
      if (input.visitaId || contextKey || contextAppuntamentoId) {
        const sourceMovimenti = (!Array.isArray(input.sourceMovimentoIds) || input.sourceMovimentoIds.length === 0) && (input.visitaId || contextAppuntamentoId)
          ? await prisma.movimentoContabile.findMany({
            where: {
              tenantId,
              deletedAt: null,
              direzione: 'ENTRATA',
              fatturaElettronicaId: null,
              stato: { in: ['BOZZA', 'DA_FATTURARE'] },
              note: { not: { contains: 'SENZA_FATTURA' } },
              OR: [
                ...(input.visitaId ? [{ visitaId: input.visitaId }] : []),
                ...(contextAppuntamentoId ? [{ appuntamentoId: contextAppuntamentoId }] : []),
              ],
            },
            select: { id: true, stato: true, appuntamentoId: true, visitaId: true, appPrestazioneId: true, createdAt: true, updatedAt: true },
          })
          : [];

        const existingContextDocument = await prisma.fatturaElettronica.findFirst({
          where: {
            tenantId,
            deletedAt: null,
            OR: [
              ...(input.visitaId ? [{ visitaId: input.visitaId, stato: { in: ['BOZZA', 'EMESSA', 'PAGATA'] } }] : []),
              ...(contextKey ? [
                { note: contextKey, stato: { in: ['BOZZA', 'EMESSA', 'PAGATA'] } },
                { note: { contains: contextKey }, stato: 'PAGATA', numero: { startsWith: `SF-${new Date().getFullYear()}/` } },
              ] : []),
            ],
          },
          include: {
            enteEmittente: { select: { id: true, denominazione: true, tipo: true } },
            linee: { orderBy: { numeroLinea: 'asc' } },
          },
          orderBy: { updatedAt: 'desc' },
        });
        if (existingContextDocument && (existingContextDocument.stato === 'BOZZA' || sourceMovimenti.length === 0)) {
          return res.status(200).json({ data: existingContextDocument, deduplicated: true });
        }

        if (input.visitaId || contextAppuntamentoId) {
          const linkedMovement = await prisma.movimentoContabile.findFirst({
            where: {
              tenantId,
              deletedAt: null,
              fatturaElettronicaId: { not: null },
              OR: [
                ...(input.visitaId ? [{ visitaId: input.visitaId }] : []),
                ...(contextAppuntamentoId ? [{ appuntamentoId: contextAppuntamentoId }] : []),
              ],
              fatturaElettronica: { deletedAt: null, stato: { in: ['BOZZA', 'EMESSA', 'PAGATA'] } },
            },
            include: {
              fatturaElettronica: {
                include: {
                  enteEmittente: { select: { id: true, denominazione: true, tipo: true } },
                  linee: { orderBy: { numeroLinea: 'asc' } },
                },
              },
            },
            orderBy: { updatedAt: 'desc' },
          });
          if (linkedMovement?.fatturaElettronica && (linkedMovement.fatturaElettronica.stato === 'BOZZA' || sourceMovimenti.length === 0)) {
            return res.status(200).json({ data: linkedMovement.fatturaElettronica, deduplicated: true });
          }

          if (sourceMovimenti.length > 0) {
            input.sourceMovimentoIds = selectBillableMovementIds(sourceMovimenti);
          }
        }
      }

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
        linee, sistemaTsFlagOpp, disagioPsicologico, forceBollo, note
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
      if (disagioPsicologico !== undefined) updateData.disagioPsicologico = !!disagioPsicologico;
      if (note !== undefined) updateData.note = note || null;
      if (forceBollo !== undefined) {
        updateData.bolloVirtuale = !!forceBollo;
        updateData.importoBollo = forceBollo ? 2 : 0;
      }

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
            const bollo = updateData.bolloVirtuale === true ? 2 : updateData.bolloVirtuale === false ? 0 : Number(existing.importoBollo || 0);
            updateData.importoBollo = bollo;
            updateData.totale = totLinee.imponibile + totLinee.iva + bollo;
            updateData.aliquotaIva = linee.length > 0
              ? linee.reduce((acc, l) => acc + Number(l.aliquotaIva ?? 22), 0) / linee.length
              : 0;
            updateData.natura = linee.find(l => l.natura)?.natura || null;
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
        where: { id, tenantId, deletedAt: null },
        include: { movimentiContabili: true }
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
      await prisma.movimentoContabile.updateMany({
        where: { tenantId, deletedAt: null, fatturaElettronicaId: id },
        data: { fatturaElettronicaId: null, updatedBy: req.person.id }
      });

      // GdprAuditLog
      await prisma.gdprAuditLog.create({
        data: {
          tenantId,
          personId: req.person.id,
          resourceType: 'FatturaElettronica',
          resourceId: id,
          action: 'DELETE',
          dataAccessed: ['numero', 'cessionarioCF', 'totale', `motivo:${deletionReason}`],
          ipAddress: req.ip || null,
          userAgent: req.get?.('user-agent') || null
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

      const existing = await prisma.fatturaElettronica.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: { enteEmittente: true, linee: true }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Fattura non trovata' });
      }

      const isPatientMedicalInvoice =
        existing.clienteType === 'PERSONA' &&
        !existing.clienteAziendaId &&
        ['VISITA', 'PRESTAZIONE_CLINICA'].includes(existing.tipoServizio) &&
        existing.linee?.every(linea => Number(linea.aliquotaIva || 0) === 0);

      if (isPatientMedicalInvoice) {
        if (existing.stato !== 'BOZZA') {
          return res.status(409).json({ error: 'La fattura non può essere emessa nello stato corrente' });
        }

        let fattura = await prisma.fatturaElettronica.update({
          where: { id },
          data: {
            stato: ['MP01', 'MP08'].includes(existing.modalitaPagamento) ? 'PAGATA' : 'EMESSA',
            acubeStatus: 'BOZZA',
            acubeUuid: null,
            acubeLastSync: null,
          },
          include: { linee: { orderBy: { numeroLinea: 'asc' } }, movimentiContabili: true }
        });

        if (fattura.stato === 'PAGATA') {
          await syncAppuntamentoAfterBilling(fattura, tenantId, req.person.id, 'paid');
          fattura = await prisma.fatturaElettronica.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: { linee: { orderBy: { numeroLinea: 'asc' } } }
          });
        }

        let sistemaTs = null;
        if (existing.enteEmittente?.sistemaTsAbilitato && Number(existing.sistemaTsFlagOpp ?? 0) === 0) {
          try {
            sistemaTs = await sincronizzaSistemaTS(id, existing.cessionarioCF, tenantId);
          } catch (tsError) {
            logger.warn('Fattura sanitaria emessa ma SistemaTS non sincronizzato', {
              fatturaId: id,
              error: tsError.message,
              tenantId
            });
          }
        }

        logger.info('Fattura sanitaria paziente emessa senza SDI', { id, numero: fattura.numero, tenantId });
        return res.json({
          data: fattura,
          sistemaTs,
          message: sistemaTs
            ? `Documento sanitario ${fattura.numero} emesso e inviato al Sistema TS`
            : `Documento sanitario ${fattura.numero} emesso senza invio SDI`
        });
      }

      let fattura = await emettiFattura(id, tenantId);
      if (['MP01', 'MP08'].includes(existing.modalitaPagamento)) {
        fattura = await prisma.fatturaElettronica.update({
          where: { id },
          data: { stato: 'PAGATA' },
          include: { linee: { orderBy: { numeroLinea: 'asc' } }, movimentiContabili: true }
        });
        await syncAppuntamentoAfterBilling(fattura, tenantId, req.person.id, 'paid');
      }

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
// POST /api/v1/billing/fatture/:id/storna-e-rifai
// Elimina bozze o storna documenti emessi con nota di credito pronta, poi
// libera i movimenti contabili per rigenerare una fattura corretta.
// ---------------------------------------------------------------------------
router.post('/:id/storna-e-rifai',
  authenticate,
  requireBillingFeatureAccess,
  checkPermission('billing:write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const { note } = req.body || {};

      const fattura = await prisma.fatturaElettronica.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: {
          linee: true,
          movimentiContabili: true,
          noteCreditoEmesse: {
            where: { deletedAt: null, stato: { notIn: ['ANNULLATA', 'STORNATA'] } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          }
        }
      });

      if (!fattura) {
        return res.status(404).json({ error: 'Fattura non trovata' });
      }
      if (fattura.tipoDocumento === 'NOTA_CREDITO') {
        return res.status(409).json({ error: 'Una nota di credito non può essere stornata da questa azione' });
      }

      if (fattura.stato === 'BOZZA') {
        const appuntamentoId = getAppuntamentoIdFromBillingContext(fattura);
        await prisma.$transaction(async (tx) => {
          await tx.fatturaElettronica.update({
            where: { id },
            data: { deletedAt: new Date() }
          });
          await tx.movimentoContabile.updateMany({
            where: { tenantId, deletedAt: null, fatturaElettronicaId: id },
            data: { fatturaElettronicaId: null, stato: 'DA_FATTURARE', updatedBy: req.person.id }
          });
          await tx.gdprAuditLog.create({
            data: {
              tenantId,
              personId: req.person.id,
              resourceType: 'FatturaElettronica',
              resourceId: id,
              action: 'DELETE',
              dataAccessed: ['numero', 'totale', 'eliminazione_bozza_storna_e_rifai'],
              ipAddress: req.ip || null,
              userAgent: req.get?.('user-agent') || null
            }
          }).catch(err => logger.warn('GdprAuditLog failed', { err: err.message }));
        });
        if (appuntamentoId) {
          await syncAppuntamentoAfterBilling({ ...fattura, movimentiContabili: fattura.movimentiContabili }, tenantId, req.person.id, 'reopen');
        }

        return res.json({
          data: { fatturaId: id, notaCredito: null, stato: 'BOZZA_ELIMINATA' },
          message: 'Bozza eliminata. I movimenti sono disponibili per una nuova fattura.'
        });
      }

      if (!['EMESSA', 'PAGATA'].includes(fattura.stato)) {
        return res.status(409).json({ error: `Documento non stornabile nello stato ${fattura.stato}` });
      }

      const isPagamentoSenzaFattura =
        String(fattura.numero || '').startsWith('SF-') ||
        String(fattura.note || '').includes('SENZA_FATTURA');

      if (isPagamentoSenzaFattura) {
        const linkedUscitaIds = fattura.movimentiContabili
          .map(m => m.movimentoCollegatoId)
          .filter(Boolean);
        await prisma.$transaction(async (tx) => {
          await tx.fatturaElettronica.update({
            where: { id },
            data: { stato: 'ANNULLATA', deletedAt: new Date() }
          });
          await tx.movimentoContabile.updateMany({
            where: { tenantId, deletedAt: null, fatturaElettronicaId: id, direzione: 'ENTRATA' },
            data: { fatturaElettronicaId: null, stato: 'ANNULLATO', updatedBy: req.person.id }
          });
          await tx.movimentoContabile.updateMany({
            where: { tenantId, deletedAt: null, fatturaElettronicaId: id, direzione: 'USCITA' },
            data: { fatturaElettronicaId: null, stato: 'ANNULLATO', updatedBy: req.person.id }
          });
          if (linkedUscitaIds.length > 0) {
            await tx.movimentoContabile.updateMany({
              where: { tenantId, deletedAt: null, id: { in: linkedUscitaIds }, direzione: 'USCITA' },
              data: { fatturaElettronicaId: null, stato: 'ANNULLATO', updatedBy: req.person.id }
            });
          }
          await tx.gdprAuditLog.create({
            data: {
              tenantId,
              personId: req.person.id,
              resourceType: 'FatturaElettronica',
              resourceId: id,
              action: 'DELETE',
              dataAccessed: ['pagamento_senza_fattura_annullato', 'storna_e_rifai'],
              ipAddress: req.ip || null,
              userAgent: req.get?.('user-agent') || null
            }
          }).catch(err => logger.warn('GdprAuditLog failed', { err: err.message }));
        });
        await syncAppuntamentoAfterBilling({ ...fattura, movimentiContabili: fattura.movimentiContabili }, tenantId, req.person.id, 'reopen');

        return res.json({
          data: { fatturaId: id, notaCredito: null, stato: 'PAGAMENTO_SENZA_FATTURA_ANNULLATO' },
          message: 'Pagamento senza fattura annullato. Puoi emettere una fattura ordinaria.'
        });
      }

      let notaCredito = fattura.noteCreditoEmesse?.[0] || null;
      if (!notaCredito) {
        notaCredito = await creaNataCredito(
          id,
          tenantId,
          req.person.id,
          note || 'Storno per rifacimento fattura da accettazione paziente'
        );
      }
      if (notaCredito.stato === 'BOZZA') {
        notaCredito = await emitDocumentRespectingHealthRules(notaCredito.id, tenantId);
      }

      await prisma.$transaction(async (tx) => {
        await tx.fatturaElettronica.update({
          where: { id },
          data: { stato: 'STORNATA' }
        });
        await tx.movimentoContabile.updateMany({
          where: { tenantId, deletedAt: null, fatturaElettronicaId: id },
          data: { fatturaElettronicaId: null, stato: 'DA_FATTURARE', updatedBy: req.person.id }
        });
        await tx.gdprAuditLog.create({
          data: {
            tenantId,
            personId: req.person.id,
            resourceType: 'FatturaElettronica',
            resourceId: id,
            action: 'UPDATE',
            dataAccessed: ['stato:STORNATA', `notaCredito:${notaCredito.id}`],
            ipAddress: req.ip || null,
            userAgent: req.get?.('user-agent') || null
          }
        }).catch(err => logger.warn('GdprAuditLog failed', { err: err.message }));
      });
      await syncAppuntamentoAfterBilling({ ...fattura, movimentiContabili: fattura.movimentiContabili }, tenantId, req.person.id, 'reopen');

      logger.info('Fattura stornata e pronta per rifacimento', {
        fatturaId: id,
        notaCreditoId: notaCredito.id,
        tenantId
      });

      return res.json({
        data: { fatturaId: id, notaCredito, stato: 'STORNATA' },
        message: 'Fattura stornata con nota di credito. Puoi creare una nuova fattura corretta.'
      });
    } catch (error) {
      logger.error('Errore POST fattura/:id/storna-e-rifai', { error: error.message, fatturaId: req.params.id });
      if (error.message.includes('AcubeAPI')) {
        return res.status(502).json({ error: 'Errore comunicazione SDI. Riprovare più tardi.' });
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

      if (fattura.stato === 'PAGATA') {
        await syncAppuntamentoAfterBilling(fattura, tenantId, req.person.id, 'paid');
        return res.json({ data: fattura, message: 'Fattura già segnata come pagata' });
      }

      if (fattura.stato !== 'EMESSA') {
        return res.status(409).json({
          error: `Solo le fatture EMESSA possono essere segnate come pagate. Stato attuale: ${fattura.stato}`
        });
      }

      const updated = await prisma.fatturaElettronica.update({
        where: { id },
        data: { stato: 'PAGATA' },
        include: { movimentiContabili: true }
      });
      await syncAppuntamentoAfterBilling(updated, tenantId, req.person.id, 'paid');

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
