/**
 * Desktop Licenses Routes
 * Manage activation licenses for the Desktop App MDL (offline-first).
 * Follows the same pattern as bridge-activation.routes.js / strumenti-bridge.routes.js
 *
 * Routes:
 *   GET    /desktop-licenses           — list licenses (admin)
 *   POST   /desktop-licenses           — create new license (admin)
 *   PUT    /desktop-licenses/:id       — update label (admin)
 *   DELETE /desktop-licenses/:id       — revoke license (admin)
 *   POST   /desktop-licenses/activate  — activate from desktop app (authenticated)
 *   POST   /desktop-licenses/heartbeat — heartbeat + subscription check (authenticated)
 */

import { Router } from 'express';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * Generate DESK-XXXX-XXXX-XXXX license key using unambiguous charset.
 */
function generateDesktopLicenseKey() {
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    const segments = [];
    for (let s = 0; s < 3; s++) {
        let segment = '';
        const bytes = randomBytes(4);
        for (let i = 0; i < 4; i++) {
            segment += chars[bytes[i] % chars.length];
        }
        segments.push(segment);
    }
    return `DESK-${segments.join('-')}`;
}

// ============================================================================
// NOTE: /activate and /heartbeat must be defined BEFORE /:id to avoid Express
// matching those literal strings as :id parameters.
// ============================================================================

/**
 * @route POST /desktop-licenses/activate
 * @desc  First-time activation of a license key from the desktop app.
 *        Called after user logs in + enters license key.
 * @access Authenticated (desktop app user)
 */
router.post('/activate',
    authenticate,
    async (req, res) => {
        try {
            // Multi-tenant desktop app: if X-Tenant-ID header differs from JWT tenant,
            // verify the authenticated person actually belongs to that tenant before using it.
            // This allows users who have access to multiple tenants to activate a license
            // for any tenant they're a member of.
            const jwtTenantId = req.person.tenantId;
            const headerTenantId = (req.headers['x-tenant-id'] || '').toString().trim();
            let tenantId = jwtTenantId;
            if (headerTenantId && headerTenantId !== jwtTenantId) {
                const profile = await prisma.personTenantProfile.findFirst({
                    where: { personId: req.person.id, tenantId: headerTenantId, deletedAt: null }
                });
                if (profile) {
                    tenantId = headerTenantId; // Verified: person belongs to this tenant
                }
            }
            const { licenseKey, machineId, machineName, appVersion, forceTransfer } = req.body;

            if (!licenseKey || typeof licenseKey !== 'string') {
                return res.status(400).json({ success: false, error: 'licenseKey obbligatorio' });
            }
            if (!machineId || typeof machineId !== 'string') {
                return res.status(400).json({ success: false, error: 'machineId obbligatorio' });
            }

            const license = await prisma.desktopLicense.findFirst({
                where: { licenseKey, tenantId, deletedAt: null }
            });

            if (!license) {
                return res.status(404).json({
                    success: false,
                    error: 'Codice licenza non trovato. Verificare il codice o contattare il supporto.',
                });
            }

            if (license.status === 'REVOKED') {
                return res.status(403).json({
                    success: false,
                    error: 'Questa licenza è stata revocata. Contattare il supporto.',
                    licenseStatus: 'REVOKED',
                });
            }
            if (license.status === 'SUSPENDED') {
                return res.status(403).json({
                    success: false,
                    error: 'Questa licenza è sospesa. Contattare il supporto.',
                    licenseStatus: 'SUSPENDED',
                });
            }

            // License already active on a DIFFERENT machine
            if (license.status === 'ACTIVE' && license.machineId && license.machineId !== machineId) {
                if (!forceTransfer) {
                    return res.status(409).json({
                        success: false,
                        error: `Questa licenza è già attiva su un altro PC (${license.machineName || 'sconosciuto'}). Contattare il supporto per trasferire la licenza.`,
                        activatedOn: license.machineName,
                    });
                }
                // forceTransfer: true — allow transfer to new machine and log it
                logger.info({
                    component: 'desktop-licenses',
                    licenseId: license.id,
                    tenantId,
                    oldMachineId: license.machineId,
                    oldMachineName: license.machineName,
                    newMachineId: machineId,
                    newMachineName: machineName,
                }, 'Desktop license transferred to new machine');
            }

            // Fetch tenant subscription details
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: {
                    subscriptionStatus: true,
                    subscriptionExpiresAt: true,
                    gracePeriodUntil: true,
                    isActive: true,
                }
            });

            const now = new Date();
            const isInGrace = tenant?.gracePeriodUntil && new Date(tenant.gracePeriodUntil) > now;
            const isActive = (tenant?.subscriptionStatus === 'active' || tenant?.subscriptionStatus === 'trial') || isInGrace;
            const daysUntilExpiry = tenant?.subscriptionExpiresAt
                ? Math.ceil((new Date(tenant.subscriptionExpiresAt).getTime() - now.getTime()) / 86400000)
                : null;

            const updated = await prisma.desktopLicense.update({
                where: { id: license.id },
                data: {
                    status: 'ACTIVE',
                    machineId,
                    machineName: machineName || null,
                    appVersion: appVersion || null,
                    activatedAt: license.activatedAt || now,
                    lastSeenAt: now,
                    expiresAt: tenant?.subscriptionExpiresAt || null,
                },
                select: {
                    id: true,
                    licenseKey: true,
                    label: true,
                    status: true,
                    licenseType: true,
                    activatedAt: true,
                    expiresAt: true,
                }
            });

            logger.info({
                component: 'desktop-licenses',
                licenseId: license.id,
                tenantId,
                machineId,
                machineName,
            }, 'Desktop license activated');

            res.json({
                success: true,
                data: updated,
                subscription: {
                    status: tenant?.subscriptionStatus,
                    expiresAt: tenant?.subscriptionExpiresAt,
                    gracePeriodUntil: tenant?.gracePeriodUntil,
                    isActive: isActive || false,
                    daysUntilExpiry,
                }
            });
        } catch (error) {
            logger.error({
                component: 'desktop-licenses',
                error: error.message,
            }, 'Failed to activate desktop license');
            res.status(500).json({ success: false, error: 'Errore nell\'attivazione della licenza' });
        }
    }
);

