import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

const ADMIN_PERMISSIONS = [
    'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
    'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
    'VIEW_PERSONS', 'CREATE_PERSONS', 'EDIT_PERSONS', 'DELETE_PERSONS',
    'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
    'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
    'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES', 'DELETE_SCHEDULES',
    'VIEW_CMS', 'EDIT_CMS', 'VIEW_CMS_PAGES', 'CREATE_CMS_PAGES', 'EDIT_CMS_PAGES', 'DELETE_CMS_PAGES',
    'ADMIN_PANEL', 'SYSTEM_SETTINGS', 'USER_MANAGEMENT', 'ROLE_MANAGEMENT',
    'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
    'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS',
    'MANAGE_PUBLIC_CONTENT', 'READ_PUBLIC_CONTENT'
];

async function createAdmin() {
    const t = await prisma.tenant.findFirst();
    if (!t) throw new Error('No tenant found');

    const pw = await bcrypt.hash('Admin123!', 12);

    // Upsert person
    const a = await prisma.person.upsert({
        where: { id: 'admin-test-id' },
        update: { password: pw },
        create: {
            id: 'admin-test-id',
            firstName: 'Admin',
            lastName: 'Test',
            email: 'admin@example.com',
            password: pw,
            status: 'ACTIVE',
            tenantId: t.id
        }
    });

    // Upsert personRole
    const role = await prisma.personRole.upsert({
        where: { id: 'admin-role-id' },
        update: {},
        create: {
            id: 'admin-role-id',
            personId: a.id,
            roleType: 'ADMIN',
            isActive: true,
            isPrimary: true,
            tenantId: t.id
        }
    });

    // Add permissions
    for (const perm of ADMIN_PERMISSIONS) {
        await prisma.rolePermission.upsert({
            where: {
                personRoleId_permission: {
                    personRoleId: role.id,
                    permission: perm
                }
            },
            update: { isGranted: true },
            create: {
                personRoleId: role.id,
                permission: perm,
                isGranted: true
            }
        });
    }

    console.log('Created admin with', ADMIN_PERMISSIONS.length, 'permissions:', a.email);
}

createAdmin().catch(e => console.error(e.message)).finally(() => prisma.$disconnect());
