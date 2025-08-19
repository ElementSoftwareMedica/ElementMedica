/**
 * Trainers Routes
 * Routes for trainer management (delegates to person routes)
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { checkAdvancedPermission, filterDataByPermissions } from '../middleware/advanced-permissions.js';
import personController from '../controllers/personController.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get all trainers
router.get('/', authMiddleware, checkAdvancedPermission('trainers', 'read'), filterDataByPermissions(), async (req, res) => {
  logger.info('Getting all trainers', {
    component: 'trainers-routes',
    action: 'getAll',
    userId: req.user?.id
  });
  
  // Add roleType filter for trainers
  req.query.roleType = 'TRAINER';
  return personController.getPersons(req, res);
});

// Get trainer by ID
router.get('/:id', authMiddleware, checkAdvancedPermission('trainers', 'read'), filterDataByPermissions(), async (req, res) => {
  logger.info('Getting trainer by ID', {
    component: 'trainers-routes',
    action: 'getById',
    trainerId: req.params.id,
    userId: req.user?.id
  });
  
  return personController.getPersonById(req, res);
});

// Create new trainer
router.post('/', authMiddleware, checkAdvancedPermission('trainers', 'create'), auditLog('CREATE_TRAINER'), async (req, res) => {
  logger.info('Creating new trainer', {
    component: 'trainers-routes',
    action: 'create',
    userId: req.user?.id
  });
  
  // Ensure roleType is set to TRAINER
  req.body.roleType = 'TRAINER';
  return personController.createPerson(req, res);
});

// Update trainer
router.put('/:id', authMiddleware, checkAdvancedPermission('trainers', 'update'), auditLog('UPDATE_TRAINER'), async (req, res) => {
  logger.info('Updating trainer', {
    component: 'trainers-routes',
    action: 'update',
    trainerId: req.params.id,
    userId: req.user?.id
  });
  
  return personController.updatePerson(req, res);
});

// Delete trainer (soft delete)
router.delete('/:id', authMiddleware, checkAdvancedPermission('trainers', 'delete'), auditLog('DELETE_TRAINER'), async (req, res) => {
  logger.info('Deleting trainer', {
    component: 'trainers-routes',
    action: 'delete',
    trainerId: req.params.id,
    userId: req.user?.id
  });
  
  return personController.deletePerson(req, res);
});

export default router;