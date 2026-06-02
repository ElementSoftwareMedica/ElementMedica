/**
 * IdoneityNotificationService — P71
 *
 * Gestione consegna sicura dei Giudizi di Idoneità (Art. 41 c.7 D.Lgs 81/08):
 *
 *  1. deliverAfterVisitaComplete  — invocato al termine di una visita MDL:
 *       • Genera PDF del giudizio (lavoratore)
 *       • Crea archivio ZIP
 *       • Invia email al lavoratore con ZIP allegato
 *       • Invia password di apertura via WhatsApp (Twilio)
 *       • Traccia invioSicuroPazienteAt su GiudizioIdoneita
 *
 *  2. sendDailyZipToCompanies — invocato dal cron delle 22:00:
 *       • Per ogni azienda: raccoglie i giudizi emessi oggi non ancora inviati
 *       • Genera ZIP con tutti i PDF datore-di-lavoro della giornata
 *       • Invia email ZIP all'azienda
 *       • Comunica la password nella PEC/email aziendale
 *       • Traccia invioSicuroAziendaAt su ogni giudizio del batch
 *
 * @project P71 – Invio Referto Mail & Secure Delivery Idoneità
 * @module  services/clinical/IdoneityNotificationService
 * @compliance D.Lgs 81/08 Art. 41, GDPR Art. 9 & 32
 */

import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import SmsService from '../smsService.js';
import GiudizioIdoneitaPdfService from './GiudizioIdoneitaPdfService.js';
import TenantPecConfigService from './TenantPecConfigService.js';

const execFileAsync = promisify(execFile);

// ────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────

/** Genera password sicura 10 caratteri, mix upper+lower+digits (no O/0/l/I ambigui) */
function generateSecurePassword(length = 10) {
    const pool = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = crypto.randomBytes(length);
    return Array.from({ length }, (_, i) => pool[bytes[i] % pool.length]).join('');
}

/** Maschera numero telefono per log GDPR */
function maskPhone(phone) {
    if (!phone || phone.length < 6) return '***';
    return phone.slice(0, 3) + '****' + phone.slice(-3);
}

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

/**
 * Crea archivio ZIP con i file forniti.
 * @param {Array<{name: string, buffer: Buffer}>} files
 * @param {string} password
 * @returns {Promise<Buffer>}
 */
