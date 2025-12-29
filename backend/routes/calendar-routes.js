/**
 * Calendar Routes
 * 
 * API endpoints for calendar integration (ICS export, Google Calendar sync)
 * 
 * Routes:
 * - GET /api/v1/calendar/appointment/:id/ics - Download appointment ICS
 * - GET /api/v1/calendar/doctor/:id/feed - Doctor calendar feed
 * - GET /api/v1/calendar/patient/:id/feed - Patient calendar feed
 * - POST /api/v1/calendar/google/sync - Sync appointment to Google Calendar
 * - DELETE /api/v1/calendar/google/sync/:appointmentId - Remove from Google Calendar
 * - GET /api/v1/calendar/google/calendars - List user's Google calendars
 * 
 * @module routes/calendar-routes
 * @version 1.0.0
 */

import express from 'express';
import { param, query, validationResult } from 'express-validator';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import CalendarService from '../services/calendarService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// ============================================
// ICS EXPORT ENDPOINTS
// ============================================

/**
 * @swagger
 * /api/v1/calendar/appointment/{id}/ics:
 *   get:
 *     summary: Download appointment as ICS file
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 */
router.get('/appointment/:id/ics',
    requireAuth,
    requirePermission('appointments:read'),
    [
        param('id').isUUID()
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;

            const result = await CalendarService.generateAppointmentICS(id, tenantId);

            res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.content);

            logger.info('ICS file downloaded', {
                component: 'CalendarRoutes',
                action: 'downloadICS',
                appointmentId: id,
                userId: req.user.id,
                tenantId
            });
        } catch (error) {
            logger.error('Failed to generate ICS', {
                component: 'CalendarRoutes',
                action: 'downloadICS',
                appointmentId: req.params.id,
                error: error.message
            });

            res.status(error.message === 'Appointment not found' ? 404 : 500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/calendar/doctor/{id}/feed:
 *   get:
 *     summary: Get doctor's calendar feed (ICS)
 *     tags: [Calendar]
 */
router.get('/doctor/:id/feed',
    requireAuth,
    requirePermission('appointments:read'),
    [
        param('id').isUUID(),
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601()
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { startDate, endDate } = req.query;
            const tenantId = req.user.tenantId;

            const result = await CalendarService.generateDoctorCalendarFeed(
                id,
                { startDate, endDate },
                tenantId
            );

            res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.content);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/calendar/patient/{id}/feed:
 *   get:
 *     summary: Get patient's calendar feed (ICS)
 *     tags: [Calendar]
 */
router.get('/patient/:id/feed',
    requireAuth,
    requirePermission('appointments:read'),
    [
        param('id').isUUID(),
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601()
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { startDate, endDate } = req.query;
            const tenantId = req.user.tenantId;

            const result = await CalendarService.generatePatientCalendarFeed(
                id,
                { startDate, endDate },
                tenantId
            );

            res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.content);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/calendar/my-appointments:
 *   get:
 *     summary: Get current user's appointments as ICS feed
 *     tags: [Calendar]
 */
router.get('/my-appointments',
    requireAuth,
    [
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601()
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;

            // If user is a doctor, get their doctor appointments
            // Otherwise get patient appointments
            // For now, default to patient view
            const result = await CalendarService.generatePatientCalendarFeed(
                userId,
                { startDate, endDate },
                tenantId
            );

            res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.content);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// ============================================
// GOOGLE CALENDAR ENDPOINTS
// ============================================

/**
 * @swagger
 * /api/v1/calendar/google/calendars:
 *   get:
 *     summary: List user's Google Calendars
 *     tags: [Calendar]
 */
router.get('/google/calendars',
    requireAuth,
    async (req, res) => {
        try {
            const calendars = await CalendarService.getGoogleCalendars(
                req.user.id,
                req.user.tenantId
            );

            res.json({
                success: true,
                data: calendars
            });
        } catch (error) {
            const statusCode = error.message === 'Google account not connected' ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/calendar/google/sync:
 *   post:
 *     summary: Sync appointment to Google Calendar
 *     tags: [Calendar]
 */
router.post('/google/sync',
    requireAuth,
    requirePermission('appointments:read'),
    async (req, res) => {
        try {
            const { appointmentId } = req.body;

            if (!appointmentId) {
                return res.status(400).json({
                    success: false,
                    error: 'appointmentId is required'
                });
            }

            const result = await CalendarService.syncToGoogleCalendar(
                appointmentId,
                req.user.id,
                req.user.tenantId
            );

            logger.info('Appointment synced to Google Calendar', {
                component: 'CalendarRoutes',
                action: 'syncToGoogle',
                appointmentId,
                eventId: result.eventId,
                userId: req.user.id
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/calendar/google/sync/{appointmentId}:
 *   delete:
 *     summary: Remove appointment from Google Calendar
 *     tags: [Calendar]
 */
router.delete('/google/sync/:appointmentId',
    requireAuth,
    requirePermission('appointments:read'),
    [
        param('appointmentId').isUUID()
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { appointmentId } = req.params;

            const result = await CalendarService.removeFromGoogleCalendar(
                appointmentId,
                req.user.id,
                req.user.tenantId
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

export default router;
