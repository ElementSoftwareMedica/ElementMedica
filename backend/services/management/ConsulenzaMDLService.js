/**
 * ConsulenzaMDLService
 *
 * Gestione delle consulenze di Medicina del Lavoro per azienda.
 * Permette di registrare, aggiornare, rendicontare e soft-eliminare consulenze.
 *
 * @module services/management/ConsulenzaMDLService
 */

import prisma from '../../config/prisma-optimization.js';
import { logger } from '../../utils/logger.js';


const ConsulenzaMDLService = {
    /**
     * Lista consulenze per azienda
     */
    async getAll(tenantId, { companyTenantProfileId, stato, page = 1, limit = 50 } = {}) {
        const where = {
            tenantId,
            deletedAt: null,
            ...(companyTenantProfileId && { companyTenantProfileId }),
            ...(stato && { stato })
        };

        const [data, total] = await Promise.all([
            prisma.consulenzaMDL.findMany({
                where,
                include: {
                    companyTenantProfile: { select: { id: true } },
                    site: { select: { id: true, siteName: true } }
                },
                orderBy: { data: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.consulenzaMDL.count({ where })
        ]);

        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    },

    /**
     * Singola consulenza
     */
    async getById(id, tenantId) {
        const consulenza = await prisma.consulenzaMDL.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                site: { select: { id: true, siteName: true } }
            }
        });
        if (!consulenza) throw new Error('Consulenza non trovata');
        return consulenza;
    },

    /**
     * Crea una nuova consulenza
     */
    async create(data, tenantId) {
        const {
            companyTenantProfileId,
            siteId,
            professionistaId,
            data: dataConsulenza,
            durataMinuti,
            oggetto,
            note,
            importo
        } = data;

        if (!companyTenantProfileId) throw new Error('companyTenantProfileId è obbligatorio');
        if (!dataConsulenza) throw new Error('La data della consulenza è obbligatoria');
        if (!durataMinuti || durataMinuti <= 0) throw new Error('La durata in minuti deve essere > 0');
        if (!oggetto || oggetto.trim().length < 3) throw new Error('L\'oggetto della consulenza è obbligatorio (min 3 caratteri)');

        // Verifica che il company profile appartenga al tenant
        const company = await prisma.companyTenantProfile.findFirst({
            where: { id: companyTenantProfileId, tenantId, deletedAt: null }
        });
        if (!company) throw new Error('Azienda non trovata o non autorizzata');

        const consulenza = await prisma.consulenzaMDL.create({
            data: {
                companyTenantProfileId,
                ...(siteId && { siteId }),
                ...(professionistaId && { professionistaId }),
                data: new Date(dataConsulenza),
                durataMinuti: parseInt(durataMinuti),
                oggetto: oggetto.trim(),
                ...(note && { note: note.trim() }),
                ...(importo !== undefined && importo !== null && { importo }),
                stato: 'DA_RENDICONTARE',
                tenantId
            },
            include: {
                site: { select: { id: true, siteName: true } }
            }
        });

        logger.info({ id: consulenza.id, companyTenantProfileId, tenantId }, 'ConsulenzaMDL creata');
        return consulenza;
    },

    /**
     * Aggiorna una consulenza (solo se DA_RENDICONTARE)
     */
    async update(id, data, tenantId) {
        const existing = await prisma.consulenzaMDL.findFirst({
            where: { id, tenantId, deletedAt: null }
        });
        if (!existing) throw new Error('Consulenza non trovata');
        if (existing.stato !== 'DA_RENDICONTARE') {
            throw new Error('È possibile modificare solo consulenze in stato DA_RENDICONTARE');
        }

        const {
            siteId,
            professionistaId,
            data: dataConsulenza,
            durataMinuti,
            oggetto,
            note,
            importo
        } = data;

        const updated = await prisma.consulenzaMDL.update({
            where: { id },
            data: {
                ...(siteId !== undefined && { siteId: siteId || null }),
                ...(professionistaId !== undefined && { professionistaId: professionistaId || null }),
                ...(dataConsulenza && { data: new Date(dataConsulenza) }),
                ...(durataMinuti !== undefined && { durataMinuti: parseInt(durataMinuti) }),
                ...(oggetto && { oggetto: oggetto.trim() }),
                ...(note !== undefined && { note: note ? note.trim() : null }),
                ...(importo !== undefined && { importo })
            },
            include: {
                site: { select: { id: true, siteName: true } }
            }
        });

        logger.info({ id, tenantId }, 'ConsulenzaMDL aggiornata');
        return updated;
    },

    /**
     * Segna una consulenza come RENDICONTATA
     */
    async rendiconta(id, tenantId) {
        const existing = await prisma.consulenzaMDL.findFirst({
            where: { id, tenantId, deletedAt: null }
        });
        if (!existing) throw new Error('Consulenza non trovata');
        if (existing.stato !== 'DA_RENDICONTARE') {
            throw new Error('Solo le consulenze DA_RENDICONTARE possono essere rendicontate');
        }

        const updated = await prisma.consulenzaMDL.update({
            where: { id },
            data: { stato: 'RENDICONTATA' }
        });

        logger.info({ id, tenantId }, 'ConsulenzaMDL rendicontata');
        return updated;
    },

    /**
     * Annulla una consulenza
     */
    async annulla(id, tenantId) {
        const existing = await prisma.consulenzaMDL.findFirst({
            where: { id, tenantId, deletedAt: null }
        });
        if (!existing) throw new Error('Consulenza non trovata');
        if (existing.stato === 'FATTURATA') {
            throw new Error('Non è possibile annullare una consulenza già fatturata');
        }

        const updated = await prisma.consulenzaMDL.update({
            where: { id },
            data: { stato: 'ANNULLATA' }
        });

        logger.info({ id, tenantId }, 'ConsulenzaMDL annullata');
        return updated;
    },

    /**
     * Soft delete (GDPR compliant)
     */
    async delete(id, tenantId, deletionReason) {
        if (!deletionReason || deletionReason.trim().length < 10) {
            throw new Error('Il motivo di eliminazione è obbligatorio (min 10 caratteri)');
        }

        const existing = await prisma.consulenzaMDL.findFirst({
            where: { id, tenantId, deletedAt: null }
        });
        if (!existing) throw new Error('Consulenza non trovata');

        await prisma.$transaction([
            prisma.consulenzaMDL.update({
                where: { id },
                data: { deletedAt: new Date() }
            }),
            prisma.gdprAuditLog.create({
                data: {
                    resourceType: 'ConsulenzaMDL',
                    resourceId: id,
                    action: 'DELETE',
                    dataAccessed: { fields: ['id', 'oggetto', 'data', 'durataMinuti', 'importo', 'stato'], reason: deletionReason.trim() },
                    tenantId
                }
            })
        ]);

        logger.info({ id, tenantId }, 'ConsulenzaMDL eliminata (soft delete)');
    }
};

export default ConsulenzaMDLService;
