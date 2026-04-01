/**
 * Branch-Aware Base Service
 * 
 * Progetto 45 - Ristrutturazione Tenant per Commercializzazione
 * 
 * Questo servizio base fornisce metodi CRUD standard con supporto automatico per:
 * - Multi-tenancy (filtro per tenantId)
 * - Branch filtering (filtro per branchType)
 * - Soft delete (filtro per deletedAt)
 * - Audit logging (GDPR compliance)
 * 
 * @module services/BranchAwareService
 * @version 1.0.0
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import {
    BRANCH_CONFIG,
    BRANCH_TYPES,
    buildWhereClause,
    getBranchFilter,
    isBranchSpecificEntity,
    getDefaultBranchForEntity,
} from '../utils/branchHelper.js';

/**
 * Classe base per servizi branch-aware
 * 
 * @example
 * class PrestazioneService extends BranchAwareService {
 *   constructor() {
 *     super('prestazione', 'MEDICA');
 *   }
 * }
 */
export class BranchAwareService {
    /**
     * @param {string} entityName - Nome dell'entità Prisma (es. 'prestazione', 'course')
     * @param {string} defaultBranch - Branch di default per questa entità ('MEDICA' o 'FORMAZIONE')
     * @param {Object} options - Opzioni aggiuntive
     * @param {boolean} options.trackBranch - Se true, il branch viene tracciato ma non filtrato
     * @param {boolean} options.mixedBranch - Se true, l'entità può contenere più branch
     */
    constructor(entityName, defaultBranch = null, options = {}) {
        this.entityName = entityName;
        this.defaultBranch = defaultBranch || getDefaultBranchForEntity(entityName);
        this.trackBranch = options.trackBranch || false;
        this.mixedBranch = options.mixedBranch || false;
        this.isBranchSpecific = isBranchSpecificEntity(entityName);

        // Verifica che l'entità esista in Prisma
        if (!prisma[entityName]) {
            throw new Error(`Entity "${entityName}" not found in Prisma client`);
        }

        this.model = prisma[entityName];
    }

    /**
     * Costruisce il filtro where base per query
     * Include tenantId, branchType (se applicabile), deletedAt
     * 
     * @param {Object} req - Express request object
     * @param {Object} additionalFilters - Filtri aggiuntivi
     * @returns {Object} Prisma where clause
     */
    buildBaseFilter(req, additionalFilters = {}) {
        // P57: Tenant SEMPRE da effectiveTenantId o person.tenantId - mai da brand
        const tenantId = req.effectiveTenantId || req.person?.tenantId;
        const branchType = req.branchType;

        const baseFilter = {
            tenantId,
            deletedAt: null,
            ...additionalFilters,
        };

        // Aggiungi branchType solo se l'entità è branch-specific
        if (this.isBranchSpecific && branchType && !this.trackBranch) {
            baseFilter.branchType = branchType;
        }

        return baseFilter;
    }

    /**
     * Ottiene tutti i record per tenant/branch corrente
     * 
     * @param {Object} req - Express request object
     * @param {Object} options - Opzioni query Prisma (select, include, orderBy, etc.)
     * @returns {Promise<Array>} Lista di record
     */
    async findAll(req, options = {}) {
        const where = this.buildBaseFilter(req, options.where);

        logger.debug({
            component: 'BranchAwareService',
            entity: this.entityName,
            action: 'findAll',
            tenantId: where.tenantId,
            branchType: where.branchType,
        }, 'Executing findAll');

        return this.model.findMany({
            where,
            select: options.select,
            include: options.include,
            orderBy: options.orderBy || { createdAt: 'desc' },
            skip: options.skip,
            take: options.take,
        });
    }

    /**
     * Conta i record per tenant/branch corrente
     * 
     * @param {Object} req - Express request object
     * @param {Object} additionalFilters - Filtri aggiuntivi
     * @returns {Promise<number>} Conteggio
     */
    async count(req, additionalFilters = {}) {
        const where = this.buildBaseFilter(req, additionalFilters);

        return this.model.count({ where });
    }

    /**
     * Ottiene un record per ID (con validazione tenant/branch)
     * 
     * @param {Object} req - Express request object
     * @param {string} id - ID del record
     * @param {Object} options - Opzioni query (select, include)
     * @returns {Promise<Object|null>} Record o null
     */
    async findById(req, id, options = {}) {
        const where = this.buildBaseFilter(req, { id });

        logger.debug({
            component: 'BranchAwareService',
            entity: this.entityName,
            action: 'findById',
            id,
            tenantId: where.tenantId,
        }, 'Executing findById');

        return this.model.findFirst({
            where,
            select: options.select,
            include: options.include,
        });
    }

