import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';

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
      
      const refreshToken = jwt.sign(
        { personId: person.id },
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
   * Aggiorna l'ultimo accesso
   */
  async updateLastLogin(personId) {
    try {
      // Aggiorna il campo lastLogin (non lastLoginAt)
      await prisma.person.update({
        where: { id: personId },
        data: { lastLogin: new Date() }
      });
    } catch (error) {
      logger.error('Error updating last login:', { error: error.message, personId });
      throw error;
    }
  }

  /**
   * Salva il refresh token
   */
  async saveRefreshToken(token, personId, expiresAt, userAgent, ipAddress, tenantId) {
    try {
      console.log('🔍 saveRefreshToken called with:', { personId, tenantId, typeof_tenantId: typeof tenantId });
      
      // Se tenantId è null, cerchiamo il primo tenant disponibile o creiamo un tenant di default
      let finalTenantId = tenantId;
      if (!tenantId) {
        console.log('⚠️ tenantId is null, looking for default tenant...');
        
        // Cerca il primo tenant disponibile
        const defaultTenant = await prisma.tenant.findFirst({
          where: { isActive: true }
        });
        
        if (defaultTenant) {
          finalTenantId = defaultTenant.id;
          console.log('✅ Using default tenant:', finalTenantId);
        } else {
          throw new Error('No active tenant found and tenantId is null');
        }
      }
      
      // Elimina i vecchi token scaduti o per questa persona
      await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { personId: personId } // Elimina i vecchi token per questa persona
          ]
        }
      });

      // Crea il nuovo token usando i campi corretti del schema
      await prisma.refreshToken.create({
        data: {
          token,
          personId: personId,
          tenantId: finalTenantId,
          expiresAt,
          deviceInfo: {
            userAgent: userAgent || 'Unknown',
            ipAddress: ipAddress || 'Unknown'
          }
        }
      });
      
      logger.info('Refresh token saved successfully', { personId, tenantId });
    } catch (error) {
      logger.error('Error saving refresh token:', { error: error.message });
      throw error;
    }
  }

  /**
   * Verifica se una persona ha un ruolo specifico
   */
  hasRole(person, roleType) {
    return person.personRoles.some(pr => pr.roleType === roleType && pr.isActive);
  }

  /**
   * Ottiene tutti i ruoli di una persona
   */
  getPersonRoles(person) {
    if (!person.personRoles) {
      console.log('⚠️ AuthService.getPersonRoles: person.personRoles is null/undefined');
      return [];
    }
    
    const roles = person.personRoles
      .filter(pr => pr.isActive)
      .map(pr => pr.roleType);
      
    console.log('🔍 AuthService.getPersonRoles:', {
      personId: person.id,
      personRolesCount: person.personRoles.length,
      activeRoles: roles
    });
    
    return roles;
  }
}

export default new AuthService();