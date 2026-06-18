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

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';
import { Decimal } from '@prisma/client/runtime/library';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Percorso root del backend (backend/services/ → backend/)
const BACKEND_DIR = join(__dirname, '..');

/**
 * Converte un path relativo/assoluto del logo in data-URL base64.
 * Usa sharp per ridimensionare l'immagine a max 440x160px prima della codifica,
 * evitando embedding di PNG da centinaia di KB/MB nel template HTML.
 *
 * @param {string} logoPath - Path relativo (es. /uploads/cms/tenant/logo.png) o URL assoluto
 * @returns {Promise<string>} - data-URL base64 ottimizzato oppure il path/URL originale
 */
async function logoToDataUrl(logoPath) {
  if (!logoPath) return '';
  if (logoPath.startsWith('data:')) return logoPath;

  let effectivePath = logoPath;
  if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
    try {
      const url = new URL(logoPath);
      const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '0.0.0.0';
      if (isLocal) {
        effectivePath = url.pathname;
      } else {
        return logoPath;
      }
    } catch { return logoPath; }
  }

  const cleanPath = effectivePath.startsWith('/') ? effectivePath.slice(1) : effectivePath;
  const PROJECT_ROOT = join(BACKEND_DIR, '..');
  const tryPaths = [join(BACKEND_DIR, cleanPath), join(BACKEND_DIR, 'public', cleanPath), join(PROJECT_ROOT, 'public', cleanPath), join(PROJECT_ROOT, cleanPath)];
  let resolvedPath = null;
  for (const p of tryPaths) {
    if (existsSync(p)) { resolvedPath = p; break; }
  }

  if (!resolvedPath) {
    logger.warn('[preventivi-service] Logo file non trovato nel filesystem', { logoPath, tried: tryPaths });
    return logoPath;
  }
  try {
    const ext = resolvedPath.split('.').pop().toLowerCase();
    const mime = ext === 'png' ? 'image/png'
      : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg'
        : ext === 'svg' ? 'image/svg+xml'
          : 'image/png';

    let data;
    if (ext === 'svg') {
      data = readFileSync(resolvedPath);
    } else {
      const originalSize = readFileSync(resolvedPath).length;
      data = await sharp(resolvedPath)
        .resize(440, 160, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 8, quality: 85 })
        .toBuffer();
      logger.debug('[preventivi-service] Logo ottimizzato', {
        logoPath,
        originalSize,
        optimizedSize: data.length,
        reduction: `${Math.round((1 - data.length / originalSize) * 100)}%`
      });
    }
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch (err) {
    logger.warn('[preventivi-service] Errore ottimizzazione logo, fallback a lettura diretta', { logoPath, error: err.message });
    try {
      const data = readFileSync(filePath);
      const ext = filePath.split('.').pop().toLowerCase();
      const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
      return `data:${mime};base64,${data.toString('base64')}`;
    } catch {
      return logoPath;
    }
  }
}

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
 * 
 * Stati disponibili:
 * - BOZZA: Preventivo in lavorazione
 * - INVIATO: Inviato al cliente
 * - VISUALIZZATO: Il cliente ha visualizzato
 * - ACCETTATO: Accettato dal cliente
 * - RIFIUTATO: Rifiutato dal cliente
 * - SCADUTO: Preventivo scaduto (non più valido)
 * - CONVERTITO: Convertito in fattura/ordine
 * - FATTURATO: Generata fattura
 * - ANNULLATO: Annullato manualmente
 * - ARCHIVIATO: Stato finale archiviazione
 */
