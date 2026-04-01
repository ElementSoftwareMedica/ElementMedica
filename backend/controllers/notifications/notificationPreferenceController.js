/**
 * Notification Preference Controller
 * 
 * Controller per le API delle preferenze di notifica.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 5, 9
 * 
 * @module controllers/notifications/notificationPreferenceController
 * @version 1.0.0
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

// ============================================
// VALIDATION HELPERS
// ============================================

const VALID_DIGEST_FREQUENCIES = new Set(['DAILY', 'WEEKLY', 'IMMEDIATE']);
const VALID_CATEGORY_OPT_OUTS = new Set([
    'GDPR', 'TRAINING', 'SAFETY', 'CLINICAL', 'ADMINISTRATIVE',
    'SYSTEM', 'ALERT', 'REMINDER', 'INFO', 'URGENT',
]);
const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateUpdatePreferences(body) {
    const errors = [];
    const boolFields = [
        'inAppEnabled', 'emailEnabled', 'smsEnabled', 'whatsappEnabled',
        'pushEnabled', 'quietHoursEnabled', 'digestEnabled', 'soundEnabled',
    ];
    for (const field of boolFields) {
        if (body[field] !== undefined && typeof body[field] !== 'boolean') {
            errors.push(`${field} must be a boolean`);
        }
    }
    if (body.quietHoursStart !== undefined && body.quietHoursStart !== null
        && !HH_MM_REGEX.test(body.quietHoursStart)) {
        errors.push('quietHoursStart must be HH:MM format');
    }
    if (body.quietHoursEnd !== undefined && body.quietHoursEnd !== null
        && !HH_MM_REGEX.test(body.quietHoursEnd)) {
        errors.push('quietHoursEnd must be HH:MM format');
    }
    if (body.digestFrequency !== undefined
        && !VALID_DIGEST_FREQUENCIES.has(body.digestFrequency)) {
        errors.push(`digestFrequency must be one of: ${[...VALID_DIGEST_FREQUENCIES].join(', ')}`);
    }
    if (body.categoryOptOuts !== undefined) {
        if (!Array.isArray(body.categoryOptOuts)) {
            errors.push('categoryOptOuts must be an array');
        } else {
            const invalid = body.categoryOptOuts.filter(c => !VALID_CATEGORY_OPT_OUTS.has(c));
            if (invalid.length > 0) {
                errors.push(`categoryOptOuts contains invalid categories: ${invalid.join(', ')}`);
            }
        }
    }
    return errors;
}

// ============================================
// DEFAULT PREFERENCES
// ============================================

const DEFAULT_PREFERENCES = {
    inAppEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    whatsappEnabled: false,
    pushEnabled: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    quietHoursTimezone: 'Europe/Rome',
    digestEnabled: false,
    digestFrequency: 'DAILY',
    digestTime: '08:00',
    soundEnabled: true,
    categoryOptOuts: []
};

// ============================================
// NOTIFICATION PREFERENCE CONTROLLER
// ============================================

/**
 * Ottiene le preferenze di notifica dell'utente corrente
 * GET /api/v1/notifications/advanced/preferences
 */
export const getPreferences = async (req, res) => {
    try {
        const personId = req.person.id;

        logger.info('Getting notification preferences', {
            component: 'NotificationPreferenceController',
            action: 'getPreferences',
            personId
        });

        const preference = await prisma.notificationPreference.findUnique({
            where: { personId }
        });

        // Se non esiste, ritorna default
        if (!preference) {
            return res.json({
                success: true,
                data: DEFAULT_PREFERENCES
            });
        }

        // Mappa dal database al formato frontend
        const data = {
            inAppEnabled: preference.enableInApp,
            emailEnabled: preference.enableEmail,
            smsEnabled: preference.enableSMS,
            whatsappEnabled: preference.enableWhatsApp,
            pushEnabled: preference.enablePush,
            quietHoursEnabled: preference.quietHoursEnabled,
            quietHoursStart: preference.quietHoursStart || '22:00',
            quietHoursEnd: preference.quietHoursEnd || '08:00',
            quietHoursTimezone: 'Europe/Rome', // Campo non in DB, default
            digestEnabled: preference.emailDigest !== 'IMMEDIATE',
            digestFrequency: preference.emailDigest === 'WEEKLY' ? 'WEEKLY' : 'DAILY',
            digestTime: '08:00', // Campo non in DB, default
            soundEnabled: preference.soundEnabled,
            categoryOptOuts: preference.optOutCategories || []
        };

        res.json({
            success: true,
            data
        });

    } catch (error) {
        logger.error('Impossibile recuperare le preferenze di notifica', {
            component: 'NotificationPreferenceController',
            action: 'getPreferences',
            error: 'Errore interno del server',
            personId: req.person?.id
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile recuperare le preferenze di notifica',
            message: 'Errore interno del server'
        });
    }
};

/**
 * Aggiorna le preferenze di notifica dell'utente corrente
 * PUT /api/v1/notifications/advanced/preferences
 */
export const updatePreferences = async (req, res) => {
    try {
        const personId = req.person.id;

        // Input validation
        const validationErrors = validateUpdatePreferences(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: 'Validazione fallita', details: validationErrors });
        }

        const {
            inAppEnabled,
            emailEnabled,
            smsEnabled,
            whatsappEnabled,
            pushEnabled,
            quietHoursEnabled,
            quietHoursStart,
            quietHoursEnd,
            digestEnabled,
            digestFrequency,
            soundEnabled,
            categoryOptOuts
        } = req.body;

        logger.info('Updating notification preferences', {
            component: 'NotificationPreferenceController',
            action: 'updatePreferences',
            personId
        });

        // Determina il digest frequency
        let emailDigest = 'IMMEDIATE';
        if (digestEnabled) {
            emailDigest = digestFrequency === 'WEEKLY' ? 'WEEKLY' : 'DAILY';
        }

        // Prepara i dati per il database
        const data = {
            enableInApp: inAppEnabled ?? true,
            enableEmail: emailEnabled ?? true,
            enableSMS: smsEnabled ?? false,
            enableWhatsApp: whatsappEnabled ?? false,
            enablePush: pushEnabled ?? false,
            quietHoursEnabled: quietHoursEnabled ?? false,
            quietHoursStart: quietHoursStart || null,
            quietHoursEnd: quietHoursEnd || null,
            emailDigest,
            soundEnabled: soundEnabled ?? true,
            badgeEnabled: true, // Default
            popupEnabled: true, // Default
            optOutCategories: categoryOptOuts || []
        };

        // Upsert: crea se non esiste, aggiorna se esiste
        const preference = await prisma.notificationPreference.upsert({
            where: { personId },
            update: data,
            create: {
                personId,
                ...data
            }
        });

        // Mappa dal database al formato frontend per la risposta
        const responseData = {
            inAppEnabled: preference.enableInApp,
            emailEnabled: preference.enableEmail,
            smsEnabled: preference.enableSMS,
            whatsappEnabled: preference.enableWhatsApp,
            pushEnabled: preference.enablePush,
            quietHoursEnabled: preference.quietHoursEnabled,
            quietHoursStart: preference.quietHoursStart || '22:00',
            quietHoursEnd: preference.quietHoursEnd || '08:00',
            quietHoursTimezone: 'Europe/Rome',
            digestEnabled: preference.emailDigest !== 'IMMEDIATE',
            digestFrequency: preference.emailDigest === 'WEEKLY' ? 'WEEKLY' : 'DAILY',
            digestTime: '08:00',
            soundEnabled: preference.soundEnabled,
            categoryOptOuts: preference.optOutCategories || []
        };

        logger.info('Notification preferences updated successfully', {
            component: 'NotificationPreferenceController',
            action: 'updatePreferences',
            personId
        });

        res.json({
            success: true,
            data: responseData,
            message: 'Preferenze salvate con successo'
        });

    } catch (error) {
        logger.error('Impossibile aggiornare le preferenze di notifica', {
            component: 'NotificationPreferenceController',
            action: 'updatePreferences',
            error: 'Errore interno del server',
            personId: req.person?.id
        });

        res.status(500).json({
            success: false,
            error: 'Impossibile aggiornare le preferenze di notifica',
            message: 'Errore interno del server'
        });
    }
};

export default {
    getPreferences,
    updatePreferences
};
