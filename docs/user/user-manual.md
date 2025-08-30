# User Manual - Sistema Unificato Person

**Versione:** 2.0 Post-Refactoring  
**Data:** 25 Gennaio 2025  
**Sistema:** GDPR-Compliant Person Management System

## 📋 Panoramica

Benvenuto nel Sistema Unificato Person! Questo manuale ti guiderà attraverso tutte le funzionalità disponibili per gestire persone, aziende, corsi e documenti in modo efficiente e conforme al GDPR.

## 🚀 Primi Passi

### Accesso al Sistema

1. **Apertura dell'applicazione**
   - Apri il browser web
   - Naviga all'indirizzo: http://localhost:4003 (ambiente di sviluppo)
   - Vedrai la schermata di login del Sistema Person

2. **🔑 Credenziali Test Standard (OBBLIGATORIE)**
   - **Email:** `admin@example.com`
   - **Password:** `Admin123!`
   - **Ruolo:** ADMIN (accesso completo al sistema)
   - **Permessi:** Gestione completa di Person, Company, Course, Documents

3. **Dashboard principale**
   - Dopo il login, vedrai la dashboard con:
     - Statistiche persone attive
     - Corsi programmati
     - Aziende registrate
     - Accesso rapido alle sezioni principali

### Interfaccia Utente

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Sistema Person GDPR           [🔔] [👤] [⚙️] [🚪]    │
├─────────────────────────────────────────────────────────────┤
│ 👥 Persone │ 🏢 Aziende │ 📚 Corsi │ 📊 Dashboard │ ⚙️ Admin │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Dashboard                                               │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ Persone Attive  │  │ Corsi Attivi    │                 │
│  │ 👥 1,247        │  │ 📚 45 corsi     │                 │
│  │ 📈 +12 oggi     │  │ 🎓 156 iscritti │                 │
│  └─────────────────┘  └─────────────────┘                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Attività Recenti (GDPR Tracked)                    │   │
│  │ • Mario ha aggiornato profilo persona              │   │
│  │ • Anna ha creato nuovo corso "Sicurezza"           │   │
│  │ • Luca ha registrato nuova azienda                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 👥 Gestione Persone (GDPR-Compliant)

### Visualizzazione Persone

Il sistema utilizza il **GDPREntityTemplate** unificato per la gestione delle persone con piena conformità GDPR.

#### Interfaccia Template GDPR
```
┌─────────────────────────────────────────────────────────────┐
│ 👥 Gestione Persone                    [🔍] [⚙️] [➕]        │
├─────────────────────────────────────────────────────────────┤
│ [📊 Tabella] [🔲 Griglia]  [➕ Aggiungi ▼] [📥 Importa CSV] │
│ [🔍 Filtra] [📋 Colonne] [✏️ Modifica Batch]               │
├─────────────────────────────────────────────────────────────┤
│ 🔍 [Cerca persone...]                                      │
├─────────────────────────────────────────────────────────────┤
│ ☐ │Nome           │Email              │Ruolo    │Stato    │
│ ☐ │Mario Rossi    │mario@company.com  │EMPLOYEE │Attivo   │
│ ☐ │Anna Bianchi   │anna@company.com   │MANAGER  │Attivo   │
│ ☐ │Luca Verdi     │luca@company.com   │TRAINER  │Sospeso  │
└─────────────────────────────────────────────────────────────┘
```

#### Componenti UI Integrati
- **ViewModeToggle:** Passa tra vista tabella e griglia
- **AddEntityDropdown:** Aggiungi singola persona, importa CSV, scarica template
- **FilterPanel:** Filtri avanzati per ruolo, stato, data creazione
- **ColumnSelector:** Personalizza colonne visibili
- **BatchEditButton:** Azioni multiple su persone selezionate
- **SearchBar:** Ricerca in tempo reale

#### Permessi GDPR
- **persons:read** - Visualizzazione dati persone
- **persons:write** - Creazione/modifica persone
- **persons:delete** - Eliminazione (soft delete)
- **persons:export** - Esportazione dati GDPR

