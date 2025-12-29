/**
 * Medici Routes
 * CRUD operations for medical professionals (Person with MEDICO role)
 * 
 * Base path: /api/v1/clinica/medici
 * 
 * @module routes/clinica/medici
 * @version 1.0.0
 */

import express from 'express';
import prisma from '../../config/prisma.js';
import logger from '../../utils/logger.js';
import middleware from '../../auth/middleware.js';
import { checkAdvancedPermission } from '../../middleware/advancedPermissions.js';
import { clinicalValidators } from '../../config/validation-clinical.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { auditClinico } from './utils/clinica-utils.js';
import medicoDocumentsRouter from './medici-documents.routes.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;

// Mount documents sub-router
router.use('/:id/documents', medicoDocumentsRouter);

// ============================================
// LIST
// ============================================

/**
 * @route GET /medici
 * @desc Lista medici con filtri e paginazione
 * @access Authenticated + VIEW_MEDICI
 */
router.get('/',
    authenticateToken(),
    checkAdvancedPermission('medici', 'read'),
    auditClinico('list_medici'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 20, search, specializzazione, attivo } = req.query;

            const where = {
                tenantId,
                deletedAt: null,
                personRoles: {
                    some: {
                        roleType: 'MEDICO',
                        isActive: true,
                        deletedAt: null
                    }
                }
            };

            if (search) {
                where.OR = [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { taxCode: { contains: search, mode: 'insensitive' } }
                ];
            }

            if (attivo !== undefined) {
                where.status = attivo === 'true' ? 'ACTIVE' : 'INACTIVE';
            }

            const offset = (parseInt(page) - 1) * parseInt(limit);

            const [medici, total] = await Promise.all([
                prisma.person.findMany({
                    where,
                    skip: offset,
                    take: parseInt(limit),
                    include: {
                        personRoles: { where: { deletedAt: null } }
                    },
                    orderBy: { lastName: 'asc' }
                }),
                prisma.person.count({ where })
            ]);

            res.json({
                success: true,
                data: medici,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            logger.error('Failed to list medici', {
                component: 'medici-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei medici',
                message: error.message
            });
        }
    }
);

// ============================================
// STATS
// ============================================

/**
 * @route GET /medici/stats
 * @desc Statistiche medici
 * @access Authenticated + VIEW_MEDICI
 */
router.get('/stats',
    authenticateToken(),
    checkAdvancedPermission('medici', 'read'),
    auditClinico('stats_medici'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const [total, active, inactive] = await Promise.all([
                prisma.person.count({
                    where: {
                        tenantId,
                        deletedAt: null,
                        personRoles: { some: { roleType: 'MEDICO', deletedAt: null } }
                    }
                }),
                prisma.person.count({
                    where: {
                        tenantId,
                        deletedAt: null,
                        status: 'ACTIVE',
                        personRoles: { some: { roleType: 'MEDICO', isActive: true, deletedAt: null } }
                    }
                }),
                prisma.person.count({
                    where: {
                        tenantId,
                        deletedAt: null,
                        OR: [
                            { status: 'INACTIVE' },
                            { personRoles: { some: { roleType: 'MEDICO', isActive: false, deletedAt: null } } }
                        ]
                    }
                })
            ]);

            res.json({
                success: true,
                data: { total, active, inactive, bySpecializzazione: {} }
            });
        } catch (error) {
            logger.error('Failed to get medici stats', {
                component: 'medici-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle statistiche',
                message: error.message
            });
        }
    }
);

// ============================================
// GET BY ID
// ============================================

/**
 * @route GET /medici/:id
 * @desc Dettaglio medico
 * @access Authenticated + VIEW_MEDICI
 */
