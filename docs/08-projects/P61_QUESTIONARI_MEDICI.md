# P61 - Sistema Questionari Medici

**Stato**: 🚧 In Sviluppo  
**Data**: 31 Gennaio 2026  
**Versione**: v1.0  
**Dipendenze**: P53 (Modulistica), P56 (MDL), P52 (Sistema Visite)

---

## 📋 Obiettivo

Implementare un sistema di **Questionari Medici** integrato con la Medicina del Lavoro e altre specialità che permetta:
- Compilazione questionari da parte del medico o del paziente
- Firma digitale del paziente (canvas)
- Allegato automatico alla visita
- Scoring e validazione risposte
- Template configurabili per specialità/rischio

---

## 🏗️ Architettura

### Design Decision: Estensione di DocumentoTemplate

Dopo l'analisi del sistema esistente, la scelta è di **estendere** il sistema `DocumentoTemplate` (P53 - Modulistica) invece di creare un sistema parallelo, per questi motivi:

1. **DocumentoTemplate** ha già:
   - Sistema firma paziente/medico (`firmaPaziente`, `firmaMedico`)
   - Collegamento a visite (`visitaId`)
   - Collegamento a prestazioni
   - Sistema di campi dinamici (`campi Json`)
   - Audit trail completo
   - Scadenze e validità

2. **Differenze con FormTemplate**:
   - `FormTemplate` è per il training (test corsi, questionari formativi)
   - `DocumentoTemplate` è per la clinica (consensi, anamnesi, certificati)

### Nuovi Tipi Documento per MDL

```prisma
// Estensione TipoDocumentoTemplate
enum TipoDocumentoTemplate {
  // ... esistenti ...
  
  // P61: Nuovi tipi per questionari MDL
  ANAMNESI_LAVORATIVA   // Anamnesi specifica MDL
  QUESTIONARIO_RISCHIO  // Questionario esposizione rischi
  SCHEDA_SORVEGLIANZA   // Scheda sorveglianza sanitaria
  QUESTIONARIO_SINTOMI  // Questionario sintomatologico
  ALCOL_SCREENING       // Screening alcol/sostanze
}
```

---

## 📊 Schema Database - Nuovi Modelli

### 1. QuestionarioMedico (Estensione Template)

```prisma
/// Configurazione specifica per questionari medici
/// Estende DocumentoTemplate con campi MDL
model QuestionarioMedicoConfig {
  id                  String @id @default(uuid())
  documentoTemplateId String @unique // FK a DocumentoTemplate
  tenantId            String
  
  // === CONFIGURAZIONE MDL ===
  codiciRischio       CodiceRischio[] // Rischi associati
  tipiVisitaMDL       TipoVisitaMDL[] // Tipi visita applicabili
  specializzazione    String?         // Es: "Cardiologia", "Pneumologia"
  
  // === SCORING ===
  haScoring           Boolean @default(false)
  scoringConfig       Json?   // {maxScore, passingScore, weights}
  sogliaCritica       Float?  // Punteggio che richiede azione immediata
  
  // === COMPILAZIONE ===
  compilabileDa       CompilatoreQuestionario @default(MEDICO)
  tempoStimato        Int?    // Minuti stimati compilazione
  istruzioniPaziente  String? @db.Text
  istruzioniMedico    String? @db.Text
  
  // === VALIDAZIONE ===
  richiedeRevisione   Boolean @default(true) // Medico deve revisionare
  validazioniCustom   Json?   // Regole validazione campi
  
  // === PERIODICITÀ ===
  periodicitaMesi     Int?    // Se richiede compilazione periodica
  promemoria          Boolean @default(false)
  
  // Timestamps
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?
  
  // Relazioni
  documentoTemplate   DocumentoTemplate @relation(fields: [documentoTemplateId], references: [id], onDelete: Cascade)
  tenant              Tenant @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
  @@index([tenantId, deletedAt])
  @@map("questionari_medici_config")
}

enum CompilatoreQuestionario {
  MEDICO       // Solo medico compila
  PAZIENTE     // Solo paziente compila
  ENTRAMBI     // Sezioni per entrambi
  ASSISTITO    // Paziente assistito da operatore
  
  @@map("compilatore_questionario")
}
```

