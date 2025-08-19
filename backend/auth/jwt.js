/**
 * JWT Authentication Service
 * Handles JWT token generation, validation, and refresh
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

import prisma from '../config/prisma-optimization.js';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * JWT Service Class
 */
export class JWTService {
    /**
     * Generate access token
     */
    static generateAccessToken(payload) {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
            issuer: 'training-platform',
            audience: 'training-platform-users'
        });
    }

    /**
     * Generate refresh token
     */
    static generateRefreshToken(payload) {
        return jwt.sign(payload, JWT_REFRESH_SECRET, {
            expiresIn: JWT_REFRESH_EXPIRES_IN,
            issuer: 'training-platform',
            audience: 'training-platform-users'
        });
    }

    /**
     * Verify access token
     */
    static verifyAccessToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET, {
                issuer: 'training-platform',
                audience: 'training-platform-users'
            });
        } catch (error) {
            throw new Error(`Invalid access token: ${error.message}`);
        }
    }

    /**
     * Verify refresh token
     */
    static verifyRefreshToken(token) {
        try {
            return jwt.verify(token, JWT_REFRESH_SECRET, {
                issuer: 'training-platform',
                audience: 'training-platform-users'
            });
        } catch (error) {
            throw new Error(`Invalid refresh token: ${error.message}`);
        }
    }

    /**
     * Generate token pair (access + refresh)
     */
    static async generateTokenPair(user, deviceInfo = {}) {
        const payload = {
            personId: user.id,
            email: user.email,
            companyId: user.companyId,
            roles: user.roles || [],
            permissions: user.permissions || []
        };

        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken({ personId: user.id });
        const sessionToken = crypto.randomBytes(32).toString('hex');

        // Save refresh token to database with tenantId
        const refreshTokenExpiry = new Date();
        refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

        await prisma.refreshToken.create({
            data: {
                personId: user.id,
                token: refreshToken,
                expiresAt: refreshTokenExpiry,
                deviceInfo: {
                    userAgent: deviceInfo.userAgent || 'Unknown',
                    ipAddress: deviceInfo.ip || '127.0.0.1'
                },
                tenant: {
                    connect: { id: user.companyId }
                }
            }
        });

        return {
            accessToken,
            refreshToken,
            sessionToken,
            expiresIn: JWT_EXPIRES_IN,
            tokenType: 'Bearer'
        };
    }

    /**
     * Refresh access token
     */
    static async refreshAccessToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = this.verifyRefreshToken(refreshToken);
            
            // Check if refresh token exists and is active
            const refreshTokenRecord = await prisma.refreshToken.findFirst({
                where: {
                    token: refreshToken,
                    revokedAt: null,
                    expiresAt: {
                        gt: new Date()
                    }
                },
                include: {
                    person: {
                        include: {
                            personRoles: {
                                where: { isActive: true },
                                include: {
                                    permissions: true
                                }
                            }
                        }
                    }
                }
            });

            if (!refreshTokenRecord) {
                throw new Error('Invalid or expired refresh token');
            }

            // Note: RefreshToken doesn't need lastActivity updates

            // Generate new access token
            const user = refreshTokenRecord.person;
            const roles = user.personRoles.map(pr => pr.roleType);
            const permissions = user.personRoles.flatMap(pr => pr.permissions || []);

            const payload = {
                personId: user.id,
                email: user.email,
                companyId: user.companyId,
                roles,
                permissions
            };

            const newAccessToken = this.generateAccessToken(payload);

            return {
                accessToken: newAccessToken,
                expiresIn: JWT_EXPIRES_IN,
                tokenType: 'Bearer'
            };

        } catch (error) {
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }

    /**
     * Revoke session (logout)
     */
    static async revokeSession(refreshToken) {
        await prisma.refreshToken.updateMany({
            where: {
                token: refreshToken,
                revokedAt: null
            },
            data: {
                revokedAt: new Date()
            }
        });
    }

    /**
     * Revoke all user sessions
     */
    static async revokeAllPersonSessions(personId) {
        await prisma.refreshToken.updateMany({
            where: {
                personId: personId,
                revokedAt: null
            },
            data: {
                revokedAt: new Date()
            }
        });
    }

    /**
     * Clean expired sessions
     */
    static async cleanExpiredSessions() {
        const result = await prisma.refreshToken.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });
        logger.info(`Cleaned ${result.count} expired refresh tokens`, { component: 'jwt-manager' });
        return result.count;
    }
}

/**
 * Password Service Class
 */
export class PasswordService {
    /**
     * Hash password
     */
    static async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    /**
     * Verify password
     */
    static async verifyPassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    /**
     * Generate secure random password
     */
    static generateRandomPassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        return password;
    }

    /**
     * Validate password strength
     */
    static validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const errors = [];

        if (password.length < minLength) {
            errors.push(`Password must be at least ${minLength} characters long`);
        }
        if (!hasUpperCase) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!hasLowerCase) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!hasNumbers) {
            errors.push('Password must contain at least one number');
        }
        if (!hasSpecialChar) {
            errors.push('Password must contain at least one special character');
        }

        return {
            isValid: errors.length === 0,
            errors,
            strength: this.calculatePasswordStrength(password)
        };
    }

    /**
     * Calculate password strength score
     */
    static calculatePasswordStrength(password) {
        let score = 0;
        
        // Length bonus
        score += Math.min(password.length * 2, 20);
        
        // Character variety bonus
        if (/[a-z]/.test(password)) score += 5;
        if (/[A-Z]/.test(password)) score += 5;
        if (/\d/.test(password)) score += 5;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
        
        // Penalty for common patterns
        if (/123|abc|qwe|password/i.test(password)) score -= 10;
        if (/^\d+$/.test(password)) score -= 10;
        if (/^[a-zA-Z]+$/.test(password)) score -= 5;
        
        score = Math.max(0, Math.min(100, score));
        
        if (score < 30) return 'weak';
        if (score < 60) return 'medium';
        if (score < 80) return 'strong';
        return 'very-strong';
    }
}

/**
 * Session cleanup job (should be run periodically)
 */
export async function cleanupExpiredSessions() {
    try {
        const deletedCount = await JWTService.cleanExpiredSessions();
        logger.info('Cleaned up expired sessions', { deletedCount, component: 'jwt-manager' });
        return deletedCount;
    } catch (error) {
        logger.error('Session cleanup failed', { component: 'jwt-manager', error: error.message });
        throw error;
    }
}

// Export default
export default {
    JWTService,
    PasswordService,
    cleanupExpiredSessions
};