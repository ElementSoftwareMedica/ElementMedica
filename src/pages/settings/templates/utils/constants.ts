/**
 * Template Constants
 * Settings/Templates Redesign Project
 */

import { TemplateType, TemplateFormat } from '../types/template.types';

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  [TemplateType.LETTER_OF_ENGAGEMENT]: 'Lettera di Incarico',
  [TemplateType.ATTENDANCE_REGISTER]: 'Registro Presenze',
  [TemplateType.CERTIFICATE]: 'Attestato',
  [TemplateType.INVOICE]: 'Fattura',
  [TemplateType.COURSE_PROGRAM]: 'Programma Corso',
  [TemplateType.CUSTOM]: 'Personalizzato',
};

export const TEMPLATE_FORMAT_LABELS: Record<TemplateFormat, string> = {
  [TemplateFormat.HTML]: 'HTML',
  [TemplateFormat.DOCX]: 'Microsoft Word',
  [TemplateFormat.GOOGLE_DOCS]: 'Google Docs',
  [TemplateFormat.GOOGLE_SLIDES]: 'Google Slides',
};

export const PAGE_SIZES = {
  A4: { width: '210mm', height: '297mm' },
  LETTER: { width: '8.5in', height: '11in' },
  LEGAL: { width: '8.5in', height: '14in' },
} as const;

export const DEFAULT_LAYOUT = {
  pageSize: 'A4' as const,
  orientation: 'portrait' as const,
  marginTop: '20mm',
  marginRight: '20mm',
  marginBottom: '20mm',
  marginLeft: '20mm',
  headerHeight: '15mm',
  footerHeight: '15mm',
  columns: 1,
};

export const DEFAULT_STYLES = {
  fontSize: '12pt',
  fontFamily: 'Arial, sans-serif',
  lineHeight: '1.5',
  textAlign: 'left' as const,
  color: '#000000',
  backgroundColor: '#ffffff',
  padding: '0',
};

export const AUTOSAVE_INTERVAL = 30000; // 30 seconds

export const MARKER_CATEGORIES = [
  { id: 'course', label: 'Corso', icon: '📚' },
  { id: 'student', label: 'Studente', icon: '👤' },
  { id: 'company', label: 'Azienda', icon: '🏢' },
  { id: 'trainer', label: 'Formatore', icon: '👨‍🏫' },
  { id: 'document', label: 'Documento', icon: '📄' },
  { id: 'date', label: 'Date', icon: '📅' },
  { id: 'custom', label: 'Personalizzato', icon: '⚙️' },
] as const;

export const COMMON_MARKERS = [
  // Course markers
  { key: 'course.name', label: 'Nome Corso', type: 'text' as const, category: 'course' },
  { key: 'course.code', label: 'Codice Corso', type: 'text' as const, category: 'course' },
  { key: 'course.duration', label: 'Durata Corso', type: 'number' as const, category: 'course' },
  { key: 'course.startDate', label: 'Data Inizio', type: 'date' as const, category: 'course' },
  { key: 'course.endDate', label: 'Data Fine', type: 'date' as const, category: 'course' },
  
  // Student markers
  { key: 'student.fullName', label: 'Nome Completo', type: 'text' as const, category: 'student' },
  { key: 'student.firstName', label: 'Nome', type: 'text' as const, category: 'student' },
  { key: 'student.lastName', label: 'Cognome', type: 'text' as const, category: 'student' },
  { key: 'student.taxCode', label: 'Codice Fiscale', type: 'text' as const, category: 'student' },
  { key: 'student.birthDate', label: 'Data di Nascita', type: 'date' as const, category: 'student' },
  
  // Company markers
  { key: 'company.name', label: 'Ragione Sociale', type: 'text' as const, category: 'company' },
  { key: 'company.vatNumber', label: 'Partita IVA', type: 'text' as const, category: 'company' },
  { key: 'company.address', label: 'Indirizzo', type: 'text' as const, category: 'company' },
  { key: 'company.city', label: 'Città', type: 'text' as const, category: 'company' },
  
  // Trainer markers
  { key: 'trainer.fullName', label: 'Nome Formatore', type: 'text' as const, category: 'trainer' },
  { key: 'trainer.qualifications', label: 'Qualifiche', type: 'text' as const, category: 'trainer' },
  
  // Document markers
  { key: 'document.number', label: 'Numero Documento', type: 'text' as const, category: 'document' },
  { key: 'document.date', label: 'Data Documento', type: 'date' as const, category: 'document' },
  { key: 'document.year', label: 'Anno', type: 'number' as const, category: 'document' },
  
  // Date markers
  { key: 'date.today', label: 'Data Odierna', type: 'date' as const, category: 'date' },
  { key: 'date.currentYear', label: 'Anno Corrente', type: 'number' as const, category: 'date' },
];

export const EDITOR_EXTENSIONS_CONFIG = {
  placeholder: 'Inizia a scrivere il tuo template... Usa {{ per inserire marker dinamici.',
  enableSpellCheck: true,
  enableAutoComplete: true,
  enableTableSupport: true,
  enableImageSupport: true,
};

export const LOGO_POSITIONS = [
  { value: 'top-left', label: 'In alto a sinistra' },
  { value: 'top-center', label: 'In alto al centro' },
  { value: 'top-right', label: 'In alto a destra' },
  { value: 'bottom-left', label: 'In basso a sinistra' },
  { value: 'bottom-center', label: 'In basso al centro' },
  { value: 'bottom-right', label: 'In basso a destra' },
] as const;

export const FONT_FAMILIES = [
  'Arial, sans-serif',
  'Helvetica, sans-serif',
  'Times New Roman, serif',
  'Georgia, serif',
  'Courier New, monospace',
  'Verdana, sans-serif',
  'Calibri, sans-serif',
] as const;

export const FONT_SIZES = [
  '8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '32pt',
] as const;

export const LINE_HEIGHTS = [
  '1.0', '1.15', '1.5', '2.0', '2.5', '3.0',
] as const;

export const API_ENDPOINTS = {
  TEMPLATES: '/api/v1/templates',
  TEMPLATE_BY_ID: (id: string) => `/api/v1/templates/${id}`,
  TEMPLATE_VERSIONS: (id: string) => `/api/v1/templates/${id}/versions`,
  TEMPLATE_DUPLICATE: (id: string) => `/api/v1/templates/${id}/duplicate`,
  TEMPLATE_RESTORE: (id: string) => `/api/v1/templates/${id}/restore-version`,
  TEMPLATE_PREVIEW: (id: string) => `/api/v1/templates/${id}/preview`,
} as const;
