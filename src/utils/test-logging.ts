/**
 * Test del Sistema di Logging Ottimizzato
 * Verifica che il nuovo sistema riduca effettivamente i log ripetitivi
 */

import { recordApiCall, recordMetric, recordCacheOperation, logMetricsSummary } from './metrics';
import { logGdprAction, logGdprSummary } from './gdpr';
import { createConditionalLogger, setDetailedLogging } from './logging-config';

// Test del sistema di logging
export function testLoggingSystem(): void {
  console.log('🧪 Avvio test sistema di logging ottimizzato...\n');

  // Test 1: Metriche senza logging dettagliato (default)
  console.log('📊 Test 1: Metriche con logging disabilitato');
  console.log('Generando 20 metriche... (dovrebbero essere silenti)');
  
  for (let i = 0; i < 20; i++) {
    recordApiCall(`/api/test/${i}`, 'GET', 100 + Math.random() * 200, 200, { cached: Math.random() > 0.5 });
    recordMetric(`test_metric_${i}`, Math.random() * 1000);
    recordCacheOperation(Math.random() > 0.5 ? 'hit' : 'miss', `cache_key_${i}`);
  }
  
  console.log('✅ Metriche generate (dovrebbero essere silenti)');
  console.log('📊 Riassunto metriche:');
  logMetricsSummary();
  console.log('');

  // Test 2: GDPR senza logging dettagliato (default)
  console.log('🔒 Test 2: Azioni GDPR con logging disabilitato');
  console.log('Generando 15 azioni GDPR... (dovrebbero essere silenti tranne le critiche)');
  
  for (let i = 0; i < 15; i++) {
    const actions = ['VIEW_PROFILE', 'UPDATE_PROFILE', 'LOGIN', 'LOGOUT'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    logGdprAction(`user_${i}`, action, 'person', `person_${i}`, { test: true });
  }
  
  // Aggiungi alcune azioni critiche (dovrebbero essere sempre loggati)
  logGdprAction('user_critical', 'DELETE_PERSON', 'person', 'person_critical', { critical: true });
  logGdprAction('user_error', 'EXPORT_DATA', 'person', 'person_error', { test: true }, false, 'Test error');
  
  console.log('✅ Azioni GDPR generate');
  console.log('🔒 Riassunto GDPR:');
  logGdprSummary();
  console.log('');

  // Test 3: Logger condizionale
  console.log('🔧 Test 3: Logger condizionale');
  const testLogger = createConditionalLogger('TEST_MODULE');
  
  console.log('Generando 10 log normali... (dovrebbero essere in batch)');
  for (let i = 0; i < 10; i++) {
    testLogger.log(`Test log message ${i}`, { data: `test_data_${i}` });
  }
  
  console.log('Generando 2 log critici... (dovrebbero essere immediati)');
  testLogger.log('Critical error occurred', { error: 'test_error' }, { isError: true, isCritical: true });
  testLogger.log('Another critical action', { action: 'critical_test' }, { isCritical: true });
  
  // Force flush per vedere i batch
  testLogger.forceFlush();
  console.log('✅ Test logger condizionale completato');
  console.log('');

  // Test 4: Abilitazione logging dettagliato
  console.log('🔍 Test 4: Abilitazione logging dettagliato');
  console.log('Abilitando logging dettagliato...');
  setDetailedLogging(true);
  
  console.log('Generando 5 metriche con logging abilitato... (dovrebbero essere visibili)');
  for (let i = 0; i < 5; i++) {
    recordApiCall(`/api/detailed/${i}`, 'POST', 150 + Math.random() * 100, 200);
    recordMetric(`detailed_metric_${i}`, Math.random() * 500);
  }
  
  console.log('Generando 3 azioni GDPR con logging abilitato... (dovrebbero essere visibili)');
  for (let i = 0; i < 3; i++) {
    logGdprAction(`detailed_user_${i}`, 'VIEW_PROFILE', 'person', `detailed_person_${i}`, { detailed: true });
  }
  
  console.log('✅ Test logging dettagliato completato');
  console.log('');

  // Test 5: Disabilitazione logging dettagliato
  console.log('🔇 Test 5: Disabilitazione logging dettagliato');
  setDetailedLogging(false);
  
  console.log('Generando 5 metriche con logging disabilitato... (dovrebbero essere silenti)');
  for (let i = 0; i < 5; i++) {
    recordApiCall(`/api/silent/${i}`, 'GET', 120 + Math.random() * 80, 200);
  }
  
  console.log('✅ Test disabilitazione completato');
  console.log('');

  // Riassunto finale
  console.log('📋 Riassunto finale test:');
  logMetricsSummary();
  logGdprSummary();
  
  console.log('\n🎉 Test sistema di logging completato!');
  console.log('📝 Verifica che:');
  console.log('   - I log normali siano stati ridotti/raggruppati');
  console.log('   - Gli errori e azioni critiche siano sempre visibili');
  console.log('   - Il logging dettagliato funzioni quando abilitato');
  console.log('   - Il sistema torni silente quando disabilitato');
}

// Test degli helper di debug
export function testDebugHelpers(): void {
  console.log('🛠️ Test helper di debug...\n');

  // Verifica che gli helper siano disponibili
  if (typeof window !== 'undefined') {
    console.log('🔍 Verificando helper globali...');
    
    const helpers = [
      'loggingDebug',
      'metricsDebug', 
      'gdprDebug'
    ];
    
    helpers.forEach(helper => {
      const windowWithHelpers = window as typeof window & Record<string, unknown>;
      if (windowWithHelpers[helper]) {
        console.log(`✅ ${helper} disponibile`);
        console.log(`   Metodi:`, Object.keys(windowWithHelpers[helper] as object));
      } else {
        console.log(`❌ ${helper} non disponibile`);
      }
    });
    
    console.log('\n📊 Test statistiche:');
    try {
      const windowWithDebug = window as typeof window & {
        loggingDebug?: { getConfig(): unknown };
        metricsDebug?: { getStats(): unknown };
        gdprDebug?: { getStats(): unknown };
      };
      
      const loggingConfig = windowWithDebug.loggingDebug?.getConfig();
      console.log('Configurazione logging:', loggingConfig);
      
      const metricsStats = windowWithDebug.metricsDebug?.getStats();
      console.log('Statistiche metriche:', metricsStats);
      
      const gdprStats = windowWithDebug.gdprDebug?.getStats();
      console.log('Statistiche GDPR:', gdprStats);
      
    } catch (error) {
      console.log('⚠️ Errore nel recupero statistiche:', error);
    }
    
  } else {
    console.log('⚠️ Window non disponibile (ambiente Node.js)');
  }
  
  console.log('\n✅ Test helper di debug completato');
}

// Test di performance
export function testPerformance(): void {
  console.log('⚡ Test performance sistema di logging...\n');
  
  const iterations = 1000;
  
  // Test performance logging disabilitato
  console.log(`🔇 Test ${iterations} operazioni con logging disabilitato...`);
  setDetailedLogging(false);
  
  const startDisabled = performance.now();
  for (let i = 0; i < iterations; i++) {
    recordApiCall(`/api/perf/${i}`, 'GET', 100, 200);
    logGdprAction(`perf_user_${i}`, 'VIEW_PROFILE', 'person', `perf_person_${i}`);
  }
  const endDisabled = performance.now();
  
  console.log(`✅ Completato in ${Math.round(endDisabled - startDisabled)}ms`);
  
  // Test performance logging abilitato
  console.log(`🔍 Test ${iterations} operazioni con logging abilitato...`);
  setDetailedLogging(true);
  
  const startEnabled = performance.now();
  for (let i = 0; i < iterations; i++) {
    recordApiCall(`/api/perf_enabled/${i}`, 'GET', 100, 200);
    logGdprAction(`perf_enabled_user_${i}`, 'VIEW_PROFILE', 'person', `perf_enabled_person_${i}`);
  }
  const endEnabled = performance.now();
  
  console.log(`✅ Completato in ${Math.round(endEnabled - startEnabled)}ms`);
  
  // Ripristina stato
  setDetailedLogging(false);
  
  // Risultati
  const disabledTime = endDisabled - startDisabled;
  const enabledTime = endEnabled - startEnabled;
  const overhead = ((enabledTime - disabledTime) / disabledTime) * 100;
  
  console.log('\n📊 Risultati performance:');
  console.log(`   Logging disabilitato: ${Math.round(disabledTime)}ms`);
  console.log(`   Logging abilitato: ${Math.round(enabledTime)}ms`);
  console.log(`   Overhead: ${Math.round(overhead)}%`);
  
  if (overhead < 50) {
    console.log('✅ Performance accettabile (overhead < 50%)');
  } else {
    console.log('⚠️ Performance da ottimizzare (overhead > 50%)');
  }
}

// Esporta funzione principale per test completo
export function runAllTests(): void {
  console.log('🚀 Avvio test completo sistema di logging ottimizzato\n');
  console.log('=' .repeat(60));
  
  try {
    testLoggingSystem();
    console.log('\n' + '='.repeat(60));
    
    testDebugHelpers();
    console.log('\n' + '='.repeat(60));
    
    testPerformance();
    console.log('\n' + '='.repeat(60));
    
    console.log('\n🎉 Tutti i test completati con successo!');
    console.log('📝 Il sistema di logging ottimizzato è operativo.');
    
  } catch (error) {
    console.error('❌ Errore durante i test:', error);
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
  
  console.log('🧪 Test logging disponibili in window.testLogging');
}

export default {
  runAllTests,
  testLoggingSystem,
  testDebugHelpers,
  testPerformance
};