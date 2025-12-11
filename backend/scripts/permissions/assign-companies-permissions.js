const prisma = new PrismaClient();

async function assignCompaniesPermissions() {
  try {
    console.log('🔍 Cercando l\'utente admin...');
    
    // Trova l'utente admin
    const adminUser = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      },
      include: {
        personRoles: true
      }
    });

    if (!adminUser) {
      console.log('❌ Utente admin non trovato');
      return;
    }

    console.log(`✅ Utente admin trovato: ${adminUser.email}`);

    // Verifica che abbia il ruolo ADMIN
    const hasAdminRole = adminUser.personRoles.some(personRole => 
      personRole.roleType === 'ADMIN'
    );

    if (!hasAdminRole) {
      console.log('❌ L\'utente non ha il ruolo ADMIN');
      return;
    }

    console.log('✅ L\'utente ha il ruolo ADMIN');

    // Trova il PersonRole ADMIN dell'utente
    const adminPersonRole = adminUser.personRoles.find(role => role.roleType === 'ADMIN');

    // Lista dei permessi da assegnare (usando l'enum PersonPermission)
    const permissionsToAssign = [
      'VIEW_EMPLOYEES',
      'CREATE_EMPLOYEES', 
      'EDIT_EMPLOYEES',
      'DELETE_EMPLOYEES',
      'VIEW_USERS',
      'CREATE_USERS',
      'EDIT_USERS',
      'DELETE_USERS',
      'VIEW_COURSES',
      'CREATE_COURSES',
      'EDIT_COURSES',
      'DELETE_COURSES',
      'ADMIN_PANEL',
      'SYSTEM_SETTINGS',
      'USER_MANAGEMENT',
      'ROLE_MANAGEMENT',
      'VIEW_REPORTS',
      'CREATE_REPORTS',
      'EXPORT_REPORTS'
    ];

    console.log('🔗 Assegnando permessi al ruolo ADMIN...');

    // Assegna tutti i permessi al PersonRole ADMIN
    for (const permission of permissionsToAssign) {
      const existingRolePermission = await prisma.rolePermission.findFirst({
        where: {
          personRoleId: adminPersonRole.id,
          permission: permission
        }
      });

      if (!existingRolePermission) {
        await prisma.rolePermission.create({
          data: {
            personRoleId: adminPersonRole.id,
            permission: permission,
            isGranted: true,
            grantedBy: adminUser.id
          }
        });
        console.log(`✅ Assegnato permesso ${permission} al ruolo ADMIN`);
      } else {
        console.log(`✅ Permesso ${permission} già assegnato al ruolo ADMIN`);
      }
    }

    console.log('🎉 Tutti i permessi sono stati assegnati con successo!');

  } catch (error) {
    console.error('❌ Errore durante l\'assegnazione dei permessi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignCompaniesPermissions();