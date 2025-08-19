import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminPermissions() {
  try {
    const admin = await prisma.person.findUnique({
      where: { email: 'admin@example.com' },
      include: {
        personRoles: {
          where: { isActive: true },
          include: {
            permissions: true
          }
        }
      }
    });
    
    if (!admin) {
      console.log('❌ Admin non trovato');
      return;
    }
    
    console.log('👤 Admin trovato:', admin.email);
    console.log('🔑 Ruoli attivi:', admin.personRoles.length);
    
    admin.personRoles.forEach(role => {
      console.log(`\nRuolo: ${role.roleType}`);
      console.log(`Permessi (${role.permissions.length}):`);
      role.permissions.forEach(p => {
        console.log(`  - ${p.permission}: ${p.isGranted ? '✅' : '❌'}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminPermissions();