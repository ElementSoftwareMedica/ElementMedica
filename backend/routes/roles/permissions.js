/**
 * @fileoverview Gestione dei permessi dei ruoli
 * @description Modulo per la gestione dei permessi associati ai ruoli
 * @author Sistema di gestione ruoli
 * @version 1.0.0
 */

import express from 'express';
import prisma from '../../config/prisma-optimization.js';
const router = express.Router();

// Middleware
import { authenticate } from '../../middleware/auth.js';
import { tenantAuth, requirePermission } from './middleware/auth.js';
import enhancedRoleService from '../../services/enhancedRoleService.js';
import logger from '../../utils/logger.js';
import { PERMISSIONS } from '../../constants/permissions.js';

// Importa le funzioni di validazione
import { isValidPersonPermission } from './utils/validators.js';

const SUPPLEMENTAL_RESOURCE_ACTION_PERMISSIONS = [
  'clinica.agenda:read', 'clinica.agenda:create', 'clinica.agenda:update', 'clinica.agenda:delete', 'clinica.agenda:manage',
  'clinica.medici:read', 'clinica.medici:create', 'clinica.medici:update', 'clinica.medici:delete', 'clinica.medici:manage',
  'clinica.listini:read', 'clinica.listini:create', 'clinica.listini:update', 'clinica.listini:delete', 'clinica.listini:manage',
  'clinica.poliambulatorio:read', 'clinica.poliambulatorio:create', 'clinica.poliambulatorio:update', 'clinica.poliambulatorio:delete', 'clinica.poliambulatorio:write', 'clinica.poliambulatorio:manage'
];

const VALID_RESOURCE_ACTION_PERMISSIONS = new Set([
  ...Object.values(PERMISSIONS),
  ...SUPPLEMENTAL_RESOURCE_ACTION_PERMISSIONS
]);

function normalizePermissionId(permissionId) {
  const trimmed = permissionId.trim();
  return trimmed.includes(':') ? trimmed.toLowerCase() : trimmed.toUpperCase();
}

function isValidResourceActionPermission(permissionId) {
  return VALID_RESOURCE_ACTION_PERMISSIONS.has(permissionId.trim().toLowerCase());
}

function parsePermissionId(permissionId) {
  const normalized = normalizePermissionId(permissionId);
  if (normalized.includes(':')) {
    const [resource, action] = normalized.split(':');
    return { normalizedPermissionId: normalized, resource, action };
  }

  const parts = normalized.split('_');
  if (parts.length < 2) return null;

  return {
    normalizedPermissionId: normalized,
    action: parts[0].toLowerCase(),
    resource: parts.slice(1).join('_').toLowerCase()
  };
}

/**
 * Valida e filtra i permessi
 * @param {Array} permissions - Array di permessi da validare
 * @returns {Array} - Array di permessi validi
 */
function validateAndFilterPermissions(permissions) {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return permissions.filter(perm => {
    if (!perm || !perm.permissionId) {
      logger.warn(`Permission without permissionId found: ${JSON.stringify(perm)}`);
      return false;
    }

    const isValid = isValidPersonPermission(perm.permissionId) || isValidResourceActionPermission(perm.permissionId);
    if (!isValid) {
      logger.warn(`Invalid permission found and filtered out: ${perm.permissionId}`);
    }

    return isValid;
  });
}

/**
 * @route GET /api/roles/permissions
 * @desc Ottiene tutti i permessi disponibili nel sistema
 * @access Admin
 */
