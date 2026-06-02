import express from 'express';
import prisma from '../config/prisma-optimization.js';
import { body, validationResult } from 'express-validator';
import authMiddleware from '../middleware/auth.js';
import { requirePermissions } from '../middleware/rbac.js';
import { requireFeature } from '../middleware/featureFlags.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../utils/logger.js';
import { roleDataFilter, filterResponseFields } from '../middleware/role-data-filter.js';
import { BRANCH_TYPES } from '../utils/branchHelper.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const { authenticate } = authMiddleware;
const DEFAULT_BRANCH = BRANCH_TYPES.FORMAZIONE;

const router = express.Router();

// Middleware per la conversione automatica dei tipi numerici nelle richieste
// Middleware per convertire i tipi dei campi corso
const convertCourseTypes = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const converted = { ...req.body };

    // Converti maxPeople a numero se presente
    if (converted.maxPeople !== undefined && converted.maxPeople !== null && typeof converted.maxPeople !== 'number') {
      const num = parseInt(converted.maxPeople, 10);
      converted.maxPeople = isNaN(num) ? null : num;
    }

    // Converti pricePerPerson a numero se presente
    if (converted.pricePerPerson !== undefined && converted.pricePerPerson !== null && typeof converted.pricePerPerson !== 'number') {
      const num = parseFloat(converted.pricePerPerson);
      converted.pricePerPerson = isNaN(num) ? null : num;
    }

    // Converti validityYears a numero se presente
    if (converted.validityYears !== undefined && converted.validityYears !== null && typeof converted.validityYears !== 'number') {
      const num = parseInt(converted.validityYears, 10);
      converted.validityYears = isNaN(num) ? null : num;
    }

    // Converti practicalHours a numero se presente
    if (converted.practicalHours !== undefined && converted.practicalHours !== null && typeof converted.practicalHours !== 'number') {
      const num = parseInt(converted.practicalHours, 10);
      converted.practicalHours = isNaN(num) ? null : num;
    }

    // Converti isPublic a boolean se presente
    if (converted.isPublic !== undefined && converted.isPublic !== null && typeof converted.isPublic !== 'boolean') {
      converted.isPublic = converted.isPublic === 'true' || converted.isPublic === true;
    }

    // Assicurati che certifications sia una stringa
    if (converted.certifications !== undefined && converted.certifications !== null && typeof converted.certifications !== 'string') {
      converted.certifications = String(converted.certifications);
    }

    req.body = converted;
  }
  next();
};

// Helper per sanificare il payload di Course (whitelist dei campi supportati da Prisma)
const allowedCourseFields = [
  'title', 'category', 'description', 'duration', 'certifications', 'code', 'contents',
  'maxPeople', 'pricePerPerson', 'regulation', 'practicalHours', 'validityYears',
  'status', 'courseType', 'fullDescription', 'image1Url', 'image2Url', 'isPublic',
  'riskLevel', 'seoDescription', 'seoTitle', 'shortDescription', 'slug', 'subcategory'
];

const sanitizeCoursePayload = (input) => {
  if (!input || typeof input !== 'object') return {};

  const data = { ...input };

  // Rimuovi campi non permessi
  Object.keys(data).forEach(key => {
    if (!allowedCourseFields.includes(key)) {
      delete data[key];
    }
  });

  // Conversioni di tipo per campi specifici
  if (data.maxPeople !== undefined && data.maxPeople !== null && typeof data.maxPeople !== 'number') {
    const num = parseInt(data.maxPeople, 10);
    data.maxPeople = isNaN(num) ? null : num;
  }

  if (data.pricePerPerson !== undefined && data.pricePerPerson !== null && typeof data.pricePerPerson !== 'number') {
    const num = parseFloat(data.pricePerPerson);
    data.pricePerPerson = isNaN(num) ? null : num;
  }

  if (data.validityYears !== undefined && data.validityYears !== null && typeof data.validityYears !== 'number') {
    const num = parseInt(data.validityYears, 10);
    data.validityYears = isNaN(num) ? null : num;
  }

  if (data.practicalHours !== undefined && data.practicalHours !== null && typeof data.practicalHours !== 'number') {
    const num = parseInt(data.practicalHours, 10);
    data.practicalHours = isNaN(num) ? null : num;
  }

  // Assicura che i campi stringa siano stringa se arrivano come numeri
  if (data.duration !== undefined && data.duration !== null && typeof data.duration !== 'string') {
    data.duration = String(data.duration);
  }

  // Converti isPublic a boolean
  if (data.isPublic !== undefined && data.isPublic !== null && typeof data.isPublic !== 'boolean') {
    data.isPublic = data.isPublic === 'true' || data.isPublic === true;
  }

  // Assicurati che certifications sia una stringa
  if (data.certifications !== undefined && data.certifications !== null && typeof data.certifications !== 'string') {
    data.certifications = String(data.certifications);
  }

  // CRITICO: Converti stringhe vuote in null per campi enum
  // Prisma richiede null o valore valido enum, NON stringa vuota
  if (data.riskLevel !== undefined && (data.riskLevel === '' || data.riskLevel === null)) {
    data.riskLevel = null;
  }

  if (data.status !== undefined && (data.status === '' || data.status === null)) {
    // Default status per import: ACTIVE
    data.status = 'ACTIVE';
  }

  // Normalizza case per enum CourseStatus (frontend potrebbe inviare mixed case)
  if (data.status && typeof data.status === 'string') {
    data.status = data.status.toUpperCase();
  }

  if (data.courseType !== undefined && (data.courseType === '' || data.courseType === null)) {
    data.courseType = null;
  }

  return data;
};

// Apply type conversion middleware to all routes
router.use(convertCourseTypes);

// Feature gate: tutte le route corsi richiedono BRANCH_FORMAZIONE
router.use(authenticate, requireFeature('BRANCH_FORMAZIONE'));

// GET /courses - Get all courses for user's company
router.get('/', authenticate, roleDataFilter, filterResponseFields, async (req, res) => {
  try {
    const person = req.person;

    // Verifica se l'utente è EMPLOYEE (ha solo il ruolo EMPLOYEE, non altri ruoli admin)
    const personRoles = await prisma.personRole.findMany({
      where: {
        personId: person.id,
        tenantId: getEffectiveTenantId(req),
        isActive: true,
        deletedAt: null
      },
      select: { roleType: true }
    });

    const roleTypes = personRoles.map(pr => pr.roleType);
    const isEmployeeOnly = roleTypes.includes('EMPLOYEE') &&
      !roleTypes.some(r => ['ADMIN', 'TRAINING_ADMIN', 'HR_MANAGER', 'COMPANY_MANAGER', 'SITE_MANAGER', 'TRAINER', 'TENANT_ADMIN'].includes(r));

    let whereClause = {
      tenantId: getEffectiveTenantId(req),
      deletedAt: null,
      branchType: DEFAULT_BRANCH
    };

    // Se è EMPLOYEE, mostra solo i corsi a cui è iscritto
    if (isEmployeeOnly) {
      // Trova tutti i courseSchedule IDs dove l'employee è iscritto
      const enrollments = await prisma.courseEnrollment.findMany({
        where: {
          personId: person.id,
          tenantId: getEffectiveTenantId(req),
          deletedAt: null
        },
        select: { scheduleId: true }
      });

      const scheduleIds = enrollments.map(e => e.scheduleId).filter(Boolean);

      if (scheduleIds.length > 0) {
        // Trova i courseId dai schedules
        const schedules = await prisma.courseSchedule.findMany({
          where: {
            id: { in: scheduleIds },
            tenantId: getEffectiveTenantId(req),
            deletedAt: null
          },
          select: { courseId: true }
        });

        const courseIds = [...new Set(schedules.map(s => s.courseId).filter(Boolean))];
        whereClause.id = { in: courseIds };
      } else {
        // Nessuna iscrizione, restituisce lista vuota
        return res.json([]);
      }
    }

    const courses = await prisma.course.findMany({
      where: whereClause,
      include: {
        schedules: true
      }
    });
    res.json(courses);
  } catch (error) {
    logger.error('Failed to fetch courses', {
      component: 'courses-routes',
      action: 'getCourses',
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id,
      companyId: req.query?.companyId
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nel recupero dei corsi'
    });
  }
});

// GET /courses/:id - Get specific course
router.get('/:id', authenticate, roleDataFilter, filterResponseFields, async (req, res, next) => {
  try {
    const courseId = req.params.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(courseId)) {
      // Non è un UUID: lascia che altre rotte più specifiche (es. /variants) gestiscano
      return next();
    }

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: getEffectiveTenantId(req),
        deletedAt: null,
        branchType: DEFAULT_BRANCH
      },
      include: {
        schedules: true
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'Corso non trovato' });
    }

    res.json(course);
  } catch (error) {
    logger.error('Failed to fetch course', {
      component: 'courses-routes',
      action: 'getCourse',
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id,
      courseId: req.params?.id
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nel recupero del corso'
    });
  }
});

// POST /courses - Create new course
router.post('/', authenticate, requirePermissions('courses:create'), async (req, res) => {
  try {
    // Validate required fields (supporta anche legacy `name` -> `title`)
    const incomingTitle = req.body?.title || req.body?.name;
    const { description } = req.body || {};

    if (!incomingTitle || !description) {
      return res.status(400).json({
        error: 'Errore di validazione',
        message: 'Titolo e descrizione sono obbligatori'
      });
    }

    const courseData = sanitizeCoursePayload(req.body);
    courseData.title = incomingTitle; // assicura sempre title

    // Imposta tenant dalla sessione/auth, non dal client
    if (!req.person?.tenantId) {
      return res.status(400).json({
        error: 'Tenant mancante',
        message: 'Contesto tenant obbligatorio'
      });
    }
    courseData.tenantId = getEffectiveTenantId(req);
    courseData.branchType = DEFAULT_BRANCH;

    // Ripristino se esiste un corso soft-deleted con lo stesso code per lo stesso tenant; altrimenti crea
    let course;
    if (courseData.code) {
      const existingByCode = await prisma.course.findFirst({
        where: { code: courseData.code, tenantId: courseData.tenantId },
        select: { id: true, deletedAt: true, tenantId: true }
      });

      if (existingByCode) {
        if (existingByCode.deletedAt) {
          if (existingByCode.tenantId !== courseData.tenantId) {
            return res.status(409).json({
              error: 'Conflitto',
              message: 'Un corso con questo titolo o codice esiste già'
            });
          }
          course = await prisma.course.update({
            where: { id: existingByCode.id },
            data: { ...courseData, deletedAt: null },
            include: { schedules: true }
          });

          logger.info('Course restored from soft delete', {
            component: 'courses-routes',
            action: 'restoreCourse',
            personId: req.person?.id,
            courseId: course.id,
            code: course.code
          });

          return res.status(200).json(course);
        } else {
          return res.status(409).json({
            error: 'Conflitto',
            message: 'Un corso con questo titolo o codice esiste già'
          });
        }
      }
    }

    // Nessun corso soft-deleted da ripristinare: procede con la creazione
    course = await prisma.course.create({
      data: courseData,
      include: { schedules: true }
    });

    return res.status(201).json(course);
  } catch (error) {
    logger.error('Failed to create course', {
      component: 'courses-routes',
      action: 'createCourse',
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id,
      courseTitle: req.body?.title || req.body?.name
    });

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Conflitto',
        message: 'Un corso con questo titolo o codice esiste già'
      });
    }

    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nella creazione del corso'
    });
  }
});

// PUT /courses/:id - Update course
router.put('/:id', authenticate, requirePermissions('courses:update'), async (req, res) => {
  try {
    const courseId = req.params.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(courseId)) {
      return res.status(400).json({ error: 'Formato ID corso non valido' });
    }

    // First check if course exists and user has access
    const existingCourse = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, tenantId: true, deletedAt: true }
    });

    if (!existingCourse || existingCourse.deletedAt) {
      return res.status(404).json({ error: 'Corso non trovato' });
    }

    // Verifica isolamento tenant
    if (req.person?.tenantId && existingCourse.tenantId !== getEffectiveTenantId(req)) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const courseData = sanitizeCoursePayload(req.body);

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
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id,
      courseId: req.params?.id
    });

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Conflitto',
        message: 'Un corso con questo titolo o codice esiste già'
      });
    }

    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nell\'aggiornamento del corso'
    });
  }
});

// DELETE /courses/:id - Soft delete course
router.delete('/:id', authenticate, requirePermissions('courses:delete'), async (req, res) => {
  try {
    const courseId = req.params.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(courseId)) {
      return res.status(400).json({ error: 'Formato ID corso non valido' });
    }

    // First check if course exists and user has access
    const existingCourse = await prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: getEffectiveTenantId(req),
        deletedAt: null
      }
    });

    if (!existingCourse) {
      return res.status(404).json({ error: 'Corso non trovato' });
    }

    // Implement soft delete instead of hard delete
    await prisma.course.update({
      where: { id: courseId },
      data: {
        deletedAt: new Date()
      }
    });

    res.json({
      message: 'Corso eliminato con successo',
      id: courseId
    });
  } catch (error) {
    logger.error('Failed to delete course', {
      component: 'courses-routes',
      action: 'deleteCourse',
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id,
      courseId: req.params?.id
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nell\'eliminazione del corso'
    });
  }
});