    /**
     * Crea un nuovo record con tenant/branch corrente
     * 
     * @param {Object} req - Express request object
     * @param {Object} data - Dati del record
     * @param {Object} options - Opzioni (select, include)
     * @returns {Promise<Object>} Record creato
     */
    async create(req, data, options = {}) {
        // P57: Tenant SEMPRE da effectiveTenantId o person.tenantId - mai da brand
        const tenantId = req.effectiveTenantId || req.person?.tenantId;
        const branchType = req.branchType || this.defaultBranch;

        // Prepara dati con tenant e branch
        const createData = {
            ...data,
            tenantId,
        };

        // Aggiungi branchType se applicabile
        if (this.isBranchSpecific && !this.trackBranch) {
            createData.branchType = branchType;
        }

        logger.info({
            component: 'BranchAwareService',
            entity: this.entityName,
            action: 'create',
            tenantId,
            branchType,
            personId: req.person?.id,
        }, `Creating new ${this.entityName}`);

        return this.model.create({
            data: createData,
            select: options.select,
            include: options.include,
        });
    }

    /**
     * Aggiorna un record esistente (con validazione tenant/branch)
     * 
     * @param {Object} req - Express request object
     * @param {string} id - ID del record
     * @param {Object} data - Dati da aggiornare
     * @param {Object} options - Opzioni (select, include)
     * @returns {Promise<Object|null>} Record aggiornato o null se non trovato
     */
    async update(req, id, data, options = {}) {
        // Prima verifica che il record appartenga al tenant/branch corrente
        const existing = await this.findById(req, id);

        if (!existing) {
            logger.warn({
                component: 'BranchAwareService',
                entity: this.entityName,
                action: 'update',
                id,
                tenantId: req.effectiveTenantId || req.person?.tenantId,
            }, `Record not found or not accessible: ${id}`);

            return null;
        }

        logger.info({
            component: 'BranchAwareService',
            entity: this.entityName,
            action: 'update',
            id,
            personId: req.person?.id,
        }, `Updating ${this.entityName}`);

        // Rimuovi campi che non devono essere modificati
        const { tenantId, branchType, id: recordId, createdAt, ...updateData } = data;

        return this.model.update({
            where: { id },
            data: {
                ...updateData,
                updatedAt: new Date(),
            },
            select: options.select,
            include: options.include,
        });
    }

    /**
     * Soft delete di un record (con validazione tenant/branch)
     * 
     * @param {Object} req - Express request object
     * @param {string} id - ID del record
     * @returns {Promise<Object|null>} Record eliminato o null se non trovato
     */
    async softDelete(req, id) {
        // Prima verifica che il record appartenga al tenant/branch corrente
        const existing = await this.findById(req, id);

        if (!existing) {
            logger.warn({
                component: 'BranchAwareService',
                entity: this.entityName,
                action: 'softDelete',
                id,
                tenantId: req.effectiveTenantId || req.person?.tenantId,
            }, `Record not found or not accessible: ${id}`);

            return null;
        }

        logger.info({
            component: 'BranchAwareService',
            entity: this.entityName,
            action: 'softDelete',
            id,
            personId: req.person?.id,
        }, `Soft deleting ${this.entityName}`);

        return this.model.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    /**
     * Query paginata con supporto per search, sort e filter
     * 
     * @param {Object} req - Express request object
     * @param {Object} queryParams - Parametri query
     * @param {number} queryParams.page - Pagina (default 1)
     * @param {number} queryParams.limit - Record per pagina (default 20, max 100)
     * @param {string} queryParams.search - Termine di ricerca
     * @param {string} queryParams.sortBy - Campo per ordinamento
     * @param {string} queryParams.sortOrder - Direzione (asc/desc)
     * @param {string[]} queryParams.searchFields - Campi su cui cercare
     * @param {Object} options - Opzioni aggiuntive (select, include)
     * @returns {Promise<Object>} { data, pagination, meta }
     */
    async paginate(req, queryParams = {}, options = {}) {
        const {
            page = 1,
            limit = 20,
            search = '',
            sortBy = 'createdAt',
            sortOrder = 'desc',
            searchFields = ['name', 'description', 'codice'],
        } = queryParams;

        // Validazione limiti
        const safePage = Math.max(1, parseInt(page, 10) || 1);
        const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (safePage - 1) * safeLimit;

        // Build base filter
        const baseWhere = this.buildBaseFilter(req, options.where);

        // Add search filter if provided
        if (search && search.trim()) {
            const searchTerm = search.trim();
            const searchConditions = searchFields
                .filter(field => field) // Rimuovi campi vuoti/null
                .map(field => ({
                    [field]: { contains: searchTerm, mode: 'insensitive' },
                }));

            if (searchConditions.length > 0) {
                baseWhere.OR = searchConditions;
            }
        }

        // Execute count and findMany in parallel
        const [total, data] = await Promise.all([
            this.model.count({ where: baseWhere }),
            this.model.findMany({
                where: baseWhere,
                select: options.select,
                include: options.include,
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: safeLimit,
            }),
        ]);

        const totalPages = Math.ceil(total / safeLimit);

        return {
            data,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages,
                hasNext: safePage < totalPages,
                hasPrev: safePage > 1,
            },
            meta: {
                entity: this.entityName,
                branchType: baseWhere.branchType || null,
                tenantId: baseWhere.tenantId,
            },
        };
    }

