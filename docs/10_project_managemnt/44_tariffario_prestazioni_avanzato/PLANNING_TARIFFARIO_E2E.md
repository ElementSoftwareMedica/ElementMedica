# 📋 Sistema Tariffario Prestazioni Avanzato

## 🎯 Obiettivo
Implementare un sistema di pricing flessibile e completo per le prestazioni mediche che supporti:
- Tariffe variabili per medico
- Listini per convenzioni/assicurazioni
- Codici sconto
- Offerte bundle (prestazioni associate)
- Tariffari aziendali (medicina del lavoro)
- Compensi medici configurabili

---

## � Principio Guida: NO DOPPIONI

Per evitare duplicazioni di entità, utilizziamo:
- `ListinoPrezzo` esteso come **unica fonte** per variazioni prezzo
- `Convenzione` tipo `AZIENDALE` per tariffari aziendali (medicina del lavoro)
- `MedicoAbilitato` esteso per compensi medico default
- `CodiceSconto` già esistente (solo estensione per prestazioni)
- `OffertaBundle` nuovo (necessario per bundle/pacchetti)

---

## �📊 Stato Attuale dello Schema

### Entità Esistenti

#### `Prestazione`
```prisma
model Prestazione {
  id                     String          @id @default(uuid())
  codice                 String
  nome                   String
  tipo                   TipoPrestazione
  prezzoBase             Decimal         @db.Decimal(10, 2)  // ✅ Prezzo base
  ivaAliquota            Decimal         @default(0)
  attivo                 Boolean         @default(true)
  
  listiniPrezzo      ListinoPrezzo[]      // ✅ Listini per convenzioni
  mediciAbilitati    MedicoAbilitato[]    // ✅ Medici abilitati (ma senza prezzo)
}
```

#### `ListinoPrezzo`
```prisma
model ListinoPrezzo {
  id                String
  prestazioneId     String
  poliambulatorioId String?
  convenzioneId     String?       // ✅ Supporta convenzioni
  nome              String?
  prezzo            Decimal
  ivaAliquota       Decimal
  attivo            Boolean
  validoDa          DateTime
  validoA           DateTime?
}
```

#### `Convenzione`
```prisma
model Convenzione {
  id            String
  codice        String
  nome          String
  tipo          TipoConvenzione  // ASSICURAZIONE, ENTE, AZIENDA, ALTRO
  enteTerzo     String?
  dataInizio    DateTime
  dataFine      DateTime?
  listiniPrezzo ListinoPrezzo[]  // ✅ Listini associati
}
```

#### `CodiceSconto`
```prisma
model CodiceSconto {
  tipoSconto         TipoSconto    // PERCENTUALE, FISSO, SPEDIZIONE_GRATIS
  valore             Decimal
  prestazioniIds     String[]      // ✅ Può filtrare per prestazione
  // ... altri campi
}
```

### Gap Identificati
| Funzionalità | Stato | Note |
|-------------|-------|------|
| Prezzo base per prestazione | ✅ | `prezzoBase` in Prestazione |
| Prezzo per convenzione | ✅ | `ListinoPrezzo` con `convenzioneId` |
| Prezzo per medico | ❌ | Manca `medicoId` in ListinoPrezzo |
| Prezzo per azienda | ⚠️ | Solo via Convenzione tipo AZIENDA |
| Bundle/Offerte | ❌ | Non implementato |
| Compenso medico | ❌ | Non implementato |
| Tariffario medicina lavoro | ❌ | Non implementato (ma Convenzione supporta AZIENDA) |

---

## 🏗️ Architettura Proposta (Ottimizzata - NO Doppioni)

### Strategia: Estensione Entità Esistenti

| Requisito | Soluzione | Entità |
|-----------|-----------|--------|
| Prezzo per medico | `ListinoPrezzo.medicoId` | Estensione |
| Prezzo per convenzione | `ListinoPrezzo.convenzioneId` | ✅ Già esiste |
| Prezzo per azienda | `Convenzione` tipo `AZIENDALE` + `ListinoPrezzo` | ✅ Già esiste |
| CodiceSconto | `CodiceSconto.prestazioniIds` | ✅ Già esiste |
| Bundle/Offerte | `OffertaBundle` + `OffertaBundlePrestazione` | 🆕 Nuovo |
| Compenso medico | `MedicoAbilitato` esteso | Estensione |

