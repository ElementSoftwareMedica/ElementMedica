import express from 'express';
import logger from '../utils/logger.js';
import middleware from '../middleware/auth.js';
import { checkAdvancedPermission, filterDataByPermissions, requireOwnCompany } from '../middleware/advanced-permissions.js';
import { roleDataFilter, filterResponseFields } from '../middleware/role-data-filter.js';
import TariffarioAziendaleService from '../services/management/TariffarioAziendaleService.js';
import RisultatiAnonimiService from '../services/clinical/RisultatiAnonimiService.js';
import RiunioniPeriodicheService from '../services/clinical/RiunioniPeriodicheService.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import { personTenantAccessService } from '../services/PersonTenantAccessService.js';

const router = express.Router();
import prisma from '../config/prisma-optimization.js';
import { randomUUID } from 'crypto';

const { authenticate: authenticateToken } = middleware;

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

      // Se è EMPLOYEE, mostra solo la propria azienda (P48: usa companyTenantProfileId)
      let profileFilter = { tenantId: tenantFilter, deletedAt: null };
      if (isEmployeeOnly && person.companyTenantProfileId) {
        profileFilter.id = person.companyTenantProfileId;
      } else if (permissionContext.scope === 'company' && person.companyTenantProfileId) {
        profileFilter.id = person.companyTenantProfileId;
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

      const pdfBuffer = await RisultatiAnonimiService.generatePdf(
        companyTenantProfileId,
        String(dateFrom),
        String(dateTo),
        tenantId
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=risultati-anonimi-${companyTenantProfileId}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error({ error: 'Operazione non riuscita' }, 'Errore generazione PDF risultati anonimi');
      res.status(500).json({ error: 'Errore nella generazione del PDF' });
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

      const pdfBuffer = await RiunioniPeriodicheService.generatePdf(
        companyTenantProfileId,
        annoNum,
        tenantId
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=verbale-riunione-periodica-${anno}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error({ error: 'Operazione non riuscita' }, 'Errore generazione PDF verbale riunione periodica');
      res.status(500).json({ error: 'Errore nella generazione del PDF del verbale' });
    }
  }
);

export { router as default };