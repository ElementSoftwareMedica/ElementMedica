/**
 * VisitaRefertoService
 * 
 * Servizio per la generazione del PDF del referto visita.
 * Utilizza il TemplateLink di tipo VISITA_MEDICA per generare
 * il PDF con i dati della visita.
 * 
 * @module services/clinical/VisitaRefertoService
 * @project P52 - Clinical Visit Template System
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import pdfService from '../pdfService.js';
import storageService from '../storageService.js';
import crypto from 'crypto';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { getMedicoTitle, formatMedicoName } from '../../utils/medicoFormatters.js';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BACKEND_DIR = join(__dirname, '../../'); // backend root (2 levels up from services/clinical)

/**
 * Converte un path relativo del logo in data-URL base64 per Puppeteer.
 * @param {string} logoPath - Percorso relativo (es. /assets/logos/logo.png)
 * @returns {string} - data-URL base64 o percorso originale se non trovato
 */
function logoToDataUrl(logoPath) {
    if (!logoPath) return '';
    if (logoPath.startsWith('data:')) return logoPath;

    // Per URL HTTP localhost/127.0.0.1: estrai il percorso e leggi da filesystem
    // (Puppeteer nel documents server non può accedere a localhost:4001 direttamente)
    let effectivePath = logoPath;
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
        try {
            const url = new URL(logoPath);
            const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '0.0.0.0';
            if (isLocal) {
                // Usa solo il path (es. /uploads/cms/logo.png) per leggere da filesystem
                effectivePath = url.pathname;
            } else {
                // URL esterno: restituisci as-is (Puppeteer può scaricarlo)
                return logoPath;
            }
        } catch {
            // URL malformato: prova comunque as-is
            return logoPath;
        }
    }

    const cleanPath = effectivePath.startsWith('/') ? effectivePath.slice(1) : effectivePath;
    const filePath = join(BACKEND_DIR, cleanPath);
    const PROJECT_ROOT = join(BACKEND_DIR, '..');
    const tryPaths = [filePath, join(BACKEND_DIR, 'public', cleanPath), join(PROJECT_ROOT, 'public', cleanPath), join(PROJECT_ROOT, cleanPath)];

    for (const p of tryPaths) {
        if (existsSync(p)) {
            try {
                const data = readFileSync(p);
                const ext = p.split('.').pop().toLowerCase();
                const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
                return `data:${mime};base64,${data.toString('base64')}`;
            } catch { break; }
        }
    }

    logger.debug('[VisitaRefertoService] Logo file non trovato', { logoPath });
    return logoPath;
}

/**
 * Prova più percorsi logo in ordine, restituendo il primo che risolve a data URL.
 * Utile quando il path primario (es. CMS upload) potrebbe non esistere su disco.
 */
function resolveFirstValidLogo(...paths) {
    for (const p of paths) {
        if (!p) continue;
        const result = logoToDataUrl(p);
        if (result.startsWith('data:')) return result;
    }
    return '';
}

/**
 * Error class for referto generation
 */
class RefertoGenerationError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'RefertoGenerationError';
        this.details = details;
    }
}

/**
 * VisitaRefertoService
 * 
 * Servizio per generare PDF del referto dalla visita
 */
export class VisitaRefertoService {

