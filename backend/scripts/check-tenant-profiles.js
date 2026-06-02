/**
 * Check if doctors have tenantProfiles
 */
import prisma from '../config/prisma-optimization.js';

async function main() {
    console.log('🔧 Check TenantProfiles for Doctors\n');

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
                include: {
                    tenantProfiles: {
                        where: { tenantId, deletedAt: null },
                        select: { id: true, isActive: true }
                    }
                }
            }
        }
    });

    console.log(`Medici attivi trovati: ${doctors.length}`);

    for (const doctor of doctors) {
        const personId = doctor.person.id;
        const profiles = doctor.person.tenantProfiles || [];

        console.log(`\n${doctor.person.firstName} ${doctor.person.lastName}:`);
        console.log(`  TenantProfiles: ${profiles.length}`);

        if (profiles.length === 0) {
            console.log(`  ❌ Mancante: creo TenantProfile`);

            // Create tenantProfile
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
            console.log(`  ✅ TenantProfile creato`);
        } else {
            console.log(`  ✅ OK: ${profiles.length} profili`);
        }
    }

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('❌ Errore:', e);
    process.exit(1);
});
