/**
 * Script per aggiungere i permessi CMS Media al ruolo ADMIN
 */
import prisma from '../config/prisma-optimization.js';

const mediaPermissions = [
    "VIEW_CMS_MEDIA",
    "CREATE_CMS_MEDIA",
    "EDIT_CMS_MEDIA",
    "DELETE_CMS_MEDIA",
    "MANAGE_CMS_MEDIA",
    "UPLOAD_CMS_MEDIA"
];

async function main() {
    console.log('Adding CMS Media permissions to ADMIN PersonRoles...');

    // Trova tutti i PersonRole con roleType ADMIN
    const adminPersonRoles = await prisma.personRole.findMany({
        where: { roleType: "ADMIN" },
        select: { id: true, personId: true }
    });

    if (!adminPersonRoles.length) {
        console.log("No ADMIN PersonRoles found");
        return;
    }

    console.log(`Found ${adminPersonRoles.length} ADMIN PersonRole(s)`);

    for (const personRole of adminPersonRoles) {
        console.log(`\nProcessing PersonRole: ${personRole.id}`);

        for (const permission of mediaPermissions) {
            try {
                await prisma.rolePermission.upsert({
                    where: {
                        personRoleId_permission: {
                            personRoleId: personRole.id,
                            permission: permission
                        }
                    },
                    update: {},
                    create: {
                        personRoleId: personRole.id,
                        permission: permission
                    }
                });
                console.log("  ✅ Added/confirmed:", permission);
            } catch (e) {
                console.log("  ❌ Error adding", permission, e.message);
            }
        }
    }

    console.log("\n✅ Done! Please re-login to get updated permissions.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
