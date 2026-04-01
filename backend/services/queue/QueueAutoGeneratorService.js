/**
 * Queue Auto Generator Service
 *
 * P70: Generazione automatica sessioni coda
 * - 6:30 → genera sessioni coda per slot della mattina (oraInizio < 12:00)
 * - 13:30 → genera sessioni coda per slot del pomeriggio (oraInizio >= 12:00)
 * - Bulk day generation: genera tutte le sessioni di un giorno
 *
 * @module services/queue/QueueAutoGeneratorService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import QueueSessionService from './QueueSessionService.js';

/**
 * Formatta una Date in YYYY-MM-DD usando UTC
 */
function toDateString(date) {
    const d = new Date(date);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

/**
 * Ritorna midnight UTC per una data
 */
function toUTCMidnight(date) {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

const QueueAutoGeneratorService = {

    /**
     * Genera sessioni coda per tutti gli slot di un giorno specifico.
     * Può essere filtrato per fascia oraria (mattina / pomeriggio / tutto).
     *
     * @param {Date|string} date - Giorno da processare
     * @param {string|null} tenantId - Filtra per tenant (null = tutti i tenant)
     * @param {'MATTINA'|'POMERIGGIO'|'TUTTO'} [fascia='TUTTO'] - Fascia oraria
     * @returns {Promise<{create: number, skip: number, errors: number, details: Array}>}
     */
    async generateForDay(date, tenantId = null, fascia = 'TUTTO') {
        const result = { created: 0, skipped: 0, errors: 0, details: [] };

        try {
            const targetDate = toUTCMidnight(date);
            const dateStr = toDateString(targetDate);

            logger.info('QueueAutoGenerator: inizio generazione sessioni', {
                date: dateStr,
                tenantId: tenantId || 'ALL',
                fascia,
            });

            // Query slots del giorno (filtrando per ambulatorio.tenantId)
            const ambWhere = { deletedAt: null };
            if (tenantId) ambWhere.tenantId = tenantId;

            const slots = await prisma.slotDisponibilita.findMany({
                where: {
                    data: targetDate,
                    deletedAt: null,
                    disponibile: true,
                    ambulatorio: ambWhere,
                    ...(fascia === 'MATTINA' ? { oraInizio: { lt: '12:00' } } : {}),
                    ...(fascia === 'POMERIGGIO' ? { oraInizio: { gte: '12:00' } } : {}),
                },
                select: {
                    id: true,
                    ambulatorioId: true,
                    medicoId: true,
                    oraInizio: true,
                    oraFine: true,
                    data: true,
                    ambulatorio: {
                        select: { id: true, tenantId: true, nome: true }
                    }
                }
            });

            logger.info(`QueueAutoGenerator: trovati ${slots.length} slot`, {
                date: dateStr,
                fascia,
                tenantId: tenantId || 'ALL',
            });

            for (const slot of slots) {
                const slotTenantId = slot.ambulatorio?.tenantId;
                if (!slotTenantId) {
                    result.errors++;
                    continue;
                }

                try {
                    // Verifica se esiste già una sessione per questo slot
                    const existing = await QueueSessionService.checkExisting({
                        tenantId: slotTenantId,
                        date: targetDate,
                        mode: 'DISPLAY',
                        slotDisponibilitaId: slot.id,
                        medicoPersonId: slot.medicoId,
                    });

                    if (existing) {
                        result.skipped++;
                        result.details.push({
                            slotId: slot.id,
                            ambulatorioId: slot.ambulatorioId,
                            oraInizio: slot.oraInizio,
                            status: 'skipped',
                            reason: 'Sessione già esistente',
                        });
                        continue;
                    }

                    // Crea la sessione per questo slot
                    const session = await QueueSessionService.create({
                        tenantId: slotTenantId,
                        date: targetDate,
                        ambulatorioId: slot.ambulatorioId,
                        mode: 'DISPLAY',
                        slotDisponibilitaId: slot.id,
                        mediciIds: slot.medicoId ? [slot.medicoId] : [],
                        ambulatoriIds: [],
                    });

                    // Genera numeri dai appuntamenti esistenti per questo slot
                    try {
                        await QueueSessionService.generateFromAppointments(session.id, slotTenantId);
                    } catch (genErr) {
                        logger.warn('QueueAutoGenerator: generateFromAppointments fallito (non bloccante)', {
                            sessionId: session.id,
                            slotId: slot.id,
                            error: genErr.message,
                        });
                    }

                    result.created++;
                    result.details.push({
                        slotId: slot.id,
                        sessionId: session.id,
                        ambulatorioId: slot.ambulatorioId,
                        ambulatorioNome: slot.ambulatorio.nome,
                        oraInizio: slot.oraInizio,
                        status: 'created',
                    });

                    logger.info('QueueAutoGenerator: sessione creata', {
                        sessionId: session.id,
                        slotId: slot.id,
                        ambulatorioId: slot.ambulatorioId,
                        oraInizio: slot.oraInizio,
                        tenantId: slotTenantId,
                    });

                } catch (slotErr) {
                    // Se la sessione esiste già, considera come skip
                    if (slotErr.message?.includes('Esiste già una sessione')) {
                        result.skipped++;
                        result.details.push({
                            slotId: slot.id,
                            ambulatorioId: slot.ambulatorioId,
                            oraInizio: slot.oraInizio,
                            status: 'skipped',
                            reason: slotErr.message,
                        });
                    } else {
                        result.errors++;
                        result.details.push({
                            slotId: slot.id,
                            ambulatorioId: slot.ambulatorioId,
                            oraInizio: slot.oraInizio,
                            status: 'error',
                            reason: slotErr.message,
                        });
                        logger.error('QueueAutoGenerator: errore creazione sessione per slot', {
                            slotId: slot.id,
                            error: slotErr.message,
                        });
                    }
                }
            }

            logger.info('QueueAutoGenerator: generazione completata', {
                date: dateStr,
                fascia,
                tenantId: tenantId || 'ALL',
                ...result,
            });

        } catch (err) {
            logger.error('QueueAutoGenerator: errore critico', { error: err.message });
            throw err;
        }

        return result;
    },

    /**
     * P70: Genera sessioni mattina (slot con oraInizio < 12:00) per oggi.
     * Da schedulare alle 6:30.
     *
     * @returns {Promise<Object>} Risultato generazione
     */
    async generateMorningSlots() {
        return this.generateForDay(new Date(), null, 'MATTINA');
    },

    /**
     * P70: Genera sessioni pomeriggio (slot con oraInizio >= 12:00) per oggi.
     * Da schedulare alle 13:30.
     *
     * @returns {Promise<Object>} Risultato generazione
     */
    async generateAfternoonSlots() {
        return this.generateForDay(new Date(), null, 'POMERIGGIO');
    },
};

export default QueueAutoGeneratorService;
