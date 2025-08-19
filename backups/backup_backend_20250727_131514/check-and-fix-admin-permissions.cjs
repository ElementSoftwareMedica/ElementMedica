#!/usr/bin/env node

/**
 * Script per verificare e correggere i permessi dell'admin
 * Esegui con: node check-and-fix-admin-permissions.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAndFixAdminPermissions() {
  try {
    console.log('🔍 Verifica permessi admin...');

    // Trova l'admin
    const admin = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com',
        deletedAt: null
      },
      include: {
        personRoles: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (!admin) {
      console.log('❌ Admin non trovato');
      return;
    }

    console.log('✅ Admin trovato:', {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName
    });

    // Verifica i ruoli
    console.log('🔍 Ruoli admin:', admin.personRoles.map(r => r.roleType));

    // Verifica se ha il ruolo ADMIN
    const hasAdminRole = admin.personRoles.some(r => r.roleType === 'ADMIN');
    
    if (!hasAdminRole) {
      console.log('❌ Admin non ha il ruolo ADMIN, aggiungendolo...');
      
      await prisma.personRole.create({
        data: {
          personId: admin.id,
          roleType: 'ADMIN',
          isActive: true,
          tenantId: admin.tenantId
        }
      });
      
      console.log('✅ Ruolo ADMIN aggiunto');
    } else {
      console.log('✅ Admin ha già il ruolo ADMIN');
    }

    // Lista di tutti i permessi che l'admin dovrebbe avere
    const requiredPermissions = [
      'VIEW_COMPANIES',
      'CREATE_COMPANIES', 
      'EDIT_COMPANIES',
      'DELETE_COMPANIES',
      'EXPORT_COMPANIES',
      'VIEW_EMPLOYEES',
      'CREATE_EMPLOYEES',
      'EDIT_EMPLOYEES', 
      'DELETE_EMPLOYEES',
      'EXPORT_EMPLOYEES',
      'VIEW_TRAINERS',
      'CREATE_TRAINERS',
      'EDIT_TRAINERS',
      'DELETE_TRAINERS', 
      'EXPORT_TRAINERS',
      'VIEW_COURSES',
      'CREATE_COURSES',
      'EDIT_COURSES',
      'DELETE_COURSES',
      'EXPORT_COURSES',
      'VIEW_DOCUMENTS',
      'CREATE_DOCUMENTS',
      'EDIT_DOCUMENTS',
      'DELETE_DOCUMENTS',
      'ADMIN_PANEL',
      'ROLE_MANAGEMENT',
      'ROLE_CREATE',
      'ROLE_EDIT',
      'ROLE_DELETE',
      'GDPR_ACCESS',
      'GDPR_EXPORT',
      'GDPR_DELETE'
    ];

    // Ottieni tutti i permessi attuali dell'admin
    const currentPermissions = new Set();
    admin.personRoles.forEach(role => {
      role.permissions.forEach(perm => {
        currentPermissions.add(perm.permission);
      });
    });

    console.log('🔍 Permessi attuali:', Array.from(currentPermissions));

    // Trova i permessi mancanti
    const missingPermissions = requiredPermissions.filter(perm => 
      !currentPermissions.has(perm)
    );

    if (missingPermissions.length > 0) {
      console.log('❌ Permessi mancanti:', missingPermissions);
      
      // Trova il ruolo ADMIN dell'utente
      const adminRole = admin.personRoles.find(r => r.roleType === 'ADMIN');
      
      if (adminRole) {
        console.log('🔧 Aggiungendo permessi mancanti...');
        
        for (const permission of missingPermissions) {
          try {
            await prisma.rolePermission.create({
              data: {
                roleId: adminRole.id,
                permission: permission
              }
            });
            console.log(`✅ Aggiunto permesso: ${permission}`);
          } catch (error) {
            if (error.code === 'P2002') {
              console.log(`⚠️ Permesso già esistente: ${permission}`);
            } else {
              console.log(`❌ Errore aggiungendo ${permission}:`, error.message);
            }
          }
        }
      }
    } else {
      console.log('✅ Tutti i permessi sono presenti');
    }

    // Verifica finale
    const updatedAdmin = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com',
        deletedAt: null
      },
      include: {
        personRoles: {
          include: {
            permissions: true
          }
        }
      }
    });

    const finalPermissions = new Set();
    updatedAdmin.personRoles.forEach(role => {
      role.permissions.forEach(perm => {
        finalPermissions.add(perm.permission);
      });
    });

    console.log('🎯 Permessi finali admin:', Array.from(finalPermissions).sort());
    console.log('📊 Totale permessi:', finalPermissions.size);

    // Verifica permessi specifici per le pagine problematiche
    const criticalPermissions = [
      'VIEW_EMPLOYEES',
      'VIEW_TRAINERS', 
      'VIEW_COURSES',
      'VIEW_COMPANIES'
    ];

    console.log('🔍 Verifica permessi critici:');
    criticalPermissions.forEach(perm => {
      const hasPermission = finalPermissions.has(perm);
      console.log(`  ${hasPermission ? '✅' : '❌'} ${perm}`);
    });

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui lo script
checkAndFixAdminPermissions();