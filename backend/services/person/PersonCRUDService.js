import logger from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';
import bcrypt from 'bcrypt';

/**
 * Servizio per la gestione delle operazioni CRUD delle persone
 * Estratto da personService.js per migliorare la modularità
 */
class PersonCRUDService {
  
  /**
   * Ottiene una persona per ID con relazioni opzionali
   * @param {string} personId - ID della persona
   * @param {Object} options - Opzioni per includere relazioni
   * @returns {Promise<Object|null>} - Persona trovata o null
   */
  static async getPersonById(personId, options = {}) {
    try {
      const {
        includeRoles = true,
        includeCompany = true,
        includeTenant = true,
        includeSessions = false,
        includeDeleted = false
      } = options;

      const where = { id: personId };
      if (!includeDeleted) {
        where.deletedAt = null;
      }

      const include = {};
      if (includeRoles) {
        include.personRoles = {
          include: {
            customRole: true,
            assignedByPerson: true,
            company: true,
            tenant: true
          }
        };
      }
      if (includeCompany) {
        include.company = true;
      }
      if (includeTenant) {
        include.tenant = true;
      }
      if (includeSessions) {
        include.personSessions = {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' }
        };
      }

      const person = await prisma.person.findUnique({
        where,
        include
      });

      if (!person) {
        logger.warn('Person not found:', { personId });
        return null;
      }

      return person;
    } catch (error) {
      logger.error('Error getting person by ID:', { error: error.message, personId });
      throw error;
    }
  }

  /**
   * Crea una nuova persona
   * @param {Object} personData - Dati della persona da creare
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Object>} - Persona creata
   */
  static async createPerson(personData, options = {}) {
    try {
      const { hashPassword = true, generateUsername = true } = options;
      
      const data = { ...personData };

      // Hash della password se presente
      if (data.password && hashPassword) {
        data.password = await bcrypt.hash(data.password, 12);
      }

      // Genera username se richiesto e non presente
      if (generateUsername && !data.username) {
        data.username = await this.generateUniqueUsername(data.firstName, data.lastName);
      }

      // Imposta valori di default
      data.isActive = data.isActive !== undefined ? data.isActive : true;
      data.createdAt = new Date();
      data.updatedAt = new Date();

      const person = await prisma.person.create({
        data,
        include: {
          personRoles: {
            include: {
              customRole: true,
              assignedByPerson: true,
              company: true,
              tenant: true
            }
          },
          company: true,
          tenant: true
        }
      });

      logger.info('Person created successfully:', { 
        personId: person.id, 
        username: person.username,
        email: person.email 
      });

      return person;
    } catch (error) {
      logger.error('Error creating person:', { error: error.message, personData: { ...personData, password: '[HIDDEN]' } });
      throw error;
    }
  }

  /**
   * Aggiorna una persona esistente
   * @param {string} personId - ID della persona da aggiornare
   * @param {Object} updateData - Dati da aggiornare
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Object>} - Persona aggiornata
   */
  static async updatePerson(personId, updateData, options = {}) {
    try {
      const { hashPassword = true } = options;
      
      const data = { ...updateData };

      // Hash della password se presente
      if (data.password && hashPassword) {
        data.password = await bcrypt.hash(data.password, 12);
      }

      // Aggiorna timestamp
      data.updatedAt = new Date();

      const person = await prisma.person.update({
        where: { id: personId },
        data,
        include: {
          personRoles: {
            include: {
              customRole: true,
              assignedByPerson: true,
              company: true,
              tenant: true
            }
          },
          company: true,
          tenant: true
        }
      });

      logger.info('Person updated successfully:', { 
        personId: person.id, 
        updatedFields: Object.keys(updateData) 
      });

      return person;
    } catch (error) {
      logger.error('Error updating person:', { error: error.message, personId, updateData: { ...updateData, password: '[HIDDEN]' } });
      throw error;
    }
  }

