/**
 * Service - Preventivi
 * 
 * Business logic per gestione preventivi:
 * - Calcolo totali (prezzoTotale, imponibile, IVA, importoFinale)
 * - Applicazione e rimozione sconti
 * - Validazione transizioni di stato
 * - Generazione numeri preventivo
 * 
 * @module services/preventivi-service
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Aliquote IVA standard per tipo servizio
 */
const IVA_RATES_BY_SERVICE = {
  CORSO: 22.00,                // Formazione - IVA ordinaria
  DVR: 22.00,                  // Consulenza - IVA ordinaria
  RSPP: 22.00,                 // Consulenza - IVA ordinaria
  MEDICO_COMPETENTE: 10.00,    // Prestazioni sanitarie - IVA ridotta
  PRIVACY: 22.00,              // Consulenza - IVA ordinaria
  ALTRO: 22.00                 // Default - IVA ordinaria
};

/**
 * Transizioni di stato valide per i preventivi
 */
const STATO_TRANSITIONS = {
  BOZZA: ['INVIATO', 'ARCHIVIATO'],
  INVIATO: ['VISUALIZZATO', 'ACCETTATO', 'RIFIUTATO', 'ARCHIVIATO'],
  VISUALIZZATO: ['ACCETTATO', 'RIFIUTATO', 'ARCHIVIATO'],
  ACCETTATO: ['FATTURATO', 'ANNULLATO'],
  RIFIUTATO: ['ARCHIVIATO'],
  FATTURATO: [],
  ANNULLATO: [],
  ARCHIVIATO: []
};

/**
 * Calcola totali di un preventivo con IVA
 * 
 * Formula:
 * 1. prezzoTotale = somma prezzi servizi/corsi
 * 2. scontoTotale = somma sconti applicati
 * 3. imponibile = prezzoTotale - scontoTotale
 * 4. importoIva = imponibile × (aliquotaIva / 100)
 * 5. importoFinale = imponibile + importoIva
 * 
 * @param {Object} data - Dati preventivo
 * @param {number} data.prezzoTotale - Prezzo totale base
 * @param {Array<number>} [data.sconti] - Array importi sconti
 * @param {number} [data.scontoTotale] - Sconto totale (se già calcolato)
 * @param {number} [data.aliquotaIva] - Aliquota IVA personalizzata
 * @param {string} [data.tipoServizio] - Tipo servizio (per auto-detect IVA)
 * @returns {Object} Totali calcolati
 */
export function calculatePreventivoTotals(data) {
  try {
    const prezzoTotale = Number(data.prezzoTotale);
    
    // Calcola sconto totale
    let scontoTotale = 0;
    if (data.sconti && Array.isArray(data.sconti)) {
      scontoTotale = data.sconti.reduce((sum, sconto) => sum + Number(sconto), 0);
    } else if (data.scontoTotale !== undefined) {
      scontoTotale = Number(data.scontoTotale);
    }
    
    // Calcola imponibile (base imponibile dopo sconti, prima IVA)
    const imponibile = Math.max(0, prezzoTotale - scontoTotale);
    
    // Determina aliquota IVA
    let aliquotaIva = 22.00; // Default
    if (data.aliquotaIva !== undefined) {
      aliquotaIva = Number(data.aliquotaIva);
    } else if (data.tipoServizio && IVA_RATES_BY_SERVICE[data.tipoServizio]) {
      aliquotaIva = IVA_RATES_BY_SERVICE[data.tipoServizio];
    }
    
    // Calcola IVA
    const importoIva = calculateIva(imponibile, aliquotaIva);
    
    // Calcola importo finale (con IVA)
    const importoFinale = imponibile + importoIva;
    
    return {
      prezzoTotale: Number(prezzoTotale.toFixed(2)),
      scontoTotale: Number(scontoTotale.toFixed(2)),
      imponibile: Number(imponibile.toFixed(2)),
      aliquotaIva: Number(aliquotaIva.toFixed(2)),
      importoIva: Number(importoIva.toFixed(2)),
      importoFinale: Number(importoFinale.toFixed(2)),
      risparmioPercentuale: prezzoTotale > 0 
        ? Number(((scontoTotale / prezzoTotale) * 100).toFixed(2))
        : 0
    };
    
  } catch (error) {
    logger.error('Error calculating preventivo totals', {
      component: 'preventivi-service',
      function: 'calculatePreventivoTotals',
      error: error.message,
      data
    });
    throw error;
  }
}

