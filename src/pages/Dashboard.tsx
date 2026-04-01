import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  Euro,
  GraduationCap,
  TrendingUp,
  Users
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dummyData } from '../data/dummyData';
import StatCard from '../components/dashboard/StatCard';
import ScheduleCalendar, { ScheduleEvent } from '../components/dashboard/ScheduleCalendar';
import { ScheduleResource } from './Dashboard/hooks/useCalendarEvents';
import ScheduleEventModal from '../components/schedules/ScheduleEventModal';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../services/api';
import { getTrainers } from '../services/trainers';
import { getCompanies } from '../services/companies';
import { Company, Course } from '../types';
import { checkConsent as checkGdprConsent, logGdprAction, ConsentRequiredError } from '../utils/gdpr';
import { startTimer } from '../utils/metrics';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useTenantFilter } from '../context/TenantFilterContext';
import { useToast } from '../hooks/useToast';
import { dbStatusToItalian } from '../utils/scheduleStatusColors';
import { useExpiringCoursesCount } from '../hooks/useExpiringCoursesCount';
import { useRoleBasedData, FilterableSchedule } from '../hooks/useRoleBasedData';
import preventiviService, { Preventivo } from '../services/preventiviService';
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
  coTrainerId?: string; // Per FilterableSchedule compatibility
  trainer?: DashboardTrainer;
  maxParticipants?: number;
  status?: string;
  companies?: Array<{ companyId: string; company: DashboardCompany }>;
  enrollments?: Array<{ personId?: string; employeeId?: string; employee?: DashboardEmployee }>;
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

// Helper per convertire DashboardSchedule a ScheduleResource (per il calendario)
function toScheduleResource(schedule: DashboardSchedule): ScheduleResource {
  return {
    id: schedule.id,
    course: schedule.course ? { id: schedule.course.id, name: schedule.course.title || '', title: schedule.course.title } : undefined,
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    location: schedule.location,
    status: schedule.status || 'scheduled',
    sessions: schedule.sessions?.map(sess => ({
      id: sess.id,
      date: sess.date,
      start: sess.start,
      end: sess.end,
      trainer: sess.trainer ? { id: sess.trainer.id, firstName: sess.trainer.firstName, lastName: sess.trainer.lastName } : undefined
    })),
    // P49: Handle both old (company) and new (companyTenantProfile) patterns
    companies: schedule.companies?.map(c => {
      const profile = (c as any).companyTenantProfile;
      const companyData = profile?.company || (c as any).company;
      return {
        // Expose CompanyTenantProfile.id for matching with getCompanies() results
        id: profile?.id ?? (c as any).companyTenantProfileId,
        company: { id: companyData?.id || (c as any).companyId, ragioneSociale: companyData?.ragioneSociale }
      };
    })
  };
}

