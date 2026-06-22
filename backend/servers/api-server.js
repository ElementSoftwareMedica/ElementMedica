/**
 * API Server - Refactored and Optimized
 * Versione completamente refactorizzata utilizzando moduli centralizzati
 * Ridotto da 527 righe a meno di 200 righe
 */

import express from 'express';
import cors from 'cors'; // CRITICO: Riabilitato per permettere l'impostazione dei cookie
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import cookieParser from 'cookie-parser';

// Configurazioni centralizzate
import { createCorsConfig } from '../config/cors.js';
import { createBodyParsers } from '../config/bodyParser.js';
import { createMulterConfig } from '../config/multer.js';
import { createSecurityConfig } from '../config/security.js';
import { createRateLimiter, autoRateLimit } from '../config/rateLimiting.js';
import { healthCheckManager, createDatabaseHealthCheck, createRedisHealthCheck } from '../config/healthCheck.js';
import { APIVersionManager } from '../config/apiVersioning.js';
import { ServiceLifecycleManager, PRIORITY } from '../config/lifecycle.js';
import { MiddlewareManager } from '../middleware/index.js';

// Servizi
import { DatabaseService } from '../database/index.js';
import { RedisService } from '../services/redis.js';
import { GoogleAPIService } from '../services/google-api.js';

// Middleware
import performanceMonitor from '../middleware/performance-monitor.js';
import { authMiddleware, authenticate } from '../middleware/auth.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { brandDetectionMiddleware } from '../middleware/brandDetection.js';
import { globalActivityTracking } from '../middleware/activityTracking.js';

// Routes
import authRoutes from '../routes/auth.js';
import courseRoutes from '../routes/courses-routes.js';
import companyRoutes from '../routes/companies-routes.js';
import companySitesRoutes from '../routes/company-sites-routes.js';
import sorveglianzaSanitariaRoutes from '../routes/sorveglianza-sanitaria-routes.js';
import dvrRoutes from '../routes/dvr-routes.js';
import sopralluogoRoutes from '../routes/sopralluogo-routes.js';
import repartoRoutes from '../routes/reparto-routes.js';
import { employeesRouter, trainersRouter, virtualEntitiesRouter } from '../routes/virtualEntityRoutes.js';
import userRoutes from '../routes/users-routes.js';
import personRoutes from '../routes/person-routes.js';
import gdprRoutes from '../routes/gdpr/index.js';
import roleRoutes from '../routes/roles/index.js';
import permissionRoutes from '../routes/v1/permissions.js';
import advancedPermissionsRoutes from '../routes/advanced-permissions.js';
import settingsRoutes from '../routes/settings-routes.js';
import tenantRoutes from '../routes/tenants.js';
import dashboardRoutes from '../routes/dashboard-routes.js';
import scheduleRoutes from '../routes/schedules-routes.js';
import cmsRoutes from '../routes/cms-routes.js';
import cmsMediaRoutes from '../routes/cms-media-routes.js';
import publicCoursesRoutes from '../routes/public-courses-routes.js';
import publicFormsRoutes from '../routes/public-forms-routes.js';
import publicVerifyRoutes from '../routes/public-verify-routes.js';
import publicContactSubmissionsRoutes from '../routes/public-contact-submissions-routes.js';
import publicQueueRoutes from '../routes/public-queue-routes.js';
import publicBookingRoutes from '../routes/public-booking-routes.js'; // P67: Prenotazioni pubbliche
import publicDoctorsRoutes from '../routes/public-doctors-routes.js'; // Profili medici pubblici
import publicConsensoFirmaRoutes from '../routes/public-consenso-firma-routes.js'; // Consensi firma tablet
import publicTabletRoutes from '../routes/public-tablet-routes.js'; // Tablet fisso polling
import publicAnalyticsRoutes from '../routes/public-analytics-routes.js'; // Analytics pubbliche
import publicApiKeysRoutes from '../routes/public-api-keys-routes.js'; // P75: Gestione chiavi API pubbliche
import publicEmbedRoutes from '../routes/public-embed-routes.js'; // P75: Widget embed pubblici
import bridgeActivationRoutes from '../routes/bridge-activation.routes.js'; // Bridge auto-activation (public)
import submissionRoutes from '../routes/v1/submission-routes.js';
import formTemplatesRoutes from '../routes/form-templates-routes.js';
import formsRoutes from '../routes/forms-routes.js';
import advancedSubmissionsRoutes from '../routes/advanced-submissions-routes.js';
import activityLogsRoutes from '../routes/activity-logs-routes.js';
import seoRoutes from '../routes/seo-routes.js';
import sitemapRoutes from '../routes/sitemap-routes.js';
import templateRoutes from '../routes/template-routes.js';
import googleAuthRoutes from '../routes/google-auth-routes.js';
import documentRoutes from '../routes/document-routes.js';
import lettereIncaricoRoutes from '../routes/lettere-incarico-routes.js';
import registriPresenzeRoutes from '../routes/registri-presenze-routes.js';
// Project 46 - Modular attestati routes (5 sub-routers)
import attestatiRoutes from '../routes/attestati/index.js';
// Project 46 - Modular preventivi routes (5 sub-routers)
import preventiviRoutes from '../routes/preventivi/index.js';
import codiciScontoRoutes from '../routes/codici-sconto-routes.js';
import importRoutes from '../routes/import-routes.js';
import backupRoutes from '../routes/backup-routes.js';
import courseTestsRoutes from '../routes/course-tests-routes.js';
import cmsAnalyticsRoutes from '../routes/cms-analytics-routes.js';
import cmsPrerenderRoutes from '../routes/cms-prerender-routes.js';
// Project 46 - Modular clinical routes (18 sub-routers)
import clinicaRoutes from '../routes/clinica/index.js';
// Project 44 - ElementSicurezza OT23 Management
import sicurezzaRoutes from '../routes/sicurezza/index.js';
import tariffarioAziendaleRoutes from '../routes/tariffario-aziendale-routes.js';
import consulenzeMDLRoutes from '../routes/consulenze-mdl-routes.js';
import usciteMCRoutes from '../routes/uscite-mc-routes.js';
// Project 59 - MovimentoContabile (COSTI e RICAVI unificati)
import movimentoContabileRoutes from '../routes/movimento-contabile-routes.js';
// Project 43 - Multi-tenant access management
import personTenantAccessRoutes from '../routes/v1/person-tenant-access.js';
// Feature Catalog - prezzi e metadati funzionalità
import featureCatalogRoutes from '../routes/feature-catalog.js';
// Project 48 - Person Multi-Tenant Routes
import personTenantProfileRoutes from '../routes/person-tenant-profile-routes.js';
import personConsentRoutes from '../routes/person-consent-routes.js';
// Activity logging system (GDPR compliant)
import activityRoutes from '../routes/v1/activity/index.js';
// System routes (logs, config)
import systemRoutes from '../routes/system-routes.js';
// Project 47 - Advanced Notification System
import advancedNotificationRoutes from '../routes/notifications/advanced-notification.routes.js';
// Project 47 - Fase 9: Calendar Integration
import calendarRoutes from '../routes/notifications/calendar.routes.js';
// Clinical Calendar Routes (ICS export, Google Calendar sync)
import clinicalCalendarRoutes from '../routes/calendar-routes.js';
// Notification Routes (Email/SMS/WhatsApp sending)
import notificationSendingRoutes from '../routes/notification-routes.js';
// Project 57 - Cross-Tenant Approval System
import crossTenantApprovalRoutes from '../routes/cross-tenant-approval-routes.js';
// Credentials management routes (password reset, credential cards)
import credentialsRoutes from '../routes/credentials-routes.js';
// Messaging configuration routes (SMTP, WhatsApp)
import messagingRoutes from '../routes/messaging-routes.js';
// Public brand settings (widget tenant configuration for Management)
import publicBrandSettingsRoutes from '../routes/public-brand-settings-routes.js';
// Project 65 - FSE Integration: Firma Digitale, Consensi FSE, CDA HL7
import signatureRoutes from '../routes/signature-routes.js';
import consentFseRoutes from '../routes/consent-fse-routes.js';
import cdaRoutes from '../routes/cda-routes.js';
// Project 66 - Sistema Scadenze Centralizzato (Deadlines & Farmaci)
import scadenzeRoutes from '../routes/scadenze-routes.js';
// Project 68 - HR Personnel Management (Personale Interno)
import hrRoutes from '../routes/hr/index.js';
// P74 - Document Management (procedure interne + documenti marketing)
import internalDocumentsRoutes from '../routes/management/internal-documents.routes.js';
import controlloGestioneRoutes from '../routes/management/controllo-gestione.routes.js';
// P97 - Fatturazione Elettronica & SistemaTS Integration
import entiEmittentiRoutes from '../routes/enti-emittenti-routes.js';
import fatturazioneElettronicaRoutes from '../routes/fatturazione-elettronica-routes.js';
import sistemaTsRoutes from '../routes/sistema-ts-routes.js';
// P98 - Desktop Sync (MDL Offline-First)
import desktopSyncRoutes from '../routes/desktop-sync-routes.js';
import desktopLicensesRoutes from '../routes/desktop-licenses.routes.js';
// Project 47 - WebSocket for real-time notifications
import NotificationSocketService from '../websocket/NotificationSocketService.js';
// Project 47 - Fase 2: Event Bus & Domain Events
import { EventBus, NotificationEventHandler } from '../services/events/index.js';
// Project 47 - Fase 3: Rule Engine
import NotificationRuleEngine from '../services/notifications/NotificationRuleEngine.js';
// Project 47 - Fase 7: Escalation Service
import NotificationEscalationService from '../services/notifications/NotificationEscalationService.js';
// P68: Slot auto-generation service
import SlotDisponibilitaService from '../services/clinical/SlotDisponibilitaService.js';
import DefaultTemplateService from '../services/templates/DefaultTemplateService.js';
// P97: Fatturazione Elettronica — SDI polling scheduler
import { startSdiPolling } from '../services/billing/SdiPollingScheduler.js';
import { startPeriodicBilling } from '../services/billing/PeriodicBillingScheduler.js';
// P66: MDL Giudizi EOD email notifications
import GiudizioEmailService from '../services/clinical/GiudizioEmailService.js';
import IdoneityNotificationService from '../services/clinical/IdoneityNotificationService.js';
// P70: Queue auto-generation (6:30 morning, 13:30 afternoon)
import QueueAutoGeneratorService from '../services/queue/QueueAutoGeneratorService.js';
import cron from 'node-cron';

