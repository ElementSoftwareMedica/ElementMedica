/**
 * Type definitions for RoleModal component
 * 
 * This file contains all TypeScript interfaces and types used in the RoleModal
 * component and its subcomponents.
 */

import { Role } from '../../../hooks/useRoles';
import type { RoleEditData } from '../RoleHierarchy/types';

// Re-export for convenience
export type { RoleEditData };

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Single permission definition
 */
export interface Permission {
  key: string;
  label: string;
  description: string;
}

/**
 * Group of related permissions (e.g., by category)
 */
export interface PermissionGroup {
  label: string;
  description: string;
  permissions: Permission[];
}

// ============================================================================
// Entity Types
// ============================================================================

/**
 * Entity definition from the system
 */
export interface EntityDefinition {
  name: string;
  displayName: string;
  // Add other entity properties as needed
}

/**
 * Entity group with CRUD permissions
 */
export interface EntityGroup {
  entity: EntityDefinition;
  permissions: Permission[];
}

// ============================================================================
// Hierarchy Types
// ============================================================================

/**
 * Hierarchy level definition
 */
export interface HierarchyLevel {
  level: number;
  name: string;
  description: string;
  assignableRoles: string[];
  permissions: string[];
}

// ============================================================================
// Form Types
// ============================================================================

/**
 * Form data structure for role creation/editing
 */
export interface RoleFormData {
  name: string;
  description: string;
  level: string;
  parentRoleType: string;
  permissions: Record<string, boolean>;
}

// ============================================================================
// Component Props
// ============================================================================

/**
 * Props for the main RoleModal component
 */
export interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleData: Role) => Promise<void>;
  role?: Role | RoleEditData | null;
  mode: 'create' | 'edit';
  hierarchy?: Record<string, HierarchyLevel>;
}
