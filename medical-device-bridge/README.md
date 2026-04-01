# Medical Device Bridge

**Local Bridge** per l'integrazione di strumenti medici con ElementMedica CRM.

## Panoramica

Il Medical Device Bridge è un server locale che fa da ponte tra l'applicazione web ElementMedica e i dispositivi medici installati sulla postazione dell'operatore. Utilizza il protocollo **GDT 2.1** (Gerätedatentransfer) per la comunicazione standardizzata con i dispositivi.

## Dispositivi Supportati

| Dispositivo | Tipo Esame | Produttore | Software |
|------------|-----------|-----------|----------|
| **Edan ECG** | Elettrocardiogramma | Edan | EDAN PC-ECG |
| **MIR Spirometro** | Spirometria | MIR | WinSpiro PRO |
| **Oscilla Audiometro** | Audiometria | Oscilla | Oscilla SW |

## Architettura

```
┌──────────────┐     HTTP      ┌───────────────────┐     GDT 2.1     ┌──────────────┐
│  ElementMedica│ ──────────── │ Medical Device     │ ──────────────  │  Dispositivo │
│  Webapp       │  POST /start │ Bridge (localhost)│  File Write     │  Medico      │
│              │  ───────────▶│                   │ ──────────────▶ │              │
│              │              │  • GDT Generator  │                 │              │
│              │              │  • File Watcher   │  GDT/PDF Output │              │
│              │  Callback    │  • GDT Parser     │ ◀────────────── │              │
│              │ ◀───────────│  • Device Launcher│                 │              │
└──────────────┘   POST /api  └───────────────────┘                 └──────────────┘
```

### Flusso di Esecuzione

1. L'utente clicca "Avvia Esame" nella webapp
2. La webapp invia `POST /start-exam` al Bridge con dati paziente
3. Il Bridge genera un file GDT 2.1 con i dati del paziente
4. Il file GDT viene scritto nella cartella di input del dispositivo
5. Il Bridge avvia il software del dispositivo (opzionale)
6. Il Bridge monitora la cartella di output con **chokidar**
7. Quando il dispositivo scrive i risultati (GDT + eventuale PDF):
   - Il Bridge analizza il file GDT e ne estrae i risultati
   - Il Bridge invia i dati alla webapp tramite callback HTTP
8. La webapp riceve i risultati e li salva nel fascicolo del paziente

## Installazione

### Installer Automatico (Consigliato)

Il modo più semplice per installare il Bridge è tramite il pacchetto installer incluso nella directory `installer/`:

1. **Dalla webapp**: Andare in *Impostazioni → Bridge* e cliccare "Scarica pacchetto installer"
2. **Estrarre** lo ZIP scaricato in una cartella qualsiasi
3. **Eseguire `install.bat`** come amministratore — la procedura guidata configura tutto automaticamente:
   - Scelta dei dispositivi da abilitare
   - Configurazione dei percorsi GDT per ogni dispositivo
   - Connessione alla webapp (porta, URL callback, API key)
   - Creazione automatica del file `.env`
   - Opzione per avvio automatico con Windows

La **guida dettagliata** `GUIDA-INSTALLAZIONE.txt` è inclusa nel pacchetto con istruzioni passo-passo per configurare ogni software dispositivo (Edan PCECG, WinSpiro PRO, Oscilla AudioConsole).

#### File nel pacchetto installer

| File | Scopo |
|------|-------|
| `install.bat` | Installer interattivo per Windows |
| `GUIDA-INSTALLAZIONE.txt` | Guida completa alla configurazione dei dispositivi |
| `.env.template` | Template variabili d'ambiente (generato automaticamente dall'installer) |

### Installazione Manuale

#### Prerequisiti

- **Node.js** v18+ (o distribuzione standalone via `pkg`)
- I software dei dispositivi medici installati e configurati
- Cartelle GDT condivise (input/output) create e accessibili

#### Setup

```bash
# Clona o copia il progetto
cd medical-device-bridge

# Installa dipendenze
npm install

# Copia la configurazione
cp .env.example .env

# Configura le variabili d'ambiente
nano .env
```

### Configurazione `.env`

Configura almeno:

```env
# Porta del Bridge
BRIDGE_PORT=3000

# URL callback per la webapp
WEBAPP_CALLBACK_URL=http://localhost:4001/api/v1/clinica/strumenti-bridge/risultati
WEBAPP_API_KEY=your-api-key-here

# Per ogni dispositivo, impostare enabled + percorsi GDT
EDAN_ENABLED=true
EDAN_GDT_INPUT_DIR=C:\Edan\GDT\Input
EDAN_GDT_OUTPUT_DIR=C:\Edan\GDT\Output
EDAN_EXECUTABLE_WIN=C:\Edan\PCECG\PCECG.exe

MIR_ENABLED=true
MIR_GDT_INPUT_DIR=C:\MIR\GDT\Input
MIR_GDT_OUTPUT_DIR=C:\MIR\GDT\Output
MIR_EXECUTABLE_WIN=C:\Program Files (x86)\MIR\WinSpiro PRO\WinSpiro.exe

OSCILLA_ENABLED=true
OSCILLA_GDT_INPUT_DIR=C:\Oscilla\GDT\Input
OSCILLA_GDT_OUTPUT_DIR=C:\Oscilla\GDT\Output
OSCILLA_EXECUTABLE_WIN=C:\Program Files\Oscilla\AudioConsole\AudioConsole.exe
```

## Avvio

```bash
# Sviluppo (con hot reload)
npm run dev

# Produzione
npm run build
npm start
```

### Distribuzione Standalone

Per creare un eseguibile standalone (senza Node.js):

```bash
npm run pkg
```

Questo genera eseguibili per Windows e macOS nella cartella `dist/`.

## API Endpoints

### `GET /health`
Health check del Bridge.

**Risposta:**
```json
{
  "status": "ok",
  "uptime": 3600,
  "version": "1.0.0"
}
```

### `GET /status`
Stato completo del Bridge con lista dispositivi.

**Risposta:**
```json
{
  "bridge": { "status": "running", "version": "1.0.0", "uptime": 3600 },
  "devices": [
    {
      "type": "edan-ecg",
      "displayName": "Edan ECG",
      "gdtId": "EDAN",
      "inputDir": "/path/to/input",
      "outputDir": "/path/to/output",
      "watching": true,
      "available": true
    }
  ],
  "activeSessions": 0
}
```

### `POST /start-exam`
Avvia un esame medico.

**Request Body:**
```json
{
  "examType": "ecg",
  "patient": {
    "id": "PAZ-001",
    "lastName": "Rossi",
    "firstName": "Mario",
    "dateOfBirth": "1990-05-15",
    "gender": "MALE",
    "fiscalCode": "RSSMRA90E15H501Z"
  },
  "visitaId": "visita-uuid",
  "requestedBy": "Dott. Bianchi",
  "callbackUrl": "http://localhost:4001/api/v1/clinica/strumenti-bridge/risultati"
}
```

**Risposta (201):**
```json
{
  "sessionId": "uuid",
  "examType": "ecg",
  "device": "Edan ECG",
  "status": "waiting",
  "message": "Esame avviato: il software del dispositivo è stato lanciato. Attendere il completamento dell'esame."
}
```

### `GET /sessions`
Lista esami attivi in attesa di risultati.

### `GET /devices`
Lista dispositivi configurati con stato di disponibilità.

## Protocollo GDT 2.1

### Formato Linea
```
LLL FFFF Content \r\n
```
- **LLL**: Lunghezza totale della riga (3 cifre, zero-padded)
- **FFFF**: Codice campo (4 cifre)
- **Content**: Valore del campo
- **\r\n**: Terminatore di riga (CR+LF)

### Codici Campo Principali

| Codice | Descrizione |
|--------|------------|
| 8000 | Tipo record (Satzart) |
| 8100 | Lunghezza record |
| 8315 | ID destinatario (GDT-ID) |
| 8316 | ID mittente |
| 3000 | ID paziente |
| 3101 | Cognome |
| 3102 | Nome |
| 3103 | Data nascita (DDMMYYYY) |
| 3110 | Sesso (1=M, 2=F) |
| 6200 | Data esame |
| 6201 | Ora esame |
| 8410 | ID test |
| 8420 | Valore risultato |
| 8421 | Unità di misura |
| 8480 | Commento risultato |

### Tipi Record (Satzarten)

| Codice | Direzione | Descrizione |
|--------|----------|------------|
| 6300 | PVS → Dispositivo | Richiesta esame con dati paziente |
| 6301 | Dispositivo → PVS | Dati esame terminato |
| 6310 | Dispositivo → PVS | Dati esame richiesto (mostra risultato in finestra) |

### Codifica
- **ISO-8859-1** (Latin-1) — standard per GDT 2.1
- Conversione automatica gestita dal Bridge via `iconv-lite`

## Struttura Progetto

```
medical-device-bridge/
├── src/
│   ├── index.ts              # Entry point — Express server + graceful shutdown
│   ├── config/
│   │   └── index.ts          # Caricamento configurazione da .env
│   ├── gdt/
│   │   ├── generator.ts      # Generazione file GDT 2.1 (PVS → Dispositivo)
│   │   └── parser.ts         # Parsing file GDT 2.1 (Dispositivo → PVS)
│   ├── routes/
│   │   └── index.ts          # Route Express (start-exam, status, health, ...)
│   ├── services/
│   │   ├── callback.ts       # Invio risultati alla webapp (HTTP POST + retry)
│   │   ├── launcher.ts       # Lancio software dispositivo (cross-platform)
│   │   └── watcher.ts        # Monitoraggio cartelle output (chokidar)
│   ├── types/
│   │   └── index.ts          # TypeScript types e interfacce
│   └── utils/
│       └── logger.ts         # Logger Winston (console + file)
├── installer/
│   ├── install.bat            # Installer interattivo per Windows
│   ├── GUIDA-INSTALLAZIONE.txt # Guida step-by-step per tutti i dispositivi
│   └── build-installer.sh     # Script per generare il pacchetto di distribuzione
├── .env.example              # Template configurazione
├── package.json              # Dipendenze e script
├── tsconfig.json             # Configurazione TypeScript
└── README.md                 # Questa documentazione
```

## Troubleshooting

### Il Bridge non si avvia
- Verificare che le cartelle GDT input/output esistano
- Verificare che la porta (default 3000) sia libera
- Controllare i log in `logs/bridge.log`

### Il dispositivo non riceve i dati
- Verificare il percorso della cartella di input del dispositivo
- Verificare che il software del dispositivo sia configurato per leggere dalla stessa cartella
- Controllare la codifica del file GDT (deve essere ISO-8859-1)

### I risultati non arrivano alla webapp
- Verificare il `CALLBACK_URL` nel `.env`
- Verificare che l'API key sia corretta
- Controllare i log per errori di callback
- Il Bridge tenta 3 retry con backoff esponenziale

### File GDT non riconosciuto
- Verificare che il GDT-ID del dispositivo sia configurato correttamente
- Alcuni dispositivi richiedono un GDT-ID specifico (consultare il manuale)

## Sviluppo

```bash
# Dev con hot reload
npm run dev

# Build TypeScript
npm run build

# Eseguire build compilata
npm start

# Creare eseguibili standalone
npm run pkg
```

## Licenza

Proprietario — © ElementMedica. Tutti i diritti riservati.
