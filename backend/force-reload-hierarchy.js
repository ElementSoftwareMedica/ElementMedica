/**
 * Script temporaneo per forzare il ricaricamento del modulo HierarchyDefinition
 * Questo script crea un endpoint che forza il ricaricamento del modulo
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 4002; // Porta temporanea

// Endpoint per forzare il ricaricamento del modulo HierarchyDefinition
app.post('/force-reload-hierarchy', async (req, res) => {
  try {
    console.log('🔄 Forcing HierarchyDefinition module reload...');
    
    // Path del modulo HierarchyDefinition
    const hierarchyPath = join(__dirname, 'services', 'roleHierarchy', 'HierarchyDefinition.js');
    
    // Rimuovi il modulo dalla cache
    const moduleUrl = `file://${hierarchyPath}`;
    
    // Per ES modules, dobbiamo usare un timestamp per forzare il ricaricamento
    const timestamp = Date.now();
    const reloadUrl = `${moduleUrl}?t=${timestamp}`;
    
    console.log('📂 Module path:', hierarchyPath);
    console.log('🔗 Reload URL:', reloadUrl);
    
    // Importa il modulo con timestamp per forzare il ricaricamento
    const hierarchyModule = await import(reloadUrl);
    
    console.log('✅ Module reloaded successfully');
    console.log('📊 Available roles:', Object.keys(hierarchyModule.ROLE_HIERARCHY || {}));
    
    // Verifica che i nuovi ruoli siano presenti
    const hierarchy = hierarchyModule.ROLE_HIERARCHY || {};
    const newRoles = ['TRAINING_ADMIN', 'CLINIC_ADMIN', 'COMPANY_MANAGER'];
    const foundRoles = newRoles.filter(role => hierarchy[role]);
    
    res.json({
      success: true,
      message: 'HierarchyDefinition module reloaded successfully',
      timestamp: new Date().toISOString(),
      totalRoles: Object.keys(hierarchy).length,
      newRolesFound: foundRoles,
      newRolesMissing: newRoles.filter(role => !hierarchy[role]),
      allRoles: Object.keys(hierarchy)
    });
    
  } catch (error) {
    console.error('❌ Error reloading module:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint per verificare lo stato del modulo
app.get('/check-hierarchy', async (req, res) => {
  try {
    // Importa il modulo corrente
    const hierarchyModule = await import('./services/roleHierarchy/HierarchyDefinition.js');
    const hierarchy = hierarchyModule.ROLE_HIERARCHY || {};
    
    const newRoles = ['TRAINING_ADMIN', 'CLINIC_ADMIN', 'COMPANY_MANAGER'];
    const foundRoles = newRoles.filter(role => hierarchy[role]);
    
    res.json({
      success: true,
      totalRoles: Object.keys(hierarchy).length,
      newRolesFound: foundRoles,
      newRolesMissing: newRoles.filter(role => !hierarchy[role]),
      allRoles: Object.keys(hierarchy),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Force reload server running on port ${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   POST http://localhost:${PORT}/force-reload-hierarchy`);
  console.log(`   GET  http://localhost:${PORT}/check-hierarchy`);
});