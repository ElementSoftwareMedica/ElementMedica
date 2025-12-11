/**
 * Script per assegnare i permessi di default per ogni ruolo
 * Conforme a GDPR e regole del progetto
 * 
 * Ruoli supportati:
 * - ADMIN: Accesso completo a tutte le entità
 * - EMPLOYEE: Dati limitati della propria azienda/sede + corsi iscritti + propri documenti
 * - TRAINER: Corsi dove è formatore/co-formatore + partecipanti + propri documenti/test
 * - TRAINING_ADMIN: Tutto tranne gestione ruoli/gerarchia
 * 
 * NOTA: I permessi devono corrispondere all'enum PersonPermission nel schema.prisma
 * 
 * Esecuzione: node backend/scripts/seed-role-default-permissions.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Permessi che esistono nell'enum PersonPermission
// Questi sono i SOLI permessi che possono essere usati
const VALID_PERMISSIONS = [
    // Companies
    'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
    // Employees
    'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
    // Trainers
    'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
    // Users
    'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS', 'MANAGE_USERS', 'USER_MANAGEMENT',
    // Courses
    'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES', 'MANAGE_ENROLLMENTS',
    // Documents
    'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
    // Admin & System
    'ADMIN_PANEL', 'SYSTEM_SETTINGS',
    // Roles
    'VIEW_ROLES', 'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES',
    'ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE', 'ROLE_MANAGEMENT', 'ASSIGN_ROLES', 'REVOKE_ROLES',
    // Tenants
    'VIEW_TENANTS', 'CREATE_TENANTS', 'EDIT_TENANTS', 'DELETE_TENANTS', 'TENANT_MANAGEMENT',
    // Administration
    'VIEW_ADMINISTRATION', 'CREATE_ADMINISTRATION', 'EDIT_ADMINISTRATION', 'DELETE_ADMINISTRATION',
    // GDPR
    'VIEW_GDPR', 'CREATE_GDPR', 'EDIT_GDPR', 'DELETE_GDPR',
    'VIEW_GDPR_DATA', 'EXPORT_GDPR_DATA', 'DELETE_GDPR_DATA', 'MANAGE_CONSENTS',
    // Reports
    'VIEW_REPORTS', 'CREATE_REPORTS', 'EDIT_REPORTS', 'DELETE_REPORTS', 'EXPORT_REPORTS',
    // Hierarchy
    'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'EDIT_HIERARCHY', 'DELETE_HIERARCHY',
    'MANAGE_HIERARCHY', 'HIERARCHY_MANAGEMENT',
    // Persons
    'VIEW_PERSONS', 'CREATE_PERSONS', 'EDIT_PERSONS', 'DELETE_PERSONS',
    // Schedules
    'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES', 'DELETE_SCHEDULES',
    // Quotes
    'VIEW_QUOTES', 'CREATE_QUOTES', 'EDIT_QUOTES', 'DELETE_QUOTES',
    // Invoices
    'VIEW_INVOICES', 'CREATE_INVOICES', 'EDIT_INVOICES', 'DELETE_INVOICES',
    // CMS
    'VIEW_CMS', 'CREATE_CMS', 'EDIT_CMS', 'DELETE_CMS', 'MANAGE_PUBLIC_CONTENT', 'READ_PUBLIC_CONTENT',
    'VIEW_CMS_PAGES', 'CREATE_CMS_PAGES', 'EDIT_CMS_PAGES', 'DELETE_CMS_PAGES', 'PUBLISH_CMS_PAGES', 'MANAGE_CMS_PAGES',
    'VIEW_CMS_NAVIGATION', 'EDIT_CMS_NAVIGATION', 'MANAGE_CMS_NAVIGATION',
    'VIEW_CMS_VERSIONS', 'RESTORE_CMS_VERSIONS',
    'VIEW_CMS_MEDIA', 'CREATE_CMS_MEDIA', 'EDIT_CMS_MEDIA', 'DELETE_CMS_MEDIA', 'UPLOAD_CMS_MEDIA', 'MANAGE_CMS_MEDIA',
    'VIEW_PUBLIC_CMS', 'CREATE_PUBLIC_CMS', 'EDIT_PUBLIC_CMS', 'DELETE_PUBLIC_CMS', 'MANAGE_PUBLIC_CMS',
    // Submissions & Templates
    'VIEW_SUBMISSIONS', 'CREATE_SUBMISSIONS', 'EDIT_SUBMISSIONS', 'DELETE_SUBMISSIONS', 'MANAGE_SUBMISSIONS', 'EXPORT_SUBMISSIONS',
    'VIEW_FORM_SUBMISSIONS', 'CREATE_FORM_SUBMISSIONS', 'EDIT_FORM_SUBMISSIONS', 'DELETE_FORM_SUBMISSIONS', 'MANAGE_FORM_SUBMISSIONS', 'EXPORT_FORM_SUBMISSIONS',
    'VIEW_FORM_TEMPLATES', 'CREATE_FORM_TEMPLATES', 'EDIT_FORM_TEMPLATES', 'DELETE_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES',
    'VIEW_TEMPLATES', 'CREATE_TEMPLATES', 'EDIT_TEMPLATES', 'DELETE_TEMPLATES', 'MANAGE_TEMPLATES',
    // SEO
    'VIEW_SEO', 'CREATE_SEO', 'EDIT_SEO', 'DELETE_SEO', 'MANAGE_SEO', 'GENERATE_SITEMAP',
    // Notifications
    'VIEW_NOTIFICATIONS', 'CREATE_NOTIFICATIONS', 'EDIT_NOTIFICATIONS', 'DELETE_NOTIFICATIONS', 'MANAGE_NOTIFICATIONS', 'SEND_NOTIFICATIONS',
    // Audit Logs
    'VIEW_AUDIT_LOGS', 'CREATE_AUDIT_LOGS', 'EDIT_AUDIT_LOGS', 'DELETE_AUDIT_LOGS', 'MANAGE_AUDIT_LOGS', 'EXPORT_AUDIT_LOGS',
    // API Keys
    'VIEW_API_KEYS', 'CREATE_API_KEYS', 'EDIT_API_KEYS', 'DELETE_API_KEYS', 'MANAGE_API_KEYS', 'REGENERATE_API_KEYS',
    // Preventivi
    'VIEW_PREVENTIVI', 'CREATE_PREVENTIVI', 'EDIT_PREVENTIVI', 'DELETE_PREVENTIVI', 'MANAGE_PREVENTIVI', 'GENERATE_PREVENTIVI_PDF', 'SEND_PREVENTIVI',
    // Codici Sconto
    'VIEW_CODICI_SCONTO', 'CREATE_CODICI_SCONTO', 'EDIT_CODICI_SCONTO', 'DELETE_CODICI_SCONTO', 'MANAGE_CODICI_SCONTO'
];

// Definizione permessi per ogni RoleType - usando SOLO permessi validi dall'enum
const ROLE_PERMISSIONS = {
    // ADMIN: Full access to everything
    ADMIN: VALID_PERMISSIONS,

    // TRAINING_ADMIN: Tutto tranne gestione ruoli e gerarchia
    TRAINING_ADMIN: [
        // Companies
        'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
        // Employees
        'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
        // Trainers
        'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
        // Courses
        'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES', 'MANAGE_ENROLLMENTS',
        // Documents
        'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
        // Schedules
        'VIEW_SCHEDULES', 'CREATE_SCHEDULES', 'EDIT_SCHEDULES', 'DELETE_SCHEDULES',
        // Persons
        'VIEW_PERSONS', 'CREATE_PERSONS', 'EDIT_PERSONS', 'DELETE_PERSONS',
        // Reports
        'VIEW_REPORTS', 'CREATE_REPORTS', 'EDIT_REPORTS', 'DELETE_REPORTS', 'EXPORT_REPORTS',
        // Quotes
        'VIEW_QUOTES', 'CREATE_QUOTES', 'EDIT_QUOTES', 'DELETE_QUOTES',
        // CMS (read only)
        'VIEW_CMS', 'READ_PUBLIC_CONTENT', 'VIEW_CMS_PAGES',
        // Submissions
        'VIEW_SUBMISSIONS', 'CREATE_SUBMISSIONS', 'EDIT_SUBMISSIONS',
        'VIEW_FORM_SUBMISSIONS', 'EXPORT_SUBMISSIONS',
        // Templates
        'VIEW_TEMPLATES', 'CREATE_TEMPLATES', 'EDIT_TEMPLATES', 'DELETE_TEMPLATES',
        // Notifications
        'VIEW_NOTIFICATIONS', 'CREATE_NOTIFICATIONS', 'SEND_NOTIFICATIONS',
        // Administration (limited)
        'VIEW_ADMINISTRATION'
    ],

    // TRAINER: Corsi dove è formatore + partecipanti + propri documenti
    TRAINER: [
        // Corsi (solo lettura - i propri corsi tramite relationType)
        'VIEW_COURSES',
        // Schedules (solo i propri tramite relationType trainer_courses)
        'VIEW_SCHEDULES',
        // Persone/Partecipanti (solo quelli dei propri corsi)
        'VIEW_PERSONS', 'VIEW_EMPLOYEES',
        // Documenti (propri documenti e download)
        'VIEW_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
        // Notifications (solo proprie)
        'VIEW_NOTIFICATIONS',
        // Companies (dati limitati, non sensibili)
        'VIEW_COMPANIES'
    ],

    // EMPLOYEE: Dati propria azienda/sede + corsi iscritti + documenti personali
    EMPLOYEE: [
        // Corsi (solo quelli a cui è iscritto)
        'VIEW_COURSES',
        // Schedules (solo quelli dei corsi iscritti)
        'VIEW_SCHEDULES',
        // Documenti personali
        'VIEW_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
        // Notifiche personali
        'VIEW_NOTIFICATIONS',
        // Propria azienda (dati non sensibili)
        'VIEW_COMPANIES'
    ],

    // COMPANY_MANAGER: Come employee + vista colleghi della stessa azienda
    COMPANY_MANAGER: [
        // Eredita da EMPLOYEE
        'VIEW_COURSES', 'VIEW_SCHEDULES',
        'VIEW_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
        'VIEW_NOTIFICATIONS', 'VIEW_COMPANIES',
        // Estensioni per Manager
        'VIEW_EMPLOYEES', 'VIEW_PERSONS'
    ],

    // SITE_MANAGER: Come employee + vista colleghi della stessa sede
    SITE_MANAGER: [
        // Eredita da EMPLOYEE
        'VIEW_COURSES', 'VIEW_SCHEDULES',
        'VIEW_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
        'VIEW_NOTIFICATIONS', 'VIEW_COMPANIES',
        // Estensioni per Site Manager
        'VIEW_EMPLOYEES', 'VIEW_PERSONS'
    ],

    // HR_MANAGER: Vede tutto tranne dati finanziari e configurazione sistema
    HR_MANAGER: [
        // Companies (read only)
        'VIEW_COMPANIES',
        // Employees (full access)
        'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES',
        // Trainers (read only)
        'VIEW_TRAINERS',
        // Courses
        'VIEW_COURSES', 'MANAGE_ENROLLMENTS',
        // Documents
        'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
        // Schedules
        'VIEW_SCHEDULES',
        // Persons
        'VIEW_PERSONS', 'CREATE_PERSONS', 'EDIT_PERSONS',
        // Reports HR
        'VIEW_REPORTS', 'CREATE_REPORTS', 'EXPORT_REPORTS',
        // Notifications
        'VIEW_NOTIFICATIONS', 'CREATE_NOTIFICATIONS', 'SEND_NOTIFICATIONS',
        // GDPR (limited)
        'VIEW_GDPR', 'EXPORT_GDPR_DATA'
    ],

    // CONSULTANT: Accesso a aziende assegnate
    CONSULTANT: [
        // Companies (assegnate)
        'VIEW_COMPANIES', 'EDIT_COMPANIES',
        // Employees (delle aziende assegnate)
        'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES',
        // Documenti
        'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DOWNLOAD_DOCUMENTS',
        // Reports
        'VIEW_REPORTS', 'CREATE_REPORTS', 'EXPORT_REPORTS'
    ],

    // AUDITOR: Solo lettura log e audit
    AUDITOR: [
        // Audit Logs (full read)
        'VIEW_AUDIT_LOGS', 'EXPORT_AUDIT_LOGS',
        // GDPR
        'VIEW_GDPR', 'VIEW_GDPR_DATA', 'EXPORT_GDPR_DATA',
        // Reports (read only)
        'VIEW_REPORTS', 'EXPORT_REPORTS',
        // Companies (read only)
        'VIEW_COMPANIES',
        // Employees (read only)
        'VIEW_EMPLOYEES'
    ]
};

// RelationType da associare a ogni ruolo
const ROLE_RELATION_TYPES = {
    TRAINER: 'trainer_courses',
    EMPLOYEE: 'course_participant',
    COMPANY_MANAGER: 'company_manager',
    SITE_MANAGER: 'site_manager',
    HR_MANAGER: 'hr_tenant',
    CONSULTANT: 'consultant_assigned',
    AUDITOR: 'auditor_tenant'
};

async function seedRoleDefaultPermissions() {
    console.log('🔐 Seeding default permissions for roles...\n');

    try {
        // 1. Prima crea i permessi base nel sistema se non esistono
        const allPermissions = new Set();
        Object.values(ROLE_PERMISSIONS).forEach(perms => {
            perms.forEach(p => allPermissions.add(p));
        });

        console.log(`📋 Permessi unici totali: ${allPermissions.size}`);

        // 2. Per ogni ruolo nel sistema
        const personRoles = await prisma.personRole.findMany({
            where: {
                isActive: true,
                deletedAt: null
            },
            include: {
                person: {
                    select: { id: true, email: true, firstName: true, lastName: true }
                },
                permissions: true
            }
        });

        console.log(`👥 Trovati ${personRoles.length} PersonRole attivi\n`);

        let totalCreated = 0;
        let totalSkipped = 0;

        for (const personRole of personRoles) {
            const roleType = personRole.roleType;
            const rolePermissions = ROLE_PERMISSIONS[roleType];

            if (!rolePermissions) {
                console.log(`⚠️  RoleType ${roleType} non ha permessi predefiniti configurati`);
                continue;
            }

            console.log(`\n👤 ${personRole.person?.email || personRole.id} (${roleType})`);

            // Trova permessi mancanti
            const existingPermissions = new Set(personRole.permissions.map(p => p.permission));
            const missingPermissions = rolePermissions.filter(p => !existingPermissions.has(p));

            console.log(`   ✓ Permessi esistenti: ${existingPermissions.size}`);
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

            // Nota: Il relationType va configurato in AdvancedPermission, non in RolePermission
            // Per applicare scope relazionali, usare la UI di gestione permessi o creare
            // AdvancedPermission con relationType appropriato
            const relationType = ROLE_RELATION_TYPES[roleType];
            if (relationType) {
                console.log(`   ℹ️  RelationType suggerito: '${relationType}' (configurare via UI)`);
            }
        }

        console.log('\n\n📊 Riepilogo:');
        console.log(`   Permessi creati totali: ${totalCreated}`);
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
async function showRoleSummary() {
    console.log('\n📋 Configurazione Permessi di Default per Ruolo:\n');

    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
        const relationType = ROLE_RELATION_TYPES[role] || 'none (full tenant access)';
        console.log(`🔹 ${role}:`);
        console.log(`   Permessi: ${permissions.length}`);
        console.log(`   RelationType: ${relationType}`);
        console.log(`   Esempi: ${permissions.slice(0, 5).join(', ')}...`);
        console.log('');
    }
}

// Esegui
console.log('═══════════════════════════════════════════════════════════════');
console.log('    SEED PERMESSI DEFAULT PER RUOLO - ElementMedica');
console.log('═══════════════════════════════════════════════════════════════\n');

showRoleSummary().then(() => {
    return seedRoleDefaultPermissions();
}).catch(console.error);
