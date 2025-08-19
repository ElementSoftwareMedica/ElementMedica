import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';

class PersonService {
  // Ottieni persone per ruolo
  async getPersonsByRole(roleType, filters = {}) {
    try {
      const where = {
        personRoles: {
          some: {
            roleType: Array.isArray(roleType) ? { in: roleType } : roleType,
            isActive: true
          }
        },
        ...filters
      };
      
      // Determina l'ordinamento in base al tipo di ruolo
      let orderBy = { lastName: 'asc' };
      if (Array.isArray(roleType) && roleType.some(role => ['ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN', 'TENANT_ADMIN'].includes(role))) {
        orderBy = { lastLogin: 'desc' };
      }
      
      const persons = await prisma.person.findMany({
        where,
        include: {
          personRoles: {
            where: {},
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
              lastActivityAt: true
            }
          }
        },
        orderBy
      });

      // Aggiungi il campo isOnline basandosi sulle sessioni attive
      return persons.map(person => ({
        ...person,
        isOnline: person.personSessions && person.personSessions.length > 0
      }));
    } catch (error) {
      logger.error('Error getting persons by role:', { error: error.message, roleType });
      throw error;
    }
  }
  
  // Ottieni dipendenti (backward compatibility)
  async getEmployees(filters = {}) {
    return this.getPersonsByRole('EMPLOYEE', filters);
  }
  
  // Ottieni formatori (backward compatibility)
  async getTrainers(filters = {}) {
    return this.getPersonsByRole('TRAINER', filters);
  }
  
  // Ottieni utenti sistema (backward compatibility)
  async getSystemUsers(filters = {}) {
    try {
      const where = {
        personRoles: {
          some: {
            roleType: { in: ['ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN', 'TENANT_ADMIN'] },
            isActive: true
          }
        },
        ...filters
      };
      
      const users = await prisma.person.findMany({
        where,
        include: {
          personRoles: {
            where: {},
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
              lastActivityAt: true
            }
          }
        },
        orderBy: {
          lastLogin: 'desc' // Ordina per login più recente
        }
      });

      // Aggiungi il campo isOnline basandosi sulle sessioni attive
      return users.map(user => ({
        ...user,
        isOnline: user.personSessions && user.personSessions.length > 0
      }));
    } catch (error) {
      logger.error('Error getting system persons:', { error: error.message });
      throw error;
    }
  }
  
  // Ottieni persona per ID
  async getPersonById(id) {
    try {
      const person = await prisma.person.findUnique({
        where: { id },
        include: {
          personRoles: {
            where: {},
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
              lastActivityAt: true
            }
          }
        }
      });

      if (!person) {
        return null;
      }

      // Aggiungi il campo isOnline basandosi sulle sessioni attive
      return {
        ...person,
        isOnline: person.personSessions && person.personSessions.length > 0
      };
    } catch (error) {
      logger.error('Error getting person by ID:', { error: error.message, id });
      throw error;
    }
  }
  
  // Genera username unico
  async generateUniqueUsername(firstName, lastName) {
    const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    let username = baseUsername;
    let counter = 1;
    
    while (true) {
        const existingPerson = await prisma.person.findUnique({
          where: { username }
        });
      
      if (!existingPerson) {
        return username;
      }
      
      username = `${baseUsername}${counter}`;
      counter++;
    }
  }
  
  // Crea persona con ruolo
  async createPerson(data, roleType, companyId = null, tenantId = null) {
    try {
      const { roles, ...personData } = data;
      
      // Genera username automatico se non fornito
      if (!personData.username && personData.firstName && personData.lastName) {
        personData.username = await this.generateUniqueUsername(personData.firstName, personData.lastName);
      }
      
      // Imposta password di default se non fornita
      if (!personData.password) {
        personData.password = 'Password123!';
      }
      
      return await prisma.person.create({
        data: {
          ...personData,
          companyId,
          tenantId,
          personRoles: {
            create: {
              roleType: roleType,
              isActive: true,
              isPrimary: true,
              companyId,
              tenantId
            }
          }
        },
        include: {
          personRoles: {
            include: {
              company: true,
              tenant: true
            }
          },
          company: true,
          tenant: true
        }
      });
    } catch (error) {
      logger.error('Error creating person:', { error: error.message, data });
      throw error;
    }
  }
  
  // Aggiorna persona
  async updatePerson(id, data) {
    try {
      const { roles, ...personData } = data;
      
      return await prisma.person.update({
        where: { id },
        data: {
          ...personData,
          updatedAt: new Date()
        },
        include: {
          personRoles: {
            where: {},
            include: {
              company: true,
              tenant: true
            }
          },
          company: true,
          tenant: true
        }
      });
    } catch (error) {
      logger.error('Error updating person:', { error: error.message, id, data });
      throw error;
    }
  }
  
  // Soft delete
  async deletePerson(id) {
    try {
      return await prisma.person.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: 'INACTIVE'
        }
      });
    } catch (error) {
      logger.error('Error deleting person:', { error: error.message, id });
      throw error;
    }
  }
  
  // Aggiungi ruolo a persona
  async addRole(personId, roleType, companyId = null, tenantId = null) {
    try {
      // Verifica se il ruolo esiste già
      const existingRole = await prisma.personRole.findFirst({
        where: {personId,
          roleType,
          companyId,
          tenantId,}
      });
      
      if (existingRole) {
        throw new Error('Role already exists for this person');
      }
      
      return await prisma.personRole.create({
        data: {
          personId,
          roleType,
          isActive: true,
          companyId,
          tenantId
        },
        include: {
          person: true,
          company: true,
          tenant: true
        }
      });
    } catch (error) {
      logger.error('Error adding role:', { error: error.message, personId, roleType });
      throw error;
    }
  }
  
  // Rimuovi ruolo da persona
  async removeRole(personId, roleType, companyId = null, tenantId = null) {
    try {
      return await prisma.personRole.updateMany({
        where: {personId,
          roleType,
          companyId,
          tenantId,},
        data: {
          isActive: false
        }
      });
    } catch (error) {
      logger.error('Error removing role:', { error: error.message, personId, roleType });
      throw error;
    }
  }
  
  // Cerca persone
  async searchPersons(query, roleType = null, filters = {}) {
    try {
      const where = {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ],
        ...filters
      };
      
      if (roleType) {
        where.personRoles = {
          some: {
            roleType: Array.isArray(roleType) ? { in: roleType } : roleType,
            isActive: true
          }
        };
      }
      
      const persons = await prisma.person.findMany({
        where,
        include: {
          personRoles: {
            where: {},
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
              lastActivityAt: true
            }
          }
        },
        orderBy: {
          lastName: 'asc'
        }
      });

      // Aggiungi il campo isOnline basandosi sulle sessioni attive
      return persons.map(person => ({
        ...person,
        isOnline: person.personSessions && person.personSessions.length > 0
      }));
    } catch (error) {
      logger.error('Error searching persons:', { error: error.message, query });
      throw error;
    }
  }

  // Ottieni persone con paginazione e filtri
  async getPersonsWithPagination(filters = {}) {
    try {
      const {
        roleType,
        isActive,
        companyId,
        search,
        sortBy = 'lastLogin',
        sortOrder = 'desc',
        page = 1,
        limit = 50
      } = filters;

      const where = {};

      if (roleType) {
        where.personRoles = {
          some: {
            roleType,
            isActive: true
          }
        };
      }

      if (isActive !== undefined) {
        where.status = isActive ? 'ACTIVE' : 'INACTIVE';
      }

      if (companyId) {
        where.companyId = companyId;
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } }
        ];
      }

      let orderBy;
      if (sortBy === 'lastLogin') {
        // Per lastLogin, ordiniamo con un approccio che mette i valori non-null prima
        if (sortOrder === 'desc') {
          orderBy = [
            { lastLogin: 'desc' },
            { createdAt: 'desc' } // fallback per ordinamento secondario
          ];
        } else {
          orderBy = [
            { lastLogin: 'asc' },
            { createdAt: 'asc' }
          ];
        }
      } else if (sortBy === 'firstName') {
        orderBy = { firstName: sortOrder };
      } else if (sortBy === 'lastName') {
        orderBy = { lastName: sortOrder };
      } else if (sortBy === 'createdAt') {
        orderBy = { createdAt: sortOrder };
      } else {
        // default: lastLogin desc
        orderBy = [
          { lastLogin: 'desc' },
          { createdAt: 'desc' }
        ];
      }

      const skip = (page - 1) * limit;

      // Ottieni tutti i dati senza ordinamento se è lastLogin
      let allPersons;
      if (sortBy === 'lastLogin') {
        allPersons = await prisma.person.findMany({
          where,
          include: {
            personRoles: {
              where: {},
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
                lastActivityAt: true
              }
            }
          }
        });
        
        // Aggiungi il campo isOnline basandosi sulle sessioni attive
        allPersons = allPersons.map(person => ({
          ...person,
          isOnline: person.personSessions && person.personSessions.length > 0
        }));
        
        // Separa le persone con e senza lastLogin
        const personsWithLogin = allPersons.filter(p => p.lastLogin);
        const personsWithoutLogin = allPersons.filter(p => !p.lastLogin);
        
        // Ordina le persone con lastLogin
        personsWithLogin.sort((a, b) => {
          return sortOrder === 'desc' 
            ? new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime()
            : new Date(a.lastLogin).getTime() - new Date(b.lastLogin).getTime();
        });
        
        // Ordina le persone senza lastLogin per createdAt
        personsWithoutLogin.sort((a, b) => {
          return sortOrder === 'desc'
            ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        
        // Combina i risultati: persone con login prima, poi quelle senza
        allPersons = sortOrder === 'desc' 
          ? [...personsWithLogin, ...personsWithoutLogin]
          : [...personsWithoutLogin, ...personsWithLogin];
        
        const total = allPersons.length;
        const persons = allPersons.slice(skip, skip + limit);
        
        return {
          persons,
          total,
          page,
          totalPages: Math.ceil(total / limit)
        };
      }
      
      const [persons, total] = await Promise.all([
        prisma.person.findMany({
          where,
          include: {
            personRoles: {
              where: {},
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
                lastActivityAt: true
              }
            }
          },
          orderBy,
          skip,
          take: limit
        }),
        prisma.person.count({ where })
      ]);

      // Aggiungi il campo isOnline basandosi sulle sessioni attive
      const personsWithOnlineStatus = persons.map(person => ({
        ...person,
        isOnline: person.personSessions && person.personSessions.length > 0
      }));

      return {
        persons: personsWithOnlineStatus,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error getting persons with pagination:', { error: error.message, filters });
      throw error;
    }
  }

  // Reset password persona
  async resetPersonPassword(id) {
    try {
      const temporaryPassword = 'Password123!';
      
      await prisma.person.update({
        where: { id },
        data: {
          password: temporaryPassword,
          passwordResetRequired: true,
          updatedAt: new Date()
        }
      });

      return { temporaryPassword };
    } catch (error) {
      logger.error('Error resetting person password:', { error: error.message, id });
      throw error;
    }
  }

  // Ottieni statistiche persone
  async getPersonStats() {
    try {
      const [total, active, inactive, roleStats, recentLogins] = await Promise.all([
        prisma.person.count({ where: {} }),
        prisma.person.count({ where: { status: 'ACTIVE' } }),
        prisma.person.count({ where: { status: 'INACTIVE' } }),
        prisma.personRole.groupBy({
          by: ['roleType'],
          where: {},
          _count: { roleType: true }
        }),
        prisma.person.count({
          where: {
            lastLogin: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // ultimi 30 giorni
            },
            deletedAt: null
          }
        })
      ]);

      const byRole = {};
      roleStats.forEach(stat => {
        byRole[stat.roleType] = stat._count.roleType;
      });

      return {
        total,
        active,
        inactive,
        byRole,
        recentLogins
      };
    } catch (error) {
      logger.error('Error getting person stats:', { error: error.message });
      throw error;
    }
  }

  // Verifica disponibilità username
  async checkUsernameAvailability(username) {
    try {
      const existingPerson = await prisma.person.findUnique({
        where: { username }
      });
      
      return !existingPerson;
    } catch (error) {
      logger.error('Error checking username availability:', { error: error.message, username });
      throw error;
    }
  }

  // Verifica disponibilità email
  async checkEmailAvailability(email, excludePersonId = null) {
    try {
      const where = { email };
      if (excludePersonId) {
        where.id = { not: excludePersonId };
      }
      
      const existingPerson = await prisma.person.findFirst({ where });
      
      return !existingPerson;
    } catch (error) {
      logger.error('Error checking email availability:', { error: error.message, email });
      throw error;
    }
  }

  // Esporta persone in CSV
  async exportPersonsToCSV(filters = {}) {
    try {
      const where = {};
      
      if (filters.roleType) {
        where.personRoles = {
          some: {
            roleType: filters.roleType,
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
      
      if (filters.search) {
        where.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } }
        ];
      }
      
      const persons = await prisma.person.findMany({
        where,
        include: {
          personRoles: {
            where: {}
          },
          company: true,
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
      
      // Genera CSV
      const headers = ['ID', 'Nome', 'Cognome', 'Email', 'Username', 'Telefono', 'Ruolo', 'Azienda', 'Stato', 'Online', 'Ultimo Login', 'Data Creazione'];
      const rows = personsWithOnlineStatus.map(person => [
        person.id,
        person.firstName || '',
        person.lastName || '',
        person.email || '',
        person.username || '',
        person.phone || '',
        person.personRoles?.[0]?.roleType || '',
        person.company?.name || '',
        person.status === 'ACTIVE' ? 'Attivo' : 'Inattivo',
        person.isOnline ? 'Sì' : 'No',
        person.lastLogin ? new Date(person.lastLogin).toLocaleString('it-IT') : '',
        person.createdAt ? new Date(person.createdAt).toLocaleString('it-IT') : ''
      ]);
      
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      return csvContent;
    } catch (error) {
      logger.error('Error exporting persons to CSV:', { error: error.message, filters });
      throw error;
    }
  }

  // Importa persone da CSV
  async importPersonsFromCSV(file) {
    try {
      // Implementazione base - da estendere in base alle necessità
      const csvContent = file.buffer.toString('utf-8');
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      let imported = 0;
      const errors = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        try {
          const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
          const personData = {};
          
          headers.forEach((header, index) => {
            if (values[index]) {
              switch (header.toLowerCase()) {
                case 'nome':
                case 'firstname':
                  personData.firstName = values[index];
                  break;
                case 'cognome':
                case 'lastname':
                  personData.lastName = values[index];
                  break;
                case 'email':
                  personData.email = values[index];
                  break;
                case 'telefono':
                case 'phone':
                  personData.phone = values[index];
                  break;
                case 'ruolo':
                case 'role':
                  personData.roleType = values[index];
                  break;
              }
            }
          });
          
          if (personData.firstName && personData.lastName && personData.email) {
            await this.createPerson(personData, personData.roleType || 'EMPLOYEE');
            imported++;
          } else {
            errors.push({ row: i + 1, error: 'Dati obbligatori mancanti (nome, cognome, email)' });
          }
        } catch (error) {
          errors.push({ row: i + 1, error: error.message });
        }
      }
      
      return { imported, errors };
    } catch (error) {
      logger.error('Error importing persons from CSV:', { error: error.message });
      throw error;
    }
  }

  // Elimina più persone
  async deleteMultiplePersons(personIds) {
    try {
      const results = {
        deleted: 0,
        errors: []
      };
      
      for (const personId of personIds) {
        try {
          await this.deletePerson(personId);
          results.deleted++;
        } catch (error) {
          results.errors.push({
            personId,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error deleting multiple persons:', { error: error.message, personIds });
      throw error;
    }
  }

  // Ottieni preferenze utente
  async getPersonPreferences(personId) {
    try {
      const person = await prisma.person.findUnique({
        where: { id: personId },
        select: { preferences: true }
      });
      
      return person?.preferences || {};
    } catch (error) {
      logger.error('Error getting person preferences:', { error: error.message, personId });
      throw error;
    }
  }

  // Aggiorna preferenze utente
  async updatePersonPreferences(personId, preferences) {
    try {
      const updatedPerson = await prisma.person.update({
        where: { id: personId },
        data: {
          preferences: preferences,
          updatedAt: new Date()
        },
        select: { preferences: true }
      });
      
      return updatedPerson.preferences;
    } catch (error) {
      logger.error('Error updating person preferences:', { error: error.message, personId });
      throw error;
    }
  }

  // Reset preferenze utente ai valori predefiniti
  async resetPersonPreferences(personId) {
    try {
      const defaultPreferences = {
        theme: 'light',
        language: 'it',
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        accessibility: {
          highContrast: false,
          largeText: false,
          reducedMotion: false
        },
        dashboard: {
          layout: 'default',
          widgets: []
        }
      };
      
      const updatedPerson = await prisma.person.update({
        where: { id: personId },
        data: {
          preferences: defaultPreferences,
          updatedAt: new Date()
        },
        select: { preferences: true }
      });
      
      return updatedPerson.preferences;
    } catch (error) {
      logger.error('Error resetting person preferences:', { error: error.message, personId });
      throw error;
    }
  }
}

export default new PersonService();