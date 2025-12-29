/**
 * Paziente Service
 * 
 * Gestisce i pazienti con logica di integrazione Person/CF.
 * Se un paziente ha lo stesso CF di una Person esistente (es. un employee della formazione),
 * vengono collegati e viene aggiunto il ruolo PAZIENTE.
 * 
 * @module services/clinical/PazienteService
 */

import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

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
        const { taxCode, email } = data;

        try {
            // 1. Cerca Person esistente per CF (cross-tenant se presente)
            let existingPerson = null;

            if (taxCode) {
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

            // 2. Se non trovato per CF, cerca per email nello stesso tenant
            if (!existingPerson && email) {
                existingPerson = await prisma.person.findFirst({
                    where: {
                        email: email.toLowerCase(),
                        tenantId,
                        deletedAt: null
                    },
                    include: {
                        personRoles: {
                            where: { deletedAt: null, isActive: true }
                        }
                    }
                });
            }

            // 3. Se esiste, verifica se ha già ruolo PAZIENTE
            if (existingPerson) {
                const hasPazienteRole = existingPerson.personRoles.some(
                    role => role.roleType === 'PAZIENTE' && role.tenantId === tenantId
                );

                if (!hasPazienteRole) {
                    // Aggiungi ruolo PAZIENTE per questo tenant
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

                    logger.info('Added PAZIENTE role to existing person', {
                        component: 'paziente-service',
                        action: 'link-paziente',
                        personId: existingPerson.id,
                        taxCode,
                        tenantId
                    });
                }

                // Aggiorna eventuali campi mancanti sulla Person
                const updates = {};
                if (!existingPerson.phone && data.phone) updates.phone = data.phone;
                if (!existingPerson.residenceAddress && data.residenceAddress) updates.residenceAddress = data.residenceAddress;
                if (!existingPerson.residenceCity && data.residenceCity) updates.residenceCity = data.residenceCity;
                if (!existingPerson.postalCode && data.postalCode) updates.postalCode = data.postalCode;
                if (!existingPerson.province && data.province) updates.province = data.province;
                if (!existingPerson.birthDate && data.birthDate) updates.birthDate = new Date(data.birthDate);

                if (Object.keys(updates).length > 0) {
                    await prisma.person.update({
                        where: { id: existingPerson.id },
                        data: updates
                    });
                }

                // Ricarica person con ruoli aggiornati
                const updatedPerson = await prisma.person.findUnique({
                    where: { id: existingPerson.id },
                    include: {
                        personRoles: {
                            where: { deletedAt: null, isActive: true }
                        }
                    }
                });

                return {
                    person: updatedPerson,
                    isNew: false,
                    wasLinked: !hasPazienteRole
                };
            }

            // 4. Crea nuova Person con ruolo PAZIENTE
            const newPerson = await prisma.person.create({
                data: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    taxCode: taxCode ? taxCode.toUpperCase() : null,
                    email: email ? email.toLowerCase() : null,
                    phone: data.phone || null,
                    birthDate: data.birthDate ? new Date(data.birthDate) : null,
                    residenceAddress: data.residenceAddress || null,
                    residenceCity: data.residenceCity || null,
                    postalCode: data.postalCode || null,
                    province: data.province || null,
                    tenantId,
                    status: 'ACTIVE',
                    // Se fornita email, genera password temporanea
                    password: email ? await this.generateTemporaryPassword() : null,
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
                }
            }
        });

        if (!person) return null;

        // Verifica se ha ruolo PAZIENTE per questo tenant
        const hasPazienteRole = person.personRoles.some(
            role => role.roleType === 'PAZIENTE' && role.tenantId === tenantId
        );

        return {
            ...person,
            isPazienteInTenant: hasPazienteRole
        };
    }

    /**
     * Lista pazienti (Person con ruolo PAZIENTE)
     * @param {Object} options - Opzioni di ricerca
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>}
     */
    async listPazienti(options = {}, tenantId) {
        const {
            page = 1,
            pageSize = 20,
            search = '',
            sortBy = 'lastName',
            sortOrder = 'asc'
        } = options;

        const skip = (page - 1) * pageSize;

        // Trova Person con ruolo PAZIENTE per questo tenant
        const where = {
            deletedAt: null,
            personRoles: {
                some: {
                    roleType: 'PAZIENTE',
                    tenantId,
                    isActive: true,
                    deletedAt: null
                }
            }
        };

        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { taxCode: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [total, pazienti] = await Promise.all([
            prisma.person.count({ where }),
            prisma.person.findMany({
                where,
                include: {
                    personRoles: {
                        where: { deletedAt: null, isActive: true }
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
        const person = await prisma.person.findFirst({
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
            include: {
                personRoles: {
                    where: { deletedAt: null, isActive: true }
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
                },
                fattureSanitarie: {
                    where: { deletedAt: null },
                    orderBy: { dataEmissione: 'desc' },
                    take: 10
                }
            }
        });

        if (!person) {
            throw new Error('Paziente non trovato');
        }

        return person;
    }

    /**
     * Aggiorna dati paziente
     * @param {string} id - ID paziente
     * @param {Object} data - Dati da aggiornare
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>}
     */
    async updatePaziente(id, data, tenantId) {
        // Verifica che sia un paziente di questo tenant
        const existing = await this.getPazienteById(id, tenantId);
        if (!existing) {
            throw new Error('Paziente non trovato');
        }

        // Non permettere modifica email/taxCode se già usati da altri
        if (data.email && data.email !== existing.email) {
            const emailExists = await prisma.person.findFirst({
                where: {
                    email: data.email.toLowerCase(),
                    id: { not: id },
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

        const updated = await prisma.person.update({
            where: { id },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                taxCode: data.taxCode ? data.taxCode.toUpperCase() : null,
                email: data.email ? data.email.toLowerCase() : null,
                phone: data.phone || null,
                birthDate: data.birthDate ? new Date(data.birthDate) : null,
                residenceAddress: data.residenceAddress || null,
                residenceCity: data.residenceCity || null,
                postalCode: data.postalCode || null,
                province: data.province || null
            },
            include: {
                personRoles: {
                    where: { deletedAt: null, isActive: true }
                }
            }
        });

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
        const bcrypt = await import('bcryptjs');
        const tempPassword = crypto.randomBytes(8).toString('hex');
        return bcrypt.hash(tempPassword, 12);
    }

    /**
     * Imposta password per paziente (per accesso portale referti)
     * @param {string} id - ID paziente
     * @param {string} password - Nuova password
     * @returns {Promise<Object>}
     */
    async setPassword(id, password) {
        const bcrypt = await import('bcryptjs');
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
}

export default new PazienteService();
