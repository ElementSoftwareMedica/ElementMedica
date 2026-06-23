/**
 * SistemaTSService - Integrazione Sistema Tessera Sanitaria (730 precompilato)
 * AcubeAPI: POST /sistema-ts/expenses
 *
 * Docs: https://docs.acubeapi.com/documentation/italy/gov-it/sistemaTS/
 *
 * @module services/billing/SistemaTSService
 * @project P97 - Fatturazione Elettronica & Sistema TS
 */

import axios from 'axios';
import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { getMasterAcubeToken, ACUBE_BASE_URL } from './AcubeApiService.js';

// ============================================================================
// SISTEMA TS HTTP CLIENT
// ============================================================================

/**
 * Invia spesa sanitaria al SistemaTS tramite AcubeAPI
 * POST /sistema-ts/expenses
 *
 * SaaS model: usa sempre il master token ElementMedica (getMasterAcubeToken)
 *
 * @param {null} _ignored - Ignorato (mantenuto per compatibilità firma)
 * @param {{ pinCode, username, password }} credentials - Credenziali SistemaTS dell'ente
 * @param {object} payload - Corpo della richiesta (cf. spec AcubeAPI)
 * @returns {{ uuid, outcome, messages, protocol }} - Risposta (201)
 */
export async function inviaSpesaSanitaria(_ignored, credentials, payload) {
  const apiKey = await getMasterAcubeToken();
  try {
    const response = await axios.post(
      `${ACUBE_BASE_URL}/sistema-ts/expenses`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-SistemaTS-PinCode': credentials.pinCode,
          'X-SistemaTS-Username': credentials.username,
          'X-SistemaTS-Password': credentials.password,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
      }
    );
    logger.info('[SistemaTS] Spesa inviata', {
      outcome: response.data?.outcome,
      protocol: response.data?.protocol,
    });
    return response.data;
  } catch (err) {
    const detail = err.response?.data || err.message;
    logger.error('[SistemaTS] Errore invio spesa', { detail });
    throw new Error(`SistemaTS errore invio: ${JSON.stringify(detail)}`);
  }
}

/**
 * Elenca spese sanitarie già inviate
 * GET /sistema-ts/expenses
 *
 * SaaS model: usa sempre il master token ElementMedica
 */
export async function elencaSpese(_ignored, credentials, params = {}) {
  const apiKey = await getMasterAcubeToken();
  try {
    const response = await axios.get(`${ACUBE_BASE_URL}/sistema-ts/expenses`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-SistemaTS-PinCode': credentials.pinCode,
        'X-SistemaTS-Username': credentials.username,
        'X-SistemaTS-Password': credentials.password,
        Accept: 'application/json',
      },
      params,
      timeout: 15000,
    });
    return response.data;
  } catch (err) {
    const detail = err.response?.data || err.message;
    logger.error('[SistemaTS] Errore lista spese', { detail });
    throw new Error(`SistemaTS errore lista: ${JSON.stringify(detail)}`);
  }
}

/**
 * Verifica connessione SistemaTS
 * SaaS model: usa sempre il master token ElementMedica
 */
export async function testConnessioneSistemaTS(_ignored, credentials) {
  try {
    await elencaSpese(null, credentials, { limit: 1 });
    return { ok: true };
  } catch (err) {
    logger.error('Test connessione Sistema TS fallito', { error: err.message });
    return { ok: false, error: 'Connessione a Sistema TS fallita' };
  }
}

// ============================================================================
// COSTRUZIONE PAYLOAD SISTEMA TS
// ============================================================================

/**
 * Tipo spesa mapping
 * SP = Medico Chirurgo | GP = Generico
 */
export const TIPO_SPESA_MAP = {
  VISITA: 'SP',          // Visita medica specialistica
  PRESTAZIONE_CLINICA: 'SP', // Prestazione clinica
  CORSO: 'GP',
  DVR: 'GP',
  RSPP: 'GP',
  MEDICO_COMPETENTE: 'SP',
  CONSULENZA: 'GP',
  ALTRO: 'GP',
};

/**
 * Costruisce il payload SistemaTS da una FatturaElettronica (con linee)
 *
 * @param {object} fattura - FatturaElettronica con linee e enteEmittente
 * @param {object} enteEmittente - EnteEmittente con credenziali SistemaTS
 * @param {string} cfPaziente   - Codice fiscale del paziente (dalla Tessera Sanitaria)
 * @returns {object} - Payload per POST /sistema-ts/expenses
 */
export function buildSistemaTSPayload(fattura, enteEmittente, cfPaziente) {
  const dispositivo = process.env.SISTEMA_TS_DISPOSITIVO || '0000000001';

  // Schema AcubeAPI (POST /sistema-ts/expenses), verificato empiricamente sulla sandbox:
  // - flag_tipo_spesa: INT (valori ammessi 1|2), NON stringa
  // - aliquota_iva: deve essere POSITIVA → per le prestazioni esenti va OMESSA e si
  //   invia solo natura_iva (es. N4 per le prestazioni mediche esenti art.10)
  // - flag_pagamento_anticipato: INT (solo 1 ammesso) → opzionale, lo omettiamo
  const spese = (fattura.linee || []).map((l) => {
    const aliquota = Number(l.aliquotaIva) || 0;
    const esente = aliquota === 0;
    return {
      tipo_spesa: TIPO_SPESA_MAP[fattura.tipoServizio] || 'SP',
      flag_tipo_spesa: 1, // int: tipologia di spesa indicata
      importo: Number(l.prezzoTotale),
      // Esente → solo natura_iva (aliquota omessa); imponibile → aliquota positiva
      ...(esente
        ? { natura_iva: l.natura || 'N4' }
        : { aliquota_iva: aliquota }),
    };
  });

  return {
    cf_proprietario: enteEmittente.codiceFiscale, // Obbligatorio
    partita_iva: enteEmittente.piva || undefined,
    cf_cittadino: cfPaziente, // Da tessera sanitaria
    data_emissione: formatDate(fattura.dataEmissione),
    numero_documento_fiscale: fattura.numero,
    dispositivo,
    spesa: spese,
    data_pagamento: fattura.dataEmissione
      ? formatDate(fattura.dataEmissione)
      : undefined,
    tipo_documento: 'F', // F=Fattura, D=Documento Commerciale
    flag_opposizione: fattura.sistemaTsFlagOpp ?? 0, // 0=autorizza SistemaTS a condividere dati, 1=oppone
    pagamento_tracciato:
      fattura.modalitaPagamento &&
        fattura.modalitaPagamento !== 'MP01'
        ? 'SI'
        : 'NO',
  };
}

function formatDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString().split('T')[0];
}

/**
 * Valida un codice fiscale italiano (persona fisica: 16 alfanumerici).
 * Lenient: accetta anche CF numerici a 11 cifre (casi particolari).
 * @param {string} cf
 * @returns {boolean}
 */
export function isValidCodiceFiscale(cf) {
  if (!cf || typeof cf !== 'string') return false;
  const norm = cf.trim().toUpperCase();
  return /^[A-Z0-9]{16}$/.test(norm) || /^[0-9]{11}$/.test(norm);
}

/**
 * Risolve il CF del cittadino (paziente) a cui è intestata la spesa sanitaria.
 * Priorità: CF esplicito → cliente persona (il paziente effettivo, anche con
 * terzo pagante) → cessionario della fattura.
 *
 * @param {object} fattura - FatturaElettronica con relazione clientePersona
 * @param {string|null} cfEsplicito
 * @returns {string|null}
 */
export function resolveCfCittadino(fattura, cfEsplicito = null) {
  const candidato =
    cfEsplicito ||
    (fattura.clienteType === 'PERSONA' ? fattura.clientePersona?.taxCode : null) ||
    fattura.cessionarioCF ||
    null;
  return candidato ? candidato.trim().toUpperCase() : null;
}

