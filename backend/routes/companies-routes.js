import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import middleware from '../middleware/auth.js';
import { checkAdvancedPermission, filterDataByPermissions, requireOwnCompany } from '../middleware/advanced-permissions.js';
import { roleDataFilter, filterResponseFields } from '../middleware/role-data-filter.js';
import TariffarioAziendaleService from '../services/management/TariffarioAziendaleService.js';
import MovimentoContabileGenerator from '../services/management/MovimentoContabileGenerator.js';
import RisultatiAnonimiService from '../services/clinical/RisultatiAnonimiService.js';
import RiunioniPeriodicheService from '../services/clinical/RiunioniPeriodicheService.js';
import pdfService from '../services/pdfService.js';
import { createSingleUpload, multerErrorHandler } from '../config/multer.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { personTenantAccessService } from '../services/PersonTenantAccessService.js';
import { isTrainerOnlyAccess, getTrainerCompanyProfileIds } from '../utils/trainerAccess.js';
import { assertUploadedFileIsSafe, computeSha256Buffer, computeSha256File } from '../utils/fileSecurity.js';
import { PDFDocument } from 'pdf-lib';

const router = express.Router();
import prisma from '../config/prisma-optimization.js';
import { randomUUID } from 'crypto';

const { authenticate: authenticateToken } = middleware;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '..');
const COMPANY_MDL_UPLOAD_ROOT = path.resolve(BACKEND_ROOT, 'uploads', 'company-mdl-documents');
const MDL_DOCUMENT_TYPES = new Set(['nomine', 'tariffario', 'riunione-periodica', 'risultati-anonimi']);

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function resolveCompanyTenantProfile(id, tenantId) {
  return prisma.companyTenantProfile.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        { id },
        { companyId: id }
      ]
    },
    include: {
      company: true,
      tenant: { select: { name: true, settings: true } },
      sites: { where: { deletedAt: null }, orderBy: { siteName: 'asc' } }
    }
  });
}

function safeDocumentType(value) {
  const type = String(value || '').toLowerCase();
  return MDL_DOCUMENT_TYPES.has(type) ? type : null;
}

