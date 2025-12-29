import { apiGet, apiPost, apiPut, apiDelete } from './api';
import type {
  FormTemplate as FormTemplateType,
  FormField as FormFieldType,
  FormSubmission as FormSubmissionType,
  ConditionalLogic,
  EntityMapping,
  ScoringConfig,
  TemplateSettings
} from '../types/forms';

interface BackendFormTemplate {
  id: string;
  name: string;
  description?: string;
  form_fields?: FormFieldType[];
  fields?: FormFieldType[];
  settings?: TemplateSettings;
  isPublic?: boolean;
  allowAnonymous?: boolean;
  submissionsCount?: number;
  [key: string]: unknown;
}

interface BackendFormSubmission {
  id: string;
  formTemplateId?: string;
  formTemplate?: BackendFormTemplate;
  data?: Record<string, unknown>;
  formData?: Record<string, unknown>;
  submittedAt?: string;
  createdAt?: string;
  submittedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'NEW' | 'READ' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED' | 'pending' | 'reviewed' | 'archived';
  notes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  score?: number;
  maxScore?: number;
  passed?: boolean;
  attemptNumber?: number;
  tenantId: string;
  // ContactSubmission specific fields
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  subject?: string;
  message?: string;
  templateName?: string;
}

/**
 * Trasforma i dati del template dal formato backend (snake_case) al formato frontend (camelCase)
 */
function transformFormTemplate(template: BackendFormTemplate): FormTemplate {
  const { form_fields, submissionsCount, ...rest } = template;
  return {
    ...rest,
    fields: form_fields || template.fields || [],
    settings: template.settings || undefined,
    isPublic: template.isPublic || false,
    allowAnonymous: template.allowAnonymous || false,
    submissionsCount: submissionsCount || 0
  } as FormTemplate;
}

/**
 * Trasforma un array di template
 */
function transformFormTemplates(templates: BackendFormTemplate[]): FormTemplate[] {
  return templates.map(transformFormTemplate);
}

// Re-export types from forms.ts with backward-compatible aliases
export type FormField = FormFieldType;
export type FormTemplate = FormTemplateType;
export type FormSubmission = FormSubmissionType;

// Export new advanced types
export type {
  ConditionalLogic,
  EntityMapping,
  ScoringConfig,
  TemplateSettings
};

// Base URL for forms API
const BASE_URL = '/api/v1/forms';

export interface CreateFormTemplateRequest {
  name: string;
  description?: string;
  type: string;  // Required: CUSTOM_FORM, CONTACT_FORM, REGISTRATION, etc.
  fields: FormField[];
  isActive?: boolean;
  isPublic?: boolean;
  allowAnonymous?: boolean;
  settings?: {
    sections?: FormSection[];
    enableWizard?: boolean;
    showProgress?: boolean;
    allowSaveDraft?: boolean;
  };
  successMessage?: string;
  redirectUrl?: string;
  emailNotifications?: {
    enabled: boolean;
    recipients: string[];
    subject: string;
    template: string;
  };
}

export type UpdateFormTemplateRequest = Partial<CreateFormTemplateRequest>;

export interface FormSubmissionFilters {
  formTemplateId?: string;
  status?: 'pending' | 'processed' | 'archived';
  dateFrom?: string;
  dateTo?: string;
  submittedBy?: string;
  type?: string;
  source?: string;
}

class FormTemplatesService {
  // Form Templates
  async getFormTemplates(): Promise<FormTemplate[]> {
    const response = await apiGet<{ success: boolean; data: BackendFormTemplate[]; pagination: { total: number; pages: number } }>(`${BASE_URL}/templates`);
    return transformFormTemplates(response.data);
  }

  async getFormTemplate(id: string): Promise<FormTemplate> {
    const response = await apiGet<{ success: boolean; data: BackendFormTemplate }>(`${BASE_URL}/templates/${id}`);
    console.log('🔍 getFormTemplate raw response:', {
      id,
      responseKeys: Object.keys(response),
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      hasFormFields: !!response.data?.form_fields,
      formFieldsCount: response.data?.form_fields?.length || 0
    });
    const transformed = transformFormTemplate(response.data);
    console.log('🔍 getFormTemplate transformed:', {
      id,
      fieldsCount: transformed.fields?.length || 0
    });
    return transformed;
  }

  async createFormTemplate(data: CreateFormTemplateRequest): Promise<FormTemplate> {
    const response = await apiPost<{ success: boolean; data: BackendFormTemplate }>(`${BASE_URL}/templates`, data);
    return transformFormTemplate(response.data);
  }

  async updateFormTemplate(id: string, data: UpdateFormTemplateRequest): Promise<FormTemplate> {
    const response = await apiPut<{ success: boolean; data: BackendFormTemplate }>(`${BASE_URL}/templates/${id}`, data);
    return transformFormTemplate(response.data);
  }

  async deleteFormTemplate(id: string): Promise<void> {
    await apiDelete(`${BASE_URL}/templates/${id}`);
  }

  async duplicateFormTemplate(id: string, name: string): Promise<FormTemplate> {
    const response = await apiPost<{ success: boolean; data: BackendFormTemplate }>(`${BASE_URL}/templates/${id}/duplicate`, { name });
    return transformFormTemplate(response.data);
  }

