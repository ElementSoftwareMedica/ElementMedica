/**
 * Public Verify Routes
 * Endpoint pubblici per la verifica di attestati tramite QR code
 * NO AUTHENTICATION REQUIRED
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/public/verify-attestato/:attestatoNumber
 * Verifica un attestato tramite il numero identificativo
 * 
 * @param {string} attestatoNumber - Numero attestato (es: ATT/2024/000001)
 * @returns {object} Dati attestato se valido
 */
router.get('/verify-attestato/:attestatoNumber', async (req, res) => {
    try {
        const { attestatoNumber } = req.params;

        if (!attestatoNumber) {
            return res.status(400).json({
                success: false,
                error: 'Numero attestato non fornito'
            });
        }

        // Decodifica il numero attestato
        const decodedNumber = decodeURIComponent(attestatoNumber);
        logger.info({ attestatoNumber: decodedNumber }, 'Verifica attestato richiesta');

        // Cerca l'attestato nel database
        // Pattern: ATT/YYYY/NNNNNN -> cerca per numeroProgressivo e anno
        const match = decodedNumber.match(/^ATT\/(\d{4})\/(\d+)$/);

        if (!match) {
            logger.warn({ attestatoNumber: decodedNumber }, 'Formato numero attestato non valido');
            return res.status(400).json({
                success: false,
                error: 'Formato numero attestato non valido. Formato atteso: ATT/YYYY/NNNNNN'
            });
        }

        const year = parseInt(match[1]);
        const numeroProgressivo = parseInt(match[2]);

        // Cerca l'attestato
        // NOTE: Attestato schema uses generatedAt (not issueDate) and scheduledCourse (not course)
        const attestato = await prisma.attestato.findFirst({
            where: {
                numeroProgressivo,
                annoProgressivo: year, // Use annoProgressivo for year filtering
                deletedAt: null
            },
            include: {
                person: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        // NO email/fiscalCode per privacy
                    }
                },
                scheduledCourse: {
                    select: {
                        id: true,
                        endDate: true, // Fallback if no sessions
                        sessions: {
                            select: {
                                date: true,
                            },
                            orderBy: {
                                date: 'desc'
                            },
                            take: 1
                        },
                        course: {
                            select: {
                                id: true,
                                title: true,
                                riskLevel: true,
                                courseType: true,
                                validityYears: true
                            }
                        }
                    }
                },
                tenant: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        if (!attestato) {
            logger.info({ attestatoNumber: decodedNumber }, 'Attestato non trovato');
            return res.status(404).json({
                success: false,
                error: 'Attestato non trovato'
            });
        }

        // Calcola validità
        // Use the last session date as the issue date (when the certificate was actually earned)
        // Fallback to scheduledCourse.endDate, then generatedAt
        const now = new Date();
        const lastSession = attestato.scheduledCourse?.sessions?.[0];
        const issueDate = lastSession?.date
            ? new Date(lastSession.date)
            : attestato.scheduledCourse?.endDate
                ? new Date(attestato.scheduledCourse.endDate)
                : new Date(attestato.generatedAt);

        const course = attestato.scheduledCourse?.course;
        const validityYears = course?.validityYears || 5;
        const expirationDate = new Date(issueDate);
        expirationDate.setFullYear(expirationDate.getFullYear() + validityYears);

        const isExpired = now > expirationDate;
        const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Log della verifica (per audit)
        logger.info({
            attestatoNumber: decodedNumber,
            personId: attestato.person?.id,
            courseId: course?.id,
            isExpired,
            verifiedAt: now.toISOString(),
            ipAddress: req.ip
        }, 'Attestato verificato con successo');

        // Risposta con dati pubblici
        // Organization name: Use "Element Formazione" as the official issuer name
        return res.json({
            success: true,
            data: {
                isValid: !isExpired,
                attestatoNumber: decodedNumber,
                participant: {
                    firstName: attestato.person?.firstName || 'N/D',
                    lastName: attestato.person?.lastName || 'N/D',
                },
                course: {
                    title: course?.title || 'Corso non specificato',
                    riskLevel: course?.riskLevel || 'MEDIUM',
                    courseType: course?.courseType || 'INITIAL',
                },
                validity: {
                    issueDate: issueDate.toISOString(),
                    expirationDate: expirationDate.toISOString(),
                    validityYears,
                    isExpired,
                    daysRemaining: isExpired ? 0 : daysRemaining,
                },
                organization: {
                    name: 'Element Formazione', // Fixed issuer name
                }
            }
        });

    } catch (error) {
        logger.error({ error: error.message, stack: error.stack }, 'Errore durante verifica attestato');
        return res.status(500).json({
            success: false,
            error: 'Errore durante la verifica dell\'attestato'
        });
    }
});

/**
 * GET /api/public/verify-attestato/check/:attestatoNumber
 * Verifica rapida se un attestato esiste (senza dettagli)
 */
router.get('/verify-attestato/check/:attestatoNumber', async (req, res) => {
    try {
        const { attestatoNumber } = req.params;
        const decodedNumber = decodeURIComponent(attestatoNumber);

        const match = decodedNumber.match(/^ATT\/(\d{4})\/(\d+)$/);
        if (!match) {
            return res.json({ exists: false, valid: false });
        }

        const year = parseInt(match[1]);
        const numeroProgressivo = parseInt(match[2]);

        // Use annoProgressivo for year filtering, generatedAt for validity
        const attestato = await prisma.attestato.findFirst({
            where: {
                numeroProgressivo,
                annoProgressivo: year,
                deletedAt: null
            },
            select: {
                id: true,
                generatedAt: true, // Use generatedAt not issueDate
                scheduledCourse: {
                    select: {
                        course: {
                            select: {
                                validityYears: true
                            }
                        }
                    }
                }
            }
        });

        if (!attestato) {
            return res.json({ exists: false, valid: false });
        }

        const issueDate = new Date(attestato.generatedAt);
        const validityYears = attestato.scheduledCourse?.course?.validityYears || 5;
        const expirationDate = new Date(issueDate);
        expirationDate.setFullYear(expirationDate.getFullYear() + validityYears);
        const isValid = new Date() <= expirationDate;

        return res.json({ exists: true, valid: isValid });

    } catch (error) {
        logger.error({ error: error.message }, 'Errore check rapido attestato');
        return res.json({ exists: false, valid: false });
    }
});

export default router;
