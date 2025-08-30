import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';
import { usePermissions } from '../auth/usePermissions';

/**
 * Hook ottimizzato per la navigazione
 * Fornisce utility per navigazione sicura e controllo permessi
 */
export const useNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const permissions = usePermissions();

  // Funzioni di navigazione memoizzate
  const navigationActions = useMemo(() => ({
    // Navigazione base
    goTo: (path: string, options?: { replace?: boolean; state?: unknown }) => {
      navigate(path, options);
    },
    
    goBack: () => navigate(-1),
    goForward: () => navigate(1),
    
    // Navigazione verso sezioni specifiche
    goToCompanies: () => navigate('/companies'),
    goToCompany: (id: string) => navigate(`/companies/${id}`),
    goToNewCompany: () => navigate('/companies/new'),
    
    goToCourses: () => navigate('/courses'),
    goToCourse: (id: string) => navigate(`/courses/${id}`),
    goToNewCourse: () => navigate('/courses/new'),
    
    goToTrainers: () => navigate('/trainers'),
    goToTrainer: (id: string) => navigate(`/trainers/${id}`),
    goToNewTrainer: () => navigate('/trainers/new'),
    
    goToEmployees: () => navigate('/employees'),
    goToEmployee: (id: string) => navigate(`/employees/${id}`),
    goToNewEmployee: () => navigate('/employees/new'),
    
    goToSchedules: () => navigate('/schedules'),
    goToSchedule: (id: string) => navigate(`/schedules/${id}`),
    goToNewSchedule: () => navigate('/schedules/new'),
    
    goToSettings: () => navigate('/settings'),
    goToQuotes: () => navigate('/quotes'),
    goToInvoices: () => navigate('/invoices'),
    goToDocuments: () => navigate('/documents'),
    
    // Navigazione con controllo permessi
    goToWithPermission: (path: string, requiredPermission: string, action: string = 'read') => {
      if (permissions.hasPermission(requiredPermission, action)) {
        navigate(path);
      } else {
        // Redirect a pagina di errore o mostra messaggio
        navigate('/unauthorized');
      }
    },
    
    // Navigazione condizionale
    goToIfAllowed: (path: string, condition: boolean, fallbackPath?: string) => {
      if (condition) {
        navigate(path);
      } else if (fallbackPath) {
        navigate(fallbackPath);
      }
    },
    
  }), [navigate, permissions]);

  // Utility per la location corrente
  const locationUtils = useMemo(() => ({
    // Informazioni sulla route corrente
    currentPath: location.pathname,
    currentSearch: location.search,
    currentHash: location.hash,
    currentState: location.state,
    
    // Controlli sulla route
    isOnPath: (path: string) => location.pathname === path,
    isOnPathPattern: (pattern: RegExp) => pattern.test(location.pathname),
    
    // Controlli per sezioni specifiche
    isOnCompanies: () => location.pathname.startsWith('/companies'),
    isOnCourses: () => location.pathname.startsWith('/courses'),
    isOnTrainers: () => location.pathname.startsWith('/trainers'),
    isOnEmployees: () => location.pathname.startsWith('/employees'),
    isOnSchedules: () => location.pathname.startsWith('/schedules'),
    isOnSettings: () => location.pathname.startsWith('/settings'),
    
    // Utility per query parameters
    getSearchParam: (key: string) => {
      const searchParams = new URLSearchParams(location.search);
      return searchParams.get(key);
    },
    
    getAllSearchParams: () => {
      const searchParams = new URLSearchParams(location.search);
      const params: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
      return params;
    },
    
    // Utility per costruire URL
    buildUrl: (path: string, searchParams?: Record<string, string>) => {
      const url = new URL(path, window.location.origin);
      if (searchParams) {
        Object.entries(searchParams).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });
      }
      return url.pathname + url.search;
    },
    
  }), [location]);

  // Utility per i parametri della route
  const paramsUtils = useMemo(() => ({
    params,
    
    // Getter tipizzati per parametri comuni
    getId: () => params.id,
    getCompanyId: () => params.companyId,
    getCourseId: () => params.courseId,
    getTrainerId: () => params.trainerId,
    getEmployeeId: () => params.employeeId,
    getScheduleId: () => params.scheduleId,
    
    // Controlli sui parametri
    hasId: () => !!params.id,
    hasParam: (key: string) => !!params[key],
    
  }), [params]);

  return {
    ...navigationActions,
    location: locationUtils,
    params: paramsUtils,
    
    // Funzioni di utilità avanzate
    refresh: useCallback(() => {
      navigate(location.pathname + location.search, { replace: true });
    }, [navigate, location]),
    
    replaceCurrentUrl: useCallback((newPath: string) => {
      navigate(newPath, { replace: true });
    }, [navigate]),
  };
};

export default useNavigation;