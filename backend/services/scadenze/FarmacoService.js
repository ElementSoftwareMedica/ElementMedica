/**
 * P66 - Farmaco Service
 * 
 * Gestione farmaci e materiali sanitari con tracciamento scadenze e ubicazione.
 * 
 * @module services/scadenze/FarmacoService
 * @project P66 - Sistema Scadenze Centralizzato
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import DeadlineService from './DeadlineService.js';


// Forme farmaceutiche
export const FORME_FARMACEUTICHE = [
    'COMPRESSE', 'CAPSULE', 'FIALE', 'SOLUZIONE_ORALE', 'SCIROPPO',
    'CREMA', 'POMATA', 'GEL', 'COLLIRIO', 'SPRAY', 'SUPPOSTE',
    'AEROSOL', 'CEROTTO', 'ALTRO'
];

class FarmacoService {
    /**
     * Ottiene tutti i farmaci con filtri
     */
    async getAll(tenantId, filters = {}) {
        const {
            ambulatorioId,
            ubicazione,
            formaFarmaceutica,
            dataScadenzaDa,
            dataScadenzaA,
            dataInizio,
            dataFine,
            inScadenza, // boolean: mostra solo quelli in scadenza entro 30gg
            sottoScorta, // boolean: mostra solo quelli sotto quantità minima
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
        if (ambulatorioId) where.ambulatorioId = ambulatorioId;
        if (ubicazione) where.ubicazione = { contains: ubicazione, mode: 'insensitive' };
        if (formaFarmaceutica) where.formaFarmaceutica = formaFarmaceutica;

        const fromDate = dataScadenzaDa || dataInizio;
        const toDate = dataScadenzaA || dataFine;
        if (fromDate || toDate) {
            where.dataScadenza = {};
            if (fromDate) where.dataScadenza.gte = new Date(fromDate);
            if (toDate) {
                const endDate = new Date(toDate);
                endDate.setHours(23, 59, 59, 999);
                where.dataScadenza.lte = endDate;
            }
        }

        // In scadenza (entro 30gg)
        if (inScadenza) {
            const tra30gg = new Date();
            tra30gg.setDate(tra30gg.getDate() + 30);
            where.dataScadenza = {
                ...(where.dataScadenza || {}),
                lte: where.dataScadenza?.lte && where.dataScadenza.lte < tra30gg
                    ? where.dataScadenza.lte
                    : tra30gg
            };
        }

        // Sotto scorta
        if (sottoScorta) {
            where.AND = [
                { quantitaMinima: { not: null } },
                { quantitaDisponibile: { lte: prisma.farmaco.fields.quantitaMinima } }
            ];
            // Usiamo raw SQL per il confronto tra campi
        }

        // Ricerca testuale
        if (search) {
            where.OR = [
                { nome: { contains: search, mode: 'insensitive' } },
                { codice: { contains: search, mode: 'insensitive' } },
                { principioAttivo: { contains: search, mode: 'insensitive' } },
                { ubicazione: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [items, total] = await Promise.all([
            prisma.farmaco.findMany({
                where,
                include: {
                    ambulatorio: {
                        select: { id: true, nome: true, codice: true }
                    }
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.farmaco.count({ where })
        ]);

        // Aggiungi flag per sotto scorta
        const itemsWithFlags = items.map(item => ({
            ...item,
            isSottoScorta: item.quantitaMinima != null && item.quantitaDisponibile <= item.quantitaMinima,
            isInScadenza: item.dataScadenza <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            isScaduto: item.dataScadenza < new Date()
        }));

        return {
            data: itemsWithFlags,
            items: itemsWithFlags,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Ottiene statistiche farmaci
     */
    async getStats(tenantId) {
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);

        const tra30gg = new Date(oggi);
        tra30gg.setDate(tra30gg.getDate() + 30);

        const [
            totali,
            scaduti,
            inScadenza30gg,
            sottoScorta,
            perUbicazione
        ] = await Promise.all([
            // Totali
            prisma.farmaco.count({
                where: { tenantId, deletedAt: null }
            }),
            // Scaduti
            prisma.farmaco.count({
                where: { tenantId, deletedAt: null, dataScadenza: { lt: oggi } }
            }),
            // In scadenza 30gg
            prisma.farmaco.count({
                where: {
                    tenantId,
                    deletedAt: null,
                    dataScadenza: { gte: oggi, lte: tra30gg }
                }
            }),
            // Sotto scorta (raw query necessaria)
            prisma.$queryRaw`
                SELECT COUNT(*) as count FROM farmaci 
                WHERE tenant_id = ${tenantId} 
                AND deleted_at IS NULL 
                AND quantita_minima IS NOT NULL 
                AND quantita_disponibile <= quantita_minima
            `,
            // Per ubicazione
            prisma.farmaco.groupBy({
                by: ['ubicazione'],
                where: { tenantId, deletedAt: null },
                _count: { id: true }
            })
        ]);

        return {
            totali,
            scaduti,
            inScadenza30gg,
            sottoScorta: Number(sottoScorta[0]?.count || 0),
            perUbicazione: perUbicazione.map(u => ({
                ubicazione: u.ubicazione,
                count: u._count.id
            }))
        };
    }

    /**
     * Ottiene un farmaco per ID
     */
    async getById(id, tenantId) {
        return prisma.farmaco.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                ambulatorio: {
                    select: { id: true, nome: true, codice: true }
                },
                deadlines: {
                    where: { deletedAt: null, status: { in: ['ATTIVA', 'IN_PREAVVISO'] } },
                    orderBy: { dataScadenza: 'asc' },
                    take: 5
                }
            }
        });
    }

    /**
     * Crea un nuovo farmaco
     */
    async create(data, tenantId, createdBy) {
        // Verifica codice univoco
        const existing = await prisma.farmaco.findFirst({
            where: { tenantId, codice: data.codice, deletedAt: null }
        });

        if (existing) {
            throw new Error(`Esiste già un farmaco con codice ${data.codice}`);
        }

        const farmaco = await prisma.farmaco.create({
            data: {
                tenantId,
                codice: data.codice,
                nome: data.nome,
                principioAttivo: data.principioAttivo,
                formaFarmaceutica: data.formaFarmaceutica,
                dosaggio: data.dosaggio,
                ubicazione: data.ubicazione,
                ambulatorioId: data.ambulatorioId,
                quantitaDisponibile: data.quantitaDisponibile,
                unitaMisura: data.unitaMisura || 'pz',
                quantitaMinima: data.quantitaMinima,
                dataScadenza: new Date(data.dataScadenza),
                lottoNumero: data.lottoNumero,
                fornitore: data.fornitore,
                dataAcquisto: data.dataAcquisto ? new Date(data.dataAcquisto) : null,
                prezzoAcquisto: data.prezzoAcquisto,
                note: data.note,
                createdBy
            },
            include: {
                ambulatorio: { select: { id: true, nome: true } }
            }
        });

        // Crea automaticamente la scadenza nel sistema centralizzato
        await DeadlineService.create({
            categoria: 'FARMACO',
            priorita: 'NORMAL',
            entityType: 'Farmaco',
            entityId: farmaco.id,
            dataScadenza: data.dataScadenza,
            titolo: `Scadenza ${data.nome}`,
            descrizione: `Lotto: ${data.lottoNumero || 'N/D'} - Ubicazione: ${data.ubicazione}`,
            ubicazione: data.ubicazione,
            quantita: data.quantitaDisponibile,
            unitaMisura: data.unitaMisura,
            lottoNumero: data.lottoNumero,
            farmacoId: farmaco.id
        }, tenantId, createdBy);

        logger.info({ farmacoId: farmaco.id, codice: data.codice }, 'Farmaco created');
        return farmaco;
    }

    /**
     * Aggiorna un farmaco
     */
    async update(id, tenantId, data) {
        // Verifica ownership
        const existing = await prisma.farmaco.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!existing) {
            throw new Error('Farmaco non trovato');
        }

        // Se cambio codice, verifica univocità
        if (data.codice && data.codice !== existing.codice) {
            const duplicate = await prisma.farmaco.findFirst({
                where: { tenantId, codice: data.codice, deletedAt: null, id: { not: id } }
            });
            if (duplicate) {
                throw new Error(`Esiste già un farmaco con codice ${data.codice}`);
            }
        }

        const updateData = {};
        const allowedFields = [
            'codice', 'nome', 'principioAttivo', 'formaFarmaceutica', 'dosaggio',
            'ubicazione', 'ambulatorioId', 'quantitaDisponibile', 'unitaMisura',
            'quantitaMinima', 'dataScadenza', 'lottoNumero', 'fornitore',
            'dataAcquisto', 'prezzoAcquisto', 'note', 'immagineUrl'
        ];

        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        });

        // Converti date
        if (updateData.dataScadenza) updateData.dataScadenza = new Date(updateData.dataScadenza);
        if (updateData.dataAcquisto) updateData.dataAcquisto = new Date(updateData.dataAcquisto);

        const farmaco = await prisma.farmaco.update({
            where: { id },
            data: updateData,
            include: {
                ambulatorio: { select: { id: true, nome: true } }
            }
        });

        // Aggiorna anche la deadline associata se cambia la scadenza
        if (data.dataScadenza) {
            await prisma.deadlineItem.updateMany({
                where: {
                    farmacoId: id,
                    deletedAt: null,
                    status: { in: ['ATTIVA', 'IN_PREAVVISO'] }
                },
                data: {
                    dataScadenza: new Date(data.dataScadenza),
                    titolo: `Scadenza ${farmaco.nome}`,
                    ubicazione: farmaco.ubicazione,
                    lottoNumero: farmaco.lottoNumero
                }
            });
        }

        logger.info({ farmacoId: id }, 'Farmaco updated');
        return farmaco;
    }

    /**
     * Aggiorna quantità (carico/scarico)
     */
    async updateQuantita(id, tenantId, delta, motivo, operatoreId) {
        const farmaco = await prisma.farmaco.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!farmaco) {
            throw new Error('Farmaco non trovato');
        }

        const nuovaQuantita = farmaco.quantitaDisponibile + delta;
        if (nuovaQuantita < 0) {
            throw new Error('Quantità insufficiente');
        }

        const updated = await prisma.farmaco.update({
            where: { id },
            data: { quantitaDisponibile: nuovaQuantita }
        });

        // Log movimento
        logger.info({
            farmacoId: id,
            delta,
            motivo,
            operatoreId,
            quantitaPrecedente: farmaco.quantitaDisponibile,
            quantitaNuova: nuovaQuantita
        }, 'Farmaco quantity updated');

        return updated;
    }

    /**
     * Soft delete
     */
    async delete(id, tenantId, deletedBy, deletionReason) {
        const farmaco = await prisma.farmaco.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!farmaco) {
            throw new Error('Farmaco non trovato');
        }

        await prisma.$transaction(async (tx) => {
            // Soft delete farmaco
            await tx.farmaco.update({
                where: { id },
                data: { deletedAt: new Date() }
            });

            // Annulla scadenze associate
            await tx.deadlineItem.updateMany({
                where: { farmacoId: id, deletedAt: null },
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
                    resourceType: 'Farmaco',
                    resourceId: id,
                    tenantId,
                    dataAccessed: {
                        deletionReason,
                        deletedBy,
                        operation: 'SOFT_DELETE',
                        farmacoNome: farmaco.nome,
                        farmacoCodice: farmaco.codice
                    }
                }
            });
        });

        logger.info({ farmacoId: id }, 'Farmaco deleted');
        return { success: true };
    }

    /**
     * Ottiene ubicazioni disponibili (per autocomplete)
     */
    async getUbicazioni(tenantId) {
        const ubicazioni = await prisma.farmaco.findMany({
            where: { tenantId, deletedAt: null },
            select: { ubicazione: true },
            distinct: ['ubicazione'],
            orderBy: { ubicazione: 'asc' }
        });

        return ubicazioni.map(u => u.ubicazione);
    }
}

export default new FarmacoService();
