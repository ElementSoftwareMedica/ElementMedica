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
import performanceMonitor from '../middleware/performance.js';
import { authMiddleware, authenticate } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { errorHandler } from '../middleware/errorHandler.js';

// Routes
import authRoutes from '../routes/auth.js';
import courseRoutes from '../routes/courses-routes.js';
import companyRoutes from '../routes/companies-routes.js';
import companySitesRoutes from '../routes/company-sites-routes.js';
import dvrRoutes from '../routes/dvr-routes.js';
import sopralluogoRoutes from '../routes/sopralluogo-routes.js';
import repartoRoutes from '../routes/reparto-routes.js';
import { employeesRouter, trainersRouter, virtualEntitiesRouter } from '../routes/virtualEntityRoutes.js';
import userRoutes from '../routes/users-routes.js';
import personRoutes from '../routes/persone.js';
import gdprRoutes from '../routes/gdpr.js';
import roleRoutes from '../routes/roles.js';
import permissionRoutes from '../routes/v1/permissions.js';
import advancedPermissionsRoutes from '../routes/advanced-permissions.js';
import settingsRoutes from '../routes/impostazioni.js';
import tenantRoutes from '../routes/tenant.js';
import dashboardRoutes from '../routes/dashboard-routes.js';
import scheduleRoutes from '../routes/schedules-routes.js';
import cmsRoutes from '../routes/cms-routes.js';
import publicCoursesRoutes from '../routes/public-courses-routes.js';
import publicFormsRoutes from '../routes/public-forms-routes.js';
import submissionRoutes from '../routes/v1/submission-routes.js';
import formTemplatesRoutes from '../routes/form-templates-routes.js';
import advancedSubmissionsRoutes from '../routes/advanced-submissions-routes.js';
import activityLogsRoutes from '../routes/activity-logs-routes.js';

// Utils
import { logger } from '../utils/logger.js';
import { createPrismaMiddleware } from '../config/prisma-optimization.js';

