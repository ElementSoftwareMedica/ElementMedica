/**
 * SedePoliambulatorio Service
 * Gestione CRUD sedi dei poliambulatori con multi-tenancy e soft delete
 * Include gestione avanzata orari settimanali e chiusure speciali
 * 
 * @module SedePoliambulatorioService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

class SedePoliambulatorioService {
  /**
   * Crea una nuova sede con orari e chiusure
   * @param {Object} data - Dati della sede
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Sede creata
   */
  async create(data, tenantId) {
    const {
      poliambulatorioId,
      direttoreSanitarioId,
      nome,
      codice,
      indirizzo,
      citta,
      cap,
      provincia,
      telefono,
      email,
      latitudine,
      longitudine,
      isPrincipale,
      oraAperturaOverride,
      oraChiusuraOverride,
      noteAccessibilita,
      createdBy,
      orariSettimanali,
      chiusureSpeciali
    } = data;

    // Se isPrincipale, rimuovi il flag dalle altre sedi
    if (isPrincipale) {
      await prisma.sedePoliambulatorio.updateMany({
        where: { poliambulatorioId, tenantId, deletedAt: null },
        data: { isPrincipale: false }
      });
    }

    // Crea sede con transaction per includere orari e chiusure
    const sede = await prisma.$transaction(async (tx) => {
      // Crea la sede
      const newSede = await tx.sedePoliambulatorio.create({
        data: {
          poliambulatorioId,
          direttoreSanitarioId,
          nome,
          codice,
          indirizzo,
          citta,
          cap,
          provincia,
          telefono,
          email,
          latitudine: latitudine ? parseFloat(latitudine) : null,
          longitudine: longitudine ? parseFloat(longitudine) : null,
          isPrincipale: isPrincipale || false,
          oraAperturaOverride,
          oraChiusuraOverride,
          noteAccessibilita,
          tenantId,
          createdBy
        }
      });

      // Crea orari settimanali se forniti
      if (orariSettimanali && Array.isArray(orariSettimanali) && orariSettimanali.length > 0) {
        await tx.orarioSede.createMany({
          data: orariSettimanali.map(o => ({
            sedeId: newSede.id,
            giornoSettimana: o.giornoSettimana,
            fascia: o.fascia || 1,
            oraInizio: o.oraInizio,
            oraFine: o.oraFine,
            isChiuso: o.isChiuso || false,
            note: o.note,
            tenantId
          }))
        });
      }

      // Crea chiusure speciali se fornite
      if (chiusureSpeciali && Array.isArray(chiusureSpeciali) && chiusureSpeciali.length > 0) {
        await tx.chiusuraSpecialeSede.createMany({
          data: chiusureSpeciali.map(c => ({
            sedeId: newSede.id,
            tipo: c.tipo,
            nome: c.nome,
            descrizione: c.descrizione,
            dataInizio: new Date(c.dataInizio),
            dataFine: new Date(c.dataFine),
            oraInizio: c.oraInizio,
            oraFine: c.oraFine,
            isParziale: c.isParziale || false,
            ricorrente: c.ricorrente || false,
            annoRiferimento: c.annoRiferimento,
            attivo: c.attivo !== false,
            tenantId
          }))
        });
      }

      // Ritorna sede con relazioni
      return tx.sedePoliambulatorio.findFirst({
        where: { id: newSede.id },
        include: {
          poliambulatorio: true,
          direttoreSanitario: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          ambulatori: true,
          orariSettimanali: { where: { deletedAt: null }, orderBy: [{ giornoSettimana: 'asc' }, { fascia: 'asc' }] },
          chiusureSpeciali: { where: { deletedAt: null }, orderBy: { dataInizio: 'asc' } }
        }
      });
    });

    logger.info({ sedeId: sede.id, tenantId }, 'Sede poliambulatorio creata');
    return sede;
  }

  /**
   * Ottiene tutte le sedi di un tenant
   * @param {string} tenantId - ID del tenant
   * @param {Object} options - Opzioni di filtro
   * @returns {Promise<Array>} Lista sedi
   */
  async findAll(tenantId, options = {}) {
    const {
      poliambulatorioId,
      isAttiva,
      search,
      page = 1,
      limit = 50
    } = options;

    const where = {
      tenantId,
      deletedAt: null,
      ...(poliambulatorioId && { poliambulatorioId }),
      ...(isAttiva !== undefined && { isAttiva })
    };

    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { codice: { contains: search, mode: 'insensitive' } },
        { citta: { contains: search, mode: 'insensitive' } },
        { indirizzo: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [sedi, total] = await Promise.all([
      prisma.sedePoliambulatorio.findMany({
        where,
        include: {
          poliambulatorio: { select: { id: true, nome: true } },
          direttoreSanitario: {
            select: { id: true, firstName: true, lastName: true }
          },
          _count: { select: { ambulatori: true } }
        },
        orderBy: [{ isPrincipale: 'desc' }, { nome: 'asc' }],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.sedePoliambulatorio.count({ where })
    ]);

    return { data: sedi, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Ottiene una sede per ID con orari e chiusure
   * @param {string} id - ID della sede
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object|null>} Sede trovata
   */
  async findById(id, tenantId) {
    return prisma.sedePoliambulatorio.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        poliambulatorio: true,
        direttoreSanitario: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        },
        ambulatori: {
          where: { deletedAt: null },
          include: {
            _count: { select: { orari: true, strumenti: true } }
          }
        },
        orariSettimanali: {
          where: { deletedAt: null },
          orderBy: [{ giornoSettimana: 'asc' }, { fascia: 'asc' }]
        },
        chiusureSpeciali: {
          where: { deletedAt: null },
          orderBy: { dataInizio: 'asc' }
        }
      }
    });
  }

  /**
   * Aggiorna una sede con orari e chiusure
   * @param {string} id - ID della sede
   * @param {Object} data - Dati da aggiornare
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Sede aggiornata
   */
  async update(id, data, tenantId) {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Sede non trovata');
    }

    const {
      direttoreSanitarioId,
      nome,
      codice,
      indirizzo,
      citta,
      cap,
      provincia,
      telefono,
      email,
      latitudine,
      longitudine,
      isPrincipale,
      isAttiva,
      oraAperturaOverride,
      oraChiusuraOverride,
      noteAccessibilita,
      orariSettimanali,
      chiusureSpeciali
    } = data;

    // Se isPrincipale, rimuovi il flag dalle altre sedi
    if (isPrincipale && !existing.isPrincipale) {
      await prisma.sedePoliambulatorio.updateMany({
        where: {
          poliambulatorioId: existing.poliambulatorioId,
          tenantId,
          deletedAt: null,
          id: { not: id }
        },
        data: { isPrincipale: false }
      });
    }

    // Usa transaction per aggiornare sede, orari e chiusure
    const sede = await prisma.$transaction(async (tx) => {
      // Aggiorna la sede
      await tx.sedePoliambulatorio.update({
        where: { id },
        data: {
          ...(direttoreSanitarioId !== undefined && { direttoreSanitarioId }),
          ...(nome && { nome }),
          ...(codice !== undefined && { codice }),
          ...(indirizzo && { indirizzo }),
          ...(citta && { citta }),
          ...(cap && { cap }),
          ...(provincia && { provincia }),
          ...(telefono !== undefined && { telefono }),
          ...(email !== undefined && { email }),
          ...(latitudine !== undefined && { latitudine: latitudine ? parseFloat(latitudine) : null }),
          ...(longitudine !== undefined && { longitudine: longitudine ? parseFloat(longitudine) : null }),
          ...(isPrincipale !== undefined && { isPrincipale }),
          ...(isAttiva !== undefined && { isAttiva }),
          ...(oraAperturaOverride !== undefined && { oraAperturaOverride }),
          ...(oraChiusuraOverride !== undefined && { oraChiusuraOverride }),
          ...(noteAccessibilita !== undefined && { noteAccessibilita })
        }
      });

      // Aggiorna orari settimanali se forniti
      if (orariSettimanali !== undefined) {
        // Soft delete degli orari esistenti
        await tx.orarioSede.updateMany({
          where: { sedeId: id, deletedAt: null },
          data: { deletedAt: new Date() }
        });

        // Crea nuovi orari
        if (Array.isArray(orariSettimanali) && orariSettimanali.length > 0) {
          await tx.orarioSede.createMany({
            data: orariSettimanali.map(o => ({
              sedeId: id,
              giornoSettimana: o.giornoSettimana,
              fascia: o.fascia || 1,
              oraInizio: o.oraInizio,
              oraFine: o.oraFine,
              isChiuso: o.isChiuso || false,
              note: o.note,
              tenantId
            }))
          });
        }
      }

      // Aggiorna chiusure speciali se fornite
      if (chiusureSpeciali !== undefined) {
        // Soft delete delle chiusure esistenti
        await tx.chiusuraSpecialeSede.updateMany({
          where: { sedeId: id, deletedAt: null },
          data: { deletedAt: new Date() }
        });

        // Crea nuove chiusure
        if (Array.isArray(chiusureSpeciali) && chiusureSpeciali.length > 0) {
          await tx.chiusuraSpecialeSede.createMany({
            data: chiusureSpeciali.map(c => ({
              sedeId: id,
              tipo: c.tipo,
              nome: c.nome,
              descrizione: c.descrizione,
              dataInizio: new Date(c.dataInizio),
              dataFine: new Date(c.dataFine),
              oraInizio: c.oraInizio,
              oraFine: c.oraFine,
              isParziale: c.isParziale || false,
              ricorrente: c.ricorrente || false,
              annoRiferimento: c.annoRiferimento,
              attivo: c.attivo !== false,
              tenantId
            }))
          });
        }
      }

      // Ritorna sede aggiornata con relazioni
      return tx.sedePoliambulatorio.findFirst({
        where: { id },
        include: {
          poliambulatorio: true,
          direttoreSanitario: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          ambulatori: true,
          orariSettimanali: { where: { deletedAt: null }, orderBy: [{ giornoSettimana: 'asc' }, { fascia: 'asc' }] },
          chiusureSpeciali: { where: { deletedAt: null }, orderBy: { dataInizio: 'asc' } }
        }
      });
    });

    logger.info({ sedeId: id, tenantId }, 'Sede poliambulatorio aggiornata');
    return sede;
  }

  /**
   * Elimina una sede (soft delete)
   * @param {string} id - ID della sede
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Sede eliminata
   */
  async delete(id, tenantId) {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Sede non trovata');
    }

    // Verifica che non ci siano ambulatori attivi
    const ambulatoriAttivi = existing.ambulatori?.filter(a => !a.deletedAt).length || 0;
    if (ambulatoriAttivi > 0) {
      throw new Error(`Impossibile eliminare: la sede ha ${ambulatoriAttivi} ambulatori attivi`);
    }

    const sede = await prisma.sedePoliambulatorio.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    logger.info({ sedeId: id, tenantId }, 'Sede poliambulatorio eliminata');
    return sede;
  }

  /**
   * Ottiene le statistiche delle sedi per un poliambulatorio
   * @param {string} poliambulatorioId - ID del poliambulatorio
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Statistiche
   */
  async getStats(poliambulatorioId, tenantId) {
    const sedi = await prisma.sedePoliambulatorio.findMany({
      where: { poliambulatorioId, tenantId, deletedAt: null },
      include: {
        _count: { select: { ambulatori: true } },
        ambulatori: {
          where: { deletedAt: null },
          select: { stato: true }
        }
      }
    });

    return {
      totale: sedi.length,
      attive: sedi.filter(s => s.isAttiva).length,
      inattive: sedi.filter(s => !s.isAttiva).length,
      totaleAmbulatori: sedi.reduce((acc, s) => acc + s._count.ambulatori, 0),
      ambulatoriPerStato: sedi.reduce((acc, s) => {
        s.ambulatori.forEach(a => {
          acc[a.stato] = (acc[a.stato] || 0) + 1;
        });
        return acc;
      }, {})
    };
  }

  /**
   * Imposta una sede come principale
   * @param {string} id - ID della sede
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Sede aggiornata
   */
  async setPrincipale(id, tenantId) {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Sede non trovata');
    }

    // Rimuovi il flag dalle altre sedi
    await prisma.sedePoliambulatorio.updateMany({
      where: {
        poliambulatorioId: existing.poliambulatorioId,
        tenantId,
        deletedAt: null
      },
      data: { isPrincipale: false }
    });

    // Imposta questa come principale
    return prisma.sedePoliambulatorio.update({
      where: { id },
      data: { isPrincipale: true },
      include: {
        poliambulatorio: true,
        direttoreSanitario: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });
  }
}

export default new SedePoliambulatorioService();
