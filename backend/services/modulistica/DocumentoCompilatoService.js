/**
 * DocumentoCompilatoService.js
 * Service per la gestione dei documenti compilati (Modulistica)
 * 
 * @description Gestisce CRUD e operazioni sui documenti compilati
 * @author ElementMedica
 * @version 1.0.0
 * @since Progetto 53 - Session #13
 */

import optimizedPrisma from '../../config/database.js';
import logger from '../../utils/logger.js';

// Get Prisma client instance
const prisma = optimizedPrisma.getClient();

/**
 * Service per DocumentoCompilato
 */
class DocumentoCompilatoService {
    /**
     * Ottiene tutti i documenti compilati per un tenant
     * @param {Object} params - Parametri di ricerca
     * @param {string} params.tenantId - ID del tenant
     * @param {string} [params.pazienteId] - Filtro per paziente
     * @param {string} [params.visitaId] - Filtro per visita
     * @param {string} [params.appuntamentoId] - Filtro per appuntamento
     * @param {string} [params.stato] - Filtro per stato
     * @param {string} [params.templateId] - Filtro per template
     * @param {boolean} [params.scaduti] - Mostra solo scaduti
     * @param {number} [params.page=1] - Pagina corrente
     * @param {number} [params.limit=50] - Elementi per pagina
     * @returns {Promise<{data: Array, total: number, page: number, limit: number}>}
     */
    async getAll({
        tenantId,
        pazienteId,
        visitaId,
        appuntamentoId,
        stato,
        templateId,
        scaduti,
        page = 1,
        limit = 50
    }) {
        logger.info({
            tenantId, pazienteId, visitaId, stato, page, limit
        }, 'DocumentoCompilatoService.getAll');

        const where = {
            tenantId,
            deletedAt: null
        };

        if (pazienteId) where.pazienteId = pazienteId;
        if (visitaId) where.visitaId = visitaId;
        if (appuntamentoId) where.appuntamentoId = appuntamentoId;
        if (stato) where.stato = stato;
        if (templateId) where.documentoTemplateId = templateId;

        if (scaduti === true) {
            where.dataScadenza = { lt: new Date() };
            where.stato = { notIn: ['ANNULLATO', 'SCADUTO'] };
        }

        const [data, total] = await Promise.all([
            prisma.documentoCompilato.findMany({
                where,
                include: {
                    documentoTemplate: {
                        select: {
                            id: true,
                            nome: true,
                            tipo: true,
                            fase: true,
                            richiedeFirma: true,
                            richiedeFirmaMedico: true
                        }
                    },
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true
                        }
                    },
                    visita: {
                        select: { id: true, dataOra: true, stato: true }
                    },
                    medicoFirmante: {
                        select: { id: true, firstName: true, lastName: true, gender: true }
                    }
                },
                orderBy: [
                    { createdAt: 'desc' }
                ],
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.documentoCompilato.count({ where })
        ]);

        return { data, total, page, limit };
    }

    /**
     * Ottiene un documento compilato per ID
     * @param {string} id - ID del documento
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<Object|null>}
     */
    async getById(id, tenantId) {
        logger.info({ id, tenantId }, 'DocumentoCompilatoService.getById');

        return prisma.documentoCompilato.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                documentoTemplate: true,
                paziente: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        taxCode: true,
                        birthDate: true,
                        gender: true
                    }
                },
                visita: {
                    select: { id: true, dataOra: true, stato: true }
                },
                appuntamento: {
                    select: { id: true, dataOra: true, stato: true }
                },
                medicoFirmante: {
                    select: { id: true, firstName: true, lastName: true, gender: true }
                },
                compilatore: {
                    select: { id: true, firstName: true, lastName: true }
                },
                logs: {
                    orderBy: { eseguitoAt: 'desc' },
                    take: 50
                }
            }
        });
    }

    /**
     * Crea un nuovo documento compilato
     * @param {Object} data - Dati del documento
     * @param {string} compilatoDa - ID utente che compila
     * @param {string} ipAddress - Indirizzo IP
     * @returns {Promise<Object>}
     */
    async create(data, compilatoDa, ipAddress) {
        const { tenantId, documentoTemplateId, pazienteId, visitaId, appuntamentoId, datiCompilati, note } = data;

        logger.info({
            tenantId, documentoTemplateId, pazienteId, visitaId, compilatoDa
        }, 'DocumentoCompilatoService.create');

        return prisma.$transaction(async (tx) => {
            // Verifica template
            const template = await tx.documentoTemplate.findFirst({
                where: { id: documentoTemplateId, tenantId, deletedAt: null }
            });

            if (!template) {
                throw new Error('Template non trovato');
            }

            // Calcola data scadenza
            let dataScadenza = null;
            if (template.scadenzaFissa) {
                dataScadenza = template.scadenzaFissa;
            } else if (template.validitaGiorni) {
                dataScadenza = new Date();
                dataScadenza.setDate(dataScadenza.getDate() + template.validitaGiorni);
            }

            // Crea documento
            const documento = await tx.documentoCompilato.create({
                data: {
                    tenantId,
                    documentoTemplateId,
                    pazienteId,
                    visitaId,
                    appuntamentoId,
                    datiCompilati,
                    note,
                    dataScadenza,
                    compilatoDa,
                    stato: 'BOZZA'
                },
                include: {
                    documentoTemplate: { select: { nome: true, tipo: true } },
                    paziente: { select: { id: true, firstName: true, lastName: true } }
                }
            });

            // Crea log
            await tx.documentoCompilatoLog.create({
                data: {
                    documentoCompilatoId: documento.id,
                    azione: 'CREATE',
                    dettagli: { templateNome: template.nome },
                    eseguitoDa: compilatoDa,
                    ipAddress
                }
            });

            return documento;
        });
    }

    /**
     * Aggiorna i dati compilati di un documento
     * @param {string} id - ID del documento
     * @param {Object} datiCompilati - Dati aggiornati
     * @param {string} tenantId - ID del tenant
     * @param {string} updatedBy - ID utente
     * @param {string} ipAddress - Indirizzo IP
     * @returns {Promise<Object>}
     */
    async updateDati(id, datiCompilati, tenantId, updatedBy, ipAddress) {
        logger.info({ id, tenantId, updatedBy }, 'DocumentoCompilatoService.updateDati');

        return prisma.$transaction(async (tx) => {
            const existing = await tx.documentoCompilato.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Documento non trovato');
            }

            // Non si può modificare un documento già firmato/completato
            if (['COMPLETATO', 'FIRMATO_PAZIENTE', 'FIRMATO_MEDICO'].includes(existing.stato)) {
                throw new Error('Non è possibile modificare un documento già firmato');
            }

            const documento = await tx.documentoCompilato.update({
                where: { id },
                data: {
                    datiCompilati,
                    stato: existing.stato === 'BOZZA' ? 'DA_FIRMARE' : existing.stato
                }
            });

            await tx.documentoCompilatoLog.create({
                data: {
                    documentoCompilatoId: id,
                    azione: 'UPDATE',
                    dettagli: { campiAggiornati: Object.keys(datiCompilati) },
                    eseguitoDa: updatedBy,
                    ipAddress
                }
            });

            return documento;
        });
    }

    /**
     * Aggiunge la firma del paziente
     * @param {string} id - ID del documento
     * @param {string} firma - Base64 della firma
     * @param {string} tenantId - ID del tenant
     * @param {string} signedBy - ID utente che registra la firma
     * @param {string} ipAddress - Indirizzo IP
     * @returns {Promise<Object>}
     */
    async firmaPaziente(id, firma, tenantId, signedBy, ipAddress) {
        logger.info({ id, tenantId, signedBy }, 'DocumentoCompilatoService.firmaPaziente');

        return prisma.$transaction(async (tx) => {
            const documento = await tx.documentoCompilato.findFirst({
                where: { id, tenantId, deletedAt: null },
                include: { documentoTemplate: true }
            });

            if (!documento) {
                throw new Error('Documento non trovato');
            }

            if (documento.firmaPaziente) {
                throw new Error('Documento già firmato dal paziente');
            }

            // Determina nuovo stato
            let nuovoStato = 'FIRMATO_PAZIENTE';
            if (!documento.documentoTemplate.richiedeFirmaMedico) {
                nuovoStato = 'COMPLETATO';
            } else if (documento.firmaMedico) {
                nuovoStato = 'COMPLETATO';
            }

            const updated = await tx.documentoCompilato.update({
                where: { id },
                data: {
                    firmaPaziente: firma,
                    firmaPazienteAt: new Date(),
                    firmaPazienteIp: ipAddress,
                    stato: nuovoStato
                }
            });

            await tx.documentoCompilatoLog.create({
                data: {
                    documentoCompilatoId: id,
                    azione: 'SIGN',
                    dettagli: { tipo: 'PAZIENTE', nuovoStato },
                    eseguitoDa: signedBy,
                    ipAddress
                }
            });

            return updated;
        });
    }

    /**
     * Aggiunge la firma del medico
     * @param {string} id - ID del documento
     * @param {string} firma - Base64 della firma
     * @param {string} medicoId - ID del medico firmante
     * @param {string} tenantId - ID del tenant
     * @param {string} ipAddress - Indirizzo IP
     * @returns {Promise<Object>}
     */
    async firmaMedico(id, firma, medicoId, tenantId, ipAddress) {
        logger.info({ id, medicoId, tenantId }, 'DocumentoCompilatoService.firmaMedico');

        return prisma.$transaction(async (tx) => {
            const documento = await tx.documentoCompilato.findFirst({
                where: { id, tenantId, deletedAt: null },
                include: { documentoTemplate: true }
            });

            if (!documento) {
                throw new Error('Documento non trovato');
            }

            if (documento.firmaMedico) {
                throw new Error('Documento già firmato dal medico');
            }

            // Determina nuovo stato
            let nuovoStato = 'FIRMATO_MEDICO';
            if (!documento.documentoTemplate.richiedeFirma) {
                nuovoStato = 'COMPLETATO';
            } else if (documento.firmaPaziente) {
                nuovoStato = 'COMPLETATO';
            }

            const updated = await tx.documentoCompilato.update({
                where: { id },
                data: {
                    firmaMedico: firma,
                    firmaMedicoAt: new Date(),
                    firmaMedicoId: medicoId,
                    firmaMedicoIp: ipAddress,
                    stato: nuovoStato
                }
            });

            await tx.documentoCompilatoLog.create({
                data: {
                    documentoCompilatoId: id,
                    azione: 'SIGN',
                    dettagli: { tipo: 'MEDICO', medicoId, nuovoStato },
                    eseguitoDa: medicoId,
                    ipAddress
                }
            });

            return updated;
        });
    }

    /**
     * Salva il PDF generato
     * @param {string} id - ID del documento
     * @param {string} pdfUrl - URL del PDF
     * @param {string} tenantId - ID del tenant
     * @param {string} generatoDa - ID utente
     * @param {string} ipAddress - Indirizzo IP
     * @returns {Promise<Object>}
     */
    async savePdf(id, pdfUrl, tenantId, generatoDa, ipAddress) {
        logger.info({ id, tenantId, generatoDa }, 'DocumentoCompilatoService.savePdf');

        return prisma.$transaction(async (tx) => {
            const documento = await tx.documentoCompilato.update({
                where: { id },
                data: {
                    pdfUrl,
                    pdfGeneratoAt: new Date()
                }
            });

            await tx.documentoCompilatoLog.create({
                data: {
                    documentoCompilatoId: id,
                    azione: 'PRINT',
                    dettagli: { pdfUrl },
                    eseguitoDa: generatoDa,
                    ipAddress
                }
            });

            return documento;
        });
    }

    /**
     * Annulla un documento
     * @param {string} id - ID del documento
     * @param {string} motivo - Motivo annullamento
     * @param {string} tenantId - ID del tenant
     * @param {string} annullatoDa - ID utente
     * @param {string} ipAddress - Indirizzo IP
     * @returns {Promise<Object>}
     */
    async annulla(id, motivo, tenantId, annullatoDa, ipAddress) {
        logger.info({ id, motivo, tenantId, annullatoDa }, 'DocumentoCompilatoService.annulla');

        return prisma.$transaction(async (tx) => {
            const documento = await tx.documentoCompilato.update({
                where: { id },
                data: {
                    stato: 'ANNULLATO',
                    motivoAnnullamento: motivo
                }
            });

            await tx.documentoCompilatoLog.create({
                data: {
                    documentoCompilatoId: id,
                    azione: 'DELETE',
                    dettagli: { motivo },
                    eseguitoDa: annullatoDa,
                    ipAddress
                }
            });

            return documento;
        });
    }

    /**
     * Soft delete di un documento compilato.
     * Solo documenti in stato BOZZA o DA_FIRMARE possono essere eliminati (prima della firma).
     * @param {string} id - ID del documento
     * @param {string} tenantId - ID del tenant
     * @param {string} deletedBy - ID utente
     * @param {string} ipAddress - Indirizzo IP
     * @param {string} deletionReason - Motivo eliminazione (GDPR, min 10 char)
     * @returns {Promise<Object>}
     */
    async delete(id, tenantId, deletedBy, ipAddress, deletionReason) {
        logger.info({ id, tenantId, deletedBy }, 'DocumentoCompilatoService.delete');

        // GDPR: deletionReason obbligatorio
        if (!deletionReason || deletionReason.length < 10) {
            throw new AppError('Motivo eliminazione obbligatorio (min 10 caratteri)', 400);
        }

        return prisma.$transaction(async (tx) => {
            // Verifica esistenza e stato
            const existing = await tx.documentoCompilato.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new AppError('Documento non trovato', 404);
            }

            // S71: Allow soft-delete for all non-terminal states (user can delete signed docs too)
            const NON_DELETABLE_STATES = ['ANNULLATO', 'SCADUTO'];
            if (NON_DELETABLE_STATES.includes(existing.stato)) {
                throw new AppError(
                    `Impossibile eliminare un documento in stato "${existing.stato}".`,
                    400
                );
            }

            const documento = await tx.documentoCompilato.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            // P72_18: Annulla movimenti contabili collegati al documento compilato (es. questionari fatturabili)
            const movimentiDaAnnullare = await tx.movimentoContabile.findMany({
                where: {
                    documentoCompilatoId: id,
                    tenantId,
                    stato: { notIn: ['ANNULLATO', 'FATTURATO'] },
                    deletedAt: null
                }
            });
            for (const movimento of movimentiDaAnnullare) {
                await tx.movimentoContabile.update({
                    where: { id: movimento.id },
                    data: { stato: 'ANNULLATO' }
                });
            }
            if (movimentiDaAnnullare.length > 0) {
                logger.info({ documentoId: id, movimentiAnnullati: movimentiDaAnnullare.length, tenantId }, 'Annullati movimenti contabili collegati al questionario eliminato');
            }

            // Log operazione
            await tx.documentoCompilatoLog.create({
                data: {
                    documentoCompilatoId: id,
                    azione: 'DELETE',
                    dettagli: { softDelete: true, deletionReason, stato: existing.stato },
                    eseguitoDa: deletedBy,
                    ipAddress
                }
            });

            // GDPR: Audit log
            await tx.gdprAuditLog.create({
                data: {
                    personId: deletedBy,
                    action: 'DELETE',
                    resourceType: 'DocumentoCompilato',
                    resourceId: id,
                    tenantId,
                    dataAccessed: {
                        deletionReason,
                        deletedBy,
                        operation: 'SOFT_DELETE',
                        previousStato: existing.stato
                    }
                }
            });

            return documento;
        });
    }

    /**
     * Ottiene documenti da far compilare per un paziente in una fase specifica
     * @param {Object} params - Parametri
     * @param {string} params.tenantId - ID tenant
     * @param {string} params.pazienteId - ID paziente
     * @param {string} [params.prestazioneId] - ID prestazione
     * @param {string} [params.medicoId] - ID medico
     * @param {string} params.fase - Fase corrente
     * @returns {Promise<Array>}
     */
    async getDocumentiDaCompilare({ tenantId, pazienteId, prestazioneId, medicoId, fase }) {
        logger.info({
            tenantId, pazienteId, prestazioneId, medicoId, fase
        }, 'DocumentoCompilatoService.getDocumentiDaCompilare');

        // Import dinamico per evitare dipendenze circolari
        const templateService = (await import('./DocumentoTemplateService.js')).default;

        // Ottieni template applicabili (exclude questionari — managed via QuestionarioMedicoService)
        const templatesBase = await templateService.getApplicabili({
            tenantId,
            prestazioneId,
            medicoId,
            fase,
            excludeQuestionari: true
        });
        let templates = templatesBase;

        // Durante la visita devono restare disponibili anche i consensi raccolti
        // in accettazione/tablet, così il medico può consultarli, rigenerarli o
        // firmarli senza uscire dalla visita.
        if (fase === 'DURANTE_VISITA') {
            const consentTemplates = (await Promise.all(['REGISTRAZIONE', 'PRE_VISITA'].map(consentFase =>
                templateService.getApplicabili({
                    tenantId,
                    prestazioneId,
                    medicoId,
                    fase: consentFase,
                    excludeQuestionari: true
                })
            ))).flat().filter(t => Array.isArray(t.consensoCodici) && t.consensoCodici.length > 0);

            templates = Array.from(
                new Map([...templatesBase, ...consentTemplates].map(t => [t.id, t])).values()
            );
        }

        // Per ogni template, verifica se già compilato per questo paziente (e non scaduto)
        const documentiEsistenti = await prisma.documentoCompilato.findMany({
            where: {
                tenantId,
                pazienteId,
                documentoTemplateId: { in: templates.map(t => t.id) },
                deletedAt: null,
                stato: { notIn: ['ANNULLATO', 'SCADUTO'] },
                OR: [
                    { dataScadenza: null },
                    { dataScadenza: { gte: new Date() } }
                ]
            },
            select: { documentoTemplateId: true, stato: true, id: true }
        });

        const esistentiMap = new Map(
            documentiEsistenti.map(d => [d.documentoTemplateId, d])
        );

        return templates.map(template => ({
            template,
            compilato: esistentiMap.get(template.id) || null,
            obbligatorio: template.obbligatorio
        }));
    }

    /**
     * Registra una visualizzazione documento (GDPR audit)
     * @param {string} id - ID documento
     * @param {string} visualizzatoDa - ID utente
     * @param {string} ipAddress - Indirizzo IP
     * @param {string} [userAgent] - User agent browser
     */
    async logView(id, visualizzatoDa, ipAddress, userAgent) {
        await prisma.documentoCompilatoLog.create({
            data: {
                documentoCompilatoId: id,
                azione: 'VIEW',
                eseguitoDa: visualizzatoDa,
                ipAddress,
                userAgent
            }
        });
    }

    /**
     * Aggiorna documenti scaduti
     * @param {string} tenantId - ID del tenant (opzionale, se non fornito processa tutti)
     * @returns {Promise<number>} - Numero di documenti aggiornati
     */
    async processScaduti(tenantId = null) {
        logger.info({ tenantId }, 'DocumentoCompilatoService.processScaduti');

        const where = {
            dataScadenza: { lt: new Date() },
            stato: { notIn: ['SCADUTO', 'ANNULLATO', 'COMPLETATO'] },
            deletedAt: null
        };

        if (tenantId) where.tenantId = tenantId;

        const result = await prisma.documentoCompilato.updateMany({
            where,
            data: { stato: 'SCADUTO' }
        });

        logger.info({ count: result.count }, 'Documenti scaduti aggiornati');
        return result.count;
    }

    /**
     * Statistiche documenti per tenant
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>}
     */
    async getStats(tenantId) {
        const [totali, perStato, scadutiOggi, daFirmare] = await Promise.all([
            prisma.documentoCompilato.count({
                where: { tenantId, deletedAt: null }
            }),
            prisma.documentoCompilato.groupBy({
                by: ['stato'],
                where: { tenantId, deletedAt: null },
                _count: true
            }),
            prisma.documentoCompilato.count({
                where: {
                    tenantId,
                    deletedAt: null,
                    dataScadenza: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lt: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                }
            }),
            prisma.documentoCompilato.count({
                where: {
                    tenantId,
                    deletedAt: null,
                    stato: 'DA_FIRMARE'
                }
            })
        ]);

        return {
            totali,
            perStato: perStato.reduce((acc, s) => {
                acc[s.stato] = s._count;
                return acc;
            }, {}),
            scadutiOggi,
            daFirmare
        };
    }
}

export default new DocumentoCompilatoService();
