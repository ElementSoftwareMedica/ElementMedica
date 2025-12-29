/**
 * Simplified Authentication Middleware for Debug
 * Minimal version without excessive logging
 */

import { JWTService } from './jwt.js';
import prisma from '../config/prisma-optimization.js';

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
 * Simplified Authentication middleware
 */
export function authenticateSimple(options = {}) {
    const { optional = false } = options;
    
    return async (req, res, next) => {
        try {
            const token = extractToken(req);
            
            if (!token) {
                if (optional) {
                    req.person = null;
                    return next();
                }
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_TOKEN_MISSING'
                });
            }
            
            // Verify JWT token esclusivamente via JWTService
            let decoded;
            try {
                decoded = JWTService.verifyAccessToken(token);
            } catch (jwtError) {
                return res.status(401).json({
                    error: 'Authentication failed',
                    code: 'AUTH_TOKEN_INVALID'
                });
            }
            
            // Simple person lookup
            const person = await prisma.person.findUnique({
                where: { id: decoded.personId }
            });
            
            if (!person || person.status !== 'ACTIVE' || person.deletedAt) {
                return res.status(401).json({
                    error: 'Person not found or inactive',
                    code: 'AUTH_USER_INACTIVE'
                });
            }
            
            // Simple roles lookup
            const personRoles = await prisma.personRole.findMany({
                where: {
                    personId: decoded.personId,
                    isActive: true
                }
            });
            
            const roles = personRoles.map(pr => pr.roleType);
            
            // Basic permissions for admin
            let permissions = [];
            if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
                permissions = ['ALL_PERMISSIONS'];
            }
            
            // Attach minimal person info
            req.person = {
                id: person.id,
                personId: person.id,
                email: person.email,
                firstName: person.firstName,
                lastName: person.lastName,
                roles: roles,
                permissions: permissions
            };
            
            next();
            
        } catch (error) {
            return res.status(401).json({
                error: 'Authentication failed',
                code: 'AUTH_TOKEN_INVALID'
            });
        }
    };
}