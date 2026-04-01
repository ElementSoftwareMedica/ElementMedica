/**
 * Authentication Routes - Core Authentication
 * Handles login, register, logout, and token refresh
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import authMiddleware from '../../../middleware/auth.js';
const { authenticate } = authMiddleware;
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
    error: 'Troppi tentativi di autenticazione',
    message: 'Riprovare tra 15 minuti'
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
    error: 'Troppi tentativi di registrazione',
    message: 'Riprovare più tardi'
  },
  keyGenerator: getClientIp, // Use custom IP getter to handle proxy
  validate: { ip: false } // Disable IP validation to prevent errors with proxy
});

// Handle all other HTTP methods for /login endpoint with 405 Method Not Allowed
const methodNotAllowedHandler = (req, res) => {
  res.status(405).json({
    error: 'Metodo non consentito',
    message: 'Solo il metodo POST è supportato per questo endpoint',
    allowedMethods: ['POST']
  });
};

router.get('/login', methodNotAllowedHandler);
router.put('/login', methodNotAllowedHandler);
router.patch('/login', methodNotAllowedHandler);
router.delete('/login', methodNotAllowedHandler);
router.head('/login', methodNotAllowedHandler);

/**
 * POST /auth/identify
 * Step 1 del multi-step login: identifica l'utente tramite email/username/CF
 */
