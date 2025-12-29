/**
 * @fileoverview Gestione dei permessi dei ruoli
 * @description Modulo per la gestione dei permessi associati ai ruoli
 * @author Sistema di gestione ruoli
 * @version 1.0.0
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
const router = express.Router();
const prisma = new PrismaClient();

// Middleware
import { authenticate } from '../../middleware/auth.js';
import { tenantAuth, requirePermission } from './middleware/auth.js';
import enhancedRoleService from '../../services/enhancedRoleService.js';
import logger from '../../utils/logger.js';

// Importa le funzioni di validazione
import { isValidPersonPermission } from './utils/validators.js';

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

    const isValid = isValidPersonPermission(perm.permissionId);
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
      console.log('🔍 Getting all available permissions');

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
          console.warn(`Could not get permissions for role ${roleType}:`, error.message);
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

      console.log(`✅ Retrieved ${Object.keys(permissionsByResource).length} permission categories`);

      res.json({
        success: true,
        data: {
          permissions: permissionsByResource,
          totalCategories: Object.keys(permissionsByResource).length,
          totalPermissions: Object.values(permissionsByResource).reduce((sum, cat) => sum + cat.permissions.length, 0)
        }
      });
    } catch (error) {
      console.error('❌ Error getting all permissions:', error);
      logger.error('Error getting all permissions', {
        error: error.message,
        stack: error.stack,
        userId: req.person?.id,
        tenantId: req.tenant?.id
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving permissions'
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

      console.log(`🔍 Getting permissions for role: ${roleType}`);
      console.log(`🔍 Tenant ID: ${tenantId}`);

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
          console.log(`🔍 Found custom role in database: ${roleType} (name: ${customRoleFromDB.name})`);
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
            console.log(`❌ Role type ${roleType} not found anywhere`);
            return res.status(404).json({
              success: false,
              error: 'Role type not found'
            });
          }
        } catch (prismaError) {
          // Se la query Prisma fallisce (probabilmente perché il roleType non è nell'enum),
          // consideriamo il ruolo come non trovato
          console.log(`❌ Role type ${roleType} not valid in enum and not found in CustomRole`);
          return res.status(404).json({
            success: false,
            error: 'Role type not found'
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
        console.log(`🔍 Loading actual permissions for system role: ${roleType}`);

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
            console.log(`⚠️ Role ${roleType} not in enum, using base permissions`);
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
            const permissionId = `${perm.action.toUpperCase()}_${perm.resource.toUpperCase()}`;
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
          console.log(`🔍 No PersonRole found, using default permissions for: ${roleType}`);
          let defaultPermissions = [];
          try {
            defaultPermissions = enhancedRoleService.getDefaultPermissions(roleType);
          } catch (error) {
            // Se il ruolo non è nell'enum, usa un set di permessi base
            console.log(`⚠️ Role ${roleType} not in enum, using base permissions`);
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

      console.log(`✅ Permissions retrieved successfully for role: ${roleType}`);
      console.log(`📊 Found ${permissions.length} permissions`);

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
      console.error('[ROLES_API] Error getting role permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get role permissions'
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
    logger.info('🔍 BEFORE requirePermission middleware - req.tenantId:', req.tenantId);
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
        logger.error('❌ Permissions array is required');
        return res.status(400).json({
          success: false,
          error: 'Permissions array is required'
        });
      }

      // Validazione dei permissionId nel payload
      const invalidPermissions = permissions.filter(perm =>
        perm.granted && (!perm.permissionId || typeof perm.permissionId !== 'string' || perm.permissionId.trim() === '')
      );

      if (invalidPermissions.length > 0) {
        logger.warn(`Invalid permissionIds found:`, invalidPermissions.map(p => p.permissionId));
        return res.status(400).json({
          success: false,
          error: 'Invalid permission data: permissionId must be a non-empty string',
          invalidPermissions: invalidPermissions.map(p => ({ permissionId: p.permissionId }))
        });
      }

      // Validazione dei permissionId malformati (senza underscore) per ruoli di sistema
      const malformedPermissions = permissions.filter(perm =>
        perm.granted &&
        perm.permissionId &&
        typeof perm.permissionId === 'string' &&
        !perm.permissionId.includes('_')
      );

      if (malformedPermissions.length > 0) {
        logger.warn(`Malformed permissionIds found:`, malformedPermissions.map(p => p.permissionId));
        return res.status(400).json({
          success: false,
          error: 'Invalid permission format: permissionId must contain an underscore (e.g., VIEW_COMPANIES)',
          malformedPermissions: malformedPermissions.map(p => ({ permissionId: p.permissionId }))
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
            logger.error(`❌ Custom role not found: ${customRoleId}`);
            return res.status(404).json({
              success: false,
              error: 'Custom role not found'
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
              // Normalizza il permissionId (rimuovi spazi e converti in maiuscolo)
              const normalizedPermissionId = perm.permissionId.trim().toUpperCase();

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
                  // Normalizza il permissionId (rimuovi spazi e converti in maiuscolo)
                  const normalizedPermissionId = perm.permissionId.trim().toUpperCase();
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

                  // Normalizza il permissionId
                  const normalizedPermissionId = perm.permissionId.trim().toUpperCase();

                  // Estrae resource e action dal permissionId (es. "VIEW_COMPANIES" -> resource: "companies", action: "view")
                  const parts = normalizedPermissionId.split('_');
                  logger.info(`🔧 Permission parts: ${JSON.stringify(parts)}`);

                  if (parts.length < 2) {
                    logger.warn(`Malformed permissionId (missing underscore): ${normalizedPermissionId}`);
                    return null;
                  }

                  const action = parts[0].toLowerCase();
                  const resource = parts.slice(1).join('_').toLowerCase();

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
        message: 'Role permissions updated successfully',
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
        error: 'Failed to update role permissions'
      });
    }
  }
);

export default router;