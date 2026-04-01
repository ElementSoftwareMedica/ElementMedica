/**
 * Medical SEO Schemas (JSON-LD)
 * 
 * Generates structured data for Google Rich Results:
 * - MedicalClinic: clinic info, address, services
 * - Physician: individual doctor profiles
 * - MedicalWebPage: page-level medical content markup
 * - EducationalOrganization: for Element Sicurezza (training center)
 * 
 * @see https://schema.org/MedicalClinic
 * @see https://schema.org/Physician
 * @see https://developers.google.com/search/docs/appearance/structured-data
 */

import { getBrandById } from '../../config/brands.config';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PhysicianData {
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  specialties: string[];
  image?: string;
  description?: string;
  telephone?: string;
  email?: string;
  /** URL to the doctor's profile page */
  url?: string;
  /** Medical credentials / qualifications */
  qualifications?: string[];
  /** Languages spoken */
  languages?: string[];
}

interface MedicalServiceData {
  name: string;
  description?: string;
  url?: string;
  /** Service category (e.g., "Fisioterapia", "Cardiologia") */
  serviceType?: string;
}

interface ClinicOpeningHours {
  dayOfWeek: string[];
  opens: string;
  closes: string;
}

// ─────────────────────────────────────────────
// Schema Generators
// ─────────────────────────────────────────────

/**
 * Generate MedicalClinic JSON-LD schema for Element Medica
 */
export function generateMedicalClinicSchema(options?: {
  services?: MedicalServiceData[];
  openingHours?: ClinicOpeningHours[];
  physicians?: PhysicianData[];
}): Record<string, any> {
  const brand = getBrandById('element-medica');
  const baseUrl = brand.contacts.website;

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: brand.displayName || 'Element Medica',
    alternateName: 'Element Medica - Poliambulatorio',
    description: brand.seo?.description || 'Poliambulatorio specializzato: medicina del lavoro, visite specialistiche, diagnostica strumentale a Selvazzano Dentro (PD)',
    url: baseUrl,
    telephone: brand.contacts.phone || '+39 351 318 1574',
    email: brand.contacts.email || 'info@elementmedica.com',
    areaServed: [
      { '@type': 'City', name: 'Selvazzano Dentro', containedInPlace: { '@type': 'AdministrativeArea', name: 'Padova' } },
      { '@type': 'City', name: 'Padova' },
      { '@type': 'AdministrativeArea', name: 'Provincia di Padova' },
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Via Bracciano 34',
      addressLocality: 'Selvazzano Dentro',
      addressRegion: 'PD',
      postalCode: '35030',
      addressCountry: 'IT',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 45.3736,
      longitude: 11.7879,
    },
    image: `${baseUrl}/images/element-medica-ambulatorio.jpg`,
    priceRange: '€€',
    medicalSpecialty: [
      'GeneralPractice',
      'Dermatology',
      'Cardiology',
      'Orthopedics',
      'Physiotherapy',
    ],
    availableService: options?.services?.map(service => ({
      '@type': 'MedicalProcedure',
      name: service.name,
      description: service.description || '',
      url: service.url ? `${baseUrl}${service.url}` : undefined,
      procedureType: 'http://schema.org/NoninvasiveProcedure',
    })) || [],
    openingHoursSpecification: options?.openingHours?.map(hours => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: hours.dayOfWeek.map(d => `http://schema.org/${d}`),
      opens: hours.opens,
      closes: hours.closes,
    })) || [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(
            d => `http://schema.org/${d}`
          ),
          opens: '08:00',
          closes: '19:00',
        },
      ],
    hasMap: 'https://maps.google.com/?q=Via+Bracciano+34+Selvazzano+Dentro+PD',
    isAcceptingNewPatients: true,
    sameAs: [
      brand.social?.facebook || '',
      brand.social?.instagram || '',
    ].filter(Boolean),
  };

  // Add physicians if provided
  if (options?.physicians?.length) {
    schema.employee = options.physicians.map(doc => generatePhysicianSchema(doc));
  }

  return schema;
}

/**
 * Generate Physician JSON-LD schema for individual doctors
 */
