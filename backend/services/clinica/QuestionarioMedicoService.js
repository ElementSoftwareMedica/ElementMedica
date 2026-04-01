/**
 * QuestionarioMedicoService
 * 
 * P61 - Gestione Questionari Medici
 * Estende DocumentoTemplate con configurazione MDL e scoring
 * 
 * @module services/clinica/QuestionarioMedicoService
 */

import crypto from 'crypto';
import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { AppError } from '../../middleware/errorHandler.js';
import pdfService from '../pdfService.js';
import storageService from '../storageService.js';
import { getMedicoTitle } from '../../utils/medicoFormatters.js';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __qmFilename = fileURLToPath(import.meta.url);
const __qmDirname = dirname(__qmFilename);
const QM_BACKEND_DIR = join(__qmDirname, '..', '..');

/**
 * Converte un path relativo del logo in data-URL base64 per Puppeteer.
 */
function logoToDataUrl(logoPath) {
    if (!logoPath) return '';
    if (logoPath.startsWith('data:')) return logoPath;
    let effectivePath = logoPath;
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
        try {
            const url = new URL(logoPath);
            const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
            if (isLocal) { effectivePath = url.pathname; } else { return logoPath; }
        } catch { return logoPath; }
    }
    const cleanPath = effectivePath.startsWith('/') ? effectivePath.slice(1) : effectivePath;
    const PROJECT_ROOT = join(QM_BACKEND_DIR, '..');
    for (const p of [join(QM_BACKEND_DIR, cleanPath), join(QM_BACKEND_DIR, 'public', cleanPath), join(PROJECT_ROOT, 'public', cleanPath), join(PROJECT_ROOT, cleanPath)]) {
        if (existsSync(p)) {
            try {
                const data = readFileSync(p);
                const ext = p.split('.').pop().toLowerCase();
                const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
                return `data:${mime};base64,${data.toString('base64')}`;
            } catch { break; }
        }
    }
    return logoPath;
}

/**
 * Prova più percorsi logo in ordine, restituendo il primo che risolve a data URL.
 */
function resolveFirstValidLogo(...paths) {
    for (const p of paths) {
        if (!p) continue;
        const result = logoToDataUrl(p);
        if (result.startsWith('data:')) return result;
    }
    return '';
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Tipi documento che sono questionari MDL */
const QUESTIONARIO_TYPES = [
    'QUESTIONARIO_ANAMNESI_MDL',
    'QUESTIONARIO_RISCHIO',
    'QUESTIONARIO_SINTOMI',
    'SCHEDA_SORVEGLIANZA',
    'ALCOL_SCREENING'
    // N.B. ANAMNESI (MEDSPORT1) è modulistica, NON questionario
];

// ============================================================================
// TEMPLATE CRUD
// ============================================================================

/**
 * Recupera tutti i template questionario con config MDL
 */
export async function getAllQuestionari(tenantId, filters = {}) {
    const {
        tipo,
        fase,
        isActive,
        codiceRischio,
        tipoVisitaMDL,
        specializzazione,
        protocolloSanitarioId,
        search,
        page = 1,
        limit = 50
    } = filters;

    const where = {
        tenantId,
        deletedAt: null,
        tipo: { in: QUESTIONARIO_TYPES }
    };

    if (tipo) where.tipo = tipo;
    if (fase) where.fase = fase;
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (search) {
        where.OR = [
            { nome: { contains: search, mode: 'insensitive' } },
            { codice: { contains: search, mode: 'insensitive' } },
            { descrizione: { contains: search, mode: 'insensitive' } }
        ];
    }

    // Filtri su QuestionarioMedicoConfig
    const questionarioConfigWhere = {};
    if (codiceRischio) {
        questionarioConfigWhere.codiciRischio = { has: codiceRischio };
    }
    if (tipoVisitaMDL) {
        questionarioConfigWhere.tipiVisitaMDL = { has: tipoVisitaMDL };
    }
    if (specializzazione) {
        questionarioConfigWhere.specializzazione = { contains: specializzazione, mode: 'insensitive' };
    }
    if (protocolloSanitarioId) {
        questionarioConfigWhere.protocolloSanitarioId = protocolloSanitarioId;
    }

    if (Object.keys(questionarioConfigWhere).length > 0) {
        where.questionarioConfig = questionarioConfigWhere;
    }

    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
        prisma.documentoTemplate.findMany({
            where,
            include: {
                questionarioConfig: {
                    include: {
                        protocolloSanitario: {
                            select: { id: true, codice: true, denominazione: true }
                        }
                    }
                },
                prestazioni: {
                    include: {
                        prestazione: { select: { id: true, nome: true, codice: true } }
                    }
                },
                _count: {
                    select: { compilati: true }
                }
            },
            orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
            skip,
            take: limit
        }),
        prisma.documentoTemplate.count({ where })
    ]);

    return {
        data: templates,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

/**
 * Recupera un singolo template questionario per ID
 */
export async function getQuestionarioById(tenantId, id) {
    const template = await prisma.documentoTemplate.findFirst({
        where: {
            id,
            tenantId,
            deletedAt: null,
            tipo: { in: QUESTIONARIO_TYPES }
        },
        include: {
            questionarioConfig: {
                include: {
                    protocolloSanitario: true
                }
            },
            prestazioni: {
                include: {
                    prestazione: true
                }
            },
            medici: {
                include: {
                    medico: {
                        select: { id: true, firstName: true, lastName: true, gender: true }
                    }
                }
            },
            compilati: {
                where: { deletedAt: null },
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    paziente: { select: { id: true, firstName: true, lastName: true } },
                    visita: { select: { id: true, dataOra: true } }
                }
            },
            _count: {
                select: { compilati: true }
            }
        }
    });

    if (!template) {
        throw new AppError('Questionario non trovato', 404);
    }

    return template;
}

/**
 * Crea un nuovo template questionario con config MDL
 */
export async function createQuestionario(tenantId, data, createdBy, ipAddress) {
    const {
        // DocumentoTemplate fields
        nome,
        descrizione,
        codice,
        tipo,
        fase,
        contenutoHtml,
        campi,
        richiedeFirma,
        richiedeFirmaMedico,
        validitaGiorni,
        obbligatorio,
        ordine,
        branchTypes = ['MEDICA'],
        prestazioniIds = [],
        mediciIds = [],

        // QuestionarioMedicoConfig fields
        codiciRischio = [],
        tipiVisitaMDL = [],
        specializzazione,
        haScoring = false,
        scoringConfig,
        sogliaCritica,
        compilabileDa = 'MEDICO',
        tempoStimato,
        istruzioniPaziente,
        istruzioniMedico,
        richiedeRevisione = true,
        validazioniCustom,
        periodicitaMesi,
        promemoria = false,
        protocolloSanitarioId,
        // P61: Campi tariffazione
        voceTariffarioId,
        isPagamento = false,
        prezzoDefault,
        fatturabile = true
    } = data;

    // Validazione tipo
    if (!QUESTIONARIO_TYPES.includes(tipo)) {
        throw new AppError(`Tipo documento non valido per questionario. Tipi validi: ${QUESTIONARIO_TYPES.join(', ')}`, 400);
    }

    // Verifica unicità codice
    if (codice) {
        const existing = await prisma.documentoTemplate.findFirst({
            where: { tenantId, codice, deletedAt: null }
        });
        if (existing) {
            throw new AppError(`Esiste già un template con codice "${codice}"`, 409);
        }
    }

    // Verifica protocollo sanitario se specificato
    if (protocolloSanitarioId) {
        const protocollo = await prisma.protocolloSanitario.findFirst({
            where: { id: protocolloSanitarioId, tenantId, deletedAt: null }
        });
        if (!protocollo) {
            throw new AppError('Protocollo sanitario non trovato', 404);
        }
    }

    const result = await prisma.$transaction(async (tx) => {
        // Crea DocumentoTemplate
        const template = await tx.documentoTemplate.create({
            data: {
                tenantId,
                nome,
                descrizione,
                codice,
                tipo,
                fase: fase || 'PRE_VISITA',
                contenutoHtml,
                campi,
                richiedeFirma: richiedeFirma ?? true,
                richiedeFirmaMedico: richiedeFirmaMedico ?? false,
                validitaGiorni,
                obbligatorio,
                ordine,
                branchTypes,
                isActive: true,
                versione: 1,
                createdBy
            }
        });

        // Crea QuestionarioMedicoConfig
        await tx.questionarioMedicoConfig.create({
            data: {
                tenantId,
                documentoTemplateId: template.id,
                codiciRischio,
                tipiVisitaMDL,
                specializzazione,
                haScoring,
                scoringConfig,
                sogliaCritica,
                compilabileDa,
                tempoStimato,
                istruzioniPaziente,
                istruzioniMedico,
                richiedeRevisione,
                validazioniCustom,
                periodicitaMesi,
                promemoria,
                protocolloSanitarioId,
                // P61: Tariffazione
                voceTariffarioId,
                isPagamento,
                prezzoDefault,
                fatturabile
            }
        });

        // Associa prestazioni
        if (prestazioniIds.length > 0) {
            await tx.documentoTemplatePrestazione.createMany({
                data: prestazioniIds.map(prestazioneId => ({
                    documentoTemplateId: template.id,
                    prestazioneId,
                    obbligatorio: false
                }))
            });
        }

        // Associa medici
        if (mediciIds.length > 0) {
            await tx.documentoTemplateMedico.createMany({
                data: mediciIds.map(medicoId => ({
                    documentoTemplateId: template.id,
                    medicoId
                }))
            });
        }

        // Log creazione
        await tx.documentoTemplateLog.create({
            data: {
                documentoTemplateId: template.id,
                azione: 'CREATE',
                dettagli: { tipo, nome, codice, config: 'QuestionarioMedicoConfig' },
                eseguitoDa: createdBy,
                ipAddress
            }
        });

        return template.id;
    });

    logger.info(`[QuestionarioMedico] Creato template questionario ${result}`, { tenantId, createdBy });

    return getQuestionarioById(tenantId, result);
}

