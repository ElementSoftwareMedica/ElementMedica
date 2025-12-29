/**
 * Script per assegnare i permessi clinici all'admin
 * 
 * Assegna tutti i permessi del modulo poliambulatorio/clinica all'utente admin
 * Crea il ruolo ADMIN se non esiste
 * 
 * Eseguire con: node scripts/assign-clinica-permissions-admin.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Permessi clinici da assegnare
const CLINICAL_PERMISSIONS = [
    'VIEW_POLIAMBULATORIO',
    'CREATE_POLIAMBULATORIO',
    'EDIT_POLIAMBULATORIO',
    'DELETE_POLIAMBULATORIO',
    'MANAGE_POLIAMBULATORIO',
    'VIEW_AMBULATORIO',
    'CREATE_AMBULATORIO',
    'EDIT_AMBULATORIO',
    'DELETE_AMBULATORIO',
    'MANAGE_AMBULATORIO',
    'VIEW_STRUMENTO',
    'CREATE_STRUMENTO',
    'EDIT_STRUMENTO',
    'DELETE_STRUMENTO',
    'MANAGE_STRUMENTO',
    'VIEW_PRESTAZIONE',
    'CREATE_PRESTAZIONE',
    'EDIT_PRESTAZIONE',
    'DELETE_PRESTAZIONE',
    'MANAGE_PRESTAZIONE',
    'VIEW_LISTINO',
    'CREATE_LISTINO',
    'EDIT_LISTINO',
    'DELETE_LISTINO',
    'MANAGE_LISTINO',
    'VIEW_CONVENZIONE',
    'CREATE_CONVENZIONE',
    'EDIT_CONVENZIONE',
    'DELETE_CONVENZIONE',
    'MANAGE_CONVENZIONE',
    'VIEW_APPUNTAMENTO',
    'CREATE_APPUNTAMENTO',
    'EDIT_APPUNTAMENTO',
    'DELETE_APPUNTAMENTO',
    'MANAGE_APPUNTAMENTO',
    'ACCETTA_PAZIENTE',
    'CHIAMA_PAZIENTE',
    'VIEW_VISITA',
    'CREATE_VISITA',
    'EDIT_VISITA',
    'DELETE_VISITA',
    'MANAGE_VISITA',
    'VIEW_REFERTO',
    'CREATE_REFERTO',
    'EDIT_REFERTO',
    'DELETE_REFERTO',
    'MANAGE_REFERTO',
    'FIRMA_REFERTO',
    'VIEW_DOCUMENTO_CLINICO',
    'CREATE_DOCUMENTO_CLINICO',
    'EDIT_DOCUMENTO_CLINICO',
    'DELETE_DOCUMENTO_CLINICO',
    'MANAGE_DOCUMENTO_CLINICO',
    'VIEW_FATTURA_SANITARIA',
    'CREATE_FATTURA_SANITARIA',
    'EDIT_FATTURA_SANITARIA',
    'DELETE_FATTURA_SANITARIA',
    'MANAGE_FATTURA_SANITARIA',
    'VIEW_AUDIT_CLINICO',
    'EXPORT_AUDIT_CLINICO',
    'MANAGE_AGENDA',
    'VIEW_DISPONIBILITA',
    'CREATE_DISPONIBILITA',
    'EDIT_DISPONIBILITA',
    'DELETE_DISPONIBILITA',
    'MANAGE_DISPONIBILITA',
    'VIEW_CARTELLA_PAZIENTE',
    'EDIT_CARTELLA_PAZIENTE',
    'EXPORT_CARTELLA_PAZIENTE'
];

async function main() {
    console.log('🔐 Assegnazione permessi clinici all\'admin...\n');

    try {
        // Trova l'admin user
        const admin = await prisma.person.findFirst({
            where: {
                email: 'admin@example.com',
                deletedAt: null
            },
            include: {
                personRoles: {
                    include: {
                        permissions: true
                    }
                }
            }
        });

        if (!admin) {
            console.error('❌ Admin user non trovato!');
            process.exit(1);
        }

        console.log(`✅ Admin trovato: ${admin.email} (ID: ${admin.id})`);
        console.log(`   Tenant: ${admin.tenantId}`);

        // Trova o crea il ruolo ADMIN
        let adminRole = admin.personRoles.find(pr => pr.roleType === 'ADMIN');

        if (!adminRole) {
            console.log('\n📝 Ruolo ADMIN non trovato, creo il ruolo...');

            adminRole = await prisma.personRole.create({
                data: {
                    personId: admin.id,
                    roleType: 'ADMIN',
                    isActive: true,
                    tenantId: admin.tenantId
                },
                include: {
                    permissions: true
                }
            });

            console.log(`✅ Ruolo ADMIN creato (ID: ${adminRole.id})`);
        } else {
            console.log(`✅ Ruolo ADMIN trovato (ID: ${adminRole.id})`);
        }

        // Permessi esistenti
        const existingPermissions = adminRole.permissions?.map(p => p.permission) || [];
        console.log(`\n📋 Permessi esistenti: ${existingPermissions.length}`);

        // Permessi da aggiungere
        const permissionsToAdd = CLINICAL_PERMISSIONS.filter(
            p => !existingPermissions.includes(p)
        );

        console.log(`📋 Permessi clinici da aggiungere: ${permissionsToAdd.length}`);

        if (permissionsToAdd.length === 0) {
            console.log('\n✅ Tutti i permessi clinici sono già assegnati!');
            return;
        }

        // Crea i nuovi permessi
        const permissionsData = permissionsToAdd.map(permission => ({
            personRoleId: adminRole.id,
            permission: permission,
            isGranted: true,
            grantedAt: new Date()
        }));

        const result = await prisma.rolePermission.createMany({
            data: permissionsData,
            skipDuplicates: true
        });

        console.log(`\n✅ Aggiunti ${result.count} nuovi permessi clinici!`);

        // Verifica finale
        const updatedRole = await prisma.personRole.findUnique({
            where: { id: adminRole.id },
            include: { permissions: true }
        });

        const clinicalPermissions = updatedRole.permissions.filter(
            p => CLINICAL_PERMISSIONS.includes(p.permission)
        );

        console.log(`\n📊 Riepilogo permessi clinici:`);
        console.log(`   - Totale permessi clinici definiti: ${CLINICAL_PERMISSIONS.length}`);
        console.log(`   - Permessi clinici assegnati: ${clinicalPermissions.length}`);

        // Lista permessi aggiunti
        console.log('\n📋 Permessi clinici aggiunti:');
        permissionsToAdd.forEach(p => console.log(`   ✓ ${p}`));

        console.log('\n✅ Completato! L\'admin ora ha accesso completo al modulo poliambulatorio.');

    } catch (error) {
        console.error('❌ Errore:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
