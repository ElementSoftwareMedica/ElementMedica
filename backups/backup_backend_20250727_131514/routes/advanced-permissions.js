import express from 'express';
import { PrismaClient } from '@prisma/client';
import enhancedRoleService from '../services/enhancedRoleService.js';
import { authenticateAdvanced } from '../middleware/auth-advanced.js';
import { tenantMiddleware } from '../middleware/tenant.js';

const router = express.Router();
const prisma = new PrismaClient();

// Applica middleware globali
router.use(authenticateAdvanced);
router.use(tenantMiddleware);

/**
 * @route GET /api/advanced-permissions/resources
 * @desc Ottiene tutte le risorse disponibili per i permessi
 * @access Admin
 */
router.get('/resources',
  enhancedRoleService.requirePermission('roles.read'),
  async (req, res) => {
    try {
      const resources = {
        person: {
          name: 'Persone',
          actions: ['read', 'create', 'update', 'delete'],
          fields: [
            'id', 'firstName', 'lastName', 'email', 'username',
            'phone', 'address', 'city', 'province', 'cap',
            'fiscalCode', 'birthDate', 'birthPlace', 'nationality',
            'isActive', 'lastLogin', 'createdAt', 'updatedAt'
          ]
        },
        company: {
          name: 'Aziende',
          actions: ['read', 'create', 'update', 'delete'],
          fields: [
            'id', 'ragioneSociale', 'partitaIva', 'codiceFiscale',
            'indirizzo', 'citta', 'provincia', 'cap', 'telefono',
            'email', 'pec', 'sito_web', 'settore', 'dipendenti_count',
            'isActive', 'createdAt', 'updatedAt'
          ]
        },
        course: {
          name: 'Corsi',
          actions: ['read', 'create', 'update', 'delete', 'assign'],
          fields: [
            'id', 'title', 'description', 'duration', 'category',
            'level', 'price', 'maxParticipants', 'isActive',
            'createdAt', 'updatedAt'
          ]
        },
        training: {
          name: 'Formazioni',
          actions: ['read', 'create', 'update', 'delete', 'conduct'],
          fields: [
            'id', 'title', 'description', 'startDate', 'endDate',
            'location', 'status', 'participantsCount', 'maxParticipants',
            'createdAt', 'updatedAt'
          ]
        }
      };

      res.json({
        success: true,
        data: resources
      });
    } catch (error) {
      console.error('[ADVANCED_PERMISSIONS] Error getting resources:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get resources'
      });
    }
  }
);

/**
 * @route GET /api/advanced-permissions/scopes
 * @desc Ottiene tutti gli scope disponibili per i permessi
 * @access Admin
 */
router.get('/scopes',
  enhancedRoleService.requirePermission('roles.read'),
  async (req, res) => {
    try {
      const scopes = {
        global: {
          name: 'Globale',
          description: 'Accesso completo a tutte le risorse del sistema'
        },
        tenant: {
          name: 'Tenant',
          description: 'Accesso limitato alle risorse del tenant corrente'
        },
        company: {
          name: 'Azienda',
          description: 'Accesso limitato alle risorse della propria azienda'
        },
        department: {
          name: 'Dipartimento',
          description: 'Accesso limitato alle risorse del proprio dipartimento'
        },
        self: {
          name: 'Personale',
          description: 'Accesso limitato alle proprie risorse'
        }
      };

      res.json({
        success: true,
        data: scopes
      });
    } catch (error) {
      console.error('[ADVANCED_PERMISSIONS] Error getting scopes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get scopes'
      });
    }
  }
);

/**
 * @route GET /api/advanced-permissions/conditions
 * @desc Ottiene tutte le condizioni disponibili per i permessi
 * @access Admin
 */
router.get('/conditions',
  enhancedRoleService.requirePermission('roles.read'),
  async (req, res) => {
    try {
      const conditions = {
        ownedBy: {
          name: 'Proprietario',
          description: 'Può accedere solo alle risorse di cui è proprietario',
          values: ['self']
        },
        companyId: {
          name: 'Azienda',
          description: 'Può accedere solo alle risorse della stessa azienda',
          values: ['same', 'any']
        },
        departmentId: {
          name: 'Dipartimento',
          description: 'Può accedere solo alle risorse dello stesso dipartimento',
          values: ['same', 'any']
        },
        status: {
          name: 'Stato',
          description: 'Può accedere solo alle risorse con uno stato specifico',
          values: ['active', 'inactive', 'pending', 'completed']
        }
      };

      res.json({
        success: true,
        data: conditions
      });
    } catch (error) {
      console.error('[ADVANCED_PERMISSIONS] Error getting conditions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get conditions'
      });
    }
  }
);

