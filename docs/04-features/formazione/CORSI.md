# 🏫 Formazione - Gestione Corsi

**Versione**: 2.5.0  
**Data**: 22 Gennaio 2026

---

## 📋 Overview

Il modulo Formazione gestisce:
- Catalogo corsi e moduli formativi
- Edizioni e sessioni
- Iscrizioni e partecipanti
- Docenti e sedi
- Questionari di valutazione
- Attestati

---

## 🏛️ Architettura

### Entità

```
Tenant
    │
    ├── Course (Definizione corso)
    │       │
    │       ├── CourseModule (Moduli)
    │       │
    │       └── Edition (Edizioni)
    │               │
    │               ├── Session (Sessioni/Lezioni)
    │               │
    │               ├── Enrollment (Iscrizioni)
    │               │       │
    │               │       └── Attendance (Presenze)
    │               │
    │               └── Attestato
    │
    ├── Instructor (Docenti)
    │
    ├── TrainingLocation (Sedi)
    │
    └── QuestionTemplate (Questionari)
```

---

## 📚 Modello Corso

### Tipologie Corso

| Tipo | Descrizione | Esempio |
|------|-------------|---------|
| SICUREZZA_GENERALE | Formazione base sicurezza | 4h base lavoratori |
| SICUREZZA_SPECIFICA | Formazione specifica rischio | Rischio alto 12h |
| ANTINCENDIO | Prevenzione incendi | Livello 1/2/3 |
| PRIMO_SOCCORSO | Emergenza sanitaria | Gruppo A/B/C |
| RLS | Rappresentante sicurezza | 32h + aggiornamento |
| RSPP | Responsabile sicurezza | Modulo A/B/C |
| PREPOSTO | Formazione preposti | 8h |
| DIRIGENTE | Formazione dirigenti | 16h |
| ATTREZZATURE | Uso attrezzature | Carrelli, PLE, etc. |
| HACCP | Igiene alimentare | Base/Responsabile |
| PRIVACY_GDPR | Protezione dati | DPO, incaricati |
| CUSTOM | Corso personalizzato | Su misura |

### Struttura Corso

```json
{
  "course": {
    "codice": "SIC-BASE-4H",
    "nome": "Formazione Generale Sicurezza",
    "descrizione": "Corso base D.Lgs 81/08",
    "tipo": "SICUREZZA_GENERALE",
    "durataOre": 4,
    "creditiFormativi": 4,
    "normativa": "D.Lgs 81/08 Art. 37",
    "validitaAnni": 5,
    "prezzo": 80.00,
    "maxPartecipanti": 35,
    "minPartecipanti": 5,
    "prerequisiti": [],
    "obiettivi": ["Conoscere rischi generali", "..."],
    "contenuti": ["Concetti base", "..."],
    "moduli": [...]
  }
}
```

---

## 📅 Edizioni e Sessioni

### Stati Edizione

| Stato | Descrizione |
|-------|-------------|
| PROGRAMMATA | Pianificata, non aperta |
| APERTA | Iscrizioni aperte |
| CONFERMATA | Numero minimo raggiunto |
| IN_CORSO | Corso iniziato |
| COMPLETATA | Tutte le sessioni terminate |
| ANNULLATA | Cancellata |

### Struttura Edizione

```json
{
  "edition": {
    "corsoId": "uuid",
    "codice": "SIC-BASE-2026-001",
    "dataInizio": "2026-02-15",
    "dataFine": "2026-02-15",
    "stato": "APERTA",
    "sedeId": "uuid",
    "docenteId": "uuid",
    "prezzoEdizione": 80.00,  // override se diverso
    "maxPartecipanti": 30,
    "iscrizioni": 12,
    "sessioni": [
      {
        "data": "2026-02-15",
        "oraInizio": "09:00",
        "oraFine": "13:00",
        "durataOre": 4,
        "aula": "Sala A"
      }
    ]
  }
}
```

---

## 👥 Iscrizioni

### Stati Iscrizione

| Stato | Descrizione |
|-------|-------------|
| RICHIESTA | In attesa conferma |
| CONFERMATA | Pagamento ricevuto |
| LISTA_ATTESA | Posti esauriti |
| FREQUENTANTE | Corso in corso |
| COMPLETATO | Corso terminato |
| IDONEO | Superato esame |
| NON_IDONEO | Non superato |
| ANNULLATA | Iscrizione annullata |
| ASSENTE | Non presentato |

### Flusso Iscrizione

```
Richiesta iscrizione
        │
        ▼
Verifica prerequisiti ──► KO ──► Rifiutata
        │
        OK
        ▼
Verifica posti ──► KO ──► Lista attesa
        │
        OK
        ▼
Attesa pagamento ──► Timeout ──► Annullata
        │
        Pagato
        ▼
CONFERMATA
        │
        ▼
Corso inizia ──► FREQUENTANTE
        │
        ▼
Registro presenze
        │
        ▼
Esame/Verifica
        │
        ├── IDONEO ──► Attestato
        │
        └── NON_IDONEO
```

---

## 📝 Presenze

### Registro Presenze

```json
{
  "attendance": {
    "enrollmentId": "uuid",
    "sessionId": "uuid",
    "presente": true,
    "oraIngresso": "09:05",
    "oraUscita": "13:00",
    "oreEffettive": 3.92,
    "note": ""
  }
}
```

### Calcolo Ore

