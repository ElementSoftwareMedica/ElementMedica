import { createService } from './serviceFactory';
import type { Course, CourseSchedule, CourseEnrollment } from '../types/courses';
import { apiGet, apiPost, apiPut, apiUpload } from './api';
import { ImportWithTemplateResponse } from '../types';

// Re-export types per compatibilità con le importazioni esistenti
export type { Course, CourseSchedule, CourseEnrollment };

// Definizione dei tipi per il pattern factory
export type CourseCreate = Omit<Course, 'id' | 'createdAt' | 'updatedAt'>;
export type CourseUpdate = Partial<Course>;

// Creazione del servizio base usando la factory
const baseService = createService<Course, CourseCreate, CourseUpdate>('/api/v1/courses');

// Tipo per opzioni API con headers multi-tenant
type ApiOptions = Record<string, unknown> & { headers?: Record<string, string> };

// Estensione del servizio con metodi specifici e conversione dei campi
const courseService = baseService.extend({
  // Sovrascriviamo i metodi standard per convertire i campi numerici
  create: async (data: CourseCreate, options?: ApiOptions): Promise<Course> => {
    // Garantiamo che i campi numerici siano del tipo corretto
    const processedData = {
      ...data,
      // Normalizzazione identificativi opzionali
      slug: (data as any).slug !== undefined ? (String((data as any).slug).trim() || undefined) : undefined,
      code: (data as any).code !== undefined ? (String((data as any).code).trim() || undefined) : undefined,
      // Numerici
      validityYears: data.validityYears !== undefined ? Number(data.validityYears) : undefined,
      price: data.price !== undefined ? Number(data.price) : undefined,
      pricePerPerson: data.pricePerPerson !== undefined ? Number(data.pricePerPerson) : undefined,
      maxPeople: data.maxPeople !== undefined ? Number(data.maxPeople) : undefined,
      // Campi durata: restano stringhe (normalizzate)
      duration: (data as any).duration !== undefined ? (String((data as any).duration).trim() || undefined) : undefined,
      practicalHours: (data as any).practicalHours !== undefined ? (Number((data as any).practicalHours) || undefined) : undefined,
    };

    return baseService.create(processedData, options);
  },

  update: async (id: string, data: CourseUpdate, options?: ApiOptions): Promise<Course> => {
    // Garantiamo che i campi numerici siano del tipo corretto
    const processedData = {
      ...data,
      // Normalizzazione identificativi opzionali
      slug: (data as any).slug !== undefined ? (String((data as any).slug).trim() || undefined) : undefined,
      code: (data as any).code !== undefined ? (String((data as any).code).trim() || undefined) : undefined,
      // Numerici
      validityYears: data.validityYears !== undefined ? Number(data.validityYears) : undefined,
      price: data.price !== undefined ? Number(data.price) : undefined,
      pricePerPerson: data.pricePerPerson !== undefined ? Number(data.pricePerPerson) : undefined,
      maxPeople: data.maxPeople !== undefined ? Number(data.maxPeople) : undefined,
      // Campi durata: restano stringhe (normalizzate)
      duration: (data as any).duration !== undefined ? (String((data as any).duration).trim() || undefined) : undefined,
      practicalHours: (data as any).practicalHours !== undefined ? (Number((data as any).practicalHours) || undefined) : undefined,
    };

    return baseService.update(id, processedData, options);
  },

  // Helper interno per mappare le enrollments del backend (person) nel tipo frontend atteso (employee)
  _mapEnrollments: (enrollments: any[]): CourseEnrollment[] => {
    return (enrollments || []).map((e: any) => ({
      id: e.id,
      scheduleId: e.scheduleId,
      employeeId: e.personId || e.employeeId, // compat
      status: e.status,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      employee: e.person
        ? {
          id: e.person.id,
          firstName: e.person.firstName,
          lastName: e.person.lastName,
          email: e.person.email,
          company: e.person.company
            ? { id: e.person.company.id, name: e.person.company.name }
            : undefined,
        }
        : e.employee,
    }));
  },

  // Metodi specifici per i corsi
  createCourseSchedule: async (schedule: Omit<CourseSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<CourseSchedule> => {
    // Backend espone POST /api/v1/schedules
    return await apiPost<CourseSchedule>('/api/v1/schedules', schedule);
  },

  enrollEmployees: async (scheduleId: string, employeeIds: string[]): Promise<CourseEnrollment[]> => {
    // Backend: aggiornamento iscrizioni tramite PUT /api/v1/schedules/:id con { personIds }
    const updatedSchedule = await apiPut<any>(`/api/v1/schedules/${scheduleId}`, { personIds: employeeIds });
    return courseService._mapEnrollments(updatedSchedule?.enrollments || []);
  },

  getCourseEnrollments: async (scheduleId: string): Promise<CourseEnrollment[]> => {
    // Backend non espone /schedules/:id/enrollments, si utilizza GET /schedules/:id e si estraggono le iscrizioni
    const schedule = await apiGet<any>(`/api/v1/schedules/${scheduleId}`);
    return courseService._mapEnrollments(schedule?.enrollments || []);
  },

  importWithTemplate: async (
    courseId: string,
    templateFile: File
  ): Promise<ImportWithTemplateResponse> => {
    const formData = new FormData();
    formData.append('template', templateFile);

    return apiUpload<ImportWithTemplateResponse>(
      `/api/v1/courses/${courseId}/import-with-template`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  getSchedules: async (courseId: string): Promise<CourseSchedule[]> => {
    // Backend espone GET /api/v1/schedules; filtriamo client-side per courseId
    const all = await apiGet<CourseSchedule[]>(`/api/v1/schedules` as any);
    return (all || []).filter((s: any) => s.courseId === courseId);
  },
});

// Transform helper: camelCase (backend) → snake_case (frontend compatibility)
const transformCourseToFrontend = (course: any): any => {
  return {
    ...course,
    // Map camelCase → snake_case per compatibilità con modal
    risk_level: course.riskLevel || course.risk_level,
    course_type: course.courseType || course.course_type,
    // Mantieni anche i campi originali per backward compatibility
    riskLevel: course.riskLevel,
    courseType: course.courseType,
  };
};

// Esportazione dei metodi standard con trasformazione
export const getCourses = async (...args: Parameters<typeof courseService.getAll>) => {
  const courses = await courseService.getAll(...args);
  return (courses || []).map(transformCourseToFrontend);
};

export const getCourse = async (id: string) => {
  const course = await courseService.getById(id);
  return course ? transformCourseToFrontend(course) : null;
};

export const createCourse = courseService.create;
export const updateCourse = courseService.update;
export const deleteCourse = courseService.delete;

// Esportazione dei metodi specifici
export const createCourseSchedule = courseService.createCourseSchedule;
export const enrollEmployees = courseService.enrollEmployees;
export const getCourseEnrollments = courseService.getCourseEnrollments;
export const importWithTemplate = courseService.importWithTemplate;
export const getSchedules = courseService.getSchedules;

// Esportazione del servizio completo come default
export default courseService;