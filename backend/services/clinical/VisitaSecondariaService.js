/**
 * VisitaSecondariaService — P73: Gestione Visite Secondarie (Prestazioni Esternalizzate)
 *
 * Quando un medico aggiunge una prestazione (es. ECG) assegnandola a uno specialista diverso
 * (es. cardiologo) durante una visita principale, questo servizio:
 *
 *   1. Crea una Visita secondaria assegnata allo specialista, collegata alla visita principale
 *      tramite `visitaParentId`.
 *   2. La visita secondaria ha `isVisitaSecundaria = true` e `appPrestazioneId` puntato
 *      all'AppuntamentoPrestazione che l'ha generata.
 *   3. I movimenti contabili (ENTRATA + USCITA) vengono generati UNA SOLA VOLTA al momento
 *      della creazione dell'AppuntamentoPrestazione, non al completamento della visita secondaria.
 *
 * Regole billing:
 *   - Visita principale → movimenti generati da `generaPerVisitaMDL` al completamento
 *     (SOLO per la prestazione principale, non per le aggiuntive esternalizzate)
 *   - AppuntamentoPrestazione con medicoReferente → movimenti generati da
 *     `generaPerAppuntamentoPrestazione` al momento della creazione
 *   - Visita secondaria → completamento senza rigenera movimenti (`isVisitaSecundaria = true`)
 *
 * @module services/clinical/VisitaSecondariaService
 * @project P73 - Multi-Medico Visits
 */

import prisma from '../../config/prisma-optimization.js';
import { logger } from '../../utils/logger.js';

class VisitaSecondariaService {
    /**
     * Crea una visita secondaria per uno specialista, collegata alla visita principale.
     *
     * @param {Object} params
     * @param {string} params.appPrestazioneId    ID dell'AppuntamentoPrestazione che ha scatenato la creazione
     * @param {string} params.prestazioneId       ID della Prestazione da eseguire (es. ECG)
     * @param {string} params.medicoReferenteId   ID del medico specialista (medicoRefertanteId sull'AppPrestazione)
     * @param {string} params.appuntamentoId      ID dell'Appuntamento principale
     * @param {string} [params.visitaParentId]    ID della Visita principale (se già create)
     * @param {string} params.tenantId
     * @param {string} [params.createdBy]         ID di chi ha eseguito l'operazione
     * @returns {Promise<Object>} La visita secondaria creata
     */
    async creaVisitaSecondaria({
        appPrestazioneId,
        prestazioneId,
        medicoReferenteId,
        appuntamentoId,
        visitaParentId,
        tenantId,
        createdBy
    }) {
        // 1. Carica l'appuntamento per ambulatorioId, pazienteId, dataOra, tipoVisitaMDL
        const appuntamento = await prisma.appuntamento.findFirst({
            where: { id: appuntamentoId, tenantId, deletedAt: null },
            select: {
                id: true,
                ambulatorioId: true,
                pazienteId: true,
                medicoId: true,
                dataOra: true
            }
        });

        if (!appuntamento) {
            throw new Error(`Appuntamento ${appuntamentoId} non trovato per visita secondaria`);
        }

        // 2. Trova la visita principale (se non già passata) tramite appuntamentoId
        let primaryVisitaId = visitaParentId;
        let tipoVisitaMDL = null;
        if (!primaryVisitaId) {
            const primaryVisita = await prisma.visita.findFirst({
                where: { appuntamentoId, tenantId, deletedAt: null, isVisitaSecundaria: false },
                select: { id: true, tipoVisitaMDL: true }
            });
            if (primaryVisita) {
                primaryVisitaId = primaryVisita.id;
                tipoVisitaMDL = primaryVisita.tipoVisitaMDL;
            }
        } else {
            const primaryVisita = await prisma.visita.findUnique({
                where: { id: primaryVisitaId },
                select: { tipoVisitaMDL: true }
            });
            tipoVisitaMDL = primaryVisita?.tipoVisitaMDL ?? null;
        }

        // 3. Verifica specialista != medico principale
        if (medicoReferenteId === appuntamento.medicoId) {
            logger.info({
                component: 'VisitaSecondariaService',
                action: 'creaVisitaSecondaria',
                appPrestazioneId,
                medicoReferenteId,
                appuntamentoMedicoId: appuntamento.medicoId
            }, 'Medico referente uguale al medico appuntamento — visita secondaria non necessaria');
            return null;
        }

        // 4. Verifica idempotenza: esiste già una visita secondaria per questo appPrestazioneId?
        const existing = await prisma.visita.findUnique({
            where: { appPrestazioneId }
        });
        if (existing) {
            logger.info({
                component: 'VisitaSecondariaService',
                action: 'creaVisitaSecondaria',
                appPrestazioneId,
                existingVisitaId: existing.id
            }, 'Visita secondaria già esistente per questo appPrestazioneId — skip');
            return existing;
        }

        // 5. Crea la visita secondaria
        const visitaSecundaria = await prisma.visita.create({
            data: {
                ambulatorioId: appuntamento.ambulatorioId,
                prestazioneId,
                pazienteId: appuntamento.pazienteId,
                medicoId: medicoReferenteId,
                dataOra: appuntamento.dataOra || new Date(),
                stato: 'IN_CORSO',
                tenantId,
                visitaParentId: primaryVisitaId || null,
                isVisitaSecundaria: true,
                appPrestazioneId,
                tipoVisitaMDL,
                createdBy: createdBy || null
            },
            include: {
                medico: {
                    select: { id: true, firstName: true, lastName: true, gender: true }
                },
                prestazione: {
                    select: { id: true, nome: true, codice: true }
                },
                visitaParent: {
                    select: { id: true, medicoId: true }
                }
            }
        });

        logger.info({
            component: 'VisitaSecondariaService',
            action: 'creaVisitaSecondaria',
            visitaSecondariaId: visitaSecundaria.id,
            visitaParentId: primaryVisitaId,
            appPrestazioneId,
            medicoReferenteId,
            tenantId
        }, 'Visita secondaria creata per specialista');

        return visitaSecundaria;
    }

