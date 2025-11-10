/**
 * Script per aggiungere permessi Preventivi e Codici Sconto
 * Esegue: node scripts/add-preventivi-permissions.js
 */

import prisma from '../config/prisma-optimization.js';
import { logger } from '../utils/logger.js';

const permissions = [
  // Preventivi permissions
  {
    name: 'read:preventivi',
    description: 'Visualizza preventivi',
    resource: 'preventivi',
    action: 'read'
  },
  {
    name: 'create:preventivi',
    description: 'Crea preventivi',
    resource: 'preventivi',
    action: 'create'
  },
  {
    name: 'update:preventivi',
    description: 'Modifica preventivi',
    resource: 'preventivi',
    action: 'update'
  },
  {
    name: 'delete:preventivi',
    description: 'Elimina preventivi',
    resource: 'preventivi',
    action: 'delete'
  },
  // Codici Sconto permissions
  {
    name: 'read:codici_sconto',
    description: 'Visualizza codici sconto',
    resource: 'codici_sconto',
    action: 'read'
  },
  {
    name: 'create:codici_sconto',
    description: 'Crea codici sconto',
    resource: 'codici_sconto',
    action: 'create'
  },
  {
    name: 'update:codici_sconto',
    description: 'Modifica codici sconto',
    resource: 'codici_sconto',
    action: 'update'
  },
  {
    name: 'delete:codici_sconto',
    description: 'Elimina codici sconto',
    resource: 'codici_sconto',
    action: 'delete'
  }
];

async function addPermissions() {
  try {
    logger.info('🚀 Inizio creazione permessi preventivi e codici sconto...');

    for (const perm of permissions) {
      // Check if exists
      const existing = await prisma.permission.findUnique({
        where: { name: perm.name }
      });

      if (existing) {
        logger.info(`⏭️  Permesso ${perm.name} già esistente`);
        continue;
      }

      // Create permission
      const created = await prisma.permission.create({
        data: perm
      });

      logger.info(`✅ Creato permesso: ${created.name}`);
    }

    logger.info('🎉 Tutti i permessi sono stati creati!');
    
    // Aggiungi permessi al ruolo admin
    logger.info('📝 Aggiunta permessi al ruolo admin...');
    
    const adminRole = await prisma.role.findFirst({
      where: { name: 'admin' }
    });

    if (!adminRole) {
      logger.warn('⚠️  Ruolo admin non trovato');
      process.exit(0);
    }

    const permissionIds = await prisma.permission.findMany({
      where: {
        name: {
          in: permissions.map(p => p.name)
        }
      },
      select: { id: true }
    });

    // Aggiungi permessi al ruolo admin
    for (const perm of permissionIds) {
      const existing = await prisma.rolePermission.findFirst({
        where: {
          roleId: adminRole.id,
          permissionId: perm.id
        }
      });

      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: perm.id
          }
        });
        logger.info(`✅ Aggiunto permesso al ruolo admin`);
      }
    }

    logger.info('✅ Permessi aggiunti al ruolo admin!');
    logger.info('🎊 Operazione completata con successo!');
    
  } catch (error) {
    logger.error('❌ Errore durante creazione permessi:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui
addPermissions()
  .then(() => {
    console.log('\n✅ Script completato con successo!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Errore:', error);
    process.exit(1);
  });
