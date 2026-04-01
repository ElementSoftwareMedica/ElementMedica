import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';
import { JWTService } from '../auth/jwt.js';

class AuthService {
  /**
   * Trova una persona per login (email, username o codice fiscale)
   * 
   * PROGETTO 48: email è ora in PersonTenantProfile
   * - username e taxCode sono in Person (globali)
   * - email è in PersonTenantProfile (per tenant)
   */
  async findPersonForLogin(identifier) {
    try {
      // Prima cerca per username o codice fiscale (campi globali in Person)
      let person = await prisma.person.findFirst({
        where: {
          OR: [
            { username: identifier },
            { taxCode: identifier }
          ],
          deletedAt: null
        },
        include: {
          tenantProfiles: {
            where: {
              deletedAt: null,
              isActive: true,
              status: 'ACTIVE'
            },
            include: {
              tenant: true
            }
          },
          personRoles: {
            where: {
              deletedAt: null
            },
            include: {
              companyTenantProfile: {
                include: {
                  company: true
                }
              },
              tenant: true,
              permissions: {
                where: {
                  isGranted: true
                }
              }
            }
          }
        }
      });

      // Se non trovato, cerca per email nei profili tenant
      if (!person) {
        const profile = await prisma.personTenantProfile.findFirst({
          where: {
            email: identifier,
            deletedAt: null,
            isActive: true,
            status: 'ACTIVE'
          },
          include: {
            person: {
              include: {
                tenantProfiles: {
                  where: {
                    deletedAt: null,
                    isActive: true,
                    status: 'ACTIVE'
                  },
                  include: {
                    tenant: true
                  }
                },
                personRoles: {
                  where: {
                    deletedAt: null
                  },
                  include: {
                    companyTenantProfile: {
                      include: {
                        company: true
                      }
                    },
                    tenant: true,
                    permissions: {
                      where: {
                        isGranted: true
                      }
                    }
                  }
                }
              }
            },
            tenant: true
          }
        });

        if (profile?.person) {
          person = profile.person;
          // Aggiungi il profilo primario trovato per login
          person._loginProfile = profile;
          person._loginTenant = profile.tenant;
        }
      }

      // Verifica che abbia almeno un profilo attivo
      if (person && (!person.tenantProfiles || person.tenantProfiles.length === 0)) {
        logger.warn('[AUTH_SERVICE] Person has no active tenant profiles', { personId: person.id });
        return null;
      }

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
        logger.warn('[AUTH] Login failed: person not found', { component: 'authService' });
        return { success: false, error: 'Persona non trovata' };
      }

      if (!person.password) {
        logger.warn('[AUTH_SERVICE] No password set', { personId: person.id });
        return { success: false, error: 'Nessuna password impostata per questa persona' };
      }

      const isValidPassword = await bcrypt.compare(password, person.password);

      if (!isValidPassword) {
        logger.warn('[AUTH_SERVICE] Invalid password', { personId: person.id });
        return { success: false, error: 'Password non valida' };
      }

      return { success: true, person };
    } catch (error) {
      logger.error('Error verifying credentials:', { error: error.message, stack: error.stack });
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

  /**
   * PROGETTO 49 - Login Multi-Step
   * Identifica persone associate a un identifier (email, username, taxCode)
   * 
   * Se l'identifier è univoco (username, taxCode, o email con 1 solo profilo):
   *   → Ritorna { unique: true, personId }
   * 
   * Se l'email ha più profili:
   *   → Ritorna { unique: false, accounts: [...], allowAlternative: true }
   * 
   * @param {string} identifier - Email, username o codice fiscale
   * @returns {Promise<{unique: boolean, personId?: string, accounts?: Array, allowAlternative?: boolean}>}
   */
  async identifyPerson(identifier) {
    try {
      if (!identifier || typeof identifier !== 'string') {
        return { success: false, error: 'Identificativo obbligatorio' };
      }

      const normalizedIdentifier = identifier.trim().toLowerCase();

      // 1. Prima cerca per username o codice fiscale (globali in Person - sempre univoci)
      const personByGlobalId = await prisma.person.findFirst({
        where: {
          OR: [
            { username: { equals: normalizedIdentifier, mode: 'insensitive' } },
            { taxCode: { equals: identifier.toUpperCase(), mode: 'insensitive' } }
          ],
          deletedAt: null
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          taxCode: true,
          tenantProfiles: {
            where: {
              deletedAt: null,
              isActive: true,
              status: 'ACTIVE'
            },
            select: {
              id: true,
              email: true,
              tenantId: true,
              tenant: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });

      if (personByGlobalId) {
        // Username o Codice Fiscale trovato - sempre univoco
        return {
          success: true,
          unique: true,
          personId: personByGlobalId.id,
          displayName: `${personByGlobalId.firstName} ${personByGlobalId.lastName}`,
          identifiedBy: personByGlobalId.username ? 'username' : 'taxCode'
        };
      }

      // 2. Cerca per email nei profili tenant
      const profilesByEmail = await prisma.personTenantProfile.findMany({
        where: {
          email: { equals: normalizedIdentifier, mode: 'insensitive' },
          deletedAt: null,
          isActive: true,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          email: true,
          tenantId: true,
          personId: true,
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              taxCode: true,
              deletedAt: true
            }
          },
          tenant: {
            select: { id: true, name: true }
          }
        }
      });

      // Filtra profili con Person attiva
      const activeProfiles = profilesByEmail.filter(p => p.person && !p.person.deletedAt);

      if (activeProfiles.length === 0) {
        // Nessun account trovato
        return {
          success: false,
          error: 'Account non trovato',
          message: 'Nessun account attivo trovato con questo identificativo'
        };
      }

      if (activeProfiles.length === 1) {
        // Email univoca - un solo profilo
        const profile = activeProfiles[0];
        return {
          success: true,
          unique: true,
          personId: profile.personId,
          displayName: `${profile.person.firstName} ${profile.person.lastName}`,
          identifiedBy: 'email',
          tenantName: profile.tenant?.name || null
        };
      }

      // 3. Email con più profili - richiede selezione
      // Raggruppa per personId unico (una persona può avere più profili in tenant diversi)
      const uniquePersonsMap = new Map();
      for (const profile of activeProfiles) {
        const personId = profile.personId;
        if (!uniquePersonsMap.has(personId)) {
          uniquePersonsMap.set(personId, {
            personId: profile.personId,
            firstName: profile.person.firstName,
            lastName: profile.person.lastName,
            displayName: `${profile.person.firstName} ${profile.person.lastName}`,
            hasUsername: !!profile.person.username,
            hasTaxCode: !!profile.person.taxCode,
            tenants: []
          });
        }
        uniquePersonsMap.get(personId).tenants.push({
          tenantId: profile.tenantId,
          tenantName: profile.tenant?.name || 'Unknown',
          profileId: profile.id,
          email: profile.email
        });
      }

      const accounts = Array.from(uniquePersonsMap.values());

      return {
        success: true,
        unique: false,
        accounts: accounts,
        allowAlternative: true,
        message: 'Trovati più account con questa email. Selezionarne uno o utilizzare username/codice fiscale.'
      };
    } catch (error) {
      logger.error('[AUTH_SERVICE] Error in identifyPerson:', {
        error: error.message,
        stack: error.stack,
        identifier: identifier ? `${identifier.substring(0, 3)}***` : null
      });
      return {
        success: false,
        error: 'Identificazione fallita',
        message: 'Si è verificato un errore durante l\'identificazione'
      };
    }
  }

  /**
   * PROGETTO 49 - Login con personId già identificato
   * Usato dopo la selezione account nel flusso multi-step
   * 
   * @param {string} personId - ID della persona selezionata
   * @param {string} password - Password
   * @returns {Promise<{success: boolean, person?: Object, error?: string}>}
   */
  async verifyCredentialsByPersonId(personId, password) {
    try {
      const person = await prisma.person.findFirst({ // F242: findFirst+deletedAt
        where: { id: personId, deletedAt: null },
        include: {
          tenantProfiles: {
            where: {
              deletedAt: null,
              isActive: true,
              status: 'ACTIVE'
            },
            include: {
              tenant: true
            }
          },
          personRoles: {
            where: {
              deletedAt: null
            },
            include: {
              companyTenantProfile: {
                include: {
                  company: true
                }
              },
              tenant: true,
              permissions: {
                where: {
                  isGranted: true
                }
              }
            }
          }
        }
      });

      if (!person || person.deletedAt) {
        return { success: false, error: 'Persona non trovata' };
      }

      if (!person.tenantProfiles || person.tenantProfiles.length === 0) {
        return { success: false, error: 'Nessun profilo tenant attivo' };
      }

      if (!person.password) {
        return { success: false, error: 'Nessuna password impostata per questa persona' };
      }

      const isValidPassword = await bcrypt.compare(password, person.password);
      if (!isValidPassword) {
        return { success: false, error: 'Password non valida' };
      }

      // Imposta il primo profilo come profilo di login
      person._loginProfile = person.tenantProfiles[0];
      person._loginTenant = person.tenantProfiles[0].tenant;

      return { success: true, person };
    } catch (error) {
      logger.error('[AUTH_SERVICE] Error in verifyCredentialsByPersonId:', {
        error: error.message,
        personId
      });
      return { success: false, error: 'Verifica fallita' };
    }
  }
}

export default new AuthService();