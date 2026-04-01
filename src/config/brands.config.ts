/**
 * Brand Configuration System
 * Supporta multi-frontend: ElementSicurezza + ElementMedica
 *
 * PALETTE COLORI (verificata dai loghi originali vettoriali):
 *   Teal/Salvia   #A1C8C1  →  Tailwind teal-300/custom
 *   Navy/Blu      #233747  →  Tailwind slate-800/custom
 *   Nebbia        #EDF1EE  →  Tailwind gray-50/custom
 *   Giallo Acento #E9BA49  →  Tailwind amber-400/custom
 *
 * Element srl - P.IVA 05580640281
 * Sede operativa: Via Bracciano 34, 35030 Selvazzano Dentro (PD)
 * Sede legale: Via Piave 4, 35138 Padova
 * PEC: element.srl@pec.it
 *
 * LOGHI (PNG WEB da archivio ufficiale):
 *   /assets/logos/element-medica-logo.png          — positivo orizzontale
 *   /assets/logos/element-medica-logo-white.png    — negativo (su sfondo scuro)
 *   /assets/logos/element-medica-logo-compact.png  — stretto orizzontale
 *   /assets/logos/element-medica-icon.png          — circolare (favicon/icona)
 *   /assets/logos/element-sicurezza-logo.png       — positivo orizzontale
 *   /assets/logos/element-sicurezza-logo-white.png — negativo
 *   /assets/logos/element-sicurezza-icon.png       — circolare
 *   /assets/logos/element-pittogramma-salvia.png   — pittogramma colore brand
 *   /assets/logos/element-pittogramma-white.png    — pittogramma bianco
 *   /assets/logos/element-logo-completo.png        — logo Element srl completo
 */

export type BrandId = 'element-sicurezza' | 'element-medica';

export interface BrandConfig {
  id: BrandId;
  name: string;
  displayName: string;
  tagline: string;
  description: string;

  // Visual Identity — PNG WEB da archivio loghi ufficiale
  logo: string;           // positivo orizzontale (su sfondo chiaro)
  logoWhite: string;      // negativo / bianco (su sfondo scuro)
  logoCompact: string;    // versione stretto/compatta
  logoIcon: string;       // circolare (navbar, favicon app)
  logoAlt: string;
  favicon: string;
  theme: 'medical' | 'formazione';

  // Color Palette verificata dai loghi originali
  colors: {
    primary: string;    // Teal/Salvia #A1C8C1
    secondary: string;  // Navy #233747
    accent: string;     // Accento brand-specifico
    light: string;      // Sfondo chiaro
  };

  // Contact Information
  contacts: {
    companyName: string;
    phone: string;
    email: string;
    address: string;
    sedeLegale: string;
    pec: string;
    vat: string;
    website: string;
  };

  // Social Media
  social: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
  };

  // Features Enabled
  features: {
    medicinaLavoro: boolean;
    corsiFormazione: boolean;
    rspp: boolean;
    poliambulatorio: boolean;
    prenotazioniOnline: boolean;
    telemedicina: boolean;
  };

  // SEO Configuration
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage: string;
  };

  // Navigation Menu
  navigation: {
    label: string;
    href: string;
    icon?: string;
  }[];

  // CTA Buttons Configuration
  cta: {
    primary: {
      text: string;
      href: string;
      variant: 'primary' | 'medical';
    };
    secondary: {
      text: string;
      href: string;
    };
  };

  // Backend Integration
  backend: {
    tenantId: string;
    frontendId: BrandId;
  };

  // Admin Panel URL (for "Area Riservata" redirect)
  adminUrl?: string;
}

/**
 * ElementSicurezza - Formazione Sicurezza e Medicina del Lavoro
 * Colori verificati dai loghi originali vettoriali
 */