/**
 * Aggiorna un template questionario
 */
export async function updateQuestionario(tenantId, id, data, updatedBy, ipAddress) {
    const existing = await getQuestionarioById(tenantId, id);

    const {
        // DocumentoTemplate fields
        nome,
        descrizione,
        codice,
        tipo,
        fase,
        contenutoHtml,
        campi,
        richiedeFirma,
        richiedeFirmaMedico,
        validitaGiorni,
        obbligatorio,
        ordine,
        isActive,
        branchTypes,
        prestazioniIds,
        mediciIds,

        // QuestionarioMedicoConfig fields
        codiciRischio,
        tipiVisitaMDL,
        specializzazione,
        haScoring,
        scoringConfig,
        sogliaCritica,
        compilabileDa,
        tempoStimato,
        istruzioniPaziente,
        istruzioniMedico,
        richiedeRevisione,
        validazioniCustom,
        periodicitaMesi,
        promemoria,
        protocolloSanitarioId,
        // P61: Campi tariffazione
        voceTariffarioId,
        isPagamento,
        prezzoDefault,
        fatturabile
    } = data;

    // Se cambio tipo, deve restare tra i tipi questionario
    if (tipo && !QUESTIONARIO_TYPES.includes(tipo)) {
        throw new AppError(`Tipo documento non valido per questionario`, 400);
    }

    // Verifica unicità codice
    if (codice && codice !== existing.codice) {
        const duplicate = await prisma.documentoTemplate.findFirst({
            where: { tenantId, codice, deletedAt: null, id: { not: id } }
        });
        if (duplicate) {
            throw new AppError(`Esiste già un template con codice "${codice}"`, 409);
        }
    }

    await prisma.$transaction(async (tx) => {
        // Aggiorna DocumentoTemplate
        const templateUpdate = {};
        if (nome !== undefined) templateUpdate.nome = nome;
        if (descrizione !== undefined) templateUpdate.descrizione = descrizione;
        if (codice !== undefined) templateUpdate.codice = codice;
        if (tipo !== undefined) templateUpdate.tipo = tipo;
        if (fase !== undefined) templateUpdate.fase = fase;
        if (contenutoHtml !== undefined) templateUpdate.contenutoHtml = contenutoHtml;
        if (campi !== undefined) templateUpdate.campi = campi;
        if (richiedeFirma !== undefined) templateUpdate.richiedeFirma = richiedeFirma;
        if (richiedeFirmaMedico !== undefined) templateUpdate.richiedeFirmaMedico = richiedeFirmaMedico;
        if (validitaGiorni !== undefined) templateUpdate.validitaGiorni = validitaGiorni;
        if (obbligatorio !== undefined) templateUpdate.obbligatorio = obbligatorio;
        if (ordine !== undefined) templateUpdate.ordine = ordine;
        if (isActive !== undefined) templateUpdate.isActive = isActive;
        if (branchTypes !== undefined) templateUpdate.branchTypes = branchTypes;

        // Incrementa versione se cambia contenuto
        if (contenutoHtml !== undefined || campi !== undefined) {
            templateUpdate.versione = existing.versione + 1;
        }

        if (Object.keys(templateUpdate).length > 0) {
            await tx.documentoTemplate.update({
                where: { id },
                data: templateUpdate
            });
        }

        // Aggiorna QuestionarioMedicoConfig
        const configUpdate = {};
        if (codiciRischio !== undefined) configUpdate.codiciRischio = codiciRischio;
        if (tipiVisitaMDL !== undefined) configUpdate.tipiVisitaMDL = tipiVisitaMDL;
        if (specializzazione !== undefined) configUpdate.specializzazione = specializzazione;
        if (haScoring !== undefined) configUpdate.haScoring = haScoring;
        if (scoringConfig !== undefined) configUpdate.scoringConfig = scoringConfig;
        if (sogliaCritica !== undefined) configUpdate.sogliaCritica = sogliaCritica;
        if (compilabileDa !== undefined) configUpdate.compilabileDa = compilabileDa;
        if (tempoStimato !== undefined) configUpdate.tempoStimato = tempoStimato;
        if (istruzioniPaziente !== undefined) configUpdate.istruzioniPaziente = istruzioniPaziente;
        if (istruzioniMedico !== undefined) configUpdate.istruzioniMedico = istruzioniMedico;
        if (richiedeRevisione !== undefined) configUpdate.richiedeRevisione = richiedeRevisione;
        if (validazioniCustom !== undefined) configUpdate.validazioniCustom = validazioniCustom;
        if (periodicitaMesi !== undefined) configUpdate.periodicitaMesi = periodicitaMesi;
        if (promemoria !== undefined) configUpdate.promemoria = promemoria;
        if (protocolloSanitarioId !== undefined) configUpdate.protocolloSanitarioId = protocolloSanitarioId;
        // P61: Tariffazione
        if (voceTariffarioId !== undefined) configUpdate.voceTariffarioId = voceTariffarioId;
        if (isPagamento !== undefined) configUpdate.isPagamento = isPagamento;
        if (prezzoDefault !== undefined) configUpdate.prezzoDefault = prezzoDefault;
        if (fatturabile !== undefined) configUpdate.fatturabile = fatturabile;

        if (Object.keys(configUpdate).length > 0) {
            if (existing.questionarioConfig) {
                await tx.questionarioMedicoConfig.update({
                    where: { id: existing.questionarioConfig.id, deletedAt: null },
                    data: configUpdate
                });
            } else {
                // Crea config se non esiste (upgrade di template esistente)
                await tx.questionarioMedicoConfig.create({
                    data: {
                        tenantId,
                        documentoTemplateId: id,
                        ...configUpdate
                    }
                });
            }
        }

        // Aggiorna prestazioni se specificate
        if (prestazioniIds !== undefined) {
            await tx.documentoTemplatePrestazione.deleteMany({
                where: { documentoTemplateId: id }
            });
            if (prestazioniIds.length > 0) {
                await tx.documentoTemplatePrestazione.createMany({
                    data: prestazioniIds.map(prestazioneId => ({
                        documentoTemplateId: id,
                        prestazioneId,
                        obbligatorio: false
                    }))
                });
            }
        }

        // Aggiorna medici se specificati
        if (mediciIds !== undefined) {
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

        // Log modifica
        await tx.documentoTemplateLog.create({
            data: {
                documentoTemplateId: id,
                azione: 'UPDATE',
                dettagli: { templateUpdate, configUpdate },
                eseguitoDa: updatedBy,
                ipAddress
            }
        });
    });

    logger.info(`[QuestionarioMedico] Aggiornato template questionario ${id}`, { tenantId, updatedBy });

    return getQuestionarioById(tenantId, id);
}

/**
 * Elimina (soft delete) un template questionario
 */
export async function deleteQuestionario(tenantId, id, deletedBy, ipAddress, deletionReason) {
    if (!deletionReason || deletionReason.length < 10) {
        throw new AppError('Motivo eliminazione obbligatorio (min 10 caratteri)', 400);
    }

    const existing = await getQuestionarioById(tenantId, id);

    // Verifica se ci sono documenti compilati non annullati
    const activeCompiledCount = await prisma.documentoCompilato.count({
        where: {
            documentoTemplateId: id,
            tenantId,
            deletedAt: null,
            stato: { notIn: ['ANNULLATO', 'SCADUTO'] }
        }
    });

    if (activeCompiledCount > 0) {
        throw new AppError(
            `Impossibile eliminare: esistono ${activeCompiledCount} questionari compilati attivi. Disattivare invece di eliminare.`,
            409
        );
    }

    await prisma.$transaction(async (tx) => {
        // Soft delete config
        if (existing.questionarioConfig) {
            await tx.questionarioMedicoConfig.update({
                where: { id: existing.questionarioConfig.id, deletedAt: null },
                data: { deletedAt: new Date() }
            });
        }

        // Soft delete template
        await tx.documentoTemplate.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false }
        });

        // Log eliminazione
        await tx.documentoTemplateLog.create({
            data: {
                documentoTemplateId: id,
                azione: 'DELETE',
                dettagli: { deletionReason, nome: existing.nome },
                eseguitoDa: deletedBy,
                ipAddress
            }
        });
    });

    logger.info(`[QuestionarioMedico] Eliminato template questionario ${id}`, { tenantId, deletedBy, deletionReason });

    return { success: true, message: 'Questionario eliminato' };
}

// ============================================================================
// COMPILAZIONE
// ============================================================================

/**
 * Compila un questionario (crea DocumentoCompilato)
 * P61: Se fatturabile + visita + paziente dipendente → crea MovimentoContabile
 */
