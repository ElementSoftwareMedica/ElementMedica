/**
 * Attestati CRUD Routes
 * 
 * Gestione base attestati:
 * - GET / - Lista attestati
 * - GET /:id - Dettaglio attestato
 * - DELETE /:id - Eliminazione attestato
 * - POST /delete-batch - Eliminazione batch
 * 
 * @module routes/attestati/crud.routes
 */

import {
  express,
  prisma,
  authenticateToken,
  requirePermission,
  logger,
  isEmployeeOnlyAccess
} from './common.js';

const router = express.Router();

/**
 * GET /api/v1/attestati
 * Get all certificates with optional filters
 */
router.get('/', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
  try {
    const { scheduleId, year } = req.query;
    let personId = req.query.personId;
    const tenantId = req.person.tenantId;
    const person = req.person;

    // Se è EMPLOYEE, forza il filtro per il proprio personId
    const isEmployeeOnly = await isEmployeeOnlyAccess(person.id, tenantId);
    if (isEmployeeOnly) {
      personId = person.id;
    }

    const where = {
      tenantId,
      deletedAt: null
    };

    if (scheduleId) where.scheduledCourseId = scheduleId;
    if (personId) where.personId = personId;
    if (year) where.annoProgressivo = parseInt(year);

    const attestati = await prisma.attestato.findMany({
      where,
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            taxCode: true,
            email: true
          }
        },
        scheduledCourse: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                code: true,
                duration: true,
                category: true
              }
            },
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
        { annoProgressivo: 'desc' },
        { numeroProgressivo: 'desc' }
      ]
    });

    // Map taxCode to cf for frontend compatibility
    const mappedAttestati = attestati.map(attestato => {
      if (!attestato.person) {
        return {
          ...attestato,
          person: {
            id: null,
            firstName: '',
            lastName: '',
            cf: '',
            email: ''
          }
        };
      }

      const { taxCode, ...personWithoutTaxCode } = attestato.person;
      return {
        ...attestato,
        person: {
          ...personWithoutTaxCode,
          cf: taxCode || ''
        }
      };
    });

    res.json(mappedAttestati);
  } catch (error) {
    logger.error('Failed to fetch attestati', {
      component: 'attestati-routes',
      action: 'list',
      error: error.message,
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Failed to fetch attestati',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/v1/attestati/:id
 * Get single certificate with full details
 */
router.get('/:id', authenticateToken(), requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.person.tenantId;

    const attestato = await prisma.attestato.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      include: {
        person: true,
        scheduledCourse: {
          include: {
            course: true,
            trainer: true,
            companies: {
              include: { company: true }
            }
          }
        }
      }
    });

    if (!attestato) {
      return res.status(404).json({ error: 'Attestato not found' });
    }

    res.json(attestato);
  } catch (error) {
    logger.error('Failed to fetch attestato', {
      component: 'attestati-routes',
      action: 'get',
      attestatoId: req.params.id,
      error: error.message,
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Failed to fetch attestato' });
  }
});

/**
 * DELETE /api/v1/attestati/:id
 * Soft delete certificate
 */
router.delete('/:id', authenticateToken(), requirePermission('documents:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.person.tenantId;

    const attestato = await prisma.attestato.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      }
    });

    if (!attestato) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    await prisma.attestato.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    logger.info('Certificate deleted', {
      component: 'attestati-routes',
      action: 'delete',
      attestatoId: id,
      personId: req.person?.id
    });

    res.json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete certificate', {
      component: 'attestati-routes',
      action: 'delete',
      attestatoId: req.params.id,
      error: error.message,
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Failed to delete certificate' });
  }
});

/**
 * POST /api/v1/attestati/delete-batch
 * Soft delete multiple certificates
 */
router.post('/delete-batch', authenticateToken(), requirePermission('documents:delete'), async (req, res) => {
  try {
    const { ids } = req.body;
    const tenantId = req.person.tenantId;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid request: ids array required' });
    }

    // Verify all attestati belong to tenant
    const attestati = await prisma.attestato.findMany({
      where: {
        id: { in: ids },
        tenantId,
        deletedAt: null
      }
    });

    if (attestati.length === 0) {
      return res.status(404).json({ error: 'No certificates found' });
    }

    // Soft delete all found certificates
    await prisma.attestato.updateMany({
      where: {
        id: { in: attestati.map(a => a.id) },
        tenantId
      },
      data: { deletedAt: new Date() }
    });

    logger.info('Batch certificates deleted', {
      component: 'attestati-routes',
      action: 'delete-batch',
      count: attestati.length,
      personId: req.person?.id
    });

    res.json({
      message: `${attestati.length} certificate(s) deleted successfully`,
      deleted: attestati.length
    });
  } catch (error) {
    logger.error('Failed to delete certificates in batch', {
      component: 'attestati-routes',
      action: 'delete-batch',
      error: error.message,
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Failed to delete certificates' });
  }
});

export default router;
