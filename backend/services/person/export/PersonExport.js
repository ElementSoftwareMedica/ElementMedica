import logger from '../../../utils/logger.js';
import prisma from '../../../config/prisma-optimization.js';

/**
 * Gestisce l'esportazione dei dati delle persone
 */
class PersonExport {
  /**
   * Esporta persone in formato CSV
   * @param {Object} filters - Filtri per l'esportazione
   * @returns {Promise<string>} Contenuto CSV
   */
  static async exportToCSV(filters = {}) {
    try {
      const where = this.buildWhereClause(filters);
      
      const persons = await prisma.person.findMany({
        where,
        include: {
          personRoles: {
            where: { isActive: true }
          },
          company: true,
          tenant: true,
          personSessions: {
            where: {
              isActive: true,
              expiresAt: {
                gt: new Date()
              }
            },
            select: {
              id: true,
              lastActivityAt: true
            }
          }
        },
        orderBy: { lastName: 'asc' }
      });
      
      // Aggiungi il campo isOnline basandosi sulle sessioni attive
      const personsWithOnlineStatus = persons.map(person => ({
        ...person,
        isOnline: person.personSessions && person.personSessions.length > 0
      }));
      
      return this.generateCSVContent(personsWithOnlineStatus);
    } catch (error) {
      logger.error('Error exporting persons to CSV:', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Esporta persone in formato JSON
   * @param {Object} filters - Filtri per l'esportazione
   * @returns {Promise<Object>} Dati JSON
   */
  static async exportToJSON(filters = {}) {
    try {
      const where = this.buildWhereClause(filters);
      
      const persons = await prisma.person.findMany({
        where,
        include: {
          personRoles: {
            where: { isActive: true },
            include: {
              company: true,
              tenant: true
            }
          },
          company: true,
          tenant: true,
          personSessions: {
            where: {
              isActive: true,
              expiresAt: {
                gt: new Date()
              }
            },
            select: {
              id: true,
              lastActivityAt: true,
              expiresAt: true
            }
          }
        },
        orderBy: { lastName: 'asc' }
      });
      
      // Aggiungi il campo isOnline e pulisci i dati sensibili
      const cleanedPersons = persons.map(person => ({
        ...person,
        password: undefined, // Rimuovi password dall'export
        isOnline: person.personSessions && person.personSessions.length > 0
      }));

      return {
        exportDate: new Date(),
        totalRecords: cleanedPersons.length,
        filters,
        data: cleanedPersons
      };
    } catch (error) {
      logger.error('Error exporting persons to JSON:', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Esporta persone in formato Excel (XLSX)
   * @param {Object} filters - Filtri per l'esportazione
   * @returns {Promise<Buffer>} Buffer del file Excel
   */
  static async exportToExcel(filters = {}) {
    try {
      // Per ora restituiamo CSV, in futuro si può implementare XLSX
      const csvContent = await this.exportToCSV(filters);
      
      // Qui si potrebbe usare una libreria come 'xlsx' per generare un vero file Excel
      // Per ora convertiamo il CSV in un formato compatibile
      return Buffer.from(csvContent, 'utf8');
    } catch (error) {
      logger.error('Error exporting persons to Excel:', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Costruisce la clausola WHERE per i filtri
   * @param {Object} filters - Filtri
   * @returns {Object} Clausola WHERE
   */
  static buildWhereClause(filters) {
    const where = {
      deletedAt: null // Escludi sempre i record eliminati
    };
    
    if (filters.roleType) {
      where.personRoles = {
        some: {
          roleType: Array.isArray(filters.roleType) ? { in: filters.roleType } : filters.roleType,
          isActive: true
        }
      };
    }
    
    if (filters.isActive !== undefined) {
      where.status = filters.isActive ? 'ACTIVE' : 'INACTIVE';
    }
    
    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.tenantId) {
      where.tenantId = filters.tenantId;
    }
    
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    if (filters.createdAfter) {
      where.createdAt = { gte: new Date(filters.createdAfter) };
    }

    if (filters.createdBefore) {
      where.createdAt = { 
        ...where.createdAt,
        lte: new Date(filters.createdBefore) 
      };
    }

    if (filters.lastLoginAfter) {
      where.lastLogin = { gte: new Date(filters.lastLoginAfter) };
    }

    if (filters.lastLoginBefore) {
      where.lastLogin = { 
        ...where.lastLogin,
        lte: new Date(filters.lastLoginBefore) 
      };
    }
    
    return where;
  }

  /**
   * Genera il contenuto CSV
   * @param {Array} persons - Array di persone
   * @returns {string} Contenuto CSV
   */
  static generateCSVContent(persons) {
    const headers = [
      'ID',
      'Nome',
      'Cognome', 
      'Email',
      'Username',
      'Telefono',
      'Ruolo Principale',
      'Tutti i Ruoli',
      'Azienda',
      'Tenant',
      'Stato',
      'Online',
      'Ultimo Login',
      'Data Creazione',
      'Data Aggiornamento'
    ];
    
    const rows = persons.map(person => [
      person.id,
      person.firstName || '',
      person.lastName || '',
      person.email || '',
      person.username || '',
      person.phone || '',
      person.personRoles?.[0]?.roleType || '',
      person.personRoles?.map(role => role.roleType).join('; ') || '',
      person.company?.name || '',
      person.tenant?.name || '',
      person.status === 'ACTIVE' ? 'Attivo' : 'Inattivo',
      person.isOnline ? 'Sì' : 'No',
      person.lastLogin ? new Date(person.lastLogin).toLocaleString('it-IT') : '',
      person.createdAt ? new Date(person.createdAt).toLocaleString('it-IT') : '',
      person.updatedAt ? new Date(person.updatedAt).toLocaleString('it-IT') : ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    return csvContent;
  }

  /**
   * Esporta template per importazione
   * @returns {string} Template CSV per importazione
   */
  static generateImportTemplate() {
    const headers = [
      'firstName',
      'lastName',
      'email',
      'username',
      'phone',
      'roleType',
      'birthDate',
      'taxCode',
      'address',
      'city',
      'postalCode',
      'country'
    ];

    const exampleRow = [
      'Mario',
      'Rossi',
      'mario.rossi@example.com',
      'mario.rossi',
      '+39 123 456 7890',
      'EMPLOYEE',
      '01/01/1990',
      'RSSMRA90A01H501X',
      'Via Roma 123',
      'Milano',
      '20100',
      'Italia'
    ];

    const csvContent = [headers, exampleRow]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Esporta statistiche in formato CSV
   * @param {Object} stats - Statistiche da esportare
   * @returns {string} Contenuto CSV delle statistiche
   */
  static exportStatsToCSV(stats) {
    const headers = ['Metrica', 'Valore', 'Descrizione'];
    const rows = [
      ['Totale Persone', stats.total, 'Numero totale di persone nel sistema'],
      ['Persone Attive', stats.active, 'Persone con stato ACTIVE'],
      ['Persone Inattive', stats.inactive, 'Persone con stato INACTIVE'],
      ['Login Recenti', stats.recentLogins, 'Login negli ultimi 30 giorni'],
      ...Object.entries(stats.byRole || {}).map(([role, count]) => [
        `Ruolo: ${role}`, count, `Numero di persone con ruolo ${role}`
      ])
    ];

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Valida i filtri di esportazione
   * @param {Object} filters - Filtri da validare
   * @returns {Object} Risultato della validazione
   */
  static validateExportFilters(filters) {
    const errors = [];

    if (filters.createdAfter && isNaN(new Date(filters.createdAfter))) {
      errors.push('createdAfter deve essere una data valida');
    }

    if (filters.createdBefore && isNaN(new Date(filters.createdBefore))) {
      errors.push('createdBefore deve essere una data valida');
    }

    if (filters.lastLoginAfter && isNaN(new Date(filters.lastLoginAfter))) {
      errors.push('lastLoginAfter deve essere una data valida');
    }

    if (filters.lastLoginBefore && isNaN(new Date(filters.lastLoginBefore))) {
      errors.push('lastLoginBefore deve essere una data valida');
    }

    if (filters.isActive !== undefined && typeof filters.isActive !== 'boolean') {
      errors.push('isActive deve essere boolean');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default PersonExport;