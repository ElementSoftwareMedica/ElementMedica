import prisma from '../config/prisma-optimization.js';

const tenantId = '6a8e68d7-1958-44d8-af50-2121f638db5c';

async function main() {
    const ambulatori = await prisma.ambulatorio.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, nome: true, codice: true }
    });
    console.log('=== AMBULATORI ===');
    ambulatori.forEach(a => console.log(`  ${a.id} | ${a.nome} (${a.codice})`));

    const slots = await prisma.slotDisponibilita.findMany({
        where: { tenantId, deletedAt: null, visibilePubblico: true, prenotabileOnline: true, disponibile: true, stato: 'LIBERO', data: { gte: new Date() } },
        select: { id: true, ambulatorioId: true, medicoId: true, data: true, oraInizio: true, oraFine: true, durataSlotMinuti: true },
        take: 10,
        orderBy: { data: 'asc' }
    });
    console.log('\n=== AVAILABLE SLOTS ===');
    slots.forEach(s => console.log(`  ${s.id} | ${s.data.toISOString().split('T')[0]} ${s.oraInizio}-${s.oraFine} | durata: ${s.durataSlotMinuti || 'null'} | amb: ${s.ambulatorioId}`));

    const listini = await prisma.listinoPrezzo.findMany({
        where: { tenantId, deletedAt: null, attivo: true },
        select: { id: true, prestazioneId: true, medicoId: true, prezzo: true, nome: true },
        take: 10
    });
    console.log('\n=== LISTINI PREZZO ===');
    listini.forEach(l => console.log(`  ${l.id} | prest: ${l.prestazioneId} | med: ${l.medicoId} | €${l.prezzo} | ${l.nome}`));

    // Check existing appuntamenti
    const appts = await prisma.appuntamento.count({ where: { tenantId, deletedAt: null } });
    console.log(`\n=== APPUNTAMENTI: ${appts} ===`);

    // Check existing public booking requests
    const pbr = await prisma.publicBookingRequest.count({ where: { tenantId, deletedAt: null } });
    console.log(`=== PUBLIC BOOKING REQUESTS: ${pbr} ===`);

    // Check bundles
    const bundles = await prisma.offertaBundle.findMany({
        where: { tenantId, deletedAt: null, attivo: true },
        select: { id: true, nome: true, prezzoBundle: true, scontoPercentuale: true },
        take: 5
    });
    console.log('\n=== BUNDLES ===');
    bundles.forEach(b => console.log(`  ${b.id} | ${b.nome} | €${b.prezzoBundle} | sconto: ${b.scontoPercentuale}%`));

    // Check if CERTMEDSPORT prestazione has price
    const cert = await prisma.prestazione.findFirst({
        where: { codice: 'CERTMEDSPORT', tenantId },
        select: { id: true, nome: true, prezzoBase: true, durataPrevista: true }
    });
    console.log('\n=== CERTMEDSPORT ===');
    console.log(`  ${cert?.id} | ${cert?.nome} | €${cert?.prezzoBase} | ${cert?.durataPrevista}min`);

    // Check person with a known CF
    const person = await prisma.person.findFirst({
        where: { taxCode: 'BNCMRC90A15H501Z' },
        select: { id: true, firstName: true, lastName: true, taxCode: true, birthDate: true, birthPlace: true }
    });
    console.log('\n=== PERSON BY CF (BNCMRC90A15H501Z) ===');
    console.log(person ? `  Found: ${person.id} ${person.firstName} ${person.lastName}` : '  Not found');

    await prisma.$disconnect();
}

main().catch(console.error);
