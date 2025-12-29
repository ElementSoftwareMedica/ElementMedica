/**
 * Script 01: Homepage Element Formazione - Premium Redesign
 * Eseguire: node backend/scripts/cms-redesign/01-homepage-formazione.js
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TENANT_FORMAZIONE = 'd2bbc5b0-344c-47c7-8ef5-f57755293372';

const homepageContent = {
    metadata: {
        layout: 'full-width',
        theme: 'formazione',
        version: '2.0',
        lastUpdate: new Date().toISOString()
    },

    hero: {
        badge: { text: '🏆 Leader dal 2009', variant: 'premium' },
        title: 'Sicurezza sul Lavoro',
        subtitle: 'Senza Compromessi',
        description: 'Partner strategico per oltre 500 aziende italiane. Formazione certificata, consulenza RSPP e medicina del lavoro con standard qualitativi d\'eccellenza.',
        primaryButton: { text: 'Scopri i Corsi', href: '/corsi', icon: 'ArrowRight' },
        secondaryButton: { text: 'Richiedi Preventivo', href: '/contatti', variant: 'outline' },
        stats: [
            { number: '500+', label: 'Aziende Clienti', icon: 'Building2' },
            { number: '15.000+', label: 'Lavoratori Formati', icon: 'Users' },
            { number: '15+', label: 'Anni Esperienza', icon: 'Award' },
            { number: '98%', label: 'Clienti Soddisfatti', icon: 'Star' }
        ],
        trustBadges: [
            { icon: 'Shield', text: 'ISO 9001:2015' },
            { icon: 'Award', text: 'Accreditamento Regionale' },
            { icon: 'CheckCircle', text: 'Formatori Qualificati' }
        ],
        backgroundVariant: 'gradient-premium',
        showContactForm: true
    },

    partners: {
        title: 'Ci Hanno Scelto',
        subtitle: 'Aziende leader che si affidano alla nostra esperienza',
        logos: [
            { name: 'Industrie Meccaniche', sector: 'Manifatturiero' },
            { name: 'Costruzioni Edili', sector: 'Edilizia' },
            { name: 'Logistica Express', sector: 'Trasporti' },
            { name: 'Tech Solutions', sector: 'Tecnologia' },
            { name: 'Food Processing', sector: 'Alimentare' },
            { name: 'Chemical Industries', sector: 'Chimico' }
        ],
        backgroundVariant: 'light-pattern'
    },

    services: {
        sectionTitle: 'I Nostri Servizi',
        sectionSubtitle: 'Soluzioni complete per la sicurezza e la conformità normativa della tua azienda',
        backgroundVariant: 'gradient-mesh',
        items: [
            {
                icon: 'GraduationCap',
                title: 'Corsi di Formazione',
                description: 'Programmi formativi certificati per tutti i livelli di rischio. Aggiornamenti periodici e attestati riconosciuti a livello nazionale.',
                features: [
                    'Formazione Generale e Specifica',
                    'Rischio Alto, Medio, Basso',
                    'Preposti e Dirigenti',
                    'Aggiornamenti Quinquennali',
                    'FAD e Aula'
                ],
                href: '/corsi',
                color: 'blue',
                badge: 'Più Richiesto'
            },
            {
                icon: 'Shield',
                title: 'Servizio RSPP',
                description: 'Responsabile Servizio Prevenzione e Protezione esterno qualificato per tutti i macrosettori ATECO.',
                features: [
                    'Nomina RSPP Esterno',
                    'DVR e Valutazione Rischi',
                    'Sopralluoghi Periodici',
                    'Riunioni Art. 35',
                    'Consulenza Continua'
                ],
                href: '/rspp',
                color: 'green',
                badge: 'Servizio Completo'
            },
            {
                icon: 'Stethoscope',
                title: 'Medicina del Lavoro',
                description: 'Sorveglianza sanitaria completa con medici competenti specializzati e protocolli personalizzati.',
                features: [
                    'Visite Mediche Periodiche',
                    'Medico Competente',
                    'Esami Strumentali',
                    'Cartelle Sanitarie Digitali',
                    'Gestione Scadenze'
                ],
                href: '/medicina-del-lavoro',
                color: 'teal',
                badge: 'D.Lgs 81/08'
            }
        ]
    },

    process: {
        sectionTitle: 'Come Lavoriamo',
        sectionSubtitle: 'Un processo strutturato per garantire risultati concreti e misurabili',
        backgroundVariant: 'white',
        steps: [
            {
                number: '01',
                icon: 'Search',
                title: 'Analisi Iniziale',
                description: 'Valutiamo le esigenze specifiche della tua azienda attraverso un audit completo della situazione attuale.',
                duration: '1-2 giorni'
            },
            {
                number: '02',
                icon: 'FileText',
                title: 'Piano Personalizzato',
                description: 'Sviluppiamo un piano di intervento su misura con tempistiche, costi e obiettivi chiari e definiti.',
                duration: '2-3 giorni'
            },
            {
                number: '03',
                icon: 'Users',
                title: 'Implementazione',
                description: 'Attiviamo formazione, consulenza e servizi con il supporto costante del nostro team di esperti.',
                duration: 'Variabile'
            },
            {
                number: '04',
                icon: 'BarChart3',
                title: 'Monitoraggio',
                description: 'Verifichiamo i risultati e manteniamo la conformità con aggiornamenti e supporto continuativo.',
                duration: 'Continuo'
            }
        ]
    },

    whyChooseUs: {
        sectionTitle: 'Perché Scegliere Element Formazione',
        sectionSubtitle: 'La differenza sta nei dettagli e nella qualità del servizio',
        backgroundVariant: 'gradient-subtle',
        mainFeatures: [
            {
                icon: 'Award',
                title: 'Esperienza Consolidata',
                description: 'Oltre 15 anni nel settore della sicurezza sul lavoro, con migliaia di aziende servite con successo.',
                stat: { value: '15+', label: 'Anni' }
            },
            {
                icon: 'BadgeCheck',
                title: 'Certificazioni Riconosciute',
                description: 'Attestati validi a norma di legge, rilasciati da ente accreditato con validità su tutto il territorio nazionale.',
                stat: { value: '100%', label: 'Validità' }
            },
            {
                icon: 'HeadphonesIcon',
                title: 'Supporto Dedicato',
                description: 'Un referente dedicato per ogni cliente, assistenza telefonica e risposta garantita entro 24 ore.',
                stat: { value: '24h', label: 'Risposta' }
            },
            {
                icon: 'Zap',
                title: 'Attivazione Rapida',
                description: 'Tempi di attivazione ridotti per corsi e servizi. Flessibilità massima per le urgenze aziendali.',
                stat: { value: '48h', label: 'Attivazione' }
            }
        ],
        additionalBenefits: [
            'Piattaforma digitale per gestione scadenze',
            'Report periodici sullo stato di conformità',
            'Aggiornamenti normativi automatici',
            'Sconti per pacchetti multi-servizio',
            'Formazione anche presso la sede cliente',
            'Consulenza per bandi e incentivi'
        ]
    },

    stats: {
        backgroundVariant: 'gradient-dark',
        title: 'I Numeri Parlano',
        subtitle: 'Risultati concreti che testimoniano il nostro impegno',
        items: [
            { number: '500+', label: 'Aziende Clienti', description: 'In tutta Italia', icon: 'Building2' },
            { number: '15.000+', label: 'Lavoratori Formati', description: 'Dal 2009', icon: 'Users' },
            { number: '2.500+', label: 'Corsi Erogati', description: 'Ogni anno', icon: 'GraduationCap' },
            { number: '98%', label: 'Clienti Soddisfatti', description: 'Rinnovano', icon: 'ThumbsUp' },
            { number: '24h', label: 'Tempo Risposta', description: 'Garantito', icon: 'Clock' },
            { number: '9', label: 'Macrosettori ATECO', description: 'Coperti', icon: 'Grid3X3' }
        ]
    },

    testimonials: {
        sectionTitle: 'Cosa Dicono i Nostri Clienti',
        sectionSubtitle: 'Storie di successo e feedback autentici',
        backgroundVariant: 'pattern-subtle',
        items: [
            {
                name: 'Marco Rossi',
                role: 'Responsabile HR',
                company: 'Industrie Meccaniche SRL',
                image: null,
                text: 'Collaboriamo con Element Formazione da 5 anni. Professionalità impeccabile, puntualità nelle scadenze e formatori preparatissimi. Il supporto per la gestione della documentazione è stato fondamentale.',
                rating: 5,
                highlight: 'Professionalità impeccabile'
            },
            {
                name: 'Laura Bianchi',
                role: 'Titolare',
                company: 'Costruzioni Edili SpA',
                image: null,
                text: 'Nel nostro settore la sicurezza è tutto. Element ci ha seguito dalla formazione iniziale fino alla consulenza RSPP continua. Ci sentiamo protetti e conformi. Consiglio vivamente.',
                rating: 5,
                highlight: 'Ci sentiamo protetti'
            },
            {
                name: 'Giuseppe Verdi',
                role: 'Direttore Operativo',
                company: 'Logistica Express',
                image: null,
                text: 'La flessibilità nell\'organizzazione dei corsi e la disponibilità del team hanno fatto la differenza. Abbiamo formato 200 dipendenti in tempi record senza fermare le attività.',
                rating: 5,
                highlight: '200 dipendenti formati'
            }
        ]
    },

    certifications: {
        sectionTitle: 'Certificazioni e Accreditamenti',
        backgroundVariant: 'light',
        items: [
            {
                icon: 'Award',
                name: 'ISO 9001:2015',
                description: 'Sistema di gestione qualità certificato',
                issuer: 'Ente Accreditato ACCREDIA'
            },
            {
                icon: 'Shield',
                name: 'Accreditamento Regionale',
                description: 'Ente di formazione accreditato',
                issuer: 'Regione Veneto'
            },
            {
                icon: 'FileCheck',
                name: 'Accordo Stato-Regioni',
                description: 'Conformità a tutti gli accordi vigenti',
                issuer: 'Ministero del Lavoro'
            },
            {
                icon: 'Users',
                name: 'Formatori Qualificati',
                description: 'Requisiti D.I. 06/03/2013',
                issuer: 'Ministero del Lavoro'
            }
        ]
    },

    faq: {
        sectionTitle: 'Domande Frequenti',
        backgroundVariant: 'white',
        items: [
            {
                question: 'Quali corsi di formazione offrite?',
                answer: 'Offriamo tutti i corsi previsti dal D.Lgs 81/08: formazione generale e specifica lavoratori (rischio basso, medio, alto), preposti, dirigenti, RLS, antincendio, primo soccorso, lavori in quota, spazi confinati e molto altro. Tutti i corsi sono disponibili in aula e molti anche in modalità FAD.'
            },
            {
                question: 'Gli attestati rilasciati sono validi?',
                answer: 'Sì, tutti gli attestati sono rilasciati in conformità agli Accordi Stato-Regioni e sono validi su tutto il territorio nazionale. Siamo un ente di formazione accreditato dalla Regione Veneto.'
            },
            {
                question: 'Posso organizzare i corsi presso la mia azienda?',
                answer: 'Assolutamente sì. Organizziamo corsi presso la sede del cliente per gruppi di almeno 8-10 partecipanti, con evidenti vantaggi logistici e economici per l\'azienda.'
            },
            {
                question: 'Quanto costa il servizio RSPP esterno?',
                answer: 'Il costo dipende da diversi fattori: dimensione aziendale, settore di attività, livello di rischio e servizi inclusi. Contattateci per un preventivo personalizzato gratuito.'
            },
            {
                question: 'Come funziona la sorveglianza sanitaria?',
                answer: 'Il nostro medico competente definisce un protocollo sanitario specifico per la vostra azienda, gestisce le visite periodiche, gli esami strumentali e la documentazione. Vi supportiamo nella gestione delle scadenze.'
            }
        ]
    },

    cta: {
        backgroundVariant: 'gradient-premium',
        title: 'Pronto a Migliorare la Sicurezza della Tua Azienda?',
        subtitle: 'Inizia oggi con una consulenza gratuita personalizzata',
        description: 'I nostri esperti analizzeranno le tue esigenze e ti proporranno la soluzione più adatta.',
        primaryButton: { text: 'Richiedi Consulenza Gratuita', href: '/contatti', icon: 'ArrowRight' },
        secondaryButton: { text: 'Chiama: +39 351 623 9176', href: 'tel:+393516239176', icon: 'Phone' },
        badges: [
            '✓ Risposta in 24h',
            '✓ Preventivo Gratuito',
            '✓ Senza Impegno'
        ]
    },

    contact: {
        backgroundVariant: 'light-pattern',
        title: 'Contatti Rapidi',
        items: [
            { icon: 'Phone', label: 'Telefono', value: '+39 351 623 9176', href: 'tel:+393516239176' },
            { icon: 'Mail', label: 'Email', value: 'info@elementformazione.com', href: 'mailto:info@elementformazione.com' },
            { icon: 'MapPin', label: 'Sede', value: 'Via Bracciano 34, Selvazzano Dentro (PD)' },
            { icon: 'Clock', label: 'Orari', value: 'Lun-Ven 9:00-18:00' }
        ]
    }
};

async function updateHomepage() {
    console.log('🏠 Aggiornamento Homepage Element Formazione...\n');

    try {
        const page = await prisma.cMSPage.findFirst({
            where: { slug: 'homepage', tenantId: TENANT_FORMAZIONE }
        });

        if (!page) {
            console.log('❌ Homepage non trovata');
            return;
        }

        await prisma.cMSPage.update({
            where: { id: page.id },
            data: {
                title: 'Element Formazione - Sicurezza sul Lavoro e Formazione Professionale',
                content: homepageContent,
                seoTitle: 'Element Formazione | Corsi Sicurezza sul Lavoro | RSPP | Medicina del Lavoro | Padova',
                seoDescription: 'Leader nella formazione sicurezza sul lavoro dal 2009. Corsi certificati D.Lgs 81/08, servizio RSPP esterno, medicina del lavoro. 500+ aziende clienti. ISO 9001. Preventivo gratuito.',
                updatedAt: new Date()
            }
        });

        console.log('✅ Homepage aggiornata con successo!');
        console.log('   - Sezioni: ' + Object.keys(homepageContent).length);
        console.log('   - SEO ottimizzato');

    } catch (error) {
        console.error('❌ Errore:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

updateHomepage();
