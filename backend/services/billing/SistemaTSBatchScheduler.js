/**
 * SistemaTSBatchScheduler
 *
 * Trasmette al Sistema Tessera Sanitaria (MEF) tutte le spese sanitarie ancora
 * in sospeso, per ogni tenant. È la rete di sicurezza per il rispetto dei termini
 * di legge: la trasmissione "ideale" avviene immediatamente all'emissione della
 * fattura sanitaria (vedi emitDocumentRespectingHealthRules / route emetti), ma
 * eventuali fatture non trasmesse al primo tentativo (errore di rete, credenziali
 * inserite successivamente, ecc.) vengono recuperate qui ben prima della scadenza
 * mensile prevista dalla normativa.
 *
 * Schedulazione: ogni giorno alle 04:15 (Europe/Rome) — finestra di basso carico
 * e DISTINTA dagli altri job programmati per non sovraccaricare il server:
 *   - 01:00 nomina check        - 02:00 (lun) report
 *   - 03:00 subscription expiry - 03:00 (1 del mese) periodic billing
 *   - 06:00/06:30/13:30 slot    - 22:00 EOD          - SDI polling ogni 30 min
 *
 * Idempotenza: vengono selezionate solo le fatture con sistemaTsProtocol = null;
 * dopo una trasmissione riuscita la fattura viene marcata, quindi non viene
 * ritrasmessa nelle esecuzioni successive.
 *
 * @module services/billing/SistemaTSBatchScheduler
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { sincronizzaSistemaTS } from './SistemaTSService.js';

// Ogni giorno alle 04:15 Europe/Rome
const DAILY_SCHEDULE = '15 4 * * *';

// Limite di sicurezza per singola esecuzione (l'idempotenza recupera il resto il giorno dopo)
const MAX_PER_RUN = 1000;

let running = false;

/**
 * Esegue la trasmissione batch delle spese sanitarie pending per tutti i tenant.
 * @returns {Promise<{trasmesse:number, fallite:number, totale:number, skipped?:boolean}>}
 */
export async function runSistemaTSBatch() {
  if (running) {
    logger.warn('[SistemaTSBatch] Esecuzione già in corso, skip');
    return { trasmesse: 0, fallite: 0, totale: 0, skipped: true };
  }
  running = true;
  const startedAt = Date.now();

  try {
    // Tutte le spese sanitarie pending (tutti i tenant), escluse le opposizioni
    const pending = await prisma.fatturaElettronica.findMany({
      where: {
        deletedAt: null,
        stato: { in: ['EMESSA', 'PAGATA'] },
        tipoServizio: { in: ['VISITA', 'PRESTAZIONE_CLINICA'] },
        sistemaTsProtocol: null,
        sistemaTsFlagOpp: 0,
        enteEmittente: { sistemaTsAbilitato: true, deletedAt: null },
      },
      select: { id: true, tenantId: true },
      orderBy: { dataEmissione: 'asc' },
      take: MAX_PER_RUN,
    });

    if (pending.length === 0) {
      logger.info('[SistemaTSBatch] Nessuna spesa sanitaria pending da trasmettere');
      return { trasmesse: 0, fallite: 0, totale: 0 };
    }

    let trasmesse = 0;
    let fallite = 0;
    // Conteggio errori per codice (per diagnosi: credenziali mancanti vs CF non valido, ecc.)
    const erroriPerCodice = {};

    for (const fattura of pending) {
      try {
        await sincronizzaSistemaTS(fattura.id, null, fattura.tenantId);
        trasmesse += 1;
      } catch (err) {
        fallite += 1;
        const code = err.code || 'GENERICO';
        erroriPerCodice[code] = (erroriPerCodice[code] || 0) + 1;
      }
    }

    const summary = {
      trasmesse,
      fallite,
      totale: pending.length,
      troncato: pending.length === MAX_PER_RUN,
      erroriPerCodice,
      durationMs: Date.now() - startedAt,
      service: 'api-server',
    };
    logger.info('[SistemaTSBatch] Completato', summary);
    return summary;
  } catch (err) {
    logger.error('[SistemaTSBatch] Errore inaspettato nel batch SistemaTS', { error: err.message });
    return { trasmesse: 0, fallite: 1, totale: 0 };
  } finally {
    running = false;
  }
}

/**
 * Registra il cron giornaliero. Da chiamare una sola volta allo startup del server.
 * @param {import('node-cron')} cron - istanza node-cron
 */
export function startSistemaTSBatch(cron) {
  cron.schedule(DAILY_SCHEDULE, async () => {
    await runSistemaTSBatch();
  }, { timezone: 'Europe/Rome' });

  logger.info('[SistemaTSBatch] Batch giornaliero schedulato (04:15 Europe/Rome)', {
    schedule: DAILY_SCHEDULE,
    service: 'api-server',
  });
}

export default { startSistemaTSBatch, runSistemaTSBatch };
