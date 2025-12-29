/**
 * TariffarioAziendaleService
 * 
 * Service per la gestione dei Tariffari Aziende - Medicina del Lavoro
 * Gestisce sia tariffari BASE (template) che AZIENDALI (specifici per company)
 * 
 * @module services/management/TariffarioAziendaleService
 */

import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Include standard per le query dei tariffari
 */
const tariffarioInclude = {
    company: {
        select: {
            id: true,
            ragioneSociale: true,
            piva: true
        }
    },
    convenzione: {
        select: {
            id: true,
            codice: true,
            nome: true
        }
    },
    tariffarioOrigine: {
        select: {
            id: true,
            codice: true,
            nome: true
        }
    },
    successore: {
        select: {
            id: true,
            codice: true,
            nome: true,
            validoDa: true
        }
    },
    predecessore: {
        select: {
            id: true,
            codice: true,
            nome: true,
            validoA: true
        }
    },
    voci: {
        where: { deletedAt: null },
        include: {
            prestazione: {
                select: {
                    id: true,
                    codice: true,
                    nome: true,
                    tipo: true,
                    prezzoBase: true,
                    durataPrevista: true
                }
            },
            fasceDipendenti: {
                where: { deletedAt: null },
                orderBy: { minDipendenti: 'asc' }
            }
        },
        orderBy: { ordine: 'asc' }
    },
    _count: {
        select: {
            voci: { where: { deletedAt: null } },
            tariffariDerivati: { where: { deletedAt: null } }
        }
    }
};

/**
 * TariffarioAziendaleService
 */
