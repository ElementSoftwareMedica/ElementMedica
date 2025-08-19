/**
 * Authentication Module Main Entry Point
 * Exports all authentication components for easy integration
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Import authentication components
import authRoutes from './routes.js';
import personController from './personController.js';
import roleTypeController from './roleTypeController.js';
import middleware from './middleware.js';
import logger from '../utils/logger.js';
const { authenticate, authorize, auditLog, requireSameCompany: companyIsolation } = middleware;
import { JWTService, PasswordService, cleanupExpiredSessions } from './jwt.js';

/**
 * Create and configure authentication router
 */
export function createAuthRouter() {
    const router = express.Router();

    // Security middleware
    router.use(helmet());
    router.use(cookieParser());
    
    // CORS configuration
    router.use(cors({
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Platform', 'X-Device-ID', 'cache-control', 'pragma', 'expires', 'x-tenant-id', 'X-Tenant-ID', 'X-Requested-With']
    }));

    // Global rate limiting
    router.use(rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: {
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false
    }));

    // Parse JSON bodies
    router.use(express.json({ limit: '10mb' }));
    router.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check endpoint
    router.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'auth-service'
        });
    });

    // Authentication routes (login, logout, register, etc.)
    router.use('/auth', authRoutes);

    // Person management routes (legacy /users endpoints for backward compatibility)
    router.get('/users', authenticate(), authorize(['users.view']), companyIsolation(), personController.getPersons);
    router.get('/users/:id', authenticate(), authorize(['users.view']), companyIsolation(), personController.getPersonById);
    router.post('/users', authenticate(), authorize(['users.create']), companyIsolation(), personController.createUser);
    router.put('/users/:id', authenticate(), authorize(['users.update']), companyIsolation(), personController.updateUser);
    router.delete('/users/:id', authenticate(), authorize(['users.delete']), companyIsolation(), personController.deleteUser);
    
    // Person role management
    router.get('/users/:id/roles', authenticate(), authorize(['users.view', 'roles.view']), companyIsolation(), personController.getPersonRoles);
    router.post('/users/:id/roles', authenticate(), authorize(['users.manage_roles']), companyIsolation(), personController.assignRole);
    router.delete('/users/:id/roles/:roleId', authenticate(), authorize(['users.manage_roles']), companyIsolation(), personController.removeRole);
    
    // Password management
    router.post('/users/:id/reset-password', authenticate(), authorize(['users.update']), companyIsolation(), personController.resetPersonPassword);

    // Role type and permission management routes
    router.get('/role-types', authenticate(), authorize(['roles.view']), roleTypeController.getRoleTypes);
    router.get('/person-roles', authenticate(), authorize(['roles.view']), roleTypeController.getPersonRoles);
    
    // Permission management
    router.get('/permissions', authenticate(), authorize(['roles.view']), roleTypeController.getPermissions);

    // Error handling middleware
    router.use((error, req, res, next) => {
        logger.error('Auth module initialization failed', {
            component: 'auth-module',
            action: 'createAuthRouter',
            error: error.message,
            stack: error.stack
        });
        
        // Handle specific error types
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: error.details
            });
        }
        
        if (error.name === 'UnauthorizedError') {
            return res.status(401).json({
                error: 'Unauthorized',
                code: 'UNAUTHORIZED'
            });
        }
        
        if (error.name === 'ForbiddenError') {
            return res.status(403).json({
                error: 'Forbidden',
                code: 'FORBIDDEN'
            });
        }

        // Default error response
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    });

    // 404 handler - ONLY for paths that start with /auth or other specific auth paths
    // Do NOT catch all requests - let them pass to next middleware
    router.use('/auth/*', (req, res) => {
        res.status(404).json({
            error: 'Auth endpoint not found',
            code: 'AUTH_ENDPOINT_NOT_FOUND'
        });
    });

    return router;
}

/**
 * Initialize authentication system
 * Sets up database connections, cleans up expired sessions, etc.
 */
export async function initializeAuth() {
    try {
        logger.info('Initializing authentication system', { component: 'auth-system' });
        
        // Clean up expired sessions on startup
        await cleanupExpiredSessions();
        
        // Set up periodic cleanup (every hour)
        setInterval(async () => {
            try {
                await cleanupExpiredSessions();
            } catch (error) {
                logger.error('Session cleanup error', { error: error.message, component: 'auth-system' });
            }
        }, 60 * 60 * 1000); // 1 hour
        
        logger.info('Authentication system initialized successfully', { component: 'auth-system' });
        
    } catch (error) {
        logger.error('Failed to initialize authentication system', { error: error.message, component: 'auth-system' });
        throw error;
    }
}

/**
 * Graceful shutdown
 * Cleans up resources and connections
 */
export async function shutdownAuth() {
    try {
        logger.info('Shutting down authentication system', { component: 'auth-system' });
        
        // Perform any cleanup operations here
        // e.g., close database connections, clear intervals, etc.
        
        logger.info('Authentication system shut down successfully', { component: 'auth-system' });
        
    } catch (error) {
        logger.error('Error during authentication system shutdown', { error: error.message, component: 'auth-system' });
        throw error;
    }
}

// Export all components for external use
export {
    // Services
    JWTService,
    PasswordService,
    
    // Middleware
    authenticate,
    authorize,
    auditLog,
    companyIsolation,
    
    // Controllers
    personController,
    roleTypeController,
    
    // Routes
    authRoutes
};

// Default export for convenience
export default {
    createAuthRouter,
    initializeAuth,
    shutdownAuth,
    JWTService,
    PasswordService,
    authenticate,
    authorize,
    auditLog,
    companyIsolation,
    personController,
    roleTypeController
};