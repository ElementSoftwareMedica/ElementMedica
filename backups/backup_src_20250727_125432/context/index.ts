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
export { ToastProvider } from './ToastContext';
export { PreferencesProvider, usePreferences } from './PreferencesContext';