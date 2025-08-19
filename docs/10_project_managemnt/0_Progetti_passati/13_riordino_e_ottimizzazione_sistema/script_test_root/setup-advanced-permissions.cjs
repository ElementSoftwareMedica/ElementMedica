const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupAdvancedPermissions() {
  try {
    console.log('🔧 Configurazione permessi avanzati...');
    
    // Trova l'admin user
    const adminPerson = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com',
        deletedAt: null
      },
      include: {
        personRoles: {
          where: {
            isActive: true
          }
        }
      }
    });
    
    if (!adminPerson) {
      console.error('❌ Admin user non trovato');
      return;
    }
    
    console.log('✅ Admin user trovato:', adminPerson.email);
    
    // Trova il ruolo ADMIN
    const adminRole = adminPerson.personRoles.find(role => role.roleType === 'ADMIN');
    
    if (!adminRole) {
      console.error('❌ Ruolo ADMIN non trovato per l\'utente admin');
      return;
    }
    
    console.log('✅ Ruolo ADMIN trovato:', adminRole.id);
    
    // Definisci i permessi avanzati per l'admin
    const advancedPermissions = [
      {
        personRoleId: adminRole.id,
        resource: 'companies',
        action: 'read',
        scope: 'global',
        allowedFields: ['id', 'ragione_sociale', 'codice_fiscale', 'partita_iva', 'indirizzo', 'telefono', 'email', 'created_at', 'updated_at'],
        conditions: null
      },
      {
        personRoleId: adminRole.id,
        resource: 'companies',
        action: 'create',
        scope: 'global',
        allowedFields: ['ragione_sociale', 'codice_fiscale', 'partita_iva', 'indirizzo', 'telefono', 'email'],
        conditions: null
      },
      {
        personRoleId: adminRole.id,
        resource: 'companies',
        action: 'update',
        scope: 'global',
        allowedFields: ['ragione_sociale', 'codice_fiscale', 'partita_iva', 'indirizzo', 'telefono', 'email'],
        conditions: null
      },
      {
        personRoleId: adminRole.id,
        resource: 'companies',
        action: 'delete',
        scope: 'global',
        allowedFields: null,
        conditions: null
      },
      {
        personRoleId: adminRole.id,
        resource: 'employees',
        action: 'read',
        scope: 'global',
        allowedFields: ['id', 'nome', 'cognome', 'email', 'telefono', 'companyId', 'created_at', 'updated_at'],
        conditions: null
      },
      {
        personRoleId: adminRole.id,
        resource: 'employees',
        action: 'create',
        scope: 'global',
        allowedFields: ['nome', 'cognome', 'email', 'telefono', 'companyId'],
        conditions: null
      },
      {
        personRoleId: adminRole.id,
        resource: 'employees',
        action: 'update',
        scope: 'global',
        allowedFields: ['nome', 'cognome', 'email', 'telefono', 'companyId'],
        conditions: null
      },
      {
        personRoleId: adminRole.id,
        resource: 'employees',
        action: 'delete',
        scope: 'global',
        allowedFields: null,
        conditions: null
      }
    ];
    
    // Elimina i permessi esistenti per questo ruolo
    await prisma.advancedPermission.deleteMany({
      where: {
        personRoleId: adminRole.id
      }
    });
    
    console.log('🗑️ Permessi esistenti eliminati');
    
    // Crea i nuovi permessi avanzati
    for (const permission of advancedPermissions) {
      await prisma.advancedPermission.create({
        data: permission
      });
      console.log(`✅ Creato permesso: ${permission.resource}:${permission.action} (${permission.scope})`);
    }
    
    console.log('🎉 Permessi avanzati configurati con successo!');
    
    // Verifica i permessi creati
    const createdPermissions = await prisma.advancedPermission.findMany({
      where: {
        personRoleId: adminRole.id
      }
    });
    
    console.log(`📊 Totale permessi creati: ${createdPermissions.length}`);
    
  } catch (error) {
    console.error('❌ Errore durante la configurazione dei permessi avanzati:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdvancedPermissions();