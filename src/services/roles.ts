import { apiGet, apiDelete } from './api';

interface Role {
  type: string;
  name: string;
  description: string;
  userCount: number;
  persons?: Person[];
  permissions?: string[];
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
  resource?: string;
  action?: string;
  entity?: string; // Aggiungo il campo entity
  scope?: 'all' | 'own';
}

interface RolePermissionUpdate {
  roleType: string;
  permissions: {
    [entity: string]: {
      [action: string]: {
        granted: boolean;
        scope?: 'all' | 'own';
        fields?: string[];
      }
    }
  };
}

// Nuove interfacce per la gerarchia dei ruoli
interface RoleHierarchyLevel {
  level: number;
  name: string;
  description: string;
  assignableRoles: string[];
  permissions: string[];
}

interface RoleHierarchy {
  [roleType: string]: RoleHierarchyLevel;
}

interface UserRoleHierarchy {
  userId: string;
  userRoles: string[];
  hierarchy: RoleHierarchy;
  highestRole: string;
  userLevel: number;
  assignableRoles: string[];
  assignablePermissions: string[];
}

interface RoleAssignmentResult {
  success: boolean;
  message: string;
  assignedRole?: string;
  targetUserId?: string;
}

interface PermissionAssignmentResult {
  success: boolean;
  message: string;
  assignedPermissions?: string[];
  targetUserId?: string;
}

interface AssignableRolesAndPermissions {
  roleType: string;
  roleLevel: number;
  assignableRoles: string[];
  assignablePermissions: string[];
}

class RolesService {
  private baseUrl = '/api/v1/roles';

  async getAll(): Promise<{ roles: Role[], totalRoles: number, totalUsers: number }> {
    interface BackendResponse {
      success: boolean;
      data: {
        data: Array<{
          roleType?: string;
          type?: string;
          name: string;
          description: string;
          userCount: number;
          persons?: Person[];
          permissions?: string[];
        }>;
        pagination: {
          totalCount: number;
        };
      };
    }
    
    const response = await apiGet<BackendResponse>(this.baseUrl);
    // Il backend restituisce { success: true, data: { data: [...], pagination: {...} } }
    const backendRoles = response.data.data || [];
    
    // Mappa i ruoli dal backend al formato frontend (roleType -> type)
    const roles: Role[] = backendRoles.map((backendRole) => ({
      type: backendRole.roleType || backendRole.type || '',
      name: backendRole.name,
      description: backendRole.description,
      userCount: backendRole.userCount,
      persons: backendRole.persons,
      permissions: backendRole.permissions
    }));
    
    const totalRoles = response.data.pagination?.totalCount || roles.length;
    const totalUsers = roles.reduce((sum, role) => sum + (role.userCount || 0), 0);
    
    return {
      roles,
      totalRoles,
      totalUsers
    };
  }

  async getById(roleType: string): Promise<Role> {
    interface BackendRoleResponse {
      success: boolean;
      data: {
        roleType?: string;
        type?: string;
        name: string;
        description: string;
        userCount: number;
        persons?: Person[];
        permissions?: string[];
      };
    }
    
    const encodedRoleType = encodeURIComponent(roleType);
    const response = await apiGet<BackendRoleResponse>(`${this.baseUrl}/${encodedRoleType}`);
    const backendRole = response.data;
    
    // Mappa il ruolo dal backend al formato frontend (roleType -> type)
    return {
      type: backendRole.roleType || backendRole.type || '',
      name: backendRole.name,
      description: backendRole.description,
      userCount: backendRole.userCount,
      persons: backendRole.persons,
      permissions: backendRole.permissions
    };
  }

  async create(role: { 
    name: string; 
    description: string; 
    level?: number; 
    parentRoleType?: string; 
    permissions?: string[] 
  }): Promise<Role> {
    console.log('RolesService.create called with:', role);
    // Usa l'endpoint per ruoli personalizzati
    const response = await apiPost<{ success: boolean, data: Role }>(`${this.baseUrl}/custom`, role);
    return response.data;
  }

  async update(roleType: string, role: { name: string; description: string; permissions?: string[] }): Promise<Role> {
    const encodedRoleType = encodeURIComponent(roleType);
    const response = await apiPut<{ success: boolean, data: Role }>(`${this.baseUrl}/${encodedRoleType}`, role);
    return response.data;
  }

  async updateCustomRole(customRoleId: string, role: { name: string; description: string; permissions?: string[] }): Promise<Role> {
    const response = await apiPut<{ success: boolean, data: Role }>(`${this.baseUrl}/custom/${customRoleId}`, role);
    return response.data;
  }

