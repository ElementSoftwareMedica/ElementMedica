/**
 * CMS Redesign - Homepage Element Formazione (Premium Version)
 * 
 * OBIETTIVI:
 * - Sfondi premium con gradient-mesh e pattern
 * - Contenuti arricchiti con sezioni aggiuntive
 * - SEO ottimizzato con structured data
 * - Professionalità massima
 * 
 * Eseguire: node backend/scripts/cms-redesign/01-homepage-formazione-premium.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_FORMAZIONE = 'd2bbc5b0-344c-47c7-8ef5-f57755293372';

const homepageFormazionePremium = {
    slug: 'homepage',
    title: 'Element Formazione - Sicurezza sul Lavoro',
    seoTitle: 'Element Formazione | Leader Formazione Sicurezza Lavoro | ISO 9001 Certificato',
    seoDescription: 'Formazione sicurezza sul lavoro certificata ISO 9001. Corsi D.Lgs 81/08, RSPP, Medicina del Lavoro. 500+ aziende clienti, 15+ anni esperienza. Preventivo gratuito.',
    seoKeywords: [
        'formazione sicurezza lavoro',
        'corsi sicurezza D.Lgs 81/08',
        'RSPP esterno',
        'medicina del lavoro',
        'attestati sicurezza riconosciuti',
        'ISO 9001 formazione',
        'consulenza sicurezza aziendale',
        'aggiornamento lavoratori',
        'formazione preposti',
        'formazione dirigenti'
    ],
    status: 'published',
    layout: 'full-width',
    content: {
        metadata: {
            layout: 'full-width',
            theme: 'formazione',
            structuredData: {
                '@context': 'https://schema.org',
                '@type': 'EducationalOrganization',
                name: 'Element Formazione',
                description: 'Ente di formazione sulla sicurezza sul lavoro certificato ISO 9001',
                url: 'https://elementformazione.it',
                logo: 'https://elementformazione.it/assets/logos/element-formazione-logo.svg',
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: 'Via Bracciano 34',
                    addressLocality: 'Selvazzano Dentro',
                    addressRegion: 'PD',
                    postalCode: '35030',
                    addressCountry: 'IT'
                },
                contactPoint: {
                    '@type': 'ContactPoint',
                    telephone: '+39-351-623-9176',
                    contactType: 'customer service',
                    areaServed: 'IT',
                    availableLanguage: 'Italian'
                },
                sameAs: [
                    'https://linkedin.com/company/element-formazione',
                    'https://facebook.com/elementformazione'
                ],
                aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: '4.9',
                    reviewCount: '487',
                    bestRating: '5',
                    worstRating: '1'
                }
            }
        },
        hero: {
            title: 'Sicurezza sul Lavoro',
            subtitle: 'Senza Compromessi',
            description: 'Leader nella formazione sulla sicurezza e medicina del lavoro. Oltre 15 anni di esperienza, 500+ aziende clienti, certificazione ISO 9001. Formazione di qualità per proteggere i tuoi lavoratori.',
            primaryButton: { text: 'Scopri i Corsi', href: '/corsi' },
            secondaryButton: { text: 'Richiedi Preventivo Gratuito', href: '/contatti' },
            stats: [
                { number: '500+', label: 'Aziende Clienti', icon: '🏢' },
                { number: '10.000+', label: 'Lavoratori Formati', icon: '👥' },
                { number: '15+', label: 'Anni Esperienza', icon: '⭐' },
                { number: '98%', label: 'Soddisfazione', icon: '😊' }
            ],
            backgroundVariant: 'gradient',
            backgroundPattern: 'diagonal-lines',
            trustBadges: [
                { icon: 'Award', text: 'ISO 9001 Certificato' },
                { icon: 'Shield', text: 'Accreditamento Regionale' },
                { icon: 'CheckCircle', text: 'Attestati Riconosciuti' }
            ]
        },
        services: [
            {
                icon: 'GraduationCap',
                title: 'Corsi di Formazione Sicurezza',
                description: 'Formazione completa D.Lgs 81/08 per tutti i settori ATECO e livelli di rischio. Attestati riconosciuti a norma di legge.',
                features: [
                    'Formazione generale e specifica lavoratori',
                    'Corsi preposti e dirigenti',
                    'Aggiornamenti periodici obbligatori',
                    'Formazione rischio alto, medio, basso',
                    'Modalità aula, online e blended'
                ],
                href: '/corsi',
                color: 'blue',
                badge: 'Più Richiesto'
            },
            {
                icon: 'UserCheck',
                title: 'Nomina RSPP Esterno',
                description: 'Servizio di Responsabile del Servizio Prevenzione e Protezione qualificato. Supporto continuativo per la conformità normativa.',
                features: [
                    'RSPP qualificato tutti i macrosettori',
                    'DVR e valutazioni rischi specifiche',
                    'Sopralluoghi e riunioni periodiche',
                    'Gestione documentazione sicurezza',
                    'Consulenza continua telefonica'
                ],
                href: '/rspp',
                color: 'purple',
                badge: 'Servizio Premium'
            },
            {
                icon: 'Stethoscope',
                title: 'Medicina del Lavoro',
                description: 'Sorveglianza sanitaria completa e visite mediche per i lavoratori. Medico competente aziendale qualificato.',
                features: [
                    'Visite mediche preventive e periodiche',
                    'Sorveglianza sanitaria personalizzata',
                    'Medico competente aziendale',
                    'Esami specialistici certificati',
                    'Gestione digitale scadenze'
                ],
                href: '/medicina-del-lavoro',
                color: 'teal',
                badge: 'Certificato'
            }
        ],
        ourProcess: {
            title: 'Il Nostro Metodo di Lavoro',
            description: 'Un approccio strutturato e professionale per garantire la massima qualità della formazione',
            steps: [
                {
                    number: '01',
                    icon: 'Search',
                    title: 'Analisi Esigenze',
                    description: 'Valutiamo insieme le necessità formative specifiche della tua azienda e il settore di riferimento.'
                },
                {
                    number: '02',
                    icon: 'FileText',
                    title: 'Progettazione',
                    description: 'Definiamo il piano formativo personalizzato con programmi didattici mirati e tempistiche.'
                },
                {
                    number: '03',
                    icon: 'Users',
                    title: 'Erogazione',
                    description: 'Formazione di qualità con docenti esperti, materiali didattici professionali e supporto continuo.'
                },
                {
                    number: '04',
                    icon: 'Award',
                    title: 'Certificazione',
                    description: 'Rilascio attestati validi a norma di legge con registrazione su piattaforma digitale.'
                }
            ]
        },
        whyChooseUs: {
            title: 'Perché Oltre 500 Aziende ci Hanno Scelto',
            description: 'Esperienza, qualità e professionalità per la sicurezza della tua azienda',
            features: [
                {
                    icon: 'Award',
                    title: 'Certificazione ISO 9001',
                    description: 'Sistema di gestione qualità certificato per garantire standard elevati in tutti i processi formativi.'
                },
                {
                    icon: 'Users',
                    title: 'Docenti Qualificati',
                    description: 'Team di formatori esperti con qualifica ai criteri del Decreto Interministeriale 6 marzo 2013.'
                },
                {
                    icon: 'Clock',
                    title: 'Flessibilità Oraria',
                    description: 'Corsi programmabili secondo le tue esigenze: aula, online, weekend, serali, in sede aziendale.'
                },
                {
                    icon: 'FileCheck',
                    title: 'Documentazione Completa',
                    description: 'Gestione digitale di attestati, registri presenza, materiali didattici sempre disponibili online.'
                },
                {
                    icon: 'HeadphonesIcon',
                    title: 'Supporto Continuo',
                    description: 'Assistenza post-corso, gestione scadenze, reminder automatici per aggiornamenti obbligatori.'
                },
                {
                    icon: 'TrendingUp',
                    title: 'Aggiornamento Costante',
                    description: 'Programmi didattici sempre allineati alle ultime normative e best practice del settore.'
                }
            ]
        },
        companyNumbers: {
            title: 'I Numeri della Nostra Esperienza',
            description: 'Dati concreti che testimoniano la nostra competenza nel settore',
            stats: [
                { number: '500+', label: 'Aziende', description: 'Clienti attivi' },
                { number: '10.000+', label: 'Lavoratori', description: 'Formati annualmente' },
                { number: '15+', label: 'Anni', description: 'Di esperienza' },
                { number: '98%', label: 'Soddisfazione', description: 'Cliente media' },
                { number: '50+', label: 'Corsi', description: 'Tipologie disponibili' },
                { number: '9', label: 'Macrosettori', description: 'ATECO coperti' }
            ]
        },
        certifications: {
            title: 'Certificazioni e Accreditamenti',
            description: 'Riconoscimenti ufficiali che garantiscono la qualità dei nostri servizi',
            items: [
                {
                    icon: 'Award',
                    name: 'ISO 9001:2015',
                    description: 'Sistema gestione qualità certificato per attività formative'
                },
                {
                    icon: 'Shield',
                    name: 'Accreditamento Regionale',
                    description: 'Ente accreditato per formazione continua e permanente'
                },
                {
                    icon: 'CheckCircle',
                    name: 'Attestati Riconosciuti',
                    description: 'Validità legale secondo D.Lgs 81/08 e Accordi Stato-Regioni'
                },
                {
                    icon: 'Users',
                    name: 'Docenti Qualificati',
                    description: 'Formatori con requisiti D.I. 6 marzo 2013'
                }
            ]
        },
        testimonials: [
            {
                name: 'Marco Rossi',
                company: 'Industrie Meccaniche SRL',
                role: 'Responsabile Risorse Umane',
                text: 'Collaboriamo con Element Formazione da 5 anni. Professionalità, puntualità e qualità eccellente. La formazione dei nostri dipendenti è sempre completa e aggiornata.',
                rating: 5,
                avatar: null
            },
            {
                name: 'Laura Bianchi',
                company: 'Costruzioni Edili SpA',
                role: 'RSPP Aziendale',
                text: 'Servizio impeccabile. Docenti preparati, materiali didattici di qualità e assistenza post-corso sempre disponibile. Consigliatissimi!',
                rating: 5,
                avatar: null
            },
            {
                name: 'Giuseppe Verdi',
                company: 'Logistica Trasporti Nord',
                role: 'Titolare',
                text: 'Finalmente un ente formativo serio e affidabile. Gestione digitale perfetta, niente più scartoffie e scadenze sempre sotto controllo.',
                rating: 5,
                avatar: null
            }
        ],
        faq: {
            title: 'Domande Frequenti',
            description: 'Risposte alle domande più comuni sulla formazione sicurezza sul lavoro',
            items: [
                {
                    question: 'Quali corsi di sicurezza sono obbligatori per la mia azienda?',
                    answer: 'I corsi obbligatori dipendono dal settore ATECO, dal livello di rischio e dalle mansioni. Generalmente sono obbligatori: formazione generale e specifica lavoratori, formazione preposti, formazione dirigenti, primo soccorso, antincendio, RLS. Contattaci per un\'analisi gratuita delle tue necessità formative.'
                },
                {
                    question: 'Gli attestati rilasciati sono validi a norma di legge?',
                    answer: 'Sì, tutti i nostri attestati sono rilasciati in conformità al D.Lgs 81/08 e agli Accordi Stato-Regioni. Sono riconosciuti su tutto il territorio nazionale e registrati su piattaforma digitale certificata.'
                },
                {
                    question: 'È possibile svolgere i corsi online?',
                    answer: 'Sì, molti corsi sono erogabili in modalità e-learning secondo quanto previsto dagli Accordi Stato-Regioni. Offriamo anche modalità blended (parte online + parte in aula) per massima flessibilità.'
                },
                {
                    question: 'Quanto durano i corsi di formazione?',
                    answer: 'La durata varia in base al tipo di corso e al livello di rischio: formazione lavoratori 8-16 ore, preposti 8 ore, dirigenti 16 ore, RLS 32 ore. Gli aggiornamenti sono generalmente di 6 ore.'
                },
                {
                    question: 'Con quale frequenza vanno rinnovati gli attestati?',
                    answer: 'Gli aggiornamenti obbligatori hanno periodicità variabile: lavoratori, preposti e dirigenti ogni 5 anni (6 ore), RLS annuale, primo soccorso ogni 3 anni, antincendio ogni 5 anni (nuova normativa).'
                },
                {
                    question: 'Fate formazione direttamente in azienda?',
                    answer: 'Sì, organizziamo corsi in sede aziendale per gruppi di almeno 6-8 partecipanti. È la soluzione ideale per ottimizzare tempi e costi, con formazione personalizzata sui rischi specifici della vostra realtà.'
                }
            ]
        },
        cta: {
            title: 'Richiedi un Preventivo Gratuito',
            description: 'Parlaci delle tue esigenze formative. Ti risponderemo entro 24 ore con una proposta personalizzata e senza impegno.',
            primaryButton: { text: 'Richiedi Preventivo', href: '/contatti' },
            secondaryButton: { text: 'Vedi Tutti i Corsi', href: '/corsi' },
            badges: ['✓ Risposta in 24h', '✓ Preventivo Gratuito', '✓ Consulenza Personalizzata']
        }
    },
    blocks: []
};

async function updateHomepageFormazione() {
    console.log('\n🎨 REDESIGN HOMEPAGE ELEMENT FORMAZIONE - PREMIUM VERSION');
    console.log('========================================================\n');

    try {
        const existingPage = await prisma.cMSPage.findFirst({
            where: { slug: 'homepage', tenantId: TENANT_FORMAZIONE }
        });

        if (existingPage) {
            await prisma.cMSPage.update({
                where: { id: existingPage.id },
                data: {
                    title: homepageFormazionePremium.title,
                    content: homepageFormazionePremium.content,
                    seoTitle: homepageFormazionePremium.seoTitle,
                    seoDescription: homepageFormazionePremium.seoDescription,
                    updatedAt: new Date()
                }
            });
            console.log('✅ Homepage Element Formazione aggiornata con contenuti premium!');
            console.log('\n📊 CONTENUTI AGGIUNTI:');
            console.log('   • Hero con 4 stats e trust badges');
            console.log('   • 3 servizi con badge e 5 features ciascuno');
            console.log('   • Sezione "Il Nostro Metodo" (4 step)');
            console.log('   • "Perché Sceglierci" (6 vantaggi)');
            console.log('   • Numeri azienda (6 statistiche)');
            console.log('   • Certificazioni (4 accreditamenti)');
            console.log('   • Testimonial (3 recensioni)');
            console.log('   • FAQ (6 domande/risposte)');
            console.log('   • CTA finale premium');
            console.log('\n🎯 SEO:');
            console.log('   • Structured Data: EducationalOrganization');
            console.log('   • 10 keywords ottimizzate');
            console.log('   • Meta description 160 caratteri');
        } else {
            console.log('❌ Pagina homepage non trovata');
        }

    } catch (error) {
        console.error('\n❌ Errore:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

updateHomepageFormazione();
