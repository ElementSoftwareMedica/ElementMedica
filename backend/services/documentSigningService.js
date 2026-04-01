/**
 * Document Signing Service
 *
 * Appone la firma di un formatore (PNG/JPG) sul PDF.
 * Supporta tutti i tipi documento: GeneratedDocument, LetteraIncarico,
 * RegistroPresenze, Attestato.
 *
 * COORDINATE di posizionamento (placement):
 *   - page       (int, 1-based): pagina su cui apporre la firma (default: ultima)
 *   - xRatio     (0-1): distanza dal bordo sinistro come frazione della larghezza pagina
 *   - yRatio     (0-1): distanza dal bordo superiore come frazione dell'altezza pagina
 *   - widthRatio (0-1): larghezza firma come frazione della larghezza pagina
 *   - heightRatio(0-1): altezza firma come frazione dell'altezza pagina
 *
 * Conversione verso coordinate PDF (origin in basso a sinistra):
 *   pdfX = xRatio * pageWidth
 *   pdfY = pageHeight - (yRatio + heightRatio) * pageHeight
 *   imgW = widthRatio * pageWidth
 *   imgH = heightRatio * pageHeight
 */

import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import prisma from '../config/prisma-optimization.js';
import storageService from './storageService.js';
import logger from '../utils/logger.js';

