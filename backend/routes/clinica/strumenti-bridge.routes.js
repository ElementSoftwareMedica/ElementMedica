/**
 * Strumenti Bridge Routes
 * Routes for Medical Device Bridge integration
 * 
 * Receives exam results from the local Bridge server and stores them
 * in the EsameStrumentale table linked to the visit.
 * 
 * Base path: /api/v1/clinica/strumenti-bridge
 * 
 * @module routes/clinica/strumenti-bridge
 * @version 1.0.0
 */

import express from 'express';
import crypto from 'crypto';
import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import storageService from '../../services/storageService.js';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { validateParamId } from '../../middleware/validateUUID.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const router = express.Router();
router.param('id', validateParamId);

// Map bridge device types to Prisma enum
const DEVICE_TYPE_MAP = {
    'edan-ecg': 'ECG',
    'mir-spirometer': 'SPIROMETRO',
    'oscilla-audiometer': 'AUDIOMETRO',
    'visiotest': 'VISIOTEST',
    'vision-tester': 'VISIOTEST',
    'generic-visiotest': 'VISIOTEST',
};

// Map exam types to AllegatoVisita tipologiaClinica values
const EXAM_TYPE_TIPOLOGIA_MAP = {
    'ecg': 'ECG',
    'spirometry': 'SPIROMETRIA',
    'spirometria': 'SPIROMETRIA',
    'audiometry': 'AUDIOMETRIA',
    'audiometria': 'AUDIOMETRIA',
    'visiotest': 'VISIOTEST',
    'vision': 'VISIOTEST',
};

// Map exam types to human-readable Italian labels for document names
const EXAM_TYPE_LABEL_MAP = {
    'ecg': 'Elettrocardiogramma (ECG)',
    'spirometry': 'Spirometria',
    'spirometria': 'Spirometria',
    'audiometry': 'Audiometria',
    'audiometria': 'Audiometria',
    'visiotest': 'Visiotest',
    'vision': 'Visiotest',
};

// Normalize exam types to Italian for consistent DB storage
// Bridge sends English ('spirometry'), frontend sends Italian ('spirometria')
const NORMALIZE_EXAM_TYPE = {
    'spirometry': 'spirometria',
    'audiometry': 'audiometria',
    'vision': 'visiotest',
};

const EXAM_VISIT_FIELD_MAP = {
    ecg: { fieldName: 'ecgStrumentario', prestazioneTokens: ['ecg', 'elettrocardiogramma'] },
    spirometria: { fieldName: 'spirometriaStrumentario', prestazioneTokens: ['spiro', 'spirometria'] },
    audiometria: { fieldName: 'audiometriaStrumentario', prestazioneTokens: ['audio', 'audiometria'] },
    visiotest: { fieldName: 'visiotestStrumentario', prestazioneTokens: ['visio', 'visiotest', 'vista'] },
};

function inferEsitoFromResult(normalizedExamType, testResults = [], findings = []) {
    const abnormal = testResults.some(r => ['high', 'low', 'abnormal', 'critical'].includes(String(r.status || '').toLowerCase()))
        || findings.some(f => /alterat|patolog|ridott|ostru|ipoacusia|deficit/i.test(String(f)));
    if (!abnormal) return 'normale';
    if (normalizedExamType === 'spirometria') return 'ostruzione_lieve';
    if (normalizedExamType === 'audiometria') return 'lieve_ipoacusia';
    return 'alterato';
}

async function syncExamWithVisit({ esame, result, normalizedExamType, allegatoVisitaId }) {
    const config = EXAM_VISIT_FIELD_MAP[normalizedExamType];
    if (!config || !esame?.visitaId || !esame?.tenantId || !['COMPLETATO', 'PARZIALE'].includes(esame.stato)) return;

    const visita = await prisma.visita.findFirst({
        where: { id: esame.visitaId, tenantId: esame.tenantId, deletedAt: null },
        select: { id: true, appuntamentoId: true, datiStrutturati: true }
    });
    if (!visita) return;

    const noteParts = [
        ...(Array.isArray(result.findings) ? result.findings : []),
        ...(Array.isArray(result.testResults)
            ? result.testResults.slice(0, 8).map(r => `${r.testName || r.testId}: ${r.value}${r.unit ? ` ${r.unit}` : ''}`)
            : [])
    ].filter(Boolean);

    await prisma.visita.update({
        where: { id: visita.id },
        data: {
            datiStrutturati: {
                ...(visita.datiStrutturati && typeof visita.datiStrutturati === 'object' ? visita.datiStrutturati : {}),
                [config.fieldName]: {
                    esito: inferEsitoFromResult(normalizedExamType, result.testResults || [], result.findings || []),
                    note: noteParts.join(' - '),
                    esameId: esame.id,
                    allegatoVisitaId: allegatoVisitaId || (esame.metadata && typeof esame.metadata === 'object' ? esame.metadata.allegatoVisitaId : null),
                    importedAt: new Date().toISOString(),
                    risultati: result.testResults || [],
                    findings: result.findings || [],
                }
            }
        }
    });

    if (!visita.appuntamentoId) return;
    const appPrestazioni = await prisma.appuntamentoPrestazione.findMany({
        where: {
            appuntamentoId: visita.appuntamentoId,
            tenantId: esame.tenantId,
            deletedAt: null,
            stato: { notIn: ['REFERTATA', 'ANNULLATA'] },
            prestazione: {
                OR: config.prestazioneTokens.flatMap(token => [
                    { codice: { contains: token, mode: 'insensitive' } },
                    { nome: { contains: token, mode: 'insensitive' } },
                ])
            }
        },
        select: { id: true }
    });

    if (appPrestazioni.length > 0) {
        await prisma.appuntamentoPrestazione.updateMany({
            where: { id: { in: appPrestazioni.map(p => p.id) }, tenantId: esame.tenantId, deletedAt: null },
            data: { stato: 'ESEGUITA', dataEsecuzione: esame.dataEsame || new Date() }
        });
    }
}

