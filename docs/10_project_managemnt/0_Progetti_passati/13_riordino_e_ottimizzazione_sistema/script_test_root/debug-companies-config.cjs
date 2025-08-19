// Test per verificare il problema del controllo permessi
// Simuliamo la logica del template

console.log('🔍 Debug problema accesso pagina companies');
console.log('=' .repeat(60));

// Simuliamo la configurazione che viene creata
const simulatedConfig = {
  entity: {
    name: 'companies',  // Questo dovrebbe essere il valore
    namePlural: 'Aziende',
    description: 'Gestione aziende'
  }
};

console.log('\n📋 Configurazione simulata:');
console.log('  - entity.name:', simulatedConfig.entity.name);
console.log('  - entity.namePlural:', simulatedConfig.entity.namePlural);

// Simuliamo il controllo permessi del template
const resourceName = simulatedConfig.entity.name.toLowerCase();
console.log('\n🔍 Controllo permessi template:');
console.log('  - resourceName:', resourceName);
console.log('  - Permesso richiesto:', `${resourceName}:read`);

// Simuliamo i permessi dell'admin (dal test precedente)
const adminPermissions = {
  'companies:read': true,
  'companies:create': true,
  'companies:delete': true
};

console.log('\n📋 Permessi admin disponibili:');
Object.entries(adminPermissions).forEach(([perm, value]) => {
  console.log(`  - ${perm}: ${value}`);
});

// Simuliamo la funzione hasPermission
function simulateHasPermission(resource, action) {
  const permissionKey = `${resource}:${action}`;
  const hasPermission = adminPermissions[permissionKey] === true;
  
  console.log(`\n🔍 hasPermission('${resource}', '${action}'):`);
  console.log(`  - Cerca permesso: ${permissionKey}`);
  console.log(`  - Risultato: ${hasPermission}`);
  
  return hasPermission;
}

// Test del controllo
const hasReadPermission = simulateHasPermission(resourceName, 'read');

console.log('\n📊 Risultato finale:');
if (hasReadPermission) {
  console.log('✅ ACCESSO CONSENTITO: L\'utente dovrebbe vedere la pagina');
  console.log('\n🤔 Se il problema persiste, potrebbe essere:');
  console.log('   1. Un problema nel frontend (cache, stato)');
  console.log('   2. Un errore nella funzione hasPermission di AuthContext');
  console.log('   3. Un problema di timing nel caricamento dei permessi');
} else {
  console.log('❌ ACCESSO NEGATO: Questo spiega il redirect al login');
  console.log('\n🔧 Possibili cause:');
  console.log('   1. Nome risorsa errato nella configurazione');
  console.log('   2. Permessi non caricati correttamente');
  console.log('   3. Errore nella logica hasPermission');
}

console.log('\n🎯 PROSSIMI PASSI:');
console.log('   1. Verificare AuthContext.hasPermission nel browser');
console.log('   2. Controllare i permessi caricati nel frontend');
console.log('   3. Aggiungere debug logging nel template');