const STATO_TRANSITIONS = {
  BOZZA: ['INVIATO', 'ACCETTATO', 'SCADUTO', 'ARCHIVIATO'],
  INVIATO: ['VISUALIZZATO', 'ACCETTATO', 'RIFIUTATO', 'SCADUTO', 'ARCHIVIATO'],
  VISUALIZZATO: ['ACCETTATO', 'RIFIUTATO', 'SCADUTO', 'ARCHIVIATO'],
  ACCETTATO: ['FATTURATO', 'CONVERTITO', 'ANNULLATO'],
  RIFIUTATO: ['ARCHIVIATO'],
  SCADUTO: ['ARCHIVIATO'],
  CONVERTITO: ['FATTURATO', 'ARCHIVIATO'],
  FATTURATO: ['ARCHIVIATO'],
  ANNULLATO: ['ARCHIVIATO'],
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
      where: { id: preventivoId, deletedAt: null },
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
      where: { id: codiceId, deletedAt: null }
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
        valoreSconto: Number(codice.valore),
        importoScontato: importoSconto,
        applicatoIl: now,
        applicatoDa: options.userId,
        tenantId: preventivo.tenantId
      }
    });

    // Incrementa contatore utilizzo codice
    await client.codiceSconto.update({
      where: { id: codiceId, deletedAt: null },
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
      where: { id: preventivoId, deletedAt: null },
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
      where: { id: preventivoId, deletedAt: null },
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
      where: { id: scontoId, deletedAt: null },
      data: {
        deletedAt: now,
        deletedBy: options.userId || null
      }
    });

    // Decrementa contatore utilizzo codice
    const codice = await client.codiceSconto.findUnique({
      where: { id: sconto.codiceId, deletedAt: null },
      select: { utilizzoCorrente: true }
    });

    if (codice && codice.utilizzoCorrente > 0) {
      await client.codiceSconto.update({
        where: { id: sconto.codiceId, deletedAt: null },
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
      where: { id: preventivoId, deletedAt: null },
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
        deletedAt: null,
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
      where: { id: preventivoId, deletedAt: null },
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

    // 1b. Carica companyTenantProfile se presente (con company e referente)
    let azienda = null;
    if (preventivo.companyTenantProfileId) {
      const companyProfile = await prisma.companyTenantProfile.findFirst({
        where: { id: preventivo.companyTenantProfileId, deletedAt: null },
        include: {
          company: true,
          referente: true
        }
      });
      // Map to legacy azienda format for template compatibility
      if (companyProfile?.company) {
        azienda = {
          id: companyProfile.id,
          ragioneSociale: companyProfile.company.ragioneSociale,
          partitaIva: companyProfile.company.piva,
          codiceFiscale: companyProfile.company.codiceFiscale,
          indirizzo: companyProfile.company.sedeLegaleIndirizzo,
          citta: companyProfile.company.sedeLegaleCitta,
          cap: companyProfile.company.sedeLegaleCap,
          provincia: companyProfile.company.sedeLegaleProvincia,
          email: companyProfile.emailGenerale,
          telefono: companyProfile.telefonoGenerale,
          rappresentanteLegale: companyProfile.referente
            ? `${companyProfile.referente.firstName || ''} ${companyProfile.referente.lastName || ''}`.trim()
            : null,
          codiceAteco: companyProfile.company.codiceAteco
        };
      }
    }

    // 1c. Carica persona se presente
    let persona = null;
    if (preventivo.personaId) {
      persona = await prisma.person.findFirst({ // F246: findFirst+deletedAt
        where: { id: preventivo.personaId, deletedAt: null }
      });
    }

    // 1d. Carica corso se presente
    let corso = null;
    if (preventivo.corsoId) {
      corso = await prisma.course.findFirst({
        where: { id: preventivo.corsoId, deletedAt: null }
      });
    } else if (preventivo.schedule?.course) {
      corso = preventivo.schedule.course;
    }

    // Attach to preventivo object for _buildMarkerData
    preventivo.azienda = azienda;
    preventivo.persona = persona;
    preventivo.corso = corso;

    // 1e. Carica tenant per header/footer template
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null }
    });

    // 2. Trova template "Preventivo" - preferisce isDefault, fallback al più recente
    let template = await prisma.templateLink.findFirst({
      where: {
        tenantId,
        type: 'PREVENTIVO',
        isDefault: true,
        isActive: true,
        deletedAt: null
      }
    });

    if (!template) {
      template = await prisma.templateLink.findFirst({
        where: {
          tenantId,
          type: 'PREVENTIVO',
          isActive: true,
          deletedAt: null
        },
        orderBy: {
          version: 'desc'
        }
      });
    }

    if (!template) {
      logger.error('Template PREVENTIVO non trovato', {
        function: 'generatePDF',
        tenantId,
        preventivoId,
        message: 'Nessun template PREVENTIVO attivo trovato per questo tenant'
      });
      throw new Error('Template "Preventivo" non trovato. Configurare template prima di generare PDF.');
    }

    logger.info('Template PREVENTIVO selezionato', {
      function: 'generatePDF',
      templateId: template.id,
      templateName: template.name,
      templateVersion: template.version,
      tenantId,
      preventivoId
    });

    // 3. Build marker data
    const markerData = _buildMarkerData(preventivo);

    // 3b. Aggiungi dati tenant per header/footer (fornitore = nostra azienda)
    // NOTA: I dati estesi (address, vatNumber, etc.) sono in tenant.settings (JSON)
    const tenantSettings = tenant?.settings || {};
    // MEDICO_COMPETENTE usa il branch MEDICA, tutti gli altri usano FORMAZIONE/SICUREZZA
    const isMedicaBranch = preventivo?.tipoServizio === 'MEDICO_COMPETENTE';
    const tenantLogoUrl = isMedicaBranch
      ? (tenantSettings.branches?.MEDICA?.logo || tenantSettings.logoUrl || '')
      : (tenantSettings.branches?.FORMAZIONE?.logo || tenantSettings.branches?.SICUREZZA?.logo || tenantSettings.logoUrl || '');

    // Converte il path relativo in data-URL base64 ottimizzato per Puppeteer
    // (Puppeteer non ha accesso diretto al file system tramite path HTTP relativi)
    const tenantLogoEmbedded = await logoToDataUrl(tenantLogoUrl);

    const vatNumber = tenantSettings.vatNumber || tenantSettings.piva || tenantSettings.vat || '';
    if (!vatNumber) {
      logger.warn('Tenant vatNumber/piva/vat mancante in settings — PIVA non comparirà nel PDF', { tenantId });
    }

    markerData.tenant = {
      name: tenant?.name || 'Element srl',
      address: tenantSettings.address || '',
      cap: tenantSettings.cap || tenantSettings.postalCode || '',
      city: tenantSettings.city || '',
      provincia: tenantSettings.provincia || tenantSettings.province || '',
      vatNumber,
      fiscalCode: tenantSettings.fiscalCode || tenantSettings.cf || tenantSettings.vatNumber || tenantSettings.vat || '',
      phone: tenantSettings.phone || '',
      email: tenantSettings.email || '',
      pec: tenantSettings.pec || '',
      website: tenantSettings.website || '',
      logoUrl: tenantLogoEmbedded || tenantLogoUrl,
      branchLogo: await logoToDataUrl(isMedicaBranch
        ? (tenantSettings.branches?.MEDICA?.logo || tenantSettings.branches?.FORMAZIONE?.logo || '')
        : (tenantSettings.branches?.FORMAZIONE?.logo || tenantSettings.branches?.MEDICA?.logo || '')),
      // Logo HTML: usa data-URL base64 per garantire la visualizzazione in Puppeteer
      logoHtml: tenantLogoEmbedded
        ? `<img src="${tenantLogoEmbedded}" alt="${tenant?.name || 'Tenant'}" style="max-height:80px;max-width:220px;object-fit:contain;">`
        : `<span style="font-size: 14pt; font-weight: 700; color: #1e40af;">${tenant?.name || 'Element srl'}</span>`
    };

    // 3c. Template v12 non ha più bisogno di rimuovere riga sconto 
    // perché totaliHtml è già generato correttamente in _buildMarkerData
    let templateContent = template.content;

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
        markers: markerData, // Pass direttamente come markers, non customData
        customTemplate: templateContent // Template modificato senza riga sconto
      }
    });

    // 5. Aggiorna stato preventivo se era in BOZZA
    if (preventivo.stato === 'BOZZA') {
      await prisma.preventivo.update({
        where: { id: preventivoId, deletedAt: null },
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

    // 6. Generate custom filename: yyyy.mm.dd - Preventivo "ragione sociale"
    const pdfBuffer = result.file.buffer;

    let customFilename = result.fileName;
    if (azienda?.ragioneSociale) {
      const companyName = azienda.ragioneSociale
        .replace(/[^a-zA-Z0-9\sàèìòùáéíóúÀÈÌÒÙÁÉÍÓÚ]/g, '') // Keep letters, numbers, spaces and accented chars
        .trim()
        .substring(0, 50); // Limit length

      // Use dataEmissione if available, otherwise current date
      const dateToUse = preventivo.dataEmissione ? new Date(preventivo.dataEmissione) : new Date();
      const yyyy = dateToUse.getFullYear();
      const mm = String(dateToUse.getMonth() + 1).padStart(2, '0');
      const dd = String(dateToUse.getDate()).padStart(2, '0');
      const dateFormatted = `${yyyy}.${mm}.${dd}`; // Format: yyyy.mm.dd
      customFilename = `${dateFormatted} - Preventivo ${companyName}.pdf`;
    } else if (persona) {
      // Fallback to persona name if no company
      const personName = `${persona.firstName || ''} ${persona.lastName || ''}`.trim().substring(0, 50);
      const dateToUse = preventivo.dataEmissione ? new Date(preventivo.dataEmissione) : new Date();
      const yyyy = dateToUse.getFullYear();
      const mm = String(dateToUse.getMonth() + 1).padStart(2, '0');
      const dd = String(dateToUse.getDate()).padStart(2, '0');
      const dateFormatted = `${yyyy}.${mm}.${dd}`;
      customFilename = `${dateFormatted} - Preventivo ${personName}.pdf`;
    } else {
      // Fallback to preventivo numero when no company or persona is linked
      const dateToUse = preventivo.dataEmissione ? new Date(preventivo.dataEmissione) : new Date();
      const yyyy = dateToUse.getFullYear();
      const mm = String(dateToUse.getMonth() + 1).padStart(2, '0');
      const dd = String(dateToUse.getDate()).padStart(2, '0');
      const dateFormatted = `${yyyy}.${mm}.${dd}`;
      const identifier = preventivo.numero || `PRV-${preventivo.id.substring(0, 8)}`;
      customFilename = `${dateFormatted} - Preventivo ${identifier}.pdf`;
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

  // Helper per formattare date dd/mm/yyyy
  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Estrai voci dal dettagliServizio
  const vociRaw = dettagli.voci || [];
  const voci = vociRaw.map((v, index) => ({
    numero: index + 1,
    descrizione: v.descrizione || v.titoloServizio || 'Servizio',
    quantita: v.quantita || 1,
    prezzoUnitario: Number(v.prezzoUnitario || v.importo || 0).toFixed(2),
    subtotale: Number(v.subtotale || v.prezzoTotale || v.importo || 0).toFixed(2)
  }));

  // Se non ci sono voci, crea una voce singola dal preventivo
  if (voci.length === 0) {
    const q = preventivo.quantita || 1;
    const prezzoTot = Number(preventivo.prezzoTotale || 0);
    const unitPrice = q > 1 ? prezzoTot / q : prezzoTot;
    voci.push({
      numero: 1,
      descrizione: preventivo.titoloServizio || 'Servizio',
      quantita: q,
      prezzoUnitario: unitPrice.toFixed(2),
      subtotale: prezzoTot.toFixed(2)
    });
  }

  const data = {
    // Array voci per template {{#each voci}}
    voci,

    preventivo: {
      id: preventivo.id,
      numeroProgressivo: preventivo.numeroProgressivo || '-',
      annoProgressivo: preventivo.annoProgressivo || new Date().getFullYear(),
      stato: preventivo.stato,
      dataCreazione: formatDate(preventivo.dataEmissione),
      dataEmissione: formatDate(preventivo.dataEmissione),
      dataInvio: formatDate(preventivo.dataInvio),
      dataAccettazione: formatDate(preventivo.dataAccettazione),
      dataValidita: formatDate(preventivo.dataScadenza || _addDays(preventivo.dataEmissione, 30)),
      dataScadenza: formatDate(preventivo.dataScadenza || _addDays(preventivo.dataEmissione, 30)),
      tipoServizio: _getTipoServizioLabel(preventivo.tipoServizio),
      titoloServizio: preventivo.titoloServizio || 'Servizio',
      prezzoTotale: Number(preventivo.prezzoTotale).toFixed(2),
      prezzoUnitario: preventivo.quantita && preventivo.quantita > 0
        ? (Number(preventivo.prezzoTotale) / Number(preventivo.quantita)).toFixed(2)
        : Number(preventivo.prezzoTotale).toFixed(2),
      speseAccessorie: Number(dettagli.speseAccessorie || 0).toFixed(2),
      subtotale: (Number(preventivo.prezzoTotale) + Number(dettagli.speseAccessorie || 0)).toFixed(2),
      scontoApplicato: preventivo.scontoTotale > 0, // True solo se sconto > 0
      codiceSconto: preventivo.sconti?.[0]?.codiceTesto || preventivo.sconti?.[0]?.codice?.codice || '',
      scontoCodice: preventivo.sconti?.[0]?.codiceTesto || preventivo.sconti?.[0]?.codice?.codice || '',
      scontoPercentuale: preventivo.sconti?.[0]?.valoreSconto || preventivo.sconti?.[0]?.codice?.valore || null,
      importoSconto: Number(preventivo.scontoTotale || 0).toFixed(2),
      imponibile: Number(preventivo.imponibile).toFixed(2),
      aliquotaIva: Number(preventivo.aliquotaIva).toFixed(2),
      percentualeIva: Number(preventivo.aliquotaIva).toFixed(2),
      importoIva: Number(preventivo.importoIva).toFixed(2),
      importoFinale: Number(preventivo.importoFinale).toFixed(2),
      note: preventivo.note || '',  // SOLO note utente, NON dettagli corso
      linkAccettazione: dettagli.linkAccettazione || '',
      numPartecipanti: preventivo.quantita || dettagli.numPartecipanti || 0,
      partecipanti: preventivo.quantita || dettagli.numPartecipanti || '',
      metodoPagamento: dettagli.metodoPagamento || '30gg data fattura',

      // Campi DVR (quando tipoServizio = DVR)
      dvrNumDipendenti: dettagli.numDipendenti || dettagli.dvrNumDipendenti || '',
      dvrSettore: dettagli.settore || dettagli.dvrSettore || '',
      dvrNumSedi: dettagli.numSedi || dettagli.dvrNumSedi || '1',
      dvrTempiConsegna: dettagli.tempiConsegna || dettagli.dvrTempiConsegna || '30 giorni lavorativi',

      // Campi RSPP (quando tipoServizio = RSPP)
      rsppNumDipendenti: dettagli.numDipendenti || dettagli.rsppNumDipendenti || '',
      rsppClasseRischio: dettagli.classeRischio || dettagli.rsppClasseRischio || 'Medio',
      rsppDurata: dettagli.durataMesi || dettagli.rsppDurata || '12',
      rsppPeriodicitaVisite: dettagli.periodicitaVisite || dettagli.rsppPeriodicitaVisite || 'Mensile',

      // Campi Medico Competente (quando tipoServizio = MEDICO_COMPETENTE)
      medicoNumDipendenti: dettagli.numDipendenti || dettagli.medicoNumDipendenti || '',
      medicoTipoVisite: dettagli.tipoVisite || dettagli.medicoTipoVisite || 'Preventive e periodiche',
      medicoFrequenza: dettagli.frequenzaVisite || dettagli.medicoFrequenza || 'Annuale',
      medicoSede: dettagli.sedeVisite || dettagli.medicoSede || 'Presso sede cliente',

      // Campi ALTRO servizio
      altroDescrizione: dettagli.descrizione || preventivo.note || '',
      altroQuantita: dettagli.quantita || preventivo.quantita || '1',

      // Sconti individuali (fino a 3)
      sconto1Codice: preventivo.sconti?.[0]?.codiceTesto || preventivo.sconti?.[0]?.codice?.codice || '',
      sconto1Descrizione: preventivo.sconti?.[0]?.codice?.descrizione || preventivo.sconti?.[0]?.descrizione || '',
      sconto1Importo: Number(preventivo.sconti?.[0]?.importo || 0).toFixed(2),
      sconto2Codice: preventivo.sconti?.[1]?.codiceTesto || preventivo.sconti?.[1]?.codice?.codice || '',
      sconto2Descrizione: preventivo.sconti?.[1]?.codice?.descrizione || preventivo.sconti?.[1]?.descrizione || '',
      sconto2Importo: Number(preventivo.sconti?.[1]?.importo || 0).toFixed(2),
      sconto3Codice: preventivo.sconti?.[2]?.codiceTesto || preventivo.sconti?.[2]?.codice?.codice || '',
      sconto3Descrizione: preventivo.sconti?.[2]?.codice?.descrizione || preventivo.sconti?.[2]?.descrizione || '',
      sconto3Importo: Number(preventivo.sconti?.[2]?.importo || 0).toFixed(2)
    },

    // Alias cliente per compatibilità template (popolato dopo)
    cliente: {}
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

    // Alias cliente per template
    data.cliente = {
      nome: preventivo.azienda.ragioneSociale,
      ragioneSociale: preventivo.azienda.ragioneSociale,
      partitaIva: preventivo.azienda.partitaIva,
      codiceFiscale: preventivo.azienda.codiceFiscale,
      codiceAteco: preventivo.azienda.codiceAteco,
      indirizzo: preventivo.azienda.indirizzo,
      cap: preventivo.azienda.cap,
      citta: preventivo.azienda.citta,
      provincia: preventivo.azienda.provincia,
      indirizzoCompleto: preventivo.azienda.indirizzo
        ? `${preventivo.azienda.indirizzo}, ${preventivo.azienda.cap || ''} ${preventivo.azienda.citta || ''} ${preventivo.azienda.provincia ? `(${preventivo.azienda.provincia})` : ''}`.trim().replace(/\s+/g, ' ')
        : '',
      email: preventivo.azienda.email,
      telefono: preventivo.azienda.telefono,
      rappresentanteLegale: preventivo.azienda.rappresentanteLegale
    };
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

    // Alias cliente per template (persona)
    data.cliente = {
      nome: `${preventivo.persona.firstName} ${preventivo.persona.lastName}`,
      firstName: preventivo.persona.firstName,
      lastName: preventivo.persona.lastName,
      codiceFiscale: preventivo.persona.fiscalCode,
      indirizzo: preventivo.persona.address,
      cap: preventivo.persona.postalCode,
      citta: preventivo.persona.city,
      provincia: preventivo.persona.province,
      indirizzoCompleto: preventivo.persona.address ?
        `${preventivo.persona.address}, ${preventivo.persona.postalCode} ${preventivo.persona.city} (${preventivo.persona.province})`
        : '',
      email: preventivo.persona.email,
      telefono: preventivo.persona.phone
    };
  }

  // Corso (se presente)
  if (preventivo.corso) {
    // Funzione helper per determinare se è un corso RLS
    const isRLSCourse = (title) => {
      if (!title) return false;
      const normalizedTitle = title.toLowerCase();
      return (
        normalizedTitle.includes('rls') ||
        normalizedTitle.includes('rappresentante dei lavoratori') ||
        normalizedTitle.includes('rappresentante lavoratori sicurezza')
      );
    };

    // Funzione helper per formattare riskLevel con supporto RLS
    const formatRiskLevel = (riskLevel, courseTitle) => {
      if (!riskLevel || riskLevel === 'N/A') return 'N/A';
      const isRLS = isRLSCourse(courseTitle);

      if (isRLS) {
        const rlsLabels = {
          'ALTO': '>50 Dipendenti',
          'MEDIO': '15-50 Dipendenti',
          'BASSO': '<50 Dipendenti',
          'A': '>50 Dipendenti',
          'B': '15-50 Dipendenti',
          'C': '<50 Dipendenti'
        };
        return rlsLabels[riskLevel] || riskLevel;
      }

      const standardLabels = {
        'ALTO': 'Rischio Alto',
        'MEDIO': 'Rischio Medio',
        'BASSO': 'Rischio Basso',
        'A': 'Categoria A',
        'B': 'Categoria B',
        'C': 'Categoria C'
      };
      return standardLabels[riskLevel] || riskLevel;
    };

    const formattedRiskLevel = formatRiskLevel(preventivo.corso.riskLevel, preventivo.corso.title);

    data.course = {
      id: preventivo.corso.id,
      title: preventivo.corso.title,
      code: preventivo.corso.code,
      duration: preventivo.corso.duration,
      category: preventivo.corso.category,
      regulation: preventivo.corso.regulation,
      description: preventivo.corso.description,
      riskLevel: formattedRiskLevel,
      courseType: preventivo.corso.courseType || 'N/A'
    };

    // Alias corso per marker
    data.corso = data.course;

    // Genera HTML per meta corso (per template v11/v12)
    // Duration può essere un numero o una stringa con "ore"/"h", normalizza
    const durationValue = data.corso.duration
      ? String(data.corso.duration).replace(/\s*(ore|h)\s*/i, '')
      : '-';
    const durationDisplay = durationValue !== '-' ? `${durationValue}h` : '-';

    data.corso.metaHtml = `
    <div class="service-meta">
      <span>Cod. <strong>${data.corso.code || '-'}</strong></span>
      <span>Durata <strong>${durationDisplay}</strong></span>
      ${data.corso.category ? `<span>${data.corso.category}</span>` : ''}
      ${data.corso.riskLevel && data.corso.riskLevel !== 'N/A' ? `<span><strong>${data.corso.riskLevel}</strong></span>` : ''}
    </div>`;

    // Genera HTML per box corso completo (per template v11)
    data.corso.boxHtml = `
  <div class="service-box">
    <h3>${data.corso.title || 'Servizio'}</h3>
    ${data.corso.metaHtml}
  </div>`;
  } else {
    // Se non c'è corso, marker vuoto
    data.corso = { metaHtml: '', boxHtml: '' };
  }

  // ========================================
  // MARKER HTML COMPOSITI per template v12
  // ========================================

  // 1. Voci HTML (tabella righe)
  data.vociHtml = data.voci.map(v => `
      <tr>
        <td class="num">${v.numero}</td>
        <td>${v.descrizione}</td>
        <td class="qty">${v.quantita}</td>
        <td class="price">€ ${v.prezzoUnitario}</td>
        <td class="total">€ ${v.subtotale}</td>
      </tr>`).join('\n');

  // 2. Totali HTML (con/senza sconto)
  let totaliHtml = '';
  if (data.preventivo.scontoApplicato && parseFloat(data.preventivo.importoSconto) > 0) {
    totaliHtml += `
      <div class="total-row original">
        <span class="label">Subtotale</span>
        <span class="value">€ ${data.preventivo.prezzoTotale}</span>
      </div>
      <div class="total-row discount">
        <span class="label">Sconto${data.preventivo.scontoPercentuale ? ` ${data.preventivo.scontoPercentuale}%` : ''}</span>
        <span class="value">-€ ${data.preventivo.importoSconto}</span>
      </div>`;
  }
  totaliHtml += `
      <div class="total-row">
        <span class="label">Imponibile</span>
        <span class="value">€ ${data.preventivo.imponibile}</span>
      </div>
      <div class="total-row">
        <span class="label">IVA ${data.preventivo.percentualeIva}%</span>
        <span class="value">€ ${data.preventivo.importoIva}</span>
      </div>
      <div class="total-row final">
        <span class="label">TOTALE</span>
        <span class="value">€ ${data.preventivo.importoFinale}</span>
      </div>`;
  data.totaliHtml = totaliHtml;

  // 3. Note HTML (condizionale)
  data.noteHtml = data.preventivo.note ? `
  <div class="notes-box">
    <h4>Note:</h4>
    <p>${data.preventivo.note}</p>
  </div>` : '';

  // 4. Cliente dettagli HTML
  let clienteDettagli = '';
  if (data.cliente.partitaIva) {
    clienteDettagli += `<p><span class="label">P.IVA:</span> <span class="value">${data.cliente.partitaIva}</span></p>`;
  }
  if (data.cliente.codiceFiscale) {
    clienteDettagli += `<p><span class="label">C.F.:</span> <span class="value">${data.cliente.codiceFiscale}</span></p>`;
  }
  if (data.cliente.codiceAteco) {
    clienteDettagli += `<p><span class="label">ATECO:</span> <span class="value">${data.cliente.codiceAteco}</span></p>`;
  }
  if (data.cliente.indirizzoCompleto) {
    clienteDettagli += `<p style="font-size: 9pt; color: #6b7280;">${data.cliente.indirizzoCompleto}</p>`;
  }
  data.cliente.dettagliHtml = clienteDettagli;

  // 5. Partecipanti HTML - visibile solo per CORSO (non DVR, RSPP, MDL, ecc.)
  data.preventivo.partecipantiHtml = (data.preventivo.partecipanti && preventivo.tipoServizio === 'CORSO')
    ? `<p><span class="label">Partecipanti:</span> <span class="value">${data.preventivo.partecipanti}</span></p>`
    : '';

  // 6. Numero preventivo formattato
  data.preventivo.numero = data.preventivo.numeroProgressivo && data.preventivo.annoProgressivo
    ? `PREV-${data.preventivo.annoProgressivo}-${String(data.preventivo.numeroProgressivo).padStart(4, '0')}`
    : `PREV-${new Date().getFullYear()}-XXXX`;

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

/**
 * Converte enum TipoServizio in label leggibile
 * @private
 */
function _getTipoServizioLabel(tipoServizio) {
  const labels = {
    'CORSO': 'Formazione',
    'DVR': 'DVR',
    'RSPP': 'RSPP',
    'MEDICO_COMPETENTE': 'Medicina del Lavoro',
    'CONSULENZA': 'Consulenza',
    'COMPENSO_FORMATORE': 'Compenso Formatore',
    'ALTRO': 'Altro'
  };
  return labels[tipoServizio] || tipoServizio || 'Servizio';
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
