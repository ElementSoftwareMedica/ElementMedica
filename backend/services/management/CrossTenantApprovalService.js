/**
 * CrossTenantApprovalService
 * 
 * Service per gestire le richieste di approvazione per la condivisione
 * di dati cross-tenant (Person e Company).
 * 
 * P57 - Commercialization E2E
 * P59 - Propagazione automatica consensi Company → Person
 * 
 * @module services/management/CrossTenantApprovalService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import NotificationService from '../notifications/NotificationService.js';
import CrossTenantCompanyPersonConsentService from '../company/CrossTenantCompanyPersonConsentService.js';

// ============================================
// CONSTANTS
// ============================================

const APPROVAL_STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    REVOKED: 'REVOKED'
};

const NOTIFICATION_TEMPLATES = {
    PERSON_SHARE_REQUEST: {
        type: 'ALERT',
        category: 'ADMIN',
        priority: 'HIGH',
        icon: 'UserPlus',
        iconColor: '#0d9488'
    },
    COMPANY_SHARE_REQUEST: {
        type: 'ALERT',
        category: 'ADMIN',
        priority: 'HIGH',
        icon: 'Building2',
        iconColor: '#0d9488'
    },
    SHARE_APPROVED: {
        type: 'SUCCESS',
        category: 'SYSTEM',
        priority: 'NORMAL',
        icon: 'CheckCircle',
        iconColor: '#22c55e'
    },
    SHARE_REJECTED: {
        type: 'WARNING',
        category: 'SYSTEM',
        priority: 'NORMAL',
        icon: 'XCircle',
        iconColor: '#ef4444'
    }
};

// ============================================
// CROSS-TENANT APPROVAL SERVICE
// ============================================

class CrossTenantApprovalService {

    // ==========================================
    // PERSON CONSENT MANAGEMENT
    // ==========================================

    /**
     * Crea una richiesta di condivisione dati per una Person
     * e invia notifica agli admin del tenant sorgente
     * 
     * @param {Object} data - Dati della richiesta
     * @param {string} data.personId - ID della Person da condividere
     * @param {string} data.sourceTenantId - Tenant che possiede i dati
     * @param {string} data.targetTenantId - Tenant che richiede accesso
     * @param {string[]} data.sharedDataTypes - Tipi di dati da condividere
     * @param {string} data.requestedBy - Person ID che fa la richiesta
     * @param {string} [data.requestNotes] - Note aggiuntive
     * @returns {Promise<Object>} Consent creato
     */
    static async createPersonShareRequest(data) {
        const {
            personId,
            sourceTenantId,
            targetTenantId,
            sharedDataTypes,
            requestedBy,
            requestNotes
        } = data;

        try {
            // 1. Verifica che la Person esista e appartenga al tenant sorgente
            const person = await prisma.person.findFirst({
                where: {
                    id: personId,
                    deletedAt: null,
                    tenantProfiles: {
                        some: {
                            tenantId: sourceTenantId,
                            deletedAt: null
                        }
                    }
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    taxCode: true
                }
            });

            if (!person) {
                throw new Error('PERSON_NOT_FOUND_IN_SOURCE_TENANT');
            }

            // 2. Verifica che non esista già un consent
            const existingConsent = await prisma.personDataShareConsent.findUnique({
                where: {
                    personId_sourceTenantId_targetTenantId: {
                        personId,
                        sourceTenantId,
                        targetTenantId
                    }
                }
            });

            if (existingConsent) {
                if (existingConsent.approvalStatus === 'APPROVED' && !existingConsent.isRevoked) {
                    throw new Error('CONSENT_ALREADY_APPROVED');
                }
                if (existingConsent.approvalStatus === 'PENDING') {
                    throw new Error('CONSENT_ALREADY_PENDING');
                }
            }

            // 3. Recupera info sul tenant richiedente
            const targetTenant = await prisma.tenant.findFirst({
                where: { id: targetTenantId , deletedAt: null },
                select: { id: true, name: true }
            });

            // 4. Crea o aggiorna il consent con status PENDING
            const consent = await prisma.personDataShareConsent.upsert({
                where: {
                    personId_sourceTenantId_targetTenantId: {
                        personId,
                        sourceTenantId,
                        targetTenantId
                    }
                },
                create: {
                    personId,
                    sourceTenantId,
                    targetTenantId,
                    sharedDataTypes,
                    excludedFields: [],
                    consentGiven: false,
                    approvalStatus: 'PENDING',
                    requestedBy,
                    requestedAt: new Date(),
                    requestNotes
                },
                update: {
                    sharedDataTypes,
                    approvalStatus: 'PENDING',
                    requestedBy,
                    requestedAt: new Date(),
                    requestNotes,
                    rejectedBy: null,
                    rejectedAt: null,
                    rejectionReason: null,
                    isRevoked: false,
                    revokedAt: null,
                    revokedReason: null
                }
            });

            // 5. Trova admin del tenant sorgente per notificarli
            const admins = await this.findTenantAdmins(sourceTenantId);

            // 6. Invia notifiche agli admin
            const personName = `${person.firstName} ${person.lastName}`;
            const tenantName = targetTenant?.name || 'Tenant sconosciuto';

            for (const admin of admins) {
                await NotificationService.create({
                    tenantId: sourceTenantId,
                    recipientId: admin.id,
                    title: 'Richiesta condivisione dati persona',
                    body: `${tenantName} richiede accesso ai dati di ${personName} (${person.taxCode}). Tipi richiesti: ${sharedDataTypes.join(', ')}.`,
                    shortBody: `Nuova richiesta condivisione per ${personName}`,
                    ...NOTIFICATION_TEMPLATES.PERSON_SHARE_REQUEST,
                    entityType: 'PersonDataShareConsent',
                    entityId: consent.id,
                    actionUrl: '/admin/cross-tenant-approvals',
                    actionLabel: 'Gestisci richiesta',
                    requiresConfirmation: true,
                    metadata: {
                        consentId: consent.id,
                        personId,
                        sourceTenantId,
                        targetTenantId,
                        sharedDataTypes,
                        action: 'APPROVE_OR_REJECT'
                    }
                });
            }

            logger.info({
                action: 'CROSS_TENANT_PERSON_SHARE_REQUEST',
                personId,
                sourceTenantId,
                targetTenantId,
                requestedBy,
                adminsNotified: admins.length
            }, 'Person share request created');

            return consent;

        } catch (error) {
            logger.error({ error, personId, sourceTenantId, targetTenantId }, 'Failed to create person share request');
            throw error;
        }
    }

    /**
     * Approva una richiesta di condivisione dati Person
     * 
     * @param {string} consentId - ID del consent
     * @param {string} approvedBy - Person ID che approva
     * @param {string} tenantId - Tenant ID per verifica permessi
     * @returns {Promise<Object>} Consent aggiornato
     */
    static async approvePersonShareRequest(consentId, approvedBy, tenantId) {
        try {
            // 1. Verifica che il consent esista e sia in stato PENDING
            const consent = await prisma.personDataShareConsent.findUnique({
                where: { id: consentId , deletedAt: null },
                include: {
                    person: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    targetTenant: {
                        select: { id: true, name: true }
                    }
                }
            });

            if (!consent) {
                throw new Error('CONSENT_NOT_FOUND');
            }

            if (consent.sourceTenantId !== tenantId) {
                throw new Error('NOT_AUTHORIZED_WRONG_TENANT');
            }

            if (consent.approvalStatus !== 'PENDING') {
                throw new Error(`CONSENT_NOT_PENDING: ${consent.approvalStatus}`);
            }

            // 2. Aggiorna il consent
            const updatedConsent = await prisma.personDataShareConsent.update({
                where: { id: consentId , deletedAt: null },
                data: {
                    approvalStatus: 'APPROVED',
                    consentGiven: true,
                    consentDate: new Date(),
                    approvedBy,
                    approvedAt: new Date()
                }
            });

            // 3. Notifica il richiedente
            if (consent.requestedBy) {
                const personName = `${consent.person.firstName} ${consent.person.lastName}`;
                await NotificationService.create({
                    tenantId: consent.targetTenantId,
                    recipientId: consent.requestedBy,
                    title: 'Richiesta condivisione approvata',
                    body: `La richiesta di accesso ai dati di ${personName} è stata approvata.`,
                    ...NOTIFICATION_TEMPLATES.SHARE_APPROVED,
                    entityType: 'PersonDataShareConsent',
                    entityId: consent.id,
                    actionUrl: `/persons/${consent.personId}`,
                    actionLabel: 'Visualizza persona'
                });
            }

            // 4. Rimuovi le notifiche di richiesta non ancora lette
            await this.dismissApprovalNotifications(consent.id);

            logger.info({
                action: 'CROSS_TENANT_PERSON_SHARE_APPROVED',
                consentId,
                personId: consent.personId,
                approvedBy,
                targetTenantId: consent.targetTenantId
            }, 'Person share request approved');

            return updatedConsent;

        } catch (error) {
            logger.error({ error, consentId, approvedBy }, 'Failed to approve person share request');
            throw error;
        }
    }

    /**
     * Rifiuta una richiesta di condivisione dati Person
     * 
     * @param {string} consentId - ID del consent
     * @param {string} rejectedBy - Person ID che rifiuta
     * @param {string} tenantId - Tenant ID per verifica permessi
     * @param {string} [rejectionReason] - Motivo del rifiuto
     * @returns {Promise<Object>} Consent aggiornato
     */
    static async rejectPersonShareRequest(consentId, rejectedBy, tenantId, rejectionReason) {
        try {
            const consent = await prisma.personDataShareConsent.findUnique({
                where: { id: consentId , deletedAt: null },
                include: {
                    person: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                }
            });

            if (!consent) {
                throw new Error('CONSENT_NOT_FOUND');
            }

            if (consent.sourceTenantId !== tenantId) {
                throw new Error('NOT_AUTHORIZED_WRONG_TENANT');
            }

            if (consent.approvalStatus !== 'PENDING') {
                throw new Error(`CONSENT_NOT_PENDING: ${consent.approvalStatus}`);
            }

            const updatedConsent = await prisma.personDataShareConsent.update({
                where: { id: consentId , deletedAt: null },
                data: {
                    approvalStatus: 'REJECTED',
                    consentGiven: false,
                    rejectedBy,
                    rejectedAt: new Date(),
                    rejectionReason
                }
            });

            // Notifica il richiedente
            if (consent.requestedBy) {
                const personName = `${consent.person.firstName} ${consent.person.lastName}`;
                await NotificationService.create({
                    tenantId: consent.targetTenantId,
                    recipientId: consent.requestedBy,
                    title: 'Richiesta condivisione rifiutata',
                    body: `La richiesta di accesso ai dati di ${personName} è stata rifiutata.${rejectionReason ? ` Motivo: ${rejectionReason}` : ''}`,
                    ...NOTIFICATION_TEMPLATES.SHARE_REJECTED,
                    entityType: 'PersonDataShareConsent',
                    entityId: consent.id
                });
            }

            await this.dismissApprovalNotifications(consent.id);

            logger.info({
                action: 'CROSS_TENANT_PERSON_SHARE_REJECTED',
                consentId,
                personId: consent.personId,
                rejectedBy,
                rejectionReason
            }, 'Person share request rejected');

            return updatedConsent;

        } catch (error) {
            logger.error({ error, consentId, rejectedBy }, 'Failed to reject person share request');
            throw error;
        }
    }

    // ==========================================
    // COMPANY CONSENT MANAGEMENT
    // ==========================================

    /**
     * Crea una richiesta di condivisione dati per una Company
     */
    static async createCompanyShareRequest(data) {
        const {
            companyId,
            sourceTenantId,
            targetTenantId,
            sharedDataTypes,
            requestedBy,
            requestNotes
        } = data;

        try {
            // 1. Verifica Company
            const company = await prisma.company.findFirst({
                where: {
                    id: companyId,
                    deletedAt: null,
                    tenantProfiles: {
                        some: {
                            tenantId: sourceTenantId,
                            deletedAt: null
                        }
                    }
                },
                select: {
                    id: true,
                    ragioneSociale: true,
                    piva: true
                }
            });

            if (!company) {
                throw new Error('COMPANY_NOT_FOUND_IN_SOURCE_TENANT');
            }

            // 2. Verifica consent esistente
            const existingConsent = await prisma.companyDataShareConsent.findUnique({
                where: {
                    companyId_sourceTenantId_targetTenantId: {
                        companyId,
                        sourceTenantId,
                        targetTenantId
                    }
                }
            });

            if (existingConsent) {
                if (existingConsent.approvalStatus === 'APPROVED' && !existingConsent.isRevoked) {
                    throw new Error('CONSENT_ALREADY_APPROVED');
                }
                if (existingConsent.approvalStatus === 'PENDING') {
                    throw new Error('CONSENT_ALREADY_PENDING');
                }
            }

            const targetTenant = await prisma.tenant.findFirst({
                where: { id: targetTenantId , deletedAt: null },
                select: { id: true, name: true }
            });

            // 3. Crea o aggiorna consent
            const consent = await prisma.companyDataShareConsent.upsert({
                where: {
                    companyId_sourceTenantId_targetTenantId: {
                        companyId,
                        sourceTenantId,
                        targetTenantId
                    }
                },
                create: {
                    companyId,
                    sourceTenantId,
                    targetTenantId,
                    sharedDataTypes,
                    excludedFields: [],
                    consentGiven: false,
                    approvalStatus: 'PENDING',
                    requestedBy,
                    requestedAt: new Date(),
                    requestNotes
                },
                update: {
                    sharedDataTypes,
                    approvalStatus: 'PENDING',
                    requestedBy,
                    requestedAt: new Date(),
                    requestNotes,
                    rejectedBy: null,
                    rejectedAt: null,
                    rejectionReason: null,
                    isRevoked: false,
                    revokedAt: null,
                    revokedReason: null
                }
            });

            // 4. Notifica admin
            const admins = await this.findTenantAdmins(sourceTenantId);
            const companyName = company.ragioneSociale || 'Azienda';
            const tenantName = targetTenant?.name || 'Tenant sconosciuto';

            for (const admin of admins) {
                await NotificationService.create({
                    tenantId: sourceTenantId,
                    recipientId: admin.id,
                    title: 'Richiesta condivisione dati azienda',
                    body: `${tenantName} richiede accesso ai dati di ${companyName} (P.IVA ${company.piva}). Tipi richiesti: ${sharedDataTypes.join(', ')}.`,
                    shortBody: `Nuova richiesta condivisione per ${companyName}`,
                    ...NOTIFICATION_TEMPLATES.COMPANY_SHARE_REQUEST,
                    entityType: 'CompanyDataShareConsent',
                    entityId: consent.id,
                    actionUrl: '/admin/cross-tenant-approvals',
                    actionLabel: 'Gestisci richiesta',
                    requiresConfirmation: true,
                    metadata: {
                        consentId: consent.id,
                        companyId,
                        sourceTenantId,
                        targetTenantId,
                        sharedDataTypes,
                        action: 'APPROVE_OR_REJECT'
                    }
                });
            }

            logger.info({
                action: 'CROSS_TENANT_COMPANY_SHARE_REQUEST',
                companyId,
                sourceTenantId,
                targetTenantId,
                requestedBy,
                adminsNotified: admins.length
            }, 'Company share request created');

            return consent;

        } catch (error) {
            logger.error({ error, companyId, sourceTenantId, targetTenantId }, 'Failed to create company share request');
            throw error;
        }
    }

    /**
     * Approva una richiesta di condivisione dati Company
     * P59: Se il consent include formazione/clinica, propaga automaticamente ai dipendenti
     */
    static async approveCompanyShareRequest(consentId, approvedBy, tenantId) {
        try {
            const consent = await prisma.companyDataShareConsent.findUnique({
                where: { id: consentId , deletedAt: null },
                include: {
                    company: {
                        select: { id: true, ragioneSociale: true }
                    },
                    targetTenant: {
                        select: { id: true, name: true }
                    }
                }
            });

            if (!consent) {
                throw new Error('CONSENT_NOT_FOUND');
            }

            if (consent.sourceTenantId !== tenantId) {
                throw new Error('NOT_AUTHORIZED_WRONG_TENANT');
            }

            if (consent.approvalStatus !== 'PENDING') {
                throw new Error(`CONSENT_NOT_PENDING: ${consent.approvalStatus}`);
            }

            const updatedConsent = await prisma.companyDataShareConsent.update({
                where: { id: consentId , deletedAt: null },
                data: {
                    approvalStatus: 'APPROVED',
                    consentGiven: true,
                    consentDate: new Date(),
                    approvedBy,
                    approvedAt: new Date()
                }
            });

            // P59: Propaga automaticamente ai dipendenti se il consent include formazione/clinica
            let propagationResult = null;
            if (CrossTenantCompanyPersonConsentService.requiresPersonPropagation(consent.sharedDataTypes)) {
                try {
                    propagationResult = await CrossTenantCompanyPersonConsentService.propagateToEmployees(
                        consentId,
                        consent.companyId,
                        consent.sourceTenantId,
                        consent.targetTenantId,
                        consent.sharedDataTypes,
                        approvedBy
                    );

                    logger.info({
                        action: 'CONSENT_PROPAGATED_TO_EMPLOYEES',
                        consentId,
                        propagationResult
                    }, 'Company consent propagated to employees');
                } catch (propError) {
                    logger.error({
                        error: propError.message,
                        consentId
                    }, 'Failed to propagate consent to employees (non-blocking)');
                    // Non bloccare l'approvazione anche se la propagazione fallisce
                }
            }

            // Notifica il richiedente
            if (consent.requestedBy) {
                const companyName = consent.company.ragioneSociale || 'Azienda';
                const propagationNote = propagationResult?.propagatedCount > 0
                    ? ` I dati di ${propagationResult.propagatedCount} dipendenti sono ora visibili.`
                    : '';
                await NotificationService.create({
                    tenantId: consent.targetTenantId,
                    recipientId: consent.requestedBy,
                    title: 'Richiesta condivisione approvata',
                    body: `La richiesta di accesso ai dati di ${companyName} è stata approvata.${propagationNote}`,
                    ...NOTIFICATION_TEMPLATES.SHARE_APPROVED,
                    entityType: 'CompanyDataShareConsent',
                    entityId: consent.id,
                    actionUrl: `/companies/${consent.companyId}`,
                    actionLabel: 'Visualizza azienda'
                });
            }

            await this.dismissCompanyApprovalNotifications(consent.id);

            logger.info({
                action: 'CROSS_TENANT_COMPANY_SHARE_APPROVED',
                consentId,
                companyId: consent.companyId,
                approvedBy,
                targetTenantId: consent.targetTenantId,
                employeesPropagated: propagationResult?.propagatedCount || 0
            }, 'Company share request approved');

            return {
                ...updatedConsent,
                propagation: propagationResult
            };

        } catch (error) {
            logger.error({ error, consentId, approvedBy }, 'Failed to approve company share request');
            throw error;
        }
    }

    /**
     * Rifiuta una richiesta di condivisione dati Company
     */
    static async rejectCompanyShareRequest(consentId, rejectedBy, tenantId, rejectionReason) {
        try {
            const consent = await prisma.companyDataShareConsent.findUnique({
                where: { id: consentId , deletedAt: null },
                include: {
                    company: {
                        select: { id: true, ragioneSociale: true }
                    }
                }
            });

            if (!consent) {
                throw new Error('CONSENT_NOT_FOUND');
            }

            if (consent.sourceTenantId !== tenantId) {
                throw new Error('NOT_AUTHORIZED_WRONG_TENANT');
            }

            if (consent.approvalStatus !== 'PENDING') {
                throw new Error(`CONSENT_NOT_PENDING: ${consent.approvalStatus}`);
            }

            const updatedConsent = await prisma.companyDataShareConsent.update({
                where: { id: consentId , deletedAt: null },
                data: {
                    approvalStatus: 'REJECTED',
                    consentGiven: false,
                    rejectedBy,
                    rejectedAt: new Date(),
                    rejectionReason
                }
            });

            if (consent.requestedBy) {
                const companyName = consent.company.ragioneSociale || 'Azienda';
                await NotificationService.create({
                    tenantId: consent.targetTenantId,
                    recipientId: consent.requestedBy,
                    title: 'Richiesta condivisione rifiutata',
                    body: `La richiesta di accesso ai dati di ${companyName} è stata rifiutata.${rejectionReason ? ` Motivo: ${rejectionReason}` : ''}`,
                    ...NOTIFICATION_TEMPLATES.SHARE_REJECTED,
                    entityType: 'CompanyDataShareConsent',
                    entityId: consent.id
                });
            }

            await this.dismissCompanyApprovalNotifications(consent.id);

            logger.info({
                action: 'CROSS_TENANT_COMPANY_SHARE_REJECTED',
                consentId,
                companyId: consent.companyId,
                rejectedBy,
                rejectionReason
            }, 'Company share request rejected');

            return updatedConsent;

        } catch (error) {
            logger.error({ error, consentId, rejectedBy }, 'Failed to reject company share request');
            throw error;
        }
    }

    // ==========================================
    // QUERY METHODS
    // ==========================================

    /**
     * Recupera tutte le richieste di approvazione pendenti per un tenant
     * (come sorgente dei dati)
     */
    static async getPendingApprovals(tenantId) {
        const [personConsents, companyConsents] = await Promise.all([
            prisma.personDataShareConsent.findMany({
                where: {
                    sourceTenantId: tenantId,
                    approvalStatus: 'PENDING'
                },
                include: {
                    person: {
                        select: { id: true, firstName: true, lastName: true, taxCode: true }
                    },
                    targetTenant: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: { requestedAt: 'desc' }
            }),
            prisma.companyDataShareConsent.findMany({
                where: {
                    sourceTenantId: tenantId,
                    approvalStatus: 'PENDING'
                },
                include: {
                    company: {
                        select: { id: true, ragioneSociale: true, piva: true }
                    },
                    targetTenant: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: { requestedAt: 'desc' }
            })
        ]);

        return {
            persons: personConsents,
            companies: companyConsents,
            totalCount: personConsents.length + companyConsents.length
        };
    }

    /**
     * Recupera lo storico delle richieste per un tenant
     */
    static async getApprovalHistory(tenantId, { page = 1, limit = 20, status } = {}) {
        const skip = (page - 1) * limit;
        const statusFilter = status ? { approvalStatus: status } : {};

        const [personConsents, companyConsents, personCount, companyCount] = await Promise.all([
            prisma.personDataShareConsent.findMany({
                where: {
                    OR: [
                        { sourceTenantId: tenantId },
                        { targetTenantId: tenantId }
                    ],
                    ...statusFilter
                },
                include: {
                    person: {
                        select: { id: true, firstName: true, lastName: true, taxCode: true }
                    },
                    sourceTenant: { select: { id: true, name: true } },
                    targetTenant: { select: { id: true, name: true } }
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.companyDataShareConsent.findMany({
                where: {
                    OR: [
                        { sourceTenantId: tenantId },
                        { targetTenantId: tenantId }
                    ],
                    ...statusFilter
                },
                include: {
                    company: {
                        select: { id: true, ragioneSociale: true, piva: true }
                    },
                    sourceTenant: { select: { id: true, name: true } },
                    targetTenant: { select: { id: true, name: true } }
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.personDataShareConsent.count({
                where: {
                    OR: [
                        { sourceTenantId: tenantId },
                        { targetTenantId: tenantId }
                    ],
                    ...statusFilter
                }
            }),
            prisma.companyDataShareConsent.count({
                where: {
                    OR: [
                        { sourceTenantId: tenantId },
                        { targetTenantId: tenantId }
                    ],
                    ...statusFilter
                }
            })
        ]);

        return {
            persons: personConsents,
            companies: companyConsents,
            pagination: {
                page,
                limit,
                totalPersons: personCount,
                totalCompanies: companyCount,
                total: personCount + companyCount
            }
        };
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    /**
     * Trova gli admin di un tenant che possono approvare richieste
     */
    static async findTenantAdmins(tenantId) {
        const admins = await prisma.person.findMany({
            where: {
                deletedAt: null,
                roles: {
                    some: {
                        tenantId,
                        deletedAt: null,
                        isActive: true,
                        OR: [
                            { roleType: 'ADMIN' },
                            { roleType: 'SUPER_ADMIN' },
                            {
                                customRole: {
                                    permissions: {
                                        some: {
                                            permission: 'APPROVE_CROSS_TENANT_SHARING'
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true
            }
        });

        return admins;
    }

    /**
     * Rimuove/segna come lette le notifiche di approvazione per un consent Person
     */
    static async dismissApprovalNotifications(consentId) {
        try {
            // Aggiorna le notifiche correlate
            await prisma.notification.updateMany({
                where: {
                    entityType: 'PersonDataShareConsent',
                    entityId: consentId,
                    deletedAt: null
                },
                data: {
                    deletedAt: new Date()
                }
            });
        } catch (error) {
            logger.warn({ error, consentId }, 'Failed to dismiss approval notifications');
        }
    }

    /**
     * Rimuove/segna come lette le notifiche di approvazione per un consent Company
     */
    static async dismissCompanyApprovalNotifications(consentId) {
        try {
            await prisma.notification.updateMany({
                where: {
                    entityType: 'CompanyDataShareConsent',
                    entityId: consentId,
                    deletedAt: null
                },
                data: {
                    deletedAt: new Date()
                }
            });
        } catch (error) {
            logger.warn({ error, consentId }, 'Failed to dismiss company approval notifications');
        }
    }
}

export default CrossTenantApprovalService;
export { APPROVAL_STATUS };
