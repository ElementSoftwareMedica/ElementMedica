/**
 * Script per verificare e assegnare i permessi persons all'utente admin
 * Risolve il problema di "Accesso Negato" per le pagine persons, employees e trainers
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAdminPersonsPermissions() {
  try {
    console.log('🔍 Verificando permessi admin per persons...');
    
    // Trova l'utente admin
    const admin = await prisma.person.findFirst({
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

    if (!admin) {
      console.log('❌ Utente admin non trovato');
      return;
    }

    console.log(`✅ Admin trovato: ${admin.firstName} ${admin.lastName}`);

    // Trova il ruolo ADMIN
    const adminRole = admin.personRoles.find(role => role.roleType === 'ADMIN');
    
    if (!adminRole) {
      console.log('❌ Ruolo ADMIN non trovato per admin');
      return;
    }

    console.log(`✅ Ruolo ADMIN trovato: ${adminRole.id}`);

    // Permessi persons richiesti
    const requiredPersonsPermissions = [
      'VIEW_PERSONS',
      'CREATE_PERSONS', 
      'EDIT_PERSONS',
      'DELETE_PERSONS'
    ];

    // Verifica permessi esistenti
    const existingPermissions = adminRole.permissions.map(p => p.permission);
    console.log(`📋 Permessi esistenti: ${existingPermissions.length}`);

    // Trova permessi mancanti
    const missingPermissions = requiredPersonsPermissions.filter(p => !existingPermissions.includes(p));

    if (missingPermissions.length === 0) {
      console.log('✅ Tutti i permessi persons sono già presenti!');
      
      // Verifica anche i permessi nel middleware RBAC
      console.log('\n🔍 Verificando mappatura permessi nel middleware...');
      
      // Test della funzione di mappatura permessi
      const testPermissions = {};
      existingPermissions.forEach(permission => {
        switch (permission) {
          case 'VIEW_PERSONS':
            testPermissions['persons:read'] = true;
            break;
          case 'CREATE_PERSONS':
            testPermissions['persons:create'] = true;
            break;
          case 'EDIT_PERSONS':
            testPermissions['persons:edit'] = true;
            break;
          case 'DELETE_PERSONS':
            testPermissions['persons:delete'] = true;
            break;
        }
      });
      
      console.log('📋 Permessi mappati per frontend:');
      Object.keys(testPermissions).forEach(perm => {
        console.log(`  ✓ ${perm}`);
      });
      
      return;
    }

    console.log(`📝 Aggiungendo ${missingPermissions.length} permessi mancanti:`, missingPermissions);

    // Aggiungi i permessi mancanti
    for (const permission of missingPermissions) {
      await prisma.rolePermission.create({
        data: {
          personRoleId: adminRole.id,
          permission: permission,
          isGranted: true
        }
      });
      console.log(`  ✅ Aggiunto: ${permission}`);
    }

    console.log('\n🎉 Permessi persons aggiunti con successo!');
    
    // Verifica finale
    const updatedRole = await prisma.personRole.findUnique({
      where: { id: adminRole.id },
      include: { permissions: true }
    });
    
    const finalPermissions = updatedRole.permissions.map(p => p.permission);
    const hasAllPersonsPermissions = requiredPersonsPermissions.every(p => finalPermissions.includes(p));
    
    console.log(`\n✅ Verifica finale: ${hasAllPersonsPermissions ? 'SUCCESSO' : 'FALLITO'}`);
    console.log(`📊 Totale permessi: ${finalPermissions.length}`);

  } catch (error) {
    console.error('❌ Errore durante l\'aggiornamento permessi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui lo script
fixAdminPersonsPermissions();