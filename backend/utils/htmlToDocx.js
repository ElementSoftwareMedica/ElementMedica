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
        const buffer = await HTMLtoDOCX(html, null, {
            title,
            orientation: 'portrait',
            margins: { top: 720, right: 720, bottom: 720, left: 720 }, // ~12.7mm (twips)
            table: { row: { cantSplit: true } },
            footer: false,
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
