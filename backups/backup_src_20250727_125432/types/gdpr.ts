/**
 * GDPR and Privacy Types
 * TypeScript definitions for GDPR compliance features
 */

// Consent Types
export type ConsentType = 
  | 'marketing'
  | 'analytics'
  | 'functional'
  | 'authentication'
  | 'data_processing'
  | 'third_party_sharing';

export type LegalBasis = 
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interest';

export interface GDPRConsent {
  id: string;
  userId: string;
  consentType: ConsentType;
  purpose: string;
  consentGiven: boolean;
  consentDate: Date;
  consentVersion?: string;
  withdrawnAt?: Date;
  withdrawalReason?: string;
  legalBasis: LegalBasis;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Audit Trail Types
export type AuditAction = 
  | 'DATA_ACCESS'
  | 'DATA_EXPORT'
  | 'DATA_MODIFICATION'
  | 'DATA_DELETION'
  | 'CONSENT_GRANTED'
  | 'CONSENT_WITHDRAWN'
  | 'DELETION_REQUESTED'
  | 'DELETION_PROCESSED'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'PROFILE_UPDATE';

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: AuditAction;
  dataType: string;
  purpose: string;
  legalBasis: LegalBasis;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  createdAt: Date;
}

// Data Export Types
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

export interface DataExportRequest {
  id: string;
  userId: string;
  status: ExportStatus;
  requestDate: Date;
  completedDate?: Date;
  expiryDate?: Date;
  downloadUrl?: string;
  fileSize?: number;
  format: 'json' | 'csv' | 'pdf';
  includeAuditTrail: boolean;
  includeConsents: boolean;
  error?: string;
}

export interface ExportedData {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: Date;
    lastLoginAt?: Date;
  };
  consents: GDPRConsent[];
  auditTrail: AuditLogEntry[];
  profile?: Record<string, any>;
  preferences?: Record<string, any>;
  exportMetadata: {
    exportDate: Date;
    requestId: string;
    dataVersion: string;
  };
}

// Deletion Request Types
export type DeletionStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';

export interface DeletionRequest {
  id: string;
  userId: string;
  reason: string;
  confirmEmail: string;
  anonymize: boolean;
  status: DeletionStatus;
  requestDate: Date;
  processedDate?: Date;
  processedBy?: string;
  adminNotes?: string;
  scheduledDeletionDate?: Date;
}

// Privacy Settings Types
export interface PrivacySettings {
  id: string;
  userId: string;
  profileVisibility: 'public' | 'private' | 'company_only';
  emailNotifications: boolean;
  marketingEmails: boolean;
  analyticsTracking: boolean;
  thirdPartySharing: boolean;
  dataRetentionPeriod: number; // in days
  autoDeleteInactive: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: number; // in minutes
  updatedAt: Date;
}

// Compliance Report Types
export interface ComplianceMetrics {
  totalUsers: number;
  activeConsents: number;
  withdrawnConsents: number;
  pendingDeletions: number;
  completedDeletions: number;
  dataExportRequests: number;
  auditLogEntries: number;
  complianceScore: number; // 0-100
  lastAuditDate?: Date;
}

export interface ComplianceReport {
  id: string;
  companyId?: string;
  reportDate: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: ComplianceMetrics;
  consentBreakdown: Record<ConsentType, {
    granted: number;
    withdrawn: number;
    active: number;
  }>;
  auditSummary: Record<AuditAction, number>;
  recommendations: string[];
  issues: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  }[];
  generatedBy: string;
  createdAt: Date;
}

// API Response Types
export interface GDPRApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export interface ConsentResponse extends GDPRApiResponse {
  data?: {
    consent: GDPRConsent;
  };
}

