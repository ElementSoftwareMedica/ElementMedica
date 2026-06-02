/**
 * DocumentoTemplateService.js
 * Service per la gestione dei template documenti (Modulistica)
 * 
 * @description Gestisce CRUD e operazioni sui template documenti
 * @author ElementMedica
 * @version 1.0.0
 * @since Progetto 53 - Session #13
 */

import optimizedPrisma from '../../config/database.js';
import logger from '../../utils/logger.js';

// Get Prisma client instance
const prisma = optimizedPrisma.getClient();

function stripHtml(html = '') {
    return String(html)
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function buildConsentHtml(title, text) {
    const safeTitle = String(title || 'Consenso').trim();
    const paragraphs = String(text || '')
        .split(/\n{2,}/)
        .map(part => part.trim())
        .filter(Boolean)
        .map(part => `<p>${part.replace(/\n/g, '<br>')}</p>`)
        .join('');
    return `<h2>${safeTitle}</h2>${paragraphs || '<p></p>'}`;
}

function normalizeConsentTemplateData(templateData) {
    const codici = Array.isArray(templateData.consensoCodici)
        ? templateData.consensoCodici.filter(Boolean)
        : [];
    if (codici.length === 0) return templateData;

    const campi = Array.isArray(templateData.campi) ? [...templateData.campi] : [];
    const textFieldIndex = campi.findIndex(campo => campo?.name === 'testo_consenso');
    const htmlText = stripHtml(templateData.contenutoHtml || templateData.contenutoPdf || '');
    const existingText = textFieldIndex >= 0
        ? String(campi[textFieldIndex]?.defaultValue || '').trim()
        : '';
    const testoConsenso = existingText || htmlText || String(templateData.descrizione || templateData.nome || '').trim();

    const textField = {
        name: 'testo_consenso',
        label: 'Testo mostrato al paziente sul tablet',
        type: 'textarea',
        required: false,
        defaultValue: testoConsenso,
    };

    if (textFieldIndex >= 0) {
        campi[textFieldIndex] = { ...campi[textFieldIndex], ...textField };
    } else {
        campi.unshift(textField);
    }

    return {
        ...templateData,
        campi,
        contenutoHtml: buildConsentHtml(templateData.nome, testoConsenso),
    };
}

async function syncConsensoModuli(tx, template, tenantId) {
    const codici = Array.isArray(template.consensoCodici) ? template.consensoCodici.filter(Boolean) : [];
    if (codici.length === 0) return;

    const testoCampo = Array.isArray(template.campi)
        ? template.campi.find(campo => campo?.name === 'testo_consenso')?.defaultValue
        : null;
    const testo = String(testoCampo || '').trim()
        || stripHtml(template.contenutoHtml || template.contenutoPdf || template.descrizione || template.nome);
    if (!testo) return;

    for (const codice of codici) {
        await tx.consensoModulo.upsert({
            where: { tenantId_codice: { tenantId, codice } },
            create: {
                tenantId,
                codice,
                titolo: template.nome,
                sottotitolo: template.descrizione || null,
                testo,
                obbligatorio: !!template.obbligatorio,
                attivo: template.isActive !== false,
                ordine: template.ordine || 0,
                validitaGiorni: template.validitaGiorni ?? null,
                prestazioniIds: template.prestazioni?.map(p => p.prestazioneId).filter(Boolean) || [],
            },
            update: {
                titolo: template.nome,
                sottotitolo: template.descrizione || null,
                testo,
                obbligatorio: !!template.obbligatorio,
                attivo: template.isActive !== false,
                ordine: template.ordine || 0,
                validitaGiorni: template.validitaGiorni ?? null,
                prestazioniIds: template.prestazioni?.map(p => p.prestazioneId).filter(Boolean) || [],
                deletedAt: null,
            },
        });
    }
}

/**
 * Service per DocumentoTemplate
 */
class DocumentoTemplateService {
    /**
     * Ottiene tutti i template per un tenant
     * @param {Object} params - Parametri di ricerca
     * @param {string} params.tenantId - ID del tenant
     * @param {string} [params.tipo] - Filtro per tipo documento
     * @param {string} [params.fase] - Filtro per fase documento
     * @param {boolean} [params.isActive] - Filtro per stato attivo
     * @param {string} [params.search] - Ricerca testuale
     * @param {number} [params.page=1] - Pagina corrente
     * @param {number} [params.limit=50] - Elementi per pagina
     * @returns {Promise<{data: Array, total: number, page: number, limit: number}>}
     */
    async getAll({ tenantId, tipo, fase, isActive, search, page = 1, limit = 50 }) {
        logger.info({ tenantId, tipo, fase, isActive, search, page, limit }, 'DocumentoTemplateService.getAll');

        const where = {
            tenantId,
            deletedAt: null
        };

        if (tipo) where.tipo = tipo;
        if (fase) where.fase = fase;
        if (typeof isActive === 'boolean') where.isActive = isActive;
        if (search) {
            where.OR = [
                { nome: { contains: search, mode: 'insensitive' } },
                { descrizione: { contains: search, mode: 'insensitive' } },
                { codice: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [data, total] = await Promise.all([
            prisma.documentoTemplate.findMany({
                where,
                include: {
                    prestazioni: {
                        include: {
                            prestazione: {
                                select: { id: true, nome: true, codice: true }
                            }
                        }
                    },
                    medici: {
                        include: {
                            medico: {
                                select: { id: true, firstName: true, lastName: true }
                            }
                        }
                    },
                    questionarioConfig: {
                        select: {
                            id: true,
                            haScoring: true,
                            scoringConfig: true,
                            sogliaCritica: true,
                        }
                    },
                    _count: {
                        select: { compilati: true }
                    }
                },
                orderBy: [
                    { ordine: 'asc' },
                    { nome: 'asc' }
                ],
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.documentoTemplate.count({ where })
        ]);

        return { data, total, page, limit };
    }

    /**
     * Ottiene un template per ID
     * @param {string} id - ID del template
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<Object|null>}
     */
    async getById(id, tenantId) {
        logger.info({ id, tenantId }, 'DocumentoTemplateService.getById');

        return prisma.documentoTemplate.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                prestazioni: {
                    include: {
                        prestazione: {
                            select: { id: true, nome: true, codice: true }
                        }
                    }
                },
                medici: {
                    include: {
                        medico: {
                            select: { id: true, firstName: true, lastName: true, gender: true }
                        }
                    }
                },
                questionarioConfig: {
                    select: {
                        id: true,
                        haScoring: true,
                        scoringConfig: true,
                        sogliaCritica: true,
                    }
                },
                logs: {
                    orderBy: { eseguitoAt: 'desc' },
                    take: 20
                }
            }
        });
    }

    /**
     * Crea un nuovo template
     * @param {Object} data - Dati del template
     * @param {string} data.tenantId - ID del tenant
     * @param {string} data.nome - Nome del template
     * @param {string} [data.descrizione] - Descrizione
     * @param {string} [data.codice] - Codice interno
     * @param {string} [data.tipo] - Tipo documento
     * @param {string} [data.fase] - Fase documento
     * @param {string} [data.contenutoHtml] - Contenuto HTML
     * @param {Object} [data.campi] - Schema campi
     * @param {string[]} [data.branchTypes] - Branch types applicabili
     * @param {boolean} [data.richiedeFirma] - Richiede firma paziente
     * @param {boolean} [data.richiedeFirmaMedico] - Richiede firma medico
     * @param {number} [data.validitaGiorni] - Validità in giorni
     * @param {boolean} [data.obbligatorio] - Se obbligatorio
     * @param {string[]} [data.prestazioniIds] - IDs delle prestazioni associate
     * @param {string[]} [data.mediciIds] - IDs dei medici associati
     * @param {string} createdBy - ID utente che crea
     * @param {string} ipAddress - Indirizzo IP
     * @returns {Promise<Object>}
     */
    async create(data, createdBy, ipAddress) {
        const { prestazioniIds, mediciIds, questionarioConfig, ...templateData } = data;
        const normalizedTemplateData = normalizeConsentTemplateData(templateData);

        logger.info({
            tenantId: data.tenantId,
            nome: data.nome,
            prestazioniCount: prestazioniIds?.length,
            mediciCount: mediciIds?.length,
            createdBy
        }, 'DocumentoTemplateService.create');

        return prisma.$transaction(async (tx) => {
            // Crea il template
            const template = await tx.documentoTemplate.create({
                data: {
                    ...normalizedTemplateData,
                    createdBy,
                    // Crea le associazioni con prestazioni
                    prestazioni: prestazioniIds?.length > 0 ? {
                        create: prestazioniIds.map(prestazioneId => ({
                            prestazioneId
                        }))
                    } : undefined,
                    // Crea le associazioni con medici
                    medici: mediciIds?.length > 0 ? {
                        create: mediciIds.map(medicoId => ({
                            medicoId
                        }))
                    } : undefined
                },
                include: {
                    prestazioni: { include: { prestazione: true } },
                    medici: { include: { medico: true } }
                }
            });

            // Crea log
            await tx.documentoTemplateLog.create({
                data: {
                    documentoTemplateId: template.id,
                    azione: 'CREATE',
                    dettagli: { nome: template.nome, tipo: template.tipo },
                    eseguitoDa: createdBy,
                    ipAddress
                }
            });

            // Crea configurazione questionario/scoring se fornita
            if (questionarioConfig && questionarioConfig.haScoring) {
                await tx.questionarioMedicoConfig.create({
                    data: {
                        documentoTemplateId: template.id,
                        tenantId: data.tenantId,
                        haScoring: true,
                        scoringConfig: questionarioConfig.scoringConfig || null,
                        sogliaCritica: questionarioConfig.sogliaCritica || null,
                    }
                });
            }

            await syncConsensoModuli(tx, template, data.tenantId);

            return template;
        });
    }

    /**
     * Aggiorna un template
     * @param {string} id - ID del template
     * @param {Object} data - Dati da aggiornare
     * @param {string} tenantId - ID del tenant
     * @param {string} updatedBy - ID utente che aggiorna
     * @param {string} ipAddress - Indirizzo IP
     * @returns {Promise<Object>}
     */
    async update(id, data, tenantId, updatedBy, ipAddress) {
        const { prestazioniIds, mediciIds, questionarioConfig, ...templateData } = data;
        const normalizedTemplateData = normalizeConsentTemplateData(templateData);

        logger.info({ id, tenantId, updatedBy }, 'DocumentoTemplateService.update');

        return prisma.$transaction(async (tx) => {
            // Verifica esistenza
            const existing = await tx.documentoTemplate.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!existing) {
                throw new Error('Template non trovato');
            }

            // Se cambia contenuto significativo, incrementa versione
            const shouldIncrementVersion =
                normalizedTemplateData.contenutoHtml && normalizedTemplateData.contenutoHtml !== existing.contenutoHtml ||
                normalizedTemplateData.campi && JSON.stringify(normalizedTemplateData.campi) !== JSON.stringify(existing.campi);

            // Aggiorna associazioni prestazioni se fornite
            if (Array.isArray(prestazioniIds)) {
                await tx.documentoTemplatePrestazione.deleteMany({
                    where: { documentoTemplateId: id }
                });
                if (prestazioniIds.length > 0) {
                    await tx.documentoTemplatePrestazione.createMany({
                        data: prestazioniIds.map(prestazioneId => ({
                            documentoTemplateId: id,
                            prestazioneId
                        }))
                    });
                }
            }

            // Aggiorna associazioni medici se fornite
            if (Array.isArray(mediciIds)) {
                await tx.documentoTemplateMedico.deleteMany({
                    where: { documentoTemplateId: id }
                });
                if (mediciIds.length > 0) {
                    await tx.documentoTemplateMedico.createMany({
                        data: mediciIds.map(medicoId => ({
                            documentoTemplateId: id,
                            medicoId
                        }))
                    });
                }
            }

            // Aggiorna template
            const template = await tx.documentoTemplate.update({
                where: { id },
                data: {
                    ...normalizedTemplateData,
                    versione: shouldIncrementVersion ? existing.versione + 1 : existing.versione
                },
                include: {
                    prestazioni: { include: { prestazione: true } },
                    medici: { include: { medico: true } }
                }
            });

            // Aggiorna configurazione questionario/scoring se fornita
            if (questionarioConfig !== undefined) {
                if (questionarioConfig && questionarioConfig.haScoring) {
                    await tx.questionarioMedicoConfig.upsert({
                        where: { documentoTemplateId: id },
                        create: {
                            documentoTemplateId: id,
                            tenantId,
                            haScoring: true,
                            scoringConfig: questionarioConfig.scoringConfig || null,
                            sogliaCritica: questionarioConfig.sogliaCritica || null,
                        },
                        update: {
                            haScoring: true,
                            scoringConfig: questionarioConfig.scoringConfig || null,
                            sogliaCritica: questionarioConfig.sogliaCritica || null,
                        }
                    });
                } else {
                    // Scoring disabilitato — rimuovi config se esiste
                    await tx.questionarioMedicoConfig.deleteMany({
                        where: { documentoTemplateId: id }
                    });
                }
            }

            await syncConsensoModuli(tx, template, tenantId);

            // Crea log
            await tx.documentoTemplateLog.create({
                data: {
                    documentoTemplateId: template.id,
                    azione: 'UPDATE',
                    dettagli: {
                        cambiati: Object.keys(templateData),
                        versionePrecedente: existing.versione,
                        nuovaVersione: template.versione
                    },
                    eseguitoDa: updatedBy,
                    ipAddress
                }
            });

            return template;
        });
    }

    /**
     * Soft delete di un template
     * @param {string} id - ID del template
     * @param {string} tenantId - ID del tenant
     * @param {string} deletedBy - ID utente che elimina
     * @param {string} ipAddress - Indirizzo IP
     * @returns {Promise<Object>}
     */
    async delete(id, tenantId, deletedBy, ipAddress) {
        logger.info({ id, tenantId, deletedBy }, 'DocumentoTemplateService.delete');

        return prisma.$transaction(async (tx) => {
            const template = await tx.documentoTemplate.findFirst({
                where: { id, tenantId, deletedAt: null }
            });

            if (!template) {
                throw new Error('Template non trovato');
            }

            // Verifica se ci sono documenti compilati non annullati
            const compilatiAttivi = await tx.documentoCompilato.count({
                where: {
                    documentoTemplateId: id,
                    deletedAt: null,
                    stato: { notIn: ['ANNULLATO'] }
                }
            });

            if (compilatiAttivi > 0) {
                throw new Error(`Impossibile eliminare: ${compilatiAttivi} documenti compilati attivi`);
            }

            // Soft delete
            const deleted = await tx.documentoTemplate.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    isActive: false
                }
            });

            // Crea log
            await tx.documentoTemplateLog.create({
                data: {
                    documentoTemplateId: id,
                    azione: 'DELETE',
                    dettagli: { nome: template.nome },
                    eseguitoDa: deletedBy,
                    ipAddress
                }
            });

            return deleted;
        });
    }

    /**
     * Attiva/disattiva un template
     * @param {string} id - ID del template
     * @param {boolean} isActive - Stato attivo
     * @param {string} tenantId - ID del tenant
     * @param {string} changedBy - ID utente
     * @param {string} ipAddress - Indirizzo IP
     * @returns {Promise<Object>}
     */
    async toggleActive(id, isActive, tenantId, changedBy, ipAddress) {
        logger.info({ id, isActive, tenantId, changedBy }, 'DocumentoTemplateService.toggleActive');

        return prisma.$transaction(async (tx) => {
            const template = await tx.documentoTemplate.update({
                where: { id },
                data: { isActive }
            });

            await tx.documentoTemplateLog.create({
                data: {
                    documentoTemplateId: id,
                    azione: isActive ? 'ACTIVATE' : 'DEACTIVATE',
                    dettagli: { isActive },
                    eseguitoDa: changedBy,
                    ipAddress
                }
            });

            return template;
        });
    }

    /**
     * Ottiene i template applicabili per una visita/prestazione
     * @param {Object} params - Parametri
     * @param {string} params.tenantId - ID tenant
     * @param {string} [params.prestazioneId] - ID prestazione
     * @param {string} [params.medicoId] - ID medico
     * @param {string} [params.fase] - Fase corrente
     * @param {string[]} [params.branchTypes] - Branch types
     * @param {boolean} [params.excludeQuestionari] - Exclude questionario-type templates
     * @returns {Promise<Array>}
     */
    async getApplicabili({ tenantId, prestazioneId, medicoId, fase, branchTypes, excludeQuestionari = false }) {
        logger.info({ tenantId, prestazioneId, medicoId, fase, branchTypes, excludeQuestionari }, 'DocumentoTemplateService.getApplicabili');

        // Questionario-type tipos (managed via QuestionarioMedicoService, not modulistica)
        const QUESTIONARIO_TIPOS = [
            'QUESTIONARIO_RISCHIO',
            'QUESTIONARIO_ANAMNESI_MDL',
            'ALCOL_SCREENING',
            'SCHEDA_SORVEGLIANZA',
            // N.B. ANAMNESI (MEDSPORT1) è modulistica, NON escluso
        ];

        const where = {
            tenantId,
            deletedAt: null,
            isActive: true
        };

        if (fase) where.fase = fase;

        // Exclude questionario types from modulistica listing
        if (excludeQuestionari) {
            where.tipo = { notIn: QUESTIONARIO_TIPOS };
        }

        // Costruisci query per template generici o specifici per prestazione/medico
        const templates = await prisma.documentoTemplate.findMany({
            where,
            include: {
                prestazioni: {
                    include: {
                        prestazione: { select: { id: true, nome: true } }
                    }
                },
                medici: {
                    include: {
                        medico: { select: { id: true, firstName: true, lastName: true } }
                    }
                }
            },
            orderBy: [
                { obbligatorio: 'desc' },
                { ordine: 'asc' },
                { nome: 'asc' }
            ]
        });

        // Filtra: includi se nessuna associazione specifica OPPURE se match con prestazione/medico
        return templates.filter(t => {
            // Verifica branchTypes se specificato
            if (branchTypes?.length > 0 && t.branchTypes?.length > 0) {
                const hasMatchingBranch = t.branchTypes.some(bt => branchTypes.includes(bt));
                if (!hasMatchingBranch) return false;
            }

            const hasPrestazioni = t.prestazioni.length > 0;
            const hasMedici = t.medici.length > 0;

            // Template generico (nessuna associazione specifica)
            if (!hasPrestazioni && !hasMedici) return true;

            // Match prestazione
            if (prestazioneId && hasPrestazioni) {
                if (t.prestazioni.some(p => p.prestazioneId === prestazioneId)) return true;
            }

            // Match medico
            if (medicoId && hasMedici) {
                if (t.medici.some(m => m.medicoId === medicoId)) return true;
            }

            // Se ha associazioni ma non matcha, escludi
            if (hasPrestazioni || hasMedici) return false;

            return true;
        });
    }

    /**
     * Duplica un template
     * @param {string} id - ID del template da duplicare
     * @param {string} tenantId - ID del tenant
     * @param {string} createdBy - ID utente
     * @param {string} ipAddress - Indirizzo IP
     * @returns {Promise<Object>}
     */
    async duplicate(id, tenantId, createdBy, ipAddress) {
        logger.info({ id, tenantId, createdBy }, 'DocumentoTemplateService.duplicate');

        const original = await this.getById(id, tenantId);
        if (!original) {
            throw new Error('Template non trovato');
        }

        const { id: _, createdAt, updatedAt, deletedAt, logs, _count, ...data } = original;

        return this.create({
            ...data,
            nome: `${original.nome} (Copia)`,
            codice: original.codice ? `${original.codice}-COPIA-${Date.now()}` : null,
            versione: 1,
            prestazioniIds: original.prestazioni.map(p => p.prestazioneId),
            mediciIds: original.medici.map(m => m.medicoId)
        }, createdBy, ipAddress);
    }
}

export default new DocumentoTemplateService();
