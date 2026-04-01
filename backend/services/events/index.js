/**
 * Event Bus Module Index
 * 
 * Exports per il sistema Event-Driven
 * 
 * PROGETTO 47 - FASE 2: Event Bus & Domain Events
 * 
 * @module services/events
 */

// Event Bus Singleton
export { EventBus, default as EventBusDefault } from './EventBus.js';

// Domain Events Catalog
export {
    AppointmentEvents,
    VisitaEvents,
    InvoiceEvents,
    DocumentEvents,
    CourseEvents,
    ScheduleEvents,
    PersonEvents,
    CompanyEvents,
    SystemEvents,
    TenantEvents,
    NotificationEvents,
    FormEvents,
    AllEvents,
    AllEventTypes,
    EventCategoryMap,
    isValidEventType,
    getEventCategory
} from './DomainEvents.js';

// Event Handlers
export { NotificationEventHandler } from './handlers/NotificationEventHandler.js';
