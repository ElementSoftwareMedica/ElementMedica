/**
 * Script per Homepage Element Medica Premium
 * Design professionale con colori medicali (teal, emerald)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TENANT_ID = 'tenant-element-medica-001';

const homepageContent = {
  metadata: {
    theme: 'medical',
    layout: 'full-width',
    colorScheme: 'teal'
  },
  
  hero: {
    title: 'Poliambulatorio',
    subtitle: 'Element Medica',
    tagline: 'La Tua Salute, La Nostra Missione',
    description: 'Da oltre 15 anni offriamo servizi sanitari di eccellenza per aziende e privati. Medicina del lavoro, visite specialistiche e diagnostica avanzata con un team di professionisti dedicati alla tua salute.',
    primaryButton: {
      text: 'Prenota Visita Online',
      href: '/medica-prenota',
      icon: 'Calendar'
    },
    secondaryButton: {
      text: 'Scopri i Nostri Servizi',
      href: '#servizi',
      icon: 'ArrowRight'
    },
    backgroundVariant: 'medical-gradient',
    stats: [
      { number: '50.000+', label: 'Pazienti Assistiti', icon: 'Users' },
      { number: '25+', label: 'Medici Specialisti', icon: 'Stethoscope' },
      { number: '15+', label: 'Anni di Esperienza', icon: 'Award' },
      { number: '98%', label: 'Pazienti Soddisfatti', icon: 'Heart' }
    ],
    trustBadges: [
      { text: 'Accreditato SSN', icon: 'Shield' },
      { text: 'ISO 9001:2015', icon: 'CheckCircle' },
      { text: 'Convenzioni Aziendali', icon: 'Building2' }
    ]
  },

  services: {
    title: 'I Nostri Servizi',
    subtitle: 'Un\'offerta sanitaria completa per ogni esigenza',
    items: [
      {
        icon: 'Stethoscope',
        title: 'Medicina del Lavoro',
        description: 'Sorveglianza sanitaria completa per la tua azienda. Visite preventive, periodiche e consulenza del Medico Competente.',
        href: '/medica-medicina-del-lavoro',
        features: ['Visite Preventive e Periodiche', 'Medico Competente Aziendale', 'Protocolli Sanitari Personalizzati', 'Gestione Idoneità Lavorative'],
        highlight: true,
        colorScheme: 'teal'
      },
      {
        icon: 'UserCheck',
        title: 'Visite Specialistiche',
        description: 'Un team di oltre 25 specialisti per rispondere a ogni necessità medica con professionalità e tempi rapidi.',
        href: '/medica-visite-specialistiche',
        features: ['Cardiologia e Angiologia', 'Ortopedia e Fisiatria', 'Dermatologia', 'Oculistica e Audiometria'],
        colorScheme: 'emerald'
      },
      {
        icon: 'Activity',
        title: 'Diagnostica Strumentale',
        description: 'Tecnologie all\'avanguardia per diagnosi precise e tempestive. Ecografie, ECG, spirometria e molto altro.',
        href: '/medica-diagnostica',
        features: ['Ecografie Multidistrettuali', 'Elettrocardiogramma', 'Spirometria', 'Esami del Sangue'],
        colorScheme: 'cyan'
      }
    ]
  },

  companyNumbers: {
    title: 'Element Medica in Numeri',
    subtitle: 'I risultati di 15 anni di dedizione alla salute',
    stats: [
      { number: '50.000+', label: 'Pazienti Assistiti', icon: 'Users', trend: '+12% annuo' },
      { number: '500+', label: 'Aziende Partner', icon: 'Building2', trend: '+25% annuo' },
      { number: '35.000+', label: 'Visite Specialistiche', icon: 'Clipboard', trend: '+18% annuo' },
      { number: '25.000+', label: 'Esami Diagnostici', icon: 'Activity', trend: '+15% annuo' },
      { number: '25+', label: 'Medici Specialisti', icon: 'Stethoscope', trend: 'In crescita' },
      { number: '98%', label: 'Soddisfazione Pazienti', icon: 'ThumbsUp', trend: 'Stabile' }
    ]
  },

  whyChooseUs: {
    title: 'Perché Scegliere Element Medica',
    subtitle: 'L\'eccellenza sanitaria a portata di mano',
    features: [
      {
        icon: 'Award',
        title: 'Team di Eccellenza',
        description: 'Oltre 25 medici specialisti con esperienza pluriennale e formazione continua nelle migliori strutture ospedaliere.',
        highlight: true
      },
      {
        icon: 'Clock',
        title: 'Tempi Rapidi',
        description: 'Prenotazioni in giornata, tempi di attesa ridotti e referti disponibili entro 24-48 ore dalla visita.',
        highlight: false
      },
      {
        icon: 'Shield',
        title: 'Tecnologia Avanzata',
        description: 'Strumentazione diagnostica di ultima generazione per diagnosi precise e non invasive.',
        highlight: false
      },
      {
        icon: 'Heart',
        title: 'Approccio Umano',
        description: 'Ogni paziente è unico. Offriamo un\'assistenza personalizzata e un ambiente accogliente e confortevole.',
        highlight: true
      },
      {
        icon: 'MapPin',
        title: 'Posizione Centrale',
        description: 'Sede facilmente raggiungibile con mezzi pubblici e parcheggio convenzionato per i pazienti.',
        highlight: false
      },
      {
        icon: 'CreditCard',
        title: 'Convenzioni e Prezzi',
        description: 'Tariffe competitive, convenzioni con le principali assicurazioni e possibilità di pagamento rateizzato.',
        highlight: false
      }
    ]
  },

  howItWorks: {
    title: 'Come Prenotare',
    subtitle: 'Tre semplici passi per la tua visita',
    steps: [
      {
        number: '01',
        icon: 'Calendar',
        title: 'Prenota Online',
        description: 'Scegli lo specialista, la data e l\'ora che preferisci. Prenotazione confermata in tempo reale con pochi click.',
        color: 'teal'
      },
      {
        number: '02',
        icon: 'Bell',
        title: 'Ricevi Conferma',
        description: 'Ti invieremo conferma via email e SMS con tutti i dettagli. Promemoria automatico 24h prima della visita.',
        color: 'emerald'
      },
      {
        number: '03',
        icon: 'CheckCircle',
        title: 'Effettua la Visita',
        description: 'Presentati in ambulatorio all\'orario indicato. Referto digitale disponibile entro 24-48 ore.',
        color: 'cyan'
      }
    ]
  },

  specialties: {
    title: 'Le Nostre Specialità',
    subtitle: 'Un team multidisciplinare per ogni esigenza',
    categories: [
      {
        name: 'Area Cardiologica',
        icon: 'Heart',
        specialties: ['Cardiologia', 'Angiologia', 'Chirurgia Vascolare'],
        color: 'rose'
      },
      {
        name: 'Area Muscolo-Scheletrica',
        icon: 'Bone',
        specialties: ['Ortopedia', 'Fisiatria', 'Reumatologia', 'Fisioterapia'],
        color: 'amber'
      },
      {
        name: 'Area Dermatologica',
        icon: 'Sun',
        specialties: ['Dermatologia', 'Venereologia', 'Allergologia'],
        color: 'orange'
      },
      {
        name: 'Area Sensoriale',
        icon: 'Eye',
        specialties: ['Oculistica', 'Audiometria', 'Otorinolaringoiatria'],
        color: 'blue'
      },
      {
        name: 'Area Internistica',
        icon: 'Stethoscope',
        specialties: ['Medicina Interna', 'Endocrinologia', 'Gastroenterologia'],
        color: 'purple'
      },
      {
        name: 'Medicina del Lavoro',
        icon: 'Briefcase',
        specialties: ['Sorveglianza Sanitaria', 'Visite Preventive', 'Medico Competente'],
        color: 'teal',
        highlight: true
      }
    ]
  },

  testimonials: {
    title: 'Cosa Dicono i Nostri Pazienti',
    subtitle: 'La soddisfazione dei pazienti è la nostra priorità',
    items: [
      {
        name: 'Marco Bianchi',
        role: 'HR Manager',
        company: 'TechCorp Srl',
        text: 'Collaboriamo con Element Medica per la medicina del lavoro da 5 anni. Servizio impeccabile, personale cortese e grande professionalità. Consiglio vivamente.',
        rating: 5,
        avatar: 'MB',
        type: 'corporate'
      },
      {
        name: 'Laura Santini',
        role: 'Paziente',
        text: 'Struttura moderna e accogliente. Il cardiologo è stato molto attento e disponibile a spiegare ogni dettaglio. Tempi di attesa minimi.',
        rating: 5,
        avatar: 'LS',
        type: 'patient'
      },
      {
        name: 'Giuseppe Rossi',
        role: 'Imprenditore',
        company: 'Rossi & Figli',
        text: 'Gestiscono la sorveglianza sanitaria di tutti i nostri 80 dipendenti con efficienza e puntualità. Partner affidabile per la nostra azienda.',
        rating: 5,
        avatar: 'GR',
        type: 'corporate'
      },
      {
        name: 'Anna Verdi',
        role: 'Paziente',
        text: 'Prenotazione online semplicissima. Referto disponibile il giorno dopo. Questo è il servizio sanitario che tutti vorremmo!',
        rating: 5,
        avatar: 'AV',
        type: 'patient'
      }
    ]
  },

  certifications: {
    title: 'Certificazioni e Accreditamenti',
    items: [
      { name: 'ISO 9001:2015', description: 'Sistema di Gestione Qualità', icon: 'Award' },
      { name: 'Accreditamento Regionale', description: 'Struttura Sanitaria Accreditata', icon: 'Shield' },
      { name: 'GDPR Compliant', description: 'Protezione Dati Sanitari', icon: 'Lock' },
      { name: 'Convenzioni SSN', description: 'Alcune prestazioni convenzionate', icon: 'FileCheck' }
    ]
  },

  partners: {
    title: 'Si Fidano di Noi',
    subtitle: 'Oltre 500 aziende ci hanno scelto per la medicina del lavoro',
    logos: [
      { name: 'TechCorp', sector: 'Technology' },
      { name: 'Industria Alfa', sector: 'Manufacturing' },
      { name: 'LogiTrans', sector: 'Logistics' },
      { name: 'BuildPro', sector: 'Construction' },
      { name: 'FoodItalia', sector: 'Food & Beverage' },
      { name: 'GreenEnergy', sector: 'Energy' }
    ]
  },

  cta: {
    title: 'Prenota la Tua Visita Oggi',
    description: 'I nostri specialisti sono pronti ad accoglierti. Prenota online in pochi click o contattaci per maggiori informazioni.',
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
    phoneNumber: '+39 02 1234 5678',
    email: 'info@elementmedica.it',
    backgroundVariant: 'medical-gradient'
  },

  location: {
    title: 'Dove Siamo',
    address: {
      street: 'Via della Salute, 123',
      city: 'Milano',
      cap: '20100',
      region: 'Lombardia'
    },
    phone: '+39 02 1234 5678',
    email: 'info@elementmedica.it',
    hours: [
      { days: 'Lunedì - Venerdì', hours: '8:00 - 19:00' },
      { days: 'Sabato', hours: '8:00 - 13:00' },
      { days: 'Domenica', hours: 'Chiuso' }
    ],
    features: [
      { icon: 'Car', text: 'Parcheggio Convenzionato' },
      { icon: 'Train', text: 'Metro M1 - Fermata Salute' },
      { icon: 'Accessibility', text: 'Accesso Disabili' }
    ]
  }
};

async function updateHomepage() {
  try {
    const page = await prisma.cMSPage.findFirst({
      where: {
        tenantId: TENANT_ID,
        slug: 'medica-homepage',
        deletedAt: null
      }
    });

    if (!page) {
      console.log('❌ Pagina homepage non trovata. Creo nuova pagina...');
      await prisma.cMSPage.create({
        data: {
          slug: 'medica-homepage',
          title: 'Element Medica - Poliambulatorio Milano',
          content: homepageContent,
          layout: 'full-width',
          status: 'published',
          isPublished: true,
          publishedAt: new Date(),
          seoTitle: 'Element Medica | Poliambulatorio Milano | Medicina del Lavoro e Visite Specialistiche',
          seoDescription: 'Poliambulatorio specializzato in medicina del lavoro, visite specialistiche e diagnostica. 25+ specialisti, 50.000+ pazienti. Prenota online.',
          tenantId: TENANT_ID
        }
      });
      console.log('✅ Homepage Element Medica creata');
    } else {
      await prisma.cMSPage.update({
        where: { id: page.id },
        data: {
          title: 'Element Medica - Poliambulatorio Milano',
          content: homepageContent,
          seoTitle: 'Element Medica | Poliambulatorio Milano | Medicina del Lavoro e Visite Specialistiche',
          seoDescription: 'Poliambulatorio specializzato in medicina del lavoro, visite specialistiche e diagnostica. 25+ specialisti, 50.000+ pazienti. Prenota online.',
          updatedAt: new Date()
        }
      });
      console.log('✅ Homepage Element Medica aggiornata');
    }
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateHomepage();
