import React, { useEffect, useRef, Suspense, startTransition } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Layout } from './components/layouts';
import { performanceMonitor } from './utils/performanceMonitor';
import ProtectedRoute from './components/shared/ProtectedRoute';
import { useRoleGuard } from './hooks/useRoleGuard';
import { LoadingFallback } from './components/ui/LoadingFallback';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { getCurrentBrand } from './config/brands.config';
import { BranchProvider } from './contexts/BranchContext';
import { ThemeProvider } from './context/ThemeContext';
import { trackStaticPage } from './services/cmsAnalyticsService';
// TenantModeProvider è ora in providers/index.tsx per sincronizzazione corretta con TenantFilterContext

// P60: Import dark mode CSS
import './styles/dark-mode.css';

const SearchPreservingRedirect: React.FC<{ to: string }> = ({ to }) => {
  const location = useLocation();
  return <Navigate to={`${to}${location.search || ''}`} replace />;
};

const SmartBackOriginTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const path = `${location.pathname}${location.search || ''}${location.hash || ''}`;
    if (!/\/poliambulatorio\/visite(?:-embedded)?\/[^/]+/.test(location.pathname)) {
      try {
        window.sessionStorage.setItem('element:smart-back:last-non-visit-path', path);
      } catch {
        // Storage non disponibile: la navigazione usa gli altri fallback.
      }
    }
  }, [location.hash, location.pathname, location.search]);

  return null;
};

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
import GoogleOAuthCallbackLazy from './pages/settings/templates/GoogleOAuthCallback.lazy';
// Finance
import QuotesAndInvoicesLazy from './pages/QuotesAndInvoices.lazy';
import { DocumentsCorsi as DocumentsCorsiLazy } from './pages/DocumentsCorsi.lazy';

// GDPR
// GDPR - pagine self-service (design-system), sostituiscono il vecchio GDPRDashboard
const GDPRConsentPageLazy = React.lazy(() => import('./pages/management/gdpr/GDPRConsentPage'));
const GDPRAuditPageLazy = React.lazy(() => import('./pages/management/gdpr/GDPRAuditPage'));
import AdminGDPRLazy from './pages/AdminGDPR.lazy';

// Project 43 - Management Page
// Lazy: removes management-specific code from main entry bundle → faster LCP for public pages
import { ManagementLazy } from './pages/management/Management.lazy';
const ManagementLayout = React.lazy(() => import('./components/layouts/ManagementLayout'));

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
// Lazy: removes clinicaApi.ts + layout code from main entry bundle → faster LCP for public pages
const ClinicaLayout = React.lazy(() => import('./components/layouts/ClinicaLayout'));
const ProfilePageLazy = React.lazy(() => import('./pages/profile/ProfilePage'));
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
  ImpostazioniNotifichePageLazy,
  ImpostazioniPrivacyPageLazy,
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

// Pagine pubbliche statiche (NO CMS API — SEO perfetto)
const HomePageStaticLazy = React.lazy(() => import('./pages/public/HomePageStatic'));
const MedicinaDelLavoroPageLazy = React.lazy(() => import('./pages/public/MedicinaDelLavoroPage'));
const RSPPStaticPageLazy = React.lazy(() => import('./pages/public/RSPPStaticPage'));
const ChiSiamoStaticPageLazy = React.lazy(() => import('./pages/public/ChiSiamoStaticPage'));
const ChiSiamoMedicaStaticPageLazy = React.lazy(() => import('./pages/public/ChiSiamoMedicaStaticPage'));
const ContattiStaticPageLazy = React.lazy(() => import('./pages/public/ContattiStaticPage'));
const DiagnosticaStaticPageLazy = React.lazy(() => import('./pages/public/DiagnosticaStaticPage'));
const VisiteSpecialistichePageLazy = React.lazy(() => import('./pages/public/VisiteSpecialistichePage'));
const PrivacyPolicyStaticPageLazy = React.lazy(() => import('./pages/public/PrivacyPolicyStaticPage'));
const CookiePolicyStaticPageLazy = React.lazy(() => import('./pages/public/CookiePolicyStaticPage'));
const TerminiStaticPageLazy = React.lazy(() => import('./pages/public/TerminiStaticPage'));
const LavoraConNoiStaticPageLazy = React.lazy(() => import('./pages/public/LavoraConNoiStaticPage'));

// Forgot Password
const ForgotPasswordPageLazy = React.lazy(() => import('./pages/auth/ForgotPasswordPage'));

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

