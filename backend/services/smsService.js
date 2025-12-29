/**
 * SMS/WhatsApp Service
 * 
 * Centralized messaging service for ElementMedica using Twilio.
 * Supports SMS and WhatsApp Business API for appointment notifications.
 * 
 * Features:
 * - SMS sending via Twilio
 * - WhatsApp Business API integration
 * - Template-based messages
 * - Queue integration for async sending
 * - Multi-tenant support
 * - GDPR compliant (opt-out management)
 * 
 * @module services/smsService
 * @version 1.0.0
 */

import twilio from 'twilio';
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Twilio client configuration
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */
let twilioClient = null;

const getTwilioClient = () => {
    if (!twilioClient) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;

        if (!accountSid || !authToken) {
            logger.warn('Twilio credentials not configured', {
                component: 'SMSService',
                action: 'getTwilioClient'
            });
            return null;
        }

        twilioClient = twilio(accountSid, authToken);
    }
    return twilioClient;
};

// Default sender numbers
const getFromNumber = (type = 'sms') => {
    if (type === 'whatsapp') {
        return `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER}`;
    }
    return process.env.TWILIO_PHONE_NUMBER;
};

// ============================================
// MESSAGE TEMPLATES
// ============================================

/**
 * SMS/WhatsApp message templates
 * Keep messages short for SMS (160 chars limit)
 */
const MESSAGE_TEMPLATES = {
    // Appointment confirmation
    CONFERMA_APPUNTAMENTO: {
        sms: `{{clinicName}}: Appuntamento confermato per {{appointmentDate}} ore {{appointmentTime}}. Prestazione: {{serviceName}}. Per info: {{clinicPhone}}`,
        whatsapp: `✅ *Appuntamento Confermato*

Gentile {{patientName}},

📅 *{{appointmentDate}}* alle *{{appointmentTime}}*
🏥 {{serviceName}}
👨‍⚕️ {{doctorName}}
📍 {{clinicAddress}}

Si presenti 15 minuti prima.

Per disdire: {{clinicPhone}}

_{{clinicName}}_`
    },

    // Appointment reminder
    REMINDER_APPUNTAMENTO: {
        sms: `{{clinicName}}: Promemoria appuntamento {{reminderText}} - {{appointmentDate}} ore {{appointmentTime}}. Info: {{clinicPhone}}`,
        whatsapp: `⏰ *Promemoria Appuntamento*

Gentile {{patientName}},

Il suo appuntamento è {{reminderText}}!

📅 *{{appointmentDate}}* ore *{{appointmentTime}}*
🏥 {{serviceName}}
📍 {{clinicAddress}}

In caso di impedimento, ci contatti.

_{{clinicName}}_ - {{clinicPhone}}`
    },

    // Report ready
    REFERTO_DISPONIBILE: {
        sms: `{{clinicName}}: Il suo referto del {{visitDate}} è disponibile. Può ritirarlo presso la nostra sede o accedere al portale.`,
        whatsapp: `📋 *Referto Disponibile*

Gentile {{patientName}},

Il referto della visita del {{visitDate}} è ora disponibile.

🏥 {{serviceName}}
👨‍⚕️ {{doctorName}}

Può ritirarlo presso la nostra sede o accedere al portale pazienti.

_{{clinicName}}_`
    },

    // Invoice notification
    FATTURA_DISPONIBILE: {
        sms: `{{clinicName}}: Fattura n.{{invoiceNumber}} del {{invoiceDate}} - €{{totalAmount}}. Info: {{clinicPhone}}`,
        whatsapp: `🧾 *Fattura Emessa*

Gentile {{patientName}},

È stata emessa la fattura per le prestazioni ricevute.

📄 Fattura N. *{{invoiceNumber}}*
📅 {{invoiceDate}}
💶 *€{{totalAmount}}*

{{#if isPaid}}✅ Pagamento già effettuato{{/if}}

_{{clinicName}}_`
    },

    // Generic notification
    NOTIFICA_GENERICA: {
        sms: `{{clinicName}}: {{message}}`,
        whatsapp: `{{message}}

_{{clinicName}}_`
    }
};

// ============================================
// TEMPLATE PROCESSING
// ============================================

/**
 * Process template with data
 */
const processTemplate = (template, data) => {
    let result = template;

    // Process if blocks
    result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
        return data[condition] ? content : '';
    });

    // Replace variables
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : '';
    });

    return result.trim();
};

// ============================================
// SMS SERVICE CLASS
// ============================================

export class SMSService {

    /**
     * Check if SMS service is configured
     */
    static isConfigured() {
        return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
    }

