/**
 * Email Service
 * 
 * Centralized email service for ElementMedica using Nodemailer.
 * Supports SMTP, templates, queue integration, and GDPR compliance.
 * 
 * Features:
 * - Template-based emails (conferma, reminder, referto)
 * - Queue integration for async sending
 * - Multi-tenant support
 * - GDPR compliant (no PII in logs)
 * - Retry logic with exponential backoff
 * 
 * @module services/emailService
 * @version 1.0.0
 */

import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import { emailQueue } from './queueService.js';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Create SMTP transporter based on environment
 */
const createTransporter = () => {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
        // Production: Use configured SMTP
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            pool: true, // Use pooled connections
            maxConnections: 5,
            maxMessages: 100,
            rateDelta: 1000, // 1 second between sends
            rateLimit: 5, // 5 emails per rateDelta
        });
    } else {
        // Development: Use Ethereal (fake SMTP for testing)
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER || 'test@ethereal.email',
                pass: process.env.SMTP_PASS || 'testpassword'
            }
        });
    }
};

let transporter = null;

/**
 * Get or create transporter (lazy initialization)
 */
const getTransporter = () => {
    if (!transporter) {
        transporter = createTransporter();

        // Verify connection on first use
        transporter.verify((error) => {
            if (error) {
                logger.warn('SMTP connection not available', {
                    component: 'EmailService',
                    error: error.message
                });
            } else {
                logger.info('SMTP connection ready', {
                    component: 'EmailService',
                    host: process.env.SMTP_HOST || 'smtp.ethereal.email'
                });
            }
        });
    }
    return transporter;
};

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * Email template definitions
 */
