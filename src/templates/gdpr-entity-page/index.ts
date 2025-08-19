/**
 * GDPR Entity Page Template - Main Export
 * 
 * Template riutilizzabile per pagine di gestione entità
 * con supporto completo GDPR e conformità normativa.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

// Componente principale
export { default as GDPREntityPageTemplate } from './components/GDPREntityPageTemplate';

// Componenti GDPR
export { default as GDPREntityHeader } from './components/GDPREntityHeader';
export { default as GDPRConsentModal } from './components/GDPRConsentModal';

// Hook principali
export { default as useGDPREntityPage } from './hooks/useGDPREntityPage';
export { default as useGDPRConsent } from './hooks/useGDPRConsent';
export { default as useGDPRAudit } from './hooks/useGDPRAudit';
export { default as useGDPREntityOperations } from './hooks/useGDPREntityOperations';

// Utility
export { default as GDPRUtils } from './utils/gdpr.utils';
export { default as ValidationUtils } from './utils/validation.utils';

// Configurazioni
export { default as DefaultConfigs } from './config/defaults';

// Tipi
export type * from './types/entity.types';
export type * from './types/gdpr.types';
export type * from './types/template.types';

// Costanti
export { GDPR_CONSTANTS } from './utils/gdpr.utils';
export { VALIDATION_CONSTANTS } from './utils/validation.utils';

// Factory per configurazioni
export { ConfigFactory } from './config/defaults';