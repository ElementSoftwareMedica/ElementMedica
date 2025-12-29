/**
 * @fileoverview Service per la gestione dei Template Campi Visita
 * Gestisce campi dinamici per i form delle visite mediche
 * 
 * @module services/clinical/TemplateCampoVisitaService
 * @requires @prisma/client
 * @requires ../../utils/logger
 * 
 * @description
 * Questo service implementa:
 * - CRUD template campi visita
 * - Validazione tipi di campo
 * - Gestione opzioni per SELECT/MULTISELECT
 * - Ordinamento campi drag&drop
 * - Duplicazione template tra prestazioni
 * - Validazione valori in base al tipo
 * 
 * @gdpr
 * - Soft delete obbligatorio (deletedAt)
 * - Audit trail per modifiche template
 * - Multi-tenancy con filtro tenantId
 * 
 * @author ElementMedica Team
 * @version 1.0.0
 * @since 2025-01-31
 */

import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Enum dei tipi di campo supportati
 * @constant {Object} TIPO_CAMPO
 */
const TIPO_CAMPO = {
    TESTO: 'TESTO',
    TEXTAREA: 'TEXTAREA',
    NUMERO: 'NUMERO',
    DECIMALE: 'DECIMALE',
    DATA: 'DATA',
    DATETIME: 'DATETIME',
    BOOLEAN: 'BOOLEAN',
    SELECT: 'SELECT',
    MULTISELECT: 'MULTISELECT',
    FILE: 'FILE'
};

/**
 * Service per la gestione dei Template Campi Visita
 */