router.get('/:id',
    authenticateToken(),
    checkAdvancedPermission('medici', 'read'),
    clinicalValidators.params.id,
    auditClinico('view_medico'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const medico = await prisma.person.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null,
                    personRoles: { some: { roleType: 'MEDICO', deletedAt: null } }
                },
                include: {
                    personRoles: { where: { deletedAt: null } },
                    abilitazioni: {
                        where: { deletedAt: null, attivo: true },
                        include: { prestazione: true }
                    }
                }
            });

            if (!medico) {
                return res.status(404).json({
                    success: false,
                    error: 'Medico non trovato'
                });
            }

            res.json({ success: true, data: medico });
        } catch (error) {
            logger.error('Failed to get medico', {
                component: 'medici-routes',
                error: error.message,
                medicoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del medico',
                message: error.message
            });
        }
    }
);

// ============================================
// CREATE
// ============================================

/**
 * @route POST /medici
 * @desc Crea nuovo medico con account utente
 * @access Authenticated + CREATE_MEDICI
 */
router.post('/',
    authenticateToken(),
    checkAdvancedPermission('medici', 'create'),
    auditClinico('create_medico'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const {
                firstName, lastName, email, phone, taxCode,
                birthDate, pec, residenceAddress, residenceCity, province, postalCode,
                iban, profileImage, notes, specialties,
                alboRegione, registerCode, registerCode2,
                shortDescription, fullDescription,
                specializzazione, numeroIscrizione,
                createAccount = true,
                password = 'Password1!',
                prestazioniIds
            } = req.body;

            // Validazione campi obbligatori
            if (!firstName || !lastName) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome e cognome sono obbligatori'
                });
            }

            if (!taxCode || taxCode.length !== 16) {
                return res.status(400).json({
                    success: false,
                    error: 'Il codice fiscale è obbligatorio e deve essere di 16 caratteri'
                });
            }

            // Check existing person
            const existingPerson = await prisma.person.findFirst({
                where: { taxCode: taxCode.toUpperCase(), deletedAt: null },
                include: { personRoles: { where: { deletedAt: null } } }
            });

            if (existingPerson) {
                const hasMedicoRoleThisTenant = existingPerson.personRoles.some(
                    r => r.roleType === 'MEDICO' && r.isActive && r.tenantId === tenantId
                );

                if (hasMedicoRoleThisTenant) {
                    return res.status(409).json({
                        success: false,
                        error: 'Questo medico è già registrato per questa organizzazione',
                        existingPersonId: existingPerson.id
                    });
                }

                // Enable as medico for this tenant
                await prisma.personRole.create({
                    data: {
                        personId: existingPerson.id,
                        roleType: 'MEDICO',
                        isActive: true,
                        isPrimary: false,
                        tenantId
                    }
                });

                const updatedMedico = await prisma.person.findUnique({
                    where: { id: existingPerson.id },
                    include: { personRoles: { where: { deletedAt: null } } }
                });

                await prisma.gdprAuditLog.create({
                    data: {
                        personId: req.person?.id || existingPerson.id,
                        action: 'CREATE',
                        resourceType: 'PERSON_ROLE_MEDICO',
                        resourceId: existingPerson.id,
                        dataAccessed: { roleType: 'MEDICO', tenantId, crossTenantEnable: true },
                        ipAddress: req.ip || req.connection?.remoteAddress,
                        tenantId
                    }
                });

                return res.status(201).json({
                    success: true,
                    data: updatedMedico,
                    message: `${existingPerson.firstName} ${existingPerson.lastName} è stato abilitato come medico`,
                    crossTenantEnabled: true
                });
            }

            // Create new person with MEDICO role
            const bcrypt = await import('bcryptjs');
            const hashedPassword = await bcrypt.default.hash(password, 12);

            let baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '');
            let username = baseUsername;
            let counter = 0;

            while (true) {
                const existingUsername = await prisma.person.findUnique({ where: { username } });
                if (!existingUsername) break;
                counter++;
                username = `${baseUsername}${counter}`;
            }

            const medico = await prisma.person.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    phone,
                    taxCode: taxCode?.toUpperCase(),
                    birthDate: birthDate ? new Date(birthDate) : null,
                    pec,
                    residenceAddress,
                    residenceCity,
                    province,
                    postalCode,
                    iban: iban?.toUpperCase(),
                    profileImage,
                    notes: notes || '',
                    specialties: specialties || (specializzazione ? [specializzazione] : []),
                    registerCode: registerCode || numeroIscrizione,
                    registerCode2,
                    shortDescription,
                    fullDescription,
                    username: createAccount ? username : null,
                    password: createAccount ? hashedPassword : null,
                    status: 'ACTIVE',
                    tenantId,
                    preferences: alboRegione ? { alboRegione } : {},
                    personRoles: {
                        create: {
                            roleType: 'MEDICO',
                            isActive: true,
                            isPrimary: true,
                            tenantId
                        }
                    }
                },
                include: { personRoles: { where: { deletedAt: null } } }
            });

            await prisma.gdprAuditLog.create({
                data: {
                    personId: req.person?.id || medico.id,
                    action: 'CREATE',
                    resourceType: 'PERSON_MEDICO',
                    resourceId: medico.id,
                    dataAccessed: { firstName, lastName, email, roleType: 'MEDICO' },
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    tenantId
                }
            });

            // Create abilitazioni if provided
            if (prestazioniIds && prestazioniIds.length > 0) {
                await prisma.medicoAbilitato.createMany({
                    data: prestazioniIds.map(prestazioneId => ({
                        medicoId: medico.id,
                        prestazioneId,
                        tenantId,
                        attivo: true,
                        dataAbilitazione: new Date()
                    })),
                    skipDuplicates: true
                });
            }

            res.status(201).json({
                success: true,
                data: medico,
                message: 'Medico creato con successo',
                credentials: createAccount ? {
                    username,
                    temporaryPassword: password,
                    note: 'La password deve essere cambiata al primo accesso'
                } : null
            });
        } catch (error) {
            logger.error('Failed to create medico', {
                component: 'medici-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.code === 'P2002') {
                return res.status(409).json({
                    success: false,
                    error: 'Codice fiscale già esistente'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione del medico',
                message: error.message
            });
        }
    }
);

