/**
 * Hook per filtraggio automatico dati basato sul ruolo utente
 * 
 * Questo hook centralizza la logica di filtraggio per:
 * - TRAINER: vede solo i corsi dove è formatore/co-formatore
 * - EMPLOYEE: vede solo i corsi a cui è iscritto
 * - COMPANY_MANAGER: vede dati della propria azienda
 * - SITE_MANAGER: vede dati della propria sede
 * - ADMIN/TRAINING_ADMIN: vede tutto
 * 
 * @author ElementMedica Team
 * @version 1.0.0
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

// Definizione tipi di ruolo che hanno filtri speciali
export type FilteredRoleType =
  | 'ADMIN'
  | 'TRAINING_ADMIN'
  | 'TRAINER'
  | 'EMPLOYEE'
  | 'COMPANY_MANAGER'
  | 'SITE_MANAGER'
  | 'HR_MANAGER'
  | 'CONSULTANT'
  | 'AUDITOR';

// Interfacce per i dati filtrabili
export interface FilterableSchedule {
  id: string;
  trainerId?: string;
  coTrainerId?: string;
  enrollments?: Array<{ personId?: string; employeeId?: string }>;
  companies?: Array<{ companyId: string }>;
  [key: string]: unknown;
}

export interface FilterableCourse {
  id: string;
  trainerId?: string;
  schedules?: FilterableSchedule[];
  [key: string]: unknown;
}

export interface FilterablePerson {
  id: string;
  companyId?: string;
  siteId?: string;
  [key: string]: unknown;
}

export interface FilterableCompany {
  id: string;
  [key: string]: unknown;
}

// Tipo per le opzioni di filtraggio
export interface RoleFilterOptions {
  includeCoTrainer?: boolean;  // Per TRAINER: include anche corsi come co-formatore
  includeEnrollments?: boolean; // Per EMPLOYEE: include corsi iscritti
  strictSiteFilter?: boolean;   // Per SITE_MANAGER: filtra solo per sede, non azienda
}

// Risultato del hook
export interface UseRoleBasedDataResult {
  // Info utente
  userId: string | null;
  userRole: FilteredRoleType | null;
  userCompanyId: string | null;
  userSiteId: string | null;

  // Checks ruolo
  isAdmin: boolean;
  isTrainingAdmin: boolean;
  isTrainer: boolean;
  isEmployee: boolean;
  isCompanyManager: boolean;
  isSiteManager: boolean;

  // Funzione generica di filtraggio
  hasFullAccess: boolean;

  // Funzioni di filtraggio specifiche
  filterSchedules: <T extends FilterableSchedule>(schedules: T[], options?: RoleFilterOptions) => T[];
  filterCourses: <T extends FilterableCourse>(courses: T[], options?: RoleFilterOptions) => T[];
  filterPersons: <T extends FilterablePerson>(persons: T[]) => T[];
  filterCompanies: <T extends FilterableCompany>(companies: T[]) => T[];

  // Utility per costruire parametri API
  getScheduleApiParams: () => Record<string, string>;
  getCourseApiParams: () => Record<string, string>;
  getPersonApiParams: () => Record<string, string>;

  // Check se un record specifico è visibile
  canViewSchedule: (schedule: FilterableSchedule) => boolean;
  canViewCourse: (course: FilterableCourse) => boolean;
  canViewPerson: (person: FilterablePerson) => boolean;
}

/**
 * Hook principale per il filtraggio basato sul ruolo
 */
