import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAdminPermissions() {
  try {
    console.log('🔍 Aggiornamento permessi per il ruolo ADMIN...');

    // Trova tutti i PersonRole con roleType ADMIN
    const adminRoles = await prisma.personRole.findMany({
      where: {
        roleType: 'ADMIN',
        isActive: true
      },
      include: {
        permissions: true,
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    console.log(`📋 Trovati ${adminRoles.length} ruoli ADMIN attivi`);

    // Permessi da aggiungere (solo quelli che esistono nell'enum PersonPermission)
    const newPermissions = [
      'VIEW_PERSONS',
      'CREATE_PERSONS',
      'EDIT_PERSONS', 
      'DELETE_PERSONS',
      'VIEW_SCHEDULES',
      'CREATE_SCHEDULES',
      'EDIT_SCHEDULES',
      'DELETE_SCHEDULES',
      'VIEW_QUOTES',
      'CREATE_QUOTES',
      'EDIT_QUOTES',
      'DELETE_QUOTES',
      'VIEW_INVOICES',
      'CREATE_INVOICES',
      'EDIT_INVOICES',
      'DELETE_INVOICES',
      'VIEW_GDPR',
      'CREATE_GDPR',
      'EDIT_GDPR',
      'DELETE_GDPR',
      'VIEW_GDPR_DATA',
      'EXPORT_GDPR_DATA',
      'DELETE_GDPR_DATA',
      'MANAGE_CONSENTS'
    ];

    for (const adminRole of adminRoles) {
      console.log(`\n👤 Aggiornamento permessi per: ${adminRole.person.firstName} ${adminRole.person.lastName} (${adminRole.person.email})`);
      
      // Verifica quali permessi mancano
      const existingPermissions = adminRole.permissions.map(p => p.permission);
      const missingPermissions = newPermissions.filter(perm => !existingPermissions.includes(perm));
      
      console.log(`   📝 Permessi mancanti: ${missingPermissions.length}`);
      
      // Aggiungi i permessi mancanti
      for (const permission of missingPermissions) {
        try {
          await prisma.rolePermission.create({
            data: {
              personRoleId: adminRole.id,
              permission: permission,
              isGranted: true,
              grantedAt: new Date()
            }
          });
          console.log(`   ✅ Aggiunto permesso: ${permission}`);
        } catch (error) {
          console.log(`   ❌ Errore aggiungendo ${permission}: ${error.message}`);
        }
      }
    }

    console.log('\n🎉 Aggiornamento permessi completato!');

  } catch (error) {
    console.error('❌ Errore durante l\'aggiornamento dei permessi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPermissions();