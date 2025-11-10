# Admin Manual - Sistema Unificato Person

**Versione:** 2.0 Post-Refactoring  
**Data:** 25 Gennaio 2025  
**Sistema:** GDPR-Compliant Person Management System

## 📋 Panoramica

Benvenuto nel Manuale Amministratore del Sistema Unificato Person. Questa guida ti fornirà tutte le informazioni necessarie per amministrare efficacemente il sistema GDPR-compliant, gestire persone, ruoli, permessi e monitorare la conformità.

## 🔐 Accesso Amministrativo

## 🔐 Accesso Amministrativo

### 🌐 Sistema di Routing Avanzato

Il sistema utilizza un **routing avanzato centralizzato** con versioning API automatico:

#### Endpoint Principali
- **Frontend:** `http://localhost:4003` (Proxy Server)
- **API v1:** `http://localhost:4003/api/v1/*` (Legacy compatibility)
- **API v2:** `http://localhost:4003/api/v2/*` (Nuove funzionalità)
- **Diagnostica:** `http://localhost:4003/routes` (Solo admin)

#### Legacy Redirects Automatici
Il sistema gestisce automaticamente i redirect legacy:
- `http://localhost:4003/login` → `http://localhost:4003/api/v1/auth/login`
- `http://localhost:4003/logout` → `http://localhost:4003/api/v1/auth/logout`
- `http://localhost:4003/dashboard` → `http://localhost:4003/api/v1/dashboard`

#### Endpoint Diagnostici (Solo Admin)
```bash
# Stato sistema routing
GET http://localhost:4003/routes/health

# Statistiche routing
GET http://localhost:4003/routes/stats

# Configurazione completa
GET http://localhost:4003/routes/config

# Lista tutte le route
GET http://localhost:4003/routes
```

#### Versioning API Automatico
Il sistema aggiunge automaticamente l'header `x-api-version` a tutte le richieste:
- Richieste a `/api/v1/*` → Header `x-api-version: v1`
- Richieste a `/api/v2/*` → Header `x-api-version: v2`

### 🔑 Credenziali Test Standard (OBBLIGATORIE)

**Per accesso amministrativo completo:**
- **Email:** `admin@example.com`
- **Password:** `Admin123!`
- **Ruolo:** ADMIN (accesso completo al sistema)
- **Permessi:** Gestione completa di Person, Company, Course, Documents

⚠️ **REGOLE CRITICHE**:
- Queste credenziali sono per testing/sviluppo ESCLUSIVAMENTE
- **DIVIETO ASSOLUTO**: NON modificare senza autorizzazione esplicita del proprietario
- **ATTENZIONE MASSIMA**: Testare sempre le modifiche al sistema di autenticazione con queste credenziali

### Login Amministratore

1. **Accesso al Sistema**
   - URL: `http://localhost:4003` (ambiente di sviluppo)
   - Utilizza credenziali standard sopra indicate
   - Sistema JWT con refresh token automatico

2. **Dashboard Amministrativa**
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ 🛡️ Sistema Person GDPR                     [👤] [🚪]        │
   ├─────────────────────────────────────────────────────────────┤
   │ 👥 Persone │ 🏢 Aziende │ 📚 Corsi │ 📊 Analytics │ 🔒 GDPR │
   ├─────────────────────────────────────────────────────────────┤
   │                                                             │
   │  📊 Panoramica Sistema                                      │
   │  ┌─────────────────┐  ┌─────────────────┐                 │
   │  │ Persone Attive  │  │ Audit Logs      │                 │
   │  │ 👥 1,247        │  │ 📋 15,678 eventi│                 │
   │  │ 📈 +12 oggi     │  │ 🔒 GDPR compliant│                 │
   │  └─────────────────┘  └─────────────────┘                 │
   │                                                             │
   │  ┌─────────────────┐  ┌─────────────────┐                 │
   │  │ Corsi Attivi    │  │ Consensi GDPR   │                 │
   │  │ 📚 45 corsi     │  │ ✅ 98% conformi  │                 │
   │  │ 🎓 156 iscritti │  │ ⚠️ 2% da rinnovare│                │
   │  └─────────────────┘  └─────────────────┘                 │
   └─────────────────────────────────────────────────────────────┘
   ```

### Ruoli Sistema Person

#### ADMIN
- **Gestione completa del sistema**
- Accesso a tutte le entità (Person, Company, Course)
- Configurazione permessi e ruoli
- Accesso completo ai dati GDPR
- Gestione audit logs e conformità

#### MANAGER
- **Gestione operativa**
- Gestione persone e corsi
- Visualizzazione aziende
- Accesso limitato ai dati GDPR
- Report e analytics

#### TRAINER
- **Gestione formazione**
- Gestione corsi assegnati
- Visualizzazione partecipanti
- Creazione materiali formativi

#### EMPLOYEE
- **Accesso base**
- Visualizzazione propri dati
- Partecipazione ai corsi
- Gestione consensi GDPR personali

## 👥 Gestione Persone (GDPR-Compliant)

### Creazione Persone

#### Creazione Singola Persona
1. Vai in "👥 Gestione Persone" → "➕ Nuova Persona"
2. Compila il form GDPR-compliant:
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ ➕ Nuova Persona (GDPR-Compliant)                          │
   ├─────────────────────────────────────────────────────────────┤
   │ Nome: [________________]  Cognome: [________________]       │
   │ Email: [_________________________________________]          │
   │ Telefono: [_________________]                              │
   │ Ruolo: [EMPLOYEE ▼] [MANAGER] [TRAINER] [ADMIN]           │
   │                                                             │
   │ 🔒 Consensi GDPR (Obbligatori)                            │
   │ ☑️ Consenso trattamento dati essenziali                   │
   │ ☐ Consenso marketing                                       │
   │ ☐ Consenso profilazione                                    │
   │ ☐ Consenso terze parti                                     │
   │                                                             │
   │ 📅 Data Retention: [7 anni ▼]                             │
   │ 🏢 Azienda: [Seleziona Azienda ▼]                         │
   │ 📝 Note: [_________________________]                       │
   │                                                             │
   │ [Annulla] [Crea Persona]                                   │
   └─────────────────────────────────────────────────────────────┘
   ```

#### Importazione CSV GDPR-Compliant
1. Vai in "👥 Gestione Persone" → "📤 Importa da CSV"
2. Scarica il template CSV GDPR
3. Compila il file con i dati persone:
   ```csv
   nome,cognome,email,telefono,ruolo,azienda_id,consenso_essenziale,data_retention_anni
   Mario,Rossi,mario.rossi@company.com,+39123456789,EMPLOYEE,1,true,7
   Anna,Bianchi,anna.bianchi@company.com,+39987654321,MANAGER,1,true,7
   ```
4. Carica il file CSV
5. Verifica anteprima con controlli GDPR
6. Conferma importazione con audit log automatico

### Gestione Persone Esistenti

#### Lista Persone (GDPREntityTemplate)
```
┌─────────────────────────────────────────────────────────────┐
│ 👥 Gestione Persone                   [🔍] [📤] [➕]        │
├─────────────────────────────────────────────────────────────┤
│ [📊 Tabella] [🔲 Griglia]  [➕ Aggiungi ▼] [📥 Importa CSV] │
│ [🔍 Filtra] [📋 Colonne] [✏️ Modifica Batch]               │
├─────────────────────────────────────────────────────────────┤
│ ☐ │Nome           │Email              │Ruolo    │Stato    │
│ ☐ │Mario Rossi    │mario@company.com  │EMPLOYEE │🟢 Attivo│
│ ☐ │Anna Bianchi   │anna@company.com   │MANAGER  │🟢 Attivo│
│ ☐ │Luca Verdi     │luca@company.com   │TRAINER  │🔴 Sospeso│
│ ☐ │Sara Neri      │sara@company.com   │EMPLOYEE │🟡 Consensi│
└─────────────────────────────────────────────────────────────┘

Legenda Stati:
🟢 Attivo    🔴 Sospeso    🟡 Consensi da rinnovare    ⏸️ In attesa attivazione
```

#### Azioni Utente

**Modifica Persona (GDPR-Compliant):**
1. Clicca sulla persona dalla lista
2. Modifica informazioni con tracciamento:
   - Dati anagrafici (audit automatico)
   - Ruolo e permessi
   - Consensi GDPR
   - Data retention
3. Salva con log automatico

**Gestione Consensi GDPR:**
1. Seleziona persona
2. Clicca "🔒 Gestisci Consensi"
3. Aggiorna consensi:
   - Consenso essenziale (obbligatorio)
   - Consenso marketing
   - Consenso profilazione
   - Consenso terze parti
4. Registrazione automatica audit trail

**Sospensione/Riattivazione (Soft Delete):**
1. Seleziona persona
2. Clicca "⏸️ Sospendi" (soft delete) o "▶️ Riattiva"
3. Aggiungi motivo GDPR
4. Conferma con tracciamento

**Eliminazione Persona (Right to be Forgotten):**
1. Seleziona persona
2. Clicca "🗑️ Elimina (GDPR)"
3. **⚠️ ATTENZIONE GDPR:** Verifica:
   - Data retention scaduta
   - Consensi revocati
   - Obblighi legali rispettati
4. Conferma digitando "ELIMINA GDPR"

### Gestione Corsi (GDPR-Compliant)

#### Creazione Corsi
1. Vai in "📚 Gestione Corsi" → "➕ Nuovo Corso"
2. Clicca "➕ Nuovo Corso"
3. Configura corso GDPR:
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ ➕ Nuovo Corso (GDPR-Compliant)                            │
   ├─────────────────────────────────────────────────────────────┤
   │ Nome Corso: [_________________________]                     │
   │ Descrizione: [_________________________]                    │
   │ Categoria: [Formazione Obbligatoria ▼]                    │
   │ Durata: [8___] ore                                         │
   │                                                             │
   │ 🔒 Consensi GDPR Corso                                     │
   │ ☑️ Consenso partecipazione                                 │
   │ ☐ Consenso registrazione                                   │
   │ ☐ Consenso certificazione                                  │
   │ ☐ Consenso valutazione                                     │
   │                                                             │
   │ 👥 Partecipanti                                            │
   │ [Aggiungi Persone...]                                      │
   │                                                             │
   │ 📅 Data Retention: [5 anni ▼]                             │
   │                                                             │
   │ [Annulla] [Crea Corso]                                     │
   └─────────────────────────────────────────────────────────────┘
   ```

#### Gestione Partecipanti
1. Seleziona corso dalla lista
2. Vai alla tab "👥 Partecipanti"
3. Gestisci iscrizioni:
   - Cerca persone disponibili
   - Verifica consensi GDPR
   - Traccia partecipazione con audit log

## 🏢 Gestione Aziende (GDPR-Compliant)

### Creazione Aziende

#### Nuova Azienda
1. Vai in "🏢 Gestione Aziende" → "➕ Nuova Azienda"
2. Configura azienda GDPR:
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ ➕ Nuova Azienda (GDPR-Compliant)                          │
   ├─────────────────────────────────────────────────────────────┤
   │ Nome Azienda: [_________________________]                   │
   │ Codice Fiscale: [_________________________]                 │
   │ Partita IVA: [_________________________]                    │
   │ Indirizzo: [_________________________]                      │
   │ Email: [_________________________]                          │
   │ Telefono: [_________________________]                       │
   │                                                             │
   │ 🔒 Consensi GDPR Azienda                                   │
   │ ☑️ Consenso trattamento dati aziendali                    │
   │ ☐ Consenso marketing B2B                                   │
   │ ☐ Consenso profilazione commerciale                        │
   │ ☐ Consenso condivisione con terze parti                    │
   │                                                             │
   │ 📅 Data Retention: [10 anni ▼]                            │
   │ 🷚 Settore: [Tecnologia ▼]                                │
   │ 👥 Numero Dipendenti: [50___]                              │
   │                                                             │
   │ [Annulla] [Crea Azienda]                                   │
   └─────────────────────────────────────────────────────────────┘
   ```

### Configurazione Tenant

#### Impostazioni Generali
```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Configurazione Tenant: Acme Corp                        │
├─────────────────────────────────────────────────────────────┤
│ 📋 Informazioni Base                                       │
│ Nome: [Acme Corporation_____________]                       │
│ Dominio: [acme.yourdomain.com_______]                      │
│ Stato: [🟢 Attivo ▼]                                       │
│ Piano: [Enterprise ▼]                                      │
│                                                             │
│ 📊 Utilizzo Corrente                                       │
│ Utenti: 45 / 100 (45%)                                     │
│ Spazio: 23.5 GB / 50 GB (47%)                              │
│ Documenti: 3,456 / 10,000 (35%)                            │
│ Bandwidth: 12.3 GB / 100 GB (12%)                          │
│                                                             │
│ 🎨 Branding                                                │
│ Logo: [🖼️ logo-acme.png] [Cambia...]                      │
│ Colore Primario: [#1f2937] [🎨]                            │
│ Colore Secondario: [#3b82f6] [🎨]                          │
│ Favicon: [🖼️ favicon.ico] [Cambia...]                     │
└─────────────────────────────────────────────────────────────┘
```

#### Impostazioni Sicurezza
```
┌─────────────────────────────────────────────────────────────┐
│ 🔒 Sicurezza Tenant                                        │
├─────────────────────────────────────────────────────────────┤
│ 🔐 Autenticazione                                          │
│ ☑️ 2FA Obbligatorio per Admin                              │
│ ☐ 2FA Obbligatorio per tutti gli utenti                   │
│ ☑️ Scadenza password (90 giorni)                           │
│ ☐ Blocco account dopo 5 tentativi falliti                 │
│                                                             │
│ 🌐 Restrizioni Accesso                                     │
│ ☑️ Restrizioni IP abilitate                                │
│ IP Consentiti: [192.168.1.0/24_____] [➕]                  │
│                [10.0.0.0/8__________] [🗑️]                 │
│                                                             │
│ 🔗 Single Sign-On (SSO)                                    │
│ Provider: [Azure AD ▼]                                     │
│ ☑️ SSO Abilitato                                           │
│ Client ID: [abc123...] [👁️]                               │
│ [Configura SSO...]                                         │
│                                                             │
│ 📋 Audit e Compliance                                      │
│ ☑️ Log dettagliati                                         │
│ ☑️ Retention log 2 anni                                    │
│ ☑️ GDPR compliance                                         │
└─────────────────────────────────────────────────────────────┘
```

### Monitoraggio Tenant

#### Dashboard Tenant
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Dashboard Tenant: Acme Corp                             │
├─────────────────────────────────────────────────────────────┤
│ 📈 Metriche Tempo Reale                                    │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│ │ Utenti Online   │ │ Upload Oggi     │ │ Storage Usato   ││
│ │ 👥 23          │ │ 📤 156 file    │ │ 💾 23.5 GB     ││
│ │ 📊 +5 vs ieri  │ │ 📊 +12% vs ieri│ │ 📊 47% totale  ││
│ └─────────────────┘ └─────────────────┘ └─────────────────┘│
│                                                             │
│ 📊 Grafici Utilizzo (Ultimi 30 giorni)                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Upload Giornalieri                                      │ │
│ │      ▃▅▇█▅▃ ▃▅▇█▅▃ ▃▅▇█▅▃ ▃▅▇█▅▃ ▃▅▇█                │ │
│ │ Gen 1    Gen 10    Gen 20    Gen 30                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 🔝 Top Utenti per Attività                                 │
│ 1. Mario Rossi      - 156 documenti caricati               │
│ 2. Anna Bianchi     - 89 condivisioni create               │
│ 3. Luca Verdi       - 67 documenti visualizzati            │
└─────────────────────────────────────────────────────────────┘
```

## ⚙️ Configurazione Sistema

### Impostazioni Globali

#### Configurazione Server
1. Vai in "⚙️ Sistema" → "🖥️ Configurazione Server"
2. Modifica impostazioni:
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ 🖥️ Configurazione Server                                   │
   ├─────────────────────────────────────────────────────────────┤
   │ 🌐 Impostazioni Rete                                       │
   │ URL Base: [https://yourdomain.com______]                   │
   │ Porta API: [4001___]                                       │
│ Porta Docs: [4002___]                                      │
│ Porta Proxy: [4003___]                                     │
   │                                                             │
   │ 💾 Database                                                │
   │ Host: [localhost___________]                                │
   │ Porta: [5432___]                                           │
   │ Database: [document_system___]                              │
   │ Pool Size: [20___]                                         │
   │                                                             │
   │ 🗄️ Redis Cache                                             │
   │ Host: [localhost___________]                                │
   │ Porta: [6379___]                                           │
   │ TTL Default: [3600___] secondi                             │
   │                                                             │
   │ 📁 Storage                                                 │
   │ Tipo: [Local ▼] [AWS S3] [Google Cloud]                   │
   │ Path: [/var/uploads_______]                                │
   │ Max File Size: [10___] MB                                  │
   └─────────────────────────────────────────────────────────────┘
   ```

#### Impostazioni Email
```
┌─────────────────────────────────────────────────────────────┐
│ 📧 Configurazione Email                                     │
├─────────────────────────────────────────────────────────────┤
│ 📮 Server SMTP                                             │
│ Host: [smtp.gmail.com_______]                               │
│ Porta: [587___]                                            │
│ Sicurezza: [TLS ▼]                                         │
│ Username: [noreply@yourdomain.com]                          │
│ Password: [••••••••••••••••••••••••••] [👁️]                     │
│                                                             │
│ 📬 Impostazioni Invio                                      │
│ Email Mittente: [noreply@yourdomain.com]                   │
│ Nome Mittente: [Document System____]                        │
│ Rate Limit: [100___] email/ora                             │
│                                                             │
│ 📋 Template Email                                          │
│ ☑️ Benvenuto nuovo utente                                   │
│ ☑️ Reset password                                           │
│ ☑️ Notifica condivisione                                    │
│ ☑️ Digest settimanale                                       │
│                                                             │
│ [Test Connessione] [Salva Configurazione]                  │
└─────────────────────────────────────────────────────────────┘
```

### Feature Flags

#### Gestione Funzionalità
```
┌─────────────────────────────────────────────────────────────┐
│ 🚩 Feature Flags                                           │
├─────────────────────────────────────────────────────────────┤
│ 🔧 Funzionalità Core                                       │
│ ☑️ Upload documenti                    [Globale]           │
│ ☑️ Condivisione documenti              [Globale]           │
│ ☑️ Ricerca full-text                   [Globale]           │
│ ☐ OCR automatico                       [Beta]              │
│                                                             │
│ 👥 Funzionalità Utente                                     │
│ ☑️ Dashboard personalizzabile          [Globale]           │
│ ☑️ Notifiche push                      [Globale]           │
│ ☐ App mobile                           [Alpha]             │
│ ☐ Integrazione Office 365              [Sviluppo]          │
│                                                             │
│ 🔒 Sicurezza e Compliance                                  │
│ ☑️ Audit logging                       [Globale]           │
│ ☑️ GDPR tools                          [Globale]           │
│ ☐ Watermarking documenti               [Enterprise]        │
│ ☐ DLP (Data Loss Prevention)           [Enterprise]        │
│                                                             │
│ 📊 Analytics e Reporting                                   │
│ ☑️ Dashboard analytics                  [Globale]           │
│ ☐ Report avanzati                      [Pro]               │
│ ☐ Export dati                          [Enterprise]        │
└─────────────────────────────────────────────────────────────┘
```

