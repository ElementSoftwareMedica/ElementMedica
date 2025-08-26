/**
 * RoleType and Permission Management Controller
 * Handles operations for role types and permissions in the new unified system
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Get all available role types
 * GET /api/role-types
 */
export const getRoleTypes = async (req, res) => {
    try {
        // RoleType is now an enum, so we return the available values
        const roleTypes = [
            'EMPLOYEE',
            'MANAGER', 
            'HR_MANAGER',
            'DEPARTMENT_HEAD',
            'TRAINER',
            'SENIOR_TRAINER',
            'TRAINER_COORDINATOR',
            'EXTERNAL_TRAINER',
            'SUPER_ADMIN',
            'ADMIN',
            'COMPANY_ADMIN',
            'TENANT_ADMIN',
            'VIEWER',
            'OPERATOR',
            'COORDINATOR',
            'SUPERVISOR',
            'GUEST',
            'CONSULTANT',
            'AUDITOR'
        ];

        const formattedRoleTypes = roleTypes.map(roleType => ({
            value: roleType,
            label: roleType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
            description: getRoleTypeDescription(roleType)
        }));

        res.json({
            success: true,
            data: formattedRoleTypes
        });

    } catch (error) {
        logger.error('Failed to fetch role types', {
            component: 'role-type-controller',
            action: 'getRoleTypes',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id
        });
        res.status(500).json({
            error: 'Failed to get role types',
            code: 'ROLE_TYPES_GET_FAILED'
        });
    }
};

/**
 * Get all available permissions
 * GET /api/permissions
 */
export const getPermissions = async (req, res) => {
    try {
        const permissions = await prisma.permission.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                name: 'asc'
            }
        });

        res.json({
            success: true,
            data: permissions
        });

    } catch (error) {
        logger.error('Failed to fetch permissions', {
            component: 'role-type-controller',
            action: 'getPermissions',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id
        });
        res.status(500).json({
            error: 'Failed to get permissions',
            code: 'PERMISSIONS_GET_FAILED'
        });
    }
};

/**
 * Get person roles with filtering
 * GET /api/person-roles
 */
export const getPersonRoles = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search,
            companyId,
            roleType,
            isActive,
            sortBy = 'assignedAt',
            sortOrder = 'desc'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Build where clause
        const where = {
            // Only show active person roles by default
            isActive: isActive !== undefined ? isActive === 'true' : true
        };
        
        // Company isolation for non-global admins
        if (!req.person.globalRole || req.person.globalRole !== 'SUPER_ADMIN') {
            where.companyId = req.person.companyId;
        }
        
        // Override company filter if specified and user has permission
        if (companyId && (req.person.globalRole === 'SUPER_ADMIN' || req.person.globalRole === 'ADMIN')) {
            where.companyId = companyId;
        }
        
        // Role type filter
        if (roleType) {
            where.roleType = roleType;
        }
        
        // Search filter
        if (search) {
            where.person = {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } }
                ]
            };
        }

        // Get person roles with pagination
        const [personRoles, total] = await Promise.all([
            prisma.personRole.findMany({
                where,
                include: {
                    person: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            isActive: true
                        }
                    },
                    company: {
                        select: {
                            id: true,
                            ragioneSociale: true
                        }
                    },
                    assignedByPerson: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    permissions: true
                },
                orderBy: {
                    [sortBy]: sortOrder
                },
                skip: offset,
                take: parseInt(limit)
            }),
            prisma.personRole.count({ where })
        ]);

        // Format response
        const formattedPersonRoles = personRoles.map(personRole => ({
            id: personRole.id,
            personId: personRole.personId,
            person: personRole.person,
            roleType: personRole.roleType,
            roleTypeLabel: personRole.roleType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
            isActive: personRole.isActive,
            isPrimary: personRole.isPrimary,
            assignedAt: personRole.assignedAt,
            assignedBy: personRole.assignedByPerson,
            validFrom: personRole.validFrom,
            validUntil: personRole.validUntil,
            companyId: personRole.companyId,
            company: personRole.company,
            permissions: personRole.permissions,
            createdAt: personRole.createdAt,
            updatedAt: personRole.updatedAt
        }));

        res.json({
            success: true,
            data: formattedPersonRoles,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Failed to fetch person roles', {
            component: 'role-type-controller',
            action: 'getPersonRoles',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id,
            companyId: req.query?.companyId
        });
        res.status(500).json({
            error: 'Failed to get person roles',
            code: 'PERSON_ROLES_GET_FAILED'
        });
    }
};

/**
 * Helper function to get role type descriptions
 */
function getRoleTypeDescription(roleType) {
    const descriptions = {
        'EMPLOYEE': 'Standard employee with basic access',
        'MANAGER': 'Team manager with extended permissions',
        'HR_MANAGER': 'Human resources manager',
        'DEPARTMENT_HEAD': 'Department head with administrative access',
        'TRAINER': 'Course trainer',
        'SENIOR_TRAINER': 'Senior trainer with advanced permissions',
        'TRAINER_COORDINATOR': 'Trainer coordinator managing training programs',
        'EXTERNAL_TRAINER': 'External trainer with limited access',
        'SUPER_ADMIN': 'Super administrator with full system access',
        'ADMIN': 'System administrator',
        'COMPANY_ADMIN': 'Company administrator',
        'TENANT_ADMIN': 'Tenant administrator',
        'VIEWER': 'Read-only access',
        'OPERATOR': 'Operational access',
        'COORDINATOR': 'Coordination role',
        'SUPERVISOR': 'Supervisory role',
        'GUEST': 'Guest access with minimal permissions',
        'CONSULTANT': 'External consultant',
        'AUDITOR': 'Auditor with review permissions'
    };
    
    return descriptions[roleType] || 'Role description not available';
}

export default {
    getRoleTypes,
    getPermissions,
    getPersonRoles
};