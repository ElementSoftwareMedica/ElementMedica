# Sistema Comunicazione Credenziali

**Versione**: 2.1.0  
**Data**: 2026-02-23  
**Progetto**: ElementMedica

---

## 📋 Panoramica

Questo documento descrive il sistema di comunicazione delle credenziali per nuovi account utente in ElementMedica. Il sistema supporta due metodi di comunicazione:

1. **Email automatica** - Per utenti con indirizzo email
2. **Scheda credenziali stampabile** - Per utenti senza email (PDF con QR code)

---

## 🎯 Problema Risolto

Quando vengono creati nuovi account (singolarmente o via import CSV), le password sono generate casualmente per sicurezza. Questo sistema permette di comunicare le credenziali in modo sicuro e user-friendly anche a utenti poco esperti con la tecnologia.

---

## 🏗️ Architettura

### Componenti Backend

```
backend/
├── services/
│   ├── credentials/
│   │   ├── CredentialsService.js      # Orchestrazione comunicazione
│   │   └── CredentialsCardService.js  # Generazione schede PDF
│   ├── emailService.js                # Template BENVENUTO_ACCOUNT
│   └── person/
│       ├── core/PersonCore.js         # Modificato per _temporaryPassword
│       └── utils/PersonUtils.js       # generateTemporaryPassword()
├── routes/
│   └── credentials-routes.js          # API endpoints
└── prisma/
    └── schema.prisma                  # Campo mustChangePassword
```

### Componenti Frontend

```
src/
├── components/
│   └── schedules/
│       └── components/
│           ├── ParticipantCredentialsCard.tsx   # Card compatta nella pagina corso
│           └── ParticipantCredentialsModal.tsx  # Modal gestione completa
└── pages/
    └── schedules/
        └── ScheduleDetailPage.tsx               # Integrazione card
```

### Schema Database

```prisma
model Person {
  // ... altri campi
  mustChangePassword Boolean @default(false)  // Nuovo campo
}
```

---

## 💻 UI Frontend

### ParticipantCredentialsCard

Card compatta che mostra un riepilogo:
- **Totale partecipanti**
- **Da attivare** (mai loggati)
- **Attivi** (già loggati)
- Pulsante **"Gestisci Credenziali"** per aprire il modal

### ParticipantCredentialsModal

Modal full-width con:
- **Tabella completa** di tutti i partecipanti
- **Checkbox** per selezione multipla
- **Editing inline** di email e cellulare
- **Stato** (Attivo / Mai loggato)
- **Azioni batch**:
  - Scarica Card (N) - genera file HTML stampabile
  - Invia Email (N) - invia credenziali via email
- **Azioni individuali**:
  - Modifica contatti
  - Scarica card singola
  - Invia email singola
  - Apri WhatsApp
  - Reset password

### Funzionalità speciali

- **Pre-selezione automatica**: solo utenti mai loggati sono pre-selezionati
- **Warning utenti attivi**: se selezioni utenti già attivi, vedi un avviso che invierai loro un reset password
- **Validazione email**: i pulsanti invio email sono disabilitati per utenti senza email

---

## 🔌 API Endpoints

### POST `/api/v1/credentials/reset/:personId`
Reset password e comunica nuove credenziali.

**Permessi richiesti**: `users:write`

**Risposta**:
```json
{
  "success": true,
  "method": "email|card",
  "emailSent": true,
  "cardGenerated": true,
  "message": "Nuove credenziali inviate via email"
}
```

### GET `/api/v1/credentials/card/:personId`
Genera e scarica scheda credenziali HTML (stampabile come PDF).

**Permessi richiesti**: `users:write`

**ATTENZIONE**: Questo endpoint genera una NUOVA password!

**Risposta**: File HTML per stampa/PDF

### POST `/api/v1/credentials/send-welcome/:personId`
Invia email di benvenuto a persona esistente.

