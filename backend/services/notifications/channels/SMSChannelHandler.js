/**
 * SMSChannelHandler.js
 * 
 * Handler per invio notifiche via SMS.
 * Wrapper attorno al SMSService esistente (Twilio).
 * 
 * Project 47 - Fase 4: Delivery Multi-Canale
 * 
 * Features:
 * - Messaggi SMS ottimizzati (160 char)
 * - Formattazione numero E.164
 * - Prefissi priorità con emoji
 * - URL shortening per actionUrl
 * - Rate limiting aware
 * 
 * @module services/notifications/channels/SMSChannelHandler
 * @version 1.0.0
 */

import { SMSService } from '../../smsService.js';
import { logger } from '../../../utils/logger.js';

/**
 * SMSChannelHandler
 * 
 * Gestisce l'invio di notifiche via SMS.
 * Usa Twilio tramite SMSService esistente.
 */
class SMSChannelHandler {

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Limite caratteri SMS standard
   */
  static MAX_SMS_LENGTH = 160;

  /**
   * Limite per SMS concatenati (3 parti)
   */
  static MAX_MULTIPART_LENGTH = 459;

  /**
   * Prefissi emoji per priorità
   */
  static priorityPrefixes = {
    CRITICAL: '🚨 ',
    URGENT: '⚠️ ',
    HIGH: '❗ ',
    NORMAL: '',
    LOW: ''
  };

  /**
   * Prefissi testo per priorità (fallback se emoji non supportati)
   */
  static priorityTextPrefixes = {
    CRITICAL: '[CRITICO] ',
    URGENT: '[URGENTE] ',
    HIGH: '[!] ',
    NORMAL: '',
    LOW: ''
  };

  // ============================================
  // MAIN SEND METHOD
  // ============================================

  /**
   * Invia notifica via SMS
   * 
   * @param {Object} notification - Oggetto notifica
   * @param {Object} recipient - Person destinatario
   * @param {string} phoneNumber - Numero di telefono
   * @returns {Promise<DeliveryResult>}
   */
  static async send(notification, recipient, phoneNumber) {
    try {
      // Valida e formatta numero
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      if (!formattedPhone) {
        return {
          success: false,
          error: 'Numero di telefono non valido'
        };
      }

      // Costruisci messaggio SMS
      const message = this.buildSMSMessage(notification);

      // Invia via SMSService
      const result = await SMSService.sendSMS({
        to: formattedPhone,
        template: 'CUSTOM', // Usiamo template custom per notifiche
        data: {
          customMessage: message,
          notificationId: notification.id
        },
        tenantId: notification.tenantId
      });

      logger.info({
        notificationId: notification.id,
        recipientId: recipient.id,
        messageSid: result.sid,
        messageLength: message.length
      }, 'SMS notification sent');

      return {
        success: true,
        externalId: result.sid || result.messageId
      };

    } catch (error) {
      logger.error({
        error: error.message,
        notificationId: notification.id,
        recipientId: recipient.id
      }, 'SMS delivery failed');

      return {
        success: false,
        error: 'Invio SMS fallito'
      };
    }
  }

  /**
   * Invia SMS diretto via Twilio (bypass SMSService)
   * Utile per test o messaggi critici
   */
  static async sendDirect(notification, recipient, phoneNumber) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      if (!formattedPhone) {
        return {
          success: false,
          error: 'Numero di telefono non valido'
        };
      }

      const message = this.buildSMSMessage(notification);

