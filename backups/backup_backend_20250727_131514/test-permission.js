import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPermission() {
  try {
    console.log('🔧 Testing permission creation with createMany...');
    
    // Trova un PersonRole esistente
    const personRole = await prisma.personRole.findFirst({
      where: {
        roleType: 'ADMIN'
      }
    });
    
    if (!personRole) {
      console.log('❌ No ADMIN role found');
      return;
    }
    
    console.log('✅ Found PersonRole:', personRole.id);
    
    // Prova a creare più permessi con createMany
    const permissionsToCreate = [
      {
        personRoleId: personRole.id,
        permission: 'EDIT_USERS',
        isGranted: true,
        grantedBy: personRole.personId
      },
      {
        personRoleId: personRole.id,
        permission: 'DELETE_USERS',
        isGranted: true,
        grantedBy: personRole.personId
      }
    ];
    
    console.log('🔧 Permissions to create:', permissionsToCreate);
    
    const result = await prisma.rolePermission.createMany({
      data: permissionsToCreate
    });
    
    console.log('✅ Permissions created successfully:', result);
    
  } catch (error) {
    console.error('❌ Error creating permissions:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPermission();