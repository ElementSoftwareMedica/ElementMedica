import React, { useEffect, Suspense, startTransition } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { performanceMonitor } from './utils/performanceMonitor';
import { routePreloader } from './utils/routePreloader';
import { OptimizedHooksDemo } from './components/examples/OptimizedHooksDemo';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import { LoadingFallback } from './components/ui/LoadingFallback';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Lazy-loaded page components
import DashboardLazy from './pages/Dashboard/Dashboard.lazy';
import CompaniesPageLazy from './pages/companies/CompaniesPage.lazy';
import CompanyDetails from './pages/companies/CompanyDetails';
import CompanyEdit from './pages/companies/CompanyEdit';
import CoursesPageLazy from './pages/courses/CoursesPage.lazy';
import PersonsPageLazy from './pages/persons/PersonsPage.lazy';
import EmployeesPageNewLazy from './pages/employees/EmployeesPageNew.lazy';
import TrainersPageNewLazy from './pages/trainers/TrainersPageNew.lazy';
import SchedulesPageLazy from './pages/schedules/SchedulesPage.lazy';
import SettingsLazy from './pages/settings/Settings.lazy';
import TenantsPageLazy from './pages/tenants/TenantsPage.lazy';
import QuotesAndInvoicesLazy from './pages/QuotesAndInvoices.lazy';
import DocumentsCorsiLazy from './pages/DocumentsCorsi.lazy';
import GDPRDashboardLazy from './pages/GDPRDashboard.lazy';
import AdminGDPRLazy from './pages/AdminGDPR.lazy';

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
      {/* Rotta pubblica per il login */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Rotte protette */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={
          <Layout>
            <DashboardLazy />
          </Layout>
        } />
        <Route path="/companies" element={
          <ProtectedRoute resource="companies" action="read" />
        }>
          <Route index element={
            <Layout>
              <CompaniesPageLazy />
            </Layout>
          } />
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
        </Route>
        <Route path="/persons" element={
          <ProtectedRoute resource="persons" action="read" />
        }>
          <Route index element={
            <Layout>
              <PersonsPageLazy />
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