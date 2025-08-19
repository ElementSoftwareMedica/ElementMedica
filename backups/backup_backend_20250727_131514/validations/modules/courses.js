/**
 * Validazioni Modulo COURSES
 * Sistema corsi e formazione
 */

import { z } from 'zod';

// === VALIDAZIONI MODELLO ===

// Course Validation
export const CourseSchema = z.object({
  // TODO: Implementare validazioni specifiche per Course
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateCourseSchema = CourseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateCourseSchema = CreateCourseSchema.partial();

// CourseSchedule Validation
export const CourseScheduleSchema = z.object({
  // TODO: Implementare validazioni specifiche per CourseSchedule
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateCourseScheduleSchema = CourseScheduleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateCourseScheduleSchema = CreateCourseScheduleSchema.partial();

// CourseEnrollment Validation
export const CourseEnrollmentSchema = z.object({
  // TODO: Implementare validazioni specifiche per CourseEnrollment
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateCourseEnrollmentSchema = CourseEnrollmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateCourseEnrollmentSchema = CreateCourseEnrollmentSchema.partial();

// CourseSession Validation
export const CourseSessionSchema = z.object({
  // TODO: Implementare validazioni specifiche per CourseSession
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional()
});

export const CreateCourseSessionSchema = CourseSessionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateCourseSessionSchema = CreateCourseSessionSchema.partial();

// === EXPORT MODULO ===

export default {
  CourseSchema,
  CreateCourseSchema,
  UpdateCourseSchema,
  CourseScheduleSchema,
  CreateCourseScheduleSchema,
  UpdateCourseScheduleSchema,
  CourseEnrollmentSchema,
  CreateCourseEnrollmentSchema,
  UpdateCourseEnrollmentSchema,
  CourseSessionSchema,
  CreateCourseSessionSchema,
  UpdateCourseSessionSchema
};