### Manutenzione Sistema

#### Modalità Manutenzione
1. Vai in "⚙️ Sistema" → "🔧 Manutenzione"
2. Attiva modalità manutenzione:
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ 🔧 Modalità Manutenzione                                   │
   ├─────────────────────────────────────────────────────────────┤
   │ Stato: [🟢 Sistema Operativo]                              │
   │                                                             │
   │ ⚠️ Attiva Manutenzione                                     │
   │ Messaggio: [Il sistema è temporaneamente non disponibile   │
   │            per manutenzione. Riproverà tra 30 minuti.]    │
   │                                                             │
   │ Durata Stimata: [30___] minuti                             │
   │ Inizio: [Immediato ▼] [Programmato]                        │
   │                                                             │
   │ 📧 Notifiche                                               │
   │ ☑️ Notifica utenti via email                               │
   │ ☑️ Banner di avviso 15 min prima                           │
   │ ☐ Notifica solo amministratori                             │
   │                                                             │
   │ [Attiva Manutenzione] [Programma]                          │
   └─────────────────────────────────────────────────────────────┘
   ```

#### Backup e Ripristino

**Configurazione Backup:**
```
┌─────────────────────────────────────────────────────────────┐
│ 💾 Gestione Backup                                         │
├─────────────────────────────────────────────────────────────┤
│ 📅 Backup Automatici                                       │
│ Frequenza: [Giornaliero ▼]                                 │
│ Orario: [02:00___]                                         │
│ Retention: [30___] giorni                                  │
│                                                             │
│ 📁 Destinazione                                            │
│ Tipo: [AWS S3 ▼] [Local] [Google Cloud]                   │
│ Bucket: [backups-document-system]                          │
│ Encryption: [☑️ AES-256]                                   │
│                                                             │
│ 📋 Componenti Backup                                       │
│ ☑️ Database PostgreSQL                                      │
│ ☑️ File documenti                                          │
│ ☑️ Configurazioni sistema                                   │
│ ☑️ Log applicazione                                        │
│                                                             │
│ 🔄 Ultimo Backup                                           │
│ Data: 27/01/2025 02:00                                     │
│ Dimensione: 2.3 GB                                         │
│ Stato: ✅ Completato                                       │
│                                                             │
│ [Backup Manuale] [Test Ripristino] [Configura]            │
└─────────────────────────────────────────────────────────────┘
```

**Ripristino Sistema:**
1. Seleziona backup da ripristinare
2. Scegli componenti da ripristinare
3. Conferma l'operazione (sistema andrà offline)
4. Monitora il progresso del ripristino

## 📊 Analytics e Monitoring

### Dashboard Analytics

#### Metriche Sistema
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Analytics Sistema - Ultimi 30 giorni                    │
├─────────────────────────────────────────────────────────────┤
│ 📈 Metriche Principali                                     │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│ │ Utenti Attivi   │ │ Documenti       │ │ Storage         ││
│ │ 👥 1,247       │ │ 📄 45,678      │ │ 💾 156 GB      ││
│ │ 📊 +8.5% vs    │ │ 📊 +12.3% vs   │ │ 📊 +5.2% vs    ││
│ │    mese prec.  │ │    mese prec.  │ │    mese prec.  ││
│ └─────────────────┘ └─────────────────┘ └─────────────────┘│
│                                                             │
│ 🔝 Top Tenant per Utilizzo                                 │
│ 1. Acme Corp        - 23.5 GB (15.1%)                      │
│ 2. Beta Industries  - 18.2 GB (11.7%)                      │
│ 3. Gamma Solutions  - 15.8 GB (10.1%)                      │
│                                                             │
│ 📱 Dispositivi e Browser                                   │
│ Desktop: 68% │ Mobile: 24% │ Tablet: 8%                    │
│ Chrome: 45% │ Safari: 28% │ Firefox: 18% │ Altri: 9%       │
└─────────────────────────────────────────────────────────────┘
```

