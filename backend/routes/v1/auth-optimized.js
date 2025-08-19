/**
 * Authentication Routes v1
 * Versioned authentication endpoints - Optimized Structure
 */

import express from 'express';
import cors from 'cors';

// Import modular route handlers
import authenticationRoutes from './auth/authentication.js';
import userInfoRoutes from './auth/user-info.js';
import permissionsRoutes from './auth/permissions.js';
import debugRoutes from './auth/debug.js';

const router = express.Router();

// CORS configuration for auth routes
router.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Platform', 'X-Device-ID', 'cache-control', 'pragma', 'expires', 'x-tenant-id', 'X-Tenant-ID', 'X-Requested-With']
}));

// Mount route modules
router.use('/', authenticationRoutes);  // login, register, logout, refresh
router.use('/', userInfoRoutes);        // me, verify
router.use('/', permissionsRoutes);     // permissions
router.use('/', debugRoutes);           // debug and test routes

export default router;