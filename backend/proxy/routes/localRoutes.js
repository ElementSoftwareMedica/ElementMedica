/**
 * Route locali per il proxy server
 * Gestisce endpoint che non vengono proxati ma elaborati direttamente
 */

import { logger } from '../../utils/logger.js';
import { createDebugLogger, createAuthLogger } from '../middleware/logging.js';
import { createJsonParser, createBulkUploadParser } from '../middleware/bodyParser.js';
import { authenticate } from '../../auth/index.js';
import { checkPermission } from '../../utils/permissions.js';
import { healthHandler, healthzHandler, readinessHandler } from '../handlers/healthCheck.js';
import { getShutdownStatus } from '../handlers/gracefulShutdown.js';

const debugRoutes = createDebugLogger('routes');

// Lazy loading di Prisma: inizializzazione al primo utilizzo per evitare crash se @prisma/client non è disponibile
let prismaInstance = null;
let prismaInitPromise = null;

async function ensurePrisma() {
  if (prismaInstance) return prismaInstance;
  if (prismaInitPromise) {
    try { await prismaInitPromise; } catch (_) {}
    return prismaInstance;
  }
  prismaInitPromise = (async () => {
    try {
      const prismaModule = await import('@prisma/client');
      const { PrismaClient } = prismaModule;
      prismaInstance = new PrismaClient();
      await prismaInstance.$connect();
    } catch (err) {
      if (process.env.DEBUG_ROUTES || process.env.DEBUG_ALL) {
        console.error('Prisma initialization failed or unavailable:', err?.message);
      }
      prismaInstance = null;
    } finally {
      prismaInitPromise = null;
    }
  })();

  try { await prismaInitPromise; } catch (_) {}
  return prismaInstance;
}

/**
 * Setup delle route per i corsi
 * @param {Object} app - Express app instance
 */
export function setupCoursesRoutes(app) {
  const jsonParser = createJsonParser();
  const bulkParser = createBulkUploadParser();
  
  // GET /courses - Lista corsi
  app.get('/courses', async (req, res) => {
    try {
      if (process.env.DEBUG_ROUTES || process.env.DEBUG_ALL) {
        debugRoutes('GET /courses request:', {
          query: req.query,
          ip: req.ip
        });
      }
      
      const prisma = await ensurePrisma();
      if (!prisma) {
        return res.status(503).json({
          error: 'Database temporaneamente non disponibile',
          code: 'PRISMA_NOT_INITIALIZED'
        });
      }
      
      const { page = 1, limit = 10, search, category } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const where = {
        deletedAt: null,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(category && { category })
      };
      
      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { schedules: true }
            }
          }
        }),
        prisma.course.count({ where })
      ]);
      
      logger.info('Courses retrieved', {
        service: 'proxy-server',
        endpoint: 'GET /courses',
        count: courses.length,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        category,
        ip: req.ip
      });
      
      res.json({
        courses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
      
    } catch (error) {
      logger.error('Error retrieving courses', {
        service: 'proxy-server',
        endpoint: 'GET /courses',
        error: error.message,
        stack: error.stack,
        ip: req.ip
      });
      
      res.status(500).json({
        error: 'Failed to retrieve courses',
        message: error.message
      });
    }
  });
  
  // GET /courses/:id - Dettaglio singolo corso
  app.get('/courses/:id', async (req, res) => {
    try {
      const courseId = req.params.id;
      
      if (process.env.DEBUG_ROUTES || process.env.DEBUG_ALL) {
        debugRoutes('GET /courses/:id request:', {
          courseId,
          ip: req.ip
        });
      }
      
      const prisma = await ensurePrisma();
      if (!prisma) {
        return res.status(503).json({
          error: 'Database temporaneamente non disponibile',
          code: 'PRISMA_NOT_INITIALIZED'
        });
      }
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(courseId)) {
        return res.status(400).json({ error: 'Invalid course ID format' });
      }
      
      const course = await prisma.course.findUnique({
        where: { 
          id: courseId,
          deletedAt: null
        },
        include: {
          schedules: {
            where: { deletedAt: null },
            orderBy: { startDate: 'asc' }
          },
          _count: {
            select: { schedules: true }
          }
        }
      });
      
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      logger.info('Course retrieved', {
        service: 'proxy-server',
        endpoint: 'GET /courses/:id',
        courseId,
        title: course.title,
        schedulesCount: course.schedules.length,
        ip: req.ip
      });
      
      res.json(course);
      
    } catch (error) {
      logger.error('Error retrieving course', {
        service: 'proxy-server',
        endpoint: 'GET /courses/:id',
        courseId: req.params.id,
        error: error.message,
        stack: error.stack,
        ip: req.ip
      });
      
      res.status(500).json({
        error: 'Failed to retrieve course',
        message: error.message
      });
    }
  });
  
  // POST /courses - Crea nuovo corso
  app.post('/courses', jsonParser, async (req, res) => {
    try {
      if (process.env.DEBUG_ROUTES || process.env.DEBUG_ALL) {
        debugRoutes('POST /courses request:', {
          body: { ...req.body, description: req.body.description?.substring(0, 100) + '...' },
          ip: req.ip
        });
      }
      
      const prisma = await ensurePrisma();
      if (!prisma) {
        return res.status(503).json({
          error: 'Database temporaneamente non disponibile',
          code: 'PRISMA_NOT_INITIALIZED'
        });
      }
      
      const { title, description, category, duration, price, isActive = true } = req.body;
      
      // Validazione input
      if (!title || !description || !category) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['title', 'description', 'category']
        });
      }
      
      const course = await prisma.course.create({
        data: {
          title,
          description,
          category,
          duration: duration ? parseInt(duration) : null,
          pricePerPerson: price ? parseFloat(price) : null,
          isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      logger.info('Course created', {
        service: 'proxy-server',
        endpoint: 'POST /courses',
        courseId: course.id,
        title: course.title,
        category: course.category,
        ip: req.ip
      });
      
      res.status(201).json(course);
      
    } catch (error) {
      logger.error('Error creating course', {
        service: 'proxy-server',
        endpoint: 'POST /courses',
        error: error.message,
        stack: error.stack,
        body: req.body,
        ip: req.ip
      });
      
      res.status(500).json({
        error: 'Failed to create course',
        message: error.message
      });
    }
  });
  
  // PUT /courses/:id - Aggiorna corso
  app.put('/courses/:id', jsonParser, async (req, res) => {
    try {
      const courseId = req.params.id;
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(courseId)) {
        return res.status(400).json({ error: 'Invalid course ID format' });
      }
      
      if (process.env.DEBUG_ROUTES || process.env.DEBUG_ALL) {
        debugRoutes('PUT /courses/:id request:', {
          courseId,
          body: { ...req.body, description: req.body.description?.substring(0, 100) + '...' },
          ip: req.ip
        });
      }
      
      const prisma = await ensurePrisma();
      if (!prisma) {
        return res.status(503).json({
          error: 'Database temporaneamente non disponibile',
          code: 'PRISMA_NOT_INITIALIZED'
        });
      }
      
      const { title, description, category, duration, price, isActive } = req.body;
      
      // Verifica esistenza corso
      const existingCourse = await prisma.course.findFirst({
        where: { id: courseId, deletedAt: null }
      });
      
      if (!existingCourse) {
        return res.status(404).json({
          error: 'Course not found',
          courseId
        });
      }
      
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          ...(title && { title }),
          ...(description && { description }),
          ...(category && { category }),
          ...(duration !== undefined && { duration: duration ? parseInt(duration) : null }),
          ...(price !== undefined && { pricePerPerson: price ? parseFloat(price) : null }),
          ...(isActive !== undefined && { isActive }),
          updatedAt: new Date()
        }
      });
      
      logger.info('Course updated', {
        service: 'proxy-server',
        endpoint: 'PUT /courses/:id',
        courseId,
        changes: Object.keys(req.body),
        ip: req.ip
      });
      
      res.json(updatedCourse);
      
    } catch (error) {
      logger.error('Error updating course', {
        service: 'proxy-server',
        endpoint: 'PUT /courses/:id',
        courseId: req.params.id,
        error: error.message,
        stack: error.stack,
        body: req.body,
        ip: req.ip
      });
      
      res.status(500).json({
        error: 'Failed to update course',
        message: error.message
      });
    }
  });
  
  // DELETE /courses/:id - Soft delete corso
  app.delete('/courses/:id', async (req, res) => {
    try {
      const courseId = req.params.id;
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(courseId)) {
        return res.status(400).json({ error: 'Invalid course ID format' });
      }
      
      if (process.env.DEBUG_ROUTES || process.env.DEBUG_ALL) {
        debugRoutes('DELETE /courses/:id request:', {
          courseId,
          ip: req.ip
        });
      }
      
      const prisma = await ensurePrisma();
      if (!prisma) {
        return res.status(503).json({
          error: 'Database temporaneamente non disponibile',
          code: 'PRISMA_NOT_INITIALIZED'
        });
      }
      
      // Verifica esistenza corso
      const existingCourse = await prisma.course.findFirst({
        where: { id: courseId, deletedAt: null }
      });
      
      if (!existingCourse) {
        return res.status(404).json({
          error: 'Course not found',
          courseId
        });
      }
      
      // Soft delete (GDPR compliant)
      await prisma.course.update({
        where: { id: courseId },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      logger.info('Course soft deleted', {
        service: 'proxy-server',
        endpoint: 'DELETE /courses/:id',
        courseId,
        title: existingCourse.title,
        ip: req.ip
      });
      
      res.json({
        message: 'Course deleted successfully',
        courseId,
        deletedAt: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Error deleting course', {
        service: 'proxy-server',
        endpoint: 'DELETE /courses/:id',
        courseId: req.params.id,
        error: error.message,
        stack: error.stack,
        ip: req.ip
      });
      
      res.status(500).json({
        error: 'Failed to delete course',
        message: error.message
      });
    }
  });
  
  // POST /courses/bulk-import - Importazione massiva
  app.post('/courses/bulk-import', bulkParser, async (req, res) => {
    try {
      if (process.env.DEBUG_ROUTES || process.env.DEBUG_ALL) {
        debugRoutes('POST /courses/bulk-import request:', {
          coursesCount: req.body.courses?.length || 0,
          ip: req.ip
        });
      }
      
      const prisma = await ensurePrisma();
      if (!prisma) {
        return res.status(503).json({
          error: 'Database temporaneamente non disponibile',
          code: 'PRISMA_NOT_INITIALIZED'
        });
      }
      
      const { courses } = req.body;
      
      if (!Array.isArray(courses) || courses.length === 0) {
        return res.status(400).json({
          error: 'Invalid courses data',
          message: 'Expected array of courses'
        });
      }
      
      // Validazione batch
      const validCourses = courses.filter(course => 
        course.title && course.description && course.category
      );
      
      if (validCourses.length === 0) {
        return res.status(400).json({
          error: 'No valid courses found',
          message: 'All courses missing required fields'
        });
      }
      
      // Importazione in batch
      const createdCourses = await prisma.course.createMany({
        data: validCourses.map(course => ({
          title: course.title,
          description: course.description,
          category: course.category,
          duration: course.duration ? parseInt(course.duration) : null,
          pricePerPerson: course.price ? parseFloat(course.price) : null,
          isActive: course.isActive !== undefined ? course.isActive : true,
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        skipDuplicates: true
      });
      
      logger.info('Bulk courses import completed', {
        service: 'proxy-server',
        endpoint: 'POST /courses/bulk-import',
        totalSubmitted: courses.length,
        validCourses: validCourses.length,
        created: createdCourses.count,
        ip: req.ip
      });
      
      res.status(201).json({
        message: 'Bulk import completed',
        totalSubmitted: courses.length,
        validCourses: validCourses.length,
        created: createdCourses.count,
        skipped: validCourses.length - createdCourses.count
      });
      
    } catch (error) {
      logger.error('Error in bulk courses import', {
        service: 'proxy-server',
        endpoint: 'POST /courses/bulk-import',
        error: error.message,
        stack: error.stack,
        ip: req.ip
      });
      
      res.status(500).json({
        error: 'Bulk import failed',
        message: error.message
      });
    }
  });
  
  if (process.env.DEBUG_ROUTES || process.env.DEBUG_ALL) {
    console.log('✅ Courses routes configured');
  }
}

/**
 * Setup delle route per schedules con attestati
 * @param {Object} app - Express app instance
 */
export function setupSchedulesRoutes(app) {
  // GET /schedules-with-attestati - Schedules con verifica attestati
  app.get('/schedules-with-attestati', async (req, res) => {
    try {
      if (process.env.DEBUG_ROUTES || process.env.DEBUG_ALL) {
        debugRoutes('GET /schedules-with-attestati request:', {
          query: req.query,
          ip: req.ip
        });
      }
      
      const prisma = await ensurePrisma();
      if (!prisma) {
        return res.status(503).json({
          error: 'Database temporaneamente non disponibile',
          code: 'PRISMA_NOT_INITIALIZED'
        });
      }
      
      const schedules = await prisma.schedule.findMany({
        where: { deletedAt: null },
        include: {
          course: {
            select: { id: true, title: true, category: true }
          },
          person: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Verifica presenza attestati per ogni schedule
      const schedulesWithAttestati = await Promise.all(
        schedules.map(async (schedule) => {
          try {
            const attestato = await prisma.attestato.findFirst({
              where: {
                scheduleId: schedule.id,
                deletedAt: null
              }
            });
            
            return {
              ...schedule,
              hasAttestato: !!attestato,
              attestatoId: attestato?.id || null,
              attestatoCreatedAt: attestato?.createdAt || null
            };
          } catch (error) {
            logger.warn('Error checking attestato for schedule', {
              service: 'proxy-server',
              scheduleId: schedule.id,
              error: error.message
            });
            
            return {
              ...schedule,
              hasAttestato: false,
              attestatoId: null,
              attestatoCreatedAt: null
            };
          }
        })
      );
      
      logger.info('Schedules with attestati retrieved', {
        service: 'proxy-server',
        endpoint: 'GET /schedules-with-attestati',
        count: schedulesWithAttestati.length,
        withAttestati: schedulesWithAttestati.filter(s => s.hasAttestato).length,
        ip: req.ip
      });
      
      res.json({
        schedules: schedulesWithAttestati,
        summary: {
          total: schedulesWithAttestati.length,
          withAttestati: schedulesWithAttestati.filter(s => s.hasAttestato).length,
          withoutAttestati: schedulesWithAttestati.filter(s => !s.hasAttestato).length
        }
      });
      
    } catch (error) {
      logger.error('Error retrieving schedules with attestati', {
        service: 'proxy-server',
        endpoint: 'GET /schedules-with-attestati',
        error: error.message,
        stack: error.stack,
        ip: req.ip
      });
      
      res.status(500).json({
        error: 'Failed to retrieve schedules with attestati',
        message: error.message
      });
    }
  });
  
  if (process.env.DEBUG_ROUTES || process.env.DEBUG_ALL) {
    console.log('✅ Schedules routes configured');
  }
}

/**
 * Setup delle route per templates e attestati
 * @param {Object} app - Express app instance
 */
export function setupDocumentRoutes(app) {
  const authLogger = createAuthLogger('documents');
  
  // GET /templates - Lista templates (richiede autenticazione)
  app.get('/templates', authLogger, authenticate(), checkPermission('documents:read'), async (req, res) => {
    try {
      if (process.env.DEBUG_ROUTES || process.env.DEBUG_ALL) {
        debugRoutes('GET /templates request:', {
          userId: req.user?.id,
          ip: req.ip
        });
      }
      
      const prisma = await ensurePrisma();
      if (!prisma) {
        return res.status(503).json({
          error: 'Database temporaneamente non disponibile',
          code: 'PRISMA_NOT_INITIALIZED'
        });
      }
      
      const templates = await prisma.template.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' }
      });
      
      logger.info('Templates retrieved', {
        service: 'proxy-server',
        endpoint: 'GET /templates',
        count: templates.length,
        userId: req.user?.id,
        ip: req.ip
      });
      
      res.json(templates);
      
    } catch (error) {
      logger.error('Error retrieving templates', {
        service: 'proxy-server',
        endpoint: 'GET /templates',
        error: error.message,
        userId: req.user?.id,
        ip: req.ip
      });
      
      res.status(500).json({
        error: 'Failed to retrieve templates',
        message: error.message
      });
    }
  });
  
  // GET /attestati - Lista attestati (richiede autenticazione)
  app.get('/attestati', authLogger, authenticate(), checkPermission('documents:read'), async (req, res) => {
    try {
      if (process.env.DEBUG_ROUTES || process.env.DEBUG_ALL) {
        debugRoutes('GET /attestati request:', {
          userId: req.user?.id,
          query: req.query,
          ip: req.ip
        });
      }
      
      const prisma = await ensurePrisma();
      if (!prisma) {
        return res.status(503).json({
          error: 'Database temporaneamente non disponibile',
          code: 'PRISMA_NOT_INITIALIZED'
        });
      }
      
      const { page = 1, limit = 10, scheduleId } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const where = {
        deletedAt: null,
        ...(scheduleId && { scheduleId: parseInt(scheduleId) })
      };
      
      const [attestati, total] = await Promise.all([
        prisma.attestato.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            schedule: {
              include: {
                course: { select: { title: true, category: true } },
                person: { select: { firstName: true, lastName: true, email: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.attestato.count({ where })
      ]);
      
      logger.info('Attestati retrieved', {
        service: 'proxy-server',
        endpoint: 'GET /attestati',
        count: attestati.length,
        total,
        userId: req.user?.id,
        scheduleId,
        ip: req.ip
      });
      
      res.json({
        attestati,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
      
    } catch (error) {
      logger.error('Error retrieving attestati', {
        service: 'proxy-server',
        endpoint: 'GET /attestati',
        error: error.message,
        userId: req.user?.id,
        ip: req.ip
      });
      
      res.status(500).json({
        error: 'Failed to retrieve attestati',
        message: error.message
      });
    }
  });
  
  if (process.env.DEBUG_ROUTES || process.env.DEBUG_ALL) {
    console.log('✅ Document routes configured');
  }
}

/**
 * Setup delle route di sistema (health, status, etc.)
 * @param {Object} app - Express app instance
 */
export function setupSystemRoutes(app) {
  // Health check endpoints
  app.get('/health', healthHandler);
  app.get('/healthz', healthzHandler);
  app.get('/ready', readinessHandler);
  
  // Status endpoint
  app.get('/status', (req, res) => {
    const shutdownStatus = getShutdownStatus();
    
    res.json({
      service: 'proxy-server',
      status: 'running',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      shutdown: {
        isShuttingDown: shutdownStatus.isShuttingDown,
        elapsed: shutdownStatus.elapsed
      }
    });
  });
  
  // Test endpoints per debugging
  if (process.env.NODE_ENV === 'development') {
    app.get('/proxy-test-updated', (req, res) => {
      res.json({
        message: 'Proxy server is working correctly',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        headers: req.headers
      });
    });
    
    app.get('/test-roles-middleware', (req, res) => {
      res.json({
        message: 'Roles middleware test endpoint',
        timestamp: new Date().toISOString(),
        user: req.user || null,
        permissions: req.permissions || null
      });
    });
  }
  
  // Route di debug per sviluppo
  app.get('/debug/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        routes.push({
          path: middleware.route.path,
          methods: Object.keys(middleware.route.methods),
          type: 'route'
        });
      } else if (middleware.name === 'router' || middleware.regexp) {
        const path = middleware.regexp ? middleware.regexp.source : 'unknown';
        routes.push({
          path: path,
          name: middleware.name || 'middleware',
          type: 'middleware'
        });
        
        if (middleware.handle && middleware.handle.stack) {
          middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
              routes.push({
                path: handler.route.path,
                methods: Object.keys(handler.route.methods),
                type: 'nested-route'
              });
            }
          });
        }
      }
    });
    
    res.json({
      message: 'Registered routes and middleware',
      routes,
      totalCount: routes.length,
      timestamp: new Date().toISOString()
    });
  });
  
  // Route temporanea per testare il login direttamente
  app.post('/test-login', async (req, res) => {
    try {
      const axios = (await import('axios')).default;
      const response = await axios.post('http://localhost:4001/api/auth/login', req.body, {
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:5173'
        },
        timeout: 10000
      });
      
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error('Test login error:', error.message);
      res.status(error.response?.status || 500).json({
        error: 'Login test failed',
        message: error.message,
        details: error.response?.data
      });
    }
  });
  
  if (process.env.DEBUG_ROUTES || process.env.DEBUG_ALL) {
    console.log('✅ System routes configured');
  }
}

/**
 * Setup completo di tutte le route locali
 * @param {Object} app - Express app instance
 */
export function setupLocalRoutes(app) {
  setupCoursesRoutes(app);
  setupSchedulesRoutes(app);
  setupDocumentRoutes(app);
  setupSystemRoutes(app);
  
  if (process.env.DEBUG_ROUTES || process.env.DEBUG_ALL) {
    console.log('✅ All local routes configured');
  }
  
  logger.info('Local routes setup completed', {
    service: 'proxy-server',
    component: 'local-routes',
    environment: process.env.NODE_ENV || 'development'
  });
}

export default {
  setupLocalRoutes,
  setupCoursesRoutes,
  setupSchedulesRoutes,
  setupDocumentRoutes,
  setupSystemRoutes
};