/**
 * FatturaSanitaria Service
 * Business logic for medical invoices management
 * 
 * Features:
 * - CRUD operations for medical invoices
 * - Invoice generation from visits
 * - Price calculation with discounts
 * - Payment tracking
 * - Sistema TS integration ready
 * 
 * @module services/clinical/FatturaSanitariaService
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Stati fattura possibili
 */
const STATI_FATTURA = {
    EMESSA: 'emessa',
    PAGATA: 'pagata',
    ANNULLATA: 'annullata',
    PARZIALMENTE_PAGATA: 'parzialmente_pagata'
};

/**
 * Metodi di pagamento supportati
 */
const METODI_PAGAMENTO = {
    CONTANTI: 'cash',
    CARTA: 'card',
    BONIFICO: 'transfer',
    POS: 'pos',
    ASSEGNO: 'check'
};

class FatturaSanitariaService {
    /**
     * Get all invoices with pagination and filters
     */
    static async getAll(tenantId, options = {}) {
        const {
            page = 1,
            limit = 20,
            search,
            stato,
            pazienteId,
            dataInizio,
            dataFine,
            sortBy = 'dataEmissione',
            sortOrder = 'desc'
        } = options;

        const where = {
            tenantId,
            deletedAt: null
        };

        if (search) {
            where.OR = [
                { numeroFattura: { contains: search, mode: 'insensitive' } },
                { paziente: { firstName: { contains: search, mode: 'insensitive' } } },
                { paziente: { lastName: { contains: search, mode: 'insensitive' } } }
            ];
        }

        if (stato) {
            where.stato = stato;
        }

        if (pazienteId) {
            where.pazienteId = pazienteId;
        }

        if (dataInizio || dataFine) {
            where.dataEmissione = {};
            if (dataInizio) where.dataEmissione.gte = new Date(dataInizio);
            if (dataFine) where.dataEmissione.lte = new Date(dataFine);
        }

        const [fatture, total] = await Promise.all([
            prisma.fatturaSanitaria.findMany({
                where,
                include: {
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            taxCode: true,
                            email: true,
                            phone: true
                        }
                    },
                    visita: true
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.fatturaSanitaria.count({ where })
        ]);

        return {
            data: fatture,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get single invoice by ID
     */
    static async getById(id, tenantId) {
        const fattura = await prisma.fatturaSanitaria.findFirst({
            where: {
                id,
                tenantId,
                deletedAt: null
            },
            include: {
                paziente: {
                    select: {
                        id: true,
                        nome: true,
                        cognome: true,
                        codiceFiscale: true,
                        dataNascita: true,
                        email: true,
                        telefono: true,
                        indirizzo: true
                    }
                }
            }
        });

        if (!fattura) {
            throw new Error('Invoice not found');
        }

        return fattura;
    }

    /**
     * Create new invoice
     */
    static async create(data, tenantId, userId) {
        const numero = await this.generateNumero(tenantId);

        const fattura = await prisma.fatturaSanitaria.create({
            data: {
                ...data,
                tenantId,
                numero,
                stato: STATI_FATTURA.EMESSA,
                createdBy: userId
            },
            include: {
                paziente: {
                    select: {
                        id: true,
                        nome: true,
                        cognome: true
                    }
                }
            }
        });

        logger.info('FatturaSanitaria created', {
            component: 'FatturaSanitariaService',
            action: 'create',
            fatturaId: fattura.id,
            numero: fattura.numero,
            tenantId,
            userId
        });

        return fattura;
    }

    /**
     * Create invoice from visit
     */
    static async createFromVisita(visitaId, tenantId, userId) {
        // Get visit with related data
        const visita = await prisma.visita.findFirst({
            where: {
                id: visitaId,
                tenantId,
                deletedAt: null
            },
            include: {
                appuntamento: {
                    include: {
                        paziente: true,
                        prestazione: true
                    }
                }
            }
        });

        if (!visita) {
            throw new Error('Visita not found');
        }

        if (!visita.appuntamento?.paziente) {
            throw new Error('Patient not found for this visit');
        }

        // Get pricing
        const prezzo = await this.calculatePrice(
            visita.appuntamento.prestazioneId,
            visita.appuntamento.pazienteId,
            tenantId
        );

        const numero = await this.generateNumero(tenantId);

        const fattura = await prisma.fatturaSanitaria.create({
            data: {
                tenantId,
                numero,
                dataEmissione: new Date(),
                pazienteId: visita.appuntamento.pazienteId,
                visitaId,
                imponibile: prezzo.imponibile,
                aliquotaIva: prezzo.aliquotaIva,
                importoIva: prezzo.importoIva,
                totale: prezzo.totale,
                stato: STATI_FATTURA.EMESSA,
                createdBy: userId
            },
            include: {
                paziente: {
                    select: {
                        id: true,
                        nome: true,
                        cognome: true
                    }
                }
            }
        });

        logger.info('FatturaSanitaria created from visita', {
            component: 'FatturaSanitariaService',
            action: 'createFromVisita',
            fatturaId: fattura.id,
            visitaId,
            tenantId,
            userId
        });

        return fattura;
    }

    /**
     * Calculate price for a service
     * Considers patient VAT exemption (ivaEsente) and prestazione default VAT
     */
    static async calculatePrice(prestazioneId, pazienteId, tenantId) {
        // Get base price from prestazione
        const prestazione = await prisma.prestazione.findFirst({
            where: {
                id: prestazioneId,
                tenantId,
                deletedAt: null
            }
        });

        if (!prestazione) {
            throw new Error('Prestazione not found');
        }

        // Get patient data including VAT exemption status
        const paziente = await prisma.person.findFirst({
            where: { id: pazienteId, tenantId },
            select: {
                id: true,
                ivaEsente: true,
                motivoEsenzione: true
            }
        });

        let imponibile = prestazione.prezzo || 0;
        let sconto = 0;

        // Determine VAT rate:
        // 1. If patient is VAT exempt (ivaEsente = true), use 0%
        // 2. Otherwise, use prestazione default VAT rate
        let aliquotaIva = 0;
        let motivoEsenzioneIva = null;

        if (paziente?.ivaEsente) {
            // Patient is VAT exempt
            aliquotaIva = 0;
            motivoEsenzioneIva = paziente.motivoEsenzione || 'Esenzione IVA paziente';
            logger.info('Applying VAT exemption for patient', {
                component: 'FatturaSanitariaService',
                pazienteId,
                motivo: motivoEsenzioneIva
            });
        } else if (prestazione.aliquotaIva !== undefined && prestazione.aliquotaIva !== null) {
            // Use prestazione default VAT rate
            aliquotaIva = Number(prestazione.aliquotaIva);
        }
        // If no aliquotaIva on prestazione and patient not exempt, default to 0 (medical exempt)

        // Apply convention discount if applicable
        // TODO: Check paziente.convenzioneId when implemented

        const totaleSconto = imponibile * (sconto / 100);
        const imponibileNetto = imponibile - totaleSconto;
        const importoIva = imponibileNetto * (aliquotaIva / 100);
        const totale = imponibileNetto + importoIva;

        return {
            imponibile: Number(imponibileNetto.toFixed(2)),
            aliquotaIva: Number(aliquotaIva.toFixed(2)),
            importoIva: Number(importoIva.toFixed(2)),
            totale: Number(totale.toFixed(2)),
            sconto: Number(sconto.toFixed(2)),
            motivoEsenzioneIva
        };
    }

    /**
     * Update invoice
     */
    static async update(id, data, tenantId, userId) {
        const existing = await this.getById(id, tenantId);

        if (existing.stato === STATI_FATTURA.PAGATA) {
            throw new Error('Cannot modify paid invoice');
        }

        if (existing.stato === STATI_FATTURA.ANNULLATA) {
            throw new Error('Cannot modify cancelled invoice');
        }

        // Don't allow changing numero
        delete data.numero;

        const fattura = await prisma.fatturaSanitaria.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date()
            },
            include: {
                paziente: {
                    select: {
                        id: true,
                        nome: true,
                        cognome: true
                    }
                }
            }
        });

        logger.info('FatturaSanitaria updated', {
            component: 'FatturaSanitariaService',
            action: 'update',
            fatturaId: id,
            tenantId,
            userId
        });

        return fattura;
    }

