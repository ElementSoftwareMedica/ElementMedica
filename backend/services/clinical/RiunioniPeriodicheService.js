/**
 * RiunioniPeriodicheService
 * 
 * Genera i dati aggregati per il Verbale della Riunione Periodica
 * ai sensi dell'Art. 35 D.Lgs 81/08.
 * 
 * Il verbale deve contenere:
 * - Dati sulla sorveglianza sanitaria (visite effettuate, giudizi, esami)
 * - Risultati anonimi collettivi
 * - Andamento infortuni e malattie professionali
 * - Rischi e protocolli sanitari attivi
 * - Partecipanti obbligatori (DL, MC, RSPP, RLS)
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

/**
 * Converts a logo path to a base64 data-URL for Puppeteer rendering.
 */
function logoToDataUrl(logoPath) {
    if (!logoPath) return '';
    if (logoPath.startsWith('data:')) return logoPath;

    let effectivePath = logoPath;
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
        try {
            const url = new URL(logoPath);
            const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '0.0.0.0';
            if (isLocal) {
                effectivePath = url.pathname;
            } else {
                return logoPath;
            }
        } catch {
            return logoPath;
        }
    }

    const cleanPath = effectivePath.startsWith('/') ? effectivePath.slice(1) : effectivePath;
    const filePath = join(BACKEND_DIR, cleanPath);
    const PROJECT_ROOT = join(BACKEND_DIR, '..');
    const tryPaths = [filePath, join(BACKEND_DIR, 'public', cleanPath), join(PROJECT_ROOT, 'public', cleanPath), join(PROJECT_ROOT, cleanPath)];

    for (const p of tryPaths) {
        if (existsSync(p)) {
            try {
                const data = readFileSync(p);
                const ext = p.split('.').pop().toLowerCase();
                const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
                return `data:${mime};base64,${data.toString('base64')}`;
            } catch {
                break;
            }
        }
    }

    logger.warn('[RiunioniPeriodiche] Logo file non trovato', { logoPath, filePath });
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

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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

const RiunioniPeriodicheService = {

    /**
     * Genera i dati aggregati per la riunione periodica di un'azienda.
     */
    async getAggregateData(companyTenantProfileId, annoRiferimento, tenantId) {
        const startDate = new Date(`${annoRiferimento}-01-01T00:00:00.000Z`);
        const endDate = new Date(`${annoRiferimento}-12-31T23:59:59.999Z`);

        logger.info({
            companyTenantProfileId,
            annoRiferimento,
            tenantId
        }, '[RiunioniPeriodiche] Generazione dati aggregati');

        // 1. Dati azienda
        const company = await prisma.companyTenantProfile.findFirst({
            where: { id: companyTenantProfileId, tenantId, deletedAt: null },
            include: {
                company: { select: { ragioneSociale: true, codiceFiscale: true, piva: true, settore: true, codiceAteco: true } },
                sites: { where: { deletedAt: null }, select: { id: true, siteName: true, citta: true, indirizzo: true } }
            }
        });

        if (!company) {
            throw new Error('Azienda non trovata');
        }

        // 2. Visite completate nel periodo
        const visite = await prisma.visita.findMany({
            where: {
                tenantId,
                deletedAt: null,
                stato: { in: ['COMPLETATA'] },
                dataOra: { gte: startDate, lte: endDate },
                appuntamento: {
                    companyTenantProfileId,
                    deletedAt: null
                }
            },
            include: {
                giudizioIdoneita: {
                    where: { deletedAt: null },
                    select: { tipoGiudizio: true, prescrizioniIdoneita: true, limitazioni: true }
                },
                appuntamento: {
                    select: {
                        tipoVisitaMDL: true,
                        prestazioni: {
                            where: { deletedAt: null },
                            include: { prestazione: { select: { nome: true, codice: true } } }
                        }
                    }
                }
            }
        });

        // 3. Esami strumentali nel periodo
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

        // 4. Nomine attive (MC, RSPP, RLS, DL)
        const nomine = await prisma.nominaRuolo.findMany({
            where: {
                companyTenantProfileId,
                tenantId,
                deletedAt: null,
                stato: 'ATTIVA'
            },
            include: {
                person: {
                    select: { firstName: true, lastName: true, gender: true }
                }
            }
        });

        // 5. Protocolli sanitari attivi (linked through site)
        const siteIds = company.sites.map(s => s.id);
        const protocolli = siteIds.length > 0 ? await prisma.protocolloSanitario.findMany({
            where: {
                siteId: { in: siteIds },
                tenantId,
                deletedAt: null,
                isAttivo: true
            },
            select: { codice: true, denominazione: true, periodicitaVisiteMesi: true }
        }) : [];

        // 6. Mansioni e rischi (linked through site)
        const mansioni = siteIds.length > 0 ? await prisma.mansione.findMany({
            where: {
                siteId: { in: siteIds },
                tenantId,
                deletedAt: null
            },
            include: {
                rischiAssociati: {
                    where: { deletedAt: null },
                    select: { codiceRischio: true, livello: true, categoria: true }
                }
            }
        }) : [];

        // === AGGREGATE ===

        const totaleVisite = visite.length;

        // Lavoratori distinti
        const lavoratoriDistintiSet = new Set(visite.map(v => v.pazienteId));
        const lavoratoriDistinti = lavoratoriDistintiSet.size;
        const profiliSalute = lavoratoriDistintiSet.size > 0 ? await prisma.profiloDiSalutePersona.findMany({
            where: {
                tenantId,
                personId: { in: Array.from(lavoratoriDistintiSet).filter(Boolean) }
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

        // Tipi di visita
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

        // Giudizi idoneità
        const giudiziMap = {};
        let conPrescrizioni = 0;
        let conLimitazioni = 0;
        for (const v of visite) {
            if (v.giudizioIdoneita) {
                const tipo = v.giudizioIdoneita.tipoGiudizio;
                giudiziMap[tipo] = (giudiziMap[tipo] || 0) + 1;
                if (v.giudizioIdoneita.prescrizioniIdoneita) conPrescrizioni++;
                if (v.giudizioIdoneita.limitazioni) conLimitazioni++;
            }
        }
        const giudizi = Object.entries(giudiziMap)
            .map(([tipo, conteggio]) => ({
                tipo,
                label: TIPO_GIUDIZIO_LABELS[tipo] || tipo,
                conteggio,
                percentuale: totaleVisite > 0 ? Math.round((conteggio / totaleVisite) * 100) : 0
            }))
            .sort((a, b) => b.conteggio - a.conteggio);

        // Esami strumentali aggregati
        const esamiMap = {};
        for (const e of esami) {
            const tipo = e.tipoEsame || 'ALTRO';
            if (!esamiMap[tipo]) esamiMap[tipo] = { eseguiti: 0, normali: 0, alterati: 0 };
            esamiMap[tipo].eseguiti++;
            if (e.stato === 'COMPLETATO' || e.stato === 'REFERTATO') {
                // Classify results if available
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

        // Prestazioni eseguite
        const prestazioniMap = {};
        for (const v of visite) {
            for (const ap of (v.appuntamento?.prestazioni || [])) {
                if (ap.prestazione?.nome) {
                    prestazioniMap[ap.prestazione.nome] = (prestazioniMap[ap.prestazione.nome] || 0) + 1;
                }
            }
        }
        const prestazioniEseguite = Object.entries(prestazioniMap)
            .map(([nome, conteggio]) => ({ nome, conteggio }))
            .sort((a, b) => b.conteggio - a.conteggio);

        // Partecipanti dalla nomine
        const partecipanti = {
            datoreLavoro: nomine.filter(n => n.tipoRuolo === 'DATORE_LAVORO').map(n => ({
                nome: `${n.person?.firstName || ''} ${n.person?.lastName || ''}`.trim(),
                ruolo: 'Datore di Lavoro'
            })),
            medicoCompetente: nomine.filter(n => n.tipoRuolo === 'MEDICO_COMPETENTE').map(n => ({
                nome: `${n.person?.firstName || ''} ${n.person?.lastName || ''}`.trim(),
                ruolo: 'Medico Competente',
                gender: n.person?.gender
            })),
            rspp: nomine.filter(n => n.tipoRuolo === 'RSPP').map(n => ({
                nome: `${n.person?.firstName || ''} ${n.person?.lastName || ''}`.trim(),
                ruolo: 'RSPP'
            })),
            rls: nomine.filter(n => n.tipoRuolo === 'RLS').map(n => ({
                nome: `${n.person?.firstName || ''} ${n.person?.lastName || ''}`.trim(),
                ruolo: 'RLS'
            })),
        };

        // Rischi aggregati
        const rischiMap = {};
        for (const m of mansioni) {
            for (const r of (m.rischiAssociati || [])) {
                const key = r.codiceRischio || r.categoria || 'Generico';
                if (!rischiMap[key]) rischiMap[key] = { categoria: r.categoria || 'Altro', livelloMax: r.livello, count: 0 };
                rischiMap[key].count++;
                // Keep highest risk level
                const levels = ['BASSO', 'MEDIO', 'ALTO', 'MOLTO_ALTO'];
                if (levels.indexOf(r.livello) > levels.indexOf(rischiMap[key].livelloMax)) {
                    rischiMap[key].livelloMax = r.livello;
                }
            }
        }
        const rischiAggregati = Object.entries(rischiMap)
            .map(([codice, dati]) => ({ codice, ...dati }))
            .sort((a, b) => {
                const levels = ['BASSO', 'MEDIO', 'ALTO', 'MOLTO_ALTO'];
                return levels.indexOf(b.livelloMax) - levels.indexOf(a.livelloMax);
            });

        return {
            azienda: {
                ragioneSociale: company.company?.ragioneSociale || '',
                codiceFiscale: company.company?.codiceFiscale || '',
                partitaIva: company.company?.piva || '',
                settoreAttivita: company.company?.settore || company.company?.codiceAteco || '',
                sedi: company.sites || []
            },
            annoRiferimento,
            periodo: {
                da: `01/01/${annoRiferimento}`,
                a: `31/12/${annoRiferimento}`
            },
            sorveglianzaSanitaria: {
                totaleVisite,
                lavoratoriDistinti,
                tipiVisita,
                giudizi,
                conPrescrizioni,
                conLimitazioni,
                esamiAggregati,
                prestazioniEseguite,
                healthAggregates,
            },
            partecipanti,
            protocolliSanitari: protocolli.map(p => ({
                codice: p.codice,
                denominazione: p.denominazione,
                periodicitaMesi: p.periodicitaVisiteMesi
            })),
            mansioni: mansioni.map(m => ({
                denominazione: m.denominazione,
                rischi: (m.rischiAssociati || []).map(r => ({
                    codice: r.codiceRischio,
                    livello: r.livello,
                    categoria: r.categoria
                }))
            })),
            rischiAggregati,
        };
    },

    /**
     * Genera il PDF del verbale della riunione periodica.
     */
    async generatePdf(companyTenantProfileId, annoRiferimento, tenantId, options = {}) {
        const data = await this.getAggregateData(companyTenantProfileId, annoRiferimento, tenantId);

        // Load tenant info for header
        const tenant = await prisma.tenant.findFirst({
            where: { id: tenantId },
            select: { name: true, settings: true }
        });

        const tenantName = tenant?.name || '';
        const tenantSettings = tenant?.settings || {};
        const logoUrl = resolveFirstValidLogo(
            tenantSettings.branches?.FORMAZIONE?.logo,
            tenantSettings.branches?.MEDICA?.logo,
            tenantSettings.logoUrl,
            tenantSettings.logo
        );
        const tenantAddress = tenantSettings.address || '';
        const tenantPhone = tenantSettings.phone || '';
        const tenantEmail = tenantSettings.email || '';
        const tenantPiva = tenantSettings.piva || '';
        const tenantPec = tenantSettings.pec || '';

        const mc = data.partecipanti.medicoCompetente[0];
        const mcTitle = mc?.gender === 'MALE' ? 'Dott.' : 'Dott.ssa';
        const mcName = mc ? `${mcTitle} ${mc.nome}` : 'N/D';

        const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const html = buildVerbaleHtml(data, {
            tenantName, logoUrl, tenantAddress, tenantPhone, tenantEmail, tenantPiva, tenantPec,
            mcName, today, delibereConclusioni: options.delibereConclusioni || ''
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

function buildVerbaleHtml(data, opts) {
    const { tenantName, logoUrl, tenantAddress, tenantPhone, tenantEmail, tenantPiva, tenantPec, mcName, today, delibereConclusioni } = opts;
    const az = data.azienda;
    const ss = data.sorveglianzaSanitaria;

    // Build giudizi rows
    const giudiziRows = ss.giudizi.map(g => `
        <tr>
            <td>${g.label}</td>
            <td style="text-align:center;font-weight:600;">${g.conteggio}</td>
            <td style="text-align:center;">${g.percentuale}%</td>
        </tr>
    `).join('');

    // Build esami rows
    const esamiRows = ss.esamiAggregati.map(e => `
        <tr>
            <td>${e.label}</td>
            <td style="text-align:center;font-weight:600;">${e.eseguiti}</td>
            <td style="text-align:center;">${e.normali || '-'}</td>
            <td style="text-align:center;">${e.alterati || '-'}</td>
        </tr>
    `).join('');

    // Build tipi visita rows
    const tipiVisitaRows = ss.tipiVisita.map(t => `
        <tr>
            <td>${t.label}</td>
            <td style="text-align:center;font-weight:600;">${t.conteggio}</td>
        </tr>
    `).join('');

    // Build prestazioni rows
    const prestazioniRows = ss.prestazioniEseguite.slice(0, 15).map(p => `
        <tr>
            <td>${p.nome}</td>
            <td style="text-align:center;font-weight:600;">${p.conteggio}</td>
        </tr>
    `).join('');

    // Partecipanti
    const allPartecipanti = [
        ...data.partecipanti.datoreLavoro,
        ...data.partecipanti.medicoCompetente,
        ...data.partecipanti.rspp,
        ...data.partecipanti.rls,
    ];
    const partecipantiRows = allPartecipanti.map(p => `
        <tr>
            <td>${p.nome || 'N/D'}</td>
            <td>${p.ruolo}</td>
        </tr>
    `).join('');

    // Rischi
    const rischiRows = data.rischiAggregati.slice(0, 10).map(r => `
        <tr>
            <td>${r.codice}</td>
            <td>${r.categoria || '-'}</td>
            <td style="text-align:center;"><span class="badge badge-${(r.livelloMax || 'BASSO').toLowerCase()}">${r.livelloMax || 'N/D'}</span></td>
        </tr>
    `).join('');

    // Protocolli
    const protocolliRows = data.protocolliSanitari.map(p => `
        <tr>
            <td>${p.codice || '-'}</td>
            <td>${p.denominazione}</td>
            <td style="text-align:center;">${p.periodicitaMesi ? p.periodicitaMesi + ' mesi' : '-'}</td>
        </tr>
    `).join('');
    const health = ss.healthAggregates || {};
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

    // Sedi
    const sediList = az.sedi.map(s => `<li>${s.siteName} — ${s.indirizzo || ''}, ${s.citta || ''}</li>`).join('');

    return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Verbale Riunione Periodica ${data.annoRiferimento} — ${az.ragioneSociale}</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 9.5pt; line-height: 1.5; color: #1e293b; padding: 0; }
    
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 3px solid #0d9488; }
    .logo-section { flex: 0 0 180px; }
    .logo-section img { max-width: 160px; max-height: 70px; }
    .org-info { text-align: right; flex: 1; }
    .org-name { font-size: 14pt; font-weight: 700; color: #0d9488; margin-bottom: 2px; }
    .org-details { font-size: 8pt; color: #64748b; line-height: 1.4; }
    
    .document-title { text-align: center; font-size: 13pt; font-weight: 700; color: #0f766e; margin: 16px 0; padding: 8px 16px; background: linear-gradient(135deg, #f0fdfa, #ccfbf1); border-radius: 6px; border: 1px solid #99f6e4; }
    .document-subtitle { text-align: center; font-size: 9pt; color: #64748b; margin-top: -10px; margin-bottom: 16px; }
    
    .section { margin-bottom: 14px; page-break-inside: avoid; }
    .section-title { font-size: 10pt; font-weight: 700; color: #0f766e; border-bottom: 1.5px solid #99f6e4; padding-bottom: 3px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
    
    .company-box { background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 12px; }
    .company-box .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
    .info-row { display: flex; gap: 6px; }
    .info-label { font-weight: 600; color: #64748b; font-size: 8.5pt; min-width: 100px; }
    .info-value { flex: 1; font-size: 8.5pt; color: #1e293b; }

    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .kpi-card { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; padding: 10px; text-align: center; }
    .kpi-card .kpi-value { font-size: 20pt; font-weight: 700; color: #0f766e; }
    .kpi-card .kpi-label { font-size: 7.5pt; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }

    table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 8.5pt; }
    th { background: #0d9488; color: white; padding: 6px 8px; text-align: left; font-size: 8pt; font-weight: 600; }
    td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    
    .badge { padding: 2px 8px; border-radius: 10px; font-size: 7.5pt; font-weight: 600; text-transform: uppercase; }
    .badge-alto, .badge-molto_alto { background: #fee2e2; color: #dc2626; }
    .badge-medio { background: #fef3c7; color: #d97706; }
    .badge-basso { background: #dcfce7; color: #16a34a; }
    
    .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; page-break-inside: avoid; }
    .signature-box { text-align: center; }
    .signature-box .role { font-size: 8pt; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .signature-box .name { font-size: 9pt; color: #1e293b; margin-top: 2px; }
    .signature-line { border-top: 1px solid #334155; margin-top: 40px; padding-top: 4px; font-size: 8pt; color: #94a3b8; }
    
    .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 7pt; color: #94a3b8; text-align: center; }
    
    .note-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 14px; font-size: 8.5pt; color: #1e40af; margin: 10px 0; }
    
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    
    ul { padding-left: 16px; margin: 4px 0; }
    li { font-size: 8.5pt; margin-bottom: 2px; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
    <div class="logo-section">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo">` : ''}
    </div>
    <div class="org-info">
        <div class="org-name">${tenantName}</div>
        <div class="org-details">
            ${tenantAddress ? tenantAddress + '<br>' : ''}
            ${tenantPhone ? 'Tel: ' + tenantPhone + ' | ' : ''}${tenantEmail ? 'Email: ' + tenantEmail : ''}<br>
            ${tenantPiva ? 'P.IVA: ' + tenantPiva : ''}${tenantPec ? ' | PEC: ' + tenantPec : ''}
        </div>
    </div>
</div>

<!-- TITLE -->
<div class="document-title">
    VERBALE RIUNIONE PERIODICA<br>
    <span style="font-size:10pt;">Art. 35 D.Lgs 81/08</span>
</div>
<div class="document-subtitle">
    Anno di riferimento: ${data.annoRiferimento} &mdash; ${az.ragioneSociale}
</div>

<!-- DATI AZIENDA -->
<div class="section">
    <div class="section-title">&#x1F3E2; Dati Azienda</div>
    <div class="company-box">
        <div class="info-grid">
            <div class="info-row"><span class="info-label">Ragione Sociale:</span><span class="info-value">${az.ragioneSociale}</span></div>
            <div class="info-row"><span class="info-label">Settore:</span><span class="info-value">${az.settoreAttivita || 'N/D'}</span></div>
            <div class="info-row"><span class="info-label">Codice Fiscale:</span><span class="info-value">${az.codiceFiscale || 'N/D'}</span></div>
            <div class="info-row"><span class="info-label">P.IVA:</span><span class="info-value">${az.partitaIva || 'N/D'}</span></div>
        </div>
        ${az.sedi.length > 0 ? `<div style="margin-top:6px;"><span class="info-label">Sedi operative:</span><ul>${sediList}</ul></div>` : ''}
    </div>
</div>

<!-- PARTECIPANTI -->
<div class="section">
    <div class="section-title">&#x1F465; Partecipanti alla Riunione</div>
    ${allPartecipanti.length > 0 ? `
    <table>
        <thead><tr><th>Nome</th><th>Ruolo</th></tr></thead>
        <tbody>${partecipantiRows}</tbody>
    </table>` : '<p style="font-size:8.5pt;color:#94a3b8;">Nessuna nomina attiva registrata nel sistema.</p>'}
    <div class="note-box" style="margin-top:8px;">
        La riunione periodica è obbligatoria nelle aziende con più di 15 lavoratori (Art. 35 c.1 D.Lgs 81/08).
        Partecipano: Datore di Lavoro / delegato, RSPP, Medico Competente, RLS.
    </div>
</div>

<!-- KPI SORVEGLIANZA -->
<div class="section">
    <div class="section-title">&#x1FA7A; Sorveglianza Sanitaria — Sintesi Anno ${data.annoRiferimento}</div>
    <div class="kpi-row">
        <div class="kpi-card">
            <div class="kpi-value">${ss.totaleVisite}</div>
            <div class="kpi-label">Visite totali</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${ss.lavoratoriDistinti}</div>
            <div class="kpi-label">Lavoratori visitati</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${ss.conPrescrizioni}</div>
            <div class="kpi-label">Con prescrizioni</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${ss.conLimitazioni}</div>
            <div class="kpi-label">Con limitazioni</div>
        </div>
    </div>
</div>

<!-- GIUDIZI IDONEITÀ -->
${ss.giudizi.length > 0 ? `
<div class="section">
    <div class="section-title">&#x2705; Giudizi di Idoneità</div>
    <table>
        <thead><tr><th>Giudizio</th><th style="text-align:center;">N°</th><th style="text-align:center;">%</th></tr></thead>
        <tbody>${giudiziRows}</tbody>
    </table>
</div>` : ''}

<!-- TIPI VISITA + ESAMI -->
<div class="two-col">
    ${ss.tipiVisita.length > 0 ? `
    <div class="section">
        <div class="section-title">&#x1F4CB; Tipologie Visite</div>
        <table>
            <thead><tr><th>Tipo</th><th style="text-align:center;">N°</th></tr></thead>
            <tbody>${tipiVisitaRows}</tbody>
        </table>
    </div>` : ''}

    ${ss.esamiAggregati.length > 0 ? `
    <div class="section">
        <div class="section-title">&#x1F9EA; Esami Strumentali</div>
        <table>
            <thead><tr><th>Esame</th><th style="text-align:center;">N°</th><th style="text-align:center;">Normali</th><th style="text-align:center;">Alterati</th></tr></thead>
            <tbody>${esamiRows}</tbody>
        </table>
    </div>` : ''}
</div>

<!-- PRESTAZIONI -->
${ss.prestazioniEseguite.length > 0 ? `
<div class="section">
    <div class="section-title">&#x1FA7A; Accertamenti Eseguiti</div>
    <table>
        <thead><tr><th>Prestazione</th><th style="text-align:center;">N°</th></tr></thead>
        <tbody>${prestazioniRows}</tbody>
    </table>
</div>` : ''}

<!-- RISCHI -->
${data.rischiAggregati.length > 0 ? `
<div class="section">
    <div class="section-title">&#x26A0; Rischi Aziendali</div>
    <table>
        <thead><tr><th>Codice Rischio</th><th>Categoria</th><th style="text-align:center;">Livello</th></tr></thead>
        <tbody>${rischiRows}</tbody>
    </table>
</div>` : ''}

<!-- PROTOCOLLI SANITARI -->
${data.protocolliSanitari.length > 0 ? `
<div class="section">
    <div class="section-title">&#x1F4D1; Protocolli Sanitari Attivi</div>
    <table>
        <thead><tr><th>Codice</th><th>Denominazione</th><th style="text-align:center;">Periodicità</th></tr></thead>
        <tbody>${protocolliRows}</tbody>
    </table>
</div>` : ''}

<!-- INDICATORI SANITARI AGGREGATI -->
<div class="section">
    <div class="section-title">&#x1F4CA; Indicatori Sanitari Aggregati</div>
    <table>
        <thead><tr><th>Indicatore</th><th style="text-align:center;">N°</th></tr></thead>
        <tbody>${healthRows}</tbody>
    </table>
</div>

<!-- ORDINE DEL GIORNO Art. 35 -->
<div class="section">
    <div class="section-title">&#x1F4DD; Ordine del Giorno (Art. 35 c.2 D.Lgs 81/08)</div>
    <div class="company-box">
        <ol style="font-size:8.5pt;padding-left:16px;">
            <li>Documento di valutazione dei rischi (DVR)</li>
            <li>Andamento degli infortuni e delle malattie professionali e della sorveglianza sanitaria</li>
            <li>Criteri di scelta, caratteristiche tecniche, efficacia dei DPI</li>
            <li>Programmi di informazione e formazione dei dirigenti, dei preposti e dei lavoratori ai fini della sicurezza e della protezione della loro salute</li>
        </ol>
    </div>
</div>

<!-- DELIBERE -->
<div class="section">
    <div class="section-title">&#x1F4DC; Delibere e Conclusioni</div>
    <div class="company-box" style="min-height:60px;">
        <p style="font-size:8.5pt;color:#1e293b;white-space:pre-line;">${delibereConclusioni ? escapeHtml(delibereConclusioni) : 'Spazio per annotare le delibere adottate durante la riunione.'}</p>
    </div>
</div>

<!-- FIRME -->
<div class="signature-section">
    <div class="signature-box">
        <div class="role">Datore di Lavoro</div>
        <div class="name">${data.partecipanti.datoreLavoro[0]?.nome || '________________'}</div>
        <div class="signature-line">Firma</div>
    </div>
    <div class="signature-box">
        <div class="role">Medico Competente</div>
        <div class="name">${mcName}</div>
        <div class="signature-line">Firma</div>
    </div>
    <div class="signature-box">
        <div class="role">RSPP</div>
        <div class="name">${data.partecipanti.rspp[0]?.nome || '________________'}</div>
        <div class="signature-line">Firma</div>
    </div>
    <div class="signature-box">
        <div class="role">RLS</div>
        <div class="name">${data.partecipanti.rls[0]?.nome || '________________'}</div>
        <div class="signature-line">Firma</div>
    </div>
</div>

<!-- FOOTER -->
<div class="footer">
    Documento generato il ${today} — ${tenantName}<br>
    Verbale Riunione Periodica Art. 35 D.Lgs 81/08 — Questo documento è stato generato elettronicamente.
</div>

</body>
</html>`;
}

export default RiunioniPeriodicheService;
