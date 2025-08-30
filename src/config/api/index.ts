/**
 * Configurazione centrale degli endpoint API
 */

// Base URL per tutte le richieste API
// Usa proxy server sulla porta 4003 come specificato nelle regole del progetto
// In produzione e in ambiente browser, usa path relativo vuoto ""; gli endpoint devono già includere "/api"
export const API_BASE_URL = (() => {
  // Se siamo in un ambiente browser, usiamo baseURL vuota
  if (typeof window !== 'undefined') {
    return '';
  }
  // Fallback per ambienti non-browser (SSR/Build/Tests)
  // Permette override tramite variabile d'ambiente Vite, con default locale
  const envBase = (process as any)?.env?.VITE_API_BASE_URL;
  return envBase || 'http://localhost:4003';
})();

// Prefissi specifici dei server
export const API_ENDPOINTS = {
  // Server API principale (porta 4001)
  API_SERVER: 'http://localhost:4001',
  
  // Server documenti (porta 4002)
  DOCUMENTS_SERVER: 'http://localhost:4002',
  
  // Endpoint specifici
  COMPANIES: '/companies',
  EMPLOYEES: '/employees',
  COURSES: '/courses',
  TRAINERS: '/trainers',
  SCHEDULES: '/schedules',
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
  SCHEDULE_BY_ID: (id: string) => `/schedules/${id}`,
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