### Aggiunta Nuove Persone

#### Creazione Singola Persona
1. Clicca su "➕ Aggiungi" → "👤 Nuova Persona"
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
   │                                                             │
   │ 📅 Data Retention: [7 anni ▼]                             │
   │ 📝 Note: [_________________________]                       │
   │                                                             │
   │ [Annulla] [Crea Persona]                                   │
   └─────────────────────────────────────────────────────────────┘
   ```

#### Importazione CSV
1. Clicca su "➕ Aggiungi" → "📥 Importa da CSV"
2. Scarica template CSV con campi GDPR
3. Compila il file con dati persone
4. Carica e verifica anteprima
5. Conferma importazione con audit log automatico

### Modalità di Visualizzazione

#### Vista Tabella (Default)
```
┌─────────────────────────────────────────────────────────────┐
│ Nome              │Email              │Ruolo    │Stato    │
├─────────────────────────────────────────────────────────────┤
│ 👤 Mario Rossi    │mario@company.com  │EMPLOYEE │🟢 Attivo│
│ 👤 Anna Bianchi   │anna@company.com   │MANAGER  │🟢 Attivo│
│ 👤 Luca Verdi     │luca@company.com   │TRAINER  │🔴 Sospeso│
└─────────────────────────────────────────────────────────────┘
```

#### Vista Griglia
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 👤          │ │ 👤          │ │ 👤          │
│ Mario Rossi │ │ Anna Bianchi│ │ Luca Verdi  │
│ EMPLOYEE    │ │ MANAGER     │ │ TRAINER     │
│ 🟢 Attivo   │ │ 🟢 Attivo   │ │ 🔴 Sospeso  │
└─────────────┘ └─────────────┘ └─────────────┘
```

#### Dettagli Persona GDPR
- **Dati personali:** Nome, cognome, email, telefono
- **Informazioni professionali:** Ruolo, azienda, data assunzione
- **Consensi GDPR:** Stato consensi e date
- **Audit trail:** Cronologia modifiche automatica
- **Data retention:** Scadenza conservazione dati

## 🏢 Gestione Aziende

### Visualizzazione Aziende

Le aziende utilizzano lo stesso **GDPREntityTemplate** con configurazione specifica per entità aziendali.

#### Interfaccia Aziende
```
┌─────────────────────────────────────────────────────────────┐
│ 🏢 Gestione Aziende                    [🔍] [⚙️] [➕]        │
├─────────────────────────────────────────────────────────────┤
│ [📊 Tabella] [🔲 Griglia]  [➕ Aggiungi ▼] [📥 Importa CSV] │
│ [🔍 Filtra] [📋 Colonne] [✏️ Modifica Batch]               │
├─────────────────────────────────────────────────────────────┤
│ ☐ │Nome Azienda      │P.IVA         │Settore    │Dipendenti│
│ ☐ │Acme Corp         │12345678901   │Tech       │150       │
│ ☐ │Beta Industries   │09876543210   │Manufacturing│75     │
└─────────────────────────────────────────────────────────────┘
```

#### Permessi Aziende
- **companies:read** - Visualizzazione dati aziende
- **companies:write** - Creazione/modifica aziende
- **companies:delete** - Eliminazione aziende
- **companies:export** - Esportazione dati aziende

### Aggiunta Nuove Aziende

#### Creazione Singola Azienda
1. Clicca su "➕ Aggiungi" → "🏢 Nuova Azienda"
2. Compila i dati aziendali:
   - **Ragione sociale**
   - **Partita IVA**
   - **Codice fiscale**
   - **Indirizzo completo**
   - **Settore di attività**
   - **Numero dipendenti**
   - **Referente aziendale**

## 📚 Gestione Corsi

### Visualizzazione Corsi

I corsi utilizzano il **GDPREntityTemplate** con funzionalità specifiche per la formazione.

