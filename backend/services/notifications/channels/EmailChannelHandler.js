/**
 * EmailChannelHandler.js
 * 
 * Handler per invio notifiche via Email.
 * Wrapper attorno all'EmailService esistente per integrarlo
 * nel sistema di notifiche multi-canale.
 * 
 * Project 47 - Fase 4: Delivery Multi-Canale
 * 
 * Features:
 * - Template HTML responsive per notifiche
 * - Supporto priorità con badge colorati
 * - Action button per CTA
 * - Footer con link preferenze
 * - Plain text fallback
 * 
 * @module services/notifications/channels/EmailChannelHandler
 * @version 1.0.0
 */

import { EmailService } from '../../emailService.js';
import { logger } from '../../../utils/logger.js';

/**
 * EmailChannelHandler
 * 
 * Gestisce l'invio di notifiche via email.
 * Usa EmailService esistente come backend.
 */
class EmailChannelHandler {

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Colori per priorità
   */
  static priorityColors = {
    CRITICAL: '#dc2626', // red-600
    URGENT: '#f59e0b',   // amber-500
    HIGH: '#f97316',     // orange-500
    NORMAL: '#0d9488',   // teal-600
    LOW: '#6b7280'       // gray-500
  };

  /**
   * Badge per priorità
   */
  static priorityBadges = {
    CRITICAL: { text: 'CRITICO', color: '#dc2626', bg: '#fef2f2' },
    URGENT: { text: 'URGENTE', color: '#f59e0b', bg: '#fffbeb' },
    HIGH: { text: 'ALTA PRIORITÀ', color: '#f97316', bg: '#fff7ed' }
  };

  /**
   * Icone per tipo notifica
   */
  static typeIcons = {
    INFO: 'ℹ️',
    SUCCESS: '✅',
    WARNING: '⚠️',
    ERROR: '❌',
    CRITICAL: '🚨',
    REMINDER: '🔔',
    ACTION: '👆',
    SYSTEM: '⚙️'
  };

  // ============================================
  // MAIN SEND METHOD
  // ============================================

  /**
   * Invia notifica via email
   * 
   * @param {Object} notification - Oggetto notifica
   * @param {Object} recipient - Person destinatario
   * @param {string} email - Indirizzo email
   * @returns {Promise<DeliveryResult>}
   */
  static async send(notification, recipient, email) {
    try {
      // Valida email
      if (!email || !this.isValidEmail(email)) {
        return {
          success: false,
          error: 'Invalid email address'
        };
      }

      // Costruisci email da notifica
      const emailData = this.buildEmailFromNotification(notification, recipient);

      // Usa EmailService esistente per l'invio
      const result = await EmailService.send({
        to: email,
        template: 'NOTIFICA_GENERICA', // Template generico per notifiche
        data: {
          ...emailData,
          recipientName: recipient.firstName || 'Utente',
          recipientEmail: email
        },
        tenantId: notification.tenantId
      });

      logger.info({
        notificationId: notification.id,
        recipientId: recipient.id,
        messageId: result.messageId
      }, 'Email notification sent');

      return {
        success: true,
        externalId: result.messageId
      };

    } catch (error) {
      logger.error({
        error: error.message,
        notificationId: notification.id,
        recipientId: recipient.id
      }, 'Email delivery failed');

      return {
        success: false,
        error: 'Email delivery failed'
      };
    }
  }

  /**
   * Invia email con template HTML custom (bypass EmailService templates)
   * Utile per notifiche che richiedono formattazione speciale
   */
  static async sendCustomHtml(notification, recipient, email) {
    try {
      if (!email || !this.isValidEmail(email)) {
        return {
          success: false,
          error: 'Invalid email address'
        };
      }

      // Costruisci email completa
      const subject = this.formatSubject(notification);
      const html = this.buildHtmlTemplate(notification, recipient);
      const text = this.buildTextVersion(notification);

      // Invia direttamente
      const result = await EmailService.send({
        to: email,
        template: 'CUSTOM', // Indica template custom
        data: {
          subject,
          html,
          text,
          customTemplate: true
        },
        tenantId: notification.tenantId
      });

      return {
        success: true,
        externalId: result.messageId
      };

    } catch (error) {
      logger.error({
        error: error.message,
        notificationId: notification.id
      }, 'Custom email delivery failed');

      return {
        success: false,
        error: 'Custom email delivery failed'
      };
    }
  }

  // ============================================
  // EMAIL BUILDING
  // ============================================

  /**
   * Costruisce dati email da notifica
   */
  static buildEmailFromNotification(notification, recipient) {
    return {
      subject: this.formatSubject(notification),
      title: notification.title,
      body: notification.body,
      icon: notification.icon || this.typeIcons[notification.type] || '🔔',
      priority: notification.priority,
      priorityBadge: this.priorityBadges[notification.priority],
      color: notification.color || this.priorityColors[notification.priority] || this.priorityColors.NORMAL,
      actionUrl: notification.actionUrl,
      actionLabel: notification.actionLabel || 'Visualizza',
      preferencesUrl: `${process.env.FRONTEND_URL || 'https://app.elementmedica.com'}/preferenze-notifiche`,
      recipientName: recipient.firstName || 'Utente',
      createdAt: notification.createdAt
    };
  }