router.post('/identify',
  authLimiter,
  [
    body('identifier')
      .notEmpty()
      .withMessage('Identificativo obbligatorio')
      .isLength({ min: 2 })
      .withMessage('Identificativo troppo corto')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validazione fallita',
          message: 'Dati di input non validi'
        });
      }

      const { identifier } = req.body;
      const result = await authService.identifyPerson(identifier);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.message || 'Account non trovato'
        });
      }

      res.json(result);
    } catch (error) {
      logger.error('[AUTH] Identify error:', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server',
        message: 'Si è verificato un errore durante l\'identificazione'
      });
    }
  }
);

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
    // Accetta identifier OPPURE personId (per multi-step login)
    body('identifier')
      .optional()
      .custom((value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const taxCodeRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;

        if (emailRegex.test(value) || taxCodeRegex.test(value) || value.length >= 3) {
          return true;
        }
        throw new Error('Deve essere un\'email, codice fiscale o username valido');
      }),
    body('personId')
      .optional()
      .isUUID()
      .withMessage('personId non valido'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('La password deve essere di almeno 6 caratteri'),
    // Custom: almeno uno tra identifier e personId
    body().custom((value) => {
      if (!value.identifier && !value.personId) {
        throw new Error('Email, username, codice fiscale o personId obbligatorio');
      }
      return true;
    })
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
          error: 'Validazione fallita',
          message: 'Dati di input non validi',
          details: errors.array()
        });
      }

      const { identifier, personId, password, remember_me = false } = req.body;

      // Verify credentials using AuthService (supporta identifier o personId per multi-step login)
      const credentialsResult = personId
        ? await authService.verifyCredentialsByPersonId(personId, password)
        : await authService.verifyCredentials(identifier, password);

      if (!credentialsResult.success) {
        logger.warn('🔐 [LOGIN CREDENTIALS FAILED]', { identifier, error: credentialsResult.error });

        // Log login failure (nota: non abbiamo personId, usiamo log generico per security)
        // Il logging dettagliato avviene già nel logger sopra per motivi di sicurezza
        // Non logghiamo in ActivityLog senza personId per rispettare la struttura dati

        return res.status(401).json({
          error: 'Credenziali non valide',
          message: 'Identificativo o password non corretti'
        });
      }

      const person = credentialsResult.person;

      // P63: tenantId da PersonTenantProfile (Person non ha più tenantId)
      let sessionTenantId =
        person._loginProfile?.tenantId ||
        person.tenantProfiles?.find(p => p.isPrimary)?.tenantId ||
        person.tenantProfiles?.[0]?.tenantId;

      // P48: Per utenti multi-tenant, preferisci il tenant che corrisponde al brand/dominio
      // Se l'utente accede da elementsicurezza.com (X-Frontend-Id: element-sicurezza),
      // seleziona il profilo tenant corretto anziché il primary
      const loginFrontendId = req.headers['x-frontend-id'];
      if (loginFrontendId && person.tenantProfiles?.length > 1) {
        const brandTenant = await prisma.tenant.findFirst({
          where: { slug: loginFrontendId, deletedAt: null },
          select: { id: true }
        });
        if (brandTenant) {
          const matchingProfile = person.tenantProfiles.find(p => p.tenantId === brandTenant.id);
          if (matchingProfile) {
            sessionTenantId = brandTenant.id;
            person._loginProfile = matchingProfile;
          }
        }
      }

      // Verifica Tenant attivo e abbonamento valido
      if (sessionTenantId) {
        const tenant = await prisma.tenant.findFirst({
          where: { id: sessionTenantId, deletedAt: null },
          select: {
            id: true,
            isActive: true,
            subscriptionStatus: true,
            subscriptionExpiresAt: true,
            gracePeriodUntil: true,
            trialEndsAt: true,
            billingPlan: true,
            name: true
          }
        });

        if (!tenant) {
          logger.warn('Login attempt for non-existent tenant', { personId: person.id, tenantId: sessionTenantId });
          return res.status(403).json({
            error: 'Tenant non trovato',
            message: 'Il tenant associato al tuo account non è più disponibile. Contatta l\'amministratore.'
          });
        }

        if (!tenant.isActive) {
          logger.warn('Login attempt for inactive tenant', { personId: person.id, tenantId: sessionTenantId });
          return res.status(403).json({
            error: 'TENANT_INACTIVE',
            code: 'TENANT_INACTIVE',
            message: 'L\'abbonamento del tuo tenant non è attivo. Contatta l\'amministratore per rinnovare.'
          });
        }

        // Verifica stato abbonamento
        const now = new Date();
        const subStatus = tenant.subscriptionStatus || 'active';

        if (subStatus === 'cancelled') {
          logger.warn('Login attempt for cancelled subscription', { personId: person.id, tenantId: sessionTenantId });
          return res.status(403).json({
            error: 'SUBSCRIPTION_CANCELLED',
            code: 'SUBSCRIPTION_CANCELLED',
            message: 'L\'abbonamento è stato cancellato. Contatta l\'amministratore per riattivarlo.'
          });
        }

        if (subStatus === 'suspended') {
          logger.warn('Login attempt for suspended subscription', { personId: person.id, tenantId: sessionTenantId });
          return res.status(403).json({
            error: 'SUBSCRIPTION_SUSPENDED',
            code: 'SUBSCRIPTION_SUSPENDED',
            message: 'L\'abbonamento è sospeso per mancato pagamento. Contatta l\'amministratore.'
          });
        }

        // Verifica scadenza abbonamento (con grace period)
        if (tenant.subscriptionExpiresAt && tenant.subscriptionExpiresAt < now) {
          const gracePeriodEnd = tenant.gracePeriodUntil || tenant.subscriptionExpiresAt;
          if (gracePeriodEnd < now) {
            logger.warn('Login attempt with expired subscription', {
              personId: person.id,
              tenantId: sessionTenantId,
              expiredAt: tenant.subscriptionExpiresAt
            });
            return res.status(403).json({
              error: 'SUBSCRIPTION_EXPIRED',
              code: 'SUBSCRIPTION_EXPIRED',
              message: 'L\'abbonamento è scaduto. Contatta l\'amministratore per rinnovare.'
            });
          }
          // In grace period — login consentito con warning nel log
          logger.info('Login during grace period', {
            personId: person.id,
            tenantId: sessionTenantId,
            gracePeriodUntil: gracePeriodEnd
          });
        }

        // Verifica scadenza trial
        if (subStatus === 'trial' && tenant.trialEndsAt && tenant.trialEndsAt < now) {
          logger.warn('Login attempt with expired trial', { personId: person.id, tenantId: sessionTenantId });
          return res.status(403).json({
            error: 'TRIAL_EXPIRED',
            code: 'TRIAL_EXPIRED',
            message: 'Il periodo di prova è terminato. Scegli un piano per continuare ad utilizzare la piattaforma.'
          });
        }

        // Verifica scadenza feature principali del tenant (se validUntil è scaduto su tutte le feature)
        const activeFeatures = await prisma.tenantFeature.count({
          where: {
            tenantId: sessionTenantId,
            isEnabled: true,
            deletedAt: null,
            OR: [
              { validUntil: null },
              { validUntil: { gte: now } }
            ]
          }
        });

        if (activeFeatures === 0) {
          // Verifica se il tenant HA feature configurate ma tutte scadute
          const totalFeatures = await prisma.tenantFeature.count({
            where: { tenantId: sessionTenantId, deletedAt: null }
          });

          if (totalFeatures > 0) {
            logger.warn('Login attempt with all features expired', { personId: person.id, tenantId: sessionTenantId });
            return res.status(403).json({
              error: 'SUBSCRIPTION_EXPIRED',
              message: 'Tutte le funzionalità del tuo abbonamento sono scadute. Contatta l\'amministratore per rinnovare.',
              code: 'SUBSCRIPTION_EXPIRED'
            });
          }
        }
      }

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

      // P63: sessionTenantId già calcolato sopra

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
          tenantId: sessionTenantId
        }
      });

      // Update last login
      await prisma.person.update({
        where: { id: person.id },
        data: { lastLogin: new Date() }
      });

      // P48/P63: Estrai dati dal profilo tenant (Person non ha più email/status/tenantId)
      const primaryProfile = person._loginProfile ||
        person.tenantProfiles?.find(p => p.isPrimary) ||
        person.tenantProfiles?.[0];
      const profileEmail = primaryProfile?.email || person.username;
      const profileStatus = primaryProfile?.status || 'ACTIVE';
      const profileTenantId = sessionTenantId;

      logger.info('Login successful', {
        personId: person.id,
        tenantId: profileTenantId
      });

      // Filtra ruoli per il tenant della sessione per evitare duplicati cross-tenant
      const allRoles = authService.getPersonRoles(person);
      const tenantRoles = (person.personRoles || [])
        .filter(pr => !pr.deletedAt && pr.tenantId === sessionTenantId)
        .map(pr => pr.roleType)
        .filter(Boolean);
      const userRoles = tenantRoles.length > 0 ? [...new Set(tenantRoles)] : [...new Set(allRoles)];

      let primaryRole = 'User';
      if (userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN')) primaryRole = 'Admin';
      else if (userRoles.includes('COMPANY_ADMIN')) primaryRole = 'Administrator';
      else if (userRoles.includes('MANAGER')) primaryRole = 'Manager';
      else if (userRoles.includes('EMPLOYEE')) primaryRole = 'Employee';

      // Estrai permessi dai PersonRoles filtrati per tenant
      const tenantPersonRoles = (person.personRoles || [])
        .filter(pr => !pr.deletedAt && pr.tenantId === sessionTenantId);
      const permissions = tenantPersonRoles
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
        tenantId: profileTenantId,
        ipAddress: getClientIp(req),
        userAgent: req.get('User-Agent'),
        metadata: {
          loginMethod: remember_me ? 'remember_me' : 'standard'
        },
        success: true
      });

      res.json({
        success: true,
        user: {
          id: person.id,
          email: profileEmail,
          firstName: person.firstName,
          lastName: person.lastName,
          globalRole: person.globalRole,
          role: primaryRole,
          roleType: userRoles[0] || null,
          roles: userRoles,
          permissions: permissions,
          status: profileStatus,
          companyId: primaryProfile?.companyTenantProfileId || null,
          tenantId: profileTenantId,
          company: null
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
        error: 'Operazione non riuscita',
        stack: error.stack,
        identifier: req.body?.identifier ? `${req.body.identifier.substring(0, 3)}***` : 'missing'
      });

      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Si è verificato un errore durante l\'accesso'
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
      .withMessage('Email valida obbligatoria'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('La password deve avere almeno 8 caratteri con maiuscole, minuscole e un numero'),
    body('firstName')
      .isLength({ min: 2 })
      .trim()
      .withMessage('Il nome deve essere di almeno 2 caratteri'),
    body('lastName')
      .isLength({ min: 2 })
      .trim()
      .withMessage('Il cognome deve essere di almeno 2 caratteri'),
    body('tenantId')
      .isUUID()
      .withMessage('TenantId UUID valido obbligatorio')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validazione fallita',
          message: 'Dati di input non validi',
          details: errors.array()
        });
      }

      const { email, password, firstName, lastName, tenantId, companyTenantProfileId } = req.body;

      // P48: Verifica tenant attivo
      const tenant = await prisma.tenant.findFirst({
        where: { id: tenantId, isActive: true, deletedAt: null }
      });
      if (!tenant) {
        return res.status(400).json({
          error: 'Tenant non valido',
          message: 'Il tenant specificato non esiste o non è attivo'
        });
      }

      // P48: email è in PersonTenantProfile, non in Person.
      // Cerca se esiste già un profilo con questa email nello stesso tenant.
      const existingProfile = await prisma.personTenantProfile.findFirst({
        where: { email, tenantId, deletedAt: null }
      });
      if (existingProfile) {
        return res.status(409).json({
          error: 'Email già esistente',
          message: 'Un account con questa email esiste già per questo tenant'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      // P48: Crea Person + PersonTenantProfile + PersonRole in transazione
      const result = await prisma.$transaction(async (tx) => {
        // Crea Person con solo campi globali (NO email, NO status, NO companyId)
        const person = await tx.person.create({
          data: {
            username: email,
            password: hashedPassword,
            firstName,
            lastName
          }
        });

        // P48: Crea PersonTenantProfile per il tenant specificato
        const profile = await tx.personTenantProfile.create({
          data: {
            personId: person.id,
            tenantId,
            email,
            status: 'ACTIVE',
            isPrimary: true,
            isActive: true,
            companyTenantProfileId: companyTenantProfileId || null
          }
        });

        // Crea PersonRole con tenantId (required) e companyTenantProfileId
        const personRole = await tx.personRole.create({
          data: {
            personId: person.id,
            tenantId,
            roleType: 'EMPLOYEE',
            isActive: true,
            isPrimary: true,
            companyTenantProfileId: companyTenantProfileId || null
          }
        });

        // Crea RolePermissions di base per il ruolo
        await tx.rolePermission.createMany({
          data: [
            { personRoleId: personRole.id, permission: 'employees:read', isGranted: true },
            { personRoleId: personRole.id, permission: 'employees:update', isGranted: true }
          ]
        });

        return { person, profile, personRole };
      });

      logger.info('Person registered successfully', {
        personId: result.person.id,
        tenantId
      });

      // Prepara person con tenantProfiles per JWTService
      const personForJwt = {
        ...result.person,
        tenantProfiles: [result.profile],
        personRoles: [result.personRole]
      };

      const { accessToken, refreshToken, expiresIn } = await JWTService.generateTokenPair(
        personForJwt,
        { userAgent: req.get('User-Agent') || 'Unknown', ip: req.ip || '0.0.0.0' },
        { rememberMe: false }
      );

      return res.status(201).json({
        success: true,
        user: {
          id: result.person.id,
          email: result.profile.email,
          firstName: result.person.firstName,
          lastName: result.person.lastName,
          status: result.profile.status,
          tenantId,
          companyTenantProfileId: result.profile.companyTenantProfileId || null
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
        error: 'Operazione non riuscita',
        stack: error.stack
      });

      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Si è verificato un errore durante la registrazione'
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
        error: 'Token di refresh obbligatorio',
        message: 'Nessun token di refresh fornito'
      });
    }

    // Centralizza su JWTService: verifica refresh token, controlla DB e genera nuovo access token
    const { accessToken, refreshToken: newRefreshToken, expiresIn, tokenType } = await JWTService.refreshAccessToken(refreshToken);

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
      refresh_token: newRefreshToken,
      expires_in: expiresInSeconds,
      token_type: tokenType || 'Bearer'
    });
  } catch (error) {
    logger.error('Token refresh error', {
      error: 'Operazione non riuscita',
      stack: error.stack
    });

    res.status(401).json({
      error: 'Token di refresh non valido',
      message: 'Impossibile aggiornare il token'
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
router.post('/logout', authenticate, async (req, res) => {
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
      message: 'Disconnessione effettuata con successo'
    });
  } catch (error) {
    logger.error('Logout error', {
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id
    });

    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Si è verificato un errore durante la disconnessione'
    });
  }
});

export default router;