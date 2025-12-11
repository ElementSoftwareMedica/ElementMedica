/**
 * Seed per RelationDefinitions di sistema
 * 
 * Eseguire con: node backend/prisma/seeds/seed-relation-definitions.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SYSTEM_RELATIONS = [
    {
        name: 'trainer_courses',
        displayName: 'Formatore - Corsi Assegnati',
        description: 'Accesso a dati di aziende e persone partecipanti ai corsi dove l\'utente è formatore',
        baseEntity: 'Person',
        targetEntities: ['Company', 'Person', 'CourseSchedule', 'CourseEnrollment'],
        relationChain: [
            { from: 'Person', to: 'CourseSchedule', via: 'trainerId', type: 'oneToMany' },
            { from: 'CourseSchedule', to: 'Company', via: 'companyId', type: 'manyToOne' },
            { from: 'CourseSchedule', to: 'CourseEnrollment', via: 'id', type: 'oneToMany', viaField: 'scheduledCourseId' },
            { from: 'CourseEnrollment', to: 'Person', via: 'personId', type: 'manyToOne' }
        ],
        isSystem: true,
        isActive: true
    },
    {
        name: 'company_manager',
        displayName: 'Manager - Propria Azienda',
        description: 'Accesso a dati della propria azienda e relativi dipendenti',
        baseEntity: 'Person',
        targetEntities: ['Company', 'Person', 'CompanySite', 'Reparto'],
        relationChain: [
            { from: 'Person', to: 'Company', via: 'companyId', type: 'manyToOne' },
            { from: 'Company', to: 'Person', via: 'companyId', type: 'oneToMany' },
            { from: 'Company', to: 'CompanySite', via: 'companyId', type: 'oneToMany' }
        ],
        isSystem: true,
        isActive: true
    },
    {
        name: 'department_head',
        displayName: 'Responsabile Reparto',
        description: 'Accesso a dati del proprio reparto e dipendenti assegnati',
        baseEntity: 'Person',
        targetEntities: ['Person', 'Reparto'],
        relationChain: [
            { from: 'Person', to: 'Reparto', via: 'departmentId', type: 'manyToOne' },
            { from: 'Reparto', to: 'Person', via: 'departmentId', type: 'oneToMany' }
        ],
        isSystem: true,
        isActive: true
    },
    {
        name: 'site_manager',
        displayName: 'Responsabile Sede',
        description: 'Accesso a dati della propria sede aziendale',
        baseEntity: 'Person',
        targetEntities: ['Person', 'CompanySite', 'Reparto'],
        relationChain: [
            { from: 'Person', to: 'CompanySite', via: 'siteId', type: 'manyToOne' },
            { from: 'CompanySite', to: 'Person', via: 'siteId', type: 'oneToMany' }
        ],
        isSystem: true,
        isActive: true
    },
    {
        name: 'hr_tenant',
        displayName: 'HR - Tutti i Dipendenti',
        description: 'Accesso a tutti i dipendenti del tenant (nessun filtro aggiuntivo)',
        baseEntity: 'Person',
        targetEntities: ['Person', 'Company'],
        relationChain: [], // Nessun filtro aggiuntivo oltre tenantId
        isSystem: true,
        isActive: true
    },
    {
        name: 'course_participant',
        displayName: 'Partecipante - Propri Corsi',
        description: 'Accesso ai corsi in cui l\'utente è iscritto',
        baseEntity: 'Person',
        targetEntities: ['CourseSchedule', 'Course', 'Attestato'],
        relationChain: [
            { from: 'Person', to: 'CourseEnrollment', via: 'personId', type: 'oneToMany' },
            { from: 'CourseEnrollment', to: 'CourseSchedule', via: 'scheduledCourseId', type: 'manyToOne' },
            { from: 'CourseSchedule', to: 'Course', via: 'courseId', type: 'manyToOne' }
        ],
        isSystem: true,
        isActive: true
    },
    {
        name: 'auditor_tenant',
        displayName: 'Auditor - Dati Audit Tenant',
        description: 'Accesso a log di audit e dati di conformità del tenant',
        baseEntity: 'Person',
        targetEntities: ['GdprAuditLog', 'SecurityAuditLog', 'ActivityLog'],
        relationChain: [], // Nessun filtro, accede a tutto il tenant
        isSystem: true,
        isActive: true
    },
    {
        name: 'consultant_assigned',
        displayName: 'Consulente - Aziende Assegnate',
        description: 'Accesso a dati delle aziende assegnate al consulente',
        baseEntity: 'Person',
        targetEntities: ['Company', 'Person', 'DVR', 'Sopralluogo'],
        relationChain: [
            // Assumendo una tabella di assegnazione consulente-azienda
            { from: 'Person', to: 'Company', via: 'consultantId', type: 'oneToMany' },
            { from: 'Company', to: 'Person', via: 'companyId', type: 'oneToMany' }
        ],
        isSystem: true,
        isActive: true
    },
    {
        name: 'trainer_coordinator_area',
        displayName: 'Coordinatore Formatori - Area',
        description: 'Accesso a tutti i formatori e corsi della propria area',
        baseEntity: 'Person',
        targetEntities: ['Person', 'CourseSchedule', 'Company'],
        relationChain: [
            // Formatori sotto il coordinatore
            { from: 'Person', to: 'Person', via: 'coordinatorId', type: 'oneToMany' },
            // Corsi dei formatori
            { from: 'Person', to: 'CourseSchedule', via: 'trainerId', type: 'oneToMany' }
        ],
        isSystem: true,
        isActive: true
    },
    {
        name: 'external_trainer_limited',
        displayName: 'Formatore Esterno - Limitato',
        description: 'Accesso limitato solo ai propri corsi senza dati aziendali sensibili',
        baseEntity: 'Person',
        targetEntities: ['CourseSchedule', 'CourseEnrollment'],
        relationChain: [
            { from: 'Person', to: 'CourseSchedule', via: 'trainerId', type: 'oneToMany' },
            { from: 'CourseSchedule', to: 'CourseEnrollment', via: 'id', type: 'oneToMany', viaField: 'scheduledCourseId' }
        ],
        isSystem: true,
        isActive: true
    }
];

async function seedRelationDefinitions() {
    console.log('🌱 Seeding relation definitions...');

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const relation of SYSTEM_RELATIONS) {
        try {
            const existing = await prisma.relationDefinition.findUnique({
                where: { name: relation.name }
            });

            if (existing) {
                // Aggiorna solo se è di sistema
                if (existing.isSystem) {
                    await prisma.relationDefinition.update({
                        where: { name: relation.name },
                        data: {
                            displayName: relation.displayName,
                            description: relation.description,
                            baseEntity: relation.baseEntity,
                            targetEntities: relation.targetEntities,
                            relationChain: relation.relationChain,
                            isActive: relation.isActive,
                            updatedAt: new Date()
                        }
                    });
                    updated++;
                    console.log(`  ✅ Updated: ${relation.name}`);
                } else {
                    skipped++;
                    console.log(`  ⏭️  Skipped (custom): ${relation.name}`);
                }
            } else {
                await prisma.relationDefinition.create({
                    data: relation
                });
                created++;
                console.log(`  ✅ Created: ${relation.name}`);
            }
        } catch (error) {
            console.error(`  ❌ Error with ${relation.name}:`, error.message);
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
}

// Esegui seed
seedRelationDefinitions()
    .then(() => {
        console.log('\n✅ Seed completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