// ============================================
// BRIDGE CALLBACK - Receives results from Bridge
// ============================================

/**
 * @route POST /strumenti-bridge/risultati
 * @desc Riceve risultati esame strumentale dal Bridge locale
 * @access API Key authentication (Bridge → Backend)
 */
router.post('/risultati',
    // Custom auth for bridge: accepts either JWT or per-license API key
    async (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const apiKey = req.headers['x-bridge-api-key'];

        // Try per-license API key
        if (apiKey) {
            try {
                const license = await prisma.bridgeLicense.findUnique({
                    where: { apiKey },
                });
                if (license && !license.deletedAt && license.status === 'ACTIVE') {
                    // Inject license tenantId for validation
                    req.bridgeLicense = license;
                    logger.info('Bridge callback authenticated via license API key', {
                        component: 'strumenti-bridge',
                        licenseId: license.id,
                        tenantId: license.tenantId,
                        event: req.body?.event,
                    });
                    return next();
                }
            } catch (err) {
                // Fall through to JWT
            }
        }

        // Fall back to JWT auth
        if (authHeader) {
            return authenticate(req, res, next);
        }

        return res.status(401).json({
            success: false,
            error: 'Autenticazione richiesta (JWT o API Key licenza Bridge)'
        });
    },
    async (req, res) => {
        try {
            const { event, result, error: errorPayload, bridge } = req.body;
            const authenticatedTenantId = req.bridgeLicense?.tenantId || getEffectiveTenantId(req);

            logger.info('Bridge callback received', {
                component: 'strumenti-bridge',
                event,
                resultId: result?.resultId,
                bridgeVersion: bridge?.version,
            });

            if (event === 'exam_error') {
                if (!errorPayload?.sessionId || !errorPayload?.tenantId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Payload exam_error non valido: sessionId e tenantId sono obbligatori',
                    });
                }

                if (authenticatedTenantId && errorPayload.tenantId !== authenticatedTenantId) {
                    logger.warn('Bridge callback exam_error blocked by tenant mismatch', {
                        component: 'strumenti-bridge',
                        payloadTenantId: errorPayload.tenantId,
                        authenticatedTenantId,
                        sessionId: errorPayload.sessionId,
                    });
                    return res.status(403).json({
                        success: false,
                        error: 'Tenant mismatch nel callback Bridge',
                    });
                }

                // Handle exam error — update existing session if any
                await prisma.esameStrumentale.updateMany({
                    where: {
                        bridgeSessionId: errorPayload.sessionId,
                        tenantId: errorPayload.tenantId,
                        deletedAt: null,
                    },
                    data: {
                        stato: 'ERRORE',
                        errorMessage: errorPayload.message || 'Errore sconosciuto dal dispositivo',
                        updatedAt: new Date(),
                    }
                });

                return res.json({ success: true, message: 'Errore preso in carico' });
            }

            if (event !== 'exam_completed' || !result) {
                return res.status(400).json({
                    success: false,
                    error: 'Payload non valido: event deve essere "exam_completed" con result',
                });
            }

            // Validate required result fields
            if (!result.deviceType || !result.examType) {
                return res.status(400).json({
                    success: false,
                    error: 'Campi obbligatori mancanti: deviceType, examType',
                });
            }

            if (!result.tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Campo obbligatorio mancante: tenantId',
                });
            }

            // Validate UUID fields if present
            if (result.visitaId && !uuidValidate(result.visitaId)) {
                return res.status(400).json({
                    success: false,
                    error: 'visitaId non valido',
                });
            }
            if (result.tenantId && !uuidValidate(result.tenantId)) {
                return res.status(400).json({
                    success: false,
                    error: 'tenantId non valido',
                });
            }
            if (result.patientId && !uuidValidate(result.patientId)) {
                return res.status(400).json({
                    success: false,
                    error: 'patientId non valido',
                });
            }

            if (authenticatedTenantId && result.tenantId !== authenticatedTenantId) {
                logger.warn('Bridge callback blocked by tenant mismatch', {
                    component: 'strumenti-bridge',
                    payloadTenantId: result.tenantId,
                    authenticatedTenantId,
                    bridgeSessionId: result.bridgeSessionId,
                });
                return res.status(403).json({
                    success: false,
                    error: 'Tenant mismatch nel callback Bridge',
                });
            }

            // Map device type
            const tipoDispositivo = DEVICE_TYPE_MAP[result.deviceType];
            if (!tipoDispositivo) {
                return res.status(400).json({
                    success: false,
                    error: `Tipo dispositivo non supportato: ${result.deviceType}`,
                });
            }

            // Save PDF if present
            let pdfPath = null;
            let pdfFilename = null;
            let pdfBuffer = null;
            if (result.pdfBase64) {
                try {
                    pdfBuffer = Buffer.from(result.pdfBase64, 'base64');
                    pdfFilename = result.pdfFilename || `esame_${result.examType}_${Date.now()}.pdf`;
                    const savedFile = await storageService.saveFileLocal(
                        pdfBuffer,
                        pdfFilename,
                        'esami-strumentali'
                    );
                    pdfPath = savedFile.fileUrl;
                    logger.info('PDF saved', {
                        component: 'strumenti-bridge',
                        path: pdfPath,
                        size: pdfBuffer.length
                    });
                } catch (pdfError) {
                    logger.error('Failed to save PDF', {
                        component: 'strumenti-bridge',
                        error: pdfError.message
                    });
                    pdfBuffer = null;
                }
            }

            // Determine stato
            const stato = result.status === 'completed' ? 'COMPLETATO'
                : result.status === 'partial' ? 'PARZIALE'
                    : result.status === 'error' ? 'ERRORE'
                        : 'COMPLETATO';

            // Check if we have an existing session to update
            let esame = null;
            if (result.bridgeSessionId && result.tenantId) {
                esame = await prisma.esameStrumentale.findFirst({
                    where: {
                        bridgeSessionId: result.bridgeSessionId,
                        tenantId: result.tenantId,
                        deletedAt: null,
                    }
                });
            }

            // Normalize examType to Italian for consistent DB storage
            const normalizedExamType = NORMALIZE_EXAM_TYPE[result.examType] || result.examType;

            if (esame) {
                // Verify tenant match — prevent cross-tenant write via callback
                if (!result.tenantId || esame.tenantId !== result.tenantId) {
                    logger.warn('Bridge callback: cross-tenant write attempt blocked', {
                        component: 'strumenti-bridge',
                        sessionTenantId: esame.tenantId,
                        payloadTenantId: result.tenantId || 'missing',
                        bridgeSessionId: result.bridgeSessionId,
                        esameId: esame.id,
                    });
                    return res.status(403).json({
                        success: false,
                        error: 'Tenant mismatch: il risultato non appartiene alla sessione',
                    });
                }

                // Update existing record
                esame = await prisma.esameStrumentale.update({
                    where: { id: esame.id },
                    data: {
                        stato,
                        tipoEsame: normalizedExamType,
                        dataEsame: result.examDate ? new Date(result.examDate) : new Date(),
                        risultati: result.testResults || [],
                        findings: result.findings || [],
                        gdtRaw: result.gdtData || null,
                        pdfPath,
                        pdfFilename,
                        errorMessage: result.errorMessage || null,
                        metadata: {
                            ...(esame.metadata && typeof esame.metadata === 'object' ? esame.metadata : {}),
                            ...(result.metadata || {}),
                        },
                        updatedAt: new Date(),
                    }
                });
            } else {
                // Create new record — need visitaId and tenantId from result
                if (!result.visitaId || !result.tenantId) {
                    return res.status(400).json({
                        success: false,
                        error: 'visitaId e tenantId sono obbligatori quando non esiste una sessione Bridge',
                    });
                }

                // Verify the visita exists and belongs to the claimed tenant (prevent cross-tenant write)
                const visita = await prisma.visita.findFirst({
                    where: {
                        id: result.visitaId,
                        tenantId: result.tenantId,
                        deletedAt: null,
                    },
                    select: { id: true, medicoId: true, tenantId: true },
                });

                if (!visita) {
                    logger.warn('Bridge callback: visita not found or tenant mismatch', {
                        component: 'strumenti-bridge',
                        visitaId: result.visitaId,
                        tenantId: result.tenantId,
                    });
                    return res.status(404).json({
                        success: false,
                        error: 'Visita non trovata o non appartenente al tenant specificato',
                    });
                }

                esame = await prisma.esameStrumentale.create({
                    data: {
                        id: uuidv4(),
                        visitaId: result.visitaId,
                        pazienteId: result.patientId,
                        medicoId: visita.medicoId, // Use visita's medico — guaranteed non-null
                        tipoDispositivo,
                        tipoEsame: normalizedExamType,
                        stato,
                        bridgeSessionId: result.bridgeSessionId || null,
                        dataEsame: result.examDate ? new Date(result.examDate) : new Date(),
                        risultati: result.testResults || [],
                        findings: result.findings || [],
                        gdtRaw: result.gdtData || null,
                        pdfPath,
                        pdfFilename,
                        errorMessage: result.errorMessage || null,
                        metadata: result.metadata || {},
                        tenantId: visita.tenantId, // Use verified tenant
                    }
                });
            }

            logger.info('Esame strumentale saved', {
                component: 'strumenti-bridge',
                esameId: esame.id,
                stato,
                tipoDispositivo,
                examType: result.examType,
                visitaId: result.visitaId,
                hasPdf: !!pdfPath,
            });

            // ============================================
            // AUTO-LINK PDF TO VISIT DOCUMENTS (AllegatoVisita)
            // Creates a document record so the PDF appears in the visit's documents section
            // ============================================
            let allegatoVisitaId = null;
            // Skip if an AllegatoVisita was already linked (e.g. re-processed file)
            const existingAllegatoId = esame.metadata && typeof esame.metadata === 'object'
                ? (esame.metadata).allegatoVisitaId
                : null;
            if (pdfPath && pdfBuffer && stato === 'COMPLETATO' && esame.visitaId && !existingAllegatoId) {
                try {
                    const tipologiaClinica = EXAM_TYPE_TIPOLOGIA_MAP[result.examType] || 'ALTRO';
                    const examLabel = EXAM_TYPE_LABEL_MAP[result.examType] || result.examType;
                    const dataEsame = result.examDate ? new Date(result.examDate) : new Date();
                    const dataFormatted = dataEsame.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const documentName = `${examLabel} - ${dataFormatted}`;

                    // Calculate hash for integrity
                    const fileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

                    const allegato = await prisma.allegatoVisita.create({
                        data: {
                            visitaId: esame.visitaId,
                            tipo: 'document',
                            nome: documentName,
                            descrizione: `Referto ${examLabel} acquisito automaticamente dal dispositivo medico`,
                            tipologiaClinica,
                            dataEsecuzione: dataEsame,
                            fileName: pdfFilename,
                            fileUrl: pdfPath,
                            fileSize: pdfBuffer.length,
                            mimeType: 'application/pdf',
                            hashFile: fileHash,
                            caricatoDa: esame.medicoId,
                            tenantId: esame.tenantId,
                        }
                    });

                    allegatoVisitaId = allegato.id;

                    // Update esame metadata with the linked document ID
                    await prisma.esameStrumentale.update({
                        where: { id: esame.id },
                        data: {
                            metadata: {
                                ...(esame.metadata || {}),
                                allegatoVisitaId: allegato.id,
                            }
                        }
                    });

                    logger.info('PDF auto-linked to visit documents', {
                        component: 'strumenti-bridge',
                        esameId: esame.id,
                        allegatoVisitaId: allegato.id,
                        visitaId: esame.visitaId,
                        tipologiaClinica,
                        documentName,
                    });
                } catch (allegatoError) {
                    // Non-fatal: the exam result is saved, but the document link failed
                    logger.error('Failed to auto-link PDF to visit documents', {
                        component: 'strumenti-bridge',
                        esameId: esame.id,
                        visitaId: esame.visitaId,
                        error: allegatoError.message,
                    });
                }
            }

            try {
                await syncExamWithVisit({
                    esame,
                    result,
                    normalizedExamType,
                    allegatoVisitaId,
                });
            } catch (syncError) {
                logger.error('Failed to sync device exam with visit fields', {
                    component: 'strumenti-bridge',
                    esameId: esame.id,
                    visitaId: esame.visitaId,
                    error: syncError.message,
                });
            }

            res.status(200).json({
                success: true,
                data: {
                    id: esame.id,
                    stato: esame.stato,
                    allegatoVisitaId,
                    message: 'Risultato esame strumentale salvato con successo',
                }
            });
        } catch (error) {
            logger.error('Bridge callback error', {
                component: 'strumenti-bridge',
                error: 'Operazione non riuscita',
                stack: error.stack,
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel salvataggio del risultato',
            });
        }
    }
);

// ============================================
// START EXAM - Registers a pending exam from webapp
// ============================================

/**
 * @route POST /strumenti-bridge/avvia-esame
 * @desc Crea un record EsameStrumentale in stato IN_ATTESA prima di inviare la richiesta al Bridge
 * @access Authenticated (medico)
 */
router.post('/avvia-esame',
    authenticate,
    requirePermission('visite:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { visitaId, pazienteId, tipoEsame, bridgeSessionId } = req.body;

            if (!visitaId || !pazienteId || !tipoEsame) {
                return res.status(400).json({
                    success: false,
                    error: 'visitaId, pazienteId e tipoEsame sono obbligatori',
                });
            }

            const tipoDispositivoMap = {
                'ecg': 'ECG',
                'spirometria': 'SPIROMETRO',
                'spirometry': 'SPIROMETRO',
                'audiometria': 'AUDIOMETRO',
                'audiometry': 'AUDIOMETRO',
            };

            const tipoDispositivo = tipoDispositivoMap[tipoEsame];
            if (!tipoDispositivo) {
                return res.status(400).json({
                    success: false,
                    error: `Tipo esame non supportato: ${tipoEsame}`,
                });
            }

            // Verify visita exists and belongs to tenant
            const visita = await prisma.visita.findFirst({
                where: {
                    id: visitaId,
                    tenantId,
                    deletedAt: null,
                }
            });

            if (!visita) {
                return res.status(404).json({
                    success: false,
                    error: 'Visita non trovata',
                });
            }

            const esame = await prisma.esameStrumentale.create({
                data: {
                    id: uuidv4(),
                    visitaId,
                    pazienteId,
                    medicoId: req.person?.id || visita.medicoId,
                    tipoDispositivo,
                    tipoEsame,
                    stato: 'IN_ATTESA',
                    bridgeSessionId: bridgeSessionId || null,
                    tenantId,
                }
            });

            logger.info('Esame strumentale created (waiting)', {
                component: 'strumenti-bridge',
                esameId: esame.id,
                visitaId,
                tipoEsame,
                bridgeSessionId,
            });

            res.status(201).json({
                success: true,
                data: esame,
            });
        } catch (error) {
            logger.error('Failed to create esame strumentale', {
                component: 'strumenti-bridge',
                error: 'Operazione non riuscita',
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella creazione dell\'esame strumentale',
            });
        }
    }
);

// ============================================
// GET EXAMS FOR VISIT
// ============================================

/**
 * @route GET /strumenti-bridge/visita/:visitaId
 * @desc Lista esami strumentali per una visita
 * @access Authenticated
 */
router.get('/visita/:visitaId',
    authenticate,
    requirePermission('visite:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { visitaId } = req.params;

            const esami = await prisma.esameStrumentale.findMany({
                where: {
                    visitaId,
                    tenantId,
                    deletedAt: null,
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    tipoDispositivo: true,
                    tipoEsame: true,
                    stato: true,
                    dataEsame: true,
                    risultati: true,
                    findings: true,
                    pdfPath: true,
                    pdfFilename: true,
                    errorMessage: true,
                    bridgeSessionId: true,
                    metadata: true,
                    createdAt: true,
                    medico: {
                        select: { id: true, firstName: true, lastName: true, gender: true }
                    },
                    paziente: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                }
            });

            res.json({ success: true, data: esami });
        } catch (error) {
            logger.error('Failed to get esami strumentali', {
                component: 'strumenti-bridge',
                error: 'Operazione non riuscita',
                visitaId: req.params.visitaId,
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero degli esami strumentali',
            });
        }
    }
);

// ============================================
// BRIDGE STATUS CHECK (Proxy)
// ============================================
// NOTE: Must be defined BEFORE /:id to avoid Express matching "bridge" as :id param

/**
 * @route GET /strumenti-bridge/bridge/status
 * @desc Verifica stato del Bridge locale (proxy)
 * @access Authenticated
 */
router.get('/bridge/status',
    authenticate,
    async (req, res) => {
        try {
            // Try to reach the local bridge
            const bridgeUrl = process.env.BRIDGE_URL || 'http://localhost:3000';
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${bridgeUrl}/status`, {
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (response.ok) {
                const bridgeStatus = await response.json();
                return res.json({
                    success: true,
                    data: {
                        bridgeConnected: true,
                        ...bridgeStatus,
                    }
                });
            }

            res.json({
                success: true,
                data: {
                    bridgeConnected: false,
                    message: 'Bridge raggiungibile ma ha risposto con errore',
                }
            });
        } catch (error) {
            // Bridge not reachable
            res.json({
                success: true,
                data: {
                    bridgeConnected: false,
                    message: 'Bridge locale non raggiungibile. Assicurarsi che il Medical Device Bridge sia in esecuzione.',
                }
            });
        }
    }
);

// ============================================
// GENERATE API KEY
// ============================================

/**
 * @route POST /strumenti-bridge/generate-api-key
 * @desc Genera una nuova API Key per il Bridge (mostra all'utente, salva in BRIDGE_API_KEY)
 * @access Authenticated (admin)
 */
router.post('/generate-api-key',
    authenticate,
    requirePermission('settings:write'),
    async (req, res) => {
        try {
            // Generate a secure random API key
            const apiKey = crypto.randomBytes(32).toString('hex');

            logger.info('Bridge API key generated', {
                component: 'strumenti-bridge',
                personId: req.person?.id,
                tenantId: req.person?.tenantId,
            });

            res.json({
                success: true,
                data: {
                    apiKey,
                    instructions: 'Copiare questa chiave API nelle impostazioni del Bridge locale e nel file .env del Bridge come WEBAPP_API_KEY. Conservare la chiave in un luogo sicuro: non sarà possibile recuperarla.',
                }
            });
        } catch (error) {
            logger.error('Failed to generate Bridge API key', {
                component: 'strumenti-bridge',
                error: 'Operazione non riuscita',
            });

            res.status(500).json({
                success: false,
                error: 'Errore nella generazione della chiave API',
            });
        }
    }
);

// ============================================
// DOWNLOAD INSTALLER — DEPRECATO
// Il Medical Device Bridge è ora integrato nell'App Desktop ElementMedica.
// Questa route restituisce 410 Gone con istruzioni per scaricare l'app desktop.
// NOTE: Must be defined BEFORE /:id to avoid Express matching "download-installer" as :id param
// ============================================

/**
 * @route GET /strumenti-bridge/download-installer
 * @desc DEPRECATO — Il Bridge è ora integrato nell'App Desktop ElementMedica.
 * @access Authenticated (visite:read)
 */
router.get('/download-installer',
    authenticate,
    requirePermission('visite:read'),
    async (req, res) => {
        return res.status(410).json({
            success: false,
            error: 'Il Medical Device Bridge non è più disponibile come applicazione separata. È integrato nell\'App Desktop ElementMedica. Scarica l\'App Desktop dalle Impostazioni Desktop.',
            desktopSettingsUrl: '/poliambulatorio/impostazioni/desktop',
        });
    }
);

// LEGACY HANDLER (keeping route structure for backward compat, actual logic above)
router.get('/download-installer-legacy',
    authenticate,
    requirePermission('visite:read'),
    async (req, res) => {
        try {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const installerDir = path.resolve(__dirname, '../../../medical-device-bridge/installer');
            const bridgeDistDir = path.resolve(__dirname, '../../../medical-device-bridge/dist');
            const prebuiltZipPath = path.join(bridgeDistDir, 'ElementMedica-Bridge-Setup.zip');
            const installerBatPath = path.join(installerDir, 'install.bat');
            const exePath = path.join(bridgeDistDir, 'medical-bridge-win.exe');

            // Serve prebuilt package first: more reliable for production proxies/transports.
            if (fs.existsSync(prebuiltZipPath)) {
                const zipStat = fs.statSync(prebuiltZipPath);
                const installerBatStat = fs.existsSync(installerBatPath) ? fs.statSync(installerBatPath) : null;
                const exeStat = fs.existsSync(exePath) ? fs.statSync(exePath) : null;

                const isPrebuiltStale = Boolean(
                    (installerBatStat && zipStat.mtimeMs < installerBatStat.mtimeMs) ||
                    (exeStat && zipStat.mtimeMs < exeStat.mtimeMs)
                );

                if (!isPrebuiltStale) {
                    const filename = 'ElementMedica-Bridge-Setup.zip';

                    res.setHeader('Content-Type', 'application/zip');
                    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                    res.setHeader('Content-Length', zipStat.size);
                    res.setHeader('Cache-Control', 'private, no-store');

                    const stream = fs.createReadStream(prebuiltZipPath);
                    stream.on('error', (streamError) => {
                        logger.error('Failed to read prebuilt installer package', {
                            component: 'strumenti-bridge',
                            error: 'Operazione non riuscita',
                            path: prebuiltZipPath,
                            streamError: streamError.message,
                        });
                        if (!res.headersSent) {
                            res.status(500).json({
                                success: false,
                                error: 'Errore nel download del pacchetto di installazione',
                            });
                        } else {
                            res.destroy(streamError);
                        }
                    });

                    stream.pipe(res);

                    logger.info('Installer package downloaded (prebuilt)', {
                        component: 'strumenti-bridge',
                        personId: req.person?.id,
                        packagePath: prebuiltZipPath,
                    });
                    return;
                }

                logger.warn('Prebuilt installer package is stale, using on-the-fly ZIP', {
                    component: 'strumenti-bridge',
                    prebuiltZipPath,
                    zipMtime: zipStat.mtime.toISOString(),
                    installerBatMtime: installerBatStat ? installerBatStat.mtime.toISOString() : null,
                    exeMtime: exeStat ? exeStat.mtime.toISOString() : null,
                });
            }

            // Verify installer directory exists
            if (!fs.existsSync(installerDir)) {
                logger.error('Installer directory not found', {
                    component: 'strumenti-bridge',
                    path: installerDir,
                });
                return res.status(404).json({
                    success: false,
                    error: 'Pacchetto di installazione non disponibile',
                });
            }

            // Fallback: create ZIP on-the-fly when prebuilt package is unavailable or stale.

            // Required files for the installer package
            const requiredFiles = ['install.bat', 'GUIDA-INSTALLAZIONE.txt'];
            const missingFiles = requiredFiles.filter(f => !fs.existsSync(path.join(installerDir, f)));

            if (missingFiles.length > 0) {
                logger.error('Missing installer files', {
                    component: 'strumenti-bridge',
                    missingFiles,
                });
                return res.status(500).json({
                    success: false,
                    error: 'Pacchetto di installazione incompleto',
                });
            }

            if (!fs.existsSync(exePath)) {
                logger.error('Bridge executable not found', {
                    component: 'strumenti-bridge',
                    path: exePath,
                });
                return res.status(500).json({
                    success: false,
                    error: 'Eseguibile Bridge non disponibile. Contattare il supporto.',
                });
            }

            // Set response headers for ZIP download
            const filename = 'ElementMedica-Bridge-Installer.zip';
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            // Create ZIP archive on-the-fly
            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.on('warning', (warning) => {
                logger.warn('Archiver warning', {
                    component: 'strumenti-bridge',
                    warning: warning.message,
                });
            });

            archive.on('error', (err) => {
                logger.error('Archiver error', {
                    component: 'strumenti-bridge',
                    error: 'Operazione non riuscita',
                    details: err.message,
                });
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Errore nella creazione del pacchetto di installazione',
                    });
                }
            });

            archive.pipe(res);

            // Add all installer files including the executable
            archive.file(path.join(installerDir, 'install.bat'), { name: 'install.bat' });
            archive.file(path.join(installerDir, 'GUIDA-INSTALLAZIONE.txt'), { name: 'GUIDA-INSTALLAZIONE.txt' });
            archive.file(exePath, { name: 'medical-bridge-win.exe' });

            await archive.finalize();

            logger.info('Installer package downloaded', {
                component: 'strumenti-bridge',
                personId: req.person?.id,
            });
        } catch (error) {
            logger.error('Failed to serve installer package', {
                component: 'strumenti-bridge',
                error: 'Operazione non riuscita',
            });

            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: 'Errore nel download del pacchetto di installazione',
                });
            }
        }
    }
);

// ============================================
// BRIDGE LICENSE MANAGEMENT
// NOTE: Must be defined BEFORE /:id to avoid Express matching "licenses" as :id param
// ============================================

/**
 * Generate a human-readable license key (ELEM-XXXX-XXXX-XXXX)
 * Uses unambiguous characters (no 0/O, 1/I/L)
 */
function generateLicenseKey() {
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    const segments = [];
    for (let s = 0; s < 3; s++) {
        let segment = '';
        const bytes = crypto.randomBytes(4);
        for (let i = 0; i < 4; i++) {
            segment += chars[bytes[i] % chars.length];
        }
        segments.push(segment);
    }
    return `ELEM-${segments.join('-')}`;
}

/**
 * @route GET /strumenti-bridge/licenses
 * @desc Lista licenze Bridge per il tenant corrente
 * @access Authenticated (admin)
 */
router.get('/licenses',
    authenticate,
    requirePermission('settings:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);

            const licenses = await prisma.bridgeLicense.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    licenseKey: true,
                    label: true,
                    status: true,
                    machineId: true,
                    machineName: true,
                    bridgeVersion: true,
                    deviceConfig: true,
                    activatedAt: true,
                    lastSeenAt: true,
                    createdAt: true,
                }
            });

            res.json({ success: true, data: licenses });
        } catch (error) {
            logger.error('Failed to list bridge licenses', {
                component: 'strumenti-bridge',
                error: 'Operazione non riuscita',
            });
            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle licenze',
            });
        }
    }
);

/**
 * @route POST /strumenti-bridge/licenses
 * @desc Crea una nuova licenza Bridge
 * @access Authenticated (admin)
 */
router.post('/licenses',
    authenticate,
    requirePermission('settings:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { label } = req.body;

            if (!label || typeof label !== 'string' || label.trim().length < 3) {
                return res.status(400).json({
                    success: false,
                    error: 'label è obbligatorio (min 3 caratteri). Es: "Ambulatorio 1 - PC Reception"',
                });
            }

            // Check license limit from TenantFeature
            const bridgeFeature = await prisma.tenantFeature.findUnique({
                where: {
                    tenantId_featureKey: {
                        tenantId,
                        featureKey: 'MEDICAL_DEVICE_BRIDGE',
                    }
                }
            });

            if (!bridgeFeature || !bridgeFeature.isEnabled) {
                return res.status(403).json({
                    success: false,
                    error: 'La funzionalità Medical Device Bridge non è abilitata per questo tenant',
                });
            }

            // Check usage limit
            if (bridgeFeature.usageLimit) {
                const activeCount = await prisma.bridgeLicense.count({
                    where: {
                        tenantId,
                        deletedAt: null,
                    }
                });
                if (activeCount >= bridgeFeature.usageLimit) {
                    return res.status(403).json({
                        success: false,
                        error: `Raggiunto il limite massimo di licenze (${bridgeFeature.usageLimit}). Contattare il supporto per aumentare il limite.`,
                    });
                }
            }

            // Generate unique license key (retry on collision)
            let licenseKey;
            for (let attempt = 0; attempt < 5; attempt++) {
                licenseKey = generateLicenseKey();
                const exists = await prisma.bridgeLicense.findUnique({
                    where: { licenseKey }
                });
                if (!exists) break;
                if (attempt === 4) {
                    return res.status(500).json({
                        success: false,
                        error: 'Errore nella generazione del codice licenza, riprovare',
                    });
                }
            }

            const license = await prisma.bridgeLicense.create({
                data: {
                    id: uuidv4(),
                    tenantId,
                    licenseKey,
                    label: label.trim(),
                    status: 'PENDING',
                    createdBy: req.person?.id,
                },
                select: {
                    id: true,
                    licenseKey: true,
                    label: true,
                    status: true,
                    createdAt: true,
                }
            });

            // Update usage count
            await prisma.tenantFeature.update({
                where: { id: bridgeFeature.id },
                data: {
                    usageCount: { increment: 1 },
                    lastUsedAt: new Date(),
                }
            });

            logger.info('Bridge license created', {
                component: 'strumenti-bridge',
                licenseId: license.id,
                tenantId,
                createdBy: req.person?.id,
            });

            res.status(201).json({
                success: true,
                data: license,
            });
        } catch (error) {
            logger.error('Failed to create bridge license', {
                component: 'strumenti-bridge',
                error: 'Operazione non riuscita',
            });
            res.status(500).json({
                success: false,
                error: 'Errore nella creazione della licenza',
            });
        }
    }
);

/**
 * @route PUT /strumenti-bridge/licenses/:id
 * @desc Aggiorna etichetta o configurazione dispositivi di una licenza
 * @access Authenticated (admin)
 */
router.put('/licenses/:id',
    authenticate,
    requirePermission('settings:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { label, deviceConfig } = req.body;

            const license = await prisma.bridgeLicense.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!license) {
                return res.status(404).json({
                    success: false,
                    error: 'Licenza non trovata',
                });
            }

            const updateData = {};
            if (label && typeof label === 'string' && label.trim().length >= 3) {
                updateData.label = label.trim();
            }
            if (deviceConfig !== undefined) {
                updateData.deviceConfig = deviceConfig;
            }

            const updated = await prisma.bridgeLicense.update({
                where: { id },
                data: updateData,
                select: {
                    id: true,
                    licenseKey: true,
                    label: true,
                    status: true,
                    deviceConfig: true,
                    machineName: true,
                    lastSeenAt: true,
                }
            });

            res.json({ success: true, data: updated });
        } catch (error) {
            logger.error('Failed to update bridge license', {
                component: 'strumenti-bridge',
                error: 'Operazione non riuscita',
            });
            res.status(500).json({
                success: false,
                error: 'Errore nell\'aggiornamento della licenza',
            });
        }
    }
);

/**
 * @route DELETE /strumenti-bridge/licenses/:id
 * @desc Revoca una licenza Bridge (soft delete)
 * @access Authenticated (admin)
 */
router.delete('/licenses/:id',
    authenticate,
    requirePermission('settings:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const license = await prisma.bridgeLicense.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!license) {
                return res.status(404).json({
                    success: false,
                    error: 'Licenza non trovata',
                });
            }

            await prisma.bridgeLicense.update({
                where: { id },
                data: {
                    status: 'REVOKED',
                    deletedAt: new Date(),
                }
            });

            logger.info('Bridge license revoked', {
                component: 'strumenti-bridge',
                licenseId: id,
                tenantId,
                revokedBy: req.person?.id,
            });

            res.json({
                success: true,
                message: 'Licenza revocata',
            });
        } catch (error) {
            logger.error('Failed to revoke bridge license', {
                component: 'strumenti-bridge',
                error: 'Operazione non riuscita',
            });
            res.status(500).json({
                success: false,
                error: 'Errore nella revoca della licenza',
            });
        }
    }
);

// ============================================
// GET SINGLE EXAM
// ============================================

/**
 * @route GET /strumenti-bridge/:id
 * @desc Dettaglio singolo esame strumentale
 * @access Authenticated
 */
router.get('/:id',
    authenticate,
    requirePermission('visite:read'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;

            const esame = await prisma.esameStrumentale.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null,
                },
                include: {
                    medico: {
                        select: { id: true, firstName: true, lastName: true, gender: true }
                    },
                    paziente: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                }
            });

            if (!esame) {
                return res.status(404).json({
                    success: false,
                    error: 'Esame strumentale non trovato',
                });
            }

            res.json({ success: true, data: esame });
        } catch (error) {
            logger.error('Failed to get esame strumentale', {
                component: 'strumenti-bridge',
                error: 'Operazione non riuscita',
                esameId: req.params.id,
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dell\'esame strumentale',
            });
        }
    }
);

// ============================================
// DELETE EXAM (soft delete + GDPR audit)
// ============================================

/**
 * @route DELETE /strumenti-bridge/:id
 * @desc Elimina (soft) un esame strumentale con audit GDPR
 * @access Authenticated
 */
router.delete('/:id',
    authenticate,
    requirePermission('visite:write'),
    async (req, res) => {
        try {
            const tenantId = getEffectiveTenantId(req);
            const { id } = req.params;
            const { deletionReason } = req.body;

            // Validate deletionReason (GDPR compliance)
            if (!deletionReason || typeof deletionReason !== 'string' || deletionReason.trim().length < 10) {
                return res.status(400).json({
                    success: false,
                    error: 'deletionReason è obbligatorio e deve contenere almeno 10 caratteri',
                });
            }

            const esame = await prisma.esameStrumentale.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null,
                }
            });

            if (!esame) {
                return res.status(404).json({
                    success: false,
                    error: 'Esame strumentale non trovato',
                });
            }

            // Transaction: soft delete + GDPR audit log
            await prisma.$transaction(async (tx) => {
                await tx.esameStrumentale.update({
                    where: { id },
                    data: { deletedAt: new Date() }
                });

                await tx.gdprAuditLog.create({
                    data: {
                        action: 'DELETE',
                        resourceType: 'ESAME_STRUMENTALE',
                        resourceId: id,
                        dataAccessed: {
                            tipoEsame: esame.tipoEsame,
                            tipoDispositivo: esame.tipoDispositivo,
                            pazienteId: esame.pazienteId,
                            visitaId: esame.visitaId,
                            deletionReason: deletionReason.trim(),
                        },
                        personId: req.person?.id,
                        ipAddress: req.ip || req.socket?.remoteAddress,
                        tenantId,
                    }
                });
            });

            logger.info('Esame strumentale soft-deleted', {
                component: 'strumenti-bridge',
                esameId: id,
                tenantId,
                deletionReason: deletionReason.trim(),
            });

            res.json({
                success: true,
                message: 'Esame strumentale eliminato',
            });
        } catch (error) {
            logger.error('Failed to delete esame strumentale', {
                component: 'strumenti-bridge',
                error: 'Operazione non riuscita',
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione dell\'esame strumentale',
            });
        }
    }
);

export default router;