// GET /courses/variants - Recupera varianti corso per titolo/nome (autenticato, con fallback include pubblici del tenant)
router.get('/variants', authenticate, roleDataFilter, filterResponseFields, async (req, res) => {
  try {
    logger.info('Starting variants endpoint', {
      query: req.query,
      personId: req.person?.id,
      tenantId: req.person?.tenantId
    });

    const raw = (req.query?.name ?? req.query?.title ?? req.query?.search);
    const courseTitle = typeof raw === 'string' ? raw.trim() : '';
    if (!courseTitle) {
      return res.status(400).json({ error: 'Missing query parameter: name/title/search' });
    }

    logger.info('Processing course search', { courseTitle });

    // Normalizzazione robusta per confronti lato server
    const normalize = (s = '') =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // rimuovi diacritici
        .replace(/&/g, ' e ')
        .replace(/[^a-z0-9]+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const normalizeApostrophes = (s = '') => s
      .replace(/[\u2018\u2019\u201B]/g, "'") // ' ' ‛ → '
      .replace(/[\u201C\u201D]/g, '"');      // " " → "

    const STOPWORDS = new Set([
      'di', 'dei', 'degli', 'delle', 'della', 'del', 'dell', 'lo', 'la', 'le', 'gli', 'il', 'i', 'e', 'ed', 'da', 'un', 'una', 'uno',
      'per', 'con', 'su', 'tra', 'fra', 'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'dello', 'in', 'a', 'ad', 'dal', 'dai', 'dagli', 'dalle'
    ]);

    const tokenize = (s = '') => normalize(s).split(' ').filter(w => w && !STOPWORDS.has(w));
    const tokenOverlap = (a = [], b = []) => {
      if (!Array.isArray(a) || !Array.isArray(b)) return 0;
      const setB = new Set(b);
      let score = 0;
      for (const tok of a) {
        if (setB.has(tok)) score++;
      }
      return score;
    };

    // Accesso: corsi del tenant oppure pubblici
    const accessWhere = req.person?.tenantId
      ? { OR: [{ tenantId: getEffectiveTenantId(req) }, { isPublic: true }] }
      : { isPublic: true };

    logger.info('Access where clause', { accessWhere });

    const baseSelect = {
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
      practicalHours: true,
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
        where: { deletedAt: null },
        select: { id: true, startDate: true, endDate: true }
      }
    };

    logger.info('Starting database queries');

    const normalizedApos = normalizeApostrophes(courseTitle);

    // 1) Match esatto case-insensitive (titolo originale)
    logger.info('Executing exact match query');
    let courses = await prisma.course.findMany({
      where: {
        deletedAt: null,
        ...accessWhere,
        title: { equals: courseTitle, mode: 'insensitive' }
      },
      select: baseSelect
    });

    logger.info('Exact match completed', { count: courses?.length || 0 });

    // 1.b) Match esatto con apostrofi normalizzati
    if (normalizedApos && normalizedApos !== courseTitle) {
      logger.info('Executing normalized apostrophes query');
      const eqApos = await prisma.course.findMany({
        where: {
          deletedAt: null,
          ...accessWhere,
          title: { equals: normalizedApos, mode: 'insensitive' }
        },
        select: baseSelect
      });
      const mapEq = new Map();
      for (const c of [...(courses || []), ...eqApos]) mapEq.set(c.id, c);
      courses = Array.from(mapEq.values());
      logger.info('Normalized apostrophes completed', { count: courses?.length || 0 });
    }

    // 2) Fallback su contains case-insensitive (originale + apostrofi normalizzati)
    if (!Array.isArray(courses) || courses.length <= 1) {
      logger.info('Executing contains query');
      const containsOriginal = await prisma.course.findMany({
        where: {
          deletedAt: null,
          ...accessWhere,
          title: { contains: courseTitle, mode: 'insensitive' }
        },
        select: baseSelect,
        take: 200
      });

      let containsApos = [];
      if (normalizedApos && normalizedApos !== courseTitle) {
        containsApos = await prisma.course.findMany({
          where: {
            deletedAt: null,
            ...accessWhere,
            title: { contains: normalizedApos, mode: 'insensitive' }
          },
          select: baseSelect,
          take: 200
        });
      }

      const map = new Map();
      for (const c of [...(courses || []), ...containsOriginal, ...containsApos]) {
        map.set(c.id, c);
      }
      courses = Array.from(map.values());
      logger.info('Contains query completed', { count: courses?.length || 0 });
    }

    // 3) Fallback token-based: se ancora nessun match, usa tokenizzazione per trovare macro-corsi
    if (!Array.isArray(courses) || courses.length === 0) {
      logger.info('Executing token-based query');
      const allAccessible = await prisma.course.findMany({
        where: { deletedAt: null, ...accessWhere },
        select: baseSelect,
        take: 800
      });
      const wantedTokens = tokenize(courseTitle);
      let matched = allAccessible.filter(c => {
        const tokens = tokenize(c.title || '');
        return wantedTokens.length > 0 && wantedTokens.every(tok => tokens.includes(tok));
      });
      if (matched.length === 0) {
        const scored = allAccessible
          .map(c => ({ c, score: tokenOverlap(wantedTokens, tokenize(c.title || '')) }))
          .filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 50)
          .map(x => x.c);
        matched = scored;
      }
      courses = matched;
      logger.info('Token-based query completed', { count: courses?.length || 0 });
    }

    // Ordinamento leggero per rendere prevedibile l'output (tipo corso, rischio)
    if (Array.isArray(courses) && courses.length > 1) {
      courses.sort((a, b) => {
        const ctA = String(a.courseType || '');
        const ctB = String(b.courseType || '');
        const rlA = String(a.riskLevel || '');
        const rlB = String(b.riskLevel || '');
        const t = ctA.localeCompare(ctB);
        if (t !== 0) return t;
        return rlA.localeCompare(rlB);
      });
    }

    logger.info('Fetched course variants', {
      courseTitle,
      normalizedApostrophes: normalizedApos !== courseTitle,
      count: Array.isArray(courses) ? courses.length : 0,
      personId: req.person?.id
    });
    return res.json(courses);
  } catch (error) {
    logger.error('Failed to fetch course variants', {
      component: 'courses-routes',
      action: 'getCourseVariants',
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id,
      query: req.query
    });
    return res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nel recupero delle varianti del corso'
    });
  }
});

