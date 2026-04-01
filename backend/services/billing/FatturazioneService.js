/**
 * FatturazioneService - Business logic fatturazione elettronica
 *
 * Gestisce:
 * - Creazione FatturaElettronica (B2C persona, B2B azienda, acconto, nota credito)
 * - Generazione numero progressivo per anno
 * - Invio ad AcubeAPI/SDI
 * - Aggiornamento stato da webhook SDI
 *
 * @module services/billing/FatturazioneService
 * @project P97 - Fatturazione Elettronica & Sistema TS
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import {
  buildFatturaPA,
  inviaFatturaSDI,
  getStatoFattura,
  ACUBE_STATUS_MAP,
} from './AcubeApiService.js';

// ============================================================================
// NUMERO PROGRESSIVO
// ============================================================================

/**
 * Genera il numero fattura progressivo per ente emittente e anno
 * Formato: ANNO/PROGRESSIVO → es. 2025/001
 * Thread-safe via transazione Prisma
 *
 * @param {string} enteEmittenteId
 * @param {string} tenantId
 * @returns {string} numero fattura
 */
export async function generaNumeroFattura(enteEmittenteId, tenantId) {
  const anno = new Date().getFullYear();

  const ente = await prisma.$transaction(async (tx) => {
    const current = await tx.enteEmittente.findFirst({
      where: { id: enteEmittenteId, tenantId, deletedAt: null },
    });
    if (!current) throw new Error('Ente emittente non trovato');

    const needsReset = current.annoNumFattura !== anno;
    const newProgressivo = needsReset ? 1 : current.progressivoFatt + 1;

    return tx.enteEmittente.update({
      where: { id: enteEmittenteId },
      data: {
        annoNumFattura: anno,
        progressivoFatt: newProgressivo,
      },
    });
  });

  const pad = String(ente.progressivoFatt).padStart(3, '0');
  return `${anno}/${pad}`;
}

// ============================================================================
// CREAZIONE FATTURA
// ============================================================================

/**
 * Dati per creare una nuova fattura elettronica
 * @typedef {object} CreateFatturaInput
 * @property {string} enteEmittenteId
 * @property {string} tipoDocumento - FATTURA|ACCONTO|NOTA_CREDITO|NOTA_DEBITO
 * @property {string} tipoServizio  - TipoServizio enum
 * @property {string} clienteType  - PERSONA|AZIENDA
 * @property {string} [clientePersonaId]
 * @property {string} [clienteAziendaId]
 * @property {string} [terzoPaganteTipo] - GENITORE|AZIENDA|ALTRO
 * @property {string} [terzoPersonaId]
 * @property {string} [terzoAziendaId]
 * @property {object[]} linee - [{ descrizione, quantita, prezzoUnitario, aliquotaIva, natura? }]
 * @property {string} [condizioniPagamento]
 * @property {string} [modalitaPagamento]
 * @property {string} [iban]
 * @property {string} [preventivoId]
 * @property {string} [visitaId]
 * @property {string} [courseScheduleId]
 * @property {string} [nominaId]
 * @property {string} [sopralluogoId]
 * @property {string} [dvrId]
 * @property {string} [fatturaOrigineId] - Per note credito
 * @property {number} [sistemaTsFlagOpp]
 * @property {string} [note]
 * @property {string[]} [sourceMovimentoIds] - IDs movimentoContabile da collegare alla fattura (setterà fatturaElettronicaId)
 */

/**
 * Crea una nuova FatturaElettronica in stato BOZZA
 *
 * @param {CreateFatturaInput} input
 * @param {string} tenantId
 * @param {string} createdBy - personId
 * @returns {object} FatturaElettronica creata
 */
export async function creaFatturaBozza(input, tenantId, createdBy) {
  const ente = await prisma.enteEmittente.findFirst({
    where: { id: input.enteEmittenteId, tenantId, deletedAt: null },
  });
  if (!ente) throw new Error('Ente emittente non trovato');

  // Recupera dati cessionario
  const cessionario = await resolveCessionario(input, tenantId);

  // ── Bollo virtuale & IVA esenzione ────────────────────────────────────────
  // 1. Applica esenzione IVA per disagio psicologico (medicina estetica a finalità terapeutica)
  const lineeProcessate = (input.linee || []).map(l => {
    if (input.disagioPsicologico && l.medicineEstetica) {
      const { aliquotaIva, natura, noteEsenzione } = calcolaIvaMedicinaEstetica(true, l.aliquotaIva);
      return { ...l, aliquotaIva, natura, noteEsenzione };
    }
    return l;
  });

  // 2. Valuta bollo virtuale (€2 se totale >€77.47 e almeno una riga esente)
  const { applicaBollo } = valutaBollo(lineeProcessate, input.clienteType, input.forceBollo);

  const lineeFinal = applicaBollo
    ? [
      ...lineeProcessate,
      {
        descrizione: BOLLO_DESCRIZIONE,
        quantita: 1,
        prezzoUnitario: BOLLO_IMPORTO,
        aliquotaIva: 0,
        natura: 'N4',
        isBolloVirtuale: true,
      },
    ]
    : lineeProcessate;

  // Calcola importi con linee finali (incluso eventuale bollo)
  const totali = calcolaTotali(lineeFinal);

  // Genera numero fattura
  const numero = await generaNumeroFattura(input.enteEmittenteId, tenantId);

  const fattura = await prisma.fatturaElettronica.create({
    data: {
      tenantId,
      enteEmittenteId: ente.id,
      // Snapshot cedente
      cedenteDenominazione: ente.denominazione,
      cedenteCF: ente.codiceFiscale,
      cedentePIVA: ente.piva,
      cedenteIndirizzo: ente.indirizzo,
      cedenteCitta: ente.citta,
      cedenteCAP: ente.cap,
      cedenteProvincia: ente.provincia,
      cedenteRegimeFiscale: ente.regimeFiscale,
      // Tipo
      tipoDocumento: input.tipoDocumento || 'FATTURA',
      tipoServizio: input.tipoServizio || 'ALTRO',
      // Numerazione
      numero,
      dataEmissione: input.dataEmissione ? new Date(input.dataEmissione) : new Date(),
      dataScadenza: input.dataScadenza ? new Date(input.dataScadenza) : null,
      // Cessionario
      clienteType: input.clienteType,
      clientePersonaId: input.clientePersonaId || null,
      clienteAziendaId: input.clienteAziendaId || null,
      terzoPaganteTipo: input.terzoPaganteTipo || null,
      terzoPersonaId: input.terzoPersonaId || null,
      terzoAziendaId: input.terzoAziendaId || null,
      // Snapshot cessionario (può essere passato esplicitamente o risolto da ID)
      cessionarioDenominazione: input.cessionarioDenominazione || cessionario.denominazione,
      cessionarioCF: input.cessionarioCF || cessionario.codiceFiscale,
      cessionarioPIVA: input.cessionarioPIVA || cessionario.piva,
      cessionarioIndirizzo: input.cessionarioIndirizzo || cessionario.indirizzo,
      cessionarioCitta: input.cessionarioCitta || cessionario.citta,
      cessionarioCAP: input.cessionarioCAP || cessionario.cap,
      cessionarioProvincia: input.cessionarioProvincia || cessionario.provincia,
      cessionarioSDI: cessionario.sdi,
      cessionarioPEC: cessionario.pec,
      // Importi
      imponibile: totali.imponibile,
      aliquotaIva: totali.aliquotaIvaMedia,
      importoIva: totali.importoIva,
      totale: totali.totale,
      divisa: 'EUR',
      natura: input.natura || null,
      // Bollo virtuale
      bolloVirtuale: applicaBollo,
      importoBollo: applicaBollo ? BOLLO_IMPORTO : 0,
      // Disagio psicologico (flag per medicina estetica esente IVA)
      disagioPsicologico: input.disagioPsicologico ?? false,
      // Pagamento
      condizioniPagamento: input.condizioniPagamento || null,
      modalitaPagamento: input.modalitaPagamento || null,
      iban: input.iban || ente.iban || null,
      // Riferimenti
      preventivoId: input.preventivoId || null,
      visitaId: input.visitaId || null,
      courseScheduleId: input.courseScheduleId || null,
      nominaId: input.nominaId || null,
      sopralluogoId: input.sopralluogoId || null,
      dvrId: input.dvrId || null,
      fatturaOrigineId: input.fatturaOrigineId || null,
      // SistemaTS
      sistemaTsFlagOpp: input.sistemaTsFlagOpp ?? 0,
      // Stato
      stato: 'BOZZA',
      acubeStatus: 'BOZZA',
      note: input.note || null,
      createdBy,
      // Linee (incluso eventuale bollo virtuale)
      linee: {
        create: lineeFinal.map((l, idx) => ({
          tenantId,
          numeroLinea: idx + 1,
          descrizione: l.descrizione,
          quantita: l.quantita ?? 1,
          unitaMisura: l.unitaMisura || null,
          prezzoUnitario: l.prezzoUnitario,
          prezzoTotale: round2(Number(l.quantita ?? 1) * Number(l.prezzoUnitario)),
          aliquotaIva: l.aliquotaIva ?? 22,
          natura: l.natura || null,
        })),
      },
    },
    include: { linee: true },
  });

  // Collega i movimenti contabili alla fattura appena creata
  // Questo aggiorna stato visivo (DA_FATTURARE → fatturato) nel billing summary
  if (input.sourceMovimentoIds?.length) {
    const updated = await prisma.movimentoContabile.updateMany({
      where: {
        id: { in: input.sourceMovimentoIds },
        tenantId,
        deletedAt: null,
        fatturaElettronicaId: null, // Sicurezza: non sovrascrivere link esistente
      },
      data: { fatturaElettronicaId: fattura.id, stato: 'FATTURATO' },
    });
    logger.info('[FatturazioneService] Movimenti collegati alla fattura', {
      fatturaId: fattura.id,
      movimentiAggiornati: updated.count,
      tenantId,
    });
  }

  logger.info('[FatturazioneService] Fattura bozza creata', {
    id: fattura.id,
    numero: fattura.numero,
    tenantId,
  });

  return fattura;
}

// ============================================================================
// INVIO SDI
// ============================================================================

/**
 * Emette una fattura: invia ad AcubeAPI/SDI e aggiorna stato
 *
 * @param {string} fatturaId
 * @param {string} tenantId
 * @returns {object} FatturaElettronica aggiornata
 */
export async function emettiFattura(fatturaId, tenantId) {
  const fattura = await prisma.fatturaElettronica.findFirst({
    where: { id: fatturaId, tenantId, deletedAt: null },
    include: { linee: true, enteEmittente: true },
  });

  if (!fattura) throw new Error('Fattura non trovata');
  if (fattura.stato !== 'BOZZA') {
    throw new Error(`Fattura in stato ${fattura.stato}, non emettibile`);
  }

  // Validazione pre-emissione: verifica campi obbligatori per SDI
  const campiMancanti = validaFatturaPreEmissione(fattura);
  if (campiMancanti.length > 0) {
    const err = new Error(`Dati incompleti per emissione SDI: ${campiMancanti.join(', ')}`);
    err.code = 'VALIDATION_PRE_EMISSIONE';
    err.campiMancanti = campiMancanti;
    throw err;
  }

  // Costruisce FatturaPA
  const fatturaPA = buildFatturaPA(fattura);

  // Invia ad AcubeAPI — SaaS: ElementMedica usa master token (null → getMasterAcubeToken())
  const result = await inviaFatturaSDI(null, fatturaPA);

  // Aggiorna DB
  const updated = await prisma.fatturaElettronica.update({
    where: { id: fatturaId },
    data: {
      stato: 'EMESSA',
      acubeUuid: result.uuid,
      acubeStatus: 'WAITING',
      acubeLastSync: new Date(),
    },
    include: { linee: true },
  });

  logger.info('[FatturazioneService] Fattura emessa', {
    id: fatturaId,
    acubeUuid: result.uuid,
  });

  return updated;
}

// ============================================================================
// AGGIORNAMENTO STATO DA WEBHOOK / POLLING
// ============================================================================

