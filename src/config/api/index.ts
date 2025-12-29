/**
 * Configurazione centrale degli endpoint API
 */

// Base URL per tutte le richieste API
// In development: usa /api che viene proxato da Vite verso localhost:4001
// In production: usa path relativo /api che viene gestito da Nginx
export const API_BASE_URL = (() => {
  // Se siamo in un ambiente browser, usiamo /api per sfruttare il proxy Vite/Nginx
  if (typeof window !== 'undefined') {
    // In development usiamo il proxy Vite, in production Nginx gestisce /api
    return '/api';
  }
  // Fallback per ambienti non-browser (SSR/Build/Tests)
  // Permette override tramite variabile d'ambiente Vite
  const envBase = (process as any)?.env?.VITE_API_BASE_URL;
  return envBase || '/api';
})();

// Prefissi specifici dei server (relativi, gestiti da proxy)
export const API_ENDPOINTS = {
  // Server API principale (gestito da proxy)
  API_SERVER: '/api',

  // Server documenti (gestito da proxy)
  DOCUMENTS_SERVER: '/docs',

  // Endpoint specifici
  COMPANIES: '/companies',
  EMPLOYEES: '/employees',
  COURSES: '/courses',
  TRAINERS: '/trainers',
  SCHEDULES: '/api/v1/schedules',
  ATTESTATI: '/attestati',
  TEMPLATES: '/templates',
  TEMPLATE_LINKS: '/template-links',
  USER_PREFERENCES: '/user-preferences',
  ACTIVITY_LOGS: '/activity-logs',

  // Endpoint che accettano ID
  COMPANY_BY_ID: (id: string) => `/companies/${id}`,
  EMPLOYEE_BY_ID: (id: string) => `/employees/${id}`,
  COURSE_BY_ID: (id: string) => `/courses/${id}`,
  TRAINER_BY_ID: (id: string) => `/trainers/${id}`,
  SCHEDULE_BY_ID: (id: string) => `/api/v1/schedules/${id}`,
  ATTESTATO_BY_ID: (id: string) => `/attestati/${id}`,

  // Google API
  GOOGLE_DOCS: {
    TEMPLATES: '/api/google-docs/templates',
    GENERATE: '/api/google-docs/generate',
    ATTESTATI: '/api/google-docs/attestati',
  }
};

// Configurazione timeout richieste
export const API_TIMEOUT = 30000; // 30 secondi