/**
 * @route POST /desktop-licenses/heartbeat
 * @desc  Periodic check from desktop app when online.
 *        Verifies license + returns subscription status.
 *        Called every time the app comes online.
 * @access Authenticated (desktop app user)
 */
router.post('/heartbeat',
    authenticate,
    async (req, res) => {
        try {
            // Multi-tenant desktop app: support X-Tenant-ID for users with access to multiple tenants
            const jwtTenantId = req.person.tenantId;
            const headerTenantId = (req.headers['x-tenant-id'] || '').toString().trim();
            let tenantId = jwtTenantId;
            if (headerTenantId && headerTenantId !== jwtTenantId) {
                const profile = await prisma.personTenantProfile.findFirst({
                    where: { personId: req.person.id, tenantId: headerTenantId, deletedAt: null }
                });
                if (profile) {
                    tenantId = headerTenantId;
                }
            }
            const { machineId, appVersion } = req.body;

            if (!machineId || typeof machineId !== 'string') {
                return res.status(400).json({ success: false, error: 'machineId obbligatorio' });
            }

            const license = await prisma.desktopLicense.findFirst({
                where: { tenantId, machineId, deletedAt: null }
            });

            if (!license) {
                return res.status(404).json({
                    success: false,
                    error: 'Nessuna licenza attiva trovata per questo PC. Contattare l\'amministratore.',
                    requiresActivation: true,
                });
            }

            if (license.status === 'REVOKED') {
                return res.status(403).json({
                    success: false,
                    error: 'Licenza revocata. Contattare il supporto.',
                    licenseStatus: 'REVOKED',
                });
            }
            if (license.status === 'SUSPENDED') {
                return res.status(403).json({
                    success: false,
                    error: 'Licenza sospesa. Contattare il supporto.',
                    licenseStatus: 'SUSPENDED',
                });
            }

            // Get tenant subscription
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: {
                    subscriptionStatus: true,
                    subscriptionExpiresAt: true,
                    gracePeriodUntil: true,
                    isActive: true,
                }
            });

            const now = new Date();
            const isInGrace = tenant?.gracePeriodUntil && new Date(tenant.gracePeriodUntil) > now;
            const isExpired = tenant?.subscriptionExpiresAt && new Date(tenant.subscriptionExpiresAt) < now && !isInGrace;
            const isActive = (tenant?.subscriptionStatus === 'active' || tenant?.subscriptionStatus === 'trial') || isInGrace;
            const daysUntilExpiry = tenant?.subscriptionExpiresAt
                ? Math.ceil((new Date(tenant.subscriptionExpiresAt).getTime() - now.getTime()) / 86400000)
                : null;

            const newStatus = isExpired ? 'EXPIRED' : license.status;

            await prisma.desktopLicense.update({
                where: { id: license.id },
                data: {
                    lastSeenAt: now,
                    appVersion: appVersion || license.appVersion,
                    expiresAt: tenant?.subscriptionExpiresAt || null,
                    status: newStatus,
                }
            });

            res.json({
                success: true,
                license: {
                    id: license.id,
                    status: newStatus,
                    label: license.label,
                    licenseType: license.licenseType,
                },
                subscription: {
                    status: tenant?.subscriptionStatus,
                    expiresAt: tenant?.subscriptionExpiresAt,
                    gracePeriodUntil: tenant?.gracePeriodUntil,
                    isActive: isActive || false,
                    isExpired: isExpired || false,
                    daysUntilExpiry,
                }
            });
        } catch (error) {
            logger.error({
                component: 'desktop-licenses',
                error: error.message,
            }, 'Failed to process desktop heartbeat');
            res.status(500).json({ success: false, error: 'Errore nella verifica della licenza' });
        }
    }
);

