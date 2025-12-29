/**
 * @fileoverview Service per la gestione dei Documenti Clinici
 * Gestisce upload, download e storage di allegati visite e referti
 * 
 * @module services/clinical/DocumentoClinicoService
 * @requires @prisma/client
 * @requires ../../utils/logger
 * @requires crypto
 * @requires path
 * @requires fs/promises
 * 
 * @description
 * Questo service implementa:
 * - Upload allegati visite (AllegatoVisita)
 * - Upload allegati referti (AllegatoReferto)
 * - Download con audit trail
 * - Validazione mime types
 * - Calcolo hash integrità
 * - Soft delete documenti
 * - Integrazione S3/GCS (predisposto)
 * 
 * @gdpr
 * - Audit trail obbligatorio per download
 * - Soft delete per documenti clinici
 * - Hash SHA-256 per integrità
 * - Multi-tenancy obbligatoria
 * 
 * @security
 * - Validazione mime type server-side
 * - Limite dimensione file
 * - Path traversal protection
 * - No PII in filename storage
 * 
 * @author ElementMedica Team
 * @version 1.0.0
 * @since 2025-01-31
 */

import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

/**
 * Configurazione storage
 * @constant {Object}
 */
const STORAGE_CONFIG = {
    // Local storage (development)
    LOCAL_BASE_PATH: process.env.UPLOADS_PATH || './uploads/clinical',

    // S3/GCS configuration (production)
    S3_BUCKET: process.env.S3_BUCKET_CLINICAL || null,
    S3_REGION: process.env.S3_REGION || 'eu-west-1',
    GCS_BUCKET: process.env.GCS_BUCKET_CLINICAL || null,

    // Limits
    MAX_FILE_SIZE: parseInt(process.env.MAX_CLINICAL_FILE_SIZE) || 50 * 1024 * 1024, // 50MB

    // Tipi di storage
    STORAGE_TYPE: process.env.CLINICAL_STORAGE_TYPE || 'local' // 'local', 's3', 'gcs'
};

/**
 * MIME types consentiti per tipo allegato
 * @constant {Object}
 */
const ALLOWED_MIME_TYPES = {
    // Documenti
    document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.oasis.opendocument.text',
        'text/plain'
    ],
    // Immagini
    image: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/tiff'
    ],
    // DICOM (imaging medicale)
    dicom: [
        'application/dicom',
        'application/octet-stream' // DICOM spesso viene caricato così
    ],
    // Risultati laboratorio
    lab_result: [
        'application/pdf',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    // ECG e altri tracciati
    trace: [
        'application/pdf',
        'image/jpeg',
        'image/png'
    ],
    // Generico
    other: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/octet-stream'
    ]
};

/**
 * Service per la gestione dei Documenti Clinici
 */
const DocumentoClinicoService = {
    /**
     * Upload allegato visita
     * @param {Object} data - Dati allegato
     * @param {string} data.visitaId - ID visita
     * @param {string} data.tipo - Tipo allegato (image, document, lab_result, etc.)
     * @param {string} data.nome - Nome file originale
     * @param {string} [data.descrizione] - Descrizione
     * @param {Buffer} data.buffer - Contenuto file
     * @param {string} data.mimeType - MIME type
     * @param {string} tenantId - ID tenant
     * @param {string} userId - ID utente che carica
     * @returns {Promise<Object>} Allegato creato
     */
    async uploadAllegatoVisita(data, tenantId, userId) {
        try {
            // Valida input
            const validation = await this._validateUpload(data, tenantId, 'visita');
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Verifica che la visita esista e appartenga al tenant
            const visita = await prisma.visita.findFirst({
                where: {
                    id: data.visitaId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    paziente: { select: { id: true } }
                }
            });

            if (!visita) {
                throw new Error('Visita non trovata o non autorizzata');
            }

            // Calcola hash per integrità
            const fileHash = this._calculateHash(data.buffer);

            // Genera path univoco per storage
            const storagePath = this._generateStoragePath(tenantId, 'visite', data.visitaId, data.nome);

            // Salva file
            const savedPath = await this._saveFile(data.buffer, storagePath);

            // Crea record database
            const allegato = await prisma.allegatoVisita.create({
                data: {
                    visitaId: data.visitaId,
                    tipo: data.tipo,
                    nome: data.nome,
                    descrizione: data.descrizione || null,
                    filePath: savedPath,
                    mimeType: data.mimeType,
                    dimensione: data.buffer.length,
                    uploadatoBy: userId
                }
            });

            // Audit log
            await this._createAuditLog({
                action: 'UPLOAD',
                entityType: 'AllegatoVisita',
                entityId: allegato.id,
                visitaId: data.visitaId,
                pazienteId: visita.paziente?.id,
                tenantId,
                userId,
                details: {
                    fileName: data.nome,
                    fileSize: data.buffer.length,
                    mimeType: data.mimeType,
                    fileHash
                }
            });

            logger.info({
                allegatoId: allegato.id,
                visitaId: data.visitaId,
                userId,
                size: data.buffer.length
            }, 'Allegato visita caricato');

            return allegato;
        } catch (error) {
            logger.error({ error: error.message, visitaId: data.visitaId }, 'Errore upload allegato visita');
            throw error;
        }
    },

    /**
     * Upload allegato referto
     * @param {Object} data - Dati allegato
     * @param {string} data.refertoId - ID referto
     * @param {string} data.tipo - Tipo allegato (pdf, image, dicom, etc.)
     * @param {string} data.nome - Nome file originale
     * @param {string} [data.descrizione] - Descrizione
     * @param {Buffer} data.buffer - Contenuto file
     * @param {string} data.mimeType - MIME type
     * @param {string} tenantId - ID tenant
     * @param {string} userId - ID utente che carica
     * @returns {Promise<Object>} Allegato creato
     */
    async uploadAllegatoReferto(data, tenantId, userId) {
        try {
            // Valida input
            const validation = await this._validateUpload(data, tenantId, 'referto');
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Verifica che il referto esista e non sia firmato
            const referto = await prisma.referto.findFirst({
                where: {
                    id: data.refertoId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    visita: {
                        include: {
                            paziente: { select: { id: true } }
                        }
                    }
                }
            });

            if (!referto) {
                throw new Error('Referto non trovato o non autorizzato');
            }

            // Non permettere upload su referti firmati
            if (referto.stato === 'FIRMATO') {
                throw new Error('Non è possibile aggiungere allegati a un referto già firmato');
            }

            // Calcola hash per integrità
            const fileHash = this._calculateHash(data.buffer);

            // Genera path univoco per storage
            const storagePath = this._generateStoragePath(tenantId, 'referti', data.refertoId, data.nome);

            // Salva file
            const savedPath = await this._saveFile(data.buffer, storagePath);

            // Crea record database
            const allegato = await prisma.allegatoReferto.create({
                data: {
                    refertoId: data.refertoId,
                    tipo: data.tipo,
                    nome: data.nome,
                    descrizione: data.descrizione || null,
                    filePath: savedPath,
                    mimeType: data.mimeType,
                    dimensione: data.buffer.length,
                    uploadatoBy: userId
                }
            });

            // Audit log
            await this._createAuditLog({
                action: 'UPLOAD',
                entityType: 'AllegatoReferto',
                entityId: allegato.id,
                refertoId: data.refertoId,
                pazienteId: referto.visita?.paziente?.id,
                tenantId,
                userId,
                details: {
                    fileName: data.nome,
                    fileSize: data.buffer.length,
                    mimeType: data.mimeType,
                    fileHash
                }
            });

            logger.info({
                allegatoId: allegato.id,
                refertoId: data.refertoId,
                userId,
                size: data.buffer.length
            }, 'Allegato referto caricato');

            return allegato;
        } catch (error) {
            logger.error({ error: error.message, refertoId: data.refertoId }, 'Errore upload allegato referto');
            throw error;
        }
    },

    /**
     * Download allegato visita
     * @param {string} allegatoId - ID allegato
     * @param {string} tenantId - ID tenant
     * @param {string} userId - ID utente che scarica
     * @returns {Promise<Object>} { buffer, fileName, mimeType }
     */
    async downloadAllegatoVisita(allegatoId, tenantId, userId) {
        try {
            // Recupera allegato con verifica tenant
            const allegato = await prisma.allegatoVisita.findFirst({
                where: {
                    id: allegatoId,
                    deletedAt: null
                },
                include: {
                    visita: {
                        select: {
                            id: true,
                            tenantId: true,
                            pazienteId: true
                        }
                    }
                }
            });

            if (!allegato) {
                throw new Error('Allegato non trovato');
            }

            // Verifica tenant
            if (allegato.visita.tenantId !== tenantId) {
                throw new Error('Allegato non autorizzato');
            }

            // Leggi file
            const buffer = await this._readFile(allegato.filePath);

            // Audit log
            await this._createAuditLog({
                action: 'DOWNLOAD',
                entityType: 'AllegatoVisita',
                entityId: allegatoId,
                visitaId: allegato.visitaId,
                pazienteId: allegato.visita.pazienteId,
                tenantId,
                userId,
                details: {
                    fileName: allegato.nome,
                    fileSize: allegato.dimensione
                }
            });

            logger.info({ allegatoId, userId }, 'Allegato visita scaricato');

            return {
                buffer,
                fileName: allegato.nome,
                mimeType: allegato.mimeType,
                size: allegato.dimensione
            };
        } catch (error) {
            logger.error({ error: error.message, allegatoId }, 'Errore download allegato visita');
            throw error;
        }
    },

    /**
     * Download allegato referto
     * @param {string} allegatoId - ID allegato
     * @param {string} tenantId - ID tenant
     * @param {string} userId - ID utente che scarica
     * @returns {Promise<Object>} { buffer, fileName, mimeType }
     */
    async downloadAllegatoReferto(allegatoId, tenantId, userId) {
        try {
            // Recupera allegato con verifica tenant
            const allegato = await prisma.allegatoReferto.findFirst({
                where: {
                    id: allegatoId,
                    deletedAt: null
                },
                include: {
                    referto: {
                        select: {
                            id: true,
                            tenantId: true,
                            visita: {
                                select: { pazienteId: true }
                            }
                        }
                    }
                }
            });

            if (!allegato) {
                throw new Error('Allegato non trovato');
            }

            // Verifica tenant
            if (allegato.referto.tenantId !== tenantId) {
                throw new Error('Allegato non autorizzato');
            }

            // Leggi file
            const buffer = await this._readFile(allegato.filePath);

            // Audit log
            await this._createAuditLog({
                action: 'DOWNLOAD',
                entityType: 'AllegatoReferto',
                entityId: allegatoId,
                refertoId: allegato.refertoId,
                pazienteId: allegato.referto.visita?.pazienteId,
                tenantId,
                userId,
                details: {
                    fileName: allegato.nome,
                    fileSize: allegato.dimensione
                }
            });

            logger.info({ allegatoId, userId }, 'Allegato referto scaricato');

            return {
                buffer,
                fileName: allegato.nome,
                mimeType: allegato.mimeType,
                size: allegato.dimensione
            };
        } catch (error) {
            logger.error({ error: error.message, allegatoId }, 'Errore download allegato referto');
            throw error;
        }
    },

    /**
     * Lista allegati per visita
     * @param {string} visitaId - ID visita
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array>} Lista allegati
     */
    async getAllegatiVisita(visitaId, tenantId) {
        try {
            // Verifica visita appartiene al tenant
            const visita = await prisma.visita.findFirst({
                where: { id: visitaId, tenantId, deletedAt: null }
            });

            if (!visita) {
                throw new Error('Visita non trovata o non autorizzata');
            }

            const allegati = await prisma.allegatoVisita.findMany({
                where: {
                    visitaId,
                    deletedAt: null
                },
                orderBy: { createdAt: 'desc' }
            });

            return allegati;
        } catch (error) {
            logger.error({ error: error.message, visitaId }, 'Errore recupero allegati visita');
            throw error;
        }
    },

    /**
     * Lista allegati per referto
     * @param {string} refertoId - ID referto
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array>} Lista allegati
     */
    async getAllegatiReferto(refertoId, tenantId) {
        try {
            // Verifica referto appartiene al tenant
            const referto = await prisma.referto.findFirst({
                where: { id: refertoId, tenantId, deletedAt: null }
            });

            if (!referto) {
                throw new Error('Referto non trovato o non autorizzato');
            }

            const allegati = await prisma.allegatoReferto.findMany({
                where: {
                    refertoId,
                    deletedAt: null
                },
                orderBy: { createdAt: 'desc' }
            });

            return allegati;
        } catch (error) {
            logger.error({ error: error.message, refertoId }, 'Errore recupero allegati referto');
            throw error;
        }
    },

    /**
     * Soft delete allegato visita
     * @param {string} allegatoId - ID allegato
     * @param {string} tenantId - ID tenant
     * @param {string} userId - ID utente
     * @returns {Promise<boolean>} Successo
     */
    async deleteAllegatoVisita(allegatoId, tenantId, userId) {
        try {
            const allegato = await prisma.allegatoVisita.findFirst({
                where: { id: allegatoId, deletedAt: null },
                include: {
                    visita: { select: { tenantId: true, pazienteId: true } }
                }
            });

            if (!allegato) {
                throw new Error('Allegato non trovato');
            }

            if (allegato.visita.tenantId !== tenantId) {
                throw new Error('Allegato non autorizzato');
            }

            await prisma.allegatoVisita.update({
                where: { id: allegatoId },
                data: { deletedAt: new Date() }
            });

            // Audit log
            await this._createAuditLog({
                action: 'DELETE',
                entityType: 'AllegatoVisita',
                entityId: allegatoId,
                visitaId: allegato.visitaId,
                pazienteId: allegato.visita.pazienteId,
                tenantId,
                userId,
                details: { fileName: allegato.nome }
            });

            logger.info({ allegatoId, userId }, 'Allegato visita eliminato (soft delete)');

            return true;
        } catch (error) {
            logger.error({ error: error.message, allegatoId }, 'Errore eliminazione allegato visita');
            throw error;
        }
    },

    /**
     * Soft delete allegato referto
     * @param {string} allegatoId - ID allegato
     * @param {string} tenantId - ID tenant
     * @param {string} userId - ID utente
     * @returns {Promise<boolean>} Successo
     */
    async deleteAllegatoReferto(allegatoId, tenantId, userId) {
        try {
            const allegato = await prisma.allegatoReferto.findFirst({
                where: { id: allegatoId, deletedAt: null },
                include: {
                    referto: {
                        select: {
                            tenantId: true,
                            stato: true,
                            visita: { select: { pazienteId: true } }
                        }
                    }
                }
            });

            if (!allegato) {
                throw new Error('Allegato non trovato');
            }

            if (allegato.referto.tenantId !== tenantId) {
                throw new Error('Allegato non autorizzato');
            }

            // Non permettere eliminazione da referti firmati
            if (allegato.referto.stato === 'FIRMATO') {
                throw new Error('Non è possibile eliminare allegati da un referto firmato');
            }

            await prisma.allegatoReferto.update({
                where: { id: allegatoId },
                data: { deletedAt: new Date() }
            });

            // Audit log
            await this._createAuditLog({
                action: 'DELETE',
                entityType: 'AllegatoReferto',
                entityId: allegatoId,
                refertoId: allegato.refertoId,
                pazienteId: allegato.referto.visita?.pazienteId,
                tenantId,
                userId,
                details: { fileName: allegato.nome }
            });

            logger.info({ allegatoId, userId }, 'Allegato referto eliminato (soft delete)');

            return true;
        } catch (error) {
            logger.error({ error: error.message, allegatoId }, 'Errore eliminazione allegato referto');
            throw error;
        }
    },

    /**
     * Ottiene statistiche storage per tenant
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Statistiche
     */
    async getStorageStats(tenantId) {
        try {
            const [visitaStats, refertoStats] = await Promise.all([
                prisma.allegatoVisita.aggregate({
                    where: {
                        deletedAt: null,
                        visita: { tenantId, deletedAt: null }
                    },
                    _count: { id: true },
                    _sum: { dimensione: true }
                }),
                prisma.allegatoReferto.aggregate({
                    where: {
                        deletedAt: null,
                        referto: { tenantId, deletedAt: null }
                    },
                    _count: { id: true },
                    _sum: { dimensione: true }
                })
            ]);

            const totalFiles = (visitaStats._count.id || 0) + (refertoStats._count.id || 0);
            const totalSize = (visitaStats._sum.dimensione || 0) + (refertoStats._sum.dimensione || 0);

            return {
                allegatiVisita: {
                    count: visitaStats._count.id || 0,
                    sizeBytes: visitaStats._sum.dimensione || 0,
                    sizeMB: Math.round((visitaStats._sum.dimensione || 0) / 1024 / 1024 * 100) / 100
                },
                allegatiReferto: {
                    count: refertoStats._count.id || 0,
                    sizeBytes: refertoStats._sum.dimensione || 0,
                    sizeMB: Math.round((refertoStats._sum.dimensione || 0) / 1024 / 1024 * 100) / 100
                },
                totale: {
                    count: totalFiles,
                    sizeBytes: totalSize,
                    sizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
                    sizeGB: Math.round(totalSize / 1024 / 1024 / 1024 * 1000) / 1000
                },
                limiti: {
                    maxFileSizeMB: STORAGE_CONFIG.MAX_FILE_SIZE / 1024 / 1024,
                    storageType: STORAGE_CONFIG.STORAGE_TYPE
                }
            };
        } catch (error) {
            logger.error({ error: error.message, tenantId }, 'Errore recupero statistiche storage');
            throw error;
        }
    },

    // ==================== METODI PRIVATI ====================

    /**
     * Valida upload
     * @private
     */
    async _validateUpload(data, tenantId, entityType) {
        // Verifica campi obbligatori
        if (!data.nome) {
            return { valid: false, error: 'Nome file obbligatorio' };
        }
        if (!data.buffer || data.buffer.length === 0) {
            return { valid: false, error: 'File vuoto' };
        }
        if (!data.mimeType) {
            return { valid: false, error: 'MIME type obbligatorio' };
        }
        if (!data.tipo) {
            return { valid: false, error: 'Tipo allegato obbligatorio' };
        }

        // Verifica dimensione
        if (data.buffer.length > STORAGE_CONFIG.MAX_FILE_SIZE) {
            return {
                valid: false,
                error: `File troppo grande. Massimo: ${STORAGE_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`
            };
        }

        // Verifica MIME type
        const allowedTypes = ALLOWED_MIME_TYPES[data.tipo] || ALLOWED_MIME_TYPES.other;
        if (!allowedTypes.includes(data.mimeType)) {
            return {
                valid: false,
                error: `MIME type ${data.mimeType} non consentito per tipo ${data.tipo}. Consentiti: ${allowedTypes.join(', ')}`
            };
        }

        // Sanitizza nome file (previene path traversal)
        const sanitizedName = path.basename(data.nome).replace(/[^a-zA-Z0-9.-_]/g, '_');
        if (sanitizedName !== data.nome) {
            data.nome = sanitizedName;
        }

        return { valid: true };
    },

    /**
     * Calcola hash SHA-256 del file
     * @private
     */
    _calculateHash(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    },

    /**
     * Genera path univoco per storage
     * @private
     */
    _generateStoragePath(tenantId, entityFolder, entityId, originalName) {
        const ext = path.extname(originalName);
        const uniqueId = crypto.randomUUID();
        const timestamp = Date.now();

        // Struttura: /tenant/{tenantId}/{entityFolder}/{entityId}/{timestamp}_{uniqueId}{ext}
        return path.join(
            tenantId,
            entityFolder,
            entityId,
            `${timestamp}_${uniqueId}${ext}`
        );
    },

    /**
     * Salva file su storage
     * @private
     */
    async _saveFile(buffer, relativePath) {
        const fullPath = path.join(STORAGE_CONFIG.LOCAL_BASE_PATH, relativePath);
        const dir = path.dirname(fullPath);

        // Crea directory se non esiste
        await fs.mkdir(dir, { recursive: true });

        // Salva file
        await fs.writeFile(fullPath, buffer);

        return relativePath;
    },

    /**
     * Legge file da storage
     * @private
     */
    async _readFile(relativePath) {
        const fullPath = path.join(STORAGE_CONFIG.LOCAL_BASE_PATH, relativePath);

        try {
            return await fs.readFile(fullPath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error('File non trovato nello storage');
            }
            throw error;
        }
    },

    /**
     * Crea audit log per operazioni documento
     * @private
     */
    async _createAuditLog(data) {
        try {
            await prisma.auditLogClinico.create({
                data: {
                    tenantId: data.tenantId,
                    entita: data.entityType,
                    entitaId: data.entityId,
                    azione: data.action,
                    datiPrecedenti: null,
                    datiNuovi: JSON.stringify(data.details),
                    userId: data.userId,
                    ipAddress: null,
                    userAgent: null
                }
            });
        } catch (error) {
            // Log errore ma non blocca operazione principale
            logger.error({ error: error.message }, 'Errore creazione audit log documento');
        }
    }
};

export default DocumentoClinicoService;
