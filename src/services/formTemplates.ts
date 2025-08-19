import { apiGet, apiPost, apiPut, apiDelete } from './api';

interface BackendFormTemplate {
  id: string;
  name: string;
  description?: string;
  form_fields?: FormField[];
  fields?: FormField[];
  [key: string]: unknown;
}

interface BackendFormSubmission {
  id: string;
  formTemplateId: string;
  formTemplate?: BackendFormTemplate;
  data: Record<string, unknown>;
  submittedAt: string;
  submittedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'pending' | 'processed' | 'archived';
  notes?: string;
  processedAt?: string;
  processedBy?: string;
  tenantId: string;
}

/**
 * Trasforma i dati del template dal formato backend (snake_case) al formato frontend (camelCase)
 */
function transformFormTemplate(template: BackendFormTemplate): FormTemplate {
  const { form_fields, ...rest } = template;
  return {
    ...rest,
    fields: form_fields || template.fields || []
  } as FormTemplate;
}

/**
 * Trasforma un array di template
 */
function transformFormTemplates(templates: BackendFormTemplate[]): FormTemplate[] {
  return templates.map(transformFormTemplate);
}

export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'date' | 'number';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  conditional?: {
    field: string;
    value: string | string[];
    operator: 'equals' | 'not_equals' | 'contains' | 'in';
  };
  entityMapping?: {
    entity: 'Person' | 'Company' | 'CourseSchedule';
    field: string;
  };
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  isActive: boolean;
  isPublic: boolean;
  allowAnonymous: boolean;
  successMessage?: string;
  redirectUrl?: string;
  emailNotifications?: {
    enabled: boolean;
    recipients: string[];
    subject: string;
    template: string;
  };
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

export interface FormSubmission {
  id: string;
  formTemplateId: string;
  formTemplate?: FormTemplate;
  data: Record<string, unknown>;
  submittedAt: string;
  submittedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'pending' | 'processed' | 'archived';
  notes?: string;
  processedAt?: string;
  processedBy?: string;
  tenantId: string;
}

export interface CreateFormTemplateRequest {
  name: string;
  description?: string;
  fields: FormField[];
  isActive?: boolean;
  isPublic?: boolean;
  allowAnonymous?: boolean;
  successMessage?: string;
  redirectUrl?: string;
  emailNotifications?: {
    enabled: boolean;
    recipients: string[];
    subject: string;
    template: string;
  };
}

