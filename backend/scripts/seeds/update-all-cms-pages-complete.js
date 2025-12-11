/**
 * Script per aggiornare TUTTE le pagine CMS con contenuti completi
 * - Aggiorna Element Formazione (medicina-del-lavoro, rspp)
 * - Crea tenant Element Medica se non esiste
 * - Crea pagine Element Medica complete
 * 
 * Eseguire: node backend/scripts/update-all-cms-pages-complete.js
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Tenant IDs
const TENANT_FORMAZIONE = 'd2bbc5b0-344c-47c7-8ef5-f57755293372';
const TENANT_MEDICA = 'tenant-element-medica-001';

// ============================================
// PAGINE ELEMENT FORMAZIONE - COMPLETE
// ============================================

const medicinaDelLavoroFormazione = {
    slug: 'medicina-del-lavoro',
    title: 'Medicina del Lavoro - Element Formazione',
    seoTitle: 'Medicina del Lavoro Milano | Sorveglianza Sanitaria Aziendale | Element Formazione',
    seoDescription: 'Servizi completi di medicina del lavoro: visite preventive, sorveglianza sanitaria, medico competente, esami specialistici. Conformità D.Lgs 81/08. ✓ ISO 9001 ✓ 500+ aziende clienti.',
    status: 'published',
    layout: 'full-width',
    content: {
        metadata: { layout: 'full-width', theme: 'light' },
        hero: {
            title: 'Medicina del Lavoro',
            subtitle: 'Proteggiamo la Salute dei Tuoi Lavoratori',
            description: 'Servizi completi di sorveglianza sanitaria secondo D.Lgs 81/08. Protocolli medici certificati, medici competenti specializzati e gestione digitale delle scadenze.',
            primaryButton: { text: 'Richiedi Consulto Gratuito', href: '/contatti' },
            secondaryButton: { text: 'Scopri i Servizi', href: '#servizi' },
            stats: [
                { number: '15+', label: 'Anni Esperienza' },
                { number: '500+', label: 'Aziende Clienti' },
                { number: '10.000+', label: 'Visite Annuali' },
                { number: '98%', label: 'Soddisfazione' }
            ],
            backgroundVariant: 'medical-gradient',
            showContactForm: false,
            trustBadges: [
                { icon: 'Award', text: 'ISO 9001 Certificato' },
                { icon: 'Shield', text: 'Accreditamento Regionale' },
                { icon: 'Users', text: 'Medici Competenti Specializzati' }
            ]
        },
        services: [
            {
                icon: 'Stethoscope',
                title: 'Visite Mediche Preventive e Periodiche',
                description: 'Valutazione dell\'idoneità alla mansione specifica secondo i protocolli sanitari aziendali e il D.Lgs 81/08.',
                features: [
                    'Visita medica pre-assuntiva',
                    'Controlli periodici programmati',
                    'Visite su richiesta lavoratore',
                    'Cambio mansione',
                    'Rientro post-malattia >60gg'
                ],
                color: 'cyan'
            },
            {
                icon: 'ClipboardCheck',
                title: 'Sorveglianza Sanitaria',
                description: 'Programmi di monitoraggio continuo per lavoratori esposti a rischi specifici, con protocolli personalizzati.',
                features: [
                    'Protocolli sanitari personalizzati',
                    'Monitoraggio esposizioni professionali',
                    'Giudizi di idoneità motivati',
                    'Cartelle sanitarie digitali',
                    'Scadenzario automatico'
                ],
                color: 'green'
            },
            {
                icon: 'UserCheck',
                title: 'Medico Competente',
                description: 'Nomina del medico competente aziendale con supporto continuativo e consulenza specializzata.',
                features: [
                    'Nomina medico competente',
                    'Sopralluoghi aziendali',
                    'Collaborazione con RSPP',
                    'Pareri su DPI',
                    'Partecipazione riunioni periodiche'
                ],
                color: 'blue'
            },
            {
                icon: 'Activity',
                title: 'Esami Specialistici',
                description: 'Diagnostica strumentale completa con strumentazione certificata e personale qualificato.',
                features: [
                    'Spirometria',
                    'Audiometria',
                    'Elettrocardiogramma',
                    'Esami di laboratorio',
                    'Tossicologia'
                ],
                color: 'purple'
            },
            {
                icon: 'Syringe',
                title: 'Vaccinazioni Occupazionali',
                description: 'Programmi vaccinali per prevenzione rischi biologici e protezione lavoratori esposti.',
                features: [
                    'Antitetanica',
                    'Epatite A e B',
                    'Influenza stagionale',
                    'COVID-19',
                    'Protocolli personalizzati'
                ],
                color: 'orange'
            },
            {
                icon: 'ShieldCheck',
                title: 'Consulenza Sicurezza',
                description: 'Supporto specialistico per la gestione integrata di sicurezza sul lavoro e salute aziendale.',
                features: [
                    'Valutazione rischi specifici',
                    'Gestione emergenze sanitarie',
                    'Primo soccorso aziendale',
                    'Formazione personale',
                    'Audit conformità'
                ],
                color: 'red'
            }
        ],
        normativa: {
            title: 'Normativa di Riferimento',
            description: 'I nostri servizi garantiscono piena conformità al D.Lgs 81/2008 (Testo Unico sulla Sicurezza)',
            articles: [
                {
                    code: 'Art. 41',
                    title: 'Sorveglianza Sanitaria',
                    description: 'Modalità e periodicità delle visite mediche obbligatorie per lavoratori esposti a rischi specifici.'
                },
                {
                    code: 'Art. 38',
                    title: 'Medico Competente',
                    description: 'Requisiti e compiti del medico competente aziendale, figura obbligatoria per molte attività.'
                },
                {
                    code: 'Art. 18',
                    title: 'Obblighi Datore Lavoro',
                    description: 'Nomina medico competente e attuazione sorveglianza sanitaria secondo protocolli specifici.'
                },
                {
                    code: 'Art. 25',
                    title: 'Cartella Sanitaria',
                    description: 'Gestione documentazione sanitaria riservata con conservazione per almeno 10 anni.'
                }
            ]
        },
        whyChooseUs: {
            title: 'Perché Scegliere Noi',
            features: [
                { icon: 'Award', title: 'ISO 9001 Certificato', description: 'Sistema di gestione qualità certificato' },
                { icon: 'MapPin', title: 'Copertura Nazionale', description: 'Servizi in tutta Italia con team dedicati' },
                { icon: 'Clock', title: 'Risposta Rapida', description: 'Appuntamenti in 48-72 ore lavorative' },
                { icon: 'Shield', title: 'Conformità Garantita', description: 'Documentazione sempre a norma di legge' }
            ]
        },
        faq: {
            title: 'Domande Frequenti',
            items: [
                {
                    question: 'Quando è obbligatoria la sorveglianza sanitaria?',
                    answer: 'La sorveglianza sanitaria è obbligatoria quando i lavoratori sono esposti a rischi specifici come agenti chimici, fisici, biologici, movimentazione carichi, videoterminali >20h/settimana, lavoro notturno.'
                },
                {
                    question: 'Chi deve nominare il medico competente?',
                    answer: 'Il datore di lavoro deve nominare il medico competente quando la valutazione dei rischi evidenzia la necessità di sorveglianza sanitaria per una o più mansioni aziendali.'
                },
                {
                    question: 'Quanto dura il giudizio di idoneità?',
                    answer: 'La validità varia in base al rischio: generalmente 1-2 anni per rischi elevati, fino a 3-5 anni per rischi bassi. Il protocollo sanitario definisce le periodicità specifiche.'
                },
                {
                    question: 'Cosa succede se un lavoratore risulta non idoneo?',
                    answer: 'Il medico competente può esprimere idoneità con prescrizioni/limitazioni o inidoneità temporanea/permanente. Il datore deve adibire il lavoratore a mansioni compatibili.'
                }
            ]
        },
        cta: {
            title: 'Proteggi la Salute dei Tuoi Lavoratori',
            description: 'Contattaci per un consulto gratuito e scopri come possiamo supportare la tua azienda nella gestione della medicina del lavoro.',
            primaryButton: { text: 'Richiedi Consulto Gratuito', href: '/contatti' },
            secondaryButton: { text: 'Chiamaci Ora', href: 'tel:+390212345678' },
            badges: ['✓ Risposta in 24h', '✓ Preventivo Gratuito', '✓ Supporto Continuativo']
        }
    },
    blocks: []
};

const rsppFormazione = {
    slug: 'rspp',
    title: 'Nomina RSPP - Element Formazione',
    seoTitle: 'RSPP Esterno Milano | Responsabile Sicurezza | Element Formazione',
    seoDescription: 'Servizio di RSPP esterno qualificato: nomina, DVR, valutazione rischi, consulenza sicurezza sul lavoro. ✓ Tutti i macrosettori ATECO ✓ 500+ aziende clienti.',
    status: 'published',
    layout: 'full-width',
    content: {
        metadata: { layout: 'full-width', theme: 'light' },
        hero: {
            title: 'RSPP Esterno',
            subtitle: 'Responsabile Servizio Prevenzione e Protezione',
            description: 'Affida la sicurezza della tua azienda a professionisti qualificati. Servizio RSPP esterno completo con supporto continuo, DVR e conformità normativa garantita.',
            primaryButton: { text: 'Richiedi Preventivo', href: '/contatti' },
            secondaryButton: { text: 'Scopri il Servizio', href: '#servizio' },
            stats: [
                { number: '500+', label: 'Aziende Seguite' },
                { number: '15+', label: 'Anni Esperienza' },
                { number: '9', label: 'Macrosettori ATECO' },
                { number: '100%', label: 'Conformità' }
            ],
            backgroundVariant: 'gradient',
            showContactForm: false
        },
        whatIsRSPP: {
            title: 'Cos\'è l\'RSPP?',
            description: 'Il Responsabile del Servizio di Prevenzione e Protezione (RSPP) è la figura designata dal datore di lavoro per coordinare il servizio di prevenzione e protezione dai rischi. È obbligatorio per tutte le aziende ai sensi del D.Lgs 81/08.',
            options: [
                {
                    title: 'RSPP Interno',
                    description: 'Un dipendente dell\'azienda con formazione specifica',
                    suitable: 'Aziende con risorse interne dedicate'
                },
                {
                    title: 'RSPP Esterno',
                    description: 'Un professionista esterno qualificato',
                    suitable: 'PMI, aziende senza personale interno formato'
                },
                {
                    title: 'Datore di Lavoro RSPP',
                    description: 'Il datore di lavoro stesso (con limitazioni)',
                    suitable: 'Piccole aziende con specifici requisiti'
                }
            ]
        },
        serviceIncludes: {
            title: 'Cosa Include il Nostro Servizio RSPP',
            services: [
                {
                    icon: 'FileText',
                    title: 'Documento Valutazione Rischi (DVR)',
                    description: 'Redazione e aggiornamento del DVR completo di tutte le valutazioni specifiche richieste.',
                    details: [
                        'Analisi rischi generici e specifici',
                        'Valutazione rischio stress lavoro-correlato',
                        'Valutazione rischio chimico, biologico, fisico',
                        'Valutazione movimentazione manuale carichi',
                        'Valutazione rischio videoterminali'
                    ]
                },
                {
                    icon: 'Users',
                    title: 'Sopralluoghi e Riunioni',
                    description: 'Presenza periodica in azienda per verifiche e incontri con il personale.',
                    details: [
                        'Sopralluoghi periodici programmati',
                        'Riunioni periodiche di sicurezza (art. 35)',
                        'Incontri con RLS e preposti',
                        'Verifica attuazione misure di prevenzione',
                        'Supporto per ispezioni ASL/INAIL'
                    ]
                },
                {
                    icon: 'BookOpen',
                    title: 'Formazione e Informazione',
                    description: 'Supporto per la pianificazione e gestione della formazione obbligatoria.',
                    details: [
                        'Piano formativo annuale',
                        'Gestione scadenze formazione',
                        'Informazione sui rischi specifici',
                        'Affiancamento formatori qualificati',
                        'Documentazione attestati'
                    ]
                },
                {
                    icon: 'Shield',
                    title: 'Gestione Emergenze',
                    description: 'Redazione piani di emergenza e coordinamento delle figure preposte.',
                    details: [
                        'Piano di emergenza ed evacuazione',
                        'Planimetrie con vie di fuga',
                        'Designazione addetti antincendio',
                        'Designazione addetti primo soccorso',
                        'Prove di evacuazione'
                    ]
                },
                {
                    icon: 'ClipboardList',
                    title: 'Documentazione e Adempimenti',
                    description: 'Gestione completa della documentazione di sicurezza aziendale.',
                    details: [
                        'Registro infortuni',
                        'Nomina figure sicurezza',
                        'Verbali riunioni e sopralluoghi',
                        'Procedure operative',
                        'Gestione DPI'
                    ]
                },
                {
                    icon: 'HeadphonesIcon',
                    title: 'Consulenza Continua',
                    description: 'Supporto telefonico e via email per qualsiasi esigenza di sicurezza.',
                    details: [
                        'Assistenza telefonica dedicata',
                        'Risposta email entro 24h',
                        'Consulenza per modifiche organizzative',
                        'Supporto per nuove assunzioni',
                        'Aggiornamento normativo'
                    ]
                }
            ]
        },
        macrosettori: {
            title: 'Macrosettori ATECO Coperti',
            description: 'I nostri RSPP sono abilitati per tutti i macrosettori di rischio:',
            sectors: [
                { code: 'A', name: 'Agricoltura, silvicoltura e pesca', risk: 'ALTO' },
                { code: 'B', name: 'Estrazione di minerali', risk: 'ALTO' },
                { code: 'C', name: 'Attività manifatturiere', risk: 'MEDIO-ALTO' },
                { code: 'D-E', name: 'Energia, acqua, rifiuti', risk: 'MEDIO' },
                { code: 'F', name: 'Costruzioni', risk: 'ALTO' },
                { code: 'G-I', name: 'Commercio, trasporti, alloggio', risk: 'BASSO-MEDIO' },
                { code: 'J-K', name: 'Informazione, finanza', risk: 'BASSO' },
                { code: 'L-N', name: 'Attività immobiliari, servizi', risk: 'BASSO' },
                { code: 'O-Q', name: 'PA, istruzione, sanità', risk: 'MEDIO' }
            ]
        },
        whyChooseUs: {
            title: 'Perché Scegliere il Nostro Servizio RSPP',
            features: [
                { icon: 'Award', title: 'Professionisti Certificati', description: 'RSPP con abilitazione per tutti i macrosettori e aggiornamento continuo' },
                { icon: 'Clock', title: 'Reperibilità Garantita', description: 'Supporto telefonico e risposta email garantita entro 24 ore lavorative' },
                { icon: 'TrendingDown', title: 'Riduzione Sanzioni', description: 'Conformità documentale che riduce drasticamente il rischio di sanzioni' },
                { icon: 'Shield', title: 'Responsabilità Condivisa', description: 'L\'RSPP esterno assume responsabilità diretta per le proprie consulenze' },
                { icon: 'FileCheck', title: 'Documentazione Completa', description: 'DVR, procedure, registri sempre aggiornati e pronti per ispezioni' },
                { icon: 'Users', title: 'Approccio Personalizzato', description: 'Soluzioni calibrate sulle effettive esigenze della tua azienda' }
            ]
        },
        pricing: {
            title: 'Quanto Costa il Servizio RSPP?',
            description: 'Il costo del servizio RSPP esterno varia in base a diversi fattori:',
            factors: [
                'Dimensione aziendale (numero dipendenti)',
                'Settore di attività e livello di rischio',
                'Complessità organizzativa',
                'Frequenza sopralluoghi richiesti',
                'Servizi aggiuntivi inclusi'
            ],
            cta: 'Richiedi un preventivo personalizzato gratuito'
        },
        faq: {
            title: 'Domande Frequenti sull\'RSPP',
            items: [
                {
                    question: 'È obbligatorio avere un RSPP?',
                    answer: 'Sì, ogni azienda con almeno un lavoratore deve avere un RSPP designato. Può essere interno, esterno o, in alcuni casi, il datore di lavoro stesso.'
                },
                {
                    question: 'Quali sono le responsabilità dell\'RSPP?',
                    answer: 'L\'RSPP coordina il servizio di prevenzione e protezione, supporta la valutazione dei rischi, propone misure di prevenzione, partecipa alle riunioni periodiche e collabora con medico competente e RLS.'
                },
                {
                    question: 'Cosa rischio senza RSPP nominato?',
                    answer: 'Le sanzioni per mancata nomina RSPP vanno da 2.500€ a 6.400€ per il datore di lavoro, oltre a possibili conseguenze penali in caso di infortunio.'
                },
                {
                    question: 'Quanto tempo serve per attivare il servizio?',
                    answer: 'Il servizio può essere attivato in 5-7 giorni lavorativi dalla firma del contratto. In caso di urgenza, sono possibili attivazioni più rapide.'
                }
            ]
        },
        cta: {
            title: 'Metti la Sicurezza in Mani Esperte',
            description: 'Affida il ruolo di RSPP a professionisti qualificati. Richiedi un preventivo personalizzato.',
            primaryButton: { text: 'Richiedi Preventivo Gratuito', href: '/contatti' },
            secondaryButton: { text: 'Parla con un Esperto', href: 'tel:+390212345678' },
            badges: ['✓ Preventivo in 24h', '✓ Attivazione rapida', '✓ Tutti i macrosettori']
        }
    },
    blocks: []
};

// ============================================
// PAGINE ELEMENT MEDICA - COMPLETE
// ============================================

const homepageMedica = {
    slug: 'medica-homepage',
    title: 'Element Medica - Il Tuo Poliambulatorio di Fiducia',
    seoTitle: 'Element Medica | Poliambulatorio Milano | Medicina del Lavoro e Visite Specialistiche',
    seoDescription: 'Poliambulatorio specializzato in medicina del lavoro, visite specialistiche e diagnostica. Professionisti qualificati, tecnologie avanzate. Prenota online.',
    status: 'published',
    layout: 'full-width',
    content: {
        metadata: { layout: 'full-width', theme: 'medical' },
        hero: {
            title: 'Il Tuo Poliambulatorio',
            subtitle: 'di Fiducia',
            description: 'Servizi sanitari completi per aziende e privati. Medicina del lavoro, visite specialistiche e diagnostica con professionisti qualificati e tecnologie all\'avanguardia.',
            primaryButton: { text: 'Prenota Visita', href: '/prenota' },
            secondaryButton: { text: 'Medicina del Lavoro', href: '/medicina-del-lavoro' },
            stats: [
                { number: '20+', label: 'Specialisti' },
                { number: '50.000+', label: 'Pazienti' },
                { number: '15+', label: 'Anni Esperienza' },
                { number: '98%', label: 'Soddisfazione' }
            ],
            backgroundVariant: 'medical-teal'
        },
        services: [
            {
                icon: 'Stethoscope',
                title: 'Medicina del Lavoro',
                description: 'Sorveglianza sanitaria completa, visite preventive e periodiche, medico competente aziendale.',
                href: '/medicina-del-lavoro',
                features: ['Visite preventive', 'Sorveglianza sanitaria', 'Medico competente']
            },
            {
                icon: 'UserCheck',
                title: 'Visite Specialistiche',
                description: 'Cardiologia, ortopedia, dermatologia, oculistica e altre specialità mediche.',
                href: '/visite-specialistiche',
                features: ['Cardiologia', 'Ortopedia', 'Dermatologia']
            },
            {
                icon: 'Activity',
                title: 'Diagnostica',
                description: 'Ecografie, elettrocardiogramma, spirometria, esami del sangue e diagnostica strumentale.',
                href: '/diagnostica',
                features: ['Ecografie', 'ECG', 'Esami laboratorio']
            }
        ],
        howItWorks: {
            title: 'Come Funziona',
            description: 'Prenotare è semplice e veloce',
            steps: [
                { number: '01', title: 'Prenota Online', description: 'Scegli la visita e prenota con pochi click', icon: 'Calendar' },
                { number: '02', title: 'Conferma', description: 'Ricevi conferma via email e SMS', icon: 'CheckCircle' },
                { number: '03', title: 'Visita', description: 'Presentati in ambulatorio all\'orario prenotato', icon: 'MapPin' },
                { number: '04', title: 'Referto', description: 'Ricevi il referto in formato digitale', icon: 'FileText' }
            ]
        },
        whyChooseUs: {
            title: 'Perché Scegliere Element Medica',
            features: [
                { icon: 'Award', title: 'Specialisti Qualificati', description: 'Team di medici con esperienza pluriennale' },
                { icon: 'Clock', title: 'Tempi Rapidi', description: 'Appuntamenti in tempi brevi, referti veloci' },
                { icon: 'Shield', title: 'Tecnologie Avanzate', description: 'Strumentazione diagnostica di ultima generazione' },
                { icon: 'Heart', title: 'Attenzione al Paziente', description: 'Approccio empatico e personalizzato' }
            ]
        },
        testimonials: [
            { name: 'Marco B.', text: 'Personale gentile e professionale. Tempi di attesa minimi.', rating: 5 },
            { name: 'Laura S.', text: 'Struttura moderna e pulita. Medici molto competenti.', rating: 5 },
            { name: 'Giuseppe R.', text: 'Ottimo servizio di medicina del lavoro per la mia azienda.', rating: 5 }
        ],
        cta: {
            title: 'Prenota la Tua Visita',
            description: 'Contattaci per prenotare o per maggiori informazioni sui nostri servizi.',
            primaryButton: { text: 'Prenota Online', href: '/prenota' },
            secondaryButton: { text: 'Chiama Ora', href: 'tel:+390212345678' }
        }
    },
    blocks: []
};

const medicinaDelLavoroMedica = {
    slug: 'medica-medicina-del-lavoro',
    title: 'Medicina del Lavoro - Element Medica',
    seoTitle: 'Medicina del Lavoro Milano | Sorveglianza Sanitaria | Element Medica',
    seoDescription: 'Servizi di medicina del lavoro per aziende: sorveglianza sanitaria, visite mediche, medico competente, esami specialistici. Conformità D.Lgs 81/08.',
    status: 'published',
    layout: 'full-width',
    content: {
        metadata: { layout: 'full-width', theme: 'medical' },
        hero: {
            title: 'Medicina del Lavoro',
            subtitle: 'Per Aziende e Professionisti',
            description: 'Servizi completi di sorveglianza sanitaria per la tua azienda. Medici competenti qualificati, protocolli personalizzati e gestione digitale.',
            primaryButton: { text: 'Richiedi Preventivo', href: '/contatti' },
            secondaryButton: { text: 'Chiama Ora', href: 'tel:+390212345678' },
            stats: [
                { number: '300+', label: 'Aziende Clienti' },
                { number: '8.000+', label: 'Visite/Anno' },
                { number: '100%', label: 'Conformità' }
            ],
            backgroundVariant: 'medical-teal'
        },
        services: [
            {
                icon: 'Stethoscope',
                title: 'Visite Mediche',
                description: 'Visite preventive, periodiche, su richiesta del lavoratore, per cambio mansione.',
                features: ['Pre-assuntiva', 'Periodica', 'Rientro malattia']
            },
            {
                icon: 'UserCheck',
                title: 'Medico Competente',
                description: 'Nomina e gestione del medico competente aziendale secondo normativa.',
                features: ['Nomina MC', 'Sopralluoghi', 'Riunioni periodiche']
            },
            {
                icon: 'Activity',
                title: 'Esami Strumentali',
                description: 'Spirometria, audiometria, visiotest, ECG e altri esami specialistici.',
                features: ['Spirometria', 'Audiometria', 'ECG']
            },
            {
                icon: 'FileText',
                title: 'Documentazione',
                description: 'Gestione completa delle cartelle sanitarie e della documentazione.',
                features: ['Cartelle sanitarie', 'Giudizi idoneità', 'Scadenzario']
            }
        ],
        whyChooseUs: {
            title: 'I Vantaggi del Nostro Servizio',
            features: [
                { icon: 'Clock', title: 'Tempi Rapidi', description: 'Appuntamenti in 48-72 ore' },
                { icon: 'MapPin', title: 'Servizio in Sede', description: 'Visite presso la tua azienda' },
                { icon: 'Shield', title: 'Conformità', description: 'Documentazione a norma di legge' },
                { icon: 'HeadphonesIcon', title: 'Supporto Dedicato', description: 'Referente sempre disponibile' }
            ]
        },
        cta: {
            title: 'Richiedi un Preventivo',
            description: 'Contattaci per un preventivo personalizzato per la tua azienda.',
            primaryButton: { text: 'Richiedi Preventivo', href: '/contatti' },
            secondaryButton: { text: 'Chiama: 02 1234567', href: 'tel:+390212345678' }
        }
    },
    blocks: []
};

const visiteSpecialisticheMedica = {
    slug: 'medica-visite-specialistiche',
    title: 'Visite Specialistiche - Element Medica',
    seoTitle: 'Visite Specialistiche Milano | Cardiologia, Ortopedia, Dermatologia | Element Medica',
    seoDescription: 'Visite specialistiche con medici qualificati: cardiologia, ortopedia, dermatologia, oculistica, otorinolaringoiatria. Prenota online, tempi brevi.',
    status: 'published',
    layout: 'full-width',
    content: {
        metadata: { layout: 'full-width', theme: 'medical' },
        hero: {
            title: 'Visite Specialistiche',
            subtitle: 'Medici Esperti per la Tua Salute',
            description: 'Ampia gamma di visite specialistiche con medici qualificati. Prenota online e ricevi il tuo appuntamento in tempi brevi.',
            primaryButton: { text: 'Prenota Visita', href: '/prenota' },
            secondaryButton: { text: 'Vedi Specialità', href: '#specialita' },
            backgroundVariant: 'medical-blue'
        },
        specialties: [
            {
                icon: 'Heart',
                title: 'Cardiologia',
                description: 'Visita cardiologica, ECG, ecocardiogramma, holter pressorio e cardiaco.',
                price: 'Da €80'
            },
            {
                icon: 'Bone',
                title: 'Ortopedia',
                description: 'Visita ortopedica, ecografie muscolo-scheletriche, infiltrazioni.',
                price: 'Da €80'
            },
            {
                icon: 'Eye',
                title: 'Oculistica',
                description: 'Visita oculistica completa, campo visivo, OCT, tonometria.',
                price: 'Da €70'
            },
            {
                icon: 'Ear',
                title: 'Otorinolaringoiatria',
                description: 'Visita ORL, audiometria, impedenzometria, fibroscopia.',
                price: 'Da €80'
            },
            {
                icon: 'Scan',
                title: 'Dermatologia',
                description: 'Visita dermatologica, mappatura nei, dermatoscopia digitale.',
                price: 'Da €90'
            },
            {
                icon: 'Brain',
                title: 'Neurologia',
                description: 'Visita neurologica, elettromiografia, elettroencefalogramma.',
                price: 'Da €100'
            }
        ],
        cta: {
            title: 'Prenota la Tua Visita Specialistica',
            description: 'Scegli lo specialista e prenota online. Appuntamento confermato in poche ore.',
            primaryButton: { text: 'Prenota Online', href: '/prenota' },
            secondaryButton: { text: 'Chiama per Info', href: 'tel:+390212345678' }
        }
    },
    blocks: []
};

const diagnosticaMedica = {
    slug: 'medica-diagnostica',
    title: 'Diagnostica - Element Medica',
    seoTitle: 'Diagnostica Milano | Ecografie, Esami, ECG | Element Medica',
    seoDescription: 'Servizi diagnostici completi: ecografie, elettrocardiogramma, spirometria, esami del sangue. Strumentazione all\'avanguardia, referti rapidi.',
    status: 'published',
    layout: 'full-width',
    content: {
        metadata: { layout: 'full-width', theme: 'medical' },
        hero: {
            title: 'Diagnostica',
            subtitle: 'Tecnologie Avanzate per la Tua Salute',
            description: 'Servizi diagnostici completi con strumentazione di ultima generazione. Referti rapidi e accurati.',
            primaryButton: { text: 'Prenota Esame', href: '/prenota' },
            backgroundVariant: 'medical-purple'
        },
        services: [
            {
                icon: 'Scan',
                title: 'Ecografie',
                description: 'Ecografia addominale, tiroidea, muscolo-scheletrica, mammaria, prostatica.',
                price: 'Da €60'
            },
            {
                icon: 'Heart',
                title: 'Cardiologia',
                description: 'ECG, ecocardiogramma, holter ECG 24h, holter pressorio.',
                price: 'Da €40'
            },
            {
                icon: 'Wind',
                title: 'Pneumologia',
                description: 'Spirometria semplice e con broncodilatatore, test del cammino.',
                price: 'Da €40'
            },
            {
                icon: 'Ear',
                title: 'Audiologia',
                description: 'Audiometria tonale, impedenzometria, potenziali evocati.',
                price: 'Da €35'
            },
            {
                icon: 'TestTube',
                title: 'Laboratorio',
                description: 'Esami del sangue, urine, tamponi, test allergologici.',
                price: 'Da €20'
            },
            {
                icon: 'Eye',
                title: 'Oculistica',
                description: 'Campo visivo, OCT, topografia corneale, tonometria.',
                price: 'Da €40'
            }
        ],
        cta: {
            title: 'Prenota il Tuo Esame Diagnostico',
            description: 'Referti disponibili in 24-48 ore. Prenota online o chiama.',
            primaryButton: { text: 'Prenota Online', href: '/prenota' },
            secondaryButton: { text: 'Chiama Ora', href: 'tel:+390212345678' }
        }
    },
    blocks: []
};

const contattiMedica = {
    slug: 'medica-contatti',
    title: 'Contatti - Element Medica',
    seoTitle: 'Contatti Element Medica | Prenota Visita Milano',
    seoDescription: 'Contatta Element Medica per prenotare visite specialistiche o richiedere informazioni. Siamo a Milano, aperti dal lunedì al sabato.',
    status: 'published',
    layout: 'full-width',
    content: {
        metadata: { layout: 'full-width', theme: 'medical' },
        hero: {
            title: 'Contattaci',
            description: 'Siamo a tua disposizione per prenotazioni e informazioni.',
            backgroundVariant: 'medical-light'
        },
        contactInfo: {
            address: 'Via Example 456, 20100 Milano',
            phone: '+39 02 1234567',
            email: 'info@elementmedica.it',
            hours: [
                { days: 'Lunedì - Venerdì', time: '08:00 - 19:00' },
                { days: 'Sabato', time: '08:00 - 13:00' },
                { days: 'Domenica', time: 'Chiuso' }
            ]
        },
        contactForm: {
            title: 'Invia un Messaggio',
            fields: ['Nome', 'Email', 'Telefono', 'Messaggio'],
            submitText: 'Invia Richiesta'
        },
        cta: {
            title: 'Preferisci Chiamare?',
            description: 'Il nostro team è disponibile per rispondere alle tue domande.',
            primaryButton: { text: 'Chiama Ora', href: 'tel:+390212345678' }
        }
    },
    blocks: []
};

const prenotaMedica = {
    slug: 'medica-prenota',
    title: 'Prenota Online - Element Medica',
    seoTitle: 'Prenota Visita Online | Element Medica Milano',
    seoDescription: 'Prenota online la tua visita specialistica o esame diagnostico. Sistema di prenotazione semplice e veloce. Conferma immediata.',
    status: 'published',
    layout: 'full-width',
    content: {
        metadata: { layout: 'full-width', theme: 'medical' },
        hero: {
            title: 'Prenota Online',
            description: 'Scegli il servizio e prenota in pochi click. Conferma immediata via email.',
            backgroundVariant: 'medical-teal'
        },
        bookingOptions: [
            { title: 'Medicina del Lavoro', description: 'Per aziende', href: '/medicina-del-lavoro', icon: 'Building' },
            { title: 'Visite Specialistiche', description: 'Per privati', href: '/visite-specialistiche', icon: 'User' },
            { title: 'Diagnostica', description: 'Esami e analisi', href: '/diagnostica', icon: 'Activity' }
        ],
        contactAlternative: {
            title: 'Preferisci Prenotare per Telefono?',
            phone: '+39 02 1234567',
            hours: 'Lun-Ven 08:00-19:00, Sab 08:00-13:00'
        }
    },
    blocks: []
};

// ============================================
// FUNZIONI DI AGGIORNAMENTO
// ============================================

async function updateElementFormazionePages() {
    console.log('\n📄 AGGIORNAMENTO PAGINE ELEMENT FORMAZIONE');
    console.log('==========================================\n');

    // Aggiorna Medicina del Lavoro
    const existingMDL = await prisma.cMSPage.findFirst({
        where: { slug: 'medicina-del-lavoro', tenantId: TENANT_FORMAZIONE }
    });

    if (existingMDL) {
        await prisma.cMSPage.update({
            where: { id: existingMDL.id },
            data: {
                title: medicinaDelLavoroFormazione.title,
                content: medicinaDelLavoroFormazione.content,
                seoTitle: medicinaDelLavoroFormazione.seoTitle,
                seoDescription: medicinaDelLavoroFormazione.seoDescription,
                updatedAt: new Date()
            }
        });
        console.log('✅ Aggiornata: medicina-del-lavoro (versione completa)');
    } else {
        console.log('❌ Non trovata: medicina-del-lavoro');
    }

    // Aggiorna RSPP
    const existingRSPP = await prisma.cMSPage.findFirst({
        where: { slug: 'rspp', tenantId: TENANT_FORMAZIONE }
    });

    if (existingRSPP) {
        await prisma.cMSPage.update({
            where: { id: existingRSPP.id },
            data: {
                title: rsppFormazione.title,
                content: rsppFormazione.content,
                seoTitle: rsppFormazione.seoTitle,
                seoDescription: rsppFormazione.seoDescription,
                updatedAt: new Date()
            }
        });
        console.log('✅ Aggiornata: rspp (versione completa)');
    } else {
        console.log('❌ Non trovata: rspp');
    }

    console.log('\n✅ Pagine Element Formazione aggiornate!\n');
}

async function createElementMedicaPages() {
    console.log('\n📄 CREAZIONE PAGINE ELEMENT MEDICA');
    console.log('==================================\n');

    // Verifica/crea tenant Element Medica
    let tenantMedica = await prisma.tenant.findFirst({
        where: { id: TENANT_MEDICA }
    });

    if (!tenantMedica) {
        tenantMedica = await prisma.tenant.create({
            data: {
                id: TENANT_MEDICA,
                name: 'Element Medica',
                slug: 'element-medica',
                domain: 'elementmedica.it',
                isActive: true,
                settings: {
                    theme: 'medical',
                    primaryColor: '#0d9488',
                    logo: '/assets/logos/element-medica-logo.svg'
                }
            }
        });
        console.log('✅ Creato tenant: Element Medica');
    } else {
        console.log('⏭️  Tenant Element Medica già esistente');
    }

    const pagesToCreate = [
        homepageMedica,
        medicinaDelLavoroMedica,
        visiteSpecialisticheMedica,
        diagnosticaMedica,
        contattiMedica,
        prenotaMedica
    ];

    for (const pageData of pagesToCreate) {
        const existing = await prisma.cMSPage.findFirst({
            where: { slug: pageData.slug, tenantId: TENANT_MEDICA }
        });

        if (!existing) {
            await prisma.cMSPage.create({
                data: {
                    id: crypto.randomUUID(),
                    slug: pageData.slug,
                    title: pageData.title,
                    content: pageData.content,
                    blocks: pageData.blocks || [],
                    layout: pageData.layout || 'full-width',
                    status: pageData.status || 'published',
                    seoTitle: pageData.seoTitle,
                    seoDescription: pageData.seoDescription,
                    isPublished: true,
                    publishedAt: new Date(),
                    tenantId: TENANT_MEDICA
                }
            });
            console.log(`✅ Creata: ${pageData.slug}`);
        } else {
            await prisma.cMSPage.update({
                where: { id: existing.id },
                data: {
                    title: pageData.title,
                    content: pageData.content,
                    seoTitle: pageData.seoTitle,
                    seoDescription: pageData.seoDescription,
                    updatedAt: new Date()
                }
            });
            console.log(`🔄 Aggiornata: ${pageData.slug}`);
        }
    }

    console.log('\n✅ Pagine Element Medica create/aggiornate!\n');
}

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║   AGGIORNAMENTO COMPLETO PAGINE CMS                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    try {
        await updateElementFormazionePages();
        await createElementMedicaPages();

        // Riepilogo finale
        console.log('\n📊 RIEPILOGO FINALE');
        console.log('===================\n');

        const formazionePages = await prisma.cMSPage.count({ where: { tenantId: TENANT_FORMAZIONE } });
        const medicaPages = await prisma.cMSPage.count({ where: { tenantId: TENANT_MEDICA } });

        console.log(`Element Formazione: ${formazionePages} pagine`);
        console.log(`Element Medica: ${medicaPages} pagine`);

        console.log('\n✅ OPERAZIONE COMPLETATA CON SUCCESSO!\n');

    } catch (error) {
        console.error('\n❌ Errore:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

main();
