/**
 * Advanced Form Types - Conditional Logic System
 * 
 * Type definitions for 30 conditional operators, entity mapping,
 * scoring system, and complex nested logic.
 * 
 * Based on: docs/technical/FORM_CONDITIONAL_LOGIC_SCHEMA.md
 */

// ============================================================================
// 1. Condition Operators (30 total)
// ============================================================================

export type EqualityOperator = 'equals' | 'not_equals';

export type TextOperator =
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'matches_regex'
  | 'not_matches_regex'
  | 'length_equals'
  | 'length_greater_than'
  | 'length_less_than';

export type NumericOperator =
  | 'greater'
  | 'greater_or_equal'
  | 'less'
  | 'less_or_equal'
  | 'between'
  | 'not_between'
  | 'greater_than'  // Alias for 'greater'
  | 'greater_than_or_equal'  // Alias for 'greater_or_equal'
  | 'less_than'  // Alias for 'less'
  | 'less_than_or_equal';  // Alias for 'less_or_equal'

export type DateOperator =
  | 'date_after'
  | 'date_before'
  | 'date_between'
  | 'date_equals'
  | 'date_is_today'
  | 'date_is_past'
  | 'date_is_future';

export type BooleanOperator = 'is_true' | 'is_false';

export type NullOperator = 'is_null' | 'is_not_null' | 'is_empty' | 'is_not_empty';

export type ArrayOperator =
  | 'in'
  | 'not_in'
  | 'includes_all'
  | 'includes_any'
  | 'includes_none';

export type CalculationOperator = 'sum_greater' | 'count_greater';

/**
 * All 30 supported condition operators
 */
export type ConditionOperator =
  | EqualityOperator
  | TextOperator
  | NumericOperator
  | DateOperator
  | BooleanOperator
  | NullOperator
  | ArrayOperator
  | CalculationOperator;

// ============================================================================
// 2. Condition Types
// ============================================================================

/**
 * Simple condition: field-operator-value comparison
 * Example: { field: 'age', operator: 'greater', value: 18 }
 */
export interface SimpleCondition {
  field: string;
  operator: ConditionOperator;
  value?: any; // Optional for unary operators (is_null, is_empty, etc.)
  value2?: any; // For 'between' operators (upper bound)
}

/**
 * Complex condition: nested AND/OR/NOT logic
 * Example: { operator: 'AND', conditions: [condition1, condition2] }
 * Alternative: { logic: 'AND', conditions: [condition1, condition2] }
 */
export interface ComplexCondition {
  operator?: 'AND' | 'OR' | 'NOT';
  logic?: 'AND' | 'OR' | 'NOT'; // Alternative field name
  conditions: ConditionalLogic[];
}

/**
 * Entity condition: query database entity fields
 * Example: { entity: 'Person', field: 'dateOfBirth', operator: 'date_is_past' }
 */
export interface EntityCondition {
  entity: 'Person' | 'Company' | 'CourseSchedule';
  field: string;
  operator: ConditionOperator;
  value?: any;
}

/**
 * Permission condition: RBAC-based visibility
 * Example: { type: 'role', key: 'ADMIN', operator: 'equals', value: true }
 */
export interface PermissionCondition {
  type: 'role' | 'permission' | 'tenant';
  key: string;
  operator: ConditionOperator;
  value?: any;
}

/**
 * Workflow condition: status-based visibility
 * Example: { entity: 'CourseSchedule', status: 'published' }
 */
export interface WorkflowCondition {
  entity: 'Course' | 'CourseSchedule' | 'Person' | 'Company';
  status: string;
  phase?: string; // Optional workflow phase
}

/**
 * Root conditional logic interface (union type)
 * Only ONE condition type can be active at a time
 */
export interface ConditionalLogic {
  simple?: SimpleCondition;
  complex?: ComplexCondition;
  entity?: EntityCondition;
  permission?: PermissionCondition;
  workflow?: WorkflowCondition;
}

// ============================================================================
// 3. Entity Mapping
// ============================================================================

/**
 * Entity mapping configuration for auto-populating database entities
 * Example: Map form field 'fiscalCode' to Person.codiceFiscale
 */
export interface EntityMapping {
  entity: 'Person' | 'Company';
  field: string; // Target database field name
  autoCreate?: boolean; // Auto-create entity if not exists
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'normalize_fiscal_code'; // Data transformation
}

// ============================================================================
// 4. Scoring System (Quiz/Test)
// ============================================================================

/**
 * Scoring configuration for quiz/test questions
 * Example: Multiple-choice question with correct answer and points
 */
export interface ScoringConfig {
  correctAnswer: any; // Correct answer value (string, number, array for multi-select)
  points: number; // Points awarded for correct answer
  maxAttempts?: number; // Maximum number of attempts allowed
  partialCredit?: boolean; // Award partial points for partially correct answers
  negativePoints?: number; // Points deducted for wrong answer (0 by default)
  timeLimit?: number; // Time limit in seconds (optional)
}

// ============================================================================
// 5. Form Field Types
// ============================================================================

/**
 * Field validation rules
 */
export interface FieldValidation {
  // String validations
  minLength?: number;
  maxLength?: number;
  pattern?: string; // Regex pattern
  patternMessage?: string; // Custom message for pattern validation

  // Numeric validations
  minValue?: number;
  maxValue?: number;

  // Date validations
  minDate?: string;
  maxDate?: string;

  // Array validations (checkbox, multi-select)
  minSelections?: number;
  maxSelections?: number;

  // File validations
  maxFileSize?: number; // in bytes
  acceptedFileTypes?: string; // e.g., "image/*,application/pdf"

  // Custom validation
  /** Pattern regex per validazione custom — NON codice JS (sicurezza R26) */
  customValidation?: string; // Regex pattern string (es: "^[A-Za-z0-9]+$")
}

/**
 * Extended form field with conditional logic, entity mapping, and scoring
 */
export interface FormField {
  id: string;
  templateId: string;
  name: string;
  label: string;
  type: 'TEXT' | 'EMAIL' | 'NUMBER' | 'DATE' | 'SELECT' | 'RADIO' | 'CHECKBOX' | 'TEXTAREA' | 'FILE' | 'SIGNATURE';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: any; // JSON object for select/radio/checkbox options
  validation?: FieldValidation; // Validation rules
  conditional?: ConditionalLogic; // Visibility conditional logic
  entityMapping?: EntityMapping; // Map to database entity
  scoring?: ScoringConfig; // Quiz/test scoring config
  sectionId?: string; // ID of the section this field belongs to
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// ============================================================================
// 6. Form Template Types
// ============================================================================

/**
 * Form section for organizing fields into logical groups
 */
export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  conditional?: ConditionalLogic; // Section visibility based on previous answers
  collapsible?: boolean; // Can be collapsed/expanded
  defaultCollapsed?: boolean; // Start collapsed
}

/**
 * Form template settings for quiz/test functionality
 */
export interface TemplateSettings {
  passingScore?: number; // Minimum score to pass (e.g., 18/30)
  maxScore?: number; // Maximum possible score (e.g., 30)
  timeLimit?: number; // Time limit in seconds (e.g., 3600 = 1 hour)
  showResults?: boolean; // Show results immediately after submission
  allowRetry?: boolean; // Allow multiple attempts
  randomizeQuestions?: boolean; // Randomize question order
  randomizeAnswers?: boolean; // Randomize answer order for multiple-choice
  sections?: FormSection[]; // Form sections
}

/**
 * Extended form template with settings, public flag, and anonymous submission
 */
export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'CONTACT' | 'JOB_APPLICATION' | 'QUOTE_REQUEST' | 'CONSULTATION' | 'COURSE_TEST' |
  'COURSE_EVALUATION' | 'PERSON_DATA_COLLECTION' | 'COURSE_ENROLLMENT' | 'CUSTOM_FORM';
  schema: any; // JSON schema (legacy)
  validationRules?: any; // JSON validation rules (legacy)
  conditionalFields?: any; // JSON conditional fields (legacy)
  settings?: TemplateSettings; // Template settings (quiz/test)
  isPublic: boolean; // Public form (no auth required)
  allowAnonymous: boolean; // Allow anonymous submissions
  isActive: boolean;
  version: number;
  tenantId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  fields?: FormField[]; // Relation
  submissionsCount?: number; // Count of submissions for this template
}

// ============================================================================
// 7. Form Submission Types
// ============================================================================

/**
 * Form submission with score tracking
 */
export interface FormSubmission {
  id: string;
  templateId?: string;
  formTemplate?: FormTemplate; // Included when queried with relations
  formData?: Record<string, any>; // JSON submitted form data
  status: 'NEW' | 'READ' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED' | 'pending' | 'reviewed' | 'archived';
  submittedAt?: Date | string;
  submittedBy?: string; // User ID (optional for anonymous)
  reviewedAt?: Date | string;
  reviewedBy?: string;
  tenantId: string;
  source?: 'WEB_FORM' | 'API' | 'MOBILE_APP' | 'EMAIL' | 'ADMIN_PANEL';
  ipAddress?: string;
  userAgent?: string;
  metadata?: any; // JSON metadata
  score?: number; // Quiz/test score
  maxScore?: number; // Maximum possible score
  passed?: boolean; // Whether the submission passed
  attemptNumber?: number; // Attempt number for retries
  notes?: string; // Admin notes
  processedAt?: Date | string; // Processing timestamp
  processedBy?: string; // User who processed
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string;
  // ContactSubmission specific fields
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  subject?: string;
  message?: string;
  templateName?: string;
}

// ============================================================================
// 8. Validation Functions (Type Guards)
// ============================================================================

/**
 * Validate ConditionalLogic: ensure only ONE condition type is active
 */
export function isValidConditionalLogic(logic: ConditionalLogic): boolean {
  const activeConditions = [
    logic.simple,
    logic.complex,
    logic.entity,
    logic.permission,
    logic.workflow
  ].filter(Boolean);

  if (activeConditions.length !== 1) {
    throw new Error('ConditionalLogic deve avere esattamente UN tipo di condizione attivo');
  }

  return true;
}

/**
 * Type guard for SimpleCondition
 */
export function isSimpleCondition(logic: ConditionalLogic): logic is ConditionalLogic & { simple: SimpleCondition } {
  return logic.simple !== undefined && logic.simple !== null;
}

/**
 * Type guard for ComplexCondition
 */
export function isComplexCondition(logic: ConditionalLogic): logic is ConditionalLogic & { complex: ComplexCondition } {
  return logic.complex !== undefined && logic.complex !== null;
}

/**
 * Type guard for EntityCondition
 */
export function isEntityCondition(logic: ConditionalLogic): logic is ConditionalLogic & { entity: EntityCondition } {
  return logic.entity !== undefined && logic.entity !== null;
}

/**
 * Type guard for PermissionCondition
 */
export function isPermissionCondition(logic: ConditionalLogic): logic is ConditionalLogic & { permission: PermissionCondition } {
  return logic.permission !== undefined && logic.permission !== null;
}

/**
 * Type guard for WorkflowCondition
 */
export function isWorkflowCondition(logic: ConditionalLogic): logic is ConditionalLogic & { workflow: WorkflowCondition } {
  return logic.workflow !== undefined && logic.workflow !== null;
}

// ============================================================================
// 9. Operator Validation
// ============================================================================

/**
 * Operators that require a value
 */
export const VALUE_REQUIRED_OPERATORS: ConditionOperator[] = [
  'equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with',
  'matches_regex', 'length_equals', 'greater', 'greater_or_equal', 'less', 'less_or_equal',
  'between', 'not_between', 'date_after', 'date_before', 'date_between', 'in', 'not_in',
  'sum_greater', 'count_greater'
];

/**
 * Unary operators (no value required)
 */
export const UNARY_OPERATORS: ConditionOperator[] = [
  'is_true', 'is_false', 'is_null', 'is_not_null', 'is_empty', 'is_not_empty',
  'date_is_today', 'date_is_past', 'date_is_future'
];

/**
 * Validate operator and value combination
 */
export function validateOperatorValue(operator: ConditionOperator, value: any): boolean {
  if (VALUE_REQUIRED_OPERATORS.includes(operator) && value === undefined) {
    throw new Error(`L'operatore '${operator}' richiede un valore`);
  }

  if (UNARY_OPERATORS.includes(operator) && value !== undefined) {
    if (import.meta.env.DEV) console.warn(`L'operatore '${operator}' non richiede un valore, valore ignorato: ${value}`);
  }

  return true;
}
