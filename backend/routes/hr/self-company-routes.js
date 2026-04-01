/**
 * P68 - Self-Company Routes
 * Setup e gestione della company del tenant (la propria azienda)
 */

import express from 'express';
import logger from '../../utils/logger.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import prisma from '../../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { validateParamId } from '../../middleware/validateUUID.js';


const router = express.Router();
router.param('id', validateParamId);

/**
 * GET /api/v1/hr/self-company
 * Ottiene i dati della propria azienda
 */
router.get('/',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                include: {
                    selfCompanyProfile: {
                        include: {
                            company: true,
                            sites: {
                                where: { deletedAt: null }
                            }
                        }
                    }
                }
            });

            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato',
                    message: 'Tenant non trovato'
                });
            }

            if (!tenant.selfCompanyProfile) {
                return res.json({
                    success: true,
                    data: null,
                    message: 'Self-company non ancora configurata'
                });
            }

            res.json({
                success: true,
                data: {
                    company: tenant.selfCompanyProfile.company,
                    profile: tenant.selfCompanyProfile,
                    sites: tenant.selfCompanyProfile.sites
                }
            });
        } catch (error) {
            logger.error('Failed to get self-company', {
                component: 'hr-self-company-routes',
                action: 'get',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * POST /api/v1/hr/self-company/setup
 * Configura la propria azienda (creazione iniziale)
 */
router.post('/setup',
    authenticate,
    requirePermission('settings:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const {
                ragioneSociale,
                partitaIva,
                codiceFiscale,
                pec,
                email,
                phone,
                address,
                city,
                province,
                cap,
                country,
                codiceDestinatario,
                // Dati specifici azienda
                ateco,
                rea,
                capitaleSociale,
                siteData
            } = req.body;

            // Validazione
            if (!ragioneSociale) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'Ragione sociale obbligatoria'
                });
            }

            // Verifica che non esista già
            const existingTenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { selfCompanyProfileId: true }
            });

            if (existingTenant?.selfCompanyProfileId) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'Self-company già configurata. Usa PUT per aggiornare.'
                });
            }

            // Crea company globale + profile in transazione
            const result = await prisma.$transaction(async (tx) => {
                // Crea Company globale
                const company = await tx.company.create({
                    data: {
                        ragioneSociale,
                        piva: partitaIva || null,
                        codiceFiscale: codiceFiscale || null,
                        pecFatturazione: pec || null,
                        sedeLegaleIndirizzo: address || null,
                        sedeLegaleCitta: city || null,
                        sedeLegaleProvincia: province || null,
                        sedeLegaleCap: cap || null,
                        sedeLegaleNazione: country || 'IT',
                        codiceAteco: ateco || null
                    }
                });

                // Crea CompanyTenantProfile
                const profile = await tx.companyTenantProfile.create({
                    data: {
                        companyId: company.id,
                        tenantId,
                        emailGenerale: email || null,
                        telefonoGenerale: phone || null,
                        pec: pec || null,
                        status: 'ACTIVE'
                    }
                });

                // Aggiorna Tenant con riferimento
                await tx.tenant.update({
                    where: { id: tenantId, deletedAt: null },
                    data: { selfCompanyProfileId: profile.id }
                });

                // Crea sede legale se fornita
                let site = null;
                if (siteData && siteData.name) {
                    site = await tx.companySite.create({
                        data: {
                            companyTenantProfileId: profile.id,
                            tenantId,
                            siteName: siteData.name,
                            indirizzo: siteData.address || address || null,
                            citta: siteData.city || city || null,
                            provincia: siteData.province || province || null,
                            cap: siteData.postalCode || cap || null
                        }
                    });
                }

                return { company, profile, site };
            });

            logger.info('Self-company setup completed', {
                component: 'hr-self-company-routes',
                action: 'setup',
                companyId: result.company.id,
                profileId: result.profile.id,
                tenantId
            });

            res.status(201).json({
                success: true,
                data: result,
                message: 'Self-company configurata con successo'
            });
        } catch (error) {
            logger.error('Failed to setup self-company', {
                component: 'hr-self-company-routes',
                action: 'setup',
                error: 'Operazione non riuscita',
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                message: 'Errore nella configurazione della self-company'
            });
        }
    }
);

/**
 * PUT /api/v1/hr/self-company
 * Aggiorna i dati della propria azienda
 */
router.put('/',
    authenticate,
    requirePermission('settings:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const {
                ragioneSociale,
                partitaIva,
                codiceFiscale,
                pec,
                email,
                phone,
                address,
                city,
                province,
                cap,
                country,
                codiceDestinatario,
                ateco,
                rea,
                capitaleSociale
            } = req.body;

            // Verifica esistenza
            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                include: {
                    selfCompanyProfile: {
                        include: { company: true }
                    }
                }
            });

            if (!tenant?.selfCompanyProfile) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato',
                    message: 'Self-company non configurata. Usa POST /setup prima.'
                });
            }

            const result = await prisma.$transaction(async (tx) => {
                // Aggiorna Company globale
                const company = await tx.company.update({
                    where: { id: tenant.selfCompanyProfile.companyId },
                    data: {
                        ...(ragioneSociale && { ragioneSociale }),
                        ...(partitaIva !== undefined && { piva: partitaIva }),
                        ...(codiceFiscale !== undefined && { codiceFiscale }),
                        ...(pec !== undefined && { pecFatturazione: pec }),
                        ...(address !== undefined && { sedeLegaleIndirizzo: address }),
                        ...(city !== undefined && { sedeLegaleCitta: city }),
                        ...(province !== undefined && { sedeLegaleProvincia: province }),
                        ...(cap !== undefined && { sedeLegaleCap: cap }),
                        ...(country !== undefined && { sedeLegaleNazione: country }),
                        ...(ateco !== undefined && { codiceAteco: ateco })
                    }
                });

                // Aggiorna Profile
                const profile = await tx.companyTenantProfile.update({
                    where: { id: tenant.selfCompanyProfileId },
                    data: {
                        ...(email !== undefined && { emailGenerale: email }),
                        ...(phone !== undefined && { telefonoGenerale: phone }),
                        ...(pec !== undefined && { pec })
                    }
                });

                return { company, profile };
            });

            logger.info('Self-company updated', {
                component: 'hr-self-company-routes',
                action: 'update',
                companyId: result.company.id,
                tenantId
            });

            res.json({
                success: true,
                data: result,
                message: 'Self-company aggiornata con successo'
            });
        } catch (error) {
            logger.error('Failed to update self-company', {
                component: 'hr-self-company-routes',
                action: 'update',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * GET /api/v1/hr/self-company/sedi
 * Lista sedi della propria azienda
 */
router.get('/sedi',
    authenticate,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { selfCompanyProfileId: true }
            });

            if (!tenant?.selfCompanyProfileId) {
                return res.json({
                    success: true,
                    data: [],
                    message: 'Self-company non configurata'
                });
            }

            const sedi = await prisma.companySite.findMany({
                where: {
                    companyTenantProfileId: tenant.selfCompanyProfileId,
                    deletedAt: null
                },
                orderBy: [
                    { siteName: 'asc' }
                ]
            });

            res.json({
                success: true,
                data: sedi
            });
        } catch (error) {
            logger.error('Failed to list sedi', {
                component: 'hr-self-company-routes',
                action: 'listSedi',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * POST /api/v1/hr/self-company/sedi
 * Aggiungi sede alla propria azienda
 */
router.post('/sedi',
    authenticate,
    requirePermission('settings:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const {
                name,
                address,
                city,
                province,
                postalCode,
                country,
                isHeadquarters
            } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'Nome sede obbligatorio'
                });
            }

            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { selfCompanyProfileId: true }
            });

            if (!tenant?.selfCompanyProfileId) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore di validazione',
                    message: 'Self-company non configurata'
                });
            }

            // Se è sede legale, noop (isHeadquarters non esiste su CompanySite)

            const sede = await prisma.companySite.create({
                data: {
                    companyTenantProfileId: tenant.selfCompanyProfileId,
                    tenantId,
                    siteName: name,
                    indirizzo: address || null,
                    citta: city || null,
                    provincia: province || null,
                    cap: postalCode || null
                }
            });

            logger.info('Sede added to self-company', {
                component: 'hr-self-company-routes',
                action: 'addSede',
                siteId: sede.id,
                tenantId
            });

            res.status(201).json({
                success: true,
                data: sede
            });
        } catch (error) {
            logger.error('Failed to add sede', {
                component: 'hr-self-company-routes',
                action: 'addSede',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * PUT /api/v1/hr/self-company/sedi/:id
 * Aggiorna sede
 */
router.put('/sedi/:id',
    authenticate,
    requirePermission('settings:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const {
                name,
                address,
                city,
                province,
                postalCode,
                country,
                isHeadquarters,
                isActive
            } = req.body;

            // Verifica sede appartiene a self-company
            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { selfCompanyProfileId: true }
            });

            const sede = await prisma.companySite.findFirst({
                where: {
                    id,
                    companyTenantProfileId: tenant?.selfCompanyProfileId,
                    deletedAt: null
                }
            });

            if (!sede) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato'
                });
            }

            const updated = await prisma.companySite.update({
                where: { id },
                data: {
                    ...(name !== undefined && { siteName: name }),
                    ...(address !== undefined && { indirizzo: address }),
                    ...(city !== undefined && { citta: city }),
                    ...(province !== undefined && { provincia: province }),
                    ...(postalCode !== undefined && { cap: postalCode })
                }
            });

            logger.info('Sede updated', {
                component: 'hr-self-company-routes',
                action: 'updateSede',
                siteId: id,
                tenantId
            });

            res.json({
                success: true,
                data: updated
            });
        } catch (error) {
            logger.error('Failed to update sede', {
                component: 'hr-self-company-routes',
                action: 'updateSede',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

/**
 * DELETE /api/v1/hr/self-company/sedi/:id
 * Elimina sede (soft delete)
 */
router.delete('/sedi/:id',
    authenticate,
    requirePermission('settings:manage'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { selfCompanyProfileId: true }
            });

            const sede = await prisma.companySite.findFirst({
                where: {
                    id,
                    companyTenantProfileId: tenant?.selfCompanyProfileId,
                    deletedAt: null
                }
            });

            if (!sede) {
                return res.status(404).json({
                    success: false,
                    error: 'Non trovato'
                });
            }

            await prisma.companySite.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            logger.info('Sede deleted', {
                component: 'hr-self-company-routes',
                action: 'deleteSede',
                siteId: id,
                tenantId
            });

            res.json({
                success: true,
                message: 'Sede eliminata con successo'
            });
        } catch (error) {
            logger.error('Failed to delete sede', {
                component: 'hr-self-company-routes',
                action: 'deleteSede',
                error: 'Operazione non riuscita'
            });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

export default router;
