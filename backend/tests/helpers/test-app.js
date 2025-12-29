/**
 * Helper per creare un'app Express semplificata per i test
 * Evita il lifecycle manager completo che causa timeout
 */

import express from 'express';
import cors from 'cors';
import { createCorsConfig } from '../../config/cors.js';
import { createBodyParsers } from '../../config/bodyParser.js';
import { authMiddleware } from '../../middleware/auth.js';
import { tenantMiddleware } from '../../middleware/tenant.js';
import { rbacMiddleware } from '../../middleware/rbac.js';
import { errorHandler } from '../../middleware/errorHandler.js';
// import { DatabaseService } from '../../database/index.js'; // Bypass nei test

// Routes
import authRoutes from '../../routes/auth.js';
import { employeesRouter, trainersRouter, virtualEntitiesRouter } from '../../routes/virtualEntityRoutes.js';
import personRoutes from '../../routes/person-routes.js';
import codiciScontoRoutes from '../../routes/codici-sconto-routes.js';
// Project 46 - Modular preventivi routes
import preventiviRoutes from '../../routes/preventivi/index.js';

let databaseService = null;

/**
 * Inizializzazione DB bypassata nei test (evita $queryRaw con permessi insufficienti)
 */
async function initializeDatabase() {
  // Nei test non inizializziamo il DatabaseService per evitare problemi di permessi
  // Le route usano direttamente Prisma con le env di test già impostate in tests/setup.js
  return null;
}

/**
 * Crea un'app Express semplificata per i test
 */
export async function createTestApp() {
  // Inizializza il database (no-op nei test)
  await initializeDatabase();
  
  const app = express();
  
  // Configurazioni base
  const corsConfig = createCorsConfig();
  const bodyParsers = createBodyParsers();
  
  // Middleware base
  app.use(cors(corsConfig));
  app.use(bodyParsers.json);
  app.use(bodyParsers.urlencoded);
  
  // Routes di autenticazione (senza middleware di auth)
  app.use('/api/v1/auth', authRoutes);
  
  // Middleware per impostare header di test
  app.use('/api', (req, res, next) => {
    // Imposta header host per localhost se non presente
    if (!req.get('host')) {
      req.headers.host = 'localhost:4001';
    }
    
    // Imposta tenant ID per i test se non presente
    if (!req.headers['x-tenant-id'] && !req.query.tenantId) {
      req.headers['x-tenant-id'] = 'default-company';
    }
    
    next();
  });
  
  // Middleware di autenticazione e autorizzazione per le altre route
  app.use('/api', authMiddleware);
  app.use('/api', tenantMiddleware);
  app.use('/api', rbacMiddleware);
  
  // Routes protette
  app.use('/api/v1/employees', employeesRouter);
  app.use('/api/v1/trainers', trainersRouter);
  app.use('/api/virtual-entities', virtualEntitiesRouter);
  app.use('/api/v1/persons', personRoutes);
  app.use('/api/codici-sconto', codiciScontoRoutes);
  app.use('/api/preventivi', preventiviRoutes);
  
  // Error handler
  app.use(errorHandler);
  
  return app;
}

/**
 * Cleanup del database per i test (no-op)
 */
export async function cleanupTestDatabase() {
  // Nei test, il DatabaseService non viene inizializzato
  databaseService = null;
}