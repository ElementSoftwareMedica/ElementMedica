/**
 * CMS Page Renderer
 * 
 * Componente per il rendering dinamico delle pagine CMS dal database.
 * Legge il content JSON e renderizza hero + sections usando i componenti pubblici esistenti.
 * 
 * Utilizzato dalle pagine pubbliche per mostrare contenuti gestiti dal CMS.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { sanitizeHtml } from '../../utils/sanitize';
import { PublicLayout } from '../public/PublicLayout';
import { HeroSection } from '../public/HeroSection';
import { LoadingFallback } from '../ui/LoadingFallback';
import { useCMSPageBySlug } from '../../hooks/cms/useCMSPages';
import { CMSPageContent, CMSSection, validateAndSanitizeCMSContent } from '../../types/cms';
import { SEOHead, generateMedicalClinicSchema, generateEducationalOrganizationSchema, generateParentOrganizationSchema, generateFAQSchema } from '../seo';
import CMSSectionRenderer from './CMSSectionRenderer.tsx';
import { trackPageView } from '../../services/cmsAnalyticsService';
import { getIconComponent, ArrowRight, Phone, Award } from './renderer/iconMap';
import { CustomContentRenderer } from './renderer/custom-content-renderer';
import { getCurrentBrand } from '../../config/brands.config';

interface CMSPageRendererProps {
  slug: string;
  /**
   * Se true, mostra lo spinner di caricamento.
   * Se false, non mostra nulla durante il caricamento (utile per transizioni custom)
   */
  showLoading?: boolean;
  /**
   * Callback chiamata quando il contenuto è stato caricato con successo
   */
  onContentLoaded?: (content: CMSPageContent) => void;
  /**
   * Classe CSS aggiuntiva per il wrapper
   */
  className?: string;
}

/**
 * Renderizza una pagina CMS completa dal database
 */
