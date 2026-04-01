/**
 * NotificationEventHandler.js
 * 
 * Event handler che trasforma Domain Events in Notifiche.
 * Ascolta gli eventi dal bus e genera notifiche appropriate.
 * 
 * PROGETTO 47 - FASE 2: Event Bus & Domain Events
 * 
 * Features:
 * - Handler specifici per ogni categoria di eventi
 * - Integrazione con NotificationService
 * - Logica built-in per scenari comuni
 * - Supporto per rule engine (Fase 3)
 * 
 * @module services/events/handlers/NotificationEventHandler
 * @version 1.0.0
 */

import { EventBus } from '../EventBus.js';
import NotificationService from '../../notifications/NotificationService.js';
import logger from '../../../utils/logger.js';
import {
    AppointmentEvents,
    VisitaEvents,
    InvoiceEvents,
    DocumentEvents,
    CourseEvents,
    ScheduleEvents,
    PersonEvents,
    CompanyEvents,
    SystemEvents
} from '../DomainEvents.js';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Formatta data in italiano
 * @param {Date|string} date - Data
 * @returns {string} Data formattata
 */
const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
};

/**
 * Formatta data e ora in italiano
 * @param {Date|string} dateTime - Data e ora
 * @returns {string} Data/ora formattata
 */
const formatDateTime = (dateTime) => {
    const d = new Date(dateTime);
    return d.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Formatta importo in Euro
 * @param {number} amount - Importo
 * @returns {string} Importo formattato
 */
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
};

// ============================================
// NOTIFICATION EVENT HANDLER CLASS
// ============================================

export class NotificationEventHandler {
    static registered = false;

    // ==========================================
    // REGISTRATION
    // ==========================================

    /**
     * Registra tutti gli handler per gli eventi
     */
    static register() {
        if (this.registered) {
            logger.warn('NotificationEventHandler: Already registered');
            return;
        }

        logger.info('NotificationEventHandler: Registering handlers...');

        // Registra handler per categoria
        this.registerAppointmentHandlers();
        this.registerVisitaHandlers();
        this.registerInvoiceHandlers();
        this.registerDocumentHandlers();
        this.registerCourseHandlers();
        this.registerScheduleHandlers();
        this.registerPersonHandlers();
        this.registerCompanyHandlers();
        this.registerSystemHandlers();

        this.registered = true;
        logger.info('NotificationEventHandler: All handlers registered successfully');
    }

    /**
     * Rimuove tutti gli handler registrati
     */
    static unregister() {
        // EventBus gestisce internamente gli handler
        // Per ora logghiamo solo
        this.registered = false;
        logger.info('NotificationEventHandler: Unregistered');
    }

    // ==========================================
    // APPUNTAMENTI HANDLERS
    // ==========================================

