import { getDefaultPermissions } from './RoleTypes.js';
import { logger } from '../../../utils/logger.js';

/**
 * Seeds default RolePermissions for a newly created PersonRole.
 * Uses getDefaultPermissions() as the single source of truth.
 * Idempotent — safe to call multiple times (skipDuplicates).
 *
 * @param {string} personRoleId - ID of the PersonRole record
 * @param {string} roleType - RoleType enum value
 * @param {object} prismaOrTx - Prisma client or transaction (defaults to undefined — caller must pass)
 */
export async function seedDefaultPermissions(personRoleId, roleType, prismaOrTx) {
    if (!prismaOrTx) {
        throw new Error('[PermissionSeeder] prismaOrTx is required');
    }
    if (!personRoleId || !roleType) {
        logger.warn('[PermissionSeeder] Missing personRoleId or roleType — skipping seed');
        return;
    }

    const defaultPerms = getDefaultPermissions(roleType);
    if (!defaultPerms || defaultPerms.length === 0) {
        logger.debug({ roleType }, '[PermissionSeeder] No default permissions configured for role');
        return;
    }

    await prismaOrTx.rolePermission.createMany({
        data: defaultPerms.map(permission => ({
            personRoleId,
            permission,
            isGranted: true,
            grantedAt: new Date()
        })),
        skipDuplicates: true
    });

    logger.debug({ personRoleId, roleType, count: defaultPerms.length }, '[PermissionSeeder] Default permissions seeded');
}