const EMAIL_TEMPLATES = {
    // Appointment confirmation
    CONFERMA_APPUNTAMENTO: {
        subject: 'Conferma Appuntamento - {{clinicName}}',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; width: 150px; color: #666; }
    .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
    .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Appuntamento Confermato</h1>
    </div>
    <div class="content">
      <p>Gentile {{patientName}},</p>
      <p>Il suo appuntamento presso <strong>{{clinicName}}</strong> è stato confermato.</p>
      
      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Data:</span>
          <span>{{appointmentDate}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Ora:</span>
          <span>{{appointmentTime}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Prestazione:</span>
          <span>{{serviceName}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Medico:</span>
          <span>{{doctorName}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Sede:</span>
          <span>{{clinicAddress}}</span>
        </div>
      </div>
      
      <p><strong>Note importanti:</strong></p>
      <ul>
        <li>Si presenti 15 minuti prima dell'appuntamento</li>
        <li>Porti con sé un documento d'identità e tessera sanitaria</li>
        {{#if preparationNotes}}<li>{{preparationNotes}}</li>{{/if}}
      </ul>
      
      <p style="margin-top: 20px;">
        Per disdire o modificare l'appuntamento, la preghiamo di contattarci con almeno 24 ore di anticipo.
      </p>
    </div>
    <div class="footer">
      <p>{{clinicName}} - {{clinicPhone}}</p>
      <p>{{clinicEmail}}</p>
      <p style="font-size: 10px; color: #999;">
        Questa email è stata generata automaticamente. Non rispondere a questo indirizzo.
      </p>
    </div>
  </div>
</body>
</html>
    `,
        text: `
Gentile {{patientName}},

Il suo appuntamento presso {{clinicName}} è stato confermato.

DETTAGLI APPUNTAMENTO:
- Data: {{appointmentDate}}
- Ora: {{appointmentTime}}
- Prestazione: {{serviceName}}
- Medico: {{doctorName}}
- Sede: {{clinicAddress}}

NOTE IMPORTANTI:
- Si presenti 15 minuti prima dell'appuntamento
- Porti con sé un documento d'identità e tessera sanitaria

Per disdire o modificare l'appuntamento, la preghiamo di contattarci con almeno 24 ore di anticipo.

{{clinicName}}
{{clinicPhone}}
{{clinicEmail}}
    `
    },

    // Appointment reminder
    REMINDER_APPUNTAMENTO: {
        subject: 'Promemoria Appuntamento - {{clinicName}}',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .highlight { background: #fef3c7; padding: 15px; border-radius: 4px; border-left: 4px solid #f59e0b; margin: 15px 0; }
    .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Promemoria Appuntamento</h1>
    </div>
    <div class="content">
      <p>Gentile {{patientName}},</p>
      <p>Le ricordiamo che ha un appuntamento {{reminderText}}.</p>
      
      <div class="highlight">
        <strong>📅 {{appointmentDate}} alle ore {{appointmentTime}}</strong><br>
        <strong>📍 {{clinicAddress}}</strong><br>
        <strong>🏥 {{serviceName}}</strong> con {{doctorName}}
      </div>
      
      <p>
        In caso di impedimento, la preghiamo di contattarci per disdire o riprogrammare.
      </p>
    </div>
    <div class="footer">
      <p>{{clinicName}} - {{clinicPhone}}</p>
    </div>
  </div>
</body>
</html>
    `,
        text: `
Gentile {{patientName}},

Le ricordiamo che ha un appuntamento {{reminderText}}.

Data: {{appointmentDate}} alle ore {{appointmentTime}}
Sede: {{clinicAddress}}
Prestazione: {{serviceName}} con {{doctorName}}

In caso di impedimento, la preghiamo di contattarci per disdire o riprogrammare.

{{clinicName}} - {{clinicPhone}}
    `
    },

    // Report/Referto ready
    REFERTO_DISPONIBILE: {
        subject: 'Referto Disponibile - {{clinicName}}',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .info-box { background: #d1fae5; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
    .btn { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Referto Disponibile</h1>
    </div>
    <div class="content">
      <p>Gentile {{patientName}},</p>
      <p>Le comunichiamo che il referto relativo alla prestazione <strong>{{serviceName}}</strong> 
         del {{visitDate}} è ora disponibile.</p>
      
      <div class="info-box">
        <p><strong>Medico:</strong> {{doctorName}}</p>
        <p><strong>Data Visita:</strong> {{visitDate}}</p>
        <p><strong>Prestazione:</strong> {{serviceName}}</p>
      </div>
      
      <p>Può ritirare il referto presso la nostra sede oppure, se ha attivato il servizio online, 
         accedere all'area riservata del nostro portale.</p>
      
      {{#if portalUrl}}
      <p style="text-align: center; margin: 20px 0;">
        <a href="{{portalUrl}}" class="btn">Accedi al Portale</a>
      </p>
      {{/if}}
      
      <p style="font-size: 12px; color: #666;">
        Per qualsiasi chiarimento sul referto, non esiti a contattare il nostro ambulatorio.
      </p>
    </div>
    <div class="footer">
      <p>{{clinicName}}</p>
      <p>{{clinicPhone}} - {{clinicEmail}}</p>
    </div>
  </div>
</body>
</html>
    `,
        text: `
Gentile {{patientName}},

Le comunichiamo che il referto relativo alla prestazione {{serviceName}} del {{visitDate}} è ora disponibile.

Medico: {{doctorName}}
Data Visita: {{visitDate}}
Prestazione: {{serviceName}}

Può ritirare il referto presso la nostra sede oppure, se ha attivato il servizio online, accedere all'area riservata del nostro portale.

Per qualsiasi chiarimento sul referto, non esiti a contattare il nostro ambulatorio.

{{clinicName}}
{{clinicPhone}} - {{clinicEmail}}
    `
    },

    // Invoice/Fattura notification
    FATTURA_EMESSA: {
        subject: 'Fattura N. {{invoiceNumber}} - {{clinicName}}',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .amount { font-size: 24px; font-weight: bold; color: #6366f1; text-align: center; margin: 20px 0; }
    .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Fattura Emessa</h1>
    </div>
    <div class="content">
      <p>Gentile {{patientName}},</p>
      <p>Le comunichiamo che è stata emessa la fattura relativa alle prestazioni ricevute.</p>
      
      <p><strong>Fattura N.:</strong> {{invoiceNumber}}</p>
      <p><strong>Data:</strong> {{invoiceDate}}</p>
      
      <div class="amount">
        € {{totalAmount}}
      </div>
      
      {{#if isPaid}}
      <p style="color: #10b981; text-align: center;">✓ Pagamento già effettuato</p>
      {{else}}
      <p>La fattura è disponibile in allegato. Per il pagamento può utilizzare i seguenti metodi:</p>
      <ul>
        <li>Pagamento presso la nostra sede</li>
        <li>Bonifico bancario IBAN: {{iban}}</li>
      </ul>
      {{/if}}
    </div>
    <div class="footer">
      <p>{{clinicName}}</p>
      <p>{{clinicPhone}} - {{clinicEmail}}</p>
    </div>
  </div>
</body>
</html>
    `,
        text: `
Gentile {{patientName}},

Le comunichiamo che è stata emessa la fattura relativa alle prestazioni ricevute.

Fattura N.: {{invoiceNumber}}
Data: {{invoiceDate}}
Importo: € {{totalAmount}}

{{#if isPaid}}
Pagamento già effettuato.
{{else}}
Per il pagamento può utilizzare i seguenti metodi:
- Pagamento presso la nostra sede
- Bonifico bancario IBAN: {{iban}}
{{/if}}

{{clinicName}}
{{clinicPhone}} - {{clinicEmail}}
    `
    },

    // Generic notification
    NOTIFICA_GENERICA: {
        subject: '{{subject}}',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{title}}</h1>
    </div>
    <div class="content">
      {{{body}}}
    </div>
    <div class="footer">
      <p>{{clinicName}}</p>
      <p>{{clinicPhone}} - {{clinicEmail}}</p>
    </div>
  </div>
</body>
</html>
    `,
        text: `{{textBody}}`
    }
};

// ============================================
// TEMPLATE PROCESSING
// ============================================

/**
 * Simple template variable replacement
 * Supports {{variable}} and {{#if condition}}...{{/if}} blocks
 */
const processTemplate = (template, data) => {
    let result = template;

    // Process if blocks (simple version)
    result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
        return data[condition] ? content : '';
    });

    // Replace variables (support both {{var}} and {{{var}}} for unescaped)
    result = result.replace(/\{\{\{?(\w+)\}?\}\}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : '';
    });

    return result;
};

// ============================================
// EMAIL SERVICE CLASS
// ============================================

export class EmailService {

    /**
     * Send email directly (synchronous)
     * @param {Object} options - Email options
     * @param {string} options.to - Recipient email
     * @param {string} options.template - Template name (CONFERMA_APPUNTAMENTO, REMINDER_APPUNTAMENTO, etc.)
     * @param {Object} options.data - Template data
     * @param {Array} options.attachments - Optional attachments
     * @param {string} options.tenantId - Tenant ID for multi-tenancy
     * @returns {Promise<Object>} Send result
     */
    static async send({ to, template, data, attachments = [], tenantId }) {
        try {
            const templateDef = EMAIL_TEMPLATES[template];

            if (!templateDef) {
                throw new Error(`Email template '${template}' not found`);
            }

            // Get tenant configuration for sender
            const fromEmail = data.clinicEmail || process.env.SMTP_FROM || 'noreply@elementmedica.it';
            const fromName = data.clinicName || 'ElementMedica';

            // Process templates
            const subject = processTemplate(templateDef.subject, data);
            const html = processTemplate(templateDef.html, data);
            const text = processTemplate(templateDef.text, data);

            const mailOptions = {
                from: `"${fromName}" <${fromEmail}>`,
                to,
                subject,
                html,
                text,
                attachments: attachments.map(att => ({
                    filename: att.filename,
                    content: att.content,
                    contentType: att.contentType,
                    path: att.path // For file attachments
                }))
            };

            const transport = getTransporter();
            const result = await transport.sendMail(mailOptions);

            logger.info('Email sent successfully', {
                component: 'EmailService',
                action: 'send',
                template,
                to: to.substring(0, 3) + '***', // GDPR: mask email
                messageId: result.messageId,
                tenantId
            });

            return {
                success: true,
                messageId: result.messageId
            };
        } catch (error) {
            logger.error('Failed to send email', {
                component: 'EmailService',
                action: 'send',
                template,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Queue email for async sending
     * @param {Object} options - Same as send()
     * @param {Object} queueOptions - Queue options (delay, priority)
     * @returns {Promise<Object>} Job info
     */
    static async queue({ to, template, data, attachments = [], tenantId }, queueOptions = {}) {
        try {
            const job = await emailQueue.add(
                {
                    to,
                    template,
                    data,
                    attachments,
                    tenantId
                },
                {
                    delay: queueOptions.delay || 0,
                    priority: queueOptions.priority || 5,
                    attempts: queueOptions.attempts || 5
                }
            );

            logger.info('Email queued', {
                component: 'EmailService',
                action: 'queue',
                jobId: job.id,
                template,
                tenantId
            });

            return {
                success: true,
                jobId: job.id,
                queued: true
            };
        } catch (error) {
            logger.error('Failed to queue email', {
                component: 'EmailService',
                action: 'queue',
                template,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Send appointment confirmation email
     */
    static async sendAppointmentConfirmation(appointment, patient, clinic, tenantId) {
        const data = {
            patientName: `${patient.nome} ${patient.cognome}`,
            clinicName: clinic.name || clinic.ragioneSociale,
            clinicAddress: clinic.address || clinic.indirizzo,
            clinicPhone: clinic.phone || clinic.telefono,
            clinicEmail: clinic.email,
            appointmentDate: new Date(appointment.dataOra).toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            appointmentTime: new Date(appointment.dataOra).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            serviceName: appointment.prestazione?.nome || 'Visita medica',
            doctorName: appointment.medico ? `Dr. ${appointment.medico.cognome}` : 'Da assegnare',
            preparationNotes: appointment.notePreparazione
        };

        return this.queue({
            to: patient.email,
            template: 'CONFERMA_APPUNTAMENTO',
            data,
            tenantId
        });
    }

    /**
     * Send appointment reminder email
     * @param {string} reminderType - 'tomorrow', '3days', 'week'
     */
    static async sendAppointmentReminder(appointment, patient, clinic, reminderType, tenantId) {
        const reminderTexts = {
            tomorrow: 'domani',
            '3days': 'tra 3 giorni',
            week: 'la prossima settimana'
        };

        const data = {
            patientName: `${patient.nome} ${patient.cognome}`,
            clinicName: clinic.name || clinic.ragioneSociale,
            clinicAddress: clinic.address || clinic.indirizzo,
            clinicPhone: clinic.phone || clinic.telefono,
            appointmentDate: new Date(appointment.dataOra).toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            }),
            appointmentTime: new Date(appointment.dataOra).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            serviceName: appointment.prestazione?.nome || 'Visita medica',
            doctorName: appointment.medico ? `Dr. ${appointment.medico.cognome}` : '',
            reminderText: reminderTexts[reminderType] || reminderType
        };

        return this.queue({
            to: patient.email,
            template: 'REMINDER_APPUNTAMENTO',
            data,
            tenantId
        });
    }

    /**
     * Send referto available notification
     */
    static async sendRefertoNotification(visita, referto, patient, clinic, tenantId) {
        const data = {
            patientName: `${patient.nome} ${patient.cognome}`,
            clinicName: clinic.name || clinic.ragioneSociale,
            clinicPhone: clinic.phone || clinic.telefono,
            clinicEmail: clinic.email,
            visitDate: new Date(visita.dataVisita).toLocaleDateString('it-IT'),
            serviceName: visita.prestazione?.nome || 'Visita medica',
            doctorName: visita.medico ? `Dr. ${visita.medico.cognome}` : '',
            portalUrl: clinic.portalUrl || null
        };

        return this.queue({
            to: patient.email,
            template: 'REFERTO_DISPONIBILE',
            data,
            tenantId
        });
    }

    /**
     * Send invoice notification
     */
    static async sendInvoiceNotification(fattura, patient, clinic, tenantId, pdfAttachment = null) {
        const data = {
            patientName: `${patient.nome} ${patient.cognome}`,
            clinicName: clinic.name || clinic.ragioneSociale,
            clinicPhone: clinic.phone || clinic.telefono,
            clinicEmail: clinic.email,
            invoiceNumber: fattura.numeroFattura,
            invoiceDate: new Date(fattura.dataEmissione).toLocaleDateString('it-IT'),
            totalAmount: Number(fattura.totaleConIva).toFixed(2),
            isPaid: fattura.stato === 'PAGATA',
            iban: clinic.iban || ''
        };

        const attachments = [];
        if (pdfAttachment) {
            attachments.push({
                filename: `Fattura_${fattura.numeroFattura}.pdf`,
                content: pdfAttachment,
                contentType: 'application/pdf'
            });
        }

        return this.queue({
            to: patient.email,
            template: 'FATTURA_EMESSA',
            data,
            attachments,
            tenantId
        });
    }

    /**
     * Get available templates
     */
    static getTemplates() {
        return Object.keys(EMAIL_TEMPLATES);
    }

    /**
     * Preview template with sample data
     */
    static previewTemplate(templateName, data = {}) {
        const template = EMAIL_TEMPLATES[templateName];
        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        return {
            subject: processTemplate(template.subject, data),
            html: processTemplate(template.html, data),
            text: processTemplate(template.text, data)
        };
    }
}

// ============================================
// QUEUE PROCESSOR
// ============================================

/**
 * Process email jobs from queue
 */
emailQueue.process(async (job) => {
    const { to, template, data, attachments, tenantId } = job.data;

    try {
        const result = await EmailService.send({
            to,
            template,
            data,
            attachments,
            tenantId
        });

        return result;
    } catch (error) {
        logger.error('Email queue job failed', {
            component: 'EmailService',
            action: 'process',
            jobId: job.id,
            template,
            error: error.message,
            attempt: job.attemptsMade
        });
        throw error; // Retry
    }
});

export default EmailService;
