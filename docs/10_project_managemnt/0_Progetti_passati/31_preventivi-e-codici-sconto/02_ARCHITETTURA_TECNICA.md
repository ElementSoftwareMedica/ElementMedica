# 🏗️ Architettura Tecnica - Sistema Preventivi e Codici Sconto

**Progetto**: Sistema Preventivi con Gestione Codici Sconto  
**Data**: 8 Novembre 2025  
**Versione**: 1.0  
**Status**: 🔨 FASE DESIGN

---

## 📊 Architettura Generale

### Schema Architetturale
```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         React 18 + TypeScript + Vite                  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  ScheduleEventModal (Step 4)                    │  │  │
│  │  │  - StepPreventivo.tsx                           │  │  │
│  │  │  - ConfigurazionePrezzi.tsx                     │  │  │
│  │  │  - ApplicazioneCodiciSconto.tsx                 │  │  │
│  │  │  - RiepilogoFinale.tsx                          │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Pagina Gestione Codici Sconto (Admin)         │  │  │
│  │  │  - CodiciScontoPage.tsx                         │  │  │
│  │  │  - ModalCodiceSconto.tsx                        │  │  │
│  │  │  - TabellaCodici.tsx                            │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Services                                        │  │  │
│  │  │  - preventiviService.ts                         │  │  │
│  │  │  - codiciScontoService.ts                       │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                     PROXY SERVER (4003)                      │
│  - CORS handling                                             │
│  - Rate limiting                                             │
│  - Request routing                                           │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                     API SERVER (4001)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Routes                                               │  │
│  │  - /api/v1/codici-sconto                             │  │
│  │  - /api/v1/preventivi                                │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Services                                             │  │
│  │  - codiciScontoService.js                            │  │
│  │  - preventiviService.js                              │  │
│  │  - validazioneScontoService.js                       │  │
│  │  - calcoloScontoService.js                           │  │
│  │  - templatePreventivoService.js                      │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Middleware                                           │  │
│  │  - authenticateToken                                  │  │
│  │  - requirePermission                                  │  │
│  │  - validateDiscountCode                              │  │
│  │  - gdprAudit                                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL + Prisma)                  │
│  - CodiceSconto                                              │
│  - Preventivo                                                │
│  - PreventivoSconto (join table)                             │
│  - CourseSchedule (extended)                                 │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
│  - Google Slides API (template preventivi)                   │
│  - Email Service (invio preventivi)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Nuove Tabelle

#### 1. CodiceSconto
```prisma
model CodiceSconto {
  id                String    @id @default(uuid())
  codice            String    @unique
  nome              String
  descrizione       String?   @db.Text
  
  // Tipo e Valore
  tipoSconto        TipoSconto
  valore            Decimal   @db.Decimal(10, 2)
  
  // Validità
  dataInizio        DateTime
  dataFine          DateTime
  attivo            Boolean   @default(true)
  
  // Limiti Utilizzo
  utilizzoMassimo   Int?
  utilizzoCorrente  Int       @default(0)
  utilizzoPerUtente Int?
  
  // Restrizioni
  cumulabile        Boolean   @default(false)
  minImporto        Decimal?  @db.Decimal(10, 2)
  maxImporto        Decimal?  @db.Decimal(10, 2)
  
  // Applicabilità
  applicabileA      ApplicabilitaSconto @default(TUTTI)
  
  // Corsi
  tipoCorso         TipoCorsoSconto @default(TUTTI)
  categorieCorso    String[]  // Array di categorie
  
  // Relations
  aziende           CodiceAzienda[]
  persone           CodicePersona[]
  corsi             CodiceCorso[]
  preventivi        PreventivoSconto[]
  
  // Metadata
  tenantId          String
  createdBy         String
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?
  
  tenant            Tenant    @relation(fields: [tenantId], references: [id])
  creator           Person    @relation("CodiceCreator", fields: [createdBy], references: [id])
  
  @@index([tenantId])
  @@index([codice])
  @@index([attivo])
  @@index([dataInizio, dataFine])
  @@map("codici_sconto")
}

enum TipoSconto {
  PERCENTUALE
  VALORE_ASSOLUTO
}