/**
 * Calcola importo IVA
 * 
 * @param {number} imponibile - Base imponibile
 * @param {number} aliquota - Aliquota IVA (es: 22 per 22%)
 * @returns {number} Importo IVA
 */
export function calculateIva(imponibile, aliquota) {
  return (Number(imponibile) * Number(aliquota)) / 100;
}

/**
 * Determina aliquota IVA in base al tipo servizio
 * 
 * @param {string} tipoServizio - Tipo servizio
 * @returns {number} Aliquota IVA
 */
export function determineIvaRate(tipoServizio) {
  return IVA_RATES_BY_SERVICE[tipoServizio] || 22.00;
}

/**
 * Applica codice sconto a preventivo
 * 
 * Crea record PreventivoSconto con snapshot del codice,
 * incrementa utilizzo codice, ricalcola totali preventivo.
 * 
 * @param {string} preventivoId - ID preventivo
 * @param {string} codiceId - ID codice sconto
 * @param {Object} options - Opzioni
 * @param {Object} options.transaction - Prisma transaction client
 * @param {string} options.userId - ID utente che applica
 * @returns {Promise<Object>} Preventivo aggiornato con sconto applicato
 */
export async function applyDiscount(preventivoId, codiceId, options = {}) {
  const client = options.transaction || prisma;
  
  try {
    // Recupera preventivo corrente
    const preventivo = await client.preventivo.findUnique({
      where: { id: preventivoId },
      include: {
        sconti: {
          where: { deletedAt: null },
          include: { codice: true }
        }
      }
    });
    
    if (!preventivo) {
      throw new Error('Preventivo non trovato');
    }
    
    // Recupera codice sconto
    const codice = await client.codiceSconto.findUnique({
      where: { id: codiceId }
    });
    
    if (!codice) {
      throw new Error('Codice sconto non trovato');
    }
    
    // Verifica che codice non sia già applicato
    const alreadyApplied = preventivo.sconti.some(s => s.codiceId === codiceId);
    if (alreadyApplied) {
      throw new Error('Codice sconto già applicato a questo preventivo');
    }
    
    // Verifica cumulabilità se ci sono già altri sconti
    if (preventivo.sconti.length > 0 && !codice.cumulabile) {
      throw new Error('Codice non cumulabile: rimuovere gli altri sconti prima');
    }
    
    const existingNonCumulable = preventivo.sconti.find(s => !s.codice.cumulabile);
    if (existingNonCumulable) {
      throw new Error('Preventivo ha già uno sconto non cumulabile applicato');
    }
    
    // Calcola importo sconto
    const prezzoBase = Number(preventivo.prezzoTotale);
    let importoSconto = 0;
    
    if (codice.tipoSconto === 'PERCENTUALE') {
      importoSconto = (prezzoBase * Number(codice.valore)) / 100;
    } else {
      importoSconto = Math.min(Number(codice.valore), prezzoBase);
    }
    
    // Crea snapshot dello sconto
    const now = new Date();
    const preventivoSconto = await client.preventivoSconto.create({
      data: {
        preventivoId,
        codiceId,
        codiceTesto: codice.codice,
        nomeCodice: codice.nome,
        descrizioneCodice: codice.descrizione,
        tipoSconto: codice.tipoSconto,
        valoreScontoCodice: Number(codice.valore),
        importoScontato: importoSconto,
        applicatoIl: now,
        applicatoDa: options.userId || null,
        tenantId: preventivo.tenantId
      }
    });
    
    // Incrementa contatore utilizzo codice
    await client.codiceSconto.update({
      where: { id: codiceId },
      data: { utilizzoCorrente: { increment: 1 } }
    });
    
    // Ricalcola totali preventivo
    const nuovoScontoTotale = Number(preventivo.scontoTotale) + importoSconto;
    const totali = calculatePreventivoTotals({
      prezzoTotale: prezzoBase,
      scontoTotale: nuovoScontoTotale,
      aliquotaIva: Number(preventivo.aliquotaIva)
    });
    
    // Aggiorna preventivo
    const preventivoAggiornato = await client.preventivo.update({
      where: { id: preventivoId },
      data: {
        scontoTotale: totali.scontoTotale,
        imponibile: totali.imponibile,
        importoIva: totali.importoIva,
        importoFinale: totali.importoFinale,
        updatedAt: now
      },
      include: {
        sconti: {
          where: { deletedAt: null },
          orderBy: { applicatoIl: 'asc' }
        }
      }
    });
    
    logger.info('Discount applied to preventivo', {
      component: 'preventivi-service',
      function: 'applyDiscount',
      preventivoId,
      codiceId,
      codice: codice.codice,
      importoSconto,
      nuovoScontoTotale: totali.scontoTotale,
      nuovoImportoFinale: totali.importoFinale
    });
    
    return {
      preventivo: preventivoAggiornato,
      sconto: preventivoSconto,
      totali
    };
    
  } catch (error) {
    logger.error('Error applying discount', {
      component: 'preventivi-service',
      function: 'applyDiscount',
      preventivoId,
      codiceId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Rimuove sconto da preventivo
 * 
 * Soft delete PreventivoSconto, decrementa utilizzo codice,
 * ricalcola totali preventivo.
 * 
 * @param {string} preventivoId - ID preventivo
 * @param {string} scontoId - ID PreventivoSconto da rimuovere
 * @param {Object} options - Opzioni
 * @param {Object} options.transaction - Prisma transaction client
 * @param {string} options.userId - ID utente che rimuove
 * @returns {Promise<Object>} Preventivo aggiornato
 */
export async function removeDiscount(preventivoId, scontoId, options = {}) {
  const client = options.transaction || prisma;
  
  try {
    // Recupera preventivo e sconto
    const preventivo = await client.preventivo.findUnique({
      where: { id: preventivoId },
      include: {
        sconti: {
          where: { deletedAt: null }
        }
      }
    });
    
    if (!preventivo) {
      throw new Error('Preventivo non trovato');
    }
    
    const sconto = await client.preventivoSconto.findFirst({
      where: {
        id: scontoId,
        preventivoId,
        deletedAt: null
      }
    });
    
    if (!sconto) {
      throw new Error('Sconto non trovato o già rimosso');
    }
    
    // Soft delete sconto
    const now = new Date();
    await client.preventivoSconto.update({
      where: { id: scontoId },
      data: {
        deletedAt: now,
        deletedBy: options.userId || null
      }
    });
    
    // Decrementa contatore utilizzo codice
    const codice = await client.codiceSconto.findUnique({
      where: { id: sconto.codiceId },
      select: { utilizzoCorrente: true }
    });
    
    if (codice && codice.utilizzoCorrente > 0) {
      await client.codiceSconto.update({
        where: { id: sconto.codiceId },
        data: { utilizzoCorrente: { decrement: 1 } }
      });
    }
    
    // Ricalcola totali preventivo
    const nuovoScontoTotale = Number(preventivo.scontoTotale) - Number(sconto.importoScontato);
    const totali = calculatePreventivoTotals({
      prezzoTotale: Number(preventivo.prezzoTotale),
      scontoTotale: Math.max(0, nuovoScontoTotale),
      aliquotaIva: Number(preventivo.aliquotaIva)
    });
    
    // Aggiorna preventivo
    const preventivoAggiornato = await client.preventivo.update({
      where: { id: preventivoId },
      data: {
        scontoTotale: totali.scontoTotale,
        imponibile: totali.imponibile,
        importoIva: totali.importoIva,
        importoFinale: totali.importoFinale,
        updatedAt: now
      },
      include: {
        sconti: {
          where: { deletedAt: null },
          orderBy: { applicatoIl: 'asc' }
        }
      }
    });
    
    logger.info('Discount removed from preventivo', {
      component: 'preventivi-service',
      function: 'removeDiscount',
      preventivoId,
      scontoId,
      importoRimosso: sconto.importoScontato,
      nuovoScontoTotale: totali.scontoTotale,
      nuovoImportoFinale: totali.importoFinale
    });
    
    return {
      preventivo: preventivoAggiornato,
      totali
    };
    
  } catch (error) {
    logger.error('Error removing discount', {
      component: 'preventivi-service',
      function: 'removeDiscount',
      preventivoId,
      scontoId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Valida transizione di stato
 * 
 * @param {string} currentStato - Stato corrente
 * @param {string} newStato - Nuovo stato richiesto
 * @returns {Object} Risultato validazione
 */
export function validateStateTransition(currentStato, newStato) {
  const allowedTransitions = STATO_TRANSITIONS[currentStato] || [];
  const isValid = allowedTransitions.includes(newStato);
  
  return {
    valid: isValid,
    currentStato,
    newStato,
    allowedTransitions,
    error: !isValid 
      ? `Transizione non valida: ${currentStato} → ${newStato}. Stati consentiti: ${allowedTransitions.join(', ')}`
      : null
  };
}

/**
 * Genera numero preventivo univoco
 * 
 * Formato: PREV-{ANNO}-{SEQUENZA}
 * Esempio: PREV-2025-0001
 * 
 * @param {string} tenantId - ID tenant
 * @param {number} [anno] - Anno di riferimento (default: anno corrente)
 * @returns {Promise<string>} Numero preventivo generato
 */
export async function generateNumeroPreventivo(tenantId, anno = null) {
  try {
    const targetYear = anno || new Date().getFullYear();
    
    // Trova l'ultimo numero per questo tenant e anno
    const lastPreventivo = await prisma.preventivo.findFirst({
      where: {
        tenantId,
        numero: {
          startsWith: `PREV-${targetYear}-`
        }
      },
      orderBy: {
        numero: 'desc'
      },
      select: {
        numero: true
      }
    });
    
    let sequenza = 1;
    
    if (lastPreventivo) {
      // Estrai sequenza dall'ultimo numero
      const match = lastPreventivo.numero.match(/PREV-\d{4}-(\d+)/);
      if (match) {
        sequenza = parseInt(match[1], 10) + 1;
      }
    }
    
    // Formatta numero con padding
    const numeroPreventivo = `PREV-${targetYear}-${String(sequenza).padStart(4, '0')}`;
    
    logger.debug('Generated preventivo number', {
      component: 'preventivi-service',
      function: 'generateNumeroPreventivo',
      tenantId,
      anno: targetYear,
      sequenza,
      numero: numeroPreventivo
    });
    
    return numeroPreventivo;
    
  } catch (error) {
    logger.error('Error generating preventivo number', {
      component: 'preventivi-service',
      function: 'generateNumeroPreventivo',
      tenantId,
      anno,
      error: error.message
    });
    throw error;
  }
}

/**
 * Ottieni statistiche preventivo
 * 
 * @param {string} preventivoId - ID preventivo
 * @returns {Promise<Object>} Statistiche
 */
export async function getPreventivoStats(preventivoId) {
  try {
    const preventivo = await prisma.preventivo.findUnique({
      where: { id: preventivoId },
      include: {
        sconti: {
          where: { deletedAt: null }
        }
      }
    });
    
    if (!preventivo) {
      throw new Error('Preventivo non trovato');
    }
    
    const prezzoTotale = Number(preventivo.prezzoTotale);
    const scontoTotale = Number(preventivo.scontoTotale);
    const imponibile = Number(preventivo.imponibile);
    const importoIva = Number(preventivo.importoIva);
    const importoFinale = Number(preventivo.importoFinale);
    
    return {
      prezzoOriginale: prezzoTotale,
      scontoTotale,
      risparmioPercentuale: prezzoTotale > 0 ? ((scontoTotale / prezzoTotale) * 100).toFixed(2) : 0,
      numeroScontiApplicati: preventivo.sconti.length,
      imponibile,
      aliquotaIva: Number(preventivo.aliquotaIva),
      importoIva,
      importoFinale,
      ivaPercentuale: imponibile > 0 ? ((importoIva / imponibile) * 100).toFixed(2) : 0
    };
    
  } catch (error) {
    logger.error('Error getting preventivo stats', {
      component: 'preventivi-service',
      function: 'getPreventivoStats',
      preventivoId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Genera PDF di un preventivo
 * 
 * Utilizza il template "Preventivo" esistente e DocumentService
 * per generare PDF professionale con marker resolution.
 * 
 * @param {Object} params - Parametri generazione
 * @param {string} params.preventivoId - ID preventivo
 * @param {string} params.userId - ID utente che genera
 * @param {string} params.tenantId - ID tenant
 * @returns {Promise<Object>} - { buffer: Buffer, filename: string }
 */
async function generatePDF({ preventivoId, userId, tenantId }) {
  try {
    logger.info('Generating preventivo PDF', {
      component: 'preventivi-service',
      function: 'generatePDF',
      preventivoId,
      tenantId
    });

    // 1. Carica preventivo con relazioni
    const preventivo = await prisma.preventivo.findFirst({
      where: {
        id: preventivoId,
        tenantId,
        deletedAt: null
      },
      include: {
        schedule: {
          include: {
            course: true
          }
        },
        sconti: {
          include: {
            codice: true
          }
        }
      }
    });

    if (!preventivo) {
      throw new Error('Preventivo non trovato');
    }

    // 1b. Carica azienda se presente
    let azienda = null;
    if (preventivo.aziendaId) {
      azienda = await prisma.company.findUnique({
        where: { id: preventivo.aziendaId }
      });
    }

    // 1c. Carica persona se presente
    let persona = null;
    if (preventivo.personaId) {
      persona = await prisma.person.findUnique({
        where: { id: preventivo.personaId }
      });
    }

    // 1d. Carica corso se presente
    let corso = null;
    if (preventivo.corsoId) {
      corso = await prisma.course.findUnique({
        where: { id: preventivo.corsoId }
      });
    } else if (preventivo.schedule?.course) {
      corso = preventivo.schedule.course;
    }

    // Attach to preventivo object for _buildMarkerData
    preventivo.azienda = azienda;
    preventivo.persona = persona;
    preventivo.corso = corso;

    // 2. Trova template "Preventivo"
    const template = await prisma.templateLink.findFirst({
      where: {
        tenantId,
        type: 'PREVENTIVO',
        isActive: true
      },
      orderBy: {
        version: 'desc'
      }
    });

    if (!template) {
      throw new Error('Template "Preventivo" non trovato. Configurare template prima di generare PDF.');
    }

    // 3. Build marker data
    const markerData = _buildMarkerData(preventivo);

    // 4. Genera documento con DocumentService
    const getDocumentService = (await import('./documentService.js')).default;
    const documentService = getDocumentService();
    
    const result = await documentService.generateDocument({
      templateId: template.id,
      entityType: 'PREVENTIVO',
      entityId: preventivoId,
      personId: preventivo.personaId,
      userId,
      tenantId,
      options: {
        strict: false, // Permetti marker mancanti
        markers: markerData // Pass direttamente come markers, non customData
      }
    });

    // 5. Aggiorna stato preventivo se era in BOZZA
    if (preventivo.stato === 'BOZZA') {
      await prisma.preventivo.update({
        where: { id: preventivoId },
        data: {
          stato: 'INVIATO',
          dataInvio: new Date()
        }
      });

      logger.info('Preventivo stato updated to INVIATO', {
        preventivoId,
        previousStato: 'BOZZA'
      });
    }

    // 6. Generate custom filename with company name and date
    const pdfBuffer = result.file.buffer;
    
    let customFilename = result.fileName;
    if (azienda?.ragioneSociale) {
      const companyName = azienda.ragioneSociale
        .replace(/[^a-zA-Z0-9\s]/g, '_') // Replace special chars with underscore
        .replace(/\s+/g, '_') // Replace spaces with underscore
        .substring(0, 50); // Limit length
      
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      customFilename = `Preventivo_${companyName}_${date}.pdf`;
    }

    logger.info('PDF generated successfully', {
      preventivoId,
      filename: customFilename,
      originalFilename: result.fileName,
      fileSize: pdfBuffer.length,
      templateVersion: template.version
    });

    return {
      buffer: pdfBuffer,
      filename: customFilename,
      documentId: result.id,
      filepath: result.file.filepath,
      fileUrl: result.fileUrl
    };

  } catch (error) {
    logger.error('Error generating preventivo PDF', {
      component: 'preventivi-service',
      function: 'generatePDF',
      preventivoId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Build marker data per il template preventivo
 * 
 * Costruisce l'oggetto con tutti i marker richiesti:
 * - preventivo.* (23 markers)
 * - azienda.* (dati cliente)
 * - corso.* (dati corso se presente)
 * 
 * @private
 * @param {Object} preventivo - Preventivo con relazioni
 * @returns {Object} - Marker data per MarkerResolver
 */
function _buildMarkerData(preventivo) {
  // Parse dettagliServizio JSON
  const dettagli = typeof preventivo.dettagliServizio === 'string' 
    ? JSON.parse(preventivo.dettagliServizio) 
    : preventivo.dettagliServizio || {};

  const data = {
    preventivo: {
      id: preventivo.id,
      numeroProgressivo: preventivo.numeroProgressivo || '-',
      annoProgressivo: preventivo.annoProgressivo || new Date().getFullYear(),
      stato: preventivo.stato,
      dataCreazione: preventivo.dataEmissione,
      dataInvio: preventivo.dataInvio,
      dataAccettazione: preventivo.dataAccettazione,
      dataValidita: preventivo.dataScadenza || _addDays(preventivo.dataEmissione, 30),
      tipoServizio: preventivo.tipoServizio,
      prezzoTotale: preventivo.prezzoTotale,
      speseAccessorie: dettagli.speseAccessorie || 0,
      subtotale: Number(preventivo.prezzoTotale) + Number(dettagli.speseAccessorie || 0),
      scontoApplicato: preventivo.sconti && preventivo.sconti.length > 0,
      scontoCodice: preventivo.sconti?.[0]?.codice?.codice || preventivo.sconti?.[0]?.codiceTesto || null,
      scontoPercentuale: preventivo.sconti?.[0]?.codice?.percentuale || preventivo.sconti?.[0]?.valoreSconto || null,
      importoSconto: preventivo.scontoTotale || 0,
      imponibile: preventivo.imponibile,
      percentualeIva: preventivo.aliquotaIva,
      importoIva: preventivo.importoIva,
      importoFinale: preventivo.importoFinale,
      note: preventivo.note || '',
      linkAccettazione: dettagli.linkAccettazione || '',
      numPartecipanti: dettagli.numPartecipanti || preventivo.quantita || 0
    }
  };

  // Azienda cliente (se presente)
  if (preventivo.azienda) {
    data.company = {
      id: preventivo.azienda.id,
      name: preventivo.azienda.ragioneSociale,
      vatNumber: preventivo.azienda.partitaIva,
      fiscalCode: preventivo.azienda.codiceFiscale,
      address: {
        street: preventivo.azienda.indirizzo,
        city: preventivo.azienda.citta,
        province: preventivo.azienda.provincia,
        postalCode: preventivo.azienda.cap,
        full: `${preventivo.azienda.indirizzo}, ${preventivo.azienda.cap} ${preventivo.azienda.citta} (${preventivo.azienda.provincia})`
      },
      legalRepresentative: preventivo.azienda.rappresentanteLegale,
      email: preventivo.azienda.email,
      phone: preventivo.azienda.telefono
    };
    
    // Alias azienda per marker
    data.azienda = data.company;
  }

  // Persona cliente (se presente e non azienda)
  if (preventivo.persona && !preventivo.azienda) {
    data.person = {
      id: preventivo.persona.id,
      fullName: `${preventivo.persona.firstName} ${preventivo.persona.lastName}`,
      firstName: preventivo.persona.firstName,
      lastName: preventivo.persona.lastName,
      email: preventivo.persona.email,
      cf: preventivo.persona.fiscalCode,
      phone: preventivo.persona.phone,
      address: {
        street: preventivo.persona.address,
        city: preventivo.persona.city,
        province: preventivo.persona.province,
        postalCode: preventivo.persona.postalCode,
        full: preventivo.persona.address ? 
          `${preventivo.persona.address}, ${preventivo.persona.postalCode} ${preventivo.persona.city} (${preventivo.persona.province})` 
          : ''
      }
    };
  }

  // Corso (se presente)
  if (preventivo.corso) {
    data.course = {
      id: preventivo.corso.id,
      title: preventivo.corso.title,
      code: preventivo.corso.code,
      duration: preventivo.corso.duration,
      category: preventivo.corso.category,
      regulation: preventivo.corso.regulation,
      description: preventivo.corso.description
    };
    
    // Alias corso per marker
    data.corso = data.course;
  }

  return data;
}

/**
 * Aggiunge giorni a una data
 * @private
 */
function _addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export default {
  calculatePreventivoTotals,
  calculateIva,
  determineIvaRate,
  applyDiscount,
  removeDiscount,
  validateStateTransition,
  generateNumeroPreventivo,
  getPreventivoStats,
  generatePDF,
  IVA_RATES_BY_SERVICE,
  STATO_TRANSITIONS
};