#### Interfaccia Corsi
```
┌─────────────────────────────────────────────────────────────┐
│ 📚 Gestione Corsi                      [🔍] [⚙️] [➕]        │
├─────────────────────────────────────────────────────────────┤
│ [📊 Tabella] [🔲 Griglia]  [➕ Aggiungi ▼] [📥 Importa CSV] │
│ [🔍 Filtra] [📋 Colonne] [✏️ Modifica Batch]               │
├─────────────────────────────────────────────────────────────┤
│ ☐ │Nome Corso        │Trainer       │Durata    │Iscritti  │
│ ☐ │Sicurezza Lavoro  │Mario Rossi   │8 ore     │25        │
│ ☐ │Excel Avanzato    │Anna Bianchi  │16 ore    │15        │
└─────────────────────────────────────────────────────────────┘
```

#### Permessi Corsi
- **courses:read** - Visualizzazione corsi
- **courses:write** - Creazione/modifica corsi
- **courses:delete** - Eliminazione corsi
- **courses:export** - Esportazione dati corsi

### Funzionalità Avanzate

#### Ricerca Unificata
- **Ricerca globale** attraverso tutte le entità (Persone, Aziende, Corsi)
- **Filtri intelligenti** basati sui permessi utente
- **Ricerca GDPR-compliant** con audit automatico

#### Operazioni Batch
- **Selezione multipla** con checkbox
- **Azioni di massa** su entità selezionate
- **Esportazione GDPR** con consensi verificati
- **Eliminazione batch** con soft delete

#### Audit Trail GDPR
- **Tracciamento automatico** di tutte le operazioni
- **Log delle modifiche** con timestamp e utente
- **Cronologia accessi** ai dati personali
- **Report conformità** GDPR automatici
- **-parola** - Esclude documenti contenenti questa parola
- **file:pdf** - Cerca solo file PDF
- **author:mario** - Cerca documenti creati da Mario

#### Esempi di Ricerca
```
"contratto servizi" AND 2025
budget OR bilancio -bozza
file:pdf author:anna
tag:importante size:>5MB
```

### Ricerca per Contenuto
Il sistema indicizza automaticamente il contenuto dei documenti:
- **PDF:** Estrae tutto il testo
- **Word/Excel/PowerPoint:** Indicizza contenuto e metadati
- **Immagini:** Utilizza OCR per estrarre testo (se abilitato)

## 🤝 Condivisione Documenti

### Condivisione Interna

#### Condivisione con Utenti
1. Seleziona il documento da condividere
2. Clicca su "🔗 Condividi"
3. Aggiungi utenti:
   - Digita nome o email
   - Seleziona dalla lista
   - Aggiungi più utenti se necessario
4. Imposta permessi:
   - **👁️ Visualizzazione:** Solo lettura
   - **✏️ Modifica:** Può modificare metadati e caricare nuove versioni
   - **🗑️ Eliminazione:** Può eliminare il documento
5. Imposta scadenza (opzionale)
6. Aggiungi messaggio (opzionale)
7. Clicca "Condividi"

#### Condivisione con Gruppi
1. Seleziona "👥 Condividi con Gruppo"
2. Scegli il gruppo dalla lista
3. Imposta permessi per il gruppo
4. Conferma la condivisione

### Link di Condivisione

#### Creazione Link Pubblico
1. Clicca su "🔗 Genera Link"
2. Configura opzioni:
   - **Scadenza:** Data/ora di scadenza
   - **Password:** Protezione con password (opzionale)
   - **Download:** Permetti download del file
   - **Visualizzazioni:** Limite numero di visualizzazioni
3. Copia il link generato
4. Condividi il link tramite email, chat, ecc.

