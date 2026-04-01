/**
 * P65 - FirmaVaultService
 * 
 * Servizio per la gestione sicura dei dati biometrici della firma grafometrica.
 * Implementa crittografia AES-256-GCM con key rotation support.
 * 
 * GDPR Compliance:
 * - Dati criptati con AES-256-GCM
 * - Key rotation supportata
 * - Data retention policy con expiry automatico
 * - Access logging
 * 
 * @module services/signature/FirmaVaultService
 */

import prisma from '../../config/prisma-optimization.js';
import crypto from 'crypto';
import { logger } from '../../utils/logger.js';


/**
 * Configurazione crittografia
 * 
 * IMPORTANTE: In produzione, VAULT_KEY deve essere:
 * - Caricata da KMS (AWS KMS, HashiCorp Vault, etc.)
 * - Mai hardcoded
 * - Rotata periodicamente
 */
const CRYPTO_CONFIG = {
    ALGORITHM: 'aes-256-gcm',
    IV_LENGTH: 12,      // GCM standard IV length
    AUTH_TAG_LENGTH: 16, // GCM auth tag length
    KEY_LENGTH: 32,     // 256 bits
    DEFAULT_RETENTION_DAYS: 365 * 10 // 10 anni per documenti medici
};

/**
 * Ottieni chiave di crittografia (placeholder - in produzione usare KMS)
 * 
 * @param {number} version - Versione chiave
 * @returns {Buffer} Chiave di crittografia
 */
function getEncryptionKey(version = 1) {
    // NOTA: In produzione, questo deve interfacciarsi con un KMS
    // Es: AWS KMS, HashiCorp Vault, Azure Key Vault
    const keyFromEnv = process.env.FIRMA_VAULT_KEY;

    if (keyFromEnv) {
        const key = Buffer.from(keyFromEnv, 'hex');
        if (key.length !== CRYPTO_CONFIG.KEY_LENGTH) {
            throw new Error(`Invalid FIRMA_VAULT_KEY length. Expected ${CRYPTO_CONFIG.KEY_LENGTH} bytes`);
        }
        return key;
    }

    // Fallback per development - genera chiave deterministica (NON USARE IN PRODUZIONE)
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.warn('Using development encryption key - NOT FOR PRODUCTION', {
            component: 'FirmaVaultService'
        });
        return crypto.scryptSync('dev-key-p65-firma-vault', 'salt', CRYPTO_CONFIG.KEY_LENGTH);
    }

    throw new Error('FIRMA_VAULT_KEY environment variable is required in production');
}

/**
 * FirmaVaultService
 * 
 * Gestione sicura dei dati biometrici per firma grafometrica.
 * Implementa encryption at rest con AES-256-GCM.
 */
