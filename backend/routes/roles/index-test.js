/**
 * Test file per identificare il problema nelle importazioni
 */

import express from 'express';
import logger from '../../utils/logger.js';

// Test delle importazioni una alla volta
console.log('Testing auth middleware import...');
import { authAndTenant } from './middleware/auth.js';
console.log('Auth middleware imported successfully');

console.log('Testing logging middleware import...');
import { logRoleRequest, logRoleError } from './middleware/logging.js';
console.log('Logging middleware imported successfully');

// Test dei moduli uno alla volta
console.log('Testing hierarchy routes import...');
import hierarchyRoutes from './hierarchy.js';
console.log('Hierarchy routes imported successfully');

console.log('Testing basic management routes import...');
import basicManagementRoutes from './basic-management.js';
console.log('Basic management routes imported successfully');

console.log('All imports successful!');

const router = express.Router();

// Endpoint di test semplice
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

export default router;