function ensureMdlDocumentDir(tenantId, profileId, documentType) {
  const dir = path.resolve(COMPANY_MDL_UPLOAD_ROOT, tenantId, profileId, documentType);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sanitizeStoredFilename(filename = '') {
  return path.basename(String(filename)).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function listMdlDocumentFiles(tenantId, profileId, documentType) {
  const dir = ensureMdlDocumentDir(tenantId, profileId, documentType);
  return fs.readdirSync(dir)
    .filter(name => !name.endsWith('.json'))
    .map(name => {
      const filePath = path.join(dir, name);
      const stat = fs.statSync(filePath);
      let metadata = {};
      try {
        metadata = JSON.parse(fs.readFileSync(`${filePath}.json`, 'utf8'));
      } catch {
        metadata = {};
      }
      return {
        filename: name,
        originalName: metadata.originalName || name,
        note: metadata.note || null,
        signedOnline: metadata.signedOnline === true,
        generatedOnline: metadata.generatedOnline === true,
        sha256: metadata.sha256 || null,
        sourceSha256: metadata.sourceSha256 || null,
        scanStatus: metadata.scanStatus || null,
        createdAt: metadata.createdAt || stat.birthtime.toISOString(),
        uploadedBy: metadata.uploadedBy || null,
        size: stat.size,
        url: `/api/v1/companies/${profileId}/mdl-documents/${documentType}/files/${encodeURIComponent(name)}`
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function archiveMdlDocumentBuffer({
  tenantId,
  profileId,
  documentType,
  buffer,
  originalName,
  note = null,
  generatedBy = null,
  extraMetadata = {}
}) {
  const dir = ensureMdlDocumentDir(tenantId, profileId, documentType);
  const storedName = `${documentType}-${Date.now()}-${sanitizeStoredFilename(originalName || 'documento.pdf')}`;
  const targetPath = path.join(dir, storedName);
  const sha256 = computeSha256Buffer(buffer);
  fs.writeFileSync(targetPath, buffer);
  fs.writeFileSync(`${targetPath}.json`, JSON.stringify({
    originalName: originalName || storedName,
    mimeType: 'application/pdf',
    note,
    signedOnline: false,
    generatedOnline: true,
    sha256,
    sourceSha256: null,
    scanStatus: 'GENERATED',
    uploadedBy: generatedBy,
    createdAt: new Date().toISOString(),
    ...extraMetadata
  }, null, 2));
  return storedName;
}

async function logCompanyMdlDocumentAudit(req, {
  tenantId,
  action,
  profileId,
  documentType,
  filename = null,
  originalName = null,
  sha256 = null,
  sourceSha256 = null,
  scanStatus = null,
  extra = {}
}) {
  await prisma.gdprAuditLog.create({
    data: {
      personId: req.person?.id || null,
      tenantId,
      action,
      resourceType: 'CompanyMdlDocument',
      resourceId: profileId,
      dataAccessed: {
        documentType,
        filename,
        originalName,
        sha256,
        sourceSha256,
        scanStatus,
        ...extra
      },
      ipAddress: req.ip || null,
      userAgent: req.get?.('user-agent') || null
    }
  }).catch(err => logger.warn('GdprAuditLog documento MDL non salvato', { error: err.message, action, documentType }));
}

function resolveTenantLogo(profile) {
  const settings = profile?.tenant?.settings || {};
  return settings?.branches?.MEDICA?.logo || settings?.branches?.MDL?.logo || settings?.logoUrl || settings?.logo || '';
}

function logoPathToDataUrl(rawPath) {
  if (!rawPath) return '';
  if (String(rawPath).startsWith('data:image/')) return rawPath;

  let effectivePath = String(rawPath);
  if (/^https?:\/\//i.test(effectivePath)) {
    try {
      const url = new URL(effectivePath);
      const isOwnHost = ['localhost', '127.0.0.1', '0.0.0.0', 'www.elementmedica.com', 'elementmedica.com', 'www.elementsicurezza.com', 'elementsicurezza.com'].includes(url.hostname);
      if (!isOwnHost) return effectivePath;
      effectivePath = url.pathname;
    } catch {
      return effectivePath;
    }
  }

  const cleanPath = effectivePath.startsWith('/') ? effectivePath.slice(1) : effectivePath;
  const projectRoot = path.resolve(BACKEND_ROOT, '..');
  const candidates = [
    path.join(BACKEND_ROOT, cleanPath),
    path.join(BACKEND_ROOT, 'public', cleanPath),
    path.join(projectRoot, 'public', cleanPath),
    path.join(projectRoot, cleanPath),
    path.join(BACKEND_ROOT, 'uploads', path.basename(cleanPath)),
    path.join(projectRoot, 'uploads', path.basename(cleanPath))
  ];

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(BACKEND_ROOT) && !resolved.startsWith(projectRoot)) continue;
    if (!fs.existsSync(resolved)) continue;
    const ext = path.extname(resolved).toLowerCase();
    const mime = ext === '.svg'
      ? 'image/svg+xml'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.webp'
          ? 'image/webp'
          : 'image/png';
    return `data:${mime};base64,${fs.readFileSync(resolved).toString('base64')}`;
  }

  logger.warn('Logo tenant non risolto per PDF nomine', { logoPath: rawPath });
  return '';
}

function decodeSignatureImage(signatureBase64) {
  const raw = String(signatureBase64 || '');
  if (!raw) return null;
  const base64 = raw.startsWith('data:') ? raw.split(',')[1] : raw;
  return Buffer.from(base64, 'base64');
}

async function stampSignatureOnPdf(pdfBuffer, signatureImage, placement = {}) {
  const signatureBuffer = decodeSignatureImage(signatureImage);
  if (!signatureBuffer) return pdfBuffer;

  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const targetPageIndex = placement?.page
    ? Math.min(Math.max(Number(placement.page) - 1, 0), pages.length - 1)
    : pages.length - 1;
  const page = pages[targetPageIndex];
  const { width, height } = page.getSize();
  const xRatio = Number.isFinite(Number(placement?.xRatio)) ? Number(placement.xRatio) : 0.58;
  const yRatio = Number.isFinite(Number(placement?.yRatio)) ? Number(placement.yRatio) : 0.82;
  const widthRatio = Number.isFinite(Number(placement?.widthRatio)) ? Number(placement.widthRatio) : 0.32;
  const heightRatio = Number.isFinite(Number(placement?.heightRatio)) ? Number(placement.heightRatio) : 0.09;
  const image = String(signatureImage).includes('image/jpeg') || String(signatureImage).includes('image/jpg')
    ? await pdfDoc.embedJpg(signatureBuffer)
    : await pdfDoc.embedPng(signatureBuffer);

  page.drawImage(image, {
    x: xRatio * width,
    y: height - (yRatio * height) - (heightRatio * height),
    width: widthRatio * width,
    height: heightRatio * height
  });

  return Buffer.from(await pdfDoc.save());
}

async function generateNominePdfBuffer(profile, tipo = null) {
  const tenantName = profile.tenant?.name || 'Element';
  const tenantLogo = logoPathToDataUrl(resolveTenantLogo(profile));
  const nomine = await prisma.nominaRuolo.findMany({
    where: {
      companyTenantProfileId: profile.id,
      tenantId: profile.tenantId,
      deletedAt: null,
      tipoRuolo: tipo === 'MC'
        ? { in: ['MEDICO_COMPETENTE', 'MEDICO_COMPETENTE_COORDINATO'] }
        : tipo === 'RSPP'
          ? { in: ['RSPP'] }
          : { in: ['MEDICO_COMPETENTE', 'MEDICO_COMPETENTE_COORDINATO', 'RSPP'] },
      stato: 'ATTIVA'
    },
    include: {
      person: {
        select: { firstName: true, lastName: true, taxCode: true, birthDate: true, birthPlace: true }
      },
      site: { select: { siteName: true, indirizzo: true, citta: true, provincia: true } }
    },
    orderBy: [{ tipoRuolo: 'asc' }, { dataInizio: 'asc' }]
  });

  const roleLabel = {
    MEDICO_COMPETENTE: 'Medico Competente',
    MEDICO_COMPETENTE_COORDINATO: 'Medico Competente Coordinato',
    RSPP: 'RSPP'
  };
  const formatDate = (value) => value ? new Date(value).toLocaleDateString('it-IT') : '-';
  const companyName = profile.company?.ragioneSociale || '-';
  const companyAddress = [profile.company?.sedeLegaleIndirizzo, profile.company?.sedeLegaleCitta, profile.company?.sedeLegaleProvincia].filter(Boolean).join(', ') || '-';
  const rows = nomine.map(nomina => `
    <tr>
      <td>${escapeHtml(roleLabel[nomina.tipoRuolo] || nomina.tipoRuolo)}</td>
      <td>${escapeHtml(`${nomina.person?.lastName || ''} ${nomina.person?.firstName || ''}`.trim() || '-')}</td>
      <td>${escapeHtml(nomina.person?.taxCode || '-')}</td>
      <td>${escapeHtml(nomina.site?.siteName || 'Tutta azienda')}</td>
      <td>${formatDate(nomina.dataInizio)}</td>
      <td>${formatDate(nomina.dataScadenza || nomina.dataFine)}</td>
    </tr>
  `).join('');

  const html = `
    <!doctype html>
    <html lang="it">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; color: #172033; margin: 0; padding: 32px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f766e; padding-bottom: 16px; margin-bottom: 24px; }
        .logo { max-width: 170px; max-height: 68px; object-fit: contain; }
        .tenant { text-align: right; font-size: 11px; color: #667085; }
        h1 { font-size: 24px; margin: 0 0 6px; color: #0f766e; letter-spacing: .01em; }
        h2 { font-size: 14px; margin: 22px 0 10px; color: #1f2937; text-transform: uppercase; letter-spacing: .04em; }
        p { font-size: 12px; line-height: 1.55; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11px; }
        th { background: #0f766e; color: white; text-align: left; }
        th, td { border: 1px solid #d7dee8; padding: 8px; vertical-align: top; }
        tr:nth-child(even) td { background: #f8fafc; }
        .muted { color: #667085; }
        .box { border: 1px solid #d7dee8; border-radius: 10px; padding: 14px; margin-top: 14px; background: #f8fafc; }
        .clause { border-left: 4px solid #0f766e; padding: 12px 14px; background: #f0fdfa; border-radius: 8px; margin-top: 16px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 56px; }
        .signature-line { border-top: 1px solid #344054; padding-top: 7px; font-size: 11px; color: #4b5563; min-height: 34px; }
        .footer { margin-top: 34px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #98a2b3; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>${tenantLogo ? `<img class="logo" src="${escapeHtml(tenantLogo)}" alt="${escapeHtml(tenantName)}">` : `<h1>${escapeHtml(tenantName)}</h1>`}</div>
        <div class="tenant">
          <strong>${escapeHtml(tenantName)}</strong><br>
          Documento generato il ${formatDate(new Date())}
        </div>
      </div>
      <h1>Nomine figure della sicurezza e medicina del lavoro</h1>
      <p class="muted">Documento riepilogativo delle nomine attive per l'azienda, comprensivo di medico competente, eventuali medici competenti coordinati e RSPP.</p>
      <div class="box">
        <p><strong>Azienda:</strong> ${escapeHtml(companyName)}</p>
        <p><strong>P.IVA / CF:</strong> ${escapeHtml(profile.company?.piva || profile.company?.codiceFiscale || '-')}</p>
        <p><strong>Sede legale:</strong> ${escapeHtml(companyAddress)}</p>
      </div>
      <h2>Nomine attive</h2>
      <table>
        <thead>
          <tr><th>Ruolo</th><th>Nominativo</th><th>Codice fiscale</th><th>Ambito/Sede</th><th>Decorrenza</th><th>Scadenza</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="6">Nessuna nomina attiva presente.</td></tr>'}</tbody>
      </table>
      <div class="clause">
        <p>Le parti prendono atto che le nomine indicate decorrono dalle date riportate e restano valide fino a revoca, sostituzione o scadenza indicata. In assenza di comunicazione scritta di disdetta almeno 30 giorni prima della scadenza annuale, l'incarico si intende tacitamente rinnovato per un ulteriore anno, salvo diverse previsioni contrattuali o normative applicabili.</p>
        <p>Il medico competente opera secondo quanto previsto dal D.Lgs. 81/08 e successive modifiche, coordinandosi con il datore di lavoro, il servizio di prevenzione e protezione e gli eventuali medici competenti coordinati nominati per specifiche sedi o ambiti aziendali.</p>
      </div>
      <div class="signatures">
        <div class="signature-line">Firma Datore di Lavoro</div>
        <div class="signature-line">Firma Professionista incaricato</div>
      </div>
      <div class="footer">${escapeHtml(companyName)} - ${escapeHtml(tenantName)}</div>
    </body>
    </html>
  `;

  return pdfService.generatePDF(html, {
    format: 'A4',
    margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
  });
}

/**
 * P48 Helper: Trova o crea CompanyTenantProfile e opzionalmente un CompanySite
 * @param {Object} tx - Prisma client/transaction
 * @param {string} companyId - Company ID
 * @param {string} tenantId - Tenant ID
 * @param {Object} siteData - Dati sede (opzionale)
 * @param {Object} profileData - Dati profilo tenant (opzionale)
 * @returns {Promise<{profile: Object, site: Object|null}>}
 */
async function ensureProfileAndSite(tx, companyId, tenantId, siteData = {}, profileData = {}) {
  // Trova o crea profilo
  let profile = await tx.companyTenantProfile.findFirst({
    where: { companyId, tenantId, deletedAt: null }
  });
  if (!profile) {
    // Filtra undefined/null da profileData
    const cleanProfileData = {};
    Object.keys(profileData).forEach(k => {
      if (profileData[k] !== undefined && profileData[k] !== null && profileData[k] !== '') {
        cleanProfileData[k] = profileData[k];
      }
    });
    profile = await tx.companyTenantProfile.create({
      data: { companyId, tenantId, status: 'ACTIVE', isActive: true, isPrimary: true, ...cleanProfileData }
    });
  } else if (Object.keys(profileData).length > 0) {
    // Aggiorna profilo esistente con nuovi dati
    const cleanProfileData = {};
    Object.keys(profileData).forEach(k => {
      if (profileData[k] !== undefined && profileData[k] !== null && profileData[k] !== '') {
        cleanProfileData[k] = profileData[k];
      }
    });
    if (Object.keys(cleanProfileData).length > 0) {
      profile = await tx.companyTenantProfile.update({
        where: { id: profile.id },
        data: cleanProfileData
      });
    }
  }

  // Crea sede se dati presenti
  let site = null;
  const siteWarnings = [];
  const hasSiteInput = siteData.siteCitta || siteData.siteIndirizzo || siteData.siteName;
  if (hasSiteInput) {
    const siteName = siteData.siteName || siteData.siteCitta || 'Sede Principale';

    // Valida FK opzionali prima di creare la sede: rsppId, medicoCompetenteId, referenteId
    let validRsppId = undefined;
    let validMedicoCompetenteId = undefined;
    if (siteData.rsppId) {
      const rsppExists = await tx.person.findFirst({ where: { id: siteData.rsppId, deletedAt: null, tenantProfiles: { some: { tenantId, deletedAt: null } } } });
      if (rsppExists) {
        validRsppId = siteData.rsppId;
      } else {
        siteWarnings.push(`RSPP con ID "${siteData.rsppId}" non trovato nel sistema — campo ignorato`);
      }
    }
    if (siteData.medicoCompetenteId) {
      const mcExists = await tx.person.findFirst({ where: { id: siteData.medicoCompetenteId, deletedAt: null, tenantProfiles: { some: { tenantId, deletedAt: null } } } });
      if (mcExists) {
        validMedicoCompetenteId = siteData.medicoCompetenteId;
      } else {
        siteWarnings.push(`Medico competente con ID "${siteData.medicoCompetenteId}" non trovato nel sistema — campo ignorato`);
      }
    }

    const companySiteData = {
      companyTenantProfileId: profile.id,
      tenantId,
      siteName,
      citta: siteData.siteCitta,
      indirizzo: siteData.siteIndirizzo,
      cap: siteData.siteCap,
      provincia: siteData.siteProvincia,
      telefono: siteData.siteTelefono,
      mail: siteData.siteMail,
      dvr: siteData.dvr,
      rsppId: validRsppId,
      medicoCompetenteId: validMedicoCompetenteId,
      ultimoSopralluogo: siteData.ultimoSopralluogo ? new Date(siteData.ultimoSopralluogo) : undefined,
      prossimoSopralluogo: siteData.prossimoSopralluogo ? new Date(siteData.prossimoSopralluogo) : undefined,
      valutazioneSopralluogo: siteData.valutazioneSopralluogo,
      sopralluogoEseguitoDa: siteData.sopralluogoEseguitoDa,
      ultimoSopralluogoRSPP: siteData.ultimoSopralluogoRSPP ? new Date(siteData.ultimoSopralluogoRSPP) : undefined,
      prossimoSopralluogoRSPP: siteData.prossimoSopralluogoRSPP ? new Date(siteData.prossimoSopralluogoRSPP) : undefined,
      noteSopralluogoRSPP: siteData.noteSopralluogoRSPP,
      ultimoSopralluogoMedico: siteData.ultimoSopralluogoMedico ? new Date(siteData.ultimoSopralluogoMedico) : undefined,
      prossimoSopralluogoMedico: siteData.prossimoSopralluogoMedico ? new Date(siteData.prossimoSopralluogoMedico) : undefined,
      noteSopralluogoMedico: siteData.noteSopralluogoMedico,
    };
    Object.keys(companySiteData).forEach(k => {
      if (companySiteData[k] === undefined || companySiteData[k] === null) delete companySiteData[k];
    });
    // Idempotenza: cerca sede esistente con stesso nome+indirizzo+città
    const existingSite = await tx.companySite.findFirst({
      where: {
        companyTenantProfileId: profile.id,
        siteName,
        ...(companySiteData.indirizzo ? { indirizzo: companySiteData.indirizzo } : {}),
        ...(companySiteData.citta ? { citta: companySiteData.citta } : {})
      }
    });
    if (!existingSite) {
      site = await tx.companySite.create({ data: companySiteData });
    }
  }

  return { profile, site, warnings: siteWarnings };
}

/**
 * Sanitizza i dati dell'azienda rimuovendo i campi che appartengono al modello CompanySite
 * @param {Object} companyData - Dati grezzi dell'azienda dal CSV
 * @returns {Object} - Oggetto con i dati sanitizzati per Company e CompanySite
 */
function sanitizeCompanyData(companyData) {
  // Campi validi per il modello Company (basati sullo schema Prisma P48)
  const validCompanyFields = [
    'id', 'piva', 'codiceFiscale', 'ragioneSociale', 'formaGiuridica',
    'sedeLegaleIndirizzo', 'sedeLegaleCitta', 'sedeLegaleCap', 'sedeLegaleProvincia',
    'sedeLegaleNazione', 'codiceAteco', 'settore', 'dimensione', 'sdi', 'pecFatturazione',
    'createdAt', 'updatedAt', 'deletedAt'
  ];

  // Campi per CompanyTenantProfile (gestiti separatamente)
  const profileFields = [
    'iban', 'pec', 'emailGenerale', 'telefonoGenerale', 'referenteId', 'referenteRuolo',
    'dataInizioRapporto', 'dataFineRapporto',
    'tipoContratto', 'numeroContratto', 'valoreContrattoAnnuo',
    'listinoPrezzi', 'scontoPercentuale', 'terminiPagamento', 'modalitaPagamento',
    'noteCommerciali', 'noteOperative', 'noteInterne', 'note', 'status', 'isActive'
  ];

  // Campi che appartengono al modello CompanySite (inclusi alias legacy)
  const companySiteFieldMap = {
    // alias -> canonical key in siteData
    siteName: 'siteName',
    nomeSede: 'siteName',
    sedeAzienda: 'siteName',
    siteIndirizzo: 'siteIndirizzo',
    indirizzo: 'siteIndirizzo',
    siteCitta: 'siteCitta',
    citta: 'siteCitta',
    siteProvincia: 'siteProvincia',
    provincia: 'siteProvincia',
    siteCap: 'siteCap',
    cap: 'siteCap',
    sitePersonaRiferimento: 'sitePersonaRiferimento',
    personaRiferimento: 'sitePersonaRiferimento',
    siteTelefono: 'siteTelefono',
    telefono: 'siteTelefono',
    siteMail: 'siteMail',
    mail: 'siteMail',
    dvr: 'dvr',
    rsppId: 'rsppId',
    medicoCompetenteId: 'medicoCompetenteId',
    ultimoSopralluogo: 'ultimoSopralluogo',
    prossimoSopralluogo: 'prossimoSopralluogo',
    valutazioneSopralluogo: 'valutazioneSopralluogo',
    sopralluogoEseguitoDa: 'sopralluogoEseguitoDa',
    ultimoSopralluogoRSPP: 'ultimoSopralluogoRSPP',
    prossimoSopralluogoRSPP: 'prossimoSopralluogoRSPP',
    noteSopralluogoRSPP: 'noteSopralluogoRSPP',
    ultimoSopralluogoMedico: 'ultimoSopralluogoMedico',
    prossimoSopralluogoMedico: 'prossimoSopralluogoMedico',
    noteSopralluogoMedico: 'noteSopralluogoMedico'
  };

  const companyDataOnly = {};
  const siteDataOnly = {};
  const profileDataOnly = {};

  Object.keys(companyData).forEach(key => {
    if (validCompanyFields.includes(key)) {
      companyDataOnly[key] = companyData[key];
    } else if (profileFields.includes(key)) {
      // Mappa 'note' → 'noteInterne' per il profilo
      const profileKey = key === 'note' ? 'noteInterne' : key;
      profileDataOnly[profileKey] = companyData[key];
    } else if (companySiteFieldMap[key]) {
      const canonical = companySiteFieldMap[key];
      siteDataOnly[canonical] = companyData[key];
    } else {
      // Log per campi non riconosciuti (per debug)
      logger.debug(`Campo non riconosciuto ignorato: ${key}`, {
        component: 'companies-routes',
        action: 'sanitizeCompanyData',
        field: key
      });
    }
  });

  // Normalizza siteName
  if (!siteDataOnly.siteName) {
    siteDataOnly.siteName = siteDataOnly.siteCitta || 'Sede Principale';
  }

  return {
    companyData: companyDataOnly,
    siteData: siteDataOnly,
    profileData: profileDataOnly
  };
}


// ===== PROGETTO 57: CROSS-TENANT IMPORT =====

/**
 * GET /api/companies/check-existing
 * Verifica se una Company esiste già globalmente per piva o codiceFiscale
 * NON espone dati sensibili - solo conferma esistenza
 *
 * @query piva - Partita IVA
 * @query codiceFiscale - Codice fiscale aziendale
 * @query targetTenantId - Il tenant TARGET (obbligatorio per cross-tenant GET)
 */
router.get('/check-existing',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  async (req, res) => {
    try {
      const { piva, codiceFiscale, targetTenantId } = req.query;
      const tenantId = targetTenantId || getEffectiveTenantId(req);

      if (!piva && !codiceFiscale) {
        return res.status(400).json({
          error: 'È richiesto almeno uno tra piva e codiceFiscale'
        });
      }

      const whereClause = {
        deletedAt: null,
        OR: []
      };

      if (piva) {
        whereClause.OR.push({ piva: piva.trim() });
      }
      if (codiceFiscale) {
        whereClause.OR.push({ codiceFiscale: codiceFiscale.toUpperCase().trim() });
      }

      const existingCompany = await prisma.company.findFirst({
        where: whereClause,
        select: {
          id: true,
          ragioneSociale: true,
          piva: true,
          codiceFiscale: true,
          formaGiuridica: true,
          tenantProfiles: {
            where: { deletedAt: null },
            select: {
              id: true,
              tenantId: true
            }
          }
        }
      });

      if (!existingCompany) {
        return res.json({
          exists: false,
          canImport: false,
          message: 'Nessuna azienda trovata con questi identificativi'
        });
      }

      const existsInCurrentTenant = existingCompany.tenantProfiles.some(
        profile => profile.tenantId === tenantId
      );

      if (existsInCurrentTenant) {
        return res.json({
          exists: true,
          canImport: false,
          existsInCurrentTenant: true,
          message: 'L\'azienda esiste già nel tenant corrente'
        });
      }

      return res.json({
        exists: true,
        canImport: true,
        existsInCurrentTenant: false,
        company: {
          id: existingCompany.id,
          ragioneSociale: existingCompany.ragioneSociale,
          piva: existingCompany.piva,
          codiceFiscale: existingCompany.codiceFiscale,
          formaGiuridica: existingCompany.formaGiuridica,
          profileCount: existingCompany.tenantProfiles.length
        },
        message: 'Azienda trovata in altri tenant. Puoi importarla nel tuo tenant.'
      });

    } catch (error) {
      logger.error('Error checking existing company:', {
        error: 'Errore interno del server',
        piva: req.query.piva,
        tenantId: req.person?.tenantId
      });
      res.status(500).json({ error: 'Errore durante la verifica' });
    }
  }
);

/**
 * POST /api/companies/import-cross-tenant
 * Importa una Company esistente creando un nuovo CompanyTenantProfile
 * OBBLIGATORIO: Registra consenso GDPR in CompanyDataShareConsent PRIMA del profile
 */
router.post('/import-cross-tenant',
  authenticateToken,
  checkAdvancedPermission('companies', 'create'),
  async (req, res) => {
    try {
      const { companyId, sharedDataTypes, profileData = {} } = req.body;
      const tenantId = getEffectiveTenantId(req);
      const performedById = req.person?.id;
      const ipAddress = req.ip || req.connection?.remoteAddress;

      if (!companyId) {
        return res.status(400).json({ error: 'companyId è obbligatorio' });
      }

      const validDataTypes = ['ANAGRAFICA', 'CONTATTI', 'DOCUMENTI', 'FORMAZIONE', 'SICUREZZA'];
      if (!Array.isArray(sharedDataTypes) || sharedDataTypes.length === 0) {
        return res.status(400).json({ error: 'sharedDataTypes è obbligatorio e deve essere un array non vuoto' });
      }
      const invalidTypes = sharedDataTypes.filter(t => !validDataTypes.includes(t));
      if (invalidTypes.length > 0) {
        return res.status(400).json({
          error: `Tipi dati non validi: ${invalidTypes.join(', ')}. Valori consentiti: ${validDataTypes.join(', ')}`
        });
      }

      const existingCompany = await prisma.company.findFirst({
        where: { id: companyId, deletedAt: null },
        include: {
          tenantProfiles: {
            where: { tenantId }
          }
        }
      });

      if (!existingCompany) {
        return res.status(404).json({ error: 'Azienda non trovata' });
      }

      const activeProfile = existingCompany.tenantProfiles.find(p => !p.deletedAt);
      const deletedProfile = existingCompany.tenantProfiles.find(p => p.deletedAt);

      if (activeProfile) {
        return res.status(409).json({ error: 'L\'azienda ha già un profilo in questo tenant' });
      }

      const sourceProfile = await prisma.companyTenantProfile.findFirst({
        where: { companyId, deletedAt: null },
        select: { tenantId: true }
      });

      const result = await prisma.$transaction(async (tx) => {
        // 1. PRIMA: Crea il consenso GDPR (OBBLIGATORIO)
        const consent = await tx.companyDataShareConsent.create({
          data: {
            companyId,
            sourceTenantId: sourceProfile?.tenantId || tenantId,
            targetTenantId: tenantId,
            sharedDataTypes,
            consentGiven: true,
            consentDate: new Date(),
            consentMethod: 'IMPORT_CROSS_TENANT',
            legalBasis: 'GDPR Art.6.1.a - Consenso esplicito per import cross-tenant'
          }
        });

        let newProfile;

        if (deletedProfile) {
          newProfile = await tx.companyTenantProfile.update({
            where: { id: deletedProfile.id },
            data: {
              deletedAt: null,
              ...profileData,
              updatedAt: new Date()
            }
          });
          logger.info('Restored previously deleted company profile', {
            profileId: deletedProfile.id,
            companyId,
            tenantId
          });
        } else {
          newProfile = await tx.companyTenantProfile.create({
            data: {
              companyId,
              tenantId,
              ...profileData
            }
          });
        }

        // 3. Registra audit log GDPR
        await tx.gdprAuditLog.create({
          data: {
            companyId,
            action: 'IMPORT_CROSS_TENANT',
            resourceType: 'COMPANY_PROFILE',
            resourceId: newProfile.id,
            dataAccessed: {
              profileId: newProfile.id,
              consentId: consent.id,
              sharedDataTypes,
              targetTenantId: tenantId,
              performedBy: performedById
            },
            ipAddress,
            tenantId
          }
        });

        return { profile: newProfile, consent };
      });

      logger.info('Company imported cross-tenant successfully', {
        companyId,
        targetTenantId: tenantId,
        profileId: result.profile.id,
        consentId: result.consent.id,
        sharedDataTypes,
        performedBy: performedById
      });

      res.status(201).json({
        success: true,
        message: 'Azienda importata con successo nel tenant',
        profile: result.profile,
        consentId: result.consent.id
      });

    } catch (error) {
      logger.error('Error importing company cross-tenant:', {
        error: 'Errore interno del server',
        companyId: req.body.companyId,
        tenantId: req.person?.tenantId
      });
      res.status(500).json({ error: 'Errore durante l\'importazione' });
    }
  }
);

/**
 * POST /api/companies/:id/hide-from-view
 * Revoca il consent cross-tenant senza eliminare i dati originali
 * Usato quando un non-owner vuole "eliminare" un'azienda condivisa
 */
router.post('/:id/hide-from-view',
  authenticateToken,
  checkAdvancedPermission('companies', 'delete'),
  async (req, res) => {
    try {
      const { id: companyId } = req.params;
      const { reason } = req.body;
      const tenantId = getEffectiveTenantId(req);
      const revokedBy = req.person.id;

      const consent = await prisma.companyDataShareConsent.findFirst({
        where: {
          companyId,
          targetTenantId: tenantId,
          isRevoked: false
        }
      });

      if (!consent) {
        return res.status(400).json({
          success: false,
          error: 'Operazione non valida',
          message: 'Questa azienda non è stata condivisa con il tuo tenant. Se sei il proprietario, usa l\'eliminazione normale.',
          code: 'NOT_SHARED_COMPANY'
        });
      }

      await prisma.companyDataShareConsent.update({
        where: { id: consent.id },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy,
          revokedReason: reason || 'Nascosto dalla vista dal tenant'
        }
      });

      await prisma.gdprAuditLog.create({
        data: {
          companyId,
          action: 'HIDE_FROM_VIEW',
          resourceType: 'CompanyDataShareConsent',
          resourceId: consent.id,
          tenantId,
          dataAccessed: {
            consentId: consent.id,
            sourceTenantId: consent.sourceTenantId,
            targetTenantId: tenantId,
            revokedBy,
            reason: reason || 'Nascosto dalla vista dal tenant',
            operation: 'REVOKE_CONSENT'
          }
        }
      });

      logger.info('Company hidden from view (consent revoked)', {
        companyId,
        consentId: consent.id,
        tenantId,
        revokedBy,
        reason
      });

      res.json({
        success: true,
        message: 'Azienda nascosta dalla vista con successo',
        consentId: consent.id
      });

    } catch (error) {
      logger.error('Error hiding company from view:', {
        error: 'Errore interno del server',
        companyId: req.params?.id,
        tenantId: req.person?.tenantId
      });
      res.status(500).json({ error: 'Errore durante l\'operazione' });
    }
  }
);


router.get('/:id/mdl-documents/nomine.pdf',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const profile = await resolveCompanyTenantProfile(req.params.id, tenantId);

      if (!profile) {
        return res.status(404).json({ success: false, error: 'Azienda non trovata' });
      }

      const buffer = await generateNominePdfBuffer(profile, req.query.tipo || null);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="nomine-${profile.id}.pdf"`);
      return res.send(buffer);
    } catch (error) {
      logger.error({ error: error.message, companyOrProfileId: req.params.id }, 'Errore generazione PDF nomine azienda');
      return res.status(500).json({ success: false, error: 'Errore nella generazione del PDF nomine' });
    }
  }
);

router.get('/:id/mdl-documents/:documentType/files',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const documentType = safeDocumentType(req.params.documentType);
      if (!documentType) return res.status(400).json({ success: false, error: 'Tipologia documento non valida' });

      const profile = await resolveCompanyTenantProfile(req.params.id, tenantId);
      if (!profile) return res.status(404).json({ success: false, error: 'Azienda non trovata' });

      return res.json({
        success: true,
        data: listMdlDocumentFiles(tenantId, profile.id, documentType)
      });
    } catch (error) {
      logger.error({ error: error.message, companyOrProfileId: req.params.id }, 'Errore elenco documenti MDL azienda');
      return res.status(500).json({ success: false, error: 'Errore nel recupero dei documenti' });
    }
  }
);

router.get('/:id/mdl-documents/:documentType/files/:filename',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const documentType = safeDocumentType(req.params.documentType);
      if (!documentType) return res.status(400).json({ success: false, error: 'Tipologia documento non valida' });

      const profile = await resolveCompanyTenantProfile(req.params.id, tenantId);
      if (!profile) return res.status(404).json({ success: false, error: 'Azienda non trovata' });

      const dir = ensureMdlDocumentDir(tenantId, profile.id, documentType);
      const filePath = path.resolve(dir, sanitizeStoredFilename(req.params.filename));
      if (!filePath.startsWith(dir + path.sep) || !fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'Documento non trovato' });
      }
      let metadata = {};
      try {
        metadata = JSON.parse(fs.readFileSync(`${filePath}.json`, 'utf8'));
      } catch {
        metadata = {};
      }

      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (metadata.sha256) res.setHeader('X-Document-SHA256', metadata.sha256);
      await logCompanyMdlDocumentAudit(req, {
        tenantId,
        action: 'DOWNLOAD',
        profileId: profile.id,
        documentType,
        filename: path.basename(filePath),
        originalName: metadata.originalName || path.basename(filePath),
        sha256: metadata.sha256 || null,
        sourceSha256: metadata.sourceSha256 || null,
        scanStatus: metadata.scanStatus || null
      });
      return res.sendFile(filePath);
    } catch (error) {
      logger.error({ error: error.message, companyOrProfileId: req.params.id }, 'Errore download documento MDL azienda');
      return res.status(500).json({ success: false, error: 'Errore nel recupero del documento' });
    }
  }
);

router.post('/:id/mdl-documents/:documentType/upload',
  authenticateToken,
  checkAdvancedPermission('companies', 'update'),
  createSingleUpload('documento', {
    destination: 'uploads/company-mdl-temp',
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxFileSize: 25 * 1024 * 1024
  }),
  multerErrorHandler,
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const documentType = safeDocumentType(req.params.documentType);
      if (!documentType) return res.status(400).json({ success: false, error: 'Tipologia documento non valida' });
      if (!req.file) return res.status(400).json({ success: false, error: 'File documento obbligatorio' });

      const profile = await resolveCompanyTenantProfile(req.params.id, tenantId);
      if (!profile) return res.status(404).json({ success: false, error: 'Azienda non trovata' });

      const security = await assertUploadedFileIsSafe(req.file.path);
      const dir = ensureMdlDocumentDir(tenantId, profile.id, documentType);
      const storedName = `${documentType}-${Date.now()}-${sanitizeStoredFilename(req.file.originalname)}`;
      const targetPath = path.join(dir, storedName);
      fs.renameSync(req.file.path, targetPath);
      const metadata = {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        note: req.body?.note || null,
        signedOnline: false,
        generatedOnline: false,
        sha256: security.sha256,
        sourceSha256: null,
        scanStatus: security.scan.status,
        scanned: security.scan.scanned,
        uploadedBy: req.person?.id || null,
        createdAt: new Date().toISOString()
      };
      fs.writeFileSync(`${targetPath}.json`, JSON.stringify(metadata, null, 2));

      await prisma.activityLog.create({
        data: {
          personId: req.person.id,
          tenantId,
          action: 'COMPANY_MDL_DOCUMENT_UPLOAD',
          category: 'companies',
          resource: 'CompanyTenantProfile',
          resourceId: profile.id,
          details: JSON.stringify({ documentType, filename: storedName, originalName: req.file.originalname, sha256: security.sha256, scanStatus: security.scan.status }),
          timestamp: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      }).catch(err => logger.warn('ActivityLog upload documento MDL non salvato', { error: err.message }));
      await logCompanyMdlDocumentAudit(req, {
        tenantId,
        action: 'UPLOAD',
        profileId: profile.id,
        documentType,
        filename: storedName,
        originalName: req.file.originalname,
        sha256: security.sha256,
        scanStatus: security.scan.status
      });

      return res.status(201).json({
        success: true,
        data: listMdlDocumentFiles(tenantId, profile.id, documentType)[0]
      });
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      if (error.code === 'MALWARE_SCAN_FAILED' || error.code === 'MALWARE_SCAN_NOT_CONFIGURED') {
        return res.status(400).json({ success: false, error: 'File rifiutato dalla scansione sicurezza' });
      }
      logger.error({ error: error.message, companyOrProfileId: req.params.id }, 'Errore upload documento MDL azienda');
      return res.status(500).json({ success: false, error: 'Errore nel caricamento del documento' });
    }
  }
);

router.post('/:id/mdl-documents/:documentType/sign',
  authenticateToken,
  checkAdvancedPermission('companies', 'update'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const documentType = safeDocumentType(req.params.documentType);
      if (!documentType) return res.status(400).json({ success: false, error: 'Tipologia documento non valida' });

      const profile = await resolveCompanyTenantProfile(req.params.id, tenantId);
      if (!profile) return res.status(404).json({ success: false, error: 'Azienda non trovata' });

      const firma = String(req.body?.signature || '').trim();
      const signatureImage = req.body?.signatureImage || '';
      if (!signatureImage && firma.length < 2) {
        return res.status(400).json({ success: false, error: 'Firma obbligatoria' });
      }

      const companyName = profile.company?.ragioneSociale || 'Azienda';
      let buffer;
      let sourceSha256 = null;
      const sourceFilename = req.body?.sourceFilename ? sanitizeStoredFilename(String(req.body.sourceFilename)) : null;
      if (sourceFilename) {
        const dir = ensureMdlDocumentDir(tenantId, profile.id, documentType);
        const sourcePath = path.resolve(dir, sourceFilename);
        if (!sourcePath.startsWith(dir + path.sep) || !fs.existsSync(sourcePath)) {
          return res.status(404).json({ success: false, error: 'Documento da firmare non trovato' });
        }
        buffer = fs.readFileSync(sourcePath);
        sourceSha256 = computeSha256File(sourcePath);
      } else if (documentType === 'nomine') {
        buffer = await generateNominePdfBuffer(profile);
      } else if (documentType === 'riunione-periodica') {
        const anno = parseInt(String(req.body?.anno || new Date().getFullYear()), 10);
        buffer = await RiunioniPeriodicheService.generatePdf(profile.id, anno, tenantId, {
          delibereConclusioni: String(req.body?.delibereConclusioni || '').slice(0, 5000)
        });
      } else if (documentType === 'risultati-anonimi') {
        const dateFrom = String(req.body?.dateFrom || `${new Date().getFullYear() - 1}-01-01`);
        const dateTo = String(req.body?.dateTo || `${new Date().getFullYear() - 1}-12-31`);
        buffer = await RisultatiAnonimiService.generatePdf(profile.id, dateFrom, dateTo, tenantId);
      } else {
        const html = `
          <!doctype html>
          <html lang="it"><head><meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
            h1 { color: #0f766e; font-size: 22px; }
            p { font-size: 12px; line-height: 1.5; }
            .box { border: 1px solid #d1d5db; border-radius: 10px; padding: 16px; background: #f8fafc; }
          </style></head><body>
            <h1>Tariffario Medicina del Lavoro</h1>
            <div class="box">
              <p><strong>Azienda:</strong> ${escapeHtml(companyName)}</p>
              <p><strong>Documento:</strong> Tariffario aziendale MdL</p>
              <p><strong>Data firma:</strong> ${new Date().toLocaleString('it-IT')}</p>
            </div>
          </body></html>
        `;
        buffer = await pdfService.generatePDF(html, {
          format: 'A4',
          margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
        });
      }
      buffer = await stampSignatureOnPdf(buffer, signatureImage, req.body?.placement || {});
      const signedSha256 = computeSha256Buffer(buffer);
      const dir = ensureMdlDocumentDir(tenantId, profile.id, documentType);
      const storedName = `${documentType}-firmato-online-${Date.now()}.pdf`;
      const targetPath = path.join(dir, storedName);
      fs.writeFileSync(targetPath, buffer);
      fs.writeFileSync(`${targetPath}.json`, JSON.stringify({
        originalName: `${documentType}-firmato-online.pdf`,
        mimeType: 'application/pdf',
        note: req.body?.note || null,
        signedOnline: true,
        signatureMode: signatureImage ? 'DRAWN' : 'TEXT',
        sha256: signedSha256,
        sourceSha256,
        scanStatus: 'GENERATED',
        signerName: firma || null,
        uploadedBy: req.person?.id || null,
        createdAt: new Date().toISOString()
      }, null, 2));

      await prisma.activityLog.create({
        data: {
          personId: req.person.id,
          tenantId,
          action: 'COMPANY_MDL_DOCUMENT_SIGN',
          category: 'companies',
          resource: 'CompanyTenantProfile',
          resourceId: profile.id,
          details: JSON.stringify({ documentType, filename: storedName, sha256: signedSha256, sourceSha256 }),
          timestamp: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      }).catch(err => logger.warn('ActivityLog firma documento MDL non salvato', { error: err.message }));
      await logCompanyMdlDocumentAudit(req, {
        tenantId,
        action: 'SIGN',
        profileId: profile.id,
        documentType,
        filename: storedName,
        originalName: `${documentType}-firmato-online.pdf`,
        sha256: signedSha256,
        sourceSha256,
        scanStatus: 'GENERATED',
        extra: {
          signatureMode: signatureImage ? 'DRAWN' : 'TEXT',
          sourceFilename
        }
      });

      return res.status(201).json({
        success: true,
        data: listMdlDocumentFiles(tenantId, profile.id, documentType)[0]
      });
    } catch (error) {
      logger.error({ error: error.message, companyOrProfileId: req.params.id }, 'Errore firma documento MDL azienda');
      return res.status(500).json({ success: false, error: 'Errore nella firma del documento' });
    }
  }
);


// Get all companies
router.get('/',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  roleDataFilter,
  filterDataByPermissions(),
  filterResponseFields,
  async (req, res) => {
    try {
      const person = req.person;
      const permissionContext = req.permissionContext;
      const { allTenants, tenantIds: tenantIdsParam } = req.query;
      const baseTenantId = getEffectiveTenantId(req);

      // Determine effective tenant IDs for filtering
      let effectiveTenantIds = [baseTenantId];
      const globalRole = person.globalRole;
      const roles = person.roles || [];
      const CROSS_TENANT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'GLOBAL_ADMIN'];
      const hasCrossTenantAccess = CROSS_TENANT_ROLES.includes(globalRole) ||
        CROSS_TENANT_ROLES.some(role => roles.includes(role));

      if (hasCrossTenantAccess && (allTenants === 'true' || tenantIdsParam)) {
        const accessibleTenants = await personTenantAccessService.getAccessibleTenants(person.id, globalRole);
        const accessibleTenantIds = accessibleTenants.map(t => t.id);

        if (tenantIdsParam) {
          const requestedIds = tenantIdsParam.split(',').map(id => id.trim());
          effectiveTenantIds = accessibleTenantIds.length > 0
            ? requestedIds.filter(id => accessibleTenantIds.includes(id))
            : requestedIds;
        } else if (allTenants === 'true' && accessibleTenantIds.length > 0) {
          effectiveTenantIds = accessibleTenantIds;
        }

        if (effectiveTenantIds.length === 0) {
          effectiveTenantIds = [baseTenantId];
        }
      }

      const tenantFilter = effectiveTenantIds.length === 1
        ? effectiveTenantIds[0]
        : { in: effectiveTenantIds };

      // Verifica se l'utente è EMPLOYEE (ha solo il ruolo EMPLOYEE, non altri ruoli admin)
      const personRoles = await prisma.personRole.findMany({
        where: {
          personId: person.id,
          tenantId: tenantFilter,
          isActive: true,
          deletedAt: null
        },
        select: { roleType: true }
      });

      const roleTypes = personRoles.map(pr => pr.roleType);
      const isEmployeeOnly = roleTypes.includes('EMPLOYEE') &&
        !roleTypes.some(r => ['ADMIN', 'TRAINING_ADMIN', 'HR_MANAGER', 'COMPANY_MANAGER', 'SITE_MANAGER'].includes(r));

      const isTrainerOnly = roleTypes.includes('TRAINER') &&
        !roleTypes.some(r => ['ADMIN', 'TRAINING_ADMIN', 'HR_MANAGER', 'COMPANY_MANAGER', 'SITE_MANAGER'].includes(r));

      const isPrivilegedCompanyViewer = roleTypes.some(r => [
        'SUPER_ADMIN',
        'ADMIN',
        'TENANT_ADMIN',
        'CLINIC_ADMIN',
        'COMPANY_MANAGER',
        'HR_MANAGER',
        'TRAINING_ADMIN',
        'SEGRETERIA_CLINICA'
      ].includes(r)) || ['SUPER_ADMIN', 'ADMIN', 'TENANT_ADMIN'].includes(globalRole);

      const restrictProfileIds = (filter, ids) => {
        const uniqueIds = [...new Set(ids.filter(Boolean))];
        if (!filter.id) {
          filter.id = { in: uniqueIds };
          return;
        }
        if (typeof filter.id === 'string') {
          filter.id = uniqueIds.includes(filter.id) ? filter.id : { in: [] };
          return;
        }
        if (Array.isArray(filter.id?.in)) {
          filter.id = { in: filter.id.in.filter(id => uniqueIds.includes(id)) };
        }
      };

      const excludeProfileIds = (filter, ids) => {
        const uniqueIds = [...new Set(ids.filter(Boolean))];
        if (uniqueIds.length === 0) return;
        if (!filter.id) {
          filter.id = { notIn: uniqueIds };
          return;
        }
        if (typeof filter.id === 'string') {
          filter.id = uniqueIds.includes(filter.id) ? { in: [] } : filter.id;
          return;
        }
        if (Array.isArray(filter.id?.in)) {
          filter.id = { in: filter.id.in.filter(id => !uniqueIds.includes(id)) };
          return;
        }
        if (Array.isArray(filter.id?.notIn)) {
          filter.id = { notIn: [...new Set([...filter.id.notIn, ...uniqueIds])] };
        }
      };

      // Se è EMPLOYEE, mostra solo la propria azienda (P48: usa companyTenantProfileId)
      let profileFilter = { tenantId: tenantFilter, deletedAt: null };
      if (isEmployeeOnly && person.companyTenantProfileId) {
        profileFilter.id = person.companyTenantProfileId;
      } else if (isTrainerOnly) {
        // TRAINER vede solo le aziende dei propri corsi programmati
        const baseTenantIdStr = typeof tenantFilter === 'string' ? tenantFilter : baseTenantId;
        const trainerProfileIds = await getTrainerCompanyProfileIds(person.id, baseTenantIdStr);
        profileFilter.id = { in: trainerProfileIds };
      } else if (permissionContext.scope === 'company' && person.companyTenantProfileId) {
        profileFilter.id = person.companyTenantProfileId;
      }

      if (req.query.mdlOnly === 'true') {
        const nominaMedicoCompetenteMode = ['with', 'without', 'all'].includes(req.query.nominaMedicoCompetente)
          ? req.query.nominaMedicoCompetente
          : (req.query.includeAssignable === 'true' && isPrivilegedCompanyViewer ? 'all' : 'with');
        const mdlNomineWhere = {
          tenantId: tenantFilter,
          deletedAt: null,
          stato: 'ATTIVA',
          tipoRuolo: { in: ['MEDICO_COMPETENTE', 'MEDICO_COMPETENTE_COORDINATO'] },
          companyTenantProfileId: { not: null },
          ...(!isPrivilegedCompanyViewer ? { personId: person.id } : {})
        };
        const mdlNomine = await prisma.nominaRuolo.findMany({
          where: mdlNomineWhere,
          select: { companyTenantProfileId: true }
        });
        const nominatedProfileIds = mdlNomine.map(n => n.companyTenantProfileId);
        if (nominaMedicoCompetenteMode === 'with') {
          restrictProfileIds(profileFilter, nominatedProfileIds);
        } else if (nominaMedicoCompetenteMode === 'without') {
          if (!isPrivilegedCompanyViewer) {
            restrictProfileIds(profileFilter, []);
          } else {
            excludeProfileIds(profileFilter, nominatedProfileIds);
          }
        }
      }

      const companies = await prisma.company.findMany({
        where: {
          tenantProfiles: {
            some: profileFilter
          },
          deletedAt: null
        },
        orderBy: { createdAt: 'desc' },
        include: {
          tenantProfiles: {
            where: {
              tenantId: tenantFilter,
              deletedAt: null
            },
            include: {
              sites: {
                where: { deletedAt: null },
                select: {
                  id: true,
                  siteName: true,
                  citta: true,
                  indirizzo: true,
                  cap: true,
                  provincia: true,
                  telefono: true,
                  mail: true,
                  rsppId: true,
                  medicoCompetenteId: true,
                  createdAt: true,
                  updatedAt: true
                }
              }
            }
          }
        }
      });

      // P48: Flatten tenantProfiles[0].sites → company.sites per backward compatibility frontend
      const companiesFlattened = companies.map(c => {
        const profile = c.tenantProfiles?.[0] || {};
        const allProfiles = c.tenantProfiles || [];
        const { tenantProfiles, ...companyData } = c;
        // Merge sites from all tenant profiles (for multi-tenant view)
        const allSites = allProfiles.flatMap(p => p.sites || []);
        return {
          ...companyData,
          sites: allSites.length > 0 ? allSites : (profile.sites || []),
          profileStatus: profile.status || null,
          emailGenerale: profile.emailGenerale || null,
          telefonoGenerale: profile.telefonoGenerale || null,
          pec: profile.pec || null,
          iban: profile.iban || null,
          companyTenantProfileId: profile.id || null,
          // Include all CTP IDs for cross-tenant matching
          allCompanyTenantProfileIds: allProfiles.map(p => p.id).filter(Boolean)
        };
      });

      res.json(companiesFlattened);
    } catch (error) {
      logger.error('Failed to fetch companies', {
        component: 'companies-routes',
        action: 'getCompanies',
        error: 'Operazione non riuscita',
        stack: error.stack
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nel recupero delle aziende'
      });
    }
  }
);

// Get alerts summary for a company (expiring items counts)
router.get('/:id/alerts-summary',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Find the CompanyTenantProfile for this company+tenant
      const profile = await prisma.companyTenantProfile.findFirst({
        where: { companyId: id, tenantId, deletedAt: null },
        select: { id: true }
      });

      if (!profile) {
        return res.json({
          success: true,
          data: { movimentiDaFatturare: 0, corsiInScadenza: 0, nomineInScadenza: 0, dvrInScadenza: 0, sopralluoghiInScadenza: 0 }
        });
      }

      // Get site IDs for this company profile (needed for DVR and Sopralluogo)
      const sites = await prisma.companySite.findMany({
        where: { companyTenantProfileId: profile.id, deletedAt: null },
        select: { id: true }
      });
      const siteIds = sites.map(s => s.id);

      const [movimentiDaFatturare, corsiInScadenza, nomineInScadenza, dvrInScadenza, sopralluoghiInScadenza] = await Promise.all([
        // Movimenti da fatturare
        prisma.movimentoContabile.count({
          where: { companyTenantProfileId: profile.id, tenantId, stato: 'DA_FATTURARE', deletedAt: null }
        }),
        // Corsi in scadenza (ending within 30 days)
        prisma.courseSchedule.count({
          where: {
            companyTenantProfileId: profile.id,
            tenantId,
            deletedAt: null,
            endDate: { lte: in30Days, gte: now },
            status: { notIn: ['COMPLETATO', 'FATTURATO'] }
          }
        }),
        // Nomine in scadenza
        prisma.nominaRuolo.count({
          where: {
            companyTenantProfileId: profile.id,
            tenantId,
            deletedAt: null,
            dataScadenza: { lte: in30Days, gte: now },
            stato: 'ATTIVA'
          }
        }),
        // DVR in scadenza
        siteIds.length > 0
          ? prisma.dVR.count({
            where: {
              siteId: { in: siteIds },
              tenantId,
              deletedAt: null,
              dataScadenza: { lte: in30Days, gte: now }
            }
          })
          : 0,
        // Sopralluoghi in scadenza
        siteIds.length > 0
          ? prisma.sopralluogo.count({
            where: {
              siteId: { in: siteIds },
              tenantId,
              deletedAt: null,
              dataProssimoSopralluogo: { lte: in30Days, gte: now }
            }
          })
          : 0,
      ]);

      res.json({
        success: true,
        data: { movimentiDaFatturare, corsiInScadenza, nomineInScadenza, dvrInScadenza, sopralluoghiInScadenza }
      });
    } catch (error) {
      logger.error('Failed to fetch company alerts summary', {
        component: 'companies-routes',
        action: 'getAlertsSummary',
        error: 'Operazione non riuscita',
        companyId: req.params?.id
      });
      res.status(500).json({ success: false, error: 'Errore nel recupero del riepilogo avvisi' });
    }
  }
);

// Get billing summary for a company
router.get('/:id/billing-summary',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const { status } = req.query;

      // Find the CompanyTenantProfile for this company+tenant
      const profile = await prisma.companyTenantProfile.findFirst({
        where: { companyId: id, tenantId, deletedAt: null },
        select: { id: true }
      });

      if (!profile) {
        return res.json({
          success: true,
          data: {
            summary: {
              bozza: { count: 0, total: 0 },
              daFatturare: { count: 0, total: 0 },
              fatturato: { count: 0, total: 0 },
              pagato: { count: 0, total: 0 },
              totale: { count: 0, total: 0 }
            },
            items: []
          }
        });
      }

      // Build where clause for movimenti
      const baseWhere = {
        companyTenantProfileId: profile.id,
        tenantId,
        deletedAt: null,
        direzione: 'ENTRATA',
      };

      // If filtering by status, map frontend status to DB stato values
      const statusMap = {
        'BOZZA': ['BOZZA'],
        'DA_FATTURARE': ['DA_FATTURARE', 'CONFERMATO'],
        'FATTURATO': ['FATTURATO'],
        'PAGATO': ['PAGATO'],
      };

      if (status && statusMap[status]) {
        baseWhere.stato = { in: statusMap[status] };
      }

      // Fetch movimenti with related data
      const movimenti = await prisma.movimentoContabile.findMany({
        where: baseWhere,
        include: {
          person: { select: { firstName: true, lastName: true } },
          site: { select: { siteName: true } },
          fatturaElettronica: { select: { id: true, numero: true, dataEmissione: true } },
        },
        orderBy: { dataEsecuzione: 'desc' },
        take: 500,
      });

      // Compute summary buckets
      const allMovimenti = status
        ? movimenti
        : await prisma.movimentoContabile.findMany({
          where: { companyTenantProfileId: profile.id, tenantId, deletedAt: null, direzione: 'ENTRATA' },
          select: { stato: true, importoLordo: true },
        });

      const buckets = { bozza: { count: 0, total: 0 }, daFatturare: { count: 0, total: 0 }, fatturato: { count: 0, total: 0 }, pagato: { count: 0, total: 0 }, totale: { count: 0, total: 0 } };
      for (const m of allMovimenti) {
        const lordo = Number(m.importoLordo) || 0;
        buckets.totale.count++;
        buckets.totale.total += lordo;
        if (m.stato === 'BOZZA') { buckets.bozza.count++; buckets.bozza.total += lordo; }
        else if (m.stato === 'DA_FATTURARE' || m.stato === 'CONFERMATO') { buckets.daFatturare.count++; buckets.daFatturare.total += lordo; }
        else if (m.stato === 'FATTURATO') { buckets.fatturato.count++; buckets.fatturato.total += lordo; }
        else if (m.stato === 'PAGATO') { buckets.pagato.count++; buckets.pagato.total += lordo; }
      }

      // Map to frontend-expected format
      const computedStatusMap = { 'BOZZA': 'BOZZA', 'PREVENTIVO': 'BOZZA', 'DA_FATTURARE': 'DA_FATTURARE', 'CONFERMATO': 'DA_FATTURARE', 'FATTURATO': 'FATTURATO', 'PAGATO': 'PAGATO', 'ANNULLATO': 'BOZZA', 'STORNATO': 'BOZZA' };

      const items = movimenti.map(m => ({
        id: m.id,
        tipo: m.tipo,
        sourceType: m.tipo,
        description: m.descrizione || m.tipo || '',
        personName: m.person ? `${m.person.firstName} ${m.person.lastName}` : null,
        siteName: m.site?.siteName || null,
        dataEsecuzione: m.dataEsecuzione?.toISOString() || null,
        importoLordo: Number(m.importoLordo) || 0,
        importoNetto: Number(m.importoNetto) || 0,
        importoIva: Number(m.importoIva) || 0,
        aliquotaIva: m.aliquotaIva != null ? Number(m.aliquotaIva) : 22,
        stato: m.stato,
        computedStatus: computedStatusMap[m.stato] || 'BOZZA',
        fatturaElettronicaId: m.fatturaElettronicaId || null,
        fatturaNumero: m.fatturaElettronica?.numero || null,
        dataFatturaEmissione: m.fatturaElettronica?.dataEmissione?.toISOString() || null,
        dataFatturazione: m.dataFatturazione?.toISOString() || null,
        dataPagamento: m.dataPagamento?.toISOString() || null,
        note: m.note || null,
        isEditable: ['BOZZA', 'DA_FATTURARE', 'CONFERMATO'].includes(m.stato),
        voceTariffarioNome: null,
        voceTariffarioFrequenza: null,
        voceTariffarioModalita: null,
        linkedMovimento: null,
      }));

      res.json({
        success: true,
        data: { summary: buckets, items }
      });
    } catch (error) {
      logger.error('Failed to fetch company billing summary', {
        component: 'companies-routes',
        action: 'getBillingSummary',
        error: 'Operazione non riuscita',
        companyId: req.params?.id
      });
      res.status(500).json({ success: false, error: 'Errore nel recupero del riepilogo fatturazione' });
    }
  }
);

// Genera movimenti contabili per tutti gli eventi orfani dell'azienda
router.post('/:id/generate-movements',
  authenticateToken,
  checkAdvancedPermission('companies', 'write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      // Risolvi il CompanyTenantProfile per questa azienda + tenant
      const profile = await prisma.companyTenantProfile.findFirst({
        where: { companyId: id, tenantId, deletedAt: null },
        select: { id: true }
      });

      if (!profile) {
        return res.status(404).json({ success: false, error: 'Azienda non trovata per questo tenant' });
      }

      const result = await MovimentoContabileGenerator.generaTutti(
        profile.id,
        tenantId,
        req.person?.id || null
      );

      res.json({
        success: true,
        data: { totaleCreati: result.movimenti.length },
        warnings: result.warnings || []
      });
    } catch (error) {
      logger.error('Failed to generate company movements', {
        component: 'companies-routes',
        action: 'generateMovements',
        error: error.message,
        companyId: req.params?.id
      });
      res.status(500).json({ success: false, error: 'Errore nella generazione dei movimenti contabili' });
    }
  }
);

// Get company by ID
router.get('/:id',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  roleDataFilter,
  requireOwnCompany(),
  filterDataByPermissions(),
  filterResponseFields,
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const company = await prisma.company.findFirst({
        where: {
          id,
          tenantProfiles: {
            some: {
              tenantId,
              deletedAt: null
            }
          },
          deletedAt: null
        },
        include: {
          tenantProfiles: {
            where: {
              tenantId,
              deletedAt: null
            },
            include: {
              sites: {
                where: { deletedAt: null },
                select: {
                  id: true,
                  siteName: true,
                  citta: true,
                  indirizzo: true,
                  cap: true,
                  provincia: true,
                  telefono: true,
                  mail: true,
                  rsppId: true,
                  medicoCompetenteId: true,
                  createdAt: true,
                  updatedAt: true
                }
              },
              personProfiles: {
                where: { deletedAt: null, status: 'ACTIVE' },
                select: {
                  id: true,
                  personId: true,
                  email: true,
                  phone: true,
                  status: true,
                  person: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      taxCode: true
                    }
                  }
                }
              },
              _count: {
                select: {
                  sites: true,
                  personProfiles: true
                }
              }
            }
          }
        }
      });

      if (!company) {
        return res.status(404).json({
          error: 'Azienda non trovata',
          message: `L'azienda con ID ${id} non esiste`
        });
      }

      // P48: Flatten tenantProfile data for backward compatibility
      const profile = company.tenantProfiles?.[0] || {};
      const { tenantProfiles, ...companyData } = company;
      const flatCompany = {
        ...companyData,
        sites: profile.sites || [],
        persons: (profile.personProfiles || []).map(pp => ({
          id: pp.person?.id,
          firstName: pp.person?.firstName,
          lastName: pp.person?.lastName,
          taxCode: pp.person?.taxCode,
          email: pp.email,
          phone: pp.phone,
          status: pp.status
        })),
        _count: {
          sites: profile._count?.sites || 0,
          persons: profile._count?.personProfiles || 0
        },
        companyTenantProfileId: profile.id || null,
        tenantId: profile.tenantId || null,
        profileStatus: profile.status || null,
        emailGenerale: profile.emailGenerale || null,
        telefonoGenerale: profile.telefonoGenerale || null,
        pec: profile.pec || null,
        iban: profile.iban || null,
        dataInizioRapporto: profile.dataInizioRapporto || null,
        dataFineRapporto: profile.dataFineRapporto || null,
        tipoContratto: profile.tipoContratto || null,
        referenteId: profile.referenteId || null,
        referenteRuolo: profile.referenteRuolo || null,
        scontoPercentuale: profile.scontoPercentuale || null,
        terminiPagamento: profile.terminiPagamento || null,
        modalitaPagamento: profile.modalitaPagamento || null,
        noteCommerciali: profile.noteCommerciali || null,
        noteOperative: profile.noteOperative || null,
        noteInterne: profile.noteInterne || null
      };

      res.json(flatCompany);
    } catch (error) {
      logger.error('Failed to fetch company', {
        component: 'companies-routes',
        action: 'getCompany',
        error: 'Operazione non riuscita',
        stack: error.stack,
        companyId: req.params?.id
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nel recupero dell\'azienda'
      });
    }
  }
);

