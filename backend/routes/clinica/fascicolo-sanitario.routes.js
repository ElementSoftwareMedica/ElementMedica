/**
 * Fascicolo Sanitario Routes - P57 Cross-Tenant Clinical Data
 * 
 * API per visualizzazione dati sanitari cross-tenant con consenso paziente.
 * IMPORTANTE: Dati fatturazione MAI condivisi - solo dati clinici.
 * 
 * @module routes/clinica/fascicolo-sanitario.routes
 * @project P57 - Commercialization E2E
 */

import express from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import CrossTenantSanitarioService from '../../services/clinical/CrossTenantSanitarioService.js';
import logger from '../../utils/logger.js';
import { validateParam } from '../../middleware/validateUUID.js';

const router = express.Router();

// UUID validation per tutti i parametri UUID usati in questo router
router.param('pazienteId', validateParam('pazienteId'));
router.param('consentId', validateParam('consentId'));

/**
 * @route GET /api/v1/clinica/fascicolo-sanitario/:pazienteId/visite
 * @desc Ottiene le visite del paziente, opzionalmente cross-tenant
 * @access Private - VIEW_VISITA
 * @query {boolean} includeCrossTenant - Se includere visite da altri tenant (richiede consenso)
 * @query {string} fromDate - Data inizio filtro
 * @query {string} toDate - Data fine filtro
 * @query {string} tenantIds - Lista tenant da includere (comma-separated)
 */
router.get('/:pazienteId/visite',
    requireAuth,
    requirePermission('clinica.visite:read'),
    async (req, res) => {
        try {
            const { pazienteId } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const performedById = req.person?.id;
            const ipAddress = req.ip || req.connection?.remoteAddress;

            const {
                includeCrossTenant = 'false',
                fromDate,
                toDate,
                tenantIds
            } = req.query;

            const options = {
                includeCrossTenant: includeCrossTenant === 'true',
                fromDate,
                toDate,
                tenantIds: tenantIds ? tenantIds.split(',') : undefined
            };

            const result = await CrossTenantSanitarioService.getPatientVisitsCrossTenant(
                pazienteId,
                tenantId,
                options,
                performedById,
                ipAddress
            );

            res.json(result);

        } catch (error) {
            logger.error({ error: 'Operazione non riuscita', pazienteId: req.params.pazienteId }, 'Error getting patient visits');
            res.status(500).json({ error: 'Errore nel recupero delle visite' });
        }
    }
);

/**
 * @route GET /api/v1/clinica/fascicolo-sanitario/:pazienteId/corsi
 * @desc Ottiene i corsi/formazione del paziente, opzionalmente cross-tenant
 * @access Private - VIEW_VISITA or VIEW_SCHEDULES
 */
router.get('/:pazienteId/corsi',
    requireAuth,
    requirePermission('clinica.visite:read'),
    async (req, res) => {
        try {
            const { pazienteId } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const performedById = req.person?.id;
            const ipAddress = req.ip || req.connection?.remoteAddress;

            const { includeCrossTenant = 'false' } = req.query;

            const result = await CrossTenantSanitarioService.getPersonScheduledCoursesCrossTenant(
                pazienteId,
                tenantId,
                { includeCrossTenant: includeCrossTenant === 'true' },
                performedById,
                ipAddress
            );

            res.json(result);

        } catch (error) {
            logger.error({ error: 'Operazione non riuscita', pazienteId: req.params.pazienteId }, 'Error getting patient courses');
            res.status(500).json({ error: 'Errore nel recupero dei corsi' });
        }
    }
);

/**
 * @route GET /api/v1/clinica/fascicolo-sanitario/:pazienteId/tenant-accessibili
 * @desc Ottiene la lista dei tenant da cui il paziente ha dati visualizzabili
 * @access Private - VIEW_VISITA
 */
