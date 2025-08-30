import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });

const prisma = new PrismaClient();

// Permessi di default per il ruolo ADMIN (dal modulo RoleTypes)
const ADMIN_PERMISSIONS = [
  'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
  'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
  'VIEW_PERSONS', 'CREATE_PERSONS', 'EDIT_PERSONS', 'DELETE_PERSONS',
  'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
  'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
  'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
  'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
  'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES', 'DELETE_SCHEDULES',
  'VIEW_GDPR', 'CREATE_GDPR', 'EDIT_GDPR', 'DELETE_GDPR', 'MANAGE_GDPR',
  'ROLE_MANAGEMENT', 'VIEW_ROLES', 'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES',
  'MANAGE_USERS', 'ASSIGN_ROLES', 'REVOKE_ROLES',
  'VIEW_REPORTS', 'CREATE_REPORTS', 'EDIT_REPORTS', 'EXPORT_REPORTS',
  'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'EDIT_HIERARCHY', 'DELETE_HIERARCHY', 'MANAGE_HIERARCHY'
];

async function assignPermissionsToAdminRole() {
  try {
    console.log('🔧 Assegnazione permessi al ruolo ADMIN...');

    // 1. Trova l'utente admin
    const admin = await prisma.person.findUnique({
      where: {
        email: 'admin@example.com'
      },
      include: {
        personRoles: {
          where: {
            isActive: true,
            roleType: 'ADMIN'
          }
        }
      }
    });

    if (!admin) {
      console.log('❌ Utente admin non trovato!');
      return;
    }

    if (admin.personRoles.length === 0) {
      console.log('❌ Ruolo ADMIN non trovato per l\'utente admin!');
      return;
    }

    const adminRole = admin.personRoles[0];
    console.log(`✅ Trovato ruolo ADMIN: ${adminRole.id}`);

    // 2. Rimuovi i permessi esistenti per questo ruolo
    const deletedCount = await prisma.rolePermission.deleteMany({
      where: {
        personRoleId: adminRole.id
      }
    });
    console.log(`🗑️ Rimossi ${deletedCount.count} permessi esistenti`);

    // 3. Assegna i nuovi permessi
    let assignedCount = 0;
    for (const permission of ADMIN_PERMISSIONS) {
      try {
        await prisma.rolePermission.create({
          data: {
            personRoleId: adminRole.id,
            permission: permission,
            isGranted: true
          }
        });
        assignedCount++;
        console.log(`✅ Assegnato permesso: ${permission}`);
      } catch (error) {
        console.log(`⚠️ Errore assegnando ${permission}:`, error.message);
      }
    }

    console.log(`\n🎉 Completato! Assegnati ${assignedCount}/${ADMIN_PERMISSIONS.length} permessi al ruolo ADMIN`);

    // 4. Verifica finale
    const finalCheck = await prisma.rolePermission.count({
      where: {
        personRoleId: adminRole.id,
        isGranted: true
      }
    });
    console.log(`📊 Permessi totali assegnati: ${finalCheck}`);

  } catch (error) {
    console.error('❌ Errore durante l\'assegnazione:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui lo script
assignPermissionsToAdminRole();