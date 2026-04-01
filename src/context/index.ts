/**
 * Context Export
 * 
 * This file exports all React context providers and hooks to simplify imports.
 * Import context and related hooks from this file instead of individual files:
 * 
 * import { useAppState, AppStateProvider } from '@/context';
 */

// Export App State Context and hook
export { default as AppStateContext, AppStateProvider, useAppState } from './AppStateContext';
export { AuthProvider, useAuth } from './AuthContext';
export { TenantProvider, useTenant } from './TenantContext';
export { TenantFilterProvider, useTenantFilter } from './TenantFilterContext';
export { ToastProvider } from './ToastContext';
export { PreferencesProvider, usePreferences } from './PreferencesContext';
// Project 47 - Advanced Notification System
export { NotificationProvider, useNotifications } from './NotificationContext';
export type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  NotificationFilters,
  UnreadCount
} from './NotificationContext';