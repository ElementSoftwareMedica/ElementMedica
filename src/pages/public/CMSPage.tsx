/**
 * Public CMS Page
 * 
 * Pagina pubblica per renderizzare contenuti CMS dinamici.
 * Usa CMSPageRenderer per caricare e mostrare pagine dal database.
 */

import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { CMSPageRenderer } from '../../components/cms/CMSPageRenderer';

export const CMSPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();

  // Brand detection
  const brandId = import.meta.env.VITE_BRAND_ID || 'element-sicurezza';

  // Determina lo slug dalla URL
  // Se path è "/" → slug "homepage" o "homepage-medica"
  // Se path è "/servizi" → slug "servizi"
  // Se path è "/:slug" → usa slug dal param
  let rawSlug = slug || (location.pathname === '/' ? 'homepage' : location.pathname.substring(1).replace(/\//g, '-'));

  // Mappa slug per Element Medica (che ha slug diversi nel DB per alcune pagine)
  if (brandId === 'element-medica') {
    const slugMap: Record<string, string> = {
      'homepage': 'medica-homepage',
      'medicina-del-lavoro': 'medica-medicina-del-lavoro',
      'contatti': 'medica-contatti',
      'diagnostica': 'medica-diagnostica',
      'visite-specialistiche': 'medica-visite-specialistiche',
      'chi-siamo': 'medica-chi-siamo'
    };
    rawSlug = slugMap[rawSlug] || rawSlug;
  }

  return <CMSPageRenderer slug={rawSlug} />;
};

export default CMSPage;
