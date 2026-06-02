/**
 * PECService - Servizio per invio PEC (Posta Elettronica Certificata)
 * 
 * Gestisce l'invio di comunicazioni ufficiali via PEC per:
 * - Giudizi di idoneità al lavoratore (Art. 41 D.Lgs 81/08)
 * - Giudizi di idoneità al datore di lavoro
 * - Comunicazioni obbligatorie MDL
 * 
 * Supporta provider PEC:
 * - Aruba PEC
 * - LegalMail (InfoCert)
 * - Generic SMTP PEC
 * 
 * @module services/clinical/PECService
 * @project P56 - Medicina del Lavoro - FASE 4 PEC Integration
 * @compliance D.Lgs 81/08 Art. 41
 */

import nodemailer from 'nodemailer';
import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import crypto from 'crypto';
import TenantPecConfigService from './TenantPecConfigService.js';
import { getMedicoTitle } from '../../utils/medicoFormatters.js';


// ============================================
// PEC PROVIDER CONFIGURATIONS
// ============================================

const PEC_PROVIDERS = {
    ARUBA: {
        host: 'smtps.pec.aruba.it',
        port: 465,
        secure: true,
        requireTLS: true
    },
    LEGALMAIL: {
        host: 'sendm.legalmail.it',
        port: 465,
        secure: true,
        requireTLS: true
    },
    GENERIC: {
        host: process.env.PEC_SMTP_HOST,
        port: parseInt(process.env.PEC_SMTP_PORT || '465'),
        secure: process.env.PEC_SMTP_SECURE !== 'false',
        requireTLS: true
    }
};

// ============================================
// PEC SERVICE
// ============================================

