/**
 * Auth Module Index - Documents Server Entry Point
 * 
 * Barrel file for auth module used by documents-server.js.
 * Provides initializeAuth/shutdownAuth lifecycle functions.
 */

import { JWTService, cleanupExpiredSessions } from './jwt.js';
import logger from '../utils/logger.js';

let sessionCleanupInterval = null;

/**
 * Initialize authentication system.
 * Validates JWT configuration and starts periodic session cleanup.
 */
export async function initializeAuth() {
    // Verify JWT secrets are configured
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured. Set it in environment variables.');
    }
    if (!process.env.JWT_REFRESH_SECRET) {
        throw new Error('JWT_REFRESH_SECRET is not configured. Set it in environment variables.');
    }

    // Start periodic session cleanup (every 6 hours)
    sessionCleanupInterval = setInterval(async () => {
        try {
            await cleanupExpiredSessions();
            logger.debug('Expired sessions cleaned up', { component: 'auth-init' });
        } catch (error) {
            logger.error('Session cleanup failed', { component: 'auth-init', error: error.message });
        }
    }, 6 * 60 * 60 * 1000);

    logger.info('Authentication system initialized', { component: 'auth-init' });
}

/**
 * Shutdown authentication system.
 * Clears periodic timers.
 */
export async function shutdownAuth() {
    if (sessionCleanupInterval) {
        clearInterval(sessionCleanupInterval);
        sessionCleanupInterval = null;
    }
    logger.info('Authentication system shut down', { component: 'auth-init' });
}

export { JWTService, cleanupExpiredSessions };
