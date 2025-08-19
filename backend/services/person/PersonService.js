import PersonCore from './core/PersonCore.js';
import PersonRoles from './core/PersonRoles.js';
import PersonUtils from './utils/PersonUtils.js';
import PersonRoleMapping from './utils/PersonRoleMapping.js';
import PersonPreferences from './preferences/PersonPreferences.js';
import PersonStats from './stats/PersonStats.js';
import PersonExport from './export/PersonExport.js';
import PersonImport from './import/PersonImport.js';
import logger from '../../utils/logger.js';

/**
 * PersonService - Servizio principale per la gestione delle persone
 * Versione ottimizzata e modulare
 */
class PersonService {
  // ==================== CORE OPERATIONS ====================
  
  /**
   * Ottiene persone per ruolo
   * @param {string|Array} roleType - Tipo/i di ruolo
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} Array di persone
   */
  static async getPersonsByRole(roleType, options = {}) {
    return await PersonCore.getPersonsByRole(roleType, options);
  }

  /**
   * Ottiene una persona per ID
   * @param {string} id - ID della persona
   * @param {Object} options - Opzioni di inclusione
   * @returns {Promise<Object|null>} Persona o null
   */
  static async getPersonById(id, options = {}) {
    return await PersonCore.getPersonById(id, options);
  }

  /**
   * Crea una nuova persona
   * @param {Object} personData - Dati della persona
   * @param {string} roleType - Tipo di ruolo
   * @param {string} companyId - ID dell'azienda (opzionale)
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Persona creata
   */
  static async createPerson(personData, roleType = 'EMPLOYEE', companyId = null, tenantId = null) {
    return await PersonCore.createPerson(personData, roleType, companyId, tenantId);
  }

  /**
   * Aggiorna una persona
   * @param {string} id - ID della persona
   * @param {Object} updateData - Dati da aggiornare
   * @returns {Promise<Object>} Persona aggiornata
   */
  static async updatePerson(id, updateData) {
    return await PersonCore.updatePerson(id, updateData);
  }

  /**
   * Elimina una persona (soft delete)
   * @param {string} id - ID della persona
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  static async deletePerson(id) {
    return await PersonCore.deletePerson(id);
  }

  /**
   * Elimina più persone
   * @param {Array} ids - Array di ID delle persone
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  static async deleteMultiplePersons(ids) {
    return await PersonCore.deleteMultiplePersons(ids);
  }

  /**
   * Cerca persone
   * @param {Object} filters - Filtri di ricerca
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} Array di persone
   */
  static async searchPersons(filters, options = {}) {
    return await PersonCore.searchPersons(filters, options);
  }

  /**
   * Ottiene persone con paginazione
   * @param {Object} options - Opzioni di paginazione e filtri
   * @returns {Promise<Object>} Risultato paginato
   */
  static async getPersonsWithPagination(options = {}) {
    return await PersonCore.getPersonsWithPagination(options);
  }

  /**
   * Resetta la password di una persona
   * @param {string} id - ID della persona
   * @returns {Promise<Object>} Nuova password temporanea
   */
  static async resetPersonPassword(id) {
    return await PersonCore.resetPersonPassword(id);
  }

  /**
   * Verifica disponibilità username
   * @param {string} username - Username da verificare
   * @param {string} excludeId - ID da escludere (per aggiornamenti)
   * @returns {Promise<boolean>} True se disponibile
   */
  static async checkUsernameAvailability(username, excludeId = null) {
    return await PersonCore.checkUsernameAvailability(username, excludeId);
  }

  /**
   * Verifica disponibilità email
   * @param {string} email - Email da verificare
   * @param {string} excludeId - ID da escludere (per aggiornamenti)
   * @returns {Promise<boolean>} True se disponibile
   */
  static async checkEmailAvailability(email, excludeId = null) {
    return await PersonCore.checkEmailAvailability(email, excludeId);
  }

  // ==================== ROLE MANAGEMENT ====================

  /**
   * Aggiunge un ruolo a una persona
   * @param {string} personId - ID della persona
   * @param {string} roleType - Tipo di ruolo
   * @param {string} companyId - ID dell'azienda (opzionale)
   * @param {string} tenantId - ID del tenant (opzionale)
   * @returns {Promise<Object>} Ruolo creato
   */
  static async addRole(personId, roleType, companyId = null, tenantId = null) {
    return await PersonRoles.addRole(personId, roleType, companyId, tenantId);
  }