/**
 * @route GET /desktop-licenses
 * @desc  List all desktop licenses for the tenant, with subscription info.
 * @access Authenticated admin (settings:read)
 */
router.get('/',
    authenticate,
    requirePermission('settings:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const licenses = await prisma.desktopLicense.findMany({
                where: { tenantId, deletedAt: null },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    licenseKey: true,
                    label: true,
                    status: true,
                    licenseType: true,
                    machineId: true,
                    machineName: true,
                    appVersion: true,
                    activatedAt: true,
                    lastSeenAt: true,
                    expiresAt: true,
                    createdAt: true,
                }
            });

            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: {
                    subscriptionStatus: true,
                    subscriptionExpiresAt: true,
                    gracePeriodUntil: true,
                }
            });

            const feature = await prisma.tenantFeature.findUnique({
                where: { tenantId_featureKey: { tenantId, featureKey: 'DESKTOP_APP_MDL' } },
                select: { isEnabled: true, usageLimit: true, usageCount: true }
            });

            res.json({
                success: true,
                data: licenses,
                subscription: tenant,
                feature: feature || { isEnabled: false, usageLimit: null, usageCount: 0 }
            });
        } catch (error) {
            logger.error({
                component: 'desktop-licenses',
                error: error.message,
            }, 'Failed to list desktop licenses');
            res.status(500).json({ success: false, error: 'Errore nel recupero delle licenze' });
        }
    }
);

/**
 * @route POST /desktop-licenses
 * @desc  Create a new desktop license (generates license key).
 * @access Authenticated admin (settings:write)
 */
