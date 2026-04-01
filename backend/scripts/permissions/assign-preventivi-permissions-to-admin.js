/**
 * Script per assegnare permessi PREVENTIVI e CODICI_SCONTO all'admin
 * Usa i permessi dell'enum PersonPermission
 * Esegue: node scripts/assign-preventivi-permissions-to-admin.js
 */

import prisma from '../config/prisma-optimization.js';
import { logger } from '../utils/logger.js';

const PREVENTIVI_PERMISSIONS = [
  'VIEW_PREVENTIVI',
  'CREATE_PREVENTIVI',
  'EDIT_PREVENTIVI',
  'DELETE_PREVENTIVI',
  'MANAGE_PREVENTIVI',
  'GENERATE_PREVENTIVI_PDF',
  'SEND_PREVENTIVI'
];

const CODICI_SCONTO_PERMISSIONS = [
  'VIEW_CODICI_SCONTO',
  'CREATE_CODICI_SCONTO',
  'EDIT_CODICI_SCONTO',
  'DELETE_CODICI_SCONTO',
  'MANAGE_CODICI_SCONTO'
];

async function assignPermissionsToAdmin() {
  try {
    logger.info('🚀 Inizio assegnazione permessi preventivi/codici-sconto all\'admin...');

    // P48: Trova utente admin per email nel PersonTenantProfile
    const adminProfile = await prisma.personTenantProfile.findFirst({
      where: { email: 'admin@example.com', deletedAt: null },
      include: { person: true }
    });
    const admin = adminProfile?.person;

    if (!admin) {
      logger.error('❌ Utente admin non trovato!');
      process.exit(1);
    }

    logger.info(`✅ Trovato admin: admin@example.com (${admin.id})`);

    // 2. Trova o crea PersonRole per admin
    let adminPersonRole = await prisma.personRole.findFirst({
      where: {
        personId: admin.id,
        isActive: true
      }
    });

    if (!adminPersonRole) {
      logger.info('📝 PersonRole non trovato, ne creo uno nuovo...');

      // Crea PersonRole admin
      adminPersonRole = await prisma.personRole.create({
        data: {
          personId: admin.id,
          roleType: 'ADMIN',
          level: 1,
          isActive: true,
          tenantId: admin.tenantId
        }
      });

      logger.info(`✅ Creato PersonRole: ${adminPersonRole.id}`);
    } else {
      logger.info(`✅ Trovato PersonRole esistente: ${adminPersonRole.id}`);
    }

    // 3. Assegna permessi PREVENTIVI
    logger.info('📋 Assegnazione permessi PREVENTIVI...');
    for (const perm of PREVENTIVI_PERMISSIONS) {
      try {
        // Check se esiste già
        const existing = await prisma.rolePermission.findUnique({
          where: {
            personRoleId_permission: {
              personRoleId: adminPersonRole.id,
              permission: perm
            }
          }
        });

        if (existing) {
          logger.info(`⏭️  Permesso ${perm} già assegnato`);
          continue;
        }

        // Crea assegnazione
        await prisma.rolePermission.create({
          data: {
            personRoleId: adminPersonRole.id,
            permission: perm,
            isGranted: true,
            grantedBy: admin.id
          }
        });

        logger.info(`✅ Assegnato permesso: ${perm}`);
      } catch (error) {
        logger.error(`❌ Errore assegnazione ${perm}:`, error.message);
      }
    }

    // 4. Assegna permessi CODICI_SCONTO
    logger.info('📋 Assegnazione permessi CODICI_SCONTO...');
    for (const perm of CODICI_SCONTO_PERMISSIONS) {
      try {
        // Check se esiste già
        const existing = await prisma.rolePermission.findUnique({
          where: {
            personRoleId_permission: {
              personRoleId: adminPersonRole.id,
              permission: perm
            }
          }
        });

        if (existing) {
          logger.info(`⏭️  Permesso ${perm} già assegnato`);
          continue;
        }

        // Crea assegnazione
        await prisma.rolePermission.create({
          data: {
            personRoleId: adminPersonRole.id,
            permission: perm,
            isGranted: true,
            grantedBy: admin.id
          }
        });

        logger.info(`✅ Assegnato permesso: ${perm}`);
      } catch (error) {
        logger.error(`❌ Errore assegnazione ${perm}:`, error.message);
      }
    }

    logger.info('🎊 Operazione completata con successo!');
    logger.info(`📊 Permessi assegnati: ${PREVENTIVI_PERMISSIONS.length + CODICI_SCONTO_PERMISSIONS.length}`);

  } catch (error) {
    logger.error('❌ Errore durante assegnazione permessi:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui
assignPermissionsToAdmin()
  .then(() => {
    console.log('\n✅ Script completato con successo!');
    console.log('🔄 Riavvia il server API per applicare i nuovi permessi');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Errore:', error);
    process.exit(1);
  });
