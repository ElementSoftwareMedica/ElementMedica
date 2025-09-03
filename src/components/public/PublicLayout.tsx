import React, { useEffect } from 'react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { ConsentBanner } from './ConsentBanner';
import { useLocation } from 'react-router-dom';

interface PublicLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Layout per le pagine pubbliche di Element Formazione
 * Include header con menu sempre visibile e footer aziendale
 */
export const PublicLayout: React.FC<PublicLayoutProps> = ({ 
  children, 
  className = '' 
}) => {
  const location = useLocation();

  // SEO centralizzato per le pagine pubbliche
  useEffect(() => {
    const path = location.pathname;

    // Mappa SEO per path noti; per path dinamici gestiamo tramite regex
    const seoByPath: Record<string, { title: string; description: string } > = {
      '/': {
        title: 'Element Formazione | Sicurezza sul Lavoro, Corsi e Consulenza',
        description: 'Formazione sulla sicurezza sul lavoro, RSPP e Medicina del Lavoro. Soluzioni complete per aziende: corsi, consulenza, DVR e sorveglianza sanitaria.'
      },
      '/corsi': {
        title: 'Corsi di Formazione sulla Sicurezza | Element Formazione',
        description: 'Catalogo corsi sicurezza lavoro: rischio basso, medio, alto, preposti, dirigenti, antincendio, primo soccorso e aggiornamenti.'
      },
      '/servizi': {
        title: 'Servizi per la Sicurezza sul Lavoro | Element Formazione',
        description: 'Consulenza sicurezza, DVR, RSPP, sorveglianza sanitaria e gestione emergenze. Supporto completo alla conformità normativa.'
      },
      '/rspp': {
        title: 'Nomina RSPP e Consulenza Sicurezza | Element Formazione',
        description: 'Servizio RSPP esterno, valutazione rischi, DVR e supporto continuativo per la sicurezza sul lavoro.'
      },
      '/medicina-del-lavoro': {
        title: 'Medicina del Lavoro e Sorveglianza Sanitaria | Element Formazione',
        description: 'Visite mediche periodiche, protocolli sanitari e giudizi di idoneità per la tutela della salute dei lavoratori.'
      },
      '/contatti': {
        title: 'Contattaci | Element Formazione',
        description: 'Richiedi informazioni o un preventivo gratuito sui nostri servizi di formazione e consulenza per la sicurezza.'
      },
      '/lavora-con-noi': {
        title: 'Lavora con Noi | Element Formazione',
        description: 'Scopri le posizioni aperte e invia la tua candidatura per entrare nel team di Element Formazione.'
      },
      '/privacy': {
        title: 'Informativa Privacy | Element Formazione',
        description: 'Leggi l’informativa sul trattamento dei dati personali in conformità al GDPR.'
      },
      '/cookie': {
        title: 'Cookie Policy | Element Formazione',
        description: 'Informazioni sull’uso dei cookie e come gestire le preferenze di tracciamento.'
      },
      '/termini': {
        title: 'Termini e Condizioni | Element Formazione',
        description: 'Condizioni generali di utilizzo del sito e dei servizi di Element Formazione.'
      }
    };

    const isCourseDetail = /^\/corsi\/(unified\/[^/]+|[^/]+)$/.test(path);

    const meta = isCourseDetail
      ? {
          title: 'Dettaglio Corso | Element Formazione',
          description: 'Informazioni dettagliate sul corso: obiettivi, programma, durata e requisiti. Richiedi informazioni o preventivo.'
        }
      : seoByPath[path] || seoByPath['/'];

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const canonicalUrl = baseUrl + path;
    const defaultOgImage = baseUrl + '/og-image.svg';

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

    // og:image
    setTag('meta[property="og:image"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:image');
      return m;
    }, (el) => { el.setAttribute('content', defaultOgImage); });

    // og:site_name
    setTag('meta[property="og:site_name"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:site_name');
      return m;
    }, (el) => { el.setAttribute('content', 'Element Formazione'); });

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

    // Theme Color
    setTag('meta[name="theme-color"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'theme-color');
      return m;
    }, (el) => { el.setAttribute('content', '#2563eb'); });

    // Nota GDPR: non aggiungiamo tag di tracking qui. Solo SEO statico.
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
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