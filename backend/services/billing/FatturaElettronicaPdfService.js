/**
 * FatturaElettronicaPdfService
 *
 * Genera il PDF di una FatturaElettronica usando il template HTML professionale.
 * Utilizza pdfService (Puppeteer) già presente nel progetto.
 *
 * Pattern:
 *  1. Carica fattura con linee + ente emittente + tenant settings
 *  2. Renderizza template HTML con dati reali (logo, denominazioni, righe, totali)
 *  3. Genera PDF via pdfService.generatePDF()
 *  4. Restituisce Buffer pronto per download/allegato email
 *
 * @module services/billing/FatturaElettronicaPdfService
 * @project P97 - Fatturazione Elettronica
 */

import prisma from '../../config/prisma-optimization.js';
import pdfService from '../pdfService.js';
import logger from '../../utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';

// Percorso cartella public del progetto (per accesso loghi in PDF Puppeteer)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DIR = join(__dirname, '../../../public');

/**
 * Converte un path relativo /assets/logos/... in data-URL base64
 * Necessario per Puppeteer che non ha accesso al file system del server
 */
function logoToDataUrl(relativePath) {
  if (!relativePath) return '';
  if (relativePath.startsWith('data:')) return relativePath;

  let effectivePath = relativePath;
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    try {
      const url = new URL(relativePath);
      const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '0.0.0.0';
      if (isLocal) { effectivePath = url.pathname; } else { return relativePath; }
    } catch { return relativePath; }
  }

  const cleanPath = effectivePath.startsWith('/') ? effectivePath.slice(1) : effectivePath;
  const BACKEND_DIR = join(__dirname, '..', '..');
  const tryPaths = [join(PUBLIC_DIR, cleanPath), join(BACKEND_DIR, cleanPath), join(BACKEND_DIR, 'public', cleanPath)];

  for (const p of tryPaths) {
    if (existsSync(p)) {
      try {
        const data = readFileSync(p);
        const ext = p.split('.').pop().toLowerCase();
        const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/svg+xml';
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

// ============================================================================
// FORMATTATORI
// ============================================================================

function formatCurrency(val) {
  const n = Number(val) || 0;
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPercent(val) {
  const n = Number(val) || 0;
  return `${n.toFixed(2)}%`;
}

// Mappa tipoDocumento → etichetta italiana
const TIPO_DOCUMENTO_LABEL = {
  FATTURA: 'FATTURA',
  ACCONTO: 'FATTURA ACCONTO',
  NOTA_CREDITO: 'NOTA DI CREDITO',
  NOTA_DEBITO: 'NOTA DI DEBITO',
  AUTOFATTURA: 'AUTOFATTURA',
};

// Mappa modalitaPagamento → etichetta
const MODALITA_PAGAMENTO_LABEL = {
  MP01: 'Contanti',
  MP02: 'Assegno',
  MP05: 'Bonifico bancario',
  MP07: 'Bollettino bancario',
  MP08: 'Carta di pagamento',
  MP12: 'RIBA',
  MP19: 'SEPA Direct Debit',
};

// ============================================================================
// TEMPLATE HTML
// ============================================================================

function buildHtml(fattura, tenantSettings) {
  const logoUrl = tenantSettings?.logoUrl || '';
  const tenantName = tenantSettings?.name || fattura.cedenteDenominazione;
  const tipoLabel = TIPO_DOCUMENTO_LABEL[fattura.tipoDocumento] || 'FATTURA';
  const modalita = MODALITA_PAGAMENTO_LABEL[fattura.modalitaPagamento] || fattura.modalitaPagamento || '—';

  // Righe fattura
  const righeHtml = (fattura.linee || [])
    .sort((a, b) => a.numeroLinea - b.numeroLinea)
    .map(l => `
      <tr>
        <td class="text-left">${escapeHtml(l.descrizione)}</td>
        <td class="text-right">${Number(l.quantita).toFixed(2)}</td>
        <td class="text-right">${l.unitaMisura || 'cad'}</td>
        <td class="text-right">${formatCurrency(l.prezzoUnitario)}</td>
        <td class="text-right">${l.natura ? `Esente ${l.natura}` : formatPercent(l.aliquotaIva)}</td>
        <td class="text-right">${formatCurrency(l.prezzoTotale)}</td>
      </tr>
    `)
    .join('');

  // Riepilogo IVA per aliquote
  const riepilogoIva = buildRiepilogoIva(fattura.linee || []);
  const riepilogoHtml = riepilogoIva.map(r => `
    <tr>
      <td>${r.natura ? `Esente ${r.natura}` : `IVA ${r.aliquota}%`}</td>
      <td class="text-right">${formatCurrency(r.imponibile)}</td>
      <td class="text-right">${formatCurrency(r.imposta)}</td>
    </tr>
  `).join('');

  // Bollo virtuale
  const bolloHtml = fattura.bolloVirtuale && Number(fattura.importoBollo) > 0 ? `
    <tr class="bollo-row">
      <td colspan="2">Imposta di bollo virtuale (art. 6 Tab. All. B DPR 642/72)</td>
      <td class="text-right">${formatCurrency(fattura.importoBollo)}</td>
    </tr>
  ` : '';

  // Nota credito
  const notaCreditoHtml = fattura.tipoDocumento === 'NOTA_CREDITO' && fattura.fatturaOrigine ? `
    <div class="nota-credito-ref">
      <strong>Nota di credito a storno della fattura n. ${escapeHtml(fattura.fatturaOrigine.numero || '')}
      del ${formatDate(fattura.fatturaOrigine.dataEmissione)}</strong>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tipoLabel} ${escapeHtml(fattura.numero)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 10pt;
      color: #1a1a2e;
      background: #fff;
      padding: 30px 40px;
    }

    /* HEADER */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
      border-bottom: 3px solid #0d9488;
      padding-bottom: 20px;
    }
    .header-left .logo {
      max-height: 70px;
      max-width: 220px;
      object-fit: contain;
      margin-bottom: 8px;
    }
    .cedente {
      font-size: 9pt;
      color: #555;
      line-height: 1.6;
    }
    .cedente .nome {
      font-size: 13pt;
      font-weight: 700;
      color: #1a1a2e;
      display: block;
      margin-bottom: 2px;
    }
    .header-right {
      text-align: right;
    }
    .doc-tipo {
      font-size: 20pt;
      font-weight: 800;
      color: #0d9488;
      letter-spacing: 1px;
    }
    .doc-numero {
      font-size: 13pt;
      font-weight: 600;
      color: #1a1a2e;
      margin-top: 4px;
    }
    .doc-data {
      font-size: 9pt;
      color: #777;
      margin-top: 4px;
    }

    /* PARTI */
    .parti {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    .parte-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px 16px;
    }
    .parte-label {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #0d9488;
      margin-bottom: 8px;
    }
    .parte-nome {
      font-size: 11pt;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 4px;
    }
    .parte-dettagli {
      font-size: 8.5pt;
      color: #555;
      line-height: 1.7;
    }

    ${notaCreditoHtml ? `
    .nota-credito-ref {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 16px;
      font-size: 9pt;
      color: #92400e;
    }
    ` : ''}

    /* TABELLA RIGHE */
    .section-title {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #0d9488;
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    table thead th {
      background: #0d9488;
      color: #fff;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 7px 10px;
    }
    table tbody td {
      padding: 7px 10px;
      font-size: 9pt;
      border-bottom: 1px solid #f0f4f8;
      vertical-align: top;
    }
    table tbody tr:last-child td { border-bottom: none; }
    table tbody tr:nth-child(even) { background: #f8fafc; }
    .text-right { text-align: right; }
    .text-left  { text-align: left; }
    .text-center { text-align: center; }

    /* TOTALI */
    .totali-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .totali-box {
      width: 320px;
    }
    .totali-box table thead th {
      font-size: 7.5pt;
    }
    .totali-rigo {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #f0f4f8;
      font-size: 9pt;
    }
    .totali-rigo.grand-total {
      border-top: 2px solid #0d9488;
      border-bottom: none;
      padding-top: 8px;
      margin-top: 4px;
      font-size: 12pt;
      font-weight: 800;
      color: #0d9488;
    }
    .bollo-row td { background: #fffbeb; font-style: italic; font-size: 8.5pt; }

    /* PAGAMENTO */
    .pagamento-box {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 24px;
    }
    .pagamento-label {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #16a34a;
      margin-bottom: 8px;
    }
    .pagamento-dettagli {
      font-size: 9pt;
      color: #1a1a2e;
      line-height: 1.7;
    }
    .pagamento-dettagli strong { color: #15803d; }

    /* NOTE */
    .note-box {
      background: #f8fafc;
      border-left: 3px solid #0d9488;
      padding: 10px 14px;
      margin-bottom: 24px;
      font-size: 8.5pt;
      color: #555;
      line-height: 1.6;
    }

    /* FOOTER */
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #999;
    }
    .footer .regime {
      font-style: italic;
    }
    .acube-status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 7.5pt;
      font-weight: 600;
      margin-left: 8px;
    }
    .status-EMESSA, .status-DELIVERED { background:#d1fae5; color:#065f46; }
    .status-BOZZA { background:#f3f4f6; color:#6b7280; }
    .status-WAITING, .status-SENT { background:#fef9c3; color:#854d0e; }
    .status-REJECTED { background:#fee2e2; color:#991b1b; }
    .status-ANNULLATA, .status-STORNATA { background:#fee2e2; color:#991b1b; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      ${logoUrl
      ? `<img src="${logoUrl}" class="logo" alt="${escapeHtml(tenantName)}">`
      : `<div style="font-size:16pt;font-weight:800;color:#0d9488;">${escapeHtml(tenantName)}</div>`
    }
      <div class="cedente">
        <span class="nome">${escapeHtml(fattura.cedenteDenominazione)}</span>
        ${fattura.cedentePIVA ? `P.IVA: ${escapeHtml(fattura.cedentePIVA)}<br>` : ''}
        CF: ${escapeHtml(fattura.cedenteCF)}<br>
        ${escapeHtml(fattura.cedenteIndirizzo)}, ${escapeHtml(fattura.cedenteCitta)} (${escapeHtml(fattura.cedenteProvincia)}) ${escapeHtml(fattura.cedenteCAP)}<br>
        Regime fiscale: ${escapeHtml(fattura.cedenteRegimeFiscale)}
      </div>
    </div>
    <div class="header-right">
      <div class="doc-tipo">${tipoLabel}
        <span class="acube-status status-${fattura.stato}">${fattura.stato}</span>
      </div>
      <div class="doc-numero">N. ${escapeHtml(fattura.numero)}</div>
      <div class="doc-data">Data emissione: ${formatDate(fattura.dataEmissione)}</div>
      ${fattura.dataScadenza ? `<div class="doc-data">Scadenza: ${formatDate(fattura.dataScadenza)}</div>` : ''}
    </div>
  </div>

  ${notaCreditoHtml}

  <!-- PARTI -->
  <div class="parti">
    <div class="parte-box">
      <div class="parte-label">Cedente / Prestatore</div>
      <div class="parte-nome">${escapeHtml(fattura.cedenteDenominazione)}</div>
      <div class="parte-dettagli">
        ${fattura.cedentePIVA ? `P.IVA: ${escapeHtml(fattura.cedentePIVA)}<br>` : ''}
        CF: ${escapeHtml(fattura.cedenteCF)}<br>
        ${escapeHtml(fattura.cedenteIndirizzo)}, ${escapeHtml(fattura.cedenteCitta)} (${escapeHtml(fattura.cedenteProvincia)}) ${escapeHtml(fattura.cedenteCAP)}
      </div>
    </div>
    <div class="parte-box">
      <div class="parte-label">Cessionario / Committente</div>
      <div class="parte-nome">${escapeHtml(fattura.cessionarioDenominazione)}</div>
      <div class="parte-dettagli">
        ${fattura.cessionarioPIVA ? `P.IVA: ${escapeHtml(fattura.cessionarioPIVA)}<br>` : ''}
        ${fattura.cessionarioCF ? `CF: ${escapeHtml(fattura.cessionarioCF)}<br>` : ''}
        ${fattura.cessionarioIndirizzo ? `${escapeHtml(fattura.cessionarioIndirizzo)}` : ''}
        ${fattura.cessionarioCitta ? `, ${escapeHtml(fattura.cessionarioCitta)}` : ''}
        ${fattura.cessionarioProvincia ? ` (${escapeHtml(fattura.cessionarioProvincia)})` : ''}
        ${fattura.cessionarioCAP ? ` ${escapeHtml(fattura.cessionarioCAP)}` : ''}
        ${fattura.cessionarioSDI ? `<br>Codice SDI: ${escapeHtml(fattura.cessionarioSDI)}` : ''}
        ${fattura.cessionarioPEC ? `<br>PEC: ${escapeHtml(fattura.cessionarioPEC)}` : ''}
      </div>
    </div>
  </div>

  <!-- RIGHE -->
  <div class="section-title">Descrizione prestazioni</div>
  <table>
    <thead>
      <tr>
        <th class="text-left" style="width:40%">Descrizione</th>
        <th class="text-right" style="width:8%">Qtà</th>
        <th class="text-right" style="width:6%">U.M.</th>
        <th class="text-right" style="width:12%">Prezzo unit.</th>
        <th class="text-right" style="width:10%">IVA</th>
        <th class="text-right" style="width:14%">Totale</th>
      </tr>
    </thead>
    <tbody>
      ${righeHtml || '<tr><td colspan="6" class="text-center" style="color:#999;font-style:italic;">Nessuna riga</td></tr>'}
    </tbody>
  </table>

  <!-- TOTALI -->
  <div class="totali-wrapper">
    <div class="totali-box">
      <div class="section-title">Riepilogo IVA</div>
      <table style="margin-bottom:12px;">
        <thead>
          <tr>
            <th class="text-left">Aliquota</th>
            <th class="text-right">Imponibile</th>
            <th class="text-right">Imposta</th>
          </tr>
        </thead>
        <tbody>
          ${riepilogoHtml}
          ${bolloHtml}
        </tbody>
      </table>
      <div class="totali-rigo">
        <span>Imponibile</span>
        <span>${formatCurrency(fattura.imponibile)}</span>
      </div>
      <div class="totali-rigo">
        <span>IVA</span>
        <span>${formatCurrency(fattura.importoIva)}</span>
      </div>
      ${fattura.bolloVirtuale && Number(fattura.importoBollo) > 0 ? `
      <div class="totali-rigo">
        <span>Bollo virtuale</span>
        <span>${formatCurrency(fattura.importoBollo)}</span>
      </div>
      ` : ''}
      <div class="totali-rigo grand-total">
        <span>TOTALE</span>
        <span>${formatCurrency(fattura.totale)}</span>
      </div>
    </div>
  </div>

  <!-- PAGAMENTO -->
  <div class="pagamento-box">
    <div class="pagamento-label">Condizioni di pagamento</div>
    <div class="pagamento-dettagli">
      <strong>Modalità:</strong> ${escapeHtml(modalita)}<br>
      ${fattura.dataScadenza ? `<strong>Entro il:</strong> ${formatDate(fattura.dataScadenza)}<br>` : ''}
      ${fattura.iban ? `<strong>IBAN:</strong> ${escapeHtml(fattura.iban)}<br>` : ''}
      ${tipoLabel === 'FATTURA' && fattura.disagioPsicologico
      ? `<em>Prestazione esente IVA ex art. 10 n.18 DPR 633/72 – finalità terapeutica per disagio psicologico certificato</em>`
      : ''}
    </div>
  </div>

  <!-- NOTE -->
  ${fattura.note ? `
  <div class="note-box">
    <strong>Note:</strong> ${escapeHtml(fattura.note)}
  </div>
  ` : ''}

  <!-- AcubeAPI / SDI info -->
  ${fattura.acubeUuid ? `
  <div style="font-size:7.5pt;color:#aaa;margin-bottom:16px;">
    SDI – UUID AcubeAPI: ${escapeHtml(fattura.acubeUuid)} | Stato SDI: ${escapeHtml(fattura.acubeStatus || '—')}
    ${fattura.acubeLastSync ? ` | Ultimo aggiornamento: ${formatDate(fattura.acubeLastSync)}` : ''}
  </div>
  ` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <div class="regime">
      Regime fiscale: ${escapeHtml(fattura.cedenteRegimeFiscale)}
      ${fattura.cedenteRegimeFiscale === 'RF19' ? ' – Forfettario: operazione senza applicazione dell\'IVA ai sensi dell\'art.1, cc.54-89, L.190/2014' : ''}
    </div>
    <div>
      Documento generato il ${formatDate(new Date())}
    </div>
  </div>

</body>
</html>`;
}

// ============================================================================
// RIEPILOGO IVA
// ============================================================================

function buildRiepilogoIva(linee) {
  const map = new Map();
  for (const l of linee) {
    const key = l.natura || String(Number(l.aliquotaIva));
    const row = map.get(key) || { aliquota: Number(l.aliquotaIva), natura: l.natura || null, imponibile: 0, imposta: 0 };
    const imponibile = round2(Number(l.quantita ?? 1) * Number(l.prezzoUnitario));
    const imposta = round2(imponibile * (Number(l.aliquotaIva) / 100));
    row.imponibile = round2(row.imponibile + imponibile);
    row.imposta = round2(row.imposta + imposta);
    map.set(key, row);
  }
  return Array.from(map.values());
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================================
// API PUBBLICA
// ============================================================================

/**
 * Genera il PDF di una FatturaElettronica.
 *
 * @param {string} fatturaId
 * @param {string} tenantId
 * @returns {Promise<{ buffer: Buffer, filename: string }>}
 */
export async function generateFatturaPdf(fatturaId, tenantId) {
  // 1. Carica fattura
  const fattura = await prisma.fatturaElettronica.findFirst({
    where: { id: fatturaId, tenantId, deletedAt: null },
    include: {
      linee: { orderBy: { numeroLinea: 'asc' } },
      enteEmittente: { select: { denominazione: true, email: true, pec: true } },
      fatturaOrigine: { select: { numero: true, dataEmissione: true } },
    },
  });

  if (!fattura) {
    throw new Error('Fattura non trovata');
  }

  // 2. Carica settings tenant per logo
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, deletedAt: null },
    select: { name: true, settings: true },
  });

  const ts = (tenant?.settings && typeof tenant.settings === 'object') ? tenant.settings : {};

  const tenantSettings = {
    name: tenant?.name || '',
    // Converte il path relativo in data-URL base64 per Puppeteer
    logoUrl: resolveFirstValidLogo(ts.branches?.MEDICA?.logo, ts.branches?.FORMAZIONE?.logo, ts.logoUrl, ts.logo),
  };

  // 3. Genera HTML
  const html = buildHtml(fattura, tenantSettings);

  // 4. Genera PDF via pdfService (Puppeteer)
  const buffer = await pdfService.generatePDF(html, {
    format: 'A4',
    margin: { top: '10mm', bottom: '15mm', left: '10mm', right: '10mm' },
    printBackground: true,
  });

  const tipo = fattura.tipoDocumento === 'NOTA_CREDITO' ? 'NC' : 'FT';
  const filename = `${tipo}_${fattura.numero.replace(/\//g, '-')}_${new Date().getFullYear()}.pdf`;

  logger.info('[FatturaElettronicaPdfService] PDF generato', {
    fatturaId,
    numero: fattura.numero,
    tenantId,
    filename,
  });

  return { buffer, filename, fattura };
}
