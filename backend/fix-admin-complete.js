import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });

const prisma = new PrismaClient();

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
  'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'EDIT_HIERARCHY', 'DELETE_HIERARCHY', 'MANAGE_HIERARCHY',
  'VIEW_PREVENTIVI', 'CREATE_PREVENTIVI', 'EDIT_PREVENTIVI', 'DELETE_PREVENTIVI', 'MANAGE_PREVENTIVI'
];

async function fixAdminPermissions() {
  try {
    console.log('🔧 Fix completo permessi ADMIN...\n');

    // 1. Trova l'utente admin
    const admin = await prisma.person.findUnique({
      where: { email: 'admin@example.com' },
      include: {
        personRoles: {
          where: { isActive: true }
        }
      }
    });

    if (!admin) {
      console.log('❌ Utente admin@example.com non trovato!');
      return;
    }

    console.log(`✅ Trovato utente admin: ${admin.id}`);
    console.log(`   GlobalRole: ${admin.globalRole}`);
    console.log(`   PersonRoles attivi: ${admin.personRoles.length}`);

    // 2. Verifica se esiste già un PersonRole ADMIN
    let adminRole = admin.personRoles.find(pr => pr.roleType === 'ADMIN');

    if (!adminRole) {
      console.log('\n📝 PersonRole ADMIN non trovato, lo creo...');
      
      // Crea PersonRole ADMIN
      adminRole = await prisma.personRole.create({
        data: {
          personId: admin.id,
          tenantId: admin.tenantId,
          roleType: 'ADMIN',
          isActive: true
        }
      });
      
      console.log(`✅ Creato PersonRole ADMIN: ${adminRole.id}`);
    } else {
      console.log(`✅ PersonRole ADMIN esistente: ${adminRole.id}`);
    }

    // 3. Rimuovi permessi esistenti
    const deletedCount = await prisma.rolePermission.deleteMany({
      where: { personRoleId: adminRole.id }
    });
    console.log(`\n🗑️ Rimossi ${deletedCount.count} permessi esistenti`);

    // 4. Assegna tutti i permessi
    console.log('\n📋 Assegnazione permessi...');
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
        console.log(`  ✅ ${permission}`);
      } catch (error) {
        console.log(`  ⚠️ Errore: ${permission} - ${error.message}`);
      }
    }

    console.log(`\n🎉 Completato! Assegnati ${assignedCount}/${ADMIN_PERMISSIONS.length} permessi`);

    // 5. Verifica finale
    const finalPermissions = await prisma.rolePermission.findMany({
      where: {
        personRoleId: adminRole.id,
        isGranted: true
      }
    });

    console.log(`\n📊 Verifica finale:`);
    console.log(`   PersonRole ID: ${adminRole.id}`);
    console.log(`   Permessi totali: ${finalPermissions.length}`);
    console.log(`\n✅ Fix completato con successo!`);

  } catch (error) {
    console.error('\n❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminPermissions();
