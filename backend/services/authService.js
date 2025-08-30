import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';
import crypto from 'crypto';

class AuthService {
  /**
   * Trova una persona per login (email, username o codice fiscale)
   */
  async findPersonForLogin(identifier) {
    try {
      // Cerca per email, username o codice fiscale
      const person = await prisma.person.findFirst({
        where: {
          OR: [
            { email: identifier },
            { username: identifier },
            { taxCode: identifier }
          ],
          status: 'ACTIVE',
          deletedAt: null
        },
        include: {
          personRoles: {
            where: {
              deletedAt: null
            },
            include: {
              company: true,
              tenant: true
            }
          },
          company: true,
          tenant: true
        }
      });

      return person;
    } catch (error) {
      logger.error('Error finding person for login:', { error: error.message, identifier });
      throw error;
    }
  }

  /**
   * Verifica le credenziali di login
   */
  async verifyCredentials(identifier, password) {
    try {
      const person = await this.findPersonForLogin(identifier);
      
      if (!person) {
        return { success: false, error: 'Person not found' };
      }

      if (!person.password) {
        return { success: false, error: 'No password set for this person' };
      }

      const isValidPassword = await bcrypt.compare(password, person.password);
      
      if (!isValidPassword) {
        return { success: false, error: 'Invalid password' };
      }

      return { success: true, person };
    } catch (error) {
      logger.error('Error verifying credentials:', { error: error.message });
      throw error;
    }
  }

  /**
   * Genera i token JWT per una persona
   */
  generateTokens(person, rememberMe = false) {
    try {
      const roles = person.personRoles.map(pr => pr.roleType);
      
      const tokenPayload = {
        personId: person.id,
        email: person.email,
        username: person.username,
        taxCode: person.taxCode,
        companyId: person.companyId,
        tenantId: person.tenantId,
        roles
      };

      const accessTokenExpiry = rememberMe ? '7d' : '1h';
      const refreshTokenExpiry = rememberMe ? '30d' : '7d';

      const jwtSecret = process.env.JWT_SECRET || 'super-secret-jwt-key-for-development-change-in-production-2024';
      
      const accessToken = jwt.sign(
        tokenPayload,
        jwtSecret,
        { 
          expiresIn: accessTokenExpiry,
          issuer: 'training-platform',
          audience: 'training-platform-users'
        }
      );

      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-for-development-change-in-production-2024';
      
      // Aggiungi un identificatore univoco (jti) per evitare token identici generati nello stesso secondo
      const jti = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

      const refreshToken = jwt.sign(
        { personId: person.id, jti },
        jwtRefreshSecret,
        { 
          expiresIn: refreshTokenExpiry,
          issuer: 'training-platform',
          audience: 'training-platform-users'
        }
      );

      return {
        accessToken,
        refreshToken,
        expiresIn: rememberMe ? 7 * 24 * 60 * 60 : 60 * 60 // seconds
      };
    } catch (error) {
      logger.error('Error generating tokens:', { error: error.message });
      throw error;
    }
  }

  /**
   * Salva il refresh token su DB
   */
  async saveRefreshToken(token, personId, expiresAt, userAgent, ipAddress, tenantId) {
    try {
      return await prisma.refreshToken.create({
        data: {
          token,
          personId,
          expiresAt,
          deviceInfo: {
            userAgent: userAgent || 'Unknown',
            ipAddress: ipAddress || '0.0.0.0'
          },
          tenantId
        }
      });
    } catch (error) {
      logger.error('Error saving refresh token:', { error: error.message });
      throw error;
    }
  }

  /**
   * Restituisce i ruoli della persona in modo sincrono (senza query aggiuntive)
   * Mantiene compatibilità con i chiamanti esistenti.
   */
  getPersonRoles(person) {
    try {
      if (!person) return [];
      if (Array.isArray(person.personRoles)) {
        return person.personRoles
          .filter(pr => !pr.deletedAt)
          .map(pr => pr.roleType)
          .filter(Boolean);
      }
      return [];
    } catch (error) {
      logger.warn('Error getting person roles from person object', { error: error.message });
      return [];
    }
  }
}

export default new AuthService();