router.get('/:pazienteId/tenant-accessibili',
    requireAuth,
    requirePermission('clinica.visite:read'),
    async (req, res) => {
        try {
            const { pazienteId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const tenants = await CrossTenantSanitarioService.getAccessibleTenants(pazienteId, tenantId);

            res.json({
                success: true,
                tenants,
                totale: tenants.length
            });

        } catch (error) {
            logger.error({ error: 'Operazione non riuscita', pazienteId: req.params.pazienteId }, 'Error getting accessible tenants');
            res.status(500).json({ error: 'Errore nel recupero dei tenant accessibili' });
        }
    }
);

/**
 * @route GET /api/v1/clinica/fascicolo-sanitario/:pazienteId/consensi
 * @desc Ottiene tutti i consensi cross-tenant del paziente
 * @access Private - VIEW_VISITA
 */
router.get('/:pazienteId/consensi',
    requireAuth,
    requirePermission('clinica.visite:read'),
    async (req, res) => {
        try {
            const { pazienteId } = req.params;

            const consents = await CrossTenantSanitarioService.getPersonConsents(pazienteId);

            res.json({
                success: true,
                consents,
                totale: consents.length
            });

        } catch (error) {
            logger.error({ error: 'Operazione non riuscita', pazienteId: req.params.pazienteId }, 'Error getting patient consents');
            res.status(500).json({ error: 'Errore nel recupero dei consensi' });
        }
    }
);

/**
 * @route POST /api/v1/clinica/fascicolo-sanitario/:pazienteId/consensi
 * @desc Crea un nuovo consenso per condivisione dati clinici cross-tenant
 * @access Private - EDIT_VISITA (o il paziente stesso)
 * @body {string} sourceTenantId - Tenant che ha i dati
 * @body {string} targetTenantId - Tenant che potrà visualizzare
 * @body {string[]} sharedDataTypes - Tipi dati da condividere
 * @body {string} consentMethod - Metodo acquisizione consenso
 * @body {string} legalBasis - Base legale GDPR
 */
router.post('/:pazienteId/consensi',
    requireAuth,
    requirePermission('clinica.visite:update'),
    async (req, res) => {
        try {
            const { pazienteId } = req.params;
            const performedById = req.person?.id;
            const ipAddress = req.ip || req.connection?.remoteAddress;

            const {
                sourceTenantId,
                targetTenantId,
                sharedDataTypes,
                consentMethod,
                legalBasis,
                validUntil
            } = req.body;

            // Validazione
            if (!sourceTenantId || !targetTenantId || !sharedDataTypes?.length) {
                return res.status(400).json({
                    error: 'Campi obbligatori: sourceTenantId, targetTenantId, sharedDataTypes'
                });
            }

            const consent = await CrossTenantSanitarioService.createClinicalDataConsent(
                pazienteId,
                sourceTenantId,
                targetTenantId,
                sharedDataTypes,
                {
                    consentMethod,
                    legalBasis,
                    validUntil: validUntil ? new Date(validUntil) : null,
                    performedBy: performedById,
                    ipAddress
                }
            );

            res.status(201).json({
                success: true,
                consent,
                message: 'Consenso creato con successo'
            });

        } catch (error) {
            logger.error({ error: 'Operazione non riuscita', pazienteId: req.params.pazienteId }, 'Error creating consent');
            res.status(500).json({ error: 'Errore nella creazione del consenso' });
        }
    }
);

/**
 * @route DELETE /api/v1/clinica/fascicolo-sanitario/:pazienteId/consensi/:consentId
 * @desc Revoca un consenso esistente
 * @access Private - EDIT_VISITA (o il paziente stesso)
 * @body {string} reason - Motivo revoca (opzionale)
 */
router.delete('/:pazienteId/consensi/:consentId',
    requireAuth,
    requirePermission('clinica.visite:update'),
    async (req, res) => {
        try {
            const { consentId } = req.params;
            const revokedBy = req.person?.id;
            const { reason } = req.body;

            const consent = await CrossTenantSanitarioService.revokeConsent(
                consentId,
                revokedBy,
                reason
            );

            res.json({
                success: true,
                consent,
                message: 'Consenso revocato con successo'
            });

        } catch (error) {
            logger.error({ error: 'Operazione non riuscita', consentId: req.params.consentId }, 'Error revoking consent');
            res.status(500).json({ error: 'Errore nella revoca del consenso' });
        }
    }
);

/**
 * @route GET /api/v1/clinica/fascicolo-sanitario/:pazienteId/riepilogo
 * @desc Ottiene un riepilogo completo del fascicolo sanitario cross-tenant
 * @access Private - VIEW_VISITA
 */
router.get('/:pazienteId/riepilogo',
    requireAuth,
    requirePermission('clinica.visite:read'),
    async (req, res) => {
        try {
            const { pazienteId } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const performedById = req.person?.id;
            const ipAddress = req.ip || req.connection?.remoteAddress;

            const { includeCrossTenant = 'false' } = req.query;
            const crossTenantEnabled = includeCrossTenant === 'true';

            // Esegui tutte le query in parallelo per performance
            const [visite, corsi, tenantAccessibili, consensi] = await Promise.all([
                CrossTenantSanitarioService.getPatientVisitsCrossTenant(
                    pazienteId, tenantId, { includeCrossTenant: crossTenantEnabled }, performedById, ipAddress
                ),
                CrossTenantSanitarioService.getPersonScheduledCoursesCrossTenant(
                    pazienteId, tenantId, { includeCrossTenant: crossTenantEnabled }, performedById, ipAddress
                ),
                CrossTenantSanitarioService.getAccessibleTenants(pazienteId, tenantId),
                CrossTenantSanitarioService.getPersonConsents(pazienteId)
            ]);

            res.json({
                success: true,
                pazienteId,
                crossTenantEnabled,
                riepilogo: {
                    visite: {
                        currentTenant: visite.currentTenantVisits?.length || 0,
                        crossTenant: visite.crossTenantVisits?.length || 0,
                        totale: visite.totale
                    },
                    corsi: {
                        currentTenant: corsi.currentTenantCourses?.length || 0,
                        crossTenant: corsi.crossTenantCourses?.length || 0,
                        totale: corsi.totale
                    },
                    tenantAccessibili: tenantAccessibili.length,
                    consensiAttivi: consensi.length
                },
                visite,
                corsi,
                tenantAccessibili,
                consensi
            });

        } catch (error) {
            logger.error({ error: 'Operazione non riuscita', pazienteId: req.params.pazienteId }, 'Error getting patient summary');
            res.status(500).json({ error: 'Errore nel recupero del riepilogo' });
        }
    }
);

export default router;
