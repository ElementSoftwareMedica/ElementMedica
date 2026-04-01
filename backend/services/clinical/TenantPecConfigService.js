/**
 * TenantPecConfigService - Gestione configurazione PEC per tenant
 * 
 * Permette a ogni tenant di configurare le proprie credenziali PEC per:
 * - Invio giudizi di idoneità
 * - Comunicazioni obbligatorie MDL
 * - Notifiche ai lavoratori e datori di lavoro
 * 
 * Le credenziali sono criptate nel database usando TenantConfiguration.
 * 
 * @module services/clinical/TenantPecConfigService
 * @project P56 - Medicina del Lavoro - FASE 4 PEC Integration
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import crypto from 'crypto';


// Chiave di encryption per credenziali PEC (in production usa un secret manager)
const ENCRYPTION_KEY = process.env.PEC_CONFIG_ENCRYPTION_KEY || 'element-medica-pec-key-32chars!!';
const ENCRYPTION_IV_LENGTH = 16;
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

// Config key per TenantConfiguration
const PEC_CONFIG_KEY = 'pec_smtp_config';
const PEC_CONFIG_TYPE = 'pec';

// Provider PEC supportati
const PEC_PROVIDERS = {
    ARUBA: {
        name: 'Aruba PEC',
        host: 'smtps.pec.aruba.it',
        port: 465,
        secure: true,
        instructions: 'Usa le credenziali PEC Aruba (es: tuaemail@pec.aruba.it)'
    },
    LEGALMAIL: {
        name: 'LegalMail (InfoCert)',
        host: 'sendm.legalmail.it',
        port: 465,
        secure: true,
        instructions: 'Usa le credenziali LegalMail InfoCert'
    },
    POSTECERT: {
        name: 'PosteCert',
        host: 'relay.postecert.poste.it',
        port: 465,
        secure: true,
        instructions: 'Usa le credenziali PosteCert'
    },
    CUSTOM: {
        name: 'Altro Provider',
        host: null,
        port: 465,
        secure: true,
        instructions: 'Inserisci manualmente i dati SMTP del tuo provider PEC'
    }
};

// ============================================
// ENCRYPTION HELPERS
// ============================================

/**
 * Cripta una stringa sensibile
 * @param {string} text - Testo da criptare
 * @returns {string} Testo criptato (iv:encrypted)
 */
function encryptValue(text) {
    if (!text) return null;
    try {
        const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
        const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
        const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
        logger.error({ error: error.message }, 'Errore encryption PEC config');
        throw new Error('Errore durante la cifratura delle credenziali');
    }
}

/**
 * Decripta una stringa sensibile
 * @param {string} encryptedText - Testo criptato (iv:encrypted)
 * @returns {string} Testo decriptato
 */
function decryptValue(encryptedText) {
    if (!encryptedText) return null;
    try {
        const [ivHex, encrypted] = encryptedText.split(':');
        if (!ivHex || !encrypted) return null;
        const iv = Buffer.from(ivHex, 'hex');
        const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
        const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        logger.error({ error: error.message }, 'Errore decryption PEC config');
        return null;
    }
}

// ============================================
// TENANT PEC CONFIG SERVICE
// ============================================