### Fase 1: Estensione `ListinoPrezzo`

```prisma
model ListinoPrezzo {
  id                String    @id @default(uuid())
  prestazioneId     String
  poliambulatorioId String?
  convenzioneId     String?   // ✅ GIÀ ESISTENTE - Supporta convenzioni E tariffari aziendali
  medicoId          String?   // 🆕 Prezzo specifico per medico
  
  // Identificazione
  codice            String?   // 🆕 Per riferimento rapido (es. "CONV-ACME-2025")
  nome              String?
  descrizione       String?   // 🆕 Note aggiuntive
  
  // Pricing
  prezzo            Decimal   @db.Decimal(10, 2)
  ivaAliquota       Decimal   @default(0) @db.Decimal(5, 2)
  scontoPercentuale Decimal?  @db.Decimal(5, 2)  // 🆕 Sconto sul prezzo base
  
  // 🆕 Compenso medico (override per questo listino)
  compensoMedicoTipo    TipoCompensoMedico?
  compensoMedicoValore  Decimal?  @db.Decimal(10, 2)
  compensoMedicoMinimo  Decimal?  @db.Decimal(10, 2)
  compensoMedicoMassimo Decimal?  @db.Decimal(10, 2)
  
  // Validità e priorità
  attivo            Boolean   @default(true)
  validoDa          DateTime  @default(now())
  validoA           DateTime?
  priorita          Int       @default(0)  // 🆕 Per risolvere conflitti (più alto = priorità maggiore)
  
  tenantId          String
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?
  createdBy         String?   // 🆕 Audit

  // Relations
  prestazione     Prestazione      @relation(fields: [prestazioneId], references: [id], onDelete: Cascade)
  poliambulatorio Poliambulatorio? @relation(fields: [poliambulatorioId], references: [id])
  convenzione     Convenzione?     @relation(fields: [convenzioneId], references: [id])
  medico          Person?          @relation("ListinoMedico", fields: [medicoId], references: [id])  // 🆕
  
  @@index([tenantId])
  @@index([prestazioneId])
  @@index([poliambulatorioId])
  @@index([convenzioneId])
  @@index([medicoId])            // 🆕
  @@index([attivo])
  @@index([tenantId, prestazioneId, medicoId])      // 🆕 Composite
  @@index([tenantId, prestazioneId, convenzioneId]) // 🆕 Composite
  @@map("listini_prezzo")
}
```

### Fase 2: Estensione `MedicoAbilitato` (Compenso Default)

```prisma
model MedicoAbilitato {
  id                    String    @id @default(uuid())
  medicoId              String
  prestazioneId         String
  attivo                Boolean   @default(true)
  dataAbilitazione      DateTime  @default(now())
  
  // 🆕 Compenso default per questo medico su questa prestazione
  compensoTipo          TipoCompensoMedico  @default(PERCENTUALE)
  compensoValore        Decimal             @default(30) @db.Decimal(10, 2)  // Default 30%
  compensoMinimo        Decimal?            @db.Decimal(10, 2)
  compensoMassimo       Decimal?            @db.Decimal(10, 2)
  
  // 🆕 Note
  note                  String?
  
  tenantId              String
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  deletedAt             DateTime?

  prestazione Prestazione @relation(fields: [prestazioneId], references: [id], onDelete: Cascade)
  medico      Person      @relation("MedicoAbilitazioni", fields: [medicoId], references: [id], onDelete: Cascade)  // 🆕

  @@unique([medicoId, prestazioneId])
  @@index([tenantId])
  @@index([medicoId])
  @@map("medici_abilitati")
}
```

### Fase 3: Nuovo Enum `TipoCompensoMedico`

```prisma
enum TipoCompensoMedico {
  PERCENTUALE         // % del prezzo praticato (es. 30% del prezzo fatturato)
  FISSO               // Importo fisso indipendente dal prezzo (es. €20 a prestazione)
  MINIMO_MASSIMO      // Percentuale con floor/ceiling (es. 30% min €15 max €100)
  
  @@map("tipo_compenso_medico")
}
```

