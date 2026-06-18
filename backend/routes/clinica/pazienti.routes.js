/**
 * Pazienti Routes
 * CRUD operations for patients (Person with PAZIENTE role)
 * 
 * Base path: /api/v1/clinica/pazienti
 * 
 * @module routes/clinica/pazienti
 * @version 1.0.0
 */

import express from 'express';
import logger from '../../utils/logger.js';
import { authenticate } from '../../middleware/auth.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { auditClinico } from './utils/clinica-utils.js';
import PazienteService from '../../services/clinical/PazienteService.js';
import { personTenantAccessService } from '../../services/PersonTenantAccessService.js';
import { validateParamId } from '../../middleware/validateUUID.js';
import prisma from '../../config/prisma-optimization.js';

const router = express.Router();
router.param('id', validateParamId);

// ============================================
// LIST
// ============================================

/**
 * @route GET /pazienti
 * @desc Lista pazienti con filtri, ricerca e paginazione
 * @access Authenticated + VIEW_PAZIENTI
 */
router.get('/',
    authenticate,
    checkAdvancedPermission('pazienti', 'read'),
    auditClinico('list_pazienti'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const personId = req.person?.id;
            const globalRole = req.person?.globalRole;

            // Get accessible tenants for multi-tenant filtering
            const accessibleTenants = await personTenantAccessService.getAccessibleTenants(personId, globalRole);
            const accessibleTenantIds = accessibleTenants.map(t => t.id);

            const {
                page = 1,
                pageSize = 20,
                search,
                sortBy = 'lastName',
                sortOrder = 'asc',
                tenantIds,
                roleFilter,
                companyTenantProfileId,
                periodoStart,
                periodoEnd,
                brancaSpecialistica
            } = req.query;

            const safePageSize = Math.min(Math.max(parseInt(pageSize) || 20, 10), 200);
            const result = await PazienteService.listPazienti({
                page: parseInt(page),
                pageSize: safePageSize,
                search: search || '',
                sortBy,
                sortOrder,
                allTenants: req.query.allTenants === 'true',
                accessibleTenantIds,
                ...(tenantIds && { tenantIds }),
                roleFilter: roleFilter || '',
                companyTenantProfileId: companyTenantProfileId || null,
                periodoStart: periodoStart || null,
                periodoEnd: periodoEnd || null,
                brancaSpecialistica: brancaSpecialistica || ''
            }, tenantId);

            res.json({
                success: true,
                data: result.data,
                pagination: result.pagination,
                stats: result.stats
            });
        } catch (error) {
            logger.error('Failed to list pazienti', {
                component: 'pazienti-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({
                success: false,
                error: 'Errore nel recupero pazienti'
            });
        }
    }
);

// ============================================
// COMPANIES (for filter dropdown)
// ============================================

/**
 * @route GET /pazienti/companies
 * @desc Lista aziende per filtro pazienti
 * @access Authenticated + VIEW_PAZIENTI
 */
router.get('/companies',
    authenticate,
    checkAdvancedPermission('pazienti', 'read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const data = await PazienteService.getCompaniesForFilter(tenantId);
            res.json({ success: true, data });
        } catch (error) {
            logger.error('Failed to get companies for pazienti filter', {
                component: 'pazienti-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({ success: false, error: 'Errore nel recupero aziende' });
        }
    }
);

// ============================================
// SEARCH (dedicated endpoint for autocomplete)
// ============================================

/**
 * @route GET /pazienti/search
 * @desc Ricerca pazienti per autocomplete
 * @access Authenticated + VIEW_PAZIENTI
 */
router.get('/search',
    authenticate,
    checkAdvancedPermission('pazienti', 'read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { q, limit = 10 } = req.query;

            if (!q || q.length < 2) {
                return res.json({
                    success: true,
                    data: []
                });
            }

            const result = await PazienteService.listPazienti({
                page: 1,
                pageSize: parseInt(limit),
                search: q,
                sortBy: 'lastName',
                sortOrder: 'asc'
            }, tenantId);

            res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            logger.error('Failed to search pazienti', {
                component: 'pazienti-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({
                success: false,
                error: 'Errore nella ricerca pazienti'
            });
        }
    }
);

