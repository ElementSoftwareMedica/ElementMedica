const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // Trova il PersonRole di matteo.michielon1
        const personRole = await prisma.personRole.findFirst({
            where: { person: { username: 'matteo.michielon1' } }
        });

        if (!personRole) {
            console.log('PersonRole not found');
            return;
        }

        console.log('PersonRole ID:', personRole.id);

        // Aggiungi i permessi settings:read e settings:write
        const permissionsToAdd = ['settings:read', 'settings:write'];

        for (const perm of permissionsToAdd) {
            const existing = await prisma.rolePermission.findUnique({
                where: { personRoleId_permission: { personRoleId: personRole.id, permission: perm } }
            });

            if (existing) {
                console.log('Permission', perm, 'already exists');
            } else {
                await prisma.rolePermission.create({
                    data: {
                        personRoleId: personRole.id,
                        permission: perm,
                        isGranted: true
                    }
                });
                console.log('Created permission:', perm);
            }
        }

        console.log('Done - Logout and login again to see the change');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
