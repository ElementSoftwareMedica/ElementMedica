import React, { useEffect, Suspense, startTransition } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Layout } from './components/layouts';
import { performanceMonitor } from './utils/performanceMonitor';
import ProtectedRoute from './components/shared/ProtectedRoute';
import { LoadingFallback } from './components/ui/LoadingFallback';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { getCurrentBrand } from './config/brands.config';
import { BranchProvider } from './contexts/BranchContext';
import { ThemeProvider } from './context/ThemeContext';
// TenantModeProvider è ora in providers/index.tsx per sincronizzazione corretta con TenantFilterContext

// P60: Import dark mode CSS
import './styles/dark-mode.css';

// === PHASE 4.2b: ALL ROUTES LAZY LOADED ===

// Auth
import LoginPageLazy from './pages/auth/LoginPage.lazy';
import LoginFormazioneLazy from './pages/formazione/LoginFormazione.lazy';
import FirmaFormatorePageLazy from './pages/formazione/impostazioni/FirmaFormatorePage.lazy';
import FormazioneImpostazioniPageLazy from './pages/formazione/impostazioni/FormazioneImpostazioniPage.lazy';

// Dashboard (1121 lines - heavy!)
import DashboardLazy from './pages/Dashboard.lazy';

// Companies
import CompaniesPageLazy from './pages/companies/CompaniesPage.lazy';
import { CompanyDetailsLazy, CompanyEditLazy, CompanyCreateLazy } from './pages/companies/index.lazy';

// Courses
import CoursesPageLazy from './pages/courses/CoursesPage.lazy';
import { CourseDetailsLazy, CourseEditLazy, CourseCreateLazy } from './pages/courses/index.lazy';

// Employees
import EmployeesPageLazy from './pages/employees/EmployeesPage.lazy';
import { EmployeeDetailsLazy, EmployeeEditLazy, EmployeeCreateLazy } from './pages/employees/index.lazy';

// Trainers
import TrainersPageLazy from './pages/trainers/TrainersPage.lazy';
import { TrainerDetailLazy, TrainerEditLazy } from './pages/trainers/index.lazy';

// Schedules
import SchedulesPageLazy from './pages/schedules/SchedulesPage.lazy';
import { ScheduleDetailsLazy } from './pages/schedules/index.lazy';

// Templates & Documents
import TemplateListPageLazy from './pages/templates/TemplateListPage.lazy';
import TemplateEditorLazy from './pages/templates/TemplateEditor.lazy';

// Settings & Admin
// DesktopLicensesTab — used in both /poliambulatorio/impostazioni/desktop and /formazione/impostazioni/desktop
const DesktopLicensesTabLazy = React.lazy(() => import('./pages/settings/DesktopLicensesTab'));
import TenantsPageLazy from './pages/tenants/TenantsPage.lazy';
import GoogleOAuthCallbackLazy from './pages/settings/templates/GoogleOAuthCallback.lazy';
// Project 43 - Management Page
import { ManagementLazy } from './pages/management/Management.lazy';
import ManagementLayout from './components/layouts/ManagementLayout';

// Finance
import QuotesAndInvoicesLazy from './pages/QuotesAndInvoices.lazy';
import { DocumentsCorsi as DocumentsCorsiLazy } from './pages/DocumentsCorsi.lazy';

// GDPR
import GDPRDashboardLazy from './pages/GDPRDashboard.lazy';
import AdminGDPRLazy from './pages/AdminGDPR.lazy';

// Notifications (Project 47)
import {
  NotificationCenterLazy,
  NotificationPreferencesLazy,
  NotificationGroupsLazy,
  EscalationDashboardLazy,
  AnalyticsDashboardLazy
} from './pages/notifications';

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

// Sicurezza (P44 - ElementSicurezza OT23)
import { OT23PageLazy, OT23DetailPageLazy } from './pages/sicurezza/index.lazy';
import { CMSHubLazy } from './pages/cms/CMSHub.lazy';