// ============================================
// ENABLE EXISTING PERSON AS MEDICO
// ============================================

/**
 * @route POST /medici/enable
 * @desc Abilita una persona esistente come medico
 * @access Authenticated + CREATE_MEDICI
 */
router.post('/enable',
    authenticateToken(),
    checkAdvancedPermission('medici', 'create'),
    auditClinico('enable_medico'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { personId, specialties, registerCode, registerCode2 } = req.body;

            if (!personId) {
                return res.status(400).json({
                    success: false,
                    error: 'personId è obbligatorio'
                });
            }

            const person = await prisma.person.findFirst({
                where: { id: personId, deletedAt: null },
                include: { personRoles: { where: { deletedAt: null } } }
            });

            if (!person) {
                return res.status(404).json({
                    success: false,
                    error: 'Persona non trovata'
                });
            }

            const existingMedicoRole = person.personRoles.find(
                r => r.roleType === 'MEDICO' && r.tenantId === tenantId && r.isActive
            );

            if (existingMedicoRole) {
                return res.status(409).json({
                    success: false,
                    error: 'Questa persona è già abilitata come medico'
                });
            }

            await prisma.personRole.create({
                data: {
                    personId: person.id,
                    roleType: 'MEDICO',
                    isActive: true,
                    isPrimary: false,
                    tenantId
                }
            });

            const updateData = {};
            if (specialties?.length > 0) updateData.specialties = specialties;
            if (registerCode) updateData.registerCode = registerCode;
            if (registerCode2) updateData.registerCode2 = registerCode2;

            if (Object.keys(updateData).length > 0) {
                await prisma.person.update({
                    where: { id: person.id },
                    data: updateData
                });
            }

            await prisma.gdprAuditLog.create({
                data: {
                    personId: req.person?.id || person.id,
                    action: 'CREATE',
                    resourceType: 'PERSON_ROLE_MEDICO',
                    resourceId: person.id,
                    dataAccessed: { roleType: 'MEDICO', tenantId },
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    tenantId
                }
            });

            const updatedPerson = await prisma.person.findUnique({
                where: { id: person.id },
                include: { personRoles: { where: { deletedAt: null } } }
            });

            res.status(201).json({
                success: true,
                data: updatedPerson,
                message: `${person.firstName} ${person.lastName} è stato abilitato come medico`
            });
        } catch (error) {
            logger.error('Failed to enable person as medico', {
                component: 'medici-routes',
                error: error.message,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'abilitazione del medico',
                message: error.message
            });
        }
    }
);

// ============================================
// UPDATE
// ============================================

/**
 * @route PUT /medici/:id
 * @desc Aggiorna medico
 * @access Authenticated + UPDATE_MEDICI
 */
router.put('/:id',
    authenticateToken(),
    checkAdvancedPermission('medici', 'update'),
    clinicalValidators.params.id,
    auditClinico('update_medico'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const {
                firstName, lastName, email, phone, taxCode,
                birthDate, pec, residenceAddress, residenceCity, province, postalCode,
                iban, profileImage, notes, specialties,
                alboRegione, registerCode, registerCode2,
                shortDescription, fullDescription,
                specializzazione, numeroIscrizione,
                status,
                prestazioniIds
            } = req.body;

            const existing = await prisma.person.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null,
                    personRoles: { some: { roleType: 'MEDICO', deletedAt: null } }
                }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Medico non trovato'
                });
            }

            const updateData = {};
            if (firstName) updateData.firstName = firstName;
            if (lastName) updateData.lastName = lastName;
            if (email) updateData.email = email;
            if (phone !== undefined) updateData.phone = phone;
            if (taxCode) updateData.taxCode = taxCode.toUpperCase();
            if (status) updateData.status = status;
            if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
            if (pec !== undefined) updateData.pec = pec || null;
            if (residenceAddress !== undefined) updateData.residenceAddress = residenceAddress || null;
            if (residenceCity !== undefined) updateData.residenceCity = residenceCity || null;
            if (province !== undefined) updateData.province = province || null;
            if (postalCode !== undefined) updateData.postalCode = postalCode || null;
            if (iban !== undefined) updateData.iban = iban?.toUpperCase() || null;
            if (profileImage !== undefined) updateData.profileImage = profileImage || null;
            if (notes !== undefined) updateData.notes = notes || null;
            if (shortDescription !== undefined) updateData.shortDescription = shortDescription || null;
            if (fullDescription !== undefined) updateData.fullDescription = fullDescription || null;

            if (specialties !== undefined) {
                updateData.specialties = specialties || [];
            } else if (specializzazione) {
                updateData.specialties = [specializzazione];
            }

            if (registerCode !== undefined) updateData.registerCode = registerCode || null;
            if (numeroIscrizione !== undefined && registerCode === undefined) updateData.registerCode = numeroIscrizione || null;
            if (registerCode2 !== undefined) updateData.registerCode2 = registerCode2 || null;

            if (alboRegione !== undefined) {
                const existingPrefs = existing.preferences || {};
                updateData.preferences = { ...existingPrefs, alboRegione };
            }

            await prisma.person.update({
                where: { id },
                data: updateData
            });

            // Handle prestazioni abilitate
            if (prestazioniIds !== undefined) {
                const currentAbilitazioni = await prisma.medicoAbilitato.findMany({
                    where: { medicoId: id, tenantId, deletedAt: null }
                });
                const currentPrestazioniIds = currentAbilitazioni.map(a => a.prestazioneId);

                const toAdd = prestazioniIds.filter(pId => !currentPrestazioniIds.includes(pId));
                const toRemove = currentPrestazioniIds.filter(pId => !prestazioniIds.includes(pId));

                if (toAdd.length > 0) {
                    await prisma.medicoAbilitato.createMany({
                        data: toAdd.map(prestazioneId => ({
                            medicoId: id,
                            prestazioneId,
                            tenantId,
                            attivo: true,
                            dataAbilitazione: new Date()
                        })),
                        skipDuplicates: true
                    });
                }

                if (toRemove.length > 0) {
                    await prisma.medicoAbilitato.updateMany({
                        where: {
                            medicoId: id,
                            prestazioneId: { in: toRemove },
                            tenantId
                        },
                        data: { deletedAt: new Date(), attivo: false }
                    });
                }
            }

            const updatedMedico = await prisma.person.findUnique({
                where: { id },
                include: {
                    personRoles: { where: { deletedAt: null } },
                    abilitazioni: {
                        where: { deletedAt: null, attivo: true },
                        include: { prestazione: true }
                    }
                }
            });

            await prisma.gdprAuditLog.create({
                data: {
                    personId: req.person?.id || id,
                    action: 'UPDATE',
                    resourceType: 'PERSON_MEDICO',
                    resourceId: id,
                    dataAccessed: { previousData: existing, newData: updateData },
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    tenantId
                }
            });

            res.json({
                success: true,
                data: updatedMedico,
                message: 'Medico aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update medico', {
                component: 'medici-routes',
                error: error.message,
                medicoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            if (error.code === 'P2002') {
                return res.status(409).json({
                    success: false,
                    error: 'Email o codice fiscale già esistente'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento del medico',
                message: error.message
            });
        }
    }
);

// ============================================
// DELETE
// ============================================

/**
 * @route DELETE /medici/:id
 * @desc Elimina medico (soft delete)
 * @access Authenticated + DELETE_MEDICI
 */
router.delete('/:id',
    authenticateToken(),
    checkAdvancedPermission('medici', 'delete'),
    clinicalValidators.params.id,
    auditClinico('delete_medico'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const existing = await prisma.person.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null,
                    personRoles: { some: { roleType: 'MEDICO', deletedAt: null } }
                }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Medico non trovato'
                });
            }

            await prisma.$transaction([
                prisma.person.update({
                    where: { id },
                    data: { deletedAt: new Date() }
                }),
                prisma.personRole.updateMany({
                    where: { personId: id, roleType: 'MEDICO' },
                    data: { deletedAt: new Date(), isActive: false }
                })
            ]);

            await prisma.gdprAuditLog.create({
                data: {
                    personId: req.person?.id || id,
                    action: 'DELETE',
                    resourceType: 'PERSON_MEDICO',
                    resourceId: id,
                    dataAccessed: { deletedPerson: existing },
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    tenantId
                }
            });

            res.json({
                success: true,
                message: 'Medico eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete medico', {
                component: 'medici-routes',
                error: error.message,
                medicoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione del medico',
                message: error.message
            });
        }
    }
);

