import express from 'express';
import prisma from '../config/prisma-optimization.js';
import { body, validationResult } from 'express-validator';
import authMiddleware from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../utils/logger.js';

const { authenticate } = authMiddleware;

const router = express.Router();

// Middleware per la conversione automatica dei tipi numerici nelle richieste
const convertCourseTypes = (req, res, next) => {
  if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
    const convertTypes = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(item => convertTypes(item));
      }
      
      const converted = { ...obj };
      
      // Conversione campi numerici specifici per Course
      const numericFields = {
        validityYears: true,  // integer
        maxPeople: true,      // integer
        pricePerPerson: false // float
      };
      
      Object.keys(numericFields).forEach(field => {
        if (field in converted && converted[field] !== null && converted[field] !== undefined) {
          const value = converted[field];
          if (typeof value === 'string' && value.trim() !== '') {
            const num = Number(value);
            if (!isNaN(num)) {
              converted[field] = numericFields[field] ? Math.round(num) : num;
            }
          } else if (typeof value === 'number') {
            converted[field] = numericFields[field] ? Math.round(value) : value;
          }
        }
      });
      
      return converted;
    };
    
    req.body = convertTypes(req.body);
  }
  
  next();
};

// Apply type conversion middleware to all routes
router.use(convertCourseTypes);

// GET /courses - Get all courses for user's company
router.get('/', authenticate, async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: {
        deletedAt: null,
        // Company isolation - only show courses for user's company
        // Note: This assumes courses table will be updated with company_id
        // For now, we'll show all courses but this should be filtered by company
      },
      include: {
        schedules: true
      }
    });
    res.json(courses);
  } catch (error) {
    logger.error('Failed to fetch courses', {
        component: 'courses-routes',
        action: 'getCourses',
        error: error.message,
        stack: error.stack,
        personId: req.person?.id,
        companyId: req.query?.companyId
    });
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch courses'
    });
  }
});

// GET /courses/:id - Get specific course
router.get('/:id', authenticate, async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    
    if (isNaN(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }
    
    const course = await prisma.course.findUnique({
      where: { 
        id: courseId,
        deletedAt: null
      },
      include: {
        schedules: true
      }
    });
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // TODO: Add company isolation check when courses table is updated
    // if (course.company_id !== req.user.company_id) {
    //   return res.status(403).json({ error: 'Access denied' });
    // }
    
    res.json(course);
  } catch (error) {
    logger.error('Failed to fetch course', {
        component: 'courses-routes',
        action: 'getCourse',
        error: error.message,
        stack: error.stack,
        personId: req.person?.id,
        courseId: req.params?.id
    });
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch course'
    });
  }
});

// POST /courses - Create new course
router.post('/', authenticate, requirePermissions('courses:create'), async (req, res) => {
  try {
    // Validate required fields
    const { name, description } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Name and description are required'
      });
    }
    
    const courseData = {
      ...req.body,
      // TODO: Add company_id when courses table is updated
      // company_id: req.user.company_id,
      created_by: req.person.id,
      createdAt: new Date()
    };
    
    const course = await prisma.course.create({
      data: courseData,
      include: {
        schedules: true
      }
    });
    
    res.status(201).json(course);
  } catch (error) {
    logger.error('Failed to create course', {
        component: 'courses-routes',
        action: 'createCourse',
        error: error.message,
        stack: error.stack,
        personId: req.person?.id,
        courseName: req.body?.title
    });
    
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        error: 'Conflict',
        message: 'A course with this name already exists'
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create course'
    });
  }
});

// PUT /courses/:id - Update course
router.put('/:id', authenticate, requirePermissions('courses:update'), async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    
    if (isNaN(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }
    
    // First check if course exists and user has access
    const existingCourse = await prisma.course.findUnique({
      where: { 
        id: courseId,
        deletedAt: null
      }
    });
    
    if (!existingCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // TODO: Add company isolation check when courses table is updated
    // if (existingCourse.company_id !== req.user.company_id) {
    //   return res.status(403).json({ error: 'Access denied' });
    // }
    
    const courseData = {
      ...req.body,
      updatedBy: req.person.id,
      updatedAt: new Date()
    };
    
    const course = await prisma.course.update({
      where: { id: courseId },
      data: courseData,
      include: {
        schedules: true
      }
    });
    
    res.json(course);
  } catch (error) {
    logger.error('Failed to update course', {
            component: 'courses-routes',
            action: 'updateCourse',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id,
            courseId: req.params?.id
        });
    
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        error: 'Conflict',
        message: 'A course with this name already exists'
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update course'
    });
  }
});

// DELETE /courses/:id - Soft delete course
router.delete('/:id', authenticate, requirePermissions('courses:delete'), async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    
    if (isNaN(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }
    
    // First check if course exists and user has access
    const existingCourse = await prisma.course.findUnique({
      where: { 
        id: courseId,
        deletedAt: null
      }
    });
    
    if (!existingCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // TODO: Add company isolation check when courses table is updated
    // if (existingCourse.company_id !== req.user.company_id) {
    //   return res.status(403).json({ error: 'Access denied' });
    // }
    
    // Implement soft delete instead of hard delete
    await prisma.course.update({
      where: { id: courseId },
      data: {
        deletedAt: new Date()
      }
    });
    
    res.json({ 
      message: 'Course deleted successfully',
      id: courseId
    });
  } catch (error) {
    logger.error('Failed to delete course', {
            component: 'courses-routes',
            action: 'deleteCourse',
            error: error.message,
            stack: error.stack,
            personId: req.person?.id,
            courseId: req.params?.id
        });
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete course'
    });
  }
});

export default router;