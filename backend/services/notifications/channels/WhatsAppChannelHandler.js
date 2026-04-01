/**
 * WhatsAppChannelHandler.js
 * 
 * Handler per invio notifiche via WhatsApp Business API.
 * Usa Twilio WhatsApp come provider.
 * 
 * Project 47 - Fase 4: Delivery Multi-Canale
 * 
 * Features:
 * - Template messages approvati da WhatsApp
 * - Messaggi freeform per conversazioni attive
 * - Rich formatting (bold, italic, links)
 * - Emoji per tipo notifica
 * - Rate limiting aware
 * 
 * @module services/notifications/channels/WhatsAppChannelHandler
 * @version 1.0.0
 */

import { SMSService } from '../../smsService.js';
import { SMSChannelHandler } from './SMSChannelHandler.js';
import { logger } from '../../../utils/logger.js';

/**
 * WhatsAppChannelHandler
 * 
 * Gestisce l'invio di notifiche via WhatsApp.
 * Usa Twilio WhatsApp Business API.
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
   * Template IDs approvati da WhatsApp
   * Questi devono essere pre-registrati in Twilio
   */
  static templates = {
    APPOINTMENT_REMINDER: 'HX9a8b7c6d5e4f3g2h1i0j', // Placeholder SID
    APPOINTMENT_CONFIRMATION: 'HXa9b8c7d6e5f4g3h2i1j0',
    DOCUMENT_READY: 'HXb0c9d8e7f6g5h4i3j2k1',
    INVOICE_ISSUED: 'HXc1d0e9f8g7h6i5j4k3l2',
    GENERIC_NOTIFICATION: 'HXd2e1f0g9h8i7j6k5l4m3'
  };

  /**
   * Limiti messaggi WhatsApp
   */
  static MAX_MESSAGE_LENGTH = 4096;

  // ============================================
  // MAIN SEND METHOD
  // ============================================

  /**
   * Invia notifica via WhatsApp
   * 
   * @param {Object} notification - Oggetto notifica
   * @param {Object} recipient - Person destinatario
   * @param {string} phoneNumber - Numero di telefono
   * @returns {Promise<DeliveryResult>}
   */
  static async send(notification, recipient, phoneNumber) {
    try {
      // Valida e formatta numero
      const formattedPhone = SMSChannelHandler.formatPhoneNumber(phoneNumber);

      if (!formattedPhone) {
        return {
          success: false,
          error: 'Invalid phone number for WhatsApp'
        };
      }

      // Usa SMSService esistente per WhatsApp
      const result = await SMSService.sendWhatsApp({
        to: formattedPhone,
        template: this.mapNotificationTypeToTemplate(notification.category),
        data: this.buildTemplateData(notification, recipient),
        tenantId: notification.tenantId
      });

      logger.info({
        notificationId: notification.id,
        recipientId: recipient.id,
        messageSid: result.sid
      }, 'WhatsApp notification sent');

      return {
        success: true,
        externalId: result.sid || result.messageId
      };

    } catch (error) {
      logger.error({
        error: error.message,
        notificationId: notification.id,
        recipientId: recipient.id
      }, 'WhatsApp delivery failed');

      return {
        success: false,
        error: 'WhatsApp delivery failed'
      };
    }
  }

  /**
   * Invia WhatsApp diretto via Twilio (bypass SMSService)
   */
  static async sendDirect(notification, recipient, phoneNumber) {
    try {
      const formattedPhone = SMSChannelHandler.formatPhoneNumber(phoneNumber);

      if (!formattedPhone) {
        return {
          success: false,
          error: 'Invalid phone number'
        };
      }

      // Import Twilio
      const twilio = await import('twilio');
      const client = twilio.default(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;

      // Costruisci messaggio
      const messageOptions = await this.buildWhatsAppMessage(notification, recipient);

      const result = await client.messages.create({
        from: `whatsapp:${whatsappNumber}`,
        to: `whatsapp:${formattedPhone}`,
        ...messageOptions,
        statusCallback: `${process.env.API_URL}/api/v1/webhooks/twilio/whatsapp-status`
      });

      return {
        success: true,
        externalId: result.sid
      };

    } catch (error) {
      logger.error({
        error: error.message,
        notificationId: notification.id
      }, 'Direct WhatsApp delivery failed');

      return {
        success: false,
        error: 'WhatsApp direct delivery failed'
      };
    }
  }

  // ============================================
  // MESSAGE BUILDING
  // ============================================

  /**
   * Costruisce messaggio WhatsApp
   * Sceglie tra template approvato o freeform
   */
  static async buildWhatsAppMessage(notification, recipient) {
    // Determina se usare template o freeform
    const templateSid = this.getTemplateForNotification(notification);

    if (templateSid) {
      // Usa template approvato (per messaggi proattivi)
      return {
        contentSid: templateSid,
        contentVariables: JSON.stringify(
          this.buildTemplateVariables(notification, recipient)
        )
      };
    }

    // Fallback a messaggio freeform
    // NOTA: Funziona solo se c'è una conversazione attiva (24h window)
    return {
      body: this.buildFreeformMessage(notification, recipient)
    };
  }

  /**
   * Costruisce messaggio freeform con rich formatting
   */
  static buildFreeformMessage(notification, recipient) {
    const emoji = this.typeEmojis[notification.type] ||
      this.typeEmojis[notification.category] ||
      '📩';
    const recipientName = recipient.firstName || 'Utente';

    // Formatta con markdown WhatsApp
    let message = `${emoji} *${notification.title}*\n\n`;
    message += `Ciao ${recipientName}!\n\n`;
    message += notification.body;

    // Aggiungi action URL
    if (notification.actionUrl) {
      message += `\n\n👉 ${notification.actionUrl}`;
    }

    // Aggiungi footer per priorità alta
    if (['CRITICAL', 'URGENT'].includes(notification.priority)) {
      message += `\n\n⚠️ _Questo messaggio richiede la tua attenzione immediata._`;
    }

    // Limita lunghezza
    if (message.length > this.MAX_MESSAGE_LENGTH) {
      message = message.substring(0, this.MAX_MESSAGE_LENGTH - 3) + '...';
    }

    return message;
  }

  /**
   * Costruisce dati per template SMSService
   */
  static buildTemplateData(notification, recipient) {
    return {
      patientName: recipient.firstName || 'Utente',
      title: notification.title,
      body: notification.body,
      actionUrl: notification.actionUrl,
      priority: notification.priority,
      notificationId: notification.id
    };
  }

  /**
   * Costruisce variabili per template Twilio
   */
  static buildTemplateVariables(notification, recipient) {
    return {
      '1': recipient.firstName || 'Utente',
      '2': notification.title,
      '3': notification.body,
      '4': notification.actionUrl || ''
    };
  }

  // ============================================
  // TEMPLATE MAPPING
  // ============================================

  /**
   * Mappa tipo notifica a template SMSService
   */
  static mapNotificationTypeToTemplate(category) {
    const mapping = {
      'APPOINTMENT': 'REMINDER_APPUNTAMENTO',
      'DOCUMENT': 'REFERTO_DISPONIBILE',
      'INVOICE': 'FATTURA_DISPONIBILE'
    };

    return mapping[category] || 'NOTIFICA_GENERICA';
  }

  /**
   * Ottiene template SID per notifica
   * Restituisce null se non c'è template specifico
   */
  static getTemplateForNotification(notification) {
    // Mappa categoria a template
    const categoryTemplates = {
      'APPOINTMENT': this.templates.APPOINTMENT_REMINDER,
      'DOCUMENT': this.templates.DOCUMENT_READY,
      'INVOICE': this.templates.INVOICE_ISSUED
    };

    // Usa template specifico se disponibile
    if (notification.whatsappTemplateSid) {
      return notification.whatsappTemplateSid;
    }

    // Usa template per categoria
    return categoryTemplates[notification.category] || null;
  }

  // ============================================
  // RICH MESSAGE FEATURES
  // ============================================

  /**
   * Costruisce messaggio con lista (WhatsApp list message)
   * Richiede Twilio Content API
   */
  static buildListMessage(notification, items) {
    return {
      contentSid: 'list_template_sid',
      contentVariables: JSON.stringify({
        header: notification.title,
        body: notification.body,
        footer: 'ElementMedica',
        items: items.map((item, idx) => ({
          id: `item_${idx}`,
          title: item.title,
          description: item.description
        }))
      })
    };
  }

  /**
   * Costruisce messaggio con bottoni (WhatsApp button message)
   * Richiede Twilio Content API
   */
  static buildButtonMessage(notification, buttons) {
    return {
      contentSid: 'button_template_sid',
      contentVariables: JSON.stringify({
        body: `*${notification.title}*\n\n${notification.body}`,
        buttons: buttons.slice(0, 3).map((btn, idx) => ({ // Max 3 bottoni
          type: 'reply',
          id: `btn_${idx}`,
          title: btn.label
        }))
      })
    };
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

  /**
   * Verifica se conversazione è attiva (24h window)
   * Richiede check su Twilio
   */
  static async isConversationActive(phoneNumber) {
    // TODO: Implementare check su Twilio per window 24h
    // Per ora, assumiamo che non ci sia conversazione attiva
    // e usiamo sempre template
    return false;
  }

  /**
   * Stima costo invio WhatsApp
   * Basato su tariffe Twilio indicative
   */
  static estimateCost(messageType = 'template', countryCode = 'IT') {
    // Tariffe indicative Twilio WhatsApp (USD)
    const rates = {
      template: {
        IT: 0.0425,
        US: 0.0147,
        DEFAULT: 0.05
      },
      conversation: {
        IT: 0.0625,
        US: 0.0088,
        DEFAULT: 0.05
      }
    };

    const rateType = rates[messageType] || rates.template;
    return (rateType[countryCode] || rateType.DEFAULT).toFixed(4);
  }
}

export { WhatsAppChannelHandler };
export default WhatsAppChannelHandler;