// === CLINICA / POLIAMBULATORIO MODULE ===
import ClinicaLayout from './components/layouts/ClinicaLayout';
import {
  LoginMedicaLazy,
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
  CalendarioPageLazy,
  AppuntamentiPageLazy,
  AppuntamentoFormLazy,
  AppuntamentoDetailPageLazy,
  DisponibilitaPageLazy,
  // Clinica (Operations)
  PazientiPageLazy,
  PazienteFormPageLazy,
  VisiteListPageLazy,
  VisitaPageLazy,
  CartellaPazienteLazy,
  // Personale (Staff Management)
  MediciPageLazy,
  MedicoFormLazy,
  MedicoDetailPageLazy,
  // Impostazioni
  ClinicaSettingsPageLazy,
  VisitTemplatesPageLazy,
  VisitTemplateDetailPageLazy,
  ModulisticaPageLazy,
  ModulisticaDetailPageLazy,
  FirmaSettingsPageLazy,
  BridgeSettingsPageLazy,
  EmailTemplateSettingsPageLazy,
  ConsensiPageLazy,
  // Coda (P53 - Queue Calling System)
  QueueManagementPageLazy,
  QueueDisplayPageLazy,
  CreateSessionPageLazy,
  MobileQueueLandingLazy,
  MobileQueueStatusLazy,
  QueueMonitorsPageLazy,
  QueueMonitorDisplayPageLazy,
  // MDL - Medicina del Lavoro (P56)
  MansioniPageLazy,
  MansioneDetailPageLazy,
  GiudiziIdoneitaPageLazy,
  RischioPrestazioniPageLazy,
  ProtocolliSanitariPageLazy,
  ProtocolloSanitarioDetailPageLazy,
  NomineRuoloPageLazy,
  ScadenzeMDLPageLazy,
  Allegato3APageLazy,
  Allegato3BPageLazy,
  RelazioneSanitariaAnnualePageLazy,
  // P66 - Sistema Scadenze Centralizzato
  ScadenzePageLazy
} from './pages/clinica/index.lazy';

// Tariffari Aziende - Medicina del Lavoro (moved from Management to MDL)
const TariffariAziendeLazy = React.lazy(() => import('./pages/management/tariffari-aziende/TariffariAziendePage'));
const TariffarioAziendaleDetailsLazy = React.lazy(() => import('./pages/management/tariffari-aziende/TariffarioAziendaleDetails'));
const TariffarioAziendaleFormLazy = React.lazy(() => import('./pages/management/tariffari-aziende/TariffarioAziendaleForm'));

// Public Pages - Only import the ones actually used in routes
import {
  CoursesPagePublicLazy,
  CourseDetailPageLazy,
  UnifiedCourseDetailPageLazy,
  PublicFormPageLazy,
  VerifyAttestatoLazy,
} from './pages/public/index.lazy';
import { CMSPageLazy } from './pages/public/CMSPage.lazy';
import { DoctorProfilePageLazy, DoctorsListPageLazy } from './pages/public/DoctorPages.lazy';

// Prenota - Dedicated booking page (not CMS)
const PrenotaPageLazy = React.lazy(() => import('./pages/public/PrenotaPage'));

// Gruppo Servizi - Cross-domain services overview
const GruppoServiziPageLazy = React.lazy(() => import('./pages/public/GruppoServiziPage'));

// Pagina pubblica consensi informativi (tablet firma)
const ConsensoFirmaPageLazy = React.lazy(() => import('./pages/public/ConsensoFirmaPage'));
const TabletFirmaPageLazy = React.lazy(() => import('./pages/public/TabletFirmaPage'));

// Brand-aware routing helper
const brand = getCurrentBrand();
const isElementMedica = brand.id === 'element-medica';

