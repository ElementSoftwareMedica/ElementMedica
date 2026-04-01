/**
 * @file personSelect.js
 * @description Safe Prisma select object for Person records in API responses.
 *
 * Used wherever `include: { person: true }` would expose sensitive authentication
 * fields (password hash, failedAttempts, lockedUntil, mustChangePassword, etc.)
 * to API consumers.
 *
 * Use this with Prisma `include` or `select`:
 *   include: { person: { select: SAFE_PERSON_SELECT } }
 *
 * Fields intentionally EXCLUDED:
 *   - password (bcrypt hash - NEVER expose)
 *   - username (auth identifier)
 *   - mustChangePassword (auth state)
 *   - lastLogin (auth state)
 *   - failedAttempts (auth state)
 *   - lockedUntil (auth state)
 *   - dataRetentionUntil (GDPR internal)
 */

/** @type {Record<string, true>} Prisma select object - safe Person fields only */
export const SAFE_PERSON_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  gender: true,
  taxCode: true,
  vatNumber: true,
  birthDate: true,
  birthPlace: true,
  birthProvince: true,
  numeroCartaIdentita: true,
  profileImage: true,
  gdprConsentDate: true,
  gdprConsentVersion: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
};
