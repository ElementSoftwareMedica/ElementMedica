/**
 * Authentication Routes
 * Handles login, logout, registration, password reset, and token refresh
 */

import express from 'express';
import { JWTService, PasswordService } from './jwt.js';
import middleware from './middleware.js';
const { authenticate, authorize, rateLimit, auditLog } = middleware;
import { authenticateTest } from './middleware-test.js';
import prisma from '../config/prisma-optimization.js';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';

const router = express.Router();

// Prisma client is already initialized and imported

/**
 * Validation middleware
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
        });
    }
    next();
};

/**
 * Get device info from request
 */
function getDeviceInfo(req) {
    return {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        platform: req.get('X-Platform') || 'web',
        deviceId: req.get('X-Device-ID') || null
    };
}

/**
 * POST /auth/login
 * User login with email and password
 */
// Debug middleware rimosso per evitare problemi

router.post('/login', 
    rateLimit({ maxRequests: 100, windowMs: 15 * 60 * 1000 }), // 100 attempts per 15 minutes (temporary for testing)
    // Debug middleware specifico per login
    (req, res, next) => {
        console.log('🔍 [LOGIN HANDLER] Request body debug:', {
            bodyExists: !!req.body,
            bodyType: typeof req.body,
            bodyKeys: req.body ? Object.keys(req.body) : 'N/A',
            bodyContent: req.body,
            contentType: req.get('Content-Type'),
            method: req.method,
            url: req.url
        });
        next();
    },
    [
        body('identifier').isLength({ min: 1 }).withMessage('Email, username, or tax code is required'),
        body('password').isLength({ min: 1 }).withMessage('Password must be at least 6 characters long')
    ],
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('🔍 [LOGIN HANDLER] Validation errors:', errors.array());
            return res.status(400).json({
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: errors.array()
            });
        }
        next();
    },
    auditLog('LOGIN', 'auth'),
    async (req, res) => {
        try {
            const { identifier, password, rememberMe = false } = req.body;
            const deviceInfo = getDeviceInfo(req);

            // Find person with roles by identifier (email, username, or taxCode)
            const person = await prisma.person.findFirst({
                where: {
                    OR: [
                        { email: identifier },
                        { username: identifier },
                        { taxCode: identifier }
                    ]
                },
                include: {
                    personRoles: {
                        where: { isActive: true },
                        include: {
                            permissions: true
                        }
                    },
                    company: true
                }
            });

            if (!person) {
                return res.status(401).json({
                    error: 'Invalid credentials',
                    code: 'AUTH_INVALID_CREDENTIALS'
                });
            }

            // Check if person is active
            if (person.status !== 'ACTIVE') {
                return res.status(401).json({
                    error: 'Account is deactivated',
                    code: 'AUTH_ACCOUNT_DEACTIVATED'
                });
            }

            // Check if account is locked
            if (person.lockedUntil && person.lockedUntil > new Date()) {
                return res.status(423).json({
                    error: 'Account is temporarily locked',
                    code: 'AUTH_ACCOUNT_LOCKED',
                    lockedUntil: person.lockedUntil
                });
            }

            // Verify password
            const isValidPassword = await PasswordService.verifyPassword(password, person.password);
            
            if (!isValidPassword) {
                // Increment failed login attempts
                const failedAttempts = (person.failedAttempts || 0) + 1;
                const updateData = {
                    failedAttempts: failedAttempts
                };

                // Lock account after 5 failed attempts
                if (failedAttempts >= 5) {
                    updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
                }

                await prisma.person.update({
                    where: { id: person.id },
                    data: updateData
                });

                return res.status(401).json({
                    error: 'Invalid credentials',
                    code: 'AUTH_INVALID_CREDENTIALS',
                    attemptsRemaining: Math.max(0, 5 - failedAttempts)
                });
            }

            // Reset failed login attempts on successful login
            await prisma.person.update({
                where: { id: person.id },
                data: {
                    failedAttempts: 0,
                    lockedUntil: null,
                    lastLogin: new Date()
                }
            });

            // Prepare person data with roles and permissions
            const roles = person.personRoles.map(pr => pr.roleType);
            const permissions = person.personRoles.flatMap(pr => pr.permissions || []);
            
            // Add global role if present
            if (person.globalRole) {
                roles.push(person.globalRole);
            }

            const personWithRoles = {
                ...person,
                roles,
                permissions
            };

            // Generate tokens
            const tokens = await JWTService.generateTokenPair(personWithRoles, deviceInfo);

            // Set HTTP-only cookies for web clients
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // lax in development for cross-port requests
                maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 7 days or 1 day
            };

            res.cookie('accessToken', tokens.accessToken, {
                ...cookieOptions,
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
            res.cookie('sessionToken', tokens.sessionToken, cookieOptions);

            // Return person info and tokens
            res.json({
                success: true,
                user: {
                    id: person.id,
                    email: person.email,
                    firstName: person.firstName,
                    lastName: person.lastName,
                    companyId: person.companyId,
                    company: person.company,
                    roles,
                    permissions,
                    globalRole: person.globalRole,
                    lastLogin: person.lastLogin
                },
                tokens: {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresIn: tokens.expiresIn,
                    tokenType: tokens.tokenType
                }
            });

        } catch (error) {
            logger.error('Login failed', {
                component: 'auth-routes',
                action: 'login',
                error: error.message,
                stack: error.stack,
                identifier: req.body?.identifier,
                ip: req.ip
            });
            res.status(500).json({
                error: 'Login failed',
                code: 'AUTH_LOGIN_FAILED'
            });
        }
    }
);

/**
 * POST /auth/logout
 * User logout - invalidate session
 */
router.post('/logout',
    authenticate(),
    auditLog('LOGOUT', 'auth'),
    async (req, res) => {
        try {
            const sessionToken = req.cookies?.sessionToken;
            
            if (sessionToken) {
                await JWTService.revokeSession(sessionToken);
            }

            // Clear cookies
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            res.clearCookie('sessionToken');

            res.json({
                success: true,
                message: 'Logged out successfully'
            });

        } catch (error) {
            logger.error('Logout failed', {
                component: 'auth-routes',
                action: 'logout',
                error: error.message,
                stack: error.stack,
                personId: req.person?.id
            });
            res.status(500).json({
                error: 'Logout failed',
                code: 'AUTH_LOGOUT_FAILED'
            });
        }
    }
);

/**
 * POST /auth/logout-all
 * Logout from all devices
 */
router.post('/logout-all',
    authenticate(),
    auditLog('LOGOUT_ALL', 'auth'),
    async (req, res) => {
        try {
            await JWTService.revokeAllPersonSessions(req.person.id);

            // Clear cookies
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            res.clearCookie('sessionToken');

            res.json({
                success: true,
                message: 'Logged out from all devices'
            });

        } catch (error) {
            logger.error('Logout all failed', {
                component: 'auth-routes',
                action: 'logoutAll',
                error: error.message,
                stack: error.stack,
                personId: req.person?.id
            });
            res.status(500).json({
                error: 'Logout failed',
                code: 'AUTH_LOGOUT_ALL_FAILED'
            });
        }
    }
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh',
    rateLimit({ maxRequests: 10, windowMs: 15 * 60 * 1000 }),
    async (req, res) => {
        try {
            const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

            if (!refreshToken) {
                return res.status(401).json({
                    error: 'Refresh token required',
                    code: 'AUTH_REFRESH_TOKEN_MISSING'
                });
            }

            const tokens = await JWTService.refreshAccessToken(refreshToken);

            // Update access token cookie
            res.cookie('accessToken', tokens.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // lax in development for cross-port requests
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.json({
                success: true,
                tokens
            });

        } catch (error) {
            logger.error('Token refresh failed', {
            component: 'auth-routes',
            action: 'refreshToken',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id
        });
            
            // Clear invalid cookies
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            res.clearCookie('sessionToken');
            
            res.status(401).json({
                error: 'Token refresh failed',
                code: 'AUTH_REFRESH_FAILED'
            });
        }
    }
);

/**
 * POST /auth/register
 * User registration (admin only)
 */
router.post('/register',
    authenticate(),
    authorize(['users.create']),
    rateLimit({ maxRequests: 10, windowMs: 60 * 60 * 1000 }), // 10 registrations per hour
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }),
        body('firstName').isLength({ min: 1 }).trim(),
        body('lastName').isLength({ min: 1 }).trim(),
        body('companyId').isUUID().optional(),
        body('roles').isArray().optional()
    ],
    validateRequest,
    auditLog('REGISTER', 'auth'),
    async (req, res) => {
        try {
            const {
                email,
                password,
                firstName,
                lastName,
                companyId,
                employeeId,
                roles = ['employee']
            } = req.body;

            // Validate password strength
            const passwordValidation = PasswordService.validatePasswordStrength(password);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    error: 'Password does not meet requirements',
                    code: 'AUTH_WEAK_PASSWORD',
                    details: passwordValidation.errors
                });
            }

            // Check if person already exists
            const existingPerson = await prisma.person.findUnique({
                where: { email }
            });

            if (existingPerson) {
                return res.status(409).json({
                    error: 'Person already exists',
                    code: 'AUTH_USER_EXISTS'
                });
            }

            // Hash password
            const passwordHash = await PasswordService.hashPassword(password);

            // Use requester's company if not specified (unless global admin)
            const targetCompanyId = companyId || 
                (req.person.roles.includes('global_admin') ? null : req.person.companyId);

            // Create person
            const person = await prisma.person.create({
                data: {
                    email,
                    passwordHash: passwordHash,
                    firstName: firstName,
                     lastName: lastName,
                    companyId: targetCompanyId,
                     employeeId: employeeId,
                    createdBy: req.person.id
                }
            });

            // Assign roles
            for (const roleType of roles) {
                // Validate roleType against enum
                const validRoleTypes = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'TRAINER'];
                if (validRoleTypes.includes(roleType)) {
                    await prisma.personRole.create({
                        data: {
                            personId: person.id,
                            roleType: roleType,
                            companyId: targetCompanyId,
                            assignedBy: req.person.id
                        }
                    });
                }
            }

            res.status(201).json({
                success: true,
                user: {
                    id: person.id,
                    email: person.email,
                    firstName: person.firstName,
                    lastName: person.lastName,
                    companyId: person.companyId,
                    roles
                }
            });

        } catch (error) {
            logger.error('Registration failed', {
            component: 'auth-routes',
            action: 'register',
            error: error.message,
            stack: error.stack,
            email: req.body?.email
        });
            res.status(500).json({
                error: 'Registration failed',
                code: 'AUTH_REGISTRATION_FAILED'
            });
        }
    }
);

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me',
    authenticate(),
    async (req, res) => {
        try {
            const person = await prisma.person.findUnique({
                where: { id: req.person.id },
                include: {
                    personRoles: {
                        where: { isActive: true },
                        include: {
                            role: true
                        }
                    },
                    company: true
                }
            });

            if (!person) {
                return res.status(404).json({
                    error: 'Person not found',
                    code: 'AUTH_USER_NOT_FOUND'
                });
            }

            const roles = person.personRoles.map(pr => pr.role.name);
            const permissions = person.personRoles.flatMap(pr => pr.role.permissions || []);

            res.json({
                success: true,
                user: {
                    id: person.id,
                    email: person.email,
                    firstName: person.firstName,
                     lastName: person.lastName,
                    phone: person.phone,
                    avatarUrl: person.avatarUrl,
                    language: person.language,
                    timezone: person.timezone,
                    companyId: person.companyId,
                     employeeId: person.employeeId,
                    company: person.company,
                    roles,
                    permissions,
                    isActive: person.status === 'ACTIVE',
                    isVerified: person.isVerified,
                    lastLogin: person.lastLogin,
                    createdAt: person.createdAt
                }
            });

        } catch (error) {
            logger.error('Failed to get user profile', {
            component: 'auth-routes',
            action: 'getUser',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id
        });
            res.status(500).json({
                error: 'Failed to get user info',
                code: 'AUTH_GET_USER_FAILED'
            });
        }
    }
);