export function useRoleBasedData(): UseRoleBasedDataResult {
  const { user, hasPermission } = useAuth();

  // Estrai informazioni utente
  // roleType è ora disponibile direttamente nell'interfaccia Person
  const userId = user?.id || null;
  const userRole = (user?.roleType || user?.roles?.[0] || user?.role || null) as FilteredRoleType | null;
  const userCompanyId = user?.companyId || null;
  // siteId è in PersonTenantProfile, denormalizzato nel profilo utente
  const userSiteId = user?.siteId || null;

  // Determina i ruoli
  const isAdmin = useMemo((): boolean => {
    return userRole === 'ADMIN' || user?.roles?.includes('SUPER_ADMIN') === true || user?.roles?.includes('ADMIN') === true;
  }, [userRole, user?.roles]);

  const isTrainingAdmin = useMemo((): boolean => {
    return userRole === 'TRAINING_ADMIN';
  }, [userRole]);

  const isTrainer = useMemo((): boolean => {
    return userRole === 'TRAINER';
  }, [userRole]);

  const isEmployee = useMemo((): boolean => {
    return userRole === 'EMPLOYEE';
  }, [userRole]);

  const isCompanyManager = useMemo((): boolean => {
    return userRole === 'COMPANY_MANAGER';
  }, [userRole]);

  const isSiteManager = useMemo((): boolean => {
    return userRole === 'SITE_MANAGER';
  }, [userRole]);

  // Check accesso completo
  const hasFullAccess = useMemo((): boolean => {
    return isAdmin || isTrainingAdmin;
  }, [isAdmin, isTrainingAdmin]);

  /**
   * Filtra schedules in base al ruolo
   */
  const filterSchedules = useCallback(<T extends FilterableSchedule>(
    schedules: T[],
    options: RoleFilterOptions = {}
  ): T[] => {
    // Admin/TrainingAdmin vedono tutto
    if (hasFullAccess) {
      return schedules;
    }

    if (!userId) {
      return [];
    }

    // TRAINER: vede solo i corsi dove è formatore
    if (isTrainer) {
      return schedules.filter(schedule => {
        const isMainTrainer = schedule.trainerId === userId;
        const isCoTrainer = options.includeCoTrainer !== false && schedule.coTrainerId === userId;
        return isMainTrainer || isCoTrainer;
      });
    }

    // EMPLOYEE: vede solo i corsi a cui è iscritto
    if (isEmployee) {
      return schedules.filter(schedule => {
        if (!schedule.enrollments) return false;
        return schedule.enrollments.some(e =>
          e.personId === userId || e.employeeId === userId
        );
      });
    }

    // COMPANY_MANAGER: vede corsi della propria azienda
    if (isCompanyManager && userCompanyId) {
      return schedules.filter(schedule => {
        if (!schedule.companies) return false;
        return schedule.companies.some(c => c.companyId === userCompanyId);
      });
    }

    // SITE_MANAGER: vede corsi della propria azienda (con filtro sede opzionale)
    if (isSiteManager && userCompanyId) {
      return schedules.filter(schedule => {
        if (!schedule.companies) return false;
        // Per ora filtra solo per azienda, il filtro sede può essere aggiunto
        return schedule.companies.some(c => c.companyId === userCompanyId);
      });
    }

    // Default: nessun filtro speciale
    return schedules;
  }, [hasFullAccess, userId, isTrainer, isEmployee, isCompanyManager, isSiteManager, userCompanyId]);

  /**
   * Filtra courses in base al ruolo
   */
  const filterCourses = useCallback(<T extends FilterableCourse>(
    courses: T[],
    options: RoleFilterOptions = {}
  ): T[] => {
    // Admin/TrainingAdmin vedono tutto
    if (hasFullAccess) {
      return courses;
    }

    if (!userId) {
      return [];
    }

    // TRAINER: corsi dove è formatore in almeno uno schedule
    if (isTrainer) {
      return courses.filter(course => {
        const isDirectTrainer = course.trainerId === userId;
        const isScheduleTrainer = course.schedules?.some(s =>
          s.trainerId === userId || (options.includeCoTrainer !== false && s.coTrainerId === userId)
        );
        return isDirectTrainer || isScheduleTrainer;
      });
    }

    // EMPLOYEE: corsi a cui è iscritto
    if (isEmployee) {
      return courses.filter(course => {
        return course.schedules?.some(s =>
          s.enrollments?.some(e => e.personId === userId || e.employeeId === userId)
        );
      });
    }

    return courses;
  }, [hasFullAccess, userId, isTrainer, isEmployee]);

  /**
   * Filtra persone in base al ruolo
   */
  const filterPersons = useCallback(<T extends FilterablePerson>(
    persons: T[]
  ): T[] => {
    // Admin/TrainingAdmin vedono tutto
    if (hasFullAccess) {
      return persons;
    }

    // COMPANY_MANAGER: vede solo persone della propria azienda
    if (isCompanyManager && userCompanyId) {
      return persons.filter(p => p.companyId === userCompanyId);
    }

    // SITE_MANAGER: vede solo persone della propria sede
    if (isSiteManager && userSiteId) {
      return persons.filter(p => p.siteId === userSiteId);
    }

    // EMPLOYEE: vede solo se stesso
    if (isEmployee && userId) {
      return persons.filter(p => p.id === userId);
    }

    return persons;
  }, [hasFullAccess, isCompanyManager, isSiteManager, isEmployee, userCompanyId, userSiteId, userId]);

  /**
   * Filtra aziende in base al ruolo
   */
  const filterCompanies = useCallback(<T extends FilterableCompany>(
    companies: T[]
  ): T[] => {
    // Admin/TrainingAdmin vedono tutto
    if (hasFullAccess) {
      return companies;
    }

    // COMPANY_MANAGER/SITE_MANAGER: vede solo la propria azienda
    if ((isCompanyManager || isSiteManager || isEmployee) && userCompanyId) {
      return companies.filter(c => c.id === userCompanyId);
    }

    return companies;
  }, [hasFullAccess, isCompanyManager, isSiteManager, isEmployee, userCompanyId]);

  /**
   * Costruisce parametri API per schedules
   */
  const getScheduleApiParams = useCallback((): Record<string, string> => {
    if (hasFullAccess) return {};

    if (isTrainer && userId) {
      return { trainerId: userId, includeCoTrainer: 'true' };
    }

    if (isEmployee && userId) {
      return { enrolledPersonId: userId };
    }

    if ((isCompanyManager || isSiteManager) && userCompanyId) {
      return { companyId: userCompanyId };
    }

    return {};
  }, [hasFullAccess, isTrainer, isEmployee, isCompanyManager, isSiteManager, userId, userCompanyId]);

  /**
   * Costruisce parametri API per courses
   */
  const getCourseApiParams = useCallback((): Record<string, string> => {
    if (hasFullAccess) return {};

    if (isTrainer && userId) {
      return { trainerId: userId };
    }

    if (isEmployee && userId) {
      return { enrolledPersonId: userId };
    }

    return {};
  }, [hasFullAccess, isTrainer, isEmployee, userId]);

  /**
   * Costruisce parametri API per persons
   */
  const getPersonApiParams = useCallback((): Record<string, string> => {
    if (hasFullAccess) return {};

    if (isCompanyManager && userCompanyId) {
      return { companyId: userCompanyId };
    }

    if (isSiteManager && userSiteId) {
      return { siteId: userSiteId };
    }

    return {};
  }, [hasFullAccess, isCompanyManager, isSiteManager, userCompanyId, userSiteId]);

  /**
   * Verifica se l'utente può vedere uno schedule specifico
   */
  const canViewSchedule = useCallback((schedule: FilterableSchedule): boolean => {
    if (hasFullAccess) return true;
    if (!userId) return false;

    if (isTrainer) {
      return schedule.trainerId === userId || schedule.coTrainerId === userId;
    }

    if (isEmployee) {
      return schedule.enrollments?.some(e =>
        e.personId === userId || e.employeeId === userId
      ) ?? false;
    }

    if ((isCompanyManager || isSiteManager) && userCompanyId) {
      return schedule.companies?.some(c => c.companyId === userCompanyId) ?? false;
    }

    return false;
  }, [hasFullAccess, userId, isTrainer, isEmployee, isCompanyManager, isSiteManager, userCompanyId]);

  /**
   * Verifica se l'utente può vedere un corso specifico
   */
  const canViewCourse = useCallback((course: FilterableCourse): boolean => {
    if (hasFullAccess) return true;
    if (!userId) return false;

    if (isTrainer) {
      if (course.trainerId === userId) return true;
      return course.schedules?.some(s =>
        s.trainerId === userId || s.coTrainerId === userId
      ) ?? false;
    }

    if (isEmployee) {
      return course.schedules?.some(s =>
        s.enrollments?.some(e => e.personId === userId || e.employeeId === userId)
      ) ?? false;
    }

    return true;
  }, [hasFullAccess, userId, isTrainer, isEmployee]);

  /**
   * Verifica se l'utente può vedere una persona specifica
   */
  const canViewPerson = useCallback((person: FilterablePerson): boolean => {
    if (hasFullAccess) return true;

    // Utente può sempre vedere se stesso
    if (person.id === userId) return true;

    if (isCompanyManager && userCompanyId) {
      return person.companyId === userCompanyId;
    }

    if (isSiteManager && userSiteId) {
      return person.siteId === userSiteId;
    }

    if (isEmployee) {
      return person.id === userId;
    }

    return false;
  }, [hasFullAccess, userId, isCompanyManager, isSiteManager, isEmployee, userCompanyId, userSiteId]);

  return {
    // Info utente
    userId,
    userRole,
    userCompanyId,
    userSiteId,

    // Checks ruolo
    isAdmin,
    isTrainingAdmin,
    isTrainer,
    isEmployee,
    isCompanyManager,
    isSiteManager,

    // Accesso completo
    hasFullAccess,

    // Funzioni di filtraggio
    filterSchedules,
    filterCourses,
    filterPersons,
    filterCompanies,

    // Parametri API
    getScheduleApiParams,
    getCourseApiParams,
    getPersonApiParams,

    // Check visibilità singolo record
    canViewSchedule,
    canViewCourse,
    canViewPerson
  };
}

export default useRoleBasedData;
