/**
 * Paziente Service
 * 
 * Gestisce i pazienti con logica di integrazione Person/CF.
 * Se un paziente ha lo stesso CF di una Person esistente (es. un employee della formazione),
 * vengono collegati e viene aggiunto il ruolo PAZIENTE.
 * 
 * @module services/clinical/PazienteService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import crypto from 'crypto';
import { generateNameVariants } from '../../utils/nameNormalization.js';

class PazienteService {
    /**
     * Cerca o crea un paziente
     * Se il CF corrisponde a una Person esistente, la collega aggiungendo ruolo PAZIENTE
     * Altrimenti crea una nuova Person con ruolo PAZIENTE
     * 
     * @param {Object} data - Dati paziente
     * @param {string} data.firstName - Nome
     * @param {string} data.lastName - Cognome
     * @param {string} data.taxCode - Codice fiscale
     * @param {string} [data.email] - Email
     * @param {string} [data.phone] - Telefono
     * @param {Date} [data.birthDate] - Data di nascita
     * @param {string} [data.residenceAddress] - Indirizzo
     * @param {string} [data.residenceCity] - Città
     * @param {string} [data.postalCode] - CAP
     * @param {string} [data.province] - Provincia
     * @param {string} tenantId - ID tenant clinica
     * @param {string} [createdBy] - ID utente che crea
     * @returns {Promise<{person: Object, isNew: boolean, wasLinked: boolean}>}
     */
    async findOrCreatePaziente(data, tenantId, createdBy = null) {
        const { taxCode, email, existingPersonId } = data;

        try {
            // 0. Se abbiamo l'ID paziente esistente, cerca direttamente per ID
            // Questo supporta il caso di pazienti provvisori creati senza CF
            let existingPerson = null;

            if (existingPersonId) {
                existingPerson = await prisma.person.findFirst({
                    where: {
                        id: existingPersonId,
                        deletedAt: null
                    },
                    include: {
                        personRoles: {
                            where: { deletedAt: null, isActive: true }
                        }
                    }
                });

                if (existingPerson) {
                    logger.info('Found existing person by ID', {
                        component: 'paziente-service',
                        action: 'find-by-id',
                        personId: existingPersonId,
                        tenantId
                    });
                }
            }

            // 1. Se non trovato per ID, cerca per CF (cross-tenant se presente)
            if (!existingPerson && taxCode) {
                existingPerson = await prisma.person.findFirst({
                    where: {
                        taxCode: taxCode.toUpperCase(),
                        deletedAt: null
                    },
                    include: {
                        personRoles: {
                            where: { deletedAt: null, isActive: true }
                        }
                    }
                });
            }

            // 2. Se non trovato per CF, cerca per email nei profili tenant
            // P48: email è in PersonTenantProfile, non in Person
            if (!existingPerson && email) {
                const profile = await prisma.personTenantProfile.findFirst({
                    where: {
                        email: email.toLowerCase(),
                        tenantId,
                        deletedAt: null
                    },
                    include: {
                        person: {
                            include: {
                                personRoles: {
                                    where: { deletedAt: null, isActive: true }
                                }
                            }
                        }
                    }
                });
                existingPerson = profile?.person;
            }

            // 3. Se esiste, verifica se ha già ruolo PAZIENTE
            if (existingPerson) {
                const hasPazienteRole = existingPerson.personRoles.some(
                    role => role.roleType === 'PAZIENTE' && role.tenantId === tenantId
                );

                if (!hasPazienteRole) {
                    // Verifica se esiste un ruolo PAZIENTE soft-deleted per questo tenant
                    // (per evitare violazione del unique constraint)
                    const existingDeletedRole = await prisma.personRole.findFirst({
                        where: {
                            personId: existingPerson.id,
                            roleType: 'PAZIENTE',
                            tenantId,
                            customRoleId: null,
                            companyTenantProfileId: null
                        }
                    });

                    if (existingDeletedRole) {
                        // Riattiva il ruolo soft-deleted invece di crearne uno nuovo
                        await prisma.personRole.update({
                            where: { id: existingDeletedRole.id },
                            data: {
                                isActive: true,
                                deletedAt: null,
                                assignedBy: createdBy,
                                updatedAt: new Date()
                            }
                        });
                    } else {
                        // Crea nuovo ruolo PAZIENTE per questo tenant
                        await prisma.personRole.create({
                            data: {
                                personId: existingPerson.id,
                                roleType: 'PAZIENTE',
                                isActive: true,
                                isPrimary: false,
                                tenantId,
                                assignedBy: createdBy
                            }
                        });
                    }

                    logger.info('Added PAZIENTE role to existing person', {
                        component: 'paziente-service',
                        action: 'link-paziente',
                        personId: existingPerson.id,
                        taxCode,
                        tenantId
                    });
                }

                // P48: Aggiorna/crea PersonTenantProfile per dati tenant-specifici
                // Prima verifica se esiste già un profilo per questo tenant
                let tenantProfile = await prisma.personTenantProfile.findFirst({
                    where: {
                        personId: existingPerson.id,
                        tenantId,
                        deletedAt: null
                    }
                });

                // Prepara dati per Person (solo campi globali)
                // SEMPRE sovrascrivere se l'utente fornisce nuovi valori
                const personUpdates = {};
                // P52 Session #10: Aggiungere firstName e lastName agli updates
                if (data.firstName && data.firstName !== existingPerson.firstName) {
                    personUpdates.firstName = data.firstName;
                }
                if (data.lastName && data.lastName !== existingPerson.lastName) {
                    personUpdates.lastName = data.lastName;
                }
                if (taxCode && taxCode.toUpperCase() !== existingPerson.taxCode) {
                    personUpdates.taxCode = taxCode.toUpperCase();
                }
                if (data.birthDate) {
                    personUpdates.birthDate = new Date(data.birthDate);
                }
                if (data.gender) {
                    personUpdates.gender = data.gender;
                }
                if (data.birthPlace) {
                    personUpdates.birthPlace = data.birthPlace;
                }
                if (data.birthProvince) {
                    personUpdates.birthProvince = data.birthProvince;
                }

                if (Object.keys(personUpdates).length > 0) {
                    await prisma.person.update({
                        where: { id: existingPerson.id },
                        data: personUpdates
                    });

                    logger.info('Updated person data', {
                        component: 'paziente-service',
                        action: 'update-person',
                        personId: existingPerson.id,
                        fields: Object.keys(personUpdates),
                        tenantId
                    });
                }

                // Prepara dati per PersonTenantProfile (campi tenant-specifici)
                const profileData = {};
                if (data.phone) profileData.phone = data.phone;
                if (data.residenceAddress) profileData.residenceAddress = data.residenceAddress;
                if (data.residenceCity) profileData.residenceCity = data.residenceCity;
                if (data.postalCode) profileData.postalCode = data.postalCode;
                if (data.province) profileData.province = data.province;
                if (email) profileData.email = email.toLowerCase();

                if (tenantProfile) {
                    // SEMPRE sovrascrivere i campi se l'utente fornisce nuovi valori
                    const profileUpdates = {};
                    if (profileData.phone) profileUpdates.phone = profileData.phone;
                    if (profileData.residenceAddress) profileUpdates.residenceAddress = profileData.residenceAddress;
                    if (profileData.residenceCity) profileUpdates.residenceCity = profileData.residenceCity;
                    if (profileData.postalCode) profileUpdates.postalCode = profileData.postalCode;
                    if (profileData.province) profileUpdates.province = profileData.province;
                    if (profileData.email) profileUpdates.email = profileData.email;

                    if (Object.keys(profileUpdates).length > 0) {
                        await prisma.personTenantProfile.update({
                            where: { id: tenantProfile.id },
                            data: profileUpdates
                        });

                        logger.info('Updated tenant profile data', {
                            component: 'paziente-service',
                            action: 'update-profile',
                            personId: existingPerson.id,
                            profileId: tenantProfile.id,
                            fields: Object.keys(profileUpdates),
                            tenantId
                        });
                    }
                } else {
                    // Crea nuovo profilo tenant
                    await prisma.personTenantProfile.create({
                        data: {
                            personId: existingPerson.id,
                            tenantId,
                            email: profileData.email || null,
                            phone: profileData.phone || null,
                            residenceAddress: profileData.residenceAddress || null,
                            residenceCity: profileData.residenceCity || null,
                            postalCode: profileData.postalCode || null,
                            province: profileData.province || null,
                            status: 'ACTIVE',
                            isPrimary: false, // Non primario se persona esiste già
                            isActive: true
                        }
                    });
                }

                // Ricarica person con ruoli e profilo aggiornati
                // P48: Include tenantProfiles per email/phone flattening
                const updatedPerson = await prisma.person.findFirst({ // F246: findFirst+deletedAt
                    where: { id: existingPerson.id, deletedAt: null },
                    include: {
                        personRoles: {
                            where: { deletedAt: null, isActive: true }
                        },
                        tenantProfiles: {
                            where: { deletedAt: null, isActive: true }
                        }
                    }
                });

                // P48: Flatten per backward compatibility
                const primaryProfile = updatedPerson.tenantProfiles?.find(p => p.isPrimary) || updatedPerson.tenantProfiles?.[0] || {};

                return {
                    person: {
                        ...updatedPerson,
                        email: primaryProfile.email || null,
                        phone: primaryProfile.phone || null,
                        residenceAddress: primaryProfile.residenceAddress || null,
                        residenceCity: primaryProfile.residenceCity || null,
                        postalCode: primaryProfile.postalCode || null,
                        province: primaryProfile.province || null,
                        status: primaryProfile.status || 'PENDING'
                    },
                    isNew: false,
                    wasLinked: !hasPazienteRole
                };
            }

            // 4. Crea nuova Person con ruolo PAZIENTE
            // P48: email, phone, status vanno in PersonTenantProfile
            // NOTE: Person non ha tenantId diretto - il tenant è attraverso PersonTenantProfile e PersonRole
            const newPerson = await prisma.person.create({
                data: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    taxCode: taxCode ? taxCode.toUpperCase() : null,
                    birthDate: data.birthDate ? new Date(data.birthDate) : null,
                    gender: data.gender || null,
                    birthPlace: data.birthPlace || null,
                    birthProvince: data.birthProvince || null,
                    // Se fornita email, genera password temporanea
                    password: email ? await this.generateTemporaryPassword() : null,
                    mustChangePassword: !!email, // Forzare cambio password al primo accesso
                    // P48: Crea PersonTenantProfile per dati tenant-specifici
                    tenantProfiles: {
                        create: {
                            tenantId,
                            email: email ? email.toLowerCase() : null,
                            phone: data.phone || null,
                            status: 'ACTIVE',
                            isPrimary: true,
                            isActive: true,
                            residenceAddress: data.residenceAddress || null,
                            residenceCity: data.residenceCity || null,
                            postalCode: data.postalCode || null,
                            province: data.province || null
                        }
                    },
                    personRoles: {
                        create: {
                            roleType: 'PAZIENTE',
                            isActive: true,
                            isPrimary: true,
                            tenantId,
                            assignedBy: createdBy
                        }
                    }
                },
                include: {
                    personRoles: {
                        where: { deletedAt: null, isActive: true }
                    },
                    tenantProfiles: {
                        where: { tenantId }
                    }
                }
            });

            logger.info('Created new paziente', {
                component: 'paziente-service',
                action: 'create-paziente',
                personId: newPerson.id,
                taxCode,
                tenantId
            });

            return {
                person: newPerson,
                isNew: true,
                wasLinked: false
            };

        } catch (error) {
            logger.error('Error in findOrCreatePaziente', {
                component: 'paziente-service',
                action: 'find-or-create',
                error: error.message,
                taxCode,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Cerca paziente per CF
     * P48: Include tenantProfiles per email/phone
     * @param {string} taxCode - Codice fiscale
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object|null>}
     */
    async findByTaxCode(taxCode, tenantId) {
        if (!taxCode) return null;

        const person = await prisma.person.findFirst({
            where: {
                taxCode: taxCode.toUpperCase(),
                deletedAt: null
            },
            include: {
                personRoles: {
                    where: {
                        deletedAt: null,
                        isActive: true
                    }
                },
                // P48: Include tenant profiles
                tenantProfiles: {
                    where: { deletedAt: null, isActive: true }
                }
            }
        });

        if (!person) return null;

        // Verifica se ha ruolo PAZIENTE per questo tenant
        const hasPazienteRole = person.personRoles.some(
            role => role.roleType === 'PAZIENTE' && role.tenantId === tenantId
        );

        // P48: Flatten email/phone da tenantProfiles
        const primaryProfile = person.tenantProfiles?.find(p => p.isPrimary) || person.tenantProfiles?.[0] || {};

        return {
            ...person,
            // P48: Flatten per backward compatibility
            email: primaryProfile.email || null,
            phone: primaryProfile.phone || null,
            residenceAddress: primaryProfile.residenceAddress || null,
            residenceCity: primaryProfile.residenceCity || null,
            postalCode: primaryProfile.postalCode || null,
            province: primaryProfile.province || null,
            status: primaryProfile.status || 'PENDING',
            isPazienteInTenant: hasPazienteRole
        };
    }

    /**
     * Lista pazienti (Person con ruolo PAZIENTE)
     * @param {Object} options - Opzioni di ricerca
     * @param {string} tenantId - Primary tenant ID (fallback)
     * @param {string} options.tenantIds - Comma-separated list of tenant IDs (multi-tenant support)
     * @param {boolean} options.allTenants - If true and accessibleTenantIds provided, show all
     * @param {string[]} options.accessibleTenantIds - Array of tenant IDs the user can access
     * @returns {Promise<Object>}
     */
    async listPazienti(options = {}, tenantId) {
        const {
            page = 1,
            pageSize = 20,
            search = '',
            sortBy = 'lastName',
            sortOrder = 'asc',
            tenantIds = null,
            allTenants = false,
            accessibleTenantIds = []
        } = options;

        const skip = (page - 1) * pageSize;

        // Determine tenant filter based on user's access (multi-tenant support)
        let tenantIdsToFilter = [];

        if (tenantIds) {
            const requestedIds = Array.isArray(tenantIds)
                ? tenantIds
                : (typeof tenantIds === 'string' ? tenantIds.split(',').map(id => id.trim()) : []);
            tenantIdsToFilter = accessibleTenantIds.length > 0
                ? requestedIds.filter(id => accessibleTenantIds.includes(id))
                : requestedIds;

            if (tenantIdsToFilter.length === 0) {
                tenantIdsToFilter = tenantId ? [tenantId] : [];
            }
        } else if (allTenants && accessibleTenantIds.length > 0) {
            tenantIdsToFilter = accessibleTenantIds;
        } else if (tenantId) {
            tenantIdsToFilter = [tenantId];
        }

        // Trova Person con ruolo PAZIENTE per i tenant selezionati
        const where = {
            deletedAt: null,
            personRoles: {
                some: {
                    roleType: 'PAZIENTE',
                    ...(tenantIdsToFilter.length === 1
                        ? { tenantId: tenantIdsToFilter[0] }
                        : tenantIdsToFilter.length > 1
                            ? { tenantId: { in: tenantIdsToFilter } }
                            : { tenantId }
                    ),
                    isActive: true,
                    deletedAt: null
                }
            }
        };

        // P48: email e phone sono in tenantProfiles
        // P53-S23: Genera varianti per matching fuzzy (accenti, apostrofi, trattini, spazi)
        if (search) {
            const nameVariants = generateNameVariants(search);
            const nameOrClauses = nameVariants.flatMap(v => [
                { firstName: { contains: v, mode: 'insensitive' } },
                { lastName: { contains: v, mode: 'insensitive' } }
            ]);
            where.OR = [
                ...nameOrClauses,
                { taxCode: { contains: search, mode: 'insensitive' } },
                // P48: Cerca email in tenantProfiles
                {
                    tenantProfiles: {
                        some: {
                            email: { contains: search, mode: 'insensitive' },
                            deletedAt: null
                        }
                    }
                },
                // P48: Cerca phone in tenantProfiles
                {
                    tenantProfiles: {
                        some: {
                            phone: { contains: search, mode: 'insensitive' },
                            deletedAt: null
                        }
                    }
                }
            ];
        }

        // P48: Include tenantProfiles per ottenere email/phone/status
        const [total, pazientiRaw] = await Promise.all([
            prisma.person.count({ where }),
            prisma.person.findMany({
                where,
                include: {
                    personRoles: {
                        where: {
                            deletedAt: null,
                            isActive: true,
                            // Solo ruoli rilevanti per i tenant visualizzati (evita cross-tenant role pollution)
                            ...(tenantIdsToFilter.length > 0 && {
                                tenantId: tenantIdsToFilter.length === 1
                                    ? tenantIdsToFilter[0]
                                    : { in: tenantIdsToFilter }
                            })
                        }
                    },
                    tenantProfiles: {
                        where: {
                            tenantId: tenantIdsToFilter.length === 1 ? tenantIdsToFilter[0] : { in: tenantIdsToFilter },
                            deletedAt: null
                        },
                        take: 1
                    },
                    visiteComePaziente: {
                        where: { deletedAt: null },
                        orderBy: { dataOra: 'desc' },
                        take: 1,
                        select: {
                            id: true,
                            dataOra: true,
                            stato: true
                        }
                    }
                },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: pageSize
            })
        ]);

        // P48: Flatten tenantProfiles per backward compatibility
        const pazienti = pazientiRaw.map(p => {
            const profile = p.tenantProfiles?.[0] || {};
            return {
                ...p,
                email: profile.email || null,
                phone: profile.phone || null,
                status: profile.status || 'PENDING',
                residenceAddress: profile.residenceAddress || null,
                residenceCity: profile.residenceCity || null,
                postalCode: profile.postalCode || null,
                province: profile.province || null
            };
        });

        return {
            data: pazienti,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
                hasNext: skip + pazienti.length < total,
                hasPrev: page > 1
            }
        };
    }

    /**
     * Ottieni paziente per ID
     * @param {string} id - ID paziente (Person)
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>}
     */
    async getPazienteById(id, tenantId) {
        const includeClause = {
            personRoles: {
                where: { deletedAt: null, isActive: true }
            },
            tenantProfiles: {
                where: { tenantId, deletedAt: null }
            },
            visiteComePaziente: {
                where: { deletedAt: null },
                orderBy: { dataOra: 'desc' },
                include: {
                    prestazione: {
                        select: { id: true, nome: true, codice: true }
                    },
                    medico: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    referti: {
                        where: { deletedAt: null },
                        select: { id: true, titolo: true, stato: true }
                    }
                }
            }
            // fattureSanitarie rimosso (legacy P97 - usare /api/v1/billing/fatture)
        };

        // P48: Primary lookup by PAZIENTE role
        let personRaw = await prisma.person.findFirst({
            where: {
                id,
                deletedAt: null,
                personRoles: {
                    some: {
                        roleType: 'PAZIENTE',
                        tenantId,
                        isActive: true,
                        deletedAt: null
                    }
                }
            },
            include: includeClause
        });

        // Fallback: person exists with tenant profile but missing PAZIENTE role
        // (e.g. created through queue walk-in or appointment booking without role assignment)
        if (!personRaw) {
            personRaw = await prisma.person.findFirst({
                where: {
                    id,
                    deletedAt: null,
                    tenantProfiles: {
                        some: { tenantId, deletedAt: null }
                    }
                },
                include: includeClause
            });

            // Auto-assign PAZIENTE role if person found via tenant profile
            if (personRaw) {
                try {
                    await prisma.personRole.create({
                        data: {
                            personId: id,
                            roleType: 'PAZIENTE',
                            tenantId,
                            isActive: true,
                            isPrimary: false
                        }
                    });
                    logger.info('Auto-assigned PAZIENTE role during getPazienteById fallback', {
                        component: 'PazienteService',
                        personId: id,
                        tenantId
                    });
                } catch (roleErr) {
                    // P2002 unique constraint = role already exists, safe to ignore
                    if (roleErr.code !== 'P2002') {
                        logger.warn('Failed to auto-assign PAZIENTE role in fallback', {
                            component: 'PazienteService',
                            error: roleErr.message,
                            personId: id,
                            tenantId
                        });
                    }
                }
            }
        }

        if (!personRaw) {
            throw new Error('Paziente non trovato');
        }

        // P48: Flatten tenantProfiles per backward compatibility
        const profile = personRaw.tenantProfiles?.[0] || {};
        const person = {
            ...personRaw,
            email: profile.email || null,
            phone: profile.phone || null,
            status: profile.status || 'PENDING',
            residenceAddress: profile.residenceAddress || null,
            residenceCity: profile.residenceCity || null,
            postalCode: profile.postalCode || null,
            province: profile.province || null
        };

        return person;
    }

    /**
     * Aggiorna dati paziente
     * P48: Dati globali su Person, dati tenant-specifici su PersonTenantProfile
     * @param {string} id - ID paziente
     * @param {Object} data - Dati da aggiornare
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>}
     */
    async updatePaziente(id, data, tenantId) {
        // Verifica che sia un paziente di questo tenant
        const existing = await prisma.person.findFirst({
            where: {
                id,
                deletedAt: null,
                personRoles: {
                    some: { roleType: 'PAZIENTE', tenantId, isActive: true, deletedAt: null }
                }
            },
            include: {
                tenantProfiles: { where: { tenantId, deletedAt: null } }
            }
        });

        if (!existing) {
            throw new Error('Paziente non trovato');
        }

        // P48: Controlla email in tenantProfiles, non in Person
        if (data.email && data.email !== existing.tenantProfiles?.[0]?.email) {
            const emailExists = await prisma.personTenantProfile.findFirst({
                where: {
                    email: data.email.toLowerCase(),
                    personId: { not: id },
                    tenantId,
                    deletedAt: null
                }
            });
            if (emailExists) {
                throw new Error('Email già in uso');
            }
        }

        if (data.taxCode && data.taxCode !== existing.taxCode) {
            const cfExists = await prisma.person.findFirst({
                where: {
                    taxCode: data.taxCode.toUpperCase(),
                    id: { not: id },
                    deletedAt: null
                }
            });
            if (cfExists) {
                throw new Error('Codice fiscale già in uso');
            }
        }

        // P48: Separa dati globali da dati tenant-specifici
        const personData = {};
        const profileData = {};

        // Dati globali su Person
        if (data.firstName !== undefined) personData.firstName = data.firstName;
        if (data.lastName !== undefined) personData.lastName = data.lastName;
        if (data.taxCode !== undefined) personData.taxCode = data.taxCode ? data.taxCode.toUpperCase() : null;
        if (data.birthDate !== undefined) personData.birthDate = data.birthDate ? new Date(data.birthDate) : null;

        // Dati tenant-specifici su PersonTenantProfile
        if (data.email !== undefined) profileData.email = data.email ? data.email.toLowerCase() : null;
        if (data.phone !== undefined) profileData.phone = data.phone || null;
        if (data.residenceAddress !== undefined) profileData.residenceAddress = data.residenceAddress || null;
        if (data.residenceCity !== undefined) profileData.residenceCity = data.residenceCity || null;
        if (data.postalCode !== undefined) profileData.postalCode = data.postalCode || null;
        if (data.province !== undefined) profileData.province = data.province || null;

        // Aggiorna Person
        if (Object.keys(personData).length > 0) {
            await prisma.person.update({
                where: { id },
                data: personData
            });
        }

        // Aggiorna o crea PersonTenantProfile
        if (Object.keys(profileData).length > 0) {
            const existingProfile = existing.tenantProfiles?.[0];
            if (existingProfile) {
                await prisma.personTenantProfile.update({
                    where: { id: existingProfile.id },
                    data: profileData
                });
            } else {
                await prisma.personTenantProfile.create({
                    data: {
                        personId: id,
                        tenantId,
                        ...profileData,
                        status: 'ACTIVE',
                        isPrimary: true,
                        isActive: true
                    }
                });
            }
        }

        // Ricarica paziente aggiornato
        const updated = await this.getPazienteById(id, tenantId);

        logger.info('Updated paziente', {
            component: 'paziente-service',
            action: 'update',
            personId: id,
            tenantId
        });

        return updated;
    }

    /**
     * Genera password temporanea per paziente
     * @returns {Promise<string>}
     */
    async generateTemporaryPassword() {
        const bcryptModule = await import('bcrypt');
        const bcrypt = bcryptModule.default || bcryptModule;
        // DEFAULT_TEMP_PASSWORD obbligatorio — nessun fallback hardcoded per sicurezza
        const tempPassword = process.env.DEFAULT_TEMP_PASSWORD;
        if (!tempPassword) throw new Error('[CONFIG] DEFAULT_TEMP_PASSWORD env var is required');
        return bcrypt.hash(tempPassword, 12);
    }

    /**
     * Imposta password per paziente (per accesso portale referti)
     * @param {string} id - ID paziente
     * @param {string} password - Nuova password
     * @returns {Promise<Object>}
     */
    async setPassword(id, password) {
        const bcryptModule = await import('bcrypt');
        const bcrypt = bcryptModule.default || bcryptModule;
        const hashedPassword = await bcrypt.hash(password, 12);

        const updated = await prisma.person.update({
            where: { id },
            data: { password: hashedPassword }
        });

        logger.info('Password set for paziente', {
            component: 'paziente-service',
            action: 'set-password',
            personId: id
        });

        return { success: true };
    }

    /**
     * Verifica se una Person è paziente in un tenant
     * @param {string} personId - ID Person
     * @param {string} tenantId - ID tenant
     * @returns {Promise<boolean>}
     */
    async isPaziente(personId, tenantId) {
        const role = await prisma.personRole.findFirst({
            where: {
                personId,
                roleType: 'PAZIENTE',
                tenantId,
                isActive: true,
                deletedAt: null
            }
        });

        return !!role;
    }

    /**
     * Ottieni tutti i referti di un paziente
     * @param {string} pazienteId - ID paziente
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object[]>}
     */
    async getRefertiPaziente(pazienteId, tenantId) {
        const referti = await prisma.referto.findMany({
            where: {
                visita: {
                    pazienteId,
                    tenantId,
                    deletedAt: null
                },
                stato: 'FIRMATO', // Solo referti firmati visibili al paziente
                deletedAt: null
            },
            include: {
                visita: {
                    include: {
                        prestazione: {
                            select: { nome: true, codice: true }
                        },
                        medico: {
                            select: { firstName: true, lastName: true, title: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return referti;
    }

    /**
     * Ottieni lo storico completo di un paziente (visite, referti, appuntamenti)
     * Usato per il pannello storico in VisitaPage
     * 
     * @param {string} pazienteId - ID paziente
     * @param {string} tenantId - ID tenant
     * @returns {Promise<{visite: Object[], referti: Object[], appuntamenti: Object[]}>}
     */
    async getStoricoPaziente(pazienteId, tenantId) {
        // Verifica che il paziente esista
        const paziente = await prisma.person.findFirst({
            where: {
                id: pazienteId,
                deletedAt: null
            }
        });

        if (!paziente) {
            throw new Error('Paziente non trovato');
        }

        // Visite completate/in corso (escluse annullate)
        const visite = await prisma.visita.findMany({
            where: {
                pazienteId,
                tenantId,
                deletedAt: null,
                stato: {
                    in: ['COMPLETATA', 'IN_CORSO', 'PROGRAMMATA']
                }
            },
            include: {
                prestazione: {
                    select: { id: true, nome: true, codice: true }
                },
                medico: {
                    select: { id: true, firstName: true, lastName: true, gender: true }
                },
                giudizioIdoneita: {
                    select: { tipoGiudizio: true }
                }
            },
            orderBy: { dataOra: 'desc' },
            take: 50
        });

        // Mappa giudizioIdoneita a stringa per compatibilità frontend
        const visiteMapped = visite.map(v => ({
            ...v,
            giudizioIdoneita: v.giudizioIdoneita?.tipoGiudizio ?? null
        }));

        // Tutti i referti
        const referti = await prisma.referto.findMany({
            where: {
                visita: {
                    pazienteId,
                    tenantId,
                    deletedAt: null
                },
                deletedAt: null
            },
            include: {
                visita: {
                    select: {
                        id: true,
                        dataOra: true,
                        prestazione: {
                            select: { nome: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        // Appuntamenti futuri + recenti passati
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const appuntamenti = await prisma.appuntamento.findMany({
            where: {
                pazienteId,
                tenantId,
                deletedAt: null,
                OR: [
                    { dataOra: { gte: now } },
                    { dataOra: { gte: thirtyDaysAgo } }
                ]
            },
            include: {
                prestazione: {
                    select: { id: true, nome: true, codice: true }
                },
                medico: {
                    select: { id: true, firstName: true, lastName: true }
                }
            },
            orderBy: { dataOra: 'desc' },
            take: 30
        });

        // ── MDL: Ultima visita MDL completata ─────────────────────────────────────
        // Cerca direttamente in Visita le visite PREVENTIVA o PERIODICA completate.
        // Fallback: ultimo appuntamento se nessuna visita MDL eseguita.
        const ultimaVisitaMDLRaw = await prisma.visita.findFirst({
            where: {
                pazienteId,
                tenantId,
                deletedAt: null,
                stato: 'COMPLETATA',
                tipoVisitaMDL: { in: ['PREVENTIVA', 'PERIODICA'] }
            },
            orderBy: { dataOra: 'desc' },
            include: {
                giudizioIdoneita: { select: { tipoGiudizio: true } }
            }
        });

        // Fallback: ultimo appuntamento se nessuna visita MDL completata trovata
        let ultimaVisitaFallback = null;
        if (!ultimaVisitaMDLRaw) {
            ultimaVisitaFallback = await prisma.appuntamento.findFirst({
                where: {
                    pazienteId,
                    tenantId,
                    deletedAt: null,
                    stato: { notIn: ['ANNULLATO', 'NO_SHOW'] },
                    dataOra: { lte: new Date() }
                },
                orderBy: { dataOra: 'desc' }
            });
        }

        // ── MDL: Prossima scadenza da protocollo ──────────────────────────────────
        // Prima scadenza non ancora eseguita per la VISITA_MEDICINA_LAVORO (prestazione principale).
        // Filtriamo per tipo = VISITA_MEDICINA_LAVORO per escludere le scadenze di accertamenti
        // (spirometria, audiometria ecc.) che potrebbero avere date precedenti alla visita principale.
        // Il campo `eseguita: false` è sufficiente per escludere le scadenze già evase.
        // Priorità: scadenze col visitaId impostato (aggiornate dal MC) prima di quelle calcolate.
        //
        // NOTA: ScadenzaPrestazioneProtocollo non ha una @relation a Prestazione, solo prestazioneId String?.
        // Occorre quindi un query in due passi: recuperare prima gli ID delle prestazioni VML, poi filtrare.
        const vmlPrestazioni = await prisma.prestazione.findMany({
            where: { tipo: 'VISITA_MEDICINA_LAVORO', tenantId, deletedAt: null },
            select: { id: true }
        });
        const vmlPrestazioneIds = vmlPrestazioni.map(p => p.id);

        const prossimeScadenze = await prisma.scadenzaPrestazioneProtocollo.findMany({
            where: {
                personId: pazienteId,
                tenantId,
                deletedAt: null,
                eseguita: false,
                ...(vmlPrestazioneIds.length > 0 && { prestazioneId: { in: vmlPrestazioneIds } }),
            },
            select: {
                dataScadenza: true,
                periodicitaMesi: true,
                visitaId: true,
                appuntamentoId: true,
                appuntamento: {
                    select: { dataOra: true, stato: true, tipoVisitaMDL: true }
                }
            },
            orderBy: [
                // Scadenze con visitaId impostato (aggiornate esplicitamente dal MC) hanno priorità
                { visitaId: { sort: 'asc', nulls: 'last' } },
                // A parità, la più prossima nel tempo
                { dataScadenza: 'asc' }
            ],
            take: 1
        });

        const prossima = prossimeScadenze[0] ?? null;
        const prossimaScadenzaMDL = prossima?.dataScadenza ?? null;
        const prossimaScadenzaPeriodicita = prossima?.periodicitaMesi ?? null;
        // Scadenza già coperta da un appuntamento attivo (non annullato/no-show)
        const prossimaScadenzaIsBooked = !!(
            prossima?.appuntamentoId &&
            prossima.appuntamento?.stato &&
            !['ANNULLATO', 'NO_SHOW'].includes(prossima.appuntamento.stato)
        );
        const prossimaScadenzaAppuntamentoData =
            prossimaScadenzaIsBooked ? (prossima?.appuntamento?.dataOra?.toISOString() ?? null) : null;

        // Mappa in struttura friendly per il frontend
        const ultimaScadenzaMDL = ultimaVisitaMDLRaw ? {
            dataEsecuzione: ultimaVisitaMDLRaw.dataOra?.toISOString() ?? null,
            dataOra: ultimaVisitaMDLRaw.dataOra?.toISOString() ?? null,
            tipoVisitaMDL: ultimaVisitaMDLRaw.tipoVisitaMDL ?? null,
            giudizioIdoneita: ultimaVisitaMDLRaw.giudizioIdoneita?.tipoGiudizio ?? null,
            isFallbackAppuntamento: false
        } : ultimaVisitaFallback ? {
            dataEsecuzione: ultimaVisitaFallback.dataOra?.toISOString() ?? null,
            dataOra: ultimaVisitaFallback.dataOra?.toISOString() ?? null,
            tipoVisitaMDL: ultimaVisitaFallback.tipoVisitaMDL ?? null,
            giudizioIdoneita: null,
            isFallbackAppuntamento: true  // fallback da appuntamento, non da visita completata
        } : null;

        // Prossima scadenza prenotata (mantenuto per backward compat con slice che ancora lo usano)
        const prossimaScadenzaPrenotata = prossimaScadenzaIsBooked ? {
            dataOra: prossimaScadenzaAppuntamentoData,
            tipoVisitaMDL: prossima?.appuntamento?.tipoVisitaMDL ?? null,
            dataScadenza: prossima?.dataScadenza?.toISOString() ?? null
        } : null;

        logger.info('Storico paziente caricato', {
            component: 'paziente-service',
            action: 'get-storico',
            pazienteId,
            tenantId,
            visiteCount: visiteMapped.length,
            refertiCount: referti.length,
            appuntamentiCount: appuntamenti.length,
            prossimaScadenzaMDL: prossimaScadenzaMDL?.toISOString() ?? null
        });

        return {
            visite: visiteMapped,
            referti,
            appuntamenti,
            prossimaScadenzaMDL,
            prossimaScadenzaPeriodicita,
            ultimaScadenzaMDL,
            prossimaScadenzaPrenotata,
            prossimaScadenzaIsBooked,
            prossimaScadenzaAppuntamentoData
        };
    }
}

export default new PazienteService();
