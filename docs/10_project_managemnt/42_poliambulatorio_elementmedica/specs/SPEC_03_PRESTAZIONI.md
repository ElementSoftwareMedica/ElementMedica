# 💉 SPEC_03: Catalogo Prestazioni

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [SPEC_02_AMBULATORI.md](./SPEC_02_AMBULATORI.md), [SPEC_06_LISTINI.md](./SPEC_06_LISTINI.md)

---

## 1. OVERVIEW

Le Prestazioni sono i servizi sanitari erogabili dal poliambulatorio. Ogni prestazione definisce:
- Tipologia e durata
- Strumentario necessario
- Ambulatori abilitati
- Medici che possono erogarla
- Prezzi (tramite listini)
- Template campi visita personalizzabili

### 1.1 Tipologie Prestazione

| Tipo | Descrizione | Esempio |
|------|-------------|---------|
| VISITA | Visita specialistica | Visita cardiologica |
| ESAME | Esame diagnostico | ECG, Ecografia |
| INTERVENTO | Procedura chirurgica | Asportazione neo |
| TERAPIA | Trattamento terapeutico | Infiltrazione |
| CONTROLLO | Visita di controllo | Follow-up post-operatorio |
| CERTIFICATO | Solo certificazione | Certificato sportivo |

---

## 2. ENTITÀ DATABASE

### 2.1 Modello Prestazione

```prisma
model Prestazione {
  id                    String   @id @default(uuid())
  
  // Identificazione
  nome                  String
  codice                String?              // Codice interno
  codiceNomenclatore    String?              // Codice nomenclatore tariffario
  descrizione           String?  @db.Text
  
  // Classificazione
  tipo                  TipoPrestazione      @default(VISITA)
  specialita            String?              // "Cardiologia", "Ortopedia"
  categoria             String?              // Raggruppamento custom
  sottoCategoria        String?
  
  // Timing
  durata                Int      @default(30)    // Durata standard (minuti)
  durataMinima          Int?                     // Durata minima
  durataMassima         Int?                     // Durata massima
  tempoPreparazione     Int      @default(0)     // Tempo setup ambulatorio
  tempoPulizia          Int      @default(0)     // Tempo pulizia post
  
  // Requisiti
  richiedeDigiuno       Boolean  @default(false)
  richiedePrenota24h    Boolean  @default(false) // Prenotazione minimo 24h
  richiedeConsenso      Boolean  @default(true)  // Consenso informato
  richiedeImpegnativa   Boolean  @default(false) // Impegnativa SSN
  
  // Documentazione
  istruzioniPaziente    String?  @db.Text        // Cosa portare, come prepararsi
  noteInterne           String?  @db.Text        // Note per staff
  
  // Configurazioni booking
  isPrenotabileOnline   Boolean  @default(true)
  isAttiva              Boolean  @default(true)
  ordinamento           Int      @default(0)     // Per sorting UI
  
  // Percentuali medico
  percentualeMedicoDefault Float @default(0)     // % compenso medico
  
  // Relazioni
  ambulatoriPrestazione PrestazioneAmbulatorio[]
  mediciPrestazione     PrestazioneMedico[]
  strumentiRichiesti    PrestazioneStrumento[]
  templateCampi         TemplateCampoVisita[]
  listiniPrezzo         ListinoPrezzo[]
  appuntamenti          Appuntamento[]
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime?
  
  @@unique([tenantId, codice])
  @@index([tenantId])
  @@index([tipo])
  @@index([specialita])
  @@index([isAttiva])
}

enum TipoPrestazione {
  VISITA
  ESAME
  INTERVENTO
  TERAPIA
  CONTROLLO
  CERTIFICATO
}
```

### 2.2 Associazioni

```prisma
// Prestazione ↔ Ambulatorio
model PrestazioneAmbulatorio {
  id                    String   @id @default(uuid())
  
  prestazioneId         String
  prestazione           Prestazione @relation(fields: [prestazioneId], references: [id])
  
  ambulatorioId         String
  ambulatorio           Ambulatorio @relation(fields: [ambulatorioId], references: [id])
  
  // Override specifici
  durataOverride        Int?                 // Durata specifica in questo ambulatorio
  
  // Multi-tenancy
  tenantId              String
  
  @@unique([prestazioneId, ambulatorioId])
  @@index([tenantId])
}

// Prestazione ↔ Medico
model PrestazioneMedico {
  id                    String   @id @default(uuid())
  
  prestazioneId         String
  prestazione           Prestazione @relation(fields: [prestazioneId], references: [id])
  
  medicoId              String
  medico                Person   @relation("MedicoPrestazioni", fields: [medicoId], references: [id])
  
  // Configurazioni medico-specifiche
  durataOverride        Int?                 // Il medico è più lento/veloce
  percentualeOverride   Float?               // Override % compenso
  isPrimario            Boolean  @default(false) // Medico principale per questa prestazione
  
  // Multi-tenancy
  tenantId              String
  
  @@unique([prestazioneId, medicoId])
  @@index([tenantId])
}

// Prestazione ↔ Strumento (richiesti)
model PrestazioneStrumento {
  id                    String   @id @default(uuid())
  
  prestazioneId         String
  prestazione           Prestazione @relation(fields: [prestazioneId], references: [id])
  
  strumentoId           String
  strumento             Strumento @relation(fields: [strumentoId], references: [id])
  
  isObbligatorio        Boolean  @default(true)  // Necessario o opzionale
  quantita              Int      @default(1)
  
  // Multi-tenancy
  tenantId              String
  
  @@unique([prestazioneId, strumentoId])
  @@index([tenantId])
}
```

