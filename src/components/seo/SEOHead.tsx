/**
 * SEOHead Component
 * Componente per gestire i meta tags SEO di una pagina
 * FASE 1: SEO Foundation
 */

import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

export interface SEOProps {
  // Basic SEO
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;

  // Open Graph
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  ogUrl?: string;

  // Twitter Card
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
  twitterImage?: string;

  // Structured Data (JSON-LD)
  structuredData?: Record<string, any>;

  // Hreflang (multi-language)
  hreflang?: Record<string, string>;

  // Preload images
  preloadImages?: string[];

  // Override default base URL
  baseUrl?: string;
}

const SEOHead: React.FC<SEOProps> = ({
  title,
  description,
  keywords = [],
  canonicalUrl,
  noindex = false,
  nofollow = false,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  ogUrl,
  twitterCard = 'summary_large_image',
  twitterSite,
  twitterCreator,
  twitterImage,
  structuredData,
  hreflang,
  preloadImages = [],
  baseUrl = window.location.origin
}) => {
  // Costruisci robots value
  const robotsValue = [
    noindex ? 'noindex' : 'index',
    nofollow ? 'nofollow' : 'follow'
  ].join(', ');

  // URL corrente se non specificato diversamente
  const currentUrl = ogUrl || canonicalUrl || window.location.href;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      <meta name="robots" content={robotsValue} />

      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:title" content={ogTitle || title} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={currentUrl} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={ogTitle || title} />
      <meta name="twitter:description" content={ogDescription || description} />
      {twitterSite && <meta name="twitter:site" content={twitterSite} />}
      {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}
      {(twitterImage || ogImage) && (
        <meta name="twitter:image" content={twitterImage || ogImage} />
      )}

      {/* Hreflang Tags */}
      {hreflang &&
        Object.entries(hreflang).map(([lang, url]) => (
          <link key={lang} rel="alternate" hrefLang={lang} href={url} />
        ))}

      {/* Preload Images */}
      {preloadImages.map((imageUrl, index) => (
        <link key={index} rel="preload" as="image" href={imageUrl} />
      ))}

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;