    static registerAppointmentHandlers() {
        // Nuovo appuntamento creato
        EventBus.subscribe(
            AppointmentEvents.CREATED,
            async (event) => {
                const { appointmentId, patientId, doctorId, dateTime, type, tenantId } = event.payload;

                // Notifica al paziente
                if (patientId) {
                    await NotificationService.sendToPerson(patientId, {
                        title: '📅 Nuovo Appuntamento Confermato',
                        body: `Hai un appuntamento ${type ? `per ${type} ` : ''}programmato per ${formatDateTime(dateTime)}`,
                        type: 'INFO',
                        category: 'APPOINTMENT',
                        priority: 'NORMAL',
                        channels: ['IN_APP', 'EMAIL'],
                        entityType: 'Appuntamento',
                        entityId: appointmentId,
                        actionUrl: `/clinica/appuntamenti/${appointmentId}`,
                        actionLabel: 'Visualizza Dettagli'
                    }, tenantId);
                }

                // Notifica al medico
                if (doctorId && doctorId !== patientId) {
                    await NotificationService.sendToPerson(doctorId, {
                        title: '📅 Nuovo Appuntamento',
                        body: `Nuovo appuntamento assegnato per ${formatDateTime(dateTime)}`,
                        type: 'INFO',
                        category: 'APPOINTMENT',
                        priority: 'NORMAL',
                        channels: ['IN_APP'],
                        entityType: 'Appuntamento',
                        entityId: appointmentId
                    }, tenantId);
                }

                logger.debug({ appointmentId }, 'NotificationEventHandler: APPOINTMENT_CREATED processed');
            }
        );

        // Appuntamento cancellato
        EventBus.subscribe(
            AppointmentEvents.CANCELLED,
            async (event) => {
                const { appointmentId, patientId, doctorId, reason, dateTime, tenantId } = event.payload;

                if (patientId) {
                    await NotificationService.sendToPerson(patientId, {
                        title: '❌ Appuntamento Cancellato',
                        body: reason
                            ? `Il tuo appuntamento del ${formatDateTime(dateTime)} è stato cancellato. Motivo: ${reason}`
                            : `Il tuo appuntamento del ${formatDateTime(dateTime)} è stato cancellato`,
                        type: 'WARNING',
                        category: 'APPOINTMENT',
                        priority: 'HIGH',
                        channels: ['IN_APP', 'EMAIL', 'SMS'],
                        entityType: 'Appuntamento',
                        entityId: appointmentId,
                        actionUrl: '/prenota',
                        actionLabel: 'Prenota Nuovo'
                    }, tenantId);
                }

                logger.debug({ appointmentId }, 'NotificationEventHandler: APPOINTMENT_CANCELLED processed');
            }
        );

        // Conflitto rilevato
        EventBus.subscribe(
            AppointmentEvents.CONFLICT_DETECTED,
            async (event) => {
                const { appointmentIds, conflictType, assigneeId, tenantId } = event.payload;

                if (assigneeId) {
                    await NotificationService.sendToPerson(assigneeId, {
                        title: '⚠️ Conflitto Agenda Rilevato',
                        body: `Rilevato ${conflictType || 'conflitto'} per ${appointmentIds?.length || 'alcuni'} appuntamenti. Verifica il calendario.`,
                        type: 'WARNING',
                        category: 'SYSTEM',
                        priority: 'HIGH',
                        channels: ['IN_APP'],
                        requiresConfirmation: true,
                        actionUrl: '/clinica/calendario',
                        actionLabel: 'Vai al Calendario'
                    }, tenantId);
                }

                logger.debug({ appointmentIds }, 'NotificationEventHandler: APPOINTMENT_CONFLICT processed');
            }
        );

        // Reminder appuntamento
        EventBus.subscribe(
            AppointmentEvents.REMINDER_24H,
            async (event) => {
                const { appointmentId, patientId, dateTime, location, tenantId } = event.payload;

                if (patientId) {
                    await NotificationService.sendToPerson(patientId, {
                        title: '⏰ Promemoria Appuntamento',
                        body: `Ricordati del tuo appuntamento domani alle ${formatDateTime(dateTime)}${location ? ` presso ${location}` : ''}`,
                        type: 'INFO',
                        category: 'APPOINTMENT',
                        priority: 'NORMAL',
                        channels: ['IN_APP', 'EMAIL', 'SMS'],
                        entityType: 'Appuntamento',
                        entityId: appointmentId,
                        isDismissable: true
                    }, tenantId);
                }
            }
        );
    }

    // ==========================================
    // VISITE HANDLERS
    // ==========================================

    static registerVisitaHandlers() {
        // Risultati visita disponibili
        EventBus.subscribe(
            VisitaEvents.RESULT_AVAILABLE,
            async (event) => {
                const { visitaId, patientId, visitaType, tenantId } = event.payload;

                if (patientId) {
                    await NotificationService.sendToPerson(patientId, {
                        title: '📋 Risultati Visita Disponibili',
                        body: `I risultati della tua ${visitaType || 'visita'} sono ora disponibili`,
                        type: 'SUCCESS',
                        category: 'HEALTH',
                        priority: 'NORMAL',
                        channels: ['IN_APP', 'EMAIL'],
                        entityType: 'Visita',
                        entityId: visitaId,
                        actionUrl: `/visite/${visitaId}`,
                        actionLabel: 'Visualizza Risultati'
                    }, tenantId);
                }

                logger.debug({ visitaId }, 'NotificationEventHandler: VISITA_RESULT_AVAILABLE processed');
            }
        );

        // Visita in scadenza
        EventBus.subscribe(
            VisitaEvents.EXPIRING,
            async (event) => {
                const { visitaId, patientId, visitaType, expiryDate, daysUntilExpiry, tenantId } = event.payload;

                if (patientId) {
                    await NotificationService.sendToPerson(patientId, {
                        title: '⚠️ Visita in Scadenza',
                        body: `La tua ${visitaType || 'visita'} scadrà ${daysUntilExpiry ? `tra ${daysUntilExpiry} giorni` : `il ${formatDate(expiryDate)}`}. Prenota il rinnovo.`,
                        type: 'WARNING',
                        category: 'HEALTH',
                        priority: 'HIGH',
                        channels: ['IN_APP', 'EMAIL'],
                        entityType: 'Visita',
                        entityId: visitaId,
                        actionUrl: `/prenota?tipo=${encodeURIComponent(visitaType || 'visita')}`,
                        actionLabel: 'Prenota Rinnovo'
                    }, tenantId);
                }

                logger.debug({ visitaId }, 'NotificationEventHandler: VISITA_EXPIRING processed');
            }
        );

        // Visita completata
        EventBus.subscribe(
            VisitaEvents.COMPLETED,
            async (event) => {
                const { visitaId, patientId, doctorName, tenantId } = event.payload;

                if (patientId) {
                    await NotificationService.sendToPerson(patientId, {
                        title: '✅ Visita Completata',
                        body: doctorName
                            ? `La tua visita con ${doctorName} è stata completata. I risultati saranno disponibili a breve.`
                            : 'La tua visita è stata completata. I risultati saranno disponibili a breve.',
                        type: 'SUCCESS',
                        category: 'HEALTH',
                        priority: 'NORMAL',
                        channels: ['IN_APP'],
                        entityType: 'Visita',
                        entityId: visitaId
                    }, tenantId);
                }
            }
        );
    }

