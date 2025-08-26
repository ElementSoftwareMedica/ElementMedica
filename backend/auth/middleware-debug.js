/**
 * Debug version of Authentication Middleware
 * Adds detailed logging and timeouts to identify blocking points
 */

import { JWTService } from './jwt.js';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Extract token from request headers
 */
function extractToken(req) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    
    // Also check for token in cookies (for web app)
    if (req.cookies && req.cookies.accessToken) {
        return req.cookies.accessToken;
    }
    
    return null;
}

/**
 * Timeout wrapper for async operations
 */
function withTimeout(promise, timeoutMs, operation) {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}

/**
 * Debug Authentication middleware
 */
export function authenticateDebug(options = {}) {
    const { optional = false } = options;
    
    return async (req, res, next) => {
        const startTime = Date.now();
        logger.info(`🔍 [DEBUG AUTH] Starting authentication for ${req.method} ${req.path}`);
        
        try {
            // Step 1: Extract token
            logger.info(`🔍 [DEBUG AUTH] Step 1: Extracting token...`);
            const token = extractToken(req);
            logger.info(`🔑 [DEBUG AUTH] Token extracted: ${token ? 'YES' : 'NO'}`);
            
            if (!token) {
                logger.info(`🔍 [DEBUG AUTH] No token found, optional=${optional}`);
                if (optional) {
                    req.person = null;
                    return next();
                }
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_TOKEN_MISSING'
                });
            }
            
            // Step 2: Verify JWT token with timeout
            logger.info(`🔍 [DEBUG AUTH] Step 2: Starting JWT verification...`);
            const decoded = await withTimeout(
                JWTService.verifyAccessToken(token),
                5000,
                'JWT verification'
            );
            logger.info(`✅ [DEBUG AUTH] JWT verified successfully for user: ${decoded.personId}`);
            
            // Step 3: Get person data with timeout
            logger.info(`🔍 [DEBUG AUTH] Step 3: Fetching person data for ID: ${decoded.personId}`);
            const person = await withTimeout(
                prisma.person.findUnique({
                    where: { id: decoded.personId }
                }),
                5000,
                'Person query'
            );
            logger.info(`✅ [DEBUG AUTH] Person query completed: ${person ? 'FOUND' : 'NOT FOUND'}`);
            
            if (!person || person.status !== 'ACTIVE' || person.deletedAt !== null) {
        logger.info(`🔍 [DEBUG AUTH] Person validation failed: active=${person?.status === 'ACTIVE'}, deleted=${person?.deletedAt !== null}`);
                return res.status(401).json({
                    error: 'Person not found or inactive',
                    code: 'AUTH_USER_INACTIVE'
                });
            }
            
            // Step 4: Check if person is locked
            logger.info(`🔍 [DEBUG AUTH] Step 4: Checking person lock status...`);
            if (person.lockedUntil && person.lockedUntil > new Date()) {
                logger.info(`🔍 [DEBUG AUTH] Person is locked until: ${person.lockedUntil}`);
                return res.status(423).json({
                    error: 'Account is temporarily locked',
                    code: 'AUTH_ACCOUNT_LOCKED',
                    lockedUntil: person.lockedUntil
                });
            }
            
            // Step 5: Get person roles with timeout
            logger.info(`🔍 [DEBUG AUTH] Step 5: Fetching person roles for ID: ${person.id}`);
            const personRoles = await withTimeout(
                prisma.personRole.findMany({
                    where: {
                        personId: person.id,
                        isActive: true
                    },
                    include: {
                        permissions: true
                    }
                }),
                5000,
                'Person roles query'
            );
            logger.info(`✅ [DEBUG AUTH] Person roles query completed: ${personRoles.length} roles found`);
            
            // Step 6: Get company data with timeout
            logger.info(`🔍 [DEBUG AUTH] Step 6: Fetching company data for ID: ${person.companyId}`);
            const company = await withTimeout(
                prisma.company.findUnique({
                    where: { id: person.companyId }
                }),
                5000,
                'Company query'
            );
            logger.info(`✅ [DEBUG AUTH] Company query completed: ${company ? 'FOUND' : 'NOT FOUND'}`);
            
            // Step 7: Get tenant data with timeout
            logger.info(`🔍 [DEBUG AUTH] Step 7: Fetching tenant data for ID: ${person.tenantId}`);
            const tenant = await withTimeout(
                prisma.tenant.findUnique({
                    where: { id: person.tenantId }
                }),
                5000,
                'Tenant query'
            );
            logger.info(`✅ [DEBUG AUTH] Tenant query completed: ${tenant ? 'FOUND' : 'NOT FOUND'}`);
            
            // Step 8: Skip user context and last activity update for debugging
            logger.info(`🔍 [DEBUG AUTH] Step 8: Skipping user context and last activity update for debugging`);
            
            // Step 9: Extract roles and permissions
            logger.info(`🔍 [DEBUG AUTH] Step 9: Extracting roles and permissions...`);
            const roles = personRoles.map(pr => pr.roleType);
            const permissions = personRoles.flatMap(pr => 
                pr.permissions.map(p => p.permission)
            );
            logger.info(`✅ [DEBUG AUTH] Roles extracted: ${roles.length} roles, ${permissions.length} permissions`);
            
            // Step 10: Attach user info to request
            logger.info(`🔍 [DEBUG AUTH] Step 10: Attaching user info to request...`);
            req.person = {
                id: person.id,
                personId: person.id,
                email: person.email,
                username: person.username,
                firstName: person.firstName,
                lastName: person.lastName,
                companyId: person.companyId,
                tenantId: person.tenantId,
                roles: roles,
                permissions: permissions,
                company: company,
                tenant: tenant,
                isVerified: person.isVerified
            };
            
            const endTime = Date.now();
            logger.info(`✅ [DEBUG AUTH] Authentication completed successfully in ${endTime - startTime}ms`);
            next();
            
        } catch (error) {
            const endTime = Date.now();
            logger.error(`❌ [DEBUG AUTH] Authentication failed after ${endTime - startTime}ms`, {
                component: 'auth-middleware-debug',
                action: 'authenticate',
                error: error.message,
                stack: error.stack,
                path: req.path,
                method: req.method
            });
            
            return res.status(401).json({
                error: 'Authentication failed',
                code: 'AUTH_ERROR',
                message: error.message
            });
        }
    };
}