/**
 * POST /courses/bulk-import
 * Importa corsi in blocco da CSV
 */
router.post('/bulk-import', authenticate, requirePermissions('courses:create'), async (req, res) => {
  try {
    const { courses, overwriteIds = [] } = req.body;
    const tenantId = getEffectiveTenantId(req);

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant mancante',
        message: 'Contesto tenant obbligatorio'
      });
    }

    if (!courses || !Array.isArray(courses)) {
      return res.status(400).json({
        error: 'Errore di validazione',
        message: 'Array di corsi obbligatorio'
      });
    }

    logger.info('[COURSES] Bulk import started', {
      tenantId,
      totalCourses: courses.length,
      overwriteIds: overwriteIds.length,
      personId: req.person?.id
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const courseData of courses) {
      try {
        // Sanitize e prepara dati
        const sanitized = sanitizeCoursePayload(courseData);
        sanitized.tenantId = tenantId;

        // Verifica se deve sovrascrivere
        const shouldOverwrite = overwriteIds.includes(courseData.id);

        if (shouldOverwrite && courseData.id) {
          // Update esistente
          await prisma.course.update({
            where: { id: courseData.id },
            data: sanitized
          });
          updated++;
        } else if (sanitized.code) {
          // Verifica duplicato per code
          const existing = await prisma.course.findFirst({
            where: {
              code: sanitized.code,
              tenantId,
              deletedAt: null
            }
          });

          if (existing) {
            skipped++;
            errors.push({
              course: sanitized.title || sanitized.code,
              error: 'Duplicate code',
              code: sanitized.code
            });
          } else {
            // Crea nuovo
            await prisma.course.create({ data: sanitized });
            created++;
          }
        } else {
          // Nessun code, crea sempre
          await prisma.course.create({ data: sanitized });
          created++;
        }
      } catch (err) {
        logger.error('[COURSES] Bulk import single course failed', {
          error: 'Operazione non riuscita',
          courseTitle: courseData.title,
          tenantId
        });
        errors.push({
          course: courseData.title || courseData.code || 'Unknown',
          error: 'Errore nell\'importazione del corso'
        });
        skipped++;
      }
    }

    logger.info('[COURSES] Bulk import completed', {
      tenantId,
      created,
      updated,
      skipped,
      errors: errors.length,
      personId: req.person?.id
    });

    res.json({
      success: true,
      totalSubmitted: courses.length,
      created,
      updated,
      skipped,
      errors,
      message: `Import completato: ${created} creati, ${updated} aggiornati, ${skipped} saltati`
    });

  } catch (error) {
    logger.error('[COURSES] Bulk import failed', {
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Errore nell\'importazione dei corsi',
    });
  }
});

export default router;