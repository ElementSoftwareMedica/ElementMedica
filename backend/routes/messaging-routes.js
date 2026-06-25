/**
 * Messaging Routes
 * 
 * API endpoints per la configurazione della messaggistica:
 * - Configurazione SMTP per email (dominio proprio)
 * - Configurazione WhatsApp Business API
 * - Test connessioni
 * - Supporto multi-branch (FORMAZIONE/CLINICA)
 * 
 * @module routes/messaging-routes
 * @version 2.0.0
 */

import express from 'express';
import { body, query, validationResult } from 'express-validator';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { COMMUNICATION_TYPES, VALID_BRANCH_TYPES } from '../services/messaging/messagingRouting.js';

const router = express.Router();
const authenticateToken = authenticate; // Catena A: direct middleware
const requirePermission = requirePermissions;

// Encryption key for sensitive data (must be 64-char hex string = 32 bytes for AES-256-CBC)
// Use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" to generate
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

// WhatsApp Business Cloud API - Centralized credentials (managed by ElementMedica platform)
// These are NOT stored per-tenant; tenants only configure their phoneNumberId.
// Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/overview
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || null;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v19.0';
const WHATSAPP_DEFAULT_PHONE_NUMBER_ID = process.env.WHATSAPP_DEFAULT_PHONE_NUMBER_ID || null;

// VALID_BRANCH_TYPES e COMMUNICATION_TYPES sono importati da
// services/messaging/messagingRouting.js (single source of truth).

// ============================================
// UTILITIES
// ============================================

/**
 * Encrypt sensitive data
 */
function encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    // ENCRYPTION_KEY is a 64-char hex string → Buffer.from(..., 'hex') → 32 bytes for AES-256
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt sensitive data
 */
function decrypt(text) {
    if (!text) return null;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        logger.error('Decryption failed:', { error: error.message });
        return null;
    }
}

/**
 * Valida i risultati della validazione express-validator
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            code: 'VALIDATION_ERROR',
            errors: errors.array()
        });
    }
    next();
};

/**
 * Normalizza il branch type
 */
function normalizeBranchType(branchType) {
    if (!branchType) return 'default';
    const normalized = branchType.toUpperCase();
    return VALID_BRANCH_TYPES.includes(normalized) ? normalized : 'default';
}

/**
 * Crea un nodemailer transporter da una configurazione SMTP testata.
 * Gestisce correttamente STARTTLS (porta 587) e SSL/TLS (porta 465).
 * Supporta Zoho EU, Gmail, Aruba, Office365, ecc.
 */
function createSmtpTransporter(smtpConfig) {
    const isStarTLS = !smtpConfig.secure && smtpConfig.port !== 465;
    return nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure === true,
        ...(isStarTLS && { requireTLS: true }),
        auth: {
            user: smtpConfig.username,
            pass: decrypt(smtpConfig.password)
        },
        tls: {
            // Non rigettare certificati self-signed (utile per hosting shared)
            rejectUnauthorized: false,
            // Fallback a TLSv1.2 per compatibilità con server più vecchi
            minVersion: 'TLSv1.2'
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    });
}

/**
 * Ottiene la configurazione per un branch specifico con fallback
 */
function getConfigForBranch(configs, branchType) {
    if (!configs) return null;

    // Se è la vecchia struttura (senza branch), restituisci direttamente
    if (configs.host !== undefined || configs.phoneNumberId !== undefined) {
        return configs;
    }

    // Nuova struttura con branch
    const normalized = normalizeBranchType(branchType);
    return configs[normalized] || configs['default'] || null;
}

/**
 * Imposta la configurazione per un branch specifico
 */
function setConfigForBranch(currentConfigs, branchType, newConfig) {
    const normalized = normalizeBranchType(branchType);

    // Se currentConfigs è la vecchia struttura, migriamola
    if (currentConfigs && (currentConfigs.host !== undefined || currentConfigs.phoneNumberId !== undefined)) {
        // Migra vecchia config a 'default'
        return {
            'default': currentConfigs,
            [normalized]: newConfig
        };
    }

    return {
        ...currentConfigs,
        [normalized]: newConfig
    };
}

// ============================================
// TENANT GUARD MIDDLEWARE
// ============================================

