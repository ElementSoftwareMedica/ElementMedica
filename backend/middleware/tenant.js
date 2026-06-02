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
      '/api/v1/public/verify-attestato', // Verifica pubblica attestati
      '/api/v1/public/queue',    // P53: Mobile queue check-in
      '/api/v1/public/booking',  // P67: Public online booking
      '/api/v1/public/doctors',  // Profili medici pubblici
      '/api/v1/public/courses',  // Corsi pubblici
      '/api/v1/public/schedules', // Calendario corsi pubblico
      '/api/v1/public/forms',    // Form pubblici
      '/api/v1/public/contact-submissions', // Richieste info corsi
      '/api/public/analytics',   // Analytics tracking pubblico (chiamato anche da siti esterni)
      '/api/public/embed',       // P75: Widget embed (autenticati via API key nel path)
      '/api/public/courses',     // Legacy path per bundle cachati (canonical: /api/v1/public/courses)
      '/api/v1/public/bridge',   // Bridge auto-activation (autenticato via license key)
      '/api/v1/cms/pages',       // CMS pagine pubbliche
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
        error: 'Header host obbligatorio per la risoluzione del tenant'
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
          return next();
        }
      }

      // Only if no tenantId is provided, try to use user's tenant (from auth middleware)
      // P48/P63: Il tenant viene SEMPRE risolto da PersonTenantProfile via auth middleware
      if (!tenantId) {
        const userTenantId = req.person?.tenantId;
        if (userTenantId) {
          tenant = await prisma.tenant.findFirst({
            where: {
              id: userTenantId,
              isActive: true,
              deletedAt: null
            }
          });

          if (tenant) {
            req.tenant = tenant;
            return next();
          }
        }

        // NO FALLBACK: se l'utente è autenticato ma non ha un tenant valido, errore
        // Questo comportamento è uguale in development e production
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
      // Fallback GENERICO e SICURO: se è stato passato esplicitamente un tenantId via header/query,
      // prova a risolverlo anche in produzione (validateUserTenant verificherà comunque l'appartenenza)
      // Fallback: se è stato passato esplicitamente un tenantId via header/query,
      // prova a risolverlo (validateUserTenant verificherà comunque l'appartenenza)
      const explicitTenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'] || req.query.tenantId;
      if (explicitTenantId) {
        try {
          const fallbackTenant = await prisma.tenant.findFirst({
            where: {
              OR: [
                { id: explicitTenantId },
                { slug: explicitTenantId }
              ],
              isActive: true,
              deletedAt: null
            }
          });
          if (fallbackTenant) {
            req.tenant = fallbackTenant;
            logger.info('[DEBUG] tenantMiddleware - Explicit tenant from header/query applied', {
              from: 'header/query',
              value: explicitTenantId,
              tenantId: fallbackTenant.id,
              tenantSlug: fallbackTenant.slug,
              host: req.get('host') || req.get('x-forwarded-host'),
              path: req.path
            });
            return next();
          }
        } catch (e) {
          logger.error('[DEBUG] tenantMiddleware - Header/query tenant lookup error', { error: e?.message });
        }
      }

      // RIMOSSO: Fallback development "primo tenant" - comportamento ora uguale in dev/prod
      // Il tenant DEVE essere risolto da:
      // 1. Domain/subdomain (production)
      // 2. req.person.tenantId (authenticated user)
      // 3. X-Tenant-ID header (explicit)

      logger.error('[DEBUG] tenantMiddleware - FAILED - Tenant not found or inactive:', {
        host: host,
        path: req.path || req.originalUrl || req.url,
        hasAuthenticatedUser: !!req.person,
        userTenantId: req.person?.tenantId,
        headers: {
          'x-tenant-id': req.headers['x-tenant-id'],
          'X-Tenant-ID': req.headers['X-Tenant-ID']
        },
        query: req.query.tenantId,
        environment: process.env.NODE_ENV
      });

      return res.status(404).json({
        error: 'Tenant non trovato o non attivo',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Set tenant context in request
    req.tenant = tenant;

    // Skip the expensive $executeRaw for better performance
    // Row Level Security can be handled at the query level instead
    // await prisma.$executeRaw`SELECT set_config('app.current_tenant', ${tenant.id}, true)`;

    next();
  } catch (error) {
    logger.error('Error resolving tenant:', { error: error?.message });
    res.status(500).json({
      error: 'Risoluzione del tenant fallita'
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

    if (!person) {
      logger.info('[DEBUG] validateUserTenant - Missing person');
      return res.status(401).json({ error: 'Autenticazione richiesta' });
    }

    if (!tenant) {
      logger.info('[DEBUG] validateUserTenant - Missing tenant');
      return res.status(401).json({ error: 'Contesto tenant obbligatorio' });
    }

    // Super admin and admin can access any tenant (cross-tenant access)
    if (person.globalRole === 'SUPER_ADMIN' || person.globalRole === 'ADMIN') {
      return next();
    }

    // P63: tenantId viene SEMPRE da PersonTenantProfile, non da Person.tenantId
    const effectiveUserTenantId =
      person.tenantProfiles?.find(p => p.isActive || p.isPrimary)?.tenantId ||
      person.tenantProfiles?.[0]?.tenantId ||
      req.person?.tenantId || // From auth middleware (already resolved from tenantProfiles)
      null;

    // Check if user belongs to the current tenant
    // P48: Also check if user has a tenantProfile for this tenant
    const belongsToTenant =
      effectiveUserTenantId === tenant.id ||
      person.tenantProfiles?.some(p => p.tenantId === tenant.id && !p.deletedAt);

    if (!belongsToTenant) {
      return res.status(403).json({
        error: 'Accesso negato: l\'utente non appartiene a questo tenant'
      });
    }

    next();
  } catch (error) {
    logger.error('Error in validateUserTenant:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Errore interno del server durante la validazione del tenant'
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
      error: 'Accesso amministratore richiesto'
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