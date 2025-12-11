/**
 * Script per assegnare permessi preventivi/codici-sconto all'admin
 * Esegue: node scripts/grant-preventivi-to-admin.js
 */

import prisma from '../config/prisma-optimization.js';
import { logger } from '../utils/logger.js';

async function grantPermissionsToAdmin() {
  try {
    logger.info('🚀 Inizio assegnazione permessi preventivi all\'admin...');

    // 1. Trova utente admin
    const admin = await prisma.person.findFirst({
      where: { email: 'admin@example.com' }
    });

    if (!admin) {
      logger.error('❌ Utente admin non trovato!');
      process.exit(1);
    }

    logger.info(`✅ Trovato admin: ${admin.email} (${admin.id})`);

    // 2. Trova permessi preventivi e codici sconto
    const permissions = await prisma.permission.findMany({
      where: {
        OR: [
          { name: { contains: 'preventivi' } },
          { name: { contains: 'codici' } }
        ]
      }
    });

    logger.info(`📋 Trovati ${permissions.length} permessi da assegnare`);

    // 3. Trova PersonRole dell'admin
    const adminRole = await prisma.personRole.findFirst({
      where: {
        personId: admin.id
      }
    });

    if (!adminRole) {
      logger.error('❌ PersonRole admin non trovato!');
      process.exit(1);
    }

    logger.info(`✅ Trovato PersonRole: ${adminRole.id}`);

    // 4. Assegna permessi
    for (const perm of permissions) {
      // Check se esiste già
      const existing = await prisma.rolePermission.findFirst({
        where: {
          personRoleId: adminRole.id,
          permissionName: perm.name
        }
      });

      if (existing) {
        logger.info(`⏭️  Permesso ${perm.name} già assegnato`);
        continue;
      }

      // Crea assegnazione
      await prisma.rolePermission.create({
        data: {
          personRoleId: adminRole.id,
          permissionName: perm.name,
          grantedById: admin.id,
          grantedAt: new Date()
        }
      });

      logger.info(`✅ Assegnato permesso: ${perm.name}`);
    }

    logger.info('🎊 Operazione completata con successo!');
    
  } catch (error) {
    logger.error('❌ Errore durante assegnazione permessi:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui
grantPermissionsToAdmin()
  .then(() => {
    console.log('\n✅ Script completato con successo!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Errore:', error);
    process.exit(1);
  });
