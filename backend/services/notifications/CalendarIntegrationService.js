/**
 * CalendarIntegrationService
 * 
 * Genera eventi ICS per notifiche calendario.
 * Supporta appuntamenti, visite, corsi e feed personali.
 * 
 * PROGETTO 47 - Advanced Notification System
 * Fase 9: Integrations & Polish
 * 
 * @module services/notifications/CalendarIntegrationService
 * @version 1.0.0
 */

import prisma from '../../config/prisma-optimization.js';
import ical from 'ical-generator';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import logger from '../../utils/logger.js';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_TIMEZONE = 'Europe/Rome';
const DEFAULT_DURATION_MINUTES = 30;
const PRODID = {
    company: 'ElementMedica',
    product: 'Notification System',
    language: 'IT'
};

// Token expiration (90 days in milliseconds)
const TOKEN_EXPIRATION_MS = 90 * 24 * 60 * 60 * 1000;

// ============================================
// CALENDAR INTEGRATION SERVICE
// ============================================

class CalendarIntegrationService {

    // ==========================================
    // ICS GENERATION - APPOINTMENTS
    // ==========================================

    /**
     * Genera evento ICS per appuntamento
     * 
     * @param {Object} appointment - Appuntamento con relazioni
     * @param {Object} tenant - Tenant info
     * @returns {string} ICS content
     */
    static generateAppointmentICS(appointment, tenant) {
        try {
            const calendar = ical({
                name: tenant?.name || 'ElementMedica',
                timezone: DEFAULT_TIMEZONE,
                prodId: PRODID
            });

            const startDate = new Date(appointment.dataOra);
            const duration = appointment.durataMinuti || DEFAULT_DURATION_MINUTES;
            const endDate = new Date(startDate.getTime() + duration * 60000);

            const event = calendar.createEvent({
                id: appointment.id || uuidv4(),
                start: startDate,
                end: endDate,
                summary: this._buildAppointmentSummary(appointment),
                description: this._buildAppointmentDescription(appointment),
                location: this._buildLocation(appointment),
                url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/clinica/appuntamenti/${appointment.id}`,
                organizer: {
                    name: tenant?.name || 'ElementMedica',
                    email: tenant?.email || process.env.SMTP_FROM || 'noreply@element-srl.it'
                },
                alarms: this._buildAppointmentAlarms(appointment)
            });

            // Aggiungi partecipante (paziente) se disponibile
            if (appointment.paziente?.email) {
                event.createAttendee({
                    name: `${appointment.paziente.firstName || ''} ${appointment.paziente.lastName || ''}`.trim(),
                    email: appointment.paziente.email,
                    rsvp: true,
                    status: 'NEEDS-ACTION',
                    type: 'INDIVIDUAL'
                });
            }

            // Aggiungi medico come organizzatore/partecipante
            if (appointment.medico?.email) {
                event.createAttendee({
                    name: `${appointment.medico.gender === 'FEMALE' ? 'Dott.ssa' : 'Dott.'} ${appointment.medico.firstName || ''} ${appointment.medico.lastName || ''}`.trim(),
                    email: appointment.medico.email,
                    rsvp: false,
                    status: 'ACCEPTED',
                    type: 'INDIVIDUAL'
                });
            }

            logger.info({
                appointmentId: appointment.id,
                action: 'generateAppointmentICS'
            }, 'CalendarIntegrationService: ICS generated for appointment');

            return calendar.toString();
        } catch (error) {
            logger.error({
                error: error.message,
                appointmentId: appointment?.id,
                action: 'generateAppointmentICS'
            }, 'CalendarIntegrationService: Failed to generate appointment ICS');
            throw error;
        }
    }

    /**
     * Costruisce il titolo dell'appuntamento
     */
    static _buildAppointmentSummary(appointment) {
        const prestazione = appointment.prestazione?.nome || 'Appuntamento';
        const sede = appointment.ambulatorio?.sede?.nome || '';

        if (sede) {
            return `${prestazione} - ${sede}`;
        }
        return `Appuntamento: ${prestazione}`;
    }

    /**
     * Costruisce la descrizione dell'appuntamento
     */
    static _buildAppointmentDescription(appointment) {
        const lines = [];

        if (appointment.prestazione?.nome) {
            lines.push(`Prestazione: ${appointment.prestazione.nome}`);
        }

        if (appointment.medico) {
            const medicoName = `${appointment.medico.firstName || ''} ${appointment.medico.lastName || ''}`.trim();
            const medicoPrefix = appointment.medico.gender === 'FEMALE' ? 'Dott.ssa' : 'Dott.';
            lines.push(`Medico: ${medicoPrefix} ${medicoName}`);
        }

        if (appointment.ambulatorio?.nome) {
            lines.push(`Ambulatorio: ${appointment.ambulatorio.nome}`);
        }

        if (appointment.ambulatorio?.sede?.nome) {
            lines.push(`Sede: ${appointment.ambulatorio.sede.nome}`);
        }

        if (appointment.numeroPrenotazione) {
            lines.push(`N. Prenotazione: ${appointment.numeroPrenotazione}`);
        }

        if (appointment.note) {
            lines.push('');
            lines.push(`Note: ${appointment.note}`);
        }

        lines.push('');
        lines.push('---');
        lines.push('Gestito da Element srl');
        lines.push('https://element-srl.it');

        return lines.join('\n');
    }

    /**
     * Costruisce la location per l'evento
     */
    static _buildLocation(appointment) {
        const parts = [];

        if (appointment.ambulatorio?.nome) {
            parts.push(appointment.ambulatorio.nome);
        }

        if (appointment.ambulatorio?.sede?.nome) {
            parts.push(appointment.ambulatorio.sede.nome);
        }

        if (appointment.ambulatorio?.sede?.indirizzo) {
            parts.push(appointment.ambulatorio.sede.indirizzo);
        }

        return parts.join(', ') || 'Da confermare';
    }

    /**
     * Costruisce gli allarmi per l'appuntamento
     */
    static _buildAppointmentAlarms(appointment) {
        const alarms = [];

        // Promemoria 24 ore prima
        alarms.push({
            type: 'display',
            trigger: -24 * 60 * 60, // secondi
            description: 'Promemoria: appuntamento domani'
        });

        // Promemoria 2 ore prima
        alarms.push({
            type: 'display',
            trigger: -2 * 60 * 60,
            description: 'Promemoria: appuntamento tra 2 ore'
        });

        // Promemoria 30 minuti prima
        alarms.push({
            type: 'display',
            trigger: -30 * 60,
            description: 'Promemoria: appuntamento tra 30 minuti'
        });

        return alarms;
    }

    // ==========================================
    // ICS GENERATION - VISITE
    // ==========================================

    /**
     * Genera ICS per visita medica
     * 
     * @param {Object} visita - Visita con relazioni
     * @param {Object} tenant - Tenant info
     * @returns {string} ICS content
     */
    static generateVisitaICS(visita, tenant) {
        try {
            const calendar = ical({
                name: tenant?.name || 'ElementMedica',
                timezone: DEFAULT_TIMEZONE,
                prodId: PRODID
            });

            const startDate = new Date(visita.dataOra);
            const duration = visita.durataEffettiva || DEFAULT_DURATION_MINUTES;
            const endDate = new Date(startDate.getTime() + duration * 60000);

            const event = calendar.createEvent({
                id: visita.id || uuidv4(),
                start: startDate,
                end: endDate,
                summary: this._buildVisitaSummary(visita),
                description: this._buildVisitaDescription(visita),
                location: this._buildLocation({
                    ambulatorio: visita.ambulatorio
                }),
                url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/clinica/visite/${visita.id}`,
                organizer: {
                    name: tenant?.name || 'ElementMedica',
                    email: tenant?.email || process.env.SMTP_FROM || 'noreply@element-srl.it'
                },
                alarms: this._buildVisitaAlarms()
            });

            // Aggiungi paziente
            if (visita.paziente?.email) {
                event.createAttendee({
                    name: `${visita.paziente.firstName || ''} ${visita.paziente.lastName || ''}`.trim(),
                    email: visita.paziente.email,
                    rsvp: true,
                    status: 'NEEDS-ACTION',
                    type: 'INDIVIDUAL'
                });
            }

            logger.info({
                visitaId: visita.id,
                action: 'generateVisitaICS'
            }, 'CalendarIntegrationService: ICS generated for visita');

            return calendar.toString();
        } catch (error) {
            logger.error({
                error: error.message,
                visitaId: visita?.id,
                action: 'generateVisitaICS'
            }, 'CalendarIntegrationService: Failed to generate visita ICS');
            throw error;
        }
    }

