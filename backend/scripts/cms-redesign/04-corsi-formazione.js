/**
 * CMS Redesign - Corsi Element Formazione
 * 
 * Pagina catalogo corsi completa con:
 * - Hero sezione
 * - Categorie corsi (Lavoratori, Preposti, Dirigenti, Emergenze, Specifici)
 * - Filtri per tipologia, modalità, durata
 * - Pricing trasparente
 * - FAQ
 * - CTA
 * 
 * Eseguire: node backend/scripts/cms-redesign/04-corsi-formazione.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_FORMAZIONE = 'd2bbc5b0-344c-47c7-8ef5-f57755293372';

const corsiFormazione = {
    slug: 'corsi',
    title: 'Catalogo Corsi Sicurezza sul Lavoro',
    seoTitle: 'Corsi Sicurezza Lavoro | Formazione D.Lgs 81/08 | Attestati Riconosciuti | Element Formazione',
    seoDescription: 'Catalogo completo corsi sicurezza lavoro certificati: formazione lavoratori, preposti, dirigenti, RSPP, RLS, primo soccorso, antincendio. Attestati riconosciuti, modalità aula e online.',
    status: 'published',
    layout: 'full-width',
    content: {
        metadata: {
            layout: 'full-width',
            theme: 'formazione',
            structuredData: {
                '@context': 'https://schema.org',
                '@type': 'ItemList',
                name: 'Corsi Sicurezza sul Lavoro',
                description: 'Catalogo corsi di formazione sulla sicurezza D.Lgs 81/08',
                numberOfItems: 25,
                itemListElement: [
                    { '@type': 'Course', name: 'Formazione Lavoratori', provider: { '@type': 'Organization', name: 'Element Formazione' } },
                    { '@type': 'Course', name: 'Formazione Preposti', provider: { '@type': 'Organization', name: 'Element Formazione' } },
                    { '@type': 'Course', name: 'Formazione Dirigenti', provider: { '@type': 'Organization', name: 'Element Formazione' } }
                ]
            }
        },
        hero: {
            title: 'Catalogo Corsi',
            subtitle: 'Sicurezza sul Lavoro',
            description: 'Oltre 50 corsi certificati per la formazione obbligatoria D.Lgs 81/08. Attestati riconosciuti su tutto il territorio nazionale, modalità aula, online e blended.',
            primaryButton: { text: 'Richiedi Preventivo', href: '/contatti', icon: 'ArrowRight' },
            secondaryButton: { text: 'Chiama Ora', href: 'tel:+393516239176', icon: 'Phone' },
            stats: [
                { number: '50+', label: 'Corsi Disponibili', icon: 'BookOpen' },
                { number: '100%', label: 'Attestati Validi', icon: 'Award' },
                { number: '3', label: 'Modalità Erogazione', icon: 'Monitor' },
                { number: '24h', label: 'Risposta Preventivi', icon: 'Clock' }
            ],
            backgroundVariant: 'gradient',
            backgroundPattern: 'diagonal-lines',
            trustBadges: [
                { icon: 'Award', text: 'ISO 9001 Certificato' },
                { icon: 'Shield', text: 'D.Lgs 81/08 Compliant' },
                { icon: 'CheckCircle', text: 'Accordi Stato-Regioni' }
            ]
        },
        courseCategories: {
            sectionTitle: 'Categorie Corsi',
            description: 'Scegli la categoria di formazione più adatta alle tue esigenze',
            categories: [
                {
                    icon: 'Users',
                    title: 'Formazione Lavoratori',
                    description: 'Corsi obbligatori per tutti i lavoratori secondo il livello di rischio aziendale',
                    color: 'blue',
                    courses: [
                        { name: 'Formazione Generale', duration: '4 ore', price: '€50', validity: 'Permanente', mode: 'Aula/Online' },
                        { name: 'Formazione Specifica Rischio Basso', duration: '4 ore', price: '€60', validity: '5 anni', mode: 'Aula/Online' },
                        { name: 'Formazione Specifica Rischio Medio', duration: '8 ore', price: '€90', validity: '5 anni', mode: 'Aula/Online' },
                        { name: 'Formazione Specifica Rischio Alto', duration: '12 ore', price: '€130', validity: '5 anni', mode: 'Aula' },
                        { name: 'Aggiornamento Lavoratori', duration: '6 ore', price: '€70', validity: '5 anni', mode: 'Aula/Online' }
                    ]
                },
                {
                    icon: 'UserCheck',
                    title: 'Formazione Preposti',
                    description: 'Per chi sovraintende all\'attività lavorativa e garantisce attuazione delle direttive',
                    color: 'purple',
                    courses: [
                        { name: 'Formazione Preposti Base', duration: '8 ore', price: '€120', validity: '5 anni', mode: 'Aula' },
                        { name: 'Aggiornamento Preposti', duration: '6 ore', price: '€80', validity: '5 anni', mode: 'Aula/Online' }
                    ]
                },
                {
                    icon: 'Briefcase',
                    title: 'Formazione Dirigenti',
                    description: 'Per chi attua le direttive del datore di lavoro organizzando attività lavorative',
                    color: 'indigo',
                    courses: [
                        { name: 'Formazione Dirigenti', duration: '16 ore', price: '€200', validity: '5 anni', mode: 'Aula/Online' },
                        { name: 'Aggiornamento Dirigenti', duration: '6 ore', price: '€80', validity: '5 anni', mode: 'Aula/Online' }
                    ]
                },
                {
                    icon: 'Shield',
                    title: 'RSPP e ASPP',
                    description: 'Formazione per Responsabili e Addetti al Servizio Prevenzione e Protezione',
                    color: 'teal',
                    courses: [
                        { name: 'RSPP Datore di Lavoro Rischio Basso', duration: '16 ore', price: '€250', validity: '5 anni', mode: 'Aula' },
                        { name: 'RSPP Datore di Lavoro Rischio Medio', duration: '32 ore', price: '€400', validity: '5 anni', mode: 'Aula' },
                        { name: 'RSPP Datore di Lavoro Rischio Alto', duration: '48 ore', price: '€550', validity: '5 anni', mode: 'Aula' },
                        { name: 'Aggiornamento RSPP', duration: '6-14 ore', price: 'Da €100', validity: '5 anni', mode: 'Aula' }
                    ]
                },
                {
                    icon: 'HeadphonesIcon',
                    title: 'RLS',
                    description: 'Formazione per Rappresentanti dei Lavoratori per la Sicurezza',
                    color: 'green',
                    courses: [
                        { name: 'RLS Base', duration: '32 ore', price: '€400', validity: '1 anno', mode: 'Aula' },
                        { name: 'Aggiornamento RLS (<50 dip.)', duration: '4 ore', price: '€80', validity: '1 anno', mode: 'Aula' },
                        { name: 'Aggiornamento RLS (>50 dip.)', duration: '8 ore', price: '€120', validity: '1 anno', mode: 'Aula' }
                    ]
                },
                {
                    icon: 'Heart',
                    title: 'Primo Soccorso',
                    description: 'Formazione per addetti al primo soccorso aziendale',
                    color: 'red',
                    courses: [
                        { name: 'Primo Soccorso Gruppo A', duration: '16 ore', price: '€180', validity: '3 anni', mode: 'Aula' },
                        { name: 'Primo Soccorso Gruppo B/C', duration: '12 ore', price: '€150', validity: '3 anni', mode: 'Aula' },
                        { name: 'Aggiornamento Gruppo A', duration: '6 ore', price: '€90', validity: '3 anni', mode: 'Aula' },
                        { name: 'Aggiornamento Gruppo B/C', duration: '4 ore', price: '€70', validity: '3 anni', mode: 'Aula' }
                    ]
                },
                {
                    icon: 'Zap',
                    title: 'Antincendio',
                    description: 'Formazione per addetti antincendio secondo DM 02/09/2021',
                    color: 'orange',
                    courses: [
                        { name: 'Antincendio Livello 1', duration: '4 ore', price: '€80', validity: '5 anni', mode: 'Aula' },
                        { name: 'Antincendio Livello 2', duration: '8 ore', price: '€150', validity: '5 anni', mode: 'Aula' },
                        { name: 'Antincendio Livello 3', duration: '16 ore', price: '€280', validity: '5 anni', mode: 'Aula' },
                        { name: 'Aggiornamento Antincendio', duration: '2-8 ore', price: 'Da €50', validity: '5 anni', mode: 'Aula' }
                    ]
                },
                {
                    icon: 'Truck',
                    title: 'Attrezzature di Lavoro',
                    description: 'Abilitazioni per l\'uso di attrezzature specifiche',
                    color: 'yellow',
                    courses: [
                        { name: 'Carrelli Elevatori', duration: '12 ore', price: '€200', validity: '5 anni', mode: 'Aula+Pratica' },
                        { name: 'PLE (Piattaforme Aeree)', duration: '10 ore', price: '€220', validity: '5 anni', mode: 'Aula+Pratica' },
                        { name: 'Gru a Torre/Mobile', duration: '14-22 ore', price: 'Da €300', validity: '5 anni', mode: 'Aula+Pratica' },
                        { name: 'Escavatori', duration: '10-16 ore', price: 'Da €250', validity: '5 anni', mode: 'Aula+Pratica' },
                        { name: 'Trattori Agricoli', duration: '13 ore', price: '€180', validity: '5 anni', mode: 'Aula+Pratica' }
                    ]
                }
            ]
        },
        deliveryModes: {
            sectionTitle: 'Modalità di Erogazione',
            description: 'Scegli la modalità più adatta alle tue esigenze organizzative',
            modes: [
                {
                    icon: 'Building2',
                    title: 'Aula Tradizionale',
                    description: 'Formazione in presenza presso la nostra sede o direttamente in azienda',
                    features: [
                        'Interazione diretta con il docente',
                        'Esercitazioni pratiche',
                        'Networking con altri partecipanti',
                        'Materiale didattico incluso'
                    ],
                    color: 'blue'
                },
                {
                    icon: 'Monitor',
                    title: 'E-Learning',
                    description: 'Corsi online accessibili 24/7 da qualsiasi dispositivo',
                    features: [
                        'Flessibilità oraria totale',
                        'Accesso da PC, tablet, smartphone',
                        'Test di verifica automatici',
                        'Attestato immediato'
                    ],
                    color: 'purple'
                },
                {
                    icon: 'Laptop',
                    title: 'Blended',
                    description: 'Combinazione di formazione online e sessioni in aula',
                    features: [
                        'Teoria online, pratica in aula',
                        'Massima flessibilità',
                        'Ottimizzazione tempi',
                        'Soluzione più richiesta'
                    ],
                    color: 'teal',
                    recommended: true
                }
            ]
        },
        whyChooseUs: {
            title: 'Perché Scegliere i Nostri Corsi',
            description: 'Qualità certificata e riconosciuta per la formazione sulla sicurezza',
            features: [
                {
                    icon: 'Award',
                    title: 'Attestati Riconosciuti',
                    description: 'Tutti gli attestati sono validi a norma di legge secondo D.Lgs 81/08 e Accordi Stato-Regioni'
                },
                {
                    icon: 'Users',
                    title: 'Docenti Qualificati',
                    description: 'Formatori con requisiti previsti dal D.I. 6 marzo 2013 e anni di esperienza sul campo'
                },
                {
                    icon: 'Clock',
                    title: 'Calendario Flessibile',
                    description: 'Corsi programmati settimanalmente, anche weekend e serali su richiesta'
                },
                {
                    icon: 'MapPin',
                    title: 'Formazione in Azienda',
                    description: 'Organizziamo corsi direttamente presso la vostra sede per gruppi da 6 partecipanti'
                },
                {
                    icon: 'FileCheck',
                    title: 'Gestione Scadenze',
                    description: 'Sistema di alert automatico per aggiornamenti obbligatori e scadenze attestati'
                },
                {
                    icon: 'Banknote',
                    title: 'Prezzi Trasparenti',
                    description: 'Nessun costo nascosto, preventivi dettagliati e possibilità di convenzioni aziendali'
                }
            ]
        },
        faq: {
            sectionTitle: 'Domande Frequenti sui Corsi',
            items: [
                {
                    question: 'Come faccio a sapere quali corsi sono obbligatori per la mia azienda?',
                    answer: 'L\'obbligatorietà dipende dal codice ATECO, dal livello di rischio e dalle mansioni svolte. Contattaci per una consulenza gratuita: analizzeremo la tua situazione e ti indicheremo esattamente i corsi necessari.'
                },
                {
                    question: 'Gli attestati sono validi in tutta Italia?',
                    answer: 'Sì, tutti i nostri attestati sono rilasciati in conformità al D.Lgs 81/08 e agli Accordi Stato-Regioni, quindi sono riconosciuti su tutto il territorio nazionale da qualsiasi organo di controllo.'
                },
                {
                    question: 'Posso fare i corsi completamente online?',
                    answer: 'Alcuni corsi possono essere svolti interamente online (es. formazione generale e specifica rischio basso), altri richiedono parte pratica in aula. Verifica nella scheda del singolo corso le modalità disponibili.'
                },
                {
                    question: 'Quanto tempo prima devo prenotare?',
                    answer: 'Per i corsi a calendario consigliamo di prenotare almeno 1 settimana prima. Per corsi in azienda o personalizzati, servono circa 2-3 settimane per l\'organizzazione.'
                },
                {
                    question: 'Cosa succede se non supero il test finale?',
                    answer: 'In caso di mancato superamento, puoi ripetere gratuitamente il test. Se necessario, ti offriamo sessioni di recupero senza costi aggiuntivi per garantirti il conseguimento dell\'attestato.'
                },
                {
                    question: 'Fate sconti per gruppi aziendali?',
                    answer: 'Sì, offriamo convenzioni aziendali con sconti dal 10% al 30% in base al numero di partecipanti e alla frequenza di formazione. Contattaci per un preventivo personalizzato.'
                }
            ]
        },
        cta: {
            title: 'Richiedi il Calendario Corsi',
            description: 'Ricevi il calendario aggiornato dei prossimi corsi e un preventivo personalizzato per le tue esigenze formative.',
            primaryButton: { text: 'Richiedi Informazioni', href: '/contatti', icon: 'ArrowRight' },
            secondaryButton: { text: 'Scarica Catalogo PDF', href: '#', icon: 'FileText' },
            badges: [
                '✓ Calendario sempre aggiornato',
                '✓ Preventivo in 24h',
                '✓ Consulenza gratuita'
            ]
        }
    }
};

async function updateCorsiPage() {
    console.log('📚 Aggiornamento Pagina Corsi Element Formazione...\n');

    try {
        const existingPage = await prisma.cMSPage.findFirst({
            where: {
                slug: corsiFormazione.slug,
                tenantId: TENANT_FORMAZIONE,
                deletedAt: null
            }
        });

        if (existingPage) {
            const updated = await prisma.cMSPage.update({
                where: { id: existingPage.id },
                data: {
                    title: corsiFormazione.title,
                    content: corsiFormazione.content,
                    seoTitle: corsiFormazione.seoTitle,
                    seoDescription: corsiFormazione.seoDescription,
                    layout: corsiFormazione.layout,
                    status: corsiFormazione.status,
                    isPublished: true,
                    publishedAt: new Date(),
                    updatedAt: new Date()
                }
            });
            console.log('✅ Pagina Corsi aggiornata:', updated.id);
        } else {
            const created = await prisma.cMSPage.create({
                data: {
                    slug: corsiFormazione.slug,
                    title: corsiFormazione.title,
                    content: corsiFormazione.content,
                    blocks: [],
                    layout: corsiFormazione.layout,
                    status: corsiFormazione.status,
                    seoTitle: corsiFormazione.seoTitle,
                    seoDescription: corsiFormazione.seoDescription,
                    isPublished: true,
                    publishedAt: new Date(),
                    tenantId: TENANT_FORMAZIONE
                }
            });
            console.log('✅ Pagina Corsi creata:', created.id);
        }

        const sections = Object.keys(corsiFormazione.content).filter(k => k !== 'metadata');
        const totalCourses = corsiFormazione.content.courseCategories.categories.reduce(
            (acc, cat) => acc + cat.courses.length, 0
        );
        console.log(`📊 Sezioni: ${sections.length}`);
        console.log(`   - ${sections.join(', ')}`);
        console.log(`📚 Corsi totali: ${totalCourses} in ${corsiFormazione.content.courseCategories.categories.length} categorie`);

        console.log('\n🎉 Pagina Corsi completata!');

    } catch (error) {
        console.error('❌ Errore:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

updateCorsiPage();
