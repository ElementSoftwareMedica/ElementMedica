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
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { isTrainerOnlyAccess, getTrainerScheduleIds } from '../../utils/trainerAccess.js';

const router = express.Router();

const isSignedAttestato = (attestato) => Boolean(
  attestato.firmaFormatore ||
  attestato.firmaFormatoreAt ||
  attestato.firmaPartecipante ||
  attestato.firmaPartecipanteAt
);

async function auditAttestatoDelete(req, attestato, tenantId, deletionReason, db = prisma) {
  if (isSignedAttestato(attestato)) {
    await db.gdprAuditLog.create({
      data: {
        tenantId,
        personId: req.person.id,
        resourceType: 'Attestato',
        resourceId: attestato.id,
        action: 'DELETE',
        dataAccessed: {
          operation: 'SOFT_DELETE',
          deletionReason,
          signedDocument: true,
          personId: attestato.personId,
          scheduledCourseId: attestato.scheduledCourseId
        },
        ipAddress: req.ip || null,
        userAgent: req.get?.('user-agent') || null
      }
    });
    return;
  }

  await db.activityLog.create({
    data: {
      personId: req.person.id,
      tenantId,
      action: 'ATTESTATO_DELETE',
      category: 'DOCUMENTS',
      resource: 'Attestato',
      resourceId: attestato.id,
      details: deletionReason,
      metadata: { signedDocument: false, scheduledCourseId: attestato.scheduledCourseId },
      ipAddress: req.ip || null,
      userAgent: req.get?.('user-agent') || null
    }
  });
}

/**
 * GET /api/v1/attestati
 * Get all certificates with optional filters
 */
router.get('/', authenticateToken, requirePermission('documents:read'), async (req, res) => {
  try {
    const { scheduleId, year, branchType } = req.query;
    let personId = req.query.personId;
    const tenantId = getEffectiveTenantId(req);
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
    // Filtro per ramo (FORMAZIONE/MEDICA): la pagina Documenti Corsi mostra solo formazione,
    // così le visite mediche (ramo MEDICA) non compaiono tra i documenti dei corsi.
    if (branchType) where.scheduledCourse = { branchType };

    // TRAINER-only: limita agli attestati dei propri corsi programmati
    const isTrainerOnly = await isTrainerOnlyAccess(person.id, tenantId);
    if (isTrainerOnly) {
      const scheduleIds = await getTrainerScheduleIds(person.id, tenantId);
      if (scheduleIds.length === 0) return res.json([]);
      where.scheduledCourseId = { in: scheduleIds };
    }

    const attestati = await prisma.attestato.findMany({
      where,
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            taxCode: true,
            tenantProfiles: {
              where: { deletedAt: null },
              select: { email: true },
              take: 1
            }
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

      const { taxCode, tenantProfiles, ...personRest } = attestato.person;
      const email = tenantProfiles?.[0]?.email || '';
      return {
        ...attestato,
        person: {
          ...personRest,
          cf: taxCode || '',
          email
        }
      };
    });

    res.json(mappedAttestati);
  } catch (error) {
    logger.error('Failed to fetch attestati', {
      component: 'attestati-routes',
      action: 'list',
      error: 'Operazione non riuscita',
      stack: error.stack,
      personId: req.person?.id
    });
    res.status(500).json({
      error: 'Errore nel recupero degli attestati'
    });
  }
});

/**
 * GET /api/v1/attestati/:id
 * Get single certificate with full details
 */
router.get('/:id', authenticateToken, requirePermission('documents:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

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
      return res.status(404).json({ error: 'Attestato non trovato' });
    }

    res.json(attestato);
  } catch (error) {
    logger.error('Failed to fetch attestato', {
      component: 'attestati-routes',
      action: 'get',
      attestatoId: req.params.id,
      error: 'Operazione non riuscita',
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Errore nel recupero dell\'attestato' });
  }
});

/**
 * DELETE /api/v1/attestati/:id
 * Soft delete certificate
 */
router.delete('/:id', authenticateToken, requirePermission('documents:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = getEffectiveTenantId(req);

    const attestato = await prisma.attestato.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      }
    });

    if (!attestato) {
      return res.status(404).json({ error: 'Certificato non trovato' });
    }

    const deletionReason = req.body?.deletionReason || 'Eliminazione attestato formazione';

    await prisma.$transaction(async (tx) => {
      await tx.attestato.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
      await auditAttestatoDelete(req, attestato, tenantId, deletionReason, tx);
    });

    logger.info('Certificate deleted', {
      component: 'attestati-routes',
      action: 'delete',
      attestatoId: id,
      personId: req.person?.id
    });

    res.json({ message: 'Certificato eliminato con successo' });
  } catch (error) {
    logger.error('Failed to delete certificate', {
      component: 'attestati-routes',
      action: 'delete',
      attestatoId: req.params.id,
      error: 'Operazione non riuscita',
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Errore nell\'eliminazione del certificato' });
  }
});

/**
 * POST /api/v1/attestati/delete-batch
 * Soft delete multiple certificates
 */
router.post('/delete-batch', authenticateToken, requirePermission('documents:delete'), async (req, res) => {
  try {
    const { ids } = req.body;
    const tenantId = getEffectiveTenantId(req);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Richiesta non valida: array ids obbligatorio' });
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
      return res.status(404).json({ error: 'Nessun certificato trovato' });
    }

    const deletionReason = req.body?.deletionReason || 'Eliminazione multipla attestati formazione';

    await prisma.$transaction(async (tx) => {
      await tx.attestato.updateMany({
        where: {
          id: { in: attestati.map(a => a.id) },
          tenantId
        },
        data: { deletedAt: new Date() }
      });
      await Promise.all(attestati.map(attestato => auditAttestatoDelete(req, attestato, tenantId, deletionReason, tx)));
    });

    logger.info('Batch certificates deleted', {
      component: 'attestati-routes',
      action: 'delete-batch',
      count: attestati.length,
      personId: req.person?.id
    });

    res.json({
      message: `${attestati.length} certificato/i eliminato/i con successo`,
      deleted: attestati.length
    });
  } catch (error) {
    logger.error('Failed to delete certificates in batch', {
      component: 'attestati-routes',
      action: 'delete-batch',
      error: 'Operazione non riuscita',
      personId: req.person?.id
    });
    res.status(500).json({ error: 'Errore nell\'eliminazione dei certificati' });
  }
});

export default router;
