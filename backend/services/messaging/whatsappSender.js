/**
 * WhatsApp Cloud Sender
 *
 * Invio messaggi via Meta WhatsApp Business Cloud API (graph.facebook.com).
 * Modello centralizzato: l'access token è della piattaforma (env), il tenant
 * configura solo il proprio `phoneNumberId` (tab Messaggistica → WhatsApp).
 *
 * Riferimento: https://developers.facebook.com/docs/whatsapp/cloud-api/overview
 *
 * @module services/messaging/whatsappSender
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { getConfigForBranch, normalizeBranchType, resolveBranchForType } from './messagingRouting.js';

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || null;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v19.0';
const WHATSAPP_DEFAULT_PHONE_NUMBER_ID = process.env.WHATSAPP_DEFAULT_PHONE_NUMBER_ID || null;

/**
 * Risolve il phoneNumberId WhatsApp del tenant per uno specifico branch.
 * @returns {Promise<{phoneNumberId:string|null, enabled:boolean}>}
 */
async function resolveWhatsAppConfig(tenantId, branchType) {
    const tenant = await prisma.tenant.findFirst({
        where: { id: tenantId, deletedAt: null },
        select: { settings: true }
    });
    const config = getConfigForBranch(tenant?.settings?.whatsapp, branchType);
    return {
        phoneNumberId: config?.phoneNumberId || WHATSAPP_DEFAULT_PHONE_NUMBER_ID,
        enabled: config ? config.enabled !== false : !!WHATSAPP_DEFAULT_PHONE_NUMBER_ID
    };
}

/**
 * Indica se l'invio WhatsApp è possibile a livello di piattaforma (token presente).
 */
export function isWhatsAppConfigured() {
    return !!WHATSAPP_ACCESS_TOKEN;
}

/**
 * Invia un messaggio di testo WhatsApp via Meta Cloud API.
 *
 * @param {Object} opts
 * @param {string} opts.tenantId
 * @param {string} opts.to - numero destinatario (qualsiasi formato, viene normalizzato)
 * @param {string} opts.body - testo del messaggio
 * @param {string} [opts.branchType] - branch esplicito; se assente viene risolto dal routing
 * @param {string} [opts.communicationType] - tipologia comunicazione per risolvere il branch dal routing
 * @returns {Promise<{success:boolean, messageId?:string, skipped?:boolean, error?:string}>}
 */
export async function sendWhatsAppMessage({ tenantId, to, body, branchType, communicationType }) {
    if (!WHATSAPP_ACCESS_TOKEN) {
        logger.warn('WhatsApp non configurato (WHATSAPP_ACCESS_TOKEN mancante)', { component: 'whatsappSender' });
        return { success: false, error: 'not_configured' };
    }
    if (!to) {
        return { success: false, error: 'no_recipient' };
    }

    // Risolvi branch dal routing se non esplicito
    let resolvedBranch = branchType;
    if (tenantId && !resolvedBranch && communicationType) {
        const routing = await resolveBranchForType(tenantId, communicationType);
        if (routing) {
            if (routing.whatsappBranch === 'DISABLED') {
                logger.info('Canale WhatsApp disabilitato dal routing', {
                    component: 'whatsappSender', tenantId, communicationType
                });
                return { success: false, skipped: true, error: 'channel_disabled' };
            }
            resolvedBranch = routing.whatsappBranch;
        }
    }
    const normalizedBranch = normalizeBranchType(resolvedBranch);

    const { phoneNumberId, enabled } = await resolveWhatsAppConfig(tenantId, normalizedBranch);
    if (!enabled) {
        return { success: false, skipped: true, error: 'disabled' };
    }
    if (!phoneNumberId) {
        return { success: false, error: 'no_phone_number_id' };
    }

    const cleanNumber = String(to).replace(/\D/g, '');

    try {
        const response = await fetch(
            `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanNumber,
                    type: 'text',
                    text: { preview_url: false, body }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.error?.message || `HTTP ${response.status}`;
            logger.error('Invio WhatsApp fallito', {
                component: 'whatsappSender', tenantId, to: '***' + cleanNumber.slice(-4), error: message
            });
            return { success: false, error: message };
        }

        const result = await response.json().catch(() => ({}));
        const messageId = result?.messages?.[0]?.id;
        logger.info('Messaggio WhatsApp inviato', {
            component: 'whatsappSender', tenantId, to: '***' + cleanNumber.slice(-4), branchType: normalizedBranch, messageId
        });
        return { success: true, messageId };
    } catch (error) {
        logger.error('Errore invio WhatsApp', {
            component: 'whatsappSender', tenantId, error: error.message
        });
        return { success: false, error: error.message };
    }
}

export default { sendWhatsAppMessage, isWhatsAppConfigured };