### Fase 4: Nuovo Model `OffertaBundle` (Pacchetti/Offerte)

```prisma
model OffertaBundle {
  id                String    @id @default(uuid())
  codice            String
  nome              String
  descrizione       String?
  
  // Pricing bundle
  prezzoBundle      Decimal?  @db.Decimal(10, 2)  // Prezzo fisso bundle
  scontoPercentuale Decimal?  @db.Decimal(5, 2)   // Alternativa: % sconto su somma
  ivaAliquota       Decimal   @default(0) @db.Decimal(5, 2)
  
  // 🆕 Compenso medico per bundle (opzionale)
  compensoMedicoTipo    TipoCompensoMedico?
  compensoMedicoValore  Decimal?  @db.Decimal(10, 2)
  compensoMedicoMinimo  Decimal?  @db.Decimal(10, 2)
  compensoMedicoMassimo Decimal?  @db.Decimal(10, 2)
  
  // Validità
  attivo            Boolean   @default(true)
  validoDa          DateTime  @default(now())
  validoA           DateTime?
  
  // Applicabilità
  soloNuoviPazienti Boolean   @default(false)  // 🆕
  maxUtilizzi       Int?                        // 🆕 Limite globale
  utilizziCorrente  Int       @default(0)       // 🆕
  
  tenantId          String
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?
  createdBy         String?

  prestazioni       OffertaBundlePrestazione[]
  
  @@unique([tenantId, codice])
  @@index([tenantId, attivo])
  @@index([tenantId, validoDa, validoA])
  @@map("offerte_bundle")
}

model OffertaBundlePrestazione {
  id              String   @id @default(uuid())
  offertaBundleId String
  prestazioneId   String
  quantita        Int      @default(1)          // Quante volte questa prestazione nel bundle
  obbligatoria    Boolean  @default(true)       // false = opzionale
  ordine          Int      @default(0)          // 🆕 Ordine di esecuzione consigliato
  tenantId        String
  createdAt       DateTime @default(now())
  deletedAt       DateTime?

  offertaBundle   OffertaBundle @relation(fields: [offertaBundleId], references: [id], onDelete: Cascade)
  prestazione     Prestazione   @relation(fields: [prestazioneId], references: [id], onDelete: Cascade)

  @@unique([offertaBundleId, prestazioneId])
  @@index([tenantId])
  @@index([prestazioneId])
  @@map("offerte_bundle_prestazioni")
}
```

### Fase 5: Estensione `CodiceSconto` (già esistente)

Il model `CodiceSconto` **già supporta** prestazioni cliniche tramite:
- `prestazioniIds String[]` - Array di ID prestazioni a cui si applica
- `applicabileServizi TipoServizio[]` - Include `PRESTAZIONE_CLINICA`

**Nessuna modifica necessaria al model**, solo al service per calcolo.

---

## 🔄 Logica di Calcolo Prezzo (Ottimizzata)

### Ordine di Priorità (Campo `priorita` + Specificità)

Il prezzo viene determinato cercando nel `ListinoPrezzo` con questo ordine:

```
PRIORITÀ DECRESCENTE (più alto = priorità maggiore):

1️⃣ ListinoPrezzo con medicoId + convenzioneId (MASSIMA SPECIFICITÀ)
   → Tariffa negoziata per un medico specifico con una convenzione specifica
   → Esempio: Dr. Rossi con convenzione ACME SpA

2️⃣ ListinoPrezzo con convenzioneId (Convenzione tipo AZIENDALE o ASSICURATIVA)
   → Tariffa per convenzione/assicurazione/azienda
   → Usa campo `priorita` per risolvere conflitti tra multiple convenzioni

3️⃣ ListinoPrezzo con medicoId (Tariffa medico senza convenzione)
   → Prezzo praticato da un medico specifico
   → Esempio: Dr. Bianchi applica prezzi diversi dalla clinica

4️⃣ ListinoPrezzo generico (senza medicoId né convenzioneId)
   → Listino standard della struttura

5️⃣ Prestazione.prezzoBase (FALLBACK)
   → Prezzo di listino base dalla prestazione

DOPO IL CALCOLO PREZZO BASE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ CodiceSconto (se fornito e valido)
   → Applicato DOPO aver determinato il prezzo base
   → Tipo PERCENTUALE o FISSO

7️⃣ OffertaBundle (se le prestazioni sono in bundle)
   → Prezzo bundle o sconto % sulla somma
   → Verificato prima della conferma preventivo
```

