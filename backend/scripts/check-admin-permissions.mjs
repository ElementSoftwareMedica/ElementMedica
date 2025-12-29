/**
 * Script per verificare i permessi dell'utente admin
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAdminPermissions() {
    try {
        const adminPerson = await prisma.person.findFirst({
            where: { email: 'admin@example.com' },
            include: {
                personRoles: {
                    where: { isActive: true },
                    include: {
                        permissions: true
                    }
                }
            }
        });

        console.log('=== Admin Person ===');
        console.log('ID:', adminPerson?.id);
        console.log('Email:', adminPerson?.email);
        console.log('Global Role:', adminPerson?.globalRole);
        console.log('Person Roles Count:', adminPerson?.personRoles?.length || 0);

        if (adminPerson?.personRoles && adminPerson.personRoles.length > 0) {
            console.log('\n=== Roles and Permissions ===');
            adminPerson.personRoles.forEach(role => {
                console.log(`\nRole: ${role.roleType} (ID: ${role.id})`);
                console.log(`  - Is Primary: ${role.isPrimary}`);
                console.log(`  - Permissions Count: ${role.permissions.length}`);
                if (role.permissions.length > 0) {
                    role.permissions.forEach(p => {
                        console.log(`    * ${p.permission}: ${p.isGranted ? 'GRANTED' : 'DENIED'}`);
                    });
                }
            });
        } else {
            console.log('\n⚠️  NO ACTIVE ROLES FOUND FOR ADMIN!');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdminPermissions();
