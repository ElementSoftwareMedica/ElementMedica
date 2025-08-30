import * as apiConfig from './api';

/**
 * Configurazione centralizzata dell'applicazione
 */

// Configurazione per i template di Google Slides
export const googleConfig = {
  slides: {
    attestatoTemplateUrl: process.env.ATTESTATO_TEMPLATE_URL || 'YOUR_TEMPLATE_URL_HERE',
  },
};

// Configurazione per i percorsi delle applicazioni
export const appPaths = {
  dashboard: '/',
  companies: '/companies',
  employees: '/employees',
  courses: '/courses',
  trainers: '/trainers',
  schedules: '/schedules',
  settings: '/settings',
};

// Re-esporta la configurazione API
export const api = apiConfig;

// Configurazione per il paginamento
export const pagination = {
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50, 100],
};

// Esporta tutto come configurazione predefinita
export default {
  googleConfig,
  appPaths,
  api,
  pagination,
}; 