import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';
import { JWTService } from '../auth/jwt.js';

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
   * Genera e PERSISTE i token JWT per una persona tramite JWTService
   * - Usa esclusivamente JWTService per payload, firma e persistenza refresh token
   * - Evita divergenze di durata: demanda a JWTService (env o rememberMe)
   */
  async generateTokens(person, rememberMeOrOptions = false) {
    try {
      // Backward compat: accetta boolean oppure oggetto opzioni { rememberMe, extraClaims, deviceInfo }
      let options = {};
      if (typeof rememberMeOrOptions === 'boolean') {
        options.rememberMe = rememberMeOrOptions;
      } else if (rememberMeOrOptions && typeof rememberMeOrOptions === 'object') {
        options = { ...rememberMeOrOptions };
      }

      const deviceInfo = options.deviceInfo || {};

      // Centralizza completamente su JWTService
      const result = await JWTService.generateTokenPair(person, deviceInfo, {
        rememberMe: !!options.rememberMe,
        extraClaims: options.extraClaims
      });

      return result;
    } catch (error) {
      logger.error('Error generating tokens:', { error: error.message });
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