### 2. QuestionarioRisposta (Estensione Compilato)

```prisma
/// Risposte dettagliate per questionari con scoring
model QuestionarioRisposta {
  id                    String @id @default(uuid())
  documentoCompilatoId  String // FK a DocumentoCompilato
  tenantId              String
  
  // === RISPOSTA ===
  campoId               String    // ID campo nel template
  valoreTesto           String?   @db.Text
  valoreNumerico        Float?
  valoreBoolean         Boolean?
  valoreData            DateTime?
  valoreJson            Json?     // Per risposte complesse
  
  // === SCORING ===
  punteggio             Float?
  pesoCalcolato         Float?
  flagCritico           Boolean @default(false)
  
  // === VALIDAZIONE ===
  validato              Boolean @default(false)
  validatoDa            String?
  validatoAt            DateTime?
  noteValidazione       String?
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  // Relazioni
  documentoCompilato    DocumentoCompilato @relation(fields: [documentoCompilatoId], references: [id], onDelete: Cascade)
  tenant                Tenant @relation(fields: [tenantId], references: [id])
  
  @@index([documentoCompilatoId])
  @@index([tenantId])
  @@map("questionari_risposte")
}
```

### 3. Estensione DocumentoCompilato

```prisma
// Aggiungere a DocumentoCompilato esistente:

model DocumentoCompilato {
  // ... campi esistenti ...
  
  // === P61: QUESTIONARI MEDICI ===
  punteggioTotale       Float?
  punteggioPercentuale  Float?
  esitoCritico          Boolean @default(false)
  noteAlgoritmo         String? @db.Text
  
  // Relazioni P61
  risposteDettagliate   QuestionarioRisposta[]
}
```

---

## 🎨 Componenti Frontend

### 1. SignaturePad (Nuovo Componente)

```tsx
// src/components/shared/SignaturePad/SignaturePad.tsx
interface SignaturePadProps {
  onChange: (signatureBase64: string | null) => void;
  value?: string;
  disabled?: boolean;
  width?: number;
  height?: number;
  penColor?: string;
  backgroundColor?: string;
  label?: string;
  required?: boolean;
  onClear?: () => void;
}
```

### 2. QuestionarioRenderer (Form Dinamico)

```tsx
// src/components/clinica/questionari/QuestionarioRenderer.tsx
interface QuestionarioRendererProps {
  template: DocumentoTemplate;
  config: QuestionarioMedicoConfig;
  compilatoDa: 'MEDICO' | 'PAZIENTE';
  visitaId?: string;
  pazienteId: string;
  onSubmit: (data: QuestionarioSubmitData) => void;
  onSave: (data: Partial<QuestionarioSubmitData>) => void; // Bozza
  readOnly?: boolean;
  initialData?: Record<string, unknown>;
}
```

### 3. QuestionarioBuilder (Editor Template)

```tsx
// src/components/clinica/questionari/QuestionarioBuilder.tsx
// Estende TemplateFormModal con campi specifici MDL
interface QuestionarioBuilderProps {
  template?: DocumentoTemplate;
  config?: QuestionarioMedicoConfig;
  onSave: (template: DocumentoTemplate, config: QuestionarioMedicoConfig) => void;
  onCancel: () => void;
}
```

---

## 🔌 API Endpoints