  async delete(roleType: string): Promise<void> {
    const encodedRoleType = encodeURIComponent(roleType);
    await apiDelete<{ success: boolean }>(`${this.baseUrl}/${encodedRoleType}`);
  }

  async getPermissions(): Promise<Permission[]> {
    const response = await apiGet(`${this.baseUrl}/permissions`);
    // Il backend restituisce { success: true, data: { permissions: {...}, tenants: [...], ... } }
    // Convertiamo la struttura raggruppata in un array piatto di permessi
    const permissionsData = response.data.permissions || {};
    const permissionsArray: Permission[] = [];
    
    Object.entries(permissionsData).forEach(([category, categoryData]: [string, any]) => {
      if (categoryData.permissions && Array.isArray(categoryData.permissions)) {
        categoryData.permissions.forEach((perm: any) => {
          // Estrai action ed entity dal permissionId (es. "VIEW_COMPANIES" -> action: "VIEW", entity: "COMPANIES")
          const parts = perm.key.split('_');
          if (parts.length >= 2) {
            const action = parts[0]?.toLowerCase() || 'view';
            const entity = parts.slice(1).join('_').toLowerCase() || category;
            
            // Verifica che action ed entity siano validi
            if (action && entity) {
              permissionsArray.push({
                id: perm.key,
                name: perm.label || perm.name,
                category: category,
                description: perm.description,
                resource: category,
                action: action,
                entity: entity,
                scope: 'all'
              });
            } else {
              console.warn('Invalid permission format:', perm.key);
            }
          } else {
            console.warn('Invalid permission key format:', perm.key);
          }
        });
      }
    });
    
    return permissionsArray;
  }

  async getRolePermissions(roleType: string): Promise<string[]> {
    const encodedRoleType = encodeURIComponent(roleType);
    console.log('🔍 [RolesService] Getting permissions for role:', roleType, 'encoded:', encodedRoleType);
    
    const response = await apiGet<{ success: boolean, data: { permissions: Array<{ permissionId: string, granted: boolean }> } }>(`${this.baseUrl}/${encodedRoleType}/permissions`);
    
    console.log('🔍 [RolesService] Raw API response:', response);
    console.log('🔍 [RolesService] Response data:', response.data);
    console.log('🔍 [RolesService] Response data permissions:', response.data?.permissions);
    
    // Il backend restituisce { success: true, data: { permissions: [...], ... } }
    // Ogni permission ha la struttura { permissionId: string, granted: boolean, ... }
    // Restituiamo solo i permissionId dei permessi granted
    if (response.data && response.data.permissions && Array.isArray(response.data.permissions)) {
      console.log('🔍 [RolesService] Processing permissions array, length:', response.data.permissions.length);
      
      const grantedPermissions = response.data.permissions
        .filter((perm) => {
          console.log('🔍 [RolesService] Permission:', perm.permissionId, 'granted:', perm.granted);
          return perm.granted === true;
        })
        .map((perm) => perm.permissionId);
        
      console.log('🔍 [RolesService] Granted permissions:', grantedPermissions);
      return grantedPermissions;
    }
    
    console.warn('🔍 [RolesService] No valid permissions found, returning empty array');
    return [];
  }

  async updateRolePermissions(roleType: string, permissions: RolePermissionUpdate): Promise<void> {
    const encodedRoleType = encodeURIComponent(roleType);
    await apiPut(`${this.baseUrl}/${encodedRoleType}/permissions`, permissions);
  }

  async updateSystemRolePermissions(roleType: string, permissions: Array<{
    permissionId: string;
    granted: boolean;
    scope?: string;
    tenantIds?: string[];
    fieldRestrictions?: string[];
  }>): Promise<void> {
    const encodedRoleType = encodeURIComponent(roleType);
    await apiPut(`${this.baseUrl}/${encodedRoleType}/permissions`, permissions);
  }

  async getPersonsByRole(roleType: string): Promise<Person[]> {
    const encodedRoleType = encodeURIComponent(roleType);
    const response = await apiGet(`${this.baseUrl}/persons?role=${encodedRoleType}`);
    return response.data;
  }

  async assignRole(personId: number, roleType: string): Promise<void> {
    await apiPost(`${this.baseUrl}/assign`, { personId, roleType });
  }

  async removeRole(personId: number, roleType: string): Promise<void> {
    await apiDelete(`${this.baseUrl}/remove`, { data: { personId, roleType } });
  }

  // Nuove funzioni per la gerarchia dei ruoli
  async getRoleHierarchy(): Promise<RoleHierarchy> {
    const response = await apiGet<{ success: boolean, data: RoleHierarchy }>(`${this.baseUrl}/hierarchy`);
    return response.data;
  }

