/**
 * Configurazione ottimizzata Prisma Client
 * Include middleware soft-delete avanzato
 */

import { PrismaClient } from '@prisma/client';
import { createAdvancedSoftDeleteMiddleware } from '../middleware/soft-delete-advanced.js';
import logger from '../utils/logger.js';

// Configurazione Prisma con middleware
const prisma = new PrismaClient({
  log: ['error', 'warn']
});

// Abilito il middleware soft-delete avanzato
// TEMPORANEAMENTE DISABILITATO PER DEBUG
// prisma.$use(createAdvancedSoftDeleteMiddleware());

// Logging eventi Prisma
prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Prisma Query', {
      query: e.query,
      params: e.params,
      duration: e.duration,
      component: 'prisma-client'
    });
  }
});

prisma.$on('error', (e) => {
  logger.error('Prisma Error', {
    message: e.message,
    target: e.target,
    component: 'prisma-client'
  });
});

/**
 * Create Prisma middleware for Express
 */
export function createPrismaMiddleware() {
  return (req, res, next) => {
    // Attach Prisma client to request object
    req.prisma = prisma;
    next();
  };
}

export default prisma;
