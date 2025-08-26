import logger from '../utils/logger.js';
import PersonValidationService from './person/PersonValidationService.js';
import PersonCRUDService from './person/PersonCRUDService.js';
import PersonRoleQueryService from './person/PersonRoleQueryService.js';
import PersonImportService from './person/PersonImportService.js';

/**
 * Servizio principale per la gestione delle persone
 * Ottimizzato e modularizzato per migliorare la manutenibilità
 */
class PersonService {
  constructor() {
    this.importService = new PersonImportService(this);
    this.validationService = PersonValidationService;
    this.crudService = PersonCRUDService;
    this.roleQueryService = PersonRoleQueryService;
  }

  // ==================== METODI DI VALIDAZIONE ====================

  /**
   * Valida i dati di una persona
   * @param {Object} personData - Dati della persona da validare
   * @returns {Object} - Risultato della validazione
   */
  validatePersonData(personData) {
    return this.validationService.validatePersonData(personData);
  }

  /**
   * Normalizza i dati di una persona
   * @param {Object} personData - Dati della persona
   * @returns {Object} - Dati normalizzati
   */
  normalizePersonData(personData) {
    return this.validationService.normalizePersonData(personData);
  }

  /**
   * Verifica disponibilità username
   * @param {string} username - Username da verificare
   * @param {string} excludePersonId - ID persona da escludere
   * @returns {Promise<boolean>} - True se disponibile
   */
  async isUsernameAvailable(username, excludePersonId = null) {
    return this.validationService.isUsernameAvailable(username, excludePersonId);
  }

  /**
   * Verifica disponibilità email
   * @param {string} email - Email da verificare
   * @param {string} excludePersonId - ID persona da escludere
   * @returns {Promise<boolean>} - True se disponibile
   */
  async isEmailAvailable(email, excludePersonId = null) {
    return this.validationService.isEmailAvailable(email, excludePersonId);
  }

  // ==================== METODI CRUD ====================

  /**
   * Ottiene una persona per ID
   * @param {string} personId - ID della persona
   * @param {Object} options - Opzioni per includere relazioni
   * @returns {Promise<Object|null>} - Persona trovata o null
   */
  async getPersonById(personId, options = {}) {
    return this.crudService.getPersonById(personId, options);
  }

  /**
   * Crea una nuova persona
   * @param {Object} personData - Dati della persona da creare
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Object>} - Persona creata
   */
  async createPerson(personData, options = {}) {
    // Valida i dati prima della creazione
    const validation = this.validatePersonData(personData);
    if (!validation.isValid) {
      throw new Error(`Dati non validi: ${validation.errors.join(', ')}`);
    }

    // Normalizza i dati
    const normalizedData = this.normalizePersonData(personData);

    return this.crudService.createPerson(normalizedData, options);
  }

  /**
   * Aggiorna una persona esistente
   * @param {string} personId - ID della persona da aggiornare
   * @param {Object} updateData - Dati da aggiornare
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Object>} - Persona aggiornata
   */
  async updatePerson(personId, updateData, options = {}) {
    // Valida i dati prima dell'aggiornamento
    const validation = this.validatePersonData(updateData);
    if (!validation.isValid) {
      throw new Error(`Dati non validi: ${validation.errors.join(', ')}`);
    }

    // Normalizza i dati
    const normalizedData = this.normalizePersonData(updateData);

    return this.crudService.updatePerson(personId, normalizedData, options);
  }

  /**
   * Soft delete di una persona
   * @param {string} personId - ID della persona da eliminare
   * @returns {Promise<Object>} - Persona eliminata
   */
  async softDeletePerson(personId) {
    return this.crudService.softDeletePerson(personId);
  }

  /**
   * Ripristina una persona eliminata
   * @param {string} personId - ID della persona da ripristinare
   * @returns {Promise<Object>} - Persona ripristinata
   */
  async restorePerson(personId) {
    return this.crudService.restorePerson(personId);
  }

  /**
   * Elimina definitivamente una persona
   * @param {string} personId - ID della persona da eliminare definitivamente
   * @returns {Promise<Object>} - Persona eliminata
   */
  async hardDeletePerson(personId) {
    return this.crudService.hardDeletePerson(personId);
  }

  /**
   * Genera un username unico
   * @param {string} firstName - Nome
   * @param {string} lastName - Cognome
   * @returns {Promise<string>} - Username unico generato
   */
  async generateUniqueUsername(firstName, lastName) {
    return this.crudService.generateUniqueUsername(firstName, lastName);
  }

  /**
   * Ottiene persone con paginazione e filtri
   * @param {Object} filters - Filtri di ricerca
   * @param {Object} pagination - Opzioni di paginazione
   * @returns {Promise<Object>} - Risultato con persone e metadati
   */
  async getPersonsWithPagination(filters = {}, pagination = {}) {
    return this.crudService.getPersonsWithPagination(filters, pagination);
  }

