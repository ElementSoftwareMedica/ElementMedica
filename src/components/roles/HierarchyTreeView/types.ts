/**
 * Type definitions for HierarchyTreeView component
 * Phase 3.7 - God Component Refactoring
 */

import type { RoleHierarchy as RoleHierarchyType, UserRoleHierarchy } from '../../../services/roles';
import type { Role } from '../../../hooks/useRoles';

/**
 * Represents a node in the tree structure
 */
export interface TreeNode {
  id: string;
  name: string;
  description: string;
  level: number;
  roleType: string;
  children: TreeNode[];
  permissions: string[];
  assignableRoles: string[];
  parentId?: string;
}

/**
 * Props for the main HierarchyTreeView component
 */
export interface HierarchyTreeViewProps {
  hierarchy?: RoleHierarchyType;
  currentUserHierarchy: UserRoleHierarchy | null;
  onRoleCreate?: (parentId: string | null, roleData: Role) => Promise<void>;
  onRoleUpdate?: (roleId: string, roleData: Role) => Promise<void>;
  onRoleDelete?: (roleId: string) => Promise<void>;
  onRoleMove?: (roleId: string, newParentId: string | null) => Promise<void>;
}

/**
 * Form data structure for creating/editing roles
 */
export interface RoleFormData {
  name: string;
  description: string;
  roleType: string;
  permissions: string[];
  level: number;
}

/**
 * Callbacks for tree actions
 */
export interface TreeActionCallbacks {
  onCreate?: (parentId: string | null, data: Role) => Promise<void>;
  onUpdate?: (roleId: string, data: Role) => Promise<void>;
  onDelete?: (roleId: string) => Promise<void>;
  onMove?: (roleId: string, newParentId: string | null) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

// Re-export types from services/roles for convenience
export type { RoleHierarchyType, UserRoleHierarchy, Role };
