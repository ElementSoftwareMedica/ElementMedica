/**
 * Graceful Shutdown DRY per il proxy server
 * Gestione unificata di SIGTERM e SIGINT con cleanup completo
 */

import { logger } from '../../utils/logger.js';
import { createDebugLogger } from '../middleware/logging.js';
import { shutdownAuth } from '../../auth/index.js';

const debugShutdown = createDebugLogger('shutdown');

/**
 * Stato del processo di shutdown
 */
let isShuttingDown = false;
let shutdownStartTime = null;
let shutdownTimeout = null;
let server = null;
let prismaClient = null;

/**
 * Configurazione del graceful shutdown
 */
const SHUTDOWN_CONFIG = {
  // Timeout per il graceful shutdown (30 secondi)
  gracefulTimeout: 30000,
  
  // Timeout per il force shutdown (5 secondi dopo graceful)
  forceTimeout: 5000,
  
  // Intervallo per il logging del progresso
  progressInterval: 2000,
  
  // Segnali da gestire
  signals: ['SIGTERM', 'SIGINT'],
  
  // Abilitato solo in produzione per default
  enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_GRACEFUL_SHUTDOWN === 'true'
};

/**
 * Registra il server e il client Prisma per il cleanup
 * @param {Object} serverInstance - Istanza del server Express/HTTP
 * @param {Object} prismaInstance - Istanza del client Prisma
 */
export function registerForShutdown(serverInstance, prismaInstance = null) {
  server = serverInstance;
  prismaClient = prismaInstance;
  
  if (process.env.DEBUG_SHUTDOWN || process.env.DEBUG_ALL) {
    debugShutdown('Registered for graceful shutdown:', {
      hasServer: !!server,
      hasPrisma: !!prismaClient,
      enabled: SHUTDOWN_CONFIG.enabled
    });
  }
}

/**
 * Chiude le connessioni attive del server
 * @returns {Promise<void>}
 */