export async function compilaQuestionario(tenantId, templateId, data, compilatoDa, ipAddress) {
    const {
        pazienteId,
        visitaId,
        appuntamentoId,
        companyTenantProfileId: companyIdFromPayload, // P72_19: passato esplicitamente dal frontend
        datiCompilati,
        risposte = []
    } = data;

    // S66: Look up template first WITHOUT tenant filter (template ID is globally unique)
    // Then resolve the correct tenant from visita or template
    const template = await prisma.documentoTemplate.findFirst({
        where: {
            id: templateId,
            deletedAt: null,
        },
        include: {
            questionarioConfig: {
                include: { protocolloSanitario: true }
            },
            prestazioni: { include: { prestazione: true } },
            medici: { include: { medico: { select: { id: true, firstName: true, lastName: true, gender: true } } } },
        }
    });
    if (!template) {
        throw new AppError('Questionario non trovato', 404);
    }

    // S66: Resolve the correct tenant for the compilato
    // Priority: visita tenant > template tenant > request tenant
    let resolvedTenantId = tenantId;
    if (visitaId) {
        const visitaCheck = await prisma.visita.findFirst({
            where: { id: visitaId, deletedAt: null },
            select: { id: true, tenantId: true }
        });
        if (visitaCheck) {
            resolvedTenantId = visitaCheck.tenantId;
            if (visitaCheck.tenantId !== tenantId) {
                logger.info(`[QuestionarioMedico] Resolving tenantId from visita: ${visitaCheck.tenantId} (was: ${tenantId})`, {
                    visitaId, visitaTenantId: visitaCheck.tenantId, requestTenantId: tenantId
                });
            }
        }
    } else {
        // No visita — use template's tenant
        resolvedTenantId = template.tenantId;
    }

    // Verifica paziente con profilo tenant per trovare azienda
    const paziente = await prisma.person.findFirst({
        where: { id: pazienteId, deletedAt: null },
        include: {
            tenantProfiles: {
                where: { tenantId: resolvedTenantId, deletedAt: null },
                select: {
                    id: true,
                    companyTenantProfileId: true,
                    siteId: true,
                    companyTenantProfile: {
                        select: { id: true, company: { select: { id: true, ragioneSociale: true } } }
                    }
                }
            }
        }
    });
    if (!paziente) {
        throw new AppError('Paziente non trovato', 404);
    }

    // Estrai companyTenantProfileId dal profilo tenant del paziente (o dal payload se esplicitamente passato)
    const pazienteProfile = paziente.tenantProfiles?.[0];
    let companyTenantProfileId = companyIdFromPayload || pazienteProfile?.companyTenantProfileId || null;

    // Fallback: cerca companyTenantProfileId dall'appuntamento collegato (se presente)
    if (!companyTenantProfileId && appuntamentoId) {
        const appt = await prisma.appuntamento.findFirst({
            where: { id: appuntamentoId, deletedAt: null },
            select: { companyTenantProfileId: true }
        });
        if (appt?.companyTenantProfileId) {
            companyTenantProfileId = appt.companyTenantProfileId;
        }
    }

    // Verifica visita se specificata
    let visita = null;
    if (visitaId) {
        visita = await prisma.visita.findFirst({
            where: { id: visitaId, tenantId: resolvedTenantId, deletedAt: null }
        });
        if (!visita) {
            throw new AppError('Visita non trovata', 404);
        }
        // Verifica che il paziente sia quello della visita
        if (visita.pazienteId !== pazienteId) {
            throw new AppError('Il paziente non corrisponde alla visita', 400);
        }
    }

    // Fallback: cerca companyTenantProfileId da visita → appuntamento (se non già trovato)
    // Necessario quando appuntamentoId non è nel payload ma la visita ha un appuntamento collegato
    if (!companyTenantProfileId && visita?.appuntamentoId) {
        const apptFromVisita = await prisma.appuntamento.findFirst({
            where: { id: visita.appuntamentoId, deletedAt: null },
            select: { companyTenantProfileId: true }
        });
        if (apptFromVisita?.companyTenantProfileId) {
            companyTenantProfileId = apptFromVisita.companyTenantProfileId;
            logger.info('[QuestionarioMedico] companyTenantProfileId recuperato da visita→appuntamento', {
                visitaId, appuntamentoId: visita.appuntamentoId, companyTenantProfileId
            });
        }
    }

    // Fallback finale: cerca companyTenantProfileId dalla mansione attiva del paziente → sede aziendale
    // Percorso: PersonTenantProfile.siteId → CompanySite.companyTenantProfileId
    if (!companyTenantProfileId && pazienteProfile?.siteId) {
        const siteFromProfile = await prisma.companySite.findFirst({
            where: { id: pazienteProfile.siteId, deletedAt: null },
            select: { companyTenantProfileId: true }
        });
        if (siteFromProfile?.companyTenantProfileId) {
            companyTenantProfileId = siteFromProfile.companyTenantProfileId;
            logger.info('[QuestionarioMedico] companyTenantProfileId recuperato da pazienteProfile→site', {
                siteId: pazienteProfile.siteId, companyTenantProfileId
            });
        }
    }

    // Calcola punteggio se richiesto
    let punteggioTotale = null;
    let punteggioPercentuale = null;
    let esitoCritico = false;
    let noteAlgoritmo = null;

    if (template.questionarioConfig?.haScoring && risposte.length > 0) {
        const scoringResult = calculateScore(template, risposte);
        punteggioTotale = scoringResult.totale;
        punteggioPercentuale = scoringResult.percentuale;
        esitoCritico = scoringResult.critico;
        noteAlgoritmo = scoringResult.note;
    }

    // Calcola data scadenza
    let dataScadenza = null;
    if (template.validitaGiorni) {
        dataScadenza = new Date();
        dataScadenza.setDate(dataScadenza.getDate() + template.validitaGiorni);
    } else if (template.scadenzaFissa) {
        dataScadenza = template.scadenzaFissa;
    }

    const result = await prisma.$transaction(async (tx) => {
        // Determine initial stato based on firma requirements
        const needsFirma = template.richiedeFirma || template.richiedeFirmaMedico ||
            template.richiedeFirmaDipendente || template.richiedeFirmaFormatore ||
            template.richiedeFirmaDatore;
        const initialStato = needsFirma ? 'DA_FIRMARE' : 'COMPLETATO';

        // Crea DocumentoCompilato
        const compilato = await tx.documentoCompilato.create({
            data: {
                tenantId: resolvedTenantId,
                documentoTemplateId: templateId,
                pazienteId,
                visitaId,
                appuntamentoId,
                datiCompilati,
                stato: initialStato,
                dataScadenza,
                punteggioTotale,
                punteggioPercentuale,
                esitoCritico,
                noteAlgoritmo,
                compilatoDa
            }
        });

        // Salva risposte dettagliate se presenti
        if (risposte.length > 0) {
            // Filtra risposte prive di campoId (campi non ancora normalizzati nel template)
            const risposteValide = risposte.filter(r => r.campoId != null && r.campoId !== '');
            const risposteData = risposteValide.map(r => {
                const { punteggio, peso, flagCritico } = calculateFieldScore(
                    template.questionarioConfig?.scoringConfig,
                    r.campoId,
                    r,
                    template.campi || []
                );

                return {
                    tenantId: resolvedTenantId,
                    documentoCompilatoId: compilato.id,
                    campoId: r.campoId,
                    campoLabel: r.campoLabel,
                    valoreTesto: r.valoreTesto,
                    valoreNumerico: r.valoreNumerico,
                    valoreBoolean: r.valoreBoolean,
                    valoreData: r.valoreData,
                    valoreJson: r.valoreJson,
                    punteggio,
                    pesoCalcolato: peso,
                    flagCritico
                };
            });

            if (risposteData.length > 0) {
                await tx.questionarioRisposta.createMany({
                    data: risposteData
                });
            }
        }

        // Log compilazione
        await tx.documentoCompilatoLog.create({
            data: {
                documentoCompilatoId: compilato.id,
                azione: 'COMPILE',
                dettagli: {
                    templateId,
                    pazienteId,
                    visitaId,
                    risposteCount: risposte.length,
                    punteggioTotale,
                    esitoCritico
                },
                eseguitoDa: compilatoDa,
                ipAddress
            }
        });

        // P72_18: FATTURAZIONE AUTOMATICA QUESTIONARI
        // Il billing avviene via 2 percorsi:
        // 1. QuestionarioMedicoConfig.voceTariffarioId → link esplicito config → VoceTariffario
        // 2. Fallback P72_18: VoceTariffario.documentoTemplateId → trovato dal tariffario attivo dell'azienda
        const config = template.questionarioConfig;
        // P72_23: fatturabile difensivo — tratta null come true (il DB default è true,
        // ma record vecchi potrebbero avere null se inseriti direttamente).
        // P72-NEW: isFatturabile è usato solo come fallback; se viene trovata una VoceTariffario
        // per questo template, la voce prevale sempre (presenza della voce = intenzione di fatturare).
        const isFatturabile = config ? config.fatturabile !== false : true;

        // P72_20: Billing non richiede companyTenantProfileId (campo nullable su MovimentoContabile).
        // Quando null, Percorso 2 cerca qualsiasi tariffario attivo per questo tenant.
        if (!companyTenantProfileId && visitaId) {
            logger.warn('[QuestionarioMedico] companyTenantProfileId null — billing con tariffario aziendale generico', { templateId, pazienteId, visitaId });
        }

        if (visitaId) {
            let importoLordo = config?.prezzoDefault ? parseFloat(config.prezzoDefault) : 0;
            let resolvedVoceTariffarioId = config?.voceTariffarioId || null;
            let resolvedVoce = null; // P72_18+: voce tariffario risolta (per compenso medico)
            let descrizioneVoce = `Questionario: ${template.nome}`;

            // Percorso 1: voceTariffarioId esplicito in QuestionarioMedicoConfig
            if (resolvedVoceTariffarioId) {
                const voceTariffario = await tx.voceTariffario.findUnique({
                    where: { id: resolvedVoceTariffarioId, deletedAt: null },
                });
                if (voceTariffario) {
                    resolvedVoce = voceTariffario;
                    descrizioneVoce = `Questionario: ${template.nome} (${voceTariffario.codice || voceTariffario.nome || '—'})`;
                    importoLordo = parseFloat(voceTariffario.prezzoBase);
                }
            }

            // Percorso 2 (P72_18 fallback): Cerca VoceTariffario per documentoTemplateId + azienda
            // Applicato se: (a) nessun voceTariffarioId in config, oppure (b) importo ancora 0
            // P72_19+: Non filtra per tipo='QUESTIONARIO' — accetta qualsiasi voce collegata al template
            // P72-NEW: Two-step fallback:
            //   Step 1 — cerca nel tariffario associato alla company specifica del paziente
            //   Step 2 — fallback a qualsiasi tariffario attivo per questo tenant+template
            //            (copre i casi in cui il tariffario non ha associazioni company o la company
            //             del paziente non è associata al tariffario che contiene la voce)
            if (!resolvedVoceTariffarioId || importoLordo === 0) {
                let tariffarioVoci = [];

                // Step 1: cerca nel tariffario con associazione company specifica
                if (companyTenantProfileId) {
                    tariffarioVoci = await tx.voceTariffario.findMany({
                        where: {
                            documentoTemplateId: templateId,
                            deletedAt: null,
                            tariffarioAziendale: {
                                deletedAt: null,
                                attivo: true,
                                tenantId: resolvedTenantId,
                                companyAssociations: { some: { companyTenantProfileId, deletedAt: null } }
                            }
                        },
                        orderBy: { createdAt: 'asc' }
                    });
                }

                // Step 2: fallback — qualsiasi tariffario attivo per questo tenant+template
                if (tariffarioVoci.length === 0) {
                    tariffarioVoci = await tx.voceTariffario.findMany({
                        where: {
                            documentoTemplateId: templateId,
                            deletedAt: null,
                            tariffarioAziendale: {
                                deletedAt: null,
                                attivo: true,
                                tenantId: resolvedTenantId
                            }
                        },
                        orderBy: { createdAt: 'asc' }
                    });
                    if (tariffarioVoci.length > 0) {
                        logger.info('[QuestionarioMedico] Path 2b: fallback tariffario senza filtro company', {
                            templateId, tenantId: resolvedTenantId, companyTenantProfileId
                        });
                    }
                }

                if (tariffarioVoci.length > 0) {
                    const voce = tariffarioVoci[0];
                    resolvedVoce = voce;
                    resolvedVoceTariffarioId = voce.id;
                    importoLordo = parseFloat(voce.prezzoBase);
                    descrizioneVoce = `Questionario: ${template.nome} (${voce.codice || voce.nome || '—'})`;
                } else {
                    logger.warn('[QuestionarioMedico] Path 2: nessuna VoceTariffario trovata per il template', {
                        templateId, tenantId: resolvedTenantId, companyTenantProfileId
                    });
                }
            }

            // Percorso 3 (P72_23): Fallback finale → ListinoPrezzo del medico per questo documentoTemplate
            // Applicato se: importoLordo ancora 0 dopo Path 1 e Path 2
            if (importoLordo === 0 && visita?.medicoId) {
                const listinoMedicoFallback = await tx.listinoPrezzo.findFirst({
                    where: {
                        medicoId: visita.medicoId,
                        documentoTemplateId: templateId,
                        attivo: true,
                        tenantId: resolvedTenantId,
                        deletedAt: null
                    },
                    orderBy: [{ priorita: 'desc' }, { createdAt: 'desc' }]
                });
                if (listinoMedicoFallback?.prezzo && parseFloat(listinoMedicoFallback.prezzo) > 0) {
                    importoLordo = parseFloat(listinoMedicoFallback.prezzo);
                    resolvedVoceTariffarioId = listinoMedicoFallback.voceTariffarioId || null;
                    descrizioneVoce = `Questionario: ${template.nome} (da tariffario medico)`;
                    logger.info('[QuestionarioMedico] Percorso 3: importoLordo da ListinoPrezzo medico', {
                        importoLordo,
                        medicoId: visita.medicoId,
                        templateId,
                        tenantId: resolvedTenantId
                    });
                }
            }

            // P72-NEW: shouldBill = voce trovata (tariffario è la fonte di verità) OPPURE isFatturabile config=true.
            // Questo permette di fatturare anche quando QuestionarioMedicoConfig.fatturabile=false,
            // se esiste una VoceTariffario per questo template (l'admin ha configurato un prezzo → intende fatturare).
            const shouldBill = resolvedVoce != null || isFatturabile;

            // Crea MovimentoContabile ENTRATA + USCITA solo se importo > 0 e billing abilitato
            if (importoLordo === 0) {
                logger.warn('[QuestionarioMedico] importoLordo=0 dopo tutti i percorsi — billing saltato', {
                    templateId, tenantId: resolvedTenantId, companyTenantProfileId, visitaId, isFatturabile, shouldBill
                });
            }
            if (importoLordo > 0 && shouldBill) {
                const aliquotaIva = 0; // Prestazioni sanitarie esenti IVA
                const importoIva = 0;
                const importoNetto = importoLordo;
                const dataEsecuzione = visita?.dataOra || new Date();

                // ENTRATA (attivo) — addebito all'azienda
                const movEntrata = await tx.movimentoContabile.create({
                    data: {
                        tenantId: resolvedTenantId,
                        direzione: 'ENTRATA',
                        tipo: 'PRESTAZIONE_CLINICA',
                        stato: 'CONFERMATO',
                        tipoSoggetto: 'AZIENDA',
                        companyTenantProfileId,
                        personId: pazienteId,
                        visitaId,
                        documentoCompilatoId: compilato.id,
                        voceTariffarioId: resolvedVoceTariffarioId,
                        importoLordo,
                        aliquotaIva,
                        importoIva,
                        importoNetto,
                        dataEsecuzione,
                        descrizione: descrizioneVoce,
                        note: `Questionario compilato durante visita MDL`,
                        branchType: 'MEDICA',
                        createdBy: compilatoDa
                    }
                });

                logger.info(`[QuestionarioMedico] Creato MovimentoContabile ENTRATA per questionario ${compilato.id}`, {
                    tenantId: resolvedTenantId,
                    companyTenantProfileId,
                    voceTariffarioId: resolvedVoceTariffarioId,
                    importoLordo,
                    percorso: config?.voceTariffarioId ? 'config-esplicito' : 'documentoTemplateId-fallback'
                });

                // USCITA (passivo) — compenso al medico refertante
                const medicoId = visita?.medicoId || null;
                if (medicoId) {
                    let compensoNetto = 0;
                    let compensoTipo = null;

                    // Livello 0.5 (P72_19): ListinoPrezzo per questo questionario + medicoId (priorità assoluta)
                    const listinoQuestionario = await tx.listinoPrezzo.findFirst({
                        where: {
                            medicoId,
                            documentoTemplateId: templateId,
                            attivo: true,
                            tenantId: resolvedTenantId,
                            deletedAt: null,
                            compensoMedicoTipo: { not: null }
                        },
                        orderBy: [{ priorita: 'desc' }, { createdAt: 'desc' }]
                    });
                    if (listinoQuestionario?.compensoMedicoTipo && listinoQuestionario?.compensoMedicoValore != null) {
                        const tipo = listinoQuestionario.compensoMedicoTipo;
                        const valore = parseFloat(listinoQuestionario.compensoMedicoValore);
                        const min = listinoQuestionario.compensoMedicoMinimo != null ? parseFloat(listinoQuestionario.compensoMedicoMinimo) : null;
                        const max = listinoQuestionario.compensoMedicoMassimo != null ? parseFloat(listinoQuestionario.compensoMedicoMassimo) : null;
                        if (tipo === 'FISSO') {
                            compensoNetto = valore;
                        } else if (tipo === 'MINIMO_MASSIMO') {
                            compensoNetto = importoNetto;
                            if (min != null) compensoNetto = Math.max(compensoNetto, min);
                            if (max != null) compensoNetto = Math.min(compensoNetto, max);
                        } else {
                            compensoNetto = parseFloat((importoNetto * valore / 100).toFixed(2));
                        }
                        compensoTipo = tipo;
                    }

                    // Livello 1: TariffarioMedico generale per il medico
                    if (!compensoNetto) {
                        const tariffarioMedico = await tx.tariffarioMedico.findFirst({
                            where: { medicoId, tenantId: resolvedTenantId, attivo: true, deletedAt: null },
                            orderBy: { validoDa: 'desc' }
                        });
                        if (tariffarioMedico?.compensoMedicoTipo && tariffarioMedico?.compensoMedicoValore != null) {
                            const tipo = tariffarioMedico.compensoMedicoTipo;
                            const valore = parseFloat(tariffarioMedico.compensoMedicoValore);
                            const min = tariffarioMedico.compensoMedicoMinimo != null ? parseFloat(tariffarioMedico.compensoMedicoMinimo) : null;
                            const max = tariffarioMedico.compensoMedicoMassimo != null ? parseFloat(tariffarioMedico.compensoMedicoMassimo) : null;
                            if (tipo === 'FISSO') {
                                compensoNetto = valore;
                            } else {
                                compensoNetto = parseFloat((importoNetto * valore / 100).toFixed(2));
                                if (tipo === 'MINIMO_MASSIMO') {
                                    if (min != null) compensoNetto = Math.max(compensoNetto, min);
                                    if (max != null) compensoNetto = Math.min(compensoNetto, max);
                                }
                            }
                            compensoTipo = tipo;
                        }

                        // Livello 2: VoceTariffario.compensoProfessionista (fallback)
                        if (!compensoNetto && resolvedVoce) {
                            const vt = resolvedVoce;
                            if (vt.compensoProfessionistaTipo && vt.compensoProfessionistaValore != null) {
                                const tipo = vt.compensoProfessionistaTipo;
                                const valore = parseFloat(vt.compensoProfessionistaValore);
                                const min = vt.compensoProfessionistaMinimo != null ? parseFloat(vt.compensoProfessionistaMinimo) : null;
                                const max = vt.compensoProfessionistaMassimo != null ? parseFloat(vt.compensoProfessionistaMassimo) : null;
                                if (tipo === 'FISSO') {
                                    compensoNetto = valore;
                                } else {
                                    compensoNetto = parseFloat((importoNetto * valore / 100).toFixed(2));
                                    if (tipo === 'MINIMO_MASSIMO') {
                                        if (min != null) compensoNetto = Math.max(compensoNetto, min);
                                        if (max != null) compensoNetto = Math.min(compensoNetto, max);
                                    }
                                }
                                compensoTipo = tipo;
                            }
                        }
                    } // end if (!compensoNetto) — Livello 1+2

                    if (compensoNetto > 0) {
                        // P73: Arricchisci descrizione USCITA con info dipendente
                        const nomeDipendente = (paziente?.lastName && paziente?.firstName)
                            ? `${paziente.lastName} ${paziente.firstName}`
                            : null;

                        const movUscita = await tx.movimentoContabile.create({
                            data: {
                                tenantId: resolvedTenantId,
                                direzione: 'USCITA',
                                tipo: 'PRESTAZIONE_CLINICA',
                                stato: 'CONFERMATO',
                                tipoSoggetto: 'MEDICO',
                                personId: medicoId,
                                companyTenantProfileId,
                                visitaId,
                                documentoCompilatoId: compilato.id,
                                voceTariffarioId: resolvedVoceTariffarioId,
                                importoLordo: compensoNetto,
                                aliquotaIva: 0,
                                importoIva: 0,
                                importoNetto: compensoNetto,
                                compensoTipo,
                                importoRiferimento: importoNetto,
                                dataEsecuzione,
                                descrizione: `Compenso medico – ${descrizioneVoce}${nomeDipendente ? ` (Dip.: ${nomeDipendente})` : ''}`,
                                note: `Compenso per questionario compilato durante visita MDL${nomeDipendente ? ` – dipendente: ${nomeDipendente}` : ''}`,
                                branchType: 'MEDICA',
                                createdBy: compilatoDa
                            }
                        });

                        // Collega ENTRATA ↔ USCITA
                        await tx.movimentoContabile.update({
                            where: { id: movEntrata.id },
                            data: { movimentoCollegatoId: movUscita.id }
                        });

                        logger.info(`[QuestionarioMedico] Creato MovimentoContabile USCITA per compenso medico questionario ${compilato.id}`, {
                            tenantId: resolvedTenantId,
                            medicoId,
                            compensoNetto,
                            compensoTipo
                        });
                    }
                }
            } else {
                logger.info(`[QuestionarioMedico] Nessun MovimentoContabile — importo 0 o billing non abilitato per questionario ${compilato.id}`, {
                    tenantId: resolvedTenantId,
                    companyTenantProfileId,
                    templateId,
                    importoLordo,
                    shouldBill: resolvedVoce != null || isFatturabile,
                    hasConfig: !!config,
                    hasVoceTariffarioId: !!resolvedVoceTariffarioId
                });
            }
        }

        return compilato.id;
    });

    logger.info(`[QuestionarioMedico] Compilato questionario ${result}`, { tenantId: resolvedTenantId, templateId, pazienteId, esitoCritico });

    return getCompilatoById(resolvedTenantId, result);
}

/**
 * Recupera un documento compilato
 */
export async function getCompilatoById(tenantId, id) {
    const compilato = await prisma.documentoCompilato.findFirst({
        where: {
            id,
            tenantId,
            deletedAt: null
        },
        include: {
            documentoTemplate: {
                include: {
                    questionarioConfig: true
                }
            },
            paziente: {
                select: { id: true, firstName: true, lastName: true, taxCode: true, gender: true }
            },
            visita: {
                select: { id: true, dataOra: true, tipoVisitaMDL: true }
            },
            risposteDettagliate: {
                orderBy: { createdAt: 'asc' }
            },
            medicoFirmante: {
                select: { id: true, firstName: true, lastName: true }
            },
            compilatore: {
                select: { id: true, firstName: true, lastName: true }
            }
        }
    });

    if (!compilato) {
        throw new AppError('Questionario compilato non trovato', 404);
    }

    return compilato;
}

/**
 * Firma paziente sul questionario compilato
 */
export async function firmaPaziente(tenantId, id, firmaBase64, firmatoDa, ipAddress) {
    const compilato = await getCompilatoById(tenantId, id);

    if (compilato.firmaPaziente) {
        throw new AppError('Questionario già firmato dal paziente', 409);
    }

    if (!['BOZZA', 'DA_FIRMARE'].includes(compilato.stato)) {
        throw new AppError(`Impossibile firmare questionario in stato ${compilato.stato}`, 400);
    }

    // Determina nuovo stato
    const richiedeFirmaMedico = compilato.documentoTemplate.richiedeFirmaMedico;
    const nuovoStato = richiedeFirmaMedico ? 'FIRMATO_PAZIENTE' : 'COMPLETATO';

    await prisma.$transaction(async (tx) => {
        await tx.documentoCompilato.update({
            where: { id },
            data: {
                firmaPaziente: firmaBase64,
                firmaPazienteAt: new Date(),
                firmaPazienteIp: ipAddress,
                stato: nuovoStato
            }
        });

        await tx.documentoCompilatoLog.create({
            data: {
                documentoCompilatoId: id,
                azione: 'SIGN',
                dettagli: { tipo: 'paziente', nuovoStato },
                eseguitoDa: firmatoDa,
                ipAddress
            }
        });
    });

    logger.info(`[QuestionarioMedico] Firma paziente su questionario ${id}`, { tenantId, nuovoStato });

    return getCompilatoById(tenantId, id);
}

