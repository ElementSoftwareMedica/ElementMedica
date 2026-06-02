/**
 * Authentication Routes
 * Handles login, logout, registration, password reset, and token refresh
 */

import express from 'express';
import { JWTService, PasswordService } from './jwt.js';
import middleware from './middleware.js';
const { authenticate, authorize, rateLimit, auditLog } = middleware;
import prisma from '../config/prisma-optimization.js';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { seedDefaultPermissions } from '../services/enhancedRole/utils/PermissionSeeder.js';

const router = express.Router();

// Prisma client is already initialized and imported

/**
 * Validation middleware
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validazione fallita',
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
    rateLimit({ maxRequests: 10, windowMs: 15 * 60 * 1000 }), // 10 attempts per 15 minutes - SECURITY HARDENED
    [
        body('identifier').isLength({ min: 1 }).withMessage('Email, username o codice fiscale obbligatorio'),
        body('password').isLength({ min: 1 }).withMessage('La password deve essere di almeno 6 caratteri')
    ],
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Security: No debug logging in production
            return res.status(400).json({
                error: 'Validazione fallita',
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

            // P48: Prima cerca per username o taxCode (campi globali in Person)
            let person = await prisma.person.findFirst({
                where: {
                    OR: [
                        { username: identifier },
                        { taxCode: identifier }
                    ],
                    deletedAt: null
                },
                include: {
                    personRoles: {
                        where: { isActive: true, deletedAt: null },
                        include: {
                            permissions: true
                        }
                    },
                    tenantProfiles: {
                        where: { deletedAt: null, isActive: true },
                        select: { email: true, phone: true, status: true, isPrimary: true, tenantId: true, companyTenantProfileId: true }
                    }
                }
            });

            // P48: Se non trovato, cerca per email in PersonTenantProfile
            if (!person) {
                const profile = await prisma.personTenantProfile.findFirst({
                    where: {
                        email: identifier.toLowerCase(),
                        deletedAt: null,
                        isActive: true,
                        status: 'ACTIVE'
                    },
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
                                    select: { email: true, phone: true, status: true, isPrimary: true, tenantId: true, companyTenantProfileId: true }
                                }
                            }
                        }
                    }
                });
                if (profile?.person) {
                    person = profile.person;
                }
            }

            if (!person) {
                return res.status(401).json({
                    error: 'Credenziali non valide',
                    code: 'AUTH_INVALID_CREDENTIALS'
                });
            }

            // P48: Flatten email/status da tenantProfiles
            const primaryProfile = person.tenantProfiles?.find(p => p.isPrimary) || person.tenantProfiles?.[0] || {};
            const personStatus = primaryProfile.status || 'PENDING';

            // Check if person is active (P48: usa status da profile)
            if (personStatus !== 'ACTIVE') {
                return res.status(401).json({
                    error: 'Account disattivato',
                    code: 'AUTH_ACCOUNT_DEACTIVATED'
                });
            }

            // Check if account is locked
            if (person.lockedUntil && person.lockedUntil > new Date()) {
                return res.status(423).json({
                    error: 'Account temporaneamente bloccato',
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
                    error: 'Credenziali non valide',
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

            // P63: tenantId SOLO da PersonTenantProfile (Person.tenantId RIMOSSO)
            const effectiveTenantId = primaryProfile.tenantId ||
                person.personRoles?.find(r => r.tenantId)?.tenantId ||
                null;

            const personWithRoles = {
                ...person,
                tenantId: effectiveTenantId, // Override with effective tenantId
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
                maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 7 days or 1 day
                path: '/' // ensure cookies are sent on non-/api paths (e.g., /courses/bulk-import)
            };

            res.cookie('accessToken', tokens.accessToken, {
                ...cookieOptions,
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
            res.cookie('sessionToken', tokens.sessionToken, cookieOptions);

            // Return person info and tokens (P49: usa companyTenantProfileId da primaryProfile)
            res.json({
                success: true,
                mustChangePassword: person.mustChangePassword || false,
                user: {
                    id: person.id,
                    email: primaryProfile.email || null,
                    firstName: person.firstName,
                    lastName: person.lastName,
                    companyTenantProfileId: primaryProfile.companyTenantProfileId || null,
                    companyId: primaryProfile.companyTenantProfileId || null, // backward compatibility alias
                    roles,
                    permissions,
                    globalRole: person.globalRole,
                    lastLogin: person.lastLogin,
                    mustChangePassword: person.mustChangePassword || false
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
                error: 'Accesso fallito',
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
            // F299: revoke the refresh token (stored in DB), NOT the sessionToken which is never persisted
            const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
            if (refreshToken) {
                await JWTService.revokeSession(refreshToken);
            }

            // Clear cookies
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            res.clearCookie('sessionToken');

            res.json({
                success: true,
                message: 'Disconnessione effettuata con successo'
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
                error: 'Disconnessione fallita',
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
                message: 'Disconnessione da tutti i dispositivi effettuata'
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
                error: 'Disconnessione fallita',
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
                    error: 'Token di refresh obbligatorio',
                    code: 'AUTH_REFRESH_TOKEN_MISSING'
                });
            }

            const tokens = await JWTService.refreshAccessToken(refreshToken);

            const isProd = process.env.NODE_ENV === 'production';
            const cookieBase = {
                httpOnly: true,
                secure: isProd,
                sameSite: isProd ? 'strict' : 'lax',
                path: '/'
            };

            // Update access token cookie (short-lived)
            res.cookie('accessToken', tokens.accessToken, {
                ...cookieBase,
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            // Rotate refresh token cookie (new token issued, old one revoked in JWTService)
            res.cookie('refreshToken', tokens.refreshToken, {
                ...cookieBase,
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
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
            res.clearCookie('accessToken', { path: '/' });
            res.clearCookie('refreshToken', { path: '/' });
            res.clearCookie('sessionToken', { path: '/' });

            res.status(401).json({
                error: 'Aggiornamento token fallito',
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
                    error: 'La password non soddisfa i requisiti',
                    code: 'AUTH_WEAK_PASSWORD',
                    details: passwordValidation.errors
                });
            }

            // P48: Check if email already exists in PersonTenantProfile
            const existingProfile = await prisma.personTenantProfile.findFirst({
                where: {
                    email: email.toLowerCase(),
                    deletedAt: null,
                    isActive: true
                }
            });

            if (existingProfile) {
                return res.status(409).json({
                    error: 'Persona già esistente',
                    code: 'AUTH_USER_EXISTS'
                });
            }

            // Hash password
            const passwordHash = await PasswordService.hashPassword(password);

            // Use requester's company if not specified (unless global admin)
            // P49: usa companyTenantProfileId da req.person (impostato dal middleware auth)
            const targetCompanyId = companyId ||
                (req.person.roles.includes('global_admin') ? null : req.person.companyTenantProfileId);
            const targetTenantId = getEffectiveTenantId(req);

            // P49: Create person with nested PersonTenantProfile
            const person = await prisma.person.create({
                data: {
                    passwordHash: passwordHash,
                    firstName: firstName,
                    lastName: lastName,
                    createdBy: req.person.id,
                    // P49: Crea PersonTenantProfile per email e dati tenant-specific
                    tenantProfiles: {
                        create: {
                            tenantId: targetTenantId,
                            email: email.toLowerCase(),
                            companyTenantProfileId: targetCompanyId,
                            status: 'ACTIVE',
                            isPrimary: true,
                            isActive: true
                        }
                    }
                },
                include: {
                    tenantProfiles: {
                        where: { deletedAt: null, isActive: true }
                    }
                }
            });

            // Assign roles
            for (const roleType of roles) {
                // Validate roleType against enum
                const validRoleTypes = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'TRAINER'];
                if (validRoleTypes.includes(roleType)) {
                    const newRole = await prisma.personRole.create({
                        data: {
                            personId: person.id,
                            roleType: roleType,
                            tenantId: targetTenantId,
                            companyTenantProfileId: targetCompanyId,
                            assignedBy: req.person.id
                        }
                    });
                    await seedDefaultPermissions(newRole.id, roleType, prisma);
                }
            }

            // P49: Flatten da tenantProfiles
            const primaryProfile = person.tenantProfiles?.[0] || {};

            res.status(201).json({
                success: true,
                user: {
                    id: person.id,
                    email: primaryProfile.email || null,
                    firstName: person.firstName,
                    lastName: person.lastName,
                    companyTenantProfileId: primaryProfile.companyTenantProfileId || targetCompanyId,
                    companyId: primaryProfile.companyTenantProfileId || targetCompanyId, // backward compatibility alias
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
                error: 'Registrazione fallita',
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
            // P49: Include tenantProfiles per email/phone/status (company rimosso da Person)
            const person = await prisma.person.findFirst({ // F232: findFirst+deletedAt
                where: { id: req.person.id, deletedAt: null },
                include: {
                    personRoles: {
                        where: { isActive: true, deletedAt: null },
                        include: {
                            customRole: true
                        }
                    },
                    tenantProfiles: {
                        where: { deletedAt: null, isActive: true },
                        select: { email: true, phone: true, status: true, isPrimary: true, companyTenantProfileId: true }
                    }
                }
            });

            if (!person) {
                return res.status(404).json({
                    error: 'Persona non trovata',
                    code: 'AUTH_USER_NOT_FOUND'
                });
            }

            // P48: Flatten da tenantProfiles
            const primaryProfile = person.tenantProfiles?.find(p => p.isPrimary) || person.tenantProfiles?.[0] || {};

            // P69: Use roleType consistently (not customRole.name which is a display name)
            const roles = person.personRoles.map(pr => pr.roleType).filter(Boolean);
            const permissions = person.personRoles.flatMap(pr => pr.role?.permissions || []);

            res.json({
                success: true,
                user: {
                    id: person.id,
                    email: primaryProfile.email || null,
                    firstName: person.firstName,
                    lastName: person.lastName,
                    phone: primaryProfile.phone || null,
                    avatarUrl: person.avatarUrl,
                    language: person.language,
                    timezone: person.timezone,
                    companyTenantProfileId: primaryProfile.companyTenantProfileId || null,
                    companyId: primaryProfile.companyTenantProfileId || null, // backward compatibility alias
                    employeeId: person.employeeId,
                    roles,
                    permissions,
                    isActive: (primaryProfile.status || 'PENDING') === 'ACTIVE',
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
                error: 'Impossibile recuperare le informazioni utente',
                code: 'AUTH_GET_USER_FAILED'
            });
        }
    }
);

/**
 * PUT /auth/me
 * Update current user profile
 * P48: phone va in PersonTenantProfile, firstName/lastName su Person
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

            // P48: Separa campi Person (globali) da ProfileTenant (tenant-specific)
            const personUpdateData = {};
            if (firstName !== undefined) personUpdateData.firstName = firstName;
            if (lastName !== undefined) personUpdateData.lastName = lastName;
            if (language !== undefined) personUpdateData.language = language;
            if (timezone !== undefined) personUpdateData.timezone = timezone;
            personUpdateData.updatedBy = req.person.id;

            const person = await prisma.person.update({
                where: { id: req.person.id },
                data: personUpdateData,
                include: {
                    tenantProfiles: {
                        where: { deletedAt: null, isActive: true },
                        select: { id: true, email: true, phone: true, isPrimary: true, tenantId: true }
                    }
                }
            });

            // P48: Aggiorna phone in PersonTenantProfile
            let updatedPhone = null;
            if (phone !== undefined) {
                const primaryProfile = person.tenantProfiles?.find(p => p.isPrimary) || person.tenantProfiles?.[0];
                if (primaryProfile) {
                    await prisma.personTenantProfile.update({
                        where: { id: primaryProfile.id },
                        data: { phone }
                    });
                    updatedPhone = phone;
                }
            } else {
                const primaryProfile = person.tenantProfiles?.find(p => p.isPrimary) || person.tenantProfiles?.[0] || {};
                updatedPhone = primaryProfile.phone || null;
            }

            // P48: Flatten da tenantProfiles
            const primaryProfile = person.tenantProfiles?.find(p => p.isPrimary) || person.tenantProfiles?.[0] || {};

            res.json({
                success: true,
                user: {
                    id: person.id,
                    email: primaryProfile.email || null,
                    firstName: person.firstName,
                    lastName: person.lastName,
                    phone: phone !== undefined ? phone : (primaryProfile.phone || null),
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
                error: 'Impossibile aggiornare il profilo',
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
            const person = await prisma.person.findFirst({ // F232: findFirst+deletedAt
                where: { id: req.person.id, deletedAt: null }
            });

            // Verify current password
            const isValidPassword = await PasswordService.verifyPassword(currentPassword, person.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    error: 'Password corrente non corretta',
                    code: 'AUTH_INVALID_CURRENT_PASSWORD'
                });
            }

            // Validate new password strength
            const passwordValidation = PasswordService.validatePasswordStrength(newPassword);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    error: 'La nuova password non soddisfa i requisiti',
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
                    password: newPasswordHash,
                    mustChangePassword: false
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
                message: 'Password cambiata con successo'
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
                error: 'Impossibile cambiare la password',
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
                    deletedAt: null, // F255: exclude soft-deleted sessions
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
                error: 'Impossibile recuperare le sessioni',
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
                message: 'Sessione revocata con successo'
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
                error: 'Impossibile revocare la sessione',
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
router.get('/verify', authenticate, async (req, res) => {
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
                companyTenantProfileId: req.person.companyTenantProfileId,
                companyId: req.person.companyTenantProfileId, // backward compatibility alias
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
            error: 'Verifica token fallita',
            code: 'TOKEN_VERIFICATION_FAILED'
        });
    }
});

export default router;