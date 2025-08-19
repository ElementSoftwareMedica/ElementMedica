/**
 * GDPR Utilities - Utility per gestione GDPR
 * 
 * Collezione di utility per la gestione della conformità GDPR,
 * inclusi validatori, trasformatori e helper vari.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import {
  GDPRConsentType,
  GDPRConsent,
  GDPRAuditAction,
  GDPRConfig
} from '../types/gdpr.types';
import { BaseEntity } from '../types/entity.types';

/**
 * Configurazione per la minimizzazione dei dati
 */
export interface DataMinimizationRule {
  field: string;
  condition?: (value: unknown, entity: unknown) => boolean;
  action: 'remove' | 'anonymize' | 'pseudonymize' | 'encrypt';
  replacement?: unknown;
}

/**
 * Risultato validazione GDPR
 */
export interface GDPRValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Metadati per l'anonimizzazione
 */
export interface AnonymizationMetadata {
  originalFields: string[];
  anonymizedFields: string[];
  method: 'hash' | 'random' | 'pattern' | 'removal';
  timestamp: Date;
  reversible: boolean;
}

/**
 * Configurazione esportazione GDPR
 */
export interface GDPRExportConfig {
  includeMetadata: boolean;
  includeAuditLog: boolean;
  format: 'json' | 'xml' | 'csv';
  encryption?: {
    enabled: boolean;
    algorithm: string;
    keyId: string;
  };
  watermark?: {
    enabled: boolean;
    text: string;
    position: 'header' | 'footer';
  };
}

/**
 * Classe per gestione utility GDPR
 */
export class GDPRUtils {
  
  /**
   * Valida configurazione GDPR
   */
  static validateGDPRConfig(config: GDPRConfig): GDPRValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Validazione consent
    if (config.consentConfig) {
      if (!config.consentConfig.requiredConsents?.length) {
        warnings.push('Nessun consenso richiesto configurato');
      }
      
      if (!config.consentConfig.consentValidityDays || config.consentConfig.consentValidityDays < 30) {
        warnings.push('Durata consenso troppo breve (minimo 30 giorni consigliato)');
      }
      
      if (config.consentConfig.consentValidityDays && config.consentConfig.consentValidityDays > 730) {
        suggestions.push('Durata consenso molto lunga, considera di ridurla');
      }
    }
    
    // Validazione audit
    if (config.auditConfig) {
      if (!config.auditConfig.auditLogRetentionDays || config.auditConfig.auditLogRetentionDays < 365) {
        warnings.push('Periodo di retention audit troppo breve (minimo 1 anno consigliato)');
      }
      
      if (!config.auditConfig.includeUserAgent && !config.auditConfig.includeIpAddress) {
        suggestions.push('Considera di includere User-Agent o IP per audit più completo');
      }
    } else {
      warnings.push('Configurazione audit non presente');
    }
    
    // Validazione data minimization
    if (config.dataMinimizationConfig) {
      if (!config.dataMinimizationConfig.sensitiveDataRoles?.length) {
        suggestions.push('Nessun ruolo per dati sensibili configurato');
      }
    } else {
      warnings.push('Data minimization non configurata');
    }
    
    // Validazione data retention
    if (!config.dataRetentionDays || config.dataRetentionDays <= 0) {
      errors.push('Data retention è obbligatoria per conformità GDPR');
    } else if (config.dataRetentionDays > 2555) { // 7 anni
      suggestions.push('Periodo di retention molto lungo, verifica necessità legale');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
  
  /**
   * Verifica se un consenso è valido
   */
  static isConsentValid(consent: GDPRConsent): boolean {
    if (!consent.granted) return false;
    if (!consent.grantedAt) return false;
    
    // Verifica scadenza
    if (consent.expiresAt && new Date() > consent.expiresAt) {
      return false;
    }
    
    // Verifica revoca
    if (consent.revokedAt) return false;
    
    return true;
  }
  
  /**
   * Calcola scadenza consenso
   */
  static calculateConsentExpiration(
    grantedAt: Date,
    expirationDays: number
  ): Date {
    const expiration = new Date(grantedAt);
    expiration.setDate(expiration.getDate() + expirationDays);
    return expiration;
  }
  
  /**
   * Verifica se un consenso sta per scadere
   */
  static isConsentExpiringSoon(
    consent: GDPRConsent,
    warningDays: number = 30
  ): boolean {
    if (!consent.expiresAt) return false;
    
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);
    
    return consent.expiresAt <= warningDate;
  }
  
  /**
   * Applica minimizzazione dati
   */
  static applyDataMinimization<T extends BaseEntity>(
    entity: T,
    rules: DataMinimizationRule[]
  ): { minimized: T; metadata: AnonymizationMetadata } {
    const minimized = { ...entity };
    const originalFields: string[] = [];
    const anonymizedFields: string[] = [];
    
    for (const rule of rules) {
      const fieldValue = this.getNestedValue(minimized, rule.field);
      
      // Verifica condizione se presente
      if (rule.condition && !rule.condition(fieldValue, minimized)) {
        continue;
      }
      
      originalFields.push(rule.field);
      
      switch (rule.action) {
        case 'remove':
          this.setNestedValue(minimized, rule.field, undefined);
          anonymizedFields.push(rule.field);
          break;
          
        case 'anonymize': {
          const anonymized = this.anonymizeValue(fieldValue, rule.field);
          this.setNestedValue(minimized, rule.field, anonymized);
          anonymizedFields.push(rule.field);
          break;
        }
          
        case 'pseudonymize': {
          const pseudonymized = this.pseudonymizeValue(fieldValue);
          this.setNestedValue(minimized, rule.field, pseudonymized);
          anonymizedFields.push(rule.field);
          break;
        }
          
        case 'encrypt': {
          const encrypted = this.encryptValue(fieldValue);
          this.setNestedValue(minimized, rule.field, encrypted);
          anonymizedFields.push(rule.field);
          break;
        }
      }
    }
    
    const metadata: AnonymizationMetadata = {
      originalFields,
      anonymizedFields,
      method: 'pattern', // Metodo misto
      timestamp: new Date(),
      reversible: rules.some(r => r.action === 'encrypt' || r.action === 'pseudonymize')
    };
    
    return { minimized, metadata };
  }
  
  /**
   * Anonimizza un valore
   */
  private static anonymizeValue(value: unknown, field: string): unknown {
    if (value === null || value === undefined) return value;
    
    const str = String(value);
    
    // Pattern specifici per diversi tipi di campo
    if (field.toLowerCase().includes('email')) {
      const [local, domain] = str.split('@');
      if (domain) {
        return `${local.charAt(0)}***@${domain}`;
      }
    }
    
    if (field.toLowerCase().includes('phone') || field.toLowerCase().includes('telefono')) {
      return str.replace(/\d/g, '*').substring(0, str.length);
    }
    
    if (field.toLowerCase().includes('name') || field.toLowerCase().includes('nome')) {
      return str.charAt(0) + '*'.repeat(str.length - 1);
    }
    
    if (field.toLowerCase().includes('address') || field.toLowerCase().includes('indirizzo')) {
      return '*** [INDIRIZZO ANONIMIZZATO] ***';
    }
    
    // Default: sostituisci con asterischi
    if (typeof value === 'string') {
      return '*'.repeat(Math.min(str.length, 10));
    }
    
    if (typeof value === 'number') {
      return 0;
    }
    
    return '[ANONIMIZZATO]';
  }
  
  /**
   * Pseudonimizza un valore (reversibile con chiave)
   */
  private static pseudonymizeValue(value: unknown): string {
    if (value === null || value === undefined) return '[NULL]';
    
    const str = String(value);
    
    // Genera hash deterministico (in produzione usare crypto sicuro)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converti a 32bit integer
    }
    
