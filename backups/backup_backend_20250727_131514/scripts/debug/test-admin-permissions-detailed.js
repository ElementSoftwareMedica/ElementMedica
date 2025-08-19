#!/usr/bin/env node

import enhancedRoleService from '../../services/enhancedRoleService.js';
import prisma from '../../config/prisma-optimization.js';

async function testAdminPermissionsDetailed() {
  try {
    console.log('🧪 Testing admin permissions in detail...');

    // 1. Trova l'utente admin
    const adminUser = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      },
      include: {
        personRoles: {
          where: {
            isActive: true
          },
          include: {
            permissions: true
          }
        }
      }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:', adminUser.id);
    console.log('📋 Admin roles:', adminUser.personRoles.map(r => r.roleType));
    console.log('🏢 Admin tenant:', adminUser.tenantId);

    // 2. Test hasPermission direttamente
    console.log('\n🔍 Testing hasPermission directly...');
    
    const context = {
      tenantId: adminUser.tenantId,
      companyId: adminUser.companyId
    };

    console.log('Context:', context);

    const hasRolesManage = await enhancedRoleService.hasPermission(
      adminUser.id, 
      'roles.manage', 
      context
    );

    console.log(`Has 'roles.manage' permission: ${hasRolesManage}`);

    // 3. Test getUserRoles
    console.log('\n🔍 Testing getUserRoles...');
    const userRoles = await enhancedRoleService.getUserRoles(adminUser.id, adminUser.tenantId);
    console.log('User roles from service:', userRoles.map(r => ({ roleType: r.roleType, scope: r.scope })));

    // 4. Test getUserPermissions
    console.log('\n🔍 Testing getUserPermissions...');
    const userPermissions = await enhancedRoleService.getUserPermissions(adminUser.id, adminUser.tenantId);
    console.log('User permissions count:', userPermissions.size);
    console.log('User permissions:', Array.from(userPermissions).slice(0, 10)); // Prime 10

    // 5. Verifica i permessi di default per ADMIN
    console.log('\n🔍 Testing default permissions for ADMIN...');
    const defaultPermissions = enhancedRoleService.constructor.getDefaultPermissions('ADMIN');
    console.log('Default ADMIN permissions:', defaultPermissions.slice(0, 10)); // Prime 10
    console.log('Has roles.manage in defaults:', defaultPermissions.includes('roles.manage'));

    // 6. Verifica ROLE_TYPES
    console.log('\n🔍 Testing ROLE_TYPES...');
    console.log('ROLE_TYPES:', Object.keys(enhancedRoleService.constructor.ROLE_TYPES || {}));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminPermissionsDetailed();