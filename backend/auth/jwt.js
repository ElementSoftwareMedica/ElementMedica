/**
 * JWT Authentication Service
 * Handles JWT token generation, validation, and refresh
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from '../utils/logger.js';

import prisma from '../config/prisma-optimization.js';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET; // No fallback: must be provided via env
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET; // No fallback: must be provided via env
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function ensureAccessSecret() {
    if (!JWT_SECRET) {
        logger.error('JWT_SECRET is not configured. Set it in environment variables.');
        throw new Error('JWT configuration error: JWT_SECRET missing');
    }
}

function ensureRefreshSecret() {
    if (!JWT_REFRESH_SECRET) {
        logger.error('JWT_REFRESH_SECRET is not configured. Set it in environment variables.');
        throw new Error('JWT configuration error: JWT_REFRESH_SECRET missing');
    }
}

/**
 * JWT Service Class
 */
export class JWTService {
    /**
     * Generate access token
     */
    static generateAccessToken(payload, options = {}) {
        ensureAccessSecret();
        const expiresIn = options.expiresIn || JWT_EXPIRES_IN;
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn,
            issuer: 'training-platform',
            audience: 'training-platform-users'
        });
    }

    /**
     * Generate refresh token
     */
    static generateRefreshToken(payload, options = {}) {
        ensureRefreshSecret();
        const expiresIn = options.expiresIn || JWT_REFRESH_EXPIRES_IN;
        return jwt.sign(payload, JWT_REFRESH_SECRET, {
            expiresIn,
            issuer: 'training-platform',
            audience: 'training-platform-users'
        });
    }

    /**
     * Verify access token
     */
    static verifyAccessToken(token) {
        try {
            ensureAccessSecret();
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
            ensureRefreshSecret();
            return jwt.verify(token, JWT_REFRESH_SECRET, {
                issuer: 'training-platform',
                audience: 'training-platform-users'
            });
        } catch (error) {
            throw new Error(`Invalid refresh token: ${error.message}`);
        }
    }

    /**
     * Build token pair (access + refresh) WITHOUT persisting to DB.
     * Adds a unique jti to the refresh payload to avoid duplicate tokens
     * in case of multiple generations within the same second.
     */
    static buildTokenPair(user, options = {}) {
        const { rememberMe = false, accessExpiresIn, refreshExpiresIn, extraClaims } = options;

        // Derive roles/permissions from either provided arrays or personRoles
        const roles = Array.isArray(user.roles)
            ? user.roles
            : Array.isArray(user.personRoles)
                ? user.personRoles.map(pr => pr.roleType).filter(Boolean)
                : [];

        // NOTE: Permissions removed from JWT to avoid 431 Header Too Large errors
        // Permissions are loaded server-side in authenticate middleware via RBACService

        const payload = {
            personId: user.id,
            email: user.email,
            username: user.username,
            taxCode: user.taxCode,
            companyId: user.companyId,
            tenantId: user.tenantId || null,
            roles
        };

        // Merge safe extra claims without overriding core claims
        const extra = extraClaims && typeof extraClaims === 'object' ? extraClaims : {};
        const safeExtra = Object.fromEntries(Object.entries(extra).filter(([k]) => payload[k] === undefined));
        const finalPayload = { ...payload, ...safeExtra };

        const accessTokenExpiry = accessExpiresIn || (rememberMe ? '7d' : JWT_EXPIRES_IN);
        const refreshTokenExpiry = refreshExpiresIn || (rememberMe ? '30d' : JWT_REFRESH_EXPIRES_IN);

        const accessToken = this.generateAccessToken(finalPayload, { expiresIn: accessTokenExpiry });

        const jti = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
        const refreshPayload = { personId: user.id, jti };
        const refreshToken = this.generateRefreshToken(refreshPayload, { expiresIn: refreshTokenExpiry });

        return {
            accessToken,
            refreshToken,
            expiresIn: accessTokenExpiry,
            tokenType: 'Bearer'
        };
    }

    /**
     * Generate token pair (access + refresh) and persist refresh token to DB
     */
    static async generateTokenPair(user, deviceInfo = {}, options = {}) {
        const rememberMe = options && options.rememberMe === true;
        const { accessToken, refreshToken, expiresIn, tokenType } = this.buildTokenPair(user, {
            rememberMe,
            extraClaims: options?.extraClaims,
            accessExpiresIn: options?.accessExpiresIn,
            refreshExpiresIn: options?.refreshExpiresIn
        });

        const sessionToken = crypto.randomBytes(32).toString('hex');

        // Save refresh token to database with tenantId
        const refreshTokenExpiry = new Date();
        // 7 days by default, 30 days if rememberMe
        const days = rememberMe ? 30 : 7;
        refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + days);

        await prisma.refreshToken.create({
            data: {
                personId: user.id,
                token: refreshToken,
                expiresAt: refreshTokenExpiry,
                deviceInfo: {
                    userAgent: deviceInfo.userAgent || 'Unknown',
                    ipAddress: deviceInfo.ip || '127.0.0.1'
                },
                tenantId: user.tenantId || null
            }
        });

        return {
            accessToken,
            refreshToken,
            sessionToken,
            expiresIn,
            tokenType
        };
    }

    /**
     * Refresh access token
     */
    static async refreshAccessToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = this.verifyRefreshToken(refreshToken);
            void decoded; // keep for potential auditing

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

            // Generate new access token
            const user = refreshTokenRecord.person;
            const roles = (user.personRoles || []).map(pr => pr.roleType).filter(Boolean);

            // NOTE: Permissions NOT included in JWT to avoid 431 Header Too Large errors
            // Permissions are loaded server-side in authenticate middleware via RBACService

            const payload = {
                personId: user.id,
                email: user.email,
                companyId: user.companyId,
                tenantId: user.tenantId || null,
                roles
                // permissions omitted to keep JWT size manageable
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
        // Simple scoring system
        let score = 0;
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/\d/.test(password)) score += 1;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

        let strength = 'Weak';
        if (score >= 5) strength = 'Strong';
        else if (score >= 3) strength = 'Medium';

        return strength;
    }
}

export async function cleanupExpiredSessions() {
    return await JWTService.cleanExpiredSessions();
}

export default {
    JWTService,
    PasswordService,
    cleanupExpiredSessions
};