// Component for brand-aware login page
const BrandLoginPage: React.FC = () => {
  if (isElementMedica) {
    return <LoginMedicaLazy />;
  }
  // Element Sicurezza usa la nuova pagina di login dedicata
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
  // Element Sicurezza: show standard Dashboard
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

    return () => {
      performanceMonitor.endRouteTracking(location.pathname);
    };
  }, [location.pathname]);

  return (
    <ThemeProvider>
      <BranchProvider>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback message="Loading application..." />}>
            <Routes>
              {/* Route pubbliche - Gestite dal CMS per entrambi i brand */}
              {/* Homepage: CMS per entrambi i brand (slug mappato automaticamente) */}
              <Route path="/" element={<BrandHomePage />} />

              {/* Pagine CMS Element Sicurezza */}
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
              <Route path="/prenota" element={<Suspense fallback={<LoadingFallback />}><PrenotaPageLazy /></Suspense>} />
              <Route path="/chi-siamo" element={<CMSPageLazy />} />
              <Route path="/gruppo-servizi" element={<Suspense fallback={<LoadingFallback />}><GruppoServiziPageLazy /></Suspense>} />

              {/* Corsi rimangono dinamici dal backend API */}
              <Route path="/corsi" element={<CoursesPagePublicLazy />} />
              <Route path="/corsi/unified/:title" element={<UnifiedCourseDetailPageLazy />} />
              <Route path="/corsi/:slug" element={<CourseDetailPageLazy />} />

              {/* Medici pubblici - profili e prenotazione (P80) */}
              <Route path="/medici" element={<DoctorsListPageLazy />} />
              <Route path="/medici/:medicoId" element={<DoctorProfilePageLazy />} />

              {/* Form pubblici */}
              <Route path="/form/:id" element={<PublicFormPageLazy />} />

              {/* Verifica attestati pubblici */}
              <Route path="/verify/:attestatoNumber" element={<VerifyAttestatoLazy />} />

              {/* Queue Mobile Check-in (P53.1 - Public routes) */}
              <Route path="/queue/:token" element={<MobileQueueLandingLazy />} />
              <Route path="/queue/:token/status/:entryId" element={<MobileQueueStatusLazy />} />

              {/* Queue Monitor Display (P53.3 - Public display for TV/totem) */}
              <Route path="/display/monitor/:accessToken" element={<QueueMonitorDisplayPageLazy />} />

              {/* Pagina pubblica per la firma dei consensi informativi (tablet) */}
              <Route path="/consenso" element={<Suspense fallback={<LoadingFallback />}><ConsensoFirmaPageLazy /></Suspense>} />

              {/* Tablet fisso per la firma consensi (URL permanente per postazione) */}
              <Route path="/tablet" element={<Suspense fallback={<LoadingFallback />}><TabletFirmaPageLazy /></Suspense>} />

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
                {/* P69: /persons redirect to /management/hr/profili */}
                <Route path="/persons" element={<Navigate to="/management/hr/profili" replace />} />
                <Route path="/persons/*" element={<Navigate to="/management/hr/profili" replace />} />
                <Route path="/employees" element={
                  <ProtectedRoute resource="employees" action="read" />
                }>
                  <Route index element={
                    <Layout>
                      <EmployeesPageLazy />
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
                      <TrainersPageLazy />
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
                {/* /settings/* rimosso — l'App Desktop è ora in /poliambulatorio/impostazioni/desktop */}
                <Route path="/settings/*" element={<Navigate to="/poliambulatorio/impostazioni" replace />} />
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
                <Route path="/preventivi" element={
                  <Layout>
                    <QuotesAndInvoicesLazy />
                  </Layout>
                } />
                {/* /admin/finance/* routes removed - use /preventivi instead */}
                <Route path="/admin/finance/*" element={<Navigate to="/preventivi" replace />} />
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

                {/* ============================================ */}
                {/* NOTIFICATIONS MODULE (Project 47)           */}
                {/* ============================================ */}
                <Route path="/notifiche">
                  <Route index element={
                    <Layout>
                      <NotificationCenterLazy />
                    </Layout>
                  } />
                  <Route path="preferenze" element={
                    <Layout>
                      <NotificationPreferencesLazy />
                    </Layout>
                  } />
                  <Route path="gruppi" element={
                    <Layout>
                      <NotificationGroupsLazy />
                    </Layout>
                  } />
                  <Route path="escalation" element={
                    <Layout>
                      <EscalationDashboardLazy />
                    </Layout>
                  } />
                  <Route path="analytics" element={
                    <Layout>
                      <AnalyticsDashboardLazy />
                    </Layout>
                  } />
                </Route>

                {/* Test Routes (ex Forms) */}
                <Route path="/test" element={
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
                {/* SICUREZZA MODULE ROUTES (P44)               */}
                {/* ============================================ */}

                <Route path="/sicurezza/ot23" element={
                  <ProtectedRoute resource="companies" action="read" />
                }>
                  <Route index element={
                    <Layout>
                      <Suspense fallback={<LoadingFallback />}>
                        <OT23PageLazy />
                      </Suspense>
                    </Layout>
                  } />
                  <Route path=":id" element={
                    <Layout>
                      <Suspense fallback={<LoadingFallback />}>
                        <OT23DetailPageLazy />
                      </Suspense>
                    </Layout>
                  } />
                </Route>

                {/* ============================================ */}
                {/* POLIAMBULATORIO MODULE ROUTES               */}
                {/* ============================================ */}

                {/* Impostazioni Formazione - hub page */}
                <Route path="/formazione/impostazioni" element={
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <FormazioneImpostazioniPageLazy />
                    </Suspense>
                  </Layout>
                } />

                {/* App Desktop - accessibile sotto formazione/impostazioni */}
                <Route path="/formazione/impostazioni/desktop" element={
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <DesktopLicensesTabLazy />
                    </Suspense>
                  </Layout>
                } />

                {/* Firma Formatori - ElementSicurezza */}
                <Route path="/formazione/impostazioni/firma" element={
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <FirmaFormatorePageLazy />
                    </Suspense>
                  </Layout>
                } />

                {/* Login Poliambulatorio (dedicato) */}
                <Route path="/poliambulatorio/login" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <LoginMedicaLazy />
                  </Suspense>
                } />

                {/* Main Poliambulatorio Routes with ClinicaLayout */}
                <Route path="/poliambulatorio" element={<ClinicaLayout />}>
                  {/* Dashboard - redirect to /agenda (consolidated dashboard) */}
                  <Route index element={<Navigate to="/poliambulatorio/agenda" replace />} />

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

                  {/* Bundles/Offerte */}
                  <Route path="catalogo/bundles" element={<OfferteBundlePageLazy />} />
                  <Route path="catalogo/bundles/nuovo" element={<OffertaBundleFormLazy />} />
                  <Route path="catalogo/bundles/:id" element={<OffertaBundleDetailPageLazy />} />
                  <Route path="catalogo/bundles/:id/modifica" element={<OffertaBundleFormLazy />} />

                  {/* AGENDA MODULE */}
                  <Route path="agenda" element={<AgendaDashboardLazy />} />
                  <Route path="agenda/nuovo" element={<AppuntamentoFormLazy />} />
                  <Route path="agenda/calendario" element={<CalendarioPageLazy />} />
                  <Route path="agenda/accettazione" element={<Navigate to="/poliambulatorio/appuntamenti" replace />} />
                  <Route path="agenda/disponibilita" element={<DisponibilitaPageLazy />} />
                  <Route path="agenda/disponibilita/:medicoId" element={<DisponibilitaPageLazy />} />
                  <Route path="agenda/appuntamenti/:id" element={<AppuntamentoDetailPageLazy />} />
                  <Route path="calendario" element={<CalendarioPageLazy />} />
                  <Route path="appuntamenti" element={<AppuntamentiPageLazy />} />
                  <Route path="appuntamenti/nuovo" element={<AppuntamentoFormLazy />} />
                  <Route path="appuntamenti/:id" element={<AppuntamentoDetailPageLazy />} />
                  <Route path="appuntamenti/:id/modifica" element={<AppuntamentoFormLazy />} />
                  <Route path="accettazione" element={<Navigate to="/poliambulatorio/appuntamenti" replace />} />
                  <Route path="disponibilita" element={<DisponibilitaPageLazy />} />
                  <Route path="disponibilita/:medicoId" element={<DisponibilitaPageLazy />} />

                  {/* CODA MODULE (P53 - Queue Calling System) */}
                  <Route path="coda" element={<QueueManagementPageLazy />} />
                  <Route path="coda/sessioni/nuova" element={<CreateSessionPageLazy />} />
                  <Route path="coda/display/:sessionId" element={<QueueDisplayPageLazy />} />
                  <Route path="coda/monitors" element={<Navigate to="/poliambulatorio/struttura/monitors" replace />} />
                  <Route path="struttura/monitors" element={<QueueMonitorsPageLazy />} />

                  {/* CLINICA (OPERATIONS) MODULE */}
                  <Route path="medico" element={<Navigate to="/poliambulatorio/agenda" replace />} />
                  {/* visite/:id è annidata in visite — VisiteListPage mostra l'Outlet come overlay full-screen */}
                  <Route path="visite" element={<VisiteListPageLazy />}>
                    <Route path=":id" element={<VisitaPageLazy />} />
                  </Route>
                  <Route path="pazienti" element={<PazientiPageLazy />} />
                  <Route path="pazienti/:id" element={<CartellaPazienteLazy />} />
                  <Route path="pazienti/:id/modifica" element={<PazienteFormPageLazy />} />

                  {/* PERSONALE MODULE (Staff Management) */}
                  <Route path="personale/medici" element={<MediciPageLazy />} />
                  <Route path="personale/medici/nuovo" element={<MedicoFormLazy />} />
                  <Route path="personale/medici/:id" element={<MedicoDetailPageLazy />} />
                  <Route path="personale/medici/:id/modifica" element={<MedicoFormLazy />} />

                  {/* MDL - MEDICINA DEL LAVORO MODULE (Progetto 56) */}
                  <Route path="mdl/mansioni" element={<MansioniPageLazy />} />
                  <Route path="mdl/mansioni/:id" element={<MansioneDetailPageLazy />} />
                  <Route path="mdl/giudizi-idoneita" element={<GiudiziIdoneitaPageLazy />} />
                  <Route path="mdl/giudizi-idoneita/:id" element={<GiudiziIdoneitaPageLazy />} />
                  <Route path="mdl/giudizi-idoneita/:id/modifica" element={<GiudiziIdoneitaPageLazy />} />
                  <Route path="mdl/giudizi-idoneita/:id/ricorso" element={<GiudiziIdoneitaPageLazy />} />
                  <Route path="mdl/rischio-prestazioni" element={<RischioPrestazioniPageLazy />} />
                  <Route path="mdl/protocolli-sanitari" element={<ProtocolliSanitariPageLazy />} />
                  <Route path="mdl/protocolli-sanitari/:id" element={<ProtocolloSanitarioDetailPageLazy />} />
                  <Route path="mdl/nomine-ruolo" element={<NomineRuoloPageLazy />} />
                  <Route path="mdl/scadenze" element={<ScadenzeMDLPageLazy />} />
                  <Route path="mdl/allegato-3a" element={<Allegato3APageLazy />} />
                  <Route path="mdl/allegato-3b" element={<Allegato3BPageLazy />} />
                  <Route path="mdl/relazione-sanitaria" element={<RelazioneSanitariaAnnualePageLazy />} />

                  {/* TARIFFARI AZIENDE MDL (spostati da /management a /poliambulatorio/mdl) */}
                  <Route path="mdl/tariffari-aziende" element={<TariffariAziendeLazy />} />
                  <Route path="mdl/tariffari-aziende/nuovo" element={<TariffarioAziendaleFormLazy />} />
                  <Route path="mdl/tariffari-aziende/:id" element={<TariffarioAziendaleDetailsLazy />} />
                  <Route path="mdl/tariffari-aziende/:id/modifica" element={<TariffarioAziendaleFormLazy />} />

                  {/* IMPOSTAZIONI MODULE */}
                  <Route path="impostazioni" element={<ClinicaSettingsPageLazy />} />
                  <Route path="impostazioni/visit-templates" element={<VisitTemplatesPageLazy />} />
                  <Route path="impostazioni/visit-templates/:id" element={<VisitTemplateDetailPageLazy />} />
                  <Route path="impostazioni/modulistica" element={<ModulisticaPageLazy />} />
                  <Route path="impostazioni/modulistica/:id" element={<ModulisticaDetailPageLazy />} />
                  <Route path="impostazioni/firma" element={<FirmaSettingsPageLazy />} />
                  <Route path="impostazioni/bridge" element={<BridgeSettingsPageLazy />} />
                  <Route path="impostazioni/email-template" element={<EmailTemplateSettingsPageLazy />} />
                  <Route path="impostazioni/consensi-firma" element={<ConsensiPageLazy />} />

                  {/* App Desktop — accessibile direttamente da /poliambulatorio/impostazioni/desktop */}
                  <Route path="impostazioni/desktop" element={
                    <Suspense fallback={<LoadingFallback />}>
                      <DesktopLicensesTabLazy />
                    </Suspense>
                  } />

                  {/* P66 - SCADENZE CENTRALIZZATE */}
                  <Route path="scadenze" element={<ScadenzePageLazy />} />

                  {/* FATTURAZIONE (P97-P98) - Redirects → /management/billing (moved to Management) */}
                  <Route path="fatturazione" element={<Navigate to="/management/billing" replace />} />
                  <Route path="fatturazione/enti-emittenti" element={<Navigate to="/management/billing/enti-emittenti" replace />} />
                  <Route path="fatturazione/sistema-ts" element={<Navigate to="/management/billing/sistema-ts" replace />} />
                  <Route path="fatturazione/spese" element={<Navigate to="/management/billing/spese" replace />} />
                  <Route path="fatturazione/integrazioni" element={<Navigate to="/management/billing/integrazioni" replace />} />
                </Route>

                {/* /demo route removed - developer tool no longer needed */}
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BranchProvider>
    </ThemeProvider>
  );
}

export default App;