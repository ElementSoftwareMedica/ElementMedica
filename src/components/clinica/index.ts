/**
 * Clinical Components
 * Central export for all clinical components
 * 
 * @module components/clinica
 */

// Patient components
export { PatientCard } from './PatientCard';
export { SearchPatient } from './SearchPatient';

// Appointment components
export { AppointmentCard } from './AppointmentCard';

// Status and badges
export { StatusBadge, Badge, UrgencyBadge } from './StatusBadge';

// Timeline
export { ClinicalTimeline } from './ClinicalTimeline';
export type { TimelineEvent, TimelineEventType } from './ClinicalTimeline';

// Auth and permissions
export { default as ClinicaProtectedRoute } from './ClinicaProtectedRoute';
export type {
    ClinicaResource,
    ClinicaRole,
    ClinicaAction
} from './ClinicaProtectedRoute';
export {
    hasRequiredRole,
    hasRolePermission,
    rolePermissions,
    AccessDenied,
    LoadingClinica
} from './ClinicaProtectedRoute';

// Role-based UI components
export { default as ClinicaRoleBasedUI } from './ClinicaRoleBasedUI';
export {
    useClinicaPermission,
    useClinicaRole,
    withClinicaRole,
    withClinicaPermission,
    AdminOnly,
    MedicoOnly,
    PersonaleSanitario,
    StaffAmministrativo,
    EscludiTecnici,
    CanRead,
    CanEdit,
    CanDelete
} from './ClinicaRoleBasedUI';

// Price calculator
export { default as PriceCalculator } from './PriceCalculator';
export type { } from './PriceCalculator';

// R20: Profilo Salute & Allegato QuickLook/Editor
export { ProfiloSaluteCard } from './ProfiloSaluteCard';
export { AllegatoQuickLookModal } from './AllegatoQuickLookModal';
export type { AllegatoQuickLookItem } from './AllegatoQuickLookModal';
export { AllegatoEditorModal } from './AllegatoEditorModal';
export type { AllegatoEditorModalProps } from './AllegatoEditorModal';

// Re-export types from services
export type {
    Paziente,
    Appuntamento,
    Visita,
    Referto
} from '../../services/clinicaApi';