### 2.3 Template Campi Visita (Form Builder)

```prisma
model TemplateCampoVisita {
  id                    String   @id @default(uuid())
  
  // Appartenenza
  prestazioneId         String
  prestazione           Prestazione @relation(fields: [prestazioneId], references: [id])
  
  // Definizione campo
  nome                  String               // "pressione_sistolica"
  etichetta             String               // "Pressione Sistolica (mmHg)"
  tipo                  TipoCampoVisita      @default(TEXT)
  
  // Configurazioni
  isObbligatorio        Boolean  @default(false)
  ordinamento           Int      @default(0)
  gruppoCampo           String?              // Raggruppamento UI
  
  // Validazione
  valoreDefault         String?
  placeholder           String?
  opzioni               Json?                // Per SELECT, RADIO, CHECKBOX
  validazioneRegex      String?
  valoreMinimo          Float?               // Per NUMBER
  valoreMassimo         Float?
  
  // UI
  larghezza             String   @default("full") // "full", "half", "third"
  noteAiuto             String?              // Tooltip/help text
  
  // Condizionale (mostra se altro campo = valore)
  condizioneCampoId     String?
  condizioneValore      String?
  
  // Valori inseriti
  valori                ValoreCampoVisita[]
  
  // Multi-tenancy
  tenantId              String
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@unique([prestazioneId, nome])
  @@index([tenantId])
  @@index([prestazioneId])
}

enum TipoCampoVisita {
  TEXT              // Input testo breve
  TEXTAREA          // Testo lungo
  NUMBER            // Numerico
  DATE              // Data
  DATETIME          // Data e ora
  SELECT            // Dropdown
  MULTISELECT       // Multi-selezione
  RADIO             // Radio buttons
  CHECKBOX          // Checkbox singolo
  CHECKBOX_GROUP    // Gruppo checkbox
  FILE              // Upload file
  SIGNATURE         // Firma
  SCALE             // Scala (1-10, VAS pain)
}
```

---

## 3. FUNZIONALITÀ

### 3.1 Gestione Catalogo
| Azione | Permesso | Note |
|--------|----------|------|
| Lista prestazioni | `VIEW_PRESTAZIONI` | Filtri multipli |
| Dettaglio | `VIEW_PRESTAZIONI` | Include prezzi listino |
| Crea | `MANAGE_PRESTAZIONI` | - |
| Modifica | `MANAGE_PRESTAZIONI` | - |
| Disattiva | `MANAGE_PRESTAZIONI` | Nasconde da booking |
| Import Excel | `MANAGE_PRESTAZIONI` | Bulk import |

### 3.2 Form Builder
- Definizione campi personalizzati per prestazione
- Drag & drop riordinamento
- Preview form
- Copia template tra prestazioni
- Campi condizionali (mostra se...)
- Validazioni custom

### 3.3 Associazioni
- Link prestazione ↔ ambulatori abilitati
- Link prestazione ↔ medici autorizzati
- Link prestazione ↔ strumenti necessari
- Override durata per medico/ambulatorio

---

## 4. API ENDPOINTS

```
# CRUD Prestazioni
GET    /api/v1/clinica/prestazioni                     # Lista (filtri)
GET    /api/v1/clinica/prestazioni/:id                 # Dettaglio
POST   /api/v1/clinica/prestazioni                     # Crea
PUT    /api/v1/clinica/prestazioni/:id                 # Modifica
DELETE /api/v1/clinica/prestazioni/:id                 # Disattiva
POST   /api/v1/clinica/prestazioni/import              # Import Excel

# Associazioni
GET    /api/v1/clinica/prestazioni/:id/ambulatori      # Ambulatori abilitati
POST   /api/v1/clinica/prestazioni/:id/ambulatori      # Associa ambulatorio
DELETE /api/v1/clinica/prestazioni/:id/ambulatori/:ambId

GET    /api/v1/clinica/prestazioni/:id/medici          # Medici autorizzati
POST   /api/v1/clinica/prestazioni/:id/medici          # Associa medico
PUT    /api/v1/clinica/prestazioni/:id/medici/:medId   # Modifica (% compenso)
DELETE /api/v1/clinica/prestazioni/:id/medici/:medId

GET    /api/v1/clinica/prestazioni/:id/strumenti       # Strumenti necessari
POST   /api/v1/clinica/prestazioni/:id/strumenti
DELETE /api/v1/clinica/prestazioni/:id/strumenti/:strId

# Template Campi
GET    /api/v1/clinica/prestazioni/:id/template-campi  # Lista campi
POST   /api/v1/clinica/prestazioni/:id/template-campi  # Aggiungi campo
PUT    /api/v1/clinica/prestazioni/:id/template-campi/:campoId
DELETE /api/v1/clinica/prestazioni/:id/template-campi/:campoId
POST   /api/v1/clinica/prestazioni/:id/template-campi/ordina # Riordina
POST   /api/v1/clinica/prestazioni/:id/template-campi/copia  # Copia da altra prestazione
```