const TenantPecConfigService = {
    /**
     * Lista provider PEC supportati
     * @returns {Object[]} Lista provider con info
     */
    getAvailableProviders() {
        return Object.entries(PEC_PROVIDERS).map(([code, config]) => ({
            code,
            ...config
        }));
    },

    /**
     * Recupera configurazione PEC per un tenant
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object|null>} Configurazione PEC (senza password in chiaro)
     */
    async getConfig(tenantId) {
        const config = await prisma.tenantConfiguration.findFirst({
            where: {
                tenantId, configKey: PEC_CONFIG_KEY, deletedAt: null
            }
        });

        if (!config || !config.configValue) {
            return null;
        }

        const pecConfig = config.configValue;

        // Ritorna config senza password in chiaro
        return {
            provider: pecConfig.provider || 'CUSTOM',
            host: pecConfig.host,
            port: pecConfig.port || 465,
            secure: pecConfig.secure !== false,
            pecAddress: pecConfig.pecAddress,
            senderName: pecConfig.senderName,
            enabled: pecConfig.enabled !== false,
            testMode: pecConfig.testMode || false,
            testRecipient: pecConfig.testRecipient,
            hasPassword: !!pecConfig.encryptedPassword,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt
        };
    },

    /**
     * Recupera configurazione PEC completa per invio (con credenziali decriptate)
     * Solo per uso interno del PECService
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object|null>} Configurazione completa con credenziali
     */
    async getConfigForSending(tenantId) {
        const config = await prisma.tenantConfiguration.findFirst({
            where: {
                tenantId, configKey: PEC_CONFIG_KEY, deletedAt: null
            }
        });

        if (!config || !config.configValue) {
            // Fallback a env vars se tenant non ha config custom
            if (process.env.PEC_USER && process.env.PEC_PASS) {
                return {
                    provider: 'ENV',
                    host: process.env.PEC_SMTP_HOST || 'smtps.pec.aruba.it',
                    port: parseInt(process.env.PEC_SMTP_PORT || '465'),
                    secure: process.env.PEC_SMTP_SECURE !== 'false',
                    pecAddress: process.env.PEC_USER,
                    password: process.env.PEC_PASS,
                    senderName: process.env.PEC_SENDER_NAME || 'Element srl',
                    enabled: true,
                    testMode: false
                };
            }
            return null;
        }

        const pecConfig = config.configValue;

        if (!pecConfig.enabled) {
            return null;
        }

        // Decripta password
        const password = pecConfig.encryptedPassword
            ? decryptValue(pecConfig.encryptedPassword)
            : null;

        if (!password) {
            logger.warn({ tenantId }, 'PEC config senza password valida');
            return null;
        }

        return {
            provider: pecConfig.provider,
            host: pecConfig.host,
            port: pecConfig.port || 465,
            secure: pecConfig.secure !== false,
            pecAddress: pecConfig.pecAddress,
            password,
            senderName: pecConfig.senderName,
            enabled: pecConfig.enabled,
            testMode: pecConfig.testMode || false,
            testRecipient: pecConfig.testRecipient
        };
    },

    /**
     * Salva o aggiorna configurazione PEC per un tenant
     * @param {string} tenantId - ID tenant
     * @param {Object} data - Dati configurazione
     * @returns {Promise<Object>} Configurazione salvata
     */
    async saveConfig(tenantId, data) {
        const {
            provider,
            host,
            port,
            secure,
            pecAddress,
            password,
            senderName,
            enabled,
            testMode,
            testRecipient
        } = data;

        // Validazione
        if (!pecAddress || !pecAddress.includes('@')) {
            throw new Error('Indirizzo PEC non valido');
        }

        // Determina host in base al provider
        let finalHost = host;
        if (provider && provider !== 'CUSTOM' && PEC_PROVIDERS[provider]) {
            finalHost = PEC_PROVIDERS[provider].host || host;
        }

        if (!finalHost) {
            throw new Error('Host SMTP PEC obbligatorio');
        }

        // Cripta password se fornita
        const encryptedPassword = password ? encryptValue(password) : null;

        // Prepara config value
        const configValue = {
            provider: provider || 'CUSTOM',
            host: finalHost,
            port: port || 465,
            secure: secure !== false,
            pecAddress,
            senderName: senderName || 'Element srl - Medicina del Lavoro',
            enabled: enabled !== false,
            testMode: testMode || false,
            testRecipient: testRecipient || null,
            updatedBy: data.updatedBy
        };

        // Se password fornita, aggiungi criptata
        // Se non fornita, mantieni quella esistente
        if (encryptedPassword) {
            configValue.encryptedPassword = encryptedPassword;
        } else {
            // Recupera password esistente se presente
            const existing = await prisma.tenantConfiguration.findFirst({
                where: {
                    tenantId, configKey: PEC_CONFIG_KEY, deletedAt: null
            }
            });
            if (existing?.configValue?.encryptedPassword) {
                configValue.encryptedPassword = existing.configValue.encryptedPassword;
            }
        }

        // Upsert configurazione
        const result = await prisma.tenantConfiguration.upsert({
            where: {
                tenantId_configKey: {
                    tenantId,
                    configKey: PEC_CONFIG_KEY
                }
            },
            create: {
                tenantId,
                configKey: PEC_CONFIG_KEY,
                configType: PEC_CONFIG_TYPE,
                configValue,
                isEncrypted: true
            },
            update: {
                configValue,
                isEncrypted: true,
                updatedAt: new Date()
            }
        });

        logger.info({
            tenantId,
            provider: configValue.provider,
            pecAddress: configValue.pecAddress,
            enabled: configValue.enabled
        }, 'Configurazione PEC salvata');

        // Ritorna senza dati sensibili
        return {
            provider: configValue.provider,
            host: configValue.host,
            port: configValue.port,
            secure: configValue.secure,
            pecAddress: configValue.pecAddress,
            senderName: configValue.senderName,
            enabled: configValue.enabled,
            testMode: configValue.testMode,
            testRecipient: configValue.testRecipient,
            hasPassword: !!configValue.encryptedPassword,
            updatedAt: result.updatedAt
        };
    },

    /**
     * Elimina configurazione PEC per un tenant
     * @param {string} tenantId - ID tenant
     * @returns {Promise<boolean>} True se eliminata
     */
    async deleteConfig(tenantId) {
        const result = await prisma.tenantConfiguration.deleteMany({
            where: {
                tenantId,
                configKey: PEC_CONFIG_KEY
            }
        });

        logger.info({ tenantId }, 'Configurazione PEC eliminata');

        return result.count > 0;
    },

    /**
     * Testa la configurazione PEC inviando un'email di test
     * @param {string} tenantId - ID tenant
     * @param {string} testRecipient - Indirizzo email destinatario test
     * @returns {Promise<Object>} Risultato test
     */
    async testConfig(tenantId, testRecipient) {
        const config = await this.getConfigForSending(tenantId);

        if (!config) {
            throw new Error('Configurazione PEC non trovata o incompleta');
        }

        if (!testRecipient || !testRecipient.includes('@')) {
            throw new Error('Indirizzo destinatario test non valido');
        }

        // Import dinamico nodemailer
        const nodemailer = (await import('nodemailer')).default;

        // Crea transporter
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.pecAddress,
                pass: config.password
            },
            tls: {
                rejectUnauthorized: true,
                minVersion: 'TLSv1.2'
            }
        });

        // Verifica connessione
        try {
            await transporter.verify();
        } catch (error) {
            logger.error({
                tenantId,
                error: error.message
            }, 'Test connessione PEC fallito');

            throw new Error(`Connessione SMTP fallita: ${error.message}`);
        }

        // Invia email di test
        const timestamp = new Date().toLocaleString('it-IT');

        try {
            const result = await transporter.sendMail({
                from: `"${config.senderName}" <${config.pecAddress}>`,
                to: testRecipient,
                subject: `[TEST] Verifica configurazione PEC Element srl - ${timestamp}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #0d9488;">✅ Test Configurazione PEC</h2>
                        <p>Questa è un'email di test per verificare la corretta configurazione della PEC.</p>
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Provider</strong></td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${config.provider}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Mittente</strong></td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${config.pecAddress}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Data/Ora</strong></td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${timestamp}</td>
                            </tr>
                        </table>
                        <p style="color: #666; font-size: 12px;">
                            Se hai ricevuto questa email, la configurazione PEC è corretta.<br>
                            Element srl - Sistema Medicina del Lavoro D.Lgs 81/08
                        </p>
                    </div>
                `,
                text: `TEST Configurazione PEC Element srl\n\nProvider: ${config.provider}\nMittente: ${config.pecAddress}\nData/Ora: ${timestamp}\n\nSe hai ricevuto questa email, la configurazione PEC è corretta.`
            });

            logger.info({
                tenantId,
                testRecipient,
                messageId: result.messageId
            }, 'Test PEC inviato con successo');

            return {
                success: true,
                message: 'Email di test inviata con successo',
                messageId: result.messageId,
                recipient: testRecipient,
                sentAt: new Date()
            };

        } catch (error) {
            logger.error({
                tenantId,
                testRecipient,
                error: error.message
            }, 'Errore invio test PEC');

            throw new Error(`Errore invio email: ${error.message}`);
        }
    },

    /**
     * Verifica se un tenant ha una configurazione PEC valida e attiva
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Stato configurazione
     */
    async checkConfigStatus(tenantId) {
        const config = await this.getConfig(tenantId);

        if (!config) {
            return {
                configured: false,
                enabled: false,
                ready: false,
                message: 'Configurazione PEC non presente'
            };
        }

        const ready = config.enabled && config.hasPassword && config.pecAddress && config.host;

        return {
            configured: true,
            enabled: config.enabled,
            ready,
            provider: config.provider,
            pecAddress: config.pecAddress,
            testMode: config.testMode,
            message: ready
                ? 'Configurazione PEC pronta'
                : config.enabled
                    ? 'Configurazione PEC incompleta'
                    : 'PEC disabilitata'
        };
    }
};

export default TenantPecConfigService;
