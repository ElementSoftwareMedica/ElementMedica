/**
 * P66 - Deadline Service
 * 
 * Gestione centralizzata delle scadenze per tutte le tipologie:
 * - Visite mediche (prossimo controllo)
 * - Formazione (attestati)
 * - Farmaci
 * - Manutenzioni strumenti
 * - Documenti
 * - Protocolli MDL
 * - Sopralluoghi
 * - Tariffari
 * - Altro
 * 
 * @module services/scadenze/DeadlineService
 * @project P66 - Sistema Scadenze Centralizzato
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';


// Categorie disponibili
export const DEADLINE_CATEGORIES = [
    'VISITA_MEDICA',
    'FORMAZIONE',
    'FARMACO',
    'MANUTENZIONE',
    'DOCUMENTO',
    'PROTOCOLLO_MDL',
    'SOPRALLUOGO',
    'TARIFFARIO',
    'ALTRO'
];

// Priorità
export const DEADLINE_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

// Stati
export const DEADLINE_STATUSES = ['ATTIVA', 'IN_PREAVVISO', 'SCADUTA', 'COMPLETATA', 'ANNULLATA'];

class DeadlineService {
    /**
     * Ottiene tutte le scadenze con filtri
     */
    async getAll(tenantId, filters = {}) {
        const {
            categoria,
            status,
            priorita,
            responsabileId,
            personId,
            companyProfileId,
            siteId,
            dataScadenzaDa,
            dataScadenzaA,
            search,
            page = 1,
            limit = 20,
            sortBy = 'dataScadenza',
            sortOrder = 'asc'
        } = filters;

        const where = {
            tenantId,
            deletedAt: null
        };

        // Filtri
        if (categoria) where.categoria = categoria;
        if (status) where.status = status;
        if (priorita) where.priorita = priorita;
        if (responsabileId) where.responsabileId = responsabileId;
        if (personId) where.personId = personId;
        if (companyProfileId) where.companyProfileId = companyProfileId;
        if (siteId) where.siteId = siteId;

        // Range date
        if (dataScadenzaDa || dataScadenzaA) {
            where.dataScadenza = {};
            if (dataScadenzaDa) where.dataScadenza.gte = new Date(dataScadenzaDa);
            if (dataScadenzaA) where.dataScadenza.lte = new Date(dataScadenzaA);
        }

        // Ricerca testuale
        if (search) {
            where.OR = [
                { titolo: { contains: search, mode: 'insensitive' } },
                { descrizione: { contains: search, mode: 'insensitive' } },
                { note: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [items, total] = await Promise.all([
            prisma.deadlineItem.findMany({
                where,
                include: {
                    responsabile: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    person: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    companyProfile: {
                        select: {
                            id: true,
                            company: { select: { ragioneSociale: true } }
                        }
                    },
                    site: {
                        select: { id: true, siteName: true }
                    },
                    farmaco: {
                        select: { id: true, nome: true, codice: true }
                    }
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.deadlineItem.count({ where })
        ]);

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Ottiene statistiche per dashboard
     */
    async getStats(tenantId) {
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);

        const tra7giorni = new Date(oggi);
        tra7giorni.setDate(tra7giorni.getDate() + 7);

        const tra30giorni = new Date(oggi);
        tra30giorni.setDate(tra30giorni.getDate() + 30);

        const [
            totali,
            scadute,
            inScadenza7gg,
            inScadenza30gg,
            perCategoria,
            perPriorita
        ] = await Promise.all([
            // Totali attive
            prisma.deadlineItem.count({
                where: { tenantId, deletedAt: null, status: { in: ['ATTIVA', 'IN_PREAVVISO'] } }
            }),
            // Scadute
            prisma.deadlineItem.count({
                where: { tenantId, deletedAt: null, status: 'SCADUTA' }
            }),
            // In scadenza 7gg
            prisma.deadlineItem.count({
                where: {
                    tenantId,
                    deletedAt: null,
                    status: { in: ['ATTIVA', 'IN_PREAVVISO'] },
                    dataScadenza: { gte: oggi, lte: tra7giorni }
                }
            }),
            // In scadenza 30gg
            prisma.deadlineItem.count({
                where: {
                    tenantId,
                    deletedAt: null,
                    status: { in: ['ATTIVA', 'IN_PREAVVISO'] },
                    dataScadenza: { gte: oggi, lte: tra30giorni }
                }
            }),
            // Per categoria
            prisma.deadlineItem.groupBy({
                by: ['categoria'],
                where: { tenantId, deletedAt: null, status: { in: ['ATTIVA', 'IN_PREAVVISO', 'SCADUTA'] } },
                _count: { id: true }
            }),
            // Per priorità
            prisma.deadlineItem.groupBy({
                by: ['priorita'],
                where: { tenantId, deletedAt: null, status: { in: ['ATTIVA', 'IN_PREAVVISO', 'SCADUTA'] } },
                _count: { id: true }
            })
        ]);

        return {
            totali,
            scadute,
            inScadenza7gg,
            inScadenza30gg,
            perCategoria: perCategoria.map(c => ({
                categoria: c.categoria,
                count: c._count.id
            })),
            perPriorita: perPriorita.map(p => ({
                priorita: p.priorita,
                count: p._count.id
            }))
        };
    }

    /**
     * Ottiene una scadenza per ID
     */
    async getById(id, tenantId) {
        return prisma.deadlineItem.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                responsabile: {
                    select: { id: true, firstName: true, lastName: true, gender: true }
                },
                person: {
                    select: { id: true, firstName: true, lastName: true, taxCode: true }
                },
                companyProfile: {
                    include: {
                        company: { select: { ragioneSociale: true, piva: true } }
                    }
                },
                site: true,
                farmaco: true
            }
        });
    }

    /**
     * Crea una nuova scadenza
     */
    async create(data, tenantId, createdBy) {
        // Calcola date preavviso se non fornite
        const dataScadenza = new Date(data.dataScadenza);

        let dataPreavviso1 = data.dataPreavviso1 ? new Date(data.dataPreavviso1) : null;
        let dataPreavviso2 = data.dataPreavviso2 ? new Date(data.dataPreavviso2) : null;

        // Default: 30gg e 7gg prima
        if (!dataPreavviso1) {
            dataPreavviso1 = new Date(dataScadenza);
            dataPreavviso1.setDate(dataPreavviso1.getDate() - 30);
        }
        if (!dataPreavviso2) {
            dataPreavviso2 = new Date(dataScadenza);
            dataPreavviso2.setDate(dataPreavviso2.getDate() - 7);
        }

        const deadline = await prisma.deadlineItem.create({
            data: {
                tenantId,
                categoria: data.categoria,
                priorita: data.priorita || 'NORMAL',
                status: 'ATTIVA',
                entityType: data.entityType,
                entityId: data.entityId,
                dataScadenza,
                dataPreavviso1,
                dataPreavviso2,
                responsabileId: data.responsabileId,
                personId: data.personId,
                companyProfileId: data.companyProfileId,
                siteId: data.siteId,
                titolo: data.titolo,
                descrizione: data.descrizione,
                note: data.note,
                ubicazione: data.ubicazione,
                quantita: data.quantita,
                unitaMisura: data.unitaMisura,
                lottoNumero: data.lottoNumero,
                farmacoId: data.farmacoId,
                isRicorrente: data.isRicorrente || false,
                periodicitaMesi: data.periodicitaMesi,
                createdBy
            },
            include: {
                responsabile: { select: { id: true, firstName: true, lastName: true } },
                person: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        logger.info({ deadlineId: deadline.id, categoria: data.categoria }, 'Deadline created');
        return deadline;
    }

    /**
     * Aggiorna una scadenza
     */
    async update(id, tenantId, data) {
        // Verifica ownership
        const existing = await prisma.deadlineItem.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!existing) {
            throw new Error('Scadenza non trovata');
        }

        const updateData = {};

        // Campi aggiornabili
        const allowedFields = [
            'categoria', 'priorita', 'status', 'dataScadenza', 'dataPreavviso1', 'dataPreavviso2',
            'responsabileId', 'personId', 'companyProfileId', 'siteId',
            'titolo', 'descrizione', 'note', 'ubicazione', 'quantita', 'unitaMisura',
            'lottoNumero', 'farmacoId', 'isRicorrente', 'periodicitaMesi'
        ];

        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        });

        // Converti date
        if (updateData.dataScadenza) updateData.dataScadenza = new Date(updateData.dataScadenza);
        if (updateData.dataPreavviso1) updateData.dataPreavviso1 = new Date(updateData.dataPreavviso1);
        if (updateData.dataPreavviso2) updateData.dataPreavviso2 = new Date(updateData.dataPreavviso2);

        const deadline = await prisma.deadlineItem.update({
            where: { id },
            data: updateData,
            include: {
                responsabile: { select: { id: true, firstName: true, lastName: true } },
                person: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        logger.info({ deadlineId: id }, 'Deadline updated');
        return deadline;
    }

    /**
     * Marca una scadenza come completata
     */
    async complete(id, tenantId, completatoDa, noteCompletamento) {
        const deadline = await prisma.deadlineItem.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!deadline) {
            throw new Error('Scadenza non trovata');
        }

        const updated = await prisma.deadlineItem.update({
            where: { id },
            data: {
                status: 'COMPLETATA',
                completatoAt: new Date(),
                completatoDa,
                noteCompletamento
            }
        });

        // Se ricorrente, crea la prossima occorrenza
        if (deadline.isRicorrente && deadline.periodicitaMesi) {
            const prossimaData = new Date(deadline.dataScadenza);
            prossimaData.setMonth(prossimaData.getMonth() + deadline.periodicitaMesi);

            await this.create({
                categoria: deadline.categoria,
                priorita: deadline.priorita,
                entityType: deadline.entityType,
                entityId: deadline.entityId,
                dataScadenza: prossimaData,
                responsabileId: deadline.responsabileId,
                personId: deadline.personId,
                companyProfileId: deadline.companyProfileId,
                siteId: deadline.siteId,
                titolo: deadline.titolo,
                descrizione: deadline.descrizione,
                ubicazione: deadline.ubicazione,
                farmacoId: deadline.farmacoId,
                isRicorrente: true,
                periodicitaMesi: deadline.periodicitaMesi
            }, tenantId, completatoDa);

            logger.info({ deadlineId: id, nextDate: prossimaData }, 'Created next recurring deadline');
        }

        logger.info({ deadlineId: id }, 'Deadline completed');
        return updated;
    }

    /**
     * Soft delete
     */
    async delete(id, tenantId, deletedBy, deletionReason) {
        const deadline = await prisma.deadlineItem.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!deadline) {
            throw new Error('Scadenza non trovata');
        }

        await prisma.$transaction(async (tx) => {
            // Soft delete
            await tx.deadlineItem.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    status: 'ANNULLATA'
                }
            });

            // GDPR Audit Log
            await tx.gdprAuditLog.create({
                data: {
                    personId: deletedBy,
                    action: 'DELETE',
                    resourceType: 'DeadlineItem',
                    resourceId: id,
                    tenantId,
                    dataAccessed: {
                        deletionReason,
                        deletedBy,
                        operation: 'SOFT_DELETE'
                    }
                }
            });
        });

        logger.info({ deadlineId: id }, 'Deadline deleted');
        return { success: true };
    }

    /**
     * Aggiorna stati in base alla data corrente (job schedulato)
     */
    async updateStatuses(tenantId = null) {
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);

        const where = {
            deletedAt: null,
            status: { in: ['ATTIVA', 'IN_PREAVVISO'] }
        };

        if (tenantId) where.tenantId = tenantId;

        // Marca come scadute quelle con data passata
        const scadute = await prisma.deadlineItem.updateMany({
            where: {
                ...where,
                dataScadenza: { lt: oggi }
            },
            data: { status: 'SCADUTA' }
        });

        // Marca come IN_PREAVVISO quelle nel range preavviso
        const inPreavviso = await prisma.deadlineItem.updateMany({
            where: {
                ...where,
                status: 'ATTIVA',
                OR: [
                    { dataPreavviso1: { lte: oggi }, dataScadenza: { gte: oggi } },
                    { dataPreavviso2: { lte: oggi }, dataScadenza: { gte: oggi } }
                ]
            },
            data: { status: 'IN_PREAVVISO' }
        });

        logger.info({ scadute: scadute.count, inPreavviso: inPreavviso.count }, 'Deadline statuses updated');
        return { scadute: scadute.count, inPreavviso: inPreavviso.count };
    }
}

export default new DeadlineService();
