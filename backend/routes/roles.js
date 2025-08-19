/**
 * DEPRECATED: Questo file è stato sostituito dal sistema modulare
 * 
 * Il sistema dei ruoli è stato completamente refactorizzato in un'architettura modulare
 * per migliorare la manutenibilità, la testabilità e la scalabilità.
 * 
 * NUOVO PERCORSO: /backend/routes/roles/index.js
 * 
 * Moduli implementati:
 * - hierarchy.js: Gestione della gerarchia dei ruoli
 * - basic-management.js: Operazioni CRUD sui ruoli
 * - custom-roles.js: Gestione dei ruoli personalizzati
 * - assignment.js: Assegnazione e rimozione ruoli
 * - advanced-permissions.js: Permessi avanzati
 * - permissions.js: Gestione dei permessi dei ruoli
 * - users.js: Gestione degli utenti per ruolo
 * - analytics.js: Statistiche sui ruoli
 * - test-utils.js: Test e utility
 * 
 * Data migrazione: Dicembre 2024
 * Righe migrate: 2627 → 9 moduli specializzati
 * Performance: Timeout 504 risolto
 * Compatibilità API: Mantenuta al 100%
 */

import rolesModularRouter from './roles/index.js';

// Redirect completo al nuovo sistema modulare
export default rolesModularRouter;