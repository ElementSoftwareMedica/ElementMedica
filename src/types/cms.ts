/**
 * CMS Page Content Types
 * 
 * Schema uniforme per tutte le pagine CMS del frontend pubblico
 * Versione: 1.0
 * Data: 2025-11-16
 */

// ============================================================================
// SECTION TYPES - Tipologie di sezioni disponibili
// ============================================================================

/**
 * Sezione Hero - Banner principale della pagina
 */
export interface CMSHeroSection {
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  backgroundImage?: string;
  ctaPrimary?: {
    text: string;
    href: string;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  ctaSecondary?: {
    text: string;
    href: string;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  alignment?: 'left' | 'center' | 'right';
  showStats?: boolean;
  stats?: Array<{
    number: string;
    label: string;
  }>;
  showContactForm?: boolean;
}

/**
 * Sezione Testo - Contenuto testuale semplice
 */
export interface CMSTextSection {
  type: 'text';
  id: string;
  title?: string;
  subtitle?: string;
  content: string; // Markdown o HTML
  alignment?: 'left' | 'center' | 'right';
  backgroundColor?: string;
}

/**
 * Sezione Features - Elenco di caratteristiche con icone
 */
export interface CMSFeaturesSection {
  type: 'features';
  id: string;
  title?: string;
  subtitle?: string;
  features: Array<{
    icon?: string; // Nome icona Lucide React
    title: string;
    description: string;
    image?: string;
  }>;
  columns?: 2 | 3 | 4;
  backgroundColor?: string;
}

/**
 * Sezione Cards - Griglia di card
 */
export interface CMSCardsSection {
  type: 'cards';
  id: string;
  title?: string;
  subtitle?: string;
  cards: Array<{
    id: string;
    title: string;
    description: string;
    image?: string;
    icon?: string;
    ctaText?: string;
    ctaHref?: string;
    features?: string[];
  }>;
  columns?: 2 | 3 | 4;
  backgroundColor?: string;
}

/**
 * Sezione Stats - Statistiche numeriche
 */
export interface CMSStatsSection {
  type: 'stats';
  id: string;
  title?: string;
  subtitle?: string;
  stats: Array<{
    number: string;
    label: string;
    description?: string;
  }>;
  columns?: 2 | 3 | 4;
  backgroundColor?: string;
}

/**
 * Sezione Testimonials - Recensioni/testimonianze
 */
export interface CMSTestimonialsSection {
  type: 'testimonials';
  id: string;
  title?: string;
  subtitle?: string;
  testimonials: Array<{
    id: string;
    name: string;
    company?: string;
    role?: string;
    text: string;
    rating?: number;
    image?: string;
  }>;
  backgroundColor?: string;
}

/**
 * Sezione CTA - Call to Action
 */
export interface CMSCtaSection {
  type: 'cta';
  id: string;
  title: string;
  description?: string;
  primaryButton: {
    text: string;
    href: string;
  };
  secondaryButton?: {
    text: string;
    href: string;
  };
  backgroundColor?: string;
  backgroundImage?: string;
}

/**
 * Sezione FAQ - Domande frequenti
 */
export interface CMSFaqSection {
  type: 'faq';
  id: string;
  title?: string;
  subtitle?: string;
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
  backgroundColor?: string;
}

/**
 * Sezione Contact Info - Informazioni di contatto
 */
export interface CMSContactInfoSection {
  type: 'contact-info';
  id: string;
  title?: string;
  subtitle?: string;
  address?: string;
  phone?: string;
  email?: string;
  hours?: string;
  showMap?: boolean;
  mapEmbedUrl?: string;
  showContactForm?: boolean;
  backgroundColor?: string;
}

/**
 * Sezione base per estensibilità
 */
export interface CMSBaseSection {
  type: string;
  id: string;
  title?: string;
  subtitle?: string;
  [key: string]: any; // Permette campi aggiuntivi custom
}

/**
 * Union type per tutte le sezioni
 */
export type CMSSection =
  | CMSTextSection
  | CMSFeaturesSection
  | CMSCardsSection
  | CMSStatsSection
  | CMSTestimonialsSection
  | CMSCtaSection
  | CMSFaqSection
  | CMSContactInfoSection
  | CMSBaseSection; // Supporta sezioni custom

// ============================================================================
// PAGE CONTENT - Schema principale per content JSONB
// ============================================================================

/**
 * Schema completo per il campo `content` (JSONB) della tabella cms_pages
 */
export interface CMSPageContent {
  /**
   * Sezione Hero - Sempre presente in cima alla pagina
   */
  hero?: CMSHeroSection;

  /**
   * Sezioni dinamiche della pagina (ordinate)
   */
  sections?: CMSSection[];

  /**
   * Metadata SEO addizionale (opzionale, integra i campi seoTitle/seoDescription della tabella)
   */
  seo?: {
    keywords?: string[];
    ogImage?: string;
    twitterCard?: 'summary' | 'summary_large_image';
    canonicalUrl?: string;
  };

  /**
   * Configurazione layout e tema
   */
  metadata?: {
    showContactForm?: boolean;
    layout?: 'full-width' | 'boxed';
    theme?: 'light' | 'dark';
    showBreadcrumbs?: boolean;
    showLastUpdated?: boolean;
  };

  /**
   * Campi dinamici aggiuntivi per contenuti custom
   * Permette qualsiasi campo JSON aggiuntivo per flessibilità del CMS
   */
  [key: string]: any;
}

// ============================================================================
// PAGE TYPES - Tipologie di pagine CMS
// ============================================================================

export type CMSPageType =
  | 'homepage'
  | 'service'
  | 'contact'
  | 'about'
  | 'career'
  | 'legal'
  | 'generic';

/**
 * Template predefiniti per tipo di pagina
 */
export interface CMSPageTemplate {
  type: CMSPageType;
  name: string;
  description: string;
  defaultContent: CMSPageContent;
}

// ============================================================================
// TYPE GUARDS - Validazione runtime dei tipi
// ============================================================================

/**
 * Verifica se un oggetto è una CMSHeroSection valida
 */
export function isCMSHeroSection(obj: any): obj is CMSHeroSection {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.title === 'string'
  );
}

/**
 * Verifica se un oggetto è una CMSSection valida
 * Ora accetta qualsiasi tipo di sezione per flessibilità
 */
export function isCMSSection(obj: any): obj is CMSSection {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.type === 'string' &&
    typeof obj.id === 'string'
  );
}

