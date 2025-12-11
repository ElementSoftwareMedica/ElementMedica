/**
 * Script per Contatti Element Medica Premium
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TENANT_ID = 'tenant-element-medica-001';

const contattiContent = {
  metadata: {
    theme: 'medical',
    layout: 'full-width',
    colorScheme: 'teal'
  },
  
  hero: {
    title: 'Contattaci',
    subtitle: 'Siamo Qui per Te',
    description: 'Hai domande o vuoi prenotare una visita? Il nostro team è a disposizione per assisterti. Contattaci telefonicamente, via email o compila il modulo sottostante.',
    backgroundVariant: 'medical-contact'
  },

  contactInfo: {
    title: 'Come Raggiungerci',
    items: [
      {
        icon: 'Phone',
        title: 'Telefono',
        primary: '+39 02 1234 5678',
        secondary: 'Lun-Ven 8:00-19:00, Sab 8:00-13:00',
        action: { type: 'tel', href: 'tel:+390212345678' }
      },
      {
        icon: 'Mail',
        title: 'Email',
        primary: 'info@elementmedica.it',
        secondary: 'Rispondiamo entro 24 ore',
        action: { type: 'mailto', href: 'mailto:info@elementmedica.it' }
      },
      {
        icon: 'MessageSquare',
        title: 'WhatsApp',
        primary: '+39 333 123 4567',
        secondary: 'Per prenotazioni rapide',
        action: { type: 'whatsapp', href: 'https://wa.me/393331234567' }
      },
      {
        icon: 'MapPin',
        title: 'Indirizzo',
        primary: 'Via della Salute, 123',
        secondary: '20100 Milano (MI)',
        action: { type: 'maps', href: 'https://maps.google.com/?q=Via+della+Salute+123+Milano' }
      }
    ]
  },

  location: {
    title: 'La Nostra Sede',
    address: {
      street: 'Via della Salute, 123',
      city: 'Milano',
      cap: '20100',
      region: 'Lombardia',
      country: 'Italia'
    },
    coordinates: {
      lat: 45.4642,
      lng: 9.1900
    },
    directions: {
      car: 'Uscita tangenziale Milano Nord. Parcheggio convenzionato "ParkMed" a 50m con tariffa agevolata per pazienti.',
      metro: 'Metro M1 (rossa), fermata "Salute". 200m a piedi in direzione ovest.',
      bus: 'Linee 42, 56, 78 - Fermata "Via della Salute"',
      train: 'Stazione Centrale a 15 minuti in metro. Stazione Garibaldi a 10 minuti.'
    },
    parking: {
      name: 'ParkMed Convenzionato',
      address: 'Via della Salute, 125',
      rate: '€1,50/ora (tariffa agevolata pazienti)',
      note: 'Ritira il ticket scontato alla reception'
    }
  },

  openingHours: {
    title: 'Orari di Apertura',
    schedule: [
      { days: 'Lunedì - Venerdì', hours: '7:30 - 19:30', services: 'Tutti i servizi' },
      { days: 'Sabato', hours: '8:00 - 13:00', services: 'Visite e prelievi' },
      { days: 'Domenica', hours: 'Chiuso', services: '' }
    ],
    notes: [
      { icon: 'FlaskConical', text: 'Prelievi del sangue: 7:30 - 10:00 (Lun-Sab)' },
      { icon: 'Stethoscope', text: 'Visite specialistiche: su appuntamento' },
      { icon: 'Phone', text: 'Segreteria telefonica: 8:00 - 18:30' }
    ],
    emergency: {
      text: 'Per urgenze fuori orario, contattare il Pronto Soccorso più vicino',
      number: '118'
    }
  },

  contactForm: {
    title: 'Inviaci un Messaggio',
    subtitle: 'Compila il modulo e ti risponderemo entro 24 ore lavorative',
    fields: [
      { name: 'firstName', label: 'Nome', type: 'text', required: true, placeholder: 'Mario' },
      { name: 'lastName', label: 'Cognome', type: 'text', required: true, placeholder: 'Rossi' },
      { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'mario.rossi@email.com' },
      { name: 'phone', label: 'Telefono', type: 'tel', required: false, placeholder: '+39 333 1234567' },
      { 
        name: 'subject', 
        label: 'Oggetto', 
        type: 'select', 
        required: true,
        options: [
          { value: 'info', label: 'Richiesta informazioni' },
          { value: 'booking', label: 'Prenotazione visita' },
          { value: 'corporate', label: 'Medicina del lavoro aziende' },
          { value: 'results', label: 'Referti e risultati' },
          { value: 'complaint', label: 'Reclamo o segnalazione' },
          { value: 'other', label: 'Altro' }
        ]
      },
      { name: 'message', label: 'Messaggio', type: 'textarea', required: true, placeholder: 'Scrivi il tuo messaggio...', rows: 5 }
    ],
    consent: {
      text: 'Acconsento al trattamento dei miei dati personali secondo la Privacy Policy',
      required: true
    },
    submitButton: 'Invia Messaggio'
  },

  departments: {
    title: 'Contatti per Reparto',
    items: [
      {
        name: 'Prenotazioni Visite',
        icon: 'Calendar',
        phone: '+39 02 1234 5601',
        email: 'prenotazioni@elementmedica.it',
        hours: 'Lun-Ven 8:00-18:30, Sab 8:00-12:00'
      },
      {
        name: 'Medicina del Lavoro',
        icon: 'Briefcase',
        phone: '+39 02 1234 5602',
        email: 'medicinadellavoro@elementmedica.it',
        hours: 'Lun-Ven 8:30-17:30'
      },
      {
        name: 'Laboratorio Analisi',
        icon: 'FlaskConical',
        phone: '+39 02 1234 5603',
        email: 'laboratorio@elementmedica.it',
        hours: 'Lun-Sab 7:30-10:00 (prelievi)'
      },
      {
        name: 'Amministrazione',
        icon: 'FileText',
        phone: '+39 02 1234 5604',
        email: 'amministrazione@elementmedica.it',
        hours: 'Lun-Ven 9:00-17:00'
      },
      {
        name: 'Ritiro Referti',
        icon: 'ClipboardCheck',
        phone: '+39 02 1234 5605',
        email: 'referti@elementmedica.it',
        hours: 'Lun-Ven 10:00-18:00, Sab 9:00-12:00'
      }
    ]
  },

  corporateContact: {
    title: 'Per le Aziende',
    subtitle: 'Servizi dedicati di medicina del lavoro',
    description: 'Sei un\'azienda e cerchi un partner per la sorveglianza sanitaria dei tuoi dipendenti? Contatta il nostro reparto corporate per un preventivo personalizzato.',
    contact: {
      name: 'Ufficio Corporate',
      phone: '+39 02 1234 5610',
      email: 'corporate@elementmedica.it',
      manager: 'Dott.ssa Maria Colombo'
    },
    cta: {
      text: 'Richiedi Preventivo Aziendale',
      href: '/medica-contatti?subject=corporate'
    }
  },

  faq: {
    title: 'Domande Frequenti',
    items: [
      {
        question: 'Come posso prenotare una visita?',
        answer: 'Puoi prenotare online tramite il nostro sistema di prenotazione, telefonicamente al numero 02 1234 5678, via WhatsApp o recandoti direttamente presso la nostra sede.'
      },
      {
        question: 'Quanto tempo prima devo arrivare per la visita?',
        answer: 'Consigliamo di presentarsi 10-15 minuti prima dell\'appuntamento per completare eventuali pratiche amministrative. Per la prima visita, portare tessera sanitaria e documento di identità.'
      },
      {
        question: 'Come ritiro i miei referti?',
        answer: 'I referti sono disponibili online nell\'area riservata del nostro sito, vengono inviati via email, oppure possono essere ritirati in sede. Per alcuni esami è possibile richiedere il servizio urgente.'
      },
      {
        question: 'Accettate tutte le assicurazioni sanitarie?',
        answer: 'Siamo convenzionati con molti fondi sanitari e assicurazioni. Ti consigliamo di verificare la tua copertura contattando la nostra segreteria prima della visita.'
      },
      {
        question: 'È possibile disdire un appuntamento?',
        answer: 'Sì, puoi disdire o spostare l\'appuntamento fino a 24 ore prima senza alcun costo. Per disdette oltre tale termine potrebbe essere applicata una penale del 50% della prestazione.'
      }
    ]
  },

  socialMedia: {
    title: 'Seguici sui Social',
    platforms: [
      { name: 'Facebook', icon: 'Facebook', url: 'https://facebook.com/elementmedica', handle: '@elementmedica' },
      { name: 'Instagram', icon: 'Instagram', url: 'https://instagram.com/elementmedica', handle: '@elementmedica' },
      { name: 'LinkedIn', icon: 'Linkedin', url: 'https://linkedin.com/company/elementmedica', handle: 'Element Medica' }
    ]
  },

  cta: {
    title: 'Preferisci Prenotare Direttamente?',
    description: 'Usa il nostro sistema di prenotazione online per scegliere data, ora e specialista in pochi click.',
    primaryButton: {
      text: 'Prenota Online',
      href: '/medica-prenota',
      icon: 'Calendar'
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
        slug: 'medica-contatti',
        deletedAt: null
      }
    });

    if (!page) {
      await prisma.cMSPage.create({
        data: {
          slug: 'medica-contatti',
          title: 'Contatti - Element Medica',
          content: contattiContent,
          layout: 'full-width',
          status: 'published',
          isPublished: true,
          publishedAt: new Date(),
          seoTitle: 'Contatti Element Medica | Poliambulatorio Milano | Prenota Visita',
          seoDescription: 'Contatta Element Medica per prenotazioni e informazioni. Tel: 02 1234 5678. Via della Salute 123, Milano. Orari: Lun-Ven 7:30-19:30, Sab 8:00-13:00.',
          tenantId: TENANT_ID
        }
      });
      console.log('✅ Pagina Contatti creata');
    } else {
      await prisma.cMSPage.update({
        where: { id: page.id },
        data: {
          title: 'Contatti - Element Medica',
          content: contattiContent,
          seoTitle: 'Contatti Element Medica | Poliambulatorio Milano | Prenota Visita',
          seoDescription: 'Contatta Element Medica per prenotazioni e informazioni. Tel: 02 1234 5678. Via della Salute 123, Milano. Orari: Lun-Ven 7:30-19:30, Sab 8:00-13:00.',
          updatedAt: new Date()
        }
      });
      console.log('✅ Pagina Contatti aggiornata');
    }
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updatePage();
