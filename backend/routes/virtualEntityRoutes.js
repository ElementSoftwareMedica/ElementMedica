/**
 * Route per la gestione delle entità virtuali Dipendenti e Formatori
 * Queste route forniscono endpoint specifici per gestire Dipendenti e Formatori
 * come entità virtuali basate su Person con filtri di ruolo
 */

import express from 'express';
import { body } from 'express-validator';
import personController from '../controllers/personController.js';
import middleware from '../auth/middleware.js';
import { employeesMiddleware, trainersMiddleware } from '../middleware/virtualEntityMiddleware.js';
import { getPersonsInVirtualEntity } from '../services/virtualEntityPermissions.js';
import logger from '../utils/logger.js';

const employeesRouter = express.Router();
const trainersRouter = express.Router();
const virtualEntitiesRouter = express.Router();

const { authenticate: authenticateToken, auditLog } = middleware;

// ===== ROUTE PER DIPENDENTI (ENTITÀ VIRTUALE) =====

// GET /api/employees - Lista tutti i dipendenti
employeesRouter.get('/', 
  authenticateToken(),
  ...employeesMiddleware.list(),
  auditLog('VIEW_EMPLOYEES'),
  async (req, res) => {
    try {
      const tenantId = req.tenant?.id;
      const companyId = req.query.companyId;
      
      const employees = await getPersonsInVirtualEntity('EMPLOYEES', tenantId, companyId);
      
      res.json({
        success: true,
        data: employees,
        total: employees.length,
        entityType: 'employees'
      });
    } catch (error) {
      logger.error('Errore nel recupero dipendenti:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nel recupero dei dipendenti'
      });
    }
  }
);

// GET /api/employees/export - Esporta dipendenti (DEVE essere prima di /:id)
employeesRouter.get('/export', 
  authenticateToken(),
  ...employeesMiddleware.view(),
  auditLog('EXPORT_EMPLOYEES'),
  async (req, res) => {
    try {
      req.virtualEntity = { name: 'EMPLOYEES', type: 'employee' };
      await personController.exportPersons(req, res);
    } catch (error) {
      logger.error('Errore nell\'esportazione dipendenti:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nell\'esportazione dei dipendenti'
      });
    }
  }
);

// GET /api/employees/:id - Ottieni dipendente specifico
employeesRouter.get('/:id', 
  authenticateToken(),
  ...employeesMiddleware.view(),
  auditLog('VIEW_EMPLOYEE'),
  personController.getPersonById
);

// POST /api/employees - Crea nuovo dipendente
employeesRouter.post('/', 
  authenticateToken(),
  ...employeesMiddleware.create(),
  body('firstName').notEmpty().withMessage('Nome richiesto'),
  body('lastName').notEmpty().withMessage('Cognome richiesto'),
  body('email').isEmail().withMessage('Email valida richiesta'),
  body('roleType').isIn(['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'TRAINER_COORDINATOR', 'EMPLOYEE'])
    .withMessage('Tipo di ruolo non valido per dipendente'),
  auditLog('CREATE_EMPLOYEE'),
  async (req, res) => {
    try {
      // Aggiungi metadati per identificare come dipendente
      req.body.entityType = 'employee';
      req.body.virtualEntity = 'EMPLOYEES';
      
      // Delega al controller delle persone
      await personController.createPerson(req, res);
    } catch (error) {
      logger.error('Errore nella creazione dipendente:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nella creazione del dipendente'
      });
    }
  }
);

// PUT /api/employees/:id - Aggiorna dipendente
employeesRouter.put('/:id', 
  authenticateToken(),
  ...employeesMiddleware.edit(),
  body('firstName').optional().notEmpty().withMessage('Nome non può essere vuoto'),
  body('lastName').optional().notEmpty().withMessage('Cognome non può essere vuoto'),
  body('email').optional().isEmail().withMessage('Email non valida'),
  auditLog('UPDATE_EMPLOYEE'),
  async (req, res) => {
    try {
      // Aggiungi metadati per identificare come dipendente
      req.body.entityType = 'employee';
      req.body.virtualEntity = 'EMPLOYEES';
      
      // Delega al controller delle persone
      await personController.updatePerson(req, res);
    } catch (error) {
      logger.error('Errore nell\'aggiornamento dipendente:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nell\'aggiornamento del dipendente'
      });
    }
  }
);

