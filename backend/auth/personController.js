/**
 * Person Management Controller
 * Handles CRUD operations for persons, roles, and permissions
 */

import { PrismaClient } from '@prisma/client';
import { PasswordService } from './jwt.js';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Validation middleware
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
        });
    }
    next();
};

/**
 * Get paginated list of persons
 * GET /api/persons
 */
export const getPersons = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            companyId,
            role,
            isActive,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Map snake_case to database field names for sortBy
        const sortByMapping = {
            'created_at': 'createdAt',
            'updated_at': 'updatedAt',
            'first_name': 'firstName',
            'last_name': 'lastName',
            'company_id': 'companyId'
        };
        const mappedSortBy = sortByMapping[sortBy] || sortBy;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Build where clause
        const where = {};
        
        // Company isolation for non-global admins
        if (!req.person.roles.includes('global_admin')) {
            where.companyId = req.person.companyId;
        } else if (companyId) {
            where.companyId = companyId;
        }
        
        // Search filter
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }
        
        // Active filter (using soft delete)
        if (isActive !== undefined) {
            if (isActive === 'true') {
                where.deletedAt = null;
            } else {
                where.deletedAt = { not: null };
            }
        } else {
            where.deletedAt = null; // Default to active only
        }
        
        // Role filter
        if (role) {
            where.personRoles = {
                some: {
                    roleType: role,
            
                }
            };
        }

        // Get persons with pagination
        const [persons, total] = await Promise.all([
            prisma.person.findMany({
                where,
                include: {
                    personRoles: {
                        where: {},
                        include: {
                            permissions: true
                        }
                    },
                    company: {
                        select: {
                            id: true,
                            ragioneSociale: true
                        }
                    }
                },
                orderBy: {
                    [mappedSortBy]: sortOrder
                },
                skip: offset,
                take: parseInt(limit)
            }),
            prisma.person.count({ where })
        ]);

        // Format response
        const formattedPersons = persons.map(person => ({
            id: person.id,
            email: person.email,
            firstName: person.firstName,
            lastName: person.lastName,
            phone: person.phone,
            avatarUrl: person.avatarUrl,
            language: person.language,
            timezone: person.timezone,
            companyId: person.companyId,
            company: person.company,
            roles: person.personRoles.map(pr => ({
                id: pr.id,
                roleType: pr.roleType,
                permissions: pr.permissions
            })),
            isActive: person.deletedAt === null,
            lastLogin: person.lastLogin,
            createdAt: person.createdAt,
            updatedAt: person.updatedAt
        }));

        res.json({
            success: true,
            data: formattedPersons,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Failed to fetch persons', {
            component: 'person-controller',
            action: 'getPersons',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id,
            companyId: req.query?.companyId
        });
        res.status(500).json({
            error: 'Failed to get persons',
            code: 'PERSON_GET_FAILED'
        });
    }
};

/**
 * Get person by ID
 * GET /api/persons/:id
 */
export const getPersonById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const where = { id };
        
        // Company isolation for non-global admins
        if (!req.person.roles.includes('global_admin')) {
            where.companyId = req.person.companyId;
        }
        
        // Add soft delete filter
        where.deletedAt = null;

        const person = await prisma.person.findFirst({
            where,
            include: {
                personRoles: {
                    where: { isActive: true },
                    include: {
                        permissions: true
                    }
                },
                company: {
                    select: {
                        id: true,
                        ragioneSociale: true
                    }
                },
                refreshTokens: {
                    where: { revokedAt: null },
                    select: {
                        id: true,
                        createdAt: true,
                        expiresAt: true
                    }
                }
            }
        });

        if (!person) {
            return res.status(404).json({
                error: 'Person not found',
                code: 'PERSON_NOT_FOUND'
            });
        }

        const roles = person.personRoles.map(pr => ({
            id: pr.id,
            roleType: pr.roleType,
            permissions: pr.permissions
        }));
        const permissions = person.personRoles.flatMap(pr => pr.permissions || []);

        res.json({
            success: true,
            data: {
                id: person.id,
                email: person.email,
                firstName: person.firstName,
                lastName: person.lastName,
                phone: person.phone,
                avatarUrl: person.avatarUrl,
                language: person.language,
                timezone: person.timezone,
                companyId: person.companyId,
                company: person.company,
                roles,
                permissions,
                refreshTokens: person.refreshTokens,
                isActive: person.deletedAt === null,
                lastLogin: person.lastLogin,
                createdAt: person.createdAt,
                updatedAt: person.updatedAt
            }
        });

    } catch (error) {
        logger.error('Failed to fetch person', {
            component: 'person-controller',
            action: 'getPersonById',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id,
            targetPersonId: req.params?.id
        });
        res.status(500).json({
            error: 'Failed to get person',
            code: 'PERSON_GET_FAILED'
        });
    }
};

/**
 * Create new user
 * POST /api/users
 */
export const createUser = [
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }),
        body('firstName').isLength({ min: 1 }).trim(),
        body('lastName').isLength({ min: 1 }).trim(),
        body('companyId').isUUID().optional(),
        body('employeeId').isUUID().optional(),
        body('roles').isArray().optional(),
        body('phone').isMobilePhone().optional(),
        body('language').isIn(['it', 'en']).optional()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const {
                email,
                password,
                firstName,
                lastName,
                companyId,
                employeeId,
                roles = ['employee'],
                phone,
                language = 'it'
            } = req.body;

            // Validate password strength
            const passwordValidation = PasswordService.validatePasswordStrength(password);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    error: 'Password does not meet requirements',
                    code: 'WEAK_PASSWORD',
                    details: passwordValidation.errors
                });
            }

            // Check if person already exists
            const existingPerson = await prisma.person.findUnique({
                where: { email }
            });

            if (existingPerson) {
                return res.status(409).json({
                    error: 'Person already exists',
                    code: 'PERSON_EXISTS'
                });
            }

            // Use requester's company if not specified (unless global admin)
            const targetCompanyId = companyId || 
                (req.person.roles.includes('global_admin') ? null : req.person.companyId);

            // Validate person belongs to target company
            if (employeeId && targetCompanyId) {
                const employee = await prisma.person.findFirst({
                    where: {
                        id: employeeId,
                        companyId: targetCompanyId,
                        deletedAt: null
                    }
                });

                if (!employee) {
                    return res.status(400).json({
                        error: 'Employee not found in target company',
                        code: 'EMPLOYEE_NOT_FOUND'
                    });
                }
            }

            // Hash password
            const passwordHash = await PasswordService.hashPassword(password);

            // Create person in transaction
            const result = await prisma.$transaction(async (tx) => {
                // Create person
                const person = await tx.person.create({
                    data: {
                        email,
                        password: passwordHash,
                        firstName,
                        lastName,
                        phone,
                        language,
                        companyId: targetCompanyId,
                        createdBy: req.person.id
                    }
                });

                // Assign roles
                const personRoles = [];
                for (const roleName of roles) {
                    const role = await tx.role.findFirst({
                        where: {
                            name: roleName,
                            OR: [
                                { isSystemRole: true },
                                { companyId: targetCompanyId }
                            ]
                        }
                    });

                    if (role) {
                        const personRole = await tx.personRole.create({
                            data: {
                                personId: person.id,
                                roleType: role.name,
                                companyId: targetCompanyId,
                                assignedBy: req.person.id,
                                isActive: true
                            }
                        });
                        personRoles.push(role);
                    }
                }

                return { person, roles: personRoles };
            });

            res.status(201).json({
                success: true,
                data: {
                    id: result.person.id,
                    email: result.person.email,
                    firstName: result.person.firstName,
                    lastName: result.person.lastName,
                    phone: result.person.phone,
                    language: result.person.language,
                    companyId: result.person.companyId,
                    roles: result.roles,
                    isActive: result.person.isActive,
                    createdAt: result.person.createdAt
                }
            });

        } catch (error) {
            logger.error('Failed to create user', {
            component: 'user-controller',
            action: 'createUser',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id,
            email: req.body?.email
        });
            res.status(500).json({
                error: 'Failed to create user',
                code: 'USER_CREATE_FAILED'
            });
        }
    }
];

