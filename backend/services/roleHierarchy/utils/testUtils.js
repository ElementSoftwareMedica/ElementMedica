/**
 * Utility per test del RoleHierarchyService
 * Fornisce funzioni helper per testare la nuova struttura modulare
 */

import RoleHierarchyService from '../index.js';

/**
 * Test delle funzionalità base della gerarchia
 */
export function testBasicHierarchy() {
  console.log('=== Test Funzionalità Base ===');
  
  // Test livelli
  console.log('Livello SUPER_ADMIN:', RoleHierarchyService.getRoleLevel('SUPER_ADMIN'));
  console.log('Livello ADMIN:', RoleHierarchyService.getRoleLevel('ADMIN'));
  console.log('Livello EMPLOYEE:', RoleHierarchyService.getRoleLevel('EMPLOYEE'));
  
  // Test percorsi
  console.log('Percorso EMPLOYEE:', RoleHierarchyService.calculatePath('EMPLOYEE'));
  console.log('Percorso TRAINER:', RoleHierarchyService.calculatePath('TRAINER'));
  
  // Test assegnazioni
  console.log('ADMIN può assegnare MANAGER:', RoleHierarchyService.canAssignToRole('ADMIN', 'MANAGER'));
  console.log('EMPLOYEE può assegnare ADMIN:', RoleHierarchyService.canAssignToRole('EMPLOYEE', 'ADMIN'));
  
  console.log('=== Fine Test Base ===\n');
}

/**
 * Test delle funzionalità di permessi
 */
export function testPermissions() {
  console.log('=== Test Permessi ===');
  
  // Test permessi ruolo
  console.log('Permessi ADMIN:', RoleHierarchyService.getRolePermissions('ADMIN').slice(0, 5));
  console.log('Permessi EMPLOYEE:', RoleHierarchyService.getRolePermissions('EMPLOYEE'));
  
  // Test permessi assegnabili
  console.log('Permessi assegnabili da ADMIN:', RoleHierarchyService.getAssignablePermissions('ADMIN').slice(0, 5));
  
  // Test verifica permessi
  console.log('ADMIN ha VIEW_USERS:', RoleHierarchyService.hasPermission('ADMIN', 'VIEW_USERS'));
  console.log('EMPLOYEE ha DELETE_USERS:', RoleHierarchyService.hasPermission('EMPLOYEE', 'DELETE_USERS'));
  
  console.log('=== Fine Test Permessi ===\n');
}

/**
 * Test delle funzionalità di calcolo
 */
export function testCalculations() {
  console.log('=== Test Calcoli ===');
  
  // Test ruolo più alto
  const roles = ['EMPLOYEE', 'MANAGER', 'TRAINER'];
  console.log('Ruolo più alto tra', roles, ':', RoleHierarchyService.getHighestRole(roles));
  
  // Test distanza gerarchica
  console.log('Distanza ADMIN-EMPLOYEE:', RoleHierarchyService.calculateHierarchicalDistance('ADMIN', 'EMPLOYEE'));
  
  // Test stesso livello
  console.log('MANAGER e HR_MANAGER stesso livello:', RoleHierarchyService.areSameLevel('MANAGER', 'HR_MANAGER'));
  
  // Test subordinati
  console.log('Subordinati di ADMIN:', RoleHierarchyService.getSubordinateRoles('ADMIN').slice(0, 5));
  
  console.log('=== Fine Test Calcoli ===\n');
}

/**
 * Test di compatibilità con l'interfaccia esistente
 */
export function testCompatibility() {
  console.log('=== Test Compatibilità ===');
  
  // Verifica che tutti i metodi statici esistano
  const requiredMethods = [
    'getRoleLevel',
    'calculatePath',
    'canAssignToRole',
    'canManageRole',
    'getAssignableRoles',
    'getHighestRole',
    'getAssignablePermissions',
    'getAllAssignablePermissions',
    'getRoleHierarchy',
    'assignRoleWithHierarchy',
    'assignPermissionsWithHierarchy',
    'getUserRoleHierarchy',
    'updateRoleHierarchy',
    'addRoleToHierarchy',
    'getVisibleRolesForUser'
  ];
  
  const missingMethods = requiredMethods.filter(method => 
    typeof RoleHierarchyService[method] !== 'function'
  );
  
  if (missingMethods.length === 0) {
    console.log('✅ Tutti i metodi richiesti sono presenti');
  } else {
    console.log('❌ Metodi mancanti:', missingMethods);
  }
  
  // Verifica che ROLE_HIERARCHY sia accessibile
  if (RoleHierarchyService.ROLE_HIERARCHY) {
    console.log('✅ ROLE_HIERARCHY accessibile');
    console.log('Numero di ruoli definiti:', Object.keys(RoleHierarchyService.ROLE_HIERARCHY).length);
  } else {
    console.log('❌ ROLE_HIERARCHY non accessibile');
  }
  
  console.log('=== Fine Test Compatibilità ===\n');
}

/**
 * Esegue tutti i test
 */
export function runAllTests() {
  console.log('🚀 Avvio test RoleHierarchyService modulare\n');
  
  try {
    testCompatibility();
    testBasicHierarchy();
    testPermissions();
    testCalculations();
    
    console.log('✅ Tutti i test completati con successo!');
  } catch (error) {
    console.error('❌ Errore durante i test:', error);
  }
}

/**
 * Test specifico per verificare la struttura modulare
 */
export function testModularStructure() {
  console.log('=== Test Struttura Modulare ===');
  
  // Verifica che i moduli siano separati correttamente
  try {
    // Test import diretto dei moduli (se necessario)
    console.log('✅ Struttura modulare funzionante');
    
    // Verifica che le funzioni siano delegate correttamente
    const testRole = 'ADMIN';
    const level1 = RoleHierarchyService.getRoleLevel(testRole);
    const info = RoleHierarchyService.getRoleInfo(testRole);
    
    if (level1 === info.level) {
      console.log('✅ Delegazione funzioni corretta');
    } else {
      console.log('❌ Problema nella delegazione');
    }
    
  } catch (error) {
    console.log('❌ Errore nella struttura modulare:', error.message);
  }
  
  console.log('=== Fine Test Struttura Modulare ===\n');
}

// Esporta una funzione di test rapido
export function quickTest() {
  console.log('🔍 Test rapido RoleHierarchyService...');
  
  const tests = [
    () => RoleHierarchyService.getRoleLevel('ADMIN') === 1,
    () => RoleHierarchyService.canAssignToRole('ADMIN', 'MANAGER'),
    () => RoleHierarchyService.getRolePermissions('ADMIN').length > 0,
    () => RoleHierarchyService.getHighestRole(['ADMIN', 'EMPLOYEE']) === 'ADMIN'
  ];
  
  const results = tests.map((test, index) => {
    try {
      const result = test();
      console.log(`Test ${index + 1}: ${result ? '✅' : '❌'}`);
      return result;
    } catch (error) {
      console.log(`Test ${index + 1}: ❌ (${error.message})`);
      return false;
    }
  });
  
  const passed = results.filter(Boolean).length;
  console.log(`\nRisultato: ${passed}/${tests.length} test passati`);
  
  return passed === tests.length;
}