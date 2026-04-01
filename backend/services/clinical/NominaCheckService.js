/**
 * NominaCheckService - Daily check for expired/activated nominations
 * 
 * Runs daily to:
 * 1. Mark expired nominations as SCADUTA (dataScadenza < today, stato = ATTIVA)
 * 2. Activate successor nominations (dataInizio <= today, stato not ATTIVA yet)
 * 3. Generate movimenti contabili for newly activated nominations
 * 
 * @module services/clinical/NominaCheckService
 */

import prisma from '../../config/prisma-optimization.js';
import { logger } from '../../utils/logger.js';
import MovimentoContabileGenerator from '../management/MovimentoContabileGenerator.js';

const NominaCheckService = {
    /**
     * Main daily check routine
     * @returns {Promise<{expired: number, activated: number, movimentiGenerated: number, errors: string[]}>}
     */
    async dailyCheck() {
        const stats = { expired: 0, activated: 0, movimentiGenerated: 0, errors: [] };
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        try {
            // 1. Mark expired nominations: dataScadenza < today AND stato = ATTIVA
            const expiredNomine = await prisma.nominaRuolo.findMany({
                where: {
                    stato: 'ATTIVA',
                    deletedAt: null,
                    dataScadenza: { lt: today }
                },
                select: { id: true, tipoRuolo: true, tenantId: true, companyTenantProfileId: true, personId: true, dataScadenza: true }
            });

            for (const nomina of expiredNomine) {
                try {
                    await prisma.nominaRuolo.update({
                        where: { id: nomina.id },
                        data: { stato: 'SCADUTA', dataFine: nomina.dataScadenza || today }
                    });
                    stats.expired++;
                    logger.info({
                        nominaId: nomina.id,
                        tipoRuolo: nomina.tipoRuolo,
                        tenantId: nomina.tenantId
                    }, 'Nomina scaduta automaticamente');
                } catch (err) {
                    stats.errors.push(`Errore scadenza nomina ${nomina.id}`);
                    logger.error({ nominaId: nomina.id, error: err.message }, 'Errore scadenza automatica nomina');
                }
            }

            // 2. Activate successor nominations: dataInizio <= today AND stato NOT ATTIVA
            //    Only activate if no other ATTIVA nomina exists for same company+tipoRuolo
            const pendingNomine = await prisma.nominaRuolo.findMany({
                where: {
                    stato: { in: ['SOSPESA'] },
                    deletedAt: null,
                    dataInizio: { lte: today },
                    dataScadenza: { gt: today }
                },
                include: {
                    person: { select: { id: true, firstName: true, lastName: true } }
                }
            });

            for (const nomina of pendingNomine) {
                try {
                    // Check no active nomina exists for same company+tipoRuolo
                    const activeExists = await prisma.nominaRuolo.findFirst({
                        where: {
                            companyTenantProfileId: nomina.companyTenantProfileId,
                            tipoRuolo: nomina.tipoRuolo,
                            stato: 'ATTIVA',
                            deletedAt: null,
                            id: { not: nomina.id }
                        }
                    });

                    if (activeExists) continue; // Another nomination is still active

                    await prisma.nominaRuolo.update({
                        where: { id: nomina.id },
                        data: { stato: 'ATTIVA' }
                    });
                    stats.activated++;
                    logger.info({
                        nominaId: nomina.id,
                        tipoRuolo: nomina.tipoRuolo,
                        tenantId: nomina.tenantId
                    }, 'Nomina attivata automaticamente');

                    // 3. Generate movimenti contabili for newly activated nomination
                    try {
                        const genResult = await MovimentoContabileGenerator.generaPerNomina(
                            nomina,
                            nomina.tenantId,
                            'SYSTEM_CRON'
                        );
                        stats.movimentiGenerated += genResult.movimenti.length;
                    } catch (genErr) {
                        stats.errors.push(`Errore generazione movimento per nomina ${nomina.id}`);
                        logger.error({ nominaId: nomina.id, error: genErr.message }, 'Errore generazione movimento contabile per nomina attivata');
                    }
                } catch (err) {
                    stats.errors.push(`Errore attivazione nomina ${nomina.id}`);
                    logger.error({ nominaId: nomina.id, error: err.message }, 'Errore attivazione automatica nomina');
                }
            }

            logger.info(stats, 'Daily nomination check completed');
        } catch (error) {
            logger.error({ error: error.message }, 'Daily nomination check failed');
            stats.errors.push('Errore generale nel controllo nomine');
        }

        return stats;
    }
};

export default NominaCheckService;
