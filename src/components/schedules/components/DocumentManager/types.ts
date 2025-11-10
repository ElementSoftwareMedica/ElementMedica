/**
 * Types for DocumentManager component
 * 
 * This module contains all type definitions for document management,
 * including props, state, and document entities.
 */

import type { LetteraIncarico } from '../../../../services/lettereIncaricoService';
import type { RegistroPresenze } from '../../../../services/registriPresenzeService';
import type { Attestato } from '../../../../services/attestatiService';

// Re-export service types
export type { LetteraIncarico, RegistroPresenze, Attestato };

// Base types from parent
export type DateEntry = import('../../types').ScheduleDateEntry;

export interface Person {
  id: string | number;
  firstName: string;
  lastName: string;
}

export interface Training {
  id: string | number;
  name?: string;
  nome?: string;
  title?: string;
  price?: number;
  prezzo?: number;
}

export interface Company {
  id: string | number;
  ragioneSociale?: string;
  businessName?: string;
}

export interface Preventivo {
  id: string | number;
  numero: number;
  anno: number;
  stato: 'BOZZA' | 'INVIATO' | 'ACCETTATO' | 'RIFIUTATO';
  scheduleId?: string | number;
  companyId?: string | number;
  totale?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Main component props interface
 */
export interface DocumentManagerProps {
  status: string;
  onStatusChange: (status: string) => void;
  selectedPersons: (string | number)[];
  selectedCompanies: (string | number)[];
  attendance: Record<number, (string | number)[]>;
  dates: DateEntry[];
  showStatusMenu: boolean;
  onShowStatusMenuChange: (show: boolean) => void;
  scheduleId?: string | number | null;
  trainers?: Array<{ id: string | number; firstName: string; lastName: string }>;
  persons?: Person[];
  selectedCourse?: Training;
  companies?: Company[];
  pendingPreventiviIds?: string[];
  onPendingPreventiviCreated?: (ids: string[]) => void;
}

/**
 * Document state container
 */
export interface DocumentState {
  lettereList: LetteraIncarico[];
  registriList: RegistroPresenze[];
  attestatiList: Attestato[];
  preventiviList: Preventivo[];
}

/**
 * Loading state for document operations
 */
export interface LoadingState {
  lettere: boolean;
  registri: boolean;
  attestati: boolean;
}

/**
 * UI state for modals and menus
 */
export interface UIState {
  refreshKey: number;
  showRegenerateModal: boolean;
  showPreventiviModal: boolean;
  editingPreventivo: Preventivo | null;
}

/**
 * Document type enumeration
 */
export enum DocumentType {
  LETTERA_INCARICO = 'LETTERA_INCARICO',
  REGISTRO_PRESENZE = 'REGISTRO_PRESENZE',
  ATTESTATO = 'ATTESTATO',
  PREVENTIVO = 'PREVENTIVO'
}

/**
 * Base generation options
 */
export interface GenerationOptions {
  scheduleId: string | number;
  sendEmail?: boolean;
}

/**
 * Options for lettere di incarico generation
 */
export interface LettereGenerationOptions extends GenerationOptions {
  trainerIds: string[];
}

/**
 * Options for registro presenze generation
 */
export interface RegistroGenerationOptions {
  sessionId: string | number;
  formatoreId: string | number;
  attendanceData: Array<{
    personId: string | number;
    present: boolean;
    hours?: number;
  }>;
}

/**
 * Options for attestati generation
 */
export interface AttestatiGenerationOptions extends GenerationOptions {
  personIds: (string | number)[];
  regenerateExisting?: boolean;
}

/**
 * Status information structure
 */
export interface StatusInfo {
  color: string;
  description: string;
  icon?: string;
}
