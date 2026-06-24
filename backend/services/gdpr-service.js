/**
 * GDPR Compliance Service
 * Handles data protection, privacy rights, and compliance requirements
 */

import crypto from 'crypto';
import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

import prisma from '../config/prisma-optimization.js';

/**
 * GDPR Service Class
 */
export class GDPRService {
    /**
     * Record consent for data processing
     */
    static async recordConsent(personId, consentType, purpose, legalBasis = 'consent', tenantId = null) {
        try {
            // Risolvi tenantId se non fornito (obbligatorio in ConsentRecord)
            let resolvedTenantId = tenantId;
            if (!resolvedTenantId) {
                const profile = await prisma.personTenantProfile.findFirst({
                    where: { personId, deletedAt: null, isActive: true },
                    orderBy: { isPrimary: 'desc' },
                    select: { tenantId: true }
                });
                resolvedTenantId = profile?.tenantId;
            }
            if (!resolvedTenantId) throw new Error('Unable to resolve tenantId for consent record');

            const consent = await prisma.consentRecord.create({
                data: {
                    personId,
                    consentType,
                    consentGiven: true,
                    // givenAt: @default(now()) — non necessario
                    ipAddress: null,
                    userAgent: null,
                    tenantId: resolvedTenantId
                }
            });

            // Log consent recording
            await this.logGDPRActivity({
                personId,
                action: 'CONSENT_RECORDED',
                dataType: consentType,
                purpose,
                legalBasis,
                details: {
                    consentId: consent.id,
                    consentType,
                    purpose
                }
            });

            logger.info('Consent recorded', {
                component: 'gdpr-service',
                action: 'recordConsent',
                personId,
                consentType,
                purpose,
                consentId: consent.id
            });

            return consent;

        } catch (error) {
            logger.error('Failed to record consent', {
                component: 'gdpr-service',
                action: 'recordConsent',
                error: error.message,
                personId,
                consentType,
                purpose
            });
            throw error;
        }
    }

    /**
     * Withdraw consent
     */
    static async withdrawConsent(personId, consentType, reason = null) {
        try {
            const consent = await prisma.consentRecord.findFirst({
                where: {
                    personId,
                    consentType,
                    consentGiven: true,
                    withdrawnAt: null,
                    deletedAt: null
                },
                orderBy: {
                    givenAt: 'desc'  // P48: campo corretto (era consentDate)
                }
            });

            if (!consent) {
                throw new Error('No active consent found for withdrawal');
            }

            const updatedConsent = await prisma.consentRecord.update({
                where: { id: consent.id },
                data: {
                    consentGiven: false,
                    withdrawnAt: new Date()
                    // withdrawalReason non esiste in schema: incluso in logGDPRActivity
                }
            });

            // Log consent withdrawal
            await this.logGDPRActivity({
                personId,
                tenantId: consent.tenantId,
                action: 'CONSENT_WITHDRAWN',
                dataType: consentType,
                details: {
                    consentId: consent.id,
                    reason,
                    originalConsentAt: consent.givenAt
                }
            });

            logger.info('Consent withdrawn', {
                component: 'gdpr-service',
                action: 'withdrawConsent',
                personId,
                consentType,
                consentId: consent.id,
                reason
            });

            return updatedConsent;

        } catch (error) {
            logger.error('Failed to withdraw consent', {
                component: 'gdpr-service',
                action: 'withdrawConsent',
                error: error.message,
                personId,
                consentType
            });
            throw error;
        }
    }

