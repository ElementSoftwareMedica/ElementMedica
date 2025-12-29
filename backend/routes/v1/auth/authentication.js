/**
 * Authentication Routes - Core Authentication
 * Handles login, register, logout, and token refresh
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../../auth/middleware.js';
import authService from '../../../services/authService.js';
import { activityService, ActivityType } from '../../../services/activity/index.js';
import logger from '../../../utils/logger.js';
import prisma from '../../../config/prisma-optimization.js';
import { JWTService } from '../../../auth/jwt.js';

const router = express.Router();

/**
 * Get clean IP address from request (handles proxy headers)
 */
const getClientIp = (req) => {
  // Check X-Forwarded-For header first (set by nginx proxy)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // Get first IP from comma-separated list
    const ip = forwarded.split(',')[0].trim();
    // Clean any escape characters
    return ip.replace(/\\/g, '');
  }
  // Check X-Real-IP header
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp.replace(/\\/g, '');
  }
  // Fallback to req.ip with cleaning
  return (req.ip || '127.0.0.1').replace(/\\/g, '').replace('::ffff:', '');
};

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased from 5 to 50 (reasonable for production behind proxy)
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again in 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: getClientIp, // Use custom IP getter to handle proxy
  validate: { ip: false } // Disable IP validation to prevent errors with proxy
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Increased from 3 to 10 registrations per hour
  message: {
    error: 'Too many registration attempts',
    message: 'Please try again later'
  },
  keyGenerator: getClientIp, // Use custom IP getter to handle proxy
  validate: { ip: false } // Disable IP validation to prevent errors with proxy
});

// Handle all other HTTP methods for /login endpoint with 405 Method Not Allowed
const methodNotAllowedHandler = (req, res) => {
  res.status(405).json({
    error: 'Method Not Allowed',
    message: `Method ${req.method} is not allowed for this endpoint. Only POST is supported.`,
    allowedMethods: ['POST']
  });
};

router.get('/login', methodNotAllowedHandler);
router.put('/login', methodNotAllowedHandler);
router.patch('/login', methodNotAllowedHandler);
router.delete('/login', methodNotAllowedHandler);
router.head('/login', methodNotAllowedHandler);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and return JWT tokens
 *     tags: [Authentication]
 */
router.post('/login',
  authLimiter,
  [
    body('identifier')
      .notEmpty()
      .withMessage('Email, username, or tax code is required')
      .custom((value) => {
        // Verifica che sia email, username o codice fiscale
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const taxCodeRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;

        if (emailRegex.test(value) || taxCodeRegex.test(value) || value.length >= 3) {
          return true;
        }
        throw new Error('Must be a valid email, tax code, or username');
      }),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  async (req, res) => {
    try {
      // DEBUG: Log incoming login request
      logger.info('🔐 [LOGIN REQUEST] Incoming login attempt', {
        hasBody: !!req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        identifier: req.body?.identifier ? `${req.body.identifier.substring(0, 3)}***` : 'missing',
        hasPassword: !!req.body?.password,
        headers: {
          'content-type': req.headers['content-type'],
          'x-frontend-id': req.headers['x-frontend-id'],
          'x-tenant-id': req.headers['x-tenant-id'],
          'origin': req.headers['origin'],
          'referer': req.headers['referer'],
          'authorization': req.headers['authorization'] ? 'Bearer ***' : 'none'
        },
        ip: getClientIp(req)
      });

      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('🔐 [LOGIN VALIDATION FAILED]', {
          errors: errors.array(),
          bodyKeys: req.body ? Object.keys(req.body) : [],
          hasIdentifier: !!req.body?.identifier,
          hasPassword: !!req.body?.password
        });
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Invalid input data',
          details: errors.array()
        });
      }

      const { identifier, password, remember_me = false } = req.body;

      // Verify credentials using AuthService
      const credentialsResult = await authService.verifyCredentials(identifier, password);

      if (!credentialsResult.success) {
        logger.warn('🔐 [LOGIN CREDENTIALS FAILED]', { identifier, error: credentialsResult.error });

        // Log login failure (nota: non abbiamo personId, usiamo log generico per security)
        // Il logging dettagliato avviene già nel logger sopra per motivi di sicurezza
        // Non logghiamo in ActivityLog senza personId per rispettare la struttura dati

        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Identifier or password is incorrect'
        });
      }

      const person = credentialsResult.person;

      // Genera e salva token usando il servizio centralizzato (gestisce anche il DB)
      const { accessToken, refreshToken, expiresIn } = await JWTService.generateTokenPair(
        person,
        { userAgent: req.get('User-Agent'), ip: req.ip },
        { rememberMe: !!remember_me }
      );

      // Clean up existing sessions for this person to avoid conflicts
      await prisma.personSession.deleteMany({
        where: {
          personId: person.id,
          isActive: true
        }
      });

      // Create new session (using hash instead of full token to avoid index size limit)
      const crypto = await import('crypto');
      const sessionTokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
      const sessionExpiresAt = new Date(Date.now() + (remember_me ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
      await prisma.personSession.create({
        data: {
          personId: person.id,
          sessionToken: sessionTokenHash,  // Store hash instead of full JWT
          isActive: true,
          lastActivityAt: new Date(),
          expiresAt: sessionExpiresAt,
          userAgent: req.get('User-Agent') || 'Unknown',
          ipAddress: req.ip,
          tenantId: person.tenantId
        }
      });

      // Update last login
      await prisma.person.update({
        where: { id: person.id },
        data: { lastLogin: new Date() }
      });

      // Check if user has access to brandTenantId (cross-tenant login)
      const brandTenantId = req.brandTenantId;
      let tenantAccess = null;
      let effectiveRoleType = null;

      if (brandTenantId && brandTenantId !== person.tenantId) {
        // User is logging into a different tenant - check PersonTenantAccess
        tenantAccess = await prisma.personTenantAccess.findFirst({
          where: {
            personId: person.id,
            tenantId: brandTenantId,
            isActive: true,
            deletedAt: null
          }
        });

        if (tenantAccess) {
          effectiveRoleType = tenantAccess.defaultRoleType;
          logger.info('Cross-tenant login via PersonTenantAccess', {
            personId: person.id,
            primaryTenantId: person.tenantId,
            brandTenantId,
            roleType: effectiveRoleType,
            accessLevel: tenantAccess.accessLevel
          });
        } else {
          logger.warn('Cross-tenant login attempt without PersonTenantAccess', {
            personId: person.id,
            brandTenantId
          });
        }
      }

      logger.info('Login successful', {
        personId: person.id,
        email: person.email,
        tenantId: person.tenantId,
        brandTenantId: brandTenantId || null,
        effectiveRoleType
      });

      const userRoles = authService.getPersonRoles(person);
      // Add effective role from tenant access if available
      if (effectiveRoleType && !userRoles.includes(effectiveRoleType)) {
        userRoles.push(effectiveRoleType);
      }

      let primaryRole = 'User';
      if (userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN')) primaryRole = 'Admin';
      else if (userRoles.includes('COMPANY_ADMIN')) primaryRole = 'Administrator';
      else if (userRoles.includes('MANAGER')) primaryRole = 'Manager';
      else if (userRoles.includes('EMPLOYEE')) primaryRole = 'Employee';

      // Estrai permessi dai PersonRoles
      const permissions = (person.personRoles || [])
        .flatMap(pr => pr.permissions || [])
        .filter(rp => rp.isGranted)
        .map(rp => rp.permission);

      // Calcola expires_in (in secondi) coerente con remember_me e con eventuali stringhe tipo '7d'
      const expiresInSeconds = (() => {
        if (typeof expiresIn === 'number') return expiresIn;
        const s = String(expiresIn).trim();
        const m = s.match(/^(\d+)\s*([smhd])$/i);
        if (m) {
          const value = parseInt(m[1], 10);
          const unit = m[2].toLowerCase();
          const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : unit === 'd' ? 86400 : 1;
          return value * mult;
        }
        // Fallback coerente con la policy v1: 1h default, 7d se remember_me
        return remember_me ? 7 * 24 * 60 * 60 : 60 * 60;
      })();

      // Imposta cookie HttpOnly per compatibilità con authenticateTest
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: expiresInSeconds * 1000,
        path: '/'
      });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: (remember_me ? 30 : 7) * 24 * 60 * 60 * 1000,
        path: '/'
      });

      // Log login success (GDPR compliant activity logging)
      await activityService.logImmediate({
        personId: person.id,
        action: ActivityType.AUTH_LOGIN_SUCCESS,
        tenantId: person.tenantId,
        ipAddress: getClientIp(req),
        userAgent: req.get('User-Agent'),
        metadata: {
          loginMethod: remember_me ? 'remember_me' : 'standard',
          crossTenant: !!tenantAccess,
          brandTenantId: brandTenantId || null
        },
        success: true
      });

      res.json({
        success: true,
        user: {
          id: person.id,
          email: person.email,
          firstName: person.firstName,
          lastName: person.lastName,
          globalRole: person.globalRole,
          role: primaryRole,
          roleType: effectiveRoleType || (userRoles[0] || null),
          roles: userRoles,
          permissions: permissions,
          status: person.status,
          companyId: person.companyId,
          tenantId: person.tenantId,
          company: person.company ? { id: person.company.id, name: person.company.name } : null,
          tenantAccess: tenantAccess ? {
            tenantId: tenantAccess.tenantId,
            accessLevel: tenantAccess.accessLevel,
            roleType: tenantAccess.defaultRoleType,
            enabledFeatures: tenantAccess.enabledFeatures
          } : null
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresInSeconds,
          token_type: 'Bearer'
        }
      });
    } catch (error) {
      logger.error('Login error', {
        error: error.message,
        stack: error.stack,
        identifier: req.body.identifier
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred during login'
      });
    }
  }
);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Person registration
 *     description: Register a new person account
 *     tags: [Authentication]
 */
