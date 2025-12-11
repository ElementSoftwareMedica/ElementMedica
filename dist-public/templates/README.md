# 📁 CSV Import Templates

Questa cartella contiene i template CSV di esempio per l'importazione massiva di dati nel sistema ElementMedica.

## 📋 File Disponibili

### 1. `template_companies.csv`
Template per l'importazione aziende con sedi.

**Campi inclusi (34 colonne):**
- **Dati Azienda:** Ragione Sociale, P.IVA, Codice Fiscale, SDI, PEC, IBAN
- **Contatti:** Email, Telefono, Persona Riferimento
- **Indirizzo:** Sede Aziendale, Città, Provincia, CAP
- **Sede Specifica:** Nome Sede, Indirizzo Sede, Città Sede, ecc.
- **Sicurezza:** DVR, RSPP ID, Medico Competente ID
- **Sopralluoghi:** Date e note sopralluoghi RSPP e Medico
- **Altro:** Slug, Domain, Settings, Subscription Plan

**Righe esempio:** 2 aziende complete

---

### 2. `template_employees.csv`
Template per l'importazione dipendenti.

**Campi inclusi (18 colonne):**
- **Dati Anagrafici:** Nome, Cognome, Codice Fiscale, Data Nascita
- **Contatti:** Email, Telefono
- **Indirizzo:** Indirizzo, Città, Provincia, CAP
- **Lavoro:** Azienda, Ruolo, Data Assunzione, Profilo Professionale
- **Sistema:** Username, Note, Stato, Data Creazione

**Ruoli disponibili:**
- `EMPLOYEE` - Dipendente base
- `MANAGER` - Manager di reparto
- `HR_MANAGER` - Responsabile HR
- `COMPANY_ADMIN` - Responsabile Aziendale

**Righe esempio:** 2 dipendenti

---

### 3. `template_trainers.csv`
Template per l'importazione formatori.

**Campi inclusi (17 colonne):**
- **Dati Anagrafici:** Nome, Cognome, Codice Fiscale, Data Nascita
- **Contatti:** Email (OBBLIGATORIA), Telefono
- **Indirizzo:** Indirizzo, Città, Provincia, CAP
- **Lavoro:** Azienda, Ruolo, Profilo Professionale
- **Sistema:** Username, Note, Stato, Data Creazione

**Ruoli disponibili:**
- `TRAINER` - Formatore base
- `SENIOR_TRAINER` - Formatore senior
- `TRAINER_COORDINATOR` - Coordinatore formatori
- `EXTERNAL_TRAINER` - Formatore esterno

**Righe esempio:** 2 formatori

---

## 🚀 Come Usare i Template

### 1. Download Template
Dal sistema ElementMedica:
1. Vai alla pagina Aziende/Dipendenti/Formatori
2. Clicca "Aggiungi [Entità]" (dropdown in alto a destra)
3. Seleziona **"Scarica template CSV"**

Alternativamente, usa i file in questa cartella come riferimento.

---

### 2. Compila i Dati

**Strumenti consigliati:**
- Microsoft Excel
- LibreOffice Calc
- Google Sheets

**Formato richiesto:**
- **Encoding:** UTF-8
- **Delimitatore:** Punto e virgola (`;`)
- **Intestazioni:** Obbligatorie (prima riga)
- **Valori vuoti:** Lasciare celle vuote (non usare "N/A" o "-")

**Esempio riga CSV:**
```csv
Mario;Rossi;RSSMRA85M01H501Z;mario.rossi@acme.com;Acme Corp S.r.l.;EMPLOYEE
```

---

### 3. Salva il File

**Importante:**
1. **File → Salva con nome**
2. **Tipo file:** CSV (delimitato da punto e virgola) (*.csv)
3. **Encoding:** UTF-8 (fondamentale per caratteri accentati)

**Excel:**
- Scegli "CSV UTF-8 (delimitato da virgola)" 
- Poi apri con editor di testo e sostituisci `,` con `;` se necessario

**LibreOffice Calc:**
- Scegli "Testo CSV (.csv)"
- Nella finestra opzioni:
  * Character set: Unicode (UTF-8)
  * Field delimiter: `;`

---

### 4. Importa nel Sistema

1. Vai alla pagina desiderata (Aziende/Dipendenti/Formatori)
2. Clicca "Aggiungi [Entità]" → **"Importa da CSV"**
3. Seleziona il file CSV compilato
4. Revisiona preview e validazioni
5. Risolvi eventuali conflitti
6. Conferma importazione

---

## ⚠️ Validazioni Automatiche

### Aziende
- **P.IVA:** 11 cifre numeriche con checksum valido
- **Email:** Formato RFC-compliant (es. `info@azienda.com`)
- **Duplicati:** P.IVA e CF devono essere unici

### Dipendenti
- **Codice Fiscale:** 16 caratteri MAIUSCOLI
- **Email:** Formato valido, univoca
- **Azienda:** Deve esistere nel database
- **Duplicati:** CF deve essere unico

### Formatori
- **Email:** OBBLIGATORIA e valida
- **Codice Fiscale:** 16 caratteri MAIUSCOLI
- **Duplicati:** CF ed email devono essere unici

---

## 🛠️ Troubleshooting

### Errore: "Delimitatore non corretto"
**Soluzione:** Verifica che il file usi `;` come delimitatore, non `,`

### Errore: "Caratteri strani nel file"
**Soluzione:** Riprova salvando con encoding UTF-8

### Errore: "Intestazioni mancanti"
**Soluzione:** Verifica che la prima riga contenga i nomi delle colonne

### Errore: "P.IVA non valida"
**Soluzione:** 
- Rimuovi prefisso "IT"
- Verifica che sia 11 cifre numeriche
- Usa un validatore online per il checksum

---

## 📚 Documentazione Completa

Per maggiori dettagli, consulta:
- **Guida Utente:** `docs/10_project_managemnt/37_csv_import_optimization/04_USER_GUIDE.md`
- **Planning Tecnico:** `docs/10_project_managemnt/37_csv_import_optimization/01_PLANNING_DETTAGLIATO.md`
- **Status Implementazione:** `docs/10_project_managemnt/37_csv_import_optimization/03_IMPLEMENTATION_STATUS.md`

---

**Versione:** 1.0  
**Data:** 22 Novembre 2025  
**Autore:** ElementMedica Team
