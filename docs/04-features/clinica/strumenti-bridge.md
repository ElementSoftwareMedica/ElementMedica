# Integrazione Dispositivi Medici (Strumenti Bridge)

## Panoramica

Sistema di integrazione con dispositivi medici locali per acquisizione automatica di esami strumentali (ECG, spirometria, audiometria) durante le visite mediche.

L'architettura si basa su un **Bridge locale** installato sul PC del medico che comunica bidirezionalmente con la webapp.

## Architettura

```
┌─────────────┐     HTTP      ┌──────────────────┐    GDT 2.1    ┌─────────────────┐
│   Webapp     │◄────────────►│  Medical Device   │◄────────────►│  Software        │
│  (Browser)   │  localhost    │    Bridge         │   + Launch    │  Dispositivo     │
│              │   :3000       │  (Node.js)        │              │  (Edan/MIR/...)  │
└──────┬───────┘              └────────┬──────────┘              └─────────────────┘
       │                              │
       │  /api/v1/clinica/            │ Callback POST
       │  strumenti-bridge/           │ /api/v1/clinica/
       │                              │ strumenti-bridge/risultati
       ▼                              ▼
┌─────────────────────────────────────────┐
│           Backend API (4001)            │
│  EsameStrumentale model (Prisma)        │
└─────────────────────────────────────────┘
```

## Componenti

### 1. Medical Device Bridge (Progetto separato)

Applicazione Node.js standalone installata localmente sul PC del medico.

- **Path**: `/medical-device-bridge/`
- **Porta**: `localhost:3000`
- **Protocollo**: GDT 2.1 (standard tedesco per comunicazione PVS ↔ dispositivi)
- **Documentazione completa**: [medical-device-bridge/README.md](../../medical-device-bridge/README.md)

### 2. Backend API

**Route base**: `/api/v1/clinica/strumenti-bridge`