// Component for brand-aware homepage (pagina statica — NO CMS API)
const BrandHomePage: React.FC = () => (
  <Suspense fallback={<LoadingFallback />}><HomePageStaticLazy /></Suspense>
);

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

const HideForBaseMedicoRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isMedico, isMedicoCompetente } = useRoleGuard();
  if (isMedico && !isMedicoCompetente) {
    return <Navigate to="/poliambulatorio/impostazioni" replace />;
  }
  return <>{children}</>;
};

// Mappa delle pagine statiche da tracciare (non gestite da CMSPageRenderer)
// Le pagine CMS (CMSPageLazy / /:slug) sono già tracciate automaticamente da CMSPageRenderer
const STATIC_PAGE_MAP: Record<string, { slug: string; title: string; brand?: 'medica' | 'sicurezza' }> = {
  '/': { slug: 'homepage', title: 'Homepage' },
  '/rspp': { slug: 'rspp', title: 'RSPP', brand: 'sicurezza' },
  '/medicina-del-lavoro': {
    slug: isElementMedica ? 'medica-medicina-del-lavoro' : 'medicina-del-lavoro',
    title: 'Medicina del Lavoro'
  },
  '/lavora-con-noi': { slug: 'lavora-con-noi', title: 'Lavora Con Noi' },
  '/carriere': { slug: 'carriere', title: 'Carriere' },
  '/contatti': { slug: 'contatti', title: 'Contatti' },
  '/privacy-policy': { slug: 'privacy-policy', title: 'Privacy Policy' },
  '/cookie-policy': { slug: 'cookie-policy', title: 'Cookie Policy' },
  '/termini': { slug: 'termini', title: 'Termini di Servizio' },
  '/diagnostica': { slug: 'diagnostica', title: 'Diagnostica', brand: 'medica' },
  '/prenota': { slug: 'prenota', title: 'Prenota', brand: 'medica' },
  '/chi-siamo': { slug: 'chi-siamo', title: 'Chi Siamo' },
  '/gruppo-servizi': { slug: 'gruppo-servizi', title: 'Gruppo Servizi' },
  '/corsi': { slug: 'corsi', title: 'Corsi di Sicurezza', brand: 'sicurezza' },
  '/medici': { slug: 'medici', title: 'Medici', brand: 'medica' },
};

