/**
 * Accettazione Components - Export Index
 * 
 * Componenti modulari per la pagina Accettazione.
 * 
 * @module pages/clinica/agenda/components/accettazione
 */

// Hook
export { useAccettazioneData } from './useAccettazioneData';
export type {
    AccettazioneFilters,
    AccettazioneStats,
    GroupedAppuntamenti,
    UseAccettazioneDataReturn
} from './useAccettazioneData';

// Components
export { AccettazioneFiltersBar } from './AccettazioneFiltersBar';
export type { AccettazioneFiltersBarProps } from './AccettazioneFiltersBar';

export { AccettazioneQuickStats } from './AccettazioneQuickStats';
export type { AccettazioneQuickStatsProps } from './AccettazioneQuickStats';

export { AccettazionePatientCard } from './AccettazionePatientCard';
export type { AccettazionePatientCardProps } from './AccettazionePatientCard';

export { AccettazioneListView } from './AccettazioneListView';
export type { AccettazioneListViewProps } from './AccettazioneListView';

export { AccettazioneKanbanView } from './AccettazioneKanbanView';
export type { AccettazioneKanbanViewProps } from './AccettazioneKanbanView';