#### Gestione Link Attivi
```
┌─────────────────────────────────────────────────────────────┐
│ Link Attivi                                                 │
├─────────────────────────────────────────────────────────────┤
│ 📄 Relazione_Q4.pdf                                        │
│ 🔗 https://app.com/share/abc123                            │
│ 👁️ 15 visualizzazioni │ ⏰ Scade: 30/01/2025             │
│ [📋 Copia] [⚙️ Modifica] [🗑️ Elimina]                      │
├─────────────────────────────────────────────────────────────┤
│ 📊 Budget_2025.xlsx                                        │
│ 🔗 https://app.com/share/def456                            │
│ 👁️ 3 visualizzazioni │ 🔒 Protetto da password           │
│ [📋 Copia] [⚙️ Modifica] [🗑️ Elimina]                      │
└─────────────────────────────────────────────────────────────┘
```

### Notifiche di Condivisione
Quando qualcuno condivide un documento con te:
1. Ricevi una notifica nell'app
2. Ricevi un'email (se abilitata)
3. Il documento appare nella sezione "📥 Condivisi con me"

## 🏷️ Tag e Metadati

### Gestione Tag

#### Aggiunta Tag
1. Seleziona il documento
2. Clicca su "🏷️ Gestisci Tag"
3. Aggiungi tag esistenti o crea nuovi:
   - Digita il nome del tag
   - Seleziona dalla lista di suggerimenti
   - Premi Invio per confermare
4. Salva le modifiche

#### Tag Predefiniti
- **📋 Categoria:** contratto, fattura, report, presentazione
- **⚡ Priorità:** urgente, importante, normale, bassa
- **📅 Stato:** bozza, revisione, approvato, archiviato
- **🎯 Progetto:** alpha, beta, marketing, vendite

#### Creazione Tag Personalizzati
1. Vai in "⚙️ Impostazioni" → "🏷️ Gestione Tag"
2. Clicca "➕ Nuovo Tag"
3. Inserisci:
   - **Nome:** Nome del tag
   - **Colore:** Scegli un colore identificativo
   - **Descrizione:** Breve descrizione dell'uso
4. Salva il nuovo tag

### Metadati Documenti

#### Informazioni Automatiche
- **Nome file originale**
- **Tipo MIME**
- **Dimensione**
- **Data creazione**
- **Data ultima modifica**
- **Checksum MD5**
- **Autore caricamento**

#### Metadati Personalizzati
1. Apri le proprietà del documento
2. Vai alla sezione "📝 Metadati Personalizzati"
3. Aggiungi campi:
   - **Cliente:** Nome del cliente
   - **Numero contratto:** Riferimento contratto
   - **Scadenza:** Data di scadenza
   - **Valore:** Valore economico
   - **Note:** Note aggiuntive

## ⚙️ Impostazioni Personali

### Profilo Utente

#### Informazioni Personali
1. Vai in "⚙️ Impostazioni" → "👤 Profilo"
2. Modifica informazioni:
   - **Nome**
   - **Cognome**
   - **Email** (solo visualizzazione)
   - **Telefono**
   - **Foto profilo**
3. Salva le modifiche

#### Cambio Password
1. Vai in "🔒 Sicurezza"
2. Clicca "🔑 Cambia Password"
3. Inserisci:
   - Password attuale
   - Nuova password
   - Conferma nuova password
4. La password deve rispettare i criteri:
   - Minimo 8 caratteri
   - Almeno una lettera maiuscola
   - Almeno una lettera minuscola
   - Almeno un numero
   - Almeno un carattere speciale

### Preferenze Interfaccia

#### Tema
- **🌞 Chiaro:** Tema con sfondo bianco
- **🌙 Scuro:** Tema con sfondo scuro
- **🔄 Automatico:** Segue le impostazioni del sistema

#### Lingua
- **🇮🇹 Italiano**
- **🇬🇧 English**
- **🇫🇷 Français**
- **🇩🇪 Deutsch**
- **🇪🇸 Español**

#### Layout Dashboard
1. Vai in "📊 Dashboard" → "⚙️ Personalizza"
2. Trascina i widget per riorganizzarli:
   - **📄 Documenti Recenti**
   - **📊 Statistiche Utilizzo**
   - **📈 Grafici Attività**
   - **📅 Calendario Scadenze**
   - **👥 Attività Team**