    /**
     * Send SMS message
     * @param {Object} options
     * @param {string} options.to - Phone number (E.164 format: +393331234567)
     * @param {string} options.template - Template name
     * @param {Object} options.data - Template data
     * @param {string} options.tenantId - Tenant ID
     * @returns {Promise<Object>} Send result
     */
    static async sendSMS({ to, template, data, tenantId }) {
        try {
            const client = getTwilioClient();

            if (!client) {
                throw new Error('Twilio not configured');
            }

            const templateDef = MESSAGE_TEMPLATES[template];
            if (!templateDef) {
                throw new Error(`SMS template '${template}' not found`);
            }

            // Process template
            const body = processTemplate(templateDef.sms, data);

            // Format phone number
            const formattedTo = this._formatPhoneNumber(to);

            const message = await client.messages.create({
                body,
                from: getFromNumber('sms'),
                to: formattedTo
            });

            logger.info('SMS sent successfully', {
                component: 'SMSService',
                action: 'sendSMS',
                template,
                messageSid: message.sid,
                to: formattedTo.substring(0, 6) + '****', // GDPR: mask number
                tenantId
            });

            return {
                success: true,
                messageSid: message.sid,
                status: message.status
            };
        } catch (error) {
            logger.error('Failed to send SMS', {
                component: 'SMSService',
                action: 'sendSMS',
                template,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Send WhatsApp message
     * @param {Object} options - Same as sendSMS
     */
    static async sendWhatsApp({ to, template, data, tenantId }) {
        try {
            const client = getTwilioClient();

            if (!client) {
                throw new Error('Twilio not configured');
            }

            const templateDef = MESSAGE_TEMPLATES[template];
            if (!templateDef) {
                throw new Error(`WhatsApp template '${template}' not found`);
            }

            // Process template
            const body = processTemplate(templateDef.whatsapp, data);

            // Format phone number with whatsapp prefix
            const formattedTo = `whatsapp:${this._formatPhoneNumber(to)}`;

            const message = await client.messages.create({
                body,
                from: getFromNumber('whatsapp'),
                to: formattedTo
            });

            logger.info('WhatsApp message sent successfully', {
                component: 'SMSService',
                action: 'sendWhatsApp',
                template,
                messageSid: message.sid,
                tenantId
            });

            return {
                success: true,
                messageSid: message.sid,
                status: message.status
            };
        } catch (error) {
            logger.error('Failed to send WhatsApp message', {
                component: 'SMSService',
                action: 'sendWhatsApp',
                template,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Send notification via preferred channel
     * Checks patient preferences and opt-out status
     */
    static async sendNotification({ patientId, template, data, tenantId, forceChannel = null }) {
        try {
            // Get patient with preferences
            const patient = await prisma.person.findFirst({
                where: {
                    id: patientId,
                    tenantId,
                    deletedAt: null
                },
                select: {
                    cellulare: true,
                    preferenzeContatto: true
                }
            });

            if (!patient || !patient.cellulare) {
                throw new Error('Patient has no phone number');
            }

            const prefs = patient.preferenzeContatto || {};

            // Check opt-out
            if (prefs.smsOptOut && prefs.whatsappOptOut && !forceChannel) {
                logger.info('Patient opted out of all messaging channels', {
                    component: 'SMSService',
                    action: 'sendNotification',
                    patientId,
                    tenantId
                });
                return { success: false, reason: 'opted_out' };
            }

            // Determine channel
            let channel = forceChannel;
            if (!channel) {
                if (!prefs.whatsappOptOut && prefs.preferWhatsApp !== false) {
                    channel = 'whatsapp';
                } else if (!prefs.smsOptOut) {
                    channel = 'sms';
                } else {
                    return { success: false, reason: 'opted_out' };
                }
            }

            // Send via selected channel
            if (channel === 'whatsapp') {
                return await this.sendWhatsApp({
                    to: patient.cellulare,
                    template,
                    data,
                    tenantId
                });
            } else {
                return await this.sendSMS({
                    to: patient.cellulare,
                    template,
                    data,
                    tenantId
                });
            }
        } catch (error) {
            logger.error('Failed to send notification', {
                component: 'SMSService',
                action: 'sendNotification',
                patientId,
                template,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Send appointment confirmation via SMS/WhatsApp
     */
    static async sendAppointmentConfirmation(appointment, patient, clinic, tenantId) {
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
            serviceName: appointment.prestazione?.nome || 'Visita',
            doctorName: appointment.medico ? `Dr. ${appointment.medico.cognome}` : ''
        };

        return this.sendNotification({
            patientId: patient.id,
            template: 'CONFERMA_APPUNTAMENTO',
            data,
            tenantId
        });
    }

    /**
     * Send appointment reminder via SMS/WhatsApp
     */
    static async sendAppointmentReminder(appointment, patient, clinic, reminderType, tenantId) {
        const reminderTexts = {
            tomorrow: 'domani',
            '3days': 'tra 3 giorni',
            week: 'la prossima settimana',
            today: 'oggi'
        };

        const data = {
            patientName: `${patient.nome} ${patient.cognome}`,
            clinicName: clinic.name || clinic.ragioneSociale,
            clinicAddress: clinic.address || clinic.indirizzo,
            clinicPhone: clinic.phone || clinic.telefono,
            appointmentDate: new Date(appointment.dataOra).toLocaleDateString('it-IT', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            }),
            appointmentTime: new Date(appointment.dataOra).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            serviceName: appointment.prestazione?.nome || 'Visita',
            doctorName: appointment.medico ? `Dr. ${appointment.medico.cognome}` : '',
            reminderText: reminderTexts[reminderType] || reminderType
        };

        return this.sendNotification({
            patientId: patient.id,
            template: 'REMINDER_APPUNTAMENTO',
            data,
            tenantId
        });
    }

    /**
     * Update patient opt-out preferences
     */
    static async updateOptOut(patientId, tenantId, { smsOptOut, whatsappOptOut }) {
        try {
            const patient = await prisma.person.findFirst({
                where: {
                    id: patientId,
                    tenantId,
                    deletedAt: null
                },
                select: {
                    preferenzeContatto: true
                }
            });

            if (!patient) {
                throw new Error('Patient not found');
            }

            const currentPrefs = patient.preferenzeContatto || {};
            const newPrefs = {
                ...currentPrefs,
                ...(smsOptOut !== undefined && { smsOptOut }),
                ...(whatsappOptOut !== undefined && { whatsappOptOut }),
                optOutUpdatedAt: new Date().toISOString()
            };

            await prisma.person.update({
                where: { id: patientId },
                data: {
                    preferenzeContatto: newPrefs
                }
            });

            logger.info('Patient opt-out preferences updated', {
                component: 'SMSService',
                action: 'updateOptOut',
                patientId,
                smsOptOut,
                whatsappOptOut,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to update opt-out preferences', {
                component: 'SMSService',
                action: 'updateOptOut',
                patientId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get available templates
     */
    static getTemplates() {
        return Object.keys(MESSAGE_TEMPLATES);
    }

    /**
     * Preview template with sample data
     */
    static previewTemplate(templateName, type = 'sms', data = {}) {
        const template = MESSAGE_TEMPLATES[templateName];
        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        const sampleData = {
            patientName: 'Mario Rossi',
            clinicName: 'Studio Medico',
            clinicAddress: 'Via Roma 123',
            clinicPhone: '02 1234567',
            appointmentDate: 'Lunedì 15 Gennaio',
            appointmentTime: '10:30',
            serviceName: 'Visita Specialistica',
            doctorName: 'Dr. Bianchi',
            reminderText: 'domani',
            visitDate: '10/01/2025',
            invoiceNumber: '2025/001',
            invoiceDate: '10/01/2025',
            totalAmount: '150.00',
            message: 'Messaggio di test',
            ...data
        };

        return {
            type,
            message: processTemplate(template[type], sampleData),
            characterCount: processTemplate(template[type], sampleData).length
        };
    }

    /**
     * Get message delivery status
     */
    static async getMessageStatus(messageSid) {
        try {
            const client = getTwilioClient();
            if (!client) {
                throw new Error('Twilio not configured');
            }

            const message = await client.messages(messageSid).fetch();

            return {
                sid: message.sid,
                status: message.status,
                errorCode: message.errorCode,
                errorMessage: message.errorMessage,
                dateSent: message.dateSent,
                dateUpdated: message.dateUpdated
            };
        } catch (error) {
            logger.error('Failed to get message status', {
                component: 'SMSService',
                action: 'getMessageStatus',
                messageSid,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Format phone number to E.164 format
     */
    static _formatPhoneNumber(phone) {
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');

        // Handle Italian numbers
        if (cleaned.startsWith('39')) {
            return `+${cleaned}`;
        } else if (cleaned.startsWith('3')) {
            // Italian mobile number without country code
            return `+39${cleaned}`;
        } else if (cleaned.startsWith('0')) {
            // Italian landline
            return `+39${cleaned}`;
        } else if (!cleaned.startsWith('+')) {
            // Assume Italian if no country code
            return `+39${cleaned}`;
        }

        return phone.startsWith('+') ? phone : `+${cleaned}`;
    }
}

export default SMSService;
