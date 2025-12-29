/**
 * Role Data Filter Middleware
 * Applica automaticamente filtri ai dati in base ai permessi dell'utente
 * 
 * @module middleware/role-data-filter
 */

import { permissionInheritanceService } from '../services/permission-inheritance.js';
import { relationResolver } from '../services/relation-resolver.js';
import logger from '../utils/logger.js';

/**
 * Estrae il nome della risorsa dal path della richiesta
 * @param {string} path - Path della richiesta
 * @returns {string|null}
 */
function extractResourceFromPath(path) {
    // Pattern: /api/v1/{resource}[/...]
    const matches = path.match(/\/api\/v\d+\/(\w+)/);
    return matches ? matches[1] : null;
}

/**
 * Converte metodo HTTP in azione permesso
 * @param {string} method - Metodo HTTP
 * @returns {string}
 */
function httpMethodToAction(method) {
    const mapping = {
        GET: 'read',
        POST: 'create',
        PUT: 'update',
        PATCH: 'update',
        DELETE: 'delete'
    };
    return mapping[method?.toUpperCase()] || 'read';
}

/**
 * Costruisce il filtro dati in base al permesso
 * @param {string} personId - ID persona
 * @param {string} tenantId - ID tenant
 * @param {object} permission - Permesso
 * @returns {Promise<object>}
 */
async function buildDataFilter(personId, tenantId, permission) {
    const baseFilter = {
        tenantId,
        deletedAt: null
    };

    switch (permission.scope) {
        case 'all':
        case 'global':
            return {
                allowed: true,
                where: baseFilter
            };

        case 'tenant':
            return {
                allowed: true,
                where: baseFilter
            };

        case 'own':
            return {
                allowed: true,
                where: {
                    ...baseFilter,
                    OR: [
                        { id: personId },
                        { personId },
                        { createdBy: personId },
                        { createdById: personId }
                    ]
                }
            };

        case 'relational':
            if (!permission.relationType) {
                logger.warn('Relational scope without relationType', { permission });
                return {
                    allowed: true,
                    where: baseFilter
                };
            }
            return await relationResolver.buildRelationalFilter(
                personId,
                tenantId,
                permission
            );

        case 'none':
            return {
                allowed: false,
                where: { id: 'BLOCKED' } // Query che non ritorna nulla
            };

        default:
            return {
                allowed: true,
                where: baseFilter
            };
    }
}

/**
 * Rimuove campi sensibili da un oggetto o array
 * @param {any} data - Dati da filtrare
 * @param {string[]} fieldsToRemove - Campi da rimuovere
 * @returns {any}
 */
function removeFields(data, fieldsToRemove) {
    if (!data || !fieldsToRemove || fieldsToRemove.length === 0) return data;

    if (Array.isArray(data)) {
        return data.map(item => removeFields(item, fieldsToRemove));
    }

    if (typeof data === 'object') {
        const filtered = { ...data };
        for (const field of fieldsToRemove) {
            delete filtered[field];
        }

        // Ricorsione per oggetti annidati
        for (const key of Object.keys(filtered)) {
            if (typeof filtered[key] === 'object' && filtered[key] !== null) {
                filtered[key] = removeFields(filtered[key], fieldsToRemove);
            }
        }

        return filtered;
    }

    return data;
}

/**
 * Middleware principale per filtraggio dati basato su ruoli
 * 
 * Aggiunge a req:
 * - dataFilter: { allowed, where, select }
 * - allowedFields: string[] | null
 * - deniedFields: string[] | null
 */
export const roleDataFilter = async (req, res, next) => {
    try {
        // Salta se non autenticato o manca info
        if (!req.person || !req.person.tenantId) {
            req.dataFilter = null;
            return next();
        }

        const resource = extractResourceFromPath(req.path);
        if (!resource) {
            req.dataFilter = null;
            return next();
        }

        const action = httpMethodToAction(req.method);

        // Risolvi permessi effettivi e verifica accesso
        const accessCheck = await permissionInheritanceService.canAccessResource(
            req.person.id,
            req.person.tenantId,
            resource,
            action
        );

        if (!accessCheck.allowed) {
            req.dataFilter = {
                allowed: false,
                reason: accessCheck.reason,
                resource,
                action
            };
            logger.debug('Access denied by role data filter', {
                personId: req.person.id,
                resource,
                action,
                reason: accessCheck.reason
            });
            return next();
        }

        const permission = accessCheck.permission;

        // Costruisci filtro in base allo scope
        req.dataFilter = await buildDataFilter(req.person.id, req.person.tenantId, permission);
        req.allowedFields = permission.allowedFields || null;
        req.deniedFields = permission.deniedFields || null;

        logger.debug('Data filter applied', {
            personId: req.person.id,
            resource,
            action,
            scope: permission.scope,
            relationType: permission.relationType || null,
            filterApplied: !!req.dataFilter
        });

        next();
    } catch (error) {
        logger.error('Error in roleDataFilter', {
            error: error.message,
            stack: error.stack,
            path: req.path,
            method: req.method
        });
        // In caso di errore, non bloccare ma non applicare filtri speciali
        req.dataFilter = null;
        next();
    }
};

/**
 * Middleware per filtrare campi dalla response
 * Da usare dopo la query per rimuovere campi sensibili
 */
export const filterResponseFields = (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (data) => {
        // Se ci sono campi negati, rimuovili dalla response
        if (req.deniedFields && Array.isArray(req.deniedFields) && req.deniedFields.length > 0) {
            data = removeFields(data, req.deniedFields);
        }
        return originalJson(data);
    };

    next();
};

/**
 * Middleware che blocca la richiesta se dataFilter.allowed è false
 */
export const enforceDataFilter = (req, res, next) => {
    if (req.dataFilter && req.dataFilter.allowed === false) {
        return res.status(403).json({
            success: false,
            error: 'Access denied',
            reason: req.dataFilter.reason || 'Insufficient permissions'
        });
    }
    next();
};

/**
 * Helper per applicare dataFilter a una query Prisma
 * @param {object} query - Query Prisma originale
 * @param {object} dataFilter - Filtro dal middleware
 * @returns {object} - Query modificata
 */
export const applyDataFilterToQuery = (query, dataFilter) => {
    if (!dataFilter || !dataFilter.where) return query;

    return {
        ...query,
        where: {
            ...query.where,
            ...dataFilter.where
        },
        ...(dataFilter.select && { select: dataFilter.select })
    };
};

export default roleDataFilter;
