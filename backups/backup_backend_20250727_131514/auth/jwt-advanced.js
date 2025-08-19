/**
 * Advanced JWT Service with Refresh Token Support
 * Implements token rotation, blacklist, and session management
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

// Prisma client importato dalla configurazione ottimizzata

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m';
const JWT_REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d';
const MAX_CONCURRENT_SESSIONS = parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 5;

/**
 * Advanced JWT Service Class
 */
export class AdvancedJWTService {
    /**
     * Generate access and refresh token pair
     */
    static async generateTokenPair(user, deviceInfo = {}) {
        try {
            // Clean up expired sessions first
            await this.cleanupExpiredSessions(user.id);
            
            // Check concurrent session limit
            const activeSessions = await prisma.personSession.count({
                where: {
                    personId: user.id,
                    isActive: true,
                    expiresAt: {
                        gt: new Date()
                    }
                }
            });
            
            if (activeSessions >= MAX_CONCURRENT_SESSIONS) {
                // Deactivate oldest session
                const oldestSession = await prisma.personSession.findFirst({
                    where: {
                        personId: user.id,
                        isActive: true
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                });
                
                if (oldestSession) {
                    await prisma.personSession.update({
                        where: { id: oldestSession.id },
                        data: { isActive: false }
                    });
                }
            }
            
            // Generate access token
            const accessTokenPayload = {
                personId: user.id,
                email: user.email,
                username: user.username,
                companyId: user.companyId,
                sessionId: crypto.randomUUID()
            };
            
            const accessToken = jwt.sign(
                accessTokenPayload,
                JWT_SECRET,
                { 
                    expiresIn: JWT_ACCESS_TOKEN_EXPIRY,
                    issuer: 'project-auth-system',
                    audience: 'project-api'
                }
            );
            
            // Generate refresh token
            const refreshTokenValue = crypto.randomBytes(64).toString('hex');
            const refreshTokenExpiry = new Date();
            refreshTokenExpiry.setTime(refreshTokenExpiry.getTime() + this.parseExpiry(JWT_REFRESH_TOKEN_EXPIRY));
            
            // Create person session record
            const session = await prisma.personSession.create({
                data: {
                    personId: user.id,
                    sessionToken: accessTokenPayload.sessionId,
                    deviceInfo: deviceInfo,
                    ipAddress: deviceInfo.ipAddress,
                    userAgent: deviceInfo.userAgent,
                    refreshToken: refreshTokenValue,
                    expiresAt: refreshTokenExpiry,
                    isActive: true,
                    lastActivityAt: new Date()
                }
            });
            
            logger.info('Token pair generated successfully', {
                component: 'jwt-advanced',
                action: 'generateTokenPair',
                personId: user.id,
                sessionId: accessTokenPayload.sessionId
            });
            
            return {
                accessToken,
                refreshToken: refreshTokenValue,
                expiresIn: this.parseExpiry(JWT_ACCESS_TOKEN_EXPIRY) / 1000,
                tokenType: 'Bearer'
            };
            
        } catch (error) {
            logger.error('Failed to generate token pair', {
                component: 'jwt-advanced',
                action: 'generateTokenPair',
                error: error.message,
                stack: error.stack,
                personId: user?.id
            });
            throw new Error('Token generation failed');
        }
    }
    
    /**
     * Refresh access token using refresh token
     */
    static async refreshAccessToken(refreshTokenValue, deviceInfo = {}) {
        try {
            // Find and validate refresh token
            const session = await prisma.personSession.findFirst({
                where: { 
                    refreshToken: refreshTokenValue,
                    isActive: true
                },
                include: {
                    person: {
                        include: {
                            personRoles: {
                                where: { isActive: true },
                                include: {
                                    role: true
                                }
                            }
                        }
                    }
                }
            });
            
            if (!session || session.expiresAt < new Date()) {
                throw new Error('Invalid or expired refresh token');
            }
            
            const user = session.person;
            
            if (!user.isActive) {
                throw new Error('User account is inactive');
            }
            
            // Generate new access token
            const accessTokenPayload = {
                personId: user.id,
                email: user.email,
                username: user.username,
                companyId: user.companyId,
                roles: user.personRoles.map(pr => pr.roleType),
                permissions: this.aggregatePermissions(user.personRoles),
                sessionId: crypto.randomUUID()
            };
            
            const accessToken = jwt.sign(
                accessTokenPayload,
                JWT_SECRET,
                { 
                    expiresIn: JWT_ACCESS_TOKEN_EXPIRY,
                    issuer: 'project-auth-system',
                    audience: 'project-api'
                }
            );
            
            // Update person session
            await prisma.personSession.upsert({
                where: {
                    sessionToken: accessTokenPayload.sessionId
                },
                create: {
                    personId: user.id,
                    sessionToken: accessTokenPayload.sessionId,
                    deviceInfo: deviceInfo,
                    ipAddress: deviceInfo.ipAddress,
                    userAgent: deviceInfo.userAgent,
                    expiresAt: new Date(Date.now() + this.parseExpiry(JWT_ACCESS_TOKEN_EXPIRY))
                },
                update: {
                    lastActivityAt: new Date(),
                    ipAddress: deviceInfo.ipAddress,
                    userAgent: deviceInfo.userAgent
                }
            });
            
            // Update person last login
            await prisma.person.update({
                where: { 
                    id: user.id
                },
                data: { lastLogin: new Date() }
            });
            
            logger.info('Access token refreshed successfully', {
                component: 'jwt-advanced',
                action: 'refreshAccessToken',
                personId: user.id,
                sessionId: accessTokenPayload.sessionId
            });
            
            return {
                accessToken,
                expiresIn: this.parseExpiry(JWT_ACCESS_TOKEN_EXPIRY) / 1000,
                tokenType: 'Bearer'
            };
            
        } catch (error) {
            logger.error('Failed to refresh access token', {
                component: 'jwt-advanced',
                action: 'refreshAccessToken',
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Verify access token
     */
    static async verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET, {
                issuer: 'project-auth-system',
                audience: 'project-api'
            });
            
            // Check if session is still active
            const session = await prisma.personSession.findUnique({
                where: { sessionToken: decoded.sessionId },
                include: {
                    person: {
                        include: {
                            personRoles: {
                                where: { isActive: true },
                                include: {
                                    role: true
                                }
                            }
                        }
                    }
                }
            });
            
            if (!session || !session.isActive || session.expiresAt < new Date()) {
                throw new Error('Session expired or invalid');
            }
            
            if (session.person.status !== 'ACTIVE') {
                throw new Error('Person account is inactive');
            }
            
            // Update last activity
            await prisma.personSession.update({
                where: { sessionToken: decoded.sessionId },
                data: { lastActivityAt: new Date() }
            });
            
            return {
                ...decoded,
                roles: session.person.personRoles.map(pr => pr.role.name),
                permissions: this.aggregatePermissions(session.person.personRoles)
            };
            
        } catch (error) {
            logger.error('Token verification failed', {
                component: 'jwt-advanced',
                action: 'verifyAccessToken',
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * Revoke refresh token
     */
    static async revokeRefreshToken(refreshTokenValue) {
        try {
            await prisma.personSession.updateMany({
                where: { refreshToken: refreshTokenValue },
                data: { isActive: false }
            });
            
            logger.info('Refresh token revoked', {
                component: 'jwt-advanced',
                action: 'revokeRefreshToken'
            });
            
        } catch (error) {
            logger.error('Failed to revoke refresh token', {
                component: 'jwt-advanced',
                action: 'revokeRefreshToken',
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * Revoke all user sessions
     */
    static async revokeAllPersonSessions(personId) {
        try {
            // Deactivate all person sessions
            await prisma.personSession.updateMany({
                where: {
                    personId: personId,
                    isActive: true
                },
                data: { isActive: false }
            });
            
            logger.info('All person sessions revoked', {
                component: 'jwt-advanced',
                action: 'revokeAllPersonSessions',
                personId: personId
            });
            
        } catch (error) {
            logger.error('Failed to revoke all user sessions', {
                component: 'jwt-advanced',
                action: 'revokeAllPersonSessions',
                error: error.message,
                personId: personId
            });
            throw error;
        }
    }
    
    /**
     * Get person active sessions
     */
    static async getPersonSessions(personId) {
        try {
            const sessions = await prisma.personSession.findMany({
                where: {
                    personId: personId,
                    isActive: true,
                    expiresAt: {
                        gt: new Date()
                    }
                },
                orderBy: {
                    lastActivityAt: 'desc'
                }
            });
            
            return sessions.map(session => ({
                id: session.id,
                deviceInfo: session.deviceInfo,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
                lastActivity: session.lastActivity,
                createdAt: session.createdAt
            }));
            
        } catch (error) {
            logger.error('Failed to get user sessions', {
                component: 'jwt-advanced',
                action: 'getUserSessions',
                error: error.message,
                personId: personId
            });
            throw error;
        }
    }
    
    /**
     * Cleanup expired sessions
     */
    static async cleanupExpiredSessions(personId = null) {
        try {
            const where = {
                expiresAt: {
                    lt: new Date()
                }
            };
            
            if (personId) {
                where.personId = personId;
            }
            
            // Deactivate expired person sessions
            await prisma.personSession.updateMany({
                where,
                data: { isActive: false }
            });
            
            logger.info('Expired sessions cleaned up', {
                component: 'jwt-advanced',
                action: 'cleanupExpiredSessions',
                personId: personId
            });
            
        } catch (error) {
            logger.error('Failed to cleanup expired sessions', {
                component: 'jwt-advanced',
                action: 'cleanupExpiredSessions',
                error: error.message,
                personId: personId
            });
        }
    }
    
    /**
     * Parse expiry string to milliseconds
     */
    static parseExpiry(expiry) {
        const units = {
            's': 1000,
            'm': 60 * 1000,
            'h': 60 * 60 * 1000,
            'd': 24 * 60 * 60 * 1000
        };
        
        const match = expiry.match(/^(\d+)([smhd])$/);
        if (!match) {
            throw new Error('Invalid expiry format');
        }
        
        const [, value, unit] = match;
        return parseInt(value) * units[unit];
    }
    
    /**
     * Aggregate permissions from person roles
     */
    static aggregatePermissions(personRoles) {
        const permissions = new Set();
        
        personRoles.forEach(personRole => {
            // Add basic role-based permissions
            switch(personRole.roleType) {
                case 'SUPER_ADMIN':
                    permissions.add('ALL_PERMISSIONS');
                    break;
                case 'ADMIN':
                    permissions.add('MANAGE_USERS');
                    permissions.add('MANAGE_COMPANIES');
                    permissions.add('MANAGE_COURSES');
                    permissions.add('VIEW_REPORTS');
                    break;
                case 'MANAGER':
                    permissions.add('MANAGE_COURSES');
                    permissions.add('VIEW_REPORTS');
                    break;
                case 'USER':
                    permissions.add('VIEW_COURSES');
                    break;
            }
            
            // Add custom permissions if available
            if (personRole.permissions) {
                const customPermissions = Array.isArray(personRole.permissions) 
                    ? personRole.permissions 
                    : JSON.parse(personRole.permissions || '[]');
                    
                customPermissions.forEach(permission => permissions.add(permission));
            }
        });
        
        return Array.from(permissions);
    }
}

// Start cleanup interval
setInterval(() => {
    AdvancedJWTService.cleanupExpiredSessions();
}, 60 * 60 * 1000); // Run every hour

export default AdvancedJWTService;