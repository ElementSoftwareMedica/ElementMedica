import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AlertTriangle,
  Building2,
  Calendar,
  GraduationCap,
  TrendingUp,
  Users
} from 'lucide-react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { dummyData } from '../data/dummyData';
import StatCard from '../components/dashboard/StatCard';
import ScheduleCalendar, { ScheduleEvent } from '../components/dashboard/ScheduleCalendar';
import ScheduleEventModalLazy from '../components/schedules/ScheduleEventModal.lazy';
import { useNavigate } from 'react-router-dom';
import { apiGet} from '../services/api';
import { getToken } from '../services/auth';
import { Company, Employee, Course } from '../types';
import { checkConsent as checkGdprConsent, logGdprAction, ConsentRequiredError } from '../utils/gdpr';
import { recordApiCall, startTimer } from '../utils/metrics';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

// Interfaccia estesa per la dashboard che include campi aggiuntivi
interface DashboardCompany extends Partial<Company> {
  id: string;
  name: string;
  employeeCount?: number;
  ragioneSociale: string; // Campo obbligatorio per compatibilità con ScheduleEventModal
  sector?: string;
}

interface DashboardTrainer {
  id: string;
  firstName: string; // Campo obbligatorio per compatibilità con ScheduleEventModal
  lastName: string; // Campo obbligatorio per compatibilità con ScheduleEventModal
}

// Interfacce per i dati
interface DashboardEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyId?: string;
  company?: DashboardCompany;
}

interface DashboardSchedule {
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

interface DummyData {
  companies: DashboardCompany[];
  employees: DashboardEmployee[];
  courses: Course[];
  schedules?: DashboardSchedule[];
}

interface FetchOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
}

// Register ChartJS components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Funzione helper per combinare data e ora in modo robusto
function combineDateAndTime(dateStr: string, timeStr: string) {
  const [year, month, day] = dateStr.split('T')[0].split('-');
  const [hour, minute] = timeStr.split(':');
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );
}