export function generatePhysicianSchema(doctor: PhysicianData): Record<string, any> {
  const brand = getBrandById('element-medica');
  const baseUrl = brand.contacts.website;
  const honorificPrefix = doctor.gender === 'FEMALE' ? 'Dott.ssa' : 'Dott.';

  return {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: `${honorificPrefix} ${doctor.name}`,
    honorificPrefix,
    description: doctor.description || `${honorificPrefix} ${doctor.name} - ${doctor.specialties.join(', ')}`,
    image: doctor.image || undefined,
    telephone: doctor.telephone || brand.contacts.phone || '+39 351 318 1574',
    email: doctor.email || undefined,
    url: doctor.url ? `${baseUrl}${doctor.url}` : undefined,
    medicalSpecialty: doctor.specialties,
    qualifications: doctor.qualifications || [],
    knowsLanguage: doctor.languages || ['Italian'],
    worksFor: {
      '@type': 'MedicalClinic',
      name: 'Element Medica',
      url: `${baseUrl}`,
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Via Bracciano 34',
      addressLocality: 'Selvazzano Dentro',
      addressRegion: 'PD',
      postalCode: '35030',
      addressCountry: 'IT',
    },
    availableService: doctor.specialties.map(specialty => ({
      '@type': 'MedicalProcedure',
      name: specialty,
    })),
  };
}

/**
 * Generate EducationalOrganization JSON-LD schema for Element Sicurezza
 */
export function generateEducationalOrganizationSchema(options?: {
  courses?: { name: string; description?: string; url?: string }[];
}): Record<string, any> {
  const brand = getBrandById('element-sicurezza');
  const baseUrl = brand.contacts.website;

  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: brand.displayName || 'Element Sicurezza',
    alternateName: 'Element Sicurezza - Formazione Sicurezza sul Lavoro',
    description: brand.seo?.description || 'Centro di formazione per la sicurezza sul lavoro a Selvazzano Dentro (PD)',
    url: baseUrl,
    telephone: brand.contacts.phone || '+39 351 623 9176',
    email: brand.contacts.email || 'info@elementsicurezza.com',
    areaServed: [
      { '@type': 'City', name: 'Selvazzano Dentro', containedInPlace: { '@type': 'AdministrativeArea', name: 'Padova' } },
      { '@type': 'City', name: 'Padova' },
      { '@type': 'AdministrativeArea', name: 'Provincia di Padova' },
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Via Bracciano 34',
      addressLocality: 'Selvazzano Dentro',
      addressRegion: 'PD',
      postalCode: '35030',
      addressCountry: 'IT',
    },
    parentOrganization: {
      '@type': 'Organization',
      name: 'Element srl',
      taxID: '05580640281',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Via Piave 4',
        postalCode: '35138',
        addressCountry: 'IT',
      },
    },
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'Sicurezza sul Lavoro D.Lgs. 81/08',
    },
    courseOffered: options?.courses?.map(course => ({
      '@type': 'Course',
      name: course.name,
      description: course.description || '',
      url: course.url ? `${baseUrl}${course.url}` : undefined,
      provider: {
        '@type': 'Organization',
        name: 'Element Sicurezza',
      },
    })) || [],
    sameAs: [
      brand.social?.facebook || '',
      brand.social?.instagram || '',
    ].filter(Boolean),
  };
}

/**
 * Generate Organization JSON-LD for Element srl (parent company)
 */
export function generateParentOrganizationSchema(): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Element srl',
    legalName: 'Element srl',
    taxID: '05580640281',
    vatID: 'IT05580640281',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Via Piave 4',
      postalCode: '35138',
      addressCountry: 'IT',
    },
    subOrganization: [
      {
        '@type': 'MedicalClinic',
        name: 'Element Medica',
        url: 'https://www.elementmedica.com',
      },
      {
        '@type': 'EducationalOrganization',
        name: 'Element Sicurezza',
        url: 'https://www.elementsicurezza.com',
      },
    ],
  };
}

/**
 * Generate MedicalWebPage JSON-LD for medical content pages
 */
export function generateMedicalWebPageSchema(options: {
  name: string;
  description: string;
  url: string;
  lastReviewed?: string;
  medicalAudience?: string;
}): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: options.name,
    description: options.description,
    url: options.url,
    inLanguage: 'it-IT',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Element Medica',
      url: 'https://www.elementmedica.com',
    },
    lastReviewed: options.lastReviewed || new Date().toISOString().split('T')[0],
    medicalAudience: options.medicalAudience
      ? { '@type': 'MedicalAudience', audienceType: options.medicalAudience }
      : { '@type': 'MedicalAudience', audienceType: 'Patient' },
    author: {
      '@type': 'Organization',
      name: 'Element Medica',
    },
  };
}

/**
 * Generate FAQ Page JSON-LD schema
 * High-impact for featured snippets on queries like "medico competente", "corsi sicurezza"
 */
export function generateFAQSchema(faqs: { question: string; answer: string }[]): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

// ─────────────────────────────────────────────
// Export all schema generators
// ─────────────────────────────────────────────

export default {
  generateMedicalClinicSchema,
  generatePhysicianSchema,
  generateEducationalOrganizationSchema,
  generateParentOrganizationSchema,
  generateMedicalWebPageSchema,
  generateFAQSchema,
};
