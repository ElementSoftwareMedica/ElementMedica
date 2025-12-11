/**
 * Brand Configuration System
 * Supporta multi-frontend: ElementFormazione + ElementMedica
 */

export type BrandId = 'element-formazione' | 'element-medica';

export interface BrandConfig {
  id: BrandId;
  name: string;
  displayName: string;
  tagline: string;
  description: string;

  // Visual Identity
  logo: string;
  logoAlt: string;
  favicon: string;
  theme: 'medical' | 'formazione';

  // Color Palette (override defaults)
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };

  // Contact Information
  contacts: {
    phone: string;
    email: string;
    address: string;
    pec?: string;
    vat?: string;
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
 * ElementFormazione - Formazione e Medicina del Lavoro
 */
export const elementFormazioneBrand: BrandConfig = {
  id: 'element-formazione',
  name: 'ElementFormazione',
  displayName: 'Element Formazione',
  tagline: 'Sicurezza sul Lavoro Senza Compromessi',
  description: 'Leader nella formazione sulla sicurezza e medicina del lavoro. Offriamo soluzioni complete per la conformità normativa e la protezione dei lavoratori.',

  logo: '/assets/logos/element-formazione-logo.svg',
  logoAlt: 'Element Formazione Logo',
  favicon: '/assets/logos/element-formazione-favicon.ico',
  theme: 'formazione',

  colors: {
    primary: '#0891b2', // Medical cyan
    secondary: '#64748b',
    accent: '#22c55e', // Health green
  },

  contacts: {
    phone: '+39 351 623 9176',
    email: 'info@elementformazione.com',
    address: 'Via Bracciano 34, 35030 Selvazzano Dentro (PD)',
    pec: 'element.srl@pec.it',
    vat: '05580640281',
  },

  social: {
    linkedin: 'https://linkedin.com/company/element-formazione',
    facebook: 'https://facebook.com/elementformazione',
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
    title: 'Element Formazione - Medicina del Lavoro e Formazione Sicurezza',
    description: 'Servizi di medicina del lavoro, corsi di formazione sulla sicurezza e consulenza RSPP. Oltre 15 anni di esperienza, 500+ aziende clienti.',
    keywords: [
      'medicina del lavoro',
      'corsi sicurezza',
      'formazione lavoratori',
      'RSPP',
      'sorveglianza sanitaria',
      'D.Lgs 81/08',
    ],
    ogImage: '/assets/og/element-formazione-og.jpg',
  },

  navigation: [
    { label: 'Home', href: '/' },
    { label: 'Medicina del Lavoro', href: '/medicina-del-lavoro' },
    { label: 'Corsi', href: '/corsi' },
    { label: 'RSPP', href: '/rspp' },
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
    tenantId: import.meta.env.VITE_TENANT_ID || 'd2bbc5b0-344c-47c7-8ef5-f57755293372',
    frontendId: 'element-formazione',
  },
};

/**
 * ElementMedica - Poliambulatorio con focus Medicina del Lavoro
 */
export const elementMedicaBrand: BrandConfig = {
  id: 'element-medica',
  name: 'ElementMedica',
  displayName: 'Element Medica',
  tagline: 'Il Tuo Poliambulatorio di Fiducia',
  description: 'Poliambulatorio specializzato in medicina del lavoro, visite specialistiche e diagnostica. Professionalità e tecnologie avanzate per la tua salute.',

  logo: '/assets/logos/element-medica-logo.svg',
  logoAlt: 'Element Medica Logo',
  favicon: '/assets/logos/element-medica-favicon.ico',
  theme: 'medical',

  colors: {
    primary: '#06b6d4', // Medical cyan (più chiaro)
    secondary: '#475569',
    accent: '#10b981', // Health green
  },

  contacts: {
    phone: '+39 351 318 1574',
    email: 'info@elementmedica.com',
    address: 'Via Bracciano 34, 35030 Selvazzano Dentro (PD)',
    pec: 'element.srl@pec.it',
    vat: '05580640281',
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
    title: 'Element Medica - Poliambulatorio e Medicina del Lavoro Milano',
    description: 'Poliambulatorio specializzato: medicina del lavoro, visite specialistiche, diagnostica strumentale. Prenota online la tua visita.',
    keywords: [
      'poliambulatorio milano',
      'medicina del lavoro',
      'visite mediche',
      'sorveglianza sanitaria',
      'visite specialistiche',
      'prenotazione visite online',
    ],
    ogImage: '/assets/og/element-medica-og.jpg',
  },

  navigation: [
    { label: 'Home', href: '/' },
    { label: 'Medicina del Lavoro', href: '/medicina-del-lavoro' },
    { label: 'Visite Specialistiche', href: '/visite-specialistiche' },
    { label: 'Diagnostica', href: '/diagnostica' },
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
    tenantId: import.meta.env.VITE_TENANT_ID || 'tenant-element-medica-001',
    frontendId: 'element-medica',
  },

  // Element Medica usa la dashboard locale (non redirect a Element Formazione)
  // adminUrl non necessario - usa il comportamento standard
};

/**
 * Brand Registry
 */
export const BRANDS: Record<BrandId, BrandConfig> = {
  'element-formazione': elementFormazioneBrand,
  'element-medica': elementMedicaBrand,
};

/**
 * Get current brand from environment variable or default
 */
export function getCurrentBrand(): BrandConfig {
  const brandId = (import.meta.env.VITE_BRAND_ID as BrandId) || 'element-formazione';
  return BRANDS[brandId] || elementFormazioneBrand;
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