    /**
     * Upsert idempotente di un consenso (usato dalla sync firma tablet e dalla
     * gestione unificata /gdpr). Evita i duplicati di `recordConsent` (che fa sempre create).
     *
     * - consentGiven=true: se esiste già un record attivo per (personId, consentType, tenant)
     *   non crea duplicati; altrimenti crea. Logga CONSENT_RECORDED con `details.source`.
     * - consentGiven=false: revoca l'eventuale record attivo (tollerante: no-op se assente).
     *
     * @param {string} personId
     * @param {string} consentType - codice consenso (es. 'gdpr','sanitari','marketing'...)
     * @param {boolean} consentGiven
     * @param {Object} [opts]
     * @param {string} [opts.purpose]
     * @param {string} [opts.legalBasis='consent']
     * @param {string} [opts.tenantId]
     * @param {string} [opts.ipAddress]
     * @param {string} [opts.userAgent]
     * @param {string} [opts.source] - provenienza (es. 'TABLET_FIRMA','GDPR_PAGE')
     * @param {string} [opts.consentVersion]
     * @returns {Promise<Object|null>} record consenso (o null se revoca senza record attivo)
     */
    static async upsertConsent(personId, consentType, consentGiven, opts = {}) {
        const {
            purpose = null,
            legalBasis = 'consent',
            tenantId = null,
            ipAddress = null,
            userAgent = null,
            source = null,
            consentVersion = null,
            reason = null,
        } = opts;

        // Risolvi tenantId (obbligatorio in ConsentRecord)
        let resolvedTenantId = tenantId;
        if (!resolvedTenantId) {
            const profile = await prisma.personTenantProfile.findFirst({
                where: { personId, deletedAt: null, isActive: true },
                orderBy: { isPrimary: 'desc' },
                select: { tenantId: true }
            });
            resolvedTenantId = profile?.tenantId;
        }
        if (!resolvedTenantId) throw new Error('Unable to resolve tenantId for consent record');

        const existingActive = await prisma.consentRecord.findFirst({
            where: { personId, consentType, tenantId: resolvedTenantId, consentGiven: true, withdrawnAt: null, deletedAt: null },
            orderBy: { givenAt: 'desc' }
        });

        if (consentGiven) {
            if (existingActive) {
                return existingActive; // idempotente: già attivo
            }
            const consent = await prisma.consentRecord.create({
                data: {
                    personId,
                    consentType,
                    consentGiven: true,
                    consentVersion,
                    ipAddress,
                    userAgent,
                    tenantId: resolvedTenantId,
                }
            });
            await this.logGDPRActivity({
                personId,
                tenantId: resolvedTenantId,
                action: 'CONSENT_RECORDED',
                dataType: consentType,
                purpose,
                legalBasis,
                ipAddress,
                userAgent,
                details: { consentId: consent.id, consentType, source }
            });
            return consent;
        }

        // consentGiven === false → revoca tollerante
        if (!existingActive) return null;
        const updated = await prisma.consentRecord.update({
            where: { id: existingActive.id },
            data: { consentGiven: false, withdrawnAt: new Date() }
        });
        await this.logGDPRActivity({
            personId,
            tenantId: resolvedTenantId,
            action: 'CONSENT_WITHDRAWN',
            dataType: consentType,
            ipAddress,
            userAgent,
            details: { consentId: existingActive.id, consentType, source, reason }
        });
        return updated;
    }

    /**
     * Check if user has given consent for specific purpose
     */
    static async hasConsent(personId, consentType) {
        try {
            const consent = await prisma.consentRecord.findFirst({
                where: {
                    personId,
                    consentType,
                    consentGiven: true,
                    withdrawnAt: null,
                    deletedAt: null
                },
                orderBy: {
                    consentDate: 'desc'
                }
            });

            return !!consent;

        } catch (error) {
            logger.error('Failed to check consent', {
                component: 'gdpr-service',
                action: 'hasConsent',
                error: error.message,
                personId,
                consentType
            });
            return false;
        }
    }

    /**
     * Export user data (Right to Data Portability)
     */
    static async exportUserData(personId, format = 'json') {
        try {
            // Get user data from all relevant tables
            const userData = await this.collectUserData(personId);

            // Log data export
            await this.logGDPRActivity({
                personId,
                action: 'DATA_EXPORTED',
                dataType: 'ALL_USER_DATA',
                purpose: 'Data portability request',
                legalBasis: 'user_request',
                details: {
                    format,
                    exportDate: new Date(),
                    dataTypes: Object.keys(userData)
                }
            });

            logger.info('User data exported', {
                component: 'gdpr-service',
                action: 'exportUserData',
                personId,
                format,
                dataTypes: Object.keys(userData)
            });

            if (format === 'json') {
                return JSON.stringify(userData, null, 2);
            } else if (format === 'csv') {
                return this.convertToCSV(userData);
            }

            return userData;

        } catch (error) {
            logger.error('Failed to export user data', {
                component: 'gdpr-service',
                action: 'exportUserData',
                error: error.message,
                personId,
                format
            });
            throw error;
        }
    }

