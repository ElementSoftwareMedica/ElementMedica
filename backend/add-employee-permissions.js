import prisma from './config/prisma-optimization.js';

async function addEmployeePermissions() {
  try {
    // Trova il ruolo ADMIN
    const adminRole = await prisma.personRole.findFirst({
      where: { 
        roleType: 'ADMIN',
        person: { email: 'admin@example.com' }
      }
    });
    
    if (!adminRole) {
      console.log('❌ Ruolo ADMIN non trovato');
      return;
    }
    
    console.log('✅ Ruolo ADMIN trovato:', adminRole.id);
    
    // Permessi per employees da aggiungere
    const employeePermissions = [
      'VIEW_EMPLOYEES',
      'CREATE_EMPLOYEES', 
      'EDIT_EMPLOYEES',
      'DELETE_EMPLOYEES'
    ];
    
    for (const permission of employeePermissions) {
      // Verifica se il permesso esiste già
      const existing = await prisma.permission.findFirst({
        where: {
          personRoleId: adminRole.id,
          permission: permission
        }
      });
      
      if (!existing) {
        await prisma.permission.create({
          data: {
            personRoleId: adminRole.id,
            permission: permission,
            isGranted: true,
            grantedAt: new Date()
          }
        });
        console.log('✅ Aggiunto permesso:', permission);
      } else {
        console.log('ℹ️ Permesso già esistente:', permission);
      }
    }
    
    console.log('✅ Permessi employees aggiunti con successo');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Errore:', error);
    await prisma.$disconnect();
  }
}

addEmployeePermissions();