    /**
     * Costruisce il titolo della visita
     */
    static _buildVisitaSummary(visita) {
        const prestazione = visita.prestazione?.nome || 'Visita';
        return `Visita: ${prestazione}`;
    }

    /**
     * Costruisce la descrizione della visita
     */
    static _buildVisitaDescription(visita) {
        const lines = [];

        if (visita.prestazione?.nome) {
            lines.push(`Tipo: ${visita.prestazione.nome}`);
        }

        if (visita.medico) {
            const medicoName = `${visita.medico.firstName || ''} ${visita.medico.lastName || ''}`.trim();
            const medicoPrefix = visita.medico.gender === 'FEMALE' ? 'Dott.ssa' : 'Dott.';
            lines.push(`Medico: ${medicoPrefix} ${medicoName}`);
        }

        if (visita.ambulatorio?.nome) {
            lines.push(`Ambulatorio: ${visita.ambulatorio.nome}`);
        }

        if (visita.diagnosiPrincipale) {
            lines.push('');
            lines.push(`Diagnosi: ${visita.diagnosiPrincipale}`);
        }

        if (visita.prossimoControllo) {
            lines.push('');
            lines.push(`Prossimo controllo: ${new Date(visita.prossimoControllo).toLocaleDateString('it-IT')}`);
        }

        lines.push('');
        lines.push('---');
        lines.push('Gestito da ElementMedica');

        return lines.join('\n');
    }