3. Ridimensiona i widget trascinando gli angoli
4. Nascondi widget non necessari

### Notifiche

#### Notifiche Email
- **📧 Documenti condivisi:** Quando qualcuno condivide un documento
- **📤 Caricamenti completati:** Conferma caricamento documenti
- **⏰ Scadenze:** Promemoria scadenze documenti
- **👥 Attività team:** Aggiornamenti attività colleghi
- **🔔 Notifiche sistema:** Manutenzioni e aggiornamenti

#### Notifiche Browser
- **🔔 Notifiche push:** Abilita notifiche desktop
- **🔊 Suoni:** Abilita suoni di notifica
- **⏰ Non disturbare:** Imposta orari di silenzio

#### Frequenza Digest
- **📧 Immediato:** Notifica per ogni evento
- **📅 Giornaliero:** Riassunto giornaliero
- **📅 Settimanale:** Riassunto settimanale
- **🔕 Mai:** Disabilita digest email

## 📊 Dashboard e Statistiche

### Widget Dashboard

#### Documenti Recenti
```
┌─────────────────────────────────────────────────────────────┐
│ 📄 Documenti Recenti                              [⚙️]      │
├─────────────────────────────────────────────────────────────┤
│ 📄 Contratto_Servizi_v3.pdf        │ 27/01 10:30 │ 2.3 MB │
│ 📊 Report_Vendite_Q4.xlsx          │ 26/01 14:15 │ 1.8 MB │
│ 📝 Note_Riunione_Board.docx        │ 25/01 09:45 │ 456 KB │
│ 📋 Checklist_Progetto.pdf          │ 24/01 16:20 │ 234 KB │
│ 🖼️ Logo_Aziendale_2025.png         │ 23/01 11:30 │ 89 KB  │
└─────────────────────────────────────────────────────────────┘
```