  /**
   * Soft delete di una persona
   * @param {string} personId - ID della persona da eliminare
   * @returns {Promise<Object>} - Persona eliminata
   */
  static async softDeletePerson(personId) {
    try {
      const person = await prisma.person.update({
        where: { id: personId },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
          isActive: false
        }
      });

      logger.info('Person soft deleted successfully:', { personId });
      return person;
    } catch (error) {
      logger.error('Error soft deleting person:', { error: error.message, personId });
      throw error;
    }
  }

  /**
   * Ripristina una persona eliminata (soft delete)
   * @param {string} personId - ID della persona da ripristinare
   * @returns {Promise<Object>} - Persona ripristinata
   */
  static async restorePerson(personId) {
    try {
      const person = await prisma.person.update({
        where: { id: personId },
        data: {
          deletedAt: null,
          updatedAt: new Date(),
          isActive: true
        }
      });

      logger.info('Person restored successfully:', { personId });
      return person;
    } catch (error) {
      logger.error('Error restoring person:', { error: error.message, personId });
      throw error;
    }
  }

  /**
   * Elimina definitivamente una persona (hard delete)
   * @param {string} personId - ID della persona da eliminare definitivamente
   * @returns {Promise<Object>} - Persona eliminata
   */
  static async hardDeletePerson(personId) {
    try {
      // Prima elimina le relazioni
      await prisma.personRole.deleteMany({
        where: { personId }
      });

      await prisma.personSession.deleteMany({
        where: { personId }
      });

      // Poi elimina la persona
      const person = await prisma.person.delete({
        where: { id: personId }
      });

      logger.info('Person hard deleted successfully:', { personId });
      return person;
    } catch (error) {
      logger.error('Error hard deleting person:', { error: error.message, personId });
      throw error;
    }
  }

  /**
   * Genera un username unico basato su nome e cognome
   * @param {string} firstName - Nome
   * @param {string} lastName - Cognome
   * @returns {Promise<string>} - Username unico generato
   */
  static async generateUniqueUsername(firstName, lastName) {
    try {
      if (!firstName || !lastName) {
        throw new Error('Nome e cognome sono richiesti per generare username');
      }

      // Normalizza nome e cognome
      const normalizedFirstName = firstName.toLowerCase().replace(/[^a-z]/g, '');
      const normalizedLastName = lastName.toLowerCase().replace(/[^a-z]/g, '');
      
      // Base username: nome.cognome
      let baseUsername = `${normalizedFirstName}.${normalizedLastName}`;
      let username = baseUsername;
      let counter = 1;

      // Verifica unicità e aggiungi numero se necessario
      while (true) {
        const existingPerson = await prisma.person.findFirst({
          where: { username }
        });

        if (!existingPerson) {
          break;
        }

        username = `${baseUsername}${counter}`;
        counter++;
      }

      logger.info('Generated unique username:', { username, firstName, lastName });
      return username;
    } catch (error) {
      logger.error('Error generating unique username:', { error: error.message, firstName, lastName });
      throw error;
    }
  }

  /**
   * Ottiene persone con paginazione e filtri
   * @param {Object} filters - Filtri di ricerca
   * @param {Object} pagination - Opzioni di paginazione
   * @returns {Promise<Object>} - Risultato con persone e metadati
   */
  static async getPersonsWithPagination(filters = {}, pagination = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = pagination;

      const {
        search,
        roleType,
        companyId,
        tenantId,
        isActive,
        includeDeleted = false
      } = filters;

      const where = {};

      // Filtro soft delete
      if (!includeDeleted) {
        where.deletedAt = null;
      }

      // Filtro ricerca testuale
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Filtro per ruolo
      if (roleType) {
        where.personRoles = {
          some: {
            roleType: roleType
          }
        };
      }

      // Filtro per azienda
      if (companyId) {
        where.companyId = companyId;
      }

      // Filtro per tenant
      if (tenantId) {
        where.tenantId = tenantId;
      }

      // Filtro per stato attivo
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const skip = (page - 1) * limit;

      const [persons, total] = await Promise.all([
        prisma.person.findMany({
          where,
          include: {
            personRoles: {
              include: {
                customRole: true,
                assignedByPerson: true,
                company: true,
                tenant: true
              }
            },
            company: true,
            tenant: true
          },
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder }
        }),
        prisma.person.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        persons,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error getting persons with pagination:', { error: error.message, filters, pagination });
      throw error;
    }
  }
}

export default PersonCRUDService;