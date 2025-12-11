/**
 * Script per Diagnostica Element Medica Premium
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TENANT_ID = 'tenant-element-medica-001';

const diagnosticaContent = {
  metadata: {
    theme: 'medical',
    layout: 'full-width',
    colorScheme: 'cyan'
  },
  
  hero: {
    title: 'Diagnostica Strumentale',
    subtitle: 'Tecnologia Avanzata per Diagnosi Precise',
    tagline: 'Esami di Qualità, Referti Rapidi',
    description: 'Un centro diagnostico completo con strumentazione di ultima generazione. Ecografie, esami cardiologici, spirometria, esami di laboratorio e molto altro. Risultati affidabili in tempi rapidi.',
    primaryButton: {
      text: 'Prenota Esame',
      href: '/medica-prenota',
      icon: 'Calendar'
    },
    secondaryButton: {
      text: 'I Nostri Esami',
      href: '#esami',
      icon: 'ArrowRight'
    },
    backgroundVariant: 'medical-diagnostic',
    stats: [
      { number: '25.000+', label: 'Esami Annuali', icon: 'Activity' },
      { number: '24-48h', label: 'Tempo Referti', icon: 'Clock' },
      { number: '50+', label: 'Tipologie Esami', icon: 'ClipboardList' },
      { number: '99.8%', label: 'Accuratezza', icon: 'Target' }
    ]
  },

  examCategories: {
    title: 'I Nostri Esami Diagnostici',
    subtitle: 'Una gamma completa di esami strumentali e di laboratorio',
    categories: [
      {
        name: 'Ecografie',
        icon: 'Waves',
        color: 'teal',
        description: 'Imaging ecografico con apparecchiature di ultima generazione',
        exams: [
          { name: 'Ecografia Addominale Completa', price: '€80', duration: '30 min' },
          { name: 'Ecografia Addome Superiore', price: '€60', duration: '20 min' },
          { name: 'Ecografia Addome Inferiore', price: '€60', duration: '20 min' },
          { name: 'Ecografia Tiroide e Collo', price: '€65', duration: '20 min' },
          { name: 'Ecografia Mammaria', price: '€70', duration: '25 min' },
          { name: 'Ecografia Muscolo-Tendinea', price: '€65', duration: '25 min' },
          { name: 'Ecografia Prostatica Transrettale', price: '€90', duration: '30 min' },
          { name: 'Ecografia Pelvica (transaddominale)', price: '€70', duration: '25 min' },
          { name: 'Ecografia Testicolare', price: '€65', duration: '20 min' }
        ]
      },
      {
        name: 'Esami Cardiologici',
        icon: 'Heart',
        color: 'rose',
        description: 'Diagnostica cardiovascolare completa',
        exams: [
          { name: 'Elettrocardiogramma (ECG)', price: '€35', duration: '15 min' },
          { name: 'Ecocardiogramma', price: '€120', duration: '40 min' },
          { name: 'Holter ECG 24h', price: '€100', duration: '24h + analisi' },
          { name: 'Holter Pressorio 24h', price: '€90', duration: '24h + analisi' },
          { name: 'Test da Sforzo al Cicloergometro', price: '€150', duration: '45 min' }
        ]
      },
      {
        name: 'Esami Vascolari',
        icon: 'Activity',
        color: 'blue',
        description: 'Eco-doppler arteriosi e venosi',
        exams: [
          { name: 'Eco-doppler Tronchi Sovraortici (TSA)', price: '€90', duration: '30 min' },
          { name: 'Eco-doppler Arterioso Arti Inferiori', price: '€95', duration: '35 min' },
          { name: 'Eco-doppler Venoso Arti Inferiori', price: '€85', duration: '30 min' },
          { name: 'Eco-doppler Aorta Addominale', price: '€80', duration: '25 min' }
        ]
      },
      {
        name: 'Esami Respiratori',
        icon: 'Wind',
        color: 'cyan',
        description: 'Valutazione della funzionalità respiratoria',
        exams: [
          { name: 'Spirometria Semplice', price: '€40', duration: '20 min' },
          { name: 'Spirometria con Broncodilatazione', price: '€65', duration: '40 min' },
          { name: 'Pulsossimetria', price: '€15', duration: '10 min' },
          { name: 'Saturimetria Notturna', price: '€70', duration: 'Notturna' }
        ]
      },
      {
        name: 'Esami Neurofisiologici',
        icon: 'Brain',
        color: 'purple',
        description: 'Diagnostica del sistema nervoso',
        exams: [
          { name: 'Elettroencefalogramma (EEG)', price: '€100', duration: '30 min' },
          { name: 'Elettromiografia (EMG)', price: '€150', duration: '45 min' },
          { name: 'Potenziali Evocati', price: '€120', duration: '40 min' }
        ]
      },
      {
        name: 'Esami ORL e Oculistici',
        icon: 'Eye',
        color: 'amber',
        description: 'Diagnostica sensoriale',
        exams: [
          { name: 'Audiometria Tonale', price: '€45', duration: '20 min' },
          { name: 'Impedenzometria', price: '€40', duration: '15 min' },
          { name: 'Visiotest', price: '€35', duration: '15 min' },
          { name: 'Esame del Campo Visivo', price: '€60', duration: '30 min' },
          { name: 'OCT Retina', price: '€80', duration: '20 min' },
          { name: 'Pachimetria Corneale', price: '€50', duration: '15 min' }
        ]
      },
      {
        name: 'Esami di Laboratorio',
        icon: 'FlaskConical',
        color: 'emerald',
        description: 'Analisi del sangue e altri campioni biologici',
        exams: [
          { name: 'Emocromo Completo', price: '€15', duration: '1 giorno' },
          { name: 'Profilo Lipidico', price: '€25', duration: '1 giorno' },
          { name: 'Profilo Epatico', price: '€30', duration: '1 giorno' },
          { name: 'Profilo Renale', price: '€25', duration: '1 giorno' },
          { name: 'Profilo Tiroideo (TSH, FT3, FT4)', price: '€45', duration: '2 giorni' },
          { name: 'Glicemia + HbA1c', price: '€20', duration: '1 giorno' },
          { name: 'Esame Urine Completo', price: '€12', duration: '1 giorno' },
          { name: 'PSA Totale e Libero', price: '€35', duration: '2 giorni' },
          { name: 'Markers Tumorali (CEA, CA125, CA19-9)', price: '€50', duration: '3 giorni' },
          { name: 'Tampone Faringeo', price: '€25', duration: '3 giorni' },
          { name: 'Drug Test (urine)', price: '€40', duration: '1 giorno' }
        ]
      }
    ]
  },

  packages: {
    title: 'Pacchetti Diagnostici',
    subtitle: 'Check-up completi a prezzi vantaggiosi',
    items: [
      {
        name: 'Check-Up Base',
        description: 'Esami essenziali per un controllo generale',
        price: '€99',
        originalPrice: '€130',
        saving: '24%',
        includes: [
          'Emocromo completo',
          'Glicemia',
          'Profilo lipidico',
          'Profilo epatico',
          'Creatinina',
          'Esame urine'
        ],
        color: 'teal'
      },
      {
        name: 'Check-Up Cardiovascolare',
        description: 'Prevenzione delle malattie cardiache',
        price: '€199',
        originalPrice: '€270',
        saving: '26%',
        includes: [
          'ECG',
          'Ecocardiogramma',
          'Eco-doppler TSA',
          'Profilo lipidico completo',
          'Glicemia + HbA1c'
        ],
        highlighted: true,
        color: 'rose'
      },
      {
        name: 'Check-Up Donna',
        description: 'Prevenzione al femminile',
        price: '€249',
        originalPrice: '€340',
        saving: '27%',
        includes: [
          'Ecografia mammaria',
          'Ecografia pelvica',
          'Pap test',
          'Emocromo + formula',
          'Profilo tiroideo',
          'Profilo ormonale base'
        ],
        color: 'pink'
      },
      {
        name: 'Check-Up Uomo 50+',
        description: 'Prevenzione maschile over 50',
        price: '€279',
        originalPrice: '€380',
        saving: '27%',
        includes: [
          'Ecografia addominale',
          'Ecografia prostatica',
          'PSA totale e libero',
          'ECG',
          'Emocromo completo',
          'Profilo lipidico',
          'Profilo renale'
        ],
        color: 'cyan'
      }
    ]
  },

  technology: {
    title: 'Tecnologia all\'Avanguardia',
    subtitle: 'Strumentazione di ultima generazione per diagnosi precise',
    equipment: [
      {
        name: 'Ecografi 4D',
        description: 'Ecografi di ultima generazione con imaging 3D/4D per diagnosi accurate e dettagliate',
        icon: 'Waves',
        brand: 'GE Healthcare'
      },
      {
        name: 'ECG 12 Derivazioni',
        description: 'Elettrocardiografi digitali ad alta risoluzione con refertazione automatica',
        icon: 'Activity',
        brand: 'Philips'
      },
      {
        name: 'Spirometri Digitali',
        description: 'Spirometri certificati per la medicina del lavoro con software avanzato',
        icon: 'Wind',
        brand: 'COSMED'
      },
      {
        name: 'Analizzatori di Laboratorio',
        description: 'Sistemi automatizzati per analisi di biochimica, ematologia e immunometria',
        icon: 'FlaskConical',
        brand: 'Roche Diagnostics'
      }
    ]
  },

  preparation: {
    title: 'Preparazione agli Esami',
    subtitle: 'Informazioni utili per prepararsi correttamente',
    items: [
      {
        exam: 'Esami del sangue',
        icon: 'Droplet',
        preparation: [
          'Digiuno di almeno 8-12 ore (solo acqua)',
          'Evitare attività fisica intensa il giorno prima',
          'Assumere i farmaci abituali salvo diverse indicazioni',
          'Portare elenco farmaci assunti'
        ]
      },
      {
        exam: 'Ecografia addominale',
        icon: 'Waves',
        preparation: [
          'Digiuno di almeno 6 ore',
          'Non fumare',
          'Evitare cibi che producono gas nei 2 giorni precedenti',
          'Vescica piena per ecografia pelvica'
        ]
      },
      {
        exam: 'ECG / Ecocardiogramma',
        icon: 'Heart',
        preparation: [
          'Nessuna preparazione particolare richiesta',
          'Indossare abiti comodi e facili da aprire',
          'Non applicare creme sul torace',
          'Portare ECG precedenti se disponibili'
        ]
      },
      {
        exam: 'Spirometria',
        icon: 'Wind',
        preparation: [
          'Non fumare almeno 4 ore prima',
          'Non assumere broncodilatatori (se test basale)',
          'Non mangiare pesante prima dell\'esame',
          'Indossare abiti comodi'
        ]
      },
      {
        exam: 'Holter (ECG/Pressorio)',
        icon: 'Clock',
        preparation: [
          'Indossare abiti comodi e ampi',
          'Per Holter ECG: non applicare creme sul torace',
          'Tenere un diario delle attività',
          'Tornare il giorno dopo per la rimozione'
        ]
      }
    ]
  },

  qualityAssurance: {
    title: 'Garanzia di Qualità',
    features: [
      {
        icon: 'Award',
        title: 'Certificazione ISO',
        description: 'Laboratorio certificato ISO 9001:2015 per garantire la massima qualità dei processi'
      },
      {
        icon: 'RefreshCw',
        title: 'Calibrazione Costante',
        description: 'Strumentazione sottoposta a calibrazione e manutenzione programmata'
      },
      {
        icon: 'Users',
        title: 'Personale Qualificato',
        description: 'Tecnici e medici specializzati con formazione continua certificata'
      },
      {
        icon: 'FileCheck',
        title: 'Doppia Refertazione',
        description: 'Esami critici sottoposti a doppia lettura per massima affidabilità'
      }
    ]
  },

  resultDelivery: {
    title: 'Consegna Referti',
    subtitle: 'Referti disponibili rapidamente in formato digitale',
    methods: [
      {
        method: 'Email',
        description: 'Referto in PDF protetto inviato alla tua email',
        timing: '24-48 ore',
        icon: 'Mail'
      },
      {
        method: 'Portale Online',
        description: 'Area riservata per consultare tutti i tuoi esami',
        timing: '24-48 ore',
        icon: 'Globe'
      },
      {
        method: 'Ritiro in Sede',
        description: 'Copia cartacea disponibile presso la segreteria',
        timing: '24-48 ore',
        icon: 'MapPin'
      },
      {
        method: 'Urgente',
        description: 'Per esami urgenti, referto disponibile in giornata',
        timing: 'Stesso giorno',
        icon: 'Zap',
        extra: '+€15'
      }
    ]
  },

  faq: {
    title: 'Domande Frequenti',
    items: [
      {
        question: 'Devo prenotare per gli esami del sangue?',
        answer: 'Sì, consigliamo la prenotazione per evitare attese. Tuttavia, accettiamo anche accessi diretti la mattina dalle 7:30 alle 10:00 per i soli prelievi.'
      },
      {
        question: 'Quanto tempo ci vuole per avere i referti?',
        answer: 'I tempi variano in base all\'esame: esami del sangue di routine 24 ore, esami specialistici 48-72 ore, esami particolari fino a 7 giorni. Per urgenze è possibile richiedere il servizio express.'
      },
      {
        question: 'Accettate prescrizioni del medico di base?',
        answer: 'Sì, molti esami sono eseguibili con impegnativa SSN. Contattaci per verificare quali esami sono convenzionati e i tempi di attesa.'
      },
      {
        question: 'I bambini possono fare esami da voi?',
        answer: 'Sì, eseguiamo esami anche su pazienti pediatrici. Per i prelievi su bambini sotto i 6 anni consigliamo di prenotare negli orari dedicati con personale specializzato.'
      },
      {
        question: 'Posso fare più esami nella stessa giornata?',
        answer: 'Certamente. Anzi, consigliamo di raggruppare gli esami per ottimizzare tempi e costi. Alcuni esami richiedono preparazioni specifiche, ti forniremo tutte le indicazioni.'
      }
    ]
  },

  cta: {
    title: 'Prenota il Tuo Esame Diagnostico',
    description: 'Strumentazione avanzata, personale qualificato, referti rapidi. Prenota online il tuo esame.',
    primaryButton: {
      text: 'Prenota Online',
      href: '/medica-prenota',
      icon: 'Calendar'
    },
    secondaryButton: {
      text: 'Contattaci',
      href: '/medica-contatti',
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
        slug: 'medica-diagnostica',
        deletedAt: null
      }
    });

    if (!page) {
      await prisma.cMSPage.create({
        data: {
          slug: 'medica-diagnostica',
          title: 'Diagnostica Strumentale - Element Medica',
          content: diagnosticaContent,
          layout: 'full-width',
          status: 'published',
          isPublished: true,
          publishedAt: new Date(),
          seoTitle: 'Diagnostica Milano | Ecografie, ECG, Esami Sangue | Element Medica',
          seoDescription: 'Centro diagnostico con ecografie, esami cardiologici, spirometria, analisi del sangue. Tecnologia avanzata, referti in 24-48h. Prenota online.',
          tenantId: TENANT_ID
        }
      });
      console.log('✅ Pagina Diagnostica creata');
    } else {
      await prisma.cMSPage.update({
        where: { id: page.id },
        data: {
          title: 'Diagnostica Strumentale - Element Medica',
          content: diagnosticaContent,
          seoTitle: 'Diagnostica Milano | Ecografie, ECG, Esami Sangue | Element Medica',
          seoDescription: 'Centro diagnostico con ecografie, esami cardiologici, spirometria, analisi del sangue. Tecnologia avanzata, referti in 24-48h. Prenota online.',
          updatedAt: new Date()
        }
      });
      console.log('✅ Pagina Diagnostica aggiornata');
    }
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updatePage();
