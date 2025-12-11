/**
 * useSEO Hook
 * Custom hook per gestire dinamicamente i meta tags SEO
 * FASE 1: SEO Foundation
 */

import { useEffect, useState } from 'react';
import { SEOProps } from '../../components/seo/SEOHead';

interface UseSEOOptions {
  // Fetch automatico della configurazione SEO da backend
  fetchConfig?: boolean;
  entityType?: 'page' | 'course';
  entityId?: string;
}

export const useSEO = (
  initialConfig: Partial<SEOProps>,
  options?: UseSEOOptions
) => {
  const [seoConfig, setSeoConfig] = useState<Partial<SEOProps>>(initialConfig);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch configurazione SEO da backend se richiesto
  useEffect(() => {
    if (
      options?.fetchConfig &&
      options.entityType &&
      options.entityId
    ) {
      fetchSEOConfig(options.entityType, options.entityId);
    }
  }, [options?.fetchConfig, options?.entityType, options?.entityId]);

  const fetchSEOConfig = async (entityType: string, entityId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/seo/config/${entityType}/${entityId}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        // Se non c'è config SEO, usa quella iniziale
        if (response.status === 404) {
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch SEO config');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setSeoConfig(prevConfig => ({
          ...prevConfig,
          ...data.data
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching SEO config:', err);
    } finally {
      setLoading(false);
    }
  };

  // Aggiorna config SEO dinamicamente
  const updateSEO = (updates: Partial<SEOProps>) => {
    setSeoConfig(prevConfig => ({
      ...prevConfig,
      ...updates
    }));
  };

  // Genera structured data per breadcrumb
  const generateBreadcrumbSchema = (
    breadcrumbs: Array<{ name: string; url: string }>
  ) => {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    };
  };

  // Genera structured data per Organization
  const generateOrganizationSchema = (orgData: {
    name: string;
    url: string;
    logo?: string;
    description?: string;
    phone?: string;
    email?: string;
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
  }) => {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: orgData.name,
      url: orgData.url,
      logo: orgData.logo,
      description: orgData.description,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: orgData.phone,
        email: orgData.email,
        contactType: 'customer service'
      },
      address: orgData.address ? {
        '@type': 'PostalAddress',
        streetAddress: orgData.address.street,
        addressLocality: orgData.address.city,
        postalCode: orgData.address.postalCode,
        addressCountry: orgData.address.country || 'IT'
      } : undefined
    };
  };

  // Genera structured data per Course
  const generateCourseSchema = (courseData: {
    name: string;
    description?: string;
    provider?: string;
    image?: string;
    offers?: {
      price?: number;
      currency?: string;
    };
  }) => {
    return {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: courseData.name,
      description: courseData.description,
      provider: {
        '@type': 'Organization',
        name: courseData.provider
      },
      image: courseData.image,
      offers: courseData.offers ? {
        '@type': 'Offer',
        price: courseData.offers.price,
        priceCurrency: courseData.offers.currency || 'EUR'
      } : undefined
    };
  };

  return {
    seoConfig,
    loading,
    error,
    updateSEO,
    fetchSEOConfig,
    generateBreadcrumbSchema,
    generateOrganizationSchema,
    generateCourseSchema
  };
};

export default useSEO;