### Come Funziona il Campo `priorita`

| Scenario | priorita | Note |
|----------|----------|------|
| Listino standard | 0 | Default |
| Convenzione assicurativa | 10 | Priorità normale |
| Convenzione aziendale negoziata | 20 | Priorità alta |
| Offerta promozionale | 50 | Priorità massima |
| Override manuale medico | 100 | Sempre applicato |

### Tariffari Aziendali (Medicina del Lavoro)

**Implementazione tramite entità esistenti:**

1. **Crea Convenzione** con `tipo: AZIENDALE`:
   ```json
   {
     "nome": "ACME SpA - Medicina Lavoro 2025",
     "tipo": "AZIENDALE",
     "aziendaId": "company-uuid",
     "validoDa": "2025-01-01",
     "validoA": "2025-12-31"
   }
   ```

2. **Crea ListinoPrezzo** per ogni prestazione negoziata:
   ```json
   {
     "prestazioneId": "visita-medico-competente-uuid",
     "convenzioneId": "convenzione-acme-uuid",
     "prezzo": 45.00,
     "priorita": 20
   }
   ```

3. **Assegna Convenzione al Paziente** (dipendente):
   - Il paziente ha `convenzioneId` nel suo profilo
   - Quando prenota, il sistema applica automaticamente il listino

### Algoritmo di Calcolo (Ottimizzato)
```typescript
interface CalcoloPrezzoInput {
  prestazioneId: string;
  medicoId?: string;
  pazienteId: string;
  convenzioneId?: string;    // Convenzione del paziente (include AZIENDALE)
  codiceSconto?: string;
  bundleId?: string;
  tenantId: string;
}

interface CalcoloPrezzoOutput {
  prezzoFinale: number;
  prezzoOriginale: number;
  scontoApplicato: number;
  scontoDescrizione?: string;
  fontePrezzoBase: 
    | 'LISTINO_MEDICO_CONVENZIONE'  // medicoId + convenzioneId
    | 'LISTINO_CONVENZIONE'          // solo convenzioneId (include AZIENDALE)
    | 'LISTINO_MEDICO'               // solo medicoId
    | 'LISTINO_GENERICO'             // ListinoPrezzo senza filtri
    | 'BUNDLE'                       // OffertaBundle
    | 'PREZZO_BASE';                 // Prestazione.prezzoBase fallback
  
  // Dettaglio listino applicato
  listinoApplicatoId?: string;
  listinoApplicatoNome?: string;
  prioritaApplicata: number;
  
  // Calcolo compenso medico
  compensoMedico: number;
  compensoMedicoTipo: TipoCompensoMedico;
  compensoMedicoFonte: 'LISTINO' | 'MEDICO_ABILITATO' | 'DEFAULT';
  
  // Dettagli IVA
  imponibile: number;
  ivaAliquota: number;
  importoIva: number;
  totaleConIva: number;
}

// Algoritmo principale
async function calcolaPrezzo(input: CalcoloPrezzoInput): Promise<CalcoloPrezzoOutput> {
  const { prestazioneId, medicoId, convenzioneId, codiceSconto, bundleId, tenantId } = input;
  const now = new Date();
  
  // 1. Cerca ListinoPrezzo con priorità decrescente
  const listini = await prisma.listinoPrezzo.findMany({
    where: {
      prestazioneId,
      tenantId,
      attivo: true,
      deletedAt: null,
      validoDa: { lte: now },
      OR: [
        { validoA: null },
        { validoA: { gte: now } }
      ],
      // Filtro: medicoId e/o convenzioneId se presenti
      ...(medicoId && convenzioneId ? {
        OR: [
          { medicoId, convenzioneId },      // Più specifico
          { medicoId: null, convenzioneId }, // Solo convenzione
          { medicoId, convenzioneId: null },  // Solo medico
          { medicoId: null, convenzioneId: null } // Generico
        ]
      } : medicoId ? {
        OR: [
          { medicoId, convenzioneId: null },
          { medicoId: null, convenzioneId: null }
        ]
      } : convenzioneId ? {
        OR: [
          { convenzioneId, medicoId: null },
          { medicoId: null, convenzioneId: null }
        ]
      } : {
        medicoId: null,
        convenzioneId: null
      })
    },
    orderBy: [
      { priorita: 'desc' },  // Prima priorità più alta
      { updatedAt: 'desc' }  // Poi più recente
    ]
  });

  // 2. Seleziona listino migliore o fallback a prezzoBase
  let prezzo: number;
  let fonte: CalcoloPrezzoOutput['fontePrezzoBase'];
  let listino = listini[0];
  
  if (listino) {
    prezzo = Number(listino.prezzo);
    fonte = listino.medicoId && listino.convenzioneId 
      ? 'LISTINO_MEDICO_CONVENZIONE'
      : listino.convenzioneId 
        ? 'LISTINO_CONVENZIONE'
        : listino.medicoId 
          ? 'LISTINO_MEDICO'
          : 'LISTINO_GENERICO';
  } else {
    // Fallback a prezzoBase
    const prestazione = await prisma.prestazione.findUnique({
      where: { id: prestazioneId }
    });
    prezzo = Number(prestazione?.prezzoBase ?? 0);
    fonte = 'PREZZO_BASE';
  }
  
  // 3. Applica CodiceSconto se valido
  // ... implementazione CodiceSconto
  
  // 4. Verifica Bundle se presente
  // ... implementazione Bundle
  
  // 5. Calcola compenso medico
  const compenso = await calcolaCompensoMedico(/*...*/);
  
  return { /* risultato completo */ };
}
```

---

## 📁 Struttura Files (Ottimizzata - No Doppioni)

```
backend/
├── prisma/
│   └── schema.prisma           # Estensioni schema (NO nuove entità tariffario)
├── services/
│   └── clinica/
│       ├── TariffarioService.js      # 🆕 Calcolo prezzi e compensi
│       ├── ListinoPrezzoService.js   # ✅ GIÀ ESISTE - Estendere
│       ├── OffertaBundleService.js   # 🆕 Gestione bundle
│       └── MedicoAbilitatoService.js # ✅ GIÀ ESISTE - Estendere
├── routes/
│   └── clinica-routes.js       # Aggiungere endpoints listini/bundle
└── config/
    └── validation-clinical.js  # Validatori

src/
├── pages/
│   └── clinica/
│       └── catalogo/
│           ├── ListiniPage.tsx           # ✅ Estendere (già esiste?)
│           ├── ListinoForm.tsx           # Form con nuovo campo medicoId
│           ├── ConvenzioniPage.tsx       # ✅ GIÀ ESISTE - Per tariffari aziendali
│           ├── OfferteBundlePage.tsx     # 🆕 Gestione bundle/offerte
│           ├── OffertaBundleForm.tsx     # 🆕 Form creazione bundle
│           └── CompensiMediciPage.tsx    # 🆕 Overview compensi per medico
├── services/
│   └── clinicaApi.ts           # Estendere con nuovi endpoints
└── components/
    └── clinica/
        ├── PriceCalculator.tsx    # 🆕 Calcolo real-time in appuntamento
        └── ListinoPreview.tsx     # 🆕 Preview listino applicato
```

---

## 🚀 Piano Implementazione (Aggiornato)

### Fase 1: Schema Database ✅ COMPLETATA
1. [x] Estendere `ListinoPrezzo` con `medicoId`, compenso medico, `priorita`
2. [x] Estendere `MedicoAbilitato` con compenso default
3. [x] Creare `OffertaBundle` e `OffertaBundlePrestazione` (unici nuovi model)
4. [x] Creare enum `TipoCompensoMedico`
5. [x] Aggiungere relation `Person.listiniMedico` e `Person.abilitazioni`
6. [x] Schema applicato con `npx prisma db push`

### Fase 2: Services Backend ✅ COMPLETATA
1. [x] `TariffarioService.js` - Logica calcolo prezzi con cascata
2. [x] `TariffarioService.calcolaCompensoMedico()` - Compensi
3. [x] `TariffarioService.getBreakdownPrezzo()` - Preview listini
4. [x] `OffertaBundleService.js` - CRUD bundle completo
5. [x] Export in `services/clinical/index.js`