function App() {
  const location = useLocation();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    // Track route changes for performance monitoring with startTransition
    startTransition(() => {
      performanceMonitor.startRouteTracking(location.pathname);
    });

    return () => {
      performanceMonitor.endRouteTracking(location.pathname);
    };
  }, [location.pathname]);

  // Track static page views (rispetta cookie consent analytics)
  useEffect(() => {
    const pathKey = location.pathname.replace(/\/+$/, '') || '/'; // rimuove trailing slash
    if (lastTrackedPath.current === pathKey) return;

    const page = STATIC_PAGE_MAP[pathKey];
    if (!page) return; // Pagina CMS o rotta privata — gestita da CMSPageRenderer o non tracciare

    // Brand check: non tracciare se la pagina è solo per certi brand
    if (page.brand === 'medica' && !isElementMedica) return;
    if (page.brand === 'sicurezza' && isElementMedica) return;

    // Rispetta il consenso cookie analytics
    try {
      const raw = localStorage.getItem('cookie-consent');
      if (raw) {
        const consent = JSON.parse(raw);
        if (consent.analytics === false) return;
      }
      // Se nessun consenso presente, il tracking avviene con sessionStorage (non cookie persistente)
    } catch { /* localStorage non disponibile — tracking ok */ }

    lastTrackedPath.current = pathKey;
    trackStaticPage(page.slug, page.title);
  }, [location.pathname]);

  return (
    <ThemeProvider>
      <BranchProvider>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback message="Loading application..." />}>
            <SmartBackOriginTracker />
            <Routes>
              {/* Route pubbliche - Gestite dal CMS per entrambi i brand */}
              {/* Homepage: CMS per entrambi i brand (slug mappato automaticamente) */}
              <Route path="/" element={<BrandHomePage />} />

              {/* Pagine CMS Element Sicurezza */}
              <Route path="/servizi" element={<CMSPageLazy />} />
              <Route path="/rspp" element={<Suspense fallback={<LoadingFallback />}><RSPPStaticPageLazy /></Suspense>} />
              <Route path="/medicina-del-lavoro" element={<Suspense fallback={<LoadingFallback />}><MedicinaDelLavoroPageLazy /></Suspense>} />
              <Route path="/lavora-con-noi" element={<Suspense fallback={<LoadingFallback />}><LavoraConNoiStaticPageLazy /></Suspense>} />
              <Route path="/carriere" element={<Suspense fallback={<LoadingFallback />}><LavoraConNoiStaticPageLazy /></Suspense>} />
              <Route path="/contatti" element={<Suspense fallback={<LoadingFallback />}><ContattiStaticPageLazy /></Suspense>} />
              <Route path="/privacy-policy" element={<Suspense fallback={<LoadingFallback />}><PrivacyPolicyStaticPageLazy /></Suspense>} />
              <Route path="/cookie-policy" element={<Suspense fallback={<LoadingFallback />}><CookiePolicyStaticPageLazy /></Suspense>} />
              <Route path="/termini" element={<Suspense fallback={<LoadingFallback />}><TerminiStaticPageLazy /></Suspense>} />

              {/* Pagine CMS Element Medica */}
              <Route path="/diagnostica" element={isElementMedica ? <Suspense fallback={<LoadingFallback />}><DiagnosticaStaticPageLazy /></Suspense> : <CMSPageLazy />} />
              <Route path="/visite-specialistiche" element={isElementMedica ? <Suspense fallback={<LoadingFallback />}><VisiteSpecialistichePageLazy /></Suspense> : <CMSPageLazy />} />
              <Route path="/prenota" element={<Suspense fallback={<LoadingFallback />}><PrenotaPageLazy /></Suspense>} />
              <Route path="/chi-siamo" element={isElementMedica ? <Suspense fallback={<LoadingFallback />}><ChiSiamoMedicaStaticPageLazy /></Suspense> : <Suspense fallback={<LoadingFallback />}><ChiSiamoStaticPageLazy /></Suspense>} />
              <Route path="/gruppo-servizi" element={<Suspense fallback={<LoadingFallback />}><GruppoServiziPageLazy /></Suspense>} />

              {/* Corsi: solo per Element Sicurezza — Element Medica non ha la pagina corsi */}
              <Route path="/corsi" element={isElementMedica ? <Navigate to="/" replace /> : <CoursesPagePublicLazy />} />
              <Route path="/corsi/unified/:title" element={isElementMedica ? <Navigate to="/" replace /> : <UnifiedCourseDetailPageLazy />} />
              <Route path="/corsi/:slug" element={isElementMedica ? <Navigate to="/" replace /> : <CourseDetailPageLazy />} />

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

              {/* Recupero password */}
              <Route path="/forgot-password" element={<Suspense fallback={<LoadingFallback />}><ForgotPasswordPageLazy /></Suspense>} />

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
                <Route path="/clinica/mdl/scadenze" element={<SearchPreservingRedirect to="/poliambulatorio/mdl/scadenze" />} />
                {/* Profilo utente - Layout generico (ElementSicurezza, Management e tutti i brand) */}
                <Route path="/profile" element={
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <ProfilePageLazy />
                    </Suspense>
                  </Layout>
                } />
                {/* Project 43 - Management Page with dedicated Layout */}
                <Route path="/management/*" element={
                  <ManagementLayout>
                    <ManagementLazy />
                  </ManagementLayout>
                } />
                <Route path="/tenants" element={<Navigate to="/management/tenants" replace />} />
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
                    <GDPRConsentPageLazy />
                  </Layout>
                } />
                <Route path="/gdpr/audit" element={
                  <Layout>
                    <GDPRAuditPageLazy />
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

                {/* Movimenti Contabili - Redirect to Management */}
                <Route path="/movimenti-contabili" element={<Navigate to="/management/movimenti-contabili" replace />} />
                <Route path="/movimenti-contabili/*" element={<Navigate to="/management/movimenti-contabili" replace />} />

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
                  <Route path="nuovo" element={
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

                <Route path="/poliambulatorio/visite-embedded/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <VisitaPageLazy />
                  </Suspense>
                } />

                {/* Main Poliambulatorio Routes with ClinicaLayout */}
                <Route path="/poliambulatorio" element={<ClinicaLayout />}>
                  {/* Dashboard - redirect to /agenda (consolidated dashboard) */}
                  <Route index element={<Navigate to="/poliambulatorio/agenda" replace />} />

                  {/* STRUTTURA MODULE */}
                  <Route path="struttura" element={<ProtectedRoute resource="clinica.poliambulatorio" action="manage"><StrutturaDashboardLazy /></ProtectedRoute>} />
                  {/* Legacy redirect: /struttura/poliambulatori -> /poliambulatori */}
                  <Route path="struttura/poliambulatori" element={<Navigate to="/poliambulatorio/poliambulatori" replace />} />
                  <Route path="struttura/poliambulatori/*" element={<Navigate to="/poliambulatorio/poliambulatori" replace />} />
                  <Route path="poliambulatori" element={<ProtectedRoute resource="clinica.poliambulatorio" action="manage"><PoliambulatoriPageLazy /></ProtectedRoute>} />
                  <Route path="poliambulatori/nuovo" element={<ProtectedRoute resource="clinica.poliambulatorio" action="manage"><PoliambulatorioFormLazy /></ProtectedRoute>} />
                  <Route path="poliambulatori/:id" element={<ProtectedRoute resource="clinica.poliambulatorio" action="manage"><PoliambulatorioDetailPageLazy /></ProtectedRoute>} />
                  <Route path="poliambulatori/:id/modifica" element={<ProtectedRoute resource="clinica.poliambulatorio" action="manage"><PoliambulatorioFormLazy /></ProtectedRoute>} />
                  <Route path="ambulatori" element={<ProtectedRoute resource="clinica.ambulatori" action="manage"><AmbulatoriPageLazy /></ProtectedRoute>} />
                  <Route path="ambulatori/nuovo" element={<ProtectedRoute resource="clinica.ambulatori" action="manage"><AmbulatorioFormLazy /></ProtectedRoute>} />
                  <Route path="ambulatori/:id" element={<ProtectedRoute resource="clinica.ambulatori" action="manage"><AmbulatorioDetailPageLazy /></ProtectedRoute>} />
                  <Route path="ambulatori/:id/modifica" element={<ProtectedRoute resource="clinica.ambulatori" action="manage"><AmbulatorioFormLazy /></ProtectedRoute>} />
                  <Route path="strumenti" element={<ProtectedRoute resource="clinica.strumenti" action="manage"><StrumentiPageLazy /></ProtectedRoute>} />
                  <Route path="strumenti/nuovo" element={<ProtectedRoute resource="clinica.strumenti" action="manage"><StrumentoFormLazy /></ProtectedRoute>} />
                  <Route path="strumenti/:id" element={<ProtectedRoute resource="clinica.strumenti" action="manage"><StrumentoDetailPageLazy /></ProtectedRoute>} />
                  <Route path="strumenti/:id/modifica" element={<ProtectedRoute resource="clinica.strumenti" action="manage"><StrumentoFormLazy /></ProtectedRoute>} />
                  <Route path="strumenti/:id/manutenzione" element={<ProtectedRoute resource="clinica.strumenti" action="manage"><ManutenzioneFormLazy /></ProtectedRoute>} />
                  <Route path="sedi" element={<ProtectedRoute resource="clinica.sedi" action="manage"><SediPageLazy /></ProtectedRoute>} />
                  <Route path="sedi/nuovo" element={<ProtectedRoute resource="clinica.sedi" action="manage"><SedeFormLazy /></ProtectedRoute>} />
                  <Route path="sedi/:id" element={<ProtectedRoute resource="clinica.sedi" action="manage"><SedeDetailPageLazy /></ProtectedRoute>} />
                  <Route path="sedi/:id/modifica" element={<ProtectedRoute resource="clinica.sedi" action="manage"><SedeFormLazy /></ProtectedRoute>} />

                  {/* CATALOGO MODULE */}
                  <Route path="catalogo" element={<ProtectedRoute resource="clinica.prestazioni" action="manage"><CatalogoDashboardLazy /></ProtectedRoute>} />
                  <Route path="catalogo/prestazioni" element={<ProtectedRoute resource="clinica.prestazioni" action="manage"><PrestazioniPageLazy /></ProtectedRoute>} />
                  <Route path="catalogo/prestazioni/nuovo" element={<ProtectedRoute resource="clinica.prestazioni" action="manage"><PrestazioneFormLazy /></ProtectedRoute>} />
                  <Route path="catalogo/prestazioni/:id" element={<ProtectedRoute resource="clinica.prestazioni" action="manage"><PrestazioneDetailPageLazy /></ProtectedRoute>} />
                  <Route path="catalogo/prestazioni/:id/modifica" element={<ProtectedRoute resource="clinica.prestazioni" action="manage"><PrestazioneFormLazy /></ProtectedRoute>} />
                  <Route path="catalogo/prestazioni/:id/template" element={<ProtectedRoute resource="clinica.prestazioni" action="manage"><TemplateCampiBuilderLazy /></ProtectedRoute>} />

                  {/* Convenzioni routes - under catalogo */}
                  <Route path="catalogo/convenzioni" element={<ProtectedRoute resource="clinica.convenzioni" action="manage"><ConvenzioniPageLazy /></ProtectedRoute>} />
                  <Route path="catalogo/convenzioni/nuovo" element={<ProtectedRoute resource="clinica.convenzioni" action="manage"><ConvenzioneFormLazy /></ProtectedRoute>} />
                  <Route path="catalogo/convenzioni/:id" element={<ProtectedRoute resource="clinica.convenzioni" action="manage"><ConvenzioneFormLazy /></ProtectedRoute>} />
                  <Route path="catalogo/convenzioni/:id/modifica" element={<ProtectedRoute resource="clinica.convenzioni" action="manage"><ConvenzioneFormLazy /></ProtectedRoute>} />

                  {/* Bundles/Offerte */}
                  <Route path="catalogo/bundles" element={<ProtectedRoute resource="clinica.offerte_bundle" action="manage"><OfferteBundlePageLazy /></ProtectedRoute>} />
                  <Route path="catalogo/bundles/nuovo" element={<ProtectedRoute resource="clinica.offerte_bundle" action="manage"><OffertaBundleFormLazy /></ProtectedRoute>} />
                  <Route path="catalogo/bundles/:id" element={<ProtectedRoute resource="clinica.offerte_bundle" action="manage"><OffertaBundleDetailPageLazy /></ProtectedRoute>} />
                  <Route path="catalogo/bundles/:id/modifica" element={<ProtectedRoute resource="clinica.offerte_bundle" action="manage"><OffertaBundleFormLazy /></ProtectedRoute>} />

                  {/* AGENDA MODULE */}
                  <Route path="agenda" element={<AgendaDashboardLazy />} />
                  <Route path="agenda/nuovo" element={<AppuntamentoFormLazy />} />
                  <Route path="agenda/calendario" element={<CalendarioPageLazy />} />
                  <Route path="agenda/accettazione" element={<Navigate to="/poliambulatorio/appuntamenti" replace />} />
                  <Route path="agenda/disponibilita" element={<DisponibilitaPageLazy />} />
                  <Route path="agenda/disponibilita/:medicoId" element={<DisponibilitaPageLazy />} />
                  <Route path="agenda/appuntamenti/nuovo" element={<AppuntamentoFormLazy />} />
                  <Route path="agenda/appuntamenti/:id/modifica" element={<AppuntamentoFormLazy />} />
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
                  <Route path="struttura/monitors" element={<ProtectedRoute resource="clinica.poliambulatorio" action="manage"><QueueMonitorsPageLazy /></ProtectedRoute>} />

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
                  <Route path="mdl/aziende" element={<CompaniesPageLazy />} />
                  <Route path="mdl/aziende/create" element={<CompanyCreateLazy />} />
                  <Route path="mdl/aziende/:id" element={<CompanyDetailsLazy />} />
                  <Route path="mdl/aziende/:id/edit" element={<CompanyEditLazy />} />
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
                  <Route path="impostazioni/consensi-firma" element={
                    <HideForBaseMedicoRoute>
                      <ConsensiPageLazy />
                    </HideForBaseMedicoRoute>
                  } />
                  <Route path="impostazioni/notifiche" element={<ImpostazioniNotifichePageLazy />} />
                  <Route path="impostazioni/privacy" element={<ImpostazioniPrivacyPageLazy />} />

                  {/* App Desktop — accessibile direttamente da /poliambulatorio/impostazioni/desktop */}
                  <Route path="impostazioni/desktop" element={
                    <Suspense fallback={<LoadingFallback />}>
                      <DesktopLicensesTabLazy />
                    </Suspense>
                  } />

                  {/* Profilo utente — accessibile in ClinicaLayout con tema teal */}
                  <Route path="profilo" element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ProfilePageLazy />
                    </Suspense>
                  } />

                  {/* P66 - SCADENZE CENTRALIZZATE */}
                  <Route path="scadenze" element={<ProtectedRoute resource="scadenze" action="manage"><ScadenzePageLazy /></ProtectedRoute>} />

                  {/* OT23 accessibile anche dentro ClinicaLayout (medica) - stesse pagine, layout corretto */}
                  <Route path="sicurezza/ot23" element={
                    <Suspense fallback={<LoadingFallback />}>
                      <OT23PageLazy />
                    </Suspense>
                  } />
                  <Route path="sicurezza/ot23/nuovo" element={
                    <Suspense fallback={<LoadingFallback />}>
                      <OT23PageLazy />
                    </Suspense>
                  } />
                  <Route path="sicurezza/ot23/:id" element={
                    <Suspense fallback={<LoadingFallback />}>
                      <OT23DetailPageLazy />
                    </Suspense>
                  } />

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
