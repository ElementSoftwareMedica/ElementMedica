/**
 * GDPR Types - Tipi per conformità GDPR
 * 
 * Definisce i tipi specifici per la gestione della conformità GDPR
 * nel template di pagina.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

/**
 * Livelli di audit GDPR
 */
export type GDPRAuditLevel = 'minimal' | 'standard' | 'comprehensive';

/**
 * Azioni audit GDPR
 */
export type GDPRAuditAction = 
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'IMPORT'
  | 'SEARCH'
  | 'FILTER'
  | 'VIEW'
  | 'BULK_DELETE'
  | 'BULK_UPDATE'
  | 'ANONYMIZE'
  | 'RESTORE';

/**
 * Tipi di consenso GDPR
 */
export type GDPRConsentType = 
  | 'DATA_PROCESSING'
  | 'DATA_STORAGE'
  | 'DATA_SHARING'
  | 'MARKETING'
  | 'ANALYTICS'
  | 'PROFILING'
  | 'AUTOMATED_DECISION';

/**
 * Configurazione GDPR principale
 */
export interface GDPRConfig {
  /** Richiede consenso esplicito per le operazioni */
  requiresConsent: boolean;
  
  /** Livello di audit logging */
  auditLevel: GDPRAuditLevel;
  
  /** Giorni di retention dei dati */
  dataRetentionDays: number;
  
  /** Campi considerati sensibili */
  sensitiveFields: string[];
  
  /** Campi da anonimizzare in caso di cancellazione */
  anonymizationFields: string[];
  
  /** Campi che devono essere crittografati */
  encryptedFields: string[];
  
  /** Configurazione consensi specifici */
  consentConfig?: GDPRConsentConfig;
  
  /** Configurazione audit avanzata */
  auditConfig?: GDPRAuditConfig;
  
  /** Configurazione data minimization */
  dataMinimizationConfig?: GDPRDataMinimizationConfig;
  
  /** Configurazione audit (legacy) */
  audit?: {
    retentionDays: number;
    enabled?: boolean;
    includeUserAgent?: boolean;
    includeIpAddress?: boolean;
  };
  
  /** Configurazione data minimization (legacy) */
  dataMinimization?: {
    enabled: boolean;
    rules?: any[];
  };
  
  /** Configurazione right to be forgotten (legacy) */
  rightToBeForgotten?: {
    enabled: boolean;
    automatedDeletion?: boolean;
  };
  
  /** Configurazione consent (legacy) */
  consent?: {
    enabled: boolean;
    requiredConsents?: any[];
    consentExpirationDays?: number;
  };
}

/**
 * Configurazione consensi GDPR
 */
export interface GDPRConsentConfig {
  /** Tipi di consenso richiesti */
  requiredConsents: GDPRConsentType[];
  
  /** Consensi opzionali */
  optionalConsents: GDPRConsentType[];
  
  /** Durata validità consenso (giorni) */
  consentValidityDays: number;
  
  /** Richiede riconferma periodica */
  requiresReconfirmation: boolean;
  
  /** Intervallo riconferma (giorni) */
  reconfirmationIntervalDays?: number;
  
  /** Consenso granulare per operazioni */
  granularConsents: Record<GDPRAuditAction, GDPRConsentType[]>;
}

/**
 * Configurazione audit GDPR
 */
export interface GDPRAuditConfig {
  /** Azioni da loggare per livello minimal */
  minimalActions: GDPRAuditAction[];
  
  /** Azioni da loggare per livello standard */
  standardActions: GDPRAuditAction[];
  
  /** Azioni da loggare per livello comprehensive */
  comprehensiveActions: GDPRAuditAction[];
  
  /** Include stack trace negli errori */
  includeStackTrace: boolean;
  
  /** Include user agent */
  includeUserAgent: boolean;
  
  /** Include IP address */
  includeIpAddress: boolean;
  
  /** Include session ID */
  includeSessionId: boolean;
  
  /** Retention giorni log audit */
  auditLogRetentionDays: number;
}

/**
 * Configurazione data minimization
 */
export interface GDPRDataMinimizationConfig {
  /** Ruoli che possono vedere dati sensibili */
  sensitiveDataRoles: string[];
  
  /** Mascheramento dati per ruoli non autorizzati */
  maskingPattern: string;
  
  /** Campi sempre visibili indipendentemente dal ruolo */
  alwaysVisibleFields: string[];
  
  /** Campi mai visibili (solo admin) */
  adminOnlyFields: string[];
  
