import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db: Database.Database | null = null

const DB_DIR = join(app.getPath('userData'), 'data')
const DB_PATH = join(DB_DIR, 'elementmedica.db')

export function getDatabase(): Database.Database {
  if (db) return db

  // Ensure data directory exists
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true })
  }

  db = new Database(DB_PATH)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Initialize schema
  initializeSchema(db)

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function getDatabasePath(): string {
  return DB_PATH
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    -- =============================================
    -- SYNC INFRASTRUCTURE
    -- =============================================

    CREATE TABLE IF NOT EXISTS operations_queue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('CREATE', 'UPDATE', 'DELETE')),
      entity TEXT NOT NULL,
      entityId TEXT NOT NULL,
      localId TEXT,
      payload TEXT NOT NULL DEFAULT '{}',
      dependsOn TEXT NOT NULL DEFAULT '[]',
      timestamp TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SYNCING', 'SYNCED', 'CONFLICT', 'FAILED')),
      retryCount INTEGER NOT NULL DEFAULT 0,
      conflictData TEXT,
      errorMessage TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_ops_queue_status ON operations_queue(status);
    CREATE INDEX IF NOT EXISTS idx_ops_queue_entity ON operations_queue(entity, entityId);

    CREATE TABLE IF NOT EXISTS sync_log (
      id TEXT PRIMARY KEY,
      syncSessionId TEXT NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('DOWNLOAD', 'UPLOAD')),
      entityType TEXT,
      entityCount INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'SUCCESS',
      errorMessage TEXT,
      startedAt TEXT NOT NULL,
      completedAt TEXT,
      metadata TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    -- =============================================
    -- CLINICAL ENTITIES (Mirror Prisma)
    -- =============================================

    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      personId TEXT,
      appuntamentoId TEXT,
      medicoId TEXT,
      ambulatorioId TEXT,

      stato TEXT DEFAULT 'INIZIATA',
      tipo TEXT,
      tipoVisitaMDL TEXT,

      dataOra TEXT,
      dataInizio TEXT,
      dataFine TEXT,
      durataMinuti INTEGER,

      motivoVisita TEXT,
      anamnesi TEXT,
      esameObiettivo TEXT,
      diagnosi TEXT,
      terapia TEXT,
      noteInterne TEXT,
      notePazienti TEXT,

      datiStrutturati TEXT DEFAULT '{}',
      templateId TEXT,

      totaleCosto REAL DEFAULT 0,
      spiReadings TEXT DEFAULT '[]',

      firmaMedico TEXT,
      firmaPaziente TEXT,
      firmaTimestamp TEXT,

      -- Denormalized fields for offline display
      personFirstName TEXT,
      personLastName TEXT,
      personTaxCode TEXT,
      medicoFirstName TEXT,
      medicoLastName TEXT,
      companyName TEXT,
      prestazioneNome TEXT,
      prestazioneCodice TEXT,
      isMDL INTEGER DEFAULT 0,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_visits_tenant ON visits(tenantId, _isDeleted);
    CREATE INDEX IF NOT EXISTS idx_visits_person ON visits(personId);
    CREATE INDEX IF NOT EXISTS idx_visits_appuntamento ON visits(appuntamentoId);
    CREATE INDEX IF NOT EXISTS idx_visits_sync ON visits(_syncStatus);

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      personId TEXT,
      medicoId TEXT,
      ambulatorioId TEXT,

      dataOra TEXT NOT NULL,
      durata INTEGER DEFAULT 30,
      durataPrevista INTEGER,
      tipo TEXT,
      stato TEXT DEFAULT 'CONFERMATO',
      note TEXT,

      companyTenantProfileId TEXT,
      siteId TEXT,

      -- Denormalized fields for offline display
      personFirstName TEXT,
      personLastName TEXT,
      personTaxCode TEXT,
      medicoFirstName TEXT,
      medicoLastName TEXT,
      companyName TEXT,
      prestazioneNome TEXT,
      prestazioneCodice TEXT,
      ambulatorioNome TEXT,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenantId, _isDeleted);
    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(dataOra);

    CREATE TABLE IF NOT EXISTS appointment_prestazioni (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      appuntamentoId TEXT NOT NULL,
      prestazioneId TEXT NOT NULL,
      prezzo REAL,
      quantita INTEGER DEFAULT 1,
      note TEXT,

      FOREIGN KEY (appuntamentoId) REFERENCES appointments(id),
      FOREIGN KEY (prestazioneId) REFERENCES prestazioni(id)
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      firstName TEXT,
      lastName TEXT,
      taxCode TEXT,
      birthDate TEXT,
      birthPlace TEXT,
      gender TEXT,

      email TEXT,
      phone TEXT,
      status TEXT DEFAULT 'ACTIVE',
      title TEXT,

      residenceAddress TEXT,
      residenceCity TEXT,
      postalCode TEXT,
      province TEXT,

      companyTenantProfileId TEXT,
      siteId TEXT,
      repartoId TEXT,

      profileImage TEXT,
      gdprConsentDate TEXT,

      -- Denormalized field for offline display
      companyName TEXT,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_patients_tenant ON patients(tenantId, _isDeleted);
    CREATE INDEX IF NOT EXISTS idx_patients_taxcode ON patients(taxCode);
    CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(lastName, firstName);

    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      ragioneSociale TEXT NOT NULL,
      piva TEXT,
      codiceFiscale TEXT,
      codiceAteco TEXT,
      settore TEXT,

      sedeLegaleIndirizzo TEXT,
      sedeLegaleCitta TEXT,
      sedeLegaleCap TEXT,
      sedeLegaleProvincia TEXT,

      emailGenerale TEXT,
      telefonoGenerale TEXT,
      pec TEXT,
      sdi TEXT,

      status TEXT DEFAULT 'ACTIVE',
      isActive INTEGER DEFAULT 1,

      referenteId TEXT,
      referenteRuolo TEXT,

      noteCommerciali TEXT,
      noteOperative TEXT,
      noteInterne TEXT,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_companies_tenant ON companies(tenantId, _isDeleted);
    CREATE INDEX IF NOT EXISTS idx_companies_piva ON companies(piva);

    CREATE TABLE IF NOT EXISTS company_sites (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      companyTenantProfileId TEXT NOT NULL,
      siteName TEXT,
      indirizzo TEXT,
      citta TEXT,
      cap TEXT,
      provincia TEXT,

      rsppId TEXT,
      medicoCompetenteId TEXT,
      referenteId TEXT,

      dvr TEXT,
      ultimoSopralluogo TEXT,
      prossimoSopralluogo TEXT,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT,

      FOREIGN KEY (companyTenantProfileId) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS mansioni (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      nome TEXT NOT NULL,
      descrizione TEXT,
      codice TEXT,
      companyTenantProfileId TEXT,
      siteId TEXT,

      rischiAssociati TEXT DEFAULT '[]',
      rischi TEXT DEFAULT '[]',
      companyName TEXT,
      isActive INTEGER DEFAULT 1,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_mansioni_tenant ON mansioni(tenantId, _isDeleted);

    CREATE TABLE IF NOT EXISTS lavoratore_mansioni (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      personId TEXT NOT NULL,
      mansioneId TEXT NOT NULL,
      dataInizio TEXT,
      dataFine TEXT,
      isPrimary INTEGER DEFAULT 0,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT,

      FOREIGN KEY (personId) REFERENCES patients(id),
      FOREIGN KEY (mansioneId) REFERENCES mansioni(id)
    );

    CREATE TABLE IF NOT EXISTS protocolli (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      nome TEXT NOT NULL,
      descrizione TEXT,
      mansioneId TEXT,
      companyTenantProfileId TEXT,

      prestazioni TEXT DEFAULT '[]',
      mansioneNome TEXT,

      isActive INTEGER DEFAULT 1,
      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_protocolli_tenant ON protocolli(tenantId, _isDeleted);

    CREATE TABLE IF NOT EXISTS scadenze (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      personId TEXT NOT NULL,
      prestazioneId TEXT NOT NULL,
      mansioneId TEXT,
      protocolloId TEXT,

      dataScadenza TEXT,
      periodicitaMesi INTEGER,
      eseguita INTEGER DEFAULT 0,
      dataEsecuzione TEXT,
      visitaId TEXT,
      isPrimaVisita INTEGER DEFAULT 0,

      -- Denormalized fields for offline display
      personFirstName TEXT,
      personLastName TEXT,
      prestazioneNome TEXT,
      mansione TEXT,
      companyName TEXT,
      stato TEXT,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_scadenze_tenant ON scadenze(tenantId, _isDeleted);
    CREATE INDEX IF NOT EXISTS idx_scadenze_person ON scadenze(personId);

    CREATE TABLE IF NOT EXISTS giudizi_idoneita (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      personId TEXT NOT NULL,
      visitaId TEXT,
      medicoId TEXT,

      tipo TEXT,
      esito TEXT,
      limitazioni TEXT,
      prescrizioni TEXT,
      dataEmissione TEXT,
      dataScadenza TEXT,
      note TEXT,

      firmaMedico TEXT,
      protocolloNumero TEXT,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_giudizi_tenant ON giudizi_idoneita(tenantId, _isDeleted);
    CREATE INDEX IF NOT EXISTS idx_giudizi_person ON giudizi_idoneita(personId);

    CREATE TABLE IF NOT EXISTS movimenti_contabili (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      visitaId TEXT,
      personId TEXT,
      companyTenantProfileId TEXT,

      tipo TEXT,
      descrizione TEXT,
      importo REAL DEFAULT 0,
      iva REAL DEFAULT 0,
      importoNetto REAL DEFAULT 0,
      stato TEXT DEFAULT 'BOZZA',

      dataMovimento TEXT,
      dataScadenza TEXT,
      dataPagamento TEXT,

      metodoPagamento TEXT,
      riferimentoFattura TEXT,
      note TEXT,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_movimenti_tenant ON movimenti_contabili(tenantId, _isDeleted);
    CREATE INDEX IF NOT EXISTS idx_movimenti_visita ON movimenti_contabili(visitaId);

    CREATE TABLE IF NOT EXISTS prestazioni (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      nome TEXT NOT NULL,
      codice TEXT,
      categoria TEXT,
      tipo TEXT,
      prezzoBase REAL DEFAULT 0,
      durataPrevista INTEGER,
      descrizione TEXT,
      ivaAliquota REAL,
      scadenzaDefaultMesi INTEGER,
      branchType TEXT,
      attivo INTEGER DEFAULT 1,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_prestazioni_tenant ON prestazioni(tenantId, _isDeleted);

    CREATE TABLE IF NOT EXISTS tariffari (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      companyTenantProfileId TEXT,
      nome TEXT,
      descrizione TEXT,

      voci TEXT DEFAULT '[]',

      isDefault INTEGER DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS convenzioni (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      nome TEXT NOT NULL,
      descrizione TEXT,
      companyTenantProfileId TEXT,
      dataInizio TEXT,
      dataFine TEXT,
      isActive INTEGER DEFAULT 1,
      condizioni TEXT DEFAULT '{}',

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS ambulatori (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      codice TEXT,
      nome TEXT NOT NULL,
      specializzazione TEXT,
      colore TEXT,
      isEsterno INTEGER DEFAULT 0,
      stato TEXT DEFAULT 'ATTIVO',

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS visit_templates (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      nome TEXT NOT NULL,
      tipo TEXT,
      fields TEXT DEFAULT '[]',
      isDefault INTEGER DEFAULT 0,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS esami_strumentali (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      visitaId TEXT,
      personId TEXT,
      tipo TEXT NOT NULL,
      risultato TEXT,
      valori TEXT DEFAULT '{}',
      dataEsame TEXT,
      note TEXT,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT,

      FOREIGN KEY (visitaId) REFERENCES visits(id)
    );

    CREATE TABLE IF NOT EXISTS allegati (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      visitaId TEXT,
      nome TEXT NOT NULL,
      tipo TEXT,
      dimensione INTEGER,
      localPath TEXT,
      serverUrl TEXT,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT,

      FOREIGN KEY (visitaId) REFERENCES visits(id)
    );

    CREATE TABLE IF NOT EXISTS questionari_compilati (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      tenantId TEXT NOT NULL,
      visitaId TEXT,
      personId TEXT,
      templateId TEXT,
      risposte TEXT DEFAULT '{}',
      dataCompilazione TEXT,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS lavoratore_rischi_aggiuntivi (
      id TEXT PRIMARY KEY,
      _localId TEXT NOT NULL,
      _serverId TEXT,
      _syncStatus TEXT NOT NULL DEFAULT 'SYNCED',
      _lastSyncAt TEXT,
      _localUpdatedAt TEXT NOT NULL,
      _isDeleted INTEGER NOT NULL DEFAULT 0,
      _version INTEGER NOT NULL DEFAULT 1,

      personId TEXT NOT NULL,
      rischioId TEXT NOT NULL,
      livello TEXT,
      note TEXT,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT,

      FOREIGN KEY (personId) REFERENCES patients(id)
    );

    -- =============================================
    -- AUDIT TRAIL (GDPR)
    -- =============================================

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entityId TEXT NOT NULL,
      personId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      changes TEXT DEFAULT '{}',
      isOffline INTEGER NOT NULL DEFAULT 1,
      syncedAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entityId);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
  `)
}
