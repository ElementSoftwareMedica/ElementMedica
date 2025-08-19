/**
 * Authentication Routes v1
 * Versioned authentication endpoints
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../auth/middleware.js';
import { authenticateAdvanced } from '../../middleware/auth-advanced.js';
import { authenticateDebug } from '../../auth/middleware-debug.js';
// import { serviceCircuitBreaker } from '../../middleware/circuit-breaker.js';
import authService from '../../services/authService.js';
import logger from '../../utils/logger.js';
import { requirePermissions } from '../../middleware/rbac.js';

const router = express.Router();
import prisma from '../../config/prisma-optimization.js';

// CORS configuration for auth routes
router.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Platform', 'X-Device-ID', 'cache-control', 'pragma', 'expires', 'x-tenant-id', 'X-Tenant-ID', 'X-Requested-With']
}));

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
// router.options('/login', methodNotAllowedHandler); // Commented out to allow CORS preflight

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and return JWT tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email, username, or tax code
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "Admin123!"
 *               remember_me:
 *                 type: boolean
 *                 default: false
 *                 description: Extended session duration
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
      // DEBUG: Log req.body status
      console.log('🔍 [LOGIN HANDLER] Request body debug:', {
        bodyExists: !!req.body,
        bodyType: typeof req.body,
        bodyKeys: req.body ? Object.keys(req.body) : 'N/A',
        bodyContent: req.body,
        contentType: req.get('Content-Type'),
        method: req.method,
        url: req.url
      });
      
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 [LOGIN HANDLER] Validation errors:', errors.array());
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
          tenantId: person.tenantId
        }
      });

      // Create active session for online status tracking
      const sessionExpiresAt = new Date(Date.now() + (remember_me ? 7 : 1) * 24 * 60 * 60 * 1000);
      await prisma.personSession.create({
        data: {
          tenantId: person.tenantId,
          personId: person.id,
          sessionToken: tokens.accessToken.substring(0, 50), // Use part of access token as session identifier
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          isActive: true,
          lastActivityAt: new Date(),
          expiresAt: sessionExpiresAt
        }
      });

      // Update last login
      await authService.updateLastLogin(person.id);

      logger.info('Person logged in successfully', {
        personId: person.id,
        email: person.email,
        identifier: identifier,
        companyId: person.companyId
      });

      // Extract roles for mapping
      const personRoles = authService.getPersonRoles(person);
      
      // Map roles to single role for frontend compatibility
      let mappedRole = 'Person';
      if (personRoles.includes('SUPER_ADMIN') || personRoles.includes('ADMIN')) {
        mappedRole = 'Admin';
      } else if (personRoles.includes('COMPANY_ADMIN')) {
        mappedRole = 'Administrator';
      }

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          user: {
            id: person.id,
            personId: person.id,
            email: person.email,
            username: person.username,
            taxCode: person.taxCode,
            firstName: person.firstName,
            lastName: person.lastName,
            companyId: person.companyId,
            tenantId: person.tenantId,
            roles: personRoles,
            role: mappedRole,
            company: person.company ? {
              id: person.company.id,
              name: person.company.name,
              type: person.company.type
            } : null,
            tenant: person.tenant ? {
              id: person.tenant.id,
              name: person.tenant.name
            } : null
          }
        }
      });
    } catch (error) {
      console.error('❌ LOGIN ERROR DETAILS:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      });
      
      logger.error('Login error', {
        error: error.message,
        stack: error.stack,
        email: req.body.email
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *               companyId:
 *                 type: integer
 *                 description: Optional company association
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email already exists
 *       429:
 *         description: Too many registration attempts
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
  async (req, res, next) => {
    // const circuitBreakerHandler = serviceCircuitBreaker('auth-register', async (req, res) => {
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
    // });
    
    // try {
    //   await circuitBreakerHandler(req, res);
    // } catch (error) {
    //   next(error);
    // }
  }
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Get a new access token using refresh token
 *     tags: [Authentication]
 *     security:
 *       - refreshToken: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                 expires_in:
 *                   type: integer
 *                 token_type:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.headers['x-refresh-token'] || req.body.refresh_token;
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        message: 'Please provide a refresh token'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Check if refresh token exists and is valid
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        personId: decoded.personId,
        expiresAt: {
          gt: new Date()
        },
        revokedAt: null
      },
      include: {
        person: {
          include: {
            personRoles: {
              include: {
                permissions: {
                  where: {
                    isGranted: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!storedToken || storedToken.person.status !== 'ACTIVE') {
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
      roles: person.personRoles.map(pr => pr.roleType),
      permissions: person.personRoles.flatMap(pr => 
        pr.permissions.map(p => p.permission)
      )
    };

    const accessToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    logger.info('Token refreshed successfully', {
      personId: person.id,
      email: person.email
    });

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
 *     security:
 *       - bearerAuth: []
 *       - refreshToken: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
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

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current person
 *     description: Get current authenticated person information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Person information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Person'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/me', authenticate(), async (req, res) => {
  try {
    const person = await prisma.person.findUnique({
      where: { id: req.person.id },
      include: {
        company: true,
        personRoles: {
          include: {
            permissions: {
              where: {
                isGranted: true
              }
            }
          }
        }
      }
    });

    if (!person) {
      return res.status(404).json({
        error: 'Person not found',
        message: 'Person account not found'
      });
    }

    res.json({
      id: person.id,
      email: person.email,
      firstName: person.firstName,
      lastName: person.lastName,
      role: person.role,
      companyId: person.companyId,
      isActive: person.status === 'ACTIVE',
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
      lastLogin: person.lastLogin,
      company: person.company ? {
        id: person.company.id,
        name: person.company.name
      } : null,
      roles: person.personRoles.map(pr => pr.roleType),
      permissions: person.personRoles.flatMap(pr => 
        pr.permissions.map(p => p.permission)
      )
    });
  } catch (error) {
    logger.error('Get person error', {
      error: error.message,
      stack: error.stack,
      personId: req.person?.personId
    });
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while retrieving person information'
    });
  }
});

/**
 * @swagger
 * /auth/verify:
 *   get:
 *     summary: Verify JWT token
 *     description: Verifies if the provided JWT token is valid and returns person information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/verify', (req, res, next) => {
  // Debug logging disabled to prevent JSON response interference
  next();
}, authenticate(), async (req, res) => {
  try {
    // If we reach here, the token is valid (authenticate middleware passed)
    const user = req.person;
    
    // Fetch user with permissions from database
    const person = await prisma.person.findUnique({
      where: { id: user.id },
      include: {
        company: true,
        tenant: true,
        personRoles: {
          where: {},
          include: {
            permissions: {
              where: { isGranted: true }
            }
          }
        }
      }
    });

    if (!person) {
      return res.status(404).json({
        valid: false,
        error: 'Person not found',
        message: 'Person account not found'
      });
    }

    // Extract permissions from PersonRole -> RolePermission
    const permissions = {};
    person.personRoles.forEach(personRole => {
      personRole.permissions.forEach(rolePermission => {
        // Map database permissions to frontend format
        const permission = rolePermission.permission;
        

        
        // Convert enum permissions to frontend format
        switch(permission) {
          case 'VIEW_COMPANIES':
            permissions['companies:read'] = true;
            permissions['VIEW_COMPANIES'] = true; // Keep original format for compatibility
            break;
          case 'CREATE_COMPANIES':
            permissions['companies:create'] = true;
            permissions['CREATE_COMPANIES'] = true; // Keep original format for compatibility
            break;
          case 'EDIT_COMPANIES':
            permissions['companies:edit'] = true;
            permissions['EDIT_COMPANIES'] = true; // Keep original format for compatibility
            break;
          case 'DELETE_COMPANIES':
            permissions['companies:delete'] = true;
            permissions['DELETE_COMPANIES'] = true; // Keep original format for compatibility
            break;
          case 'VIEW_EMPLOYEES':
            permissions['employees:read'] = true;
            permissions['companies:read'] = true; // Employees implies companies access
            permissions['VIEW_EMPLOYEES'] = true; // Keep original format for compatibility
            break;
          case 'CREATE_EMPLOYEES':
            permissions['employees:create'] = true;
            permissions['companies:read'] = true;
            permissions['CREATE_EMPLOYEES'] = true; // Keep original format for compatibility
            break;
          case 'EDIT_EMPLOYEES':
            permissions['employees:edit'] = true;
            permissions['companies:read'] = true;
            permissions['EDIT_EMPLOYEES'] = true; // Keep original format for compatibility
            break;
          case 'DELETE_EMPLOYEES':
            permissions['employees:delete'] = true;
            permissions['companies:read'] = true;
            permissions['DELETE_EMPLOYEES'] = true; // Keep original format for compatibility
            break;
          case 'VIEW_TRAINERS':
            permissions['trainers:read'] = true;
            permissions['read:trainers'] = true;
            permissions['VIEW_TRAINERS'] = true; // Keep original format for compatibility
            break;
          case 'CREATE_TRAINERS':
            permissions['trainers:create'] = true;
            permissions['create:trainers'] = true;
            permissions['CREATE_TRAINERS'] = true; // Keep original format for compatibility
            break;
          case 'EDIT_TRAINERS':
            permissions['trainers:edit'] = true;
            permissions['edit:trainers'] = true;
            permissions['EDIT_TRAINERS'] = true; // Keep original format for compatibility
            break;
          case 'DELETE_TRAINERS':
            permissions['trainers:delete'] = true;
            permissions['delete:trainers'] = true;
            permissions['DELETE_TRAINERS'] = true; // Keep original format for compatibility
            break;
          case 'VIEW_COURSES':
            permissions['courses:read'] = true;
            permissions['read:courses'] = true;
            permissions['VIEW_COURSES'] = true; // Keep original format for compatibility
            break;
          case 'CREATE_COURSES':
            permissions['courses:create'] = true;
            permissions['create:courses'] = true;
            permissions['CREATE_COURSES'] = true; // Keep original format for compatibility
            break;
          case 'EDIT_COURSES':
            permissions['courses:edit'] = true;
            permissions['edit:courses'] = true;
            permissions['EDIT_COURSES'] = true; // Keep original format for compatibility
            break;
          case 'DELETE_COURSES':
            permissions['courses:delete'] = true;
            permissions['delete:courses'] = true;
            permissions['DELETE_COURSES'] = true; // Keep original format for compatibility
            break;
          case 'VIEW_USERS':
            permissions['users:read'] = true;
            permissions['VIEW_USERS'] = true; // Keep original format for compatibility
            break;
          case 'CREATE_USERS':
            permissions['users:create'] = true;
            permissions['CREATE_USERS'] = true; // Keep original format for compatibility
            break;
          case 'EDIT_USERS':
            permissions['users:edit'] = true;
            permissions['EDIT_USERS'] = true; // Keep original format for compatibility
            break;
          case 'DELETE_USERS':
            permissions['users:delete'] = true;
            permissions['DELETE_USERS'] = true; // Keep original format for compatibility
            break;
          case 'VIEW_PERSONS':
            permissions['persons:read'] = true;
            permissions['persons:view'] = true;
            permissions['persons:view_employees'] = true;
            permissions['persons:view_trainers'] = true;
            permissions['VIEW_PERSONS'] = true; // Keep original format for compatibility
            break;
          case 'CREATE_PERSONS':
            permissions['persons:create'] = true;
            permissions['CREATE_PERSONS'] = true; // Keep original format for compatibility
            break;
          case 'EDIT_PERSONS':
            permissions['persons:edit'] = true;
            permissions['EDIT_PERSONS'] = true; // Keep original format for compatibility
            break;
          case 'DELETE_PERSONS':
            permissions['persons:delete'] = true;
            permissions['DELETE_PERSONS'] = true; // Keep original format for compatibility
            break;
          case 'ADMIN_PANEL':
            permissions['admin:access'] = true;
            permissions['companies:read'] = true;
            permissions['companies:manage'] = true;
            break;
          case 'SYSTEM_SETTINGS':
            permissions['system:admin'] = true;
            permissions['settings:manage'] = true;
            break;
          case 'USER_MANAGEMENT':
            permissions['users:manage'] = true;
            break;
          case 'ROLE_MANAGEMENT':
            permissions['roles:manage'] = true;
            permissions['roles:read'] = true;
            permissions['roles:create'] = true;
            permissions['roles:edit'] = true;
            permissions['roles:delete'] = true;
            permissions['ROLE_MANAGEMENT'] = true; // Keep legacy format for compatibility
            break;
          default:
            // For any other permissions, use both formats for compatibility
            const [action, resource] = permission.toLowerCase().split('_');
            if (resource) {
              permissions[`${resource}:${action}`] = true;
            }
            // Also keep the original format
            permissions[permission] = true;
            break;
        }
      });
    });

    // Determine person role with priority: SUPER_ADMIN > ADMIN > COMPANY_ADMIN > EMPLOYEE
    let personRole = 'EMPLOYEE';
    const activeRoles = person.personRoles.filter(pr => pr.isActive);
    
    if (activeRoles.some(pr => pr.roleType === 'SUPER_ADMIN')) {
      personRole = 'SUPER_ADMIN';
    } else if (activeRoles.some(pr => pr.roleType === 'ADMIN')) {
      personRole = 'ADMIN';
    } else if (activeRoles.some(pr => pr.roleType === 'COMPANY_ADMIN')) {
      personRole = 'COMPANY_ADMIN';
    } else if (activeRoles.length > 0) {
      personRole = activeRoles[0].roleType;
    }

    // Admin role gets all permissions
    const isAdmin = person.personRoles.some(pr => pr.roleType === 'ADMIN' || pr.roleType === 'SUPER_ADMIN');
    
    // Debug logging
    logger.info('🔍 [DEBUG] Admin check', {
      personRoles: person.personRoles.map(pr => ({ roleType: pr.roleType, isActive: pr.isActive })),
      isAdmin: isAdmin,
      activeRoles: activeRoles.map(pr => pr.roleType)
    });
    
    if (isAdmin) {
      logger.info('🔍 [DEBUG] Entering admin section - adding all permissions');
      
      // Companies permissions
      permissions['companies:read'] = true;
      permissions['companies:create'] = true;
      permissions['companies:edit'] = true;
      permissions['companies:delete'] = true;
      permissions['companies:manage'] = true;
      permissions['VIEW_COMPANIES'] = true; // Original format
      permissions['CREATE_COMPANIES'] = true; // Original format
      permissions['EDIT_COMPANIES'] = true; // Original format
      permissions['DELETE_COMPANIES'] = true; // Original format
      
      // Users permissions
      permissions['users:read'] = true;
      permissions['users:create'] = true;
      permissions['users:edit'] = true;
      permissions['users:delete'] = true;
      permissions['users:manage'] = true;
      permissions['VIEW_USERS'] = true; // Original format
      permissions['CREATE_USERS'] = true; // Original format
      permissions['EDIT_USERS'] = true; // Original format
      permissions['DELETE_USERS'] = true; // Original format
      
      // Employees permissions
      permissions['employees:read'] = true;
      permissions['employees:create'] = true;
      permissions['employees:edit'] = true;
      permissions['employees:delete'] = true;
      permissions['employees:manage'] = true;
      permissions['VIEW_EMPLOYEES'] = true; // Original format
      permissions['CREATE_EMPLOYEES'] = true; // Original format
      permissions['EDIT_EMPLOYEES'] = true; // Original format
      permissions['DELETE_EMPLOYEES'] = true; // Original format
      
      // Trainers permissions
      permissions['trainers:read'] = true;
      permissions['trainers:create'] = true;
      permissions['trainers:edit'] = true;
      permissions['trainers:delete'] = true;
      permissions['trainers:manage'] = true;
      permissions['read:trainers'] = true;
      permissions['create:trainers'] = true;
      permissions['edit:trainers'] = true;
      permissions['delete:trainers'] = true;
      permissions['VIEW_TRAINERS'] = true; // Original format
      permissions['CREATE_TRAINERS'] = true; // Original format
      permissions['EDIT_TRAINERS'] = true; // Original format
      permissions['DELETE_TRAINERS'] = true; // Original format
      
      // Courses permissions
      permissions['courses:read'] = true;
      permissions['courses:create'] = true;
      permissions['courses:edit'] = true;
      permissions['courses:delete'] = true;
      permissions['courses:manage'] = true;
      permissions['read:courses'] = true;
      permissions['create:courses'] = true;
      permissions['edit:courses'] = true;
      permissions['delete:courses'] = true;
      permissions['VIEW_COURSES'] = true; // Original format
      permissions['CREATE_COURSES'] = true; // Original format
      permissions['EDIT_COURSES'] = true; // Original format
      permissions['DELETE_COURSES'] = true; // Original format
      
      // Persons permissions (MISSING - CRITICAL FIX)
      permissions['persons:read'] = true;
      permissions['persons:view'] = true;
      permissions['persons:create'] = true;
      permissions['persons:edit'] = true;
      permissions['persons:delete'] = true;
      permissions['persons:manage'] = true;
      permissions['persons:view_employees'] = true;
      permissions['persons:view_trainers'] = true;
      permissions['VIEW_PERSONS'] = true; // Original format
      permissions['CREATE_PERSONS'] = true; // Original format
      permissions['EDIT_PERSONS'] = true; // Original format
      permissions['DELETE_PERSONS'] = true; // Original format
      
      logger.info('🔍 [DEBUG] Added persons permissions in admin section', {
        'persons:read': permissions['persons:read'],
        'persons:manage': permissions['persons:manage'],
        'persons:view_employees': permissions['persons:view_employees'],
        'persons:view_trainers': permissions['persons:view_trainers']
      });
      
      // Roles permissions
      permissions['roles:read'] = true;
      permissions['roles:create'] = true;
      permissions['roles:edit'] = true;
      permissions['roles:delete'] = true;
      permissions['roles:manage'] = true;
      permissions['ROLE_MANAGEMENT'] = true; // Legacy permission for compatibility
      
      // System permissions
      permissions['system:admin'] = true;
      permissions['admin:access'] = true;
      permissions['settings:manage'] = true;
      permissions['ADMIN_PANEL'] = true; // Original format
      permissions['SYSTEM_SETTINGS'] = true; // Original format
      permissions['USER_MANAGEMENT'] = true; // Original format
    }
    
    res.json({
      valid: true,
      user: {
        id: user.id,
        personId: user.personId,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        companyId: user.companyId,
        tenantId: user.tenantId,
        role: personRole,
        roles: person.personRoles.map(pr => pr.roleType),
        company: person.company,
        tenant: person.tenant,
        isVerified: user.isVerified
      },
      permissions: permissions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Token verification failed', {
      component: 'auth-v1-routes',
      action: 'verify',
      error: error.message,
      stack: error.stack,
      personId: req.person?.personId || req.person?.id
    });
    
    res.status(401).json({
      valid: false,
      error: 'Token verification failed',
      message: 'Invalid or expired token',
      code: 'TOKEN_VERIFICATION_FAILED'
    });
  }
});

// Get user permissions
router.get('/permissions/:personId', authenticate, async (req, res) => {
  try {
    const { personId } = req.params;
    
    logger.info('🔍 [PERMISSIONS] Starting permissions request', {
      personId,
      authenticatedPersonId: req.person?.id
    });
    
    // Verify that the requested personId matches the authenticated user
    if (personId !== req.person.id) {
      return res.status(403).json({
        error: 'Access denied: Cannot access other person permissions',
        code: 'AUTH_ACCESS_DENIED'
      });
    }
    
    logger.info('🔍 [PERMISSIONS] Fetching person from database');
    
    // Simplified query first - just get the person
    const person = await prisma.person.findUnique({
      where: { id: req.person.id }
    });
    
    if (!person) {
      logger.error('🔍 [PERMISSIONS] Person not found', { personId });
      return res.status(404).json({
        error: 'Person not found',
        code: 'PERSON_NOT_FOUND'
      });
    }
    
    logger.info('🔍 [PERMISSIONS] Person found, fetching roles');
    
    // Fetch roles separately to avoid complex joins
    const personRoles = await prisma.personRole.findMany({
      where: {personId: req.person.id,}
    });
    
    logger.info('🔍 [PERMISSIONS] Roles found', { rolesCount: personRoles.length });

    // Extract permissions in the format expected by frontend
    const permissions = [];
    
    // Determine person role with priority: SUPER_ADMIN > ADMIN > COMPANY_ADMIN > EMPLOYEE
    let personRole = 'EMPLOYEE';
    
    if (personRoles.some(pr => pr.roleType === 'SUPER_ADMIN')) {
      personRole = 'SUPER_ADMIN';
    } else if (personRoles.some(pr => pr.roleType === 'ADMIN')) {
      personRole = 'ADMIN';
    } else if (personRoles.some(pr => pr.roleType === 'COMPANY_ADMIN')) {
      personRole = 'COMPANY_ADMIN';
    } else if (personRoles.length > 0) {
      personRole = personRoles[0].roleType;
    }
    
    logger.info('🔍 [PERMISSIONS] Person role determined', { personRole });
    
    // For now, return a simplified response to test if the endpoint works
    // We'll add back the complex permission logic once we confirm it's working
    const permissionMap = {};
    
    // For admin persons, grant all permissions in the format expected by frontend
    if (personRole === 'ADMIN' || personRole === 'SUPER_ADMIN') {
      // Dashboard permissions
      permissionMap['dashboard:view'] = true;
      permissionMap['dashboard:read'] = true;
      
      // Companies permissions
      permissionMap['companies:view'] = true;
      permissionMap['companies:read'] = true;
      permissionMap['companies:create'] = true;
      permissionMap['companies:edit'] = true;
      permissionMap['companies:delete'] = true;
      permissionMap['companies:manage'] = true;
      
      // Employees permissions
      permissionMap['employees:view'] = true;
      permissionMap['employees:read'] = true;
      permissionMap['employees:create'] = true;
      permissionMap['employees:edit'] = true;
      permissionMap['employees:delete'] = true;
      permissionMap['employees:manage'] = true;
      
      // Courses permissions
      permissionMap['courses:view'] = true;
      permissionMap['courses:read'] = true;
      permissionMap['courses:create'] = true;
      permissionMap['courses:edit'] = true;
      permissionMap['courses:delete'] = true;
      permissionMap['courses:manage'] = true;
      
      // Trainers permissions
      permissionMap['trainers:view'] = true;
      permissionMap['trainers:read'] = true;
      permissionMap['trainers:create'] = true;
      permissionMap['trainers:edit'] = true;
      permissionMap['trainers:delete'] = true;
      
      // Scheduled courses permissions
      permissionMap['scheduled-courses:view'] = true;
      permissionMap['scheduled-courses:read'] = true;
      permissionMap['scheduled-courses:create'] = true;
      permissionMap['scheduled-courses:edit'] = true;
      permissionMap['scheduled-courses:delete'] = true;
      
      // Documents permissions
      permissionMap['documents-corsi:view'] = true;
      permissionMap['documents-corsi:read'] = true;
      permissionMap['documents-corsi:create'] = true;
      permissionMap['documents-corsi:edit'] = true;
      permissionMap['documents-corsi:delete'] = true;
      
      // Quotes and invoices permissions
      permissionMap['quotes-invoices:view'] = true;
      permissionMap['quotes-invoices:read'] = true;
      permissionMap['quotes-invoices:create'] = true;
      permissionMap['quotes-invoices:edit'] = true;
      permissionMap['quotes-invoices:delete'] = true;
      
      // GDPR permissions
      permissionMap['gdpr:view'] = true;
      permissionMap['gdpr:read'] = true;
      permissionMap['gdpr:admin'] = true;
      permissionMap['gdpr:manage'] = true;
      
      // Persons permissions (MISSING - CRITICAL FIX)
      permissionMap['persons:view'] = true;
      permissionMap['persons:read'] = true;
      permissionMap['persons:create'] = true;
      permissionMap['persons:edit'] = true;
      permissionMap['persons:delete'] = true;
      permissionMap['persons:manage'] = true;
      permissionMap['persons:view_employees'] = true;
      permissionMap['persons:view_trainers'] = true;
      
      // Users permissions
      permissionMap['users:view'] = true;
      permissionMap['users:read'] = true;
      permissionMap['users:create'] = true;
      permissionMap['users:edit'] = true;
      permissionMap['users:delete'] = true;
      permissionMap['users:manage'] = true;
      
      // Roles permissions
      permissionMap['roles:view'] = true;
      permissionMap['roles:read'] = true;
      permissionMap['roles:create'] = true;
      permissionMap['roles:edit'] = true;
      permissionMap['roles:delete'] = true;
      permissionMap['roles:manage'] = true;
      
      // System permissions
      permissionMap['system:admin'] = true;
      permissionMap['settings:view'] = true;
      permissionMap['settings:edit'] = true;
      permissionMap['settings:manage'] = true;
    }
    
    logger.info('🔍 [PERMISSIONS] Sending response', {
      personId: person.id,
      role: personRole,
      permissionsCount: Object.keys(permissionMap).length
    });

    res.json({
      success: true,
      data: {
        personId: person.id,
        role: personRole,
        permissions: permissionMap
      }
    });
  } catch (error) {
    logger.error('Failed to get person permissions', {
      error: error.message,
      stack: error.stack,
      action: 'getPermissions',
      personId: req.person?.id
    });
    
    res.status(500).json({
      error: 'Failed to get permissions',
      code: 'AUTH_GET_PERMISSIONS_FAILED'
    });
  }
});

// Route di test temporanea per debug
router.get('/test-debug', async (req, res) => {
  logger.info('🔍 [TEST DEBUG] Route di test chiamata');
  res.json({
    message: 'Test route funziona',
    timestamp: new Date().toISOString(),
    server: 'api-server.js'
  });
});

// Test permissions endpoint semplificato (senza autenticazione per debug)
router.get('/test-permissions-debug/:personId', async (req, res) => {
  try {
    logger.info('🔍 [TEST PERMISSIONS DEBUG] Endpoint chiamato', {
      personId: req.params.personId
    });
    
    const { personId } = req.params;
    
    logger.info('🔍 [TEST PERMISSIONS] Fetching person from database');
    
    // Simplified query first
    const person = await prisma.person.findUnique({
      where: { id: personId }
    });
    
    if (!person) {
      return res.status(404).json({
        error: 'Person not found',
        code: 'PERSON_NOT_FOUND'
      });
    }
    
    logger.info('🔍 [TEST PERMISSIONS] Person found, fetching roles');
    
    // Fetch roles separately
    const personRoles = await prisma.personRole.findMany({
      where: {personId: personId,}
    });
    
    logger.info('🔍 [TEST PERMISSIONS] Roles found', { rolesCount: personRoles.length });
    
    res.json({
      success: true,
      person: {
        id: person.id,
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName
      },
      roles: personRoles,
      message: 'Test permissions endpoint working'
    });
    
  } catch (error) {
    logger.error('Test permissions failed', {
      error: error.message,
      stack: error.stack,
      action: 'testPermissions',
      personId: personId
    });
    
    res.status(500).json({
      error: 'Test permissions failed',
      code: 'TEST_PERMISSIONS_FAILED',
      message: error.message
    });
  }
});

// Test endpoint for debugging permissions without auth
router.get('/test-permissions-no-auth/:personId', async (req, res) => {
  try {
    const { personId } = req.params;
    
    console.log('🔍 [TEST] Testing permissions without auth for personId:', personId);
    
    // Simple test to verify the endpoint works
    const testData = {
      success: true,
      message: 'Test endpoint working',
      personId: personId,
      timestamp: new Date().toISOString(),
      serverStatus: 'running'
    };
    
    console.log('🔍 [TEST] Sending response:', testData);
    
    res.json(testData);
  } catch (error) {
    console.error('🔍 [TEST] Error in test endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Simple test endpoint without parameters
router.get('/test-simple', async (req, res) => {
  try {
    console.log('🔍 [TEST] Simple test endpoint called');
    res.json({
      success: true,
      message: 'Simple test working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🔍 [TEST] Error in simple test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test permissions endpoint without any middleware
router.get('/test-permissions-direct/:personId', async (req, res) => {
  try {
    const { personId } = req.params;
    console.log('🔍 [TEST DIRECT] Testing permissions directly for personId:', personId);
    
    // Return mock permissions data to test if the frontend can receive it
    const mockPermissions = {
      'dashboard.view': true,
      'users.view': true,
      'users.create': true,
      'users.edit': true,
      'users.delete': true,
      'roles.view': true,
      'roles.create': true,
      'roles.edit': true,
      'roles.delete': true,
      'permissions.view': true,
      'permissions.create': true,
      'permissions.edit': true,
      'permissions.delete': true,
      'companies.view': true,
      'companies.create': true,
      'companies.edit': true,
      'companies.delete': true,
      'reports.view': true,
      'reports.create': true,
      'reports.export': true,
      'settings.view': true,
      'settings.edit': true
    };
    
    const response = {
      success: true,
      data: {
        personId: personId,
        role: 'ADMIN',
        permissions: mockPermissions
      }
    };
    
    console.log('🔍 [TEST DIRECT] Sending response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('🔍 [TEST DIRECT] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;