    /**
     * Register payment
     */
    static async registerPayment(id, paymentData, tenantId, userId) {
        const fattura = await this.getById(id, tenantId);

        if (fattura.stato === STATI_FATTURA.PAGATA) {
            throw new Error('Invoice already paid');
        }

        if (fattura.stato === STATI_FATTURA.ANNULLATA) {
            throw new Error('Cannot pay cancelled invoice');
        }

        const updated = await prisma.fatturaSanitaria.update({
            where: { id },
            data: {
                stato: STATI_FATTURA.PAGATA,
                metodoPagamento: paymentData.metodoPagamento,
                dataPagamento: new Date(),
                note: paymentData.note || fattura.note
            }
        });

        logger.info('FatturaSanitaria payment registered', {
            component: 'FatturaSanitariaService',
            action: 'registerPayment',
            fatturaId: id,
            metodoPagamento: paymentData.metodoPagamento,
            importo: fattura.totale,
            tenantId,
            userId
        });

        return updated;
    }

    /**
     * Cancel invoice
     */
    static async cancel(id, motivo, tenantId, userId) {
        const fattura = await this.getById(id, tenantId);

        if (fattura.stato === STATI_FATTURA.PAGATA) {
            throw new Error('Cannot cancel paid invoice');
        }

        const updated = await prisma.fatturaSanitaria.update({
            where: { id },
            data: {
                stato: STATI_FATTURA.ANNULLATA,
                note: motivo ? `${fattura.note || ''}\nAnnullata: ${motivo}`.trim() : fattura.note
            }
        });

        logger.info('FatturaSanitaria cancelled', {
            component: 'FatturaSanitariaService',
            action: 'cancel',
            fatturaId: id,
            motivo,
            tenantId,
            userId
        });

        return updated;
    }