router.post('/register',
  registerLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
    body('firstName')
      .isLength({ min: 2 })
      .trim()
      .withMessage('First name must be at least 2 characters'),
    body('lastName')
      .isLength({ min: 2 })
      .trim()
      .withMessage('Last name must be at least 2 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Invalid input data',
          details: errors.array()
        });
      }

      const { email, password, firstName, lastName, companyId } = req.body;

      // Check if person exists
      const existingPerson = await prisma.person.findUnique({
        where: { email }
      });

      if (existingPerson) {
        return res.status(409).json({
          error: 'Email already exists',
          message: 'An account with this email already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create person
      const person = await prisma.person.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          companyId: companyId || null,
          status: 'ACTIVE'
        },
        include: {
          company: true
        }
      });

      // Assign default person role
      await prisma.personRole.create({
        data: {
          personId: person.id,
          roleType: 'EMPLOYEE', // Default role type
          companyId: person.companyId,
          permissions: ['VIEW_EMPLOYEES', 'EDIT_EMPLOYEES'] // Basic permissions
        }
      });

      logger.info('Person registered successfully', {
        personId: person.id,
        email: person.email
      });

      // Genera e salva i token in modo centralizzato tramite JWTService
      const { accessToken, refreshToken, expiresIn, tokenType } = await JWTService.generateTokenPair(
        person,
        { userAgent: req.get('User-Agent') || 'Unknown', ip: req.ip || '0.0.0.0' },
        { rememberMe: false }
      );

      return res.status(201).json({
        success: true,
        user: {
          id: person.id,
          email: person.email,
          firstName: person.firstName,
          lastName: person.lastName,
          status: person.status,
          companyId: person.companyId,
          company: person.company ? {
            id: person.company.id,
            name: person.company.name
          } : null
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn,
          token_type: 'Bearer'
        }
      });
    } catch (error) {
      logger.error('Registration error', {
        error: error.message,
        stack: error.stack,
        email: req.body.email
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred during registration'
      });
    }
  }
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Generate new access token using refresh token
 *     tags: [Authentication]
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.headers['x-refresh-token'] || req.body.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        message: 'No refresh token provided'
      });
    }

    // Centralizza su JWTService: verifica refresh token, controlla DB e genera nuovo access token
    const { accessToken, expiresIn, tokenType } = await JWTService.refreshAccessToken(refreshToken);

    // Converti expiresIn (stringa tipo '15m', '1h', '7d') in secondi per compatibilità di risposta
    let expiresInSeconds = 60 * 60; // default fallback 1h
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

    // Aggiorna cookie accessToken per compatibilità con authenticateTest
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: expiresInSeconds * 1000,
      path: '/'
    });

    res.json({
      access_token: accessToken,
      expires_in: expiresInSeconds,
      token_type: tokenType || 'Bearer'
    });
  } catch (error) {
    logger.error('Token refresh error', {
      error: error.message,
      stack: error.stack
    });

    res.status(401).json({
      error: 'Invalid refresh token',
      message: 'Unable to refresh token'
    });
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Person logout
 *     description: Revoke refresh token and logout person
 *     tags: [Authentication]
 */
router.post('/logout', authenticate(), async (req, res) => {
  try {
    // Estrai refresh token da header o body per il logout
    const refreshToken = req.headers['x-refresh-token'] || req.body.refresh_token || req.body?.refreshToken;
    // Se viene fornito un refresh token, revoca quella sessione; altrimenti revoca tutte le sessioni della persona
    if (refreshToken) {
      await JWTService.revokeSession(refreshToken);
    } else {
      const personId = req.person?.id || req.person?.personId;
      if (personId) {
        await JWTService.revokeAllPersonSessions(personId);
      }
    }

    // Log logout (GDPR compliant activity logging)
    if (req.person?.id && req.person?.tenantId) {
      activityService.log({
        personId: req.person.id,
        action: ActivityType.AUTH_LOGOUT,
        tenantId: req.person.tenantId,
        ipAddress: getClientIp(req),
        userAgent: req.get('User-Agent'),
        success: true
      });
    }

    // Pulisci cookie
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error', {
      error: error.message,
      stack: error.stack,
      personId: req.person?.id
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during logout'
    });
  }
});

export default router;