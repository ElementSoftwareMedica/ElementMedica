// Export existing hooks
export { useCompanies } from './useCompanies';
export { default as useCourses } from './useCourses';
export { useEmployees } from './api/useEmployees';
export { default as useFetch } from './useFetch';
export { default as useFilterSearch } from './useFilterSearch';
export { default as usePagination } from './usePagination';
export { default as useResizable } from './useResizable';
export { default as useSelection } from './useSelection';
export { default as useSelectionActions } from './useSelectionActions';
export { default as useSorting } from './useSorting';
export { useTemplates } from './useTemplates';
export { default as useTrainers } from './useTrainers';
export { default as useViewMode } from './useViewMode';
export { default as useFormValidation } from './useFormValidation';
export { default as useErrorHandler } from './useErrorHandler';

// Export API hooks
export { default as useMutation } from './api/useMutation';
export { default as useQueryData } from './api/useQueryData';

// Export optimized authentication hooks
export { useAuth, default as useAuthDefault } from './auth/useAuth';
export { usePermissions, default as usePermissionsDefault } from './auth/usePermissions';

// Export optimized state management hooks
export { 
  useAppState, 
  useAppStateSelector,
  useLanguage,
  useTheme,
  useSidebar,
  useAttestatiProgress,
  useAppActions,
  default as useAppStateDefault 
} from './state/useAppState';

// Export optimized UI hooks
export { useToast, default as useToastDefault } from './ui/useToast';

// Export optimized routing hooks
export { useNavigation, default as useNavigationDefault } from './routing/useNavigation';
export { 
  useRouteGuard,
  usePermissionCheck,
  useRoleCheck,
  useConditionalRender,
  default as useRouteGuardDefault 
} from './routing/useRouteGuard';

// Re-export legacy toast hook for backward compatibility
export { default as useToastLegacy } from './useToast';

// GDPR Hooks
export { useGDPRConsent } from './useGDPRConsent';
export { useAuditTrail } from './useAuditTrail';
export { useDataExport } from './useDataExport';
export { useDeletionRequest } from './useDeletionRequest';
export { usePrivacySettings } from './usePrivacySettings';
export { useGDPRAdmin } from './useGDPRAdmin';

// User Preferences hooks
// Removed useUserPreferences - now using unified PreferencesContext
// useTheme is already exported from './state/useAppState' above