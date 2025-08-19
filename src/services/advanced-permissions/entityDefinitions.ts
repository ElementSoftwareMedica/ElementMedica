import { EntityDefinition } from './types';

/**
 * Definizioni statiche delle entità del sistema
 * Utilizzate come fallback quando il backend non è disponibile
 */
export const STATIC_ENTITY_DEFINITIONS: EntityDefinition[] = [
  {
    id: 'persons',
    name: 'persons',
    displayName: 'Persone',
    fields: [
      { id: 'firstName', name: 'firstName', displayName: 'Nome', type: 'string' },
      { id: 'lastName', name: 'lastName', displayName: 'Cognome', type: 'string' },
      { id: 'email', name: 'email', displayName: 'Email', type: 'email', sensitive: true },
      { id: 'phone', name: 'phone', displayName: 'Telefono', type: 'phone', sensitive: true },
      { id: 'address', name: 'address', displayName: 'Indirizzo', type: 'string', sensitive: true },
      { id: 'fiscalCode', name: 'fiscalCode', displayName: 'Codice Fiscale', type: 'string', sensitive: true },
      { id: 'birthDate', name: 'birthDate', displayName: 'Data di Nascita', type: 'date', sensitive: true },
      { id: 'salary', name: 'salary', displayName: 'Stipendio', type: 'number', sensitive: true }
    ]
  },
  {
    id: 'companies',
    name: 'companies',
    displayName: 'Aziende',
    fields: [
      { id: 'name', name: 'name', displayName: 'Nome Azienda', type: 'string' },
      { id: 'vatNumber', name: 'vatNumber', displayName: 'Partita IVA', type: 'string' },
      { id: 'address', name: 'address', displayName: 'Indirizzo', type: 'string' },
      { id: 'phone', name: 'phone', displayName: 'Telefono', type: 'phone' },
      { id: 'email', name: 'email', displayName: 'Email', type: 'email' }
    ]
  },
  {
    id: 'courses',
    name: 'courses',
    displayName: 'Corsi',
    fields: [
      { id: 'title', name: 'title', displayName: 'Titolo', type: 'string' },
      { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string' },
      { id: 'startDate', name: 'startDate', displayName: 'Data Inizio', type: 'date' },
      { id: 'endDate', name: 'endDate', displayName: 'Data Fine', type: 'date' },
      { id: 'maxParticipants', name: 'maxParticipants', displayName: 'Max Partecipanti', type: 'number' }
    ]
  },
  {
    id: 'trainings',
    name: 'trainings',
    displayName: 'Formazioni',
    fields: [
      { id: 'title', name: 'title', displayName: 'Titolo Sessione', type: 'string' },
      { id: 'startDate', name: 'startDate', displayName: 'Data Inizio', type: 'date' },
      { id: 'endDate', name: 'endDate', displayName: 'Data Fine', type: 'date' },
      { id: 'location', name: 'location', displayName: 'Luogo', type: 'string' },
      { id: 'instructor', name: 'instructor', displayName: 'Formatore', type: 'string' },
      { id: 'status', name: 'status', displayName: 'Stato', type: 'string' }
    ]
  },
  {
    id: 'roles',
    name: 'roles',
    displayName: 'Ruoli',
    fields: [
      { id: 'name', name: 'name', displayName: 'Nome Ruolo', type: 'string' },
      { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string' },
      { id: 'level', name: 'level', displayName: 'Livello', type: 'number' }
    ]
  },
  {
    id: 'hierarchy',
    name: 'hierarchy',
    displayName: 'Gerarchia',
    fields: [
      { id: 'name', name: 'name', displayName: 'Nome Nodo', type: 'string' },
      { id: 'type', name: 'type', displayName: 'Tipo', type: 'string' },
      { id: 'level', name: 'level', displayName: 'Livello', type: 'number' },
      { id: 'manager', name: 'manager', displayName: 'Responsabile', type: 'string' }
    ]
  },
  {
    id: 'sites',
    name: 'sites',
    displayName: 'Sedi Aziendali',
    fields: [
      { id: 'siteName', name: 'siteName', displayName: 'Nome Sede', type: 'string' },
      { id: 'citta', name: 'citta', displayName: 'Città', type: 'string' },
      { id: 'indirizzo', name: 'indirizzo', displayName: 'Indirizzo', type: 'string' },
      { id: 'telefono', name: 'telefono', displayName: 'Telefono', type: 'string' },
      { id: 'mail', name: 'mail', displayName: 'Email', type: 'email' }
    ]
  },
  {
    id: 'reparti',
    name: 'reparti',
    displayName: 'Reparti',
    fields: [
      { id: 'nome', name: 'nome', displayName: 'Nome Reparto', type: 'string' },
      { id: 'descrizione', name: 'descrizione', displayName: 'Descrizione', type: 'string' },
      { id: 'codiceReparto', name: 'codiceReparto', displayName: 'Codice Reparto', type: 'string' },
      { id: 'budget', name: 'budget', displayName: 'Budget', type: 'number', sensitive: true }
    ]
  },
  {
    id: 'dvr',
    name: 'dvr',
    displayName: 'DVR (Documenti Valutazione Rischi)',
    fields: [
      { id: 'titolo', name: 'titolo', displayName: 'Titolo', type: 'string' },
      { id: 'descrizione', name: 'descrizione', displayName: 'Descrizione', type: 'string' },
      { id: 'versione', name: 'versione', displayName: 'Versione', type: 'string' },
      { id: 'dataEmissione', name: 'dataEmissione', displayName: 'Data Emissione', type: 'date' },
      { id: 'stato', name: 'stato', displayName: 'Stato', type: 'string' }
    ]
  },
  // Entità virtuali basate su Person con ruoli specifici
  {
    id: 'employees',
    name: 'employees',
    displayName: 'Dipendenti',
    fields: [
      { id: 'id', name: 'id', displayName: 'ID', type: 'number' },
      { id: 'firstName', name: 'firstName', displayName: 'Nome', type: 'string' },
      { id: 'lastName', name: 'lastName', displayName: 'Cognome', type: 'string' },
      { id: 'email', name: 'email', displayName: 'Email', type: 'email', sensitive: true },
      { id: 'phone', name: 'phone', displayName: 'Telefono', type: 'phone', sensitive: true },
      { id: 'address', name: 'address', displayName: 'Indirizzo', type: 'string', sensitive: true },
      { id: 'fiscalCode', name: 'fiscalCode', displayName: 'Codice Fiscale', type: 'string', sensitive: true },
      { id: 'birthDate', name: 'birthDate', displayName: 'Data di Nascita', type: 'date', sensitive: true },
      { id: 'salary', name: 'salary', displayName: 'Stipendio', type: 'number', sensitive: true },
      { id: 'role', name: 'role', displayName: 'Ruolo Aziendale', type: 'string' },
      { id: 'department', name: 'department', displayName: 'Reparto', type: 'string' },
      { id: 'hireDate', name: 'hireDate', displayName: 'Data Assunzione', type: 'date' }
    ]
  },
  {
    id: 'trainers',
    name: 'trainers',
    displayName: 'Formatori',
    fields: [
      { id: 'id', name: 'id', displayName: 'ID', type: 'number' },
      { id: 'firstName', name: 'firstName', displayName: 'Nome', type: 'string' },
      { id: 'lastName', name: 'lastName', displayName: 'Cognome', type: 'string' },
      { id: 'email', name: 'email', displayName: 'Email', type: 'email', sensitive: true },
      { id: 'phone', name: 'phone', displayName: 'Telefono', type: 'phone', sensitive: true },
      { id: 'specialization', name: 'specialization', displayName: 'Specializzazione', type: 'string' },
      { id: 'certifications', name: 'certifications', displayName: 'Certificazioni', type: 'string' },
      { id: 'experience', name: 'experience', displayName: 'Esperienza (anni)', type: 'number' },
      { id: 'hourlyRate', name: 'hourlyRate', displayName: 'Tariffa Oraria', type: 'number', sensitive: true },
      { id: 'availability', name: 'availability', displayName: 'Disponibilità', type: 'string' },
      { id: 'rating', name: 'rating', displayName: 'Valutazione', type: 'number' }
    ]
  },
  {
    id: 'sopralluoghi',
    name: 'sopralluoghi',
    displayName: 'Sopralluoghi',
    fields: [
      { id: 'titolo', name: 'titolo', displayName: 'Titolo', type: 'string' },
      { id: 'descrizione', name: 'descrizione', displayName: 'Descrizione', type: 'string' },
      { id: 'tipo', name: 'tipo', displayName: 'Tipo Sopralluogo', type: 'string' },
      { id: 'dataSopralluogo', name: 'dataSopralluogo', displayName: 'Data Sopralluogo', type: 'date' },
      { id: 'stato', name: 'stato', displayName: 'Stato', type: 'string' },
      { id: 'esito', name: 'esito', displayName: 'Esito', type: 'string' }
    ]
  }
];

/**
 * Entità aggiuntive per completare il set di 30+ entità
 */
export const EXTENDED_ENTITY_DEFINITIONS: EntityDefinition[] = [
  {
    id: 'gdpr',
    name: 'gdpr',
    displayName: 'GDPR',
    fields: [
      { id: 'title', name: 'title', displayName: 'Titolo', type: 'string' },
      { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string' },
      { id: 'dataType', name: 'dataType', displayName: 'Tipo Dato', type: 'string', sensitive: true },
      { id: 'purpose', name: 'purpose', displayName: 'Finalità', type: 'string' },
      { id: 'retention', name: 'retention', displayName: 'Conservazione', type: 'string' }
    ]
  },
  {
    id: 'documents',
    name: 'documents',
    displayName: 'Documenti',
    fields: [
      { id: 'title', name: 'title', displayName: 'Titolo', type: 'string' },
      { id: 'type', name: 'type', displayName: 'Tipo', type: 'string' },
      { id: 'version', name: 'version', displayName: 'Versione', type: 'string' },
      { id: 'createdDate', name: 'createdDate', displayName: 'Data Creazione', type: 'date' },
      { id: 'content', name: 'content', displayName: 'Contenuto', type: 'string', sensitive: true }
    ]
  },
  {
    id: 'certificates',
    name: 'certificates',
    displayName: 'Certificati',
    fields: [
      { id: 'name', name: 'name', displayName: 'Nome Certificato', type: 'string' },
      { id: 'issuer', name: 'issuer', displayName: 'Ente Emittente', type: 'string' },
      { id: 'issueDate', name: 'issueDate', displayName: 'Data Emissione', type: 'date' },
      { id: 'expiryDate', name: 'expiryDate', displayName: 'Data Scadenza', type: 'date' },
      { id: 'status', name: 'status', displayName: 'Stato', type: 'string' }
    ]
  },
  {
    id: 'equipment',
    name: 'equipment',
    displayName: 'Attrezzature',
    fields: [
      { id: 'name', name: 'name', displayName: 'Nome Attrezzatura', type: 'string' },
      { id: 'model', name: 'model', displayName: 'Modello', type: 'string' },
      { id: 'serialNumber', name: 'serialNumber', displayName: 'Numero Seriale', type: 'string' },
      { id: 'purchaseDate', name: 'purchaseDate', displayName: 'Data Acquisto', type: 'date' },
      { id: 'cost', name: 'cost', displayName: 'Costo', type: 'number', sensitive: true }
    ]
  },
  {
    id: 'incidents',
    name: 'incidents',
    displayName: 'Incidenti',
    fields: [
      { id: 'title', name: 'title', displayName: 'Titolo', type: 'string' },
      { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string' },
      { id: 'severity', name: 'severity', displayName: 'Gravità', type: 'string' },
      { id: 'date', name: 'date', displayName: 'Data Incidente', type: 'date' },
      { id: 'status', name: 'status', displayName: 'Stato', type: 'string' }
    ]
  },
  {
    id: 'audits',
    name: 'audits',
    displayName: 'Audit',
    fields: [
      { id: 'title', name: 'title', displayName: 'Titolo Audit', type: 'string' },
      { id: 'type', name: 'type', displayName: 'Tipo Audit', type: 'string' },
      { id: 'date', name: 'date', displayName: 'Data Audit', type: 'date' },
      { id: 'auditor', name: 'auditor', displayName: 'Auditor', type: 'string' },
      { id: 'findings', name: 'findings', displayName: 'Risultati', type: 'string', sensitive: true }
    ]
  },
  {
    id: 'policies',
    name: 'policies',
    displayName: 'Politiche',
    fields: [
      { id: 'title', name: 'title', displayName: 'Titolo Politica', type: 'string' },
      { id: 'category', name: 'category', displayName: 'Categoria', type: 'string' },
      { id: 'version', name: 'version', displayName: 'Versione', type: 'string' },
      { id: 'effectiveDate', name: 'effectiveDate', displayName: 'Data Efficacia', type: 'date' },
      { id: 'content', name: 'content', displayName: 'Contenuto', type: 'string' }
    ]
  },
  {
    id: 'procedures',
    name: 'procedures',
    displayName: 'Procedure',
    fields: [
      { id: 'title', name: 'title', displayName: 'Titolo Procedura', type: 'string' },
      { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string' },
      { id: 'steps', name: 'steps', displayName: 'Passi', type: 'string' },
      { id: 'owner', name: 'owner', displayName: 'Responsabile', type: 'string' },
      { id: 'lastReview', name: 'lastReview', displayName: 'Ultima Revisione', type: 'date' }
    ]
  },
  {
    id: 'risks',
    name: 'risks',
    displayName: 'Rischi',
    fields: [
      { id: 'title', name: 'title', displayName: 'Titolo Rischio', type: 'string' },
      { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string' },
      { id: 'probability', name: 'probability', displayName: 'Probabilità', type: 'string' },
      { id: 'impact', name: 'impact', displayName: 'Impatto', type: 'string' },
      { id: 'mitigation', name: 'mitigation', displayName: 'Mitigazione', type: 'string' }
    ]
  },
  {
    id: 'controls',
    name: 'controls',
    displayName: 'Controlli',
    fields: [
      { id: 'title', name: 'title', displayName: 'Titolo Controllo', type: 'string' },
      { id: 'type', name: 'type', displayName: 'Tipo Controllo', type: 'string' },
      { id: 'frequency', name: 'frequency', displayName: 'Frequenza', type: 'string' },
      { id: 'responsible', name: 'responsible', displayName: 'Responsabile', type: 'string' },
      { id: 'lastExecution', name: 'lastExecution', displayName: 'Ultima Esecuzione', type: 'date' }
    ]
  },
  {
    id: 'assessments',
    name: 'assessments',
    displayName: 'Valutazioni',
    fields: [
      { id: 'title', name: 'title', displayName: 'Titolo Valutazione', type: 'string' },
      { id: 'type', name: 'type', displayName: 'Tipo Valutazione', type: 'string' },
      { id: 'date', name: 'date', displayName: 'Data Valutazione', type: 'date' },
      { id: 'assessor', name: 'assessor', displayName: 'Valutatore', type: 'string' },
      { id: 'score', name: 'score', displayName: 'Punteggio', type: 'number' }
    ]
  },
  {
    id: 'notifications',
    name: 'notifications',
    displayName: 'Notifiche',
    fields: [
      { id: 'title', name: 'title', displayName: 'Titolo', type: 'string' },
      { id: 'message', name: 'message', displayName: 'Messaggio', type: 'string' },
      { id: 'type', name: 'type', displayName: 'Tipo', type: 'string' },
      { id: 'date', name: 'date', displayName: 'Data', type: 'date' },
      { id: 'read', name: 'read', displayName: 'Letto', type: 'boolean' }
    ]
  },
  {
    id: 'reports',
    name: 'reports',
    displayName: 'Report',
    fields: [
      { id: 'title', name: 'title', displayName: 'Titolo Report', type: 'string' },
      { id: 'type', name: 'type', displayName: 'Tipo Report', type: 'string' },
      { id: 'generatedDate', name: 'generatedDate', displayName: 'Data Generazione', type: 'date' },
      { id: 'format', name: 'format', displayName: 'Formato', type: 'string' },
      { id: 'data', name: 'data', displayName: 'Dati', type: 'string', sensitive: true }
    ]
  },
  {
    id: 'analytics',
    name: 'analytics',
    displayName: 'Analytics',
    fields: [
      { id: 'metric', name: 'metric', displayName: 'Metrica', type: 'string' },
      { id: 'value', name: 'value', displayName: 'Valore', type: 'number' },
      { id: 'date', name: 'date', displayName: 'Data', type: 'date' },
      { id: 'category', name: 'category', displayName: 'Categoria', type: 'string' },
      { id: 'source', name: 'source', displayName: 'Fonte', type: 'string' }
    ]
  },
  {
    id: 'settings',
    name: 'settings',
    displayName: 'Impostazioni',
    fields: [
      { id: 'key', name: 'key', displayName: 'Chiave', type: 'string' },
      { id: 'value', name: 'value', displayName: 'Valore', type: 'string' },
      { id: 'category', name: 'category', displayName: 'Categoria', type: 'string' },
      { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string' },
      { id: 'isSystem', name: 'isSystem', displayName: 'Sistema', type: 'boolean' }
    ]
  },
  {
    id: 'logs',
    name: 'logs',
    displayName: 'Log di Sistema',
    fields: [
      { id: 'timestamp', name: 'timestamp', displayName: 'Timestamp', type: 'date' },
      { id: 'level', name: 'level', displayName: 'Livello', type: 'string' },
      { id: 'message', name: 'message', displayName: 'Messaggio', type: 'string' },
      { id: 'source', name: 'source', displayName: 'Fonte', type: 'string' },
      { id: 'userId', name: 'userId', displayName: 'ID Utente', type: 'string', sensitive: true }
    ]
  },
  {
    id: 'backups',
    name: 'backups',
    displayName: 'Backup',
    fields: [
      { id: 'name', name: 'name', displayName: 'Nome Backup', type: 'string' },
      { id: 'date', name: 'date', displayName: 'Data Backup', type: 'date' },
      { id: 'size', name: 'size', displayName: 'Dimensione', type: 'number' },
      { id: 'type', name: 'type', displayName: 'Tipo', type: 'string' },
      { id: 'status', name: 'status', displayName: 'Stato', type: 'string' }
    ]
  },
  {
    id: 'integrations',
    name: 'integrations',
    displayName: 'Integrazioni',
    fields: [
      { id: 'name', name: 'name', displayName: 'Nome Integrazione', type: 'string' },
      { id: 'type', name: 'type', displayName: 'Tipo', type: 'string' },
      { id: 'status', name: 'status', displayName: 'Stato', type: 'string' },
      { id: 'lastSync', name: 'lastSync', displayName: 'Ultima Sincronizzazione', type: 'date' },
      { id: 'config', name: 'config', displayName: 'Configurazione', type: 'string', sensitive: true }
    ]
  },
  {
    id: 'workflows',
    name: 'workflows',
    displayName: 'Flussi di Lavoro',
    fields: [
      { id: 'name', name: 'name', displayName: 'Nome Workflow', type: 'string' },
      { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string' },
      { id: 'status', name: 'status', displayName: 'Stato', type: 'string' },
      { id: 'steps', name: 'steps', displayName: 'Passi', type: 'string' },
      { id: 'owner', name: 'owner', displayName: 'Proprietario', type: 'string' }
    ]
  },
  {
    id: 'templates',
    name: 'templates',
    displayName: 'Template',
    fields: [
      { id: 'name', name: 'name', displayName: 'Nome Template', type: 'string' },
      { id: 'type', name: 'type', displayName: 'Tipo', type: 'string' },
      { id: 'content', name: 'content', displayName: 'Contenuto', type: 'string' },
      { id: 'version', name: 'version', displayName: 'Versione', type: 'string' },
      { id: 'lastModified', name: 'lastModified', displayName: 'Ultima Modifica', type: 'date' }
    ]
  },
  {
    id: 'form_templates',
    name: 'form_templates',
    displayName: 'Template Form',
    fields: [
      { id: 'name', name: 'name', displayName: 'Nome Template', type: 'string' },
      { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string' },
      { id: 'type', name: 'type', displayName: 'Tipo Form', type: 'string' },
      { id: 'schema', name: 'schema', displayName: 'Schema JSON', type: 'string' },
      { id: 'version', name: 'version', displayName: 'Versione', type: 'string' },
      { id: 'isActive', name: 'isActive', displayName: 'Attivo', type: 'boolean' },
      { id: 'requiresAuth', name: 'requiresAuth', displayName: 'Richiede Autenticazione', type: 'boolean' },
      { id: 'settings', name: 'settings', displayName: 'Impostazioni', type: 'string' }
    ]
  },
  {
    id: 'form_submissions',
    name: 'form_submissions',
    displayName: 'Risposte Form',
    fields: [
      { id: 'formData', name: 'formData', displayName: 'Dati Form', type: 'string', sensitive: true },
      { id: 'submittedAt', name: 'submittedAt', displayName: 'Data Invio', type: 'date' },
      { id: 'ipAddress', name: 'ipAddress', displayName: 'Indirizzo IP', type: 'string', sensitive: true },
      { id: 'userAgent', name: 'userAgent', displayName: 'User Agent', type: 'string' },
      { id: 'status', name: 'status', displayName: 'Stato', type: 'string' },
      { id: 'processedAt', name: 'processedAt', displayName: 'Data Elaborazione', type: 'date' }
    ]
  },
  {
    id: 'public_cms',
    name: 'public_cms',
    displayName: 'CMS Pubblico',
    fields: [
      { id: 'section', name: 'section', displayName: 'Sezione', type: 'string' },
      { id: 'title', name: 'title', displayName: 'Titolo', type: 'string' },
      { id: 'description', name: 'description', displayName: 'Descrizione', type: 'string' },
      { id: 'content', name: 'content', displayName: 'Contenuto', type: 'string' },
      { id: 'images', name: 'images', displayName: 'Immagini', type: 'string' },
      { id: 'metadata', name: 'metadata', displayName: 'Metadati', type: 'string' }
    ]
  }
];

/**
 * Combina tutte le definizioni delle entità
 */
export const ALL_ENTITY_DEFINITIONS: EntityDefinition[] = [
  ...STATIC_ENTITY_DEFINITIONS,
  ...EXTENDED_ENTITY_DEFINITIONS
];

/**
 * Entità critiche che devono essere sempre presenti
 */
export const CRITICAL_ENTITIES = ['form_templates', 'form_submissions', 'public_cms'];

/**
 * Verifica se un'entità è virtuale (basata su Person)
 */
export function isVirtualEntity(entityName: string): boolean {
  return ['employees', 'trainers'].includes(entityName.toLowerCase());
}

/**
 * Ottiene il nome dell'entità virtuale nel formato backend
 */
export function getVirtualEntityBackendName(entityName: string): 'EMPLOYEES' | 'TRAINERS' | null {
  const mapping: Record<string, 'EMPLOYEES' | 'TRAINERS'> = {
    'employees': 'EMPLOYEES',
    'trainers': 'TRAINERS'
  };
  return mapping[entityName.toLowerCase()] || null;
}