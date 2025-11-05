/**
 * Template Types
 * Settings/Templates Redesign Project
 */

export enum TemplateType {
  LETTER_OF_ENGAGEMENT = 'LETTER_OF_ENGAGEMENT',
  ATTENDANCE_REGISTER = 'ATTENDANCE_REGISTER',
  CERTIFICATE = 'CERTIFICATE',
  INVOICE = 'INVOICE',
  COURSE_PROGRAM = 'COURSE_PROGRAM',
  CUSTOM = 'CUSTOM',
}

export enum TemplateFormat {
  HTML = 'HTML',
  DOCX = 'DOCX',
  GOOGLE_DOCS = 'GOOGLE_DOCS',
  GOOGLE_SLIDES = 'GOOGLE_SLIDES',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  GENERATED = 'GENERATED',
  SENT = 'SENT',
  ARCHIVED = 'ARCHIVED',
}

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  content: string | null;
  header: string | null;
  footer: string | null;
  fileFormat: TemplateFormat;
  logoImage: string | null;
  logoPosition: string | null;
  
  // Versioning
  version: number;
  isActive: boolean;
  
  // Markers and Schema
  markers: MarkerDefinition[] | null;
  markerSchema: any | null;
  
  // Layout and Styling
  styles: TemplateStyles | null;
  layout: TemplateLayout | null;
  
  // Google Integration
  googleDocsUrl: string | null;
  googleDocsId: string | null;
  googleSlidesId: string | null;
  lastSyncedAt: Date | null;
  syncEnabled: boolean;
  autoSync: boolean;
  
  // Metadata
  description: string | null;
  category: string | null;
  tags: string[];
  isDefault: boolean;
  
  // Relations
  createdBy: string | null;
  companyId: string | null;
  tenantId: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  
  // Populated relations
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  versions?: TemplateVersion[];
  _count?: {
    versions: number;
    generatedDocs: number;
  };
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  content: string | null;
  header: string | null;
  footer: string | null;
  styles: TemplateStyles | null;
  layout: TemplateLayout | null;
  markers: MarkerDefinition[] | null;
  changesSummary: string | null;
  changeDetails: any | null;
  createdBy: string;
  createdAt: Date;
  tenantId: string;
  
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface MarkerDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'list' | 'object';
  category?: string;
  required?: boolean;
  format?: string;
  description?: string;
  example?: string;
}

export interface TemplateStyles {
  fontSize?: string;
  fontFamily?: string;
  lineHeight?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  backgroundColor?: string;
  padding?: string;
  customCSS?: string;
}

export interface TemplateLayout {
  pageSize?: 'A4' | 'LETTER' | 'LEGAL';
  orientation?: 'portrait' | 'landscape';
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  headerHeight?: string;
  footerHeight?: string;
  columns?: number;
}

export interface TemplateFilters {
  type?: TemplateType;
  category?: string;
  isActive?: boolean;
  search?: string;
}

export interface TemplatePagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface TemplateListResponse {
  success: boolean;
  data: Template[];
  pagination: TemplatePagination;
}

export interface TemplateResponse {
  success: boolean;
  data: Template;
  message?: string;
}

export interface CreateTemplateData {
  name: string;
  type: TemplateType;
  content?: string;
  header?: string;
  footer?: string;
  fileFormat?: TemplateFormat;
  logoImage?: string;
  logoPosition?: string;
  markers?: MarkerDefinition[];
  markerSchema?: any;
  styles?: TemplateStyles;
  layout?: TemplateLayout;
  description?: string;
  category?: string;
  tags?: string[];
  companyId?: string;
  isDefault?: boolean;
}

export interface UpdateTemplateData extends Partial<CreateTemplateData> {
  isActive?: boolean;
  syncEnabled?: boolean;
  autoSync?: boolean;
  changesSummary?: string;
}