/**
 * Update user
 * PUT /api/users/:id
 */
export const updateUser = [
    [
        body('firstName').optional().isLength({ min: 1 }).trim(),
        body('lastName').optional().isLength({ min: 1 }).trim(),
        body('phone').optional().isMobilePhone(),
        body('language').optional().isIn(['it', 'en']),
        body('timezone').optional().isLength({ min: 1 }),
        body('employeeId').optional().isUUID(),
        body('isActive').optional().isBoolean()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { id } = req.params;
            const {
                firstName,
                lastName,
                phone,
                language,
                timezone,
                employeeId,
                isActive
            } = req.body;

            const where = { id };
            
            // Company isolation for non-global admins
            if (!req.person.roles.includes('global_admin')) {
                where.companyId = req.person.companyId;
            }
            where.deletedAt = null;

            // Check if person exists
            const existingPerson = await prisma.person.findFirst({ where });
            if (!existingPerson) {
                return res.status(404).json({
                    error: 'Person not found',
                    code: 'PERSON_NOT_FOUND'
                });
            }

            // Validate person belongs to company
            if (employeeId) {
                const employee = await prisma.person.findFirst({
                    where: {
                        id: employeeId,
                        companyId: existingPerson.companyId,
                        deletedAt: null
                    }
                });

                if (!employee) {
                    return res.status(400).json({
                        error: 'Employee not found in user company',
                        code: 'EMPLOYEE_NOT_FOUND'
                    });
                }
            }

            // Build update data
            const updateData = { updatedBy: req.person.id };
            if (firstName !== undefined) updateData.firstName = firstName;
            if (lastName !== undefined) updateData.lastName = lastName;
            if (phone !== undefined) updateData.phone = phone;
            if (language !== undefined) updateData.language = language;
            if (timezone !== undefined) updateData.timezone = timezone;
            if (employeeId !== undefined) updateData.employeeId = employeeId;
            if (isActive !== undefined) updateData.status = isActive ? 'ACTIVE' : 'INACTIVE';

            // Update person
            const person = await prisma.person.update({
                where: { id },
                data: updateData,
                include: {
                    personRoles: {
                        where: {},
                        include: {
                            permissions: true
                        }
                    },
                    company: true
                }
            });

            res.json({
                success: true,
                data: {
                    id: person.id,
                    email: person.email,
                    firstName: person.firstName,
                    lastName: person.lastName,
                    phone: person.phone,
                    language: person.language,
                    timezone: person.timezone,
                    companyId: person.companyId,
                    employeeId: person.employeeId,
                    company: person.company,
                    roles: person.personRoles.map(pr => ({
                        roleType: pr.roleType,
                        permissions: pr.permissions
                    })),
                    isActive: person.status === 'ACTIVE',
                    updatedAt: person.updatedAt
                }
            });

        } catch (error) {
            logger.error('Failed to update person', {
            component: 'person-controller',
            action: 'updatePerson',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id,
            targetPersonId: req.params?.id
        });
            res.status(500).json({
                error: 'Failed to update person',
                code: 'PERSON_UPDATE_FAILED'
            });
        }
    }
];

