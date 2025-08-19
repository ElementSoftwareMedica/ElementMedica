import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

/**
 * Middleware per la risoluzione del tenant
 * Identifica il tenant basandosi su domain/subdomain e imposta il contesto
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    logger.info('[DEBUG] tenantMiddleware - START - Method:', req.method, 'Path:', req.path, 'URL:', req.originalUrl);
    
    // Skip tenant resolution for auth endpoints
    if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/health') || req.path.startsWith('/api/v1/auth')) {
      logger.info('[DEBUG] tenantMiddleware - SKIPPING auth endpoint');
      return next();
    }
    
    // Skip tenant resolution for global admin endpoints
    if (req.path.startsWith('/api/admin/global')) {
      return next();
    }
    
    // Skip tenant resolution for test endpoints
    if (req.path.startsWith('/api/test')) {
      return next();
    }
    
    // Skip tenant resolution for tenants management endpoints (super admin only)
    if (req.path.startsWith('/api/tenants') && !req.path.startsWith('/api/tenants/current')) {
      return next();
    }

    // Get host from request
    const host = req.get('host') || req.get('x-forwarded-host');
    
    if (!host) {
      return res.status(400).json({ 
        error: 'Host header required for tenant resolution' 
      });
    }

    let tenant = null;
    
    // Try to resolve tenant by custom domain first
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      tenant = await prisma.tenant.findFirst({
        where: {
          domain: host,
          isActive: true,

        }
      });
    }

    // If not found by domain, try subdomain resolution
    if (!tenant) {
      const subdomain = host.split('.')[0];
      
      // Skip if it's the main domain or localhost
      if (subdomain && subdomain !== 'www' && subdomain !== 'api' && !host.includes('localhost')) {
        tenant = await prisma.tenant.findFirst({
          where: {
            slug: subdomain,
            isActive: true,

          }
        });
      }
    }

    // For development/localhost, try to get tenant from header or query
    if (!tenant && (host.includes('localhost') || host.includes('127.0.0.1'))) {
      const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
      
      logger.info('[DEBUG] tenantMiddleware - localhost detected, checking headers:', {
        'x-tenant-id': req.headers['x-tenant-id'],
        'X-Tenant-ID': req.headers['X-Tenant-ID'],
        tenantId: req.query.tenantId,
        allHeaders: Object.keys(req.headers)
      });
      
      if (tenantId) {
        // First try to find the tenant
        const tenant = await prisma.tenant.findFirst({
          where: {
            OR: [
              { id: tenantId },
              { slug: tenantId },
              { domain: host.split(':')[0] } // Try domain without port
            ],
            isActive: true,
            deletedAt: null
          }
        });
        
        if (tenant) {
          // Set tenant context directly
          req.tenant = tenant;
          req.tenantId = tenant.id;
          logger.info('[DEBUG] tenantMiddleware - Tenant found and set:', {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            tenantName: tenant.name
          });
          return next();
        } else {
          logger.info('[DEBUG] tenantMiddleware - No tenant found for tenantId:', tenantId);
        }
      }
      
      // Always try to find default tenant for localhost
      const defaultTenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { domain: host.split(':')[0] }, // localhost without port
            { slug: 'default' },
            { name: { contains: 'default', mode: 'insensitive' } },
            { domain: 'localhost' }
          ],
          isActive: true,
          deletedAt: null
        }
      });
      
      if (defaultTenant) {
        req.tenant = defaultTenant;
        req.tenantId = defaultTenant.id;
        logger.info('[DEBUG] tenantMiddleware - Default tenant found and set:', {
          tenantId: defaultTenant.id,
          tenantSlug: defaultTenant.slug,
          tenantName: defaultTenant.name
        });
        return next();
      } else {
        logger.info('[DEBUG] tenantMiddleware - No default tenant found');
      }
      
      // If no tenant found, try to use the first active tenant for localhost development
      const firstTenant = await prisma.tenant.findFirst({
        where: {
          isActive: true,
          deletedAt: null
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      
      if (firstTenant) {
        req.tenant = firstTenant;
        req.tenantId = firstTenant.id;
        logger.info('[DEBUG] tenantMiddleware - First tenant found and set:', {
          tenantId: firstTenant.id,
          tenantSlug: firstTenant.slug,
          tenantName: firstTenant.name
        });
        return next();
      } else {
        logger.info('[DEBUG] tenantMiddleware - No first tenant found');
      }
    }

    // If still no tenant found, check if this is a global admin request
    if (!tenant && !req.tenant) {
      // Allow access to auth endpoints without tenant
      if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/health') || req.path.startsWith('/api/v1/auth') || req.path.startsWith('/api/test')) {
        return next();
      }
      
      // For development, allow access to some endpoints without strict tenant requirement
      if (process.env.NODE_ENV === 'development' && (req.path.startsWith('/api/roles') || req.path.startsWith('/api/users') || req.path.startsWith('/api/settings') || req.path.startsWith('/api/tenants'))) {
        // Create a default tenant context for development
        const defaultTenant = await prisma.tenant.findFirst({
          where: {
            isActive: true,
            deletedAt: null
          },
          orderBy: {
            createdAt: 'asc'
          }
        });
        
        if (defaultTenant) {
          req.tenant = defaultTenant;
          req.tenantId = defaultTenant.id;
          logger.info('[DEBUG] tenantMiddleware - Development tenant found and set for roles endpoint:', {
            tenantId: defaultTenant.id,
            tenantSlug: defaultTenant.slug,
            tenantName: defaultTenant.name,
            path: req.path
          });
          return next();
        } else {
          logger.info('[DEBUG] tenantMiddleware - No development tenant found for roles endpoint');
        }
      }
      
      logger.error('[DEBUG] tenantMiddleware - FAILED - Tenant not found or inactive:', {
        host: host,
        path: req.path || req.originalUrl || req.url,
        headers: {
          'x-tenant-id': req.headers['x-tenant-id'],
          'X-Tenant-ID': req.headers['X-Tenant-ID']
        },
        query: req.query.tenantId,
        environment: process.env.NODE_ENV
      });
      
      return res.status(404).json({ 
        error: 'Tenant not found or inactive',
        host: host,
        path: req.path || req.originalUrl || req.url,
        debug: {
          url: req.url,
          originalUrl: req.originalUrl,
          path: req.path
        }
      });
    }

    // If we have a tenant from the localhost logic, use it
    if (req.tenant) {
      return next();
    }

    // Set tenant context in request from tenant
    req.tenant = tenant;
    req.tenantId = tenant.id;

    // Set database context for Row Level Security
    await prisma.$executeRaw`SELECT set_config('app.current_tenant', ${tenant.id}, true)`;
    
    next();
  } catch (error) {
    console.error('Error resolving tenant:', error);
    res.status(500).json({ 
      error: 'Tenant resolution failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Middleware per verificare che l'utente appartenga al tenant corrente
 */
const validateUserTenant = async (req, res, next) => {
  try {
    logger.info('[DEBUG] validateUserTenant - START - Method:', req.method, 'Path:', req.path, 'URL:', req.originalUrl);
    
    const person = req.person;
    const tenant = req.tenant;

    logger.info('[DEBUG] validateUserTenant - person:', !!person, person?.id);
    logger.info('[DEBUG] validateUserTenant - tenant:', !!tenant, tenant?.id);

    if (!person) {
      logger.info('[DEBUG] validateUserTenant - Missing person');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!tenant) {
      logger.info('[DEBUG] validateUserTenant - Missing tenant');
      return res.status(401).json({ error: 'Tenant context required' });
    }

    // Super admin can access any tenant
    if (person.globalRole === 'SUPER_ADMIN') {
      return next();
    }

    // Check if user belongs to the current tenant
    // Compare tenantId from person with current tenant id
    if (person.tenantId !== tenant.id) {
      return res.status(403).json({ 
        error: 'Access denied: User does not belong to this tenant',
        userTenant: person.tenantId,
        requestTenant: tenant.id
      });
    }

    next();
  } catch (error) {
    console.error('Error in validateUserTenant:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during tenant validation'
    });
  }
};

/**
 * Utility function per ottenere il contesto tenant corrente
 */
const getCurrentTenant = (req) => {
  return req.tenant;
};

/**
 * Utility function per verificare se l'utente è super admin
 */
const isSuperAdmin = (user) => {
  return user && user.globalRole === 'SUPER_ADMIN';
};

/**
 * Utility function per verificare se l'utente è admin o super admin
 */
const isAdminOrSuperAdmin = (user) => {
  return user && (user.globalRole === 'SUPER_ADMIN' || user.globalRole === 'ADMIN');
};

/**
 * Middleware per endpoints che richiedono super admin
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.person || !isAdminOrSuperAdmin(req.person)) {
    return res.status(403).json({ 
      error: 'Admin access required' 
    });
  }
  next();
};

export {
  tenantMiddleware,
  validateUserTenant,
  getCurrentTenant,
  isSuperAdmin,
  isAdminOrSuperAdmin,
  requireSuperAdmin
};