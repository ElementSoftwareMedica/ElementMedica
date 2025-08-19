/**
 * GDPR Consent Management System
 * Gestisce il consenso degli utenti secondo il GDPR
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../auth/middleware.js';
import { authenticateAdvanced } from '../../middleware/auth-advanced.js';
import { requireRoles } from '../../middleware/rbac.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Valid consent types for validation
 */
const VALID_CONSENT_TYPES = [
    'marketing',
    'analytics',
    'functional',
    'authentication',
    'data_processing',
    'third_party_sharing'
];

/**
 * Valid legal basis for consent
 */
const VALID_LEGAL_BASIS = [
    'consent',
    'contract',
    'legal_obligation',
    'vital_interests',
    'public_task',
    'legitimate_interest'
];

/**
 * Grant consent (new endpoint)
 */
router.post('/grant',
    authenticateAdvanced,
    [
        body('personId').isString().notEmpty(),
        body('consentTypes').isArray({ min: 1 }),
        body('consentTypes.*').isString().isIn(VALID_CONSENT_TYPES),
        body('purpose').isString().isLength({ min: 10, max: 500 }),
        body('legalBasis').optional().isString().isIn(VALID_LEGAL_BASIS)
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            
            const { personId, consentTypes, purpose, legalBasis = 'consent' } = req.body;
            
            // Check if user can grant consent for other person
            if (personId !== req.person.id && !req.person.roles.includes('global_admin')) {
                return res.status(403).json({
                    error: 'Access denied to grant consent for other person',
                    code: 'GDPR_ACCESS_DENIED'
                });
            }
            
            const consents = [];
            
            for (const consentType of consentTypes) {
                const consent = await GDPRService.recordConsent(
                    personId,
                    consentType,
                    purpose,
                    legalBasis
                );
                
                // Update consent record with request details
                await prisma.consentRecord.update({
                    where: { id: consent.id },
                    data: {
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent')
                    }
                });
                
                consents.push(consent);
            }
            
            logger.info('Person consents granted', {
                component: 'gdpr-consent-management',
                action: 'grantConsents',
                personId,
                consentTypes,
                purpose,
                consentIds: consents.map(c => c.id),
                ip: req.ip
            });
            
            res.status(201).json({
                message: 'Consents granted successfully',
                consents: consents.map(consent => ({
                    id: consent.id,
                    consentType: consent.consentType,
                    purpose: consent.purpose,
                    consentDate: consent.consentDate,
                    legalBasis: consent.legalBasis
                }))
            });
            
        } catch (error) {
            logger.error('Failed to grant consents', {
                component: 'gdpr-consent-management',
                action: 'grantConsents',
                error: error.message,
                personId: req.person?.id,
                body: req.body
            });
            
            res.status(500).json({
                error: 'Failed to grant consents',
                code: 'GDPR_CONSENT_GRANT_FAILED'
            });
        }
    }
);

/**
 * Revoke consent (new endpoint)
 */
router.post('/revoke',
    authenticateAdvanced,
    [
        body('personId').isString().notEmpty(),
        body('consentTypes').isArray({ min: 1 }),
        body('consentTypes.*').isString().notEmpty(),
        body('reason').optional().isString().isLength({ max: 500 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            
            const { personId, consentTypes, reason } = req.body;
            
            // Check if user can revoke consent for other person
            if (personId !== req.person.id && !req.person.roles.includes('global_admin')) {
                return res.status(403).json({
                    error: 'Access denied to revoke consent for other person',
                    code: 'GDPR_ACCESS_DENIED'
                });
            }
            
            const revokedConsents = [];
            
            for (const consentType of consentTypes) {
                const consent = await GDPRService.withdrawConsent(
                    personId,
                    consentType,
                    reason
                );
                revokedConsents.push(consent);
            }
            
            logger.info('Person consents revoked', {
                component: 'gdpr-consent-management',
                action: 'revokeConsents',
                personId,
                consentTypes,
                reason,
                consentIds: revokedConsents.map(c => c.id),
                ip: req.ip
            });
            
            res.json({
                message: 'Consents revoked successfully',
                consents: revokedConsents.map(consent => ({
                    id: consent.id,
                    consentType: consent.consentType,
                    withdrawnAt: consent.withdrawnAt,
                    withdrawalReason: consent.withdrawalReason
                }))
            });
            
        } catch (error) {
            logger.error('Failed to revoke consents', {
                component: 'gdpr-consent-management',
                action: 'revokeConsents',
                error: error.message,
                personId: req.person?.id,
                body: req.body
            });
            
            res.status(500).json({
                error: 'Failed to revoke consents',
                code: 'GDPR_CONSENT_REVOKE_FAILED'
            });
        }
    }
);

/**
 * Create consent (generic endpoint)
 */
router.post('/',
    authenticateAdvanced,
    [
        body('consentType').isString().isIn(VALID_CONSENT_TYPES),
        body('purpose').isString().isLength({ min: 10, max: 500 }),
        body('legalBasis').optional().isString().isIn(VALID_LEGAL_BASIS)
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            
            const { consentType, purpose, legalBasis = 'consent' } = req.body;
            const personId = req.person.id;
            
            const consent = await GDPRService.recordConsent(
                personId,
                consentType,
                purpose,
                legalBasis
            );
            
            // Update consent record with request details
            await prisma.consentRecord.update({
                where: { id: consent.id },
                data: {
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                }
            });
            
            logger.info('Person consent recorded', {
                component: 'gdpr-consent-management',
                action: 'recordConsent',
                personId,
                consentType,
                purpose,
                consentId: consent.id,
                ip: req.ip
            });
            
            res.status(201).json({
                message: 'Consent recorded successfully',
                consent: {
                    id: consent.id,
                    consentType: consent.consentType,
                    purpose: consent.purpose,
                    consentDate: consent.consentDate,
                    legalBasis: consent.legalBasis
                }
            });
            
        } catch (error) {
            logger.error('Failed to record consent', {
                component: 'gdpr-consent-management',
                action: 'recordConsent',
                error: error.message,
                personId: req.person?.id,
                body: req.body
            });
            
            res.status(500).json({
                error: 'Failed to record consent',
                code: 'GDPR_CONSENT_RECORD_FAILED'
            });
        }
    }
);

