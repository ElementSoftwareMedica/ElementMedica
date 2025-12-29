/**
 * Branch Helper - Utilities per gestione branch commerciali
 * 
 * Progetto 45 - Ristrutturazione Tenant per Commercializzazione
 * 
 * Questo modulo gestisce:
 * - Determinazione del branch corrente dalla request
 * - Verifica accesso branch per utente
 * - Generazione filtri Prisma per branch
 * - Middleware per protezione routes
 * 
 * @module utils/branchHelper
 * @version 1.0.0
 * @author ElementMedica Team
 */

import logger from './logger.js';

// ============================================
// COSTANTI BRANCH TYPES
// ============================================

/**
 * Enum dei branch types disponibili
 * Deve corrispondere all'enum BranchType nel schema Prisma
 */
export const BRANCH_TYPES = {
    MEDICA: 'MEDICA',
    FORMAZIONE: 'FORMAZIONE',
};

// ============================================
// CONFIGURAZIONE ENTITÀ PER BRANCH
// ============================================

/**
 * Configurazione delle entità per branch
 * 
 * - branch: Branch a cui appartiene l'entità (MEDICA, FORMAZIONE)
 * - shared: true = entità condivisa tra branch
 * - inherit: ereditarietà da entità parent (per relazioni FK)
 * - mixed: true = può contenere dati di più branch (es. Preventivo)
 * - trackBranch: true = traccia branch ma non filtra (es. ActivityLog)
 */