    // ==========================================
    // FATTURE HANDLERS
    // ==========================================

    static registerInvoiceHandlers() {
        // Fattura scaduta
        EventBus.subscribe(
            InvoiceEvents.OVERDUE,
            async (event) => {
                const { invoiceId, customerId, amount, dueDate, invoiceNumber, tenantId } = event.payload;

                if (customerId) {
                    await NotificationService.sendToPerson(customerId, {
                        title: '🔴 Fattura Scaduta',
                        body: `La fattura ${invoiceNumber || ''} di ${formatCurrency(amount)} è scaduta il ${formatDate(dueDate)}. Ti preghiamo di regolarizzare il pagamento.`,
                        type: 'ERROR',
                        category: 'BILLING',
                        priority: 'HIGH',
                        channels: ['IN_APP', 'EMAIL'],
                        entityType: 'Fattura',
                        entityId: invoiceId,
                        actionUrl: `/fatture/${invoiceId}/paga`,
                        actionLabel: 'Paga Ora'
                    }, tenantId);
                }

                logger.debug({ invoiceId }, 'NotificationEventHandler: INVOICE_OVERDUE processed');
            }
        );

        // Pagamento ricevuto
        EventBus.subscribe(
            InvoiceEvents.PAID,
            async (event) => {
                const { invoiceId, customerId, amount, invoiceNumber, tenantId } = event.payload;

                if (customerId) {
                    await NotificationService.sendToPerson(customerId, {
                        title: '✅ Pagamento Ricevuto',
                        body: `Abbiamo ricevuto il pagamento di ${formatCurrency(amount)}${invoiceNumber ? ` per la fattura ${invoiceNumber}` : ''}. Grazie!`,
                        type: 'SUCCESS',
                        category: 'BILLING',
                        priority: 'NORMAL',
                        channels: ['IN_APP', 'EMAIL'],
                        entityType: 'Fattura',
                        entityId: invoiceId
                    }, tenantId);
                }

                logger.debug({ invoiceId }, 'NotificationEventHandler: INVOICE_PAID processed');
            }
        );

        // Reminder pagamento
        EventBus.subscribe(
            InvoiceEvents.REMINDER,
            async (event) => {
                const { invoiceId, customerId, amount, dueDate, daysUntilDue, tenantId } = event.payload;

                if (customerId) {
                    await NotificationService.sendToPerson(customerId, {
                        title: '📌 Promemoria Pagamento',
                        body: `La fattura di ${formatCurrency(amount)} scade ${daysUntilDue ? `tra ${daysUntilDue} giorni` : `il ${formatDate(dueDate)}`}.`,
                        type: 'WARNING',
                        category: 'BILLING',
                        priority: 'NORMAL',
                        channels: ['IN_APP', 'EMAIL'],
                        entityType: 'Fattura',
                        entityId: invoiceId,
                        actionUrl: `/fatture/${invoiceId}`,
                        actionLabel: 'Visualizza Fattura',
                        isDismissable: true
                    }, tenantId);
                }
            }
        );
    }

    // ==========================================
    // DOCUMENTI HANDLERS
    // ==========================================