enum ApplicabilitaSconto {
  TUTTI
  AZIENDE
  PERSONE
  SPECIFICI
}

enum TipoCorsoSconto {
  TUTTI
  SPECIFICI
}
```

#### 2. Join Tables per Restrizioni
```prisma
// Relazione Codice-Azienda
model CodiceAzienda {
  id              String        @id @default(uuid())
  codiceId        String
  aziendaId       String
  
  codice          CodiceSconto  @relation(fields: [codiceId], references: [id], onDelete: Cascade)
  azienda         Company       @relation(fields: [aziendaId], references: [id])
  
  @@unique([codiceId, aziendaId])
  @@map("codici_aziende")
}

// Relazione Codice-Persona
model CodicePersona {
  id              String        @id @default(uuid())
  codiceId        String
  personaId       String
  
  codice          CodiceSconto  @relation(fields: [codiceId], references: [id], onDelete: Cascade)
  persona         Person        @relation(fields: [personaId], references: [id])
  
  @@unique([codiceId, personaId])
  @@map("codici_persone")
}

// Relazione Codice-Corso
model CodiceCorso {
  id              String        @id @default(uuid())
  codiceId        String
  corsoId         String
  
  codice          CodiceSconto  @relation(fields: [codiceId], references: [id], onDelete: Cascade)
  corso           Training      @relation(fields: [corsoId], references: [id])
  
  @@unique([codiceId, corsoId])
  @@map("codici_corsi")
}
```

#### 3. Preventivo
```prisma
model Preventivo {
  id                    String    @id @default(uuid())
  numero                String    @unique
  annoProgressivo       Int
  numeroProgressivo     Int
  
  // Riferimenti
  scheduleId            String?   @unique
  corsoId               String
  clienteType           ClienteType
  aziendaId             String?
  personaId             String?
  
  // Dati Corso
  titoloCorso           String
  descrizioneCorso      String?   @db.Text
  durataOre             Int
  numeroPartecipanti    Int
  modalitaErogazione    String
  
  // Prezzi
  prezzoUnitario        Decimal   @db.Decimal(10, 2)
  prezzoTotale          Decimal   @db.Decimal(10, 2)
  scontoTotale          Decimal   @db.Decimal(10, 2) @default(0)
  importoFinale         Decimal   @db.Decimal(10, 2)
  
  // Date
  dataEmissione         DateTime  @default(now())
  dataScadenza          DateTime
  
  // Status
  stato                 StatoPreventivo @default(BOZZA)
  dataInvio             DateTime?
  dataAccettazione      DateTime?
  dataRifiuto           DateTime?
  motivoRifiuto         String?   @db.Text
  
  // Note
  note                  String?   @db.Text
  condizioniPagamento   String?   @db.Text
  
  // File PDF
  fileUrl               String?
  fileName              String?
  fileSize              Int?
  
  // Relations
  schedule              CourseSchedule? @relation(fields: [scheduleId], references: [id])
  corso                 Training    @relation(fields: [corsoId], references: [id])
  azienda               Company?    @relation(fields: [aziendaId], references: [id])
  persona               Person?     @relation(fields: [personaId], references: [id])
  sconti                PreventivoSconto[]
  
  // Metadata
  tenantId              String
  generatedBy           String
  generatedAt           DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  deletedAt             DateTime?
  
  tenant                Tenant    @relation(fields: [tenantId], references: [id])
  generator             Person    @relation("PreventivoGenerator", fields: [generatedBy], references: [id])
  
  @@unique([annoProgressivo, numeroProgressivo, tenantId])
  @@index([tenantId])
  @@index([stato])
  @@index([aziendaId])
  @@index([personaId])
  @@index([scheduleId])
  @@map("preventivi")
}

enum ClienteType {
  AZIENDA
  PERSONA
}

enum StatoPreventivo {
  BOZZA
  INVIATO
  ACCETTATO
  RIFIUTATO
  SCADUTO
  CONVERTITO
}
```

#### 4. PreventivoSconto (Join Table)
```prisma
model PreventivoSconto {
  id                String        @id @default(uuid())
  preventivoId      String
  codiceId          String
  
  // Snapshot dati sconto al momento applicazione
  codice            String
  descrizione       String
  tipoSconto        TipoSconto
  valore            Decimal       @db.Decimal(10, 2)
  scontoCalcolato   Decimal       @db.Decimal(10, 2)
  
  // Relations
  preventivo        Preventivo    @relation(fields: [preventivoId], references: [id], onDelete: Cascade)
  codiceSconto      CodiceSconto  @relation(fields: [codiceId], references: [id])
  
  // Metadata
  applicatoAt       DateTime      @default(now())
  applicatoDa       String
  
  applicator        Person        @relation(fields: [applicatoDa], references: [id])
  
  @@unique([preventivoId, codiceId])
  @@map("preventivi_sconti")
}
```

### Modifiche Tabelle Esistenti

#### CourseSchedule (Extended)
```prisma
model CourseSchedule {
  // ... existing fields ...
  
  // Nuovi campi per pricing
  prezzoUnitario    Decimal?  @db.Decimal(10, 2)
  prezzoTotale      Decimal?  @db.Decimal(10, 2)
  preventivoId      String?   @unique
  
  // New relation
  preventivo        Preventivo? @relation(fields: [preventivoId], references: [id])
  
  // ... existing relations ...
}
```

#### Company (Extended)
```prisma
model Company {
  // ... existing fields ...
  
  // New relations
  codiciSconto      CodiceAzienda[]
  preventivi        Preventivo[]
  
  // ... existing relations ...
}
```

#### Person (Extended)
```prisma
model Person {
  // ... existing fields ...
  
  // New relations
  codiciSconto          CodicePersona[]
  preventiviCliente     Preventivo[]          @relation("ClientePreventivi")
  preventiviCreati      Preventivo[]          @relation("PreventivoGenerator")
  codiciCreati          CodiceSconto[]        @relation("CodiceCreator")
  scontiApplicati       PreventivoSconto[]
  
  // ... existing relations ...
}
```

#### Training (Extended)
```prisma
model Training {
  // ... existing fields ...
  
  // Nuovo campo per pricing
  prezzoBase        Decimal?  @db.Decimal(10, 2)
  
  // New relations
  codiciSconto      CodiceCorso[]
  preventivi        Preventivo[]
  
  // ... existing relations ...
}
```

---

## 🔌 API Endpoints

### 1. Codici Sconto

#### GET /api/v1/codici-sconto
```typescript
// Lista codici sconto con filtri e paginazione
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20)
  - stato: 'attivi' | 'scaduti' | 'esauriti' | 'tutti'
  - tipo: 'PERCENTUALE' | 'VALORE_ASSOLUTO'
  - search: string (cerca per codice o nome)
  - orderBy: 'dataInizio' | 'dataFine' | 'valore' | 'utilizzi'
  - order: 'asc' | 'desc'