    /**
     * Trova record con query personalizzata (per casi complessi)
     * 
     * @param {Object} req - Express request object
     * @param {Object} customWhere - Filtri personalizzati (saranno uniti ai filtri base)
     * @param {Object} options - Opzioni Prisma
     * @returns {Promise<Array>} Lista di record
     */
    async findWhere(req, customWhere = {}, options = {}) {
        const baseWhere = this.buildBaseFilter(req, customWhere);

        return this.model.findMany({
            where: baseWhere,
            select: options.select,
            include: options.include,
            orderBy: options.orderBy,
            skip: options.skip,
            take: options.take,
        });
    }

    /**
     * Trova il primo record che corrisponde ai criteri
     * 
     * @param {Object} req - Express request object
     * @param {Object} customWhere - Filtri personalizzati
     * @param {Object} options - Opzioni Prisma
     * @returns {Promise<Object|null>} Record o null
     */
    async findFirst(req, customWhere = {}, options = {}) {
        const baseWhere = this.buildBaseFilter(req, customWhere);

        return this.model.findFirst({
            where: baseWhere,
            select: options.select,
            include: options.include,
            orderBy: options.orderBy,
        });
    }

    /**
     * Aggiorna o crea un record (upsert)
     * 
     * @param {Object} req - Express request object
     * @param {Object} where - Condizione di unicità
     * @param {Object} create - Dati per creazione
     * @param {Object} update - Dati per aggiornamento
     * @param {Object} options - Opzioni Prisma
     * @returns {Promise<Object>} Record creato o aggiornato
     */
    async upsert(req, where, create, update, options = {}) {
        // P57: Tenant SEMPRE da effectiveTenantId o person.tenantId - mai da brand
        const tenantId = req.effectiveTenantId || req.person?.tenantId;
        const branchType = req.branchType || this.defaultBranch;

        // Aggiungi tenant e branch ai dati di creazione
        const createData = {
            ...create,
            tenantId,
        };

        if (this.isBranchSpecific && !this.trackBranch) {
            createData.branchType = branchType;
        }

        // Rimuovi campi immutabili dall'update
        const { tenantId: tid, branchType: bt, id, createdAt, ...updateData } = update;

        return this.model.upsert({
            where,
            create: createData,
            update: updateData,
            select: options.select,
            include: options.include,
        });
    }

    /**
     * Operazione bulk update (con validazione tenant)
     * 
     * @param {Object} req - Express request object
     * @param {Object} updateData - Dati da aggiornare
     * @param {Object} additionalWhere - Filtri aggiuntivi
     * @returns {Promise<{ count: number }>} Numero di record aggiornati
     */
    async updateMany(req, updateData, additionalWhere = {}) {
        const where = this.buildBaseFilter(req, additionalWhere);

        // Rimuovi campi immutabili
        const { tenantId, branchType, id, createdAt, ...safeData } = updateData;

        logger.info({
            component: 'BranchAwareService',
            entity: this.entityName,
            action: 'updateMany',
            personId: req.person?.id,
            where,
        }, `Bulk updating ${this.entityName}`);

        return this.model.updateMany({
            where,
            data: safeData,
        });
    }
}

/**
 * Factory per creare servizi branch-aware
 * 
 * @param {string} entityName - Nome entità Prisma
 * @param {string} defaultBranch - Branch di default
 * @param {Object} options - Opzioni
 * @returns {BranchAwareService} Istanza del servizio
 */
export function createBranchAwareService(entityName, defaultBranch = null, options = {}) {
    return new BranchAwareService(entityName, defaultBranch, options);
}

export default BranchAwareService;
