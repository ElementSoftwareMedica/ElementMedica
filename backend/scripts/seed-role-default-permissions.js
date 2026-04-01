/**
 * Script per assegnare i permessi di default per ogni ruolo
 * Conforme a GDPR e regole del progetto
 * 
 * Usa getDefaultPermissions() da RoleTypes.js come unica fonte di verità.
 * Supporta tutti i 31 RoleType definiti nel Prisma schema.
 * Formato permessi: resource:action (es. companies:read, clinica.visite:create)
 * 
 * Esecuzione: node backend/scripts/seed-role-default-permissions.js
 */

import { PrismaClient } from '@prisma/client';
import { getDefaultPermissions, getAllRoleTypes } from '../services/enhancedRole/utils/RoleTypes.js';

const prisma = new PrismaClient();

// RelationType da associare a ogni ruolo per scope relazionali
const ROLE_RELATION_TYPES = {
    TRAINER: 'trainer_courses',
    SENIOR_TRAINER: 'trainer_courses',
    TRAINER_COORDINATOR: 'trainer_courses',
    EXTERNAL_TRAINER: 'trainer_courses',
    EMPLOYEE: 'course_participant',
    COMPANY_MANAGER: 'company_manager',
    COMPANY_ADMIN: 'company_admin',
    HR_MANAGER: 'hr_tenant',
    CONSULTANT: 'consultant_assigned',
    AUDITOR: 'auditor_tenant',
    MEDICO: 'medico_ambulatorio',
    PAZIENTE: 'paziente_self',
    INFERMIERE: 'infermiere_ambulatorio',
    SEGRETERIA_CLINICA: 'segreteria_clinica',
    MEDICO_COMPETENTE: 'medico_competente_aziende',
    RSPP: 'rspp_aziende',
    ASPP: 'aspp_aziende',
    TECNICO_SICUREZZA: 'tecnico_aziende',
    CONSULENTE_SICUREZZA: 'consulente_aziende'
};

async function seedRoleDefaultPermissions() {
    console.log('🔐 Seeding default permissions for roles...\n');

    try {
        // 1. Raccogli tutti i permessi unici da tutti i ruoli
        const allRoleTypes = getAllRoleTypes();
        const allPermissions = new Set();
        for (const roleType of allRoleTypes) {
            const perms = getDefaultPermissions(roleType);
            perms.forEach(p => allPermissions.add(p));
        }
        console.log(`📋 Ruoli configurati: ${allRoleTypes.length}`);
        console.log(`📋 Permessi unici totali: ${allPermissions.size}`);

        // 2. Per ogni PersonRole attivo nel sistema
        const personRoles = await prisma.personRole.findMany({
            where: {
                isActive: true,
                deletedAt: null
            },
            include: {
                person: {
                    select: { id: true, firstName: true, lastName: true }
                },
                permissions: true
            }
        });

        console.log(`👥 Trovati ${personRoles.length} PersonRole attivi\n`);

        let totalCreated = 0;
        let totalSkipped = 0;
        let totalCleaned = 0;

        for (const personRole of personRoles) {
            const roleType = personRole.roleType;
            const defaultPermissions = getDefaultPermissions(roleType);

            if (defaultPermissions.length === 0) {
                console.log(`⚠️  RoleType ${roleType} non ha permessi predefiniti configurati`);
                continue;
            }

            const personName = personRole.person
                ? `${personRole.person.firstName} ${personRole.person.lastName}`
                : personRole.id;
            console.log(`\n👤 ${personName} (${roleType})`);

            // Trova permessi esistenti
            const existingPermissions = new Set(personRole.permissions.map(p => p.permission));

            // Identifica permessi legacy (SCREAMING_SNAKE) da rimuovere
            const legacyPermissions = [...existingPermissions].filter(p => /^[A-Z_]+$/.test(p));
            if (legacyPermissions.length > 0) {
                await prisma.rolePermission.deleteMany({
                    where: {
                        personRoleId: personRole.id,
                        permission: { in: legacyPermissions }
                    }
                });
                console.log(`   🧹 Rimossi ${legacyPermissions.length} permessi legacy`);
                totalCleaned += legacyPermissions.length;
                // Aggiorna il set dopo la pulizia
                legacyPermissions.forEach(p => existingPermissions.delete(p));
            }

            // Trova permessi mancanti (solo formato resource:action)
            const missingPermissions = defaultPermissions.filter(p => !existingPermissions.has(p));

            console.log(`   ✓ Permessi esistenti (validi): ${existingPermissions.size}`);
            console.log(`   ⚠ Permessi mancanti: ${missingPermissions.length}`);

            if (missingPermissions.length === 0) {
                console.log(`   ✅ Tutti i permessi già assegnati`);
                totalSkipped++;
                continue;
            }

            // Crea permessi mancanti
            const permissionsToCreate = missingPermissions.map(permission => ({
                personRoleId: personRole.id,
                permission: permission,
                isGranted: true,
                grantedAt: new Date(),
                grantedBy: personRole.person?.id || null
            }));

            await prisma.rolePermission.createMany({
                data: permissionsToCreate,
                skipDuplicates: true
            });

            console.log(`   ✅ Creati ${missingPermissions.length} permessi`);
            totalCreated += missingPermissions.length;

            const relationType = ROLE_RELATION_TYPES[roleType];
            if (relationType) {
                console.log(`   ℹ️  RelationType: '${relationType}'`);
            }
        }

        console.log('\n\n📊 Riepilogo:');
        console.log(`   Permessi creati totali: ${totalCreated}`);
        console.log(`   Permessi legacy rimossi: ${totalCleaned}`);
        console.log(`   Ruoli già completi: ${totalSkipped}`);
        console.log('\n✅ Seed completato con successo!');

    } catch (error) {
        console.error('❌ Errore durante il seed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Funzione per mostrare riepilogo configurazione
function showRoleSummary() {
    console.log('\n📋 Configurazione Permessi di Default per Ruolo:\n');

    const allRoleTypes = getAllRoleTypes();
    for (const roleType of allRoleTypes) {
        const permissions = getDefaultPermissions(roleType);
        const relationType = ROLE_RELATION_TYPES[roleType] || 'none (full tenant access)';
        console.log(`🔹 ${roleType}:`);
        console.log(`   Permessi: ${permissions.length}`);
        console.log(`   RelationType: ${relationType}`);
        if (permissions.length > 0) {
            console.log(`   Esempi: ${permissions.slice(0, 5).join(', ')}${permissions.length > 5 ? '...' : ''}`);
        }
        console.log('');
    }
}

// Esegui
console.log('═══════════════════════════════════════════════════════════════');
console.log('    SEED PERMESSI DEFAULT PER RUOLO - ElementMedica');
console.log('═══════════════════════════════════════════════════════════════\n');

showRoleSummary();
seedRoleDefaultPermissions().catch(console.error);
