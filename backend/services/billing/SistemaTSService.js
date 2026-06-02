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

  const spese = (fattura.linee || []).map((l) => ({
    tipo_spesa: TIPO_SPESA_MAP[fattura.tipoServizio] || 'SP',
    flag_tipo_spesa: 'ticket', // oppure 'nessuno', 'esenzione_reddito', etc.
    importo: Number(l.prezzoTotale),
    aliquota_iva: Number(l.aliquotaIva),
    // natura_iva: solo se IVA = 0
    ...(Number(l.aliquotaIva) === 0 && l.natura
      ? { natura_iva: l.natura }
      : {}),
  }));

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
    flag_pagamento_anticipato: false,
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

// ============================================================================
// SINCRONIZZAZIONE - Invia + aggiorna DB
// ============================================================================

/**
 * Invia spesa al SistemaTS e salva il log + aggiorna FatturaElettronica
 *
 * @param {string} fatturaId
 * @param {string} cfPaziente - CF paziente dalla tessera sanitaria
 * @param {string} tenantId
 */
export async function sincronizzaSistemaTS(fatturaId, cfPaziente, tenantId) {
  const fattura = await prisma.fatturaElettronica.findFirst({
    where: { id: fatturaId, tenantId, deletedAt: null },
    include: {
      linee: true,
      enteEmittente: true,
    },
  });

  if (!fattura) throw new Error('Fattura non trovata');
  if (!fattura.enteEmittente.sistemaTsAbilitato) {
    throw new Error('SistemaTS non abilitato per questo ente emittente');
  }

  const credentials = {
    pinCode: fattura.enteEmittente.sistemaTsPinCode,
    username: fattura.enteEmittente.sistemaTsUsername,
    password: fattura.enteEmittente.sistemaTsPassword,
  };

  const payload = buildSistemaTSPayload(fattura, fattura.enteEmittente, cfPaziente);

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

  // Aggiorna fattura se successo
  if (result && result.outcome !== 1) {
    await prisma.fatturaElettronica.update({
      where: { id: fatturaId },
      data: {
        sistemaTsProtocol: result.protocol ?? null,
        sistemaTsOutcome: result.outcome,
        sistemaTsMessages: result.messages ?? null,
        sistemaTsSyncAt: new Date(),
      },
    });
  }

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return result;
}