// Get tariffari aziendali for a company
router.get('/:id/tariffari',
  authenticateToken,
  checkAdvancedPermission('tariffari', 'read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      // P49: Risolvi companyTenantProfileId dal global Company.id
      const profile = await prisma.companyTenantProfile.findFirst({
        where: { companyId: id, tenantId, deletedAt: null },
        select: { id: true }
      });

      if (!profile) {
        return res.json({ success: true, data: [] });
      }

      const tariffari = await TariffarioAziendaleService.getByCompanyProfile(profile.id, tenantId);
      res.json({
        success: true,
        data: tariffari
      });
    } catch (error) {
      logger.error('Failed to fetch company tariffari', {
        component: 'companies-routes',
        action: 'getCompanyTariffari',
        error: 'Operazione non riuscita',
        companyId: req.params?.id
      });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

// P58: Get mansioni assegnate per un'azienda
router.get('/:id/mansioni',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      // Risolvi CTP dal global Company.id
      const profile = await prisma.companyTenantProfile.findFirst({
        where: { companyId: id, tenantId, deletedAt: null },
        select: { id: true }
      });

      if (!profile) {
        return res.json({ success: true, data: [] });
      }

      // Trova tutti i dipendenti (personId) associati a questa CTP
      const employees = await prisma.personTenantProfile.findMany({
        where: { companyTenantProfileId: profile.id, tenantId, deletedAt: null },
        select: { personId: true }
      });

      if (employees.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const personIds = employees.map(e => e.personId);

      // Trova mansioni con assignment attivi per questi dipendenti
      const mansioni = await prisma.mansione.findMany({
        where: {
          tenantId,
          deletedAt: null,
          lavoratori: {
            some: {
              personId: { in: personIds },
              isAttiva: true,
              deletedAt: null
            }
          }
        },
        include: {
          rischiAssociati: {
            where: { deletedAt: null },
            select: {
              id: true,
              codiceRischio: true,
              categoria: true,
              livello: true
            }
          },
          lavoratori: {
            where: {
              personId: { in: personIds },
              isAttiva: true,
              deletedAt: null
            },
            include: {
              person: {
                select: { id: true, firstName: true, lastName: true }
              }
            }
          }
        },
        orderBy: { denominazione: 'asc' }
      });

      // Mappa al formato atteso dal frontend
      const data = mansioni.map(m => {
        // Determina livello rischio massimo
        const riskLevels = { BASSO: 1, MEDIO: 2, ALTO: 3, MOLTO_ALTO: 4 };
        let maxRisk = 'BASSO';
        for (const r of m.rischiAssociati) {
          if ((riskLevels[r.livello] || 0) > (riskLevels[maxRisk] || 0)) {
            maxRisk = r.livello;
          }
        }

        return {
          id: m.id,
          nome: m.denominazione,
          descrizione: m.descrizione,
          categoria: m.settore,
          livelloRischio: maxRisk,
          rischi: m.rischiAssociati.map(r => ({
            id: r.id,
            nome: r.codiceRischio,
            categoria: r.categoria
          })),
          dipendentiCount: m.lavoratori.length,
          dipendenti: m.lavoratori.map(l => ({
            id: l.person.id,
            firstName: l.person.firstName,
            lastName: l.person.lastName,
            assignmentId: l.id
          }))
        };
      });

      res.json({ success: true, data });
    } catch (error) {
      logger.error('Failed to fetch company mansioni', {
        component: 'companies-routes',
        action: 'getCompanyMansioni',
        error: 'Operazione non riuscita',
        companyId: req.params?.id
      });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server'
      });
    }
  }
);