// DELETE /api/employees/:id - Elimina dipendente
employeesRouter.delete('/:id', 
  authenticateToken(),
  ...employeesMiddleware.delete(),
  auditLog('DELETE_EMPLOYEE'),
  async (req, res) => {
    try {
      // Aggiungi metadati per identificare come dipendente
      req.virtualEntity = { name: 'EMPLOYEES', type: 'employee' };
      
      // Delega al controller delle persone
      await personController.deletePerson(req, res);
    } catch (error) {
      logger.error('Errore nell\'eliminazione dipendente:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nell\'eliminazione del dipendente'
      });
    }
  }
);

// ===== ROUTE PER FORMATORI (ENTITÀ VIRTUALE) =====

// GET /api/trainers - Lista tutti i formatori
trainersRouter.get('/', 
  authenticateToken(),
  ...trainersMiddleware.list(),
  auditLog('VIEW_TRAINERS'),
  async (req, res) => {
    try {
      const tenantId = req.tenant?.id;
      const companyId = req.query.companyId;
      
      const trainers = await getPersonsInVirtualEntity('TRAINERS', tenantId, companyId);
      
      res.json({
        success: true,
        data: trainers,
        total: trainers.length,
        entityType: 'trainers'
      });
    } catch (error) {
      logger.error('Errore nel recupero formatori:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nel recupero dei formatori'
      });
    }
  }
);

// GET /api/trainers/export - Esporta formatori (DEVE essere prima di /:id)
trainersRouter.get('/export', 
  authenticateToken(),
  ...trainersMiddleware.view(),
  auditLog('EXPORT_TRAINERS'),
  async (req, res) => {
    try {
      req.virtualEntity = { name: 'TRAINERS', type: 'trainer' };
      await personController.exportPersons(req, res);
    } catch (error) {
      logger.error('Errore nell\'esportazione formatori:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nell\'esportazione dei formatori'
      });
    }
  }
);

// GET /api/trainers/:id - Ottieni formatore specifico
trainersRouter.get('/:id', 
  authenticateToken(),
  ...trainersMiddleware.view(),
  auditLog('VIEW_TRAINER'),
  personController.getPersonById
);

// POST /api/trainers - Crea nuovo formatore
trainersRouter.post('/', 
  authenticateToken(),
  ...trainersMiddleware.create(),
  body('firstName').notEmpty().withMessage('Nome richiesto'),
  body('lastName').notEmpty().withMessage('Cognome richiesto'),
  body('email').isEmail().withMessage('Email valida richiesta'),
  body('roleType').isIn(['TRAINER_COORDINATOR', 'SENIOR_TRAINER', 'TRAINER', 'EXTERNAL_TRAINER'])
    .withMessage('Tipo di ruolo non valido per formatore'),
  auditLog('CREATE_TRAINER'),
  async (req, res) => {
    try {
      // Aggiungi metadati per identificare come formatore
      req.body.entityType = 'trainer';
      req.body.virtualEntity = 'TRAINERS';
      
      // Delega al controller delle persone
      await personController.createPerson(req, res);
    } catch (error) {
      logger.error('Errore nella creazione formatore:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nella creazione del formatore'
      });
    }
  }
);

// PUT /api/trainers/:id - Aggiorna formatore
trainersRouter.put('/:id', 
  authenticateToken(),
  ...trainersMiddleware.edit(),
  body('firstName').optional().notEmpty().withMessage('Nome non può essere vuoto'),
  body('lastName').optional().notEmpty().withMessage('Cognome non può essere vuoto'),
  body('email').optional().isEmail().withMessage('Email non valida'),
  auditLog('UPDATE_TRAINER'),
  async (req, res) => {
    try {
      // Aggiungi metadati per identificare come formatore
      req.body.entityType = 'trainer';
      req.body.virtualEntity = 'TRAINERS';
      
      // Delega al controller delle persone
      await personController.updatePerson(req, res);
    } catch (error) {
      logger.error('Errore nell\'aggiornamento formatore:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nell\'aggiornamento del formatore'
      });
    }
  }
);

// DELETE /api/trainers/:id - Elimina formatore
trainersRouter.delete('/:id', 
  authenticateToken(),
  ...trainersMiddleware.delete(),
  auditLog('DELETE_TRAINER'),
  async (req, res) => {
    try {
      // Aggiungi metadati per identificare come formatore
      req.virtualEntity = { name: 'TRAINERS', type: 'trainer' };
      
      // Delega al controller delle persone
      await personController.deletePerson(req, res);
    } catch (error) {
      logger.error('Errore nell\'eliminazione formatore:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nell\'eliminazione del formatore'
      });
    }
  }
);

// ===== ROUTE COMUNI PER ENTITÀ VIRTUALI =====

// GET /api/virtual-entities/employees - Lista dipendenti (entità virtuale)
virtualEntitiesRouter.get('/employees', 
  authenticateToken(),
  ...employeesMiddleware.list(),
  auditLog('VIEW_VIRTUAL_EMPLOYEES'),
  async (req, res) => {
    try {
      const tenantId = req.tenant?.id;
      const companyId = req.query.companyId;
      
      const employees = await getPersonsInVirtualEntity('EMPLOYEES', tenantId, companyId);
      
      res.json({
        success: true,
        data: employees,
        total: employees.length,
        entityType: 'employees'
      });
    } catch (error) {
      logger.error('Errore nel recupero dipendenti virtuali:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nel recupero dei dipendenti'
      });
    }
  }
);

// GET /api/virtual-entities/trainers - Lista formatori (entità virtuale)
virtualEntitiesRouter.get('/trainers', 
  authenticateToken(),
  ...trainersMiddleware.list(),
  auditLog('VIEW_VIRTUAL_TRAINERS'),
  async (req, res) => {
    try {
      const tenantId = req.tenant?.id;
      const companyId = req.query.companyId;
      
      const trainers = await getPersonsInVirtualEntity('TRAINERS', tenantId, companyId);
      
      res.json({
        success: true,
        data: trainers,
        total: trainers.length,
        entityType: 'trainers'
      });
    } catch (error) {
      logger.error('Errore nel recupero formatori virtuali:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nel recupero dei formatori'
      });
    }
  }
);

// GET /api/virtual-entities/export-trainers - Esporta formatori (entità virtuale)
virtualEntitiesRouter.get('/export-trainers', 
  authenticateToken(),
  ...trainersMiddleware.view(),
  auditLog('EXPORT_VIRTUAL_TRAINERS'),
  async (req, res) => {
    try {
      req.virtualEntity = { name: 'TRAINERS', type: 'trainer' };
      await personController.exportPersons(req, res);
    } catch (error) {
      logger.error('Errore nell\'esportazione formatori virtuali:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nell\'esportazione dei formatori'
      });
    }
  }
);

// GET /api/virtual-entities/permissions - Ottieni permessi entità virtuali per l'utente corrente
virtualEntitiesRouter.get('/permissions', 
  authenticateToken(),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const tenantId = req.tenant?.id;
      
      if (!userId || !tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Utente o tenant non autenticato'
        });
      }
      
      // Ottieni i permessi dell'utente per le entità virtuali
      const { getRoleVirtualEntityPermissions } = await import('../services/virtualEntityPermissions.js');
      
      const userRoles = req.user.roles || [];
      const permissions = {
        employees: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          export: false
        },
        trainers: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          export: false
        }
      };
      
      // Controlla i permessi per ogni ruolo dell'utente
      for (const role of userRoles) {
        const rolePermissions = await getRoleVirtualEntityPermissions(role.id, tenantId);
        
        // Merge dei permessi
        if (rolePermissions.employees) {
          permissions.employees.view = permissions.employees.view || rolePermissions.employees.view;
          permissions.employees.create = permissions.employees.create || rolePermissions.employees.create;
          permissions.employees.edit = permissions.employees.edit || rolePermissions.employees.edit;
          permissions.employees.delete = permissions.employees.delete || rolePermissions.employees.delete;
          permissions.employees.export = permissions.employees.export || rolePermissions.employees.export;
        }
        
        if (rolePermissions.trainers) {
          permissions.trainers.view = permissions.trainers.view || rolePermissions.trainers.view;
          permissions.trainers.create = permissions.trainers.create || rolePermissions.trainers.create;
          permissions.trainers.edit = permissions.trainers.edit || rolePermissions.trainers.edit;
          permissions.trainers.delete = permissions.trainers.delete || rolePermissions.trainers.delete;
          permissions.trainers.export = permissions.trainers.export || rolePermissions.trainers.export;
        }
      }
      
      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      logger.error('Errore nel recupero permessi entità virtuali:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nel recupero dei permessi'
      });
    }
  }
);

