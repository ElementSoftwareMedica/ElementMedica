/**
 * QueueSessionPdfService
 *
 * P70: Genera PDF lista pazienti per una sessione coda.
 * Il PDF include:
 *  - Intestazione: ambulatorio, medico/i, data e fascia oraria
 *  - Tabella: numero coda, cognome nome paziente, ora appuntamento, stato
 *
 * @module services/queue/QueueSessionPdfService
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import prisma from '../../config/prisma-optimization.js';
import { logger } from '../../utils/logger.js';

const COLOR_TEAL = rgb(0.06, 0.53, 0.47);  // teal-600
const COLOR_DARK = rgb(0.12, 0.12, 0.12);
const COLOR_GRAY = rgb(0.45, 0.45, 0.45);
const COLOR_LIGHT = rgb(0.94, 0.94, 0.94);
const COLOR_WHITE = rgb(1, 1, 1);

/**
 * Ritorna stringa HH:mm da DateTime
 */
function toTimeString(d) {
    if (!d) return '—';
    const date = new Date(d);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

/**
 * Formatta data italiana GG/MM/AAAA
 */
function toDateIT(d) {
    if (!d) return '—';
    const date = new Date(d);
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const yy = date.getUTCFullYear();
    return `${dd}/${mm}/${yy}`;
}

/**
 * Tronca stringa a maxLen caratteri
 */
function trunc(str, maxLen) {
    if (!str) return '—';
    return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

/**
 * Stato NumeroChiamata in italiano
 */
function statoLabel(stato) {
    const MAP = {
        IN_ATTESA: 'In attesa',
        CHIAMATO: 'Chiamato',
        IN_CORSO: 'In corso',
        COMPLETATO: 'Completato',
        ASSENTE: 'Assente',
        ANNULLATO: 'Annullato',
    };
    return MAP[stato] || stato || '—';
}

const QueueSessionPdfService = {

    /**
     * Genera un PDF con la lista pazienti della sessione coda.
     *
     * @param {string} sessionId - ID della sessione
     * @param {string} tenantId - ID del tenant
     * @returns {Promise<{buffer: Buffer, filename: string}>}
     */
    async generate(sessionId, tenantId) {
        // ── 1. Carica dati sessione ────────────────────────────────────────
        const session = await prisma.queueSession.findFirst({
            where: { id: sessionId, tenantId, deletedAt: null },
            include: {
                ambulatorio: { select: { nome: true, codice: true } },
                slotDisponibilita: { select: { oraInizio: true, oraFine: true, data: true } },
                medici: {
                    include: {
                        medico: {
                            include: {
                                person: { select: { firstName: true, lastName: true, gender: true } }
                            }
                        }
                    },
                    orderBy: { ordine: 'asc' }
                },
                entries: {
                    where: { deletedAt: null },
                    orderBy: { numero: 'asc' },
                    include: {
                        prestazione: { select: { nome: true } }
                    }
                }
            }
        });

        if (!session) {
            throw new Error('Sessione coda non trovata');
        }

        // ── 2. Carica appuntamenti e pazienti (NumeroChiamata non ha relazioni Prisma) ──
        const appuntamentoIds = session.entries
            .filter(e => e.appuntamentoId)
            .map(e => e.appuntamentoId);
        const pazienteIds = session.entries
            .filter(e => e.pazienteId && !e.appuntamentoId)
            .map(e => e.pazienteId);

        // Fetch appuntamenti con paziente + prestazione
        const appuntamentiMap = new Map();
        if (appuntamentoIds.length > 0) {
            const appuntamenti = await prisma.appuntamento.findMany({
                where: { id: { in: appuntamentoIds }, tenantId, deletedAt: null },
                select: {
                    id: true,
                    dataOra: true,
                    paziente: { select: { firstName: true, lastName: true } },
                    prestazione: { select: { nome: true } },
                }
            });
            for (const a of appuntamenti) appuntamentiMap.set(a.id, a);
        }

        // Fetch persone per walk-in con pazienteId ma senza appuntamento
        const personeMap = new Map();
        if (pazienteIds.length > 0) {
            const persone = await prisma.person.findMany({
                where: { id: { in: pazienteIds } },
                select: { id: true, firstName: true, lastName: true }
            });
            for (const p of persone) personeMap.set(p.id, p);
        }

        // ── 3. Costruisci PDF ────────────────────────────────────────────────
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const PAGE_W = 595;   // A4 width points (portrait)
        const PAGE_H = 842;   // A4 height points
        const MARGIN = 40;
        const CONTENT_W = PAGE_W - 2 * MARGIN;

        // helper: aggiungi pagina
        let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        let yPos = PAGE_H - MARGIN;

        // helper: addText
        const addText = (text, x, y, { size = 10, color = COLOR_DARK, bold = false } = {}) => {
            page.drawText(String(text), {
                x, y,
                size,
                font: bold ? fontBold : font,
                color,
            });
        };

        // helper: drawLine
        const drawLine = (y2, color = COLOR_LIGHT, thickness = 1) => {
            page.drawLine({
                start: { x: MARGIN, y: y2 },
                end: { x: PAGE_W - MARGIN, y: y2 },
                thickness,
                color,
            });
        };

        // ── 3a. Header ──────────────────────────────────────────────────────
        // Banner verde
        page.drawRectangle({
            x: 0, y: PAGE_H - 65,
            width: PAGE_W, height: 65,
            color: COLOR_TEAL,
        });
        addText('Lista Pazienti – Sessione Coda', MARGIN, PAGE_H - 30, { size: 18, bold: true, color: COLOR_WHITE });

        // Ambulatorio e data
        const ambNome = session.ambulatorio?.nome || 'Ambulatorio';
        const dataSess = session.slotDisponibilita?.data || session.date;
        const oraInizio = session.slotDisponibilita?.oraInizio || '—';
        const oraFine = session.slotDisponibilita?.oraFine || '—';
        addText(`${ambNome}  ·  ${toDateIT(dataSess)}  ·  ${oraInizio}–${oraFine}`, MARGIN, PAGE_H - 50, { size: 11, color: COLOR_WHITE });
        yPos = PAGE_H - 80;

        // Medici
        if (session.medici.length > 0) {
            const nomiMedici = session.medici.map(sm => {
                const p = sm.medico?.person;
                if (!p) return '—';
                const onorifico = p.gender === 'MALE' ? 'Dott.' : 'Dott.ssa';
                return `${onorifico} ${p.firstName} ${p.lastName}`;
            }).join('  |  ');
            addText(`Medico/i: ${nomiMedici}`, MARGIN, yPos, { size: 10, color: COLOR_GRAY });
            yPos -= 20;
        }

        addText(`Totale pazienti: ${session.entries.length}`, MARGIN, yPos, { size: 10, color: COLOR_GRAY });
        yPos -= 15;
        drawLine(yPos, COLOR_TEAL, 1.5);
        yPos -= 15;

        // ── 3b. Intestazione tabella ────────────────────────────────────────
        const COL = {
            numero: { x: MARGIN, w: 45 },
            paziente: { x: MARGIN + 50, w: 165 },
            ora: { x: MARGIN + 220, w: 60 },
            prestaz: { x: MARGIN + 285, w: 155 },
            stato: { x: MARGIN + 445, w: 80 },
        };

        // Header row background
        page.drawRectangle({
            x: MARGIN, y: yPos - 14,
            width: CONTENT_W, height: 18,
            color: COLOR_TEAL,
        });

        const addHeader = (label, col) => addText(label, col.x + 4, yPos - 10, { size: 9, bold: true, color: COLOR_WHITE });
        addHeader('N°', COL.numero);
        addHeader('Paziente', COL.paziente);
        addHeader('Ora App.', COL.ora);
        addHeader('Prestazione', COL.prestaz);
        addHeader('Stato', COL.stato);
        yPos -= 22;

        // ── 3c. Righe dati ──────────────────────────────────────────────────
        const ROW_H = 20;

        for (let i = 0; i < session.entries.length; i++) {
            const entry = session.entries[i];

            // Nuova pagina se non c'è spazio
            if (yPos < MARGIN + 30) {
                page = pdfDoc.addPage([PAGE_W, PAGE_H]);
                yPos = PAGE_H - MARGIN;
                // Ripeti header su nuova pagina
                page.drawRectangle({
                    x: MARGIN, y: yPos - 14, width: CONTENT_W, height: 18, color: COLOR_TEAL,
                });
                const addHdr2 = (lbl, col) => {
                    page.drawText(lbl, { x: col.x + 4, y: yPos - 10, size: 9, font: fontBold, color: COLOR_WHITE });
                };
                addHdr2('N°', COL.numero);
                addHdr2('Paziente', COL.paziente);
                addHdr2('Ora App.', COL.ora);
                addHdr2('Prestazione', COL.prestaz);
                addHdr2('Stato', COL.stato);
                yPos -= 22;
            }

            // Alterna sfondo bianco/grigio chiaro
            if (i % 2 === 0) {
                page.drawRectangle({
                    x: MARGIN, y: yPos - ROW_H + 4,
                    width: CONTENT_W, height: ROW_H,
                    color: COLOR_LIGHT,
                });
            }

            // Dati riga
            const app = entry.appuntamentoId ? appuntamentiMap.get(entry.appuntamentoId) : null;
            const person = entry.pazienteId && !app ? personeMap.get(entry.pazienteId) : null;
            const pazNome = app?.paziente
                ? `${app.paziente.lastName} ${app.paziente.firstName}`
                : person
                    ? `${person.lastName} ${person.firstName}`
                    : (entry.walkInData
                        ? `${entry.walkInData.lastName ?? ''} ${entry.walkInData.firstName ?? ''}`.trim() || 'Walk-in'
                        : '—');
            const oraApp = app ? toTimeString(app.dataOra) : (entry.dataOraArrivo ? toTimeString(entry.dataOraArrivo) + ' (arr.)' : '—');
            const prestazione = app?.prestazione?.nome || entry.prestazione?.nome || '—';

            page.drawText(String(entry.numero), { x: COL.numero.x + 4, y: yPos - 12, size: 10, font: fontBold, color: COLOR_DARK });
            page.drawText(trunc(pazNome, 28), { x: COL.paziente.x + 4, y: yPos - 12, size: 9, font, color: COLOR_DARK });
            page.drawText(oraApp, { x: COL.ora.x + 4, y: yPos - 12, size: 9, font, color: COLOR_DARK });
            page.drawText(trunc(prestazione, 24), { x: COL.prestaz.x + 4, y: yPos - 12, size: 9, font, color: COLOR_DARK });
            page.drawText(statoLabel(entry.stato), { x: COL.stato.x + 4, y: yPos - 12, size: 9, font, color: COLOR_GRAY });

            yPos -= ROW_H;
        }

        if (session.entries.length === 0) {
            addText('Nessun paziente in coda per questa sessione.', MARGIN, yPos - 12, { size: 10, color: COLOR_GRAY });
        }

        // ── 3d. Footer ──────────────────────────────────────────────────────
        const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
        lastPage.drawText(`Generato il ${new Date().toLocaleDateString('it-IT')}`, {
            x: MARGIN, y: 30, size: 8, font, color: COLOR_GRAY,
        });
        lastPage.drawText(`${session.entries.length} paziente/i in lista`, {
            x: PAGE_W - MARGIN - 100, y: 30, size: 8, font, color: COLOR_GRAY,
        });

        // ── 4. Salva ─────────────────────────────────────────────────────────
        const bytes = await pdfDoc.save();
        const buffer = Buffer.from(bytes);

        const dateStr = toDateIT(dataSess).replace(/\//g, '-');
        const filename = `coda-${session.ambulatorio?.codice || 'amb'}-${dateStr}.pdf`;

        logger.info('QueueSessionPdfService: PDF generato', {
            sessionId,
            tenantId,
            filename,
            entries: session.entries.length,
        });

        return { buffer, filename };
    },
};

export default QueueSessionPdfService;
