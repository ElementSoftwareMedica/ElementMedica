/**
 * Relation Resolver Service
 * Risolve le relazioni e costruisce filtri Prisma dinamici per scope "relational"
 * 
 * @module services/relation-resolver
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

/**
 * Mappa modelli Prisma con naming convention
 */
const ENTITY_TO_PRISMA_MODEL = {
    'Person': 'person',
    'Company': 'company',
    'CourseSchedule': 'courseSchedule',
    'CourseEnrollment': 'courseEnrollment',
    'CompanySite': 'companySite',
    'Reparto': 'reparto',
    'Course': 'course',
    'Attestato': 'attestato'
};

/**
 * Mappa risorse API a entità database
 */
const RESOURCE_TO_ENTITY = {
    'persons': 'Person',
    'companies': 'Company',
    'courses': 'Course',
    'schedules': 'CourseSchedule',
    'enrollments': 'CourseEnrollment',
    'sites': 'CompanySite',
    'reparti': 'Reparto',
    'attestati': 'Attestato'
};

/**
 * Classe per risolvere relazioni e costruire filtri
 */
class RelationResolver {

    /**
     * Ottiene la definizione di una relazione
     * @param {string} relationType - Tipo di relazione
     * @returns {Promise<object|null>}
     */
    async getRelationDefinition(relationType) {
        try {
            const definition = await prisma.relationDefinition.findUnique({
                where: {
                    name: relationType,
                    deletedAt: null
                }
            });
            return definition;
        } catch (error) {
            logger.error('Error getting relation definition', { relationType, error: error.message });
            return null;
        }
    }

    /**
     * Risolve gli ID delle entità raggiungibili tramite una relazione
     * @param {string} personId - ID della persona base
     * @param {string} relationType - Tipo di relazione
     * @param {string} targetEntity - Entità target (es: "Company", "Person")
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<string[]>} - Array di ID raggiungibili
     */
    async resolveRelatedIds(personId, relationType, targetEntity, tenantId) {
        const definition = await this.getRelationDefinition(relationType);
        if (!definition) {
            logger.warn(`Relation definition not found: ${relationType}`);
            return [];
        }

        const chain = definition.relationChain;
        if (!Array.isArray(chain) || chain.length === 0) {
            logger.warn(`Empty relation chain for: ${relationType}`);
            return [];
        }

        let currentIds = [personId];
        let currentEntity = definition.baseEntity;

        logger.debug('Starting relation resolution', {
            personId,
            relationType,
            targetEntity,
            chainLength: chain.length
        });

        for (const link of chain) {
            if (link.from !== currentEntity) continue;

            currentIds = await this.traverseLink(currentIds, link, tenantId);
            currentEntity = link.to;

            logger.debug('Traversed link', {
                from: link.from,
                to: link.to,
                via: link.via,
                resultCount: currentIds.length
            });

            if (currentEntity === targetEntity) {
                return currentIds;
            }
        }

        // Se non abbiamo raggiunto l'entità target, ritorna vuoto
        if (currentEntity !== targetEntity) {
            logger.warn('Could not reach target entity', {
                currentEntity,
                targetEntity,
                relationType
            });
            return [];
        }

        return currentIds;
    }

    /**
     * Attraversa un link nella catena di relazioni
     * @param {string[]} sourceIds - ID di partenza
     * @param {object} link - Link da attraversare
     * @param {string} tenantId - ID tenant
     * @returns {Promise<string[]>}
     */
    async traverseLink(sourceIds, link, tenantId) {
        const { from, to, via, type } = link;

        if (sourceIds.length === 0) return [];

        const fromModel = ENTITY_TO_PRISMA_MODEL[from];
        const toModel = ENTITY_TO_PRISMA_MODEL[to];

        if (!fromModel || !toModel) {
            logger.error('Unknown entity in relation chain', { from, to });
            return [];
        }

        try {
            if (type === 'oneToMany') {
                // Es: Person -> CourseSchedule via trainerId
                // Query: trova tutti i CourseSchedule dove trainerId è in sourceIds
                const results = await prisma[toModel].findMany({
                    where: {
                        [via]: { in: sourceIds },
                        tenantId,
                        deletedAt: null
                    },
                    select: { id: true }
                });
                return results.map(r => r.id);

            } else if (type === 'manyToOne') {
                // Es: CourseSchedule -> Company via companyId
                // Query: trova companyId di tutti i CourseSchedule con id in sourceIds
                const results = await prisma[fromModel].findMany({
                    where: {
                        id: { in: sourceIds },
                        tenantId,
                        deletedAt: null
                    },
                    select: { [via]: true }
                });
                return results.map(r => r[via]).filter(Boolean);

            } else if (type === 'manyToMany') {
                // Per relazioni many-to-many, usa la tabella pivot
                // Implementazione specifica per ogni caso
                logger.warn('ManyToMany relation not fully implemented', { from, to, via });
                return [];
            }
        } catch (error) {
            logger.error('Error traversing link', {
                from, to, via, type,
                error: error.message
            });
            return [];
        }

        return [];
    }

    /**
     * Costruisce un filtro Prisma completo per lo scope relational
     * @param {string} personId - ID persona
     * @param {string} tenantId - ID tenant
     * @param {object} permission - Permesso con relationType
     * @returns {Promise<object>}
     */
    async buildRelationalFilter(personId, tenantId, permission) {
        const { resource, relationType, allowedFields, deniedFields } = permission;

        const targetEntity = this.resourceToEntity(resource);

        const relatedIds = await this.resolveRelatedIds(
            personId,
            relationType,
            targetEntity,
            tenantId
        );

        logger.debug('Built relational filter', {
            personId,
            resource,
            relationType,
            relatedIdsCount: relatedIds.length
        });

        return {
            allowed: relatedIds.length > 0,
            where: {
                id: { in: relatedIds },
                tenantId,
                deletedAt: null
            },
            select: this.buildFieldSelect(allowedFields, deniedFields)
        };
    }

    /**
     * Costruisce il select dei campi permessi
     * @param {string[]|null} allowedFields - Campi permessi
     * @param {string[]|null} deniedFields - Campi negati
     * @returns {object|undefined}
     */
    buildFieldSelect(allowedFields, deniedFields) {
        if (!allowedFields && !deniedFields) return undefined;

        const select = {};

        // Se allowedFields specifici (non '*'), usa solo quelli
        if (allowedFields && Array.isArray(allowedFields) && !allowedFields.includes('*')) {
            for (const field of allowedFields) {
                select[field] = true;
            }
            // Aggiungi sempre id
            select.id = true;
        }

        // I deniedFields verranno rimossi dopo la query
        // per sicurezza (non affidarsi solo a select)

        return Object.keys(select).length > 0 ? select : undefined;
    }

    /**
     * Converte nome risorsa API a nome entità
     * @param {string} resource - Nome risorsa (es: "companies")
     * @returns {string}
     */
    resourceToEntity(resource) {
        return RESOURCE_TO_ENTITY[resource] || resource;
    }

    /**
     * Converte nome entità a modello Prisma
     * @param {string} entityName - Nome entità (es: "Company")
     * @returns {string}
     */
    entityToPrismaModel(entityName) {
        return ENTITY_TO_PRISMA_MODEL[entityName] ||
            entityName.charAt(0).toLowerCase() + entityName.slice(1);
    }
}

// Singleton instance
export const relationResolver = new RelationResolver();

export default relationResolver;
