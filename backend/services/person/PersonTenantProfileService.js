import logger from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';

/**
 * PersonTenantProfileService - Gestione profili persona per tenant
 * 
 * Progetto 48: Ogni persona può avere profili diversi in tenant diversi.
 * Questo servizio gestisce la creazione, lettura e aggiornamento dei profili.
 */
class PersonTenantProfileService {

    /**
     * Ottiene il profilo di una persona per un tenant specifico
     * @param {string} personId - ID della persona (PersonCore)
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<Object|null>} Profilo o null
     */
    static async getProfile(personId, tenantId) {
        try {
            const profile = await prisma.personTenantProfile.findFirst({
                where: {
                    personId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    person: true,
                    companyTenantProfile: { select: { id: true, company: { select: { ragioneSociale: true } } } },
                    site: { select: { id: true, siteName: true } },
                    reparto: { select: { id: true, nome: true } }
                }
            });

            return profile;
        } catch (error) {
            logger.error({ error: error.message, personId, tenantId }, 'Error getting person tenant profile');
            throw error;
        }
    }

    /**
     * Ottiene tutti i profili di una persona (tutti i tenant)
     * @param {string} personId - ID della persona
     * @returns {Promise<Array>} Array di profili
     */
    static async getAllProfilesForPerson(personId) {
        try {
            const profiles = await prisma.personTenantProfile.findMany({
                where: {
                    personId,
                    deletedAt: null
                },
                include: {
                    tenant: { select: { id: true, name: true, slug: true } },
                    companyTenantProfile: { select: { id: true, company: { select: { ragioneSociale: true } } } }
                },
                orderBy: { isPrimary: 'desc' }
            });

            return profiles;
        } catch (error) {
            logger.error({ error: error.message, personId }, 'Error getting all profiles for person');
            throw error;
        }
    }

    /**
     * Ottiene tutte le persone con profilo in un tenant
     * @param {string} tenantId - ID del tenant
     * @param {Object} options - Opzioni di filtro
     * @returns {Promise<Array>} Array di profili con persona
     */
    static async getProfilesByTenant(tenantId, options = {}) {
        const { status, companyId, siteId, repartoId, isActive = true, page = 1, limit = 50 } = options;

        try {
            const where = {
                tenantId,
                deletedAt: null,
                ...(isActive !== undefined && { isActive }),
                ...(status && { status }),
                ...(companyId && { companyId }),
                ...(siteId && { siteId }),
                ...(repartoId && { repartoId })
            };

            const [profiles, total] = await Promise.all([
                prisma.personTenantProfile.findMany({
                    where,
                    include: {
                        person: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                taxCode: true,
                                birthDate: true,
                                gender: true,
                                profileImage: true,
                                username: true
                            }
                        },
                        companyTenantProfile: { select: { id: true, company: { select: { ragioneSociale: true } } } },
                        site: { select: { id: true, siteName: true } },
                        reparto: { select: { id: true, nome: true } }
                    },
                    skip: (page - 1) * limit,
                    take: limit,
                    orderBy: [
                        { isPrimary: 'desc' },
                        { person: { lastName: 'asc' } }
                    ]
                }),
                prisma.personTenantProfile.count({ where })
            ]);

