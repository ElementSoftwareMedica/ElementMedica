/**
 * JWT Authentication Service
 * Handles JWT token generation, validation, and refresh
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
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

        // P63: tenantId viene SOLO da PersonTenantProfile (Person.tenantId è stato RIMOSSO)
        const effectiveTenantId =
            user.tenantProfiles?.find(p => p.isActive || p.isPrimary)?.tenantId ||
            user.tenantProfiles?.[0]?.tenantId ||
            user.personRoles?.find(r => r.tenantId)?.tenantId ||
            null;

        // P48: email è su PersonTenantProfile, non su Person
        const primaryProfile = user.tenantProfiles?.find(p => p.isActive || p.isPrimary) || user.tenantProfiles?.[0];
        const effectiveEmail = primaryProfile?.email || user._loginProfile?.email || null;

        const payload = {
            personId: user.id,
            email: effectiveEmail,
            username: user.username,
            taxCode: user.taxCode,
            tenantId: effectiveTenantId,
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

        // P63: tenantId is required for RefreshToken - SOLO da PersonTenantProfile
        const refreshTenantId =
            user.tenantProfiles?.find(p => p.isActive || p.isPrimary)?.tenantId ||
            user.tenantProfiles?.[0]?.tenantId ||
            user.personRoles?.find(r => r.tenantId)?.tenantId;

        if (!refreshTenantId) {
            logger.error('[JWT] Cannot create RefreshToken: tenantId is required but not found', {
                personId: user.id,
                hasTenantProfiles: !!user.tenantProfiles?.length,
                hasPersonRoles: !!user.personRoles?.length
            });
            throw new Error('Cannot create session: user has no active tenant association');
        }

        await prisma.refreshToken.create({
            data: {
                personId: user.id,
                token: refreshToken,
                expiresAt: refreshTokenExpiry,
                deviceInfo: {
                    userAgent: deviceInfo.userAgent || 'Unknown',
                    ipAddress: deviceInfo.ip || '127.0.0.1'
                },
                tenantId: refreshTenantId
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
     * Refresh access token with token rotation.
     * Revokes the old refresh token and issues a new token pair.
     * Returns both a new access token and a new refresh token.
     */
    static async refreshAccessToken(refreshToken) {
        try {
            // Verify refresh token signature first (fast fail before DB query)
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
                                where: { isActive: true, deletedAt: null },
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

            const user = refreshTokenRecord.person;
            const tenantId = refreshTokenRecord.tenantId;

            // P48: Get tenant profile for email (Person is global, email on PersonTenantProfile)
            let profileEmail = null;
            if (tenantId) {
                const profile = await prisma.personTenantProfile.findFirst({
                    where: { personId: user.id, tenantId, deletedAt: null },
                    select: { email: true, companyTenantProfileId: true }
                });
                profileEmail = profile?.email || null;
            }

            // --- Token Rotation ---
            // 1. Revoke the consumed refresh token immediately to prevent reuse
            await prisma.refreshToken.update({
                where: { id: refreshTokenRecord.id },
                data: { revokedAt: new Date() }
            });

            // 2. Build a new token pair
            const roles = (user.personRoles || []).map(pr => pr.roleType).filter(Boolean);

            // NOTE: Permissions NOT included in JWT to avoid 431 Header Too Large errors
            // Permissions are loaded server-side in authenticate middleware via RBACService
            const payload = {
                personId: user.id,
                email: profileEmail,
                tenantId: tenantId || null,
                roles
            };

            const jti = typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : crypto.randomBytes(16).toString('hex');

            const newAccessToken = this.generateAccessToken(payload, { expiresIn: JWT_EXPIRES_IN });
            const newRefreshToken = this.generateRefreshToken(
                { personId: user.id, jti },
                { expiresIn: JWT_REFRESH_EXPIRES_IN }
            );

            // 3. Persist the new refresh token to DB
            const refreshTokenExpiry = new Date();
            refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

            await prisma.refreshToken.create({
                data: {
                    personId: user.id,
                    token: newRefreshToken,
                    expiresAt: refreshTokenExpiry,
                    deviceInfo: refreshTokenRecord.deviceInfo || {
                        userAgent: 'rotated',
                        ipAddress: '0.0.0.0'
                    },
                    tenantId
                }
            });

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
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
     * F207: Also removes revoked tokens older than 30 days to prevent table bloat
     */
    static async cleanExpiredSessions() {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await prisma.refreshToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { revokedAt: { lt: thirtyDaysAgo } }
                ]
            }
        });
        logger.info(`Cleaned ${result.count} expired/revoked refresh tokens`, { component: 'jwt-manager' });
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
        // F301: use crypto.randomBytes for cryptographic security (Math.random is not CSPRNG)
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        const charsetLength = charset.length;
        let password = '';
        const randomBytes = crypto.randomBytes(length * 2); // oversample to avoid modulo bias
        let byteIndex = 0;
        while (password.length < length) {
            const byte = randomBytes[byteIndex++];
            if (byte < Math.floor(256 / charsetLength) * charsetLength) {
                password += charset[byte % charsetLength];
            }
            // refill if we exhaust the buffer (rare with 2x oversampling)
            if (byteIndex >= randomBytes.length && password.length < length) {
                const extra = crypto.randomBytes(length);
                extra.forEach(b => {
                    if (password.length < length && b < Math.floor(256 / charsetLength) * charsetLength) {
                        password += charset[b % charsetLength];
                    }
                });
            }
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