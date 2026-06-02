/**
 * Lazy loaded clinical pages
 * Provides code splitting for better initial load performance
 * 
 * @module pages/clinica/index.lazy
 */

import { lazy } from 'react';

// Auth
export const LoginMedicaLazy = lazy(() =>
    import('./LoginMedica').then(module => ({ default: module.default }))
);

// Dashboard
export const ClinicaDashboardLazy = lazy(() =>
    import('./ClinicaDashboard').then(module => ({ default: module.default }))
);

// ============================================
// MDL - MEDICINA DEL LAVORO MODULE (Progetto 56)
// ============================================

// Mansioni
export const MansioniPageLazy = lazy(() =>
    import('./mdl/MansioniPage').then(module => ({ default: module.default }))
);

// Mansione Detail
export const MansioneDetailPageLazy = lazy(() =>
    import('./mdl/MansioneDetailPage').then(module => ({ default: module.default }))
);

// Giudizi Idoneità
export const GiudiziIdoneitaPageLazy = lazy(() =>
    import('./mdl/GiudiziIdoneitaPage').then(module => ({ default: module.default }))
);

// Rischio-Prestazioni
export const RischioPrestazioniPageLazy = lazy(() =>
    import('./mdl/RischioPrestazioniPage').then(module => ({ default: module.default }))
);

// Protocolli Sanitari (FASE 2)
export const ProtocolliSanitariPageLazy = lazy(() =>
    import('./mdl/ProtocolliSanitariPage').then(module => ({ default: module.default }))
);

// Protocollo Sanitario Detail
export const ProtocolloSanitarioDetailPageLazy = lazy(() =>
    import('./mdl/ProtocolloSanitarioDetailPage').then(module => ({ default: module.default }))
);

// Nomine Ruolo - Figure Sicurezza (FASE 3)
export const NomineRuoloPageLazy = lazy(() =>
    import('./mdl/NomineRuoloPage').then(module => ({ default: module.default }))
);

// Dashboard Scadenze MDL (FASE 7)
export const ScadenzeMDLPageLazy = lazy(() =>
    import('./mdl/ScadenzeMDLPage').then(module => ({ default: module.default }))
);

// Allegato 3A - Cartella Sanitaria (FASE 5)
export const Allegato3APageLazy = lazy(() =>
    import('./mdl/Allegato3APage').then(module => ({ default: module.default }))
);

// Allegato 3B - Relazione Annuale INAIL (FASE 6)
export const Allegato3BPageLazy = lazy(() =>
    import('./mdl/Allegato3BPage').then(module => ({ default: module.default }))
);

// Relazione Sanitaria Annuale - Dashboard Aggregata (FASE 7)
export const RelazioneSanitariaAnnualePageLazy = lazy(() =>
    import('./mdl/RelazioneSanitariaAnnualePage').then(module => ({ default: module.default }))
);

// ============================================
// STRUTTURA MODULE
// ============================================

// Struttura Dashboard
export const StrutturaDashboardLazy = lazy(() =>
    import('./struttura/StrutturaDashboard').then(module => ({ default: module.default }))
);

// Poliambulatori
export const PoliambulatoriPageLazy = lazy(() =>
    import('./struttura/PoliambulatoriPage').then(module => ({ default: module.default }))
);

export const PoliambulatorioDetailPageLazy = lazy(() =>
    import('./struttura/PoliambulatorioDetailPage').then(module => ({ default: module.default }))
);

export const PoliambulatorioFormLazy = lazy(() =>
    import('./struttura/PoliambulatorioForm').then(module => ({ default: module.default }))
);

// Ambulatori
export const AmbulatoriPageLazy = lazy(() =>
    import('./struttura/AmbulatoriPage').then(module => ({ default: module.default }))
);

export const AmbulatorioDetailPageLazy = lazy(() =>
    import('./struttura/AmbulatorioDetailPage').then(module => ({ default: module.default }))
);

export const AmbulatorioFormLazy = lazy(() =>
    import('./struttura/AmbulatorioForm').then(module => ({ default: module.default }))
);

// Strumenti
export const StrumentiPageLazy = lazy(() =>
    import('./struttura/StrumentiPage').then(module => ({ default: module.default }))
);

export const StrumentoDetailPageLazy = lazy(() =>
    import('./struttura/StrumentoDetailPage').then(module => ({ default: module.default }))
);

export const StrumentoFormLazy = lazy(() =>
    import('./struttura/StrumentoForm').then(module => ({ default: module.default }))
);

// Manutenzione Strumenti
export const ManutenzioneFormLazy = lazy(() =>
    import('./struttura/ManutenzioneForm').then(module => ({ default: module.default }))
);

// Sedi
export const SediPageLazy = lazy(() =>
    import('./struttura/SediPage').then(module => ({ default: module.default }))
);

export const SedeDetailPageLazy = lazy(() =>
    import('./struttura/SedeDetailPage').then(module => ({ default: module.default }))
);

export const SedeFormLazy = lazy(() =>
    import('./struttura/SedeForm').then(module => ({ default: module.default }))
);

// ============================================
// CATALOGO MODULE
// ============================================

// Catalogo Dashboard
export const CatalogoDashboardLazy = lazy(() =>
    import('./catalogo/CatalogoDashboard').then(module => ({ default: module.default }))
);

// Prestazioni
export const PrestazioniPageLazy = lazy(() =>
    import('./catalogo/PrestazioniPage').then(module => ({ default: module.default }))
);

export const PrestazioneFormLazy = lazy(() =>
    import('./catalogo/PrestazioneForm').then(module => ({ default: module.default }))
);

export const PrestazioneDetailPageLazy = lazy(() =>
    import('./catalogo/PrestazioneDetailPage').then(module => ({ default: module.default }))
);

// Template Campi Visita
export const TemplateCampiBuilderLazy = lazy(() =>
    import('./catalogo/TemplateCampiBuilder').then(module => ({ default: module.default }))
);

// Convenzioni
export const ConvenzioniPageLazy = lazy(() =>
    import('./catalogo/ConvenzioniPage').then(module => ({ default: module.default }))
);

export const ConvenzioneFormLazy = lazy(() =>
    import('./catalogo/ConvenzioneForm').then(module => ({ default: module.default }))
);

// Offerte Bundle
export const OfferteBundlePageLazy = lazy(() =>
    import('./catalogo/OfferteBundlePage').then(module => ({ default: module.default }))
);

export const OffertaBundleFormLazy = lazy(() =>
    import('./catalogo/OffertaBundleForm').then(module => ({ default: module.default }))
);

export const OffertaBundleDetailPageLazy = lazy(() =>
    import('./catalogo/OffertaBundleDetailPage').then(module => ({ default: module.default }))
);

// ============================================
// AGENDA MODULE
// ============================================

// Agenda Dashboard
export const AgendaDashboardLazy = lazy(() =>
    import('./agenda/AgendaDashboard').then(module => ({ default: module.default }))
);

// Calendario Avanzato (con drag & drop disponibilità)
export const CalendarioPageLazy = lazy(() =>
    import('./agenda/CalendarioPage').then(module => ({ default: module.default }))
);

// Appuntamenti
export const AppuntamentiPageLazy = lazy(() =>
    import('./agenda/AppuntamentiPage').then(module => ({ default: module.default }))
);

export const AppuntamentoFormLazy = lazy(() =>
    import('./agenda/AppuntamentoForm').then(module => ({ default: module.default }))
);

export const AppuntamentoDetailPageLazy = lazy(() =>
    import('./agenda/AppuntamentoDetailPage').then(module => ({ default: module.default }))
);

// Disponibilità
export const DisponibilitaPageLazy = lazy(() =>
    import('./agenda/disponibilita').then(module => ({ default: module.DisponibilitaPage }))
);

// ============================================
// CLINICA MODULE (Clinical Operations)
// ============================================

// Dashboard Medico
export const MedicoDashboardLazy = lazy(() =>
    import('./clinica/MedicoDashboard').then(module => ({ default: module.default }))
);

// Pazienti
export const PazientiPageLazy = lazy(() =>
    import('./clinica/PazientiPage').then(module => ({ default: module.default }))
);

// Visite List
export const VisiteListPageLazy = lazy(() =>
    import('./clinica/VisiteListPage').then(module => ({ default: module.default }))
);

// Visita
export const VisitaPageLazy = lazy(() =>
    import('./clinica/VisitaPage').then(module => ({ default: module.default }))
);

// Cartella Paziente
export const CartellaPazienteLazy = lazy(() =>
    import('./clinica/CartellaPaziente').then(module => ({ default: module.default }))
);

// Paziente Form (edit)
export const PazienteFormPageLazy = lazy(() =>
    import('./clinica/PazienteFormPage').then(module => ({ default: module.default }))
);

// ============================================
// PERSONALE MODULE (Staff Management)
// ============================================

// Medici - Lista
export const MediciPageLazy = lazy(() =>
    import('./personale/MediciPage').then(module => ({ default: module.default }))
);

// Medici - Form (Create/Edit)
export const MedicoFormLazy = lazy(() =>
    import('./personale/MedicoForm').then(module => ({ default: module.default }))
);

// Medici - Detail
export const MedicoDetailPageLazy = lazy(() =>
    import('./personale/MedicoDetailPage').then(module => ({ default: module.default }))
);

// ============================================
// ============================================
// IMPOSTAZIONI MODULE
// ============================================

// Clinica Settings Page
export const ClinicaSettingsPageLazy = lazy(() =>
    import('./impostazioni/ClinicaSettingsPage').then(module => ({ default: module.default }))
);

// Visit Templates Page (P52 - Clinical Visit Template System)
export const VisitTemplatesPageLazy = lazy(() =>
    import('./impostazioni/visit-templates').then(module => ({ default: module.default }))
);

// Visit Template Detail Page (P52 - Session #35)
export const VisitTemplateDetailPageLazy = lazy(() =>
    import('./impostazioni/visit-templates/VisitTemplateDetailPage').then(module => ({ default: module.default }))
);

// Modulistica Page (P53 - Session #13)
export const ModulisticaPageLazy = lazy(() =>
    import('./impostazioni/modulistica').then(module => ({ default: module.default }))
);

// Modulistica Detail Page (P53 - Session #23)
export const ModulisticaDetailPageLazy = lazy(() =>
    import('./impostazioni/modulistica/ModulisticaDetailPage').then(module => ({ default: module.default }))
);

// Firma Settings Page (P65 - Firma Digitale Management)
export const FirmaSettingsPageLazy = lazy(() =>
    import('./impostazioni/firma/FirmaSettingsPage').then(module => ({ default: module.default }))
);

// Bridge Settings Page (Medical Device Bridge Configuration)
export const BridgeSettingsPageLazy = lazy(() =>
    import('./impostazioni/BridgeSettingsPage').then(module => ({ default: module.default }))
);

// Email Template Settings Page (P74 - Email Template Management)
export const EmailTemplateSettingsPageLazy = lazy(() =>
    import('./impostazioni/email-template/EmailTemplateSettingsPage').then(module => ({ default: module.default }))
);

// Consensi Firma Tablet Page — Gestione moduli consenso per tenant
export const ConsensiPageLazy = lazy(() =>
    import('./impostazioni/ConsensiPage').then(module => ({ default: module.default }))
);

// Impostazioni Notifiche Page
export const ImpostazioniNotifichePageLazy = lazy(() =>
    import('./impostazioni/ImpostazioniNotifichePage').then(module => ({ default: module.default }))
);

// Impostazioni Privacy e GDPR Page
export const ImpostazioniPrivacyPageLazy = lazy(() =>
    import('./impostazioni/ImpostazioniPrivacyPage').then(module => ({ default: module.default }))
);

// ============================================
// CODA MODULE (P53 - Queue Calling System)
// ============================================

// Queue Management Page - Main dashboard for managing patient queues
export const QueueManagementPageLazy = lazy(() =>
    import('./coda/QueueManagementPage').then(module => ({ default: module.default }))
);

// Queue Display Page - Fullscreen display for waiting room monitors
export const QueueDisplayPageLazy = lazy(() =>
    import('./coda/QueueDisplayPage').then(module => ({ default: module.default }))
);

// Create Session Page - Form to create new queue sessions
export const CreateSessionPageLazy = lazy(() =>
    import('./coda/CreateSessionPage').then(module => ({ default: module.default }))
);

// Mobile Queue Landing - Patient check-in page via QR code (P53.1)
export const MobileQueueLandingLazy = lazy(() =>
    import('./coda/MobileQueueLanding').then(module => ({ default: module.default }))
);

// Mobile Queue Status - Patient waiting status page (P53.1)
export const MobileQueueStatusLazy = lazy(() =>
    import('./coda/MobileQueueStatus').then(module => ({ default: module.default }))
);

// Queue Monitors Page - Multi-monitor configuration (P53.3)
export const QueueMonitorsPageLazy = lazy(() =>
    import('./coda/QueueMonitorsPage').then(module => ({ default: module.default }))
);

// Queue Monitor Display Page - Public display for specific monitor (P53.3)
export const QueueMonitorDisplayPageLazy = lazy(() =>
    import('./coda/QueueMonitorDisplayPage').then(module => ({ default: module.default }))
);

// ============================================
// P66 - SCADENZE CENTRALIZZATE (Deadlines & Farmaci)
// ============================================

export const ScadenzePageLazy = lazy(() =>
    import('./scadenze/ScadenzePage').then(module => ({ default: module.default }))
);