/**
 * PUT /auth/me
 * Update current user profile
 */
router.put('/me',
    authenticate(),
    [
        body('firstName').optional().isLength({ min: 1 }).trim(),
        body('lastName').optional().isLength({ min: 1 }).trim(),
        body('phone').optional().isMobilePhone(),
        body('language').optional().isIn(['it', 'en']),
        body('timezone').optional().isLength({ min: 1 })
    ],
    validateRequest,
    auditLog('UPDATE_PROFILE', 'auth'),
    async (req, res) => {
        try {
            const {
                firstName,
                lastName,
                phone,
                language,
                timezone
            } = req.body;

            const updateData = {};
            if (firstName !== undefined) updateData.firstName = firstName;
             if (lastName !== undefined) updateData.lastName = lastName;
            if (phone !== undefined) updateData.phone = phone;
            if (language !== undefined) updateData.language = language;
            if (timezone !== undefined) updateData.timezone = timezone;
            
            updateData.updatedBy = req.person.id;

            const person = await prisma.person.update({
                where: { id: req.person.id },
                data: updateData
            });

            res.json({
                success: true,
                user: {
                    id: person.id,
                    email: person.email,
                    firstName: person.firstName,
                 lastName: person.lastName,
                    phone: person.phone,
                    language: person.language,
                    timezone: person.timezone
                }
            });

        } catch (error) {
            logger.error('Failed to update profile', {
            component: 'auth-routes',
            action: 'updateProfile',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id
        });
            res.status(500).json({
                error: 'Failed to update profile',
                code: 'AUTH_UPDATE_PROFILE_FAILED'
            });
        }
    }
);

/**
 * POST /auth/change-password
 * Change user password
 */
