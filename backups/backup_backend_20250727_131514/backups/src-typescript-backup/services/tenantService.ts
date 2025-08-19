/**
 * Tenant Service - Week 12 Multi-Tenant Implementation
 * Gestisce tutte le operazioni relative ai tenant nel sistema multi-tenant
 */

import { PrismaClient, Tenant, TenantConfiguration, EnhancedUserRole } from '@prisma/client';
import { TenantCreateInput, TenantUpdateInput, TenantWithStats } from '../types/tenant.types';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { generateSlug } from '../utils/slugGenerator';
import { validateTenantLimits } from '../utils/tenantValidation';

class TenantService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Crea un nuovo tenant
   */
  async createTenant(data: TenantCreateInput): Promise<Tenant> {
    try {
      // Genera slug unico se non fornito
      const slug = data.slug || await this.generateUniqueSlug(data.name);
      
      // Verifica che slug e domain siano unici
      await this.validateUniqueness(slug, data.domain);
      
      const tenant = await this.prisma.tenant.create({
        data: {
          name: data.name,
          slug,
          domain: data.domain,
          settings: data.settings || {},
          billingPlan: data.billingPlan || 'basic',
          maxUsers: data.maxUsers || 50,
          maxCompanies: data.maxCompanies || 10,
          isActive: data.isActive ?? true,
        },
      });

      // Crea configurazioni di default
      await this.createDefaultConfigurations(tenant.id);
      
      // Inizializza usage tracking
      await this.initializeUsageTracking(tenant.id);
      
      logger.info(`Tenant creato: ${tenant.name} (${tenant.slug})`);
      return tenant;
    } catch (error) {
      logger.error('Errore nella creazione del tenant:', error);
      throw new AppError('Errore nella creazione del tenant', 500);
    }
  }

  /**
   * Ottiene un tenant per ID
   */
  async getTenantById(id: string): Promise<Tenant | null> {
    try {
      return await this.prisma.tenant.findUnique({
        where: { id, deletedAt: null },
        include: {
          configurations: true,
          _count: {
            select: {
              persons: true,
              companies: true,
              courses: true,
              trainers: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Errore nel recupero del tenant:', error);
      throw new AppError('Errore nel recupero del tenant', 500);
    }
  }

  /**
   * Ottiene un tenant per slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    try {
      return await this.prisma.tenant.findUnique({
        where: { slug, deletedAt: null },
        include: {
          configurations: true,
        },
      });
    } catch (error) {
      logger.error('Errore nel recupero del tenant per slug:', error);
      throw new AppError('Errore nel recupero del tenant', 500);
    }
  }

  /**
   * Ottiene un tenant per dominio
   */
  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    try {
      return await this.prisma.tenant.findUnique({
        where: { domain, deletedAt: null },
        include: {
          configurations: true,
        },
      });
    } catch (error) {
      logger.error('Errore nel recupero del tenant per dominio:', error);
      throw new AppError('Errore nel recupero del tenant', 500);
    }
  }

  /**
   * Aggiorna un tenant
   */
  async updateTenant(id: string, data: TenantUpdateInput): Promise<Tenant> {
    try {
      // Verifica che il tenant esista
      const existingTenant = await this.getTenantById(id);
      if (!existingTenant) {
        throw new AppError('Tenant non trovato', 404);
      }

      // Verifica unicità se slug o domain sono cambiati
      if (data.slug && data.slug !== existingTenant.slug) {
        await this.validateUniqueness(data.slug, undefined, id);
      }
      if (data.domain && data.domain !== existingTenant.domain) {
        await this.validateUniqueness(undefined, data.domain, id);
      }

      const tenant = await this.prisma.tenant.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      logger.info(`Tenant aggiornato: ${tenant.name} (${tenant.slug})`);
      return tenant;
    } catch (error) {
      logger.error('Errore nell\'aggiornamento del tenant:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Errore nell\'aggiornamento del tenant', 500);
    }
  }

  /**
   * Elimina un tenant (soft delete)
   */
  async deleteTenant(id: string): Promise<void> {
    try {
      const tenant = await this.getTenantById(id);
      if (!tenant) {
        throw new AppError('Tenant non trovato', 404);
      }

      await this.prisma.tenant.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
          updatedAt: new Date(),
        },
      });

      logger.info(`Tenant deleted: ${tenant.name} (${tenant.slug})`);
    } catch (error) {
      logger.error('Errore nell\'eliminazione del tenant:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Errore nell\'eliminazione del tenant', 500);
    }
  }

  /**
   * Lista tutti i tenant con statistiche
   */
  async listTenants(page = 1, limit = 10): Promise<{ tenants: TenantWithStats[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      
      const [tenants, total] = await Promise.all([
        this.prisma.tenant.findMany({
          where: { deletedAt: null },
          include: {
            _count: {
              select: {
                persons: true,
                companies: true,
                courses: true,
                trainers: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.tenant.count({ where: { deletedAt: null } }),
      ]);

      return { tenants: tenants as TenantWithStats[], total };
    } catch (error) {
      logger.error('Errore nel recupero della lista tenant:', error);
      throw new AppError('Errore nel recupero della lista tenant', 500);
    }
  }

  /**
   * Gestione configurazioni tenant
   */
  async setTenantConfiguration(
    tenantId: string,
    key: string,
    value: any,
    type = 'general'
  ): Promise<TenantConfiguration> {
    try {
      return await this.prisma.tenantConfiguration.upsert({
        where: {
          tenantId_configKey: {
            tenantId,
            configKey: key,
          },
        },
        update: {
          configValue: value,
          configType: type,
          updatedAt: new Date(),
        },
        create: {
          tenantId,
          configKey: key,
          configValue: value,
          configType: type,
        },
      });
    } catch (error) {
      logger.error('Errore nell\'impostazione della configurazione:', error);
      throw new AppError('Errore nell\'impostazione della configurazione', 500);
    }
  }

  /**
   * Ottiene una configurazione tenant
   */
  async getTenantConfiguration(tenantId: string, key: string): Promise<any> {
    try {
      const config = await this.prisma.tenantConfiguration.findUnique({
        where: {
          tenantId_configKey: {
            tenantId,
            configKey: key,
          },
        },
      });
      
      return config?.configValue || null;
    } catch (error) {
      logger.error('Errore nel recupero della configurazione:', error);
      throw new AppError('Errore nel recupero della configurazione', 500);
    }
  }

  /**
   * Ottiene tutte le configurazioni di un tenant
   */
  async getTenantConfigurations(tenantId: string): Promise<Record<string, any>> {
    try {
      const configs = await this.prisma.tenantConfiguration.findMany({
        where: { tenantId, deletedAt: null },
      });
      
      return configs.reduce((acc, config) => {
        acc[config.configKey] = config.configValue;
        return acc;
      }, {} as Record<string, any>);
    } catch (error) {
      logger.error('Errore nel recupero delle configurazioni:', error);
      throw new AppError('Errore nel recupero delle configurazioni', 500);
    }
  }

  /**
   * Verifica i limiti del tenant
   */
  async checkTenantLimits(tenantId: string): Promise<{
    persons: { current: number; limit: number; exceeded: boolean };
    companies: { current: number; limit: number; exceeded: boolean };
  }> {
    try {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant) {
        throw new AppError('Tenant non trovato', 404);
      }

      const [personCount, companyCount] = await Promise.all([
        this.prisma.person.count({ where: { tenantId, deletedAt: null } }),
        this.prisma.company.count({ where: { tenantId, deletedAt: null } }),
      ]);

      return {
        persons: {
          current: personCount,
          limit: tenant.maxPersons || tenant.maxUsers, // Backward compatibility
          exceeded: personCount >= (tenant.maxPersons || tenant.maxUsers),
        },
        companies: {
          current: companyCount,
          limit: tenant.maxCompanies,
          exceeded: companyCount >= tenant.maxCompanies,
        },
      };
    } catch (error) {
      logger.error('Errore nella verifica dei limiti:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Errore nella verifica dei limiti', 500);
    }
  }

  /**
   * Metodi privati di utilità
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (await this.prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private async validateUniqueness(
    slug?: string,
    domain?: string,
    excludeId?: string
  ): Promise<void> {
    if (slug) {
      const existingSlug = await this.prisma.tenant.findUnique({
        where: { slug },
      });
      if (existingSlug && existingSlug.id !== excludeId) {
        throw new AppError('Slug già in uso', 400);
      }
    }

    if (domain) {
      const existingDomain = await this.prisma.tenant.findUnique({
        where: { domain },
      });
      if (existingDomain && existingDomain.id !== excludeId) {
        throw new AppError('Dominio già in uso', 400);
      }
    }
  }

  private async createDefaultConfigurations(tenantId: string): Promise<void> {
    const defaultConfigs = [
      { key: 'theme', value: 'default', type: 'ui' },
      { key: 'locale', value: 'it-IT', type: 'general' },
      { key: 'timezone', value: 'Europe/Rome', type: 'general' },
      { key: 'max_file_size', value: 10485760, type: 'general' },
      { key: 'allowed_file_types', value: ['pdf', 'doc', 'docx', 'xls', 'xlsx'], type: 'general' },
      { key: 'session_timeout', value: 3600, type: 'security' },
      { key: 'password_policy', value: { minLength: 8, requireUppercase: true, requireNumbers: true }, type: 'security' },
    ];

    await Promise.all(
      defaultConfigs.map(config =>
        this.setTenantConfiguration(tenantId, config.key, config.value, config.type)
      )
    );
  }

  private async initializeUsageTracking(tenantId: string): Promise<void> {
    const currentPeriod = new Date();
    currentPeriod.setDate(1); // Primo del mese
    
    const usageTypes = ['persons', 'companies', 'courses', 'storage', 'api_calls'];
    
    await Promise.all(
      usageTypes.map(type =>
        this.prisma.tenantUsage.create({
          data: {
            tenantId,
            usageType: type,
            usageValue: 0,
            billingPeriod: currentPeriod,
          },
        })
      )
    );
  }
}

export { TenantService };