/**
 * Withdraw user consent
 */
router.post('/withdraw',
    authenticateAdvanced,
    [
        body('consentType').isString().notEmpty(),
        body('reason').optional().isString().isLength({ max: 500 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            
            const { consentType, reason } = req.body;
            const personId = req.person.id;
            
            const consent = await GDPRService.withdrawConsent(
                personId,
                consentType,
                reason
            );
            
            logger.info('Person consent withdrawn', {
                component: 'gdpr-consent-management',
                action: 'withdrawConsent',
                personId,
                consentType,
                reason,
                consentId: consent.id,
                ip: req.ip
            });
            
            res.json({
                message: 'Consent withdrawn successfully',
                consent: {
                    id: consent.id,
                    consentType: consent.consentType,
                    withdrawnAt: consent.withdrawnAt,
                    withdrawalReason: consent.withdrawalReason
                }
            });
            
        } catch (error) {
            logger.error('Failed to withdraw consent', {
                component: 'gdpr-consent-management',
                action: 'withdrawConsent',
                error: error.message,
                personId: req.person?.id,
                body: req.body
            });
            
            res.status(500).json({
                error: 'Failed to withdraw consent',
                code: 'GDPR_CONSENT_WITHDRAW_FAILED'
            });
        }
    }
);

/**
 * Get current user's consent status
 */
router.get('/current-user',
    authenticateAdvanced,
    async (req, res) => {
        try {
            const personId = req.person.id;
            
            const consents = await prisma.consentRecord.findMany({
                where: { personId },
                orderBy: {
                    consentDate: 'desc'
                },
                select: {
                    id: true,
                    consentType: true,
                    purpose: true,
                    consentGiven: true,
                    consentDate: true,
                    withdrawnAt: true,
                    legalBasis: true,
                    version: true
                }
            });
            
            // Group by consent type to show current status
            const consentStatus = {};
            consents.forEach(consent => {
                if (!consentStatus[consent.consentType] || 
                    consent.consentDate > consentStatus[consent.consentType].consentDate) {
                    consentStatus[consent.consentType] = consent;
                }
            });
            
            res.json({
                consents: Object.values(consentStatus),
                history: consents
            });
            
        } catch (error) {
            logger.error('Failed to get current user consent status', {
                component: 'gdpr-consent-management',
                action: 'getCurrentUserConsent',
                error: error.message,
                personId: req.person?.id
            });
            
            res.status(500).json({
                error: 'Failed to get consent status',
                code: 'GDPR_CONSENT_GET_FAILED'
            });
        }
    }
);

/**
 * Get specific person's consent status (Admin only)
 */
router.get('/:personId',
    authenticateAdvanced,
    requireRoles(['global_admin', 'data_protection_officer']),
    async (req, res) => {
        try {
            const { personId } = req.params;
            
            const consents = await prisma.consentRecord.findMany({
                where: { personId },
                orderBy: {
                    consentDate: 'desc'
                },
                select: {
                    id: true,
                    consentType: true,
                    purpose: true,
                    consentGiven: true,
                    consentDate: true,
                    withdrawnAt: true,
                    legalBasis: true,
                    version: true
                }
            });
            
            // Group by consent type to show current status
            const consentStatus = {};
            consents.forEach(consent => {
                if (!consentStatus[consent.consentType] || 
                    consent.consentDate > consentStatus[consent.consentType].consentDate) {
                    consentStatus[consent.consentType] = consent;
                }
            });
            
            res.json({
                consents: Object.values(consentStatus),
                history: consents
            });
            
        } catch (error) {
            logger.error('Failed to get person consent status', {
                component: 'gdpr-consent-management',
                action: 'getPersonConsent',
                error: error.message,
                personId: req.params?.personId,
                adminPersonId: req.person?.id
            });
            
            res.status(500).json({
                error: 'Failed to get consent status',
                code: 'GDPR_CONSENT_GET_FAILED'
            });
        }
    }
);

/**
 * Get user's consent status (legacy endpoint)
 */
router.get('/',
    authenticateAdvanced,
    async (req, res) => {
        try {
            const personId = req.person.id;
            
            const consents = await prisma.consentRecord.findMany({
                where: { personId },
                orderBy: {
                    consentDate: 'desc'
                },
                select: {
                    id: true,
                    consentType: true,
                    purpose: true,
                    consentGiven: true,
                    consentDate: true,
                    withdrawnAt: true,
                    legalBasis: true,
                    version: true
                }
            });
            
            // Group by consent type to show current status
            const consentStatus = {};
            consents.forEach(consent => {
                if (!consentStatus[consent.consentType] || 
                    consent.consentDate > consentStatus[consent.consentType].consentDate) {
                    consentStatus[consent.consentType] = consent;
                }
            });
            
            res.json({
                consents: Object.values(consentStatus),
                history: consents
            });
            
        } catch (error) {
            logger.error('Failed to get consent status', {
                component: 'gdpr-consent-management',
                action: 'getConsent',
                error: error.message,
                personId: req.person?.id
            });
            
            res.status(500).json({
                error: 'Failed to get consent status',
                code: 'GDPR_CONSENT_GET_FAILED'
            });
        }
    }
);

export default router;