**Body**:
```json
{
  "resetPassword": true  // Opzionale, default: true
}
```

### POST `/api/v1/credentials/preview-card`
Genera anteprima scheda credenziali (per test).

**Body**:
```json
{
  "firstName": "Mario",
  "lastName": "Rossi",
  "username": "mario.rossi",
  "temporaryPassword": "Tmp_abc123!",
  "roleType": "EMPLOYEE"
}
```

---

## 📧 Template Email

Il template `BENVENUTO_ACCOUNT` include:

- Nome completo dell'utente
- Username e password temporanea
- Link diretto al portale
- Istruzioni passo-passo
- Avviso sul cambio password obbligatorio

### Esempio Email

```
Benvenuto in ElementMedica!

Gentile Mario Rossi,

È stato creato un account per te.

LE TUE CREDENZIALI
==================
Username: mario.rossi
Password: Tmp_aB3dEf9Gh2!

IMPORTANTE: Al primo accesso dovrai cambiare la password.
```

---

## 🎴 Scheda Credenziali PDF

La scheda stampabile include:

- **Header**: Logo e nome organizzazione
- **Dati utente**: Nome, ruolo
- **Credenziali**: Username e password in box evidenziato
- **QR Code**: Link diretto al login (pre-compilato con username)
- **Istruzioni**: 4 step semplici per accedere
- **Avviso**: Conservare e distruggere dopo cambio password
- **Footer**: Data generazione e ID (per tracciabilità)

### Layout
- Formato: A5 landscape (ottimizzato per stampa)
- Stile: Clean, leggibile, colori brand
- Multiple cards: Page break automatico

---

## 🔄 Flusso di Utilizzo

### Creazione Singola Persona

```javascript
// PersonCore.createPerson restituisce _temporaryPassword
const person = await PersonCore.createPerson(data, roleType, companyId, tenantId);

// Comunica credenziali
const result = await CredentialsService.communicateCredentials(
  person,
  organization,
  tenantId
);

// result.method = 'email' o 'card'
// result.cardData = dati per generare PDF se necessario
```

### Import CSV Batch

```javascript
// Dopo l'import
const results = await CredentialsService.processBatchCredentials(
  importResults,      // Array di {person, _temporaryPassword}
  organization,
  tenantId,
  { sendEmails: true, generateCards: true }
);

// results.cardsHtml = HTML per download PDF batch
// results.summary.withEmail = numero utenti con email
// results.summary.printRequired = numero utenti che richiedono stampa
```

---

## 🖥️ Integrazione Frontend (Spec)

### Modale Post-Import

Dopo un import CSV con creazione account, mostrare:

```
╔════════════════════════════════════════════════════════╗
║  ✅ Import Completato                                  ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  👥 25 persone importate con successo                  ║
║                                                        ║
║  📧 CON EMAIL (18):                                    ║
║  ✓ Email di benvenuto inviata automaticamente         ║
║                                                        ║
║  📄 SENZA EMAIL (7):                                   ║
║  ⚠️ Devi stampare le schede credenziali              ║
║                                                        ║
║  ┌─────────────────────────────────────────────┐       ║
║  │  📥 Scarica Schede Credenziali (PDF)        │       ║
║  └─────────────────────────────────────────────┘       ║
║                                                        ║
║  ℹ️ Le schede contengono username, password e QR      ║
║     per accedere. Consegnale agli utenti.             ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

### Componenti Necessari

1. **CredentialsResultModal**: Modale post-import
2. **CredentialsDownloadButton**: Pulsante per scaricare PDF
3. **CredentialCard** (opzionale): Preview singola scheda

---

## 🔐 Sicurezza

### Password Temporanee

- **Formato**: `Tmp_<10 caratteri random base64url>!`
- **Esempio**: `Tmp_aB3dEf9Gh2!`
- **Caratteristiche**: Maiuscola, minuscola, numero, carattere speciale
- **Generazione**: `crypto.randomBytes()` (sicuro)

### Flag `mustChangePassword`

- Impostato a `true` per ogni account con password generata
- Frontend deve verificare e forzare cambio al primo login
- Resettato a `false` dopo cambio password riuscito

### GDPR Compliance

- Password in chiaro MAI salvate nel database
- Password in chiaro disponibili solo nel risultato della creazione
- Email mascherate nei log (`mar***@email.com`)
- Schede da distruggere dopo primo accesso

---

## 📊 Esempio Response Import con Credenziali

```json
{
  "success": true,
  "imported": 25,
  "credentials": {
    "summary": {
      "total": 25,
      "withEmail": 18,
      "withoutEmail": 7,
      "emailsSent": 18,
      "cardsGenerated": 25,
      "printRequired": 7
    },
    "withEmail": [
      {"personId": "...", "fullName": "Mario Rossi", "email": "mario@...", "username": "mario.rossi"}
    ],
    "withoutEmail": [
      {"personId": "...", "fullName": "Luigi Verdi", "username": "luigi.verdi"}
    ],
    "cardsHtml": "<html>...</html>"  // HTML per PDF batch
  }
}
```

---

## 🖥️ Integrazione Frontend

### Componente ParticipantCredentialsCard

Nella pagina dettaglio corso (`/schedules/:id`) è presente una card per la gestione delle credenziali dei partecipanti:

**File**: `src/components/schedules/components/ParticipantCredentialsCard.tsx`

**Funzionalità**:
- Visualizzazione statistiche (totale, mai loggati, già attivi)
- Download batch card credenziali (HTML stampabile)
- Invio batch email con credenziali
- Modifica inline email/cellulare partecipanti
- Reset password singolo partecipante
- Link WhatsApp diretto per comunicazione

**API utilizzate**:
- `POST /api/v1/credentials/participants-status` - Stato login partecipanti
- `POST /api/v1/credentials/batch-cards` - Download batch HTML
- `POST /api/v1/credentials/send-batch-welcome` - Invio email batch
- `GET /api/v1/credentials/card/:personId` - Card singola
- `POST /api/v1/credentials/send-welcome/:personId` - Email singola
- `POST /api/v1/credentials/reset/:personId` - Reset password

---

## 🧪 Testing

### Test Manuale

1. **Test Email**:
   - Crea persona con email
   - Verifica email ricevuta con credenziali
   - Verifica login con password temporanea
   - Verifica prompt cambio password

2. **Test Scheda**:
   - Crea persona senza email
   - Scarica scheda credenziali
   - Verifica QR code funzionante
   - Verifica login con credenziali stampate

3. **Test Import Batch**:
   - Importa CSV con mix di persone (con/senza email)
   - Verifica email inviate
   - Verifica PDF batch generato
   - Verifica tutte le credenziali funzionano

4. **Test Card Partecipanti Corso**:
   - Vai su `/schedules/:id`
   - Verifica visualizzazione card credenziali sotto Test
   - Scarica batch card
   - Invia email batch
   - Modifica contatti partecipante

---

## 📚 File Correlati

| File | Descrizione |
|------|-------------|
| [emailService.js](../../backend/services/emailService.js) | Template BENVENUTO_ACCOUNT |
| [CredentialsService.js](../../backend/services/credentials/CredentialsService.js) | Orchestrazione |
| [CredentialsCardService.js](../../backend/services/credentials/CredentialsCardService.js) | Generazione PDF |
| [credentials-routes.js](../../backend/routes/credentials-routes.js) | API endpoints |
| [PersonCore.js](../../backend/services/person/core/PersonCore.js) | _temporaryPassword |
| [PersonUtils.js](../../backend/services/person/utils/PersonUtils.js) | generateTemporaryPassword |
| [ParticipantCredentialsCard.tsx](../../src/components/schedules/components/ParticipantCredentialsCard.tsx) | Frontend card |

---

*Documentazione aggiornata il 2026-02-03*
