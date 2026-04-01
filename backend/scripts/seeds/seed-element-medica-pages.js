/**
 * Script per creare/aggiornare le pagine CMS di Element Medica
 * Rende le pagine complete e professionali come quelle di Element Sicurezza
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tenant ID resolved dynamically (see seedElementMedicaPages)
let ELEMENT_MEDICA_TENANT_ID = null;

// =====================================================
// HOMEPAGE ELEMENT MEDICA - VERSIONE COMPLETA
// =====================================================
const medicaHomepageContent = {
    hero: {
        title: "Il Tuo Centro Medico",
        subtitle: "di Fiducia",
        description: "Visite specialistiche, diagnostica avanzata e medicina del lavoro in un unico centro. Tecnologie all'avanguardia e medici esperti per la tua salute.",
        primaryButton: {
            text: "Prenota Visita",
            href: "/prenota",
            icon: "Calendar"
        },
        secondaryButton: {
            text: "Scopri i Servizi",
            href: "/servizi",
            icon: "ArrowRight"
        },
        stats: [
            { icon: "Users", number: "25.000+", label: "Pazienti Soddisfatti" },
            { icon: "Stethoscope", number: "50+", label: "Specialisti" },
            { icon: "Award", number: "15", label: "Anni di Esperienza" },
            { icon: "Heart", number: "98%", label: "Soddisfazione" }
        ],
        backgroundVariant: "medical-gradient"
    },
    services: {
        sectionTitle: "I Nostri Servizi",
        sectionSubtitle: "Un'offerta completa per la tua salute e quella della tua azienda",
        items: [
            {
                icon: "Stethoscope",
                title: "Medicina del Lavoro",
                description: "Sorveglianza sanitaria completa con medici competenti certificati. Protocolli personalizzati e gestione digitale.",
                color: "teal",
                link: "/medicina-del-lavoro",
                details: [
                    { label: "Visite preventive e periodiche" },
                    { label: "Idoneità lavorativa" },
                    { label: "Gestione cartelle sanitarie" }
                ]
            },
            {
                icon: "Heart",
                title: "Visite Specialistiche",
                description: "Oltre 30 specialità mediche con professionisti di alto livello. Diagnosi accurate e piani terapeutici personalizzati.",
                color: "blue",
                link: "/visite-specialistiche",
                details: [
                    { label: "Cardiologia e pneumologia" },
                    { label: "Ortopedia e neurologia" },
                    { label: "Dermatologia e oculistica" }
                ]
            },
            {
                icon: "Scan",
                title: "Diagnostica per Immagini",
                description: "Tecnologie di ultima generazione per diagnosi precise. Ecografie, radiografie, risonanze magnetiche e TAC.",
                color: "purple",
                link: "/diagnostica",
                details: [
                    { label: "Ecografie multidistretto" },
                    { label: "Radiologia digitale" },
                    { label: "RM e TAC" }
                ]
            },
            {
                icon: "TestTube2",
                title: "Laboratorio Analisi",
                description: "Analisi cliniche complete con refertazione rapida. Oltre 1000 test disponibili con risultati in giornata.",
                color: "orange",
                link: "/laboratorio",
                details: [
                    { label: "Esami del sangue completi" },
                    { label: "Analisi urine e feci" },
                    { label: "Test allergologici" }
                ]
            }
        ]
    },
    whyChooseUs: {
        sectionTitle: "Perché Scegliere Element Medica",
        sectionSubtitle: "La qualità che fa la differenza",
        items: [
            {
                icon: "Award",
                title: "Eccellenza Medica",
                description: "Team di specialisti con esperienza pluriennale e formazione continua",
                color: "blue"
            },
            {
                icon: "Clock",
                title: "Tempi Rapidi",
                description: "Appuntamenti in tempi brevi e referti disponibili rapidamente",
                color: "green"
            },
            {
                icon: "Cpu",
                title: "Tecnologia Avanzata",
                description: "Strumentazione diagnostica di ultima generazione per diagnosi precise",
                color: "purple"
            },
            {
                icon: "MapPin",
                title: "Posizione Strategica",
                description: "Facilmente raggiungibile con ampio parcheggio gratuito",
                color: "teal"
            },
            {
                icon: "CreditCard",
                title: "Prezzi Trasparenti",
                description: "Tariffe chiare e competitive, convenzioni con fondi e assicurazioni",
                color: "orange"
            },
            {
                icon: "HeadphonesIcon",
                title: "Assistenza Dedicata",
                description: "Supporto personalizzato per ogni tua esigenza sanitaria",
                color: "indigo"
            }
        ]
    },
    numbers: {
        title: "I Numeri che Parlano",
        items: [
            { icon: "Users", value: "25.000+", label: "Pazienti all'Anno" },
            { icon: "Stethoscope", value: "50+", label: "Medici Specialisti" },
            { icon: "Building2", value: "3.000+", label: "Aziende Clienti" },
            { icon: "Award", value: "15", label: "Anni di Esperienza" }
        ]
    },
    testimonials: {
        sectionTitle: "Cosa Dicono i Nostri Pazienti",
        items: [
            {
                name: "Marco Bianchi",
                role: "Imprenditore",
                quote: "Professionalità e competenza eccezionali. Il servizio di medicina del lavoro ha semplificato enormemente la gestione sanitaria della mia azienda.",
                rating: 5
            },
            {
                name: "Laura Verdi",
                role: "Paziente",
                quote: "Finalmente un centro medico dove ti senti davvero seguito. Tempi rapidi per le visite e personale gentilissimo.",
                rating: 5
            },
            {
                name: "Giuseppe Rossi",
                role: "HR Manager",
                quote: "Collaboriamo da anni per la sorveglianza sanitaria. Servizio impeccabile e sempre disponibili per le urgenze.",
                rating: 5
            }
        ]
    },
    cta: {
        title: "Prenota la Tua Visita Oggi",
        subtitle: "Il nostro team è pronto ad accoglierti",
        description: "Chiamaci o prenota online. Prima visita con sconto del 20% per i nuovi pazienti.",
        primaryButton: {
            text: "Prenota Online",
            href: "/prenota",
            icon: "Calendar"
        },
        secondaryButton: {
            text: "Chiama: +39 351 318 1574",
            href: "tel:+393513181574",
            icon: "Phone"
        },
        badges: [
            "✓ Prenotazione in 2 minuti",
            "✓ Conferma immediata",
            "✓ Promemoria automatico"
        ]
    },
    emergency: {
        title: 'Contatto Rapido',
        subtitle: 'Siamo qui per aiutarti',
        phone: '+39 351 318 1574',
        email: 'info@elementmedica.com',
        hours: 'Lun-Ven 8:00-20:00 | Sab 8:00-13:00',
        ctaText: 'Prenota Ora',
        ctaHref: '/prenota'
    },
    metadata: {
        title: "Element Medica - Centro Medico Polispecialistico",
        description: "Centro medico polispecialistico con medicina del lavoro, visite specialistiche e diagnostica avanzata. Prenota la tua visita.",
        keywords: ["centro medico", "medicina del lavoro", "visite specialistiche", "diagnostica", "poliambulatorio"]
    }
};

// =====================================================
// MEDICINA DEL LAVORO - VERSIONE COMPLETA
// =====================================================
const medicaMedicinaDelLavoroContent = {
    hero: {
        title: "Medicina del Lavoro",
        subtitle: "per la Tua Azienda",
        description: "Sorveglianza sanitaria professionale con medici competenti specializzati. Protocolli personalizzati, gestione digitale e conformità garantita.",
        primaryButton: {
            text: "Richiedi Preventivo",
            href: "/contatti",
            icon: "ArrowRight"
        },
        secondaryButton: {
            text: "Chiama: +39 351 318 1574",
            href: "tel:+393513181574",
            icon: "Phone"
        },
        stats: [
            { icon: "Building2", number: "3.000+", label: "Aziende Servite" },
            { icon: "Users", number: "50.000+", label: "Lavoratori Visitati" },
            { icon: "CheckCircle", number: "100%", label: "Conformità Garantita" },
            { icon: "Clock", number: "24h", label: "Tempo Risposta" }
        ],
        backgroundVariant: "medical-gradient"
    },
    introduction: {
        title: "La Sorveglianza Sanitaria è un Obbligo di Legge",
        content: "Il D.Lgs. 81/08 impone al datore di lavoro di sottoporre i dipendenti a sorveglianza sanitaria quando esposti a rischi specifici. Element Medica offre un servizio completo di medicina del lavoro con medici competenti certificati, gestione digitale delle pratiche e supporto continuo per la conformità normativa.",
        highlights: [
            { icon: "Shield", title: "Conformità Garantita", description: "Rispetto di tutti gli obblighi normativi" },
            { icon: "FileText", title: "Documentazione Completa", description: "Gestione digitale di tutte le pratiche" },
            { icon: "Clock", title: "Tempi Certi", description: "Programmazione visite in 48h" }
        ]
    },
    services: {
        sectionTitle: "I Nostri Servizi di Medicina del Lavoro",
        sectionSubtitle: "Soluzioni complete per la salute dei tuoi dipendenti",
        items: [
            {
                icon: "Stethoscope",
                title: "Visite Mediche Preventive",
                description: "Valutazione dello stato di salute prima dell'assunzione o del cambio mansione",
                color: "teal",
                details: [
                    { label: "Visita medica completa", desc: "Anamnesi e esame obiettivo" },
                    { label: "Esami strumentali", desc: "Spirometria, audiometria, visiotest" },
                    { label: "Esami ematochimici", desc: "Analisi del sangue e urine" },
                    { label: "Giudizio di idoneità", desc: "Rilascio immediato" }
                ]
            },
            {
                icon: "UserCheck",
                title: "Visite Periodiche",
                description: "Monitoraggio costante della salute dei lavoratori secondo il protocollo sanitario",
                color: "blue",
                details: [
                    { label: "Controlli programmati", desc: "Secondo frequenza prevista" },
                    { label: "Aggiornamento cartella", desc: "Documentazione digitale" },
                    { label: "Alert scadenze", desc: "Notifiche automatiche" },
                    { label: "Report statistici", desc: "Analisi trend salute" }
                ]
            },
            {
                icon: "Activity",
                title: "Visite su Richiesta",
                description: "Visite straordinarie per cambio mansione, rientro malattia o su richiesta del lavoratore",
                color: "purple",
                details: [
                    { label: "Cambio mansione", desc: "Nuova valutazione rischi" },
                    { label: "Rientro malattia", desc: "Oltre 60 giorni continuativi" },
                    { label: "Richiesta lavoratore", desc: "Art. 41 D.Lgs. 81/08" },
                    { label: "Fine rapporto", desc: "Ove previsto" }
                ]
            },
            {
                icon: "Syringe",
                title: "Accertamenti Specialistici",
                description: "Esami diagnostici e visite specialistiche correlate ai rischi lavorativi",
                color: "orange",
                details: [
                    { label: "Spirometria", desc: "Funzionalità respiratoria" },
                    { label: "Audiometria", desc: "Capacità uditiva" },
                    { label: "ECG", desc: "Funzionalità cardiaca" },
                    { label: "Drug test", desc: "Mansioni a rischio" }
                ]
            }
        ]
    },
    process: {
        sectionTitle: "Come Funziona il Nostro Servizio",
        steps: [
            {
                icon: "FileSearch",
                title: "Analisi Iniziale",
                description: "Valutiamo il DVR aziendale e identifichiamo i rischi per definire il protocollo sanitario",
                color: "blue"
            },
            {
                icon: "ClipboardList",
                title: "Protocollo Sanitario",
                description: "Il medico competente redige il protocollo con esami e frequenza per ogni mansione",
                color: "green"
            },
            {
                icon: "Calendar",
                title: "Pianificazione Visite",
                description: "Programmiamo le visite secondo le disponibilità aziendali, anche presso la vostra sede",
                color: "purple"
            },
            {
                icon: "Stethoscope",
                title: "Esecuzione Visite",
                description: "Visita medica completa con tutti gli accertamenti previsti dal protocollo",
                color: "teal"
            },
            {
                icon: "RefreshCw",
                title: "Monitoraggio Continuo",
                description: "Sistema di alert per scadenze e reportistica sempre aggiornata",
                color: "orange"
            }
        ]
    },
    advantages: {
        sectionTitle: "I Vantaggi di Scegliere Element Medica",
        items: [
            { icon: "Zap", title: "Velocità", description: "Visite programmate in 48h, referti immediati" },
            { icon: "MapPin", title: "Flessibilità", description: "Visite presso la nostra sede o direttamente in azienda" },
            { icon: "FileDigit", title: "Digitalizzazione", description: "Gestione completa online di documenti e scadenze" },
            { icon: "Bell", title: "Alert Automatici", description: "Notifiche per scadenze visite e documenti" },
            { icon: "HeadphonesIcon", title: "Supporto Dedicato", description: "Un referente sempre a disposizione per la tua azienda" },
            { icon: "Shield", title: "Conformità", description: "Garanzia di rispetto di tutti gli adempimenti di legge" }
        ]
    },
    whenRequired: {
        title: "Quando è Obbligatoria la Sorveglianza Sanitaria?",
        description: "La sorveglianza sanitaria è obbligatoria per i lavoratori esposti a specifici rischi lavorativi previsti dal D.Lgs. 81/08.",
        risks: [
            { icon: "Volume2", title: "Rumore", description: "Esposizione superiore a 80 dB(A)" },
            { icon: "Monitor", title: "Videoterminali", description: "Utilizzo sistematico per oltre 20h/settimana" },
            { icon: "FlaskConical", title: "Agenti Chimici", description: "Esposizione a sostanze pericolose" },
            { icon: "Dumbbell", title: "Movimentazione Carichi", description: "Sollevamento e trasporto manuale" },
            { icon: "Vibrate", title: "Vibrazioni", description: "Esposizione a vibrazioni mano-braccio o corpo intero" },
            { icon: "Bug", title: "Agenti Biologici", description: "Rischio di esposizione a patogeni" },
            { icon: "Moon", title: "Lavoro Notturno", description: "Prestazioni in orario notturno continuativo" },
            { icon: "Car", title: "Guida Professionale", description: "Autisti, carrellisti, gruisti" }
        ]
    },
    medicalExam: {
        title: "I Giudizi di Idoneità",
        description: "Al termine della visita medica, il medico competente esprime un giudizio di idoneità che può essere:",
        judgments: [
            {
                icon: "CheckCircle",
                title: "Idoneità",
                description: "Il lavoratore può svolgere la mansione senza limitazioni",
                color: "green"
            },
            {
                icon: "AlertCircle",
                title: "Idoneità con Prescrizioni",
                description: "Idoneità subordinata a specifiche limitazioni o prescrizioni",
                color: "yellow"
            },
            {
                icon: "AlertTriangle",
                title: "Idoneità Temporanea",
                description: "Limitazioni temporanee con rivalutazione a scadenza",
                color: "orange"
            },
            {
                icon: "XCircle",
                title: "Non Idoneità",
                description: "Impossibilità di svolgere la mansione specifica",
                color: "red"
            }
        ]
    },
    normativa: {
        title: "Riferimenti Normativi",
        items: [
            {
                title: "D.Lgs. 81/2008",
                description: "Testo Unico sulla Sicurezza sul Lavoro - Articoli 38-42",
                link: "#"
            },
            {
                title: "D.M. 388/2003",
                description: "Regolamento sul primo soccorso aziendale",
                link: "#"
            },
            {
                title: "Accordo Stato-Regioni",
                description: "Formazione RSPP e lavoratori",
                link: "#"
            }
        ]
    },
    faq: {
        sectionTitle: "Domande Frequenti",
        items: [
            {
                question: "Quanto costa il servizio di medicina del lavoro?",
                answer: "Il costo dipende dal numero di dipendenti, dalla tipologia di rischi e dalla frequenza delle visite. Richiedi un preventivo personalizzato gratuito."
            },
            {
                question: "Potete effettuare le visite nella nostra sede?",
                answer: "Sì, offriamo servizio di medicina del lavoro presso la vostra azienda con unità mobile attrezzata per tutti gli accertamenti."
            },
            {
                question: "Quali sono i tempi per organizzare le visite?",
                answer: "Generalmente programmiamo le visite entro 48-72 ore dalla richiesta. Per urgenze, offriamo disponibilità anche in giornata."
            },
            {
                question: "Come gestite le scadenze delle visite?",
                answer: "Il nostro sistema invia alert automatici 30 e 15 giorni prima della scadenza, sia via email che tramite il portale dedicato."
            },
            {
                question: "Rilasciate il giudizio di idoneità in giornata?",
                answer: "Sì, il giudizio di idoneità viene rilasciato al termine della visita. Gli esiti degli esami di laboratorio sono disponibili entro 24-48h."
            }
        ]
    },
    cta: {
        title: "Richiedi un Preventivo Gratuito",
        subtitle: "Scopri quanto puoi risparmiare con Element Medica",
        description: "Compila il form o chiamaci per ricevere un preventivo personalizzato entro 24 ore.",
        primaryButton: {
            text: "Richiedi Preventivo",
            href: "/contatti",
            icon: "ArrowRight"
        },
        secondaryButton: {
            text: "Chiama: +39 351 318 1574",
            href: "tel:+393513181574",
            icon: "Phone"
        },
        badges: [
            "✓ Preventivo in 24h",
            "✓ Nessun impegno",
            "✓ Consulenza gratuita"
        ]
    },
    emergency: {
        title: 'Contatto Rapido',
        subtitle: 'Siamo qui per aiutarti',
        phone: '+39 351 318 1574',
        email: 'info@elementmedica.com',
        hours: 'Lun-Ven 8:00-20:00 | Sab 8:00-13:00',
        ctaText: 'Richiedi Preventivo',
        ctaHref: '/contatti'
    },
    metadata: {
        title: "Medicina del Lavoro - Element Medica",
        description: "Servizi completi di medicina del lavoro: visite preventive, periodiche, protocolli sanitari. Medici competenti certificati. Richiedi preventivo gratuito.",
        keywords: ["medicina del lavoro", "medico competente", "sorveglianza sanitaria", "visite periodiche", "idoneità lavorativa"]
    }
};

// =====================================================
// VISITE SPECIALISTICHE - VERSIONE ESPANSA
// =====================================================
const medicaVisiteSpecialisticheContent = {
    hero: {
        title: "Visite Specialistiche",
        subtitle: "con i Migliori Professionisti",
        description: "Oltre 30 specialità mediche con professionisti di alto livello. Diagnosi accurate, piani terapeutici personalizzati e tempi di attesa ridotti.",
        primaryButton: {
            text: "Prenota Visita",
            href: "/prenota",
            icon: "Calendar"
        },
        secondaryButton: {
            text: "Tutte le Specialità",
            href: "#specialita",
            icon: "ArrowRight"
        },
        stats: [
            { icon: "Stethoscope", number: "30+", label: "Specialità" },
            { icon: "Users", number: "50+", label: "Specialisti" },
            { icon: "Clock", number: "48h", label: "Tempo Appuntamento" },
            { icon: "Heart", number: "98%", label: "Soddisfazione" }
        ],
        backgroundVariant: "gradient"
    },
    specialties: {
        sectionTitle: "Le Nostre Specialità Mediche",
        sectionSubtitle: "Un team di esperti per ogni tua esigenza di salute",
        categories: [
            {
                title: "Area Cardiologica",
                icon: "Heart",
                color: "red",
                specialists: [
                    { name: "Cardiologia", description: "Visita cardiologica, ECG, Holter, Ecocardiogramma" },
                    { name: "Angiologia", description: "Patologie vascolari, Eco-Doppler arti" },
                    { name: "Chirurgia Vascolare", description: "Varici, patologie arteriose" }
                ]
            },
            {
                title: "Area Neurologica",
                icon: "Brain",
                color: "purple",
                specialists: [
                    { name: "Neurologia", description: "Cefalee, vertigini, neuropatie" },
                    { name: "Neurochirurgia", description: "Patologie spinali, ernie discali" },
                    { name: "Psichiatria", description: "Disturbi d'ansia, depressione" }
                ]
            },
            {
                title: "Area Ortopedica",
                icon: "Activity",
                color: "blue",
                specialists: [
                    { name: "Ortopedia", description: "Patologie osteoarticolari, traumi" },
                    { name: "Fisiatria", description: "Riabilitazione, medicina fisica" },
                    { name: "Reumatologia", description: "Artriti, patologie autoimmuni" }
                ]
            },
            {
                title: "Area Digestiva",
                icon: "Stethoscope",
                color: "green",
                specialists: [
                    { name: "Gastroenterologia", description: "Patologie digestive, endoscopia" },
                    { name: "Proctologia", description: "Emorroidi, ragadi, fistole" },
                    { name: "Nutrizione", description: "Diete personalizzate, intolleranze" }
                ]
            },
            {
                title: "Area Sensoriale",
                icon: "Eye",
                color: "teal",
                specialists: [
                    { name: "Oculistica", description: "Visite oculistiche, campo visivo" },
                    { name: "Otorinolaringoiatria", description: "Audiometria, patologie ORL" },
                    { name: "Audiologia", description: "Disturbi dell'udito, protesi" }
                ]
            },
            {
                title: "Area Dermatologica",
                icon: "Scan",
                color: "orange",
                specialists: [
                    { name: "Dermatologia", description: "Patologie cutanee, mappatura nei" },
                    { name: "Allergologia", description: "Test allergologici, immunoterapia" },
                    { name: "Medicina Estetica", description: "Trattamenti anti-aging" }
                ]
            }
        ]
    },
    features: {
        sectionTitle: "Perché Scegliere le Nostre Visite Specialistiche",
        items: [
            {
                icon: "Award",
                title: "Specialisti di Alto Livello",
                description: "Team di medici con esperienza pluriennale e formazione continua presso i migliori centri italiani ed europei"
            },
            {
                icon: "Clock",
                title: "Tempi di Attesa Ridotti",
                description: "Appuntamenti disponibili entro 48 ore per la maggior parte delle specialità"
            },
            {
                icon: "Cpu",
                title: "Tecnologia Avanzata",
                description: "Strumentazione diagnostica di ultima generazione per diagnosi accurate"
            },
            {
                icon: "FileText",
                title: "Refertazione Rapida",
                description: "Referti disponibili entro 24-48 ore, accessibili online dal portale paziente"
            },
            {
                icon: "CreditCard",
                title: "Convenzioni Attive",
                description: "Convenzioni con i principali fondi sanitari e assicurazioni per tariffe agevolate"
            },
            {
                icon: "HeadphonesIcon",
                title: "Assistenza Dedicata",
                description: "Staff dedicato per supportarti nella prenotazione e nel follow-up"
            }
        ]
    },
    pricing: {
        sectionTitle: "Tariffe Trasparenti",
        sectionSubtitle: "Prezzi chiari e competitivi per tutte le specialità",
        categories: [
            {
                name: "Visite Base",
                price: "da €80",
                items: ["Prima visita specialistica", "Visita di controllo", "Consulto medico"]
            },
            {
                name: "Visite con Esami",
                price: "da €120",
                items: ["Visita + ECG", "Visita + Ecografia", "Visita + Esami strumentali"]
            },
            {
                name: "Pacchetti Prevenzione",
                price: "da €150",
                items: ["Check-up cardiologico", "Check-up donna", "Check-up uomo"]
            }
        ],
        note: "Tariffe speciali per convenzioni aziendali e fondi sanitari"
    },
    process: {
        sectionTitle: "Come Prenotare una Visita",
        steps: [
            {
                icon: "Calendar",
                title: "Scegli la Specialità",
                description: "Seleziona la specialità e lo specialista preferito"
            },
            {
                icon: "Clock",
                title: "Prenota l'Appuntamento",
                description: "Scegli data e ora tra le disponibilità"
            },
            {
                icon: "CreditCard",
                title: "Conferma la Prenotazione",
                description: "Ricevi conferma via email e SMS"
            },
            {
                icon: "Stethoscope",
                title: "Effettua la Visita",
                description: "Presentati 10 minuti prima con tessera sanitaria"
            }
        ]
    },
    faq: {
        sectionTitle: "Domande Frequenti",
        items: [
            {
                question: "Devo portare documentazione per la visita?",
                answer: "Ti consigliamo di portare tessera sanitaria, eventuali referti precedenti e l'elenco dei farmaci che assumi."
            },
            {
                question: "Come accedo ai referti online?",
                answer: "I referti sono disponibili nell'area riservata del nostro portale paziente entro 24-48 ore dalla visita."
            },
            {
                question: "Posso disdire o spostare l'appuntamento?",
                answer: "Sì, puoi disdire o spostare l'appuntamento fino a 24 ore prima senza penali, chiamando o dal portale online."
            },
            {
                question: "Accettate convenzioni con fondi sanitari?",
                answer: "Sì, siamo convenzionati con i principali fondi sanitari (Unisalute, Previmedical, FASI, ecc.) e assicurazioni."
            }
        ]
    },
    cta: {
        title: "Prenota la Tua Visita Specialistica",
        subtitle: "Il nostro team è pronto ad accoglierti",
        description: "Scegli la specialità e prenota online in pochi click. Prima visita con sconto del 15% per i nuovi pazienti.",
        primaryButton: {
            text: "Prenota Online",
            href: "/prenota",
            icon: "Calendar"
        },
        secondaryButton: {
            text: "Chiama: +39 351 318 1574",
            href: "tel:+393513181574",
            icon: "Phone"
        },
        badges: [
            "✓ Appuntamento in 48h",
            "✓ Sconto nuovi pazienti",
            "✓ Convenzioni attive"
        ]
    },
    emergency: {
        title: 'Contatto Rapido',
        subtitle: 'Siamo qui per aiutarti',
        phone: '+39 351 318 1574',
        email: 'info@elementmedica.com',
        hours: 'Lun-Ven 8:00-20:00 | Sab 8:00-13:00',
        ctaText: 'Prenota Visita',
        ctaHref: '/prenota'
    },
    metadata: {
        title: "Visite Specialistiche - Element Medica",
        description: "Oltre 30 specialità mediche con i migliori professionisti. Cardiologia, neurologia, ortopedia e molto altro. Prenota la tua visita.",
        keywords: ["visite specialistiche", "cardiologia", "neurologia", "ortopedia", "dermatologia", "oculistica", "poliambulatorio"]
    }
};

// =====================================================
// DIAGNOSTICA - VERSIONE ESPANSA
// =====================================================
const medicaDiagnosticaContent = {
    hero: {
        title: "Diagnostica per Immagini",
        subtitle: "Tecnologia all'Avanguardia",
        description: "Strumentazione di ultima generazione per diagnosi precise e tempestive. Ecografie, radiografie, risonanze magnetiche e TAC con refertazione rapida.",
        primaryButton: {
            text: "Prenota Esame",
            href: "/prenota",
            icon: "Calendar"
        },
        secondaryButton: {
            text: "Scopri i Servizi",
            href: "#servizi",
            icon: "ArrowRight"
        },
        stats: [
            { icon: "Scan", number: "15+", label: "Esami Disponibili" },
            { icon: "Cpu", number: "100%", label: "Digitale" },
            { icon: "Clock", number: "24h", label: "Referti" },
            { icon: "Award", number: "HD", label: "Alta Definizione" }
        ],
        backgroundVariant: "gradient"
    },
    services: {
        sectionTitle: "I Nostri Servizi Diagnostici",
        sectionSubtitle: "Tecnologie avanzate per diagnosi accurate",
        items: [
            {
                icon: "Scan",
                title: "Ecografia Multidistretto",
                description: "Ecografie di tutti i distretti corporei con apparecchiature di ultima generazione",
                color: "teal",
                exams: [
                    "Ecografia addome completo",
                    "Ecografia tiroide e collo",
                    "Ecografia muscolo-tendinea",
                    "Ecografia mammaria",
                    "Ecografia prostatica",
                    "Eco-Doppler vasi"
                ]
            },
            {
                icon: "Activity",
                title: "Radiologia Digitale",
                description: "Radiografie con tecnologia digitale per immagini ad alta definizione e bassa dose",
                color: "blue",
                exams: [
                    "RX torace",
                    "RX colonna vertebrale",
                    "RX articolazioni",
                    "RX apparato scheletrico",
                    "Ortopantomografia",
                    "Teleradiografia"
                ]
            },
            {
                icon: "Brain",
                title: "Risonanza Magnetica",
                description: "RM aperta e chiusa per studi neurologici, ortopedici e addominali",
                color: "purple",
                exams: [
                    "RM encefalo",
                    "RM colonna vertebrale",
                    "RM articolazioni",
                    "RM addome",
                    "Angio-RM",
                    "RM mammaria"
                ]
            },
            {
                icon: "Cpu",
                title: "TAC - Tomografia Computerizzata",
                description: "TC multistrato per studi dettagliati con ricostruzioni 3D",
                color: "orange",
                exams: [
                    "TC encefalo",
                    "TC torace",
                    "TC addome",
                    "TC colonna",
                    "Angio-TC",
                    "Dentalscan"
                ]
            },
            {
                icon: "Heart",
                title: "Diagnostica Cardiologica",
                description: "Esami specializzati per la valutazione della funzionalità cardiaca",
                color: "red",
                exams: [
                    "Elettrocardiogramma (ECG)",
                    "Ecocardiogramma",
                    "Holter ECG 24h",
                    "Holter pressorio",
                    "Test da sforzo",
                    "Eco-stress"
                ]
            },
            {
                icon: "Activity",
                title: "Altre Diagnostiche",
                description: "Esami specialistici per diverse esigenze cliniche",
                color: "green",
                exams: [
                    "Spirometria",
                    "Elettromiografia",
                    "Potenziali evocati",
                    "Polisonnografia",
                    "MOC - Densitometria ossea",
                    "Elettroencefalogramma"
                ]
            }
        ]
    },
    technology: {
        sectionTitle: "La Nostra Tecnologia",
        sectionSubtitle: "Strumentazione di ultima generazione per la tua sicurezza",
        items: [
            {
                icon: "Cpu",
                title: "Apparecchiature Digitali",
                description: "Tutte le nostre strumentazioni sono digitali di ultima generazione, garantendo immagini ad alta definizione"
            },
            {
                icon: "Shield",
                title: "Bassa Dose Radiazioni",
                description: "Protocolli ottimizzati per la minima esposizione alle radiazioni nel pieno rispetto delle normative"
            },
            {
                icon: "Clock",
                title: "Refertazione Rapida",
                description: "Referti disponibili entro 24-48 ore, urgenti in giornata, consultabili online"
            },
            {
                icon: "Award",
                title: "Certificazioni",
                description: "Centro autorizzato dalla Regione, strumentazioni certificate e personale qualificato"
            }
        ]
    },
    pricing: {
        sectionTitle: "Tariffe Diagnostica",
        categories: [
            {
                name: "Ecografie",
                items: [
                    { name: "Ecografia singolo distretto", price: "€60" },
                    { name: "Ecografia addome completo", price: "€80" },
                    { name: "Eco-Doppler", price: "€90" }
                ]
            },
            {
                name: "Radiologia",
                items: [
                    { name: "RX singolo segmento", price: "€40" },
                    { name: "RX torace", price: "€45" },
                    { name: "Ortopantomografia", price: "€50" }
                ]
            },
            {
                name: "RM e TAC",
                items: [
                    { name: "RM singolo segmento", price: "€180" },
                    { name: "TC singolo segmento", price: "€150" },
                    { name: "RM con mezzo di contrasto", price: "€250" }
                ]
            }
        ],
        note: "Prezzi IVA inclusa. Tariffe agevolate per convenzioni."
    },
    preparation: {
        sectionTitle: "Preparazione agli Esami",
        sectionSubtitle: "Informazioni utili per una corretta esecuzione degli esami",
        exams: [
            {
                name: "Ecografia Addome",
                icon: "Scan",
                instructions: [
                    "Digiuno da almeno 6 ore",
                    "Non assumere bevande gassate",
                    "Portare esami precedenti"
                ]
            },
            {
                name: "Risonanza Magnetica",
                icon: "Brain",
                instructions: [
                    "Rimuovere oggetti metallici",
                    "Segnalare pacemaker o protesi",
                    "Compilare questionario anamnestico"
                ]
            },
            {
                name: "TAC con Contrasto",
                icon: "Cpu",
                instructions: [
                    "Digiuno da 4 ore",
                    "Portare esami creatinina recente",
                    "Segnalare allergie al mezzo di contrasto"
                ]
            },
            {
                name: "MOC Densitometria",
                icon: "Activity",
                instructions: [
                    "Nessuna preparazione necessaria",
                    "Evitare assunzione calcio 24h prima",
                    "Portare eventuali MOC precedenti"
                ]
            }
        ]
    },
    faq: {
        sectionTitle: "Domande Frequenti",
        items: [
            {
                question: "Serve la prescrizione medica per gli esami?",
                answer: "Per accedere alle tariffe convenzionate è necessaria l'impegnativa del medico. Per le prestazioni private non è obbligatoria ma consigliata."
            },
            {
                question: "Quanto tempo occorre per avere i referti?",
                answer: "I referti sono generalmente disponibili entro 24-48 ore. Per urgenze cliniche è possibile richiedere la refertazione in giornata."
            },
            {
                question: "La risonanza magnetica è dolorosa?",
                answer: "No, la RM è un esame indolore. L'unico disagio può essere legato al rumore della macchina e alla posizione immobile da mantenere."
            },
            {
                question: "Posso fare una TAC se ho protesi metalliche?",
                answer: "Sì, la TAC è compatibile con le protesi metalliche. Diverso è il caso della RM dove alcune protesi possono essere controindicate."
            }
        ]
    },
    cta: {
        title: "Prenota il Tuo Esame Diagnostico",
        subtitle: "Tecnologia avanzata per diagnosi precise",
        description: "Prenota online o chiamaci per informazioni. Referti disponibili in 24-48 ore.",
        primaryButton: {
            text: "Prenota Esame",
            href: "/prenota",
            icon: "Calendar"
        },
        secondaryButton: {
            text: "Richiedi Info",
            href: "/contatti",
            icon: "MessageSquare"
        },
        badges: [
            "✓ Apparecchiature digitali",
            "✓ Referti in 24-48h",
            "✓ Bassa dose radiazioni"
        ]
    },
    emergency: {
        title: 'Contatto Rapido',
        subtitle: 'Siamo qui per aiutarti',
        phone: '+39 351 318 1574',
        email: 'info@elementmedica.com',
        hours: 'Lun-Ven 8:00-20:00 | Sab 8:00-13:00',
        ctaText: 'Prenota Esame',
        ctaHref: '/prenota'
    },
    metadata: {
        title: "Diagnostica per Immagini - Element Medica",
        description: "Centro di diagnostica per immagini: ecografie, radiografie, risonanze magnetiche, TAC. Tecnologia avanzata e refertazione rapida.",
        keywords: ["diagnostica", "ecografia", "radiografia", "risonanza magnetica", "TAC", "diagnostica per immagini"]
    }
};

// =====================================================
// CHI SIAMO - ELEMENT MEDICA
// =====================================================
const medicaChiSiamoContent = {
    hero: {
        title: "Chi Siamo",
        subtitle: "Element Medica",
        description: "Da oltre 15 anni ci prendiamo cura della salute delle persone e delle aziende con professionalità, innovazione e un approccio umano alla medicina.",
        primaryButton: {
            text: "Scopri i Servizi",
            href: "/servizi",
            icon: "ArrowRight"
        },
        secondaryButton: {
            text: "Contattaci",
            href: "/contatti",
            icon: "Phone"
        },
        backgroundVariant: "gradient"
    },
    mission: {
        title: "La Nostra Missione",
        subtitle: "Rendere l'eccellenza medica accessibile a tutti",
        description: "Crediamo che ogni persona meriti cure di qualità. La nostra missione è offrire servizi sanitari di alto livello con un approccio umano e personalizzato, utilizzando le più moderne tecnologie diagnostiche.",
        values: [
            {
                icon: "Heart",
                title: "Cura del Paziente",
                description: "Il paziente è al centro di ogni nostra decisione e azione"
            },
            {
                icon: "Award",
                title: "Eccellenza Clinica",
                description: "Standard elevati e aggiornamento continuo per i migliori risultati"
            },
            {
                icon: "Users",
                title: "Approccio Umano",
                description: "Ascolto, empatia e rispetto in ogni interazione"
            },
            {
                icon: "Cpu",
                title: "Innovazione",
                description: "Tecnologie all'avanguardia per diagnosi e cure sempre più precise"
            }
        ]
    },
    storia: {
        title: "La Nostra Storia",
        subtitle: "Un percorso di crescita e innovazione",
        timeline: [
            {
                year: "2008",
                title: "La Fondazione",
                description: "Nasce Element Medica dalla visione di un gruppo di medici specialisti",
                color: "blue"
            },
            {
                year: "2012",
                title: "Prima Espansione",
                description: "Apertura del reparto di diagnostica per immagini con tecnologie digitali",
                color: "green"
            },
            {
                year: "2015",
                title: "Centro Polispecialistico",
                description: "Ampliamento con oltre 20 specialità mediche e nuovo laboratorio analisi",
                color: "purple"
            },
            {
                year: "2018",
                title: "Eccellenza Riconosciuta",
                description: "Certificazione ISO 9001 e accreditamento regionale per tutte le attività",
                color: "orange"
            },
            {
                year: "2021",
                title: "Digitalizzazione",
                description: "Lancio del portale paziente e telemedicina per visite a distanza",
                color: "teal"
            },
            {
                year: "2024",
                title: "Nuova Sede",
                description: "Inaugurazione della nuova sede con tecnologie di ultima generazione",
                color: "indigo"
            }
        ]
    },
    team: {
        title: "Il Nostro Team",
        subtitle: "Professionisti qualificati al tuo servizio",
        description: "Un team multidisciplinare di medici specialisti, tecnici qualificati e personale dedicato all'accoglienza.",
        stats: [
            { icon: "Stethoscope", number: "50+", label: "Medici Specialisti" },
            { icon: "Users", number: "30+", label: "Staff Sanitario" },
            { icon: "Award", number: "15", label: "Anni Esperienza Media" }
        ],
        members: [
            {
                name: "Dott. Paolo Bianchi",
                role: "Direttore Sanitario",
                image: "/images/team/direttore.jpg",
                expertise: "Medicina Interna"
            },
            {
                name: "Dott.ssa Maria Rossi",
                role: "Responsabile Diagnostica",
                image: "/images/team/diagnostica.jpg",
                expertise: "Radiologia"
            },
            {
                name: "Dott. Luca Verdi",
                role: "Responsabile Medicina del Lavoro",
                image: "/images/team/medlavoro.jpg",
                expertise: "Medicina del Lavoro"
            },
            {
                name: "Dott.ssa Anna Neri",
                role: "Coordinatrice Poliambulatorio",
                image: "/images/team/poliamb.jpg",
                expertise: "Management Sanitario"
            }
        ]
    },
    numbers: {
        title: "I Numeri di Element Medica",
        items: [
            { icon: "Users", value: "25.000+", label: "Pazienti all'Anno" },
            { icon: "Building2", value: "3.000+", label: "Aziende Clienti" },
            { icon: "Stethoscope", value: "30+", label: "Specialità Mediche" },
            { icon: "Award", value: "15", label: "Anni di Attività" }
        ]
    },
    certifications: {
        title: "Le Nostre Certificazioni",
        subtitle: "Qualità garantita e riconosciuta",
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
                description: "Autorizzazione all'esercizio per tutte le specialità",
                color: "purple"
            },
            {
                icon: "Stethoscope",
                name: "SIML",
                description: "Società Italiana Medicina del Lavoro",
                color: "teal"
            }
        ]
    },
    cta: {
        title: "Vuoi Conoscerci Meglio?",
        subtitle: "Vieni a trovarci o contattaci per informazioni",
        primaryButton: {
            text: "Contattaci",
            href: "/contatti",
            icon: "Phone"
        },
        secondaryButton: {
            text: "Prenota Visita",
            href: "/prenota",
            icon: "Calendar"
        }
    },
    emergency: {
        title: 'Contatto Rapido',
        subtitle: 'Siamo qui per aiutarti',
        phone: '+39 351 318 1574',
        email: 'info@elementmedica.com',
        hours: 'Lun-Ven 8:00-20:00 | Sab 8:00-13:00',
        ctaText: 'Contattaci',
        ctaHref: '/contatti'
    },
    metadata: {
        title: "Chi Siamo - Element Medica",
        description: "Scopri Element Medica: centro medico polispecialistico con oltre 15 anni di esperienza. Team di esperti, tecnologie avanzate, approccio umano.",
        keywords: ["chi siamo", "element medica", "centro medico", "poliambulatorio", "storia", "team medico"]
    }
};

// =====================================================
// FUNZIONE PRINCIPALE - SEED
// =====================================================
async function seedElementMedicaPages() {
    console.log('🏥 Starting Element Medica CMS Pages Seed...\n');

    // Dynamically resolve tenant ID
    const tenant = await prisma.tenant.findFirst({
        where: {
            OR: [
                { slug: 'element-medica' },
                { name: 'Element Medica' }
            ]
        }
    });

    if (!tenant) {
        console.error('❌ Tenant "Element Medica" non trovato nel database!');
        return;
    }

    ELEMENT_MEDICA_TENANT_ID = tenant.id;
    console.log(`📌 Tenant ID: ${ELEMENT_MEDICA_TENANT_ID}\n`);

    const pages = [
        {
            slug: 'medica-homepage',
            title: 'Homepage - Element Medica',
            content: medicaHomepageContent
        },
        {
            slug: 'medica-medicina-del-lavoro',
            title: 'Medicina del Lavoro - Element Medica',
            content: medicaMedicinaDelLavoroContent
        },
        {
            slug: 'medica-visite-specialistiche',
            title: 'Visite Specialistiche - Element Medica',
            content: medicaVisiteSpecialisticheContent
        },
        {
            slug: 'medica-diagnostica',
            title: 'Diagnostica - Element Medica',
            content: medicaDiagnosticaContent
        },
        {
            slug: 'medica-chi-siamo',
            title: 'Chi Siamo - Element Medica',
            content: medicaChiSiamoContent
        }
    ];

    for (const page of pages) {
        try {
            // Find existing page by slug (query without tenantId fallback)
            const existing = await prisma.cMSPage.findFirst({
                where: {
                    slug: page.slug
                }
            });

            if (existing) {
                // Merge content: preserve sections from other seed scripts
                const mergedContent = { ...(existing.content || {}), ...page.content };
                await prisma.cMSPage.update({
                    where: { id: existing.id },
                    data: {
                        title: page.title,
                        content: mergedContent,
                        status: 'published',
                        isPublished: true,
                        updatedAt: new Date()
                    }
                });
                console.log(`✅ ${page.slug}: Updated (merge)`);
            } else {
                // Create new page
                await prisma.cMSPage.create({
                    data: {
                        slug: page.slug,
                        title: page.title,
                        content: page.content,
                        status: 'published',
                        isPublished: true,
                        tenantId: ELEMENT_MEDICA_TENANT_ID,
                        layout: 'full-width'
                    }
                });
                console.log(`✅ ${page.slug}: Created`);
            }
        } catch (error) {
            console.error(`❌ Error with ${page.slug}:`, error.message);
        }
    }

    console.log('\n🎉 Element Medica CMS Pages Seed Complete!');
}

// Esecuzione
seedElementMedicaPages()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