    static registerDocumentHandlers() {
        // Richiesta firma
        EventBus.subscribe(
            DocumentEvents.SIGNATURE_REQUESTED,
            async (event) => {
                const { documentId, signerId, documentName, requesterId, requesterName, tenantId } = event.payload;

                if (signerId) {
                    await NotificationService.sendToPerson(signerId, {
                        title: '✍️ Firma Documento Richiesta',
                        body: requesterName
                            ? `${requesterName} richiede la tua firma su "${documentName}"`
                            : `È richiesta la tua firma su "${documentName}"`,
                        type: 'ACTION',
                        category: 'DOCUMENT',
                        priority: 'HIGH',
                        channels: ['IN_APP', 'EMAIL'],
                        entityType: 'Documento',
                        entityId: documentId,
                        actionUrl: `/documenti/${documentId}/firma`,
                        actionLabel: 'Firma Ora',
                        requiresConfirmation: true
                    }, tenantId);
                }

                logger.debug({ documentId }, 'NotificationEventHandler: DOCUMENT_SIGNATURE_REQUESTED processed');
            }
        );

        // Documento in scadenza
        EventBus.subscribe(
            DocumentEvents.EXPIRING,
            async (event) => {
                const { documentId, ownerId, documentName, expiryDate, daysUntilExpiry, tenantId } = event.payload;

                if (ownerId) {
                    await NotificationService.sendToPerson(ownerId, {
                        title: '📄 Documento in Scadenza',
                        body: `"${documentName}" scadrà ${daysUntilExpiry ? `tra ${daysUntilExpiry} giorni` : `il ${formatDate(expiryDate)}`}`,
                        type: 'WARNING',
                        category: 'DOCUMENT',
                        priority: 'NORMAL',
                        channels: ['IN_APP'],
                        entityType: 'Documento',
                        entityId: documentId,
                        isDismissable: true
                    }, tenantId);
                }
            }
        );

        // Documento firmato
        EventBus.subscribe(
            DocumentEvents.SIGNED,
            async (event) => {
                const { documentId, requesterId, signerName, documentName, tenantId } = event.payload;

                if (requesterId) {
                    await NotificationService.sendToPerson(requesterId, {
                        title: '✅ Documento Firmato',
                        body: `${signerName || 'L\'utente'} ha firmato "${documentName}"`,
                        type: 'SUCCESS',
                        category: 'DOCUMENT',
                        priority: 'NORMAL',
                        channels: ['IN_APP'],
                        entityType: 'Documento',
                        entityId: documentId
                    }, tenantId);
                }
            }
        );
    }

    // ==========================================
    // CORSI HANDLERS
    // ==========================================

    static registerCourseHandlers() {
        // Iscrizione a corso
        EventBus.subscribe(
            CourseEvents.ENROLLMENT,
            async (event) => {
                const { courseId, personId, courseName, startDate, tenantId } = event.payload;

                if (personId) {
                    await NotificationService.sendToPerson(personId, {
                        title: '📚 Iscrizione Confermata',
                        body: `Sei iscritto al corso "${courseName}"${startDate ? `. Inizio: ${formatDate(startDate)}` : ''}`,
                        type: 'SUCCESS',
                        category: 'TRAINING',
                        priority: 'NORMAL',
                        channels: ['IN_APP', 'EMAIL'],
                        entityType: 'Corso',
                        entityId: courseId,
                        actionUrl: `/formazione/corsi/${courseId}`,
                        actionLabel: 'Vai al Corso'
                    }, tenantId);
                }

                logger.debug({ courseId }, 'NotificationEventHandler: COURSE_ENROLLMENT processed');
            }
        );

        // Certificato in scadenza
        EventBus.subscribe(
            CourseEvents.CERTIFICATE_EXPIRING,
            async (event) => {
                const { courseId, personId, courseName, expiryDate, daysUntilExpiry, tenantId } = event.payload;

                if (personId) {
                    await NotificationService.sendToPerson(personId, {
                        title: '⚠️ Certificazione in Scadenza',
                        body: `La certificazione "${courseName}" scadrà ${daysUntilExpiry ? `tra ${daysUntilExpiry} giorni` : `il ${formatDate(expiryDate)}`}`,
                        type: 'WARNING',
                        category: 'TRAINING',
                        priority: 'HIGH',
                        channels: ['IN_APP', 'EMAIL'],
                        entityType: 'Corso',
                        entityId: courseId,
                        actionUrl: `/formazione/rinnova/${courseId}`,
                        actionLabel: 'Rinnova Certificazione'
                    }, tenantId);
                }

                logger.debug({ courseId }, 'NotificationEventHandler: CERTIFICATE_EXPIRING processed');
            }
        );

        // Attestato emesso
        EventBus.subscribe(
            CourseEvents.CERTIFICATE_ISSUED,
            async (event) => {
                const { courseId, personId, courseName, certificateId, tenantId } = event.payload;

                if (personId) {
                    await NotificationService.sendToPerson(personId, {
                        title: '🎓 Attestato Disponibile',
                        body: `Il tuo attestato per "${courseName}" è pronto per il download`,
                        type: 'SUCCESS',
                        category: 'TRAINING',
                        priority: 'NORMAL',
                        channels: ['IN_APP', 'EMAIL'],
                        entityType: 'Attestato',
                        entityId: certificateId || courseId,
                        actionUrl: `/attestati/${certificateId || courseId}`,
                        actionLabel: 'Scarica Attestato'
                    }, tenantId);
                }
            }
        );
    }

