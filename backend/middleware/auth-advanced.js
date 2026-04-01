/**
 * Advanced Authentication Middleware
 * Enhanced JWT authentication with refresh tokens, session management, and security features
 */

import prisma from '../config/prisma-optimization.js';
import { JWTService } from '../auth/jwt.js';
import logger from '../utils/logger.js';
import rateLimit from 'express-rate-limit';
import { RBACService } from './rbac.js';

// Prisma client importato dalla configurazione ottimizzata

/**
 * Enhanced JWT Authentication Middleware
 */
export async function authenticateAdvanced(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Token di accesso richiesto',
                code: 'AUTH_TOKEN_MISSING'
            });
        }

        const token = authHeader.substring(7);

        // Verify and decode token
        let decoded;
        try {
            decoded = await JWTService.verifyAccessToken(token);
        } catch (tokenError) {
            return res.status(401).json({
                error: 'Token non valido',
                code: 'AUTH_TOKEN_INVALID'
            });
        }

        const { personId, sessionId } = decoded || {};

        // Se non c'è sessionId nel token, fallback: carica direttamente la persona e prosegui
        if (!sessionId) {
            // P48: Include tenantProfiles per email/status; F209: add deletedAt: null check
            const person = await prisma.person.findFirst({
                where: { id: personId, deletedAt: null },
                include: {
                    personRoles: {
                        where: { isActive: true, deletedAt: null },
                        include: { permissions: true }
                    },
                    tenantProfiles: {
                        where: { deletedAt: null, isActive: true },
                        select: { email: true, phone: true, status: true, isPrimary: true, companyTenantProfileId: true, tenantId: true }
                    }
                }
            });

            // P48: Flatten da tenantProfiles
            const primaryProfile = person?.tenantProfiles?.find(p => p.isPrimary) || person?.tenantProfiles?.[0] || {};
            const personStatus = primaryProfile.status || 'PENDING';

            if (!person || personStatus !== 'ACTIVE') {
                return res.status(401).json({
                    error: 'Account persona non attivo',
                    code: 'AUTH_PERSON_INACTIVE'
                });
            }

            const permissions = await RBACService.getPersonPermissions(personId);
            const roles = person.personRoles.map(pr => pr.roleType);

            req.person = {
                id: person.id,
                personId: person.id,
                email: primaryProfile.email || null,
                firstName: person.firstName,
                lastName: person.lastName,
                companyTenantProfileId: primaryProfile.companyTenantProfileId || null,
                tenantId: primaryProfile.tenantId, // P63: Sempre da PersonTenantProfile
                roles,
                permissions,
                sessionId: null,
                lastLogin: person.lastLogin
            };

            logger.info('Person authenticated (no sessionId in token)', {
                component: 'auth-advanced',
                action: 'authenticate',
                personId: person.id,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path
            });
            return next();
        }

        // Check if session is still active
        // P49: Include tenantProfiles per email/status/companyTenantProfileId
        const session = await prisma.personSession.findUnique({
            where: { id: sessionId },
            include: {
                person: {
                    include: {
                        personRoles: {
                            where: { isActive: true, deletedAt: null },
                            include: {
                                permissions: true
                            }
                        },
                        tenantProfiles: {
                            where: { deletedAt: null, isActive: true },
                            select: { email: true, phone: true, status: true, isPrimary: true, companyTenantProfileId: true, tenantId: true }
                        }
                    }
                }
            }
        });

        if (!session || !session.isActive || session.expiresAt < new Date()) {
            return res.status(401).json({
                error: 'Session expired or invalid',
                code: 'AUTH_SESSION_INVALID'
            });
        }

        const person = session.person;

        // P48: Flatten da tenantProfiles
        const sessionPrimaryProfile = person?.tenantProfiles?.find(p => p.isPrimary) || person?.tenantProfiles?.[0] || {};
        const sessionPersonStatus = sessionPrimaryProfile.status || 'PENDING';

        if (!person || sessionPersonStatus !== 'ACTIVE') {
            return res.status(401).json({
                error: 'Person account inactive',
                code: 'AUTH_PERSON_INACTIVE'
            });
        }

        // Update session activity
        await prisma.personSession.update({
            where: { id: sessionId },
            data: {
                lastActivityAt: new Date(),
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        // Get person permissions
        const permissions = await RBACService.getPersonPermissions(personId);
        const roles = person.personRoles.map(pr => pr.roleType);

        req.person = {
            id: person.id,
            personId: person.id,
            email: sessionPrimaryProfile.email || null,
            firstName: person.firstName,
            lastName: person.lastName,
            companyTenantProfileId: sessionPrimaryProfile.companyTenantProfileId || null,
            tenantId: sessionPrimaryProfile.tenantId, // P63: Sempre da PersonTenantProfile
            roles: roles,
            permissions: permissions,
            sessionId: sessionId,
            lastLogin: person.lastLogin
        };

        // Log successful authentication
        logger.info('Person authenticated successfully', {
            component: 'auth-advanced',
            action: 'authenticate',
            personId: person.id,
            sessionId: sessionId,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path
        });

        next();

    } catch (error) {
        logger.error('Authentication error', {
            component: 'auth-advanced',
            action: 'authenticate',
            error: error.message,
            stack: error.stack,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path
        });

        res.status(401).json({
            error: 'Authentication failed',
            code: 'AUTH_FAILED'
        });
    }
}

/**
 * Optional Authentication Middleware
 * Authenticates user if token is present, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.substring(7);
        let decoded;
        try {
            decoded = await JWTService.verifyAccessToken(token);
        } catch (tokenError) {
            return next();
        }

        if (decoded) {
            const { personId, sessionId } = decoded;

            // fallback: se manca sessionId, carica persona e prosegui
            // P48: Include tenantProfiles per email/status; F209: add deletedAt: null
            if (!sessionId) {
                const person = await prisma.person.findFirst({
                    where: { id: personId, deletedAt: null },
                    include: {
                        personRoles: {
                            where: { isActive: true, deletedAt: null },
                            include: { permissions: true }
                        },
                        tenantProfiles: {
                            where: { deletedAt: null, isActive: true },
                            select: { email: true, phone: true, status: true, isPrimary: true, companyTenantProfileId: true, tenantId: true }
                        }
                    }
                });

                // P48: Flatten da tenantProfiles
                const optPrimaryProfile = person?.tenantProfiles?.find(p => p.isPrimary) || person?.tenantProfiles?.[0] || {};
                const optPersonStatus = optPrimaryProfile.status || 'PENDING';

                if (person && optPersonStatus === 'ACTIVE') {
                    const permissions = await RBACService.getPersonPermissions(personId);
                    const roles = person.personRoles.map(pr => pr.roleType);
                    req.person = {
                        id: person.id,
                        personId: person.id,
                        email: optPrimaryProfile.email || null,
                        firstName: person.firstName,
                        lastName: person.lastName,
                        companyTenantProfileId: optPrimaryProfile.companyTenantProfileId || null,
                        tenantId: optPrimaryProfile.tenantId, // P63: Sempre da PersonTenantProfile
                        roles,
                        permissions,
                        sessionId: null,
                        lastLogin: person.lastLogin
                    };
                }
                return next();
            }

            // P48: Include tenantProfiles per email/status
            const session = await prisma.personSession.findUnique({
                where: { id: sessionId },
                include: {
                    person: {
                        include: {
                            personRoles: {
                                where: { isActive: true, deletedAt: null },
                                include: {
                                    permissions: true
                                }
                            },
                            tenantProfiles: {
                                where: { deletedAt: null, isActive: true },
                                select: { email: true, phone: true, status: true, isPrimary: true, companyTenantProfileId: true, tenantId: true }
                            }
                        }
                    }
                }
            });

            if (session && session.isActive && session.expiresAt >= new Date()) {
                const person = session.person;

                // P48: Flatten da tenantProfiles
                const sessPrimaryProfile = person?.tenantProfiles?.find(p => p.isPrimary) || person?.tenantProfiles?.[0] || {};
                const sessPersonStatus = sessPrimaryProfile.status || 'PENDING';

                if (person && sessPersonStatus === 'ACTIVE') {
                    // Aggiorna lastActivityAt della sessione per mantenere lo stato online
                    await prisma.personSession.update({
                        where: { id: sessionId },
                        data: { lastActivityAt: new Date() }
                    });

                    const permissions = await RBACService.getPersonPermissions(personId);
                    const roles = person.personRoles.map(pr => pr.roleType);

                    req.person = {
                        id: person.id,
                        personId: person.id,
                        email: sessPrimaryProfile.email || null,
                        firstName: person.firstName,
                        lastName: person.lastName,
                        companyTenantProfileId: sessPrimaryProfile.companyTenantProfileId || null,
                        tenantId: sessPrimaryProfile.tenantId, // P63: Sempre da PersonTenantProfile
                        roles: roles,
                        permissions: permissions,
                        sessionId: sessionId,
                        lastLogin: person.lastLogin
                    };
                }
            }
        }

        next();

    } catch (error) {
        logger.warn('Optional authentication failed', {
            component: 'auth-advanced',
            action: 'optionalAuth',
            error: error.message,
            ip: req.ip
        });

        next();
    }
}

/**
 * Session Timeout Middleware
 */
export function sessionTimeout(timeoutMinutes = 30) {
    return async (req, res, next) => {
        try {
            if (!req.person || !req.person.sessionId) {
                return next();
            }

            const session = await prisma.personSession.findUnique({
                where: { id: req.person.sessionId }
            });

            // F255: reject soft-deleted sessions
            if (!session || session.deletedAt) {
                return res.status(401).json({
                    error: 'Session not found',
                    code: 'AUTH_SESSION_NOT_FOUND'
                });
            }

            const now = new Date();
            const lastActivity = new Date(session.lastActivityAt);
            const timeoutMs = timeoutMinutes * 60 * 1000;

            if (now - lastActivity > timeoutMs) {
                // Deactivate expired session
                await prisma.personSession.update({
                    where: { id: session.id },
                    data: { isActive: false }
                });

                logger.info('Session timed out', {
                    component: 'auth-advanced',
                    action: 'sessionTimeout',
                    sessionId: session.id,
                    personId: session.personId
                });

                return res.status(401).json({
                    error: 'Session timed out',
                    code: 'AUTH_SESSION_TIMEOUT'
                });
            }

            next();
        } catch (error) {
            logger.error('Session timeout check failed', {
                component: 'auth-advanced',
                action: 'sessionTimeout',
                error: error.message
            });
            next();
        }
    };
}

/**
 * Rate Limiting for Authentication Endpoints
 */
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 attempts per window (increased for development)
    message: {
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip + ':' + (req.body?.email || req.body?.username || 'unknown');
    },
    skip: (req) => {
        // Skip rate limiting for successful authentications
        return req.rateLimit?.remaining > 0;
    },
    // onLimitReached is deprecated in express-rate-limit v7
    // Rate limit exceeded logging is handled by the handler function
});

/**
 * Failed Login Tracking Middleware
 */
export async function trackFailedLogin(req, res, next) {
    const originalSend = res.send;

    res.send = function (data) {
        // Check if this was a failed login attempt
        if (res.statusCode === 401 && req.body?.email) {
            trackLoginAttempt(req.body.email, req.ip, false);
        } else if (res.statusCode === 200 && req.body?.email) {
            trackLoginAttempt(req.body.email, req.ip, true);
        }

        return originalSend.call(this, data);
    };

    next();
}

/**
 * Track login attempts and implement account lockout
 */
async function trackLoginAttempt(email, ip, success) {
    try {
        // P48: email è su PersonTenantProfile, non su Person
        const profile = await prisma.personTenantProfile.findFirst({
            where: { email, deletedAt: null },
            include: { person: { select: { id: true, failedAttempts: true, lockedUntil: true } } }
        });

        if (!profile?.person) return;
        const user = profile.person;

        if (success) {
            // Reset failed attempts on successful login
            await prisma.person.update({
                where: { id: user.id },
                data: {
                    failedAttempts: 0,
                    lockedUntil: null,
                    lastLogin: new Date()
                }
            });

            logger.info('Successful login', {
                component: 'auth-advanced',
                action: 'trackLoginAttempt',
                personId: user.id,
                email: email,
                ip: ip
            });
        } else {
            // Increment failed attempts
            const maxAttempts = parseInt(process.env.FAILED_LOGIN_ATTEMPTS) || 5;
            const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 30;

            const newFailedAttempts = (user.failedAttempts || 0) + 1;
            const updateData = {
                failedAttempts: newFailedAttempts
            };

            if (newFailedAttempts >= maxAttempts) {
                updateData.lockedUntil = new Date(Date.now() + lockoutDuration * 60 * 1000);

                logger.warn('Account locked due to failed login attempts', {
                    component: 'auth-advanced',
                    action: 'trackLoginAttempt',
                    personId: user.id,
                    email: email,
                    ip: ip,
                    failedAttempts: newFailedAttempts,
                    lockoutDuration: lockoutDuration
                });
            }

            await prisma.person.update({
                where: { id: user.id },
                data: updateData
            });

            logger.warn('Failed login attempt', {
                component: 'auth-advanced',
                action: 'trackLoginAttempt',
                personId: user.id,
                email: email,
                ip: ip,
                failedAttempts: newFailedAttempts
            });
        }

    } catch (error) {
        logger.error('Failed to track login attempt', {
            component: 'auth-advanced',
            action: 'trackLoginAttempt',
            error: error.message,
            email: email,
            ip: ip
        });
    }
}

/**
 * Check if account is locked
 */
export async function checkAccountLock(req, res, next) {
    try {
        const { email } = req.body;

        if (!email) {
            return next();
        }

        // P48: email è su PersonTenantProfile, non su Person
        const profile = await prisma.personTenantProfile.findFirst({
            where: { email, deletedAt: null },
            include: { person: { select: { id: true, lockedUntil: true } } }
        });

        if (!profile?.person) {
            return next();
        }

        const user = profile.person;

        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const remainingTime = Math.ceil((user.lockedUntil - new Date()) / (1000 * 60));

            logger.warn('Login attempt on locked account', {
                component: 'auth-advanced',
                action: 'checkAccountLock',
                personId: user.id,
                email: email,
                ip: req.ip,
                remainingLockTime: remainingTime
            });

            return res.status(423).json({
                error: 'Account temporarily locked',
                code: 'AUTH_ACCOUNT_LOCKED',
                remainingTime: remainingTime,
                message: `Account locked for ${remainingTime} more minutes`
            });
        }

        next();

    } catch (error) {
        logger.error('Account lock check failed', {
            component: 'auth-advanced',
            action: 'checkAccountLock',
            error: error.message,
            email: req.body?.email
        });

        next();
    }
}

/**
 * Device Fingerprinting Middleware
 */
export function deviceFingerprint(req, res, next) {
    const userAgent = req.get('User-Agent') || '';
    const acceptLanguage = req.get('Accept-Language') || '';
    const acceptEncoding = req.get('Accept-Encoding') || '';

    // Create a simple device fingerprint
    const fingerprint = Buffer.from(
        `${userAgent}:${acceptLanguage}:${acceptEncoding}:${req.ip}`
    ).toString('base64');

    req.deviceFingerprint = fingerprint;

    next();
}

/**
 * Concurrent Session Limit Middleware
 */
export function limitConcurrentSessions(maxSessions = 3) {
    return async (req, res, next) => {
        try {
            if (!req.person) {
                return next();
            }

            const activeSessions = await prisma.personSession.count({
                where: {
                    personId: req.person.id,
                    isActive: true,
                    expiresAt: {
                        gt: new Date()
                    }
                }
            });

            if (activeSessions > maxSessions) {
                // Deactivate oldest sessions
                const oldestSessions = await prisma.personSession.findMany({
                    where: {
                        personId: req.person.id,
                        isActive: true,
                        deletedAt: null, // F255: exclude soft-deleted sessions
                        expiresAt: {
                            gt: new Date()
                        }
                    },
                    orderBy: {
                        lastActivityAt: 'asc'
                    },
                    take: activeSessions - maxSessions
                });

                await prisma.personSession.updateMany({
                    where: {
                        id: {
                            in: oldestSessions.map(s => s.id)
                        }
                    },
                    data: {
                        isActive: false
                    }
                });

                logger.info('Deactivated old sessions due to concurrent limit', {
                    component: 'auth-advanced',
                    action: 'limitConcurrentSessions',
                    personId: req.person.id,
                    deactivatedSessions: oldestSessions.length,
                    maxSessions
                });
            }

            next();

        } catch (error) {
            logger.error('Concurrent session limit check failed', {
                component: 'auth-advanced',
                action: 'limitConcurrentSessions',
                error: error.message,
                personId: req.person?.id
            });

            next();
        }
    };
}

export default {
    authenticateAdvanced,
    optionalAuth,
    sessionTimeout,
    authRateLimit,
    trackFailedLogin,
    checkAccountLock,
    deviceFingerprint,
    limitConcurrentSessions
};