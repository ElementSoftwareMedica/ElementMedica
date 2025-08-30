/**
 * GDPR Components Export Index
 * Centralized exports for all GDPR-related components
 */

export { ConsentManagementTab } from './ConsentManagementTab';
export { PrivacySettingsTab } from './PrivacySettingsTab';
export { DataExportTab } from './DataExportTab';
export { DeletionRequestTab } from './DeletionRequestTab';
export { AuditTrailTab } from './AuditTrailTab';
export { ComplianceReport } from './ComplianceReport';
export { GDPROverviewCard } from './GDPROverviewCard';
export { ComplianceScoreCard } from './ComplianceScoreCard';

// Re-export types for convenience
export type {
  UseGDPRConsentReturn,
  UseAuditTrailReturn,
  UseDataExportReturn,
  UseDeletionRequestReturn,
  UsePrivacySettingsReturn,
  UseGDPRAdminReturn,
  ConsentType,
  AuditLogEntry,
  DataExportRequest,
  DeletionRequest,
  PrivacySettings,
  ComplianceReport as ComplianceReportType
} from '../../types/gdpr';