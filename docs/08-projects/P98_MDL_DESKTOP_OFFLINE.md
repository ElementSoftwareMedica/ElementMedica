# P98 - Applicazione Desktop MDL Offline-First

**Stato**: 🟡 Implementazione avanzata / QA desktop  
**Data**: 2 Aprile 2026  
**Ultimo aggiornamento**: 24 maggio 2026  
**Versione**: v0.2 (desktop 0.1.15 validata localmente)  
**Priorità**: Alta  
**Dipendenze**: P52, P55, P56, P66, P67, P72

---

## Aggiornamento operativo - 24 maggio 2026

### Stato completamento P98

| Workstream | Stato | Note |
|------------|-------|------|
| Shell Electron + build/update | Fatto | Build desktop 0.1.15 presente; rilascio non eseguito in questa sessione |
| Login/licenza/heartbeat | Fatto | Route heartbeat prod verificata: `401` senza token, quindi endpoint presente |
| SQLite offline + IPC | Fatto | Test E2E su IPC, sync queue e DB locale |
| Sync bidirezionale | In QA | Rafforzata create offline con UUID stabile; servono test con backend autenticato reale |
| Visite MDL offline | In QA | Apertura/compilazione/completamento coperte da build/typecheck; flussi complessi da validare con dati reali |
| Aziende/dipendenti/protocolli | In QA | Tab sicurezza desktop integrato; protocolli normalizzati |
| Permessi desktop | In QA | Hook stabilizzato; test manuale richiesto per profili non admin |
| Packaging | Fatto | Cartella ripulita da artefatti duplicati; mantenuti installer 0.1.15 versionati |

### Pulizia desktop-app

| Area | Prima | Dopo | Azione |
|------|-------|------|--------|
| `desktop-app` | 4.4G | 1.8G | Rimossi artefatti rigenerabili |
| `desktop-app/release` | 3.5G | 842M | Rimossi unpacked build e alias `latest-*` duplicati |
| `desktop-app/node_modules` | 844M | 844M | Non rimosso: necessario per build/test locali |

File rimossi: `release/*unpacked`, `release/mac*`, duplicati `release/ElementMedica-Desktop-latest-*`, `playwright-report`, `test-results`, `logs`, `.DS_Store`.

### Correzioni implementate

| Area | Intervento | Esito |
|------|------------|-------|
| Licenze desktop | Verificato `/api/v1/desktop-licenses/heartbeat` su `www.elementmedica.com`: la route risponde `401` senza token, quindi non è più 404 quando il backend è allineato | Endpoint presente |
| Nuova visita non programmata | Filtrate le prestazioni in base ai template del medico, aggiunta search bar, ordinamento alfabetico e obbligo di selezione prestazione prima dell'avvio | Flusso più sicuro |
| Visita dettaglio | Back button basato su provenienza pagina, con fallback `/visite`; visite secondarie/modal possono essere marcate come `secondaryVisit` e ignorate | Navigazione corretta |
| Crash React visita | Stabilizzati i permessi desktop e mantenuti gli hook prima dei return condizionali | Mitigazione errore React #310 |
| Protocolli sanitari | Creato parser condiviso per forme legacy/backend, senza output `undefined`; fallback `su indicazione` | Niente `ogni undefined mesi` |
| Aziende desktop | Aggiunto tab `Sicurezza` con card `Sorveglianza Sanitaria`, elenco lavoratori, protocolli sanitari, prestazioni e azione rapida per creare visita | Parità MDL aumentata |
| Sync create offline | `upload-batch` conserva `op.entityId` come `id` Prisma in create generiche, così appuntamento/visita creati offline mantengono riferimenti coerenti | Sync più robusto |

### Verifiche eseguite

| Verifica | Comando | Risultato |
|----------|---------|-----------|
| TypeScript desktop | `npm run typecheck` | OK |
| Build desktop | `npm run build` | OK |
| TypeScript test | `npx tsc --noEmit -p tests/tsconfig.json` | OK |
| Electron/SQLite E2E | `npm run test:e2e` | 9 passed, 3 skipped |
| Backend syntax | `node --check` su controller sync, route licenze, API server | OK |
| Endpoint heartbeat prod | `POST https://www.elementmedica.com/api/v1/desktop-licenses/heartbeat` | `401 Token di accesso richiesto` |

### Note residue

- I test di navigazione autenticata restano skipped nel runner corrente quando manca una sessione/licenza desktop completa.
- La parità totale con webapp richiede ancora QA manuale con dati reali su accettazione, visite secondarie/modal e permessi per profili non admin.

---

## 📋 Obiettivo

Creare un'**applicazione desktop Windows** per la gestione completa delle visite di **Medicina del Lavoro (MDL)** che funziona sia **online che offline**, con sincronizzazione bidirezionale verso la webapp ElementMedica.