#### Performance Monitoring
```
┌─────────────────────────────────────────────────────────────┐
│ ⚡ Performance Sistema                                      │
├─────────────────────────────────────────────────────────────┤
│ 🖥️ Server Status                                           │
│ API Server:     🟢 Online  │ CPU: 45% │ RAM: 2.1/8 GB     │
│ Docs Server:    🟢 Online  │ CPU: 32% │ RAM: 1.8/4 GB     │
│ Proxy Server:   🟢 Online  │ CPU: 28% │ RAM: 512/2 GB     │
│ Database:       🟢 Online  │ CPU: 55% │ RAM: 3.2/8 GB     │
│ Redis Cache:    🟢 Online  │ CPU: 12% │ RAM: 256/1 GB     │
│                                                             │
│ 📊 Response Times (media ultimi 5 min)                     │
│ API Calls:      125ms      │ 📈 +5ms vs ora precedente    │
│ File Upload:    2.3s       │ 📉 -0.2s vs ora precedente  │
│ Search Query:   89ms       │ 📊 Stabile                   │
│ Page Load:      1.8s       │ 📉 -0.1s vs ora precedente  │
│                                                             │
│ 🔄 Cache Performance                                       │
│ Hit Rate:       94.2%      │ 📈 Ottimo                    │
│ Miss Rate:      5.8%       │ 📊 Normale                   │
│ Evictions:      12/ora     │ 📊 Basso                     │
└─────────────────────────────────────────────────────────────┘
```

### Alerting e Notifiche

#### Configurazione Alert
```
┌─────────────────────────────────────────────────────────────┐
│ 🚨 Configurazione Alert                                     │
├─────────────────────────────────────────────────────────────┤
│ ⚡ Performance Alerts                                       │
│ ☑️ CPU > 80% per 5 minuti                                  │
│ ☑️ RAM > 90% per 3 minuti                                  │
│ ☑️ Disk > 85% spazio utilizzato                            │
│ ☑️ Response time > 5 secondi                               │
│                                                             │
│ 🔒 Security Alerts                                         │
│ ☑️ Tentativi login falliti > 10 in 5 min                  │
│ ☑️ Accesso da IP non autorizzato                           │
│ ☑️ Upload file sospetto                                    │
│ ☑️ Modifica configurazione sistema                         │
│                                                             │
│ 💾 Storage Alerts                                          │
│ ☑️ Spazio disco < 10% libero                               │
│ ☑️ Backup fallito                                          │
│ ☑️ Tenant vicino al limite storage                         │
│                                                             │
│ 📧 Destinatari Alert                                       │
│ Email: [admin@yourdomain.com] [➕]                          │
│ Slack: [#alerts] [Configura...]                            │
│ SMS: [+39 123 456 7890] [➕]                                │
└─────────────────────────────────────────────────────────────┘
```

### Report Personalizzati

#### Creazione Report
1. Vai in "📊 Analytics" → "📋 Report Personalizzati"
2. Clicca "➕ Nuovo Report"
3. Configura report:
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ 📋 Nuovo Report                                             │
   ├─────────────────────────────────────────────────────────────┤
   │ Nome: [Report Utilizzo Mensile_______]                      │
   │ Descrizione: [Analisi utilizzo per tenant]                 │
   │                                                             │
   │ 📊 Metriche da Includere                                   │
   │ ☑️ Numero utenti attivi                                     │
   │ ☑️ Documenti caricati                                       │
   │ ☑️ Spazio utilizzato                                        │
   │ ☑️ Condivisioni create                                      │
   │ ☐ Tempo medio sessione                                     │
   │ ☐ Top file types                                           │
   │                                                             │
   │ 🎯 Filtri                                                  │
   │ Tenant: [Tutti ▼] [Acme Corp] [Beta Industries]           │
   │ Periodo: [Ultimo mese ▼]                                   │
   │ Utenti: [Tutti ▼] [Solo attivi]                           │
   │                                                             │
   │ 📅 Programmazione                                          │
   │ Frequenza: [Mensile ▼]                                     │
   │ Giorno: [1° del mese ▼]                                    │
   │ Destinatari: [admin@company.com] [➕]                       │
   │                                                             │
   │ [Anteprima] [Salva Report]                                 │
   └─────────────────────────────────────────────────────────────┘
   ```

## 🔒 Sicurezza e Compliance

### Audit Logging

#### Visualizzazione Log
```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Audit Log                                    [🔍] [📤]   │
├─────────────────────────────────────────────────────────────┤
│ Timestamp        │Utente      │Azione        │Risorsa       │
├─────────────────────────────────────────────────────────────┤
│ 27/01 10:30:15  │mario.rossi │UPLOAD        │contract.pdf  │
│ 27/01 10:28:42  │anna.bianchi│SHARE_CREATE  │report.xlsx   │
│ 27/01 10:25:33  │admin       │USER_CREATE   │luca.verdi    │
│ 27/01 10:22:18  │mario.rossi │LOGIN_SUCCESS │-             │
│ 27/01 10:20:05  │system      │BACKUP_START  │-             │
└─────────────────────────────────────────────────────────────┘

Filtri:
📅 Data: [Oggi ▼] 👤 Utente: [Tutti ▼] 🎯 Azione: [Tutte ▼]
```

#### Tipi di Eventi Tracciati
- **Autenticazione:** Login, logout, reset password
- **Gestione utenti:** Creazione, modifica, eliminazione
- **Documenti:** Upload, download, condivisione, eliminazione
- **Sistema:** Backup, configurazioni, manutenzione
- **Sicurezza:** Tentativi accesso, violazioni policy

### GDPR Compliance

#### Gestione Richieste GDPR
```
┌─────────────────────────────────────────────────────────────┐
│ 🔒 Richieste GDPR                              [📊] [📤]    │
├─────────────────────────────────────────────────────────────┤
│ ID    │Tipo        │Utente        │Data       │Stato        │
├─────────────────────────────────────────────────────────────┤
│ #1001 │EXPORT      │mario.rossi   │27/01/2025 │🟡 In corso │
│ #1000 │DELETE      │anna.bianchi  │26/01/2025 │✅ Completata│
│ #999  │RECTIFY     │luca.verdi    │25/01/2025 │✅ Completata│
│ #998  │ACCESS      │sara.neri     │24/01/2025 │✅ Completata│
└─────────────────────────────────────────────────────────────┘
```

#### Processo Richieste
1. **Richiesta Accesso (ACCESS):**
   - Genera report completo dati utente
   - Include documenti, log, metadati
   - Formato JSON strutturato

2. **Richiesta Esportazione (EXPORT):**
   - Crea archivio ZIP con tutti i dati
   - Include documenti originali
   - Metadati in formato leggibile

3. **Richiesta Rettifica (RECTIFY):**
   - Permette modifica dati personali
   - Log delle modifiche effettuate
   - Notifica all'utente

4. **Richiesta Cancellazione (DELETE):**
   - Anonimizzazione dati personali
   - Eliminazione documenti (opzionale)
   - Mantenimento log per compliance

### Sicurezza Avanzata

#### Configurazione WAF
```
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ Web Application Firewall                                │
├─────────────────────────────────────────────────────────────┤
│ 🔒 Protezioni Attive                                       │
│ ☑️ SQL Injection                                            │
│ ☑️ XSS (Cross-Site Scripting)                              │
│ ☑️ CSRF (Cross-Site Request Forgery)                       │
│ ☑️ Rate Limiting                                            │
│ ☑️ IP Blacklisting                                         │
│                                                             │
│ 📊 Statistiche Ultime 24h                                  │
│ Richieste Totali: 45,678                                   │
│ Richieste Bloccate: 234 (0.5%)                             │
│ Top Minacce: SQL Injection (45%), XSS (32%)                │
│                                                             │
│ 🚨 Alert Recenti                                           │
│ • 10:30 - Tentativo SQL Injection da 192.168.1.100        │
│ • 09:45 - Rate limit superato da 10.0.0.50                │
│ • 08:20 - IP sospetto aggiunto a blacklist                │
└─────────────────────────────────────────────────────────────┘
```

#### Scansione Vulnerabilità
1. Vai in "🔒 Sicurezza" → "🔍 Scansione Vulnerabilità"
2. Avvia scansione automatica:
   - Dipendenze software
   - Configurazioni sicurezza
   - Permessi file system
   - Certificati SSL
3. Visualizza report vulnerabilità
4. Applica patch consigliate

## 🔧 Troubleshooting

### Problemi Comuni

#### Sistema Lento
**Diagnosi:**
1. Controlla metriche performance
2. Verifica utilizzo risorse server
3. Analizza query database lente
4. Controlla cache hit rate

**Soluzioni:**
- Ottimizza query database
- Aumenta memoria cache Redis
- Scala risorse server
- Implementa CDN per file statici

#### Errori di Upload
**Diagnosi:**
1. Controlla log server upload
2. Verifica spazio disco disponibile
3. Controlla limiti file size
4. Verifica permessi cartelle

**Soluzioni:**
- Aumenta spazio disco
- Modifica limiti upload
- Correggi permessi cartelle
- Riavvia servizio upload

#### Database Connection Issues
**Diagnosi:**
1. Controlla status PostgreSQL
2. Verifica connection pool
3. Analizza log database
4. Testa connettività rete

**Soluzioni:**
- Riavvia PostgreSQL
- Aumenta connection pool size
- Ottimizza configurazione database
- Verifica firewall settings

### Log Analysis

#### Accesso Log Sistema
```bash
# Log applicazione
tail -f /var/log/document-system/app.log

# Log errori
tail -f /var/log/document-system/error.log

# Log accessi
tail -f /var/log/document-system/access.log

# Log database
tail -f /var/log/postgresql/postgresql.log
```

#### Filtri Log Utili
```bash
# Errori ultimi 10 minuti
grep "$(date -d '10 minutes ago' '+%Y-%m-%d %H:%M')" /var/log/document-system/error.log

# Upload falliti
grep "UPLOAD_FAILED" /var/log/document-system/app.log

# Login tentativi
grep "LOGIN_ATTEMPT" /var/log/document-system/access.log