/**
 * Middleware che garantisce che getEffectiveTenantId(req) sia valorizzato.
 * Se l'utente non ha un PersonTenantProfile attivo, ritorna 403.
 * Previene errori Prisma quando tenantId è null.
 */
const requireTenantId = (req, res, next) => {
    if (!req.person?.tenantId) {
        logger.warn('Messaging route: tenantId is null for person', {
            personId: req.person?.id,
            path: req.path
        });
        return res.status(403).json({
            success: false,
            code: 'NO_TENANT_PROFILE',
            message: 'Nessun profilo tenant attivo trovato per questo utente. Contatta un amministratore.'
        });
    }
    next();
};

// Apply tenant guard globally to all messaging routes (after auth, before handlers)
// req.person is set by authenticateToken, so this guard runs inside route handlers.
// We use this per-route (not router-level) because authenticateToken must run first.

// ============================================
// SMTP ROUTES
// ============================================

/**
 * GET /api/v1/messaging/smtp/config
 * Ottiene la configurazione SMTP del tenant
 * @query branchType - Branch type (FORMAZIONE, CLINICA, default)
 */
router.get(
    '/smtp/config',
    authenticateToken,
    requirePermission('settings:read'),
    requireTenantId,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const branchType = req.query.branchType;

            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const settings = tenant?.settings || {};
            const smtpConfigs = settings.smtp || null;
            const smtpConfig = getConfigForBranch(smtpConfigs, branchType);

            if (!smtpConfig) {
                return res.json({
                    success: true,
                    data: null,
                    branchType: normalizeBranchType(branchType)
                });
            }

            // Non restituire la password in chiaro
            res.json({
                success: true,
                data: {
                    host: smtpConfig.host,
                    port: smtpConfig.port,
                    secure: smtpConfig.secure,
                    username: smtpConfig.username,
                    fromEmail: smtpConfig.fromEmail,
                    fromName: smtpConfig.fromName,
                    enabled: smtpConfig.enabled,
                    hasPassword: !!smtpConfig.password
                },
                branchType: normalizeBranchType(branchType)
            });

        } catch (error) {
            logger.error('Error fetching SMTP config:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante il recupero della configurazione'
            });
        }
    }
);

/**
 * GET /api/v1/messaging/smtp/configs
 * Ottiene tutte le configurazioni SMTP del tenant (per tutti i branch)
 */
router.get(
    '/smtp/configs',
    authenticateToken,
    requirePermission('settings:read'),
    requireTenantId,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const settings = tenant?.settings || {};
            const smtpConfigs = settings.smtp || {};

            // Se è la vecchia struttura, convertila
            if (smtpConfigs.host !== undefined) {
                const legacyConfig = {
                    host: smtpConfigs.host,
                    port: smtpConfigs.port,
                    secure: smtpConfigs.secure,
                    username: smtpConfigs.username,
                    fromEmail: smtpConfigs.fromEmail,
                    fromName: smtpConfigs.fromName,
                    enabled: smtpConfigs.enabled,
                    hasPassword: !!smtpConfigs.password
                };
                return res.json({
                    success: true,
                    data: { default: legacyConfig },
                    isLegacy: true
                });
            }

            // Nuova struttura multi-branch
            const result = {};
            for (const [branch, config] of Object.entries(smtpConfigs)) {
                if (config && typeof config === 'object') {
                    result[branch] = {
                        host: config.host,
                        port: config.port,
                        secure: config.secure,
                        username: config.username,
                        fromEmail: config.fromEmail,
                        fromName: config.fromName,
                        enabled: config.enabled,
                        hasPassword: !!config.password
                    };
                }
            }

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Error fetching SMTP configs:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante il recupero delle configurazioni'
            });
        }
    }
);

/**
 * POST /api/v1/messaging/smtp/config
 * Salva la configurazione SMTP del tenant per un branch specifico
 * @body branchType - Branch type (FORMAZIONE, CLINICA, default)
 */
