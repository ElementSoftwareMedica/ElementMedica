/**
 * Script per aggiungere i permessi mancanti per CMS, Form Templates e Submissions
 * Questo script aggiunge i permessi necessari per le nuove funzionalità
 */

import dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config();

const prisma = new PrismaClient();

async function addCMSFormPermissions() {
  try {
    console.log('🚀 Adding CMS and Form permissions...');

    // Define all missing permissions
    const permissions = [
      // CMS permissions
      {
        name: 'CMS_VIEW',
        description: 'View CMS content and pages',
        resource: 'cms',
        action: 'read'
      },
      {
        name: 'CMS_EDIT_PAGES',
        description: 'Edit CMS pages',
        resource: 'cms',
        action: 'edit_pages'
      },
      {
        name: 'CMS_EDIT_COURSES',
        description: 'Edit CMS courses',
        resource: 'cms',
        action: 'edit_courses'
      },
      {
        name: 'CMS_MANAGE_MEDIA',
        description: 'Manage CMS media files',
        resource: 'cms',
        action: 'manage_media'
      },
      {
        name: 'CMS_PUBLISH',
        description: 'Publish CMS content',
        resource: 'cms',
        action: 'publish'
      },
      {
        name: 'CMS_SEO',
        description: 'Manage SEO settings',
        resource: 'cms',
        action: 'seo'
      },
      
      // Alternative CMS permissions for compatibility
      {
        name: 'VIEW_CMS',
        description: 'View CMS content',
        resource: 'cms',
        action: 'read'
      },
      {
        name: 'CREATE_CMS',
        description: 'Create CMS content',
        resource: 'cms',
        action: 'create'
      },
      {
        name: 'EDIT_CMS',
        description: 'Edit CMS content',
        resource: 'cms',
        action: 'edit'
      },
      {
        name: 'DELETE_CMS',
        description: 'Delete CMS content',
        resource: 'cms',
        action: 'delete'
      },
      {
        name: 'MANAGE_PUBLIC_CONTENT',
        description: 'Manage public content',
        resource: 'cms',
        action: 'manage'
      },
      
      // Public CMS permissions
      {
        name: 'VIEW_PUBLIC_CMS',
        description: 'View public CMS content',
        resource: 'public_cms',
        action: 'read'
      },
      {
        name: 'CREATE_PUBLIC_CMS',
        description: 'Create public CMS content',
        resource: 'public_cms',
        action: 'create'
      },
      {
        name: 'EDIT_PUBLIC_CMS',
        description: 'Edit public CMS content',
        resource: 'public_cms',
        action: 'edit'
      },
      {
        name: 'DELETE_PUBLIC_CMS',
        description: 'Delete public CMS content',
        resource: 'public_cms',
        action: 'delete'
      },
      {
        name: 'MANAGE_PUBLIC_CMS',
        description: 'Manage public CMS content',
        resource: 'public_cms',
        action: 'manage'
      },
      
      // Form Templates permissions
      {
        name: 'VIEW_FORM_TEMPLATES',
        description: 'View form templates',
        resource: 'form_templates',
        action: 'read'
      },
      {
        name: 'CREATE_FORM_TEMPLATES',
        description: 'Create form templates',
        resource: 'form_templates',
        action: 'create'
      },
      {
        name: 'EDIT_FORM_TEMPLATES',
        description: 'Edit form templates',
        resource: 'form_templates',
        action: 'edit'
      },
      {
        name: 'DELETE_FORM_TEMPLATES',
        description: 'Delete form templates',
        resource: 'form_templates',
        action: 'delete'
      },
      {
        name: 'MANAGE_FORM_TEMPLATES',
        description: 'Manage form templates',
        resource: 'form_templates',
        action: 'manage'
      },
      
      // Form Submissions permissions
      {
        name: 'VIEW_SUBMISSIONS',
        description: 'View form submissions',
        resource: 'submissions',
        action: 'read'
      },
      {
        name: 'CREATE_SUBMISSIONS',
        description: 'Create form submissions',
        resource: 'submissions',
        action: 'create'
      },
      {
        name: 'EDIT_SUBMISSIONS',
        description: 'Edit form submissions',
        resource: 'submissions',
        action: 'edit'
      },
      {
        name: 'DELETE_SUBMISSIONS',
        description: 'Delete form submissions',
        resource: 'submissions',
        action: 'delete'
      },
      {
        name: 'MANAGE_SUBMISSIONS',
        description: 'Manage form submissions',
        resource: 'submissions',
        action: 'manage'
      },
      {
        name: 'EXPORT_SUBMISSIONS',
        description: 'Export form submissions',
        resource: 'submissions',
        action: 'export'
      },
      
      // Alternative Form Submissions permissions
      {
        name: 'VIEW_FORM_SUBMISSIONS',
        description: 'View form submissions',
        resource: 'form_submissions',
        action: 'read'
      },
      {
        name: 'CREATE_FORM_SUBMISSIONS',
        description: 'Create form submissions',
        resource: 'form_submissions',
        action: 'create'
      },
      {
        name: 'EDIT_FORM_SUBMISSIONS',
        description: 'Edit form submissions',
        resource: 'form_submissions',
        action: 'edit'
      },
      {
        name: 'DELETE_FORM_SUBMISSIONS',
        description: 'Delete form submissions',
        resource: 'form_submissions',
        action: 'delete'
      },
      {
        name: 'MANAGE_FORM_SUBMISSIONS',
        description: 'Manage form submissions',
        resource: 'form_submissions',
        action: 'manage'
      },
      {
        name: 'EXPORT_FORM_SUBMISSIONS',
        description: 'Export form submissions',
        resource: 'form_submissions',
        action: 'export'
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

    console.log('🎉 All CMS and Form permissions have been added successfully!');
    
    // Show summary
    const totalPermissions = await prisma.permission.count();
    console.log(`📊 Total permissions in database: ${totalPermissions}`);
    
  } catch (error) {
    console.error('❌ Error adding CMS and Form permissions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addCMSFormPermissions()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });