/**
 * Configurazione Centralizzata Logging
 * Sistema unificato per ridurre log ripetitivi e gestire il debugging
 */

// Tipi per configurazione logging
export interface LoggingConfig {
  // Configurazione generale
  enableDetailedLogging: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  
  // Configurazione batch logging
  batchSize: number;
  batchInterval: number; // millisecondi
  
  // Configurazione filtri
  logOnlyErrors: boolean;
  logCriticalActions: string[];
  
  // Configurazione rate limiting
  maxLogsPerMinute: number;
  
  // Configurazione storage
  maxLogsInMemory: number;
  persistToLocalStorage: boolean;
}

// Configurazione di default
const DEFAULT_CONFIG: LoggingConfig = {
  enableDetailedLogging: false,
  logLevel: 'info',
  batchSize: 10,
  batchInterval: 30000, // 30 secondi
  logOnlyErrors: false,
  logCriticalActions: [
    'DELETE_PERSON',
    'EXPORT_DATA', 
    'REVOKE_CONSENT',
    'LOGIN_FAILED',
    'UNAUTHORIZED_ACCESS'
  ],
  maxLogsPerMinute: 60,
  maxLogsInMemory: 100,
  persistToLocalStorage: true
};

// Configurazione per environment
const ENVIRONMENT_CONFIGS: Record<string, Partial<LoggingConfig>> = {
  development: {
    enableDetailedLogging: process.env.ENABLE_DEBUG_LOGGING === 'true' || 
                          localStorage?.getItem('ENABLE_DEBUG_LOGGING') === 'true',
    logLevel: 'debug',
    batchSize: 5,
    batchInterval: 10000, // 10 secondi in dev
    maxLogsPerMinute: 120,
    persistToLocalStorage: true
  },
  
  production: {
    enableDetailedLogging: false,
    logLevel: 'error',
    logOnlyErrors: true,
    batchSize: 50,
    batchInterval: 60000, // 1 minuto in prod
    maxLogsPerMinute: 30,
    persistToLocalStorage: false
  },
  
  test: {
    enableDetailedLogging: false,
    logLevel: 'warn',
    batchSize: 1,
    batchInterval: 1000,
    maxLogsPerMinute: 10,
    persistToLocalStorage: false
  }
};

// Classe per gestione configurazione logging
class LoggingConfigManager {
  private config: LoggingConfig;
  private logCounts: Map<string, number> = new Map();
  private lastResetTime = Date.now();

  constructor() {
    this.config = this.buildConfig();
    this.setupPeriodicReset();
  }

  private buildConfig(): LoggingConfig {
    const env = process.env.NODE_ENV || 'development';
    const envConfig = ENVIRONMENT_CONFIGS[env] || {};
    
    return {
      ...DEFAULT_CONFIG,
      ...envConfig
    };
  }

  // Ottieni configurazione corrente
  getConfig(): LoggingConfig {
    return { ...this.config };
  }

  // Verifica se il logging è abilitato per un tipo specifico
  shouldLog(logType: string, isError: boolean = false, isCritical: boolean = false): boolean {
    // Sempre log per errori se abilitato
    if (isError && (this.config.logOnlyErrors || this.config.enableDetailedLogging)) {
      return this.checkRateLimit(logType);
    }

    // Sempre log per azioni critiche
    if (isCritical || this.config.logCriticalActions.includes(logType)) {
      return this.checkRateLimit(logType);
    }

    // Log dettagliato solo se abilitato
    if (!this.config.enableDetailedLogging) {
      return false;
    }

    return this.checkRateLimit(logType);
  }

  // Verifica rate limiting
  private checkRateLimit(logType: string): boolean {
    const now = Date.now();
    
    // Reset contatori ogni minuto
    if (now - this.lastResetTime > 60000) {
      this.logCounts.clear();
      this.lastResetTime = now;
    }

    const currentCount = this.logCounts.get(logType) || 0;
    
    if (currentCount >= this.config.maxLogsPerMinute) {
      return false;
    }

    this.logCounts.set(logType, currentCount + 1);
    return true;
  }

  // Setup reset periodico dei contatori
  private setupPeriodicReset(): void {
    setInterval(() => {
      this.logCounts.clear();
      this.lastResetTime = Date.now();
    }, 60000); // Reset ogni minuto
  }

  // Aggiorna configurazione runtime
  updateConfig(updates: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Abilita/disabilita logging dettagliato
  setDetailedLogging(enabled: boolean): void {
    this.config.enableDetailedLogging = enabled;
    
    if (typeof localStorage !== 'undefined') {
      if (enabled) {
        localStorage.setItem('ENABLE_DEBUG_LOGGING', 'true');
      } else {
        localStorage.removeItem('ENABLE_DEBUG_LOGGING');
      }
    }
  }

  // Ottieni statistiche rate limiting
  getRateLimitStats(): Record<string, number> {
    return Object.fromEntries(this.logCounts);
  }
}

// Singleton instance
const loggingConfigManager = new LoggingConfigManager();

// Utility per logging condizionale
export class ConditionalLogger {
  private batchedLogs: Array<{
    level: string;
    message: string;
    data: unknown;
    timestamp: number;
  }> = [];
  
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(private logType: string) {}