  // Form Submissions
  async getFormSubmissions(filters?: FormSubmissionFilters): Promise<{ submissions: FormSubmission[]; total: number; pages: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value);
        }
      });
    }

    // Costruisce l'URL solo con i parametri se presenti
    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}/submissions?${queryString}` : `${BASE_URL}/submissions`;

    const response = await apiGet<{ data: BackendFormSubmission[]; pagination: { total: number; pages: number } }>(url);

    // Trasforma i formTemplate inclusi nelle submissions
    const transformedSubmissions = response.data.map((submission: BackendFormSubmission) => {
      const { formTemplate, formTemplateId, data, ...rest } = submission;
      return {
        ...rest,
        templateId: formTemplateId,
        formData: data,
        formTemplate: formTemplate ? transformFormTemplate(formTemplate) : undefined
      } as FormSubmission;
    });

    return {
      submissions: transformedSubmissions,
      total: response.pagination.total,
      pages: response.pagination.pages
    };
  }

  async getFormSubmission(id: string): Promise<FormSubmission> {
    const response = await apiGet<{ success: boolean; data: BackendFormSubmission }>(`${BASE_URL}/submissions/${id}`);

    const { formTemplate, formTemplateId, data, ...rest } = response.data;
    return {
      ...rest,
      templateId: formTemplateId,
      formData: data,
      formTemplate: formTemplate ? transformFormTemplate(formTemplate) : undefined
    } as FormSubmission;
  }

  async updateSubmissionStatus(id: string, status: FormSubmission['status'], notes?: string): Promise<FormSubmission> {
    const response = await apiPut<{ success: boolean; data: BackendFormSubmission }>(`${BASE_URL}/submissions/${id}`, { status, notes });

    const { formTemplate, formTemplateId, data, ...rest } = response.data;
    return {
      ...rest,
      templateId: formTemplateId,
      formData: data,
      formTemplate: formTemplate ? transformFormTemplate(formTemplate) : undefined
    } as FormSubmission;
  }

  async deleteFormSubmission(id: string): Promise<void> {
    await apiDelete(`${BASE_URL}/submissions/${id}`);
  }

  async exportSubmissions(formTemplateId?: string, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams();
    if (formTemplateId) params.append('formTemplateId', formTemplateId);
    params.append('format', format);

    const url = `${BASE_URL}/submissions/export?${params.toString()}`;
    const blob = await apiGet<Blob>(url, { responseType: 'blob' });
    return blob;
  }

  // Public forms submission (alias for submitPublicForm)
  async submitForm(formTemplateId: string, data: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    return this.submitPublicForm(formTemplateId, data);
  }

  async submitPublicForm(templateId: string, formData: Record<string, any>, visitedSectionIds?: string[]): Promise<void> {
    await apiPost(`/api/public/forms/${templateId}/submit`, { formData, visitedSectionIds });
  }

  async getPublicForm(id: string): Promise<FormTemplate> {
    const response = await apiGet<{ success: boolean; data: BackendFormTemplate }>(`/api/public/forms/${id}`);
    return transformFormTemplate(response.data);
  }

  async getPublicTemplate(id: string): Promise<FormTemplate> {
    const response = await apiGet<{ success: boolean; data: BackendFormTemplate }>(`${BASE_URL}/public/${id}`);
    return transformFormTemplate(response.data);
  }
}

const formTemplatesService = new FormTemplatesService();

// Export the service instance as default
export default formTemplatesService;

// Also export as named export for backward compatibility
export { formTemplatesService };

// Export helper functions
export const getFormTemplates = () => formTemplatesService.getFormTemplates();
export const getFormTemplate = (id: string) => formTemplatesService.getFormTemplate(id);
export const createFormTemplate = (data: CreateFormTemplateRequest) => formTemplatesService.createFormTemplate(data);
export const updateFormTemplate = (id: string, data: UpdateFormTemplateRequest) => formTemplatesService.updateFormTemplate(id, data);
export const deleteFormTemplate = (id: string) => formTemplatesService.deleteFormTemplate(id);
export const duplicateFormTemplate = (id: string, name: string) => formTemplatesService.duplicateFormTemplate(id, name);

export const getFormSubmissions = (filters?: FormSubmissionFilters): Promise<{ submissions: FormSubmission[]; total: number; pages: number }> => formTemplatesService.getFormSubmissions(filters);
export const getFormSubmission = (id: string) => formTemplatesService.getFormSubmission(id);
export const updateSubmissionStatus = (id: string, status: FormSubmission['status'], notes?: string) => formTemplatesService.updateSubmissionStatus(id, status, notes);
export const deleteSubmission = (id: string) => formTemplatesService.deleteFormSubmission(id);
export const exportSubmissions = (formTemplateId?: string, format: 'csv' | 'excel' = 'csv') => formTemplatesService.exportSubmissions(formTemplateId, format);

export const submitForm = (formTemplateId: string, data: Record<string, unknown>) => formTemplatesService.submitForm(formTemplateId, data);
export const submitPublicForm = (formTemplateId: string, data: Record<string, unknown>) => formTemplatesService.submitPublicForm(formTemplateId, data);
export const getPublicForm = (id: string) => formTemplatesService.getPublicForm(id);