/**
 * Aggiorna lo stato di una fattura da webhook SDI o polling AcubeAPI
 * Chiamata da: webhook route o job schedulato
 *
 * @param {string} acubeUuid
 * @param {string} newStatus - WAITING|SENT|DELIVERED|NOT_DELIVERED|REJECTED
 * @param {string} [xmlEsito]
 */
export async function aggiornaStatoFatturaSDI(acubeUuid, newStatus, xmlEsito) {
  const fattura = await prisma.fatturaElettronica.findFirst({
    where: { acubeUuid, deletedAt: null },
  });
  if (!fattura) {
    logger.warn('[FatturazioneService] Webhook: fattura non trovata', { acubeUuid });
    return null;
  }

  const mappedStatus = ACUBE_STATUS_MAP[newStatus] || newStatus;
  let nuovoStato = fattura.stato;
  if (mappedStatus === 'DELIVERED') nuovoStato = 'EMESSA'; // già emessa, rimane
  if (mappedStatus === 'REJECTED') nuovoStato = 'BOZZA'; // torna in bozza per correzione

  await prisma.fatturaElettronica.update({
    where: { id: fattura.id },
    data: {
      acubeStatus: mappedStatus,
      acubeLastSync: new Date(),
      acubeXmlEsito: xmlEsito || null,
      ...(nuovoStato !== fattura.stato ? { stato: nuovoStato } : {}),
    },
  });

  logger.info('[FatturazioneService] Stato aggiornato da SDI', {
    id: fattura.id,
    acubeUuid,
    newStatus: mappedStatus,
  });

  return fattura;
}

// ============================================================================
// NOTA CREDITO
// ============================================================================

/**
 * Crea una nota credito per una fattura esistente
 */
export async function creaNataCredito(fatturaOrigineId, tenantId, createdBy, note) {
  const origine = await prisma.fatturaElettronica.findFirst({
    where: { id: fatturaOrigineId, tenantId, deletedAt: null },
    include: { linee: true },
  });
  if (!origine) throw new Error('Fattura di origine non trovata');

  return creaFatturaBozza(
    {
      enteEmittenteId: origine.enteEmittenteId,
      tipoDocumento: 'NOTA_CREDITO',
      tipoServizio: origine.tipoServizio,
      clienteType: origine.clienteType,
      clientePersonaId: origine.clientePersonaId,
      clienteAziendaId: origine.clienteAziendaId,
      linee: origine.linee.map((l) => ({
        descrizione: `NC: ${l.descrizione}`,
        quantita: l.quantita,
        prezzoUnitario: l.prezzoUnitario,
        aliquotaIva: l.aliquotaIva,
        natura: l.natura,
      })),
      fatturaOrigineId: fatturaOrigineId,
      note: note || `Nota credito riferita a fattura ${origine.numero}`,
    },
    tenantId,
    createdBy
  );
}

// ============================================================================
// HELPERS
// ============================================================================

async function resolveCessionario(input, tenantId) {
  // Determina il soggetto fatturato (terzo pagante o diretto)
  // Se terzoPaganteTipo → fattura al terzo (es. genitore)
  if (input.terzoPaganteTipo === 'GENITORE' && input.terzoPersonaId) {
    return resolvePersona(input.terzoPersonaId, tenantId);
  }
  if (input.terzoPaganteTipo === 'AZIENDA' && input.terzoAziendaId) {
    return resolveAzienda(input.terzoAziendaId, tenantId);
  }
  // Fattura diretta alla persona o azienda
  if (input.clienteType === 'PERSONA' && input.clientePersonaId) {
    return resolvePersona(input.clientePersonaId, tenantId);
  }
  if (input.clienteType === 'AZIENDA' && input.clienteAziendaId) {
    return resolveAzienda(input.clienteAziendaId, tenantId);
  }
  // Fallback anonimo
  return {
    denominazione: 'Cliente generico',
    codiceFiscale: null,
    piva: null,
    indirizzo: '',
    citta: '',
    cap: '00000',
    provincia: null,
    sdi: null,
    pec: null,
  };
}