  // ==================== METODI QUERY PER RUOLI ====================

  /**
   * Ottiene persone basandosi sul ruolo
   * @param {string} roleType - Tipo di ruolo
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di persone con il ruolo specificato
   */
  async getPersonsByRole(roleType, options = {}) {
    return this.roleQueryService.getPersonsByRole(roleType, options);
  }

  /**
   * Ottiene dipendenti (EMPLOYEE) - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di dipendenti
   */
  async getEmployees(options = {}) {
    return this.roleQueryService.getEmployees(options);
  }

  /**
   * Ottiene formatori (TRAINER) - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di formatori
   */
  async getTrainers(options = {}) {
    return this.roleQueryService.getTrainers(options);
  }

  /**
   * Ottiene utenti di sistema - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di utenti di sistema
   */
  async getSystemUsers(options = {}) {
    return this.roleQueryService.getSystemUsers(options);
  }

  /**
   * Ottiene amministratori (ADMIN) - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di amministratori
   */
  async getAdmins(options = {}) {
    return this.roleQueryService.getAdmins(options);
  }

  /**
   * Ottiene super amministratori (SUPER_ADMIN) - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di super amministratori
   */
  async getSuperAdmins(options = {}) {
    return this.roleQueryService.getSuperAdmins(options);
  }

  /**
   * Ottiene manager (MANAGER) - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di manager
   */
  async getManagers(options = {}) {
    return this.roleQueryService.getManagers(options);
  }

  /**
   * Ottiene persone HR (HR) - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di persone HR
   */
  async getHRPersons(options = {}) {
    return this.roleQueryService.getHRPersons(options);
  }

  /**
   * Ottiene visualizzatori (VIEWER) - metodo di retrocompatibilità
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di visualizzatori
   */
  async getViewers(options = {}) {
    return this.roleQueryService.getViewers(options);
  }

  /**
   * Ottiene persone con ruoli multipli
   * @param {Array<string>} roleTypes - Array di tipi di ruolo
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Array>} - Array di persone con almeno uno dei ruoli specificati
   */
  async getPersonsByMultipleRoles(roleTypes, options = {}) {
    return this.roleQueryService.getPersonsByMultipleRoles(roleTypes, options);
  }

  /**
   * Conta persone per ruolo
   * @param {string} roleType - Tipo di ruolo
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<number>} - Numero di persone con il ruolo specificato
   */
  async countPersonsByRole(roleType, options = {}) {
    return this.roleQueryService.countPersonsByRole(roleType, options);
  }

  /**
   * Ottiene statistiche dei ruoli
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Object>} - Statistiche dei ruoli
   */
  async getRoleStatistics(options = {}) {
    return this.roleQueryService.getRoleStatistics(options);
  }

  // ==================== METODI STATICI DI UTILITÀ ====================

  /**
   * Mappa il tipo di ruolo per retrocompatibilità
   * @param {string} roleType - Tipo di ruolo da mappare
   * @returns {string} - Tipo di ruolo mappato
   */
  static mapRoleType(roleType) {
    return PersonRoleQueryService.mapRoleType(roleType);
  }

  // ==================== METODI DI IMPORTAZIONE ====================

  /**
   * Importa persone da file CSV
   * @param {Object} fileData - Dati del file
   * @param {Object} options - Opzioni di importazione
   * @returns {Promise<Object>} - Risultato dell'importazione
   */
  async importPersonsFromCSV(fileData, options = {}) {
    return this.importService.importPersonsFromCSV(fileData, options);
  }

  /**
   * Valida file CSV per importazione
   * @param {Object} fileData - Dati del file
   * @returns {Promise<Object>} - Risultato della validazione
   */
  async validateCSVFile(fileData) {
    return this.importService.validateCSVFile(fileData);
  }

  /**
   * Ottiene template CSV per importazione
   * @returns {Object} - Template CSV
   */
  getCSVTemplate() {
    return this.importService.getCSVTemplate();
  }

  // ==================== METODI DI COMPATIBILITÀ ====================

  /**
   * Metodo deprecato per generare email uniche
   * @deprecated Utilizzare generateUniqueUsername invece
   * @param {string} firstName - Nome
   * @param {string} lastName - Cognome
   * @returns {Promise<string>} - Email unica generata
   */
  async generateUniqueEmail(firstName, lastName) {
    logger.warn('generateUniqueEmail is deprecated, use generateUniqueUsername instead');
    const username = await this.generateUniqueUsername(firstName, lastName);
    return `${username}@example.com`;
  }
}

export default PersonService;