// POST /api/virtual-entities/permissions/assign - Assegna permessi entità virtuali a un ruolo
virtualEntitiesRouter.post('/permissions/assign',
  authenticateToken(),
  body('roleId').notEmpty().withMessage('ID ruolo richiesto'),
  body('virtualEntityName').isIn(['EMPLOYEES', 'TRAINERS']).withMessage('Nome entità virtuale non valido'),
  body('permissions').isArray().withMessage('Lista permessi richiesta'),
  async (req, res) => {
    try {
      const { roleId, virtualEntityName, permissions } = req.body;
      const grantedBy = req.user?.id;
      
      if (!grantedBy) {
        return res.status(401).json({
          success: false,
          message: 'Utente non autenticato'
        });
      }
      
      const { assignVirtualEntityPermissions } = await import('../services/virtualEntityPermissions.js');
      
      await assignVirtualEntityPermissions(roleId, virtualEntityName, permissions, grantedBy);
      
      res.json({
        success: true,
        message: `Permessi ${virtualEntityName} assegnati al ruolo`
      });
    } catch (error) {
      logger.error('Errore nell\'assegnazione permessi entità virtuali:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nell\'assegnazione dei permessi'
      });
    }
  }
);

// DELETE /api/virtual-entities/permissions/revoke - Rimuove permessi entità virtuali da un ruolo
virtualEntitiesRouter.delete('/permissions/revoke',
  authenticateToken(),
  body('roleId').notEmpty().withMessage('ID ruolo richiesto'),
  body('virtualEntityName').isIn(['EMPLOYEES', 'TRAINERS']).withMessage('Nome entità virtuale non valido'),
  body('permissions').isArray().withMessage('Lista permessi richiesta'),
  async (req, res) => {
    try {
      const { roleId, virtualEntityName, permissions } = req.body;
      
      const { revokeVirtualEntityPermissions } = await import('../services/virtualEntityPermissions.js');
      
      await revokeVirtualEntityPermissions(roleId, virtualEntityName, permissions);
      
      res.json({
        success: true,
        message: `Permessi ${virtualEntityName} rimossi dal ruolo`
      });
    } catch (error) {
      logger.error('Errore nella rimozione permessi entità virtuali:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nella rimozione dei permessi'
      });
    }
  }
);

// GET /api/virtual-entities/permissions/role/:roleId - Ottieni permessi entità virtuali di un ruolo
virtualEntitiesRouter.get('/permissions/role/:roleId',
  authenticateToken(),
  async (req, res) => {
    try {
      const { roleId } = req.params;
      
      const { getRoleVirtualEntityPermissions } = await import('../services/virtualEntityPermissions.js');
      
      const permissions = await getRoleVirtualEntityPermissions(roleId);
      
      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      logger.error('Errore nel recupero permessi ruolo entità virtuali:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nel recupero dei permessi del ruolo'
      });
    }
  }
);

// POST /api/virtual-entities/permissions/check - Verifica permesso specifico su entità virtuale
virtualEntitiesRouter.post('/permissions/check',
  authenticateToken(),
  body('virtualEntityName').isIn(['EMPLOYEES', 'TRAINERS']).withMessage('Nome entità virtuale non valido'),
  body('action').isIn(['VIEW', 'CREATE', 'EDIT', 'DELETE']).withMessage('Azione non valida'),
  async (req, res) => {
    try {
      const { virtualEntityName, action } = req.body;
      const userId = req.user?.id;
      const tenantId = req.tenant?.id;
      
      if (!userId || !tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Utente o tenant non autenticato'
        });
      }
      
      const { hasVirtualEntityPermission } = await import('../services/virtualEntityPermissions.js');
      
      const hasPermission = await hasVirtualEntityPermission(userId, virtualEntityName, action, tenantId);
      
      res.json({
        success: true,
        data: {
          hasPermission,
          virtualEntity: virtualEntityName,
          action,
          userId,
          tenantId
        }
      });
    } catch (error) {
      logger.error('Errore nella verifica permesso entità virtuale:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nella verifica del permesso'
      });
    }
  }
);

export { employeesRouter, trainersRouter, virtualEntitiesRouter };