---

## 5. UI COMPONENTS

### 5.1 Pagine
- `PrestazioniList.tsx` - Catalogo prestazioni
- `PrestazioneForm.tsx` - Crea/modifica
- `PrestazioneDetail.tsx` - Dettaglio con tabs

### 5.2 Tab Detail
- **Info**: Dati base, timing, requisiti
- **Ambulatori**: Ambulatori abilitati
- **Medici**: Medici autorizzati con % compenso
- **Strumenti**: Strumentario necessario
- **Form Visita**: Form builder drag&drop
- **Prezzi**: Link a listini

### 5.3 Form Builder
- `FormBuilder.tsx` - Editor campi drag&drop
- `CampoPreview.tsx` - Preview singolo campo
- `FormPreview.tsx` - Preview form completo
- `CampoConfig.tsx` - Configurazione campo

---

## 6. REGOLE BUSINESS

| ID | Regola |
|----|--------|
| RB-01 | Codice prestazione univoco per tenant |
| RB-02 | Prestazione senza ambulatori → non prenotabile |
| RB-03 | Prestazione senza medici → non prenotabile |
| RB-04 | Strumento obbligatorio non disponibile → slot non disponibile |
| RB-05 | Medico non associato → non può erogare prestazione |
| RB-06 | % medico default usata se non override specifico |
| RB-07 | Disattivare prestazione → nasconde da booking, non cancella storico |

---

## 7. ESEMPIO JSON

### Request: Crea Prestazione con Template
```json
{
  "nome": "Visita Cardiologica",
  "codice": "VIS-CARD-001",
  "tipo": "VISITA",
  "specialita": "Cardiologia",
  "durata": 30,
  "tempoPreparazione": 5,
  "richiedeConsenso": true,
  "istruzioniPaziente": "Portare esami precedenti. Non assumere caffè nelle 2 ore precedenti.",
  "percentualeMedicoDefault": 40,
  "templateCampi": [
    {
      "nome": "anamnesi",
      "etichetta": "Anamnesi",
      "tipo": "TEXTAREA",
      "isObbligatorio": true,
      "ordinamento": 1
    },
    {
      "nome": "pressione_sistolica",
      "etichetta": "Pressione Sistolica (mmHg)",
      "tipo": "NUMBER",
      "valoreMinimo": 60,
      "valoreMassimo": 250,
      "ordinamento": 2,
      "larghezza": "half"
    },
    {
      "nome": "pressione_diastolica",
      "etichetta": "Pressione Diastolica (mmHg)",
      "tipo": "NUMBER",
      "valoreMinimo": 40,
      "valoreMassimo": 150,
      "ordinamento": 3,
      "larghezza": "half"
    },
    {
      "nome": "frequenza_cardiaca",
      "etichetta": "Frequenza Cardiaca (bpm)",
      "tipo": "NUMBER",
      "ordinamento": 4,
      "larghezza": "half"
    },
    {
      "nome": "ecg_effettuato",
      "etichetta": "ECG effettuato",
      "tipo": "CHECKBOX",
      "ordinamento": 5
    },
    {
      "nome": "esito_ecg",
      "etichetta": "Esito ECG",
      "tipo": "SELECT",
      "opzioni": ["Normale", "Alterazioni minori", "Alterazioni significative"],
      "condizioneCampoId": "ecg_effettuato",
      "condizioneValore": "true",
      "ordinamento": 6
    }
  ]
}
```

---

## 8. COLLEGAMENTI

- **Precedente**: [SPEC_02_AMBULATORI.md](./SPEC_02_AMBULATORI.md)
- **Prossimo**: [SPEC_04_STRUMENTARIO.md](./SPEC_04_STRUMENTARIO.md)
- **Correlato**: [SPEC_06_LISTINI.md](./SPEC_06_LISTINI.md), [SPEC_09_VISITE.md](./SPEC_09_VISITE.md)
- **Workflow**: [WF_03_VISITA.md](../workflows/WF_03_VISITA.md)
