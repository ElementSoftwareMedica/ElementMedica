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

const PRESCRIZIONI_CODE_MAP = {
  uso_dpi_guanti: 'Uso obbligatorio DPI: guanti protettivi',
  uso_dpi_scarpe: 'Uso obbligatorio DPI: scarpe antinfortunistiche',
  uso_dpi_cuffie: 'Uso obbligatorio DPI: cuffie / tappi antirumore',
  uso_dpi_mascherina: 'Uso obbligatorio DPI: mascherina FFP2/FFP3',
  uso_dpi_visiera: 'Uso obbligatorio DPI: visiera / occhiali protettivi',
  uso_dpi_imbracatura: 'Uso obbligatorio DPI: imbracatura di sicurezza',
  divieto_mmc_20: 'Divieto movimentazione manuale carichi > 20 kg',
  divieto_mmc_10: 'Divieto movimentazione manuale carichi > 10 kg',
  pause_vdt: 'Pause obbligatorie VDT: 15 minuti ogni 2 ore',
  limitazione_notturno: 'Limitazione turni notturni',
  controllo_oft_annuale: 'Controllo oftalmologico annuale',
  sorveg_rafforzata_semestrale: 'Sorveglianza sanitaria rafforzata semestrale',
  formazione_rischio_chimico: 'Formazione specifica rischio chimico',
  formazione_rischio_biologico: 'Formazione specifica rischio biologico',
  evitare_cancerogeni: 'Evitare esposizione a sostanze cancerogene / mutagene',
  esposizione_rumore_limitata: 'Limitazione esposizione a rumore',
};

const LIMITAZIONI_CODE_MAP = {
  no_lavoro_quota: 'Non idoneo a lavori in quota',
  no_piattaforme_elevabili: 'Non idoneo a piattaforme elevabili / cestelli',
  no_guida_mezzi: 'Non idoneo alla conduzione di mezzi operativi',
  no_spazi_confinati: 'Non idoneo a lavori in spazi confinati',
  limitazione_notturno_mansione: 'Limitata idoneità ai turni notturni',
  no_vibrazioni: 'Non idoneo a mansioni con esposizione a vibrazioni',
  no_rumore_85db: 'Non idoneo a mansioni con esposizione a rumore > 85 dB',
  limitazione_mmc: 'Limitata movimentazione manuale di carichi',
  no_cancerogeni: 'Non idoneo a esposizione a cancerogeni / mutageni',
  limitazione_chimici: 'Limitata esposizione a sostanze chimiche pericolose',
  no_stress_termico: 'Non idoneo a lavori con stress termico',
  no_vdt_prolungato: 'Uso VDT limitato',
};

function humanizeToken(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function splitStoredCodes(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  if (typeof value === 'object') {
    return Object.values(value).flat().map(item => String(item).trim()).filter(Boolean);
  }
  const text = String(value).trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return splitStoredCodes(parsed);
  } catch {
    return text.split(/[,;\n]+/).map(item => item.trim()).filter(Boolean);
  }
}

function formatClinicalCodes(value, codeMap = {}) {
  const items = splitStoredCodes(value);
  if (!items.length) return '—';
  return items.map(item => codeMap[item] || humanizeToken(item)).join('; ');
}

function periodicitaLabel(periodicita, customMesi) {
  if (customMesi) return `Ogni ${customMesi} mesi`;
  const MAP = {
    UNA_TANTUM: 'Una tantum',
    SU_INDICAZIONE: 'Su indicazione del medico competente',
    MESI_3: 'Ogni 3 mesi',
    MESI_6: 'Ogni 6 mesi',
    MESI_12: 'Ogni 12 mesi',
    MESI_24: 'Ogni 24 mesi',
    MESI_36: 'Ogni 36 mesi',
    MESI_48: 'Ogni 48 mesi',
    MESI_60: 'Ogni 60 mesi',
  };
  return MAP[periodicita] || humanizeToken(periodicita) || '—';
}

function genderLabel(g) {
  if (g === 'MALE' || g === 'M') return 'Maschile';
  if (g === 'FEMALE' || g === 'F') return 'Femminile';
  return esc(g) || '—';
}

function idoneitaLabel(esito) {
  const MAP = {
    IDONEO: 'Idoneo',
    IDONEO_CON_PRESCRIZIONI: 'Idoneo parziale con prescrizioni',
    IDONEO_CON_LIMITAZIONI: 'Idoneo parziale con limitazioni',
    IDONEO_CON_LIMITAZIONI_PRESCRIZIONI: 'Idoneo parziale con limitazioni e prescrizioni',
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
                <td>${esc(periodicitaLabel(p.periodicita, p.periodicitaCustomMesi))}</td>
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
            ${giudizioAttuale.prescrizioniIdoneita ? `<div class="giudizio-detail"><strong>Prescrizioni:</strong> ${esc(formatClinicalCodes(giudizioAttuale.prescrizioniIdoneita, PRESCRIZIONI_CODE_MAP))}</div>` : ''}
            ${giudizioAttuale.limitazioni ? `<div class="giudizio-detail"><strong>Limitazioni:</strong> ${esc(formatClinicalCodes(giudizioAttuale.limitazioni, LIMITAZIONI_CODE_MAP))}</div>` : ''}
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
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; color: #233747; background: #fff; }
  @page { size: A4; margin: 18mm 18mm 22mm 18mm; }

  /* Header */
  .doc-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border: 1px solid #cfe7e4; border-left: 5px solid #0f766e; border-radius: 8px; margin-bottom: 16px; background: #f7fbfa; }
  .doc-title h1 { font-size: 13pt; font-weight: 700; color: #0f766e; letter-spacing: 0; }
  .doc-title h2 { font-size: 9pt; font-weight: 400; color: #52666f; margin-top: 2px; }
  .doc-meta { text-align: right; font-size: 8pt; color: #647980; }

  /* Sections */
  .section { margin-bottom: 18px; page-break-inside: avoid; }
  .section-title { font-size: 10pt; font-weight: 700; color: #fff; background: #0f766e; padding: 6px 10px; border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .section-title .num { background: rgba(255,255,255,0.22); border-radius: 999px; min-width: 20px; height: 20px; padding: 0 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 8pt; font-weight: 700; }

  /* Field layout */
  .field-row { display: flex; flex-wrap: wrap; gap: 6px 20px; padding: 6px 0; }
  .field { min-width: 160px; flex: 1 1 180px; }
  .field .label { font-weight: 700; font-size: 8pt; text-transform: uppercase; color: #52666f; display: block; margin-bottom: 1px; }
  .field .value { font-size: 10pt; }
  ul { padding-left: 16px; margin: 4px 0; }
  li { margin-bottom: 2px; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { background: #edf7f6; color: #233747; font-weight: 700; padding: 6px 8px; text-align: left; border: 1px solid #cfe7e4; }
  td { padding: 5px 8px; border: 1px solid #dce9e7; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fbfb; }
  td.center, th.center { text-align: center; }
  td.empty { color: #888; font-style: italic; text-align: center; padding: 10px; }

  /* Giudizio box */
  .giudizio-box { border-radius: 8px; padding: 10px 14px; border: 1px solid #cfe7e4; background: #f7fbfa; }
  .giudizio-esito { font-size: 12pt; font-weight: 700; color: #0f766e; margin-bottom: 6px; }
  .giudizio-idoneo .giudizio-esito { color: #15803d; }
  .giudizio-non-idoneo-permanente .giudizio-esito { color: #b91c1c; }
  .giudizio-non-idoneo-temporaneo .giudizio-esito { color: #c2410c; }
  .giudizio-detail { font-size: 9pt; margin-top: 3px; }

  /* Firma */
  .signature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 34px; align-items: end; }
  .signature-cell { min-height: 52px; text-align: center; }
  .signature-line { height: 1px; background: #233747; width: 100%; margin-bottom: 6px; }
  .signature-label { font-size: 8.5pt; font-weight: 600; color: #233747; }
  .signature-value { min-height: 14px; margin-top: 8px; font-size: 8pt; color: #647980; }

  /* Footer */
  .doc-footer { font-size: 7.5pt; color: #647980; border-top: 1px solid #dce9e7; margin-top: 20px; padding-top: 6px; }

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
  <div class="signature-grid">
    <div class="signature-cell">
      <div class="signature-line"></div>
      <div class="signature-label">Data</div>
      <div class="signature-value">${formatDate(generatedAt)}</div>
    </div>
    <div class="signature-cell">
      <div class="signature-line"></div>
      <div class="signature-label">Firma Medico Competente</div>
      <div class="signature-value">${esc(medicoCompetente?.nomeCompleto || '')}</div>
    </div>
    <div class="signature-cell">
      <div class="signature-line"></div>
      <div class="signature-label">Firma Lavoratore</div>
      <div class="signature-value">${esc([lavoratore?.lastName, lavoratore?.firstName].filter(Boolean).join(' '))}</div>
    </div>
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