```
POST   /api/v1/clinica/questionari                    # Crea template questionario
GET    /api/v1/clinica/questionari                    # Lista template
GET    /api/v1/clinica/questionari/:id                # Dettaglio template
PUT    /api/v1/clinica/questionari/:id                # Aggiorna template
DELETE /api/v1/clinica/questionari/:id                # Elimina template

POST   /api/v1/clinica/questionari/:id/compila        # Compila questionario
PUT    /api/v1/clinica/questionari/compilati/:id      # Aggiorna compilazione
POST   /api/v1/clinica/questionari/compilati/:id/firma # Firma paziente
POST   /api/v1/clinica/questionari/compilati/:id/valida # Validazione medico

GET    /api/v1/clinica/visite/:id/questionari         # Questionari di una visita
GET    /api/v1/persons/:id/questionari                # Storico questionari paziente

GET    /api/v1/clinica/questionari/rischio/:codice    # Questionari per rischio
GET    /api/v1/clinica/questionari/specializzazione/:spec # Per specializzazione
```

---

## 📋 Tipi Questionario Predefiniti

### Anamnesi Lavorativa

| Sezione | Campi | Compilatore |
|---------|-------|-------------|
| Dati Anagrafici | Pre-compilati da Person | Sistema |
| Storia Lavorativa | Mansioni precedenti, anni, esposizioni | Paziente |
| Patologie Pregresse | Lista checkbox + dettagli | Paziente |
| Familiarità | Patologie familiari rilevanti | Paziente |
| Abitudini | Fumo, alcol, attività fisica | Paziente |
| Sintomi Attuali | Checklist sintomi + gravità | Paziente |
| Note Medico | Osservazioni, approfondimenti | Medico |

### Questionario Rischio Specifico (per CodiceRischio)

**Esempio: VDT (Videoterminale)**
| Campo | Tipo | Scoring |
|-------|------|---------|
| Ore giornaliere VDT | Numero | 0-2h: 0pt, 2-4h: 1pt, 4-6h: 2pt, >6h: 3pt |
| Pause regolari | Boolean | Sì: 0pt, No: 2pt |
| Disturbi visivi | Checkbox multiplo | 1pt per sintomo |
| Cefalea frequente | Scala 1-5 | Diretto |
| Dolori cervicali | Scala 1-5 | Diretto |
| Postura corretta | Boolean | Sì: 0pt, No: 2pt |

**Soglia critica**: >12 punti → Segnalazione MC

---

## 🔐 Sicurezza e GDPR

### Controlli Obbligatori

1. **Multi-tenancy**: Ogni questionario filtrato per `tenantId`
2. **Soft Delete**: `deletedAt` su tutti i record
3. **Audit Trail**: Log completo operazioni via `DocumentoCompilatoLog`
4. **Consenso**: Verifica consenso prima di compilazione paziente
5. **Firma**: IP e timestamp registrati con firma
6. **Accesso**: Controllo `VisitAccessControl` per dati sensibili

### Permessi Necessari

```typescript
// Nuovi permessi da aggiungere
VIEW_QUESTIONARI_MEDICI
CREATE_QUESTIONARI_MEDICI
EDIT_QUESTIONARI_MEDICI
DELETE_QUESTIONARI_MEDICI
COMPILE_QUESTIONARI_PAZIENTE  // Per portale paziente
VALIDATE_QUESTIONARI         // Per medico
```

---

## 📱 Flussi Utente

### Flusso 1: Compilazione in Visita (Medico)

```
1. Medico apre visita MDL
2. Sistema mostra questionari obbligatori (da ProtocolloSanitario)
3. Medico compila o fa compilare al paziente
4. Paziente firma su tablet/schermo
5. Medico valida e firma
6. Questionario allegato automaticamente a visita
7. Score calcolato e mostrato
```

### Flusso 2: Pre-compilazione (Paziente)

```
1. Paziente riceve link/email per questionario
2. Accede con codice univoco (no login richiesto)
3. Compila sezioni paziente
4. Firma digitale
5. Questionario salvato come BOZZA
6. In visita, medico rivede e completa
```

### Flusso 3: Template per Rischio

```
1. Admin crea template per CodiceRischio (es: RUM)
2. Configura scoring e soglie
3. Quando lavoratore ha rischio RUM in mansione
4. Sistema propone automaticamente questionario
```

