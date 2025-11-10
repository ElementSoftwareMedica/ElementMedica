/**
 * RoleModal Module Exports
 * 
 * Barrel file for convenient imports from the RoleModal module.
 */

// Types
export * from './types';

// Hooks
export { usePermissionLoader } from './hooks/usePermissionLoader';
export { usePermissionState } from './hooks/usePermissionState';
export { useRoleForm } from './hooks/useRoleForm';
export { useHierarchyState } from './hooks/useHierarchyState';

// Components
export { PermissionSelector } from './components/PermissionSelector';
export { RoleFormFields } from './components/RoleFormFields';
export { HierarchySelector } from './components/HierarchySelector';
export { PermissionHeader } from './components/PermissionHeader';

// Utils
export { useEntityIcons, getEntityIcon } from './utils/roleHelpers';
export { validateRoleForm, prepareRoleDataForSubmit } from './utils/permissionValidation';
