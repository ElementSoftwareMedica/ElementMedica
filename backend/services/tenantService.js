import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

class TenantService {
  /**
   * Crea un nuovo tenant
   */
  async createTenant(tenantData) {
    try {
      const { name, slug, domain, settings = {}, billingPlan = 'basic' } = tenantData;

      // Verifica che lo slug sia unico
      const existingTenant = await prisma.company.findFirst({
        where: {
          OR: [
            { slug: slug },
            { domain: domain }
          ]
        }
      });

      if (existingTenant) {
        throw new Error('Tenant with this slug or domain already exists');
      }

      // Crea il tenant
      const tenant = await prisma.company.create({
        data: {
          ragioneSociale: name,
          slug,
          domain,
          settings,
          subscriptionPlan: billingPlan,
          isActive: true,
  
        }
      });

      // Crea configurazioni di default
      await this.createDefaultConfigurations(tenant.id);

      // Crea ruoli di default
      await this.createDefaultRoles(tenant.id);

      return tenant;
    } catch (error) {
      logger.error('Failed to create tenant', { component: 'tenantService', action: 'createTenant', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Ottiene un tenant per ID
   */
  async getTenantById(tenantId) {
    try {
      return await prisma.tenant.findUnique({
        where: {id: tenantId},
        include: {
          persons: {
            where: {deletedAt: null},
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              status: true
            }
          },
          personRoles: {
            where: {isActive: true}
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get tenant', { component: 'tenantService', action: 'getTenant', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Ottiene un tenant per slug
   */
  async getTenantBySlug(slug) {
    try {
      return await prisma.tenant.findFirst({
        where: {slug}
      });
    } catch (error) {
      logger.error('Failed to get tenant by slug', { component: 'tenantService', action: 'getTenantBySlug', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Ottiene un tenant per dominio
   */
  async getTenantByDomain(domain) {
    try {
      return await prisma.tenant.findFirst({
        where: {
          domain,
          isActive: true
        }
      });
    } catch (error) {
      logger.error('Failed to get tenant by domain', { component: 'tenantService', action: 'getTenantByDomain', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Aggiorna un tenant
   */
  async updateTenant(tenantId, updateData) {
    try {
      const { name, slug, domain, settings, billingPlan, isActive } = updateData;

      // Verifica che slug e domain siano unici (se modificati)
      if (slug || domain) {
        const existingTenant = await prisma.tenant.findFirst({
          where: {
            AND: [
              { id: { not: tenantId } },
              {
                OR: [
                  slug ? { slug } : {},
                  domain ? { domain } : {}
                ].filter(condition => Object.keys(condition).length > 0)
              }
            ]
          }
        });

        if (existingTenant) {
          throw new Error('Another tenant with this slug or domain already exists');
        }
      }

      const updatePayload = {};
      if (name) updatePayload.name = name;
      if (slug) updatePayload.slug = slug;
      if (domain) updatePayload.domain = domain;
      if (settings) updatePayload.settings = settings;
      if (billingPlan) updatePayload.billingPlan = billingPlan;
      if (typeof isActive === 'boolean') updatePayload.isActive = isActive;

      return await prisma.tenant.update({
        where: { id: tenantId },
        data: updatePayload
      });
    } catch (error) {
      logger.error('Failed to update tenant', { component: 'tenantService', action: 'updateTenant', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Elimina un tenant (soft delete)
   */
  async deleteTenant(tenantId) {
    try {
      // Disattiva prima il tenant
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          isActive: false,
          deletedAt: new Date()
        }
      });

      // Disattiva tutte le persone del tenant
      await prisma.person.updateMany({
        where: { tenantId: tenantId },
        data: {
          status: 'INACTIVE',
          deletedAt: new Date()
        }
      });

      return { success: true, message: 'Tenant deleted successfully' };
    } catch (error) {
      logger.error('Failed to delete tenant', { component: 'tenantService', action: 'deleteTenant', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Ottiene le statistiche di un tenant
   */
  async getTenantStats(tenantId) {
    try {
      const [personCount, courseCount, trainerCount] = await Promise.all([
        prisma.person.count({
          where: {tenantId: tenantId, deletedAt: null}
        }),
        prisma.course.count({
          where: {tenantId: tenantId}
        }),
        prisma.personRole.count({
          where: {tenantId: tenantId, roleType: 'TRAINER', isActive: true}
        })
      ]);

      return {
        persons: personCount,
        courses: courseCount,
        trainers: trainerCount
      };
    } catch (error) {
      logger.error('Failed to get tenant stats', { component: 'tenantService', action: 'getTenantStats', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Crea configurazioni di default per un nuovo tenant
   */
  async createDefaultConfigurations(tenantId) {
    try {
      const defaultConfigs = [
        {
          tenantId: tenantId,
          config_key: 'theme',
          config_value: { theme: 'default' },
          config_type: 'ui'
        },
        {
          tenantId: tenantId,
          config_key: 'locale',
          config_value: { locale: 'it-IT' },
          config_type: 'general'
        },
        {
          tenantId: tenantId,
          config_key: 'timezone',
          config_value: { timezone: 'Europe/Rome' },
          config_type: 'general'
        },
        {
          tenantId: tenantId,
          config_key: 'max_file_size',
          config_value: { size: 10485760 }, // 10MB
          config_type: 'general'
        },
        {
          tenantId: tenantId,
          config_key: 'session_timeout',
          config_value: { timeout: 3600 }, // 1 hour
          config_type: 'security'
        }
      ];

      // Note: Questa implementazione presuppone che esista una tabella tenant_configurations
      // Per ora salviamo nelle settings del tenant
      const settings = defaultConfigs.reduce((acc, config) => {
        acc[config.config_key] = config.config_value;
        return acc;
      }, {});

      await prisma.tenant.update({
        where: { id: tenantId },
        data: { settings }
      });

      return defaultConfigs;
    } catch (error) {
      logger.error('Failed to create default configurations', { component: 'tenantService', action: 'createDefaultConfigurations', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Crea configurazioni di ruolo di default per un nuovo tenant
   * Nota: I ruoli sono ora gestiti tramite PersonRole con RoleType enum
   */
  async createDefaultRoles(tenantId) {
    try {
      // I ruoli sono ora definiti nell'enum RoleType: ADMIN, MANAGER, EMPLOYEE, TRAINER
      // Non è più necessario creare record separati per i ruoli
      // Questa funzione ora restituisce solo la configurazione dei ruoli disponibili
      
      const availableRoles = [
        {
          roleType: 'ADMIN',
          description: 'Amministratore della company',
          companyId: tenantId
        },
        {
          roleType: 'MANAGER',
          description: 'Manager aziendale',
          companyId: tenantId
        },
        {
          roleType: 'TRAINER',
          description: 'Formatore',
          companyId: tenantId
        },
        {
          roleType: 'EMPLOYEE',
          description: 'Dipendente',
          companyId: tenantId
        }
      ];

      return availableRoles;
    } catch (error) {
      logger.error('Failed to create default roles', { component: 'tenantService', action: 'createDefaultRoles', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Verifica i limiti del piano di billing
   */
  async checkBillingLimits(tenantId) {
    try {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const stats = await this.getTenantStats(tenantId);
      
      const limits = {
        basic: { persons: 10, companies: 1, courses: 50 },
        professional: { persons: 50, companies: 5, courses: 200 },
        enterprise: { persons: 500, companies: 50, courses: 1000 }
      };

      const planLimits = limits[tenant.billingPlan] || limits.basic;
      
      return {
        plan: tenant.billingPlan,
        limits: planLimits,
        usage: stats,
        withinLimits: {
          persons: stats.persons <= planLimits.persons,
          courses: stats.courses <= planLimits.courses
        }
      };
    } catch (error) {
      logger.error('Failed to check billing limits', { component: 'tenantService', action: 'checkBillingLimits', error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Lista tutti i tenant (solo per super admin)
   */
  async listAllTenants(page = 1, limit = 20, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const where = {

        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.billingPlan && { billingPlan: filters.billingPlan }),
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { slug: { contains: filters.search, mode: 'insensitive' } }
          ]
        })
      };

      const [tenants, total] = await Promise.all([
        prisma.tenant.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            slug: true,
            domain: true,
            billingPlan: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                personRoles: true
              }
            }
          }
        }),
        prisma.tenant.count({ where })
      ]);

      return {
        tenants,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to list tenants', { component: 'tenantService', action: 'listTenants', error: error.message, stack: error.stack });
      throw error;
    }
  }
}

export default new TenantService();