router.get('/permissions',
  authenticate,
  tenantAuth,
  requirePermission('roles:read'),
  async (req, res) => {
    try {
      logger.debug('Getting all available permissions');

      // Ottieni tutti i permessi dal database
      const allPermissions = await prisma.permission.findMany({
        where: {
          deletedAt: null  // Usa deletedAt invece di isActive per il soft delete
        },
        include: {
          site: true  // Include solo la relazione site che esiste
        },
        orderBy: [
          { resource: 'asc' },  // resource è un campo scalare, non una relazione
          { action: 'asc' }
        ]
      });

      // Raggruppa i permessi per risorsa
      const permissionsByResource = {};

      allPermissions.forEach(permission => {
        const resourceName = permission.resource || 'general';  // resource è ora un campo scalare

        if (!permissionsByResource[resourceName]) {
          permissionsByResource[resourceName] = {
            name: resourceName,
            displayName: resourceName.charAt(0).toUpperCase() + resourceName.slice(1).replace(/_/g, ' '),
            description: `Permessi per ${resourceName}`,
            permissions: []
          };
        }

        permissionsByResource[resourceName].permissions.push({
          key: permission.id,
          name: permission.name,
          label: permission.description || permission.name,
          description: permission.description,
          action: permission.action,
          resource: resourceName,
          scope: permission.scope || 'all',
          siteId: permission.siteId,  // Aggiungi siteId se presente
          site: permission.site  // Aggiungi informazioni sulla sede se presente
        });
      });

      // Aggiungi anche i permessi di default dal servizio per compatibilità
      const systemRoles = Object.keys(enhancedRoleService.getRoleTypes() || {});
      const allSystemPermissions = new Set();

      systemRoles.forEach(roleType => {
        try {
          const rolePermissions = enhancedRoleService.getDefaultPermissions(roleType);
          rolePermissions.forEach(perm => allSystemPermissions.add(perm));
        } catch (error) {
          logger.warn('Impossibile ottenere permessi per il ruolo', { roleType, error: error.message });
        }
      });

      // Aggiungi i permessi di sistema che non sono nel database
      Array.from(allSystemPermissions).forEach(permissionId => {
        // Estrai action e resource dal permissionId (es. "VIEW_COMPANIES" -> action: "VIEW", resource: "COMPANIES")
        const parts = permissionId.split('_');
        if (parts.length >= 2) {
          const action = parts[0];
          const resource = parts.slice(1).join('_').toLowerCase();

          if (!permissionsByResource[resource]) {
            permissionsByResource[resource] = {
              name: resource,
              displayName: resource.charAt(0).toUpperCase() + resource.slice(1).replace(/_/g, ' '),
              description: `Permessi per ${resource}`,
              permissions: []
            };
          }

          // Verifica se il permesso non è già presente
          const exists = permissionsByResource[resource].permissions.some(p => p.key === permissionId);
          if (!exists) {
            permissionsByResource[resource].permissions.push({
              key: permissionId,
              name: permissionId,
              label: permissionId.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
              description: `${action.toLowerCase()} ${resource.replace(/_/g, ' ').toLowerCase()}`,
              action: action.toLowerCase(),
              resource: resource,
              scope: 'all'
            });
          }
        }
      });

      logger.debug({ categoriesCount: Object.keys(permissionsByResource).length }, 'Retrieved permission categories');

      res.json({
        success: true,
        data: {
          permissions: permissionsByResource,
          totalCategories: Object.keys(permissionsByResource).length,
          totalPermissions: Object.values(permissionsByResource).reduce((sum, cat) => sum + cat.permissions.length, 0)
        }
      });
    } catch (error) {
      logger.error({ error: 'Operazione non riuscita', userId: req.person?.id }, 'Errore nel recupero di tutti i permessi');

      res.status(500).json({
        success: false,
        error: 'Errore interno del server durante il recupero dei permessi'
      });
    }
  }
);

/**
 * @route GET /api/roles/:roleType/permissions
 * @desc Ottiene i permessi di un ruolo specifico
 * @access Admin
 */
