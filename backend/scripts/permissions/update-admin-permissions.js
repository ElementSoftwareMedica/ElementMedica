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

    // Tutti i permessi che l'admin dovrebbe avere secondo l'enum PersonPermission
    const allAdminPermissions = [
      // Permessi base esistenti
      'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
      'VIEW_PERSONS', 'CREATE_PERSONS', 'EDIT_PERSONS', 'DELETE_PERSONS',
      'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
      'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
      'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
      'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
      'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES', 'DELETE_SCHEDULES',
      'VIEW_GDPR', 'CREATE_GDPR', 'EDIT_GDPR', 'DELETE_GDPR',
      'ROLE_MANAGEMENT', 'VIEW_ROLES', 'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES',
      'MANAGE_USERS', 'ASSIGN_ROLES', 'REVOKE_ROLES',
      'VIEW_REPORTS', 'CREATE_REPORTS', 'EDIT_REPORTS', 'EXPORT_REPORTS',
      'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'EDIT_HIERARCHY', 'DELETE_HIERARCHY', 'MANAGE_HIERARCHY',
      'ADMIN_PANEL', 'SYSTEM_SETTINGS', 'USER_MANAGEMENT', 'TENANT_MANAGEMENT',
      // Permessi per le nuove entità
      'VIEW_FORM_TEMPLATES',
      'CREATE_FORM_TEMPLATES', 
      'EDIT_FORM_TEMPLATES',
      'DELETE_FORM_TEMPLATES',
      'MANAGE_FORM_TEMPLATES',
      
      'VIEW_FORM_SUBMISSIONS',
      'CREATE_FORM_SUBMISSIONS',
      'EDIT_FORM_SUBMISSIONS', 
      'DELETE_FORM_SUBMISSIONS',
      'MANAGE_FORM_SUBMISSIONS',
      'EXPORT_FORM_SUBMISSIONS',
      
      'VIEW_PUBLIC_CMS',
      'CREATE_PUBLIC_CMS',
      'EDIT_PUBLIC_CMS',
      'DELETE_PUBLIC_CMS',
      'MANAGE_PUBLIC_CMS',
      // Permessi specifici per Templates
      'VIEW_TEMPLATES', 'CREATE_TEMPLATES', 'EDIT_TEMPLATES', 'DELETE_TEMPLATES', 'MANAGE_TEMPLATES',
      // Permessi generici per compatibilità
      'VIEW_CMS', 'CREATE_CMS', 'EDIT_CMS', 'DELETE_CMS', 'MANAGE_PUBLIC_CONTENT', 'READ_PUBLIC_CONTENT',
      'VIEW_SUBMISSIONS', 'CREATE_SUBMISSIONS', 'EDIT_SUBMISSIONS', 'DELETE_SUBMISSIONS', 'MANAGE_SUBMISSIONS', 'EXPORT_SUBMISSIONS',
      // Altri permessi GDPR
      'VIEW_GDPR_DATA', 'EXPORT_GDPR_DATA', 'DELETE_GDPR_DATA', 'MANAGE_CONSENTS',
      // Altri permessi
      'VIEW_QUOTES', 'CREATE_QUOTES', 'EDIT_QUOTES', 'DELETE_QUOTES',
      'VIEW_INVOICES', 'CREATE_INVOICES', 'EDIT_INVOICES', 'DELETE_INVOICES'
    ];

    for (const adminRole of adminRoles) {
      console.log(`\n👤 Aggiornamento permessi per: ${adminRole.person.firstName} ${adminRole.person.lastName} (${adminRole.person.email})`);
      
      // Verifica quali permessi mancano
      const existingPermissions = adminRole.permissions.map(p => p.permission);
      const missingPermissions = allAdminPermissions.filter(perm => !existingPermissions.includes(perm));
      
      console.log(`   📝 Permessi attuali: ${existingPermissions.length}`);
      console.log(`   📝 Permessi totali richiesti: ${allAdminPermissions.length}`);
      console.log(`   📝 Permessi mancanti: ${missingPermissions.length}`);
      
      if (missingPermissions.length > 0) {
        console.log(`   🔧 Aggiungendo permessi mancanti...`);
        
        // Aggiungi i permessi mancanti
        for (const permission of missingPermissions) {
          try {
            await prisma.rolePermission.create({
              data: {
                personRoleId: adminRole.id,
                permission: permission,
                isGranted: true
              }
            });
            console.log(`   ✅ Aggiunto permesso: ${permission}`);
          } catch (error) {
            console.log(`   ❌ Errore aggiungendo ${permission}: ${error.message}`);
          }
        }
      } else {
        console.log(`   ✅ Tutti i permessi sono già presenti`);
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