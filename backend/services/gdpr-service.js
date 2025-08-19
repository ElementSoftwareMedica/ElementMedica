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
    static async recordConsent(personId, consentType, purpose, legalBasis = 'consent') {
        try {
            const consent = await prisma.consentRecord.create({
                data: {
                    personId,
                    consentType,
                    purpose,
                    legalBasis,
                    consentGiven: true,
                    consentDate: new Date(),
                    ipAddress: null, // Will be set by middleware
                    userAgent: null, // Will be set by middleware
                    version: '1.0'
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
                    withdrawnAt: null
                },
                orderBy: {
                    consentDate: 'desc'
                }
            });
            
            if (!consent) {
                throw new Error('No active consent found for withdrawal');
            }
            
            const updatedConsent = await prisma.consentRecord.update({
                where: { id: consent.id },
                data: {
                    consentGiven: false,
                    withdrawnAt: new Date(),
                    withdrawalReason: reason
                }
            });
            
            // Log consent withdrawal
            await this.logGDPRActivity({
                personId,
                action: 'CONSENT_WITHDRAWN',
                dataType: consentType,
                purpose: consent.purpose,
                legalBasis: consent.legalBasis,
                details: {
                    consentId: consent.id,
                    reason,
                    originalConsentDate: consent.consentDate
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
     * Check if user has given consent for specific purpose
     */
    static async hasConsent(personId, consentType) {
        try {
            const consent = await prisma.consentRecord.findFirst({
                where: {
                    personId,
                    consentType,
                    consentGiven: true,
                    withdrawnAt: null
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
                    // Anonymize person record instead of deleting
                    await tx.person.update({
                        where: { id: personId },
                        data: {
                            email: `deleted_${personId}@anonymized.local`,
                            firstName: 'Deleted',
                            lastName: 'User',
                            phone: null,
                            isActive: false,
                            deletedAt: new Date()
                        }
                    });
                    deletionSummary.anonymizedTables.push('persons');
                } else {
                    // Complete deletion
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
            
            // Person profile data
            userData.profile = await prisma.person.findUnique({
                where: {id: personId,},
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    createdAt: true,
                    updatedAt: true,
                    lastLogin: true,
                    companyId: true
                }
            });
            
            // Person roles
            userData.roles = await prisma.personRole.findMany({
                where: { personId: personId },
                include: {
                    role: {
                        select: {
                            name: true,
                            description: true
                        }
                    }
                }
            });
            
            // Refresh tokens (session data)
            userData.sessions = await prisma.refreshToken.findMany({
                where: { personId: personId },
                select: {
                    id: true,
                    createdAt: true,
                    expiresAt: true,
                    revokedAt: true,
                    isActive: true
                }
            });
            
            // Consent records
            userData.consents = await prisma.consentRecord.findMany({
                where: { personId: personId },
                select: {
                    consentType: true,
                    purpose: true,
                    consentGiven: true,
                    consentDate: true,
                    withdrawnAt: true,
                    legalBasis: true
                }
            });
            
            // Activity logs (limited to user's own actions)
            userData.activities = await prisma.gdprAuditLog.findMany({
                where: { personId: personId },
                select: {
                    action: true,
                    dataType: true,
                    purpose: true,
                    timestamp: true,
                    ipAddress: true
                },
                orderBy: {
                    timestamp: 'desc'
                },
                take: 100 // Limit to recent activities
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
     */
    static async logGDPRActivity(activityData) {
        try {
            const {
                personId,
                action,
                dataType,
                purpose,
                legalBasis,
                details = {},
                ipAddress = null,
                userAgent = null
            } = activityData;
            
            await prisma.gdprAuditLog.create({
                data: {
                    personId: personId,
                    action,
                    dataType,
                    purpose,
                    legalBasis,
                    details: JSON.stringify(details),
                    ipAddress,
                    userAgent,
                    timestamp: new Date()
                }
            });
            
        } catch (error) {
            logger.error('Failed to log GDPR activity', {
                component: 'gdpr-service',
                action: 'logGDPRActivity',
                error: error.message,
                activityData
            });
            // Don't throw error to avoid breaking main operations
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
            endDate = null
        } = options;
        
        try {
            const where = { personId };
            
            if (action) {
                where.action = action;
            }
            
            if (startDate || endDate) {
                where.timestamp = {};
                if (startDate) where.timestamp.gte = new Date(startDate);
                if (endDate) where.timestamp.lte = new Date(endDate);
            }
            
            const auditLogs = await prisma.gdprAuditLog.findMany({
                where,
                orderBy: {
                    timestamp: 'desc'
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
            
            const whereClause = companyId ? { person: { companyId } } : {};
            
            // Count active consents by type
            const consentStats = await prisma.consentRecord.groupBy({
                by: ['consentType'],
                where: {
                    ...whereClause,
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
                    ...whereClause,
                    action: 'DATA_EXPORTED',
                    timestamp: {
                        gte: thirtyDaysAgo
                    }
                }
            });
            
            report.details.dataExportsLast30Days = dataExports;
            
            // Count data deletions in last 30 days
            const dataDeletions = await prisma.gdprAuditLog.count({
                where: {
                    ...whereClause,
                    action: 'DATA_DELETED',
                    timestamp: {
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