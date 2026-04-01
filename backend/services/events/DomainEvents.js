/**
 * DomainEvents.js
 * 
 * Catalogo completo dei Domain Events per ElementMedica/ElementSicurezza.
 * Definisce tutti i tipi di eventi che possono essere emessi nel sistema.
 * 
 * PROGETTO 47 - FASE 2: Event Bus & Domain Events
 * 
 * Naming Convention:
 * - ENTITY_ACTION (es. APPOINTMENT_CREATED)
 * - Past tense per eventi completati (CREATED, UPDATED)
 * - Present tense per eventi in corso (EXPIRING)
 * 
 * @module services/events/DomainEvents
 * @version 1.0.0
 */

// ============================================
// APPUNTAMENTI (Clinica)
// ============================================

export const AppointmentEvents = {
    /** Nuovo appuntamento creato */
    CREATED: 'APPOINTMENT_CREATED',
    /** Appuntamento modificato */
    UPDATED: 'APPOINTMENT_UPDATED',
    /** Appuntamento cancellato */
    CANCELLED: 'APPOINTMENT_CANCELLED',
    /** Stato appuntamento cambiato (generico) */
    STATUS_CHANGED: 'APPOINTMENT_STATUS_CHANGED',
    /** Appuntamento confermato dal paziente */
    CONFIRMED: 'APPOINTMENT_CONFIRMED',
    /** Appuntamento completato */
    COMPLETED: 'APPOINTMENT_COMPLETED',
    /** Paziente non presentato */
    NO_SHOW: 'APPOINTMENT_NO_SHOW',
    /** Appuntamento riprogrammato */
    RESCHEDULED: 'APPOINTMENT_RESCHEDULED',
    /** Reminder 24 ore prima */
    REMINDER_24H: 'APPOINTMENT_REMINDER_24H',
    /** Reminder 2 ore prima */
    REMINDER_2H: 'APPOINTMENT_REMINDER_2H',
    /** Appuntamento assegnato a medico */
    ASSIGNED: 'APPOINTMENT_ASSIGNED',
    /** Rilevato conflitto calendario */
    CONFLICT_DETECTED: 'APPOINTMENT_CONFLICT_DETECTED',
    /** Check-in paziente */
    CHECKED_IN: 'APPOINTMENT_CHECKED_IN'
};

// ============================================
// VISITE MEDICHE
// ============================================

export const VisitaEvents = {
    /** Nuova visita creata */
    CREATED: 'VISITA_CREATED',
    /** Visita modificata */
    UPDATED: 'VISITA_UPDATED',
    /** Visita iniziata */
    STARTED: 'VISITA_STARTED',
    /** Visita completata */
    COMPLETED: 'VISITA_COMPLETED',
    /** Visita cancellata */
    CANCELLED: 'VISITA_CANCELLED',
    /** Risultati disponibili */
    RESULT_AVAILABLE: 'VISITA_RESULT_AVAILABLE',
    /** Documento caricato nella visita */
    DOCUMENT_UPLOADED: 'VISITA_DOCUMENT_UPLOADED',
    /** Visita in scadenza (30/15/7 giorni) */
    EXPIRING: 'VISITA_EXPIRING',
    /** Visita scaduta */
    EXPIRED: 'VISITA_EXPIRED',
    /** Referto generato */
    REPORT_GENERATED: 'VISITA_REPORT_GENERATED'
};

// ============================================
// FATTURAZIONE
// ============================================

export const InvoiceEvents = {
    /** Fattura creata */
    CREATED: 'INVOICE_CREATED',
    /** Fattura inviata */
    SENT: 'INVOICE_SENT',
    /** Fattura pagata completamente */
    PAID: 'INVOICE_PAID',
    /** Pagamento parziale ricevuto */
    PARTIAL_PAYMENT: 'INVOICE_PARTIAL_PAYMENT',
    /** Fattura scaduta */
    OVERDUE: 'INVOICE_OVERDUE',
    /** Reminder pagamento */
    REMINDER: 'INVOICE_PAYMENT_REMINDER',
    /** Fattura cancellata/stornata */
    CANCELLED: 'INVOICE_CANCELLED',
    /** Nota di credito emessa */
    CREDIT_NOTE: 'INVOICE_CREDIT_NOTE',
    /** Sollecito inviato */
    DUNNING_SENT: 'INVOICE_DUNNING_SENT'
};

