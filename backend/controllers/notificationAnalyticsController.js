/**
 * Notification Analytics Controller
 * 
 * Controller per API analytics e GDPR compliance delle notifiche.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 8
 * 
 * @module controllers/notificationAnalyticsController
 * @version 1.0.0
 */

import NotificationAnalyticsService from '../services/notifications/NotificationAnalyticsService.js';
import NotificationGdprService from '../services/notifications/NotificationGdprService.js';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

/**
 * Overview stats per dashboard
 * GET /api/v1/notifications/analytics/overview
 */
export const getOverviewStats = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { startDate, endDate, category } = req.query;

        const stats = await NotificationAnalyticsService.getOverviewStats(tenantId, {
            startDate,
            endDate,
            category
        });

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('Failed to get overview stats', {
            component: 'NotificationAnalyticsController',
            action: 'getOverviewStats',
            error: 'Errore interno del server',
            tenantId: req.person?.tenantId
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile recuperare le statistiche generali',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Metriche delivery per canale
 * GET /api/v1/notifications/analytics/delivery
 */
export const getDeliveryMetrics = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { startDate, endDate } = req.query;

        const metrics = await NotificationAnalyticsService.getDeliveryMetrics(tenantId, {
            startDate,
            endDate
        });

        res.json({
            success: true,
            data: metrics
        });

    } catch (error) {
        logger.error('Failed to get delivery metrics', {
            component: 'NotificationAnalyticsController',
            action: 'getDeliveryMetrics',
            error: 'Errore interno del server',
            tenantId: req.person?.tenantId
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile recuperare le metriche di consegna',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Analisi trend temporali
 * GET /api/v1/notifications/analytics/trends
 */
export const getTrendAnalysis = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { granularity, startDate, endDate } = req.query;

        const trends = await NotificationAnalyticsService.getTrendAnalysis(tenantId, {
            granularity,
            startDate,
            endDate
        });

        res.json({
            success: true,
            data: trends
        });

    } catch (error) {
        logger.error('Failed to get trend analysis', {
            component: 'NotificationAnalyticsController',
            action: 'getTrendAnalysis',
            error: 'Errore interno del server',
            tenantId: req.person?.tenantId
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile recuperare l\'analisi dei trend',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Engagement per categoria
 * GET /api/v1/notifications/analytics/engagement
 */
export const getEngagementByCategory = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { startDate, endDate } = req.query;

        const engagement = await NotificationAnalyticsService.getEngagementByCategory(tenantId, {
            startDate,
            endDate
        });

        res.json({
            success: true,
            data: engagement
        });

    } catch (error) {
        logger.error('Failed to get engagement by category', {
            component: 'NotificationAnalyticsController',
            action: 'getEngagementByCategory',
            error: 'Errore interno del server',
            tenantId: req.person?.tenantId
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile recuperare i dati di engagement',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Distribuzione per tipo/priorità
 * GET /api/v1/notifications/analytics/distribution
 */
export const getDistribution = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { startDate, endDate } = req.query;

        const distribution = await NotificationAnalyticsService.getDistribution(tenantId, {
            startDate,
            endDate
        });

        res.json({
            success: true,
            data: distribution
        });

    } catch (error) {
        logger.error('Failed to get distribution', {
            component: 'NotificationAnalyticsController',
            action: 'getDistribution',
            error: 'Errore interno del server',
            tenantId: req.person?.tenantId
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile recuperare i dati di distribuzione',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Report singola notifica
 * GET /api/v1/notifications/analytics/report/:notificationId
 */
export const getNotificationReport = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { notificationId } = req.params;

        const report = await NotificationAnalyticsService.getNotificationReport(notificationId, tenantId);

        res.json({
            success: true,
            data: report
        });

    } catch (error) {
        logger.error('Failed to get notification report', {
            component: 'NotificationAnalyticsController',
            action: 'getNotificationReport',
            error: 'Errore interno del server',
            notificationId: req.params?.notificationId,
            tenantId: req.person?.tenantId
        });

        const statusCode = error.message === 'Notification not found' ? 404 : 500;

        res.status(statusCode).json({
            success: false,
            error: 'Impossibile recuperare il report della notifica',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Export analytics
 * GET /api/v1/notifications/analytics/export
 */
export const exportAnalytics = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { format, startDate, endDate } = req.query;

        const exportData = await NotificationAnalyticsService.exportAnalytics(tenantId, {
            format: format || 'json',
            startDate,
            endDate
        });

        // Set headers per download
        res.setHeader('Content-Type', exportData.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);

        res.send(exportData.content);

    } catch (error) {
        logger.error('Failed to export analytics', {
            component: 'NotificationAnalyticsController',
            action: 'exportAnalytics',
            error: 'Errore interno del server',
            tenantId: req.person?.tenantId
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile esportare le analytics',
            message: 'Errore interno del server'
        });
    }
};

// ============================================
// GDPR ENDPOINTS
// ============================================

/**
 * Export dati personali (GDPR Art. 15)
 * GET /api/v1/notifications/gdpr/export
 * 
 * Utente può esportare solo i propri dati
 */
export const exportPersonData = async (req, res) => {
    try {
        const personId = req.person.id;
        const tenantId = getEffectiveTenantId(req);
        const { format } = req.query;

        const exportData = await NotificationGdprService.exportPersonData(personId, tenantId, {
            format: format || 'json'
        });

        // Log GDPR audit
        await NotificationGdprService.createAuditLog({
            personId,
            tenantId,
            action: 'GDPR_DATA_EXPORT_REQUEST',
            resourceType: 'NOTIFICATION_DATA',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Set headers per download
        res.setHeader('Content-Type', exportData.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);

        res.send(exportData.content);

    } catch (error) {
        logger.error('Failed to export person data', {
            component: 'NotificationAnalyticsController',
            action: 'exportPersonData',
            error: 'Errore interno del server',
            personId: req.person?.id
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile esportare i dati',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Export dati personali per admin
 * GET /api/v1/notifications/gdpr/export/:personId
 * 
 * Solo admin può esportare dati di altri utenti
 */
export const exportPersonDataAdmin = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { personId } = req.params;
        const { format } = req.query;

        const exportData = await NotificationGdprService.exportPersonData(personId, tenantId, {
            format: format || 'json'
        });

        // Log GDPR audit
        await NotificationGdprService.createAuditLog({
            personId,
            tenantId,
            action: 'GDPR_DATA_EXPORT_ADMIN',
            resourceType: 'NOTIFICATION_DATA',
            details: { performedBy: req.person.id },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.setHeader('Content-Type', exportData.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);

        res.send(exportData.content);

    } catch (error) {
        logger.error('Failed to export person data (admin)', {
            component: 'NotificationAnalyticsController',
            action: 'exportPersonDataAdmin',
            error: 'Errore interno del server',
            targetPersonId: req.params?.personId,
            requestedBy: req.person?.id
        });

        const statusCode = error.message === 'Person not found' ? 404 : 500;

        res.status(statusCode).json({
            success: false,
            error: 'Impossibile esportare i dati',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Cancella dati personali (GDPR Art. 17)
 * DELETE /api/v1/notifications/gdpr/data
 * 
 * Utente richiede cancellazione propri dati
 */
export const requestDataDeletion = async (req, res) => {
    try {
        const personId = req.person.id;
        const tenantId = getEffectiveTenantId(req);
        const { reason } = req.body;

        // Soft delete (default per GDPR - mantiene audit trail)
        const result = await NotificationGdprService.deletePersonData(personId, tenantId, {
            hardDelete: false,
            reason: reason || 'User request (GDPR Art. 17)'
        });

        // Log GDPR audit
        await NotificationGdprService.createAuditLog({
            personId,
            tenantId,
            action: 'GDPR_DATA_DELETION_REQUEST',
            resourceType: 'NOTIFICATION_DATA',
            details: { reason, result },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Richiesta di cancellazione dati elaborata',
            data: result
        });

    } catch (error) {
        logger.error('Failed to delete person data', {
            component: 'NotificationAnalyticsController',
            action: 'requestDataDeletion',
            error: 'Errore interno del server',
            personId: req.person?.id
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile elaborare la richiesta di cancellazione',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Cancella dati utente per admin
 * DELETE /api/v1/notifications/gdpr/data/:personId
 */
export const deletePersonDataAdmin = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { personId } = req.params;
        const { hardDelete, reason } = req.body;

        const result = await NotificationGdprService.deletePersonData(personId, tenantId, {
            hardDelete: hardDelete === true,
            reason: reason || 'Admin request (GDPR Art. 17)'
        });

        // Log GDPR audit
        await NotificationGdprService.createAuditLog({
            personId,
            tenantId,
            action: hardDelete ? 'GDPR_DATA_HARD_DELETE_ADMIN' : 'GDPR_DATA_SOFT_DELETE_ADMIN',
            resourceType: 'NOTIFICATION_DATA',
            details: { reason, performedBy: req.person.id, result },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Cancellazione dati elaborata',
            data: result
        });

    } catch (error) {
        logger.error('Failed to delete person data (admin)', {
            component: 'NotificationAnalyticsController',
            action: 'deletePersonDataAdmin',
            error: 'Errore interno del server',
            targetPersonId: req.params?.personId,
            requestedBy: req.person?.id
        });

        const statusCode = error.message === 'Person not found' ? 404 : 500;

        res.status(statusCode).json({
            success: false,
            error: 'Impossibile cancellare i dati',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Anonimizza dati utente
 * POST /api/v1/notifications/gdpr/anonymize/:personId
 */
export const anonymizePersonData = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { personId } = req.params;

        const result = await NotificationGdprService.anonymizePersonData(personId, tenantId);

        res.json({
            success: true,
            message: 'Anonimizzazione dati completata',
            data: result
        });

    } catch (error) {
        logger.error('Failed to anonymize person data', {
            component: 'NotificationAnalyticsController',
            action: 'anonymizePersonData',
            error: 'Errore interno del server',
            targetPersonId: req.params?.personId
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile anonimizzare i dati',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Audit trail utente
 * GET /api/v1/notifications/gdpr/audit
 */
export const getAuditTrail = async (req, res) => {
    try {
        const personId = req.person.id;
        const tenantId = getEffectiveTenantId(req);
        const { page, limit, startDate, endDate, action } = req.query;

        const auditTrail = await NotificationGdprService.getAuditTrail(personId, tenantId, {
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 50,
            startDate,
            endDate,
            action
        });

        res.json({
            success: true,
            ...auditTrail
        });

    } catch (error) {
        logger.error('Failed to get audit trail', {
            component: 'NotificationAnalyticsController',
            action: 'getAuditTrail',
            error: 'Errore interno del server',
            personId: req.person?.id
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile recuperare l\'audit trail',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Audit trail tenant (admin)
 * GET /api/v1/notifications/gdpr/audit/tenant
 */
export const getTenantAuditTrail = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { page, limit, startDate, endDate, action, resourceType } = req.query;

        const auditTrail = await NotificationGdprService.getTenantAuditTrail(tenantId, {
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 100,
            startDate,
            endDate,
            action,
            resourceType
        });

        res.json({
            success: true,
            ...auditTrail
        });

    } catch (error) {
        logger.error('Failed to get tenant audit trail', {
            component: 'NotificationAnalyticsController',
            action: 'getTenantAuditTrail',
            error: 'Errore interno del server',
            tenantId: req.person?.tenantId
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile recuperare l\'audit trail del tenant',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Applica retention policy (admin)
 * POST /api/v1/notifications/gdpr/retention
 */
export const applyRetentionPolicy = async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { retentionDays, hardDelete } = req.body;

        const result = await NotificationGdprService.applyRetentionPolicy(tenantId, {
            retentionDays: parseInt(retentionDays, 10) || 365,
            hardDelete: hardDelete === true
        });

        res.json({
            success: true,
            message: 'Policy di retention applicata',
            data: result
        });

    } catch (error) {
        logger.error('Failed to apply retention policy', {
            component: 'NotificationAnalyticsController',
            action: 'applyRetentionPolicy',
            error: 'Errore interno del server',
            tenantId: req.person?.tenantId
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile applicare la policy di retention',
            message: 'Errore interno del server'
        });
    }
};

export default {
    // Analytics
    getOverviewStats,
    getDeliveryMetrics,
    getTrendAnalysis,
    getEngagementByCategory,
    getDistribution,
    getNotificationReport,
    exportAnalytics,
    // GDPR
    exportPersonData,
    exportPersonDataAdmin,
    requestDataDeletion,
    deletePersonDataAdmin,
    anonymizePersonData,
    getAuditTrail,
    getTenantAuditTrail,
    applyRetentionPolicy
};
