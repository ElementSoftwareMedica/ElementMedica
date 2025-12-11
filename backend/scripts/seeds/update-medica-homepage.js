/**
 * Script per ampliare la homepage di Element Medica
 * Aggiunge nuove sezioni: process, certifications, faq, emergency
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const additionalContent = {
    // Process Section - Come Funziona il nostro servizio
    process: {
        sectionTitle: "Come Funziona il Nostro Servizio",
        steps: [
            {
                icon: "Phone",
                title: "Contattaci",
                description: "Chiamaci o compila il form per un primo consulto gratuito",
                number: "1"
            },
            {
                icon: "Calendar",
                title: "Prenota",
                description: "Scegli data, ora e specialista per la tua visita",
                number: "2"
            },
            {
                icon: "Stethoscope",
                title: "Visita",
                description: "Effettua la visita con i nostri medici specialisti",
                number: "3"
            },
            {
                icon: "FileText",
                title: "Referto",
                description: "Ricevi il referto digitale entro 24-48 ore",
                number: "4"
            }
        ]
    },

    // Certifications Section
    certifications: {
        sectionTitle: "Le Nostre Certificazioni",
        sectionSubtitle: "Qualità e affidabilità garantite",
        items: [
            {
                icon: "Award",
                name: "ISO 9001:2015",
                description: "Sistema di Gestione Qualità certificato",
                color: "blue"
            },
            {
                icon: "Shield",
                name: "Accreditamento Regionale",
                description: "Centro accreditato per tutte le attività sanitarie",
                color: "green"
            },
            {
                icon: "FileCheck",
                name: "Autorizzazione ASL",
                description: "Autorizzazione all'esercizio per medicina del lavoro",
                color: "purple"
            },
            {
                icon: "Stethoscope",
                name: "SIML",
                description: "Membri della Società Italiana Medicina del Lavoro",
                color: "teal"
            }
        ]
    },

    // FAQ Section
    faq: {
        sectionTitle: "Domande Frequenti",
        items: [
            {
                question: "Quali servizi offre Element Medica?",
                answer: "Offriamo visite specialistiche in oltre 20 discipline, diagnostica per immagini (ecografie, radiografie, RM, TAC), medicina del lavoro completa e laboratorio analisi. Tutti i servizi sono erogati da professionisti qualificati con tecnologie all'avanguardia."
            },
            {
                question: "Come posso prenotare una visita?",
                answer: "Puoi prenotare telefonicamente, via email, attraverso il nostro sito web o di persona presso la nostra segreteria. Offriamo anche prenotazioni online 24/7 per la tua comodità."
            },
            {
                question: "Quali sono i tempi di attesa?",
                answer: "Grazie alla nostra organizzazione efficiente, i tempi di attesa sono ridotti: per le visite specialistiche in media 3-5 giorni, per la diagnostica 1-3 giorni. Urgenze cliniche valutate prioritariamente."
            },
            {
                question: "Accettate convenzioni?",
                answer: "Sì, siamo convenzionati con le principali assicurazioni sanitarie e fondi integrativi. Contattaci per verificare la tua copertura."
            },
            {
                question: "Quanto tempo per ricevere i referti?",
                answer: "I referti delle visite sono generalmente disponibili subito. Per esami diagnostici e di laboratorio, i referti sono pronti entro 24-48 ore e consultabili online."
            },
            {
                question: "È possibile effettuare visite a domicilio?",
                answer: "Sì, per pazienti con difficoltà di mobilità o esigenze particolari, offriamo un servizio di visite domiciliari per alcune specialità. Contattaci per informazioni."
            }
        ]
    },

    // Emergency Contact
    emergency: {
        title: "Contatto Rapido",
        subtitle: "Siamo qui per aiutarti",
        phone: "02 1234567",
        email: "info@elementmedica.it",
        hours: "Lun-Ven 8:00-20:00 | Sab 8:00-13:00",
        ctaText: "Prenota Ora",
        ctaHref: "/prenota"
    },

    // Specialties Overview for homepage
    specialtiesOverview: {
        sectionTitle: "Le Nostre Specialità",
        sectionSubtitle: "Un team di esperti per ogni tua esigenza",
        items: [
            { icon: "Heart", name: "Cardiologia", color: "red" },
            { icon: "Brain", name: "Neurologia", color: "purple" },
            { icon: "Eye", name: "Oculistica", color: "blue" },
            { icon: "Stethoscope", name: "Medicina Interna", color: "green" },
            { icon: "Activity", name: "Ortopedia", color: "orange" },
            { icon: "Baby", name: "Pediatria", color: "pink" },
            { icon: "Scan", name: "Dermatologia", color: "teal" },
            { icon: "TestTube2", name: "Laboratorio", color: "indigo" }
        ],
        ctaText: "Tutte le Specialità",
        ctaHref: "/visite-specialistiche"
    }
};

async function updateMedicaHomepage() {
    console.log('🏥 Updating Element Medica Homepage...\n');

    try {
        const page = await prisma.cMSPage.findFirst({
            where: { slug: 'medica-homepage' }
        });

        if (!page) {
            console.log('❌ Homepage not found');
            return;
        }

        // Merge existing content with new content
        const existingContent = page.content || {};
        const updatedContent = {
            ...existingContent,
            ...additionalContent
        };

        await prisma.cMSPage.update({
            where: { id: page.id },
            data: {
                content: updatedContent,
                updatedAt: new Date()
            }
        });

        console.log('✅ Homepage updated with new sections:');
        console.log('   - process (Come Funziona)');
        console.log('   - certifications (Certificazioni)');
        console.log('   - faq (Domande Frequenti)');
        console.log('   - emergency (Contatto Rapido)');
        console.log('   - specialtiesOverview (Specialità Overview)');
        console.log('\n🎉 Done!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

updateMedicaHomepage();