/**
 * Firma medico sul questionario compilato
 */
export async function firmaMedico(tenantId, id, medicoId, firmaBase64, ipAddress) {
    const compilato = await getCompilatoById(tenantId, id);

    if (compilato.firmaMedico) {
        throw new AppError('Questionario già firmato dal medico', 409);
    }

    const template = compilato.documentoTemplate;

    // Verifica che richieda firma medico
    if (!template.richiedeFirmaMedico) {
        throw new AppError('Questo questionario non richiede firma medico', 400);
    }

    // Se richiede anche firma paziente, deve essere già presente
    if (template.richiedeFirma && !compilato.firmaPaziente) {
        throw new AppError('Il paziente deve firmare prima del medico', 400);
    }

    await prisma.$transaction(async (tx) => {
        await tx.documentoCompilato.update({
            where: { id },
            data: {
                firmaMedico: firmaBase64,
                firmaMedicoAt: new Date(),
                firmaMedicoId: medicoId,
                firmaMedicoIp: ipAddress,
                stato: 'COMPLETATO'
            }
        });

        await tx.documentoCompilatoLog.create({
            data: {
                documentoCompilatoId: id,
                azione: 'SIGN',
                dettagli: { tipo: 'medico', medicoId },
                eseguitoDa: medicoId,
                ipAddress
            }
        });
    });

    logger.info(`[QuestionarioMedico] Firma medico su questionario ${id}`, { tenantId, medicoId });

    return getCompilatoById(tenantId, id);
}

/**
 * Valida risposte questionario (medico revisiona)
 */
export async function validaRisposte(tenantId, id, validatoDa, noteValidazione, ipAddress) {
    const compilato = await getCompilatoById(tenantId, id);

    if (!compilato.documentoTemplate.questionarioConfig?.richiedeRevisione) {
        throw new AppError('Questo questionario non richiede revisione', 400);
    }

    await prisma.$transaction(async (tx) => {
        // Marca tutte le risposte come validate
        await tx.questionarioRisposta.updateMany({
            where: {
                documentoCompilatoId: id,
                validato: false
            },
            data: {
                validato: true,
                validatoDa,
                validatoAt: new Date(),
                noteValidazione
            }
        });

        await tx.documentoCompilatoLog.create({
            data: {
                documentoCompilatoId: id,
                azione: 'VALIDATE',
                dettagli: { validatoDa, noteValidazione },
                eseguitoDa: validatoDa,
                ipAddress
            }
        });
    });

    logger.info(`[QuestionarioMedico] Validate risposte questionario ${id}`, { tenantId, validatoDa });

    return getCompilatoById(tenantId, id);
}

// ============================================================================
// SCORING
// ============================================================================

/**
 * Calcola punteggio per singolo campo
 */
/**
 * Calcola punteggio per un singolo campo del questionario.
 * Supporta sia scoringConfig.weights (config globale) che campo.scoring (config per-campo da template).
 */
function calculateFieldScore(scoringConfig, campoId, risposta, templateCampi = []) {
    // 1. Cerca config da scoringConfig.weights (QuestionarioMedicoConfig)
    let fieldConfig = scoringConfig?.weights?.[campoId];

    // 2. Fallback: cerca scoring dal campo nel template (campo.scoring)
    if (!fieldConfig && templateCampi.length > 0) {
        const campo = templateCampi.find(c => c.name === campoId);
        if (campo?.scoring) {
            fieldConfig = campo.scoring;
        }
    }

    if (!fieldConfig) {
        return { punteggio: null, peso: null, flagCritico: false };
    }

    let punteggio = 0;
    let flagCritico = false;

    // Calcolo basato sul tipo di valore
    if (risposta.valoreNumerico !== null && risposta.valoreNumerico !== undefined) {
        // Punteggio diretto o con range
        if (fieldConfig.ranges) {
            const value = risposta.valoreNumerico;
            for (const range of fieldConfig.ranges) {
                if (value >= (range.min ?? -Infinity) && value <= (range.max ?? Infinity)) {
                    punteggio = range.score ?? 0;
                    flagCritico = range.critical ?? false;
                    break;
                }
            }
        } else {
            punteggio = risposta.valoreNumerico * (fieldConfig.multiplier ?? 1);
        }
    } else if (risposta.valoreBoolean !== null && risposta.valoreBoolean !== undefined) {
        // Boolean: true/false score
        punteggio = risposta.valoreBoolean ? (fieldConfig.trueScore ?? 0) : (fieldConfig.falseScore ?? 0);
        flagCritico = risposta.valoreBoolean ? (fieldConfig.trueCritical ?? false) : (fieldConfig.falseCritical ?? false);
    } else if (risposta.valoreJson && Array.isArray(risposta.valoreJson)) {
        // Array (checkbox multipli): somma punti per ogni valore selezionato
        punteggio = risposta.valoreJson.reduce((sum, val) => {
            const optionScore = fieldConfig.options?.[val]?.score ?? fieldConfig.perOptionScore ?? 1;
            const optionCritical = fieldConfig.options?.[val]?.critical ?? false;
            if (optionCritical) flagCritico = true;
            return sum + optionScore;
        }, 0);
    } else if (risposta.valoreTesto !== null && risposta.valoreTesto !== undefined) {
        // Select/radio: punteggio per opzione selezionata (da optionScores array o options map)
        if (fieldConfig.optionScores && Array.isArray(fieldConfig.optionScores)) {
            // Per-campo scoring: optionScores[index] corrispondente alla posizione nell'array options
            const campo = templateCampi.find(c => c.name === campoId);
            const optionIndex = (campo?.options || []).findIndex(opt => {
                const optValue = typeof opt === 'string' ? opt : opt.value;
                return optValue === risposta.valoreTesto;
            });
            if (optionIndex >= 0 && optionIndex < fieldConfig.optionScores.length) {
                punteggio = fieldConfig.optionScores[optionIndex] ?? 0;
            }
        } else if (fieldConfig.options?.[risposta.valoreTesto]) {
            // Global scoring config: options map
            punteggio = fieldConfig.options[risposta.valoreTesto]?.score ?? 0;
            flagCritico = fieldConfig.options[risposta.valoreTesto]?.critical ?? false;
        }
    }

    return {
        punteggio,
        peso: fieldConfig.weight ?? 1,
        flagCritico
    };
}

