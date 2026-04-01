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
// P64: Tutti gli endpoint usano ora /v1/ direttamente - nessuna riscrittura proxy necessaria
export const API_ENDPOINTS = {
  // Server API principale (gestito da proxy)
  API_SERVER: '/api',

  // Server documenti (gestito da proxy)
  DOCUMENTS_SERVER: '/docs',

  // Endpoint specifici - P64: standardizzati a /v1/
  COMPANIES: '/v1/companies',
  EMPLOYEES: '/v1/employees',
  COURSES: '/v1/courses',
  TRAINERS: '/v1/trainers',
  SCHEDULES: '/v1/schedules',
  ATTESTATI: '/v1/attestati',
  TEMPLATES: '/v1/templates',
  TEMPLATE_LINKS: '/v1/templates',
  USER_PREFERENCES: '/v1/user-preferences',
  ACTIVITY_LOGS: '/v1/activity-logs',

  // Endpoint che accettano ID - P64: standardizzati a /v1/
  COMPANY_BY_ID: (id: string) => `/v1/companies/${id}`,
  EMPLOYEE_BY_ID: (id: string) => `/v1/employees/${id}`,
  COURSE_BY_ID: (id: string) => `/v1/courses/${id}`,
  TRAINER_BY_ID: (id: string) => `/v1/trainers/${id}`,
  SCHEDULE_BY_ID: (id: string) => `/v1/schedules/${id}`,
  ATTESTATO_BY_ID: (id: string) => `/v1/attestati/${id}`,

  // Google API - P64: standardizzati a /v1/
  GOOGLE_DOCS: {
    TEMPLATES: '/v1/google-docs/templates',
    GENERATE: '/v1/google-docs/generate',
    ATTESTATI: '/v1/google-docs/attestati',
  }
};

// Configurazione timeout richieste
export const API_TIMEOUT = 30000; // 30 secondi