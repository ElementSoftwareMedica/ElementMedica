import { createService } from './serviceFactory';
import type { Course, CourseSchedule, CourseEnrollment } from '../types/courses';
import { apiGet, apiPost } from './api';
import { ImportWithTemplateResponse } from '../types';

// Definizione dei tipi per il pattern factory
export type CourseCreate = Omit<Course, 'id' | 'createdAt' | 'updatedAt'>;
export type CourseUpdate = Partial<Course>;

// Creazione del servizio base usando la factory
const baseService = createService<Course, CourseCreate, CourseUpdate>('/courses');

// Estensione del servizio con metodi specifici e conversione dei campi
const courseService = baseService.extend({
  // Sovrascriviamo i metodi standard per convertire i campi numerici
  create: async (data: CourseCreate): Promise<Course> => {
    // Garantiamo che i campi numerici siano del tipo corretto
    const processedData = {
      ...data,
      validityYears: data.validityYears !== undefined ? Number(data.validityYears) : undefined,
      price: data.price !== undefined ? Number(data.price) : undefined,
      pricePerPerson: data.pricePerPerson !== undefined ? Number(data.pricePerPerson) : undefined,
      maxPeople: data.maxPeople !== undefined ? Number(data.maxPeople) : undefined,
      duration: data.duration !== undefined ? Number(data.duration) : undefined,
    };
    
    return baseService.create(processedData);
  },
  
  update: async (id: string, data: CourseUpdate): Promise<Course> => {
    // Garantiamo che i campi numerici siano del tipo corretto
    const processedData = {
      ...data,
      validityYears: data.validityYears !== undefined ? Number(data.validityYears) : undefined,
      price: data.price !== undefined ? Number(data.price) : undefined,
      pricePerPerson: data.pricePerPerson !== undefined ? Number(data.pricePerPerson) : undefined,
      maxPeople: data.maxPeople !== undefined ? Number(data.maxPeople) : undefined,
      duration: data.duration !== undefined ? Number(data.duration) : undefined,
    };
    
    return baseService.update(id, processedData);
  },
  
  // Metodi specifici per i corsi
  createCourseSchedule: async (schedule: Omit<CourseSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<CourseSchedule> => {
    return await apiPost<CourseSchedule>('/course-schedules', schedule);
  },
  
  enrollEmployees: async (scheduleId: string, employeeIds: string[]): Promise<CourseEnrollment[]> => {
    return await apiPost<CourseEnrollment[]>(`/course-schedules/${scheduleId}/enrollments`, { employeeIds });
  },
  
  getCourseEnrollments: async (scheduleId: string): Promise<CourseEnrollment[]> => {
    return await apiGet<CourseEnrollment[]>(`/course-schedules/${scheduleId}/enrollments`);
  },

  importWithTemplate: async (
    courseId: string,
    templateFile: File
  ): Promise<ImportWithTemplateResponse> => {
    const formData = new FormData();
    formData.append('template', templateFile);

    return apiGet<ImportWithTemplateResponse>(
      `/courses/${courseId}/import-with-template`,
      { method: 'POST', data: formData }
    );
  },

  getSchedules: async (courseId: string): Promise<CourseSchedule[]> => {
    return await apiGet<CourseSchedule[]>(`/courses/${courseId}/schedules`);
  },
});

// Esportazione dei metodi standard
export const getCourses = courseService.getAll;
export const getCourse = courseService.getById;
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