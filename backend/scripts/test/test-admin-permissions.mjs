#!/usr/bin/env node

/**
 * Script per testare i permessi dell'utente admin
 * Verifica se l'admin ha i permessi necessari per accedere alle pagine CMS e Form
 */

import { PrismaClient } from './backend/node_modules/.prisma/client/index.js';

const prisma = new PrismaClient();

async function testAdminPermissions() {
  console.log('🔍 Testing Admin Permissions...\n');
  console.log('📍 Script started successfully');
  console.log('🔗 Connecting to database...');

  try {
    // 1. Trova l'utente admin
    const adminUser = await prisma.person.findFirst({
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

    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log(`✅ Found admin user: ${adminUser.email}`);
    console.log(`📧 User ID: ${adminUser.id}`);
    console.log(`👤 Name: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log(`🏢 Company: ${adminUser.companyId || 'None'}\n`);

    // 2. Analizza i ruoli
    console.log('🎭 User Roles:');
    adminUser.personRoles.forEach((role, index) => {
      console.log(`  ${index + 1}. ${role.roleType} (ID: ${role.id})`);
      console.log(`     Active: ${role.isActive}`);
      console.log(`     Permissions: ${role.permissions.length}`);
    });
    console.log('');

    // 3. Analizza i permessi
    const allPermissions = [];
    adminUser.personRoles.forEach(role => {
      role.permissions.forEach(perm => {
        allPermissions.push(perm.permission);
      });
    });

    console.log(`🔐 Total Permissions: ${allPermissions.length}`);
    console.log('📋 Permission List:');
    allPermissions.sort().forEach((perm, index) => {
      console.log(`  ${index + 1}. ${perm}`);
    });
    console.log('');

    // 4. Verifica permessi specifici richiesti dalle pagine
    const requiredPermissions = {
      'PUBLIC_CMS Page': [
        'VIEW_PUBLIC_CMS',
        'EDIT_PUBLIC_CMS', 
        'MANAGE_PUBLIC_CMS',
        'VIEW_CMS',
        'EDIT_CMS',
        'MANAGE_PUBLIC_CONTENT',
        'READ_PUBLIC_CONTENT'
      ],
      'Form Templates Page': [
        'VIEW_FORM_TEMPLATES',
        'EDIT_FORM_TEMPLATES',
        'CREATE_FORM_TEMPLATES',
        'DELETE_FORM_TEMPLATES',
        'MANAGE_FORM_TEMPLATES',
        'VIEW_TEMPLATES',
        'EDIT_TEMPLATES',
        'CREATE_TEMPLATES',
        'DELETE_TEMPLATES',
        'MANAGE_TEMPLATES'
      ],
      'Form Submissions Page': [
        'VIEW_FORM_SUBMISSIONS',
        'EDIT_FORM_SUBMISSIONS',
        'CREATE_FORM_SUBMISSIONS',
        'DELETE_FORM_SUBMISSIONS',
        'MANAGE_FORM_SUBMISSIONS',
        'VIEW_SUBMISSIONS',
        'EDIT_SUBMISSIONS',
        'CREATE_SUBMISSIONS',
        'DELETE_SUBMISSIONS',
        'MANAGE_SUBMISSIONS',
        'EXPORT_SUBMISSIONS',
        'EXPORT_FORM_SUBMISSIONS'
      ]
    };

    console.log('🎯 Required Permissions Check:');
    for (const [pageName, permissions] of Object.entries(requiredPermissions)) {
      console.log(`\n📄 ${pageName}:`);
      let hasAnyPermission = false;
      
      permissions.forEach(perm => {
        const hasPermission = allPermissions.includes(perm);
        console.log(`  ${hasPermission ? '✅' : '❌'} ${perm}`);
        if (hasPermission) hasAnyPermission = true;
      });
      
      console.log(`  📊 Result: ${hasAnyPermission ? '✅ CAN ACCESS' : '❌ CANNOT ACCESS'}`);
    }

    // 5. Verifica permessi generali admin
    console.log('\n🔧 General Admin Permissions:');
    const adminPermissions = [
      'ROLE_MANAGEMENT',
      'VIEW_ROLES',
      'CREATE_ROLES',
      'EDIT_ROLES',
      'DELETE_ROLES',
      'ASSIGN_ROLES',
      'REVOKE_ROLES'
    ];

    adminPermissions.forEach(perm => {
      const hasPermission = allPermissions.includes(perm);
      console.log(`  ${hasPermission ? '✅' : '❌'} ${perm}`);
    });

    // 6. Suggerimenti per risolvere il problema
    console.log('\n💡 Suggestions:');
    
    const missingCmsPermissions = requiredPermissions['PUBLIC_CMS Page'].filter(p => !allPermissions.includes(p));
    const missingFormTemplatesPermissions = requiredPermissions['Form Templates Page'].filter(p => !allPermissions.includes(p));
    const missingFormSubmissionsPermissions = requiredPermissions['Form Submissions Page'].filter(p => !allPermissions.includes(p));

    if (missingCmsPermissions.length > 0) {
      console.log(`  🔧 Add CMS permissions: ${missingCmsPermissions.join(', ')}`);
    }
    
    if (missingFormTemplatesPermissions.length > 0) {
      console.log(`  🔧 Add Form Templates permissions: ${missingFormTemplatesPermissions.join(', ')}`);
    }
    
    if (missingFormSubmissionsPermissions.length > 0) {
      console.log(`  🔧 Add Form Submissions permissions: ${missingFormSubmissionsPermissions.join(', ')}`);
    }

    // 7. Test simulazione hasPermission
    console.log('\n🧪 Simulating hasPermission calls:');
    
    const testCases = [
      { resource: 'PUBLIC_CMS', action: 'READ' },
      { resource: 'PUBLIC_CMS', action: 'UPDATE' },
      { resource: 'form_templates', action: 'read' },
      { resource: 'form_templates', action: 'update' },
      { resource: 'form_submissions', action: 'read' },
      { resource: 'form_submissions', action: 'update' }
    ];

    testCases.forEach(({ resource, action }) => {
      const permissionKey = `${resource}:${action}`;
      
      // Simula la logica di hasBackendPermission
      let hasPermission = false;
      
      // Controllo diretto
      if (allPermissions.includes(permissionKey)) {
        hasPermission = true;
      }
      
      // Controllo mappature specifiche
      if (resource === 'PUBLIC_CMS' && action === 'READ') {
        hasPermission = allPermissions.some(p => 
          ['VIEW_CMS', 'MANAGE_PUBLIC_CONTENT', 'READ_PUBLIC_CONTENT', 'VIEW_PUBLIC_CMS'].includes(p)
        );
      }
      
      if (resource === 'PUBLIC_CMS' && action === 'UPDATE') {
        hasPermission = allPermissions.some(p => 
          ['EDIT_CMS', 'MANAGE_PUBLIC_CONTENT', 'EDIT_PUBLIC_CMS'].includes(p)
        );
      }
      
      if (resource === 'form_templates' && action === 'read') {
        hasPermission = allPermissions.some(p => 
          ['VIEW_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES', 'VIEW_TEMPLATES', 'MANAGE_TEMPLATES'].includes(p)
        );
      }
      
      if (resource === 'form_templates' && action === 'update') {
        hasPermission = allPermissions.some(p => 
          ['EDIT_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES', 'EDIT_TEMPLATES', 'MANAGE_TEMPLATES'].includes(p)
        );
      }
      
      if (resource === 'form_submissions' && action === 'read') {
        hasPermission = allPermissions.some(p => 
          ['VIEW_SUBMISSIONS', 'VIEW_FORM_SUBMISSIONS', 'MANAGE_SUBMISSIONS', 'MANAGE_FORM_SUBMISSIONS'].includes(p)
        );
      }
      
      if (resource === 'form_submissions' && action === 'update') {
        hasPermission = allPermissions.some(p => 
          ['EDIT_FORM_SUBMISSIONS', 'MANAGE_SUBMISSIONS', 'MANAGE_FORM_SUBMISSIONS', 'EDIT_SUBMISSIONS'].includes(p)
        );
      }
      
      console.log(`  ${hasPermission ? '✅' : '❌'} hasPermission('${resource}', '${action}')`);
    });

  } catch (error) {
    console.error('❌ Error testing permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui il test
testAdminPermissions();