/**
 * @route POST /api/advanced-permissions/validate
 * @desc Valida una configurazione di permessi avanzati
 * @access Admin
 */
router.post('/validate',
  enhancedRoleService.requirePermission('roles.manage'),
  async (req, res) => {
    try {
      const { resource, action, scope, allowedFields, conditions } = req.body;
      const errors = [];

      // Validazione risorsa
      const validResources = ['person', 'company', 'course', 'training'];
      if (!resource || !validResources.includes(resource)) {
        errors.push('Resource must be one of: ' + validResources.join(', '));
      }

      // Validazione azione
      const validActions = ['read', 'create', 'update', 'delete', 'assign', 'conduct'];
      if (!action || !validActions.includes(action)) {
        errors.push('Action must be one of: ' + validActions.join(', '));
      }

      // Validazione scope
      const validScopes = ['global', 'tenant', 'company', 'department', 'self'];
      if (!scope || !validScopes.includes(scope)) {
        errors.push('Scope must be one of: ' + validScopes.join(', '));
      }

      // Validazione campi consentiti
      if (allowedFields && !Array.isArray(allowedFields)) {
        errors.push('AllowedFields must be an array');
      }

      // Validazione condizioni
      if (conditions && typeof conditions !== 'object') {
        errors.push('Conditions must be an object');
      }

      const isValid = errors.length === 0;

      res.json({
        success: true,
        data: {
          isValid,
          errors,
          configuration: {
            resource,
            action,
            scope,
            allowedFields,
            conditions
          }
        }
      });
    } catch (error) {
      console.error('[ADVANCED_PERMISSIONS] Error validating configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate configuration'
      });
    }
  }
);

/**
 * @route GET /api/advanced-permissions/preview
 * @desc Anteprima dell'effetto di una configurazione di permessi
 * @access Admin
 */
router.get('/preview',
  enhancedRoleService.requirePermission('roles.read'),
  async (req, res) => {
    try {
      const { resource, action, scope, allowedFields, conditions, roleType } = req.query;
      const tenantId = req.tenant.id;

      // Simula l'applicazione dei permessi
      let sampleData = {};
      let filteredData = {};

      // Genera dati di esempio in base alla risorsa
      switch (resource) {
        case 'person':
          sampleData = {
            id: 1,
            firstName: 'Mario',
            lastName: 'Rossi',
            email: 'mario.rossi@example.com',
            username: 'mario.rossi',
            phone: '+39 123 456 7890',
            address: 'Via Roma 123',
            city: 'Milano',
            province: 'MI',
            cap: '20100',
            fiscalCode: 'RSSMRA80A01F205X',
            birthDate: '1980-01-01',
            birthPlace: 'Milano',
            nationality: 'Italiana',
            isActive: true,
            lastLogin: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          break;
        case 'company':
          sampleData = {
            id: 1,
            ragioneSociale: 'Esempio S.r.l.',
            partitaIva: '12345678901',
            codiceFiscale: '12345678901',
            indirizzo: 'Via Milano 456',
            citta: 'Roma',
            provincia: 'RM',
            cap: '00100',
            telefono: '+39 06 123 4567',
            email: 'info@esempio.it',
            pec: 'pec@esempio.it',
            sito_web: 'https://www.esempio.it',
            settore: 'Tecnologia',
            dipendenti_count: 50,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          break;
        default:
          sampleData = { id: 1, name: 'Esempio', description: 'Dati di esempio' };
      }

      // Applica il filtro dei campi se specificato
      if (allowedFields && Array.isArray(allowedFields)) {
        const allowedFieldsSet = new Set(allowedFields);
        filteredData = {};
        allowedFieldsSet.forEach(field => {
          if (sampleData.hasOwnProperty(field)) {
            filteredData[field] = sampleData[field];
          }
        });
        // Aggiungi sempre l'ID
        if (sampleData.id && !filteredData.id) {
          filteredData.id = sampleData.id;
        }
      } else {
        filteredData = sampleData;
      }

      res.json({
        success: true,
        data: {
          configuration: {
            resource,
            action,
            scope,
            allowedFields,
            conditions,
            roleType
          },
          preview: {
            originalData: sampleData,
            filteredData,
            fieldsRemoved: Object.keys(sampleData).filter(key => !filteredData.hasOwnProperty(key)),
            fieldsKept: Object.keys(filteredData)
          }
        }
      });
    } catch (error) {
      console.error('[ADVANCED_PERMISSIONS] Error generating preview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate preview'
      });
    }
  }
);

export default router;