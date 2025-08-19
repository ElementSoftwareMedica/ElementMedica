import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyRolePermissions() {
  console.log('🔍 Verifica permessi ruoli dopo correzione...\n');
  
  try {
    // 1. Verifica PersonRole esistenti
    const personRoles = await prisma.personRole.findMany({
      where: {
        deletedAt: null,
        isActive: true
      },
      include: {
        person: {
          select: { email: true }
        }
      }
    });
    
    console.log(`📋 PersonRole attivi: ${personRoles.length}`);
    
    // 2. Per ogni PersonRole, mostra i permessi
    for (const personRole of personRoles) {
      console.log(`\n👤 ${personRole.person.email} - ${personRole.roleType}:`);
      
      const rolePermissions = await prisma.rolePermission.findMany({
        where: {
          personRoleId: personRole.id,
          deletedAt: null
        },
        orderBy: {
          permission: 'asc'
        }
      });
      
      console.log(`  📝 Permessi totali: ${rolePermissions.length}`);
      
      const grantedPermissions = rolePermissions.filter(rp => rp.isGranted);
      const deniedPermissions = rolePermissions.filter(rp => !rp.isGranted);
      
      console.log(`  ✅ Permessi concessi: ${grantedPermissions.length}`);
      console.log(`  ❌ Permessi negati: ${deniedPermissions.length}`);
      
      if (grantedPermissions.length > 0) {
        console.log('  📋 Permessi concessi:');
        grantedPermissions.forEach(rp => {
          console.log(`    - ${rp.permission}`);
        });
      }
      
      if (deniedPermissions.length > 0) {
        console.log('  📋 Permessi negati:');
        deniedPermissions.forEach(rp => {
          console.log(`    - ${rp.permission}`);
        });
      }
    }
    
    // 3. Statistiche generali
    console.log('\n📊 Statistiche generali:');
    const totalRolePermissions = await prisma.rolePermission.count({
      where: { deletedAt: null }
    });
    
    const grantedCount = await prisma.rolePermission.count({
      where: { 
        deletedAt: null,
        isGranted: true
      }
    });
    
    const deniedCount = await prisma.rolePermission.count({
      where: { 
        deletedAt: null,
        isGranted: false
      }
    });
    
    console.log(`  📝 Totale RolePermission: ${totalRolePermissions}`);
    console.log(`  ✅ Permessi concessi: ${grantedCount}`);
    console.log(`  ❌ Permessi negati: ${deniedCount}`);
    
    // 4. Test query per SUPER_ADMIN (come nel debug originale)
    console.log('\n🧪 Test query SUPER_ADMIN:');
    const superAdminRole = await prisma.personRole.findFirst({
      where: {
        roleType: 'SUPER_ADMIN',
        isActive: true,
        deletedAt: null
      }
    });
    
    if (superAdminRole) {
      const superAdminPermissions = await prisma.rolePermission.findMany({
        where: {
          personRoleId: superAdminRole.id,
          isGranted: true,
          deletedAt: null
        }
      });
      
      console.log(`  ✅ SUPER_ADMIN trovato con ${superAdminPermissions.length} permessi concessi`);
    } else {
      console.log('  ❌ Nessun SUPER_ADMIN trovato');
    }
    
  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
    throw error;
  }
}

async function main() {
  try {
    await verifyRolePermissions();
    console.log('\n🎉 Verifica completata!');
  } catch (error) {
    console.error('💥 Errore fatale:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();