router.post('/',
    authenticate,
    requirePermission('settings:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { label, licenseType } = req.body;

            if (!label || typeof label !== 'string' || label.trim().length < 3) {
                return res.status(400).json({
                    success: false,
                    error: 'label è obbligatorio (min 3 caratteri). Es: "Ambulatorio 1 - PC Medico"',
                });
            }

            const VALID_LICENSE_TYPES = ['APP_ONLY', 'BRIDGE_ONLY', 'APP_AND_BRIDGE'];
            const resolvedLicenseType = VALID_LICENSE_TYPES.includes(licenseType) ? licenseType : 'APP_ONLY';

            // Verify feature is enabled for this tenant
            const desktopFeature = await prisma.tenantFeature.findUnique({
                where: { tenantId_featureKey: { tenantId, featureKey: 'DESKTOP_APP_MDL' } }
            });

            if (!desktopFeature || !desktopFeature.isEnabled) {
                return res.status(403).json({
                    success: false,
                    error: 'La funzionalità Desktop App MDL non è abilitata per questo tenant. Contattare il supporto per attivarla.',
                });
            }

            if (desktopFeature.usageLimit) {
                const activeCount = await prisma.desktopLicense.count({
                    where: { tenantId, deletedAt: null }
                });
                if (activeCount >= desktopFeature.usageLimit) {
                    return res.status(403).json({
                        success: false,
                        error: `Raggiunto il limite massimo di licenze (${desktopFeature.usageLimit}). Contattare il supporto per aumentare il limite.`,
                    });
                }
            }

            // Generate unique key (max 5 attempts)
            let licenseKey;
            for (let attempt = 0; attempt < 5; attempt++) {
                licenseKey = generateDesktopLicenseKey();
                const exists = await prisma.desktopLicense.findUnique({ where: { licenseKey } });
                if (!exists) break;
                if (attempt === 4) {
                    return res.status(500).json({
                        success: false,
                        error: 'Errore nella generazione del codice licenza, riprovare',
                    });
                }
            }

            const license = await prisma.desktopLicense.create({
                data: {
                    id: uuidv4(),
                    tenantId,
                    licenseKey,
                    label: label.trim(),
                    status: 'PENDING',
                    licenseType: resolvedLicenseType,
                    createdBy: req.person?.id,
                },
                select: {
                    id: true,
                    licenseKey: true,
                    label: true,
                    status: true,
                    licenseType: true,
                    createdAt: true,
                }
            });

            await prisma.tenantFeature.update({
                where: { id: desktopFeature.id },
                data: { usageCount: { increment: 1 }, lastUsedAt: new Date() }
            });

            logger.info({
                component: 'desktop-licenses',
                licenseId: license.id,
                tenantId,
                createdBy: req.person?.id,
            }, 'Desktop license created');

            res.status(201).json({ success: true, data: license });
        } catch (error) {
            logger.error({
                component: 'desktop-licenses',
                error: error.message,
            }, 'Failed to create desktop license');
            res.status(500).json({ success: false, error: 'Errore nella creazione della licenza' });
        }
    }
);

/**
 * @route PUT /desktop-licenses/:id
 * @desc  Update label of an existing license.
 * @access Authenticated admin (settings:write)
 */
router.put('/:id',
    authenticate,
    requirePermission('settings:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { label } = req.body;

            const license = await prisma.desktopLicense.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!license) {
                return res.status(404).json({ success: false, error: 'Licenza non trovata' });
            }

            const updateData = {};
            if (label && typeof label === 'string' && label.trim().length >= 3) {
                updateData.label = label.trim();
            }

            const updated = await prisma.desktopLicense.update({
                where: { id },
                data: updateData,
                select: { id: true, licenseKey: true, label: true, status: true, machineName: true, lastSeenAt: true }
            });

            res.json({ success: true, data: updated });
        } catch (error) {
            logger.error({
                component: 'desktop-licenses',
                error: error.message,
            }, 'Failed to update desktop license');
            res.status(500).json({ success: false, error: 'Errore nell\'aggiornamento della licenza' });
        }
    }
);

/**
 * @route DELETE /desktop-licenses/:id
 * @desc  Revoke a desktop license (soft delete).
 * @access Authenticated admin (settings:write)
 */
router.delete('/:id',
    authenticate,
    requirePermission('settings:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const license = await prisma.desktopLicense.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!license) {
                return res.status(404).json({ success: false, error: 'Licenza non trovata' });
            }

            await prisma.desktopLicense.update({
                where: { id },
                data: { status: 'REVOKED', deletedAt: new Date() }
            });

            logger.info({
                component: 'desktop-licenses',
                licenseId: id,
                tenantId,
                revokedBy: req.person?.id,
            }, 'Desktop license revoked');

            res.json({ success: true, message: 'Licenza revocata' });
        } catch (error) {
            logger.error({
                component: 'desktop-licenses',
                error: error.message,
            }, 'Failed to revoke desktop license');
            res.status(500).json({ success: false, error: 'Errore nella revoca della licenza' });
        }
    }
);

export default router;