    return `PSEUDO_${Math.abs(hash).toString(36).toUpperCase()}`;
  }
  
  /**
   * Cripta un valore (placeholder - in produzione usare crypto reale)
   */
  private static encryptValue(value: unknown): string {
    if (value === null || value === undefined) return '[NULL]';
    
    // Placeholder per encryption reale
    const str = String(value);
    const encoded = btoa(str); // Base64 encoding (NON è encryption sicura!)
    
    return `ENC_${encoded}`;
  }
  
  /**
   * Ottieni valore nested da oggetto
   */
  private static getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      return current && typeof current === 'object' && current !== null && key in current 
        ? (current as Record<string, unknown>)[key] 
        : undefined;
    }, obj);
  }
  
  /**
   * Imposta valore nested in oggetto
   */
  private static setNestedValue(obj: Record<string, unknown> | BaseEntity, path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    
    const target = keys.reduce((current: Record<string, unknown>, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key] as Record<string, unknown>;
    }, obj as Record<string, unknown>);
    
    if (value === undefined) {
      delete target[lastKey];
    } else {
      target[lastKey] = value;
    }
  }
  
  /**
   * Genera report conformità GDPR
   */
  static generateComplianceReport(config: GDPRConfig): {
    score: number;
    status: 'compliant' | 'partial' | 'non-compliant';
    details: {
      category: string;
      status: 'ok' | 'warning' | 'error';
      message: string;
    }[];
  } {
    const details: { category: string; status: 'ok' | 'warning' | 'error'; message: string }[] = [];
    let score = 0;
    
    // Verifica consent management (25 punti)
    if (config.consentConfig) {
      score += 15;
      details.push({
        category: 'Consent Management',
        status: 'ok',
        message: 'Gestione consensi abilitata'
      });
      
      if (config.consentConfig.requiredConsents && config.consentConfig.requiredConsents.length > 0) {
        score += 10;
        details.push({
          category: 'Consent Management',
          status: 'ok',
          message: `${config.consentConfig.requiredConsents.length} consensi richiesti configurati`
        });
      } else {
        details.push({
          category: 'Consent Management',
          status: 'warning',
          message: 'Nessun consenso richiesto configurato'
        });
      }
    } else {
      details.push({
        category: 'Consent Management',
        status: 'error',
        message: 'Gestione consensi non abilitata'
      });
    }
    
    // Verifica audit logging (25 punti)
    if (config.auditConfig) {
      score += 15;
      details.push({
        category: 'Audit Logging',
        status: 'ok',
        message: 'Audit logging abilitato'
      });
      
      if (config.auditConfig.auditLogRetentionDays >= 365) {
        score += 10;
        details.push({
          category: 'Audit Logging',
          status: 'ok',
          message: `Retention period: ${config.auditConfig.auditLogRetentionDays} giorni`
        });
      } else {
        score += 5;
        details.push({
          category: 'Audit Logging',
          status: 'warning',
          message: `Retention period breve: ${config.auditConfig.auditLogRetentionDays} giorni`
        });
      }
    } else {
      details.push({
        category: 'Audit Logging',
        status: 'error',
        message: 'Audit logging non abilitato'
      });
    }
    
    // Verifica data minimization (25 punti)
    if (config.dataMinimizationConfig) {
      score += 15;
      details.push({
        category: 'Data Minimization',
        status: 'ok',
        message: 'Data minimization abilitata'
      });
      
      if (config.dataMinimizationConfig.sensitiveDataRoles && config.dataMinimizationConfig.sensitiveDataRoles.length > 0) {
        score += 10;
        details.push({
          category: 'Data Minimization',
          status: 'ok',
          message: `${config.dataMinimizationConfig.sensitiveDataRoles.length} ruoli configurati`
        });
      } else {
        score += 5;
        details.push({
          category: 'Data Minimization',
          status: 'warning',
          message: 'Nessun ruolo di minimizzazione configurato'
        });
      }
    } else {
      details.push({
        category: 'Data Minimization',
        status: 'warning',
        message: 'Data minimization non abilitata'
      });
    }
    
    // Verifica data retention (25 punti)
    if (config.dataRetentionDays > 0) {
      score += 15;
      details.push({
        category: 'Data Retention',
        status: 'ok',
        message: `Data retention configurata: ${config.dataRetentionDays} giorni`
      });
      
      if (config.dataRetentionDays <= 365) {
        score += 10;
        details.push({
          category: 'Data Retention',
          status: 'ok',
          message: 'Periodo di retention conforme'
        });
      } else {
        score += 5;
        details.push({
          category: 'Data Retention',
          status: 'warning',
          message: 'Periodo di retention lungo'
        });
      }
    } else {
      details.push({
        category: 'Data Retention',
        status: 'error',
        message: 'Data retention non configurata'
      });
    }
    
    // Determina status
    let status: 'compliant' | 'partial' | 'non-compliant';
    if (score >= 80) {
      status = 'compliant';
    } else if (score >= 50) {
      status = 'partial';
    } else {
      status = 'non-compliant';
    }
    
    return {
      score,
      status,
      details
    };
  }
  
  /**
   * Esporta dati in formato GDPR-compliant
   */
  static exportGDPRData<T extends BaseEntity>(
    entities: T[],
    config: GDPRExportConfig
  ): {
    data: unknown;
    metadata: {
      exportDate: string;
      entityCount: number;
      format: string;
      gdprCompliant: boolean;
    };
  } {
    const exportDate = new Date().toISOString();
    
    let processedData: unknown;
    
    switch (config.format) {
      case 'json':
        processedData = {
          entities,
          metadata: config.includeMetadata ? {
            exportDate,
            entityCount: entities.length,
            gdprCompliant: true
          } : undefined
        };
        break;
        
      case 'xml':
        // Placeholder per XML export
        processedData = `<?xml version="1.0" encoding="UTF-8"?>
<gdpr-export date="${exportDate}">
  <entities count="${entities.length}">
    ${entities.map(e => `<entity id="${e.id}">${JSON.stringify(e)}</entity>`).join('\n    ')}
  </entities>
</gdpr-export>`;
        break;
        
      case 'csv':
        // Placeholder per CSV export
        if (entities.length > 0) {
          const headers = Object.keys(entities[0]);
          const csvRows = entities.map(entity => 
            headers.map(header => 
              JSON.stringify(entity[header as keyof T] || '')
            ).join(',')
          );
          processedData = [headers.join(','), ...csvRows].join('\n');
        } else {
          processedData = '';
        }
        break;
    }
    
    // Aggiungi watermark se richiesto
    if (config.watermark?.enabled) {
      const watermarkText = `\n\n--- ${config.watermark.text} ---\n`;
      if (config.watermark.position === 'header') {
        processedData = watermarkText + processedData;
      } else {
        processedData = processedData + watermarkText;
      }
    }
    
    return {
      data: processedData,
      metadata: {
        exportDate,
        entityCount: entities.length,
        format: config.format,
        gdprCompliant: true
      }
    };
  }
  
  /**
   * Valida richiesta di cancellazione dati
   */
  static validateDeletionRequest(request: {
    entityId: string;
    reason: string;
    requestedBy: string;
    requestDate: Date;
  }): GDPRValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    if (!request.entityId) {
      errors.push('ID entità richiesto');
    }
    
    if (!request.reason || request.reason.length < 10) {
      errors.push('Motivo della cancellazione richiesto (minimo 10 caratteri)');
    }
    
    if (!request.requestedBy) {
      errors.push('Richiedente richiesto');
    }
    
    if (!request.requestDate) {
      errors.push('Data richiesta richiesta');
    }
    
    // Verifica che la richiesta non sia troppo vecchia
    if (request.requestDate) {
      const daysSinceRequest = Math.floor(
        (Date.now() - request.requestDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceRequest > 30) {
        warnings.push(`Richiesta datata ${daysSinceRequest} giorni fa`);
      }
      
      if (daysSinceRequest > 90) {
        suggestions.push('Considera di verificare se la richiesta è ancora valida');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
}

/**
 * Costanti GDPR
 */
export const GDPR_CONSTANTS = {
  // Durate standard
  DEFAULT_CONSENT_EXPIRATION_DAYS: 365,
  DEFAULT_AUDIT_RETENTION_DAYS: 2555, // 7 anni
  DEFAULT_CONSENT_WARNING_DAYS: 30,
  
  // Livelli di rischio
  RISK_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  } as const,
  
  // Azioni audit standard
  STANDARD_AUDIT_ACTIONS: [
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'EXPORT',
    'SEARCH'
  ] as GDPRAuditAction[],
  
  // Consensi base
  BASE_CONSENT_TYPES: [
    'DATA_PROCESSING',
    'DATA_STORAGE',
    'MARKETING',
    'ANALYTICS',
    'DATA_SHARING'
  ] as GDPRConsentType[],
  
  // Messaggi standard
  MESSAGES: {
    CONSENT_REQUIRED: 'Consenso richiesto per questa operazione',
    CONSENT_EXPIRED: 'Il consenso è scaduto',
    CONSENT_REVOKED: 'Il consenso è stato revocato',
    AUDIT_FAILED: 'Errore nel logging audit',
    DATA_MINIMIZED: 'Dati minimizzati secondo policy GDPR',
    DELETION_COMPLETED: 'Cancellazione completata secondo diritto all\'oblio'
  }
};

export default GDPRUtils;