/**
 * Test Authentication Middleware - No Database Queries
 * Per testare se il problema è nelle query al database
 */

import { JWTService } from './jwt.js';

/**
 * Extract token from request headers
 */
function extractToken(req) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    
    if (req.cookies && req.cookies.accessToken) {
        return req.cookies.accessToken;
    }
    
    return null;
}

/**
 * Test Authentication middleware - NO DATABASE QUERIES
 */
export function authenticateTest(req, res, next) {
    try {
        const token = extractToken(req);
        
        if (!token) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_TOKEN_MISSING'
            });
        }
        
        // Verify JWT token using central JWTService (no DB lookup)
        const decoded = JWTService.verifyAccessToken(token);
        
        // Attach minimal person info WITHOUT database queries
        req.person = {
            id: decoded.personId,
            personId: decoded.personId,
            email: decoded.email || 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            roles: Array.isArray(decoded.roles) ? decoded.roles : ['ADMIN'],
            permissions: Array.isArray(decoded.permissions) ? decoded.permissions : ['ALL_PERMISSIONS']
        };
        
        next();
        
    } catch (error) {
        // Config error (missing secrets) should be 500 to reflect server misconfiguration
        if (error && typeof error.message === 'string' && error.message.includes('JWT configuration error')) {
            return res.status(500).json({
                error: 'JWT secret non configurato',
                code: 'AUTH_CONFIG_ERROR'
            });
        }
        return res.status(401).json({
            error: 'Authentication failed',
            code: 'AUTH_TOKEN_INVALID'
        });
    }
}