async function createZip(files, password) {
    if (!password) throw new Error('Password ZIP mancante');
    const dir = await mkdtemp(join(tmpdir(), 'em-giudizi-'));
    try {
        const zipPath = join(dir, 'giudizi.zip');
        const instructions = [
            'ISTRUZIONI / INSTRUCTIONS',
            '─────────────────────────────────',
            'Questo archivio contiene il Giudizio di Idoneità ai sensi del D.Lgs 81/08 Art. 41 c.7.',
            'Aprire l’archivio con la password comunicata dal canale indicato nella mail.',
            '',
            'This archive contains Fitness for Work Certificates under Italian Occupational Health Law.',
            'Open the archive using the password communicated through the channel stated in the email.',
            '─────────────────────────────────',
            `Generato: ${new Date().toLocaleString('it-IT')}`
        ].join('\n');
        const paths = [join(dir, 'LEGGIMI.txt')];
        await writeFile(paths[0], instructions, 'utf8');
        for (const [index, file] of files.entries()) {
            const safeName = String(file.name || `documento_${index + 1}.pdf`).replace(/[\\/]/g, '_');
            const filePath = join(dir, safeName);
            await writeFile(filePath, file.buffer);
            paths.push(filePath);
        }
        await execFileAsync('zip', ['-q', '-P', password, '-j', zipPath, ...paths], { timeout: 30000 });
        return await readFile(zipPath);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

// ────────────────────────────────────────────
// EMAIL TEMPLATES
// ────────────────────────────────────────────

function buildWorkerEmailHtml({ lavoratore, medico, mansione, dataEmissione, clinicName, clinicEmail, clinicPhone }) {
    return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;background:#f9fafb;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#0d9488,#0f766e);padding:32px 40px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:.5px}
  .body{padding:32px 40px}
  .infobox{background:#f0fdfa;border-left:4px solid #0d9488;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0}
  .infobox p{margin:4px 0;font-size:14px}
  .warning{background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin:20px 0;font-size:13px;color:#92400e}
  .footer{background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;font-size:12px;color:#6b7280}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>🏥 Giudizio di Idoneità</h1></div>
  <div class="body">
    <p>Gentile <strong>${lavoratore}</strong>,</p>
    <p>in allegato trova il proprio <strong>Giudizio di Idoneità alla Mansione</strong> redatto ai sensi dell'Art. 41 c.6 D.Lgs 81/08.</p>
    <div class="infobox">
      <p>📅 <strong>Data emissione:</strong> ${dataEmissione}</p>
      ${mansione ? `<p>💼 <strong>Mansione:</strong> ${mansione}</p>` : ''}
      <p>👨‍⚕️ <strong>Medico Competente:</strong> ${medico}</p>
    </div>
    <div class="warning">
      🔐 <strong>Sicurezza documento:</strong> L'archivio allegato è protetto.<br>
      La <strong>password di accesso</strong> le è stata inviata separatamente tramite <strong>WhatsApp</strong> al numero di telefono registrato.<br>
      Conservi la password in luogo sicuro.
    </div>
    <p style="font-size:13px;color:#374151">
      Ai sensi dell'Art. 41 c.9 D.Lgs 81/08, ha diritto di ricorrere contro il presente giudizio
      entro <strong>30 giorni</strong> dalla notifica rivolgendosi all'ASL territorialmente competente.
    </p>
  </div>
  <div class="footer">
    ${clinicName}${clinicPhone ? ' · ' + clinicPhone : ''}${clinicEmail ? ' · ' + clinicEmail : ''}<br>
    Documento generato in conformità al D.Lgs 81/08
  </div>
</div>
</body></html>`;
}

function buildAziendaEmailHtml({ aziendaName, dataEmissione, count, clinicName, clinicPhone, clinicEmail, password }) {
    return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;background:#f9fafb;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#0d9488,#0f766e);padding:32px 40px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px;font-weight:700}
  .body{padding:32px 40px}
  .infobox{background:#f0fdfa;border-left:4px solid #0d9488;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0}
  .infobox p{margin:4px 0;font-size:14px}
  .warning{background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin:20px 0;font-size:13px;color:#92400e}
  .footer{background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;font-size:12px;color:#6b7280}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>🏥 Giudizi di Idoneità — Riepilogo Giornaliero</h1></div>
  <div class="body">
    <p>Spett.le <strong>${aziendaName}</strong>,</p>
    <p>in allegato trova il riepilogo dei Giudizi di Idoneità emessi in data <strong>${dataEmissione}</strong>
    per i Suoi dipendenti.</p>
    <div class="infobox">
      <p>📋 <strong>Documenti inclusi:</strong> ${count} giudizi</p>
      <p>📅 <strong>Data emissione:</strong> ${dataEmissione}</p>
    </div>
    <div class="warning">
      🔐 <strong>Sicurezza documenti:</strong> L'archivio ZIP allegato è protetto.<br>
      Password di accesso: <strong style="font-family:monospace">${password}</strong>
    </div>
    <p style="font-size:13px;color:#374151">
      Ai sensi dell'Art. 41 c.7 D.Lgs 81/08, questa comunicazione è riservata al Datore di Lavoro
      o Dirigente delegato. I dati sanitari riservati non sono inclusi nella copia a Lei destinata.
    </p>
  </div>
  <div class="footer">
    ${clinicName}${clinicPhone ? ' · ' + clinicPhone : ''}${clinicEmail ? ' · ' + clinicEmail : ''}<br>
    Documento generato in conformità al D.Lgs 81/08
  </div>
</div>
</body></html>`;
}

// ────────────────────────────────────────────
// NODEMAILER TRANSPORTER
// ────────────────────────────────────────────

function buildTransporter(cfg) {
    const isStartTLS = !cfg.smtpSecure && cfg.smtpPort !== 465;
    return nodemailer.createTransport({
        host: cfg.smtpHost,
        port: cfg.smtpPort || 587,
        secure: cfg.smtpPort === 465,
        ...(isStartTLS && { requireTLS: true }),
        auth: {
            user: cfg.smtpUser || cfg.pecAddress,
            pass: cfg.smtpPassword || cfg.pecPassword
        },
        tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
        connectionTimeout: 15000,
        socketTimeout: 20000
    });
}

// ────────────────────────────────────────────
// MAIN SERVICE
// ────────────────────────────────────────────

class IdoneityNotificationService {

    // ──────────────────────────────────────────
    // PUBLIC: invio immediato dopo visita MDL
    // ──────────────────────────────────────────

    /**
     * Invio sicuro al lavoratore dopo completamento visita MDL.
     * Recupera automaticamente email/telefono dal PersonTenantProfile.
     *
     * @param {string} giudizioId
     * @param {string} tenantId
     * @param {string} performedBy - ID utente che ha completato la visita
     * @returns {Promise<{ emailSent: boolean, whatsappStatus: string, error?: string }>}
     */
    async deliverAfterVisitaComplete(giudizioId, tenantId, performedBy) {
        logger.info({
            component: 'IdoneityNotificationService',
            action: 'deliverAfterVisitaComplete',
            giudizioId, tenantId
        }, 'P71: avvio consegna sicura post-visita');

        try {
            // 1. Carica giudizio
            const giudizio = await this._loadGiudizio(giudizioId, tenantId);
            if (!giudizio) throw new Error(`Giudizio ${giudizioId} non trovato`);

            // 2. Configurazione email/PEC del tenant
            const emailCfg = await TenantPecConfigService.getConfigForSending(tenantId);
            if (!emailCfg) throw new Error('Configurazione email/PEC non disponibile');

            // 3. Recupera email e telefono paziente (P48)
            const profile = await prisma.personTenantProfile.findFirst({
                where: { personId: giudizio.personId, tenantId, deletedAt: null },
                select: { email: true, phone: true }
            });
            const workerEmail = profile?.email ?? null;
            const workerPhone = profile?.phone ?? null;

            if (!workerEmail) {
                logger.warn({ component: 'IdoneityNotificationService', giudizioId },
                    'P71: lavoratore senza email — invio saltato');
                return { emailSent: false, whatsappStatus: 'skipped', error: 'no_worker_email' };
            }

            // 4. Genera PDF lavoratore tramite GiudizioIdoneitaPdfService
            const pdfBuffer = await this._generatePdf(giudizioId, 'lavoratore', tenantId);

            // 5. Crea ZIP e password
            const password = generateSecurePassword(10);
            const lavoratoreNome = `${giudizio.person?.firstName || ''} ${giudizio.person?.lastName || ''}`.trim();
            const fileName = `giudizio_idoneita_${(giudizio.person?.lastName || 'doc').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
            const zipBuffer = await createZip([{ name: fileName, buffer: pdfBuffer }], password);

            // 6. Info clinica
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { name: true, settings: true }
            });
            const clinicName = tenant?.name || 'Clinica';
            const clinicEmail = tenant?.settings?.clinicEmail || tenant?.settings?.email || '';
            const clinicPhone = tenant?.settings?.clinicPhone || tenant?.settings?.phone || '';

            // 7. Invia email con ZIP
            const transporter = buildTransporter(emailCfg);
            await transporter.sendMail({
                from: `${clinicName} <${emailCfg.pecAddress || emailCfg.smtpUser}>`,
                to: workerEmail,
                subject: `Giudizio di Idoneità — ${lavoratoreNome} — ${fmtDate(new Date())}`,
                html: buildWorkerEmailHtml({
                    lavoratore: lavoratoreNome,
                    medico: this._formatMedico(giudizio.medicoCompetente),
                    mansione: giudizio.mansioni?.map(m => m.mansione?.denominazione).filter(Boolean).join(', ') || null,
                    dataEmissione: fmtDate(giudizio.dataEmissione),
                    clinicName, clinicEmail, clinicPhone
                }),
                attachments: [{
                    filename: `giudizio_${(giudizio.person?.lastName || 'doc').toLowerCase()}.zip`,
                    content: zipBuffer,
                    contentType: 'application/zip'
                }]
            });

            logger.info({
                component: 'IdoneityNotificationService',
                giudizioId,
                email: `${workerEmail.slice(0, 3)}***`
            }, 'P71: email lavoratore inviata');

            // 8. Invia password via WhatsApp (non bloccante)
            let whatsappStatus = 'skipped_no_phone';
            if (workerPhone) {
                try {
                    await this._sendPasswordViaWhatsApp(workerPhone, password, lavoratoreNome, clinicName, tenantId);
                    whatsappStatus = 'sent';
                } catch (waErr) {
                    whatsappStatus = `error:${waErr.message}`;
                    logger.warn({
                        component: 'IdoneityNotificationService',
                        giudizioId,
                        phone: maskPhone(workerPhone),
                        error: waErr.message
                    }, 'P71: WhatsApp password non inviata (email consegnata correttamente)');
                }
            }

            // 9. Aggiorna audit timestamp
            await prisma.giudizioIdoneita.update({
                where: { id: giudizioId },
                data: {
                    invioSicuroPazienteAt: new Date(),
                    dataNotificaLavoratore: new Date()
                }
            });

            // 10. GDPR Audit Log
            await this._logGdpr({
                giudizioId, tenantId, performedBy,
                action: 'SECURE_DELIVERY_WORKER',
                details: {
                    emailSent: true,
                    whatsappStatus,
                    recipientMasked: `${workerEmail.slice(0, 3)}***`
                }
            });

            return { emailSent: true, whatsappStatus };

        } catch (err) {
            logger.error({
                component: 'IdoneityNotificationService',
                action: 'deliverAfterVisitaComplete',
                giudizioId, tenantId,
                error: err.message
            }, 'P71: consegna sicura fallita (non bloccante)');
            return { emailSent: false, whatsappStatus: 'error', error: err.message };
        }
    }

    // ──────────────────────────────────────────
    // PUBLIC: invio sicuro manuale (da pec.routes)
    // ──────────────────────────────────────────

    /**
     * Invio sicuro manuale con destinatari espliciti.
     * Usato da POST /api/v1/clinica/pec/giudizio/:id/secure-send.
     *
     * @param {Object} options
     * @param {string} options.giudizioId
     * @param {string} options.tenantId
     * @param {string} options.performedBy
     * @param {Object} options.recipients
     * @param {Object} [options.recipients.worker]   { email, phone? }
     * @param {Object} [options.recipients.employer] { email, phone? }
     * @param {'sms'|'whatsapp'} [options.passwordChannel='whatsapp']
     * @returns {Promise<{ worker?: Object, employer?: Object, passwordsSent: string[] }>}
     */
    async sendSecureGiudizio({ giudizioId, tenantId, performedBy, recipients, passwordChannel = 'whatsapp' }) {
        const result = { worker: null, employer: null, passwordsSent: [] };

        const giudizio = await this._loadGiudizio(giudizioId, tenantId);
        if (!giudizio) throw new Error(`Giudizio ${giudizioId} non trovato`);

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true, settings: true }
        });
        const clinicName = tenant?.name || 'Clinica';
        const clinicEmail = tenant?.settings?.clinicEmail || '';
        const clinicPhone = tenant?.settings?.clinicPhone || '';

        const emailCfg = await TenantPecConfigService.getConfigForSending(tenantId);
        if (!emailCfg) throw new Error('Configurazione email/PEC non disponibile');

        const lavoratoreNome = `${giudizio.person?.firstName || ''} ${giudizio.person?.lastName || ''}`.trim();
        const dateLabel = fmtDate(new Date());

        // ── Invio al lavoratore ──────────────────────────────────────────
        if (recipients?.worker?.email) {
            try {
                const pdfBuffer = await this._generatePdf(giudizioId, 'lavoratore', tenantId);
                const password = generateSecurePassword(10);
                const fileName = `giudizio_idoneita_${(giudizio.person?.lastName || 'doc').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
                const zipBuffer = await createZip([{ name: fileName, buffer: pdfBuffer }], password);

                const transporter = buildTransporter(emailCfg);
                await transporter.sendMail({
                    from: `${clinicName} <${emailCfg.pecAddress || emailCfg.smtpUser}>`,
                    to: recipients.worker.email,
                    subject: `Giudizio di Idoneità — ${lavoratoreNome} — ${dateLabel}`,
                    html: buildWorkerEmailHtml({
                        lavoratore: lavoratoreNome,
                        medico: this._formatMedico(giudizio.medicoCompetente),
                        mansione: giudizio.mansioni?.map(m => m.mansione?.denominazione).filter(Boolean).join(', ') || null,
                        dataEmissione: fmtDate(giudizio.dataEmissione),
                        clinicName, clinicEmail, clinicPhone
                    }),
                    attachments: [{
                        filename: `giudizio_${(giudizio.person?.lastName || 'doc').toLowerCase()}.zip`,
                        content: zipBuffer,
                        contentType: 'application/zip'
                    }]
                });

                result.worker = { emailSent: true, passwordChannel: 'skipped_no_phone' };

                if (recipients.worker.phone) {
                    try {
                        await this._sendPasswordViaChannel(
                            recipients.worker.phone, password, lavoratoreNome, clinicName, tenantId, passwordChannel
                        );
                        result.worker.passwordChannel = `${passwordChannel}_sent`;
                        result.passwordsSent.push('worker');
                    } catch (waErr) {
                        result.worker.passwordChannel = `error:${waErr.message}`;
                        logger.warn({ giudizioId, error: waErr.message }, 'P71 sendSecureGiudizio: password worker non inviata');
                    }
                }

                // Aggiorna timestamp invio lavoratore
                await prisma.giudizioIdoneita.update({
                    where: { id: giudizioId },
                    data: { invioSicuroPazienteAt: new Date(), dataNotificaLavoratore: new Date() }
                });

                await this._logGdpr({
                    giudizioId, tenantId, performedBy,
                    action: 'MANUAL_SECURE_SEND_WORKER',
                    details: { emailSent: true, recipient: `${recipients.worker.email.slice(0, 3)}***` }
                });

            } catch (err) {
                logger.error({ giudizioId, error: err.message }, 'P71 sendSecureGiudizio: errore invio lavoratore');
                result.worker = { emailSent: false, error: err.message };
            }
        }

        // ── Invio al datore di lavoro ────────────────────────────────────
        if (recipients?.employer?.email) {
            try {
                const pdfBuffer = await this._generatePdf(giudizioId, 'datore', tenantId);
                const password = generateSecurePassword(10);
                const fileName = `giudizio_datore_${(giudizio.person?.lastName || 'doc').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
                const zipBuffer = await createZip([{ name: fileName, buffer: pdfBuffer }], password);

                const transporter = buildTransporter(emailCfg);
                await transporter.sendMail({
                    from: `${clinicName} <${emailCfg.pecAddress || emailCfg.smtpUser}>`,
                    to: recipients.employer.email,
                    subject: `Giudizio di Idoneità — ${lavoratoreNome} — ${dateLabel}`,
                    html: buildWorkerEmailHtml({
                        lavoratore: lavoratoreNome,
                        medico: this._formatMedico(giudizio.medicoCompetente),
                        mansione: giudizio.mansioni?.map(m => m.mansione?.denominazione).filter(Boolean).join(', ') || null,
                        dataEmissione: fmtDate(giudizio.dataEmissione),
                        clinicName, clinicEmail, clinicPhone
                    }),
                    attachments: [{
                        filename: `giudizio_datore_${(giudizio.person?.lastName || 'doc').toLowerCase()}.zip`,
                        content: zipBuffer,
                        contentType: 'application/zip'
                    }]
                });

                result.employer = { emailSent: true, passwordChannel: 'skipped_no_phone' };

                if (recipients.employer.phone) {
                    try {
                        await this._sendPasswordViaChannel(
                            recipients.employer.phone, password, clinicName, clinicName, tenantId, passwordChannel
                        );
                        result.employer.passwordChannel = `${passwordChannel}_sent`;
                        result.passwordsSent.push('employer');
                    } catch (waErr) {
                        result.employer.passwordChannel = `error:${waErr.message}`;
                        logger.warn({ giudizioId, error: waErr.message }, 'P71 sendSecureGiudizio: password datore non inviata');
                    }
                }

                // Aggiorna timestamp invio datore
                await prisma.giudizioIdoneita.update({
                    where: { id: giudizioId },
                    data: { invioSicuroAziendaAt: new Date(), dataNotificaDatoreLavoro: new Date() }
                });

                await this._logGdpr({
                    giudizioId, tenantId, performedBy,
                    action: 'MANUAL_SECURE_SEND_EMPLOYER',
                    details: { emailSent: true, recipient: `${recipients.employer.email.slice(0, 3)}***` }
                });

            } catch (err) {
                logger.error({ giudizioId, error: err.message }, 'P71 sendSecureGiudizio: errore invio datore');
                result.employer = { emailSent: false, error: err.message };
            }
        }

        return result;
    }

    // ──────────────────────────────────────────
    // PUBLIC: cron 22:00 — ZIP batch per aziende
    // ──────────────────────────────────────────

    /**
     * Batch giornaliero delle 22:00.
     * Per ogni azienda con giudizi emessi oggi genera un unico ZIP
     * con tutti i PDF "datore di lavoro" e lo invia via email.
     * La password è comunicata nella PEC/email aziendale.
     *
     * @param {string|null} tenantId - null = tutti i tenant attivi
     * @returns {Promise<{ total: number, companies: number, sent: number, errors: number }>}
     */
    async sendDailyZipToCompanies(tenantId = null) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        logger.info({
            component: 'IdoneityNotificationService',
            action: 'sendDailyZipToCompanies',
            date: today.toISOString().slice(0, 10),
            tenantId: tenantId || 'ALL'
        }, 'P71: avvio batch ZIP aziende (22:00)');

        // Recupera giudizi VALIDI di oggi non ancora inviati all'azienda
        const giudizi = await prisma.giudizioIdoneita.findMany({
            where: {
                deletedAt: null,
                stato: 'VALIDO',
                dataEmissione: { gte: today, lt: tomorrow },
                invioSicuroAziendaAt: null,
                ...(tenantId && { tenantId })
            },
            select: {
                id: true,
                personId: true,
                tenantId: true,
                dataEmissione: true,
                tipoGiudizio: true,
                person: { select: { firstName: true, lastName: true } },
                medicoCompetente: { select: { firstName: true, lastName: true, gender: true } },
                mansioni: {
                    include: {
                        mansione: {
                            select: {
                                codice: true,
                                denominazione: true,
                                site: {
                                    select: {
                                        companyTenantProfile: {
                                            select: {
                                                id: true,
                                                tenantId: true,
                                                emailGenerale: true,
                                                telefonoGenerale: true,
                                                company: { select: { ragioneSociale: true } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                visita: {
                    select: {
                        appuntamento: {
                            select: {
                                companyTenantProfile: {
                                    select: {
                                        id: true,
                                        tenantId: true,
                                        emailGenerale: true,
                                        telefonoGenerale: true,
                                        company: { select: { ragioneSociale: true } }
                                    }
                                }
                            }
                        }
                    }
                },
                tenant: { select: { name: true, settings: true } }
            }
        });

        // Raggruppa per (tenantId + companyTenantProfile.id)
        /** @type {Map<string, { tenantId: string, company: any, tenant: any, giudizi: any[] }>} */
        const grouped = new Map();
        for (const g of giudizi) {
            // Cerca companyProfile dalla prima mansione con site, o dalla visita
            const mansioneWithSite = g.mansioni?.find(m => m.mansione?.site?.companyTenantProfile);
            const company =
                mansioneWithSite?.mansione?.site?.companyTenantProfile ||
                g.visita?.appuntamento?.companyTenantProfile ||
                null;

            if (!company?.emailGenerale) continue; // nessuna email azienda

            const key = `${g.tenantId}::${company.id}`;
            if (!grouped.has(key)) {
                grouped.set(key, { tenantId: g.tenantId, company, tenant: g.tenant, giudizi: [] });
            }
            grouped.get(key).giudizi.push(g);
        }

        const stats = { total: giudizi.length, companies: grouped.size, sent: 0, errors: 0 };

        for (const [, group] of grouped) {
            try {
                await this._sendCompanyDailyZip(group, today);
                stats.sent++;
            } catch (err) {
                stats.errors++;
                logger.error({
                    component: 'IdoneityNotificationService',
                    action: 'sendDailyZipToCompanies',
                    tenantId: group.tenantId,
                    companyId: group.company.id,
                    error: err.message
                }, 'P71: errore batch ZIP per azienda');
            }
        }

        logger.info({ component: 'IdoneityNotificationService', ...stats },
            'P71: batch ZIP aziende completato');
        return stats;
    }

    // ──────────────────────────────────────────
    // PRIVATE: batch per singola azienda
    // ──────────────────────────────────────────

    async _sendCompanyDailyZip({ tenantId, company, tenant, giudizi }, date) {
        const aziendaEmail = company.emailGenerale;
        const aziendaName = company.company?.ragioneSociale || 'Azienda';
        const clinicName = tenant?.name || 'Clinica';
        const clinicPhone = tenant?.settings?.clinicPhone || '';
        const clinicEmail = tenant?.settings?.clinicEmail || '';

        // Genera PDF "datore" per ogni giudizio
        const files = [];
        for (const g of giudizi) {
            try {
                const buffer = await this._generatePdf(g.id, 'datore', tenantId);
                const lastName = g.person?.lastName?.toLowerCase() || g.id.slice(0, 8);
                files.push({ name: `giudizio_${lastName}_${date.toISOString().slice(0, 10)}.pdf`, buffer });
            } catch (pdfErr) {
                logger.warn({
                    component: 'IdoneityNotificationService',
                    giudizioId: g.id,
                    error: pdfErr.message
                }, 'P71: PDF generazione fallita — escluso dal ZIP');
            }
        }

        if (files.length === 0) throw new Error('Nessun PDF generabile per il batch');

        const password = generateSecurePassword(10);
        const zipBuffer = await createZip(files, password);
        const dateLabel = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const emailCfg = await TenantPecConfigService.getConfigForSending(tenantId);
        if (!emailCfg) throw new Error('Configurazione email/PEC non disponibile');

        const transporter = buildTransporter(emailCfg);
        await transporter.sendMail({
            from: `${clinicName} <${emailCfg.pecAddress || emailCfg.smtpUser}>`,
            to: aziendaEmail,
            subject: `Giudizi di Idoneità — ${aziendaName} — ${dateLabel} (${files.length} documenti)`,
            html: buildAziendaEmailHtml({
                aziendaName, dataEmissione: dateLabel,
                count: files.length, clinicName, clinicPhone, clinicEmail, password
            }),
            attachments: [{
                filename: `giudizi_${aziendaName.toLowerCase().replace(/\s+/g, '_')}_${date.toISOString().slice(0, 10)}.zip`,
                content: zipBuffer,
                contentType: 'application/zip'
            }]
        });

        logger.info({
            component: 'IdoneityNotificationService',
            aziendaName, count: files.length,
            email: `${aziendaEmail.slice(0, 3)}***`
        }, 'P71: ZIP azienda inviato');

        // Aggiorna timestamp su tutti i giudizi del batch
        await prisma.giudizioIdoneita.updateMany({
            where: { id: { in: giudizi.map(g => g.id) } },
            data: { invioSicuroAziendaAt: new Date(), dataNotificaDatoreLavoro: new Date() }
        });

        // GDPR Audit Log
        await this._logGdpr({
            giudizioId: giudizi[0].id,
            tenantId, performedBy: 'cron_22h',
            action: 'BATCH_ZIP_COMPANY',
            details: { aziendaName, count: files.length, emailSent: true, passwordChannel: 'pec_email' }
        });
    }

    // ──────────────────────────────────────────
    // PRIVATE: genera PDF tramite GiudizioIdoneitaPdfService
    // ──────────────────────────────────────────

    async _generatePdf(giudizioId, destinatario, tenantId) {
        const result = await GiudizioIdoneitaPdfService.generate(giudizioId, destinatario, tenantId);
        return result.buffer;
    }

    // ──────────────────────────────────────────
    // PRIVATE: WhatsApp via Twilio SmsService
    // ──────────────────────────────────────────

    async _sendPasswordViaWhatsApp(phone, password, recipientName, clinicName, tenantId) {
        return this._sendPasswordViaChannel(phone, password, recipientName, clinicName, tenantId, 'whatsapp');
    }

    async _sendPasswordViaChannel(phone, password, recipientName, clinicName, tenantId, channel = 'whatsapp') {
        const sendFn = channel === 'sms'
            ? (args) => SmsService.sendSMS(args)
            : (args) => SmsService.sendWhatsApp(args);

        await sendFn({
            to: phone,
            template: 'IDONEITA_PASSWORD',
            data: {
                recipientName,
                password,
                clinicName,
                date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
            },
            tenantId
        });
        logger.info({
            component: 'IdoneityNotificationService',
            phone: maskPhone(phone),
            channel
        }, 'P71: password inviata via ' + channel);
    }

    // ──────────────────────────────────────────
    // PRIVATE: carica giudizio
    // ──────────────────────────────────────────

    async _loadGiudizio(giudizioId, tenantId) {
        return prisma.giudizioIdoneita.findFirst({
            where: { id: giudizioId, tenantId, deletedAt: null },
            include: {
                person: { select: { id: true, firstName: true, lastName: true } },
                medicoCompetente: { select: { id: true, firstName: true, lastName: true, gender: true } },
                mansioni: { include: { mansione: { select: { codice: true, denominazione: true } } } },
                visita: { select: { id: true, dataOra: true } }
            }
        });
    }

    // ──────────────────────────────────────────
    // PRIVATE: formatta nome medico con onorificio
    // ──────────────────────────────────────────

    _formatMedico(m) {
        if (!m) return '—';
        const title = m.gender === 'FEMALE' ? 'Dott.ssa' : 'Dott.';
        return `${title} ${m.lastName} ${m.firstName}`;
    }

    // ──────────────────────────────────────────
    // PRIVATE: GDPR audit log
    // ──────────────────────────────────────────

    async _logGdpr({ giudizioId, tenantId, performedBy, action, details }) {
        try {
            const g = await prisma.giudizioIdoneita.findUnique({
                where: { id: giudizioId },
                select: { personId: true }
            });
            if (!g) return;

            await prisma.gdprAuditLog.create({
                data: {
                    personId: g.personId,
                    action,
                    resourceType: 'GiudizioIdoneita',
                    resourceId: giudizioId,
                    tenantId,
                    dataAccessed: {
                        ...details,
                        performedBy,
                        timestamp: new Date().toISOString()
                    }
                }
            });
        } catch (err) {
            // Non bloccante
            logger.error({ component: 'IdoneityNotificationService', error: err.message },
                'P71: GDPR audit log fallito');
        }
    }
}

export default new IdoneityNotificationService();