    // ==========================================
    // PROGRAMMAZIONI HANDLERS
    // ==========================================

    static registerScheduleHandlers() {
        // Programmazione in partenza
        EventBus.subscribe(
            ScheduleEvents.STARTING_SOON,
            async (event) => {
                const { scheduleId, participantIds, courseName, startDate, location, tenantId } = event.payload;

                if (participantIds && participantIds.length > 0) {
                    for (const participantId of participantIds) {
                        await NotificationService.sendToPerson(participantId, {
                            title: '📅 Corso in Partenza Domani',
                            body: `Promemoria: "${courseName}" inizia domani${location ? ` presso ${location}` : ''}`,
                            type: 'INFO',
                            category: 'TRAINING',
                            priority: 'NORMAL',
                            channels: ['IN_APP', 'EMAIL'],
                            entityType: 'Programmazione',
                            entityId: scheduleId,
                            isDismissable: true
                        }, tenantId);
                    }
                }

                logger.debug({ scheduleId }, 'NotificationEventHandler: SCHEDULE_STARTING_SOON processed');
            }
        );
    }

    // ==========================================
    // PERSONE HANDLERS
    // ==========================================

    static registerPersonHandlers() {
        // Benvenuto nuovo utente
        EventBus.subscribe(
            PersonEvents.CREATED,
            async (event) => {
                const { personId, firstName, email, tenantId } = event.payload;

                if (personId) {
                    await NotificationService.sendToPerson(personId, {
                        title: `👋 Benvenuto${firstName ? `, ${firstName}` : ''}!`,
                        body: 'Il tuo account è stato creato con successo. Scopri tutte le funzionalità disponibili.',
                        type: 'INFO',
                        category: 'SYSTEM',
                        priority: 'NORMAL',
                        channels: ['IN_APP', 'EMAIL'],
                        actionUrl: '/guida-rapida',
                        actionLabel: 'Scopri di più',
                        isDismissable: true
                    }, tenantId);
                }

                logger.debug({ personId }, 'NotificationEventHandler: PERSON_CREATED processed');
            }
        );

        // Password cambiata
        EventBus.subscribe(
            PersonEvents.PASSWORD_CHANGED,
            async (event) => {
                const { personId, ipAddress, userAgent, tenantId } = event.payload;

                if (personId) {
                    await NotificationService.sendToPerson(personId, {
                        title: '🔐 Password Modificata',
                        body: `La tua password è stata cambiata${ipAddress ? ` da IP ${ipAddress}` : ''}. Se non sei stato tu, contattaci immediatamente.`,
                        type: 'WARNING',
                        category: 'SECURITY',
                        priority: 'HIGH',
                        channels: ['IN_APP', 'EMAIL'],
                        isDismissable: false
                    }, tenantId);
                }

                logger.debug({ personId }, 'NotificationEventHandler: PASSWORD_CHANGED processed');
            }
        );

        // Ruolo assegnato
        EventBus.subscribe(
            PersonEvents.ROLE_ASSIGNED,
            async (event) => {
                const { personId, roleName, assignedBy, tenantId } = event.payload;

                if (personId) {
                    await NotificationService.sendToPerson(personId, {
                        title: '👤 Nuovo Ruolo Assegnato',
                        body: `Ti è stato assegnato il ruolo "${roleName}"${assignedBy ? ` da ${assignedBy}` : ''}`,
                        type: 'INFO',
                        category: 'SYSTEM',
                        priority: 'NORMAL',
                        channels: ['IN_APP'],
                        isDismissable: true
                    }, tenantId);
                }
            }
        );
    }

