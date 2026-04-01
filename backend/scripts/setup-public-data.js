/**
 * Setup Public Frontend Data
 * 
 * Configura tutti i dati necessari per il funzionamento del frontend pubblico:
 * 1. Brand-tenant mapping nelle impostazioni tenant
 * 2. Slot disponibilità pubblici e prenotabili online
 * 3. Corsi pubblici con slug SEO-friendly
 * 4. CourseSchedule pubblici
 * 5. Prestazione "Certificato Medico Sportivo Non Agonistico" abilitata
 */
import prisma from '../config/prisma-optimization.js';

async function main() {
    console.log('🔧 Setup Public Frontend Data\n');

    // ====================================
    // 1. Get tenant IDs
    // ====================================
    const tenants = await prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, slug: true, settings: true }
    });

    const sicurezzaTenant = tenants.find(t => t.slug === 'element-sicurezza');
    const medicaTenant = tenants.find(t => t.slug === 'element-medica');

    if (!sicurezzaTenant || !medicaTenant) {
        console.error('❌ Tenants non trovati!');
        process.exit(1);
    }

    console.log(`Element Sicurezza: ${sicurezzaTenant.id}`);
    console.log(`Element srl (Medica): ${medicaTenant.id}`);

    // ====================================
    // 2. Set publicBrandTenantMapping
    // ====================================
    const mapping = {
        'element-sicurezza': sicurezzaTenant.id,
        'element-medica': medicaTenant.id
    };

    // Update Element Sicurezza tenant settings
    const sicSettings = sicurezzaTenant.settings || {};
    sicSettings.publicBrandTenantMapping = mapping;
    await prisma.tenant.update({
        where: { id: sicurezzaTenant.id },
        data: { settings: sicSettings }
    });
    console.log('\n✅ publicBrandTenantMapping configurata in Element Sicurezza');

    // ====================================
    // 3. Make slots visible and bookable
    // ====================================
    // Get future slots
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureSlots = await prisma.slotDisponibilita.findMany({
        where: {
            deletedAt: null,
            stato: 'LIBERO',
            disponibile: true,
            data: { gte: today }
        },
        select: { id: true, data: true, medicoId: true, tenantId: true }
    });

    console.log(`\n📅 Slot futuri trovati: ${futureSlots.length}`);

    if (futureSlots.length > 0) {
        // Make all future slots public and bookable
        const updated = await prisma.slotDisponibilita.updateMany({
            where: {
                id: { in: futureSlots.map(s => s.id) }
            },
            data: {
                visibilePubblico: true,
                prenotabileOnline: true,
                anticipoMinimoOre: 2,
                anticipoMassimoGiorni: 60
            }
        });
        console.log(`✅ ${updated.count} slot resi pubblici e prenotabili online`);
    }

    // If no future slots, create some for testing
    if (futureSlots.length === 0) {
        console.log('⚠️ Nessuno slot futuro, creo slot di test...');

        // Get a doctor
        const doctor = await prisma.personRole.findFirst({
            where: { roleType: 'MEDICO', isActive: true, deletedAt: null },
            select: { personId: true, tenantId: true }
        });

        // Get an ambulatorio
        const amb = await prisma.ambulatorio.findFirst({
            where: { deletedAt: null },
            select: { id: true, tenantId: true }
        });

        if (doctor && amb) {
            const slots = [];
            // Create slots for next 14 days
            for (let d = 1; d <= 14; d++) {
                const date = new Date();
                date.setDate(date.getDate() + d);
                // Skip weekends
                if (date.getDay() === 0 || date.getDay() === 6) continue;

                date.setHours(0, 0, 0, 0);

                slots.push({
                    ambulatorioId: amb.id,
                    medicoId: doctor.personId,
                    data: date,
                    oraInizio: '09:00',
                    oraFine: '13:00',
                    stato: 'LIBERO',
                    disponibile: true,
                    visibilePubblico: true,
                    prenotabileOnline: true,
                    maxPrenotazioni: 4,
                    anticipoMinimoOre: 2,
                    anticipoMassimoGiorni: 60,
                    durataSlotMinuti: 30,
                    tenantId: doctor.tenantId
                });
                slots.push({
                    ambulatorioId: amb.id,
                    medicoId: doctor.personId,
                    data: date,
                    oraInizio: '14:00',
                    oraFine: '18:00',
                    stato: 'LIBERO',
                    disponibile: true,
                    visibilePubblico: true,
                    prenotabileOnline: true,
                    maxPrenotazioni: 4,
                    anticipoMinimoOre: 2,
                    anticipoMassimoGiorni: 60,
                    durataSlotMinuti: 30,
                    tenantId: doctor.tenantId
                });
            }

            const created = await prisma.slotDisponibilita.createMany({ data: slots });
            console.log(`✅ ${created.count} slot di test creati (prossimi 14 giorni lavorativi)`);
        }
    }

    // ====================================
    // 4. Make courses public with slugs
    // ====================================
    const courses = await prisma.course.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        select: { id: true, title: true, code: true, slug: true, isPublic: true, tenantId: true }
    });

    console.log(`\n📚 Corsi attivi trovati: ${courses.length}`);

    // Generate slugs and make public
    for (const course of courses) {
        const slug = course.code.toLowerCase().replace(/[^a-z0-9]/g, '-');

        try {
            await prisma.course.update({
                where: { id: course.id },
                data: {
                    isPublic: true,
                    slug: slug,
                    shortDescription: getShortDescription(course.title),
                    seoTitle: `${course.title} - Formazione Sicurezza | Element`,
                    seoDescription: `${course.title}: corso di formazione professionale conforme al D.Lgs 81/08. Docenti qualificati, attestato valido su tutto il territorio nazionale.`
                }
            });
        } catch (e) {
            // If slug unique constraint fails, append a suffix
            if (e.code === 'P2002') {
                const uniqueSlug = `${slug}-${course.code.toLowerCase()}`;
                await prisma.course.update({
                    where: { id: course.id },
                    data: {
                        isPublic: true,
                        slug: uniqueSlug,
                        shortDescription: getShortDescription(course.title),
                        seoTitle: `${course.title} - Formazione Sicurezza | Element`,
                        seoDescription: `${course.title}: corso di formazione professionale conforme al D.Lgs 81/08. Docenti qualificati, attestato valido su tutto il territorio nazionale.`
                    }
                });
            } else {
                console.error(`Errore aggiornamento corso ${course.code}:`, e.message);
            }
        }
    }
    console.log(`✅ ${courses.length} corsi resi pubblici con slug SEO`);

    // ====================================
    // 5. Make course schedules public
    // ====================================
    const schedules = await prisma.courseSchedule.findMany({
        where: { deletedAt: null },
        select: { id: true, isPublic: true }
    });

    if (schedules.length > 0) {
        const updatedSchedules = await prisma.courseSchedule.updateMany({
            where: { deletedAt: null },
            data: { isPublic: true }
        });
        console.log(`✅ ${updatedSchedules.count} programmazioni rese pubbliche`);
    } else {
        console.log('ℹ️ Nessuna programmazione corso trovata');
    }

    // ====================================
    // 6. Verify doctor-prestazione mapping for Certificato Medico Sportivo
    // ====================================
    const certSport = await prisma.prestazione.findFirst({
        where: {
            codice: 'CERTMEDSPORT',
            deletedAt: null
        },
        select: { id: true, nome: true, tenantId: true }
    });

    if (certSport) {
        // Check if a doctor is authorized for it
        const abilitazione = await prisma.medicoAbilitato.findFirst({
            where: {
                prestazioneId: certSport.id,
                attivo: true,
                deletedAt: null
            },
            include: {
                medico: { select: { firstName: true, lastName: true, id: true } }
            }
        });

        if (abilitazione) {
            console.log(`\n✅ Certificato Medico Sportivo (${certSport.id}) → Dott. ${abilitazione.medico.firstName} ${abilitazione.medico.lastName}`);
        } else {
            // Assign to first doctor
            const firstDoctor = await prisma.personRole.findFirst({
                where: { roleType: 'MEDICO', isActive: true, deletedAt: null, tenantId: certSport.tenantId }
            });
            if (firstDoctor) {
                await prisma.medicoAbilitato.create({
                    data: {
                        medicoId: firstDoctor.personId,
                        prestazioneId: certSport.id,
                        attivo: true,
                        tenantId: certSport.tenantId
                    }
                });
                console.log(`\n✅ Certificato Medico Sportivo abilitato per medico ${firstDoctor.personId}`);
            }
        }
    } else {
        console.log('\n⚠️ Prestazione "Certificato Medico Sportivo Non Agonistico" non trovata - verrà usata quella esistente');
    }

    // ====================================
    // 7. Summary
    // ====================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 RIEPILOGO');
    console.log('='.repeat(60));

    const publicSlotsCount = await prisma.slotDisponibilita.count({
        where: { visibilePubblico: true, prenotabileOnline: true, stato: 'LIBERO', deletedAt: null, data: { gte: today } }
    });
    const publicCoursesCount = await prisma.course.count({ where: { isPublic: true, deletedAt: null } });
    const publicSchedulesCount = await prisma.courseSchedule.count({ where: { isPublic: true, deletedAt: null } });

    console.log(`Slot pubblici futuri: ${publicSlotsCount}`);
    console.log(`Corsi pubblici: ${publicCoursesCount}`);
    console.log(`Programmazioni pubbliche: ${publicSchedulesCount}`);
    console.log(`Brand mapping: ${JSON.stringify(mapping)}`);
    console.log('='.repeat(60));

    await prisma.$disconnect();
}

