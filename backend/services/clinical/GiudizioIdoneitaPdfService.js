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
  IDONEO_CON_PRESCRIZIONI: 'IDONEO CON PRESCRIZIONI',
  IDONEO_CON_LIMITAZIONI: 'IDONEO CON LIMITAZIONI',
  TEMPORANEAMENTE_NON_IDONEO: 'TEMPORANEAMENTE NON IDONEO',
  NON_IDONEO: 'NON IDONEO'
};

const GIUDIZIO_COLORS = {
  IDONEO: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  IDONEO_CON_PRESCRIZIONI: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  IDONEO_CON_LIMITAZIONI: { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  TEMPORANEAMENTE_NON_IDONEO: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  NON_IDONEO: { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' }
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMedico(p) {
  if (!p) return '—';
  const title = p.gender === 'FEMALE' ? 'Dott.ssa' : 'Dott.';
  return `${title} ${p.firstName} ${p.lastName}`;
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
 */
function buildLavoratoreHtml(g, tenant) {
  const col = GIUDIZIO_COLORS[g.tipoGiudizio] || GIUDIZIO_COLORS.IDONEO;
  const personName = `${g.person?.lastName ?? ''} ${g.person?.firstName ?? ''}`.trim();
  const mansione = g.mansioni?.map(m => m.mansione?.denominazione).filter(Boolean).join(', ') || '—';

  // Estrai campi template visita
  const tf = extractVisitaTemplateFields(g.visita);

  return `${buildSharedHead('Giudizio di Idoneità - Copia Lavoratore')}

  <div class="header">
    <div class="header-left">
      ${tenant?.logo ? `<img src="${tenant.logo}" alt="${tenant?.name ?? ''}" style="max-height:60px;max-width:180px;object-fit:contain;margin-bottom:8px;">` : ''}
      <h1>Giudizio di Idoneità alla Mansione</h1>
      <p>ai sensi dell'Art. 41 c.6 D.Lgs 81/08 — Copia per il Lavoratore</p>
    </div>
    <div class="header-right">
      <strong>${tenant?.name ?? ''}</strong><br>
      Data emissione: ${fmtDate(g.dataEmissione)}<br>
      N° Rif: GI-${g.id.substring(0, 8).toUpperCase()}
    </div>
  </div>

  <div class="badge-box" style="background:${col.bg}; color:${col.text}; border-color:${col.border};">
    <div class="esito-label">${GIUDIZIO_LABELS[g.tipoGiudizio] ?? g.tipoGiudizio}</div>
    ${g.dataScadenza ? `<div style="margin-top:6px;font-size:9pt;">Valido fino al: <strong>${fmtDate(g.dataScadenza)}</strong></div>` : ''}
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
        <div class="field-label">Data Visita</div>
        <div class="field-value">${fmtDate(g.visita?.dataOra ?? g.dataEmissione)}</div>
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
      ${g.visita?.tipoVisitaMDL ? `<div><div class="field-label">Tipo Visita</div><div class="field-value">${g.visita.tipoVisitaMDL.replace(/_/g, ' ')}</div></div>` : ''}
    </div>
  </div>

  ${g.prescrizioniIdoneita ? `
  <div class="section">
    <h2>Prescrizioni</h2>
    <div class="text-block">${g.prescrizioniIdoneita}</div>
  </div>` : ''}

  ${g.limitazioni ? `
  <div class="section">
    <h2>Limitazioni</h2>
    <div class="text-block">${g.limitazioni}</div>
  </div>` : ''}

  ${g.motivazioni ? `
  <div class="section">
    <h2>Motivazioni</h2>
    <div class="text-block">${g.motivazioni}</div>
  </div>` : ''}

  ${tf.prescrizioniNormativa.length > 0 ? `
  <div class="section">
    <h2>Prescrizioni ai sensi della Normativa (Art. 41 D.Lgs 81/08)</h2>
    ${renderMultiChoice(tf.prescrizioniNormativa)}
  </div>` : ''}

  ${tf.limitazioniMansione.length > 0 ? `
  <div class="section">
    <h2>Limitazioni alla Mansione Specifica</h2>
    ${renderMultiChoice(tf.limitazioniMansione)}
  </div>` : ''}

  ${tf.prescrizioniFollowUp ? `
  <div class="section">
    <h2>Prescrizioni e Indicazioni Follow-up</h2>
    <div class="text-block">${tf.prescrizioniFollowUp}</div>
  </div>` : ''}

  ${tf.esamiProssimaVisita ? `
  <div class="section">
    <h2>Esami da Eseguire alla Prossima Visita</h2>
    <div class="text-block">${tf.esamiProssimaVisita}</div>
  </div>` : ''}

  ${tf.periodicita ? `
  <div class="section">
    <h2>Periodicità Sorveglianza Sanitaria</h2>
    <div class="field-value">${tf.periodicita}</div>
  </div>` : ''}

  ${g.ricorsoEntro ? `
  <div class="ricorso-box">
    <strong>Diritto di ricorso (Art. 41 c.9 D.Lgs 81/08)</strong><br>
    Il lavoratore può presentare ricorso avverso il presente giudizio entro il
    <strong>${fmtDate(g.ricorsoEntro)}</strong> all'Organo di Vigilanza territorialmente competente.
  </div>` : ''}

  <div class="firma-section">
    <div class="firma-box">Firma del Medico Competente<br><br><br></div>
    <div class="firma-box">Firma del Lavoratore per ricevuta<br><br><br></div>
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
 */
function buildDatoreHtml(g, tenant) {
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
    <div class="text-block">${g.prescrizioniIdoneita}</div>
  </div>` : ''}

  ${g.limitazioni ? `
  <div class="section">
    <h2>Limitazioni operative</h2>
    <p style="font-size:9pt;color:#6b7280;margin-bottom:8px;font-style:italic;">
      Limitazioni da rispettare in ambito lavorativo.
    </p>
    <div class="text-block">${g.limitazioni}</div>
  </div>` : ''}

  ${tf.prescrizioniNormativa.length > 0 ? `
  <div class="section">
    <h2>Prescrizioni ai sensi della Normativa (Art. 41 D.Lgs 81/08)</h2>
    ${renderMultiChoice(tf.prescrizioniNormativa)}
  </div>` : ''}

  ${tf.limitazioniMansione.length > 0 ? `
  <div class="section">
    <h2>Limitazioni alla Mansione Specifica</h2>
    ${renderMultiChoice(tf.limitazioniMansione)}
  </div>` : ''}

  ${tf.prescrizioniAzienda.length > 0 ? `
  <div class="section">
    <h2>Prescrizioni per l'Azienda</h2>
    <p style="font-size:9pt;color:#6b7280;margin-bottom:8px;font-style:italic;">
      Disposizioni operative comunicate al datore di lavoro ai sensi dell'Art. 41 c.7 D.Lgs 81/08.
    </p>
    ${renderMultiChoice(tf.prescrizioniAzienda)}
  </div>` : ''}

  <div class="gdpr-note">
    Ai sensi del GDPR (Reg. UE 2016/679 Art. 9) e dell'Art. 41 c.7 D.Lgs 81/08, il Medico Competente
    comunica al datore di lavoro il giudizio di idoneità del lavoratore alla specifica mansione.
    Le motivazioni di natura strettamente sanitaria non sono comunicate al datore di lavoro.
    Documento da conservare nel fascicolo aziendale. Non divulgare a terzi.
  </div>

  <div class="firma-section">
    <div class="firma-box">Firma del Medico Competente<br><br><br></div>
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
        person: { select: { id: true, firstName: true, lastName: true, taxCode: true } },
        medicoCompetente: { select: { id: true, firstName: true, lastName: true, gender: true } },
        mansioni: { include: { mansione: { select: { id: true, codice: true, denominazione: true } } } },
        visita: {
          select: {
            id: true,
            dataOra: true,
            tipoVisitaMDL: true,
            datiStrutturati: true,
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
   * Genera buffer PDF per un giudizio
   *
   * @param {string} giudizioId
   * @param {'lavoratore'|'datore'} destinatario
   * @param {string} tenantId
   * @returns {Promise<{ buffer: Buffer, filename: string, html: string }>}
   */
  async generate(giudizioId, destinatario, tenantId) {
    const g = await this._fetchGiudizio(giudizioId, tenantId);
    if (!g) throw new Error(`GiudizioIdoneita ${giudizioId} non trovato`);

    const ts = g.tenant?.settings || {};
    const tenant = { name: g.tenant?.name ?? '', logo: resolveFirstValidLogo(ts.branches?.MEDICA?.logo, ts.branches?.FORMAZIONE?.logo, ts.logoUrl, ts.logo) };
    const html = destinatario === 'lavoratore'
      ? buildLavoratoreHtml(g, tenant)
      : buildDatoreHtml(g, tenant);

    const buffer = await pdfService.generatePDF(html, {
      format: 'A4',
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      printBackground: true
    });

    const personName = `${g.person?.lastName ?? 'lavoratore'}_${g.person?.firstName ?? ''}`.replace(/\s+/g, '_');
    const dateStr = new Date(g.dataEmissione).toISOString().slice(0, 10);
    const tipo = destinatario === 'lavoratore' ? 'copia-lavoratore' : 'datore-lavoro';
    const filename = `giudizio-idoneita_${tipo}_${personName}_${dateStr}.pdf`;

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
    const g = await this._fetchGiudizio(giudizioId, tenantId);
    if (!g) throw new Error(`GiudizioIdoneita ${giudizioId} non trovato`);

    // Assicura cartella uploads
    const dir = path.join(UPLOADS_BASE, tenantId);
    await fs.mkdir(dir, { recursive: true });

    const ts = g.tenant?.settings || {};
    const tenant = { name: g.tenant?.name ?? '', logo: resolveFirstValidLogo(ts.branches?.MEDICA?.logo, ts.branches?.FORMAZIONE?.logo, ts.logoUrl, ts.logo) };
    const dateStr = new Date(g.dataEmissione).toISOString().slice(0, 10);
    const personSlug = `${g.person?.lastName ?? 'lavoratore'}_${g.person?.firstName ?? ''}`.replace(/\s+/g, '_');

    // Genera lavoratore
    const htmlLav = buildLavoratoreHtml(g, tenant);
    const bufLav = await pdfService.generatePDF(htmlLav, {
      format: 'A4', margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }, printBackground: true
    });
    const lavFilename = `giudizio_lavoratore_${personSlug}_${dateStr}_${g.id.substring(0, 8)}.pdf`;
    const lavPath = path.join(dir, lavFilename);
    await fs.writeFile(lavPath, bufLav);
    const pdfLavoratoreUrl = `/uploads/giudizi-idoneita/${tenantId}/${lavFilename}`;

    // Genera datore
    const htmlDat = buildDatoreHtml(g, tenant);
    const bufDat = await pdfService.generatePDF(htmlDat, {
      format: 'A4', margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }, printBackground: true
    });
    const datFilename = `giudizio_datore_${personSlug}_${dateStr}_${g.id.substring(0, 8)}.pdf`;
    const datPath = path.join(dir, datFilename);
    await fs.writeFile(datPath, bufDat);
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

    logger.info({ giudizioId, pdfLavoratoreUrl, pdfDatoreUrl, tenantId }, 'PDF Giudizio Idoneità generati');

    return { pdfLavoratoreUrl, pdfDatoreUrl };
  }
};

export default GiudizioIdoneitaPdfService;
