/**
 * @module CompanyTenantProfileService
 * @description Service per gestire CompanyTenantProfile (P49)
 * Gestisce le relazioni Company-Tenant nel nuovo pattern multi-tenant
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

/**
 * Valida se una stringa è un UUID valido
 * @param {string} str - Stringa da validare
 * @returns {boolean} - true se è un UUID valido
 */
function isValidUUID(str) {
    if (!str || typeof str !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

/**
 * Sanitizza i dati del profilo, rimuovendo referenteId non validi
 * @param {Object} profileData - Dati del profilo
 * @returns {Object} - Dati sanitizzati
 */
function sanitizeProfileData(profileData) {
    const sanitized = { ...profileData };

    // Se referenteId non è un UUID valido, rimuovilo
    if (sanitized.referenteId && !isValidUUID(sanitized.referenteId)) {
        logger.warn({
            action: 'invalid_referente_id_removed',
            invalidValue: sanitized.referenteId
        }, 'referenteId is not a valid UUID, removing from data');
        delete sanitized.referenteId;
    }

    // Rimuovi valori vuoti o undefined
    Object.keys(sanitized).forEach(key => {
        if (sanitized[key] === '' || sanitized[key] === undefined) {
            delete sanitized[key];
        }
    });

    return sanitized;
}

/**
 * CompanyTenantProfileService - Gestisce il nuovo modello multi-tenant per Company
 * 
 * Pattern P49:
 * - Company contiene solo dati globali (piva, ragioneSociale, sede legale)
 * - CompanyTenantProfile contiene dati specifici per tenant (referente, contatti, contratto)
 * - CompanySite sono sedi operative collegate a CompanyTenantProfile
 */
class CompanyTenantProfileService {
    /**
     * Trova o crea un CompanyTenantProfile per una Company in un Tenant
     * @param {string} companyId - ID della Company globale
     * @param {string} tenantId - ID del Tenant
     * @param {Object} profileData - Dati opzionali per il profilo
     * @returns {Promise<Object>} - CompanyTenantProfile creato o esistente
     */
    async findOrCreateProfile(companyId, tenantId, profileData = {}) {
        try {
            // Cerca profilo esistente
            let profile = await prisma.companyTenantProfile.findFirst({
                where: {
                    companyId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    company: true,
                    referente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            tenantProfiles: { where: { deletedAt: null }, select: { email: true }, take: 1 }
                        }
                    },
                    sites: true
                }
            });

            if (!profile) {
                // Sanitizza i dati del profilo prima della creazione
                const sanitizedProfileData = sanitizeProfileData(profileData);

                // Crea nuovo profilo
                profile = await prisma.companyTenantProfile.create({
                    data: {
                        companyId,
                        tenantId,
                        status: 'ACTIVE',
                        isActive: true,
                        isPrimary: true,
                        ...sanitizedProfileData
                    },
                    include: {
                        company: true,
                        referente: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                tenantProfiles: { where: { deletedAt: null }, select: { email: true }, take: 1 }
                            }
                        },
                        sites: true
                    }
                });

                logger.info({
                    action: 'company_tenant_profile_created',
                    companyId,
                    tenantId,
                    profileId: profile.id
                }, 'Created new CompanyTenantProfile');
            }

            return profile;
        } catch (error) {
            logger.error({
                action: 'find_or_create_profile_error',
                companyId,
                tenantId,
                error: error.message
            }, 'Error in findOrCreateProfile');
            throw error;
        }
    }

    /**
     * Ottiene tutti i profili di una Company (cross-tenant se autorizzato)
     * @param {string} companyId - ID della Company globale
     * @param {string[]} accessibleTenantIds - Array di tenant accessibili
     * @returns {Promise<Object[]>} - Array di CompanyTenantProfile
     */
    async getProfilesByCompany(companyId, accessibleTenantIds = []) {
        try {
            const where = {
                companyId,
                deletedAt: null
            };

            if (accessibleTenantIds.length > 0) {
                where.tenantId = { in: accessibleTenantIds };
            }

            return await prisma.companyTenantProfile.findMany({
                where,
                include: {
                    company: true,
                    tenant: { select: { id: true, name: true, slug: true } },
                    referente: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    sites: {
                        where: { deletedAt: null }
                    },
                    _count: {
                        select: {
                            personProfiles: true,
                            courseSchedules: true,
                            preventivi: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        } catch (error) {
            logger.error({
                action: 'get_profiles_by_company_error',
                companyId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Ottiene tutti i profili Company per un Tenant
     * @param {string} tenantId - ID del Tenant
     * @param {Object} options - Opzioni di filtro e paginazione
     * @returns {Promise<{profiles: Object[], total: number}>}
     */
    async getProfilesByTenant(tenantId, options = {}) {
        const {
            status,
            isActive,
            search,
            page = 1,
            limit = 50,
            includeCompany = true,
            includeSites = false,
            includeReferente = true
        } = options;

        try {
            const where = {
                tenantId,
                deletedAt: null
            };

            if (status) where.status = status;
            if (typeof isActive === 'boolean') where.isActive = isActive;

            if (search) {
                where.OR = [
                    { emailGenerale: { contains: search, mode: 'insensitive' } },
                    { telefonoGenerale: { contains: search, mode: 'insensitive' } },
                    { company: { ragioneSociale: { contains: search, mode: 'insensitive' } } },
                    { company: { piva: { contains: search, mode: 'insensitive' } } }
                ];
            }

            const include = {};
            if (includeCompany) {
                include.company = true;
            }
            if (includeSites) {
                include.sites = { where: { deletedAt: null } };
            }
            if (includeReferente) {
                include.referente = {
                    select: { id: true, firstName: true, lastName: true }
                };
            }

            const [profiles, total] = await Promise.all([
                prisma.companyTenantProfile.findMany({
                    where,
                    include,
                    skip: (page - 1) * limit,
                    take: limit,
                    orderBy: { company: { ragioneSociale: 'asc' } }
                }),
                prisma.companyTenantProfile.count({ where })
            ]);

            return { profiles, total, page, limit, totalPages: Math.ceil(total / limit) };
        } catch (error) {
            logger.error({
                action: 'get_profiles_by_tenant_error',
                tenantId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Aggiorna un CompanyTenantProfile
     * @param {string} profileId - ID del profilo
     * @param {Object} updateData - Dati da aggiornare
     * @param {string} tenantId - Tenant ID per verifica sicurezza
     * @returns {Promise<Object>}
     */
    async updateProfile(profileId, updateData, tenantId) {
        try {
            // Verifica che il profilo appartenga al tenant
            const existing = await prisma.companyTenantProfile.findFirst({
                where: { id: profileId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('CompanyTenantProfile not found');
            }

            if (existing.tenantId !== tenantId) {
                throw new Error('Unauthorized: profile belongs to different tenant');
            }

            // Rimuovi campi non modificabili
            const { id, companyId, tenantId: _, createdAt, ...unsafeData } = updateData;

            // Sanitizza i dati per validare referenteId
            const safeData = sanitizeProfileData(unsafeData);

            return await prisma.companyTenantProfile.update({
                where: { id: profileId },
                data: safeData,
                include: {
                    company: true,
                    referente: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    sites: { where: { deletedAt: null } }
                }
            });
        } catch (error) {
            logger.error({
                action: 'update_profile_error',
                profileId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Soft delete di un CompanyTenantProfile
     * @param {string} profileId - ID del profilo
     * @param {string} tenantId - Tenant ID per verifica sicurezza
     * @returns {Promise<Object>}
     */
    async deleteProfile(profileId, tenantId) {
        try {
            const existing = await prisma.companyTenantProfile.findFirst({
                where: { id: profileId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('CompanyTenantProfile not found');
            }

            if (existing.tenantId !== tenantId) {
                throw new Error('Unauthorized: profile belongs to different tenant');
            }

            return await prisma.companyTenantProfile.update({
                where: { id: profileId },
                data: { deletedAt: new Date() }
            });
        } catch (error) {
            logger.error({
                action: 'delete_profile_error',
                profileId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Cerca o crea una Company globale per P.IVA/CF
     * @param {Object} companyData - Dati della company
     * @returns {Promise<Object>} - Company trovata o creata
     */
    async findOrCreateCompany(companyData) {
        const { piva, codiceFiscale, ragioneSociale } = companyData;

        try {
            // Cerca per P.IVA o Codice Fiscale
            let company = null;

            if (piva) {
                company = await prisma.company.findFirst({
                    where: { piva, deletedAt: null }
                });
            }

            if (!company && codiceFiscale) {
                company = await prisma.company.findFirst({
                    where: { codiceFiscale, deletedAt: null }
                });
            }

            if (!company) {
                // Crea nuova Company globale
                company = await prisma.company.create({
                    data: {
                        piva,
                        codiceFiscale,
                        ragioneSociale,
                        sedeLegaleIndirizzo: companyData.sedeLegaleIndirizzo,
                        sedeLegaleCitta: companyData.sedeLegaleCitta,
                        sedeLegaleCap: companyData.sedeLegaleCap,
                        sedeLegaleProvincia: companyData.sedeLegaleProvincia,
                        sedeLegaleNazione: companyData.sedeLegaleNazione || 'IT',
                        formaGiuridica: companyData.formaGiuridica,
                        codiceAteco: companyData.codiceAteco,
                        settore: companyData.settore,
                        dimensione: companyData.dimensione,
                        sdi: companyData.sdi,
                        pecFatturazione: companyData.pecFatturazione
                    }
                });

                logger.info({
                    action: 'company_created',
                    companyId: company.id,
                    piva,
                    ragioneSociale
                }, 'Created new global Company');
            }

            return company;
        } catch (error) {
            logger.error({
                action: 'find_or_create_company_error',
                piva,
                ragioneSociale,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Crea una Company con il suo profilo per un Tenant (operazione combinata)
     * @param {Object} companyData - Dati company globali
     * @param {Object} profileData - Dati profilo tenant-specific
     * @param {string} tenantId - ID del Tenant
     * @returns {Promise<Object>} - { company, profile }
     */
    async createCompanyWithProfile(companyData, profileData, tenantId) {
        return await prisma.$transaction(async (tx) => {
            // 1. Trova o crea Company globale
            let company = null;

            if (companyData.piva) {
                company = await tx.company.findFirst({
                    where: { piva: companyData.piva, deletedAt: null }
                });
            }

            if (!company && companyData.codiceFiscale) {
                company = await tx.company.findFirst({
                    where: { codiceFiscale: companyData.codiceFiscale, deletedAt: null }
                });
            }

            if (!company) {
                company = await tx.company.create({
                    data: {
                        piva: companyData.piva,
                        codiceFiscale: companyData.codiceFiscale,
                        ragioneSociale: companyData.ragioneSociale,
                        sedeLegaleIndirizzo: companyData.sedeLegaleIndirizzo,
                        sedeLegaleCitta: companyData.sedeLegaleCitta,
                        sedeLegaleCap: companyData.sedeLegaleCap,
                        sedeLegaleProvincia: companyData.sedeLegaleProvincia,
                        sedeLegaleNazione: companyData.sedeLegaleNazione || 'IT',
                        formaGiuridica: companyData.formaGiuridica,
                        codiceAteco: companyData.codiceAteco,
                        settore: companyData.settore,
                        dimensione: companyData.dimensione,
                        sdi: companyData.sdi,
                        pecFatturazione: companyData.pecFatturazione
                    }
                });
            }

            // 2. Verifica se esiste già un profilo per questo tenant
            const existingProfile = await tx.companyTenantProfile.findFirst({
                where: {
                    companyId: company.id,
                    tenantId,
                    deletedAt: null
                }
            });

            if (existingProfile) {
                throw new Error(`Company già presente in questo tenant: ${company.ragioneSociale}`);
            }

            // 3. Sanitizza i dati del profilo (rimuove referenteId non validi)
            const sanitizedProfileData = sanitizeProfileData(profileData);

            // 4. Crea CompanyTenantProfile
            const profile = await tx.companyTenantProfile.create({
                data: {
                    companyId: company.id,
                    tenantId,
                    referenteId: sanitizedProfileData.referenteId || null,
                    referenteRuolo: sanitizedProfileData.referenteRuolo,
                    emailGenerale: sanitizedProfileData.emailGenerale,
                    telefonoGenerale: sanitizedProfileData.telefonoGenerale,
                    pec: sanitizedProfileData.pec,
                    dataInizioRapporto: sanitizedProfileData.dataInizioRapporto,
                    tipoContratto: sanitizedProfileData.tipoContratto,
                    numeroContratto: sanitizedProfileData.numeroContratto,
                    valoreContrattoAnnuo: sanitizedProfileData.valoreContrattoAnnuo,
                    listinoPrezzi: sanitizedProfileData.listinoPrezzi,
                    scontoPercentuale: sanitizedProfileData.scontoPercentuale,
                    terminiPagamento: sanitizedProfileData.terminiPagamento,
                    modalitaPagamento: sanitizedProfileData.modalitaPagamento,
                    iban: sanitizedProfileData.iban,
                    noteCommerciali: sanitizedProfileData.noteCommerciali,
                    noteOperative: sanitizedProfileData.noteOperative,
                    noteInterne: sanitizedProfileData.noteInterne,
                    status: 'ACTIVE',
                    isActive: true,
                    isPrimary: true
                },
                include: {
                    company: true,
                    referente: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                }
            });

            logger.info({
                action: 'company_with_profile_created',
                companyId: company.id,
                profileId: profile.id,
                tenantId
            }, 'Created Company with TenantProfile');

            return { company, profile };
        });
    }

    /**
     * Verifica se una Company è condivisa tra più tenant
     * @param {string} companyId - ID della Company
     * @returns {Promise<{isShared: boolean, tenantCount: number, profiles: Object[]}>}
     */
    async checkIfShared(companyId) {
        const profiles = await prisma.companyTenantProfile.findMany({
            where: {
                companyId,
                deletedAt: null
            },
            include: {
                tenant: { select: { id: true, name: true, slug: true } }
            }
        });

        return {
            isShared: profiles.length > 1,
            tenantCount: profiles.length,
            profiles
        };
    }
}

export default new CompanyTenantProfileService();