    // ==========================================
    // AZIENDE HANDLERS
    // ==========================================

    static registerCompanyHandlers() {
        // Convenzione in scadenza
        EventBus.subscribe(
            CompanyEvents.CONVENTION_EXPIRED,
            async (event) => {
                const { companyId, companyName, conventionName, adminIds, tenantId } = event.payload;

                if (adminIds && adminIds.length > 0) {
                    for (const adminId of adminIds) {
                        await NotificationService.sendToPerson(adminId, {
                            title: '⚠️ Convenzione Scaduta',
                            body: `La convenzione "${conventionName}" per ${companyName} è scaduta`,
                            type: 'WARNING',
                            category: 'BILLING',
                            priority: 'HIGH',
                            channels: ['IN_APP', 'EMAIL'],
                            entityType: 'Azienda',
                            entityId: companyId,
                            actionUrl: `/aziende/${companyId}/convenzioni`
                        }, tenantId);
                    }
                }

                logger.debug({ companyId }, 'NotificationEventHandler: CONVENTION_EXPIRED processed');
            }
        );
    }

    // ==========================================
    // SISTEMA HANDLERS
    // ==========================================

    static registerSystemHandlers() {
        // Errore critico
        EventBus.subscribe(
            SystemEvents.ERROR_CRITICAL,
            async (event) => {
                const { errorType, errorMessage, adminIds, tenantId } = event.payload;

                if (adminIds && adminIds.length > 0) {
                    for (const adminId of adminIds) {
                        await NotificationService.sendToPerson(adminId, {
                            title: '🚨 Errore Critico di Sistema',
                            body: `${errorType || 'Errore'}: ${errorMessage || 'Si è verificato un errore critico'}`,
                            type: 'ERROR',
                            category: 'SYSTEM',
                            priority: 'CRITICAL',
                            channels: ['IN_APP', 'EMAIL'],
                            requiresConfirmation: true,
                            isDismissable: false
                        }, tenantId);
                    }
                }

                logger.error({ event }, 'NotificationEventHandler: SYSTEM_ERROR_CRITICAL processed');
            }
        );

        // Manutenzione programmata
        EventBus.subscribe(
            SystemEvents.MAINTENANCE_SCHEDULED,
            async (event) => {
                const { maintenanceDate, duration, description, affectedUserIds, tenantId } = event.payload;

                if (affectedUserIds && affectedUserIds.length > 0) {
                    // Usa broadcast o group per efficienza
                    // Per ora notifica individuale
                    for (const userId of affectedUserIds.slice(0, 100)) { // Limita a 100
                        await NotificationService.sendToPerson(userId, {
                            title: '🔧 Manutenzione Programmata',
                            body: `Il sistema sarà in manutenzione il ${formatDateTime(maintenanceDate)}${duration ? ` per circa ${duration}` : ''}. ${description || ''}`,
                            type: 'INFO',
                            category: 'SYSTEM',
                            priority: 'NORMAL',
                            channels: ['IN_APP'],
                            isDismissable: true
                        }, tenantId);
                    }
                }

                logger.info({ maintenanceDate }, 'NotificationEventHandler: MAINTENANCE_SCHEDULED processed');
            }
        );

        // Allarme sicurezza
        EventBus.subscribe(
            SystemEvents.SECURITY_ALERT,
            async (event) => {
                const { alertType, description, severity, adminIds, tenantId } = event.payload;

                if (adminIds && adminIds.length > 0) {
                    for (const adminId of adminIds) {
                        await NotificationService.sendToPerson(adminId, {
                            title: '🔒 Allarme Sicurezza',
                            body: `${alertType || 'Alert'}: ${description}`,
                            type: severity === 'HIGH' ? 'ERROR' : 'WARNING',
                            category: 'SECURITY',
                            priority: severity === 'HIGH' ? 'CRITICAL' : 'HIGH',
                            channels: ['IN_APP', 'EMAIL'],
                            requiresConfirmation: true,
                            isDismissable: false
                        }, tenantId);
                    }
                }

                logger.warn({ alertType, severity }, 'NotificationEventHandler: SECURITY_ALERT processed');
            }
        );
    }
}

export default NotificationEventHandler;