// ─── Default placement (bottom-right, ~25% width) ────────────────────────────
const DEFAULT_PLACEMENT = {
    page: null,       // null = ultima pagina
    xRatio: 0.62,
    yRatio: 0.86,
    widthRatio: 0.28,
    heightRatio: 0.08
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decodeSignatureImage(signatureBase64) {
    if (signatureBase64.startsWith('data:')) {
        return Buffer.from(signatureBase64.split(',')[1], 'base64');
    }
    return Buffer.from(signatureBase64, 'base64');
}

function isPng(signatureBase64) {
    return !signatureBase64.includes('image/jpeg') && !signatureBase64.includes('image/jpg');
}

/** Resolves a GeneratedDocument.filepath (relative or absolute) to an absolute FS path. */
function resolveDocFilePath(filepath) {
    const uploadsBase = path.join(process.cwd(), 'uploads');
    if (path.isAbsolute(filepath)) {
        if (!filepath.startsWith(uploadsBase)) {
            throw new Error('Percorso documento non valido');
        }
        return filepath;
    }
    const resolved = path.resolve(uploadsBase, filepath);
    if (!resolved.startsWith(uploadsBase + path.sep) && resolved !== uploadsBase) {
        throw new Error('Percorso documento non valido');
    }
    return resolved;
}

/**
 * Resolves a URL-style path like `/uploads/documents/file.pdf` or
 * `uploads/documents/file.pdf` to an absolute FS path.
 *
 * NOTE: `/uploads/...` starts with `/` which makes path.isAbsolute() return true,
 * but these are server URL paths (not real FS paths). We must strip the URL prefix
 * first, then check if the remainder is a true FS absolute path.
 */
function resolveUrlFilePath(urlPath) {
    // Strip URL-style /uploads/ or uploads/ prefix (server URL ≠ filesystem path)
    const stripped = urlPath
        .replace(/^\/+uploads\//, '')
        .replace(/^uploads\//, '');
    const uploadsBase = path.join(process.cwd(), 'uploads');
    // If what remains is still an absolute FS path (e.g. /home/user/...), validate it
    if (path.isAbsolute(stripped)) {
        if (!stripped.startsWith(uploadsBase)) {
            throw new Error('Percorso documento non valido');
        }
        return stripped;
    }
    // Otherwise resolve relative to cwd/uploads/ and validate
    const resolved = path.resolve(uploadsBase, stripped);
    if (!resolved.startsWith(uploadsBase + path.sep) && resolved !== uploadsBase) {
        throw new Error('Percorso documento non valido');
    }
    return resolved;
}

// ─── Core stamping logic ──────────────────────────────────────────────────────

async function stampSignature(pdfDoc, sigBuffer, pngMode, placement = {}) {
    const pl = { ...DEFAULT_PLACEMENT, ...placement };

    const pages = pdfDoc.getPages();
    const targetIndex = pl.page != null
        ? Math.min(Math.max(Number(pl.page) - 1, 0), pages.length - 1)
        : pages.length - 1;

    const page = pages[targetIndex];
    const { width: pw, height: ph } = page.getSize();

    const x = pl.xRatio * pw;
    const imgW = pl.widthRatio * pw;
    const imgH = pl.heightRatio * ph;
    // yRatio is distance from top; PDF y=0 is at bottom
    const y = ph - (pl.yRatio * ph) - imgH;

    const sigImage = pngMode
        ? await pdfDoc.embedPng(sigBuffer)
        : await pdfDoc.embedJpg(sigBuffer);

    page.drawImage(sigImage, {
        x,
        y,
        width: imgW,
        height: imgH,
        opacity: 1.0
    });
}

// ─── Document resolution (multi-type) ────────────────────────────────────────

/**
 * Looks up a document across all supported types.
 * Returns { type, doc, pdfPath, originalFilename }.
 * Note: for cross-tenant admin operations tenantId may come from the document
 * itself; the caller (route) is responsible for authorisation.
 */
async function resolveAnyDocument(documentId, tenantId) {
    // 1. GeneratedDocument
    const gen = await prisma.generatedDocument.findFirst({
        where: { id: documentId, tenantId, deletedAt: null }
    });
    if (gen) {
        return {
            type: 'generatedDocument',
            doc: gen,
            pdfPath: resolveDocFilePath(gen.filepath),
            originalFilename: gen.filename
        };
    }

    // 2. LetteraIncarico
    const lettera = await prisma.letteraIncarico.findFirst({
        where: { id: documentId, tenantId, deletedAt: null }
    });
    if (lettera) {
        return {
            type: 'letteraIncarico',
            doc: lettera,
            pdfPath: resolveUrlFilePath(lettera.url),
            originalFilename: path.basename(lettera.url)
        };
    }

    // 3. RegistroPresenze
    const registro = await prisma.registroPresenze.findFirst({
        where: { id: documentId, tenantId, deletedAt: null }
    });
    if (registro) {
        return {
            type: 'registroPresenze',
            doc: registro,
            pdfPath: resolveUrlFilePath(registro.url),
            originalFilename: path.basename(registro.url)
        };
    }

    // 4. Attestato
    const attestato = await prisma.attestato.findFirst({
        where: { id: documentId, tenantId, deletedAt: null }
    });
    if (attestato) {
        return {
            type: 'attestato',
            doc: attestato,
            pdfPath: resolveUrlFilePath(attestato.fileUrl),
            originalFilename: path.basename(attestato.fileUrl)
        };
    }

    return null;
}

/**
 * Persists the signed PDF buffer and updates the appropriate DB record.
 * Returns the updated record.
 */
async function persistSignedDocument({ type, doc, signedBuffer, originalFilename, signedById }) {
    const ext = path.extname(originalFilename) || '.pdf';
    const base = path.basename(originalFilename, ext);
    const signedFilename = `${base}_firmato${ext}`;

    const { filepath: signedFilepath, fileUrl: signedFileUrl } = await storageService.saveFile(
        signedBuffer,
        signedFilename,
        'documents'
    );

    // Build the public URL for the signed file (relative to /uploads/)
    const signedUrl = signedFileUrl || `/uploads/${signedFilepath.split(/uploads[\\/]/)[1]}`;

    let updated;
    const now = new Date();

    switch (type) {
        case 'generatedDocument':
            updated = await prisma.generatedDocument.update({
                where: { id: doc.id },
                data: { signedAt: now, signedBy: signedById, signedFilepath }
            });
            break;

        case 'letteraIncarico':
            updated = await prisma.letteraIncarico.update({
                where: { id: doc.id },
                data: {
                    url: signedUrl,
                    firmaFormatore: signedUrl,
                    firmaFormatoreAt: now
                }
            });
            break;

        case 'registroPresenze':
            updated = await prisma.registroPresenze.update({
                where: { id: doc.id },
                data: {
                    url: signedUrl,
                    firmaFormatore: signedUrl,
                    firmaFormatoreAt: now,
                    firmaFormatoreId: signedById
                }
            });
            break;

        case 'attestato':
            updated = await prisma.attestato.update({
                where: { id: doc.id },
                data: {
                    fileUrl: signedUrl,
                    firmaFormatore: signedUrl,
                    firmaFormatoreAt: now,
                    firmaFormatoreId: signedById
                }
            });
            break;

        default:
            throw new Error(`Tipo documento non supportato per la firma: ${type}`);
    }

    return { ...updated, signedFileUrl: signedUrl, signedFilepath };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Signs a document by stamping a signature image on the PDF.
 * Supports GeneratedDocument, LetteraIncarico, RegistroPresenze, Attestato.
 *
 * @param {object} params
 * @param {string} params.documentId
 * @param {string} params.signatureBase64 - base64 data-URI (PNG or JPG)
 * @param {string} params.signedById - Person.id
 * @param {string} params.tenantId
 * @param {object} [params.placement] - Relative placement coords
 * @param {number|null} [params.placement.page] - 1-based (default: last)
 * @param {number} [params.placement.xRatio]     0-1
 * @param {number} [params.placement.yRatio]     0-1
 * @param {number} [params.placement.widthRatio] 0-1
 * @param {number} [params.placement.heightRatio] 0-1
 * @returns {Promise<{id, signedAt, signedFilepath, signedFileUrl}>}
 */
export async function signDocument({
    documentId,
    signatureBase64,
    signedById,
    tenantId,
    placement = {}
}) {
    const resolved = await resolveAnyDocument(documentId, tenantId);
    if (!resolved) throw new Error(`Documento ${documentId} non trovato`);

    const { type, doc, pdfPath, originalFilename } = resolved;

    const pdfBuffer = await fs.readFile(pdfPath);
    const sigBuffer = decodeSignatureImage(signatureBase64);
    const png = isPng(signatureBase64);

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    await stampSignature(pdfDoc, sigBuffer, png, placement);

    const signedPdfBytes = await pdfDoc.save();
    const signedBuffer = Buffer.from(signedPdfBytes);

    const result = await persistSignedDocument({
        type,
        doc,
        signedBuffer,
        originalFilename,
        signedById
    });

    logger.info('Document signed successfully', { documentId, type, signedById });

    return result;
}

/**
 * Signs multiple documents with the same signature and placement.
 *
 * @param {object} params
 * @param {string[]} params.documentIds
 * @param {string} params.signatureBase64
 * @param {string} params.signedById
 * @param {string} params.tenantId
 * @param {object} [params.placement]
 * @returns {Promise<{succeeded:string[], failed:string[]}>}
 */
export async function signDocumentsBulk({
    documentIds,
    signatureBase64,
    signedById,
    tenantId,
    placement = {}
}) {
    const succeeded = [];
    const failed = [];

    for (const documentId of documentIds) {
        try {
            await signDocument({ documentId, signatureBase64, signedById, tenantId, placement });
            succeeded.push(documentId);
        } catch (err) {
            logger.error('Error signing document in bulk', { documentId, error: err.message });
            failed.push(documentId);
        }
    }

    return { succeeded, failed };
}