export interface UpdateFormTemplateRequest extends Partial<CreateFormTemplateRequest> {}

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
    const response = await apiGet<{ success: boolean; data: BackendFormTemplate[]; pagination: { total: number; pages: number } }>('/api/v1/form-templates');
    return transformFormTemplates(response.data);
  }

  async getFormTemplate(id: string): Promise<FormTemplate> {
    const response = await apiGet<{ success: boolean; data: BackendFormTemplate }>(`/api/v1/form-templates/${id}`);
    return transformFormTemplate(response.data);
  }

  async createFormTemplate(data: CreateFormTemplateRequest): Promise<FormTemplate> {
    const response = await apiPost<{ success: boolean; data: BackendFormTemplate }>('/api/v1/form-templates', data);
    return transformFormTemplate(response.data);
  }

  async updateFormTemplate(id: string, data: UpdateFormTemplateRequest): Promise<FormTemplate> {
    const response = await apiPut<{ success: boolean; data: BackendFormTemplate }>(`/api/v1/form-templates/${id}`, data);
    return transformFormTemplate(response.data);
  }

  async deleteFormTemplate(id: string): Promise<void> {
    await apiDelete(`/api/v1/form-templates/${id}`);
  }

  async duplicateFormTemplate(id: string, name: string): Promise<FormTemplate> {
    const response = await apiPost<{ success: boolean; data: BackendFormTemplate }>(`/api/v1/form-templates/${id}/duplicate`, { name });
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
    const url = queryString ? `/api/v1/submissions/advanced?${queryString}` : '/api/v1/submissions/advanced';
    
    const response = await apiGet<{ data: BackendFormSubmission[]; pagination: { total: number; pages: number } }>(url);
    
    // Trasforma i formTemplate inclusi nelle submissions
    const transformedSubmissions = response.data.map((submission: BackendFormSubmission) => {
       const { formTemplate, ...rest } = submission;
       const transformedSubmission: FormSubmission = {
         ...rest,
         formTemplate: formTemplate ? transformFormTemplate(formTemplate) : undefined
       };
       return transformedSubmission;
     });
    
    return {
      submissions: transformedSubmissions,
      total: response.pagination.total,
      pages: response.pagination.pages
    };
  }

  async getFormSubmission(id: string): Promise<FormSubmission> {
    const response = await apiGet<{ success: boolean; data: BackendFormSubmission }>(`/api/v1/submissions/advanced/${id}`);
    
    const { formTemplate, ...rest } = response.data;
     const transformedSubmission: FormSubmission = {
       ...rest,
       formTemplate: formTemplate ? transformFormTemplate(formTemplate) : undefined
     };
     
     return transformedSubmission;
  }

  async updateSubmissionStatus(id: string, status: 'pending' | 'processed' | 'archived', notes?: string): Promise<FormSubmission> {
    const response = await apiPut<{ success: boolean; data: BackendFormSubmission }>(`/api/v1/submissions/advanced/${id}`, { status, notes });
    
    const { formTemplate, ...rest } = response.data;
     const transformedSubmission: FormSubmission = {
       ...rest,
       formTemplate: formTemplate ? transformFormTemplate(formTemplate) : undefined
     };
     
     return transformedSubmission;
  }

  async deleteFormSubmission(id: string): Promise<void> {
    await apiDelete(`/api/v1/submissions/advanced/${id}`);
  }

  async exportSubmissions(formTemplateId?: string, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams();
    if (formTemplateId) params.append('formTemplateId', formTemplateId);
    params.append('format', format);
    
    // Costruisce l'URL solo con i parametri se presenti
    const queryString = params.toString();
    const url = queryString ? `/api/v1/submissions/advanced/export?${queryString}` : '/api/v1/submissions/advanced/export';
    
    // Per il download di blob, usiamo una configurazione speciale
    const response = await apiGet<Blob>(url, {
      responseType: 'blob'
    });
    return response;
  }

  // Public form submission (for frontend pubblico)
  async submitPublicForm(formTemplateId: string, data: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    return await apiPost<{ success: boolean; message: string }>(`/api/public/forms/${formTemplateId}/submit`, data);
  }

  async getPublicForm(id: string): Promise<FormTemplate> {
    const response = await apiGet<BackendFormTemplate>(`/api/public/forms/${id}`);
    return transformFormTemplate(response);
  }
}

export const formTemplatesService = new FormTemplatesService();

// Export individual functions for convenience
export const getFormTemplates = () => formTemplatesService.getFormTemplates();
export const getFormTemplate = (id: string) => formTemplatesService.getFormTemplate(id);
export const createFormTemplate = (data: CreateFormTemplateRequest) => formTemplatesService.createFormTemplate(data);
export const updateFormTemplate = (id: string, data: UpdateFormTemplateRequest) => formTemplatesService.updateFormTemplate(id, data);
export const deleteFormTemplate = (id: string) => formTemplatesService.deleteFormTemplate(id);
export const duplicateFormTemplate = (id: string, name: string) => formTemplatesService.duplicateFormTemplate(id, name);

export const getFormSubmissions = (filters?: FormSubmissionFilters): Promise<{ submissions: FormSubmission[]; total: number; pages: number }> => formTemplatesService.getFormSubmissions(filters);
export const getFormSubmission = (id: string) => formTemplatesService.getFormSubmission(id);
export const updateSubmissionStatus = (id: string, status: 'pending' | 'processed' | 'archived', notes?: string) => formTemplatesService.updateSubmissionStatus(id, status, notes);
export const deleteSubmission = (id: string) => formTemplatesService.deleteFormSubmission(id);
export const exportSubmissions = (formTemplateId?: string, format: 'csv' | 'excel' = 'csv') => formTemplatesService.exportSubmissions(formTemplateId, format);

export const submitPublicForm = (formTemplateId: string, data: Record<string, unknown>) => formTemplatesService.submitPublicForm(formTemplateId, data);
export const getPublicForm = (id: string) => formTemplatesService.getPublicForm(id);