### Fase 3: API Routes ✅ COMPLETATA
1. [x] POST `/api/v1/clinica/tariffario/calcola-prezzo` - Calcolo prezzo real-time
2. [x] GET `/api/v1/clinica/tariffario/breakdown/:prestazioneId` - Breakdown prezzi
3. [x] GET/POST/PUT/DELETE `/api/v1/clinica/bundle` - CRUD bundle
4. [x] PATCH `/api/v1/clinica/bundle/:id/toggle` - Toggle attivo/disattivo
5. [x] GET `/api/v1/clinica/bundle/by-prestazione/:prestazioneId` - Trova bundle

### Fase 4: Frontend (DA FARE - 3-4 giorni)
1. [ ] Estendere `ListinoForm.tsx` - Campi medicoId e compenso medico
2. [ ] `OfferteBundlePage.tsx` - Gestione bundle/offerte
3. [ ] `OffertaBundleForm.tsx` - Selezione prestazioni
4. [ ] `PriceCalculator.tsx` - Widget calcolo prezzo real-time
5. [ ] `CompensiMediciPage.tsx` - Dashboard compensi medici
6. [ ] Integrazione calcolo prezzo in flusso prenotazione

### Fase 5: Testing & Refining (2 giorni)
1. [ ] Test E2E calcolo prezzi
2. [ ] Test casi limite (conflitti priorità)
3. [ ] Performance test (query ottimizzate)
4. [ ] UX review e fix

---

## 📊 Casi d'Uso Medicina del Lavoro (Ottimizzato)

### Setup Tariffario Azienda con Entità Esistenti

**Passo 1: Crea Convenzione tipo AZIENDALE**
```json
{
  "nome": "Contratto 2025 Acme SpA",
  "tipo": "AZIENDALE",
  "aziendaId": "acme-spa-uuid",
  "validoDa": "2025-01-01",
  "validoA": "2025-12-31",
  "condizioniPagamento": "60 gg DFFM",
  "note": "Contratto medicina del lavoro annuale"
}
```

**Passo 2: Crea ListinoPrezzo per ogni prestazione negoziata**
```json
[
  { "prestazioneId": "prima-visita-uuid", "convenzioneId": "conv-acme-uuid", "prezzo": 45.00, "priorita": 20 },
  { "prestazioneId": "visita-periodica-uuid", "convenzioneId": "conv-acme-uuid", "prezzo": 35.00, "priorita": 20 },
  { "prestazioneId": "spirometria-uuid", "convenzioneId": "conv-acme-uuid", "prezzo": 25.00, "priorita": 20 },
  { "prestazioneId": "audiometria-uuid", "convenzioneId": "conv-acme-uuid", "prezzo": 30.00, "priorita": 20 },
  { "prestazioneId": "ecg-uuid", "convenzioneId": "conv-acme-uuid", "prezzo": 40.00, "priorita": 20 },
  { "prestazioneId": "test-droghe-uuid", "convenzioneId": "conv-acme-uuid", "prezzo": 35.00, "priorita": 20 },
  { "prestazioneId": "ergo-oftalmo-uuid", "convenzioneId": "conv-acme-uuid", "prezzo": 28.00, "priorita": 20 },
  { "prestazioneId": "consulenza-ora-uuid", "convenzioneId": "conv-acme-uuid", "prezzo": 80.00, "priorita": 20 },
  { "prestazioneId": "vat-uuid", "convenzioneId": "conv-acme-uuid", "prezzo": 50.00, "priorita": 20 },
  { "prestazioneId": "tempi-reazione-uuid", "convenzioneId": "conv-acme-uuid", "prezzo": 45.00, "priorita": 20 },
  { "prestazioneId": "alcol-test-uuid", "convenzioneId": "conv-acme-uuid", "prezzo": 20.00, "priorita": 20 }
]
```

**Passo 3: Assegna convenzione ai dipendenti**
```json
// Nel profilo Person del dipendente:
{
  "convenzioneId": "conv-acme-uuid"
}
```

