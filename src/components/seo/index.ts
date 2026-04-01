/**
 * SEO Components Index
 * FASE 1: SEO Foundation
 * FASE 2: Medical JSON-LD Schemas
 */

export { default as SEOHead } from './SEOHead';
export { default as SEOConfigForm } from './SEOConfigForm';
export { default as MedicalSchemas } from './MedicalSchemas';
export type { SEOProps } from './SEOHead';
export {
  generateMedicalClinicSchema,
  generatePhysicianSchema,
  generateEducationalOrganizationSchema,
  generateParentOrganizationSchema,
  generateMedicalWebPageSchema,
  generateFAQSchema,
} from './MedicalSchemas';