router.post(
    '/smtp/config',
    authenticateToken,
    requirePermission('settings:write'),
    requireTenantId,
    [
        body('host').notEmpty().withMessage('Host richiesto'),
        body('port').isInt({ min: 1, max: 65535 }).withMessage('Porta non valida'),
        body('username').notEmpty().withMessage('Username richiesto'),
        body('fromEmail').isEmail().withMessage('Email mittente non valida')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { host, port, secure, username, password, fromEmail, fromName, enabled, branchType } = req.body;
            const normalizedBranch = normalizeBranchType(branchType);

            // Recupera config esistente per mantenere la password se non fornita
            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const currentSettings = tenant?.settings || {};
            const currentSmtpConfigs = currentSettings.smtp || {};
            const currentBranchConfig = getConfigForBranch(currentSmtpConfigs, normalizedBranch) || {};

            const smtpConfig = {
                host,
                port: parseInt(port),
                secure: secure !== false,
                username,
                password: password ? encrypt(password) : currentBranchConfig.password,
                fromEmail,
                fromName: fromName || '',
                enabled: enabled !== false,
                updatedAt: new Date().toISOString()
            };

            // Usa la nuova struttura multi-branch
            const newSmtpConfigs = setConfigForBranch(currentSmtpConfigs, normalizedBranch, smtpConfig);

            await prisma.tenant.update({
                where: { id: tenantId, deletedAt: null },
                data: {
                    settings: {
                        ...currentSettings,
                        smtp: newSmtpConfigs
                    }
                }
            });

            logger.info('SMTP config saved', { tenantId, host, fromEmail, branchType: normalizedBranch });

            res.json({
                success: true,
                message: `Configurazione SMTP per ${normalizedBranch} salvata con successo`,
                branchType: normalizedBranch
            });

        } catch (error) {
            logger.error('Error saving SMTP config:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante il salvataggio della configurazione'
            });
        }
    }
);

/**
 * DELETE /api/v1/messaging/smtp/config
/**
 * DELETE /api/v1/messaging/smtp/config
 * Elimina la configurazione SMTP del tenant per un branch specifico
 * @query branchType - Branch type da eliminare (FORMAZIONE, CLINICA, default)
 */
router.delete(
    '/smtp/config',
    authenticateToken,
    requirePermission('settings:write'),
    requireTenantId,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const branchType = req.query.branchType;
            const normalizedBranch = normalizeBranchType(branchType);

            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const currentSettings = tenant?.settings || {};
            const currentSmtpConfigs = currentSettings.smtp || {};

            // Se è la vecchia struttura, elimina tutto
            if (currentSmtpConfigs.host !== undefined) {
                delete currentSettings.smtp;
            } else {
                // Nuova struttura: elimina solo il branch specifico
                delete currentSmtpConfigs[normalizedBranch];
                currentSettings.smtp = currentSmtpConfigs;
            }

            await prisma.tenant.update({
                where: { id: tenantId, deletedAt: null },
                data: { settings: currentSettings }
            });

            logger.info('SMTP config deleted', { tenantId, branchType: normalizedBranch });

            res.json({
                success: true,
                message: `Configurazione SMTP per ${normalizedBranch} eliminata`,
                branchType: normalizedBranch
            });

        } catch (error) {
            logger.error('Error deleting SMTP config:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante l\'eliminazione della configurazione'
            });
        }
    }
);

/**
 * POST /api/v1/messaging/smtp/test
 * Testa la configurazione SMTP per un branch specifico
 * @body branchType - Branch type da testare
 */
