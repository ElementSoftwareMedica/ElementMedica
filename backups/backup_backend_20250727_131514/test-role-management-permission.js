import { PrismaClient } from '@prisma/client';
import { EnhancedRoleService } from './services/enhancedRoleService.js';

const prisma = new PrismaClient();
const enhancedRoleService = new EnhancedRoleService();

async function testRoleManagementPermission() {
  try {
    console.log('🔍 Testing ROLE_MANAGEMENT permission...');
    
    // 1. Trova l'utente admin
    const adminUser = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      }
    });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log(`✅ Found admin user: ${adminUser.id} (${adminUser.email})`);
    console.log(`   - globalRole: ${adminUser.globalRole}`);
    console.log(`   - companyId: ${adminUser.companyId}`);
    
    // 2. Determina il tenantId corretto
    const tenantId = adminUser.companyId || null;
    console.log(`   - tenantId: ${tenantId}`);
    
    // 3. Ottieni i ruoli dell'utente
    const userRoles = await enhancedRoleService.getUserRoles(adminUser.id, tenantId);
    console.log(`\n📋 User roles (${userRoles.length}):`);
    userRoles.forEach(role => {
      console.log(`   - ${role.roleType} (scope: ${role.roleScope}, tenantId: ${role.tenantId})`);
    });
    
    // 4. Ottieni i permessi di default per ADMIN
    const defaultPermissions = EnhancedRoleService.getDefaultPermissions('ADMIN');
    console.log(`\n🔑 Default permissions for ADMIN (${defaultPermissions.length}):`);
    console.log(`   - Has ROLE_MANAGEMENT: ${defaultPermissions.includes('ROLE_MANAGEMENT')}`);
    
    // 5. Verifica il permesso ROLE_MANAGEMENT
    const hasPermission = await enhancedRoleService.hasPermission(
      adminUser.id, 
      'ROLE_MANAGEMENT', 
      { tenantId }
    );
    
    console.log(`\n✅ Has ROLE_MANAGEMENT permission: ${hasPermission}`);
    
    // 6. Verifica tutti i permessi dell'utente (solo se tenantId non è null)
    if (tenantId) {
      const allPermissions = await enhancedRoleService.getUserPermissions(adminUser.id, tenantId);
      console.log(`\n📝 All user permissions (${allPermissions.size}):`);
      console.log(`   - Has ROLE_MANAGEMENT: ${allPermissions.has('ROLE_MANAGEMENT')}`);
    } else {
      console.log(`\n📝 Skipping getUserPermissions (tenantId is null)`);
    }
    
    // 7. Test del middleware requirePermission
    console.log(`\n🧪 Testing requirePermission middleware...`);
    
    const mockReq = {
      person: adminUser,
      tenantId: tenantId,
      tenant: tenantId ? { id: tenantId } : null
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`   - Response: ${code} - ${JSON.stringify(data)}`);
          return { status: code, data };
        }
      })
    };
    
    let nextCalled = false;
    const mockNext = () => {
      nextCalled = true;
      console.log('   - ✅ next() called - permission granted');
    };
    
    const middleware = enhancedRoleService.requirePermission('ROLE_MANAGEMENT');
    await middleware(mockReq, mockRes, mockNext);
    
    if (!nextCalled) {
      console.log('   - ❌ next() not called - permission denied');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRoleManagementPermission();