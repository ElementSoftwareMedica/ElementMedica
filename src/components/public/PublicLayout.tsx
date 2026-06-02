import React, { useEffect } from 'react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { ConsentBanner } from './ConsentBanner';
import { useLocation } from 'react-router-dom';
import { getCurrentBrand } from '@/config/brands.config';

interface PublicLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Layout per le pagine pubbliche (Element Sicurezza / Element Medica)
 * Include header con menu sempre visibile e footer aziendale.
 * SEO brand-aware tramite getCurrentBrand().
 * 
 * NOTA: Le pagine pubbliche usano SEMPRE il tema light.
 * Il dark mode è disponibile solo nel CRM interno.
 */
export const PublicLayout: React.FC<PublicLayoutProps> = ({
  children,
  className = ''
}) => {
  const location = useLocation();
  const brand = getCurrentBrand();
  const brandName = brand.displayName;

  // Forza light mode sulle pagine pubbliche (il dark mode è solo per il CRM)
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';

    return () => {
      // Ripristina dark mode al ritorno al CRM se era attivo
      if (wasDark) {
        root.classList.remove('light');
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      }
    };
  }, []);

  // SEO centralizzato brand-aware
  useEffect(() => {
    const path = location.pathname;

    // Element Sicurezza SEO map
    const sicurezzaSeo: Record<string, { title: string; description: string }> = {
      '/': {
        title: 'Element Sicurezza | Sicurezza sul Lavoro, Corsi e Consulenza',
        description: 'Formazione sulla sicurezza sul lavoro, RSPP e Medicina del Lavoro. Soluzioni complete per aziende: corsi, consulenza, DVR e sorveglianza sanitaria a Selvazzano Dentro (PD).'
      },
      '/corsi': {
        title: 'Corsi di Formazione sulla Sicurezza | Element Sicurezza',
        description: 'Catalogo corsi sicurezza lavoro: rischio basso, medio, alto, preposti, dirigenti, antincendio, primo soccorso e aggiornamenti.'
      },
      '/servizi': {
        title: 'Servizi per la Sicurezza sul Lavoro | Element Sicurezza',
        description: 'Consulenza sicurezza, DVR, RSPP, sorveglianza sanitaria e gestione emergenze. Supporto completo alla conformità normativa.'
      },
      '/rspp': {
        title: 'Nomina RSPP e Consulenza Sicurezza | Element Sicurezza',
        description: 'Servizio RSPP esterno, valutazione rischi, DVR e supporto continuativo per la sicurezza sul lavoro.'
      },
      '/medicina-del-lavoro': {
        title: 'Medicina del Lavoro e Sorveglianza Sanitaria | Element Sicurezza',
        description: 'Visite mediche periodiche, protocolli sanitari e giudizi di idoneità per la tutela della salute dei lavoratori.'
      },
      '/contatti': {
        title: 'Contattaci | Element Sicurezza',
        description: 'Richiedi informazioni o un preventivo gratuito. Via Bracciano 34, 35030 Selvazzano Dentro (PD). Tel: +39 351 623 9176.'
      },
      '/lavora-con-noi': {
        title: 'Lavora con Noi | Element Sicurezza',
        description: 'Scopri le posizioni aperte e invia la tua candidatura per entrare nel team di Element Sicurezza.'
      },
      '/privacy': {
        title: 'Informativa Privacy | Element Sicurezza',
        description: 'Leggi l\'informativa sul trattamento dei dati personali in conformità al GDPR.'
      },
      '/cookie': {
        title: 'Cookie Policy | Element Sicurezza',
        description: 'Informazioni sull\'uso dei cookie e come gestire le preferenze di tracciamento.'
      },
      '/termini': {
        title: 'Termini e Condizioni | Element Sicurezza',
        description: 'Condizioni generali di utilizzo del sito e dei servizi di Element Sicurezza.'
      },
      '/chi-siamo': {
        title: 'Chi Siamo | Element Sicurezza',
        description: 'Scopri la storia e il team di Element Sicurezza. Oltre 15 anni di esperienza nella sicurezza sul lavoro a Selvazzano Dentro (PD).'
      },
      '/gruppo-servizi': {
        title: 'Tutti i Servizi | Element Medica & Element Sicurezza',
        description: 'Scopri tutti i servizi del Gruppo Element: medicina del lavoro, formazione sicurezza, visite specialistiche, diagnostica e consulenza aziendale a Selvazzano Dentro (PD).'
      }
    };

    // Element Medica SEO map
    const medicaSeo: Record<string, { title: string; description: string }> = {
      '/': {
        title: 'Element Medica | Poliambulatorio e Medicina del Lavoro',
        description: 'Poliambulatorio specializzato in medicina del lavoro, visite specialistiche e diagnostica strumentale a Selvazzano Dentro (PD). Prenota online.'
      },
      '/medicina-del-lavoro': {
        title: 'Medicina del Lavoro | Element Medica',
        description: 'Sorveglianza sanitaria, visite mediche periodiche, protocolli sanitari e giudizi di idoneità per lavoratori a Selvazzano Dentro (PD).'
      },
      '/visite-specialistiche': {
        title: 'Visite Specialistiche | Element Medica',
        description: 'Visite specialistiche con professionisti qualificati: cardiologia, ortopedia, dermatologia e molto altro a Selvazzano Dentro (PD).'
      },
      '/diagnostica': {
        title: 'Diagnostica Strumentale | Element Medica',
        description: 'Esami diagnostici con tecnologie avanzate: ecografia, elettrocardiogramma, spirometria e audiometria a Selvazzano Dentro (PD).'
      },
      '/prenota': {
        title: 'Prenota Online | Element Medica',
        description: 'Prenota la tua visita online in modo semplice e veloce. Poliambulatorio Element Medica a Selvazzano Dentro (PD).'
      },
      '/contatti': {
        title: 'Contattaci | Element Medica',
        description: 'Contatta Element Medica. Via Bracciano 34, 35030 Selvazzano Dentro (PD). Tel: +39 351 318 1574.'
      },
      '/chi-siamo': {
        title: 'Chi Siamo | Element Medica',
        description: 'Scopri il poliambulatorio Element Medica: professionalità, tecnologie avanzate e attenzione al paziente a Selvazzano Dentro (PD).'
      },
      '/lavora-con-noi': {
        title: 'Lavora con Noi | Element Medica',
        description: 'Scopri le posizioni aperte e invia la tua candidatura per entrare nel team di Element Medica.'
      },
      '/privacy': {
        title: 'Informativa Privacy | Element Medica',
        description: 'Leggi l\'informativa sul trattamento dei dati personali in conformità al GDPR.'
      },
      '/cookie': {
        title: 'Cookie Policy | Element Medica',
        description: 'Informazioni sull\'uso dei cookie e come gestire le preferenze di tracciamento.'
      },
      '/termini': {
        title: 'Termini e Condizioni | Element Medica',
        description: 'Condizioni generali di utilizzo del sito e dei servizi di Element Medica.'
      },
      '/gruppo-servizi': {
        title: 'Tutti i Servizi | Element Medica & Element Sicurezza',
        description: 'Scopri tutti i servizi del Gruppo Element: medicina del lavoro, formazione sicurezza, visite specialistiche, diagnostica e consulenza aziendale a Selvazzano Dentro (PD).'
      }
    };

    // Select SEO map based on current brand
    const seoByPath = brand.id === 'element-medica' ? medicaSeo : sicurezzaSeo;

    const isCourseDetail = /^\/corsi\/(unified\/[^/]+|[^/]+)$/.test(path);

    const meta = isCourseDetail
      ? {
        title: `Dettaglio Corso | ${brandName}`,
        description: `Informazioni dettagliate sul corso: obiettivi, programma, durata e requisiti. ${brandName} - ${brand.contacts.address}.`
      }
      : seoByPath[path] || seoByPath['/'];

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const canonicalUrl = baseUrl + path;
    const defaultOgImage = baseUrl + brand.seo.ogImage;

    const setTag = (selector: string, createEl: () => HTMLElement, setProps: (el: HTMLElement) => void) => {
      let el = document.head.querySelector(selector) as HTMLElement | null;
      if (!el) {
        el = createEl();
        document.head.appendChild(el);
      }
      setProps(el);
    };

    // Title
    document.title = meta.title;

    // Meta description
    setTag('meta[name="description"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      return m;
    }, (el) => {
      el.setAttribute('content', meta.description);
    });

    // Canonical
    setTag('link[rel="canonical"]', () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    }, (el) => {
      el.setAttribute('href', canonicalUrl);
    });

    // Open Graph
    setTag('meta[property="og:title"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:title');
      return m;
    }, (el) => { el.setAttribute('content', meta.title); });

    setTag('meta[property="og:description"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:description');
      return m;
    }, (el) => { el.setAttribute('content', meta.description); });

    setTag('meta[property="og:type"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:type');
      return m;
    }, (el) => { el.setAttribute('content', isCourseDetail ? 'article' : 'website'); });

    setTag('meta[property="og:url"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:url');
      return m;
    }, (el) => { el.setAttribute('content', canonicalUrl); });

    // og:image (brand-specific)
    setTag('meta[property="og:image"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:image');
      return m;
    }, (el) => { el.setAttribute('content', defaultOgImage); });

    // og:site_name (brand-aware)
    setTag('meta[property="og:site_name"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:site_name');
      return m;
    }, (el) => { el.setAttribute('content', brandName); });

    // og:locale
    setTag('meta[property="og:locale"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:locale');
      return m;
    }, (el) => { el.setAttribute('content', 'it_IT'); });

    // Twitter
    setTag('meta[name="twitter:card"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'twitter:card');
      return m;
    }, (el) => { el.setAttribute('content', 'summary_large_image'); });

    setTag('meta[name="twitter:title"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'twitter:title');
      return m;
    }, (el) => { el.setAttribute('content', meta.title); });

    setTag('meta[name="twitter:description"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'twitter:description');
      return m;
    }, (el) => { el.setAttribute('content', meta.description); });

    // twitter:image
    setTag('meta[name="twitter:image"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'twitter:image');
      return m;
    }, (el) => { el.setAttribute('content', defaultOgImage); });

    // Robots
    setTag('meta[name="robots"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'robots');
      return m;
    }, (el) => { el.setAttribute('content', 'index, follow'); });

    // Theme Color (brand secondary = Dark Navy)
    setTag('meta[name="theme-color"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'theme-color');
      return m;
    }, (el) => { el.setAttribute('content', brand.colors.secondary); });

    // JSON-LD Organization schema (homepage only) — segnale di autorità per Google
    const JSON_LD_ID = 'json-ld-organization';
    if (path === '/') {
      const isMedica = brand.id === 'element-medica';
      const logoBaseUrl = isMedica ? 'https://www.elementmedica.com' : 'https://www.elementsicurezza.com';
      const orgData = {
        '@context': 'https://schema.org',
        '@type': 'MedicalOrganization',
        name: isMedica ? 'Element Medica' : 'Element Sicurezza',
        legalName: 'Element srl',
        url: canonicalUrl,
        logo: `${logoBaseUrl}/assets/logos/${isMedica ? 'element-medica-icon' : 'element-sicurezza-icon'}.png`,
        image: `${baseUrl}${brand.seo.ogImage}`,
        description: meta.description,
        telephone: brand.contacts.phone,
        email: brand.contacts.email || 'info@element-srl.it',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Via Bracciano 34',
          addressLocality: 'Selvazzano Dentro',
          postalCode: '35030',
          addressRegion: 'PD',
          addressCountry: 'IT',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 45.3842,
          longitude: 11.8607,
        },
        vatID: '05580640281',
        foundingDate: '2009',
        sameAs: [
          isMedica ? 'https://www.elementmedica.com' : 'https://www.elementsicurezza.com',
        ],
      };
      let ldEl = document.head.querySelector(`#${JSON_LD_ID}`) as HTMLScriptElement | null;
      if (!ldEl) {
        ldEl = document.createElement('script');
        ldEl.id = JSON_LD_ID;
        ldEl.setAttribute('type', 'application/ld+json');
        document.head.appendChild(ldEl);
      }
      ldEl.textContent = JSON.stringify(orgData);
    } else {
      // Rimuovi schema homepage se si naviga su altra pagina
      document.head.querySelector(`#${JSON_LD_ID}`)?.remove();
    }

    // Nota GDPR: non aggiungiamo tag di tracking qui. Solo SEO statico.
  }, [location.pathname, brand, brandName]);

  return (
    <div className="public-layout min-h-screen flex flex-col bg-gray-50">
      {/* Header sempre visibile */}
      <PublicHeader />

      {/* Contenuto principale */}
      <main className={`flex-1 ${className}`}>
        {children}
      </main>

      {/* Footer aziendale */}
      <PublicFooter />

      {/* Consent Banner */}
      <ConsentBanner />
    </div>
  );
};

export default PublicLayout;
