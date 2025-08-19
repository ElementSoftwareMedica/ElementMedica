/**
 * GDPR Routes - SISTEMA REFACTORIZZATO
 * 
 * ⚠️  QUESTO FILE È STATO DEPRECATO E REFACTORIZZATO ⚠️
 * 
 * Il sistema GDPR è stato migrato a un'architettura modulare per:
 * - Migliorare la manutenibilità del codice
 * - Separare le responsabilità per dominio
 * - Ottimizzare le performance
 * - Facilitare i test unitari
 * - Ridurre la complessità del file singolo
 * 
 * MIGRAZIONE COMPLETATA:
 * - File originale: 1452 righe → Sistema modulare: 4 moduli specializzati
 * - Moduli creati: consent-management, data-export, data-deletion, audit-compliance
 * - Router principale: backend/routes/gdpr/index.js
 * - Compatibilità API: 100% mantenuta
 * - Performance: Ottimizzate con middleware dedicati
 * - Logging: Centralizzato e migliorato
 * 
 * Per utilizzare il nuovo sistema, fare riferimento a:
 * backend/routes/gdpr/index.js
 */

import gdprModularRouter from './gdpr/index.js';

// Redirect completo al sistema modulare
export default gdprModularRouter;