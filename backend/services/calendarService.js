/**
 * Calendar Service
 * 
 * Calendar integration service for ElementMedica.
 * Supports ICS export and Google Calendar sync.
 * 
 * Features:
 * - ICS file generation for appointments
 * - Google Calendar sync (read/write)
 * - iCal feed URL for subscription
 * - Multi-tenant support
 * 
 * @module services/calendarService
 * @version 1.0.0
 */

import { google } from 'googleapis';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

// ============================================
// ICS GENERATION
// ============================================

/**
 * Generate ICS content for an appointment
 * @param {Object} appointment - Appointment data
 * @param {Object} options - Generation options
 * @returns {string} ICS file content
 */
const generateICS = (appointment, options = {}) => {
    const {
        clinicName = 'ElementMedica',
        clinicEmail = 'info@elementmedica.it',
        timezone = 'Europe/Rome'
    } = options;

    // Format dates for ICS (UTC)
    const formatICSDate = (date) => {
        const d = new Date(date);
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const startDate = new Date(appointment.dataOra);
    const endDate = new Date(startDate.getTime() + (appointment.durataPrevista || 30) * 60 * 1000);

    const uid = `${appointment.id}@${clinicName.toLowerCase().replace(/\s+/g, '')}.calendar`;
    const dtstamp = formatICSDate(new Date());
    const dtstart = formatICSDate(startDate);
    const dtend = formatICSDate(endDate);

    // Escape special characters for ICS
    const escapeICS = (str) => {
        if (!str) return '';
        return str
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    };

    const summary = escapeICS(
        appointment.prestazione?.nome || 'Appuntamento Medico'
    );

    const description = escapeICS([
        `Prestazione: ${appointment.prestazione?.nome || 'Visita'}`,
        appointment.medico ? `Medico: Dr. ${appointment.medico.cognome}` : '',
        appointment.note ? `Note: ${appointment.note}` : '',
        '',
        `Prenotazione confermata presso ${clinicName}`,
        'Si prega di presentarsi 15 minuti prima dell\'appuntamento.'
    ].filter(Boolean).join('\n'));

    const location = escapeICS(
        appointment.ambulatorio?.indirizzo ||
        appointment.tenant?.settings?.indirizzo ||
        clinicName
    );

    const organizer = `ORGANIZER;CN=${escapeICS(clinicName)}:mailto:${clinicEmail}`;

    // Build ICS content
    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        `PRODID:-//${clinicName}//ElementMedica Calendar//IT`,
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeICS(clinicName)} - Appuntamenti`,
        `X-WR-TIMEZONE:${timezone}`,
        '',
        // Timezone definition
        'BEGIN:VTIMEZONE',
        `TZID:${timezone}`,
        'BEGIN:STANDARD',
        'DTSTART:19710101T030000',
        'TZOFFSETFROM:+0200',
        'TZOFFSETTO:+0100',
        'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
        'TZNAME:CET',
        'END:STANDARD',
        'BEGIN:DAYLIGHT',
        'DTSTART:19710101T020000',
        'TZOFFSETFROM:+0100',
        'TZOFFSETTO:+0200',
        'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
        'TZNAME:CEST',
        'END:DAYLIGHT',
        'END:VTIMEZONE',
        '',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;TZID=${timezone}:${dtstart.substring(0, 15)}`,
        `DTEND;TZID=${timezone}:${dtend.substring(0, 15)}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        organizer,
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        // Reminder 1 day before
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Promemoria appuntamento',
        'TRIGGER:-P1D',
        'END:VALARM',
        // Reminder 1 hour before
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Appuntamento tra 1 ora',
        'TRIGGER:-PT1H',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
};

/**
 * Generate ICS for multiple appointments (calendar feed)
 */
const generateICSFeed = (appointments, options = {}) => {
    const {
        clinicName = 'ElementMedica',
        timezone = 'Europe/Rome'
    } = options;

    const formatICSDate = (date) => {
        const d = new Date(date);
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const escapeICS = (str) => {
        if (!str) return '';
        return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    };

    // Header
    const header = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        `PRODID:-//${clinicName}//ElementMedica Calendar//IT`,
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeICS(clinicName)} - Appuntamenti`,
        `X-WR-TIMEZONE:${timezone}`,
        '',
        // Timezone
        'BEGIN:VTIMEZONE',
        `TZID:${timezone}`,
        'BEGIN:STANDARD',
        'DTSTART:19710101T030000',
        'TZOFFSETFROM:+0200',
        'TZOFFSETTO:+0100',
        'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
        'END:STANDARD',
        'BEGIN:DAYLIGHT',
        'DTSTART:19710101T020000',
        'TZOFFSETFROM:+0100',
        'TZOFFSETTO:+0200',
        'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
        'END:DAYLIGHT',
        'END:VTIMEZONE',
        ''
    ].join('\r\n');

    // Events
    const events = appointments.map(apt => {
        const startDate = new Date(apt.dataOra);
        const endDate = new Date(startDate.getTime() + (apt.durataPrevista || 30) * 60 * 1000);
        const uid = `${apt.id}@${clinicName.toLowerCase().replace(/\s+/g, '')}.calendar`;

        return [
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${formatICSDate(new Date())}`,
            `DTSTART;TZID=${timezone}:${formatICSDate(startDate).substring(0, 15)}`,
            `DTEND;TZID=${timezone}:${formatICSDate(endDate).substring(0, 15)}`,
            `SUMMARY:${escapeICS(apt.prestazione?.nome || 'Appuntamento')}`,
            `DESCRIPTION:${escapeICS(apt.note || '')}`,
            'STATUS:CONFIRMED',
            'END:VEVENT'
        ].join('\r\n');
    }).join('\r\n');

    return header + events + '\r\nEND:VCALENDAR';
};

