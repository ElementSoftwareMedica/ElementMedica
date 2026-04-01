/**
 * RefertoMailService — P71
 *
 * Invia il referto visita in allegato email al paziente
 * quando la visita ha il flag `invioRefertoMail = true`.
 *
 * Invocato al termine della visita (POST /visite/:id/termina)
 * in modo non bloccante (setImmediate).
 *
 * @module services/clinical/RefertoMailService
 * @project P71
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import { VisitaRefertoService } from './VisitaRefertoService.js';
import TenantPecConfigService from './TenantPecConfigService.js';
import EmailTemplateService from './EmailTemplateService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, '../..');

// ────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────

function buildTransporter(cfg) {
    return nodemailer.createTransport({
        host: cfg.smtpHost,
        port: cfg.smtpPort || 587,
        secure: cfg.smtpPort === 465,
        ...(!cfg.smtpSecure && cfg.smtpPort !== 465 && { requireTLS: true }),
        auth: {
            user: cfg.smtpUser || cfg.pecAddress,
            pass: cfg.smtpPassword || cfg.pecPassword
        },
        tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
        connectionTimeout: 15000,
        socketTimeout: 20000
    });
}

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

function buildRefertoEmailHtml({ paziente, dataVisita, servizio, medico, clinicName, clinicEmail, clinicPhone }) {
    return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;background:#f9fafb;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#0d9488,#0f766e);padding:32px 40px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:.5px}
  .body{padding:32px 40px}
  .infobox{background:#f0fdfa;border-left:4px solid #0d9488;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0}
  .infobox p{margin:4px 0;font-size:14px}
  .note{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 18px;margin:20px 0;font-size:13px;color:#6b7280}
  .footer{background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;font-size:12px;color:#6b7280}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>📋 Referto Visita</h1></div>
  <div class="body">
    <p>Gentile <strong>${paziente}</strong>,</p>
    <p>in allegato trova il <strong>referto della sua visita</strong>.</p>
    <div class="infobox">
      <p>📅 <strong>Data visita:</strong> ${dataVisita}</p>
      ${servizio ? `<p>🏥 <strong>Prestazione:</strong> ${servizio}</p>` : ''}
      ${medico ? `<p>👨‍⚕️ <strong>Medico:</strong> ${medico}</p>` : ''}
    </div>
    <div class="note">
      Conservi questo documento per future consultazioni mediche.
      Per qualsiasi domanda relativa al referto, si rivolga direttamente alla nostra struttura.
    </div>
  </div>
  <div class="footer">
    ${clinicName}${clinicPhone ? ' · ' + clinicPhone : ''}${clinicEmail ? ' · ' + clinicEmail : ''}<br>
    Messaggio generato automaticamente — non rispondere a questa email
  </div>
</div>
</body></html>`;
}

// ────────────────────────────────────────────
// SERVICE
// ────────────────────────────────────────────

class RefertoMailService {

    /**
     * Invia il referto PDF al paziente via email.
     * Invocato dopo la terminazione della visita solo se `invioRefertoMail = true`.
     *
     * @param {string} visitaId
     * @param {string} tenantId
     * @param {string} performedBy - personId autore dell'operazione
     * @returns {Promise<{ sent: boolean, error?: string }>}
     */
    async sendRefertoToPatient(visitaId, tenantId, performedBy) {
        logger.info({
            component: 'RefertoMailService',
            action: 'sendRefertoToPatient',
            visitaId, tenantId
        }, 'P71: invio referto via email');

        try {
            // 1. Carica visita
            const visita = await prisma.visita.findFirst({
                where: { id: visitaId, tenantId, deletedAt: null },
                include: {
                    paziente: { select: { id: true, firstName: true, lastName: true } },
                    medico: { select: { firstName: true, lastName: true, gender: true } },
                    prestazione: { select: { denominazione: true } }
                }
            });
            if (!visita) throw new Error(`Visita ${visitaId} non trovata`);

            if (!visita.invioRefertoMail) {
                logger.info({ component: 'RefertoMailService', visitaId },
                    'P71: invioRefertoMail = false — skip');
                return { sent: false };
            }

            // 2. Email paziente (P48: da PersonTenantProfile)
            const profile = await prisma.personTenantProfile.findFirst({
                where: { personId: visita.pazienteId, tenantId, deletedAt: null },
                select: { email: true }
            });
            const patientEmail = profile?.email ?? null;
            if (!patientEmail) {
                logger.warn({ component: 'RefertoMailService', visitaId },
                    'P71: paziente senza email — invio referto saltato');
                return { sent: false, error: 'no_patient_email' };
            }

            // 3. Recupera PDF referto
            const referto = await VisitaRefertoService.getLatestReferto(visitaId, tenantId);
            if (!referto?.filepath) {
                logger.warn({ component: 'RefertoMailService', visitaId },
                    'P71: nessun referto PDF disponibile');
                return { sent: false, error: 'no_pdf' };
            }

            const absPath = referto.filepath.startsWith('/')
                ? referto.filepath
                : path.join(BACKEND_DIR, referto.filepath);

            if (!existsSync(absPath)) {
                throw new Error(`File referto non trovato: ${absPath}`);
            }
            const pdfBuffer = readFileSync(absPath);

            // 4. Configurazione email tenant
            const emailCfg = await TenantPecConfigService.getConfigForSending(tenantId);
            if (!emailCfg) throw new Error('Configurazione email/PEC non disponibile');

            // 5. Info clinica e medico
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { name: true, settings: true }
            });
            const clinicName = tenant?.name || 'Clinica';
            const clinicEmail = tenant?.settings?.clinicEmail || '';
            const clinicPhone = tenant?.settings?.clinicPhone || '';

            const medicoGender = visita.medico?.gender || 'MALE';
            const medicoTitle = medicoGender === 'FEMALE' ? 'Dott.ssa' : 'Dott.';
            const medicoName = visita.medico
                ? `${medicoTitle} ${visita.medico.lastName} ${visita.medico.firstName}`
                : null;
            const pazienteName = `${visita.paziente?.firstName || ''} ${visita.paziente?.lastName || ''}`.trim();
            const servizioName = visita.prestazione?.denominazione || null;

            // 5b. P74: prova a risolvere il template email personalizzato
            const emailTpl = await EmailTemplateService.resolveTemplate(tenantId, {
                prestazioneId: visita.prestazioneId || undefined,
                medicoId: visita.medicoId || undefined,
                branca: 'MEDICA'
            }).catch(() => null);

            const emailSubject = emailTpl?.subject
                || `Referto visita del ${fmtDate(visita.dataOra)} — ${clinicName}`;

            const emailVars = {
                paziente: pazienteName,
                data: fmtDate(visita.dataOra),
                medico: medicoName || '',
                prestazione: servizioName || '',
                struttura: clinicName
            };

            const emailHtml = emailTpl?.bodyHtml
                ? EmailTemplateService.renderBody(emailTpl.bodyHtml, emailVars)
                : buildRefertoEmailHtml({
                    paziente: pazienteName,
                    dataVisita: fmtDate(visita.dataOra),
                    servizio: servizioName,
                    medico: medicoName,
                    clinicName, clinicEmail, clinicPhone
                });

            // 5c. P74: allegati aggiuntivi dal template email (InternalDocument MARKETING)
            const extraAttachments = [];
            if (emailTpl?.allegatiIds?.length > 0) {
                for (const docId of emailTpl.allegatiIds) {
                    try {
                        const doc = await prisma.internalDocument.findFirst({
                            where: { id: docId, tenantId, deletedAt: null, isCurrentVersion: true },
                            select: { fileUrl: true, fileName: true, mimeType: true }
                        });
                        if (doc) {
                            const absDocPath = doc.fileUrl.startsWith('/')
                                ? path.join(BACKEND_DIR, doc.fileUrl)
                                : doc.fileUrl;
                            if (existsSync(absDocPath)) {
                                extraAttachments.push({
                                    filename: doc.fileName,
                                    content: readFileSync(absDocPath),
                                    contentType: doc.mimeType || 'application/octet-stream'
                                });
                            }
                        }
                    } catch (attachErr) {
                        logger.warn({ component: 'RefertoMailService', docId, error: attachErr.message },
                            'P74: allegato extra non disponibile — saltato');
                    }
                }
            }

            // 6. Invia email
            const transporter = buildTransporter(emailCfg);
            await transporter.sendMail({
                from: `${clinicName} <${emailCfg.pecAddress || emailCfg.smtpUser}>`,
                to: patientEmail,
                subject: emailSubject,
                html: emailHtml,
                attachments: [
                    {
                        filename: referto.displayFilename || `referto_${visitaId}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    },
                    ...extraAttachments
                ]
            });

            logger.info({
                component: 'RefertoMailService',
                visitaId,
                email: `${patientEmail.slice(0, 3)}***`
            }, 'P71: referto inviato via email');

            // 7. GDPR Audit Log (non bloccante)
            this._logGdpr({
                visitaId, tenantId, performedBy,
                patientEmail: `${patientEmail.slice(0, 3)}***`
            }).catch(() => { });

            return { sent: true };

        } catch (err) {
            logger.error({
                component: 'RefertoMailService',
                action: 'sendRefertoToPatient',
                visitaId, tenantId,
                error: err.message
            }, 'P71: invio referto via email fallito');
            return { sent: false, error: err.message };
        }
    }

    async _logGdpr({ visitaId, tenantId, performedBy, patientEmail }) {
        try {
            const visita = await prisma.visita.findUnique({
                where: { id: visitaId },
                select: { pazienteId: true }
            });
            if (!visita) return;

            await prisma.gdprAuditLog.create({
                data: {
                    personId: visita.pazienteId,
                    action: 'REFERTO_EMAIL_DELIVERY',
                    resourceType: 'Visita',
                    resourceId: visitaId,
                    tenantId,
                    dataAccessed: {
                        performedBy,
                        patientEmail,
                        timestamp: new Date().toISOString()
                    }
                }
            });
        } catch (err) {
            logger.error({ component: 'RefertoMailService', error: err.message },
                'P71: GDPR audit log referto fallito');
        }
    }
}

export default new RefertoMailService();