const Dashboard: React.FC = () => {
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date; isAllDay?: boolean } | null>(null);
  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [trainersList, setTrainersList] = useState<DashboardTrainer[]>([]);
  const [companiesList, setCompaniesList] = useState<DashboardCompany[]>([]);
  const [employeesList, setEmployeesList] = useState<DashboardEmployee[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<ScheduleEvent[]>([]);
  const [schedulesData, setSchedulesData] = useState<DashboardSchedule[]>([]); // per rimappare quando cambia vista
  const [calendarView, setCalendarView] = useState('month');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gdprConsent, setGdprConsent] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<'api' | 'fallback'>('api');
  const [counters, setCounters] = useState({ companies: 0, employees: 0 });
  const [preventivi, setPreventivi] = useState<Preventivo[]>([]);

  const navigate = useNavigate();
  const { user, isAuthenticated, hasPermission, isLoading: authLoading } = useAuth();

  // P57: TenantFilter hook for multi-tenant dashboard filtering
  const { getTenantFilterParams, tenantFilterKey, isReady: tenantFilterReady } = useTenantFilter();

  // Hook per filtraggio dati basato sul ruolo
  const {
    filterSchedules,
    isAdmin,
    isTrainingAdmin,
    isTrainer,
    isEmployee,
    hasFullAccess,
    userId: currentUserId
  } = useRoleBasedData();

  // Uso condizionale di useTenant per evitare errori durante l'inizializzazione
  let tenant = null;

  try {
    const tenantContext = useTenant();
    tenant = tenantContext.tenant;
  } catch (error) {
  }

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  // Hook per contatore corsi in scadenza (sincronizzato con sidebar)
  const { count: expiringCoursesCount, loading: expiringCoursesLoading } = useExpiringCoursesCount();

  // P58: Reset fetchingRef AND mountedRef when tenant changes to allow new fetch
  useEffect(() => {
    fetchingRef.current = false;
    mountedRef.current = true; // P58: Reset mountedRef to fix tenant change issue
  }, [tenantFilterKey]);

  // Cleanup on unmount - only set false, not interfere with tenant changes
  useEffect(() => {
    // Set mountedRef true on mount
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  // GDPR Consent Check
  const checkDashboardConsent = useCallback(async () => {
    try {
      // checkGdprConsent requires userId and consentType
      const userId = user?.id || 'system';
      const consentResult = await checkGdprConsent(userId, 'dashboard_data');
      const hasConsent = consentResult.hasConsent;
      setGdprConsent(hasConsent);

      if (!hasConsent) {
        await logGdprAction({
          action: 'DASHBOARD_ACCESS_DENIED',
          timestamp: new Date().toISOString(),
          metadata: {
            reason: 'Missing consent for dashboard data access',
            userId,
            tenantId: tenant?.id
          }
        });

        setError('Accesso ai dati del dashboard richiede il consenso GDPR');
        setDataSource('fallback');
        return false;
      }

      return true;
    } catch (error) {
      setGdprConsent(false);
      setDataSource('fallback');
      return false;
    }
  }, [tenant?.id, user?.id]);

  // Simplified counters fetch using only the working endpoint with tenant filter support
  const fetchCounters = useCallback(async (): Promise<{ companies: number; employees: number }> => {
    try {
      // P57: Build tenantIds query param for multi-tenant filtering
      const tenantParams = getTenantFilterParams();
      const queryParams = new URLSearchParams();
      if (tenantParams.tenantIds) {
        queryParams.set('tenantIds', tenantParams.tenantIds.join(','));
      }
      if (tenantParams.allTenants) {
        queryParams.set('allTenants', 'true');
      }
      const queryString = queryParams.toString();
      const countersUrl = queryString ? `/api/v1/counters?${queryString}` : '/api/v1/counters';

      const data = await apiGet<{ companies: number; employees: number }>(countersUrl);
      const result = {
        companies: data.companies || 0,
        employees: data.employees || 0
      };
      return result;
    } catch (error) {

      // Final fallback to dummy data
      const dummyDataTyped = dummyData as unknown as DummyData;
      const fallback = {
        companies: (dummyDataTyped.companies || []).length,
        employees: (dummyDataTyped.employees || []).length
      };
      return fallback;
    }
  }, [getTenantFilterParams, tenantFilterKey]); // P57: tenantFilterKey triggers re-fetch on tenant change

  // Optimized data fetching with GDPR compliance
  const fetchData = useCallback(async () => {
    // P57: Wait for tenant filter to be ready
    if (!tenantFilterReady) {
      return;
    }

    if (fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    const timer = startTimer();

    // ✅ FIX CRITICO: Wrap TUTTO in try-finally per garantire cleanup

    try {
      // Check GDPR consent first
      const hasConsent = await checkDashboardConsent();

      if (!hasConsent) {
        await loadFallbackData();
        return;
      }

      // Check permissions
      const hasDashboardAccess = hasPermission && (
        hasPermission('dashboard', 'read') ||
        hasPermission('dashboard', 'view') ||
        hasPermission('companies', 'read') ||
        hasPermission('administration', 'view') ||
        hasPermission('schedules', 'read') ||  // EMPLOYEE può vedere schedules
        hasPermission('courses', 'read') ||    // EMPLOYEE può vedere corsi
        hasPermission('persons', 'read')       // EMPLOYEE può vedere persone
      );

      if (!hasDashboardAccess) {
        throw new Error('Permessi insufficienti per accedere al dashboard');
      }

      // Fetch counters using enhanced strategy
      try {
        const countersData = await fetchCounters();
        setCounters(countersData);
      } catch (error) {
        // Fallback to dummy data counters
        const dummyDataTyped = dummyData as unknown as DummyData;
        const fallback = {
          companies: (dummyDataTyped.companies || []).length,
          employees: (dummyDataTyped.employees || []).length
        };
        setCounters(fallback);
      }

      // Fetch data using optimized API calls
      const [coursesData, trainersData, schedulesData, companiesData] = await Promise.allSettled([
        (async () => {
          try {
            const { getCourses } = await import('../services/courses');
            const result = await getCourses();
            return result;
          } catch (err) {
            return [];
          }
        })(),
        (async () => {
          const result = await getTrainers();

          return result;
        })().catch(err => {
          return [];
        }),
        (async () => {
          // Fetch schedules for ±2 months around today to populate the calendar
          const rangeStart = new Date();
          rangeStart.setMonth(rangeStart.getMonth() - 2);
          rangeStart.setDate(1);
          const rangeEnd = new Date();
          rangeEnd.setMonth(rangeEnd.getMonth() + 3);
          rangeEnd.setDate(0);
          const dateFrom = rangeStart.toISOString().split('T')[0];
          const dateTo = rangeEnd.toISOString().split('T')[0];
          const result = await apiGet(`/api/v1/schedules?dateFrom=${dateFrom}&dateTo=${dateTo}`) as DashboardSchedule[] | undefined;
          return result;
        })().catch(err => {
          return [];
        }),
        (async () => {
          const result = await getCompanies();
          return result;
        })().catch(err => {
          return [];
        })
        // ✅ OTTIMIZZAZIONE CRITICA: Non caricare persons all'apertura Dashboard
        // Vengono caricati lazy dalla modale quando necessario
        // Questo mantiene il caricamento Dashboard veloce (<2s invece di 10s+)
      ]);

      // Process results with safety checks
      let courses: any[] = [];
      try {
        courses = coursesData.status === 'fulfilled' ? (Array.isArray(coursesData.value) ? coursesData.value : []) : [];
      } catch (err) {
        courses = [];
      }

      const trainers = trainersData.status === 'fulfilled' ? (Array.isArray(trainersData.value) ? trainersData.value : []) : [];

      const schedules = schedulesData.status === 'fulfilled' ? (Array.isArray(schedulesData.value) ? schedulesData.value : []) : [];

      const rawCompanies = companiesData.status === 'fulfilled' ? (Array.isArray(companiesData.value) ? companiesData.value : []) : [];

      // ✅ Persons NON caricati - verranno caricati lazy dalla modale
      const rawPersons: any[] = [];

      // Map companies to DashboardCompany ensuring ragioneSociale compatibility
      const companies: DashboardCompany[] = rawCompanies.map((c: any) => ({
        id: String(c.id),
        name: c.ragioneSociale || '',
        ragioneSociale: c.ragioneSociale || '',
        sector: c.sector || c.industry || '',
      }));

      // Map persons to DashboardEmployee shape
      const employees: DashboardEmployee[] = rawPersons.map((p: any) => ({
        id: String(p.id),
        firstName: p.firstName ?? p.first_name ?? '',
        lastName: p.lastName ?? p.last_name ?? '',
        email: p.email ?? '',
        companyId: (p.companyId ?? p.company_id ?? p.company?.id) ? String(p.companyId ?? p.company_id ?? p.company?.id) : undefined,
      }));

      // Transform trainers data for compatibility - ✅ MANTIENI certifications e specialties
      const transformedTrainers = trainers.map((trainer: any) => ({
        ...trainer, // ✅ Mantieni TUTTI i campi inclusi certifications e specialties
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

      // ✅ FIX CRITICO: Rimuovi guard mountedRef - React Strict Mode causa false positives
      // setState è safe anche se componente viene rimontato, React gestisce automaticamente

      // DEBUG CRITICO: Log RAW courses PRIMA di salvare nello state
      if (process.env.NODE_ENV === 'development' && courses.length > 0) {
        // dev-only raw courses debug removed
      }

      setCoursesList(courses);
      setTrainersList(transformedTrainers);
      setCompaniesList(companiesWithCounts);
      setEmployeesList(employees);
      setSchedulesData(schedules);
      setDataSource('api');

      // Counters are now handled exclusively by fetchCounters() using /api/v1/counters

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

      const errorMessage = 'Errore di connessione al server';

      // ✅ FIX: Log error in modo non-bloccante
      try {
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
      } catch (logError) {
      }

      // ✅ FIX: Rimuovi guard mountedRef anche qui
      setError(errorMessage);
      // Load fallback data on error
      await loadFallbackData();
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
    }
  }, [tenant?.id, hasPermission, checkDashboardConsent, tenantFilterReady, tenantFilterKey, fetchCounters]);

  // Load fallback data (dummy data)
  const loadFallbackData = useCallback(async () => {
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

      // ✅ FIX: Rimuovi guard mountedRef
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

      // ✅ FIX: Non bloccare fallback load se GDPR log fallisce
      try {
        await logGdprAction({
          action: 'DASHBOARD_FALLBACK_DATA_LOADED',
          timestamp: new Date().toISOString(),
          tenantId: tenant?.id,
          metadata: {
            reason: gdprConsent ? 'API error' : 'Missing GDPR consent'
          }
        });
      } catch (logError) {
      }

    } catch (error) {
    } finally {
      // ✅ FIX: Setta isLoading = false anche per fallback data
      setIsLoading(false);
    }
  }, [tenant?.id, gdprConsent]);

  // Initial data load - FIXED: Attendi che AuthContext finisca il caricamento
  useEffect(() => {
    if (authLoading) {
      return;
    }

    // P57: Aspetta che TenantFilter sia pronto
    if (!tenantFilterReady) {
      return;
    }

    // Load data even without tenant for testing
    if (mountedRef.current) {
      fetchData();
    } else {
    }
  }, [authLoading, tenantFilterReady, tenantFilterKey, fetchData]); // P57: Include fetchData for proper counter refresh

  // Update counters when data is loaded
  useEffect(() => {
    if (counters.companies === 0 && counters.employees === 0 &&
      (companiesList.length > 0 || employeesList.length > 0)) {
      setCounters({
        companies: companiesList.length,
        employees: employeesList.length
      });
    }
  }, [companiesList.length, employeesList.length, counters]);

  // Log when tenant becomes available (removed)
  useEffect(() => {
    if (tenant) {
      // tenant loaded
    }
  }, [tenant]);

  // Carica preventivi per grafici finanziari (solo per admin/training admin, non per employee)
  useEffect(() => {
    const fetchPreventivi = async () => {
      // EMPLOYEE non ha accesso ai preventivi - skip per evitare errore 403
      if (isEmployee) {
        return;
      }

      try {
        const data = await preventiviService.list();
        setPreventivi(data);
      } catch (err) {
      }
    };

    if (isAuthenticated && !authLoading) {
      fetchPreventivi();
    }
  }, [isAuthenticated, authLoading, isEmployee]);

  // Rimappa gli eventi ogni volta che cambia la vista o i dati
  useEffect(() => {
    if (!schedulesData.length) return;
    // Helper: group sessions by scheduleId+date for month view
    function groupSessionsByDay(schedules: DashboardSchedule[]) {
      const grouped: ScheduleEvent[] = [];
      schedules.forEach((s: DashboardSchedule) => {
        if (Array.isArray(s.sessions) && s.sessions.length > 0) {
          // Raggruppa per giorno
          type SessionType = NonNullable<DashboardSchedule['sessions']>[number];
          const sessionsByDay: Record<string, SessionType[]> = {};
          s.sessions.forEach((sess) => {
            const day = sess.date.split('T')[0];
            if (!sessionsByDay[day]) sessionsByDay[day] = [];
            sessionsByDay[day].push(sess);
          });
          Object.entries(sessionsByDay).forEach(([day, sessions]) => {
            // Tooltip con tutte le sessioni (HTML)
            const allSessions = s.sessions || [];
            const sessioniTooltipHtml = allSessions.map((ss, i: number) => {
              const dateStr = new Date(ss.date).toLocaleDateString('it-IT');
              const orario = `${ss.start || '--:--'} - ${ss.end || '--:--'}`;
              const trainer = ss.trainer ? ` (${ss.trainer.firstName} ${ss.trainer.lastName})` : '';
              return `<span style='color:#2563eb;font-weight:700'>Sessione ${i + 1}: ${dateStr}, ${orario}${trainer}</span>`;
            }).join('<br>');
            // Aziende senza duplicati
            const aziende = [...new Set((s.companies || []).map((c) => c.company?.ragioneSociale))].filter(Boolean).join(', ');
            // Orari del giorno
            const orari = sessions.map((sess: any, idx: number) => `Sessione ${idx + 1}: ${sess.start || '--:--'} - ${sess.end || '--:--'}${sess.trainer ? ' (' + sess.trainer.firstName + ' ' + sess.trainer.lastName + ')' : ''}`).join('\n');
            const sortedSessions = [...sessions].sort((a, b) => a.start.localeCompare(b.start));
            const start = combineDateAndTime(day, sortedSessions[0].start);
            const end = combineDateAndTime(day, sortedSessions[sessions.length - 1].end);
            // Titolo: aggiungi " - Sessione X" solo se ci sono sessioni in giorni diversi
            let title = `${s.course?.title || 'Corso'}`;
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
              resource: toScheduleResource(s),
              status: dbStatusToItalian(s.status || 'scheduled'),
              tooltip: `Corso: ${s.course?.title}\nAziende: ${aziende}\nLuogo: ${s.location || '-'}\nData: ${new Date(day).toLocaleDateString('it-IT')}\nStato: ${dbStatusToItalian(s.status || 'scheduled')}`,
              sessioniTooltipHtml
            });
          });
        } else {
          // fallback: usa startDate/endDate della schedule
          const aziende = [...new Set((s.companies || []).map((c: any) => c.company?.ragioneSociale))].filter(Boolean).join(', ');
          grouped.push({
            id: s.id,
            scheduleId: s.id,
            title: s.course?.title || 'Corso',
            start: new Date(s.startDate),
            end: new Date(s.startDate), // single-day event: avoid spanning the full startDate-endDate range
            allDay: true,
            resource: toScheduleResource(s),
            status: dbStatusToItalian(s.status || 'scheduled'),
            tooltip: `Corso: ${s.course?.title}\nAziende: ${aziende}\nLuogo: ${s.location || '-'}\nData: ${s.startDate ? new Date(s.startDate).toLocaleDateString('it-IT') : '-'}\nOrario: --:--\nStato: ${dbStatusToItalian(s.status || 'scheduled')}`,
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
            let sessionTitle = s.course?.title || 'Corso';
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
              return `<span style='color:${isCurrent ? '#2563eb' : '#1e293b'};font-weight:${isCurrent ? 700 : 400}'>Sessione ${i + 1}: ${dateStr}, ${orario}${trainer}</span>`;
            }).join('<br>');
            const aziende = [...new Set((s.companies || []).map((c: any) => c.company?.ragioneSociale))].filter(Boolean).join(', ');
            return {
              id: s.id + '-' + (sess.id || idx),
              scheduleId: s.id,
              title: sessionTitle,
              start,
              end,
              allDay: false,
              resource: toScheduleResource(s),
              status: dbStatusToItalian(s.status || 'scheduled'),
              tooltip: `Corso: ${s.course?.title}\nAziende: ${aziende}\nLuogo: ${s.location || '-'}\nData: ${new Date(sess.date).toLocaleDateString('it-IT')}\nStato: ${dbStatusToItalian(s.status || 'scheduled')}`,
              sessioniTooltipHtml
            };
          });
        } else {
          const aziende = [...new Set((s.companies || []).map((c: any) => c.company?.ragioneSociale))].filter(Boolean).join(', ');
          return [{
            id: s.id,
            scheduleId: s.id,
            title: s.course?.title || 'Corso',
            start: new Date(s.startDate),
            end: new Date(s.startDate), // single-day event: avoid spanning the full startDate-endDate range
            allDay: true,
            resource: toScheduleResource(s),
            status: dbStatusToItalian(s.status || 'scheduled'),
            tooltip: `Corso: ${s.course?.title}\nAziende: ${aziende}\nLuogo: ${s.location || '-'}\nData: ${s.startDate ? new Date(s.startDate).toLocaleDateString('it-IT') : '-'}\nOrario: --:--\nStato: ${dbStatusToItalian(s.status || 'scheduled')}`,
            sessioniTooltipHtml: ''
          }];
        }
      });
    }

    // 🔐 ROLE-BASED FILTERING: Filtra schedules in base al ruolo utente
    // - ADMIN/TRAINING_ADMIN: vedono tutto
    // - TRAINER: vede solo corsi dove è formatore/co-formatore  
    // - EMPLOYEE: vede solo corsi a cui è iscritto
    // Note: filterSchedules è type-safe con FilterableSchedule, DashboardSchedule è compatibile
    const filteredSchedules = filterSchedules(
      schedulesData as unknown as FilterableSchedule[],
      { includeCoTrainer: true }
    ) as unknown as DashboardSchedule[];

    // Scegli mapping in base alla vista (default: month)
    let events;
    if (calendarView === 'month') {
      events = groupSessionsByDay(filteredSchedules);
    } else {
      events = mapSessionsIndividually(filteredSchedules);
    }
    setCalendarEvents(events);
  }, [calendarView, schedulesData, filterSchedules, isAdmin, isTrainingAdmin, isTrainer, isEmployee, hasFullAccess, currentUserId]);

  // Re-fetch schedules when user navigates calendar to a different month
  useEffect(() => {
    if (!isAuthenticated || authLoading || dataSource === 'fallback') return;
    const fetchSchedulesForMonth = async () => {
      try {
        const d = calendarDate;
        const rangeStart = new Date(d.getFullYear(), d.getMonth() - 1, 1);
        const rangeEnd = new Date(d.getFullYear(), d.getMonth() + 2, 0);
        const dateFrom = rangeStart.toISOString().split('T')[0];
        const dateTo = rangeEnd.toISOString().split('T')[0];
        const result = await apiGet(`/api/v1/schedules?dateFrom=${dateFrom}&dateTo=${dateTo}`) as DashboardSchedule[] | undefined;
        if (Array.isArray(result)) {
          setSchedulesData(result);
        }
      } catch (err) {
      }
    };
    fetchSchedulesForMonth();
  }, [calendarDate, isAuthenticated, authLoading]);

  const handleCreateSchedule = async (data: any) => {
    try {
      // Check GDPR consent for creating schedules
      const userId = user?.id || 'system';
      const consentResult = await checkGdprConsent(userId, 'schedule_create');
      if (!consentResult.hasConsent) {
        throw new ConsentRequiredError('schedule_create', userId, 'Creating schedules requires user consent');
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

      const result = await apiPost('/api/v1/schedules', data) as { id: number };

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

      await logGdprAction({
        action: 'SCHEDULE_CREATE_ERROR',
        timestamp: new Date().toISOString(),
        tenantId: tenant?.id,
        error: 'Unknown error',
        metadata: {
          errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
        }
      });

      const errorMessage = error instanceof ConsentRequiredError
        ? 'Consenso GDPR richiesto per creare pianificazioni'
        : 'Errore nella creazione della pianificazione';

      setError(errorMessage);
    }
  };

  // Chart data removed - using functional widgets instead

  // Calcola prossime sessioni dai calendarEvents
  const upcomingSessions = calendarEvents
    .filter(e => new Date(e.start) > new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  // Calcoli finanziari Year-to-Date
  const financialData = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1); // 1 gennaio dell'anno corrente

    // Filtra preventivi da inizio anno
    const ytdPreventivi = preventivi.filter(p => new Date(p.dataEmissione) >= startOfYear);

    // Entrate: preventivi normali (non compensi formatori) con stato ACCETTATO o FATTURATO
    const entrate = ytdPreventivi
      .filter(p => p.tipoServizio !== 'COMPENSO_FORMATORE' && ['ACCETTATO', 'FATTURATO'].includes(p.stato))
      .reduce((sum, p) => sum + (p.importoFinale || p.prezzoTotale || 0), 0);

    // Uscite: compensi formatori con stato ACCETTATO o FATTURATO
    const uscite = ytdPreventivi
      .filter(p => p.tipoServizio === 'COMPENSO_FORMATORE' && ['ACCETTATO', 'FATTURATO'].includes(p.stato))
      .reduce((sum, p) => sum + (p.importoFinale || p.prezzoTotale || 0), 0);

    // Margine netto
    const margineNetto = entrate - uscite;

    // Dati mensili per grafico a barre
    const monthlyData: { month: string; fatturato: number; monthIndex: number }[] = [];
    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

    for (let i = 0; i <= now.getMonth(); i++) {
      const monthStart = new Date(now.getFullYear(), i, 1);
      const monthEnd = new Date(now.getFullYear(), i + 1, 0);

      const monthFatturato = ytdPreventivi
        .filter(p => {
          const date = new Date(p.dataEmissione);
          return date >= monthStart && date <= monthEnd &&
            p.tipoServizio !== 'COMPENSO_FORMATORE' &&
            ['ACCETTATO', 'FATTURATO'].includes(p.stato);
        })
        .reduce((sum, p) => sum + (p.importoFinale || p.prezzoTotale || 0), 0);

      monthlyData.push({
        month: monthNames[i],
        fatturato: Math.round(monthFatturato),
        monthIndex: i
      });
    }

    return {
      entrate,
      uscite,
      margineNetto,
      monthlyData,
      year: now.getFullYear()
    };
  }, [preventivi]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h1>
        {/* 🔐 ROLE-BASED WELCOME MESSAGE */}
        <p className="text-gray-500 dark:text-gray-400">
          {isTrainer && 'Benvenuto! Ecco i corsi che stai tenendo come formatore.'}
          {isEmployee && 'Benvenuto! Ecco i corsi a cui sei iscritto.'}
          {(isAdmin || isTrainingAdmin) && 'Benvenuto nel tuo pannello di gestione della medicina del lavoro.'}
          {!isTrainer && !isEmployee && !isAdmin && !isTrainingAdmin && 'Benvenuto nella tua dashboard personale.'}
        </p>
        {error && (
          <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-md">
            <p className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>Si è verificato un errore: {error}</span>
            </p>
            <p className="text-sm mt-1">L'applicazione sta utilizzando dati di esempio. Verifica la connessione al server.</p>
          </div>
        )}
      </div>

      {/* 🔐 ROLE-BASED STATS: Admin/TrainingAdmin vedono tutto, altri vedono stats personali */}
      {/* Stats Cards - moved above calendar */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* Card Aziende - Solo Admin/TrainingAdmin */}
        {hasFullAccess && (
          <StatCard
            title="Totale Aziende"
            value={counters.companies.toString()}
            icon={<Building2 className="h-7 w-7 text-blue-500" />}
            trend=""
            trendDirection="up"
            to="/companies"
          />
        )}

        {/* Card Dipendenti - Solo Admin/TrainingAdmin */}
        {hasFullAccess && (
          <StatCard
            title="Totale Dipendenti"
            value={counters.employees.toString()}
            icon={<Users className="h-7 w-7 text-green-500" />}
            trend=""
            trendDirection="up"
            to="/employees"
          />
        )}

        {/* Card Corsi Programmati - Titolo dinamico per ruolo */}
        <StatCard
          title={isTrainer ? "I Miei Corsi da Formatore" : isEmployee ? "I Miei Corsi Iscritti" : "Corsi Programmati Futuri"}
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
          to="/schedules"
        />

        {/* Card Corsi in Scadenza - Diverso per Employee */}
        <StatCard
          title={isEmployee ? "Le Mie Scadenze" : "Corsi in Scadenza"}
          value={expiringCoursesLoading ? "..." : expiringCoursesCount.toString()}
          icon={<Calendar className="h-7 w-7 text-red-500" />}
          trend=""
          trendDirection="up"
          to="/schedules#expiring-courses"
        />

        {/* Card Prossima Sessione - Per Trainer e Employee */}
        {(isTrainer || isEmployee) && calendarEvents.length > 0 && (
          <StatCard
            title="Prossima Sessione"
            value={(() => {
              const now = new Date();
              const nextSession = calendarEvents
                .filter(e => e.start > now)
                .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
              return nextSession
                ? nextSession.start.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
                : '-';
            })()}
            icon={<Clock className="h-7 w-7 text-purple-500" />}
            trend=""
            trendDirection="up"
            to="/schedules"
          />
        )}
      </div>

      {/* Calendar Section - now below stats */}
      <ScheduleCalendar
        events={calendarEvents}
        onSelectEvent={(event) => {
          if (event.scheduleId) {
            navigate(`/schedules/${event.scheduleId}`);
          }
        }}
        onSelectSlot={(slotInfo) => {
          // ✅ FIX CRITICO: Blocca apertura se dati non pronti
          if (isLoading || coursesList.length === 0) {
            if (process.env.NODE_ENV === 'development') {
            }
            // Mostra messaggio user-friendly
            const message = isLoading
              ? 'Caricamento dati in corso, attendi qualche secondo...'
              : 'Nessun corso disponibile. Verifica la connessione o ricarica la pagina.';
            showToast({ message, type: 'warning' });
            return;
          }

          if (process.env.NODE_ENV === 'development') {
          }

          const start = slotInfo.start;
          const end = slotInfo.end;
          const isAllDay = start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 0 && end.getMinutes() === 0;
          setSelectedSlot({ start, end, isAllDay });
          setShowForm(true);
        }}
        view={calendarView}
        onView={setCalendarView}
        onNavigate={(date: Date) => setCalendarDate(date)}
      />

      {/* Prossime Sessioni e Corsi in Scadenza */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Prossime Sessioni */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow dark:shadow-gray-900/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Prossime Sessioni</h2>
            <button
              onClick={() => navigate('/schedules')}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
            >
              Vedi tutte <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {upcomingSessions.length > 0 ? (
            <ul className="space-y-3">
              {upcomingSessions.map((session, index) => (
                <li
                  key={session.id || index}
                  className="border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg cursor-pointer transition-colors"
                  onClick={() => session.scheduleId && navigate(`/schedules/${session.scheduleId}`)}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-full w-10 h-10 flex-shrink-0">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{session.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(session.start).toLocaleDateString('it-IT', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {session.resource?.location && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{session.resource.location}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${session.status === 'ACCETTATO' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      session.status === 'PREVENTIVO' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                      {dbStatusToItalian(session.status || 'PREVENTIVO')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm">Nessuna sessione programmata</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Pianifica un corso
              </button>
            </div>
          )}
        </div>

        {/* Corsi in Scadenza Alert */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow dark:shadow-gray-900/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Corsi in Scadenza</h2>
            <button
              onClick={() => navigate('/schedules#expiring-courses')}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
            >
              Gestisci <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {expiringCoursesCount > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                <span className="flex items-center justify-center bg-red-100 dark:bg-red-900/30 rounded-full w-12 h-12 flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </span>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-red-800 dark:text-red-200">{expiringCoursesCount}</p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {expiringCoursesCount === 1 ? 'corso richiede' : 'corsi richiedono'} attenzione
                  </p>
                </div>
                <button
                  onClick={() => navigate('/schedules#expiring-courses')}
                  className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                >
                  Riprogramma
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Alcuni dipendenti hanno certificazioni scadute o in scadenza.
                Clicca "Gestisci" per vedere i dettagli e riprogrammare i corsi necessari.
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto mb-4">
                <GraduationCap className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Tutto in regola!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Nessun corso in scadenza che richiede azione</p>
            </div>
          )}
        </div>
      </div>

      {/* Grafici Finanziari - Solo per Admin/TrainingAdmin */}
      {hasFullAccess && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Margine Netto YTD */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow dark:shadow-gray-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Margine Netto {financialData.year}</h2>
              <button
                onClick={() => navigate('/preventivi')}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                Dettagli <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className={`flex items-center gap-4 p-4 rounded-lg border ${financialData.margineNetto >= 0
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                <span className={`flex items-center justify-center rounded-full w-14 h-14 flex-shrink-0 ${financialData.margineNetto >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                  <Euro className={`h-7 w-7 ${financialData.margineNetto >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                </span>
                <div className="flex-1">
                  <p className={`text-2xl font-bold ${financialData.margineNetto >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                    }`}>
                    € {financialData.margineNetto.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Da inizio anno ad oggi</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Entrate (Preventivi)</p>
                  <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                    € {financialData.entrate.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Uscite (Formatori)</p>
                  <p className="text-lg font-semibold text-orange-700 dark:text-orange-300">
                    € {financialData.uscite.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Grafico Fatturato Mensile */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow dark:shadow-gray-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Fatturato Mensile {financialData.year}</h2>
              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <TrendingUp className="h-4 w-4" />
                <span>Trend</span>
              </div>
            </div>
            {financialData.monthlyData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickFormatter={(value) => {
                        // Scala elastica: mostra k solo se >= 1000, altrimenti valore intero
                        if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `€${(value / 1000).toFixed(0)}k`;
                        return `€${value}`;
                      }}
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      formatter={(value: number) => [`€ ${value.toLocaleString('it-IT')}`, 'Fatturato']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar
                      dataKey="fatturato"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      name="Fatturato"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm">Nessun dato disponibile</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">I dati appariranno quando ci saranno preventivi</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (() => {
        return (
          <ScheduleEventModal
            key={selectedSlot ? `${selectedSlot.start.toISOString()}_${selectedSlot.end.toISOString()}` : 'new-schedule-dashboard'}
            trainings={coursesList as any[]}
            trainers={trainersList}
            companies={companiesList}
            persons={employeesList}
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
              // Refresh calendar data to show the new course
              fetchData();
            }}
          />
        );
      })()}
    </div>
  );
};

export default Dashboard;