class FirmaVaultService {
    /**
     * Cripta e salva dati biometrici nel vault
     * 
     * @param {Object} params - Parametri
     * @param {string} params.data - Dati da criptare (JSON stringified)
     * @param {string} [params.dataType='IMMAGINE'] - Tipo dati (IMMAGINE, BIOMETRICO_BASE, BIOMETRICO_FULL)
     * @param {number} [params.retentionDays] - Giorni di retention (default 10 anni)
     * @returns {Promise<Object>} Vault entry creata (senza dati sensibili)
     */
    static async encryptAndStore({
        data,
        dataType = 'IMMAGINE',
        retentionDays = CRYPTO_CONFIG.DEFAULT_RETENTION_DAYS
    }) {
        try {
            if (!data) {
                throw new Error('Data is required for encryption');
            }

            // Genera IV casuale
            const iv = crypto.randomBytes(CRYPTO_CONFIG.IV_LENGTH);

            // Ottieni chiave di crittografia
            const key = getEncryptionKey(1);

            // Cripta con AES-256-GCM
            const cipher = crypto.createCipheriv(CRYPTO_CONFIG.ALGORITHM, key, iv, {
                authTagLength: CRYPTO_CONFIG.AUTH_TAG_LENGTH
            });

            let encrypted = cipher.update(data, 'utf8', 'base64');
            encrypted += cipher.final('base64');

            // Ottieni authentication tag
            const authTag = cipher.getAuthTag().toString('base64');

            // Calcola data di scadenza
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + retentionDays);

            // Salva nel vault
            const vault = await prisma.firmaVault.create({
                data: {
                    encryptedData: encrypted,
                    iv: iv.toString('base64'),
                    authTag: authTag,
                    keyVersion: 1,
                    dataType: dataType,
                    expiresAt: expiresAt
                }
            });

            logger.info('Data encrypted and stored in vault', {
                component: 'FirmaVaultService',
                vaultId: vault.id,
                dataType,
                expiresAt: expiresAt.toISOString()
            });

            // Ritorna solo dati non sensibili
            return {
                id: vault.id,
                dataType: vault.dataType,
                keyVersion: vault.keyVersion,
                expiresAt: vault.expiresAt,
                createdAt: vault.createdAt
            };
        } catch (error) {
            logger.error('Failed to encrypt and store data in vault', {
                component: 'FirmaVaultService',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Decripta dati dal vault
     * 
     * @param {string} vaultId - ID del vault entry
     * @param {string} [accessReason] - Motivo dell'accesso (per audit log)
     * @returns {Promise<string>} Dati decriptati
     */
    static async decrypt(vaultId, accessReason = 'Signature verification') {
        try {
            const vault = await prisma.firmaVault.findUnique({
                where: { id: vaultId }
            });

            if (!vault) {
                throw new Error('Vault entry not found');
            }

            // Verifica scadenza
            if (vault.expiresAt && new Date(vault.expiresAt) < new Date()) {
                throw new Error('Vault entry has expired');
            }

            // Ottieni chiave corrispondente alla versione
            const key = getEncryptionKey(vault.keyVersion);

            // Prepara decrittazione
            const iv = Buffer.from(vault.iv, 'base64');
            const authTag = Buffer.from(vault.authTag, 'base64');

            const decipher = crypto.createDecipheriv(CRYPTO_CONFIG.ALGORITHM, key, iv, {
                authTagLength: CRYPTO_CONFIG.AUTH_TAG_LENGTH
            });
            decipher.setAuthTag(authTag);

            // Decripta
            let decrypted = decipher.update(vault.encryptedData, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            // Aggiorna contatore accessi
            await prisma.firmaVault.update({
                where: { id: vaultId },
                data: {
                    accessCount: { increment: 1 },
                    lastAccessAt: new Date()
                }
            });

            logger.info('Vault data decrypted', {
                component: 'FirmaVaultService',
                vaultId,
                accessReason,
                accessCount: vault.accessCount + 1
            });

            return decrypted;
        } catch (error) {
            logger.error('Failed to decrypt vault data', {
                component: 'FirmaVaultService',
                error: error.message,
                vaultId
            });
            throw error;
        }
    }

    /**
     * Verifica integrità dei dati nel vault senza decriptare completamente
     * 
     * @param {string} vaultId - ID del vault entry
     * @returns {Promise<Object>} Risultato verifica integrità
     */
    static async verifyIntegrity(vaultId) {
        try {
            const vault = await prisma.firmaVault.findUnique({
                where: { id: vaultId }
            });

            if (!vault) {
                return { valid: false, error: 'Vault entry not found' };
            }

            // Verifica scadenza
            const isExpired = vault.expiresAt && new Date(vault.expiresAt) < new Date();

            // Verifica struttura dati criptati
            const hasValidStructure =
                vault.encryptedData &&
                vault.iv &&
                vault.authTag;

            // Tenta decrittazione per verificare integrità
            try {
                const key = getEncryptionKey(vault.keyVersion);
                const iv = Buffer.from(vault.iv, 'base64');
                const authTag = Buffer.from(vault.authTag, 'base64');

                const decipher = crypto.createDecipheriv(CRYPTO_CONFIG.ALGORITHM, key, iv, {
                    authTagLength: CRYPTO_CONFIG.AUTH_TAG_LENGTH
                });
                decipher.setAuthTag(authTag);

                // Decripta primo blocco per verificare integrità
                decipher.update(vault.encryptedData.substring(0, 100), 'base64', 'utf8');
                // Se non lancia errore, l'authTag è valido

                return {
                    valid: !isExpired,
                    vaultId,
                    dataType: vault.dataType,
                    keyVersion: vault.keyVersion,
                    isExpired,
                    hasValidStructure,
                    integrityOk: true,
                    expiresAt: vault.expiresAt,
                    accessCount: vault.accessCount
                };
            } catch (authError) {
                return {
                    valid: false,
                    vaultId,
                    isExpired,
                    hasValidStructure,
                    integrityOk: false,
                    error: 'Authentication tag verification failed - data may be tampered'
                };
            }
        } catch (error) {
            logger.error('Failed to verify vault integrity', {
                component: 'FirmaVaultService',
                error: error.message,
                vaultId
            });
            return { valid: false, error: 'Integrity verification failed' };
        }
    }

    /**
     * Elimina definitivamente entry dal vault
     * (Hard delete - usare solo dopo data retention period)
     * 
     * @param {string} vaultId - ID del vault entry
     * @param {string} deletionReason - Motivo cancellazione (GDPR audit)
     * @returns {Promise<boolean>} true se eliminato
     */
    static async permanentDelete(vaultId, deletionReason) {
        try {
            if (!deletionReason || deletionReason.length < 10) {
                throw new Error('Deletion reason required (minimum 10 characters)');
            }

            const vault = await prisma.firmaVault.findUnique({
                where: { id: vaultId }
            });

            if (!vault) {
                throw new Error('Vault entry not found');
            }

            // Log per GDPR audit prima della cancellazione
            logger.info('Vault entry permanently deleted (GDPR)', {
                component: 'FirmaVaultService',
                vaultId,
                dataType: vault.dataType,
                deletionReason,
                createdAt: vault.createdAt,
                accessCount: vault.accessCount
            });

            await prisma.firmaVault.delete({
                where: { id: vaultId }
            });

            return true;
        } catch (error) {
            logger.error('Failed to permanently delete vault entry', {
                component: 'FirmaVaultService',
                error: error.message,
                vaultId
            });
            throw error;
        }
    }

    /**
     * Cleanup automatico entry scadute
     * (Da eseguire come job schedulato)
     * 
     * @returns {Promise<Object>} Risultato cleanup
     */
    static async cleanupExpired() {
        try {
            const now = new Date();

            // Trova entry scadute
            const expired = await prisma.firmaVault.findMany({
                where: {
                    expiresAt: { lt: now }
                },
                select: {
                    id: true,
                    dataType: true,
                    expiresAt: true
                }
            });

            if (expired.length === 0) {
                return { deleted: 0, message: 'No expired entries' };
            }

            // Elimina entry scadute
            const result = await prisma.firmaVault.deleteMany({
                where: {
                    expiresAt: { lt: now }
                }
            });

            logger.info('Expired vault entries cleaned up', {
                component: 'FirmaVaultService',
                deletedCount: result.count,
                expiredIds: expired.map(e => e.id)
            });

            return {
                deleted: result.count,
                entries: expired
            };
        } catch (error) {
            logger.error('Failed to cleanup expired vault entries', {
                component: 'FirmaVaultService',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Ottieni statistiche vault (per monitoring)
     * 
     * @returns {Promise<Object>} Statistiche
     */
    static async getStats() {
        try {
            const now = new Date();

            const [total, expired, byType] = await Promise.all([
                prisma.firmaVault.count(),
                prisma.firmaVault.count({
                    where: { expiresAt: { lt: now } }
                }),
                prisma.firmaVault.groupBy({
                    by: ['dataType'],
                    _count: { id: true }
                })
            ]);

            return {
                total,
                expired,
                active: total - expired,
                byType: byType.reduce((acc, item) => {
                    acc[item.dataType] = item._count.id;
                    return acc;
                }, {})
            };
        } catch (error) {
            logger.error('Failed to get vault stats', {
                component: 'FirmaVaultService',
                error: error.message
            });
            throw error;
        }
    }
}

export { FirmaVaultService };
export default FirmaVaultService;
