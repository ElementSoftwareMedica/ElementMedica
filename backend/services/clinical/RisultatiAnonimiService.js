/**
 * RisultatiAnonimiService
 * 
 * R17: Genera le statistiche anonime collettive per una azienda (CompanyTenantProfile).
 * Utilizzato per il Documento Risultati Anonimi Collettivi (D.Lgs 81/08 Art. 40 c.1).
 * 
 * @module services/clinical
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import pdfService from '../pdfService.js';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BACKEND_DIR = join(__dirname, '..', '..');

function logoToDataUrl(logoPath) {
    if (!logoPath) return '';
    if (logoPath.startsWith('data:')) return logoPath;
    let effectivePath = logoPath;
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
        try {
            const url = new URL(logoPath);
            const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
            if (isLocal) { effectivePath = url.pathname; } else { return logoPath; }
        } catch { return logoPath; }
    }
    const cleanPath = effectivePath.startsWith('/') ? effectivePath.slice(1) : effectivePath;
    const PROJECT_ROOT = join(BACKEND_DIR, '..');
    for (const p of [join(BACKEND_DIR, cleanPath), join(BACKEND_DIR, 'public', cleanPath), join(PROJECT_ROOT, 'public', cleanPath), join(PROJECT_ROOT, cleanPath)]) {
        if (existsSync(p)) {
            try {
                const data = readFileSync(p);
                const ext = p.split('.').pop().toLowerCase();
                const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
                return `data:${mime};base64,${data.toString('base64')}`;
            } catch { break; }
        }
    }
    return logoPath;
}

/**
 * Prova più percorsi logo in ordine, restituendo il primo che risolve a data URL.
 */
function resolveFirstValidLogo(...paths) {
    for (const p of paths) {
        if (!p) continue;
        const result = logoToDataUrl(p);
        if (result.startsWith('data:')) return result;
    }
    return '';
}

// =============================================
// LABELS
// =============================================

const TIPO_VISITA_LABELS = {
    PREVENTIVA: 'Visita Preventiva (Art. 41.2a)',
    PREVENTIVA_PREASSUNTIVA: 'Visita Preventiva Preassuntiva (Art. 41.2a-bis)',
    PERIODICA: 'Visita Periodica (Art. 41.2b)',
    CAMBIO_MANSIONE: 'Cambio Mansione (Art. 41.2c)',
    CESSAZIONE_RAPPORTO: 'Cessazione Rapporto (Art. 41.2d)',
    PRECEDENTE_ASSENZA: 'Assenza >60gg (Art. 41.2e)',
    SU_RICHIESTA_LAVORATORE: 'Su Richiesta Lavoratore (Art. 41.2f)',
    STRAORDINARIA: 'Visita Straordinaria (Art. 41.3)',
    VERIFICA_IDONEITA: 'Verifica Idoneità (Art. 41.9)',
    RIENTRO_MATERNITA: 'Rientro Maternità/Congedo',
};

const TIPO_GIUDIZIO_LABELS = {
    IDONEO: 'Idoneo',
    IDONEO_CON_PRESCRIZIONI: 'Idoneo con prescrizioni',
    IDONEO_CON_LIMITAZIONI: 'Idoneo con limitazioni',
    NON_IDONEO_TEMPORANEO: 'Non idoneo temporaneo',
    NON_IDONEO_PERMANENTE: 'Non idoneo permanente',
};

const TIPO_ESAME_LABELS = {
    ECG: 'Elettrocardiogramma (ECG)',
    SPIROMETRIA: 'Spirometria',
    AUDIOMETRIA: 'Audiometria',
    VISIOTEST: 'Visiotest',
    ESAME_SANGUE: 'Esami del sangue',
    ESAME_URINE: 'Esame delle urine',
    DRUG_TEST: 'Drug Test',
    RX_TORACE: 'RX Torace',
    ALTRO: 'Altro',
};

function buildHealthAggregates(profili = []) {
    const stats = {
        bmiDisponibili: 0,
        sottopeso: 0,
        normopeso: 0,
        sovrappeso: 0,
        obesi: 0,
        invalidita: 0,
        legge104: 0,
        fumatori: 0,
        sedentarieta: 0
    };

    for (const profilo of profili) {
        const bmi = Number(profilo.bmi);
        if (Number.isFinite(bmi) && bmi > 0) {
            stats.bmiDisponibili++;
            if (bmi < 18.5) stats.sottopeso++;
            else if (bmi < 25) stats.normopeso++;
            else if (bmi < 30) stats.sovrappeso++;
            else stats.obesi++;
        }
        if (profilo.hasInvalidita || profilo.gradoInvaliditaCivile || profilo.gradoInvaliditaInail || profilo.gradoInvaliditaInps) stats.invalidita++;
        if (profilo.legge104) stats.legge104++;
        if (String(profilo.fumatore || '').toUpperCase().includes('SI')) stats.fumatori++;
        if (['NESSUNA', 'SEDENTARIO', 'SEDENTARIA'].includes(String(profilo.attivitaFisica || '').toUpperCase())) stats.sedentarieta++;
    }
    return stats;
}

