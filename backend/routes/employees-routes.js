import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { checkAdvancedPermission, filterDataByPermissions } from '../middleware/advanced-permissions.js';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import personController from '../controllers/personController.js';

const { authenticate } = authMiddleware;

const router = express.Router();
const prisma = new PrismaClient();

// Validation middleware for employee creation/update
const validateEmployee = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('taxCode').notEmpty().withMessage('Tax code is required'),
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

// ROUTE DI TEST TEMPORANEA - BYPASS COMPLETO
router.get('/test-bypass', async (req, res) => {
  try {
    // Simula un utente admin per il test
    req.person = { 
      id: '1', 
      email: 'admin@example.com', 
      globalRole: 'ADMIN',
      companyId: '1'
    };
    
    logger.info('Test route bypass - calling getEmployees directly');
    return personController.getEmployees(req, res);
  } catch (error) {
    logger.error('Test route error:', error);
    res.status(500).json({ error: 'Test route failed', details: error.message });
  }
});

// Get all employees - BACKWARD COMPATIBLE ROUTE
// Redirects to new Person-based controller
router.get('/', authenticate, checkAdvancedPermission('employees', 'read'), filterDataByPermissions(), async (req, res) => {
  logger.info('Using backward compatible employees route', {
    method: 'GET',
    url: req.url,
    query: req.query
  });
  
  // Redirect to new person controller
  return personController.getEmployees(req, res);
});

// Get employee by ID - BACKWARD COMPATIBLE ROUTE
router.get('/:id', authenticate, checkAdvancedPermission('employees', 'read'), filterDataByPermissions(), async (req, res) => {
  logger.info('Using backward compatible employee by ID route', {
    method: 'GET',
    id: req.params.id
  });
  
  return personController.getPersonById(req, res);
});

// Create new employee - BACKWARD COMPATIBLE ROUTE
router.post('/', authenticate, checkAdvancedPermission('employees', 'create'), validateEmployee, async (req, res) => {
  logger.info('Using backward compatible create employee route', {
    method: 'POST',
    body: req.body
  });
  
  // Add roleType for Person creation
  req.body.roleType = 'EMPLOYEE';
  
  return personController.createPerson(req, res);
});

// Update employee - BACKWARD COMPATIBLE ROUTE
router.put('/:id', authenticate, checkAdvancedPermission('employees', 'update'), validateEmployee, async (req, res) => {
  logger.info('Using backward compatible update employee route', {
    method: 'PUT',
    id: req.params.id,
    body: req.body
  });
  
  return personController.updatePerson(req, res);
});

// Soft delete employee - BACKWARD COMPATIBLE ROUTE
router.delete('/:id', authenticate, checkAdvancedPermission('employees', 'delete'), async (req, res) => {
  logger.info('Using backward compatible delete employee route', {
    method: 'DELETE',
    id: req.params.id
  });
  
  return personController.deletePerson(req, res);
});

export default router;