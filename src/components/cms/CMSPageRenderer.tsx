/**
 * CMS Page Renderer
 * 
 * Componente per il rendering dinamico delle pagine CMS dal database.
 * Legge il content JSON e renderizza hero + sections usando i componenti pubblici esistenti.
 * 
 * Utilizzato dalle pagine pubbliche per mostrare contenuti gestiti dal CMS.
 */

import React, { useEffect, useRef } from 'react';
import { PublicLayout } from '../public/PublicLayout';
import { HeroSection } from '../public/HeroSection';
import { LoadingFallback } from '../ui/LoadingFallback';
import { useCMSPageBySlug } from '../../hooks/cms/useCMSPages';
import { CMSPageContent, CMSSection, validateAndSanitizeCMSContent } from '../../types/cms';
import { SEOHead } from '../seo';
import CMSSectionRenderer from './CMSSectionRenderer.tsx';
import { trackPageView } from '../../services/cmsAnalyticsService';
import { getIconComponent, ArrowRight, Phone, Award } from './renderer/iconMap';
import { CustomContentRenderer } from './renderer/CustomContentRenderer';

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
        />
        <PublicLayout>
          <div
            className={`cms-html-content ${className}`}
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </PublicLayout>
      </>
    );
  }

  // Valida e sanitizza il contenuto JSON
  const content = validateAndSanitizeCMSContent(page.content);
  if (!content) {
    console.error('Invalid CMS content structure for page:', slug);
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
  const seoKeywords = content.seo?.keywords || [];
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
      />

      <PublicLayout>
        <div className={className}>
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
