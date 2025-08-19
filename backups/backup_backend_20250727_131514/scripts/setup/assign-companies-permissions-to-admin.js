import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Script per assegnare tutti i permessi delle companies all'account admin
 * Questo script:
 * 1. Trova l'utente admin (admin@example.com)
 * 2. Verifica che abbia il ruolo ADMIN
 * 3. Assegna i permessi per le companies se non li ha già
 */
async function assignCompaniesPermissionsToAdmin() {
  try {
    logger.info('🚀 Inizio assegnazione permessi companies all\'admin...');
    
    // 1. Trova l'utente admin
    const adminUser = await prisma.person.findUnique({
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
    
    if (!adminUser) {
      throw new Error('Utente admin non trovato (admin@example.com)');
    }
    
    logger.info(`✅ Utente admin trovato: ${adminUser.email} (ID: ${adminUser.id})`);
    
    // 2. Trova il ruolo ADMIN dell'utente
    const adminRole = adminUser.personRoles.find(pr => pr.roleType === 'ADMIN');
    
    if (!adminRole) {
      throw new Error('Ruolo ADMIN non trovato per l\'utente admin');
    }
    
    logger.info(`✅ Ruolo ADMIN trovato (ID: ${adminRole.id})`);
    
    // 3. Definisci i permessi necessari per le companies
    const companiesPermissions = [
      'VIEW_COMPANIES',    // Per vedere le companies
      'CREATE_COMPANIES',  // Per creare companies
      'EDIT_COMPANIES',    // Per modificare companies
      'DELETE_COMPANIES',  // Per eliminare companies
      'VIEW_EMPLOYEES',    // Per vedere gli employees delle companies
      'CREATE_EMPLOYEES',  // Per creare employees
      'EDIT_EMPLOYEES',    // Per modificare employees
      'DELETE_EMPLOYEES',  // Per eliminare employees
      'ADMIN_PANEL',       // Per accesso al pannello admin
      'USER_MANAGEMENT',   // Per gestire gli utenti
      'SYSTEM_SETTINGS'    // Per le impostazioni di sistema
    ];

    // 4. Verifica quali permessi mancano
    const existingPermissions = adminRole.permissions.map(p => p.permission);
    const missingPermissions = companiesPermissions.filter(p => !existingPermissions.includes(p));

    if (missingPermissions.length === 0) {
      logger.info('✅ L\'admin ha già tutti i permessi necessari per le companies');
      return;
    }

    logger.info(`📝 Permessi mancanti da assegnare: ${missingPermissions.join(', ')}`);

    // 5. Assegna i permessi mancanti uno per uno per evitare errori di duplicati
    for (const permission of missingPermissions) {
      try {
        await prisma.rolePermission.create({
          data: {
            personRoleId: adminRole.id,
            permission: permission,
            isGranted: true,
            grantedAt: new Date(),
            grantedBy: adminUser.id
          }
        });
        logger.info(`✅ Permesso assegnato: ${permission}`);
      } catch (error) {
        if (error.code === 'P2002') {
          logger.info(`⚠️ Permesso già esistente: ${permission}`);
        } else {
          throw error;
        }
      }
    }
    
    logger.info(`✅ Assegnati ${missingPermissions.length} permessi all'admin`);
    
    // 6. Verifica finale
    const updatedAdminRole = await prisma.personRole.findUnique({
      where: { id: adminRole.id },
      include: {
        permissions: true
      }
    });
    
    const finalPermissions = updatedAdminRole.permissions.map(p => p.permission);
    logger.info(`✅ Permessi finali dell'admin: ${finalPermissions.join(', ')}`);
    
    logger.info('🎉 Assegnazione permessi completata con successo!');
    
  } catch (error) {
    logger.error('❌ Errore durante l\'assegnazione dei permessi:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui lo script se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  assignCompaniesPermissionsToAdmin()
    .then(() => {
      console.log('✅ Script completato con successo');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script fallito:', error.message);
      process.exit(1);
    });
}

export default assignCompaniesPermissionsToAdmin;