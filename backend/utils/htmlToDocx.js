/**
 * htmlToDocx — converte una stringa HTML in un Buffer DOCX (Word).
 *
 * Usa la libreria `html-to-docx`. Pensato per documenti di testo (verbale
 * riunione periodica, risultati collettivi anonimi) che devono essere
 * scaricabili in .docx per eventuali integrazioni/modifiche manuali.
 *
 * @module utils/htmlToDocx
 */

import HTMLtoDOCX from 'html-to-docx';
import { logger } from './logger.js';

/**
 * @param {string} html  - documento HTML completo (o frammento)
 * @param {string} [title='Documento'] - titolo del documento Word
 * @returns {Promise<Buffer>}
 */
export async function htmlToDocxBuffer(html, title = 'Documento') {
    try {
        // html-to-docx gestisce male immagini/grafici (dimensioni errate, SVG non
        // supportati). Per un documento di testo pulito rimuoviamo img, svg, canvas e
        // script: tabelle e testo restano. La versione "elegante" con grafici resta il PDF.
        const cleanHtml = String(html || '')
            .replace(/<img\b[^>]*>/gi, '')
            .replace(/<svg\b[\s\S]*?<\/svg>/gi, '')
            .replace(/<canvas\b[\s\S]*?<\/canvas>/gi, '')
            .replace(/<script\b[\s\S]*?<\/script>/gi, '');

        const buffer = await HTMLtoDOCX(cleanHtml, null, {
            title,
            orientation: 'portrait',
            // Tutti i margini DEVONO essere numerici: se header/footer/gutter mancano,
            // html-to-docx scrive w:header="undefined" → DOCX non apribile da Word.
            margins: { top: 720, right: 720, bottom: 720, left: 720, header: 0, footer: 0, gutter: 0 },
            table: { row: { cantSplit: true } },
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