function getShortDescription(title) {
    const descriptions = {
        'Corso Primo Soccorso': 'Formazione obbligatoria primo soccorso aziendale (D.M. 388/03). Addetti designati imparano le tecniche di primo intervento.',
        'Sicurezza Generale': 'Formazione generale sulla sicurezza per tutti i lavoratori secondo il D.Lgs 81/08.',
        'Sicurezza Formazione Dei Lavoratori': 'Formazione specifica sicurezza lavoratori in base al livello di rischio aziendale.',
        'Sicurezza Dirigenti': 'Formazione sicurezza per dirigenti aziendali secondo Accordo Stato-Regioni.',
        'Sicurezza Preposti': 'Formazione obbligatoria per preposti alla sicurezza aziendale.',
        'Corso Rls': 'Formazione per Rappresentanti dei Lavoratori per la Sicurezza (RLS).',
        'Corso Rspp E Aspp': 'Formazione per Responsabili e Addetti al Servizio di Prevenzione e Protezione.',
        'Lavori In Quota': 'Formazione per lavori in quota e utilizzo DPI anticaduta.',
        'Conduzione Carrelli Elevatori Industriali Semoventi': 'Abilitazione alla conduzione di carrelli elevatori (muletti).',
        'Piattaforme Mobili Di Lavoro Elevabili (ple)': 'Abilitazione alla conduzione di piattaforme aeree (PLE).',
        'Addetti Uso Carroponte': 'Abilitazione alla conduzione di carroponte e gru a ponte.',
    };

    for (const [key, desc] of Object.entries(descriptions)) {
        if (title.includes(key) || key.includes(title)) return desc;
    }
    return `Corso di formazione professionale: ${title}. Docenti qualificati e attestato valido.`;
}

main().catch(e => {
    console.error('❌ Errore:', e);
    process.exit(1);
});
