import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkExistingPermissions() {
  try {
    console.log('🔍 Verifica permessi esistenti nel database...\n');
    
    const permissions = await prisma.permission.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log(`📋 Trovati ${permissions.length} permessi nel database:`);
    permissions.forEach(p => {
      console.log(`  - ${p.name} (${p.resource}.${p.action}): ${p.description}`);
    });
    
    console.log('\n🔗 Verifica assegnazioni RolePermission...');
    const rolePermissions = await prisma.rolePermission.findMany({
      include: {
        permission: true,
        personRole: {
          select: {
            roleType: true,
            person: {
              select: { email: true }
            }
          }
        }
      }
    });
    
    console.log(`📊 Trovate ${rolePermissions.length} assegnazioni ruolo-permesso:`);
    rolePermissions.forEach(rp => {
      console.log(`  - ${rp.personRole.person.email} (${rp.personRole.roleType}): ${rp.permission.name} = ${rp.isGranted}`);
    });
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingPermissions();