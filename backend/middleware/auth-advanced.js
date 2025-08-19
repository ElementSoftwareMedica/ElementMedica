/**
 * Advanced Authentication Middleware
 * Enhanced JWT authentication with refresh tokens, session management, and security features
 */

import jwt from 'jsonwebtoken';
import prisma from '../config/prisma-optimization.js';
import { AdvancedJWTService } from '../auth/jwt-advanced.js';
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
                error: 'Access token required',
                code: 'AUTH_TOKEN_MISSING'
            });
        }
        
        const token = authHeader.substring(7);
        
        // Verify and decode token
        let decoded;
        try {
            decoded = await AdvancedJWTService.verifyAccessToken(token);
        } catch (tokenError) {
            return res.status(401).json({
                error: 'Invalid token',
                code: 'AUTH_TOKEN_INVALID'
            });
        }
        
        const { personId, sessionId } = decoded;
        
        // Check if session is still active
        const session = await prisma.personSession.findUnique({
            where: { id: sessionId },
            include: {
                person: {
                    include: {
                        personRoles: {
                            where: { isActive: true },
                            include: {
                                permissions: true
                            }
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
        
        if (!person || person.status !== 'ACTIVE') {
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
        
        // Attach person info to request
        // Aggiorna lastActivityAt della sessione per mantenere lo stato online
        await prisma.personSession.update({
            where: { id: sessionId },
            data: { lastActivityAt: new Date() }
        });

        req.person = {
            id: person.id,
            personId: person.id,
            email: person.email,
            firstName: person.firstName,
            lastName: person.lastName,
            companyId: person.companyId,
            tenantId: person.tenantId, // ✅ Aggiunto campo tenantId mancante
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
            decoded = await AdvancedJWTService.verifyAccessToken(token);
        } catch (tokenError) {
            return next();
        }
        
        if (decoded) {
            const { personId, sessionId } = decoded;
            
            const session = await prisma.personSession.findUnique({
                where: { id: sessionId },
                include: {
                    person: {
                        include: {
                            personRoles: {
                                where: { isActive: true },
                                include: {
                                    permissions: true
                                }
                            }
                        }
                    }
                }
            });
            
            if (session && session.isActive && session.expiresAt >= new Date()) {
                const person = session.person;
                
                if (person && person.status === 'ACTIVE') {
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
                        email: person.email,
                        firstName: person.firstName,
                        lastName: person.lastName,
                        companyId: person.companyId,
                        tenantId: person.tenantId, // ✅ Aggiunto campo tenantId mancante
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
            
            if (!session) {
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
                    personId: req.person.id,
                    sessionId: session.id,
                    lastActivity: lastActivity,
                    timeoutMinutes
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
            error: error.message,
            personId: req.person?.id
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
    
    res.send = function(data) {
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
        const user = await prisma.person.findUnique({
            where: { email }
        });
        
        if (!user) return;
        
        if (success) {
            // Reset failed attempts on successful login
            await prisma.person.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: 0,
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
            
            const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
            const updateData = {
                failedLoginAttempts: newFailedAttempts
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
        
        const user = await prisma.person.findUnique({
            where: { email }
        });
        
        if (!user) {
            return next();
        }
        
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