/**
 * Delete user (soft delete)
 * DELETE /api/users/:id
 */
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        const where = { id };
        
        // Company isolation for non-global admins
        if (!req.person.roles.includes('global_admin')) {
            where.companyId = req.person.companyId;
        }
        where.deletedAt = null;

        // Check if person exists
        const existingPerson = await prisma.person.findFirst({ where });
        if (!existingPerson) {
            return res.status(404).json({
                error: 'Person not found',
                code: 'PERSON_NOT_FOUND'
            });
        }

        // Prevent self-deletion
        if (id === req.person.id) {
            return res.status(400).json({
                error: 'Cannot delete your own account',
                code: 'SELF_DELETE_FORBIDDEN'
            });
        }

        // Soft delete person and deactivate roles
        await prisma.$transaction(async (tx) => {
            // Soft delete person
            await tx.person.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    status: 'INACTIVE'
                }
            });

            // Soft delete person roles
            await tx.personRole.updateMany({
                where: { personId: id },
                data: { deletedAt: new Date() }
            });

            // Deactivate refresh tokens
            await tx.refreshToken.updateMany({
                where: { personId: id },
                data: { isActive: false }
            });
        });

        res.json({
            success: true,
            message: 'Person deleted successfully'
        });

    } catch (error) {
        logger.error('Failed to delete person', {
            component: 'person-controller',
            action: 'deletePerson',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id,
            targetPersonId: req.params?.id
        });
        res.status(500).json({
            error: 'Failed to delete user',
            code: 'USER_DELETE_FAILED'
        });
    }
};

/**
 * Assign role to user
 * POST /api/users/:id/roles
 */
export const assignRole = [
    [
        body('roleId').isUUID(),
        body('companyId').isUUID().optional()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { roleId, companyId } = req.body;

            const where = { id };
            
            // Company isolation for non-global admins
            if (!req.person.roles.includes('global_admin')) {
                where.companyId = req.person.companyId;
            }

            // Check if person exists
            const person = await prisma.person.findFirst({ where });
            if (!person) {
                return res.status(404).json({
                    error: 'Person not found',
                    code: 'PERSON_NOT_FOUND'
                });
            }

            // Use person's company if not specified
            const targetCompanyId = companyId || person.companyId;

            // Check if role type is valid
            const validRoleTypes = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'TRAINER', 'VIEWER'];
            if (!validRoleTypes.includes(roleId)) {
                return res.status(404).json({
                    error: 'Invalid role type',
                    code: 'INVALID_ROLE_TYPE'
                });
            }

            // Check if person already has this role
            const existingPersonRole = await prisma.personRole.findFirst({
                where: {
                    personId: id,
                    roleType: roleId,
                    companyId: targetCompanyId,
                    isActive: true
                }
            });

            if (existingPersonRole) {
                return res.status(409).json({
                    error: 'Person already has this role',
                    code: 'ROLE_ALREADY_ASSIGNED'
                });
            }

            // Assign role
            const personRole = await prisma.personRole.create({
                data: {
                    personId: id,
                    roleType: roleId,
                    companyId: targetCompanyId,
                    assignedBy: req.person.id,
                    assignedAt: new Date(),
                    isActive: true
                }
            });

            res.status(201).json({
                success: true,
                data: {
                    id: personRole.id,
                    roleType: personRole.roleType,
                    companyId: personRole.companyId,
                    assignedAt: personRole.assignedAt
                }
            });

        } catch (error) {
            logger.error('Failed to assign role', {
            component: 'user-controller',
            action: 'assignRole',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id,
            targetPersonId: req.params?.personId,
            roleId: req.body?.roleId
        });
            res.status(500).json({
                error: 'Failed to assign role',
                code: 'ROLE_ASSIGN_FAILED'
            });
        }
    }
];

/**
 * Remove role from user
 * DELETE /api/users/:id/roles/:roleId
 */
