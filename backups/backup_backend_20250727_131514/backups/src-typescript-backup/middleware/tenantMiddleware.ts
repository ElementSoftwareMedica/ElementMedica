/**
 * Tenant Middleware - Week 12 Multi-Tenant Implementation
 * Middleware per la gestione del contesto multi-tenant nelle richieste HTTP
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { TenantService } from '../services/tenantService';
import { TenantContext, TenantRequest } from '../types/tenant.types';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { extractTenantFromRequest } from '../utils/tenantExtractor';

/**
 * Interfaccia estesa per Request con contesto tenant
 */
interface ExtendedRequest extends Request {
  tenant?: TenantContext;
  tenantId?: string;
  user?: {
    id: string;
    tenantId?: string;
    globalRole?: string;
  };
}

/**
 * Middleware per l'identificazione e caricamento del tenant
 */
export const tenantIdentificationMiddleware = (
  prisma: PrismaClient
) => {
  const tenantService = new TenantService(prisma);

  return async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      // Estrai informazioni tenant dalla richiesta
      const tenantInfo = extractTenantFromRequest(req);
      
      if (!tenantInfo.slug && !tenantInfo.domain && !tenantInfo.tenantId) {
        // Se non c'è informazione tenant, usa il tenant di default
        const defaultTenant = await tenantService.getTenantBySlug('default');
        if (defaultTenant) {
          req.tenantId = defaultTenant.id;
          req.tenant = await buildTenantContext(defaultTenant, tenantService);
        }
        return next();
      }

      let tenant = null;

      // Cerca tenant per ID (priorità più alta)
      if (tenantInfo.tenantId) {
        tenant = await tenantService.getTenantById(tenantInfo.tenantId);
      }
      // Cerca tenant per dominio
      else if (tenantInfo.domain) {
        tenant = await tenantService.getTenantByDomain(tenantInfo.domain);
      }
      // Cerca tenant per slug
      else if (tenantInfo.slug) {
        tenant = await tenantService.getTenantBySlug(tenantInfo.slug);
      }

      if (!tenant) {
        logger.warn(`Tenant non trovato: ${JSON.stringify(tenantInfo)}`);
        return res.status(404).json({
          error: 'Tenant non trovato',
          code: 'TENANT_NOT_FOUND'
        });
      }

      if (!tenant.isActive) {
        logger.warn(`Tentativo di accesso a tenant disattivato: ${tenant.slug}`);
        return res.status(403).json({
          error: 'Tenant non attivo',
          code: 'TENANT_INACTIVE'
        });
      }

      // Imposta il contesto tenant nella richiesta
      req.tenantId = tenant.id;
      req.tenant = await buildTenantContext(tenant, tenantService);

      // Log dell'accesso
      logger.info(`Accesso tenant: ${tenant.slug} (${tenant.name})`);
      
      next();
    } catch (error) {
      logger.error('Errore nel middleware di identificazione tenant:', error);
      return res.status(500).json({
        error: 'Errore interno del server',
        code: 'TENANT_MIDDLEWARE_ERROR'
      });
    }
  };
};

/**
 * Middleware per la validazione dell'accesso tenant-scoped
 */
export const tenantAccessMiddleware = (
  prisma: PrismaClient
) => {
  return async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant || !req.tenantId) {
        return res.status(400).json({
          error: 'Contesto tenant mancante',
          code: 'MISSING_TENANT_CONTEXT'
        });
      }

      if (!req.person) {
        return res.status(401).json({
          error: 'Utente non autenticato',
          code: 'UNAUTHENTICATED'
        });
      }

      // Verifica accesso globale
      if (req.person.globalRole === 'SUPER_ADMIN') {
        return next();
      }

      // Verifica che l'utente appartenga al tenant
      if (req.person.tenantId !== req.tenantId) {
      logger.warn(`Tentativo di accesso cross-tenant: utente ${req.person.id} -> tenant ${req.tenantId}`);
        return res.status(403).json({
          error: 'Accesso negato al tenant',
          code: 'TENANT_ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      logger.error('Errore nel middleware di accesso tenant:', error);
      return res.status(500).json({
        error: 'Errore interno del server',
        code: 'TENANT_ACCESS_ERROR'
      });
    }
  };
};

/**
 * Middleware per la verifica dei limiti tenant
 */
export const tenantLimitsMiddleware = (
  prisma: PrismaClient,
  resourceType: 'users' | 'companies' | 'courses'
) => {
  const tenantService = new TenantService(prisma);

  return async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.tenantId) {
        return res.status(400).json({
          error: 'Tenant ID mancante',
          code: 'MISSING_TENANT_ID'
        });
      }

      // Verifica i limiti solo per operazioni POST (creazione)
      if (req.method !== 'POST') {
        return next();
      }

      const limits = await tenantService.checkTenantLimits(req.tenantId);
      
      if (resourceType === 'users' && limits.users.exceeded) {
        return res.status(403).json({
          error: 'Limite utenti raggiunto',
          code: 'USER_LIMIT_EXCEEDED',
          details: limits.users
        });
      }

      if (resourceType === 'companies' && limits.companies.exceeded) {
        return res.status(403).json({
          error: 'Limite aziende raggiunto',
          code: 'COMPANY_LIMIT_EXCEEDED',
          details: limits.companies
        });
      }

      next();
    } catch (error) {
      logger.error('Errore nel middleware di verifica limiti:', error);
      return res.status(500).json({
        error: 'Errore interno del server',
        code: 'LIMITS_CHECK_ERROR'
      });
    }
  };
};

/**
 * Middleware per l'isolamento dei dati tenant-scoped
 */
export const tenantDataIsolationMiddleware = () => {
  return (req: ExtendedRequest, res: Response, next: NextFunction) => {
    // Aggiungi automaticamente il filtro tenantId alle query
    if (req.tenantId) {
      // Modifica i parametri di query per includere il tenantId
      if (req.method === 'GET' || req.method === 'PUT' || req.method === 'DELETE') {
        req.query.tenantId = req.tenantId;
      }
      
      // Modifica il body per includere il tenantId nelle operazioni di creazione
      if (req.method === 'POST' && req.body) {
        req.body.tenantId = req.tenantId;
      }
    }
    
    next();
  };
};

/**
 * Middleware per il logging delle attività tenant
 */
export const tenantActivityLogMiddleware = (
  prisma: PrismaClient
) => {
  return async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log dell'attività dopo la risposta
      if (req.tenant && req.person && res.statusCode < 400) {
        setImmediate(async () => {
          try {
            await prisma.activityLog.create({
              data: {
                personId: req.person!.id,
                action: `${req.method} ${req.path}`,
                resourceType: extractResourceType(req.path),
                details: {
                  tenantId: req.tenantId,
                  method: req.method,
                  path: req.path,
                  statusCode: res.statusCode,
                  userAgent: req.get('User-Agent'),
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
              },
            });
          } catch (error) {
            logger.error('Errore nel logging attività tenant:', error);
          }
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Funzioni di utilità
 */
async function buildTenantContext(
  tenant: any,
  tenantService: TenantService
): Promise<TenantContext> {
  const configurations = await tenantService.getTenantConfigurations(tenant.id);
  const limits = await tenantService.checkTenantLimits(tenant.id);
  
  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    tenantDomain: tenant.domain,
    tenantSettings: configurations,
    personRoles: [], // Sarà popolato dal middleware di autenticazione
    permissions: [], // Sarà popolato dal middleware di autenticazione
    limits,
  };
}

function extractResourceType(path: string): string {
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 1) {
    return segments[1]; // Assume /api/users -> 'users'
  }
  return 'unknown';
}

/**
 * Middleware combinato per setup completo multi-tenant
 */
export const setupTenantMiddleware = (prisma: PrismaClient) => {
  return [
    tenantIdentificationMiddleware(prisma),
    tenantDataIsolationMiddleware(),
    tenantActivityLogMiddleware(prisma),
  ];
};

/**
 * Middleware per protezione tenant-scoped
 */
export const protectTenantResource = (prisma: PrismaClient) => {
  return [
    tenantAccessMiddleware(prisma),
  ];
};

/**
 * Middleware per verifica limiti specifici
 */
export const checkTenantLimits = (
  prisma: PrismaClient,
  resourceType: 'users' | 'companies' | 'courses'
) => {
  return tenantLimitsMiddleware(prisma, resourceType);
};