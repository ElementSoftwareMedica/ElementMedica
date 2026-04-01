/**
 * SdiPollingScheduler - Polling automatico stato fatture SDI via AcubeAPI
 *
 * Problema: AcubeAPI notifica gli aggiornamenti di stato via webhook, ma:
 * - Il webhook potrebbe non essere configurato/irraggiungibile in sandbox
 * - Il webhook potrebbe fallire per problemi transitori di rete
 * - Serve un fallback di polling periodico come garanzia di consistenza
 *
 * Questo scheduler interroga AcubeAPI ogni 30 minuti per tutte le fatture
 * con stato "EMESSA" + acubeStatus "WAITING" (in attesa SDI) e aggiorna
 * il DB se lo stato è cambiato.
 *
 * Integrazione: api-server.js importa `startSdiPolling` e la chiama a startup.
 *
 * @module services/billing/SdiPollingScheduler
 * @project P97 - Fatturazione Elettronica
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { getStatoFattura, ACUBE_STATUS_MAP } from './AcubeApiService.js';
import { aggiornaStatoFatturaSDI } from './FatturazioneService.js';

// ============================================================================
// COSTANTI
// ============================================================================

/** Soglia massima di tentativi: dopo 7 giorni in WAITING ci arrendiamo con log */
const MAX_DAYS_WAITING = 7;

/** Quante fatture interrogare per ciclo (prevenzione rate limit AcubeAPI) */
const BATCH_SIZE = 50;

/** Pausa tra richieste consecutive in ms (rate limiting gentile) */
const REQUEST_DELAY_MS = 500;

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Attende {ms} millisecondi
 * @param {number} ms
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// CORE POLLING LOGIC
// ============================================================================

/**
 * Esegue un ciclo di polling per aggiornare lo stato SDI di tutte le fatture
 * che sono in attesa di risposta da AcubeAPI (acubeStatus = 'WAITING').
 *
 * @returns {Promise<{ checked: number, updated: number, errors: number }>}
 */
export async function pollSdiFatturePendenti() {
    const startedAt = new Date();
    logger.info('[SdiPolling] Ciclo polling avviato', {
        timestamp: startedAt.toISOString(),
    });

    let checked = 0;
    let updated = 0;
    let errors = 0;

    try {
        // Soglia per ignorare fatture troppo vecchie (7 giorni)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - MAX_DAYS_WAITING);

        // Tutte le fatture emesse in attesa di risposta SDI
        const fatturePendenti = await prisma.fatturaElettronica.findMany({
            where: {
                deletedAt: null,
                acubeStatus: 'WAITING',
                acubeUuid: { not: null },
                acubeLastSync: { gt: cutoffDate }, // ignora fatture bloccate da >7gg
            },
            select: {
                id: true,
                acubeUuid: true,
                acubeStatus: true,
                acubeLastSync: true,
                numero: true,
                tenantId: true,
            },
            orderBy: { acubeLastSync: 'asc' }, // priorità alle più vecchie
            take: BATCH_SIZE,
        });

        if (fatturePendenti.length === 0) {
            logger.info('[SdiPolling] Nessuna fattura in attesa SDI', {
                timestamp: new Date().toISOString(),
            });
            return { checked: 0, updated: 0, errors: 0 };
        }

        logger.info(`[SdiPolling] Controllando ${fatturePendenti.length} fatture in attesa SDI`);

        for (const fattura of fatturePendenti) {
            checked++;
            try {
                // Interroga AcubeAPI per lo stato corrente
                const acubeData = await getStatoFattura(null, fattura.acubeUuid);

                // AcubeAPI restituisce { status: 'WAITING'|'SENT'|'DELIVERED'|'NOT_DELIVERED'|'REJECTED', ... }
                const remoteStatus = (acubeData?.status || '').toUpperCase();
                const mappedStatus = ACUBE_STATUS_MAP[remoteStatus] || remoteStatus;

                if (!remoteStatus) {
                    logger.warn('[SdiPolling] AcubeAPI: status vuoto', {
                        acubeUuid: fattura.acubeUuid,
                        numero: fattura.numero,
                        response: JSON.stringify(acubeData).slice(0, 200),
                    });
                } else if (mappedStatus !== fattura.acubeStatus) {
                    // Status cambiato → aggiorna DB
                    const xmlEsito = acubeData?.xml_esito || acubeData?.xmlEsito || null;
                    await aggiornaStatoFatturaSDI(fattura.acubeUuid, remoteStatus, xmlEsito);

                    logger.info('[SdiPolling] Stato aggiornato', {
                        numero: fattura.numero,
                        acubeUuid: fattura.acubeUuid,
                        oldStatus: fattura.acubeStatus,
                        newStatus: mappedStatus,
                    });
                    updated++;
                } else {
                    // Nessun cambiamento: aggiorna solo acubeLastSync per refresh timestamp
                    await prisma.fatturaElettronica.update({
                        where: { id: fattura.id },
                        data: { acubeLastSync: new Date() },
                    });
                }

                // Rate limiting gentile
                if (fatturePendenti.indexOf(fattura) < fatturePendenti.length - 1) {
                    await sleep(REQUEST_DELAY_MS);
                }
            } catch (err) {
                errors++;
                logger.error('[SdiPolling] Errore controllo fattura', {
                    acubeUuid: fattura.acubeUuid,
                    numero: fattura.numero,
                    error: err.message,
                });
                // Continua con le altre fatture
            }
        }
    } catch (err) {
        logger.error('[SdiPolling] Errore ciclo polling', { error: err.message });
        errors++;
    }

    const durationMs = Date.now() - startedAt.getTime();
    logger.info('[SdiPolling] Ciclo completato', {
        checked,
        updated,
        errors,
        durationMs,
    });

    return { checked, updated, errors };
}

/**
 * Avvia il polling SDI periodico.
 * Da chiamare una sola volta al startup del server.
 *
 * @param {import('node-cron')} cron - istanza node-cron
 */
export function startSdiPolling(cron) {
    // Polling ogni 30 minuti
    const schedule = '*/30 * * * *';

    cron.schedule(schedule, async () => {
        try {
            await pollSdiFatturePendenti();
        } catch (err) {
            logger.error('[SdiPolling] Errore inaspettato nel cron job', {
                error: err.message,
            });
        }
    });

    logger.info('[SdiPolling] Polling SDI schedulato (ogni 30 minuti)', {
        schedule,
        service: 'api-server',
    });

    // Esegui anche all'avvio (con delay 20s per far stabilizzare Prisma)
    setTimeout(async () => {
        try {
            logger.info('[SdiPolling] Esecuzione startup check SDI...');
            await pollSdiFatturePendenti();
        } catch (err) {
            logger.error('[SdiPolling] Errore startup check SDI', { error: err.message });
        }
    }, 20000);
}