// Get dipendenti con protocollo sanitario assegnato per un'azienda
router.get('/:id/dipendenti-protocolli',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const profile = await prisma.companyTenantProfile.findFirst({
        where: { companyId: id, tenantId, deletedAt: null },
        select: { id: true }
      });

      if (!profile) {
        return res.json({ success: true, data: [] });
      }

      const employees = await prisma.personTenantProfile.findMany({
        where: { companyTenantProfileId: profile.id, tenantId, deletedAt: null },
        select: {
          personId: true,
          protocolloSanitarioId: true,
          person: {
            select: { id: true, firstName: true, lastName: true, taxCode: true }
          },
          protocolloSanitario: {
            select: { id: true, codice: true, denominazione: true }
          }
        },
        orderBy: { person: { lastName: 'asc' } }
      });

      res.json({
        success: true,
        data: employees.map(e => ({
          personId: e.personId,
          firstName: e.person.firstName,
          lastName: e.person.lastName,
          taxCode: e.person.taxCode,
          protocolloSanitarioId: e.protocolloSanitarioId,
          protocolloSanitario: e.protocolloSanitario
        }))
      });
    } catch (error) {
      logger.error('Failed to fetch company employees with protocolli', {
        component: 'companies-routes',
        action: 'getDipendentiProtocolli',
        error: 'Operazione non riuscita',
        companyId: req.params?.id
      });
      res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
  }
);