// ============================================
// CALENDAR SERVICE CLASS
// ============================================

export class CalendarService {

    /**
     * Generate ICS file for single appointment
     * @param {string} appointmentId - Appointment ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object>} ICS content and metadata
     */
    static async generateAppointmentICS(appointmentId, tenantId) {
        try {
            const appointment = await prisma.appuntamento.findFirst({
                where: {
                    id: appointmentId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    prestazione: { select: { nome: true } },
                    medico: { select: { nome: true, cognome: true } },
                    ambulatorio: { select: { nome: true, indirizzo: true } },
                    paziente: { select: { nome: true, cognome: true } },
                    tenant: { select: { name: true, settings: true } }
                }
            });

            if (!appointment) {
                throw new Error('Appointment not found');
            }

            const clinicName = appointment.tenant?.name || 'ElementMedica';
            const clinicEmail = appointment.tenant?.settings?.email || 'info@elementmedica.it';

            const icsContent = generateICS(appointment, { clinicName, clinicEmail });

            const filename = `appuntamento-${new Date(appointment.dataOra).toISOString().split('T')[0]}.ics`;

            logger.info('ICS file generated', {
                component: 'CalendarService',
                action: 'generateAppointmentICS',
                appointmentId,
                tenantId
            });

            return {
                content: icsContent,
                filename,
                contentType: 'text/calendar',
                appointment: {
                    id: appointment.id,
                    date: appointment.dataOra,
                    prestazione: appointment.prestazione?.nome,
                    patient: `${appointment.paziente?.nome} ${appointment.paziente?.cognome}`
                }
            };
        } catch (error) {
            logger.error('Failed to generate ICS', {
                component: 'CalendarService',
                action: 'generateAppointmentICS',
                appointmentId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Generate ICS feed for doctor's appointments
     * @param {string} medicoId - Doctor ID
     * @param {Object} options - Filter options
     * @param {string} tenantId - Tenant ID
     */
    static async generateDoctorCalendarFeed(medicoId, options = {}, tenantId) {
        try {
            const { startDate, endDate } = options;

            const where = {
                medicoId,
                tenantId,
                deletedAt: null,
                stato: { notIn: ['ANNULLATO', 'NO_SHOW'] }
            };

            if (startDate) {
                where.dataOra = { gte: new Date(startDate) };
            }
            if (endDate) {
                where.dataOra = { ...where.dataOra, lte: new Date(endDate) };
            }

            const appointments = await prisma.appuntamento.findMany({
                where,
                include: {
                    prestazione: { select: { nome: true } },
                    paziente: { select: { nome: true, cognome: true } },
                    ambulatorio: { select: { nome: true } }
                },
                orderBy: { dataOra: 'asc' },
                take: 500 // Limit for performance
            });

            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { name: true }
            });

            const icsContent = generateICSFeed(appointments, {
                clinicName: tenant?.name || 'ElementMedica'
            });

            logger.info('Doctor calendar feed generated', {
                component: 'CalendarService',
                action: 'generateDoctorCalendarFeed',
                medicoId,
                appointmentsCount: appointments.length,
                tenantId
            });

            return {
                content: icsContent,
                filename: `calendario-${medicoId}.ics`,
                contentType: 'text/calendar',
                appointmentsCount: appointments.length
            };
        } catch (error) {
            logger.error('Failed to generate doctor calendar feed', {
                component: 'CalendarService',
                action: 'generateDoctorCalendarFeed',
                medicoId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Generate ICS feed for patient's appointments
     */
    static async generatePatientCalendarFeed(patientId, options = {}, tenantId) {
        try {
            const { startDate, endDate } = options;

            const where = {
                pazienteId: patientId,
                tenantId,
                deletedAt: null,
                stato: { notIn: ['ANNULLATO', 'NO_SHOW'] }
            };

            if (startDate) {
                where.dataOra = { gte: new Date(startDate) };
            }
            if (endDate) {
                where.dataOra = { ...where.dataOra, lte: new Date(endDate) };
            }

            const appointments = await prisma.appuntamento.findMany({
                where,
                include: {
                    prestazione: { select: { nome: true } },
                    medico: { select: { nome: true, cognome: true } },
                    ambulatorio: { select: { nome: true, indirizzo: true } }
                },
                orderBy: { dataOra: 'asc' },
                take: 100
            });

            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { name: true }
            });

            const icsContent = generateICSFeed(appointments, {
                clinicName: tenant?.name || 'ElementMedica'
            });

            return {
                content: icsContent,
                filename: `i-miei-appuntamenti.ics`,
                contentType: 'text/calendar',
                appointmentsCount: appointments.length
            };
        } catch (error) {
            logger.error('Failed to generate patient calendar feed', {
                component: 'CalendarService',
                action: 'generatePatientCalendarFeed',
                patientId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    // ============================================
    // GOOGLE CALENDAR INTEGRATION
    // ============================================

    /**
     * Get Google Calendar OAuth2 client
     * Requires user to have connected Google account
     */
    static async getGoogleCalendarClient(userId, tenantId) {
        try {
            // Get user's Google tokens
            const person = await prisma.person.findFirst({
                where: { id: userId, tenantId, deletedAt: null },
                select: { googleTokens: true }
            });

            if (!person?.googleTokens) {
                throw new Error('Google account not connected');
            }

            const tokens = person.googleTokens;

            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );

            oauth2Client.setCredentials(tokens);

            // Refresh token if expired
            if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
                const { credentials } = await oauth2Client.refreshAccessToken();

                await prisma.person.update({
                    where: { id: userId },
                    data: { googleTokens: credentials }
                });

                oauth2Client.setCredentials(credentials);
            }

            return google.calendar({ version: 'v3', auth: oauth2Client });
        } catch (error) {
            logger.error('Failed to get Google Calendar client', {
                component: 'CalendarService',
                action: 'getGoogleCalendarClient',
                userId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Sync appointment to Google Calendar
     */
    static async syncToGoogleCalendar(appointmentId, userId, tenantId) {
        try {
            const calendar = await this.getGoogleCalendarClient(userId, tenantId);

            const appointment = await prisma.appuntamento.findFirst({
                where: { id: appointmentId, tenantId, deletedAt: null },
                include: {
                    prestazione: { select: { nome: true } },
                    medico: { select: { nome: true, cognome: true } },
                    ambulatorio: { select: { nome: true, indirizzo: true } },
                    tenant: { select: { name: true, settings: true } }
                }
            });

            if (!appointment) {
                throw new Error('Appointment not found');
            }

            const startDateTime = new Date(appointment.dataOra);
            const endDateTime = new Date(startDateTime.getTime() + (appointment.durataPrevista || 30) * 60 * 1000);

            const event = {
                summary: appointment.prestazione?.nome || 'Appuntamento Medico',
                description: [
                    `Prestazione: ${appointment.prestazione?.nome || 'Visita'}`,
                    appointment.medico ? `Medico: Dr. ${appointment.medico.cognome}` : '',
                    appointment.note || '',
                    '',
                    `Prenotazione presso ${appointment.tenant?.name || 'ElementMedica'}`
                ].filter(Boolean).join('\n'),
                location: appointment.ambulatorio?.indirizzo || appointment.tenant?.settings?.indirizzo || '',
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: 'Europe/Rome'
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: 'Europe/Rome'
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 60 },
                        { method: 'popup', minutes: 1440 } // 1 day
                    ]
                },
                // Store appointment ID for future reference
                extendedProperties: {
                    private: {
                        elementMedicaId: appointmentId,
                        tenantId
                    }
                }
            };

            // Check if already synced
            const existingEvents = await calendar.events.list({
                calendarId: 'primary',
                privateExtendedProperty: `elementMedicaId=${appointmentId}`,
                maxResults: 1
            });

            let result;
            if (existingEvents.data.items?.length > 0) {
                // Update existing event
                result = await calendar.events.update({
                    calendarId: 'primary',
                    eventId: existingEvents.data.items[0].id,
                    requestBody: event
                });

                logger.info('Google Calendar event updated', {
                    component: 'CalendarService',
                    action: 'syncToGoogleCalendar',
                    appointmentId,
                    eventId: result.data.id,
                    tenantId
                });
            } else {
                // Create new event
                result = await calendar.events.insert({
                    calendarId: 'primary',
                    requestBody: event
                });

                logger.info('Google Calendar event created', {
                    component: 'CalendarService',
                    action: 'syncToGoogleCalendar',
                    appointmentId,
                    eventId: result.data.id,
                    tenantId
                });
            }

            return {
                success: true,
                eventId: result.data.id,
                htmlLink: result.data.htmlLink
            };
        } catch (error) {
            logger.error('Failed to sync to Google Calendar', {
                component: 'CalendarService',
                action: 'syncToGoogleCalendar',
                appointmentId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Remove appointment from Google Calendar
     */
    static async removeFromGoogleCalendar(appointmentId, userId, tenantId) {
        try {
            const calendar = await this.getGoogleCalendarClient(userId, tenantId);

            const existingEvents = await calendar.events.list({
                calendarId: 'primary',
                privateExtendedProperty: `elementMedicaId=${appointmentId}`,
                maxResults: 1
            });

            if (existingEvents.data.items?.length > 0) {
                await calendar.events.delete({
                    calendarId: 'primary',
                    eventId: existingEvents.data.items[0].id
                });

                logger.info('Google Calendar event deleted', {
                    component: 'CalendarService',
                    action: 'removeFromGoogleCalendar',
                    appointmentId,
                    eventId: existingEvents.data.items[0].id,
                    tenantId
                });

                return { success: true, deleted: true };
            }

            return { success: true, deleted: false, reason: 'Event not found' };
        } catch (error) {
            logger.error('Failed to remove from Google Calendar', {
                component: 'CalendarService',
                action: 'removeFromGoogleCalendar',
                appointmentId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get user's Google Calendar list
     */
    static async getGoogleCalendars(userId, tenantId) {
        try {
            const calendar = await this.getGoogleCalendarClient(userId, tenantId);

            const result = await calendar.calendarList.list();

            return result.data.items.map(cal => ({
                id: cal.id,
                summary: cal.summary,
                primary: cal.primary || false,
                accessRole: cal.accessRole
            }));
        } catch (error) {
            logger.error('Failed to get Google Calendars', {
                component: 'CalendarService',
                action: 'getGoogleCalendars',
                userId,
                error: error.message,
                tenantId
            });
            throw error;
        }
    }
}

export default CalendarService;
