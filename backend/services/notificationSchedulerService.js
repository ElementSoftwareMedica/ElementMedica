/**
 * Notification Scheduler Service
 * 
 * Handles scheduled notifications for appointments (reminders) and other events.
 * Uses node-cron for scheduling and integrates with EmailService and (future) SMS service.
 * 
 * Features:
 * - Appointment reminders (1 day, 3 days, 1 week before)
 * - Configurable per tenant
 * - GDPR compliant (respects opt-out)
 * - Batch processing for efficiency
 * 
 * @module services/notificationSchedulerService
 * @version 1.0.0
 */

import cron from 'node-cron';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import EmailService from './emailService.js';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Reminder configuration defaults
 * Can be overridden per tenant via TenantConfiguration
 */
const DEFAULT_REMINDER_CONFIG = {
    enabled: true,
    reminders: {
        '1day': { enabled: true, hoursBefore: 24 },
        '3days': { enabled: true, hoursBefore: 72 },
        '1week': { enabled: false, hoursBefore: 168 }
    },
    sendTime: '09:00', // When to send reminders
    channels: ['email'], // ['email', 'sms', 'whatsapp']
    respectOptOut: true
};

// Track scheduled jobs
const scheduledJobs = new Map();

// ============================================
// SCHEDULER CLASS
// ============================================

export class NotificationSchedulerService {

