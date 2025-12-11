/**
 * Script per Medicina del Lavoro Element Medica Premium
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TENANT_ID = 'tenant-element-medica-001';

const medicinaLavoroContent = {
  metadata: {
    theme: 'medical',
    layout: 'full-width',
    colorScheme: 'teal'
  },
  
  hero: {
    title: 'Medicina del Lavoro',
    subtitle: 'Sorveglianza Sanitaria Completa',
    tagline: 'Partner per la Salute della Tua Azienda',
    description: 'Servizi completi di medicina del lavoro per aziende di ogni dimensione. Medico Competente qualificato, visite preventive e periodiche, protocolli sanitari personalizzati e gestione documentale integrata.',
    primaryButton: {
      text: 'Richiedi Preventivo',
      href: '/medica-contatti',
      icon: 'FileText'
    },
    secondaryButton: {
      text: 'I Nostri Servizi',
      href: '#servizi',
      icon: 'ArrowRight'
    },
    backgroundVariant: 'medical-work',
    stats: [
      { number: '500+', label: 'Aziende Clienti', icon: 'Building2' },
      { number: '25.000+', label: 'Visite Annuali', icon: 'Clipboard' },
      { number: '15+', label: 'Medici Competenti', icon: 'Stethoscope' },
      { number: '100%', label: 'Conformità Normativa', icon: 'Shield' }
    ]
  },

  services: {
    title: 'Servizi di Medicina del Lavoro',
    subtitle: 'Una gamma completa di servizi per la tua azienda',
    items: [
      {
        icon: 'UserCheck',
        title: 'Medico Competente',
        description: 'Nomina e servizio di Medico Competente aziendale secondo D.Lgs. 81/08. Consulenza continua e supporto nella gestione sanitaria.',
        features: [
          'Nomina formale MC',
          'Sopralluoghi periodici',
          'Riunione periodica annuale',
          'Consulenza su rischi specifici'
        ],
        colorScheme: 'teal'
      },
      {
        icon: 'ClipboardCheck',
        title: 'Visite Preventive',
        description: 'Visite mediche preventive in fase preassuntiva per valutare l\'idoneità alla mansione specifica prima dell\'assunzione.',
        features: [
          'Valutazione idoneità',
          'Esami strumentali',
          'Rilascio giudizio',
          'Documentazione completa'
        ],
        colorScheme: 'emerald'
      },
      {
        icon: 'Calendar',
        title: 'Visite Periodiche',
        description: 'Sorveglianza sanitaria periodica secondo il protocollo sanitario aziendale. Monitoraggio continuo della salute dei lavoratori.',
        features: [
          'Cadenza personalizzata',
          'Esami specifici per rischio',
          'Aggiornamento cartella sanitaria',
          'Alert automatici scadenze'
        ],
        colorScheme: 'cyan'
      },
      {
        icon: 'FileSearch',
        title: 'Visite Straordinarie',
        description: 'Visite su richiesta del lavoratore o a seguito di cambio mansione, rientro da malattia prolungata o infortunio.',
        features: [
          'Richiesta lavoratore',
          'Cambio mansione',
          'Rientro malattia >60gg',
          'Post infortunio'
        ],
        colorScheme: 'blue'
      },
      {
        icon: 'FileText',
        title: 'Protocollo Sanitario',
        description: 'Elaborazione del protocollo sanitario aziendale basato sulla valutazione dei rischi (DVR) e sulle mansioni presenti.',
        features: [
          'Analisi DVR',
          'Definizione accertamenti',
          'Periodicità visite',
          'Aggiornamenti normativi'
        ],
        colorScheme: 'purple'
      },
      {
        icon: 'Laptop',
        title: 'Gestione Documentale',
        description: 'Sistema informatizzato per la gestione delle cartelle sanitarie, scadenze e documentazione. Accesso riservato 24/7.',
        features: [
          'Portale aziendale dedicato',
          'Alert scadenze automatici',
          'Report statistici',
          'Archivio digitale sicuro'
        ],
        colorScheme: 'indigo'
      }
    ]
  },

  examsOffered: {
    title: 'Esami e Accertamenti',
    subtitle: 'Tutti gli esami previsti dalla sorveglianza sanitaria',
    categories: [
      {
        name: 'Esami Strumentali',
        icon: 'Activity',
        items: [
          'Spirometria',
          'Audiometria',
          'Visiotest',
          'Elettrocardiogramma',
          'Test cardiovascolare da sforzo'
        ]
      },
      {
        name: 'Esami di Laboratorio',
        icon: 'FlaskConical',
        items: [
          'Emocromo completo',
          'Profilo epatico',
          'Profilo renale',
          'Glicemia',
          'Esame urine',
          'Drug test'
        ]
      },
      {
        name: 'Visite Specialistiche',
        icon: 'Stethoscope',
        items: [
          'Oculistica',
          'Otorinolaringoiatria',
          'Dermatologia',
          'Ortopedica',
          'Cardiologica'
        ]
      },
      {
        name: 'Esami Specifici',
        icon: 'Microscope',
        items: [
          'Rx Torace',
          'Prove allergiche',
          'Vaccinazioni',
          'Test per patentino',
          'Esami tossicologici'
        ]
      }
    ]
  },

  riskTypes: {
    title: 'Rischi Lavorativi Gestiti',
    subtitle: 'Protocolli specifici per ogni tipologia di rischio',
    items: [
      {
        icon: 'Volume2',
        title: 'Rischio Rumore',
        description: 'Audiometria, otoscopia e valutazione capacità uditiva',
        exams: ['Audiometria', 'Otoscopia']
      },
      {
        icon: 'Eye',
        title: 'Rischio VDT',
        description: 'Visiotest e visita oculistica per videoterminalisti',
        exams: ['Visiotest', 'Visita oculistica']
      },
      {
        icon: 'Wind',
        title: 'Rischio Chimico',
        description: 'Spirometria, esami ematochimici specifici',
        exams: ['Spirometria', 'Biomonitoraggio']
      },
      {
        icon: 'Dumbbell',
        title: 'Movimentazione Carichi',
        description: 'Valutazione muscolo-scheletrica, Rx colonna',
        exams: ['Visita ortopedica', 'Rx rachide']
      },
      {
        icon: 'Zap',
        title: 'Rischio Elettrico',
        description: 'ECG, visita cardiologica, idoneità lavori elettrici',
        exams: ['ECG', 'Visita cardiologica']
      },
      {
        icon: 'Car',
        title: 'Guida Mezzi',
        description: 'Visiotest, drug test, alcol test, idoneità alla guida',
        exams: ['Drug test', 'Alcol test', 'Visiotest']
      }
    ]
  },

  judgmentTypes: {
    title: 'Giudizi di Idoneità',
    subtitle: 'Tipologie di giudizio secondo normativa',
    items: [
      {
        type: 'Idoneo',
        description: 'Il lavoratore può svolgere la mansione senza limitazioni',
        icon: 'CheckCircle',
        color: 'green'
      },
      {
        type: 'Idoneo con Prescrizioni',
        description: 'Idoneità subordinata al rispetto di specifiche prescrizioni',
        icon: 'AlertCircle',
        color: 'yellow'
      },
      {
        type: 'Idoneo con Limitazioni',
        description: 'Alcune attività della mansione sono precluse',
        icon: 'AlertTriangle',
        color: 'orange'
      },
      {
        type: 'Non Idoneo Temporaneo',
        description: 'Inidoneità limitata nel tempo, con rivalutazione',
        icon: 'Clock',
        color: 'amber'
      },
      {
        type: 'Non Idoneo Permanente',
        description: 'Impossibilità definitiva a svolgere la mansione',
        icon: 'XCircle',
        color: 'red'
      }
    ]
  },

  process: {
    title: 'Come Funziona',
    subtitle: 'Un processo semplice e efficiente',
    steps: [
      {
        number: '01',
        icon: 'FileText',
        title: 'Analisi Aziendale',
        description: 'Analizziamo il DVR, le mansioni e i rischi presenti per definire il protocollo sanitario più adeguato.'
      },
      {
        number: '02',
        icon: 'UserPlus',
        title: 'Nomina MC',
        description: 'Formalizziamo la nomina del Medico Competente e attiviamo il servizio con sopralluogo iniziale.'
      },
      {
        number: '03',
        icon: 'Calendar',
        title: 'Pianificazione Visite',
        description: 'Programmiamo le visite secondo calendario concordato, in ambulatorio o presso la vostra sede.'
      },
      {
        number: '04',
        icon: 'ClipboardCheck',
        title: 'Esecuzione e Refertazione',
        description: 'Effettuiamo visite ed esami, emettiamo giudizi di idoneità e aggiorniamo le cartelle sanitarie.'
      }
    ]
  },

  onSiteService: {
    title: 'Servizio Presso la Tua Sede',
    description: 'Per aziende con più di 20 dipendenti, offriamo il servizio di medicina del lavoro direttamente presso la vostra sede aziendale.',
    features: [
      { icon: 'Truck', text: 'Unità mobile attrezzata' },
      { icon: 'Clock', text: 'Orari flessibili' },
      { icon: 'Users', text: 'Nessun tempo di spostamento per i dipendenti' },
      { icon: 'Euro', text: 'Costi competitivi per volumi' }
    ],
    cta: {
      text: 'Richiedi Sopralluogo',
      href: '/medica-contatti'
    }
  },

  normativa: {
    title: 'Riferimenti Normativi',
    subtitle: 'La nostra attività nel rispetto della legge',
    articles: [
      {
        law: 'D.Lgs. 81/2008',
        title: 'Testo Unico Sicurezza',
        articles: ['Art. 25 - Obblighi MC', 'Art. 38 - Titoli MC', 'Art. 41 - Sorveglianza sanitaria']
      },
      {
        law: 'D.Lgs. 106/2009',
        title: 'Correttivo TU',
        articles: ['Modifiche sorveglianza', 'Nuovi obblighi']
      }
    ]
  },

  pricing: {
    title: 'Piani e Prezzi',
    subtitle: 'Soluzioni flessibili per ogni dimensione aziendale',
    note: 'Tutti i prezzi sono indicativi. Richiedi un preventivo personalizzato.',
    plans: [
      {
        name: 'Small Business',
        description: 'Per aziende fino a 10 dipendenti',
        features: ['Nomina MC', 'Visite periodiche', 'Protocollo sanitario base', 'Gestione scadenze'],
        cta: 'Richiedi Preventivo'
      },
      {
        name: 'Professional',
        description: 'Per aziende da 11 a 50 dipendenti',
        features: ['Tutto di Small Business', 'Sopralluoghi periodici', 'Riunione periodica', 'Portale aziendale', 'Report statistici'],
        highlighted: true,
        cta: 'Richiedi Preventivo'
      },
      {
        name: 'Enterprise',
        description: 'Per aziende oltre 50 dipendenti',
        features: ['Tutto di Professional', 'Servizio on-site', 'MC dedicato', 'Integrazione HR', 'SLA garantiti', 'Account manager'],
        cta: 'Contattaci'
      }
    ]
  },

  faq: {
    title: 'Domande Frequenti',
    items: [
      {
        question: 'Quando è obbligatoria la sorveglianza sanitaria?',
        answer: 'La sorveglianza sanitaria è obbligatoria quando dalla valutazione dei rischi emergono rischi per la salute che richiedono il controllo sanitario dei lavoratori esposti (art. 41 D.Lgs. 81/08).'
      },
      {
        question: 'Ogni quanto vanno effettuate le visite periodiche?',
        answer: 'La periodicità è stabilita dal Medico Competente nel protocollo sanitario, generalmente annuale o biennale a seconda dei rischi. Per alcuni rischi specifici può essere più frequente.'
      },
      {
        question: 'Le visite possono essere effettuate in azienda?',
        answer: 'Sì, per aziende con un numero significativo di dipendenti offriamo il servizio direttamente presso la sede aziendale con nostra unità mobile attrezzata.'
      },
      {
        question: 'Come vengono gestite le cartelle sanitarie?',
        answer: 'Le cartelle sanitarie sono custodite in formato digitale con accesso sicuro. Il datore di lavoro non può accedervi per privacy. In caso di cessazione rapporto, vengono consegnate al lavoratore.'
      },
      {
        question: 'Cosa succede se un dipendente risulta non idoneo?',
        answer: 'Il Medico Competente emette un giudizio motivato. Il datore di lavoro deve adibire il lavoratore ad altra mansione compatibile, se disponibile. È possibile presentare ricorso all\'ASL entro 30 giorni.'
      }
    ]
  },

  cta: {
    title: 'Attiva il Servizio di Medicina del Lavoro',
    description: 'Metti in regola la tua azienda con un partner affidabile. Richiedi un preventivo gratuito e senza impegno.',
    primaryButton: {
      text: 'Richiedi Preventivo',
      href: '/medica-contatti',
      icon: 'FileText'
    },
    secondaryButton: {
      text: 'Chiama Ora',
      href: 'tel:+390212345678',
      icon: 'Phone'
    },
    backgroundVariant: 'medical-gradient'
  }
};

async function updatePage() {
  try {
    const page = await prisma.cMSPage.findFirst({
      where: {
        tenantId: TENANT_ID,
        slug: 'medica-medicina-del-lavoro',
        deletedAt: null
      }
    });

    if (!page) {
      await prisma.cMSPage.create({
        data: {
          slug: 'medica-medicina-del-lavoro',
          title: 'Medicina del Lavoro - Element Medica',
          content: medicinaLavoroContent,
          layout: 'full-width',
          status: 'published',
          isPublished: true,
          publishedAt: new Date(),
          seoTitle: 'Medicina del Lavoro Milano | Medico Competente Aziendale | Element Medica',
          seoDescription: 'Servizi completi di medicina del lavoro: Medico Competente, visite preventive e periodiche, sorveglianza sanitaria. 500+ aziende clienti, 100% conformità normativa.',
          tenantId: TENANT_ID
        }
      });
      console.log('✅ Pagina Medicina del Lavoro creata');
    } else {
      await prisma.cMSPage.update({
        where: { id: page.id },
        data: {
          title: 'Medicina del Lavoro - Element Medica',
          content: medicinaLavoroContent,
          seoTitle: 'Medicina del Lavoro Milano | Medico Competente Aziendale | Element Medica',
          seoDescription: 'Servizi completi di medicina del lavoro: Medico Competente, visite preventive e periodiche, sorveglianza sanitaria. 500+ aziende clienti, 100% conformità normativa.',
          updatedAt: new Date()
        }
      });
      console.log('✅ Pagina Medicina del Lavoro aggiornata');
    }
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updatePage();
