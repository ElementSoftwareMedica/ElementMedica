import { PrismaClient } from '@prisma/client';
import logger from './utils/logger.js';

const prisma = new PrismaClient();

// Simula la funzione validateAndFilterPermissions
const VALID_PERSON_PERMISSIONS = [
  'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
  'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
  'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
  'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
  'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
  'MANAGE_ENROLLMENTS', 'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS',
  'DOWNLOAD_DOCUMENTS', 'ADMIN_PANEL', 'SYSTEM_SETTINGS', 'USER_MANAGEMENT',
  'ROLE_MANAGEMENT', 'TENANT_MANAGEMENT', 'VIEW_GDPR_DATA', 'EXPORT_GDPR_DATA',
  'DELETE_GDPR_DATA', 'MANAGE_CONSENTS', 'VIEW_REPORTS', 'CREATE_REPORTS', 'EXPORT_REPORTS'
];

function isValidPersonPermission(permissionId) {
  if (!permissionId || typeof permissionId !== 'string') {
    return false;
  }
  
  const cleanPermissionId = permissionId.trim().toUpperCase();
  return VALID_PERSON_PERMISSIONS.includes(cleanPermissionId);
}

function validateAndFilterPermissions(permissions) {
  if (!Array.isArray(permissions)) {
    return [];
  }
  
  return permissions.filter(perm => {
    if (!perm || !perm.permissionId) {
      logger.warn(`Permission without permissionId found: ${JSON.stringify(perm)}`);
      return false;
    }
    
    const isValid = isValidPersonPermission(perm.permissionId);
    if (!isValid) {
      logger.warn(`Invalid permission found and filtered out: ${perm.permissionId}`);
    }
    
    return isValid;
  });
}

async function testRolePermissions() {
  try {
    console.log('🔍 Testing role permissions logic...');
    
    // Simula i permessi che il frontend invia
    const testPermissions = [
      {
        permissionId: 'ROLE_MANAGEMENT',
        granted: true,
        scope: 'all',
        tenantIds: [],
        fieldRestrictions: []
      },
      {
        permissionId: 'VIEW_COMPANIES',
        granted: true,
        scope: 'all',
        tenantIds: [],
        fieldRestrictions: []
      },
      {
        permissionId: 'CREATE_EMPLOYEES',
        granted: true,
        scope: 'tenant',
        tenantIds: [1],
        fieldRestrictions: []
      }
    ];
    
    console.log('📋 Test permissions:', JSON.stringify(testPermissions, null, 2));
    
    // Test validazione
    const validPermissions = validateAndFilterPermissions(testPermissions);
    console.log('✅ Valid permissions:', validPermissions.length, '/', testPermissions.length);
    console.log('📋 Valid permissions details:', JSON.stringify(validPermissions, null, 2));
    
    // Test creazione RolePermission
    const rolePermissionsToCreate = validPermissions
      .filter(perm => perm.granted)
      .map(perm => {
        const normalizedPermissionId = perm.permissionId.trim().toUpperCase();
        console.log(`🔧 Processing permission: ${perm.permissionId} -> ${normalizedPermissionId}`);

        return {
          personRoleId: 'test-person-role-id',
          permission: normalizedPermissionId,
          isGranted: true,
          grantedBy: 'test-user-id'
        };
      });
    
    console.log('📋 Role permissions to create:', JSON.stringify(rolePermissionsToCreate, null, 2));
    
    // Test creazione AdvancedPermission
    const advancedPermissionsToCreate = validPermissions
      .filter(perm => perm.granted && (perm.scope !== 'all' || perm.tenantIds?.length > 0 || perm.fieldRestrictions?.length > 0))
      .map(perm => {
        console.log(`🔧 Processing advanced permission: ${perm.permissionId}`);
        
        const normalizedPermissionId = perm.permissionId.trim().toUpperCase();
        const parts = normalizedPermissionId.split('_');
        console.log(`🔧 Permission parts: ${JSON.stringify(parts)}`);
        
        if (parts.length < 2) {
          console.warn(`Malformed permissionId (missing underscore): ${normalizedPermissionId}`);
          return null;
        }

        const action = parts[0].toLowerCase();
        const resource = parts.slice(1).join('_').toLowerCase();
        
        console.log(`🔧 Extracted - action: ${action}, resource: ${resource}`);
        
        if (!resource || resource.trim() === '') {
          console.warn(`Empty resource extracted from permissionId: ${normalizedPermissionId}`);
          return null;
        }

        return {
          personRoleId: 'test-person-role-id',
          resource: resource,
          action: action,
          scope: perm.scope || 'global',
          conditions: perm.tenantIds && perm.tenantIds.length > 0 ? { allowedTenants: perm.tenantIds } : null,
          allowedFields: perm.fieldRestrictions && perm.fieldRestrictions.length > 0 ? perm.fieldRestrictions : null
        };
      })
      .filter(perm => perm !== null);
    
    console.log('📋 Advanced permissions to create:', JSON.stringify(advancedPermissionsToCreate, null, 2));
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRolePermissions();