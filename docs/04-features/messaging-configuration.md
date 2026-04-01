# Configurazione Messaggistica

**Versione**: 5.0.0
**Data**: 2026-02-18
**Progetto**: ElementMedica

---

## 📋 Panoramica

Questo documento descrive il sistema di configurazione della messaggistica per tenant. Permette a ogni organizzazione di configurare i propri canali di comunicazione:

1. **Email SMTP** - Server email con dominio proprio (multi-branch)
2. **WhatsApp Business API** - Integrazione per messaggistica WhatsApp (**modello centralizzato**)
3. **SMS** - Invio SMS tramite Twilio (**modello centralizzato**)
4. **PEC** - Posta Elettronica Certificata per comunicazioni ufficiali
5. **Routing** - Configurazione per tipo di comunicazione

---

## 🎯 Modello di Billing

### Modello Centralizzato (WhatsApp/SMS)

Le credenziali Twilio sono gestite **centralmente da ElementMedica**:
- I tenant **NON** configurano accessToken o businessAccountId
- I tenant possono solo configurare il proprio `phoneNumberId` (opzionale)
- La fatturazione Twilio è **centralizzata e forfettaria**
- ElementMedica gestisce i costi e applica pricing forfettario ai tenant

---

## 🎯 Caso d'Uso

Le organizzazioni possono utilizzare il proprio dominio email (es. `noreply@miodominio.it`) invece di un servizio centralizzato. Questo aumenta la deliverability delle email e migliora il branding.

### Multi-Branch Support

È possibile configurare SMTP e WhatsApp separati per ogni branch:
- **FORMAZIONE** (ElementSicurezza) - Corsi sicurezza sul lavoro
- **CLINICA** (ElementMedica) - Medicina del lavoro
- **default** - Configurazione condivisa

### Routing per Tipo Comunicazione

Ogni tipo di comunicazione può essere instradato verso un branch specifico:
- **Fatture Corsi** → FORMAZIONE
- **Attestati** → FORMAZIONE
- **Referti Medici** → CLINICA
- **Credenziali** → default
- **Appuntamenti** → CLINICA
- **Marketing** → default (newsletter, comunicazioni brand)
- **Promozionali** → default (offerte, sconti)
- **Generiche** → default

---

## 🏗️ Architettura

### Componenti

```
backend/
├── routes/
│   └── messaging-routes.js          # API endpoints SMTP/WhatsApp/Routing
├── controllers/
│   └── clinica/
│       └── PecConfigController.ts   # API endpoints PEC
├── servers/
│   └── api-server.js                # Mount delle routes
└── config/
    └── prisma-optimization.js       # Configurazione in Tenant.settings

src/
└── pages/
    └── settings/
        └── MessagingConfigPage.tsx  # UI unificata (SMTP, WhatsApp, PEC, Routing)
    └── management/
        └── ManagementRouter.tsx     # Route /management/messaging
```

### Accesso

La pagina di configurazione è accessibile da:
- **Management → Config → Messaggistica** (percorso: `/management/config#messaging`)
- `/management/messaging` redirige a `/management/config#messaging`
- Hub: `ManagementConfigHub.tsx`

### Storage Configurazione

La configurazione è salvata nel campo `settings` del modello `Tenant` (JSON):

```json
{
  "smtp": {
    "FORMAZIONE": {
      "host": "smtp.sicurezza.it",
      "port": 587,
      "secure": true,
      "username": "noreply@sicurezza.it",
      "password": "encrypted:...",
      "fromEmail": "noreply@sicurezza.it",
      "fromName": "ElementSicurezza",
      "enabled": true
    },
    "CLINICA": {
      "host": "smtp.medica.it",
      "port": 587,
      "secure": true,
      "username": "noreply@medica.it",
      "password": "encrypted:...",
      "fromEmail": "noreply@medica.it",
      "fromName": "ElementMedica",
      "enabled": true
    },
    "default": {
      "host": "smtp.elemento.it",
      "port": 587,
      "secure": true,
      "username": "noreply@elemento.it",
      "password": "encrypted:...",
      "fromEmail": "noreply@elemento.it",
      "fromName": "ElementMedica",
      "enabled": true
    }
  },
  "whatsapp": {
    "FORMAZIONE": {
      "phoneNumberId": "",
      "enabled": true
    },
    "CLINICA": {
      "phoneNumberId": "123456789012345",
      "enabled": true
    },
    "default": {
      "phoneNumberId": "",
      "enabled": false
    }
  },
  "pec": {
    "provider": "ARUBA",
    "host": "smtps.pec.aruba.it",
    "port": 465,
    "secure": true,
    "pecAddress": "azienda@pec.it",
    "password": "encrypted:...",
    "senderName": "ElementMedica - Medicina del Lavoro",
    "enabled": true
  },
  "messagingRouting": {
    "INVOICES_COURSES": { "smtpBranch": "FORMAZIONE", "whatsappBranch": "default", "pecEnabled": false },
    "CERTIFICATES": { "smtpBranch": "FORMAZIONE", "whatsappBranch": "default", "pecEnabled": false },
    "MEDICAL_REPORTS": { "smtpBranch": "CLINICA", "whatsappBranch": "CLINICA", "pecEnabled": true },
    "CREDENTIALS": { "smtpBranch": "default", "whatsappBranch": "default", "pecEnabled": false },
    "APPOINTMENTS": { "smtpBranch": "CLINICA", "whatsappBranch": "CLINICA", "pecEnabled": false },
    "MARKETING": { "smtpBranch": "default", "whatsappBranch": "default", "pecEnabled": false },
    "PROMOTIONAL": { "smtpBranch": "default", "whatsappBranch": "default", "pecEnabled": false },
    "GENERAL": { "smtpBranch": "default", "whatsappBranch": "default", "pecEnabled": false }
  }
}
```

---

## 🔌 API Endpoints

### SMTP

#### GET `/api/v1/messaging/smtp/config`
Recupera la configurazione SMTP del tenant.

**Permessi**: `settings:read`

**Risposta**:
```json
{
  "success": true,
  "data": {
    "host": "smtp.miodominio.it",
    "port": 587,
    "secure": true,
    "username": "noreply@miodominio.it",
    "fromEmail": "noreply@miodominio.it",
    "fromName": "ElementMedica",
    "enabled": true,
    "hasPassword": true
  }
}
```

#### POST `/api/v1/messaging/smtp/config`
Salva la configurazione SMTP.

**Permessi**: `settings:write`

**Body**:
```json
{
  "host": "smtp.miodominio.it",
  "port": 587,
  "secure": true,
  "username": "noreply@miodominio.it",
  "password": "password-smtp",
  "fromEmail": "noreply@miodominio.it",
  "fromName": "ElementMedica",
  "enabled": true
}
```

#### DELETE `/api/v1/messaging/smtp/config`
Elimina la configurazione SMTP.

**Permessi**: `settings:write`

#### POST `/api/v1/messaging/smtp/test`
Invia email di test.

**Permessi**: `settings:write`

**Body**:
```json
{
  "email": "test@esempio.com"
}
```

### WhatsApp

> **MODELLO CENTRALIZZATO**: Le credenziali Twilio (accessToken, businessAccountId) sono gestite centralmente da ElementMedica. I tenant possono solo configurare il proprio numero WhatsApp Business (phoneNumberId) se ne hanno uno personale. La fatturazione Twilio è centralizzata e gestita forfettariamente.

#### GET `/api/v1/messaging/whatsapp/config`
Recupera la configurazione WhatsApp.

**Permessi**: `settings:read`

**Risposta**:
```json
{
  "success": true,
  "data": {
    "phoneNumberId": "123456789012345",
    "enabled": true
  },
  "centralizedBilling": true
}
```

#### POST `/api/v1/messaging/whatsapp/config`
Salva la configurazione WhatsApp.

**Permessi**: `settings:write`

**Body** (semplificato - modello centralizzato):
```json
{
  "phoneNumberId": "123456789012345",
  "enabled": true
}
```

> **Nota**: `phoneNumberId` è opzionale. Se non specificato, viene usato il numero predefinito di ElementMedica.

#### DELETE `/api/v1/messaging/whatsapp/config`
Elimina la configurazione WhatsApp.

**Permessi**: `settings:write`

#### POST `/api/v1/messaging/whatsapp/test`
Invia messaggio WhatsApp di test.

**Permessi**: `settings:write`

**Body**:
```json
{
  "phoneNumber": "+393331234567"
}
```

### Status

#### GET `/api/v1/messaging/status`
Ottiene lo stato di tutte le configurazioni.

**Permessi**: `settings:read`

**Risposta**:
```json
{
  "success": true,
  "data": {
    "smtp": {
      "configured": true,
      "enabled": true,
      "ready": true
    },
    "whatsapp": {
      "configured": true,
      "enabled": false,
      "ready": false
    }
  }
}
```

### Routing

#### GET `/api/v1/messaging/routing`
Ottiene la configurazione di routing per tipo comunicazione.

**Permessi**: `settings:read`

**Risposta**:
```json
{
  "success": true,
  "data": {
    "INVOICES_COURSES": { "smtpBranch": "FORMAZIONE", "whatsappBranch": "default", "pecEnabled": false },
    "CERTIFICATES": { "smtpBranch": "FORMAZIONE", "whatsappBranch": "default", "pecEnabled": false },
    "MEDICAL_REPORTS": { "smtpBranch": "CLINICA", "whatsappBranch": "CLINICA", "pecEnabled": true },
    "CREDENTIALS": { "smtpBranch": "default", "whatsappBranch": "default", "pecEnabled": false },
    "APPOINTMENTS": { "smtpBranch": "CLINICA", "whatsappBranch": "CLINICA", "pecEnabled": false },
    "MARKETING": { "smtpBranch": "default", "whatsappBranch": "default", "pecEnabled": false },
    "PROMOTIONAL": { "smtpBranch": "default", "whatsappBranch": "default", "pecEnabled": false },
    "GENERAL": { "smtpBranch": "default", "whatsappBranch": "default", "pecEnabled": false }
  },
  "availableBranches": ["FORMAZIONE", "CLINICA", "default"],
  "communicationTypes": ["INVOICES_COURSES", "CERTIFICATES", "MEDICAL_REPORTS", "CREDENTIALS", "APPOINTMENTS", "MARKETING", "PROMOTIONAL", "GENERAL"]
}
```

#### POST `/api/v1/messaging/routing`
Salva routing per un singolo tipo comunicazione.

**Permessi**: `settings:write`

**Body**:
```json
{
  "communicationType": "INVOICES_COURSES",
  "smtpBranch": "FORMAZIONE",
  "whatsappBranch": "default",
  "pecEnabled": false
}
```

#### PUT `/api/v1/messaging/routing/bulk`
Aggiorna tutte le configurazioni routing in bulk.

**Permessi**: `settings:write`

**Body**:
```json
{
  "routing": {
    "INVOICES_COURSES": { "smtpBranch": "FORMAZIONE", "whatsappBranch": "default", "pecEnabled": false },
    "CERTIFICATES": { "smtpBranch": "FORMAZIONE", "whatsappBranch": "default", "pecEnabled": false },
    ...
  }
}
```

---

## 🖥️ Frontend

### Pagina di Configurazione

**URL**: `/management/messaging`

**File**: `src/pages/settings/MessagingConfigPage.tsx`

La pagina presenta quattro tab:

1. **Email SMTP**
   - Selezione branch (FORMAZIONE/CLINICA/default)
   - Configurazione server (host, porta, TLS)
   - Credenziali (username, password)
   - Mittente (email, nome)
   - Test connessione
   - Abilita/disabilita

2. **WhatsApp Business**
   - Selezione branch (FORMAZIONE/CLINICA/default)
   - Phone Number ID
   - Access Token
   - Business Account ID
   - Webhook Verify Token
   - Test invio
   - Abilita/disabilita

3. **PEC**
   - Provider (Aruba, Legalmail, etc.)
   - Indirizzo PEC
   - Credenziali
   - Test connessione
   - Modalità test

4. **Routing**
   - Per ogni tipo comunicazione:
     - SMTP branch da usare
     - WhatsApp branch da usare
     - Abilitazione PEC

---

## 🔐 Sicurezza

### Crittografia Password

Le password e i token sensibili sono crittografati prima di essere salvati:

```javascript
// Algoritmo: AES-256-CBC
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const encrypted = encrypt(password);  // "iv:encryptedData"
const decrypted = decrypt(encrypted);
```

**IMPORTANTE**: `ENCRYPTION_KEY` deve essere una stringa hex da **64 caratteri** (= 32 byte AES-256). Usare `Buffer.from(key, "hex")` nel codice. Generare con:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Permessi

- `settings:read` - Lettura configurazione
- `settings:write` - Modifica configurazione

---

## 📧 Guida Configurazione SMTP

### Cosa inserire nei campi

| Campo | Descrizione | Dove trovarlo |
|-------|-------------|---------------|
| **Host SMTP** | Indirizzo server SMTP | Documentazione del provider email |
| **Porta** | 587 (TLS/STARTTLS) o 465 (SSL) | Documentazione del provider |
| **Username** | Email completa dell'account | L'indirizzo email usato per accedere |
| **Password** | Password account o App Password | Impostazioni account email |
| **Email mittente** | Indirizzo "Da" nelle email | Generalmente uguale allo Username |

### Esempi per Provider Comuni

