/**
 * WhatsAppChannelHandler.js
 *
 * Handler per invio notifiche via WhatsApp Business Cloud API (Meta).
 * Modello centralizzato: access token della piattaforma (env), il tenant configura
 * solo il proprio phoneNumberId nel tab Messaggistica di /management/config.
 *
 * Project 47 - Fase 4: Delivery Multi-Canale
 *
 * Features:
 * - Messaggi freeform di testo (rich formatting WhatsApp: bold, italic, link)
 * - Emoji per tipo notifica
 * - Routing-aware: il branch WhatsApp è risolto dalla tipologia di comunicazione
 *
 * @module services/notifications/channels/WhatsAppChannelHandler
 * @version 2.0.0
 */

import { SMSChannelHandler } from './SMSChannelHandler.js';
import { logger } from '../../../utils/logger.js';
import { sendWhatsAppMessage, isWhatsAppConfigured } from '../../messaging/whatsappSender.js';

/**
 * WhatsAppChannelHandler
 *
 * Gestisce l'invio di notifiche via WhatsApp Business Cloud API (Meta).
 */
class WhatsAppChannelHandler {

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Emoji per tipo notifica
   */
  static typeEmojis = {
    INFO: 'ℹ️',
    SUCCESS: '✅',
    WARNING: '⚠️',
    ERROR: '❌',
    CRITICAL: '🚨',
    REMINDER: '🔔',
    ACTION: '👆',
    SYSTEM: '⚙️',
    APPOINTMENT: '📅',
    DOCUMENT: '📄',
    INVOICE: '💳',
    MESSAGE: '💬'
  };

  /**
   * Limiti messaggi WhatsApp
   */
  static MAX_MESSAGE_LENGTH = 4096;

  /**
   * Mappa categoria notifica → tipologia comunicazione (per il routing messaggistica).
   */
  static categoryToCommunicationType = {
    APPOINTMENT: 'APPOINTMENTS',
    DOCUMENT: 'MEDICAL_REPORTS',
    INVOICE: 'INVOICES_COURSES'
  };

  // ============================================
  // MAIN SEND METHOD
  // ============================================

  /**
   * Invia notifica via WhatsApp (Meta Cloud API)
   *
   * @param {Object} notification - Oggetto notifica
   * @param {Object} recipient - Person destinatario
   * @param {string} phoneNumber - Numero di telefono
   * @returns {Promise<{success:boolean, externalId?:string, error?:string}>}
   */
  static async send(notification, recipient, phoneNumber) {
    try {
      if (!isWhatsAppConfigured()) {
        return { success: false, error: 'WhatsApp non configurato (token piattaforma mancante)' };
      }

      // Valida e formatta numero
      const formattedPhone = SMSChannelHandler.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        return { success: false, error: 'Invalid phone number for WhatsApp' };
      }

      const body = this.buildFreeformMessage(notification, recipient);
      const communicationType = this.categoryToCommunicationType[notification.category] || 'GENERAL';

      const result = await sendWhatsAppMessage({
        tenantId: notification.tenantId,
        to: formattedPhone,
        body,
        communicationType
      });

      if (!result.success) {
        if (result.skipped) {
          logger.info({
            notificationId: notification.id,
            reason: result.error
          }, 'WhatsApp notification skipped (canale disabilitato/non configurato)');
        }
        return { success: false, error: result.error || 'WhatsApp delivery failed' };
      }

      logger.info({
        notificationId: notification.id,
        recipientId: recipient.id,
        messageId: result.messageId
      }, 'WhatsApp notification sent');

      return { success: true, externalId: result.messageId };

    } catch (error) {
      logger.error({
        error: error.message,
        notificationId: notification.id,
        recipientId: recipient.id
      }, 'WhatsApp delivery failed');

      return { success: false, error: 'WhatsApp delivery failed' };
    }
  }

  // ============================================
  // MESSAGE BUILDING
  // ============================================

  /**
   * Costruisce messaggio freeform con rich formatting WhatsApp
   */
  static buildFreeformMessage(notification, recipient) {
    const emoji = this.typeEmojis[notification.type] ||
      this.typeEmojis[notification.category] ||
      '📩';
    const recipientName = recipient.firstName || 'Utente';

    let message = `${emoji} *${notification.title}*\n\n`;
    message += `Ciao ${recipientName}!\n\n`;
    message += notification.body;

    if (notification.actionUrl) {
      message += `\n\n👉 ${notification.actionUrl}`;
    }

    if (['CRITICAL', 'URGENT'].includes(notification.priority)) {
      message += `\n\n⚠️ _Questo messaggio richiede la tua attenzione immediata._`;
    }

    if (message.length > this.MAX_MESSAGE_LENGTH) {
      message = message.substring(0, this.MAX_MESSAGE_LENGTH - 3) + '...';
    }

    return message;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Formatta testo con markdown WhatsApp
   */
  static formatMarkdown(text, format) {
    const formats = {
      bold: `*${text}*`,
      italic: `_${text}_`,
      strikethrough: `~${text}~`,
      monospace: `\`\`\`${text}\`\`\``
    };

    return formats[format] || text;
  }
}

export { WhatsAppChannelHandler };
export default WhatsAppChannelHandler;
