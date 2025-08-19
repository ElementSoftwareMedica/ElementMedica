import { validationResult } from 'express-validator';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

class PublicCoursesController {
  // GET /api/public/courses
  async getPublicCourses(req, res) {
    try {
      const {
        category,
        riskLevel,
        courseType,
        search,
        page = 1,
        limit = 12
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Costruisci il filtro WHERE
      const where = {
        isPublic: true,
        deletedAt: null
      };

      if (category) {
        where.category = category;
      }

      if (riskLevel) {
        where.riskLevel = riskLevel;
      }

      if (courseType) {
        where.courseType = courseType;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } },
          { fullDescription: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { subcategory: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Query per i corsi
      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where,
          select: {
            id: true,
            title: true,
            category: true,
            subcategory: true,
            shortDescription: true,
            fullDescription: true,
            image1Url: true,
            image2Url: true,
            riskLevel: true,
            courseType: true,
            duration: true,
            pricePerPerson: true,
            slug: true,
            seoTitle: true,
            seoDescription: true,
            isPublic: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: [
            { createdAt: 'desc' }
          ],
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.course.count({ where })
      ]);

      const totalPages = Math.ceil(total / parseInt(limit));

      logger.info('Retrieved public courses', {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        filters: { category, riskLevel, courseType, search }
      });

      res.json({
        success: true,
        data: courses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      });

    } catch (error) {
      logger.error('Error getting public courses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve public courses',
        details: error.message
      });
    }
  }

  // GET /api/public/courses/:slug
  async getPublicCourseBySlug(req, res) {
    try {
      const { slug } = req.params;

      const course = await prisma.course.findFirst({
        where: {
          slug,
          isPublic: true,
          deletedAt: null
        },
        select: {
          id: true,
          title: true,
          category: true,
          subcategory: true,
          shortDescription: true,
          fullDescription: true,
          image1Url: true,
          image2Url: true,
          riskLevel: true,
          courseType: true,
          duration: true,
          pricePerPerson: true,
          slug: true,
          seoTitle: true,
          seoDescription: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          error: 'Course not found'
        });
      }

      logger.info('Retrieved public course by slug', { slug, courseId: course.id });

      res.json({
        success: true,
        data: course
      });

    } catch (error) {
      logger.error('Error getting public course by slug:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve course',
        details: error.message
      });
    }
  }

  // GET /api/public/courses/categories/list
  async getPublicCourseCategories(req, res) {
    try {
      const categories = await prisma.course.findMany({
        where: {
          isPublic: true,
          deletedAt: null,
          category: { not: null }
        },
        select: {
          category: true,
          subcategory: true
        },
        distinct: ['category', 'subcategory']
      });

      // Raggruppa per categoria
      const groupedCategories = categories.reduce((acc, course) => {
        const category = course.category;
        if (!acc[category]) {
          acc[category] = {
            name: category,
            subcategories: []
          };
        }
        
        if (course.subcategory && !acc[category].subcategories.includes(course.subcategory)) {
          acc[category].subcategories.push(course.subcategory);
        }
        
        return acc;
      }, {});

      const result = Object.values(groupedCategories);

      logger.info('Retrieved public course categories', { count: result.length });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error getting public course categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve categories',
        details: error.message
      });
    }
  }

  // GET /api/public/courses/stats
  async getPublicCourseStats(req, res) {
    try {
      const [
        totalCourses,
        riskLevelStats,
        courseTypeStats,
        categoryStats
      ] = await Promise.all([
        prisma.course.count({
          where: {
            isPublic: true,
            deletedAt: null
          }
        }),
        prisma.course.groupBy({
          by: ['riskLevel'],
          where: {
            isPublic: true,
            deletedAt: null,
            riskLevel: { not: null }
          },
          _count: {
            id: true
          }
        }),
        prisma.course.groupBy({
          by: ['courseType'],
          where: {
            isPublic: true,
            deletedAt: null,
            courseType: { not: null }
          },
          _count: {
            id: true
          }
        }),
        prisma.course.groupBy({
          by: ['category'],
          where: {
            isPublic: true,
            deletedAt: null,
            category: { not: null }
          },
          _count: {
            id: true
          }
        })
      ]);

      const stats = {
        total: totalCourses,
        byRiskLevel: riskLevelStats.map(stat => ({
          riskLevel: stat.riskLevel,
          count: stat._count.id
        })),
        byCourseType: courseTypeStats.map(stat => ({
          courseType: stat.courseType,
          count: stat._count.id
        })),
        byCategory: categoryStats.map(stat => ({
          category: stat.category,
          count: stat._count.id
        }))
      };

      logger.info('Retrieved public course stats', { totalCourses });

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error getting public course stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve stats',
        details: error.message
      });
    }
  }

  // GET /api/public/courses/unified/:courseTitle
  async getUnifiedCourseByTitle(req, res) {
    try {
      const { courseTitle } = req.params;

      const courses = await prisma.course.findMany({
        where: {
          title: courseTitle,
          isPublic: true,
          deletedAt: null
        },
        select: {
          id: true,
          title: true,
          category: true,
          description: true,
          duration: true,
          certifications: true,
          code: true,
          contents: true,
          maxPeople: true,
          pricePerPerson: true,
          regulation: true,
          renewalDuration: true,
          validityYears: true,
          status: true,
          courseType: true,
          fullDescription: true,
          image1Url: true,
          image2Url: true,
          riskLevel: true,
          seoDescription: true,
          seoTitle: true,
          shortDescription: true,
          slug: true,
          subcategory: true,
          schedules: {
            where: {
              deletedAt: null
            },
            select: {
              id: true,
              startDate: true,
              endDate: true,
              location: true,
              maxParticipants: true,
              status: true,
              trainer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: [
          { courseType: 'asc' },
          { riskLevel: 'asc' }
        ]
      });

      if (courses.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No courses found with this title'
        });
      }

      // Prendi il primo corso come base per le informazioni comuni
      const baseCourse = courses[0];

      // Crea la struttura UnifiedCourse che si aspetta il frontend
      const unifiedCourse = {
        baseTitle: baseCourse.title,
        category: baseCourse.category,
        subcategory: baseCourse.subcategory,
        image1Url: baseCourse.image1Url,
        
        // Informazioni comuni (dal primo corso o aggregate)
        commonObjectives: [], // Non disponibile nel modello Course
        commonProgram: [], // Non disponibile nel modello Course
        commonRequirements: [], // Non disponibile nel modello Course
        commonCertification: baseCourse.certifications || '',
        
        // Tutte le varianti
        variants: courses.map(course => ({
          id: course.id,
          title: course.title,
          shortDescription: course.shortDescription,
          fullDescription: course.fullDescription,
          category: course.category,
          subcategory: course.subcategory,
          riskLevel: course.riskLevel,
          courseType: course.courseType,
          duration: course.duration,
          maxParticipants: course.maxPeople, // Corretto da maxParticipants a maxPeople
          price: course.pricePerPerson,
          image1Url: course.image1Url,
          slug: course.slug,
          objectives: [], // Non disponibile nel modello Course
          program: [], // Non disponibile nel modello Course
          requirements: [], // Non disponibile nel modello Course
          certification: course.certifications || '',
          schedules: course.schedules || []
        }))
      };

      logger.info('Retrieved unified courses by title', { 
        courseTitle, 
        count: courses.length 
      });

      res.json(unifiedCourse);

    } catch (error) {
      logger.error('Error getting unified course by title:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve unified course',
        details: error.message
      });
    }
  }

  // GET /api/public/courses/titles/list
  async getCourseTitles(req, res) {
    try {
      const titles = await prisma.course.findMany({
        where: {
          isPublic: true,
          deletedAt: null,
          title: { not: null }
        },
        select: {
          title: true
        },
        distinct: ['title'],
        orderBy: {
          title: 'asc'
        }
      });

      const titleList = titles.map(course => course.title);

      logger.info('Retrieved course titles list', { count: titleList.length });

      res.json({
        success: true,
        data: titleList
      });

    } catch (error) {
      logger.error('Error getting course titles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve course titles',
        details: error.message
      });
    }
  }

  // GET /api/public/courses/search
  async searchCourses(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { q, limit = 10 } = req.query;

      const courses = await prisma.course.findMany({
        where: {
          isPublic: true,
          deletedAt: null,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { shortDescription: { contains: q, mode: 'insensitive' } },
            { fullDescription: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
            { subcategory: { contains: q, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          title: true,
          category: true,
          subcategory: true,
          shortDescription: true,
          image1Url: true,
          riskLevel: true,
          courseType: true,
          duration: true,
          pricePerPerson: true,
          slug: true
        },
        take: parseInt(limit),
        orderBy: [
          { title: 'asc' }
        ]
      });

      logger.info('Searched courses', { 
        query: q, 
        results: courses.length,
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: courses,
        query: q,
        count: courses.length
      });

    } catch (error) {
      logger.error('Error searching courses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search courses',
        details: error.message
      });
    }
  }
}

export default new PublicCoursesController();