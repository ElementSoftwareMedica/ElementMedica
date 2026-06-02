/**
 * trainerAccess.js
 * Utility functions to determine TRAINER-only access and scope.
 *
 * A "TRAINER-only" user is one who has the TRAINER role but NOT any of
 * the elevated roles (ADMIN, TRAINING_ADMIN, HR_MANAGER, COMPANY_MANAGER,
 * SITE_MANAGER) — meaning they cannot see the full tenant dataset.
 */

import prisma from '../config/prisma-optimization.js';

const ELEVATED_ROLES = ['ADMIN', 'TRAINING_ADMIN', 'HR_MANAGER', 'COMPANY_MANAGER', 'SITE_MANAGER', 'TENANT_ADMIN'];

/**
 * Returns true if the person is a pure TRAINER (no elevated role).
 * @param {string} personId
 * @param {string} tenantId
 * @returns {Promise<boolean>}
 */
export async function isTrainerOnlyAccess(personId, tenantId) {
    const personRoles = await prisma.personRole.findMany({
        where: { personId, tenantId, isActive: true, deletedAt: null },
        select: { roleType: true }
    });
    const roleTypes = personRoles.map(pr => pr.roleType);
    return roleTypes.includes('TRAINER') &&
        !roleTypes.some(r => ELEVATED_ROLES.includes(r));
}

/**
 * Returns the IDs of all schedules where the trainer is assigned
 * (either at schedule level or session level as trainer/co-trainer).
 * @param {string} personId
 * @param {string|object} tenantId  - plain string or Prisma filter object
 * @returns {Promise<string[]>}
 */
export async function getTrainerScheduleIds(personId, tenantId) {
    const tenantWhere = typeof tenantId === 'string' ? tenantId : tenantId;
    const schedules = await prisma.courseSchedule.findMany({
        where: {
            tenantId: tenantWhere,
            deletedAt: null,
            OR: [
                { trainerId: personId },
                { sessions: { some: { OR: [{ trainerId: personId }, { coTrainerId: personId }] } } }
            ]
        },
        select: { id: true }
    });
    return schedules.map(s => s.id);
}

/**
 * Returns unique personIds of all people enrolled in the trainer's schedules.
 * @param {string} personId
 * @param {string} tenantId
 * @returns {Promise<string[]>}
 */
export async function getTrainerEnrolledPersonIds(personId, tenantId) {
    const scheduleIds = await getTrainerScheduleIds(personId, tenantId);
    if (scheduleIds.length === 0) return [];
    const enrollments = await prisma.courseEnrollment.findMany({
        where: { tenantId, deletedAt: null, scheduleId: { in: scheduleIds } },
        select: { personId: true }
    });
    return [...new Set(enrollments.map(e => e.personId))];
}

/**
 * Returns unique CompanyTenantProfile IDs of all companies enrolled
 * in the trainer's schedules.
 * @param {string} personId
 * @param {string} tenantId
 * @returns {Promise<string[]>}
 */
export async function getTrainerCompanyProfileIds(personId, tenantId) {
    const scheduleIds = await getTrainerScheduleIds(personId, tenantId);
    if (scheduleIds.length === 0) return [];
    const scheduleCompanies = await prisma.scheduleCompany.findMany({
        where: { tenantId, deletedAt: null, scheduleId: { in: scheduleIds } },
        select: { companyTenantProfileId: true }
    });
    return [...new Set(scheduleCompanies.map(sc => sc.companyTenantProfileId).filter(Boolean))];
}
