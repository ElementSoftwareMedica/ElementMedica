import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

/**
 * Middleware per la risoluzione del tenant
 * Identifica il tenant basandosi su domain/subdomain e imposta il contesto
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    logger.info('[DEBUG] tenantMiddleware - START - Method:', req.method, 'Path:', req.path, 'URL:', req.originalUrl);
    
    // Route pubbliche che non richiedono tenant (sincronizzate con il middleware di autenticazione)
    const publicRoutes = [
      '/api/auth/login',
      '/api/auth/register', 
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/v1/auth/login',      // Percorso v1 per login
      '/api/v1/auth/register',   // Percorso v1 per register
      '/api/v1/auth/forgot-password', // Percorso v1 per forgot password
      '/api/v1/auth/reset-password',  // Percorso v1 per reset password
      '/api/roles/public',    // Solo l'endpoint pubblico dei ruoli
      '/api/roles/test-simple', // Endpoint di test semplice

      '/login',           // Percorso senza prefisso per proxy
      '/register',        // Percorso senza prefisso per proxy
      '/forgot-password', // Percorso senza prefisso per proxy
      '/reset-password',  // Percorso senza prefisso per proxy
      '/healthz',
      '/health'
    ];
    
    // Controlla se la route corrente è pubblica
    const isPublicRoute = publicRoutes.some(route => req.path === route || req.path.startsWith(route));
    
    if (isPublicRoute) {
      logger.info('[DEBUG] tenantMiddleware - SKIPPING public route:', req.path);
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
    
    // For development/localhost, use optimized tenant resolution
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      const tenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'] || req.query.tenantId;
      
      // If tenantId is provided in header/query, use it exclusively
      if (tenantId) {
        tenant = await prisma.tenant.findFirst({
          where: {
            OR: [
              { id: tenantId },
              { slug: tenantId }
            ],
            isActive: true,
            deletedAt: null
          }
        });
        
        if (tenant) {
          req.tenant = tenant;
          req.tenantId = tenant.id;
          return next();
        }
      }
      
      // Only if no tenantId is provided, use default tenant for development
      if (!tenantId && process.env.NODE_ENV === 'development') {
        tenant = await prisma.tenant.findFirst({
          where: {
            isActive: true,
            deletedAt: null
          },
          orderBy: {
            createdAt: 'asc'
          }
        });
        
        if (tenant) {
          req.tenant = tenant;
          req.tenantId = tenant.id;
          return next();
        }
      }
    } else {
      // For production domains, try domain and subdomain resolution in one query
      const subdomain = host.split('.')[0];
      
      tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { domain: host },
            ...(subdomain && subdomain !== 'www' && subdomain !== 'api' ? [
              { slug: subdomain }
            ] : [])
          ],
          isActive: true,
          deletedAt: null
        }
      });
    }

    // If still no tenant found, handle error cases
    if (!tenant) {
      
      // For development, allow access to some endpoints without strict tenant requirement
      if (process.env.NODE_ENV === 'development' && (req.path === '/api/roles' || req.path === '/api/roles/public' || req.path === '/api/roles/test-simple' || req.path.startsWith('/api/users') || req.path.startsWith('/api/settings') || req.path.startsWith('/api/tenants') || req.path === '/api/counters' || req.path.startsWith('/api/dashboard') || req.path.startsWith('/api/v1/persons') || req.path.startsWith('/api/persons') || req.path === '/api/v1/submissions')) {
        // Use the first available tenant for development
        tenant = await prisma.tenant.findFirst({
          where: {
            isActive: true,
            deletedAt: null
          },
          orderBy: {
            createdAt: 'asc'
          }
        });
        
        if (tenant) {
          req.tenant = tenant;
          req.tenantId = tenant.id;
          logger.info('[DEBUG] tenantMiddleware - Development tenant found and set:', {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            tenantName: tenant.name,
            path: req.path
          });
          return next();
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

    // Set tenant context in request
    req.tenant = tenant;
    req.tenantId = tenant.id;

    // Skip the expensive $executeRaw for better performance
    // Row Level Security can be handled at the query level instead
    // await prisma.$executeRaw`SELECT set_config('app.current_tenant', ${tenant.id}, true)`;
    
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