router.get(['/by-tax-code/:taxCode', '/cerca-cf/:taxCode'],
    authenticate,
    checkAdvancedPermission('pazienti', 'read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { taxCode } = req.params;
            const paziente = await PazienteService.findByTaxCode(taxCode, tenantId);

            res.json({
                success: true,
                data: paziente,
                found: !!paziente,
                isPazienteInTenant: !!paziente?.isPazienteInTenant,
                person: paziente ? {
                    ...paziente,
                    isFromOtherTenant: !paziente.isPazienteInTenant,
                    roles: (paziente.personRoles || []).map(role => role.roleType),
                } : null,
            });
        } catch (error) {
            logger.error('Failed to find paziente by tax code', {
                component: 'pazienti-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({
                success: false,
                error: 'Errore nella ricerca paziente'
            });
        }
    }
);

// ============================================
// GET BY ID
// ============================================

/**
 * @route GET /pazienti/:id
 * @desc Dettaglio paziente
 * @access Authenticated + VIEW_PAZIENTI
 */
router.get('/:id',
    authenticate,
    checkAdvancedPermission('pazienti', 'read'),
    auditClinico('view_paziente'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const paziente = await PazienteService.getPazienteById(id, tenantId);

            res.json({
                success: true,
                data: paziente
            });
        } catch (error) {
            logger.error('Failed to get paziente', {
                component: 'pazienti-routes',
                error: 'Operazione non riuscita',
                pazienteId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Paziente non trovato') {
                return res.status(404).json({
                    success: false,
                    error: 'Paziente non trovato'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero paziente'
            });
        }
    }
);

// ============================================
// GET REFERTI
// ============================================

/**
 * @route GET /pazienti/:id/referti
 * @desc Referti di un paziente
 * @access Authenticated + VIEW_PAZIENTI
 */
router.get('/:id/referti',
    authenticate,
    checkAdvancedPermission('pazienti', 'read'),
    auditClinico('view_referti_paziente'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const referti = await PazienteService.getRefertiPaziente(id, tenantId);

            res.json({
                success: true,
                data: referti
            });
        } catch (error) {
            logger.error('Failed to get referti paziente', {
                component: 'pazienti-routes',
                error: 'Operazione non riuscita',
                pazienteId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({
                success: false,
                error: 'Errore nel recupero referti'
            });
        }
    }
);

// ============================================
// CREATE
// ============================================

/**
 * @route POST /pazienti
 * @desc Crea nuovo paziente (o collega a Person esistente se stesso CF)
 * @access Authenticated + CREATE_PAZIENTI
 */
router.post('/',
    authenticate,
    checkAdvancedPermission('pazienti', 'create'),
    auditClinico('create_paziente'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person?.id;
            const data = req.body;

            const result = await PazienteService.findOrCreatePaziente(data, tenantId, createdBy);

            const message = result.isNew
                ? 'Paziente creato con successo'
                : result.wasLinked
                    ? 'Paziente collegato a persona esistente'
                    : 'Paziente già esistente';

            res.status(result.isNew ? 201 : 200).json({
                success: true,
                data: result.person,
                isNew: result.isNew,
                wasLinked: result.wasLinked,
                message
            });
        } catch (error) {
            logger.error('Failed to create paziente', {
                component: 'pazienti-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({
                success: false,
                error: 'Errore nella creazione paziente',
                message: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// CREATE PROVISIONAL (for quick booking)
// ============================================

/**
 * @route POST /pazienti/provisional
 * @desc Crea paziente provvisorio con dati minimi (per prenotazione rapida)
 * @access Authenticated + CREATE_PAZIENTI
 */
router.post('/provisional',
    authenticate,
    checkAdvancedPermission('pazienti', 'create'),
    auditClinico('create_paziente_provisional'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person?.id;
            const { firstName, lastName, phone, email, notes } = req.body;

            // CRITICAL: Verifica tenantId
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'TenantId non disponibile - verifica autenticazione'
                });
            }

            // Validazione minima
            if (!firstName || !lastName) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome e cognome sono obbligatori'
                });
            }

            // Almeno un contatto richiesto
            if (!phone && !email) {
                return res.status(400).json({
                    success: false,
                    error: 'Inserire almeno un recapito (telefono o email)'
                });
            }

            const result = await PazienteService.findOrCreatePaziente({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: phone?.trim() || null,
                email: email?.trim()?.toLowerCase() || null,
                notes: notes ? `[PROVVISORIO] ${notes}` : '[PROVVISORIO]'
            }, tenantId, createdBy);

            res.status(result.isNew ? 201 : 200).json({
                success: true,
                data: result.person,
                isNew: result.isNew,
                wasLinked: result.wasLinked,
                isProvisional: true,
                message: result.isNew
                    ? 'Paziente provvisorio creato'
                    : 'Paziente già esistente'
            });
        } catch (error) {
            logger.error('Failed to create provisional paziente', {
                component: 'pazienti-routes',
                error: 'Operazione non riuscita',
                stack: error.stack,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione del paziente provvisorio'
            });
        }
    }
);

