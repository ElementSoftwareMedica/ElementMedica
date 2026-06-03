/**
 * Allegato3APdfService — Generazione PDF Cartella Sanitaria e di Rischio
 *
 * Genera il documento PDF dell'Allegato 3A (Art. 41 c.5 D.Lgs 81/08)
 * a partire dai dati strutturati prodotti da Allegato3AService.generateData().
 *
 * Utilizza pdfService (Puppeteer) già disponibile nel progetto.
 *
 * @module services/clinical/Allegato3APdfService
 */

import pdfService from '../pdfService.js';
import logger from '../../utils/logger.js';

// ---------------------------------------------------------------------------
// Helpers di formattazione
// ---------------------------------------------------------------------------

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch {
    return '—';
  }
}

function esc(str) {
  if (str === null || str === undefined) return '—';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAddress(obj) {
  if (!obj) return '—';
  const parts = [obj.indirizzo, obj.citta, obj.cap, obj.provincia].filter(Boolean);
  return esc(parts.join(', ') || '—');
}

function renderTextBlock(value) {
  if (!value) return '<p class="empty">Non registrato</p>';
  return `<p>${esc(value)}</p>`;
}

function renderList(items, empty = 'Nessun dato registrato') {
  if (!items?.length) return `<p class="empty">${esc(empty)}</p>`;
  return `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function genderLabel(g) {
  if (g === 'MALE' || g === 'M') return 'Maschile';
  if (g === 'FEMALE' || g === 'F') return 'Femminile';
  return esc(g) || '—';
}

function idoneitaLabel(esito) {
  const MAP = {
    IDONEO: 'Idoneo',
    IDONEO_CON_PRESCRIZIONI: 'Idoneo con prescrizioni',
    IDONEO_CON_LIMITAZIONI: 'Idoneo con limitazioni',
    PARZIALMENTE_IDONEO: 'Parzialmente idoneo',
    NON_IDONEO_TEMPORANEO: 'Non idoneo temporaneo',
    NON_IDONEO_PERMANENTE: 'Non idoneo permanente',
  };
  return MAP[esito] || esc(esito) || '—';
}

function tipoVisitaLabel(tipo) {
  const MAP = {
    PREVENTIVA: 'Preventiva (art. 41 c.2a)',
    PREVENTIVA_PREASSUNTIVA: 'Preassuntiva (art. 41 c.2a-bis)',
    PERIODICA: 'Periodica',
    CAMBIO_MANSIONE: 'Cambio mansione',
    CESSAZIONE_RAPPORTO: 'A cessazione rapporto',
    PRECEDENTE_ASSENZA: 'Dopo assenza per malattia',
    SU_RICHIESTA_LAVORATORE: 'Su richiesta lavoratore',
    STRAORDINARIA: 'Straordinaria',
    VERIFICA_IDONEITA: 'Verifica idoneità',
    RIENTRO_MATERNITA: 'Rientro maternità/paternità',
  };
  return MAP[tipo] || esc(tipo) || '—';
}

function livelloRischioLabel(livello) {
  const MAP = {
    BASSO: 'Basso',
    MEDIO: 'Medio',
    ALTO: 'Alto',
    MOLTO_ALTO: 'Molto alto',
  };
  return MAP[livello] || esc(livello) || 'N/D';
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------

function buildHtml(data) {
  const { lavoratore, azienda, datiLavorativi, rischiProfessionali = [],
    accertamentiSanitari = [], giudizioAttuale, medicoCompetente,
    generatedAt, riferimentoNormativo, istituzione, anamnesi,
    programmaSorveglianzaSanitaria, esameObiettivo,
    provvedimentiMedicoCompetente, visiteMediche = [],
    comunicazioneGiudizio, allegatiCartella = [] } = data;

  const sezioneRischi = rischiProfessionali.length > 0
    ? rischiProfessionali.map(r => `
            <tr>
                <td>${esc(r.tipo)}</td>
                <td class="center">${livelloRischioLabel(r.livello)}</td>
                <td>${esc(r.descrizione)}</td>
                <td>${esc(r.misurePrevenzione)}</td>
            </tr>`).join('')
    : '<tr><td colspan="4" class="empty">Nessun rischio professionale registrato</td></tr>';

  const sezioneAccertamenti = accertamentiSanitari.length > 0
    ? accertamentiSanitari.map(a => `
            <tr>
                <td class="center">${formatDate(a.data)}</td>
                <td>${tipoVisitaLabel(a.tipo)}</td>
                <td>${esc(a.medicoEsecutore)}</td>
                <td>${esc(a.note)}</td>
            </tr>`).join('')
    : '<tr><td colspan="4" class="empty">Nessun accertamento sanitario registrato</td></tr>';

  const sezioneVisite = visiteMediche.length > 0
    ? visiteMediche.map(v => `
            <tr>
                <td class="center">${formatDate(v.dataOra || v.data)}</td>
                <td>${esc(v.tipoVisitaLabel || tipoVisitaLabel(v.tipoVisitaMDL))}</td>
                <td>${esc(v.prestazione?.nome)}</td>
                <td>${esc(v.esameObiettivo || v.diagnosi || v.note)}</td>
                <td>${esc(v.giudizio?.esito)}</td>
            </tr>`).join('')
    : '<tr><td colspan="5" class="empty">Nessuna visita medica del lavoro registrata</td></tr>';

  const accertamentiPrevisti = programmaSorveglianzaSanitaria?.accertamentiPrevisti || [];
  const sezioneProtocollo = accertamentiPrevisti.length > 0
    ? accertamentiPrevisti.map(p => `
            <tr>
                <td>${esc(p.nome)}</td>
                <td class="center">${p.obbligatoria ? 'Obbligatorio' : 'Facoltativo'}</td>
                <td>${esc(p.periodicitaCustomMesi ? `Ogni ${p.periodicitaCustomMesi} mesi` : p.periodicita)}</td>
            </tr>`).join('')
    : '<tr><td colspan="3" class="empty">Nessun accertamento previsto dal protocollo</td></tr>';

  const sezioneAllegati = allegatiCartella.length > 0
    ? allegatiCartella.map(a => `
            <tr>
                <td>${formatDate(a.data || a.visitaData)}</td>
                <td>${esc(a.tipo)}</td>
                <td>${esc(a.titolo || a.fileName)}</td>
                <td>${esc(a.origine)}</td>
            </tr>`).join('')
    : '<tr><td colspan="4" class="empty">Nessun allegato collegato alla cartella</td></tr>';

  const giudizioBlock = giudizioAttuale
    ? `
        <div class="giudizio-box ${giudizioAttuale.esito ? 'giudizio-' + giudizioAttuale.esito.toLowerCase().replace(/_/g, '-') : ''}">
            <div class="giudizio-esito">${idoneitaLabel(giudizioAttuale.esito)}</div>
            ${giudizioAttuale.mansione ? `<div class="giudizio-detail"><strong>Mansione/i:</strong> ${esc(giudizioAttuale.mansione)}</div>` : ''}
            ${giudizioAttuale.dataEmissione || giudizioAttuale.data ? `<div class="giudizio-detail"><strong>Data emissione:</strong> ${formatDate(giudizioAttuale.dataEmissione || giudizioAttuale.data)}</div>` : ''}
            ${giudizioAttuale.dataScadenza || giudizioAttuale.validoFino ? `<div class="giudizio-detail"><strong>Scadenza:</strong> ${formatDate(giudizioAttuale.dataScadenza || giudizioAttuale.validoFino)}</div>` : ''}
            ${giudizioAttuale.prescrizioniIdoneita ? `<div class="giudizio-detail"><strong>Prescrizioni:</strong> ${esc(giudizioAttuale.prescrizioniIdoneita)}</div>` : ''}
            ${giudizioAttuale.limitazioni ? `<div class="giudizio-detail"><strong>Limitazioni:</strong> ${esc(giudizioAttuale.limitazioni)}</div>` : ''}
        </div>`
    : '<p class="empty">Nessun giudizio di idoneità emesso.</p>';

  const medicoBlock = medicoCompetente
    ? `<div class="field-row">
            <div class="field"><span class="label">Nominativo</span> ${esc(medicoCompetente.nomeCompleto || `${medicoCompetente.cognome || ''} ${medicoCompetente.nome || ''}`.trim())}</div>
            ${medicoCompetente.alboMedici ? `<div class="field"><span class="label">Codice iscrizione albo</span> ${esc(medicoCompetente.alboMedici)}</div>` : ''}
            ${medicoCompetente.codiceFiscale ? `<div class="field"><span class="label">Codice fiscale</span> ${esc(medicoCompetente.codiceFiscale)}</div>` : ''}
            ${medicoCompetente.email ? `<div class="field"><span class="label">Email</span> ${esc(medicoCompetente.email)}</div>` : ''}
        </div>`
    : '<p class="empty">Medico competente non disponibile.</p>';

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Allegato 3A — Cartella Sanitaria e di Rischio</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; color: #1a1a1a; background: #fff; }
  @page { size: A4; margin: 18mm 18mm 22mm 18mm; }

  /* Header */
  .doc-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 2px solid #0d6efd; margin-bottom: 16px; }
  .doc-title h1 { font-size: 13pt; font-weight: 700; color: #0d6efd; }
  .doc-title h2 { font-size: 9pt; font-weight: 400; color: #555; margin-top: 2px; }
  .doc-meta { text-align: right; font-size: 8pt; color: #666; }

  /* Sections */
  .section { margin-bottom: 18px; page-break-inside: avoid; }
  .section-title { font-size: 10pt; font-weight: 700; color: #fff; background: #0d6efd; padding: 5px 10px; border-radius: 3px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .section-title .num { background: rgba(255,255,255,0.25); border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 8pt; font-weight: 700; }

  /* Field layout */
  .field-row { display: flex; flex-wrap: wrap; gap: 6px 20px; padding: 6px 0; }
  .field { min-width: 160px; flex: 1 1 180px; }
  .field .label { font-weight: 600; font-size: 8pt; text-transform: uppercase; color: #555; display: block; margin-bottom: 1px; }
  .field .value { font-size: 10pt; }
  ul { padding-left: 16px; margin: 4px 0; }
  li { margin-bottom: 2px; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { background: #e8f0fe; color: #1a1a1a; font-weight: 600; padding: 6px 8px; text-align: left; border: 1px solid #c8d4f0; }
  td { padding: 5px 8px; border: 1px solid #dde3ef; vertical-align: top; }
  tr:nth-child(even) td { background: #f8f9ff; }
  td.center, th.center { text-align: center; }
  td.empty { color: #888; font-style: italic; text-align: center; padding: 10px; }

  /* Giudizio box */
  .giudizio-box { border-radius: 4px; padding: 10px 14px; border: 1px solid #c8d4f0; background: #f4f8ff; }
  .giudizio-esito { font-size: 12pt; font-weight: 700; color: #0d6efd; margin-bottom: 6px; }
  .giudizio-idoneo .giudizio-esito { color: #198754; }
  .giudizio-non-idoneo-permanente .giudizio-esito { color: #dc3545; }
  .giudizio-non-idoneo-temporaneo .giudizio-esito { color: #fd7e14; }
  .giudizio-detail { font-size: 9pt; margin-top: 3px; }

  /* Firma */
  .firma-row { display: flex; justify-content: space-between; margin-top: 30px; gap: 20px; }
  .firma-block { flex: 1; border-top: 1px solid #333; padding-top: 4px; font-size: 8pt; text-align: center; }

  /* Footer */
  .doc-footer { font-size: 7.5pt; color: #888; border-top: 1px solid #dde; margin-top: 20px; padding-top: 6px; }

  .empty { color: #888; font-style: italic; font-size: 9pt; }
  .text-muted { color: #888; }
</style>
</head>
<body>

<div class="doc-header">
  <div class="doc-title">
    <h1>CARTELLA SANITARIA E DI RISCHIO</h1>
    <h2>${esc(riferimentoNormativo)} — Allegato 3A</h2>
  </div>
  <div class="doc-meta">
    Generato il ${formatDate(generatedAt)}<br>
    <span class="text-muted">${esc(azienda?.ragioneSociale)}</span>
  </div>
</div>

<!-- SEZIONE 1: Dati Anagrafici Lavoratore -->
<div class="section">
  <div class="section-title"><span class="num">1</span> Dati Anagrafici Lavoratore</div>
  <div class="field-row">
    <div class="field"><span class="label">Cognome</span>${esc(lavoratore?.lastName)}</div>
    <div class="field"><span class="label">Nome</span>${esc(lavoratore?.firstName)}</div>
    <div class="field"><span class="label">Codice Fiscale</span>${esc(lavoratore?.taxCode)}</div>
    <div class="field"><span class="label">Sesso</span>${genderLabel(lavoratore?.gender)}</div>
  </div>
  <div class="field-row">
    <div class="field"><span class="label">Data di nascita</span>${formatDate(lavoratore?.birthDate)}</div>
    <div class="field"><span class="label">Luogo di nascita</span>${esc([lavoratore?.birthPlace, lavoratore?.birthProvince].filter(Boolean).join(' (').replace(/\(([^)]*)$/, '($1)'))}</div>
    <div class="field"><span class="label">Nazionalità</span>${esc(lavoratore?.nationality || 'Non registrata')}</div>
    <div class="field"><span class="label">Residenza</span>${renderAddress(lavoratore?.residenza)}</div>
  </div>
  <div class="field-row">
    ${lavoratore?.contatti?.email ? `<div class="field"><span class="label">Email</span>${esc(lavoratore.contatti.email)}</div>` : ''}
    ${lavoratore?.contatti?.phone ? `<div class="field"><span class="label">Telefono</span>${esc(lavoratore.contatti.phone)}</div>` : ''}
  </div>
</div>

<!-- SEZIONE 2: Dati Azienda -->
<div class="section">
  <div class="section-title"><span class="num">2</span> Dati Azienda</div>
  <div class="field-row">
    <div class="field"><span class="label">Ragione Sociale</span>${esc(azienda?.ragioneSociale)}</div>
    <div class="field"><span class="label">P.IVA</span>${esc(azienda?.piva)}</div>
    <div class="field"><span class="label">Codice Fiscale</span>${esc(azienda?.codiceFiscale)}</div>
  </div>
  <div class="field-row">
    <div class="field"><span class="label">Sede Legale</span>${renderAddress(azienda?.sedeLegale)}</div>
    <div class="field"><span class="label">Unità produttiva / sede lavoro</span>${renderAddress(azienda?.sedeLavoro) || esc(azienda?.sedeLavoro?.nome)}</div>
    <div class="field"><span class="label">Codice ATECO</span>${esc(azienda?.codiceAteco)}</div>
    <div class="field"><span class="label">Attività svolta</span>${esc(azienda?.attivitaSvolta || azienda?.settore)}</div>
  </div>
</div>

<!-- SEZIONE 2B: Istituzione Cartella -->
<div class="section">
  <div class="section-title"><span class="num">2B</span> Dati di Istituzione</div>
  <div class="field-row">
    <div class="field"><span class="label">Motivo istituzione</span>${esc(istituzione?.motivo)}</div>
    <div class="field"><span class="label">Data istituzione / aggiornamento</span>${formatDate(istituzione?.data)}</div>
    <div class="field"><span class="label">Firma medico competente</span>${esc(istituzione?.firmaMedicoCompetente)}</div>
  </div>
</div>

<!-- SEZIONE 3: Dati Lavorativi -->
<div class="section">
  <div class="section-title"><span class="num">3</span> Dati Lavorativi</div>
  <div class="field-row">
    <div class="field"><span class="label">Mansione attuale</span>${esc(datiLavorativi?.mansioneAttuale)}</div>
    ${datiLavorativi?.mansioneCodice ? `<div class="field"><span class="label">Codice mansione</span>${esc(datiLavorativi.mansioneCodice)}</div>` : ''}
    <div class="field"><span class="label">Profilo professionale</span>${esc(datiLavorativi?.profiloProfessionale)}</div>
    <div class="field"><span class="label">Reparto / Sede</span>${esc(datiLavorativi?.reparto)}</div>
    <div class="field"><span class="label">Unità produttiva</span>${esc(datiLavorativi?.unitaProduttiva)}</div>
  </div>
  <div class="field-row">
    <div class="field"><span class="label">Data assunzione</span>${formatDate(datiLavorativi?.dataAssunzione)}</div>
    <div class="field"><span class="label">Inizio mansione attuale</span>${formatDate(datiLavorativi?.dataInizioMansione)}</div>
  </div>
</div>

<!-- SEZIONE 3B: Programma Sorveglianza Sanitaria -->
<div class="section">
  <div class="section-title"><span class="num">3B</span> Programma di Sorveglianza Sanitaria</div>
  <div class="field-row">
    <div class="field"><span class="label">Protocollo sanitario</span>${esc(programmaSorveglianzaSanitaria?.protocollo?.denominazione || datiLavorativi?.protocolloSanitario?.denominazione)}</div>
    <div class="field"><span class="label">Periodicità visite</span>${esc(programmaSorveglianzaSanitaria?.protocollo?.periodicitaVisiteMesi ? `Ogni ${programmaSorveglianzaSanitaria.protocollo.periodicitaVisiteMesi} mesi` : null)}</div>
  </div>
  <table>
    <thead>
      <tr><th>Accertamento previsto</th><th class="center">Obbligatorietà</th><th>Periodicità</th></tr>
    </thead>
    <tbody>${sezioneProtocollo}</tbody>
  </table>
</div>

<!-- SEZIONE 4: Rischi Professionali -->
<div class="section">
  <div class="section-title"><span class="num">4</span> Rischi Professionali</div>
  <table>
    <thead>
      <tr>
        <th>Codice / Tipo rischio</th>
        <th class="center" style="width:90px">Livello</th>
        <th>Descrizione</th>
        <th>Misure prevenzione / DPI</th>
      </tr>
    </thead>
    <tbody>
      ${sezioneRischi}
    </tbody>
  </table>
</div>

<!-- SEZIONE 4B: Anamnesi ed Esame Obiettivo -->
<div class="section">
  <div class="section-title"><span class="num">4B</span> Anamnesi Completa ed Esame Obiettivo</div>
  <div class="field-row">
    <div class="field"><span class="label">Anamnesi lavorativa</span>${renderTextBlock(anamnesi?.lavorativa)}</div>
    <div class="field"><span class="label">Anamnesi familiare</span>${renderTextBlock(anamnesi?.familiare)}</div>
  </div>
  <div class="field-row">
    <div class="field"><span class="label">Anamnesi fisiologica</span>${renderTextBlock(anamnesi?.fisiologica)}</div>
    <div class="field"><span class="label">Patologica remota</span>${renderTextBlock(anamnesi?.patologicaRemota)}</div>
    <div class="field"><span class="label">Patologica prossima</span>${renderTextBlock(anamnesi?.patologicaProssima)}</div>
  </div>
  <div class="field-row">
    <div class="field"><span class="label">Esame obiettivo orientato</span>${renderTextBlock(esameObiettivo)}</div>
    <div class="field"><span class="label">Provvedimenti del medico competente</span>${renderTextBlock(provvedimentiMedicoCompetente)}</div>
  </div>
</div>

<!-- SEZIONE 5: Accertamenti Sanitari -->
<div class="section">
  <div class="section-title"><span class="num">5</span> Storico Accertamenti Sanitari (ultimi 5 anni)</div>
  <table>
    <thead>
      <tr>
        <th class="center" style="width:90px">Data</th>
        <th>Tipo visita</th>
        <th>Medico esecutore</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>
      ${sezioneAccertamenti}
    </tbody>
  </table>
</div>

<!-- SEZIONE 5B: Visite Mediche del Lavoro -->
<div class="section">
  <div class="section-title"><span class="num">5B</span> Visite Preventive, Periodiche e Successive</div>
  <table>
    <thead>
      <tr>
        <th class="center" style="width:90px">Data</th>
        <th>Tipo visita</th>
        <th>Prestazione</th>
        <th>Esame obiettivo / variazioni</th>
        <th>Giudizio</th>
      </tr>
    </thead>
    <tbody>${sezioneVisite}</tbody>
  </table>
</div>

<!-- SEZIONE 6: Giudizio di Idoneità -->
<div class="section">
  <div class="section-title"><span class="num">6</span> Giudizio di Idoneità Attuale</div>
  ${giudizioBlock}
</div>

<!-- SEZIONE 6B: Comunicazione Giudizio -->
<div class="section">
  <div class="section-title"><span class="num">6B</span> Comunicazione del Giudizio di Idoneità</div>
  ${comunicazioneGiudizio ? `
    <div class="field-row">
      <div class="field"><span class="label">Destinatari</span>${esc(comunicazioneGiudizio.destinatari)}</div>
      <div class="field"><span class="label">Notifica lavoratore</span>${formatDate(comunicazioneGiudizio.dataNotificaLavoratore)}</div>
      <div class="field"><span class="label">Notifica datore di lavoro</span>${formatDate(comunicazioneGiudizio.dataNotificaDatoreLavoro)}</div>
    </div>
    <div class="field-row"><div class="field"><span class="label">Contenuti minimi</span>${esc(comunicazioneGiudizio.contenutoMinimo)}</div></div>
  ` : '<p class="empty">Nessun giudizio comunicabile registrato.</p>'}
</div>

<!-- SEZIONE 7: Medico Competente e Firma -->
<div class="section">
  <div class="section-title"><span class="num">7</span> Medico Competente</div>
  ${medicoBlock}
  <div class="firma-row">
    <div class="firma-block">Data<br><br>_______________</div>
    <div class="firma-block">Firma Medico Competente<br><br>_______________</div>
    <div class="firma-block">Firma Lavoratore<br><br>_______________</div>
  </div>
</div>

<!-- SEZIONE 8: Allegati Cartella -->
<div class="section">
  <div class="section-title"><span class="num">8</span> Referti, Accertamenti, Documenti e Allegati</div>
  <table>
    <thead>
      <tr><th style="width:90px">Data</th><th>Tipologia</th><th>Documento</th><th>Origine</th></tr>
    </thead>
    <tbody>${sezioneAllegati}</tbody>
  </table>
</div>

<div class="doc-footer">
  Documento generato automaticamente dal sistema ElementMedica — ${esc(riferimentoNormativo)}.
  Da conservare per tutta la durata del rapporto di lavoro e per 10 anni successivi (art. 53 c.5 D.Lgs 81/08).
  Documento riservato — proteggere ai sensi del Reg. UE 2016/679 (GDPR).
</div>

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const Allegato3APdfService = {
  /**
   * Genera il PDF per un singolo lavoratore.
   * @param {Object} data — risultato di Allegato3AService.generateData()
   * @returns {Promise<Buffer>} PDF come Buffer
   */
  async generate(data) {
    const html = buildHtml(data);
    logger.debug({
      personId: data?.lavoratore?.id,
      companyId: data?.azienda?.id
    }, 'Generazione PDF Allegato 3A');

    const buffer = await pdfService.generatePDF(html, {
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', right: '18mm', bottom: '22mm', left: '18mm' }
    });

    return buffer;
  },

  /**
   * Restituisce il nome file suggerito per il PDF.
   */
  filename(data) {
    const lastName = (data?.lavoratore?.lastName || 'lavoratore')
      .toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const date = new Date().toISOString().slice(0, 10);
    return `allegato3a_${lastName}_${date}.pdf`;
  }
};

export default Allegato3APdfService;
