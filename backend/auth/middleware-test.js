/**
 * Test Authentication Middleware - No Database Queries
 * Per testare se il problema è nelle query al database
 */

import jwt from 'jsonwebtoken';

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
        
        // Verify JWT token without database lookup
        let decoded;
        
        const secretsToTry = [
            process.env.JWT_SECRET,
            'your-super-secret-jwt-key-change-this-in-production',
            'super-secret-jwt-key-for-development-change-in-production-2024'
        ].filter(Boolean);
        
        let lastError;
        for (const secret of secretsToTry) {
            try {
                decoded = jwt.verify(token, secret, {
                    issuer: 'training-platform',
                    audience: 'training-platform-users'
                });
                break;
            } catch (fallbackError) {
                lastError = fallbackError;
            }
        }
        
        if (!decoded) {
            return res.status(401).json({
                error: 'Invalid token',
                code: 'AUTH_TOKEN_INVALID'
            });
        }
        
        // Attach minimal person info WITHOUT database queries
        req.person = {
            id: decoded.personId,
            personId: decoded.personId,
            email: decoded.email || 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            roles: ['ADMIN'],
            permissions: ['ALL_PERMISSIONS']
        };
        
        req.user = req.person; // Backward compatibility
        
        next();
        
    } catch (error) {
        return res.status(401).json({
            error: 'Authentication failed',
            code: 'AUTH_TOKEN_INVALID'
        });
    }
}