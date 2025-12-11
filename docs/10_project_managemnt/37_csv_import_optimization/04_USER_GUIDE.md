# 📘 Guida Utente - Import CSV

**Versione:** 1.0  
**Data:** 22 Novembre 2025  
**Target:** Utenti finali del sistema ElementMedica

---

## 📖 Indice

1. [Introduzione](#introduzione)
2. [Accesso alle Funzionalità](#accesso)
3. [Import Aziende](#import-aziende)
4. [Import Dipendenti](#import-dipendenti)
5. [Import Formatori](#import-formatori)
6. [Risoluzione Conflitti](#conflitti)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Introduzione {#introduzione}

Il sistema di import CSV permette di caricare rapidamente grandi quantità di dati nel sistema ElementMedica.

**Entità supportate:**
- 🏢 **Aziende** (con sedi)
- 👥 **Dipendenti**
- 👨‍🏫 **Formatori** (con creazione automatica account)

**Vantaggi:**
- ✅ Import multiplo (fino a centinaia di record)
- ✅ Validazione automatica dei dati
- ✅ Rilevamento duplicati
- ✅ Gestione conflitti intelligente
- ✅ Template CSV pre-compilati

---

## 🔐 Accesso alle Funzionalità {#accesso}

### Permessi Richiesti

- **Import Aziende:** Permesso `companies:write`
- **Import Dipendenti:** Permesso `persons:write` + `employees:manage`
- **Import Formatori:** Permesso `persons:write` + `trainers:manage`

### Navigazione

1. Accedi alla sezione desiderata:
   - Aziende: `/companies`
   - Dipendenti: `/employees`
   - Formatori: `/trainers`

2. Clicca sul pulsante **"Aggiungi [Entità]"** (in alto a destra)

3. Nel menu a tendina, seleziona:
   - **"Importa da CSV"** → Apre il modal di import
   - **"Scarica template CSV"** → Scarica file esempio

---

## 🏢 Import Aziende {#import-aziende}

### 1. Scarica Template

Clicca su **"Scarica template CSV"** per ottenere un file con tutti i campi supportati.

**Campi Principali:**
- `Ragione Sociale` *(obbligatorio)*
- `P.IVA` *(obbligatorio, 11 cifre)*
- `Codice Fiscale`
- `Email`, `Telefono`, `PEC`, `SDI`, `IBAN`
- `Indirizzo`, `Città`, `Provincia`, `CAP`

**Campi Sede (opzionali):**
- `Nome Sede` - Nome della sede (es. "Sede Milano")
- `Indirizzo Sede`, `Città Sede`, `Provincia Sede`, `CAP Sede`
- `Persona Riferimento Sede`, `Telefono Sede`, `Mail Sede`
- `DVR`, `RSPP ID`, `Medico Competente ID`
- Campi sopralluoghi (ultimo/prossimo RSPP, Medico, valutazioni)

### 2. Compila il CSV

**Formato:**
- **Delimitatore:** Punto e virgola (`;`)
- **Encoding:** UTF-8
- **Intestazioni:** Obbligatorie (prima riga)

**Esempio:**
```csv
Ragione Sociale;P.IVA;Email;Città;Nome Sede;Indirizzo Sede
Acme Corp S.r.l.;12345678901;info@acme.com;Milano;Sede Milano;Via Roma 1
Beta Industries;98765432109;contact@beta.com;Roma;Sede Centrale;Via Nazionale 123
```

### 3. Carica il File

1. Clicca **"Importa da CSV"**
2. Seleziona il file CSV dal tuo computer
3. Attendi la validazione automatica

### 4. Revisiona Dati

Il sistema mostrerà:
- ✅ **Record validi** (icona verde)
- ⚠️ **Errori di validazione** (icona rossa con dettaglio errore)
- ⚡ **Conflitti** (P.IVA/CF già esistenti)

**Validazioni applicate:**
- P.IVA: 11 cifre numeriche con checksum valido
- Email: Formato RFC-compliant
- Campi obbligatori presenti

### 5. Risolvi Conflitti (se presenti)

Se il sistema rileva P.IVA o Codice Fiscale duplicati, si aprirà il modal di risoluzione:

**Opzione 1: Salta**
- Il record CSV viene ignorato
- L'azienda esistente rimane invariata

**Opzione 2: Sovrascrivi**
- I dati dell'azienda esistente vengono aggiornati
- ⚠️ Attenzione: sovrascrive tutti i campi

**Opzione 3: Aggiungi come Sede** ⭐ *Consigliato*
- Crea una nuova sede per l'azienda esistente
- Mantiene i dati aziendali originali
- Nome sede auto-popolato con città (modificabile)

**Esempio:**
```
CSV: Acme Corp, P.IVA 12345678901, Milano
Esistente: Acme Corp, P.IVA 12345678901, Sedi: [Roma]

→ Selezione "Aggiungi come Sede"
→ Risultato: Acme Corp con 2 sedi (Roma + Milano)
```

### 6. Importa

Clicca **"Importa"** per confermare.

**Risultati:**
- 📊 Riepilogo con conteggi (creati/aggiornati/saltati)
- ✅ Toast di conferma
- 🔄 Lista aziende aggiornata automaticamente

---

## 👥 Import Dipendenti {#import-dipendenti}

### 1. Scarica Template

**Campi Principali:**
- `Nome`, `Cognome` *(obbligatori)*
- `Codice Fiscale` *(obbligatorio, 16 caratteri)*
- `Email` *(obbligatoria per dipendenti)*
- `Telefono`, `Data Nascita`
- `Indirizzo`, `Città`, `Provincia`, `CAP`
- `Azienda` *(nome ragione sociale)*
- `Ruolo` *(EMPLOYEE, MANAGER, HR_MANAGER, COMPANY_ADMIN)*
- `Stato` *(ACTIVE, INACTIVE, PENDING)*

### 2. Compila il CSV

**Esempio:**
```csv
Nome;Cognome;Codice Fiscale;Email;Azienda;Ruolo
Mario;Rossi;RSSMRA85M01H501Z;mario.rossi@acme.com;Acme Corp S.r.l.;EMPLOYEE
Giulia;Verdi;VRDGLI90F41H501W;giulia.verdi@acme.com;Acme Corp S.r.l.;MANAGER
```

**Note:**
- Il Codice Fiscale deve essere univoco (nessun duplicato)
- L'Azienda deve esistere nel sistema (altrimenti errore)
- Se l'Azienda non esiste, importare prima le aziende

### 3. Validazione

**Controlli automatici:**
- ✅ Codice Fiscale: 16 caratteri uppercase
- ✅ Email: Formato valido
- ✅ Azienda: Esiste nel database
- ✅ Ruolo: Valore valido (EMPLOYEE, MANAGER, ecc.)

### 4. Assegnazione Massiva Azienda (opzionale)

Se alcuni dipendenti non hanno il campo `Azienda` compilato nel CSV:

1. Seleziona i dipendenti (checkbox)
2. Clicca **"Assegna Azienda"**
3. Scegli l'azienda dal menu a tendina
4. Conferma → Tutti i selezionati vengono assegnati

### 5. Risolvi Conflitti

Se un Codice Fiscale esiste già:
- **Salta:** Ignora questo dipendente
- **Sovrascrivi:** Aggiorna i dati del dipendente esistente

### 6. Importa

**Risultati:**
- 📊 Riepilogo: X creati, Y aggiornati, Z saltati
- 🔄 Lista dipendenti aggiornata

---

## 👨‍🏫 Import Formatori {#import-formatori}

### 1. Scarica Template

**Campi Specifici:**
- `Email` *(OBBLIGATORIA per formatori)*
- `Ruolo` *(TRAINER, SENIOR_TRAINER, TRAINER_COORDINATOR, EXTERNAL_TRAINER)*

### 2. Creazione Account Automatica

**Opzione speciale:** Crea account utente per formatori

1. Durante l'import, attiva il checkbox **"Crea account utente"**
2. Il sistema genererà automaticamente:
   - **Username:** `nome.cognome` (es. `mario.rossi`)
   - Se duplicato: aggiunge contatore (`mario.rossi1`, `mario.rossi2`)
   - **Password:** Fissa `Password123!`
   - Flag `mustChangePassword=true` (richiesto cambio al primo login)

### 3. Esporta Credenziali

Dopo l'import con creazione account:

1. Si apre automaticamente la **Tabella Credenziali**
2. Mostra: Nome, Cognome, Email, Username, Password
3. Opzioni:
   - 📋 **Copia negli appunti** (tutte le credenziali)
   - 📥 **Scarica CSV** (`trainer-credentials-YYYY-MM-DD.csv`)

**⚠️ IMPORTANTE:**
Le password sono visualizzate **UNA SOLA VOLTA**. Salvale prima di chiudere!

### 4. Esempio Completo

**CSV Input:**
```csv
Nome;Cognome;Email;Codice Fiscale;Ruolo
Anna;Bianchi;anna.bianchi@esempio.com;BNCNNA90F41H501W;TRAINER
Marco;Neri;marco.neri@esempio.com;NREMRC88H12L219X;SENIOR_TRAINER
```

**Risultato (con creazione account):**
```
✅ 2 formatori importati
✅ 2 account creati

Credenziali:
anna.bianchi  | Password123!
marco.neri    | Password123!
```

---

## ⚡ Risoluzione Conflitti {#conflitti}

### Tipologie di Conflitto

#### 1. **Conflitto P.IVA** (Aziende)

**Quando:** P.IVA già esistente nel database

**Opzioni:**
- **Salta:** Non importare questa riga
- **Sovrascrivi:** Aggiorna l'azienda esistente
- **Aggiungi come Sede:** ⭐ Crea nuova sede per l'azienda

**Scenario Consigliato:**
Se l'azienda ha più sedi in città diverse, usa "Aggiungi come Sede" per evitare duplicati.

#### 2. **Conflitto Codice Fiscale** (Dipendenti/Formatori)

**Quando:** CF già esistente nel database

**Opzioni:**
- **Salta:** Non importare questa persona
- **Sovrascrivi:** Aggiorna i dati della persona esistente

**Nota:** Non è possibile avere più persone con lo stesso CF (vincolo univoco)

### Modalità Batch

**Azioni Multiple:**
1. Risolvi tutti i conflitti nella stessa schermata
2. Scegli azioni diverse per record diversi:
   - Record 1: Sovrascrivi
   - Record 2: Salta
   - Record 3: Aggiungi come Sede
3. Conferma → Tutte le azioni vengono eseguite insieme

### Validazione Pre-Import

Il sistema valida PRIMA dell'import:
- ✅ Formato campi
- ✅ Campi obbligatori
- ✅ Checksum P.IVA
- ✅ Lunghezza CF
- ✅ Formato email

Questo riduce errori e conflitti durante l'import.

---

## 🛠️ Troubleshooting {#troubleshooting}

### Errore: "P.IVA non valida"

**Causa:** Checksum P.IVA errato o meno di 11 cifre

**Soluzione:**
1. Verifica che la P.IVA sia numerica (11 cifre)
2. Rimuovi prefisso "IT" se presente
3. Usa un validatore online per verificare il checksum

---

### Errore: "Codice Fiscale non valido"

**Causa:** CF non ha 16 caratteri o contiene caratteri minuscoli

**Soluzione:**
1. Verifica lunghezza (deve essere 16 caratteri)
2. Converti in MAIUSCOLO
3. Rimuovi spazi

**Esempio corretto:** `RSSMRA85M01H501Z`

---

### Errore: "Azienda non trovata"

**Causa:** Il campo `Azienda` nel CSV non corrisponde a nessuna ragione sociale nel database

**Soluzione:**
1. Verifica il nome esatto dell'azienda (copia da sistema)
2. Importa prima le aziende mancanti
3. Poi importa i dipendenti/formatori

---

### Errore: "Email non valida"

**Causa:** Formato email errato

**Soluzione:**
1. Verifica presenza di `@` e dominio (es. `@esempio.com`)
2. Rimuovi spazi
3. Usa caratteri validi (no spazi, virgole, ecc.)

**Esempio corretto:** `mario.rossi@acme.com`

---

### Import troppo lento

**Causa:** File CSV molto grande (>500 righe)

**Soluzione:**
1. Dividi il CSV in file più piccoli (200-300 righe)
2. Importa in batch separati
3. Chiudi altri tab del browser per liberare RAM

---

### Credenziali formatori non salvate

**Causa:** Chiuso il modal prima di salvare

**Soluzione:**
⚠️ **Non recuperabile** - Le password generate sono visualizzate solo una volta.

**Prevenzione:**
1. Attiva sempre "Crea account utente" consapevolmente
2. Clicca "Scarica CSV" PRIMA di chiudere il modal
3. Oppure copia negli appunti e incolla in un file di testo

**Workaround:**
- Resetta le password manualmente dalla pagina formatori
- Oppure elimina gli account e re-importa con nuove credenziali

---

### Nessuna riga importata (tutte saltate)

**Causa:** Tutti i record hanno conflitti e hai scelto "Salta" per tutti

**Soluzione:**
1. Verifica quali record hanno conflitti
2. Usa "Sovrascrivi" o "Aggiungi come Sede" per i conflitti desiderati
3. Oppure rimuovi i duplicati dal CSV prima dell'import

---

## 💡 Best Practices

### ✅ Prima dell'Import

1. **Scarica sempre il template** - Assicura formato corretto
2. **Usa Excel/LibreOffice Calc** - Modifica più semplice del CSV
3. **Salva con encoding UTF-8** - Evita problemi con caratteri accentati
4. **Verifica delimitatore** - Deve essere punto e virgola (`;`)
5. **Backup dati esistenti** - Esporta CSV prima di import massivo

### ✅ Durante l'Import

1. **Verifica preview** - Controlla dati prima di importare
2. **Risolvi tutti gli errori** - Non ignorare validazioni
3. **Usa "Aggiungi come Sede"** - Per aziende multi-sede
4. **Salva credenziali formatori** - Subito dopo creazione account

### ✅ Dopo l'Import

1. **Verifica conteggi** - Confronta con numero righe CSV
2. **Controlla lista aggiornata** - Ricerca alcuni record importati
3. **Testa login formatori** - Se creati account
4. **Notifica utenti** - Invia credenziali ai formatori via email sicura

---

## 📞 Supporto

**Problemi tecnici:** support@elementmedica.com  
**Documentazione completa:** `/docs/10_project_managemnt/37_csv_import_optimization/`  
**Versione:** 1.0 (22 Novembre 2025)

---

**Fine Guida Utente**