- Soglia minima: 90% delle ore previste
- Arrotondamento: 15 minuti
- Uscite anticipate: registrate
- Ritardi: registrati

---

## 🏷️ Attestati

### Tipi Attestato

| Tipo | Uso |
|------|-----|
| FREQUENZA | Partecipazione semplice |
| IDONEITA | Superamento verifica |
| ABILITAZIONE | Uso attrezzature |
| AGGIORNAMENTO | Rinnovo formazione |

### Generazione Automatica

Condizioni per generazione:
1. Stato iscrizione: IDONEO
2. Presenze: ≥90% ore
3. Esame: superato (se previsto)
4. Pagamento: completato

### Struttura Attestato

```json
{
  "attestato": {
    "numero": "ATT-2026-00123",
    "tipo": "IDONEITA",
    "corsoNome": "Formazione Generale Sicurezza",
    "corsoCodice": "SIC-BASE-4H",
    "partecipante": {
      "nome": "Mario Rossi",
      "codiceFiscale": "RSSMRA80A01H501Z",
      "azienda": "ABC Srl"
    },
    "dataCorso": "15/02/2026",
    "durataOre": 4,
    "validoFino": "15/02/2031",
    "docente": "Dott. Bianchi Luigi",
    "normativa": "D.Lgs 81/08 Art. 37",
    "luogo": "Milano",
    "dataEmissione": "16/02/2026"
  }
}
```

---

## 🔗 API Endpoints

### Corsi

```
GET    /api/v1/corsi
POST   /api/v1/corsi
GET    /api/v1/corsi/:id
PUT    /api/v1/corsi/:id
DELETE /api/v1/corsi/:id
POST   /api/v1/corsi/:id/duplicate
```

### Edizioni

```
GET    /api/v1/edizioni
POST   /api/v1/edizioni
GET    /api/v1/edizioni/:id
PUT    /api/v1/edizioni/:id
DELETE /api/v1/edizioni/:id
POST   /api/v1/edizioni/:id/apri-iscrizioni
POST   /api/v1/edizioni/:id/conferma
POST   /api/v1/edizioni/:id/annulla
GET    /api/v1/edizioni/:id/partecipanti
GET    /api/v1/edizioni/:id/presenze
```

### Iscrizioni

```
GET    /api/v1/iscrizioni
POST   /api/v1/iscrizioni
GET    /api/v1/iscrizioni/:id
PUT    /api/v1/iscrizioni/:id
DELETE /api/v1/iscrizioni/:id
POST   /api/v1/iscrizioni/:id/conferma
POST   /api/v1/iscrizioni/:id/annulla
```

### Presenze

```
GET    /api/v1/presenze
POST   /api/v1/presenze/batch
PUT    /api/v1/presenze/:id
GET    /api/v1/presenze/report/:editionId
```

### Attestati

```
GET    /api/v1/attestati
POST   /api/v1/attestati/generate
GET    /api/v1/attestati/:id
GET    /api/v1/attestati/:id/pdf
GET    /api/v1/attestati/verify/:numero
POST   /api/v1/attestati/batch-generate
```

### Docenti

```
GET    /api/v1/docenti
POST   /api/v1/docenti
GET    /api/v1/docenti/:id
PUT    /api/v1/docenti/:id
DELETE /api/v1/docenti/:id
GET    /api/v1/docenti/:id/disponibilita
```

### Sedi

```
GET    /api/v1/sedi-formazione
POST   /api/v1/sedi-formazione
GET    /api/v1/sedi-formazione/:id
PUT    /api/v1/sedi-formazione/:id
DELETE /api/v1/sedi-formazione/:id
```

---

## 📱 Pagine Frontend

| Pagina | Route |
|--------|-------|
| Catalogo Corsi | `/formazione/corsi` |
| Dettaglio Corso | `/formazione/corsi/:id` |
| Calendario Edizioni | `/formazione/edizioni` |
| Iscrizioni | `/formazione/iscrizioni` |
| Registro Presenze | `/formazione/presenze` |
| Attestati | `/formazione/attestati` |
| Docenti | `/formazione/docenti` |
| Sedi | `/formazione/sedi` |
| Report Formazione | `/formazione/report` |

---

## 📊 Report

### Report Disponibili

| Report | Descrizione |
|--------|-------------|
| Partecipanti per corso | Elenco iscritti |
| Presenze sessione | Registro firma |
| Attestati emessi | Lista attestati |
| Scadenze formazione | Rinnovi imminenti |
| Fatturato formazione | Ricavi per corso |
| Ore docenti | Ore erogate per docente |

---

## ⚙️ Integrazioni

### E-Learning (P57 - Future)

```javascript
// Feature flag richiesto
{
  "ELEARNING_PLATFORM": {
    "enabled": false,
    "provider": "moodle|scorm",
    "syncEnabled": false
  }
}
```

### Crediti ECM (Future)

Per corsi accreditati ECM:
- Tracciamento crediti
- Invio a portale AGENAS
- Report partecipazione

---

## 🔒 Permessi

| Azione | Permesso |
|--------|----------|
| Visualizza corsi | `corsi:read` |
| Crea corso | `corsi:write` |
| Gestione edizioni | `edizioni:write` |
| Gestione iscrizioni | `iscrizioni:write` |
| Registro presenze | `presenze:write` |
| Genera attestati | `attestati:write` |
| Gestione docenti | `docenti:write` |
| Report formazione | `report:read` |