---

## 🗂️ File da Creare

### Backend

```
backend/
├── services/
│   └── clinica/
│       └── QuestionarioMedicoService.js    # Service principale
├── routes/
│   └── v1/
│       └── clinica/
│           └── questionari-routes.js       # Route API
└── validations/
    └── questionario-validation.js          # Schema Joi
```

### Frontend

```
src/
├── components/
│   ├── shared/
│   │   └── SignaturePad/
│   │       ├── SignaturePad.tsx            # Componente firma
│   │       ├── SignaturePad.module.css
│   │       └── index.ts
│   └── clinica/
│       └── questionari/
│           ├── QuestionarioRenderer.tsx    # Render dinamico
│           ├── QuestionarioBuilder.tsx     # Editor template
│           ├── QuestionarioScoreCard.tsx   # Visualizza score
│           ├── QuestionarioHistory.tsx     # Storico paziente
│           └── index.ts
├── pages/
│   └── clinica/
│       └── questionari/
│           ├── QuestionariPage.tsx         # Lista template
│           ├── QuestionarioEditPage.tsx    # Crea/modifica
│           └── QuestionarioCompilePage.tsx # Compilazione
├── services/
│   └── questionariService.ts               # API client
└── types/
    └── questionari.ts                      # TypeScript types
```

---

## 📈 Metriche e Dashboard

### KPI Questionari

- Questionari compilati per periodo
- Tempo medio compilazione
- Score medio per rischio
- Questionari con esito critico
- Tasso completamento pre-visita

### Dashboard Medico

- Questionari da validare
- Alert soglie critiche
- Trend score nel tempo per paziente

---

## 🔄 Integrazione con Sistema Esistente

### Con Visita (P52)

```typescript
// In Visita, nuovo campo
documentiModulistica: DocumentoCompilato[] // Include questionari

// Auto-allegato
await visitaService.addQuestionario(visitaId, questionarioCompilatoId);
```

### Con ProtocolloSanitario (P56)

```typescript
// Protocollo definisce questionari obbligatori
interface ProtocolloSanitario {
  // ... esistente ...
  questionariObbligatori: string[]; // IDs DocumentoTemplate tipo QUESTIONARIO_*
}
```

### Con Prestazione

```typescript
// Prestazione può richiedere questionari specifici
DocumentoTemplatePrestazione -> tipo QUESTIONARIO_*
```

---

## ✅ Checklist Implementazione

### Fase 1: Schema DB
- [ ] Aggiungere tipi QUESTIONARIO a TipoDocumentoTemplate
- [ ] Creare modello QuestionarioMedicoConfig
- [ ] Creare modello QuestionarioRisposta
- [ ] Estendere DocumentoCompilato con campi scoring
- [ ] Creare enum CompilatoreQuestionario
- [ ] Migration Prisma

### Fase 2: Backend
- [ ] QuestionarioMedicoService
- [ ] Route API questionari
- [ ] Validazione Joi
- [ ] Calcolo scoring
- [ ] Integrazione con visita

### Fase 3: Frontend Base
- [ ] SignaturePad component
- [ ] QuestionarioRenderer
- [ ] QuestionariPage (lista)
- [ ] questionariService.ts

### Fase 4: Frontend Avanzato
- [ ] QuestionarioBuilder (editor)
- [ ] QuestionarioScoreCard
- [ ] QuestionarioHistory
- [ ] Integrazione in VisitaForm

### Fase 5: Template Predefiniti
- [ ] Anamnesi Lavorativa base
- [ ] Questionario VDT
- [ ] Questionario Rumore
- [ ] Questionario MMC

---

## 📚 Riferimenti

- P53: Sistema Modulistica (DocumentoTemplate)
- P56: Medicina del Lavoro (MDL)
- P52: Sistema Visite Cliniche
- D.Lgs 81/08: Testo Unico Sicurezza
- Allegato 3A: Cartella Sanitaria e di Rischio