  async getUserRoleHierarchy(userId: string): Promise<UserRoleHierarchy> {
    const response = await apiGet<{ success: boolean, data: UserRoleHierarchy }>(`${this.baseUrl}/hierarchy/user/${userId}`);
    return response.data;
  }

  async getCurrentUserRoleHierarchy(): Promise<UserRoleHierarchy> {
    const response = await apiGet<{ success: boolean, data: { data: UserRoleHierarchy } }>(`${this.baseUrl}/hierarchy/current-user`);
    return response.data.data;
  }

  async assignRoleWithHierarchy(targetUserId: string, roleType: string): Promise<RoleAssignmentResult> {
    const response = await apiPost(`${this.baseUrl}/hierarchy/assign`, {
      targetUserId,
      roleType
    });
    return {
      success: response.success,
      message: response.message,
      assignedRole: roleType,
      targetUserId
    };
  }

  async assignPermissionsWithHierarchy(targetUserId: string, permissions: string[]): Promise<PermissionAssignmentResult> {
    const response = await apiPost(`${this.baseUrl}/hierarchy/assign-permissions`, {
      targetUserId,
      permissions
    });
    return {
      success: response.success,
      message: response.message,
      assignedPermissions: permissions,
      targetUserId
    };
  }

  async getAssignableRolesAndPermissions(roleType: string): Promise<AssignableRolesAndPermissions> {
    const encodedRoleType = encodeURIComponent(roleType);
    const response = await apiGet(`${this.baseUrl}/hierarchy/assignable/${encodedRoleType}`);
    return response.data;
  }

  async getVisibleRoles(): Promise<RoleHierarchy> {
    const response = await apiGet(`${this.baseUrl}/hierarchy/visible`);
    return response.data;
  }

  async moveRoleInHierarchy(roleType: string, newLevel: number, newParentRoleType?: string): Promise<any> {
    const response = await apiPut(`${this.baseUrl}/hierarchy/move`, {
      roleType,
      newLevel,
      newParentRoleType
    });
    return response.data;
  }
}

export const rolesService = new RolesService();

// Export the class itself
export { RolesService };

// Export individual functions for backward compatibility
export const getRoles = () => rolesService.getAll();
export const getRole = (roleType: string) => rolesService.getById(roleType);
export const createRole = (role: { name: string; description: string; permissions?: string[] }) => rolesService.create(role);
export const updateRole = (roleType: string, role: { name: string; description: string; permissions?: string[] }) => rolesService.update(roleType, role);
export const deleteRole = (roleType: string) => rolesService.delete(roleType);
export const getPermissions = () => rolesService.getPermissions();
export const getRolePermissions = (roleType: string) => rolesService.getRolePermissions(roleType);
export const updateRolePermissions = (roleType: string, permissions: RolePermissionUpdate) => rolesService.updateRolePermissions(roleType, permissions);
export const updateSystemRolePermissions = (roleType: string, permissions: Array<{
  permissionId: string;
  granted: boolean;
  scope?: string;
  tenantIds?: string[];
  fieldRestrictions?: string[];
}>) => rolesService.updateSystemRolePermissions(roleType, permissions);
export const getPersonsByRole = (roleType: string) => rolesService.getPersonsByRole(roleType);
export const assignRole = (personId: number, roleType: string) => rolesService.assignRole(personId, roleType);
export const removeRole = (personId: number, roleType: string) => rolesService.removeRole(personId, roleType);

// Export new hierarchy functions
export const getRoleHierarchy = () => rolesService.getRoleHierarchy();
export const getUserRoleHierarchy = (userId: string) => rolesService.getUserRoleHierarchy(userId);
export const getCurrentUserRoleHierarchy = () => rolesService.getCurrentUserRoleHierarchy();
export const assignRoleWithHierarchy = (targetUserId: string, roleType: string) => rolesService.assignRoleWithHierarchy(targetUserId, roleType);
export const assignPermissionsWithHierarchy = (targetUserId: string, permissions: string[]) => rolesService.assignPermissionsWithHierarchy(targetUserId, permissions);
export const getAssignableRolesAndPermissions = (roleType: string) => rolesService.getAssignableRolesAndPermissions(roleType);
export const getVisibleRoles = () => rolesService.getVisibleRoles();
export const moveRoleInHierarchy = (roleType: string, newLevel: number, newParentRoleType?: string) => rolesService.moveRoleInHierarchy(roleType, newLevel, newParentRoleType);

export type { 
  Role, 
  Person, 
  Permission, 
  RolePermissionUpdate,
  RoleHierarchy,
  RoleHierarchyLevel,
  UserRoleHierarchy,
  RoleAssignmentResult,
  PermissionAssignmentResult,
  AssignableRolesAndPermissions
};