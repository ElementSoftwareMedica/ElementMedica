/**
 * InternalDocumentService.js
 * Service per la gestione di documenti interni (procedure, moduli, marketing)
 * e cartelle documentali nel modulo Management.
 *
 * @description Gestisce CRUD, versioning e upload per DocFolder e InternalDocument
 * @project P74 - Document Management & Email Templates
 */

import optimizedPrisma from '../../config/database.js';
import logger from '../../utils/logger.js';

const prisma = optimizedPrisma.getClient();

// ============================================================
// DOC FOLDER SERVICE
// ============================================================

class InternalDocumentService {

    // ----- FOLDERS -----

    /**
     * Elenco cartelle con conteggio documenti
     */
    async getFolders({ tenantId, tipo, parentId, includeChildren = false }) {
        logger.info({ tenantId, tipo, parentId }, 'InternalDocumentService.getFolders');

        const where = { tenantId, deletedAt: null };
        if (tipo) where.tipo = tipo;
        if (parentId !== undefined) where.parentId = parentId ?? null;

        const folders = await prisma.docFolder.findMany({
            where,
            include: {
                _count: { select: { documents: { where: { deletedAt: null, isCurrentVersion: true } } } },
                ...(includeChildren ? {
                    children: {
                        where: { deletedAt: null },
                        include: {
                            _count: { select: { documents: { where: { deletedAt: null, isCurrentVersion: true } } } }
                        },
                        orderBy: [{ ordine: 'asc' }, { nome: 'asc' }]
                    }
                } : {})
            },
            orderBy: [{ ordine: 'asc' }, { nome: 'asc' }]
        });

        return folders;
    }

    /**
     * Albero completo cartelle (ricorsivo, max 3 livelli)
     */
    async getFolderTree({ tenantId, tipo }) {
        logger.info({ tenantId, tipo }, 'InternalDocumentService.getFolderTree');

        const where = { tenantId, deletedAt: null, parentId: null };
        if (tipo) where.tipo = tipo;

        const rootFolders = await prisma.docFolder.findMany({
            where,
            include: {
                _count: { select: { documents: { where: { deletedAt: null, isCurrentVersion: true } } } },
                children: {
                    where: { deletedAt: null },
                    include: {
                        _count: { select: { documents: { where: { deletedAt: null, isCurrentVersion: true } } } },
                        children: {
                            where: { deletedAt: null },
                            include: {
                                _count: { select: { documents: { where: { deletedAt: null, isCurrentVersion: true } } } }
                            },
                            orderBy: [{ ordine: 'asc' }, { nome: 'asc' }]
                        }
                    },
                    orderBy: [{ ordine: 'asc' }, { nome: 'asc' }]
                }
            },
            orderBy: [{ ordine: 'asc' }, { nome: 'asc' }]
        });

        return rootFolders;
    }

    /**
     * Crea nuova cartella
     */
    async createFolder({ tenantId, nome, descrizione, tipo = 'GENERICO', parentId, ordine = 0 }, createdBy) {
        logger.info({ tenantId, nome, tipo }, 'InternalDocumentService.createFolder');

        // Verifica parentId appartiene allo stesso tenant
        if (parentId) {
            const parent = await prisma.docFolder.findFirst({
                where: { id: parentId, tenantId, deletedAt: null }
            });
            if (!parent) throw new Error('Cartella padre non trovata');
        }

        return prisma.docFolder.create({
            data: { tenantId, nome, descrizione, tipo, parentId: parentId || null, ordine, createdBy }
        });
    }

    /**
     * Aggiorna cartella
     */
    async updateFolder(id, tenantId, data) {
        logger.info({ id, tenantId }, 'InternalDocumentService.updateFolder');

        const folder = await prisma.docFolder.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!folder) throw new Error('Cartella non trovata');