export const BRANCH_CONFIG = {
    // ============================================
    // ENTITÀ MEDICA (branchType obbligatorio)
    // ============================================
    prestazione: { branch: 'MEDICA', shared: false },
    poliambulatorio: { branch: 'MEDICA', shared: false },
    sedePoliambulatorio: { branch: 'MEDICA', shared: false, inherit: 'poliambulatorio' },
    orarioSede: { branch: 'MEDICA', shared: false, inherit: 'sedePoliambulatorio' },
    chiusuraSpecialeSede: { branch: 'MEDICA', shared: false, inherit: 'sedePoliambulatorio' },
    ambulatorio: { branch: 'MEDICA', shared: false, inherit: 'sedePoliambulatorio' },
    orarioAmbulatorio: { branch: 'MEDICA', shared: false, inherit: 'ambulatorio' },
    ambulatorioPrestazione: { branch: 'MEDICA', shared: false, inherit: 'ambulatorio' },
    medicoAbilitato: { branch: 'MEDICA', shared: false, inherit: 'ambulatorio' },
    strumento: { branch: 'MEDICA', shared: false },
    strumentoAmbulatorio: { branch: 'MEDICA', shared: false, inherit: 'strumento' },
    manutenzioneStrumento: { branch: 'MEDICA', shared: false, inherit: 'strumento' },
    prestazioneStrumento: { branch: 'MEDICA', shared: false, inherit: 'prestazione' },
    prestazioneTipologiaStrumento: { branch: 'MEDICA', shared: false, inherit: 'prestazione' },
    offertaBundle: { branch: 'MEDICA', shared: false },
    offertaBundlePrestazione: { branch: 'MEDICA', shared: false, inherit: 'offertaBundle' },
    listinoPrezzo: { branch: 'MEDICA', shared: false },
    tariffarioMedico: { branch: 'MEDICA', shared: false },
    convenzione: { branch: 'MEDICA', shared: false },
    convenzionePoliambulatorio: { branch: 'MEDICA', shared: false, inherit: 'convenzione' },
    convenzioneAzienda: { branch: 'MEDICA', shared: false, inherit: 'convenzione' },
    riconoscimentoConvenzione: { branch: 'MEDICA', shared: false, inherit: 'convenzione' },
    riconoscimentoErogato: { branch: 'MEDICA', shared: false, inherit: 'riconoscimentoConvenzione' },
    slotDisponibilita: { branch: 'MEDICA', shared: false, inherit: 'ambulatorio' },
    appuntamento: { branch: 'MEDICA', shared: false },
    visita: { branch: 'MEDICA', shared: false, inherit: 'appuntamento' },
    referto: { branch: 'MEDICA', shared: false, inherit: 'visita' },
    versioneReferto: { branch: 'MEDICA', shared: false, inherit: 'referto' },
    firmaDigitale: { branch: 'MEDICA', shared: false, inherit: 'referto' },
    allegatoReferto: { branch: 'MEDICA', shared: false, inherit: 'referto' },
    templateCampoVisita: { branch: 'MEDICA', shared: false },
    valoreCampoVisita: { branch: 'MEDICA', shared: false, inherit: 'visita' },
    documentoClinico: { branch: 'MEDICA', shared: false, inherit: 'visita' },
    fatturaSanitaria: { branch: 'MEDICA', shared: false, inherit: 'visita' },
    auditClinico: { branch: 'MEDICA', shared: false },
    disponibilitaMedico: { branch: 'MEDICA', shared: false },
    ferieAssenza: { branch: 'MEDICA', shared: false },
    numeroChiamata: { branch: 'MEDICA', shared: false },
    allegatoVisita: { branch: 'MEDICA', shared: false, inherit: 'visita' },
    prestazioneAggiuntiva: { branch: 'MEDICA', shared: false, inherit: 'visita' },

    // ============================================
    // ENTITÀ FORMAZIONE (branchType obbligatorio)
    // ============================================
    course: { branch: 'FORMAZIONE', shared: false },
    courseSchedule: { branch: 'FORMAZIONE', shared: false, inherit: 'course' },
    courseEnrollment: { branch: 'FORMAZIONE', shared: false, inherit: 'courseSchedule' },
    courseSession: { branch: 'FORMAZIONE', shared: false, inherit: 'courseSchedule' },
    scheduleCompany: { branch: 'FORMAZIONE', shared: false, inherit: 'courseSchedule' },
    attestato: { branch: 'FORMAZIONE', shared: false, inherit: 'courseEnrollment' },
    registroPresenze: { branch: 'FORMAZIONE', shared: false, inherit: 'courseSchedule' },
    registroPresenzePartecipante: { branch: 'FORMAZIONE', shared: false, inherit: 'registroPresenze' },
    letteraIncarico: { branch: 'FORMAZIONE', shared: false },
    courseTestAssignment: { branch: 'FORMAZIONE', shared: false, inherit: 'course' },
    courseTestResult: { branch: 'FORMAZIONE', shared: false, inherit: 'courseTestAssignment' },

    // ============================================
    // ENTITÀ CONDIVISE (nessun filtro branch)
    // ============================================
    company: { shared: true },
    companySite: { shared: true, inherit: 'company' },
    person: { shared: true },
    personRole: { shared: true },
    personDocument: { shared: true },
    personTenantAccess: { shared: true },
    codiceSconto: { shared: true },
    codiceAzienda: { shared: true },
    codicePersona: { shared: true },
    codiceCorso: { shared: true },
    preventivoSconto: { shared: true },
    fattura: { shared: true },
    fatturaAzienda: { shared: true },
    dvr: { shared: true },
    sopralluogo: { shared: true },
    reparto: { shared: true },
    template: { shared: true },
    templateLink: { shared: true },
    templateVersion: { shared: true },
    generatedDocument: { shared: true },
    googleTokens: { shared: true },
    cmsPage: { shared: true },
    cmsPageView: { shared: true },
    cmsMedia: { shared: true },
    cmsMediaFolders: { shared: true },
    seoConfigs: { shared: true },
    sitemaps: { shared: true },
    contactSubmission: { shared: true },
    formFields: { shared: true },
    formTemplates: { shared: true },
    permission: { shared: true },
    advancedPermission: { shared: true },
    rolePermission: { shared: true },
    customRole: { shared: true },
    customRolePermission: { shared: true },
    relationDefinition: { shared: true },
    gdprAuditLog: { shared: true },
    consentRecord: { shared: true },
    securityAuditLog: { shared: true },
    dataRetentionPolicy: { shared: true },
    refreshToken: { shared: true },
    personSession: { shared: true },
    tenant: { shared: true },
    tenantConfiguration: { shared: true },
    tenantUsage: { shared: true },
    tariffarioAziendale: { shared: true },
    voceTariffario: { shared: true },
    fasciaDipendentiPrezzo: { shared: true },

    // ============================================
    // ENTITÀ MISTE (branchTypes array o opzionale)
    // ============================================
    preventivo: { shared: true, mixed: true }, // branchTypes[] array
    activityLog: { shared: true, trackBranch: true }, // branchType? opzionale per tracciamento
};

// ============================================
// MAPPING FRONTEND → BRANCH
// ============================================

const FRONTEND_BRANCH_MAP = {
    'element-medica': 'MEDICA',
    'element-formazione': 'FORMAZIONE',
    'elementmedica': 'MEDICA',
    'elementformazione': 'FORMAZIONE',
};

// ============================================
// FUNZIONI HELPER
// ============================================

/**
 * Determina il branch dalla request HTTP
 * 
 * Priorità:
 * 1. Query parameter esplicito (?branchType=MEDICA)
 * 2. Header X-Frontend-Id
 * 3. Analisi path dell'URL
 * 4. Tenant primaryBranch (se disponibile)
 * 5. null (nessun branch determinato)
 * 
 * @param {Object} req - Express request object
 * @returns {string|null} - 'MEDICA', 'FORMAZIONE', o null
 */
