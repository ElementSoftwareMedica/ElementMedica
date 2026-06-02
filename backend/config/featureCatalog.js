/**
 * Feature Catalog - Definizioni statiche di tutte le funzionalità disponibili
 * Il catalogo definisce nomi, descrizioni e categorie.
 * I prezzi vengono letti/aggiornati tramite feature-prices.json.
 */

export const FEATURE_CATALOG = [
    // ── Branch ─────────────────────────────────────────────────────────────────
    {
        key: 'BRANCH_MEDICA',
        label: 'Clinica (Medica)',
        description: 'Accesso completo al modulo ambulatorio: visite mediche, sopralluoghi, giudizi di idoneità e gestione pazienti.',
        category: 'branch',
        icon: '🏥',
    },
    {
        key: 'BRANCH_FORMAZIONE',
        label: 'Formazione',
        description: 'Gestione corsi di formazione, attestati, registri presenze, lettere di incarico e test.',
        category: 'branch',
        icon: '🎓',
    },
    {
        key: 'BRANCH_LABORATORIO',
        label: 'Laboratorio',
        description: 'Modulo analisi, referti di laboratorio e gestione campioni.',
        category: 'branch',
        icon: '🔬',
    },
    {
        key: 'BRANCH_CONSULENZA',
        label: 'Consulenza',
        description: 'Servizi di consulenza aziendale, DVR e sopralluoghi.',
        category: 'branch',
        icon: '💼',
    },

    // ── MDL ────────────────────────────────────────────────────────────────────
    {
        key: 'MDL_BASE',
        label: 'Medicina del Lavoro (Base)',
        description: 'Sorveglianza sanitaria base, gestione lavoratori e protocolli sanitari.',
        category: 'mdl',
        icon: '🩺',
    },
    {
        key: 'MDL_SORVEGLIANZA',
        label: 'Sorveglianza Sanitaria Avanzata',
        description: 'Sorveglianza sanitaria avanzata con protocolli personalizzati e scadenze automatiche.',
        category: 'mdl',
        icon: '📋',
    },
    {
        key: 'MDL_ALLEGATO_3B',
        label: 'Allegato 3B',
        description: 'Generazione e gestione Allegato 3B (cartelle sanitarie e di rischio).',
        category: 'mdl',
        icon: '📄',
    },
    {
        key: 'MDL_PROTOCOLLI',
        label: 'Protocolli Sanitari',
        description: 'Gestione avanzata dei protocolli sanitari per mansione.',
        category: 'mdl',
        icon: '📝',
    },

    // ── Fatturazione ───────────────────────────────────────────────────────────
    {
        key: 'FATTURAZIONE_ELETTRONICA',
        label: 'Fatturazione Elettronica',
        description: 'Invio fatture al Sistema di Interscambio (SDI) e gestione XML FatturaPA.',
        category: 'fatturazione',
        icon: '💰',
    },
    {
        key: 'FATTURAZIONE_PA',
        label: 'Fatturazione verso PA',
        description: 'Fatture verso la Pubblica Amministrazione con codice IPA e split payment.',
        category: 'fatturazione',
        icon: '🏛️',
    },
    {
        key: 'FATTURAZIONE_SPLIT_PAYMENT',
        label: 'Split Payment IVA',
        description: 'Gestione automatica dello split payment IVA per clienti PA.',
        category: 'fatturazione',
        icon: '✂️',
    },

    // ── Comunicazioni ──────────────────────────────────────────────────────────
    {
        key: 'PEC_INTEGRATION',
        label: 'Integrazione PEC',
        description: 'Invio e ricezione automatica di PEC direttamente dalla piattaforma.',
        category: 'comunicazioni',
        icon: '📧',
    },
    {
        key: 'SMS_NOTIFICATIONS',
        label: 'Notifiche SMS',
        description: 'Invio SMS automatici a pazienti e lavoratori per promemoria e comunicazioni.',
        category: 'comunicazioni',
        icon: '📱',
    },
    {
        key: 'WHATSAPP_INTEGRATION',
        label: 'Integrazione WhatsApp',
        description: 'Notifiche e comunicazioni via WhatsApp Business.',
        category: 'comunicazioni',
        icon: '💬',
    },

    // ── Infrastruttura ─────────────────────────────────────────────────────────
    {
        key: 'MULTI_SEDE',
        label: 'Multi-sede',
        description: 'Gestione di più sedi aziendali con ambulatori e calendari separati.',
        category: 'infrastruttura',
        icon: '🏢',
    },
    {
        key: 'API_ACCESS',
        label: 'Accesso API',
        description: 'Accesso alle API pubbliche per integrazioni di terze parti.',
        category: 'infrastruttura',
        icon: '🔌',
    },
    {
        key: 'WHITE_LABEL',
        label: 'White Label',
        description: 'Personalizzazione completa del branding: logo, colori e dominio dedicato.',
        category: 'infrastruttura',
        icon: '🎨',
    },
    {
        key: 'SSO_INTEGRATION',
        label: 'Single Sign-On (SSO)',
        description: 'Autenticazione SSO con provider aziendali (SAML, OIDC).',
        category: 'infrastruttura',
        icon: '🔑',
    },

    // ── Analytics ──────────────────────────────────────────────────────────────
    {
        key: 'CUSTOM_REPORTS',
        label: 'Report Personalizzati',
        description: 'Creazione di report e dashboard personalizzati con esportazione Excel/PDF.',
        category: 'analytics',
        icon: '📊',
    },
    {
        key: 'DATA_EXPORT_ADVANCED',
        label: 'Export Dati Avanzato',
        description: 'Esportazione avanzata di tutti i dati in formati strutturati (CSV, Excel, JSON).',
        category: 'analytics',
        icon: '📤',
    },

    // ── Firma Digitale ─────────────────────────────────────────────────────────
    {
        key: 'FIRMA_GRAFOMETRICA',
        label: 'Firma Grafometrica',
        description: 'Firma digitale a penna su tablet per documenti medici.',
        category: 'firma',
        icon: '✍️',
    },
    {
        key: 'FIRMA_FEQ',
        label: 'Firma Elettronica Qualificata (FEQ)',
        description: 'Firma elettronica qualificata con validità legale piena.',
        category: 'firma',
        icon: '🖊️',
    },
    {
        key: 'FIRMA_FEA',
        label: 'Firma Elettronica Avanzata (FEA)',
        description: 'Firma elettronica avanzata per documenti aziendali.',
        category: 'firma',
        icon: '📜',
    },
    {
        key: 'FIRMA_REMOTA',
        label: 'Firma Remota',
        description: 'Firma di documenti da remoto via OTP su smartphone.',
        category: 'firma',
        icon: '📲',
    },
    {
        key: 'FIRMA_BIOMETRICA',
        label: 'Firma Biometrica',
        description: 'Firma biometrica con rilevazione comportamentale avanzata.',
        category: 'firma',
        icon: '👆',
    },

    // ── FSE ────────────────────────────────────────────────────────────────────
    {
        key: 'FSE_EXPORT_CDA',
        label: 'Export FSE CDA',
        description: 'Esportazione documenti clinici nel formato CDA2 per il Fascicolo Sanitario Elettronico.',
        category: 'fse',
        icon: '🏥',
    },
    {
        key: 'FSE_CONSENSI_AVANZATI',
        label: 'Consensi FSE Avanzati',
        description: 'Gestione avanzata dei consensi per l\'accesso al FSE regionale.',
        category: 'fse',
        icon: '📋',
    },

    // ── Gestionale HR ─────────────────────────────────────────────────────────
    {
        key: 'HR_MANAGEMENT',
        label: 'Gestionale HR',
        description: 'Gestione risorse umane: profili personale, turni, presenze, timbrature, assenze e cartellini. Senza questa funzionalità è possibile solo creare account senza gestire le HR.',
        category: 'hr',
        icon: '👥',
    },

    // ── App Esterne ────────────────────────────────────────────────────────────
    {
        key: 'BRIDGE_APP',
        label: 'Bridge App',
        description: 'Connessione con dispositivi medici locali tramite applicazione bridge. Richiede installazione del software ElementBridge sul PC del cliente.',
        category: 'apps',
        icon: '🔗',
    },
    {
        key: 'DESKTOP_APP',
        label: 'App Desktop',
        description: 'Accesso tramite applicazione desktop nativa (Windows/macOS). Include funzionalità offline e integrazioni locali.',
        category: 'apps',
        icon: '💻',
    },

    // ── Limiti Account ─────────────────────────────────────────────────────────
    {
        key: 'MAX_MEDICI',
        label: 'Limite Account Medici',
        description: 'Numero massimo di account con ruolo Medico attivabili sul tenant.',
        category: 'account_limits',
        icon: '👨‍⚕️',
        type: 'limit',
    },
    {
        key: 'MAX_SEGRETARIE',
        label: 'Limite Account Segreterie',
        description: 'Numero massimo di account con ruolo Segreteria/Reception attivabili sul tenant.',
        category: 'account_limits',
        icon: '👩‍💼',
        type: 'limit',
    },
    {
        key: 'MAX_BRIDGE_KEYS',
        label: 'Limite Licenze Bridge',
        description: 'Numero massimo di chiavi di licenza Bridge attivabili sul tenant.',
        category: 'account_limits',
        icon: '🔑',
        type: 'limit',
    },
    {
        key: 'MAX_DESKTOP_KEYS',
        label: 'Limite Licenze Desktop',
        description: 'Numero massimo di installazioni dell\'app Desktop attivabili sul tenant.',
        category: 'account_limits',
        icon: '🖥️',
        type: 'limit',
    },
];

/** Ordine e label delle categorie */
export const FEATURE_CATEGORIES = [
    { key: 'branch', label: 'Branch Operativi', icon: '🏢', color: 'blue' },
    { key: 'mdl', label: 'Medicina del Lavoro', icon: '🩺', color: 'teal' },
    { key: 'fatturazione', label: 'Fatturazione', icon: '💰', color: 'green' },
    { key: 'comunicazioni', label: 'Comunicazioni', icon: '📧', color: 'purple' },
    { key: 'infrastruttura', label: 'Infrastruttura', icon: '🏗️', color: 'gray' },
    { key: 'analytics', label: 'Analytics & Report', icon: '📊', color: 'amber' },
    { key: 'firma', label: 'Firma Digitale', icon: '✍️', color: 'indigo' },
    { key: 'fse', label: 'Fascicolo Sanitario', icon: '🏥', color: 'red' },
    { key: 'apps', label: 'App Esterne', icon: '📱', color: 'teal' },
    { key: 'hr', label: 'Gestionale HR', icon: '👥', color: 'purple' },
    { key: 'account_limits', label: 'Limiti Account', icon: '🚧', color: 'amber' },
];

export default FEATURE_CATALOG;