// ============================================
// UPDATE
// ============================================

/**
 * @route PUT /pazienti/:id
 * @desc Aggiorna dati paziente
 * @access Authenticated + UPDATE_PAZIENTI
 */
router.put('/:id',
    authenticate,
    checkAdvancedPermission('pazienti', 'update'),
    auditClinico('update_paziente'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const data = req.body;

            const updated = await PazienteService.updatePaziente(id, data, tenantId);

            res.json({
                success: true,
                data: updated,
                message: 'Paziente aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update paziente', {
                component: 'pazienti-routes',
                error: 'Operazione non riuscita',
                pazienteId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.message === 'Paziente non trovato') {
                return res.status(404).json({
                    success: false,
                    error: 'Paziente non trovato'
                });
            }

            if (error.message === 'Email già in uso' || error.message === 'Codice fiscale già in uso') {
                return res.status(400).json({
                    success: false,
                    error: 'Errore interno del server'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento paziente'
            });
        }
    }
);

// ============================================
// CHECK BY TAX CODE
// ============================================

/**
 * @route GET /pazienti/by-tax-code/:taxCode
 * @desc Cerca paziente per codice fiscale
 * @access Authenticated + VIEW_PAZIENTI
 */
router.get('/by-tax-code/:taxCode',
    authenticate,
    checkAdvancedPermission('pazienti', 'read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { taxCode } = req.params;

            const paziente = await PazienteService.findByTaxCode(taxCode, tenantId);

            res.json({
                success: true,
                data: paziente,
                found: !!paziente
            });
        } catch (error) {
            logger.error('Failed to find paziente by tax code', {
                component: 'pazienti-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({
                success: false,
                error: 'Errore nella ricerca paziente'
            });
        }
    }
);

// Alias mantenuto per i client frontend storici.
router.get('/cerca-cf/:taxCode',
    authenticate,
    checkAdvancedPermission('pazienti', 'read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { taxCode } = req.params;
            const paziente = await PazienteService.findByTaxCode(taxCode, tenantId);

            res.json({
                success: true,
                found: !!paziente,
                isPazienteInTenant: !!paziente?.isPazienteInTenant,
                person: paziente ? {
                    ...paziente,
                    isFromOtherTenant: !paziente.isPazienteInTenant,
                    roles: (paziente.personRoles || []).map(role => role.roleType),
                } : null,
            });
        } catch (error) {
            logger.error('Failed to find paziente by tax code alias', {
                component: 'pazienti-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({
                success: false,
                error: 'Errore nella ricerca paziente'
            });
        }
    }
);

router.post('/:id/tutelanti',
    authenticate,
    checkAdvancedPermission('pazienti', 'update'),
    auditClinico('upsert_tutelante_paziente'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const createdBy = req.person?.id;
            const relation = await PazienteService.addOrUpdateGuardian(req.params.id, req.body, tenantId, createdBy);
            res.json({ success: true, data: relation });
        } catch (error) {
            logger.error('Failed to upsert patient guardian', {
                component: 'pazienti-routes',
                error: 'Operazione non riuscita',
                pazienteId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });
            const status = ['Paziente non trovato', 'Tutelante non valido', 'Il tutelante non può coincidere con il paziente'].includes(error.message)
                ? 400
                : 500;
            const safeMessages = new Set([
                'Paziente non trovato',
                'Tutelante non valido',
                'Il tutelante non può coincidere con il paziente'
            ]);
            res.status(status).json({
                success: false,
                error: safeMessages.has(error.message) ? error.message : 'Errore nel salvataggio del tutelante'
            });
        }
    }
);

