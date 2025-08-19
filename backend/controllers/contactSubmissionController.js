/**
 * Contact Submission Controller
 * Gestisce le submission dei form pubblici e privati
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Crea una nuova submission
 * POST /api/v1/submissions
 */
const createSubmission = async (req, res) => {
  try {
    const {
      type = 'CONTACT',
      name,
      email,
      phone,
      company,
      subject,
      message,
      metadata = {},
      source = 'public_website',
      privacyAccepted = false,
      marketingAccepted = false
    } = req.body;

    // Validazione campi obbligatori
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      error: 'Campi obbligatori mancanti',
      required: ['name', 'email', 'subject', 'message']
    });
  }

  // Validazione formato email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Formato email non valido'
    });
  }

  // Validazione GDPR - privacyAccepted è obbligatorio
  if (!privacyAccepted) {
    return res.status(400).json({
      error: 'Accettazione della privacy policy è obbligatoria',
      field: 'privacyAccepted'
    });
  }

    // Ottieni tenant ID - per le submission pubbliche, usa il primo tenant attivo
    console.log('🔍 [CONTACT SUBMISSION] req.tenantId:', req.tenantId);
    console.log('🔍 [CONTACT SUBMISSION] req.tenant:', req.tenant);
    
    let tenantId = req.tenantId || req.tenant?.id;
    console.log('🔍 [CONTACT SUBMISSION] tenantId iniziale:', tenantId);
    
    if (!tenantId) {
      console.log('🔍 [CONTACT SUBMISSION] Nessun tenantId, cerco tenant di default...');
      // Per le submission pubbliche, trova il primo tenant attivo
      const defaultTenant = await prisma.tenant.findFirst({
        where: {
          isActive: true,
          deletedAt: null
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      
      console.log('🔍 [CONTACT SUBMISSION] defaultTenant trovato:', defaultTenant);
      
      if (!defaultTenant) {
        console.error('❌ [CONTACT SUBMISSION] Nessun tenant attivo trovato');
        return res.status(500).json({
          error: 'Nessun tenant attivo trovato'
        });
      }
      
      tenantId = defaultTenant.id;
      console.log('🔍 [CONTACT SUBMISSION] tenantId finale:', tenantId);
    }
    
    // Ottieni informazioni aggiuntive dalla richiesta
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    const submission = await prisma.ContactSubmission.create({
      data: {
        type,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim(),
        company: company?.trim(),
        subject: subject.trim(),
        message: message.trim(),
        metadata,
        ipAddress: clientIp,
        userAgent,
        source,
        privacyAccepted,
        marketingAccepted,
        tenantId
      }
    });

    res.status(201).json({
      success: true,
      message: 'Richiesta inviata con successo',
      submissionId: submission.id
    });

  } catch (error) {
    console.error('Errore creazione submission:', error);
    res.status(500).json({
      error: 'Errore interno del server',
      message: 'Impossibile processare la richiesta'
    });
  }
};

/**
 * Ottieni lista submissions (solo per utenti autenticati)
 * GET /api/v1/submissions
 */
const getSubmissions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const tenantId = req.person?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID richiesto' });
    }

    // Costruisci filtri
    const where = {
      tenantId,
      ...(status && { status }),
      ...(type && { type }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    // Calcola offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Ottieni submissions con conteggio totale
    const [submissions, total] = await Promise.all([
      prisma.ContactSubmission.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.ContactSubmission.count({ where })
    ]);

    res.json({
      submissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Errore recupero submissions:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
};

/**
 * Ottieni dettaglio submission
 * GET /api/v1/submissions/:id
 */
const getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.person?.tenantId;

    const submission = await prisma.ContactSubmission.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission non trovata' });
    }

    // Marca come letta se non lo è già
    if (submission.status === 'NEW') {
      await prisma.ContactSubmission.update({
        where: { id },
        data: {
          status: 'READ',
          readAt: new Date()
        }
      });
      submission.status = 'READ';
      submission.readAt = new Date();
    }

    res.json(submission);

  } catch (error) {
    console.error('Errore recupero submission:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
};

/**
 * Aggiorna status submission
 * PUT /api/v1/submissions/:id/status
 */
const updateSubmissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedToId } = req.body;
    const tenantId = req.person?.tenantId;

    // Validazione status
    const validStatuses = ['NEW', 'READ', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Status non valido',
        validStatuses
      });
    }

    // Verifica esistenza submission
    const submission = await prisma.ContactSubmission.findFirst({
      where: { id, tenantId }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission non trovata' });
    }

    // Prepara dati aggiornamento
    const updateData = {
      status,
      updatedAt: new Date()
    };

    // Aggiungi timestamp specifici
    if (status === 'READ' && !submission.readAt) {
      updateData.readAt = new Date();
    }
    if (status === 'RESOLVED' && !submission.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    // Aggiungi assegnazione se specificata
    if (assignedToId !== undefined) {
      updateData.assignedToId = assignedToId;
    }

    const updatedSubmission = await prisma.ContactSubmission.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      submission: updatedSubmission
    });

  } catch (error) {
    console.error('Errore aggiornamento submission:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
};

/**
 * Elimina submission (soft delete)
 * DELETE /api/v1/submissions/:id
 */
const deleteSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.person?.tenantId;

    const submission = await prisma.ContactSubmission.findFirst({
      where: { id, tenantId }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission non trovata' });
    }

    await prisma.ContactSubmission.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Submission archiviata con successo'
    });

  } catch (error) {
    console.error('Errore eliminazione submission:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
};

/**
 * Statistiche submissions
 * GET /api/v1/submissions/stats
 */
const getSubmissionStats = async (req, res) => {
  try {
    const tenantId = req.person?.tenantId;
    const { period = '30d' } = req.query;

    // Calcola data inizio periodo
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const [
      totalSubmissions,
      newSubmissions,
      inProgressSubmissions,
      resolvedSubmissions,
      submissionsByType,
      recentSubmissions
    ] = await Promise.all([
      // Totale submissions
      prisma.ContactSubmission.count({
        where: {
          tenantId,
          createdAt: { gte: startDate }
        }
      }),
      // Nuove submissions
      prisma.ContactSubmission.count({
        where: {
          tenantId,
          status: 'NEW',
          createdAt: { gte: startDate }
        }
      }),
      // In progress
      prisma.ContactSubmission.count({
        where: {
          tenantId,
          status: 'IN_PROGRESS',
          createdAt: { gte: startDate }
        }
      }),
      // Risolte
      prisma.ContactSubmission.count({
        where: {
          tenantId,
          status: 'RESOLVED',
          createdAt: { gte: startDate }
        }
      }),
      // Per tipo
      prisma.ContactSubmission.groupBy({
        by: ['type'],
        where: {
          tenantId,
          createdAt: { gte: startDate }
        },
        _count: true
      }),
      // Recenti
      prisma.ContactSubmission.findMany({
        where: {
          tenantId,
          createdAt: { gte: startDate }
        },
        select: {
          id: true,
          type: true,
          name: true,
          email: true,
          subject: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    res.json({
      period,
      stats: {
        total: totalSubmissions,
        new: newSubmissions,
        inProgress: inProgressSubmissions,
        resolved: resolvedSubmissions,
        byType: submissionsByType.reduce((acc, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {}),
        recent: recentSubmissions
      }
    });

  } catch (error) {
    console.error('Errore statistiche submissions:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
};

export {
  createSubmission,
  getSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
  deleteSubmission,
  getSubmissionStats
};