  /**
   * Rimuove un ruolo da una persona
   * @param {string} personId - ID della persona
   * @param {string} roleType - Tipo di ruolo
   * @param {string} companyId - ID dell'azienda (opzionale)
   * @param {string} tenantId - ID del tenant (opzionale)
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  static async removeRole(personId, roleType, companyId = null, tenantId = null) {
    return await PersonRoles.removeRole(personId, roleType, companyId, tenantId);
  }

  /**
   * Ottiene tutti i ruoli di una persona
   * @param {string} personId - ID della persona
   * @param {boolean} activeOnly - Solo ruoli attivi
   * @returns {Promise<Array>} Array di ruoli
   */
  static async getPersonRoles(personId, activeOnly = true) {
    return await PersonRoles.getPersonRoles(personId, activeOnly);
  }

  /**
   * Verifica se una persona ha un ruolo specifico
   * @param {string} personId - ID della persona
   * @param {string|Array} roleType - Tipo/i di ruolo
   * @param {string} companyId - ID dell'azienda (opzionale)
   * @param {string} tenantId - ID del tenant (opzionale)
   * @returns {Promise<boolean>} True se ha il ruolo
   */
  static async hasRole(personId, roleType, companyId = null, tenantId = null) {
    return await PersonRoles.hasRole(personId, roleType, companyId, tenantId);
  }

  // ==================== STATISTICS ====================

  /**
   * Ottiene statistiche delle persone
   * @param {Object} filters - Filtri opzionali
   * @returns {Promise<Object>} Statistiche
   */
  static async getPersonStats(filters = {}) {
    return await PersonStats.getGeneralStats(filters);
  }

  /**
   * Ottiene statistiche per ruolo
   * @param {Object} filters - Filtri opzionali
   * @returns {Promise<Object>} Statistiche per ruolo
   */
  static async getRoleStats(filters = {}) {
    return await PersonStats.getRoleStats(filters);
  }

  /**
   * Ottiene statistiche di attività
   * @param {string} period - Periodo (day, week, month, year)
   * @param {Object} filters - Filtri opzionali
   * @returns {Promise<Object>} Statistiche di attività
   */
  static async getActivityStats(period = 'month', filters = {}) {
    return await PersonStats.getActivityStats(period, filters);
  }

  // ==================== EXPORT/IMPORT ====================

  /**
   * Esporta persone in CSV
   * @param {Object} filters - Filtri di esportazione
   * @param {Object} options - Opzioni di esportazione
   * @returns {Promise<string>} Contenuto CSV
   */
  static async exportPersonsToCSV(filters = {}, options = {}) {
    return await PersonExport.exportToCSV(filters, options);
  }

  /**
   * Esporta persone in JSON
   * @param {Object} filters - Filtri di esportazione
   * @param {Object} options - Opzioni di esportazione
   * @returns {Promise<Object>} Dati JSON
   */
  static async exportPersonsToJSON(filters = {}, options = {}) {
    return await PersonExport.exportToJSON(filters, options);
  }

  /**
   * Importa persone da JSON
   * @param {Array} personsData - Array di dati delle persone
   * @param {Array} overwriteIds - Array di ID da sovrascrivere (opzionale)
   * @param {string} companyId - ID dell'azienda (opzionale)
   * @param {string} tenantId - ID del tenant (opzionale)
   * @returns {Promise<Object>} Risultato dell'importazione
   */
  static async importPersonsFromJSON(personsData, overwriteIds = [], companyId = null, tenantId = null) {
    // Se il secondo parametro è un oggetto, usa la vecchia firma
    if (typeof overwriteIds === 'object' && !Array.isArray(overwriteIds)) {
      return await PersonImport.importFromJSON(personsData, overwriteIds);
    }
    
    // Nuova firma: converti i parametri in options
    const options = {
      defaultCompanyId: companyId,
      defaultTenantId: tenantId,
      updateExisting: overwriteIds && overwriteIds.length > 0,
      overwriteIds: overwriteIds || [],
      skipDuplicates: false  // Segnala i duplicati come errori invece di saltarli
    };
    
    return await PersonImport.importFromJSON(personsData, options);
  }

  /**
   * Importa persone da CSV
   * @param {string} csvContent - Contenuto CSV
   * @param {Object} options - Opzioni di importazione
   * @returns {Promise<Object>} Risultato dell'importazione
   */
  static async importPersonsFromCSV(csvContent, options = {}) {
    // Assicurati che le opzioni abbiano i valori di default corretti
    const normalizedOptions = {
      defaultCompanyId: options.companyId || options.defaultCompanyId || null,
      defaultTenantId: options.tenantId || options.defaultTenantId || null,
      skipDuplicates: false,  // Segnala i duplicati come errori invece di saltarli
      ...options
    };
    
    return await PersonImport.importFromCSV(csvContent, normalizedOptions);
  }

  /**
   * Genera template CSV per importazione
   * @param {Object} options - Opzioni del template
   * @returns {string} Template CSV
   */
  static generateCSVTemplate(options = {}) {
    return PersonImport.generateCSVTemplate(options);
  }

