/**
 * Proxy Server Refactorizzato con Sistema Routing Avanzato
 * Versione ottimizzata con architettura modulare e routing centralizzato
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Import configurazioni
import { getConfig, printConfig } from '../proxy/config/index.js';

// Import middleware legacy (mantenuti per compatibilità)
import { setupSecurity } from '../proxy/middleware/security.js';
import { setupLogging } from '../proxy/middleware/logging.js';
import { setupBodyParsing, createJsonParser, createUrlencodedParser } from '../proxy/middleware/bodyParser.js';

// Import handlers
import { healthHandler, healthzHandler, readinessHandler } from '../proxy/handlers/healthCheck.js';
import { setupGracefulShutdown, registerForShutdown } from '../proxy/handlers/gracefulShutdown.js';

// Import routes locali
import { setupLocalRoutes } from '../proxy/routes/localRoutes.js';

// 🚀 NUOVO: Import Sistema Routing Avanzato
import { AdvancedRoutingSystem, createAdvancedRoutingSystem } from '../routing/index.js';

// Import legacy modules (mantenuti per compatibilità)
import { initializeAuth, shutdownAuth } from '../auth/index.js';
import middleware from '../auth/middleware.js';
import { globalErrorHandler, notFoundHandler } from '../middleware/errorHandler.js';
import loadBalancer from '../utils/loadBalancer.js';

// Inizializzazione
const app = express();
let config;
let prisma;
let server;
let advancedRoutingSystem; // 🚀 NUOVO: Sistema routing avanzato

// Gestione degli errori di avvio
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  logger.error('Uncaught Exception', { 
    service: 'proxy-server', 
    error: error.message, 
    stack: error.stack 
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', { 
    service: 'proxy-server', 
    reason, 
    promise 
  });
  process.exit(1);
});

/**
 * Inizializzazione del server
 */
async function initializeServer() {
  try {
    // Carica configurazione
    config = getConfig();
    printConfig();
    
    // Inizializza Prisma
    prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Prisma client initialized successfully');
    
    // Log avvio
    logger.info('Starting Proxy Server', {
      service: 'proxy-server',
      version: process.env.npm_package_version || '1.0.0',
      environment: config.server.environment,
      port: config.server.port,
      nodeVersion: process.version
    });
    
    // Inizializza sistema di autenticazione (legacy)
    await initializeAuth();
    logger.info('Authentication system initialized', { 
      service: 'proxy-server', 
      port: config.server.port 
    });
    
    // 🚀 NUOVO: Inizializza Sistema Routing Avanzato
    console.log('🚀 Initializing Advanced Routing System...');
    advancedRoutingSystem = createAdvancedRoutingSystem({
      enableLogging: true,
      logLevel: 'info',
      enableDiagnostics: true,
      enableVersioning: true,
      enableLegacyRedirects: true
    });
    
    await advancedRoutingSystem.initialize();
    console.log('✅ Advanced Routing System initialized');
    
    // Setup middleware di sicurezza (legacy)
    setupSecurity(app);
    console.log('✅ Security middleware configured');
    
    // Setup logging middleware (legacy)
    setupLogging(app);
    console.log('✅ Logging middleware configured');
    
    // Setup body parsing solo per route locali (non proxy)
     // Il body parsing globale interferisce con il proxy
     console.log('✅ Body parsing skipped for proxy compatibility');
    
    // 🚀 NUOVO: Configura Sistema Routing Avanzato
    // Questo sostituisce CORS, Rate Limiting, Proxy Routes
    console.log('🔧 Configuring Advanced Routing System...');
    advancedRoutingSystem.configureExpress(app);
    console.log('✅ Advanced Routing System configured');
    
    // Registra load balancer (legacy - mantenuto per compatibilità)
    loadBalancer.registerServer('api-primary', {
      url: config.services.api.url,
      weight: 1,
      type: 'api'
    });
    
    loadBalancer.registerServer('documents-primary', {
      url: config.services.documents.url,
      weight: 1,
      type: 'documents'
    });
    
    console.log('✅ Load balancer configured (health checks disabled)');
    
    // Setup route locali (devono essere dopo il routing avanzato)
    setupLocalRoutes(app, prisma, middleware);
    console.log('✅ Local routes configured');
    
    // Setup error handlers (devono essere ultimi)
    app.use(notFoundHandler);
    app.use(globalErrorHandler);
    console.log('✅ Error handlers configured');
    
    // Avvia server
    server = app.listen(config.server.port, config.server.host, () => {
      console.log(`\n🚀 Proxy Server started successfully!`);
      console.log(`   - Environment: ${config.server.environment}`);
      console.log(`   - Server: http://${config.server.host}:${config.server.port}`);
      console.log(`   - API Target: ${config.services.api.url}`);
      console.log(`   - Documents Target: ${config.services.documents.url}`);
      console.log(`   - Frontend: ${config.services.frontend.url}`);
      console.log(`   - Health Check: http://${config.server.host}:${config.server.port}/health`);
      console.log(`   - Ready Check: http://${config.server.host}:${config.server.port}/ready`);
      console.log('');
      
      logger.info('Proxy Server started', {
        service: 'proxy-server',
        host: config.server.host,
        port: config.server.port,
        environment: config.server.environment,
        targets: {
          api: config.services.api.url,
          documents: config.services.documents.url,
          frontend: config.services.frontend.url
        }
      });
    });
    
    // Configura timeout del server
    server.timeout = config.server.requestTimeout;
    server.keepAliveTimeout = config.server.keepAliveTimeout;
    server.headersTimeout = config.server.headersTimeout;
    
    // Registra server e Prisma per graceful shutdown
    registerForShutdown(server, prisma);
    
    // Setup graceful shutdown
    setupGracefulShutdown({
      onShutdown: async () => {
        console.log('🔄 Shutting down authentication system...');
        await shutdownAuth();
        
        console.log('🔄 Stopping load balancer...');
        loadBalancer.stopHealthChecks();
        
        // 🚀 NUOVO: Shutdown sistema routing avanzato
        if (advancedRoutingSystem && advancedRoutingSystem.shutdown) {
          console.log('🔄 Shutting down Advanced Routing System...');
          await advancedRoutingSystem.shutdown();
        }
      }
    });
    
    console.log('✅ Graceful shutdown configured');
    
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    logger.error('Server initialization failed', {
      service: 'proxy-server',
      error: error.message,
      stack: error.stack
    });
    
    // Cleanup in caso di errore
    if (prisma) {
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error('❌ Failed to disconnect Prisma:', disconnectError);
      }
    }
    
    if (server) {
      server.close();
    }
    
    process.exit(1);
  }
}

/**
 * Avvio del server
 */
initializeServer().catch((error) => {
  console.error('❌ Critical error during server startup:', error);
  process.exit(1);
});

// Export per testing
export { app, initializeServer };
export default app;