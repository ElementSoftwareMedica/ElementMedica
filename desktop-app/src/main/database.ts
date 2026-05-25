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

  // Performance & durability PRAGMAs
  db.pragma('journal_mode = WAL')       // Write-Ahead Log — concurrent reads + writes
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')     // Safe with WAL; much faster than FULL
  db.pragma('cache_size = -32000')      // 32 MB page cache
  db.pragma('mmap_size = 268435456')    // 256 MB memory-mapped I/O
  db.pragma('temp_store = MEMORY')      // Temp tables in RAM
  db.pragma('wal_autocheckpoint = 1000') // Checkpoint every ~4 MB (1000 × 4 KB pages)

  // Initialize schema
  initializeSchema(db)

  return db
}

export function closeDatabase(): void {
  if (db) {
    // PRAGMA optimize updates query-planner statistics — call before each close (per SQLite docs)
    try { db.pragma('optimize') } catch { /* best-effort */ }
    db.close()
    db = null
  }
}

export function getDatabasePath(): string {
  return DB_PATH
}

function initializeSchema(database: Database.Database): void {
  // ── Pre-flight migrations ──────────────────────────────────────────────────
  // These MUST run before the main schema exec below. The tryAlter() block at the
  // bottom runs too late: the FTS rebuild already reads patients.companyName by then.
  // Safe to call even before patients table exists (catch silences "no such table").
  const preMigrate = (sql: string) => { try { database.exec(sql) } catch { /* column exists or table not yet created */ } }
  preMigrate('ALTER TABLE patients ADD COLUMN companyName TEXT')

  // visits: denormalized display columns added after initial schema deployment
  preMigrate('ALTER TABLE visits ADD COLUMN personFirstName TEXT')
  preMigrate('ALTER TABLE visits ADD COLUMN personLastName TEXT')
  preMigrate('ALTER TABLE visits ADD COLUMN personTaxCode TEXT')
  preMigrate('ALTER TABLE visits ADD COLUMN medicoFirstName TEXT')
  preMigrate('ALTER TABLE visits ADD COLUMN medicoLastName TEXT')
  preMigrate('ALTER TABLE visits ADD COLUMN medicoRefertanteId TEXT')
  preMigrate('ALTER TABLE visits ADD COLUMN medicoRefertanteFirstName TEXT')
  preMigrate('ALTER TABLE visits ADD COLUMN medicoRefertanteLastName TEXT')
  preMigrate('ALTER TABLE visits ADD COLUMN companyName TEXT')
  preMigrate('ALTER TABLE visits ADD COLUMN prestazioneId TEXT')
  preMigrate('ALTER TABLE visits ADD COLUMN prestazioneNome TEXT')
  preMigrate('ALTER TABLE visits ADD COLUMN prestazioneCodice TEXT')
  preMigrate('ALTER TABLE visits ADD COLUMN isMDL INTEGER DEFAULT 0')

  // appointments: denormalized display columns added after initial schema deployment
  preMigrate('ALTER TABLE appointments ADD COLUMN personFirstName TEXT')
  preMigrate('ALTER TABLE appointments ADD COLUMN personLastName TEXT')
  preMigrate('ALTER TABLE appointments ADD COLUMN personTaxCode TEXT')
  preMigrate('ALTER TABLE appointments ADD COLUMN medicoFirstName TEXT')
  preMigrate('ALTER TABLE appointments ADD COLUMN medicoLastName TEXT')
  preMigrate('ALTER TABLE appointments ADD COLUMN companyName TEXT')
  preMigrate('ALTER TABLE appointments ADD COLUMN prestazioneId TEXT')
  preMigrate('ALTER TABLE appointments ADD COLUMN prestazioneNome TEXT')
  preMigrate('ALTER TABLE appointments ADD COLUMN prestazioneCodice TEXT')
  preMigrate('ALTER TABLE appointments ADD COLUMN ambulatorioNome TEXT')
  preMigrate('ALTER TABLE appointments ADD COLUMN noteInterne TEXT')

  // companies: MDL assignment fields synced from webapp when available.
  preMigrate('ALTER TABLE companies ADD COLUMN medicoCompetenteId TEXT')
  preMigrate('ALTER TABLE companies ADD COLUMN medicoCompetenteNome TEXT')
  preMigrate('ALTER TABLE companies ADD COLUMN mediciCoordinati TEXT DEFAULT "[]"')
  preMigrate('ALTER TABLE companies ADD COLUMN medicoSuccessoreId TEXT')
  preMigrate('ALTER TABLE companies ADD COLUMN medicoSuccessoreNome TEXT')
  preMigrate('ALTER TABLE companies ADD COLUMN ultimoSopralluogo TEXT')
  preMigrate('ALTER TABLE companies ADD COLUMN prossimoSopralluogo TEXT')
  preMigrate('ALTER TABLE companies ADD COLUMN dvr TEXT')
  preMigrate('ALTER TABLE company_sites ADD COLUMN medicoCompetenteId TEXT')

  // prestazioni: columns added after initial schema deployment
  preMigrate('ALTER TABLE prestazioni ADD COLUMN tipo TEXT')
  preMigrate('ALTER TABLE prestazioni ADD COLUMN categoria TEXT')
  preMigrate('ALTER TABLE prestazioni ADD COLUMN branchType TEXT')
  preMigrate('ALTER TABLE prestazioni ADD COLUMN ivaAliquota REAL')
  preMigrate('ALTER TABLE prestazioni ADD COLUMN scadenzaDefaultMesi INTEGER')
  preMigrate('ALTER TABLE prestazioni ADD COLUMN durataPrevista INTEGER')
  preMigrate('ALTER TABLE prestazioni ADD COLUMN prezzoBase REAL DEFAULT 0')
  preMigrate('ALTER TABLE prestazioni ADD COLUMN attivo INTEGER DEFAULT 1')

  // mansioni: columns added after initial schema deployment
  preMigrate('ALTER TABLE mansioni ADD COLUMN companyName TEXT')
  preMigrate('ALTER TABLE mansioni ADD COLUMN isActive INTEGER DEFAULT 1')
  preMigrate('ALTER TABLE mansioni ADD COLUMN rischi TEXT DEFAULT "[]"')
  preMigrate('ALTER TABLE mansioni ADD COLUMN rischiAssociati TEXT DEFAULT "[]"')

  // lavoratore_mansioni: tenantId added after initial schema deployment
  preMigrate('ALTER TABLE lavoratore_mansioni ADD COLUMN tenantId TEXT')

  // protocolli: mansioneNome and prestazioni were added to the CREATE TABLE after some DBs
  // were already created (initial schema had only id/_sync/tenantId/nome/descrizione/
  // mansioneId/companyTenantProfileId/isActive). Both columns are written by storeDayData
  // section 13 → INSERT OR REPLACE fails with "no such column" on old schemas.
  preMigrate('ALTER TABLE protocolli ADD COLUMN mansioneNome TEXT')
  preMigrate('ALTER TABLE protocolli ADD COLUMN prestazioni TEXT DEFAULT "[]"')

  // convenzioni: isActive is written by storeDayData section 17 but was not always present
  // in the original CREATE TABLE (attiva was the primary flag; isActive added later as alias).
  preMigrate('ALTER TABLE convenzioni ADD COLUMN isActive INTEGER DEFAULT 1')

  // lavoratore_rischi_aggiuntivi: multiple columns added after initial schema deployment
  // tenantId, rischioId, codiceRischio, livello, categoria, descrizioneEsposizione,
  // fonteRischio, periodicitaMesi, note, sourceMansioneId were all added progressively.
  // preMigrate is idempotent (catch silences "duplicate column" errors).
  preMigrate('ALTER TABLE lavoratore_rischi_aggiuntivi ADD COLUMN tenantId TEXT')
  preMigrate('ALTER TABLE lavoratore_rischi_aggiuntivi ADD COLUMN rischioId TEXT')
  // Some old DB schemas had rischioId TEXT NOT NULL — patch existing NULL rows to '' so
  // future INSERTs and the SELECT below don't violate the constraint on those DBs.
  preMigrate("UPDATE lavoratore_rischi_aggiuntivi SET rischioId = '' WHERE rischioId IS NULL")
  preMigrate('ALTER TABLE lavoratore_rischi_aggiuntivi ADD COLUMN codiceRischio TEXT')
  preMigrate('ALTER TABLE lavoratore_rischi_aggiuntivi ADD COLUMN livello TEXT DEFAULT "MEDIO"')
  preMigrate('ALTER TABLE lavoratore_rischi_aggiuntivi ADD COLUMN categoria TEXT')
  preMigrate('ALTER TABLE lavoratore_rischi_aggiuntivi ADD COLUMN descrizioneEsposizione TEXT')
  preMigrate('ALTER TABLE lavoratore_rischi_aggiuntivi ADD COLUMN fonteRischio TEXT')
  preMigrate('ALTER TABLE lavoratore_rischi_aggiuntivi ADD COLUMN periodicitaMesi INTEGER')
  preMigrate('ALTER TABLE lavoratore_rischi_aggiuntivi ADD COLUMN note TEXT')
  preMigrate('ALTER TABLE lavoratore_rischi_aggiuntivi ADD COLUMN sourceMansioneId TEXT')
  preMigrate('ALTER TABLE lavoratore_rischi_aggiuntivi ADD COLUMN deletedAt TEXT')

  // scadenze: denormalized columns added after initial schema deployment
  preMigrate('ALTER TABLE scadenze ADD COLUMN personFirstName TEXT')
  preMigrate('ALTER TABLE scadenze ADD COLUMN personLastName TEXT')
  preMigrate('ALTER TABLE scadenze ADD COLUMN prestazioneNome TEXT')
  preMigrate('ALTER TABLE scadenze ADD COLUMN mansione TEXT')
  preMigrate('ALTER TABLE scadenze ADD COLUMN companyName TEXT')
  preMigrate('ALTER TABLE scadenze ADD COLUMN stato TEXT')

  // visit_templates: medicoId and prestazioneId added after initial schema deployment
  preMigrate('ALTER TABLE visit_templates ADD COLUMN medicoId TEXT')
  preMigrate('ALTER TABLE visit_templates ADD COLUMN prestazioneId TEXT')
  preMigrate('ALTER TABLE visit_templates ADD COLUMN sidebarConfig TEXT')
  preMigrate('ALTER TABLE document_templates ADD COLUMN codice TEXT')
  preMigrate('ALTER TABLE document_templates ADD COLUMN fase TEXT')
  preMigrate('ALTER TABLE document_templates ADD COLUMN campi TEXT DEFAULT "[]"')
  preMigrate('ALTER TABLE document_templates ADD COLUMN contenutoHtml TEXT')
  preMigrate('ALTER TABLE document_templates ADD COLUMN richiedeFirma INTEGER DEFAULT 0')
  preMigrate('ALTER TABLE document_templates ADD COLUMN richiedeFirmaMedico INTEGER DEFAULT 0')
  preMigrate('ALTER TABLE document_templates ADD COLUMN questionarioConfig TEXT DEFAULT "{}"')
  preMigrate('ALTER TABLE movimenti_contabili ADD COLUMN appuntamentoId TEXT')
  preMigrate('ALTER TABLE allegati ADD COLUMN companyTenantProfileId TEXT')

  // ambulatori: columns added after initial schema deployment
  preMigrate('ALTER TABLE ambulatori ADD COLUMN codice TEXT')
  preMigrate('ALTER TABLE ambulatori ADD COLUMN specializzazione TEXT')
  preMigrate('ALTER TABLE ambulatori ADD COLUMN colore TEXT')
  preMigrate('ALTER TABLE ambulatori ADD COLUMN isEsterno INTEGER DEFAULT 0')
  preMigrate('ALTER TABLE ambulatori ADD COLUMN stato TEXT DEFAULT "ATTIVO"')

  // If patients_fts was built with an old schema (missing companyName), drop it so
  // the CREATE VIRTUAL TABLE below recreates it with the correct column list.
  const oldFts = database.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='patients_fts'"
  ).get() as { sql: string } | undefined
  if (oldFts && !oldFts.sql?.includes('companyName')) {
    database.exec(`
      DROP TABLE IF EXISTS patients_fts;
      DROP TRIGGER IF EXISTS patients_fts_insert;
      DROP TRIGGER IF EXISTS patients_fts_update;
      DROP TRIGGER IF EXISTS patients_fts_delete;
    `)
  }
  // ──────────────────────────────────────────────────────────────────────────

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
      medicoRefertanteId TEXT,
      ambulatorioId TEXT,
      prestazioneId TEXT,

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
      medicoRefertanteFirstName TEXT,
      medicoRefertanteLastName TEXT,
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
      prestazioneId TEXT,

      dataOra TEXT NOT NULL,
      durata INTEGER DEFAULT 30,
      durataPrevista INTEGER,
      tipo TEXT,
      stato TEXT DEFAULT 'CONFERMATO',
      note TEXT,
      noteInterne TEXT,

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
      protocolloSanitarioId TEXT,

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
      medicoCompetenteId TEXT,
      medicoCompetenteNome TEXT,
      mediciCoordinati TEXT DEFAULT '[]',
      medicoSuccessoreId TEXT,
      medicoSuccessoreNome TEXT,
      ultimoSopralluogo TEXT,
      prossimoSopralluogo TEXT,
      dvr TEXT,

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

      tenantId TEXT,
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
      appuntamentoId TEXT,
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
      codice TEXT,
      nome TEXT,
      descrizione TEXT,
      attivo INTEGER DEFAULT 1,
      validoDa TEXT,
      validoA TEXT,

      voci TEXT DEFAULT '[]',
      companyAssociations TEXT DEFAULT '[]',

      isDefault INTEGER DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tariffari_tenant ON tariffari(tenantId, _isDeleted);

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
      codice TEXT,
      nome TEXT NOT NULL,
      tipo TEXT,
      descrizione TEXT,
      enteTerzo TEXT,
      branchType TEXT DEFAULT 'MEDICA',
      dataInizio TEXT,
      dataFine TEXT,
      attiva INTEGER DEFAULT 1,
      isActive INTEGER DEFAULT 1,
      condizioni TEXT DEFAULT '{}',

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_convenzioni_tenant ON convenzioni(tenantId, _isDeleted);

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
      sidebarConfig TEXT,
      isDefault INTEGER DEFAULT 0,
      medicoId TEXT,
      prestazioneId TEXT,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS document_templates (
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
      tipo TEXT,
      fase TEXT,
      campi TEXT DEFAULT '[]',
      contenutoHtml TEXT,
      richiedeFirma INTEGER DEFAULT 0,
      richiedeFirmaMedico INTEGER DEFAULT 0,
      questionarioConfig TEXT DEFAULT '{}',
      isActive INTEGER DEFAULT 1,
      ordine INTEGER DEFAULT 0,

      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS medici (
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
      gender TEXT,
      taxCode TEXT,
      email TEXT,
      phone TEXT,
      status TEXT,
      specialties TEXT DEFAULT '[]',

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
      companyTenantProfileId TEXT,
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
      tenantId TEXT,
      rischioId TEXT,
      codiceRischio TEXT,
      livello TEXT DEFAULT 'MEDIO',
      categoria TEXT,
      descrizioneEsposizione TEXT,
      fonteRischio TEXT,
      periodicitaMesi INTEGER,
      note TEXT,
      sourceMansioneId TEXT,

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

    -- =============================================
    -- GDPR AUDIT LOG (RGPD Art. 30 / D.Lgs. 196/2003)
    -- Captures every deletion of personal data (PII), offline or online.
    -- Mandatory for GDPR compliance: right to erasure audit trail.
    -- =============================================

    CREATE TABLE IF NOT EXISTS gdpr_audit_log (
      id TEXT PRIMARY KEY,
      resourceType TEXT NOT NULL,        -- 'patients', 'visits', etc.
      resourceId TEXT NOT NULL,          -- ID of the deleted/accessed record
      action TEXT NOT NULL,              -- 'DELETE', 'ACCESS', 'EXPORT', 'FSE_CONSENT'
      deletionReason TEXT,               -- Reason for deletion (min 10 chars for DELETE)
      performedBy TEXT,                  -- tenantId or userId performing the action
      performedAt TEXT NOT NULL,         -- ISO timestamp
      tenantId TEXT,
      dataAccessed TEXT DEFAULT '[]',    -- List of PII fields affected
      metadata TEXT DEFAULT '{}',        -- Additional context (e.g. FSE document ID)
      synced INTEGER NOT NULL DEFAULT 0, -- 0 = pending server sync, 1 = synced
      syncedAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_gdpr_audit_resource ON gdpr_audit_log(resourceType, resourceId);
    CREATE INDEX IF NOT EXISTS idx_gdpr_audit_tenant ON gdpr_audit_log(tenantId, performedAt);
    CREATE INDEX IF NOT EXISTS idx_gdpr_audit_unsynced ON gdpr_audit_log(synced) WHERE synced = 0;

    -- =============================================
    -- FTS5 — FULL TEXT SEARCH (patients)
    -- =============================================

    CREATE VIRTUAL TABLE IF NOT EXISTS patients_fts USING fts5(
      id UNINDEXED,
      tenantId UNINDEXED,
      firstName,
      lastName,
      taxCode,
      email,
      phone,
      companyName,
      content='patients',
      content_rowid='rowid'
    );

    -- Trigger: keep FTS in sync on INSERT
    CREATE TRIGGER IF NOT EXISTS patients_fts_insert AFTER INSERT ON patients BEGIN
      INSERT OR REPLACE INTO patients_fts(rowid, id, tenantId, firstName, lastName, taxCode, email, phone, companyName)
      VALUES (new.rowid, new.id, new.tenantId, new.firstName, new.lastName, new.taxCode, new.email, new.phone, new.companyName);
    END;

    -- Trigger: keep FTS in sync on UPDATE
    CREATE TRIGGER IF NOT EXISTS patients_fts_update AFTER UPDATE ON patients BEGIN
      DELETE FROM patients_fts WHERE rowid = old.rowid;
      INSERT OR REPLACE INTO patients_fts(rowid, id, tenantId, firstName, lastName, taxCode, email, phone, companyName)
      VALUES (new.rowid, new.id, new.tenantId, new.firstName, new.lastName, new.taxCode, new.email, new.phone, new.companyName);
    END;

    -- Trigger: keep FTS in sync on DELETE
    CREATE TRIGGER IF NOT EXISTS patients_fts_delete AFTER DELETE ON patients BEGIN
      DELETE FROM patients_fts WHERE rowid = old.rowid;
    END;
  `)

  // Rebuild FTS index if empty (handles first run after adding FTS to existing DB)
  const ftsCount = (database.prepare('SELECT COUNT(*) as n FROM patients_fts').get() as { n: number }).n
  const patientsCount = (database.prepare('SELECT COUNT(*) as n FROM patients').get() as { n: number }).n
  if (ftsCount === 0 && patientsCount > 0) {
    database.exec(`INSERT INTO patients_fts(patients_fts) VALUES('rebuild')`)
  }

  // -------------------------------------------------------
  // Schema migrations for existing databases (idempotent)
  // SQLite doesn't support ADD COLUMN IF NOT EXISTS, use try/catch
  // -------------------------------------------------------
  const tryAlter = (sql: string) => {
    try { database.exec(sql) } catch { /* column already exists */ }
  }
  // tariffari: new columns added in session 9
  tryAlter(`ALTER TABLE tariffari ADD COLUMN codice TEXT`)
  tryAlter(`ALTER TABLE tariffari ADD COLUMN attivo INTEGER DEFAULT 1`)
  tryAlter(`ALTER TABLE tariffari ADD COLUMN validoDa TEXT`)
  tryAlter(`ALTER TABLE tariffari ADD COLUMN validoA TEXT`)
  tryAlter(`ALTER TABLE tariffari ADD COLUMN companyAssociations TEXT DEFAULT '[]'`)
  // convenzioni: new columns added in session 9
  tryAlter(`ALTER TABLE convenzioni ADD COLUMN codice TEXT`)
  tryAlter(`ALTER TABLE convenzioni ADD COLUMN tipo TEXT`)
  tryAlter(`ALTER TABLE convenzioni ADD COLUMN descrizione TEXT`)
  tryAlter(`ALTER TABLE convenzioni ADD COLUMN enteTerzo TEXT`)
  tryAlter(`ALTER TABLE convenzioni ADD COLUMN branchType TEXT DEFAULT 'MEDICA'`)
  tryAlter(`ALTER TABLE convenzioni ADD COLUMN attiva INTEGER DEFAULT 1`)
  // patients: companyName (denormalized) + protocolloSanitarioId added
  tryAlter(`ALTER TABLE patients ADD COLUMN companyName TEXT`)
  tryAlter(`ALTER TABLE patients ADD COLUMN protocolloSanitarioId TEXT`)

  // ── FSE 2.0 (Fascicolo Sanitario Elettronico) fields ── S25
  // patients: FSE consent tracking
  tryAlter(`ALTER TABLE patients ADD COLUMN fseConsent INTEGER DEFAULT 0`)
  tryAlter(`ALTER TABLE patients ADD COLUMN fseConsentDate TEXT`)
  tryAlter(`ALTER TABLE patients ADD COLUMN fseOptOut INTEGER DEFAULT 0`)
  // visits: FSE submission metadata + diagnostic codes for FHIR R4
  tryAlter(`ALTER TABLE visits ADD COLUMN prestazioneId TEXT`)
  tryAlter(`ALTER TABLE visits ADD COLUMN medicoRefertanteId TEXT`)
  tryAlter(`ALTER TABLE visits ADD COLUMN medicoRefertanteFirstName TEXT`)
  tryAlter(`ALTER TABLE visits ADD COLUMN medicoRefertanteLastName TEXT`)
  tryAlter(`ALTER TABLE visit_templates ADD COLUMN sidebarConfig TEXT`)
  tryAlter(`ALTER TABLE visits ADD COLUMN codiceICD10 TEXT`)
  tryAlter(`ALTER TABLE visits ADD COLUMN codiceICPC2 TEXT`)
  tryAlter(`ALTER TABLE visits ADD COLUMN fseInviato INTEGER DEFAULT 0`)
  tryAlter(`ALTER TABLE visits ADD COLUMN fseDocumentId TEXT`)
  tryAlter(`ALTER TABLE visits ADD COLUMN fseInviatoAt TEXT`)
}
