// Modulo principale
export { default as PersonService } from './PersonService.js';

// Moduli core
export { default as PersonCore } from './core/PersonCore.js';
export { default as PersonRoles } from './core/PersonRoles.js';

// Moduli utility
export { default as PersonUtils } from './utils/PersonUtils.js';
export { default as PersonRoleMapping } from './utils/PersonRoleMapping.js';

// Moduli specializzati
export { default as PersonPreferences } from './preferences/PersonPreferences.js';
export { default as PersonStats } from './stats/PersonStats.js';
export { default as PersonExport } from './export/PersonExport.js';
export { default as PersonImport } from './import/PersonImport.js';

// Export di default per backward compatibility
export default PersonService;