#### Gmail / Google Workspace
```
Host: smtp.gmail.com
Porta: 587
Connessione sicura: STARTTLS (non attiva switch)
Username: tuaemail@gmail.com (o @tuodominio.com per Workspace)
Password: App Password (vedi sotto)
```

⚠️ **Gmail richiede App Password** se hai 2FA attivo:
1. Vai su https://myaccount.google.com/security
2. Clicca "Password per le app"
3. Genera una password specifica per "Posta"

#### Microsoft 365 / Outlook
```
Host: smtp.office365.com
Porta: 587
Connessione sicura: STARTTLS (non attiva switch)
Username: tuaemail@outlook.com (o @tuodominio.com)
Password: App Password se 2FA attivo
```

#### Aruba
```
Host: smtps.aruba.it (oppure smtp.aruba.it)
Porta: 465 (SSL) o 587 (TLS)
Connessione sicura: Attiva per porta 465
Username: casella@tuodominio.it
Password: Password casella email
```

#### Register.it
```
Host: smtp.register.it
Porta: 587
Connessione sicura: TLS
Username: casella@tuodominio.it
Password: Password casella email
```

#### Hosting generico (cPanel)
```
Host: mail.tuodominio.it
Porta: 587
Username: noreply@tuodominio.it
Password: Password della casella
```

### Troubleshooting

| Errore | Causa Probabile | Soluzione |
|--------|-----------------|-----------|
| Connection refused | Porta bloccata | Prova porta alternativa (587/465) |
| Authentication failed | Credenziali errate | Verifica username/password, usa App Password se 2FA |
| TLS handshake error | Impostazione TLS errata | Prova a cambiare switch "Connessione sicura" |
| Timeout | Firewall/antivirus | Verifica che le porte non siano bloccate |

---

## 📱 WhatsApp Business API

### Prerequisiti

1. Account Meta Business verificato
2. App registrata su developers.facebook.com
3. WhatsApp Business API configurata
4. Phone Number ID e Access Token generati

### Configurazione Meta