    /**
     * Soft delete invoice
     */
    static async softDelete(id, tenantId, userId) {
        const fattura = await this.getById(id, tenantId);

        if (fattura.stato === STATI_FATTURA.PAGATA) {
            throw new Error('Cannot delete paid invoice');
        }

        await prisma.fatturaSanitaria.update({
            where: { id },
            data: {
                deletedAt: new Date()
            }
        });

        logger.info('FatturaSanitaria soft deleted', {
            component: 'FatturaSanitariaService',
            action: 'softDelete',
            fatturaId: id,
            tenantId,
            userId
        });

        return { success: true };
    }

    /**
     * Generate unique invoice number
     */
    static async generateNumero(tenantId) {
        const year = new Date().getFullYear();
        const prefix = `FS${year}`;

        // Get last invoice number for this year
        const lastFattura = await prisma.fatturaSanitaria.findFirst({
            where: {
                tenantId,
                numero: { startsWith: prefix }
            },
            orderBy: { numero: 'desc' }
        });

        let sequence = 1;
        if (lastFattura) {
            const lastNum = parseInt(lastFattura.numero.replace(prefix, ''), 10);
            if (!isNaN(lastNum)) {
                sequence = lastNum + 1;
            }
        }

        return `${prefix}${String(sequence).padStart(5, '0')}`;
    }