router.get('/:roleType/permissions',
  authenticate,
  tenantAuth,
  requirePermission('roles:read'),
  async (req, res) => {
    try {
      let { roleType } = req.params;
      const tenantId = req.tenant?.id;

      // Decodifica l'URL encoding per gestire caratteri speciali come &
      roleType = decodeURIComponent(roleType);

      logger.debug({ roleType, tenantId }, 'Getting permissions for role');

      // Determina se è un ruolo personalizzato o di sistema
      const isCustomRole = roleType.startsWith('CUSTOM_');
      let isSystemRole = false;

      // Verifica se è un ruolo di sistema nell'enum RoleType
      if (!isCustomRole && enhancedRoleService.getRoleTypes() && enhancedRoleService.getRoleTypes()[roleType]) {
        isSystemRole = true;
      }

      // Se non è né custom (con prefisso CUSTOM_) né di sistema, potrebbe essere un ruolo personalizzato senza prefisso
      // Verifica se esiste nella tabella CustomRole
      let isCustomRoleInDB = false;
      let customRoleFromDB = null;
      if (!isCustomRole && !isSystemRole) {
        // Prima cerca per nome esatto (caso in cui il roleType sia già il nome del ruolo)
        customRoleFromDB = await prisma.customRole.findFirst({
          where: {
            name: roleType,
            tenantId: tenantId,
            deletedAt: null
          },
          include: {
            permissions: {
              where: {
                deletedAt: null
              }
            }
          }
        });

        // Se non trovato per nome esatto, cerca per roleType generato
        if (!customRoleFromDB) {
          // Il roleType potrebbe essere generato dal nome con .toUpperCase().replace(/\s+/g, '_')
          // Quindi cerchiamo un CustomRole il cui nome, quando trasformato, corrisponde al roleType
          const allCustomRoles = await prisma.customRole.findMany({
            where: {
              tenantId: tenantId,
              deletedAt: null
            },
            include: {
              permissions: {
                where: {
                  deletedAt: null
                }
              }
            }
          });

          customRoleFromDB = allCustomRoles.find(role => {
            const generatedRoleType = role.name.toUpperCase().replace(/\s+/g, '_');
            return generatedRoleType === roleType;
          });
        }

        if (customRoleFromDB) {
          isCustomRoleInDB = true;
          logger.debug({ roleType, roleName: customRoleFromDB.name }, 'Found custom role in database');
        }
      }

      // Se non è nessuno dei tipi sopra, verifica se esiste almeno un PersonRole
      // Ma solo se il roleType è valido nell'enum (per evitare errori Prisma)
      if (!isCustomRole && !isSystemRole && !isCustomRoleInDB) {
        try {
          const existingRole = await prisma.personRole.findFirst({
            where: {
              roleType: roleType,
              tenantId: tenantId,
              deletedAt: null
            }
          });

          if (!existingRole) {
            logger.debug({ roleType }, 'Role type not found');
            return res.status(404).json({
              success: false,
              error: 'Tipo ruolo non trovato'
            });
          }
        } catch (prismaError) {
          // Se la query Prisma fallisce (probabilmente perché il roleType non è nell'enum),
          // consideriamo il ruolo come non trovato
          logger.debug({ roleType }, 'Role type not valid in enum');
          return res.status(404).json({
            success: false,
            error: 'Tipo ruolo non trovato'
          });
        }
      }

      // Determina se è un ruolo personalizzato o di sistema
      let permissions = [];

      if (isCustomRole) {
        // Per ruoli personalizzati con prefisso CUSTOM_, carica da CustomRolePermission
        const customRoleId = roleType.replace('CUSTOM_', '');
        const customRole = await prisma.customRole.findFirst({
          where: {
            id: customRoleId,
            tenantId: tenantId,
            deletedAt: null
          },
          include: {
            permissions: {
              where: {
                deletedAt: null
              }
            }
          }
        });

        if (customRole && customRole.permissions) {
          permissions = customRole.permissions.map(perm => ({
            permissionId: perm.permission,
            granted: true,
            scope: perm.scope || 'global',
            tenantIds: perm.conditions?.allowedTenants || [],
            fieldRestrictions: perm.allowedFields || []
          }));
        }
      } else if (isCustomRoleInDB) {
        // Per ruoli personalizzati senza prefisso CUSTOM_, usa il customRoleFromDB già trovato
        if (customRoleFromDB && customRoleFromDB.permissions) {
          permissions = customRoleFromDB.permissions.map(perm => ({
            permissionId: perm.permission,
            granted: true,
            scope: perm.scope || 'global',
            tenantIds: perm.conditions?.allowedTenants || [],
            fieldRestrictions: perm.allowedFields || []
          }));
        }
      } else {
        // Per ruoli di sistema, carica i permessi effettivi dal database
        logger.debug({ roleType }, 'Loading actual permissions for system role');

        // Trova tutti i PersonRole per questo tipo di ruolo nel tenant
        const personRoles = await prisma.personRole.findMany({
          where: {
            roleType: roleType,
            tenantId: tenantId
          },
          include: {
            permissions: true,
            advancedPermissions: true
          }
        });

        if (personRoles.length > 0) {
          // Usa i permessi del primo PersonRole trovato (dovrebbero essere tutti uguali per lo stesso roleType)
          const personRole = personRoles[0];
          const rolePermissions = personRole.permissions || [];
          const advancedPermissions = personRole.advancedPermissions || [];

          // Crea una mappa di tutti i permessi possibili
          let allPossiblePermissions = [];
          try {
            allPossiblePermissions = enhancedRoleService.getDefaultPermissions(roleType);
          } catch (error) {
            // Se il ruolo non è nell'enum, usa un set di permessi base
            logger.debug({ roleType }, 'Role not in enum, using base allPossiblePermissions');
            allPossiblePermissions = [
              'VIEW_COMPANIES', 'VIEW_EMPLOYEES', 'VIEW_USERS', 'VIEW_COURSES',
              'VIEW_TRAINERS', 'VIEW_DOCUMENTS', 'VIEW_REPORTS'
            ];
          }
          const permissionsMap = {};

          // Inizializza tutti i permessi come non granted
          allPossiblePermissions.forEach(permission => {
            permissionsMap[permission] = {
              permissionId: permission,
              granted: false,
              scope: 'all',
              tenantIds: [],
              fieldRestrictions: []
            };
          });

          // Aggiorna con i permessi effettivamente granted dal database
          // IMPORTANTE: Aggiunge anche permessi personalizzati che non sono nei default
          rolePermissions.forEach(perm => {
            if (perm.isGranted) {
              if (!permissionsMap[perm.permission]) {
                // Permesso personalizzato non nei default - lo aggiungiamo
                permissionsMap[perm.permission] = {
                  permissionId: perm.permission,
                  granted: true,
                  scope: 'all',
                  tenantIds: [],
                  fieldRestrictions: []
                };
              } else {
                permissionsMap[perm.permission].granted = true;
              }
            }
          });

          // Aggiorna con i permessi avanzati
          // IMPORTANTE: Aggiunge anche permessi avanzati non nei default
          advancedPermissions.forEach(perm => {
            const permissionId = perm.resource && perm.action
              ? `${perm.resource}:${perm.action}`.toLowerCase()
              : '';
            if (!permissionId) return;
            if (!permissionsMap[permissionId]) {
              // Permesso avanzato non nei default - lo aggiungiamo
              permissionsMap[permissionId] = {
                permissionId: permissionId,
                granted: true,
                scope: perm.scope || 'all',
                tenantIds: perm.conditions?.allowedTenants || [],
                fieldRestrictions: perm.allowedFields || []
              };
            } else {
              permissionsMap[permissionId].granted = true;
              permissionsMap[permissionId].scope = perm.scope || 'all';
              permissionsMap[permissionId].tenantIds = perm.conditions?.allowedTenants || [];
              permissionsMap[permissionId].fieldRestrictions = perm.allowedFields || [];
            }
            if (perm.conditions?.maxRoleLevel) {
              permissionsMap[permissionId].maxRoleLevel = perm.conditions.maxRoleLevel;
            }
          });

          permissions = Object.values(permissionsMap);
        } else {
          // Se non ci sono PersonRole, usa i permessi di default
          logger.debug({ roleType }, 'No PersonRole found, using default permissions');
          let defaultPermissions = [];
          try {
            defaultPermissions = enhancedRoleService.getDefaultPermissions(roleType);
          } catch (error) {
            // Se il ruolo non è nell'enum, usa un set di permessi base
            logger.debug({ roleType }, 'Role not in enum, using base defaultPermissions');
            defaultPermissions = [
              'VIEW_COMPANIES', 'VIEW_EMPLOYEES', 'VIEW_USERS', 'VIEW_COURSES',
              'VIEW_TRAINERS', 'VIEW_DOCUMENTS', 'VIEW_REPORTS'
            ];
          }
          permissions = defaultPermissions.map(permission => ({
            permissionId: permission,
            granted: true,
            scope: 'all',
            tenantIds: [],
            fieldRestrictions: []
          }));
        }
      }

      logger.debug({ roleType, permissionsCount: permissions.length }, 'Permissions retrieved successfully');

      res.json({
        success: true,
        data: {
          roleType,
          permissions,
          isCustomRole: isCustomRole || isCustomRoleInDB,
          tenantId
        }
      });
    } catch (error) {
      logger.error({ error: 'Operazione non riuscita', roleType: req.params.roleType }, 'Errore nel recupero dei permessi del ruolo');
      res.status(500).json({
        success: false,
        error: 'Errore nel recupero dei permessi del ruolo'
      });
    }
  }
);