Response 200:
{
  data: CodiceSconto[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

#### GET /api/v1/codici-sconto/:id
```typescript
// Dettaglio singolo codice sconto
Response 200: CodiceSconto

Response 404: { error: 'Codice sconto non trovato' }
```

#### POST /api/v1/codici-sconto
```typescript
// Crea nuovo codice sconto
Body: {
  codice: string,
  nome: string,
  descrizione?: string,
  tipoSconto: 'PERCENTUALE' | 'VALORE_ASSOLUTO',
  valore: number,
  dataInizio: string (ISO date),
  dataFine: string (ISO date),
  attivo: boolean,
  utilizzoMassimo?: number,
  utilizzoPerUtente?: number,
  cumulabile: boolean,
  minImporto?: number,
  maxImporto?: number,
  applicabileA: 'TUTTI' | 'AZIENDE' | 'PERSONE' | 'SPECIFICI',
  aziende?: string[],
  persone?: string[],
  tipoCorso: 'TUTTI' | 'SPECIFICI',
  corsiApplicabili?: string[],
  categorieCorso?: string[]
}

Response 201: CodiceSconto
Response 400: { error: string, details: ValidationError[] }
Response 409: { error: 'Codice già esistente' }
```

#### PUT /api/v1/codici-sconto/:id
```typescript
// Aggiorna codice sconto esistente
Body: Partial<CodiceSconto>

Response 200: CodiceSconto
Response 400: { error: string, details: ValidationError[] }
Response 404: { error: 'Codice sconto non trovato' }
```

#### DELETE /api/v1/codici-sconto/:id
```typescript
// Soft delete codice sconto
Response 204: No Content
Response 404: { error: 'Codice sconto non trovato' }
Response 409: { error: 'Impossibile eliminare: codice in uso' }
```

#### POST /api/v1/codici-sconto/valida
```typescript
// Valida un codice sconto per un preventivo
Body: {
  codice: string,
  corsoId: string,
  aziendaId?: string,
  personaId?: string,
  importoBase: number,
  codiciGiaApplicati?: string[]
}

Response 200: {
  valido: boolean,
  codiceId?: string,
  scontoCalcolato?: number,
  messaggioUtente: string,
  dettagli?: {
    tipo: string,
    valore: number,
    importoFinale: number
  }
}

Response 400: { error: 'Parametri non validi' }
```

### 2. Preventivi

#### GET /api/v1/preventivi
```typescript
// Lista preventivi con filtri
Query Parameters:
  - page: number
  - limit: number
  - stato: StatoPreventivo
  - aziendaId?: string
  - personaId?: string
  - dataInizio?: string (ISO date)
  - dataFine?: string (ISO date)
  - search?: string

Response 200: {
  data: Preventivo[],
  pagination: PaginationMeta
}
```

#### GET /api/v1/preventivi/:id
```typescript
// Dettaglio preventivo con sconti applicati
Response 200: {
  ...Preventivo,
  sconti: PreventivoSconto[],
  cliente: Company | Person,
  corso: Training
}
```

#### POST /api/v1/preventivi
```typescript
// Crea nuovo preventivo
Body: {
  scheduleId?: string,
  corsoId: string,
  clienteType: 'AZIENDA' | 'PERSONA',
  aziendaId?: string,
  personaId?: string,
  numeroPartecipanti: number,
  prezzoUnitario: number,
  codiciSconto?: string[], // Array di codici da applicare
  dataScadenza: string (ISO date),
  note?: string,
  condizioniPagamento?: string
}

Response 201: Preventivo
Response 400: { error: string, details: ValidationError[] }
```

#### PUT /api/v1/preventivi/:id
```typescript
// Aggiorna preventivo (solo BOZZA)
Body: Partial<Preventivo>

Response 200: Preventivo
Response 400: { error: 'Impossibile modificare preventivo non in bozza' }
Response 404: { error: 'Preventivo non trovato' }
```

#### POST /api/v1/preventivi/:id/invia
```typescript
// Invia preventivo via email
Body: {
  emailDestinatario: string,
  messaggioPersonalizzato?: string
}

Response 200: { 
  success: true, 
  preventivoId: string,
  statoAggiornato: 'INVIATO'
}
```

#### POST /api/v1/preventivi/:id/accetta
```typescript
// Accetta preventivo (può essere pubblico con token)
Body: {
  token?: string, // Se chiamata pubblica
  note?: string
}

Response 200: { 
  success: true,
  scheduleId?: string // Se convertito in schedule
}
```

#### POST /api/v1/preventivi/:id/rifiuta
```typescript
// Rifiuta preventivo
Body: {
  motivo: string
}

Response 200: { success: true }
```

#### GET /api/v1/preventivi/:id/download
```typescript
// Download PDF preventivo
Response 200: File (application/pdf)
Response 404: { error: 'PDF non disponibile' }
```

#### POST /api/v1/preventivi/:id/rigenera-pdf
```typescript
// Rigenera PDF preventivo
Response 200: { 
  success: true,
  fileUrl: string
}
```

---

## 🧩 Componenti Frontend

### Struttura Directory
```
src/
├── components/
│   ├── schedules/
│   │   ├── components/
│   │   │   ├── steps/
│   │   │   │   ├── StepPreventivo.tsx          (NUOVO)
│   │   │   │   └── ... (esistenti)
│   │   │   ├── preventivo/                     (NUOVO)
│   │   │   │   ├── ConfigurazionePrezzi.tsx
│   │   │   │   ├── ApplicazioneCodiciSconto.tsx
│   │   │   │   ├── RiepilogoFinale.tsx
│   │   │   │   ├── CodiceInput.tsx
│   │   │   │   ├── ScontoTag.tsx
│   │   │   │   └── DettaglioPrezzi.tsx
│   │   │   └── ... (esistenti)
│   │   └── ScheduleEventModal.tsx
│   ├── codici-sconto/                          (NUOVO)
│   │   ├── CodiciScontoPage.tsx
│   │   ├── ModalCodiceSconto.tsx
│   │   ├── TabellaCodici.tsx
│   │   ├── FormCodice/
│   │   │   ├── TabGenerali.tsx
│   │   │   ├── TabValidita.tsx
│   │   │   ├── TabRestrizioni.tsx
│   │   │   └── TabCorsi.tsx
│   │   └── components/
│   │       ├── CodiceCard.tsx
│   │       ├── StatoBadge.tsx
│   │       └── ProgressBar.tsx
│   └── preventivi/                             (NUOVO)
│       ├── PreventiviPage.tsx
│       ├── DettaglioPreventivo.tsx
│       └── PdfViewer.tsx
├── services/
│   ├── codiciScontoService.ts                  (NUOVO)
│   ├── preventiviService.ts                    (NUOVO)
│   └── ... (esistenti)
├── hooks/
│   ├── useDiscountValidation.ts                (NUOVO)
│   ├── usePriceCalculation.ts                  (NUOVO)
│   └── ... (esistenti)
├── types/
│   ├── codiceSconto.ts                         (NUOVO)
│   ├── preventivo.ts                           (NUOVO)
│   └── ... (esistenti)
└── utils/
    ├── priceFormatters.ts                      (NUOVO)
    ├── discountCalculators.ts                  (NUOVO)
    └── ... (esistenti)
```

### Componenti Principali

#### 1. StepPreventivo.tsx
```typescript
interface StepPreventivoProps {
  formData: ScheduleFormData;
  selectedCourse?: Training;
  selectedPersons: Set<string | number>;
  selectedCompanies: Set<string | number>;
  onUpdateField: (field: string, value: any) => void;
}

export const StepPreventivo: React.FC<StepPreventivoProps> = ({
  formData,
  selectedCourse,
  selectedPersons,
  selectedCompanies,
  onUpdateField
}) => {
  // State
  const [prezzoUnitario, setPrezzoUnitario] = useState(0);
  const [codiciApplicati, setCodiciApplicati] = useState<CodiceSconto[]>([]);
  const [totale, setTotale] = useState({ base: 0, sconti: 0, finale: 0 });
  
  // Hooks
  const { validateDiscount } = useDiscountValidation();
  const { calculateTotal } = usePriceCalculation();
  
  // Effects
  useEffect(() => {
    if (selectedCourse?.prezzoBase) {
      setPrezzoUnitario(selectedCourse.prezzoBase);
    }
  }, [selectedCourse]);
  
  useEffect(() => {
    const calculated = calculateTotal({
      prezzoUnitario,
      numeroPartecipanti: selectedPersons.size,
      codiciSconto: codiciApplicati
    });
    setTotale(calculated);
  }, [prezzoUnitario, selectedPersons.size, codiciApplicati]);
  
  // Handlers
  const handleApplicaCodice = async (codice: string) => {
    const validation = await validateDiscount({
      codice,
      corsoId: selectedCourse?.id,
      aziendaId: Array.from(selectedCompanies)[0],
      importoBase: totale.base,
      codiciGiaApplicati: codiciApplicati.map(c => c.id)
    });
    
    if (validation.valido) {
      setCodiciApplicati(prev => [...prev, validation.codice]);
    } else {
      toast.error(validation.messaggioUtente);
    }
  };
  
  return (
    <div className="space-y-6">
      <RiepilogoCorso {...} />
      <ConfigurazionePrezzi {...} />
      <ApplicazioneCodiciSconto {...} />
      <RiepilogoFinale {...} />
      <AzioniPreventivo {...} />
    </div>
  );
};
```

#### 2. ModalCodiceSconto.tsx
```typescript
interface ModalCodiceScontoProps {
  codice?: CodiceSconto;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalCodiceSconto: React.FC<ModalCodiceScontoProps> = ({
  codice,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<CodiceSconto>(...);
  
  const tabs = [
    { label: 'Generali', component: TabGenerali },
    { label: 'Validità', component: TabValidita },
    { label: 'Restrizioni', component: TabRestrizioni },
    { label: 'Corsi', component: TabCorsi }
  ];
  
  const handleSubmit = async () => {
    try {
      if (codice?.id) {
        await codiciScontoService.update(codice.id, formData);
      } else {
        await codiciScontoService.create(formData);
      }
      toast.success('Codice sconto salvato');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Errore salvataggio');
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {tabs.map((tab, index) => (
          <tab.component
            key={index}
            formData={formData}
            onChange={setFormData}
          />
        ))}
      </Tabs>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Annulla</Button>
        <Button variant="primary" onClick={handleSubmit}>Salva</Button>
      </ModalFooter>
    </Modal>
  );
};
```

---

## 🔐 Sicurezza e Autorizzazioni

### Permessi Richiesti

```typescript
// Permessi codici sconto
const DISCOUNT_PERMISSIONS = {
  VIEW: 'read:discounts',
  CREATE: 'create:discounts',
  UPDATE: 'update:discounts',
  DELETE: 'delete:discounts',
  VALIDATE: 'validate:discounts'
};

// Permessi preventivi
const QUOTE_PERMISSIONS = {
  VIEW: 'read:quotes',
  CREATE: 'create:quotes',
  UPDATE: 'update:quotes',
  DELETE: 'delete:quotes',
  SEND: 'send:quotes',
  ACCEPT: 'accept:quotes' // Può essere pubblico con token
};
```

### Middleware di Sicurezza

```javascript
// backend/middleware/validateDiscountCode.js
export const validateDiscountCode = () => {
  return async (req, res, next) => {
    const { codice } = req.body;
    
    // 1. Verifica esistenza codice
    const discount = await prisma.codiceSconto.findUnique({
      where: { codice, tenantId: req.user.tenantId }
    });
    
    if (!discount) {
      return res.status(404).json({ error: 'Codice non valido' });
    }
    
    // 2. Verifica stato attivo
    if (!discount.attivo) {
      return res.status(400).json({ error: 'Codice non attivo' });
    }
    
    // 3. Verifica validità temporale
    const now = new Date();
    if (now < discount.dataInizio || now > discount.dataFine) {
      return res.status(400).json({ error: 'Codice scaduto' });
    }
    
    // 4. Verifica utilizzi disponibili
    if (discount.utilizzoMassimo && 
        discount.utilizzoCorrente >= discount.utilizzoMassimo) {
      return res.status(400).json({ error: 'Codice esaurito' });
    }
    
    req.validatedDiscount = discount;
    next();
  };
};
```

---

## 📊 Business Logic Services

### 1. calcoloScontoService.js
```javascript
export class CalcoloScontoService {
  /**
   * Calcola sconti applicabili a un importo base
   */
  async calcolaSconti(params) {
    const { 
      importoBase, 
      codici, 
      corsoId, 
      aziendaId, 
      personaId 
    } = params;
    
    let importoCorrente = importoBase;
    const scontiApplicati = [];
    
    // Ordina codici: non cumulabili prima, poi per valore decrescente
    const codiciOrdinati = this.ordinaCodici(codici);
    
    for (const codice of codiciOrdinati) {
      // Valida applicabilità
      const valido = await this.validaApplicabilita(codice, {
        corsoId,
        aziendaId,
        personaId,
        importoCorrente
      });
      
      if (!valido) continue;
      
      // Calcola sconto
      const scontoCalcolato = this.calcolaSingoloSconto(
        importoCorrente,
        codice
      );
      
      importoCorrente -= scontoCalcolato;
      scontiApplicati.push({
        codiceId: codice.id,
        codice: codice.codice,
        valore: scontoCalcolato
      });
      
      // Se non cumulabile, esci dal loop
      if (!codice.cumulabile) break;
    }
    
    return {
      importoBase,
      scontiApplicati,
      scontoTotale: importoBase - importoCorrente,
      importoFinale: Math.max(0, importoCorrente)
    };
  }
  
  calcolaSingoloSconto(importo, codice) {
    let sconto = 0;
    
    if (codice.tipoSconto === 'PERCENTUALE') {
      sconto = (importo * codice.valore) / 100;
    } else {
      sconto = codice.valore;
    }
    
    // Applica maxImporto se definito
    if (codice.maxImporto && sconto > codice.maxImporto) {
      sconto = codice.maxImporto;
    }
    
    // Non può mai scontare più dell'importo stesso
    return Math.min(sconto, importo);
  }
  
  ordinaCodici(codici) {
    return codici.sort((a, b) => {
      // Non cumulabili prima
      if (!a.cumulabile && b.cumulabile) return -1;
      if (a.cumulabile && !b.cumulabile) return 1;
      
      // A parità, percentuali prima di assoluti
      if (a.tipoSconto === 'PERCENTUALE' && b.tipoSconto === 'VALORE_ASSOLUTO') return -1;
      if (a.tipoSconto === 'VALORE_ASSOLUTO' && b.tipoSconto === 'PERCENTUALE') return 1;
      
      // A parità, valore decrescente
      return b.valore - a.valore;
    });
  }
}
```

### 2. templatePreventivoService.js
```javascript
export class TemplatePreventivoService {
  /**
   * Genera PDF preventivo da template Google Slides
   */
  async generaPdfPreventivo(preventivoId) {
    const preventivo = await prisma.preventivo.findUnique({
      where: { id: preventivoId },
      include: {
        corso: true,
        azienda: true,
        persona: true,
        sconti: true,
        tenant: true
      }
    });
    
    // Ottieni template
    const template = await this.getTemplatePreventivo(preventivo.tenantId);
    
    // Prepara markers
    const markers = this.preparaMarkers(preventivo);
    
    // Genera PDF tramite Google Slides API
    const pdfBuffer = await googleDocsService.generateDocumentFromTemplate(
      accessToken,
      template.googleSlidesId,
      'slides',
      markers,
      `Preventivo_${preventivo.numero}`
    );
    
    // Salva PDF
    const fileName = `Preventivo_${preventivo.numero}.pdf`;
    const filePath = await this.salvaPdf(pdfBuffer, fileName);
    
    // Aggiorna preventivo
    await prisma.preventivo.update({
      where: { id: preventivoId },
      data: {
        fileUrl: filePath,
        fileName,
        fileSize: pdfBuffer.length
      }
    });
    
    return filePath;
  }
  
  preparaMarkers(preventivo) {
    const cliente = preventivo.azienda || preventivo.persona;
    
    return {
      // Header
      NUM: preventivo.numero,
      DATA: formatDate(preventivo.dataEmissione),
      
      // Cliente
      CLIENTE_NOME: cliente.ragioneSociale || 
                    `${cliente.firstName} ${cliente.lastName}`,
      CLIENTE_INDIRIZZO: this.formatIndirizzo(cliente),
      CLIENTE_PIVA: cliente.piva || cliente.taxCode,
      CLIENTE_EMAIL: cliente.email,
      
      // Corso
      CORSO_TITOLO: preventivo.titoloCorso,
      CORSO_DURATA: preventivo.durataOre,
      NUM_PARTECIPANTI: preventivo.numeroPartecipanti,
      MODALITA_EROGAZIONE: preventivo.modalitaErogazione,
      
      // Prezzi
      PREZZO_UNIT: formatCurrency(preventivo.prezzoUnitario),
      TOTALE_BASE: formatCurrency(preventivo.prezzoTotale),
      
      // Sconti
      SCONTI: preventivo.sconti.map(s => ({
        CODICE: s.codice,
        DESCRIZIONE: s.descrizione,
        VALORE: formatCurrency(s.scontoCalcolato)
      })),
      TOT_SCONTI: formatCurrency(preventivo.scontoTotale),
      
      // Finale
      IMPORTO_FIN: formatCurrency(preventivo.importoFinale),
      
      // Condizioni
      SCADENZA: formatDate(preventivo.dataScadenza),
      CONDIZIONI_PAGAMENTO: preventivo.condizioniPagamento || 'Da concordare',
      NOTE_AGGIUNTIVE: preventivo.note || '',
      
      // Link
      LINK_ACCETTAZIONE: `${process.env.FRONTEND_URL}/preventivi/${preventivo.id}/accetta`
    };
  }
}
```

---

## ⚡ Performance e Ottimizzazioni

### 1. Caching Strategy
```javascript
// Redis cache per codici sconto frequenti
const CACHE_TTL = {
  DISCOUNT_CODE: 3600, // 1 ora
  QUOTE: 1800,         // 30 minuti
  TEMPLATE: 7200       // 2 ore
};

// Esempio: cache validazione codice
async function validateDiscountCached(codice, params) {
  const cacheKey = `discount:${codice}:${JSON.stringify(params)}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Compute
  const result = await validateDiscount(codice, params);
  
  // Store in cache
  await redis.setex(cacheKey, CACHE_TTL.DISCOUNT_CODE, JSON.stringify(result));
  
  return result;
}
```

### 2. Database Indexes
```sql
-- Indici per performance query frequenti
CREATE INDEX idx_codice_sconto_codice ON codici_sconto(codice);
CREATE INDEX idx_codice_sconto_attivo_date ON codici_sconto(attivo, data_inizio, data_fine);
CREATE INDEX idx_preventivo_stato_tenant ON preventivi(stato, tenant_id);
CREATE INDEX idx_preventivo_numero ON preventivi(numero);
```

### 3. Lazy Loading
```typescript
// Lazy load componenti pesanti
const ModalCodiceSconto = lazy(() => import('./ModalCodiceSconto'));
const PdfViewer = lazy(() => import('./PdfViewer'));
```

---

## 🧪 Testing Strategy

### 1. Unit Tests
```typescript
// tests/services/calcoloScontoService.test.ts
describe('CalcoloScontoService', () => {
  describe('calcolaSingoloSconto', () => {
    it('calcola sconto percentuale correttamente', () => {
      const service = new CalcoloScontoService();
      const codice = {
        tipoSconto: 'PERCENTUALE',
        valore: 10
      };
      
      const sconto = service.calcolaSingoloSconto(100, codice);
      
      expect(sconto).toBe(10);
    });
    
    it('rispetta maxImporto', () => {
      const service = new CalcoloScontoService();
      const codice = {
        tipoSconto: 'PERCENTUALE',
        valore: 50,
        maxImporto: 20
      };
      
      const sconto = service.calcolaSingoloSconto(100, codice);
      
      expect(sconto).toBe(20);
    });
  });
});
```

### 2. Integration Tests
```typescript
// tests/api/codici-sconto.integration.test.ts
describe('POST /api/v1/codici-sconto', () => {
  it('crea codice sconto valido', async () => {
    const response = await request(app)
      .post('/api/v1/codici-sconto')
      .set('Authorization', `Bearer ${token}`)
      .send({
        codice: 'TEST2025',
        nome: 'Test Sconto',
        tipoSconto: 'PERCENTUALE',
        valore: 10,
        dataInizio: '2025-01-01',
        dataFine: '2025-12-31',
        attivo: true
      });
    
    expect(response.status).toBe(201);
    expect(response.body.codice).toBe('TEST2025');
  });
  
  it('rifiuta codice duplicato', async () => {
    // ... test
  });
});
```

### 3. E2E Tests
```typescript
// tests/e2e/preventivo-workflow.spec.ts
test('workflow completo creazione preventivo', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await login(page);
  
  // 2. Apri ScheduleEventModal
  await page.click('[data-testid="new-schedule"]');
  
  // 3. Compila steps precedenti
  await compilaStep0(page);
  await compilaStep1(page);
  await compilaStep2(page);
  await compilaStep3(page);
  
  // 4. Step Preventivo
  await page.click('[data-testid="step-4"]');
  
  // 5. Applica codice sconto
  await page.fill('[data-testid="codice-input"]', 'PROMO2025');
  await page.click('[data-testid="applica-codice"]');
  await expect(page.locator('[data-testid="sconto-applicato"]')).toBeVisible();
  
  // 6. Genera preventivo
  await page.click('[data-testid="genera-preventivo"]');
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  
  // 7. Verifica download PDF
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="download-pdf"]')
  ]);
  expect(download.suggestedFilename()).toContain('Preventivo');
});
```

---

**Prossimo documento**: `03_PIANO_IMPLEMENTAZIONE.md`