async function resolvePersona(personId, tenantId) {
  const p = await prisma.person.findFirst({
    where: { id: personId, deletedAt: null },
    include: { tenantProfiles: { where: { tenantId }, take: 1 } },
  });
  if (!p || !p.tenantProfiles?.length) return datiVuoti();

  const profile = p.tenantProfiles[0];
  return {
    denominazione: `${p.firstName} ${p.lastName}`,
    codiceFiscale: p.taxCode,
    piva: p.vatNumber,
    indirizzo: profile?.residenceAddress || '',
    citta: profile?.residenceCity || '',
    cap: profile?.postalCode || '00000',
    provincia: profile?.province || null,
    sdi: null,
    pec: profile?.pec || null,
  };
}

async function resolveAzienda(companyProfileId, tenantId) {
  const cp = await prisma.companyTenantProfile.findFirst({
    where: { id: companyProfileId, tenantId, deletedAt: null },
    include: { company: true },
  });
  if (!cp) return datiVuoti();

  return {
    denominazione: cp.company?.ragioneSociale || '',
    codiceFiscale: cp.company?.codiceFiscale || null,
    piva: cp.company?.piva || null,
    indirizzo: cp.company?.indirizzo || '',
    citta: cp.company?.citta || '',
    cap: cp.company?.cap || '00000',
    provincia: cp.company?.provincia || null,
    sdi: cp.company?.sdi || null,
    pec: cp.company?.pecFatturazione || cp.company?.pec || null,
  };
}

function datiVuoti() {
  return {
    denominazione: '',
    codiceFiscale: null,
    piva: null,
    indirizzo: '',
    citta: '',
    cap: '00000',
    provincia: null,
    sdi: null,
    pec: null,
  };
}