// ============================================
// DOCUMENTI
// ============================================

export const DocumentEvents = {
    /** Documento creato */
    CREATED: 'DOCUMENT_CREATED',
    /** Documento caricato */
    UPLOADED: 'DOCUMENT_UPLOADED',
    /** Documento firmato */
    SIGNED: 'DOCUMENT_SIGNED',
    /** Richiesta firma inviata */
    SIGNATURE_REQUESTED: 'DOCUMENT_SIGNATURE_REQUESTED',
    /** Documento condiviso */
    SHARED: 'DOCUMENT_SHARED',
    /** Documento scaricato */
    DOWNLOADED: 'DOCUMENT_DOWNLOADED',
    /** Documento scaduto */
    EXPIRED: 'DOCUMENT_EXPIRED',
    /** Documento in scadenza */
    EXPIRING: 'DOCUMENT_EXPIRING',
    /** Documento eliminato */
    DELETED: 'DOCUMENT_DELETED',
    /** Documento archiviato */
    ARCHIVED: 'DOCUMENT_ARCHIVED'
};

// ============================================
// CORSI / FORMAZIONE
// ============================================

export const CourseEvents = {
    /** Corso creato */
    CREATED: 'COURSE_CREATED',
    /** Corso pubblicato */
    PUBLISHED: 'COURSE_PUBLISHED',
    /** Iscrizione a corso */
    ENROLLMENT: 'COURSE_ENROLLMENT',
    /** Iscrizione cancellata */
    ENROLLMENT_CANCELLED: 'COURSE_ENROLLMENT_CANCELLED',
    /** Corso iniziato */
    STARTED: 'COURSE_STARTED',
    /** Corso completato */
    COMPLETED: 'COURSE_COMPLETED',
    /** Attestato/certificato emesso */
    CERTIFICATE_ISSUED: 'COURSE_CERTIFICATE_ISSUED',
    /** Certificazione in scadenza */
    CERTIFICATE_EXPIRING: 'COURSE_CERTIFICATE_EXPIRING',
    /** Certificazione scaduta */
    CERTIFICATE_EXPIRED: 'COURSE_CERTIFICATE_EXPIRED',
    /** Reminder corso */
    REMINDER: 'COURSE_REMINDER',
    /** Test completato */
    TEST_COMPLETED: 'COURSE_TEST_COMPLETED',
    /** Test fallito */
    TEST_FAILED: 'COURSE_TEST_FAILED',
    /** Sessione creata */
    SESSION_CREATED: 'COURSE_SESSION_CREATED',
    /** Sessione cancellata */
    SESSION_CANCELLED: 'COURSE_SESSION_CANCELLED'
};

// ============================================
// PROGRAMMAZIONI (Schedules)
// ============================================

export const ScheduleEvents = {
    /** Programmazione creata */
    CREATED: 'SCHEDULE_CREATED',
    /** Programmazione modificata */
    UPDATED: 'SCHEDULE_UPDATED',
    /** Programmazione cancellata */
    CANCELLED: 'SCHEDULE_CANCELLED',
    /** Programmazione confermata */
    CONFIRMED: 'SCHEDULE_CONFIRMED',
    /** Iscrizione aggiunta */
    PARTICIPANT_ADDED: 'SCHEDULE_PARTICIPANT_ADDED',
    /** Iscrizione rimossa */
    PARTICIPANT_REMOVED: 'SCHEDULE_PARTICIPANT_REMOVED',
    /** Programmazione completata */
    COMPLETED: 'SCHEDULE_COMPLETED',
    /** Programmazione in partenza (24h prima) */
    STARTING_SOON: 'SCHEDULE_STARTING_SOON'
};

// ============================================
// UTENTI / PERSONE
// ============================================