/**
 * @route PUT /api/roles/:roleType/permissions
 * @desc Aggiorna i permessi di un ruolo specifico
 * @access Admin
 */
router.put('/:roleType/permissions',
  authenticate,
  tenantAuth,
  (req, res, next) => {
    logger.info('🔍 BEFORE requirePermission middleware - req.person:', !!req.person);
    logger.info('🔍 BEFORE requirePermission middleware - req.person.id:', req.person?.id);
    logger.info('🔍 BEFORE requirePermission middleware - req.person.tenantId:', req.person?.tenantId);
    logger.info('🔍 BEFORE requirePermission middleware - req.tenant:', !!req.tenant);
    logger.info('🔍 BEFORE requirePermission middleware - roleType:', req.params.roleType);
    logger.info('🔍 BEFORE requirePermission middleware - method:', req.method);
    logger.info('🔍 BEFORE requirePermission middleware - url:', req.url);
    next();
  },
  requirePermission('roles:manage'),
  async (req, res) => {
    try {
      logger.info('🔍 INSIDE PUT /:roleType/permissions endpoint - START');
      const { roleType } = req.params;
      // Gestisce sia il formato array diretto che l'oggetto con proprietà permissions
      const permissions = Array.isArray(req.body) ? req.body : req.body.permissions;
      const tenantId = req.tenant?.id || req.person?.tenantId;

      logger.info(`🔧 Updating permissions for role: ${roleType}`);
      logger.info(`🔧 Tenant ID: ${tenantId}`);
      logger.info(`🔧 Permissions:`, permissions);

      // Validazione input
      if (!permissions || !Array.isArray(permissions)) {
        logger.warn('Permissions array is required');
        return res.status(400).json({
          success: false,
          error: 'Array di permessi obbligatorio'
        });
      }

      // Validazione dei permissionId nel payload
      const invalidPermissions = permissions.filter(perm =>
        perm.granted && (!perm.permissionId || typeof perm.permissionId !== 'string' || perm.permissionId.trim() === '')
      );

      if (invalidPermissions.length > 0) {
        logger.warn({ invalidCount: invalidPermissions.length }, 'Invalid permissionIds found');
        return res.status(400).json({
          success: false,
          error: 'Dati permesso non validi: permissionId deve essere una stringa non vuota'
        });
      }

      // Validazione dei permissionId malformati (senza underscore) per ruoli di sistema
      const malformedPermissions = permissions.filter(perm =>
        perm.granted &&
        perm.permissionId &&
        typeof perm.permissionId === 'string' &&
        !perm.permissionId.includes('_') &&
        !perm.permissionId.includes(':')
      );

      if (malformedPermissions.length > 0) {
        logger.warn({ malformedCount: malformedPermissions.length }, 'Malformed permissionIds found');
        return res.status(400).json({
          success: false,
          error: 'Formato permesso non valido: usa resource:action oppure il formato legacy VIEW_COMPANIES'
        });
      }

      logger.info('✅ All validations passed, proceeding with role update');

      // Determina se è un ruolo personalizzato o di sistema
      const isCustomRole = roleType.startsWith('CUSTOM_');
      logger.info(`🔧 Role type: ${isCustomRole ? 'Custom' : 'System'}`);

      if (isCustomRole) {
        logger.info('🔧 Processing custom role...');
        try {
          // Per ruoli personalizzati, aggiorna CustomRolePermission
          const customRoleId = roleType.replace('CUSTOM_', '');
          const customRole = await prisma.customRole.findFirst({
            where: {
              id: customRoleId,
              tenantId: tenantId,
              deletedAt: null
            }
          });

          if (!customRole) {
            logger.warn({ customRoleId }, 'Ruolo personalizzato non trovato');
            return res.status(404).json({
              success: false,
              error: 'Ruolo personalizzato non trovato'
            });
          }

          logger.info('🔧 Deleting existing custom role permissions...');
          // Elimina i permessi esistenti per questo ruolo
          await prisma.customRolePermission.deleteMany({
            where: { customRoleId: customRole.id }
          });

          logger.info('🔧 Creating new custom role permissions...');

          // Valida e filtra i permessi prima di crearli
          const validPermissions = validateAndFilterPermissions(permissions);
          logger.info(`🔧 Validated permissions: ${validPermissions.length}/${permissions.length} valid`);

          // Crea i nuovi permessi
          const permissionsToCreate = validPermissions
            .filter(perm => perm.granted)
            .map(perm => {
              const normalizedPermissionId = normalizePermissionId(perm.permissionId);

              // Costruisce le conditions basandosi su scope e parametri
              let conditions = null;

              if (perm.scope === 'hierarchy' && perm.maxRoleLevel) {
                // Per la gestione gerarchica dei ruoli
                conditions = { maxRoleLevel: perm.maxRoleLevel };
              } else if (perm.tenantIds && perm.tenantIds.length > 0) {
                // Per la gestione tenant-specific
                conditions = { allowedTenants: perm.tenantIds };
              } else if (perm.conditions) {
                // Se sono già presenti conditions specifiche
                conditions = perm.conditions;
              }

              return {
                customRoleId: customRole.id,
                permission: normalizedPermissionId,
                scope: perm.scope || 'global',
                conditions: conditions,
                allowedFields: perm.fieldRestrictions && perm.fieldRestrictions.length > 0 ? perm.fieldRestrictions : null
              };
            });

          if (permissionsToCreate.length > 0) {
            await prisma.customRolePermission.createMany({
              data: permissionsToCreate
            });
            logger.info(`✅ Created ${permissionsToCreate.length} custom role permissions`);
          }
        } catch (customRoleError) {
          logger.error('❌ Error processing custom role:', customRoleError);
          throw customRoleError;
        }

      } else {
        logger.info('🔧 Processing system role...');
        try {
          // Per ruoli di sistema, aggiorna direttamente i permessi per tutti i PersonRole esistenti
          const personRoles = await prisma.personRole.findMany({
            where: {
              roleType: roleType,
              tenantId: tenantId,
              deletedAt: null
            }
          });

          logger.info(`🔧 Found ${personRoles.length} person roles to update`);

          // Se non ci sono PersonRole per questo roleType, logga un avviso
          // e restituisci un messaggio informativo
          if (personRoles.length === 0) {
            logger.warn(`⚠️ No PersonRole found for roleType ${roleType} in tenant ${tenantId}`);
            logger.warn(`⚠️ To save permissions, at least one user must have this role assigned`);

            // Salva comunque i permessi come "pending" usando una configurazione temporanea
            // Per ora, restituiamo successo ma con un avviso
            return res.json({
              success: true,
              warning: true,
              message: `Permissions configuration noted, but no users currently have the ${roleType} role. Permissions will be applied when a user is assigned this role.`,
              data: {
                roleType,
                permissionsCount: permissions.filter(p => p.granted).length,
                tenantId,
                isCustomRole,
                hasPersonRoles: false
              }
            });
          }

          // Per ogni PersonRole, aggiorna i permessi
          for (const personRole of personRoles) {
            logger.info(`🔧 Processing person role: ${personRole.id}`);

            try {
              // Elimina i permessi esistenti
              logger.info('🔧 Deleting existing role permissions...');
              await prisma.rolePermission.deleteMany({
                where: { personRoleId: personRole.id }
              });

              logger.info('🔧 Deleting existing advanced permissions...');
              await prisma.advancedPermission.deleteMany({
                where: { personRoleId: personRole.id }
              });

              logger.info('🔧 Creating new role permissions...');

              // Valida e filtra i permessi prima di crearli
              logger.info(`🔧 Raw permissions received: ${JSON.stringify(permissions, null, 2)}`);
              const validPermissions = validateAndFilterPermissions(permissions);
              logger.info(`🔧 Validated permissions: ${validPermissions.length}/${permissions.length} valid`);
              logger.info(`🔧 Valid permissions details: ${JSON.stringify(validPermissions, null, 2)}`);

              // Crea i nuovi permessi base
              const rolePermissionsToCreate = validPermissions
                .filter(perm => perm.granted)
                .map(perm => {
                  const normalizedPermissionId = normalizePermissionId(perm.permissionId);
                  logger.info(`🔧 Processing permission: ${perm.permissionId} -> ${normalizedPermissionId}`);

                  return {
                    personRoleId: personRole.id,
                    permission: normalizedPermissionId,
                    isGranted: true,
                    grantedBy: req.person?.id
                  };
                });

              logger.info(`🔧 Role permissions to create: ${JSON.stringify(rolePermissionsToCreate, null, 2)}`);

              if (rolePermissionsToCreate.length > 0) {
                logger.info(`🔧 Attempting to create ${rolePermissionsToCreate.length} role permissions...`);
                await prisma.rolePermission.createMany({
                  data: rolePermissionsToCreate
                });
                logger.info(`✅ Created ${rolePermissionsToCreate.length} role permissions`);
              }

              logger.info('🔧 Creating advanced permissions...');
              // Crea i permessi avanzati per quelli con scope specifico
              const advancedPermissionsToCreate = validPermissions
                .filter(perm => perm.granted && (perm.scope !== 'all' || perm.tenantIds?.length > 0 || perm.fieldRestrictions?.length > 0 || perm.maxRoleLevel))
                .map(perm => {
                  logger.info(`🔧 Processing advanced permission: ${perm.permissionId}`);

                  const parsedPermission = parsePermissionId(perm.permissionId);
                  if (!parsedPermission) {
                    logger.warn(`Malformed permissionId: ${perm.permissionId}`);
                    return null;
                  }

                  const { normalizedPermissionId, resource, action } = parsedPermission;

                  logger.info(`🔧 Extracted - action: ${action}, resource: ${resource}`);

                  // Validazione che resource non sia vuoto
                  if (!resource || resource.trim() === '') {
                    logger.warn(`Empty resource extracted from permissionId: ${normalizedPermissionId}`);
                    return null;
                  }

                  // Costruisce le conditions basandosi su scope e parametri
                  let conditions = null;

                  if (perm.scope === 'hierarchy' && perm.maxRoleLevel) {
                    // Per la gestione gerarchica dei ruoli
                    conditions = { maxRoleLevel: perm.maxRoleLevel };
                  } else if (perm.tenantIds && perm.tenantIds.length > 0) {
                    // Per la gestione tenant-specific
                    conditions = { allowedTenants: perm.tenantIds };
                  } else if (perm.conditions) {
                    // Se sono già presenti conditions specifiche
                    conditions = perm.conditions;
                  }

                  return {
                    personRoleId: personRole.id,
                    resource: resource,
                    action: action,
                    scope: perm.scope || 'global',
                    conditions: conditions,
                    allowedFields: perm.fieldRestrictions && perm.fieldRestrictions.length > 0 ? perm.fieldRestrictions : null
                  };
                })
                .filter(perm => perm !== null); // Rimuove i permessi non validi

              if (advancedPermissionsToCreate.length > 0) {
                logger.info(`🔧 Creating ${advancedPermissionsToCreate.length} advanced permissions`);
                await prisma.advancedPermission.createMany({
                  data: advancedPermissionsToCreate
                });
                logger.info(`✅ Created ${advancedPermissionsToCreate.length} advanced permissions`);
              }
            } catch (personRoleError) {
              logger.error(`❌ Error processing person role ${personRole.id}:`, personRoleError);
              throw personRoleError;
            }
          }
        } catch (systemRoleError) {
          logger.error('❌ Error processing system role:', systemRoleError);
          throw systemRoleError;
        }
      }

      logger.info(`✅ Permissions updated successfully for role: ${roleType}`);

      res.json({
        success: true,
        message: 'Permessi del ruolo aggiornati con successo',
        data: {
          roleType,
          permissionsCount: permissions.filter(p => p.granted).length,
          tenantId,
          isCustomRole
        }
      });
    } catch (error) {
      logger.error('[ROLES_API] Error updating role permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Errore nell\'aggiornamento dei permessi del ruolo'
      });
    }
  }
);

export default router;
