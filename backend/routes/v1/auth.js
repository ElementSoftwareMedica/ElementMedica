/**
 * Authentication Routes v1
 * Main router that delegates to specialized modules
 */

import express from 'express';

// Import specialized route modules
import authenticationRoutes from './auth/authentication.js';
import userInfoRoutes from './auth/user-info.js';
import permissionsRoutes from './auth/permissions.js';

const router = express.Router();

// CORS is handled globally by the main server (createCorsConfig in config/cors.js)
// which uses ALLOWED_ORIGINS env var in production — do NOT override here

// Mount specialized route modules
router.use('/', authenticationRoutes);  // login, register, refresh, logout
router.use('/', userInfoRoutes);        // /me, /verify
router.use('/', permissionsRoutes);     // /permissions/:personId

export default router;