router.post(
    '/smtp/test',
    authenticateToken,
    requirePermission('settings:write'),
    requireTenantId,
    [
        body('email').isEmail().withMessage('Email non valida')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { email, branchType } = req.body;
            const normalizedBranch = normalizeBranchType(branchType);

            // Recupera config
            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const smtpConfigs = tenant?.settings?.smtp;
            const smtpConfig = getConfigForBranch(smtpConfigs, normalizedBranch);

            if (!smtpConfig) {
                return res.status(400).json({
                    success: false,
                    code: 'NOT_CONFIGURED',
                    message: `SMTP non configurato per ${normalizedBranch}`
                });
            }

            // Crea transporter con supporto corretto per STARTTLS e SSL/TLS
            const transporter = createSmtpTransporter(smtpConfig);

            // Verifica connessione
            await transporter.verify();

            // Invia email di test
            const branchLabel = normalizedBranch === 'default' ? '' : ` (${normalizedBranch})`;
            await transporter.sendMail({
                from: `"${smtpConfig.fromName || 'ElementMedica'}" <${smtpConfig.fromEmail}>`,
                to: email,
                subject: `✅ Test Configurazione SMTP${branchLabel} - ElementMedica`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #059669;">✅ Test SMTP Completato</h2>
                        <p>La configurazione SMTP${branchLabel} è stata verificata con successo.</p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                        <p style="color: #6b7280; font-size: 12px;">
                            Questa è un'email di test inviata da ElementMedica.<br>
                            Branch: ${normalizedBranch}<br>
                            Server: ${smtpConfig.host}:${smtpConfig.port}<br>
                            Data: ${new Date().toLocaleString('it-IT')}
                        </p>
                    </div>
                `
            });

            logger.info('SMTP test successful', { tenantId, email: email?.replace(/(.{2}).*@/, '$1***@'), branchType: normalizedBranch });

            res.json({
                success: true,
                message: 'Email di test inviata con successo',
                branchType: normalizedBranch
            });

        } catch (error) {
            logger.error('SMTP test failed:', { error: error.message });
            // Return 200 with success:false so the frontend can handle it gracefully
            res.json({
                success: false,
                code: 'TEST_FAILED',
                message: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// WHATSAPP ROUTES
// ============================================

/**
 * GET /api/v1/messaging/whatsapp/config
 * Ottiene la configurazione WhatsApp del tenant per un branch specifico
 * 
 * MODELLO CENTRALIZZATO: Restituisce solo phoneNumberId e enabled.
 * Le credenziali Twilio sono gestite centralmente da ElementMedica.
 * 
 * @query branchType - Branch type (FORMAZIONE, CLINICA, default)
 */
router.get(
    '/whatsapp/config',
    authenticateToken,
    requirePermission('settings:read'),
    requireTenantId,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const branchType = req.query.branchType;

            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const settings = tenant?.settings || {};
            const whatsappConfigs = settings.whatsapp || null;
            const whatsappConfig = getConfigForBranch(whatsappConfigs, branchType);

            if (!whatsappConfig) {
                return res.json({
                    success: true,
                    data: null,
                    branchType: normalizeBranchType(branchType),
                    centralizedBilling: true
                });
            }

            // MODELLO CENTRALIZZATO: Solo phoneNumberId e enabled
            res.json({
                success: true,
                data: {
                    phoneNumberId: whatsappConfig.phoneNumberId || '',
                    enabled: whatsappConfig.enabled || false
                    // RIMOSSO: businessAccountId, webhookVerifyToken, hasAccessToken
                },
                branchType: normalizeBranchType(branchType),
                centralizedBilling: true
            });

        } catch (error) {
            logger.error('Error fetching WhatsApp config:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante il recupero della configurazione'
            });
        }
    }
);

/**
 * GET /api/v1/messaging/whatsapp/configs
 * Ottiene tutte le configurazioni WhatsApp del tenant (per tutti i branch)
 * 
 * MODELLO CENTRALIZZATO: Non restituisce più accessToken o businessAccountId
 * poiché le credenziali sono gestite centralmente da ElementMedica.
 */
router.get(
    '/whatsapp/configs',
    authenticateToken,
    requirePermission('settings:read'),
    requireTenantId,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const settings = tenant?.settings || {};
            const whatsappConfigs = settings.whatsapp || {};

            // Se è la vecchia struttura, convertila (migrazione automatica)
            if (whatsappConfigs.phoneNumberId !== undefined) {
                const legacyConfig = {
                    phoneNumberId: whatsappConfigs.phoneNumberId || '',
                    enabled: whatsappConfigs.enabled || false
                    // RIMOSSO: businessAccountId, webhookVerifyToken, hasAccessToken
                };
                return res.json({
                    success: true,
                    data: { default: legacyConfig },
                    centralizedBilling: true // Indica al frontend che usa billing centralizzato
                });
            }

            // Nuova struttura multi-branch (semplificata)
            const result = {};
            for (const [branch, config] of Object.entries(whatsappConfigs)) {
                if (config && typeof config === 'object') {
                    result[branch] = {
                        phoneNumberId: config.phoneNumberId || '',
                        enabled: config.enabled || false
                        // RIMOSSO: businessAccountId, webhookVerifyToken, hasAccessToken
                    };
                }
            }

            res.json({
                success: true,
                data: result,
                centralizedBilling: true
            });

        } catch (error) {
            logger.error('Error fetching WhatsApp configs:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante il recupero delle configurazioni'
            });
        }
    }
);

/**
 * POST /api/v1/messaging/whatsapp/config
 * Salva la configurazione WhatsApp del tenant per un branch specifico
 * 
 * MODELLO CENTRALIZZATO: Le credenziali Twilio sono gestite centralmente da ElementMedica.
 * I tenant possono solo configurare il loro phoneNumberId per usare il proprio numero,
 * ma la fatturazione Twilio è centralizzata.
 * 
 * @body phoneNumberId - ID del numero WhatsApp del tenant (opzionale se usa default)
 * @body enabled - Abilita/disabilita WhatsApp per questo branch
 * @body branchType - Branch type (FORMAZIONE, CLINICA, default)
 */
router.post(
    '/whatsapp/config',
    authenticateToken,
    requirePermission('settings:write'),
    requireTenantId,
    validateRequest,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            // MODELLO CENTRALIZZATO: Solo phoneNumberId e enabled sono configurabili dal tenant
            // accessToken e businessAccountId sono gestiti centralmente via env vars
            const { phoneNumberId, enabled, branchType } = req.body;
            const normalizedBranch = normalizeBranchType(branchType);

            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const currentSettings = tenant?.settings || {};
            const currentWhatsappConfigs = currentSettings.whatsapp || {};

            // Configurazione semplificata: solo numero e stato
            const whatsappConfig = {
                phoneNumberId: phoneNumberId || '', // Numero del tenant o vuoto per usare default
                enabled: enabled !== false,
                updatedAt: new Date().toISOString()
                // NOTA: accessToken e businessAccountId RIMOSSI - gestiti centralmente
            };

            // Usa la nuova struttura multi-branch
            const newWhatsappConfigs = setConfigForBranch(currentWhatsappConfigs, normalizedBranch, whatsappConfig);

            await prisma.tenant.update({
                where: { id: tenantId, deletedAt: null },
                data: {
                    settings: {
                        ...currentSettings,
                        whatsapp: newWhatsappConfigs
                    }
                }
            });

            logger.info('WhatsApp config saved (centralized model)', {
                tenantId,
                phoneNumberId: phoneNumberId || 'default',
                branchType: normalizedBranch
            });

            res.json({
                success: true,
                message: `Configurazione WhatsApp per ${normalizedBranch} salvata con successo`,
                branchType: normalizedBranch
            });

        } catch (error) {
            logger.error('Error saving WhatsApp config:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante il salvataggio della configurazione'
            });
        }
    }
);

/**
 * DELETE /api/v1/messaging/whatsapp/config
 * Elimina la configurazione WhatsApp del tenant per un branch specifico
 * @query branchType - Branch type da eliminare (FORMAZIONE, CLINICA, default)
 */
router.delete(
    '/whatsapp/config',
    authenticateToken,
    requirePermission('settings:write'),
    requireTenantId,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const branchType = req.query.branchType;
            const normalizedBranch = normalizeBranchType(branchType);

            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const currentSettings = tenant?.settings || {};
            const currentWhatsappConfigs = currentSettings.whatsapp || {};

            // Se è la vecchia struttura, elimina tutto
            if (currentWhatsappConfigs.phoneNumberId !== undefined) {
                delete currentSettings.whatsapp;
            } else {
                // Nuova struttura: elimina solo il branch specifico
                delete currentWhatsappConfigs[normalizedBranch];
                currentSettings.whatsapp = currentWhatsappConfigs;
            }

            await prisma.tenant.update({
                where: { id: tenantId, deletedAt: null },
                data: { settings: currentSettings }
            });

            logger.info('WhatsApp config deleted', { tenantId, branchType: normalizedBranch });

            res.json({
                success: true,
                message: `Configurazione WhatsApp per ${normalizedBranch} eliminata`,
                branchType: normalizedBranch
            });

        } catch (error) {
            logger.error('Error deleting WhatsApp config:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante l\'eliminazione della configurazione'
            });
        }
    }
);

/**
 * POST /api/v1/messaging/whatsapp/test
 * Testa la configurazione WhatsApp per un branch specifico
 * @body branchType - Branch type da testare
 */
router.post(
    '/whatsapp/test',
    authenticateToken,
    requirePermission('settings:write'),
    requireTenantId,
    [
        body('phoneNumber').notEmpty().withMessage('Numero di telefono richiesto')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { phoneNumber, branchType } = req.body;
            const normalizedBranch = normalizeBranchType(branchType);

            // Recupera config
            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const whatsappConfigs = tenant?.settings?.whatsapp;
            const whatsappConfig = getConfigForBranch(whatsappConfigs, normalizedBranch);

            if (!whatsappConfig) {
                return res.status(400).json({
                    success: false,
                    code: 'NOT_CONFIGURED',
                    message: `WhatsApp non configurato per ${normalizedBranch}`
                });
            }

            // Centralized model: access token comes from platform env vars, not from tenant config
            const accessToken = WHATSAPP_ACCESS_TOKEN;
            if (!accessToken) {
                return res.status(400).json({
                    success: false,
                    code: 'NO_TOKEN',
                    message: 'WhatsApp access token non configurato. Contatta il supporto ElementMedica.'
                });
            }

            // Use tenant-specific phoneNumberId or fall back to platform default
            const phoneNumberId = whatsappConfig.phoneNumberId || WHATSAPP_DEFAULT_PHONE_NUMBER_ID;
            if (!phoneNumberId) {
                return res.status(400).json({
                    success: false,
                    code: 'NO_PHONE_NUMBER_ID',
                    message: 'Phone Number ID non configurato. Inserisci il tuo Phone Number ID WhatsApp.'
                });
            }

            // Normalizza il numero di telefono
            const cleanNumber = phoneNumber.replace(/\D/g, '');

            // Invia messaggio di test tramite WhatsApp Business Cloud API
            const branchLabel = normalizedBranch === 'default' ? '' : ` (${normalizedBranch})`;
            const response = await fetch(
                `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to: cleanNumber,
                        type: 'text',
                        text: {
                            preview_url: false,
                            body: `✅ Test Configurazione WhatsApp${branchLabel} - ElementMedica\n\nLa configurazione WhatsApp Business API è stata verificata con successo.\n\nBranch: ${normalizedBranch}\nData: ${new Date().toLocaleString('it-IT')}`
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Errore invio messaggio');
            }

            logger.info('WhatsApp test successful', { tenantId, phoneNumber: '***' + cleanNumber.slice(-4), branchType: normalizedBranch });

            res.json({
                success: true,
                message: 'Messaggio di test inviato con successo',
                branchType: normalizedBranch
            });

        } catch (error) {
            logger.error('WhatsApp test failed:', { error: error.message });
            res.json({
                success: false,
                code: 'TEST_FAILED',
                message: 'Errore interno del server'
            });
        }
    }
);

// ============================================
// STATUS ROUTE
// ============================================

/**
 * Helper function per calcolare lo stato di una configurazione
 */
function getConfigStatus(config, type) {
    if (!config) {
        return { configured: false, enabled: false, ready: false };
    }

    if (type === 'smtp') {
        return {
            configured: !!config.host,
            enabled: config.enabled || false,
            ready: !!(config.host && config.password && config.enabled)
        };
    } else if (type === 'whatsapp') {
        // In the centralized model, access token is from env var; tenant only needs phoneNumberId + enabled
        return {
            configured: !!config.phoneNumberId,
            enabled: config.enabled || false,
            ready: !!(config.phoneNumberId && WHATSAPP_ACCESS_TOKEN && config.enabled)
        };
    }

    return { configured: false, enabled: false, ready: false };
}

/**
 * GET /api/v1/messaging/status
 * Ottiene lo stato di tutte le configurazioni di messaggistica
 * @query branchType - Se specificato, restituisce solo lo stato per quel branch
 */
router.get(
    '/status',
    authenticateToken,
    requirePermission('settings:read'),
    requireTenantId,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const branchType = req.query.branchType;

            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const settings = tenant?.settings || {};
            const smtpConfigs = settings.smtp || {};
            const whatsappConfigs = settings.whatsapp || {};

            // Se è richiesto un branch specifico
            if (branchType) {
                const normalizedBranch = normalizeBranchType(branchType);
                const smtpConfig = getConfigForBranch(smtpConfigs, normalizedBranch);
                const whatsappConfig = getConfigForBranch(whatsappConfigs, normalizedBranch);

                return res.json({
                    success: true,
                    data: {
                        smtp: getConfigStatus(smtpConfig, 'smtp'),
                        whatsapp: getConfigStatus(whatsappConfig, 'whatsapp')
                    },
                    branchType: normalizedBranch
                });
            }

            // Restituisci status per tutti i branch
            const allBranches = new Set([
                ...Object.keys(smtpConfigs),
                ...Object.keys(whatsappConfigs)
            ]);

            // Se è la vecchia struttura, restituisci come 'default'
            if (smtpConfigs.host !== undefined || whatsappConfigs.phoneNumberId !== undefined) {
                return res.json({
                    success: true,
                    data: {
                        default: {
                            smtp: getConfigStatus(smtpConfigs, 'smtp'),
                            whatsapp: getConfigStatus(whatsappConfigs, 'whatsapp')
                        }
                    },
                    isLegacy: true
                });
            }

            // Nuova struttura multi-branch
            const status = {};
            for (const branch of allBranches) {
                if (branch && typeof branch === 'string') {
                    status[branch] = {
                        smtp: getConfigStatus(smtpConfigs[branch], 'smtp'),
                        whatsapp: getConfigStatus(whatsappConfigs[branch], 'whatsapp')
                    };
                }
            }

            // Se nessun branch configurato, restituisci default vuoto
            if (Object.keys(status).length === 0) {
                status.default = {
                    smtp: { configured: false, enabled: false, ready: false },
                    whatsapp: { configured: false, enabled: false, ready: false }
                };
            }

            res.json({
                success: true,
                data: status
            });

        } catch (error) {
            logger.error('Error fetching messaging status:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante il recupero dello stato'
            });
        }
    }
);