    /**
     * Get financial statistics
     */
    static async getStats(tenantId, options = {}) {
        const { dataInizio, dataFine, medicoId } = options;

        const where = {
            tenantId,
            deletedAt: null
        };

        if (dataInizio || dataFine) {
            where.dataEmissione = {};
            if (dataInizio) where.dataEmissione.gte = new Date(dataInizio);
            if (dataFine) where.dataEmissione.lte = new Date(dataFine);
        }

        // Total invoices stats
        const totals = await prisma.fatturaSanitaria.aggregate({
            where,
            _sum: {
                totale: true,
                importoIva: true,
                imponibile: true
            },
            _count: {
                id: true
            }
        });

        // Stats by state
        const byStato = await prisma.fatturaSanitaria.groupBy({
            by: ['stato'],
            where,
            _sum: { totale: true },
            _count: { id: true }
        });

        // Stats by payment method
        const byMetodo = await prisma.fatturaSanitaria.groupBy({
            by: ['metodoPagamento'],
            where: {
                ...where,
                stato: STATI_FATTURA.PAGATA,
                metodoPagamento: { not: null }
            },
            _sum: { totale: true },
            _count: { id: true }
        });

        // Monthly trend (last 12 months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const monthlyStats = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "dataEmissione") as mese,
        SUM(totale) as totale,
        COUNT(id) as count
      FROM fatture_sanitarie
      WHERE "tenantId" = ${tenantId}
        AND "deletedAt" IS NULL
        AND "dataEmissione" >= ${twelveMonthsAgo}
      GROUP BY DATE_TRUNC('month', "dataEmissione")
      ORDER BY mese ASC
    `;

        return {
            totale: {
                fatturato: Number(totals._sum.totale || 0),
                imponibile: Number(totals._sum.imponibile || 0),
                iva: Number(totals._sum.importoIva || 0),
                count: totals._count.id || 0
            },
            perStato: byStato.map(s => ({
                stato: s.stato,
                totale: Number(s._sum.totale || 0),
                count: s._count.id
            })),
            perMetodoPagamento: byMetodo.map(m => ({
                metodo: m.metodoPagamento,
                totale: Number(m._sum.totale || 0),
                count: m._count.id
            })),
            trend: monthlyStats
        };
    }

    /**
     * Get invoices for a patient
     */
    static async getByPaziente(pazienteId, tenantId, options = {}) {
        const { page = 1, limit = 20 } = options;

        const where = {
            tenantId,
            pazienteId,
            deletedAt: null
        };

        const [fatture, total] = await Promise.all([
            prisma.fatturaSanitaria.findMany({
                where,
                orderBy: { dataEmissione: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.fatturaSanitaria.count({ where })
        ]);

        return {
            data: fatture,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get detailed report by prestazione (service type)
     */
    static async getReportByPrestazione(tenantId, options = {}) {
        const { dataInizio, dataFine } = options;

        const whereClause = dataInizio && dataFine
            ? `AND "dataEmissione" >= '${dataInizio}'::timestamp AND "dataEmissione" <= '${dataFine}'::timestamp`
            : '';

        const report = await prisma.$queryRaw`
      SELECT 
        COALESCE(v."prestazioneId", 'direct') as "prestazioneId",
        COALESCE(p.nome, 'Fatturazione Diretta') as "prestazioneName",
        COUNT(DISTINCT f.id) as "countFatture",
        SUM(f.totale) as totale,
        SUM(f.imponibile) as imponibile,
        SUM(f."importoIva") as iva,
        AVG(f.totale) as "mediaFattura"
      FROM fatture_sanitarie f
      LEFT JOIN visite v ON f."visitaId" = v.id
      LEFT JOIN prestazioni p ON v."prestazioneId" = p.id
      WHERE f."tenantId" = ${tenantId}
        AND f."deletedAt" IS NULL
        ${whereClause ? prisma.$queryRawUnsafe(whereClause) : prisma.$queryRaw``}
      GROUP BY COALESCE(v."prestazioneId", 'direct'), COALESCE(p.nome, 'Fatturazione Diretta')
      ORDER BY totale DESC
    `;

        return report.map(r => ({
            prestazioneId: r.prestazioneId,
            prestazioneName: r.prestazioneName,
            countFatture: Number(r.countFatture),
            totale: Number(r.totale || 0),
            imponibile: Number(r.imponibile || 0),
            iva: Number(r.iva || 0),
            mediaFattura: Number(r.mediaFattura || 0)
        }));
    }

    /**
     * Get detailed report by medico
     */
    static async getReportByMedico(tenantId, options = {}) {
        const { dataInizio, dataFine } = options;

        const where = {
            tenantId,
            deletedAt: null,
            visita: { isNot: null }
        };

        if (dataInizio || dataFine) {
            where.dataEmissione = {};
            if (dataInizio) where.dataEmissione.gte = new Date(dataInizio);
            if (dataFine) where.dataEmissione.lte = new Date(dataFine);
        }

        // Get fatture with medico info through visita
        const fatture = await prisma.fatturaSanitaria.findMany({
            where,
            include: {
                visita: {
                    include: {
                        medico: {
                            select: { id: true, nome: true, cognome: true }
                        }
                    }
                }
            }
        });

        // Aggregate by medico
        const medicoStats = {};
        fatture.forEach(f => {
            if (f.visita?.medico) {
                const medicoId = f.visita.medico.id;
                if (!medicoStats[medicoId]) {
                    medicoStats[medicoId] = {
                        medicoId,
                        medicoName: `${f.visita.medico.cognome} ${f.visita.medico.nome}`,
                        countFatture: 0,
                        totale: 0,
                        imponibile: 0,
                        iva: 0,
                        pagati: 0,
                        pendenti: 0
                    };
                }
                medicoStats[medicoId].countFatture++;
                medicoStats[medicoId].totale += Number(f.totale || 0);
                medicoStats[medicoId].imponibile += Number(f.imponibile || 0);
                medicoStats[medicoId].iva += Number(f.importoIva || 0);
                if (f.stato === STATI_FATTURA.PAGATA) {
                    medicoStats[medicoId].pagati += Number(f.totale || 0);
                } else if (f.stato === STATI_FATTURA.EMESSA) {
                    medicoStats[medicoId].pendenti += Number(f.totale || 0);
                }
            }
        });

        return Object.values(medicoStats).sort((a, b) => b.totale - a.totale);
    }

    /**
     * Get daily report for a date range
     */
    static async getDailyReport(tenantId, options = {}) {
        const { dataInizio, dataFine } = options;

        const where = {
            tenantId,
            deletedAt: null
        };

        if (dataInizio || dataFine) {
            where.dataEmissione = {};
            if (dataInizio) where.dataEmissione.gte = new Date(dataInizio);
            if (dataFine) where.dataEmissione.lte = new Date(dataFine);
        }

        const dailyStats = await prisma.$queryRaw`
      SELECT 
        DATE("dataEmissione") as data,
        COUNT(*) as "countFatture",
        SUM(totale) as totale,
        SUM(CASE WHEN stato = 'pagata' THEN totale ELSE 0 END) as incassato,
        SUM(CASE WHEN stato = 'emessa' THEN totale ELSE 0 END) as pendente
      FROM fatture_sanitarie
      WHERE "tenantId" = ${tenantId}
        AND "deletedAt" IS NULL
        ${options.dataInizio ? prisma.$queryRaw`AND "dataEmissione" >= ${new Date(options.dataInizio)}` : prisma.$queryRaw``}
        ${options.dataFine ? prisma.$queryRaw`AND "dataEmissione" <= ${new Date(options.dataFine)}` : prisma.$queryRaw``}
      GROUP BY DATE("dataEmissione")
      ORDER BY data DESC
    `;

        return dailyStats.map(d => ({
            data: d.data,
            countFatture: Number(d.countFatture),
            totale: Number(d.totale || 0),
            incassato: Number(d.incassato || 0),
            pendente: Number(d.pendente || 0)
        }));
    }

    /**
     * Export fatture to CSV format
     */
    static async exportToCSV(tenantId, options = {}) {
        const { dataInizio, dataFine, stato } = options;

        const where = {
            tenantId,
            deletedAt: null
        };

        if (stato) where.stato = stato;
        if (dataInizio || dataFine) {
            where.dataEmissione = {};
            if (dataInizio) where.dataEmissione.gte = new Date(dataInizio);
            if (dataFine) where.dataEmissione.lte = new Date(dataFine);
        }

        const fatture = await prisma.fatturaSanitaria.findMany({
            where,
            include: {
                paziente: {
                    select: { nome: true, cognome: true, codiceFiscale: true }
                }
            },
            orderBy: { dataEmissione: 'desc' }
        });

        // Generate CSV
        const headers = [
            'Numero',
            'Data Emissione',
            'Data Pagamento',
            'Paziente',
            'Codice Fiscale',
            'Imponibile',
            'IVA',
            'Totale',
            'Stato',
            'Metodo Pagamento',
            'Note'
        ];

        const rows = fatture.map(f => [
            f.numero,
            f.dataEmissione ? new Date(f.dataEmissione).toLocaleDateString('it-IT') : '',
            f.dataPagamento ? new Date(f.dataPagamento).toLocaleDateString('it-IT') : '',
            f.paziente ? `${f.paziente.cognome} ${f.paziente.nome}` : '',
            f.paziente?.codiceFiscale || '',
            Number(f.imponibile || 0).toFixed(2),
            Number(f.importoIva || 0).toFixed(2),
            Number(f.totale || 0).toFixed(2),
            f.stato,
            f.metodoPagamento || '',
            (f.note || '').replace(/[\n\r]/g, ' ')
        ]);

        const csv = [
            headers.join(';'),
            ...rows.map(r => r.join(';'))
        ].join('\n');

        return {
            csv,
            filename: `fatture_${dataInizio || 'all'}_${dataFine || 'all'}.csv`,
            count: fatture.length
        };
    }

    /**
     * Get comparison stats between two periods
     */
    static async getComparison(tenantId, options = {}) {
        const { periodoCorrente, periodoPrecedente } = options;

        const [statsCorrente, statsPrecedente] = await Promise.all([
            this.getStats(tenantId, periodoCorrente),
            this.getStats(tenantId, periodoPrecedente)
        ]);

        const calcVariation = (current, previous) => {
            if (!previous || previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous * 100).toFixed(1);
        };

        return {
            corrente: statsCorrente,
            precedente: statsPrecedente,
            variazioni: {
                fatturato: calcVariation(statsCorrente.totale.fatturato, statsPrecedente.totale.fatturato),
                count: calcVariation(statsCorrente.totale.count, statsPrecedente.totale.count),
                mediaFattura: calcVariation(
                    statsCorrente.totale.count > 0 ? statsCorrente.totale.fatturato / statsCorrente.totale.count : 0,
                    statsPrecedente.totale.count > 0 ? statsPrecedente.totale.fatturato / statsPrecedente.totale.count : 0
                )
            }
        };
    }
}

export default FatturaSanitariaService;
export { STATI_FATTURA, METODI_PAGAMENTO };
