/**
 * Script per Visite Specialistiche Element Medica Premium
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TENANT_ID = 'tenant-element-medica-001';

const visiteSpecialisticheContent = {
  metadata: {
    theme: 'medical',
    layout: 'full-width',
    colorScheme: 'emerald'
  },
  
  hero: {
    title: 'Visite Specialistiche',
    subtitle: 'Oltre 25 Specialisti al Tuo Servizio',
    tagline: 'Eccellenza Medica, Tempi Rapidi',
    description: 'Un team multidisciplinare di medici specialisti per rispondere a ogni esigenza sanitaria. Prenotazioni rapide, tempi di attesa ridotti e referti in 24-48 ore.',
    primaryButton: {
      text: 'Prenota Visita',
      href: '/medica-prenota',
      icon: 'Calendar'
    },
    secondaryButton: {
      text: 'Le Nostre Specialità',
      href: '#specialita',
      icon: 'ArrowRight'
    },
    backgroundVariant: 'medical-specialists',
    stats: [
      { number: '25+', label: 'Medici Specialisti', icon: 'Stethoscope' },
      { number: '35.000+', label: 'Visite Annuali', icon: 'Clipboard' },
      { number: '24-48h', label: 'Referti', icon: 'Clock' },
      { number: '98%', label: 'Soddisfazione', icon: 'Heart' }
    ]
  },

  specialties: {
    title: 'Le Nostre Specialità',
    subtitle: 'Un\'offerta completa per la tua salute',
    categories: [
      {
        name: 'Area Cardiologica',
        icon: 'Heart',
        color: 'rose',
        description: 'Prevenzione e cura delle patologie cardiovascolari',
        specialties: [
          {
            name: 'Cardiologia',
            description: 'Visite cardiologiche, ECG, Holter pressorio e cardiaco, ecocardiogramma',
            doctor: 'Dr. Marco Rossi',
            price: 'da €90'
          },
          {
            name: 'Angiologia',
            description: 'Eco-doppler arterioso e venoso, valutazione vascolare',
            doctor: 'Dr.ssa Elena Bianchi',
            price: 'da €100'
          }
        ]
      },
      {
        name: 'Area Muscolo-Scheletrica',
        icon: 'Bone',
        color: 'amber',
        description: 'Cura di ossa, articolazioni e apparato locomotore',
        specialties: [
          {
            name: 'Ortopedia',
            description: 'Patologie osteoarticolari, traumi, chirurgia ortopedica',
            doctor: 'Dr. Giovanni Verdi',
            price: 'da €85'
          },
          {
            name: 'Fisiatria',
            description: 'Riabilitazione, dolore cronico, postura',
            doctor: 'Dr.ssa Laura Neri',
            price: 'da €80'
          },
          {
            name: 'Reumatologia',
            description: 'Artriti, artrosi, malattie autoimmuni',
            doctor: 'Dr. Paolo Conti',
            price: 'da €95'
          }
        ]
      },
      {
        name: 'Area Dermatologica',
        icon: 'Sun',
        color: 'orange',
        description: 'Salute della pelle, capelli e unghie',
        specialties: [
          {
            name: 'Dermatologia',
            description: 'Patologie cutanee, mappatura nei, dermatoscopia',
            doctor: 'Dr.ssa Anna Martini',
            price: 'da €90'
          },
          {
            name: 'Allergologia',
            description: 'Test allergici, immunoterapia, intolleranze',
            doctor: 'Dr. Luca Ferri',
            price: 'da €95'
          }
        ]
      },
      {
        name: 'Area Sensoriale',
        icon: 'Eye',
        color: 'blue',
        description: 'Vista, udito e sistema otorinolaringoiatrico',
        specialties: [
          {
            name: 'Oculistica',
            description: 'Visita oculistica, fondo oculare, tonometria, OCT',
            doctor: 'Dr.ssa Maria Russo',
            price: 'da €85'
          },
          {
            name: 'Otorinolaringoiatria',
            description: 'Orecchio, naso, gola, audiometria',
            doctor: 'Dr. Franco Lombardi',
            price: 'da €90'
          }
        ]
      },
      {
        name: 'Area Internistica',
        icon: 'Stethoscope',
        color: 'purple',
        description: 'Medicina interna e specialità correlate',
        specialties: [
          {
            name: 'Medicina Interna',
            description: 'Check-up, patologie internistiche, prevenzione',
            doctor: 'Dr. Roberto Serra',
            price: 'da €80'
          },
          {
            name: 'Endocrinologia',
            description: 'Tiroide, diabete, metabolismo',
            doctor: 'Dr.ssa Giulia Costa',
            price: 'da €100'
          },
          {
            name: 'Gastroenterologia',
            description: 'Apparato digerente, ecografia addominale',
            doctor: 'Dr. Stefano Bruno',
            price: 'da €95'
          }
        ]
      },
      {
        name: 'Area Neurologica',
        icon: 'Brain',
        color: 'indigo',
        description: 'Sistema nervoso centrale e periferico',
        specialties: [
          {
            name: 'Neurologia',
            description: 'Cefalee, vertigini, neuropatie, EEG',
            doctor: 'Dr. Alessandro Ricci',
            price: 'da €100'
          }
        ]
      },
      {
        name: 'Area Urologica',
        icon: 'Droplets',
        color: 'cyan',
        description: 'Apparato urinario maschile e femminile',
        specialties: [
          {
            name: 'Urologia',
            description: 'Patologie urologiche, ecografia prostatica e renale',
            doctor: 'Dr. Massimo Galli',
            price: 'da €90'
          }
        ]
      },
      {
        name: 'Area Ginecologica',
        icon: 'Baby',
        color: 'pink',
        description: 'Salute della donna',
        specialties: [
          {
            name: 'Ginecologia',
            description: 'Visite ginecologiche, pap test, ecografia pelvica',
            doctor: 'Dr.ssa Chiara Fontana',
            price: 'da €95'
          }
        ]
      }
    ]
  },

  checkupPackages: {
    title: 'Pacchetti Check-Up',
    subtitle: 'Programmi di prevenzione completi',
    packages: [
      {
        name: 'Check-Up Base',
        description: 'Controllo generale dello stato di salute',
        price: '€150',
        duration: '1 ora',
        includes: [
          'Visita medica generale',
          'Esami del sangue base',
          'Esame urine',
          'ECG'
        ],
        color: 'teal'
      },
      {
        name: 'Check-Up Cardiologico',
        description: 'Prevenzione cardiovascolare completa',
        price: '€280',
        duration: '2 ore',
        includes: [
          'Visita cardiologica',
          'ECG',
          'Ecocardiogramma',
          'Esami sangue (profilo lipidico)',
          'Holter pressorio 24h'
        ],
        highlighted: true,
        color: 'rose'
      },
      {
        name: 'Check-Up Donna',
        description: 'Prevenzione femminile a 360°',
        price: '€350',
        duration: '3 ore',
        includes: [
          'Visita ginecologica',
          'Pap test',
          'Ecografia pelvica',
          'Mammografia/Ecografia mammaria',
          'Esami sangue completi',
          'Visita dermatologica'
        ],
        color: 'pink'
      },
      {
        name: 'Check-Up Uomo 50+',
        description: 'Prevenzione maschile over 50',
        price: '€380',
        duration: '3 ore',
        includes: [
          'Visita urologica',
          'PSA',
          'Ecografia prostatica',
          'Visita cardiologica',
          'ECG + Ecocardiogramma',
          'Esami sangue completi'
        ],
        color: 'cyan'
      }
    ]
  },

  ourDoctors: {
    title: 'Il Nostro Team Medico',
    subtitle: 'Professionisti qualificati e sempre aggiornati',
    doctors: [
      {
        name: 'Dr. Marco Rossi',
        specialty: 'Cardiologia',
        bio: 'Specialista in Cardiologia con 20 anni di esperienza. Ex primario presso Ospedale San Raffaele.',
        languages: ['Italiano', 'Inglese'],
        avatar: 'MR'
      },
      {
        name: 'Dr.ssa Elena Bianchi',
        specialty: 'Angiologia',
        bio: 'Chirurgo vascolare specializzata in diagnostica eco-doppler e trattamento delle varici.',
        languages: ['Italiano', 'Francese'],
        avatar: 'EB'
      },
      {
        name: 'Dr. Giovanni Verdi',
        specialty: 'Ortopedia',
        bio: 'Ortopedico esperto in traumatologia sportiva e chirurgia artroscopica del ginocchio.',
        languages: ['Italiano', 'Inglese'],
        avatar: 'GV'
      },
      {
        name: 'Dr.ssa Maria Russo',
        specialty: 'Oculistica',
        bio: 'Oculista specializzata in chirurgia refrattiva e patologie retiniche.',
        languages: ['Italiano', 'Spagnolo'],
        avatar: 'MR'
      }
    ]
  },

  whyChooseUs: {
    title: 'Perché Scegliere Element Medica',
    features: [
      {
        icon: 'Calendar',
        title: 'Prenotazione Rapida',
        description: 'Tempi di attesa ridotti. La maggior parte delle visite disponibili entro 48-72 ore.'
      },
      {
        icon: 'Clock',
        title: 'Referti Veloci',
        description: 'Referti disponibili in formato digitale entro 24-48 ore dalla visita.'
      },
      {
        icon: 'Award',
        title: 'Specialisti Qualificati',
        description: 'Medici con esperienza pluriennale, formazione continua e aggiornamento costante.'
      },
      {
        icon: 'CreditCard',
        title: 'Prezzi Trasparenti',
        description: 'Tariffe chiare e competitive. Nessun costo nascosto, preventivo immediato.'
      },
      {
        icon: 'Shield',
        title: 'Convenzioni',
        description: 'Convenzionati con le principali assicurazioni e fondi sanitari integrativi.'
      },
      {
        icon: 'MapPin',
        title: 'Posizione Centrale',
        description: 'Facilmente raggiungibile con mezzi pubblici. Parcheggio convenzionato.'
      }
    ]
  },

  insurancePartners: {
    title: 'Convenzioni Attive',
    subtitle: 'Siamo convenzionati con i principali fondi e assicurazioni',
    partners: [
      { name: 'Fondo Est', type: 'Fondo Sanitario' },
      { name: 'UniSalute', type: 'Assicurazione' },
      { name: 'Previmedical', type: 'Assicurazione' },
      { name: 'Fondo Metasalute', type: 'Fondo Sanitario' },
      { name: 'FASDAC', type: 'Fondo Sanitario' },
      { name: 'Generali Welion', type: 'Assicurazione' }
    ],
    note: 'Contattaci per verificare la tua convenzione'
  },

  howToBook: {
    title: 'Come Prenotare',
    steps: [
      {
        number: '01',
        icon: 'Search',
        title: 'Scegli la Specialità',
        description: 'Seleziona la visita specialistica di cui hai bisogno dal nostro catalogo.'
      },
      {
        number: '02',
        icon: 'Calendar',
        title: 'Scegli Data e Ora',
        description: 'Visualizza le disponibilità e scegli l\'appuntamento più comodo per te.'
      },
      {
        number: '03',
        icon: 'CreditCard',
        title: 'Conferma e Paga',
        description: 'Inserisci i tuoi dati, conferma la prenotazione. Pagamento in struttura.'
      },
      {
        number: '04',
        icon: 'CheckCircle',
        title: 'Ricevi Conferma',
        description: 'Riceverai email e SMS di conferma con tutti i dettagli della visita.'
      }
    ]
  },

  faq: {
    title: 'Domande Frequenti',
    items: [
      {
        question: 'Serve la prescrizione del medico di base?',
        answer: 'No, per le visite specialistiche private non è necessaria l\'impegnativa del medico di base. Può essere utile portare eventuali esami precedenti o referti.'
      },
      {
        question: 'Quanto tempo prima posso prenotare?',
        answer: 'Puoi prenotare da subito fino a 60 giorni in anticipo. Per urgenze, contattaci telefonicamente per verificare disponibilità in giornata.'
      },
      {
        question: 'Come ricevo il referto?',
        answer: 'Il referto viene inviato via email in formato PDF protetto entro 24-48 ore dalla visita. È anche consultabile nell\'area riservata del nostro portale.'
      },
      {
        question: 'Posso disdire o spostare l\'appuntamento?',
        answer: 'Sì, puoi modificare o annullare la prenotazione fino a 24 ore prima senza alcun costo. Oltre tale termine potrebbe essere applicata una penale.'
      },
      {
        question: 'Accettate tutte le assicurazioni sanitarie?',
        answer: 'Siamo convenzionati con molti fondi e assicurazioni. Ti consigliamo di contattarci per verificare la tua specifica copertura prima della visita.'
      }
    ]
  },

  testimonials: {
    title: 'Cosa Dicono i Pazienti',
    items: [
      {
        name: 'Francesco M.',
        text: 'Visita cardiologica eccellente. Il Dr. Rossi è stato molto attento e ha spiegato tutto con chiarezza. Referto arrivato il giorno dopo.',
        rating: 5,
        specialty: 'Cardiologia'
      },
      {
        name: 'Giovanna P.',
        text: 'Struttura moderna e pulita. La dermatologa è stata bravissima, mi ha rassicurata e fatto una mappatura dei nei accuratissima.',
        rating: 5,
        specialty: 'Dermatologia'
      },
      {
        name: 'Roberto L.',
        text: 'Dopo mesi di attesa nel pubblico, qui ho trovato appuntamento in 3 giorni. Ortopedico competente, prezzi onesti.',
        rating: 5,
        specialty: 'Ortopedia'
      }
    ]
  },

  cta: {
    title: 'Prenota la Tua Visita Specialistica',
    description: 'Scegli lo specialista, la data e l\'ora che preferisci. Prenotazione online semplice e veloce.',
    primaryButton: {
      text: 'Prenota Online',
      href: '/medica-prenota',
      icon: 'Calendar'
    },
    secondaryButton: {
      text: 'Chiama per Info',
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
        slug: 'medica-visite-specialistiche',
        deletedAt: null
      }
    });

    if (!page) {
      await prisma.cMSPage.create({
        data: {
          slug: 'medica-visite-specialistiche',
          title: 'Visite Specialistiche - Element Medica',
          content: visiteSpecialisticheContent,
          layout: 'full-width',
          status: 'published',
          isPublished: true,
          publishedAt: new Date(),
          seoTitle: 'Visite Specialistiche Milano | 25+ Specialisti | Element Medica',
          seoDescription: 'Visite specialistiche con oltre 25 medici: cardiologia, ortopedia, dermatologia, oculistica. Prenotazioni rapide, referti in 24-48h. Prenota online.',
          tenantId: TENANT_ID
        }
      });
      console.log('✅ Pagina Visite Specialistiche creata');
    } else {
      await prisma.cMSPage.update({
        where: { id: page.id },
        data: {
          title: 'Visite Specialistiche - Element Medica',
          content: visiteSpecialisticheContent,
          seoTitle: 'Visite Specialistiche Milano | 25+ Specialisti | Element Medica',
          seoDescription: 'Visite specialistiche con oltre 25 medici: cardiologia, ortopedia, dermatologia, oculistica. Prenotazioni rapide, referti in 24-48h. Prenota online.',
          updatedAt: new Date()
        }
      });
      console.log('✅ Pagina Visite Specialistiche aggiornata');
    }
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updatePage();