// ============================================
// MESSAGING ROUTING CONFIGURATION
// ============================================

// COMMUNICATION_TYPES è importato da services/messaging/messagingRouting.js

/**
 * GET /api/v1/messaging/routing
 * Ottiene la configurazione di routing per tipo comunicazione
 */
router.get(
    '/routing',
    authenticateToken,
    requirePermission('settings:read'),
    requireTenantId,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const settings = tenant?.settings || {};
            const routing = settings.messagingRouting || {};

            // Costruisci la risposta con tutti i tipi di comunicazione
            const routingConfig = {};
            for (const type of COMMUNICATION_TYPES) {
                routingConfig[type] = {
                    smtpBranch: routing[type]?.smtpBranch || 'default',
                    whatsappBranch: routing[type]?.whatsappBranch || 'default',
                    smsBranch: routing[type]?.smsBranch || 'default',
                    pecEnabled: routing[type]?.pecEnabled || false
                };
            }

            res.json({
                success: true,
                data: routingConfig,
                availableBranches: VALID_BRANCH_TYPES,
                communicationTypes: COMMUNICATION_TYPES
            });

        } catch (error) {
            logger.error('Error fetching messaging routing:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante il recupero della configurazione routing'
            });
        }
    }
);

/**
 * POST /api/v1/messaging/routing
 * Salva la configurazione di routing per un tipo di comunicazione
 */