// =============================================
// SERVICE
// =============================================

const RisultatiAnonimiService = {
    /**
     * Genera le statistiche anonime collettive per una azienda in un periodo.
     * 
     * @param {string} companyTenantProfileId - ID del CompanyTenantProfile
     * @param {string} dateFrom - Data inizio periodo (ISO string)
     * @param {string} dateTo - Data fine periodo (ISO string)
     * @param {string} tenantId - Tenant corrente
     * @returns {Promise<Object>} Statistiche aggregate
     */
    async getStatsByCompany(companyTenantProfileId, dateFrom, dateTo, tenantId) {
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        // Fine giornata per includere tutte le visite del giorno finale
        endDate.setHours(23, 59, 59, 999);

        logger.info({
            companyTenantProfileId,
            dateFrom: startDate.toISOString(),
            dateTo: endDate.toISOString(),
            tenantId
        }, '[RisultatiAnonimi] Generazione statistiche');

        // 1. Recupera le visite completate per azienda e periodo
        const visite = await prisma.visita.findMany({
            where: {
                tenantId,
                deletedAt: null,
                stato: { in: ['COMPLETATA'] },
                dataOra: {
                    gte: startDate,
                    lte: endDate
                },
                appuntamento: {
                    companyTenantProfileId,
                    deletedAt: null
                }
            },
            include: {
                prestazione: {
                    select: { id: true, nome: true, codice: true }
                },
                appuntamento: {
                    select: {
                        companyTenantProfileId: true,
                        tipoVisitaMDL: true,
                        prestazioni: {
                            where: { deletedAt: null },
                            include: {
                                prestazione: { select: { id: true, nome: true, codice: true } }
                            }
                        }
                    }
                },
                giudizioIdoneita: {
                    where: { deletedAt: null },
                    select: { tipoGiudizio: true, stato: true }
                }
            }
        });

        const totaleVisite = visite.length;
        if (totaleVisite === 0) {
            return {
                periodo: { da: dateFrom, a: dateTo },
                totaleVisite: 0,
                lavoratoriDistinti: 0,
                tipiVisita: [],
                giudizi: [],
                prestazioniEseguite: [],
                giudiziRegistratiPercentuale: 0,
                healthAggregates: buildHealthAggregates([])
            };
        }

        // 2. Lavoratori distinti (COUNT DISTINCT pazienteId)
        const distinctPazienti = await prisma.visita.groupBy({
            by: ['pazienteId'],
            where: {
                tenantId,
                deletedAt: null,
                stato: { in: ['COMPLETATA'] },
                dataOra: {
                    gte: startDate,
                    lte: endDate
                },
                appuntamento: {
                    companyTenantProfileId,
                    deletedAt: null
                }
            }
        });
        const lavoratoriDistinti = distinctPazienti.length;
        const profiliSalute = distinctPazienti.length > 0 ? await prisma.profiloDiSalutePersona.findMany({
            where: {
                tenantId,
                personId: { in: distinctPazienti.map(p => p.pazienteId).filter(Boolean) }
            },
            select: {
                bmi: true,
                hasInvalidita: true,
                legge104: true,
                fumatore: true,
                attivitaFisica: true,
                gradoInvaliditaCivile: true,
                gradoInvaliditaInail: true,
                gradoInvaliditaInps: true
            }
        }) : [];
        const healthAggregates = buildHealthAggregates(profiliSalute);

        // 3. Tipi di visita aggregati
        const tipiVisitaMap = {};
        for (const v of visite) {
            const tipo = v.tipoVisitaMDL || v.appuntamento?.tipoVisitaMDL || 'NON_SPECIFICATA';
            tipiVisitaMap[tipo] = (tipiVisitaMap[tipo] || 0) + 1;
        }
        const tipiVisita = Object.entries(tipiVisitaMap)
            .map(([tipo, conteggio]) => ({
                tipo,
                label: TIPO_VISITA_LABELS[tipo] || tipo,
                conteggio
            }))
            .sort((a, b) => b.conteggio - a.conteggio);

        // 4. Giudizi idoneità aggregati
        const giudiziMap = {};
        let visiteSenzaGiudizio = 0;
        for (const v of visite) {
            if (!v.giudizioIdoneita) {
                visiteSenzaGiudizio++;
            } else {
                const tipo = v.giudizioIdoneita.tipoGiudizio;
                giudiziMap[tipo] = (giudiziMap[tipo] || 0) + 1;
            }
        }
        const totaleGiudiziRegistrati = Object.values(giudiziMap).reduce((s, c) => s + c, 0);
        const giudizi = Object.entries(giudiziMap)
            .map(([tipo, conteggio]) => ({
                tipo,
                label: TIPO_GIUDIZIO_LABELS[tipo] || tipo,
                conteggio,
                percentuale: totaleVisite > 0 ? Math.round((conteggio / totaleVisite) * 100) : 0
            }))
            .sort((a, b) => b.conteggio - a.conteggio);

        const giudiziRegistratiPercentuale = totaleVisite > 0
            ? Math.round((totaleGiudiziRegistrati / totaleVisite) * 100)
            : 0;

        // 5. Prestazioni eseguite — unione prestazione principale + prestazioni aggiuntive
        const prestazioniCountMap = {};

        for (const v of visite) {
            // Prestazione principale
            if (v.prestazione?.nome) {
                const key = v.prestazione.nome;
                prestazioniCountMap[key] = (prestazioniCountMap[key] || 0) + 1;
            }
            // Prestazioni aggiuntive dall'appuntamento
            for (const ap of (v.appuntamento?.prestazioni || [])) {
                if (ap.prestazione?.nome && ap.prestazione.id !== v.prestazioneId) {
                    const key = ap.prestazione.nome;
                    prestazioniCountMap[key] = (prestazioniCountMap[key] || 0) + 1;
                }
            }
        }

        const prestazioniEseguite = Object.entries(prestazioniCountMap)
            .map(([nome, conteggio]) => ({ nome, conteggio }))
            .sort((a, b) => b.conteggio - a.conteggio);

        // 6. Esami strumentali aggregati (ECG, spirometria, audiometria, ecc.)
        const esami = await prisma.esameStrumentale.findMany({
            where: {
                tenantId,
                deletedAt: null,
                dataEsame: { gte: startDate, lte: endDate },
                visita: {
                    appuntamento: {
                        companyTenantProfileId,
                        deletedAt: null
                    }
                }
            },
            select: { tipoEsame: true, stato: true, risultati: true }
        });

        const esamiMap = {};
        for (const e of esami) {
            const tipo = e.tipoEsame || 'ALTRO';
            if (!esamiMap[tipo]) esamiMap[tipo] = { eseguiti: 0, normali: 0, alterati: 0 };
            esamiMap[tipo].eseguiti++;
            if (e.stato === 'COMPLETATO' || e.stato === 'REFERTATO') {
                const risultato = typeof e.risultati === 'string' ? e.risultati.toLowerCase() : '';
                if (risultato.includes('normal') || risultato.includes('nella norma') || risultato.includes('negativo')) {
                    esamiMap[tipo].normali++;
                } else if (risultato) {
                    esamiMap[tipo].alterati++;
                }
            }
        }
        const esamiAggregati = Object.entries(esamiMap)
            .map(([tipo, dati]) => ({
                tipo,
                label: TIPO_ESAME_LABELS[tipo] || tipo,
                ...dati
            }))
            .sort((a, b) => b.eseguiti - a.eseguiti);

        return {
            periodo: {
                da: startDate.toISOString().split('T')[0],
                a: endDate.toISOString().split('T')[0]
            },
            totaleVisite,
            lavoratoriDistinti,
            visiteSenzaGiudizio,
            giudiziRegistratiPercentuale,
            tipiVisita,
            giudizi,
            prestazioniEseguite,
            esamiAggregati,
            healthAggregates
        };
    },

    /**
     * Genera il PDF dei Risultati Anonimi Collettivi.
     */
    async generatePdf(companyTenantProfileId, dateFrom, dateTo, tenantId) {
        const data = await this.getStatsByCompany(companyTenantProfileId, dateFrom, dateTo, tenantId);

        // Company data
        const companyProfile = await prisma.companyTenantProfile.findFirst({
            where: { id: companyTenantProfileId, tenantId, deletedAt: null },
            include: {
                company: { select: { ragioneSociale: true, codiceFiscale: true, piva: true, settore: true } }
            }
        });
        const ragioneSociale = companyProfile?.company?.ragioneSociale || '';

        // Tenant info for header
        const tenant = await prisma.tenant.findFirst({
            where: { id: tenantId },
            select: { name: true, settings: true }
        });
        const tenantName = tenant?.name || '';
        const tenantSettings = tenant?.settings || {};
        const logoUrl = resolveFirstValidLogo(tenantSettings.branches?.MEDICA?.logo, tenantSettings.branches?.FORMAZIONE?.logo, tenantSettings.logoUrl, tenantSettings.logo);
        const tenantAddress = tenantSettings.address || '';
        const tenantPhone = tenantSettings.phone || '';
        const tenantEmail = tenantSettings.email || '';
        const tenantPiva = tenantSettings.piva || '';
        const tenantPec = tenantSettings.pec || '';

        const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const html = buildRisultatiAnonimiHtml(data, {
            tenantName, logoUrl, tenantAddress, tenantPhone, tenantEmail, tenantPiva, tenantPec,
            ragioneSociale, today
        });

        const pdfBuffer = await pdfService.generatePDF(html, {
            format: 'A4',
            margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
        });

        return pdfBuffer;
    }
};

// =============================================
// HTML TEMPLATE
// =============================================

function buildRisultatiAnonimiHtml(data, opts) {
    const { tenantName, logoUrl, tenantAddress, tenantPhone, tenantEmail, tenantPiva, tenantPec, ragioneSociale, today } = opts;

    const giudiziRows = data.giudizi.map(g => `
        <tr><td>${g.label}</td><td style="text-align:center;font-weight:600;">${g.conteggio}</td><td style="text-align:center;">${g.percentuale}%</td></tr>
    `).join('');

    const tipiVisitaRows = data.tipiVisita.map(t => `
        <tr><td>${t.label}</td><td style="text-align:center;font-weight:600;">${t.conteggio}</td></tr>
    `).join('');

    const prestazioniRows = data.prestazioniEseguite.slice(0, 20).map(p => `
        <tr><td>${p.nome}</td><td style="text-align:center;font-weight:600;">${p.conteggio}</td></tr>
    `).join('');

    const esamiRows = (data.esamiAggregati || []).map(e => `
        <tr><td>${e.label}</td><td style="text-align:center;font-weight:600;">${e.eseguiti}</td><td style="text-align:center;">${e.normali || '-'}</td><td style="text-align:center;">${e.alterati || '-'}</td></tr>
    `).join('');
    const health = data.healthAggregates || {};
    const healthRows = [
        ['BMI disponibili', health.bmiDisponibili],
        ['Sottopeso', health.sottopeso],
        ['Sovrappeso', health.sovrappeso],
        ['Obesi', health.obesi],
        ['Invalidità registrata', health.invalidita],
        ['Legge 104', health.legge104],
        ['Fumatori', health.fumatori],
        ['Sedentarietà dichiarata', health.sedentarieta],
    ].map(([label, value]) => `<tr><td>${label}</td><td style="text-align:center;font-weight:600;">${value || 0}</td></tr>`).join('');

    return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Risultati Anonimi Collettivi — ${ragioneSociale}</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 9.5pt; line-height: 1.5; color: #1e293b; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 3px solid #0d9488; }
    .logo-section { flex: 0 0 180px; }
    .logo-section img { max-width: 160px; max-height: 70px; }
    .org-info { text-align: right; flex: 1; }
    .org-name { font-size: 14pt; font-weight: 700; color: #0d9488; margin-bottom: 2px; }
    .org-details { font-size: 8pt; color: #64748b; line-height: 1.4; }
    .document-title { text-align: center; font-size: 13pt; font-weight: 700; color: #0f766e; margin: 16px 0; padding: 8px 16px; background: linear-gradient(135deg, #f0fdfa, #ccfbf1); border-radius: 6px; border: 1px solid #99f6e4; }
    .document-subtitle { text-align: center; font-size: 9pt; color: #64748b; margin-top: -10px; margin-bottom: 16px; }
    .section { margin-bottom: 14px; page-break-inside: avoid; }
    .section-title { font-size: 10pt; font-weight: 700; color: #0f766e; border-bottom: 1.5px solid #99f6e4; padding-bottom: 3px; margin-bottom: 8px; }
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .kpi-card { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; padding: 10px; text-align: center; }
    .kpi-card .kpi-value { font-size: 20pt; font-weight: 700; color: #0f766e; }
    .kpi-card .kpi-label { font-size: 7.5pt; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 8.5pt; }
    th { background: #0d9488; color: white; padding: 6px 8px; text-align: left; font-size: 8pt; font-weight: 600; }
    td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .note-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 14px; font-size: 8.5pt; color: #1e40af; margin: 10px 0; }
    .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 7pt; color: #94a3b8; text-align: center; }
</style>
</head>
<body>

<div class="header">
    <div class="logo-section">${logoUrl ? `<img src="${logoUrl}" alt="Logo">` : ''}</div>
    <div class="org-info">
        <div class="org-name">${tenantName}</div>
        <div class="org-details">
            ${tenantAddress ? tenantAddress + '<br>' : ''}
            ${tenantPhone ? 'Tel: ' + tenantPhone + ' | ' : ''}${tenantEmail ? 'Email: ' + tenantEmail : ''}<br>
            ${tenantPiva ? 'P.IVA: ' + tenantPiva : ''}${tenantPec ? ' | PEC: ' + tenantPec : ''}
        </div>
    </div>
</div>

<div class="document-title">
    RISULTATI ANONIMI COLLETTIVI<br>
    <span style="font-size:10pt;">Art. 40 comma 1 D.Lgs 81/08</span>
</div>
<div class="document-subtitle">
    ${ragioneSociale} &mdash; Periodo: ${data.periodo.da} / ${data.periodo.a}
</div>

<div class="section">
    <div class="section-title">Sintesi Sorveglianza Sanitaria</div>
    <div class="kpi-row">
        <div class="kpi-card"><div class="kpi-value">${data.totaleVisite}</div><div class="kpi-label">Visite totali</div></div>
        <div class="kpi-card"><div class="kpi-value">${data.lavoratoriDistinti}</div><div class="kpi-label">Lavoratori visitati</div></div>
        <div class="kpi-card"><div class="kpi-value">${data.giudiziRegistratiPercentuale}%</div><div class="kpi-label">Giudizi registrati</div></div>
        <div class="kpi-card"><div class="kpi-value">${data.visiteSenzaGiudizio || 0}</div><div class="kpi-label">Visite senza giudizio</div></div>
    </div>
</div>

${data.giudizi.length > 0 ? `
<div class="section">
    <div class="section-title">Giudizi di Idoneità</div>
    <table>
        <thead><tr><th>Giudizio</th><th style="text-align:center;">N°</th><th style="text-align:center;">%</th></tr></thead>
        <tbody>${giudiziRows}</tbody>
    </table>
</div>` : ''}

<div class="two-col">
    ${data.tipiVisita.length > 0 ? `
    <div class="section">
        <div class="section-title">Tipologie Visite</div>
        <table>
            <thead><tr><th>Tipo</th><th style="text-align:center;">N°</th></tr></thead>
            <tbody>${tipiVisitaRows}</tbody>
        </table>
    </div>` : ''}

    ${(data.esamiAggregati || []).length > 0 ? `
    <div class="section">
        <div class="section-title">Esami Strumentali</div>
        <table>
            <thead><tr><th>Esame</th><th style="text-align:center;">N°</th><th style="text-align:center;">Normali</th><th style="text-align:center;">Alterati</th></tr></thead>
            <tbody>${esamiRows}</tbody>
        </table>
    </div>` : ''}
</div>

<div class="section">
    <div class="section-title">Indicatori sanitari aggregati</div>
    <table>
        <thead><tr><th>Indicatore</th><th style="text-align:center;">N°</th></tr></thead>
        <tbody>${healthRows}</tbody>
    </table>
</div>

${data.prestazioniEseguite.length > 0 ? `
<div class="section">
    <div class="section-title">Accertamenti Eseguiti</div>
    <table>
        <thead><tr><th>Prestazione</th><th style="text-align:center;">N°</th></tr></thead>
        <tbody>${prestazioniRows}</tbody>
    </table>
</div>` : ''}

<div class="note-box">
    I dati contenuti nel presente documento sono anonimi e aggregati in conformità al D.Lgs 81/08 Art. 40 comma 1 e al Regolamento UE 2016/679 (GDPR).
    Non contengono dati personali identificabili dei lavoratori.
</div>

<div class="footer">
    Documento generato il ${today} — ${tenantName}<br>
    Risultati Anonimi Collettivi Art. 40 c.1 D.Lgs 81/08
</div>

</body>
</html>`;
}

export default RisultatiAnonimiService;
