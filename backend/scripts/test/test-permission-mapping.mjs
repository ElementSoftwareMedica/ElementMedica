#!/usr/bin/env node

// Test per verificare la mappatura dei permessi
// Copia delle funzioni da permissionMapping.ts per il test

const hasBackendPermission = (frontendPermission, backendPermissions) => {
  // Se il permesso è già nel formato backend, controllalo direttamente
  if (backendPermissions[frontendPermission] === true) {
    return true;
  }
  
  // Gestione speciale per permessi dashboard
  if (frontendPermission === 'dashboard:read' || frontendPermission === 'dashboard:view') {
    return backendPermissions['VIEW_DASHBOARD'] === true || 
           backendPermissions['dashboard:read'] === true ||
           backendPermissions['dashboard:view'] === true ||
           backendPermissions['dashboard.view'] === true ||  // Formato con punto
           backendPermissions['dashboard.read'] === true ||  // Formato con punto
           // Per admin, concedi accesso se ha permessi generali
           backendPermissions['ADMIN_PANEL'] === true ||
           backendPermissions['VIEW_COMPANIES'] === true; // Se può vedere aziende, può vedere dashboard
  }
  
  // Gestione speciale per permessi companies
  if (frontendPermission === 'companies:read' || frontendPermission === 'companies:view') {
    return backendPermissions['VIEW_COMPANIES'] === true || 
           backendPermissions['companies:read'] === true ||
           backendPermissions['companies:view'] === true ||
           backendPermissions['companies.view'] === true ||  // Formato con punto
           backendPermissions['companies.read'] === true;    // Formato con punto
  }
  
  return false;
};

const convertBackendToFrontendPermissions = (backendPermissions) => {
  const frontendPermissions = {};
  
  // Mantieni i permessi backend originali
  Object.keys(backendPermissions).forEach(key => {
    if (backendPermissions[key] === true) {
      frontendPermissions[key] = true;
    }
  });
  
  // Aggiungi le mappature frontend
  Object.keys(backendPermissions).forEach(backendKey => {
    if (backendPermissions[backendKey] === true) {
      // Casi speciali per permessi dashboard
      if (backendKey === 'VIEW_DASHBOARD' || backendKey === 'dashboard:read' || backendKey === 'dashboard:view' || backendKey === 'dashboard.view' || backendKey === 'dashboard.read') {
        frontendPermissions['dashboard:read'] = true;
        frontendPermissions['dashboard:view'] = true;
      }
      // Gestione formato con punto per companies
      else if (backendKey === 'companies.view' || backendKey === 'companies.read') {
        frontendPermissions['companies:read'] = true;
        frontendPermissions['companies:view'] = true;
      }
      else if (backendKey === 'companies.create') {
        frontendPermissions['companies:create'] = true;
      }
      else if (backendKey === 'companies.edit' || backendKey === 'companies.update') {
        frontendPermissions['companies:edit'] = true;
        frontendPermissions['companies:update'] = true;
      }
      else if (backendKey === 'companies.delete') {
        frontendPermissions['companies:delete'] = true;
      }
      else if (backendKey === 'companies.manage') {
        frontendPermissions['companies:manage'] = true;
        frontendPermissions['companies:read'] = true;
        frontendPermissions['companies:view'] = true;
        frontendPermissions['companies:create'] = true;
        frontendPermissions['companies:edit'] = true;
        frontendPermissions['companies:update'] = true;
        frontendPermissions['companies:delete'] = true;
      }
    }
  });
  
  return frontendPermissions;
};

// Simula i permessi che vengono dal backend per l'Admin
const backendPermissions = {
  'dashboard.view': true,
  'companies.view': true,
  'companies.create': true,
  'companies.edit': true,
  'companies.delete': true,
  'companies.manage': true,
  'persons.view': true,
  'persons.read': true,
  'persons.create': true,
  'persons.edit': true,
  'persons.delete': true,
  'persons.manage': true,
  'persons.view_employees': true,
  'persons.view_trainers': true
};

console.log('🔍 Testing permission mapping...');
console.log('Backend permissions:', Object.keys(backendPermissions).filter(k => backendPermissions[k]));

// Converti i permessi
const frontendPermissions = convertBackendToFrontendPermissions(backendPermissions);
console.log('Frontend permissions:', Object.keys(frontendPermissions).filter(k => frontendPermissions[k]));

// Test specifici
console.log('\n🧪 Testing specific permissions:');
console.log('dashboard:read:', hasBackendPermission('dashboard:read', backendPermissions));
console.log('dashboard:view:', hasBackendPermission('dashboard:view', backendPermissions));
console.log('companies:read:', hasBackendPermission('companies:read', backendPermissions));
console.log('companies:view:', hasBackendPermission('companies:view', backendPermissions));

// Test con i permessi convertiti
console.log('\n🧪 Testing with converted permissions:');
console.log('dashboard:read (converted):', frontendPermissions['dashboard:read']);
console.log('dashboard:view (converted):', frontendPermissions['dashboard:view']);
console.log('companies:read (converted):', frontendPermissions['companies:read']);
console.log('companies:view (converted):', frontendPermissions['companies:view']);