router.post(
    '/routing',
    authenticateToken,
    requirePermission('settings:write'),
    requireTenantId,
    [
        body('communicationType')
            .isIn(COMMUNICATION_TYPES)
            .withMessage('Tipo comunicazione non valido'),
        body('smtpBranch')
            .optional()
            .isIn(VALID_BRANCH_TYPES)
            .withMessage('Branch SMTP non valido'),
        body('whatsappBranch')
            .optional()
            .isIn(VALID_BRANCH_TYPES)
            .withMessage('Branch WhatsApp non valido'),
        body('smsBranch')
            .optional()
            .isIn(VALID_BRANCH_TYPES)
            .withMessage('Branch SMS non valido'),
        body('pecEnabled')
            .optional()
            .isBoolean()
            .withMessage('pecEnabled deve essere booleano')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { communicationType, smtpBranch, whatsappBranch, smsBranch, pecEnabled } = req.body;

            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const currentSettings = tenant?.settings || {};
            const currentRouting = currentSettings.messagingRouting || {};

            // Aggiorna solo il tipo di comunicazione specificato
            const updatedRouting = {
                ...currentRouting,
                [communicationType]: {
                    smtpBranch: smtpBranch || 'default',
                    whatsappBranch: whatsappBranch || 'default',
                    smsBranch: smsBranch || 'default',
                    pecEnabled: pecEnabled || false,
                    updatedAt: new Date().toISOString()
                }
            };

            await prisma.tenant.update({
                where: { id: tenantId, deletedAt: null },
                data: {
                    settings: {
                        ...currentSettings,
                        messagingRouting: updatedRouting
                    }
                }
            });

            logger.info('Messaging routing saved', {
                tenantId,
                communicationType,
                smtpBranch,
                whatsappBranch,
                smsBranch
            });

            res.json({
                success: true,
                message: `Routing per ${communicationType} salvato con successo`,
                data: updatedRouting[communicationType]
            });

        } catch (error) {
            logger.error('Error saving messaging routing:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante il salvataggio della configurazione routing'
            });
        }
    }
);

