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

const PRIVILEGED_CLINIC_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN', 'COMPANY_ADMIN', 'CLINIC_ADMIN', 'SEGRETERIA_CLINICA']);

function isDirectSorveglianzaMdlCreate(data) {
    return !!(
        data?.createdFromSorveglianzaSanitaria === true &&
        data?.tipoVisitaMDL &&
        data?.companyTenantProfileId
    );
}

function getRoleTypes(req) {
    return (req.person?.roles || []).map(role => typeof role === 'string' ? role : role?.roleType).filter(Boolean);
}

function isBaseMedico(req) {
    const roles = getRoleTypes(req);
    return roles.includes('MEDICO') &&
        !roles.includes('MEDICO_COMPETENTE') &&
        !roles.some(role => PRIVILEGED_CLINIC_ROLES.has(role));
}

function getItalianTimeHHMM(date) {
    return new Intl.DateTimeFormat('it-IT', {
        timeZone: 'Europe/Rome',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);
}

async function assertBaseMedicoCanBook(req, tenantId, data) {
    if (!isBaseMedico(req)) return;
    const targetMedicoId = data.medicoId;
    const isOwnBooking = targetMedicoId === req.person.id;

    if (isOwnBooking && !(await hasPermission(req, PERMISSIONS.APPUNTAMENTI_CREATE_SELF, tenantId))) {
        const error = new Error('Non autorizzato a creare appuntamenti per se stesso');
        error.statusCode = 403;
        throw error;
    }

    if (!isOwnBooking && !(await hasPermission(req, PERMISSIONS.APPUNTAMENTI_CREATE_OTHERS, tenantId))) {
        const error = new Error('Non autorizzato a prenotare appuntamenti per altri medici');
        error.statusCode = 403;
        throw error;
    }

    if (!isOwnBooking) return;

    if (data.tipoVisitaMDL && data.companyTenantProfileId && data.isOverbooking === true) {
        logger.info('Creazione appuntamento MdL senza slot consentita come overbooking controllato', {
            component: 'appuntamenti-controller',
            action: 'assertBaseMedicoCanBook',
            personId: req.person.id,
            tenantId
        });
        return;
    }

    const appointmentDate = new Date(data.dataOra);
    const startOfDay = new Date(appointmentDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    const time = getItalianTimeHHMM(appointmentDate);

    const ownSlot = await prisma.slotDisponibilita.findFirst({
        where: {
            tenantId,
            deletedAt: null,
            medicoId: req.person.id,
            ambulatorioId: data.ambulatorioId,
            disponibile: true,
            data: { gte: startOfDay, lte: endOfDay },
            oraInizio: { lte: time },
            oraFine: { gt: time }
        },
        select: { id: true }
    });

    if (!ownSlot) {
        const error = new Error('Appuntamento consentito solo su uno slot disponibilita del medico corrente');
        error.statusCode = 403;
        throw error;
    }
}

async function hasPermission(req, permission, tenantId) {
    const perms = req.person?.permissions;
    if (Array.isArray(perms) && perms.includes(permission)) return true;
    if (perms && typeof perms === 'object' && perms[permission] === true) return true;
    return RBACService.hasPermission(req.person.id, permission, null, tenantId);
}

async function getSameBranchMedicoIds(personId, tenantId) {
    const profile = await prisma.personTenantProfile.findFirst({
        where: { personId, tenantId, deletedAt: null, isActive: true },
        select: { specialties: true }
    });
    const specialties = profile?.specialties || [];
    if (specialties.length === 0) return [personId];

    const medici = await prisma.person.findMany({
        where: {
            deletedAt: null,
            personRoles: {
                some: { tenantId, roleType: 'MEDICO', isActive: true, deletedAt: null }
            },
            tenantProfiles: {
                some: {
                    tenantId,
                    deletedAt: null,
                    isActive: true,
                    specialties: { hasSome: specialties }
                }
            }
        },
        select: { id: true }
    });
    return medici.map(m => m.id);
}

async function resolveAppointmentVisibility(req, tenantId) {
    if (!isBaseMedico(req)) {
        return { canViewOtherMedici: true, medicoIds: null };
    }

    const [legacyAll, all, sameBranch, createOthers, editOthers] = await Promise.all([
        hasPermission(req, PERMISSIONS.APPUNTAMENTI_VIEW_OTHERS, tenantId),
        hasPermission(req, PERMISSIONS.APPUNTAMENTI_VIEW_OTHERS_ALL, tenantId),
        hasPermission(req, PERMISSIONS.APPUNTAMENTI_VIEW_OTHERS_SAME_BRANCH, tenantId),
        hasPermission(req, PERMISSIONS.APPUNTAMENTI_CREATE_OTHERS, tenantId),
        hasPermission(req, PERMISSIONS.APPUNTAMENTI_EDIT_OTHERS, tenantId)
    ]);

    if (legacyAll || all || createOthers || editOthers) return { canViewOtherMedici: true, medicoIds: null };
    if (sameBranch) {
        return {
            canViewOtherMedici: true,
            medicoIds: await getSameBranchMedicoIds(req.person.id, tenantId)
        };
    }
    return { canViewOtherMedici: false, medicoIds: [req.person.id] };
}

async function assertBaseMedicoCanOpenAppointment(req, tenantId, appuntamento, mode = 'read') {
    if (!isBaseMedico(req)) return;
    if (appuntamento?.medicoId === req.person.id) return;

    if (mode === 'read') {
        const visibility = await resolveAppointmentVisibility(req, tenantId);
        if (!visibility.medicoIds || visibility.medicoIds.includes(appuntamento?.medicoId)) return;
    }
    if (mode === 'edit' && await hasPermission(req, PERMISSIONS.APPUNTAMENTI_EDIT_OTHERS, tenantId)) return;

    const error = new Error('Non autorizzato ad aprire questo appuntamento');
    error.statusCode = 403;
    throw error;
}

function respondControllerError(res, error, fallbackError) {
    const statusCode = error?.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        error: statusCode === 403 ? error.message : fallbackError,
        message: statusCode === 403 ? error.message : 'Errore interno del server'
    });
}

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
        // Se l'utente è un medico base, filtra per propri appuntamenti, stessa branca o tutti
        let effectiveMedicoId = medicoId || filters.medicoId;
        const visibility = await resolveAppointmentVisibility(req, tenantId);
        const effectiveMedicoIds = !effectiveMedicoId ? visibility.medicoIds : null;

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
            medicoIds: effectiveMedicoIds,
            // Multi-tenant support
            tenantIds: effectiveTenantIds
        });

        // Aggiungi flag nel response per indicare se l'utente può vedere altri medici
        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination,
            meta: {
                canViewOtherMedici: visibility.canViewOtherMedici
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

        const visibility = await resolveAppointmentVisibility(req, tenantId);

        const result = await AppuntamentoService.getAll(tenantId, {
            page: 1,
            limit: 100,
            dateFrom: todayStr,
            dateTo: todayStr,
            medicoId: visibility.medicoIds?.length === 1 ? visibility.medicoIds[0] : null,
            medicoIds: visibility.medicoIds?.length > 1 ? visibility.medicoIds : null,
            orderBy: 'dataOra',
            orderDir: 'asc'
        });

        res.json({
            success: true,
            data: result.data,
            count: result.data.length,
            meta: {
                canViewOtherMedici: visibility.canViewOtherMedici
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
        await assertBaseMedicoCanOpenAppointment(req, tenantId, appuntamento, 'read');

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

        respondControllerError(res, error, 'Errore nel recupero dell\'appuntamento');
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
        const payload = { ...req.body };

        if (isDirectSorveglianzaMdlCreate(payload)) {
            payload.medicoId = req.person.id;
            payload.isOverbooking = payload.isOverbooking ?? !payload.ambulatorioId;
        }

        await assertBaseMedicoCanBook(req, tenantId, payload);

        const appuntamento = await AppuntamentoService.create(payload, tenantId, createdBy);

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
            error: error?.message || 'Errore interno del server',
            stack: error?.stack,
            tenantId
        });
        respondControllerError(res, error, 'Errore nella creazione dell\'appuntamento');
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
        const existing = await AppuntamentoService.getById(req.params.id, tenantId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Appuntamento non trovato'
            });
        }
        await assertBaseMedicoCanOpenAppointment(req, tenantId, existing, 'edit');

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

        respondControllerError(res, error, 'Errore nell\'aggiornamento dell\'appuntamento');
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
        const { stato, motivo, motivoAnnullamento } = req.body;

        if (!stato) {
            return res.status(400).json({
                success: false,
                error: 'Stato è obbligatorio'
            });
        }
        const existing = await AppuntamentoService.getById(req.params.id, tenantId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Appuntamento non trovato'
            });
        }
        await assertBaseMedicoCanOpenAppointment(req, tenantId, existing, 'edit');

        const appuntamento = await AppuntamentoService.updateStato(
            req.params.id,
            stato,
            tenantId,
            {
                motivo,
                motivoAnnullamento,
                updatedBy: req.person.id,
                ipAddress: req.ip || null,
                userAgent: req.get?.('user-agent') || null
            }
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

        respondControllerError(res, error, 'Errore nell\'aggiornamento dello stato');
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
        const { deletionReason } = req.body || {};
        const normalizedDeletionReason = typeof deletionReason === 'string' ? deletionReason.trim() : '';

        if (normalizedDeletionReason.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'deletionReason obbligatorio (minimo 10 caratteri)'
            });
        }

        const existing = await AppuntamentoService.getById(req.params.id, tenantId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Appuntamento non trovato'
            });
        }
        await assertBaseMedicoCanOpenAppointment(req, tenantId, existing, 'edit');

        const deleted = await AppuntamentoService.delete(req.params.id, tenantId, {
            deletionReason: normalizedDeletionReason,
            deletedBy: req.person.id,
            ipAddress: req.ip || null,
            userAgent: req.get?.('user-agent') || null
        });

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

        respondControllerError(res, error, 'Errore nell\'eliminazione dell\'appuntamento');
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
        const existing = await AppuntamentoService.getById(req.params.id, tenantId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Appuntamento non trovato'
            });
        }
        await assertBaseMedicoCanOpenAppointment(req, tenantId, existing, 'edit');

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

        respondControllerError(res, error, 'Errore nell\'accettazione del paziente');
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
        const existing = await AppuntamentoService.getById(req.params.id, tenantId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Appuntamento non trovato'
            });
        }
        await assertBaseMedicoCanOpenAppointment(req, tenantId, existing, 'edit');

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

        respondControllerError(res, error, 'Errore nella chiamata del paziente');
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
        const existing = await AppuntamentoService.getById(req.params.id, tenantId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Appuntamento non trovato'
            });
        }
        await assertBaseMedicoCanOpenAppointment(req, tenantId, existing, 'edit');

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

        respondControllerError(res, error, 'Errore nella registrazione del pagamento');
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
