import React, { useEffect, Suspense, startTransition } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/layouts';
import { performanceMonitor } from './utils/performanceMonitor';
import { routePreloader } from './utils/routePreloader';
import { OptimizedHooksDemo } from './examples/OptimizedHooksDemo';
import ProtectedRoute from './components/shared/ProtectedRoute';
import { LoadingFallback } from './components/ui/LoadingFallback';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// === PHASE 4.2b: ALL ROUTES LAZY LOADED ===

// Auth
import LoginPageLazy from './pages/auth/LoginPage.lazy';

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
import { TrainerDetailsLazy, TrainerEditLazy } from './pages/trainers/index.lazy';

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

// Finance
import QuotesAndInvoicesLazy from './pages/QuotesAndInvoices.lazy';
import CodiciScontoPageLazy from './pages/finance/CodiciScontoPage.lazy';
import PreventiviPageLazy from './pages/finance/PreventiviPage.lazy';
import DocumentsCorsiLazy from './pages/DocumentsCorsi.lazy';

// GDPR
import GDPRDashboardLazy from './pages/GDPRDashboard.lazy';
import AdminGDPRLazy from './pages/AdminGDPR.lazy';

// Forms
import UnifiedFormsPageLazy from './pages/forms/UnifiedFormsPage.lazy';
import { FormTemplateCreateLazy } from './pages/forms/FormTemplateCreate.lazy';
import { FormTemplateEditLazy } from './pages/forms/FormTemplateEdit.lazy';
import { FormTemplateViewLazy } from './pages/forms/FormTemplateView.lazy';

// Public Pages - All lazy loaded for better initial bundle
import {
  HomePageLazy,
  CoursesPagePublicLazy,
  CourseDetailPageLazy,
  UnifiedCourseDetailPageLazy,
  ServicesPageLazy,
  ContactsPageLazy,
  WorkWithUsPageLazy,
  PrivacyPageLazy,
  CookiePageLazy,
  TerminiPageLazy,
  PublicFormPageLazy,
  RsppPageLazy,
  MedicinaDelLavoroPageLazy,
} from './pages/public/index.lazy';

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
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message="Loading application..." />}>
        <Routes>
        {/* Route pubbliche - Element Formazione */}
        <Route path="/" element={<HomePageLazy />} />
        <Route path="/corsi" element={<CoursesPagePublicLazy />} />
        <Route path="/corsi/unified/:title" element={<UnifiedCourseDetailPageLazy />} />
        <Route path="/corsi/:slug" element={<CourseDetailPageLazy />} />
        <Route path="/servizi" element={<ServicesPageLazy />} />
        <Route path="/rspp" element={<RsppPageLazy />} />
        <Route path="/medicina-del-lavoro" element={<MedicinaDelLavoroPageLazy />} />
        <Route path="/lavora-con-noi" element={<WorkWithUsPageLazy />} />
        <Route path="/contatti" element={<ContactsPageLazy />} />
        <Route path="/form/:id" element={<PublicFormPageLazy />} />
        <Route path="/privacy" element={<PrivacyPageLazy />} />
        <Route path="/cookie" element={<CookiePageLazy />} />
        <Route path="/termini" element={<TerminiPageLazy />} />
      {/* Rotta pubblica per il login */}
      <Route path="/login" element={<LoginPageLazy />} />
      {/* Rotta di auto-login in dev */}
            {/* DevLogin rimosso: nessuna rotta di bypass */}
      
      {/* Rotte protette - Area Riservata */}
       <Route element={<ProtectedRoute />}>
         <Route path="/dashboard" element={<ProtectedRoute resource="dashboard" action="read" />}>
           <Route index element={
             <Layout>
               <DashboardLazy />
             </Layout>
           } />
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
        <Route path="/persons" element={
          <ProtectedRoute resource="persons" action="read" />
        }>
          <Route index element={
            <Layout>
              <PersonsPageLazy />
            </Layout>
          } />
          <Route path="create" element={
            <ProtectedRoute resource="persons" action="create" />
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
              <TrainerDetailsLazy />
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
        <Route path="/documents">
          <Route index element={
            <Layout>
              <DocumentListPageLazy />
            </Layout>
          } />
          <Route path="batches" element={
            <Layout>
              <BatchMonitoringPageLazy />
            </Layout>
          } />
        </Route>
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
        <Route path="/admin/finance/codici-sconto" element={
          <Layout>
            <CodiciScontoPageLazy />
          </Layout>
        } />
        <Route path="/admin/finance/preventivi" element={
          <Layout>
            <PreventiviPageLazy />
          </Layout>
        } />
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
        </Route>
        <Route path="/demo" element={
          <Layout>
            <OptimizedHooksDemo />
          </Layout>
        } />
      </Route>
      </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;