const PECService = {
    /**
     * Crea transporter PEC basato su configurazione tenant o provider di default
     * @param {Object} config - Configurazione PEC tenant-specific (da TenantPecConfigService)
     * @param {string} provider - Provider PEC fallback (ARUBA, LEGALMAIL, GENERIC)
     * @returns {nodemailer.Transporter} Transporter configurato
     */
    createTransporter(config = null, provider = 'GENERIC') {
        // Se abbiamo configurazione tenant-specific, usala
        if (config && config.pecAddress && config.password) {
            return nodemailer.createTransport({
                host: config.host,
                port: config.port || 465,
                secure: config.secure !== false,
                auth: {
                    user: config.pecAddress,
                    pass: config.password
                },
                pool: true,
                maxConnections: 2,
                maxMessages: 10,
                tls: {
                    rejectUnauthorized: true,
                    minVersion: 'TLSv1.2'
                }
            });
        }

        // Fallback a configurazione ambiente
        const providerConfig = PEC_PROVIDERS[provider] || PEC_PROVIDERS.GENERIC;

        return nodemailer.createTransport({
            ...providerConfig,
            auth: {
                user: process.env.PEC_USER,
                pass: process.env.PEC_PASS
            },
            pool: true,
            maxConnections: 2,
            maxMessages: 10,
            tls: {
                rejectUnauthorized: true,
                minVersion: 'TLSv1.2'
            }
        });
    },

    /**
     * Recupera configurazione PEC per un tenant
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object|null>} Configurazione PEC con credenziali
     */
    async getTenantPecConfig(tenantId) {
        return TenantPecConfigService.getConfigForSending(tenantId);
    },

    /**
     * Genera ID messaggio univoco per tracciamento
     * @returns {string} Message ID univoco
     */
    generateMessageId() {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(8).toString('hex');
        return `${timestamp}-${random}@elementmedica.pec`;
    },

    /**
     * Invia giudizio di idoneità al lavoratore via PEC
     * @param {string} giudizioId - ID giudizio
     * @param {string} tenantId - ID tenant
     * @param {Object} options - Opzioni invio
     * @returns {Promise<Object>} Risultato invio
     */
    async sendGiudizioToWorker(giudizioId, tenantId, options = {}) {
        const { pecDestinatario, ccDatoreLavoro } = options;

        // Recupera configurazione PEC tenant-specific
        const pecConfig = await this.getTenantPecConfig(tenantId);
        if (!pecConfig) {
            throw new Error('Configurazione PEC non trovata o incompleta. Configurare la PEC nelle impostazioni.');
        }

        // Se in modalità test, usa destinatario test
        const isTestMode = pecConfig.testMode && pecConfig.testRecipient;
        const effectiveRecipient = isTestMode ? pecConfig.testRecipient : null;

        // Recupera giudizio completo
        const giudizio = await prisma.giudizioIdoneita.findFirst({
            where: { id: giudizioId, tenantId, deletedAt: null },
            include: {
                person: {
                    include: {
                        tenantProfiles: {
                            where: { tenantId, deletedAt: null },
                            select: { email: true, pec: true, companyTenantProfileId: true }
                        }
                    }
                },
                medicoCompetente: {
                    select: { id: true, firstName: true, lastName: true, gender: true }
                },
                mansioni: {
                    include: {
                        mansione: {
                            select: {
                                codice: true,
                                denominazione: true,
                                site: {
                                    select: {
                                        companyTenantProfile: {
                                            include: { company: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                visita: {
                    select: { id: true, dataOra: true, tipoVisitaMDL: true }
                }
            }
        });

        if (!giudizio) {
            throw new Error(`Giudizio ${giudizioId} non trovato`);
        }

        // Determina indirizzo PEC destinatario
        const workerProfile = giudizio.person?.tenantProfiles?.[0];
        const realDestinatario = pecDestinatario || workerProfile?.pec || workerProfile?.email;

        if (!realDestinatario) {
            throw new Error('Indirizzo PEC/email lavoratore non disponibile');
        }

        // Usa destinatario test se in modalità test
        const destinatarioPEC = effectiveRecipient || realDestinatario;

        // Genera contenuto email
        const { subject, html, text } = this.generateGiudizioEmail(giudizio, 'worker');

        // Genera message ID per tracciamento
        const messageId = this.generateMessageId();

        try {
            // Crea transporter con configurazione tenant
            const transporter = this.createTransporter(pecConfig);
            const senderAddress = pecConfig.pecAddress;
            const senderName = pecConfig.senderName || 'Element srl - Medicina del Lavoro';

            // Prepara email
            const mailOptions = {
                from: `"${senderName}" <${senderAddress}>`,
                to: destinatarioPEC,
                cc: isTestMode ? undefined : ccDatoreLavoro, // Non CC in modalità test
                subject: isTestMode ? `[TEST] ${subject}` : subject,
                html,
                text,
                messageId: `<${messageId}>`,
                headers: {
                    'X-Priority': '1',
                    'X-Mailer': 'Element srl MDL',
                    'X-Giudizio-ID': giudizioId,
                    'Disposition-Notification-To': senderAddress
                }
            };

            // Invia email
            const result = await transporter.sendMail(mailOptions);

            // Registra invio
            const pecLog = await prisma.pecLog.create({
                data: {
                    messageId,
                    giudizioId,
                    tipo: 'GIUDIZIO_LAVORATORE',
                    destinatario: destinatarioPEC,
                    oggetto: mailOptions.subject,
                    statoInvio: 'INVIATO',
                    dataInvio: new Date(),
                    smtpResponse: result.response,
                    tenantId
                }
            });

            // Aggiorna giudizio con dati PEC
            await prisma.giudizioIdoneita.update({
                where: { id: giudizioId },
                data: {
                    pecLavoratoreMessageId: messageId,
                    pecLavoratoreDestinatario: destinatarioPEC,
                    dataNotificaLavoratore: new Date(),
                    // Ricalcola termine ricorso (30 giorni da notifica)
                    ricorsoEntro: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            });

            logger.info({
                giudizioId,
                messageId,
                destinatario: destinatarioPEC,
                tenantId
            }, 'PEC giudizio inviata al lavoratore');

            return {
                success: true,
                messageId,
                destinatario: destinatarioPEC,
                dataInvio: new Date(),
                pecLogId: pecLog.id
            };

        } catch (error) {
            // Registra errore
            await prisma.pecLog.create({
                data: {
                    messageId,
                    giudizioId,
                    tipo: 'GIUDIZIO_LAVORATORE',
                    destinatario: destinatarioPEC,
                    oggetto: subject,
                    statoInvio: 'ERRORE',
                    dataInvio: new Date(),
                    errore: 'Errore invio PEC giudizio lavoratore',
                    tenantId
                }
            });

            logger.error({
                giudizioId,
                error: error.message,
                tenantId
            }, 'Errore invio PEC giudizio');

            throw error;
        }
    },

    /**
     * Invia giudizio di idoneità al datore di lavoro via PEC
     * @param {string} giudizioId - ID giudizio
     * @param {string} tenantId - ID tenant
     * @param {Object} options - Opzioni invio
     * @returns {Promise<Object>} Risultato invio
     */
    async sendGiudizioToEmployer(giudizioId, tenantId, options = {}) {
        const { pecDestinatario } = options;

        // Recupera configurazione PEC tenant-specific
        const pecConfig = await this.getTenantPecConfig(tenantId);
        if (!pecConfig) {
            throw new Error('Configurazione PEC non trovata o incompleta. Configurare la PEC nelle impostazioni.');
        }

        // Se in modalità test, usa destinatario test
        const isTestMode = pecConfig.testMode && pecConfig.testRecipient;
        const effectiveRecipient = isTestMode ? pecConfig.testRecipient : null;

        // Recupera giudizio con dati azienda
        const giudizio = await prisma.giudizioIdoneita.findFirst({
            where: { id: giudizioId, tenantId, deletedAt: null },
            include: {
                person: {
                    select: { id: true, firstName: true, lastName: true, taxCode: true }
                },
                medicoCompetente: {
                    select: { id: true, firstName: true, lastName: true, gender: true }
                },
                mansioni: {
                    include: {
                        mansione: {
                            include: {
                                site: {
                                    include: {
                                        companyTenantProfile: {
                                            include: {
                                                company: true,
                                                referente: { select: { firstName: true, lastName: true } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!giudizio) {
            throw new Error(`Giudizio ${giudizioId} non trovato`);
        }

        // Determina PEC datore di lavoro
        const mansioneWithSite = giudizio.mansioni?.find(m => m.mansione?.site?.companyTenantProfile);
        const companyProfile = mansioneWithSite?.mansione?.site?.companyTenantProfile;
        const company = companyProfile?.company;
        const realDestinatario = pecDestinatario || companyProfile?.pec || company?.pecFatturazione;

        if (!realDestinatario) {
            throw new Error('Indirizzo PEC datore di lavoro non disponibile');
        }

        // Usa destinatario test se in modalità test
        const destinatarioPEC = effectiveRecipient || realDestinatario;

        // Genera contenuto email (versione datore - senza dati sanitari sensibili)
        const { subject, html, text } = this.generateGiudizioEmail(giudizio, 'employer');

        const messageId = this.generateMessageId();

        try {
            // Crea transporter con configurazione tenant
            const transporter = this.createTransporter(pecConfig);
            const senderAddress = pecConfig.pecAddress;
            const senderName = pecConfig.senderName || 'Element srl - Medicina del Lavoro';

            const mailOptions = {
                from: `"${senderName}" <${senderAddress}>`,
                to: destinatarioPEC,
                subject: isTestMode ? `[TEST] ${subject}` : subject,
                html,
                text,
                messageId: `<${messageId}>`,
                headers: {
                    'X-Priority': '1',
                    'X-Mailer': 'Element srl MDL',
                    'X-Giudizio-ID': giudizioId,
                    'Disposition-Notification-To': senderAddress
                }
            };

            const result = await transporter.sendMail(mailOptions);

            // Registra invio
            const pecLog = await prisma.pecLog.create({
                data: {
                    messageId,
                    giudizioId,
                    tipo: 'GIUDIZIO_DATORE',
                    destinatario: destinatarioPEC,
                    oggetto: mailOptions.subject,
                    statoInvio: 'INVIATO',
                    dataInvio: new Date(),
                    smtpResponse: result.response,
                    tenantId
                }
            });

            // Aggiorna giudizio
            await prisma.giudizioIdoneita.update({
                where: { id: giudizioId },
                data: {
                    pecDatoreLavoroMessageId: messageId,
                    pecDatoreLavoroDestinatario: destinatarioPEC,
                    dataNotificaDatoreLavoro: new Date()
                }
            });

            logger.info({
                giudizioId,
                messageId,
                destinatario: destinatarioPEC,
                tenantId
            }, 'PEC giudizio inviata al datore di lavoro');

            return {
                success: true,
                messageId,
                destinatario: destinatarioPEC,
                dataInvio: new Date(),
                pecLogId: pecLog.id
            };

        } catch (error) {
            await prisma.pecLog.create({
                data: {
                    messageId,
                    giudizioId,
                    tipo: 'GIUDIZIO_DATORE',
                    destinatario: destinatarioPEC,
                    oggetto: subject,
                    statoInvio: 'ERRORE',
                    dataInvio: new Date(),
                    errore: 'Errore invio PEC datore di lavoro',
                    tenantId
                }
            });

            logger.error({
                giudizioId,
                error: error.message,
                tenantId
            }, 'Errore invio PEC a datore di lavoro');

            throw error;
        }
    },

    /**
     * Genera contenuto email per giudizio di idoneità
     * @param {Object} giudizio - Giudizio completo
     * @param {string} recipientType - 'worker' o 'employer'
     * @returns {Object} { subject, html, text }
     */
    generateGiudizioEmail(giudizio, recipientType) {
        const worker = giudizio.person;
        const mc = giudizio.medicoCompetente;
        const mansioniDenominazioni = giudizio.mansioni?.map(m => m.mansione?.denominazione).filter(Boolean).join(', ') || 'N/D';
        const mansioneWithSite = giudizio.mansioni?.find(m => m.mansione?.site?.companyTenantProfile);
        const company = mansioneWithSite?.mansione?.site?.companyTenantProfile?.company;

        // Titolo medico corretto (italiano)
        const mcTitle = getMedicoTitle(mc?.gender);
        const mcName = `${mcTitle} ${mc?.lastName} ${mc?.firstName}`;

        // Data formattata
        const dataEmissione = new Date(giudizio.dataEmissione).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        const dataScadenza = new Date(giudizio.dataScadenza).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        // Testo giudizio
        const GIUDIZIO_LABELS = {
            'IDONEO': 'IDONEO alla mansione specifica',
            'IDONEO_CON_PRESCRIZIONI': 'IDONEO con prescrizioni',
            'IDONEO_CON_LIMITAZIONI': 'IDONEO con limitazioni',
            'NON_IDONEO_TEMPORANEO': 'NON IDONEO temporaneamente',
            'NON_IDONEO_PERMANENTE': 'NON IDONEO permanentemente'
        };

        const giudizioText = GIUDIZIO_LABELS[giudizio.tipoGiudizio] || giudizio.tipoGiudizio;

        const subject = recipientType === 'worker'
            ? `Comunicazione Giudizio di Idoneità - ${company?.ragioneSociale || 'Azienda'}`
            : `Giudizio di Idoneità Lavoratore ${worker?.lastName} ${worker?.firstName} - Art. 41 D.Lgs 81/08`;

        // HTML Template
        const html = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Giudizio di Idoneità</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0 0 10px 0; font-size: 24px; }
        .header p { margin: 0; opacity: 0.9; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
        .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
        .section-title { font-weight: bold; color: #0d9488; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
        .row { display: flex; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .label { font-weight: 600; color: #64748b; width: 180px; flex-shrink: 0; }
        .value { flex: 1; }
        .giudizio-box { background: ${giudizio.tipoGiudizio?.includes('NON_IDONEO') ? '#fef2f2' : giudizio.tipoGiudizio === 'IDONEO' ? '#f0fdf4' : '#fffbeb'}; border: 2px solid ${giudizio.tipoGiudizio?.includes('NON_IDONEO') ? '#fca5a5' : giudizio.tipoGiudizio === 'IDONEO' ? '#86efac' : '#fcd34d'}; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .giudizio-text { font-size: 20px; font-weight: bold; color: ${giudizio.tipoGiudizio?.includes('NON_IDONEO') ? '#dc2626' : giudizio.tipoGiudizio === 'IDONEO' ? '#16a34a' : '#d97706'}; }
        .alert { background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .alert-title { font-weight: bold; color: #92400e; margin-bottom: 5px; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
        .firma { margin-top: 30px; padding-top: 20px; border-top: 2px dashed #e2e8f0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏥 Giudizio di Idoneità alla Mansione Specifica</h1>
        <p>Ai sensi dell'Art. 41 comma 6 del D.Lgs 81/08 e s.m.i.</p>
    </div>
    
    <div class="content">
        ${recipientType === 'worker' ? `
        <p>Gentile <strong>${worker?.lastName} ${worker?.firstName}</strong>,</p>
        <p>Le comunichiamo il giudizio di idoneità alla mansione specifica emesso a seguito della visita medica effettuata.</p>
        ` : `
        <p>Spett.le <strong>${company?.ragioneSociale}</strong>,</p>
        <p>Vi comunichiamo il giudizio di idoneità emesso per il lavoratore <strong>${worker?.lastName} ${worker?.firstName}</strong> ai sensi dell'Art. 41 comma 6-bis del D.Lgs 81/08.</p>
        `}

        <div class="section">
            <div class="section-title">📋 Dati Identificativi</div>
            <div class="row">
                <span class="label">Lavoratore:</span>
                <span class="value">${worker?.lastName} ${worker?.firstName}</span>
            </div>
            ${recipientType === 'worker' ? `
            <div class="row">
                <span class="label">Codice Fiscale:</span>
                <span class="value">${worker?.taxCode || 'N/D'}</span>
            </div>
            ` : ''}
            <div class="row">
                <span class="label">Azienda:</span>
                <span class="value">${company?.ragioneSociale || 'N/D'}</span>
            </div>
            <div class="row">
                <span class="label">Mansione/i:</span>
                <span class="value">${mansioniDenominazioni}</span>
            </div>
        </div>

        <div class="giudizio-box">
            <p style="margin: 0 0 10px 0; color: #64748b;">GIUDIZIO DI IDONEITÀ</p>
            <p class="giudizio-text">${giudizioText}</p>
        </div>

        ${giudizio.prescrizioniIdoneita || giudizio.limitazioni ? `
        <div class="section">
            <div class="section-title">⚠️ Prescrizioni / Limitazioni</div>
            ${giudizio.prescrizioniIdoneita ? `
            <div class="row">
                <span class="label">Prescrizioni:</span>
                <span class="value">${giudizio.prescrizioniIdoneita}</span>
            </div>
            ` : ''}
            ${giudizio.limitazioni ? `
            <div class="row">
                <span class="label">Limitazioni:</span>
                <span class="value">${giudizio.limitazioni}</span>
            </div>
            ` : ''}
        </div>
        ` : ''}

        <div class="section">
            <div class="section-title">📅 Date</div>
            <div class="row">
                <span class="label">Data Emissione:</span>
                <span class="value">${dataEmissione}</span>
            </div>
            <div class="row">
                <span class="label">Valido Fino a:</span>
                <span class="value">${dataScadenza}</span>
            </div>
        </div>

        ${recipientType === 'worker' ? `
        <div class="alert">
            <div class="alert-title">📣 Diritto di Ricorso</div>
            <p style="margin: 0;">Ai sensi dell'Art. 41 comma 9 del D.Lgs 81/08, entro <strong>30 giorni</strong> dalla data di comunicazione del presente giudizio, può presentare ricorso avverso il giudizio stesso all'organo di vigilanza territorialmente competente (ASL/ATS).</p>
        </div>
        ` : ''}

        <div class="firma">
            <p><strong>Il Medico Competente</strong></p>
            <p>${mcName}</p>
            <p style="color: #64748b; font-size: 12px;">Documento firmato digitalmente ai sensi del CAD</p>
        </div>
    </div>

    <div class="footer">
        <p>Questo messaggio è stato inviato tramite Posta Elettronica Certificata (PEC)</p>
        <p>Element srl - Sistema di Medicina del Lavoro | D.Lgs 81/08</p>
        <p style="font-size: 10px; color: #94a3b8;">ID Giudizio: ${giudizio.id}</p>
    </div>
</body>
</html>`;

        // Plain text version
        const text = `
GIUDIZIO DI IDONEITÀ ALLA MANSIONE SPECIFICA
Ai sensi dell'Art. 41 comma 6 del D.Lgs 81/08

${recipientType === 'worker' ? `
Gentile ${worker?.lastName} ${worker?.firstName},
Le comunichiamo il giudizio di idoneità alla mansione specifica emesso a seguito della visita medica effettuata.
` : `
Spett.le ${company?.ragioneSociale},
Vi comunichiamo il giudizio di idoneità emesso per il lavoratore ${worker?.lastName} ${worker?.firstName}.
`}

DATI IDENTIFICATIVI
- Lavoratore: ${worker?.lastName} ${worker?.firstName}
${recipientType === 'worker' ? `- Codice Fiscale: ${worker?.taxCode || 'N/D'}` : ''}
- Azienda: ${company?.ragioneSociale || 'N/D'}
- Mansione/i: ${mansioniDenominazioni}

GIUDIZIO: ${giudizioText}

${giudizio.prescrizioniIdoneita ? `PRESCRIZIONI: ${giudizio.prescrizioniIdoneita}` : ''}
${giudizio.limitazioni ? `LIMITAZIONI: ${giudizio.limitazioni}` : ''}

DATE
- Data Emissione: ${dataEmissione}
- Valido Fino a: ${dataScadenza}

${recipientType === 'worker' ? `
DIRITTO DI RICORSO
Ai sensi dell'Art. 41 comma 9 del D.Lgs 81/08, entro 30 giorni dalla data di comunicazione del presente giudizio, può presentare ricorso all'organo di vigilanza territorialmente competente (ASL/ATS).
` : ''}

Il Medico Competente
${mcName}

---
Element srl - Sistema di Medicina del Lavoro
ID Giudizio: ${giudizio.id}
`;

        return { subject, html, text };
    },

    /**
     * Verifica stato consegna PEC
     * @param {string} messageId - ID messaggio PEC
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Stato consegna
     */
    async checkDeliveryStatus(messageId, tenantId) {
        const pecLog = await prisma.pecLog.findFirst({
            where: { messageId, tenantId }
        });

        if (!pecLog) {
            throw new Error('PEC log non trovato');
        }

        // In una implementazione reale, qui verificheremmo la ricevuta
        // tramite IMAP/POP3 dal provider PEC

        return {
            messageId,
            statoInvio: pecLog.statoInvio,
            dataInvio: pecLog.dataInvio,
            ricevutaAccettazione: pecLog.ricevutaAccettazione,
            ricevutaConsegna: pecLog.ricevutaConsegna,
            errore: pecLog.errore
        };
    },

    /**
     * Recupera log PEC per un giudizio
     * @param {string} giudizioId - ID giudizio
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Array>} Lista log PEC
     */
    async getLogsForGiudizio(giudizioId, tenantId) {
        return prisma.pecLog.findMany({
            where: { giudizioId, tenantId },
            orderBy: { dataInvio: 'desc' }
        });
    },

    /**
     * Registra ricevuta di accettazione/consegna PEC
     * @param {string} messageId - ID messaggio
     * @param {string} tipo - 'ACCETTAZIONE' o 'CONSEGNA'
     * @param {Object} ricevuta - Dati ricevuta
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Log aggiornato
     */
    async registerReceipt(messageId, tipo, ricevuta, tenantId) {
        const updateData = tipo === 'ACCETTAZIONE'
            ? {
                ricevutaAccettazione: ricevuta.content,
                ricevutaAccettazioneData: new Date()
            }
            : {
                ricevutaConsegna: ricevuta.content,
                ricevutaConsegnaData: new Date(),
                statoInvio: 'CONSEGNATO'
            };

        const pecLog = await prisma.pecLog.updateMany({
            where: { messageId, tenantId },
            data: updateData
        });

        logger.info({
            messageId,
            tipo,
            tenantId
        }, `Ricevuta PEC ${tipo} registrata`);

        return pecLog;
    },

    /**
     * Statistiche invii PEC
     * @param {string} tenantId - ID tenant
     * @param {Object} period - Periodo { from, to }
     * @returns {Promise<Object>} Statistiche
     */
    async getStats(tenantId, period = {}) {
        const where = {
            tenantId,
            ...(period.from && {
                dataInvio: {
                    gte: period.from,
                    ...(period.to && { lte: period.to })
                }
            })
        };

        const [totale, inviati, consegnati, errori] = await Promise.all([
            prisma.pecLog.count({ where }),
            prisma.pecLog.count({ where: { ...where, statoInvio: 'INVIATO' } }),
            prisma.pecLog.count({ where: { ...where, statoInvio: 'CONSEGNATO' } }),
            prisma.pecLog.count({ where: { ...where, statoInvio: 'ERRORE' } })
        ]);

        return {
            totale,
            inviati,
            consegnati,
            errori,
            tassoConsegna: totale > 0 ? ((consegnati / totale) * 100).toFixed(1) : 0
        };
    }
};

export default PECService;