async function closeServerConnections() {
  if (!server) {
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server close timeout'));
    }, 10000);
    
    server.close((err) => {
      clearTimeout(timeout);
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Chiude la connessione al database
 * @returns {Promise<void>}
 */
async function closeDatabaseConnection() {
  if (!prismaClient) {
    return Promise.resolve();
  }
  
  try {
    await prismaClient.$disconnect();
    if (process.env.DEBUG_SHUTDOWN || process.env.DEBUG_ALL) {
      debugShutdown('Database connection closed');
    }
  } catch (error) {
    logger.error('Error closing database connection', {
      service: 'proxy-server',
      component: 'graceful-shutdown',
      error: error.message
    });
    throw error;
  }
}

/**
 * Chiude i servizi di autenticazione
 * @returns {Promise<void>}
 */
async function closeAuthServices() {
  try {
    if (typeof shutdownAuth === 'function') {
      await shutdownAuth();
      if (process.env.DEBUG_SHUTDOWN || process.env.DEBUG_ALL) {
        debugShutdown('Auth services closed');
      }
    }
  } catch (error) {
    logger.error('Error closing auth services', {
      service: 'proxy-server',
      component: 'graceful-shutdown',
      error: error.message
    });
    throw error;
  }
}

/**
 * Pulisce le risorse temporanee
 * @returns {Promise<void>}
 */
async function cleanupTempResources() {
  try {
    // Pulisci cache in memoria
    if (global.gc) {
      global.gc();
    }
    
    // Pulisci timer attivi
    if (shutdownTimeout) {
      clearTimeout(shutdownTimeout);
      shutdownTimeout = null;
    }
    
    if (process.env.DEBUG_SHUTDOWN || process.env.DEBUG_ALL) {
      debugShutdown('Temporary resources cleaned');
    }
  } catch (error) {
    logger.error('Error cleaning temp resources', {
      service: 'proxy-server',
      component: 'graceful-shutdown',
      error: error.message
    });
  }
}

/**
 * Esegue il graceful shutdown
 * @param {string} signal - Segnale ricevuto
 * @returns {Promise<void>}
 */
async function performGracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring signal', {
      service: 'proxy-server',
      component: 'graceful-shutdown',
      signal,
      elapsed: Date.now() - shutdownStartTime
    });
    return;
  }
  
  isShuttingDown = true;
  shutdownStartTime = Date.now();
  
  logger.info('Graceful shutdown initiated', {
    service: 'proxy-server',
    component: 'graceful-shutdown',
    signal,
    pid: process.pid,
    timestamp: new Date().toISOString()
  });
  
  if (process.env.DEBUG_SHUTDOWN || process.env.DEBUG_ALL) {
    console.log(`🛑 [SHUTDOWN] Graceful shutdown initiated by ${signal}`);
  }
  
  // Setup force shutdown timeout
  const forceShutdownTimer = setTimeout(() => {
    logger.error('Force shutdown triggered', {
      service: 'proxy-server',
      component: 'graceful-shutdown',
      signal,
      elapsed: Date.now() - shutdownStartTime
    });
    
    console.log('❌ [SHUTDOWN] Force shutdown - killing process');
    process.exit(1);
  }, SHUTDOWN_CONFIG.gracefulTimeout + SHUTDOWN_CONFIG.forceTimeout);
  
  // Progress logging
  const progressTimer = setInterval(() => {
    const elapsed = Date.now() - shutdownStartTime;
    if (process.env.DEBUG_SHUTDOWN || process.env.DEBUG_ALL) {
      console.log(`⏳ [SHUTDOWN] Progress: ${Math.round(elapsed / 1000)}s elapsed`);
    }
  }, SHUTDOWN_CONFIG.progressInterval);
  
  try {
    // Fase 1: Stop accettazione nuove connessioni
    if (process.env.DEBUG_SHUTDOWN || process.env.DEBUG_ALL) {
      console.log('🔄 [SHUTDOWN] Phase 1: Stopping new connections');
    }
    
    await closeServerConnections();
    logger.info('Server connections closed', {
      service: 'proxy-server',
      component: 'graceful-shutdown',
      phase: 1
    });
    
    // Fase 2: Chiudi servizi di autenticazione
    if (process.env.DEBUG_SHUTDOWN || process.env.DEBUG_ALL) {
      console.log('🔄 [SHUTDOWN] Phase 2: Closing auth services');
    }
    
    await closeAuthServices();
    logger.info('Auth services closed', {
      service: 'proxy-server',
      component: 'graceful-shutdown',
      phase: 2
    });
    
    // Fase 3: Chiudi connessione database
    if (process.env.DEBUG_SHUTDOWN || process.env.DEBUG_ALL) {
      console.log('🔄 [SHUTDOWN] Phase 3: Closing database connection');
    }
    
    await closeDatabaseConnection();
    logger.info('Database connection closed', {
      service: 'proxy-server',
      component: 'graceful-shutdown',
      phase: 3
    });
    
    // Fase 4: Cleanup risorse temporanee
    if (process.env.DEBUG_SHUTDOWN || process.env.DEBUG_ALL) {
      console.log('🔄 [SHUTDOWN] Phase 4: Cleaning up resources');
    }
    
    await cleanupTempResources();
    logger.info('Temporary resources cleaned', {
      service: 'proxy-server',
      component: 'graceful-shutdown',
      phase: 4
    });
    
    // Cleanup timer
    clearTimeout(forceShutdownTimer);
    clearInterval(progressTimer);
    
    const totalTime = Date.now() - shutdownStartTime;
    
    logger.info('Graceful shutdown completed successfully', {
      service: 'proxy-server',
      component: 'graceful-shutdown',
      signal,
      totalTime,
      timestamp: new Date().toISOString()
    });
    
    if (process.env.DEBUG_SHUTDOWN || process.env.DEBUG_ALL) {
      console.log(`✅ [SHUTDOWN] Graceful shutdown completed in ${totalTime}ms`);
    }
    
    // Exit con codice 0 (successo)
    process.exit(0);
    
  } catch (error) {
    clearTimeout(forceShutdownTimer);
    clearInterval(progressTimer);
    
    const totalTime = Date.now() - shutdownStartTime;
    
    logger.error('Graceful shutdown failed', {
      service: 'proxy-server',
      component: 'graceful-shutdown',
      signal,
      error: error.message,
      stack: error.stack,
      totalTime
    });
    
    console.log(`❌ [SHUTDOWN] Graceful shutdown failed: ${error.message}`);
    
    // Exit con codice 1 (errore)
    process.exit(1);
  }
}

/**
 * Handler unificato per i segnali di shutdown
 * @param {string} signal - Segnale ricevuto
 */
