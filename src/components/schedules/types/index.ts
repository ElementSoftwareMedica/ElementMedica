// Centralized type definitions for schedules module
// This file unifies all Training-related types to avoid conflicts

import type { RiskLevel, CourseType } from '../../../constants/scheduleModal';

// Unified Training interface that accommodates all use cases
export interface Training {
  id: string | number;
  title?: string;
  name?: string;
  certifications?: string[] | string;
  duration?: string | number; // Flexible to handle both API responses and computed values
  maxParticipants?: number;
  minParticipants?: number;
  riskLevel?: RiskLevel | 'ALTO' | 'MEDIO' | 'BASSO' | 'A' | 'B' | 'C' | string; // Union of all possible values
  courseType?: CourseType | 'PRIMO_CORSO' | 'AGGIORNAMENTO' | string; // Union of all possible values
  pricePerPerson?: number; // Price from Course model
  [key: string]: unknown; // Allow additional properties for API flexibility without using any
}

// Schedule date entry type
export interface ScheduleDateEntry {
  date: string;
  start: string;
  end: string;
  trainerId: string | number;
  coTrainerId: string | number;
  /** ID della CourseSession nel database (disponibile solo per schedule esistenti) */
  sessionId?: string;
}

// Option type for dropdowns
export interface Option {
  value: string;
  label: string;
}

// Trainer interface
export interface Trainer {
  id: string | number;
  firstName: string;
  lastName: string;
  certifications?: string[] | string;
  email?: string;
  hourlyRate?: number | string; // Progetto 48: Supporta sia number che string (Decimal)
}

// Person interface
export interface Person {
  id: string | number;
  firstName: string;
  lastName: string;
  email?: string;
  companyId?: string | number;
  company?: { id?: string | number; ragioneSociale?: string; name?: string };
  position?: string;
  birthDate?: string;
}

// Form data interface
export interface ScheduleFormData {
  training_id?: string | number;
  trainer_id?: string | number;
  co_trainer_id?: string | number;
  risk_level?: string;
  course_type?: string;
  location?: string;
  max_participants?: number;
  notes?: string;
  delivery_mode?: string;
  dates?: ScheduleDateEntry[];
  isPublic?: boolean;
  [key: string]: unknown;
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  error: string;
}

// Dynamic options result interface
export interface DynamicOptionsResult {
  riskOpts: Option[];
  typeOpts: Option[];
  riskValid: boolean;
  typeValid: boolean;
  titleEmpty: boolean;
}

// Variant selection result interface
export interface VariantSelectionResult {
  id?: string | number;
  details?: Training;
}

// Certificate filter interface
export interface CertificateFilter {
  allOf: string[];
  anyOf: string[];
}

export type FormData = ScheduleFormData;