import { PrismaClient } from '@prisma/client';
import { RBACService } from './middleware/rbac.js';

const prisma = new PrismaClient();

async function testRBACService() {
  try {
    console.log('🔍 Testing RBAC Service directly...\n');

    // Trova l'admin
    const adminPerson = await prisma.person.findFirst({
      where: { email: 'admin@example.com' }
    });

    if (!adminPerson) {
      console.log('❌ Admin not found');
      return;
    }

    console.log('👤 Admin found:', adminPerson.id);

    // Test del servizio RBAC
    console.log('\n🔐 Testing RBACService.getPersonPermissions...');
    const permissions = await RBACService.getPersonPermissions(adminPerson.id);

    console.log('\n📋 All permissions returned by RBAC Service:');
    Object.keys(permissions).forEach(key => {
      if (permissions[key] === true) {
        console.log(`  ✅ ${key}`);
      }
    });

    console.log('\n🎯 Specific permission checks:');
    const permissionsToCheck = [
      'VIEW_PERSONS',
      'persons:read',
      'persons:view',
      'employees:read',
      'trainers:read'
    ];

    permissionsToCheck.forEach(permission => {
      const hasPermission = permissions[permission] === true;
      console.log(`  ${hasPermission ? '✅' : '❌'} ${permission}: ${hasPermission ? 'GRANTED' : 'MISSING'}`);
    });

    console.log('\n📊 Summary:');
    console.log(`  - Total permissions: ${Object.keys(permissions).filter(k => permissions[k] === true).length}`);
    console.log(`  - Has VIEW_PERSONS: ${permissions['VIEW_PERSONS'] === true}`);
    console.log(`  - Has persons:read: ${permissions['persons:read'] === true}`);

  } catch (error) {
    console.error('❌ Error testing RBAC Service:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRBACService();