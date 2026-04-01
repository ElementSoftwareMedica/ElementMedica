/**
 * Agenda Module Exports
 * 
 * Modulo gestione agenda clinica con appuntamenti, 
 * calendario, accettazione e disponibilità.
 * 
 * @module pages/clinica/agenda
 */

// Dashboard principale
export { AgendaDashboard } from './AgendaDashboard';
export { default as AgendaDashboardDefault } from './AgendaDashboard';

// Calendario
export { CalendarioPage } from './CalendarioPage';
export { default as CalendarioPageDefault } from './CalendarioPage';

// Appuntamenti
export { AppuntamentiPage } from './AppuntamentiPage';
export { default as AppuntamentiPageDefault } from './AppuntamentiPage';

// Form Appuntamento
export { AppuntamentoForm } from './AppuntamentoForm';
export { default as AppuntamentoFormDefault } from './AppuntamentoForm';

// Disponibilità (refactored modular structure)
export { DisponibilitaPage } from './disponibilita';
export { DisponibilitaPage as DisponibilitaPageDefault } from './disponibilita';