export function getBranchFromRequest(req) {
    // 1. Query parameter esplicito
    if (req.query?.branchType) {
        const branch = req.query.branchType.toUpperCase();
        if (branch === 'MEDICA' || branch === 'FORMAZIONE') {
            return branch;
        }
        logger.warn({ branchType: req.query.branchType }, 'Invalid branchType in query parameter');
    }

    // 2. Header X-Frontend-Id
    const frontendId = req.headers?.['x-frontend-id']?.toLowerCase();
    if (frontendId && FRONTEND_BRANCH_MAP[frontendId]) {
        return FRONTEND_BRANCH_MAP[frontendId];
    }

    // 3. Analisi path dell'URL
    const path = req.path?.toLowerCase() || '';

    // Patterns MEDICA
    if (
        path.includes('/clinica/') ||
        path.includes('/prestazioni') ||
        path.includes('/visite') ||
        path.includes('/referti') ||
        path.includes('/ambulatori') ||
        path.includes('/poliambulatori') ||
        path.includes('/strumenti') ||
        path.includes('/listini') ||
        path.includes('/tariffari') ||
        path.includes('/convenzioni') ||
        path.includes('/disponibilita') ||
        path.includes('/appuntamenti') ||
        path.includes('/bundle')
    ) {
        return 'MEDICA';
    }

    // Patterns FORMAZIONE
    if (
        path.includes('/corsi') ||
        path.includes('/courses') ||
        path.includes('/schedules') ||
        path.includes('/attestati') ||
        path.includes('/registri-presenze') ||
        path.includes('/lettere-incarico') ||
        path.includes('/enrollments')
    ) {
        return 'FORMAZIONE';
    }

    // 4. Tenant primaryBranch
    if (req.tenant?.primaryBranch) {
        return req.tenant.primaryBranch;
    }

    // 5. Nessun branch determinato
    return null;
}

/**
 * Verifica se l'utente ha accesso al branch richiesto
 * 
 * @param {Object} req - Express request object
 * @param {string} branchType - Branch richiesto ('MEDICA' o 'FORMAZIONE')
 * @returns {boolean} - true se l'utente può accedere
 */
export function canAccessBranch(req, branchType) {
    const user = req.user;

    if (!user) {
        logger.warn('canAccessBranch called without user');
        return false;
    }

    if (!branchType) {
        return true; // Nessun branch richiesto = accesso a entità condivise
    }

    // Admin globale può accedere a tutto (ma comunque tracciato)
    if (user.globalRole === 'ADMIN' || user.globalRole === 'SUPER_ADMIN') {
        return true;
    }

    // Verifica PersonTenantAccess.enabledBranches
    const tenantAccess = user.tenantAccess || req.tenantAccess;
    if (tenantAccess?.enabledBranches?.length > 0) {
        return tenantAccess.enabledBranches.includes(branchType);
    }

    // Verifica enabledBranches del tenant
    if (req.tenant?.enabledBranches?.length > 0) {
        return req.tenant.enabledBranches.includes(branchType);
    }

    // Default: nega accesso se non esplicitamente autorizzato
    return false;
}

/**
 * Ottiene i branch accessibili per l'utente nel tenant corrente
 * 
 * @param {Object} req - Express request object
 * @returns {string[]} - Array di BranchType accessibili
 */
export function getAccessibleBranches(req) {
    const user = req.user;

    if (!user) {
        return [];
    }

    // Admin globale vede tutti i branch abilitati del tenant
    if (user.globalRole === 'ADMIN' || user.globalRole === 'SUPER_ADMIN') {
        return req.tenant?.enabledBranches || ['MEDICA', 'FORMAZIONE'];
    }

    // Utente normale: intersezione tra branch tenant e branch personali
    const tenantBranches = req.tenant?.enabledBranches || [];
    const userBranches = req.tenantAccess?.enabledBranches || [];

    if (userBranches.length === 0) {
        // Se l'utente non ha branch specifici, eredita quelli del tenant
        return tenantBranches;
    }

    // Intersezione
    return tenantBranches.filter(b => userBranches.includes(b));
}

/**
 * Genera filtro Prisma per branch
 * 
 * @param {string} entityName - Nome entità (es. 'prestazione', 'course')
 * @param {string|null} branchType - Branch corrente o null
 * @returns {Object} - Filtro Prisma da aggiungere a where
 */
export function getBranchFilter(entityName, branchType) {
    const config = BRANCH_CONFIG[entityName?.toLowerCase()];

    if (!config) {
        logger.debug({ entityName }, 'No branch config for entity');
        return {};
    }

    // Entità condivise senza tracking: nessun filtro
    if (config.shared && !config.mixed && !config.trackBranch) {
        return {};
    }

    // Entità miste (Preventivo): filtro opzionale su array branchTypes
    if (config.mixed) {
        if (branchType) {
            return { branchTypes: { has: branchType } };
        }
        return {};
    }

    // Entità con tracking (ActivityLog): non filtrare ma loggare
    if (config.trackBranch) {
        return {};
    }

    // Entità branch-specific: filtro obbligatorio se branch specificato
    if (branchType && !config.shared) {
        return { branchType };
    }

    // Entità branch-specific senza branch: potenziale problema
    if (!config.shared && !branchType) {
        logger.debug({ entityName }, 'No branchType specified for branch-specific entity');
        // Non filtrare = mostra tutti i record (admin view)
        return {};
    }

    return {};
}

/**
 * Costruisce where clause completa per query multi-tenant + branch
 * 
 * @param {Object} req - Express request object
 * @param {string} entityName - Nome entità
 * @param {Object} additionalFilters - Filtri aggiuntivi
 * @returns {Object} - Where clause Prisma completa
 */
export function buildWhereClause(req, entityName, additionalFilters = {}) {
    const tenantId = req.user?.tenantId || req.tenantId;
    const branchType = getBranchFromRequest(req);
    const branchFilter = getBranchFilter(entityName, branchType);

    return {
        tenantId,
        deletedAt: null,
        ...branchFilter,
        ...additionalFilters,
    };
}

/**
 * Determina il branch default per una nuova entità
 * 
 * @param {string} entityName - Nome entità
 * @param {Object} req - Express request (per context)
 * @returns {string|null} - Branch type o null per entità condivise
 */
export function getDefaultBranchForEntity(entityName, req) {
    const config = BRANCH_CONFIG[entityName?.toLowerCase()];

    if (!config || config.shared) {
        return null;
    }

    // Usa il branch dalla request se disponibile
    const requestBranch = getBranchFromRequest(req);
    if (requestBranch) {
        return requestBranch;
    }

    // Fallback al branch default dell'entità
    return config.branch || null;
}

/**
 * Verifica se un'entità è branch-specific
 * 
 * @param {string} entityName - Nome entità
 * @returns {boolean}
 */
export function isBranchSpecificEntity(entityName) {
    const config = BRANCH_CONFIG[entityName?.toLowerCase()];
    return config && !config.shared;
}

/**
 * Ottiene il branch di un'entità dalla sua configurazione
 * 
 * @param {string} entityName - Nome entità
 * @returns {string|null} - Branch type o null
 */
export function getEntityBranch(entityName) {
    const config = BRANCH_CONFIG[entityName?.toLowerCase()];
    return config?.branch || null;
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Middleware per validare accesso al branch
 * 
 * @param {string|null} requiredBranch - Branch richiesto, o null per auto-detection
 * @returns {Function} - Express middleware
 */
export function requireBranchAccess(requiredBranch = null) {
    return (req, res, next) => {
        const branch = requiredBranch || getBranchFromRequest(req);

        // Entità condivise non richiedono branch
        if (!branch) {
            return next();
        }

        // Verifica accesso
        if (!canAccessBranch(req, branch)) {
            logger.warn({
                userId: req.user?.id,
                tenantId: req.user?.tenantId,
                requiredBranch: branch,
                userBranches: req.tenantAccess?.enabledBranches,
                path: req.path,
            }, 'Branch access denied');

            return res.status(403).json({
                error: 'Branch access denied',
                code: 'BRANCH_ACCESS_DENIED',
                message: `You do not have access to branch: ${branch}`,
                required: branch,
                available: getAccessibleBranches(req),
            });
        }

        // Salva branch nella request per uso downstream
        req.branchType = branch;
        next();
    };
}

/**
 * Middleware per aggiungere branch context alla request
 * (non blocca, solo arricchisce)
 */
export function enrichBranchContext() {
    return (req, res, next) => {
        req.branchType = getBranchFromRequest(req);
        req.accessibleBranches = getAccessibleBranches(req);
        next();
    };
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
    BRANCH_TYPES,
    BRANCH_CONFIG,
    getBranchFromRequest,
    canAccessBranch,
    getAccessibleBranches,
    getBranchFilter,
    buildWhereClause,
    getDefaultBranchForEntity,
    isBranchSpecificEntity,
    getEntityBranch,
    requireBranchAccess,
    enrichBranchContext,
};
