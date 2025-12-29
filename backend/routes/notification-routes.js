/**
 * Notification Routes
 * 
 * API endpoints for notification management (email, SMS, WhatsApp, reminders)
 * 
 * Routes:
 * - POST /api/v1/notifications/send - Send manual notification
 * - GET /api/v1/notifications/templates - List email templates
 * - POST /api/v1/notifications/preview - Preview template
 * - GET /api/v1/notifications/config - Get notification config
 * - PUT /api/v1/notifications/config - Update notification config
 * - POST /api/v1/notifications/test - Send test email
 * - GET /api/v1/notifications/status - Get scheduler status
 * - POST /api/v1/notifications/sms/send - Send SMS
 * - POST /api/v1/notifications/whatsapp/send - Send WhatsApp
 * - GET /api/v1/notifications/sms/templates - SMS templates
 * - PUT /api/v1/notifications/opt-out - Update patient opt-out
 * 
 * @module routes/notification-routes
 * @version 1.1.0
 */

import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import EmailService from '../services/emailService.js';
import SMSService from '../services/smsService.js';
import NotificationSchedulerService from '../services/notificationSchedulerService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// ============================================
// NOTIFICATION ENDPOINTS
// ============================================

/**
 * @swagger
 * /api/v1/notifications/send:
 *   post:
 *     summary: Send manual notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.post('/send',
    requireAuth,
    requirePermission('notifications:update'),
    [
        body('type').isIn(['appointment_confirmation', 'appointment_reminder', 'referto', 'invoice', 'generic']),
        body('entityId').optional().isUUID(),
        body('to').isEmail(),
        body('templateData').optional().isObject()
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { type, entityId, to, templateData } = req.body;
            const tenantId = req.person.tenantId;

            let result;

            switch (type) {
                case 'appointment_confirmation':
                case 'appointment_reminder':
                    if (!entityId) {
                        return res.status(400).json({
                            success: false,
                            error: 'entityId required for appointment notifications'
                        });
                    }
                    result = await NotificationSchedulerService.sendAppointmentNotification(
                        entityId,
                        type === 'appointment_confirmation' ? 'confirmation' : 'reminder',
                        tenantId
                    );
                    break;

                case 'generic':
                    result = await EmailService.queue({
                        to,
                        template: 'NOTIFICA_GENERICA',
                        data: templateData || {},
                        tenantId
                    });
                    break;

                default:
                    return res.status(400).json({
                        success: false,
                        error: 'Notification type not yet implemented'
                    });
            }

            logger.info('Manual notification sent', {
                component: 'NotificationRoutes',
                action: 'send',
                type,
                userId: req.person.id,
                tenantId
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Failed to send notification', {
                component: 'NotificationRoutes',
                action: 'send',
                error: error.message,
                tenantId: req.person.tenantId
            });

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/notifications/templates:
 *   get:
 *     summary: List available email templates
 *     tags: [Notifications]
 */
