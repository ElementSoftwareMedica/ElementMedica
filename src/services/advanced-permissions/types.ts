import React from 'react';

export interface EntityPermission {
  entity: string;
  action: 'create' | 'read' | 'update' | 'delete';
  scope: 'all' | 'tenant' | 'own';
  fields?: string[];
  tenantIds?: number[];
  granted?: boolean; // Indica se il permesso è concesso o meno
}

export interface RolePermissions {
  roleType: string;
  permissions: EntityPermission[];
}

export interface EntityDefinition {
  id: string;
  name: string;
  displayName: string;
  fields: EntityField[];
  icon?: React.ComponentType<any>;
}

export interface EntityField {
  id: string;
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone';
  sensitive?: boolean;
}

export interface PermissionsSummary {
  totalPermissions: number;
  entitiesWithPermissions: number;
  sensitiveFieldsAccess: number;
}

export type VirtualEntityName = 'EMPLOYEES' | 'TRAINERS';
export type PermissionAction = 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE';