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

// Calendario
export const AgendaCalendarLazy = lazy(() =>
    import('./agenda/AgendaCalendar').then(module => ({ default: module.default }))
);

// Appuntamenti
export const AppuntamentiPageLazy = lazy(() =>
    import('./agenda/AppuntamentiPage').then(module => ({ default: module.default }))
);

export const AppuntamentoFormLazy = lazy(() =>
    import('./agenda/AppuntamentoForm').then(module => ({ default: module.default }))
);

// Accettazione
export const AccettazionePageLazy = lazy(() =>
    import('./agenda/AccettazionePage').then(module => ({ default: module.default }))
);

// Disponibilità
export const DisponibilitaPageLazy = lazy(() =>
    import('./agenda/DisponibilitaPage').then(module => ({ default: module.default }))
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

// Referti List
export const RefertiListPageLazy = lazy(() =>
    import('./clinica/RefertiListPage').then(module => ({ default: module.default }))
);

// Referto Editor
export const RefertoEditorLazy = lazy(() =>
    import('./clinica/RefertoEditor').then(module => ({ default: module.default }))
);

// Cartella Paziente
export const CartellaPazienteLazy = lazy(() =>
    import('./clinica/CartellaPaziente').then(module => ({ default: module.default }))
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
// FATTURAZIONE MODULE (Billing)
// ============================================

// Fatturazione Dashboard
export const FatturazioneDashboardLazy = lazy(() =>
    import('./fatturazione/FatturazioneDashboard').then(module => ({ default: module.default }))
);

// Fatture Page
export const FatturePageLazy = lazy(() =>
    import('./fatturazione/FatturePage').then(module => ({ default: module.default }))
);

// Fattura Form
export const FatturaFormLazy = lazy(() =>
    import('./fatturazione/FatturaForm').then(module => ({ default: module.default }))
);

// Report Finanziari
export const ReportFinanziariLazy = lazy(() =>
    import('./fatturazione/ReportFinanziari').then(module => ({ default: module.default }))
);

// ============================================
// IMPOSTAZIONI MODULE
// ============================================

// Clinica Settings Page
export const ClinicaSettingsPageLazy = lazy(() =>
    import('./impostazioni/ClinicaSettingsPage').then(module => ({ default: module.default }))
);