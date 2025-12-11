/**
 * Script per Prenota Online Element Medica Premium
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TENANT_ID = 'tenant-element-medica-001';

const prenotaContent = {
  metadata: {
    theme: 'medical',
    layout: 'full-width',
    colorScheme: 'teal'
  },
  
  hero: {
    title: 'Prenota Online',
    subtitle: 'La Tua Visita in Pochi Click',
    description: 'Prenota comodamente da casa la tua visita specialistica o esame diagnostico. Scegli lo specialista, la data e l\'ora che preferisci. Conferma immediata via email e SMS.',
    backgroundVariant: 'medical-booking',
    stats: [
      { number: '24/7', label: 'Prenotazione Online', icon: 'Clock' },
      { number: '< 48h', label: 'Disponibilità Media', icon: 'Calendar' },
      { number: '100%', label: 'Conferma Immediata', icon: 'CheckCircle' }
    ]
  },

  bookingCategories: {
    title: 'Cosa Vuoi Prenotare?',
    subtitle: 'Seleziona la tipologia di prestazione',
    categories: [
      {
        icon: 'Stethoscope',
        title: 'Visite Specialistiche',
        description: 'Cardiologia, ortopedia, dermatologia e altre 20+ specialità',
        href: '#visite',
        color: 'teal',
        popular: ['Cardiologia', 'Ortopedia', 'Dermatologia', 'Oculistica']
      },
      {
        icon: 'Activity',
        title: 'Esami Diagnostici',
        description: 'Ecografie, ECG, spirometria, esami del sangue',
        href: '#diagnostica',
        color: 'cyan',
        popular: ['Ecografia addominale', 'ECG', 'Esami sangue', 'Spirometria']
      },
      {
        icon: 'Briefcase',
        title: 'Medicina del Lavoro',
        description: 'Visite preventive, periodiche e sorveglianza sanitaria',
        href: '#lavoro',
        color: 'emerald',
        popular: ['Visita periodica', 'Visita preassuntiva', 'Drug test']
      },
      {
        icon: 'Package',
        title: 'Pacchetti Check-Up',
        description: 'Programmi di prevenzione completi a prezzi vantaggiosi',
        href: '#checkup',
        color: 'purple',
        popular: ['Check-up base', 'Check-up cardiologico', 'Check-up donna']
      }
    ]
  },

  popularBookings: {
    title: 'Prenotazioni Più Richieste',
    items: [
      {
        name: 'Visita Cardiologica + ECG',
        category: 'Cardiologia',
        price: '€120',
        availability: 'Disponibile entro 48h',
        icon: 'Heart',
        color: 'rose'
      },
      {
        name: 'Ecografia Addominale Completa',
        category: 'Diagnostica',
        price: '€80',
        availability: 'Disponibile domani',
        icon: 'Waves',
        color: 'teal'
      },
      {
        name: 'Visita Ortopedica',
        category: 'Ortopedia',
        price: '€85',
        availability: 'Disponibile entro 72h',
        icon: 'Bone',
        color: 'amber'
      },
      {
        name: 'Esami del Sangue (Profilo Completo)',
        category: 'Laboratorio',
        price: '€45',
        availability: 'Domani mattina 7:30-10:00',
        icon: 'Droplet',
        color: 'red'
      },
      {
        name: 'Visita Dermatologica + Mappatura Nei',
        category: 'Dermatologia',
        price: '€130',
        availability: 'Disponibile questa settimana',
        icon: 'Sun',
        color: 'orange'
      },
      {
        name: 'Check-Up Cardiovascolare',
        category: 'Pacchetto',
        price: '€199',
        availability: 'Su appuntamento',
        icon: 'Activity',
        color: 'purple'
      }
    ]
  },

  bookingSteps: {
    title: 'Come Funziona',
    subtitle: 'Prenotare è semplice e veloce',
    steps: [
      {
        number: '1',
        icon: 'Search',
        title: 'Scegli la Prestazione',
        description: 'Seleziona la visita specialistica o l\'esame di cui hai bisogno dal nostro catalogo.'
      },
      {
        number: '2',
        icon: 'Calendar',
        title: 'Seleziona Data e Ora',
        description: 'Visualizza le disponibilità in tempo reale e scegli lo slot che preferisci.'
      },
      {
        number: '3',
        icon: 'User',
        title: 'Inserisci i Tuoi Dati',
        description: 'Compila il form con i tuoi dati anagrafici e di contatto. Solo pochi campi essenziali.'
      },
      {
        number: '4',
        icon: 'CheckCircle',
        title: 'Conferma Prenotazione',
        description: 'Ricevi conferma immediata via email e SMS con tutti i dettagli della tua visita.'
      }
    ]
  },

  bookingForm: {
    title: 'Prenota la Tua Visita',
    subtitle: 'Compila il form per procedere con la prenotazione',
    sections: [
      {
        title: 'Tipo di Prestazione',
        fields: [
          {
            name: 'serviceType',
            label: 'Categoria',
            type: 'select',
            required: true,
            options: [
              { value: '', label: 'Seleziona categoria...' },
              { value: 'specialist', label: 'Visita Specialistica' },
              { value: 'diagnostic', label: 'Esame Diagnostico' },
              { value: 'workmed', label: 'Medicina del Lavoro' },
              { value: 'checkup', label: 'Pacchetto Check-Up' }
            ]
          },
          {
            name: 'service',
            label: 'Prestazione',
            type: 'select',
            required: true,
            dependsOn: 'serviceType',
            options: []
          }
        ]
      },
      {
        title: 'Data e Ora',
        fields: [
          {
            name: 'preferredDate',
            label: 'Data Preferita',
            type: 'date',
            required: true,
            minDate: 'tomorrow',
            maxDate: '+60days'
          },
          {
            name: 'preferredTime',
            label: 'Fascia Oraria',
            type: 'select',
            required: true,
            options: [
              { value: 'morning', label: 'Mattina (8:00-12:00)' },
              { value: 'afternoon', label: 'Pomeriggio (14:00-18:00)' },
              { value: 'any', label: 'Indifferente' }
            ]
          }
        ]
      },
      {
        title: 'I Tuoi Dati',
        fields: [
          { name: 'firstName', label: 'Nome', type: 'text', required: true },
          { name: 'lastName', label: 'Cognome', type: 'text', required: true },
          { name: 'fiscalCode', label: 'Codice Fiscale', type: 'text', required: true, pattern: '[A-Z0-9]{16}' },
          { name: 'birthDate', label: 'Data di Nascita', type: 'date', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Telefono', type: 'tel', required: true },
          { name: 'notes', label: 'Note (opzionale)', type: 'textarea', required: false, placeholder: 'Eventuali informazioni aggiuntive, allergie, richieste particolari...' }
        ]
      }
    ],
    consent: {
      privacy: 'Acconsento al trattamento dei miei dati personali secondo la Privacy Policy',
      marketing: 'Acconsento a ricevere comunicazioni promozionali (opzionale)'
    },
    submitButton: 'Prenota Ora',
    note: 'La prenotazione sarà confermata entro poche ore. Riceverai email e SMS di conferma.'
  },

  alternativeBooking: {
    title: 'Preferisci Prenotare per Telefono?',
    description: 'Il nostro team è a disposizione per assisterti nella prenotazione',
    phone: {
      number: '+39 02 1234 5678',
      hours: 'Lun-Ven 8:00-18:30, Sab 8:00-12:00'
    },
    whatsapp: {
      number: '+39 333 123 4567',
      text: 'Prenota via WhatsApp'
    }
  },

  importantInfo: {
    title: 'Informazioni Utili',
    items: [
      {
        icon: 'FileText',
        title: 'Cosa Portare',
        content: 'Tessera sanitaria, documento di identità, eventuali esami precedenti e impegnativa (se SSN).'
      },
      {
        icon: 'Clock',
        title: 'Arrivo in Struttura',
        content: 'Presentarsi 10-15 minuti prima dell\'appuntamento per completare le pratiche di accettazione.'
      },
      {
        icon: 'XCircle',
        title: 'Disdetta',
        content: 'Puoi disdire o spostare l\'appuntamento fino a 24h prima senza costi. Oltre, penale del 50%.'
      },
      {
        icon: 'CreditCard',
        title: 'Pagamento',
        content: 'Accettiamo contanti, carte di credito/debito, bancomat. Pagamento al momento della visita.'
      }
    ]
  },

  guarantees: {
    title: 'Le Nostre Garanzie',
    items: [
      {
        icon: 'Shield',
        title: 'Prenotazione Sicura',
        description: 'Dati protetti con crittografia SSL. Privacy garantita secondo GDPR.'
      },
      {
        icon: 'Clock',
        title: 'Conferma Rapida',
        description: 'Ricevi conferma via email e SMS entro poche ore dalla prenotazione.'
      },
      {
        icon: 'RefreshCw',
        title: 'Modifica Facile',
        description: 'Puoi modificare o annullare la prenotazione fino a 24h prima senza costi.'
      },
      {
        icon: 'Headphones',
        title: 'Assistenza Dedicata',
        description: 'Il nostro team è sempre disponibile per qualsiasi necessità.'
      }
    ]
  },

  testimonials: {
    title: 'Cosa Dicono i Pazienti',
    items: [
      {
        name: 'Alessandra M.',
        text: 'Prenotazione online semplicissima. Ho scelto data e ora in 2 minuti. Conferma arrivata subito. Consigliatissimo!',
        rating: 5
      },
      {
        name: 'Roberto G.',
        text: 'Finalmente un sistema di prenotazione che funziona! Niente più code al telefono. Tutto chiaro e trasparente.',
        rating: 5
      },
      {
        name: 'Francesca L.',
        text: 'Avevo bisogno urgente di un cardiologo e ho trovato disponibilità per il giorno dopo. Servizio eccellente.',
        rating: 5
      }
    ]
  },

  faq: {
    title: 'Domande sulla Prenotazione',
    items: [
      {
        question: 'La prenotazione online è vincolante?',
        answer: 'Sì, una volta confermata la prenotazione è considerata definitiva. Puoi tuttavia modificarla o annullarla fino a 24 ore prima senza alcun costo.'
      },
      {
        question: 'Devo pagare al momento della prenotazione?',
        answer: 'No, il pagamento avviene al momento della visita in struttura. Accettiamo contanti, carte di credito/debito e bancomat.'
      },
      {
        question: 'Come faccio a modificare la mia prenotazione?',
        answer: 'Puoi modificare la prenotazione accedendo all\'area riservata del sito, cliccando sul link nell\'email di conferma, o contattando la nostra segreteria.'
      },
      {
        question: 'Posso prenotare per un familiare?',
        answer: 'Sì, puoi prenotare per conto di familiari o altre persone. Assicurati di inserire i dati corretti della persona che effettuerà la visita.'
      },
      {
        question: 'Quanto tempo prima posso prenotare?',
        answer: 'Puoi prenotare da domani fino a 60 giorni in anticipo. Per date oltre i 60 giorni, contatta la segreteria telefonica.'
      }
    ]
  },

  cta: {
    title: 'Hai Bisogno di Aiuto?',
    description: 'Il nostro team è a disposizione per assisterti nella prenotazione o per qualsiasi informazione.',
    primaryButton: {
      text: 'Chiama Ora',
      href: 'tel:+390212345678',
      icon: 'Phone'
    },
    secondaryButton: {
      text: 'Contattaci',
      href: '/medica-contatti',
      icon: 'Mail'
    },
    backgroundVariant: 'medical-gradient'
  }
};

async function updatePage() {
  try {
    const page = await prisma.cMSPage.findFirst({
      where: {
        tenantId: TENANT_ID,
        slug: 'medica-prenota',
        deletedAt: null
      }
    });

    if (!page) {
      await prisma.cMSPage.create({
        data: {
          slug: 'medica-prenota',
          title: 'Prenota Online - Element Medica',
          content: prenotaContent,
          layout: 'full-width',
          status: 'published',
          isPublished: true,
          publishedAt: new Date(),
          seoTitle: 'Prenota Online | Visite Specialistiche Milano | Element Medica',
          seoDescription: 'Prenota online la tua visita specialistica o esame diagnostico. Conferma immediata, disponibilità entro 48h. Sistema sicuro e semplice.',
          tenantId: TENANT_ID
        }
      });
      console.log('✅ Pagina Prenota Online creata');
    } else {
      await prisma.cMSPage.update({
        where: { id: page.id },
        data: {
          title: 'Prenota Online - Element Medica',
          content: prenotaContent,
          seoTitle: 'Prenota Online | Visite Specialistiche Milano | Element Medica',
          seoDescription: 'Prenota online la tua visita specialistica o esame diagnostico. Conferma immediata, disponibilità entro 48h. Sistema sicuro e semplice.',
          updatedAt: new Date()
        }
      });
      console.log('✅ Pagina Prenota Online aggiornata');
    }
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updatePage();