    /**
     * Costruisce allarmi per visita
     */
    static _buildVisitaAlarms() {
        return [
            {
                type: 'display',
                trigger: -7 * 24 * 60 * 60, // 7 giorni prima
                description: 'Promemoria: controllo medico tra una settimana'
            },
            {
                type: 'display',
                trigger: -1 * 24 * 60 * 60, // 1 giorno prima
                description: 'Promemoria: controllo medico domani'
            }
        ];
    }

    // ==========================================
    // ICS GENERATION - COURSES
    // ==========================================

    /**
     * Genera ICS per scadenza corso formazione
     * 
     * @param {Object} course - Corso con relazioni
     * @param {Object} tenant - Tenant info
     * @returns {string} ICS content
     */
    static generateCourseICS(course, tenant) {
        try {
            const calendar = ical({
                name: tenant?.name || 'ElementMedica',
                timezone: DEFAULT_TIMEZONE,
                prodId: PRODID
            });

            const scadenza = course.scadenza || course.dataFine;
            if (!scadenza) {
                throw new Error('Course scadenza date is required');
            }

            calendar.createEvent({
                id: course.id || uuidv4(),
                start: new Date(scadenza),
                allDay: true,
                summary: `Scadenza Corso: ${course.titolo || course.nome || 'Formazione'}`,
                description: this._buildCourseDescription(course),
                url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/formazione/corsi/${course.id}`,
                organizer: {
                    name: tenant?.name || 'ElementMedica',
                    email: tenant?.email || process.env.SMTP_FROM || 'noreply@element-srl.it'
                },
                alarms: this._buildCourseAlarms()
            });

            logger.info({
                courseId: course.id,
                action: 'generateCourseICS'
            }, 'CalendarIntegrationService: ICS generated for course');

            return calendar.toString();
        } catch (error) {
            logger.error({
                error: error.message,
                courseId: course?.id,
                action: 'generateCourseICS'
            }, 'CalendarIntegrationService: Failed to generate course ICS');
            throw error;
        }
    }

    /**
     * Costruisce la descrizione del corso
     */
    static _buildCourseDescription(course) {
        const lines = [];

        lines.push(`Corso: ${course.titolo || course.nome}`);

        if (course.descrizione) {
            lines.push(`Descrizione: ${course.descrizione}`);
        }

        if (course.oreFormative || course.durata) {
            lines.push(`Durata: ${course.oreFormative || course.durata} ore`);
        }

        if (course.crediti) {
            lines.push(`Crediti: ${course.crediti}`);
        }

        lines.push('');
        lines.push('⚠️ Ricordati di rinnovare questo corso prima della scadenza!');
        lines.push('');
        lines.push('---');
        lines.push('Gestito da ElementMedica');

        return lines.join('\n');
    }

    /**
     * Costruisce allarmi per corso
     */
    static _buildCourseAlarms() {
        return [
            {
                type: 'display',
                trigger: -30 * 24 * 60 * 60, // 30 giorni prima
                description: 'Promemoria: corso in scadenza tra 30 giorni'
            },
            {
                type: 'display',
                trigger: -7 * 24 * 60 * 60, // 7 giorni prima
                description: 'Promemoria: corso in scadenza tra 7 giorni'
            },
            {
                type: 'display',
                trigger: -1 * 24 * 60 * 60, // 1 giorno prima
                description: 'URGENTE: corso in scadenza domani!'
            }
        ];
    }

    // ==========================================
    // PERSONAL FEED
    // ==========================================

    /**
     * Genera feed ICS personale con tutti gli eventi futuri
     * 
     * @param {string} personId - ID persona
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<string>} ICS content completo
     */
    static async generatePersonalFeed(personId, tenantId) {
        try {
            // Recupera tenant info
            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: { id: true, name: true }
            });

            // Recupera eventi futuri per la persona
            const [appuntamenti, visite] = await Promise.all([
                prisma.appuntamento.findMany({
                    where: {
                        pazienteId: personId,
                        tenantId,
                        dataOra: { gte: new Date() },
                        stato: { not: 'ANNULLATO' },
                        deletedAt: null
                    },
                    include: {
                        prestazione: { select: { nome: true } },
                        ambulatorio: {
                            select: {
                                nome: true,
                                sede: {
                                    select: { nome: true, indirizzo: true }
                                }
                            }
                        }
                    },
                    orderBy: { dataOra: 'asc' },
                    take: 100 // Limita per performance
                }),
                prisma.visita.findMany({
                    where: {
                        pazienteId: personId,
                        tenantId,
                        prossimoControllo: { gte: new Date() },
                        deletedAt: null
                    },
                    include: {
                        prestazione: { select: { nome: true } },
                        medico: { select: { firstName: true, lastName: true } },
                        ambulatorio: { select: { nome: true } }
                    },
                    orderBy: { prossimoControllo: 'asc' },
                    take: 50
                })
            ]);

            // Crea calendario unificato
            const calendar = ical({
                name: `${tenant?.name || 'ElementMedica'} - I miei appuntamenti`,
                timezone: DEFAULT_TIMEZONE,
                prodId: PRODID,
                ttl: 3600 // Refresh ogni ora
            });

            // Aggiungi appuntamenti
            for (const app of appuntamenti) {
                const startDate = new Date(app.dataOra);
                const duration = app.durataMinuti || DEFAULT_DURATION_MINUTES;
                const endDate = new Date(startDate.getTime() + duration * 60000);

                calendar.createEvent({
                    id: app.id,
                    start: startDate,
                    end: endDate,
                    summary: this._buildAppointmentSummary(app),
                    description: this._buildAppointmentDescription(app),
                    location: this._buildLocation(app),
                    url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/clinica/appuntamenti/${app.id}`,
                    alarms: this._buildAppointmentAlarms(app)
                });
            }

            // Aggiungi prossimi controlli da visite
            for (const visita of visite) {
                if (visita.prossimoControllo) {
                    calendar.createEvent({
                        id: `controllo-${visita.id}`,
                        start: new Date(visita.prossimoControllo),
                        allDay: true,
                        summary: `Prossimo controllo: ${visita.prestazione?.nome || 'Visita'}`,
                        description: `Ricordati di prenotare il controllo di follow-up.\n\nVisita originale: ${new Date(visita.dataOra).toLocaleDateString('it-IT')}`,
                        alarms: [
                            { type: 'display', trigger: -7 * 24 * 60 * 60, description: 'Controllo medico tra una settimana' },
                            { type: 'display', trigger: -1 * 24 * 60 * 60, description: 'Controllo medico domani' }
                        ]
                    });
                }
            }

            logger.info({
                personId,
                tenantId,
                appuntamentiCount: appuntamenti.length,
                visiteCount: visite.length,
                action: 'generatePersonalFeed'
            }, 'CalendarIntegrationService: Personal feed generated');

            return calendar.toString();
        } catch (error) {
            logger.error({
                error: error.message,
                personId,
                tenantId,
                action: 'generatePersonalFeed'
            }, 'CalendarIntegrationService: Failed to generate personal feed');
            throw error;
        }
    }

    // ==========================================
    // TOKEN MANAGEMENT
    // ==========================================

    /**
     * Genera token sicuro per subscription calendario
     * 
     * @param {string} personId - ID persona
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} Token info
     */
    static async generateCalendarToken(personId, tenantId) {
        try {
            // Genera token sicuro
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

            // Salva token nelle preferenze notifica
            await prisma.notificationPreference.upsert({
                where: {
                    personId_tenantId: { personId, tenantId }
                },
                update: {
                    metadata: {
                        calendarToken: token,
                        calendarTokenExpiresAt: expiresAt.toISOString()
                    }
                },
                create: {
                    personId,
                    tenantId,
                    channels: ['IN_APP'],
                    quietHoursStart: null,
                    quietHoursEnd: null,
                    metadata: {
                        calendarToken: token,
                        calendarTokenExpiresAt: expiresAt.toISOString()
                    }
                }
            });

            // Genera link webcal
            const webcalLink = this.generateWebcalLink(personId, tenantId, token);

            logger.info({
                personId,
                tenantId,
                expiresAt,
                action: 'generateCalendarToken'
            }, 'CalendarIntegrationService: Calendar token generated');

            return {
                token,
                expiresAt,
                webcalLink,
                googleCalendarLink: this.generateGoogleCalendarLink(personId, tenantId, token),
                outlookLink: this.generateOutlookLink(personId, tenantId, token)
            };
        } catch (error) {
            logger.error({
                error: error.message,
                personId,
                tenantId,
                action: 'generateCalendarToken'
            }, 'CalendarIntegrationService: Failed to generate calendar token');
            throw error;
        }
    }

    /**
     * Valida token calendario
     * 
     * @param {string} personId - ID persona
     * @param {string} tenantId - Tenant ID
     * @param {string} token - Token da validare
     * @returns {Promise<boolean>} Token valido
     */
    static async validateCalendarToken(personId, tenantId, token) {
        try {
            const preference = await prisma.notificationPreference.findUnique({
                where: {
                    personId_tenantId: { personId, tenantId }
                },
                select: { metadata: true }
            });

            if (!preference?.metadata) {
                return false;
            }

            const metadata = preference.metadata;

            // Verifica token
            if (metadata.calendarToken !== token) {
                return false;
            }

            // Verifica scadenza
            if (metadata.calendarTokenExpiresAt) {
                const expiresAt = new Date(metadata.calendarTokenExpiresAt);
                if (expiresAt < new Date()) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            logger.error({
                error: error.message,
                personId,
                action: 'validateCalendarToken'
            }, 'CalendarIntegrationService: Failed to validate calendar token');
            return false;
        }
    }

    /**
     * Revoca token calendario
     * 
     * @param {string} personId - ID persona
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<boolean>} Successo
     */
    static async revokeCalendarToken(personId, tenantId) {
        try {
            await prisma.notificationPreference.update({
                where: {
                    personId_tenantId: { personId, tenantId }
                },
                data: {
                    metadata: {
                        calendarToken: null,
                        calendarTokenExpiresAt: null
                    }
                }
            });

            logger.info({
                personId,
                tenantId,
                action: 'revokeCalendarToken'
            }, 'CalendarIntegrationService: Calendar token revoked');

            return true;
        } catch (error) {
            logger.error({
                error: error.message,
                personId,
                tenantId,
                action: 'revokeCalendarToken'
            }, 'CalendarIntegrationService: Failed to revoke calendar token');
            return false;
        }
    }

    // ==========================================
    // LINK GENERATION
    // ==========================================

    /**
     * Genera link webcal per subscription
     * 
     * @param {string} personId - ID persona
     * @param {string} tenantId - Tenant ID  
     * @param {string} token - Token
     * @returns {string} Webcal URL
     */
    static generateWebcalLink(personId, tenantId, token) {
        const baseUrl = process.env.BACKEND_URL || 'http://localhost:4001';
        const cleanUrl = baseUrl.replace(/^https?:\/\//, '');
        return `webcal://${cleanUrl}/api/v1/notifications/calendar/${personId}?token=${token}&tenantId=${tenantId}`;
    }

    /**
     * Genera link per Google Calendar
     * 
     * @param {string} personId - ID persona
     * @param {string} tenantId - Tenant ID
     * @param {string} token - Token
     * @returns {string} Google Calendar URL
     */
    static generateGoogleCalendarLink(personId, tenantId, token) {
        const feedUrl = `${process.env.BACKEND_URL || 'http://localhost:4001'}/api/v1/notifications/calendar/${personId}?token=${token}&tenantId=${tenantId}`;
        return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`;
    }

    /**
     * Genera link per Outlook
     * 
     * @param {string} personId - ID persona
     * @param {string} tenantId - Tenant ID
     * @param {string} token - Token
     * @returns {string} Outlook URL
     */
    static generateOutlookLink(personId, tenantId, token) {
        const feedUrl = `${process.env.BACKEND_URL || 'http://localhost:4001'}/api/v1/notifications/calendar/${personId}?token=${token}&tenantId=${tenantId}`;
        return `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}&name=ElementMedica`;
    }

    // ==========================================
    // SINGLE EVENT ICS
    // ==========================================

    /**
     * Genera ICS per una singola notifica
     * 
     * @param {string} notificationId - ID notifica
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<string|null>} ICS content o null
     */
    static async generateNotificationICS(notificationId, tenantId) {
        try {
            const notification = await prisma.notification.findFirst({
                where: {
                    id: notificationId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    tenant: { select: { name: true } }
                }
            });

            if (!notification) {
                return null;
            }

            // Solo notifiche con entityType supportato
            if (!notification.entityType || !notification.entityId) {
                return null;
            }

            // Genera ICS basato sul tipo entità
            switch (notification.entityType) {
                case 'appuntamento':
                case 'Appuntamento':
                    const appuntamento = await prisma.appuntamento.findFirst({
                        where: {
                            id: notification.entityId,
                            tenantId,
                            deletedAt: null
                        },
                        include: {
                            prestazione: { select: { nome: true } },
                            ambulatorio: {
                                select: {
                                    nome: true,
                                    sede: { select: { nome: true, indirizzo: true } }
                                }
                            },
                            paziente: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    tenantProfiles: {
                                        where: { tenantId },
                                        select: { email: true },
                                        take: 1
                                    }
                                }
                            },
                            medico: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    tenantProfiles: {
                                        where: { tenantId },
                                        select: { email: true },
                                        take: 1
                                    }
                                }
                            }
                        }
                    });

                    if (appuntamento) {
                        // Flatten email from tenantProfiles
                        if (appuntamento.paziente) {
                            appuntamento.paziente.email = appuntamento.paziente.tenantProfiles?.[0]?.email;
                            delete appuntamento.paziente.tenantProfiles;
                        }
                        if (appuntamento.medico) {
                            appuntamento.medico.email = appuntamento.medico.tenantProfiles?.[0]?.email;
                            delete appuntamento.medico.tenantProfiles;
                        }
                        return this.generateAppointmentICS(appuntamento, notification.tenant);
                    }
                    break;

                case 'visita':
                case 'Visita':
                    const visita = await prisma.visita.findFirst({
                        where: {
                            id: notification.entityId,
                            tenantId,
                            deletedAt: null
                        },
                        include: {
                            prestazione: { select: { nome: true } },
                            ambulatorio: { select: { nome: true } },
                            paziente: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    tenantProfiles: {
                                        where: { tenantId },
                                        select: { email: true },
                                        take: 1
                                    }
                                }
                            },
                            medico: { select: { firstName: true, lastName: true } }
                        }
                    });

                    if (visita) {
                        // Flatten email from tenantProfiles
                        if (visita.paziente) {
                            visita.paziente.email = visita.paziente.tenantProfiles?.[0]?.email;
                            delete visita.paziente.tenantProfiles;
                        }
                        return this.generateVisitaICS(visita, notification.tenant);
                    }
                    break;

                default:
                    logger.warn({
                        notificationId,
                        entityType: notification.entityType,
                        action: 'generateNotificationICS'
                    }, 'CalendarIntegrationService: Unsupported entity type for ICS');
                    return null;
            }

            return null;
        } catch (error) {
            logger.error({
                error: error.message,
                notificationId,
                tenantId,
                action: 'generateNotificationICS'
            }, 'CalendarIntegrationService: Failed to generate notification ICS');
            throw error;
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Verifica se una notifica supporta ICS
     * 
     * @param {Object} notification - Notifica
     * @returns {boolean} Supporta ICS
     */
    static supportsICS(notification) {
        const supportedTypes = ['appuntamento', 'Appuntamento', 'visita', 'Visita', 'corso', 'Corso'];
        return notification?.entityType && supportedTypes.includes(notification.entityType);
    }

    /**
     * Get ICS filename per notification
     * 
     * @param {Object} notification - Notifica
     * @returns {string} Filename
     */
    static getICSFilename(notification) {
        const date = new Date().toISOString().split('T')[0];
        const type = notification?.entityType?.toLowerCase() || 'event';
        return `elementmedica-${type}-${date}.ics`;
    }
}

export default CalendarIntegrationService;