  /** Configurazione mascheramento per campo */
  fieldMaskingConfig: Record<string, {
    pattern: string;
    showFirst?: number;
    showLast?: number;
    replacement?: string;
  }>;
}

/**
 * Entry log audit GDPR
 */
export interface GDPRAuditLogEntry {
  id: string;
  personId: string;
  action: GDPRAuditAction;
  entityType: string;
  entityId?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  oldData?: any;
  newData?: any;
  changes?: Record<string, { from: any; to: any }>;
  reason?: string;
  success: boolean;
  errorMessage?: string;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

/**
 * Consenso GDPR
 */
export interface GDPRConsent {
  id: string;
  personId: string;
  consentType: GDPRConsentType;
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  purpose: string;
  legalBasis: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

/**
 * Richiesta consenso GDPR
 */
export interface GDPRConsentRequest {
  personId: string;
  consentTypes: GDPRConsentType[];
  purpose: string;
  legalBasis: string;
  expirationDays?: number;
  metadata?: Record<string, any>;
}

/**
 * Risposta verifica consenso
 */
export interface GDPRConsentVerification {
  hasConsent: boolean;
  missingConsents: GDPRConsentType[];
  expiredConsents: GDPRConsentType[];
  validConsents: GDPRConsentType[];
  requiresReconfirmation: GDPRConsentType[];
}

/**
 * Configurazione Right to be Forgotten
 */
export interface GDPRRightToBeForgottenConfig {
  /** Abilita soft delete */
  enableSoftDelete: boolean;
  
  /** Giorni prima della cancellazione definitiva */
  hardDeleteAfterDays: number;
  
  /** Campi da anonimizzare invece di cancellare */
  anonymizeInsteadOfDelete: string[];
  
  /** Mantieni relazioni essenziali */
  preserveEssentialRelations: boolean;
  
  /** Notifica altri sistemi della cancellazione */
  notifyExternalSystems: boolean;
  
  /** Endpoint per notifiche esterne */
  externalNotificationEndpoints: string[];
}

/**
 * Richiesta cancellazione GDPR
 */
export interface GDPRDeletionRequest {
  id: string;
  personId: string;
  requestedBy: string;
  requestedAt: Date;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  approvedBy?: string;
  approvedAt?: Date;
  completedAt?: Date;
  rejectionReason?: string;
  affectedEntities: string[];
  metadata?: Record<string, any>;
}

/**
 * Configurazione Data Portability
 */
export interface GDPRDataPortabilityConfig {
  /** Formati supportati per export */
  supportedFormats: Array<'json' | 'xml' | 'csv' | 'pdf'>;
  
  /** Include metadati nell'export */
  includeMetadata: boolean;
  
  /** Include log audit nell'export */
  includeAuditLog: boolean;
  
  /** Crittografa export */
  encryptExport: boolean;
  
  /** Password per crittografia */
  encryptionPassword?: string;
  
  /** Scadenza link download (ore) */
  downloadLinkExpirationHours: number;
}

/**
 * Richiesta portabilità dati
 */
export interface GDPRDataPortabilityRequest {
  id: string;
  personId: string;
  requestedBy: string;
  requestedAt: Date;
  format: 'json' | 'xml' | 'csv' | 'pdf';
  includeMetadata: boolean;
  includeAuditLog: boolean;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'DOWNLOADED' | 'EXPIRED';
  downloadUrl?: string;
  expiresAt?: Date;
  downloadedAt?: Date;
  fileSize?: number;
  metadata?: Record<string, any>;
}

/**
 * Configurazione Privacy Impact Assessment
 */
export interface GDPRPrivacyImpactConfig {
  /** Richiede PIA per operazioni ad alto rischio */
  requiresPIA: boolean;
  
  /** Soglia rischio per PIA automatica */
  riskThreshold: number;
  
  /** Fattori di rischio */
  riskFactors: {
    largescaleProcessing: number;
    sensitiveData: number;
    publiclyAccessible: number;
    vulnerableSubjects: number;
    innovativeTechnology: number;
    preventRightsExercise: number;
  };
}

/**
 * Utility type per operazioni GDPR-aware
 */
export interface GDPRAwareOperation<T = any> {
  operation: GDPRAuditAction;
  entityType: string;
  entityId?: string;
  data?: T;
  reason?: string;
  requiresConsent?: GDPRConsentType[];
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  metadata?: Record<string, any>;
}

/**
 * Risultato operazione GDPR
 */
export interface GDPROperationResult<T = any> {
  success: boolean;
  data?: T;
  auditLogId?: string;
  consentVerification?: GDPRConsentVerification;
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, any>;
}