  // ==================== PREFERENCES ====================

  /**
   * Ottiene le preferenze di una persona
   * @param {string} personId - ID della persona
   * @returns {Promise<Object>} Preferenze
   */
  static async getPersonPreferences(personId) {
    return await PersonPreferences.getPreferences(personId);
  }

  /**
   * Aggiorna le preferenze di una persona
   * @param {string} personId - ID della persona
   * @param {Object} preferences - Nuove preferenze
   * @returns {Promise<Object>} Preferenze aggiornate
   */
  static async updatePersonPreferences(personId, preferences) {
    return await PersonPreferences.updatePreferences(personId, preferences);
  }

  /**
   * Resetta le preferenze di una persona
   * @param {string} personId - ID della persona
   * @returns {Promise<Object>} Preferenze resettate
   */
  static async resetPersonPreferences(personId) {
    return await PersonPreferences.resetPreferences(personId);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Genera username unico
   * @param {string} firstName - Nome
   * @param {string} lastName - Cognome
   * @returns {Promise<string>} Username unico
   */
  static async generateUniqueUsername(firstName, lastName) {
    // Crea una funzione che inverte il risultato di checkUsernameAvailability
    // perché generateUniqueUsername si aspetta una funzione che restituisce true se l'username ESISTE
    const checkExistence = async (username) => {
      const isAvailable = await PersonCore.checkUsernameAvailability(username);
      return !isAvailable; // Inverti il risultato
    };
    
    return await PersonUtils.generateUniqueUsername(firstName, lastName, checkExistence);
  }

  /**
   * Valida email
   * @param {string} email - Email da validare
   * @returns {boolean} True se valida
   */
  static isValidEmail(email) {
    return PersonUtils.isValidEmail(email);
  }

  /**
   * Valida numero di telefono
   * @param {string} phone - Numero da validare
   * @returns {boolean} True se valido
   */
  static isValidPhoneNumber(phone) {
    return PersonUtils.isValidPhoneNumber(phone);
  }

  /**
   * Mappa tipo di ruolo
   * @param {string} roleType - Tipo di ruolo da mappare
   * @returns {string} Ruolo mappato
   */
  static mapRoleType(roleType) {
    return PersonRoleMapping.mapRoleType(roleType);
  }

  /**
   * Verifica se un ruolo è valido
   * @param {string} roleType - Tipo di ruolo
   * @returns {boolean} True se valido
   */
  static isValidRole(roleType) {
    return PersonRoleMapping.isValidRole(roleType);
  }

  /**
   * Ottiene tutti i ruoli disponibili
   * @returns {Array} Array di ruoli disponibili
   */
  static getAllRoles() {
    return PersonRoleMapping.getAllRoles();
  }

  // ==================== BACKWARD COMPATIBILITY ====================

  /**
   * @deprecated Usa getPersonsByRole('EMPLOYEE') invece
   */
  static async getEmployees(options = {}) {
    logger.warn('getEmployees is deprecated, use getPersonsByRole("EMPLOYEE") instead');
    return await PersonCore.getEmployees(options);
  }

  /**
   * @deprecated Usa getPersonsByRole('TRAINER') invece
   */
  static async getTrainers(options = {}) {
    logger.warn('getTrainers is deprecated, use getPersonsByRole("TRAINER") instead');
    return await PersonCore.getTrainers(options);
  }

  /**
   * @deprecated Usa getPersonsByRole(['ADMIN', 'SUPER_ADMIN']) invece
   */
  static async getSystemUsers(options = {}) {
    logger.warn('getSystemUsers is deprecated, use getPersonsByRole(["ADMIN", "SUPER_ADMIN"]) instead');
    return await PersonCore.getSystemUsers(options);
  }

  /**
   * @deprecated Usa generateUniqueUsername invece
   */
  static async generateUniqueEmail(firstName, lastName, domain = 'example.com') {
    logger.warn('generateUniqueEmail is deprecated and will be removed in future versions');
    const username = await this.generateUniqueUsername(firstName, lastName);
    return `${username}@${domain}`;
  }

  // ==================== HEALTH CHECK ====================

  /**
   * Verifica lo stato del servizio
   * @returns {Object} Stato del servizio
   */
  static getServiceHealth() {
    return {
      service: 'PersonService',
      status: 'healthy',
      version: '2.0.0',
      modules: {
        core: 'PersonCore',
        roles: 'PersonRoles',
        utils: 'PersonUtils',
        preferences: 'PersonPreferences',
        stats: 'PersonStats',
        export: 'PersonExport',
        import: 'PersonImport'
      },
      timestamp: new Date().toISOString()
    };
  }
}

export default PersonService;