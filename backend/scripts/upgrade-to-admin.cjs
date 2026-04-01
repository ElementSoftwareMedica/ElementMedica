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

        console.log('Current role type:', personRole.roleType);

        // Aggiorna a ADMIN
        await prisma.personRole.update({
            where: { id: personRole.id },
            data: { roleType: 'ADMIN' }
        });

        console.log('Role type updated to ADMIN');
        console.log('Please logout and login again to see the change');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