            return {
                profiles,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error({ error: error.message, tenantId, options }, 'Error getting profiles by tenant');
            throw error;
        }
    }

    /**
     * Crea un profilo per una persona in un tenant
     * @param {string} personId - ID della persona
     * @param {string} tenantId - ID del tenant
     * @param {Object} profileData - Dati del profilo
     * @returns {Promise<Object>} Profilo creato
     */
    static async createProfile(personId, tenantId, profileData) {
        try {
            // Verifica che la persona esista
            const person = await prisma.person.findFirst({ // F246: findFirst+deletedAt
                where: { id: personId, deletedAt: null }
            });

            if (!person) {
                throw new Error(`Person with id ${personId} not found`);
            }

            // Verifica che il tenant esista
            const tenant = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null }
            });

            if (!tenant) {
                throw new Error(`Tenant with id ${tenantId} not found`);
            }

            // Verifica se esiste già un profilo
            const existingProfile = await prisma.personTenantProfile.findFirst({
                where: {
                    personId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (existingProfile) {
                throw new Error(`Profile already exists for person ${personId} in tenant ${tenantId}`);
            }

            // Determina se è il primo profilo (diventa primario)
            const profileCount = await prisma.personTenantProfile.count({
                where: { personId, deletedAt: null }
            });

            const profile = await prisma.personTenantProfile.create({
                data: {
                    personId,
                    tenantId,
                    isPrimary: profileCount === 0, // Primo profilo = primario
                    ...this.sanitizeProfileData(profileData)
                },
                include: {
                    person: true,
                    tenant: { select: { id: true, name: true } }
                }
            });

            logger.info({ personId, tenantId, profileId: profile.id }, 'Person tenant profile created');
            return profile;
        } catch (error) {
            logger.error({ error: error.message, personId, tenantId }, 'Error creating person tenant profile');
            throw error;
        }
    }

    /**
     * Aggiorna un profilo
     * @param {string} personId - ID della persona
     * @param {string} tenantId - ID del tenant
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Object>} Profilo aggiornato
     */
    static async updateProfile(personId, tenantId, updateData) {
        try {
            const profile = await prisma.personTenantProfile.update({
                where: {
                    personId_tenantId: { personId, tenantId }
                },
                data: this.sanitizeProfileData(updateData),
                include: {
                    person: true,
                    companyTenantProfile: { select: { id: true, company: { select: { ragioneSociale: true } } } },
                    site: { select: { id: true, siteName: true } }
                }
            });

            logger.info({ personId, tenantId }, 'Person tenant profile updated');
            return profile;
        } catch (error) {
            logger.error({ error: error.message, personId, tenantId }, 'Error updating person tenant profile');
            throw error;
        }
    }

    /**
     * Elimina un profilo (soft delete)
     * @param {string} personId - ID della persona
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<Object>} Risultato
     */
    static async deleteProfile(personId, tenantId) {
        try {
            const profile = await prisma.personTenantProfile.update({
                where: {
                    personId_tenantId: { personId, tenantId }
                },
                data: {
                    deletedAt: new Date(),
                    isActive: false
                }
            });

            logger.info({ personId, tenantId }, 'Person tenant profile soft deleted');
            return { success: true, profile };
        } catch (error) {
            logger.error({ error: error.message, personId, tenantId }, 'Error deleting person tenant profile');
            throw error;
        }
    }

    /**
     * Imposta un profilo come primario
     * @param {string} personId - ID della persona
     * @param {string} tenantId - ID del tenant da impostare come primario
     * @returns {Promise<Object>} Profilo aggiornato
     */
    static async setPrimaryProfile(personId, tenantId) {
        try {
            // Rimuovi isPrimary da tutti gli altri profili
            await prisma.personTenantProfile.updateMany({
                where: {
                    personId,
                    tenantId: { not: tenantId }
                },
                data: { isPrimary: false }
            });

            // Imposta il profilo selezionato come primario
            const profile = await prisma.personTenantProfile.update({
                where: {
                    personId_tenantId: { personId, tenantId }
                },
                data: { isPrimary: true }
            });

            logger.info({ personId, tenantId }, 'Primary profile set');
            return profile;
        } catch (error) {
            logger.error({ error: error.message, personId, tenantId }, 'Error setting primary profile');
            throw error;
        }
    }

    /**
     * Ottiene il profilo primario di una persona
     * @param {string} personId - ID della persona
     * @returns {Promise<Object|null>} Profilo primario o null
     */
    static async getPrimaryProfile(personId) {
        try {
            const profile = await prisma.personTenantProfile.findFirst({
                where: {
                    personId,
                    isPrimary: true,
                    deletedAt: null
                },
                include: {
                    tenant: { select: { id: true, name: true, slug: true } },
                    companyTenantProfile: { select: { id: true, company: { select: { ragioneSociale: true } } } }
                }
            });

            return profile;
        } catch (error) {
            logger.error({ error: error.message, personId }, 'Error getting primary profile');
            throw error;
        }
    }

    /**
     * Cerca profili con criteri vari
     * @param {string} tenantId - ID del tenant
     * @param {Object} searchCriteria - Criteri di ricerca
     * @returns {Promise<Array>} Array di profili
     */
    static async searchProfiles(tenantId, searchCriteria = {}) {
        const { query, status, companyId, specialties, certifications } = searchCriteria;

        try {
            const where = {
                tenantId,
                deletedAt: null,
                ...(status && { status }),
                ...(companyId && { companyId }),
                ...(specialties?.length && { specialties: { hasSome: specialties } }),
                ...(certifications?.length && { certifications: { hasSome: certifications } })
            };

            // Ricerca full-text su nome persona
            if (query) {
                where.OR = [
                    { person: { firstName: { contains: query, mode: 'insensitive' } } },
                    { person: { lastName: { contains: query, mode: 'insensitive' } } },
                    { person: { taxCode: { contains: query, mode: 'insensitive' } } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { title: { contains: query, mode: 'insensitive' } }
                ];
            }

            const profiles = await prisma.personTenantProfile.findMany({
                where,
                include: {
                    person: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true,
                            profileImage: true
                        }
                    },
                    companyTenantProfile: { select: { id: true, company: { select: { ragioneSociale: true } } } }
                },
                orderBy: { person: { lastName: 'asc' } },
                take: 100
            });

            return profiles;
        } catch (error) {
            logger.error({ error: error.message, tenantId, searchCriteria }, 'Error searching profiles');
            throw error;
        }
    }

    /**
     * Ottiene persone con profilo in un tenant e specifico ruolo
     * @param {string} tenantId - ID del tenant
     * @param {string|Array} roleType - Tipo/i di ruolo
     * @returns {Promise<Array>} Array di profili con ruoli
     */
    static async getProfilesByRole(tenantId, roleType) {
        try {
            const roleTypes = Array.isArray(roleType) ? roleType : [roleType];

            const profiles = await prisma.personTenantProfile.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    isActive: true,
                    person: {
                        personRoles: {
                            some: {
                                tenantId,
                                roleType: { in: roleTypes },
                                isActive: true
                            }
                        }
                    }
                },
                include: {
                    person: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true,
                            profileImage: true,
                            personRoles: {
                                where: {
                                    tenantId,
                                    isActive: true
                                },
                                select: {
                                    id: true,
                                    roleType: true,
                                    isPrimary: true
                                }
                            }
                        }
                    }
                },
                orderBy: { person: { lastName: 'asc' } }
            });

            return profiles;
        } catch (error) {
            logger.error({ error: error.message, tenantId, roleType }, 'Error getting profiles by role');
            throw error;
        }
    }

    /**
     * Sanitizza i dati del profilo prima del salvataggio
     * @private
     */
    static sanitizeProfileData(data) {
        const sanitized = { ...data };

        // Rimuovi campi che non appartengono al profilo
        delete sanitized.personId;
        delete sanitized.tenantId;
        delete sanitized.id;
        delete sanitized.createdAt;
        delete sanitized.updatedAt;

        // Normalizza email
        if (sanitized.email) {
            sanitized.email = sanitized.email.toLowerCase().trim();
        }

        // Converti date
        if (sanitized.hiredDate && typeof sanitized.hiredDate === 'string') {
            sanitized.hiredDate = new Date(sanitized.hiredDate);
        }
        if (sanitized.endDate && typeof sanitized.endDate === 'string') {
            sanitized.endDate = new Date(sanitized.endDate);
        }

        // Converti hourlyRate/monthlyRate a Decimal
        if (sanitized.hourlyRate !== undefined) {
            sanitized.hourlyRate = sanitized.hourlyRate ? parseFloat(sanitized.hourlyRate) : null;
        }
        if (sanitized.monthlyRate !== undefined) {
            sanitized.monthlyRate = sanitized.monthlyRate ? parseFloat(sanitized.monthlyRate) : null;
        }

        return sanitized;
    }

    /**
     * Crea o ottiene un profilo per una persona in un tenant
     * (utile durante la transizione dal vecchio modello)
     * @param {string} personId - ID della persona
     * @param {string} tenantId - ID del tenant
     * @param {Object} defaultData - Dati di default se deve creare
     * @returns {Promise<Object>} Profilo esistente o creato
     */
    static async getOrCreateProfile(personId, tenantId, defaultData = {}) {
        try {
            let profile = await this.getProfile(personId, tenantId);

            if (!profile) {
                profile = await this.createProfile(personId, tenantId, {
                    status: 'PENDING',
                    isActive: true,
                    ...defaultData
                });
            }

            return profile;
        } catch (error) {
            logger.error({ error: error.message, personId, tenantId }, 'Error in getOrCreateProfile');
            throw error;
        }
    }
}

export default PersonTenantProfileService;
