import React, { useEffect, Suspense, startTransition } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/layouts';
import { performanceMonitor } from './utils/performanceMonitor';
import { routePreloader } from './utils/routePreloader';
import { OptimizedHooksDemo } from './examples/OptimizedHooksDemo';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import { LoadingFallback } from './components/ui/LoadingFallback';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import RsppPage from './pages/public/RsppPage';
import MedicinaDelLavoroPage from './pages/public/MedicinaDelLavoroPage';

// Lazy-loaded page components
import DashboardLazy from './pages/Dashboard/Dashboard.lazy';
import CompaniesPageLazy from './pages/companies/CompaniesPage.lazy';
import CompanyDetails from './pages/companies/CompanyDetails';
import CompanyEdit from './pages/companies/CompanyEdit';
import CompanyCreate from './pages/companies/CompanyCreate';
import CoursesPageLazy from './pages/courses/CoursesPage.lazy';
import CourseDetails from './pages/courses/CourseDetails';
import CourseEdit from './pages/courses/CourseEdit';
import CourseCreate from './pages/courses/CourseCreate';
import PersonsPageLazy from './pages/persons/PersonsPage.lazy';
import EmployeesPageNewLazy from './pages/employees/EmployeesPageNew.lazy';
import EmployeeDetails from './pages/employees/EmployeeDetails';
import EmployeeEdit from './pages/employees/EmployeeEdit';
import EmployeeCreate from './pages/employees/EmployeeCreate';
import TrainersPageNewLazy from './pages/trainers/TrainersPageNew.lazy';
import SchedulesPageLazy from './pages/schedules/SchedulesPage.lazy';
import { SettingsLazy } from './pages/settings/Settings.lazy';
import TenantsPageLazy from './pages/tenants/TenantsPage.lazy';
import QuotesAndInvoicesLazy from './pages/QuotesAndInvoices.lazy';
import DocumentsCorsiLazy from './pages/DocumentsCorsi.lazy';
import GDPRDashboardLazy from './pages/GDPRDashboard.lazy';
import AdminGDPRLazy from './pages/AdminGDPR.lazy';
import UnifiedFormsPageLazy from './pages/forms/UnifiedFormsPage.lazy';
import { FormTemplateCreateLazy } from './pages/forms/FormTemplateCreate.lazy';
import { FormTemplateEditLazy } from './pages/forms/FormTemplateEdit.lazy';
import { FormTemplateViewLazy } from './pages/forms/FormTemplateView.lazy';

// Public pages
import HomePage from './pages/public/HomePage';
import CoursesPage from './pages/public/CoursesPage';
import CourseDetailPage from './pages/public/CourseDetailPage';
import UnifiedCourseDetailPage from './pages/public/UnifiedCourseDetailPage';
import ServicesPage from './pages/public/ServicesPage';
import ContactsPage from './pages/public/ContactsPage';
import WorkWithUsPage from './pages/public/WorkWithUsPage';
import PrivacyPage from './pages/public/PrivacyPage';
import CookiePage from './pages/public/CookiePage';
import TerminiPage from './pages/public/TerminiPage';
import PublicFormPage from './pages/public/PublicFormPage';

function App() {
  const location = useLocation();

  useEffect(() => {
    // Track route changes for performance monitoring with startTransition
    startTransition(() => {
      performanceMonitor.startRouteTracking(location.pathname);
    });
    
    // Preload high-priority routes on app start
    routePreloader.preloadByPriority('high');
    
    return () => {
      performanceMonitor.endRouteTracking(location.pathname);
    };
  }, [location.pathname]);

  useEffect(() => {
    // Preload medium-priority routes after initial load
    const timer = setTimeout(() => {
      startTransition(() => {
        routePreloader.preloadByPriority('medium');
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message="Loading application..." />}>
        <Routes>
        {/* Route pubbliche - Element Formazione */}
        <Route path="/" element={<HomePage />} />
        <Route path="/corsi" element={<CoursesPage />} />
        <Route path="/corsi/unified/:title" element={<UnifiedCourseDetailPage />} />
        <Route path="/corsi/:slug" element={<CourseDetailPage />} />
        <Route path="/servizi" element={<ServicesPage />} />
        <Route path="/rspp" element={<RsppPage />} />
        <Route path="/medicina-del-lavoro" element={<MedicinaDelLavoroPage />} />
        <Route path="/lavora-con-noi" element={<WorkWithUsPage />} />
        <Route path="/contatti" element={<ContactsPage />} />
        <Route path="/form/:id" element={<PublicFormPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cookie" element={<CookiePage />} />
        <Route path="/termini" element={<TerminiPage />} />
      {/* Rotta pubblica per il login */}
      <Route path="/login" element={<LoginPage />} />
      
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
                <CompanyCreate />
              </Layout>
            } />
          </Route>
          <Route path=":id" element={
            <Layout>
              <CompanyDetails />
            </Layout>
          } />
          <Route path=":id/edit" element={
            <Layout>
              <CompanyEdit />
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
                <CourseCreate />
              </Layout>
            } />
          </Route>
          <Route path=":id" element={
            <Layout>
              <CourseDetails />
            </Layout>
          } />
          <Route path=":id/edit" element={
            <Layout>
              <CourseEdit />
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
                <EmployeeCreate />
              </Layout>
            } />
          </Route>
          <Route path=":id" element={
            <Layout>
              <EmployeeDetails />
            </Layout>
          } />
          <Route path=":id/edit" element={
            <Layout>
              <EmployeeEdit />
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
                <EmployeeCreate />
              </Layout>
            } />
          </Route>
          <Route path=":id" element={
            <Layout>
              <EmployeeDetails />
            </Layout>
          } />
          <Route path=":id/edit" element={
            <Layout>
              <EmployeeEdit />
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
        </Route>
        <Route path="/schedules" element={
          <Layout>
            <SchedulesPageLazy />
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