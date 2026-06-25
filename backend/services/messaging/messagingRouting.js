/**
 * Messaging Routing Resolver
 *
 * Single source of truth for messaging routing: maps a communication type
 * (es. MEDICAL_REPORTS, CREDENTIALS) al branch SMTP/WhatsApp/SMS e al flag PEC
 * configurati dall'admin in `tenant.settings.messagingRouting` (tab Routing di
 * /management/config#messaging).
 *
 * Usato dai flussi di invio reali (referti, credenziali, notifiche) per scegliere
 * la configurazione corretta invece di hardcodare il branch.
 *
 * @module services/messaging/messagingRouting
 */

import crypto from 'node:crypto';
import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

// Chiave di cifratura condivisa con messaging-routes.js / emailService.js
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || null;

/**
 * Branch validi per la configurazione messaggistica.
 * DISABLED = non usare questo canale per la tipologia di comunicazione.
 */
export const VALID_BRANCH_TYPES = ['FORMAZIONE', 'CLINICA', 'default', 'DISABLED'];

/**
 * Tipologie di comunicazione gestite dal routing.
 * Tenere allineato con il tab Routing del frontend.
 */
export const COMMUNICATION_TYPES = [
    // === FORMAZIONE ===
    'INVOICES_COURSES',    // Fatture corsi formazione
    'CERTIFICATES',        // Attestati formazione
    'COURSES_RSPP',        // Comunicazioni corsi RSPP/sicurezza

    // === CLINICA ===
    'MEDICAL_REPORTS',     // Referti visite mediche
    'APPOINTMENTS',        // Promemoria appuntamenti
    'INSPECTIONS',         // Sopralluoghi aziendali
    'NOMINATIONS',         // Nomine (medico competente, RSPP)

    // === COMMERCIALE ===
    'QUOTES',              // Preventivi (corsi e visite)
    'COMPANY_TARIFFS',     // Tariffari aziendali

    // === TRASVERSALI ===
    'CREDENTIALS',         // Credenziali utente
    'MARKETING',           // Comunicazioni marketing (newsletter, promozioni brand)
    'PROMOTIONAL',         // Offerte promozionali (sconti, offerte limitate)
    'GENERAL'              // Comunicazioni generali (default)
];

/**
 * Mappa template email (EMAIL_TEMPLATES di emailService) → tipologia comunicazione.
 * I template non mappati ricadono su 'GENERAL'.
 */
export const TEMPLATE_COMMUNICATION_TYPE = {
    BENVENUTO_ACCOUNT: 'CREDENTIALS',
    REFERTO_DISPONIBILE: 'MEDICAL_REPORTS',
    GIUDIZIO_IDONEITA_NOTIFICA: 'MEDICAL_REPORTS',
    MEDICO_POLIAMBULATORIO_NOTIFICA: 'MEDICAL_REPORTS',
    CONFERMA_APPUNTAMENTO: 'APPOINTMENTS',
    REMINDER_APPUNTAMENTO: 'APPOINTMENTS',
    FATTURA_EMESSA: 'INVOICES_COURSES',
    FATTURA_ELETTRONICA: 'INVOICES_COURSES',
    NOTIFICA_GENERICA: 'GENERAL'
};

/**
 * Normalizza un branch type sui valori validi.
 */
export function normalizeBranchType(branchType) {
    if (!branchType) return 'default';
    const normalized = String(branchType).toUpperCase();
    return VALID_BRANCH_TYPES.includes(normalized) ? normalized : 'default';
}

/**
 * Ottiene la configurazione (SMTP/WhatsApp) per uno specifico branch con fallback.
 * Supporta sia la vecchia struttura flat sia quella per-branch.
 */
export function getConfigForBranch(configs, branchType) {
    if (!configs) return null;
    // Vecchia struttura flat (senza branch)
    if (configs.host !== undefined || configs.phoneNumberId !== undefined) {
        return configs;
    }
    const normalized = normalizeBranchType(branchType);
    return configs[normalized] || configs['default'] || null;
}

/**
 * Decripta una stringa AES-256-CBC (formato iv:encrypted). Ritorna null se la
 * chiave non è configurata o la decifratura fallisce.
 */
export function decryptSecret(encrypted) {
    if (!encrypted) return null;
    if (!ENCRYPTION_KEY) {
        logger.warn('ENCRYPTION_KEY non impostata – impossibile decifrare il segreto', { component: 'messagingRouting' });
        return null;
    }
    try {
        const parts = String(encrypted).split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedText = Buffer.from(parts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (err) {
        logger.error('Decifratura segreto fallita', { component: 'messagingRouting', error: err.message });
        return null;
    }
}

/**
 * Risolve il routing configurato per una tipologia di comunicazione.
 * @param {string} tenantId
 * @param {string} communicationType - una di COMMUNICATION_TYPES
 * @returns {Promise<{smtpBranch:string, whatsappBranch:string, smsBranch:string, pecEnabled:boolean}|null>}
 *          null se nessun routing è configurato per quel tipo (→ usare default).
 */
export async function resolveBranchForType(tenantId, communicationType) {
    if (!tenantId || !communicationType) return null;
    try {
        const tenant = await prisma.tenant.findFirst({
            where: { id: tenantId, deletedAt: null },
            select: { settings: true }
        });
        const routing = tenant?.settings?.messagingRouting || {};
        const typeRouting = routing[communicationType];
        if (!typeRouting) return null;
        return {
            smtpBranch: typeRouting.smtpBranch || 'default',
            whatsappBranch: typeRouting.whatsappBranch || 'default',
            smsBranch: typeRouting.smsBranch || 'default',
            pecEnabled: typeRouting.pecEnabled || false
        };
    } catch (error) {
        logger.warn('resolveBranchForType fallito', {
            component: 'messagingRouting', tenantId, communicationType, error: error.message
        });
        return null;
    }
}

/**
 * Restituisce la tipologia di comunicazione associata a un template email.
 */
export function communicationTypeForTemplate(template) {
    return TEMPLATE_COMMUNICATION_TYPE[template] || 'GENERAL';
}

/**
 * Ottiene la configurazione SMTP di invio per uno specifico branch, in un formato
 * compatibile con i transporter (host/port/secure/user/pass decifrata).
 * Ritorna null se non configurata o disabilitata.
 * @returns {Promise<{smtpHost:string, smtpPort:number, smtpSecure:boolean, smtpUser:string, smtpPassword:string, fromEmail:string, fromName:string}|null>}
 */
export async function getSmtpSendConfigForBranch(tenantId, branchType) {
    if (!tenantId) return null;
    try {
        const tenant = await prisma.tenant.findFirst({
            where: { id: tenantId, deletedAt: null },
            select: { settings: true }
        });
        const smtpConfigs = tenant?.settings?.smtp;
        const config = getConfigForBranch(smtpConfigs, branchType);
        if (!config || config.enabled === false) return null;
        if (!config.host || !config.username || !config.password) return null;
        return {
            smtpHost: config.host,
            smtpPort: config.port,
            smtpSecure: config.secure === true,
            smtpUser: config.username,
            smtpPassword: decryptSecret(config.password),
            fromEmail: config.fromEmail || config.username,
            fromName: config.fromName || ''
        };
    } catch (error) {
        logger.warn('getSmtpSendConfigForBranch fallito', {
            component: 'messagingRouting', tenantId, branchType, error: error.message
        });
        return null;
    }
}