function handleShutdownSignal(signal) {
  if (!SHUTDOWN_CONFIG.enabled) {
    logger.info('Graceful shutdown disabled, exiting immediately', {
      service: 'proxy-server',
      component: 'graceful-shutdown',
      signal,
      environment: process.env.NODE_ENV
    });
    
    console.log(`🚫 [SHUTDOWN] Graceful shutdown disabled in ${process.env.NODE_ENV}, exiting`);
    process.exit(0);
    return;
  }
  
  // Esegui graceful shutdown
  performGracefulShutdown(signal).catch((error) => {
    logger.error('Unhandled error in graceful shutdown', {
      service: 'proxy-server',
      component: 'graceful-shutdown',
      signal,
      error: error.message,
      stack: error.stack
    });
    
    console.log(`💥 [SHUTDOWN] Unhandled error: ${error.message}`);
    process.exit(1);
  });
}

/**
 * Setup del graceful shutdown
 * Registra i listener per i segnali di sistema
 */
export function setupGracefulShutdown() {
  // Registra handler per tutti i segnali configurati
  SHUTDOWN_CONFIG.signals.forEach(signal => {
    process.on(signal, () => handleShutdownSignal(signal));
  });
  
  // Handler per eccezioni non gestite
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception during shutdown setup', {
      service: 'proxy-server',
      component: 'graceful-shutdown',
      error: error.message,
      stack: error.stack
    });
    
    console.log('💥 [SHUTDOWN] Uncaught exception:', error.message);
    
    if (SHUTDOWN_CONFIG.enabled) {
      performGracefulShutdown('uncaughtException').catch(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
  
  // Handler per promise rejections non gestite
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection during shutdown setup', {
      service: 'proxy-server',
      component: 'graceful-shutdown',
      reason: reason?.message || reason,
      stack: reason?.stack
    });
    
    console.log('💥 [SHUTDOWN] Unhandled promise rejection:', reason);
    
    if (SHUTDOWN_CONFIG.enabled) {
      performGracefulShutdown('unhandledRejection').catch(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
  
  if (process.env.DEBUG_SHUTDOWN || process.env.DEBUG_ALL) {
    console.log('✅ Graceful shutdown configured:');
    console.log('   - Enabled:', SHUTDOWN_CONFIG.enabled);
    console.log('   - Signals:', SHUTDOWN_CONFIG.signals.join(', '));
    console.log('   - Graceful timeout:', SHUTDOWN_CONFIG.gracefulTimeout + 'ms');
    console.log('   - Force timeout:', SHUTDOWN_CONFIG.forceTimeout + 'ms');
    console.log('   - Environment:', process.env.NODE_ENV || 'development');
  }
  
  logger.info('Graceful shutdown setup completed', {
    service: 'proxy-server',
    component: 'graceful-shutdown',
    enabled: SHUTDOWN_CONFIG.enabled,
    signals: SHUTDOWN_CONFIG.signals,
    gracefulTimeout: SHUTDOWN_CONFIG.gracefulTimeout,
    forceTimeout: SHUTDOWN_CONFIG.forceTimeout
  });
}

/**
 * Forza il shutdown immediato (per testing o emergenze)
 * @param {string} reason - Motivo del force shutdown
 */
export function forceShutdown(reason = 'Manual force shutdown') {
  logger.warn('Force shutdown requested', {
    service: 'proxy-server',
    component: 'graceful-shutdown',
    reason
  });
  
  console.log(`🚨 [SHUTDOWN] Force shutdown: ${reason}`);
  process.exit(1);
}

/**
 * Ottieni stato del graceful shutdown
 * @returns {Object} Stato corrente
 */
export function getShutdownStatus() {
  return {
    isShuttingDown,
    shutdownStartTime,
    elapsed: shutdownStartTime ? Date.now() - shutdownStartTime : null,
    config: SHUTDOWN_CONFIG,
    hasServer: !!server,
    hasPrisma: !!prismaClient
  };
}

/**
 * Aggiorna configurazione del graceful shutdown
 * @param {Object} newConfig - Nuova configurazione
 */
export function updateShutdownConfig(newConfig) {
  Object.assign(SHUTDOWN_CONFIG, newConfig);
  
  logger.info('Graceful shutdown config updated', {
    service: 'proxy-server',
    component: 'graceful-shutdown',
    newConfig
  });
}

export default {
  setupGracefulShutdown,
  registerForShutdown,
  forceShutdown,
  getShutdownStatus,
  updateShutdownConfig
};