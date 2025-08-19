import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugRolePermissions() {
  try {
    console.log('🔍 Debugging role permissions...');
    
    // 1. Verifica PersonRole esistenti
    console.log('\n1. PersonRole esistenti:');
    const personRoles = await prisma.personRole.findMany({
      include: {
        person: {
          select: { email: true, firstName: true, lastName: true }
        },
        permissions: true,
        advancedPermissions: true
      }
    });
    
    console.log(`Trovati ${personRoles.length} PersonRole:`);
    personRoles.forEach(pr => {
      console.log(`- ID: ${pr.id}`);
      console.log(`  Person: ${pr.person.email} (${pr.person.firstName} ${pr.person.lastName})`);
      console.log(`  RoleType: ${pr.roleType}`);
      console.log(`  TenantId: ${pr.tenantId}`);
      console.log(`  IsActive: ${pr.isActive}`);
      console.log(`  DeletedAt: ${pr.deletedAt}`);
      console.log(`  Permissions: ${pr.permissions.length}`);
      console.log(`  AdvancedPermissions: ${pr.advancedPermissions.length}`);
      console.log('');
    });
    
    // 2. Verifica RolePermission esistenti
    console.log('\n2. RolePermission esistenti:');
    const rolePermissions = await prisma.rolePermission.findMany({
      include: {
        personRole: {
          include: {
            person: {
              select: { email: true }
            }
          }
        }
      }
    });
    
    console.log(`Trovati ${rolePermissions.length} RolePermission:`);
    rolePermissions.forEach(rp => {
      console.log(`- Permission: ${rp.permission}`);
      console.log(`  PersonRole: ${rp.personRole.roleType} (${rp.personRole.person.email})`);
      console.log(`  IsGranted: ${rp.isGranted}`);
      console.log(`  DeletedAt: ${rp.deletedAt}`);
      console.log('');
    });
    
    // 3. Test query specifica per SUPER_ADMIN
    console.log('\n3. Test query per SUPER_ADMIN:');
    const superAdminRoles = await prisma.personRole.findMany({
      where: {
        roleType: 'SUPER_ADMIN',
        isActive: true,
        deletedAt: null
      },
      include: {
        permissions: {
          where: {
            isGranted: true,
            deletedAt: null
          }
        },
        advancedPermissions: {
          where: {
            deletedAt: null
          }
        },
        person: {
          select: { email: true }
        }
      }
    });
    
    console.log(`Trovati ${superAdminRoles.length} PersonRole SUPER_ADMIN attivi:`);
    superAdminRoles.forEach(role => {
      console.log(`- Person: ${role.person.email}`);
      console.log(`  TenantId: ${role.tenantId}`);
      console.log(`  Permissions: ${role.permissions.length}`);
      role.permissions.forEach(p => {
        console.log(`    - ${p.permission} (granted: ${p.isGranted})`);
      });
      console.log(`  AdvancedPermissions: ${role.advancedPermissions.length}`);
      role.advancedPermissions.forEach(ap => {
        console.log(`    - ${ap.resource}.${ap.action}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRolePermissions();