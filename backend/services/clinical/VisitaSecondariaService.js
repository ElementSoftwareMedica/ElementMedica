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
import NotificationService from '../notifications/NotificationService.js';
import { VisitTemplateService } from './VisitTemplateService.js';

function toLocalDayKey(date) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Rome',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date || new Date());
}

class VisitaSecondariaService {
    async resolveTemplateSecondaria({ medicoReferenteId, tenantId, prestazioneId, createdBy }) {
        let template = await VisitTemplateService.ensureSpecialistTemplateForPrestazione(
            prestazioneId,
            tenantId,
            createdBy || null
        ).catch(error => {
            logger.warn({
                component: 'VisitaSecondariaService',
                action: 'ensure_specialist_template',
                error: error.message,
                prestazioneId,
                tenantId
            }, 'Template specialistico visita secondaria non creato');
            return null;
        });

        if (template?.id) return template;

        template = await VisitTemplateService.findTemplateForVisit(
            medicoReferenteId,
            tenantId,
            prestazioneId || undefined,
            undefined
        ).catch(error => {
            logger.warn({
                component: 'VisitaSecondariaService',
                action: 'resolve_template',
                error: error.message,
                medicoReferenteId,
                prestazioneId,
                tenantId
            }, 'Template visita secondaria non risolto');
            return null;
        });

        return template;
    }

    async notifyMedicoVisitaSecondaria(visita, tenantId, triggeredBy) {
        if (!visita?.medicoId) return null;

        const dayKey = toLocalDayKey(visita.dataOra);
        const entityId = `${visita.medicoId}:${dayKey}`;
        const existing = await prisma.notification.findFirst({
            where: {
                tenantId,
                recipientId: visita.medicoId,
                entityType: 'VISITE_SECONDARIE_GIORNO',
                entityId,
                deletedAt: null,
                logs: {
                    none: {
                        recipientId: visita.medicoId,
                        readAt: { not: null }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const count = Number(existing?.metadata?.count || 0) + 1;
        const prestazioneNome = visita.prestazione?.nome || 'prestazione specialistica';
        const body = count > 1
            ? `Hai ${count} visite secondarie assegnate per il ${dayKey}.`
            : `Ti e' stata assegnata una visita secondaria per ${prestazioneNome}.`;

        if (existing) {
            return prisma.notification.update({
                where: { id: existing.id },
                data: {
                    body,
                    shortBody: body,
                    actionUrl: '/poliambulatorio/visite',
                    metadata: {
                        ...(existing.metadata || {}),
                        count,
                        latestVisitaId: visita.id,
                        latestPrestazioneId: visita.prestazioneId
                    }
                }
            });
        }

        return NotificationService.sendToPerson(visita.medicoId, {
            title: 'Nuova visita secondaria',
            body,
            shortBody: body,
            type: 'ACTION',
            category: 'VISIT',
            priority: 'HIGH',
            icon: 'stethoscope',
            entityType: 'VISITE_SECONDARIE_GIORNO',
            entityId,
            actionUrl: `/poliambulatorio/visite/${visita.id}`,
            actionLabel: 'Apri visita',
            triggeredBy: triggeredBy || null,
            metadata: {
                count: 1,
                dayKey,
                latestVisitaId: visita.id,
                latestPrestazioneId: visita.prestazioneId
            }
        }, tenantId);
    }

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
     * @param {boolean} [params.forceCreateForSameMedico=false] Crea la scheda anche se il medico coincide con la visita principale
     * @returns {Promise<Object>} La visita secondaria creata
     */
    async creaVisitaSecondaria({
        appPrestazioneId,
        prestazioneId,
        medicoReferenteId,
        appuntamentoId,
        visitaParentId,
        tenantId,
        createdBy,
        forceCreateForSameMedico = false
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
        if (medicoReferenteId === appuntamento.medicoId && !forceCreateForSameMedico) {
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
            let activeExisting = existing;
            if (existing.deletedAt || existing.stato === 'ANNULLATA') {
                activeExisting = await prisma.visita.update({
                    where: { id: existing.id },
                    data: {
                        deletedAt: null,
                        stato: 'IN_CORSO',
                        medicoId: medicoReferenteId,
                        medicoRefertanteId: medicoReferenteId,
                        prestazioneId,
                        visitaParentId: primaryVisitaId || existing.visitaParentId || null,
                        updatedAt: new Date()
                    }
                });
            }
            logger.info({
                component: 'VisitaSecondariaService',
                action: 'creaVisitaSecondaria',
                appPrestazioneId,
                existingVisitaId: activeExisting.id
            }, 'Visita secondaria già esistente per questo appPrestazioneId — skip');
            const template = await this.resolveTemplateSecondaria({
                medicoReferenteId,
                tenantId,
                prestazioneId,
                createdBy
            });
            if (template?.id && activeExisting.visitTemplateId !== template.id) {
                activeExisting = await prisma.visita.update({
                    where: { id: activeExisting.id },
                    data: { visitTemplateId: template.id }
                });
            }
            await this.notifyMedicoVisitaSecondaria(activeExisting, tenantId, createdBy).catch(err => {
                logger.warn({ error: err.message, visitaSecondariaId: activeExisting.id }, 'Notifica visita secondaria non inviata');
            });
            return activeExisting;
        }

        const visitTemplate = await this.resolveTemplateSecondaria({
            medicoReferenteId,
            tenantId,
            prestazioneId,
            createdBy
        });

        // 5. Crea la visita secondaria
        const visitaSecundaria = await prisma.visita.create({
            data: {
                ambulatorioId: appuntamento.ambulatorioId,
                prestazioneId,
                pazienteId: appuntamento.pazienteId,
                medicoId: medicoReferenteId,
                medicoRefertanteId: medicoReferenteId,
                visitTemplateId: visitTemplate?.id || null,
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

        await this.notifyMedicoVisitaSecondaria(visitaSecundaria, tenantId, createdBy).catch(err => {
            logger.warn({ error: err.message, visitaSecondariaId: visitaSecundaria.id }, 'Notifica visita secondaria non inviata');
        });

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
            if (visita.appPrestazioneId) {
                await prisma.appuntamentoPrestazione.updateMany({
                    where: { id: visita.appPrestazioneId, tenantId, deletedAt: null },
                    data: { stato: 'ESEGUITA', dataEsecuzione: new Date() }
                });
            }
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