// ============================================
// AMBULATORI RELATION
// ============================================

/**
 * @route GET /medici/:id/ambulatori
 * @desc Lista ambulatori assegnati a un medico
 * @access Authenticated + VIEW_MEDICI
 */
router.get('/:id/ambulatori',
    authenticateToken(),
    checkAdvancedPermission('medici', 'read'),
    clinicalValidators.params.id,
    auditClinico('view_medico_ambulatori'),
    async (req, res) => {
        try {
            // TODO: Implementare con modello MedicoAmbulatorio
            res.json({ success: true, data: [] });
        } catch (error) {
            logger.error('Failed to get medico ambulatori', {
                component: 'medici-routes',
                error: error.message,
                medicoId: req.params.id
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli ambulatori',
                message: error.message
            });
        }
    }
);

// ============================================
// DISPONIBILITA RELATION
// ============================================

/**
 * @route GET /medici/:id/disponibilita
 * @desc Lista disponibilità medico
 * @access Authenticated + VIEW_MEDICI
 */
router.get('/:id/disponibilita',
    authenticateToken(),
    checkAdvancedPermission('medici', 'read'),
    clinicalValidators.params.id,
    auditClinico('view_medico_disponibilita'),
    async (req, res) => {
        try {
            // TODO: Implementare con modello dedicato
            res.json({ success: true, data: [] });
        } catch (error) {
            logger.error('Failed to get medico disponibilita', {
                component: 'medici-routes',
                error: error.message,
                medicoId: req.params.id
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della disponibilità',
                message: error.message
            });
        }
    }
);

export default router;
