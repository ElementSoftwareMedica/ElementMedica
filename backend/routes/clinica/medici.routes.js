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
import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import middleware from '../../middleware/auth.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import { clinicalValidators } from '../../config/validation-clinical.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { auditClinico } from './utils/clinica-utils.js';
import EmailService from '../../services/emailService.js';
import medicoDocumentsRouter from './medici-documents.routes.js';

const router = express.Router();
const { authenticate: authenticateToken } = middleware;
const MEDICO_ROLE_TYPES = ['MEDICO', 'MEDICO_COMPETENTE'];

async function notifyMedicoPoliambulatorioAssignment({ medico, tenantId, email }) {
    const targetEmail = email || medico?.tenantProfiles?.[0]?.email;
    if (!targetEmail || !medico?.id || !tenantId) return;

    try {
        const tenant = await prisma.tenant.findFirst({
            where: { id: tenantId, deletedAt: null },
            select: { name: true }
        });

        await EmailService.queue({
            to: targetEmail,
            template: 'MEDICO_POLIAMBULATORIO_NOTIFICA',
            tenantId,
            branchType: 'MEDICA',
            data: {
                doctorName: `${medico.firstName || ''} ${medico.lastName || ''}`.trim() || 'Dottore',
                clinicName: tenant?.name || 'il poliambulatorio',
                loginUrl: process.env.FRONTEND_URL || process.env.APP_URL || 'https://www.elementmedica.com/poliambulatorio'
            }
        });
    } catch (error) {
        logger.warn('Failed to queue medico poliambulatorio assignment email', {
            component: 'medici-routes',
            medicoId: medico.id,
            tenantId,
            error: error.message
        });
    }
}

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
    authenticateToken,
    checkAdvancedPermission('medici', 'read'),
    auditClinico('list_medici'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { page = 1, limit = 20, search, specializzazione, attivo } = req.query;

            const where = {
                deletedAt: null,
                tenantProfiles: {
                    some: {
                        tenantId,
                        deletedAt: null
                    }
                },
                personRoles: {
                    some: {
                        roleType: { in: MEDICO_ROLE_TYPES },
                        isActive: true,
                        deletedAt: null,
                        tenantId
                    }
                }
            };

            if (search) {
                where.OR = [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { tenantProfiles: { some: { email: { contains: search, mode: 'insensitive' }, tenantId, deletedAt: null } } },
                    { taxCode: { contains: search, mode: 'insensitive' } }
                ];
            }

            if (attivo !== undefined) {
                where.tenantProfiles = {
                    some: {
                        tenantId,
                        deletedAt: null,
                        status: attivo === 'true' ? 'ACTIVE' : 'INACTIVE'
                    }
                };
            }

            const offset = (parseInt(page) - 1) * parseInt(limit);

            const [medici, total] = await Promise.all([
                prisma.person.findMany({
                    where,
                    skip: offset,
                    take: parseInt(limit),
                    include: {
                        personRoles: { where: { deletedAt: null } },
                        tenantProfiles: { where: { tenantId, deletedAt: null }, take: 1 }
                    },
                    orderBy: { lastName: 'asc' }
                }),
                prisma.person.count({ where })
            ]);

            // P48: Flatten tenantProfile fields for frontend compatibility
            const flatMedici = medici.map(m => {
                const profile = m.tenantProfiles?.[0] || {};
                const { tenantProfiles, ...personFields } = m;
                return {
                    ...personFields,
                    email: profile.email || null,
                    phone: profile.phone || null,
                    status: profile.status || 'PENDING',
                    specialties: profile.specialties || [],
                };
            });

            res.json({
                success: true,
                data: flatMedici,
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
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei medici',
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
    authenticateToken,
    checkAdvancedPermission('medici', 'read'),
    auditClinico('stats_medici'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const [total, active, inactive] = await Promise.all([
                prisma.person.count({
                    where: {
                        deletedAt: null,
                        tenantProfiles: { some: { tenantId, deletedAt: null } },
                        personRoles: { some: { roleType: { in: MEDICO_ROLE_TYPES }, deletedAt: null, tenantId } }
                    }
                }),
                prisma.person.count({
                    where: {
                        deletedAt: null,
                        tenantProfiles: { some: { tenantId, deletedAt: null, status: 'ACTIVE' } },
                        personRoles: { some: { roleType: { in: MEDICO_ROLE_TYPES }, isActive: true, deletedAt: null, tenantId } }
                    }
                }),
                prisma.person.count({
                    where: {
                        deletedAt: null,
                        tenantProfiles: { some: { tenantId, deletedAt: null } },
                        OR: [
                            { tenantProfiles: { some: { tenantId, deletedAt: null, status: 'INACTIVE' } } },
                            { personRoles: { some: { roleType: { in: MEDICO_ROLE_TYPES }, isActive: false, deletedAt: null, tenantId } } }
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
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle statistiche',
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
    authenticateToken,
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
                    deletedAt: null,
                    tenantProfiles: { some: { tenantId, deletedAt: null } },
                    personRoles: { some: { roleType: { in: MEDICO_ROLE_TYPES }, deletedAt: null, tenantId } }
                },
                include: {
                    personRoles: { where: { deletedAt: null } },
                    tenantProfiles: { where: { tenantId, deletedAt: null }, take: 1 },
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

            // P48: Flatten tenantProfile fields for frontend compatibility
            const profile = medico.tenantProfiles?.[0] || {};
            const { tenantProfiles, ...personFields } = medico;
            const flatMedico = {
                ...personFields,
                email: profile.email || null,
                phone: profile.phone || null,
                pec: profile.pec || null,
                status: profile.status || 'PENDING',
                residenceAddress: profile.residenceAddress || null,
                residenceCity: profile.residenceCity || null,
                province: profile.province || null,
                postalCode: profile.postalCode || null,
                iban: profile.iban || null,
                notes: profile.notes || null,
                specialties: profile.specialties || [],
                registerCode: profile.registerCode || null,
                registerCode2: profile.registerCode2 || null,
                shortDescription: profile.shortDescription || null,
                fullDescription: profile.fullDescription || null,
                hiredDate: profile.hiredDate || null,
                endDate: profile.endDate || null,
                hourlyRate: profile.hourlyRate || null,
                monthlyRate: profile.monthlyRate || null,
                preferences: profile.preferences || {},
            };

            res.json({ success: true, data: flatMedico });
        } catch (error) {
            logger.error('Failed to get medico', {
                component: 'medici-routes',
                error: 'Operazione non riuscita',
                medicoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero del medico',
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
    authenticateToken,
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

                // Persona già abilitata come medico in questo tenant
                if (hasMedicoRoleThisTenant) {
                    return res.status(409).json({
                        success: false,
                        error: 'Questo medico è già registrato per questa organizzazione',
                        existingPersonId: existingPerson.id,
                        existingPersonName: `${existingPerson.firstName} ${existingPerson.lastName}`,
                        canEnable: false
                    });
                }

                // Persona esiste ma non ha il ruolo MEDICO in questo tenant:
                // Chiedi conferma prima di aggiungere il ruolo
                const existingRoles = existingPerson.personRoles.map(r => r.roleType);
                return res.status(409).json({
                    success: false,
                    error: `La persona ${existingPerson.firstName} ${existingPerson.lastName} esiste già nel sistema con i ruoli: ${existingRoles.join(', ') || 'nessuno'}. Vuoi abilitarla come medico?`,
                    existingPersonId: existingPerson.id,
                    existingPersonName: `${existingPerson.firstName} ${existingPerson.lastName}`,
                    canEnable: true
                });
            }

            // Create new person with MEDICO role
            const bcrypt = await import('bcrypt');
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
                    taxCode: taxCode?.toUpperCase(),
                    birthDate: birthDate ? new Date(birthDate) : null,
                    profileImage,
                    username: createAccount ? username : null,
                    password: createAccount ? hashedPassword : null,
                    // P48: campi tenant-specific in PersonTenantProfile
                    tenantProfiles: {
                        create: {
                            tenantId,
                            email,
                            phone,
                            pec,
                            residenceAddress,
                            residenceCity,
                            province,
                            postalCode,
                            iban: iban?.toUpperCase(),
                            notes: notes || '',
                            specialties: specialties || (specializzazione ? [specializzazione] : []),
                            registerCode: registerCode || numeroIscrizione,
                            registerCode2,
                            shortDescription,
                            fullDescription,
                            status: 'ACTIVE',
                            isPrimary: true,
                            preferences: alboRegione ? { alboRegione } : {}
                        }
                    },
                    personRoles: {
                        create: {
                            roleType: 'MEDICO',
                            isActive: true,
                            isPrimary: true,
                            tenantId
                        }
                    }
                },
                include: {
                    personRoles: { where: { deletedAt: null } },
                    tenantProfiles: { where: { tenantId, deletedAt: null }, take: 1 }
                }
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

            await notifyMedicoPoliambulatorioAssignment({ medico, tenantId, email });

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
                error: 'Operazione non riuscita',
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
    authenticateToken,
    checkAdvancedPermission('medici', 'create'),
    auditClinico('enable_medico'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const {
                personId,
                email, phone, pec,
                residenceAddress, residenceCity, province, postalCode,
                iban, notes,
                specialties, registerCode, registerCode2,
                shortDescription, fullDescription,
                alboRegione,
                prestazioniIds
            } = req.body;

            if (!personId) {
                return res.status(400).json({
                    success: false,
                    error: 'personId è obbligatorio'
                });
            }

            const person = await prisma.person.findFirst({
                where: { id: personId, deletedAt: null },
                include: { personRoles: true } // include soft-deleted to handle upsert
            });

            if (!person) {
                return res.status(404).json({
                    success: false,
                    error: 'Persona non trovata'
                });
            }

            // Trova il ruolo MEDICO (anche se soft-deleted) per upsert sicuro
            const anyMedicoRole = person.personRoles.find(
                r => r.roleType === 'MEDICO' && r.tenantId === tenantId
            );

            if (anyMedicoRole && anyMedicoRole.isActive && !anyMedicoRole.deletedAt) {
                return res.status(409).json({
                    success: false,
                    error: 'Questa persona è già abilitata come medico'
                });
            }

            // Upsert PersonRole: riattiva se soft-deleted, altrimenti crea
            if (anyMedicoRole) {
                await prisma.personRole.update({
                    where: { id: anyMedicoRole.id },
                    data: { isActive: true, deletedAt: null }
                });
            } else {
                await prisma.personRole.create({
                    data: {
                        personId: person.id,
                        roleType: 'MEDICO',
                        isActive: true,
                        isPrimary: false,
                        tenantId
                    }
                });
            }

            // Costruisci i dati profilo da aggiornare/creare
            const profileData = {};
            if (email !== undefined) profileData.email = email || null;
            if (phone !== undefined) profileData.phone = phone || null;
            if (pec !== undefined) profileData.pec = pec || null;
            if (residenceAddress !== undefined) profileData.residenceAddress = residenceAddress || null;
            if (residenceCity !== undefined) profileData.residenceCity = residenceCity || null;
            if (province !== undefined) profileData.province = province || null;
            if (postalCode !== undefined) profileData.postalCode = postalCode || null;
            if (iban !== undefined) profileData.iban = iban ? iban.toUpperCase() : null;
            if (notes !== undefined) profileData.notes = notes || '';
            if (specialties?.length > 0) profileData.specialties = specialties;
            if (registerCode !== undefined) profileData.registerCode = registerCode || null;
            if (registerCode2 !== undefined) profileData.registerCode2 = registerCode2 || null;
            if (shortDescription !== undefined) profileData.shortDescription = shortDescription || null;
            if (fullDescription !== undefined) profileData.fullDescription = fullDescription || null;
            if (alboRegione) profileData.preferences = { alboRegione };

            // Upsert PersonTenantProfile per questo tenant
            const existingProfile = await prisma.personTenantProfile.findFirst({
                where: { personId: person.id, tenantId, deletedAt: null }
            });

            let isCrossTenant = false;
            if (existingProfile) {
                if (Object.keys(profileData).length > 0) {
                    await prisma.personTenantProfile.update({
                        where: { id: existingProfile.id },
                        data: { ...profileData, isActive: true, updatedAt: new Date() }
                    });
                }
            } else {
                // Cross-tenant: crea nuovo profilo per questo tenant
                isCrossTenant = true;
                await prisma.personTenantProfile.create({
                    data: {
                        personId: person.id,
                        tenantId,
                        ...profileData,
                        status: 'ACTIVE',
                        isActive: true,
                        isPrimary: false
                    }
                });

                // Crea PersonDataShareConsent (PENDING) per tracciare il dato cross-tenant
                const originalProfile = await prisma.personTenantProfile.findFirst({
                    where: { personId: person.id, deletedAt: null, tenantId: { not: tenantId } },
                    orderBy: { createdAt: 'asc' }
                });

                if (originalProfile) {
                    // Evita duplicati: @@unique([personId, sourceTenantId, targetTenantId])
                    await prisma.personDataShareConsent.upsert({
                        where: {
                            personId_sourceTenantId_targetTenantId: {
                                personId: person.id,
                                sourceTenantId: originalProfile.tenantId,
                                targetTenantId: tenantId
                            }
                        },
                        update: {
                            approvalStatus: 'PENDING',
                            isRevoked: false,
                            requestedBy: req.person?.id || null,
                            requestedAt: new Date()
                        },
                        create: {
                            personId: person.id,
                            sourceTenantId: originalProfile.tenantId,
                            targetTenantId: tenantId,
                            sharedDataTypes: ['PROFILE', 'ROLES'],
                            excludedFields: [],
                            consentGiven: false,
                            approvalStatus: 'PENDING',
                            requestedBy: req.person?.id || null,
                            requestedAt: new Date(),
                            requestNotes: 'Abilitazione ruolo MEDICO - richiesta automatica'
                        }
                    });
                }
            }

            await prisma.gdprAuditLog.create({
                data: {
                    personId: req.person?.id || person.id,
                    action: 'CREATE',
                    resourceType: 'PERSON_ROLE_MEDICO',
                    resourceId: person.id,
                    dataAccessed: { roleType: 'MEDICO', tenantId, isCrossTenant },
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    tenantId
                }
            });

            // Crea abilitazioni se fornite
            if (prestazioniIds && prestazioniIds.length > 0) {
                await prisma.medicoAbilitato.createMany({
                    data: prestazioniIds.map(prestazioneId => ({
                        medicoId: person.id,
                        prestazioneId,
                        tenantId,
                        attivo: true,
                        dataAbilitazione: new Date()
                    })),
                    skipDuplicates: true
                });
            }

            const updatedPerson = await prisma.person.findUnique({
                where: { id: person.id },
                include: {
                    personRoles: { where: { deletedAt: null } },
                    tenantProfiles: { where: { tenantId, deletedAt: null }, take: 1 }
                }
            });

            await notifyMedicoPoliambulatorioAssignment({ medico: updatedPerson, tenantId, email });

            res.status(201).json({
                success: true,
                data: updatedPerson,
                message: `${person.firstName} ${person.lastName} è stato abilitato come medico`
            });
        } catch (error) {
            logger.error('Failed to enable person as medico', {
                component: 'medici-routes',
                error: 'Operazione non riuscita',
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'abilitazione del medico',
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
    authenticateToken,
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
                    deletedAt: null,
                    tenantProfiles: { some: { tenantId, deletedAt: null } },
                    personRoles: { some: { roleType: 'MEDICO', deletedAt: null, tenantId } }
                }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Medico non trovato'
                });
            }

            // Verifica conflitto CF se il taxCode viene cambiato
            if (taxCode && taxCode.toUpperCase() !== existing.taxCode) {
                const conflicting = await prisma.person.findFirst({
                    where: { taxCode: taxCode.toUpperCase(), id: { not: id } },
                    include: { personRoles: { where: { deletedAt: null } } }
                });
                if (conflicting) {
                    if (!conflicting.deletedAt) {
                        // Persona attiva con lo stesso CF
                        const conflictRoles = conflicting.personRoles?.map(r => r.roleType) || [];
                        return res.status(409).json({
                            success: false,
                            error: `Il codice fiscale è già associato a ${conflicting.firstName} ${conflicting.lastName}${conflictRoles.length ? ` (${conflictRoles.join(', ')})` : ''}`,
                            existingPersonId: conflicting.id,
                            existingPersonName: `${conflicting.firstName} ${conflicting.lastName}`
                        });
                    } else {
                        // Persona soft-deleted: anonimizza il CF per rilasciare il vincolo unique
                        await prisma.person.update({
                            where: { id: conflicting.id },
                            data: { taxCode: `ANON_${conflicting.id.substring(0, 8)}` }
                        });
                        await prisma.gdprAuditLog.create({
                            data: {
                                personId: req.person?.id,
                                action: 'ANONYMIZE',
                                resourceType: 'PERSON_TAXCODE',
                                resourceId: conflicting.id,
                                dataAccessed: { reason: 'CF riutilizzato durante aggiornamento medico', replacedBy: id },
                                ipAddress: req.ip || req.connection?.remoteAddress,
                                tenantId
                            }
                        });
                    }
                }
            }

            // P48: Person global fields
            const personData = {};
            if (firstName) personData.firstName = firstName;
            if (lastName) personData.lastName = lastName;
            if (taxCode) personData.taxCode = taxCode.toUpperCase();
            if (birthDate !== undefined) personData.birthDate = birthDate ? new Date(birthDate) : null;
            if (profileImage !== undefined) personData.profileImage = profileImage || null;

            // P48: PersonTenantProfile fields
            const profileData = {};
            if (email) profileData.email = email;
            if (phone !== undefined) profileData.phone = phone;
            if (status) profileData.status = status;
            if (pec !== undefined) profileData.pec = pec || null;
            if (residenceAddress !== undefined) profileData.residenceAddress = residenceAddress || null;
            if (residenceCity !== undefined) profileData.residenceCity = residenceCity || null;
            if (province !== undefined) profileData.province = province || null;
            if (postalCode !== undefined) profileData.postalCode = postalCode || null;
            if (iban !== undefined) profileData.iban = iban?.toUpperCase() || null;
            if (notes !== undefined) profileData.notes = notes || null;
            if (shortDescription !== undefined) profileData.shortDescription = shortDescription || null;
            if (fullDescription !== undefined) profileData.fullDescription = fullDescription || null;

            if (specialties !== undefined) {
                profileData.specialties = specialties || [];
            } else if (specializzazione) {
                profileData.specialties = [specializzazione];
            }

            if (registerCode !== undefined) profileData.registerCode = registerCode || null;
            if (numeroIscrizione !== undefined && registerCode === undefined) profileData.registerCode = numeroIscrizione || null;
            if (registerCode2 !== undefined) profileData.registerCode2 = registerCode2 || null;

            if (alboRegione !== undefined) {
                const existingPrefs = existing.preferences || {};
                profileData.preferences = { ...existingPrefs, alboRegione };
            }

            if (Object.keys(personData).length > 0) {
                await prisma.person.update({
                    where: { id },
                    data: personData
                });
            }

            if (Object.keys(profileData).length > 0) {
                await prisma.personTenantProfile.updateMany({
                    where: { personId: id, tenantId, deletedAt: null },
                    data: profileData
                });
            }

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
                    tenantProfiles: { where: { tenantId, deletedAt: null }, take: 1 },
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
                    dataAccessed: { previousData: existing, newData: { ...personData, ...profileData } },
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    tenantId
                }
            });

            // P48: Flatten tenantProfile fields for frontend
            const uProfile = updatedMedico?.tenantProfiles?.[0] || {};
            const { tenantProfiles: _tp, ...uPersonFields } = updatedMedico || {};
            const flatUpdated = {
                ...uPersonFields,
                email: uProfile.email || null,
                phone: uProfile.phone || null,
                pec: uProfile.pec || null,
                status: uProfile.status || 'PENDING',
                residenceAddress: uProfile.residenceAddress || null,
                residenceCity: uProfile.residenceCity || null,
                province: uProfile.province || null,
                postalCode: uProfile.postalCode || null,
                iban: uProfile.iban || null,
                notes: uProfile.notes || null,
                specialties: uProfile.specialties || [],
                registerCode: uProfile.registerCode || null,
                registerCode2: uProfile.registerCode2 || null,
                shortDescription: uProfile.shortDescription || null,
                fullDescription: uProfile.fullDescription || null,
                preferences: uProfile.preferences || {},
            };

            res.json({
                success: true,
                data: flatUpdated,
                message: 'Medico aggiornato con successo'
            });
        } catch (error) {
            logger.error('Failed to update medico', {
                component: 'medici-routes',
                error: 'Operazione non riuscita',
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
    authenticateToken,
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
                    deletedAt: null,
                    tenantProfiles: { some: { tenantId, deletedAt: null } },
                    personRoles: { some: { roleType: 'MEDICO', deletedAt: null, tenantId } }
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
                    where: { personId: id, roleType: 'MEDICO', tenantId },
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
                error: 'Operazione non riuscita',
                medicoId: req.params.id,
                tenantId: getEffectiveTenantId(req)
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione del medico',
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
    authenticateToken,
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
                error: 'Operazione non riuscita',
                medicoId: req.params.id
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli ambulatori',
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
    authenticateToken,
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
                error: 'Operazione non riuscita',
                medicoId: req.params.id
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero della disponibilità',
            });
        }
    }
);

export default router;
