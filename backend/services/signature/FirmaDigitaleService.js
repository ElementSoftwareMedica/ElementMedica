/**
 * P65 - FirmaDigitaleService
 * 
 * Servizio centralizzato per la gestione delle firme digitali.
 * Supporta: Firma Semplice, Grafometrica, FEQ, FEA, Remota
 * 
 * GDPR Compliance:
 * - Soft delete sempre
 * - Dati biometrici criptati in FirmaVault
 * - Audit trail completo
 * - Data retention policy
 * 
 * Feature Commercializzazione:
 * - SEMPLICE: incluso nel piano base
 * - GRAFOMETRICA: richiede FIRMA_GRAFOMETRICA
 * - FEQ/FEA: richiede FIRMA_FEQ/FIRMA_FEA
 * - BIOMETRICA: richiede FIRMA_BIOMETRICA
 * 
 * @module services/signature/FirmaDigitaleService
 */

import prisma from '../../config/prisma-optimization.js';
import crypto from 'crypto';
import { logger } from '../../utils/logger.js';
import { FirmaVaultService } from './FirmaVaultService.js';


/**
 * Configurazione predefinita
 */
const CONFIG = {
    HASH_ALGORITHM: 'SHA-256',
    SIMPLE_SIGNATURE_MIN_LENGTH: 1,
    SIGNATURE_IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/svg+xml'],
    DATA_RETENTION_DAYS: 365 * 10, // 10 anni per documenti medici
};

/**
 * Mapping tipi firma → feature key richiesta
 * SEMPLICE non richiede feature premium
 */
const SIGNATURE_TYPE_FEATURE_MAP = {
    SEMPLICE: null, // Incluso nel piano base
    GRAFOMETRICA: 'FIRMA_GRAFOMETRICA',
    FEQ: 'FIRMA_FEQ',
    FEA: 'FIRMA_FEA',
    REMOTA: 'FIRMA_REMOTA'
};

/**
 * FirmaDigitaleService
 * 
 * Metodi principali:
 * - createSignatureRequest: Crea richiesta di firma
 * - applySimpleSignature: Applica firma semplice
 * - applyGraphometricSignature: Applica firma grafometrica
 * - verifySignature: Verifica integrità firma
 * - getSignaturesByDocument: Lista firme per documento
 * - cancelSignature: Annulla firma (soft delete)
 * - checkSignatureFeature: Verifica feature abilitata per tipo firma
 * - getAvailableSignatureTypes: Lista tipi firma disponibili per tenant
 */
class FirmaDigitaleService {
    /**
     * Crea una richiesta di firma per un documento
     * 
     * @param {Object} params - Parametri richiesta
     * @param {string} params.tenantId - Tenant ID (obbligatorio)
     * @param {string} params.firmatarioId - ID del firmatario (Person)
     * @param {string} params.documentType - Tipo documento (REFERTO, CONSENSO, etc.)
     * @param {string} [params.refertoId] - ID Referto (se documentType=REFERTO)
     * @param {string} [params.documentoId] - ID Documento generico
     * @param {string} params.firmatarioRole - Ruolo (MEDICO, PAZIENTE, etc.)
     * @param {string} params.tipoFirma - Tipo firma (SEMPLICE, GRAFOMETRICA, etc.)
     * @param {string} params.documentContent - Contenuto documento per hash
     * @param {Object} [params.metadata] - Metadata aggiuntivi (ipAddress, userAgent)
     * @returns {Promise<Object>} Firma creata in stato IN_ATTESA
     */
    static async createSignatureRequest({
        tenantId,
        firmatarioId,
        documentType,
        refertoId = null,
        documentoId = null,
        firmatarioRole,
        tipoFirma,
        documentContent,
        metadata = {}
    }) {
        try {
            // Validazione input obbligatori
            if (!tenantId) throw new Error('tenantId is required');
            if (!firmatarioId) throw new Error('firmatarioId is required');
            if (!documentType) throw new Error('documentType is required');
            if (!firmatarioRole) throw new Error('firmatarioRole is required');
            if (!tipoFirma) throw new Error('tipoFirma is required');
            if (!documentContent) throw new Error('documentContent is required for hash generation');

            // Verifica firmatario esiste e appartiene al tenant
            const firmatario = await prisma.person.findFirst({
                where: {
                    id: firmatarioId,
                    tenantProfiles: {
                        some: {
                            tenantId,
                            deletedAt: null,
                            isActive: true
                        }
                    }
                }
            });

            if (!firmatario) {
                throw new Error('Firmatario not found or not active in tenant');
            }

            // Genera hash documento pre-firma
            const hashDocumento = this.generateDocumentHash(documentContent);

            // Crea richiesta firma
            const firma = await prisma.firmaDigitale.create({
                data: {
                    tenantId,
                    firmatarioId,
                    documentType,
                    refertoId,
                    documentoId,
                    firmatarioRole,
                    tipoFirma,
                    hashDocumento,
                    algoritmo: CONFIG.HASH_ALGORITHM,
                    stato: 'IN_ATTESA',
                    ipAddress: metadata.ipAddress || null,
                    userAgent: metadata.userAgent || null,
                    dispositivo: metadata.dispositivo || null,
                    note: metadata.note || null
                },
                include: {
                    firmatario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true
                        }
                    }
                }
            });

            logger.info('Signature request created', {
                component: 'FirmaDigitaleService',
                firmaId: firma.id,
                tipoFirma,
                documentType,
                firmatarioId,
                tenantId
            });

