import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Course } from '../entities/Course';
import { CourseSchedule } from '../entities/CourseSchedule';
/**
 * Controller per la gestione pubblica dei corsi
 * Gestisce sia i corsi individuali che quelli unificati per titolo
 */
export class PublicCourseController {
  
  /**
   * Ottiene tutti i corsi pubblici con filtri
   */
  static async getPublicCourses(req: Request, res: Response) {
    try {
      const { 
        category, 
        subcategory, 
        riskLevel, 
        courseType, 
        search,
        page = 1,
        limit = 12
      } = req.query;

      const courseRepository = AppDataSource.getRepository(Course);
      
      const queryBuilder = courseRepository.createQueryBuilder('course')
        .where('course.isActive = :isActive', { isActive: true })
        .andWhere('course.isPublic = :isPublic', { isPublic: true });

      // Filtri
      if (category) {
        queryBuilder.andWhere('course.category = :category', { category });
      }

      if (subcategory) {
        queryBuilder.andWhere('course.subcategory = :subcategory', { subcategory });
      }

      if (riskLevel) {
        queryBuilder.andWhere('course.riskLevel = :riskLevel', { riskLevel });
      }

      if (courseType) {
        queryBuilder.andWhere('course.courseType = :courseType', { courseType });
      }

      if (search) {
        queryBuilder.andWhere(
          '(course.title ILIKE :search OR course.shortDescription ILIKE :search OR course.category ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Paginazione
      const offset = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(offset).take(Number(limit));

      // Ordinamento
      queryBuilder.orderBy('course.title', 'ASC');

      const [courses, total] = await queryBuilder.getManyAndCount();

      res.json({
        courses,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Errore nel recupero dei corsi pubblici:', error);
      res.status(500).json({ message: 'Errore interno del server' });
    }
  }

  /**
   * Ottiene un corso singolo per slug
   */
  static async getCourseBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      
      const courseRepository = AppDataSource.getRepository(Course);
      
      const course = await courseRepository.findOne({
        where: { 
          slug,
          isActive: true,
          isPublic: true
        }
      });

      if (!course) {
        return res.status(404).json({ message: 'Corso non trovato' });
      }

      // Ottieni anche i programmi schedulati per questo corso
      const scheduleRepository = AppDataSource.getRepository(CourseSchedule);
      const schedules = await scheduleRepository.find({
        where: { 
          courseId: course.id,
          isActive: true
        },
        order: { startDate: 'ASC' }
      });

      res.json({
        ...course,
        schedules
      });
    } catch (error) {
      console.error('Errore nel recupero del corso:', error);
      res.status(500).json({ message: 'Errore interno del server' });
    }
  }

  /**
   * Ottiene corsi unificati per titolo
   * Raggruppa corsi con lo stesso titolo ma diverso rischio/tipo
   */
  static async getUnifiedCourseByTitle(req: Request, res: Response) {
    try {
      const { courseTitle } = req.params;
      
      const courseRepository = AppDataSource.getRepository(Course);
      
      // Cerca tutti i corsi con lo stesso titolo
      const variants = await courseRepository.find({
        where: { 
          title: decodeURIComponent(courseTitle),
          isActive: true,
          isPublic: true
        },
        order: { 
          courseType: 'ASC',
          riskLevel: 'ASC'
        }
      });

      if (!variants || variants.length === 0) {
        return res.status(404).json({ message: 'Corso non trovato' });
      }

      // Prendi il primo corso come base per le informazioni comuni
      const baseCourse = variants[0];

      // Estrai informazioni comuni e specifiche
      const unifiedCourse = {
        baseTitle: baseCourse.title,
        category: baseCourse.category,
        subcategory: baseCourse.subcategory,
        image1Url: baseCourse.image1Url,
        
        // Informazioni comuni (dal primo corso o aggregate)
        commonObjectives: baseCourse.objectives || [],
        commonProgram: baseCourse.program || [],
        commonRequirements: baseCourse.requirements || [],
        commonCertification: baseCourse.certification || '',
        
        // Tutte le varianti
        variants: variants.map(course => ({
          id: course.id,
          title: course.title,
          shortDescription: course.shortDescription,
          fullDescription: course.fullDescription,
          category: course.category,
          subcategory: course.subcategory,
          riskLevel: course.riskLevel,
          courseType: course.courseType,
          duration: course.duration,
          maxParticipants: course.maxParticipants,
          price: course.price,
          image1Url: course.image1Url,
          slug: course.slug,
          objectives: course.objectives || [],
          program: course.program || [],
          requirements: course.requirements || [],
          certification: course.certification || ''
        }))
      };

      res.json(unifiedCourse);
    } catch (error) {
      console.error('Errore nel recupero del corso unificato:', error);
      res.status(500).json({ message: 'Errore interno del server' });
    }
  }

  /**
   * Ottiene le categorie disponibili
   */
  static async getCategories(req: Request, res: Response) {
    try {
      const courseRepository = AppDataSource.getRepository(Course);
      
      const categories = await courseRepository
        .createQueryBuilder('course')
        .select('DISTINCT course.category', 'category')
        .addSelect('course.subcategory', 'subcategory')
        .where('course.isActive = :isActive', { isActive: true })
        .andWhere('course.isPublic = :isPublic', { isPublic: true })
        .andWhere('course.category IS NOT NULL')
        .orderBy('course.category', 'ASC')
        .addOrderBy('course.subcategory', 'ASC')
        .getRawMany();

      // Raggruppa per categoria
      const groupedCategories = categories.reduce((acc, item) => {
        const category = item.category;
        if (!acc[category]) {
          acc[category] = {
            name: category,
            subcategories: []
          };
        }
        
        if (item.subcategory && !acc[category].subcategories.includes(item.subcategory)) {
          acc[category].subcategories.push(item.subcategory);
        }
        
        return acc;
      }, {} as Record<string, { name: string; subcategories: string[] }>);

      res.json(Object.values(groupedCategories));
    } catch (error) {
      console.error('Errore nel recupero delle categorie:', error);
      res.status(500).json({ message: 'Errore interno del server' });
    }
  }

  /**
   * Ottiene i titoli dei corsi per la navigazione unificata
   */
  static async getCourseTitles(req: Request, res: Response) {
    try {
      const courseRepository = AppDataSource.getRepository(Course);
      
      const titles = await courseRepository
        .createQueryBuilder('course')
        .select('DISTINCT course.title', 'title')
        .addSelect('COUNT(course.id)', 'variantCount')
        .addSelect('course.category', 'category')
        .where('course.isActive = :isActive', { isActive: true })
        .andWhere('course.isPublic = :isPublic', { isPublic: true })
        .groupBy('course.title')
        .addGroupBy('course.category')
        .orderBy('course.title', 'ASC')
        .getRawMany();

      const courseTitles = titles.map(item => ({
        title: item.title,
        category: item.category,
        variantCount: parseInt(item.variantCount),
        slug: item.title.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .trim()
      }));

      res.json(courseTitles);
    } catch (error) {
      console.error('Errore nel recupero dei titoli dei corsi:', error);
      res.status(500).json({ message: 'Errore interno del server' });
    }
  }

  /**
   * Cerca corsi per termine di ricerca
   */
  static async searchCourses(req: Request, res: Response) {
    try {
      const { q, limit = 10 } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.json([]);
      }

      const courseRepository = AppDataSource.getRepository(Course);
      
      const courses = await courseRepository
        .createQueryBuilder('course')
        .where('course.isActive = :isActive', { isActive: true })
        .andWhere('course.isPublic = :isPublic', { isPublic: true })
        .andWhere(
          '(course.title ILIKE :search OR course.shortDescription ILIKE :search OR course.category ILIKE :search)',
          { search: `%${q.trim()}%` }
        )
        .orderBy('course.title', 'ASC')
        .limit(Number(limit))
        .getMany();

      const results = courses.map(course => ({
        id: course.id,
        title: course.title,
        category: course.category,
        subcategory: course.subcategory,
        riskLevel: course.riskLevel,
        courseType: course.courseType,
        slug: course.slug
      }));

      res.json(results);
    } catch (error) {
      console.error('Errore nella ricerca dei corsi:', error);
      res.status(500).json({ message: 'Errore interno del server' });
    }
  }
}

export default PublicCourseController;