/**
 * PUT /api/v1/messaging/routing/bulk
 * Aggiorna tutte le configurazioni di routing in un'unica chiamata
 */
router.put(
    '/routing/bulk',
    authenticateToken,
    requirePermission('settings:write'),
    requireTenantId,
    [
        body('routing').isObject().withMessage('Routing config richiesta')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { routing } = req.body;

            // Valida tutte le chiavi
            for (const [type, config] of Object.entries(routing)) {
                if (!COMMUNICATION_TYPES.includes(type)) {
                    return res.status(400).json({
                        success: false,
                        code: 'VALIDATION_ERROR',
                        message: `Tipo comunicazione non valido: ${type}`
                    });
                }
                if (config.smtpBranch && !VALID_BRANCH_TYPES.includes(config.smtpBranch)) {
                    return res.status(400).json({
                        success: false,
                        code: 'VALIDATION_ERROR',
                        message: `Branch SMTP non valido per ${type}: ${config.smtpBranch}`
                    });
                }
                if (config.whatsappBranch && !VALID_BRANCH_TYPES.includes(config.whatsappBranch)) {
                    return res.status(400).json({
                        success: false,
                        code: 'VALIDATION_ERROR',
                        message: `Branch WhatsApp non valido per ${type}: ${config.whatsappBranch}`
                    });
                }
                if (config.smsBranch && !VALID_BRANCH_TYPES.includes(config.smsBranch)) {
                    return res.status(400).json({
                        success: false,
                        code: 'VALIDATION_ERROR',
                        message: `Branch SMS non valido per ${type}: ${config.smsBranch}`
                    });
                }
            }

            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { settings: true }
            });

            const currentSettings = tenant?.settings || {};

            // Costruisci il nuovo routing
            const updatedRouting = {};
            for (const type of COMMUNICATION_TYPES) {
                const userConfig = routing[type] || {};
                updatedRouting[type] = {
                    smtpBranch: userConfig.smtpBranch || 'default',
                    whatsappBranch: userConfig.whatsappBranch || 'default',
                    smsBranch: userConfig.smsBranch || 'default',
                    pecEnabled: userConfig.pecEnabled || false,
                    updatedAt: new Date().toISOString()
                };
            }

            await prisma.tenant.update({
                where: { id: tenantId, deletedAt: null },
                data: {
                    settings: {
                        ...currentSettings,
                        messagingRouting: updatedRouting
                    }
                }
            });

            logger.info('Bulk messaging routing saved', { tenantId });

            res.json({
                success: true,
                message: 'Configurazione routing salvata con successo',
                data: updatedRouting
            });

        } catch (error) {
            logger.error('Error saving bulk messaging routing:', { error: error.message });
            res.status(500).json({
                success: false,
                code: 'INTERNAL_ERROR',
                message: 'Errore durante il salvataggio della configurazione routing'
            });
        }
    }
);

// La risoluzione del routing per i servizi di invio è ora centralizzata in
// services/messaging/messagingRouting.js (resolveBranchForType / getSmtpSendConfigForBranch).

export default router;