/**
 * Verifica se un oggetto è un CMSPageContent valido
 */
export function isCMSPageContent(obj: any): obj is CMSPageContent {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  // Hero opzionale ma se presente deve essere valido
  if (obj.hero !== undefined && !isCMSHeroSection(obj.hero)) {
    return false;
  }

  // Sections opzionale ma se presente deve essere array di CMSSection
  if (obj.sections !== undefined) {
    if (!Array.isArray(obj.sections)) {
      return false;
    }
    if (!obj.sections.every(isCMSSection)) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Crea un template vuoto per un tipo di pagina
 */
export function createEmptyPageContent(pageType: CMSPageType): CMSPageContent {
  const templates: Record<CMSPageType, CMSPageContent> = {
    homepage: {
      hero: {
        title: 'Benvenuti',
        subtitle: 'Il tuo partner di fiducia',
        description: 'Descrizione homepage',
      },
      sections: [],
      metadata: {
        layout: 'full-width',
        theme: 'light',
      },
    },
    service: {
      hero: {
        title: 'I Nostri Servizi',
        subtitle: 'Soluzioni su misura per te',
      },
      sections: [],
      metadata: {
        layout: 'full-width',
      },
    },
    contact: {
      hero: {
        title: 'Contattaci',
        subtitle: 'Siamo qui per aiutarti',
      },
      sections: [
        {
          type: 'contact-info',
          id: 'contact-1',
          showContactForm: true,
        },
      ],
      metadata: {
        layout: 'boxed',
        showContactForm: true,
      },
    },
    about: {
      hero: {
        title: 'Chi Siamo',
        subtitle: 'La nostra storia',
      },
      sections: [],
      metadata: {
        layout: 'boxed',
      },
    },
    career: {
      hero: {
        title: 'Lavora con Noi',
        subtitle: 'Unisciti al nostro team',
      },
      sections: [],
      metadata: {
        layout: 'full-width',
      },
    },
    legal: {
      hero: {
        title: 'Informazioni Legali',
      },
      sections: [],
      metadata: {
        layout: 'boxed',
        showLastUpdated: true,
      },
    },
    generic: {
      hero: {
        title: 'Pagina Generica',
      },
      sections: [],
      metadata: {
        layout: 'full-width',
      },
    },
  };

  return templates[pageType] || templates.generic;
}

/**
 * Valida e sanitizza il content JSON
 */
export function validateAndSanitizeCMSContent(
  content: any
): CMSPageContent | null {
  if (!isCMSPageContent(content)) {
    console.error('Invalid CMS content structure:', content);
    return null;
  }

  return content;
}
