/**
 * Components index - Export all components for VisitaPage
 * 
 * @module pages/clinica/clinica/components
 * @project P52 - Clinical Visit Template System
 * @session #13 - Added ExitVisitDialog for exit confirmation
 */

export { StickyVisitHeader } from './StickyVisitHeader';
export { DynamicField } from './DynamicField';
export { VisitSidebar } from './VisitSidebar';
export { SectionTabs } from './SectionTabs';
export { FormSection } from './FormSection';
// New integrated QuickActions with expandable menus (Session #12b)
export { QuickActionsIntegrated } from './QuickActionsIntegrated';
export type {
    VisitaRiepilogo,
    AllegatoRiepilogo,
    RevisioneRiepilogo,
    QuestionarioRiepilogo
} from './QuickActionsIntegrated';
export { AccessControlCard, toVisitAccessControl } from './AccessControlCard';
export type { AccessLevel, ConfidentialityLevel, AccessControlConfig } from './AccessControlCard';
export { PrestazioniCard } from './PrestazioniCard';
export type { PrestazioneItem, VoceTariffarioItem } from './PrestazioniCard';
// Exit Visit Dialog (Session #13)
export { ExitVisitDialog } from './ExitVisitDialog';
export type { ExitVisitAction } from './ExitVisitDialog';
// Modulistica Modal (Session #13 - P53)
export { default as ModulisticaModal } from './ModulisticaModal';
// Questionari Modal (P61 - Medical Questionnaires)
export { QuestionariModal } from './QuestionariModal';
// Allegati Upload Modal (Session #17)
export { AllegatiUploadModal } from './AllegatiUploadModal';
// Cartella Sanitaria Modal (R20 - Full patient visit history quicklook)
export { CartellaSanitariaModal } from './CartellaSanitariaModal';
// Queue View Modal (P61 - Queue System Integration)
export { QueueViewModal } from './QueueViewModal';
// Mini Parametro Chart (Session #13b - Inline charts for vital signs)
export { default as MiniParametroChart } from './MiniParametroChart';