  /**
   * Formatta subject email
   */
  static formatSubject(notification) {
    const prefix = this.getSubjectPrefix(notification.priority);
    return `${prefix}${notification.title}`;
  }

  /**
   * Prefisso subject per priorità
   */
  static getSubjectPrefix(priority) {
    const prefixes = {
      CRITICAL: '🚨 [CRITICO] ',
      URGENT: '⚠️ [URGENTE] ',
      HIGH: '❗ '
    };
    return prefixes[priority] || '';
  }

  // ============================================
  // HTML TEMPLATE
  // ============================================

  /**
   * Template HTML per email notifica
   * Design responsive, accessibile e moderno
   */
  static buildHtmlTemplate(notification, recipient) {
    const icon = notification.icon || this.typeIcons[notification.type] || '🔔';
    const color = notification.color || this.priorityColors[notification.priority] || this.priorityColors.NORMAL;
    const priorityBadge = this.buildPriorityBadgeHtml(notification.priority);
    const actionButton = this.buildActionButtonHtml(notification.actionUrl, notification.actionLabel);
    const recipientName = recipient.firstName || 'Utente';
    const frontendUrl = process.env.FRONTEND_URL || 'https://app.elementmedica.com';

    return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${this.escapeHtml(notification.title)}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .button { padding: 12px 24px !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${color} 0%, ${this.lightenColor(color, 20)} 100%); padding: 24px 32px; border-radius: 12px 12px 0 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                      ${icon} ${this.escapeHtml(notification.title)}
                    </h1>
                    ${priorityBadge}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                
                <!-- Greeting -->
                <tr>
                  <td style="padding-bottom: 20px;">
                    <p style="margin: 0; font-size: 16px; color: #374151;">
                      Ciao <strong>${this.escapeHtml(recipientName)}</strong>,
                    </p>
                  </td>
                </tr>
                
                <!-- Notification Content -->
                <tr>
                  <td style="padding-bottom: 24px;">
                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid ${color};">
                      <p style="margin: 0; font-size: 15px; color: #4b5563; white-space: pre-wrap;">${this.escapeHtml(notification.body)}</p>
                    </div>
                  </td>
                </tr>
                
                <!-- Action Button -->
                ${actionButton ? `
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    ${actionButton}
                  </td>
                </tr>
                ` : ''}
                
                <!-- Divider -->
                <tr>
                  <td style="padding: 16px 0;">
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;">
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      Questa notifica è stata inviata da ElementMedica.<br>
                      <a href="${frontendUrl}/preferenze-notifiche" style="color: ${color}; text-decoration: underline;">
                        Gestisci le tue preferenze di notifica
                      </a>
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <!-- Logo Footer -->
          <tr>
            <td align="center" style="padding: 24px;">
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                © ${new Date().getFullYear()} ElementMedica - Tutti i diritti riservati
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Costruisce badge priorità HTML
   */
  static buildPriorityBadgeHtml(priority) {
    const badge = this.priorityBadges[priority];
    if (!badge) return '';

    return `
      <span style="display: inline-block; margin-top: 8px; padding: 4px 12px; background-color: rgba(255,255,255,0.2); color: white; font-size: 11px; font-weight: 600; border-radius: 4px; text-transform: uppercase;">
        ${badge.text}
      </span>
    `;
  }

  /**
   * Costruisce action button HTML
   */
  static buildActionButtonHtml(actionUrl, actionLabel) {
    if (!actionUrl) return '';

    return `
      <a href="${this.escapeHtml(actionUrl)}" 
         class="button"
         style="display: inline-block; padding: 14px 28px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center;">
        ${this.escapeHtml(actionLabel || 'Visualizza')}
      </a>
    `;
  }

  // ============================================
  // PLAIN TEXT VERSION
  // ============================================

  /**
   * Versione testo plain per client senza HTML
   */
  static buildTextVersion(notification) {
    const priority = notification.priority;
    const priorityPrefix = ['CRITICAL', 'URGENT', 'HIGH'].includes(priority)
      ? `[${this.priorityBadges[priority]?.text || priority}] `
      : '';

    let text = `${priorityPrefix}${notification.title}\n`;
    text += '='.repeat(50) + '\n\n';
    text += notification.body + '\n\n';

    if (notification.actionUrl) {
      text += `${notification.actionLabel || 'Visualizza'}: ${notification.actionUrl}\n\n`;
    }

    text += '---\n';
    text += 'Questa notifica è stata inviata da ElementMedica.\n';
    text += `Gestisci preferenze: ${process.env.FRONTEND_URL || 'https://app.elementmedica.com'}/preferenze-notifiche\n`;

    return text.trim();
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Valida formato email
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Escape HTML per prevenire XSS
   */
  static escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Schiarisce un colore HEX
   */
  static lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;

    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  }
}

export { EmailChannelHandler };
export default EmailChannelHandler;
