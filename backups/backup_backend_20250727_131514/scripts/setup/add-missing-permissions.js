/**
 * Script per aggiungere i permessi mancanti alla tabella permissions
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config();

const prisma = new PrismaClient();

async function addMissingPermissions() {
  try {
    console.log('🚀 Adding missing permissions...');

    // Permessi aggiuntivi che mancano
    const additionalPermissions = [
      // Trainers permissions
      {
        name: 'VIEW_TRAINERS',
        description: 'View trainers list and details',
        resource: 'trainers',
        action: 'read'
      },
      {
        name: 'CREATE_TRAINERS',
        description: 'Create new trainers',
        resource: 'trainers',
        action: 'create'
      },
      {
        name: 'EDIT_TRAINERS',
        description: 'Edit existing trainers',
        resource: 'trainers',
        action: 'edit'
      },
      {
        name: 'DELETE_TRAINERS',
        description: 'Delete trainers',
        resource: 'trainers',
        action: 'delete'
      },
      
      // Course management
      {
        name: 'MANAGE_ENROLLMENTS',
        description: 'Manage course enrollments',
        resource: 'courses',
        action: 'manage_enrollments'
      },
      
      // Documents permissions
      {
        name: 'VIEW_DOCUMENTS',
        description: 'View documents',
        resource: 'documents',
        action: 'read'
      },
      {
        name: 'CREATE_DOCUMENTS',
        description: 'Create new documents',
        resource: 'documents',
        action: 'create'
      },
      {
        name: 'EDIT_DOCUMENTS',
        description: 'Edit existing documents',
        resource: 'documents',
        action: 'edit'
      },
      {
        name: 'DELETE_DOCUMENTS',
        description: 'Delete documents',
        resource: 'documents',
        action: 'delete'
      },
      {
        name: 'DOWNLOAD_DOCUMENTS',
        description: 'Download documents',
        resource: 'documents',
        action: 'download'
      },
      
      // Administration permissions
      {
        name: 'TENANT_MANAGEMENT',
        description: 'Manage tenants',
        resource: 'system',
        action: 'tenant_management'
      },
      
      // GDPR permissions
      {
        name: 'VIEW_GDPR_DATA',
        description: 'View GDPR related data',
        resource: 'gdpr',
        action: 'read'
      },
      {
        name: 'EXPORT_GDPR_DATA',
        description: 'Export GDPR data',
        resource: 'gdpr',
        action: 'export'
      },
      {
        name: 'DELETE_GDPR_DATA',
        description: 'Delete GDPR data (right to be forgotten)',
        resource: 'gdpr',
        action: 'delete'
      },
      {
        name: 'MANAGE_CONSENTS',
        description: 'Manage user consents',
        resource: 'gdpr',
        action: 'manage_consents'
      },
      
      // Reports permissions
      {
        name: 'VIEW_REPORTS',
        description: 'View system reports',
        resource: 'reports',
        action: 'read'
      },
      {
        name: 'CREATE_REPORTS',
        description: 'Create new reports',
        resource: 'reports',
        action: 'create'
      },
      {
        name: 'EXPORT_REPORTS',
        description: 'Export reports',
        resource: 'reports',
        action: 'export'
      }
    ];

    // Aggiungi i permessi usando upsert per evitare duplicati
    for (const permission of additionalPermissions) {
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

    console.log('🎉 All missing permissions have been added successfully!');
    
    // Mostra riepilogo
    const totalPermissions = await prisma.permission.count();
    console.log(`📊 Total permissions in database: ${totalPermissions}`);
    
  } catch (error) {
    console.error('❌ Error adding missing permissions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui lo script
addMissingPermissions()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });