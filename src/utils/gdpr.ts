/**
 * GDPR Compliance Utilities
 * Gestione consensi e audit trail per conformità GDPR
 */

// Types
export interface GdprAction {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
}

export interface ConsentCheckResult {
  hasConsent: boolean;
  consentDate?: string;
  expiryDate?: string;
  consentType: string;
  details?: Record<string, unknown>;
}

// Configurazione logging GDPR
const GDPR_LOGGING_CONFIG = {
  // Log solo ogni N azioni per ridurre spam
  logEveryNActions: 5,
  // Log sempre errori e azioni critiche
  alwaysLogErrors: true,
  alwaysLogCriticalActions: ['DELETE_PERSON', 'EXPORT_DATA', 'REVOKE_CONSENT'],
  // Abilita logging dettagliato solo con flag specifico
  enableDetailedLogging: (typeof window !== 'undefined' && 
                         (localStorage?.getItem('ENABLE_GDPR_LOGGING') === 'true' ||
                          localStorage?.getItem('NODE_ENV') === 'development')) ||
                         (typeof import.meta !== 'undefined' && import.meta.env?.DEV),
  // Limite massimo log in memoria
  maxLogsInMemory: 100
};

// Storage per azioni GDPR
let gdprLogs: GdprAction[] = [];
let actionCounter = 0;

// Verifica consenso (implementazione mock)
export async function checkConsent(
  userId: string, 
  consentType: string
): Promise<ConsentCheckResult> {
  try {
    // Simulazione verifica consenso
    const hasConsent = Math.random() > 0.1; // 90% probabilità di consenso
    
    const result: ConsentCheckResult = {
      hasConsent,
      consentDate: hasConsent ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      expiryDate: hasConsent ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      consentType,
      details: {
        source: 'mock_implementation',
        version: '1.0'
      }
    };

    // Log solo se necessario
    if (GDPR_LOGGING_CONFIG.enableDetailedLogging && !hasConsent) {
      console.log('🔒 GDPR Consent Check (missing):', {
        userId,
        consentType,
        hasConsent
      });
    }

    return result;
  } catch (error) {
    // Log sempre gli errori
    console.error('🔒 GDPR Consent Check Error:', {
      userId,
      consentType,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      hasConsent: false,
      consentType,
      details: { error: 'consent_check_failed' }
    };
  }
}

// Registra azione GDPR con logging intelligente
export function logGdprAction(
  userIdOrAction: string | GdprAction,
  action?: string,
  entityType?: string,
  entityId?: string,
  details: Record<string, unknown> = {},
  success: boolean = true,
  error?: string
): void {
  let gdprAction: GdprAction;
  
  // Supporta sia il formato oggetto che parametri separati per compatibilità
  if (typeof userIdOrAction === 'object') {
    // Formato oggetto (nuovo) - compatibilità con versioni precedenti
    const actionObj = userIdOrAction as unknown as Record<string, unknown>; // Cast per accedere a proprietà legacy
    gdprAction = {
      id: `gdpr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: String(actionObj.userId || actionObj.tenantId || 'unknown'),
      action: String(actionObj.action || 'unknown'),
      entityType: String(actionObj.dataType || actionObj.entityType || 'unknown'),
      entityId: String(actionObj.entityId || actionObj.endpoint || 'unknown'),
      details: (actionObj.metadata || actionObj.details || {}) as Record<string, unknown>,
      timestamp: String(actionObj.timestamp || new Date().toISOString()),
      ipAddress: '127.0.0.1', // Mock IP
      userAgent: navigator?.userAgent || 'Unknown',
      success: actionObj.error ? false : true,
      error: actionObj.error ? String(actionObj.error) : undefined
    };
  } else {
    // Formato parametri separati (legacy)
    gdprAction = {
      id: `gdpr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userIdOrAction,
      action: action!,
      entityType: entityType!,
      entityId: entityId!,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: '127.0.0.1', // Mock IP
      userAgent: navigator?.userAgent || 'Unknown',
      success,
      error
    };
  }

  // Aggiungi al log
  gdprLogs.push(gdprAction);
  
  // Cleanup per evitare memory leak
  if (gdprLogs.length > GDPR_LOGGING_CONFIG.maxLogsInMemory) {
    gdprLogs = gdprLogs.slice(-GDPR_LOGGING_CONFIG.maxLogsInMemory / 2);
  }

  // Salva in localStorage per persistenza
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('gdpr_logs', JSON.stringify(gdprLogs.slice(-50))); // Ultimi 50
    } catch {
      // Ignora errori di localStorage
    }
  }

  // Logging condizionale per ridurre spam
  actionCounter++;
  const shouldLog = GDPR_LOGGING_CONFIG.enableDetailedLogging && (
    // Log sempre errori
    (GDPR_LOGGING_CONFIG.alwaysLogErrors && !gdprAction.success) ||
    // Log sempre azioni critiche
    GDPR_LOGGING_CONFIG.alwaysLogCriticalActions.includes(gdprAction.action) ||
    // Log ogni N azioni
    (actionCounter % GDPR_LOGGING_CONFIG.logEveryNActions === 0)
  );

  if (shouldLog) {
    const logLevel = !gdprAction.success ? 'error' : 
                    GDPR_LOGGING_CONFIG.alwaysLogCriticalActions.includes(gdprAction.action) ? 'warn' : 'log';
    
    // Gestione sicura dell'userId per il logging
    let displayUserId = gdprAction.userId;
    if (gdprAction.userId && typeof gdprAction.userId === 'string' && gdprAction.userId.length > 8) {
      displayUserId = gdprAction.userId.substring(0, 8) + '...';
    } else if (gdprAction.userId && typeof gdprAction.userId !== 'string') {
      displayUserId = String(gdprAction.userId);
    }
    
    console[logLevel]('🔒 GDPR Action:', {
      action: gdprAction.action,
      entityType: gdprAction.entityType,
      success: gdprAction.success,
      userId: displayUserId, // Privacy: mostra solo parte dell'ID
      totalActions: actionCounter,
      recentErrors: gdprLogs.filter(log => !log.success).length,
      error: gdprAction.error
    });
  }
}

// Log statistiche GDPR riassuntive
export function logGdprSummary(): void {
  if (!GDPR_LOGGING_CONFIG.enableDetailedLogging) return;
  
  const recentLogs = gdprLogs.slice(-50);
  const errorCount = recentLogs.filter(log => !log.success).length;
  const actionTypes = [...new Set(recentLogs.map(log => log.action))];
  const entityTypes = [...new Set(recentLogs.map(log => log.entityType))];
  
  console.log('🔒 GDPR Summary:', {
    totalActions: gdprLogs.length,
    recentActions: recentLogs.length,
    errorRate: recentLogs.length > 0 ? Math.round((errorCount / recentLogs.length) * 100) + '%' : '0%',
    actionTypes,
    entityTypes,
    lastAction: recentLogs[recentLogs.length - 1]?.action || 'none'
  });
}

// Richiedi consenso (implementazione mock)
export async function requestConsent(
  userId: string,
  consentType: string,
  details: Record<string, unknown> = {}
): Promise<boolean> {
  try {
    // Simulazione richiesta consenso
    const granted = Math.random() > 0.2; // 80% probabilità di consenso
    
    // Log azione GDPR
    logGdprAction(
      userId,
      'REQUEST_CONSENT',
      'consent',
      `${consentType}_${userId}`,
      { consentType, ...details },
      granted,
      granted ? undefined : 'User denied consent'
    );

    return granted;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logGdprAction(
      userId,
      'REQUEST_CONSENT',
      'consent',
      `${consentType}_${userId}`,
      { consentType, ...details },
      false,
      errorMessage
    );

    return false;
  }
}

// Revoca consenso (implementazione mock)
export async function revokeConsent(
  userId: string,
  consentType: string,
  reason?: string
): Promise<boolean> {
  try {
    // Simulazione revoca consenso
    const revoked = Math.random() > 0.1; // 90% probabilità di successo
    
    // Log azione GDPR (sempre loggata perché critica)
    logGdprAction(
      userId,
      'REVOKE_CONSENT',
      'consent',
      `${consentType}_${userId}`,
      { consentType, reason },
      revoked,
      revoked ? undefined : 'Revocation failed'
    );

    return revoked;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logGdprAction(
      userId,
      'REVOKE_CONSENT',
      'consent',
      `${consentType}_${userId}`,
      { consentType, reason },
      false,
      errorMessage
    );

    return false;
  }
}