export const PersonEvents = {
    /** Persona creata */
    CREATED: 'PERSON_CREATED',
    /** Persona modificata */
    UPDATED: 'PERSON_UPDATED',
    /** Account attivato */
    ACTIVATED: 'PERSON_ACTIVATED',
    /** Account disattivato */
    DEACTIVATED: 'PERSON_DEACTIVATED',
    /** Password cambiata */
    PASSWORD_CHANGED: 'PERSON_PASSWORD_CHANGED',
    /** Richiesta reset password */
    PASSWORD_RESET_REQUESTED: 'PERSON_PASSWORD_RESET_REQUESTED',
    /** Login riuscito */
    LOGIN_SUCCESS: 'PERSON_LOGIN_SUCCESS',
    /** Login fallito */
    LOGIN_FAILED: 'PERSON_LOGIN_FAILED',
    /** Ruolo assegnato */
    ROLE_ASSIGNED: 'PERSON_ROLE_ASSIGNED',
    /** Ruolo rimosso */
    ROLE_REMOVED: 'PERSON_ROLE_REMOVED',
    /** Consenso GDPR dato */
    CONSENT_GIVEN: 'PERSON_CONSENT_GIVEN',
    /** Consenso GDPR ritirato */
    CONSENT_WITHDRAWN: 'PERSON_CONSENT_WITHDRAWN',
    /** Richiesta export dati */
    DATA_EXPORT_REQUESTED: 'PERSON_DATA_EXPORT_REQUESTED',
    /** Richiesta cancellazione dati */
    DATA_DELETION_REQUESTED: 'PERSON_DATA_DELETION_REQUESTED',
    /** Profilo completato */
    PROFILE_COMPLETED: 'PERSON_PROFILE_COMPLETED',
    /** Email verificata */
    EMAIL_VERIFIED: 'PERSON_EMAIL_VERIFIED'
};

// ============================================
// AZIENDE
// ============================================

export const CompanyEvents = {
    /** Azienda creata */
    CREATED: 'COMPANY_CREATED',
    /** Azienda modificata */
    UPDATED: 'COMPANY_UPDATED',
    /** Azienda attivata */
    ACTIVATED: 'COMPANY_ACTIVATED',
    /** Azienda disattivata */
    DEACTIVATED: 'COMPANY_DEACTIVATED',
    /** Sede aggiunta */
    SITE_ADDED: 'COMPANY_SITE_ADDED',
    /** Sede rimossa */
    SITE_REMOVED: 'COMPANY_SITE_REMOVED',
    /** Dipendente aggiunto */
    EMPLOYEE_ADDED: 'COMPANY_EMPLOYEE_ADDED',
    /** Dipendente rimosso */
    EMPLOYEE_REMOVED: 'COMPANY_EMPLOYEE_REMOVED',
    /** Convenzione attivata */
    CONVENTION_ACTIVATED: 'COMPANY_CONVENTION_ACTIVATED',
    /** Convenzione scaduta */
    CONVENTION_EXPIRED: 'COMPANY_CONVENTION_EXPIRED'
};

// ============================================
// SISTEMA
// ============================================

export const SystemEvents = {
    /** Manutenzione programmata */
    MAINTENANCE_SCHEDULED: 'SYSTEM_MAINTENANCE_SCHEDULED',
    /** Manutenzione iniziata */
    MAINTENANCE_STARTED: 'SYSTEM_MAINTENANCE_STARTED',
    /** Manutenzione completata */
    MAINTENANCE_COMPLETED: 'SYSTEM_MAINTENANCE_COMPLETED',
    /** Aggiornamento disponibile */
    UPDATE_AVAILABLE: 'SYSTEM_UPDATE_AVAILABLE',
    /** Errore critico */
    ERROR_CRITICAL: 'SYSTEM_ERROR_CRITICAL',
    /** Backup completato */
    BACKUP_COMPLETED: 'SYSTEM_BACKUP_COMPLETED',
    /** Allarme sicurezza */
    SECURITY_ALERT: 'SYSTEM_SECURITY_ALERT',
    /** Limite risorse raggiunto */
    RESOURCE_LIMIT_WARNING: 'SYSTEM_RESOURCE_LIMIT_WARNING',
    /** Report giornaliero generato */
    DAILY_REPORT_GENERATED: 'SYSTEM_DAILY_REPORT_GENERATED'
};

