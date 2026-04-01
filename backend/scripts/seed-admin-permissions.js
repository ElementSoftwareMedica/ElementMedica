/**
 * Script per assegnare tutti i permessi necessari al ruolo ADMIN
 * Conforme a GDPR e regole del progetto
 * 
 * Usa getDefaultPermissions() da RoleTypes.js come unica fonte di verità.
 * Formato permessi: resource:action (es. companies:read, clinica.visite:create)
 * 
 * Esecuzione: node backend/scripts/seed-admin-permissions.js
 */

import { PrismaClient } from '@prisma/client';
import { getDefaultPermissions } from '../services/enhancedRole/utils/RoleTypes.js';

const prisma = new PrismaClient();

async function seedAdminPermissions() {
    console.log('🔐 Inizio seed permessi ADMIN...\n');

    const adminPermissions = getDefaultPermissions('ADMIN');
    console.log(`📋 Permessi ADMIN da assegnare: ${adminPermissions.length}\n`);

    try {
        // Trova tutti i PersonRole con roleType ADMIN o SUPER_ADMIN
        const adminRoles = await prisma.personRole.findMany({
            where: {
                roleType: { in: ['ADMIN', 'SUPER_ADMIN'] },
                isActive: true,
                deletedAt: null
            },
            include: {
                person: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                permissions: true
            }
        });

        console.log(`📋 Trovati ${adminRoles.length} PersonRole ADMIN/SUPER_ADMIN\n`);

        for (const adminRole of adminRoles) {
            const personName = adminRole.person
                ? `${adminRole.person.firstName} ${adminRole.person.lastName}`
                : adminRole.id;
            console.log(`👤 Elaborazione: ${personName} (${adminRole.roleType}, PersonRole ID: ${adminRole.id})`);

            const existingPermissions = new Set(adminRole.permissions.map(p => p.permission));

            // Rimuovi permessi legacy (SCREAMING_SNAKE)
            const legacyPermissions = [...existingPermissions].filter(p => /^[A-Z_]+$/.test(p));
            if (legacyPermissions.length > 0) {
                await prisma.rolePermission.deleteMany({
                    where: {
                        personRoleId: adminRole.id,
                        permission: { in: legacyPermissions }
                    }
                });
                console.log(`   🧹 Rimossi ${legacyPermissions.length} permessi legacy`);
                legacyPermissions.forEach(p => existingPermissions.delete(p));
            }

            // Trova permessi mancanti
            const missingPermissions = adminPermissions.filter(p => !existingPermissions.has(p));

            console.log(`   ✓ Permessi esistenti (validi): ${existingPermissions.size}`);
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
            const personName = adminRole.person
                ? `${adminRole.person.firstName} ${adminRole.person.lastName}`
                : adminRole.id;
            console.log(`   ${personName}: ${finalCount} permessi totali`);
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
