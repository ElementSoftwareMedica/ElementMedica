import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createAdminRoles() {
  try {
    console.log('🔍 Verifica PersonRole per admin...');
    
    const admin = await prisma.person.findFirst({
      where: { email: 'admin@example.com' },
      include: { personRoles: true }
    });
    
    if (!admin) {
      console.log('❌ Admin non trovato');
      return;
    }
    
    console.log('✅ Admin trovato:', admin.id);
    console.log('📋 PersonRole esistenti:', admin.personRoles.length);
    
    if (admin.personRoles.length === 0) {
      console.log('🔧 Creazione PersonRole per admin...');
      
      const adminRoles = [
        { 
          personId: admin.id, 
          roleType: 'SUPER_ADMIN', 
          isActive: true, 
          isPrimary: true, 
          tenantId: admin.tenantId 
        },
        { 
          personId: admin.id, 
          roleType: 'ADMIN', 
          isActive: true, 
          isPrimary: false, 
          tenantId: admin.tenantId 
        }
      ];
      
      for (const role of adminRoles) {
        await prisma.personRole.create({ data: role });
        console.log('✅ Creato ruolo:', role.roleType);
      }
    } else {
      console.log('✅ PersonRole già esistenti');
      admin.personRoles.forEach(role => {
        console.log('  -', role.roleType, role.isActive ? '(attivo)' : '(inattivo)');
      });
    }
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminRoles();