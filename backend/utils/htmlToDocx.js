/**
 * htmlToDocx — converte una stringa HTML in un Buffer DOCX (Word).
 *
 * Usa la libreria `html-to-docx`. Pensato per documenti di testo (verbale
 * riunione periodica, risultati collettivi anonimi) che devono essere
 * scaricabili in .docx per eventuali integrazioni/modifiche manuali.
 *
 * html-to-docx applica gli stili INLINE ma ignora gran parte del CSS nel blocco
 * <style> (in particolare i background). Per ottenere un DOCX elegante con colori
 * coerenti, iniettiamo stili inline sugli elementi noti dei template MDL
 * (titoli, intestazioni tabella, KPI, note) prima della conversione.
 *
 * @module utils/htmlToDocx
 */

import HTMLtoDOCX from 'html-to-docx';
import { logger } from './logger.js';

const ACCENT = '#0d9488';      // teal ElementMedica
const ACCENT_DARK = '#0f766e';
const ACCENT_SOFT = '#99f6e4';

/**
 * Inietta stili inline (gli unici rispettati da html-to-docx) sugli elementi
 * dei template MDL. Trasforma solo elementi SENZA <div> annidati, così le regex
 * non-greedy restano sicure.
 */
function elegantizeForDocx(html, accent = ACCENT) {
    let h = String(html || '');

    // 1) Rimuovi media/grafici non supportati
    h = h
        .replace(/<img\b[^>]*>/gi, '')
        .replace(/<svg\b[\s\S]*?<\/svg>/gi, '')
        .replace(/<canvas\b[\s\S]*?<\/canvas>/gi, '')
        .replace(/<script\b[\s\S]*?<\/script>/gi, '');

    // 2) Intestazioni di tabella colorate (background accent + testo bianco)
    const thStyle = `background-color:${accent};color:#ffffff;padding:6px 8px;font-weight:bold;text-align:left;font-size:9pt;`;
    h = h.replace(/<th\b([^>]*)>/gi, (_m, attrs) => {
        if (/style\s*=\s*"/i.test(attrs)) {
            return `<th${attrs.replace(/style\s*=\s*"([^"]*)"/i, (s, css) => `style="${thStyle}${css}"`)}>`;
        }
        return `<th${attrs} style="${thStyle}">`;
    });

    // 3) Titolo documento → barra elegante centrata (paragrafo: il background
    //    inline è applicato da html-to-docx solo a paragrafi/celle, non ai <div>)
    h = h.replace(/<div class="document-title">([\s\S]*?)<\/div>/gi,
        `<p style="text-align:center;background-color:${accent};color:#ffffff;padding:12px;font-size:15pt;font-weight:bold;">$1</p>`);
    h = h.replace(/<div class="document-subtitle">([\s\S]*?)<\/div>/gi,
        `<p style="text-align:center;color:#64748b;font-size:10pt;margin:4px 0 14px 0;">$1</p>`);

    // 4) Titoli di sezione → teal in grassetto con bordo inferiore
    h = h.replace(/<div class="section-title">([\s\S]*?)<\/div>/gi,
        `<p style="color:${ACCENT_DARK};font-weight:bold;font-size:11.5pt;border-bottom:2px solid ${ACCENT_SOFT};padding-bottom:3px;margin:16px 0 8px 0;">$1</p>`);

    // 5) Nome organizzazione in intestazione
    h = h.replace(/<div class="org-name">([\s\S]*?)<\/div>/gi,
        `<p style="color:${accent};font-weight:bold;font-size:15pt;margin:0;">$1</p>`);

    // 6) KPI (value/label hanno testo semplice, niente div annidati)
    h = h.replace(/<div class="kpi-value">([\s\S]*?)<\/div>/gi,
        `<span style="font-size:20pt;font-weight:bold;color:${ACCENT_DARK};">$1</span>`);
    h = h.replace(/<div class="kpi-label">([\s\S]*?)<\/div>/gi,
        `<p style="font-size:8.5pt;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;margin:0 0 8px 0;">$1</p>`);

    // 7) Box nota / evidenza (paragrafo per applicare il background)
    h = h.replace(/<div class="note-box"([^>]*)>([\s\S]*?)<\/div>/gi,
        `<p style="background-color:#eff6ff;color:#1e40af;font-size:9pt;padding:10px 12px;margin:10px 0;">$2</p>`);

    return h;
}

/**
 * @param {string} html  - documento HTML completo (o frammento)
 * @param {string} [title='Documento'] - titolo del documento Word
 * @param {object} [options]
 * @param {string} [options.accent] - colore accento per intestazioni/titoli
 * @returns {Promise<Buffer>}
 */
export async function htmlToDocxBuffer(html, title = 'Documento', options = {}) {
    try {
        const cleanHtml = elegantizeForDocx(html, options.accent || ACCENT);

        const buffer = await HTMLtoDOCX(cleanHtml, null, {
            title,
            orientation: 'portrait',
            // Tutti i margini DEVONO essere numerici: se header/footer/gutter mancano,
            // html-to-docx scrive w:header="undefined" → DOCX non apribile da Word.
            margins: { top: 720, right: 720, bottom: 720, left: 720, header: 0, footer: 0, gutter: 0 },
            table: { row: { cantSplit: true }, addSizeToCells: true },
            footer: false,
            header: false,
            pageNumber: false,
        });
        // html-to-docx può restituire Buffer o Blob a seconda dell'ambiente
        if (Buffer.isBuffer(buffer)) return buffer;
        if (buffer && typeof buffer.arrayBuffer === 'function') {
            return Buffer.from(await buffer.arrayBuffer());
        }
        return Buffer.from(buffer);
    } catch (err) {
        logger.error({ error: err.message }, 'Errore conversione HTML→DOCX');
        throw err;
    }
}

export default { htmlToDocxBuffer };
