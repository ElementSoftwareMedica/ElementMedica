/**
 * PersonService - Wrapper per backward compatibility
 * 
 * NOTA: Questo file è stato ottimizzato e refactorizzato.
 * La nuova implementazione modulare si trova in ./person/
 * 
 * Questo wrapper mantiene la compatibilità con il codice esistente
 * mentre utilizza la nuova architettura modulare sottostante.
 */

import PersonService from './person/PersonService.js';
import logger from '../utils/logger.js';

// Log di migrazione per monitorare l'utilizzo
logger.info('PersonService: Using optimized modular implementation');

// Esporta la nuova implementazione modulare
// Mantiene la stessa interfaccia per backward compatibility
export default PersonService;