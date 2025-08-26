/**
 * Public Courses Routes
 * Endpoints pubblici per i corsi - non richiedono autenticazione
 * Utilizzati dal frontend pubblico Element Formazione
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import publicCoursesController from '../controllers/publicCoursesController.js';

const router = express.Router();

// GET /api/public/courses - Retrieve all public courses with optional filters
router.get('/courses', [
  query('category').optional().isString().trim(),
  query('riskLevel').optional().isIn(['ALTO', 'MEDIO', 'BASSO', 'A', 'B', 'C']),
  query('courseType').optional().isIn(['PRIMO_CORSO', 'AGGIORNAMENTO']),
  query('search').optional().isString().trim(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], publicCoursesController.getPublicCourses);

// GET /api/public/courses/:slug - Retrieve details for a specific public course using its slug
router.get('/courses/:slug', [
  param('slug').isString().trim().notEmpty()
], publicCoursesController.getPublicCourseBySlug);

// GET /api/public/courses/categories/list - Retrieve a distinct list of available public course categories
router.get('/courses/categories/list', publicCoursesController.getPublicCourseCategories);

// GET /api/public/courses/stats - Retrieve statistics on public courses
router.get('/courses/stats', publicCoursesController.getPublicCourseStats);

// GET /api/public/courses/unified/:courseTitle - Retrieve unified course page for courses with same title
router.get('/courses/unified/:courseTitle', [
  param('courseTitle').isString().trim().notEmpty()
], publicCoursesController.getUnifiedCourseByTitle);

// GET /api/public/courses/titles/list - Retrieve list of course titles for unified navigation
router.get('/courses/titles/list', publicCoursesController.getCourseTitles);

// GET /api/public/courses/search - Search courses by term
router.get('/courses/search', [
  query('q').isString().trim().isLength({ min: 2 }),
  query('limit').optional().isInt({ min: 1, max: 20 }).toInt()
], publicCoursesController.searchCourses);

export default router;