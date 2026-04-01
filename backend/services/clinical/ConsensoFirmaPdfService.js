/**
 * ConsensoFirmaPdfService — Generazione PDF del consenso informato firmato
 *
 * Genera un documento PDF firmato dal paziente contenente:
 * - Testi dei consensi accettati
 * - Immagine della firma digitale
 * - Metadati firma (data, nome paziente)
 *
 * @module services/clinical/ConsensoFirmaPdfService
 */

import prisma from '../../config/prisma-optimization.js';
import pdfService from '../pdfService.js';
import ConsensoFirmaService from './ConsensoFirmaService.js';
import { logger } from '../../utils/logger.js';

/**
 * Genera il PDF del consenso firmato per un appuntamento.
 *
 * @param {string} appuntamentoId
 * @param {string} tenantId
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateConsensoFirmaPdf(appuntamentoId, tenantId) {
    // Fetch token AND tenant data in parallel
    const [token, tenant] = await Promise.all([
        prisma.consensoFirmaToken.findFirst({
            where: { appuntamentoId, tenantId, firmatoAt: { not: null } },
            include: {
                appuntamento: {
                    include: {
                        paziente: {
                            select: { id: true, firstName: true, lastName: true, taxCode: true },
                        },
                        ambulatorio: {
                            select: { nome: true },
                        },
                    },
                },
            },
            orderBy: { firmatoAt: 'desc' },
        }),
        prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                name: true,
                selfCompanyProfile: {
                    select: {
                        emailGenerale: true,
                        telefonoGenerale: true,
                        company: {
                            select: {
                                ragioneSociale: true,
                                piva: true,
                                codiceFiscale: true,
                                sedeLegaleIndirizzo: true,
                                sedeLegaleCitta: true,
                                sedeLegaleCap: true,
                                sedeLegaleProvincia: true,
                            },
                        },
                    },
                },
            },
        }),
    ]);

    if (!token) {
        throw new Error('Nessun consenso firmato trovato per questo appuntamento.');
    }

    const documentiTesti = await ConsensoFirmaService.getDocumentiPerIds(
        tenantId,
        token.firmatoConsensi.length > 0 ? token.firmatoConsensi : token.documentiDaMostrare
    );

    const html = buildHtml(token, documentiTesti, tenant);

    return pdfService.generatePDF(html, {
        format: 'A4',
        margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '18mm' },
        printBackground: true,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildHtml(token, documenti, tenant) {
    const paziente = token.appuntamento?.paziente;
    const ambulatorio = token.appuntamento?.ambulatorio;

    const pazienteNome = token.firmatoPazienteNome
        ?? (paziente ? `${paziente.firstName} ${paziente.lastName}` : 'N/D');
    const pazienteCF = paziente?.taxCode ?? '';

    // Tenant / struttura info
    const company = tenant?.selfCompanyProfile?.company;
    const strutturaNome = company?.ragioneSociale ?? tenant?.name ?? 'ElementMedica';
    const strutturaIndirizzo = [
        company?.sedeLegaleIndirizzo,
        company?.sedeLegaleCap,
        company?.sedeLegaleCitta,
        company?.sedeLegaleProvincia && `(${company.sedeLegaleProvincia})`,
    ].filter(Boolean).join(', ');
    const strutturaPIVA = company?.piva ?? '';
    const strutturaEmail = tenant?.selfCompanyProfile?.emailGenerale ?? '';
    const strutturaTel = tenant?.selfCompanyProfile?.telefonoGenerale ?? '';

    const dataFirma = token.firmatoAt
        ? new Date(token.firmatoAt).toLocaleString('it-IT', {
            dateStyle: 'long',
            timeStyle: 'short',
        })
        : 'N/D';

    const moduliHtml = documenti.map(doc => `
        <section class="consent-section">
            <h2 class="consent-title">${escHtml(doc.titolo)}</h2>
            ${doc.sottotitolo ? `<p class="consent-subtitle">${escHtml(doc.sottotitolo)}</p>` : ''}
            <div class="consent-body">${nl2p(doc.testo)}</div>
        </section>
    `).join('');

    const firmaImg = token.firmaImmagine
        ? `<img src="${token.firmaImmagine}" alt="Firma del paziente" class="firma-immagine" />`
        : `<p class="firma-assente">Firma non disponibile</p>`;

    return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<title>Consenso Informato Firmato</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 11pt;
    color: #111;
    line-height: 1.6;
    background: #fff;
  }
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #0d9488;
    padding-bottom: 10px;
    margin-bottom: 20px;
  }
  .page-header .brand {
    font-size: 16pt;
    font-weight: 700;
    color: #0d9488;
  }
  .page-header .subtitle {
    font-size: 9pt;
    color: #6b7280;
    margin-top: 2px;
  }
  .doc-title {
    font-size: 14pt;
    font-weight: 700;
    color: #111827;
    margin-bottom: 4px;
  }
  .meta-box {
    background: #f3f4f6;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 24px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 20px;
    font-size: 10pt;
  }
  .meta-box .label { color: #6b7280; }
  .meta-box .value { font-weight: 600; }
  .consent-section {
    margin-bottom: 28px;
    page-break-inside: avoid;
  }
  .consent-title {
    font-size: 12pt;
    font-weight: 700;
    color: #0d9488;
    border-left: 3px solid #0d9488;
    padding-left: 8px;
    margin-bottom: 4px;
  }
  .consent-subtitle {
    font-size: 9pt;
    color: #6b7280;
    font-style: italic;
    margin-bottom: 8px;
    padding-left: 12px;
  }
  .consent-body {
    font-size: 10pt;
    color: #374151;
  }
  .consent-body p { margin-bottom: 8px; }
  .firma-block {
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    page-break-inside: avoid;
  }
  .firma-title {
    font-size: 11pt;
    font-weight: 700;
    color: #111827;
    margin-bottom: 12px;
  }
  .firma-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: start;
  }
  .firma-immagine {
    max-width: 220px;
    max-height: 100px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: #f9fafb;
    display: block;
  }
  .firma-assente {
    color: #9ca3af;
    font-style: italic;
    font-size: 10pt;
  }
  .firma-details .row {
    font-size: 10pt;
    margin-bottom: 4px;
  }
  .firma-details .row .label { color: #6b7280; }
  .firma-details .row .value { font-weight: 600; }
  .footer {
    margin-top: 40px;
    padding-top: 10px;
    border-top: 1px solid #e5e7eb;
    font-size: 8pt;
    color: #9ca3af;
    text-align: center;
  }
</style>
</head>
<body>

<div class="page-header">
  <div>
    <div class="brand">${escHtml(strutturaNome)}</div>
    <div class="subtitle">${escHtml(ambulatorio?.nome ?? strutturaIndirizzo ?? '')}</div>
    ${strutturaTel || strutturaEmail ? `<div class="contact-line">${[strutturaTel ? `Tel. ${strutturaTel}` : null, strutturaEmail].filter(Boolean).join(' · ')}</div>` : ''}
    ${strutturaPIVA ? `<div class="subtitle">P.IVA ${escHtml(strutturaPIVA)}</div>` : ''}
  </div>
  <div>
    <div class="doc-title">Consenso Informato — Copia Firmata</div>
  </div>
</div>

<div class="meta-box">
  <div><span class="label">Paziente:</span></div>
  <div><span class="value">${escHtml(pazienteNome)}</span></div>
  ${pazienteCF ? `<div><span class="label">Codice Fiscale:</span></div><div><span class="value">${escHtml(pazienteCF)}</span></div>` : ''}
  <div><span class="label">Data e ora firma:</span></div>
  <div><span class="value">${escHtml(dataFirma)}</span></div>
  <div><span class="label">Conseni accettati:</span></div>
  <div><span class="value">${token.firmatoConsensi.map(c => escHtml(c)).join(', ')}</span></div>
  <div><span class="label">Struttura:</span></div>
  <div><span class="value">${escHtml(strutturaNome)}</span></div>
</div>

${moduliHtml}

<div class="firma-block">
  <div class="firma-title">Firma del paziente</div>
  <div class="firma-grid">
    <div>${firmaImg}</div>
    <div class="firma-details">
      <div class="row"><span class="label">Dichiarato da: </span><span class="value">${escHtml(pazienteNome)}</span></div>
      <div class="row"><span class="label">Data firma: </span><span class="value">${escHtml(dataFirma)}</span></div>
      <div class="row"><span class="label">ID token: </span><span class="value">${escHtml(token.id.slice(0, 8))}…</span></div>
    </div>
  </div>
</div>

<div class="footer">
  Documento generato da ${escHtml(strutturaNome)} — ${new Date().toLocaleDateString('it-IT')} &bull; Copia firmata per uso interno sanitario
</div>

</body>
</html>`;
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function nl2p(text) {
    if (!text) return '';
    return text
        .split('\n')
        .filter(line => line.trim())
        .map(line => `<p>${escHtml(line)}</p>`)
        .join('');
}
