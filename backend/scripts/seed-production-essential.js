/**
 * Essential Production Seed Script
 * Seed minimale per inizializzare permessi e ruoli su produzione
 * 
 * NOTA: Il sistema usa PersonPermission ENUM (non tabella Permission)
 * RolePermission contiene: personRoleId + permission (enum)
 * 
 * Esecuzione: node backend/scripts/seed-production-essential.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Tutti i permessi dall'enum PersonPermission (da schema.prisma)
const ALL_PERSON_PERMISSIONS = [
    'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
    'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
    'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
    'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
    'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
    'MANAGE_ENROLLMENTS',
    'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS', 'DOWNLOAD_DOCUMENTS', 'VIEW_DOCUMENTS',
    'ADMIN_PANEL', 'SYSTEM_SETTINGS', 'USER_MANAGEMENT', 'ROLE_MANAGEMENT', 'TENANT_MANAGEMENT',
    'VIEW_GDPR_DATA', 'EXPORT_GDPR_DATA', 'DELETE_GDPR_DATA', 'MANAGE_CONSENTS',
    'VIEW_REPORTS', 'CREATE_REPORTS', 'EXPORT_REPORTS', 'EDIT_REPORTS', 'DELETE_REPORTS',
    'ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE',
    'VIEW_ROLES', 'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES',
    'MANAGE_USERS', 'ASSIGN_ROLES', 'REVOKE_ROLES',
    'VIEW_TENANTS', 'CREATE_TENANTS', 'EDIT_TENANTS', 'DELETE_TENANTS',
    'VIEW_ADMINISTRATION', 'CREATE_ADMINISTRATION', 'EDIT_ADMINISTRATION', 'DELETE_ADMINISTRATION',
    'VIEW_GDPR', 'CREATE_GDPR', 'EDIT_GDPR', 'DELETE_GDPR',
    'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'EDIT_HIERARCHY', 'DELETE_HIERARCHY', 'MANAGE_HIERARCHY', 'HIERARCHY_MANAGEMENT',
    'VIEW_PERSONS', 'CREATE_PERSONS', 'EDIT_PERSONS', 'DELETE_PERSONS',
    'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES', 'DELETE_SCHEDULES',
    'VIEW_QUOTES', 'CREATE_QUOTES', 'EDIT_QUOTES', 'DELETE_QUOTES',
    'VIEW_INVOICES', 'CREATE_INVOICES', 'EDIT_INVOICES', 'DELETE_INVOICES',
    'VIEW_CMS', 'CREATE_CMS', 'EDIT_CMS', 'DELETE_CMS', 'MANAGE_PUBLIC_CONTENT', 'READ_PUBLIC_CONTENT',
    'VIEW_SUBMISSIONS', 'MANAGE_SUBMISSIONS', 'EXPORT_SUBMISSIONS', 'CREATE_SUBMISSIONS', 'EDIT_SUBMISSIONS', 'DELETE_SUBMISSIONS',
    'VIEW_FORM_TEMPLATES', 'CREATE_FORM_TEMPLATES', 'EDIT_FORM_TEMPLATES', 'DELETE_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES',
    'VIEW_PUBLIC_CMS', 'CREATE_PUBLIC_CMS', 'EDIT_PUBLIC_CMS', 'DELETE_PUBLIC_CMS', 'MANAGE_PUBLIC_CMS',
    'VIEW_FORM_SUBMISSIONS', 'CREATE_FORM_SUBMISSIONS', 'EDIT_FORM_SUBMISSIONS', 'DELETE_FORM_SUBMISSIONS', 'MANAGE_FORM_SUBMISSIONS', 'EXPORT_FORM_SUBMISSIONS',
    'VIEW_TEMPLATES', 'CREATE_TEMPLATES', 'EDIT_TEMPLATES', 'DELETE_TEMPLATES', 'MANAGE_TEMPLATES',
    'VIEW_NOTIFICATIONS', 'CREATE_NOTIFICATIONS', 'EDIT_NOTIFICATIONS', 'DELETE_NOTIFICATIONS', 'MANAGE_NOTIFICATIONS', 'SEND_NOTIFICATIONS',
    'VIEW_AUDIT_LOGS', 'CREATE_AUDIT_LOGS', 'EDIT_AUDIT_LOGS', 'DELETE_AUDIT_LOGS', 'MANAGE_AUDIT_LOGS', 'EXPORT_AUDIT_LOGS',
    'VIEW_API_KEYS', 'CREATE_API_KEYS', 'EDIT_API_KEYS', 'DELETE_API_KEYS', 'MANAGE_API_KEYS', 'REGENERATE_API_KEYS',
    'VIEW_CODICI_SCONTO', 'CREATE_CODICI_SCONTO', 'EDIT_CODICI_SCONTO', 'DELETE_CODICI_SCONTO', 'MANAGE_CODICI_SCONTO',
    'VIEW_PREVENTIVI', 'CREATE_PREVENTIVI', 'EDIT_PREVENTIVI', 'DELETE_PREVENTIVI', 'MANAGE_PREVENTIVI', 'GENERATE_PREVENTIVI_PDF', 'SEND_PREVENTIVI',
    'VIEW_CMS_MEDIA', 'CREATE_CMS_MEDIA', 'EDIT_CMS_MEDIA', 'DELETE_CMS_MEDIA', 'MANAGE_CMS_MEDIA', 'UPLOAD_CMS_MEDIA',
    'VIEW_CMS_PAGES', 'CREATE_CMS_PAGES', 'EDIT_CMS_PAGES', 'DELETE_CMS_PAGES', 'PUBLISH_CMS_PAGES', 'MANAGE_CMS_PAGES',
    'VIEW_CMS_NAVIGATION', 'EDIT_CMS_NAVIGATION', 'MANAGE_CMS_NAVIGATION',
    'VIEW_CMS_VERSIONS', 'RESTORE_CMS_VERSIONS',
    'VIEW_SEO', 'CREATE_SEO', 'EDIT_SEO', 'DELETE_SEO', 'MANAGE_SEO', 'GENERATE_SITEMAP'
];

async function main() {
    console.log('🚀 Starting Essential Production Seed...\n');
    console.log(`📋 Using ${ALL_PERSON_PERMISSIONS.length} permissions from PersonPermission enum\n`);

    try {
        // Step 1: Get or create default tenant
        console.log('🏢 Step 1: Checking Tenants...');
        let defaultTenant = await prisma.tenant.findFirst({
            where: {
                OR: [
                    { slug: 'element-sicurezza' },
                    { slug: 'default' }
                ]
            }
        });

        if (!defaultTenant) {
            console.log('   Creating default tenant...');
            defaultTenant = await prisma.tenant.create({
                data: {
                    name: 'Element Sicurezza',
                    slug: 'element-sicurezza',
                    isActive: true,
                    settings: {}
                }
            });
        }
        console.log(`   ✅ Tenant: ${defaultTenant.name} (${defaultTenant.id})\n`);

        // Step 2: Check/Create Admin User
        console.log('👤 Step 2: Checking Admin User...');
        // P48: Cerca per email nel PersonTenantProfile
        const existingProfile = await prisma.personTenantProfile.findFirst({
            where: { email: 'admin@example.com', tenantId: defaultTenant.id, deletedAt: null },
            include: { person: true }
        });
        let adminUser = existingProfile?.person;

        if (!adminUser) {
            console.log('   Creating admin user...');
            const hashedPassword = await bcrypt.hash('Admin123!', 12);
            adminUser = await prisma.person.create({
                data: {
                    firstName: 'Admin',
                    lastName: 'User',
                    username: 'admin',
                    password: hashedPassword,
                    tenantProfiles: {
                        create: {
                            tenantId: defaultTenant.id,
                            email: 'admin@example.com',
                            status: 'ACTIVE',
                            isPrimary: true
                        }
                    }
                }
            });
        }
        console.log(`   ✅ Admin: admin@example.com (${adminUser.id})\n`);

        // Step 3: Create/Update Admin PersonRole
        console.log('🔑 Step 3: Setting up Admin Role...');
        let adminRole = await prisma.personRole.findFirst({
            where: {
                personId: adminUser.id,
                roleType: 'ADMIN'
            }
        });

        if (!adminRole) {
            console.log('   Creating admin PersonRole...');
            adminRole = await prisma.personRole.create({
                data: {
                    personId: adminUser.id,
                    roleType: 'ADMIN',
                    roleName: 'System Administrator',
                    isPrimary: true,
                    isActive: true,
                    tenantId: defaultTenant.id
                }
            });
        }
        console.log(`   ✅ Admin Role: ${adminRole.roleType} (${adminRole.id})\n`);

        // Step 4: Assign ALL permissions to Admin Role using PersonPermission enum
        console.log('🔐 Step 4: Assigning Permissions to Admin...');

        // Check existing role_permissions
        const existingRolePerms = await prisma.rolePermission.findMany({
            where: { personRoleId: adminRole.id }
        });
        const existingPerms = new Set(existingRolePerms.map(rp => rp.permission));
        console.log(`   📊 Existing permissions: ${existingRolePerms.length}`);

        // Add missing permissions
        const permissionsToAdd = ALL_PERSON_PERMISSIONS.filter(p => !existingPerms.has(p));
        console.log(`   📊 Permissions to add: ${permissionsToAdd.length}`);

        if (permissionsToAdd.length > 0) {
            // Use createMany with skipDuplicates for efficiency
            await prisma.rolePermission.createMany({
                data: permissionsToAdd.map(permission => ({
                    personRoleId: adminRole.id,
                    permission: permission,
                    isGranted: true
                })),
                skipDuplicates: true
            });
            console.log(`   ✅ Added ${permissionsToAdd.length} permissions to admin role`);
        } else {
            console.log(`   ✅ Admin already has all permissions`);
        }

        // Final verification
        const finalPermCount = await prisma.rolePermission.count({
            where: { personRoleId: adminRole.id }
        });
        console.log(`   📊 Total permissions for admin: ${finalPermCount}\n`);

        console.log('✅ Essential Production Seed completed successfully!');
        console.log('\n📝 Admin Login Credentials:');
        console.log('   Email: admin@example.com');
        console.log('   Password: Admin123!');

    } catch (error) {
        console.error('❌ Seed failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main();
