/**
 * Script per assegnare tutti i permessi all'utente admin
 * Crea un PersonRole ADMIN con tutti i permessi del sistema
 */

import { PrismaClient, PersonPermission, RoleType } from '@prisma/client';
const prisma = new PrismaClient();

async function assignAllPermissionsToAdmin() {
    try {
        console.log('=== Assegnazione Permessi Admin ===\n');

        // 1. Trova l'utente admin cercando in PersonTenantProfile
        // P48: email è in PersonTenantProfile, non in Person
        const adminProfile = await prisma.personTenantProfile.findFirst({
            where: {
                email: 'admin@example.com',
                deletedAt: null,
                isActive: true
            },
            include: {
                person: {
                    include: {
                        personRoles: {
                            where: { isActive: true }
                        }
                    }
                }
            }
        });

        if (!adminProfile?.person) {
            console.error('❌ Admin user not found!');
            return;
        }

        const adminPerson = adminProfile.person;
        const adminEmail = adminProfile.email;

        console.log('✅ Admin trovato:', adminEmail);
        console.log('   ID:', adminPerson.id);
        console.log('   Tenant ID:', adminProfile.tenantId || adminPerson.tenantId);
        console.log('   Global Role:', adminPerson.globalRole);
        console.log('   Existing Person Roles:', adminPerson.personRoles.length);

        // 2. Ottieni tutti i permessi disponibili dall'enum
        const allPermissions = Object.values(PersonPermission);
        console.log('\n📋 Permessi totali da assegnare:', allPermissions.length);

        // 3. Verifica se esiste già un PersonRole ADMIN
        let adminRole = adminPerson.personRoles.find(r => r.roleType === 'ADMIN');

        if (!adminRole) {
            // Crea un nuovo PersonRole ADMIN
            console.log('\n🔧 Creazione PersonRole ADMIN...');
            adminRole = await prisma.personRole.create({
                data: {
                    personId: adminPerson.id,
                    tenantId: adminPerson.tenantId,
                    roleType: 'ADMIN',
                    isActive: true,
                    isPrimary: true,
                    validFrom: new Date()
                }
            });
            console.log('✅ PersonRole ADMIN creato:', adminRole.id);
        } else {
            console.log('\n✅ PersonRole ADMIN già esistente:', adminRole.id);
        }

        // 4. Rimuovi i permessi esistenti per evitare duplicati
        const deletedCount = await prisma.rolePermission.deleteMany({
            where: { personRoleId: adminRole.id }
        });
        console.log('🗑️  Permessi precedenti rimossi:', deletedCount.count);

        // 5. Assegna tutti i permessi
        console.log('\n📝 Assegnazione di tutti i permessi...');
        const permissionsToCreate = allPermissions.map(permission => ({
            personRoleId: adminRole.id,
            permission: permission,
            isGranted: true,
            grantedAt: new Date(),
            grantedBy: adminPerson.id // Auto-assegnato
        }));

        const createdPermissions = await prisma.rolePermission.createMany({
            data: permissionsToCreate,
            skipDuplicates: true
        });

        console.log('✅ Permessi assegnati:', createdPermissions.count);

        // 6. Verifica finale
        const verifyRole = await prisma.personRole.findUnique({
            where: { id: adminRole.id },
            include: {
                permissions: true
            }
        });

        console.log('\n=== Verifica Finale ===');
        console.log('PersonRole ID:', verifyRole?.id);
        console.log('Role Type:', verifyRole?.roleType);
        console.log('Is Active:', verifyRole?.isActive);
        console.log('Permissions Count:', verifyRole?.permissions?.length || 0);

        if (verifyRole?.permissions?.length === allPermissions.length) {
            console.log('\n🎉 SUCCESSO! Admin ha ora tutti i', allPermissions.length, 'permessi.');
        } else {
            console.log('\n⚠️  ATTENZIONE: Mancano alcuni permessi!');
            console.log('   Attesi:', allPermissions.length);
            console.log('   Assegnati:', verifyRole?.permissions?.length || 0);
        }

    } catch (error) {
        console.error('❌ Errore:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

assignAllPermissionsToAdmin();
