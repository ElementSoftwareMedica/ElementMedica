/**
 * Form Field Type Icons Utility
 * Maps field types to Lucide React icons
 */

import {
  Type,
  Mail,
  Phone,
  MessageSquare,
  List,
  CheckSquare,
  Circle,
  Calendar,
  Hash,
  FileUp,
  ListChecks,
  CircleDot,
  CheckCircle2,
  FileText,
  Home,
  CreditCard,
  Globe,
  User,
  Star,
  Sliders,
  Heading1,
  Code
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type FormFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'number'
  | 'file'
  | 'multiple_choice'
  | 'single_choice'
  | 'true_false'
  | 'fill_in_blank'
  | 'address'
  | 'fiscal_code'
  | 'vat_number'
  | 'phone_number'
  | 'section_header'
  | 'html_content'
  | 'signature'
  | 'rating'
  | 'slider';

/**
 * Mapping completo dei tipi di campo alle icone Lucide React
 */
export const FIELD_TYPE_ICONS: Record<FormFieldType, LucideIcon> = {
  // Campi Base
  text: Type,
  email: Mail,
  tel: Phone,
  textarea: MessageSquare,
  select: List,
  checkbox: CheckSquare,
  radio: Circle,
  date: Calendar,
  number: Hash,
  file: FileUp,

  // Test/Quiz
  multiple_choice: ListChecks,
  single_choice: CircleDot,
  true_false: CheckCircle2,
  fill_in_blank: FileText,

  // Anagrafiche
  address: Home,
  fiscal_code: CreditCard,
  vat_number: CreditCard,
  phone_number: Phone,

  // Utility
  section_header: Heading1,
  html_content: Code,
  signature: User,
  rating: Star,
  slider: Sliders
};

/**
 * Colori associati ai tipi di campo (per badge/labels)
 */
export const FIELD_TYPE_COLORS: Record<FormFieldType, string> = {
  // Campi Base - Grigio
  text: 'gray',
  email: 'blue',
  tel: 'blue',
  textarea: 'gray',
  select: 'gray',
  checkbox: 'gray',
  radio: 'gray',
  date: 'gray',
  number: 'gray',
  file: 'gray',

  // Test/Quiz - Viola
  multiple_choice: 'purple',
  single_choice: 'purple',
  true_false: 'purple',
  fill_in_blank: 'purple',

  // Anagrafiche - Blu
  address: 'blue',
  fiscal_code: 'blue',
  vat_number: 'blue',
  phone_number: 'blue',

  // Utility - Verde
  section_header: 'green',
  html_content: 'green',
  signature: 'green',
  rating: 'yellow',
  slider: 'yellow'
};

/**
 * Labels leggibili per ogni tipo di campo
 */
export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  // Campi Base
  text: 'Testo Breve',
  email: 'Email',
  tel: 'Telefono',
  textarea: 'Testo Lungo',
  select: 'Menu a Tendina',
  checkbox: 'Checkbox',
  radio: 'Pulsanti Radio',
  date: 'Data',
  number: 'Numero',
  file: 'Upload File',

  // Test/Quiz
  multiple_choice: 'Scelta Multipla',
  single_choice: 'Singola Scelta',
  true_false: 'Vero/Falso',
  fill_in_blank: 'Riempi gli Spazi',

  // Anagrafiche
  address: 'Indirizzo Completo',
  fiscal_code: 'Codice Fiscale',
  vat_number: 'Partita IVA',
  phone_number: 'Numero di Telefono',

  // Utility
  section_header: 'Intestazione Sezione',
  html_content: 'Contenuto HTML',
  signature: 'Firma Digitale',
  rating: 'Valutazione (Stelle)',
  slider: 'Slider'
};

/**
 * Gruppi di tipi di campo per organizzazione UI
 */
export const FIELD_TYPE_GROUPS = [
  {
    label: 'Campi Base',
    types: [
      'text',
      'textarea',
      'number',
      'email',
      'tel',
      'date',
      'file'
    ] as FormFieldType[]
  },
  {
    label: 'Selezione',
    types: [
      'select',
      'radio',
      'checkbox'
    ] as FormFieldType[]
  },
  {
    label: 'Test / Quiz',
    types: [
      'multiple_choice',
      'single_choice',
      'true_false',
      'fill_in_blank'
    ] as FormFieldType[]
  },
  {
    label: 'Anagrafiche',
    types: [
      'address',
      'fiscal_code',
      'vat_number',
      'phone_number'
    ] as FormFieldType[]
  },
  {
    label: 'Utility',
    types: [
      'section_header',
      'html_content',
      'rating',
      'signature',
      'slider'
    ] as FormFieldType[]
  }
];

/**
 * Ottieni l'icona per un tipo di campo
 */
export function getFieldTypeIcon(type: FormFieldType | string): LucideIcon {
  return FIELD_TYPE_ICONS[type as FormFieldType] || Type;
}

/**
 * Ottieni il colore per un tipo di campo
 */
export function getFieldTypeColor(type: FormFieldType | string): string {
  return FIELD_TYPE_COLORS[type as FormFieldType] || 'gray';
}

/**
 * Ottieni la label per un tipo di campo
 */
export function getFieldTypeLabel(type: FormFieldType | string): string {
  return FIELD_TYPE_LABELS[type as FormFieldType] || type;
}

/**
 * Verifica se un tipo di campo richiede opzioni (select, radio, etc)
 */
export function fieldTypeRequiresOptions(type: FormFieldType | string): boolean {
  return [
    'select',
    'radio',
    'checkbox',
    'multiple_choice',
    'single_choice'
  ].includes(type);
}

/**
 * Verifica se un tipo di campo è per quiz/test
 */
export function isQuizFieldType(type: FormFieldType | string): boolean {
  return [
    'multiple_choice',
    'single_choice',
    'true_false',
    'fill_in_blank'
  ].includes(type);
}

/**
 * Verifica se un tipo di campo supporta validation rules avanzate
 */
export function supportsAdvancedValidation(type: FormFieldType | string): boolean {
  return ![
    'section_header',
    'html_content'
  ].includes(type);
}