function calcolaTotali(linee) {
  let imponibile = 0;
  let importoIva = 0;

  for (const l of linee || []) {
    const rowTotal = round2(Number(l.quantita ?? 1) * Number(l.prezzoUnitario));
    const rowIva = round2(rowTotal * (Number(l.aliquotaIva ?? 22) / 100));
    imponibile += rowTotal;
    importoIva += rowIva;
  }

  const totale = round2(imponibile + importoIva);
  const aliquotaIvaMedia =
    imponibile > 0 ? round2((importoIva / imponibile) * 100) : 22;

  return {
    imponibile: round2(imponibile),
    importoIva: round2(importoIva),
    totale,
    aliquotaIvaMedia,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ============================================================================
// BOLLO VIRTUALE (DPR 642/1972 - art. 6)
// ============================================================================

/**
 * Soglia imponibile per applicazione bollo virtuale (€77.47 arrotondato a €77)
 * Applicabile a fatture esenti IVA (N2, N3, N4) quando il totale supera la soglia.
 */
export const BOLLO_SOGLIA = 77.47;
export const BOLLO_IMPORTO = 2.00;
export const BOLLO_DESCRIZIONE = 'Imposta di bollo – art. 6 Tab. Allegato B DPR 642/72';

/**
 * Determina se va applicato il bollo virtuale.
 *
 * Il bollo si applica quando:
 * 1. L'importo totale della fattura supera €77.47
 * 2. Almeno una riga è esente IVA (aliquota = 0, natura N2/N3/N4)
 * 3. NON viene applicato se il cessionario è un soggetto IVA (B2B) con reverse charge
 *
 * @param {Array} linee
 * @param {string} clienteType - 'PERSONA' | 'AZIENDA'
 * @param {boolean} [forceBollo] - override manuale
 * @returns {{ applicaBollo: boolean, motivo: string }}
 */
export function valutaBollo(linee, clienteType, forceBollo = undefined) {
  if (forceBollo !== undefined) {
    return { applicaBollo: !!forceBollo, motivo: 'override_manuale' };
  }

  const totaleLinee = (linee || []).reduce((acc, l) => {
    return acc + round2(Number(l.quantita ?? 1) * Number(l.prezzoUnitario));
  }, 0);

  if (totaleLinee <= BOLLO_SOGLIA) {
    return { applicaBollo: false, motivo: `totale_${totaleLinee}_sotto_soglia` };
  }

  // Almeno una riga esente IVA
  const haEsenteIVA = (linee || []).some(l =>
    Number(l.aliquotaIva) === 0 ||
    (l.natura && ['N2', 'N2.2', 'N3', 'N3.5', 'N4'].some(n => l.natura.startsWith(n)))
  );

  if (!haEsenteIVA) {
    return { applicaBollo: false, motivo: 'nessuna_riga_esente' };
  }

  // B2B non soggetti a bollo (solo B2C o AZIENDE non IVA)
  // Nota: per ora applichiamo anche B2B in assenza di reverse charge esplicito
  return { applicaBollo: true, motivo: `totale_${totaleLinee}_esente_oltre_soglia` };
}

// ============================================================================
// IVA ESENZIONE - MEDICINA ESTETICA (disagio psicologico)
// ============================================================================

/**
 * Prestazioni di medicina estetica normalmente soggette ad IVA 22%,
 * ma esenti ex art. 10 n.18 DPR 633/72 se c'è finalità terapeutica
 * (es. disagio psicologico certificato dal medico).
 *
 * @param {boolean} disagioPsicologico
 * @param {number} aliquotaDefault - aliquota IVA di default della prestazione
 * @returns {{ aliquotaIva: number, natura: string|null, noteEsenzione: string|null }}
 */
export function calcolaIvaMedicinaEstetica(disagioPsicologico, aliquotaDefault = 22) {
  if (disagioPsicologico) {
    return {
      aliquotaIva: 0,
      natura: 'N4',
      noteEsenzione: 'Prestazione esente IVA ex art.10 n.18 DPR 633/72 – finalità terapeutica per disagio psicologico certificato',
    };
  }
  return {
    aliquotaIva: aliquotaDefault,
    natura: null,
    noteEsenzione: null,
  };
}

// ============================================================================
// VALIDAZIONE PRE-EMISSIONE SDI
// ============================================================================

/**
 * Verifica tutti i campi obbligatori prima di inviare ad AcubeAPI/SDI.
 * Restituisce un array di messaggi user-friendly per ogni campo mancante.
 *
 * @param {object} fattura - FatturaElettronica con linee e enteEmittente
 * @returns {string[]} array di campi mancanti (vuoto se valida)
 */
function validaFatturaPreEmissione(fattura) {
  const mancanti = [];

  // Cedente (ente emittente)
  if (!fattura.cedentePIVA && !fattura.cedenteCF) {
    mancanti.push('Ente emittente: P.IVA o Codice Fiscale mancante');
  }
  if (fattura.cedenteCF && fattura.cedenteCF.length < 11) {
    mancanti.push(`Ente emittente: Codice Fiscale troppo corto (${fattura.cedenteCF.length} caratteri, minimo 11)`);
  }
  if (!fattura.cedenteDenominazione) {
    mancanti.push('Ente emittente: Denominazione mancante');
  }
  if (!fattura.cedenteIndirizzo) {
    mancanti.push('Ente emittente: Indirizzo mancante');
  }
  if (!fattura.cedenteCitta) {
    mancanti.push('Ente emittente: Città mancante');
  }

  // Cessionario (destinatario)
  if (!fattura.cessionarioDenominazione) {
    mancanti.push('Destinatario: Nome/Ragione sociale mancante');
  }
  if (!fattura.cessionarioCF && !fattura.cessionarioPIVA) {
    mancanti.push('Destinatario: Codice Fiscale o P.IVA mancante');
  }
  if (!fattura.cessionarioIndirizzo) {
    mancanti.push('Destinatario: Indirizzo mancante');
  }
  if (!fattura.cessionarioCitta) {
    mancanti.push('Destinatario: Città mancante');
  }
  if (!fattura.cessionarioCAP || !/^\d{5}$/.test(fattura.cessionarioCAP)) {
    mancanti.push('Destinatario: CAP deve essere 5 cifre');
  }

  // Linee
  if (!fattura.linee || fattura.linee.length === 0) {
    mancanti.push('Nessuna riga in fattura');
  }

  // Totale
  if (!fattura.totale || Number(fattura.totale) <= 0) {
    mancanti.push('Totale fattura non valido');
  }

  // Pagamento
  if (!fattura.modalitaPagamento) {
    mancanti.push('Modalità di pagamento non impostata');
  }

  return mancanti;
}
