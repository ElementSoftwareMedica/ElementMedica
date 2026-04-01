/**
 * Service - Codici Sconto
 * 
 * Business logic per gestione codici sconto:
 * - Validazione applicabilità
 * - Calcolo sconti
 * - Gestione utilizzi
 * - Verifica limiti e regole
 * 
 * @module services/codici-sconto-service
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

/**
 * Valida applicabilità codice sconto
 * 
 * @param {string} codiceTesto - Codice da validare
 * @param {string} tenantId - ID tenant
 * @param {Object} context - Contesto validazione
 * @param {number} context.prezzoBase - Prezzo base preventivo
 * @param {string} context.tipoServizio - Tipo servizio
 * @param {string} context.clienteId - ID cliente (azienda o persona)
 * @param {string} context.clienteType - Tipo cliente ('azienda'|'persona')
 * @param {string} [context.corsoId] - ID corso (opzionale)
 * @returns {Promise<Object>} Risultato validazione con dettagli
 */
export async function validateCodeApplicability(codiceTesto, tenantId, context) {
  try {
    const { prezzoBase, tipoServizio, clienteId, clienteType, corsoId } = context;

    // Trova codice
    const codice = await prisma.codiceSconto.findFirst({
      where: {
        codice: codiceTesto.toUpperCase(),
        tenantId,
        deletedAt: null
      },
      include: {
        aziende: true,
        persone: true,
        corsi: true
      }
    });

    if (!codice) {
      return {
        valid: false,
        error: 'Codice sconto non trovato',
        errors: ['Codice sconto non trovato']
      };
    }

    // Valida tutte le regole
    const validationErrors = [];

    // 1. Stato attivo
    if (!codice.attivo) {
      validationErrors.push('Codice sconto non attivo');
    }

    // 2. Periodo validità
    const now = new Date();
    if (now < codice.dataInizio) {
      validationErrors.push(`Codice valido dal ${codice.dataInizio.toLocaleDateString('it-IT')}`);
    }
    if (now > codice.dataFine) {
      validationErrors.push('Codice scaduto');
    }

    // 3. Utilizzo massimo globale
    if (codice.utilizzoMassimo && codice.utilizzoCorrente >= codice.utilizzoMassimo) {
      validationErrors.push('Codice esaurito (raggiunto limite utilizzi)');
    }

    // 4. Utilizzo per utente
    if (codice.utilizzoPerUtente) {
      const utilizziUtente = await prisma.preventivoSconto.count({
        where: {
          codiceId: codice.id,
          preventivo: {
            OR: [
              { companyTenantProfileId: clienteType === 'azienda' ? clienteId : undefined },
              { personaId: clienteType === 'persona' ? clienteId : undefined }
            ],
            deletedAt: null
          },
          deletedAt: null
        }
      });

      if (utilizziUtente >= codice.utilizzoPerUtente) {
        validationErrors.push(`Cliente ha già utilizzato questo codice ${utilizziUtente} volte (limite: ${codice.utilizzoPerUtente})`);
      }
    }

    // 5. Importi min/max
    if (codice.minImporto && prezzoBase < codice.minImporto) {
      validationErrors.push(`Importo minimo richiesto: €${Number(codice.minImporto).toFixed(2)}`);
    }
    if (codice.maxImporto && prezzoBase > codice.maxImporto) {
      validationErrors.push(`Importo massimo consentito: €${Number(codice.maxImporto).toFixed(2)}`);
    }

    // 6. Servizi applicabili
    if (codice.applicabileServizi.length > 0 && !codice.applicabileServizi.includes(tipoServizio)) {
      validationErrors.push(`Codice non applicabile al servizio ${tipoServizio}`);
    }

    // 7. Tipo cliente
    switch (codice.applicabileA) {
      case 'AZIENDE':
        if (clienteType !== 'azienda') {
          validationErrors.push('Codice valido solo per aziende');
        }
        break;
      case 'PERSONE':
        if (clienteType !== 'persona') {
          validationErrors.push('Codice valido solo per persone fisiche');
        }
        break;
      case 'SPECIFICI':
        const isClienteSpecifico = clienteType === 'azienda'
          ? codice.aziende.some(a => a.companyTenantProfileId === clienteId)
          : codice.persone.some(p => p.personaId === clienteId);

        if (!isClienteSpecifico) {
          validationErrors.push('Codice non valido per questo cliente');
        }
        break;
    }

    // 8. Corso specifico
    if (corsoId && codice.tipoCorso === 'SPECIFICI') {
      const isCorsoSpecifico = codice.corsi.some(c => c.corsoId === corsoId);
      if (!isCorsoSpecifico) {
        validationErrors.push('Codice non valido per questo corso');
      }
    }

    const isValid = validationErrors.length === 0;

    return {
      valid: isValid,
      codice,
      errors: isValid ? null : validationErrors
    };

  } catch (error) {
    logger.error('Error validating code applicability', {
      component: 'codici-sconto-service',
      function: 'validateCodeApplicability',
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Calcola importo sconto
 * 
 * @param {Object} codice - Codice sconto
 * @param {number} prezzoBase - Prezzo base
 * @returns {number} Importo sconto
 */
export function calculateDiscount(codice, prezzoBase) {
  if (codice.tipoSconto === 'PERCENTUALE') {
    return (prezzoBase * Number(codice.valore)) / 100;
  } else {
    return Math.min(Number(codice.valore), prezzoBase); // Non può scontare più del prezzo
  }
}

/**
 * Trova codici applicabili per un dato contesto
 * 
 * @param {string} tenantId - ID tenant
 * @param {Object} context - Contesto ricerca
 * @param {string} context.clienteId - ID cliente
 * @param {string} context.clienteType - Tipo cliente
 * @param {string} context.tipoServizio - Tipo servizio
 * @param {string} [context.corsoId] - ID corso (opzionale)
 * @param {number} [context.prezzoBase] - Prezzo base per filtrare per importo
 * @returns {Promise<Array>} Codici applicabili
 */
export async function getApplicableCodes(tenantId, context) {
  try {
    const { clienteId, clienteType, tipoServizio, corsoId, prezzoBase } = context;
    const now = new Date();

    // Query base
    const where = {
      tenantId,
      deletedAt: null,
      attivo: true,
      dataInizio: { lte: now },
      dataFine: { gte: now }
    };

    // Prima query: get tutti i codici validi
    let codici = await prisma.codiceSconto.findMany({
      where,
      include: {
        aziende: { include: { companyTenantProfile: { include: { company: true } } } },
        persone: { include: { persona: true } },
        corsi: { include: { corso: true } }
      }
    });

    // Filtra per utilizzo massimo (non possiamo fare lt: raw in Prisma)
    codici = codici.filter(c =>
      c.utilizzoMassimo === null || c.utilizzoCorrente < c.utilizzoMassimo
    );

    // Filtra per tipo cliente (in memoria)
    if (clienteType === 'azienda') {
      codici = codici.filter(c => ['TUTTI', 'AZIENDE', 'SPECIFICI'].includes(c.applicabileA));
    } else {
      codici = codici.filter(c => ['TUTTI', 'PERSONE', 'SPECIFICI'].includes(c.applicabileA));
    }

    // Sort: prima i più vantaggiosi, poi quelli che scadono prima
    codici.sort((a, b) => {
      if (a.valore !== b.valore) return Number(b.valore) - Number(a.valore);
      return new Date(a.dataFine) - new Date(b.dataFine);
    });

    // Filtra ulteriormente in memoria per regole complesse
    codici = codici.filter(codice => {
      // Check applicabilità servizio
      if (codice.applicabileServizi.length > 0 && !codice.applicabileServizi.includes(tipoServizio)) {
        return false;
      }

      // Check cliente specifico
      if (codice.applicabileA === 'SPECIFICI') {
        const isMatch = clienteType === 'azienda'
          ? codice.aziende.some(a => a.companyTenantProfileId === clienteId)
          : codice.persone.some(p => p.personaId === clienteId);
        if (!isMatch) return false;
      }

      // Check corso specifico
      if (corsoId && codice.tipoCorso === 'SPECIFICI') {
        if (!codice.corsi.some(c => c.corsoId === corsoId)) {
          return false;
        }
      }

      // Check importi min/max
      if (prezzoBase !== undefined) {
        if (codice.minImporto && prezzoBase < Number(codice.minImporto)) {
          return false;
        }
        if (codice.maxImporto && prezzoBase > Number(codice.maxImporto)) {
          return false;
        }
      }

      return true;
    });

    // Per ogni codice, verifica utilizzo per utente
    const codiciConLimiti = await Promise.all(
      codici.map(async (codice) => {
        if (codice.utilizzoPerUtente) {
          const utilizziUtente = await prisma.preventivoSconto.count({
            where: {
              codiceId: codice.id,
              preventivo: {
                OR: [
                  { companyTenantProfileId: clienteType === 'azienda' ? clienteId : undefined },
                  { personaId: clienteType === 'persona' ? clienteId : undefined }
                ],
                deletedAt: null
              },
              deletedAt: null
            }
          });

          if (utilizziUtente >= codice.utilizzoPerUtente) {
            return null; // Utente ha già usato il codice troppe volte
          }
        }

        return codice;
      })
    );

    return codiciConLimiti.filter(c => c !== null);

  } catch (error) {
    logger.error('Error getting applicable codes', {
      component: 'codici-sconto-service',
      function: 'getApplicableCodes',
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Crea snapshot di un codice sconto per PreventivoSconto
 * 
 * @param {Object} codice - Codice sconto completo
 * @returns {Object} Dati snapshot
 */
export function createCodeSnapshot(codice) {
  return {
    codiceId: codice.id,
    codiceTesto: codice.codice,
    nomeCodice: codice.nome,
    descrizioneCodice: codice.descrizione,
    tipoSconto: codice.tipoSconto,
    valoreScontoCodice: Number(codice.valore)
  };
}

/**
 * Verifica se codici possono essere cumulati
 * 
 * @param {Array<Object>} codici - Array di codici da verificare
 * @returns {boolean} True se tutti i codici sono cumulabili
 */
export function canStackCodes(codici) {
  return codici.every(c => c.cumulabile === true);
}

export default {
  validateCodeApplicability,
  calculateDiscount,
  getApplicableCodes,
  createCodeSnapshot,
  canStackCodes
};
