/**
 * Authentication and Authorization Middleware
 * Handles JWT validation, role-based access control, and company isolation
 */

import { JWTService } from './jwt.js';
// removed: import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import { matchPermission } from '../constants/permissions.js';
import { getDefaultPermissions } from '../services/enhancedRole/utils/RoleTypes.js';

import prisma from '../config/prisma-optimization.js';

/**
 * Extract token from request headers
 */
function extractToken(req) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        return token;
    }

    // Also check for token in cookies (for web app)
    if (req.cookies && req.cookies.accessToken) {
        return req.cookies.accessToken;
    }

    return null;
}

/**
 * Authentication middleware
 * Validates JWT token and attaches user info to request
 */
export function authenticate(options = {}) {
    const { optional = false } = options;

    return async (req, res, next) => {
        try {
            const token = extractToken(req);

            if (!token) {
                if (optional) {
                    req.person = null;
                    return next();
                }
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_TOKEN_MISSING'
                });
            }

            // Verify JWT token
            const decoded = JWTService.verifyAccessToken(token);

            const person = await prisma.person.findUnique({
                where: { id: decoded.personId },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    companyId: true,
                    tenantId: true,
                    globalRole: true,
                    status: true,
                    deletedAt: true,
                    lockedUntil: true
                }
            });

            if (!person) {
                return res.status(401).json({
                    error: 'Person not found',
                    code: 'AUTH_USER_NOT_FOUND'
                });
            }

            // Get roles separately with optimized query
            const personRoles = await prisma.personRole.findMany({
                where: {
                    personId: decoded.personId,
                    isActive: true
                },
                select: {
                    roleType: true
                }
            });

            if (person.status !== 'ACTIVE' || person.deletedAt) {
                return res.status(401).json({
                    error: 'Person not found or inactive',
                    code: 'AUTH_USER_INACTIVE'
                });
            }

            // Check if person is locked
            if (person.lockedUntil && person.lockedUntil > new Date()) {
                return res.status(423).json({
                    error: 'Account is temporarily locked',
                    code: 'AUTH_ACCOUNT_LOCKED',
                    lockedUntil: person.lockedUntil
                });
            }

            // Skip company and tenant queries for now to avoid timeout
            const company = null;
            const tenant = null;

            // Skip last activity update to avoid timeout
            // if (!req.path.includes('/verify') && !req.path.includes('/permissions')) {
            //     await prisma.person.update({
            //         where: { id: person.id },
            //         data: { lastLogin: new Date() }
            //     });
            // }

            // Extract roles and permissions
            const roles = personRoles.map(pr => pr.roleType);

            // Add globalRole if set (takes precedence)
            if (person.globalRole && !roles.includes(person.globalRole)) {
                roles.push(person.globalRole);
            }

            // Load permissions for all users based on their roles
            let permissions = new Set();

            // Get permissions from each role
            for (const roleType of roles) {
                const rolePermissions = getDefaultPermissions(roleType);
                if (rolePermissions && Array.isArray(rolePermissions)) {
                    rolePermissions.forEach(p => permissions.add(p));
                }
            }

            // Convert to array
            permissions = Array.from(permissions);

            // Determine globalRole from roles
            let globalRole = null;
            if (roles.includes('SUPER_ADMIN')) {
                globalRole = 'SUPER_ADMIN';
            } else if (roles.includes('ADMIN')) {
                globalRole = 'ADMIN';
            } else if (roles.includes('COMPANY_ADMIN')) {
                globalRole = 'COMPANY_ADMIN';
            } else if (roles.includes('MANAGER')) {
                globalRole = 'MANAGER';
            } else if (roles.includes('EMPLOYEE')) {
                globalRole = 'EMPLOYEE';
            }

            // Attach person info to request
            req.person = {
                id: person.id,
                personId: person.id,
                email: person.email,
                username: person.username,
                firstName: person.firstName,
                lastName: person.lastName,
                companyId: person.companyId,
                tenantId: person.tenantId,
                roles: roles,
                globalRole: globalRole,
                permissions: permissions,
                company: company,
                tenant: tenant
            };

            next();

        } catch (error) {

            logger.error('Authentication failed', {
                component: 'auth-middleware',
                action: 'authenticate',
                error: error.message,
                stack: error.stack,
                path: req.path,
                method: req.method
            });

            if (error.message.includes('jwt expired')) {
                return res.status(401).json({
                    error: 'Token expired',
                    code: 'AUTH_TOKEN_EXPIRED'
                });
            }

            return res.status(401).json({
                error: 'Authentication failed',
                code: 'AUTH_TOKEN_INVALID'
            });
        }
    };
}

/**
 * Authorization middleware
 * Checks if user has required permissions
 */
export function authorize(requiredPermissions = []) {
    return (req, res, next) => {
        if (!req.person) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        // Super admin and admin bypass all permission checks
        if (req.person.roles.includes('SUPER_ADMIN') || req.person.roles.includes('ADMIN')) {
            return next();
        }

        // Ensure requiredPermissions is always an array
        const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

        // Check if user has any of the required permissions (formato unificato resource:action)
        const userPermissions = req.person.permissions || [];
        const hasPermission = permissions.some(required =>
            userPermissions.some(userPerm => matchPermission(userPerm, required))
        );

        if (!hasPermission && permissions.length > 0) {
            logger.warn('Authorization failed', {
                component: 'auth-middleware',
                action: 'authorize',
                personId: req.person.id,
                requiredPermissions: permissions,
                userPermissions,
                path: req.path,
                method: req.method
            });

            return res.status(403).json({
                error: 'Insufficient permissions',
                code: 'AUTH_INSUFFICIENT_PERMISSIONS',
                required: permissions
            });
        }

        next();
    };
}

/**
 * Company isolation middleware
 * Ensures users can only access data from their company
 */
export function requireSameCompany() {
    return (req, res, next) => {
        if (!req.person) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        // Super admin bypasses company isolation
        if (req.person.roles.includes('SUPER_ADMIN')) {
            return next();
        }

        // Add company filter to query parameters
        req.companyFilter = {
            companyId: req.person.companyId
        };

        next();
    };
}

/**
 * Audit logging middleware
 * Logs user actions for compliance
 */
export function auditLog(action, resourceType) {
    return async (req, res, next) => {
        // Store audit info for later logging
        req.auditInfo = {
            action,
            resourceType,
            personId: req.person?.id,
            companyId: req.person?.companyId,
            tenantId: req.person?.tenantId,
            timestamp: new Date(),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        };

        // Continue with request
        next();

        // Log after response (in background)
        res.on('finish', async () => {
            try {
                // Verifica che i dati di audit siano completi
                if (!req.auditInfo) {
                    logger.warn('No audit info available, skipping audit log');
                    return;
                }

                // Verifica che personId sia valido (se presente)
                let validPersonId = req.auditInfo.personId;
                if (validPersonId) {
                    const personExists = await prisma.person.findUnique({
                        where: { id: validPersonId },
                        select: { id: true }
                    });
                    if (!personExists) {
                        logger.warn('Invalid personId in audit info, setting to null', {
                            invalidPersonId: validPersonId
                        });
                        validPersonId = null;
                    }
                }

                // Verifica che tenantId sia valido
                let validTenantId = req.auditInfo.tenantId || req.person?.tenantId;
                if (validTenantId) {
                    const tenantExists = await prisma.tenant.findUnique({
                        where: { id: validTenantId },
                        select: { id: true }
                    });
                    if (!tenantExists) {
                        logger.warn('Invalid tenantId in audit info, using default', {
                            invalidTenantId: validTenantId
                        });
                        // Usa il primo tenant disponibile come fallback
                        const defaultTenant = await prisma.tenant.findFirst({
                            select: { id: true }
                        });
                        validTenantId = defaultTenant?.id || null;
                    }
                }

                // Se non abbiamo un tenantId valido, salta l'audit logging
                if (!validTenantId) {
                    logger.warn('No valid tenantId available, skipping audit log');
                    return;
                }

                const auditData = {
                    tenantId: validTenantId,
                    personId: validPersonId, // Può essere null
                    action: req.auditInfo.action,
                    resourceType: req.auditInfo.resourceType || 'UNKNOWN',
                    resourceId: req.params?.id || null,
                    dataAccessed: {
                        statusCode: res.statusCode,
                        success: res.statusCode < 400,
                        timestamp: req.auditInfo.timestamp,
                        method: req.method,
                        url: req.originalUrl
                    },
                    ipAddress: req.auditInfo.ipAddress,
                    userAgent: req.auditInfo.userAgent,
                    companyId: req.auditInfo.companyId || req.person?.companyId || null
                };

                const result = await prisma.gdprAuditLog.create({
                    data: auditData
                });

                logger.debug('Audit log created successfully', {
                    component: 'auth-middleware',
                    action: 'auditLog',
                    auditLogId: result.id
                });

            } catch (error) {
                logger.error('Audit logging failed', {
                    component: 'auth-middleware',
                    action: 'auditLog',
                    error: error.message,
                    auditInfo: req.auditInfo
                });
            }
        });
    };
}

/**
 * Role-based access control middleware
 * Checks if user has required roles
 */
export function requireRoles(requiredRoles = []) {
    return (req, res, next) => {
        if (!req.person) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        // Check if user has any of the required roles
        const hasRole = requiredRoles.some(role =>
            req.person.roles.includes(role)
        );

        if (!hasRole && requiredRoles.length > 0) {
            logger.warn('Role authorization failed', {
                component: 'auth-middleware',
                action: 'requireRoles',
                personId: req.person.id,
                requiredRoles,
                userRoles: req.person.roles,
                path: req.path,
                method: req.method
            });

            return res.status(403).json({
                error: 'Insufficient role permissions',
                code: 'AUTH_INSUFFICIENT_ROLES',
                required: requiredRoles
            });
        }

        next();
    };
}

/**
 * Rate limiting middleware
 * Prevents abuse by limiting requests per user
 */
export function rateLimit(options = {}) {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        maxRequests = 100, // Max requests per window
        skipSuccessfulRequests = false,
        skipFailedRequests = false
    } = options;

    const requests = new Map();

    return (req, res, next) => {
        const personId = req.person?.id || req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old entries
        if (!requests.has(personId)) {
            requests.set(personId, []);
        }

        const userRequests = requests.get(personId);
        const validRequests = userRequests.filter(timestamp => timestamp > windowStart);

        if (validRequests.length >= maxRequests) {
            return res.status(429).json({
                error: 'Too many requests',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
            });
        }

        // Add current request
        validRequests.push(now);
        requests.set(personId, validRequests);

        next();
    };
}

/**
 * Tenant isolation middleware
 * Ensures users can only access data from their tenant
 */
export function requireSameTenant() {
    return (req, res, next) => {
        if (!req.person) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        // Super admin bypasses tenant isolation
        if (req.person.roles.includes('SUPER_ADMIN')) {
            return next();
        }

        // Add tenant filter to query parameters
        req.tenantFilter = {
            tenantId: req.person.tenantId
        };

        next();
    };
}

// Export default object with all middleware functions
export default {
    authenticate,
    authorize,
    requireSameCompany,
    auditLog,
    requireRoles,
    requireSameTenant,
    rateLimit
};