Vedi [Route API](#route-api) per la tabella completa con autenticazione e tutti gli endpoint.

**File**: `backend/routes/clinica/strumenti-bridge.routes.js`

### 3. Frontend Component

**Componente**: `EsamiStrumentaliCard`
**Path**: `src/components/clinica/EsamiStrumentaliCard.tsx`

Funzionalità:
- Indicatore connettività Bridge (icona Wi-Fi verde/rossa)
- Pulsanti avvio esame per tipo (ECG, Spirometria, Audiometria)
- Lista esami con espansione dettagli
- Tabella risultati test con valori e unità
- Anteprima e download PDF referti
- Auto-polling intelligente: attivo solo quando la card è espansa (10s esami, 30s bridge status)
- Notifica automatica completamento: toast di conferma quando un esame viene completato con PDF auto-linkato nei documenti della visita

Integrato in `VisitaPage.tsx` in tutte le 3 modalità di layout (tabs, sezioni, continuo).

### 3.5. Pagina Impostazioni Bridge

**File**: `src/pages/clinica/impostazioni/BridgeSettingsPage.tsx`

Sub-componenti (estratti per mantenere il file sotto 500 righe):
- `BridgeDiagnosticsSection.tsx` — Diagnostica connessione (4 test: Backend API, Bridge locale, Proxy Backend→Bridge, API Key)
- `BridgeDeviceGuides.tsx` — Guide configurazione dispositivi espandibili
- `bridgeSettingsData.ts` — Costanti e tipi condivisi (SUPPORTED_DEVICES, BRIDGE_PORT, DiagnosticResult)

### 4. API Service

**File**: `src/services/bridgeApi.ts`

Exports:
- `strumentiBridgeApi` — CRUD verso il backend (via proxy API)
- `bridgeDirectApi` — Comunicazione diretta col Bridge locale (URL e API key configurabili via `localStorage`)
- `TIPO_ESAME_LABELS`, `TIPO_DISPOSITIVO_LABELS`, `STATO_ESAME_CONFIG` — Costanti UI

**Configurazione Bridge Locale** (da `localStorage`):
- `bridge_local_url` — URL del Bridge (default: `http://localhost:3000`)
- `bridge_api_key` — API key per autenticazione Bridge

## Modello Dati

```prisma
model EsameStrumentale {
  id              String    @id @default(uuid())
  tenantId        String
  visitaId        String
  pazienteId      String
  medicoId        String
  tipoEsame       String                    // ecg, spirometria, audiometria
  tipoDispositivo TipoDispositivoMedico     // ECG, SPIROMETRO, AUDIOMETRO
  stato           StatoEsameStrumentale     @default(IN_ATTESA)
  risultati       Json?                     // Array di TestResult
  findings        String[]                  // Findings testuali dal dispositivo
  gdtRaw          Json?                     // Dati GDT grezzi
  pdfPath         String?                   // Percorso PDF referto
  pdfFilename     String?                   // Nome file PDF
  bridgeSessionId String?                   // Session ID dal Bridge
  dataEsame       DateTime?                 // Data esame dal dispositivo
  errorMessage    String?                   // Errore se stato = ERRORE
  metadata        Json?                     // Metadati aggiuntivi
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
}
```

## Dispositivi Supportati

| Dispositivo | Tipo | Software | Formato Output |
|-------------|------|----------|----------------|
| Edan SE-1515 | ECG 12 derivazioni | Edan PCECG | GDT + PDF |
| MIR MiniSpir | Spirometro | WinSpiro PRO | GDT + PDF |
| Oscilla TSA | Audiometro | Oscilla Software | GDT + PDF |

## Flusso Esame

1. Medico clicca "ECG" (o altro) nella card esami strumentali
2. Frontend → Backend: `POST /avvia-esame` (crea record `IN_ATTESA`)
3. Frontend → Bridge: `POST /start-exam` (avvia dispositivo)
4. Bridge genera file GDT di richiesta e lancia il software del dispositivo
5. Medico esegue l'esame sul paziente
6. Software dispositivo salva risultati (GDT + PDF)
7. Bridge rileva i file (chokidar watcher), li parsa
8. Bridge → Backend: `POST /risultati` (callback con risultati + PDF)
9. Backend aggiorna record → stato `COMPLETATO`
10. Backend crea automaticamente un `AllegatoVisita` con il PDF, classificato per tipologiaClinica (ECG, SPIROMETRIA, AUDIOMETRIA) e data dell'esame
11. Frontend auto-polling rileva il completamento, mostra toast di conferma e aggiorna la lista documenti della visita

## Protocollo GDT 2.1

Standard tedesco per lo scambio dati tra sistemi PVS (Praxisverwaltungssystem) e dispositivi medici.

- **Encoding**: ISO-8859-1
- **Formato riga**: `LLL FFFF Contenuto \r\n` (LLL = lunghezza 3 cifre, FFFF = ID campo 4 cifre)
- **Tipi record**: 6300 (richiesta esame), 6301/6310 (risultati)
- **Campi principali**: 3000 (ID paziente), 3101 (cognome), 3102 (nome), 3103 (data nascita), 8410 (ID test), 8420 (valore risultato), 8421 (unità)

## Hot-Reload Risultati (senza chiudere il software del dispositivo)

Il Bridge usa **chokidar** per monitorare le cartelle di output dei dispositivi. I risultati vengono rilevati automaticamente **senza dover chiudere il software dello strumento**:

- **Evento `add`**: Rileva nuovi file GDT/PDF scritti dal dispositivo
- **Evento `change`**: Rileva file sovrascritti (alcuni dispositivi riutilizzano lo stesso filename)
- **`awaitWriteFinish`**: Aspetta 2 secondi di stabilità prima di processare (evita letture parziali)

Il medico può:
1. Cliccare "Avvia" nella webapp → il software del dispositivo si apre
2. Eseguire l'esame → il software salva i risultati (pulsante "Salva/Esporta")
3. I risultati appaiono nella webapp entro ~3 secondi
4. Il software del dispositivo resta aperto per eventuali altri esami

> **Nota**: Verificare nelle impostazioni del software del dispositivo che l'esportazione GDT sia configurata su "automatica" o "al salvataggio".

## Auto-Link PDF nei Documenti della Visita

Quando un esame viene completato con successo e include un PDF, il backend **crea automaticamente** un record `AllegatoVisita` associato alla visita. Questo consente al PDF di apparire nella sezione documenti della visita senza intervento manuale.

### Funzionamento

1. Il callback `/risultati` salva l'esame e il PDF
2. Se `stato === 'COMPLETATO'` e il PDF è presente, crea un `AllegatoVisita` con:
   - **Nome**: `"{TipoEsame} - {DD/MM/YYYY}"` (es. "Elettrocardiogramma (ECG) - 11/03/2026")
   - **Descrizione**: `"Referto {TipoEsame} acquisito automaticamente dal dispositivo medico"`
   - **tipologiaClinica**: Mappata automaticamente (`ecg` → `ECG`, `spirometry` → `SPIROMETRIA`, `audiometry` → `AUDIOMETRIA`)
   - **dataEsecuzione**: Data dell'esame dal dispositivo
   - **hashFile**: SHA-256 per integrità
   - **caricatoDa**: ID del medico che ha condotto l'esame
3. L'`allegatoVisitaId` viene salvato nei `metadata` dell'esame
4. Il frontend rileva il completamento via polling, mostra un toast di conferma e invalida la query `['allegati-visita', visitaId]` per aggiornare la lista documenti

### Classificazione Automatica

| Tipo esame Bridge | tipologiaClinica | Label documento |
|-------------------|------------------|-----------------|
| `ecg` | `ECG` | Elettrocardiogramma (ECG) |
| `spirometry` / `spirometria` | `SPIROMETRIA` | Spirometria |
| `audiometry` / `audiometria` | `AUDIOMETRIA` | Audiometria |

### Deduplicazione

Se lo stesso file di risultati viene ri-processato (ad esempio il dispositivo sovrascrive il file GDT), il backend verifica se un `AllegatoVisita` è già stato collegato nei `metadata` dell'esame (`allegatoVisitaId`). Se presente, non crea un duplicato.

### Normalizzazione `tipoEsame`

Il Bridge invia i tipi esame in inglese (`spirometry`, `audiometry`), mentre il frontend usa i nomi italiani (`spirometria`, `audiometria`). Il backend normalizza automaticamente i tipi in italiano prima del salvataggio nel DB, garantendo coerenza nelle query e nei filtri.

### Resilienza

La creazione dell'`AllegatoVisita` è **non-fatale**: se fallisce, l'esame è comunque salvato correttamente. L'errore viene registrato nel log ma non blocca il flusso.

## Sicurezza

### Autenticazione
- **Callback Bridge → Backend**: Autenticazione via API key (`X-Bridge-Api-Key` header) con confronto timing-safe (`crypto.timingSafeEqual`)
- **Frontend → Backend**: JWT + RBAC (`visite:read` / `visite:write`)
- **Frontend → Bridge**: API key via header `X-Bridge-Api-Key` (configurabile da `localStorage`)

### Protezione Cross-Tenant
- La callback `/risultati` verifica che il `tenantId` del payload corrisponda al tenant della sessione esistente
- La creazione di nuovi record verifica l'esistenza della `visita` nel tenant dichiarato
- Query multi-tenant con `tenantId` + `deletedAt: null` su tutti gli endpoint

### Validazione Input
- UUID validation su `visitaId`, `tenantId`, `patientId` nel callback
- `deviceType` e `examType` validati contro whitelist
- Confronto API key timing-safe contro attacchi side-channel

### CORS Bridge
- Il Bridge accetta richieste SOLO da `localhost` (127.0.0.1, ports 4001/5173/5174)
- Nessun wildcard domain — il Bridge è strettamente locale

### GDPR
- Soft delete con `deletedAt` su tutti gli esami
- `deletionReason` obbligatorio (min 10 caratteri) per DELETE
- `GdprAuditLog` per ogni eliminazione con `resourceType`, `resourceId`, `dataAccessed`

## Configurazione

### Bridge (.env)

```env
BRIDGE_PORT=3000
WEBAPP_CALLBACK_URL=http://localhost:4001/api/v1/clinica/strumenti-bridge/risultati
WEBAPP_API_KEY=<chiave-generata-dalla-webapp>
GDT_SENDER_ID=ELEM_MED
EDAN_ENABLED=true
EDAN_GDT_INPUT_DIR=C:\Edan\GDT\Input
EDAN_GDT_OUTPUT_DIR=C:\Edan\GDT\Output
EDAN_EXECUTABLE_WIN=C:\Edan\PCECG\PCECG.exe
```

### Backend (.env)

```env
BRIDGE_API_KEY=<stessa-chiave-del-bridge>
BRIDGE_URL=http://localhost:3000
```

### Frontend (localStorage — configurabile dalla pagina Impostazioni Bridge)

- `bridge_local_url` — URL del Bridge locale (default: `http://localhost:3000`)
- `bridge_api_key` — Chiave API per autenticazione Bridge

### Gestione API Key

La chiave API autentica la comunicazione tra i tre componenti (Browser ↔ Bridge ↔ Backend). La stessa chiave deve essere configurata in:

1. **Browser**: Pagina Impostazioni Bridge → "Impostazioni Bridge locale" → genera e salva automaticamente
2. **Bridge .env**: `WEBAPP_API_KEY=<chiave>`
3. **Backend .env**: `BRIDGE_API_KEY=<chiave>`

L'endpoint `POST /api/v1/clinica/strumenti-bridge/generate-api-key` genera chiavi sicure (32 bytes hex). Richiede permesso `settings:write`.

## Route API

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| `POST` | `/risultati` | API Key / JWT | Callback dal Bridge con risultati |
| `POST` | `/avvia-esame` | JWT + `visite:write` | Crea record e avvia esame |
| `GET` | `/visita/:visitaId` | JWT + `visite:read` | Lista esami per visita |
| `GET` | `/bridge/status` | JWT | Proxy stato Bridge |
| `POST` | `/generate-api-key` | JWT + `settings:write` | Genera nuova API key |
| `GET` | `/download-installer` | JWT + `visite:read` | Scarica ZIP installer |
| `GET` | `/:id` | JWT + `visite:read` | Dettaglio singolo esame |
| `DELETE` | `/:id` | JWT + `visite:write` | Soft delete + GDPR audit |

> **Importante**: Le route con path fisso (`bridge/status`, `download-installer`, `generate-api-key`) sono definite PRIMA di `/:id` per evitare che Express le interpreti come parametro ID.
