import express from 'express';
import { PrismaClient } from '@prisma/client';
import middleware from '../auth/middleware.js';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import personController from '../controllers/personController.js';

const router = express.Router();
const prisma = new PrismaClient();

const { authenticate: authenticateToken, authorize: requirePermission, requireSameCompany: requireCompanyAccess } = middleware;

// Validation middleware for employee creation/update
const validateEmployee = [
  body('nome').notEmpty().withMessage('Nome is required'),
  body('cognome').notEmpty().withMessage('Cognome is required'),
  body('codice_fiscale').notEmpty().withMessage('Codice fiscale is required'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        details: errors.array()
      });
    }
    next();
  }
];

// Get all employees - BACKWARD COMPATIBLE ROUTE
// Redirects to new Person-based controller
router.get('/', authenticateToken(), requirePermission('read:employees'), async (req, res) => {
  logger.info('Using backward compatible employees route', {
    method: 'GET',
    url: req.url,
    query: req.query
  });
  
  // Redirect to new person controller
  return personController.getEmployees(req, res);
});

// Get employee by ID - BACKWARD COMPATIBLE ROUTE
router.get('/:id', authenticateToken(), requirePermission('read:employees'), async (req, res) => {
  logger.info('Using backward compatible employee by ID route', {
    method: 'GET',
    id: req.params.id
  });
  
  return personController.getPersonById(req, res);
});

// Create new employee - BACKWARD COMPATIBLE ROUTE
router.post('/', authenticateToken(), requirePermission('create:employees'), validateEmployee, async (req, res) => {
  logger.info('Using backward compatible create employee route', {
    method: 'POST',
    body: req.body
  });
  
  // Add roleType for Person creation
  req.body.roleType = 'EMPLOYEE';
  
  return personController.createPerson(req, res);
});

// Update employee - BACKWARD COMPATIBLE ROUTE
router.put('/:id', authenticateToken(), requirePermission('update:employees'), validateEmployee, async (req, res) => {
  logger.info('Using backward compatible update employee route', {
    method: 'PUT',
    id: req.params.id,
    body: req.body
  });
  
  return personController.updatePerson(req, res);
});

// Soft delete employee - BACKWARD COMPATIBLE ROUTE
router.delete('/:id', authenticateToken(), requirePermission('delete:employees'), async (req, res) => {
  logger.info('Using backward compatible delete employee route', {
    method: 'DELETE',
    id: req.params.id
  });
  
  return personController.deletePerson(req, res);
});

export default router;