    /**
     * Recupera le visite collegate (secondarie) ad una visita principale.
     *
     * @param {string} visitaId   ID della visita principale
     * @param {string} tenantId
     * @returns {Promise<Array>} Elenco delle visite secondarie con dati essenziali
     */
    async getVisiteCollegate(visitaId, tenantId) {
        const visiteSecundarie = await prisma.visita.findMany({
            where: {
                visitaParentId: visitaId,
                tenantId,
                deletedAt: null
            },
            include: {
                medico: {
                    select: { id: true, firstName: true, lastName: true, gender: true }
                },
                prestazione: {
                    select: { id: true, nome: true, codice: true }
                },
                appPrestazione: {
                    select: { id: true, stato: true, ordine: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        return visiteSecundarie;
    }

    /**
     * Recupera la visita principale di una visita secondaria.
     *
     * @param {string} visitaSecondariaId
     * @param {string} tenantId
     * @returns {Promise<Object|null>} La visita principale
     */
    async getVisitaPrincipale(visitaSecondariaId, tenantId) {
        const visitaSecundaria = await prisma.visita.findFirst({
            where: { id: visitaSecondariaId, tenantId, deletedAt: null, isVisitaSecundaria: true },
            select: {
                visitaParentId: true,
                visitaParent: {
                    select: {
                        id: true,
                        dataOra: true,
                        stato: true,
                        medico: { select: { id: true, firstName: true, lastName: true, gender: true } },
                        paziente: { select: { id: true, firstName: true, lastName: true } },
                        prestazione: { select: { id: true, nome: true } }
                    }
                }
            }
        });

        return visitaSecundaria?.visitaParent || null;
    }

    /**
     * Completa una visita secondaria aggiornando:
     *   - Visita.stato → COMPLETATA
     *   - AppuntamentoPrestazione.stato → ESEGUITA
     * NON genera movimenti contabili (già generati all'assegnazione della prestazione).
     *
     * @param {string} visitaSecondariaId
     * @param {string} tenantId
     * @param {string} [updatedBy]
     * @returns {Promise<Object>} Visita aggiornata
     */
    async completaVisitaSecondaria(visitaSecondariaId, tenantId, updatedBy) {
        const visita = await prisma.visita.findFirst({
            where: { id: visitaSecondariaId, tenantId, deletedAt: null, isVisitaSecundaria: true },
            select: { id: true, appPrestazioneId: true, stato: true }
        });

        if (!visita) {
            throw new Error(`Visita secondaria ${visitaSecondariaId} non trovata`);
        }

        if (visita.stato === 'COMPLETATA') {
            logger.info({ visitaSecondariaId }, 'Visita secondaria già COMPLETATA');
            return prisma.visita.findUnique({ where: { id: visitaSecondariaId } });
        }

        const [updatedVisita] = await prisma.$transaction([
            // Aggiorna stato visita
            prisma.visita.update({
                where: { id: visitaSecondariaId },
                data: {
                    stato: 'COMPLETATA',
                    updatedAt: new Date()
                }
            }),
            // Aggiorna stato AppuntamentoPrestazione (se presente)
            ...(visita.appPrestazioneId ? [
                prisma.appuntamentoPrestazione.update({
                    where: { id: visita.appPrestazioneId },
                    data: { stato: 'ESEGUITA', dataEsecuzione: new Date() }
                })
            ] : [])
        ]);

        logger.info({
            component: 'VisitaSecondariaService',
            action: 'completaVisitaSecondaria',
            visitaSecondariaId,
            tenantId
        }, 'Visita secondaria completata (nessun movimento contabile generato — già creati all\'assegnazione)');

        return updatedVisita;
    }
}

export default new VisitaSecondariaService();