/**
 * Calcola punteggio totale questionario.
 * Supporta sia questionarioConfig.scoringConfig che per-campo scoring da template.campi.
 */
function calculateScore(template, risposte) {
    const config = template.questionarioConfig;
    const hasCampoScoring = (template.campi || []).some(c => c.scoring);

    // Se non c'è scoring globale NÉ per-campo, skip
    if (!config?.haScoring && !hasCampoScoring) {
        return { totale: null, percentuale: null, critico: false, note: null };
    }

    const scoringConfig = config?.scoringConfig || {};
    let totale = 0;
    let maxPossibile = scoringConfig.maxScore || 100;
    let hasCritical = false;
    const notes = [];

    for (const risposta of risposte) {
        const { punteggio, peso, flagCritico } = calculateFieldScore(scoringConfig, risposta.campoId, risposta, template.campi || []);

        if (punteggio !== null) {
            totale += punteggio * (peso ?? 1);
        }

        if (flagCritico) {
            hasCritical = true;
            notes.push(`Campo critico: ${risposta.campoLabel || risposta.campoId}`);
        }
    }

    const percentuale = maxPossibile > 0 ? (totale / maxPossibile) * 100 : null;
    const critico = hasCritical || (config.sogliaCritica !== null && totale >= config.sogliaCritica);

    if (critico && !hasCritical) {
        notes.push(`Soglia critica superata: ${totale} >= ${config.sogliaCritica}`);
    }

    return {
        totale,
        percentuale,
        critico,
        note: notes.length > 0 ? notes.join('; ') : null
    };
}

// ============================================================================
// QUERY PER RISCHIO/VISITA
// ============================================================================

/**
 * Recupera questionari obbligatori per un codice rischio
 */
export async function getQuestionariPerRischio(tenantId, codiceRischio) {
    const templates = await prisma.documentoTemplate.findMany({
        where: {
            tenantId,
            deletedAt: null,
            isActive: true,
            tipo: { in: QUESTIONARIO_TYPES },
            questionarioConfig: {
                codiciRischio: { has: codiceRischio }
            }
        },
        include: {
            questionarioConfig: true
        },
        orderBy: [{ obbligatorio: 'desc' }, { ordine: 'asc' }]
    });

    return templates;
}

/**
 * Recupera questionari obbligatori per un tipo visita MDL
 */
export async function getQuestionariPerTipoVisita(tenantId, tipoVisitaMDL) {
    const templates = await prisma.documentoTemplate.findMany({
        where: {
            tenantId,
            deletedAt: null,
            isActive: true,
            tipo: { in: QUESTIONARIO_TYPES },
            questionarioConfig: {
                tipiVisitaMDL: { has: tipoVisitaMDL }
            }
        },
        include: {
            questionarioConfig: true
        },
        orderBy: [{ obbligatorio: 'desc' }, { ordine: 'asc' }]
    });

    return templates;
}

/**
 * S67: Recupera questionari collegati a un protocollo sanitario
 */
export async function getQuestionariPerProtocollo(tenantId, protocolloSanitarioId) {
    const templates = await prisma.documentoTemplate.findMany({
        where: {
            tenantId,
            deletedAt: null,
            isActive: true,
            tipo: { in: QUESTIONARIO_TYPES },
            questionarioConfig: {
                protocolloSanitarioId
            }
        },
        include: {
            questionarioConfig: {
                include: {
                    protocolloSanitario: { select: { codice: true, denominazione: true } }
                }
            }
        },
        orderBy: [{ obbligatorio: 'desc' }, { ordine: 'asc' }]
    });

    return templates;
}

/**
 * Recupera questionari di una visita
 * Include anche documenti collegati tramite appuntamentoId (safety net per check-in da coda)
 */
export async function getQuestionariVisita(tenantId, visitaId) {
    // Get the visita to find its appuntamentoId and pazienteId
    const visita = await prisma.visita.findFirst({
        where: { id: visitaId, tenantId, deletedAt: null },
        select: { appuntamentoId: true, pazienteId: true, createdAt: true }
    });

    // Build OR conditions:
    // 1. By visitaId: ALL types (any document linked to the visit should show)
    // 2. By appuntamentoId: ALL types with visitaId=null (queue-submitted docs not yet linked)
    // 3. Fallback by pazienteId: recent unlinked questionnaire-type docs (30-day window)
    const orConditions = [
        { visitaId }
    ];
    if (visita?.appuntamentoId) {
        orConditions.push({
            appuntamentoId: visita.appuntamentoId,
            visitaId: null
            // No tipo filter — queue-submitted docs are always valid
        });
    }
    // Fallback: find unlinked docs for same patient (last 30 days)
    // This catches questionnaires filled in queue for appointments that
    // were later rescheduled or where the visit was created separately
    if (visita?.pazienteId) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        orConditions.push({
            pazienteId: visita.pazienteId,
            visitaId: null,
            createdAt: { gte: thirtyDaysAgo },
            documentoTemplate: { tipo: { in: QUESTIONARIO_TYPES } }
        });
    }

    const compilati = await prisma.documentoCompilato.findMany({
        where: {
            tenantId,
            deletedAt: null,
            OR: orConditions
        },
        include: {
            documentoTemplate: {
                include: { questionarioConfig: true }
            },
            risposteDettagliate: true
        },
        orderBy: { createdAt: 'asc' }
    });

    // Opportunistically link orphaned docs to the visita
    const orphaned = compilati.filter(c => !c.visitaId && visita?.appuntamentoId);
    if (orphaned.length > 0) {
        try {
            await prisma.documentoCompilato.updateMany({
                where: {
                    id: { in: orphaned.map(c => c.id) },
                    visitaId: null
                },
                data: { visitaId }
            });
        } catch (_) {
            // Non-critical, documents will still be returned
        }
    }

    return compilati;
}

/**
 * Recupera storico questionari di un paziente
 */
