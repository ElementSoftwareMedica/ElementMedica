/**
 * Script per ampliare la pagina visite-specialistiche di Element Medica
 * Aggiunge sezioni: team, whyChooseUs, checkupPackages, testimonials, emergency
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const additionalContent = {
    // Team Medico
    team: {
        sectionTitle: "Il Nostro Team di Specialisti",
        sectionSubtitle: "Professionisti qualificati al servizio della tua salute",
        doctors: [
            {
                name: "Dott. Marco Rossi",
                specialty: "Cardiologia",
                image: "/images/doctors/cardiologo.jpg",
                description: "Specialista in cardiologia con oltre 20 anni di esperienza. Esperto in ecocardiografia e cardiologia interventistica.",
                education: "Università degli Studi di Milano",
                languages: ["Italiano", "Inglese"]
            },
            {
                name: "Dott.ssa Laura Bianchi",
                specialty: "Neurologia",
                image: "/images/doctors/neurologa.jpg",
                description: "Neurologa esperta in cefalee, disturbi del sonno e malattie neurodegenerative.",
                education: "Università di Padova",
                languages: ["Italiano", "Inglese", "Francese"]
            },
            {
                name: "Dott. Giuseppe Verdi",
                specialty: "Ortopedia",
                image: "/images/doctors/ortopedico.jpg",
                description: "Chirurgo ortopedico specializzato in traumatologia sportiva e chirurgia artroscopica.",
                education: "Università di Bologna",
                languages: ["Italiano", "Inglese"]
            },
            {
                name: "Dott.ssa Anna Neri",
                specialty: "Dermatologia",
                image: "/images/doctors/dermatologa.jpg",
                description: "Dermatologa esperta in dermatoscopia, patologie cutanee e medicina estetica.",
                education: "Università di Firenze",
                languages: ["Italiano", "Spagnolo"]
            },
            {
                name: "Dott. Paolo Ferrari",
                specialty: "Gastroenterologia",
                image: "/images/doctors/gastroenterologo.jpg",
                description: "Gastroenterologo con esperienza in endoscopia digestiva e patologie infiammatorie.",
                education: "Università di Roma La Sapienza",
                languages: ["Italiano", "Inglese"]
            },
            {
                name: "Dott.ssa Giulia Colombo",
                specialty: "Oculistica",
                image: "/images/doctors/oculista.jpg",
                description: "Oculista specializzata in chirurgia refrattiva, cataratta e patologie retiniche.",
                education: "Università di Torino",
                languages: ["Italiano", "Inglese", "Tedesco"]
            }
        ]
    },

    // Perché Sceglierci
    whyChooseUs: {
        sectionTitle: "Perché Scegliere Element Medica",
        sectionSubtitle: "La tua salute merita il meglio",
        items: [
            {
                icon: "Clock",
                title: "Tempi Rapidi",
                description: "Appuntamenti disponibili in 24-48 ore. Niente lunghe attese.",
                highlight: "24-48h"
            },
            {
                icon: "Award",
                title: "Specialisti Qualificati",
                description: "Team di medici con esperienza pluriennale e aggiornamento continuo.",
                highlight: "50+ Medici"
            },
            {
                icon: "Cpu",
                title: "Tecnologie Avanzate",
                description: "Strumentazione diagnostica di ultima generazione per risultati precisi.",
                highlight: "100% Digitale"
            },
            {
                icon: "Heart",
                title: "Approccio Umano",
                description: "Ascolto, empatia e cura personalizzata per ogni paziente.",
                highlight: "25.000+ Pazienti"
            },
            {
                icon: "CreditCard",
                title: "Tariffe Trasparenti",
                description: "Prezzi chiari senza sorprese. Convenzioni con assicurazioni.",
                highlight: "0 Costi Nascosti"
            },
            {
                icon: "MapPin",
                title: "Posizione Centrale",
                description: "Sede facilmente raggiungibile con parcheggio convenzionato.",
                highlight: "Metro + Bus"
            }
        ]
    },

    // Pacchetti Check-up
    checkupPackages: {
        sectionTitle: "Pacchetti Check-up",
        sectionSubtitle: "Prevenzione completa a prezzi vantaggiosi",
        packages: [
            {
                name: "Check-up Base",
                description: "Controllo generale dello stato di salute",
                price: "€149",
                originalPrice: "€220",
                color: "teal",
                popular: false,
                includes: [
                    "Visita medica generale",
                    "Esami del sangue completi",
                    "Esame urine",
                    "ECG basale",
                    "Consulto finale"
                ]
            },
            {
                name: "Check-up Premium",
                description: "Valutazione approfondita con diagnostica",
                price: "€299",
                originalPrice: "€450",
                color: "blue",
                popular: true,
                includes: [
                    "Tutto del Check-up Base",
                    "Ecografia addome completo",
                    "Visita cardiologica",
                    "Ecocardiogramma",
                    "TSH e markers tumorali",
                    "Referto digitale completo"
                ]
            },
            {
                name: "Check-up Executive",
                description: "Il più completo per la tua tranquillità",
                price: "€499",
                originalPrice: "€750",
                color: "purple",
                popular: false,
                includes: [
                    "Tutto del Check-up Premium",
                    "RM cerebrale",
                    "TAC torace low-dose",
                    "Visita dermatologica + mappatura nei",
                    "Visita oculistica completa",
                    "Consulto nutrizionale",
                    "Follow-up telefonico"
                ]
            },
            {
                name: "Check-up Donna",
                description: "Prevenzione al femminile",
                price: "€249",
                originalPrice: "€380",
                color: "pink",
                popular: false,
                includes: [
                    "Visita ginecologica",
                    "Pap test",
                    "Ecografia mammaria",
                    "Ecografia pelvica transvaginale",
                    "Esami ormonali",
                    "Densitometria ossea (MOC)"
                ]
            }
        ]
    },

    // Testimonials
    testimonials: [
        {
            name: "Maria G.",
            rating: 5,
            text: "Ho trovato professionalità e gentilezza. La visita cardiologica è stata accurata e il dottore molto disponibile a spiegare tutto. Tempi di attesa ridottissimi.",
            date: "Novembre 2024",
            specialty: "Cardiologia"
        },
        {
            name: "Luca P.",
            rating: 5,
            text: "Ottima esperienza per un check-up completo. Struttura moderna, personale cortese e risultati disponibili in pochi giorni. Consigliatissimo!",
            date: "Ottobre 2024",
            specialty: "Check-up Premium"
        },
        {
            name: "Francesca R.",
            rating: 5,
            text: "La dermatologa è stata eccezionale. Mi ha seguito con attenzione e ha risolto un problema che avevo da anni. Tornerò sicuramente.",
            date: "Novembre 2024",
            specialty: "Dermatologia"
        },
        {
            name: "Antonio M.",
            rating: 5,
            text: "Dopo anni di dolori alla schiena, finalmente una diagnosi chiara. L'ortopedico è stato molto competente e il percorso di cura sta dando risultati.",
            date: "Settembre 2024",
            specialty: "Ortopedia"
        }
    ],

    // Emergency Contact
    emergency: {
        title: "Prenota la Tua Visita",
        subtitle: "Il nostro team è pronto ad accoglierti",
        phone: "02 1234567",
        email: "visite@elementmedica.it",
        hours: "Lun-Ven 8:00-20:00 | Sab 8:00-13:00",
        ctaText: "Prenota Online",
        ctaHref: "/prenota",
        features: [
            "Prenotazione in 24h",
            "Referti digitali",
            "Convenzioni attive"
        ]
    },

    // Improved Hero
    hero: {
        title: "Visite Specialistiche",
        subtitle: "Oltre 30 Specialità Mediche",
        description: "Un team di medici esperti a tua disposizione. Prenota la tua visita specialistica con tempi rapidi, tecnologie avanzate e un approccio umano alla cura.",
        backgroundVariant: "gradient",
        backgroundImage: "/images/hero-visite.jpg",
        primaryButton: {
            text: "Prenota Visita",
            href: "/prenota",
            icon: "Calendar"
        },
        secondaryButton: {
            text: "Le Nostre Specialità",
            href: "#specialita",
            icon: "ArrowRight"
        },
        stats: [
            { icon: "Stethoscope", number: "30+", label: "Specialità" },
            { icon: "Users", number: "50+", label: "Medici" },
            { icon: "Clock", number: "24h", label: "Prenotazione" },
            { icon: "Award", number: "98%", label: "Soddisfatti" }
        ],
        trustBadges: true
    },

    // Updated Features
    features: {
        sectionTitle: "I Vantaggi delle Nostre Visite",
        items: [
            {
                icon: "Calendar",
                title: "Prenotazione Facile",
                description: "Online, telefonica o di persona. Conferma immediata via SMS ed email."
            },
            {
                icon: "Clock",
                title: "Zero Attese",
                description: "Sistema di appuntamenti ottimizzato. Rispettiamo i tuoi tempi."
            },
            {
                icon: "FileText",
                title: "Referti Digitali",
                description: "Accesso online ai tuoi referti entro 24-48 ore dalla visita."
            },
            {
                icon: "Shield",
                title: "Privacy Garantita",
                description: "I tuoi dati sono protetti secondo le normative GDPR."
            },
            {
                icon: "CreditCard",
                title: "Pagamenti Flessibili",
                description: "Carta, contanti, bonifico. Convenzioni con assicurazioni e fondi."
            },
            {
                icon: "MessageSquare",
                title: "Follow-up Dedicato",
                description: "Assistenza post-visita e supporto per dubbi o chiarimenti."
            }
        ]
    }
};

async function updateVisiteSpecialistichePage() {
    console.log('🏥 Updating Visite Specialistiche Page...\n');

    try {
        const page = await prisma.cMSPage.findFirst({
            where: { slug: 'medica-visite-specialistiche' }
        });

        if (!page) {
            console.log('❌ Page not found');
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

        console.log('✅ Visite Specialistiche page updated with:');
        console.log('   - team (6 medici specialisti)');
        console.log('   - whyChooseUs (6 vantaggi)');
        console.log('   - checkupPackages (4 pacchetti)');
        console.log('   - testimonials (4 recensioni)');
        console.log('   - emergency (contatto rapido)');
        console.log('   - improved hero (con stats e badges)');
        console.log('   - improved features (6 vantaggi)');
        console.log('\n🎉 Done!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

updateVisiteSpecialistichePage();
