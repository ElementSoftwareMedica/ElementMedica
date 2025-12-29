/**
 * Permission Validation Utilities
 * 
 * Validation functions for role permissions and form data.
 */

import { Role } from '../../../../hooks/useRoles';
import type { RoleFormData, RoleEditData } from '../types';

/**
 * Validate role form data
 */
export const validateRoleForm = (formData: RoleFormData): string | null => {
  if (!formData.name.trim()) {
    return 'Il nome del ruolo è obbligatorio';
  }

  if (!formData.description.trim()) {
    return 'La descrizione del ruolo è obbligatoria';
  }

  return null;
};

/**
 * Prepare role data for API submission
 */
export const prepareRoleDataForSubmit = (
  formData: RoleFormData,
  mode: 'create' | 'edit',
  role?: Role | RoleEditData | null
): Role => {
  // Backend expects an array of objects with { permissionId, granted, scope, ... }
  const permissions = Object.entries(formData.permissions)
    .map(([permissionId, granted]) => ({
      permissionId: permissionId.trim().toUpperCase(),
      granted: Boolean(granted),
      scope: 'all',
      tenantIds: [],
      fieldRestrictions: []
    }));

  console.log('🔧 [prepareRoleDataForSubmit] Sending permissions:', permissions);

  // Extract role type - handle both Role (type) and RoleEditData (roleType)
  const roleType = role && 'type' in role ? role.type : role && 'roleType' in role ? role.roleType : 'CUSTOM';

  const roleData = {
    name: formData.name.trim(),
    description: formData.description.trim(),
    type: roleType,
    permissions: permissions,
    ...(mode === 'create' && {
      level: parseInt(formData.level),
      parentRoleType: formData.parentRoleType || null
    })
  } as unknown as Role;

  return roleData;
};
