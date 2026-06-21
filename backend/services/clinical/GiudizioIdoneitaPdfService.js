/**
 * GiudizioIdoneitaPdfService
 *
 * Genera i PDF del Giudizio di Idoneità alla Mansione secondo Art. 41 D.Lgs 81/08:
 *
 *  • Copia per il LAVORATORE  (Art. 41 c.7 — consegna obbligatoria)
 *  • Copia per il DATORE di LAVORO (Art. 41 c.7 — comunicazione obbligatoria)
 *
 * Le due copie differiscono nel contenuto:
 *  — Lavoratore: giudizio completo con prescrizioni/limitazioni e termini di ricorso
 *  — Datore:     solo esito idoneità + eventuali prescrizioni/limitazioni operative,
 *                senza dati sanitari riservati (GDPR Art. 9-I)
 *
 * @module services/clinical/GiudizioIdoneitaPdfService
 * @compliance D.Lgs 81/08 Art. 41 c.7 — GDPR Reg. UE 2016/679 Art. 9
 */

import path from 'path';
import fs from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import prisma from '../../config/prisma-optimization.js';
import pdfService from '../pdfService.js';
import logger from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, '../..');

// Cartella upload per salvataggio PDF
const UPLOADS_BASE = path.resolve(__dirname, '../../uploads/giudizi-idoneita');

/**
 * Converte un path relativo del logo in data-URL base64 per Puppeteer.
 */
function logoToDataUrl(logoPath) {
  if (!logoPath) return '';
  if (logoPath.startsWith('data:')) return logoPath;
  let effectivePath = logoPath;
  if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
    try {
      const url = new URL(logoPath);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '0.0.0.0') {
        effectivePath = url.pathname;
      } else { return logoPath; }
    } catch { return logoPath; }
  }
  const cleanPath = effectivePath.startsWith('/') ? effectivePath.slice(1) : effectivePath;
  const PROJECT_ROOT = path.resolve(BACKEND_DIR, '..');
  const tryPaths = [path.join(BACKEND_DIR, cleanPath), path.join(BACKEND_DIR, 'public', cleanPath), path.join(PROJECT_ROOT, 'public', cleanPath), path.join(PROJECT_ROOT, cleanPath)];
  for (const p of tryPaths) {
    if (existsSync(p)) {
      try {
        const data = readFileSync(p);
        const ext = p.split('.').pop().toLowerCase();
        const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
        return `data:${mime};base64,${data.toString('base64')}`;
      } catch { break; }
    }
  }
  return '';
}

function resolveFirstValidLogo(...paths) {
  for (const p of paths) {
    if (!p) continue;
    const result = logoToDataUrl(p);
    if (result.startsWith('data:')) return result;
  }
  return '';
}

// ============================================================
// HELPERS
// ============================================================

const GIUDIZIO_LABELS = {
  IDONEO: 'IDONEO',
  IDONEO_CON_PRESCRIZIONI: 'IDONEO PARZIALE CON PRESCRIZIONI',
  IDONEO_CON_LIMITAZIONI: 'IDONEO PARZIALE CON LIMITAZIONI',
  IDONEO_CON_LIMITAZIONI_PRESCRIZIONI: 'IDONEO PARZIALE CON LIMITAZIONI E PRESCRIZIONI',
  NON_IDONEO_TEMPORANEO: 'TEMPORANEAMENTE NON IDONEO',
  NON_IDONEO_PERMANENTE: 'NON IDONEO'
};

