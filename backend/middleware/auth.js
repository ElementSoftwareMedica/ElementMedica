/**
 * Basic Authentication Middleware
 * Simple JWT authentication for API endpoints
 */

import jwt from 'jsonwebtoken';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import { RBACService } from './rbac.js';

/**
 * Basic JWT Authentication Middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token di accesso richiesto' });
    }

    const token = authHeader.substring(7);
    
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    const decoded = jwt.verify(token, jwtSecret);
    
    const person = await prisma.person.findUnique({
      where: { id: decoded.personId },
      include: {
        personRoles: {
          where: { isActive: true },
          include: {
            permissions: {
              where: { isGranted: true }
            }
          }
        }
      }
    });

    if (!person) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    // Ottieni i permessi usando il servizio RBAC
    const permissions = await RBACService.getPersonPermissions(person.id);

    // Costruisci l'oggetto person con i ruoli e permessi
    req.person = {
      ...person,
      roles: person.personRoles.map(pr => pr.roleType).filter(Boolean),
      permissions: permissions,
      tenantId: person.tenantId,
      companyId: person.companyId
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token non valido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token scaduto' });
    }
    
    console.error('Errore durante l\'autenticazione:', error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
};

/**
 * Optional Authentication Middleware
 * Authenticates user if token is present, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        
        const token = authHeader.substring(7);
        let decoded;
        const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
        try {
            decoded = jwt.verify(token, jwtSecret);
        } catch (tokenError) {
            return next();
        }
        
        if (decoded) {
            const { personId } = decoded;
            
                const person = await prisma.person.findUnique({
                where: { id: personId },
                include: {
                    personRoles: {
                        where: { isActive: true },
                        include: {
                            permissions: {
                                where: { isGranted: true }
                            }
                        }
                    }
                }
            });
            
            if (person && person.status === 'ACTIVE') {
                // Ottieni i permessi usando il servizio RBAC
                const permissions = await RBACService.getPersonPermissions(person.id);
                
                req.person = {
                    id: person.id,
                    personId: person.id,
                    email: person.email,
                    firstName: person.firstName,
                    lastName: person.lastName,
                    companyId: person.companyId,
                    tenantId: person.tenantId,
                    roles: person.personRoles.map(pr => pr.roleType),
                    permissions: permissions,
                    lastLogin: person.lastLogin
                };
            }
        }
        
        next();
        
    } catch (error) {
        logger.error('Optional authentication error', {
            component: 'auth',
            action: 'optionalAuth',
            error: error.message,
            ip: req.ip,
            path: req.path
        });
        
        next();
    }
}

/**
 * Require specific roles
 */
export function requireRoles(...roles) {
    return (req, res, next) => {
        if (!req.person) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }
        
        const hasRole = roles.some(role => req.person.roles.includes(role));
        
        if (!hasRole) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                code: 'AUTH_INSUFFICIENT_PERMISSIONS',
                required: roles,
                current: req.person.roles
            });
        }
        
        next();
    };
}

// Export authMiddleware as alias for authenticate
export const authMiddleware = authenticate;
export { authenticate };

export default {
    authenticate,
    authMiddleware,
    optionalAuth,
    requireRoles
};