export const removeRole = async (req, res) => {
    try {
        const { id, roleId } = req.params;

        const where = { id };
        
        // Company isolation for non-global admins
        if (!req.person.roles.includes('global_admin')) {
            where.companyId = req.person.companyId;
        }

        // Check if person exists
        const person = await prisma.person.findFirst({ where });
        if (!person) {
            return res.status(404).json({
                error: 'Person not found',
                code: 'PERSON_NOT_FOUND'
            });
        }

        // Find and deactivate person role
        const personRole = await prisma.personRole.findFirst({
            where: {
                personId: id,
                roleType: roleId,
                isActive: true
            }
        });

        if (!personRole) {
            return res.status(404).json({
                error: 'Person role not found',
                code: 'PERSON_ROLE_NOT_FOUND'
            });
        }

        // Deactivate role
        await prisma.personRole.update({
            where: { id: personRole.id },
            data: {
                isActive: false,
                removedAt: new Date(),
                removedBy: req.person.id
            }
        });

        res.json({
            success: true,
            message: 'Role removed successfully'
        });

    } catch (error) {
        logger.error('Failed to remove role', {
            component: 'user-controller',
            action: 'removeRole',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id,
            targetPersonId: req.params?.personId,
            roleId: req.params?.roleId
        });
        res.status(500).json({
            error: 'Failed to remove role',
            code: 'ROLE_REMOVE_FAILED'
        });
    }
};

/**
 * Get user's roles
 * GET /api/users/:id/roles
 */
export const getUserRoles = async (req, res) => {
    try {
        const { id } = req.params;
        
        const where = { id };
        
        // Company isolation for non-global admins
        if (!req.person.roles.includes('global_admin')) {
            where.companyId = req.person.companyId;
        }

        // Check if user exists
        const person = await prisma.person.findFirst({ where });
        if (!person) {
            return res.status(404).json({
                error: 'Person not found',
                code: 'PERSON_NOT_FOUND'
            });
        }

        // Get person roles
        const personRoles = await prisma.personRole.findMany({
            where: {
                personId: id,
                isActive: true
            },
            orderBy: {
                assignedAt: 'desc'
            }
        });

        res.json({
            success: true,
            data: personRoles.map(pr => ({
                id: pr.id,
                roleType: pr.roleType,
                companyId: pr.companyId,
                assignedAt: pr.assignedAt,
                assignedBy: pr.assignedBy
            }))
        });

    } catch (error) {
        logger.error('Failed to get user roles', {
            component: 'user-controller',
            action: 'getUserRoles',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id,
            targetPersonId: req.params?.personId
        });
        res.status(500).json({
            error: 'Failed to get user roles',
            code: 'USER_ROLES_GET_FAILED'
        });
    }
};

/**
 * Reset user password (admin only)
 * POST /api/users/:id/reset-password
 */
export const resetUserPassword = [
    [
        body('newPassword').isLength({ min: 8 }),
        body('forceChange').optional().isBoolean()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { newPassword, forceChange = true } = req.body;

            const where = { id };
            
            // Company isolation for non-global admins
            if (!req.person.roles.includes('global_admin')) {
                where.companyId = req.person.companyId;
            }

            // Check if person exists
            const person = await prisma.person.findFirst({ where });
            if (!person) {
                return res.status(404).json({
                    error: 'Person not found',
                    code: 'PERSON_NOT_FOUND'
                });
            }

            // Validate password strength
            const passwordValidation = PasswordService.validatePasswordStrength(newPassword);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    error: 'Password does not meet requirements',
                    code: 'WEAK_PASSWORD',
                    details: passwordValidation.errors
                });
            }

            // Hash new password
            const passwordHash = await PasswordService.hashPassword(newPassword);

            // Update password
            await prisma.person.update({
                where: { id },
                data: {
                    password: passwordHash,
                    updatedAt: new Date()
                }
            });

            // Note: UserSession model removed - session management handled differently

            res.json({
                success: true,
                message: 'Password reset successfully'
            });

        } catch (error) {
            logger.error('Failed to reset password', {
            component: 'user-controller',
            action: 'resetPassword',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id,
            targetPersonId: req.params?.id
        });
            res.status(500).json({
                error: 'Failed to reset password',
                code: 'PASSWORD_RESET_FAILED'
            });
        }
    }
];

export default {
    getPersons,
    getPersonById,
    createUser,
    updateUser,
    deleteUser,
    assignRole,
    removeRole,
    getPersonRoles: getUserRoles,
    resetPersonPassword: resetUserPassword
};