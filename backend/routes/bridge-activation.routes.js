/**
 * Bridge Activation Routes (Public - No Auth)
 * 
 * Endpoints called directly by the Bridge application during activation.
 * No JWT authentication required - Bridge authenticates via license key.
 * 
 * Base path: /api/v1/public/bridge
 * 
 * @module routes/bridge-activation
 */

import express from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import { hostname } from 'os';

const router = express.Router();

/**
 * POST /activate
 * Bridge chiama questo endpoint con il codice licenza per attivarsi.
 * Restituisce la configurazione completa (callback URL, API key, dispositivi).
 */
router.post('/activate', async (req, res) => {
    try {
        const { licenseKey, machineId, machineName, bridgeVersion } = req.body;

        if (!licenseKey || typeof licenseKey !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Codice di attivazione obbligatorio',
            });
        }

        // Normalize license key format
        const normalizedKey = licenseKey.trim().toUpperCase();

        // Find the license
        const license = await prisma.bridgeLicense.findUnique({
            where: { licenseKey: normalizedKey },
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        domain: true,
                        isActive: true,
                    }
                }
            }
        });

        if (!license || license.deletedAt) {
            logger.warn('Bridge activation failed: license not found', {
                component: 'bridge-activation',
                licenseKey: normalizedKey.substring(0, 9) + '***',
            });
            return res.status(404).json({
                success: false,
                error: 'Codice di attivazione non valido',
            });
        }

        if (license.status === 'REVOKED') {
            logger.warn('Bridge activation failed: license revoked', {
                component: 'bridge-activation',
                licenseId: license.id,
            });
            return res.status(403).json({
                success: false,
                error: 'Questa licenza è stata revocata. Contattare l\'amministratore.',
            });
        }

        if (!license.tenant.isActive) {
            return res.status(403).json({
                success: false,
                error: 'Il tenant associato non è attivo',
            });
        }

        // If already activated by a different machine, check machineId
        if (license.status === 'ACTIVE' && license.machineId && machineId && license.machineId !== machineId) {
            logger.warn('Bridge activation: already activated on different machine', {
                component: 'bridge-activation',
                licenseId: license.id,
                existingMachine: license.machineName,
                requestingMachine: machineName,
            });
            return res.status(409).json({
                success: false,
                error: 'Questa licenza è già attivata su un altro computer. Revocare la licenza esistente per riutilizzarla.',
                activatedOn: license.machineName,
            });
        }

        // Generate API key if not yet assigned
        let apiKey = license.apiKey;
        if (!apiKey) {
            apiKey = crypto.randomBytes(32).toString('hex');
        }

        // Build callback URL based on tenant domain, request origin, or default
        const tenantDomain = license.tenant.domain;
        const isDevDomain = !tenantDomain || tenantDomain.includes('localhost') || tenantDomain.includes('127.0.0.1');
        let baseUrl;
        if (!isDevDomain) {
            baseUrl = `https://${tenantDomain}`;
        } else {
            // Use request origin or forwarded host in production
            const forwardedHost = req.get('x-forwarded-host') || req.get('host');
            baseUrl = forwardedHost && !forwardedHost.includes('localhost')
                ? `https://${forwardedHost}`
                : process.env.PUBLIC_URL || 'https://app.elementmedica.com';
        }
        const callbackUrl = `${baseUrl}/api/v1/clinica/strumenti-bridge/risultati`;

        // Activate the license
        const updatedLicense = await prisma.bridgeLicense.update({
            where: { id: license.id },
            data: {
                status: 'ACTIVE',
                apiKey,
                machineId: machineId || null,
                machineName: machineName || null,
                bridgeVersion: bridgeVersion || null,
                activatedAt: license.activatedAt || new Date(),
                lastSeenAt: new Date(),
            }
        });

        logger.info('Bridge activated successfully', {
            component: 'bridge-activation',
            licenseId: license.id,
            tenantId: license.tenantId,
            tenantName: license.tenant.name,
            machineName: machineName || 'unknown',
        });

        // Return full configuration for the bridge
        res.json({
            success: true,
            data: {
                licenseId: license.id,
                tenantId: license.tenantId,
                tenantName: license.tenant.name,
                apiKey,
                callbackUrl,
                port: 3000,
                gdtVersion: '02.10',
                gdtSenderId: 'ELEM_MED',
                gdtCharset: 3,
                logLevel: 'info',
                devices: license.deviceConfig || [],
            }
        });
    } catch (error) {
        logger.error('Bridge activation error', {
            component: 'bridge-activation',
            error: error.message,
            stack: error.stack,
        });
        res.status(500).json({
            success: false,
            error: 'Errore durante l\'attivazione',
        });
    }
});

/**
 * POST /heartbeat
 * Bridge invia periodicamente un heartbeat per segnalare che è attivo.
 * Autenticato via API key (non JWT).
 */
router.post('/heartbeat', async (req, res) => {
    try {
        const apiKey = req.headers['x-bridge-api-key'];
        if (!apiKey || typeof apiKey !== 'string') {
            return res.status(401).json({
                success: false,
                error: 'API key richiesta',
            });
        }

        // Find license by API key
        const license = await prisma.bridgeLicense.findUnique({
            where: { apiKey },
        });

        if (!license || license.deletedAt || license.status !== 'ACTIVE') {
            return res.status(401).json({
                success: false,
                error: 'API key non valida o licenza non attiva',
            });
        }

        const { bridgeVersion, machineName, deviceStatuses } = req.body;

        await prisma.bridgeLicense.update({
            where: { id: license.id },
            data: {
                lastSeenAt: new Date(),
                bridgeVersion: bridgeVersion || license.bridgeVersion,
                machineName: machineName || license.machineName,
            }
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('Bridge heartbeat error', {
            component: 'bridge-activation',
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: 'Errore nel heartbeat',
        });
    }
});

/**
 * POST /save-devices
 * Bridge salva la configurazione dei dispositivi dopo il setup locale.
 * Autenticato via API key.
 */
router.post('/save-devices', async (req, res) => {
    try {
        const apiKey = req.headers['x-bridge-api-key'];
        if (!apiKey || typeof apiKey !== 'string') {
            return res.status(401).json({
                success: false,
                error: 'API key richiesta',
            });
        }

        const license = await prisma.bridgeLicense.findUnique({
            where: { apiKey },
        });

        if (!license || license.deletedAt || license.status !== 'ACTIVE') {
            return res.status(401).json({
                success: false,
                error: 'API key non valida o licenza non attiva',
            });
        }

        const { devices } = req.body;
        if (!Array.isArray(devices)) {
            return res.status(400).json({
                success: false,
                error: 'devices deve essere un array',
            });
        }

        await prisma.bridgeLicense.update({
            where: { id: license.id },
            data: {
                deviceConfig: devices,
            }
        });

        logger.info('Bridge device config saved', {
            component: 'bridge-activation',
            licenseId: license.id,
            deviceCount: devices.length,
        });

        res.json({
            success: true,
            message: 'Configurazione dispositivi salvata',
        });
    } catch (error) {
        logger.error('Bridge save-devices error', {
            component: 'bridge-activation',
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: 'Errore nel salvataggio della configurazione',
        });
    }
});

export default router;