router.post('/change-password',
    authenticate(),
    rateLimit({ maxRequests: 5, windowMs: 60 * 60 * 1000 }), // 5 attempts per hour
    [
        body('currentPassword').isLength({ min: 1 }),
        body('newPassword').isLength({ min: 8 })
    ],
    validateRequest,
    auditLog('CHANGE_PASSWORD', 'auth'),
    async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;

            // Get current person
            const person = await prisma.person.findUnique({
                where: { id: req.person.id }
            });

            // Verify current password
            const isValidPassword = await PasswordService.verifyPassword(currentPassword, person.passwordHash);
            if (!isValidPassword) {
                return res.status(401).json({
                    error: 'Current password is incorrect',
                    code: 'AUTH_INVALID_CURRENT_PASSWORD'
                });
            }

            // Validate new password strength
            const passwordValidation = PasswordService.validatePasswordStrength(newPassword);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    error: 'New password does not meet requirements',
                    code: 'AUTH_WEAK_PASSWORD',
                    details: passwordValidation.errors
                });
            }

            // Hash new password
            const newPasswordHash = await PasswordService.hashPassword(newPassword);

            // Update password
            await prisma.person.update({
                where: { id: req.person.id },
                data: {
                    passwordHash: newPasswordHash,
                    passwordChangedAt: new Date(),
                    updatedBy: req.person.id
                }
            });

            // Revoke all sessions except current one
            const sessionToken = req.cookies?.sessionToken;
            if (sessionToken) {
                await prisma.personSession.updateMany({
                    where: {
                        personId: req.person.id,
                        sessionToken: { not: sessionToken },
                        isActive: true
                    },
                    data: {
                        isActive: false
                    }
                });
            }

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            logger.error('Failed to change password', {
            component: 'auth-routes',
            action: 'changePassword',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id
        });
            res.status(500).json({
                error: 'Failed to change password',
                code: 'AUTH_CHANGE_PASSWORD_FAILED'
            });
        }
    }
);

/**
 * GET /auth/sessions
 * Get user's active sessions
 */
router.get('/sessions',
    authenticate(),
    async (req, res) => {
        try {
            const sessions = await prisma.personSession.findMany({
                where: {
                    personId: req.person.id,
                    isActive: true,
                    expiresAt: {
                        gt: new Date()
                    }
                },
                select: {
                    id: true,
                    sessionToken: true,
                    deviceInfo: true,
                    ipAddress: true,
                    lastActivity: true,
                    createdAt: true
                },
                orderBy: {
                    lastActivity: 'desc'
                }
            });

            const currentSessionToken = req.cookies?.sessionToken;

            res.json({
                success: true,
                sessions: sessions.map(session => ({
                    ...session,
                    isCurrent: session.sessionToken === currentSessionToken
                }))
            });

        } catch (error) {
            logger.error('Failed to get sessions', {
            component: 'auth-routes',
            action: 'getSessions',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id
        });
            res.status(500).json({
                error: 'Failed to get sessions',
                code: 'AUTH_GET_SESSIONS_FAILED'
            });
        }
    }
);

/**
 * DELETE /auth/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId',
    authenticate(),
    auditLog('REVOKE_SESSION', 'auth'),
    async (req, res) => {
        try {
            const { sessionId } = req.params;

            await prisma.personSession.updateMany({
                where: {
                    id: sessionId,
                    personId: req.person.id,
                    isActive: true
                },
                data: {
                    isActive: false
                }
            });

            res.json({
                success: true,
                message: 'Session revoked successfully'
            });

        } catch (error) {
            logger.error('Failed to revoke session', {
            component: 'auth-routes',
            action: 'revokeSession',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id,
            sessionId: req.params?.sessionId
        });
            res.status(500).json({
                error: 'Failed to revoke session',
                code: 'AUTH_REVOKE_SESSION_FAILED'
            });
        }
    }
);

/**
 * Token verification endpoint
 * GET /verify
 * Verifies if the provided token is valid
 */
router.get('/verify', authenticateTest, async (req, res) => {
    try {
        // If we reach here, the token is valid (authenticate middleware passed)
        res.json({
            valid: true,
            user: {
                id: req.person.id,
                email: req.person.email,
                globalRole: req.person.globalRole,
                roles: req.person.roles,
                permissions: req.person.permissions,
                companyId: req.person.companyId,
                tenantId: req.person.tenantId
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Token verification failed', {
            component: 'auth-routes',
            action: 'verify',
            error: error.message,
            stack: error.stack
        });
        res.status(401).json({
            valid: false,
            error: 'Token verification failed',
            code: 'TOKEN_VERIFICATION_FAILED'
        });
    }
});

export default router;