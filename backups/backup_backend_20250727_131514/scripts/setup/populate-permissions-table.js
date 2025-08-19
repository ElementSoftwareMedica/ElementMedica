/**
 * Script per popolare la tabella permissions con tutti i permessi necessari
 * Questo script crea i permessi base che vengono poi utilizzati dal sistema di autorizzazione
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config();

const prisma = new PrismaClient();

async function populatePermissions() {
  try {
    console.log('🚀 Populating permissions table...');

    // Define all permissions with categories
    const permissions = [
      // Companies permissions
      {
        name: 'VIEW_COMPANIES',
        description: 'View companies list and details',
        resource: 'companies',
        action: 'read'
      },
      {
        name: 'CREATE_COMPANIES',
        description: 'Create new companies',
        resource: 'companies',
        action: 'create'
      },
      {
        name: 'EDIT_COMPANIES',
        description: 'Edit existing companies',
        resource: 'companies',
        action: 'edit'
      },
      {
        name: 'DELETE_COMPANIES',
        description: 'Delete companies',
        resource: 'companies',
        action: 'delete'
      },
      
      // Employees permissions
      {
        name: 'VIEW_EMPLOYEES',
        description: 'View employees list and details',
        resource: 'employees',
        action: 'read'
      },
      {
        name: 'CREATE_EMPLOYEES',
        description: 'Create new employees',
        resource: 'employees',
        action: 'create'
      },
      {
        name: 'EDIT_EMPLOYEES',
        description: 'Edit existing employees',
        resource: 'employees',
        action: 'edit'
      },
      {
        name: 'DELETE_EMPLOYEES',
        description: 'Delete employees',
        resource: 'employees',
        action: 'delete'
      },
      
      // Users permissions
      {
        name: 'VIEW_USERS',
        description: 'View users list and details',
        resource: 'users',
        action: 'read'
      },
      {
        name: 'CREATE_USERS',
        description: 'Create new users',
        resource: 'users',
        action: 'create'
      },
      {
        name: 'EDIT_USERS',
        description: 'Edit existing users',
        resource: 'users',
        action: 'edit'
      },
      {
        name: 'DELETE_USERS',
        description: 'Delete users',
        resource: 'users',
        action: 'delete'
      },
      
      // Courses permissions
      {
        name: 'VIEW_COURSES',
        description: 'View courses list and details',
        resource: 'courses',
        action: 'read'
      },
      {
        name: 'CREATE_COURSES',
        description: 'Create new courses',
        resource: 'courses',
        action: 'create'
      },
      {
        name: 'EDIT_COURSES',
        description: 'Edit existing courses',
        resource: 'courses',
        action: 'edit'
      },
      {
        name: 'DELETE_COURSES',
        description: 'Delete courses',
        resource: 'courses',
        action: 'delete'
      },
      
      // System permissions
      {
        name: 'ADMIN_PANEL',
        description: 'Access to admin panel',
        resource: 'system',
        action: 'admin'
      },
      {
        name: 'SYSTEM_SETTINGS',
        description: 'Manage system settings',
        resource: 'system',
        action: 'settings'
      },
      {
        name: 'USER_MANAGEMENT',
        description: 'Manage users and their permissions',
        resource: 'system',
        action: 'user_management'
      },
      {
        name: 'ROLE_MANAGEMENT',
        description: 'Manage roles and their permissions',
        resource: 'system',
        action: 'role_management'
      }
    ];

    // Create permissions using upsert to avoid duplicates
    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: {
          description: permission.description,
          resource: permission.resource,
          action: permission.action
        },
        create: {
          name: permission.name,
          description: permission.description,
          resource: permission.resource,
          action: permission.action
        }
      });
      console.log(`✅ Permission created/updated: ${permission.name}`);
    }

    console.log('🎉 All permissions have been populated successfully!');
    
    // Show summary
    const totalPermissions = await prisma.permission.count();
    console.log(`📊 Total permissions in database: ${totalPermissions}`);
    
  } catch (error) {
    console.error('❌ Error populating permissions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populatePermissions()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });