/**
 * Medici Documents Routes
 * Document management for medical professionals (Progetto 44)
 * 
 * Base path: /api/v1/clinica/medici/:id/documents
 * 
 * @module routes/clinica/medici-documents
 * @version 1.0.0
 */

import express from 'express';
import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import middleware from '../../auth/middleware.js';
import { checkAdvancedPermission } from '../../middleware/advanced-permissions.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';

const router = express.Router({ mergeParams: true });
const { authenticate: authenticateToken } = middleware;

// ============================================
// LIST DOCUMENTS
// ============================================

/**
 * @route GET /medici/:id/documents
 * @desc Ottiene tutti i documenti di un medico
 * @access Authenticated + VIEW_MEDICI
 */
router.get('/',
    authenticateToken(),
    checkAdvancedPermission('medici', 'read'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const { tipo, includeExpired } = req.query;

            const where = {
                personId: id,
                tenantId,
                deletedAt: null,
                isCurrentVersion: true
            };

            if (tipo) where.tipo = tipo;
            if (!includeExpired || includeExpired === 'false') {
                where.isExpired = false;
            }

            const documents = await prisma.personDocument.findMany({
                where,
                orderBy: [
                    { tipo: 'asc' },
                    { createdAt: 'desc' }
                ],
                include: {
                    uploader: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                }
            });

            res.json({ success: true, data: documents });
        } catch (error) {
            logger.error('Failed to fetch person documents', {
                component: 'medici-documents-routes',
                error: error.message,
                personId: req.params.id
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero dei documenti'
            });
        }
    }
);

// ============================================
// UPLOAD DOCUMENT
// ============================================

/**
 * @route POST /medici/:id/documents
 * @desc Carica un nuovo documento per un medico
 * @access Authenticated + UPDATE_MEDICI
 */
router.post('/',
    authenticateToken(),
    checkAdvancedPermission('medici', 'update'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = getEffectiveTenantId(req);
            const {
                tipo,
                titolo,
                descrizione,
                fileName,
                fileUrl,
                fileSize,
                mimeType,
                hashFile,
                dataDocumento,
                dataScadenza
            } = req.body;

            if (!tipo || !titolo || !fileName || !fileUrl) {
                return res.status(400).json({
                    success: false,
                    error: 'Campi obbligatori mancanti: tipo, titolo, fileName, fileUrl'
                });
            }

            // Check for existing document of same type (versioning)
            const existingDoc = await prisma.personDocument.findFirst({
                where: {
                    personId: id,
                    tenantId,
                    tipo,
                    isCurrentVersion: true,
                    deletedAt: null
                },
                orderBy: { version: 'desc' }
            });

            let newVersion = 1;
            let previousVersionId = null;

            if (existingDoc) {
                await prisma.personDocument.update({
                    where: { id: existingDoc.id },
                    data: { isCurrentVersion: false }
                });
                newVersion = existingDoc.version + 1;
                previousVersionId = existingDoc.id;
            }

            const document = await prisma.personDocument.create({
                data: {
                    personId: id,
                    tipo,
                    titolo,
                    descrizione,
                    fileName,
                    fileUrl,
                    fileSize: fileSize || null,
                    mimeType: mimeType || 'application/pdf',
                    hashFile,
                    version: newVersion,
                    isCurrentVersion: true,
                    previousVersionId,
                    dataDocumento: dataDocumento ? new Date(dataDocumento) : new Date(),
                    dataScadenza: dataScadenza ? new Date(dataScadenza) : null,
                    isExpired: dataScadenza ? new Date(dataScadenza) < new Date() : false,
                    uploadedBy: req.person.id,
                    tenantId
                },
                include: {
                    uploader: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                }
            });

            await prisma.gdprAuditLog.create({
                data: {
                    personId: req.person?.id || id,
                    action: 'CREATE',
                    resourceType: 'PERSON_DOCUMENT',
                    resourceId: document.id,
                    dataAccessed: { documentId: document.id, tipo, fileName, version: newVersion },
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    tenantId
                }
            });

            res.status(201).json({
                success: true,
                data: document,
                message: previousVersionId
                    ? `Documento aggiornato (versione ${newVersion})`
                    : 'Documento caricato con successo'
            });
        } catch (error) {
            logger.error('Failed to upload person document', {
                component: 'medici-documents-routes',
                error: error.message,
                personId: req.params.id
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel caricamento del documento',
                message: error.message
            });
        }
    }
);

// ============================================
// GET DOCUMENT VERSIONS
// ============================================

/**
 * @route GET /medici/:id/documents/:docId/versions
 * @desc Ottiene lo storico versioni di un documento
 * @access Authenticated + VIEW_MEDICI
 */
router.get('/:docId/versions',
    authenticateToken(),
    checkAdvancedPermission('medici', 'read'),
    async (req, res) => {
        try {
            const { id, docId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const document = await prisma.personDocument.findFirst({
                where: {
                    id: docId,
                    personId: id,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    error: 'Documento non trovato'
                });
            }

            const versions = await prisma.personDocument.findMany({
                where: {
                    personId: id,
                    tenantId,
                    tipo: document.tipo,
                    deletedAt: null
                },
                orderBy: { version: 'desc' },
                include: {
                    uploader: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                }
            });

            res.json({ success: true, data: versions });
        } catch (error) {
            logger.error('Failed to fetch document versions', {
                component: 'medici-documents-routes',
                error: error.message,
                docId: req.params.docId
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel recupero delle versioni'
            });
        }
    }
);

// ============================================
// DELETE DOCUMENT
// ============================================

/**
 * @route DELETE /medici/:id/documents/:docId
 * @desc Elimina un documento (soft delete)
 * @access Authenticated + UPDATE_MEDICI
 */
router.delete('/:docId',
    authenticateToken(),
    checkAdvancedPermission('medici', 'update'),
    async (req, res) => {
        try {
            const { id, docId } = req.params;
            const tenantId = getEffectiveTenantId(req);

            const document = await prisma.personDocument.findFirst({
                where: {
                    id: docId,
                    personId: id,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    error: 'Documento non trovato'
                });
            }

            await prisma.personDocument.update({
                where: { id: docId },
                data: { deletedAt: new Date() }
            });

            // If this was current version, make previous version current
            if (document.isCurrentVersion && document.previousVersionId) {
                await prisma.personDocument.update({
                    where: { id: document.previousVersionId },
                    data: { isCurrentVersion: true }
                });
            }

            await prisma.gdprAuditLog.create({
                data: {
                    personId: req.person?.id || id,
                    action: 'DELETE',
                    resourceType: 'PERSON_DOCUMENT',
                    resourceId: document.id,
                    dataAccessed: { documentId: document.id, tipo: document.tipo, fileName: document.fileName },
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    tenantId
                }
            });

            res.json({
                success: true,
                message: 'Documento eliminato con successo'
            });
        } catch (error) {
            logger.error('Failed to delete person document', {
                component: 'medici-documents-routes',
                error: error.message,
                docId: req.params.docId
            });

            res.status(500).json({
                success: false,
                error: 'Errore nell\'eliminazione del documento'
            });
        }
    }
);

export default router;