export interface ConsentsListResponse extends GDPRApiResponse {
  data?: {
    consents: GDPRConsent[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface AuditTrailResponse extends GDPRApiResponse {
  data?: {
    auditTrail: AuditLogEntry[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface DataExportResponse extends GDPRApiResponse {
  data?: {
    exportRequest: DataExportRequest;
  };
}

export interface ComplianceReportResponse extends GDPRApiResponse {
  data?: {
    report: ComplianceReport;
  };
}

// Form Types
export interface ConsentFormData {
  consentType: ConsentType;
  purpose: string;
  legalBasis?: LegalBasis;
}

export interface ConsentWithdrawalFormData {
  consentType: ConsentType;
  reason: string;
}

export interface DataExportFormData {
  format: 'json' | 'csv' | 'pdf';
  includeAuditTrail: boolean;
  includeConsents: boolean;
}

export interface DeletionRequestFormData {
  reason: string;
  confirmEmail: string;
  anonymize: boolean;
  confirmDeletion: boolean;
}

export interface PrivacySettingsFormData {
  profileVisibility: 'public' | 'private' | 'company_only';
  emailNotifications: boolean;
  marketingEmails: boolean;
  analyticsTracking: boolean;
  thirdPartySharing: boolean;
  dataRetentionPeriod: number;
  autoDeleteInactive: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: number;
}

// Hook Return Types
export interface UseGDPRConsentReturn {
  consents: GDPRConsent[];
  loading: boolean;
  error: string | null;
  grantConsent: (data: ConsentFormData) => Promise<void>;
  withdrawConsent: (data: ConsentWithdrawalFormData) => Promise<void>;
  refreshConsents: () => Promise<void>;
}

export interface UseAuditTrailReturn {
  auditTrail: AuditLogEntry[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  fetchAuditTrail: (filters?: AuditTrailFilters) => Promise<void>;
  nextPage: () => void;
  prevPage: () => void;
}

export interface UseDataExportReturn {
  exportRequests: DataExportRequest[];
  loading: boolean;
  error: string | null;
  requestExport: (data: DataExportFormData) => Promise<void>;
  downloadExport: (requestId: string) => Promise<void>;
  refreshRequests: () => Promise<void>;
}

export interface UseGDPRAdminReturn {
  deletionRequests: DeletionRequest[];
  complianceReport: ComplianceReport | null;
  loading: boolean;
  error: string | null;
  processDeletionRequest: (requestId: string, approve: boolean, notes?: string) => Promise<void>;
  generateComplianceReport: (companyId?: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

// Filter Types
export interface AuditTrailFilters {
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  dataType?: string;
  limit?: number;
  offset?: number;
}

export interface ConsentFilters {
  consentType?: ConsentType;
  status?: 'active' | 'withdrawn';
  startDate?: Date;
  endDate?: Date;
}

export interface DeletionRequestFilters {
  status?: DeletionStatus;
  startDate?: Date;
  endDate?: Date;
  companyId?: string;
}

// Constants
export const CONSENT_TYPES: Record<ConsentType, { label: string; description: string }> = {
  marketing: {
    label: 'Marketing Communications',
    description: 'Receive promotional emails and marketing materials'
  },
  analytics: {
    label: 'Analytics & Performance',
    description: 'Help us improve our service through usage analytics'
  },
  functional: {
    label: 'Functional Cookies',
    description: 'Enable enhanced functionality and personalization'
  },
  authentication: {
    label: 'Authentication',
    description: 'Required for login and security features'
  },
  data_processing: {
    label: 'Data Processing',
    description: 'Process your data for core service functionality'
  },
  third_party_sharing: {
    label: 'Third-party Sharing',
    description: 'Share data with trusted partners for enhanced services'
  }
};

export const LEGAL_BASIS_LABELS: Record<LegalBasis, string> = {
  consent: 'User Consent',
  contract: 'Contract Performance',
  legal_obligation: 'Legal Obligation',
  vital_interests: 'Vital Interests',
  public_task: 'Public Task',
  legitimate_interest: 'Legitimate Interest'
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  DATA_ACCESS: 'Data Access',
  DATA_EXPORT: 'Data Export',
  DATA_MODIFICATION: 'Data Modification',
  DATA_DELETION: 'Data Deletion',
  CONSENT_GRANTED: 'Consent Granted',
  CONSENT_WITHDRAWN: 'Consent Withdrawn',
  DELETION_REQUESTED: 'Deletion Requested',
  DELETION_PROCESSED: 'Deletion Processed',
  LOGIN: 'User Login',
  LOGOUT: 'User Logout',
  PASSWORD_CHANGE: 'Password Change',
  PROFILE_UPDATE: 'Profile Update'
};