/**
 * Advanced Permissions Middleware
 * Middleware per controllo permessi granulari
 * 
 * @version 2.1.0 - Uses req.person.permissions first (P52 optimization)
 */

import prisma from '../config/prisma-optimization.js';
import { RBACService } from '../services/RBACService.js';
import { matchPermission } from '../constants/permissions.js';
import logger from '../utils/logger.js';

/**
 * Middleware per controllo permessi avanzati
 * @param {string} resource - Risorsa (es. 'companies', 'employees')
 * @param {string} action - Azione (es. 'read', 'write', 'delete')
 * @param {Object} options - Opzioni aggiuntive
 * @returns {Function} Middleware function
 */
const checkAdvancedPermission = (resource, action, options = {}) => {
    return async (req, res, next) => {
        try {
            const person = req.person;

            if (!person) {
                return res.status(401).json({
                    error: 'Non autenticato',
                    code: 'UNAUTHORIZED'
                });
            }

            // Costruisci il permesso in formato resource:action
            const requiredPermission = `${resource}:${action}`;

            // P52: First check req.person.permissions (already loaded by auth middleware)
            // P65: Handle both array format (auth/middleware.js) and object format (middleware/auth.js)
            let hasPermission = false;
            if (person.permissions) {
                if (Array.isArray(person.permissions)) {
                    for (const userPerm of person.permissions) {
                        if (matchPermission(userPerm, requiredPermission)) {
                            hasPermission = true;
                            break;
                        }
                    }
                } else if (typeof person.permissions === 'object') {
                    // Object format: { 'clinica.visite:change_refertante': true, ... }
                    for (const userPerm of Object.keys(person.permissions)) {
                        if (person.permissions[userPerm] === true && matchPermission(userPerm, requiredPermission)) {
                            hasPermission = true;
                            break;
                        }
                    }
                }
            }

            // Fallback to RBACService if not found in req.person.permissions
            if (!hasPermission) {
                hasPermission = await RBACService.hasPermission(person.id, requiredPermission, null, person.tenantId || null);
            }

            if (!hasPermission) {
                logger.warn('Advanced permission denied', {
                    component: 'advanced-permissions-middleware',
                    personId: person.id,
                    resource,
                    action,
                    requiredPermission,
                    userPermissionsCount: person.permissions?.length || 0
                });

                return res.status(403).json({
                    error: 'Accesso negato',
                    reason: `Permesso ${requiredPermission} richiesto`,
                    code: 'FORBIDDEN'
                });
            }

            // Aggiungi contesto permessi alla request
            req.permissionContext = {
                allowedFields: ['*'],
                scope: 'authorized',
                resource,
                action
            };

            next();
        } catch (error) {
            logger.error('Error in advanced permissions middleware', {
                component: 'advanced-permissions-middleware',
                error: error.message,
                resource,
                action
            });

            return res.status(500).json({
                error: 'Errore interno del server',
                code: 'INTERNAL_ERROR'
            });
        }
    };
};

/**
 * Middleware per filtrare i dati in base ai permessi
 * Deve essere usato dopo checkAdvancedPermission
 */
const filterDataByPermissions = () => {
    return (req, res, next) => {
        const originalSend = res.send;

        res.send = function (data) {
            try {
                const permissionContext = req.permissionContext;

                if (!permissionContext || !data) {
                    return originalSend.call(this, data);
                }

                // Parse data if it's a string
                let parsedData;
                try {
                    parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                } catch {
                    return originalSend.call(this, data);
                }

                // Filter data based on allowed fields
                const filteredData = filterFields(parsedData, permissionContext.allowedFields);

                // Convert back to string if original was string
                const responseData = typeof data === 'string' ?
                    JSON.stringify(filteredData) :
                    filteredData;

                return originalSend.call(this, responseData);
            } catch (error) {
                logger.error('Error filtering data by permissions', {
                    component: 'advanced-permissions-middleware',
                    error: error.message
                });
                return originalSend.call(this, data);
            }
        };

        next();
    };
};

/**
 * Filtra i campi di un oggetto o array di oggetti
 */
function filterFields(data, allowedFields) {
    if (!allowedFields || allowedFields.includes('*')) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => filterObjectFields(item, allowedFields));
    }

    if (typeof data === 'object' && data !== null) {
        // Se è un oggetto con proprietà 'data' (tipico delle risposte API)
        if (data.data) {
            return {
                ...data,
                data: filterFields(data.data, allowedFields)
            };
        }

        return filterObjectFields(data, allowedFields);
    }

    return data;
}