export async function getQuestionariPaziente(tenantId, pazienteId, filters = {}) {
    const { tipo, stato, page = 1, limit = 20 } = filters;

    const where = {
        tenantId,
        pazienteId,
        deletedAt: null,
        documentoTemplate: {
            tipo: { in: QUESTIONARIO_TYPES }
        }
    };

    if (tipo) {
        where.documentoTemplate.tipo = tipo;
    }
    if (stato) {
        where.stato = stato;
    }

    const skip = (page - 1) * limit;

    const [compilati, total] = await Promise.all([
        prisma.documentoCompilato.findMany({
            where,
            include: {
                documentoTemplate: {
                    select: { id: true, nome: true, tipo: true }
                },
                visita: {
                    select: { id: true, dataOra: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.documentoCompilato.count({ where })
    ]);

    return {
        data: compilati,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

// ============================================================================
// P61: TARIFFAZIONE
// ============================================================================

/**
 * Calcola prezzo questionario per una specifica azienda
 * Considera: voce tariffario → associazione azienda → prezzo default
 */
export async function getPrezzoQuestionario(tenantId, templateId, companyTenantProfileId = null) {
    const template = await getQuestionarioById(tenantId, templateId);
    const config = template.questionarioConfig;

    if (!config?.fatturabile) {
        return { fatturabile: false, prezzo: null, fonte: null };
    }

    let prezzo = config.prezzoDefault ? parseFloat(config.prezzoDefault) : 0;
    let fonte = 'default';
    let voceCodice = null;

    // Se ha voce tariffario, cerca prezzo
    if (config.voceTariffarioId) {
        const voceTariffario = await prisma.voceTariffario.findUnique({
            where: { id: config.voceTariffarioId, deletedAt: null },
            include: {
                tariffario: companyTenantProfileId ? {
                    include: {
                        companyAssociations: {
                            where: {
                                companyTenantProfileId,
                                deletedAt: null
                            }
                        }
                    }
                } : true
            }
        });

        if (voceTariffario) {
            voceCodice = voceTariffario.codice || voceTariffario.nome;

            // Cerca prezzo personalizzato azienda
            const companyAssociation = voceTariffario.tariffario?.companyAssociations?.[0];
            if (companyAssociation) {
                fonte = 'tariffario_azienda';
                // Eventuale override da associazione (se implementato)
            }

            // Prezzo base da voce tariffario
            if (voceTariffario.prezzoBase) {
                prezzo = parseFloat(voceTariffario.prezzoBase);
                if (fonte === 'default') fonte = 'voce_tariffario';
            }
        }
    }

    return {
        fatturabile: true,
        prezzo,
        fonte,
        voceCodice,
        isPagamento: config.isPagamento,
        aliquotaIva: 0 // Prestazioni sanitarie esenti
    };
}

/**
 * Recupera movimenti contabili generati da questionari
 */
export async function getMovimentiQuestionari(tenantId, filters = {}) {
    const {
        companyTenantProfileId,
        pazienteId,
        dataInizio,
        dataFine,
        stato,
        page = 1,
        limit = 50
    } = filters;

    const where = {
        tenantId,
        deletedAt: null,
        documentoCompilatoId: { not: null } // Solo movimenti da questionari
    };

    if (companyTenantProfileId) where.companyTenantProfileId = companyTenantProfileId;
    if (pazienteId) where.personId = pazienteId;
    if (stato) where.stato = stato;
    if (dataInizio || dataFine) {
        where.dataEsecuzione = {};
        if (dataInizio) where.dataEsecuzione.gte = new Date(dataInizio);
        if (dataFine) where.dataEsecuzione.lte = new Date(dataFine);
    }

    const skip = (page - 1) * limit;

    const [movimenti, total] = await Promise.all([
        prisma.movimentoContabile.findMany({
            where,
            include: {
                documentoCompilato: {
                    select: {
                        id: true,
                        stato: true,
                        documentoTemplate: {
                            select: { id: true, nome: true, tipo: true }
                        }
                    }
                },
                companyTenantProfile: {
                    select: {
                        id: true,
                        company: { select: { id: true, ragioneSociale: true } }
                    }
                },
                person: {
                    select: { id: true, firstName: true, lastName: true }
                }
            },
            orderBy: { dataEsecuzione: 'desc' },
            skip,
            take: limit
        }),
        prisma.movimentoContabile.count({ where })
    ]);

    return {
        data: movimenti,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

// ============================================================================
// S71: PDF GENERATION FOR COMPILATI
// ============================================================================

/**
 * Generate a PDF for a compilato document.
 * Renders the template HTML with compiled data, placeholders, and firma images.
 * Then generates PDF via Puppeteer and saves to storage.
 * 
 * @param {string} tenantId
 * @param {string} compilatoId
 * @param {string} userId - who triggered the generation
 * @param {string} ipAddress
 * @returns {Promise<Object>} - { pdfUrl, documentId }
 */
export async function generateCompilatoPdf(tenantId, compilatoId, userId, ipAddress) {
    logger.info('[QuestionarioMedico] Inizio generazione PDF compilato', { tenantId, compilatoId, userId });

    // 1. Load compilato with all relations
    const compilato = await prisma.documentoCompilato.findFirst({
        where: { id: compilatoId, tenantId, deletedAt: null },
        include: {
            documentoTemplate: {
                include: { questionarioConfig: true }
            },
            paziente: {
                select: { id: true, firstName: true, lastName: true, taxCode: true, gender: true, birthDate: true, birthPlace: true }
            },
            visita: {
                select: {
                    id: true, dataOra: true, tipoVisitaMDL: true, medicoId: true,
                    medico: { select: { id: true, firstName: true, lastName: true, gender: true } }
                }
            },
            risposteDettagliate: {
                orderBy: { createdAt: 'asc' }
            },
            medicoFirmante: {
                select: { id: true, firstName: true, lastName: true, gender: true }
            },
            compilatore: {
                select: { id: true, firstName: true, lastName: true }
            }
        }
    });

    if (!compilato) {
        throw new AppError('Questionario compilato non trovato', 404);
    }

    const template = compilato.documentoTemplate;

    // 2. Load tenant info for structure placeholders
    const tenant = await prisma.tenant.findFirst({
        where: { id: tenantId, deletedAt: null },
        select: {
            id: true, name: true, settings: true,
            selfCompanyProfile: {
                select: {
                    emailGenerale: true, telefonoGenerale: true,
                    company: {
                        select: {
                            ragioneSociale: true, sedeLegaleIndirizzo: true,
                            sedeLegaleCitta: true, sedeLegaleCap: true, sedeLegaleProvincia: true
                        }
                    }
                }
            }
        }
    });

    // 3. Build placeholder context
    const paziente = compilato.paziente;
    const medico = compilato.medicoFirmante || compilato.visita?.medico;
    const nomeStruttura = tenant?.selfCompanyProfile?.company?.ragioneSociale || tenant?.name || '';
    const indirizzoStruttura = _buildIndirizzoStruttura(tenant);
    const telefonoStruttura = tenant?.selfCompanyProfile?.telefonoGenerale || '';
    const tenantSettings = (typeof tenant?.settings === 'object' && tenant?.settings !== null) ? tenant.settings : {};
    const logoDataUrl = resolveFirstValidLogo(tenantSettings.branches?.MEDICA?.logo, tenantSettings.branches?.FORMAZIONE?.logo, tenantSettings.logoUrl, tenantSettings.logo);

    const titoloMedico = medico ? getMedicoTitle(medico.gender) : '';

    const context = {
        nomePaziente: paziente?.firstName || '',
        cognomePaziente: paziente?.lastName || '',
        codiceFiscalePaziente: paziente?.taxCode || '',
        dataNascitaPaziente: paziente?.birthDate ? _formatDate(paziente.birthDate) : '',
        luogoNascitaPaziente: paziente?.birthPlace || '',
        emailPaziente: '', // In TenantProfile, non in Person
        telefonoPaziente: '',
        nomeMedico: medico?.firstName || '',
        cognomeMedico: medico?.lastName || '',
        titoloMedico,
        dataVisita: compilato.visita?.dataOra ? _formatDate(compilato.visita.dataOra) : '',
        oraVisita: compilato.visita?.dataOra ? _formatTime(compilato.visita.dataOra) : '',
        prestazione: compilato.visita?.tipoVisitaMDL || '',
        ambulatorio: '',
        logoTenant: logoDataUrl ? `<img src="${logoDataUrl}" style="max-height:60px;max-width:200px;" alt="Logo">` : '',
        nomeStruttura,
        indirizzoStruttura,
        telefonoStruttura,
        nomeDocumento: template.nome || '',
        codiceDocumento: template.codice || '',
        dataCompilazione: compilato.createdAt ? _formatDate(compilato.createdAt) : '',
        dataOggi: _formatDate(new Date()),
        // Firme as <img> tags
        firmaPaziente: compilato.firmaPaziente
            ? `<img src="${compilato.firmaPaziente}" style="max-width:200px;max-height:80px;object-fit:contain;" alt="Firma Paziente">`
            : '',
        firmaMedico: compilato.firmaMedico
            ? `<img src="${compilato.firmaMedico}" style="max-width:200px;max-height:80px;object-fit:contain;" alt="Firma Medico">`
            : '',
        firmaDipendente: compilato.firmaDipendente
            ? `<img src="${compilato.firmaDipendente}" style="max-width:200px;max-height:80px;object-fit:contain;" alt="Firma Dipendente">`
            : '',
        firmaFormatore: compilato.firmaFormatore
            ? `<img src="${compilato.firmaFormatore}" style="max-width:200px;max-height:80px;object-fit:contain;" alt="Firma Formatore">`
            : '',
        firmaDatore: compilato.firmaDatore
            ? `<img src="${compilato.firmaDatore}" style="max-width:200px;max-height:80px;object-fit:contain;" alt="Firma Datore">`
            : '',
    };

    // 4. Build the questionnaire answers HTML ({{campiQuestionario}})
    context.campiQuestionario = _buildCampiQuestionarioHtml(compilato);

    // 5. Get the template HTML
    let html = template.contenutoHtml || '';

    // If no template HTML, build a default document
    if (!html) {
        html = _buildDefaultCompilatoHtml(context, compilato);
    } else {
        // 6. Resolve placeholders in template
        html = _resolvePlaceholders(html, context);
    }

    // 7. Wrap in full HTML document for PDF rendering
    const fullHtml = _wrapInDocument(html, template.nome || 'Documento');

    // 8. Generate PDF via Puppeteer
    const pdfBuffer = await pdfService.generatePDF(fullHtml, {
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        printBackground: true
    });

    // 9. Save to storage
    const sanitizedName = (template.nome || 'documento').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const filename = `compilato_${sanitizedName}_${compilatoId.substring(0, 8)}.pdf`;
    const { filepath, fileUrl } = await storageService.saveFile(
        pdfBuffer, filename, 'documenti-compilati'
    );

    // 10. Calculate hash for integrity
    const fileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // 11. Update compilato with PDF URL
    await prisma.$transaction(async (tx) => {
        await tx.documentoCompilato.update({
            where: { id: compilatoId, deletedAt: null },
            data: {
                pdfUrl: fileUrl,
                pdfGeneratoAt: new Date()
            }
        });

        await tx.documentoCompilatoLog.create({
            data: {
                documentoCompilatoId: compilatoId,
                azione: 'PRINT',
                dettagli: {
                    pdfUrl: fileUrl,
                    filepath,
                    fileSize: pdfBuffer.length,
                    fileHash,
                    generatedBy: userId
                },
                eseguitoDa: userId,
                ipAddress: ipAddress || '0.0.0.0'
            }
        });
    });

    logger.info('[QuestionarioMedico] PDF compilato generato con successo', {
        compilatoId,
        filepath,
        fileSize: pdfBuffer.length,
        fileUrl
    });

    return {
        success: true,
        pdfUrl: fileUrl,
        filepath,
        fileSize: pdfBuffer.length,
        fileHash,
        generatedAt: new Date().toISOString()
    };
}


// ============================================================================
// S71: PDF HELPER FUNCTIONS
// ============================================================================

/**
 * Resolve {{placeholder}} in template HTML
 */
function _resolvePlaceholders(html, context) {
    if (!html) return '';

    // Triple-stash (raw HTML, e.g. {{{firmaPaziente}}})
    html = html.replace(/\{\{\{([^}]+)\}\}\}/g, (match, key) => {
        const value = context[key.trim()];
        return value != null ? String(value) : '';
    });

    // Double-stash (escaped, e.g. {{nomePaziente}})
    html = html.replace(/\{\{([^#/][^}]*)\}\}/g, (match, key) => {
        const value = context[key.trim()];
        if (value == null) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    });

    // Fix bare data URIs (base64 signatures without wrapping <img>)
    html = html.replace(
        /(data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]{50,})/g,
        (match, dataUri, offset) => {
            const before = html.substring(Math.max(0, offset - 10), offset);
            if (/(?:src|href)\s*=\s*["']$/.test(before) || before.endsWith('"') || before.endsWith("'")) {
                return match;
            }
            return `<img src="${dataUri}" style="max-width:200px;max-height:80px;object-fit:contain;" alt="Firma">`;
        }
    );

    return html;
}

/**
 * Build HTML for questionnaire answers ({{campiQuestionario}})
 */
function _buildCampiQuestionarioHtml(compilato) {
    const risposte = compilato.risposteDettagliate || [];
    const dati = compilato.datiCompilati || {};
    const campi = compilato.documentoTemplate?.campi;

    // If we have detailed risposte (questionario), render them
    if (risposte.length > 0) {
        let html = '<div style="margin: 15px 0;">';
        for (const r of risposte) {
            const domandaLabel = r.campoLabel || r.campoId || 'Domanda';
            // Pick the appropriate value (text > numeric > boolean > date > json)
            let risposta = '-';
            if (r.valoreTesto != null) risposta = r.valoreTesto;
            else if (r.valoreNumerico != null) risposta = String(r.valoreNumerico);
            else if (r.valoreBoolean != null) risposta = r.valoreBoolean ? 'Sì' : 'No';
            else if (r.valoreData != null) risposta = _formatDate(r.valoreData);
            else if (r.valoreJson != null) risposta = JSON.stringify(r.valoreJson);
            html += `<div style="margin-bottom: 8px; padding: 6px 10px; background: #f9fafb; border-left: 3px solid #0d9488;">`;
            html += `<div style="font-size: 12px; color: #666; margin-bottom: 2px;">${_escapeHtml(domandaLabel)}</div>`;
            html += `<div style="font-size: 13px; font-weight: 500;">${_escapeHtml(risposta)}</div>`;
            if (r.flagCritico) {
                html += `<div style="font-size: 11px; color: #dc2626; margin-top: 2px;">⚠ Risposta critica</div>`;
            }
            html += `</div>`;
        }
        html += '</div>';
        return html;
    }

    // If we have campi schema + datiCompilati (modulistica), render them
    if (campi && Array.isArray(campi) && Object.keys(dati).length > 0) {
        let html = '<div style="margin: 15px 0;">';
        for (const campo of campi) {
            const label = campo.label || campo.name || 'Campo';
            const value = dati[campo.name] != null ? String(dati[campo.name]) : '-';
            html += `<div style="margin-bottom: 8px; padding: 6px 10px; background: #f9fafb; border-left: 3px solid #0d9488;">`;
            html += `<div style="font-size: 12px; color: #666; margin-bottom: 2px;">${_escapeHtml(label)}</div>`;
            html += `<div style="font-size: 13px; font-weight: 500;">${_escapeHtml(value)}</div>`;
            html += `</div>`;
        }
        html += '</div>';
        return html;
    }

    // Fallback: render datiCompilati directly
    if (Object.keys(dati).length > 0) {
        let html = '<div style="margin: 15px 0;">';
        for (const [key, value] of Object.entries(dati)) {
            html += `<div style="margin-bottom: 8px; padding: 6px 10px; background: #f9fafb; border-left: 3px solid #0d9488;">`;
            html += `<div style="font-size: 12px; color: #666; margin-bottom: 2px;">${_escapeHtml(key)}</div>`;
            html += `<div style="font-size: 13px; font-weight: 500;">${_escapeHtml(String(value != null ? value : '-'))}</div>`;
            html += `</div>`;
        }
        html += '</div>';
        return html;
    }

    return '<p style="color: #999; font-style: italic;">Nessun dato compilato</p>';
}

/**
 * Build a default PDF document when template has no contenutoHtml
 */
function _buildDefaultCompilatoHtml(context, compilato) {
    const firmeSectionParts = [];
    if (context.firmaPaziente) {
        firmeSectionParts.push(`
            <div style="text-align:center;">
                <p style="font-size:11px;color:#666;margin-bottom:4px;">Firma Paziente</p>
                ${context.firmaPaziente}
                <p style="font-size:11px;color:#666;margin-top:4px;">${_escapeHtml(context.cognomePaziente)} ${_escapeHtml(context.nomePaziente)}</p>
            </div>
        `);
    }
    if (context.firmaMedico) {
        firmeSectionParts.push(`
            <div style="text-align:center;">
                <p style="font-size:11px;color:#666;margin-bottom:4px;">Firma Medico</p>
                ${context.firmaMedico}
                <p style="font-size:11px;color:#666;margin-top:4px;">${_escapeHtml(context.titoloMedico)} ${_escapeHtml(context.cognomeMedico)} ${_escapeHtml(context.nomeMedico)}</p>
            </div>
        `);
    }

    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a;">
            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0d9488;padding-bottom:20px;margin-bottom:30px;">
                <div>
                    ${context.logoTenant}
                    <h2 style="margin:5px 0 0;color:#0d9488;font-size:18px;">${_escapeHtml(context.nomeStruttura)}</h2>
                    <p style="margin:2px 0;color:#666;font-size:12px;">${_escapeHtml(context.indirizzoStruttura)}</p>
                    <p style="margin:2px 0;color:#666;font-size:12px;">Tel: ${_escapeHtml(context.telefonoStruttura)}</p>
                </div>
                <div style="text-align:right;">
                    <p style="margin:0;color:#999;font-size:11px;">Codice: ${_escapeHtml(context.codiceDocumento)}</p>
                    <p style="margin:2px 0;color:#999;font-size:11px;">Data: ${_escapeHtml(context.dataOggi)}</p>
                </div>
            </div>

            <!-- Titolo -->
            <h1 style="text-align:center;font-size:22px;margin-bottom:30px;text-transform:uppercase;letter-spacing:1px;">
                ${_escapeHtml(context.nomeDocumento)}
            </h1>

            <!-- Dati paziente -->
            <div style="background:#f8fffe;border:1px solid #e0f2f1;border-radius:8px;padding:20px;margin-bottom:25px;">
                <h3 style="margin:0 0 12px;color:#0d9488;font-size:14px;text-transform:uppercase;">Dati Paziente</h3>
                <table style="width:100%;border-collapse:collapse;">
                    <tr>
                        <td style="padding:4px 8px;color:#666;font-size:13px;width:150px;">Cognome e Nome:</td>
                        <td style="padding:4px 8px;font-weight:600;font-size:13px;">${_escapeHtml(context.cognomePaziente)} ${_escapeHtml(context.nomePaziente)}</td>
                        <td style="padding:4px 8px;color:#666;font-size:13px;width:120px;">Codice Fiscale:</td>
                        <td style="padding:4px 8px;font-weight:600;font-size:13px;">${_escapeHtml(context.codiceFiscalePaziente)}</td>
                    </tr>
                    <tr>
                        <td style="padding:4px 8px;color:#666;font-size:13px;">Data di nascita:</td>
                        <td style="padding:4px 8px;font-size:13px;">${_escapeHtml(context.dataNascitaPaziente)}</td>
                        <td style="padding:4px 8px;color:#666;font-size:13px;">Luogo:</td>
                        <td style="padding:4px 8px;font-size:13px;">${_escapeHtml(context.luogoNascitaPaziente)}</td>
                    </tr>
                </table>
            </div>

            <!-- Risposte/Campi compilati -->
            ${context.campiQuestionario}

            <!-- Firme -->
            ${firmeSectionParts.length > 0 ? `
                <div style="display:flex;justify-content:space-around;margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;">
                    ${firmeSectionParts.join('')}
                </div>
            ` : ''}

            <!-- Footer -->
            <div style="margin-top:40px;padding-top:10px;border-top:1px solid #e5e7eb;text-align:center;">
                <p style="color:#999;font-size:10px;">Documento generato il ${_escapeHtml(context.dataOggi)}</p>
            </div>
        </div>
    `;
}

/**
 * Wrap HTML content in a full document structure for Puppeteer
 */
function _wrapInDocument(html, title) {
    return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${_escapeHtml(title)}</title>
    <style>
        @page { margin: 0; }
        body {
            font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
            font-size: 13px;
            line-height: 1.5;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
        }
        img { max-width: 100%; }
        table { border-collapse: collapse; }
    </style>
</head>
<body>
    ${html}
</body>
</html>`;
}

/**
 * Format date to DD/MM/YYYY
 */
function _formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Format time to HH:mm
 */
function _formatTime(date) {
    const d = new Date(date);
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Build address from tenant data
 */
function _buildIndirizzoStruttura(tenant) {
    const company = tenant?.selfCompanyProfile?.company;
    if (!company) return '';
    const parts = [company.sedeLegaleIndirizzo, company.sedeLegaleCap, company.sedeLegaleCitta];
    if (company.sedeLegaleProvincia) parts.push(`(${company.sedeLegaleProvincia})`);
    return parts.filter(Boolean).join(' ');
}

/**
 * Escape HTML special characters
 */
function _escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}


// ============================================================================
// EXPORTS
// ============================================================================

export default {
    // Template CRUD
    getAllQuestionari,
    getQuestionarioById,
    createQuestionario,
    updateQuestionario,
    deleteQuestionario,

    // Compilazione
    compilaQuestionario,
    getCompilatoById,
    firmaPaziente,
    firmaMedico,
    validaRisposte,

    // S71: PDF generation
    generateCompilatoPdf,

    // Query
    getQuestionariPerRischio,
    getQuestionariPerTipoVisita,
    getQuestionariPerProtocollo,
    getQuestionariVisita,
    getQuestionariPaziente,

    // P61: Tariffazione
    getPrezzoQuestionario,
    getMovimentiQuestionari
};