    /**
     * Delete user data (Right to be Forgotten)
     */
    static async deleteUserData(personId, options = {}) {
        const {
            anonymize = true,
            keepAuditLogs = true,
            keepFinancialRecords = true,
            reason = 'User request'
        } = options;

        try {
            // Start transaction for data deletion
            const result = await prisma.$transaction(async (tx) => {
                const deletionSummary = {
                    personId,
                    deletionDate: new Date(),
                    reason,
                    deletedTables: [],
                    anonymizedTables: [],
                    preservedTables: []
                };

                // Get user data before deletion for audit
                const userData = await this.collectUserData(personId);

                if (anonymize) {
                    // Anonymize person record (solo campi che esistono su Person)
                    await tx.person.update({
                        where: { id: personId },
                        data: {
                            firstName: 'Deleted',
                            lastName: 'User',
                            taxCode: null,
                            username: null,
                            deletedAt: new Date()
                        }
                    });

                    // P48: email/phone/status sono in PersonTenantProfile — anonymize separatamente
                    await tx.personTenantProfile.updateMany({
                        where: { personId, deletedAt: null },
                        data: {
                            email: `deleted_${personId}@anonymized.local`,
                            phone: null,
                            status: 'INACTIVE',
                            isActive: false,
                            deletedAt: new Date()
                        }
                    });

                    deletionSummary.anonymizedTables.push('persons', 'person_tenant_profiles');
                } else {
                    // Complete deletion — GDPR audit log BEFORE hard delete
                    await tx.gdprAuditLog.create({
                        data: {
                            personId,
                            action: 'DELETE',
                            resourceType: 'Person',
                            resourceId: personId,
                            dataAccessed: { purpose: 'Eliminazione completa record persona', action: 'hard_delete' },
                            tenantId
                        }
                    });
                    await tx.person.delete({
                        where: { id: personId }
                    });
                    deletionSummary.deletedTables.push('persons');
                }

                // Delete or anonymize related data
                const tablesToProcess = [
                    'refreshTokens',
                    'personRoles',
                    'consentRecords'
                ];

                for (const table of tablesToProcess) {
                    if (keepAuditLogs && table.includes('audit')) {
                        deletionSummary.preservedTables.push(table);
                        continue;
                    }

                    if (keepFinancialRecords && table.includes('payment')) {
                        deletionSummary.preservedTables.push(table);
                        continue;
                    }

                    try {
                        await tx[table].deleteMany({
                            where: { personId }
                        });
                        deletionSummary.deletedTables.push(table);
                    } catch (err) {
                        logger.warn(`Failed to delete from ${table}`, {
                            component: 'gdpr-service',
                            action: 'deleteUserData',
                            error: err.message,
                            personId,
                            table
                        });
                    }
                }

                return { deletionSummary, userData };
            });

            // Log data deletion
            await this.logGDPRActivity({
                personId,
                action: 'DATA_DELETED',
                dataType: 'ALL_USER_DATA',
                purpose: 'Right to be forgotten',
                legalBasis: 'user_request',
                details: {
                    deletionSummary: result.deletionSummary,
                    anonymized: anonymize,
                    reason
                }
            });

            logger.info('User data deleted/anonymized', {
                component: 'gdpr-service',
                action: 'deleteUserData',
                personId,
                anonymized: anonymize,
                deletedTables: result.deletionSummary.deletedTables,
                anonymizedTables: result.deletionSummary.anonymizedTables
            });

            return result.deletionSummary;

        } catch (error) {
            logger.error('Failed to delete user data', {
                component: 'gdpr-service',
                action: 'deleteUserData',
                error: error.message,
                personId,
                options
            });
            throw error;
        }
    }

    /**
     * Collect all user data from database
     */
    static async collectUserData(personId) {
        try {
            const userData = {};

            // Person profile data (P48: email/phone sono in PersonTenantProfile)
            const personBase = await prisma.person.findFirst({ // F222: findFirst+deletedAt
                where: { id: personId, deletedAt: null },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    taxCode: true,
                    username: true,
                    birthDate: true,
                    gender: true,
                    createdAt: true,
                    updatedAt: true,
                    lastLogin: true
                }
            });

            // P48: Raccogli email/phone/status dal primo profilo tenant attivo
            const tenantProfile = await prisma.personTenantProfile.findFirst({
                where: { personId, deletedAt: null, isActive: true },
                orderBy: { isPrimary: 'desc' },
                select: { email: true, phone: true, status: true, tenantId: true }
            });

            userData.profile = personBase ? {
                ...personBase,
                email: tenantProfile?.email || null,
                phone: tenantProfile?.phone || null,
                status: tenantProfile?.status || null
            } : null;

            // Person roles (PersonRole non ha relazione 'role' — roleType è un enum)
            userData.roles = await prisma.personRole.findMany({
                where: { personId: personId, deletedAt: null },
                select: {
                    id: true,
                    roleType: true,
                    tenantId: true,
                    isActive: true,
                    assignedAt: true,
                    validUntil: true,
                    customRole: {
                        select: { name: true, description: true }
                    }
                }
            });

            // Refresh tokens (session data) — F206: `isActive` does not exist on RefreshToken model
            const rawSessions = await prisma.refreshToken.findMany({
                where: { personId: personId },
                select: {
                    id: true,
                    createdAt: true,
                    expiresAt: true,
                    revokedAt: true,
                    deletedAt: true
                }
            });
            // Compute isActive client-side from schema fields
            const now = new Date();
            userData.sessions = rawSessions.map(s => ({
                id: s.id,
                createdAt: s.createdAt,
                expiresAt: s.expiresAt,
                revokedAt: s.revokedAt,
                isActive: !s.revokedAt && !s.deletedAt && s.expiresAt > now
            }));

            // Consent records (P48: campos reali di ConsentRecord)
            userData.consents = await prisma.consentRecord.findMany({
                where: { personId: personId, deletedAt: null },
                select: {
                    id: true,
                    consentType: true,
                    consentGiven: true,
                    givenAt: true,          // era consentDate — non esiste
                    withdrawnAt: true
                }
            });

            // Activity logs (limited to user's own actions) — campi reali di GdprAuditLog
            userData.activities = await prisma.gdprAuditLog.findMany({
                where: { personId: personId },
                select: {
                    id: true,
                    action: true,
                    resourceType: true,     // era dataType — non esiste
                    dataAccessed: true,     // era purpose — non esiste
                    createdAt: true,        // era timestamp — non esiste
                    ipAddress: true
                },
                orderBy: {
                    createdAt: 'desc'       // era timestamp — non esiste
                },
                take: 100
            });

            return userData;

        } catch (error) {
            logger.error('Failed to collect user data', {
                component: 'gdpr-service',
                action: 'collectUserData',
                error: error.message,
                personId
            });
            throw error;
        }
    }

    /**
     * Log GDPR-related activities
     * @param {Object} activityData - { personId, action, dataType, purpose, legalBasis, details, ipAddress, userAgent, tenantId }
     */
    static async logGDPRActivity(activityData) {
        try {
            const {
                personId,
                action,
                dataType,       // → mappato su resourceType
                purpose,        // → incluso in dataAccessed
                legalBasis,     // → incluso in dataAccessed
                details = {},
                ipAddress = null,
                userAgent = null,
                tenantId: providedTenantId = null
            } = activityData;

            // tenantId è obbligatorio in GdprAuditLog — risolvi da PersonTenantProfile se non fornito
            let tenantId = providedTenantId;
            if (!tenantId && personId) {
                const profile = await prisma.personTenantProfile.findFirst({
                    where: { personId, deletedAt: null, isActive: true },
                    orderBy: { isPrimary: 'desc' },
                    select: { tenantId: true }
                });
                tenantId = profile?.tenantId;
            }

            if (!tenantId) {
                logger.warn('logGDPRActivity skipped: unable to resolve tenantId', {
                    component: 'gdpr-service', action: 'logGDPRActivity', personId
                });
                return;
            }

            await prisma.gdprAuditLog.create({
                data: {
                    personId: personId || null,
                    action,
                    resourceType: dataType || null,
                    dataAccessed: { purpose, legalBasis, ...details },
                    ipAddress,
                    userAgent,
                    tenantId
                }
            });

        } catch (error) {
            logger.error('Failed to log GDPR activity', {
                component: 'gdpr-service',
                action: 'logGDPRActivity',
                error: error.message,
                activityData
            });
            // Non rilanciare per non bloccare le operazioni principali
        }
    }

    /**
     * Get user's GDPR audit trail
     */
    static async getAuditTrail(personId, options = {}) {
        const {
            limit = 50,
            offset = 0,
            action = null,
            startDate = null,
            endDate = null,
            tenantId = null   // F218: filter by tenant to prevent cross-tenant leaks
        } = options;

        try {
            const where = { personId, deletedAt: null }; // F218: always exclude soft-deleted entries

            // F218: scope to current tenant when known
            if (tenantId) where.tenantId = tenantId;

            if (action) {
                where.action = action;
            }

            if (startDate || endDate) {
                where.createdAt = {};            // era where.timestamp — non esiste
                if (startDate) where.createdAt.gte = new Date(startDate);
                if (endDate) where.createdAt.lte = new Date(endDate);
            }

            const auditLogs = await prisma.gdprAuditLog.findMany({
                where,
                orderBy: {
                    createdAt: 'desc'            // era timestamp — non esiste
                },
                take: limit,
                skip: offset
            });

            const total = await prisma.gdprAuditLog.count({ where });

            return {
                logs: auditLogs,
                total,
                limit,
                offset
            };

        } catch (error) {
            logger.error('Failed to get audit trail', {
                component: 'gdpr-service',
                action: 'getAuditTrail',
                error: error.message,
                personId,
                options
            });
            throw error;
        }
    }

    /**
     * Convert data to CSV format
     */
    static convertToCSV(data) {
        const csvLines = [];

        for (const [tableName, tableData] of Object.entries(data)) {
            if (!Array.isArray(tableData)) {
                continue;
            }

            if (tableData.length === 0) {
                continue;
            }

            csvLines.push(`\n--- ${tableName.toUpperCase()} ---`);

            const headers = Object.keys(tableData[0]);
            csvLines.push(headers.join(','));

            tableData.forEach(row => {
                const values = headers.map(header => {
                    const value = row[header];
                    if (value === null || value === undefined) {
                        return '';
                    }
                    if (typeof value === 'object') {
                        return JSON.stringify(value).replace(/"/g, '""');
                    }
                    return String(value).replace(/"/g, '""');
                });
                csvLines.push(values.join(','));
            });
        }

        return csvLines.join('\n');
    }

    /**
     * Encrypt sensitive data
     */
    static encryptData(data, key = null) {
        try {
            const encryptionKey = key || process.env.GDPR_ENCRYPTION_KEY;
            if (!encryptionKey) {
                throw new Error('Encryption key not provided');
            }

            const algorithm = 'aes-256-gcm';
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher(algorithm, encryptionKey);

            let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag();

            return {
                encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex')
            };

        } catch (error) {
            logger.error('Failed to encrypt data', {
                component: 'gdpr-service',
                action: 'encryptData',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Decrypt sensitive data
     */
    static decryptData(encryptedData, key = null) {
        try {
            const encryptionKey = key || process.env.GDPR_ENCRYPTION_KEY;
            if (!encryptionKey) {
                throw new Error('Encryption key not provided');
            }

            const algorithm = 'aes-256-gcm';
            const decipher = crypto.createDecipher(algorithm, encryptionKey);

            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return JSON.parse(decrypted);

        } catch (error) {
            logger.error('Failed to decrypt data', {
                component: 'gdpr-service',
                action: 'decryptData',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate privacy policy compliance report
     */
    static async generateComplianceReport(companyId = null) {
        try {
            const report = {
                generatedAt: new Date(),
                companyId,
                summary: {},
                details: {}
            };

            // GdprAuditLog ha il campo companyId — usato solo lì
            const auditWhereClause = companyId ? { companyId } : {};
            // ConsentRecord NON ha companyId — nessun filtro per ora
            const consentWhereClause = {};

            // Count active consents by type
            const consentStats = await prisma.consentRecord.groupBy({
                by: ['consentType'],
                where: {
                    ...consentWhereClause,
                    consentGiven: true,
                    withdrawnAt: null
                },
                _count: {
                    id: true
                }
            });

            report.details.activeConsents = consentStats;

            // Count data exports in last 30 days
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const dataExports = await prisma.gdprAuditLog.count({
                where: {
                    ...auditWhereClause,
                    action: 'DATA_EXPORTED',
                    createdAt: {                  // era timestamp — non esiste
                        gte: thirtyDaysAgo
                    }
                }
            });

            report.details.dataExportsLast30Days = dataExports;

            // Count data deletions in last 30 days
            const dataDeletions = await prisma.gdprAuditLog.count({
                where: {
                    ...auditWhereClause,
                    action: 'DATA_DELETED',
                    createdAt: {                  // era timestamp — non esiste
                        gte: thirtyDaysAgo
                    }
                }
            });

            report.details.dataDeletionsLast30Days = dataDeletions;

            // Summary
            report.summary = {
                totalActiveConsents: consentStats.reduce((sum, stat) => sum + stat._count.id, 0),
                consentTypes: consentStats.length,
                recentDataExports: dataExports,
                recentDataDeletions: dataDeletions
            };

            logger.info('GDPR compliance report generated', {
                component: 'gdpr-service',
                action: 'generateComplianceReport',
                companyId,
                summary: report.summary
            });

            return report;

        } catch (error) {
            logger.error('Failed to generate compliance report', {
                component: 'gdpr-service',
                action: 'generateComplianceReport',
                error: error.message,
                companyId
            });
            throw error;
        }
    }
}

export default GDPRService;