export const CMSPageRenderer: React.FC<CMSPageRendererProps> = ({
  slug,
  showLoading = true,
  onContentLoaded,
  className = '',
}) => {
  const { data: page, isLoading, error } = useCMSPageBySlug(slug);
  const pageViewTracked = useRef(false);
  const pageLoadTime = useRef(Date.now());
  const currentSessionId = useRef<string>('');

  // Generate JSON-LD structured data based on current brand and page slug
  const jsonLdSchema = useMemo(() => {
    const brand = getCurrentBrand();
    const brandSchemas = brand.theme === 'medical'
      ? [generateMedicalClinicSchema(), generateParentOrganizationSchema()]
      : [generateEducationalOrganizationSchema(), generateParentOrganizationSchema()];

    // Per-page FAQ schema for featured snippets on target keywords
    const faqsBySlug: Record<string, { question: string; answer: string }[]> = {
      'medica-medicina-del-lavoro': [
        { question: 'Cos\'è la medicina del lavoro?', answer: 'La medicina del lavoro è la branca della medicina che si occupa della salute dei lavoratori in relazione al loro ambiente di lavoro. Si concretizza nella sorveglianza sanitaria obbligatoria prevista dal D.Lgs. 81/08. Element Medica offre il servizio di medico competente a Selvazzano Dentro, servendo aziende di Padova e tutta la provincia.' },
        { question: 'Quando è obbligatorio il medico competente?', answer: 'Il medico competente è obbligatorio quando esistono rischi specifici per i lavoratori secondo il D.Lgs. 81/08, come rischi da agenti chimici, biologici, fisici (rumore, vibrazioni), videoterminali, lavoro notturno e altri. Il nostro servizio copre Padova e provincia.' },
        { question: 'Con che frequenza si fanno le visite mediche del lavoro?', answer: 'La frequenza delle visite è stabilita dal medico competente nel protocollo sanitario, solitamente con cadenza annuale o biennale in base al profilo di rischio della mansione.' },
        { question: 'Quanto costa il servizio di medicina del lavoro aziendale a Padova?', answer: 'Il costo dipende dal numero di dipendenti e dal protocollo sanitario. Element Medica serve aziende a Padova e provincia con tariffe competitive. Per un preventivo personalizzato contatta: +39 351 318 1574.' },
        { question: 'Cosa succede al lavoratore dopo la visita medica?', answer: 'Il medico competente emette un giudizio di idoneità: idoneo, idoneo con prescrizioni, idoneo con limitazioni, non idoneo temporaneamente o permanentemente.' },
      ],
      'medicina-del-lavoro': [
        { question: 'Cos\'è la sorveglianza sanitaria?', answer: 'La sorveglianza sanitaria è l\'insieme degli atti medici finalizzati alla tutela della salute e sicurezza dei lavoratori in relazione all\'ambiente di lavoro ai rischi professionali e alla promozione della salute, obbligatoria ai sensi dell\'art. 41 del D.Lgs. 81/08. Element Sicurezza eroga il servizio a Selvazzano Dentro per aziende di Padova e provincia.' },
        { question: 'Perché serve un medico competente in azienda?', answer: 'Il medico competente è obbligatorio per legge (art. 38 D.Lgs. 81/08) quando vi sono specifici rischi lavorativi. Effettua visite preventive, periodiche e a richiesta, e collabora con il datore di lavoro per preservare la salute dei lavoratori. Operiamo a Padova, Selvazzano Dentro e tutta la provincia di Padova.' },
        { question: 'Quali esami si fanno durante la visita medica del lavoro?', answer: 'Gli accertamenti dipendono dal profilo di rischio: esame fisico, esami del sangue/urine, spirometria per rischi respiratori, audiometria per rumore, ECG per lavoro notturno, esame oculistico per videoterminali.' },
        { question: 'Quanto costa una visita medica del lavoro a Padova?', answer: 'Il costo varia in base alla tipologia di visita e accertamenti previsti dal protocollo. Serviamo aziende a Padova e provincia con tariffe competitive. Per un preventivo contatta Element Sicurezza: +39 351 623 9176.' },
      ],
      'medica-homepage': [
        { question: 'Dove si trova il poliambulatorio Element Medica?', answer: 'Element Medica si trova in Via Bracciano 34, 35030 Selvazzano Dentro (PD), a soli 10 minuti da Padova. Facilmente raggiungibile da tutta la provincia di Padova e dalla A4.' },
        { question: 'Quali specialità mediche sono disponibili a Element Medica?', answer: 'Element Medica offre oltre 30 specialità: cardiologia, ortopedia, neurologia, dermatologia, ginecologia, urologia, medicina del lavoro, diagnostica per immagini e molto altro. Siamo il poliambulatorio di riferimento per Padova e provincia.' },
        { question: 'Come si prenota una visita a Element Medica vicino Padova?', answer: 'Puoi prenotare online su elementmedica.com, telefonicamente al +39 351 318 1574 (Lun-Ven 8:00-19:30, Sab 8:00-13:00) oppure direttamente presso il poliambulatorio a Selvazzano Dentro (PD).' },
        { question: 'Element Medica è convenzionato con il Servizio Sanitario Nazionale?', answer: 'Element Medica è un poliambulatorio privato a Selvazzano Dentro, vicino Padova. Alcune prestazioni possono essere coperte da assicurazioni sanitarie private convenzionate. Contattaci per informazioni.' },
      ],
      'corsi': [
        { question: 'I corsi di sicurezza di Element Sicurezza sono riconosciuti?', answer: 'Sì, Element Sicurezza è ente accreditato dalla Regione Veneto per l\'erogazione di corsi di formazione sulla sicurezza sul lavoro a Padova e provincia. Tutti gli attestati sono riconosciuti a livello nazionale.' },
        { question: 'Dove si tengono i corsi sicurezza a Padova?', answer: 'I corsi si svolgono presso la sede di Element Sicurezza a Selvazzano Dentro (PD), a 10 minuti da Padova. Offriamo anche formazione aziendale presso le sedi dei clienti in tutta la provincia di Padova.' },
        { question: 'Quanto dura un corso sicurezza per lavoratori?', answer: 'La durata varia in base al livello di rischio: 8 ore per rischio basso, 12 ore per rischio medio, 16 ore per rischio alto, come previsto dall\'Accordo Stato-Regioni.' },
        { question: 'Con che frequenza va rinnovato il corso sicurezza?', answer: 'L\'aggiornamento per lavoratori è obbligatorio ogni 5 anni (6 ore). Per RSPP, RLS e altre figure specifiche le scadenze possono differire.' },
        { question: 'Si può fare il corso sicurezza online?', answer: 'La formazione generale (modulo base) di alcuni corsi può essere erogata in e-learning. La formazione specifica per rischio medio/alto richiede formazione in presenza o FAD sincrona.' },
      ],
      'rspp': [
        { question: 'Cos\'è l\'RSPP e perché è obbligatorio?', answer: 'Il Responsabile del Servizio di Prevenzione e Protezione (RSPP) è la figura obbligatoria per legge (art. 17 D.Lgs. 81/08) incaricata di coordinare la gestione della sicurezza in azienda. Element Sicurezza fornisce RSPP esterno a Padova e provincia.' },
        { question: 'Quanto costa il servizio RSPP esterno a Padova?', answer: 'Il costo dipende dalla dimensione dell\'azienda e dal livello di rischio. Element Sicurezza offre pacchetti da €800/anno per micro-imprese a €3.000+/anno per aziende strutturate. Serviamo aziende a Padova, Selvazzano Dentro e tutta la provincia.' },
        { question: 'Quando conviene nominare un RSPP esterno?', answer: 'L\'RSPP esterno è conveniente per le aziende che non hanno al loro interno un dipendente con la formazione specifica richiesta, o per PMI che preferiscono affidarsi a un professionista dedicato. Element Sicurezza opera da Selvazzano Dentro per tutta la provincia di Padova.' },
        { question: 'Quali sono le sanzioni per mancata nomina RSPP?', answer: 'L\'omessa nomina RSPP è sanzionata con arresto da 3 a 6 mesi o ammenda da €3.071,27 a €7.862,44 (art. 55 D.Lgs. 81/08).' },
      ],
    };

    const faqs = faqsBySlug[slug];
    const schemas = [
      ...brandSchemas.map(({ '@context': _, ...rest }) => rest),
      ...(faqs ? [{ ...generateFAQSchema(faqs), '@context': undefined }] : []),
    ].filter(s => s);

    return {
      '@context': 'https://schema.org',
      '@graph': schemas.map(({ '@context': _, ...rest }) => rest),
    };
  }, [slug]);

  // Traccia la visualizzazione della pagina CMS
  useEffect(() => {
    if (page?.id && !pageViewTracked.current) {
      pageViewTracked.current = true;
      pageLoadTime.current = Date.now();

      // Genera/recupera session ID per questo tracking
      let sessionId = sessionStorage.getItem('cms_session_id');
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('cms_session_id', sessionId);
      }
      currentSessionId.current = sessionId;

      // Traccia la visita (fire-and-forget, non bloccante)
      trackPageView({
        pageId: page.id,
        sessionId,
        referer: document.referrer
      });
    }

    // Cleanup: invia durata quando l'utente lascia la pagina
    return () => {
      if (page?.id && pageViewTracked.current && currentSessionId.current) {
        const duration = Math.round((Date.now() - pageLoadTime.current) / 1000);
        // Usa sendBeacon per inviare dati anche quando la pagina viene chiusa
        // sendBeacon con Blob per impostare Content-Type corretto
        if (navigator.sendBeacon && duration > 0) {
          const data = JSON.stringify({
            pageId: page.id,
            sessionId: currentSessionId.current,
            duration
          });
          const blob = new Blob([data], { type: 'application/json' });
          navigator.sendBeacon('/api/v1/cms/analytics/track', blob);
        }
      }
    };
  }, [page?.id]);

  // Chiama callback quando i dati sono pronti
  React.useEffect(() => {
    if (page?.content && onContentLoaded) {
      const sanitizedContent = validateAndSanitizeCMSContent(page.content);
      if (sanitizedContent) {
        onContentLoaded(sanitizedContent);
      }
    }
  }, [page, onContentLoaded]);

  // Loading state
  if (isLoading) {
    return showLoading ? (
      <PublicLayout>
        <LoadingFallback message="Caricamento contenuti..." />
      </PublicLayout>
    ) : null;
  }

  // Error state
  if (error) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Contenuto non disponibile
          </h1>
          <p className="text-gray-600">
            Si è verificato un errore nel caricamento della pagina.
          </p>
        </div>
      </PublicLayout>
    );
  }

  // Page not found
  if (!page) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Pagina non trovata</h1>
          <p className="text-gray-600">
            La pagina richiesta non esiste o non è pubblicata.
          </p>
        </div>
      </PublicLayout>
    );
  }

  // FALLBACK: Se il contenuto è HTML diretto (stringa), renderizzalo direttamente
  if (typeof page.content === 'string') {
    const seoTitle = page.seoTitle || page.title;
    const seoDescription = page.seoDescription || '';

    return (
      <>
        <SEOHead
          title={seoTitle}
          description={seoDescription}
          keywords={[]}
          ogType="website"
          ogImage=""
          twitterCard="summary_large_image"
          canonicalUrl={`${window.location.origin}/${slug}`}
          structuredData={jsonLdSchema}
        />
        <PublicLayout>
          <div
            className={`cms-html-content ${className}`}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
          />
        </PublicLayout>
      </>
    );
  }

  // Valida e sanitizza il contenuto JSON
  const content = validateAndSanitizeCMSContent(page.content);
  if (!content) {
    if (import.meta.env.DEV) console.error('Invalid CMS content structure for page:', slug);
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Errore di configurazione
          </h1>
          <p className="text-gray-600">
            Il contenuto della pagina non è configurato correttamente.
          </p>
        </div>
      </PublicLayout>
    );
  }

  // Estrai metadati per SEO
  const seoTitle = page.seoTitle || page.title;
  const seoDescription = page.seoDescription || content.hero?.subtitle || '';
  // Support keywords from both content.seo.keywords and content.metadata.keywords
  const seoKeywords = content.seo?.keywords || (content.metadata as any)?.keywords || [];
  const ogImage = content.seo?.ogImage || content.hero?.image || '';
  const canonicalUrl = content.seo?.canonicalUrl || `${window.location.origin}/${slug}`;

  return (
    <>
      {/* SEO Head */}
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        ogType="website"
        ogImage={ogImage}
        twitterCard={content.seo?.twitterCard || 'summary_large_image'}
        canonicalUrl={canonicalUrl}
        structuredData={jsonLdSchema}
      />

      <PublicLayout>
        <div className={className} data-cms-loaded="true">
          {/* Hero Section */}
          {content.hero && (() => {
            // Prepara i pulsanti con le icone convertite da stringa a componenti React
            const hero = content.hero as any;
            const rawPrimaryButton = hero.primaryButton || hero.ctaPrimary;
            const rawSecondaryButton = hero.secondaryButton || hero.ctaSecondary;

            const primaryButton = rawPrimaryButton ? {
              ...rawPrimaryButton,
              icon: rawPrimaryButton.icon ? (() => {
                const IconComp = getIconComponent(rawPrimaryButton.icon, ArrowRight);
                return <IconComp className="w-5 h-5" />;
              })() : undefined
            } : undefined;

            const secondaryButton = rawSecondaryButton ? {
              ...rawSecondaryButton,
              icon: rawSecondaryButton.icon ? (() => {
                const IconComp = getIconComponent(rawSecondaryButton.icon, Phone);
                return <IconComp className="w-5 h-5" />;
              })() : undefined
            } : undefined;

            return (
              <HeroSection
                title={hero.title}
                subtitle={hero.subtitle || ''}
                description={hero.description || ''}
                primaryButton={primaryButton}
                secondaryButton={secondaryButton}
                stats={hero.stats?.map((stat: any) => {
                  const IconComponent = getIconComponent(stat.icon, Award);
                  return {
                    value: stat.number || stat.value,
                    label: stat.label,
                    icon: stat.icon ? <IconComponent className="w-6 h-6" /> : undefined
                  };
                })}
                showContactForm={hero.showContactForm || (content.metadata as any)?.showContactForm}
                showTrustBadges={!!hero.trustBadges}
                backgroundVariant={hero.backgroundVariant || 'gradient'}
                backgroundPattern={hero.backgroundPattern || 'none'}
                backgroundImage={hero.backgroundImage}
              />
            );
          })()}

          {/* Dynamic Sections */}
          {content.sections && content.sections.length > 0 && (
            <div className="cms-sections">
              {content.sections.map((section: CMSSection, index: number) => (
                <CMSSectionRenderer
                  key={section.id || `section-${index}`}
                  section={section}
                />
              ))}
            </div>
          )}

          {/* Custom Content Fields */}
          <CustomContentRenderer content={content} slug={slug} />
        </div>
      </PublicLayout>
    </>
  );
};

export default CMSPageRenderer;
