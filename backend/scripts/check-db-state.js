import prisma from '../config/prisma-optimization.js';

async function main() {
    // 1. Check tenant settings (brand mapping)
    const tenants = await prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, slug: true, settings: true }
    });
    for (const t of tenants) {
        console.log('=== Tenant:', t.name, '(' + t.id + ') ===');
        const s = t.settings || {};
        console.log('publicBrandTenantMapping:', JSON.stringify(s.publicBrandTenantMapping || 'NOT SET'));
        console.log('---');
    }

    // 2. Check prestazioni
    const prestazioni = await prisma.prestazione.findMany({
        where: { deletedAt: null },
        select: { id: true, nome: true, codice: true, tenantId: true, attivo: true, prezzoBase: true, tipo: true }
    });
    console.log('\n=== Prestazioni:', prestazioni.length, '===');
    prestazioni.forEach(p => console.log(`  - ${p.nome} (${p.codice}) tenant=${p.tenantId} attivo=${p.attivo} prezzo=${p.prezzoBase}`));

    // 3. Check doctors
    const doctors = await prisma.personRole.findMany({
        where: {
            roleType: { in: ['MEDICO', 'MEDICO_COMPETENTE'] },
            isActive: true,
            deletedAt: null
        },
        include: {
            person: { select: { firstName: true, lastName: true, id: true, gender: true } },
            tenant: { select: { id: true, name: true } }
        }
    });
    console.log('\n=== Doctors (by role):', doctors.length, '===');
    doctors.forEach(d => console.log(`  - ${d.person.firstName} ${d.person.lastName} (${d.person.id}) role=${d.roleType} tenant=${d.tenant?.name}`));

    // 4. Check slots
    const totalSlots = await prisma.slotDisponibilita.count({ where: { deletedAt: null } });
    const publicSlots = await prisma.slotDisponibilita.count({ where: { deletedAt: null, visibilePubblico: true } });
    const bookableSlots = await prisma.slotDisponibilita.count({ where: { deletedAt: null, prenotabileOnline: true } });
    console.log('\n=== Slots ===');
    console.log(`  Total: ${totalSlots}, Public: ${publicSlots}, Bookable: ${bookableSlots}`);

    if (totalSlots > 0) {
        const sampleSlots = await prisma.slotDisponibilita.findMany({
            where: { deletedAt: null },
            select: { id: true, data: true, oraInizio: true, oraFine: true, stato: true, visibilePubblico: true, prenotabileOnline: true, tenantId: true, medicoId: true },
            take: 5
        });
        sampleSlots.forEach(s => console.log(`  - ${s.data} ${s.oraInizio}-${s.oraFine} stato=${s.stato} public=${s.visibilePubblico} bookable=${s.prenotabileOnline} tenant=${s.tenantId}`));
    }

    // 5. Check courses 
    const courses = await prisma.course.findMany({
        where: { deletedAt: null },
        select: { id: true, title: true, code: true, isPublic: true, status: true, tenantId: true, slug: true, pricePerPerson: true, category: true }
    });
    console.log('\n=== Courses:', courses.length, '===');
    courses.forEach(c => console.log(`  - "${c.title}" (${c.code}) public=${c.isPublic} status=${c.status} slug=${c.slug} price=${c.pricePerPerson} tenant=${c.tenantId}`));

    // 6. Check ambulatori
    const ambulatori = await prisma.ambulatorio.findMany({
        where: { deletedAt: null },
        select: { id: true, nome: true, tenantId: true }
    });
    console.log('\n=== Ambulatori:', ambulatori.length, '===');
    ambulatori.forEach(a => console.log(`  - ${a.nome} (${a.id}) tenant=${a.tenantId}`));

    // 7. Check MedicoAbilitato
    const abilitati = await prisma.medicoAbilitato.findMany({
        where: { deletedAt: null },
        include: {
            medico: { select: { firstName: true, lastName: true } },
            prestazione: { select: { nome: true } }
        }
    });
    console.log('\n=== MedicoAbilitato:', abilitati.length, '===');
    abilitati.forEach(a => console.log(`  - ${a.medico.firstName} ${a.medico.lastName} → ${a.prestazione.nome} attivo=${a.attivo}`));

    // 8. Check PublicBookingRequest
    const bookings = await prisma.publicBookingRequest.findMany({ where: { deletedAt: null } });
    console.log('\n=== PublicBookingRequests:', bookings.length, '===');

    // 9. Check schedules 
    const schedules = await prisma.courseSchedule.findMany({
        where: { deletedAt: null },
        select: { id: true, courseId: true, isPublic: true, startDate: true, endDate: true, tenantId: true, status: true, maxParticipants: true },
        include: { course: { select: { title: true } } }
    });
    console.log('\n=== CourseSchedules:', schedules.length, '===');
    schedules.forEach(s => console.log(`  - "${s.course?.title}" ${s.startDate} public=${s.isPublic} status=${s.status}`));

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
