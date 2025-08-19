import bcrypt from 'bcryptjs';
import logger from './utils/logger.js';

const prisma = new PrismaClient();

async function initializeRolesAndAdmin() {
  try {
    console.log('🚀 Inizializzazione ruoli e utente admin...');

    // 1. Creare i ruoli di base se non esistono
    const roles = [
      {
        name: 'global_admin',
        displayName: 'Amministratore Globale',
        description: 'Accesso completo a tutto il sistema',
        isSystemRole: true,
        permissions: JSON.stringify([
          'users.create', 'users.read', 'users.update', 'users.delete',
          'companies.create', 'companies.read', 'companies.update', 'companies.delete',
          'employees.create', 'employees.read', 'employees.update', 'employees.delete',
          'courses.create', 'courses.read', 'courses.update', 'courses.delete',
          'documents.create', 'documents.read', 'documents.update', 'documents.delete',
          'system.admin'
        ])
      },
      {
        name: 'company_admin',
        displayName: 'Amministratore Azienda',
        description: 'Amministratore di una specifica azienda',
        isSystemRole: true,
        permissions: JSON.stringify([
          'employees.create', 'employees.read', 'employees.update', 'employees.delete',
          'courses.read', 'courses.update',
          'documents.create', 'documents.read', 'documents.update'
        ])
      },
      {
        name: 'user',
        displayName: 'Utente Standard',
        description: 'Utente con accesso limitato',
        isSystemRole: true,
        permissions: JSON.stringify([
          'employees.read',
          'courses.read',
          'documents.read'
        ])
      }
    ];

    // Roles are now managed via PersonRole with RoleType enum - no need to create separate roles
    console.log('ℹ️  Roles are managed via PersonRole with RoleType enum (ADMIN, MANAGER, EMPLOYEE, TRAINER)');

    // 2. Verificare se esiste già un admin person
    const existingAdmin = await prisma.person.findFirst({
      where: {
        OR: [
          { email: 'admin@example.com' },
          { username: 'admin' }
        ],
        deletedAt: null
      },
      include: {
        personRoles: {
          where: {
            deletedAt: null
          }
        }
      }
    });

    if (existingAdmin) {
      console.log('✅ Utente admin già esistente!');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Username:', existingAdmin.username);
      console.log('🔑 Password: Admin123! (se è l\'admin di default)');
      return existingAdmin;
    }

    // 3. Creare l'utente admin
    const adminPassword = 'Admin123!';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Creare la persona admin
    const adminPerson = await prisma.person.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        status: 'ACTIVE',
        personRoles: {
          create: {
            roleType: 'ADMIN',
            permissions: [
              'persons.view', 'persons.create', 'persons.update', 'persons.delete',
              'personRoles.view', 'personRoles.create', 'personRoles.update', 'personRoles.delete',
              'companies.view', 'companies.create', 'companies.update', 'companies.delete',
              'courses.view', 'courses.create', 'courses.update', 'courses.delete',
              'documents.view', 'documents.create', 'documents.update', 'documents.delete'
            ]
          }
        }
      },
      include: {
        personRoles: {
          where: {
            deletedAt: null
          }
        }
      }
    });

    console.log('✅ Admin person creato con successo!');
    console.log('📧 Email: admin@example.com');
    console.log('👤 Username: admin');
    console.log('🔑 Password: Admin123!');
    console.log('🎯 Ruoli assegnati:', adminUser.userRoles.map(ur => ur.role.displayName).join(', '));

    return adminUser;

  } catch (error) {
    console.error('❌ Errore durante l\'inizializzazione:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Eseguire lo script
initializeRolesAndAdmin()
  .then(() => {
    console.log('🎉 Inizializzazione completata!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Inizializzazione fallita:', error);
    process.exit(1);
  });