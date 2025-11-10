/**
 * Type Definitions for RoleHierarchy Component
 * 
 * Defines all TypeScript interfaces used across the RoleHierarchy module.
 */

/**
 * Individual role level data within the hierarchy
 */
export interface RoleHierarchyLevel {
  name: string;
  description: string;
  level: number;
  assignableRoles: string[];
  permissions: string[];
}

/**
 * Complete role hierarchy structure
 * Maps roleType to its level data
 */
export interface RoleHierarchyType {
  [roleType: string]: RoleHierarchyLevel;
}

/**
 * Current user's role context and permissions
 */
export interface UserRoleHierarchy {
  userId: string;
  userLevel: number;
  highestRole: string;
  userRoles: string[];
  assignableRoles: string[];
  canCreateRoles: boolean;
  canDeleteRoles: boolean;
  canMoveRoles: boolean;
}

/**
 * Props for the main RoleHierarchy component
 */
export interface RoleHierarchyProps {
  /** Optional callback when a role is assigned to a user */
  onRoleAssignment?: (userId: string, roleType: string) => void;
}

/**
 * Hierarchy data state management
 */
export interface HierarchyState {
  hierarchy: RoleHierarchyType;
  currentUserHierarchy: UserRoleHierarchy | null;
  loading: boolean;
  error: string | null;
}

/**
 * Filter and search state
 */
export interface FilterState {
  searchTerm: string;
  showOnlyAssignable: boolean;
}

/**
 * Tree view state
 */
export interface TreeState {
  expandedLevels: Set<number>;
  selectedRole: string | null;
  viewMode: 'list' | 'tree';
}

/**
 * Modal management state
 */
export interface ModalState {
  isRoleModalOpen: boolean;
  isDeleteModalOpen: boolean;
  isMoveModalOpen: boolean;
  editingRole: RoleEditData | null;
  roleToDelete: RoleEditData | null;
  roleToMove: RoleEditData | null;
}

/**
 * Role data for editing/deleting operations
 */
export interface RoleEditData {
  roleType: string;
  name: string;
  description: string;
  level: number;
  permissions: string[];
  assignableRoles: string[];
}

/**
 * Role form submission data
 */
export interface RoleFormData {
  name: string;
  description: string;
  permissions?: string[] | Record<string, boolean>;
  level?: number;
  parentRoleType?: string;
}

/**
 * Roles grouped by hierarchy level
 */
export interface RolesByLevel {
  [level: number]: Array<{
    roleType: string;
    data: RoleHierarchyLevel;
  }>;
}

/**
 * Role operations handlers
 */
export interface RoleOperationHandlers {
  handleCreateRole: () => void;
  handleEditRole: (roleType: string) => void;
  handleDeleteRole: (roleType: string) => void;
  handleMoveRole: (roleType: string) => void;
  handleRoleSubmit: (roleData: RoleFormData) => Promise<void>;
  handleRoleDelete: (roleType: string) => Promise<void>;
  handleRoleMove: (roleType: string, newLevel: number, parentRoleType?: string) => Promise<void>;
}

/**
 * Full permission object format (for system roles)
 */
export interface FullPermission {
  permissionId: string;
  granted: boolean;
  scope: string;
  tenantIds: string[];
  fieldRestrictions: string[];
}