// Ottieni consensi utente
export async function getUserConsents(userId: string): Promise<ConsentCheckResult[]> {
  try {
    // Simulazione recupero consensi
    const consentTypes = ['data_processing', 'marketing', 'analytics', 'cookies'];
    const consents = await Promise.all(
      consentTypes.map(type => checkConsent(userId, type))
    );

    // Log solo se ci sono problemi o se logging dettagliato è abilitato
    const missingConsents = consents.filter(c => !c.hasConsent);
    if (GDPR_LOGGING_CONFIG.enableDetailedLogging && missingConsents.length > 0) {
      // Gestione sicura dell'userId per il logging
      let displayUserId = userId;
      if (userId && typeof userId === 'string' && userId.length > 8) {
        displayUserId = userId.substring(0, 8) + '...';
      } else if (userId && typeof userId !== 'string') {
        displayUserId = String(userId);
      }
      
      console.log('🔒 GDPR User Consents (missing):', {
        userId: displayUserId,
        totalConsents: consents.length,
        missingCount: missingConsents.length,
        missingTypes: missingConsents.map(c => c.consentType)
      });
    }

    return consents;
  } catch (error) {
    // Gestione sicura dell'userId per il logging
    let displayUserId = userId;
    if (userId && typeof userId === 'string' && userId.length > 8) {
      displayUserId = userId.substring(0, 8) + '...';
    } else if (userId && typeof userId !== 'string') {
      displayUserId = String(userId);
    }
    
    console.error('🔒 GDPR Get User Consents Error:', {
      userId: displayUserId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
}

// Utility per gestione log GDPR
export function clearGdprLogs(): void {
  gdprLogs = [];
  actionCounter = 0;
  
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('gdpr_logs');
  }
  
  if (GDPR_LOGGING_CONFIG.enableDetailedLogging) {
    console.log('🔒 GDPR logs cleared');
  }
}

export function getGdprLogs(): GdprAction[] {
  return [...gdprLogs];
}

export function getGdprStats(): {
  totalActions: number;
  errorCount: number;
  errorRate: string;
  actionTypes: string[];
  recentActions: GdprAction[];
} {
  const errorCount = gdprLogs.filter(log => !log.success).length;
  const actionTypes = [...new Set(gdprLogs.map(log => log.action))];
  
  return {
    totalActions: gdprLogs.length,
    errorCount,
    errorRate: gdprLogs.length > 0 ? Math.round((errorCount / gdprLogs.length) * 100) + '%' : '0%',
    actionTypes,
    recentActions: gdprLogs.slice(-10)
  };
}

// Errore personalizzato per consenso richiesto
export class ConsentRequiredError extends Error {
  constructor(
    public consentType: string,
    public userId: string,
    message?: string
  ) {
    super(message || `Consent required for ${consentType}`);
    this.name = 'ConsentRequiredError';
  }
}

// Auto-summary ogni 10 minuti in development (solo se logging abilitato)
if (GDPR_LOGGING_CONFIG.enableDetailedLogging) {
  setInterval(() => {
    logGdprSummary();
  }, 10 * 60 * 1000);
}

// Carica log esistenti da localStorage all'avvio
if (typeof localStorage !== 'undefined') {
  try {
    const savedLogs = localStorage.getItem('gdpr_logs');
    if (savedLogs) {
      const parsed = JSON.parse(savedLogs);
      if (Array.isArray(parsed)) {
        gdprLogs = parsed;
        actionCounter = gdprLogs.length;
      }
    }
  } catch {
    // Ignora errori di parsing
  }
}

// Export default
export default {
  checkConsent,
  requestConsent,
  revokeConsent,
  getUserConsents,
  logGdprAction,
  logGdprSummary,
  clearGdprLogs,
  getGdprLogs,
  getGdprStats,
  ConsentRequiredError
};

// Debug helper per development (solo se logging abilitato)
if (GDPR_LOGGING_CONFIG.enableDetailedLogging) {
  (window as typeof window & { gdprDebug?: Record<string, unknown> }).gdprDebug = {
    getStats: getGdprStats,
    getLogs: getGdprLogs,
    clearLogs: clearGdprLogs,
    logSummary: logGdprSummary,
    enableLogging: () => {
      localStorage.setItem('ENABLE_GDPR_LOGGING', 'true');
      console.log('🔒 GDPR logging enabled. Reload page to take effect.');
    },
    disableLogging: () => {
      localStorage.removeItem('ENABLE_GDPR_LOGGING');
      console.log('🔒 GDPR logging disabled. Reload page to take effect.');
    },
    testActions: () => {
      // Test per verificare il sistema di logging
      logGdprAction('test-user', 'TEST_ACTION', 'person', 'test-id', { test: true });
      logGdprAction('test-user', 'DELETE_PERSON', 'person', 'test-id', { critical: true });
      logGdprAction('test-user', 'FAILED_ACTION', 'person', 'test-id', { test: true }, false, 'Test error');
      console.log('🔒 Test actions logged');
    }
  };
}