        return prisma.docFolder.update({
            where: { id },
            data: { nome: data.nome, descrizione: data.descrizione, ordine: data.ordine, isActive: data.isActive }
        });
    }

    /**
     * Soft delete cartella (solo se vuota)
     */
    async deleteFolder(id, tenantId) {
        logger.info({ id, tenantId }, 'InternalDocumentService.deleteFolder');

        const folder = await prisma.docFolder.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                _count: { select: { documents: { where: { deletedAt: null } } } },
                _count2: { select: { children: { where: { deletedAt: null } } } }
            }
        });
        if (!folder) throw new Error('Cartella non trovata');

        // Conta documenti e sotto-cartelle attivi
        const docsCount = await prisma.internalDocument.count({ where: { folderId: id, deletedAt: null } });
        const childrenCount = await prisma.docFolder.count({ where: { parentId: id, deletedAt: null } });

        if (docsCount > 0 || childrenCount > 0) {
            throw new Error(`Impossibile eliminare: la cartella contiene ${docsCount} documenti e ${childrenCount} sotto-cartelle attive`);
        }

        return prisma.docFolder.update({ where: { id }, data: { deletedAt: new Date() } });
    }

    // ----- DOCUMENTS -----

    /**
     * Elenco documenti con paginazione
     */
    async getDocuments({ tenantId, folderId, tipo, search, isCurrentVersion = true, page = 1, limit = 20 }) {
        logger.info({ tenantId, folderId, tipo, search }, 'InternalDocumentService.getDocuments');

        const where = { tenantId, deletedAt: null };
        if (folderId !== undefined) where.folderId = folderId ?? null;
        if (tipo) where.tipo = tipo;
        if (typeof isCurrentVersion === 'boolean') where.isCurrentVersion = isCurrentVersion;
        if (search) {
            where.OR = [
                { nome: { contains: search, mode: 'insensitive' } },
                { descrizione: { contains: search, mode: 'insensitive' } },
                { tags: { has: search } }
            ];
        }

        const offset = (page - 1) * limit;
        const [data, total] = await Promise.all([
            prisma.internalDocument.findMany({
                where,
                include: {
                    folder: { select: { id: true, nome: true, tipo: true } }
                },
                orderBy: [{ updatedAt: 'desc' }],
                skip: offset,
                take: limit
            }),
            prisma.internalDocument.count({ where })
        ]);

        return { data, total, page, limit, pages: Math.ceil(total / limit) };
    }

    /**
     * Dettaglio singolo documento con storico versioni
     */
    async getDocumentById(id, tenantId) {
        const doc = await prisma.internalDocument.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: { folder: { select: { id: true, nome: true, tipo: true } } }
        });
        if (!doc) throw new Error('Documento non trovato');

        // Recupera storico versioni (catena parentDocId)
        const versions = await this._getVersionHistory(id, tenantId);

        return { ...doc, versions };
    }

    /**
     * Recupera la catena di versioni di un documento (max 20 versioni)
     */
    async _getVersionHistory(docId, tenantId, depth = 0) {
        if (depth > 20) return [];
        const doc = await prisma.internalDocument.findFirst({
            where: { id: docId, tenantId },
            select: { id: true, versione: true, revisionNote: true, createdAt: true, parentDocId: true, isCurrentVersion: true, createdBy: true }
        });
        if (!doc) return [];
        if (doc.parentDocId) {
            const parentHistory = await this._getVersionHistory(doc.parentDocId, tenantId, depth + 1);
            return [doc, ...parentHistory];
        }
        return [doc];
    }

    /**
     * Crea nuovo documento
     */
    async createDocument({ tenantId, folderId, nome, descrizione, tipo = 'ALTRO', fileUrl, fileName, fileSize, mimeType, versione = '1.0', tags = [], isPublic = false }, createdBy) {
        logger.info({ tenantId, nome, tipo }, 'InternalDocumentService.createDocument');

        if (folderId) {
            const folder = await prisma.docFolder.findFirst({ where: { id: folderId, tenantId, deletedAt: null } });
            if (!folder) throw new Error('Cartella non trovata');
        }

        return prisma.internalDocument.create({
            data: { tenantId, folderId: folderId || null, nome, descrizione, tipo, fileUrl, fileName, fileSize, mimeType, versione, tags, isPublic, isCurrentVersion: true, createdBy }
        });
    }

    /**
     * Aggiorna metadati documento (NON il file — usare nuovaRevisione per quello)
     */
    async updateDocument(id, tenantId, data) {
        logger.info({ id, tenantId }, 'InternalDocumentService.updateDocument');

        const doc = await prisma.internalDocument.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!doc) throw new Error('Documento non trovato');

        return prisma.internalDocument.update({
            where: { id },
            data: {
                nome: data.nome,
                descrizione: data.descrizione,
                tags: data.tags,
                isPublic: data.isPublic,
                folderId: data.folderId
            }
        });
    }

    /**
     * Crea nuova revisione del documento (mantiene la catena di versioni)
     * Il documento corrente viene marcato come non-current, la nuova versione come current
     */
    async createRevision(id, tenantId, { fileUrl, fileName, fileSize, mimeType, versione, revisionNote }, createdBy) {
        logger.info({ id, tenantId, versione }, 'InternalDocumentService.createRevision');

        const existing = await prisma.internalDocument.findFirst({ where: { id, tenantId, deletedAt: null, isCurrentVersion: true } });
        if (!existing) throw new Error('Documento corrente non trovato');

        return prisma.$transaction(async (tx) => {
            // Marca versione precedente come non-current
            await tx.internalDocument.update({ where: { id }, data: { isCurrentVersion: false } });

            // Crea nuova versione corrente
            const newDoc = await tx.internalDocument.create({
                data: {
                    tenantId,
                    folderId: existing.folderId,
                    nome: existing.nome,
                    descrizione: existing.descrizione,
                    tipo: existing.tipo,
                    fileUrl,
                    fileName,
                    fileSize,
                    mimeType,
                    versione: versione || this._incrementVersion(existing.versione),
                    revisionNote,
                    tags: existing.tags,
                    isPublic: existing.isPublic,
                    isCurrentVersion: true,
                    parentDocId: existing.id,
                    createdBy
                }
            });

            return newDoc;
        });
    }

    _incrementVersion(current) {
        const parts = current.split('.');
        const minor = parseInt(parts[1] || '0', 10) + 1;
        return `${parts[0]}.${minor}`;
    }

    /**
     * Soft delete documento
     */
    async deleteDocument(id, tenantId, deletedBy) {
        logger.info({ id, tenantId, deletedBy }, 'InternalDocumentService.deleteDocument');

        const doc = await prisma.internalDocument.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!doc) throw new Error('Documento non trovato');

        return prisma.internalDocument.update({ where: { id }, data: { deletedAt: new Date() } });
    }

    /**
     * Ottieni documenti marketing selezionabili per allegati email
     */
    async getMarketingDocuments(tenantId) {
        return prisma.internalDocument.findMany({
            where: { tenantId, tipo: 'MARKETING', deletedAt: null, isCurrentVersion: true },
            select: { id: true, nome: true, descrizione: true, fileUrl: true, fileName: true, fileSize: true, mimeType: true },
            orderBy: { nome: 'asc' }
        });
    }
}

export default new InternalDocumentService();
