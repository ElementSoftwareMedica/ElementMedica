/**
 * Script per aggiungere i permessi persons all'utente admin
 * Risolve il problema di "Accesso Negato" per dipendenti, formatori e corsi
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addPersonsPermissions() {
  try {
    console.log('🔍 Cercando utente admin...');
    
    // Trova l'utente admin
    const admin = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      },
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
      console.error('❌ Utente admin non trovato!');
      return;
    }

    console.log(`✅ Trovato admin: ${admin.firstName} ${admin.lastName} (${admin.email})`);

    // Trova o crea il ruolo SUPER_ADMIN
    let superAdminRole = admin.personRoles.find(pr => pr.roleType === 'SUPER_ADMIN');
    
    if (!superAdminRole) {
      console.log('📝 Creando ruolo SUPER_ADMIN per admin...');
      superAdminRole = await prisma.personRole.create({
        data: {
          personId: admin.id,
          roleType: 'SUPER_ADMIN',
          isActive: true,
          level: 1,
          tenantId: admin.tenantId,
          permissions: {
            create: []
          }
        },
        include: {
          permissions: true
        }
      });
    }

    console.log(`✅ Ruolo SUPER_ADMIN trovato/creato: ${superAdminRole.id}`);

    // Permessi persons da aggiungere
    const personsPermissions = [
      'VIEW_PERSONS',
      'CREATE_PERSONS', 
      'EDIT_PERSONS',
      'DELETE_PERSONS'
    ];

    // Verifica quali permessi mancano
    const existingPermissions = superAdminRole.permissions.map(p => p.permission);
    const missingPermissions = personsPermissions.filter(p => !existingPermissions.includes(p));

    if (missingPermissions.length === 0) {
      console.log('✅ Tutti i permessi persons sono già presenti!');
      return;
    }

    console.log(`📝 Aggiungendo ${missingPermissions.length} permessi mancanti:`, missingPermissions);

    // Aggiungi i permessi mancanti
    for (const permission of missingPermissions) {
      await prisma.rolePermission.create({
        data: {
          personRoleId: superAdminRole.id,
          permission: permission,
          isGranted: true
        }
      });
      console.log(`  ✅ Aggiunto: ${permission}`);
    }

    console.log('🎉 Permessi persons aggiunti con successo!');
    
    // Verifica finale
    const updatedRole = await prisma.personRole.findUnique({
      where: { id: superAdminRole.id },
      include: {
        permissions: {
          where: { isGranted: true }
        }
      }
    });

    console.log('\n📋 Permessi finali dell\'admin:');
    updatedRole.permissions.forEach(p => {
      console.log(`  - ${p.permission}`);
    });

  } catch (error) {
    console.error('❌ Errore durante l\'aggiunta dei permessi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui lo script
addPersonsPermissions();