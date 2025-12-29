#!/usr/bin/env node

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Usa il client Prisma dal backend
const { PrismaClient } = require('./backend/node_modules/@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/element_formazione"
    }
  }
});

async function checkAndFixAdminPermissions() {
  try {
    console.log('🔍 Verifica permessi admin...');
    
    // Trova l'admin
    const admin = await prisma.person.findFirst({
      where: { email: 'admin@example.com' },
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

    console.log(`✅ Admin trovato: ${admin.email}`);
    
    // Raccogli tutti i permessi attuali
    const currentPermissions = new Set();
    admin.personRoles.forEach(personRole => {
      personRole.permissions.forEach(rolePermission => {
        currentPermissions.add(rolePermission.permission);
      });
    });

    console.log('\n📋 Permessi attuali dell\'admin:');
    Array.from(currentPermissions).sort().forEach(perm => {
      console.log(`  - ${perm}`);
    });

    // Permessi necessari per CMS e Forms
    const requiredPermissions = [
      'VIEW_PUBLIC_CMS',
      'EDIT_PUBLIC_CMS',
      'CREATE_PUBLIC_CMS',
      'DELETE_PUBLIC_CMS',
      'MANAGE_PUBLIC_CMS',
      'VIEW_FORM_TEMPLATES',
      'EDIT_FORM_TEMPLATES',
      'CREATE_FORM_TEMPLATES',
      'DELETE_FORM_TEMPLATES',
      'MANAGE_FORM_TEMPLATES',
      'VIEW_FORM_SUBMISSIONS',
      'EDIT_FORM_SUBMISSIONS',
      'CREATE_FORM_SUBMISSIONS',
      'DELETE_FORM_SUBMISSIONS',
      'MANAGE_FORM_SUBMISSIONS',
      'EXPORT_FORM_SUBMISSIONS'
    ];

    console.log('\n🎯 Permessi richiesti per CMS e Forms:');
    requiredPermissions.forEach(perm => {
      const hasIt = currentPermissions.has(perm);
      console.log(`  ${hasIt ? '✅' : '❌'} ${perm}`);
    });

    // Trova permessi mancanti
    const missingPermissions = requiredPermissions.filter(perm => !currentPermissions.has(perm));
    
    if (missingPermissions.length === 0) {
      console.log('\n🎉 Tutti i permessi necessari sono già presenti!');
      return;
    }

    console.log(`\n⚠️  Permessi mancanti (${missingPermissions.length}):`);
    missingPermissions.forEach(perm => {
      console.log(`  - ${perm}`);
    });

    // Trova il PersonRole ADMIN dell'admin
    const adminPersonRole = admin.personRoles.find(pr => pr.roleType === 'ADMIN');
    
    if (!adminPersonRole) {
      console.log('❌ PersonRole ADMIN non trovato per l\'admin');
      return;
    }

    console.log('\n🔧 Aggiunta permessi mancanti...');
    
    for (const permissionName of missingPermissions) {
      try {
        // Verifica se il PersonRole ha già questo permesso
        const existingRolePermission = await prisma.rolePermission.findUnique({
          where: {
            personRoleId_permission: {
              personRoleId: adminPersonRole.id,
              permission: permissionName
            }
          }
        });

        if (!existingRolePermission) {
          // Aggiungi il permesso al PersonRole ADMIN
          await prisma.rolePermission.create({
            data: {
              personRoleId: adminPersonRole.id,
              permission: permissionName,
              isGranted: true
            }
          });
          console.log(`  ✅ Aggiunto: ${permissionName}`);
        } else {
          console.log(`  ⚠️  Già presente: ${permissionName}`);
        }
      } catch (error) {
        console.error(`  ❌ Errore con ${permissionName}:`, error.message);
      }
    }

    console.log('\n🎉 Operazione completata!');
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixAdminPermissions();
