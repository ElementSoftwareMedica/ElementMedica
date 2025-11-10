/**
 * DEPRECATED: AdvancedJWTService
 * Questo modulo è deprecato. Manteniamo uno shim minimo per compatibilità,
 * delegando alle nuove API in auth/jwt.js (JWTService).
 */

import { JWTService } from './jwt.js';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

// Shim compatibilità per metodi usati storicamente altrove
export default class AdvancedJWTService {
  // Genera access+refresh, compat: generateTokenPair(user, deviceInfo)
  static async generateTokenPair(user, deviceInfo = {}) {
    return JWTService.generateTokenPair(user, deviceInfo);
  }

  // Verifica access token
  static verifyAccessToken(token) {
    return JWTService.verifyAccessToken(token);
  }

  // Refresh access token da refresh token
  static async refreshAccessToken(refreshToken) {
    return JWTService.refreshAccessToken(refreshToken);
  }

  // Revoca una sessione dato il refresh token (compat: revokeRefreshToken)
  static async revokeRefreshToken(refreshToken) {
    return JWTService.revokeSession(refreshToken);
  }

  // Revoca tutte le sessioni della persona
  static async revokeAllPersonSessions(personId) {
    return JWTService.revokeAllPersonSessions(personId);
  }

  // Elenco sessioni attive per utente (compat getPersonSessions)
  static async getPersonSessions(personId) {
    try {
      const sessions = await prisma.refreshToken.findMany({
        where: {
          personId,
          revokedAt: null,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          token: true,
          createdAt: true,
          expiresAt: true,
          deviceInfo: true
        }
      });
      return sessions.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        deviceInfo: s.deviceInfo || null
      }));
    } catch (error) {
      logger.error('getPersonSessions failed', { personId, error: error.message });
      throw error;
    }
  }

  // Pulizia token scaduti (compat cleanupExpiredSessions)
  static async cleanupExpiredSessions() {
    return JWTService.cleanExpiredSessions();
  }
}