// ============================================================================
// SINCRONIZZAZIONE - Invia + aggiorna DB
// ============================================================================

/**
 * Invia spesa al SistemaTS e salva il log + aggiorna FatturaElettronica
 *
 * @param {string} fatturaId
 * @param {string|null} cfPaziente - CF paziente esplicito (opzionale: se null
 *        viene derivato dalla fattura via resolveCfCittadino)
 * @param {string} tenantId
 */
export async function sincronizzaSistemaTS(fatturaId, cfPaziente, tenantId) {
  const fattura = await prisma.fatturaElettronica.findFirst({
    where: { id: fatturaId, tenantId, deletedAt: null },
    include: {
      linee: true,
      enteEmittente: true,
      clientePersona: { select: { taxCode: true } },
    },
  });

  if (!fattura) throw new Error('Fattura non trovata');
  if (!fattura.enteEmittente.sistemaTsAbilitato) {
    throw new Error('SistemaTS non abilitato per questo ente emittente');
  }

  // Pre-check credenziali: errore chiaro e distinguibile (code) se mancanti
  const { sistemaTsPinCode, sistemaTsUsername, sistemaTsPassword } = fattura.enteEmittente;
  if (!sistemaTsPinCode || !sistemaTsUsername || !sistemaTsPassword) {
    const err = new Error(
      `Credenziali SistemaTS mancanti per l'ente "${fattura.enteEmittente.denominazione}"`
    );
    err.code = 'SISTEMA_TS_CREDENZIALI_MANCANTI';
    throw err;
  }

  // Risolve e valida il CF del cittadino (paziente)
  const cfCittadino = resolveCfCittadino(fattura, cfPaziente);
  if (!isValidCodiceFiscale(cfCittadino)) {
    const err = new Error(
      `Codice fiscale paziente mancante o non valido per la fattura ${fattura.numero}`
    );
    err.code = 'SISTEMA_TS_CF_NON_VALIDO';
    throw err;
  }

  const credentials = {
    pinCode: sistemaTsPinCode,
    username: sistemaTsUsername,
    password: sistemaTsPassword,
  };

  const payload = buildSistemaTSPayload(fattura, fattura.enteEmittente, cfCittadino);

  let result;
  let errorMessage = null;

  try {
    // SaaS: master token usato internamente da inviaSpesaSanitaria
    result = await inviaSpesaSanitaria(null, credentials, payload);
  } catch (err) {
    errorMessage = err.message;
    result = null;
  }

  // Salva log
  await prisma.sistemaTSSyncLog.create({
    data: {
      fatturaId,
      tenantId,
      outcome: result?.outcome ?? null,
      protocol: result?.protocol ?? null,
      requestPayload: payload,
      responsePayload: result ?? null,
      messages: result?.messages ?? null,
      errorMessage,
      httpStatus: errorMessage ? 500 : 201,
    },
  });

  // Errore di trasmissione (rete/HTTP/AcubeAPI)
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  // outcome === 1 = spesa RIFIUTATA dal SistemaTS → fallimento (non aggiorna la fattura)
  if (result && result.outcome === 1) {
    const err = new Error(
      `Spesa rifiutata dal Sistema TS${result.messages ? ': ' + JSON.stringify(result.messages) : ''}`
    );
    err.code = 'SISTEMA_TS_RIFIUTATA';
    err.outcome = result.outcome;
    err.messages = result.messages ?? null;
    throw err;
  }

  // Successo → marca la fattura come trasmessa
  await prisma.fatturaElettronica.update({
    where: { id: fatturaId },
    data: {
      sistemaTsProtocol: result?.protocol ?? null,
      sistemaTsOutcome: result?.outcome ?? null,
      sistemaTsMessages: result?.messages ?? null,
      sistemaTsSyncAt: new Date(),
    },
  });

  return {
    success: true,
    protocol: result?.protocol ?? null,
    outcome: result?.outcome ?? null,
    messages: result?.messages ?? null,
  };
}