  // Log con controllo condizionale
  log(message: string, data?: unknown, options: {
    isError?: boolean;
    isCritical?: boolean;
    level?: 'error' | 'warn' | 'info' | 'debug';
  } = {}): void {
    const config = loggingConfigManager.getConfig();
    const { isError = false, isCritical = false, level = 'info' } = options;

    if (!loggingConfigManager.shouldLog(this.logType, isError, isCritical)) {
      return;
    }

    // Aggiungi al batch se configurato
    if (config.batchSize > 1 && !isError && !isCritical) {
      this.addToBatch(level, message, data);
    } else {
      // Log immediato per errori e azioni critiche
      this.logImmediate(level, message, data);
    }
  }

  // Aggiungi al batch
  private addToBatch(level: string, message: string, data: unknown): void {
    this.batchedLogs.push({
      level,
      message,
      data,
      timestamp: Date.now()
    });

    const config = loggingConfigManager.getConfig();

    // Flush se batch è pieno
    if (this.batchedLogs.length >= config.batchSize) {
      this.flushBatch();
    } else if (!this.batchTimer) {
      // Setup timer per flush automatico
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, config.batchInterval);
    }
  }

  // Flush del batch
  private flushBatch(): void {
    if (this.batchedLogs.length === 0) return;

    const logs = [...this.batchedLogs];
    this.batchedLogs = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Log batch summary
    const errorCount = logs.filter(log => log.level === 'error').length;
    const warnCount = logs.filter(log => log.level === 'warn').length;
    
    console.log(`📊 ${this.logType} Batch Summary:`, {
      totalLogs: logs.length,
      errors: errorCount,
      warnings: warnCount,
      timespan: `${logs[0]?.timestamp} - ${logs[logs.length - 1]?.timestamp}`,
      sample: logs.slice(-3) // Ultimi 3 log come esempio
    });
  }

  // Log immediato
  private logImmediate(level: string, message: string, data: unknown): void {
    const logMethod = console[level as keyof Console] || console.log;
    
    if (data) {
      (logMethod as (...args: unknown[]) => void)(`${this.getLogIcon(level)} ${message}`, data);
    } else {
      (logMethod as (...args: unknown[]) => void)(`${this.getLogIcon(level)} ${message}`);
    }
  }

  // Ottieni icona per tipo di log
  private getLogIcon(level: string): string {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🔍';
      default: return '📝';
    }
  }

  // Force flush per cleanup
  forceFlush(): void {
    this.flushBatch();
  }
}

// Factory per creare logger condizionali
export function createConditionalLogger(logType: string): ConditionalLogger {
  return new ConditionalLogger(logType);
}

// Utility functions
export function getLoggingConfig(): LoggingConfig {
  return loggingConfigManager.getConfig();
}

export function updateLoggingConfig(updates: Partial<LoggingConfig>): void {
  loggingConfigManager.updateConfig(updates);
}

export function setDetailedLogging(enabled: boolean): void {
  loggingConfigManager.setDetailedLogging(enabled);
}

export function shouldLog(logType: string, isError?: boolean, isCritical?: boolean): boolean {
  return loggingConfigManager.shouldLog(logType, isError, isCritical);
}

export function getRateLimitStats(): Record<string, number> {
  return loggingConfigManager.getRateLimitStats();
}

// Debug helper globale
if (typeof window !== 'undefined') {
  (window as typeof window & { loggingDebug?: Record<string, unknown> }).loggingDebug = {
    getConfig: getLoggingConfig,
    updateConfig: updateLoggingConfig,
    setDetailedLogging,
    getRateLimitStats,
    enableAll: () => {
      setDetailedLogging(true);
      updateLoggingConfig({ 
        logOnlyErrors: false,
        maxLogsPerMinute: 1000 
      });
      console.log('🔧 All logging enabled');
    },
    disableAll: () => {
      setDetailedLogging(false);
      updateLoggingConfig({ 
        logOnlyErrors: true,
        maxLogsPerMinute: 10 
      });
      console.log('🔧 All logging disabled');
    },
    resetRateLimits: () => {
      loggingConfigManager['logCounts'].clear();
      console.log('🔧 Rate limits reset');
    }
  };
}

export default {
  getConfig: getLoggingConfig,
  updateConfig: updateLoggingConfig,
  setDetailedLogging,
  shouldLog,
  getRateLimitStats,
  createConditionalLogger,
  ConditionalLogger
};