// ============================================
// STORICO PAZIENTE (Session #13)
// ============================================

/**
 * @route GET /pazienti/:id/storico
 * @desc Storico completo paziente (visite, referti, appuntamenti) per pannello visita
 * @access Authenticated + VIEW_PAZIENTI
 */
router.get('/:id/storico',
    authenticate,
    checkAdvancedPermission('pazienti', 'read'),
    auditClinico('view_storico_paziente'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            // Validate UUID format
            if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'ID paziente non valido'
                });
            }

            const storico = await PazienteService.getStoricoPaziente(id, tenantId);

            res.json({
                success: true,
                data: storico
            });
        } catch (error) {
            if (error.message === 'Paziente non trovato') {
                return res.status(404).json({
                    success: false,
                    error: 'Paziente non trovato'
                });
            }
            logger.error('Errore nel recupero storico paziente', {
                component: 'pazienti-routes',
                error: 'Operazione non riuscita',
                pazienteId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });
            res.status(500).json({
                success: false,
                error: 'Errore nel recupero storico'
            });
        }
    }
);

/**
 * @route GET /pazienti/:id/consensi-firmati
 * @desc Lista tutti i token consenso firmati per un paziente.
 *       Usato dalla CartellaPaziente per la tab documenti/consensi.
 * @access Authenticated + VIEW_PAZIENTI
 */
router.get('/:id/consensi-firmati',
    authenticate,
    checkAdvancedPermission('pazienti', 'read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const personId = req.params.id;

            const DEFAULT_VALIDITA_GIORNI = {
                gdpr: 365,
                sanitari: 365,
                marketing: 3650,
                comunicazioni: 3650,
                fse_alimentazione: 3650,
                fse_consultazione: 3650,
                fse_pregresso: 3650,
                mdl_sorveglianza: 365,
            };

            const moduli = await prisma.consensoModulo.findMany({
                where: { tenantId, deletedAt: null, attivo: true },
                select: { codice: true, validitaGiorni: true },
            });
            const validitaByCodice = new Map(moduli.map(m => [m.codice, m.validitaGiorni]));

            const buildValiditaDocumenti = (token) => {
                const codes = Array.from(new Set([
                    ...(token.documentiDaMostrare || []),
                    ...(token.firmatoConsensi || []),
                ]));
                return Object.fromEntries(codes.map((codice) => {
                    const custom = validitaByCodice.has(codice) ? validitaByCodice.get(codice) : undefined;
                    const giorni = custom !== undefined ? custom : (DEFAULT_VALIDITA_GIORNI[codice] ?? null);
                    const validUntil = Number.isFinite(giorni) && giorni > 0 && token.firmatoAt
                        ? new Date(new Date(token.firmatoAt).getTime() + giorni * 24 * 60 * 60 * 1000)
                        : null;
                    return [codice, {
                        firmatoAt: token.firmatoAt,
                        validitaGiorni: giorni,
                        validUntil,
                    }];
                }));
            };

            // Trova tutti i token consenso firmati per gli appuntamenti del paziente
            const tokens = await prisma.consensoFirmaToken.findMany({
                where: {
                    tenantId,
                    firmatoAt: { not: null },
                    appuntamento: {
                        pazienteId: personId,
                        tenantId,
                        deletedAt: null,
                    },
                },
                orderBy: { firmatoAt: 'desc' },
                select: {
                    id: true,
                    token: true,
                    documentiDaMostrare: true,
                    firmatoAt: true,
                    firmatoConsensi: true,
                    firmatoPazienteNome: true,
                    firmaImmagine: true,
                    expiresAt: true,
                    createdAt: true,
                    appuntamento: {
                        select: {
                            id: true,
                            dataOra: true,
                            prestazione: { select: { nome: true } },
                            medico: {
                                select: { firstName: true, lastName: true, gender: true }
                            },
                        }
                    }
                }
            });

            return res.json({
                success: true,
                data: tokens.map(token => ({
                    ...token,
                    validitaDocumenti: buildValiditaDocumenti(token),
                })),
            });
        } catch (error) {
            logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore GET pazienti/:id/consensi-firmati');
            return res.status(500).json({ success: false, error: 'Errore nel recupero consensi firmati' });
        }
    }
);

export default router;
