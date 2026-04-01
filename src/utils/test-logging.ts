/**
 * Test del Sistema di Logging Ottimizzato
 * Verifica che il nuovo sistema riduca effettivamente i log ripetitivi
 */

import { recordApiCall, recordMetric, recordCacheOperation, logMetricsSummary } from './metrics';
import { logGdprAction, logGdprSummary } from './gdpr';
import { createConditionalLogger, setDetailedLogging } from './logging-config';

// Test del sistema di logging
export function testLoggingSystem(): void {

  // Test 1: Metriche senza logging dettagliato (default)
  
  for (let i = 0; i < 20; i++) {
    recordApiCall(`/api/test/${i}`, 'GET', 100 + Math.random() * 200, 200, { cached: Math.random() > 0.5 });
    recordMetric(`test_metric_${i}`, Math.random() * 1000);
    recordCacheOperation(Math.random() > 0.5 ? 'hit' : 'miss', `cache_key_${i}`);
  }
  
  logMetricsSummary();

  // Test 2: GDPR senza logging dettagliato (default)
  
  for (let i = 0; i < 15; i++) {
    const actions = ['VIEW_PROFILE', 'UPDATE_PROFILE', 'LOGIN', 'LOGOUT'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    logGdprAction(`user_${i}`, action, 'person', `person_${i}`, { test: true });
  }
  
  // Aggiungi alcune azioni critiche (dovrebbero essere sempre loggati)
  logGdprAction('user_critical', 'DELETE_PERSON', 'person', 'person_critical', { critical: true });
  logGdprAction('user_error', 'EXPORT_DATA', 'person', 'person_error', { test: true }, false, 'Test error');
  
  logGdprSummary();

  // Test 3: Logger condizionale
  const testLogger = createConditionalLogger('TEST_MODULE');
  
  for (let i = 0; i < 10; i++) {
    testLogger.log(`Test log message ${i}`, { data: `test_data_${i}` });
  }
  
  testLogger.log('Critical error occurred', { error: 'test_error' }, { isError: true, isCritical: true });
  testLogger.log('Another critical action', { action: 'critical_test' }, { isCritical: true });
  
  // Force flush per vedere i batch
  testLogger.forceFlush();

  // Test 4: Abilitazione logging dettagliato
  setDetailedLogging(true);
  
  for (let i = 0; i < 5; i++) {
    recordApiCall(`/api/detailed/${i}`, 'POST', 150 + Math.random() * 100, 200);
    recordMetric(`detailed_metric_${i}`, Math.random() * 500);
  }
  
  for (let i = 0; i < 3; i++) {
    logGdprAction(`detailed_user_${i}`, 'VIEW_PROFILE', 'person', `detailed_person_${i}`, { detailed: true });
  }
  

  // Test 5: Disabilitazione logging dettagliato
  setDetailedLogging(false);
  
  for (let i = 0; i < 5; i++) {
    recordApiCall(`/api/silent/${i}`, 'GET', 120 + Math.random() * 80, 200);
  }
  

  // Riassunto finale
  logMetricsSummary();
  logGdprSummary();
  
}

// Test degli helper di debug
export function testDebugHelpers(): void {

  // Verifica che gli helper siano disponibili
  if (typeof window !== 'undefined') {
    
    const helpers = [
      'loggingDebug',
      'metricsDebug', 
      'gdprDebug'
    ];
    
    helpers.forEach(helper => {
      const windowWithHelpers = window as typeof window & Record<string, unknown>;
      if (windowWithHelpers[helper]) {
      } else {
      }
    });
    
    try {
      const windowWithDebug = window as typeof window & {
        loggingDebug?: { getConfig(): unknown };
        metricsDebug?: { getStats(): unknown };
        gdprDebug?: { getStats(): unknown };
      };
      
      const loggingConfig = windowWithDebug.loggingDebug?.getConfig();
      
      const metricsStats = windowWithDebug.metricsDebug?.getStats();
      
      const gdprStats = windowWithDebug.gdprDebug?.getStats();
      
    } catch (error) {
    }
    
  } else {
  }
  
}

// Test di performance
export function testPerformance(): void {
  
  const iterations = 1000;
  
  // Test performance logging disabilitato
  setDetailedLogging(false);
  
  const startDisabled = performance.now();
  for (let i = 0; i < iterations; i++) {
    recordApiCall(`/api/perf/${i}`, 'GET', 100, 200);
    logGdprAction(`perf_user_${i}`, 'VIEW_PROFILE', 'person', `perf_person_${i}`);
  }
  const endDisabled = performance.now();
  
  
  // Test performance logging abilitato
  setDetailedLogging(true);
  
  const startEnabled = performance.now();
  for (let i = 0; i < iterations; i++) {
    recordApiCall(`/api/perf_enabled/${i}`, 'GET', 100, 200);
    logGdprAction(`perf_enabled_user_${i}`, 'VIEW_PROFILE', 'person', `perf_enabled_person_${i}`);
  }
  const endEnabled = performance.now();
  
  
  // Ripristina stato
  setDetailedLogging(false);
  
  // Risultati
  const disabledTime = endDisabled - startDisabled;
  const enabledTime = endEnabled - startEnabled;
  const overhead = ((enabledTime - disabledTime) / disabledTime) * 100;
  
  
  if (overhead < 50) {
  } else {
  }
}

// Esporta funzione principale per test completo
export function runAllTests(): void {
  
  try {
    testLoggingSystem();
    
    testDebugHelpers();
    
    testPerformance();
    
    
  } catch (error) {
  }
}

// Definizione degli exports per il typing
const testLoggingExports = {
  runAll: runAllTests,
  testSystem: testLoggingSystem,
  testHelpers: testDebugHelpers,
  testPerformance: testPerformance
};

// Auto-esecuzione in development se richiesto
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Esponi funzioni di test globalmente per debug
  (window as typeof window & { testLogging?: typeof testLoggingExports }).testLogging = testLoggingExports;
  
}

export default {
  runAllTests,
  testLoggingSystem,
  testDebugHelpers,
  testPerformance
};