// Assegnazione batch protocollo sanitario ai dipendenti
router.put('/:id/dipendenti-protocolli',
  authenticateToken,
  checkAdvancedPermission('companies', 'write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const { assignments } = req.body; // Array di { personId, protocolloSanitarioId }

      if (!Array.isArray(assignments)) {
        return res.status(400).json({ error: 'Formato dati non valido' });
      }

      // Validate UUID format for all IDs
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      for (const a of assignments) {
        if (!a.personId || !UUID_REGEX.test(a.personId)) {
          return res.status(400).json({ error: 'ID dipendente non valido' });
        }
        if (a.protocolloSanitarioId && !UUID_REGEX.test(a.protocolloSanitarioId)) {
          return res.status(400).json({ error: 'ID protocollo sanitario non valido' });
        }
      }

      const profile = await prisma.companyTenantProfile.findFirst({
        where: { companyId: id, tenantId, deletedAt: null },
        select: { id: true }
      });

      if (!profile) {
        return res.status(404).json({ error: 'Azienda non trovata' });
      }

      // Validate protocolloSanitarioIds exist and belong to the tenant
      const uniqueProtIds = [...new Set(assignments.map(a => a.protocolloSanitarioId).filter(Boolean))];
      if (uniqueProtIds.length > 0) {
        const validProtocolli = await prisma.protocolloSanitario.findMany({
          where: { id: { in: uniqueProtIds }, tenantId, deletedAt: null },
          select: { id: true }
        });
        const validIds = new Set(validProtocolli.map(p => p.id));
        const invalid = uniqueProtIds.filter(id => !validIds.has(id));
        if (invalid.length > 0) {
          return res.status(400).json({ error: 'Uno o più protocolli sanitari non validi' });
        }
      }

      // Update each employee's protocolloSanitarioId
      const updates = await prisma.$transaction(
        assignments.map(a => prisma.personTenantProfile.updateMany({
          where: {
            personId: a.personId,
            companyTenantProfileId: profile.id,
            tenantId,
            deletedAt: null
          },
          data: { protocolloSanitarioId: a.protocolloSanitarioId || null }
        }))
      );

      const updated = updates.reduce((sum, u) => sum + u.count, 0);
      logger.info(`Batch protocollo assignment: ${updated} employees updated`, {
        component: 'companies-routes',
        action: 'batchAssignProtocolli',
        companyId: id,
        tenantId
      });

      res.json({ success: true, updated });
    } catch (error) {
      logger.error('Failed to batch assign protocolli', {
        component: 'companies-routes',
        action: 'batchAssignProtocolli',
        error: 'Operazione non riuscita',
        companyId: req.params?.id
      });
      res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
  }
);

// Create new company
router.post('/',
  authenticateToken,
  checkAdvancedPermission('companies', 'create'),
  async (req, res) => {
    try {
      // Remove 'name' field if present (legacy compatibility)
      const { name, ...data } = req.body;
      const { companyData: mainCompanyData, siteData, profileData } = sanitizeCompanyData(data);

      // Validate required fields
      if (!mainCompanyData.ragioneSociale) {
        return res.status(400).json({
          error: 'Errore di validazione',
          message: 'ragioneSociale è obbligatorio'
        });
      }

      // Check for duplicate P.IVA if provided
      const person = req.person;
      const tenantId = getEffectiveTenantId(req);
      let company;
      if (mainCompanyData.piva) {
        // P48: Cerca aziende attive con stessa P.IVA nel tenant corrente via tenantProfiles
        const activeCompanyByPiva = await prisma.company.findFirst({
          where: {
            piva: mainCompanyData.piva,
            tenantProfiles: {
              some: {
                tenantId,
                deletedAt: null
              }
            },
            deletedAt: null
          }
        });

        if (activeCompanyByPiva) {
          return res.status(409).json({
            error: 'Duplicate P.IVA',
            message: `Un'azienda con P.IVA ${mainCompanyData.piva} esiste già`
          });
        }

        // Cerca aziende soft-deleted con stessa P.IVA (anche in altri tenant)
        const deletedCompanyByPiva = await prisma.company.findFirst({
          where: {
            piva: mainCompanyData.piva,
            deletedAt: { not: null }
          },
          orderBy: { deletedAt: 'desc' }
        });

        if (deletedCompanyByPiva) {
          // Ripristina azienda soft-deleted
          const { id: _id, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...restoreData } = mainCompanyData;

          company = await prisma.company.update({
            where: { id: deletedCompanyByPiva.id },
            data: {
              ...restoreData,
              deletedAt: null,
              updatedAt: new Date()
            }
          });

          logger.info('Company restored from soft delete', {
            component: 'companies-routes',
            action: 'createCompany',
            companyId: company.id,
            piva: mainCompanyData.piva
          });
        } else {
          // P48: Crea Company senza tenantId (è un campo globale)
          const { id: _id, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...createData } = mainCompanyData;
          company = await prisma.company.create({
            data: createData
          });
        }
      } else {
        // Nessuna P.IVA: crea nuova azienda
        const { id: _id, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...createData } = mainCompanyData;
        company = await prisma.company.create({
          data: createData
        });
      }

      // P48: Crea CompanyTenantProfile per collegare Company al Tenant
      let tenantProfile;
      try {
        tenantProfile = await prisma.companyTenantProfile.create({
          data: {
            companyId: company.id,
            tenantId,
            status: 'ACTIVE',
            isActive: true,
            isPrimary: true,
            ...profileData
          }
        });
      } catch (profileError) {
        // Se il profilo esiste già (unique constraint), trovalo
        if (profileError.code === 'P2002') {
          tenantProfile = await prisma.companyTenantProfile.findFirst({
            where: { companyId: company.id, tenantId, deletedAt: null }
          });
        } else {
          throw profileError;
        }
      }

      // Crea automaticamente la sede principale se ci sono dati di sede
      if (company && tenantProfile && (siteData.siteCitta || siteData.siteIndirizzo || siteData.siteName || siteData.siteProvincia || siteData.siteCap || siteData.siteTelefono || siteData.siteMail || siteData.sitePersonaRiferimento)) {
        try {
          const siteDataPayload = {
            companyTenantProfileId: tenantProfile.id,
            tenantId,
            siteName: siteData.siteName || siteData.siteCitta || 'Sede Principale',
            citta: siteData.siteCitta,
            indirizzo: siteData.siteIndirizzo,
            cap: siteData.siteCap,
            provincia: siteData.siteProvincia,
            telefono: siteData.siteTelefono,
            mail: siteData.siteMail,
          };

          // Rimuovi campi undefined/null per evitare errori
          Object.keys(siteDataPayload).forEach(key => {
            if (siteDataPayload[key] === undefined || siteDataPayload[key] === null) {
              delete siteDataPayload[key];
            }
          });

          const mainSite = await prisma.companySite.create({
            data: siteDataPayload
          });

          logger.info('Main site created automatically', {
            component: 'companies-routes',
            action: 'createCompany',
            companyId: company.id,
            siteId: mainSite.id,
            siteName: mainSite.siteName
          });
        } catch (siteError) {
          // Log l'errore ma non bloccare la creazione dell'azienda
          logger.warn('Failed to create main site automatically', {
            component: 'companies-routes',
            action: 'createCompany',
            error: siteError.message,
            companyId: company.id
          });
        }
      }

      res.status(201).json(company);
    } catch (error) {
      logger.error('Failed to create company', {
        component: 'companies-routes',
        action: 'createCompany',
        error: 'Operazione non riuscita',
        stack: error.stack,
        companyName: req.body?.ragioneSociale
      });

      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'Conflitto',
          message: 'Un\'azienda con queste informazioni esiste già'
        });
      }

      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nella creazione dell\'azienda'
      });
    }
  }
);

// Update company
router.put('/:id',
  authenticateToken,
  checkAdvancedPermission('companies', 'update'),
  requireOwnCompany(),
  async (req, res) => {
    try {
      const { id } = req.params;
      // Remove 'name' field if present (legacy compatibility)
      const { name, ...data } = req.body;
      const { companyData: mainCompanyData, siteData, profileData } = sanitizeCompanyData(data);

      // Validate required fields
      if (!mainCompanyData.ragioneSociale) {
        return res.status(400).json({
          error: 'Errore di validazione',
          message: 'ragioneSociale è obbligatorio'
        });
      }

      const person = req.person;
      const tenantId = getEffectiveTenantId(req);

      // P48: Verifica che l'azienda esista e appartenga al tenant
      const existingCompany = await prisma.company.findFirst({
        where: {
          id,
          tenantProfiles: { some: { tenantId, deletedAt: null } },
          deletedAt: null
        },
        include: {
          tenantProfiles: {
            where: { tenantId, deletedAt: null },
            take: 1
          }
        }
      });
      if (!existingCompany) {
        return res.status(404).json({
          error: 'Azienda non trovata',
          message: `L'azienda con ID ${id} non esiste o è stata eliminata`
        });
      }

      // Se la P.IVA viene cambiata, verifica duplicati nel tenant corrente
      if (mainCompanyData.piva && mainCompanyData.piva !== existingCompany.piva) {
        const conflict = await prisma.company.findFirst({
          where: {
            piva: mainCompanyData.piva,
            tenantProfiles: { some: { tenantId, deletedAt: null } },
            deletedAt: null,
            id: { not: id }
          }
        });
        if (conflict) {
          return res.status(409).json({
            error: 'Duplicate P.IVA',
            message: `Un'azienda con P.IVA ${mainCompanyData.piva} esiste già`
          });
        }
      }

      // P48: Aggiorna solo i campi Company globali
      const { id: _id, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...updateData } = mainCompanyData;

      const company = await prisma.company.update({
        where: { id },
        data: updateData
      });

      // P48: Aggiorna anche i campi del profilo tenant se presenti
      const tenantProfile = existingCompany.tenantProfiles[0];
      if (tenantProfile && Object.keys(profileData).length > 0) {
        await prisma.companyTenantProfile.update({
          where: { id: tenantProfile.id },
          data: profileData
        });
      }

      // Se sono presenti dati di sede, crea opzionalmente una sede (idempotente)
      if (siteData.siteCitta || siteData.siteIndirizzo || siteData.siteName) {
        try {
          const siteName = siteData.siteName || siteData.siteCitta || 'Sede Principale';
          const profileId = tenantProfile?.id;

          if (profileId) {
            // Evita duplicati: match su nome + indirizzo/città se presenti
            const existingSite = await prisma.companySite.findFirst({
              where: {
                companyTenantProfileId: profileId,
                siteName,
                deletedAt: null,
                ...(siteData.siteIndirizzo ? { indirizzo: siteData.siteIndirizzo } : {}),
                ...(siteData.siteCitta ? { citta: siteData.siteCitta } : {})
              }
            });

            if (!existingSite) {
              const companySiteData = {
                companyTenantProfileId: profileId,
                tenantId,
                siteName,
                citta: siteData.siteCitta,
                indirizzo: siteData.siteIndirizzo,
                cap: siteData.siteCap,
                provincia: siteData.siteProvincia,
                telefono: siteData.siteTelefono,
                mail: siteData.siteMail,
              };
              Object.keys(companySiteData).forEach(key => {
                if (companySiteData[key] === undefined || companySiteData[key] === null) delete companySiteData[key];
              });
              const newSite = await prisma.companySite.create({ data: companySiteData });
              logger.info('Site created during company update', {
                component: 'companies-routes',
                action: 'updateCompany',
                companyId: id,
                siteId: newSite.id,
                siteName: newSite.siteName
              });
            }
          }
        } catch (siteError) {
          logger.warn('Failed to create site during update', {
            component: 'companies-routes',
            action: 'updateCompany',
            companyId: id,
            error: siteError.message
          });
        }
      }

      res.json(company);
    } catch (error) {
      logger.error('Failed to update company', {
        component: 'companies-routes',
        action: 'updateCompany',
        error: 'Operazione non riuscita',
        stack: error.stack,
        companyId: req.params?.id
      });

      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'Conflitto',
          message: 'Un\'azienda con queste informazioni esiste già'
        });
      }

      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nell\'aggiornamento dell\'azienda'
      });
    }
  }
);

// Soft delete company
router.delete('/:id',
  authenticateToken,
  checkAdvancedPermission('companies', 'delete'),
  requireOwnCompany(),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if company exists
      const existingCompany = await prisma.company.findFirst({
        where: {
          id,
          tenantProfiles: {
            some: {
              tenantId: getEffectiveTenantId(req),
              deletedAt: null
            }
          },
          deletedAt: null
        },
        include: {
          tenantProfiles: {
            where: {
              tenantId: getEffectiveTenantId(req),
              deletedAt: null
            },
            include: {
              personProfiles: {
                where: { deletedAt: null, status: 'ACTIVE' },
                select: { id: true }
              }
            }
          }
        }
      });

      if (!existingCompany) {
        return res.status(404).json({
          error: 'Azienda non trovata',
          message: `L'azienda con ID ${id} non esiste`
        });
      }

      // P48: Check if company has active persons via tenant profile
      const activePersonCount = existingCompany.tenantProfiles?.[0]?.personProfiles?.length || 0;
      if (activePersonCount > 0) {
        return res.status(400).json({
          error: 'Impossibile eliminare l\'azienda',
          message: 'L\'azienda ha persone associate. Rimuovere o riassegnare le persone prima.'
        });
      }

      // Perform soft delete by updating deletedAt field
      const deletedCompany = await prisma.company.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info('Company soft deleted', {
        component: 'companies-routes',
        action: 'deleteCompany',
        companyId: id,
        companyName: existingCompany.ragioneSociale
      });

      res.status(200).json({
        success: true,
        message: 'Azienda eliminata con successo',
        data: {
          id: deletedCompany.id,
          ragioneSociale: deletedCompany.ragioneSociale,
          deletedAt: deletedCompany.deletedAt
        }
      });
    } catch (error) {
      logger.error('Failed to delete company', {
        component: 'companies-routes',
        action: 'deleteCompany',
        error: 'Operazione non riuscita',
        stack: error.stack,
        companyId: req.params?.id
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nell\'eliminazione dell\'azienda'
      });
    }
  }
);

// Import companies with sites support
router.post('/import',
  authenticateToken,
  checkAdvancedPermission('companies', 'create'),
  async (req, res) => {
    try {
      const importId = (req.headers['x-import-id'] && String(req.headers['x-import-id'])) || randomUUID();
      const startedAt = Date.now();
      const { companies, overwriteIds = [] } = req.body;

      if (!companies || !Array.isArray(companies)) {
        return res.status(400).json({
          error: 'Errore di validazione',
          message: 'L\'array companies è obbligatorio'
        });
      }

      const results = {
        created: [],
        updated: [],
        errors: [],
        sitesCreated: [],
        warnings: []
      };

      // Mappe per tenere traccia delle aziende per P.IVA e Codice Fiscale
      const companiesByPiva = new Map();
      const companiesByCF = new Map();
      const person = req.person;
      const tenantId = getEffectiveTenantId(req);

      for (let i = 0; i < companies.length; i++) {
        const companyData = companies[i];

        try {
          // Validazione campi obbligatori
          if (!companyData.ragioneSociale) {
            results.errors.push({ index: i, error: 'ragioneSociale è obbligatoria', data: companyData });
            continue;
          }

          const { companyData: mainCompanyData, siteData, profileData } = sanitizeCompanyData(companyData);
          // P48: Rimuovi campi non validi per Company model
          delete mainCompanyData.id; delete mainCompanyData.createdAt; delete mainCompanyData.updatedAt;

          // Gestione duplicati per P.IVA
          if (companyData.piva) {
            const pivaKey = companyData.piva.trim();

            // Verifica duplicato nel batch corrente
            const batchCompany = companiesByPiva.get(pivaKey);
            if (batchCompany) {
              results.errors.push({ index: i, error: `P.IVA ${pivaKey} duplicata nel file CSV alla riga ${batchCompany.index + 1}`, data: companyData });
              continue;
            }

            // Cerca azienda esistente con questa P.IVA
            const existingCompany = await prisma.company.findFirst({ where: { piva: pivaKey } });

            if (existingCompany) {
              // Verifica se l'azienda ha un profilo nel tenant corrente
              const existingProfile = await prisma.companyTenantProfile.findFirst({
                where: { companyId: existingCompany.id, tenantId, deletedAt: null }
              });
              const isCrossTenant = !existingProfile;

              // Azienda soft-deleted: riattiva
              if (existingCompany.deletedAt) {
                logger.info('Reactivating deleted company', { component: 'companies-routes', action: 'importCompanies', importId, index: i, companyId: existingCompany.id });
                const { company: reactivatedCompany, site: createdSite, warnings: siteW1 } = await prisma.$transaction(async (tx) => {
                  const company = await tx.company.update({
                    where: { id: existingCompany.id },
                    data: { ...mainCompanyData, deletedAt: null, updatedAt: new Date() }
                  });
                  const { site, warnings } = await ensureProfileAndSite(tx, company.id, tenantId, siteData, profileData);
                  return { company, site, warnings };
                });
                results.updated.push(reactivatedCompany);
                if (createdSite) results.sitesCreated.push({ companyId: reactivatedCompany.id, site: createdSite });
                if (siteW1?.length) results.warnings.push(...siteW1.map(w => ({ index: i, warning: w, companyName: reactivatedCompany.ragioneSociale })));
                companiesByPiva.set(pivaKey, { company: reactivatedCompany, index: i });
                continue;
              }

              // Overwrite esplicito
              const overwriteRequested = Array.isArray(overwriteIds) && overwriteIds.some((oid) => String(oid) === String(existingCompany.id));
              if (overwriteRequested) {
                try {
                  const { company: updatedCompany, site: createdSite, warnings: siteW2 } = await prisma.$transaction(async (tx) => {
                    const company = await tx.company.update({ where: { id: existingCompany.id }, data: mainCompanyData });
                    const { site, warnings } = await ensureProfileAndSite(tx, company.id, tenantId, siteData, profileData);
                    return { company, site, warnings };
                  });
                  results.updated.push(updatedCompany);
                  if (createdSite) results.sitesCreated.push({ companyId: updatedCompany.id, companyName: updatedCompany.ragioneSociale, site: createdSite });
                  if (siteW2?.length) results.warnings.push(...siteW2.map(w => ({ index: i, warning: w, companyName: updatedCompany.ragioneSociale })));
                  companiesByPiva.set(pivaKey, { company: updatedCompany, index: i });
                  continue;
                } catch (overwriteErr) {
                  logger.warn('Failed to overwrite existing company during import', { component: 'companies-routes', action: 'importCompanies', companyId: existingCompany.id, error: overwriteErr.message, index: i });
                  results.errors.push({ index: i, error: 'Errore aggiornamento azienda esistente', data: companyData });
                  continue;
                }
              }

              // Azienda attiva: verifica se l'utente ha fornito REALI dati sede (non il default di sanitize)
              const hasRealSiteInput = companyData.siteCitta || companyData.siteIndirizzo || companyData.siteName || companyData.citta || companyData.indirizzo || companyData.nomeSede || companyData.sedeAzienda;

              if (isCrossTenant) {
                // Cross-tenant: importa automaticamente creando profilo e sede nel tenant corrente
                try {
                  const { site: ctSite, warnings: ctW } = await ensureProfileAndSite(prisma, existingCompany.id, tenantId, siteData, profileData);
                  if (ctW?.length) results.warnings.push(...ctW.map(w => ({ index: i, warning: w, companyName: existingCompany.ragioneSociale })));
                  results.updated.push(existingCompany);
                  results.warnings.push({ index: i, warning: `Azienda "${existingCompany.ragioneSociale}" (P.IVA ${pivaKey}) esistente in altro tenant — importata nel tenant corrente`, companyName: existingCompany.ragioneSociale });
                  if (ctSite) results.sitesCreated.push({ companyId: existingCompany.id, companyName: existingCompany.ragioneSociale, site: ctSite });
                  companiesByPiva.set(pivaKey, { company: existingCompany, index: i });
                } catch (ctErr) {
                  logger.warn('Failed cross-tenant company import', { component: 'companies-routes', action: 'importCompanies', companyId: existingCompany.id, error: ctErr.message, index: i });
                  results.errors.push({ index: i, error: `Errore importazione cross-tenant per "${existingCompany.ragioneSociale}"`, data: companyData });
                }
                continue;
              }

              if (hasRealSiteInput) {
                try {
                  const { site: newSite, warnings: siteW3 } = await ensureProfileAndSite(prisma, existingCompany.id, tenantId, siteData, profileData);
                  if (siteW3?.length) results.warnings.push(...siteW3.map(w => ({ index: i, warning: w, companyName: existingCompany.ragioneSociale })));
                  if (newSite) {
                    results.sitesCreated.push({ companyId: existingCompany.id, companyName: existingCompany.ragioneSociale, site: newSite });
                  } else {
                    // Sede già esistente con stessi dati: segnala come conflitto
                    results.errors.push({
                      index: i,
                      error: `Azienda con P.IVA ${pivaKey} e sede già esistenti. Utilizzare l'opzione di sovrascrittura per aggiornare i dati.`,
                      data: companyData,
                      existingCompany: { id: existingCompany.id, ragioneSociale: existingCompany.ragioneSociale, piva: existingCompany.piva, codiceFiscale: existingCompany.codiceFiscale }
                    });
                  }
                } catch (siteErr) {
                  logger.warn('Failed to create site for active company during import', { component: 'companies-routes', action: 'importCompanies', companyId: existingCompany.id, error: siteErr.message, index: i });
                  results.errors.push({ index: i, error: 'Errore creazione sede per azienda attiva', data: companyData });
                }
                continue;
              } else {
                results.errors.push({
                  index: i,
                  error: `Azienda con P.IVA ${pivaKey} già esistente. Utilizzare l'opzione di sovrascrittura per aggiornare i dati.`,
                  data: companyData,
                  existingCompany: { id: existingCompany.id, ragioneSociale: existingCompany.ragioneSociale, piva: existingCompany.piva, codiceFiscale: existingCompany.codiceFiscale }
                });
                continue;
              }
            } else {
              // Nuova Company con P.IVA
              const { company, site: createdSite, warnings: siteW4 } = await prisma.$transaction(async (tx) => {
                const newCompany = await tx.company.create({ data: mainCompanyData });
                const { site, warnings } = await ensureProfileAndSite(tx, newCompany.id, tenantId, siteData, profileData);
                return { company: newCompany, site, warnings };
              });
              results.created.push(company);
              companiesByPiva.set(pivaKey, { company, index: i });
              if (companyData.codiceFiscale) companiesByCF.set(companyData.codiceFiscale.trim().toUpperCase(), { company, index: i });
              if (createdSite) results.sitesCreated.push({ companyId: company.id, companyName: company.ragioneSociale, site: createdSite });
              if (siteW4?.length) results.warnings.push(...siteW4.map(w => ({ index: i, warning: w, companyName: company.ragioneSociale })));
            }
          } else {
            // Nessuna P.IVA: gestione per Codice Fiscale o creazione nuova Company
            const cfKey = (companyData.codiceFiscale && companyData.codiceFiscale.trim().toUpperCase()) || null;
            if (cfKey) {
              const batchCF = companiesByCF.get(cfKey);
              if (batchCF) {
                results.errors.push({ index: i, error: `Codice Fiscale ${cfKey} duplicato nel file CSV alla riga ${batchCF.index + 1}`, data: companyData });
              } else {
                const existingByCF = await prisma.company.findFirst({ where: { codiceFiscale: cfKey } });
                if (existingByCF) {
                  if (existingByCF.deletedAt) {
                    const { company: reactivatedCompany, site: createdSite, warnings: siteW5 } = await prisma.$transaction(async (tx) => {
                      const company = await tx.company.update({
                        where: { id: existingByCF.id },
                        data: { ...mainCompanyData, deletedAt: null, updatedAt: new Date() }
                      });
                      const { site, warnings } = await ensureProfileAndSite(tx, company.id, tenantId, siteData, profileData);
                      return { company, site, warnings };
                    });
                    results.updated.push(reactivatedCompany);
                    if (createdSite) results.sitesCreated.push({ companyId: reactivatedCompany.id, site: createdSite });
                    if (siteW5?.length) results.warnings.push(...siteW5.map(w => ({ index: i, warning: w, companyName: reactivatedCompany.ragioneSociale })));
                    companiesByCF.set(cfKey, { company: reactivatedCompany, index: i });
                  } else {
                    // Check cross-tenant: esiste profilo nel tenant corrente?
                    const existingProfileCF = await prisma.companyTenantProfile.findFirst({
                      where: { companyId: existingByCF.id, tenantId, deletedAt: null }
                    });
                    const isCrossTenantCF = !existingProfileCF;

                    if (isCrossTenantCF) {
                      // Cross-tenant: importa automaticamente creando profilo e sede nel tenant corrente
                      try {
                        const { site: ctSiteCF, warnings: ctWCF } = await ensureProfileAndSite(prisma, existingByCF.id, tenantId, siteData, profileData);
                        if (ctWCF?.length) results.warnings.push(...ctWCF.map(w => ({ index: i, warning: w, companyName: existingByCF.ragioneSociale })));
                        results.updated.push(existingByCF);
                        results.warnings.push({ index: i, warning: `Azienda "${existingByCF.ragioneSociale}" (CF ${cfKey}) esistente in altro tenant — importata nel tenant corrente`, companyName: existingByCF.ragioneSociale });
                        if (ctSiteCF) results.sitesCreated.push({ companyId: existingByCF.id, companyName: existingByCF.ragioneSociale, site: ctSiteCF });
                        companiesByCF.set(cfKey, { company: existingByCF, index: i });
                      } catch (ctErr) {
                        logger.warn('Failed cross-tenant company import (CF)', { component: 'companies-routes', action: 'importCompanies', companyId: existingByCF.id, error: ctErr.message, index: i });
                        results.errors.push({ index: i, error: `Errore importazione cross-tenant per "${existingByCF.ragioneSociale}"`, data: companyData });
                      }
                      continue;
                    }

                    const hasRealSiteInputCF = companyData.siteCitta || companyData.siteIndirizzo || companyData.siteName || companyData.citta || companyData.indirizzo || companyData.nomeSede || companyData.sedeAzienda;
                    if (hasRealSiteInputCF) {
                      try {
                        const { site: newSite, warnings: siteW6 } = await ensureProfileAndSite(prisma, existingByCF.id, tenantId, siteData, profileData);
                        if (siteW6?.length) results.warnings.push(...siteW6.map(w => ({ index: i, warning: w, companyName: existingByCF.ragioneSociale })));
                        if (newSite) {
                          results.sitesCreated.push({ companyId: existingByCF.id, companyName: existingByCF.ragioneSociale, site: newSite });
                        } else {
                          results.errors.push({ index: i, error: `Azienda con Codice Fiscale ${cfKey} e sede già esistenti. Utilizzare l'opzione di sovrascrittura per aggiornare i dati.`, data: companyData, existingCompany: { id: existingByCF.id, ragioneSociale: existingByCF.ragioneSociale, piva: existingByCF.piva, codiceFiscale: existingByCF.codiceFiscale } });
                        }
                      } catch (siteErr) {
                        logger.warn('Failed to create site for active company (CF) during import', { component: 'companies-routes', action: 'importCompanies', companyId: existingByCF.id, error: siteErr.message, index: i });
                        results.errors.push({ index: i, error: 'Errore creazione sede per azienda attiva', data: companyData });
                      }
                    } else {
                      results.errors.push({ index: i, error: `Azienda con Codice Fiscale ${cfKey} già esistente nel tenant corrente. Utilizzare l'opzione di sovrascrittura per aggiornare i dati.`, data: companyData, existingCompany: { id: existingByCF.id, ragioneSociale: existingByCF.ragioneSociale, piva: existingByCF.piva, codiceFiscale: existingByCF.codiceFiscale } });
                    }
                  }
                } else {
                  // Nuova Company con CF
                  const { company, site: createdSite, warnings: siteW7 } = await prisma.$transaction(async (tx) => {
                    const newCompany = await tx.company.create({ data: mainCompanyData });
                    const { site, warnings } = await ensureProfileAndSite(tx, newCompany.id, tenantId, siteData, profileData);
                    return { company: newCompany, site, warnings };
                  });
                  results.created.push(company);
                  companiesByCF.set(cfKey, { company, index: i });
                  if (createdSite) results.sitesCreated.push({ companyId: company.id, companyName: company.ragioneSociale, site: createdSite });
                  if (siteW7?.length) results.warnings.push(...siteW7.map(w => ({ index: i, warning: w, companyName: company.ragioneSociale })));
                }
              }
            } else {
              // Né P.IVA né CF: crea nuova Company
              const { company, site: createdSite, warnings: siteW8 } = await prisma.$transaction(async (tx) => {
                const newCompany = await tx.company.create({ data: mainCompanyData });
                const { site, warnings } = await ensureProfileAndSite(tx, newCompany.id, tenantId, siteData, profileData);
                return { company: newCompany, site, warnings };
              });
              results.created.push(company);
              if (createdSite) results.sitesCreated.push({ companyId: company.id, companyName: company.ragioneSociale, site: createdSite });
              if (siteW8?.length) results.warnings.push(...siteW8.map(w => ({ index: i, warning: w, companyName: company.ragioneSociale })));
            }
          }

        } catch (error) {
          logger.error('Error importing company', {
            component: 'companies-routes',
            action: 'importCompany',
            error: 'Operazione non riuscita',
            index: i,
            companyData
          });

          results.errors.push({
            index: i,
            error: 'Operazione non riuscita',
            data: companyData
          });
        }
      }

      // Se ci sono conflitti che richiedono decisione utente, restituisci status 409
      const hasConflicts = results.errors.some(error => error.existingCompany);
      const totalOps = results.created.length + results.updated.length;

      if (hasConflicts && totalOps === 0) {
        // Solo conflitti, nessuna operazione completata
        res.status(409).json({
          success: false,
          message: 'Conflitti rilevati durante l\'importazione',
          results,
          summary: {
            total: companies.length,
            created: results.created.length,
            updated: results.updated.length,
            sitesCreated: results.sitesCreated.length,
            errors: results.errors.length,
            warnings: results.warnings.length,
            conflicts: results.errors.filter(e => e.existingCompany).length
          }
        });
      } else if (totalOps === 0) {
        // Nessuna creazione/aggiornamento effettuata (solo errori di validazione o altri errori non di conflitto)
        res.status(400).json({
          success: false,
          message: 'Nessuna azienda importata. Verificare i dati e riprovare.',
          results,
          summary: {
            total: companies.length,
            created: results.created.length,
            updated: results.updated.length,
            sitesCreated: results.sitesCreated.length,
            errors: results.errors.length,
            warnings: results.warnings.length,
            conflicts: results.errors.filter(e => e.existingCompany).length
          }
        });
      } else {
        // Operazioni completate con successo (con o senza alcuni conflitti)
        res.json({
          success: true,
          results,
          summary: {
            total: companies.length,
            created: results.created.length,
            updated: results.updated.length,
            sitesCreated: results.sitesCreated.length,
            errors: results.errors.length,
            warnings: results.warnings.length,
            conflicts: results.errors.filter(e => e.existingCompany).length
          }
        });
      }

    } catch (error) {
      logger.error('Failed to import companies', {
        component: 'companies-routes',
        action: 'importCompanies',
        error: 'Operazione non riuscita',
        stack: error.stack
      });

      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nell\'importazione delle aziende'
      });
    }
  }
);

