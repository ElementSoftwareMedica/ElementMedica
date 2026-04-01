/**
 * Template Management Types
 * 
 * Type definitions for template and document management system.
 * Aligned with backend Prisma schema and API responses.
 */

// Enums (must match backend)
export type TemplateType =
  | 'LETTER_OF_ENGAGEMENT'
  | 'ATTENDANCE_REGISTER'
  | 'CERTIFICATE'
  | 'INVOICE'
  | 'COURSE_PROGRAM'
  | 'PREVENTIVO'
  | 'SLIDES'
  | 'VISITA_MEDICA'
  | 'CUSTOM';

export type TemplateFormat =
  | 'HTML'
  | 'DOCX'
  | 'GOOGLE_DOCS'
  | 'GOOGLE_SLIDES';

export type DocumentStatus =
  | 'DRAFT'
  | 'GENERATED'
  | 'SENT'
  | 'ARCHIVED';

// Template interfaces
export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  fileFormat?: TemplateFormat;

  // Content
  content?: string;
  header?: string;
  footer?: string;

  // Layout & Styling
  styles?: Record<string, any>;
  layout?: TemplateLayout;
  logoImage?: string;
  logoPosition?: string;

  // Marker configuration
  markers?: Record<string, any>;
  markerSchema?: Record<string, any>;

  // Versioning
  version: number;
  isActive: boolean;
  isDefault: boolean;

  // Google Integration
  googleDocsUrl?: string;
  lastSyncedAt?: string;
  syncEnabled: boolean;

  // Metadata
  description?: string;
  category?: string;
  tags: string[];

  // Multi-tenant & Audit
  companyId?: string;
  tenantId: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;

  // Relations (populated by backend)
  company?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  versions?: TemplateVersion[];
  _count?: {
    generatedDocs: number;
    versions: number;
  };
}

export interface TemplateLayout {
  pageSize?: 'A4' | 'A3' | 'LETTER' | 'LEGAL';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;

  // Snapshot of content
  content: string;
  header?: string;
  footer?: string;
  styles?: Record<string, any>;
  layout?: TemplateLayout;
  markers?: Record<string, any>;

  // Change tracking
  changesSummary?: string;
  changeDetails?: Record<string, any>;

  // Metadata
  createdBy: string;
  createdAt: string;
  tenantId: string;

  // Relations
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface GeneratedDocument {
  id: string;

  // Template reference
  templateId: string;
  templateVersion: number;
  type: TemplateType;

  // Entity reference
  entityType: string;
  entityId: string;

  // File info
  filename: string;
  filepath: string;
  fileUrl: string;
  fileSize: number;
  fileHash?: string;
  mimeType: string;

  // Generation context
  markers: Record<string, any>;
  metadata?: Record<string, any>;
  status: DocumentStatus;

  // Batch reference
  batchId?: string;
  batchSize?: number;
  batchIndex?: number;

  // Delivery
  sentAt?: string;
  sentTo?: string;
  downloadCount: number;
  lastDownloadAt?: string;

  // Audit
  generatedBy: string;
  generatedAt: string;
  tenantId: string;
  deletedAt?: string;

  // Relations (populated by backend)
  template?: {
    id: string;
    name: string;
    type: TemplateType;
    version: number;
  };
  generator?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
}

// Request/Response types
export interface TemplateListParams {
  page?: number;
  limit?: number;
  type?: TemplateType;
  isActive?: boolean;
  isDefault?: boolean;
  category?: string;
  search?: string;
}

export interface TemplateListResponse {
  data: Template[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TemplateCreateData {
  name: string;
  type: TemplateType;
  content?: string;
  header?: string;
  footer?: string;
  styles?: Record<string, any>;
  layout?: TemplateLayout;
  markers?: Record<string, any>;
  markerSchema?: Record<string, any>;
  isDefault?: boolean;
  companyId?: string;
  description?: string;
  category?: string;
  tags?: string[];
  googleDocsUrl?: string;
  syncEnabled?: boolean;
}

export interface TemplateUpdateData extends Partial<TemplateCreateData> {
  isActive?: boolean;
}

export interface MarkerValidationResult {
  valid: boolean;
  errors: Array<{
    marker: string;
    message: string;
    suggestion?: string[];
    availableFormatters?: string[];
  }>;
  warnings: Array<{
    marker: string;
    message: string;
  }>;
  markerCount: number;
}

export interface MarkerPreviewResult {
  html: string;
  markers: Array<{
    raw: string;
    path: string;
    formatter: string | null;
    type: string;
  }>;
}

export interface DocumentGenerateParams {
  entityType: string;
  entityId: string;
  options?: {
    sendEmail?: boolean;
    email?: string;
  };
}

export interface BatchGenerateParams {
  entityType: string;
  entityIds: string[];
  options?: {
    sendEmail?: boolean;
  };
}

export interface BatchGenerateResponse {
  batchId: string;
  status: 'PENDING';
  totalDocuments: number;
}

export interface BatchStatusResponse {
  batchId: string;
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  percentage: number;
  documents: Array<{
    id: string;
    status: DocumentStatus | 'IN_PROGRESS';
  }>;
}

export interface DocumentListParams {
  page?: number;
  limit?: number;
  templateId?: string;
  type?: TemplateType;
  status?: DocumentStatus;
  entityType?: string;
  entityId?: string;
  batchId?: string;
  startDate?: string;
  endDate?: string;
}

export interface DocumentListResponse {
  data: GeneratedDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TemplateStatistics {
  templates: {
    total: number;
    active: number;
    inactive: number;
  };
  documents: {
    total: number;
    byType: Record<TemplateType, number>;
    byStatus: Record<DocumentStatus, number>;
  };
  topTemplates: Array<{
    id: string;
    name: string;
    type: TemplateType;
    documentsGenerated: number;
  }>;
}

export interface DocumentStatistics {
  total: number;
  byType: Record<TemplateType, number>;
  byStatus: Record<DocumentStatus, number>;
  totalSize: number;
  averageSize: number;
}

export interface RollbackVersionResponse {
  message: string;
  template: Template;
  rolledBackFrom: number;
  rolledBackTo: number;
  newVersion: number;
}

export interface ResendDocumentParams {
  email: string;
  subject?: string;
  message?: string;
}

export interface ResendDocumentResponse {
  message: string;
  documentId: string;
  sentTo: string;
}

// Marker definitions for picker UI
export interface MarkerDefinition {
  key: string;
  label: string;
  description?: string;
  category: string;
  example?: string;
  formatters?: string[];
}

export interface MarkerCategory {
  id: string;
  label: string;
  icon?: string;
  markers: MarkerDefinition[];
}