# Query lente (>1s)
grep "slow query" /var/log/postgresql/postgresql.log
```

### Comandi Manutenzione

#### Restart Servizi
```bash
# Restart tutti i servizi
sudo systemctl restart document-system

# Restart servizi individuali
sudo systemctl restart document-api
sudo systemctl restart document-docs
sudo systemctl restart document-proxy

# Restart database
sudo systemctl restart postgresql
sudo systemctl restart redis
```

#### Pulizia Sistema
```bash
# Pulizia log vecchi
find /var/log/document-system -name "*.log" -mtime +30 -delete

# Pulizia cache
redis-cli FLUSHALL

# Pulizia file temporanei
find /tmp -name "upload_*" -mtime +1 -delete

# Ottimizzazione database
psql -d document_system -c "VACUUM ANALYZE;"
```

## 📞 Supporto e Escalation

### Livelli di Supporto

#### Livello 1 - Supporto Base
- **Orari:** 9:00-18:00 (Lun-Ven)
- **Canali:** Email, Chat, Telefono
- **Tempo Risposta:** 4 ore
- **Competenze:** Problemi utente, configurazioni base

#### Livello 2 - Supporto Tecnico
- **Orari:** 8:00-20:00 (Lun-Ven)
- **Canali:** Email, Telefono
- **Tempo Risposta:** 2 ore
- **Competenze:** Problemi sistema, troubleshooting avanzato

#### Livello 3 - Supporto Critico
- **Orari:** 24/7
- **Canali:** Telefono emergenza
- **Tempo Risposta:** 30 minuti
- **Competenze:** Emergenze sistema, disaster recovery

### Procedure Escalation

#### Escalation Automatica
- **Sistema down > 15 minuti** → Livello 3
- **Performance degradate > 1 ora** → Livello 2
- **Errori critici > 10/minuto** → Livello 2

#### Escalation Manuale
1. Documenta il problema dettagliatamente
2. Includi log e screenshot rilevanti
3. Specifica impatto business
4. Contatta il livello appropriato

### Contatti Emergenza

#### Team Tecnico
- **Lead Developer:** +39 123 456 7890
- **System Administrator:** +39 123 456 7891
- **Database Administrator:** +39 123 456 7892

#### Management
- **Technical Manager:** +39 123 456 7893
- **Project Manager:** +39 123 456 7894

---

**Precedente:** [User Manual](user-manual.md)  
**Prossimo:** [API Reference](../technical/api/api-reference.md)  
**Correlato:** [Deployment Guide](../deployment/deployment-guide.md)

---

*Questo manuale è aggiornato alla versione 1.0 del sistema. Per la versione più recente, consulta la documentazione online.*

### 📚 Corsi — Import Bulk (Nota Amministratore)
- Endpoint backend: POST /courses/bulk-import (documentato in <mcfile name="api-reference.md" path="/Users/matteo.michielon/project 2.0/docs/technical/api/api-reference.md"></mcfile>)
- Pre-check duplicati su `code` (normalizzato) con report dettagliato (in payload / presenti in DB)
- Inserimento con createMany skipDuplicates: non sovrascrive record esistenti
- UI mostra toast riepilogativo post-import per facilitare QA

Best practice:
- Verificare i duplicati segnalati prima di tentare re-import
- Non forzare overwrite tramite strumenti non previsti (divieto bypass)
- Validare permessi courses:write/manage per gli operatori che eseguono l’import
// ... existing content ...

## Import Corsi — Duplicati e Report

- Il campo chiave è `code` (univoco per tenant). Se il CSV contiene duplicati o conflitti con il database:
  - La UI mostra un riepilogo (toast) con conteggi: inviati, validi, creati, saltati e anteprima dei codici duplicati.
  - L’import non si blocca: i record validi vengono comunque creati/aggiornati, quelli duplicati vengono segnalati.
  - In caso di necessità, è possibile selezionare l’overwrite per aggiornare i record esistenti (se abilitato dalla policy).
- Requisiti di sicurezza:
  - Autenticazione obbligatoria e permesso `courses:create`.
  - Il tenantId è determinato dalla sessione corrente; eventuali colonne `tenantId` nel CSV sono ignorate dall’API.
- Suggerimenti:
  - Normalizzare `riskLevel` (ALTO/MEDIO/BASSO) e `courseType` (PRIMO_CORSO/AGGIORNAMENTO) prima dell’upload.
  - Verificare il report `duplicates` (inPayload/inDatabase) restituito dall’API POST /courses/bulk-import.

## Permessi e Aggiornamento Corsi

- Il ruolo ADMIN dispone dei permessi courses:read/create/edit/update/delete.
- L’endpoint PUT /api/v1/courses/:id richiede `courses:update`.
- In caso di 403, verificare lo stato sessione su /api/v1/auth/verify e contattare il supporto con il log dell’errore (senza includere credenziali).