/**
 * Filtra i campi di un singolo oggetto
 */
function filterObjectFields(obj, allowedFields) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    const filtered = {};

    for (const field of allowedFields) {
        if (field === '*') {
            return obj;
        }

        if (obj.hasOwnProperty(field)) {
            filtered[field] = obj[field];
        }
    }

    return filtered;
}

/**
 * Middleware per verificare accesso alla propria compagnia
 * P49: usa companyTenantProfileId invece di companyId
 */
const requireOwnCompany = () => {
    return async (req, res, next) => {
        try {
            const person = req.person;
            // P49: companyTenantProfileId invece di companyId
            const targetCompanyTenantProfileId = req.params.companyTenantProfileId || req.params.id || req.body.companyTenantProfileId;

            if (!person) {
                return res.status(401).json({
                    error: 'Non autenticato',
                    code: 'UNAUTHORIZED'
                });
            }

            // Allow global admins and tenant admins to access any company in their tenant
            const isGlobalAdmin = person.globalRole === 'SUPER_ADMIN' ||
                person.globalRole === 'ADMIN';

            if (isGlobalAdmin) {
                return next();
            }

            // TENANT_ADMIN can access all companies in their tenant
            const roleTypes = person.personRoles?.map(pr => pr.roleType) || [];
            if (roleTypes.includes('TENANT_ADMIN')) {
                return next();
            }

            // For regular users, check if they belong to the target company
            if (person.companyTenantProfileId && person.companyTenantProfileId === targetCompanyTenantProfileId) {
                return next();
            }

            return res.status(403).json({
                error: 'Accesso negato: puoi accedere solo ai dati della tua compagnia',
                code: 'COMPANY_ACCESS_DENIED'
            });
        } catch (error) {
            logger.error('Error in requireOwnCompany middleware', {
                component: 'advanced-permissions-middleware',
                error: error.message
            });

            return res.status(500).json({
                error: 'Errore interno del server',
                code: 'INTERNAL_ERROR'
            });
        }
    };
};

/**
 * Middleware per verificare accesso ai propri dati
 */
const requireSelfAccess = (getTargetPersonId) => {
    return async (req, res, next) => {
        try {
            const person = req.person;
            const targetPersonId = getTargetPersonId ?
                getTargetPersonId(req) :
                req.params.personId;

            if (!person) {
                return res.status(401).json({
                    error: 'Non autenticato',
                    code: 'UNAUTHORIZED'
                });
            }

            // SUPER_ADMIN e ADMIN possono accedere a tutto
            if (['SUPER_ADMIN', 'ADMIN'].includes(person.globalRole)) {
                return next();
            }

            // COMPANY_ADMIN può accedere ai dati della propria compagnia
            if (person.globalRole === 'COMPANY_ADMIN') {
                // P49: Verifica che la persona target appartenga alla stessa compagnia
                const targetPerson = await prisma.person.findFirst({ // F235: findFirst+deletedAt
                    where: { id: targetPersonId, deletedAt: null },
                    select: {
                        tenantProfiles: {
                            where: { isActive: true, deletedAt: null },
                            select: { companyTenantProfileId: true },
                            take: 1
                        }
                    }
                });

                const targetCompanyProfileId = targetPerson?.tenantProfiles?.[0]?.companyTenantProfileId;
                if (targetPerson && targetCompanyProfileId === person.companyTenantProfileId) {
                    return next();
                }
            }

            // Verifica accesso ai propri dati
            if (targetPersonId && person.id !== targetPersonId) {
                return res.status(403).json({
                    error: 'Accesso negato: puoi accedere solo ai tuoi dati',
                    code: 'SELF_ACCESS_DENIED'
                });
            }

            next();
        } catch (error) {
            logger.error('Error in requireSelfAccess middleware', {
                component: 'advanced-permissions-middleware',
                error: error.message
            });

            return res.status(500).json({
                error: 'Errore interno del server',
                code: 'INTERNAL_ERROR'
            });
        }
    };
};

export {
    checkAdvancedPermission,
    filterDataByPermissions,
    requireOwnCompany,
    requireSelfAccess
};