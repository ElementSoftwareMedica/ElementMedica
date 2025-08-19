import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickFixAdmin() {
    try {
        // Find admin
        const admin = await prisma.person.findUnique({
            where: { email: 'admin@example.com' },
            include: { personRoles: { where: { isActive: true } } }
        });

        if (!admin) {
            console.log('Admin not found');
            return;
        }

        console.log(`Admin found: ${admin.email}`);

        // Check for SUPER_ADMIN role
        let superAdminRole = admin.personRoles.find(pr => pr.roleType === 'SUPER_ADMIN');

        if (!superAdminRole) {
            // Create SUPER_ADMIN role
            superAdminRole = await prisma.personRole.create({
                data: {
                    personId: admin.id,
                    roleType: 'SUPER_ADMIN',
                    isActive: true,
                    isPrimary: true,
                    companyId: admin.companyId,
                    tenantId: admin.tenantId
                }
            });
            console.log('Created SUPER_ADMIN role');
        }

        // Add essential permissions
        const permissions = ['VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES', 'ADMIN_PANEL', 'VIEW_COMPANIES'];
        
        for (const permission of permissions) {
            await prisma.rolePermission.upsert({
                where: {
                    personRoleId_permission: {
                        personRoleId: superAdminRole.id,
                        permission: permission
                    }
                },
                update: { isGranted: true },
                create: {
                    personRoleId: superAdminRole.id,
                    permission: permission,
                    isGranted: true
                }
            });
        }

        console.log(`Added ${permissions.length} permissions`);
        console.log('Admin permissions fixed!');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

quickFixAdmin();