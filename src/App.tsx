import React, { useEffect, Suspense, startTransition } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Layout } from './components/layouts';
import { performanceMonitor } from './utils/performanceMonitor';
// routePreloader temporaneamente disabilitato
import { OptimizedHooksDemo } from './examples/OptimizedHooksDemo';
import ProtectedRoute from './components/shared/ProtectedRoute';
import { LoadingFallback } from './components/ui/LoadingFallback';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { getCurrentBrand } from './config/brands.config';
import { BranchProvider } from './contexts/BranchContext';

// === PHASE 4.2b: ALL ROUTES LAZY LOADED ===

// Auth
import LoginPageLazy from './pages/auth/LoginPage.lazy';
import LoginFormazioneLazy from './pages/formazione/LoginFormazione.lazy';

// Dashboard (1121 lines - heavy!)
import DashboardLazy from './pages/Dashboard.lazy';

// Companies
import CompaniesPageLazy from './pages/companies/CompaniesPage.lazy';
import { CompanyDetailsLazy, CompanyEditLazy, CompanyCreateLazy } from './pages/companies/index.lazy';

// Courses
import CoursesPageLazy from './pages/courses/CoursesPage.lazy';
import { CourseDetailsLazy, CourseEditLazy, CourseCreateLazy } from './pages/courses/index.lazy';

// Persons/Employees
import PersonsPageLazy from './pages/persons/PersonsPage.lazy';
import EmployeesPageNewLazy from './pages/employees/EmployeesPageNew.lazy';
import { EmployeeDetailsLazy, EmployeeEditLazy, EmployeeCreateLazy } from './pages/employees/index.lazy';

// Trainers
import TrainersPageNewLazy from './pages/trainers/TrainersPageNew.lazy';
import { TrainerDetailLazy, TrainerEditLazy } from './pages/trainers/index.lazy';

// Schedules
import SchedulesPageLazy from './pages/schedules/SchedulesPage.lazy';
import { ScheduleDetailsLazy } from './pages/schedules/index.lazy';

// Templates & Documents
import TemplateListPageLazy from './pages/templates/TemplateListPage.lazy';
import TemplateEditorLazy from './pages/templates/TemplateEditor.lazy';
import { DocumentListPage as DocumentListPageLazy } from './pages/documents/DocumentListPage.lazy';
import { BatchMonitoringPage as BatchMonitoringPageLazy } from './pages/documents/BatchMonitoringPage.lazy';

// Settings & Admin
import { SettingsLazy } from './pages/settings/Settings.lazy';
import TenantsPageLazy from './pages/tenants/TenantsPage.lazy';
import GoogleOAuthCallbackLazy from './pages/settings/templates/GoogleOAuthCallback.lazy';
// Project 43 - Management Page
import { ManagementLazy } from './pages/management/Management.lazy';
import ManagementLayout from './components/layouts/ManagementLayout';

// Finance
import QuotesAndInvoicesLazy from './pages/QuotesAndInvoices.lazy';
import CodiciScontoPageLazy from './pages/finance/CodiciScontoPage.lazy';
import PreventiviPageLazy from './pages/finance/PreventiviPage.lazy';
import { DocumentsCorsiNew as DocumentsCorsiLazy } from './pages/DocumentsCorsiNew.lazy';

// GDPR
import GDPRDashboardLazy from './pages/GDPRDashboard.lazy';
import AdminGDPRLazy from './pages/AdminGDPR.lazy';

// Forms
import UnifiedFormsPageLazy from './pages/forms/UnifiedFormsPage.lazy';
import { FormTemplateCreateLazy } from './pages/forms/FormTemplateCreate.lazy';
import { FormTemplateEditLazy } from './pages/forms/FormTemplateEdit.lazy';
import { FormTemplateViewLazy } from './pages/forms/FormTemplateView.lazy';
import { FormSubmissionsPageLazy } from './pages/forms/FormSubmissionsPage.lazy';
import { FormSubmissionsViewLazy } from './pages/forms/FormSubmissionsView.lazy';
import { TemplateSubmissionsPageLazy } from './pages/forms/TemplateSubmissionsPage.lazy';

// CMS
import { CMSManagerLazy } from './pages/cms/CMSManager.lazy';
import { CMSPageEditorLazy } from './pages/cms/CMSPageEditor.lazy';
import { MediaLibraryLazy } from './pages/cms/MediaLibrary.lazy';
import { CMSHubLazy } from './pages/cms/CMSHub.lazy';

// === CLINICA / POLIAMBULATORIO MODULE ===
import ClinicaLayout from './components/layouts/ClinicaLayout';
import {
  LoginMedicaLazy,
  ClinicaDashboardLazy,
  // Struttura
  StrutturaDashboardLazy,
  PoliambulatoriPageLazy,
  PoliambulatorioDetailPageLazy,
  PoliambulatorioFormLazy,
  AmbulatoriPageLazy,
  AmbulatorioDetailPageLazy,
  AmbulatorioFormLazy,
  StrumentiPageLazy,
  StrumentoDetailPageLazy,
  StrumentoFormLazy,
  ManutenzioneFormLazy,
  SediPageLazy,
  SedeDetailPageLazy,
  SedeFormLazy,
  // Catalogo
  CatalogoDashboardLazy,
  PrestazioniPageLazy,
  PrestazioneFormLazy,
  PrestazioneDetailPageLazy,
  TemplateCampiBuilderLazy,
  ConvenzioniPageLazy,
  ConvenzioneFormLazy,
  OfferteBundlePageLazy,
  OffertaBundleFormLazy,
  OffertaBundleDetailPageLazy,
  // Agenda
  AgendaDashboardLazy,
  AgendaCalendarLazy,
  AppuntamentiPageLazy,
  AppuntamentoFormLazy,
  AccettazionePageLazy,
  DisponibilitaPageLazy,
  // Clinica (Operations)
  MedicoDashboardLazy,
  PazientiPageLazy,
  VisiteListPageLazy,
  VisitaPageLazy,
  RefertiListPageLazy,
  RefertoEditorLazy,
  CartellaPazienteLazy,
  // Personale (Staff Management)
  MediciPageLazy,
  MedicoFormLazy,
  MedicoDetailPageLazy,
  // Fatturazione
  FatturazioneDashboardLazy,
  FatturePageLazy,
  FatturaFormLazy,
  ReportFinanziariLazy,
  // Impostazioni
  ClinicaSettingsPageLazy
} from './pages/clinica/index.lazy';

// Public Pages - Only import the ones actually used in routes
import {
  CoursesPagePublicLazy,
  CourseDetailPageLazy,
  UnifiedCourseDetailPageLazy,
  PublicFormPageLazy,
  VerifyAttestatoLazy,
} from './pages/public/index.lazy';
import { CMSPageLazy } from './pages/public/CMSPage.lazy';

// Brand-aware routing helper
const brand = getCurrentBrand();
const isElementMedica = brand.id === 'element-medica';

// Component for brand-aware login page
const BrandLoginPage: React.FC = () => {
  if (isElementMedica) {
    return <LoginMedicaLazy />;
  }
  // Element Formazione usa la nuova pagina di login dedicata
  return <LoginFormazioneLazy />;
};

// Component for brand-aware homepage
const BrandHomePage: React.FC = () => {
  // Entrambi i brand mostrano la pagina CMS pubblica sulla homepage
  // La CMSPage caricherà automaticamente lo slug corretto basato sul brand
  return <CMSPageLazy />;
};

// Component for brand-aware dashboard
const BrandDashboard: React.FC = () => {
  if (isElementMedica) {
    // Element Medica: redirect to /poliambulatorio for consistent navigation
    return <Navigate to="/poliambulatorio" replace />;
  }
  // Element Formazione: show standard Dashboard
  return (
    <Layout>
      <DashboardLazy />
    </Layout>
  );
};

function App() {
  const location = useLocation();

  useEffect(() => {
    // Track route changes for performance monitoring with startTransition
    startTransition(() => {
      performanceMonitor.startRouteTracking(location.pathname);
    });

    // Preload high-priority routes on app start
    // TEMPORANEAMENTE DISABILITATO PER FIX VITE
    // routePreloader.preloadByPriority('high');

    return () => {
      performanceMonitor.endRouteTracking(location.pathname);
    };
  }, [location.pathname]);

  useEffect(() => {
    // Preload medium-priority routes after initial load
    // TEMPORANEAMENTE DISABILITATO PER FIX VITE
    // const timer = setTimeout(() => {
    //   startTransition(() => {
    //     routePreloader.preloadByPriority('medium');
    //   });
    // }, 2000);

    // return () => clearTimeout(timer);
  }, []);

  return (
    <BranchProvider>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback message="Loading application..." />}>
          <Routes>
            {/* Route pubbliche - Gestite dal CMS per entrambi i brand */}
            {/* Homepage: CMS per entrambi i brand (slug mappato automaticamente) */}
            <Route path="/" element={<BrandHomePage />} />

            {/* Pagine CMS Element Formazione */}
            <Route path="/servizi" element={<CMSPageLazy />} />
            <Route path="/rspp" element={<CMSPageLazy />} />
            <Route path="/medicina-del-lavoro" element={<CMSPageLazy />} />
            <Route path="/lavora-con-noi" element={<CMSPageLazy />} />
            <Route path="/carriere" element={<CMSPageLazy />} />
            <Route path="/contatti" element={<CMSPageLazy />} />
            <Route path="/privacy-policy" element={<CMSPageLazy />} />
            <Route path="/cookie-policy" element={<CMSPageLazy />} />
            <Route path="/termini" element={<CMSPageLazy />} />

            {/* Pagine CMS Element Medica */}
            <Route path="/diagnostica" element={<CMSPageLazy />} />
            <Route path="/visite-specialistiche" element={<CMSPageLazy />} />
            <Route path="/prenota" element={<CMSPageLazy />} />
            <Route path="/chi-siamo" element={<CMSPageLazy />} />

            {/* Corsi rimangono dinamici dal backend API */}
            <Route path="/corsi" element={<CoursesPagePublicLazy />} />
            <Route path="/corsi/unified/:title" element={<UnifiedCourseDetailPageLazy />} />
            <Route path="/corsi/:slug" element={<CourseDetailPageLazy />} />

            {/* Form pubblici */}
            <Route path="/form/:id" element={<PublicFormPageLazy />} />

            {/* Verifica attestati pubblici */}
            <Route path="/verify/:attestatoNumber" element={<VerifyAttestatoLazy />} />

            {/* Route pubbliche CMS dinamiche (catch-all) - DEVE ESSERE ULTIMA */}
            <Route path="/:slug" element={<CMSPageLazy />} />
            {/* Rotta pubblica per il login - Brand-aware */}
            <Route path="/login" element={<BrandLoginPage />} />
            {/* Rotta di auto-login in dev */}
            {/* DevLogin rimosso: nessuna rotta di bypass */}

            {/* Rotte protette - Area Riservata */}
            <Route element={<ProtectedRoute />}>
              {/* Dashboard: Brand-aware - Formazione mostra Dashboard, Medica mostra Clinica */}
              <Route path="/dashboard" element={<ProtectedRoute />}>
                <Route index element={<BrandDashboard />} />
              </Route>
              <Route path="/companies" element={
                <ProtectedRoute resource="companies" action="read" />
              }>
                <Route index element={
                  <Layout>
                    <CompaniesPageLazy />
                  </Layout>
                } />
                <Route path="create" element={
                  <ProtectedRoute resource="companies" action="create" />
                }>
                  <Route index element={
                    <Layout>
                      <CompanyCreateLazy />
                    </Layout>
                  } />
                </Route>
                <Route path=":id" element={
                  <Layout>
                    <CompanyDetailsLazy />
                  </Layout>
                } />
                <Route path=":id/edit" element={
                  <Layout>
                    <CompanyEditLazy />
                  </Layout>
                } />
              </Route>
              <Route path="/courses" element={
                <ProtectedRoute resource="courses" action="read" />
              }>
                <Route index element={
                  <Layout>
                    <CoursesPageLazy />
                  </Layout>
                } />
                <Route path="create" element={
                  <ProtectedRoute resource="courses" action="create" />
                }>
                  <Route index element={
                    <Layout>
                      <CourseCreateLazy />
                    </Layout>
                  } />
                </Route>
                <Route path=":id" element={
                  <Layout>
                    <CourseDetailsLazy />
                  </Layout>
                } />
                <Route path=":id/edit" element={
                  <Layout>
                    <CourseEditLazy />
                  </Layout>
                } />
              </Route>
              {/* /persons redirect to /management/persons */}
              <Route path="/persons" element={<Navigate to="/management/persons" replace />} />
              <Route path="/persons/*" element={<Navigate to="/management/persons" replace />} />
              <Route path="/employees" element={
                <ProtectedRoute resource="employees" action="read" />
              }>
                <Route index element={
                  <Layout>
                    <EmployeesPageNewLazy />
                  </Layout>
                } />
                <Route path="create" element={
                  <ProtectedRoute resource="employees" action="create" />
                }>
                  <Route index element={
                    <Layout>
                      <EmployeeCreateLazy />
                    </Layout>
                  } />
                </Route>
                <Route path=":id" element={
                  <Layout>
                    <EmployeeDetailsLazy />
                  </Layout>
                } />
                <Route path=":id/edit" element={
                  <Layout>
                    <EmployeeEditLazy />
                  </Layout>
                } />
              </Route>
              <Route path="/trainers" element={
                <ProtectedRoute resource="trainers" action="read" />
              }>
                <Route index element={
                  <Layout>
                    <TrainersPageNewLazy />
                  </Layout>
                } />
                <Route path="create" element={
                  <ProtectedRoute resource="trainers" action="create" />
                }>
                  <Route index element={
                    <Layout>
                      <TrainerEditLazy />
                    </Layout>
                  } />
                </Route>
                <Route path="new" element={
                  <ProtectedRoute resource="trainers" action="create" />
                }>
                  <Route index element={
                    <Layout>
                      <TrainerEditLazy />
                    </Layout>
                  } />
                </Route>
                <Route path=":id" element={
                  <Layout>
                    <TrainerDetailLazy />
                  </Layout>
                } />
                <Route path=":id/edit" element={
                  <Layout>
                    <TrainerEditLazy />
                  </Layout>
                } />
              </Route>
              <Route path="/schedules">
                <Route index element={
                  <Layout>
                    <SchedulesPageLazy />
                  </Layout>
                } />
                <Route path=":id" element={
                  <Layout>
                    <ScheduleDetailsLazy />
                  </Layout>
                } />
              </Route>
              <Route path="/templates">
                <Route index element={
                  <Layout>
                    <TemplateListPageLazy />
                  </Layout>
                } />
                <Route path="create" element={
                  <Layout>
                    <TemplateEditorLazy />
                  </Layout>
                } />
                <Route path=":id" element={
                  <Layout>
                    <TemplateEditorLazy />
                  </Layout>
                } />
              </Route>
              {/* /documents routes removed - use /documents-corsi with toggle instead */}
              <Route path="/documents/*" element={<Navigate to="/documents-corsi" replace />} />
              <Route path="/settings/templates/google-callback" element={
                <GoogleOAuthCallbackLazy />
              } />
              <Route path="/settings/templates/:id/edit" element={
                <Layout>
                  <Suspense fallback={<div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
                    {React.createElement(React.lazy(() => import('./pages/settings/TemplateEditor')))}
                  </Suspense>
                </Layout>
              } />
              <Route path="/settings/*" element={
                <Layout>
                  <SettingsLazy />
                </Layout>
              } />
              {/* Project 43 - Management Page with dedicated Layout */}
              <Route path="/management/*" element={
                <ManagementLayout>
                  <ManagementLazy />
                </ManagementLayout>
              } />
              <Route path="/tenants" element={
                <Layout>
                  <TenantsPageLazy />
                </Layout>
              } />
              <Route path="/quotes-and-invoices" element={
                <Layout>
                  <QuotesAndInvoicesLazy />
                </Layout>
              } />
              {/* /admin/finance/* routes removed - use /quotes-and-invoices instead */}
              <Route path="/admin/finance/*" element={<Navigate to="/quotes-and-invoices" replace />} />
              <Route path="/documents-corsi" element={
                <Layout>
                  <DocumentsCorsiLazy />
                </Layout>
              } />
              <Route path="/gdpr" element={
                <Layout>
                  <GDPRDashboardLazy />
                </Layout>
              } />
              <Route path="/admin/gdpr" element={
                <Layout>
                  <AdminGDPRLazy />
                </Layout>
              } />
              <Route path="/forms" element={
                <ProtectedRoute resource="form_templates" action="read" />
              }>
                <Route index element={
                  <Layout>
                    <UnifiedFormsPageLazy />
                  </Layout>
                } />
                <Route path="templates/create" element={
                  <ProtectedRoute resource="form_templates" action="create" />
                }>
                  <Route index element={
                    <Layout>
                      <FormTemplateCreateLazy />
                    </Layout>
                  } />
                </Route>
                <Route path="templates/:id" element={
                  <Layout>
                    <FormTemplateViewLazy />
                  </Layout>
                } />
                <Route path="templates/:id/edit" element={
                  <ProtectedRoute resource="form_templates" action="edit" />
                }>
                  <Route index element={
                    <Layout>
                      <FormTemplateEditLazy />
                    </Layout>
                  } />
                </Route>
                <Route path="templates/:templateId/submissions" element={
                  <ProtectedRoute resource="form_submissions" action="read" />
                }>
                  <Route index element={
                    <Layout>
                      <TemplateSubmissionsPageLazy />
                    </Layout>
                  } />
                </Route>
                <Route path="submissions" element={
                  <ProtectedRoute resource="form_submissions" action="read" />
                }>
                  <Route index element={
                    <Layout>
                      <FormSubmissionsPageLazy />
                    </Layout>
                  } />
                  <Route path=":id" element={
                    <Layout>
                      <FormSubmissionsViewLazy />
                    </Layout>
                  } />
                </Route>
              </Route>

              {/* CMS Routes - Redirect to Management CMS */}
              <Route path="/cms" element={<Navigate to="/management/cms" replace />} />
              <Route path="/cms/*" element={<Navigate to="/management/cms" replace />} />

              {/* ============================================ */}
              {/* POLIAMBULATORIO MODULE ROUTES               */}
              {/* ============================================ */}

              {/* Login Poliambulatorio (dedicato) */}
              <Route path="/poliambulatorio/login" element={<LoginMedicaLazy />} />
              {/* Legacy redirect from /clinica to /poliambulatorio */}
              <Route path="/clinica/*" element={<Navigate to="/poliambulatorio" replace />} />
              <Route path="/clinica" element={<Navigate to="/poliambulatorio" replace />} />

              {/* Main Poliambulatorio Routes with ClinicaLayout */}
              <Route path="/poliambulatorio" element={<ClinicaLayout />}>
                {/* Dashboard Principale Clinica */}
                <Route index element={<ClinicaDashboardLazy />} />

                {/* STRUTTURA MODULE */}
                <Route path="struttura" element={<StrutturaDashboardLazy />} />
                {/* Legacy redirect: /struttura/poliambulatori -> /poliambulatori */}
                <Route path="struttura/poliambulatori" element={<Navigate to="/poliambulatorio/poliambulatori" replace />} />
                <Route path="struttura/poliambulatori/*" element={<Navigate to="/poliambulatorio/poliambulatori" replace />} />
                <Route path="poliambulatori" element={<PoliambulatoriPageLazy />} />
                <Route path="poliambulatori/nuovo" element={<PoliambulatorioFormLazy />} />
                <Route path="poliambulatori/:id" element={<PoliambulatorioDetailPageLazy />} />
                <Route path="poliambulatori/:id/modifica" element={<PoliambulatorioFormLazy />} />
                <Route path="ambulatori" element={<AmbulatoriPageLazy />} />
                <Route path="ambulatori/nuovo" element={<AmbulatorioFormLazy />} />
                <Route path="ambulatori/:id" element={<AmbulatorioDetailPageLazy />} />
                <Route path="ambulatori/:id/modifica" element={<AmbulatorioFormLazy />} />
                <Route path="strumenti" element={<StrumentiPageLazy />} />
                <Route path="strumenti/nuovo" element={<StrumentoFormLazy />} />
                <Route path="strumenti/:id" element={<StrumentoDetailPageLazy />} />
                <Route path="strumenti/:id/modifica" element={<StrumentoFormLazy />} />
                <Route path="strumenti/:id/manutenzione" element={<ManutenzioneFormLazy />} />
                <Route path="sedi" element={<SediPageLazy />} />
                <Route path="sedi/nuovo" element={<SedeFormLazy />} />
                <Route path="sedi/:id" element={<SedeDetailPageLazy />} />
                <Route path="sedi/:id/modifica" element={<SedeFormLazy />} />

                {/* CATALOGO MODULE */}
                <Route path="catalogo" element={<CatalogoDashboardLazy />} />
                <Route path="catalogo/prestazioni" element={<PrestazioniPageLazy />} />
                <Route path="catalogo/prestazioni/nuovo" element={<PrestazioneFormLazy />} />
                <Route path="catalogo/prestazioni/:id" element={<PrestazioneDetailPageLazy />} />
                <Route path="catalogo/prestazioni/:id/modifica" element={<PrestazioneFormLazy />} />
                <Route path="catalogo/prestazioni/:id/template" element={<TemplateCampiBuilderLazy />} />

                {/* Convenzioni routes - under catalogo */}
                <Route path="catalogo/convenzioni" element={<ConvenzioniPageLazy />} />
                <Route path="catalogo/convenzioni/nuovo" element={<ConvenzioneFormLazy />} />
                <Route path="catalogo/convenzioni/:id" element={<ConvenzioneFormLazy />} />
                <Route path="catalogo/convenzioni/:id/modifica" element={<ConvenzioneFormLazy />} />

                {/* Legacy routes - backward compatibility */}
                <Route path="prestazioni" element={<PrestazioniPageLazy />} />
                <Route path="prestazioni/nuovo" element={<PrestazioneFormLazy />} />
                <Route path="prestazioni/:id" element={<PrestazioneDetailPageLazy />} />
                <Route path="prestazioni/:id/modifica" element={<PrestazioneFormLazy />} />
                <Route path="prestazioni/:id/template" element={<TemplateCampiBuilderLazy />} />
                <Route path="convenzioni" element={<ConvenzioniPageLazy />} />
                <Route path="convenzioni/nuovo" element={<ConvenzioneFormLazy />} />
                <Route path="convenzioni/:id" element={<ConvenzioneFormLazy />} />
                <Route path="convenzioni/:id/modifica" element={<ConvenzioneFormLazy />} />
                {/* Bundles/Offerte */}
                <Route path="catalogo/bundles" element={<OfferteBundlePageLazy />} />
                <Route path="catalogo/bundles/nuovo" element={<OffertaBundleFormLazy />} />
                <Route path="catalogo/bundles/:id" element={<OffertaBundleDetailPageLazy />} />
                <Route path="catalogo/bundles/:id/modifica" element={<OffertaBundleFormLazy />} />

                {/* AGENDA MODULE */}
                <Route path="agenda" element={<AgendaDashboardLazy />} />
                <Route path="agenda/nuovo" element={<AppuntamentoFormLazy />} />
                <Route path="agenda/calendario" element={<AgendaCalendarLazy />} />
                <Route path="agenda/accettazione" element={<AccettazionePageLazy />} />
                <Route path="agenda/disponibilita" element={<DisponibilitaPageLazy />} />
                <Route path="calendario" element={<AgendaCalendarLazy />} />
                <Route path="appuntamenti" element={<AppuntamentiPageLazy />} />
                <Route path="appuntamenti/nuovo" element={<AppuntamentoFormLazy />} />
                <Route path="appuntamenti/:id" element={<AppuntamentoFormLazy />} />
                <Route path="appuntamenti/:id/modifica" element={<AppuntamentoFormLazy />} />
                <Route path="accettazione" element={<AccettazionePageLazy />} />
                <Route path="disponibilita" element={<DisponibilitaPageLazy />} />

                {/* CLINICA (OPERATIONS) MODULE */}
                <Route path="medico" element={<MedicoDashboardLazy />} />
                <Route path="visite" element={<VisiteListPageLazy />} />
                <Route path="visite/:id" element={<VisitaPageLazy />} />
                <Route path="referti" element={<RefertiListPageLazy />} />
                <Route path="referti/:id" element={<RefertoEditorLazy />} />
                <Route path="pazienti" element={<PazientiPageLazy />} />
                <Route path="pazienti/:id" element={<CartellaPazienteLazy />} />

                {/* PERSONALE MODULE (Staff Management) */}
                <Route path="personale/medici" element={<MediciPageLazy />} />
                <Route path="personale/medici/nuovo" element={<MedicoFormLazy />} />
                <Route path="personale/medici/:id" element={<MedicoDetailPageLazy />} />
                <Route path="personale/medici/:id/modifica" element={<MedicoFormLazy />} />

                {/* FATTURAZIONE MODULE */}
                <Route path="fatturazione" element={<FatturazioneDashboardLazy />} />
                <Route path="fatturazione/fatture" element={<FatturePageLazy />} />
                <Route path="fatturazione/fatture/nuovo" element={<FatturaFormLazy />} />
                <Route path="fatturazione/fatture/:id" element={<FatturaFormLazy />} />
                <Route path="fatturazione/fatture/:id/modifica" element={<FatturaFormLazy />} />
                <Route path="fatturazione/report" element={<ReportFinanziariLazy />} />

                {/* IMPOSTAZIONI MODULE */}
                <Route path="impostazioni" element={<ClinicaSettingsPageLazy />} />
              </Route>

              {/* /demo route removed - developer tool no longer needed */}
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BranchProvider>
  );
}

export default App;