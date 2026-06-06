/**
 * Email Service
 * 
 * Centralized email service for Element srl using Nodemailer.
 * Supports SMTP, templates, queue integration, and GDPR compliance.
 * 
 * Features:
 * - Template-based emails (conferma, reminder, referto)
 * - Queue integration for async sending
 * - Multi-tenant support with per-tenant SMTP configuration
 * - GDPR compliant (no PII in logs)
 * - Retry logic with exponential backoff
 * 
 * @module services/emailService
 * @version 2.0.0
 */

import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import { emailQueue } from './queueService.js';
import prisma from '../config/prisma-optimization.js';

// ============================================
// CONFIGURATION
// ============================================

// Shared encryption key for SMTP password decryption (same key used in messaging-routes)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || null;

/**
 * Decrypt AES-256-CBC encrypted SMTP password stored in tenant settings.
 * Returns null if key is not configured or decryption fails.
 */
function decryptSmtpPassword(encrypted) {
  if (!encrypted) return null;
  if (!ENCRYPTION_KEY) {
    logger.warn('ENCRYPTION_KEY not set – cannot decrypt tenant SMTP password', { component: 'EmailService' });
    return null;
  }
  try {
    const textParts = encrypted.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    logger.error('Failed to decrypt SMTP password', { component: 'EmailService', error: err.message });
    return null;
  }
}

/**
 * Build a Nodemailer transporter from a tenant SMTP config object.
 * Used when the tenant has configured their own SMTP in management/config.
 */
function buildTenantTransporter(smtpConfig) {
  const isStarTLS = !smtpConfig.secure && smtpConfig.port !== 465;
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure === true,
    ...(isStarTLS && { requireTLS: true }),
    auth: {
      user: smtpConfig.username,
      pass: decryptSmtpPassword(smtpConfig.password)
    },
    tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

/**
 * Retrieve a tenant-specific SMTP transporter from TenantConfiguration.
 * Falls back to null (global transporter will be used) if not configured.
 * @param {string} tenantId - Tenant ID
 * @param {string} [branchType] - Branch type (FORMAZIONE, CLINICA, default)
 * @returns {Promise<{transport: import('nodemailer').Transporter, fromEmail: string, fromName: string}|null>}
 */
async function getTenantSmtpTransporter(tenantId, branchType) {
  if (!tenantId) return null;
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { settings: true }
    });
    const settings = tenant?.settings && typeof tenant.settings === 'object' ? tenant.settings : {};
    const smtpConfigs = settings.smtp;
    if (!smtpConfigs) return null;

    // Support both legacy (flat) and per-branch (keyed) config shapes
    let config = null;
    if (smtpConfigs.host !== undefined) {
      // Legacy flat structure
      config = smtpConfigs;
    } else {
      // Per-branch structure: try requested branch → 'default'
      const key = branchType ? branchType.toUpperCase() : 'default';
      config = smtpConfigs[key] || smtpConfigs['default'] || null;
    }

    if (!config || config.enabled === false) return null;
    if (!config.host || !config.username || !config.password) return null;

    return {
      transport: buildTenantTransporter(config),
      fromEmail: config.fromEmail || config.username,
      fromName: config.fromName || ''
    };
  } catch (err) {
    logger.error('Failed to load tenant SMTP config', { component: 'EmailService', tenantId, error: err.message });
    return null;
  }
}

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
  MEDICO_POLIAMBULATORIO_NOTIFICA: {
    subject: 'Inserimento in {{clinicName}}',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #233747; background: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0f766e; color: white; padding: 22px; border-radius: 10px 10px 0 0; }
    .content { background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 22px; }
    .box { background: #ecfdf5; border: 1px solid #99f6e4; border-radius: 8px; padding: 14px; margin: 18px 0; }
    .footer { color: #6b7280; font-size: 12px; padding: 16px 0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0; font-size:22px;">Nuovo inserimento in poliambulatorio</h1>
    </div>
    <div class="content">
      <p>Gentile {{doctorName}},</p>
      <p>sei stato inserito tra i medici di <strong>{{clinicName}}</strong>.</p>
      <div class="box">
        Da questo momento, in base ai permessi assegnati, potrai operare nelle funzionalità cliniche collegate a questo poliambulatorio.
      </div>
      <p>Puoi accedere alla piattaforma da: <a href="{{loginUrl}}">{{loginUrl}}</a></p>
      <p style="font-size:12px;color:#6b7280;">Se non riconosci questa operazione, contatta la segreteria del poliambulatorio.</p>
    </div>
    <div class="footer">Comunicazione automatica ElementMedica — Non rispondere a questa email.</div>
  </div>
</body>
</html>
    `,
    text: `
Gentile {{doctorName}},

sei stato inserito tra i medici di {{clinicName}}.

Da questo momento, in base ai permessi assegnati, potrai operare nelle funzionalità cliniche collegate a questo poliambulatorio.

Accesso: {{loginUrl}}

Se non riconosci questa operazione, contatta la segreteria del poliambulatorio.
    `
  },

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
    .header { background: linear-gradient(135deg, #233747 0%, #313F4E 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; width: 150px; color: #666; }
    .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; background: #EDF1EE; border-top: 3px solid #A1C8C1; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; padding: 12px 24px; background: #7FB3AB; color: white; text-decoration: none; border-radius: 4px; }
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
    .header { background: linear-gradient(135deg, #233747 0%, #313F4E 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .highlight { background: #ECF4F3; padding: 15px; border-radius: 4px; border-left: 4px solid #A1C8C1; margin: 15px 0; }
    .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; background: #EDF1EE; border-top: 3px solid #A1C8C1; border-radius: 0 0 8px 8px; }
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
    .header { background: linear-gradient(135deg, #233747 0%, #313F4E 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .info-box { background: #ECF4F3; padding: 15px; border-radius: 4px; border-left: 4px solid #A1C8C1; margin: 15px 0; }
    .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; background: #EDF1EE; border-top: 3px solid #A1C8C1; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; padding: 12px 24px; background: #7FB3AB; color: white; text-decoration: none; border-radius: 4px; }
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
    .header { background: linear-gradient(135deg, #233747 0%, #313F4E 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .amount { font-size: 24px; font-weight: bold; color: #5F9B92; text-align: center; margin: 20px 0; }
    .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; background: #EDF1EE; border-top: 3px solid #A1C8C1; border-radius: 0 0 8px 8px; }
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
      <p style="color: #5F9B92; text-align: center;">✓ Pagamento già effettuato</p>
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

  // Fattura Elettronica - invio PDF al cliente (P97)
  FATTURA_ELETTRONICA: {
    subject: '{{subject}}',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f9fafb;margin:0;padding:0;}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);}
  .hd{background:linear-gradient(135deg,#233747,#313F4E);color:#fff;padding:28px 24px;text-align:center;}
  .hd h1{margin:0;font-size:22px;}
  .hd p{margin:6px 0 0;opacity:.9;font-size:14px;}
  .bd{padding:28px 24px;}
  .box{background:#ECF4F3;border:1px solid #A1C8C1;border-radius:8px;padding:16px;margin:20px 0;text-align:center;}
  .box .num{font-size:20px;font-weight:800;color:#5F9B92;}
  .box .tot{font-size:16px;color:#374151;margin-top:4px;}
  .note{font-size:13px;color:#666;line-height:1.7;white-space:pre-line;}
  .att{background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin:20px 0;font-size:13px;color:#78350f;}
  .footer{text-align:center;padding:16px 24px;font-size:12px;color:#999;border-top:1px solid #e5e7eb;}
</style>
</head>
<body>
<div class="wrap">
  <div class="hd">
    <h1>📄 {{tipoLabel}}</h1>
    <p>{{cedenteDenominazione}}</p>
  </div>
  <div class="bd">
    <p>Gentile <strong>{{cessionarioDenominazione}}</strong>,</p>
    <div class="box">
      <div class="num">N. {{numero}}</div>
      <div class="tot">{{dataEmissione}} · <strong>{{totale}}</strong></div>
    </div>
    <p class="note">{{bodyText}}</p>
    <div class="att">📎 Il documento PDF è allegato a questa email.</div>
  </div>
  <div class="footer">{{cedenteDenominazione}}</div>
</div>
</body>
</html>`,
    text: `{{tipoLabel}} N. {{numero}} del {{dataEmissione}}\n\n{{bodyText}}\n\nDocumento PDF allegato.\n\n{{cedenteDenominazione}}`
  },

  // Generic notification
  NOTIFICA_GENERICA: {
    subject: '{{subject}}',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;}
  .container{max-width:600px;margin:0 auto;padding:20px;}
  .header{background:linear-gradient(135deg,#233747 0%,#313F4E 100%);color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;}
  .content{background:#f9fafb;padding:20px;border:1px solid #e5e7eb;}
  .footer{text-align:center;padding:15px;color:#666;font-size:12px;background:#EDF1EE;border-top:3px solid #A1C8C1;border-radius:0 0 8px 8px;}
</style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>{{title}}</h1></div>
    <div class="content">{{{body}}}</div>
    <div class="footer"><p>{{clinicName}}</p><p>{{clinicPhone}} - {{clinicEmail}}</p></div>
  </div>
</body>
</html>`,
    text: `{{textBody}}`
  },

  // Welcome email with credentials for new accounts
  BENVENUTO_ACCOUNT: {
    subject: 'Benvenuto in {{organizationName}} - Le tue credenziali di accesso',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #233747 0%, #313F4E 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { background: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; }
    .welcome-text { font-size: 16px; margin-bottom: 25px; }
    .credentials-box { background: white; border: 2px solid #A1C8C1; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .credentials-box h3 { color: #5F9B92; margin: 0 0 15px; font-size: 18px; }
    .credential-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .credential-row:last-child { border-bottom: none; }
    .credential-label { font-weight: 600; color: #666; width: 120px; flex-shrink: 0; }
    .credential-value { font-family: 'Courier New', monospace; font-size: 15px; color: #1f2937; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; }
    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .warning-box strong { color: #92400e; }
    .btn { display: inline-block; padding: 14px 28px; background: #7FB3AB; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .btn:hover { background: #0f766e; }
    .steps { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .steps h4 { color: #374151; margin: 0 0 15px; }
    .steps ol { margin: 0; padding-left: 20px; }
    .steps li { padding: 8px 0; color: #4b5563; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #EDF1EE; border-top: 3px solid #A1C8C1; border-radius: 0 0 8px 8px; }
    .footer a { color: #5F9B92; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Benvenuto!</h1>
      <p>Il tuo account è stato creato con successo</p>
    </div>
    <div class="content">
      <p class="welcome-text">Gentile <strong>{{fullName}}</strong>,</p>
      <p>È stato creato un account per te su <strong>{{organizationName}}</strong>. Di seguito trovi le credenziali per accedere al sistema.</p>
      
      <div class="credentials-box">
        <h3>🔐 Le tue credenziali</h3>
        <div class="credential-row">
          <span class="credential-label">Username:</span>
          <span class="credential-value">{{username}}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">Password:</span>
          <span class="credential-value">{{temporaryPassword}}</span>
        </div>
      </div>
      
      <div class="warning-box">
        <strong>⚠️ Importante:</strong> Questa è una password temporanea. Al primo accesso ti verrà richiesto di cambiarla con una password personale.
      </div>
      
      <p style="text-align: center;">
        <a href="{{loginUrl}}" class="btn">Accedi al Portale →</a>
      </p>
      
      <div class="steps">
        <h4>📋 Come accedere:</h4>
        <ol>
          <li>Clicca sul pulsante "Accedi al Portale" qui sopra</li>
          <li>Inserisci il tuo username: <strong>{{username}}</strong></li>
          <li>Inserisci la password temporanea</li>
          <li>Crea una nuova password personale (minimo 8 caratteri)</li>
          <li>Completa il tuo profilo</li>
        </ol>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        Se hai problemi ad accedere o hai bisogno di assistenza, contatta il tuo responsabile o rispondi a questa email.
      </p>
    </div>
    <div class="footer">
      <p><strong>{{organizationName}}</strong></p>
      {{#if supportEmail}}<p>Supporto: <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>{{/if}}
      {{#if supportPhone}}<p>Telefono: {{supportPhone}}</p>{{/if}}
      <p style="font-size: 10px; color: #999; margin-top: 15px;">
        Questo messaggio è stato generato automaticamente. Le credenziali sono strettamente personali e non devono essere condivise.
      </p>
    </div>
  </div>
</body>
</html>
    `,
    text: `
Benvenuto in {{organizationName}}!

Gentile {{fullName}},

È stato creato un account per te. Di seguito trovi le credenziali per accedere al sistema.

LE TUE CREDENZIALI
==================
Username: {{username}}
Password: {{temporaryPassword}}

IMPORTANTE: Questa è una password temporanea. Al primo accesso ti verrà richiesto di cambiarla.

COME ACCEDERE
=============
1. Vai su: {{loginUrl}}
2. Inserisci il tuo username: {{username}}
3. Inserisci la password temporanea
4. Crea una nuova password personale (minimo 8 caratteri)
5. Completa il tuo profilo

Se hai problemi ad accedere, contatta il supporto.

{{organizationName}}
{{#if supportEmail}}Supporto: {{supportEmail}}{{/if}}
{{#if supportPhone}}Telefono: {{supportPhone}}{{/if}}
    `
  },

  // P66 MDL - Giudizio di Idoneità notification (lavoratore + azienda)
  GIUDIZIO_IDONEITA_NOTIFICA: {
    subject: 'Giudizio di Idoneità - {{lavoratoreName}} — {{clinicName}}',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0f766e 0%, #134e4a 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #0f766e; }
    .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; width: 180px; color: #555; flex-shrink: 0; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; }
    .badge-idoneo { background: #dcfce7; color: #166534; }
    .badge-prescrizioni { background: #fef9c3; color: #854d0e; }
    .badge-limitazioni { background: #ffedd5; color: #9a3412; }
    .badge-non-idoneo { background: #fee2e2; color: #991b1b; }
    .section-title { font-weight: bold; color: #0f766e; margin-top: 15px; }
    .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; background: #f0fdfa; border-top: 3px solid #0f766e; border-radius: 0 0 8px 8px; }
    pre { white-space: pre-wrap; word-break: break-word; font-family: Arial, sans-serif; margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Giudizio di Idoneità alla Mansione</h1>
      <p style="margin:0; opacity:0.85;">Sorveglianza Sanitaria — D.Lgs. 81/08</p>
    </div>
    <div class="content">
      <p>Gentile {{recipientName}},</p>
      <p>Le comunichiamo l'esito della visita medica del <strong>{{dataVisita}}</strong>.</p>

      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Lavoratore:</span>
          <span>{{lavoratoreName}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Mansione:</span>
          <span>{{mansione}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Medico Competente:</span>
          <span>{{medicoName}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Data visita:</span>
          <span>{{dataVisita}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Giudizio:</span>
          <span><span class="badge {{badgeClass}}">{{giudizioLabel}}</span></span>
        </div>
        {{#if dataScadenza}}
        <div class="detail-row">
          <span class="detail-label">Prossima visita:</span>
          <span>{{dataScadenza}}</span>
        </div>
        {{/if}}
      </div>

      {{#if prescrizioniIdoneita}}
      <p class="section-title">📋 Prescrizioni:</p>
      <pre>{{prescrizioniIdoneita}}</pre>
      {{/if}}

      {{#if limitazioni}}
      <p class="section-title">⚠️ Limitazioni:</p>
      <pre>{{limitazioni}}</pre>
      {{/if}}

      <p style="margin-top:20px; color:#555; font-size:13px;">
        Ai sensi dell'art. 41 c.9 D.Lgs. 81/08, avverso il presente giudizio è ammesso ricorso entro 30 giorni
        dalla data di comunicazione all'organo di vigilanza (ASL) territorialmente competente.
      </p>
    </div>
    <div class="footer">
      <p>{{clinicName}}{{#if clinicPhone}} — {{clinicPhone}}{{/if}}</p>
      {{#if clinicEmail}}<p>{{clinicEmail}}</p>{{/if}}
      <p style="font-size: 10px; color: #999;">Comunicazione automatica D.Lgs. 81/08 — Non rispondere a questa email.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `
Giudizio di Idoneità alla Mansione — D.Lgs. 81/08

Gentile {{recipientName}},

Le comunichiamo l'esito della visita medica del {{dataVisita}}.

LAVORATORE: {{lavoratoreName}}
MANSIONE: {{mansione}}
MEDICO COMPETENTE: {{medicoName}}
DATA VISITA: {{dataVisita}}
GIUDIZIO: {{giudizioLabel}}
{{#if dataScadenza}}PROSSIMA VISITA: {{dataScadenza}}{{/if}}

{{#if prescrizioniIdoneita}}
PRESCRIZIONI:
{{prescrizioniIdoneita}}
{{/if}}

{{#if limitazioni}}
LIMITAZIONI:
{{limitazioni}}
{{/if}}

Ai sensi dell'art. 41 c.9 D.Lgs. 81/08, avverso il presente giudizio è ammesso ricorso entro 30 giorni
dalla data di comunicazione all'organo di vigilanza (ASL) territorialmente competente.

{{clinicName}}
{{clinicPhone}}
{{clinicEmail}}
    `
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
   * @param {string} options.template - Template name
   * @param {Object} options.data - Template data
   * @param {Array} options.attachments - Optional attachments
   * @param {string} options.tenantId - Tenant ID for multi-tenancy (used to load tenant SMTP config)
   * @param {string} [options.branchType] - Branch type hint (FORMAZIONE|CLINICA|default) for SMTP selection
   * @returns {Promise<Object>} Send result
   */
  static async send({ to, template, data, attachments = [], tenantId, branchType }) {
    try {
      const templateDef = EMAIL_TEMPLATES[template];

      if (!templateDef) {
        throw new Error(`Email template '${template}' not found`);
      }

      // Resolve transporter: tenant-specific SMTP > global env SMTP
      let transport = null;
      let tenantFromEmail = null;
      let tenantFromName = null;
      if (tenantId) {
        try {
          const tenantSmtp = await getTenantSmtpTransporter(tenantId, branchType || data?.branchType);
          if (tenantSmtp) {
            transport = tenantSmtp.transport;
            tenantFromEmail = tenantSmtp.fromEmail;
            tenantFromName = tenantSmtp.fromName;
            logger.info('Using tenant SMTP config', { component: 'EmailService', tenantId });
          }
        } catch (smtpLookupError) {
          logger.warn('Tenant SMTP lookup failed, falling back to global', {
            component: 'EmailService', tenantId, error: smtpLookupError.message
          });
        }
      }
      if (!transport) {
        transport = getTransporter();
      }

      // Get sender: tenant SMTP config > template data > env > default
      const fromEmail = tenantFromEmail || data.clinicEmail || process.env.SMTP_FROM || 'noreply@element-srl.it';
      const fromName = tenantFromName || data.clinicName || 'Element srl';

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
        code: error.responseCode || error.code,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Queue email for async sending.
   * Falls back to direct send when Redis is disabled (REDIS_ENABLED != 'true')
   * so emails work in development without a Redis dependency.
   * @param {Object} options - Same as send()
   * @param {Object} queueOptions - Queue options (delay, priority)
   * @returns {Promise<Object>} Job info or send result
   */
  static async queue({ to, template, data, attachments = [], tenantId, branchType }, queueOptions = {}) {
    // Bypass Bull queue entirely when Redis is not enabled (dev / no-redis environments)
    if (process.env.REDIS_ENABLED !== 'true') {
      logger.info('Redis disabled – sending email directly (no queue)', {
        component: 'EmailService',
        action: 'queue→direct',
        template,
        tenantId
      });
      return this.send({ to, template, data, attachments, tenantId, branchType });
    }

    try {
      const job = await emailQueue.add(
        {
          to,
          template,
          data,
          attachments,
          tenantId,
          branchType
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
      logger.error('Failed to queue email – falling back to direct send', {
        component: 'EmailService',
        action: 'queue',
        template,
        error: error.message,
        tenantId
      });
      // Fallback: try direct send so the email reaches the user even if queue fails
      return this.send({ to, template, data, attachments, tenantId, branchType });
    }
  }

  /**
   * Send appointment confirmation email
   */
  static async sendAppointmentConfirmation(appointment, patient, clinic, tenantId) {
    const data = {
      patientName: `${patient.firstName} ${patient.lastName}`,
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
      doctorName: appointment.medico ? `${appointment.medico.gender === 'FEMALE' ? 'Dott.ssa' : 'Dott.'} ${appointment.medico.lastName}` : 'Da assegnare',
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
      patientName: `${patient.firstName} ${patient.lastName}`,
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
      doctorName: appointment.medico ? `${appointment.medico.gender === 'FEMALE' ? 'Dott.ssa' : 'Dott.'} ${appointment.medico.lastName}` : '',
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
      patientName: `${patient.firstName} ${patient.lastName}`,
      clinicName: clinic.name || clinic.ragioneSociale,
      clinicPhone: clinic.phone || clinic.telefono,
      clinicEmail: clinic.email,
      visitDate: new Date(visita.dataOra).toLocaleDateString('it-IT'),
      serviceName: visita.prestazione?.nome || 'Visita medica',
      doctorName: visita.medico ? `${visita.medico.gender === 'FEMALE' ? 'Dott.ssa' : 'Dott.'} ${visita.medico.lastName}` : '',
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
      patientName: `${patient.firstName} ${patient.lastName}`,
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
   * Send welcome email with credentials for new account
   * @param {Object} person - Person data with firstName, lastName, email, username
   * @param {string} temporaryPassword - The temporary password (plain text)
   * @param {Object} organization - Organization data with name, supportEmail, supportPhone
   * @param {string} loginUrl - URL for login page
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Send result
   */
  static async sendWelcomeCredentials(person, temporaryPassword, organization, loginUrl, tenantId) {
    if (!person.email) {
      logger.warn('Cannot send welcome email - no email address', {
        component: 'EmailService',
        action: 'sendWelcomeCredentials',
        personId: person.id
      });
      return { success: false, reason: 'no_email' };
    }

    const data = {
      fullName: `${person.firstName} ${person.lastName}`,
      username: person.username || person.email,
      temporaryPassword,
      organizationName: organization.name || organization.ragioneSociale || 'Element srl',
      supportEmail: organization.supportEmail || organization.email,
      supportPhone: organization.supportPhone || organization.phone,
      loginUrl: loginUrl || process.env.FRONTEND_URL || 'http://localhost:5173'
    };

    return this.queue({
      to: person.email,
      template: 'BENVENUTO_ACCOUNT',
      data,
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
  const { to, template, data, attachments, tenantId, branchType } = job.data;

  try {
    const result = await EmailService.send({
      to,
      template,
      data,
      attachments,
      tenantId,
      branchType
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
