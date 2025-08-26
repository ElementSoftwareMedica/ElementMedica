import logger from '../../../utils/logger.js';

/**
 * Gestisce la mappatura dei ruoli italiani e inglesi ai valori enum RoleType
 */
class PersonRoleMapping {
  // Mappatura ruoli italiani -> enum RoleType
  static ROLE_MAPPING = {
    // Ruoli italiani
    'IMPIEGATO': 'EMPLOYEE',
    'IMPIEGATA': 'EMPLOYEE',
    'DIPENDENTE': 'EMPLOYEE',
    'LAVORATORE': 'EMPLOYEE',
    'LAVORATRICE': 'EMPLOYEE',
    'OPERAIO': 'EMPLOYEE',
    'OPERAIA': 'EMPLOYEE',
    'OPERAIO_EDILE': 'EMPLOYEE',
    'OPERAIO EDILE': 'EMPLOYEE',
    'OPERAIOEDILE': 'EMPLOYEE',
    'EDILE': 'EMPLOYEE',
    'MURATORE': 'EMPLOYEE',
    'CARPENTIERE': 'EMPLOYEE',
    'ELETTRICISTA': 'EMPLOYEE',
    'IDRAULICO': 'EMPLOYEE',
    'TECNICO': 'EMPLOYEE',
    'TECNICA': 'EMPLOYEE',
    'MANAGER': 'MANAGER',
    'RESPONSABILE': 'MANAGER',
    'DIRIGENTE': 'MANAGER',
    'CAPO': 'MANAGER',
    'CAPO_CANTIERE': 'MANAGER',
    'CAPO CANTIERE': 'MANAGER',
    'CONTABILE': 'EMPLOYEE', // Assumiamo che contabile sia un dipendente
    'AMMINISTRATORE': 'ADMIN',
    'ADMIN': 'ADMIN',
    'FORMATORE': 'TRAINER',
    'FORMATRICE': 'TRAINER',
    'TRAINER': 'TRAINER',
    'ISTRUTTORE': 'TRAINER',
    'ISTRUTTRICE': 'TRAINER',
    'HR': 'HR_MANAGER',
    'RISORSE_UMANE': 'HR_MANAGER',
    'COORDINATORE': 'COORDINATOR',
    'COORDINATRICE': 'COORDINATOR',
    'SUPERVISORE': 'SUPERVISOR',
    'SUPERVISORA': 'SUPERVISOR',
    'CONSULENTE': 'CONSULTANT',
    'AUDITOR': 'AUDITOR',
    'REVISORE': 'AUDITOR',
    'OSPITE': 'GUEST',
    'GUEST': 'GUEST',
    'VIEWER': 'VIEWER',
    'VISUALIZZATORE': 'VIEWER',
    'OPERATORE': 'OPERATOR',
    'OPERATRICE': 'OPERATOR',
    
    // Ruoli inglesi (già validi)
    'EMPLOYEE': 'EMPLOYEE',
    'HR_MANAGER': 'HR_MANAGER',
    'DEPARTMENT_HEAD': 'DEPARTMENT_HEAD',
    'SENIOR_TRAINER': 'SENIOR_TRAINER',
    'TRAINER_COORDINATOR': 'TRAINER_COORDINATOR',
    'EXTERNAL_TRAINER': 'EXTERNAL_TRAINER',
    'SUPER_ADMIN': 'SUPER_ADMIN',
    'COMPANY_ADMIN': 'COMPANY_ADMIN',
    'TENANT_ADMIN': 'TENANT_ADMIN'
  };

  /**
   * Mappa un ruolo al valore enum corretto
   * @param {string} roleInput - Il ruolo da mappare
   * @returns {string} Il ruolo mappato
   */
  static mapRoleType(roleInput) {
    if (!roleInput) return 'EMPLOYEE';
    
    const roleUpper = roleInput.toString().toUpperCase().trim();
    const mappedRole = this.ROLE_MAPPING[roleUpper] || 'EMPLOYEE';
    
    // Log della mappatura per debug
    if (roleInput && roleUpper !== mappedRole) {
      logger.info('Role mapping applied:', { 
        original: roleInput, 
        normalized: roleUpper, 
        mapped: mappedRole 
      });
    }
    
    return mappedRole;
  }

  /**
   * Verifica se un ruolo è valido
   * @param {string} roleType - Il ruolo da verificare
   * @returns {boolean} True se il ruolo è valido
   */
  static isValidRole(roleType) {
    return Object.values(this.ROLE_MAPPING).includes(roleType);
  }

  /**
   * Ottiene tutti i ruoli disponibili
   * @returns {string[]} Array di tutti i ruoli disponibili
   */
  static getAllRoles() {
    return [...new Set(Object.values(this.ROLE_MAPPING))];
  }

  /**
   * Ottiene le varianti italiane di un ruolo
   * @param {string} roleType - Il ruolo enum
   * @returns {string[]} Array delle varianti italiane
   */
  static getItalianVariants(roleType) {
    return Object.keys(this.ROLE_MAPPING).filter(key => 
      this.ROLE_MAPPING[key] === roleType
    );
  }
}

export default PersonRoleMapping;