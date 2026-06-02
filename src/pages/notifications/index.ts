/**
 * Notifications Pages
 * 
 * Export centralizzato per le pagine notifiche.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 5/6/7/8
 */

// Main exports
export { NotificationCenter } from './NotificationCenter';
export { NotificationPreferences } from './NotificationPreferences';
export { default as NotificationGroups } from './NotificationGroups';
export { default as EscalationDashboard } from './EscalationDashboard';
export { default as AnalyticsDashboard } from './AnalyticsDashboard';
export { default as AnnouncementComposerPage } from './AnnouncementComposerPage';

// Modals
export { default as GroupFormModal } from './GroupFormModal';
export { default as GroupPreviewModal } from './GroupPreviewModal';
export { default as SendToGroupModal } from './SendToGroupModal';

// Config Panels
export { default as EscalationConfigPanel } from './EscalationConfigPanel';

// Lazy exports
export { NotificationCenterLazy } from './NotificationCenter.lazy';
export { NotificationPreferencesLazy } from './NotificationPreferences.lazy';
export { NotificationGroupsLazy } from './NotificationGroups.lazy';
export { default as EscalationDashboardLazy } from './EscalationDashboard.lazy';
export { default as AnalyticsDashboardLazy } from './AnalyticsDashboard.lazy';