1. Vai su [Meta for Developers](https://developers.facebook.com)
2. Crea una nuova app (tipo: Business)
3. Aggiungi il prodotto WhatsApp
4. Configura il numero di telefono business
5. Genera un Access Token permanente
6. Copia Phone Number ID e Business Account ID

### Template Messaggi

Per messaggi automatici (non di risposta) è necessario creare template approvati da Meta:

1. Vai su WhatsApp Manager
2. Crea nuovo template messaggio
3. Attendi approvazione (24-48h)
4. Usa il template ID nel codice

### 💰 Ottimizzazione Costi WhatsApp

Meta fattura WhatsApp Business API **per conversazione**, non per messaggio. È importante comprendere la struttura tariffaria per ottimizzare i costi.

#### Modello di Pricing Meta

| Categoria | Descrizione | Costo (Italia, ~) |
|-----------|-------------|-------------------|
| **Marketing** | Promozioni, offerte, newsletter | €0.0504/conversazione |
| **Utility** | Conferme ordini, spedizioni, transazioni | €0.0151/conversazione |
| **Authentication** | OTP, verifica account | €0.0131/conversazione |
| **Service** | Risposte utente entro 24h | GRATIS |

> ⚠️ I prezzi sono indicativi e variano per paese. Consulta la [pricing page ufficiale](https://developers.facebook.com/docs/whatsapp/pricing).

#### Cos'è una Conversazione?

Una **conversazione** = finestra di 24 ore in cui puoi inviare messaggi illimitati.

- **Business-initiated**: Messaggi che avvii tu (template approvato richiesto)
- **User-initiated**: Risposte a messaggi dell'utente (entro 24h = gratis come "service")

#### Best Practice per Ridurre i Costi

1. **Raggruppa i messaggi**
   - Se devi inviare più info allo stesso utente, fallo in una sola conversazione
   - Apri la conversazione e invia tutto entro 24h

2. **Usa la categoria corretta**
   - Evita template "Marketing" per conferme ordini → usa "Utility"
   - Evita "Marketing" per OTP → usa "Authentication"

3. **Sfrutta le risposte utente**
   - Se l'utente risponde, hai 24h gratis per messaggiare
   - Incentiva l'interazione dove appropriato

4. **Template intelligenti**
   - Combina più informazioni in un template unico
   - Usa variabili per personalizzare senza creare template multipli

5. **Scheduling intelligente**
   - Batch di invii nello stesso slot temporale
   - Evita conversazioni multiple per lo stesso utente nello stesso giorno

#### Esempio Pratico

**Scenario**: Conferma appuntamento + promemoria 24h prima

❌ **Costoso** (2 conversazioni = ~€0.03):
- Giorno 1: Conferma appuntamento
- Giorno 3: Promemoria

✅ **Ottimizzato** (1 conversazione = ~€0.015):
- Giorno 1: Conferma con info + "Ti ricorderemo domani"
- Giorno 2: Promemoria (entro 24h dalla conferma)

#### Monitoraggio Costi

Meta Business Suite fornisce analytics:
- Numero conversazioni per categoria
- Costo stimato mensile
- Performance template

**Consiglio**: Imposta alert di spesa mensile su Meta Business Suite.

---

## 🏢 WhatsApp/SMS per Multi-Tenant (Feature Commerciale)

### Provider Consigliati per Multi-Tenant

Per vendere la funzionalità WhatsApp/SMS come feature a tenant, consigliamo questi provider con configurazione semplice:

| Provider | Canali | Pro | Contro | Setup Tenant |
|----------|--------|-----|--------|--------------|
| **Twilio** ⭐ | SMS + WhatsApp | Sub-account per tenant, dashboard intuitiva, API unificata | Costo medio | 5 minuti |
| **360dialog** | WhatsApp | BSP ufficiale, pricing basso | Solo WhatsApp | 10 minuti |
| **MessageBird** | SMS + WhatsApp | Europeo, GDPR-friendly | Meno documentato | 5 minuti |
| **Meta Direct** | WhatsApp | Costi più bassi | Setup complesso | 30+ minuti |

### Modello di Configurazione Semplificato

Per un'esperienza utente ottimale, il sistema supporta due modalità:

#### 1. Modalità "Gestita" (Consigliata per PMI)
- Il tenant usa le credenziali master di ElementMedica
- Nessuna configurazione richiesta
- Fatturazione per messaggio inclusa nel canone
- Setup: **0 minuti**

```json
{
  "messagingMode": "managed",
  "billingIncluded": true
}
```

#### 2. Modalità "BYOC" (Bring Your Own Credentials)
- Il tenant configura le proprie credenziali Twilio/360dialog
- Costi messaggi diretti al tenant
- Maggiore controllo e branding
- Setup: **5-10 minuti**

```json
{
  "messagingMode": "byoc",
  "provider": "twilio",
  "accountSid": "ACxxxxxxxx",
  "authToken": "xxxxxxxx",
  "phoneNumber": "+39xxxxx"
}
```

### Setup Tenant con Twilio (Raccomandato)

1. **Admin ElementMedica** crea sub-account Twilio per il tenant
2. **Tenant** riceve credenziali via email sicura
3. **Tenant** inserisce credenziali nella UI MessagingConfigPage
4. **Sistema** valida automaticamente e abilita il servizio

### API per Abilitazione Feature

```bash
# Abilita feature messaging per tenant
POST /api/v1/tenants/:tenantId/features
{
  "featureKey": "WHATSAPP_MESSAGING",
  "enabled": true,
  "config": {
    "mode": "managed",
    "monthlyQuota": 1000
  }
}
```

### Pricing Suggerito per Rivendita

| Piano | Messaggi/mese | Prezzo suggerito |
|-------|---------------|------------------|
| Starter | 100 | €9.90/mese |
| Business | 500 | €29.90/mese |
| Enterprise | 2000 | €79.90/mese |
| Unlimited | ∞ | Su richiesta |

---

## 🧪 Testing

### Test SMTP

1. Configura server SMTP
2. Inserisci email di test
3. Clicca "Test"
4. Verifica ricezione email

### Test WhatsApp

1. Configura credenziali API
2. Inserisci numero (formato internazionale)
3. Clicca "Test"
4. Verifica ricezione messaggio

### Common Issues

| Problema | Soluzione |
|----------|-----------|
| Email non inviata | Verificare porta/TLS, controllare firewall |
| Auth failed SMTP | Verificare username/password, abilitare SMTP nel provider |
| WhatsApp 401 | Access token scaduto, rigenerare |
| WhatsApp template error | Usare solo template approvati |

---

## 📚 File Correlati

| File | Descrizione |
|------|-------------|
| [messaging-routes.js](../../backend/routes/messaging-routes.js) | API endpoints |
| [api-server.js](../../backend/servers/api-server.js) | Mount routes |
| [MessagingConfigPage.tsx](../../src/pages/settings/MessagingConfigPage.tsx) | UI configurazione |
| [App.tsx](../../src/App.tsx) | Route `/settings/messaging` |

---

*Documentazione aggiornata il 2026-02-03*