    /**
     * Initialize scheduler - call on server startup
     */
    static async initialize() {
        try {
            logger.info('Initializing notification scheduler', {
                component: 'NotificationScheduler',
                action: 'initialize'
            });

            // Schedule daily reminder check at 8:00 AM
            const dailyJob = cron.schedule('0 8 * * *', async () => {
                await this.processAppointmentReminders();
            }, {
                timezone: 'Europe/Rome'
            });

            scheduledJobs.set('dailyReminders', dailyJob);

            // Schedule hourly check for same-day appointments (9 AM - 6 PM)
            const hourlyJob = cron.schedule('0 9-18 * * *', async () => {
                await this.processSameDayReminders();
            }, {
                timezone: 'Europe/Rome'
            });

            scheduledJobs.set('hourlyReminders', hourlyJob);

            logger.info('Notification scheduler initialized', {
                component: 'NotificationScheduler',
                action: 'initialize',
                jobs: Array.from(scheduledJobs.keys())
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to initialize notification scheduler', {
                component: 'NotificationScheduler',
                action: 'initialize',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Stop all scheduled jobs
     */
    static stop() {
        scheduledJobs.forEach((job, name) => {
            job.stop();
            logger.info('Stopped scheduled job', {
                component: 'NotificationScheduler',
                action: 'stop',
                jobName: name
            });
        });
        scheduledJobs.clear();
    }

    /**
     * Process appointment reminders for all tenants
     * Runs daily at 8 AM
     */
    static async processAppointmentReminders() {
        const startTime = Date.now();

        try {
            logger.info('Starting appointment reminder processing', {
                component: 'NotificationScheduler',
                action: 'processAppointmentReminders'
            });

            // Get all active tenants
            const tenants = await prisma.tenant.findMany({
                where: { deletedAt: null },
                select: { id: true, name: true }
            });

            let totalSent = 0;
            let totalErrors = 0;

            for (const tenant of tenants) {
                const result = await this._processRemindersForTenant(tenant.id);
                totalSent += result.sent;
                totalErrors += result.errors;
            }

            logger.info('Appointment reminder processing completed', {
                component: 'NotificationScheduler',
                action: 'processAppointmentReminders',
                tenantsProcessed: tenants.length,
                totalSent,
                totalErrors,
                duration: Date.now() - startTime
            });

            return { totalSent, totalErrors };
        } catch (error) {
            logger.error('Failed to process appointment reminders', {
                component: 'NotificationScheduler',
                action: 'processAppointmentReminders',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Process reminders for a specific tenant
     */
    static async _processRemindersForTenant(tenantId) {
        let sent = 0;
        let errors = 0;

        try {
            // Get tenant config
            const config = await this._getTenantReminderConfig(tenantId);

            if (!config.enabled) {
                return { sent: 0, errors: 0 };
            }

            // Get tenant clinic info
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: {
                    name: true,
                    settings: true
                }
            });

            const now = new Date();

            // Process each reminder type
            for (const [reminderType, reminderConfig] of Object.entries(config.reminders)) {
                if (!reminderConfig.enabled) continue;

                const targetTime = new Date(now.getTime() + reminderConfig.hoursBefore * 60 * 60 * 1000);
                const windowStart = new Date(targetTime.getTime() - 60 * 60 * 1000); // 1 hour window
                const windowEnd = new Date(targetTime.getTime() + 60 * 60 * 1000);

                // Find appointments in window
                const appointments = await prisma.appuntamento.findMany({
                    where: {
                        tenantId,
                        deletedAt: null,
                        stato: { in: ['CONFERMATO', 'PRENOTATO'] },
                        dataOra: {
                            gte: windowStart,
                            lte: windowEnd
                        },
                        promemoria: true, // Only if reminders enabled for this appointment
                        promemoriaInviato: false // Not already sent
                    },
                    include: {
                        paziente: {
                            select: {
                                id: true,
                                nome: true,
                                cognome: true,
                                email: true,
                                preferenzeContatto: true
                            }
                        },
                        prestazione: {
                            select: { id: true, nome: true }
                        },
                        medico: {
                            select: { id: true, nome: true, cognome: true }
                        }
                    },
                    take: 100 // Batch limit
                });

                for (const appointment of appointments) {
                    // Check if patient has email and hasn't opted out
                    if (!appointment.paziente?.email) continue;

                    const prefs = appointment.paziente.preferenzeContatto || {};
                    if (config.respectOptOut && prefs.emailOptOut) continue;

                    try {
                        // Build clinic info
                        const clinicInfo = {
                            name: tenant.name,
                            address: tenant.settings?.indirizzo || '',
                            phone: tenant.settings?.telefono || '',
                            email: tenant.settings?.email || ''
                        };

                        // Send reminder
                        await EmailService.sendAppointmentReminder(
                            appointment,
                            appointment.paziente,
                            clinicInfo,
                            reminderType === '1day' ? 'tomorrow' :
                                reminderType === '3days' ? '3days' : 'week',
                            tenantId
                        );

                        // Mark reminder as sent
                        await prisma.appuntamento.update({
                            where: { id: appointment.id },
                            data: {
                                promemoriaInviato: true
                            }
                        });

                        sent++;
                    } catch (err) {
                        errors++;
                        logger.error('Failed to send reminder', {
                            component: 'NotificationScheduler',
                            action: '_processRemindersForTenant',
                            appointmentId: appointment.id,
                            reminderType,
                            error: err.message
                        });
                    }
                }
            }
        } catch (error) {
            logger.error('Error processing tenant reminders', {
                component: 'NotificationScheduler',
                action: '_processRemindersForTenant',
                tenantId,
                error: error.message
            });
            errors++;
        }

        return { sent, errors };
    }

    /**
     * Process same-day appointment reminders
     * Runs hourly 9 AM - 6 PM for appointments within 2 hours
     */
    static async processSameDayReminders() {
        const startTime = Date.now();

        try {
            const now = new Date();
            const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

            // Find appointments starting in 2 hours
            const appointments = await prisma.appuntamento.findMany({
                where: {
                    deletedAt: null,
                    stato: { in: ['CONFERMATO', 'PRENOTATO'] },
                    dataOra: {
                        gte: now,
                        lte: twoHoursLater
                    },
                    promemoria: true,
                    promemoriaInviato: false
                },
                include: {
                    paziente: {
                        select: {
                            id: true,
                            nome: true,
                            cognome: true,
                            email: true,
                            cellulare: true,
                            preferenzeContatto: true
                        }
                    },
                    tenant: {
                        select: {
                            id: true,
                            name: true,
                            settings: true
                        }
                    },
                    prestazione: {
                        select: { nome: true }
                    },
                    medico: {
                        select: { nome: true, cognome: true }
                    }
                },
                take: 50
            });

            let sent = 0;

            for (const appointment of appointments) {
                if (!appointment.paziente?.email) continue;

                try {
                    const clinicInfo = {
                        name: appointment.tenant.name,
                        address: appointment.tenant.settings?.indirizzo || '',
                        phone: appointment.tenant.settings?.telefono || ''
                    };

                    await EmailService.sendAppointmentReminder(
                        appointment,
                        appointment.paziente,
                        clinicInfo,
                        'today',
                        appointment.tenantId
                    );

                    await prisma.appuntamento.update({
                        where: { id: appointment.id },
                        data: {
                            promemoriaInviato: true
                        }
                    });

                    sent++;
                } catch (err) {
                    logger.error('Failed to send same-day reminder', {
                        component: 'NotificationScheduler',
                        action: 'processSameDayReminders',
                        appointmentId: appointment.id,
                        error: err.message
                    });
                }
            }

            logger.info('Same-day reminders processed', {
                component: 'NotificationScheduler',
                action: 'processSameDayReminders',
                found: appointments.length,
                sent,
                duration: Date.now() - startTime
            });

            return { sent };
        } catch (error) {
            logger.error('Failed to process same-day reminders', {
                component: 'NotificationScheduler',
                action: 'processSameDayReminders',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Send manual notification for appointment
     */
    static async sendAppointmentNotification(appointmentId, type = 'confirmation', tenantId) {
        try {
            const appointment = await prisma.appuntamento.findFirst({
                where: {
                    id: appointmentId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    paziente: {
                        select: {
                            id: true,
                            nome: true,
                            cognome: true,
                            email: true
                        }
                    },
                    prestazione: {
                        select: { nome: true }
                    },
                    medico: {
                        select: { nome: true, cognome: true }
                    },
                    tenant: {
                        select: {
                            name: true,
                            settings: true
                        }
                    }
                }
            });

            if (!appointment) {
                throw new Error('Appointment not found');
            }

            if (!appointment.paziente?.email) {
                throw new Error('Patient has no email address');
            }

            const clinicInfo = {
                name: appointment.tenant.name,
                address: appointment.tenant.settings?.indirizzo || '',
                phone: appointment.tenant.settings?.telefono || '',
                email: appointment.tenant.settings?.email || ''
            };

            if (type === 'confirmation') {
                return await EmailService.sendAppointmentConfirmation(
                    appointment,
                    appointment.paziente,
                    clinicInfo,
                    tenantId
                );
            } else if (type === 'reminder') {
                return await EmailService.sendAppointmentReminder(
                    appointment,
                    appointment.paziente,
                    clinicInfo,
                    'manual',
                    tenantId
                );
            }

            throw new Error(`Unknown notification type: ${type}`);
        } catch (error) {
            logger.error('Failed to send appointment notification', {
                component: 'NotificationScheduler',
                action: 'sendAppointmentNotification',
                appointmentId,
                type,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get tenant reminder configuration
     */
    static async _getTenantReminderConfig(tenantId) {
        try {
            const config = await prisma.tenantConfiguration.findFirst({
                where: {
                    tenantId,
                    configKey: 'appointment_reminders',
                    deletedAt: null
                }
            });

            if (config?.configValue) {
                return { ...DEFAULT_REMINDER_CONFIG, ...config.configValue };
            }

            return DEFAULT_REMINDER_CONFIG;
        } catch (error) {
            return DEFAULT_REMINDER_CONFIG;
        }
    }

    /**
     * Update tenant reminder configuration
     */
    static async updateTenantConfig(tenantId, config) {
        try {
            const existing = await prisma.tenantConfiguration.findFirst({
                where: {
                    tenantId,
                    configKey: 'appointment_reminders',
                    deletedAt: null
                }
            });

            if (existing) {
                return await prisma.tenantConfiguration.update({
                    where: { id: existing.id },
                    data: {
                        configValue: { ...DEFAULT_REMINDER_CONFIG, ...config }
                    }
                });
            }

            return await prisma.tenantConfiguration.create({
                data: {
                    tenantId,
                    configKey: 'appointment_reminders',
                    configType: 'notifications',
                    configValue: { ...DEFAULT_REMINDER_CONFIG, ...config }
                }
            });
        } catch (error) {
            logger.error('Failed to update tenant reminder config', {
                component: 'NotificationScheduler',
                action: 'updateTenantConfig',
                tenantId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get scheduler status
     */
    static getStatus() {
        return {
            active: scheduledJobs.size > 0,
            jobs: Array.from(scheduledJobs.entries()).map(([name, job]) => ({
                name,
                running: job.running || false
            }))
        };
    }

    /**
     * Manually trigger reminder processing (for testing)
     */
    static async triggerManual() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Manual trigger not allowed in production');
        }

        return await this.processAppointmentReminders();
    }
}

export default NotificationSchedulerService;
