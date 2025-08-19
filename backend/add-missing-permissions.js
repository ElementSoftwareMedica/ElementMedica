const prisma = new PrismaClient();

async function addMissingPermissions() {
  try {
    console.log('🔧 Aggiunta permessi mancanti per CMS e Form...');

    // Permessi da aggiungere
    const requiredPermissions = [
      'VIEW_SUBMISSIONS',
      'MANAGE_SUBMISSIONS',
      'EXPORT_SUBMISSIONS',
      'VIEW_FORM_SUBMISSIONS',
      'CREATE_FORM_SUBMISSIONS',
      'EDIT_FORM_SUBMISSIONS',
      'DELETE_FORM_SUBMISSIONS',
      'MANAGE_FORM_SUBMISSIONS',
      'EXPORT_FORM_SUBMISSIONS',
      'VIEW_FORM_TEMPLATES',
      'CREATE_FORM_TEMPLATES',
      'EDIT_FORM_TEMPLATES',
      'DELETE_FORM_TEMPLATES',
      'MANAGE_FORM_TEMPLATES',
      'VIEW_PUBLIC_CMS',
      'CREATE_PUBLIC_CMS',
      'EDIT_PUBLIC_CMS',
      'DELETE_PUBLIC_CMS',
      'MANAGE_PUBLIC_CMS',
      'MANAGE_PUBLIC_CONTENT',
      'READ_PUBLIC_CONTENT'
    ];

    // Trova tutti i PersonRole con roleType ADMIN
    const adminRoles = await prisma.personRole.findMany({
      where: { 
        roleType: 'ADMIN',
        isActive: true,
        deletedAt: null
      },
      include: {
        person: true
      }
    });

    if (adminRoles.length === 0) {
      console.log('❌ Nessun ruolo ADMIN attivo trovato');
      return;
    }

    console.log(`✅ Trovati ${adminRoles.length} ruoli ADMIN attivi`);

    // Per ogni ruolo ADMIN, aggiungi i permessi mancanti
    for (const adminRole of adminRoles) {
      console.log(`\n🔧 Processando ruolo ADMIN per: ${adminRole.person.email}`);
      
      for (const permission of requiredPermissions) {
        // Verifica se il permesso esiste già
        const existingPermission = await prisma.rolePermission.findFirst({
          where: {
            personRoleId: adminRole.id,
            permission: permission,
            deletedAt: null
          }
        });

        if (!existingPermission) {
          // Aggiungi il permesso
          await prisma.rolePermission.create({
            data: {
              personRoleId: adminRole.id,
              permission: permission,
              isGranted: true,
              grantedAt: new Date(),
              grantedBy: adminRole.personId // Auto-granted
            }
          });
          console.log(`✅ Aggiunto permesso ${permission} per ${adminRole.person.email}`);
        } else if (!existingPermission.isGranted) {
          // Abilita il permesso se esiste ma non è granted
          await prisma.rolePermission.update({
            where: { id: existingPermission.id },
            data: { 
              isGranted: true,
              grantedAt: new Date(),
              deletedAt: null
            }
          });
          console.log(`✅ Abilitato permesso ${permission} per ${adminRole.person.email}`);
        } else {
          console.log(`⚠️  Permesso ${permission} già presente per ${adminRole.person.email}`);
        }
      }
    }

    console.log('\n🎉 Operazione completata!');

  } catch (error) {
    console.error('❌ Errore:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingPermissions();