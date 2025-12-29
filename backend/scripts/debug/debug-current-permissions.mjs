#!/usr/bin/env node

import { PrismaClient } from './backend/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

async function debugCurrentPermissions() {
  try {
    console.log('🔍 === DEBUG PERMESSI ATTUALI ===\n');

    // 1. Trova l'utente admin
    const admin = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com'
      },
      include: {
        personRoles: {
          include: {
            permissions: true,
            advancedPermissions: true
          }
        }
      }
    });

    if (!admin) {
      console.log('❌ Admin non trovato');
      return;
    }

    console.log(`👤 Admin trovato: ${admin.email} (ID: ${admin.id})`);
    console.log(`📋 Ruoli: ${admin.personRoles.length}`);

    // 2. Raccogli tutti i permessi
    const allPermissions = new Set();
    
    admin.personRoles.forEach((role, roleIndex) => {
      console.log(`\n🎭 Ruolo ${roleIndex + 1}: ${role.roleType || 'Custom'} (ID: ${role.id})`);
      
      // Permessi standard
      role.permissions.forEach(rp => {
        const permissionName = rp.permission;
        allPermissions.add(permissionName);
        console.log(`  ✓ ${permissionName}`);
      });
      
      // Permessi avanzati
      role.advancedPermissions.forEach(ap => {
        const advancedPermission = `${ap.resource}:${ap.action}`;
        allPermissions.add(advancedPermission);
        console.log(`  ✓ ${advancedPermission} (avanzato)`);
      });
    });

    console.log(`\n📊 TOTALE PERMESSI: ${allPermissions.size}`);
    
    // 3. Verifica permessi specifici per CMS e Forms
    const criticalPermissions = [
      'VIEW_PUBLIC_CMS',
      'MANAGE_PUBLIC_CMS', 
      'VIEW_CMS',
      'CREATE_CMS',
      'EDIT_CMS',
      'DELETE_CMS',
      'MANAGE_PUBLIC_CONTENT',
      'READ_PUBLIC_CONTENT',
      'VIEW_FORM_TEMPLATES',
      'MANAGE_FORM_TEMPLATES',
      'CREATE_FORM_TEMPLATES',
      'EDIT_FORM_TEMPLATES',
      'DELETE_FORM_TEMPLATES',
      'VIEW_FORM_SUBMISSIONS',
      'MANAGE_FORM_SUBMISSIONS',
      'VIEW_SUBMISSIONS',
      'MANAGE_SUBMISSIONS',
      'EXPORT_SUBMISSIONS',
      'EXPORT_FORM_SUBMISSIONS'
    ];

    console.log('\n🎯 === VERIFICA PERMESSI CRITICI ===');
    criticalPermissions.forEach(permission => {
      const hasPermission = allPermissions.has(permission);
      console.log(`${hasPermission ? '✅' : '❌'} ${permission}`);
    });

    // 4. Simula la conversione frontend
    console.log('\n🔄 === SIMULAZIONE CONVERSIONE FRONTEND ===');
    
    const frontendPermissions = {};
    
    // Mantieni i permessi backend originali
    allPermissions.forEach(permission => {
      frontendPermissions[permission] = true;
    });
    
    // Aggiungi mappature frontend per CMS
    if (allPermissions.has('VIEW_PUBLIC_CMS') || allPermissions.has('VIEW_CMS') || allPermissions.has('MANAGE_PUBLIC_CMS')) {
      frontendPermissions['PUBLIC_CMS:READ'] = true;
      frontendPermissions['PUBLIC_CMS:read'] = true;
    }
    
    if (allPermissions.has('MANAGE_PUBLIC_CMS') || allPermissions.has('CREATE_CMS')) {
      frontendPermissions['PUBLIC_CMS:CREATE'] = true;
      frontendPermissions['PUBLIC_CMS:create'] = true;
    }
    
    if (allPermissions.has('MANAGE_PUBLIC_CMS') || allPermissions.has('EDIT_CMS')) {
      frontendPermissions['PUBLIC_CMS:UPDATE'] = true;
      frontendPermissions['PUBLIC_CMS:update'] = true;
    }
    
    // Aggiungi mappature frontend per Form Templates
    if (allPermissions.has('VIEW_FORM_TEMPLATES') || allPermissions.has('MANAGE_FORM_TEMPLATES')) {
      frontendPermissions['form_templates:read'] = true;
      frontendPermissions['form_templates:view'] = true;
    }
    
    if (allPermissions.has('MANAGE_FORM_TEMPLATES') || allPermissions.has('CREATE_FORM_TEMPLATES')) {
      frontendPermissions['form_templates:create'] = true;
    }
    
    if (allPermissions.has('MANAGE_FORM_TEMPLATES') || allPermissions.has('EDIT_FORM_TEMPLATES')) {
      frontendPermissions['form_templates:update'] = true;
      frontendPermissions['form_templates:edit'] = true;
    }
    
    // Aggiungi mappature frontend per Form Submissions
    if (allPermissions.has('VIEW_FORM_SUBMISSIONS') || allPermissions.has('VIEW_SUBMISSIONS') || allPermissions.has('MANAGE_FORM_SUBMISSIONS') || allPermissions.has('MANAGE_SUBMISSIONS')) {
      frontendPermissions['form_submissions:read'] = true;
      frontendPermissions['form_submissions:view'] = true;
    }
    
    if (allPermissions.has('MANAGE_FORM_SUBMISSIONS') || allPermissions.has('MANAGE_SUBMISSIONS')) {
      frontendPermissions['form_submissions:export'] = true;
    }

    // 5. Test dei permessi frontend
    console.log('\n🧪 === TEST PERMESSI FRONTEND ===');
    
    const testPermissions = [
      'PUBLIC_CMS:READ',
      'PUBLIC_CMS:read', 
      'PUBLIC_CMS:UPDATE',
      'form_templates:read',
      'form_templates:view',
      'form_templates:create',
      'form_submissions:read',
      'form_submissions:view',
      'form_submissions:export'
    ];
    
    testPermissions.forEach(permission => {
      const hasPermission = frontendPermissions[permission] === true;
      console.log(`${hasPermission ? '✅' : '❌'} ${permission}`);
    });

    // 6. Verifica tutti i permessi disponibili nel database
    console.log('\n📋 === TUTTI I PERMESSI DISPONIBILI NEL DATABASE ===');
    const allDbPermissions = await prisma.personPermission.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log(`Totale permessi nel database: ${allDbPermissions.length}`);
    
    const cmsFormPermissions = allDbPermissions.filter(p => 
      p.name.includes('CMS') || 
      p.name.includes('FORM') || 
      p.name.includes('SUBMISSION') ||
      p.name.includes('PUBLIC_CONTENT')
    );
    
    console.log('\n🎯 Permessi CMS/Form disponibili:');
    cmsFormPermissions.forEach(p => {
      const hasIt = allPermissions.has(p.name);
      console.log(`${hasIt ? '✅' : '❌'} ${p.name}`);
    });

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCurrentPermissions();