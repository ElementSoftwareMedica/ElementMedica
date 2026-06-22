/**
 * PeriodicBillingScheduler
 *
 * Genera automaticamente, una volta al mese e in orario di basso carico, i
 * movimenti contabili periodici (spese fisse/ricorrenti del tariffario aziendale)
 * per tutte le aziende con un tariffario attivo.
 *
 * L'idempotenza è garantita da MovimentoContabileGenerator.generaPeriodiciFissi:
 * per ogni voce viene creato al massimo un movimento per periodo di ricorrenza,
 * quindi una nuova esecuzione non duplica i movimenti già generati nel periodo in
 * corso e, per le voci PER_DIPENDENTE non ancora fatturate, adegua il numero dei
 * dipendenti se nel frattempo è cambiato.
 *
 * @module services/billing/PeriodicBillingScheduler
 */

import MovimentoContabileGenerator from '../management/MovimentoContabileGenerator.js';
import logger from '../../utils/logger.js';

// 1° giorno del mese alle 03:00 (Europe/Rome) — finestra di basso carico
const MONTHLY_SCHEDULE = '0 3 1 * *';

let running = false;

/**
 * Esegue il batch periodico per tutte le aziende.
 * @returns {Promise<{aziende:number, movimentiCreati:number, errori:number}>}
 */
export async function runPeriodicBilling() {
    if (running) {
        logger.warn('[PeriodicBilling] Esecuzione già in corso, skip');
        return { aziende: 0, movimentiCreati: 0, errori: 0, skipped: true };
    }
    running = true;
    const startedAt = Date.now();
    try {
        logger.info('[PeriodicBilling] Avvio generazione movimenti periodici mensili...');
        const summary = await MovimentoContabileGenerator.generaPeriodiciTutteAziende(null);
        logger.info('[PeriodicBilling] Completato', {
            ...summary,
            durationMs: Date.now() - startedAt,
            service: 'api-server',
        });
        return summary;
    } catch (err) {
        logger.error('[PeriodicBilling] Errore inaspettato nel batch periodico', { error: err.message });
        return { aziende: 0, movimentiCreati: 0, errori: 1 };
    } finally {
        running = false;
    }
}

/**
 * Registra il cron mensile. Da chiamare una sola volta allo startup del server.
 * @param {import('node-cron')} cron - istanza node-cron
 */
export function startPeriodicBilling(cron) {
    cron.schedule(MONTHLY_SCHEDULE, async () => {
        await runPeriodicBilling();
    }, { timezone: 'Europe/Rome' });

    logger.info('[PeriodicBilling] Batch mensile schedulato (1° del mese, 03:00 Europe/Rome)', {
        schedule: MONTHLY_SCHEDULE,
        service: 'api-server',
    });
}

export default { startPeriodicBilling, runPeriodicBilling };