// ============================================
// TENANT
// ============================================

export const TenantEvents = {
    /** Tenant creato */
    CREATED: 'TENANT_CREATED',
    /** Tenant modificato */
    UPDATED: 'TENANT_UPDATED',
    /** Tenant sospeso */
    SUSPENDED: 'TENANT_SUSPENDED',
    /** Tenant riattivato */
    REACTIVATED: 'TENANT_REACTIVATED',
    /** Piano cambiato */
    PLAN_CHANGED: 'TENANT_PLAN_CHANGED',
    /** Warning limite raggiunto */
    LIMIT_WARNING: 'TENANT_LIMIT_WARNING',
    /** Limite superato */
    LIMIT_EXCEEDED: 'TENANT_LIMIT_EXCEEDED',
    /** Configurazione modificata */
    CONFIG_CHANGED: 'TENANT_CONFIG_CHANGED'
};

// ============================================
// NOTIFICHE
// ============================================

export const NotificationEvents = {
    /** Notifica creata */
    CREATED: 'NOTIFICATION_CREATED',
    /** Notifica inviata */
    SENT: 'NOTIFICATION_SENT',
    /** Notifica letta */
    READ: 'NOTIFICATION_READ',
    /** Notifica chiusa */
    DISMISSED: 'NOTIFICATION_DISMISSED',
    /** Delivery fallito */
    DELIVERY_FAILED: 'NOTIFICATION_DELIVERY_FAILED',
    /** Escalation triggerata */
    ESCALATED: 'NOTIFICATION_ESCALATED',
    /** Conferma ricevuta */
    CONFIRMED: 'NOTIFICATION_CONFIRMED',
    /** Azione eseguita */
    ACTION_TAKEN: 'NOTIFICATION_ACTION_TAKEN'
};

// ============================================
// FORM
// ============================================

export const FormEvents = {
    /** Form creato */
    CREATED: 'FORM_CREATED',
    /** Form pubblicato */
    PUBLISHED: 'FORM_PUBLISHED',
    /** Form compilato */
    SUBMITTED: 'FORM_SUBMITTED',
    /** Form approvato */
    APPROVED: 'FORM_APPROVED',
    /** Form rifiutato */
    REJECTED: 'FORM_REJECTED',
    /** Reminder compilazione */
    REMINDER: 'FORM_REMINDER'
};

// ============================================
// CATALOGO AGGREGATO
// ============================================

/**
 * Tutti gli eventi raggruppati per categoria
 */
export const AllEvents = {
    Appointment: AppointmentEvents,
    Visita: VisitaEvents,
    Invoice: InvoiceEvents,
    Document: DocumentEvents,
    Course: CourseEvents,
    Schedule: ScheduleEvents,
    Person: PersonEvents,
    Company: CompanyEvents,
    System: SystemEvents,
    Tenant: TenantEvents,
    Notification: NotificationEvents,
    Form: FormEvents
};

/**
 * Lista piatta di tutti i tipi di evento
 */
export const AllEventTypes = Object.values(AllEvents)
    .flatMap(category => Object.values(category));

/**
 * Mappa tipo evento -> categoria
 */
export const EventCategoryMap = {};
for (const [category, events] of Object.entries(AllEvents)) {
    for (const eventType of Object.values(events)) {
        EventCategoryMap[eventType] = category;
    }
}

/**
 * Helper per verificare se un tipo di evento è valido
 * @param {string} eventType - Tipo evento
 * @returns {boolean}
 */
export function isValidEventType(eventType) {
    return AllEventTypes.includes(eventType);
}

/**
 * Helper per ottenere la categoria di un evento
 * @param {string} eventType - Tipo evento
 * @returns {string|null}
 */
export function getEventCategory(eventType) {
    return EventCategoryMap[eventType] || null;
}

export default AllEvents;