**Risultato: Prezzo automatico in prenotazione**
Quando il dipendente prenota, il sistema trova automaticamente il ListinoPrezzo 
con la sua convenzioneId e applica il prezzo negoziato.

### Calcolo Compenso Medico
```
Prezzo prestazione: €45.00
Compenso tipo: PERCENTUALE (30%)
Compenso medico: €13.50

--- oppure ---

Prezzo prestazione: €45.00
Compenso tipo: MINIMO_MASSIMO (30% min €10, max €50)
Compenso calcolato: €13.50 (30% di €45)
Compenso finale: €13.50 (tra min e max)
```

---

## 🔗 Integrazioni

### Con Sistema Esistente
- `Appuntamento`: Calcolo prezzo al momento della prenotazione
- `FatturaSanitaria`: Importi calcolati dal tariffario
- `CodiceSconto`: Applicazione su prezzo già calcolato
- `Convenzione`: Lookup listino convenzione

### API Esterne (Future)
- Export tariffari per software gestionale
- Import tariffari da file CSV/Excel
- Sincronizzazione con sistemi fatturazione

---

## ⚠️ Note Importanti

1. **Retrocompatibilità**: `prezzoBase` in Prestazione rimane come fallback
2. **Multi-tenancy**: Tutti i nuovi model hanno `tenantId` + indexes
3. **Soft Delete**: Tutti i model hanno `deletedAt`
4. **Audit**: Tracciare modifiche tariffari per compliance
5. **Performance**: Indexes compositi su `[tenantId, prestazioneId, medicoId]`

---

## 📅 Timeline e Progresso

| Fase | Durata | Stato |
|------|--------|-------|
| Schema DB | ✅ Completata | 18 Gen 2025 |
| Services | ✅ Completata | 18 Gen 2025 |
| API Routes | ✅ Completata | 18 Gen 2025 |
| Frontend Base | 3-4 giorni | ⏳ Da fare |
| Testing | 1-2 giorni | ⏳ Da fare |
| **TOTALE** | **4-6 giorni rimanenti** | |

### Risparmio vs Architettura Originale
- **Rimosso**: TariffarioAziendale, TariffarioAziendaleVoce (2 model)
- **Riutilizzato**: Convenzione tipo AZIENDALE, ListinoPrezzo esteso
- **Risparmio stimato**: 3-5 giorni di sviluppo
- **Vantaggio**: Meno duplicazione, logica unificata

---

## ✅ Checklist Implementazione

- [x] Review schema con team (ottimizzato NO DOPPIONI)
- [x] Schema Prisma esteso e applicato
- [x] TariffarioService con calcolo prezzi cascata
- [x] OffertaBundleService con CRUD completo
- [x] API Routes registrate in clinica-routes.js
- [ ] Frontend: Bundle management pages
- [ ] Frontend: Integrazione calcolo prezzo
- [ ] Unit tests per calcolo prezzi
- [ ] Test E2E flusso completo

---

## 🔍 Vantaggi Architettura Ottimizzata

| Aspetto | Prima | Dopo |
|---------|-------|------|
| Model nuovi | 6 | 3 (OffertaBundle, OffertaBundlePrestazione, TipoCompensoMedico) |
| Tariffari aziendali | TariffarioAziendale + Voci | Convenzione tipo AZIENDALE + ListinoPrezzo |
| Query calcolo prezzo | 4+ query (tariffario, listino, etc) | 1 query ListinoPrezzo con filtri |
| Manutenzione | Logica sparsa | Logica centralizzata in TariffarioService |
| Conflitti prezzo | Difficile debug | Campo `priorita` esplicito |

---

## 📁 Files Creati/Modificati

### Backend
- `backend/prisma/schema.prisma` - Esteso con nuovi model e campi
- `backend/services/clinical/TariffarioService.js` - 🆕 Calcolo prezzi
- `backend/services/clinical/OffertaBundleService.js` - 🆕 CRUD bundle
- `backend/services/clinical/index.js` - Export nuovi services
- `backend/routes/clinica-routes.js` - Nuove API routes

---

*Documento creato: 18 Gennaio 2025*
*Ultimo aggiornamento: 18 Gennaio 2025*
*Autore: GitHub Copilot*
*Versione: 2.1 - Backend Completato*
