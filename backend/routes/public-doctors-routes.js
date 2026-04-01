/**
 * Public Doctors Routes
 * 
 * Endpoints pubblici per profili medici.
 * Non richiedono autenticazione, usano publicContentMiddleware per tenant resolution.
 * 
 * Servono dati per:
 * - Pagina team/equipe medica (listing)
 * - Profilo singolo medico con specialità e disponibilità
 * - Widget di prenotazione per medico specifico
 * 
 * @module routes/public-doctors-routes
 */

import express from 'express';
import { getMedicoTitle } from '../utils/medicoFormatters.js';
import { query, param, validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import prisma from '../config/prisma-optimization.js';
import { publicContentMiddleware } from '../middleware/brandDetection.js';
import { validateParamId } from '../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);

// ======================================================
// PUBLIC DOCTORS - Profili medici visibili pubblicamente
// ======================================================

/**
 * GET /api/public/doctors
 * 
 * Lista medici con profilo pubblico completo.
 * Restituisce solo medici attivi con almeno uno slot pubblico.
 * 
 * @query {string} specialty - Filtra per specializzazione
 * @query {string} search - Ricerca per nome
 * @query {number} limit - Max risultati (default: 50)
 */
router.get('/doctors', [
  publicContentMiddleware,
  query('specialty').optional().isString().trim(),
  query('search').optional().isString().trim(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tenantId = req.publicTenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant non identificato. Verificare il dominio.' });
    }

    const { specialty, search, limit = 50 } = req.query;

    // Build search conditions
    const searchConditions = [];
    if (search) {
      searchConditions.push(
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      );
    }

    const doctors = await prisma.person.findMany({
      where: {
        deletedAt: null,
        tenantProfiles: {
          some: {
            tenantId,
            deletedAt: null,
            isActive: true
          }
        },
        // Only doctors with medical roles in this tenant
        personRoles: {
          some: {
            tenantId,
            deletedAt: null,
            roleType: { in: ['MEDICO', 'MEDICO_COMPETENTE', 'CLINIC_ADMIN'] }
          }
        },
        ...(searchConditions.length > 0 && { OR: searchConditions })
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gender: true,
        profileImage: true,
        tenantProfiles: {
          where: { tenantId, deletedAt: null, isActive: true },
          select: {
            title: true,
            shortDescription: true,
            fullDescription: true,
            specialties: true,
            certifications: true
          },
          take: 1
        },
        _count: {
          select: {
            slotDisponibilita: {
              where: {
                tenantId,
                deletedAt: null,
                visibilePubblico: true,
                prenotabileOnline: true,
                disponibile: true,
                stato: 'LIBERO',
                data: { gte: new Date() }
              }
            }
          }
        }
      },
      orderBy: { lastName: 'asc' },
      take: limit
    });

    // Filter by specialty if provided (post-query filter on array field)
    let filteredDoctors = doctors;
    if (specialty) {
      filteredDoctors = doctors.filter(d => {
        const profile = d.tenantProfiles?.[0];
        return profile?.specialties?.some(s =>
          s.toLowerCase().includes(specialty.toLowerCase())
        );
      });
    }

    // Map to clean public response
    const doctorsFormatted = filteredDoctors.map(d => {
      const profile = d.tenantProfiles?.[0] || {};
      return {
        id: d.id,
        nome: `${getMedicoTitle(d.gender)} ${d.lastName} ${d.firstName}`.trim(),
        firstName: d.firstName,
        lastName: d.lastName,
        gender: d.gender,
        profileImage: d.profileImage || null,
        title: profile.title || null,
        shortDescription: profile.shortDescription || null,
        fullDescription: profile.fullDescription || null,
        specialties: profile.specialties || [],
        certifications: profile.certifications || [],
        slotDisponibili: d._count.slotDisponibilita
      };
    });

    res.json({
      success: true,
      data: doctorsFormatted,
      count: doctorsFormatted.length
    });

  } catch (error) {
    logger.error('Error fetching public doctors', {
      component: 'public-doctors-routes',
      action: 'getDoctors',
      error: 'Operazione non riuscita'
    });
    res.status(500).json({ error: 'Errore nel recupero profili medici' });
  }
});

/**
 * GET /api/public/doctors/:id
 * 
 * Profilo singolo medico con dettaglio completo.
 * Include specialità, descrizione, prossimi slot disponibili.
 * 
 * @param {string} id - UUID del medico
 */
router.get('/doctors/:id', [
  publicContentMiddleware,
  param('id').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tenantId = req.publicTenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant non identificato' });
    }

    const doctor = await prisma.person.findFirst({
      where: {
        id: req.params.id,
        deletedAt: null,
        tenantProfiles: {
          some: {
            tenantId,
            deletedAt: null,
            isActive: true
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gender: true,
        profileImage: true,
        tenantProfiles: {
          where: { tenantId, deletedAt: null, isActive: true },
          select: {
            title: true,
            shortDescription: true,
            fullDescription: true,
            specialties: true,
            certifications: true
          },
          take: 1
        },
        // Prestazioni abilitate per questo medico
        abilitazioni: {
          where: {
            deletedAt: null,
            attivo: true,
            prestazione: {
              tenantId,
              deletedAt: null,
              attivo: true
            }
          },
          select: {
            prestazione: {
              select: {
                id: true,
                nome: true,
                descrizione: true,
                tipo: true,
                durataPrevista: true,
                prezzoBase: true
              }
            }
          }
        },
        // Prossimi 10 slot disponibili
        slotDisponibilita: {
          where: {
            tenantId,
            deletedAt: null,
            visibilePubblico: true,
            prenotabileOnline: true,
            disponibile: true,
            stato: 'LIBERO',
            data: { gte: new Date() }
          },
          select: {
            id: true,
            data: true,
            oraInizio: true,
            oraFine: true,
            prestazione: {
              select: { nome: true }
            }
          },
          orderBy: [{ data: 'asc' }, { oraInizio: 'asc' }],
          take: 10
        }
      }
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Medico non trovato' });
    }

    const profile = doctor.tenantProfiles?.[0] || {};

    res.json({
      success: true,
      data: {
        id: doctor.id,
        nome: `${getMedicoTitle(doctor.gender)} ${doctor.lastName} ${doctor.firstName}`.trim(),
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        gender: doctor.gender,
        profileImage: doctor.profileImage || null,
        title: profile.title || null,
        shortDescription: profile.shortDescription || null,
        fullDescription: profile.fullDescription || null,
        specialties: profile.specialties || [],
        certifications: profile.certifications || [],
        prestazioni: doctor.abilitazioni.map(a => a.prestazione),
        prossimiSlot: doctor.slotDisponibilita.map(s => ({
          id: s.id,
          data: s.data,
          oraInizio: s.oraInizio,
          oraFine: s.oraFine,
          prestazione: s.prestazione?.nome || null
        }))
      }
    });

  } catch (error) {
    logger.error('Error fetching doctor detail', {
      component: 'public-doctors-routes',
      action: 'getDoctorById',
      doctorId: req.params.id,
      error: 'Operazione non riuscita'
    });
    res.status(500).json({ error: 'Errore nel recupero profilo medico' });
  }
});

export default router;
