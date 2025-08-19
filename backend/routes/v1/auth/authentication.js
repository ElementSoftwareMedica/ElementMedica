/**
 * Authentication Routes - Core Authentication
 * Handles login, register, logout, and token refresh
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../../auth/middleware.js';
import authService from '../../../services/authService.js';
import logger from '../../../utils/logger.js';
import prisma from '../../../config/prisma-optimization.js';

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 attempts per window (increased for better user experience)
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful logins
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour
  message: {
    error: 'Too many registration attempts',
    message: 'Please try again later'
  }
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
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
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
        logger.warn('Login attempt failed', { identifier, error: credentialsResult.error });
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Identifier or password is incorrect'
        });
      }

      const person = credentialsResult.person;

      // Generate tokens using AuthService
      const tokens = authService.generateTokens(person, remember_me);

      // Store refresh token
      const expiresAt = new Date(Date.now() + (remember_me ? 30 : 7) * 24 * 60 * 60 * 1000);
      await authService.saveRefreshToken(
        tokens.refreshToken,
        person.id,
        expiresAt,
        req.get('User-Agent'),
        req.ip,
        person.tenantId
      );

      // Clean up existing sessions for this person to avoid conflicts
      await prisma.personSession.deleteMany({
        where: {
          personId: person.id,
          isActive: true
        }
      });

      // Create new session
      // Calculate session expiration based on token expiry (1h default, 7d if remember_me)
      const sessionExpiresAt = new Date(Date.now() + (remember_me ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
      
      await prisma.personSession.create({
        data: {
          personId: person.id,
          sessionToken: tokens.accessToken,
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

      logger.info('Login successful', {
        personId: person.id,
        email: person.email,
        tenantId: person.tenantId
      });

      // Get user roles for the response
      const userRoles = authService.getPersonRoles(person);
      
      // Determine primary role for frontend compatibility
      let primaryRole = 'User';
      if (userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN')) {
        primaryRole = 'Admin';
      } else if (userRoles.includes('COMPANY_ADMIN')) {
        primaryRole = 'Administrator';
      } else if (userRoles.includes('MANAGER')) {
        primaryRole = 'Manager';
      } else if (userRoles.includes('EMPLOYEE')) {
        primaryRole = 'Employee';
      }

      res.json({
        success: true,
        user: {
          id: person.id,
          email: person.email,
          firstName: person.firstName,
          lastName: person.lastName,
          globalRole: person.globalRole,
          role: primaryRole, // Add mapped role for frontend
          roles: userRoles, // Add roles array
          status: person.status,
          companyId: person.companyId,
          tenantId: person.tenantId,
          company: person.company ? {
            id: person.company.id,
            name: person.company.name
          } : null
        },
        tokens: {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_in: tokens.expiresIn,
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

      // Generate tokens for immediate login
      const tokenPayload = {
        personId: person.id,
        email: person.email,
        companyId: person.companyId,
        roles: ['person'],
        permissions: []
      };

      const accessToken = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { personId: person.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          personId: person.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: req.get('User-Agent') || 'Unknown',
          ipAddress: req.ip
        }
      });

      res.status(201).json({
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
          expires_in: 60 * 60, // 1 hour in seconds
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

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Check if refresh token exists and is not revoked
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        personId: decoded.personId,
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        person: {
          include: {
            company: true
          }
        }
      }
    });

    if (!storedToken) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired'
      });
    }

    const person = storedToken.person;

    // Generate new access token
    const tokenPayload = {
      personId: person.id,
      email: person.email,
      companyId: person.companyId,
      roles: [person.role],
      permissions: []
    };

    const accessToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      access_token: accessToken,
      expires_in: 60 * 60, // 1 hour in seconds
      token_type: 'Bearer'
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
    const refreshToken = req.headers['x-refresh-token'] || req.body.refresh_token;
    
    if (refreshToken) {
      // Revoke specific refresh token
      await prisma.refreshToken.updateMany({
        where: {
          token: refreshToken,
          personId: req.person.id
        },
        data: {
          revokedAt: new Date()
        }
      });
    } else {
      // Revoke all refresh tokens for person
      await prisma.refreshToken.updateMany({
        where: {
          personId: req.person.id,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    }

    // Disattiva tutte le sessioni attive per aggiornare lo stato online
    await prisma.personSession.updateMany({
      where: {
        personId: req.person.id,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    logger.info('Person logged out successfully', {
      personId: req.person.id,
      email: req.person.email
    });

    res.json({
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