const GIUDIZIO_COLORS = {
  IDONEO: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  IDONEO_CON_PRESCRIZIONI: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  IDONEO_CON_LIMITAZIONI: { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  IDONEO_CON_LIMITAZIONI_PRESCRIZIONI: { bg: '#fff7ed', text: '#9a3412', border: '#fb923c' },
  NON_IDONEO_TEMPORANEO: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  NON_IDONEO_PERMANENTE: { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' }
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Estrae la posizione firma { page, x, y, w } dal campo note (JSON). null se assente/non valida. */
function parseFirmaPosition(firma) {
  if (!firma?.note) return null;
  try {
    const p = typeof firma.note === 'string' ? JSON.parse(firma.note) : firma.note;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      return { page: Number.isInteger(p.page) ? p.page : 0, x: p.x, y: p.y, w: Number.isFinite(p.w) ? p.w : 0.25 };
    }
  } catch { /* note non JSON → nessuna posizione */ }
  return null;
}

function fmtMedico(p) {
  if (!p) return '—';
  const title = p.gender === 'FEMALE' ? 'Dott.ssa' : 'Dott.';
  return `${title} ${p.firstName} ${p.lastName}`;
}

function fmtList(values) {
  const unique = [...new Set((values || []).filter(Boolean).map(String))];
  return unique.length ? unique.join(', ') : '—';
}

function getCompanyProfile(g) {
  const mansioneWithSite = g.mansioni?.find(m => m.mansione?.site?.companyTenantProfile);
  return mansioneWithSite?.mansione?.site?.companyTenantProfile || g.visita?.appuntamento?.companyTenantProfile || null;
}

function getWorkerProfile(g) {
  return g.person?.tenantProfiles?.[0] || null;
}

function getProtocolNames(g) {
  const fromMansioni = (g.mansioni || []).flatMap(item => {
    const mansione = item.mansione;
    return [
      ...(mansione?.protocolli || []).map(p => p.denominazione),
      ...(mansione?.protocolliMansione || []).map(pm => pm.protocolloSanitario?.denominazione)
    ];
  });
  const fromProfile = getWorkerProfile(g)?.protocolloSanitario?.denominazione;
  return fmtList([fromProfile, ...fromMansioni]);
}

function getRiskNames(g) {
  const mansioneRisks = (g.mansioni || []).flatMap(item =>
    (item.mansione?.rischiAssociati || []).map(r => r.descrizioneEsposizione || r.codiceRischio)
  );
  const workerRisks = g.person?.rischiAggiuntivi?.map(r => r.descrizioneEsposizione || r.codiceRischio) || [];
  return fmtList([...mansioneRisks, ...workerRisks]);
}

function getPerformedPrestazioni(g) {
  const visitMain = g.visita?.prestazione?.nome;
  const appPrestazioni = g.visita?.appuntamento?.prestazioni?.map(p => p.prestazione?.nome).filter(Boolean) || [];
  return fmtList([visitMain, ...appPrestazioni]);
}

function getNextMdlDeadline(g) {
  // La prima scadenza prestazione (ordinata per data) o, in fallback, la scadenza del giudizio.
  const next = g.visita?.scadenzePrestazioni?.[0]?.dataScadenza;
  return next || g.dataScadenza || null;
}

function getAlbo(medico) {
  const profile = medico?.tenantProfiles?.[0];
  return profile?.registerCode || '';
}

// ============================================================
// LABEL DECODERS — convert DB codes to readable Italian labels
// ============================================================

const PRESCRIZIONI_CODE_MAP = {
  uso_dpi_specifici: 'Uso obbligatorio dei DPI specifici previsti dal DVR',
  pause_vdt: 'Pause/alternanza attività per videoterminale',
  mmc_carichi_limitati: 'Movimentazione manuale carichi entro limiti indicati',
  evitare_sforzi_incongrui: 'Evitare sforzi incongrui, posture forzate o movimenti ripetitivi prolungati',
  protezione_rumore: 'Protezione uditiva e rispetto del programma aziendale rumore',
  protezione_vibrazioni: 'Limitare esposizione a vibrazioni secondo valutazione del rischio',
  protezione_chimici: 'Evitare o ridurre esposizione ad agenti chimici sensibilizzanti/irritanti',
  protezione_biologici: 'Applicare misure di prevenzione per rischio biologico',
  no_alcol_stupefacenti_rischio: 'Rispetto dei divieti/controlli per alcol e sostanze nelle mansioni a rischio',
  sorveglianza_ravvicinata: 'Sorveglianza sanitaria ravvicinata secondo indicazione del medico competente'
};

const LIMITAZIONI_CODE_MAP = {
  no_lavoro_quota: 'Non adibire a lavori in quota se non compatibili con il giudizio',
  no_piattaforme_elevabili: 'Non adibire a PLE/cestelli se non compatibili con il giudizio',
  no_guida_mezzi: 'Limitare conduzione di mezzi/attrezzature ove non compatibile',
  no_spazi_confinati: 'Non adibire a spazi confinati o sospetti di inquinamento',
  limitazione_notturno_mansione: 'Limitazione o esclusione dal lavoro notturno',
  limitazione_mmc: 'Limitazione della movimentazione manuale dei carichi',
  no_vibrazioni: 'Limitazione esposizione a vibrazioni mano-braccio/corpo intero',
  no_rumore_85db: 'Limitazione esposizione a rumore elevato',
  limitazione_chimici: 'Limitazione dell’esposizione ad agenti chimici pericolosi',
  no_cancerogeni: 'Esclusione/limitazione esposizione ad agenti cancerogeni o mutageni',
  no_stress_termico: 'Limitazione attività con stress termico severo',
  no_vdt_prolungato: 'Limitazione uso continuativo del videoterminale'
};

/**
 * Decodifica codici in etichette leggibili. Se il testo contiene codici noti
 * (separati da virgola/punto-virgola/newline), li sostituisce con le label.
 * Il testo libero rimane invariato.
 */
function decodeCodesToLabels(text, codeMap) {
  if (!text) return '';
  const parts = text.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  return parts.map(part => codeMap[part] || part).join('\n');
}

// ============================================================
// TEMPLATE FIELD EXTRACTOR
// ============================================================

/**
 * Estrae i campi rilevanti dal template visita e dai datiStrutturati.
 * Usa label-matching per trovare i campi delle sezioni normativa/conclusione.
 * 
 * @param {Object|null} visita - La visita con datiStrutturati e template.fields
 * @returns {{ 
 *   prescrizioniNormativa: string[],
 *   limitazioniMansione: string[],
 *   prescrizioniAzienda: string[],
 *   prescrizioniFollowUp: string,
 *   esamiProssimaVisita: string,
 *   periodicita: string
 * }}
 */
function extractVisitaTemplateFields(visita) {
  const empty = {
    prescrizioniNormativa: [],
    limitazioniMansione: [],
    prescrizioniAzienda: [],
    prescrizioniFollowUp: '',
    esamiProssimaVisita: '',
    periodicita: ''
  };

  if (!visita?.datiStrutturati || !visita.visitTemplate?.fields) return empty;

  const dati = typeof visita.datiStrutturati === 'string'
    ? JSON.parse(visita.datiStrutturati)
    : visita.datiStrutturati;

  const templateFields = Array.isArray(visita.visitTemplate.fields)
    ? visita.visitTemplate.fields
    : (typeof visita.visitTemplate.fields === 'string' ? JSON.parse(visita.visitTemplate.fields) : []);

  // Helpers
  const labelIncludes = (field, ...keywords) =>
    keywords.every(kw => (field.label || '').toLowerCase().includes(kw.toLowerCase()));

  const getLabelValue = (field) => {
    const raw = dati[field.name];
    if (raw === undefined || raw === null || raw === '') return null;
    return raw;
  };

  const toStringArray = (v) => {
    if (Array.isArray(v)) return v.filter(Boolean).map(String);
    if (typeof v === 'string' && v.trim()) return [v];
    return [];
  };

  const result = { ...empty };

  for (const field of templateFields) {
    const v = getLabelValue(field);
    if (v === null) continue;

    const lbl = (field.label || '').toLowerCase();

    // "Prescrizioni ai sensi della Normativa" (MULTI_CHOICE)
    if (lbl.includes('normativa') && (lbl.includes('prescrizi') || lbl.includes('sensi'))) {
      result.prescrizioniNormativa = toStringArray(v);
    }
    // "Limitazioni alla Mansione Specifica" (MULTI_CHOICE)
    else if (lbl.includes('limitazion') && (lbl.includes('mansione') || lbl.includes('specific'))) {
      result.limitazioniMansione = toStringArray(v);
    }
    // "Prescrizioni per l'Azienda" (MULTI_CHOICE) - solo datore
    else if (lbl.includes('azienda') && lbl.includes('prescrizi')) {
      result.prescrizioniAzienda = toStringArray(v);
    }
    // "Prescrizioni e Indicazioni Follow-up"
    else if ((lbl.includes('follow') || lbl.includes('indicazion')) && lbl.includes('prescrizi')) {
      result.prescrizioniFollowUp = String(v);
    }
    // "Esami da eseguire alla prossima visita"
    else if (lbl.includes('esami') && (lbl.includes('prossima') || lbl.includes('eseguire'))) {
      result.esamiProssimaVisita = String(v);
    }
    // "Periodicità Sorveglianza Sanitaria"
    else if (lbl.includes('periodicit') || (lbl.includes('sorveglianza') && lbl.includes('sanitar'))) {
      result.periodicita = String(v);
    }
  }

  return result;
}

/**
 * Render a MULTI_CHOICE field as an HTML list
 */
function renderMultiChoice(items, emptyText = null) {
  if (!items || items.length === 0) return emptyText ? `<em style="color:#9ca3af;">${emptyText}</em>` : '';
  return `<ul style="margin:0;padding-left:18px;font-size:9.5pt;line-height:1.8;">
        ${items.map(i => `<li>${i}</li>`).join('\n')}
    </ul>`;
}

// ============================================================
// HTML GENERATORS
// ============================================================

/**
 * HTML condiviso (header + stili)
 */
function buildSharedHead(titolo) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titolo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 10pt;
    color: #1a1a2e;
    background: #fff;
    padding: 30px 40px;
    line-height: 1.5;
  }
  .header { 
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 2px solid #0d9488; padding-bottom: 14px; margin-bottom: 20px;
  }
  .header-left h1 { font-size: 16pt; font-weight: 800; color: #0d9488; }
  .header-left p  { font-size: 9pt; color: #6b7280; margin-top: 3px; }
  .header-right   { text-align: right; font-size: 9pt; color: #374151; }
  .badge-box {
    margin: 18px 0; padding: 16px 20px; border-radius: 8px; border: 1.5px solid;
    text-align: center;
  }
  .badge-box .esito-label { font-size: 11pt; font-weight: 700; letter-spacing: 0.05em; }
  .section { margin-top: 18px; }
  .section h2 {
    font-size: 10pt; font-weight: 700; text-transform: uppercase;
    color: #0d9488; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 12px;
    letter-spacing: 0.04em;
  }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
  .field-label { font-size: 8pt; text-transform: uppercase; color: #9ca3af; margin-bottom: 2px; }
  .field-value { font-size: 10pt; font-weight: 500; color: #111827; }
  .text-block {
    background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;
    padding: 10px 14px; font-size: 9.5pt; white-space: pre-wrap; line-height: 1.6;
  }
  .gdpr-note {
    margin-top: 24px; padding: 10px 14px; border-left: 3px solid #6b7280;
    background: #f3f4f6; font-size: 8.5pt; color: #6b7280; font-style: italic;
  }
  .ricorso-box {
    margin-top: 14px; padding: 12px 16px; border: 1px solid #fbbf24;
    background: #fefce8; border-radius: 6px; font-size: 9pt;
  }
  .ricorso-box strong { color: #92400e; }
  .firma-section {
    margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;
  }
  .firma-box { border-top: 1px solid #9ca3af; padding-top: 6px; text-align: center; font-size: 9pt; color: #6b7280; }
  .footer {
    margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e7eb;
    font-size: 8pt; color: #9ca3af; text-align: center;
  }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>`;
}

/**
 * Genera HTML giudizio per il LAVORATORE (Art. 41 c.7 — copia completa)
 * @param {Object} g - Giudizio con relazioni
 * @param {Object} tenant - Tenant con nome e logo
 * @param {string|null} firmaMedicoDataUrl - Data URL firma medico (opzionale, inline nel PDF)
 */
function buildLavoratoreHtml(g, tenant, firmaMedicoDataUrl = null) {
  const col = GIUDIZIO_COLORS[g.tipoGiudizio] || GIUDIZIO_COLORS.IDONEO;
  const personName = `${g.person?.lastName ?? ''} ${g.person?.firstName ?? ''}`.trim();
  const mansione = g.mansioni?.map(m => m.mansione?.denominazione).filter(Boolean).join(', ') || '—';
  const companyProfile = getCompanyProfile(g);
  const workerProfile = getWorkerProfile(g);
  const companyName = companyProfile?.company?.ragioneSociale || '—';
  const sede = g.mansioni?.find(m => m.mansione?.site)?.mansione?.site;
  const sedeLabel = sede ? fmtList([sede.siteName, sede.indirizzo, sede.citta]) : '—';
  const reparto = workerProfile?.reparto?.nome || workerProfile?.reparto?.codice || '—';
  const title = workerProfile?.title || '—';
  const protocollo = getProtocolNames(g);
  const rischi = getRiskNames(g);
  const accertamenti = getPerformedPrestazioni(g);
  const nextDeadline = getNextMdlDeadline(g);
  const albo = getAlbo(g.medicoCompetente);

  // Estrai campi template visita
  const tf = extractVisitaTemplateFields(g.visita);

  return `${buildSharedHead('Giudizio di Idoneità alla Mansione')}

  <div class="header">
    <div class="header-left">
      ${tenant?.logo ? `<img src="${tenant.logo}" alt="${tenant?.name ?? ''}" style="max-height:60px;max-width:180px;object-fit:contain;margin-bottom:8px;">` : ''}
      <h1>Giudizio di Idoneità alla Mansione</h1>
      <p>ai sensi dell'Art. 41 c.6 e c.7 D.Lgs 81/08</p>
    </div>
    <div class="header-right">
      <strong>${tenant?.name ?? ''}</strong><br>
      Data emissione: ${fmtDate(g.dataEmissione)}<br>
      N° Rif: GI-${g.id.substring(0, 8).toUpperCase()}
    </div>
  </div>

  <div class="badge-box" style="background:${col.bg}; color:${col.text}; border-color:${col.border};">
    <div class="esito-label">${GIUDIZIO_LABELS[g.tipoGiudizio] ?? g.tipoGiudizio}</div>
    ${nextDeadline ? `<div style="margin-top:6px;font-size:9pt;">Scadenza prossima visita periodica: <strong>${fmtDate(nextDeadline)}</strong></div>` : ''}
  </div>

  <div class="section">
    <h2>Dati Lavoratore</h2>
    <div class="grid">
      <div>
        <div class="field-label">Cognome e Nome</div>
        <div class="field-value">${personName}</div>
      </div>
      <div>
        <div class="field-label">Codice Fiscale</div>
        <div class="field-value">${g.person?.taxCode ?? '—'}</div>
      </div>
      <div>
        <div class="field-label">Mansione/i</div>
        <div class="field-value">${mansione}</div>
      </div>
      <div>
        <div class="field-label">Profilo professionale</div>
        <div class="field-value">${title}</div>
      </div>
      <div>
        <div class="field-label">Data Visita</div>
        <div class="field-value">${fmtDate(g.visita?.dataOra ?? g.dataEmissione)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Dati Aziendali e Sorveglianza</h2>
    <div class="grid">
      <div>
        <div class="field-label">Ragione sociale</div>
        <div class="field-value">${companyName}</div>
      </div>
      <div>
        <div class="field-label">Sede</div>
        <div class="field-value">${sedeLabel}</div>
      </div>
      <div>
        <div class="field-label">Reparto</div>
        <div class="field-value">${reparto}</div>
      </div>
      <div>
        <div class="field-label">Protocollo sanitario</div>
        <div class="field-value">${protocollo}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Fattori di Rischio e Accertamenti</h2>
    <div class="grid">
      <div>
        <div class="field-label">Fattori di rischio</div>
        <div class="field-value">${rischi}</div>
      </div>
      <div>
        <div class="field-label">Accertamenti eseguiti nella visita</div>
        <div class="field-value">${accertamenti}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Medico Competente</h2>
    <div class="grid">
      <div>
        <div class="field-label">Medico</div>
        <div class="field-value">${fmtMedico(g.medicoCompetente)}</div>
      </div>
      <div>
        <div class="field-label">Iscrizione albo</div>
        <div class="field-value">${albo || '—'}</div>
      </div>
      ${g.visita?.tipoVisitaMDL ? `<div><div class="field-label">Tipo Visita</div><div class="field-value">${g.visita.tipoVisitaMDL.replace(/_/g, ' ')}</div></div>` : ''}
      <div><div class="field-label">Data emissione giudizio</div><div class="field-value">${fmtDate(g.dataEmissione)}</div></div>
    </div>
  </div>

  ${g.prescrizioniIdoneita ? `
  <div class="section">
    <h2>Prescrizioni</h2>
    <div class="text-block">${decodeCodesToLabels(g.prescrizioniIdoneita, PRESCRIZIONI_CODE_MAP)}</div>
  </div>` : ''}

  ${g.limitazioni ? `
  <div class="section">
    <h2>Limitazioni</h2>
    <div class="text-block">${decodeCodesToLabels(g.limitazioni, LIMITAZIONI_CODE_MAP)}</div>
  </div>` : ''}

  ${g.motivazioni ? `
  <div class="section">
    <h2>Motivazioni</h2>
    <div class="text-block">${g.motivazioni}</div>
  </div>` : ''}

  ${tf.prescrizioniNormativa.length > 0 ? `
  <div class="section">
    <h2>Prescrizioni ai sensi della Normativa (Art. 41 D.Lgs 81/08)</h2>
    ${renderMultiChoice(tf.prescrizioniNormativa.map(c => PRESCRIZIONI_CODE_MAP[c] || LIMITAZIONI_CODE_MAP[c] || c))}
  </div>` : ''}

  ${tf.limitazioniMansione.length > 0 ? `
  <div class="section">
    <h2>Limitazioni alla Mansione Specifica</h2>
    ${renderMultiChoice(tf.limitazioniMansione.map(c => LIMITAZIONI_CODE_MAP[c] || PRESCRIZIONI_CODE_MAP[c] || c))}
  </div>` : ''}

  ${tf.esamiProssimaVisita ? `
  <div class="section">
    <h2>Esami da Eseguire alla Prossima Visita</h2>
    <div class="text-block">${tf.esamiProssimaVisita}</div>
  </div>` : ''}

  ${g.ricorsoEntro ? `
  <div class="ricorso-box">
    <strong>Diritto di ricorso (Art. 41 c.9 D.Lgs 81/08)</strong><br>
    Il lavoratore o il datore di lavoro possono presentare ricorso avverso il presente giudizio entro il
    <strong>${fmtDate(g.ricorsoEntro)}</strong> all'ASL/ATS territorialmente competente.
  </div>` : ''}

  <div class="firma-section">
    <div class="firma-box">
      Firma del Medico Competente
      ${firmaMedicoDataUrl ? `<br><img src="${firmaMedicoDataUrl}" style="max-height:48px;max-width:160px;object-fit:contain;margin-top:4px;" alt="Firma medico competente">` : '<br><br><br>'}
    </div>
    <div class="firma-box">
      Firma del Lavoratore per ricevuta
      ${(g._firmaLavoratore?.firmaImageUrl && !g._firmaHasPosition) ? `<br><img src="${g._firmaLavoratore.firmaImageUrl}" style="max-height:48px;max-width:160px;object-fit:contain;margin-top:4px;" alt="Firma lavoratore">` : '<br><br><br>'}
    </div>
  </div>

  <div class="gdpr-note">
    Il presente documento contiene dati sensibili ai sensi del Regolamento UE 2016/679 (GDPR) — Art. 9.
    Il trattamento è effettuato ai fini della sorveglianza sanitaria ai sensi dell'Art. 41 D.Lgs 81/08.
    Non divulgare a terzi non autorizzati.
  </div>

  <div class="footer">
    ${tenant?.name ?? ''} — Documento generato il ${fmtDate(new Date())} — D.Lgs 81/08 Art. 41
  </div>
</body></html>`;
}

/**
 * Genera HTML giudizio per il DATORE DI LAVORO (Art. 41 c.7 — senza dati sanitari riservati)
 * @param {Object} g - Giudizio con relazioni
 * @param {Object} tenant - Tenant con nome e logo
 * @param {string|null} firmaMedicoDataUrl - Data URL firma medico (opzionale, inline nel PDF)
 */
function buildDatoreHtml(g, tenant, firmaMedicoDataUrl = null) {
  const col = GIUDIZIO_COLORS[g.tipoGiudizio] || GIUDIZIO_COLORS.IDONEO;
  const personName = `${g.person?.lastName ?? ''} ${g.person?.firstName ?? ''}`.trim();
  const mansione = g.mansioni?.map(m => m.mansione?.denominazione).filter(Boolean).join(', ') || '—';

  // Estrai campi template visita
  const tf = extractVisitaTemplateFields(g.visita);

  // Per il datore: si omettono motivazioni sanitarie, si includono solo prescrizioni operative
  return `${buildSharedHead('Giudizio di Idoneità - Comunicazione al Datore di Lavoro')}

  <div class="header">
    <div class="header-left">
      ${tenant?.logo ? `<img src="${tenant.logo}" alt="${tenant?.name ?? ''}" style="max-height:60px;max-width:180px;object-fit:contain;margin-bottom:8px;">` : ''}
      <h1>Comunicazione Giudizio di Idoneità</h1>
      <p>ai sensi dell'Art. 41 c.7 D.Lgs 81/08 — Comunicazione al Datore di Lavoro</p>
    </div>
    <div class="header-right">
      <strong>${tenant?.name ?? ''}</strong><br>
      Data: ${fmtDate(g.dataEmissione)}<br>
      N° Rif: GI-${g.id.substring(0, 8).toUpperCase()}
    </div>
  </div>

  <div class="badge-box" style="background:${col.bg}; color:${col.text}; border-color:${col.border};">
    <div class="esito-label">${GIUDIZIO_LABELS[g.tipoGiudizio] ?? g.tipoGiudizio}</div>
    ${g.dataScadenza ? `<div style="margin-top:6px;font-size:9pt;">Validità: fino al <strong>${fmtDate(g.dataScadenza)}</strong></div>` : ''}
  </div>

  <div class="section">
    <h2>Dati del Lavoratore</h2>
    <div class="grid">
      <div>
        <div class="field-label">Cognome e Nome</div>
        <div class="field-value">${personName}</div>
      </div>
      <div>
        <div class="field-label">Mansione/i Sorvegliata/e</div>
        <div class="field-value">${mansione}</div>
      </div>
      <div>
        <div class="field-label">Data Visita</div>
        <div class="field-value">${fmtDate(g.visita?.dataOra ?? g.dataEmissione)}</div>
      </div>
      ${g.visita?.tipoVisitaMDL ? `<div><div class="field-label">Tipo Visita</div><div class="field-value">${g.visita.tipoVisitaMDL.replace(/_/g, ' ')}</div></div>` : ''}
    </div>
  </div>

  <div class="section">
    <h2>Medico Competente</h2>
    <div class="grid">
      <div>
        <div class="field-label">Nome</div>
        <div class="field-value">${fmtMedico(g.medicoCompetente)}</div>
      </div>
    </div>
  </div>

  ${g.prescrizioniIdoneita ? `
  <div class="section">
    <h2>Prescrizioni operative</h2>
    <p style="font-size:9pt;color:#6b7280;margin-bottom:8px;font-style:italic;">
      Le seguenti prescrizioni operative sono comunicabili al datore di lavoro ai sensi dell'Art. 41 c.7.
    </p>
    <div class="text-block">${decodeCodesToLabels(g.prescrizioniIdoneita, PRESCRIZIONI_CODE_MAP)}</div>
  </div>` : ''}

  ${g.limitazioni ? `
  <div class="section">
    <h2>Limitazioni operative</h2>
    <p style="font-size:9pt;color:#6b7280;margin-bottom:8px;font-style:italic;">
      Limitazioni da rispettare in ambito lavorativo.
    </p>
    <div class="text-block">${decodeCodesToLabels(g.limitazioni, LIMITAZIONI_CODE_MAP)}</div>
  </div>` : ''}

  ${tf.prescrizioniNormativa.length > 0 ? `
  <div class="section">
    <h2>Prescrizioni ai sensi della Normativa (Art. 41 D.Lgs 81/08)</h2>
    ${renderMultiChoice(tf.prescrizioniNormativa.map(c => PRESCRIZIONI_CODE_MAP[c] || LIMITAZIONI_CODE_MAP[c] || c))}
  </div>` : ''}

  ${tf.limitazioniMansione.length > 0 ? `
  <div class="section">
    <h2>Limitazioni alla Mansione Specifica</h2>
    ${renderMultiChoice(tf.limitazioniMansione.map(c => LIMITAZIONI_CODE_MAP[c] || PRESCRIZIONI_CODE_MAP[c] || c))}
  </div>` : ''}

  ${tf.prescrizioniAzienda.length > 0 ? `
  <div class="section">
    <h2>Prescrizioni per l'Azienda</h2>
    <p style="font-size:9pt;color:#6b7280;margin-bottom:8px;font-style:italic;">
      Disposizioni operative comunicate al datore di lavoro ai sensi dell'Art. 41 c.7 D.Lgs 81/08.
    </p>
    ${renderMultiChoice(tf.prescrizioniAzienda.map(c => PRESCRIZIONI_CODE_MAP[c] || LIMITAZIONI_CODE_MAP[c] || c))}
  </div>` : ''}

  <div class="gdpr-note">
    Ai sensi del GDPR (Reg. UE 2016/679 Art. 9) e dell'Art. 41 c.7 D.Lgs 81/08, il Medico Competente
    comunica al datore di lavoro il giudizio di idoneità del lavoratore alla specifica mansione.
    Le motivazioni di natura strettamente sanitaria non sono comunicate al datore di lavoro.
    Documento da conservare nel fascicolo aziendale. Non divulgare a terzi.
  </div>

  <div class="firma-section">
    <div class="firma-box">
      Firma del Medico Competente
      ${firmaMedicoDataUrl ? `<br><img src="${firmaMedicoDataUrl}" style="max-height:48px;max-width:160px;object-fit:contain;margin-top:4px;" alt="Firma medico competente">` : '<br><br><br>'}
    </div>
    <div class="firma-box">Timbro e firma del Datore di Lavoro<br>(ricevuta)<br><br></div>
  </div>

  <div class="footer">
    ${tenant?.name ?? ''} — Documento generato il ${fmtDate(new Date())} — D.Lgs 81/08 Art. 41 c.7
  </div>
</body></html>`;
}

// ============================================================
// SERVICE
// ============================================================

const GiudizioIdoneitaPdfService = {

  /**
   * Recupera il giudizio con tutte le relazioni necessarie
   */
  async _fetchGiudizio(giudizioId, tenantId) {
    return prisma.giudizioIdoneita.findFirst({
      where: { id: giudizioId, tenantId, deletedAt: null },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            taxCode: true,
            rischiAggiuntivi: {
              where: { tenantId, deletedAt: null },
              select: { codiceRischio: true, descrizioneEsposizione: true }
            },
            tenantProfiles: {
              where: { tenantId, deletedAt: null, isActive: true },
              select: {
                title: true,
                reparto: { select: { nome: true, codice: true } },
                protocolloSanitario: { select: { denominazione: true } }
              },
              take: 1
            }
          }
        },
        medicoCompetente: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            tenantProfiles: {
              where: { tenantId, deletedAt: null, isActive: true },
              select: { registerCode: true },
              take: 1
            }
          }
        },
        mansioni: {
          include: {
            mansione: {
              select: {
                id: true,
                codice: true,
                denominazione: true,
                rischiAssociati: {
                  where: { tenantId, deletedAt: null },
                  select: { codiceRischio: true, descrizioneEsposizione: true }
                },
                protocolli: {
                  where: { tenantId, deletedAt: null, isAttivo: true },
                  select: { denominazione: true }
                },
                protocolliMansione: {
                  select: {
                    protocolloSanitario: {
                      select: { denominazione: true }
                    }
                  }
                },
                site: {
                  select: {
                    siteName: true,
                    indirizzo: true,
                    citta: true,
                    companyTenantProfile: {
                      select: {
                        id: true,
                        company: { select: { ragioneSociale: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        visita: {
          select: {
            id: true,
            dataOra: true,
            tipoVisitaMDL: true,
            datiStrutturati: true,
            prestazione: { select: { nome: true, codice: true } },
            scadenzePrestazioni: {
              where: { tenantId, deletedAt: null },
              select: {
                dataScadenza: true,
                prestazioneId: true
              },
              orderBy: { dataScadenza: 'asc' }
            },
            appuntamento: {
              select: {
                companyTenantProfile: {
                  select: {
                    id: true,
                    company: { select: { ragioneSociale: true } }
                  }
                },
                prestazioni: {
                  select: {
                    prestazione: { select: { nome: true, codice: true } }
                  }
                }
              }
            },
            visitTemplate: {
              select: {
                id: true,
                fields: true
              }
            }
          }
        },
        tenant: { select: { id: true, name: true, settings: true } }
      }
    });
  },

  /**
   * Recupera la firma del lavoratore per un giudizio (se presente)
   */
  async _fetchFirmaLavoratore(giudizioId, tenantId) {
    return prisma.firmaDigitale.findFirst({
      where: {
        documentoId: giudizioId,
        documentType: 'GIUDIZIO_IDONEITA',
        firmatarioRole: 'DIPENDENTE',
        tenantId,
        deletedAt: null,
        stato: 'FIRMATO'
      },
      select: { firmaImageUrl: true, createdAt: true, note: true }
    });
  },

  /**
   * Recupera la firma del medico competente per un giudizio (se presente)
   */
  async _fetchFirmaMedico(giudizioId, tenantId) {
    return prisma.firmaDigitale.findFirst({
      where: {
        documentoId: giudizioId,
        documentType: 'GIUDIZIO_IDONEITA',
        firmatarioRole: 'MEDICO_COMPETENTE',
        tenantId,
        deletedAt: null,
        stato: 'FIRMATO'
      },
      select: { firmaImageUrl: true, createdAt: true, note: true }
    });
  },

  /**
   * Applica (stampa) l'immagine della firma sul PDF alla posizione indicata
   * usando pdf-lib. position = { page, x, y, w } normalizzati 0-1.
   *
   * @param {Buffer} pdfBuffer
   * @param {string} firmaImageUrl - data URL (image/png o image/jpeg)
   * @param {{page:number,x:number,y:number,w:number}} position
   * @returns {Promise<Buffer>}
   */
  async _stampSignature(pdfBuffer, firmaImageUrl, position) {
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      if (!pages.length) return pdfBuffer;

      const pageIndex = Math.min(Math.max(0, position.page || 0), pages.length - 1);
      const page = pages[pageIndex];
      const { width: pw, height: ph } = page.getSize();

      // Estrai base64 dal data URL
      const match = /^data:(image\/(png|jpeg|jpg));base64,(.+)$/i.exec(firmaImageUrl || '');
      if (!match) return pdfBuffer;
      const isPng = /png/i.test(match[1]);
      const bytes = Buffer.from(match[3], 'base64');
      const img = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

      // Larghezza firma come frazione della pagina, altezza proporzionale
      const drawW = pw * (position.w || 0.25);
      const drawH = drawW * (img.height / img.width);
      // x,y normalizzati dall'angolo in alto a sinistra → pdf-lib usa origine in basso a sinistra
      const x = pw * position.x;
      const yTop = ph * position.y;
      const y = ph - yTop - drawH;

      page.drawImage(img, { x, y, width: drawW, height: drawH });
      const out = await pdfDoc.save();
      return Buffer.from(out);
    } catch (err) {
      logger.warn({ error: err.message }, 'Stamping firma su PDF fallito, uso PDF originale');
      return pdfBuffer;
    }
  },

  /**
   * Genera buffer PDF per un giudizio
   *
   * @param {string} giudizioId
   * @param {'lavoratore'|'datore'} destinatario
   * @param {string} tenantId
   * @returns {Promise<{ buffer: Buffer, filename: string, html: string }>}
   */
  async generate(giudizioId, destinatario, tenantId) {
    const [g, firmaLavoratore, firmaMedico] = await Promise.all([
      this._fetchGiudizio(giudizioId, tenantId),
      this._fetchFirmaLavoratore(giudizioId, tenantId),
      this._fetchFirmaMedico(giudizioId, tenantId)
    ]);
    if (!g) throw new Error(`GiudizioIdoneita ${giudizioId} non trovato`);

    const ts = g.tenant?.settings || {};
    const tenant = { name: g.tenant?.name ?? '', logo: resolveFirstValidLogo(ts.branches?.MDL?.logo, ts.branches?.MEDICA?.logo, ts.branches?.FORMAZIONE?.logo, ts.logoUrl, ts.logo) };
    const firmaMedicoDataUrl = firmaMedico?.firmaImageUrl || null;

    let html;
    if (destinatario === 'datore') {
      html = buildDatoreHtml(g, tenant, firmaMedicoDataUrl);
    } else {
      // Firma lavoratore: posizione = stampa con pdf-lib; nessuna posizione = inline nell'HTML
      const firmaPos = parseFirmaPosition(firmaLavoratore);
      if (firmaLavoratore) { g._firmaLavoratore = firmaLavoratore; g._firmaHasPosition = !!firmaPos; }
      html = buildLavoratoreHtml(g, tenant, firmaMedicoDataUrl);

      let buffer = await pdfService.generatePDF(html, {
        format: 'A4',
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
        printBackground: true
      });
      if (firmaPos && firmaLavoratore?.firmaImageUrl) {
        buffer = await this._stampSignature(buffer, firmaLavoratore.firmaImageUrl, firmaPos);
      }
      const personName = `${g.person?.lastName ?? 'lavoratore'}_${g.person?.firstName ?? ''}`.replace(/\s+/g, '_');
      const dateStr = new Date(g.dataEmissione).toISOString().slice(0, 10);
      const filename = `giudizio-idoneita_lavoratore_${personName}_${dateStr}.pdf`;
      return { buffer, filename, html };
    }

    let buffer = await pdfService.generatePDF(html, {
      format: 'A4',
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      printBackground: true
    });

    const personName = `${g.person?.lastName ?? 'lavoratore'}_${g.person?.firstName ?? ''}`.replace(/\s+/g, '_');
    const dateStr = new Date(g.dataEmissione).toISOString().slice(0, 10);
    const filename = `giudizio-idoneita_datore_${personName}_${dateStr}.pdf`;

    return { buffer, filename, html };
  },

  /**
   * Genera ENTRAMBI i PDF, li salva su disco e aggiorna il record GiudizioIdoneita
   *
   * @param {string} giudizioId
   * @param {string} tenantId
   * @returns {Promise<{ pdfLavoratoreUrl: string, pdfDatoreUrl: string }>}
   */
  async generateAndStore(giudizioId, tenantId) {
    const [g, firmaLavoratore, firmaMedico] = await Promise.all([
      this._fetchGiudizio(giudizioId, tenantId),
      this._fetchFirmaLavoratore(giudizioId, tenantId),
      this._fetchFirmaMedico(giudizioId, tenantId)
    ]);
    if (!g) throw new Error(`GiudizioIdoneita ${giudizioId} non trovato`);

    const firmaPos = parseFirmaPosition(firmaLavoratore);
    if (firmaLavoratore) { g._firmaLavoratore = firmaLavoratore; g._firmaHasPosition = !!firmaPos; }

    const firmaMedicoDataUrl = firmaMedico?.firmaImageUrl || null;

    // Assicura cartella uploads
    const dir = path.join(UPLOADS_BASE, tenantId);
    await fs.mkdir(dir, { recursive: true });

    const ts = g.tenant?.settings || {};
    const tenant = { name: g.tenant?.name ?? '', logo: resolveFirstValidLogo(ts.branches?.MDL?.logo, ts.branches?.MEDICA?.logo, ts.branches?.FORMAZIONE?.logo, ts.logoUrl, ts.logo) };
    const dateStr = new Date(g.dataEmissione).toISOString().slice(0, 10);
    const personSlug = `${g.person?.lastName ?? 'lavoratore'}_${g.person?.firstName ?? ''}`.replace(/\s+/g, '_');
    const idSlug = g.id.substring(0, 8);

    // ── Copia LAVORATORE ─────────────────────────────────────────────────────
    // HTML completo con dati sanitari + firma lavoratore inline (se no posizione) + firma medico
    const htmlLav = buildLavoratoreHtml(g, tenant, firmaMedicoDataUrl);
    let bufLav = await pdfService.generatePDF(htmlLav, {
      format: 'A4', margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }, printBackground: true
    });
    // Stampa firma lavoratore a posizione specifica (pdf-lib) se posizionata dal workflow firma
    if (firmaPos && firmaLavoratore?.firmaImageUrl) {
      bufLav = await this._stampSignature(bufLav, firmaLavoratore.firmaImageUrl, firmaPos);
    }
    const lavFilename = `giudizio_lavoratore_${personSlug}_${dateStr}_${idSlug}.pdf`;
    await fs.writeFile(path.join(dir, lavFilename), bufLav);
    const pdfLavoratoreUrl = `/uploads/giudizi-idoneita/${tenantId}/${lavFilename}`;

    // ── Copia DATORE DI LAVORO ───────────────────────────────────────────────
    // HTML ridotto senza dati sanitari (GDPR Art. 9) + firma medico inline
    const htmlDat = buildDatoreHtml(g, tenant, firmaMedicoDataUrl);
    const bufDat = await pdfService.generatePDF(htmlDat, {
      format: 'A4', margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }, printBackground: true
    });
    const datFilename = `giudizio_datore_${personSlug}_${dateStr}_${idSlug}.pdf`;
    await fs.writeFile(path.join(dir, datFilename), bufDat);
    const pdfDatoreUrl = `/uploads/giudizi-idoneita/${tenantId}/${datFilename}`;

    // Aggiorna record DB
    await prisma.giudizioIdoneita.update({
      where: { id: giudizioId },
      data: {
        pdfLavoratoreUrl,
        pdfDatoreUrl,
        pdfGeneratoAt: new Date()
      }
    });

    logger.info({ giudizioId, pdfLavoratoreUrl, pdfDatoreUrl, tenantId }, 'PDF Giudizio Idoneità generati (lavoratore + datore separati)');

    return { pdfLavoratoreUrl, pdfDatoreUrl };
  }
};

export default GiudizioIdoneitaPdfService;
