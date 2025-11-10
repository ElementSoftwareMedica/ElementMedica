import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useTenant } from '../../../context/TenantContext';
import { logGdprAction, checkConsent } from '../../../utils/gdpr';
import { dummyData } from '../../../data/dummyData';
import type { Course } from '../../../types';
import { getTrainers } from '../../../services/trainers';
import { getCompanies } from '../../../services/companies';
import { getPersons } from '../../../services/persons';

export interface DashboardCounters {
  companies: number;
  employees: number;
}

export interface DashboardData {
  courses: Course[];
  trainers: DashboardTrainer[];
  companies: DashboardCompany[];
  employees: DashboardEmployee[];
  schedules: DashboardSchedule[];
}

export interface DashboardTrainer {
  id: string;
  firstName: string;
  lastName: string;
}

export interface DashboardCompany {
  id: string;
  name: string;
  employeeCount?: number;
  ragioneSociale: string;
  sector?: string;
}

export interface DashboardEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyId?: string;
  company?: DashboardCompany;
}

export interface DashboardSchedule {
  id: string;
  courseId: string;
  course?: Course;
  startDate: string;
  endDate: string;
  location?: string;
  trainerId?: string;
  trainer?: DashboardTrainer;
  maxParticipants?: number;
  companies?: Array<{ company: DashboardCompany }>;
  enrollments?: Array<{ employee: DashboardEmployee }>;
  sessions?: Array<{
    id: string;
    date: string;
    start: string;
    end: string;
    trainer?: DashboardTrainer;
  }>;
}

export const useDashboardData = () => {
  const { tenant } = useTenant();
  const { hasPermission } = useAuth();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [trainers, setTrainers] = useState<DashboardTrainer[]>([]);
  const [companies, setCompanies] = useState<DashboardCompany[]>([]);
  const [employees, setEmployees] = useState<DashboardEmployee[]>([]);
  const [schedules, setSchedules] = useState<DashboardSchedule[]>([]);
  const [counters, setCounters] = useState<DashboardCounters>({ companies: 0, employees: 0 });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'api' | 'fallback'>('api');
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadFallbackData = useCallback(async () => {
    console.log('📦 Loading fallback data...');
    
    try {
      const dummyDataTyped = dummyData as {
        employees?: DashboardEmployee[];
        companies?: DashboardCompany[];
        courses?: Course[];
        schedules?: DashboardSchedule[];
      };
      
      const transformedTrainers = (dummyDataTyped.employees || []).map((e) => ({
        id: e.id,
        firstName: e.firstName || '',
        lastName: e.lastName || ''
      }));
      
      const transformedCompanies = (dummyDataTyped.companies || []).map((c) => ({
        ...c,
        ragioneSociale: c.name || '',
        employeeCount: (dummyDataTyped.employees || []).filter((e) => 
          e.companyId === c.id
        ).length,
        sector: c.sector || ''
      }));
      
      if (mountedRef.current) {
        setCourses(dummyDataTyped.courses || []);
        setTrainers(transformedTrainers);
        setCompanies(transformedCompanies);
        setEmployees(dummyDataTyped.employees || []);
        setSchedules(dummyDataTyped.schedules || []);
        setCounters({
          companies: transformedCompanies.length,
          employees: (dummyDataTyped.employees || []).length
        });
        setDataSource('fallback');
      }
      
      logGdprAction(
        tenant?.id || 'unknown',
        'DASHBOARD_FALLBACK_DATA_LOADED',
        'dashboard',
        'read',
        {
          reason: 'API error or missing GDPR consent'
        }
      );
      
    } catch (error) {
      console.error('Failed to load fallback data:', error);
    }
  }, [tenant?.id]);

  const fetchData = useCallback(async () => {
    if (fetchingRef.current || !mountedRef.current) return;
    
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      // Check permissions
      const hasDashboardAccess = hasPermission && (
        hasPermission('dashboard', 'read') || 
        hasPermission('dashboard', 'view') || 
        hasPermission('companies', 'read') ||
        hasPermission('schedules', 'read')
      );
      
      if (!hasDashboardAccess) {
        throw new Error('Permessi insufficienti per accedere al dashboard');
      }
      
      // Fetch counters
      const countersData = await apiGet<DashboardCounters>('/api/counters');
      
      // Fetch all data including companies and persons like SchedulesPage does
      const [coursesData, trainersData, schedulesData, companiesData, personsData] = await Promise.allSettled([
        apiGet('/courses').catch(() => []),
        getTrainers().catch(() => []),
        apiGet('/api/v1/schedules').catch(() => []),
        getCompanies().catch(() => []),
        getPersons({ limit: 1000, page: 1 }).catch(() => ({ persons: [] }))
      ]);
      
      const coursesResult = coursesData.status === 'fulfilled' ? (coursesData.value as Course[]) : [];
      const trainersResult = trainersData.status === 'fulfilled' ? (trainersData.value as DashboardTrainer[]) : [];
      const schedulesResult = schedulesData.status === 'fulfilled' ? (schedulesData.value as DashboardSchedule[]) : [];
      const companiesResult = companiesData.status === 'fulfilled' ? (companiesData.value as DashboardCompany[]) : [];
      const personsResult = personsData.status === 'fulfilled' ? 
        ((personsData.value as any)?.persons ?? personsData.value) as DashboardEmployee[] : [];
      
      // Transform trainers data
      const transformedTrainers = trainersResult.map((trainer) => ({
        id: trainer.id,
        firstName: trainer.firstName || '',
        lastName: trainer.lastName || ''
      }));
      
      // Transform companies data to match expected format
      const transformedCompanies = companiesResult.map((company: any) => ({
        id: company.id,
        name: company.name || company.ragioneSociale || '',
        ragioneSociale: company.ragioneSociale || company.name || '',
        employeeCount: company.employeeCount || 0,
        sector: company.sector || ''
      }));
      
      if (mountedRef.current) {
        setCourses(coursesResult);
        setTrainers(transformedTrainers);
        setCompanies(transformedCompanies);
        setEmployees(personsResult);
        setSchedules(schedulesResult);
        setCounters(countersData);
        setDataSource('api');
      }
      
      logGdprAction(
        tenant?.id || 'unknown',
        'DASHBOARD_DATA_LOADED',
        'dashboard',
        'read',
        {
          dataSource: 'api',
          recordCounts: {
            courses: coursesResult.length,
            trainers: transformedTrainers.length,
            companies: transformedCompanies.length,
            employees: personsResult.length,
            schedules: schedulesResult.length
          }
        }
      );
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Errore di connessione al server';
      
      logGdprAction(
        tenant?.id || 'unknown',
        'DASHBOARD_DATA_ERROR',
        'dashboard',
        'read',
        {
          errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
        },
        false,
        errorMessage
      );
      
      if (mountedRef.current) {
        setError(errorMessage);
        await loadFallbackData();
      }
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [tenant?.id, hasPermission, loadFallbackData]);

  // Initial data load
  useEffect(() => {
    if (mountedRef.current) {
      fetchData();
    }
  }, [fetchData]);

  return {
    courses,
    trainers,
    companies,
    employees,
    schedules,
    counters,
    loading,
    error,
    dataSource,
    data: {
      courses,
      trainers,
      companies,
      employees,
      schedules
    } as DashboardData,
    refreshData: fetchData
  };
};