// =====================================================
// R17: Risultati Anonimi Collettivi (D.Lgs 81/08 Art. 40 c.1)
// =====================================================

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

router.get('/:companyTenantProfileId/risultati-anonimi',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const { companyTenantProfileId } = req.params;
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: 'Parametri dateFrom e dateTo obbligatori' });
      }
      if (!ISO_DATE_REGEX.test(String(dateFrom)) || !ISO_DATE_REGEX.test(String(dateTo))) {
        return res.status(400).json({ error: 'Formato date non valido (YYYY-MM-DD)' });
      }

      const stats = await RisultatiAnonimiService.getStatsByCompany(
        companyTenantProfileId,
        String(dateFrom),
        String(dateTo),
        tenantId
      );

      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error({ error: 'Operazione non riuscita' }, 'Errore recupero risultati anonimi collettivi');
      res.status(500).json({ error: 'Errore nel recupero dei risultati anonimi collettivi' });
    }
  }
);

router.get('/:companyTenantProfileId/risultati-anonimi/pdf',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const { companyTenantProfileId } = req.params;
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: 'Parametri dateFrom e dateTo obbligatori' });
      }
      if (!ISO_DATE_REGEX.test(String(dateFrom)) || !ISO_DATE_REGEX.test(String(dateTo))) {
        return res.status(400).json({ error: 'Formato date non valido (YYYY-MM-DD)' });
      }

      // Documento di testo (DOCX) di default, PDF solo se richiesto esplicitamente
      const wantsPdf = String(req.query.format || 'docx').toLowerCase() === 'pdf';
      const ext = wantsPdf ? 'pdf' : 'docx';
      const buffer = wantsPdf
        ? await RisultatiAnonimiService.generatePdf(companyTenantProfileId, String(dateFrom), String(dateTo), tenantId)
        : await RisultatiAnonimiService.generateDocx(companyTenantProfileId, String(dateFrom), String(dateTo), tenantId);
      const originalName = `risultati-anonimi-${String(dateFrom)}-${String(dateTo)}.${ext}`;
      archiveMdlDocumentBuffer({
        tenantId,
        profileId: companyTenantProfileId,
        documentType: 'risultati-anonimi',
        buffer,
        originalName,
        note: `Risultati anonimi collettivi ${String(dateFrom)} - ${String(dateTo)}`,
        generatedBy: req.person?.id || null,
        extraMetadata: { dateFrom: String(dateFrom), dateTo: String(dateTo) }
      });
      await prisma.gdprAuditLog.create({
        data: {
          personId: req.person?.id || null,
          tenantId,
          action: 'GENERATE',
          resourceType: 'CompanyMdlDocument',
          resourceId: companyTenantProfileId,
          dataAccessed: {
            documentType: 'risultati-anonimi',
            dateFrom: String(dateFrom),
            dateTo: String(dateTo),
            originalName
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      }).catch(err => logger.warn('GdprAuditLog risultati anonimi non salvato', { error: err.message }));

      res.setHeader('Content-Type', wantsPdf
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=${originalName}`);
      res.send(buffer);
    } catch (error) {
      logger.error({ error: 'Operazione non riuscita' }, 'Errore generazione documento risultati anonimi');
      res.status(500).json({ error: 'Errore nella generazione del documento' });
    }
  }
);

// =====================================================
// Verbale Riunione Periodica (D.Lgs 81/08 Art. 35)
// =====================================================

router.get('/:companyTenantProfileId/riunione-periodica/dati',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const { companyTenantProfileId } = req.params;
      const { anno } = req.query;

      if (!anno) {
        return res.status(400).json({ error: 'Parametro anno obbligatorio' });
      }

      const annoNum = parseInt(String(anno), 10);
      if (isNaN(annoNum) || annoNum < 2000 || annoNum > 2100) {
        return res.status(400).json({ error: 'Anno non valido' });
      }

      const data = await RiunioniPeriodicheService.getAggregateData(
        companyTenantProfileId,
        annoNum,
        tenantId
      );

      res.json({ success: true, data });
    } catch (error) {
      logger.error({ error: 'Operazione non riuscita' }, 'Errore recupero dati riunione periodica');
      res.status(500).json({ error: 'Errore nel recupero dei dati della riunione periodica' });
    }
  }
);

router.get('/:companyTenantProfileId/riunione-periodica/pdf',
  authenticateToken,
  checkAdvancedPermission('companies', 'read'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const { companyTenantProfileId } = req.params;
      const { anno } = req.query;

      if (!anno) {
        return res.status(400).json({ error: 'Parametro anno obbligatorio' });
      }

      const annoNum = parseInt(String(anno), 10);
      if (isNaN(annoNum) || annoNum < 2000 || annoNum > 2100) {
        return res.status(400).json({ error: 'Anno non valido' });
      }

      // Documento di testo (DOCX) di default, PDF solo se richiesto esplicitamente
      const wantsPdf = String(req.query.format || 'docx').toLowerCase() === 'pdf';
      const ext = wantsPdf ? 'pdf' : 'docx';
      const opts = { delibereConclusioni: String(req.query.delibereConclusioni || '').slice(0, 5000) };
      const buffer = wantsPdf
        ? await RiunioniPeriodicheService.generatePdf(companyTenantProfileId, annoNum, tenantId, opts)
        : await RiunioniPeriodicheService.generateDocx(companyTenantProfileId, annoNum, tenantId, opts);
      const originalName = `verbale-riunione-periodica-${annoNum}.${ext}`;
      archiveMdlDocumentBuffer({
        tenantId,
        profileId: companyTenantProfileId,
        documentType: 'riunione-periodica',
        buffer,
        originalName,
        note: `Verbale riunione periodica ${annoNum}`,
        generatedBy: req.person?.id || null,
        extraMetadata: {
          anno: annoNum,
          delibereConclusioni: String(req.query.delibereConclusioni || '').slice(0, 5000)
        }
      });
      await prisma.gdprAuditLog.create({
        data: {
          personId: req.person?.id || null,
          tenantId,
          action: 'GENERATE',
          resourceType: 'CompanyMdlDocument',
          resourceId: companyTenantProfileId,
          dataAccessed: {
            documentType: 'riunione-periodica',
            anno: annoNum,
            originalName
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      }).catch(err => logger.warn('GdprAuditLog riunione periodica non salvato', { error: err.message }));

      res.setHeader('Content-Type', wantsPdf
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=${originalName}`);
      res.send(buffer);
    } catch (error) {
      logger.error({ error: 'Operazione non riuscita' }, 'Errore generazione documento verbale riunione periodica');
      res.status(500).json({ error: 'Errore nella generazione del verbale' });
    }
  }
);

export {
  router as default,
  resolveCompanyTenantProfile,
  safeDocumentType,
  sanitizeStoredFilename
};
