/**
 * GDPR Utilities
 * Funzioni per la conformità GDPR e gestione consensi
 */

// Types
export interface GdprAction {
  action: string;
  timestamp: string;
  tenantId?: string;
  userId?: string;
  dataType?: string;
  endpoint?: string;
  error?: string;
  errorType?: string;
  contentType?: string;
  responsePreview?: string;
  url?: string;
  status?: number;
  statusText?: string;
  attempt?: number;
  method?: string;
  cacheKey?: string;
  reason?: string;
  recordCount?: number;
  metadata?: Record<string, any>;
  entriesCleared?: number;
  pattern?: string;
  entriesInvalidated?: number;
  forceRefresh?: boolean;
  dataSize?: number;
}

export interface ConsentCheckResult {
  hasConsent: boolean;
  consentType: string;
  consentDate?: Date;
  expiresAt?: Date;
}

// Mock implementation per ora - da sostituire con chiamate API reali
const mockConsents = new Map<string, boolean>();

/**
 * Verifica il consenso dell'utente per un tipo specifico di elaborazione dati
 */
export async function checkConsent(consentType: string, userId?: string): Promise<boolean> {
  try {
    // Per ora, implementazione mock che restituisce sempre true
    // In produzione, questa dovrebbe fare una chiamata API al backend
    const key = `${userId || 'anonymous'}_${consentType}`;
    
    // Se non abbiamo un consenso registrato, assumiamo che sia necessario richiederlo
    if (!mockConsents.has(key)) {
      console.log(`🔒 No consent found for ${consentType}, requesting consent...`);
      // In un'implementazione reale, qui si aprirebbe un modal di consenso
      mockConsents.set(key, true); // Per ora assumiamo consenso dato
    }
    
    const hasConsent = mockConsents.get(key) || false;
    console.log(`🔒 Consent check for ${consentType}: ${hasConsent}`);
    
    return hasConsent;
  } catch (error) {
    console.error('Error checking consent:', error);
    return false;
  }
}

/**
 * Registra un'azione GDPR per audit trail
 */
export async function logGdprAction(action: GdprAction): Promise<void> {
  try {
    // Log locale per debug
    console.log('📋 GDPR Action:', {
      action: action.action,
      timestamp: action.timestamp,
      dataType: action.dataType,
      endpoint: action.endpoint,
      metadata: action.metadata
    });
    
    // In produzione, questa dovrebbe inviare i log al backend
    // await apiPost('/api/gdpr/audit-log', action);
    
    // Per ora, salviamo in localStorage per debug (solo in development)
    if (process.env.NODE_ENV === 'development') {
      const logs = JSON.parse(localStorage.getItem('gdpr_audit_logs') || '[]');
      logs.push({
        ...action,
        id: Date.now().toString(),
        clientTimestamp: new Date().toISOString()
      });
      
      // Mantieni solo gli ultimi 100 log per evitare di riempire localStorage
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('gdpr_audit_logs', JSON.stringify(logs));
    }
  } catch (error) {
    console.error('Error logging GDPR action:', error);
    // Non lanciare errore per non bloccare l'applicazione
  }
}

/**
 * Richiede il consenso dell'utente per un tipo specifico di elaborazione
 */
export async function requestConsent(consentType: string, purpose: string, userId?: string): Promise<boolean> {
  try {
    console.log(`🔒 Requesting consent for ${consentType}: ${purpose}`);
    
    // Log della richiesta di consenso
    await logGdprAction({
      action: 'CONSENT_REQUESTED',
      timestamp: new Date().toISOString(),
      userId,
      dataType: consentType,
      metadata: {
        purpose,
        requestMethod: 'programmatic'
      }
    });
    
    // In un'implementazione reale, qui si aprirebbe un modal di consenso
    // Per ora, simuliamo che l'utente dia sempre il consenso
    const key = `${userId || 'anonymous'}_${consentType}`;
    mockConsents.set(key, true);
    
    // Log del consenso dato
    await logGdprAction({
      action: 'CONSENT_GIVEN',
      timestamp: new Date().toISOString(),
      userId,
      dataType: consentType,
      metadata: {
        purpose,
        consentMethod: 'programmatic_mock'
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error requesting consent:', error);
    
    // Log dell'errore
    await logGdprAction({
      action: 'CONSENT_REQUEST_ERROR',
      timestamp: new Date().toISOString(),
      userId,
      dataType: consentType,
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        purpose
      }
    });
    
    return false;
  }
}

/**
 * Revoca il consenso per un tipo specifico di elaborazione
 */
export async function revokeConsent(consentType: string, userId?: string): Promise<void> {
  try {
    const key = `${userId || 'anonymous'}_${consentType}`;
    mockConsents.set(key, false);
    
    console.log(`🔒 Consent revoked for ${consentType}`);
    
    // Log della revoca del consenso
    await logGdprAction({
      action: 'CONSENT_REVOKED',
      timestamp: new Date().toISOString(),
      userId,
      dataType: consentType,
      metadata: {
        revokeMethod: 'programmatic'
      }
    });
  } catch (error) {
    console.error('Error revoking consent:', error);
  }
}

/**
 * Ottiene tutti i consensi per un utente
 */
export async function getUserConsents(userId?: string): Promise<Record<string, boolean>> {
  try {
    const userKey = userId || 'anonymous';
    const consents: Record<string, boolean> = {};
    
    for (const [key, value] of mockConsents.entries()) {
      if (key.startsWith(userKey + '_')) {
        const consentType = key.replace(userKey + '_', '');
        consents[consentType] = value;
      }
    }
    
    return consents;
  } catch (error) {
    console.error('Error getting user consents:', error);
    return {};
  }
}

/**
 * Pulisce i log GDPR dal localStorage (solo development)
 */
export function clearGdprLogs(): void {
  if (process.env.NODE_ENV === 'development') {
    localStorage.removeItem('gdpr_audit_logs');
    console.log('🗑️ GDPR audit logs cleared from localStorage');
  }
}

/**
 * Ottiene i log GDPR dal localStorage (solo development)
 */
export function getGdprLogs(): GdprAction[] {
  if (process.env.NODE_ENV === 'development') {
    try {
      return JSON.parse(localStorage.getItem('gdpr_audit_logs') || '[]');
    } catch (error) {
      console.error('Error parsing GDPR logs:', error);
      return [];
    }
  }
  return [];
}

/**
 * Errore personalizzato per consenso richiesto
 */
export class ConsentRequiredError extends Error {
  constructor(message: string, public consentType: string) {
    super(message);
    this.name = 'ConsentRequiredError';
  }
}

// Export per compatibilità
export default {
  checkConsent,
  logGdprAction,
  requestConsent,
  revokeConsent,
  getUserConsents,
  clearGdprLogs,
  getGdprLogs,
  ConsentRequiredError
};