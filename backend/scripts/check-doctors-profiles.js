/**
 * Check and fix doctor profiles
 * 
 * Verifica se i medici hanno tenantProfiles e li crea se mancanti
 */
import prisma from '../config/prisma-optimization.js';

async function main() {
    console.log('🔧 Check Doctor Profiles\n');

    const tenantId = '6a8e68d7-1958-44d8-af50-2121f638db5c';

    // Get active doctors
    const doctors = await prisma.personRole.findMany({
        where: {
            roleType: 'MEDICO',
            isActive: true,
            deletedAt: null,
            tenantId
        },
        include: {
            person: {
                select: { id: true, firstName: true, lastName: true }
            }
        }
    });

    console.log(`Medici attivi trovati: ${doctors.length}`);

    for (const doctor of doctors) {
        const personId = doctor.person.id;

        // Check if PersonTenantProfile exists
        const profile = await prisma.personTenantProfile.findFirst({
            where: {
                personId,
                tenantId,
                deletedAt: null
            }
        });

        if (!profile) {
            console.log(`\n❌ Mancante: ${doctor.person.firstName} ${doctor.person.lastName}`);

            // Create PersonTenantProfile
            await prisma.personTenantProfile.create({
                data: {
                    personId,
                    tenantId,
                    title: 'Dott.',
                    shortDescription: 'Medico specialista',
                    specialties: ['Medicina Generale'],
                    isActive: true
                }
            });
            console.log(`  ✅ PersonTenantProfile creato`);
        } else {
            console.log(`\n✅ OK: ${doctor.person.firstName} ${doctor.person.lastName}`);
        }
    }

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('❌ Errore:', e);
    process.exit(1);
});