export const elementSicurezzaBrand: BrandConfig = {
  id: 'element-sicurezza',
  name: 'ElementSicurezza',
  displayName: 'Element Sicurezza',
  tagline: 'Sicurezza sul Lavoro Senza Compromessi',
  description: 'Leader nella formazione sulla sicurezza e medicina del lavoro. Offriamo soluzioni complete per la conformità normativa e la protezione dei lavoratori.',

  // PNG WEB da archivio loghi ufficiale Element srl
  logo: '/assets/logos/element-sicurezza-logo.png',
  logoWhite: '/assets/logos/element-sicurezza-logo-white.png',
  logoCompact: '/assets/logos/element-sicurezza-logo-compact.png',
  logoIcon: '/assets/logos/element-sicurezza-icon.png',
  logoAlt: 'Element Sicurezza Logo',
  favicon: '/assets/logos/element-sicurezza-favicon.ico',
  theme: 'formazione',

  // Colori verificati dai loghi originali
  colors: {
    primary: '#A1C8C1',    // Teal/Salvia — colore pittogramma
    secondary: '#233747',  // Navy/Blu scuro — colore testo
    accent: '#E9BA49',     // Giallo ambra — accento
    light: '#EDF1EE',      // Nebbia — sfondo chiaro
  },

  contacts: {
    companyName: 'Element srl',
    phone: '+39 351 623 9176',
    email: 'info@elementsicurezza.com',
    address: 'Via Bracciano 34, 35030 Selvazzano Dentro (PD)',
    sedeLegale: 'Via Piave 4, 35138 Padova',
    pec: 'element.srl@pec.it',
    vat: '05580640281',
    website: 'https://www.elementsicurezza.com',
  },

  social: {
    linkedin: 'https://linkedin.com/company/element-sicurezza',
    facebook: 'https://facebook.com/elementsicurezza',
  },

  features: {
    medicinaLavoro: true,
    corsiFormazione: true,
    rspp: true,
    poliambulatorio: false,
    prenotazioniOnline: false,
    telemedicina: false,
  },

  seo: {
    title: 'Element Sicurezza - Formazione Sicurezza e Medicina del Lavoro a Padova',
    description: 'Servizi di medicina del lavoro, corsi di formazione sulla sicurezza e consulenza RSPP. Oltre 15 anni di esperienza, 500+ aziende clienti a Selvazzano Dentro (PD).',
    keywords: [
      'medicina del lavoro',
      'corsi sicurezza',
      'formazione lavoratori',
      'RSPP',
      'sorveglianza sanitaria',
      'D.Lgs 81/08',
      'sicurezza sul lavoro Padova',
    ],
    ogImage: '/assets/logos/element-sicurezza-og-preview.png',
  },

  navigation: [
    { label: 'Home', href: '/' },
    { label: 'Medicina del Lavoro', href: '/medicina-del-lavoro' },
    { label: 'Corsi', href: '/corsi' },
    { label: 'RSPP', href: '/rspp' },
    { label: 'Tutti i Servizi', href: '/gruppo-servizi' },
    { label: 'Chi Siamo', href: '/chi-siamo' },
    { label: 'Contatti', href: '/contatti' },
  ],

  cta: {
    primary: {
      text: 'Chiedi un Preventivo',
      href: '/contatti',
      variant: 'medical',
    },
    secondary: {
      text: 'Scopri i Corsi',
      href: '/corsi',
    },
  },

  backend: {
    // P-BRAND: element-sicurezza è un branch di Element srl (stesso tenant di element-medica)
    // Il tenant 939a5fd8 è un'azienda cliente distinta, non un branch di Element srl
    tenantId: import.meta.env.VITE_TENANT_ID || '6a8e68d7-1958-44d8-af50-2121f638db5c',
    frontendId: 'element-sicurezza',
  },
};

/**
 * ElementMedica - Poliambulatorio con focus Medicina del Lavoro
 * Tenant: Element srl (frontend pubblico principale)
 * Colori verificati dai loghi originali vettoriali
 */