router.get('/templates',
    requireAuth,
    requirePermission('notifications:read'),
    async (req, res) => {
        try {
            const templates = EmailService.getTemplates();

            res.json({
                success: true,
                data: templates.map(t => ({
                    name: t,
                    description: getTemplateDescription(t)
                }))
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/notifications/preview:
 *   post:
 *     summary: Preview email template with sample data
 *     tags: [Notifications]
 */
router.post('/preview',
    requireAuth,
    requirePermission('notifications:read'),
    [
        body('template').isString(),
        body('data').optional().isObject()
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { template, data } = req.body;

            // Add sample data for preview
            const sampleData = {
                patientName: 'Mario Rossi',
                clinicName: 'Studio Medico ElementMedica',
                clinicAddress: 'Via Roma 123, Milano',
                clinicPhone: '02 1234567',
                clinicEmail: 'info@elementmedica.it',
                appointmentDate: 'Lunedì 15 Gennaio 2025',
                appointmentTime: '10:30',
                serviceName: 'Visita Specialistica',
                doctorName: 'Dr. Bianchi',
                ...data
            };

            const preview = EmailService.previewTemplate(template, sampleData);

            res.json({
                success: true,
                data: preview
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/notifications/config:
 *   get:
 *     summary: Get tenant notification configuration
 *     tags: [Notifications]
 */
router.get('/config',
    requireAuth,
    requirePermission('settings:read'),
    async (req, res) => {
        try {
            const config = await NotificationSchedulerService._getTenantReminderConfig(req.person.tenantId);

            res.json({
                success: true,
                data: config
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/notifications/config:
 *   put:
 *     summary: Update tenant notification configuration
 *     tags: [Notifications]
 */
router.put('/config',
    requireAuth,
    requirePermission('settings:update'),
    [
        body('enabled').optional().isBoolean(),
        body('reminders').optional().isObject(),
        body('channels').optional().isArray(),
        body('respectOptOut').optional().isBoolean()
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const result = await NotificationSchedulerService.updateTenantConfig(
                req.person.tenantId,
                req.body
            );

            logger.info('Notification config updated', {
                component: 'NotificationRoutes',
                action: 'updateConfig',
                userId: req.person.id,
                tenantId: req.person.tenantId
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/notifications/test:
 *   post:
 *     summary: Send test email
 *     tags: [Notifications]
 */
router.post('/test',
    requireAuth,
    requirePermission('notifications:update'),
    [
        body('to').isEmail(),
        body('template').optional().isString()
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { to, template = 'NOTIFICA_GENERICA' } = req.body;

            const testData = {
                title: 'Test Email',
                subject: 'Test Notifica - ElementMedica',
                body: `<p>Questa è una email di test inviata il ${new Date().toLocaleString('it-IT')}.</p>
               <p>Se ricevi questa email, il sistema di notifiche è configurato correttamente.</p>`,
                textBody: `Questa è una email di test inviata il ${new Date().toLocaleString('it-IT')}.\nSe ricevi questa email, il sistema di notifiche è configurato correttamente.`,
                clinicName: 'ElementMedica',
                clinicPhone: '',
                clinicEmail: ''
            };

            const result = await EmailService.send({
                to,
                template,
                data: testData,
                tenantId: req.person.tenantId
            });

            logger.info('Test email sent', {
                component: 'NotificationRoutes',
                action: 'test',
                to: to.substring(0, 3) + '***',
                userId: req.person.id
            });

            res.json({
                success: true,
                data: result,
                message: 'Test email sent successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/notifications/status:
 *   get:
 *     summary: Get notification scheduler status
 *     tags: [Notifications]
 */
router.get('/status',
    requireAuth,
    requirePermission('settings:read'),
    async (req, res) => {
        try {
            const status = NotificationSchedulerService.getStatus();

            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/notifications/trigger:
 *   post:
 *     summary: Manually trigger reminder processing (dev only)
 *     tags: [Notifications]
 */
router.post('/trigger',
    requireAuth,
    requirePermission('admin:access'),
    async (req, res) => {
        try {
            if (process.env.NODE_ENV === 'production') {
                return res.status(403).json({
                    success: false,
                    error: 'Not allowed in production'
                });
            }

            const result = await NotificationSchedulerService.triggerManual();

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// ============================================
// HELPERS
// ============================================

function getTemplateDescription(templateName) {
    const descriptions = {
        CONFERMA_APPUNTAMENTO: 'Email di conferma appuntamento con tutti i dettagli',
        REMINDER_APPUNTAMENTO: 'Promemoria appuntamento (1 giorno, 3 giorni, 1 settimana)',
        REFERTO_DISPONIBILE: 'Notifica disponibilità referto/esito',
        FATTURA_EMESSA: 'Notifica emissione fattura con allegato PDF',
        NOTIFICA_GENERICA: 'Template generico personalizzabile'
    };

    return descriptions[templateName] || 'No description available';
}

// ============================================
// SMS/WHATSAPP ENDPOINTS
// ============================================

/**
 * @swagger
 * /api/v1/notifications/sms/status:
 *   get:
 *     summary: Check if SMS service is configured
 *     tags: [Notifications]
 */
router.get('/sms/status',
    requireAuth,
    requirePermission('notifications:read'),
    async (req, res) => {
        try {
            res.json({
                success: true,
                data: {
                    configured: SMSService.isConfigured(),
                    provider: 'Twilio'
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/notifications/sms/templates:
 *   get:
 *     summary: List available SMS/WhatsApp templates
 *     tags: [Notifications]
 */
router.get('/sms/templates',
    requireAuth,
    requirePermission('notifications:read'),
    async (req, res) => {
        try {
            const templates = SMSService.getTemplates();

            res.json({
                success: true,
                data: templates.map(t => ({
                    name: t,
                    smsPreview: SMSService.previewTemplate(t, 'sms'),
                    whatsappPreview: SMSService.previewTemplate(t, 'whatsapp')
                }))
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/notifications/sms/preview:
 *   post:
 *     summary: Preview SMS/WhatsApp template
 *     tags: [Notifications]
 */
router.post('/sms/preview',
    requireAuth,
    requirePermission('notifications:read'),
    [
        body('template').isString(),
        body('type').optional().isIn(['sms', 'whatsapp']),
        body('data').optional().isObject()
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { template, type = 'sms', data } = req.body;
            const preview = SMSService.previewTemplate(template, type, data);

            res.json({
                success: true,
                data: preview
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/notifications/sms/send:
 *   post:
 *     summary: Send SMS message
 *     tags: [Notifications]
 */
router.post('/sms/send',
    requireAuth,
    requirePermission('notifications:update'),
    [
        body('to').isString().matches(/^\+?[0-9]{10,15}$/),
        body('template').isString(),
        body('data').optional().isObject()
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { to, template, data } = req.body;

            const result = await SMSService.sendSMS({
                to,
                template,
                data: data || {},
                tenantId: req.person.tenantId
            });

            logger.info('SMS sent via API', {
                component: 'NotificationRoutes',
                action: 'sendSMS',
                template,
                userId: req.person.id,
                tenantId: req.person.tenantId
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/notifications/whatsapp/send:
 *   post:
 *     summary: Send WhatsApp message
 *     tags: [Notifications]
 */
router.post('/whatsapp/send',
    requireAuth,
    requirePermission('notifications:update'),
    [
        body('to').isString().matches(/^\+?[0-9]{10,15}$/),
        body('template').isString(),
        body('data').optional().isObject()
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { to, template, data } = req.body;

            const result = await SMSService.sendWhatsApp({
                to,
                template,
                data: data || {},
                tenantId: req.person.tenantId
            });

            logger.info('WhatsApp message sent via API', {
                component: 'NotificationRoutes',
                action: 'sendWhatsApp',
                template,
                userId: req.person.id,
                tenantId: req.person.tenantId
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/notifications/opt-out:
 *   put:
 *     summary: Update patient notification opt-out preferences
 *     tags: [Notifications]
 */
router.put('/opt-out',
    requireAuth,
    requirePermission('notifications:update'),
    [
        body('patientId').isUUID(),
        body('smsOptOut').optional().isBoolean(),
        body('whatsappOptOut').optional().isBoolean(),
        body('emailOptOut').optional().isBoolean()
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { patientId, smsOptOut, whatsappOptOut } = req.body;

            const result = await SMSService.updateOptOut(
                patientId,
                req.person.tenantId,
                { smsOptOut, whatsappOptOut }
            );

            logger.info('Patient opt-out preferences updated via API', {
                component: 'NotificationRoutes',
                action: 'updateOptOut',
                patientId,
                userId: req.person.id,
                tenantId: req.person.tenantId
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/notifications/sms/message/{messageSid}:
 *   get:
 *     summary: Get SMS/WhatsApp message delivery status
 *     tags: [Notifications]
 */
router.get('/sms/message/:messageSid',
    requireAuth,
    requirePermission('notifications:read'),
    async (req, res) => {
        try {
            const { messageSid } = req.params;
            const status = await SMSService.getMessageStatus(messageSid);

            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

export default router;
