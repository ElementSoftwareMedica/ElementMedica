/**
 * sanitizeBody.js
 * 
 * Utility per prevenire mass assignment vulnerabilities.
 * Rimuove i campi system-managed da req.body prima di passarli
 * a Prisma create/update, impedendo che utenti autenticati
 * possano manipolare campi come deletedAt, tenantId, id, ecc.
 * 
 * F146 — Fase 40 Security Audit
 */

/**
 * Campi gestiti dal sistema che non devono mai essere impostati da req.body.
 * Questi campi sono gestiti esclusivamente dal backend.
 */
const SYSTEM_FIELDS = [
  'id',
  'tenantId',
  'deletedAt',
  'createdAt',
  'updatedAt',
  'createdBy',    // viene sovrapposto dal route handler
  'updatedBy',    // viene sovrapposto dal route handler
  '__v',
  '_id',
];

/**
 * Rimuove i campi system-managed da un oggetto body prima di passarlo a Prisma.
 * Protegge da mass assignment su: tenantId, deletedAt, id, timestamps.
 *
 * @param {Object} body - req.body o qualsiasi oggetto dati
 * @param {string[]} [extraFields=[]] - Campi aggiuntivi da rimuovere specifici per il contesto
 * @returns {Object} Oggetto senza campi system-managed
 * 
 * @example
 * // Nel route handler:
 * const safeData = omitSystemFields(req.body);
 * await SomeService.create({ ...safeData, tenantId, createdBy });
 */
export function omitSystemFields(body, extraFields = []) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }

  const fieldsToRemove = new Set([...SYSTEM_FIELDS, ...extraFields]);
  const result = {};

  for (const [key, value] of Object.entries(body)) {
    if (!fieldsToRemove.has(key)) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Express middleware che applica omitSystemFields a req.body in-place.
 * Utile per proteggere routes completamente.
 *
 * @param {string[]} [extraFields=[]] - Campi aggiuntivi da rimuovere
 * @returns Express middleware
 *
 * @example
 * router.put('/entities/:id',
 *   authenticateToken(),
 *   stripSystemFields(),
 *   async (req, res) => { ... }
 * );
 */
export function stripSystemFields(extraFields = []) {
  return (req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = omitSystemFields(req.body, extraFields);
    }
    next();
  };
}