            return firma;
        } catch (error) {
            logger.error('Failed to create signature request', {
                component: 'FirmaDigitaleService',
                error: error.message,
                tenantId,
                firmatarioId,
                documentType
            });
            throw error;
        }
    }

    /**
     * Applica firma semplice a una richiesta esistente
     * 
     * @param {Object} params - Parametri firma
     * @param {string} params.firmaId - ID della richiesta firma
     * @param {string} params.tenantId - Tenant ID
     * @param {string} params.signerId - ID di chi sta firmando (deve corrispondere a firmatarioId)
     * @param {string} [params.firmaImageBase64] - Immagine firma in base64 (opzionale)
     * @param {string} [params.firmaImageUrl] - URL immagine firma salvata (opzionale)
     * @param {Object} [params.metadata] - Metadata (ipAddress, userAgent)
     * @returns {Promise<Object>} Firma applicata
     */
    static async applySimpleSignature({
        firmaId,
        tenantId,
        signerId,
        firmaImageBase64 = null,
        firmaImageUrl = null,
        metadata = {}
    }) {
        try {
            // Recupera richiesta firma
            const firma = await prisma.firmaDigitale.findFirst({
                where: {
                    id: firmaId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!firma) {
                throw new Error('Signature request not found');
            }

            // Verifica stato
            if (firma.stato !== 'IN_ATTESA') {
                throw new Error(`Cannot apply signature: status is ${firma.stato}, expected IN_ATTESA`);
            }

            // Verifica tipo firma
            if (firma.tipoFirma !== 'SEMPLICE') {
                throw new Error(`Cannot apply simple signature: signature type is ${firma.tipoFirma}`);
            }

            // Verifica firmatario
            if (firma.firmatarioId !== signerId) {
                throw new Error('Signer does not match the designated firmatario');
            }

            // Gestisci immagine firma se fornita
            let savedImageUrl = firmaImageUrl;
            if (firmaImageBase64 && !firmaImageUrl) {
                // Normalize base64 to data URI for rendering in <img> tags
                savedImageUrl = firmaImageBase64.startsWith('data:')
                    ? firmaImageBase64
                    : `data:image/png;base64,${firmaImageBase64}`;
            }

            // Genera hash firma (hash del timestamp + signerId per firma semplice)
            const signatureTimestamp = new Date();
            const hashFirma = this.generateSignatureHash(
                firma.hashDocumento,
                signerId,
                signatureTimestamp
            );

            // Applica firma
            const firmata = await prisma.firmaDigitale.update({
                where: { id: firmaId },
                data: {
                    stato: 'FIRMATO',
                    hashFirma,
                    firmaImageUrl: savedImageUrl,
                    ipAddress: metadata.ipAddress || firma.ipAddress,
                    userAgent: metadata.userAgent || firma.userAgent,
                    updatedAt: signatureTimestamp
                },
                include: {
                    firmatario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });

            logger.info('Simple signature applied', {
                component: 'FirmaDigitaleService',
                firmaId,
                signerId,
                tenantId,
                hashFirma: hashFirma.substring(0, 16) + '...'
            });

            return firmata;
        } catch (error) {
            logger.error('Failed to apply simple signature', {
                component: 'FirmaDigitaleService',
                error: error.message,
                firmaId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Applica firma grafometrica (con dati biometrici)
     * 
     * @param {Object} params - Parametri firma
     * @param {string} params.firmaId - ID della richiesta firma
     * @param {string} params.tenantId - Tenant ID
     * @param {string} params.signerId - ID di chi sta firmando
     * @param {string} params.firmaImageBase64 - Immagine firma in base64
     * @param {Object} [params.biometricData] - Dati biometrici (pressione, velocità, etc.)
     * @param {string} [params.dispositivo] - ID dispositivo (tablet/pad)
     * @param {Object} [params.metadata] - Metadata (ipAddress, userAgent)
     * @returns {Promise<Object>} Firma applicata con vault
     */
    static async applyGraphometricSignature({
        firmaId,
        tenantId,
        signerId,
        firmaImageBase64,
        biometricData = null,
        dispositivo = null,
        metadata = {}
    }) {
        try {
            // Recupera richiesta firma
            const firma = await prisma.firmaDigitale.findFirst({
                where: {
                    id: firmaId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!firma) {
                throw new Error('Signature request not found');
            }

            // Verifica stato
            if (firma.stato !== 'IN_ATTESA') {
                throw new Error(`Cannot apply signature: status is ${firma.stato}`);
            }

            // Verifica tipo firma
            if (firma.tipoFirma !== 'GRAFOMETRICA') {
                throw new Error(`Cannot apply graphometric signature: type is ${firma.tipoFirma}`);
            }

            // Verifica firmatario
            if (firma.firmatarioId !== signerId) {
                throw new Error('Signer does not match the designated firmatario');
            }

            // Obbligatorio l'immagine firma per grafometrica
            if (!firmaImageBase64) {
                throw new Error('Signature image is required for graphometric signature');
            }

            let firmaVaultId = null;

            // Se ci sono dati biometrici, salvali nel vault criptato
            if (biometricData) {
                const dataType = biometricData.fullData ? 'BIOMETRICO_FULL' : 'BIOMETRICO_BASE';

                const vault = await FirmaVaultService.encryptAndStore({
                    data: JSON.stringify(biometricData),
                    dataType
                });

                firmaVaultId = vault.id;

                logger.info('Biometric data stored in vault', {
                    component: 'FirmaDigitaleService',
                    firmaId,
                    vaultId: vault.id,
                    dataType
                });
            }

            // Genera hash firma
            const signatureTimestamp = new Date();
            const hashFirma = this.generateSignatureHash(
                firma.hashDocumento,
                signerId,
                signatureTimestamp,
                firmaImageBase64.substring(0, 100) // Include parte dell'immagine nell'hash
            );

            // Salva immagine firma come data URI completa
            const firmaImageUrl = firmaImageBase64.startsWith('data:')
                ? firmaImageBase64
                : `data:image/png;base64,${firmaImageBase64}`;

            // Applica firma
            const firmata = await prisma.firmaDigitale.update({
                where: { id: firmaId },
                data: {
                    stato: 'FIRMATO',
                    hashFirma,
                    firmaVaultId,
                    firmaImageUrl,
                    dispositivo: dispositivo || metadata.dispositivo,
                    ipAddress: metadata.ipAddress || firma.ipAddress,
                    userAgent: metadata.userAgent || firma.userAgent,
                    updatedAt: signatureTimestamp
                },
                include: {
                    firmatario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });

            logger.info('Graphometric signature applied', {
                component: 'FirmaDigitaleService',
                firmaId,
                signerId,
                tenantId,
                hasVault: !!firmaVaultId,
                dispositivo
            });

            return firmata;
        } catch (error) {
            logger.error('Failed to apply graphometric signature', {
                component: 'FirmaDigitaleService',
                error: error.message,
                firmaId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Verifica integrità di una firma
     * 
     * @param {string} firmaId - ID della firma
     * @param {string} tenantId - Tenant ID
     * @param {string} documentContent - Contenuto documento attuale per verifica
     * @returns {Promise<Object>} Risultato verifica
     */
    static async verifySignature(firmaId, tenantId, documentContent) {
        try {
            const firma = await prisma.firmaDigitale.findFirst({
                where: {
                    id: firmaId,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    firmatario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true
                        }
                    }
                }
            });

            if (!firma) {
                return {
                    valid: false,
                    error: 'Signature not found'
                };
            }

            if (firma.stato !== 'FIRMATO') {
                return {
                    valid: false,
                    error: `Signature not in FIRMATO state: ${firma.stato}`
                };
            }

            // Verifica hash documento
            const currentHash = this.generateDocumentHash(documentContent);
            const documentIntegrity = currentHash === firma.hashDocumento;

            // Verifica scadenza (se applicabile)
            const isExpired = firma.timestampTSA &&
                new Date(firma.timestampTSA) < new Date(Date.now() - CONFIG.DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000);

            return {
                valid: documentIntegrity && !isExpired,
                firma: {
                    id: firma.id,
                    tipo: firma.tipoFirma,
                    stato: firma.stato,
                    firmatario: firma.firmatario,
                    dataFirma: firma.updatedAt,
                    algoritmo: firma.algoritmo
                },
                verification: {
                    documentIntegrity,
                    hashMatch: currentHash === firma.hashDocumento,
                    originalHash: firma.hashDocumento,
                    currentHash,
                    isExpired,
                    hasVault: !!firma.firmaVaultId
                }
            };
        } catch (error) {
            logger.error('Failed to verify signature', {
                component: 'FirmaDigitaleService',
                error: error.message,
                firmaId,
                tenantId
            });
            return {
                valid: false,
                error: 'Signature verification failed'
            };
        }
    }

    /**
     * Ottiene l'immagine firma salvata per un firmatario
     * (per ri-uso in documenti successivi)
     * 
     * @param {string} firmatarioId - ID del firmatario
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Object|null>} Immagine firma più recente o null
     */
    static async getSavedSignatureImage(firmatarioId, tenantId) {
        try {
            let firma = await prisma.firmaDigitale.findFirst({
                where: {
                    firmatarioId,
                    tenantId,
                    stato: 'FIRMATO',
                    firmaImageUrl: { not: null },
                    deletedAt: null
                },
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    firmaImageUrl: true,
                    tipoFirma: true,
                    updatedAt: true
                }
            });

            // F303: Cross-tenant fallback removed — underlying bug fixed, all signatures
            // are now correctly scoped to tenantId at creation time.

            if (!firma) {
                return null;
            }

            return {
                firmaId: firma.id,
                imageUrl: firma.firmaImageUrl,
                tipo: firma.tipoFirma,
                lastUsed: firma.updatedAt
            };
        } catch (error) {
            logger.error('Failed to get saved signature image', {
                component: 'FirmaDigitaleService',
                error: error.message,
                firmatarioId,
                tenantId
            });
            return null;
        }
    }

    /**
     * Lista firme per documento
     * 
     * @param {Object} params - Parametri ricerca
     * @param {string} params.tenantId - Tenant ID (obbligatorio)
     * @param {string} [params.refertoId] - Filter by referto
     * @param {string} [params.documentoId] - Filter by documento generico
     * @param {string} [params.firmatarioId] - Filter by firmatario
     * @param {string} [params.stato] - Filter by stato
     * @returns {Promise<Array>} Lista firme
     */
    static async getSignaturesByDocument({
        tenantId,
        refertoId = null,
        documentoId = null,
        firmatarioId = null,
        stato = null
    }) {
        try {
            const where = {
                tenantId,
                deletedAt: null
            };

            if (refertoId) where.refertoId = refertoId;
            if (documentoId) where.documentoId = documentoId;
            if (firmatarioId) where.firmatarioId = firmatarioId;
            if (stato) where.stato = stato;

            const firme = await prisma.firmaDigitale.findMany({
                where,
                include: {
                    firmatario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return firme;
        } catch (error) {
            logger.error('Failed to get signatures by document', {
                component: 'FirmaDigitaleService',
                error: error.message,
                tenantId,
                refertoId,
                documentoId
            });
            throw error;
        }
    }

    /**
     * Annulla una firma (soft delete)
     * Registra motivo per GDPR audit
     * 
     * @param {string} firmaId - ID della firma
     * @param {string} tenantId - Tenant ID
     * @param {string} annullatoDa - PersonId che annulla
     * @param {string} motivoAnnullamento - Motivo (min 10 chars per GDPR)
     * @returns {Promise<Object>} Firma annullata
     */
    static async cancelSignature(firmaId, tenantId, annullatoDa, motivoAnnullamento) {
        try {
            // Validazione GDPR
            if (!motivoAnnullamento || motivoAnnullamento.length < 10) {
                throw new Error('Motivo annullamento obbligatorio (minimo 10 caratteri)');
            }

            const firma = await prisma.firmaDigitale.findFirst({
                where: {
                    id: firmaId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!firma) {
                throw new Error('Signature not found');
            }

            // Non si possono annullare firme già annullate o rifiutate
            if (['ANNULLATO', 'RIFIUTATO'].includes(firma.stato)) {
                throw new Error(`Cannot cancel signature in state ${firma.stato}`);
            }

            // Annulla con soft delete
            const annullata = await prisma.firmaDigitale.update({
                where: { id: firmaId },
                data: {
                    stato: 'ANNULLATO',
                    motivoRifiuto: motivoAnnullamento,
                    validatoDa: annullatoDa,
                    validatoAt: new Date(),
                    deletedAt: new Date(),
                    updatedAt: new Date()
                }
            });

            logger.info('Signature cancelled', {
                component: 'FirmaDigitaleService',
                firmaId,
                annullatoDa,
                motivoAnnullamento: motivoAnnullamento.substring(0, 50),
                tenantId
            });

            return annullata;
        } catch (error) {
            logger.error('Failed to cancel signature', {
                component: 'FirmaDigitaleService',
                error: error.message,
                firmaId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Valida una firma (per workflow di approvazione)
     * 
     * @param {string} firmaId - ID della firma
     * @param {string} tenantId - Tenant ID
     * @param {string} validatorId - PersonId del validatore
     * @param {boolean} approved - true = VERIFICATO, false = RIFIUTATO
     * @param {string} [motivoRifiuto] - Motivo se rifiutato
     * @returns {Promise<Object>} Firma validata
     */
    static async validateSignature(firmaId, tenantId, validatorId, approved, motivoRifiuto = null) {
        try {
            const firma = await prisma.firmaDigitale.findFirst({
                where: {
                    id: firmaId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!firma) {
                throw new Error('Signature not found');
            }

            if (firma.stato !== 'FIRMATO') {
                throw new Error(`Cannot validate signature in state ${firma.stato}`);
            }

            if (!approved && (!motivoRifiuto || motivoRifiuto.length < 10)) {
                throw new Error('Motivo rifiuto obbligatorio (minimo 10 caratteri)');
            }

            const validata = await prisma.firmaDigitale.update({
                where: { id: firmaId },
                data: {
                    stato: approved ? 'VERIFICATO' : 'RIFIUTATO',
                    validatoDa: validatorId,
                    validatoAt: new Date(),
                    motivoRifiuto: approved ? null : motivoRifiuto,
                    updatedAt: new Date()
                },
                include: {
                    firmatario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });

            logger.info('Signature validated', {
                component: 'FirmaDigitaleService',
                firmaId,
                validatorId,
                approved,
                newState: validata.stato,
                tenantId
            });

            return validata;
        } catch (error) {
            logger.error('Failed to validate signature', {
                component: 'FirmaDigitaleService',
                error: error.message,
                firmaId,
                tenantId
            });
            throw error;
        }
    }

    // =====================================
    // METODI HELPER (PRIVATI)
    // =====================================

    /**
     * Genera hash SHA-256 del documento
     * 
     * @param {string} content - Contenuto documento
     * @returns {string} Hash esadecimale
     */
    static generateDocumentHash(content) {
        return crypto
            .createHash('sha256')
            .update(content, 'utf8')
            .digest('hex');
    }

    /**
     * Genera hash della firma
     * 
     * @param {string} documentHash - Hash documento originale
     * @param {string} signerId - ID firmatario
     * @param {Date} timestamp - Timestamp firma
     * @param {string} [additionalData] - Dati aggiuntivi per hash
     * @returns {string} Hash firma esadecimale
     */
    static generateSignatureHash(documentHash, signerId, timestamp, additionalData = '') {
        const data = `${documentHash}|${signerId}|${timestamp.toISOString()}|${additionalData}`;
        return crypto
            .createHash('sha256')
            .update(data, 'utf8')
            .digest('hex');
    }

    /**
     * Verifica se un'immagine base64 è valida
     * 
     * @param {string} base64Data - Immagine in base64
     * @returns {Object} { valid: boolean, type: string, size: number }
     */
    static validateSignatureImage(base64Data) {
        try {
            // Estrai tipo MIME se presente
            const matches = base64Data.match(/^data:([^;]+);base64,/);
            const mimeType = matches ? matches[1] : 'image/png';

            // Rimuovi header data URL se presente
            const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, '');

            // Calcola dimensione
            const sizeBytes = Buffer.from(base64Clean, 'base64').length;

            const valid = CONFIG.ALLOWED_IMAGE_TYPES.includes(mimeType) &&
                sizeBytes <= CONFIG.SIGNATURE_IMAGE_MAX_SIZE;

            return {
                valid,
                type: mimeType,
                size: sizeBytes,
                maxSize: CONFIG.SIGNATURE_IMAGE_MAX_SIZE
            };
        } catch (error) {
            logger.error({ component: 'FirmaDigitaleService', action: 'validateSignatureImage', error: error.message }, 'Errore validazione immagine firma');
            return {
                valid: false,
                error: 'Errore nella validazione dell\'immagine firma'
            };
        }
    }

    // ============================================
    // P65: FEATURE COMMERCIALIZZAZIONE
    // ============================================

    /**
     * Verifica se un tipo di firma è abilitato per il tenant
     * 
     * @param {string} tenantId - ID tenant
     * @param {string} tipoFirma - Tipo firma (SEMPLICE, GRAFOMETRICA, FEQ, FEA, REMOTA)
     * @returns {Promise<{enabled: boolean, feature: string|null, reason: string}>}
     */
    static async checkSignatureFeature(tenantId, tipoFirma) {
        try {
            const requiredFeature = SIGNATURE_TYPE_FEATURE_MAP[tipoFirma];

            // SEMPLICE non richiede feature premium
            if (!requiredFeature) {
                return { enabled: true, feature: null, reason: 'Base feature, always available' };
            }

            // Verifica feature abilitata per tenant
            const feature = await prisma.tenantFeature.findFirst({
                where: {
                    tenantId,
                    featureKey: requiredFeature,
                    isEnabled: true,
                    deletedAt: null,
                    OR: [
                        { validUntil: null },
                        { validUntil: { gte: new Date() } }
                    ]
                }
            });

            if (!feature) {
                return {
                    enabled: false,
                    feature: requiredFeature,
                    reason: `Feature ${requiredFeature} not enabled for tenant. Upgrade required.`
                };
            }

            // Verifica usage limit se presente
            if (feature.usageLimit !== null && feature.usageCount >= feature.usageLimit) {
                return {
                    enabled: false,
                    feature: requiredFeature,
                    reason: `Usage limit reached for ${requiredFeature}. Current: ${feature.usageCount}/${feature.usageLimit}`
                };
            }

            return {
                enabled: true,
                feature: requiredFeature,
                reason: 'Feature enabled',
                tier: feature.tier,
                usageCount: feature.usageCount,
                usageLimit: feature.usageLimit
            };
        } catch (error) {
            logger.error('Failed to check signature feature', {
                component: 'FirmaDigitaleService',
                error: error.message,
                tenantId,
                tipoFirma
            });
            // In caso di errore, fallback sicuro: nega accesso alle feature premium
            return {
                enabled: tipoFirma === 'SEMPLICE',
                feature: SIGNATURE_TYPE_FEATURE_MAP[tipoFirma],
                reason: 'Error checking feature, defaulting to safe mode'
            };
        }
    }

    /**
     * Ottiene tutti i tipi di firma disponibili per un tenant
     * 
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array<{type: string, enabled: boolean, feature: string|null, tier: string|null}>>}
     */
    static async getAvailableSignatureTypes(tenantId) {
        try {
            const types = [];

            for (const [type, featureKey] of Object.entries(SIGNATURE_TYPE_FEATURE_MAP)) {
                const check = await this.checkSignatureFeature(tenantId, type);
                types.push({
                    type,
                    enabled: check.enabled,
                    feature: check.feature,
                    tier: check.tier || null,
                    reason: check.enabled ? null : check.reason
                });
            }

            logger.debug('Available signature types retrieved', {
                component: 'FirmaDigitaleService',
                tenantId,
                types: types.map(t => ({ type: t.type, enabled: t.enabled }))
            });

            return types;
        } catch (error) {
            logger.error('Failed to get available signature types', {
                component: 'FirmaDigitaleService',
                error: error.message,
                tenantId
            });
            // Fallback: solo firma semplice disponibile
            return [{ type: 'SEMPLICE', enabled: true, feature: null, tier: null }];
        }
    }

    /**
     * Salva una firma standalone (senza documento) per riutilizzo futuro.
     * Usato dal medico nelle impostazioni per pre-salvare la propria firma.
     * 
     * @param {Object} params - Parametri
     * @param {string} params.firmatarioId - ID della persona (medico)
     * @param {string} params.tenantId - Tenant ID
     * @param {string} params.firmaImageBase64 - Immagine firma in base64
     * @param {Object} [params.biometricData] - Dati biometrici opzionali
     * @param {Object} [params.metadata] - Metadata (ipAddress, userAgent)
     * @returns {Promise<Object>} Firma salvata
     */
    static async saveStandaloneSignature({
        firmatarioId,
        tenantId,
        firmaImageBase64,
        biometricData = null,
        metadata = {}
    }) {
        try {
            if (!firmatarioId) throw new Error('firmatarioId is required');
            if (!tenantId) throw new Error('tenantId is required');
            if (!firmaImageBase64) throw new Error('firmaImageBase64 is required');

            // S69: Verifica firmatario esiste e ha almeno un profilo tenant attivo.
            // Non vincolare al tenant operativo specifico: l'admin può operare cross-tenant
            // e la sua firma standalone è personale, non dipende dal tenant in cui sta operando.
            const firmatario = await prisma.person.findFirst({
                where: {
                    id: firmatarioId,
                    deletedAt: null,
                    tenantProfiles: {
                        some: {
                            deletedAt: null,
                            isActive: true
                        }
                    }
                }
            });

            if (!firmatario) {
                throw new Error('Firmatario not found or not active');
            }

            // Soft-delete eventuali firme standalone precedenti per questo firmatario
            await prisma.firmaDigitale.updateMany({
                where: {
                    firmatarioId,
                    tenantId,
                    documentType: 'ALTRO',
                    refertoId: null,
                    documentoId: null,
                    deletedAt: null
                },
                data: { deletedAt: new Date() }
            });

            // Genera hash immagine come hash documento sostitutivo
            const hashDocumento = this.generateDocumentHash(firmaImageBase64);

            let firmaVaultId = null;
            if (biometricData) {
                const dataType = biometricData.fullData ? 'BIOMETRICO_FULL' : 'BIOMETRICO_BASE';
                const vault = await FirmaVaultService.encryptAndStore({
                    data: JSON.stringify(biometricData),
                    dataType
                });
                firmaVaultId = vault.id;
            }

            const signatureTimestamp = new Date();
            const hashFirma = this.generateSignatureHash(
                hashDocumento,
                firmatarioId,
                signatureTimestamp,
                firmaImageBase64.substring(0, 100)
            );

            // Salva come data URI
            const firmaImageUrl = firmaImageBase64.startsWith('data:')
                ? firmaImageBase64
                : `data:image/png;base64,${firmaImageBase64}`;

            const firma = await prisma.firmaDigitale.create({
                data: {
                    tenantId,
                    firmatarioId,
                    documentType: 'ALTRO',
                    firmatarioRole: 'MEDICO',
                    tipoFirma: 'GRAFOMETRICA',
                    hashDocumento,
                    hashFirma,
                    firmaVaultId,
                    firmaImageUrl,
                    stato: 'FIRMATO',
                    ipAddress: metadata.ipAddress || null,
                    userAgent: metadata.userAgent || null,
                    dispositivo: metadata.dispositivo || null,
                    note: 'Firma standalone salvata da impostazioni'
                },
                include: {
                    firmatario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });

            logger.info('Standalone signature saved', {
                component: 'FirmaDigitaleService',
                firmaId: firma.id,
                firmatarioId,
                tenantId
            });

            return firma;
        } catch (error) {
            logger.error('Failed to save standalone signature', {
                component: 'FirmaDigitaleService',
                error: error.message,
                firmatarioId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Elimina la firma salvata standalone di un firmatario (soft delete)
     * 
     * @param {string} firmatarioId - ID della persona
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<number>} Numero di record soft-deleted
     */
    static async deleteStandaloneSignature(firmatarioId, tenantId) {
        try {
            const result = await prisma.firmaDigitale.updateMany({
                where: {
                    firmatarioId,
                    tenantId,
                    documentType: 'ALTRO',
                    refertoId: null,
                    documentoId: null,
                    deletedAt: null
                },
                data: { deletedAt: new Date() }
            });

            logger.info('Standalone signature deleted', {
                component: 'FirmaDigitaleService',
                firmatarioId,
                tenantId,
                count: result.count
            });

            return result.count;
        } catch (error) {
            logger.error('Failed to delete standalone signature', {
                component: 'FirmaDigitaleService',
                error: error.message,
                firmatarioId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Salva la firma di un paziente (raccolta dal medico durante la visita).
     * Soft-delete di eventuali firme standalone precedenti del paziente per questa visita.
     * 
     * @param {Object} params - Parametri
     * @param {string} params.pazienteId - ID del paziente (Person)
     * @param {string} params.tenantId - Tenant ID
     * @param {string} params.firmaImageBase64 - Immagine firma in base64
     * @param {string} [params.visitaId] - ID della visita (per riferimento)
     * @param {Object} [params.biometricData] - Dati biometrici opzionali
     * @param {Object} [params.metadata] - Metadata (ipAddress, userAgent)
     * @returns {Promise<Object>} Firma salvata
     */
    static async savePatientSignature({
        pazienteId,
        tenantId,
        firmaImageBase64,
        visitaId = null,
        biometricData = null,
        metadata = {}
    }) {
        try {
            if (!pazienteId) throw new Error('pazienteId is required');
            if (!tenantId) throw new Error('tenantId is required');
            if (!firmaImageBase64) throw new Error('firmaImageBase64 is required');

            // Verifica paziente esiste nel tenant (via PersonTenantProfile o PersonRole)
            let paziente = await prisma.person.findFirst({
                where: {
                    id: pazienteId,
                    OR: [
                        { tenantProfiles: { some: { tenantId, deletedAt: null } } },
                        { personRoles: { some: { tenantId, deletedAt: null } } }
                    ]
                }
            });

            // Se il paziente esiste come Person ma non ha un profilo tenant,
            // lo crea automaticamente (es. pazienti arrivati dalla coda senza profilo)
            if (!paziente) {
                const personExists = await prisma.person.findFirst({ // F231: findFirst+deletedAt
                    where: { id: pazienteId, deletedAt: null }
                });

                if (!personExists) {
                    throw new Error('Paziente not found');
                }

                // Auto-create PersonTenantProfile per il paziente
                await prisma.personTenantProfile.create({
                    data: {
                        personId: pazienteId,
                        tenantId,
                        status: 'ACTIVE',
                        isActive: true
                    }
                });

                // Auto-create PersonRole PAZIENTE se non esiste
                const existingRole = await prisma.personRole.findFirst({
                    where: { personId: pazienteId, tenantId, roleType: 'PAZIENTE', deletedAt: null }
                });
                if (!existingRole) {
                    await prisma.personRole.create({
                        data: {
                            personId: pazienteId,
                            tenantId,
                            roleType: 'PAZIENTE'
                        }
                    });
                }

                paziente = personExists;
                logger.info('Auto-created tenant profile for queue patient', {
                    component: 'FirmaDigitaleService',
                    pazienteId,
                    tenantId
                });
            }

            // Soft-delete firme standalone precedenti del paziente
            await prisma.firmaDigitale.updateMany({
                where: {
                    firmatarioId: pazienteId,
                    tenantId,
                    firmatarioRole: 'PAZIENTE',
                    documentType: 'ALTRO',
                    refertoId: null,
                    documentoId: null,
                    deletedAt: null
                },
                data: { deletedAt: new Date() }
            });

            const hashDocumento = this.generateDocumentHash(firmaImageBase64);

            let firmaVaultId = null;
            if (biometricData) {
                const dataType = biometricData.fullData ? 'BIOMETRICO_FULL' : 'BIOMETRICO_BASE';
                const vault = await FirmaVaultService.encryptAndStore({
                    data: JSON.stringify(biometricData),
                    dataType
                });
                firmaVaultId = vault.id;
            }

            const signatureTimestamp = new Date();
            const hashFirma = this.generateSignatureHash(
                hashDocumento,
                pazienteId,
                signatureTimestamp,
                firmaImageBase64.substring(0, 100)
            );

            const firmaImageUrl = firmaImageBase64.startsWith('data:')
                ? firmaImageBase64
                : `data:image/png;base64,${firmaImageBase64}`;

            const firma = await prisma.firmaDigitale.create({
                data: {
                    tenantId,
                    firmatarioId: pazienteId,
                    documentType: 'ALTRO',
                    firmatarioRole: 'PAZIENTE',
                    tipoFirma: 'GRAFOMETRICA',
                    hashDocumento,
                    hashFirma,
                    firmaVaultId,
                    firmaImageUrl,
                    stato: 'FIRMATO',
                    ipAddress: metadata.ipAddress || null,
                    userAgent: metadata.userAgent || null,
                    dispositivo: metadata.dispositivo || null,
                    note: visitaId ? `Firma paziente raccolta durante visita ${visitaId}` : 'Firma paziente standalone'
                },
                include: {
                    firmatario: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });

            logger.info('Patient signature saved', {
                component: 'FirmaDigitaleService',
                firmaId: firma.id,
                pazienteId,
                visitaId,
                tenantId
            });

            return firma;
        } catch (error) {
            logger.error('Failed to save patient signature', {
                component: 'FirmaDigitaleService',
                error: error.message,
                pazienteId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Lista firme salvate per tutti i medici del tenant (admin only)
     * 
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Lista medici con stato firma
     */
    static async getSavedMediciSignatures(tenantId) {
        try {
            // Trova tutti i medici del tenant via PersonRole (PersonTenantProfile non ha campo roles)
            const mediciRoles = await prisma.personRole.findMany({
                where: {
                    tenantId,
                    roleType: 'MEDICO',
                    isActive: true,
                    deletedAt: null
                },
                include: {
                    person: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            gender: true
                        }
                    }
                }
            });

            // Deduplica per personId (un medico potrebbe avere più ruoli)
            const uniqueMedici = [...new Map(mediciRoles.map(r => [r.personId, r.person])).values()];

            // Per ogni medico, cerca la firma salvata più recente
            const results = await Promise.all(
                uniqueMedici.map(async (person) => {
                    const savedSignature = await this.getSavedSignatureImage(person.id, tenantId);
                    const preference = await this.getMedicoSignaturePreference(person.id, tenantId);

                    return {
                        medicoId: person.id,
                        firstName: person.firstName,
                        lastName: person.lastName,
                        gender: person.gender,
                        hasSavedSignature: !!savedSignature,
                        savedSignature,
                        preferredType: preference
                    };
                })
            );

            return results;
        } catch (error) {
            logger.error('Failed to get saved medici signatures', {
                component: 'FirmaDigitaleService',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Lista tutti i formatori del tenant con il loro stato firma (admin only).
     * 
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array>} - Lista formatori con stato firma
     */
    static async getSavedFormatoriSignatures(tenantId) {
        try {
            const formatoriRoles = await prisma.personRole.findMany({
                where: {
                    tenantId,
                    roleType: 'TRAINER',
                    isActive: true,
                    deletedAt: null
                },
                include: {
                    person: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            gender: true
                        }
                    }
                }
            });

            // Deduplica per personId (un formatore potrebbe avere più ruoli)
            const uniqueFormatori = [...new Map(formatoriRoles.map(r => [r.personId, r.person])).values()];

            const results = await Promise.all(
                uniqueFormatori.map(async (person) => {
                    const savedSignature = await this.getSavedSignatureImage(person.id, tenantId);

                    return {
                        formatoreId: person.id,
                        firstName: person.firstName,
                        lastName: person.lastName,
                        gender: person.gender,
                        hasSavedSignature: !!savedSignature,
                        savedSignature
                    };
                })
            );

            return results;
        } catch (error) {
            logger.error('Failed to get saved formatori signatures', {
                component: 'FirmaDigitaleService',
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Incrementa il contatore di utilizzo per una feature firma
     * 
     * @param {string} tenantId - ID tenant
     * @param {string} tipoFirma - Tipo firma utilizzato
     * @returns {Promise<void>}
     */
    static async incrementSignatureUsage(tenantId, tipoFirma) {
        const featureKey = SIGNATURE_TYPE_FEATURE_MAP[tipoFirma];
        if (!featureKey) return; // SEMPLICE non traccia usage

        try {
            await prisma.tenantFeature.updateMany({
                where: {
                    tenantId,
                    featureKey,
                    isEnabled: true,
                    deletedAt: null
                },
                data: {
                    usageCount: { increment: 1 },
                    lastUsedAt: new Date()
                }
            });
        } catch (error) {
            // Non-blocking: log error ma non fallire l'operazione
            logger.warn('Failed to increment signature usage', {
                component: 'FirmaDigitaleService',
                error: error.message,
                tenantId,
                tipoFirma
            });
        }
    }

    /**
     * Ottiene la preferenza tipo firma per un medico
     * 
     * @param {string} medicoId - ID medico (Person)
     * @param {string} tenantId - ID tenant
     * @returns {Promise<string>} Tipo firma preferito o 'SEMPLICE' default
     */
    static async getMedicoSignaturePreference(medicoId, tenantId) {
        try {
            const profile = await prisma.personTenantProfile.findFirst({
                where: {
                    personId: medicoId,
                    tenantId,
                    deletedAt: null
                },
                select: {
                    preferences: true
                }
            });

            const prefs = profile?.preferences || {};
            const preferredType = prefs.preferredSignatureType || 'SEMPLICE';

            // Verifica che il tipo preferito sia abilitato
            const check = await this.checkSignatureFeature(tenantId, preferredType);
            if (check.enabled) {
                return preferredType;
            }

            // Fallback a SEMPLICE se il preferito non è disponibile
            logger.info('Preferred signature type not available, falling back to SEMPLICE', {
                component: 'FirmaDigitaleService',
                medicoId,
                tenantId,
                preferredType,
                reason: check.reason
            });
            return 'SEMPLICE';
        } catch (error) {
            logger.error('Failed to get medico signature preference', {
                component: 'FirmaDigitaleService',
                error: error.message,
                medicoId,
                tenantId
            });
            return 'SEMPLICE';
        }
    }

    /**
     * Imposta la preferenza tipo firma per un medico
     * 
     * @param {string} medicoId - ID medico (Person)
     * @param {string} tenantId - ID tenant
     * @param {string} tipoFirma - Tipo firma preferito
     * @returns {Promise<boolean>} True se salvato con successo
     */
    static async setMedicoSignaturePreference(medicoId, tenantId, tipoFirma) {
        try {
            // Verifica che il tipo firma sia valido
            if (!SIGNATURE_TYPE_FEATURE_MAP.hasOwnProperty(tipoFirma)) {
                throw new Error(`Invalid signature type: ${tipoFirma}`);
            }

            // Verifica che il tipo firma sia abilitato per il tenant
            const check = await this.checkSignatureFeature(tenantId, tipoFirma);
            if (!check.enabled) {
                throw new Error(`Signature type ${tipoFirma} is not enabled for this tenant. ${check.reason}`);
            }

            // Recupera profilo esistente o crea se mancante
            let profile = await prisma.personTenantProfile.findFirst({
                where: {
                    personId: medicoId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!profile) {
                // Auto-create profile per il medico (potrebbe mancare per setup incompleto)
                const personExists = await prisma.person.findFirst({ // F231: findFirst+deletedAt
                    where: { id: medicoId, deletedAt: null }
                });
                if (!personExists) {
                    throw new Error('Medico not found');
                }
                profile = await prisma.personTenantProfile.create({
                    data: {
                        personId: medicoId,
                        tenantId,
                        status: 'ACTIVE',
                        isActive: true
                    }
                });
                logger.info('Auto-created PersonTenantProfile for medico', {
                    component: 'FirmaDigitaleService',
                    medicoId,
                    tenantId
                });
            }

            // Aggiorna preferenze
            const currentPrefs = profile.preferences || {};
            const newPrefs = {
                ...currentPrefs,
                preferredSignatureType: tipoFirma,
                signaturePreferenceUpdatedAt: new Date().toISOString()
            };

            await prisma.personTenantProfile.update({
                where: { id: profile.id },
                data: { preferences: newPrefs }
            });

            logger.info('Medico signature preference updated', {
                component: 'FirmaDigitaleService',
                medicoId,
                tenantId,
                tipoFirma
            });

            return true;
        } catch (error) {
            logger.error('Failed to set medico signature preference', {
                component: 'FirmaDigitaleService',
                error: error.message,
                medicoId,
                tenantId,
                tipoFirma
            });
            throw error;
        }
    }
}

export { FirmaDigitaleService, SIGNATURE_TYPE_FEATURE_MAP };
export default FirmaDigitaleService;