      // Import Twilio diretto
      const twilio = await import('twilio');
      const client = twilio.default(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone,
        statusCallback: `${process.env.API_URL}/api/v1/webhooks/twilio/sms-status`
      });

      return {
        success: true,
        externalId: result.sid
      };

    } catch (error) {
      logger.error({
        error: error.message,
        notificationId: notification.id
      }, 'Direct SMS delivery failed');

      return {
        success: false,
        error: 'Invio SMS diretto fallito'
      };
    }
  }

  // ============================================
  // MESSAGE BUILDING
  // ============================================

  /**
   * Costruisce messaggio SMS ottimizzato
   * 
   * @param {Object} notification - Notifica
   * @param {Object} options - Opzioni
   * @returns {string} Messaggio SMS
   */
  static buildSMSMessage(notification, options = {}) {
    const { useEmoji = true, maxLength = this.MAX_SMS_LENGTH } = options;

    // Seleziona prefisso
    const prefix = useEmoji
      ? (this.priorityPrefixes[notification.priority] || '')
      : (this.priorityTextPrefixes[notification.priority] || '');

    // Costruisci messaggio base
    let message = `${prefix}${notification.title}`;

    // Aggiungi body se c'è spazio
    const bodyToAdd = notification.body ? `\n${notification.body}` : '';
    const messageWithBody = message + bodyToAdd;

    if (messageWithBody.length <= maxLength) {
      message = messageWithBody;
    }

    // Aggiungi URL se c'è spazio
    if (notification.actionUrl) {
      const shortUrl = this.shortenUrl(notification.actionUrl);
      const messageWithUrl = `${message}\n${shortUrl}`;

      if (messageWithUrl.length <= maxLength) {
        message = messageWithUrl;
      }
    }

    // Tronca se necessario
    if (message.length > maxLength) {
      message = message.substring(0, maxLength - 3) + '...';
    }

    return message;
  }

  /**
   * Costruisce messaggio SMS lungo (multi-part)
   * Utile per notifiche critiche che richiedono più dettaglio
   */
  static buildLongSMSMessage(notification) {
    const prefix = this.priorityPrefixes[notification.priority] || '';

    let message = `${prefix}${notification.title}\n\n`;
    message += notification.body;

    if (notification.actionUrl) {
      message += `\n\n👉 ${notification.actionUrl}`;
    }

    // Limita a 3 SMS concatenati
    if (message.length > this.MAX_MULTIPART_LENGTH) {
      message = message.substring(0, this.MAX_MULTIPART_LENGTH - 3) + '...';
    }

    return message;
  }

  // ============================================
  // PHONE NUMBER HANDLING
  // ============================================

  /**
   * Formatta numero telefono per formato E.164
   * 
   * @param {string} phone - Numero telefono
   * @returns {string|null} Numero formattato o null se invalido
   */
  static formatPhoneNumber(phone) {
    if (!phone) return null;

    // Rimuovi spazi e caratteri non numerici (tranne +)
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Se inizia con + mantienilo
    if (cleaned.startsWith('+')) {
      // Valida lunghezza (minimo +CC XXX = 10 caratteri)
      if (cleaned.length >= 10 && cleaned.length <= 15) {
        return cleaned;
      }
      return null;
    }

    // Rimuovi eventuali + interni
    cleaned = cleaned.replace(/\+/g, '');

    // Numeri italiani
    if (cleaned.startsWith('39')) {
      // Già con prefisso Italia
      cleaned = '+' + cleaned;
    } else if (cleaned.startsWith('3') && cleaned.length === 10) {
      // Numero mobile italiano senza prefisso
      cleaned = '+39' + cleaned;
    } else if (cleaned.startsWith('0') && cleaned.length >= 9) {
      // Fisso italiano
      cleaned = '+39' + cleaned;
    } else if (cleaned.length === 10 && cleaned.startsWith('3')) {
      // Mobile italiano
      cleaned = '+39' + cleaned;
    } else {
      // Assume Italia per altri casi
      cleaned = '+39' + cleaned;
    }

    // Valida lunghezza finale
    if (cleaned.length >= 12 && cleaned.length <= 15) {
      return cleaned;
    }

    return null;
  }

  /**
   * Valida numero telefono
   */
  static isValidPhoneNumber(phone) {
    return this.formatPhoneNumber(phone) !== null;
  }

  // ============================================
  // URL HANDLING
  // ============================================

  /**
   * Accorcia URL per SMS
   * In produzione, integrare con servizio URL shortening (bit.ly, etc.)
   * 
   * @param {string} url - URL originale
   * @returns {string} URL accorciato
   */
  static shortenUrl(url) {
    if (!url) return '';

    // TODO: Integrare con servizio URL shortening in produzione
    // Per ora, tronca URL lunghi

    const maxUrlLength = 50;

    if (url.length <= maxUrlLength) {
      return url;
    }

    // Rimuovi protocollo per risparmiare caratteri
    let shortened = url.replace(/^https?:\/\//, '');

    // Rimuovi www
    shortened = shortened.replace(/^www\./, '');

    if (shortened.length <= maxUrlLength) {
      return shortened;
    }

    // Tronca mantenendo dominio e inizio path
    return shortened.substring(0, maxUrlLength - 3) + '...';
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Calcola numero SMS necessari per un messaggio
   */
  static calculateSMSCount(message) {
    const length = message.length;

    if (length <= 160) return 1;
    if (length <= 306) return 2; // 153 * 2 per multipart
    if (length <= 459) return 3; // 153 * 3

    return Math.ceil(length / 153);
  }

  /**
   * Stima costo invio (per statistiche)
   * Basato su tariffe Twilio indicative
   */
  static estimateCost(message, countryCode = 'IT') {
    const smsCount = this.calculateSMSCount(message);

    // Tariffe indicative Twilio (USD)
    const rates = {
      IT: 0.0804,  // Italia
      US: 0.0079,  // USA
      UK: 0.0420,  // UK
      DEFAULT: 0.05
    };

    const rate = rates[countryCode] || rates.DEFAULT;
    return (smsCount * rate).toFixed(4);
  }
}

export { SMSChannelHandler };
export default SMSChannelHandler;
