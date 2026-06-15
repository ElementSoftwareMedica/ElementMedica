/**
 * DefaultTemplateService
 * 
 * Crea template predefiniti per ogni nuovo tenant.
 * Ogni template usa placeholder (marcatori) che vengono sostituiti
 * con i dati reali del tenant quando si genera un documento.
 * 
 * Placeholder standard supportati (vedi markerResolver.js per lista completa):
 *   {{tenant.name}}       - Nome del tenant/organizzazione  
 *   {{tenant.logo}}       - URL del logo
 *   {{tenant.address}}    - Indirizzo sede
 *   {{tenant.phone}}      - Telefono
 *   {{tenant.email}}      - Email
 *   {{tenant.vatNumber}}  - P.IVA
 *   {{tenant.pec}}        - PEC
 *   {{current.date}}      - Data corrente
 *   {{course.title}}      - Titolo corso
 *   {{schedule.startDate}} - Data inizio programmazione
 *   {{trainer.fullName}}  - Nome completo docente
 *   {{person.fullName}}   - Nome completo persona
 * 
 * Sintassi Google Docs (auto-convertita):
 *   {{CORSO_TITOLO}}      → {{course.title}}
 *   {{FORMATORE_COMPLETO}} → {{trainer.fullName}}
 * 
 * @module DefaultTemplateService
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

// ============================================================================
// TEMPLATE CONTENT DEFINITIONS
// ============================================================================

const COMMON_STYLES = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #333; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid var(--brand-color, #0d9488); }
    .logo-section { flex: 0 0 200px; }
    .logo-section img { max-width: 180px; max-height: 80px; }
    .org-info { text-align: right; flex: 1; }
    .org-name { font-size: 16pt; font-weight: bold; color: var(--brand-color, #0d9488); margin-bottom: 4px; }
    .org-details { font-size: 9pt; color: #666; line-height: 1.4; }
    .document-title { text-align: center; font-size: 14pt; font-weight: bold; color: var(--brand-color, #0d9488); margin: 20px 0; padding: 10px; background: var(--brand-bg, #f0fdfa); border-radius: 5px; }
    .section { margin-bottom: 18px; page-break-inside: avoid; }
    .section-title { font-size: 11pt; font-weight: bold; color: var(--brand-color, #0d9488); border-bottom: 1px solid var(--brand-light, #99f6e4); padding-bottom: 4px; margin-bottom: 8px; }
    .content-box { background: #f8fafc; padding: 12px; border-radius: 5px; margin-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .info-row { display: flex; }
    .info-label { font-weight: bold; width: 140px; color: #64748b; font-size: 9pt; }
    .info-value { flex: 1; }
    .signature-section { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
    .signature-box { text-align: center; width: 45%; }
    .signature-line { border-top: 1px solid #333; padding-top: 5px; margin-top: 60px; font-size: 9pt; }
    .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; text-align: center; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { background: var(--brand-color, #0d9488); color: white; padding: 8px 10px; text-align: left; font-size: 9pt; }
    td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 9pt; }
    tr:nth-child(even) { background: #f8fafc; }
`;

const makeHeader = () => `
    <div class="header">
        <div class="logo-section">
            <img src="{{tenant.logo}}" alt="Logo" style="max-width:180px; max-height:80px;">
        </div>
        <div class="org-info">
            <div class="org-name">{{tenant.name}}</div>
            <div class="org-details">
                {{tenant.address}}<br>
                Tel: {{tenant.phone}} | Email: {{tenant.email}}<br>
                P.IVA: {{tenant.vatNumber}} | PEC: {{tenant.pec}}
            </div>
        </div>
    </div>`;

const makeFooter = (docType) => `
    <div class="footer">
        Documento generato il {{current.date}} — {{tenant.name}}<br>
        ${docType} — Questo documento è stato generato elettronicamente.
    </div>`;

const MDL_NOMINE_FIGURE_CONTENT = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><title>Nomine Figure Sicurezza e MDL</title>
<style>${COMMON_STYLES}
    :root { --brand-color: #0f766e; --brand-bg: #f0fdfa; --brand-light: #99f6e4; }
</style></head><body>
${makeHeader()}
<div class="document-title">NOMINE FIGURE SICUREZZA E MEDICINA DEL LAVORO</div>
<div class="section">
    <p>Spett.le <strong>{{azienda}}</strong></p>
    <p>Con il presente documento vengono riepilogate le nomine attive relative a Medico Competente, eventuali Medici Competenti Coordinati e RSPP.</p>
</div>
<div class="section">
    <div class="section-title">Dati azienda</div>
    <div class="content-box">
        <div class="info-row"><span class="info-label">Azienda:</span><span class="info-value">{{azienda}}</span></div>
        <div class="info-row"><span class="info-label">P.IVA / CF:</span><span class="info-value">{{piva}}</span></div>
        <div class="info-row"><span class="info-label">Sede legale:</span><span class="info-value">{{sede_legale}}</span></div>
    </div>
</div>
<div class="section">
    <div class="section-title">Figure nominate</div>
    <div class="content-box">
        <p><strong>Medico Competente:</strong> {{medico_competente}}</p>
        <p><strong>Medici Competenti Coordinati:</strong> {{medici_competenti_coordinati}}</p>
        <p><strong>RSPP:</strong> {{rspp}}</p>
        <p><strong>Sedi interessate:</strong> {{sedi}}</p>
        <p><strong>Decorrenza:</strong> {{data_nomina}} - <strong>Scadenza:</strong> {{data_scadenza}}</p>
    </div>
</div>
<div class="section">
    <div class="section-title">Tacito rinnovo</div>
    <p>Salvo disdetta scritta comunicata almeno 30 giorni prima della scadenza annuale, l'incarico si intende tacitamente rinnovato per un ulteriore anno, fatte salve diverse pattuizioni o obblighi normativi applicabili.</p>
</div>
<div class="signature-section">
    <div class="signature-box"><div class="signature-line">Firma Datore di Lavoro</div></div>
    <div class="signature-box"><div class="signature-line">Firma Professionista incaricato</div></div>
</div>
${makeFooter('Nomine Figure Sicurezza e MDL')}
</body></html>`;

// ============================================================================
// TEMPLATE: Lettera di Incarico (FORMAZIONE)
// ============================================================================
const LETTER_OF_ENGAGEMENT_CONTENT = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><title>Lettera di Incarico</title>
<style>${COMMON_STYLES}
    :root { --brand-color: #2563eb; --brand-bg: #eff6ff; --brand-light: #93c5fd; }
</style></head><body>
${makeHeader()}
<div class="document-title">LETTERA DI INCARICO</div>

<div class="section">
    <p>Spett.le <strong>{{trainer.firstName}} {{trainer.lastName}}</strong></p>
    <p style="margin-top:10px;">Con la presente Le confermiamo l'incarico di docenza come di seguito specificato:</p>
</div>

<div class="section">
    <div class="section-title">Dati Corso</div>
    <div class="content-box info-grid">
        <div class="info-row"><span class="info-label">Corso:</span><span class="info-value">{{course.title}}</span></div>
        <div class="info-row"><span class="info-label">Codice:</span><span class="info-value">{{course.code}}</span></div>
        <div class="info-row"><span class="info-label">Data inizio:</span><span class="info-value">{{schedule.startDate}}</span></div>
        <div class="info-row"><span class="info-label">Data fine:</span><span class="info-value">{{schedule.endDate}}</span></div>
        <div class="info-row"><span class="info-label">Sede:</span><span class="info-value">{{schedule.location}}</span></div>
        <div class="info-row"><span class="info-label">Modalità:</span><span class="info-value">{{schedule.deliveryMode}}</span></div>
        <div class="info-row"><span class="info-label">Ore previste:</span><span class="info-value">{{trainer.totalHours}}</span></div>
    </div>
</div>

<div class="section">
    <div class="section-title">Compenso</div>
    <div class="content-box">
        <div class="info-row"><span class="info-label">Tariffa oraria:</span><span class="info-value">{{trainer.hourlyRate}}</span></div>
        <div class="info-row"><span class="info-label">Ore formatore:</span><span class="info-value">{{trainer.totalHours}}</span></div>
        <div class="info-row"><span class="info-label">Rimborso spese:</span><span class="info-value">{{trainer.expensesText}}</span></div>
        <div class="info-row"><span class="info-label"><strong>Compenso totale:</strong></span><span class="info-value"><strong>{{trainer.totalCompensation}}</strong></span></div>
    </div>
</div>

<div class="section">
    <div class="section-title">Condizioni</div>
    <div class="content-box">
        <p>Il docente si impegna a:</p>
        <ul style="padding-left:20px; margin-top:8px;">
            <li>Svolgere le lezioni secondo il programma concordato</li>
            <li>Compilare il registro presenze ad ogni sessione</li>
            <li>Fornire il materiale didattico nei tempi previsti</li>
            <li>Segnalare tempestivamente eventuali variazioni</li>
        </ul>
    </div>
</div>

<div class="signature-section">
    <div class="signature-box">
        <div class="signature-line">Per {{tenant.name}}</div>
    </div>
    <div class="signature-box">
        <div class="signature-line">Il Docente</div>
    </div>
</div>
${makeFooter('Lettera di Incarico')}
</body></html>`;

// ============================================================================
// TEMPLATE: Registro Presenze (FORMAZIONE)
// ============================================================================
const ATTENDANCE_REGISTER_CONTENT = `<table class="border-collapse border border-slate-300" style="min-width: 25px;"><colgroup><col style="min-width: 25px;"></colgroup><tbody><tr><td class="border border-slate-300 p-2" colspan="1" rowspan="1"><p style="text-align: center;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 14pt;"><strong>Azienda: {{session.participantCompanies}}</strong></span></p><p><span style="font-family: Verdana, sans-serif;"><br></span></p><p style="text-align: center;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 14pt;"><strong>Corso: {{course.title}}</strong></span></p><p style="text-align: center;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 14pt;"><strong>Rischio: {{course.riskLevel}}</strong></span></p><p style="text-align: center;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 14pt;"><strong>Tipologia: {{course.courseType}}</strong></span></p><p></p><p></p><p style="text-align: center;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 14pt;"><strong>Data di svolgimento: {{schedule.startDate}} - {{schedule.endDate}}</strong></span></p><p style="text-align: center;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 14pt;"><strong>Modalità: {{schedule.deliveryMode}}</strong></span></p></td></tr></tbody></table><p><br><br><br></p><p><span style="color: rgb(37, 99, 235); font-size: 12px;"><strong>— INTERRUZIONE DI PAGINA —</strong></span></p><p></p><p></p><p><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 11pt;"><strong>Compilazione del registro didattico</strong>:</span></p><p></p><ul class="list-disc pl-6 space-y-1"><li class="pl-1"><p style="text-align: justify;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 11pt;">Il registro didattico, che attesta la regolare erogazione dell'attività formativa, ha valenza di atto pubblico, pertanto sul registro sono da evitare omissioni e alterazioni che potrebbero costituire illeciti penali nonchè abrasioni e/o cancellature;</span></p></li><li class="pl-1"><p style="text-align: justify;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 11pt;">Il registro didattico deve riportare in ogni pagina indicazione dal Soggetto/Ente Attuatore (timbro Ente), ed avere pagine numerate e non asportabili;</span></p></li><li class="pl-1"><p style="text-align: justify;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 11pt;">Prima dell'avvio delle attività formative ogni Registro deve essere sottoscritto dal Legale rappresentante del Soggetto/Ente Attuatore nello spazio "vidimazione" con l'indicazione della data di sottoscrizione e il numero delle pagine del registro stesso.</span></p></li><li class="pl-1"><p style="text-align: justify;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 11pt;">Il registro didattico deve essere conservato e disponibile per eventuali controlli presso la sede di svolgimento del corso;</span></p></li><li class="pl-1"><p style="text-align: justify;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 11pt;">Il registro deve essere compilato giorno per giorno in tutte le sue parti:</span></p><ul class="list-disc pl-6 space-y-1"><li class="pl-1"><p style="text-align: justify;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 11pt;">deve riportare la data di lezione</span></p></li><li class="pl-1"><p style="text-align: justify;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 11pt;">i partecipanti sono tenuti ad apporre la propria firma in corrispondenza del proprio rigo (vedasi numero progressivo elenco allievi) all'ingresso in aula; eventuali ritardi e/o uscite anticipate dovranno essere annotate, complete di ora, dal docente/relatore nell'apposito spazio a più di pagina</span></p></li><li class="pl-1"><p style="text-align: justify;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 11pt;">il docente/relatore al termine della lezione sostenuta deve annotare il modulo, l'argomento e l'orario della stessa ed apporre la propria sottoscrizione</span></p></li><li class="pl-1"><p style="text-align: justify;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 11pt;">al termine di ogni giornata di lezione il docente/relatore deve apporre la dicitura &lt;assente&gt; sulle caselle firma dei partecipanti assenti o barrare le stesse;</span></p></li></ul></li><li class="pl-1"><p style="text-align: justify;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 11pt;">Il prospetto riepiloghi delle presenze e delle ore svolte deve essere compilato come segue:</span></p><ul class="list-disc pl-6 space-y-1"><li class="pl-1"><p style="text-align: justify;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 11pt;">tot. presenze del giorno =&gt; num allievi presenti/num allievi iscritti;</span></p></li><li class="pl-1"><p style="text-align: justify;"><span style="color: rgb(0, 0, 0); font-family: Verdana, sans-serif; font-size: 11pt;">tot. ore del giorno =&gt; totale del numero di ore svolte</span></p></li></ul></li></ul><p><span style="color: rgb(37, 99, 235); font-size: 12px;"><strong>— INTERRUZIONE DI PAGINA —</strong></span></p><p></p><p></p><table class="border-collapse border border-slate-300" style="min-width: 150px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><td class="border border-slate-300 p-2" colspan="6" rowspan="1"><p style="text-align: center;"><span style="color: rgb(0, 0, 0); font-family: Calibri, sans-serif; font-size: 12pt;"><strong>Presenze del giorno {{session.date}} con orario {{session.startTime}} - {{session.endTime}}</strong></span></p></td></tr></tbody></table><p></p><p>{{tableCouseInfo.sessionAttendance}}</p><p></p>`;

// ============================================================================
// TEMPLATE: Attestato/Certificato (BOTH)
// ============================================================================
const CERTIFICATE_CONTENT = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><title>Attestato</title>
<style>${COMMON_STYLES}
    :root { --brand-color: #2563eb; --brand-bg: #eff6ff; --brand-light: #93c5fd; }
    body { text-align: center; }
    .certificate-border { border: 3px solid var(--brand-color); padding: 40px; margin: 20px; }
    .recipient-name { font-size: 20pt; font-weight: bold; color: #1e293b; margin: 20px 0; }
    .certificate-text { font-size: 11pt; line-height: 1.8; margin: 15px 40px; text-align: center; }
</style></head><body>
<div class="certificate-border">
    <div style="margin-bottom:20px;">
        <img src="{{tenant.logo}}" alt="Logo" style="max-width:200px; max-height:80px;">
    </div>
    <div class="org-name" style="font-size:18pt; text-align:center;">{{tenant.name}}</div>
    <div class="org-details" style="text-align:center; margin-bottom:30px;">{{tenant.address}}</div>
    
    <div class="document-title" style="border:none; background:none; font-size:18pt;">ATTESTATO DI FORMAZIONE</div>
    
    <div class="certificate-text">Si attesta che</div>
    <div class="recipient-name">{{person.firstName}} {{person.lastName}}</div>
    <div class="certificate-text" style="margin-bottom:5px;">nato/a il {{person.birthDate}} — C.F.: {{person.cf}}</div>
    
    <div class="certificate-text">in forza presso <strong>{{company.name}}</strong></div>
    
    <div class="certificate-text">
        ha frequentato con esito positivo il corso di formazione
    </div>
    
    <div style="font-size:14pt; font-weight:bold; color: var(--brand-color); margin: 15px 0;">
        {{course.title}}
    </div>
    
    <div class="certificate-text">
        della durata di <strong>{{course.duration}} ore</strong><br>
        svoltosi dal <strong>{{schedule.startDate}}</strong> al <strong>{{schedule.endDate}}</strong><br>
        presso <strong>{{schedule.location}}</strong>
    </div>
    
    <div class="certificate-text" style="margin-top:15px;">
        <strong>Validità:</strong> {{course.validityYears}} anni — Scadenza: {{certificate.validUntil}}
    </div>
    
    <div class="certificate-text" style="margin-top:10px;">
        <strong>N° Attestato:</strong> {{certificate.registrationNumber}}
    </div>

    <div class="signature-section" style="margin-top:40px;">
        <div class="signature-box">
            <div class="signature-line">Data: {{current.date}}</div>
        </div>
        <div class="signature-box">
            <div class="signature-line">Il Responsabile</div>
        </div>
    </div>
</div>
${makeFooter('Attestato di Formazione')}
</body></html>`;

// ============================================================================
// TEMPLATE: Programma Corso (FORMAZIONE)
// ============================================================================
const COURSE_PROGRAM_CONTENT = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><title>Programma Corso</title>
<style>${COMMON_STYLES}
    :root { --brand-color: #2563eb; --brand-bg: #eff6ff; --brand-light: #93c5fd; }
    .module-box { background: #f8fafc; border-left: 3px solid var(--brand-color); padding: 12px 15px; margin-bottom: 10px; border-radius: 0 5px 5px 0; }
    .module-title { font-weight: bold; color: var(--brand-color); margin-bottom: 4px; }
    .module-hours { font-size: 9pt; color: #64748b; }
</style></head><body>
${makeHeader()}
<div class="document-title">PROGRAMMA DEL CORSO</div>

<div class="section">
    <div class="content-box info-grid">
        <div class="info-row"><span class="info-label">Titolo:</span><span class="info-value"><strong>{{course.title}}</strong></span></div>
        <div class="info-row"><span class="info-label">Codice:</span><span class="info-value">{{course.code}}</span></div>
        <div class="info-row"><span class="info-label">Durata totale:</span><span class="info-value">{{course.duration}} ore</span></div>
        <div class="info-row"><span class="info-label">Livello rischio:</span><span class="info-value">{{course.riskLevel}}</span></div>
        <div class="info-row"><span class="info-label">Modalità:</span><span class="info-value">{{schedule.deliveryMode}}</span></div>
        <div class="info-row"><span class="info-label">Riferimento normativo:</span><span class="info-value">{{course.regulation}}</span></div>
    </div>
</div>

<div class="section">
    <div class="section-title">Obiettivi Formativi</div>
    <div class="content-box">
        {{course.objectives}}
    </div>
</div>

<div class="section">
    <div class="section-title">Contenuti del Corso</div>
    <div class="content-box">
        {{course.topics}}
    </div>
</div>

<div class="section">
    <div class="section-title">Calendario Sessioni</div>
    {{table.sessionsInfo}}
</div>

<div class="section">
    <div class="section-title">Modalità di Verifica</div>
    <div class="content-box">
        La verifica dell'apprendimento avverrà mediante test di valutazione finale.
    </div>
</div>
${makeFooter('Programma Corso')}
</body></html>`;

// ============================================================================
// TEMPLATE: Preventivo Design System V17 (BOTH brands)
// Design: professional navy/blue palette, tabular totals
// Compatible markers: vociHtml, totaliHtml, noteHtml, cliente.dettagliHtml,
//   tenant.logoHtml, tenant.*, preventivo.*, cliente.*
// ============================================================================
const PREVENTIVO_CONTENT = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Preventivo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #1e293b; padding: 40px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 18px; border-bottom: 2px solid #1d4ed8; }
    .logo-section { flex: 0 0 200px; }
    .logo-section img { max-width: 180px; max-height: 80px; object-fit: contain; }
    .org-info { text-align: right; flex: 1; }
    .org-name { font-size: 16pt; font-weight: 700; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.3px; }
    .org-details { font-size: 9pt; color: #64748b; line-height: 1.6; }

    /* Title */
    .document-title { text-align: center; font-size: 13pt; font-weight: 700; color: #1d4ed8; margin: 20px 0; padding: 10px 20px; background: #eff6ff; border-radius: 6px; border-left: 4px solid #1d4ed8; letter-spacing: 0.5px; }

    /* Sections */
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-title { font-size: 8.5pt; font-weight: 700; color: #0f172a; border-bottom: 2px solid #1d4ed8; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
    .content-box { background: #f8fafc; padding: 12px 14px; border-radius: 6px; border: 1px solid #e2e8f0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .info-row { display: flex; margin-bottom: 5px; }
    .info-label { font-weight: 600; width: 140px; color: #475569; font-size: 9pt; }
    .info-value { flex: 1; font-size: 9pt; color: #1e293b; }
    .label { color: #475569; font-size: 9pt; }
    .value { font-size: 9pt; color: #1e293b; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { background: #1e3a5f; color: #f8fafc; padding: 9px 10px; text-align: left; font-size: 9pt; font-weight: 600; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 9pt; }
    td.num { text-align: center; width: 35px; }
    td.qty { text-align: center; width: 45px; }
    td.price, td.total { text-align: right; width: 100px; font-variant-numeric: tabular-nums; }
    tr:nth-child(even) { background: #f8fafc; }

    /* Totals */
    .totals-section { margin-left: auto; margin-top: 12px; width: 300px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 14px; font-size: 9.5pt; background: #ffffff; }
    .total-row + .total-row { border-top: 1px solid #f1f5f9; }
    .total-row .label { color: #475569; flex: 1; }
    .total-row .value { text-align: right; min-width: 90px; font-variant-numeric: tabular-nums; font-weight: 500; }
    .total-row.original { color: #94a3b8; background: #f8fafc; }
    .total-row.original .label, .total-row.original .value { color: #94a3b8; text-decoration: line-through; font-weight: 400; }
    .total-row.discount .label, .total-row.discount .value { color: #16a34a; }
    .total-row.final { background: #1e3a5f; border-top: none !important; }
    .total-row.final .label, .total-row.final .value { color: #ffffff; font-weight: 700; font-size: 10.5pt; }

    /* Notes */
    .notes-box { background: #eff6ff; border-left: 3px solid #1d4ed8; padding: 10px 14px; border-radius: 4px; margin: 10px 0; }
    .notes-box h4 { color: #1e3a5f; margin-bottom: 6px; font-size: 9.5pt; font-weight: 600; }
    .notes-box p { font-size: 9pt; color: #334155; white-space: pre-wrap; }

    /* Signature */
    .signature-section { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .signature-box { text-align: center; width: 45%; }
    .signature-line { border-top: 1px solid #94a3b8; padding-top: 5px; margin-top: 60px; font-size: 8.5pt; color: #64748b; }

    /* Footer */
    .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; text-align: center; }

    /* Conditions list */
    .conditions-list { padding-left: 20px; font-size: 9pt; color: #334155; line-height: 1.7; }

    p { margin-bottom: 4px; }
  </style>
</head>
<body>

  <div class="header">
    <div class="logo-section">{{tenant.logoHtml}}</div>
    <div class="org-info">
      <div class="org-name">{{tenant.name}}</div>
      <div class="org-details">
        {{tenant.address}}<br>
        Tel: {{tenant.phone}} | Email: {{tenant.email}}<br>
        P.IVA: {{tenant.vatNumber}}
      </div>
    </div>
  </div>

  <div class="document-title">PREVENTIVO N&deg; {{preventivo.numero}}</div>

  <div class="section">
    <div class="info-grid">
      <div>
        <div class="section-title">Destinatario</div>
        <div class="content-box">
          <strong>{{cliente.ragioneSociale}}</strong><br>
          {{cliente.dettagliHtml}}
        </div>
      </div>
      <div>
        <div class="section-title">Dettagli Preventivo</div>
        <div class="content-box">
          <div class="info-row"><span class="info-label">N&deg; Preventivo:</span><span class="info-value">{{preventivo.numero}}</span></div>
          <div class="info-row"><span class="info-label">Data emissione:</span><span class="info-value">{{preventivo.dataEmissione}}</span></div>
          <div class="info-row"><span class="info-label">Scadenza:</span><span class="info-value">{{preventivo.dataValidita}}</span></div>
          <div class="info-row"><span class="info-label">Tipo servizio:</span><span class="info-value">{{preventivo.tipoServizio}}</span></div>
          {{preventivo.partecipantiHtml}}
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dettaglio Servizi</div>
    <table>
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Descrizione</th>
          <th class="qty">Qt&agrave;</th>
          <th class="price">Prezzo Unit.</th>
          <th class="total">Totale</th>
        </tr>
      </thead>
      <tbody>{{vociHtml}}</tbody>
    </table>
    <div class="totals-section">{{totaliHtml}}</div>
    <div style="clear:both;"></div>
  </div>

  {{noteHtml}}

  <div class="section">
    <div class="section-title">Condizioni</div>
    <div class="content-box">
      <ul class="conditions-list">
        <li>Il presente preventivo ha validit&agrave; 30 giorni dalla data di emissione</li>
        <li>Pagamento: {{preventivo.metodoPagamento}}</li>
        <li>I prezzi sono da intendersi IVA esclusa, salvo ove diversamente indicato</li>
      </ul>
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">Per {{tenant.name}}</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Per accettazione</div>
    </div>
  </div>

  <div class="footer">
    Documento generato il {{current.date}} &mdash; {{tenant.name}}<br>
    Preventivo &mdash; Questo documento &egrave; stato generato elettronicamente.
  </div>

</body>
</html>`;

// ============================================================================
// TEMPLATE: Visita Medica (MEDICA)
// ============================================================================
const VISITA_MEDICA_CONTENT = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><title>Referto Visita Medica</title>
<style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 10pt;
        line-height: 1.6;
        color: #1e293b;
        padding: 0;
        background: #fff;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
    }

    /* === PAGE WRAPPER === */
    .page-wrapper {
        position: relative;
        min-height: 100vh;
        padding: 28px 36px 80px 36px;
    }

    /* === HEADER === */
    .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 14px;
        border-bottom: 2.5px solid #0d9488;
        margin-bottom: 6px;
    }
    .header-left {
        display: flex;
        align-items: center;
        gap: 14px;
    }
    .header-logo {
        width: 64px;
        height: 64px;
        object-fit: contain;
        border-radius: 6px;
    }
    .header-org { line-height: 1.3; }
    .header-org-name {
        font-size: 16pt;
        font-weight: bold;
        color: #0d9488;
        letter-spacing: 0.3px;
    }
    .header-org-details {
        font-size: 8pt;
        color: #64748b;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.4;
    }
    .header-right { text-align: right; }
    .header-doc-type {
        font-size: 7.5pt;
        text-transform: uppercase;
        letter-spacing: 2.5px;
        color: #0d9488;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-weight: 700;
    }
    .header-date {
        font-size: 8.5pt;
        color: #64748b;
        margin-top: 3px;
        font-family: 'Helvetica Neue', Arial, sans-serif;
    }
    .header-ref {
        font-size: 7pt;
        color: #94a3b8;
        margin-top: 2px;
        font-family: 'Helvetica Neue', Arial, sans-serif;
    }

    /* === TITLE BAR === */
    .title-bar {
        background: linear-gradient(135deg, #0d9488 0%, #0f766e 60%, #115e59 100%);
        color: white;
        text-align: center;
        padding: 11px 20px;
        margin: 0 -36px 20px -36px;
        font-size: 12pt;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
        font-family: 'Helvetica Neue', Arial, sans-serif;
    }

    /* === INFO CARDS === */
    .info-cards {
        display: flex;
        gap: 14px;
        margin-bottom: 20px;
    }
    .info-card {
        flex: 1;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        background: #fff;
    }
    .info-card-header {
        background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
        padding: 5px 12px;
        font-size: 7.5pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        color: #0d9488;
        border-bottom: 1px solid #99f6e4;
        font-family: 'Helvetica Neue', Arial, sans-serif;
    }
    .info-card-body { padding: 8px 12px; }
    .info-row {
        display: flex;
        align-items: baseline;
        padding: 1.5px 0;
        font-size: 9pt;
    }
    .info-label {
        font-weight: 600;
        color: #475569;
        width: 105px;
        flex-shrink: 0;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 8pt;
    }
    .info-value {
        flex: 1;
        color: #1e293b;
    }

    /* === CLINICAL SECTIONS === */
    .clinical-section {
        margin-bottom: 16px;
        page-break-inside: avoid;
    }
    .section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
    }
    .section-indicator {
        width: 4px;
        height: 18px;
        border-radius: 2px;
    }
    .section-indicator-teal { background: #0d9488; }
    .section-indicator-blue { background: #2563eb; }
    .section-indicator-amber { background: #d97706; }
    .section-indicator-red { background: #dc2626; }
    .section-indicator-purple { background: #7c3aed; }
    .section-indicator-green { background: #059669; }
    .section-title {
        font-size: 10pt;
        font-weight: bold;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-family: 'Helvetica Neue', Arial, sans-serif;
    }
    .section-content {
        padding: 10px 14px;
        background: #f8fafc;
        border-left: 3px solid #99f6e4;
        border-radius: 0 6px 6px 0;
        font-size: 9.5pt;
        line-height: 1.7;
        color: #334155;
    }
    .section-content p { margin-bottom: 4px; }

    /* === VITALS GRID === */
    .vitali-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        padding: 10px;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
    }
    .vitali-item {
        text-align: center;
        padding: 8px 4px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
    }
    .vitali-value {
        font-size: 15pt;
        font-weight: bold;
        color: #0d9488;
        line-height: 1.2;
    }
    .vitali-label {
        font-size: 7pt;
        color: #64748b;
        margin-top: 2px;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }
    .vitali-unit {
        font-size: 8pt;
        color: #94a3b8;
        font-weight: normal;
    }

    /* === SIGNATURE SECTION === */
    .signatures-wrapper {
        margin-top: 36px;
        padding-top: 16px;
        border-top: 1px solid #e2e8f0;
    }
    .signatures-label {
        font-size: 7pt;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #94a3b8;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        margin-bottom: 12px;
    }
    .signatures-grid {
        display: flex;
        justify-content: space-between;
    }
    .sig-box {
        width: 44%;
        text-align: center;
    }
    .sig-image-area {
        min-height: 60px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding-bottom: 4px;
    }
    .sig-image {
        max-width: 180px;
        max-height: 60px;
        width: auto;
        height: auto;
        display: block;
        margin: 0 auto;
        object-fit: contain;
    }
    .sig-placeholder {
        font-size: 7pt;
        color: #cbd5e1;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-style: italic;
        padding-bottom: 4px;
    }
    .sig-line {
        border-top: 1px solid #334155;
        margin-top: 4px;
        padding-top: 5px;
    }
    .sig-name {
        font-size: 9.5pt;
        font-weight: bold;
        color: #1e293b;
    }
    .sig-detail {
        font-size: 7.5pt;
        color: #64748b;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        margin-top: 1px;
    }
    .sig-role {
        font-size: 7pt;
        color: #94a3b8;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 2px;
    }

    /* === FOOTER === */
    .page-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 8px 36px;
        border-top: 2px solid #0d9488;
        background: #fff;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 7pt;
        color: #94a3b8;
        font-family: 'Helvetica Neue', Arial, sans-serif;
    }
    .page-footer-left { text-align: left; }
    .page-footer-center { text-align: center; font-size: 6.5pt; }
    .page-footer-right { text-align: right; }

    /* === PRINT === */
    @media print {
        body { padding: 0; -webkit-print-color-adjust: exact !important; }
        .page-wrapper { padding: 24px 32px 70px 32px; }
    }
</style></head><body>
<div class="page-wrapper">

    <!-- HEADER -->
    <div class="header">
        <div class="header-left">
            {{#if tenant.logo}}<img src="{{tenant.logo}}" class="header-logo" alt="Logo">{{/if}}
            <div class="header-org">
                <div class="header-org-name">{{tenant.nome}}</div>
                <div class="header-org-details">
                    {{tenant.indirizzo}}<br>
                    Tel: {{tenant.telefono}} | Email: {{tenant.email}}<br>
                    P.IVA: {{tenant.partitaIva}} {{#if tenant.pec}}| PEC: {{tenant.pec}}{{/if}}
                </div>
            </div>
        </div>
        <div class="header-right">
            <div class="header-doc-type">Referto medico</div>
            <div class="header-date">{{visita.data}}</div>
            <div class="header-ref">Rif. {{visita.id}}</div>
        </div>
    </div>

    <!-- TITLE -->
    <div class="title-bar">Referto Visita Medica</div>

    <!-- PAZIENTE + VISITA CARDS -->
    <div class="info-cards">
        <div class="info-card">
            <div class="info-card-header">Dati Paziente</div>
            <div class="info-card-body">
                <div class="info-row"><span class="info-label">Cognome e Nome</span><span class="info-value"><strong>{{paziente.cognome}} {{paziente.nome}}</strong></span></div>
                <div class="info-row"><span class="info-label">Data di nascita</span><span class="info-value">{{paziente.dataNascita}}</span></div>
                {{#if paziente.luogoNascita}}<div class="info-row"><span class="info-label">Luogo nascita</span><span class="info-value">{{paziente.luogoNascita}}</span></div>{{/if}}
                <div class="info-row"><span class="info-label">Codice Fiscale</span><span class="info-value" style="font-family:monospace;font-size:8.5pt;">{{paziente.codiceFiscale}}</span></div>
                {{#if paziente.telefono}}<div class="info-row"><span class="info-label">Telefono</span><span class="info-value">{{paziente.telefono}}</span></div>{{/if}}
                {{#if paziente.indirizzo}}<div class="info-row"><span class="info-label">Indirizzo</span><span class="info-value">{{paziente.indirizzo}}, {{paziente.citta}} {{paziente.cap}}</span></div>{{/if}}
            </div>
        </div>
        <div class="info-card">
            <div class="info-card-header">Dati Visita</div>
            <div class="info-card-body">
                <div class="info-row"><span class="info-label">Data e Ora</span><span class="info-value">{{visita.data}} {{visita.ora}}</span></div>
                <div class="info-row"><span class="info-label">Tipo</span><span class="info-value">{{visita.tipo}}</span></div>
                <div class="info-row"><span class="info-label">Prestazione</span><span class="info-value">{{visita.prestazione}}</span></div>
                <div class="info-row"><span class="info-label">Medico</span><span class="info-value"><strong>{{medico.nomeCompleto}}</strong></span></div>
                {{#if medico.specializzazione}}<div class="info-row"><span class="info-label">Specializzazione</span><span class="info-value">{{medico.specializzazione}}</span></div>{{/if}}
                {{#if ambulatorio.nome}}<div class="info-row"><span class="info-label">Ambulatorio</span><span class="info-value">{{ambulatorio.nome}}</span></div>{{/if}}
            </div>
        </div>
    </div>

    <!-- CLINICAL SECTIONS -->
    {{#if anamnesi}}
    <div class="clinical-section">
        <div class="section-header"><div class="section-indicator section-indicator-teal"></div><div class="section-title">Anamnesi</div></div>
        <div class="section-content">{{{anamnesi}}}</div>
    </div>
    {{/if}}

    {{#if esameObiettivo}}
    <div class="clinical-section">
        <div class="section-header"><div class="section-indicator section-indicator-blue"></div><div class="section-title">Esame Obiettivo</div></div>
        <div class="section-content">{{{esameObiettivo}}}</div>
    </div>
    {{/if}}

    {{#if vitali.hasAny}}
    <div class="clinical-section">
        <div class="section-header"><div class="section-indicator section-indicator-green"></div><div class="section-title">Parametri Vitali</div></div>
        <div class="vitali-grid">
            {{#if vitali.peso}}<div class="vitali-item"><div class="vitali-value">{{vitali.peso}} <span class="vitali-unit">kg</span></div><div class="vitali-label">Peso</div></div>{{/if}}
            {{#if vitali.altezza}}<div class="vitali-item"><div class="vitali-value">{{vitali.altezza}} <span class="vitali-unit">cm</span></div><div class="vitali-label">Altezza</div></div>{{/if}}
            {{#if vitali.bmi}}<div class="vitali-item"><div class="vitali-value">{{vitali.bmi}}</div><div class="vitali-label">BMI</div></div>{{/if}}
            {{#if vitali.pressioneSistolica}}<div class="vitali-item"><div class="vitali-value">{{vitali.pressioneSistolica}}{{#if vitali.pressioneDiastolica}}/{{vitali.pressioneDiastolica}}{{/if}}</div><div class="vitali-label">Pressione (mmHg)</div></div>{{/if}}
            {{#if vitali.frequenzaCardiaca}}<div class="vitali-item"><div class="vitali-value">{{vitali.frequenzaCardiaca}}</div><div class="vitali-label">FC (bpm)</div></div>{{/if}}
            {{#if vitali.temperatura}}<div class="vitali-item"><div class="vitali-value">{{vitali.temperatura}}</div><div class="vitali-label">Temp. (°C)</div></div>{{/if}}
            {{#if vitali.saturazione}}<div class="vitali-item"><div class="vitali-value">{{vitali.saturazione}}</div><div class="vitali-label">SpO₂ (%)</div></div>{{/if}}
            {{#if vitali.glicemia}}<div class="vitali-item"><div class="vitali-value">{{vitali.glicemia}}</div><div class="vitali-label">Glicemia (mg/dL)</div></div>{{/if}}
        </div>
    </div>
    {{/if}}

    {{#if diagnosiPrincipale}}
    <div class="clinical-section">
        <div class="section-header"><div class="section-indicator section-indicator-red"></div><div class="section-title">Diagnosi</div></div>
        <div class="section-content">{{{diagnosiPrincipale}}}</div>
    </div>
    {{/if}}

    {{#if diagnosiSecondarie}}
    <div class="clinical-section">
        <div class="section-header"><div class="section-indicator section-indicator-amber"></div><div class="section-title">Diagnosi Secondarie</div></div>
        <div class="section-content">{{{diagnosiSecondarie}}}</div>
    </div>
    {{/if}}

    {{#if terapia}}
    <div class="clinical-section">
        <div class="section-header"><div class="section-indicator section-indicator-purple"></div><div class="section-title">Terapia Prescritta</div></div>
        <div class="section-content">{{{terapia}}}</div>
    </div>
    {{/if}}

    {{#if prescrizioni}}
    <div class="clinical-section">
        <div class="section-header"><div class="section-indicator section-indicator-blue"></div><div class="section-title">Prescrizioni</div></div>
        <div class="section-content">{{{prescrizioni}}}</div>
    </div>
    {{/if}}

    {{#if note}}
    <div class="clinical-section">
        <div class="section-header"><div class="section-indicator section-indicator-teal"></div><div class="section-title">Note</div></div>
        <div class="section-content">{{{note}}}</div>
    </div>
    {{/if}}

    {{#if noteFollowup}}
    <div class="clinical-section">
        <div class="section-header"><div class="section-indicator section-indicator-green"></div><div class="section-title">Follow-up</div></div>
        <div class="section-content">
            {{#if prossimoControllo}}<p style="margin-bottom:6px;"><strong>Prossimo controllo:</strong> {{prossimoControllo}}</p>{{/if}}
            {{{noteFollowup}}}
        </div>
    </div>
    {{/if}}

    <!-- SIGNATURES -->
    <div class="signatures-wrapper">
        <div class="signatures-label">Firme</div>
        <div class="signatures-grid">
            <div class="sig-box">
                <div class="sig-image-area">
                    {{#if firma.paziente}}<img src="{{{firma.paziente}}}" class="sig-image" alt="Firma paziente">{{else}}<div class="sig-placeholder">Firma paziente</div>{{/if}}
                </div>
                <div class="sig-line">
                    <div class="sig-name">{{firma.pazienteNome}}</div>
                    <div class="sig-role">Paziente</div>
                </div>
            </div>
            <div class="sig-box">
                <div class="sig-image-area">
                    {{#if firma.medico}}<img src="{{{firma.medico}}}" class="sig-image" alt="Firma medico">{{else}}<div class="sig-placeholder">Firma medico</div>{{/if}}
                </div>
                <div class="sig-line">
                    <div class="sig-name">{{medico.nomeCompleto}}</div>
                    {{#if medico.specializzazione}}<div class="sig-detail">Specialista in {{medico.specializzazione}}</div>{{/if}}
                    {{#if medico.albo}}<div class="sig-detail">OMCeO: {{medico.albo}}</div>{{/if}}
                    <div class="sig-role">Medico Refertante</div>
                </div>
            </div>
        </div>
    </div>

</div>

<!-- FOOTER -->
<div class="page-footer">
    <div class="page-footer-left">{{tenant.nome}} — P.IVA {{tenant.partitaIva}}</div>
    <div class="page-footer-center">Documento riservato — Dato personale sanitario ex art. 9 GDPR</div>
    <div class="page-footer-right">Generato il {{current.date}}</div>
</div>
</body></html>`;

// ============================================================================
// TEMPLATE: Giudizio di Idoneità MDL (MEDICA — Medicina del Lavoro)
// ============================================================================
const GIUDIZIO_IDONEITA_MDL_CONTENT = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><title>Giudizio di Idoneità alla Mansione</title>
<style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 10pt;
        line-height: 1.6;
        color: #1e293b;
        padding: 0;
        background: #fff;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    .page-wrapper { position: relative; min-height: 100vh; padding: 28px 36px 80px 36px; }

    /* Header istituzionale */
    .header-wrapper { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px; }
    .header-left { flex: 1; }
    .header-logo img { max-height: 70px; max-width: 200px; object-fit: contain; }
    .header-right { text-align: right; font-size: 8.5pt; color: #475569; line-height: 1.5; }
    .tenant-name { font-size: 13pt; font-weight: bold; color: #0d9488; }
    .tenant-details { font-size: 8.5pt; color: #64748b; margin-top: 2px; }

    /* Titolo documento */
    .doc-title-bar {
        background: #0d9488;
        color: #fff;
        text-align: center;
        font-size: 13pt;
        font-weight: bold;
        letter-spacing: 1px;
        padding: 10px 20px;
        border-radius: 4px;
        margin-bottom: 4px;
        text-transform: uppercase;
    }
    .doc-subtitle { text-align: center; font-size: 8pt; color: #64748b; margin-bottom: 18px; }

    /* Info cards affiancate */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
    .info-card { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    .info-card-header { background: #f0fdfa; border-bottom: 1px solid #e2e8f0; font-size: 8.5pt; font-weight: bold; color: #0d9488; padding: 6px 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-card-body { padding: 10px 12px; }
    .info-row { display: flex; gap: 6px; margin-bottom: 4px; font-size: 9pt; }
    .info-label { color: #64748b; min-width: 130px; font-size: 8.5pt; }
    .info-value { color: #1e293b; font-weight: 500; }

    /* Box giudizio — colore dinamico */
    .giudizio-box {
        border: 3px solid #0d9488;
        border-radius: 8px;
        padding: 16px 20px;
        margin-bottom: 18px;
        text-align: center;
    }
    .giudizio-title { font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .giudizio-esito { font-size: 14pt; font-weight: bold; color: #0d9488; }
    .giudizio-esito.non-idoneo { color: #dc2626; border-color: #dc2626; }
    .giudizio-esito.temp-non-idoneo { color: #f59e0b; }

    /* Sezioni cliniche */
    .clinical-section { margin-bottom: 14px; page-break-inside: avoid; }
    .section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .section-indicator { width: 4px; height: 18px; border-radius: 2px; flex-shrink: 0; }
    .section-indicator-teal { background: #0d9488; }
    .section-indicator-red { background: #dc2626; }
    .section-indicator-amber { background: #f59e0b; }
    .section-indicator-blue { background: #3b82f6; }
    .section-title { font-size: 9.5pt; font-weight: bold; color: #1e40af; letter-spacing: 0.3px; }
    .section-content { padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 9.5pt; line-height: 1.7; white-space: pre-wrap; }

    /* Note normativa */
    .normativa-note { font-size: 8pt; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 14px; text-align: justify; font-style: italic; }

    /* Firme */
    .signatures-wrapper { margin-top: 24px; page-break-inside: avoid; }
    .signatures-label { font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .sig-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; text-align: center; }
    .sig-image-area { height: 60px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
    .sig-image { max-height: 55px; max-width: 180px; object-fit: contain; }
    .sig-placeholder { height: 55px; border-bottom: 1px dashed #94a3b8; width: 80%; margin: 0 auto; }
    .sig-name { font-weight: bold; font-size: 9.5pt; }
    .sig-detail { font-size: 8pt; color: #64748b; }
    .sig-role { font-size: 8pt; color: #0d9488; font-weight: bold; margin-top: 2px; }
    .sig-date { font-size: 8pt; color: #64748b; margin-top: 4px; }

    /* Footer pagina */
    .page-footer { position: fixed; bottom: 0; left: 0; right: 0; height: 60px; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 36px 12px; border-top: 1px solid #e2e8f0; font-size: 7.5pt; color: #94a3b8; }
</style>
</head>
<body>
<div class="page-wrapper">

    <!-- INTESTAZIONE -->
    <div class="header-wrapper">
        <div class="header-left">
            <div class="header-logo">
                {{{tenant.logoHtml}}}
            </div>
        </div>
        <div class="header-right">
            <div class="tenant-name">{{tenant.nome}}</div>
            <div class="tenant-details">{{tenant.indirizzoCompleto}}</div>
            <div class="tenant-details">Tel. {{tenant.telefono}} | {{tenant.email}}</div>
            <div class="tenant-details">P.IVA {{tenant.partitaIva}}</div>
        </div>
    </div>

    <!-- TITOLO DOCUMENTO -->
    <div class="doc-title-bar">Giudizio di Idoneità alla Mansione Specifica</div>
    <div class="doc-subtitle">ai sensi del D.Lgs. 9 aprile 2008 n. 81, art. 41 comma 6 e s.m.i.</div>

    <!-- DATI PAZIENTE + VISITA -->
    <div class="info-grid">
        <div class="info-card">
            <div class="info-card-header">Dati Lavoratore</div>
            <div class="info-card-body">
                <div class="info-row"><span class="info-label">Cognome e Nome</span><span class="info-value"><strong>{{paziente.cognome}} {{paziente.nome}}</strong></span></div>
                <div class="info-row"><span class="info-label">Data di nascita</span><span class="info-value">{{paziente.dataNascita}}</span></div>
                <div class="info-row"><span class="info-label">Codice Fiscale</span><span class="info-value" style="font-family:monospace;">{{paziente.codiceFiscale}}</span></div>
                {{#if paziente.indirizzo}}<div class="info-row"><span class="info-label">Residenza</span><span class="info-value">{{paziente.indirizzo}}, {{paziente.citta}}</span></div>{{/if}}
            </div>
        </div>
        <div class="info-card">
            <div class="info-card-header">Dati Visita</div>
            <div class="info-card-body">
                <div class="info-row"><span class="info-label">Data visita</span><span class="info-value">{{visita.data}}</span></div>
                <div class="info-row"><span class="info-label">Tipo visita</span><span class="info-value">{{visita.tipo}}</span></div>
                <div class="info-row"><span class="info-label">Medico Competente</span><span class="info-value"><strong>{{medico.nomeCompleto}}</strong></span></div>
                {{#if medico.albo}}<div class="info-row"><span class="info-label">N° Iscrizione OMCeO</span><span class="info-value">{{medico.albo}}</span></div>{{/if}}
                {{#if ambulatorio.nome}}<div class="info-row"><span class="info-label">Ambulatorio</span><span class="info-value">{{ambulatorio.nome}}</span></div>{{/if}}
            </div>
        </div>
    </div>

    <!-- GIUDIZIO DI IDONEITÀ -->
    {{#if mdl.giudizioLabel}}
    <div class="giudizio-box" style="{{#if mdl.isNonIdoneo}}border-color:#dc2626;{{/if}}{{#if mdl.isTemporaneamenteNonIdoneo}}border-color:#f59e0b;{{/if}}">
        <div class="giudizio-title">Il Medico Competente esprime il seguente giudizio:</div>
        <div class="giudizio-esito {{#if mdl.isNonIdoneo}}non-idoneo{{/if}} {{#if mdl.isTemporaneamenteNonIdoneo}}temp-non-idoneo{{/if}}" style="{{#if mdl.isNonIdoneo}}color:#dc2626;{{/if}}{{#if mdl.isTemporaneamenteNonIdoneo}}color:#f59e0b;{{/if}}">
            {{mdl.giudizioLabel}}
        </div>
    </div>
    {{/if}}

    <!-- PRESCRIZIONI DALLA NORMATIVA -->
    {{#if mdl.prescrizioniIdoneita}}
    <div class="clinical-section">
        <div class="section-header">
            <div class="section-indicator section-indicator-red"></div>
            <div class="section-title">Prescrizioni ai sensi della Normativa (art. 41 c. 5 D.Lgs 81/08)</div>
        </div>
        <div class="section-content">{{mdl.prescrizioniIdoneita}}</div>
    </div>
    {{/if}}

    <!-- LIMITAZIONI ALLA MANSIONE -->
    {{#if mdl.limitazioni}}
    <div class="clinical-section">
        <div class="section-header">
            <div class="section-indicator section-indicator-amber"></div>
            <div class="section-title">Limitazioni alla Mansione Specifica</div>
        </div>
        <div class="section-content">{{mdl.limitazioni}}</div>
    </div>
    {{/if}}

    <!-- ESAMI PROGRAMMATI PROSSIMA VISITA -->
    {{#if mdl.esamiProssimaVisita}}
    <div class="clinical-section">
        <div class="section-header">
            <div class="section-indicator section-indicator-blue"></div>
            <div class="section-title">Accertamenti da eseguire alla prossima visita</div>
        </div>
        <div class="section-content">{{mdl.esamiProssimaVisita}}</div>
    </div>
    {{/if}}

    <!-- TEMPISTICA GIUDIZIO -->
    {{#if mdl.tempistica}}
    <div class="clinical-section">
        <div class="section-header">
            <div class="section-indicator section-indicator-teal"></div>
            <div class="section-title">Tempistica del giudizio</div>
        </div>
        <div class="section-content">{{mdl.tempistica}}</div>
    </div>
    {{/if}}

    <!-- NOTE NORMATIVA -->
    <div class="normativa-note">
        Il presente giudizio è emesso ai sensi dell'art. 41, comma 6, del D.Lgs. 81/2008 e successive modificazioni ed integrazioni.
        Il lavoratore e il datore di lavoro possono ricorrere avverso il giudizio, entro trenta giorni dalla data di comunicazione,
        all'organo di vigilanza territorialmente competente che dispone, dopo opportuni accertamenti, la conferma, la modifica o
        la revoca del giudizio stesso (art. 41, comma 9, D.Lgs. 81/2008).
        Documento riservato — Dato personale sanitario ai sensi dell'art. 9 GDPR 2016/679.
    </div>

    <!-- FIRME -->
    <div class="signatures-wrapper">
        <div class="signatures-label">Firme</div>
        <div class="signatures-grid">
            <div class="sig-box">
                <div class="sig-image-area">
                    {{#if firma.paziente}}<img src="{{{firma.paziente}}}" class="sig-image" alt="Firma lavoratore">{{else}}<div class="sig-placeholder"></div>{{/if}}
                </div>
                <div class="sig-name">{{firma.pazienteNome}}</div>
                <div class="sig-role">Firma del Lavoratore</div>
                <div class="sig-detail">per presa visione del giudizio</div>
                <div class="sig-date">Data: {{visita.data}}</div>
            </div>
            <div class="sig-box">
                <div class="sig-image-area">
                    {{#if firma.medico}}<img src="{{{firma.medico}}}" class="sig-image" alt="Firma medico competente">{{else}}<div class="sig-placeholder"></div>{{/if}}
                </div>
                <div class="sig-name">{{medico.nomeCompleto}}</div>
                <div class="sig-detail">Medico Competente</div>
                {{#if medico.albo}}<div class="sig-detail">OMCeO n° {{medico.albo}}</div>{{/if}}
                <div class="sig-role">Firma e Timbro</div>
                <div class="sig-date">Data: {{visita.data}}</div>
            </div>
        </div>
    </div>

</div>

<!-- FOOTER PAGINA -->
<div class="page-footer">
    <div>{{tenant.nome}} — P.IVA {{tenant.partitaIva}}</div>
    <div>Giudizio di Idoneità — Documento riservato — art. 9 GDPR</div>
    <div>Generato il {{current.date}}</div>
</div>
</body></html>`;

// ============================================================================
// TEMPLATE: Fattura (BOTH)
// ============================================================================
const INVOICE_CONTENT = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><title>Fattura</title>
<style>${COMMON_STYLES}
    :root { --brand-color: #7c3aed; --brand-bg: #f5f3ff; --brand-light: #c4b5fd; }
    .totals-table { width: auto; margin-left: auto; margin-top: 15px; }
    .totals-table td { padding: 5px 15px; text-align: right; }
    .totals-table .total-row { font-weight: bold; font-size: 12pt; color: var(--brand-color); border-top: 2px solid var(--brand-color); }
</style></head><body>
${makeHeader()}
<div class="document-title">FATTURA N° {{documento.numero}} del {{documento.data}}</div>

<div class="section">
    <div class="info-grid">
        <div>
            <div class="section-title">Destinatario</div>
            <div class="content-box">
                <strong>{{company.name}}</strong><br>
                {{company.address}}<br>
                P.IVA: {{company.vatNumber}}<br>
                C.F.: {{company.fiscalCode}}<br>
                {{#if company.pec}}PEC: {{company.pec}}<br>{{/if}}
                {{#if company.sdi}}SDI: {{company.sdi}}{{/if}}
            </div>
        </div>
        <div>
            <div class="section-title">Dati Fattura</div>
            <div class="content-box">
                <div class="info-row"><span class="info-label">Numero:</span><span class="info-value">{{documento.numero}}</span></div>
                <div class="info-row"><span class="info-label">Data:</span><span class="info-value">{{documento.data}}</span></div>
                <div class="info-row"><span class="info-label">Scadenza:</span><span class="info-value">{{documento.scadenza}}</span></div>
                <div class="info-row"><span class="info-label">Pagamento:</span><span class="info-value">{{documento.metodoPagamento}}</span></div>
            </div>
        </div>
    </div>
</div>

<div class="section">
    <div class="section-title">Dettaglio</div>
    <table>
        <thead>
            <tr><th>#</th><th>Descrizione</th><th>Qtà</th><th>Prezzo Unit.</th><th>IVA</th><th>Totale</th></tr>
        </thead>
        <tbody>
            {{#each vociFattura}}
            <tr>
                <td>{{@index}}</td>
                <td>{{this.descrizione}}</td>
                <td>{{this.quantita}}</td>
                <td style="text-align:right;">€ {{this.prezzoUnitario}}</td>
                <td>{{this.aliquotaIva}}%</td>
                <td style="text-align:right;">€ {{this.totale}}</td>
            </tr>
            {{/each}}
        </tbody>
    </table>

    <table class="totals-table">
        <tr><td>Imponibile:</td><td>€ {{fattura.imponibile}}</td></tr>
        <tr><td>IVA:</td><td>€ {{fattura.iva}}</td></tr>
        {{#if fattura.bollo}}<tr><td>Bollo:</td><td>€ {{fattura.bollo}}</td></tr>{{/if}}
        <tr class="total-row"><td>TOTALE:</td><td>€ {{fattura.totale}}</td></tr>
    </table>
</div>

<div class="section">
    <div class="content-box" style="font-size:8pt; color:#64748b;">
        Contributo INPS: ove applicabile. Operazione in regime forfettario ex art. 1, commi 54-89, Legge 190/2014 — non soggetta a ritenuta d'acconto.
    </div>
</div>
${makeFooter('Fattura')}
</body></html>`;

// ============================================================================
// DEFAULT TEMPLATES DEFINITION
// ============================================================================

const DEFAULT_TEMPLATES = [
    // === FORMAZIONE (ElementSicurezza) ===
    {
        name: 'Lettera di Incarico — Standard',
        type: 'LETTER_OF_ENGAGEMENT',
        content: LETTER_OF_ENGAGEMENT_CONTENT,
        description: 'Template predefinito per lettere di incarico docente. Usa placeholder per dati corso, docente e organizzazione.',
        isDefault: true,
        fileFormat: 'HTML',
        category: 'formazione',
        tags: ['formazione', 'incarico', 'docente', 'predefinito']
    },
    {
        name: 'Registro Presenze Default',
        type: 'ATTENDANCE_REGISTER',
        content: ATTENDANCE_REGISTER_CONTENT,
        description: 'Template predefinito per registro presenze. Include intestazione corso, istruzioni compilazione e tabella presenze con firme.',
        isDefault: true,
        fileFormat: 'HTML',
        category: 'formazione',
        tags: ['formazione', 'presenze', 'registro', 'predefinito']
    },
    {
        name: 'Programma Corso — Standard',
        type: 'COURSE_PROGRAM',
        content: COURSE_PROGRAM_CONTENT,
        description: 'Template predefinito per programma corso. Include moduli, calendario sessioni e obiettivi formativi.',
        isDefault: true,
        fileFormat: 'HTML',
        category: 'formazione',
        tags: ['formazione', 'programma', 'corso', 'predefinito']
    },
    // === CLINICA (ElementMedica) ===
    {
        name: 'Referto Visita Medica — Standard',
        type: 'VISITA_MEDICA',
        content: VISITA_MEDICA_CONTENT,
        description: 'Template predefinito per referto visita medica. Include sezioni anamnesi, esame obiettivo, diagnosi, terapia e follow-up.',
        isDefault: true,
        fileFormat: 'HTML',
        category: 'clinica',
        tags: ['clinica', 'visita', 'referto', 'medica', 'predefinito']
    },
    {
        name: 'Giudizio di Idoneità MDL — Standard',
        type: 'GIUDIZIO_IDONEITA',
        content: GIUDIZIO_IDONEITA_MDL_CONTENT,
        description: 'Template predefinito per giudizio di idoneità alla mansione specifica (Medicina del Lavoro). Conforme D.Lgs. 81/08 art. 41 c.6. Include sezioni: giudizio, prescrizioni, limitazioni, periodicità sorveglianza, firme medico competente e lavoratore.',
        isDefault: true,
        fileFormat: 'HTML',
        category: 'clinica',
        tags: ['clinica', 'mdl', 'medicina del lavoro', 'giudizio', 'idoneità', 'predefinito']
    },
    {
        name: 'Nomine Figure Sicurezza e MDL — Standard',
        type: 'CUSTOM',
        content: MDL_NOMINE_FIGURE_CONTENT,
        description: 'Template predefinito per nomina Medico Competente, Medici Competenti Coordinati e RSPP con clausola di tacito rinnovo.',
        isDefault: true,
        fileFormat: 'HTML',
        category: 'clinica',
        tags: ['clinica', 'mdl', 'nomine', 'medico competente', 'rspp', 'predefinito']
    },
    // === BOTH ===
    {
        name: 'Attestato di Formazione — Standard',
        type: 'CERTIFICATE',
        content: CERTIFICATE_CONTENT,
        description: 'Template predefinito per attestati e certificati. Layout formale con bordo decorativo.',
        isDefault: true,
        fileFormat: 'HTML',
        category: 'entrambi',
        tags: ['attestato', 'certificato', 'formazione', 'predefinito']
    },
    {
        name: 'Preventivo Design System V17',
        type: 'PREVENTIVO',
        content: PREVENTIVO_CONTENT,
        description: 'Template predefinito per preventivi. Layout professionale navy/blue con tabella allineata e totali tabulari.',
        isDefault: true,
        fileFormat: 'HTML',
        category: 'entrambi',
        tags: ['preventivo', 'offerta', 'predefinito']
    },
    {
        name: 'Fattura — Standard',
        type: 'INVOICE',
        content: INVOICE_CONTENT,
        description: 'Template predefinito per fatture. Include dettaglio voci, IVA e totali.',
        isDefault: true,
        fileFormat: 'HTML',
        category: 'entrambi',
        tags: ['fattura', 'invoice', 'contabilità', 'predefinito']
    }
];

// ============================================================================
// SERVICE CLASS
// ============================================================================

class DefaultTemplateService {

    /**
     * Crea tutti i template predefiniti per un nuovo tenant.
     * Chiamato da TenantService.createTenant() dopo la creazione del tenant.
     * 
     * @param {string} tenantId - ID del tenant appena creato
     * @returns {Promise<Object>} Risultato con numero template creati
     */
    static async createDefaultTemplates(tenantId) {
        const results = { created: 0, skipped: 0, errors: [] };

        try {
            logger.info({ tenantId }, 'Creazione template predefiniti per nuovo tenant');

            for (const templateDef of DEFAULT_TEMPLATES) {
                try {
                    // Verifica se esiste già un template dello stesso tipo (idempotente)
                    const existing = await prisma.templateLink.findFirst({
                        where: {
                            tenantId,
                            type: templateDef.type,
                            ...(templateDef.type === 'CUSTOM' ? { name: templateDef.name } : {}),
                            isDefault: true,
                            deletedAt: null
                        }
                    });

                    if (existing) {
                        results.skipped++;
                        continue;
                    }

                    await prisma.templateLink.create({
                        data: {
                            name: templateDef.name,
                            type: templateDef.type,
                            url: '',
                            content: templateDef.content,
                            description: templateDef.description,
                            isDefault: templateDef.isDefault,
                            isActive: true,
                            fileFormat: templateDef.fileFormat,
                            category: templateDef.category,
                            tags: templateDef.tags,
                            tenantId,
                            version: 1
                        }
                    });

                    results.created++;
                } catch (templateError) {
                    results.errors.push({
                        type: templateDef.type,
                        error: templateError.message
                    });
                    logger.error({
                        tenantId,
                        templateType: templateDef.type,
                        error: templateError.message
                    }, 'Errore creazione template predefinito');
                }
            }

            logger.info({
                tenantId,
                created: results.created,
                skipped: results.skipped,
                errors: results.errors.length
            }, 'Template predefiniti creati');

            return results;
        } catch (error) {
            logger.error({ tenantId, error: error.message }, 'Errore creazione template predefiniti');
            throw error;
        }
    }

    /**
     * Crea template predefiniti per un tenant esistente (se mancanti).
     * Utile per migrazioni e per aggiungere template a tenant già esistenti.
     * 
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<Object>} Risultato con numero template creati/skippati
     */
    static async ensureDefaultTemplates(tenantId) {
        return this.createDefaultTemplates(tenantId);
    }

    /**
     * Crea template predefiniti per TUTTI i tenant attivi.
     * Utile per migrazioni batch.
     * 
     * @returns {Promise<Object>} Risultato aggregato
     */
    static async seedAllTenants() {
        const tenants = await prisma.tenant.findMany({
            where: { isActive: true, deletedAt: null },
            select: { id: true, name: true }
        });

        const results = { tenants: 0, totalCreated: 0, totalSkipped: 0, errors: [] };

        for (const tenant of tenants) {
            try {
                const result = await this.createDefaultTemplates(tenant.id);
                results.tenants++;
                results.totalCreated += result.created;
                results.totalSkipped += result.skipped;
                if (result.errors.length > 0) {
                    results.errors.push({ tenantId: tenant.id, tenantName: tenant.name, errors: result.errors });
                }
            } catch (error) {
                results.errors.push({ tenantId: tenant.id, tenantName: tenant.name, error: error.message });
            }
        }

        logger.info(results, 'Seed template predefiniti completato per tutti i tenant');
        return results;
    }

    /**
     * Aggiorna i template predefiniti di un tenant con il contenuto più recente.
     * Aggiorna SOLO i template con isDefault=true per non sovrascrivere personalizzazioni.
     * Incrementa la versione ad ogni aggiornamento.
     *
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<Object>} Risultato con numero template aggiornati
     */
    static async updateDefaultTemplates(tenantId) {
        const results = { updated: 0, skipped: 0, errors: [] };

        try {
            logger.info({ tenantId }, 'Aggiornamento template predefiniti');

            for (const templateDef of DEFAULT_TEMPLATES) {
                try {
                    const existing = await prisma.templateLink.findFirst({
                        where: {
                            tenantId,
                            type: templateDef.type,
                            isDefault: true,
                            deletedAt: null
                        }
                    });

                    if (!existing) {
                        // Non esiste: crealo
                        await prisma.templateLink.create({
                            data: {
                                name: templateDef.name,
                                type: templateDef.type,
                                url: '',
                                content: templateDef.content,
                                description: templateDef.description,
                                isDefault: templateDef.isDefault,
                                isActive: true,
                                fileFormat: templateDef.fileFormat,
                                category: templateDef.category,
                                tags: templateDef.tags,
                                tenantId,
                                version: 1
                            }
                        });
                        results.updated++;
                        continue;
                    }

                    // Rispetta contenuti personalizzati (canvas/slide, htmlEditor)
                    // Se il contenuto è JSON custom, non sovrascrivere con HTML hardcoded
                    const trimmedContent = (existing.content || '').trim();
                    const isCustomFormat = trimmedContent.startsWith('{') || trimmedContent.startsWith('[');
                    if (isCustomFormat) {
                        results.skipped++;
                        logger.debug({ tenantId, type: templateDef.type }, 'Template con formato personalizzato, skip aggiornamento');
                        continue;
                    }

                    // Aggiorna solo se il contenuto HTML è diverso dal default attuale
                    if (existing.content === templateDef.content) {
                        results.skipped++;
                        continue;
                    }

                    await prisma.templateLink.update({
                        where: { id: existing.id },
                        data: {
                            content: templateDef.content,
                            version: (existing.version || 1) + 1,
                            updatedAt: new Date()
                        }
                    });

                    results.updated++;
                } catch (templateError) {
                    results.errors.push({
                        type: templateDef.type,
                        error: templateError.message
                    });
                    logger.error({
                        tenantId,
                        templateType: templateDef.type,
                        error: templateError.message
                    }, 'Errore aggiornamento template predefinito');
                }
            }

            logger.info({
                tenantId,
                updated: results.updated,
                skipped: results.skipped,
                errors: results.errors.length
            }, 'Template predefiniti aggiornati');

            return results;
        } catch (error) {
            logger.error({ tenantId, error: error.message }, 'Errore aggiornamento template predefiniti');
            throw error;
        }
    }

    /**
     * Verifica e crea template predefiniti mancanti per TUTTI i tenant attivi.
     * NON sovrascrive template esistenti (sicuro per custom content).
     * Chiamato all'avvio del server.
     *
     * @returns {Promise<Object>} Risultato aggregato
     */
    static async ensureAllTenants() {
        const tenants = await prisma.tenant.findMany({
            where: { isActive: true, deletedAt: null },
            select: { id: true, name: true }
        });

        const results = { tenants: 0, totalCreated: 0, totalSkipped: 0, errors: [] };

        for (const tenant of tenants) {
            try {
                const result = await this.ensureDefaultTemplates(tenant.id);
                results.tenants++;
                results.totalCreated += result.created;
                results.totalSkipped += result.skipped;
            } catch (error) {
                results.errors.push({ tenantId: tenant.id, tenantName: tenant.name, error: error.message });
            }
        }

        logger.info(results, 'Verifica template predefiniti completata per tutti i tenant');
        return results;
    }

    /**
     * Aggiorna template predefiniti per TUTTI i tenant attivi.
     * Da usare MANUALMENTE dopo aggiornamenti al codice dei template.
     * Rispetta contenuti personalizzati (canvas/slide, htmlEditor).
     *
     * @returns {Promise<Object>} Risultato aggregato
     */
    static async updateAllTenants() {
        const tenants = await prisma.tenant.findMany({
            where: { isActive: true, deletedAt: null },
            select: { id: true, name: true }
        });

        const results = { tenants: 0, totalUpdated: 0, totalSkipped: 0, errors: [] };

        for (const tenant of tenants) {
            try {
                const result = await this.updateDefaultTemplates(tenant.id);
                results.tenants++;
                results.totalUpdated += result.updated;
                results.totalSkipped += result.skipped;
                if (result.errors.length > 0) {
                    results.errors.push({ tenantId: tenant.id, tenantName: tenant.name, errors: result.errors });
                }
            } catch (error) {
                results.errors.push({ tenantId: tenant.id, tenantName: tenant.name, error: error.message });
            }
        }

        logger.info(results, 'Aggiornamento template predefiniti completato per tutti i tenant');
        return results;
    }

    /**
     * Forza l'aggiornamento del template ATTENDANCE_REGISTER a tutti i tenant.
     * Aggiorna SOLO template con isDefault=true e formato HTML (non JSON personalizzati).
     * Usato per propagare la nuova versione del Registro Presenze Default.
     *
     * @returns {Promise<Object>} Risultato con conteggi e errori
     */
    static async forceUpdateAttendanceRegisterDefault() {
        const templateDef = DEFAULT_TEMPLATES.find(t => t.type === 'ATTENDANCE_REGISTER');
        if (!templateDef) {
            return { updated: 0, skipped: 0, errors: ['Template ATTENDANCE_REGISTER non trovato in DEFAULT_TEMPLATES'] };
        }

        // Fetch all default ATTENDANCE_REGISTER templates not in JSON/custom format
        const existing = await prisma.templateLink.findMany({
            where: { type: 'ATTENDANCE_REGISTER', isDefault: true, deletedAt: null },
            select: { id: true, content: true, version: true }
        });

        let updated = 0;
        let skipped = 0;
        const errors = [];

        for (const tpl of existing) {
            const trimmed = (tpl.content || '').trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                skipped++;
                continue;
            }
            try {
                await prisma.templateLink.update({
                    where: { id: tpl.id },
                    data: {
                        content: templateDef.content,
                        name: templateDef.name,
                        description: templateDef.description,
                        version: (tpl.version || 1) + 1,
                        updatedAt: new Date()
                    }
                });
                updated++;
            } catch (err) {
                errors.push({ id: tpl.id, error: err.message });
                logger.error({ templateId: tpl.id, error: err.message }, 'Errore force-update ATTENDANCE_REGISTER');
            }
        }

        logger.info({ updated, skipped, errors: errors.length }, 'Force-update ATTENDANCE_REGISTER completato');
        return { updated, skipped, errors };
    }

    /**
     * Restituisce la definizione dei template predefiniti (senza contenuto).
     * Utile per UI di gestione.
     */
    static getTemplateDefinitions() {
        return DEFAULT_TEMPLATES.map(t => ({
            name: t.name,
            type: t.type,
            description: t.description,
            category: t.category,
            tags: t.tags
        }));
    }
}

export default DefaultTemplateService;