export const elementMedicaBrand: BrandConfig = {
  id: 'element-medica',
  name: 'ElementMedica',
  displayName: 'Element Medica',
  tagline: 'Il Tuo Poliambulatorio di Fiducia',
  description: 'Poliambulatorio specializzato in medicina del lavoro, visite specialistiche e diagnostica. Professionalità e tecnologie avanzate per la tua salute.',

  // PNG WEB da archivio loghi ufficiale Element srl
  logo: '/assets/logos/element-medica-logo.png',
  logoWhite: '/assets/logos/element-medica-logo-white.png',
  logoCompact: '/assets/logos/element-medica-logo-compact.png',
  logoIcon: '/assets/logos/element-medica-icon.png',
  logoAlt: 'Element Medica — Element srl',
  favicon: '/assets/logos/element-medica-favicon.ico',
  theme: 'medical',

  // Colori verificati dai loghi originali
  colors: {
    primary: '#A1C8C1',    // Teal/Salvia — colore pittogramma
    secondary: '#233747',  // Navy/Blu scuro — colore testo
    accent: '#EDF1EE',     // Nebbia — sfondo chiaro/accento
    light: '#F7FAF9',      // Off-white medico
  },

  contacts: {
    companyName: 'Element srl',
    phone: '+39 351 318 1574',
    email: 'info@elementmedica.com',
    address: 'Via Bracciano 34, 35030 Selvazzano Dentro (PD)',
    sedeLegale: 'Via Piave 4, 35138 Padova',
    pec: 'element.srl@pec.it',
    vat: '05580640281',
    website: 'https://www.elementmedica.com',
  },

  social: {
    linkedin: 'https://linkedin.com/company/element-medica',
    facebook: 'https://facebook.com/elementmedica',
    instagram: 'https://instagram.com/elementmedica',
  },

  features: {
    medicinaLavoro: true, // Servizio PRIMARIO
    corsiFormazione: false,
    rspp: false,
    poliambulatorio: true,
    prenotazioniOnline: true,
    telemedicina: true,
  },

  seo: {
    title: 'Element Medica - Poliambulatorio e Medicina del Lavoro a Padova',
    description: 'Poliambulatorio specializzato: medicina del lavoro, visite specialistiche, diagnostica strumentale a Selvazzano Dentro (PD). Prenota online la tua visita.',
    keywords: [
      'poliambulatorio Padova',
      'medicina del lavoro',
      'visite mediche',
      'sorveglianza sanitaria',
      'visite specialistiche',
      'prenotazione visite online',
      'Selvazzano Dentro',
    ],
    ogImage: '/assets/logos/element-medica-og-preview.png',
  },

  navigation: [
    { label: 'Home', href: '/' },
    { label: 'Medicina del Lavoro', href: '/medicina-del-lavoro' },
    { label: 'Visite Specialistiche', href: '/visite-specialistiche' },
    { label: 'Equipe Medica', href: '/medici' },
    { label: 'Diagnostica', href: '/diagnostica' },
    { label: 'Tutti i Servizi', href: '/gruppo-servizi' },
    { label: 'Prenota Online', href: '/prenota' },
    { label: 'Chi Siamo', href: '/chi-siamo' },
    { label: 'Contatti', href: '/contatti' },
  ],

  cta: {
    primary: {
      text: 'Prenota Visita',
      href: '/prenota',
      variant: 'medical',
    },
    secondary: {
      text: 'Medicina del Lavoro',
      href: '/medicina-del-lavoro',
    },
  },

  backend: {
    tenantId: import.meta.env.VITE_TENANT_ID || '6a8e68d7-1958-44d8-af50-2121f638db5c',
    frontendId: 'element-medica',
  },

  // Element Medica usa la dashboard locale (non redirect a Element Sicurezza)
  // adminUrl non necessario - usa il comportamento standard
};

/**
 * Brand Registry
 */
export const BRANDS: Record<BrandId, BrandConfig> = {
  'element-sicurezza': elementSicurezzaBrand,
  'element-medica': elementMedicaBrand,
};

/**
 * Get current brand from environment variable or default
 */
export function getCurrentBrand(): BrandConfig {
  const brandId = (import.meta.env.VITE_BRAND_ID as BrandId) || 'element-sicurezza';
  return BRANDS[brandId] || elementSicurezzaBrand;
}

/**
 * Get brand by ID
 */
export function getBrandById(id: BrandId): BrandConfig {
  return BRANDS[id];
}

/**
 * Get all available brands
 */
export function getAllBrands(): BrandConfig[] {
  return Object.values(BRANDS);
}
