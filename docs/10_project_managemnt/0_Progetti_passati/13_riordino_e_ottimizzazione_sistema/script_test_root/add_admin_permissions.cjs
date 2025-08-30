/**
 * Script per aggiungere permessi specifici all'utente admin@example.com
 * per gestire le companies e altri permessi amministrativi
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

console.log('🔧 AGGIUNTA PERMESSI ADMIN');
console.log('============================================================');
console.log('');
console.log('🎯 OBIETTIVO: Aggiungere permessi companies e admin all\'utente admin@example.com');
console.log('');

async function addAdminPermissions() {
  try {
    console.log('1. 🔍 Ricerca utente admin@example.com...');
    
    const adminUser = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      },
      include: {
        personRoles: {
          where: {
            isActive: true
          },
          include: {
            permissions: true
          }
        }
      }
    });
    
    if (!adminUser) {
      throw new Error('Utente admin@example.com non trovato');
    }
    
    console.log(`   ✅ Utente trovato: ${adminUser.email} (ID: ${adminUser.id})`);
    console.log(`   📊 Ruoli attivi: ${adminUser.personRoles.length}`);
    console.log('');
    
    // Permessi da aggiungere per l'admin
    const adminPermissions = [
      // Gestione companies (NUOVO)
      'VIEW_COMPANIES',
      'CREATE_COMPANIES',
      'EDIT_COMPANIES',
      'DELETE_COMPANIES',
      'companies:read',
      'companies:write',
      'companies:create',
      'companies:update',
      'companies:delete',
      
      // Gestione utenti
      'VIEW_USERS',
      'CREATE_USERS', 
      'EDIT_USERS',
      'DELETE_USERS',
      'USER_MANAGEMENT',
      'users:read',
      'users:write',
      'users:create',
      'users:update',
      'users:delete',
      
      // Gestione dipendenti
      'VIEW_EMPLOYEES',
      'CREATE_EMPLOYEES',
      'EDIT_EMPLOYEES', 
      'DELETE_EMPLOYEES',
      'employees:read',
      'employees:write',
      'employees:create',
      'employees:update',
      'employees:delete',
      
      // Gestione trainer
      'VIEW_TRAINERS',
      'CREATE_TRAINERS',
      'EDIT_TRAINERS',
      'DELETE_TRAINERS',
      'trainers:read',
      'trainers:write',
      'trainers:create',
      'trainers:update',
      'trainers:delete',
      
      // Gestione corsi
      'VIEW_COURSES',
      'CREATE_COURSES',
      'EDIT_COURSES',
      'DELETE_COURSES',
      'MANAGE_ENROLLMENTS',
      'courses:read',
      'courses:write',
      'courses:create',
      'courses:update',
      'courses:delete',
      
      // Gestione documenti
      'CREATE_DOCUMENTS',
      'EDIT_DOCUMENTS',
      'DELETE_DOCUMENTS',
      'DOWNLOAD_DOCUMENTS',
      'documents:read',
      'documents:write',
      'documents:create',
      'documents:update',
      'documents:delete',
      
      // Amministrazione sistema
      'ADMIN_PANEL',
      'SYSTEM_SETTINGS',
      'ROLE_MANAGEMENT',
      'TENANT_MANAGEMENT',
      'system:admin',
      'system:read',
      'system:write',
      
      // GDPR
      'VIEW_GDPR_DATA',
      'EXPORT_GDPR_DATA',
      'DELETE_GDPR_DATA',
      'MANAGE_CONSENTS',
      
      // Report
      'VIEW_REPORTS',
      'CREATE_REPORTS',
      'EXPORT_REPORTS'
    ];
    
    console.log('2. 🔑 Aggiunta permessi ai ruoli admin...');
    
    for (const role of adminUser.personRoles) {
      console.log(`   📋 Elaborazione ruolo: ${role.roleType}`);
      
      // Rimuovi permessi esistenti per questo ruolo
      await prisma.rolePermission.deleteMany({
        where: {
          personRoleId: role.id
        }
      });
      
      console.log(`      🗑️  Permessi esistenti rimossi`);
      
      // Aggiungi tutti i permessi admin
      for (const permission of adminPermissions) {
        try {
          await prisma.rolePermission.create({
            data: {
              personRoleId: role.id,
              permission: permission,
              isGranted: true,
              grantedAt: new Date()
            }
          });
        } catch (error) {
          // Ignora errori di permessi duplicati o non validi
          console.log(`      ⚠️  Permesso ${permission} non aggiunto: ${error.message}`);
        }
      }
      
      console.log(`      ✅ Permessi aggiunti al ruolo ${role.roleType}`);
    }
    
    console.log('');
    console.log('3. 📊 Verifica permessi assegnati...');
    
    const updatedUser = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      },
      include: {
        personRoles: {
          where: {
            isActive: true
          },
          include: {
            permissions: {
              where: {
                isGranted: true
              }
            }
          }
        }
      }
    });
    
    let totalPermissions = 0;
    for (const role of updatedUser.personRoles) {
      console.log(`   📋 Ruolo ${role.roleType}: ${role.permissions.length} permessi`);
      totalPermissions += role.permissions.length;
      
      // Mostra alcuni permessi per verifica
      const samplePermissions = role.permissions.slice(0, 5);
      for (const perm of samplePermissions) {
        console.log(`      - ${perm.permission}`);
      }
      if (role.permissions.length > 5) {
        console.log(`      ... e altri ${role.permissions.length - 5} permessi`);
      }
    }
    
    console.log('');
    console.log('🎉 OPERAZIONE COMPLETATA!');
    console.log('');
    console.log('📋 RIEPILOGO:');
    console.log(`   👤 Utente: ${updatedUser.email}`);
    console.log(`   🔑 Ruoli attivi: ${updatedUser.personRoles.length}`);
    console.log(`   🛡️  Permessi totali: ${totalPermissions}`);
    console.log('');
    console.log('   ✅ L\'utente admin ora ha accesso completo alle companies!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Errore durante l\'aggiunta dei permessi:', error);
    throw error;
  }
}

// Esegui lo script
addAdminPermissions()
  .then(() => {
    console.log('✅ Script completato con successo');
  })
  .catch((error) => {
    console.error('❌ Script fallito:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });