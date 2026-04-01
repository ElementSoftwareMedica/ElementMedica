/**
 * Calendar Modals - Re-exports all modal components
 * @module pages/clinica/agenda/components/modals
 */

// Main modals
export { AppointmentBookingModal } from './AppointmentBookingModal';
export { AvailabilitySlotModal } from './AvailabilitySlotModal';
export { EditDisponibilitaModal } from './EditDisponibilitaModal';
export { AppointmentDetailModal } from './AppointmentDetailModal';
export { AmbulatorioOverviewPanel } from './AmbulatorioOverviewPanel';
export { QueueSessionModal } from './QueueSessionModal';
export { BulkQueueCreateModal } from './BulkQueueCreateModal';

// Types
export type {
    AppointmentBookingModalProps,
    AvailabilitySlotModalProps,
    EditDisponibilitaModalProps,
    AppointmentDetailModalProps,
    AmbulatorioOverviewPanelProps,
    ScontoValidato,
    NewPatientData
} from './types';

export type { QueueSessionModalProps } from './QueueSessionModal';
export type { BulkQueueCreateModalProps } from './BulkQueueCreateModal';
