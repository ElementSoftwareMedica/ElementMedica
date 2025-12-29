/**
 * ManutenzioneStrumento Service
 * Gestione manutenzioni degli strumenti medici con scheduling e tracking
 * 
 * @module ManutenzioneStrumentoService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

class ManutenzioneStrumentoService {
  /**
   * Crea una nuova manutenzione
   * @param {Object} data - Dati della manutenzione
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Manutenzione creata
   */
  async create(data, tenantId) {
    const {
      strumentoId,
      tipo = 'PROGRAMMATA',
      descrizione,
      dataProgrammata,
      durataOre,
      esecutore,
      contattoEsecutore,
      costoManodopera,
      costoRicambi,
      prossimaScadenza,
      createdBy
    } = data;

    // Verifica che lo strumento esista e appartenga al tenant
    const strumento = await prisma.strumento.findFirst({
      where: { id: strumentoId, tenantId, deletedAt: null }
    });

    if (!strumento) {
      throw new Error('Strumento non trovato');
    }

    const costoTotale = (parseFloat(costoManodopera) || 0) + (parseFloat(costoRicambi) || 0);

    const manutenzione = await prisma.manutenzioneStrumento.create({
      data: {
        strumentoId,
        tipo,
        descrizione,
        dataProgrammata: dataProgrammata ? new Date(dataProgrammata) : null,
        durataOre: durataOre ? parseFloat(durataOre) : null,
        esecutore,
        contattoEsecutore,
        costoManodopera: costoManodopera ? parseFloat(costoManodopera) : null,
        costoRicambi: costoRicambi ? parseFloat(costoRicambi) : null,
        costoTotale: costoTotale > 0 ? costoTotale : null,
        stato: 'PROGRAMMATA',
        prossimaScadenza: prossimaScadenza ? new Date(prossimaScadenza) : null,
        tenantId,
        createdBy
      },
      include: {
        strumento: { select: { id: true, nome: true, codice: true, modello: true } }
      }
    });

    logger.info({ manutenzioneId: manutenzione.id, strumentoId, tenantId }, 'Manutenzione strumento creata');
    return manutenzione;
  }

  /**
   * Ottiene tutte le manutenzioni di un tenant
   * @param {string} tenantId - ID del tenant
   * @param {Object} options - Opzioni di filtro
   * @returns {Promise<Object>} Lista manutenzioni con paginazione
   */
  async findAll(tenantId, options = {}) {
    const {
      strumentoId,
      tipo,
      stato,
      dataFrom,
      dataTo,
      search,
      page = 1,
      limit = 50
    } = options;

    const where = {
      tenantId,
      deletedAt: null,
      ...(strumentoId && { strumentoId }),
      ...(tipo && { tipo }),
      ...(stato && { stato })
    };

    if (dataFrom || dataTo) {
      where.dataProgrammata = {};
      if (dataFrom) where.dataProgrammata.gte = new Date(dataFrom);
      if (dataTo) where.dataProgrammata.lte = new Date(dataTo);
    }

    if (search) {
      where.OR = [
        { descrizione: { contains: search, mode: 'insensitive' } },
        { esecutore: { contains: search, mode: 'insensitive' } },
        { strumento: { nome: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [manutenzioni, total] = await Promise.all([
      prisma.manutenzioneStrumento.findMany({
        where,
        include: {
          strumento: {
            select: { id: true, nome: true, codice: true, modello: true, marca: true }
          }
        },
        orderBy: [{ dataProgrammata: 'asc' }],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.manutenzioneStrumento.count({ where })
    ]);

    return { data: manutenzioni, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Ottiene una manutenzione per ID
   * @param {string} id - ID della manutenzione
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object|null>} Manutenzione trovata
   */
  async findById(id, tenantId) {
    return prisma.manutenzioneStrumento.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        strumento: {
          select: {
            id: true, nome: true, codice: true, modello: true, marca: true,
            numeroSerie: true, stato: true, ambulatorioId: true
          }
        }
      }
    });
  }

  /**
   * Aggiorna una manutenzione
   * @param {string} id - ID della manutenzione
   * @param {Object} data - Dati da aggiornare
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Manutenzione aggiornata
   */
  async update(id, data, tenantId) {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Manutenzione non trovata');
    }

    const {
      tipo,
      descrizione,
      dataProgrammata,
      dataEsecuzione,
      durataOre,
      esecutore,
      contattoEsecutore,
      costoManodopera,
      costoRicambi,
      numeroFattura,
      stato,
      esitoNote,
      prossimaScadenza,
      rapportoUrl
    } = data;

    // Ricalcola costo totale se necessario
    const newCostoManodopera = costoManodopera !== undefined ? parseFloat(costoManodopera) : parseFloat(existing.costoManodopera || 0);
    const newCostoRicambi = costoRicambi !== undefined ? parseFloat(costoRicambi) : parseFloat(existing.costoRicambi || 0);
    const costoTotale = newCostoManodopera + newCostoRicambi;

    const manutenzione = await prisma.manutenzioneStrumento.update({
      where: { id },
      data: {
        ...(tipo && { tipo }),
        ...(descrizione !== undefined && { descrizione }),
        ...(dataProgrammata !== undefined && { dataProgrammata: dataProgrammata ? new Date(dataProgrammata) : null }),
        ...(dataEsecuzione !== undefined && { dataEsecuzione: dataEsecuzione ? new Date(dataEsecuzione) : null }),
        ...(durataOre !== undefined && { durataOre: durataOre ? parseFloat(durataOre) : null }),
        ...(esecutore !== undefined && { esecutore }),
        ...(contattoEsecutore !== undefined && { contattoEsecutore }),
        ...(costoManodopera !== undefined && { costoManodopera: newCostoManodopera || null }),
        ...(costoRicambi !== undefined && { costoRicambi: newCostoRicambi || null }),
        costoTotale: costoTotale > 0 ? costoTotale : null,
        ...(numeroFattura !== undefined && { numeroFattura }),
        ...(stato && { stato }),
        ...(esitoNote !== undefined && { esitoNote }),
        ...(prossimaScadenza !== undefined && { prossimaScadenza: prossimaScadenza ? new Date(prossimaScadenza) : null }),
        ...(rapportoUrl !== undefined && { rapportoUrl })
      },
      include: {
        strumento: { select: { id: true, nome: true, codice: true, modello: true } }
      }
    });

    // Se completata, aggiorna la prossima manutenzione sullo strumento
    if (stato === 'COMPLETATA' && prossimaScadenza) {
      await prisma.strumento.update({
        where: { id: existing.strumentoId },
        data: { prossimaManutenzione: new Date(prossimaScadenza) }
      });
    }

    logger.info({ manutenzioneId: id, tenantId }, 'Manutenzione strumento aggiornata');
    return manutenzione;
  }

  /**
   * Elimina una manutenzione (soft delete)
   * @param {string} id - ID della manutenzione
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Manutenzione eliminata
   */
  async delete(id, tenantId) {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Manutenzione non trovata');
    }

    const manutenzione = await prisma.manutenzioneStrumento.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    logger.info({ manutenzioneId: id, tenantId }, 'Manutenzione strumento eliminata');
    return manutenzione;
  }

  /**
   * Completa una manutenzione
   * @param {string} id - ID della manutenzione
   * @param {Object} data - Dati completamento
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Manutenzione completata
   */
  async completaManutenzione(id, data, tenantId) {
    const { esitoNote, prossimaScadenza, rapportoUrl } = data;

    return this.update(id, {
      stato: 'COMPLETATA',
      dataEsecuzione: new Date(),
      esitoNote,
      prossimaScadenza,
      rapportoUrl
    }, tenantId);
  }

  /**
   * Annulla una manutenzione
   * @param {string} id - ID della manutenzione
   * @param {string} motivo - Motivo annullamento
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Manutenzione annullata
   */
  async annullaManutenzione(id, motivo, tenantId) {
    return this.update(id, {
      stato: 'ANNULLATA',
      esitoNote: `Annullata: ${motivo}`
    }, tenantId);
  }

  /**
   * Ottiene le manutenzioni in scadenza
   * @param {string} tenantId - ID del tenant
   * @param {number} giorniAnticipo - Giorni di anticipo per avviso
   * @returns {Promise<Array>} Manutenzioni in scadenza
   */
  async getManutenzioniInScadenza(tenantId, giorniAnticipo = 30) {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + giorniAnticipo);

    return prisma.manutenzioneStrumento.findMany({
      where: {
        tenantId,
        deletedAt: null,
        stato: 'PROGRAMMATA',
        dataProgrammata: { lte: dataLimite }
      },
      include: {
        strumento: { select: { id: true, nome: true, codice: true, modello: true, marca: true } }
      },
      orderBy: { dataProgrammata: 'asc' }
    });
  }

  /**
   * Ottiene le statistiche manutenzioni
   * @param {string} tenantId - ID del tenant
   * @param {Object} options - Opzioni filtro
   * @returns {Promise<Object>} Statistiche
   */
  async getStats(tenantId, options = {}) {
    const { strumentoId, anno } = options;

    const where = {
      tenantId,
      deletedAt: null,
      ...(strumentoId && { strumentoId })
    };

    if (anno) {
      where.dataProgrammata = {
        gte: new Date(`${anno}-01-01`),
        lte: new Date(`${anno}-12-31`)
      };
    }

    const [totali, perStato, perTipo, costiTotali] = await Promise.all([
      prisma.manutenzioneStrumento.count({ where }),
      prisma.manutenzioneStrumento.groupBy({
        by: ['stato'],
        where,
        _count: true
      }),
      prisma.manutenzioneStrumento.groupBy({
        by: ['tipo'],
        where,
        _count: true
      }),
      prisma.manutenzioneStrumento.aggregate({
        where: { ...where, stato: 'COMPLETATA' },
        _sum: { costoTotale: true, costoManodopera: true, costoRicambi: true }
      })
    ]);

    return {
      totale: totali,
      perStato: perStato.reduce((acc, s) => ({ ...acc, [s.stato]: s._count }), {}),
      perTipo: perTipo.reduce((acc, t) => ({ ...acc, [t.tipo]: t._count }), {}),
      costi: {
        totale: parseFloat(costiTotali._sum.costoTotale || 0),
        manodopera: parseFloat(costiTotali._sum.costoManodopera || 0),
        ricambi: parseFloat(costiTotali._sum.costoRicambi || 0)
      }
    };
  }

  /**
   * Crea manutenzione ricorrente
   * @param {string} strumentoId - ID strumento
   * @param {Object} data - Configurazione ricorrenza
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Array>} Manutenzioni create
   */
  async creaManutenzioneRicorrente(strumentoId, data, tenantId) {
    const {
      descrizione,
      intervallo, // giorni
      dataInizio,
      numeroOccorrenze = 12,
      esecutore,
      createdBy
    } = data;

    const manutenzioni = [];
    let dataCorrente = new Date(dataInizio);

    for (let i = 0; i < numeroOccorrenze; i++) {
      const manutenzione = await this.create({
        strumentoId,
        tipo: 'PROGRAMMATA',
        descrizione: `${descrizione} #${i + 1}`,
        dataProgrammata: dataCorrente,
        esecutore,
        createdBy
      }, tenantId);

      manutenzioni.push(manutenzione);
      dataCorrente = new Date(dataCorrente);
      dataCorrente.setDate(dataCorrente.getDate() + intervallo);
    }

    logger.info({ strumentoId, occorrenze: numeroOccorrenze, tenantId }, 'Manutenzioni ricorrenti create');
    return manutenzioni;
  }
}

export default new ManutenzioneStrumentoService();