// Configurazione ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

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
   */
  async initializeServices() {
    logger.info('Initializing services...', { service: 'api-server' });
    
    // TEMPORANEAMENTE DISABILITATO TUTTI I SERVIZI PER DEBUG
    // Database Service
    // const databaseService = {
    //   initialize: async () => {
    //     this.databaseService = new DatabaseService();
    //     try {
    //       await this.databaseService.initialize();
    //       logger.info('Database service initialized successfully', { service: 'api-server' });
    //     } catch (error) {
    //       logger.error('Database service initialization failed', {
    //         service: 'api-server',
    //         error: error.message,
    //         stack: error.stack
    //       });
    //       throw error;
    //     }
    //     
    //     // Registra health check per database
    //     healthCheckManager.registerCheck(
    //       'database',
    //       createDatabaseHealthCheck(this.databaseService.getClient())
    //     );
    //   },
    //   shutdown: async () => {
    //     if (this.databaseService) {
    //       await this.databaseService.disconnect();
    //     }
    //   },
    //   priority: PRIORITY.CRITICAL
    // };
    
    // Redis Service
    // const redisService = {
    //   initialize: async () => {
    //     this.redisService = new RedisService();
    //     await this.redisService.connect();
    //     
    //     // Registra health check per Redis
    //     healthCheckManager.registerCheck(
    //       'redis',
    //       createRedisHealthCheck(this.redisService.client)
    //     );
    //   },
    //   shutdown: async () => {
    //     if (this.redisService) {
    //       await this.redisService.disconnect();
    //     }
    //   },
    //   priority: PRIORITY.CRITICAL
    // };
    
    // Google API Service - Temporaneamente disabilitato per debug
    // const googleAPIService = {
    //   initialize: async () => {
    //     this.googleAPIService = new GoogleAPIService();
    //     await this.googleAPIService.initialize();
    //   },
    //   shutdown: async () => {
    //     if (this.googleAPIService) {
    //       await this.googleAPIService.shutdown();
    //     }
    //   },
    //   priority: PRIORITY.MEDIUM
    // };
    
    // Registra servizi nel lifecycle manager
    // this.lifecycleManager
    //   .registerService('database', databaseService); // Temporaneamente disabilitato per debug
      // .registerService('redis', redisService); // Temporaneamente disabilitato - Redis non disponibile
      // .registerService('googleAPI', googleAPIService); // Temporaneamente disabilitato
    
    // Avvia health check monitoring
    // healthCheckManager.startMonitoring(); // Temporaneamente disabilitato per debug
    
    logger.info('Services initialization skipped for debug', { service: 'api-server' });
  }
  
  /**
   * Configura middleware utilizzando il middleware manager
   */
  configureMiddleware() {
    logger.info('Configuring middleware...', { service: 'api-server' });
    
    try {
      // PRIMO MIDDLEWARE: Debug molto semplice per verificare che il server funzioni
      this.app.use((req, res, next) => {
        // Log rimosso per ridurre rumore
        next();
      });
      
      this.middlewareManager.register('security', this.securityConfig.helmet, { priority: 10 });
      // CRITICO: CORS riabilitato per permettere l'impostazione dei cookie
      this.middlewareManager.register('cors', cors(this.corsConfig), { priority: 20 });
      
      // Body parser middleware - DEVE essere prima del rate limiting per evitare conflitti
      // Wrapper per body parser JSON
      const debugJsonParser = (req, res, next) => {
        this.bodyParsers.json(req, res, (err) => {
          if (err) {
            // Log solo errori critici
            console.error('❌ [JSON PARSER] Error:', err);
          }
          next(err);
        });
      };
      
      // Wrapper per body parser URL-encoded
      const debugUrlencodedParser = (req, res, next) => {
        this.bodyParsers.urlencoded(req, res, (err) => {
          if (err) {
            // Log solo errori critici
            console.error('❌ [URLENCODED PARSER] Error:', err);
          }
          next(err);
        });
      };
      
      this.middlewareManager.register('bodyParserJson', debugJsonParser, { 
        priority: 25, 
        enabled: true,
        environment: ['development', 'production', 'test']
      });
      this.middlewareManager.register('bodyParserUrlencoded', debugUrlencodedParser, { 
        priority: 26, 
        enabled: true,
        environment: ['development', 'production', 'test']
      });
      
      // Debug middleware per ispezionare il body (disabilitato per ridurre log)
      this.middlewareManager.register('debugBody', (req, res, next) => {
        // Debug disabilitato per ridurre rumore nei log
        next();
      }, {
        enabled: false,
        priority: 27,
        environment: ['development']
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
        '/api/v1/auth/register',
        '/api/v1/auth/forgot-password',
        '/api/v1/auth/reset-password',
        '/api/v2/auth/login',
        '/api/v2/auth/register',
        '/api/v2/auth/forgot-password',
        '/api/v2/auth/reset-password',
        '/api/roles/public',    // Solo l'endpoint pubblico dei ruoli
        '/api/roles/test-simple', // Endpoint di test semplice
        '/login',           // Percorso senza prefisso per proxy
        '/register',        // Percorso senza prefisso per proxy
        '/forgot-password', // Percorso senza prefisso per proxy
        '/reset-password',  // Percorso senza prefisso per proxy
        '/healthz',
        '/health',
        // Route pubbliche per i corsi
        '/api/public/courses',
        '/api/public/courses/categories/list',
        '/api/public/courses/stats',
        // Route pubbliche per i form
        '/api/public/forms',
        // Route pubblica per activity logs (POST con optionalAuth gestito a livello di route)
        '/api/activity-logs',
        '/api/v1/activity-logs'
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
          // Controllo specifico per route con parametri come /api/public/courses/:slug
          if (route === '/api/public/courses' && (pathToCheck.match(/^\/api\/public\/courses\/[^\/]+$/) || originalToCheck.match(/^\/api\/public\/courses\/[^\/]+$/))) return true;
          return false;
        });

        // DEBUG: log minimale per diagnosi
        if (originalToCheck.includes('/activity-logs')) {
          console.info('[conditionalAuthMiddleware] path:', pathToCheck, 'originalUrl:', originalToCheck, 'isPublicRoute:', isPublicRoute);
        }
        
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
      
      logger.info('Middleware configuration completed successfully (CORS managed by proxy-server)', { service: 'api-server' });
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
          console.error('[HEALTH CHECK] Error:', error);
          res.status(500).json({
            status: 'error',
            error: error.message
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
          console.error('[HEALTH CHECK] /health Error:', error);
          res.status(500).json({
            status: 'error',
            error: error.message
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
      logger.info('Registering gdpr routes...');
      v1Router.use('/gdpr', gdprRoutes);
      logger.info('GDPR routes registered successfully');
      v1Router.use('/roles', roleRoutes);
      v1Router.use('/', permissionRoutes);
      
      // Registra route advanced-permissions
      logger.info('Registering advanced-permissions routes...');
      this.app.use('/api/advanced-permissions', advancedPermissionsRoutes);
      logger.info('Advanced-permissions routes registered successfully');
      
      // Registra route dashboard
      logger.info('Registering dashboard routes...');
      this.app.use('/api/dashboard', dashboardRoutes);
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
      
      // Registra route advanced-submissions PRIMA delle route submissions generiche
      // IMPORTANTE: Le route più specifiche devono essere registrate prima di quelle generiche
      logger.info('Registering advanced-submissions routes...');
      v1Router.use('/submissions/advanced', advancedSubmissionsRoutes);
      logger.info('Advanced-submissions routes registered successfully');
      
      // Registra route submissions (dopo advanced-submissions per evitare conflitti)
      logger.info('Registering submissions routes...');
      v1Router.use('/submissions', submissionRoutes);
      logger.info('Submissions routes registered successfully');
      
      // Registra route form-templates
      logger.info('Registering form-templates routes...');
      v1Router.use('/form-templates', formTemplatesRoutes);
      logger.info('Form-templates routes registered successfully');

      // Registra route activity-logs
      logger.info('Registering activity-logs routes...');
      v1Router.use('/activity-logs', activityLogsRoutes);
      logger.info('Activity-logs routes registered successfully');

      // Registra route pubbliche
      logger.info('Registering public courses routes...');
      this.app.use('/api/public', publicCoursesRoutes);
      logger.info('Public courses routes registered successfully');
      
      logger.info('Registering public forms routes...');
      this.app.use('/api/public/forms', publicFormsRoutes);
      logger.info('Public forms routes registered successfully');
      
      logger.info('Setting up legacy compatibility routes...');
      // Route di compatibilità (legacy) - RIMOSSO: v1Router è già montato dall'APIVersionManager su /api/v1
      // this.app.use('/api', v1Router); // CONFLITTO: questo crea duplicazione con APIVersionManager
      
      // Route legacy per backward compatibility (senza prefisso /api)
      logger.info('Registering legacy courses routes...');
      this.app.use('/courses', courseRoutes);
      logger.info('Legacy courses routes registered successfully');
      logger.info('Registering legacy employees routes...');
      this.app.use('/employees', employeesRouter);
      logger.info('Legacy employees routes registered successfully');
      logger.info('Registering legacy trainers routes...');
      this.app.use('/trainers', trainersRouter);
      logger.info('Legacy trainers routes registered successfully');
      logger.info('Registering legacy virtual entities routes...');
      this.app.use('/virtual-entities', virtualEntitiesRouter);
      logger.info('Legacy virtual entities routes registered successfully');
      
      logger.info('Legacy compatibility routes configured successfully');
      
      logger.info('Setting up rate limiting...');
      // Rate limiting automatico per route specifiche
      this.app.use('/api/auth/login', this.rateLimiters.login);
      this.app.use('/api/*/upload', this.rateLimiters.upload);
      logger.info('Rate limiting configured successfully');
      
      logger.info('Setting up counters endpoint...');
      // Endpoint /api/counters per dashboard
      this.app.get('/api/counters', authenticate, tenantMiddleware, async (req, res) => {
        try {
          const { PrismaClient } = await import('@prisma/client');
          const prisma = new PrismaClient();
          
          const tenantId = req.tenant?.id;
          if (!tenantId) {
            return res.status(400).json({ error: 'Tenant not found or inactive' });
          }
          
          // Conteggio aziende
          const companiesCount = await prisma.company.count({
            where: {
              tenantId: tenantId,
              deletedAt: null,
              isActive: true
            }
          });
          
          // Conteggio dipendenti
          const employeesCount = await prisma.person.count({
            where: {
              tenantId: tenantId,
              deletedAt: null,
              status: 'ACTIVE'
            }
          });
          
          await prisma.$disconnect();
          
          res.json({
            companies: companiesCount,
            employees: employeesCount
          });
        } catch (error) {
          logger.error('Error in /api/counters endpoint', {
            error: error.message,
            stack: error.stack,
            tenantId: req.tenant?.id
          });
          res.status(500).json({ error: 'Internal server error' });
        }
      });
      logger.info('Counters endpoint configured successfully');
      
      logger.info('Setting up 404 handler...');
      // 404 handler
      this.app.use('*', (req, res) => {
        res.status(404).json({
          error: 'Route not found',
          path: req.originalUrl,
          method: req.method,
          timestamp: new Date().toISOString()
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
// Normalizza i path per confronto corretto
const currentModuleUrl = import.meta.url;
const mainModuleUrl = `file://${process.argv[1]}`;
const normalizedCurrentUrl = decodeURIComponent(currentModuleUrl);
const normalizedMainUrl = decodeURIComponent(mainModuleUrl);

if (normalizedCurrentUrl === normalizedMainUrl) {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection detected', {
      service: 'api-server',
      reason: reason,
      promise: promise
    });
    console.error('UNHANDLED REJECTION:', reason);
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