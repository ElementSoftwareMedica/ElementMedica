/**
 * @file appuntamentiController.js
 * @description Controller per la gestione degli appuntamenti
 * 
 * P53-S14: getToday usa formatDateYMD(YYYY-MM-DD) per coerenza con getAll
 * — evita mismatch orario tra /agenda e /calendario causato da
 *   parseToStartOfDay che gestisce ISO e YYYY-MM-DD diversamente.
 * 
 * @module controllers/clinica/appuntamenti
 */

import logger from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../../routes/clinica/utils/clinica-utils.js';
import { AppuntamentoService } from '../../services/clinical/AppuntamentoService.js';
import { personTenantAccessService } from '../../services/PersonTenantAccessService.js';
import { QueueEntryService, QueueSessionService } from '../../services/queue/index.js';
import { RBACService } from '../../services/RBACService.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { formatDateYMD } from '../../utils/dateUtils.js';

/**
 * Lista appuntamenti con filtri e paginazione (supporta multi-tenant)
 * Gestisce il permesso VIEW_OTHERS: se l'utente è un medico senza questo permesso,
 * vedrà solo i propri appuntamenti.
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export const getAll = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const personId = req.person?.id;
        const globalRole = req.person?.globalRole;

        // Multi-tenant support: get accessible tenants
        const accessibleTenants = await personTenantAccessService.getAccessibleTenants(personId, globalRole);
        const accessibleTenantIds = accessibleTenants.map(t => t.id);

        // Parse allTenants and tenantIds from query
        const showAllTenants = req.query.allTenants === 'true';
        const queryTenantIds = req.query.tenantIds ? req.query.tenantIds.split(',') : null;

        // Determine effective tenant IDs
        let effectiveTenantIds;
        if (showAllTenants && accessibleTenantIds.length > 0) {
            effectiveTenantIds = accessibleTenantIds;
        } else if (queryTenantIds && queryTenantIds.length > 0) {
            effectiveTenantIds = queryTenantIds.filter(id => accessibleTenantIds.includes(id));
        } else {
            effectiveTenantIds = [tenantId];
        }

        logger.debug('Appuntamenti query debug', {
            component: 'appuntamenti-controller',
            personId,
            effectiveTenantIds,
            showAllTenants,
            queryTenantIds
        });

        const {
            page = 1,
            limit = 20,
            dataInizio,
            dataFine,
            oraInizio,
            oraFine,
            medicoId,
            pazienteId,
            ambulatorioId,
            sedeId,
            poliambulatorioId,
            stato,
            search,
            orderBy = 'dataOra',
            orderDir = 'asc'
        } = req.query;

        // Parse filters from query
        const filters = req.query.filters || {};

        // === VIEW_OTHERS PERMISSION CHECK ===
        // Se l'utente è un medico senza permesso VIEW_OTHERS, filtra solo i propri appuntamenti
        let effectiveMedicoId = medicoId || filters.medicoId;
        const hasViewOthersPermission = await RBACService.hasPermission(
            personId,
            PERMISSIONS.APPUNTAMENTI_VIEW_OTHERS
        );

        if (!hasViewOthersPermission && !effectiveMedicoId) {
            // Utente senza permesso VIEW_OTHERS: mostra solo i propri appuntamenti
            effectiveMedicoId = personId;
            logger.debug('VIEW_OTHERS permission denied - filtering by current user medicoId', {
                component: 'appuntamenti-controller',
                personId,
                effectiveMedicoId
            });
        }

        const result = await AppuntamentoService.getAll(tenantId, {
            page: parseInt(page),
            limit: parseInt(limit),
            dateFrom: dataInizio || filters.dataInizio,
            dateTo: dataFine || filters.dataFine,
            oraInizio: oraInizio || filters.oraInizio,
            oraFine: oraFine || filters.oraFine,
            medicoId: effectiveMedicoId,
            pazienteId: pazienteId || filters.pazienteId,
            ambulatorioId: ambulatorioId || filters.ambulatorioId,
            sedeId: sedeId || filters.sedeId,
            poliambulatorioId: poliambulatorioId || filters.poliambulatorioId,
            stato: stato || filters.stato,
            search,
            orderBy,
            orderDir,
            // Multi-tenant support
            tenantIds: effectiveTenantIds
        });

        // Aggiungi flag nel response per indicare se l'utente può vedere altri medici
        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination,
            meta: {
                canViewOtherMedici: hasViewOthersPermission
            }
        });
    } catch (error) {
        logger.error('Failed to get appuntamenti', {
            component: 'appuntamenti-controller',
            error: 'Errore interno del server',
            tenantId: getEffectiveTenantId(req)
        });

        res.status(500).json({
            success: false,
            error: 'Errore nel recupero degli appuntamenti',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Lista appuntamenti di oggi
 * Rispetta il permesso VIEW_OTHERS per filtrare solo gli appuntamenti del medico corrente
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export const getToday = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const personId = req.person?.id;
        // Use YYYY-MM-DD format for consistent date handling (matches CalendarioPage behavior)
        // This ensures parseToStartOfDay/parseToEndOfDay use the YYYY-MM-DD path,
        // avoiding timezone discrepancies between /agenda and /calendario
        const todayStr = formatDateYMD(new Date());

        // === VIEW_OTHERS PERMISSION CHECK ===
        let medicoId = null;
        const hasViewOthersPermission = await RBACService.hasPermission(
            personId,
            PERMISSIONS.APPUNTAMENTI_VIEW_OTHERS
        );

        if (!hasViewOthersPermission) {
            // Utente senza permesso VIEW_OTHERS: mostra solo i propri appuntamenti
            medicoId = personId;
            logger.debug('getToday: VIEW_OTHERS permission denied - filtering by current user', {
                component: 'appuntamenti-controller',
                personId
            });
        }

        const result = await AppuntamentoService.getAll(tenantId, {
            page: 1,
            limit: 100,
            dateFrom: todayStr,
            dateTo: todayStr,
            medicoId,
            orderBy: 'dataOra',
            orderDir: 'asc'
        });

        res.json({
            success: true,
            data: result.data,
            count: result.data.length,
            meta: {
                canViewOtherMedici: hasViewOthersPermission
            }
        });
    } catch (error) {
        logger.error('Failed to get today appuntamenti', {
            component: 'appuntamenti-controller',
            error: 'Errore interno del server',
            tenantId: getEffectiveTenantId(req)
        });

        res.status(500).json({
            success: false,
            error: 'Errore nel recupero degli appuntamenti',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Dettaglio appuntamento per ID
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export const getById = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const appuntamento = await AppuntamentoService.getById(req.params.id, tenantId);

        if (!appuntamento) {
            return res.status(404).json({
                success: false,
                error: 'Appuntamento non trovato'
            });
        }

        res.json({
            success: true,
            data: appuntamento
        });
    } catch (error) {
        logger.error('Failed to get appuntamento', {
            component: 'appuntamenti-controller',
            error: 'Errore interno del server',
            appuntamentoId: req.params.id,
            tenantId: getEffectiveTenantId(req)
        });

        res.status(500).json({
            success: false,
            error: 'Errore nel recupero dell\'appuntamento',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Lista appuntamenti per paziente
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export const getByPaziente = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { pazienteId } = req.params;
        const { stato, dataInizio, dataFine } = req.query;

        const filters = {};
        if (stato) filters.stato = stato;
        if (dataInizio) filters.dateFrom = dataInizio;
        if (dataFine) filters.dateTo = dataFine;
        filters.pazienteId = pazienteId;

        const result = await AppuntamentoService.getAll(tenantId, {
            ...filters,
            page: 1,
            limit: 100,
            orderBy: 'dataOra',
            orderDir: 'desc'
        });

        res.json({
            success: true,
            data: result.data,
            pazienteId
        });
    } catch (error) {
        logger.error('Failed to get appuntamenti by paziente', {
            component: 'appuntamenti-controller',
            error: 'Errore interno del server',
            pazienteId: req.params.pazienteId,
            tenantId: getEffectiveTenantId(req)
        });

        res.status(500).json({
            success: false,
            error: 'Errore nel recupero degli appuntamenti',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Crea nuovo appuntamento
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export const create = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const createdBy = req.person.id;

        const appuntamento = await AppuntamentoService.create(req.body, tenantId, createdBy);

        res.status(201).json({
            success: true,
            data: appuntamento,
            message: 'Appuntamento creato con successo'
        });
    } catch (error) {
        const tenantId = getEffectiveTenantId(req);
        const isConflict = error.message?.includes('conflict');

        if (isConflict) {
            logger.warn('Conflitto overbooking nella creazione appuntamento', {
                component: 'appuntamenti-controller',
                tenantId
            });
            return res.status(409).json({
                success: false,
                error: 'Conflitto con appuntamento esistente',
                isConflict: true,
                message: 'Esiste già un appuntamento in questo orario per lo stesso medico e ambulatorio.'
            });
        }

        logger.error('Failed to create appuntamento', {
            component: 'appuntamenti-controller',
            error: 'Errore interno del server',
            tenantId
        });
        res.status(500).json({
            success: false,
            error: 'Errore nella creazione dell\'appuntamento',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Aggiorna appuntamento esistente
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export const update = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const updatedBy = req.person.id;

        const appuntamento = await AppuntamentoService.update(
            req.params.id,
            req.body,
            tenantId,
            updatedBy
        );

        if (!appuntamento) {
            return res.status(404).json({
                success: false,
                error: 'Appuntamento non trovato'
            });
        }

        res.json({
            success: true,
            data: appuntamento,
            message: 'Appuntamento aggiornato con successo'
        });
    } catch (error) {
        logger.error('Failed to update appuntamento', {
            component: 'appuntamenti-controller',
            error: 'Errore interno del server',
            appuntamentoId: req.params.id,
            tenantId: getEffectiveTenantId(req)
        });

        res.status(500).json({
            success: false,
            error: 'Errore nell\'aggiornamento dell\'appuntamento',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Aggiorna stato appuntamento
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export const updateStato = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { stato } = req.body;

        if (!stato) {
            return res.status(400).json({
                success: false,
                error: 'Stato è obbligatorio'
            });
        }

        const appuntamento = await AppuntamentoService.updateStato(
            req.params.id,
            stato,
            tenantId
        );

        if (!appuntamento) {
            return res.status(404).json({
                success: false,
                error: 'Appuntamento non trovato'
            });
        }

        // Se l'appuntamento è annullato, no-show o rinviato:
        // ripristina le ScadenzaPrestazioneProtocollo collegate → tornano visibili nella lista scadenze
        if (['ANNULLATO', 'NO_SHOW', 'RINVIATO'].includes(stato)) {
            await prisma.scadenzaPrestazioneProtocollo.updateMany({
                where: { tenantId, appuntamentoId: req.params.id },
                data: { appuntamentoId: null },
            });
        }

        res.json({
            success: true,
            data: appuntamento,
            message: `Stato aggiornato a ${stato}`
        });
    } catch (error) {
        logger.error('Failed to update appuntamento stato', {
            component: 'appuntamenti-controller',
            error: 'Errore interno del server',
            appuntamentoId: req.params.id,
            tenantId: getEffectiveTenantId(req)
        });

        res.status(500).json({
            success: false,
            error: 'Errore nell\'aggiornamento dello stato',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Elimina appuntamento (soft delete)
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export const remove = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);

        const deleted = await AppuntamentoService.delete(req.params.id, tenantId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Appuntamento non trovato'
            });
        }

        // Ripristina le ScadenzaPrestazioneProtocollo collegate (eliminazione = non eseguito)
        await prisma.scadenzaPrestazioneProtocollo.updateMany({
            where: { tenantId, appuntamentoId: req.params.id },
            data: { appuntamentoId: null },
        });

        res.json({
            success: true,
            message: 'Appuntamento eliminato con successo'
        });
    } catch (error) {
        logger.error('Failed to delete appuntamento', {
            component: 'appuntamenti-controller',
            error: 'Errore interno del server',
            appuntamentoId: req.params.id,
            tenantId: getEffectiveTenantId(req)
        });

        res.status(500).json({
            success: false,
            error: 'Errore nell\'eliminazione dell\'appuntamento',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Accetta paziente (check-in) - Cambia stato a IN_ATTESA
 * Può ricevere dati aggiuntivi nel body: convenzioneId, note
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export const accetta = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const accettatoDaId = req.person.id;

        // Dati opzionali dal body (P61: aggiunto noteInterne)
        const { convenzioneId, pazienteId, note, noteInterne, stato: statoRichiesto } = req.body || {};

        logger.debug('Accetta paziente request', {
            component: 'appuntamenti-controller',
            action: 'accetta_debug',
            appuntamentoId: req.params.id,
            tenantId,
            convenzioneId,
            pazienteId,
            hasNote: !!note,
            hasNoteInterne: !!noteInterne
        });

        // Prima aggiorna convenzioneId, pazienteId, note e noteInterne se forniti
        if (convenzioneId !== undefined || pazienteId !== undefined || note !== undefined || noteInterne !== undefined) {
            await AppuntamentoService.update(
                req.params.id,
                {
                    ...(convenzioneId !== undefined && { convenzioneId: convenzioneId || null }),
                    ...(pazienteId !== undefined && { pazienteId: pazienteId || null }),
                    ...(note !== undefined && { note }),
                    ...(noteInterne !== undefined && { noteInterne })
                },
                tenantId
            );
        }

        // P52 Session #10: Usa lo stato selezionato dall'utente (default: IN_ATTESA)
        // P52 Session #11: Aggiunto PRENOTATO per permettere ri-accettazione senza cambiare stato
        const STATI_VALIDI_ACCETTAZIONE = ['PRENOTATO', 'IN_ATTESA', 'IN_CORSO', 'CONFERMATO', 'COMPLETATO'];
        const statoFinale = statoRichiesto && STATI_VALIDI_ACCETTAZIONE.includes(statoRichiesto)
            ? statoRichiesto
            : 'IN_ATTESA';

        const appuntamento = await AppuntamentoService.updateStato(
            req.params.id,
            statoFinale,
            tenantId,
            { accettatoDaId }
        );

        if (!appuntamento) {
            return res.status(404).json({
                success: false,
                error: 'Appuntamento non trovato'
            });
        }

        logger.info('Paziente accettato (check-in)', {
            component: 'appuntamenti-controller',
            action: 'accetta',
            appuntamentoId: req.params.id,
            accettatoDaId,
            pazienteId: pazienteId || null,
            convenzioneId: convenzioneId || null,
            tenantId
        });

        // P53: Auto-assign queue number if there's an active session for this ambulatorio/date
        // P54: Cerca prima per slot disponibilità specifico, poi fallback ad ambulatorio
        let queueEntry = null;
        let noActiveQueueSession = false;
        try {
            const ambulatorioId = appuntamento.ambulatorioId;
            // P54: Usa formatDateYMD per evitare problemi timezone
            const appDate = formatDateYMD(new Date(appuntamento.dataOra));

            // P54: Cerca slot disponibilità collegato all'appuntamento
            const slot = appuntamento.slots?.[0];
            const slotDisponibilitaId = slot?.id || null;

            logger.debug('Queue auto-assign check', {
                component: 'appuntamenti-controller',
                action: 'queue_auto_assign_check',
                appuntamentoId: req.params.id,
                ambulatorioId,
                appDate,
                slotDisponibilitaId,
                hasSlots: !!appuntamento.slots?.length,
                tenantId
            });

            // Check for active session (P54: cerca prima per slot, poi fallback)
            const activeSession = await QueueSessionService.findActiveSession(
                tenantId,
                ambulatorioId,
                appDate,
                slotDisponibilitaId
            );

            if (activeSession) {
                // Check if appointment already has a queue entry in ANY active session today
                const existingEntry = await prisma.numeroChiamata.findFirst({
                    where: {
                        appuntamentoId: appuntamento.id,
                        tenantId,
                        deletedAt: null
                    },
                    include: {
                        session: {
                            select: { id: true, mode: true, ambulatorio: { select: { nome: true, codice: true } } }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                });

                if (existingEntry) {
                    // Usa l'entry esistente — 1 appuntamento = 1 numero di coda
                    queueEntry = existingEntry;
                    logger.info('Queue entry already exists for this appuntamento, reusing', {
                        component: 'appuntamenti-controller',
                        action: 'queue_reuse_existing',
                        appuntamentoId: req.params.id,
                        queueEntryId: existingEntry.id,
                        displayNumber: existingEntry.displayNumber,
                        tenantId
                    });
                } else {
                    // Create new queue entry for this appointment
                    queueEntry = await QueueEntryService.add({
                        sessionId: activeSession.id,
                        pazienteId: appuntamento.pazienteId,
                        appuntamentoId: appuntamento.id,
                        ambulatorioId,
                        medicoId: appuntamento.medicoId,
                        tipoAccesso: 'APPUNTAMENTO',
                        tenantId
                    });
                }

                logger.info('Queue entry auto-assigned on check-in', {
                    component: 'appuntamenti-controller',
                    action: 'queue_auto_assign',
                    appuntamentoId: req.params.id,
                    queueEntryId: queueEntry.id,
                    displayNumber: queueEntry.displayNumber,
                    sessionId: activeSession.id,
                    tenantId
                });
            } else {
                // Flag per informare il frontend che non c'è sessione coda attiva
                noActiveQueueSession = true;
                logger.debug('No active queue session for auto-assign', {
                    component: 'appuntamenti-controller',
                    action: 'queue_no_active_session',
                    appuntamentoId: req.params.id,
                    ambulatorioId,
                    appDate,
                    tenantId
                });
            }
        } catch (queueError) {
            // Queue error is non-blocking - log but don't fail the check-in
            logger.warn('Failed to auto-assign queue number', {
                component: 'appuntamenti-controller',
                action: 'queue_auto_assign_failed',
                appuntamentoId: req.params.id,
                error: queueError.message,
                tenantId
            });
        }

        res.json({
            success: true,
            data: {
                ...appuntamento,
                queueEntry: queueEntry ? {
                    id: queueEntry.id,
                    displayNumber: queueEntry.displayNumber,
                    numero: queueEntry.numero
                } : null
            },
            noActiveQueueSession,
            message: queueEntry
                ? `Paziente accettato con numero ${queueEntry.displayNumber}`
                : noActiveQueueSession
                    ? 'Paziente accettato. Nessuna sessione coda attiva per assegnare un numero.'
                    : 'Paziente accettato con successo'
        });
    } catch (error) {
        logger.error('Failed to accetta paziente', {
            component: 'appuntamenti-controller',
            error: 'Errore interno del server',
            appuntamentoId: req.params.id,
            tenantId: getEffectiveTenantId(req)
        });

        res.status(500).json({
            success: false,
            error: 'Errore nell\'accettazione del paziente',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Chiama paziente dalla sala d'attesa - Cambia stato a IN_CORSO
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export const chiama = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);

        const appuntamento = await AppuntamentoService.updateStato(
            req.params.id,
            'IN_CORSO',
            tenantId
        );

        if (!appuntamento) {
            return res.status(404).json({
                success: false,
                error: 'Appuntamento non trovato'
            });
        }

        logger.info('Paziente chiamato', {
            component: 'appuntamenti-controller',
            action: 'chiama',
            appuntamentoId: req.params.id,
            tenantId
        });

        res.json({
            success: true,
            data: appuntamento,
            message: 'Paziente chiamato con successo'
        });
    } catch (error) {
        logger.error('Failed to chiama paziente', {
            component: 'appuntamenti-controller',
            error: 'Errore interno del server',
            appuntamentoId: req.params.id,
            tenantId: getEffectiveTenantId(req)
        });

        res.status(500).json({
            success: false,
            error: 'Errore nella chiamata del paziente',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Registra pagamento per appuntamento
 * Gestisce pagamento anticipato o post-visita
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export const registraPagamento = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);

        const appuntamento = await AppuntamentoService.registraPagamento(
            req.params.id,
            tenantId
        );

        if (!appuntamento) {
            return res.status(404).json({
                success: false,
                error: 'Appuntamento non trovato'
            });
        }

        logger.info('Pagamento registrato', {
            component: 'appuntamenti-controller',
            action: 'registraPagamento',
            appuntamentoId: req.params.id,
            tenantId
        });

        res.json({
            success: true,
            data: appuntamento,
            message: appuntamento.stato === 'FATTURATO'
                ? 'Appuntamento fatturato'
                : 'Pagamento anticipato registrato'
        });
    } catch (error) {
        logger.error('Failed to register payment', {
            component: 'appuntamenti-controller',
            error: 'Errore interno del server',
            appuntamentoId: req.params.id,
            tenantId: getEffectiveTenantId(req)
        });

        res.status(500).json({
            success: false,
            error: 'Errore nella registrazione del pagamento',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Check if patient already has an appointment with the same doctor on the same day
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export const checkDuplicate = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { pazienteId, medicoId, dataOra, excludeAppuntamentoId } = req.query;

        if (!pazienteId || !medicoId || !dataOra) {
            return res.status(400).json({
                success: false,
                error: 'pazienteId, medicoId e dataOra sono richiesti'
            });
        }

        const result = await AppuntamentoService.checkDuplicateBooking(
            pazienteId,
            medicoId,
            dataOra,
            tenantId,
            excludeAppuntamentoId
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Failed to check duplicate booking', {
            component: 'appuntamenti-controller',
            error: 'Errore interno del server',
            tenantId: getEffectiveTenantId(req)
        });

        res.status(500).json({
            success: false,
            error: 'Errore nel controllo prenotazioni duplicate',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Annulla la visita in corso: azzera oraInizio, riporta stato a PRENOTATO,
 * e reimposta l'eventuale entry coda da IN_VISITA a CHIAMATO.
 * Utilizzato dal medico quando esce dalla VisitaPage senza completare.
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export const annullaVisita = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        const appuntamento = await prisma.appuntamento.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!appuntamento) {
            return res.status(404).json({ success: false, error: 'Appuntamento non trovato' });
        }

        if (appuntamento.stato !== 'IN_CORSO') {
            return res.status(400).json({
                success: false,
                error: `Impossibile annullare: stato attuale è '${appuntamento.stato}', atteso 'IN_CORSO'`
            });
        }

        // Ripristina lo stato PRECEDENTE all'avvio visita:
        //   - oraArrivo presente → paziente era stato accettato e in coda → torna IN_ATTESA
        //   - oraArrivo assente  → paziente non ancora accettato → torna PRENOTATO
        const statoRipristino = appuntamento.oraArrivo ? 'IN_ATTESA' : 'PRENOTATO';

        // Azzera oraInizio, ripristina stato precedente
        const updated = await prisma.appuntamento.update({
            where: { id },
            data: {
                stato: statoRipristino,
                oraInizio: null
            }
        });

        logger.info('Visita annullata - stato e oraInizio ripristinati', {
            component: 'appuntamenti-controller',
            action: 'annulla_visita',
            appuntamentoId: id,
            previousStato: 'IN_CORSO',
            nuovoStato: statoRipristino,
            oraArrivoPresente: !!appuntamento.oraArrivo,
            tenantId
        });

        res.json({
            success: true,
            data: updated,
            message: `Visita annullata. Appuntamento riportato a ${statoRipristino}.`
        });
    } catch (error) {
        logger.error('Failed to annullaVisita', {
            component: 'appuntamenti-controller',
            error: 'Errore interno del server',
            appuntamentoId: req.params.id,
            tenantId: getEffectiveTenantId(req)
        });
        res.status(500).json({
            success: false,
            error: 'Errore durante l\'annullamento della visita',
            message: 'Errore interno del server'
        });
    }
};

export default {
    getAll,
    getToday,
    getById,
    getByPaziente,
    create,
    update,
    updateStato,
    remove,
    accetta,
    chiama,
    checkDuplicate,
    registraPagamento,
    annullaVisita
};
