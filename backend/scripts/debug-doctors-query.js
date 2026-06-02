/**
 * Debug doctors query
 */
import prisma from '../config/prisma-optimization.js';

async function main() {
    console.log('🔧 Debug Doctors Query\n');

    const tenantId = '6a8e68d7-1958-44d8-af50-2121f638db5c';
    
    // Test the exact query from public-doctors-routes
    const baseWhere = {
      deletedAt: null,
      NOT: { firstName: 'ANON', lastName: 'ANON' },
      tenantProfiles: { some: { tenantId, deletedAt: null, isActive: true } },
      personRoles: { some: { tenantId, deletedAt: null, roleType: { in: ['MEDICO', 'MEDICO_COMPETENTE', 'CLINIC_ADMIN'] } } }
    };

    console.log('Query baseWhere:', JSON.stringify(baseWhere, null, 2));

    const doctors = await prisma.person.findMany({
      where: baseWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gender: true,
        profileImage: true,
        tenantProfiles: {
          where: { tenantId, deletedAt: null, isActive: true },
          select: {
            id: true,
            title: true,
            shortDescription: true,
            fullDescription: true,
            specialties: true,
            certifications: true,
            isActive: true
          },
          take: 1
        },
        _count: {
          select: {
            slotDisponibilita: {
              where: {
                tenantId,
                deletedAt: null,
                visibilePubblico: true,
                prenotabileOnline: true,
                disponibile: true,
                stato: 'LIBERO',
                data: { gte: new Date() }
              }
            }
          }
        }
      },
      orderBy: { lastName: 'asc' },
      take: 50
    });

    console.log(`\nMedici trovati: ${doctors.length}`);
    
    for (const doctor of doctors) {
        console.log(`\n- ${doctor.firstName} ${doctor.lastName}`);
        console.log(`  TenantProfiles: ${doctor.tenantProfiles.length}`);
        console.log(`  Slot disponibili: ${doctor._count.slotDisponibilita}`);
    }

    // Test without tenantProfiles filter
    console.log('\n\n=== Test senza tenantProfiles filter ===');
    const doctors2 = await prisma.person.findMany({
      where: {
        deletedAt: null,
        NOT: { firstName: 'ANON', lastName: 'ANON' },
        personRoles: { some: { tenantId, deletedAt: null, roleType: { in: ['MEDICO', 'MEDICO_COMPETENTE', 'CLINIC_ADMIN'] } } }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tenantProfiles: {
          where: { tenantId, deletedAt: null },
          select: { id: true, isActive: true }
        }
      }
    });

    console.log(`Medici senza tenantProfiles filter: ${doctors2.length}`);
    for (const doctor of doctors2) {
        console.log(`- ${doctor.firstName} ${doctor.lastName}: ${doctor.tenantProfiles.length} profiles (active: ${doctor.tenantProfiles.filter(p => p.isActive).length})`);
    }

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('❌ Errore:', e);
    process.exit(1);
});
