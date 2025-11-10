/**
 * Advanced Authentication Routes
 * Enhanced authentication endpoints with JWT refresh, session management, and GDPR compliance
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import prisma from '../config/prisma-optimization.js';
import { JWTService } from '../auth/jwt.js';
import { GDPRService } from '../services/gdpr-service.js';
import {
    authenticateAdvanced,
    authRateLimit,
    trackFailedLogin,
    checkAccountLock,
    deviceFingerprint,
    limitConcurrentSessions
} from '../middleware/auth-advanced.js';
import logger from '../utils/logger.js';


const router = express.Router();
// Prisma client importato dalla configurazione ottimizzata

/**
 * Enhanced Login with refresh tokens and session management
 */
router.post('/login',
    authRateLimit,
    deviceFingerprint,
    checkAccountLock,
    trackFailedLogin,
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 1 }),
        body('rememberMe').optional().isBoolean(),
        body('deviceName').optional().isString().trim()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            
            const { email, password, rememberMe = false, deviceName } = req.body;
            
            // Find person with roles
            const person = await prisma.person.findUnique({
                where: { email },
                include: {
                    personRoles: {
                        where: {}
                    }
                }
            });
            
            if (!person || person.status !== 'ACTIVE') {
                return res.status(401).json({
                    error: 'Invalid credentials',
                    code: 'AUTH_INVALID_CREDENTIALS'
                });
            }
            
            // Check if account is locked
            if (person.lockedUntil && person.lockedUntil > new Date()) {
                const remainingTime = Math.ceil((person.lockedUntil - new Date()) / (1000 * 60));
                return res.status(423).json({
                    error: 'Account temporarily locked',
                    code: 'AUTH_ACCOUNT_LOCKED',
                    remainingTime
                });
            }
            
            // Verify password
            const isValidPassword = await bcrypt.compare(password, person.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    error: 'Invalid credentials',
                    code: 'AUTH_INVALID_CREDENTIALS'
                });
            }
            
            // Check concurrent session limits
            const maxSessions = parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 3;
            // Cleanup session scadute per questa persona
            await prisma.personSession.updateMany({
                where: {
                    personId: person.id,
                    isActive: true,
                    expiresAt: { lt: new Date() }
                },
                data: { isActive: false }
            });
            
            const activeSessions = await prisma.personSession.count({
                where: {
                    personId: person.id,
                    isActive: true,
                    expiresAt: {
                        gt: new Date()
                    }
                }
            });
            
            if (activeSessions >= maxSessions) {
                // Deactivate oldest session
                const oldestSession = await prisma.personSession.findFirst({
                    where: {
                        personId: person.id,
                        isActive: true,
                        expiresAt: {
                            gt: new Date()
                        }
                    },
                    orderBy: {
                        lastActivityAt: 'asc'
                    }
                });
                
                if (oldestSession) {
                    await prisma.personSession.update({
                        where: { id: oldestSession.id },
                        data: { isActive: false }
                    });
                }
            }
            
            // Create new session
            const sessionTimeout = rememberMe 
                ? parseInt(process.env.EXTENDED_SESSION_TIMEOUT_HOURS) || 720 // 30 days
                : parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 60; // 1 hour
            
            const session = await prisma.personSession.create({
                data: {
                    personId: person.id,
                    deviceFingerprint: req.deviceFingerprint,
                    deviceName: deviceName || 'Unknown Device',
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    expiresAt: new Date(Date.now() + sessionTimeout * 60 * 1000),
                    lastActivityAt: new Date(),
                    isActive: true
                }
            });
            
            // Genera e salva i token in modo centralizzato tramite JWTService
            const { accessToken, refreshToken, expiresIn, tokenType } = await JWTService.generateTokenPair(
                person,
                { userAgent: req.get('User-Agent'), ip: req.ip },
                { rememberMe, extraClaims: { sessionId: session.id } }
            );

            // Update person login info
            await prisma.person.update({
                where: { id: person.id },
                data: {
                    lastLogin: new Date(),
                    failedLoginAttempts: 0,
                    lockedUntil: null
                }
            });
            
            // Record GDPR consent for authentication
            await GDPRService.recordConsent(
                person.id,
                'authentication',
                'User authentication and session management',
                'legitimate_interest'
            );
            
            // Log successful login
            await GDPRService.logGDPRActivity({
                personId: person.id,
                action: 'USER_LOGIN',
                dataType: 'authentication',
                purpose: 'User authentication',
                legalBasis: 'legitimate_interest',
                details: {
                    sessionId: session.id,
                    deviceFingerprint: req.deviceFingerprint,
                    rememberMe
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            logger.info('Person logged in successfully', {
                component: 'auth-advanced',
                action: 'login',
                personId: person.id,
                email: person.email,
                sessionId: session.id,
                ip: req.ip,
                rememberMe
            });
            
            res.json({
                message: 'Login successful',
                person: {
                    id: person.id,
                    email: person.email,
                    firstName: person.firstName,
                    lastName: person.lastName,
                    companyId: person.companyId,
                    roles: person.personRoles.map(pr => pr.roleType)
                },
                tokens: {
                    accessToken,
                    refreshToken,
                    expiresIn,
                    tokenType
                },
                session: {
                    id: session.id,
                    expiresAt: session.expiresAt
                }
            });
            
        } catch (error) {
            logger.error('Login failed', {
                component: 'auth-advanced',
                action: 'login',
                error: error.message,
                email: req.body?.email,
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
 * Refresh Access Token
 */
router.post('/refresh',
    async (req, res) => {
        try {
            const headerToken = req.headers['x-refresh-token'];
            const bodyToken = req.body?.refresh_token || req.body?.refreshToken;
            const refreshToken = headerToken || bodyToken;

            if (!refreshToken) {
                return res.status(401).json({
                    error: 'Refresh token required',
                    message: 'No refresh token provided'
                });
            }
            
            // Refresh access token (non ruota il refresh token)
            const { accessToken, expiresIn, tokenType } = await JWTService.refreshAccessToken(refreshToken);

            // Decodifica per logging (personId/sessionId)
            let decoded = null;
            try { decoded = JWTService.verifyRefreshToken(refreshToken); } catch (_) {}
            
            // Log token refresh (GDPR)
            await GDPRService.logGDPRActivity({
                personId: decoded?.personId || null,
                action: 'TOKEN_REFRESHED',
                dataType: 'authentication',
                purpose: 'Token refresh for continued access',
                legalBasis: 'legitimate_interest',
                details: {
                    sessionId: decoded?.sessionId || null
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            logger.info('Tokens refreshed successfully', {
                component: 'auth-advanced',
                action: 'refresh',
                personId: decoded?.personId || null,
                sessionId: decoded?.sessionId || null,
                ip: req.ip
            });

            // Converte expiresIn in secondi se necessario
            let expiresInSeconds = 3600;
            if (typeof expiresIn === 'string') {
                const match = expiresIn.match(/^(\d+)([smhd])$/);
                if (match) {
                    const val = parseInt(match[1], 10);
                    const unit = match[2];
                    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
                    expiresInSeconds = val * (multipliers[unit] || 3600);
                }
            } else if (typeof expiresIn === 'number') {
                expiresInSeconds = expiresIn;
            }
            
            return res.json({
                access_token: accessToken,
                expires_in: expiresInSeconds,
                token_type: tokenType || 'Bearer'
            });
            
        } catch (error) {
            logger.error('Token refresh failed', {
                component: 'auth-advanced',
                action: 'refresh',
                error: error.message,
                ip: req.ip
            });
            
            return res.status(401).json({
                error: 'Invalid refresh token',
                message: 'Unable to refresh token'
            });
        }
    }
);

/**
 * Enhanced Logout with session cleanup
 */
router.post('/logout',
    authenticateAdvanced,
    async (req, res) => {
        try {
            const { sessionId, personId } = req.person;
            const headerToken = req.headers['x-refresh-token'];
            const bodyToken = req.body?.refresh_token || req.body?.refreshToken;
            const refreshToken = headerToken || bodyToken;
            
            // Revoca refresh token specifico se fornito, altrimenti tutte le sessioni dell'utente
            if (refreshToken) {
                await JWTService.revokeSession(refreshToken);
            } else {
                await JWTService.revokeAllPersonSessions(personId);
            }

            // Disattiva la sessione corrente se presente
            if (sessionId) {
                await prisma.personSession.update({
                    where: { id: sessionId },
                    data: { isActive: false }
                });
            }
            
            // Log logout
            await GDPRService.logGDPRActivity({
                personId: personId,
                action: 'USER_LOGOUT',
                dataType: 'authentication',
                purpose: 'User logout and session cleanup',
                legalBasis: 'legitimate_interest',
                details: {
                    sessionId
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            logger.info('User logged out successfully', {
                component: 'auth-advanced',
                action: 'logout',
                personId,
                sessionId,
                ip: req.ip
            });
            
            return res.json({
                success: true,
                message: 'Logged out successfully'
            });
            
        } catch (error) {
            logger.error('Logout failed', {
                component: 'auth-advanced',
                action: 'logout',
                error: error.message,
                personId: req.person?.personId,
                ip: req.ip
            });
            
            return res.status(500).json({
                error: 'Logout failed',
                code: 'AUTH_LOGOUT_FAILED'
            });
        }
    }
);

/**
 * Logout from all devices
 */
router.post('/logout-all',
    authenticateAdvanced,
    async (req, res) => {
        try {
            const { personId } = req.person;
            
            // Revoca tutti i refresh token dell'utente
            await JWTService.revokeAllPersonSessions(personId);

            // Disattiva tutte le personSession
            await prisma.personSession.updateMany({
                where: { personId, isActive: true },
                data: { isActive: false }
            });
            
            // Log logout from all devices
            await GDPRService.logGDPRActivity({
                personId: personId,
                action: 'USER_LOGOUT_ALL',
                dataType: 'authentication',
                purpose: 'User logout from all devices',
                legalBasis: 'legitimate_interest',
                details: {
                    allSessions: true
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            logger.info('User logged out from all devices', {
                component: 'auth-advanced',
                action: 'logout-all',
                personId,
                ip: req.ip
            });
            
            return res.json({
                success: true,
                message: 'Logged out from all devices successfully'
            });
            
        } catch (error) {
            logger.error('Logout from all devices failed', {
                component: 'auth-advanced',
                action: 'logout-all',
                error: error.message,
                personId: req.person?.personId,
                ip: req.ip
            });
            
            return res.status(500).json({
                error: 'Logout from all devices failed',
                code: 'AUTH_LOGOUT_ALL_FAILED'
            });
        }
    }
);

/**
 * Revoke specific session
 */
router.delete('/sessions/:sessionId',
    authenticateAdvanced,
    async (req, res) => {
        try {
            const { personId } = req.person;
            const { sessionId } = req.params;
            
            // Verify session belongs to user
            const session = await prisma.personSession.findFirst({
                where: {
                    id: sessionId,
                    personId: personId
                }
            });
            
            if (!session) {
                return res.status(404).json({
                    error: 'Session not found',
                    code: 'AUTH_SESSION_NOT_FOUND'
                });
            }
            
            // Revoke session (disattiva personSession)
            await prisma.personSession.update({
                where: { id: sessionId },
                data: { isActive: false }
            });

            // Revoca i refresh token associati alla stessa sessionId (se presenti nel payload)
            const activeTokens = await prisma.refreshToken.findMany({
                where: {
                    personId,
                    revokedAt: null,
                    expiresAt: { gt: new Date() }
                },
                select: { token: true }
            });

            for (const t of activeTokens) {
                try {
                    const dec = JWTService.verifyRefreshToken(t.token);
                    if (dec?.sessionId === sessionId) {
                        await JWTService.revokeSession(t.token);
                    }
                } catch (_) { /* ignore invalid tokens */ }
            }
            
            // Log session revocation
            await GDPRService.logGDPRActivity({
                personId: personId,
                action: 'SESSION_REVOKED',
                dataType: 'authentication',
                purpose: 'Manual session revocation',
                legalBasis: 'legitimate_interest',
                details: {
                    revokedSessionId: sessionId
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            logger.info('Session revoked successfully', {
                component: 'auth-advanced',
                action: 'revokeSession',
                personId,
                revokedSessionId: sessionId,
                ip: req.ip
            });
            
            res.json({
                message: 'Session revoked successfully'
            });
            
        } catch (error) {
            logger.error('Failed to revoke session', {
                component: 'auth-advanced',
                action: 'revokeSession',
                error: error.message,
                personId: req.person?.personId,
                ip: req.ip
            });
            
            res.status(500).json({
                error: 'Failed to revoke session',
                code: 'AUTH_REVOKE_SESSION_FAILED'
            });
        }
    }
);

export default router;