const TariffarioAziendaleService = {
    /**
     * Lista tutti i tariffari con filtri
     */
    async getAll(tenantId, filters = {}) {
        const { tipo, companyId, convenzioneId, attivo, search, page = 1, limit = 20 } = filters;

        const where = {
            tenantId,
            deletedAt: null,
            ...(tipo && { tipo }),
            ...(companyId && { companyId }),
            ...(convenzioneId && { convenzioneId }),
            ...(attivo !== undefined && { attivo }),
            ...(search && {
                OR: [
                    { codice: { contains: search, mode: 'insensitive' } },
                    { nome: { contains: search, mode: 'insensitive' } },
                    { descrizione: { contains: search, mode: 'insensitive' } }
                ]
            })
        };

        const [tariffari, total] = await Promise.all([
            prisma.tariffarioAziendale.findMany({
                where,
                include: {
                    company: { select: { id: true, ragioneSociale: true } },
                    convenzione: { select: { id: true, codice: true, nome: true } },
                    _count: {
                        select: {
                            voci: { where: { deletedAt: null } },
                            tariffariDerivati: { where: { deletedAt: null } }
                        }
                    }
                },
                orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.tariffarioAziendale.count({ where })
        ]);

        return {
            data: tariffari,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Ottiene un tariffario per ID con tutte le voci
     */
    async getById(id, tenantId) {
        const tariffario = await prisma.tariffarioAziendale.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: tariffarioInclude
        });

        if (!tariffario) {
            throw new Error('Tariffario non trovato');
        }

        return tariffario;
    },

    /**
     * Crea un nuovo tariffario
     */
    async create(data, tenantId, createdBy) {
        const {
            codice,
            nome,
            descrizione,
            tipo = 'BASE',
            companyId,
            convenzioneId,
            validoDa,
            validoA,
            attivo = true,
            note,
            voci = []
        } = data;

        // Validazione: se tipo AZIENDALE, companyId è obbligatorio
        if (tipo === 'AZIENDALE' && !companyId) {
            throw new Error('Per un tariffario aziendale è obbligatorio specificare l\'azienda');
        }

        // Verifica codice univoco
        const existing = await prisma.tariffarioAziendale.findFirst({
            where: { tenantId, codice, deletedAt: null }
        });
        if (existing) {
            throw new Error(`Esiste già un tariffario con codice "${codice}"`);
        }

        // Crea tariffario con voci
        const tariffario = await prisma.tariffarioAziendale.create({
            data: {
                codice,
                nome,
                descrizione,
                tipo,
                companyId: tipo === 'AZIENDALE' ? companyId : null,
                convenzioneId,
                validoDa: validoDa ? new Date(validoDa) : new Date(),
                validoA: validoA ? new Date(validoA) : null,
                attivo,
                note,
                tenantId,
                createdBy,
                voci: {
                    create: voci.map((voce, index) => ({
                        tipo: voce.tipo,
                        prestazioneId: voce.tipo === 'PRESTAZIONE' ? voce.prestazioneId : null,
                        nome: voce.tipo !== 'PRESTAZIONE' ? voce.nome : null,
                        descrizione: voce.descrizione,
                        prezzoBase: voce.prezzoBase,
                        ivaAliquota: voce.ivaAliquota || 22,
                        frequenza: voce.frequenza || 'UNA_TANTUM',
                        usaFasceDipendenti: voce.usaFasceDipendenti || false,
                        ordine: voce.ordine ?? index,
                        attivo: voce.attivo ?? true,
                        note: voce.note,
                        tenantId,
                        fasceDipendenti: voce.usaFasceDipendenti && voce.fasceDipendenti ? {
                            create: voce.fasceDipendenti.map(fascia => ({
                                minDipendenti: fascia.minDipendenti,
                                maxDipendenti: fascia.maxDipendenti,
                                prezzo: fascia.prezzo,
                                descrizione: fascia.descrizione,
                                tenantId
                            }))
                        } : undefined
                    }))
                }
            },
            include: tariffarioInclude
        });

        logger.info({ tariffarioId: tariffario.id, codice, tipo, tenantId }, 'Tariffario aziendale creato');
        return tariffario;
    },

    /**
     * Aggiorna un tariffario
     */
    async update(id, data, tenantId) {
        const tariffario = await prisma.tariffarioAziendale.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!tariffario) {
            throw new Error('Tariffario non trovato');
        }

        const {
            codice,
            nome,
            descrizione,
            companyId,
            convenzioneId,
            validoDa,
            validoA,
            attivo,
            note,
            successoreId
        } = data;

        // Se cambia codice, verifica unicità
        if (codice && codice !== tariffario.codice) {
            const existing = await prisma.tariffarioAziendale.findFirst({
                where: { tenantId, codice, deletedAt: null, id: { not: id } }
            });
            if (existing) {
                throw new Error(`Esiste già un tariffario con codice "${codice}"`);
            }
        }

        // Non permettere cambio tipo
        if (data.tipo && data.tipo !== tariffario.tipo) {
            throw new Error('Non è possibile cambiare il tipo di tariffario. Usa la clonazione.');
        }

        const updated = await prisma.tariffarioAziendale.update({
            where: { id },
            data: {
                ...(codice && { codice }),
                ...(nome && { nome }),
                ...(descrizione !== undefined && { descrizione }),
                ...(tariffario.tipo === 'AZIENDALE' && companyId && { companyId }),
                ...(convenzioneId !== undefined && { convenzioneId }),
                ...(validoDa && { validoDa: new Date(validoDa) }),
                ...(validoA !== undefined && { validoA: validoA ? new Date(validoA) : null }),
                ...(attivo !== undefined && { attivo }),
                ...(note !== undefined && { note }),
                ...(successoreId !== undefined && { successoreId })
            },
            include: tariffarioInclude
        });

        logger.info({ tariffarioId: id, tenantId }, 'Tariffario aziendale aggiornato');
        return updated;
    },

    /**
     * Soft delete di un tariffario
     */
    async delete(id, tenantId) {
        const tariffario = await prisma.tariffarioAziendale.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                tariffariDerivati: { where: { deletedAt: null }, select: { id: true } }
            }
        });

        if (!tariffario) {
            throw new Error('Tariffario non trovato');
        }

        // Non eliminare se ha tariffari derivati attivi
        if (tariffario.tariffariDerivati.length > 0) {
            throw new Error('Non è possibile eliminare un tariffario base con tariffari derivati attivi');
        }

        await prisma.$transaction([
            // Soft delete fasce
            prisma.fasciaDipendentiPrezzo.updateMany({
                where: {
                    voceTariffario: { tariffarioAziendaleId: id },
                    deletedAt: null
                },
                data: { deletedAt: new Date() }
            }),
            // Soft delete voci
            prisma.voceTariffario.updateMany({
                where: { tariffarioAziendaleId: id, deletedAt: null },
                data: { deletedAt: new Date() }
            }),
            // Soft delete tariffario
            prisma.tariffarioAziendale.update({
                where: { id },
                data: { deletedAt: new Date() }
            })
        ]);

        logger.info({ tariffarioId: id, tenantId }, 'Tariffario aziendale eliminato');
        return { success: true };
    },

    /**
     * Clona un tariffario base in uno aziendale per una company
     */
    async clone(id, data, tenantId, createdBy) {
        const { companyId, codice, nome, validoDa, validoA, convenzioneId } = data;

        const origine = await prisma.tariffarioAziendale.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                voci: {
                    where: { deletedAt: null },
                    include: {
                        fasceDipendenti: { where: { deletedAt: null } }
                    }
                }
            }
        });

        if (!origine) {
            throw new Error('Tariffario origine non trovato');
        }

        if (!companyId) {
            throw new Error('È necessario specificare l\'azienda per la clonazione');
        }

        // Genera codice se non fornito
        const finalCodice = codice || `${origine.codice}-${Date.now().toString(36).toUpperCase()}`;

        // Verifica codice univoco
        const existing = await prisma.tariffarioAziendale.findFirst({
            where: { tenantId, codice: finalCodice, deletedAt: null }
        });
        if (existing) {
            throw new Error(`Esiste già un tariffario con codice "${finalCodice}"`);
        }

        // Crea clone con voci
        const clone = await prisma.tariffarioAziendale.create({
            data: {
                codice: finalCodice,
                nome: nome || `${origine.nome} - Copia`,
                descrizione: origine.descrizione,
                tipo: 'AZIENDALE',
                companyId,
                tariffarioOrigineId: origine.tipo === 'BASE' ? origine.id : origine.tariffarioOrigineId,
                convenzioneId: convenzioneId || origine.convenzioneId,
                validoDa: validoDa ? new Date(validoDa) : new Date(),
                validoA: validoA ? new Date(validoA) : null,
                attivo: true,
                note: origine.note,
                tenantId,
                createdBy,
                voci: {
                    create: origine.voci.map(voce => ({
                        tipo: voce.tipo,
                        prestazioneId: voce.prestazioneId,
                        nome: voce.nome,
                        descrizione: voce.descrizione,
                        prezzoBase: voce.prezzoBase,
                        ivaAliquota: voce.ivaAliquota,
                        frequenza: voce.frequenza,
                        usaFasceDipendenti: voce.usaFasceDipendenti,
                        ordine: voce.ordine,
                        attivo: voce.attivo,
                        note: voce.note,
                        tenantId,
                        fasceDipendenti: voce.usaFasceDipendenti && voce.fasceDipendenti.length > 0 ? {
                            create: voce.fasceDipendenti.map(fascia => ({
                                minDipendenti: fascia.minDipendenti,
                                maxDipendenti: fascia.maxDipendenti,
                                prezzo: fascia.prezzo,
                                descrizione: fascia.descrizione,
                                tenantId
                            }))
                        } : undefined
                    }))
                }
            },
            include: tariffarioInclude
        });

        logger.info({
            cloneId: clone.id,
            origineId: id,
            companyId,
            tenantId
        }, 'Tariffario clonato per azienda');

        return clone;
    },

    // =============================================
    // GESTIONE VOCI TARIFFARIO
    // =============================================

    /**
     * Aggiunge una voce al tariffario
     */
    async addVoce(tariffarioId, data, tenantId) {
        const tariffario = await prisma.tariffarioAziendale.findFirst({
            where: { id: tariffarioId, tenantId, deletedAt: null }
        });

        if (!tariffario) {
            throw new Error('Tariffario non trovato');
        }

        const {
            tipo,
            prestazioneId,
            nome,
            descrizione,
            prezzoBase,
            ivaAliquota = 22,
            frequenza = 'UNA_TANTUM',
            usaFasceDipendenti = false,
            ordine,
            note,
            fasceDipendenti = []
        } = data;

        // Validazione
        if (tipo === 'PRESTAZIONE' && !prestazioneId) {
            throw new Error('Per una voce di tipo PRESTAZIONE è obbligatorio specificare la prestazione');
        }
        if (tipo !== 'PRESTAZIONE' && !nome) {
            throw new Error('Per una voce spesa è obbligatorio specificare il nome');
        }

        // Trova ordine massimo
        const maxOrdine = await prisma.voceTariffario.aggregate({
            where: { tariffarioAziendaleId: tariffarioId, deletedAt: null },
            _max: { ordine: true }
        });

        const voce = await prisma.voceTariffario.create({
            data: {
                tariffarioAziendaleId: tariffarioId,
                tipo,
                prestazioneId: tipo === 'PRESTAZIONE' ? prestazioneId : null,
                nome: tipo !== 'PRESTAZIONE' ? nome : null,
                descrizione,
                prezzoBase,
                ivaAliquota,
                frequenza,
                usaFasceDipendenti,
                ordine: ordine ?? (maxOrdine._max.ordine || 0) + 1,
                note,
                tenantId,
                fasceDipendenti: usaFasceDipendenti && fasceDipendenti.length > 0 ? {
                    create: fasceDipendenti.map(fascia => ({
                        minDipendenti: fascia.minDipendenti,
                        maxDipendenti: fascia.maxDipendenti,
                        prezzo: fascia.prezzo,
                        descrizione: fascia.descrizione,
                        tenantId
                    }))
                } : undefined
            },
            include: {
                prestazione: {
                    select: { id: true, codice: true, nome: true }
                },
                fasceDipendenti: { where: { deletedAt: null } }
            }
        });

        logger.info({ voceId: voce.id, tariffarioId, tipo, tenantId }, 'Voce tariffario aggiunta');
        return voce;
    },

    /**
     * Aggiorna una voce del tariffario
     */
    async updateVoce(voceId, data, tenantId) {
        const voce = await prisma.voceTariffario.findFirst({
            where: { id: voceId, tenantId, deletedAt: null }
        });

        if (!voce) {
            throw new Error('Voce tariffario non trovata');
        }

        const {
            prestazioneId,
            nome,
            descrizione,
            prezzoBase,
            ivaAliquota,
            frequenza,
            usaFasceDipendenti,
            ordine,
            attivo,
            note
        } = data;

        // Non permettere cambio tipo
        if (data.tipo && data.tipo !== voce.tipo) {
            throw new Error('Non è possibile cambiare il tipo di voce');
        }

        const updated = await prisma.voceTariffario.update({
            where: { id: voceId },
            data: {
                ...(voce.tipo === 'PRESTAZIONE' && prestazioneId && { prestazioneId }),
                ...(voce.tipo !== 'PRESTAZIONE' && nome && { nome }),
                ...(descrizione !== undefined && { descrizione }),
                ...(prezzoBase !== undefined && { prezzoBase }),
                ...(ivaAliquota !== undefined && { ivaAliquota }),
                ...(frequenza && { frequenza }),
                ...(usaFasceDipendenti !== undefined && { usaFasceDipendenti }),
                ...(ordine !== undefined && { ordine }),
                ...(attivo !== undefined && { attivo }),
                ...(note !== undefined && { note })
            },
            include: {
                prestazione: { select: { id: true, codice: true, nome: true } },
                fasceDipendenti: { where: { deletedAt: null } }
            }
        });

        logger.info({ voceId, tenantId }, 'Voce tariffario aggiornata');
        return updated;
    },

    /**
     * Elimina una voce del tariffario
     */
    async deleteVoce(voceId, tenantId) {
        const voce = await prisma.voceTariffario.findFirst({
            where: { id: voceId, tenantId, deletedAt: null }
        });

        if (!voce) {
            throw new Error('Voce tariffario non trovata');
        }

        await prisma.$transaction([
            prisma.fasciaDipendentiPrezzo.updateMany({
                where: { voceTariffarioId: voceId, deletedAt: null },
                data: { deletedAt: new Date() }
            }),
            prisma.voceTariffario.update({
                where: { id: voceId },
                data: { deletedAt: new Date() }
            })
        ]);

        logger.info({ voceId, tenantId }, 'Voce tariffario eliminata');
        return { success: true };
    },

    // =============================================
    // GESTIONE FASCE DIPENDENTI
    // =============================================

    /**
     * Aggiunge una fascia dipendenti a una voce
     */
    async addFascia(voceId, data, tenantId) {
        const voce = await prisma.voceTariffario.findFirst({
            where: { id: voceId, tenantId, deletedAt: null }
        });

        if (!voce) {
            throw new Error('Voce tariffario non trovata');
        }

        const { minDipendenti, maxDipendenti, prezzo, descrizione } = data;

        // Verifica sovrapposizione fasce
        const esistenti = await prisma.fasciaDipendentiPrezzo.findMany({
            where: { voceTariffarioId: voceId, deletedAt: null }
        });

        for (const fascia of esistenti) {
            const fasciaMax = fascia.maxDipendenti ?? Infinity;
            const newMax = maxDipendenti ?? Infinity;

            // Verifica sovrapposizione
            if (minDipendenti <= fasciaMax && newMax >= fascia.minDipendenti) {
                throw new Error(`La fascia ${minDipendenti}-${maxDipendenti || '∞'} si sovrappone con ${fascia.minDipendenti}-${fascia.maxDipendenti || '∞'}`);
            }
        }

        const fascia = await prisma.fasciaDipendentiPrezzo.create({
            data: {
                voceTariffarioId: voceId,
                minDipendenti,
                maxDipendenti,
                prezzo,
                descrizione,
                tenantId
            }
        });

        // Aggiorna flag usaFasceDipendenti
        await prisma.voceTariffario.update({
            where: { id: voceId },
            data: { usaFasceDipendenti: true }
        });

        logger.info({ fasciaId: fascia.id, voceId, tenantId }, 'Fascia dipendenti aggiunta');
        return fascia;
    },

    /**
     * Aggiorna una fascia dipendenti
     */
    async updateFascia(fasciaId, data, tenantId) {
        const fascia = await prisma.fasciaDipendentiPrezzo.findFirst({
            where: { id: fasciaId, tenantId, deletedAt: null }
        });

        if (!fascia) {
            throw new Error('Fascia dipendenti non trovata');
        }

        const { minDipendenti, maxDipendenti, prezzo, descrizione } = data;

        // Se cambiano i range, verifica sovrapposizione
        if (minDipendenti !== undefined || maxDipendenti !== undefined) {
            const esistenti = await prisma.fasciaDipendentiPrezzo.findMany({
                where: {
                    voceTariffarioId: fascia.voceTariffarioId,
                    deletedAt: null,
                    id: { not: fasciaId }
                }
            });

            const newMin = minDipendenti ?? fascia.minDipendenti;
            const newMax = maxDipendenti ?? fascia.maxDipendenti ?? Infinity;

            for (const f of esistenti) {
                const fMax = f.maxDipendenti ?? Infinity;
                if (newMin <= fMax && newMax >= f.minDipendenti) {
                    throw new Error(`La fascia ${newMin}-${newMax === Infinity ? '∞' : newMax} si sovrappone con ${f.minDipendenti}-${f.maxDipendenti || '∞'}`);
                }
            }
        }

        const updated = await prisma.fasciaDipendentiPrezzo.update({
            where: { id: fasciaId },
            data: {
                ...(minDipendenti !== undefined && { minDipendenti }),
                ...(maxDipendenti !== undefined && { maxDipendenti }),
                ...(prezzo !== undefined && { prezzo }),
                ...(descrizione !== undefined && { descrizione })
            }
        });

        logger.info({ fasciaId, tenantId }, 'Fascia dipendenti aggiornata');
        return updated;
    },

    /**
     * Elimina una fascia dipendenti
     */
    async deleteFascia(fasciaId, tenantId) {
        const fascia = await prisma.fasciaDipendentiPrezzo.findFirst({
            where: { id: fasciaId, tenantId, deletedAt: null }
        });

        if (!fascia) {
            throw new Error('Fascia dipendenti non trovata');
        }

        await prisma.fasciaDipendentiPrezzo.update({
            where: { id: fasciaId },
            data: { deletedAt: new Date() }
        });

        // Controlla se ci sono altre fasce
        const remaining = await prisma.fasciaDipendentiPrezzo.count({
            where: { voceTariffarioId: fascia.voceTariffarioId, deletedAt: null }
        });

        // Se non ci sono più fasce, disabilita usaFasceDipendenti
        if (remaining === 0) {
            await prisma.voceTariffario.update({
                where: { id: fascia.voceTariffarioId },
                data: { usaFasceDipendenti: false }
            });
        }

        logger.info({ fasciaId, tenantId }, 'Fascia dipendenti eliminata');
        return { success: true };
    },

    // =============================================
    // UTILITY
    // =============================================

    /**
     * Ottiene i tariffari di un'azienda
     */
    async getByCompany(companyId, tenantId) {
        return prisma.tariffarioAziendale.findMany({
            where: {
                companyId,
                tenantId,
                deletedAt: null
            },
            include: {
                convenzione: { select: { id: true, codice: true, nome: true } },
                tariffarioOrigine: { select: { id: true, codice: true, nome: true } },
                _count: {
                    select: { voci: { where: { deletedAt: null } } }
                }
            },
            orderBy: [{ attivo: 'desc' }, { validoDa: 'desc' }]
        });
    },

    /**
     * Calcola il prezzo per una voce in base al numero di dipendenti
     */
    async calcolaPrezzo(voceId, numeroDipendenti, tenantId) {
        const voce = await prisma.voceTariffario.findFirst({
            where: { id: voceId, tenantId, deletedAt: null },
            include: {
                fasceDipendenti: {
                    where: { deletedAt: null },
                    orderBy: { minDipendenti: 'asc' }
                }
            }
        });

        if (!voce) {
            throw new Error('Voce tariffario non trovata');
        }

        // Se non usa fasce, ritorna prezzoBase
        if (!voce.usaFasceDipendenti || voce.fasceDipendenti.length === 0) {
            return {
                prezzo: voce.prezzoBase,
                fascia: null,
                usaFasce: false
            };
        }

        // Trova la fascia corretta
        const fascia = voce.fasceDipendenti.find(f => {
            const max = f.maxDipendenti ?? Infinity;
            return numeroDipendenti >= f.minDipendenti && numeroDipendenti <= max;
        });

        if (!fascia) {
            // Nessuna fascia trovata, usa prezzo base
            return {
                prezzo: voce.prezzoBase,
                fascia: null,
                usaFasce: true,
                warning: `Nessuna fascia trovata per ${numeroDipendenti} dipendenti`
            };
        }

        return {
            prezzo: fascia.prezzo,
            fascia: {
                id: fascia.id,
                minDipendenti: fascia.minDipendenti,
                maxDipendenti: fascia.maxDipendenti,
                descrizione: fascia.descrizione
            },
            usaFasce: true
        };
    },

    /**
     * Ottiene le prestazioni MDL disponibili per le voci
     */
    async getPrestazioniMDL(tenantId) {
        return prisma.prestazione.findMany({
            where: {
                tenantId,
                deletedAt: null,
                tipo: 'VISITA_MEDICINA_LAVORO',
                attivo: true
            },
            select: {
                id: true,
                codice: true,
                nome: true,
                prezzoBase: true,
                durataPrevista: true
            },
            orderBy: { nome: 'asc' }
        });
    },

    /**
     * Ottiene i tariffari base disponibili per la clonazione
     */
    async getTariffariBase(tenantId) {
        return prisma.tariffarioAziendale.findMany({
            where: {
                tenantId,
                tipo: 'BASE',
                attivo: true,
                deletedAt: null
            },
            select: {
                id: true,
                codice: true,
                nome: true,
                descrizione: true,
                validoDa: true,
                validoA: true,
                _count: {
                    select: { voci: { where: { deletedAt: null } } }
                }
            },
            orderBy: { nome: 'asc' }
        });
    }
};

export default TariffarioAziendaleService;