const Dashboard: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date; isAllDay?: boolean } | null>(null);
  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [trainersList, setTrainersList] = useState<DashboardTrainer[]>([]);
  const [companiesList, setCompaniesList] = useState<DashboardCompany[]>([]);
  const [employeesList, setEmployeesList] = useState<DashboardEmployee[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<ScheduleEvent[]>([]);
  const [schedulesData, setSchedulesData] = useState<DashboardSchedule[]>([]); // per rimappare quando cambia vista
  const [calendarView, setCalendarView] = useState('month');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gdprConsent, setGdprConsent] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<'api' | 'fallback'>('api');
  const [counters, setCounters] = useState({ companies: 0, employees: 0 });
  
  const navigate = useNavigate();
  const { user, isAuthenticated, hasPermission } = useAuth();
  
  // Uso condizionale di useTenant per evitare errori durante l'inizializzazione
  let tenant = null;
  
  try {
    const tenantContext = useTenant();
    tenant = tenantContext.tenant;
  } catch (error) {
    console.warn('TenantContext not yet initialized, using fallback values');
  }
  
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // GDPR Consent Check
  const checkDashboardConsent = useCallback(async () => {
    try {
      const hasConsent = await checkGdprConsent('dashboard_data');
    setGdprConsent(hasConsent);
    
    if (!hasConsent) {
        await logGdprAction({
          action: 'DASHBOARD_ACCESS_DENIED',
          timestamp: new Date().toISOString(),
          tenantId: tenant?.id,
          metadata: {
            reason: 'Missing consent for dashboard data access'
          }
        });
        
        setError('Accesso ai dati del dashboard richiede il consenso GDPR');
        setDataSource('fallback');
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('GDPR consent check failed, using fallback data:', error);
      setGdprConsent(false);
      setDataSource('fallback');
      return false;
    }
  }, [tenant?.id]);

  // Enhanced fetch function with timeout and retry
  const fetchWithTimeout = useCallback(async (url: string, options: FetchOptions = {}, timeout = 5000, retries = 2): Promise<unknown> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Get authentication token
    const token = getToken();
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenant?.id || '1',
          ...options.headers
        };
        
        // Add authentication token if available
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Attempt ${attempt + 1} failed for ${url}:`, errorMessage);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }, []);

  // Simplified counters fetch using only the working endpoint
  const fetchCounters = useCallback(async (): Promise<{ companies: number; employees: number }> => {
    try {
      console.log('🔄 Fetching counters from /api/counters...');
      const data = await apiGet<{ companies: number; employees: number }>('/api/counters');
      const result = {
        companies: data.companies || 0,
        employees: data.employees || 0
      };
      console.log('✅ Counters fetched successfully:', result);
      return result;
    } catch (error) {
      console.warn('❌ Failed to fetch counters:', error);
      // Return fallback data from dummy data
      const dummyDataTyped = dummyData as unknown as DummyData;
      return {
        companies: (dummyDataTyped.companies || []).length,
        employees: (dummyDataTyped.employees || []).length
      };
    }
  }, []);

  // Optimized data fetching with GDPR compliance
  const fetchData = useCallback(async () => {
    if (fetchingRef.current || !mountedRef.current) return;
    
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    const timer = startTimer();
    
    try {
      // Check GDPR consent first
      const hasConsent = await checkDashboardConsent();
      
      if (!hasConsent) {
        // Use fallback data without API calls
        await loadFallbackData();
        return;
      }
      
      // Check permissions - permetti accesso se ha dashboard:read, companies:read o è admin
      const hasDashboardAccess = hasPermission && (
        hasPermission('dashboard', 'read') || 
        hasPermission('dashboard', 'view') || 
        hasPermission('companies', 'read') ||
        hasPermission('administration', 'view')
      );
      
      if (!hasDashboardAccess) {
        throw new Error('Permessi insufficienti per accedere al dashboard');
      }
      
      console.log('🚀 Fetching dashboard data with GDPR compliance...');
      
      // Fetch counters using enhanced strategy
      try {
        const countersData = await fetchCounters();
        setCounters(countersData);
        console.log('✅ Counters loaded:', countersData);
      } catch (error) {
        console.warn('Failed to fetch counters with all strategies:', error);
        // Fallback to dummy data counters
        const dummyDataTyped = dummyData as unknown as DummyData;
        setCounters({
          companies: (dummyDataTyped.companies || []).length,
          employees: (dummyDataTyped.employees || []).length
        });
      }
      
      // Fetch data using optimized API calls (removed non-existing dashboard endpoints)
      const [coursesData, trainersData, schedulesData] = await Promise.allSettled([
        apiGet('/courses').catch(err => {
          console.warn('Failed to fetch courses:', err);
          return [];
        }),
        apiGet('/trainers').catch(err => {
          console.warn('Failed to fetch trainers:', err);
          return [];
        }),
        apiGet('/api/v1/schedules').catch(err => {
          console.warn('Failed to fetch schedules:', err);
          return [];
        })
      ]);
      
      // Process results with safety checks
      const courses = coursesData.status === 'fulfilled' ? (Array.isArray(coursesData.value) ? coursesData.value : []) : [];
      const trainers = trainersData.status === 'fulfilled' ? (Array.isArray(trainersData.value) ? trainersData.value : []) : [];
      const schedules = schedulesData.status === 'fulfilled' ? (Array.isArray(schedulesData.value) ? schedulesData.value : []) : [];
      
      // Use empty arrays for companies and employees since we get counts from /api/counters
      const companies: DashboardCompany[] = [];
      const employees: DashboardEmployee[] = [];
      
      // DEBUG: Log dettagliato dei risultati
      console.log('🔍 [DEBUG] API Results Details:');
      console.log('📊 Courses:', { status: coursesData.status, length: courses.length, data: courses });
      console.log('👨‍🏫 Trainers:', { status: trainersData.status, length: trainers.length, data: trainers });
      console.log('🏢 Companies:', { length: companies.length, data: companies, note: 'Using empty array - counts from /api/counters' });
      console.log('👥 Employees:', { length: employees.length, data: employees, note: 'Using empty array - counts from /api/counters' });
      console.log('📅 Schedules:', { status: schedulesData.status, length: schedules.length, data: schedules });
      
      // DEBUG: Log errori se presenti
      if (coursesData.status === 'rejected') console.error('❌ Courses error:', coursesData.reason);
      if (trainersData.status === 'rejected') console.error('❌ Trainers error:', trainersData.reason);
      if (schedulesData.status === 'rejected') console.error('❌ Schedules error:', schedulesData.reason);
      
      // Transform trainers data for compatibility
      const transformedTrainers = trainers.map((trainer: DashboardTrainer) => ({
        id: trainer.id,
        firstName: trainer.firstName || '',
        lastName: trainer.lastName || ''
      }));
      
      // Add employeeCount and ensure compatibility
      const companiesWithCounts = companies.map((company: DashboardCompany) => ({
        ...company,
        employeeCount: employees.filter((e: DashboardEmployee) => 
          e.companyId === company.id
        ).length,
        sector: company.sector || '',
        ragioneSociale: company.ragioneSociale || company.name || ''
      }));
      
      // Update state only if component is still mounted
      if (mountedRef.current) {
        setCoursesList(courses);
        setTrainersList(transformedTrainers);
        setCompaniesList(companiesWithCounts);
        setEmployeesList(employees);
        setSchedulesData(schedules);
        setDataSource('api');
        
        // Counters are now handled exclusively by fetchCounters() using /api/counters
        console.log('✅ Counters managed by /api/counters endpoint:', counters);
        
        console.log('✅ Dashboard data loaded successfully:', {
          courses: courses.length,
          trainers: transformedTrainers.length,
          companies: companiesWithCounts.length,
          employees: employees.length,
          schedules: schedules.length
        });
      }
      
      // Log successful data fetch
      await logGdprAction({
        action: 'DASHBOARD_DATA_LOADED',
        timestamp: new Date().toISOString(),
        tenantId: tenant?.id,
        metadata: {
          duration: timer(),
          dataSource: 'api',
          recordCounts: {
            courses: courses.length,
            trainers: transformedTrainers.length,
            companies: companiesWithCounts.length,
            employees: employees.length,
            schedules: schedules.length
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Errore di connessione al server';
      
      // Log error
      await logGdprAction({
        action: 'DASHBOARD_DATA_ERROR',
        timestamp: new Date().toISOString(),
        tenantId: tenant?.id,
        error: errorMessage,
        metadata: {
          duration: timer(),
          errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
        }
      });
      
      if (mountedRef.current) {
        setError(errorMessage);
        // Load fallback data on error
        await loadFallbackData();
      }
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [tenant?.id, hasPermission, checkDashboardConsent]);
  
  // Load fallback data (dummy data)
  const loadFallbackData = useCallback(async () => {
    console.log('📦 Loading fallback data...');
    
    try {
      const dummyDataTyped = dummyData as unknown as DummyData;
      
      const transformedTrainers = (dummyDataTyped.employees || []).map((e: DashboardEmployee) => ({
        id: e.id,
        firstName: e.firstName || '',
        lastName: e.lastName || ''
      }));
      
      const transformedCompanies = (dummyDataTyped.companies || []).map((c: DashboardCompany) => ({
        ...c,
        ragioneSociale: c.name || '',
        employeeCount: (dummyDataTyped.employees || []).filter((e: DashboardEmployee) => 
          e.companyId === c.id
        ).length,
        sector: c.sector || ''
      }));
      
      if (mountedRef.current) {
        setCoursesList(dummyDataTyped.courses || []);
        setTrainersList(transformedTrainers);
        setCompaniesList(transformedCompanies);
        setEmployeesList(dummyDataTyped.employees || []);
        setSchedulesData(dummyDataTyped.schedules || []);
        setDataSource('fallback');
        // Set fallback counters
        setCounters({
          companies: transformedCompanies.length,
          employees: (dummyDataTyped.employees || []).length
        });
      }
      
      await logGdprAction({
        action: 'DASHBOARD_FALLBACK_DATA_LOADED',
        timestamp: new Date().toISOString(),
        tenantId: tenant?.id,
        metadata: {
          reason: gdprConsent ? 'API error' : 'Missing GDPR consent'
        }
      });
      
    } catch (error) {
      console.error('Failed to load fallback data:', error);
    }
  }, [tenant?.id, gdprConsent]);
  
  // Initial data load
  useEffect(() => {
    // Load data even without tenant for testing - tenant is only used for GDPR logging
    if (mountedRef.current) {
      console.log('🚀 Dashboard: Loading data (tenant:', tenant?.id || 'not available', ')');
      fetchData();
    }
  }, [fetchData]);
  
  // Log when tenant becomes available
  useEffect(() => {
    if (tenant) {
      console.log('✅ Dashboard: Tenant loaded:', tenant.id);
    }
  }, [tenant]);

  // Rimappa gli eventi ogni volta che cambia la vista o i dati
  useEffect(() => {
    if (!schedulesData.length) return;
    // Helper: group sessions by scheduleId+date for month view
    function groupSessionsByDay(schedules: DashboardSchedule[]) {
      const grouped: ScheduleEvent[] = [];
      schedules.forEach((s: DashboardSchedule) => {
        if (Array.isArray(s.sessions) && s.sessions.length > 0) {
          // Raggruppa per giorno
          const sessionsByDay: Record<string, DashboardSchedule['sessions'][0][]> = {};
          s.sessions.forEach((sess) => {
            const day = sess.date.split('T')[0];
            if (!sessionsByDay[day]) sessionsByDay[day] = [];
            sessionsByDay[day].push(sess);
          });
          Object.entries(sessionsByDay).forEach(([day, sessions]) => {
            // Tooltip con tutte le sessioni (HTML)
            const allSessions = s.sessions;
            const sessioniTooltipHtml = allSessions.map((ss, i: number) => {
              const dateStr = new Date(ss.date).toLocaleDateString('it-IT');
              const orario = `${ss.start || '--:--'} - ${ss.end || '--:--'}`;
              const trainer = ss.trainer ? ` (${ss.trainer.firstName} ${ss.trainer.lastName})` : '';
              return `<span style='color:#2563eb;font-weight:700'>Sessione ${i+1}: ${dateStr}, ${orario}${trainer}</span>`;
            }).join('<br>');
            // Aziende senza duplicati
            const aziende = [...new Set((s.companies || []).map((c) => c.company?.ragioneSociale || c.company?.name))].join(', ');
            // Orari del giorno
            const orari = sessions.map((sess: any, idx: number) => `Sessione ${idx + 1}: ${sess.start || '--:--'} - ${sess.end || '--:--'}${sess.trainer ? ' (' + sess.trainer.firstName + ' ' + sess.trainer.lastName + ')' : ''}`).join('\n');
            const sortedSessions = [...sessions].sort((a, b) => a.start.localeCompare(b.start));
            const start = combineDateAndTime(day, sortedSessions[0].start);
            const end = combineDateAndTime(day, sortedSessions[sessions.length-1].end);
            // Titolo: aggiungi " - Sessione X" solo se ci sono sessioni in giorni diversi
            let title = `${s.course?.title || s.course?.name || 'Corso'}`;
            const allSameDay = allSessions.every((ss: any) => ss.date.split('T')[0] === day);
            if (!allSameDay && allSessions.length > 1) {
              // Trova la sessione corrispondente a questo giorno
              const idx = allSessions.findIndex((ss: any) => ss.date.split('T')[0] === day);
              if (idx !== -1) title += ` - Sessione ${idx + 1}`;
            }
            grouped.push({
              id: s.id + '-' + day,
              scheduleId: s.id,
              title,
              start,
              end,
              resource: s,
              status: s.status,
              tooltip: `Corso: ${s.course?.title || s.course?.name}\nAziende: ${aziende}\nLuogo: ${s.location || '-'}\nData: ${new Date(day).toLocaleDateString('it-IT')}\nStato: ${s.status}`,
              sessioniTooltipHtml
            });
          });
        } else {
          // fallback: usa startDate/endDate della schedule
          const aziende = [...new Set((s.companies || []).map((c: any) => c.company?.ragioneSociale || c.company?.name))].join(', ');
          grouped.push({
            id: s.id,
            scheduleId: s.id,
            title: s.course?.title || s.course?.name || 'Corso',
            start: new Date(s.startDate),
            end: new Date(s.endDate),
            resource: s,
            status: s.status,
            tooltip: `Corso: ${s.course?.title || s.course?.name}\nAziende: ${aziende}\nLuogo: ${s.location || '-'}\nData: ${s.startDate ? new Date(s.startDate).toLocaleDateString('it-IT') : '-'}\nOrario: --:--\nStato: ${s.status}`,
            sessioniTooltipHtml: ''
          });
        }
      });
      return grouped;
    }
    // Helper: eventi separati per sessione (settimana/giorno)
    function mapSessionsIndividually(schedules: any[]) {
      return schedules.flatMap((s: any) => {
        if (Array.isArray(s.sessions) && s.sessions.length > 0) {
          return s.sessions.map((sess: any, idx: number) => {
            const start = new Date(combineDateAndTime(sess.date, sess.start));
            const end = new Date(combineDateAndTime(sess.date, sess.end));
            const allSessions = s.sessions;
            const allSameDay = allSessions.every((ss: any) => ss.date.split('T')[0] === sess.date.split('T')[0]);
            let sessionTitle = s.course?.title || s.course?.name || 'Corso';
            let sessionNumber = '';
            if (!allSameDay && allSessions.length > 1) {
              sessionNumber = ` - Sessione ${allSessions.findIndex((ss: any) => ss === sess) + 1}`;
              sessionTitle += sessionNumber;
            }
            const sessioniTooltipHtml = allSessions.map((ss: any, i: number) => {
              const dateStr = new Date(ss.date).toLocaleDateString('it-IT');
              const orario = `${ss.start || '--:--'} - ${ss.end || '--:--'}`;
              const trainer = ss.trainer ? ` (${ss.trainer.firstName} ${ss.trainer.lastName})` : '';
              const isCurrent = allSameDay || ss === sess;
              return `<span style='color:${isCurrent ? '#2563eb' : '#1e293b'};font-weight:${isCurrent ? 700 : 400}'>Sessione ${i+1}: ${dateStr}, ${orario}${trainer}</span>`;
            }).join('<br>');
            const aziende = [...new Set((s.companies || []).map((c: any) => c.company?.ragioneSociale || c.company?.name))].join(', ');
            return {
              id: s.id + '-' + (sess.id || idx),
              scheduleId: s.id,
              title: sessionTitle,
              start,
              end,
              allDay: false,
              resource: s,
              status: s.status,
              tooltip: `Corso: ${s.course?.title || s.course?.name}\nAziende: ${aziende}\nLuogo: ${s.location || '-'}\nData: ${new Date(sess.date).toLocaleDateString('it-IT')}\nStato: ${s.status}`,
              sessioniTooltipHtml
            };
          });
        } else {
          const aziende = [...new Set((s.companies || []).map((c: any) => c.company?.ragioneSociale || c.company?.name))].join(', ');
          return [{
            id: s.id,
            scheduleId: s.id,
            title: s.course?.title || s.course?.name || 'Corso',
            start: new Date(s.startDate),
            end: new Date(s.endDate),
            resource: s,
            status: s.status,
            tooltip: `Corso: ${s.course?.title || s.course?.name}\nAziende: ${aziende}\nLuogo: ${s.location || '-'}\nData: ${s.startDate ? new Date(s.startDate).toLocaleDateString('it-IT') : '-'}\nOrario: --:--\nStato: ${s.status}`,
            sessioniTooltipHtml: ''
          }];
        }
      });
    }
    // Scegli mapping in base alla vista (default: month)
    let events;
    if (calendarView === 'month') {
      events = groupSessionsByDay(schedulesData);
    } else {
      events = mapSessionsIndividually(schedulesData);
    }
    setCalendarEvents(events);
  }, [calendarView, schedulesData]);

  const handleCreateSchedule = async (data: any) => {
    try {
      // Check GDPR consent for creating schedules
      const hasConsent = await checkGdprConsent('schedule_create');
      if (!hasConsent) {
        throw new ConsentRequiredError('Creating schedules requires user consent');
      }
      
      // Check permissions
      if (!hasPermission || !hasPermission('schedules', 'create')) {
        throw new Error('Permessi insufficienti per creare pianificazioni');
      }
      
      await logGdprAction({
        action: 'SCHEDULE_CREATE_ATTEMPT',
        timestamp: new Date().toISOString(),
        tenantId: tenant?.id,
        metadata: {
          courseId: data.courseId,
          companiesCount: data.companies?.length || 0
        }
      });
      
      const result = await apiPost('/schedules', data);
      
      await logGdprAction({
        action: 'SCHEDULE_CREATE_SUCCESS',
        timestamp: new Date().toISOString(),
        tenantId: tenant?.id,
        metadata: {
          scheduleId: result.id,
          courseId: data.courseId
        }
      });
      
      setShowForm(false);
      setSelectedSlot(null);
      
      // Refresh calendar data
      await fetchData();
      
    } catch (error) {
      console.error('Error creating schedule:', error);
      
      await logGdprAction({
        action: 'SCHEDULE_CREATE_ERROR',
        timestamp: new Date().toISOString(),
        tenantId: tenant?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
        }
      });
      
      const errorMessage = error instanceof ConsentRequiredError 
        ? 'Consenso GDPR richiesto per creare pianificazioni'
        : error instanceof Error 
          ? error.message 
          : 'Errore nella creazione della pianificazione';
      
      setError(errorMessage);
    }
  };

  // Chart data
  const doughnutData = {
    labels: ['Complete', 'In Progress', 'Not Started'],
    datasets: [
      {
        data: [65, 25, 10],
        backgroundColor: ['#4ade80', '#facc15', '#f87171'],
        borderColor: ['#4ade80', '#facc15', '#f87171'],
        borderWidth: 1,
      },
    ],
  };

  const barData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'New Employees',
        data: [12, 19, 8, 15, 12, 18],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
      },
      {
        label: 'Completed Courses',
        data: [7, 11, 5, 8, 3, 14],
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Welcome to your occupational medicine management dashboard.</p>
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            <p className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>Si è verificato un errore: {error}</span>
            </p>
            <p className="text-sm mt-1">L'applicazione sta utilizzando dati di esempio. Verifica la connessione al server.</p>
          </div>
        )}
      </div>

      {/* Stats Cards - moved above calendar */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Totale Aziende" 
          value={counters.companies.toString()} 
          icon={<Building2 className="h-7 w-7 text-blue-500" />} 
          trend=""
          trendDirection="up"
        />
        <StatCard 
          title="Totale Dipendenti" 
          value={counters.employees.toString()} 
          icon={<Users className="h-7 w-7 text-green-500" />} 
          trend=""
          trendDirection="up"
        />
        <StatCard 
          title="Corsi Programmati Futuri" 
          value={(() => {
            // Conta solo le schedule la cui PRIMA sessione è futura (una per scheduled-course)
            const now = new Date();
            // Raggruppa per scheduleId
            const firstSessionBySchedule: Record<string, ScheduleEvent> = {};
            calendarEvents.forEach(e => {
              if (!e.scheduleId) return;
              if (!firstSessionBySchedule[e.scheduleId] || e.start < firstSessionBySchedule[e.scheduleId].start) {
                firstSessionBySchedule[e.scheduleId] = e;
              }
            });
            const futureCount = Object.values(firstSessionBySchedule).filter((e) => e.start > now).length;
            return futureCount.toString();
          })()}
          icon={<GraduationCap className="h-7 w-7 text-amber-500" />} 
          trend=""
          trendDirection="up"
        />
        <StatCard 
          title="Corsi in Scadenza" 
          value={"0"} 
          icon={<Calendar className="h-7 w-7 text-red-500" />} 
          trend=""
          trendDirection="up"
        />
      </div>

      {/* Calendar Section - now below stats */}
      <ScheduleCalendar
        events={calendarEvents}
        eventPropGetter={(event) => {
          let bg = '#f3f4f6';
          if (event.status === 'Preventivo') bg = '#fef9c3';
          else if (event.status === 'Confermato') bg = '#fef3c7';
          else if (event.status === 'Fatturato') bg = '#dbeafe';
          else if (event.status === 'Pagato') bg = '#bbf7d0';
          return {
            style: {
              backgroundColor: bg,
              color: '#334155',
              borderRadius: '0.5rem',
              border: 'none',
              padding: '2px 8px',
              fontWeight: 400,
              fontSize: '0.85rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              cursor: 'pointer',
            }
          };
        }}
        onSelectEvent={(event) => {
          if (event.scheduleId) {
            navigate(`/schedules/${event.scheduleId}`);
          }
        }}
        onSelectSlot={(slotInfo) => {
          const start = slotInfo.start;
          const end = slotInfo.end;
          const isAllDay = start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 0 && end.getMinutes() === 0;
          setSelectedSlot({ start, end, isAllDay });
          setShowForm(true);
        }}
        view={calendarView}
        onView={setCalendarView}
      />

      {/* Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Training Status Overview</h2>
          <div className="h-64 flex items-center justify-center">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly Statistics</h2>
          <div className="h-64">
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Activity and Alerts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
            <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              View All
            </a>
          </div>
          <ul className="space-y-4">
            {[1, 2, 3, 4].map((item) => (
              <li key={item} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="flex items-start">
                  <span className="flex items-center justify-center bg-blue-100 rounded-full w-8 h-8 mt-1">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </span>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-800">
                      {item % 2 === 0 
                        ? 'New employee added to Acme Corp' 
                        : 'Course completion updated for John Smith'}
                    </p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Alerts</h2>
            <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              View All
            </a>
          </div>
          <ul className="space-y-4">
            {[1, 2, 3].map((item) => (
              <li key={item} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="flex items-start">
                  <span className="flex items-center justify-center bg-amber-100 rounded-full w-8 h-8 mt-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </span>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-800">
                      {item === 1 
                        ? '5 certifications expiring this month' 
                        : item === 2 
                          ? '3 employees need to complete required training' 
                          : 'Annual health checks due for Tech Solutions Inc.'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item === 1 ? 'High priority' : 'Medium priority'}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {showForm && (
        <ScheduleEventModalLazy
          trainings={coursesList.map((c: any) => ({ ...c, title: c.title || c.name }))}
          trainers={trainersList}
          companies={companiesList}
          employees={employeesList}
          existingEvent={undefined}
          initialDate={
            selectedSlot
              ? selectedSlot.start.getFullYear() +
                '-' +
                String(selectedSlot.start.getMonth() + 1).padStart(2, '0') +
                '-' +
                String(selectedSlot.start.getDate()).padStart(2, '0')
              : undefined
          }
          initialTime={selectedSlot
            ? selectedSlot.isAllDay
              ? { start: '09:00', end: '13:00' }
              : {
                  start: selectedSlot.start.toTimeString().slice(0, 5),
                  end: selectedSlot.end.toTimeString().slice(0, 5),
                }
            : undefined}
          onClose={() => {
            setShowForm(false);
            setSelectedSlot(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedSlot(null);
            // Optionally refresh calendar data here
          }}
        />
      )}
    </div>
  );
};
  
  export default Dashboard;