### Requisiti Chiave
1. **Offline-first**: Il medico competente scarica i dati delle visite della giornata, le esegue in autonomia (anche senza connessione), e sincronizza quando torna online
2. **Parità funzionale**: Stesse funzionalità della webapp per il dominio MDL (visite, scadenze, movimenti contabili, giudizi idoneità, gestione aziende/dipendenti)
3. **Design coerente**: Stesso design system della webapp (teal-600 brand, componenti UI identici)
4. **Facilmente aggiornabile**: Architettura che permette aggiornamenti rapidi quando cambiano features nella webapp
5. **GDPR Compliant**: Crittografia dati locali, audit trail offline, soft delete

---

## 🏗️ Architettura Tecnica

### Stack Tecnologico

| Layer | Tecnologia | Motivazione |
|-------|-----------|-------------|
| **Runtime Desktop** | **Electron 33+** | Cross-platform (focus Windows), accesso filesystem, notifiche native |
| **Frontend** | **React + Vite** (condiviso con webapp) | Riuso diretto dei componenti della webapp, aggiornamenti automatici |
| **Database Locale** | **SQLite** via `better-sqlite3` | Performante, embedded, zero-config, backup facile |
| **ORM Locale** | **Drizzle ORM** | Type-safe, leggero, supporto SQLite nativo, migrazioni semplici |
| **Sync Engine** | Custom CRDT-inspired | Conflict resolution, operation queue, dependency graph |
| **Crittografia** | **SQLCipher** (o AES-256 a livello app) | Dati PII crittografati at-rest (GDPR) |
| **Build/Package** | **electron-builder** | Auto-update via `electron-updater`, installer .exe/.msi |

### Perché Electron + Shared React (NON Tauri, NON PWA)

| Alternativa | Pro | Contro | Decisione |
|-------------|-----|--------|-----------|
| **Electron** | Riuso 95%+ codice React, Node.js full, SQLite nativo, ecosystem maturo | Bundle ~150MB, RAM | ✅ Scelto |
| **Tauri** | Bundle piccolo, Rust perf | No Node.js → riscrittura sync engine, community più piccola | ❌ |
| **PWA** | Zero install | Service Worker limitato per DB, no filesystem, offline fragile | ❌ |
| **Capacitor** | Mobile-first | Desktop scadente, no SQLite nativo | ❌ |

### Architettura Generale

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ELECTRON MAIN PROCESS                            │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │  Auto-Update  │  │  Tray Icon   │  │  IPC Bridge                  │  │
│  │  (electron-   │  │  & Native    │  │  (contextBridge.exposeIn-    │  │
│  │   updater)    │  │  Menus       │  │   MainWorld)                 │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    LOCAL DATA LAYER                               │   │
│  │                                                                   │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │   │
│  │  │  SQLite     │  │  Sync      │  │  Conflict  │  │  Crypto   │  │   │
│  │  │  (Drizzle)  │  │  Engine    │  │  Resolver  │  │  Layer    │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ IPC
┌────────────────────────────▼────────────────────────────────────────────┐
│                      ELECTRON RENDERER PROCESS                          │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                SHARED REACT APP (from webapp)                     │   │
│  │                                                                   │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │   │
│  │  │  VisitaPage │  │  MDLInfo   │  │  Calendario│  │  Company  │  │   │
│  │  │  & Forms    │  │  Card      │  │  Agenda    │  │  Mgmt     │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │   │
│  │                                                                   │   │
│  │  ┌────────────────────────────────────────────────────────────┐   │   │
│  │  │  DATA ADAPTER LAYER (intercepts API calls)                  │   │   │
│  │  │  Online  → Proxy to webapp API (https://api.elementmedica)  │   │   │
│  │  │  Offline → Route to local SQLite via IPC                    │   │   │
│  │  └────────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                             │ HTTPS (when online)
┌────────────────────────────▼────────────────────────────────────────────┐
│                    WEBAPP BACKEND (Porta 4001)                           │
│            API Server Express + Prisma + PostgreSQL                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Strategia Sincronizzazione

### Principio: "Download → Work Offline → Sync Back"

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│  DOWNLOAD    │ ──→  │  WORK        │ ──→  │  SYNC        │
│  (Pre-shift) │      │  (Offline)   │      │  (Post-shift)│
│              │      │              │      │              │
│ Appuntamenti │      │ Esegui visite│      │ Upload visite│
│ Pazienti     │      │ Compila dati │      │ Scadenze     │
│ Aziende      │      │ Giudizi      │      │ Movimenti    │
│ Protocolli   │      │ Movimenti    │      │ Resolve conf.│
│ Tariffari    │      │ Scadenze     │      │              │
│ Mansioni     │      │              │      │              │
└─────────────┘      └──────────────┘      └──────────────┘
```

### 3.1 Download (Pre-Shift Sync)

**Endpoint dedicato** (nuovo): `GET /api/v1/desktop-sync/download-day`

```typescript
// Request
{
  date: '2026-04-02',             // Giorno target
  medicoId: 'uuid',              // Medico competente
  lastSyncTimestamp: '2026-04-01T18:00:00Z'  // Delta sync
}

// Response (~500KB-2MB per giornata tipica)
{
  appuntamenti: Appuntamento[],   // Con relazioni incluse
  pazienti: Person[],             // Solo quelli degli appuntamenti + profili
  aziende: CompanyTenantProfile[],// Con sedi
  visitePrecedenti: Visita[],     // Ultime 2 per paziente (storia)
  protocolli: ProtocolloSanitario[],
  mansioni: Mansione[],           // Con rischi
  scadenze: ScadenzaPrestazioneProtocollo[],
  tariffari: TariffarioCompanyAssociation[],  // Con voci
  prestazioni: Prestazione[],
  convenzioni: Convenzione[],
  ambulatori: Ambulatorio[],
  templates: VisitTemplate[],     // Template visita del medico
  questionari: QuestionarioMedicoConfig[], // Questionari collegati
  timestamp: '2026-04-02T07:00:00Z'
}
```

**Download incrementale**: La seconda volta scarica solo i record con `updatedAt > lastSyncTimestamp`.

### 3.2 Operations Queue (Offline)

Ogni operazione utente genera un **record nella coda locale**:

```typescript
interface OfflineOperation {
  id: string;                    // UUID locale
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;                // 'visita' | 'giudizioIdoneita' | 'movimentoContabile' | ...
  entityId: string;              // UUID (locale se CREATE, remoto se UPDATE)
  localId?: string;              // UUID temporaneo per nuove entità
  payload: Record<string, any>;  // Dati completi
  dependsOn?: string[];          // IDs di operazioni che devono completare prima
  timestamp: string;             // ISO 8601
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'CONFLICT' | 'FAILED';
  retryCount: number;
  conflictData?: {
    localVersion: Record<string, any>;
    serverVersion: Record<string, any>;
  };
}
```

**Grafo dipendenze** (ordine di sync obbligatorio):

```
Visita (CREATE)
  ├─→ GiudizioIdoneita (CREATE, depends: visitaId)
  ├─→ MovimentoContabile (CREATE, depends: visitaId)
  ├─→ ScadenzaPrestazioneProtocollo (UPDATE, depends: visitaId)
  ├─→ EsameStrumentale (CREATE, depends: visitaId)
  └─→ Allegato (CREATE, depends: visitaId)

PersonTenantProfile (UPDATE)
  └─→ LavoratoreMansioneAssegnazione (CREATE/UPDATE)

CompanyTenantProfile (UPDATE)
  └─→ CompanySite (UPDATE)
```

### 3.3 Upload (Post-Shift Sync)

**Endpoint dedicato** (nuovo): `POST /api/v1/desktop-sync/upload-batch`

```typescript
// Request
{
  operations: OfflineOperation[],  // Ordinate per dipendenze
  clientId: 'uuid',               // Identificativo desktop client
  syncSessionId: 'uuid'           // Session tracking per audit
}

// Response
{
  results: {
    operationId: string;
    status: 'SUCCESS' | 'CONFLICT' | 'FAILED';
    serverId?: string;      // Se CREATE, ritorna UUID server
    conflictData?: object;  // Se CONFLICT, dati per resolution
    error?: string;
  }[],
  idMapping: Record<string, string>,  // localId → serverId
  timestamp: string
}
```

### 3.4 Conflict Resolution

| Scenario | Strategia | UI |
|----------|-----------|-----|
| Stesso campo modificato online+offline | **LWW** (Last Write Wins) con conferma | Modal diff |
| Visita creata offline, appuntamento cancellato online | **Keep offline** (orphan recovery) | Toast warning |
| Scadenza eseguita offline + online | **Merge** (prima temporalmente) | Auto-resolve |
| Paziente modificato da altro medico | **Field-level merge** | Diff panel |
| Movimento contabile doppio | **Prevent** (unique visitaId+tipo) | Error con rollback |

---

## 📦 Struttura Progetto

```
desktop-app/
├── package.json
├── electron-builder.yml          # Config packaging .exe/.msi
├── tsconfig.json
├── vite.config.ts                # Vite per renderer (shared con webapp)
├── vite.main.config.ts           # Vite per main process
├── vite.preload.config.ts        # Vite per preload script
│
├── src/
│   ├── main/                     # Electron Main Process
│   │   ├── index.ts              # App entry, window management
│   │   ├── ipc-handlers.ts       # IPC channel handlers
│   │   ├── auto-updater.ts       # electron-updater setup
│   │   ├── tray.ts               # System tray icon
│   │   └── menu.ts               # Native menus
│   │
│   ├── preload/                  # Preload (contextBridge)
│   │   └── index.ts              # Expose APIs to renderer
│   │
│   ├── renderer/                 # React App (SHARED con webapp)
│   │   ├── main.tsx              # React entry point (desktop-specific)
│   │   ├── App.tsx               # App shell con offline indicator
│   │   ├── router.tsx            # Routes subset (solo MDL)
│   │   │
│   │   ├── adapters/             # ⭐ CHIAVE: Data Adapter Layer
│   │   │   ├── ApiAdapter.ts     # Intercetta chiamate API
│   │   │   ├── OnlineAdapter.ts  # Proxy verso webapp API
│   │   │   ├── OfflineAdapter.ts # Route verso SQLite locale
│   │   │   └── HybridAdapter.ts  # Switch automatico online/offline
│   │   │
│   │   ├── sync/                 # Sync Engine
│   │   │   ├── SyncEngine.ts     # Core sync logic
│   │   │   ├── OperationQueue.ts # Queue FIFO con dipendenze
│   │   │   ├── ConflictResolver.ts
│   │   │   ├── DependencyGraph.ts
│   │   │   └── SyncStatusProvider.tsx  # React Context
│   │   │
│   │   ├── db/                   # Database Locale
│   │   │   ├── schema.ts         # Drizzle schema (mirror Prisma)
│   │   │   ├── migrations/       # SQLite migrations
│   │   │   ├── seed.ts           # Initial data
│   │   │   └── crypto.ts         # Encryption layer
│   │   │
│   │   └── components/           # Desktop-specifici (pochi)
│   │       ├── OfflineIndicator.tsx
│   │       ├── SyncStatusBar.tsx
│   │       ├── ConflictResolutionModal.tsx
│   │       ├── DayDownloadPanel.tsx
│   │       └── DesktopLayout.tsx
│   │
│   └── shared/                   # Symlink/alias a src/ della webapp
│       └── (componenti, hooks, utils, styles, design-system, ...)
│
├── resources/                    # Assets per installer
│   ├── icon.ico                  # App icon Windows
│   ├── icon.png                  # App icon
│   └── installer.nsh             # NSIS installer script
│
└── scripts/
    ├── sync-shared-code.sh       # Script per aggiornare codice condiviso
    └── build-release.sh          # Build + package + sign
```

### Codice Condiviso (Riuso dalla Webapp)

L'applicazione desktop **riusa direttamente** i seguenti moduli dalla webapp, tramite alias Vite:

| Modulo Webapp | Path | Contenuto Riusato |
|---------------|------|-------------------|
| `src/components/ui/` | `@/components/ui` | Button, Card, Input, Select, Table, Modal, Toast, CRUDButton, ActionButton, DatePickerElegante |
| `src/components/clinica/` | `@/components/clinica` | EsamiStrumentaliCard, ProfiloSaluteCard, PriceCalculator, StatusBadge, SearchPatient |
| `src/pages/clinica/clinica/` | `@/pages/clinica/clinica` | VisitaPage, VisiteListPage, tutti i components/ e hooks/ |
| `src/pages/clinica/mdl/` | `@/pages/clinica/mdl` | MansioniPage, ProtocolliSanitariPage, GiudiziIdoneitaPage, ScadenzeMDLPage |
| `src/pages/clinica/agenda/` | `@/pages/clinica/agenda` | CalendarioPage, AppuntamentiPage (subset) |
| `src/pages/clinica/scadenze/` | `@/pages/clinica/scadenze` | ScadenzePage, DeadlineTable |
| `src/design-system/` | `@/design-system` | Tema, colori, tipografia |
| `src/styles/` | `@/styles` | CSS condivisi |
| `src/hooks/` | `@/hooks` | useToast, useAuth, useSidebar, ecc. |
| `src/utils/` | `@/utils` | textFormatters, dateUtils, ecc. |
| `src/services/clinicaApi.ts` | `@/services/clinicaApi` | **Wrappato** da ApiAdapter (non diretto) |

> **Strategia aggiornamento**: Quando cambia un componente nella webapp, basta ricompilare il desktop app. I componenti condivisi sono gli stessi file (monorepo o symlink).

---

## 🗄️ Schema Database Locale (SQLite)

Mirror dei modelli Prisma rilevanti per MDL, con campi aggiuntivi per sync:

```typescript
// Campi extra per OGNI tabella locale
interface SyncMetadata {
  _localId: string;           // UUID locale
  _serverId: string | null;   // UUID server (null se non ancora sincronizzato)
  _syncStatus: 'SYNCED' | 'PENDING' | 'CONFLICT';
  _lastSyncAt: string | null; // Timestamp ultima sync
  _localUpdatedAt: string;    // Timestamp modifica locale
  _isDeleted: boolean;        // Soft delete locale
  _version: number;           // Incrementale per conflict detection
}
```

### Tabelle Locali

| Tabella | Mirror di (Prisma) | Note |
|---------|---------------------|------|
| `visits` | `Visita` | Tutti i campi + `datiStrutturati` JSON |
| `appointments` | `Appuntamento` | Solo giornata corrente + prestazioni |
| `appointment_prestazioni` | `AppuntamentoPrestazione` | M:N |
| `patients` | `Person` + `PersonTenantProfile` | Flattened |
| `companies` | `CompanyTenantProfile` + `Company` | Flattened |
| `company_sites` | `CompanySite` | Per-tenant |
| `mansioni` | `Mansione` + `MansioneRischio` | Con rischi embedded |
| `lavoratore_mansioni` | `LavoratoreMansione` | Assegnazioni |
| `protocolli` | `ProtocolloSanitario` + `ProtocolloPrestazione` | Con prestazioni |
| `scadenze` | `ScadenzaPrestazioneProtocollo` | Tracking |
| `giudizi_idoneita` | `GiudizioIdoneita` | Art. 41 |
| `movimenti_contabili` | `MovimentoContabile` | Contabilità |
| `prestazioni` | `Prestazione` | Catalogo (read-only locale) |
| `tariffari` | `TariffarioCompanyAssociation` + `VoceTariffario` | Prezzi |
| `convenzioni` | `Convenzione` | Accordi |
| `ambulatori` | `Ambulatorio` | Sedi |
| `visit_templates` | `VisitTemplate` + fields | Template medico |
| `esami_strumentali` | `EsameStrumentale` | Esami |
| `allegati` | `AllegatoVisita` | File binari (separati) |
| `questionari_compilati` | `DocumentoCompilato` | Questionari MDL |
| `lavoratore_rischi_aggiuntivi` | `LavoratoreRischioAggiuntivo` | Rischi extra |
| `operations_queue` | (solo locale) | Coda sync |
| `sync_log` | (solo locale) | Audit trail sync |

---

## 📱 Funzionalità per Fase

### FASE 1: Foundation (4-5 settimane)

> **Obiettivo**: App desktop avviabile con login, shell navigazione, database locale, download dati giornata.

| # | Task | Dettaglio | Priorità |
|---|------|-----------|----------|
| 1.1 | **Scaffold Electron + Vite + React** | Boilerplate con electron-builder, Vite per renderer, TypeScript strict | CRITICA |
| 1.2 | **Configurazione monorepo/alias** | Setup Vite aliases per condividere `src/` della webapp (components, hooks, utils, styles) | CRITICA |
| 1.3 | **SQLite + Drizzle schema** | Definire schema locale mirror Prisma, migrazioni, seed | CRITICA |
| 1.4 | **Crittografia SQLite** | AES-256 encryption at-rest per dati PII (GDPR) | CRITICA |
| 1.5 | **Autenticazione desktop** | Login con credenziali webapp → JWT + refresh token storage sicuro (keytar/electron-store encrypted) | CRITICA |
| 1.6 | **IPC Bridge** | contextBridge per comunicazione main↔renderer sicura | CRITICA |
| 1.7 | **Download giornata** | API sync endpoint + UI "Scarica giornata" con progress bar | ALTA |
| 1.8 | **Shell navigazione** | DesktopLayout con sidebar MDL (subset webapp), offline indicator, tray icon | ALTA |
| 1.9 | **Connectivity detection** | Navigator.onLine + heartbeat API → auto-switch online/offline mode | ALTA |

**Deliverable Fase 1**: App `.exe` installabile che effettua login, scarica dati di una giornata, li visualizza localmente.

---

### FASE 2: Data Adapter Layer (3-4 settimane)

> **Obiettivo**: I componenti React della webapp funzionano sia online che offline senza modifiche.

| # | Task | Dettaglio | Priorità |
|---|------|-----------|----------|
| 2.1 | **ApiAdapter pattern** | Intercetta TUTTE le chiamate `clinicaApi.*` e le instrada a OnlineAdapter o OfflineAdapter | CRITICA |
| 2.2 | **OfflineAdapter — READ** | Query SQLite locale per tutte le GET: visite, appuntamenti, pazienti, aziende, mansioni, protocolli, scadenze | CRITICA |
| 2.3 | **OfflineAdapter — WRITE** | Salva in SQLite locale + accoda in OperationQueue per ogni POST/PUT/PATCH/DELETE | CRITICA |
| 2.4 | **React Query offline** | Configurare `@tanstack/react-query` con `networkMode: 'offlineFirst'`, cache persistence | ALTA |
| 2.5 | **Adapter per mansioniApi** | CRUD mansioni offline (read locale, write queue) | ALTA |
| 2.6 | **Adapter per protocolliApi** | CRUD protocolli offline | ALTA |
| 2.7 | **Adapter per prestazioniApi** | Read-only locale (catalogo) | MEDIA |
| 2.8 | **Adapter per convenzioniApi** | Read-only locale | MEDIA |

**Deliverable Fase 2**: Navigazione completa MDL (liste, dettagli) funziona offline. Modifiche salvate localmente.

---

### FASE 3: Visite Offline (4-5 settimane)

> **Obiettivo**: Esecuzione completa visite MDL offline, inclusi tutti i sotto-componenti.

| # | Task | Dettaglio | Priorità |
|---|------|-----------|----------|
| 3.1 | **VisitaPage offline** | Creazione visita da appuntamento, compilazione form, salvataggio locale | CRITICA |
| 3.2 | **datiStrutturati offline** | Template system P52 con campi dinamici, salvataggio JSON locale | CRITICA |
| 3.3 | **MDLInfoCard offline** | Visualizzazione mansioni/rischi/protocolli, modifica livello rischio | CRITICA |
| 3.4 | **PrestazioniCard offline** | Lista prestazioni appuntamento, prezzi da tariffario locale | CRITICA |
| 3.5 | **GiudizioIdoneita offline** | Form compilazione giudizio, salvataggio locale, PDF locale (Puppeteer o jsPDF) | ALTA |
| 3.6 | **ScadenzeMDL offline** | Generazione scadenze post-visita, programmazione prestazioni | ALTA |
| 3.7 | **MovimentiContabili offline** | Generazione automatica movimenti da visita completata | ALTA |
| 3.8 | **EsamiStrumentali offline** | Registrazione risultati esami | ALTA |
| 3.9 | **Allegati offline** | Upload file locali, associazione a visita | MEDIA |
| 3.10 | **Questionari offline** | Compilazione questionari MDL senza server | MEDIA |
| 3.11 | **Firma digitale offline** | Canvas firma paziente/medico, storage locale | MEDIA |
| 3.12 | **Timer visita offline** | Persistenza timer locale (useVisitaTimer) | BASSA |

**Deliverable Fase 3**: Una visita MDL completa può essere eseguita interamente offline.

---

### FASE 4: Sync Engine (3-4 settimane)

> **Obiettivo**: Sincronizzazione affidabile bidirezionale con la webapp.

| # | Task | Dettaglio | Priorità |
|---|------|-----------|----------|
| 4.1 | **Operation Queue** | FIFO con priorità e dipendenze (visita → giudizio → scadenze) | CRITICA |
| 4.2 | **Dependency Graph** | Risoluzione ordine operazioni (DAG topological sort) | CRITICA |
| 4.3 | **Sync Engine core** | Upload batch, id mapping (localId → serverId), retry con backoff | CRITICA |
| 4.4 | **Backend sync endpoints** | `GET /desktop-sync/download-day`, `POST /desktop-sync/upload-batch` | CRITICA |
| 4.5 | **Conflict Detection** | Version-based (campo `_version`), field-level diff | ALTA |
| 4.6 | **Conflict Resolution UI** | Modal con diff side-by-side, scelta manuale per conflitti non-auto | ALTA |
| 4.7 | **ID Remapping** | Dopo sync, aggiornare tutti i riferimenti locali (visitaId → server UUID) | ALTA |
| 4.8 | **Sync Progress UI** | Progress bar, contatore operazioni, errori, retry | ALTA |
| 4.9 | **GDPR Audit offline** | Ogni operazione locale genera un record audit (sincronizzato dopo) | ALTA |
| 4.10 | **Delta sync** | Download solo modifiche dal `lastSyncTimestamp` | MEDIA |

**Deliverable Fase 4**: Ciclo completo download → lavoro offline → upload con risoluzione conflitti.

---

### FASE 5: Gestione Aziende/Dipendenti Offline (2-3 settimane)

> **Obiettivo**: CRUD completo aziende, sedi, dipendenti in modalità offline.

| # | Task | Dettaglio | Priorità |
|---|------|-----------|----------|
| 5.1 | **CompanyTenantProfile CRUD offline** | Lista, dettaglio, modifica dati azienda | ALTA |
| 5.2 | **CompanySite CRUD offline** | Gestione sedi operative | ALTA |
| 5.3 | **PersonTenantProfile CRUD offline** | Lista dipendenti, modifica contatti/status | ALTA |
| 5.4 | **Assegnazione mansioni offline** | Associazione lavoratore→mansione | ALTA |
| 5.5 | **Rischi aggiuntivi offline** | Modifica rischi per singolo lavoratore | MEDIA |
| 5.6 | **Ricerca pazienti offline** | Ricerca full-text su SQLite (FTS5) | MEDIA |

**Deliverable Fase 5**: Gestione completa anagrafica aziendale e dipendenti offline.

---

### FASE 6: Polish & Auto-Update (2-3 settimane)

> **Obiettivo**: App production-ready con auto-aggiornamento.

| # | Task | Dettaglio | Priorità | Stato |
|---|------|-----------|----------|-------|
| 6.1 | **Auto-updater** | electron-updater con GitHub Releases o server custom | CRITICA | ✅ |
| 6.2 | **Code signing** | Certificato Windows per evitare alert SmartScreen | ALTA | ⬜ Esterno (cert. Apple Developer) |
| 6.3 | **Installer NSIS** | Wizard installazione personalizzato | ALTA | ✅ |
| 6.4 | **Error reporting** | Crash reporter locale + invio su sync (no Sentry per GDPR) | ALTA | ✅ |
| 6.5 | **Notifications** | Notifiche native: "Sincronizzazione completata", "Conflitti da risolvere" | MEDIA | ✅ |
| 6.6 | **Backup locale** | Export/import database locale crittografato | MEDIA | ✅ |
| 6.7 | **Multi-giornata** | Download dati per più giornate (es. trasferta 3 giorni) | MEDIA | ✅ |
| 6.8 | **Performance** | Profiling SQLite queries, lazy loading componenti, bundle optimization | MEDIA | ✅ SQLite PRAGMAs + lazy loading + bundle splitting |
| 6.9 | **Testing E2E** | Playwright per test desktop, mock sync | MEDIA | ✅ 5/5 passing |
| 6.10 | **Documentazione utente** | Manuale utente PDF + help in-app | BASSA | ✅ HelpPage in-app con 9 sezioni |

**Deliverable Fase 6**: App stabile, auto-aggiornabile, pronta per distribuzione. ✅ **COMPLETO** (salvo §6.2 cert. esterno)

---

## 🔑 Pattern Aggiornabilità (Requisito #2)

### Strategia: Monorepo con Shared Source

```
project 2.0/                    # Monorepo root
├── src/                        # Webapp source (MASTER)
├── backend/                    # API server
├── desktop-app/                # Electron wrapper
│   ├── src/main/               # Desktop-specific (Electron)
│   ├── src/renderer/           # Desktop-specific (adapters, sync)
│   └── vite.config.ts          # Aliases → ../src/ (webapp)
└── package.json                # Workspaces config
```

**Flusso aggiornamento**:

1. **Sviluppatore modifica webapp** (es. aggiunge campo a VisitaPage)
2. **Desktop automaticamente** lo riceve (stesso file via alias)
3. **Se serve nuovo dato offline**: 
   - Aggiornare Drizzle schema (`desktop-app/src/renderer/db/schema.ts`)
   - Aggiungere migration SQLite
   - Aggiornare adapter se necessario
4. **Build desktop**: `cd desktop-app && npm run build`
5. **Publish update**: Push a GitHub Release → auto-update sui client

**Casi specifici**:

| Modifica Webapp | Impatto Desktop | Azione |
|-----------------|-----------------|---------|
| Nuova UI (componente/stile) | Automatico | Nessuna |
| Nuovo campo form visita | Automatico (datiStrutturati JSON) | Nessuna (JSON flessibile) |
| Nuovo campo DB (Prisma) | Richiede migration | Aggiornare Drizzle schema + migration |
| Nuova API endpoint | Richiede adapter | Aggiungere handler in OfflineAdapter |
| Nuova entità/pagina | Da valutare | Aggiungere tabella, adapter, route |

---

## 🔒 Sicurezza & GDPR

### Dati Locali
- **Crittografia at-rest**: Database SQLite crittografato con chiave derivata da password utente (PBKDF2 + AES-256)
- **Chiave in memoria**: La chiave di crittografia esiste solo in RAM durante la sessione
- **Auto-lock**: Dopo 15 minuti di inattività, app si blocca e richiede password
- **Wipe remoto**: Se il server segnala che l'utente è stato disabilitato, al prossimo sync il DB locale viene cancellato

### Audit Trail Offline
```typescript
// Ogni operazione offline genera un audit record
{
  action: 'UPDATE',
  entity: 'visita',
  entityId: 'local-uuid',
  personId: 'medico-uuid',
  timestamp: '2026-04-02T14:30:00Z',
  changes: { stato: { old: 'IN_CORSO', new: 'COMPLETATA' } },
  isOffline: true,
  syncedAt: null  // Popolato dopo sync
}
```

### Multi-Tenancy Locale
- Il database locale contiene SOLO dati del tenant dell'utente loggato
- `tenantId` è hardcoded nel DB locale dal download
- Nessun dato cross-tenant mai presente localmente

### Soft Delete
- Tutte le "eliminazioni" offline impostano `_isDeleted: true`
- Al sync, vengono tradotte in soft delete (`deletedAt = new Date()`) + GdprAuditLog

### Token & Auth Offline
- Al login, salvare JWT access + refresh token in `electron-store` (encrypted)
- **Offline mode**: Non servono token per operazioni locali; l'auth è verificata una sola volta al login
- Token refreshato automaticamente alla prima operazione online (prima del sync)
- Se refresh token scaduto, richiesta re-login prima di sync

### IPC Security
- **Input validation** su OGNI handler `ipcMain.handle()` — mai fidarsi del renderer
- Whitelist di canali IPC esposti via `contextBridge` (no `ipcRenderer.send` diretto)
- Sanitize tutti i parametri prima di passarli a SQLite/Drizzle
- CSP strict nel renderer: `script-src 'self'`

### Stampa PDF Offline
- **Giudizi idoneità / certificati**: generati con `@react-pdf/renderer` (già in webapp deps)
- NO Puppeteer in Electron (troppo pesante) — `@react-pdf/renderer` per tutti i PDF
- I template PDF sono condivisi con la webapp dove possibile

### File Allegati (Binary Sync)
- Allegati salvati su filesystem locale (`userData/attachments/{visitaId}/`)
- Sync separata dagli operations: upload via `multipart/form-data` dopo operazioni
- Max 50MB per file, compressione gzip in transit
- Hash SHA-256 per verifica integrità

### Atomicità Upload Batch
- `upload-batch` opera in **transazione Prisma**: o tutte le operazioni passano o nessuna
- Operazioni raggruppate per "visita" (unità atomica)
- Se un batch fallisce, il client riprova l'intero batch (idempotency via `operationId`)
- `syncSessionId` univoco previene duplicazione

---

## 📊 Metriche e KPI

| Metrica | Target |
|---------|--------|
| Tempo download giornata (50 pazienti) | < 5 secondi |
| Tempo apertura visita offline | < 500ms |
| Tempo sync upload (giornata completa) | < 30 secondi |
| Dimensione DB locale (1 mese di lavoro) | < 100MB |
| Dimensione installer .exe | < 200MB |
| Tempo avvio app (cold start) | < 3 secondi |
| RAM usage (in uso) | < 300MB |
| Conflict rate (operazioni normali) | < 2% |
| Auto-update success rate | > 99% |

---

## ⚠️ Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|------------|---------|-------------|
| Conflitti sync frequenti | Media | Alto | Conflict resolution UI + policy LWW chiara |
| Dati persi se PC si rompe | Bassa | Critico | Backup automatico ogni sync + export manuale |
| Aggiornamenti rompono offline | Media | Alto | Versioning schema, migration automatiche, rollback |
| Performance SQLite con molti dati | Bassa | Medio | Purge dati > 6 mesi, indexes, VACUUM |
| Crittografia rallenta operazioni | Bassa | Basso | Benchmark early, fallback a encryption at-rest |
| Electron bundle troppo grande | Media | Basso | Tree-shaking, lazy loading, asar unpacking selettivo |

---

## 🔗 Integrazione con Medical Device Bridge

L'app desktop può **incorporare il Medical Device Bridge** (già esistente in `medical-device-bridge/`) per comunicazione diretta con dispositivi medici:

```
Desktop App (Electron)
  ├─→ GDT 2.1 files (spirometro, audiometro, ECG)
  └─→ Risultati → EsameStrumentale → SQLite locale → Sync
```

**Vantaggio**: In modalità desktop, il bridge può girare come processo figlio di Electron, eliminando la necessità di installazione separata.

---

## 📅 Timeline Stimata

| Fase | Durata | Milestone |
|------|--------|-----------|
| **Fase 1**: Foundation | 4-5 settimane | App installabile con login e download |
| **Fase 2**: Data Adapters | 3-4 settimane | Navigazione MDL offline completa |
| **Fase 3**: Visite Offline | 4-5 settimane | Visita MDL E2E offline |
| **Fase 4**: Sync Engine | 3-4 settimane | Sync bidirezionale funzionante |
| **Fase 5**: Aziende/Dipendenti | 2-3 settimane | CRUD completo offline |
| **Fase 6**: Polish & Update | 2-3 settimane | Release v1.0 |
| **TOTALE** | **18-24 settimane** | **v1.0 Production** |

---

## 📝 Note di Implementazione

### Backend: Nuovi Endpoint Richiesti

| Endpoint | Metodo | Scopo |
|----------|--------|-------|
| `/api/v1/desktop-sync/download-day` | GET | Scarica tutti i dati per una giornata |
| `/api/v1/desktop-sync/upload-batch` | POST | Carica batch di operazioni offline |
| `/api/v1/desktop-sync/check-conflicts` | POST | Verifica conflitti prima dell'upload |
| `/api/v1/desktop-sync/resolve-conflict` | POST | Risolve un conflitto specifico |
| `/api/v1/desktop-sync/client-register` | POST | Registra client desktop (per wipe remoto) |
| `/api/v1/desktop-sync/client-status` | GET | Verifica stato client (attivo/disabilitato) |

### Frontend: Modifiche alla Webapp

| File | Modifica | Motivo |
|------|----------|--------|
| `src/services/clinicaApi.ts` | Esportare come modulo intercettabile | Permettere sostituzione con ApiAdapter |
| `src/hooks/useAuth.ts` | Esportare hook puro (senza browser deps) | Riuso in Electron |
| `src/context/` | Verificare compatibilità Electron | Nessun `window.location` hardcoded |

### Prisma → Drizzle Migration Script

Script automatico per convertire schema Prisma in schema Drizzle:

```bash
# desktop-app/scripts/prisma-to-drizzle.ts
# Legge backend/prisma/schema.prisma
# Genera desktop-app/src/renderer/db/schema.ts
# Aggiunge campi sync metadata
```

---

## 📚 Riferimenti

| Documento | Path |
|-----------|------|
| MDL Completo | `docs/08-projects/P56_MDL_COMPLETO.md` |
| MDL Multi-Prestazioni | `docs/08-projects/P55_MDL_MULTIPRESTAZIONI.md` |
| MDL Visit Workflow | `docs/08-projects/P66_MDL_VISIT_WORKFLOW.md` |
| MDL Tipologie Pricing | `docs/08-projects/P67_MDL_TIPOLOGIE_PRICING.md` |
| Clinical Visits | `docs/08-projects/P52_CLINICAL_VISITS.md` |
| Queue System | `docs/08-projects/P53_QUEUE_SYSTEM.md` |
| MovimentoContabile | `docs/08-projects/P59_MOVIMENTO_CONTABILE.md` |
| Medical Device Bridge | `medical-device-bridge/README.md` |
| Person Multi-Tenant | `docs/08-projects/P48_PERSON_MULTITENANT.md` |
| Company Multi-Tenant | `docs/08-projects/P49_COMPANY_MULTITENANT.md` |