    /**
     * Genera il PDF del referto per una visita
     * 
     * @param {string} visitaId - ID della visita
     * @param {string} tenantId - ID del tenant
     * @param {string} userId - ID dell'utente che genera
     * @param {Object} options - Opzioni aggiuntive
     * @returns {Promise<Object>} - Risultato con filepath, fileUrl, displayName
     */
    static async generateRefertoPdf(visitaId, tenantId, userId, options = {}) {
        try {
            logger.info('Inizio generazione PDF referto visita', {
                component: 'VisitaRefertoService',
                visitaId,
                tenantId,
                userId
            });

            // 1. Carica la visita completa con tutte le relazioni
            const visita = await this._loadVisitaCompleta(visitaId, tenantId);
            if (!visita) {
                throw new RefertoGenerationError('Visita non trovata', { visitaId });
            }

            // === DIAGNOSTIC: Log key IDs for signature lookup ===
            logger.info('[FIRMA-DIAG] Step 1: Visita loaded — key IDs for signature lookup', {
                component: 'VisitaRefertoService',
                visitaId,
                tenantId,
                userId,
                medicoId: visita.medicoId,
                medicoRefertanteId: visita.medicoRefertanteId || null,
                pazienteId: visita.pazienteId,
                hasMedico: !!visita.medico,
                hasPaziente: !!visita.paziente
            });

            // 2. Carica il template di stampa (da VisitTemplate.printConfig o fallback TemplateLink)
            //    Also returns resolved VisitTemplate fields for NEVER/ALWAYS filtering
            const { templateLink: template, resolvedFields } = await this._loadPrintTemplate(visita, tenantId);
            if (!template) {
                throw new RefertoGenerationError('Template di stampa non trovato. Configurare il template di stampa nel VisitTemplate o creare un TemplateLink di tipo VISITA_MEDICA.', { tenantId });
            }

            // 2b. Carica dati tenant per i placeholder {{tenant.*}}
            const tenantRecord = await prisma.tenant.findFirst({
                where: { id: tenantId, deletedAt: null },
                select: {
                    id: true,
                    name: true,
                    settings: true,
                    selfCompanyProfile: {
                        select: {
                            emailGenerale: true,
                            telefonoGenerale: true,
                            pec: true,
                            company: {
                                select: {
                                    ragioneSociale: true,
                                    piva: true,
                                    codiceFiscale: true,
                                    sedeLegaleIndirizzo: true,
                                    sedeLegaleCitta: true,
                                    sedeLegaleCap: true,
                                    sedeLegaleProvincia: true
                                }
                            }
                        }
                    }
                }
            });

            // 2c. Carica firme digitali per medico e paziente
            const signatures = await this._loadSignatures(visita, tenantId, userId);

            // 3. Build context con tutti i dati per i marker (rispetta printOptions)
            //    Uses resolvedFields from hierarchical VisitTemplate resolution
            const { context, printOptionsMap } = this._buildPrintContext(visita, tenantRecord, signatures, resolvedFields);

            // === DIAGNOSTIC: Firma context values (inline in message for console visibility) ===
            const firmaMedicoLen = context.firma?.medico?.length || 0;
            const firmaPazienteLen = context.firma?.paziente?.length || 0;
            const firmaMedicoImgLen = context.firma?.medicoImg?.length || 0;
            const firmaPazienteImgLen = context.firma?.pazienteImg?.length || 0;
            logger.info(`[FIRMA-DIAG] Step 3: Context firma — medico: ${firmaMedicoLen > 0 ? `${firmaMedicoLen} chars` : 'EMPTY'}, paziente: ${firmaPazienteLen > 0 ? `${firmaPazienteLen} chars` : 'EMPTY'}, medicoImg: ${firmaMedicoImgLen > 0 ? 'YES' : 'EMPTY'}, pazienteImg: ${firmaPazienteImgLen > 0 ? 'YES' : 'EMPTY'}`, {
                component: 'VisitaRefertoService',
                visitaId,
                'firma.medicoNome': context.firma?.medicoNome || '(empty)',
                'firma.pazienteNome': context.firma?.pazienteNome || '(empty)',
            });

            // 4. Extract raw HTML from template content
            //    System B (settings editor) may wrap content in __htmlEditor JSON envelope
            //    System A (templates editor) saves plain HTML
            const templateHtml = this._extractTemplateHtml(template.content);

            // === DIAGNOSTIC: Check template for signature markers ===
            const sigMarkers = {
                'firma.medico': templateHtml.includes('firma.medico'),
                'firma.paziente': templateHtml.includes('firma.paziente'),
                'firma.medicoImg': templateHtml.includes('firma.medicoImg'),
                'firma.pazienteImg': templateHtml.includes('firma.pazienteImg'),
                'medico.firma': templateHtml.includes('medico.firma'),
                'paziente.firma': templateHtml.includes('paziente.firma'),
                anySignatureMarker: /firma|signature|firmaImg/i.test(templateHtml),
                templateLength: templateHtml.length,
                templateId: template.id,
                templateName: template.name
            };
            const hasAnySigMarker = sigMarkers.anySignatureMarker;
            logger.info(`[FIRMA-DIAG] Step 4: Template "${template.name}" (${templateHtml.length} chars) — signature markers: ${hasAnySigMarker ? 'FOUND' : 'NONE'} [firma.medico=${sigMarkers['firma.medico']}, firma.paziente=${sigMarkers['firma.paziente']}, medicoImg=${sigMarkers['firma.medicoImg']}, pazienteImg=${sigMarkers['firma.pazienteImg']}]`, {
                component: 'VisitaRefertoService',
                visitaId,
                ...sigMarkers
            });

            // 4b. AUTO-INJECT signature section if template has no signature markers
            //     Ensures signatures always appear in the PDF even if the template
            //     wasn't configured with MarkerPicker signature blocks
            let finalTemplateHtml = templateHtml;
            const hasMedicoSig = context.firma?.medico && context.firma.medico.length > 50;
            const hasPazienteSig = context.firma?.paziente && context.firma.paziente.length > 50;

            if (!hasAnySigMarker && (hasMedicoSig || hasPazienteSig)) {
                logger.info(`[FIRMA-DIAG] Step 4b: Template has NO signature markers but signatures are available — AUTO-INJECTING signature section (medico: ${hasMedicoSig ? 'YES' : 'NO'}, paziente: ${hasPazienteSig ? 'YES' : 'NO'})`);

                const sigSection = this._buildAutoSignatureSection(context);
                // Inject before </body> if present, otherwise append
                if (finalTemplateHtml.includes('</body>')) {
                    finalTemplateHtml = finalTemplateHtml.replace('</body>', `${sigSection}</body>`);
                } else {
                    finalTemplateHtml += sigSection;
                }
            } else if (!hasAnySigMarker && !hasMedicoSig && !hasPazienteSig) {
                logger.info('[FIRMA-DIAG] Step 4b: Template has no signature markers AND no signatures available — skipping auto-inject');
            }

            // 5. Strip NEVER fields from template HTML before marker resolution
            //    This ensures that fields set to NEVER in visit-templates do NOT appear
            //    in the PDF even if the HTML template doesn't use {{#if}} wrappers
            const preprocessedHtml = this._stripNeverFieldsFromTemplate(finalTemplateHtml, printOptionsMap);

            // === DIAGNOSTIC: Check if preprocessing removed signature markers ===
            const sigMarkersAfterPreprocess = /firma|signature|firmaImg/i.test(preprocessedHtml);
            if (/firma|signature|firmaImg/i.test(finalTemplateHtml) && !sigMarkersAfterPreprocess) {
                logger.warn('[FIRMA-DIAG] Step 5: CRITICAL — Preprocessing REMOVED all signature markers!', {
                    component: 'VisitaRefertoService',
                    visitaId,
                    templateLengthBefore: templateHtml.length,
                    templateLengthAfter: preprocessedHtml.length
                });
            }

            // 6. Risolvi marker nel template
            const resolvedHtml = this._resolveMarkers(preprocessedHtml, context);

            // === DIAGNOSTIC: Check resolved HTML for signature images ===
            const hasResolvedSigImg = /<img[^>]*(?:firma|sig|Firma)[^>]*>/i.test(resolvedHtml);
            const hasDataUriInResolved = /data:image\/[a-z+]+;base64,.{50,}/i.test(resolvedHtml);
            const sigPlaceholderCount = (resolvedHtml.match(/sig-placeholder/g) || []).length;
            logger.info(`[FIRMA-DIAG] Step 6: Resolved HTML (${resolvedHtml.length} chars) — hasSignatureImg: ${hasResolvedSigImg}, hasDataUri: ${hasDataUriInResolved}, placeholders: ${sigPlaceholderCount}`, {
                component: 'VisitaRefertoService',
                visitaId,
                hasSignatureImg: hasResolvedSigImg,
                hasDataUri: hasDataUriInResolved,
                sigPlaceholderCount,
                resolvedHtmlLength: resolvedHtml.length,
                // Extract the signature section snippet for debugging
                signatureSnippet: (() => {
                    const idx = resolvedHtml.toLowerCase().indexOf('firma');
                    if (idx === -1) return '(no "firma" found in resolved HTML)';
                    return resolvedHtml.substring(Math.max(0, idx - 100), idx + 300);
                })()
            });

            // 7. Genera PDF
            const pdfBuffer = await pdfService.generatePDF(resolvedHtml, {
                format: 'A4',
                margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
                printBackground: true
            });

            // 8. Genera filename GDPR-compliant
            const { gdprFilename, displayFilename } = this._generateFilenames(visita);

            // 9. Salva il file
            const { filepath, fileUrl } = await storageService.saveFile(
                pdfBuffer,
                gdprFilename,
                'referti'
            );

            // 10. Calcola hash per integrità
            const fileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

            // 11. Salva metadata in GeneratedDocument
            const document = await prisma.generatedDocument.create({
                data: {
                    templateId: template.id,
                    templateVersion: template.version || 1,
                    type: 'VISITA_MEDICA',
                    entityType: 'VISITA',
                    entityId: visitaId,
                    filename: gdprFilename,
                    filepath,
                    fileUrl,
                    fileSize: pdfBuffer.length,
                    fileHash,
                    mimeType: 'application/pdf',
                    markers: context,
                    metadata: {
                        displayFilename,
                        pazienteId: visita.pazienteId,
                        medicoId: visita.medicoId,
                        dataVisita: visita.dataOra.toISOString(),
                        generatedAt: new Date().toISOString()
                    },
                    status: 'GENERATED',
                    tenantId,
                    generatedBy: userId
                }
            });

            if (visita.isVisitaSecundaria && visita.appPrestazioneId) {
                await prisma.$transaction([
                    prisma.appuntamentoPrestazione.updateMany({
                        where: {
                            id: visita.appPrestazioneId,
                            tenantId,
                            deletedAt: null,
                            stato: { not: 'REFERTATA' }
                        },
                        data: {
                            stato: 'REFERTATA',
                            dataEsecuzione: new Date()
                        }
                    }),
                    prisma.movimentoContabile.updateMany({
                        where: {
                            tenantId,
                            appPrestazioneId: visita.appPrestazioneId,
                            direzione: { in: ['ENTRATA', 'USCITA'] },
                            stato: 'BOZZA',
                            deletedAt: null
                        },
                        data: {
                            stato: 'DA_FATTURARE',
                            updatedAt: new Date()
                        }
                    })
                ]);
            }

            // 11. Aggiorna visita con riferimento al documento (opzionale - per accesso veloce)
            logger.info('PDF referto generato con successo', {
                component: 'VisitaRefertoService',
                visitaId,
                documentId: document.id,
                filepath,
                fileSize: pdfBuffer.length,
                displayFilename
            });

            // Build signature warnings for the API response
            const signatureWarnings = [];
            if (!signatures.medicoImageUrl) {
                signatureWarnings.push('Firma medico non presente. Il medico deve salvare la propria firma dalle impostazioni o dalla scheda firma in visita.');
            }
            if (!signatures.pazienteImageUrl) {
                signatureWarnings.push('Firma paziente non presente. Utilizzare la scheda "Firma Paziente" nella visita per acquisire la firma.');
            }

            return {
                success: true,
                documentId: document.id,
                filepath,
                fileUrl,
                displayFilename,
                gdprFilename,
                fileSize: pdfBuffer.length,
                generatedAt: new Date().toISOString(),
                warnings: signatureWarnings.length > 0 ? signatureWarnings : undefined
            };

        } catch (error) {
            logger.error('Errore generazione PDF referto', {
                component: 'VisitaRefertoService',
                error: error.message,
                visitaId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Ottiene l'ultimo PDF generato per una visita
     * 
     * @param {string} visitaId - ID della visita
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<Object|null>} - Documento o null
     */
    static async getLatestReferto(visitaId, tenantId) {
        try {
            const document = await prisma.generatedDocument.findFirst({
                where: {
                    entityType: 'VISITA',
                    entityId: visitaId,
                    tenantId,
                    deletedAt: null
                },
                orderBy: { generatedAt: 'desc' }
            });

            if (!document) {
                return null;
            }

            return {
                id: document.id,
                fileUrl: document.fileUrl,
                filepath: document.filepath,
                displayFilename: document.metadata?.displayFilename || document.filename,
                createdAt: document.generatedAt
            };
        } catch (error) {
            logger.error('Errore recupero referto', {
                component: 'VisitaRefertoService',
                error: error.message,
                visitaId
            });
            throw error;
        }
    }

    /**
     * Elimina il PDF precedente quando viene generata una nuova versione
     * 
     * @param {string} visitaId - ID della visita
     * @param {string} tenantId - ID del tenant
     */
    static async softDeletePreviousReferti(visitaId, tenantId) {
        try {
            await prisma.generatedDocument.updateMany({
                where: {
                    entityType: 'VISITA',
                    entityId: visitaId,
                    tenantId,
                    deletedAt: null
                },
                data: {
                    deletedAt: new Date()
                }
            });

            logger.info('Referti precedenti soft-deleted', {
                component: 'VisitaRefertoService',
                visitaId,
                tenantId
            });
        } catch (error) {
            logger.error('Errore soft delete referti', {
                component: 'VisitaRefertoService',
                error: error.message,
                visitaId
            });
            throw error;
        }
    }

    // ========================================
    // PRIVATE METHODS
    // ========================================

    /**
     * Carica la visita completa con tutte le relazioni necessarie
     * @private
     */
    static async _loadVisitaCompleta(visitaId, tenantId) {
        return prisma.visita.findFirst({
            where: {
                id: visitaId,
                tenantId,
                deletedAt: null
            },
            include: {
                paziente: {
                    include: {
                        tenantProfiles: {
                            where: { tenantId, deletedAt: null, isActive: true },
                            select: {
                                email: true,
                                phone: true,
                                residenceAddress: true,
                                residenceCity: true,
                                postalCode: true,
                                province: true,
                                isPrimary: true
                            },
                            take: 1
                        }
                    }
                },
                medico: {
                    include: {
                        tenantProfiles: {
                            where: { tenantId, deletedAt: null, isActive: true },
                            select: {
                                email: true,
                                phone: true,
                                specialties: true,
                                registerCode: true,
                                isPrimary: true
                            },
                            take: 1
                        }
                    }
                },
                medicoRefertante: {
                    include: {
                        tenantProfiles: {
                            where: { tenantId, deletedAt: null, isActive: true },
                            select: {
                                email: true,
                                phone: true,
                                specialties: true,
                                registerCode: true,
                                isPrimary: true
                            },
                            take: 1
                        }
                    }
                },
                prestazione: true,
                ambulatorio: true,
                visitTemplate: true
            }
        });
    }

    /**
     * Carica il template di stampa con logica gerarchica:
     * 1. Se la visita ha visitTemplate con printConfig.printTemplateId → usa quello
     * 2. Cerca un template default per medico/prestazione/tenant con printTemplateId
     * 3. Fallback: cerca TemplateLink di tipo VISITA_MEDICA
     * 
     * Also returns the resolved VisitTemplate fields for NEVER/ALWAYS filtering.
     * Priority: visita's directly linked VisitTemplate > hierarchically resolved one.
     * 
     * @param {Object} visita - Visita completa con visitTemplate
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<{templateLink: Object|null, resolvedFields: Array}>}
     * @private
     */
    static async _loadPrintTemplate(visita, tenantId) {
        let resolvedVisitTemplateFields = visita.visitTemplate?.fields || [];

        // 1. Se la visita ha un template associato con printTemplateId, usa quello
        if (visita.visitTemplate?.printConfig?.printTemplateId) {
            const templateLink = await prisma.templateLink.findFirst({
                where: { id: visita.visitTemplate.printConfig.printTemplateId, deletedAt: null }
            });
            if (templateLink && !templateLink.deletedAt) {
                logger.info('Template di stampa trovato da VisitTemplate', {
                    component: 'VisitaRefertoService',
                    templateLinkId: templateLink.id,
                    templateLinkName: templateLink.name,
                    visitTemplateId: visita.visitTemplate.id,
                    resolvedFieldsCount: resolvedVisitTemplateFields.length
                });
                return { templateLink, resolvedFields: resolvedVisitTemplateFields };
            }
        }

        // 2. Cerca un VisitTemplate per medico/prestazione con printTemplateId
        //    Also use its fields if the visita doesn't have a directly linked template
        const visitTemplate = await prisma.visitTemplate.findFirst({
            where: {
                OR: [
                    // Match esatto medico + prestazione
                    {
                        medicoId: visita.medicoId,
                        prestazioneId: visita.prestazioneId,
                        tenantId,
                        deletedAt: null,
                        isActive: true
                    },
                    // Solo medico (template default del medico)
                    {
                        medicoId: visita.medicoId,
                        prestazioneId: null,
                        tenantId,
                        deletedAt: null,
                        isActive: true
                    },
                    // Template GLOBAL per prestazione
                    {
                        scope: 'GLOBAL',
                        prestazioneId: visita.prestazioneId,
                        tenantId,
                        deletedAt: null,
                        isActive: true
                    },
                    // Template GLOBAL generico
                    {
                        scope: 'GLOBAL',
                        prestazioneId: null,
                        tenantId,
                        deletedAt: null,
                        isActive: true
                    }
                ]
            },
            orderBy: [
                // Priorità: medico+prestazione > medico > global+prestazione > global
                { prestazioneId: 'desc' }, // Non-null first
                { medicoId: 'desc' } // Non-null first
            ]
        });

        // Use hierarchically resolved fields if the visita doesn't have its own template
        if (visitTemplate?.fields && Array.isArray(visitTemplate.fields) && visitTemplate.fields.length > 0) {
            if (resolvedVisitTemplateFields.length === 0) {
                // Visita has no template — use hierarchical one
                resolvedVisitTemplateFields = visitTemplate.fields;
                logger.info('Using hierarchical VisitTemplate fields for NEVER filtering', {
                    component: 'VisitaRefertoService',
                    visitTemplateId: visitTemplate.id,
                    visitTemplateName: visitTemplate.name,
                    fieldsCount: resolvedVisitTemplateFields.length
                });
            } else {
                // Merge: hierarchical printOptions override visita's if stricter (NEVER wins)
                const hierMap = {};
                for (const f of visitTemplate.fields) {
                    if (f.name) hierMap[f.name] = f.printOptions?.include || 'IF_VALUED';
                }
                resolvedVisitTemplateFields = resolvedVisitTemplateFields.map(f => {
                    if (f.name && hierMap[f.name] === 'NEVER' && f.printOptions?.include !== 'NEVER') {
                        return { ...f, printOptions: { ...f.printOptions, include: 'NEVER' } };
                    }
                    return f;
                });
            }
        }

        if (visitTemplate?.printConfig?.printTemplateId) {
            const templateLink = await prisma.templateLink.findFirst({
                where: { id: visitTemplate.printConfig.printTemplateId, deletedAt: null }
            });
            if (templateLink && !templateLink.deletedAt) {
                logger.info('Template di stampa trovato da VisitTemplate gerarchico', {
                    component: 'VisitaRefertoService',
                    templateLinkId: templateLink.id,
                    templateLinkName: templateLink.name,
                    visitTemplateId: visitTemplate.id,
                    visitTemplateName: visitTemplate.name,
                    resolvedFieldsCount: resolvedVisitTemplateFields.length
                });
                return { templateLink, resolvedFields: resolvedVisitTemplateFields };
            }
        }

        // 3. Fallback: cerca TemplateLink di tipo VISITA_MEDICA
        const fallbackTemplate = await prisma.templateLink.findFirst({
            where: {
                type: 'VISITA_MEDICA',
                tenantId,
                deletedAt: null
            }
        });

        if (fallbackTemplate) {
            logger.info('Template di stampa trovato come fallback (VISITA_MEDICA)', {
                component: 'VisitaRefertoService',
                templateLinkId: fallbackTemplate.id,
                templateLinkName: fallbackTemplate.name,
                resolvedFieldsCount: resolvedVisitTemplateFields.length
            });
        } else {
            logger.warn('Nessun template di stampa trovato', {
                component: 'VisitaRefertoService',
                visitaId: visita.id,
                medicoId: visita.medicoId,
                prestazioneId: visita.prestazioneId,
                tenantId
            });
        }

        return { templateLink: fallbackTemplate, resolvedFields: resolvedVisitTemplateFields };
    }

    /**
     * Carica le firme digitali del medico e del paziente per la visita
     * @private
     * @param {Object} visita - Visita con medico e paziente
     * @param {string} tenantId - Tenant ID
     * @param {string} [userId] - ID dell'utente che genera il referto (fallback per firma medico)
     * @returns {Promise<Object>} - { medicoImageUrl, pazienteImageUrl, medicoNome, pazienteNome }
     */
    static async _loadSignatures(visita, tenantId, userId = null) {
        const result = {
            medicoImageUrl: '',
            pazienteImageUrl: '',
            medicoNome: '',
            pazienteNome: ''
        };

        try {
            // Load most recent active signature for medico (refertante takes priority)
            const effectiveMedicoId = visita.medicoRefertanteId || visita.medicoId;

            // Build list of candidate firmatario IDs to search (priority order)
            const medicoSearchIds = [...new Set([
                effectiveMedicoId,
                visita.medicoId,
                userId
            ].filter(Boolean))];

            if (medicoSearchIds.length > 0) {
                // Search for the most recent FIRMATO signature with image from candidate IDs
                let medicoFirma = await prisma.firmaDigitale.findFirst({
                    where: {
                        firmatarioId: { in: medicoSearchIds },
                        tenantId,
                        stato: 'FIRMATO',
                        deletedAt: null,
                        firmaImageUrl: { not: null }
                    },
                    orderBy: { createdAt: 'desc' },
                    select: { firmaImageUrl: true, firmatarioId: true, id: true, createdAt: true }
                });

                // Fallback 1: try by firmatarioRole MEDICO (any stato with image)
                if (!medicoFirma && effectiveMedicoId) {
                    medicoFirma = await prisma.firmaDigitale.findFirst({
                        where: {
                            firmatarioId: effectiveMedicoId,
                            tenantId,
                            firmatarioRole: 'MEDICO',
                            deletedAt: null,
                            firmaImageUrl: { not: null }
                        },
                        orderBy: { createdAt: 'desc' },
                        select: { firmaImageUrl: true, firmatarioId: true, id: true, createdAt: true }
                    });
                }

                // Fallback 2: search ANY non-deleted signature with image for these IDs
                if (!medicoFirma) {
                    medicoFirma = await prisma.firmaDigitale.findFirst({
                        where: {
                            firmatarioId: { in: medicoSearchIds },
                            tenantId,
                            deletedAt: null,
                            firmaImageUrl: { not: null }
                        },
                        orderBy: { createdAt: 'desc' },
                        select: { firmaImageUrl: true, firmatarioId: true, id: true, createdAt: true }
                    });
                }

                // Fallback 3: CROSS-TENANT search — signatures may have been saved with admin's
                // home tenantId instead of the operated tenant (pre-fix bug). Search without tenantId filter.
                if (!medicoFirma) {
                    medicoFirma = await prisma.firmaDigitale.findFirst({
                        where: {
                            firmatarioId: { in: medicoSearchIds },
                            deletedAt: null,
                            firmaImageUrl: { not: null }
                        },
                        orderBy: { createdAt: 'desc' },
                        select: { firmaImageUrl: true, firmatarioId: true, id: true, createdAt: true }
                    });
                    if (medicoFirma) {
                        logger.warn('[FIRMA-DIAG] Medico signature found via CROSS-TENANT fallback — signature was likely saved with wrong tenantId', {
                            component: 'VisitaRefertoService',
                            firmaId: medicoFirma.id,
                            searchedTenantId: tenantId,
                            searchIds: medicoSearchIds
                        });
                    }
                }

                // Diagnostic: count total signatures for debug
                const medicoSignatureCount = await prisma.firmaDigitale.count({
                    where: {
                        firmatarioId: { in: medicoSearchIds },
                        tenantId,
                        deletedAt: null
                    }
                });

                logger.info(`Loaded medico signature for PDF — found: ${!!medicoFirma}, hasUrl: ${!!medicoFirma?.firmaImageUrl}, urlLength: ${medicoFirma?.firmaImageUrl?.length || 0}, totalInDb: ${medicoSignatureCount}`, {
                    component: 'VisitaRefertoService',
                    effectiveMedicoId,
                    searchIds: medicoSearchIds,
                    tenantId,
                    found: !!medicoFirma,
                    hasUrl: !!medicoFirma?.firmaImageUrl,
                    urlLength: medicoFirma?.firmaImageUrl?.length || 0,
                    urlPrefix: medicoFirma?.firmaImageUrl?.substring(0, 50) || null,
                    matchedFirmatarioId: medicoFirma?.firmatarioId || null,
                    firmaId: medicoFirma?.id || null,
                    totalSignaturesInDb: medicoSignatureCount,
                    visitaMedicoId: visita.medicoId,
                    visitaMedicoRefertanteId: visita.medicoRefertanteId || null,
                    userId
                });

                if (medicoFirma?.firmaImageUrl && medicoFirma.firmaImageUrl.length > 20) {
                    // Detect truncated signatures (from legacy applyGraphometricSignature bug)
                    if (medicoFirma.firmaImageUrl.endsWith('...') || medicoFirma.firmaImageUrl.length < 200) {
                        logger.warn('[FIRMA-DIAG] Medico signature appears TRUNCATED — likely stored with bug in applyGraphometricSignature. Skipping.', {
                            component: 'VisitaRefertoService',
                            firmaId: medicoFirma.id,
                            urlLength: medicoFirma.firmaImageUrl.length,
                            urlSuffix: medicoFirma.firmaImageUrl.slice(-20)
                        });
                    } else {
                        // Normalize data URI format for Puppeteer
                        result.medicoImageUrl = this._normalizeDataUri(medicoFirma.firmaImageUrl);
                    }
                }
                const medico = visita.medicoRefertante || visita.medico || {};
                result.medicoNome = formatMedicoName(medico);
            }

            // Load most recent active signature for paziente
            if (visita.pazienteId) {
                let pazienteFirma = await prisma.firmaDigitale.findFirst({
                    where: {
                        firmatarioId: visita.pazienteId,
                        tenantId,
                        stato: 'FIRMATO',
                        deletedAt: null,
                        firmaImageUrl: { not: null }
                    },
                    orderBy: { createdAt: 'desc' },
                    select: { firmaImageUrl: true, id: true }
                });

                // Fallback 1: by firmatarioRole PAZIENTE
                if (!pazienteFirma) {
                    pazienteFirma = await prisma.firmaDigitale.findFirst({
                        where: {
                            firmatarioId: visita.pazienteId,
                            tenantId,
                            firmatarioRole: 'PAZIENTE',
                            deletedAt: null,
                            firmaImageUrl: { not: null }
                        },
                        orderBy: { createdAt: 'desc' },
                        select: { firmaImageUrl: true, id: true }
                    });
                }

                // Fallback 2: ANY signature with image for this patient
                if (!pazienteFirma) {
                    pazienteFirma = await prisma.firmaDigitale.findFirst({
                        where: {
                            firmatarioId: visita.pazienteId,
                            tenantId,
                            deletedAt: null,
                            firmaImageUrl: { not: null }
                        },
                        orderBy: { createdAt: 'desc' },
                        select: { firmaImageUrl: true, id: true }
                    });
                }

                // Fallback 3: CROSS-TENANT search — patient signature may have been saved
                // with admin's home tenantId instead of the operated tenant (pre-fix bug)
                if (!pazienteFirma) {
                    pazienteFirma = await prisma.firmaDigitale.findFirst({
                        where: {
                            firmatarioId: visita.pazienteId,
                            deletedAt: null,
                            firmaImageUrl: { not: null }
                        },
                        orderBy: { createdAt: 'desc' },
                        select: { firmaImageUrl: true, id: true }
                    });
                    if (pazienteFirma) {
                        logger.warn('[FIRMA-DIAG] Paziente signature found via CROSS-TENANT fallback — signature was likely saved with wrong tenantId', {
                            component: 'VisitaRefertoService',
                            firmaId: pazienteFirma.id,
                            searchedTenantId: tenantId,
                            pazienteId: visita.pazienteId
                        });
                    }
                }

                const pazienteSignatureCount = await prisma.firmaDigitale.count({
                    where: {
                        firmatarioId: visita.pazienteId,
                        tenantId,
                        deletedAt: null
                    }
                });

                logger.info(`Loaded paziente signature for PDF — found: ${!!pazienteFirma}, hasUrl: ${!!pazienteFirma?.firmaImageUrl}, urlLength: ${pazienteFirma?.firmaImageUrl?.length || 0}, totalInDb: ${pazienteSignatureCount}`, {
                    component: 'VisitaRefertoService',
                    pazienteId: visita.pazienteId,
                    tenantId,
                    found: !!pazienteFirma,
                    hasUrl: !!pazienteFirma?.firmaImageUrl,
                    urlLength: pazienteFirma?.firmaImageUrl?.length || 0,
                    urlPrefix: pazienteFirma?.firmaImageUrl?.substring(0, 50) || null,
                    firmaId: pazienteFirma?.id || null,
                    totalSignaturesInDb: pazienteSignatureCount
                });

                if (pazienteFirma?.firmaImageUrl && pazienteFirma.firmaImageUrl.length > 20) {
                    // Detect truncated signatures (from legacy applyGraphometricSignature bug)
                    if (pazienteFirma.firmaImageUrl.endsWith('...') || pazienteFirma.firmaImageUrl.length < 200) {
                        logger.warn('[FIRMA-DIAG] Paziente signature appears TRUNCATED — likely stored with bug in applyGraphometricSignature. Skipping.', {
                            component: 'VisitaRefertoService',
                            firmaId: pazienteFirma.id,
                            urlLength: pazienteFirma.firmaImageUrl.length,
                            urlSuffix: pazienteFirma.firmaImageUrl.slice(-20)
                        });
                    } else {
                        result.pazienteImageUrl = this._normalizeDataUri(pazienteFirma.firmaImageUrl);
                    }
                }
                const paziente = visita.paziente || {};
                result.pazienteNome = `${paziente.lastName || ''} ${paziente.firstName || ''}`.trim();
            }
        } catch (error) {
            logger.warn('Failed to load signatures for PDF', {
                component: 'VisitaRefertoService',
                error: error.message,
                stack: error.stack?.substring(0, 300),
                visitaId: visita.id
            });
        }

        // Summary log for signature loading results
        logger.info(`Signature loading summary — medico: ${result.medicoImageUrl ? `YES (${result.medicoImageUrl.length} chars, dataUri=${result.medicoImageUrl.startsWith('data:')})` : 'NONE'}, paziente: ${result.pazienteImageUrl ? `YES (${result.pazienteImageUrl.length} chars, dataUri=${result.pazienteImageUrl.startsWith('data:')})` : 'NONE'}`, {
            component: 'VisitaRefertoService',
            visitaId: visita.id,
            hasMedicoSignature: !!result.medicoImageUrl,
            hasPazienteSignature: !!result.pazienteImageUrl,
            medicoUrlLength: result.medicoImageUrl?.length || 0,
            pazienteUrlLength: result.pazienteImageUrl?.length || 0,
            medicoIsDataUrl: result.medicoImageUrl?.startsWith('data:') || false,
            pazienteIsDataUrl: result.pazienteImageUrl?.startsWith('data:') || false
        });

        return result;
    }

    /**
     * Normalize a signature image to a proper data URI for Puppeteer PDF rendering
     * @private
     */
    static _normalizeDataUri(imageUrl) {
        if (!imageUrl) return '';

        // Already a proper data URI
        if (imageUrl.startsWith('data:image/')) return imageUrl;

        // Raw base64 without data: prefix
        if (imageUrl.match(/^[A-Za-z0-9+/=]+$/)) {
            return `data:image/png;base64,${imageUrl}`;
        }

        // data: prefix but missing image type
        if (imageUrl.startsWith('data:') && !imageUrl.startsWith('data:image/')) {
            return imageUrl.replace('data:', 'data:image/png;base64,');
        }

        // HTTP/HTTPS URL — return as-is (Puppeteer can fetch it)
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }

        // Fallback: assume base64 PNG
        return `data:image/png;base64,${imageUrl}`;
    }

    /**
     * Costruisce il context per la risoluzione dei marker
     * Rispetta printOptions.include per ogni campo del template:
     * - ALWAYS: include sempre (anche se vuoto)
     * - IF_VALUED: include solo se ha un valore (default)
     * - NEVER: escludi sempre dal PDF
     * @param {Array} [resolvedFields] - Pre-resolved VisitTemplate fields from hierarchical lookup
     * @private
     */
    static _buildPrintContext(visita, tenantRecord = null, signatures = {}, resolvedFields = null) {
        const paziente = visita.paziente || {};
        const pazienteProfile = paziente.tenantProfiles?.[0] || {};
        // Use medicoRefertante if set, otherwise fallback to the visit medico
        const medico = visita.medicoRefertante || visita.medico || {};
        const medicoProfile = medico.tenantProfiles?.[0] || {};
        const prestazione = visita.prestazione || {};
        const ambulatorio = visita.ambulatorio || {};
        const datiStrutturati = visita.datiStrutturati || {};

        // === FILTER datiStrutturati by printOptions ===
        // Use pre-resolved fields (from hierarchical lookup) over visita's directly linked ones
        const templateFields = resolvedFields && resolvedFields.length > 0
            ? resolvedFields
            : (visita.visitTemplate?.fields || []);
        const filteredDatiStrutturati = this._filterFieldsByPrintOptions(
            datiStrutturati,
            templateFields
        );

        // Build lookup: fieldName → printOptions.include value
        // Used to respect NEVER for dedicated Visita columns too
        const printOptionsMap = {};
        for (const field of templateFields) {
            if (field.name) {
                printOptionsMap[field.name] = field.printOptions?.include || 'IF_VALUED';
            }
        }
        // Propagate NEVER to aliases (saturazioneO2 ↔ saturazione)
        if (printOptionsMap['saturazioneO2'] === 'NEVER' && !printOptionsMap['saturazione']) {
            printOptionsMap['saturazione'] = 'NEVER';
        }
        if (printOptionsMap['saturazione'] === 'NEVER' && !printOptionsMap['saturazioneO2']) {
            printOptionsMap['saturazioneO2'] = 'NEVER';
        }

        /**
         * Get a clinical field value respecting printOptions.
         * Checks filteredDatiStrutturati first (already filtered by printOptions),
         * then falls back to dedicated Visita column ONLY if not set to NEVER.
         * For ALWAYS fields, returns '—' placeholder when empty.
         */
        const getClinicalField = (fieldName, dedicatedValue, ...fallbackKeys) => {
            const printOption = printOptionsMap[fieldName];

            // If explicitly set to NEVER in printOptions, exclude regardless of dedicated column
            if (printOption === 'NEVER') return '';

            // Check filtered data first (already respects printOptions)
            // Use explicit null/empty checks — NOT truthiness — so 0 values are preserved
            const filteredVal = filteredDatiStrutturati[fieldName];
            if (filteredVal != null && filteredVal !== '') return filteredVal;

            // Check fallback keys in filteredDatiStrutturati
            for (const key of fallbackKeys) {
                const fbVal = filteredDatiStrutturati[key];
                if (fbVal != null && fbVal !== '') return fbVal;
            }

            // Fall back to dedicated Visita column
            if (dedicatedValue != null && dedicatedValue !== '') return dedicatedValue;

            // For ALWAYS fields, return placeholder so {{#if}} blocks still render
            if (printOption === 'ALWAYS') return '—';

            return '';
        };

        // Tenant data: from Tenant.settings (JSON) + selfCompanyProfile.company
        const tenantSettings = tenantRecord?.settings && typeof tenantRecord.settings === 'object' ? tenantRecord.settings : {};
        const selfCompany = tenantRecord?.selfCompanyProfile?.company || {};
        const selfProfile = tenantRecord?.selfCompanyProfile || {};

        // Formatta la data visita
        const dataVisitaFormatted = format(new Date(visita.dataOra), 'dd/MM/yyyy', { locale: it });
        const oraVisitaFormatted = format(new Date(visita.dataOra), 'HH:mm', { locale: it });
        const dataOggi = format(new Date(), 'dd/MM/yyyy', { locale: it });

        const result = {
            // Tenant (per intestazione documento)
            tenant: {
                nome: selfCompany.ragioneSociale || tenantRecord?.name || '',
                nomeBreve: tenantRecord?.name || '',
                indirizzo: tenantSettings.indirizzo || selfCompany.sedeLegaleIndirizzo || '',
                citta: tenantSettings.citta || selfCompany.sedeLegaleCitta || '',
                cap: selfCompany.sedeLegaleCap || '',
                provincia: selfCompany.sedeLegaleProvincia || '',
                indirizzoCompleto: [
                    tenantSettings.indirizzo || selfCompany.sedeLegaleIndirizzo,
                    selfCompany.sedeLegaleCap,
                    tenantSettings.citta || selfCompany.sedeLegaleCitta,
                    selfCompany.sedeLegaleProvincia ? `(${selfCompany.sedeLegaleProvincia})` : ''
                ].filter(Boolean).join(' '),
                telefono: tenantSettings.telefono || selfProfile.telefonoGenerale || '',
                email: tenantSettings.email || selfProfile.emailGenerale || '',
                pec: selfProfile.pec || '',
                website: tenantSettings.website || '',
                partitaIva: selfCompany.piva || '',
                codiceFiscale: selfCompany.codiceFiscale || '',
                // Both logo and logoUrl are converted to base64 data URLs so that
                // templates using <img src="{{tenant.logo}}"> work in Puppeteer
                // (Puppeteer cannot resolve relative/local paths without a base URL).
                // Uses resolveFirstValidLogo to fallback if primary path (e.g. CMS upload) is missing
                logo: resolveFirstValidLogo(tenantSettings.branches?.MEDICA?.logo, tenantSettings.branches?.FORMAZIONE?.logo, tenantSettings.logoUrl, tenantSettings.logo),
                logoUrl: resolveFirstValidLogo(tenantSettings.branches?.MEDICA?.logo, tenantSettings.branches?.FORMAZIONE?.logo, tenantSettings.logoUrl, tenantSettings.logo),
                branchLogo: resolveFirstValidLogo(tenantSettings.branches?.MEDICA?.logo, tenantSettings.branches?.FORMAZIONE?.logo, tenantSettings.logoUrl),
                logoHtml: (() => {
                    const tenantName = selfCompany.ragioneSociale || tenantRecord?.name || '';
                    const embedded = resolveFirstValidLogo(tenantSettings.branches?.MEDICA?.logo, tenantSettings.branches?.FORMAZIONE?.logo, tenantSettings.logoUrl, tenantSettings.logo);
                    return embedded
                        ? `<img src="${embedded}" alt="${tenantName}" style="max-height:80px;max-width:220px;object-fit:contain;">`
                        : `<span style="font-size:14pt;font-weight:700;color:#1e40af;">${tenantName}</span>`;
                })()
            },

            // Paziente
            paziente: {
                nome: paziente.firstName || '',
                cognome: paziente.lastName || '',
                nomeCompleto: `${paziente.lastName || ''} ${paziente.firstName || ''}`.trim(),
                codiceFiscale: paziente.taxCode || paziente.cf || '',
                dataNascita: paziente.birthDate ? format(new Date(paziente.birthDate), 'dd/MM/yyyy', { locale: it }) : '',
                luogoNascita: paziente.birthPlace || '',
                sesso: paziente.gender || '',
                email: pazienteProfile.email || '',
                telefono: pazienteProfile.phone || '',
                indirizzo: pazienteProfile.residenceAddress || '',
                citta: pazienteProfile.residenceCity || '',
                cap: pazienteProfile.postalCode || '',
                provincia: pazienteProfile.province || '',
                indirizzoCompleto: [
                    pazienteProfile.residenceAddress,
                    pazienteProfile.postalCode,
                    pazienteProfile.residenceCity,
                    pazienteProfile.province ? `(${pazienteProfile.province})` : ''
                ].filter(Boolean).join(' ')
            },

            // Medico (con titolo onorifico italiano)
            medico: {
                nome: medico.firstName || '',
                cognome: medico.lastName || '',
                nomeCompleto: formatMedicoName(medico),
                titolo: getMedicoTitle(medico.gender),
                email: medicoProfile.email || '',
                telefono: medicoProfile.phone || '',
                specializzazione: Array.isArray(medicoProfile.specialties)
                    ? medicoProfile.specialties.join(', ')
                    : (medicoProfile.specialties || ''),
                albo: medicoProfile.registerCode || ''
            },

            // Visita
            visita: {
                id: visita.id,
                data: dataVisitaFormatted,
                ora: oraVisitaFormatted,
                stato: visita.stato || '',
                durata: ''
            },

            // Prestazione
            prestazione: {
                nome: prestazione.nome || '',
                codice: prestazione.codice || '',
                tipo: prestazione.tipo || ''
            },

            // Ambulatorio
            ambulatorio: {
                nome: ambulatorio.nome || '',
                piano: ambulatorio.piano || ''
            },

            // Dati clinici (dal form strutturato, filtrati per printOptions)
            // Uses getClinicalField to: respect NEVER, support ALWAYS placeholder, add fallback keys
            anamnesi: getClinicalField('anamnesi', visita.anamnesi),
            esameObiettivo: getClinicalField('esameObiettivo', visita.esamiObiettivo),
            diagnosiPrincipale: getClinicalField('diagnosiPrincipale', visita.diagnosiPrincipale, 'diagnosi'),
            diagnosiSecondarie: getClinicalField('diagnosiSecondarie', (visita.diagnosiSecondarie || []).join(', ')),
            terapia: getClinicalField('terapia', visita.terapia),
            prescrizioni: getClinicalField('prescrizioni', visita.prescrizioni),
            note: getClinicalField('note', visita.noteClinico),
            prossimoControllo: getClinicalField('prossimoControllo',
                visita.prossimoControllo
                    ? format(new Date(visita.prossimoControllo), 'dd/MM/yyyy', { locale: it })
                    : ''
            ),
            noteFollowup: getClinicalField('noteFollowup', visita.noteFollowup),

            // Parametri vitali (filtrati per printOptions tramite getClinicalField)
            vitali: (() => {
                const v = {
                    peso: getClinicalField('peso'),
                    altezza: getClinicalField('altezza'),
                    bmi: getClinicalField('bmi'),
                    pressioneSistolica: getClinicalField('pressioneSistolica'),
                    pressioneDiastolica: getClinicalField('pressioneDiastolica'),
                    frequenzaCardiaca: getClinicalField('frequenzaCardiaca'),
                    temperatura: getClinicalField('temperatura'),
                    saturazione: getClinicalField('saturazioneO2', null, 'saturazione'),
                    glicemia: getClinicalField('glicemia')
                };
                // hasAny: true if at least one vitali field has a non-empty value
                // Used as outer section guard in templates: {{#if vitali.hasAny}}
                v.hasAny = Object.entries(v).some(([k, val]) => k !== 'hasAny' && val != null && val !== '' && val !== '—');
                return v;
            })(),

            // Firme digitali (context path: firma.medico, firma.paziente)
            // - firma.medico / firma.paziente: raw data URI (for use in <img src="...">)
            // - firma.medicoImg / firma.pazienteImg: complete <img> HTML tag (for MarkerPicker insertion)
            firma: (() => {
                const medicoUrl = signatures.medicoImageUrl || '';
                const pazienteUrl = signatures.pazienteImageUrl || '';
                const medicoNomeFirma = signatures.medicoNome || formatMedicoName(medico);
                const pazienteNomeFirma = signatures.pazienteNome || `${paziente.lastName || ''} ${paziente.firstName || ''}`.trim();
                return {
                    medico: medicoUrl,
                    paziente: pazienteUrl,
                    medicoNome: medicoNomeFirma,
                    pazienteNome: pazienteNomeFirma,
                    // Complete <img> tags for direct insertion via MarkerPicker {{{firma.medicoImg}}}
                    medicoImg: medicoUrl
                        ? `<img src="${medicoUrl}" style="max-width:200px;max-height:80px;object-fit:contain;" alt="Firma ${medicoNomeFirma}">`
                        : '',
                    pazienteImg: pazienteUrl
                        ? `<img src="${pazienteUrl}" style="max-width:200px;max-height:80px;object-fit:contain;" alt="Firma ${pazienteNomeFirma}">`
                        : ''
                };
            })(),

            // Sistema
            current: {
                date: dataOggi,
                year: new Date().getFullYear().toString()
            },

            // Documento
            document: {
                id: visita.id,
                date: dataOggi
            },

            // Campi custom dal template (filtrati per printOptions)
            // Spread only CUSTOM fields not already explicitly set above
            // (prevents overriding ALWAYS '—' placeholders with empty '')
            ...(() => {
                const EXPLICIT_KEYS = new Set([
                    'anamnesi', 'esameObiettivo', 'diagnosiPrincipale', 'diagnosiSecondarie',
                    'terapia', 'prescrizioni', 'note', 'prossimoControllo', 'noteFollowup',
                    'peso', 'altezza', 'bmi', 'pressioneSistolica', 'pressioneDiastolica',
                    'frequenzaCardiaca', 'temperatura', 'saturazioneO2', 'saturazione', 'glicemia'
                ]);
                const custom = {};
                for (const [key, val] of Object.entries(filteredDatiStrutturati)) {
                    if (!EXPLICIT_KEYS.has(key)) custom[key] = val;
                }
                return custom;
            })(),

            // Context aliases for backward-compatible template markers
            diagnosi: getClinicalField('diagnosiPrincipale', visita.diagnosiPrincipale, 'diagnosi'),
            followup: getClinicalField('noteFollowup', visita.noteFollowup)
        };

        // Add tenant English aliases for templates that use {{tenant.name}} etc.
        result.tenant.name = result.tenant.nome;
        result.tenant.address = result.tenant.indirizzoCompleto || result.tenant.indirizzo;
        result.tenant.phone = result.tenant.telefono;
        result.tenant.piva = result.tenant.partitaIva;

        // Add visita aliases for templates that use {{visita.tipo}}, {{visita.prestazione}}
        result.visita.tipo = prestazione.tipo || prestazione.nome || '';
        result.visita.prestazione = prestazione.nome || '';

        // Add firma aliases: MarkerPicker uses medico.firma / paziente.firma
        // but context has firma.medico / firma.paziente — support both paths
        if (!result.medico.firma) result.medico.firma = result.firma.medico;
        if (!result.paziente.firma) result.paziente.firma = result.firma.paziente;
        // Also add img aliases for MarkerPicker direct insertion
        if (!result.medico.firmaImg) result.medico.firmaImg = result.firma.medicoImg;
        if (!result.paziente.firmaImg) result.paziente.firmaImg = result.firma.pazienteImg;

        // === MDL: Medicina del Lavoro — enriched context for Giudizio di Idoneità ===
        // Maps SELECT option values to human-readable Italian labels for Puppeteer templates
        const GIUDIZIO_LABELS = {
            'idoneo': 'IDONEO alla mansione specifica',
            'idoneo_prescrizioni': 'IDONEO PARZIALE con prescrizioni',
            'idoneo_limitazioni': 'IDONEO PARZIALE con limitazioni',
            'idoneo_limitazioni_prescrizioni': 'IDONEO PARZIALE con limitazioni e prescrizioni',
            'temporaneamente_non_idoneo': 'TEMPORANEAMENTE NON IDONEO alla mansione specifica',
            'non_idoneo': 'NON IDONEO alla mansione specifica'
        };
        const rawGiudizio = filteredDatiStrutturati.giudizioIdoneitaMdl || datiStrutturati.giudizioIdoneitaMdl || '';
        result.mdl = {
            // Giudizio di idoneità — raw value + human-readable label
            giudizioValore: rawGiudizio,
            giudizioLabel: GIUDIZIO_LABELS[rawGiudizio] || rawGiudizio,
            // Bool flags for {{#if mdl.isIdoneo}} etc.
            isIdoneo: rawGiudizio === 'idoneo',
            isIdoneoPrescrizioni: rawGiudizio === 'idoneo_prescrizioni',
            isIdoneoLimitazioni: rawGiudizio === 'idoneo_limitazioni',
            isIdoneoLimitazioniPrescrizioni: rawGiudizio === 'idoneo_limitazioni_prescrizioni',
            isTemporaneamenteNonIdoneo: rawGiudizio === 'temporaneamente_non_idoneo',
            isNonIdoneo: rawGiudizio === 'non_idoneo',
            // Other MDL fields (passed through from datiStrutturati)
            prescrizioni: filteredDatiStrutturati.prescrizioniNormativaMdl || datiStrutturati.prescrizioniNormativaMdl || '',
            limitazioni: filteredDatiStrutturati.limitazioniMansioneMdl || datiStrutturati.limitazioniMansioneMdl || '',
            tempistica: filteredDatiStrutturati.tempisticaGiudizioIdoneitaMdl || datiStrutturati.tempisticaGiudizioIdoneitaMdl || '',
            esamiProssimaVisita: filteredDatiStrutturati.esamiProssimaVisita || datiStrutturati.esamiProssimaVisita || '',
            prossimoControllo: filteredDatiStrutturati.prossimoControllo || (
                visita.prossimoControllo ? format(new Date(visita.prossimoControllo), 'dd/MM/yyyy', { locale: it }) : ''
            )
        };

        return { context: result, printOptionsMap };
    }

    /**
     * Filtra i datiStrutturati in base a printOptions dei campi template
     * - ALWAYS: include sempre (anche se vuoto)
     * - IF_VALUED: include solo se ha un valore (default)
     * - NEVER: escludi sempre
     * @private
     */
    static _filterFieldsByPrintOptions(datiStrutturati, templateFields) {
        if (!templateFields || templateFields.length === 0) {
            // Nessun template: include tutto con logica IF_VALUED (default)
            return { ...datiStrutturati };
        }

        // Build lookup: fieldName → printOptions
        const fieldConfig = {};
        for (const field of templateFields) {
            if (field.name) {
                fieldConfig[field.name] = field.printOptions || { include: 'IF_VALUED' };
            }
        }

        const filtered = {};

        // Process template fields
        for (const field of templateFields) {
            if (!field.name) continue;

            const printOpts = field.printOptions || { include: 'IF_VALUED' };
            const value = datiStrutturati[field.name];
            const hasValue = value !== undefined && value !== null && value !== '';

            switch (printOpts.include) {
                case 'ALWAYS':
                    // Include always, even if empty
                    filtered[field.name] = hasValue ? value : '';
                    break;
                case 'NEVER':
                    // Never include in print
                    break;
                case 'IF_VALUED':
                default:
                    // Include only if has value
                    if (hasValue) {
                        filtered[field.name] = value;
                    }
                    break;
            }
        }

        // Also include any datiStrutturati keys NOT in the template
        // (legacy fields, system fields) — use IF_VALUED logic
        // Respect NEVER for known aliases (e.g., saturazione ↔ saturazioneO2)
        const NEVER_ALIASES = {
            'saturazione': 'saturazioneO2',
            'saturazioneO2': 'saturazione'
        };
        for (const key of Object.keys(datiStrutturati)) {
            if (!(key in fieldConfig) && !(key in filtered)) {
                // Check if this key is an alias of a NEVER field
                const aliasedField = NEVER_ALIASES[key];
                if (aliasedField && fieldConfig[aliasedField]?.include === 'NEVER') {
                    continue; // Skip: alias of a NEVER field
                }
                const value = datiStrutturati[key];
                if (value !== undefined && value !== null && value !== '') {
                    filtered[key] = value;
                }
            }
        }

        return filtered;
    }

    /**
     * Preprocessa il template HTML per rimuovere i campi con printOptions NEVER.
     * 
     * Strategia multi-livello:
     * 1. Rimuove blocchi {{#if neverField}}...{{/if}} per intero
     * 2. Per marker bare (senza {{#if}} wrapper), trova il parent HTML block element
     *    che contiene solo quel marker e lo rimuove
     * 3. Rimuove marker residui {{neverField}} e {{{neverField}}}
     * 
     * Questo garantisce che le impostazioni di stampa in visit-templates
     * prevalgano sulla struttura del template HTML.
     * 
     * @private
     * @param {string} templateHtml - HTML del template con marker
     * @param {Object} printOptionsMap - fieldName → 'ALWAYS'|'IF_VALUED'|'NEVER'
     * @returns {string} - HTML preprocessato senza campi NEVER
     */
    static _stripNeverFieldsFromTemplate(templateHtml, printOptionsMap) {
        if (!templateHtml || !printOptionsMap) return templateHtml || '';

        let html = templateHtml;

        // Collect all NEVER field names
        const neverFields = Object.entries(printOptionsMap)
            .filter(([, option]) => option === 'NEVER')
            .map(([fieldName]) => fieldName);

        if (neverFields.length === 0) return html;

        // Build all marker paths to strip for each NEVER field:
        // - flat: "peso"
        // - prefixed: "vitali.peso" (vital signs in default template)
        // - aliases: "saturazione" for "saturazioneO2"
        const VITALI_FIELDS = [
            'peso', 'altezza', 'bmi', 'pressioneSistolica', 'pressioneDiastolica',
            'frequenzaCardiaca', 'temperatura', 'saturazioneO2', 'saturazione', 'glicemia'
        ];
        const ALIAS_MAP = {
            'saturazioneO2': 'saturazione',
            'saturazione': 'saturazioneO2'
        };

        const allPaths = new Set();
        for (const fieldName of neverFields) {
            allPaths.add(fieldName);
            // Add vitali.X prefix for vital parameter fields
            if (VITALI_FIELDS.includes(fieldName)) {
                allPaths.add(`vitali.${fieldName}`);
            }
            // Add aliases (saturazioneO2 ↔ saturazione)
            if (ALIAS_MAP[fieldName]) {
                allPaths.add(ALIAS_MAP[fieldName]);
                if (VITALI_FIELDS.includes(ALIAS_MAP[fieldName])) {
                    allPaths.add(`vitali.${ALIAS_MAP[fieldName]}`);
                }
            }
        }

        logger.info('Stripping NEVER fields from template', {
            component: 'VisitaRefertoService',
            neverFields,
            allPaths: [...allPaths],
            templateLength: html.length
        });

        // Step 1: Remove {{#if neverField}}...{{/if}} blocks using STACK-BASED parsing
        // This correctly handles nested blocks unlike simple regex.
        for (const markerPath of allPaths) {
            html = this._removeConditionalBlocksForField(html, markerPath);
        }

        // Step 2: Remove parent HTML block elements that contain only the NEVER marker
        for (const markerPath of allPaths) {
            const escaped = markerPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            const blockTags = ['div', 'p', 'tr', 'li', 'section', 'span', 'td'];
            for (const tag of blockTags) {
                const parentRegex = new RegExp(
                    `<${tag}[^>]*>[^<]*(?:\\{\\{\\{?${escaped}\\}?\\}\\})[^<]*</${tag}>`,
                    'gi'
                );
                html = html.replace(parentRegex, '');
            }

            // Also match nested HTML structures containing only the marker
            // e.g., <div class="vitali-item"><div class="vitali-value">{{vitali.peso}} <span>kg</span></div><div class="vitali-label">Peso</div></div>
            for (const tag of blockTags) {
                const nestedRegex = new RegExp(
                    `<${tag}[^>]*>(?:<[^>]*>)*[^<]*\\{\\{\\{?${escaped}\\}?\\}\\}[\\s\\S]*?</${tag}>`,
                    'gi'
                );
                html = html.replace(nestedRegex, (match) => {
                    // Only remove if this element doesn't contain OTHER markers
                    const otherMarkers = match.match(/\{\{(?!#|\/|else)[^}]+\}\}/g) || [];
                    const selfMarkers = otherMarkers.filter(m =>
                        m.includes(markerPath) || m.includes(markerPath.replace('vitali.', ''))
                    );
                    // If ALL markers in this element are for the NEVER field, remove it
                    if (otherMarkers.length === selfMarkers.length) return '';
                    return match;
                });
            }
        }

        // Step 3: Remove any remaining bare markers for NEVER fields
        for (const markerPath of allPaths) {
            const escaped = markerPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            html = html.replace(new RegExp(`\\{\\{\\{${escaped}\\}\\}\\}`, 'g'), '');
            html = html.replace(new RegExp(`\\{\\{${escaped}\\}\\}`, 'g'), '');
        }

        // Step 4: Clean up empty rows/sections left behind
        html = html.replace(/<tr[^>]*>\s*(<td[^>]*>\s*<\/td>\s*)*<\/tr>/gi, '');
        html = html.replace(/<p[^>]*>\s*<\/p>/gi, '');
        html = html.replace(/<div[^>]*>\s*<\/div>/gi, (match) => {
            if (/class\s*=\s*["'][^"']*(?:break|separator|spacer|line|sig|firma)[^"']*["']/i.test(match)) {
                return match;
            }
            return '';
        });
        // Second pass: clean up empty divs that may have been created by first pass
        html = html.replace(/<div[^>]*>\s*<\/div>/gi, (match) => {
            if (/class\s*=\s*["'][^"']*(?:break|separator|spacer|line|wrapper|grid|sig|firma)[^"']*["']/i.test(match)) {
                return match;
            }
            return '';
        });

        return html;
    }

    /**
     * Remove all {{#if fieldPath}}...{{/if}} blocks for a specific field
     * using stack-based parsing to handle nesting correctly.
     * @private
     */
    static _removeConditionalBlocksForField(html, fieldPath) {
        const openPattern = `{{#if ${fieldPath}}}`;
        let result = html;
        let maxIterations = 20;

        while (result.includes(openPattern) && maxIterations-- > 0) {
            const openIdx = result.indexOf(openPattern);
            if (openIdx === -1) break;

            const afterOpen = openIdx + openPattern.length;

            // Stack-based: find the matching {{/if}} respecting nesting
            let depth = 1;
            let pos = afterOpen;
            while (depth > 0 && pos < result.length) {
                const nextOpen = result.indexOf('{{#if', pos);
                const nextClose = result.indexOf('{{/if}}', pos);

                if (nextClose === -1) break; // malformed template

                if (nextOpen !== -1 && nextOpen < nextClose) {
                    depth++;
                    pos = nextOpen + 5; // skip past "{{#if"
                } else {
                    depth--;
                    if (depth === 0) {
                        // Found the matching {{/if}} — remove entire block
                        result = result.substring(0, openIdx) + result.substring(nextClose + '{{/if}}'.length);
                    } else {
                        pos = nextClose + '{{/if}}'.length;
                    }
                }
            }
        }

        return result;
    }

    /**
     * Extract raw HTML from template content.
     * System B (settings/templates editor) may wrap content in __htmlEditor JSON envelope.
     * System A (/templates/:id) saves plain HTML. This method handles both.
     * @private
     */
    static _extractTemplateHtml(content) {
        if (!content) return '';

        // Try to detect JSON wrapping
        const trimmed = content.trim();
        if (trimmed.startsWith('{') && trimmed.includes('__htmlEditor')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (parsed.__htmlEditor && parsed.rawHtml) {
                    logger.info('Extracted rawHtml from __htmlEditor JSON envelope', {
                        component: 'VisitaRefertoService',
                        rawHtmlLength: parsed.rawHtml.length
                    });
                    return parsed.rawHtml;
                }
            } catch {
                // Not valid JSON, treat as raw HTML
            }
        }

        // Also handle __slideEditor (not expected for VISITA_MEDICA but be safe)
        if (trimmed.startsWith('{') && trimmed.includes('__slideEditor')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (parsed.__slideEditor) {
                    logger.warn('Template content is slide format, cannot generate PDF from slides', {
                        component: 'VisitaRefertoService'
                    });
                    return '';
                }
            } catch {
                // Not valid JSON, treat as raw HTML
            }
        }

        // Plain HTML content
        return content;
    }

    /**
     * Builds an auto-injected signature section for templates that don't have
     * explicit signature markers. Ensures signatures always appear in the PDF.
     * Uses raw context values (pre-resolved, not Handlebars markers).
     * @private
     * @param {Object} context - The full print context from _buildPrintContext
     * @returns {string} HTML signature section to append
     */
    static _buildAutoSignatureSection(context) {
        const medicoUrl = context.firma?.medico || '';
        const pazienteUrl = context.firma?.paziente || '';
        const medicoNome = context.firma?.medicoNome || '';
        const pazienteNome = context.firma?.pazienteNome || '';
        const dataOggi = context.current?.date || '';

        const medicoBlock = medicoUrl
            ? `<div style="text-align:center;">
                <img src="${medicoUrl}" style="max-width:200px;max-height:80px;object-fit:contain;" alt="Firma ${medicoNome}">
                <div style="margin-top:4px;font-size:11px;font-weight:600;">${medicoNome}</div>
                <div style="font-size:9px;color:#666;">Il Medico Competente</div>
              </div>`
            : `<div style="text-align:center;">
                <div style="width:200px;height:60px;border-bottom:1px solid #333;margin:0 auto;"></div>
                <div style="margin-top:4px;font-size:11px;font-weight:600;">${medicoNome || 'Il Medico'}</div>
                <div style="font-size:9px;color:#666;">Il Medico Competente</div>
              </div>`;

        const pazienteBlock = pazienteUrl
            ? `<div style="text-align:center;">
                <img src="${pazienteUrl}" style="max-width:200px;max-height:80px;object-fit:contain;" alt="Firma ${pazienteNome}">
                <div style="margin-top:4px;font-size:11px;font-weight:600;">${pazienteNome}</div>
                <div style="font-size:9px;color:#666;">Il Paziente</div>
              </div>`
            : `<div style="text-align:center;">
                <div style="width:200px;height:60px;border-bottom:1px solid #333;margin:0 auto;"></div>
                <div style="margin-top:4px;font-size:11px;font-weight:600;">${pazienteNome || 'Il Paziente'}</div>
                <div style="font-size:9px;color:#666;">Il Paziente</div>
              </div>`;

        return `
<!-- Auto-injected signature section -->
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;page-break-inside:avoid;">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:40px;">
    ${medicoBlock}
    <div style="text-align:center;font-size:10px;color:#888;padding-bottom:10px;">
      Data: ${dataOggi}
    </div>
    ${pazienteBlock}
  </div>
</div>`;
    }

    /**
     * Risolve i marker nel template HTML
     * Supporta:
     * - {{path.to.value}} — output escaped
     * - {{{path.to.value}}} — output raw HTML (triple-stache)
     * - {{#if path}}...{{/if}} — conditional blocks
     * - {{#if path}}...{{else}}...{{/if}} — conditional with else
     * @private
     */
    static _resolveMarkers(template, context) {
        if (!template) return '';

        let html = template;

        // Step 1: Process {{#if}}...{{else}}...{{/if}} and {{#if}}...{{/if}} blocks
        // Using iterative stack-based parser to handle nesting correctly
        html = this._processConditionals(html, context);

        // Step 2: Process {{{path}}} triple-stache (raw HTML output)
        const tripleRegex = /\{\{\{([^}]+)\}\}\}/g;
        html = html.replace(tripleRegex, (match, path) => {
            const value = this._resolveContextPath(path.trim(), context);
            return value != null ? String(value) : '';
        });

        // Step 3: Process {{path}} double-stache (escaped output)
        const doubleRegex = /\{\{([^#/][^}]*)\}\}/g;
        html = html.replace(doubleRegex, (match, path) => {
            const value = this._resolveContextPath(path.trim(), context);
            if (value == null) return '';
            // Escape HTML for security
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        });

        // Step 4: Fix bare data URIs not inside <img src="...">
        // Old templates with {{{firma.medico}}} output raw data URI text — wrap in <img>
        html = html.replace(
            /(data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]{50,})/g,
            (match, dataUri, offset) => {
                // Check if this data URI is already inside an attribute (preceded by =" or =')
                const before = html.substring(Math.max(0, offset - 10), offset);
                if (/(?:src|href)\s*=\s*["']$/.test(before) || before.endsWith('"') || before.endsWith("'")) {
                    return match; // Already inside an img src or attribute — keep as-is
                }
                return `<img src="${dataUri}" style="max-width:200px;max-height:80px;object-fit:contain;" alt="Firma">`;
            }
        );

        return html;
    }

    /**
     * Process {{#if}} conditionals with proper nesting support.
     * Uses stack-based parsing to find matching {{/if}} for each {{#if}}.
     * @private
     */
    static _processConditionals(html, context) {
        // Iteratively process from innermost outward until no more {{#if}} remain
        let maxIterations = 50; // safety limit
        while (html.includes('{{#if') && maxIterations-- > 0) {
            // Find the LAST {{#if (innermost) — it will have no nested {{#if}} inside
            const ifOpens = [...html.matchAll(/\{\{#if\s+([^}]+)\}\}/g)];
            if (ifOpens.length === 0) break;

            // Take the last opening tag (innermost)
            const lastOpen = ifOpens[ifOpens.length - 1];
            const openStart = lastOpen.index;
            const path = lastOpen[1].trim();
            const openEnd = openStart + lastOpen[0].length;

            // Find the first {{/if}} after this opening tag
            const closeTag = '{{/if}}';
            const closeIdx = html.indexOf(closeTag, openEnd);
            if (closeIdx === -1) break; // malformed template

            // Extract inner content between {{#if path}} and {{/if}}
            const innerContent = html.substring(openEnd, closeIdx);

            // Check for {{else}} at this level (not nested since this is innermost)
            const elseIdx = innerContent.indexOf('{{else}}');

            const value = this._resolveContextPath(path, context);
            // Use explicit truthy check: null, undefined, '' are falsy; 0 and false are valid values
            const isTruthy = value != null && value !== '' && value !== false;
            let replacement;

            if (elseIdx !== -1) {
                const ifBlock = innerContent.substring(0, elseIdx);
                const elseBlock = innerContent.substring(elseIdx + '{{else}}'.length);
                replacement = isTruthy ? ifBlock : elseBlock;
            } else {
                replacement = isTruthy ? innerContent : '';
            }

            // Replace the entire {{#if}}...{{/if}} block
            html = html.substring(0, openStart) + replacement + html.substring(closeIdx + closeTag.length);
        }
        return html;
    }

    /**
     * Resolve a dot-separated path against the context object
     * @private
     */
    static _resolveContextPath(path, context) {
        const keys = path.split('.');
        let value = context;
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        return value;
    }

    /**
     * Genera i nomi file GDPR e display
     * @private
     * 
     * GDPR Filename: UUID-based, non contiene PII
     * Display Filename: "yyyy.mm.dd - Cognome Nome paziente"
     */
    static _generateFilenames(visita) {
        const date = new Date(visita.dataOra);
        const dateStr = format(date, 'yyyy.MM.dd');

        const paziente = visita.paziente || {};
        const cognome = paziente.lastName || 'Sconosciuto';
        const nome = paziente.firstName || '';

        // Display filename come richiesto: "yyyy.mm.dd - Cognome Nome paziente"
        const displayFilename = `${dateStr} - ${cognome} ${nome}`.trim() + '.pdf';

        // GDPR filename: non contiene PII
        const gdprFilename = `referto_${visita.id}_${Date.now()}.pdf`;

        return { gdprFilename, displayFilename };
    }
}

export default VisitaRefertoService;