// Utils
import { logger } from '../utils/logger.js';
import prisma, { createPrismaMiddleware } from '../config/prisma-optimization.js';

// Configurazione ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFile = process.env.NODE_ENV === 'production' ? '../.env.production' : '../.env';
dotenv.config({ path: path.join(__dirname, envFile) });

/**
 * Classe API Server Refactorizzata
 */
class APIServer {
  constructor() {
    this.app = express();
    this.app.set('trust proxy', 1);
    this.server = null;
    this.isShuttingDown = false;

    // Managers
    try {
      this.lifecycleManager = new ServiceLifecycleManager({
        shutdownTimeout: 30000,
        gracefulShutdown: true
      });

      this.middlewareManager = new MiddlewareManager(this.app);

      this.versionManager = new APIVersionManager(this.app);

      logger.info('API Server instance created', {
        service: 'api-server',
        environment: process.env.NODE_ENV || 'development',
        port: process.env.API_PORT || 4001
      });
    } catch (error) {
      logger.error('Failed to initialize API Server', {
        service: 'api-server',
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Aggiunta: Validazione env critiche per JWT
  validateEnvironment() {
    const missing = [];
    if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
    if (!process.env.JWT_REFRESH_SECRET) missing.push('JWT_REFRESH_SECRET');

    if (missing.length > 0) {
      logger.error('Missing required environment variables for JWT', {
        service: 'api-server',
        missing
      });
      const msg = `JWT configuration error: missing ${missing.join(', ')}`;
      throw new Error(msg);
    }

    // Avviso sicurezza: DEFAULT_TEMP_PASSWORD non impostato in produzione
    if (!process.env.DEFAULT_TEMP_PASSWORD) {
      logger.error(
        '[SECURITY] DEFAULT_TEMP_PASSWORD env var non impostato. ' +
        'Impostare DEFAULT_TEMP_PASSWORD in .env prima di avviare il server.',
        { service: 'api-server' }
      );
      if (process.env.NODE_ENV === 'production') {
        throw new Error('[CONFIG] DEFAULT_TEMP_PASSWORD env var is required in production');
      }
    }

    // P69: Validate critical env vars in production
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.ALLOWED_ORIGINS) {
        missing.push('ALLOWED_ORIGINS');
      }
      const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.POSTGRES_URL;
      if (!dbUrl) {
        missing.push('DATABASE_URL');
      }
      if (missing.length > 0) {
        const msg = `Production configuration error: missing ${missing.join(', ')}`;
        logger.error(msg, { service: 'api-server', missing });
        throw new Error(msg);
      }
    }
  }

  /**
   * Inizializza configurazioni centralizzate
   */
  async initializeConfigurations() {
    logger.info('Initializing configurations...', { service: 'api-server' });

    // Configurazioni
    this.corsConfig = createCorsConfig();
    this.bodyParsers = createBodyParsers();
    this.multerConfig = createMulterConfig();
    this.securityConfig = createSecurityConfig();
    this.rateLimiters = {
      global: createRateLimiter('global'),
      login: createRateLimiter('login'),
      upload: createRateLimiter('upload')
    };
  }

  /**
   * Inizializza e registra servizi nel lifecycle manager
   * Nota: database, redis, googleAPI gestiti da Prisma e dai singoli servizi — non da lifecycle manager
   */
  async initializeServices() {
    logger.info('Services ready', { service: 'api-server' });
  }

  /**
   * Configura middleware utilizzando il middleware manager
   */
  configureMiddleware() {
    logger.info('Configuring middleware...', { service: 'api-server' });

    try {
      // STATIC FILES: Serve uploaded files
      const uploadsPath = path.join(__dirname, '../uploads');

      // SECURITY: Protect sensitive upload directories with authentication
      // Clinical files, referti, giudizi, DVR, etc. require auth
      const protectedDirs = ['clinical', 'referti', 'giudizi-idoneita', 'dvr', 'documenti-compilati', 'sopralluoghi', 'internal-documents'];
      for (const dir of protectedDirs) {
        this.app.use(`/uploads/${dir}`, authenticate, (req, res, next) => {
          if (!req.person) {
            return res.status(401).json({ error: 'Autenticazione richiesta per accedere a questo documento' });
          }
          next();
        }, express.static(path.join(uploadsPath, dir), {
          maxAge: '1d',
          etag: true,
          lastModified: true,
          index: false,
          dotfiles: 'ignore'
        }));
      }

      // Public uploads (CMS, templates, etc.) — no auth required
      this.app.use('/uploads', express.static(uploadsPath, {
        maxAge: '1d',
        etag: true,
        lastModified: true,
        index: false,  // Don't serve directory index
        dotfiles: 'ignore'  // Don't serve dotfiles
      }));
      this.app.get(/^\/uploads\/.*\.(png|jpe?g|gif|webp|svg)$/i, (req, res) => {
        if (protectedDirs.some((dir) => req.path.startsWith(`/uploads/${dir}/`))) {
          return res.status(404).json({ error: 'File non trovato' });
        }
        const transparentPng = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
          'base64'
        );
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.type('png').send(transparentPng);
      });
      logger.info('Static files configured', { path: '/uploads', dir: uploadsPath });

      // PUBLIC SEO ROUTES: Mount sitemap and robots.txt at root BEFORE authentication
      // These need to be accessible by search engine crawlers
      this.app.use('/', sitemapRoutes);
      logger.info('SEO routes mounted', { paths: ['/sitemap.xml', '/robots.txt'] });

      this.middlewareManager.register('security', this.securityConfig.helmet, { priority: 10 });
      // CRITICO: CORS riabilitato per permettere l'impostazione dei cookie
      this.middlewareManager.register('cors', cors(this.corsConfig), { priority: 20 });
      // Parse cookies prima dell'autenticazione
      this.middlewareManager.register('cookies', cookieParser(), { priority: 21 });

      // Body parser middleware - DEVE essere prima del rate limiting per evitare conflitti
      // Wrapper per body parser JSON con gestione errori
      const jsonParser = (req, res, next) => {
        this.bodyParsers.json(req, res, (err) => {
          if (err) {
            logger.error('Body parser JSON error', { error: err.message, type: err.type });
          }
          next(err);
        });
      };

      // Wrapper per body parser URL-encoded con gestione errori
      const urlencodedParser = (req, res, next) => {
        this.bodyParsers.urlencoded(req, res, (err) => {
          if (err) {
            logger.error('Body parser urlencoded error', { error: err.message, type: err.type });
          }
          next(err);
        });
      };

      this.middlewareManager.register('bodyParserJson', jsonParser, {
        priority: 25,
        enabled: true,
        environment: ['development', 'production', 'test']
      });
      this.middlewareManager.register('bodyParserUrlencoded', urlencodedParser, {
        priority: 26,
        enabled: true,
        environment: ['development', 'production', 'test']
      });

      this.middlewareManager.register('rateLimitGlobal', this.rateLimiters.global, { priority: 30 });

      // RIMOSSO: Multer globale che interferiva con i body parser
      // this.middlewareManager.register('multer', this.multerConfig.any(), { priority: 50 });
      // Temporarily disabled performance middleware
      // this.middlewareManager.register('performance', performanceMonitor.middleware(), { 
      //   priority: 60,
      //   condition: () => process.env.ENABLE_PERFORMANCE_MONITORING !== 'false'
      // });
      // Middleware di autenticazione condizionale (esclude route pubbliche)
      const conditionalAuthMiddleware = (req, res, next) => {
        // Route pubbliche che non richiedono autenticazione
        const publicRoutes = [
          '/api/auth/login',
          '/api/auth/register',
          '/api/auth/forgot-password',
          '/api/auth/reset-password',
          // Aggiunta compatibilità per routing versionato
          '/api/v1/auth/login',
          '/api/v1/auth/identify',
          '/api/v1/auth/register',
          '/api/v1/auth/forgot-password',
          '/api/v1/auth/reset-password',
          // NUOVO: whitelist per verify/me che gestiscono auth a livello di route con authenticateTest
          '/api/v1/auth/verify',
          '/api/v1/auth/me',
          // Debug endpoints - RIMOSSO: devono richiedere autenticazione in produzione
          // '/api/v1/auth/test-debug',
          // '/api/v1/auth/debug',
          // '/api/v1/auth/debug/find-person',
          '/api/v2/auth/login',
          '/api/v2/auth/register',
          '/api/v2/auth/forgot-password',
          '/api/v2/auth/reset-password',
          '/api/roles/public',    // Solo l'endpoint pubblico dei ruoli
          '/healthz',
          '/health',
          // Route pubbliche per i corsi, form, contact submissions
          '/api/v1/public/courses',
          '/api/v1/public/schedules',
          '/api/v1/public/forms',
          '/api/v1/public/contact-submissions',
          // Route pubbliche CMS (per frontend pubblico)
          '/api/v1/cms/pages/slug',
          // Route pubblica per verifica attestati
          '/api/v1/public/verify-attestato',
          // Route pubbliche per queue check-in (P53.1 Mobile)
          '/api/v1/public/queue',
          // Route pubbliche per prenotazioni online (P67)
          '/api/v1/public/booking',
          // Route pubbliche per profili medici
          '/api/v1/public/doctors',
          // Route pubblica firma consensi tablet paziente (no auth — token opaco protezione)
          '/api/v1/public/consenso-firma',
          // Route pubblica polling stato tablet (no auth — JWT firmato protezione)
          '/api/v1/public/tablet',
          // Route pubblica analytics tracking (no auth — rate limited)
          '/api/public/analytics/track',
          // P75: Route pubbliche embed widget (autenticati via API key nel path)
          '/api/public/embed',
          // Legacy path per bundle cachati
          '/api/public/courses',
          // Bridge auto-activation (autenticato via license key, non JWT)
          '/api/v1/public/bridge',
          // Route pubblica per activity logs (POST con optionalAuth gestito a livello di route)
          '/api/activity-logs',
          '/api/v1/activity-logs',
          // Route pubbliche SEO
          '/sitemap.xml',
          '/robots.txt',
          '/api/v1/sitemap/sitemap.xml',
          '/api/v1/sitemap/robots.txt'
        ];

        // Usa sia path che originalUrl per evitare mismatch dovuti a mount points
        const pathToCheck = req.path || '';
        const originalToCheck = req.originalUrl || '';

        // Controlla se la route corrente è pubblica
        const isPublicRoute = publicRoutes.some(route => {
          // Controllo esatto per route senza parametri
          if (pathToCheck === route || originalToCheck === route) return true;
          // Controllo per route che iniziano con il pattern (per gestire parametri dinamici)
          if (pathToCheck.startsWith(route) || originalToCheck.startsWith(route)) return true;
          // Controllo specifico per route con parametri come /api/v1/public/courses/:slug
          if (route === '/api/v1/public/courses' && (pathToCheck.match(/^\/api\/v1\/public\/courses\/[^\/]+$/) || originalToCheck.match(/^\/api\/v1\/public\/courses\/[^\/]+$/))) return true;
          return false;
        });

        // Development-only debug tracing removed in production

        // Fallback robusto con regex per activity-logs: considera pubbliche tutte le varianti /api/(v1|v2)?/activity-logs
        if (!isPublicRoute) {
          const isActivityLogsPublic = /^\/api\/(v[12]\/)?activity-logs(\/?|$)/.test(originalToCheck);
          if (isActivityLogsPublic) {
            return next();
          }
        }

        if (isPublicRoute) {
          return next();
        }
        // Applica autenticazione per tutte le altre route
        return authMiddleware(req, res, next);
      };

      this.middlewareManager.register('auth', conditionalAuthMiddleware, { priority: 70 }); // Riabilitato per gestione autenticazione
      this.middlewareManager.register('tenant', tenantMiddleware, { priority: 80 }); // Riabilitato per gestione tenant
      this.middlewareManager.register('rbac', rbacMiddleware, { priority: 90 }); // Riabilitato per gestione RBAC

      // Applica tutti i middleware registrati
      this.middlewareManager.apply();

      // FALLBACK RIMOSSO: Evita conflitti di body parsing
      // Body parsers configurati via MiddlewareManager

      // Debug middleware per verificare il body parsing (disabilitato)
      // this.app.use((req, res, next) => {
      //   // Debug disabilitato per ridurre rumore nei log
      //   next();
      // });

      // Middleware Prisma per conversione numerica
      this.app.use(createPrismaMiddleware());

      // P64: Proxy server eliminato - CORS gestito direttamente qui o da Nginx in produzione
      logger.info('Middleware configuration completed successfully', { service: 'api-server' });
    } catch (error) {
      logger.error('Error in configureMiddleware', {
        service: 'api-server',
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Configura route utilizzando il version manager
   */
  configureRoutes() {
    try {
      logger.info('Configuring routes...', { service: 'api-server' });

      logger.info('Setting up health check route...');
      // Health check semplificato
      this.app.get('/healthz', (req, res) => {
        try {
          res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.0'
          });
        } catch (error) {
          logger.error('[HEALTH CHECK] Error:', error);
          res.status(500).json({
            status: 'error',
            error: 'Errore interno del server'
          });
        }
      });

      // Aggiungi anche endpoint /health per compatibilità
      this.app.get('/health', (req, res) => {
        try {
          res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.0'
          });
          // Health check response sent
        } catch (error) {
          logger.error('[HEALTH CHECK] /health Error:', error);
          res.status(500).json({
            status: 'error',
            error: 'Errore interno del server'
          });
        }
      });
      logger.info('Health check routes configured successfully');

      logger.info('Getting version routers...');
      // Route API versionate
      const v1Router = this.versionManager.getRouter('v1');
      const v2Router = this.versionManager.getRouter('v2');
      logger.info('Version routers obtained successfully');

      // Applica i middleware necessari ai router versioned
      logger.info('Applying middleware to version routers...');

      // Parser JSON per v1Router
      v1Router.use(express.json({
        limit: '50mb',
        verify: (req, res, buf, encoding) => {
          req.rawBody = buf;
        }
      }));

      // Parser URL-encoded per v1Router
      v1Router.use(express.urlencoded({
        extended: true,
        limit: '50mb',
        verify: (req, res, buf, encoding) => {
          req.rawBody = buf;
        }
      }));

      if (v2Router) {
        // Parser JSON per v2Router
        v2Router.use(express.json({
          limit: '50mb',
          verify: (req, res, buf, encoding) => {
            req.rawBody = buf;
          }
        }));

        // Parser URL-encoded per v2Router
        v2Router.use(express.urlencoded({
          extended: true,
          limit: '50mb',
          verify: (req, res, buf, encoding) => {
            req.rawBody = buf;
          }
        }));
      }

      logger.info('Middleware applied to version routers successfully');

      // MULTI-BRAND: Brand detection middleware (deve essere PRIMA delle routes)
      logger.info('Applying brand detection middleware...');
      v1Router.use(brandDetectionMiddleware);
      logger.info('Brand detection middleware applied successfully');

      // Activity tracking - traccia automaticamente POST/PUT/PATCH/DELETE su tutte le route v1
      // Auth events sono esclusi (gestiti da logAuthEvent in authentication.js)
      v1Router.use(globalActivityTracking);
      logger.info('Activity tracking middleware applied successfully');

      logger.info('Registering auth routes...');
      // Registra route v1
      v1Router.use('/auth', authRoutes);
      logger.info('Auth routes registered successfully');
      logger.info('Registering courses routes...');
      v1Router.use('/courses', courseRoutes);
      logger.info('Courses routes registered successfully');
      logger.info('Registering companies routes...');
      v1Router.use('/companies', companyRoutes);
      logger.info('Companies routes registered successfully');
      logger.info('Registering company sites routes...');
      v1Router.use('/company-sites', companySitesRoutes);
      logger.info('Company sites routes registered successfully');
      logger.info('Registering sorveglianza sanitaria routes...');
      v1Router.use('/companies/:companyId/sorveglianza-sanitaria', sorveglianzaSanitariaRoutes);
      logger.info('Sorveglianza sanitaria routes registered successfully');
      logger.info('Registering DVR routes...');
      v1Router.use('/dvr', dvrRoutes);
      logger.info('DVR routes registered successfully');
      logger.info('Registering sopralluogo routes...');
      v1Router.use('/sopralluogo', sopralluogoRoutes);
      logger.info('Sopralluogo routes registered successfully');
      logger.info('Registering reparto routes...');
      v1Router.use('/reparto', repartoRoutes);
      logger.info('Reparto routes registered successfully');
      logger.info('Registering employees routes...');
      v1Router.use('/employees', employeesRouter);
      logger.info('Employees routes registered successfully');
      logger.info('Registering trainers routes...');
      v1Router.use('/trainers', trainersRouter);
      logger.info('Trainers routes registered successfully');
      logger.info('Registering virtual entities routes...');
      v1Router.use('/virtual-entities', virtualEntitiesRouter);
      logger.info('Virtual entities routes registered successfully');
      logger.info('Registering users routes...');
      v1Router.use('/users', userRoutes);
      logger.info('Users routes registered successfully');
      logger.info('Registering persons routes...');
      v1Router.use('/persons', personRoutes);
      logger.info('Persons routes registered successfully');

      // Credentials management (password reset, credential cards)
      logger.info('Registering credentials routes...');
      v1Router.use('/credentials', credentialsRoutes);
      logger.info('Credentials routes registered successfully');

      // Messaging configuration (SMTP, WhatsApp)
      logger.info('Registering messaging routes...');
      v1Router.use('/messaging', messagingRoutes);
      logger.info('Messaging routes registered successfully');

      // Public brand settings (Management widget tenant config)
      logger.info('Registering public brand settings routes...');
      v1Router.use('/management/public-brand-settings', publicBrandSettingsRoutes);
      logger.info('Public brand settings routes registered successfully');

      // P75: API Keys management (gestione chiavi embed per tenant)
      logger.info('Registering public API keys routes...');
      v1Router.use('/management/api-keys', publicApiKeysRoutes);
      logger.info('Public API keys routes registered successfully');

      logger.info('Registering gdpr routes...');
      v1Router.use('/gdpr', gdprRoutes);
      logger.info('GDPR routes registered successfully');
      v1Router.use('/roles', roleRoutes);
      v1Router.use('/', permissionRoutes);

      // Registra route advanced-permissions
      logger.info('Registering advanced-permissions routes...');
      v1Router.use('/advanced-permissions', advancedPermissionsRoutes);
      logger.info('Advanced-permissions routes registered successfully');

      // Registra route dashboard
      // P57: Apply brand detection for cross-tenant admin access
      logger.info('Registering dashboard routes...');
      v1Router.use('/dashboard', brandDetectionMiddleware, dashboardRoutes);
      logger.info('Dashboard routes registered successfully');

      logger.info('Registering settings routes...');
      v1Router.use('/impostazioni', settingsRoutes);
      logger.info('Settings routes registered successfully');
      v1Router.use('/tenants', tenantRoutes);
      logger.info('Registering schedules routes...');
      v1Router.use('/schedules', scheduleRoutes);
      logger.info('Schedules routes registered successfully');

      // Registra route CMS
      logger.info('Registering CMS routes...');
      v1Router.use('/cms', cmsRoutes);
      logger.info('CMS routes registered successfully');

      // Registra route CMS Media
      logger.info('Registering CMS Media routes...');
      v1Router.use('/cms/media', cmsMediaRoutes);
      logger.info('CMS Media routes registered successfully');

      // Registra route CMS Analytics
      logger.info('Registering CMS Analytics routes...');
      v1Router.use('/cms/analytics', cmsAnalyticsRoutes);
      logger.info('CMS Analytics routes registered successfully');

      // Registra route CMS Pre-render (SSG)
      logger.info('Registering CMS Pre-render routes...');
      v1Router.use('/cms/prerender', cmsPrerenderRoutes);
      logger.info('CMS Pre-render routes registered successfully');

      // Registra route advanced-submissions PRIMA delle route submissions generiche
      // IMPORTANTE: Le route più specifiche devono essere registrate prima di quelle generiche
      logger.info('Registering advanced-submissions routes...');
      v1Router.use('/submissions/advanced', advancedSubmissionsRoutes);
      logger.info('Advanced-submissions routes registered successfully');

      // Registra route submissions (dopo advanced-submissions per evitare conflitti)
      logger.info('Registering submissions routes...');
      v1Router.use('/submissions', submissionRoutes);
      logger.info('Submissions routes registered successfully');

      // Registra route form-templates (legacy)
      logger.info('Registering form-templates routes...');
      v1Router.use('/form-templates', formTemplatesRoutes);
      logger.info('Form-templates routes registered successfully');

      // Registra route forms (unified - nuovo sistema)
      logger.info('Registering unified forms routes...');
      v1Router.use('/forms', formsRoutes);
      logger.info('Unified forms routes registered successfully');

      // Registra route SEO
      logger.info('Registering SEO routes...');
      v1Router.use('/seo', seoRoutes);
      logger.info('SEO routes registered successfully');

      // Registra route Sitemap
      logger.info('Registering sitemap routes...');
      v1Router.use('/sitemap', sitemapRoutes);
      logger.info('Sitemap routes registered successfully');

      // Registra route activity-logs
      logger.info('Registering activity-logs routes...');
      v1Router.use('/activity-logs', activityLogsRoutes);
      logger.info('Activity-logs routes registered successfully');

      // Registra route activity (nuovo sistema GDPR compliant)
      logger.info('Registering activity routes (GDPR compliant)...');
      v1Router.use('/activity', activityRoutes);
      logger.info('Activity routes registered successfully');

      // Registra route template management
      logger.info('Registering template routes...');
      v1Router.use('/templates', templateRoutes);
      logger.info('Template routes registered successfully');

      // Registra route Google OAuth2
      logger.info('Registering Google OAuth2 routes...');
      v1Router.use('/google', googleAuthRoutes);
      logger.info('Google OAuth2 routes registered successfully');

      // Registra route document management
      logger.info('Registering document routes...');
      v1Router.use('/documents', documentRoutes);
      logger.info('Document routes registered successfully');

      // Registra route lettere incarico
      logger.info('Registering lettere incarico routes...');
      v1Router.use('/lettere-incarico', lettereIncaricoRoutes);
      logger.info('Lettere incarico routes registered successfully');

      // Registra route registri presenze
      logger.info('Registering registri presenze routes...');
      v1Router.use('/registri-presenze', registriPresenzeRoutes);
      logger.info('Registri presenze routes registered successfully');

      // Registra route attestati
      logger.info('Registering attestati routes...');
      v1Router.use('/attestati', attestatiRoutes);
      logger.info('Attestati routes registered successfully');

      // Registra route preventivi
      logger.info('Registering preventivi routes...');
      v1Router.use('/preventivi', preventiviRoutes);
      logger.info('Preventivi routes registered successfully');

      // Registra route course-tests
      logger.info('Registering course-tests routes...');
      v1Router.use('/course-tests', courseTestsRoutes);
      logger.info('Course-tests routes registered successfully');

      // Registra route codici sconto
      logger.info('Registering codici sconto routes...');
      v1Router.use('/codici-sconto', codiciScontoRoutes);
      logger.info('Codici sconto routes registered successfully');

      // Registra route import CSV (Company, Employee, Trainer)
      logger.info('Registering import routes...');
      v1Router.use('/import', importRoutes);
      logger.info('Import routes registered successfully');

      // Registra route backup/restore
      logger.info('Registering backup routes...');
      v1Router.use('/backup', backupRoutes);
      logger.info('Backup routes registered successfully');

      // Registra route clinica (Poliambulatorio)
      logger.info('Registering clinica routes...');
      v1Router.use('/clinica', clinicaRoutes);
      logger.info('Clinica routes registered successfully');

      // Registra route sicurezza (ElementSicurezza - OT23, etc.)
      logger.info('Registering sicurezza routes...');
      v1Router.use('/sicurezza', sicurezzaRoutes);
      logger.info('Sicurezza routes registered successfully');

      // Registra route tariffario aziendale (Medicina del Lavoro)
      logger.info('Registering tariffario aziendale routes...');
      v1Router.use('/tariffari-aziendali', tariffarioAziendaleRoutes);
      logger.info('Tariffario aziendale routes registered successfully');

      // Consulenze MDL (per-azienda tracking consulenze Medicina del Lavoro)
      logger.info('Registering consulenze-mdl routes...');
      v1Router.use('/consulenze-mdl', consulenzeMDLRoutes);
      logger.info('Consulenze MDL routes registered successfully');

      // Uscite MC (uscite medico competente con movimentazione contabile)
      logger.info('Registering uscite-mc routes...');
      v1Router.use('/uscite-mc', usciteMCRoutes);
      logger.info('Uscite MC routes registered successfully');

      // Project 59 - MovimentoContabile (COSTI e RICAVI unificati)
      logger.info('Registering movimenti contabili routes...');
      v1Router.use('/movimenti-contabili', movimentoContabileRoutes);
      logger.info('Movimenti contabili routes registered successfully');

      // P97 - Fatturazione Elettronica & SistemaTS Integration
      logger.info('Registering enti-emittenti routes...');
      v1Router.use('/billing/enti-emittenti', entiEmittentiRoutes);
      logger.info('Enti emittenti routes registered successfully');
      logger.info('Registering fatturazione-elettronica routes...');
      v1Router.use('/billing/fatture', fatturazioneElettronicaRoutes);
      logger.info('Fatturazione elettronica routes registered successfully');
      logger.info('Registering sistema-ts routes...');
      v1Router.use('/billing/sistema-ts', sistemaTsRoutes);
      logger.info('Sistema TS routes registered successfully');

      // P98 - Desktop Sync (MDL Offline-First)
      logger.info('Registering desktop-sync routes...');
      v1Router.use('/desktop-sync', desktopSyncRoutes);
      logger.info('Desktop-sync routes registered successfully');

      // P98 - Desktop App Licenses
      logger.info('Registering desktop-licenses routes...');
      v1Router.use('/desktop-licenses', desktopLicensesRoutes);
      logger.info('Desktop-licenses routes registered successfully');

      // Project 43 - Multi-tenant access management
      logger.info('Registering person-tenant-access routes...');
      v1Router.use('/person-tenant-access', personTenantAccessRoutes);
      logger.info('Person-tenant-access routes registered successfully');

      // Feature Catalog
      logger.info('Registering feature-catalog routes...');
      v1Router.use('/feature-catalog', featureCatalogRoutes);
      logger.info('Feature-catalog routes registered successfully');

      // Project 48 - Person Multi-Tenant Routes
      logger.info('Registering person-profiles routes...');
      v1Router.use('/person-profiles', personTenantProfileRoutes);
      logger.info('Person-profiles routes registered successfully');

      logger.info('Registering person-consents routes...');
      v1Router.use('/person-consents', personConsentRoutes);
      logger.info('Person-consents routes registered successfully');

      // Project 57 - Cross-Tenant Approval System
      logger.info('Registering cross-tenant approval routes...');
      v1Router.use('/cross-tenant-approvals', crossTenantApprovalRoutes);
      logger.info('Cross-tenant approval routes registered successfully');

      // Project 65 - FSE Integration: Firma Digitale, Consensi FSE, CDA HL7
      logger.info('Registering signature routes...');
      v1Router.use('/signatures', signatureRoutes);
      logger.info('Signature routes registered successfully');

      logger.info('Registering consent-fse routes...');
      v1Router.use('/consent-fse', consentFseRoutes);
      logger.info('Consent-fse routes registered successfully');

      logger.info('Registering CDA routes...');
      v1Router.use('/cda', cdaRoutes);
      logger.info('CDA routes registered successfully');

      // Project 66 - Sistema Scadenze Centralizzato (Deadlines & Farmaci)
      logger.info('Registering scadenze routes...');
      v1Router.use('/scadenze', scadenzeRoutes);
      logger.info('Scadenze routes registered successfully');

      // Project 68 - HR Personnel Management (Personale Interno)
      logger.info('Registering HR routes...');
      v1Router.use('/hr', hrRoutes);
      logger.info('HR routes registered successfully');

      // P74 - Document Management (procedure interne + documenti marketing)
      logger.info('Registering internal documents routes...');
      v1Router.use('/management/documenti', internalDocumentsRoutes);
      logger.info('Internal documents routes registered successfully');

      logger.info('Registering management control routes...');
      v1Router.use('/management/controllo-gestione', controlloGestioneRoutes);
      logger.info('Management control routes registered successfully');

      // System routes (logs, config)
      logger.info('Registering system routes...');
      v1Router.use('/', systemRoutes);
      logger.info('System routes registered successfully');

      // Project 47 - Advanced Notification System
      logger.info('Registering advanced notification routes...');
      v1Router.use('/notifications/advanced', advancedNotificationRoutes);
      logger.info('Advanced notification routes registered successfully');

      // Project 47 - Fase 9: Calendar Integration
      logger.info('Registering calendar integration routes...');
      v1Router.use('/notifications/calendar', calendarRoutes);
      logger.info('Calendar integration routes registered successfully');

      // Clinical Calendar Routes (ICS export, Google Calendar sync)
      v1Router.use('/calendar', clinicalCalendarRoutes);

      // Notification Sending Routes (Email/SMS/WhatsApp channels)
      v1Router.use('/notifications', notificationSendingRoutes);

      // Registra route pubbliche: /api/v1/public/ (canonical) + /api/public/ (legacy per browser cache)
      logger.info('Registering public courses routes...');
      this.app.use('/api/v1/public', publicCoursesRoutes);
      this.app.use('/api/public', publicCoursesRoutes); // legacy fallback per bundle cachati
      logger.info('Public courses routes registered successfully');

      logger.info('Registering public forms routes...');
      this.app.use('/api/v1/public/forms', publicFormsRoutes);
      logger.info('Public forms routes registered successfully');

      logger.info('Registering public contact submissions routes...');
      this.app.use('/api/v1/public/contact-submissions', publicContactSubmissionsRoutes);
      logger.info('Public contact submissions routes registered successfully');

      logger.info('Registering public verify routes...');
      this.app.use('/api/v1/public', publicVerifyRoutes);
      logger.info('Public verify routes registered successfully');

      // P53.1: Mobile Queue Check-in Routes
      logger.info('Registering public queue routes...');
      this.app.use('/api/v1/public/queue', publicQueueRoutes);
      logger.info('Public queue routes registered successfully');

      // P67: Public Booking Routes
      logger.info('Registering public booking routes...');
      this.app.use('/api/v1/public', publicBookingRoutes);
      logger.info('Public booking routes registered successfully');

      // Public Doctor Profiles
      logger.info('Registering public doctors routes...');
      this.app.use('/api/v1/public', publicDoctorsRoutes);
      logger.info('Public doctors routes registered successfully');

      // Consenso Firma Tablet (paziente su tablet — no auth)
      logger.info('Registering public consenso firma routes...');
      this.app.use('/api/v1/public/consenso-firma', publicConsensoFirmaRoutes);
      logger.info('Public consenso firma routes registered successfully');
      this.app.use('/api/v1/public/tablet', publicTabletRoutes);
      logger.info('Public tablet routes registered successfully');

      // Public Analytics (tracking: no auth, reading: con auth)
      this.app.use('/api/public/analytics', publicAnalyticsRoutes);
      this.app.use('/api/v1/analytics/public', publicAnalyticsRoutes);
      logger.info('Public analytics routes registered successfully');

      // P75: Public Embed (widget JS per siti esterni — authenticati via API key nel path)
      this.app.use('/api/public/embed', publicEmbedRoutes);
      logger.info('Public embed routes (P75) registered successfully');

      // Bridge Activation (public — bridge si auto-attiva con codice licenza)
      this.app.use('/api/v1/public/bridge', bridgeActivationRoutes);
      logger.info('Bridge activation routes registered successfully');

      // NOTE: Legacy routes removed - all clients now use /api/v1/ endpoints directly
      // See: Project 46 E2E optimization (2025-01-14)
      // Removed: /courses, /employees, /trainers, /virtual-entities

      logger.info('Setting up rate limiting...');
      // Rate limiting automatico per route specifiche
      this.app.use('/api/auth/login', this.rateLimiters.login);
      this.app.use('/api/*/upload', this.rateLimiters.upload);
      logger.info('Rate limiting configured successfully');

      logger.info('Setting up counters endpoint...');
      // Endpoint /api/v1/counters per dashboard
      v1Router.get('/counters', authenticate, tenantMiddleware, async (req, res) => {
        try {

          // P57: Support multi-tenant filtering via tenantIds query param
          const { tenantIds, allTenants } = req.query;
          let tenantCondition;

          if (allTenants === 'true') {
            // Super admin viewing all tenants
            tenantCondition = {};
            logger.info('[COUNTERS] Fetching counts for ALL tenants');
          } else if (tenantIds) {
            // Multiple tenant IDs provided
            const ids = tenantIds.split(',').map(id => id.trim()).filter(Boolean);
            tenantCondition = { tenantId: { in: ids } };
            logger.info('[COUNTERS] Fetching counts for tenants:', ids);
          } else {
            // Default: use JWT tenant (validated via getEffectiveTenantId, never raw header)
            const tenantId = getEffectiveTenantId(req);
            if (!tenantId) {
              return res.status(400).json({ error: 'Tenant non trovato o non attivo' });
            }
            tenantCondition = { tenantId };
            logger.info('[COUNTERS] Fetching counts for tenant:', tenantId);
          }

          // P49: Conteggio aziende tramite CompanyTenantProfile (Company è globale)
          const companiesCount = await prisma.companyTenantProfile.count({
            where: {
              ...tenantCondition,
              deletedAt: null
            }
          });

          // Conteggio dipendenti con ruolo EMPLOYEE (persone non cancellate E ruoli non cancellati)
          const employeesCount = await prisma.personRole.count({
            where: {
              ...tenantCondition,
              roleType: 'EMPLOYEE',
              deletedAt: null,
              person: {
                deletedAt: null
              }
            }
          });

          logger.info('[COUNTERS] Results:', {
            tenantCondition,
            companies: companiesCount,
            employees: employeesCount
          });

          res.json({
            companies: companiesCount,
            employees: employeesCount
          });
        } catch (error) {
          logger.error('Error in /api/counters endpoint', {
            error: error.message,
            stack: error.stack,
            tenantId: req.person?.tenantId
          });
          res.status(500).json({ error: 'Errore interno del server' });
        }
      });
      logger.info('Counters endpoint configured successfully');

      logger.info('Setting up 404 handler...');
      // 404 handler
      this.app.use('*', (req, res) => {
        res.status(404).json({
          error: 'Rotta non trovata',
          code: 'NOT_FOUND'
        });
      });
      logger.info('404 handler configured successfully');

      logger.info('Routes configuration completed successfully');

    } catch (error) {
      logger.error('Error during routes configuration', {
        service: 'api-server',
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Configura error handling
   */
  configureErrorHandling() {
    try {
      logger.info('Configuring error handling...');
      this.app.use(errorHandler);
      logger.info('Error handling configured successfully');
    } catch (error) {
      logger.error('Error during error handling configuration', {
        service: 'api-server',
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Avvia il server
   */
  async start() {
    try {
      logger.info('Starting API Server...');

      // Validazione env critiche (fail-fast)
      this.validateEnvironment();

      // Inizializzazione sequenziale
      logger.info('Initializing configurations...');
      await this.initializeConfigurations();
      logger.info('Configurations initialized successfully');

      logger.info('Initializing services...');
      await this.initializeServices();
      logger.info('Services initialized successfully');

      logger.info('Initializing lifecycle manager services...');
      await this.lifecycleManager.initializeServices();
      logger.info('Lifecycle manager services initialized successfully');

      // Configurazione middleware e route
      logger.info('Configuring middleware...');
      this.configureMiddleware();
      logger.info('Middleware configured successfully');

      logger.info('Configuring routes...');
      this.configureRoutes();
      logger.info('Routes configured successfully');

      logger.info('Configuring error handling...');
      this.configureErrorHandling();
      logger.info('Error handling configured successfully');

      // Avvio server
      logger.info('Starting HTTP server...');
      const port = process.env.API_PORT || 4001;
      const host = process.env.API_HOST || '127.0.0.1';
      this.server = this.app.listen(port, host, () => {
        logger.info('API Server started successfully', {
          service: 'api-server',
          port,
          host,
          environment: process.env.NODE_ENV || 'development',
          pid: process.pid
        });

        // Project 47 - Initialize WebSocket for real-time notifications
        try {
          NotificationSocketService.initialize(this.server);
          logger.info('WebSocket notification service initialized', {
            service: 'api-server',
            path: '/ws/notifications'
          });
        } catch (wsError) {
          logger.warn('Failed to initialize WebSocket notification service', {
            service: 'api-server',
            error: wsError.message
          });
        }

        // Project 47 - Initialize EventBus and register event handlers
        try {
          // Register notification event handlers to transform domain events into notifications
          NotificationEventHandler.register();
          logger.info('EventBus initialized with NotificationEventHandler', {
            service: 'api-server',
            eventBus: 'EventBus singleton',
            handlers: 'NotificationEventHandler'
          });

          // Project 47 - Fase 3: Initialize Rule Engine
          NotificationRuleEngine.initialize();
          logger.info('NotificationRuleEngine initialized', {
            service: 'api-server',
            ruleEngine: 'NotificationRuleEngine singleton'
          });

          // Project 47 - Fase 7: Setup Escalation Cron Job
          cron.schedule('*/5 * * * *', async () => {
            try {
              await NotificationEscalationService.processEscalations();
            } catch (error) {
              logger.error({
                service: 'api-server',
                error: error.message
              }, 'Escalation cron job failed');
            }
          });
          logger.info('Escalation cron job scheduled (every 5 minutes)', {
            service: 'api-server',
            schedule: '*/5 * * * *'
          });

          // P68: Weekly Slot Auto-Generation Cron Job
          // Runs every Monday at 2:00 AM to generate slots for the next 3 months
          cron.schedule('0 2 * * 1', async () => {
            try {
              logger.info('P68: Starting weekly slot auto-generation job', {
                service: 'api-server',
                timestamp: new Date().toISOString()
              });
              await SlotDisponibilitaService.autoGenerateSlots();
            } catch (error) {
              logger.error({
                service: 'api-server',
                error: error.message
              }, 'P68: Slot auto-generation cron job failed');
            }
          });
          logger.info('P68: Slot auto-generation cron job scheduled (every Monday 2 AM)', {
            service: 'api-server',
            schedule: '0 2 * * 1'
          });

          // P68: Daily slot catch-up generation (6 AM) - ensures no gaps if server was down
          cron.schedule('0 6 * * *', async () => {
            try {
              logger.info('P68: Starting daily slot catch-up generation', {
                service: 'api-server',
                timestamp: new Date().toISOString()
              });
              await SlotDisponibilitaService.autoGenerateSlots();
            } catch (error) {
              logger.error({
                service: 'api-server',
                error: error.message
              }, 'P68: Daily slot catch-up generation failed');
            }
          });
          logger.info('P68: Daily slot catch-up cron scheduled (6 AM)', {
            service: 'api-server',
            schedule: '0 6 * * *'
          });

          // P70: Queue auto-generation — sessioni coda mattina (6:30)
          cron.schedule('30 6 * * *', async () => {
            try {
              logger.info('P70: Queue auto-generation MATTINA started', {
                service: 'api-server',
                timestamp: new Date().toISOString()
              });
              const result = await QueueAutoGeneratorService.generateMorningSlots();
              logger.info('P70: Queue auto-generation MATTINA completed', {
                service: 'api-server',
                ...result,
              });
            } catch (error) {
              logger.error({
                service: 'api-server',
                error: error.message
              }, 'P70: Queue auto-generation MATTINA failed');
            }
          }, { timezone: 'Europe/Rome' });
          logger.info('P70: Queue morning auto-generation cron scheduled (6:30 Europe/Rome)', {
            service: 'api-server',
            schedule: '30 6 * * *'
          });

          // P70: Queue auto-generation — sessioni coda pomeriggio (13:30)
          cron.schedule('30 13 * * *', async () => {
            try {
              logger.info('P70: Queue auto-generation POMERIGGIO started', {
                service: 'api-server',
                timestamp: new Date().toISOString()
              });
              const result = await QueueAutoGeneratorService.generateAfternoonSlots();
              logger.info('P70: Queue auto-generation POMERIGGIO completed', {
                service: 'api-server',
                ...result,
              });
            } catch (error) {
              logger.error({
                service: 'api-server',
                error: error.message
              }, 'P70: Queue auto-generation POMERIGGIO failed');
            }
          }, { timezone: 'Europe/Rome' });
          logger.info('P70: Queue afternoon auto-generation cron scheduled (13:30 Europe/Rome)', {
            service: 'api-server',
            schedule: '30 13 * * *'
          });

          // P97: Fatturazione Elettronica — SDI status polling
          // Aggiorna lo stato delle fatture "In attesa SDI" ogni 30 minuti
          // (fallback al webhook AcubeAPI in caso di mancante/fallita notifica)
          startSdiPolling(cron);

          // P46: MDL — Generazione mensile automatica dei movimenti contabili periodici
          // (spese fisse/ricorrenti del tariffario aziendale) per tutte le aziende.
          // 1° del mese, 03:00 Europe/Rome — orario di basso carico. Idempotente per periodo.
          startPeriodicBilling(cron);

          // P66/P71: MDL — Nightly EOD Giudizi Idoneità notifications + ZIP aziende (22:00 Italy time)
          cron.schedule('0 22 * * *', async () => {
            try {
              logger.info('P66: Starting EOD giudizi idoneità email batch', {
                service: 'api-server',
                timestamp: new Date().toISOString()
              });
              const stats = await GiudizioEmailService.sendDailyGiudiziNotifications();
              logger.info('P66: EOD giudizi email batch completed', {
                service: 'api-server',
                ...stats
              });
            } catch (error) {
              logger.warn('P66: EOD giudizi email cron failed', {
                service: 'api-server',
                error: error.message
              });
            }

            // P71: ZIP batch giornaliero idoneità → aziende
            try {
              logger.info('P71: Starting daily ZIP idoneità → aziende batch', {
                service: 'api-server',
                timestamp: new Date().toISOString()
              });
              const zipStats = await IdoneityNotificationService.sendDailyZipToCompanies();
              logger.info('P71: ZIP aziende batch completed', {
                service: 'api-server',
                ...zipStats
              });
            } catch (zipError) {
              logger.warn('P71: ZIP aziende cron failed', {
                service: 'api-server',
                error: zipError.message
              });
            }
          }, { timezone: 'Europe/Rome' });
          logger.info('P66/P71: EOD cron scheduled (22:00 Europe/Rome)', {
            service: 'api-server',
            schedule: '0 22 * * *'
          });

          // Subscription expiry check — ogni giorno alle 3:00 AM
          cron.schedule('0 3 * * *', async () => {
            try {
              logger.info('Subscription check cron started', { service: 'api-server' });
              const tenantService = (await import('../services/tenantService.js')).default;
              const result = await tenantService.checkExpiredSubscriptions();
              logger.info('Subscription check cron completed', {
                service: 'api-server',
                ...result
              });
            } catch (subError) {
              logger.error('Subscription check cron failed', {
                service: 'api-server',
                error: subError.message
              });
            }
          }, { timezone: 'Europe/Rome' });
          logger.info('Subscription expiry cron scheduled (3:00 AM Europe/Rome)', {
            service: 'api-server',
            schedule: '0 3 * * *'
          });

          // Daily nomination check — ogni giorno alle 1:00 AM
          // Verifica nomine scadute, attiva successori, genera movimenti contabili
          cron.schedule('0 1 * * *', async () => {
            try {
              logger.info('NominaCheck cron started', { service: 'api-server' });
              const NominaCheckService = (await import('../services/clinical/NominaCheckService.js')).default;
              const result = await NominaCheckService.dailyCheck();
              logger.info('NominaCheck cron completed', {
                service: 'api-server',
                ...result
              });
            } catch (nominaError) {
              logger.error('NominaCheck cron failed', {
                service: 'api-server',
                error: nominaError.message
              });
            }
          }, { timezone: 'Europe/Rome' });
          logger.info('NominaCheck cron scheduled (1:00 AM Europe/Rome)', {
            service: 'api-server',
            schedule: '0 1 * * *'
          });

          // P68: Generate slots on startup (catch-up after restart/deploy)
          setTimeout(async () => {
            try {
              logger.info('P68: Running startup slot auto-generation', {
                service: 'api-server',
                timestamp: new Date().toISOString()
              });
              await SlotDisponibilitaService.autoGenerateSlots();
              logger.info('P68: Startup slot auto-generation completed', {
                service: 'api-server'
              });
            } catch (error) {
              logger.error({
                service: 'api-server',
                error: error.message
              }, 'P68: Startup slot auto-generation failed');
            }
          }, 10000); // 10s delay to let server fully initialize

          // Ensure default templates exist for all tenants (creates missing, never overwrites)
          setTimeout(async () => {
            try {
              logger.info('Verifica template predefiniti in corso', {
                service: 'api-server',
                timestamp: new Date().toISOString()
              });
              const result = await DefaultTemplateService.ensureAllTenants();
              logger.info('Verifica template predefiniti completata', {
                service: 'api-server',
                tenants: result.tenants,
                created: result.totalCreated,
                skipped: result.totalSkipped
              });
            } catch (error) {
              logger.error({
                service: 'api-server',
                error: error.message
              }, 'Verifica template predefiniti fallita');
            }
          }, 15000); // 15s delay to let server fully initialize
        } catch (eventBusError) {
          logger.warn('Failed to initialize EventBus or RuleEngine', {
            service: 'api-server',
            error: eventBusError.message
          });
        }
      });
      logger.info('HTTP server listener created successfully');

      // Graceful shutdown
      logger.info('Setting up graceful shutdown...');
      this.setupGracefulShutdown();
      logger.info('Graceful shutdown configured successfully');

      logger.info('API Server startup completed successfully');

    } catch (error) {
      logger.error('Failed to start API Server', {
        service: 'api-server',
        error: error.message,
        stack: error.stack
      });

      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Configura graceful shutdown
   */
  setupGracefulShutdown() {
    const handleShutdown = async (signal) => {
      if (this.isShuttingDown) return;

      logger.info(`Received ${signal}, starting graceful shutdown...`, {
        service: 'api-server'
      });

      await this.shutdown();
      process.exit(0);
    };

    // Abilita graceful shutdown in tutti gli ambienti
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  }

  /**
   * Shutdown del server
   */
  async shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info('Shutting down API Server...', { service: 'api-server' });

    try {
      // Stop health monitoring
      healthCheckManager.stopMonitoring();

      // Project 47 - Shutdown WebSocket
      try {
        await NotificationSocketService.shutdown();
        logger.info('WebSocket notification service shut down', { service: 'api-server' });
      } catch (wsError) {
        logger.warn('Failed to shutdown WebSocket service', {
          service: 'api-server',
          error: wsError.message
        });
      }

      // Shutdown servizi tramite lifecycle manager
      await this.lifecycleManager.shutdownServices();

      // Chiudi server HTTP
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
      }

      logger.info('API Server shutdown completed', { service: 'api-server' });

    } catch (error) {
      logger.error('Error during API Server shutdown', {
        service: 'api-server',
        error: error.message
      });
    }
  }
}

// Avvio del server
// Detect if running as main module (supports PM2 fork mode)
const isRunningUnderPM2 = !!(process.env.PM2_HOME || process.env.pm_id !== undefined);
const currentModuleUrl = import.meta.url;
const mainModuleUrl = `file://${process.argv[1]}`;
const normalizedCurrentUrl = decodeURIComponent(currentModuleUrl);
const normalizedMainUrl = decodeURIComponent(mainModuleUrl);
const isMainModule = isRunningUnderPM2 || normalizedCurrentUrl === normalizedMainUrl;

if (isMainModule) {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection detected', {
      service: 'api-server',
      reason: reason,
      promise: promise
    });
    logger.error('UNHANDLED REJECTION:', reason);
    process.exit(1);
  });

  // Usa setTimeout per dare tempo al motore JavaScript di completare la definizione della classe
  setTimeout(() => {
    try {
      const server = new APIServer();
      server.start().catch(error => {
        logger.error('Failed to start server', {
          service: 'api-server',
          error: error.message,
          stack: error.stack
        });
        process.exit(1);
      });
    } catch (error) {
      logger.error('Failed to create APIServer instance', {
        service: 'api-server',
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    }
  }, 100);
}

export default APIServer;
export { APIServer };