const TemplateCampoVisitaService = {
    /**
     * Crea un nuovo template campo visita
     * @param {Object} data - Dati del campo
     * @param {string} data.tenantId - ID tenant
     * @param {string} data.prestazioneId - ID prestazione
     * @param {string} data.nome - Nome interno del campo
     * @param {string} data.etichetta - Label visualizzata
     * @param {string} [data.tipo='TESTO'] - Tipo di campo
     * @param {boolean} [data.obbligatorio=false] - Se obbligatorio
     * @param {number} [data.ordine] - Ordine visualizzazione
     * @param {Array} [data.opzioni] - Opzioni per SELECT/MULTISELECT
     * @param {string} [data.valoreDefault] - Valore predefinito
     * @param {Object} [data.validazione] - Regole validazione
     * @param {string} [data.placeholder] - Placeholder
     * @param {string} [data.helpText] - Testo di aiuto
     * @param {string} userId - ID utente che crea
     * @returns {Promise<Object>} Campo creato
     */
    async create(data, userId) {
        try {
            // Valida tipo campo
            if (data.tipo && !Object.values(TIPO_CAMPO).includes(data.tipo)) {
                throw new Error(`Tipo campo non valido: ${data.tipo}. Valori ammessi: ${Object.values(TIPO_CAMPO).join(', ')}`);
            }

            // Valida opzioni per SELECT/MULTISELECT
            if (['SELECT', 'MULTISELECT'].includes(data.tipo)) {
                if (!data.opzioni || !Array.isArray(data.opzioni) || data.opzioni.length === 0) {
                    throw new Error('I campi SELECT e MULTISELECT richiedono almeno una opzione');
                }
            }

            // Verifica che prestazione esista e appartenga al tenant
            const prestazione = await prisma.prestazione.findFirst({
                where: {
                    id: data.prestazioneId,
                    tenantId: data.tenantId,
                    deletedAt: null
                }
            });

            if (!prestazione) {
                throw new Error('Prestazione non trovata o non autorizzata');
            }

            // Verifica unicità nome per prestazione
            const existing = await prisma.templateCampoVisita.findFirst({
                where: {
                    prestazioneId: data.prestazioneId,
                    nome: data.nome,
                    deletedAt: null
                }
            });

            if (existing) {
                throw new Error(`Campo con nome "${data.nome}" già esistente per questa prestazione`);
            }

            // Calcola ordine se non specificato
            let ordine = data.ordine;
            if (ordine === undefined || ordine === null) {
                const maxOrdine = await prisma.templateCampoVisita.aggregate({
                    where: {
                        prestazioneId: data.prestazioneId,
                        deletedAt: null
                    },
                    _max: { ordine: true }
                });
                ordine = (maxOrdine._max.ordine || 0) + 1;
            }

            // Crea il campo
            const campo = await prisma.templateCampoVisita.create({
                data: {
                    tenantId: data.tenantId,
                    prestazioneId: data.prestazioneId,
                    nome: data.nome,
                    etichetta: data.etichetta,
                    tipo: data.tipo || 'TESTO',
                    obbligatorio: data.obbligatorio || false,
                    ordine,
                    opzioni: data.opzioni ? JSON.stringify(data.opzioni) : null,
                    valoreDefault: data.valoreDefault || null,
                    validazione: data.validazione ? JSON.stringify(data.validazione) : null,
                    placeholder: data.placeholder || null,
                    helpText: data.helpText || null,
                    attivo: true
                },
                include: {
                    prestazione: {
                        select: { id: true, nome: true, codice: true }
                    }
                }
            });

            logger.info({
                campoId: campo.id,
                prestazioneId: data.prestazioneId,
                userId
            }, 'Template campo visita creato');

            return this._formatCampo(campo);
        } catch (error) {
            logger.error({ error: error.message, data }, 'Errore creazione template campo visita');
            throw error;
        }
    },

    /**
     * Recupera un campo per ID
     * @param {string} id - ID campo
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object|null>} Campo trovato
     */
    async getById(id, tenantId) {
        try {
            const campo = await prisma.templateCampoVisita.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                },
                include: {
                    prestazione: {
                        select: { id: true, nome: true, codice: true }
                    }
                }
            });

            return campo ? this._formatCampo(campo) : null;
        } catch (error) {
            logger.error({ error: error.message, id }, 'Errore recupero template campo visita');
            throw error;
        }
    },

    /**
     * Recupera tutti i campi per una prestazione
     * @param {string} prestazioneId - ID prestazione
     * @param {string} tenantId - ID tenant
     * @param {Object} [options] - Opzioni query
     * @param {boolean} [options.onlyActive=true] - Solo campi attivi
     * @returns {Promise<Array>} Lista campi
     */
    async getByPrestazione(prestazioneId, tenantId, options = {}) {
        try {
            const { onlyActive = true } = options;

            const whereClause = {
                prestazioneId,
                tenantId,
                deletedAt: null
            };

            if (onlyActive) {
                whereClause.attivo = true;
            }

            const campi = await prisma.templateCampoVisita.findMany({
                where: whereClause,
                orderBy: { ordine: 'asc' },
                include: {
                    prestazione: {
                        select: { id: true, nome: true, codice: true }
                    }
                }
            });

            return campi.map(c => this._formatCampo(c));
        } catch (error) {
            logger.error({ error: error.message, prestazioneId }, 'Errore recupero campi per prestazione');
            throw error;
        }
    },

    /**
     * Recupera tutti i campi del tenant con filtri
     * @param {string} tenantId - ID tenant
     * @param {Object} [filters] - Filtri query
     * @param {string} [filters.tipo] - Filtra per tipo campo
     * @param {boolean} [filters.obbligatorio] - Filtra per obbligatorietà
     * @param {boolean} [filters.attivo] - Filtra per stato attivo
     * @param {string} [filters.search] - Ricerca per nome/etichetta
     * @param {Object} [pagination] - Paginazione
     * @returns {Promise<Object>} Lista campi con count
     */
    async getAll(tenantId, filters = {}, pagination = {}) {
        try {
            const { page = 1, limit = 50 } = pagination;
            const skip = (page - 1) * limit;

            const whereClause = {
                tenantId,
                deletedAt: null
            };

            if (filters.tipo) {
                whereClause.tipo = filters.tipo;
            }

            if (filters.obbligatorio !== undefined) {
                whereClause.obbligatorio = filters.obbligatorio;
            }

            if (filters.attivo !== undefined) {
                whereClause.attivo = filters.attivo;
            }

            if (filters.search) {
                whereClause.OR = [
                    { nome: { contains: filters.search, mode: 'insensitive' } },
                    { etichetta: { contains: filters.search, mode: 'insensitive' } }
                ];
            }

            if (filters.prestazioneId) {
                whereClause.prestazioneId = filters.prestazioneId;
            }

            const [campi, total] = await Promise.all([
                prisma.templateCampoVisita.findMany({
                    where: whereClause,
                    skip,
                    take: limit,
                    orderBy: [
                        { prestazioneId: 'asc' },
                        { ordine: 'asc' }
                    ],
                    include: {
                        prestazione: {
                            select: { id: true, nome: true, codice: true }
                        }
                    }
                }),
                prisma.templateCampoVisita.count({ where: whereClause })
            ]);

            return {
                data: campi.map(c => this._formatCampo(c)),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error({ error: error.message, tenantId }, 'Errore recupero template campi visita');
            throw error;
        }
    },

    /**
     * Aggiorna un campo esistente
     * @param {string} id - ID campo
     * @param {Object} data - Dati aggiornamento
     * @param {string} tenantId - ID tenant
     * @param {string} userId - ID utente che modifica
     * @returns {Promise<Object>} Campo aggiornato
     */
    async update(id, data, tenantId, userId) {
        try {
            // Verifica esistenza e autorizzazione
            const existing = await prisma.templateCampoVisita.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!existing) {
                throw new Error('Campo non trovato o non autorizzato');
            }

            // Valida tipo campo se modificato
            if (data.tipo && !Object.values(TIPO_CAMPO).includes(data.tipo)) {
                throw new Error(`Tipo campo non valido: ${data.tipo}`);
            }

            // Valida opzioni per SELECT/MULTISELECT
            const newTipo = data.tipo || existing.tipo;
            if (['SELECT', 'MULTISELECT'].includes(newTipo)) {
                const opzioni = data.opzioni !== undefined ? data.opzioni :
                    (existing.opzioni ? JSON.parse(existing.opzioni) : null);
                if (!opzioni || !Array.isArray(opzioni) || opzioni.length === 0) {
                    throw new Error('I campi SELECT e MULTISELECT richiedono almeno una opzione');
                }
            }

            // Verifica unicità nome se modificato
            if (data.nome && data.nome !== existing.nome) {
                const duplicate = await prisma.templateCampoVisita.findFirst({
                    where: {
                        prestazioneId: existing.prestazioneId,
                        nome: data.nome,
                        id: { not: id },
                        deletedAt: null
                    }
                });

                if (duplicate) {
                    throw new Error(`Campo con nome "${data.nome}" già esistente per questa prestazione`);
                }
            }

            // Prepara dati aggiornamento
            const updateData = {};

            if (data.nome !== undefined) updateData.nome = data.nome;
            if (data.etichetta !== undefined) updateData.etichetta = data.etichetta;
            if (data.tipo !== undefined) updateData.tipo = data.tipo;
            if (data.obbligatorio !== undefined) updateData.obbligatorio = data.obbligatorio;
            if (data.ordine !== undefined) updateData.ordine = data.ordine;
            if (data.opzioni !== undefined) updateData.opzioni = JSON.stringify(data.opzioni);
            if (data.valoreDefault !== undefined) updateData.valoreDefault = data.valoreDefault;
            if (data.validazione !== undefined) updateData.validazione = JSON.stringify(data.validazione);
            if (data.placeholder !== undefined) updateData.placeholder = data.placeholder;
            if (data.helpText !== undefined) updateData.helpText = data.helpText;
            if (data.attivo !== undefined) updateData.attivo = data.attivo;

            const campo = await prisma.templateCampoVisita.update({
                where: { id },
                data: updateData,
                include: {
                    prestazione: {
                        select: { id: true, nome: true, codice: true }
                    }
                }
            });

            logger.info({ campoId: id, userId, changes: Object.keys(updateData) }, 'Template campo visita aggiornato');

            return this._formatCampo(campo);
        } catch (error) {
            logger.error({ error: error.message, id, data }, 'Errore aggiornamento template campo visita');
            throw error;
        }
    },

    /**
     * Soft delete di un campo
     * @param {string} id - ID campo
     * @param {string} tenantId - ID tenant
     * @param {string} userId - ID utente che elimina
     * @returns {Promise<boolean>} Successo operazione
     */
    async delete(id, tenantId, userId) {
        try {
            const existing = await prisma.templateCampoVisita.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!existing) {
                throw new Error('Campo non trovato o non autorizzato');
            }

            await prisma.templateCampoVisita.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            logger.info({ campoId: id, userId }, 'Template campo visita eliminato (soft delete)');

            return true;
        } catch (error) {
            logger.error({ error: error.message, id }, 'Errore eliminazione template campo visita');
            throw error;
        }
    },

    /**
     * Riordina i campi di una prestazione
     * @param {string} prestazioneId - ID prestazione
     * @param {Array<{id: string, ordine: number}>} ordini - Nuovi ordini
     * @param {string} tenantId - ID tenant
     * @param {string} userId - ID utente
     * @returns {Promise<Array>} Campi riordinati
     */
    async reorder(prestazioneId, ordini, tenantId, userId) {
        try {
            // Verifica prestazione
            const prestazione = await prisma.prestazione.findFirst({
                where: {
                    id: prestazioneId,
                    tenantId,
                    deletedAt: null
                }
            });

            if (!prestazione) {
                throw new Error('Prestazione non trovata o non autorizzata');
            }

            // Esegui aggiornamenti in transazione
            await prisma.$transaction(
                ordini.map(({ id, ordine }) =>
                    prisma.templateCampoVisita.update({
                        where: { id },
                        data: { ordine }
                    })
                )
            );

            logger.info({ prestazioneId, userId, count: ordini.length }, 'Campi riordinati');

            // Recupera campi aggiornati
            return this.getByPrestazione(prestazioneId, tenantId);
        } catch (error) {
            logger.error({ error: error.message, prestazioneId }, 'Errore riordinamento campi');
            throw error;
        }
    },

    /**
     * Duplica tutti i campi di una prestazione su un'altra
     * @param {string} sourcePrestazioneId - ID prestazione sorgente
     * @param {string} targetPrestazioneId - ID prestazione destinazione
     * @param {string} tenantId - ID tenant
     * @param {string} userId - ID utente
     * @returns {Promise<Array>} Campi duplicati
     */
    async duplicateTemplate(sourcePrestazioneId, targetPrestazioneId, tenantId, userId) {
        try {
            // Verifica prestazioni
            const [sourcePrestazione, targetPrestazione] = await Promise.all([
                prisma.prestazione.findFirst({
                    where: { id: sourcePrestazioneId, tenantId, deletedAt: null }
                }),
                prisma.prestazione.findFirst({
                    where: { id: targetPrestazioneId, tenantId, deletedAt: null }
                })
            ]);

            if (!sourcePrestazione) {
                throw new Error('Prestazione sorgente non trovata');
            }
            if (!targetPrestazione) {
                throw new Error('Prestazione destinazione non trovata');
            }

            // Recupera campi sorgente
            const sourceCampi = await prisma.templateCampoVisita.findMany({
                where: {
                    prestazioneId: sourcePrestazioneId,
                    tenantId,
                    deletedAt: null,
                    attivo: true
                },
                orderBy: { ordine: 'asc' }
            });

            if (sourceCampi.length === 0) {
                throw new Error('La prestazione sorgente non ha campi da duplicare');
            }

            // Verifica che target non abbia già campi con stessi nomi
            const existingNames = await prisma.templateCampoVisita.findMany({
                where: {
                    prestazioneId: targetPrestazioneId,
                    deletedAt: null
                },
                select: { nome: true }
            });
            const existingNameSet = new Set(existingNames.map(c => c.nome));

            // Duplica campi
            const duplicatedCampi = await prisma.$transaction(
                sourceCampi
                    .filter(campo => !existingNameSet.has(campo.nome))
                    .map((campo, index) =>
                        prisma.templateCampoVisita.create({
                            data: {
                                tenantId,
                                prestazioneId: targetPrestazioneId,
                                nome: campo.nome,
                                etichetta: campo.etichetta,
                                tipo: campo.tipo,
                                obbligatorio: campo.obbligatorio,
                                ordine: campo.ordine,
                                opzioni: campo.opzioni,
                                valoreDefault: campo.valoreDefault,
                                validazione: campo.validazione,
                                placeholder: campo.placeholder,
                                helpText: campo.helpText,
                                attivo: true
                            }
                        })
                    )
            );

            logger.info({
                sourcePrestazioneId,
                targetPrestazioneId,
                userId,
                count: duplicatedCampi.length
            }, 'Template campi duplicati');

            return this.getByPrestazione(targetPrestazioneId, tenantId);
        } catch (error) {
            logger.error({ error: error.message, sourcePrestazioneId, targetPrestazioneId }, 'Errore duplicazione template');
            throw error;
        }
    },

    /**
     * Crea campi in bulk per una prestazione
     * @param {string} prestazioneId - ID prestazione
     * @param {Array<Object>} campi - Array di campi da creare
     * @param {string} tenantId - ID tenant
     * @param {string} userId - ID utente
     * @returns {Promise<Array>} Campi creati
     */
    async bulkCreate(prestazioneId, campi, tenantId, userId) {
        try {
            // Verifica prestazione
            const prestazione = await prisma.prestazione.findFirst({
                where: { id: prestazioneId, tenantId, deletedAt: null }
            });

            if (!prestazione) {
                throw new Error('Prestazione non trovata o non autorizzata');
            }

            // Recupera ultimo ordine
            const maxOrdine = await prisma.templateCampoVisita.aggregate({
                where: {
                    prestazioneId,
                    deletedAt: null
                },
                _max: { ordine: true }
            });
            let nextOrdine = (maxOrdine._max.ordine || 0) + 1;

            // Valida e prepara campi
            const campiToCreate = campi.map((campo, index) => {
                // Valida tipo
                if (campo.tipo && !Object.values(TIPO_CAMPO).includes(campo.tipo)) {
                    throw new Error(`Tipo campo non valido: ${campo.tipo} (campo ${index + 1})`);
                }

                // Valida opzioni per SELECT/MULTISELECT
                if (['SELECT', 'MULTISELECT'].includes(campo.tipo)) {
                    if (!campo.opzioni || !Array.isArray(campo.opzioni) || campo.opzioni.length === 0) {
                        throw new Error(`Campo ${index + 1}: SELECT/MULTISELECT richiedono opzioni`);
                    }
                }

                return {
                    tenantId,
                    prestazioneId,
                    nome: campo.nome,
                    etichetta: campo.etichetta,
                    tipo: campo.tipo || 'TESTO',
                    obbligatorio: campo.obbligatorio || false,
                    ordine: campo.ordine !== undefined ? campo.ordine : nextOrdine++,
                    opzioni: campo.opzioni ? JSON.stringify(campo.opzioni) : null,
                    valoreDefault: campo.valoreDefault || null,
                    validazione: campo.validazione ? JSON.stringify(campo.validazione) : null,
                    placeholder: campo.placeholder || null,
                    helpText: campo.helpText || null,
                    attivo: true
                };
            });

            // Crea in transazione
            const created = await prisma.$transaction(
                campiToCreate.map(data =>
                    prisma.templateCampoVisita.create({ data })
                )
            );

            logger.info({ prestazioneId, userId, count: created.length }, 'Bulk create template campi');

            return this.getByPrestazione(prestazioneId, tenantId);
        } catch (error) {
            logger.error({ error: error.message, prestazioneId }, 'Errore bulk create campi');
            throw error;
        }
    },

    /**
     * Valida un valore in base al tipo di campo
     * @param {string} campoId - ID campo
     * @param {any} valore - Valore da validare
     * @param {string} tenantId - ID tenant
     * @returns {Promise<{valid: boolean, error?: string}>} Risultato validazione
     */
    async validateValue(campoId, valore, tenantId) {
        try {
            const campo = await prisma.templateCampoVisita.findFirst({
                where: { id: campoId, tenantId, deletedAt: null }
            });

            if (!campo) {
                return { valid: false, error: 'Campo non trovato' };
            }

            // Campo obbligatorio
            if (campo.obbligatorio && (valore === null || valore === undefined || valore === '')) {
                return { valid: false, error: `Il campo "${campo.etichetta}" è obbligatorio` };
            }

            // Se valore vuoto e non obbligatorio, ok
            if (valore === null || valore === undefined || valore === '') {
                return { valid: true };
            }

            // Validazione per tipo
            switch (campo.tipo) {
                case 'NUMERO':
                    if (isNaN(parseInt(valore))) {
                        return { valid: false, error: `"${campo.etichetta}" deve essere un numero intero` };
                    }
                    break;

                case 'DECIMALE':
                    if (isNaN(parseFloat(valore))) {
                        return { valid: false, error: `"${campo.etichetta}" deve essere un numero` };
                    }
                    break;

                case 'DATA':
                    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (!dateRegex.test(valore)) {
                        return { valid: false, error: `"${campo.etichetta}" deve essere una data valida (YYYY-MM-DD)` };
                    }
                    break;

                case 'DATETIME':
                    const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
                    if (!datetimeRegex.test(valore)) {
                        return { valid: false, error: `"${campo.etichetta}" deve essere una data/ora valida` };
                    }
                    break;

                case 'BOOLEAN':
                    if (!['true', 'false', '1', '0', true, false].includes(valore)) {
                        return { valid: false, error: `"${campo.etichetta}" deve essere true/false` };
                    }
                    break;

                case 'SELECT':
                    const opzioni = campo.opzioni ? JSON.parse(campo.opzioni) : [];
                    if (!opzioni.includes(valore)) {
                        return { valid: false, error: `"${campo.etichetta}" deve essere uno dei valori ammessi` };
                    }
                    break;

                case 'MULTISELECT':
                    const multiOpzioni = campo.opzioni ? JSON.parse(campo.opzioni) : [];
                    const valori = Array.isArray(valore) ? valore : JSON.parse(valore);
                    const invalidValues = valori.filter(v => !multiOpzioni.includes(v));
                    if (invalidValues.length > 0) {
                        return { valid: false, error: `"${campo.etichetta}" contiene valori non ammessi: ${invalidValues.join(', ')}` };
                    }
                    break;
            }

            // Validazione custom se presente
            if (campo.validazione) {
                const rules = JSON.parse(campo.validazione);

                if (rules.minLength && String(valore).length < rules.minLength) {
                    return { valid: false, error: `"${campo.etichetta}" deve avere almeno ${rules.minLength} caratteri` };
                }

                if (rules.maxLength && String(valore).length > rules.maxLength) {
                    return { valid: false, error: `"${campo.etichetta}" non può superare ${rules.maxLength} caratteri` };
                }

                if (rules.min !== undefined && parseFloat(valore) < rules.min) {
                    return { valid: false, error: `"${campo.etichetta}" deve essere almeno ${rules.min}` };
                }

                if (rules.max !== undefined && parseFloat(valore) > rules.max) {
                    return { valid: false, error: `"${campo.etichetta}" non può superare ${rules.max}` };
                }

                if (rules.pattern) {
                    const regex = new RegExp(rules.pattern);
                    if (!regex.test(String(valore))) {
                        return { valid: false, error: rules.patternMessage || `"${campo.etichetta}" non rispetta il formato richiesto` };
                    }
                }
            }

            return { valid: true };
        } catch (error) {
            logger.error({ error: error.message, campoId, valore }, 'Errore validazione valore campo');
            return { valid: false, error: 'Errore durante la validazione' };
        }
    },

    /**
     * Ottiene statistiche sui template campi
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Statistiche
     */
    async getStats(tenantId) {
        try {
            const [totalCampi, campiPerTipo, campiObbligatori, prestazioniConCampi] = await Promise.all([
                // Totale campi
                prisma.templateCampoVisita.count({
                    where: { tenantId, deletedAt: null, attivo: true }
                }),

                // Campi per tipo
                prisma.templateCampoVisita.groupBy({
                    by: ['tipo'],
                    where: { tenantId, deletedAt: null, attivo: true },
                    _count: { tipo: true }
                }),

                // Campi obbligatori
                prisma.templateCampoVisita.count({
                    where: { tenantId, deletedAt: null, attivo: true, obbligatorio: true }
                }),

                // Prestazioni con almeno un campo
                prisma.templateCampoVisita.groupBy({
                    by: ['prestazioneId'],
                    where: { tenantId, deletedAt: null, attivo: true },
                    _count: { prestazioneId: true }
                })
            ]);

            return {
                totale: totalCampi,
                perTipo: campiPerTipo.reduce((acc, item) => {
                    acc[item.tipo] = item._count.tipo;
                    return acc;
                }, {}),
                obbligatori: campiObbligatori,
                opzionali: totalCampi - campiObbligatori,
                prestazioniConTemplate: prestazioniConCampi.length,
                mediaPerPrestazione: prestazioniConCampi.length > 0
                    ? Math.round(totalCampi / prestazioniConCampi.length * 10) / 10
                    : 0
            };
        } catch (error) {
            logger.error({ error: error.message, tenantId }, 'Errore recupero statistiche campi');
            throw error;
        }
    },

    /**
     * Formatta un campo per l'output
     * @private
     * @param {Object} campo - Campo dal database
     * @returns {Object} Campo formattato
     */
    _formatCampo(campo) {
        return {
            ...campo,
            opzioni: campo.opzioni ? JSON.parse(campo.opzioni) : null,
            validazione: campo.validazione ? JSON.parse(campo.validazione) : null
        };
    }
};

export default TemplateCampoVisitaService;