#### Statistiche Utilizzo
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Statistiche                                    [⚙️]      │
├─────────────────────────────────────────────────────────────┤
│ 📄 Documenti Totali        │ 1,247                          │
│ 📁 Cartelle                │ 89                             │
│ 💾 Spazio Utilizzato       │ 15.6 GB / 50 GB (31%)         │
│ 📤 Caricamenti Oggi        │ 12                             │
│ 👁️ Visualizzazioni Oggi    │ 156                            │
│ 🔗 Link Condivisi Attivi   │ 23                             │
└─────────────────────────────────────────────────────────────┘
```

#### Attività Team
```
┌─────────────────────────────────────────────────────────────┐
│ 👥 Attività Team                                  [⚙️]      │
├─────────────────────────────────────────────────────────────┤
│ 👤 Mario Rossi ha caricato "Budget_2025.xlsx"              │
│    📅 27/01/2025 10:15                                     │
│                                                             │
│ 👤 Anna Bianchi ha condiviso "Presentazione_Q4.pptx"       │
│    📅 27/01/2025 09:30                                     │
│                                                             │
│ 👤 Luca Verdi ha commentato "Relazione_Progetto.pdf"       │
│    📅 26/01/2025 16:45                                     │
└─────────────────────────────────────────────────────────────┘
```

### Report e Analytics

#### Report Utilizzo
1. Vai in "📊 Analytics" → "📈 Report Utilizzo"
2. Seleziona periodo:
   - Ultima settimana
   - Ultimo mese
   - Ultimo trimestre
   - Personalizzato
3. Visualizza metriche:
   - **Documenti caricati per giorno**
   - **Tipi di file più utilizzati**
   - **Utenti più attivi**
   - **Cartelle più popolari**
   - **Picchi di utilizzo**

#### Esportazione Report
1. Configura il report desiderato
2. Clicca "📤 Esporta"
3. Scegli formato:
   - **PDF:** Report formattato
   - **Excel:** Dati per analisi
   - **CSV:** Dati grezzi
4. Il file verrà scaricato automaticamente

## 🔒 Privacy e GDPR

### Gestione Consensi

#### Visualizzazione Consensi
1. Vai in "⚙️ Impostazioni" → "🔒 Privacy"
2. Visualizza stato consensi:
   - **📊 Analytics:** Raccolta dati di utilizzo
   - **📧 Marketing:** Comunicazioni promozionali
   - **🍪 Cookie tecnici:** Necessari per il funzionamento
   - **🍪 Cookie analytics:** Per migliorare l'esperienza

#### Modifica Consensi
1. Clicca sull'interruttore accanto al consenso
2. Conferma la modifica
3. Le modifiche sono immediate

### Diritti GDPR

#### Esportazione Dati
1. Vai in "🔒 Privacy" → "📤 Esporta i Miei Dati"
2. Seleziona dati da esportare:
   - **👤 Dati profilo**
   - **📄 Documenti caricati**
   - **📊 Log attività**
   - **🔗 Link condivisioni**
3. Clicca "📤 Richiedi Esportazione"
4. Riceverai un'email quando l'esportazione è pronta
5. Il file ZIP conterrà tutti i tuoi dati in formato JSON

#### Cancellazione Account
1. Vai in "🔒 Privacy" → "🗑️ Elimina Account"
2. **⚠️ ATTENZIONE:** Questa azione è irreversibile
3. Leggi le conseguenze:
   - Tutti i documenti verranno eliminati
   - Le condivisioni verranno revocate
   - I dati non potranno essere recuperati
4. Digita "ELIMINA" per confermare
5. Inserisci la password
6. Clicca "🗑️ Elimina Definitivamente"

#### Rettifica Dati
1. Vai in "👤 Profilo"
2. Modifica i dati errati
3. Salva le modifiche
4. Per dati che non puoi modificare, contatta l'amministratore

### Audit Trail

#### Visualizzazione Attività
1. Vai in "🔒 Privacy" → "📋 Le Mie Attività"
2. Visualizza cronologia:
   - **📅 Data e ora**
   - **🎯 Azione eseguita**
   - **📄 Documento coinvolto**
   - **🌐 Indirizzo IP**
   - **💻 Browser utilizzato**

#### Filtri Attività
- **📅 Periodo:** Filtra per data
- **🎯 Tipo azione:** Login, caricamento, condivisione, ecc.
- **📄 Documento:** Cerca attività su documento specifico

## 🆘 Supporto e Risoluzione Problemi

### Problemi Comuni

#### Caricamento Fallito
**Sintomi:** Il file non viene caricato o si blocca

**Soluzioni:**
1. Verifica la connessione internet
2. Controlla la dimensione del file (max 10 MB)
3. Verifica il formato file supportato
4. Prova a ricaricare la pagina
5. Svuota la cache del browser

#### Documento Non Visualizzabile
**Sintomi:** Errore nell'apertura del documento

**Soluzioni:**
1. Verifica i permessi di accesso
2. Controlla se il documento è stato eliminato
3. Prova con un browser diverso
4. Disabilita temporaneamente l'antivirus
5. Contatta l'amministratore se il problema persiste

#### Login Non Funziona
**Sintomi:** Impossibile accedere al sistema

**Soluzioni:**
1. Verifica email e password
2. Controlla il blocco CAPS LOCK
3. Prova il reset password
4. Verifica se l'account è attivo
5. Contatta l'amministratore

#### Ricerca Non Trova Documenti
**Sintomi:** La ricerca non restituisce risultati attesi

**Soluzioni:**
1. Verifica l'ortografia delle parole chiave
2. Prova con termini più generici
3. Usa i filtri di ricerca avanzata
4. Controlla i permessi sui documenti
5. Verifica se i documenti sono nella cartella corretta

### Contatti Supporto

#### Supporto Tecnico
- **📧 Email:** support@yourdomain.com
- **📞 Telefono:** +39 02 1234 5678
- **💬 Chat:** Disponibile nell'app (icona 💬 in basso a destra)
- **🕒 Orari:** Lun-Ven 9:00-18:00

#### Supporto Amministrativo
- **📧 Email:** admin@yourdomain.com
- **📞 Telefono:** +39 02 1234 5679
- **🕒 Orari:** Lun-Ven 9:00-17:00

#### Documentazione Online
- **📚 Knowledge Base:** https://help.yourdomain.com
- **🎥 Video Tutorial:** https://tutorials.yourdomain.com
- **❓ FAQ:** https://faq.yourdomain.com

### Segnalazione Bug

#### Come Segnalare un Problema
1. Vai in "❓ Aiuto" → "🐛 Segnala Bug"
2. Compila il form:
   - **📝 Descrizione:** Descrivi il problema dettagliatamente
   - **🔄 Passi per riprodurre:** Come riprodurre il bug
   - **📱 Browser/OS:** Specifica browser e sistema operativo
   - **📸 Screenshot:** Allega screenshot se utili
3. Clicca "📤 Invia Segnalazione"
4. Riceverai un numero di ticket per il follow-up

#### Informazioni Utili da Includere
- **URL della pagina** dove si verifica il problema
- **Messaggio di errore** esatto (se presente)
- **Azioni eseguite** prima che si verificasse il problema
- **Frequenza** del problema (sempre, a volte, una volta)
- **Impatto** sul lavoro (bloccante, fastidioso, minore)

## 📱 App Mobile

### Download e Installazione

#### iOS (iPhone/iPad)
1. Apri l'App Store
2. Cerca "Document Management System"
3. Tocca "Ottieni" per scaricare
4. Apri l'app dopo l'installazione
5. Accedi con le tue credenziali

#### Android
1. Apri Google Play Store
2. Cerca "Document Management System"
3. Tocca "Installa"
4. Apri l'app dopo l'installazione
5. Accedi con le tue credenziali

### Funzionalità Mobile

#### Funzioni Disponibili
- ✅ **Visualizzazione documenti**
- ✅ **Ricerca documenti**
- ✅ **Caricamento foto/documenti**
- ✅ **Condivisione documenti**
- ✅ **Notifiche push**
- ✅ **Accesso offline** (documenti scaricati)
- ✅ **Sincronizzazione automatica**

#### Funzioni Limitate
- ⚠️ **Modifica metadati** (solo visualizzazione)
- ⚠️ **Gestione cartelle** (solo navigazione)
- ⚠️ **Amministrazione** (non disponibile)

#### Utilizzo Offline
1. Scarica documenti per l'accesso offline:
   - Apri il documento
   - Tocca "📥 Scarica per Offline"
2. I documenti offline sono disponibili nella sezione "📱 Offline"
3. Le modifiche verranno sincronizzate alla riconnessione

## 🔄 Aggiornamenti e Novità

### Notifiche Aggiornamenti
Quando sono disponibili nuove funzionalità:
1. Vedrai una notifica nell'app
2. Riceverai un'email informativa
3. Apparirà un banner nella dashboard

### Changelog
Per vedere le novità recenti:
1. Vai in "❓ Aiuto" → "🆕 Novità"
2. Visualizza le ultime funzionalità aggiunte
3. Leggi le note di rilascio dettagliate

### Feedback e Suggerimenti
Per proporre miglioramenti:
1. Vai in "❓ Aiuto" → "💡 Suggerimenti"
2. Descrivi la tua idea
3. Vota i suggerimenti di altri utenti
4. Ricevi aggiornamenti sullo stato delle proposte

---

**Precedente:** [Deployment Guide](../deployment/deployment-guide.md)  
**Prossimo:** [Admin Manual](admin-manual.md)  
**Correlato:** [System Overview](../technical/architecture/system-overview.md)

---

*Per ulteriore assistenza, contatta il supporto tecnico o consulta la documentazione online.*