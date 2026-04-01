/**
 * TenantMode Middleware
 * 
 * Middleware per validare e gestire la modalità di visualizzazione/operazione
 * multi-tenant. Verifica che:
 * 
 * 1. L'header X-Operate-Tenant-Id sia valido per operazioni CRUD
 * 2. L'utente abbia effettivamente accesso al tenant specificato
 * 3. L'operazione sia coerente con i permessi dell'utente
 * 
 * @module middleware/tenantMode
 * @project 45 - Tenant Restructuring Commercial (Fase 8)
 * @gdpr Audit trail per operazioni CRUD cross-tenant
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

/**
 * Header usato per specificare il tenant per operazioni CRUD
 */
const OPERATE_TENANT_HEADER = 'x-operate-tenant-id';

/**
 * Middleware per validare l'operateTenantId
 * 
 * Per operazioni di scrittura (POST, PUT, PATCH, DELETE), verifica che:
 * 1. L'header X-Operate-Tenant-Id sia presente (se utente multi-tenant)
 * 2. L'utente abbia accesso al tenant specificato
 * 3. Il tenant sia attivo
 * 
 * @param {Object} options - Opzioni di configurazione
 * @param {boolean} options.requireForWrite - Richiedi header solo per operazioni di scrittura (default: true)
 * @param {boolean} options.strictMode - Blocca richieste senza header (default: false)
 * @returns {Function} Express middleware
 */
export function validateOperateTenant(options = {}) {
    const {
        requireForWrite = true,
        strictMode = false,
    } = options;

    return async (req, res, next) => {
        try {
            const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

            // Skip se l'utente non è autenticato
            // NOTA: questo middleware viene eseguito prima di authenticateToken (router.use vs per-route)
            // quindi req.person è null qui. I route handler di scrittura devono usare
            // getEffectiveTenantId(req) per leggere X-Operate-Tenant-Id direttamente dall'header.
            const person = req.person;
            if (!person) {
                return next();
            }

            // S66: For GET requests when requireForWrite is true, still extract the header
            // so routes can use req.operateTenantId for cross-tenant reads
            if (requireForWrite && !isWriteOperation) {
                const headerTenantId = req.headers[OPERATE_TENANT_HEADER] || req.headers[OPERATE_TENANT_HEADER.toUpperCase()];
                if (headerTenantId) {
                    req.operateTenantId = headerTenantId;
                }
                return next();
            }

            // Ottieni l'operateTenantId dall'header
            const operateTenantId = req.headers[OPERATE_TENANT_HEADER] || req.headers[OPERATE_TENANT_HEADER.toUpperCase()];

            // DEBUG: Log header received
            logger.debug({
                component: 'tenantMode',
                action: 'checking_header',
                operateTenantId,
                headerKey: OPERATE_TENANT_HEADER,
                allHeaders: Object.keys(req.headers).filter(h => h.includes('operate') || h.includes('tenant')),
                method: req.method,
                path: req.path,
            }, 'Checking X-Operate-Tenant-Id header');

            // Verifica se l'utente è multi-tenant
            const userTenantAccesses = await prisma.personTenantAccess.findMany({
                where: {
                    personId: person.id,
                    deletedAt: null, // F255: exclude soft-deleted accesses
                    OR: [
                        { validUntil: null },
                        { validUntil: { gt: new Date() } }
                    ]
                },
                include: {
                    tenant: {
                        select: {
                            id: true,
                            name: true,
                            isActive: true,
                        }
                    }
                }
            });

            const isMultiTenant = userTenantAccesses.length > 1 || person.globalRole === 'ADMIN';

            // P63: tenantId viene da req.person.tenantId che è GIÀ risolto da PersonTenantProfile nel middleware auth
            const primaryTenantId = req.person.tenantId;

            // Se utente single-tenant, usa il suo tenant
            if (!isMultiTenant) {
                req.operateTenantId = primaryTenantId;
                req.operateTenant = { id: primaryTenantId };
                return next();
            }

            // Per utenti multi-tenant, l'header è richiesto per operazioni di scrittura
            if (!operateTenantId) {
                if (strictMode && isWriteOperation) {
                    logger.warn('TenantMode: Missing X-Operate-Tenant-Id header for write operation', {
                        userId: person.id,
                        method: req.method,
                        path: req.path,
                    });

                    return res.status(400).json({
                        success: false,
                        error: 'Header X-Operate-Tenant-Id richiesto per operazioni di scrittura',
                        code: 'MISSING_OPERATE_TENANT',
                        message: 'Seleziona un tenant specifico per eseguire questa operazione'
                    });
                }

                // P63: Fallback al tenant primario dell'utente (già risolto da auth middleware)
                const fallbackTenantId = primaryTenantId;

                logger.debug({
                    component: 'tenantMode',
                    action: 'fallback_tenant',
                    primaryTenantId,
                    globalRole: person.globalRole,
                    fallbackTenantId,
                    method: req.method,
                    path: req.path,
                }, 'Using fallback tenantId for write operation');

                req.operateTenantId = fallbackTenantId;
                req.operateTenant = { id: fallbackTenantId };
                return next();
            }

            // Verifica che l'utente abbia accesso al tenant specificato
            const hasAccess = userTenantAccesses.some(
                access => access.tenant.id === operateTenantId && access.tenant.isActive
            ) || person.globalRole === 'ADMIN';

            if (!hasAccess) {
                logger.warn('TenantMode: Access denied to operate tenant', {
                    userId: person.id,
                    requestedTenantId: operateTenantId,
                    accessibleTenants: userTenantAccesses.map(a => a.tenant.id),
                });

                return res.status(403).json({
                    success: false,
                    error: 'Accesso negato al tenant specificato',
                    code: 'TENANT_ACCESS_DENIED',
                    message: 'Non hai i permessi per operare su questo tenant'
                });
            }

            // Verifica che il tenant sia attivo e non eliminato
            const tenant = await prisma.tenant.findFirst({
                where: { id: operateTenantId, deletedAt: null },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    isActive: true,
                    enabledBranches: true,
                }
            });

            if (!tenant || !tenant.isActive) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant non trovato o non attivo',
                    code: 'TENANT_INACTIVE',
                    message: 'Il tenant specificato non esiste o non è attivo'
                });
            }

            // Imposta il tenant operativo nel request object
            req.operateTenantId = operateTenantId;
            req.operateTenant = tenant;

            // Log audit per operazioni CRUD cross-tenant
            if (operateTenantId !== primaryTenantId) {
                logger.info('TenantMode: Cross-tenant operation', {
                    component: 'tenantMode',
                    action: 'cross_tenant_operation',
                    userId: person.id,
                    userPrimaryTenantId: primaryTenantId,
                    operateTenantId,
                    operateTenantName: tenant.name,
                    method: req.method,
                    path: req.path,
                    ipAddress: req.ip || req.headers['x-forwarded-for'],
                });
            }

            next();
        } catch (error) {
            logger.error('TenantMode: Error validating operate tenant', {
                error: error.message,
                stack: error.stack,
            });

            return res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                code: 'TENANT_VALIDATION_ERROR',
            });
        }
    };
}

/**
 * Middleware helper per estrarre operateTenantId da body/query
 * Utile per casi in cui il frontend passa il tenantId nel body
 */
export function extractOperateTenantFromBody(req, res, next) {
    // Se l'header non è presente, prova a estrarlo dal body
    if (!req.headers[OPERATE_TENANT_HEADER]) {
        const bodyTenantId = req.body?.tenantId || req.body?.operateTenantId;
        if (bodyTenantId) {
            req.headers[OPERATE_TENANT_HEADER] = bodyTenantId;
        }
    }
    next();
}

/**
 * Middleware per forzare il tenantId dal context nelle operazioni CREATE
 * Assicura che il tenantId nel body sia sempre quello dell'operateTenant
 */
export function enforceOperateTenantInBody(req, res, next) {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const operateTenantId = req.operateTenantId || req.person?.tenantId;

        if (operateTenantId && req.body) {
            // Se il body ha un tenantId diverso, sostituiscilo
            if (req.body.tenantId && req.body.tenantId !== operateTenantId) {
                logger.warn('TenantMode: Overriding body tenantId with operateTenantId', {
                    originalTenantId: req.body.tenantId,
                    operateTenantId,
                    path: req.path,
                });
            }
            req.body.tenantId = operateTenantId;
        }
    }
    next();
}

/**
 * Utility per ottenere il tenantId corretto per le operazioni
 * Considera l'operateTenantId se presente, altrimenti fallback al tenant dell'utente
 * 
 * @param {Object} req - Express request object
 * @returns {string} TenantId da usare per l'operazione
 */

/**
 * Utility per verificare se è un'operazione cross-tenant
 * 
 * @param {Object} req - Express request object
 * @returns {boolean} True se l'operazione è cross-tenant
 */
export function isCrossTenantOperation(req) {
    const operateTenantId = req.operateTenantId || req.headers[OPERATE_TENANT_HEADER];
    const userTenantId = req.person?.tenantId;

    return operateTenantId && userTenantId && operateTenantId !== userTenantId;
}

export default {
    validateOperateTenant,
    extractOperateTenantFromBody,
    enforceOperateTenantInBody,
    isCrossTenantOperation,
    OPERATE_TENANT_HEADER,
};
