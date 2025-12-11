/**
 * Script per assegnare tutti i permessi necessari al ruolo ADMIN
 * Conforme a GDPR e regole del progetto
 * 
 * Esecuzione: node backend/scripts/seed-admin-permissions.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tutti i permessi che un ruolo ADMIN deve avere
const ADMIN_PERMISSIONS = [
    // Companies
    'VIEW_COMPANIES',
    'CREATE_COMPANIES',
    'EDIT_COMPANIES',
    'DELETE_COMPANIES',

    // Employees
    'VIEW_EMPLOYEES',
    'CREATE_EMPLOYEES',
    'EDIT_EMPLOYEES',
    'DELETE_EMPLOYEES',

    // Trainers
    'VIEW_TRAINERS',
    'CREATE_TRAINERS',
    'EDIT_TRAINERS',
    'DELETE_TRAINERS',

    // Users
    'VIEW_USERS',
    'CREATE_USERS',
    'EDIT_USERS',
    'DELETE_USERS',
    'MANAGE_USERS',
    'USER_MANAGEMENT',

    // Courses
    'VIEW_COURSES',
    'CREATE_COURSES',
    'EDIT_COURSES',
    'DELETE_COURSES',
    'MANAGE_ENROLLMENTS',

    // Documents
    'VIEW_DOCUMENTS',
    'CREATE_DOCUMENTS',
    'EDIT_DOCUMENTS',
    'DELETE_DOCUMENTS',
    'DOWNLOAD_DOCUMENTS',

    // Admin & System
    'ADMIN_PANEL',
    'SYSTEM_SETTINGS',

    // Roles
    'VIEW_ROLES',
    'CREATE_ROLES',
    'EDIT_ROLES',
    'DELETE_ROLES',
    'ROLE_CREATE',
    'ROLE_EDIT',
    'ROLE_DELETE',
    'ROLE_MANAGEMENT',
    'ASSIGN_ROLES',
    'REVOKE_ROLES',

    // Tenants
    'VIEW_TENANTS',
    'CREATE_TENANTS',
    'EDIT_TENANTS',
    'DELETE_TENANTS',
    'TENANT_MANAGEMENT',

    // Administration
    'VIEW_ADMINISTRATION',
    'CREATE_ADMINISTRATION',
    'EDIT_ADMINISTRATION',
    'DELETE_ADMINISTRATION',

    // GDPR
    'VIEW_GDPR',
    'CREATE_GDPR',
    'EDIT_GDPR',
    'DELETE_GDPR',
    'VIEW_GDPR_DATA',
    'EXPORT_GDPR_DATA',
    'DELETE_GDPR_DATA',
    'MANAGE_CONSENTS',

    // Reports
    'VIEW_REPORTS',
    'CREATE_REPORTS',
    'EDIT_REPORTS',
    'DELETE_REPORTS',
    'EXPORT_REPORTS',

    // Hierarchy
    'VIEW_HIERARCHY',
    'CREATE_HIERARCHY',
    'EDIT_HIERARCHY',
    'DELETE_HIERARCHY',
    'MANAGE_HIERARCHY',
    'HIERARCHY_MANAGEMENT',

    // Persons
    'VIEW_PERSONS',
    'CREATE_PERSONS',
    'EDIT_PERSONS',
    'DELETE_PERSONS',

    // Schedules
    'VIEW_SCHEDULES',
    'CREATE_SCHEDULES',
    'EDIT_SCHEDULES',
    'DELETE_SCHEDULES',

    // Quotes
    'VIEW_QUOTES',
    'CREATE_QUOTES',
    'EDIT_QUOTES',
    'DELETE_QUOTES',

    // Invoices
    'VIEW_INVOICES',
    'CREATE_INVOICES',
    'EDIT_INVOICES',
    'DELETE_INVOICES',

    // CMS (general)
    'VIEW_CMS',
    'CREATE_CMS',
    'EDIT_CMS',
    'DELETE_CMS',
    'MANAGE_PUBLIC_CONTENT',
    'READ_PUBLIC_CONTENT',

    // CMS Pages
    'VIEW_CMS_PAGES',
    'CREATE_CMS_PAGES',
    'EDIT_CMS_PAGES',
    'DELETE_CMS_PAGES',
    'MANAGE_CMS_PAGES',
    'PUBLISH_CMS_PAGES',

    // CMS Navigation
    'VIEW_CMS_NAVIGATION',
    'EDIT_CMS_NAVIGATION',
    'MANAGE_CMS_NAVIGATION',

    // CMS Versions
    'VIEW_CMS_VERSIONS',
    'RESTORE_CMS_VERSIONS',

    // CMS Media
    'VIEW_CMS_MEDIA',
    'CREATE_CMS_MEDIA',
    'EDIT_CMS_MEDIA',
    'DELETE_CMS_MEDIA',
    'UPLOAD_CMS_MEDIA',
    'MANAGE_CMS_MEDIA',

    // Public CMS
    'VIEW_PUBLIC_CMS',
    'CREATE_PUBLIC_CMS',
    'EDIT_PUBLIC_CMS',
    'DELETE_PUBLIC_CMS',
    'MANAGE_PUBLIC_CMS',

    // Submissions
    'VIEW_SUBMISSIONS',
    'CREATE_SUBMISSIONS',
    'EDIT_SUBMISSIONS',
    'DELETE_SUBMISSIONS',
    'MANAGE_SUBMISSIONS',
    'EXPORT_SUBMISSIONS',

    // Form Submissions
    'VIEW_FORM_SUBMISSIONS',
    'CREATE_FORM_SUBMISSIONS',
    'EDIT_FORM_SUBMISSIONS',
    'DELETE_FORM_SUBMISSIONS',
    'MANAGE_FORM_SUBMISSIONS',
    'EXPORT_FORM_SUBMISSIONS',

    // Form Templates
    'VIEW_FORM_TEMPLATES',
    'CREATE_FORM_TEMPLATES',
    'EDIT_FORM_TEMPLATES',
    'DELETE_FORM_TEMPLATES',
    'MANAGE_FORM_TEMPLATES',

    // Templates
    'VIEW_TEMPLATES',
    'CREATE_TEMPLATES',
    'EDIT_TEMPLATES',
    'DELETE_TEMPLATES',
    'MANAGE_TEMPLATES',

    // SEO
    'VIEW_SEO',
    'CREATE_SEO',
    'EDIT_SEO',
    'DELETE_SEO',
    'MANAGE_SEO',
    'GENERATE_SITEMAP',

    // Notifications
    'VIEW_NOTIFICATIONS',
    'CREATE_NOTIFICATIONS',
    'EDIT_NOTIFICATIONS',
    'DELETE_NOTIFICATIONS',
    'MANAGE_NOTIFICATIONS',
    'SEND_NOTIFICATIONS',

    // Audit Logs
    'VIEW_AUDIT_LOGS',
    'CREATE_AUDIT_LOGS',
    'EDIT_AUDIT_LOGS',
    'DELETE_AUDIT_LOGS',
    'MANAGE_AUDIT_LOGS',
    'EXPORT_AUDIT_LOGS',

    // API Keys
    'VIEW_API_KEYS',
    'CREATE_API_KEYS',
    'EDIT_API_KEYS',
    'DELETE_API_KEYS',
    'MANAGE_API_KEYS',
    'REGENERATE_API_KEYS',

    // Codici Sconto
    'VIEW_CODICI_SCONTO',
    'CREATE_CODICI_SCONTO',
    'EDIT_CODICI_SCONTO',
    'DELETE_CODICI_SCONTO',
    'MANAGE_CODICI_SCONTO',

    // Preventivi
    'VIEW_PREVENTIVI',
    'CREATE_PREVENTIVI',
    'EDIT_PREVENTIVI',
    'DELETE_PREVENTIVI',
    'MANAGE_PREVENTIVI',
    'GENERATE_PREVENTIVI_PDF',
    'SEND_PREVENTIVI'
];

async function seedAdminPermissions() {
    console.log('🔐 Inizio seed permessi ADMIN...\n');

    try {
        // Trova tutti i PersonRole con roleType ADMIN
        const adminRoles = await prisma.personRole.findMany({
            where: {
                roleType: 'ADMIN',
                isActive: true
            },
            include: {
                person: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                },
                permissions: true
            }
        });

        console.log(`📋 Trovati ${adminRoles.length} PersonRole con ruolo ADMIN\n`);

        for (const adminRole of adminRoles) {
            console.log(`👤 Elaborazione: ${adminRole.person?.email || 'Unknown'} (PersonRole ID: ${adminRole.id})`);

            // Trova quali permessi mancano
            const existingPermissions = adminRole.permissions.map(p => p.permission);
            const missingPermissions = ADMIN_PERMISSIONS.filter(p => !existingPermissions.includes(p));

            console.log(`   ✓ Permessi esistenti: ${existingPermissions.length}`);
            console.log(`   ⚠ Permessi mancanti: ${missingPermissions.length}`);

            if (missingPermissions.length === 0) {
                console.log(`   ✅ Tutti i permessi sono già assegnati\n`);
                continue;
            }

            // Crea i permessi mancanti
            const permissionsToCreate = missingPermissions.map(permission => ({
                personRoleId: adminRole.id,
                permission: permission,
                isGranted: true,
                grantedAt: new Date(),
                grantedBy: adminRole.person?.id || null
            }));

            await prisma.rolePermission.createMany({
                data: permissionsToCreate,
                skipDuplicates: true
            });

            console.log(`   ✅ Creati ${missingPermissions.length} nuovi permessi\n`);
        }

        // Verifica finale
        console.log('\n📊 Verifica finale...');
        for (const adminRole of adminRoles) {
            const finalCount = await prisma.rolePermission.count({
                where: {
                    personRoleId: adminRole.id,
                    isGranted: true
                }
            });
            console.log(`   ${adminRole.person?.email}: ${finalCount} permessi totali`);
        }

        console.log('\n✅ Seed permessi ADMIN completato con successo!');

    } catch (error) {
        console.error('❌ Errore durante il seed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Esegui
seedAdminPermissions()
    .catch(console.error);
